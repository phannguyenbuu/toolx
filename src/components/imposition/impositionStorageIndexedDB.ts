/**
 * IndexedDB Persistence Service for Toolx Imposition
 * Lưu trữ bền vững workspace, danh mục tệp, các layer và hình ảnh/PDF trực tiếp trong IndexedDB
 * Khắc phục giới hạn 5MB của localStorage và đảm bảo refresh (F5) không bao giờ mất dữ liệu
 */

import { ShapeTabItem, PageItem, ImpositionConfig } from './types';
import { FileGroupItem } from './impositionFileService';

const DB_NAME = 'toolx_imposition_db';
const DB_VERSION = 1;
const STORE_WORKSPACE = 'workspace';
const STORE_FILES = 'files';

export interface StoredWorkspace {
  id: string;
  shapeTabs: ShapeTabItem[];
  allPages: PageItem[];
  config: ImpositionConfig;
  activeTabId: string;
  currentPlanIndex?: number;
  savedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB không được hỗ trợ trong môi trường này'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
        db.createObjectStore(STORE_WORKSPACE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'fileId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu toàn bộ workspace hiện tại vào IndexedDB (gồm cả hình ảnh dung lượng lớn)
 */
export async function saveWorkspaceToIndexedDB(data: {
  shapeTabs: ShapeTabItem[];
  allPages: PageItem[];
  config: ImpositionConfig;
  activeTabId: string;
  currentPlanIndex?: number;
}): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_WORKSPACE, 'readwrite');
      const store = tx.objectStore(STORE_WORKSPACE);
      const record: StoredWorkspace = {
        id: 'current_workspace',
        shapeTabs: data.shapeTabs,
        allPages: data.allPages,
        config: data.config,
        activeTabId: data.activeTabId,
        currentPlanIndex: data.currentPlanIndex,
        savedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = (err) => {
        console.warn('[IndexedDB] Lỗi lưu workspace:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể mở DB để lưu workspace:', err);
    return false;
  }
}

/**
 * Tải workspace đã lưu gần nhất từ IndexedDB
 */
export async function loadWorkspaceFromIndexedDB(): Promise<StoredWorkspace | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_WORKSPACE, 'readonly');
      const store = tx.objectStore(STORE_WORKSPACE);
      const req = store.get('current_workspace');
      req.onsuccess = () => {
        const result = req.result as StoredWorkspace | undefined;
        if (result && Array.isArray(result.shapeTabs) && result.shapeTabs.length > 0) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể tải workspace:', err);
    return null;
  }
}

/**
 * Xóa workspace đã lưu (dùng khi bấm "Làm mới")
 */
export async function clearWorkspaceFromIndexedDB(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_WORKSPACE, 'readwrite');
      const store = tx.objectStore(STORE_WORKSPACE);
      const req = store.delete('current_workspace');
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[IndexedDB] Lỗi khi xóa workspace:', err);
    return false;
  }
}

/**
 * Lưu danh mục tệp (file groups) vào IndexedDB
 */
export async function saveFileGroupsToIndexedDB(groups: FileGroupItem[]): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.clear();
      groups.forEach((g) => store.put(g));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Tải danh mục tệp đã lưu trong IndexedDB
 */
export async function loadFileGroupsFromIndexedDB(): Promise<FileGroupItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}
