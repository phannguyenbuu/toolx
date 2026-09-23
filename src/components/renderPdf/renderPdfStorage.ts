// IndexedDB helper lưu trữ và giải nén ảnh gốc độ phân giải cao cho các tác vụ GoAgent cục bộ
export const PREVIEWS_DB_NAME = 'toolx_previews_db';
export const PREVIEWS_STORE_NAME = 'full_previews';

export function openPreviewsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB không được hỗ trợ'));
    }
    const req = indexedDB.open(PREVIEWS_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(PREVIEWS_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFullPreview(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openPreviewsDB();
    const tx = db.transaction(PREVIEWS_STORE_NAME, 'readwrite');
    tx.objectStore(PREVIEWS_STORE_NAME).put(dataUrl, id);
  } catch (e) {
    console.warn('Không thể lưu ảnh full-res vào IndexedDB:', e);
  }
}

export async function getFullPreview(id: string): Promise<string | null> {
  try {
    const db = await openPreviewsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PREVIEWS_STORE_NAME, 'readonly');
      const req = tx.objectStore(PREVIEWS_STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Tạo thumbnail thu nhỏ an toàn cho localStorage để không bao giờ bị QuotaExceededError
export const createThumbnailBase64 = (dataUrl: string, maxDim = 120): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl || '');
    }
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else {
          resolve('');
        }
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
};
