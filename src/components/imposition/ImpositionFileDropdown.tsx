import React, { useState, useRef, useMemo } from 'react';
import {
  FolderOpen,
  UploadCloud,
  Trash2,
  ChevronDown,
  Layers,
  FileText,
  Image as ImageIcon,
  Loader2,
  Shapes
} from 'lucide-react';
import { ShapeTabItem, ImpositionConfig, PageItem } from './types';
import { safeToastSuccess, safeToastError, safeToastInfo } from './impositionHelpers';
import { extractPdfPages, isPdfFile, inspectPdfMetadata } from '../../utils/pdfPageExtractor';
import {
  groupTabsByFile,
  processImageFile,
  createShapeTabsFromPdfPages,
  createShapeTabFromImage,
  FileGroupItem
} from './impositionFileService';
import {
  ImpositionLargeFileModal,
  LargeFilePromptData,
  LargeFileChoice
} from './modals/ImpositionLargeFileModal';
import { useWindowFileDrop } from './useWindowFileDrop';

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
  const [largeFilePrompt, setLargeFilePrompt] = useState<LargeFilePromptData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptResolverRef = useRef<((choice: LargeFileChoice) => void) | null>(null);

  // Gom nhóm danh sách ShapeTabItem thành các TỆP (chỉ hiển thị tệp ở cấp cao nhất)
  const fileGroups = useMemo<FileGroupItem[]>(() => {
    return groupTabsByFile(shapeTabs, activeTabId);
  }, [shapeTabs, activeTabId]);

  // Hàm chờ người dùng chọn phương án xử lý tệp nặng / nhiều trang
  const requestLargeFileChoice = (data: LargeFilePromptData): Promise<LargeFileChoice> => {
    return new Promise((resolve) => {
      promptResolverRef.current = resolve;
      setLargeFilePrompt(data);
    });
  };

  const handleLargeFileChoice = (choice: LargeFileChoice) => {
    if (promptResolverRef.current) {
      promptResolverRef.current(choice);
      promptResolverRef.current = null;
    }
    setLargeFilePrompt(null);
  };

  // Xử lý nạp nhiều file cùng lúc (PDF nhiều trang & hình ảnh)
  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessStatus('Đang đọc các tệp...');

    try {
      let accumulatedTabs: ShapeTabItem[] = [];
      let accumulatedPages: PageItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessStatus(`Đang kiểm tra ${file.name} (${i + 1}/${files.length})...`);

        if (isPdfFile(file)) {
          // 1. Kiểm tra nhanh metadata (số trang & dung lượng)
          const meta = await inspectPdfMetadata(file);
          let startPage = 1;
          let maxPages: number | undefined = undefined;

          // Cảnh báo nếu số trang > 10 hoặc file nặng (>= 15MB) có nhiều hơn 1 trang
          if (meta.numPages > 10 || (meta.sizeBytes >= 15 * 1024 * 1024 && meta.numPages > 1)) {
            setProcessStatus(`Chờ lựa chọn cho tệp ${file.name}...`);
            const choice = await requestLargeFileChoice({
              file,
              numPages: meta.numPages,
              sizeBytes: meta.sizeBytes,
            });

            if (choice.mode === 'skip') {
              safeToastInfo(`Đã bỏ qua tệp "${file.name}"`);
              continue;
            } else if (choice.mode === 'batch_10') {
              startPage = choice.startPage || 1;
              maxPages = 10;
            }
            // choice.mode === 'all': giữ nguyên startPage = 1, maxPages = undefined
          }

          setProcessStatus(`Đang trích xuất trang cho ${file.name}...`);
          const pdfPages = await extractPdfPages(file, {
            fileName: file.name,
            startPage,
            maxPages,
            onProgress: (curr, total) => {
              setProcessStatus(`Đang trích xuất ${file.name} (trang ${curr}/${total})...`);
            },
          });

          if (pdfPages.length === 0) continue;

          const pdfFileId = `file-pdf-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`;
          const currentTotalTabs = shapeTabs.length + accumulatedTabs.length;
          const { tabs, pages } = createShapeTabsFromPdfPages(pdfPages, pdfFileId, file.name, currentTotalTabs);

          accumulatedTabs = [...accumulatedTabs, ...tabs];
          accumulatedPages = [...accumulatedPages, ...pages];
        } else if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.svg')) {
          setProcessStatus(`Đang nạp ảnh ${file.name}...`);
          const res = await processImageFile(file);
          const imgFileId = `file-img-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`;
          const currentTotalTabs = shapeTabs.length + accumulatedTabs.length;
          const { tab, page } = createShapeTabFromImage(res, imgFileId, file.name, currentTotalTabs);

          accumulatedTabs.push(tab);
          accumulatedPages.push(page);
        }
      }

      if (accumulatedTabs.length === 0) {
        return;
      }

      // Kiểm tra nếu Tab A ban đầu còn trống -> thay thế Tab A bằng trang đầu tiên
      const isFirstTabEmpty = shapeTabs.length === 1 && !shapeTabs[0].sourceImage;
      let nextTabs: ShapeTabItem[];

      if (isFirstTabEmpty) {
        const first = accumulatedTabs[0];
        const rest = accumulatedTabs.slice(1);
        const replacedFirst: ShapeTabItem = {
          ...shapeTabs[0],
          name: 'A',
          shape: 'rect',
          itemW: first.itemW,
          itemH: first.itemH,
          sourceImage: first.sourceImage,
          color: shapeTabs[0].color || '#8b5cf6',
          fileId: first.fileId,
          fileName: first.fileName,
          fileType: first.fileType,
        };
        nextTabs = [replacedFirst, ...rest];
        setConfig((c) => ({ ...c, itemW: first.itemW, itemH: first.itemH }));
        setActiveTabId(replacedFirst.id);
      } else {
        nextTabs = [...shapeTabs, ...accumulatedTabs];
        setActiveTabId(accumulatedTabs[0].id);
      }

      setShapeTabs(nextTabs);
      setAllPages((prev) => [...prev, ...accumulatedPages]);
      safeToastSuccess(`Đã nạp thành công ${accumulatedTabs.length} layer!`);
    } catch (err: any) {
      console.error('Lỗi khi nạp tệp:', err);
      safeToastError(`Lỗi khi nạp tệp: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Hỗ trợ kéo thả tệp từ ngoài Desktop vào bất cứ vị trí nào trên cửa sổ trình duyệt
  const isWindowDragging = useWindowFileDrop((files) => {
    handleProcessFiles(files);
  });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
    }
  };

  // Xóa toàn bộ file và các layer thuộc file đó
  const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const group = fileGroups.find((g) => g.fileId === fileId);
    if (!group) return;

    const tabIdsToDelete = new Set(group.tabs.map((t) => t.id));
    const remainingTabs = shapeTabs.filter((t) => !tabIdsToDelete.has(t.id));

    if (remainingTabs.length === 0) {
      setShapeTabs([
        {
          id: `tab-${Date.now()}`,
          name: 'A',
          enabled: true,
          shape: 'rect',
          itemW: config.itemW || 90,
          itemH: config.itemH || 54,
          quantity: 10,
          useTotalLimit: false,
          cornerRadius: 0,
          sourceImage: null,
          vectorMaskResult: null,
          customSvgData: '',
          color: '#8b5cf6',
          canRotate: true,
          autoRotateImage: true,
          fileId: 'shape-default',
          fileName: 'Khung tem mặc định',
          fileType: 'shape',
        },
      ]);
      safeToastSuccess(`Đã xóa tệp "${group.fileName}"`);
      return;
    }

    setShapeTabs(remainingTabs);
    if (group.hasActiveLayer && remainingTabs.length > 0) {
      setActiveTabId(remainingTabs[0].id);
    }
    safeToastSuccess(`Đã xóa tệp "${group.fileName}" (${group.layerCount} layer)`);
  };

  return (
    <>
      {/* Modal cảnh báo tệp nhiều trang & dung lượng lớn */}
      <ImpositionLargeFileModal
        isOpen={Boolean(largeFilePrompt)}
        data={largeFilePrompt}
        onChoice={handleLargeFileChoice}
        onClose={() => handleLargeFileChoice({ mode: 'skip' })}
      />

      {/* Overlay khi kéo tệp từ máy tính vào toàn màn hình */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-[150] bg-violet-900/60 backdrop-blur-xs border-4 border-dashed border-white flex flex-col items-center justify-center text-white pointer-events-none animate-fadeIn select-none">
          <UploadCloud size={64} className="animate-bounce mb-3 text-violet-200" />
          <h2 className="text-xl font-bold tracking-wide">Thả tệp vào đây để nạp vào Bình trang</h2>
          <p className="text-sm text-violet-200 mt-1">Hỗ trợ PDF nhiều trang, PNG, JPG, SVG</p>
        </div>
      )}

      <div className="relative" onClick={(e) => e.stopPropagation()}>
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
          title="Quản lý danh mục tệp in (Hỗ trợ tải nhiều file, PDF đa trang)"
        >
          <FolderOpen size={15} className="text-violet-200" />
          <span className="font-semibold">Danh mục file</span>
          <span className="bg-violet-500/80 text-white px-1.5 py-0.2 text-[10px] rounded-full font-bold shadow-2xs">
            {fileGroups.length} {fileGroups.length === 1 ? 'tệp' : 'tệp'}
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
                <FolderOpen size={16} className="text-violet-600" />
                <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">
                  Danh mục Tệp in ({fileGroups.length})
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

            {/* Vùng Kéo thả tải file */}
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
                    Hỗ trợ <b>PDF nhiều trang</b> (cảnh báo tệp lớn, tách 10 trang), PNG, JPG, SVG
                  </p>
                </>
              )}
            </div>

            {/* Danh sách các TỆP (chỉ hiển thị tệp, bên dưới hiển thị số layer) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-3 pb-2">
              {fileGroups.map((group) => {
                return (
                  <div
                    key={group.fileId}
                    onClick={() => {
                      if (group.tabs.length > 0) {
                        setActiveTabId(group.tabs[0].id);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group my-1 ${
                      group.hasActiveLayer
                        ? 'bg-violet-50/90 border border-violet-200 shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Thumbnail hoặc Icon đại diện cho tệp */}
                      <div className="relative w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                        {group.thumbUrl ? (
                          <img src={group.thumbUrl} alt="" className="w-full h-full object-contain" />
                        ) : group.fileType === 'pdf' ? (
                          <FileText size={22} className="text-red-500" />
                        ) : group.fileType === 'image' ? (
                          <ImageIcon size={22} className="text-blue-500" />
                        ) : (
                          <Shapes size={22} className="text-violet-500" />
                        )}

                        {group.fileType === 'pdf' && (
                          <span className="absolute bottom-0 right-0 bg-red-600 text-[8px] text-white font-bold px-1 rounded-tl-xs">
                            PDF
                          </span>
                        )}
                      </div>

                      {/* Thông tin Tệp & số lượng Layer bên dưới */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800 truncate" title={group.fileName}>
                            {group.fileName}
                          </span>
                          {group.hasActiveLayer && (
                            <span className="text-[10px] bg-violet-600 text-white font-medium px-1.5 py-0.2 rounded-full flex-shrink-0">
                              Đang chọn
                            </span>
                          )}
                        </div>

                        {/* BÊN DƯỚI MỖI FILE HIỆN RA CÓ BAO NHIÊU LAYER */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="inline-flex items-center gap-1 font-medium text-violet-700 bg-violet-100/80 px-1.5 py-0.2 rounded-md text-[10px]">
                            <Layers size={10} className="text-violet-600" />
                            {group.layerCount} {group.layerCount > 1 ? 'layers' : 'layer'}
                          </span>
                          {group.dimensionsText && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-500">{group.dimensionsText}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nút xóa tệp */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFile(group.fileId, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title={`Xóa tệp "${group.fileName}" (${group.layerCount} layer)`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer thông tin */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span>Tổng số:</span>
                <b className="text-slate-700">{fileGroups.length} tệp</b>
                <span>•</span>
                <b className="text-violet-700">{shapeTabs.length} layer</b>
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
    </>
  );
};
