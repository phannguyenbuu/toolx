import React from 'react';
import { Eye } from 'lucide-react';
import { ThemeClasses } from '../types';

interface BeforeAfterPreviewBarProps {
  isLightMode: boolean;
  theme: ThemeClasses;
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
  colorFilterEnabled: boolean;
}

export const BeforeAfterPreviewBar: React.FC<BeforeAfterPreviewBarProps> = ({
  isLightMode,
  theme,
  showOriginal,
  setShowOriginal,
  colorFilterEnabled
}) => {
  return (
    <div
      className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${theme.cardInner}`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${theme.textMuted}`}>So sánh nhanh:</span>
        <button
          type="button"
          onMouseDown={() => setShowOriginal(true)}
          onMouseUp={() => setShowOriginal(false)}
          onTouchStart={() => setShowOriginal(true)}
          onTouchEnd={() => setShowOriginal(false)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition active:scale-95 cursor-pointer ${
            showOriginal
              ? 'bg-amber-500 text-white border-amber-500'
              : isLightMode
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
        >
          <Eye size={12} className="inline mr-1.5" />
          <span>{showOriginal ? 'Đang hiện: Ảnh gốc' : 'Giữ để xem ảnh gốc'}</span>
        </button>
      </div>

      <div className="text-[11px] flex items-center gap-2">
        <span className={theme.textMuted}>Trạng thái:</span>
        {colorFilterEnabled ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Đã kích hoạt bộ lọc</span>
        ) : (
          <span className="font-medium text-slate-400">Không lọc (Màu gốc)</span>
        )}
      </div>
    </div>
  );
};
