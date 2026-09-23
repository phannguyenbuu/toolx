import React from 'react';
import { Sparkles, Sliders, Layers, RotateCcw } from 'lucide-react';
import { ThemeClasses } from '../types';

interface ColorSubTabsNavProps {
  isLightMode: boolean;
  theme: ThemeClasses;
  colorSubTab: 'auto' | 'manual' | 'curves';
  onSubTabChange: (subTab: 'auto' | 'manual' | 'curves') => void;
  onResetColors: () => void;
}

export const ColorSubTabsNav: React.FC<ColorSubTabsNavProps> = ({
  isLightMode,
  theme,
  colorSubTab,
  onSubTabChange,
  onResetColors
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-2">
      <div className="flex items-center gap-1 p-0.5 rounded-xl border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onSubTabChange('auto')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
            colorSubTab === 'auto'
              ? 'bg-[#999] text-white shadow-xs'
              : `${theme.textMuted} hover:text-slate-800 dark:hover:text-slate-200`
          }`}
        >
          <Sparkles size={13} className={colorSubTab === 'auto' ? 'text-amber-300' : 'text-slate-400'} />
          <span>Tự động (AI Vision)</span>
        </button>

        <button
          type="button"
          onClick={() => onSubTabChange('manual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
            colorSubTab === 'manual'
              ? 'bg-[#999] text-white shadow-xs'
              : `${theme.textMuted} hover:text-slate-800 dark:hover:text-slate-200`
          }`}
        >
          <Sliders size={13} />
          <span>Thủ công</span>
        </button>

        <button
          type="button"
          onClick={() => onSubTabChange('curves')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
            colorSubTab === 'curves'
              ? 'bg-[#999] text-white shadow-xs'
              : `${theme.textMuted} hover:text-slate-800 dark:hover:text-slate-200`
          }`}
        >
          <Layers size={13} />
          <span>Curves</span>
        </button>
      </div>

      {/* Quick reset colors */}
      <button
        type="button"
        onClick={onResetColors}
        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
          isLightMode
            ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
        }`}
      >
        <RotateCcw size={12} />
        <span>Khôi phục màu gốc</span>
      </button>
    </div>
  );
};
