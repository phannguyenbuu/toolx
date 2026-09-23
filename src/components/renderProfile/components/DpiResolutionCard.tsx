import React from 'react';
import { Printer } from 'lucide-react';
import { AdvancedRenderSettings, ThemeClasses } from '../types';

interface DpiResolutionCardProps {
  theme: ThemeClasses;
  renderSettings: AdvancedRenderSettings;
  onUpdateRenderSetting: <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => void;
}

export const DpiResolutionCard: React.FC<DpiResolutionCardProps> = ({
  theme,
  renderSettings,
  onUpdateRenderSetting
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${theme.cardBg}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between whitespace-nowrap">
          <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
            <Printer size={15} className="text-slate-500" />
            <span className="whitespace-nowrap">Độ phân giải kết xuất</span>
          </h3>
          <span className={`text-[11px] font-mono whitespace-nowrap ${theme.textMuted}`}>
            {renderSettings.isCustomDpi
              ? `${renderSettings.customDpi} DPI`
              : `${renderSettings.dpi} DPI`}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {[
            { dpi: 72, label: '72 DPI' },
            { dpi: 150, label: '150 DPI' },
            { dpi: 300, label: '300 DPI' },
            { dpi: 600, label: '600 DPI' },
            { dpi: -1, label: 'Tùy chỉnh' }
          ].map((item) => {
            const isCustom = item.dpi === -1;
            const isSelected = isCustom
              ? renderSettings.isCustomDpi
              : !renderSettings.isCustomDpi && renderSettings.dpi === item.dpi;
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  if (isCustom) {
                    onUpdateRenderSetting('isCustomDpi', true);
                  } else {
                    onUpdateRenderSetting('isCustomDpi', false);
                    onUpdateRenderSetting('dpi', item.dpi);
                  }
                }}
                className={`py-2 px-1 sm:px-2 rounded-xl border cursor-pointer transition text-center whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#999] text-white border-[#999] shadow-xs'
                    : `${theme.cardInner} hover:border-slate-300 dark:hover:border-slate-700`
                }`}
              >
                <div className="text-xs font-medium whitespace-nowrap truncate">{item.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {renderSettings.isCustomDpi && (
        <div className="flex items-center gap-2 pt-2 whitespace-nowrap">
          <label className={`text-[11px] font-medium whitespace-nowrap ${theme.textMuted}`}>DPI tùy chỉnh:</label>
          <input
            type="number"
            min={36}
            max={2400}
            value={renderSettings.customDpi}
            onChange={(e) => onUpdateRenderSetting('customDpi', Math.max(36, Number(e.target.value)))}
            className={`w-28 p-1.5 px-2.5 rounded-lg border text-xs font-mono text-center ${theme.input}`}
          />
        </div>
      )}
    </div>
  );
};
