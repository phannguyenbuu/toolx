import { jsPDF } from 'jspdf';
import { PlanItem } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode } from './types';
import { getPageForSlot, calculateSlotTotalRotation } from './impositionGeometry';

// Image element cache to prevent reloading the same URL multiple times
const imageElementCache = new Map<string, HTMLImageElement>();
// Transformed slot image cache
const transformedSlotCache = new Map<string, { dataUrl: string; format: 'JPEG' | 'PNG' }>();

export const loadHtmlImage = (src: string): Promise<HTMLImageElement> => {
  if (imageElementCache.has(src)) {
    const cached = imageElementCache.get(src)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

export interface RenderSlotOptions {
  src: string;
  actualW_mm: number;
  actualH_mm: number;
  totalRotation: number;
  fitMode: string;
  shape: string;
  cornerRadius_mm: number;
  isSpecialShape: boolean;
  isRotatedItem: boolean;
  dpi?: number;
  customScalePct?: number;
}

export const renderTransformedSlotImage = async (
  opts: RenderSlotOptions
): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' }> => {
  const {
    src,
    actualW_mm,
    actualH_mm,
    totalRotation,
    fitMode,
    shape,
    cornerRadius_mm,
    isSpecialShape,
    isRotatedItem,
    dpi = 300,
    customScalePct = 100
  } = opts;

  const normRot = ((totalRotation % 360) + 360) % 360;
  const isRotated90 = (normRot % 180) !== 0;

  const cacheKey = `${src}_${Math.round(actualW_mm * 10)}_${Math.round(actualH_mm * 10)}_${normRot}_${fitMode}_${shape}_${Math.round(cornerRadius_mm * 10)}_${isSpecialShape ? 1 : 0}_${isRotatedItem ? 1 : 0}_${customScalePct}_${dpi}`;
  if (transformedSlotCache.has(cacheKey)) {
    return transformedSlotCache.get(cacheKey)!;
  }

  const img = await loadHtmlImage(src);

  const pxPerMm = (dpi || 300) / 25.4;
  let canvasW = Math.round(actualW_mm * pxPerMm);
  let canvasH = Math.round(actualH_mm * pxPerMm);
  const maxDim = Math.max(canvasW, canvasH);
  if (maxDim > 4096) {
    const s = 4096 / maxDim;
    canvasW = Math.round(canvasW * s);
    canvasH = Math.round(canvasH * s);
  }
  canvasW = Math.max(1, canvasW);
  canvasH = Math.max(1, canvasH);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  const hasTransparency = shape === 'circle' || shape === 'oval' || cornerRadius_mm > 0 || isSpecialShape;

  if (shape === 'circle' || shape === 'oval') {
    ctx.beginPath();
    ctx.ellipse(canvasW / 2, canvasH / 2, canvasW / 2, canvasH / 2, 0, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === 'trapezoid') {
    ctx.beginPath();
    if (isRotatedItem) {
      ctx.moveTo(0, 0);
      ctx.lineTo(canvasW, 0);
      ctx.lineTo(canvasW * 0.85, canvasH);
      ctx.lineTo(canvasW * 0.15, canvasH);
    } else {
      ctx.moveTo(canvasW * 0.15, 0);
      ctx.lineTo(canvasW * 0.85, 0);
      ctx.lineTo(canvasW, canvasH);
      ctx.lineTo(0, canvasH);
    }
    ctx.closePath();
    ctx.clip();
  } else if (shape === 'triangle') {
    ctx.beginPath();
    if (isRotatedItem) {
      ctx.moveTo(0, 0);
      ctx.lineTo(canvasW, 0);
      ctx.lineTo(canvasW / 2, canvasH);
    } else {
      ctx.moveTo(canvasW / 2, 0);
      ctx.lineTo(canvasW, canvasH);
      ctx.lineTo(0, canvasH);
    }
    ctx.closePath();
    ctx.clip();
  } else if (shape === 'hexagon') {
    ctx.beginPath();
    ctx.moveTo(canvasW * 0.25, 0);
    ctx.lineTo(canvasW * 0.75, 0);
    ctx.lineTo(canvasW, canvasH * 0.5);
    ctx.lineTo(canvasW * 0.75, canvasH);
    ctx.lineTo(canvasW * 0.25, canvasH);
    ctx.lineTo(0, canvasH * 0.5);
    ctx.closePath();
    ctx.clip();
  } else if (cornerRadius_mm > 0) {
    const r = Math.min(canvasW / 2, canvasH / 2, cornerRadius_mm * pxPerMm);
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(0, 0, canvasW, canvasH, r);
    } else {
      ctx.rect(0, 0, canvasW, canvasH);
    }
    ctx.clip();
  }

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  if (normRot !== 0) {
    ctx.rotate((normRot * Math.PI) / 180);
  }

  const elemW = isRotated90 ? canvasH : canvasW;
  const elemH = isRotated90 ? canvasW : canvasH;
  const nw = img.naturalWidth || elemW;
  const nh = img.naturalHeight || elemH;
  const scaleFactor = customScalePct !== 100 ? (customScalePct / 100) : 1;

  if (fitMode === 'stretch') {
    const dw = elemW * scaleFactor;
    const dh = elemH * scaleFactor;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  } else if (fitMode === 'fit') {
    const fitScale = Math.min(elemW / nw, elemH / nh) * scaleFactor;
    const dw = nw * fitScale;
    const dh = nh * fitScale;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  } else if (fitMode === 'actual') {
    const dw = nw * scaleFactor;
    const dh = nh * scaleFactor;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  } else {
    const fillScale = Math.max(elemW / nw, elemH / nh) * scaleFactor;
    const dw = nw * fillScale;
    const dh = nh * fillScale;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  }

  ctx.restore();

  const format: 'JPEG' | 'PNG' = hasTransparency ? 'PNG' : 'JPEG';
  const dataUrl = canvas.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg', 0.95);
  const result = { dataUrl, format };
  transformedSlotCache.set(cacheKey, result);
  return result;
};

export interface DrawSheetParams {
  doc: jsPDF;
  sIdx: number;
  itemsForSheet: PlanItem[];
  forceSide?: 'front' | 'back';
  config: ImpositionConfig;
  allPages: PageItem[];
  shapeTabs: ShapeTabItem[];
  activeTab?: ShapeTabItem;
  isMultiShape: boolean;
  effectiveDataMode: DataMode;
  standardQty: number;
  xUpQty: number;
  customScale?: number;
}

export const drawSheetOnDoc = async (params: DrawSheetParams) => {
  const {
    doc,
    sIdx,
    itemsForSheet,
    forceSide,
    config,
    allPages,
    shapeTabs,
    activeTab,
    isMultiShape,
    effectiveDataMode,
    standardQty,
    xUpQty,
    customScale = 100
  } = params;

  const pageW = Number(config.pageW) || 330;
  const pageH = Number(config.pageH) || 480;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, 'F');

  const isBackSide = forceSide !== undefined ? (forceSide === 'back') : (config.is2Sided && (sIdx % 2 === 1));
  const effectiveFitMode = (customScale !== 100) ? 'actual' : config.fitMode;

  for (let i = 0; i < itemsForSheet.length; i++) {
    const it = itemsForSheet[i];
    const itemsPerSheet = itemsForSheet.length;
    const globalSlotIdx = sIdx * itemsPerSheet + i;
    if (!isMultiShape && config.useTotalLimit && config.totalOrder > 0 && globalSlotIdx >= config.totalOrder) {
      continue;
    }

    const itemShape = (it.shape || config.shape) as string;
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
    const isRotatedItem = !!it.rot;
    const itemCornerRadius = it.cornerRadius !== undefined ? it.cornerRadius : (config.cornerRadius || 0);

    const actualW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
    const actualH = itemShape === 'circle' ? actualW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));
    const itemX = isBackSide ? (pageW - it.x - actualW) : it.x;
    const itemY = it.y;

    const pageIdx = getPageForSlot({
      slotIndex: i,
      sheetIdx: sIdx,
      allPagesLength: allPages.length,
      itemsPerSheet,
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
    const correspondingTab = isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName) : null;
    const previewSrc = (it.sourceImage as any)?.thumb ||
      (typeof it.sourceImage === 'string' ? it.sourceImage : null) ||
      (correspondingTab?.sourceImage as any)?.thumb ||
      (typeof correspondingTab?.sourceImage === 'string' ? correspondingTab?.sourceImage : null) ||
      (activeTab?.sourceImage as any)?.thumb ||
      (page ? (page.originalThumb || page.thumb) : (allPages.length > 0 ? (allPages[i % allPages.length]?.originalThumb || allPages[i % allPages.length]?.thumb) : null));

    const totalRotation = calculateSlotTotalRotation(it, page, config, isMultiShape, shapeTabs, isBackSide);

    if (previewSrc) {
      try {
        const { dataUrl, format } = await renderTransformedSlotImage({
          src: previewSrc,
          actualW_mm: actualW,
          actualH_mm: actualH,
          totalRotation,
          fitMode: effectiveFitMode,
          shape: itemShape,
          cornerRadius_mm: itemCornerRadius,
          isSpecialShape,
          isRotatedItem,
          dpi: config.dpi || 300,
          customScalePct: customScale
        });
        doc.addImage(dataUrl, format, itemX, itemY, actualW, actualH, undefined, 'FAST');
      } catch (imgErr) {
        console.warn('[PDF] Error rendering transformed slot image, using fallback:', imgErr);
        try {
          doc.addImage(previewSrc, 'JPEG', itemX, itemY, actualW, actualH, undefined, 'FAST');
        } catch {
          doc.setFillColor(245, 243, 255);
          doc.setDrawColor(139, 92, 246);
          doc.rect(itemX, itemY, actualW, actualH, 'FD');
        }
      }
    } else {
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(0.3);
      if (itemShape === 'circle') {
        doc.circle(itemX + actualW / 2, itemY + actualH / 2, actualW / 2, 'FD');
      } else {
        doc.roundedRect(itemX, itemY, actualW, actualH, 2, 2, 'FD');
      }
    }
  }

  // Item Crop Marks
  if (config.useCrop) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(config.cropThick || 0.25);
    const { cropLen: l, cropDist: d } = config;
    itemsForSheet.forEach((item, i) => {
      if (!isMultiShape && config.useTotalLimit && config.totalOrder > 0) {
        const globalSlotIdx = sIdx * itemsForSheet.length + i;
        if (globalSlotIdx >= config.totalOrder) return;
      }
      const itemShape = (item.shape || config.shape) as string;
      const w = item.w !== undefined ? item.w : (item.rot ? config.itemH : config.itemW);
      const h = itemShape === 'circle' ? w : (item.h !== undefined ? item.h : (item.rot ? config.itemW : config.itemH));
      const isBack = config.is2Sided && (sIdx % 2 === 1);
      const x = isBack ? (config.pageW - item.x - w) : item.x;
      const y = item.y;
      doc.line(x - d - l, y, x - d, y);
      doc.line(x, y - d - l, x, y - d);
      doc.line(x + w + d, y, x + w + d + l, y);
      doc.line(x + w, y - d - l, x + w, y - d);
      doc.line(x - d - l, y + h, x - d, y + h);
      doc.line(x, y + h + d, x, y + h + d + l);
      doc.line(x + w + d, y + h, x + w + d + l, y + h);
      doc.line(x + w, y + h + d, x + w, y + h + d + l);
    });
  }

  // Page Crop Marks
  if (config.usePageCrop) {
    const L = config.pageCropLen;
    const D = config.pageCropDist;
    const T = config.pageCropThick;
    const pW = config.pageW;
    const pH = config.pageH;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(T || 0.25);
    doc.line(D, D, D + L, D);
    doc.line(D, D, D, D + L);
    doc.line(pW - D - L, D, pW - D, D);
    doc.line(pW - D, D, pW - D, D + L);
    doc.line(D, pH - D, D + L, pH - D);
    doc.line(D, pH - D, D, pH - D - L);
    doc.line(pW - D - L, pH - D, pW - D, pH - D);
    doc.line(pW - D, pH - D, pW - D, pH - D - L);
  }

  // CMYK Color Bar
  if (config.useColorBar) {
    const cmykColors: [number, number, number][] = [
      [0, 255, 255], [255, 0, 255], [255, 255, 0], [0, 0, 0],
      [255, 0, 0], [0, 255, 0], [0, 0, 255],
      [119, 119, 119], [187, 187, 187], [255, 255, 255]
    ];
    const pW = config.pageW, pH = config.pageH, pad = config.colorBarPadding, thick = 3;
    const positions = config.colorBarPosition === 'all'
      ? ['top', 'bottom', 'left', 'right'] as const
      : [config.colorBarPosition] as const;

    positions.forEach(pos => {
      const isH = pos === 'top' || pos === 'bottom';
      const barLen = isH ? pW * 0.6 : pH * 0.6;
      const segW = barLen / cmykColors.length;
      let sx: number, sy: number;
      if (pos === 'bottom') { sx = (pW - barLen) / 2; sy = pH - pad - thick; }
      else if (pos === 'top') { sx = (pW - barLen) / 2; sy = pad; }
      else if (pos === 'left') { sx = pad; sy = (pH - barLen) / 2; }
      else { sx = pW - pad - thick; sy = (pH - barLen) / 2; }

      cmykColors.forEach(([r, g, b], idx) => {
        doc.setFillColor(r, g, b);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.1);
        if (isH) {
          doc.rect(sx + idx * segW, sy, segW, thick, 'FD');
        } else {
          doc.rect(sx, sy + idx * segW, thick, segW, 'FD');
        }
      });
    });
  }
};
