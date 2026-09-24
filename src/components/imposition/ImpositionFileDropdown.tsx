import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  UploadCloud,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Layers,
  FileText,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';
import { ShapeTabItem, ImpositionConfig, PageItem, TAB_COLORS } from './types';
import { safeToastSuccess, safeToastError } from './impositionHelpers';
import { extractPdfPages, isPdfFile } from '../../utils/pdfPageExtractor';
import { calculateStandardImageDimensionsMm } from '../../utils/imageDimensions';
import { createClientThumbnail } from '../../utils/imageThumbnail';

export interface ImpositionFileDropdownProps {
  shapeTabs: ShapeTabItem[];
  setShapeTabs: React.Dispatch<React.SetStateAction<ShapeTabItem[]>>;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  allPages: PageItem[];
  setAllPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
}

export const ImpositionFileDropdown: React.FC<ImpositionFileDropdownProps> = ({
  shapeTabs,
  setShapeTabs,
  activeTabId,
  setActiveTabId,
  config,
  setConfig,
  allPages,
  setAllPages,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper sinh ký tự A, B, C...
  const getTabLetter = (index: number): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (index < 26) return letters[index];
    return `${letters[Math.floor(index / 26) - 1]}${letters[index % 26]}`;
  };

  // Xử lý nạp ảnh đơn lẻ
  const processImageFile = (file: File): Promise<{
    pageItem: PageItem;
    widthMm: number;
    heightMm: number;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = async () => {
          const dims = await calculateStandardImageDimensionsMm(img.naturalWidth, img.naturalHeight, file);
          const thumbUrl = await createClientThumbnail(img, 320, 0.8) || dataUrl;
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
  };

  // Xử lý tải lên nhiều file cùng lúc (PDF nhiều trang & ảnh)
  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessStatus('Đang đọc các tệp...');

    try {
      const generatedTabs: ShapeTabItem[] = [];
      const generatedPages: PageItem[] = [];
      let totalExtractedPages = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessStatus(`Đang xử lý ${file.name} (${i + 1}/${files.length})...`);

        if (isPdfFile(file)) {
          // Trích xuất PDF nhiều trang
          const pdfPages = await extractPdfPages(file);
          if (pdfPages.length === 0) continue;

          pdfPages.forEach((p) => {
            totalExtractedPages++;
            const pageItem: PageItem = {
              fileIndex: generatedPages.length,
              pageIndex: p.pageIndex,
              thumb: p.thumbUrl,
              originalThumb: p.dataUrl,
              baseThumb: p.thumbUrl,
              name: p.name,
              w: p.widthMm,
              h: p.heightMm,
              rotation: 0,
            };
            generatedPages.push(pageItem);

            const tabIndex = shapeTabs.length + generatedTabs.length;
            const letter = getTabLetter(tabIndex);
            const color = TAB_COLORS[tabIndex % TAB_COLORS.length] || '#8b5cf6';
            const tabId = `tab-pdf-${Date.now()}-${p.pageIndex}-${Math.random().toString(36).substring(2, 6)}`;

            generatedTabs.push({
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
            });
          });
        } else if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.svg')) {
          // Tệp ảnh PNG, JPG, SVG, WEBP...
          const res = await processImageFile(file);
          generatedPages.push(res.pageItem);

          const tabIndex = shapeTabs.length + generatedTabs.length;
          const letter = getTabLetter(tabIndex);
          const color = TAB_COLORS[tabIndex % TAB_COLORS.length] || '#8b5cf6';
          const tabId = `tab-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          generatedTabs.push({
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
          });
        }
      }

      if (generatedTabs.length === 0) {
        safeToastError('Không tìm thấy trang PDF hoặc ảnh hợp lệ nào!');
        return;
      }

      // Kiểm tra nếu Tab A ban đầu còn trống (chưa có sourceImage) -> thay thế Tab A bằng mục đầu tiên
      const isFirstTabEmpty = shapeTabs.length === 1 && !shapeTabs[0].sourceImage;

      let nextTabs: ShapeTabItem[];
      if (isFirstTabEmpty) {
        const first = generatedTabs[0];
        const rest = generatedTabs.slice(1);
        const replacedFirst: ShapeTabItem = {
          ...shapeTabs[0],
          name: 'A',
          shape: 'rect',
          itemW: first.itemW,
          itemH: first.itemH,
          sourceImage: first.sourceImage,
          color: shapeTabs[0].color || '#8b5cf6',
        };
        nextTabs = [replacedFirst, ...rest];
        setConfig((c) => ({ ...c, itemW: first.itemW, itemH: first.itemH }));
        setActiveTabId(replacedFirst.id);
      } else {
        nextTabs = [...shapeTabs, ...generatedTabs];
        setActiveTabId(generatedTabs[0].id);
      }

      setShapeTabs(nextTabs);
      setAllPages((prev) => [...prev, ...generatedPages]);

      safeToastSuccess(`Đã nạp thành công ${generatedTabs.length} layer (${files.length} tệp)!`);
    } catch (err: any) {
      console.error('Lỗi khi nạp nhiều tệp:', err);
      safeToastError(`Lỗi khi nạp tệp: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
    }
  };

  const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (shapeTabs.length <= 1) {
      // Nếu chỉ còn 1 tab, xóa nội dung ảnh thay vì xóa hẳn tab
      setShapeTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, sourceImage: null } : t)));
      safeToastSuccess('Đã xóa tệp khỏi Layer');
      return;
    }

    setShapeTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId && filtered.length > 0) {
        setActiveTabId(filtered[0].id);
      }
      return filtered;
    });
    safeToastSuccess('Đã xóa Layer');
  };

  const activeTab = shapeTabs.find((t) => t.id === activeTabId) || shapeTabs[0];
  const totalLayersCount = shapeTabs.length;
  const loadedFilesCount = shapeTabs.filter((t) => t.sourceImage !== null).length;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Ẩn input file nhận chọn nhiều tệp */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.svg"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Nút Trigger Dropdown Danh mục file */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/20 rounded-xl text-xs font-medium backdrop-blur-sm transition-all shadow-xs cursor-pointer select-none"
        title="Quản lý danh mục tệp in, PDF nhiều trang và các Layer"
      >
        <FolderOpen size={15} className="text-violet-200" />
        <span className="font-semibold">Danh mục file</span>
        <span className="bg-violet-500/80 text-white px-1.5 py-0.2 text-[10px] rounded-full font-bold shadow-2xs">
          {loadedFilesCount > 0 ? `${loadedFilesCount} tệp` : `${totalLayersCount} layer`}
        </span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100] text-slate-800 animate-fadeIn select-none flex flex-col"
          style={{ maxHeight: '520px' }}
        >
          {/* Header của Popup */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-violet-600" />
              <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">
                Danh mục Tệp in & Layer ({shapeTabs.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud size={13} />
              <span>Tải thêm tệp</span>
            </button>
          </div>

          {/* Vùng Drag & Drop tải file nhanh */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleProcessFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`m-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 ${
              isDragOver
                ? 'border-violet-500 bg-violet-50/80 scale-[1.01]'
                : 'border-slate-300 hover:border-violet-400 bg-slate-50/60 hover:bg-violet-50/30'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2 text-violet-700 py-1">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium">{processStatus || 'Đang xử lý tệp...'}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-violet-600">
                  <UploadCloud size={18} />
                  <span className="text-xs font-bold">Kéo thả nhiều file PDF / Ảnh vào đây</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Hỗ trợ <b>PDF nhiều trang</b> (tự động phân thành các Layer riêng), PNG, JPG, SVG
                </p>
              </>
            )}
          </div>

          {/* Danh sách các Layer / Tệp đã nạp */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-3 pb-2">
            {shapeTabs.map((tab, idx) => {
              const isSelected = tab.id === activeTabId;
              const hasImage = Boolean(tab.sourceImage);
              const thumbUrl = tab.sourceImage?.thumb || (typeof tab.sourceImage === 'string' ? tab.sourceImage : null);
              const titleName = tab.sourceImage?.name || `Layer ${tab.name} (${tab.shape})`;

              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group my-1 ${
                    isSelected
                      ? 'bg-violet-50 border border-violet-200 shadow-2xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Badge Layer A, B, C */}
                    <span
                      className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-2xs flex-shrink-0"
                      style={{ backgroundColor: tab.color || '#8b5cf6' }}
                    >
                      {tab.name}
                    </span>

                    {/* Thumbnail preview */}
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-xs"
                          style={{ backgroundColor: `${tab.color || '#8b5cf6'}30`, border: `1px solid ${tab.color || '#8b5cf6'}` }}
                        />
                      )}
                    </div>

                    {/* Thông tin tên file, kích thước */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate" title={titleName}>
                          {titleName}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-violet-600 text-white font-medium px-1.5 py-0.2 rounded-full flex-shrink-0">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>
                          {tab.itemW} × {tab.itemH} mm
                        </span>
                        <span>•</span>
                        <span>{tab.quantity || 1} con tem</span>
                      </div>
                    </div>
                  </div>

                  {/* Nút xóa layer/tệp */}
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTab(tab.id, e)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title={hasImage ? 'Xóa ảnh / Layer này' : 'Xóa Layer'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer thông tin */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {shapeTabs.length > 1 ? '✨ Đa hình (Multi-shape) đang bật' : 'Chế độ đơn hình'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-violet-600 font-semibold hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
