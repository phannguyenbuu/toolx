import { CropTransform, CropBox, ViewportSize } from './types';
import { ColorAdjustSettings, applyColorAdjustments, isDefaultColorSettings } from '../../utils/colorAdjustment';

export function calculateCropBox(
  viewportSize: ViewportSize,
  localItemW: number,
  localItemH: number,
  localShape: string,
  aspectMode: 'item' | '1:1' | '4:3' | '16:9' | 'free' = 'item'
): CropBox {
  if (viewportSize.w <= 0 || viewportSize.h <= 0) {
    return { x: 0, y: 0, w: 200, h: 200 };
  }

  let targetRatio = (localItemW || 100) / (localItemH || 100);
  if (aspectMode === '1:1' || localShape === 'circle') targetRatio = 1;
  else if (aspectMode === '4:3') targetRatio = 4 / 3;
  else if (aspectMode === '16:9') targetRatio = 16 / 9;

  const padding = 20;
  const maxW = Math.max(50, viewportSize.w - padding * 2);
  const maxH = Math.max(50, viewportSize.h - padding * 2);

  let w = maxW;
  let h = w / targetRatio;
  if (h > maxH) {
    h = maxH;
    w = h * targetRatio;
  }
  const x = (viewportSize.w - w) / 2;
  const y = (viewportSize.h - h) / 2;
  return { x, y, w, h };
}

export interface LiveRenderParams {
  canvas: HTMLCanvasElement;
  viewportSize: ViewportSize;
  cropBox: CropBox;
  crop: CropTransform;
  imgElement: HTMLImageElement;
  colorSettings: ColorAdjustSettings;
  showOriginal: boolean;
  bleedBgColor?: string;
}

export function renderLiveCanvas({
  canvas,
  viewportSize,
  cropBox,
  crop,
  imgElement,
  colorSettings,
  showOriginal,
  bleedBgColor,
}: LiveRenderParams) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const vw = Math.max(100, Math.round(viewportSize.w));
  const vh = Math.max(100, Math.round(viewportSize.h));

  canvas.width = vw;
  canvas.height = vh;

  ctx.clearRect(0, 0, vw, vh);
  // Fill crop box background with chosen bleedBgColor (clean white by default)
  ctx.fillStyle = bleedBgColor || '#ffffff';
  ctx.fillRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
  ctx.save();

  // Center of crop box in the viewport
  const centerX = cropBox.x + cropBox.w / 2;
  const centerY = cropBox.y + cropBox.h / 2;

  ctx.translate(centerX + crop.panX, centerY + crop.panY);
  ctx.rotate((crop.rotation * Math.PI) / 180);
  ctx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

  // Scale image relative to crop box
  const imgAspect = imgElement.width / imgElement.height;
  const baseW = cropBox.w;
  const baseH = baseW / imgAspect;

  const drawW = baseW * crop.zoom;
  const drawH = baseH * crop.zoom;

  ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Apply color adjustments if not showing original
  if (!showOriginal && !isDefaultColorSettings(colorSettings)) {
    try {
      const imageData = ctx.getImageData(0, 0, vw, vh);
      applyColorAdjustments(imageData, ctx, colorSettings);
    } catch (err) {
      console.error('Error applying color adjustment:', err);
    }
  }
}

export interface ExportRenderParams {
  imgElement: HTMLImageElement | null;
  imgLoaded: boolean;
  cropBox: CropBox;
  crop: CropTransform;
  colorSettings: ColorAdjustSettings;
  currentImageSrc: string | null;
  bleedBgColor: string;
}

export function renderExportCanvas({
  imgElement,
  imgLoaded,
  cropBox,
  crop,
  colorSettings,
  currentImageSrc,
  bleedBgColor,
}: ExportRenderParams): string | null {
  if (!imgElement || !imgLoaded) return currentImageSrc;
  const exportScale = 3;
  const exportW = Math.max(1, Math.round(cropBox.w * exportScale));
  const exportH = Math.max(1, Math.round(cropBox.h * exportScale));

  const offCanvas = document.createElement('canvas');
  offCanvas.width = exportW;
  offCanvas.height = exportH;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return currentImageSrc;

  // Fill background color first (prevents letterbox transparent turning black!)
  offCtx.fillStyle = bleedBgColor || '#ffffff';
  offCtx.fillRect(0, 0, exportW, exportH);

  offCtx.save();
  offCtx.translate(exportW / 2 + crop.panX * exportScale, exportH / 2 + crop.panY * exportScale);
  offCtx.rotate((crop.rotation * Math.PI) / 180);
  offCtx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

  const imgAspect = imgElement.width / imgElement.height;
  const baseW = exportW;
  const baseH = baseW / imgAspect;
  const drawW = baseW * crop.zoom;
  const drawH = baseH * crop.zoom;
  offCtx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
  offCtx.restore();

  if (!isDefaultColorSettings(colorSettings)) {
    try {
      const imgData = offCtx.getImageData(0, 0, exportW, exportH);
      applyColorAdjustments(imgData, offCtx, colorSettings);
    } catch (e) {
      console.error('Export color error:', e);
    }
  }
  return offCanvas.toDataURL('image/png', 0.95);
}

export interface ThumbnailRenderParams {
  imgElement: HTMLImageElement | null;
  imgLoaded: boolean;
  cropBox: CropBox;
  crop: CropTransform;
  colorSettings: ColorAdjustSettings;
  currentImageSrc: string | null;
  bleedBgColor: string;
  maxDim?: number;
}

export function renderThumbnailCanvas({
  imgElement,
  imgLoaded,
  cropBox,
  crop,
  colorSettings,
  currentImageSrc,
  bleedBgColor,
  maxDim = 320,
}: ThumbnailRenderParams): string | null {
  if (!imgElement || !imgLoaded) return currentImageSrc;
  const boxW = Math.max(1, cropBox.w);
  const boxH = Math.max(1, cropBox.h);
  const scale = Math.min(1, maxDim / Math.max(boxW, boxH));
  const exportW = Math.max(1, Math.round(boxW * scale));
  const exportH = Math.max(1, Math.round(boxH * scale));

  const offCanvas = document.createElement('canvas');
  offCanvas.width = exportW;
  offCanvas.height = exportH;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return currentImageSrc;

  // Fill background color first (prevents JPEG encoding transparent as black!)
  offCtx.fillStyle = bleedBgColor || '#ffffff';
  offCtx.fillRect(0, 0, exportW, exportH);

  offCtx.save();
  offCtx.translate(exportW / 2 + crop.panX * scale, exportH / 2 + crop.panY * scale);
  offCtx.rotate((crop.rotation * Math.PI) / 180);
  offCtx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

  const imgAspect = imgElement.width / imgElement.height;
  const baseW = exportW;
  const baseH = baseW / imgAspect;
  const drawW = baseW * crop.zoom;
  const drawH = baseH * crop.zoom;
  offCtx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
  offCtx.restore();

  if (!isDefaultColorSettings(colorSettings)) {
    try {
      const imgData = offCtx.getImageData(0, 0, exportW, exportH);
      applyColorAdjustments(imgData, offCtx, colorSettings);
    } catch (e) {
      console.error('Thumbnail color error:', e);
    }
  }
  return offCanvas.toDataURL('image/jpeg', 0.8);
}
