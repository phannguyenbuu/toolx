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
 * Phân bổ slot theo thứ tự: (lặp lại chi tiết trang N * nhân bản toàn layer) xong hết rồi mới tới trang tiếp theo.
 */
export function getSlotPageIndex(
  globalSlot: number,
  allPages: PageItem[],
  quantity: number
): { pageIdx: number; page: PageItem | null; isBlank: boolean } {
  if (!allPages || allPages.length === 0) {
    return { pageIdx: 0, page: null, isBlank: false };
  }
  const qty = Math.max(1, quantity);

  let accumulated = 0;
  for (let idx = 0; idx < allPages.length; idx++) {
    const pageCopies = allPages[idx].copies !== undefined ? allPages[idx].copies! : 1;
    if (pageCopies <= 0) continue;
    const totalSlotForThisPage = pageCopies * qty;
    if (globalSlot < accumulated + totalSlotForThisPage) {
      return { pageIdx: idx, page: allPages[idx], isBlank: false };
    }
    accumulated += totalSlotForThisPage;
  }
  return { pageIdx: -1, page: null, isBlank: true };
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
  const itemShape = (it.shape || config.shape) as string;
  const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
  const isRotatedItem = !!it.rot;

  const correspondingTab = isMultiShape
    ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName)
    : (shapeTabs && shapeTabs.length > 0 ? shapeTabs[0] : null);

  const effectiveImg: PageItem | null | undefined =
    correspondingTab?.sourceImage ||
    (it.sourceImage as PageItem) ||
    page ||
    (shapeTabs && shapeTabs.length > 0 ? shapeTabs[0]?.sourceImage : null);

  let pageRotation = effectiveImg ? (effectiveImg.rotation || 0) : 0;

  const isTabAutoRotate = isMultiShape
    ? (correspondingTab?.autoRotateImage !== undefined
        ? correspondingTab.autoRotateImage
        : (correspondingTab?.autoRotate !== undefined
            ? correspondingTab.autoRotate
            : (config.autoRotateImage ?? true)))
    : (correspondingTab?.autoRotateImage !== undefined
        ? correspondingTab.autoRotateImage
        : (config.autoRotateImage ?? true));

  // 1. Tự xoay toàn bộ tem (cả outer frame và nội dung) theo ô layout khi solver xoay 90°
  if (isRotatedItem && !isSpecialShape) {
    pageRotation += 90;
  }

  // 2. Tự xoay ảnh nguồn khi tỉ lệ ảnh ngược hướng với khung tem cơ bản (1 ngang, 1 đứng)
  if (isTabAutoRotate && !isSpecialShape && effectiveImg && effectiveImg.w && effectiveImg.h) {
    const imgRatio = effectiveImg.w / effectiveImg.h;
    const baseW = correspondingTab ? correspondingTab.itemW : config.itemW;
    const baseH = correspondingTab
      ? (correspondingTab.shape === 'circle' ? baseW : correspondingTab.itemH)
      : (itemShape === 'circle' ? baseW : config.itemH);
    const baseRatio = (baseW && baseH) ? baseW / baseH : 1;

    if ((imgRatio > 1 && baseRatio < 1) || (imgRatio < 1 && baseRatio > 1)) {
      pageRotation += 90;
    }
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
    const pageIdx = isMultiShape
      ? Math.max(0, shapeTabs.findIndex(t => t.id === it.tabId || t.name === it.tabName))
      : getPageForSlot({
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

/** Dịch chuyển group items theo alignX/alignY trong vùng in (ox, oy, pw, ph) */
function applyAlignment<T extends { x: number; y: number; w: number; h: number }>(
  items: T[],
  ox: number, oy: number, pw: number, ph: number,
  alignX: string, alignY: string,
): T[] {
  if (!items.length) return items;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  items.forEach(it => {
    minX = Math.min(minX, it.x); minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.w); maxY = Math.max(maxY, it.y + it.h);
  });
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  let dx = 0, dy = 0;
  if (alignX === 'center')      dx = ox + (pw - contentW) / 2 - minX;
  else if (alignX === 'right')  dx = ox + pw - contentW - minX;
  else                          dx = ox - minX; // left
  if (alignY === 'middle')      dy = oy + (ph - contentH) / 2 - minY;
  else if (alignY === 'bottom') dy = oy + ph - contentH - minY;
  else                          dy = oy - minY; // top
  if (dx === 0 && dy === 0) return items;
  return items.map(it => ({ ...it, x: it.x + dx, y: it.y + dy }));
}

/**
 * Per-sheet alignment: center items on each sheet first (matching LayoutSolver.centerItems),
 * then apply the user-chosen alignment.
 *
 * This ensures ALL 9 alignment buttons produce visible movement, not just non-left/non-top ones.
 * Without this, packMultiSize items start at (0,0) so 'left'/'top' alignment = dx=0 (invisible).
 */
function applyAlignmentPerSheet<T extends { x: number; y: number; w: number; h: number; sheetIndex?: number }>(
  items: T[],
  ox: number, oy: number, pw: number, ph: number,
  alignX: string, alignY: string,
): T[] {
  if (!items.length) return items;

  // Group by sheetIndex
  const sheetMap = new Map<number, T[]>();
  items.forEach(it => {
    const si = it.sheetIndex ?? 0;
    if (!sheetMap.has(si)) sheetMap.set(si, []);
    sheetMap.get(si)!.push(it);
  });

  const result: T[] = [];
  sheetMap.forEach(sheetItems => {
    // Step 1: center items within the print area (matching LayoutSolver.centerItems behaviour)
    const centered = applyAlignment(sheetItems, ox, oy, pw, ph, 'center', 'middle');
    // Step 2: apply user alignment from centered state
    const aligned = applyAlignment(centered, ox, oy, pw, ph, alignX, alignY);
    result.push(...aligned);
  });
  return result;
}


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
    return results.map(r => {
      const rawItems = r.items.map(it => ({
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
      }));
      // Use per-sheet centering so all 9 alignment buttons produce visible movement
      const alignedItems = applyAlignmentPerSheet(rawItems, ox, oy, pw, ph, config.alignX ?? 'center', config.alignY ?? 'middle');
      return { name: r.name, qty: r.items.length, priority: 0, items: alignedItems };
    });
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
    return results.map(r => {
      // Include sheetIndex so applyAlignmentPerSheet can group per sheet
      const rawItems = r.items.map(it => ({ x: it.x + ox, y: it.y + oy, w: it.w, h: it.h, rot: it.rot, sheetIndex: it.sheetIndex ?? 0 }));
      const alignedItems = applyAlignmentPerSheet(rawItems, ox, oy, pw, ph, config.alignX ?? 'center', config.alignY ?? 'middle');
      return { name: r.name, qty: r.items.length, priority: 0, items: alignedItems };
    });
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

    let startX = 0;
    let startY = 0;
    if (config.usePrintArea) {
      startX = (config.pageW - config.printAreaW) / 2;
      startY = (config.pageH - config.printAreaH) / 2;
    } else if (config.useMargin) {
      startX = config.marginLeft;
      startY = config.marginTop;
    }

    let alignOffsetX = 0;
    let alignOffsetY = 0;

    if (config.alignX === 'center') {
      alignOffsetX = startX + (effectivePrintW - contentW) / 2 - minX;
    } else if (config.alignX === 'right') {
      alignOffsetX = startX + effectivePrintW - contentW - minX;
    } else {
      alignOffsetX = startX - minX;
    }

    if (config.alignY === 'middle') {
      alignOffsetY = startY + (effectivePrintH - contentH) / 2 - minY;
    } else if (config.alignY === 'bottom') {
      alignOffsetY = startY + effectivePrintH - contentH - minY;
    } else {
      alignOffsetY = startY - minY;
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

