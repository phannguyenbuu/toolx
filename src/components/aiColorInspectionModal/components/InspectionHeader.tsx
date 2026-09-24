import React from 'react';
import { Sparkles, Key, X } from 'lucide-react';

interface InspectionHeaderProps {
  isComparing: boolean;
  isAnalyzing: boolean;
  isLightMode: boolean;
  themeTextMuted: string;
  onOpenApiKeyModal: () => void;
  onClose: () => void;
}

export const InspectionHeader: React.FC<InspectionHeaderProps> = ({
  isComparing,
  isAnalyzing,
  isLightMode,
  themeTextMuted,
  onOpenApiKeyModal,
  onClose,
}) => {
  return (
    <div
      className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
          <Sparkles
            size={20}
            className={isComparing || isAnalyzing ? 'animate-spin' : 'animate-pulse text-amber-300'}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base tracking-tight">Kiểm tra Bản in bằng AI (ChatGPT Vision)</h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
              <span>GPT-4o Vision</span>
            </span>
          </div>
          <p className={`text-xs ${themeTextMuted}`}>
            So sánh bản xem PC với bản in thực tế để tính toán thông số bù trừ Color Balance & Curves
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* API Key Settings Button */}
        <button
          onClick={onOpenApiKeyModal}
          className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
            isLightMode
              ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
          }`}
          title="Cấu hình OpenAI API Token"
        >
          <Key size={14} className="text-amber-400" />
          <span className="hidden md:inline">Token AI</span>
        </button>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-xl transition ${
            isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Đóng"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
