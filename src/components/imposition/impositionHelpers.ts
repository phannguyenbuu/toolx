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

/**
 * Fallback khử nền trắng client-side bằng thuật toán BFS Flood Fill từ 4 cạnh viền.
 * Không ăn vào các chi tiết màu trắng bên trong đối tượng (huy hiệu, áo, chữ).
 */
export async function removeWhiteBackgroundClientFallback(srcDataUrl: string): Promise<string> {
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

  // Pixel gần trắng: R,G,B >= 220
  const isWhite = (idx: number) => {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
    return a > 0 && r >= 220 && g >= 220 && b >= 220;
  };

  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  for (let x = 0; x < w; x++) {
    const topIdx = x;
    if (!visited[topIdx] && isWhite(topIdx * 4)) { visited[topIdx] = 1; queue.push(topIdx); }
    const botIdx = (h - 1) * w + x;
    if (!visited[botIdx] && isWhite(botIdx * 4)) { visited[botIdx] = 1; queue.push(botIdx); }
  }
  for (let y = 0; y < h; y++) {
    const leftIdx = y * w;
    if (!visited[leftIdx] && isWhite(leftIdx * 4)) { visited[leftIdx] = 1; queue.push(leftIdx); }
    const rightIdx = y * w + (w - 1);
    if (!visited[rightIdx] && isWhite(rightIdx * 4)) { visited[rightIdx] = 1; queue.push(rightIdx); }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = Math.floor(curr / w);

    const neighbors = [
      cy > 0 ? (cy - 1) * w + cx : -1,
      cy < h - 1 ? (cy + 1) * w + cx : -1,
      cx > 0 ? cy * w + (cx - 1) : -1,
      cx < w - 1 ? cy * w + (cx + 1) : -1,
    ];

    for (const nb of neighbors) {
      if (nb >= 0 && !visited[nb]) {
        if (isWhite(nb * 4)) {
          visited[nb] = 1;
          queue.push(nb);
        }
      }
    }
  }

  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Gọi AI Rembg (u2net / isnet-general-use) từ server để tách nền chuyên nghiệp,
 * gọt sạch bóng đổ drop-shadow và giữ nguyên chi tiết bên trong.
 */
export async function removeWhiteBackgroundService(
  srcDataUrl: string,
  model: 'u2net' | 'isnet-general-use' = 'u2net'
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: srcDataUrl, model }),
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
  return removeWhiteBackgroundClientFallback(srcDataUrl);
}

