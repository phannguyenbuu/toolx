import React from 'react';
import { Download, Upload, CheckCircle2, Check } from 'lucide-react';

interface RenderProfileFooterProps {
  isLightMode: boolean;
  jsonInputRef: React.RefObject<HTMLInputElement | null>;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onApplyToAllPages: () => void;
  onSaveCurrentProfile: () => void;
}

export const RenderProfileFooter: React.FC<RenderProfileFooterProps> = ({
  isLightMode,
  jsonInputRef,
  onExportJson,
  onImportJson,
  onClose,
  onApplyToAllPages,
  onSaveCurrentProfile
}) => {
  return (
    <div
      className={`p-3.5 sm:px-6 border-t flex flex-wrap items-center justify-between gap-3 flex-shrink-0 ${
        isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/90 border-slate-800'
      }`}
    >
      {/* JSON Export / Import */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <button
          type="button"
          onClick={onExportJson}
          className={`p-1.5 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
            isLightMode
              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="Xuất danh sách profile ra file JSON"
        >
          <Download size={13} className="text-slate-400" />
          <span className="hidden sm:inline whitespace-nowrap">Xuất JSON</span>
        </button>

        <button
          type="button"
          onClick={() => jsonInputRef.current?.click()}
          className={`p-1.5 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
            isLightMode
              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="Nhập profile từ file JSON"
        >
          <Upload size={13} className="text-slate-400" />
          <span className="hidden sm:inline whitespace-nowrap">Nhập JSON</span>
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onImportJson}
          className="hidden"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <button
          type="button"
          onClick={onClose}
          className={`px-4 py-2 rounded-xl border text-xs font-medium transition cursor-pointer whitespace-nowrap ${
            isLightMode
              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
        >
          <span className="whitespace-nowrap">Đóng</span>
        </button>

        <button
          type="button"
          onClick={onApplyToAllPages}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <CheckCircle2 size={14} />
          <span className="whitespace-nowrap">Áp dụng Toàn Bộ Trang PDF</span>
        </button>

        <button
          type="button"
          onClick={onSaveCurrentProfile}
          className="px-4 py-2 rounded-xl bg-[#999] hover:bg-[#888] text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Check size={14} />
          <span className="whitespace-nowrap">Lưu Profile</span>
        </button>
      </div>
    </div>
  );
};
