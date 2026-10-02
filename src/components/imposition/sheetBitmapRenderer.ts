import { PlanItem } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { getSlotPageIndex } from './impositionGeometry';

// ─── Image cache ─────────────────────────────────────────────────────────────
const imgCache = new Map<string, HTMLImageElement>();

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (imgCache.has(src)) return imgCache.get(src)!;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgCache.set(src, img); resolve(img); };
    img.onerror = () => resolve(null); // fail silently
    img.src = src;
  });
}

// ─── Shape path builder ───────────────────────────────────────────────────────
function tracePath(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number, y: number, w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
    case 'oval':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'trapezoid': {
      const off = w * 0.15;
      ctx.moveTo(x + off, y); ctx.lineTo(x + w - off, y);
      ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    }
    case 'triangle':
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    case 'hexagon': {
      const y25 = y + h * 0.25, y75 = y + h * 0.75;
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y25); ctx.lineTo(x + w, y75);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y75); ctx.lineTo(x, y25);
      ctx.closePath();
      break;
    }
    default: // rect
      if (r > 0 && typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(x, y, w, h, r);
      } else if (r > 0) {
        // Manual rounded rect
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      } else {
        ctx.rect(x, y, w, h);
      }
  }
}

// ─── Draw image with fitMode ──────────────────────────────────────────────────
function drawImgFitted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  fitMode: string,
  rotation: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  // For 90°/270°, image is drawn in rotated frame where slot width↔height swap
  const is90or270 = rotation === 90 || rotation === 270;
  const effSlotW = is90or270 ? h : w;  // slot width in rotated frame
  const effSlotH = is90or270 ? w : h;  // slot height in rotated frame

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // Draw image centered in rotated frame to fill effSlotW × effSlotH
  switch (fitMode) {
    case 'stretch':
      ctx.drawImage(img, -effSlotW / 2, -effSlotH / 2, effSlotW, effSlotH);
      break;
    case 'fill': {
      const s = Math.max(effSlotW / iw, effSlotH / ih);
      const dw = iw * s, dh = ih * s;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      break;
    }
    case 'fit': {
      const s = Math.min(effSlotW / iw, effSlotH / ih);
      const dw = iw * s, dh = ih * s;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      break;
    }
    case 'actual':
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
      break;
    default:
      ctx.drawImage(img, -effSlotW / 2, -effSlotH / 2, effSlotW, effSlotH);
  }
  ctx.restore();
}

// ─── Public interface ─────────────────────────────────────────────────────────
export interface SheetBitmapParams {
  sIdx: number;
  sheetItems: PlanItem[];
  config: ImpositionConfig;
  shapeTabs: ShapeTabItem[];
  activeTab: ShapeTabItem;
  allPages: PageItem[];
  scale: number;
  previewSide: 'front' | 'back';
  isMultiShape: boolean;
  customSvgData: string;
  vectorMaskResult: VectorMaskResult | null;
}

export async function renderSheetBitmap(params: SheetBitmapParams): Promise<HTMLCanvasElement> {
  const {
    sIdx, sheetItems, config, shapeTabs, activeTab,
    allPages, scale, previewSide, isMultiShape,
    customSvgData, vectorMaskResult,
  } = params;

  const W = Math.round(config.pageW * scale);
  const H = Math.round(config.pageH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = W || 1;
  canvas.height = H || 1;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const isBackSide = config.is2Sided && previewSide === 'back';

  // ── Collect all thumbnail URLs to preload in parallel ──
  const urlsToLoad: string[] = [];
  for (let i = 0; i < sheetItems.length; i++) {
    const it = sheetItems[i];
    const tab = isMultiShape
      ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName)
      : (shapeTabs[0] ?? null);
    // Q copies per page taking into account per-page copies (lặp lại chi tiết)
    const qty = activeTab?.quantity || 1;
    const globalSlot = sIdx * sheetItems.length + i;
    const slotInfo = isMultiShape
      ? { pageIdx: -1, page: null, isBlank: false }
      : getSlotPageIndex(globalSlot, allPages, qty);
    const { page, isBlank } = slotInfo;
    const imgItem: any = (it.sourceImage as any)
      || (allPages.length > 1 && !isMultiShape ? (isBlank ? null : page) : null)
      || (isBlank ? null : (tab?.sourceImage || activeTab?.sourceImage || page || (allPages.length > 0 ? allPages[i % allPages.length] : null)));
    const src = imgItem?.thumb ?? imgItem?.originalThumb ?? (typeof imgItem === 'string' ? imgItem : null);
    if (src && !urlsToLoad.includes(src)) urlsToLoad.push(src);
  }
  await Promise.all(urlsToLoad.map(loadImg));

  // ── Draw each slot ──
  for (let i = 0; i < sheetItems.length; i++) {
    const it = sheetItems[i];
    const itemShape = ((it.shape || config.shape) as string);
    const itemCornerRadius = it.cornerRadius !== undefined ? it.cornerRadius : config.cornerRadius;
    const itemColor = it.color || '#8b5cf6';
    const isCustomShape = itemShape === 'custom-svg' || itemShape === 'vector-mask';

    const itW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
    const itH = itemShape === 'circle' ? itW
      : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));

    const itemX = isBackSide ? config.pageW - it.x - itW : it.x;
    const x = itemX * scale, y = it.y * scale;
    const w = itW * scale, h = itH * scale;
    const r = itemCornerRadius > 0 ? Math.min(itemCornerRadius * scale, w / 4, h / 4) : 0;

    const tab = isMultiShape
      ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName)
      : (shapeTabs[0] ?? null);
    // Q copies per page: floor(globalSlot / quantity)
    const qty = activeTab?.quantity || 1;
    const globalSlot = sIdx * sheetItems.length + i;
    const slotInfo = isMultiShape
      ? { pageIdx: -1, page: null, isBlank: false }
      : getSlotPageIndex(globalSlot, allPages, qty);
    const { page, isBlank } = slotInfo;
    // Multi-page single-shape: each page fills Q consecutive slots
    const imgItem: any = (it.sourceImage as any)
      || (allPages.length > 1 && !isMultiShape ? (isBlank ? null : page) : null)
      || (isBlank ? null : (tab?.sourceImage || activeTab?.sourceImage || page || (allPages.length > 0 ? allPages[i % allPages.length] : null)));
    const previewSrc = imgItem?.thumb ?? imgItem?.originalThumb ?? (typeof imgItem === 'string' ? imgItem : null);
    const img = previewSrc ? imgCache.get(previewSrc) ?? null : null;

    // Rotation: it.rot is 180° flip from layout
    // ── Rotation: layout flip + optional auto-rotate image ──
    const autoRotate = activeTab?.autoRotateImage !== undefined
      ? activeTab.autoRotateImage
      : (config as any).autoRotateImage ?? true;
    let rotation = it.rot ? 180 : 0;
    if (autoRotate && !isCustomShape && imgItem?.w && imgItem?.h) {
      const imgRatio = (imgItem.w as number) / (imgItem.h as number);
      const slotRatio = itW / itH;
      // Rotate 90° when image and slot orientations differ (portrait vs landscape)
      if ((imgRatio > 1 && slotRatio < 1) || (imgRatio < 1 && slotRatio > 1)) {
        rotation = ((rotation + 90) % 360 + 360) % 360;
      }
    }

    ctx.save();

    if (isCustomShape) {
      // Resolve pathD
      const vMask = it.vectorMaskResult || tab?.vectorMaskResult || vectorMaskResult;
      const effectiveSvg = (it.customSvgData as string) || tab?.customSvgData || customSvgData || '';
      const pathMatch = effectiveSvg.match(/<path[^>]*\bd=["']([^"']+)["']/i);
      const pathD = vMask?.pathData || (pathMatch ? pathMatch[1] : null);

      // Parse viewBox
      const vbMatch = effectiveSvg.match(/viewBox=["']([^"']+)["']/);
      const vbParts = (vbMatch ? vbMatch[1] : '').trim().split(/[\s,]+/).map(Number);
      const vbMinX = isNaN(vbParts[0]) ? 0 : vbParts[0];
      const vbMinY = isNaN(vbParts[1]) ? 0 : vbParts[1];
      const vbW = (!isNaN(vbParts[2]) && vbParts[2] > 0) ? vbParts[2] : itW;
      const vbH = (!isNaN(vbParts[3]) && vbParts[3] > 0) ? vbParts[3] : itH;

      if (pathD) {
        // Map SVG vb coordinates → canvas px
        ctx.translate(x - vbMinX * (w / vbW), y - vbMinY * (h / vbH));
        ctx.scale(w / vbW, h / vbH);

        const path = new Path2D(pathD);
        if (img) {
          ctx.save();
          ctx.clip(path);
          ctx.drawImage(img, vbMinX, vbMinY, vbW, vbH);
          ctx.restore();
        } else {
          ctx.fillStyle = `${itemColor}25`;
          ctx.fill(path);
        }
        ctx.strokeStyle = itemColor;
        ctx.lineWidth = Math.max(0.4, Math.min(vbW, vbH) * 0.008);
        ctx.stroke(path);
      } else {
        // Fallback to rect
        tracePath(ctx, 'rect', x, y, w, h, r);
        ctx.fillStyle = `${itemColor}25`;
        ctx.fill();
        ctx.strokeStyle = itemColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else {
      // Standard shapes
      tracePath(ctx, itemShape, x, y, w, h, r);

      if (img) {
        ctx.save();
        ctx.clip();
        drawImgFitted(ctx, img, x, y, w, h, config.fitMode, rotation);
        ctx.restore();
      } else {
        ctx.fillStyle = `${itemColor}25`;
        ctx.fill();
      }

      // Stroke
      tracePath(ctx, itemShape, x, y, w, h, r);
      ctx.strokeStyle = itemColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

  }

  return canvas;
}
