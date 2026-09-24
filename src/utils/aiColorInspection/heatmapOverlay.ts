/**
 * Sinh lớp phủ Heatmap (Overlay Mask) tô màu trực quan các vùng bị lỗi mực hoặc lệch màu
 */
export function generateInspectionHeatmapOverlay(
  sourceCanvas: HTMLCanvasElement,
  mode: 'tac' | 'gamut' | 'tone'
): HTMLCanvasElement {
  const overlay = document.createElement('canvas');
  overlay.width = sourceCanvas.width;
  overlay.height = sourceCanvas.height;
  const ctx = overlay.getContext('2d');
  if (!ctx) return overlay;

  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return overlay;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const srcImgData = srcCtx.getImageData(0, 0, width, height);
  const srcData = srcImgData.data;

  const outImgData = ctx.createImageData(width, height);
  const outData = outImgData.data;

  for (let i = 0; i < srcData.length; i += 4) {
    const a = srcData[i + 3];
    if (a < 15) continue;

    const r = srcData[i];
    const g = srcData[i + 1];
    const b = srcData[i + 2];

    if (mode === 'tac') {
      const rN = r / 255;
      const gN = g / 255;
      const bN = b / 255;
      const maxVal = Math.max(rN, gN, bN);
      const k = 1 - maxVal;
      let c = 0, m = 0, y = 0;
      if (k < 0.999) {
        c = (1 - rN - k) / (1 - k);
        m = (1 - gN - k) / (1 - k);
        y = (1 - bN - k) / (1 - k);
      }
      const tac = Math.round((c + m + y + k) * 100);

      if (tac > 320) {
        outData[i] = 236;
        outData[i + 1] = 72;
        outData[i + 2] = 153;
        outData[i + 3] = 220; // Neon pink/purple
      } else if (tac > 300) {
        outData[i] = 239;
        outData[i + 1] = 68;
        outData[i + 2] = 68;
        outData[i + 3] = 200; // Red
      }
    } else if (mode === 'gamut') {
      const rN = r / 255;
      const gN = g / 255;
      const bN = b / 255;
      const maxVal = Math.max(rN, gN, bN);
      const minVal = Math.min(rN, gN, bN);
      const chroma = maxVal - minVal;
      const sat = maxVal > 0.001 ? chroma / maxVal : 0;

      if (sat > 0.82 && maxVal > 0.4) {
        outData[i] = 6;
        outData[i + 1] = 182;
        outData[i + 2] = 212;
        outData[i + 3] = 220; // Cyan dạ quang
      }
    } else if (mode === 'tone') {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 10) {
        outData[i] = 59;
        outData[i + 1] = 130;
        outData[i + 2] = 246;
        outData[i + 3] = 220; // Blue
      } else if (lum > 248) {
        outData[i] = 245;
        outData[i + 1] = 158;
        outData[i + 2] = 11;
        outData[i + 3] = 220; // Yellow-amber
      }
    }
  }

  ctx.putImageData(outImgData, 0, 0);
  return overlay;
}
