import React from 'react';
import { Palette } from 'lucide-react';
import { ThemeClasses } from '../types';

interface ColorFilterBannerProps {
  theme: ThemeClasses;
  colorFilterEnabled: boolean;
  onToggleColorFilter: (enabled: boolean) => void;
}

export const ColorFilterBanner: React.FC<ColorFilterBannerProps> = ({
  theme,
  colorFilterEnabled,
  onToggleColorFilter
}) => {
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
        colorFilterEnabled
          ? 'bg-slate-50 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700'
          : `${theme.cardBg} opacity-80`
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
            colorFilterEnabled ? 'bg-[#999]' : 'bg-slate-400 text-white'
          }`}
        >
          <Palette size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs text-slate-900 dark:text-slate-100">
              Bộ lọc cân chỉnh màu sắc khi Render
            </span>
            {colorFilterEnabled ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                ĐANG KÍCH HOẠT
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">
                ĐANG TẮT (Màu gốc)
              </span>
            )}
          </div>
        </div>
      </div>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={colorFilterEnabled}
          onChange={(e) => onToggleColorFilter(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#999]"></div>
      </label>
    </div>
  );
};
