import React from 'react';
import { X, Download, Palette, CheckCircle } from 'lucide-react';
import { RenderSuccessModalState } from '../types';

export interface RenderPdfSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  renderSuccessModal: RenderSuccessModalState;
  triggerFileDownload: (url: string, filename: string, isPdf: boolean) => Promise<void>;
  onOpenColorStudio: (url: string, filename: string) => void;
  isLightMode: boolean;
}

export const RenderPdfSuccessModal: React.FC<RenderPdfSuccessModalProps> = ({
  isOpen,
  onClose,
  renderSuccessModal,
  triggerFileDownload,
  onOpenColorStudio,
  isLightMode
}) => {
  if (!isOpen) return null;

  const themeCard = isLightMode ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800 shadow-lg';
  const themeTextHead = isLightMode ? 'text-slate-900 font-semibold tracking-tight' : 'text-white font-semibold tracking-tight';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-5 overflow-hidden ${themeCard}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${themeTextHead}`}>Kết xuất thành công!</h3>
              <p className={`text-[10px] ${themeTextMuted}`}>Bởi: {renderSuccessModal.engineName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${themeBtnSecondary}`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Thông tin tệp & kết quả */}
        <div className={`mt-4 p-3.5 rounded-xl border space-y-2.5 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${themeTextMuted}`}>Tệp tin:</span>
            <span className={`font-semibold max-w-[210px] truncate ${themeTextHead}`} title={renderSuccessModal.filename}>
              {renderSuccessModal.filename}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${themeTextMuted}`}>Quy mô:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {renderSuccessModal.totalPages} trang • {renderSuccessModal.dpi} DPI
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${themeTextMuted}`}>Hệ màu & Định dạng:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {renderSuccessModal.colorspace} • {renderSuccessModal.isPdf ? 'PDF Prepress' : 'TIFF'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${themeTextMuted}`}>Thời gian xử lý:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ⏱️ {renderSuccessModal.durationSec}
            </span>
          </div>
        </div>

        {/* Ảnh xem trước trang đầu nếu có */}
        {renderSuccessModal.previewUrl && (
          <div className="mt-3 flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-36 overflow-hidden">
            <img
              src={renderSuccessModal.previewUrl}
              alt="Preview"
              className="max-h-32 object-contain rounded-lg shadow-xs"
            />
          </div>
        )}

        {/* Các nút hành động */}
        <div className="mt-5 flex flex-col gap-2">
          {renderSuccessModal.downloadUrl && (
            <button
              type="button"
              onClick={async () => {
                await triggerFileDownload(
                  renderSuccessModal.downloadUrl,
                  renderSuccessModal.filename,
                  renderSuccessModal.isPdf
                );
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-[0.99]"
            >
              <Download size={15} />
              <span>Tải Tệp {renderSuccessModal.isPdf ? 'PDF' : 'Kết Quả'} Về Máy</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 mt-1">
            {renderSuccessModal.previewUrl && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenColorStudio(renderSuccessModal.previewUrl, renderSuccessModal.filename);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${themeBtnSecondary}`}
              >
                <Palette size={14} className="text-indigo-500" />
                <span>Color Studio</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${themeBtnSecondary} ${!renderSuccessModal.previewUrl ? 'col-span-2' : ''}`}
            >
              <span>Đóng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
