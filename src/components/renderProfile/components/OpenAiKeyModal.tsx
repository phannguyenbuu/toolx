import React from 'react';
import { Sparkles } from 'lucide-react';
import { ThemeClasses } from '../types';
import { setOpenAIKey } from '../../../utils/aiColorInspection';

interface OpenAiKeyModalProps {
  isOpen: boolean;
  isLightMode: boolean;
  theme: ThemeClasses;
  apiKeyInput: string;
  setApiKeyInput: (val: string) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const OpenAiKeyModal: React.FC<OpenAiKeyModalProps> = ({
  isOpen,
  isLightMode,
  theme,
  apiKeyInput,
  setApiKeyInput,
  onClose,
  showToast
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl ${theme.cardBg}`}>
        <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Sparkles size={14} className="text-purple-500" />
          <span>Cấu hình OpenAI API Key</span>
        </h3>
        <p className={`text-xs mb-3 ${theme.textMuted}`}>
          Nhập OpenAI API Key để kích hoạt AI Vision.
        </p>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="sk-..."
          className={`w-full p-2 rounded-xl border text-xs font-mono mb-4 ${theme.input}`}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
              isLightMode
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenAIKey(apiKeyInput);
              onClose();
              showToast('Đã lưu OpenAI API Key');
            }}
            className="px-4 py-1.5 rounded-xl bg-[#999] hover:bg-[#888] text-white text-xs font-medium cursor-pointer shadow-xs"
          >
            Lưu Token
          </button>
        </div>
      </div>
    </div>
  );
};
