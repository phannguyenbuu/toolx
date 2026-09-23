import { calculateLayout, LayoutPlan, PlanItem } from '../../utils/layoutSolver';
import { packMultiSize } from '../../utils/multiSizePacker';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode } from './types';

export interface SlotPageLookupParams {
  slotIndex: number;
  sheetIdx: number;
  allPagesLength: number;
  itemsPerSheet: number;
  isMultiShape: boolean;
  useTotalLimit?: boolean;
  totalOrder?: number;
  is2Sided?: boolean;
  twoSideMode?: 'same' | 'odd-even';
  previewSide?: 'front' | 'back';
  overrideSide?: 'front' | 'back';
  effectiveDataMode: DataMode;
  standardQty: number;
  xUpQty: number;
}

/**
 * Xác định trang nguồn nào được phân bổ cho một vị trí tem (slot) trên tờ in
 */
export function getPageForSlot(params: SlotPageLookupParams): number {
  const {
    slotIndex,
    sheetIdx,
    allPagesLength,
    itemsPerSheet,
    isMultiShape,
    useTotalLimit,
    totalOrder,
    is2Sided,
    twoSideMode,
    previewSide = 'front',
    overrideSide,
    effectiveDataMode,
    standardQty,
    xUpQty
  } = params;

  if (allPagesLength === 0) return -1;
  const safeItemsPerSheet = Math.max(1, itemsPerSheet);

  // In multi-shape mode, never hide slots - layout solver has already packed exact counts
  if (!isMultiShape && useTotalLimit && totalOrder && totalOrder > 0) {
    const globalSlot = sheetIdx * safeItemsPerSheet + slotIndex;
    if (globalSlot >= totalOrder) {
      return -1;
    }
  }

  // Odd-even 2-sided mode: odd pages (0,2,4..) = front, even pages (1,3,5..) = back
  if (is2Sided && twoSideMode === 'odd-even') {
    const effectiveSide = overrideSide || (sheetIdx % 2 === 1 ? 'back' : previewSide);
    const sheetPairIndex = Math.floor(sheetIdx / 2);
    const globalSlot = sheetPairIndex * safeItemsPerSheet + slotIndex;
    if (effectiveSide === 'front') {
      const frontIdx = (globalSlot * 2) % allPagesLength;
      return frontIdx;
    } else {
      const backIdx = (globalSlot * 2 + 1) % allPagesLength;
      return backIdx;
    }
  }

  if (isMultiShape) {
    // Clone and repeat source pages across slots
    return slotIndex % allPagesLength;
  }

  if (effectiveDataMode === 1) {
    const globalIndex = sheetIdx * safeItemsPerSheet + slotIndex;
    const pageIndex = Math.floor(globalIndex / Math.max(1, standardQty)) % allPagesLength;
    return pageIndex;
  } else if (effectiveDataMode === 4) {
    if (allPagesLength > 1) {
      return slotIndex % allPagesLength;
    }
    const pageIndex = Math.floor(sheetIdx / Math.max(1, xUpQty)) % allPagesLength;
    return pageIndex;
  } else if (effectiveDataMode === 5 || effectiveDataMode === 6) {
    const globalIndex = sheetIdx * safeItemsPerSheet + slotIndex;
    return globalIndex % allPagesLength;
  }

  const globalIndex = sheetIdx * safeItemsPerSheet + slotIndex;
  return globalIndex % allPagesLength;
}

/**
 * Tính góc xoay tổng cộng cho một con tem cụ thể
 */
export function calculateSlotTotalRotation(
  it: PlanItem,
  page: PageItem | null | undefined,
  config: ImpositionConfig,
  isMultiShape: boolean,
  shapeTabs: ShapeTabItem[],
  isBackSide: boolean = false
): number {
  let pageRotation = page ? (page.rotation || 0) : 0;
  const isRotatedItem = !!it.rot;
  const itemShape = (it.shape || config.shape) as string;
  const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);

  const correspondingTab = isMultiShape
    ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName)
    : null;
  const isTabAutoRotate = isMultiShape
    ? (correspondingTab?.autoRotateImage !== undefined
        ? correspondingTab.autoRotateImage
        : (correspondingTab?.autoRotate !== undefined
            ? correspondingTab.autoRotate
            : (config.autoRotateImage ?? true)))
    : (config.autoRotateImage ?? true);

  const actualW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
  const originalItemH = itemShape === 'circle' ? actualW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));

  if (isTabAutoRotate && page && page.w && page.h) {
    const srcRatio = page.w / page.h;
    const dstRatio = actualW / originalItemH;

    if ((srcRatio > 1 && dstRatio < 1) || (srcRatio < 1 && dstRatio > 1)) {
      pageRotation += isRotatedItem ? -90 : 90;
    }
  }

  if (isRotatedItem && !isSpecialShape) {
    pageRotation += 90;
  }

  const itemRotation = (isSpecialShape && isRotatedItem) ? 180 : 0;
  const flipRotation = it.flipped ? 180 : 0;
  const rot45Rotation = it.rot45 ? 45 : 0;
  const backRotation = (isBackSide && config.rot180Back) ? 180 : 0;
  return ((pageRotation + itemRotation + flipRotation + rot45Rotation + backRotation) % 360 + 360) % 360;
}

export type EnrichedPlanItem = PlanItem & {
  totalRotation: number;
  pageIndex: number;
  w: number;
  h: number;
};

/**
 * Bổ sung thông tin kích thước và góc xoay đã chuẩn hóa cho từng PlanItem
 */
export function enrichPlanItemsWithRotation(
  items: PlanItem[],
  allPages: PageItem[],
  config: ImpositionConfig,
  isMultiShape: boolean,
  shapeTabs: ShapeTabItem[],
  effectiveDataMode: DataMode,
  standardQty: number,
  xUpQty: number
): EnrichedPlanItem[] {
  return items.map((it, i) => {
    const sheetIdx = it.sheetIndex ?? 0;
    const isBackSide = config.is2Sided && (sheetIdx % 2 === 1);
    const pageIdx = getPageForSlot({
      slotIndex: i,
      sheetIdx,
      allPagesLength: allPages.length,
      itemsPerSheet: items.length,
      isMultiShape,
      useTotalLimit: config.useTotalLimit,
      totalOrder: config.totalOrder,
      is2Sided: config.is2Sided,
      twoSideMode: config.twoSideMode,
      previewSide: isBackSide ? 'back' : 'front',
      overrideSide: isBackSide ? 'back' : 'front',
      effectiveDataMode,
      standardQty,
      xUpQty
    });

    const page = pageIdx >= 0 && pageIdx < allPages.length ? allPages[pageIdx] : null;
    const totRot = calculateSlotTotalRotation(it, page, config, isMultiShape, shapeTabs, isBackSide);

    const itemShape = (it.shape || config.shape) as string;
    const actualW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
    const actualH = itemShape === 'circle' ? actualW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));

    return {
      ...it,
      w: actualW,
      h: actualH,
      pageIndex: pageIdx >= 0 ? pageIdx : 0,
      totalRotation: totRot,
    };
  });
}

/**
 * Tính toán danh sách LayoutPlan cho cả chế độ đơn hình và đa hình (Multi-Shape)
 */
export function calculatePlans(
  config: ImpositionConfig,
  shapeTabs: ShapeTabItem[],
  isMultiShape: boolean,
  allPages: PageItem[]
): LayoutPlan[] {
  // Multi-shape layer packing
  if (isMultiShape) {
    const enabledTabs = shapeTabs.filter(t => t.enabled);
    if (enabledTabs.length === 0) return [];

    let pw = config.pageW, ph = config.pageH;
    let ox = 0, oy = 0;
    if (config.usePrintArea) {
      pw = config.printAreaW; ph = config.printAreaH;
      ox = (config.pageW - pw) / 2; oy = (config.pageH - ph) / 2;
    } else if (config.useMargin) {
      pw = config.pageW - config.marginLeft - config.marginRight;
      ph = config.pageH - config.marginTop - config.marginBot;
      ox = config.marginLeft; oy = config.marginTop;
    }

    const multiItems: any[] = [];
    let itemId = 0;
    enabledTabs.forEach((tab) => {
      const qty = tab.quantity || 1;
      const w = tab.itemW;
      const h = tab.shape === 'circle' ? w : tab.itemH;
      const tabCanRotate = tab.canRotate !== undefined ? tab.canRotate : (tab.autoRotate !== undefined ? tab.autoRotate : config.autoRotate);
      for (let k = 0; k < qty; k++) {
        multiItems.push({
          id: itemId++,
          w: w,
          h: h,
          tabId: tab.id,
          tabName: tab.name,
          shape: tab.shape,
          cornerRadius: tab.cornerRadius,
          sourceImage: tab.sourceImage,
          vectorMaskResult: tab.vectorMaskResult,
          customSvgData: tab.customSvgData,
          color: tab.color,
          canRotate: tabCanRotate,
        });
      }
    });

    const results = packMultiSize(multiItems, pw, ph, config.padding, true, config.autoRotate);
    return results.map(r => ({
      name: r.name,
      qty: r.items.length,
      priority: 0,
      items: r.items.map(it => ({
        x: it.x + ox,
        y: it.y + oy,
        w: it.w,
        h: it.h,
        rot: it.rot,
        sheetIndex: it.sheetIndex ?? 0,
        tabId: it.tabId,
        tabName: it.tabName,
        shape: it.shape,
        cornerRadius: it.cornerRadius,
        sourceImage: it.sourceImage,
        vectorMaskResult: it.vectorMaskResult,
        customSvgData: it.customSvgData,
        color: it.color,
      })),
    }));
  }

  // Multi-size packing for svg-image / pdf-source
  if ((config.shape === 'svg-image' || config.shape === 'pdf-source') && allPages.length > 0) {
    let pw = config.pageW, ph = config.pageH;
    let ox = 0, oy = 0;
    if (config.usePrintArea) {
      pw = config.printAreaW; ph = config.printAreaH;
      ox = (config.pageW - pw) / 2; oy = (config.pageH - ph) / 2;
    } else if (config.useMargin) {
      pw = config.pageW - config.marginLeft - config.marginRight;
      ph = config.pageH - config.marginTop - config.marginBot;
      ox = config.marginLeft; oy = config.marginTop;
    }
    const packItems = allPages.map((p, i) => ({ w: p.w || config.itemW, h: p.h || config.itemH, id: i, canRotate: config.autoRotate }));
    const results = packMultiSize(packItems, pw, ph, config.padding, true, config.autoRotate);
    return results.map(r => ({
      name: r.name,
      qty: r.items.length,
      priority: 0,
      items: r.items.map(it => ({
        x: it.x + ox, y: it.y + oy,
        w: it.w, h: it.h,
        rot: it.rot,
      })),
    }));
  }

  if (config.itemW <= 0 || config.itemH <= 0) return [];

  let effectivePrintW = config.pageW;
  let effectivePrintH = config.pageH;
  if (config.usePrintArea) {
    effectivePrintW = config.printAreaW;
    effectivePrintH = config.printAreaH;
  } else if (config.useMargin) {
    effectivePrintW = config.pageW - config.marginLeft - config.marginRight;
    effectivePrintH = config.pageH - config.marginTop - config.marginBot;
  }

  const r = calculateLayout({
    shape: config.shape === 'custom-svg' || config.shape === 'svg-image' || config.shape === 'pdf-source' ? 'rect' : config.shape,
    itemW: config.itemW,
    itemH: config.shape === 'circle' ? config.itemW : config.itemH,
    padding: config.padding,
    printW: effectivePrintW,
    printH: effectivePrintH,
    pageW: config.pageW,
    pageH: config.pageH,
    autoRotate: config.autoRotate,
  });

  return r.map(plan => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(config.shape);
    plan.items.forEach(it => {
      const itemShape = (it.shape || config.shape) as string;
      let w: number, h: number;
      if (itemShape === 'circle') {
        w = h = it.w !== undefined ? it.w : config.itemW;
      } else if (isSpecialShape) {
        w = it.w !== undefined ? it.w : config.itemW;
        h = it.h !== undefined ? it.h : config.itemH;
      } else {
        w = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
        h = it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH);
      }
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
      maxX = Math.max(maxX, it.x + w);
      maxY = Math.max(maxY, it.y + h);
    });

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    let alignOffsetX = 0;
    let alignOffsetY = 0;

    if (config.alignX === 'center') {
      alignOffsetX = (config.pageW - contentW) / 2 - minX;
    } else if (config.alignX === 'right') {
      alignOffsetX = config.pageW - contentW - minX;
    } else {
      alignOffsetX = -minX;
    }

    if (config.alignY === 'middle') {
      alignOffsetY = (config.pageH - contentH) / 2 - minY;
    } else if (config.alignY === 'bottom') {
      alignOffsetY = config.pageH - contentH - minY;
    } else {
      alignOffsetY = -minY;
    }

    const finalMinX = minX + alignOffsetX;
    const finalMaxX = maxX + alignOffsetX;
    const finalMinY = minY + alignOffsetY;
    const finalMaxY = maxY + alignOffsetY;

    if (finalMinX < 0) alignOffsetX -= finalMinX;
    if (finalMaxX > config.pageW) alignOffsetX -= (finalMaxX - config.pageW);
    if (finalMinY < 0) alignOffsetY -= finalMinY;
    if (finalMaxY > config.pageH) alignOffsetY -= (finalMaxY - config.pageH);

    return {
      ...plan,
      items: plan.items.map(it => ({
        ...it,
        x: it.x + alignOffsetX,
        y: it.y + alignOffsetY
      }))
    };
  });
}

