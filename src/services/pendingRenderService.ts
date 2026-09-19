// Service hỗ trợ chuyển giao tác vụ Render giữa phân hệ Bình Trang (/layout) và Render Prepress (/render)

const PENDING_RENDER_DB = 'toolx_pending_render_db';
const PENDING_RENDER_STORE = 'pending_files';

export interface PendingRenderJobMeta {
  id: string;
  filename: string;
  engine: 'auto' | 'goagent' | 'server';
  selectedNodeUid: string;
  presetId?: string;
  presetSettings?: any;
  sourceModule: 'imposition' | 'package' | 'upload';
  createdAt: number;
}

export function openPendingRenderDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB không được hỗ trợ trong trình duyệt này'));
    }
    const req = indexedDB.open(PENDING_RENDER_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(PENDING_RENDER_STORE)) {
        req.result.createObjectStore(PENDING_RENDER_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingRenderBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openPendingRenderDB();
    const tx = db.transaction(PENDING_RENDER_STORE, 'readwrite');
    tx.objectStore(PENDING_RENDER_STORE).put(blob, id);
  } catch (e) {
    console.warn('Không thể lưu PDF Blob vào IndexedDB:', e);
  }
}

export async function getPendingRenderBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openPendingRenderDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PENDING_RENDER_STORE, 'readonly');
      const req = tx.objectStore(PENDING_RENDER_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearPendingRenderBlob(id: string): Promise<void> {
  try {
    const db = await openPendingRenderDB();
    const tx = db.transaction(PENDING_RENDER_STORE, 'readwrite');
    tx.objectStore(PENDING_RENDER_STORE).delete(id);
  } catch {}
}
