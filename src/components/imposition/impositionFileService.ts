import { ShapeTabItem, PageItem, TAB_COLORS } from './types';
import { ExtractedPdfPage } from '../../utils/pdfPageExtractor';
import { calculateStandardImageDimensionsMm } from '../../utils/imageDimensions';
import { createClientThumbnail } from '../../utils/imageThumbnail';
import {
  saveFileGroupsToIndexedDB,
  loadFileGroupsFromIndexedDB,
} from './impositionStorageIndexedDB';

export interface FileGroupItem {
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'shape';
  layerCount: number;
  tabs: ShapeTabItem[];
  thumbUrl?: string | null;
  dimensionsText?: string;
  hasActiveLayer: boolean;
}

export const getTabLetter = (index: number): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < 26) return letters[index];
  return `${letters[Math.floor(index / 26) - 1]}${letters[index % 26]}`;
};

/**
 * Gom nhóm danh sách ShapeTabItem thành các TỆP gốc (File)
 * Chỉ hiển thị tệp ở cấp cao nhất, đếm số layer tương ứng bên dưới
 */
export function groupTabsByFile(
  shapeTabs: ShapeTabItem[],
  activeTabId: string
): FileGroupItem[] {
  const groupsMap = new Map<string, FileGroupItem>();

  shapeTabs.forEach((tab) => {
    let fileId = tab.fileId;
    let fileName = tab.fileName;
    let fileType: 'pdf' | 'image' | 'shape' = tab.fileType || 'shape';

    if (!fileId) {
      if (tab.sourceImage) {
        const rawName = tab.sourceImage.name || 'Tệp tải lên';
        const pdfMatch = rawName.match(/^(.*?)(?:\s*-\s*Trang\s+\d+)?$/i);
        const baseName = pdfMatch && pdfMatch[1] ? pdfMatch[1].trim() : rawName;
        const isPdf = rawName.includes('Trang ') || rawName.toLowerCase().endsWith('.pdf');
        fileId = `file-${isPdf ? 'pdf' : 'img'}-${baseName}`;
        fileName = isPdf ? `${baseName}.pdf` : baseName;
        fileType = isPdf ? 'pdf' : 'image';
      } else {
        fileId = 'shape-default';
        fileName = 'Khung tem mặc định';
        fileType = 'shape';
      }
    }

    if (!groupsMap.has(fileId)) {
      const thumbUrl = tab.sourceImage?.thumb || (typeof tab.sourceImage === 'string' ? tab.sourceImage : null);
      groupsMap.set(fileId, {
        fileId,
        fileName: fileName || 'Tệp không tên',
        fileType,
        layerCount: 0,
        tabs: [],
        thumbUrl,
        dimensionsText: `${tab.itemW} × ${tab.itemH} mm`,
        hasActiveLayer: false,
      });
    }

    const group = groupsMap.get(fileId)!;
    group.layerCount += 1;
    group.tabs.push(tab);
    if (tab.id === activeTabId) {
      group.hasActiveLayer = true;
    }
    if (!group.thumbUrl && tab.sourceImage?.thumb) {
      group.thumbUrl = tab.sourceImage.thumb;
    }
  });

  return Array.from(groupsMap.values());
}

/**
 * Xử lý nạp ảnh đơn lẻ & trích xuất kích thước mm
 */
export function processImageFile(file: File): Promise<{
  pageItem: PageItem;
  widthMm: number;
  heightMm: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const dims = await calculateStandardImageDimensionsMm(img.naturalWidth, img.naturalHeight, file);
        const thumbUrl = (await createClientThumbnail(img, 320, 0.8)) || dataUrl;
        const pageItem: PageItem = {
          fileIndex: 0,
          pageIndex: 1,
          thumb: thumbUrl,
          originalThumb: dataUrl,
          baseThumb: thumbUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          w: dims.w,
          h: dims.h,
          rotation: 0,
        };
        resolve({ pageItem, widthMm: dims.w, heightMm: dims.h });
      };
      img.onerror = () => reject(new Error(`Không thể nạp ảnh ${file.name}`));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error(`Không thể đọc file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Tạo danh sách ShapeTabItem từ các trang PDF đã trích xuất
 */
export function createShapeTabsFromPdfPages(
  pdfPages: ExtractedPdfPage[],
  fileId: string,
  fileName: string,
  startTabIndex: number
): { tabs: ShapeTabItem[]; pages: PageItem[] } {
  const tabs: ShapeTabItem[] = [];
  const pages: PageItem[] = [];

  pdfPages.forEach((p, idx) => {
    const pageItem: PageItem = {
      fileIndex: idx,
      pageIndex: p.pageIndex,
      thumb: p.thumbUrl,
      originalThumb: p.dataUrl,
      baseThumb: p.thumbUrl,
      name: p.name,
      w: p.widthMm,
      h: p.heightMm,
      rotation: 0,
    };
    pages.push(pageItem);

    const tabIndex = startTabIndex + tabs.length;
    const letter = getTabLetter(tabIndex);
    const color = TAB_COLORS[tabIndex % TAB_COLORS.length] || '#8b5cf6';
    const tabId = `tab-pdf-${Date.now()}-${p.pageIndex}-${Math.random().toString(36).substring(2, 6)}`;

    tabs.push({
      id: tabId,
      name: letter,
      enabled: true,
      shape: 'rect',
      itemW: p.widthMm,
      itemH: p.heightMm,
      quantity: 10,
      useTotalLimit: false,
      cornerRadius: 0,
      sourceImage: pageItem,
      vectorMaskResult: null,
      customSvgData: '',
      color,
      canRotate: true,
      autoRotateImage: true,
      fileId,
      fileName,
      fileType: 'pdf',
    });
  });

  return { tabs, pages };
}

/**
 * Tạo ShapeTabItem từ kết quả xử lý ảnh đơn
 */
export function createShapeTabFromImage(
  res: { pageItem: PageItem; widthMm: number; heightMm: number },
  fileId: string,
  fileName: string,
  tabIndex: number
): { tab: ShapeTabItem; page: PageItem } {
  const letter = getTabLetter(tabIndex);
  const color = TAB_COLORS[tabIndex % TAB_COLORS.length] || '#8b5cf6';
  const tabId = `tab-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const tab: ShapeTabItem = {
    id: tabId,
    name: letter,
    enabled: true,
    shape: 'rect',
    itemW: res.widthMm,
    itemH: res.heightMm,
    quantity: 10,
    useTotalLimit: false,
    cornerRadius: 0,
    sourceImage: res.pageItem,
    vectorMaskResult: null,
    customSvgData: '',
    color,
    canRotate: true,
    autoRotateImage: true,
    fileId,
    fileName,
    fileType: 'image',
  };

  return { tab, page: res.pageItem };
}

const API_BASE = '/api';

/**
 * Tải danh sách tệp in đã lưu bền vững (kết hợp Server & IndexedDB offline-first)
 */
export async function fetchServerFiles(): Promise<FileGroupItem[]> {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/imposition/files`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        saveFileGroupsToIndexedDB(data.files);
        return data.files;
      }
    }
  } catch (err) {
    console.warn('[Storage] Không thể tải danh sách tệp từ server, sử dụng IndexedDB:', err);
  }

  // Fallback bền vững sang IndexedDB
  return loadFileGroupsFromIndexedDB();
}

/**
 * Lưu 1 tệp và các layer của nó bền vững lên server & IndexedDB
 */
export async function saveFileToServer(group: FileGroupItem): Promise<boolean> {
  try {
    loadFileGroupsFromIndexedDB().then((existing) => {
      const next = [group, ...existing.filter((g) => g.fileId !== group.fileId)];
      saveFileGroupsToIndexedDB(next);
    });

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/imposition/files`, {
      method: 'POST',
      headers,
      body: JSON.stringify(group),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Storage] Lỗi khi lưu tệp lên server:', err);
    return false;
  }
}

/**
 * Xóa 1 tệp vĩnh viễn khỏi server & IndexedDB
 */
export async function deleteFileFromServer(fileId: string): Promise<boolean> {
  try {
    loadFileGroupsFromIndexedDB().then((existing) => {
      saveFileGroupsToIndexedDB(existing.filter((g) => g.fileId !== fileId));
    });

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/imposition/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('[Storage] Lỗi khi xóa tệp trên server:', err);
    return false;
  }
}

/**
 * Đồng bộ toàn bộ danh sách tệp in lên server & IndexedDB
 */
export async function syncFilesToServer(groups: FileGroupItem[]): Promise<boolean> {
  try {
    saveFileGroupsToIndexedDB(groups);

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/imposition/files/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files: groups }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Storage] Lỗi khi đồng bộ tệp lên server:', err);
    return false;
  }
}
