import React from 'react';
import { CheckCircle2, LayoutGrid, Download } from 'lucide-react';
import { safeToastSuccess } from '../impositionHelpers';

export interface RenderSuccessInfo {
  downloadUrl: string;
  filename: string;
  previewUrl?: string;
  duration?: string;
  dpi?: number;
  colorspace?: string;
  engineName?: string;
  sheetFiles?: Array<{
    sheetIndex: number;
    sheetName: string;
    filename: string;
    downloadUrl: string;
  }>;
  totalPages?: number;
}

export interface ImpositionRenderSuccessModalProps {
  renderSuccessModal: RenderSuccessInfo | null;
  setRenderSuccessModal: (modal: RenderSuccessInfo | null) => void;
}

export const ImpositionRenderSuccessModal: React.FC<ImpositionRenderSuccessModalProps> = ({
  renderSuccessModal,
  setRenderSuccessModal
}) => {
  if (!renderSuccessModal) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setRenderSuccessModal(null)}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-800 relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
              <CheckCircle2 size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Đã download {renderSuccessModal.filename} xong
                {renderSuccessModal.duration && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {renderSuccessModal.duration}
                  </span>
                )}
              </h3>
              <p className="text-xs text-emerald-700 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Tệp PDF đã được lưu vào thư mục Downloads của bạn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRenderSuccessModal(null)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content & Preview */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Image Preview Box */}
          <div className="relative rounded-2xl border border-slate-200 bg-slate-950/5 p-3 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden group">
            {renderSuccessModal.previewUrl ? (
              <img
                src={renderSuccessModal.previewUrl}
                alt="Render Preview"
                className="max-h-[320px] max-w-full object-contain rounded-lg shadow-md transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                <LayoutGrid size={40} className="opacity-40" />
                <span className="text-xs">Đã kết xuất thành công PDF Vector</span>
              </div>
            )}
          </div>

          {/* Spec Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Độ phân giải</span>
              <span className="font-bold text-slate-800">{renderSuccessModal.dpi} DPI</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Hệ màu</span>
              <span className="font-bold text-slate-800 uppercase">{renderSuccessModal.colorspace}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời gian</span>
              <span className="font-bold text-emerald-600">{renderSuccessModal.duration}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Môi trường</span>
              <span className="font-bold text-indigo-700 truncate block" title={renderSuccessModal.engineName}>
                {renderSuccessModal.engineName}
              </span>
            </div>
          </div>

          {/* Separate Sheet Files for Multi-page / Multi-sheet */}
          {renderSuccessModal.sheetFiles && renderSuccessModal.sheetFiles.length > 1 && (
            <div className="bg-gradient-to-br from-violet-50/90 to-indigo-50/70 border border-violet-200/90 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                  <span className="text-xs font-bold text-violet-900">
                    Bộ tệp kết xuất ({renderSuccessModal.sheetFiles.length} tờ in riêng biệt)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const files = renderSuccessModal.sheetFiles;
                    if (!files) return;
                    files.forEach((file: any, idx: number) => {
                      setTimeout(() => {
                        const a = document.createElement('a');
                        a.href = file.downloadUrl;
                        a.download = file.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }, idx * 400);
                    });
                    safeToastSuccess(`Đang tải xuống lần lượt ${files.length} file...`);
                  }}
                  className="text-[11px] font-bold px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Tải tất cả các file riêng biệt cùng lúc"
                >
                  <Download size={13} />
                  <span>Tải cả {renderSuccessModal.sheetFiles.length} file riêng</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {renderSuccessModal.sheetFiles.map((file: any) => (
                  <a
                    key={file.sheetIndex}
                    href={file.downloadUrl}
                    download={file.filename}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 bg-white hover:bg-violet-100/70 text-violet-800 font-semibold text-xs transition cursor-pointer shadow-2xs"
                    title={`Tải file ${file.sheetName}: ${file.filename}`}
                  >
                    <Download size={12} className="text-violet-600" />
                    <span>Tải {file.sheetName}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setRenderSuccessModal(null)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {renderSuccessModal.sheetFiles && renderSuccessModal.sheetFiles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const files = renderSuccessModal.sheetFiles;
                  if (!files) return;
                  files.forEach((file: any, idx: number) => {
                    setTimeout(() => {
                      const a = document.createElement('a');
                      a.href = file.downloadUrl;
                      a.download = file.filename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }, idx * 400);
                  });
                  safeToastSuccess(`Đang tải xuống ${files.length} file...`);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                <Download size={14} />
                <span>Tải {renderSuccessModal.sheetFiles.length} file riêng</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (!renderSuccessModal.downloadUrl) return;
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = renderSuccessModal.downloadUrl;
                a.download = renderSuccessModal.filename || 'BinhTrang_Render.pdf';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  try {
                    if (document.body.contains(a)) document.body.removeChild(a);
                  } catch {}
                }, 1000);
                safeToastSuccess(`Đang tải xuống: ${renderSuccessModal.filename}`);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer"
            >
              <Download size={16} />
              <span>
                {renderSuccessModal.sheetFiles && renderSuccessModal.sheetFiles.length > 1
                  ? `Tải lại File Gộp (${renderSuccessModal.totalPages || renderSuccessModal.sheetFiles.length} trang)`
                  : 'Tải lại File PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
