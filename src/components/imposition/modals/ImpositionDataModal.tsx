import React from 'react';
import {
  X,
  Layers,
  Grid3X3,
  RotateCw,
  Upload,
  FolderOpen,
  ZoomIn,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { ImpositionConfig, PageItem, DataMode } from '../types';

export interface ImpositionDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataModeEnabled: boolean;
  setDataModeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  dataMode: DataMode;
  setDataMode: React.Dispatch<React.SetStateAction<DataMode>> | ((mode: DataMode) => void);
  standardQty: number;
  setStandardQty: (qty: number) => void;
  xUpQty: number;
  setXUpQty: (qty: number) => void;
  impositionStyleEnabled: boolean;
  setImpositionStyleEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  impositionStyle: 'sheetwise' | 'work-and-turn' | 'work-and-tumble';
  setImpositionStyle: (style: 'sheetwise' | 'work-and-turn' | 'work-and-tumble') => void;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  skipThumbnails: boolean;
  setSkipThumbnails: (skip: boolean) => void;
  handleMultiFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setIsFilePickerOpen: (open: boolean) => void;
  uploadProgress: { show: boolean; current: number; total: number; percent: number };
  allPages: PageItem[];
  setAllPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  rotateAllPages: (dir: 'left' | 'right' | 'auto') => void;
  rotatePage: (index: number, dir: 'left' | 'right') => void;
  removePage: (index: number) => void;
  config: ImpositionConfig;
  backgroundColor: string;
  previewKey: number;
  setLightboxImage: (img: string | null) => void;
  setIsLightboxOpen: (open: boolean) => void;
}

export const ImpositionDataModal: React.FC<ImpositionDataModalProps> = ({
  isOpen,
  onClose,
  dataModeEnabled,
  setDataModeEnabled,
  dataMode,
  setDataMode,
  standardQty,
  setStandardQty,
  xUpQty,
  setXUpQty,
  impositionStyleEnabled,
  setImpositionStyleEnabled,
  impositionStyle,
  setImpositionStyle,
  setConfig,
  skipThumbnails,
  setSkipThumbnails,
  handleMultiFileUpload,
  setIsFilePickerOpen,
  uploadProgress,
  allPages,
  setAllPages,
  rotateAllPages,
  rotatePage,
  removePage,
  config,
  backgroundColor,
  previewKey,
  setLightboxImage,
  setIsLightboxOpen
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-medium text-lg text-pink-700">Quản lý & Biến đổi Dữ liệu</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Data Modes */}
          <div className="w-1/3 p-4 border-r overflow-y-auto">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center justify-between">
              Biến đổi dữ liệu
              <button
                type="button"
                onClick={() => setDataModeEnabled(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${dataModeEnabled ? 'bg-pink-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dataModeEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </h4>
            <div className={`space-y-3 ${!dataModeEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
              {/* Mode 1: Standard */}
              <div
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 1 ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`}
                onClick={() => setDataMode(1)}
              >
                <div className="flex items-center gap-3">
                  <Layers size={24} className="text-gray-500" />
                  <div>
                    <div className="font-medium text-sm">Standard (1→2→3)</div>
                    <div className="text-[10px] text-gray-500">Sắp xếp theo nhóm (AABBCC...)</div>
                  </div>
                </div>
                {dataMode === 1 && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <label className="text-xs font-medium">Số lượng bộ:</label>
                    <input
                      type="number"
                      min="1"
                      value={standardQty}
                      onChange={e => setStandardQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 border rounded px-2 py-1 text-center text-sm font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Mode 4: X-Up */}
              <div
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 4 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                onClick={() => setDataMode(4)}
              >
                <div className="flex items-center gap-3">
                  <Grid3X3 size={24} className="text-blue-500" />
                  <div>
                    <div className="font-medium text-sm">Step & Repeat (X-Up)</div>
                    <div className="text-[10px] text-gray-500">Lặp lại từng file để tràn trang</div>
                  </div>
                </div>
                {dataMode === 4 && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <label className="text-xs font-medium">Số lượng X-Up:</label>
                    <input
                      type="number"
                      min="1"
                      value={xUpQty}
                      onChange={e => setXUpQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 border rounded px-2 py-1 text-center text-sm font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Mode 6: Đối xứng */}
              <div
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 6 ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                onClick={() => { setDataMode(6); setConfig(c => ({ ...c, is2Sided: true })); }}
              >
                <div className="flex items-center gap-3">
                  <RotateCw size={24} className="text-green-500" />
                  <div>
                    <div className="font-medium text-sm">Biến đổi Đối xứng</div>
                    <div className="text-[10px] text-gray-500">Dùng cho số nhảy, ID (In 2 mặt)</div>
                  </div>
                </div>
              </div>

              {/* Mode 5: 2 Mặt Giống */}
              <div
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 5 ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
                onClick={() => { setDataMode(5); setConfig(c => ({ ...c, is2Sided: true })); }}
              >
                <div className="flex items-center gap-3">
                  <Layers size={24} className="text-purple-500" />
                  <div>
                    <div className="font-medium text-sm">2 Mặt Giống (Card Visit)</div>
                    <div className="text-[10px] text-gray-500">Mặt trước và sau dùng chung dữ liệu</div>
                  </div>
                </div>
              </div>

              {/* Kiểu trở (Imposition Style) */}
              <h4 className="text-xs font-medium text-gray-500 uppercase mt-4 mb-3 flex items-center justify-between">
                Kiểu trở
                <button
                  type="button"
                  onClick={() => setImpositionStyleEnabled(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${impositionStyleEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${impositionStyleEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </h4>
              <div className={`${!impositionStyleEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div
                  className={`p-3 rounded-lg border-2 cursor-pointer transition ${impositionStyle === 'sheetwise' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}
                  onClick={() => setImpositionStyle('sheetwise')}
                >
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/><text x="6.5" y="13" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">A</text><text x="17.5" y="13" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">B</text></svg>
                    <div>
                      <div className="font-medium text-sm">Sheetwise (In AB)</div>
                      <div className="text-[10px] text-gray-500">Mặt trước/sau in riêng biệt</div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border-2 cursor-pointer transition mt-2 ${impositionStyle === 'work-and-turn' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}
                  onClick={() => setImpositionStyle('work-and-turn')}
                >
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2,1"/><path d="M8 10l-2 2 2 2" strokeWidth="1.5"/><path d="M16 10l2 2-2 2" strokeWidth="1.5"/></svg>
                    <div>
                      <div className="font-medium text-sm">Work & Turn (Tự trở)</div>
                      <div className="text-[10px] text-gray-500">Lật qua trục dọc, front+back cùng mặt</div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border-2 cursor-pointer transition mt-2 ${impositionStyle === 'work-and-tumble' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}
                  onClick={() => setImpositionStyle('work-and-tumble')}
                >
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2,1"/><path d="M10 8l2-2 2 2" strokeWidth="1.5"/><path d="M10 16l2 2 2-2" strokeWidth="1.5"/></svg>
                    <div>
                      <div className="font-medium text-sm">Work & Tumble (Trở nhíp)</div>
                      <div className="text-[10px] text-gray-500">Lật qua trục ngang, front+back cùng mặt</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: File List */}
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Quản lý dữ liệu</h4>
            
            {/* Upload Area */}
            <label className="flex items-center gap-2 mb-2 cursor-pointer select-none text-xs text-gray-600">
              <input type="checkbox" checked={skipThumbnails} onChange={e => setSkipThumbnails(e.target.checked)} className="w-3.5 h-3.5" />
              <span>Upload nhanh (bỏ qua thumbnail, phù hợp file nhiều trang)</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-pink-400 cursor-pointer relative mb-3">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" multiple onChange={handleMultiFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload size={24} className="mx-auto mb-1 text-gray-400" />
              <span className="font-medium text-sm text-pink-600">Kéo thả hoặc nhấn để chọn file (PDF, JPG, PNG, TIFF)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFilePickerOpen(true)}
              className="w-full mb-3 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer"
            >
              <FolderOpen size={16} /> Import từ Quản lý tệp
            </button>

            {/* Upload Progress */}
            {uploadProgress.show && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-700">Đang tải... ({uploadProgress.current}/{uploadProgress.total})</span>
                  <span className="text-blue-700">{uploadProgress.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress.percent}%` }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">Danh sách trang ({allPages.length})</span>
              <div className="flex gap-2">
                {(config.autoRotateImage ?? true) ? (
                  <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-300">
                    ✓ Tự động xoay ảnh đang bật
                  </span>
                ) : (
                  <>
                    <button type="button" onClick={() => rotateAllPages('auto')} className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer">Tự động Xoay</button>
                    <button type="button" onClick={() => rotateAllPages('left')} className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer">Xoay Trái</button>
                    <button type="button" onClick={() => rotateAllPages('right')} className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-200 rounded cursor-pointer">Xoay Phải</button>
                  </>
                )}
                <button type="button" onClick={() => setAllPages([])} className="text-[10px] px-2 py-1 text-red-500 hover:bg-red-50 rounded cursor-pointer">Xóa tất cả</button>
              </div>
            </div>

            {/* Page Grid */}
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-2 border">
              {allPages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Upload size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có file nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {allPages.map((page, idx) => (
                    <div key={`${idx}-${previewKey}`} className="bg-white border rounded overflow-hidden shadow-sm hover:shadow transition group">
                      <div className="h-32 bg-gray-100 flex items-center justify-center relative" style={config.fitMode === 'actual' ? { backgroundColor: backgroundColor } : {}}>
                        <img 
                          src={page.thumb} 
                          alt="" 
                          className="max-w-full max-h-full object-contain" 
                          style={{ transform: `rotate(${page.rotation}deg)` }} 
                          loading="lazy" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                          <button type="button" onClick={() => { setLightboxImage(page.thumb); setIsLightboxOpen(true); }} className="p-1 bg-white rounded hover:bg-gray-100 cursor-pointer"><ZoomIn size={12} /></button>
                          {!(config.autoRotateImage ?? true) && (
                            <button type="button" onClick={() => rotatePage(idx, 'left')} className="p-1 bg-white rounded hover:bg-gray-100 cursor-pointer"><RotateCcw size={12} /></button>
                          )}
                          <button type="button" onClick={() => removePage(idx)} className="p-1 bg-white rounded hover:bg-red-100 text-red-500 cursor-pointer"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="px-1.5 py-1 flex items-center justify-between text-[10px]">
                        <span className="w-4 h-4 bg-pink-500 text-white rounded-full flex items-center justify-center font-medium">{idx + 1}</span>
                        {(config.autoRotateImage ?? true) ? (
                          <span className="text-amber-600 font-medium text-[8px]">AUTO</span>
                        ) : page.rotation !== 0 ? (
                          <span className="text-pink-600 font-medium">{page.rotation}°</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium py-3 rounded-xl cursor-pointer"
          >
            Cập nhật Preview
          </button>
        </div>
      </div>
    </div>
  );
};
