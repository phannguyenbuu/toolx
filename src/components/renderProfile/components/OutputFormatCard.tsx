import React from 'react';
import { FileText } from 'lucide-react';
import { AdvancedRenderSettings, ThemeClasses } from '../types';

interface OutputFormatCardProps {
  theme: ThemeClasses;
  renderSettings: AdvancedRenderSettings;
  onUpdateRenderSetting: <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => void;
}

export const OutputFormatCard: React.FC<OutputFormatCardProps> = ({
  theme,
  renderSettings,
  onUpdateRenderSetting
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${theme.cardBg}`}>
      <div className="space-y-3">
        <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
          <FileText size={15} className="text-slate-500" />
          <span className="whitespace-nowrap">Định dạng tệp xuất</span>
        </h3>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { id: 'tiff', label: 'TIFF' },
            { id: 'png', label: 'PNG' },
            { id: 'jpeg', label: 'JPEG' },
            { id: 'pdf', label: 'PDF' }
          ].map((fmt) => (
            <button
              type="button"
              key={fmt.id}
              onClick={() => onUpdateRenderSetting('outputFormat', fmt.id as any)}
              className={`py-2 px-2 rounded-xl border cursor-pointer transition text-center whitespace-nowrap ${
                renderSettings.outputFormat === fmt.id
                  ? 'bg-[#999] text-white border-[#999] shadow-xs'
                  : `${theme.cardInner} hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300`
              }`}
            >
              <div className="text-xs font-medium uppercase whitespace-nowrap truncate">{fmt.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={renderSettings.transparentBg}
            onChange={(e) => onUpdateRenderSetting('transparentBg', e.target.checked)}
            className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Nền trong suốt</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={renderSettings.noTiling}
            onChange={(e) => onUpdateRenderSetting('noTiling', e.target.checked)}
            className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Single-pass No-Tiling</span>
        </label>
      </div>
    </div>
  );
};
