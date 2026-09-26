import toast from 'react-hot-toast';
import { PlanItem } from '../../utils/layoutSolver';
import { ImpositionConfig, ImpositionStyle, ImpositionAutoSavedState, AUTOSAVE_STORAGE_KEY } from './types';

export const DEFAULT_CONFIG: ImpositionConfig = {
  shape: 'rect', itemW: 90, itemH: 54, padding: 3, cornerRadius: 0,
  pageW: 320, pageH: 480, printW: 300, printH: 460, totalOrder: 100,
  useCrop: true, cropLen: 5, cropDist: 2, cropThick: 0.2, cropColor: '#000000',
  fitMode: 'fill', colorMode: 'original', dpi: 300, autoRotate: true,
  autoRotateImage: true, processMode: 'vector', cutBleed: 3,
  usePrintArea: false, printAreaW: 300, printAreaH: 460,
  marginTop: 10, marginBot: 10, marginLeft: 10, marginRight: 10,
  marginTop2: 10, marginBot2: 10, marginLeft2: 10, marginRight2: 10,
  marginMode: 'safe', useMargin: false, alignX: 'center', alignY: 'middle', flowDir: 0,
  usePageCrop: false, pageCropLen: 5, pageCropDist: 3, pageCropThick: 0.25, pageCropColor: '#000000',
  is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'same',
  useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
};

export const safeToastSuccess = (msg: string) => {
  try {
    if (typeof (toast as any)?.success === 'function') {
      (toast as any).success(msg);
    } else if (typeof toast === 'function') {
      (toast as any)(msg);
    }
  } catch (e) {
    console.log('[Toast Success]', msg);
  }
};

export const safeToastError = (msg: string) => {
  try {
    if (typeof (toast as any)?.error === 'function') {
      (toast as any).error(msg);
    } else if (typeof toast === 'function') {
      (toast as any)(msg);
    }
  } catch (e) {
    console.error('[Toast Error]', msg);
  }
};

export const safeToastInfo = (msg: string) => {
  try {
    if (typeof (toast as any) === 'function') {
      (toast as any)(msg);
    }
  } catch (e) {
    console.log('[Toast Info]', msg);
  }
};

export const safeToastLoading = (msg: string, toastId?: string): string => {
  try {
    if (typeof (toast as any)?.loading === 'function') {
      return (toast as any).loading(msg, toastId ? { id: toastId } : undefined);
    }
  } catch (e) {
    console.log('[Toast Loading]', msg);
  }
  return toastId || `toast-${Date.now()}`;
};

export const safeToastDismiss = (toastId?: string) => {
  try {
    if (typeof (toast as any)?.dismiss === 'function') {
      (toast as any).dismiss(toastId);
    }
  } catch (e) {}
};

/**
 * Áp dụng kiểu trở lên layout items.
 * - Sheetwise: giữ nguyên (in AB riêng biệt)
 * - Work & Turn: mirror items qua trục dọc (Y axis) → front+back cùng 1 mặt in
 * - Work & Tumble: mirror items qua trục ngang (X axis) + rotate 180° → front+back cùng 1 mặt in
 */
export function applyImpositionStyle(
  items: PlanItem[],
  style: ImpositionStyle,
  pageW: number,
  pageH: number
): PlanItem[] {
  if (style === 'sheetwise' || items.length === 0) return items;

  if (style === 'work-and-turn') {
    // Trục dọc ở giữa tờ giấy: x = pageW / 2
    // Items gốc nằm nửa trái, copy mirror sang nửa phải
    const mirrored = items.map(it => ({
      ...it,
      x: pageW - it.x - it.w, // flip x qua trục giữa
      rot: it.rot,
    }));
    return [...items, ...mirrored];
  }

  if (style === 'work-and-tumble') {
    // Trục ngang ở giữa tờ giấy: y = pageH / 2
    // Items gốc nằm nửa trên, copy mirror sang nửa dưới + flip
    const mirrored = items.map(it => ({
      ...it,
      y: pageH - it.y - it.h, // flip y qua trục giữa
      rot: it.rot,
      flipped: !it.flipped,
    }));
    return [...items, ...mirrored];
  }

  return items;
}

export function loadAutoSavedState(): ImpositionAutoSavedState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[AutoSave] Failed to parse autosaved state:', err);
    return null;
  }
}

export function saveAutoSavedState(state: ImpositionAutoSavedState): void {
  try {
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[AutoSave] Failed to save autosaved state:', err);
  }
}

export interface RemoveBgOptions {
  whiteThreshold?: number; // 180 .. 255 (default 230)
  shadowTolerance?: number; // 0 .. 60 (default 25)
  shadowBrightness?: number; // 80 .. 240 (default 135)
  featherRadius?: number; // 0 .. 5 (default 1.5)
  protectSaturation?: number; // 5 .. 50 (default 18)
  floodFillFromBorder?: boolean; // default true
  useAiModel?: boolean; // default false
}

/**
 * Khử nền trắng client-side bằng thuật toán BFS Flood Fill thông minh:
 * - Bảo vệ 100% các vùng có màu sắc (xanh, đỏ, vàng,...) không bao giờ bị xóa
 * - Khử sạch bóng đổ xám trung tính (drop-shadow)
 * - Làm mềm viền (feathering) xóa sạch hiện tượng lởm chởm / răng cưa
 * - Mặc định ăn từ 4 cạnh viền ngoài vào, bảo vệ các chi tiết trắng bên trong
 */
export async function removeWhiteBackgroundClientFallback(
  srcDataUrl: string,
  options?: Partial<RemoveBgOptions>
): Promise<string> {
  const whiteThreshold = options?.whiteThreshold ?? 230;
  const shadowTolerance = options?.shadowTolerance ?? 25;
  const shadowBrightness = options?.shadowBrightness ?? 135;
  const featherRadius = options?.featherRadius ?? 1.5;
  const protectSaturation = options?.protectSaturation ?? 18;
  const floodFillFromBorder = options?.floodFillFromBorder ?? true;

  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = srcDataUrl;
  });
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return srcDataUrl;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Kiểm tra pixel có phải nền trắng hoặc bóng đổ xám trung tính trên nền trắng
  const isBgPixel = (idx: number) => {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
    if (a === 0) return true; // Đã trong suốt
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const satDiff = maxVal - minVal;

    // Nếu pixel có màu rõ rệt (độ bão hòa cao như màu xanh, đỏ, vàng), BẢO VỆ 100% không bao giờ xóa
    if (satDiff > protectSaturation) return false;

    // 1. Pixel màu trắng / gần trắng
    if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
      return true;
    }

    // 2. Bóng đổ xám trung tính (drop-shadow) trên nền trắng
    const brightness = (r + g + b) / 3;
    if (satDiff <= shadowTolerance && brightness >= shadowBrightness) {
      return true;
    }

    return false;
  };

  const totalPixels = w * h;
  const isBg = new Uint8Array(totalPixels);

  if (floodFillFromBorder) {
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    for (let x = 0; x < w; x++) {
      const topIdx = x;
      if (!isBg[topIdx] && isBgPixel(topIdx * 4)) { isBg[topIdx] = 1; queue[tail++] = topIdx; }
      const botIdx = (h - 1) * w + x;
      if (!isBg[botIdx] && isBgPixel(botIdx * 4)) { isBg[botIdx] = 1; queue[tail++] = botIdx; }
    }
    for (let y = 0; y < h; y++) {
      const leftIdx = y * w;
      if (!isBg[leftIdx] && isBgPixel(leftIdx * 4)) { isBg[leftIdx] = 1; queue[tail++] = leftIdx; }
      const rightIdx = y * w + (w - 1);
      if (!isBg[rightIdx] && isBgPixel(rightIdx * 4)) { isBg[rightIdx] = 1; queue[tail++] = rightIdx; }
    }

    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % w;
      const cy = (curr / w) | 0;

      if (cy > 0) {
        const nb = curr - w;
        if (!isBg[nb] && isBgPixel(nb * 4)) { isBg[nb] = 1; queue[tail++] = nb; }
      }
      if (cy < h - 1) {
        const nb = curr + w;
        if (!isBg[nb] && isBgPixel(nb * 4)) { isBg[nb] = 1; queue[tail++] = nb; }
      }
      if (cx > 0) {
        const nb = curr - 1;
        if (!isBg[nb] && isBgPixel(nb * 4)) { isBg[nb] = 1; queue[tail++] = nb; }
      }
      if (cx < w - 1) {
        const nb = curr + 1;
        if (!isBg[nb] && isBgPixel(nb * 4)) { isBg[nb] = 1; queue[tail++] = nb; }
      }
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      if (isBgPixel(i * 4)) {
        isBg[i] = 1;
      }
    }
  }

  // Alpha matting / Feathering để xóa triệt để răng cưa & lởm chởm dropshadow
  if (featherRadius <= 0.5) {
    for (let i = 0; i < totalPixels; i++) {
      if (isBg[i]) data[i * 4 + 3] = 0;
    }
  } else {
    const alphaMask = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      alphaMask[i] = isBg[i] ? 0 : 255;
    }
    const smoothMask = new Uint8Array(totalPixels);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (alphaMask[idx] === 0) {
          smoothMask[idx] = 0;
          continue;
        }
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            sum += alphaMask[ny * w + nx];
            count++;
          }
        }
        smoothMask[idx] = Math.round(sum / count);
      }
    }
    for (let i = 0; i < totalPixels; i++) {
      data[i * 4 + 3] = Math.min(data[i * 4 + 3], smoothMask[i]);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Tách / Khử nền trắng:
 * - Nếu useAiModel = true: Gọi AI Rembg từ server
 * - Mặc định: Chạy thuật toán khử trắng thông minh client-side bảo vệ màu sắc và gọt sạch bóng đổ
 */
export async function removeWhiteBackgroundService(
  srcDataUrl: string,
  options?: Partial<RemoveBgOptions>
): Promise<string> {
  if (options?.useAiModel) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: srcDataUrl, model: 'u2net' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.image) {
          return data.image;
        }
      }
    } catch (e) {
      console.warn('[AI RemoveBG] Failed to call AI endpoint, using fallback:', e);
    }
  }
  return removeWhiteBackgroundClientFallback(srcDataUrl, options);
}

