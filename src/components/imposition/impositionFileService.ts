import { ShapeTabItem, PageItem, TAB_COLORS } from './types';
import { extractPdfPages, isPdfFile } from '../../utils/pdfPageExtractor';
import { calculateStandardImageDimensionsMm } from '../../utils/imageDimensions';
import { createClientThumbnail } from '../../utils/imageThumbnail';

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
