import React from 'react';
import { Key, X } from 'lucide-react';

interface InspectionApiKeyModalProps {
  isOpen: boolean;
  apiKeyInput: string;
  onApiKeyInputChange: (val: string) => void;
  apiKeySavedToast: boolean;
  isLightMode: boolean;
  themeModalBg: string;
  themeTextMuted: string;
  onSave: () => void;
  onClose: () => void;
}

export const InspectionApiKeyModal: React.FC<InspectionApiKeyModalProps> = ({
  isOpen,
  apiKeyInput,
  onApiKeyInputChange,
  apiKeySavedToast,
  isLightMode,
  themeModalBg,
  themeTextMuted,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${themeModalBg}`}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Key size={16} className="text-amber-400" />
            <span>Cấu hình OpenAI API Token</span>
          </h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <p className={`text-xs leading-relaxed ${themeTextMuted}`}>
          Token dùng để gọi ChatGPT Vision API (`gpt-4o-mini`) phân tích hình ảnh bản in và so sánh màu:
        </p>

        <div>
          <input
            type="text"
            value={apiKeyInput}
            onChange={(e) => onApiKeyInputChange(e.target.value)}
            placeholder="sk-proj-..."
            className={`w-full px-3 py-2 rounded-xl border text-xs font-mono select-all ${
              isLightMode
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-slate-950 border-slate-700 text-slate-200'
            }`}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-emerald-500 font-medium">
            {apiKeySavedToast ? 'Đã lưu token thành công!' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                isLightMode ? 'border-slate-300' : 'border-slate-700'
              }`}
            >
              Hủy
            </button>
            <button
              onClick={onSave}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
            >
              Lưu Token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
