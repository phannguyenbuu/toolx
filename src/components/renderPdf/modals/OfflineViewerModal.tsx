import React, { useState } from 'react';
import {
  X,
  Monitor,
  Upload,
  Sparkles,
  Palette,
  Download,
  Copy,
  Check,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { OfflinePageMeta } from '../types';
import { RenderColorProfile } from '../../../types/renderProfile';
import { OfflineSettingsPanel } from './OfflineSettingsPanel';

export interface OfflineViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  offlinePdfDoc: any;
  offlineFileName: string;
  offlineFileSize: string;
  offlineTotalPages: number;
  offlineCurrentPage: number;
  setOfflineCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  offlinePagesMeta: OfflinePageMeta[];
  offlineDpi: 72 | 150 | 300 | 600;
  setOfflineDpi: (dpi: 72 | 150 | 300 | 600) => void;
  offlineZoom: number;
  setOfflineZoom: React.Dispatch<React.SetStateAction<number>>;
  offlineColorMode: 'rgb' | 'cmyk-sim' | 'grayscale';
  setOfflineColorMode: (mode: 'rgb' | 'cmyk-sim' | 'grayscale') => void;
  offlineFormat: 'png' | 'jpeg';
  setOfflineFormat: (fmt: 'png' | 'jpeg') => void;
  offlineJpegQuality: number;
  setOfflineJpegQuality: (q: number) => void;
  offlineTransparentBg: boolean;
  setOfflineTransparentBg: (t: boolean) => void;
  offlineIsRendering: boolean;
  isExportingAllPages: boolean;
  exportProgressText: string;
  offlineCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  offlineFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleOfflineFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  processOfflineFile: (file: File) => Promise<void>;
  handleExportAllPagesCalibrated: () => Promise<void>;
  handleOfflineDownloadSingle: () => void;
  handleOpenColorStudio: (url: string, title?: string) => void;
  handleOpenWithAICheck: (url: string, title?: string) => void;
  setProfileModalOpen: (open: boolean) => void;
  activeProfile: RenderColorProfile;
  isLightMode: boolean;
}

export const OfflineViewerModal: React.FC<OfflineViewerModalProps> = ({
  isOpen,
  onClose,
  offlinePdfDoc,
  offlineFileName,
  offlineFileSize,
  offlineTotalPages,
  offlineCurrentPage,
  setOfflineCurrentPage,
  offlinePagesMeta,
  offlineDpi,
  setOfflineDpi,
  offlineZoom,
  setOfflineZoom,
  offlineColorMode,
  setOfflineColorMode,
  offlineFormat,
  setOfflineFormat,
  offlineJpegQuality,
  setOfflineJpegQuality,
  offlineTransparentBg,
  setOfflineTransparentBg,
  offlineIsRendering,
  isExportingAllPages,
  exportProgressText,
  offlineCanvasRef,
  offlineFileInputRef,
  handleOfflineFileUpload,
  processOfflineFile,
  handleExportAllPagesCalibrated,
  handleOfflineDownloadSingle,
  handleOpenColorStudio,
  handleOpenWithAICheck,
  setProfileModalOpen,
  activeProfile,
  isLightMode
}) => {
  const [isDraggingOffline, setIsDraggingOffline] = useState<boolean>(false);
  const [offlineCopiedToast, setOfflineCopiedToast] = useState<boolean>(false);

  if (!isOpen) return null;

  const themeHeader = isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const themeCard = isLightMode ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800 shadow-lg';
  const themeCardInner = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-950/70 border-slate-850';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';
  const themeInput = isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-750 text-slate-100';

  const curOfflineMeta = offlinePagesMeta.find((m) => m.pageNumber === offlineCurrentPage);

  const handleOfflineCopyToClipboard = () => {
    if (!offlineCanvasRef.current) return;
    try {
      offlineCanvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setOfflineCopiedToast(true);
        setTimeout(() => setOfflineCopiedToast(false), 2000);
      }, 'image/png');
    } catch (e) {
      toast.error('Không thể sao chép ảnh vào Clipboard: ' + e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-7xl h-[94vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
        <div className={`h-12 border-b px-4 flex items-center justify-between gap-3 flex-shrink-0 text-xs ${themeHeader}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Monitor size={16} />
            </div>
            <div>
              <span className="font-bold text-xs">Render Trình Duyệt & Cân Màu Prepress</span>
              <span className={`hidden sm:inline text-[11px] ml-2 ${themeTextMuted}`}>Kết xuất trực tiếp trên máy không cần tải lên server</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
            title="Đóng cửa sổ"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Offline Top Action Bar */}
          <div className={`h-11 border-b px-4 flex items-center justify-between gap-2 flex-shrink-0 text-xs ${themeHeader}`}>
            <div className="flex items-center gap-2">
              <input
                ref={offlineFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.webp,.bmp,image/*"
                className="hidden"
                onChange={handleOfflineFileUpload}
              />
              <button
                onClick={() => offlineFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Upload size={13} />
                <span>{offlinePdfDoc ? 'Chọn tệp khác' : 'Tải lên PDF / Hình ảnh xem trực tiếp'}</span>
              </button>
              {offlineFileName && (
                <span className={`text-xs ${themeTextMuted}`}>
                  {offlineFileName} ({offlineFileSize}) - {offlineTotalPages} trang
                </span>
              )}
            </div>

            {offlinePdfDoc && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (offlineCanvasRef.current) {
                      handleOpenWithAICheck(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                  title="Kiểm tra chất lượng màu sắc trang này bằng AI"
                >
                  <Sparkles size={13} className="text-amber-300 animate-pulse" />
                  <span>Kiểm tra màu bằng AI</span>
                </button>

                <button
                  onClick={() => {
                    if (offlineCanvasRef.current) {
                      handleOpenColorStudio(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${themeBtnSecondary}`}
                >
                  <Palette size={13} className="text-indigo-500" />
                  <span>Chỉnh màu trang này</span>
                </button>

                <button
                  onClick={handleExportAllPagesCalibrated}
                  disabled={isExportingAllPages}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title={`Kết xuất và áp dụng bộ lọc cân màu Profile "${activeProfile.name}" cho toàn bộ ${offlineTotalPages} trang trong file PDF`}
                >
                  <Download size={13} className={isExportingAllPages ? 'animate-spin' : ''} />
                  <span>
                    {isExportingAllPages
                      ? (exportProgressText || 'Đang xuất...')
                      : `Xuất toàn bộ ${offlineTotalPages} trang đã cân màu (PDF)`}
                  </span>
                </button>

                <button
                  onClick={handleOfflineDownloadSingle}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Tải ảnh trang {offlineCurrentPage}</span>
                </button>
                <button
                  onClick={handleOfflineCopyToClipboard}
                  className={`p-1.5 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
                  title="Sao chép ảnh"
                >
                  {offlineCopiedToast ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Main Offline Viewport */}
          <div className="flex-1 flex overflow-hidden">
            {!offlinePdfDoc ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div
                  onClick={() => offlineFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOffline(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOffline(true); }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsDraggingOffline(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOffline(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      await processOfflineFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`max-w-md w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 group ${
                    isDraggingOffline
                      ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/20 scale-[1.01]'
                      : isLightMode
                      ? 'border-slate-300 bg-white hover:bg-slate-50 hover:border-indigo-400'
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-indigo-500'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner pointer-events-none">
                    {isDraggingOffline ? <Upload size={28} className="animate-bounce" /> : <FileText size={28} />}
                  </div>
                  <h3 className={`text-sm font-bold mb-1 pointer-events-none ${isDraggingOffline ? 'text-indigo-500' : (isLightMode ? 'text-slate-900' : 'text-white')}`}>
                    {isDraggingOffline ? 'Thả file PDF vào đây ngay...' : 'Kéo thả file PDF để Render trên trình duyệt'}
                  </h3>
                  <p className={`text-xs mb-4 pointer-events-none ${themeTextMuted}`}>
                    {isDraggingOffline ? 'Hệ thống sẽ tải và kết xuất trang tức thì' : 'Kết xuất tức thời sang PNG/JPEG chất lượng cao mà không cần gửi dữ liệu lên máy chủ.'}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow pointer-events-none">
                    <Upload size={13} />
                    <span>{isDraggingOffline ? 'Thả tệp để tải' : 'Chọn file từ máy tính'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Left Pages Sidebar */}
                <div className={`w-44 border-r flex flex-col overflow-hidden flex-shrink-0 ${themeCardInner}`}>
                  <div className={`p-2.5 border-b flex items-center justify-between text-xs font-semibold ${isLightMode ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-300'}`}>
                    <span>Trang PDF</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isLightMode ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'}`}>
                      {offlineTotalPages}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {offlinePagesMeta.map((meta) => {
                      const isSelected = meta.pageNumber === offlineCurrentPage;
                      return (
                        <div
                          key={meta.pageNumber}
                          onClick={() => setOfflineCurrentPage(meta.pageNumber)}
                          className={`p-1.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/50'
                              : `${themeCard} hover:border-indigo-400`
                          }`}
                        >
                          <div className="aspect-[3/4] bg-white rounded overflow-hidden flex items-center justify-center relative mb-1 shadow-xs">
                            {meta.thumbnailUrl ? (
                              <img src={meta.thumbnailUrl} alt={`Trang ${meta.pageNumber}`} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] text-slate-400">#{meta.pageNumber}</span>
                            )}
                          </div>
                          <div className={`flex items-center justify-between text-[10px] ${themeTextMuted}`}>
                            <span>Trang {meta.pageNumber}</span>
                            <span>{meta.widthMm}×{meta.heightMm}mm</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Middle Preview Canvas */}
                <div className={`flex-1 flex flex-col overflow-hidden relative ${isLightMode ? 'bg-slate-200/50' : 'bg-slate-950'}`}>
                  <div className={`h-10 border-b px-4 flex items-center justify-between text-xs ${themeHeader}`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setOfflineCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={offlineCurrentPage <= 1}
                        className="p-1 rounded hover:bg-slate-500/20 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span className="font-semibold">Trang {offlineCurrentPage} / {offlineTotalPages}</span>
                      <button
                        onClick={() => setOfflineCurrentPage((p) => Math.min(offlineTotalPages, p + 1))}
                        disabled={offlineCurrentPage >= offlineTotalPages}
                        className="p-1 rounded hover:bg-slate-500/20 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    {curOfflineMeta && (
                      <div className={`hidden sm:block text-[11px] ${themeTextMuted}`}>
                        {curOfflineMeta.widthMm} × {curOfflineMeta.heightMm} mm ({Math.round(curOfflineMeta.widthPt * (offlineDpi / 72))} × {Math.round(curOfflineMeta.heightPt * (offlineDpi / 72))} px)
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setOfflineZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 10) / 10))}
                        className="p-1 rounded hover:bg-slate-500/20 cursor-pointer"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="font-mono text-[11px] min-w-[36px] text-center">{Math.round(offlineZoom * 100)}%</span>
                      <button
                        onClick={() => setOfflineZoom((z) => Math.min(3.0, Math.round((z + 0.1) * 10) / 10))}
                        className="p-1 rounded hover:bg-slate-500/20 cursor-pointer"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                    {offlineIsRendering && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs flex items-center gap-1.5 shadow-lg">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Đang render trang {offlineCurrentPage}...</span>
                      </div>
                    )}
                    <canvas
                      ref={offlineCanvasRef}
                      className={`rounded shadow-2xl max-w-none ${offlineTransparentBg ? 'bg-transparent' : 'bg-white'}`}
                    />
                  </div>
                </div>

                {/* Right Settings */}
                <OfflineSettingsPanel
                  offlineDpi={offlineDpi}
                  setOfflineDpi={setOfflineDpi}
                  offlineColorMode={offlineColorMode}
                  setOfflineColorMode={setOfflineColorMode}
                  offlineFormat={offlineFormat}
                  setOfflineFormat={setOfflineFormat}
                  offlineJpegQuality={offlineJpegQuality}
                  setOfflineJpegQuality={setOfflineJpegQuality}
                  offlineTransparentBg={offlineTransparentBg}
                  setOfflineTransparentBg={setOfflineTransparentBg}
                  offlineCanvasRef={offlineCanvasRef}
                  offlineFileName={offlineFileName}
                  offlineCurrentPage={offlineCurrentPage}
                  offlineTotalPages={offlineTotalPages}
                  isExportingAllPages={isExportingAllPages}
                  exportProgressText={exportProgressText}
                  handleExportAllPagesCalibrated={handleExportAllPagesCalibrated}
                  handleOpenColorStudio={handleOpenColorStudio}
                  handleOpenWithAICheck={handleOpenWithAICheck}
                  setProfileModalOpen={setProfileModalOpen}
                  isLightMode={isLightMode}
                  themeCard={themeCard}
                  themeTextMuted={themeTextMuted}
                  themeBtnSecondary={themeBtnSecondary}
                  themeInput={themeInput}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
