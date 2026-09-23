import React from 'react';
import { Sliders, Palette, Layers } from 'lucide-react';
import { ColorAdjustSettings, ThemeClasses } from '../types';

interface ManualColorSectionProps {
  theme: ThemeClasses;
  colorSettings: ColorAdjustSettings;
  onUpdateColorSetting: <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => void;
}

export const ManualColorSection: React.FC<ManualColorSectionProps> = ({
  theme,
  colorSettings,
  onUpdateColorSetting
}) => {
  return (
    <div className="space-y-6">
      {/* Độ sáng & Độ tương phản */}
      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${theme.cardBg}`}>
        <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Sliders size={14} className="text-slate-500" />
          <span>Độ sáng & Độ tương phản</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className={theme.textMuted}>Độ sáng:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {colorSettings.brightness}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.brightness}
              onChange={(e) => onUpdateColorSetting('brightness', Number(e.target.value))}
              className="w-full accent-[#999] dark:accent-white cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className={theme.textMuted}>Độ tương phản:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {colorSettings.contrast}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.contrast}
              onChange={(e) => onUpdateColorSetting('contrast', Number(e.target.value))}
              className="w-full accent-[#999] dark:accent-white cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Cân bằng màu */}
      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${theme.cardBg}`}>
        <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Palette size={14} className="text-slate-500" />
          <span>Cân bằng màu</span>
        </h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-cyan-600 font-medium">Cyan</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {colorSettings.balanceCyanRed}
              </span>
              <span className="text-rose-600 font-medium">Red</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.balanceCyanRed}
              onChange={(e) => onUpdateColorSetting('balanceCyanRed', Number(e.target.value))}
              className="w-full accent-[#999] dark:accent-white cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-fuchsia-600 font-medium">Magenta</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {colorSettings.balanceMagentaGreen}
              </span>
              <span className="text-emerald-600 font-medium">Green</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.balanceMagentaGreen}
              onChange={(e) => onUpdateColorSetting('balanceMagentaGreen', Number(e.target.value))}
              className="w-full accent-[#999] dark:accent-white cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-amber-600 font-medium">Yellow</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {colorSettings.balanceYellowBlue}
              </span>
              <span className="text-blue-600 font-medium">Blue</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.balanceYellowBlue}
              onChange={(e) => onUpdateColorSetting('balanceYellowBlue', Number(e.target.value))}
              className="w-full accent-[#999] dark:accent-white cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Kênh màu CMYK */}
      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${theme.cardBg}`}>
        <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Layers size={14} className="text-slate-500" />
          <span>Kênh màu CMYK</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1 text-cyan-600">
              <span>Cyan:</span>
              <span className="font-mono">{colorSettings.cyan}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.cyan}
              onChange={(e) => onUpdateColorSetting('cyan', Number(e.target.value))}
              className="w-full accent-cyan-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1 text-fuchsia-600">
              <span>Magenta:</span>
              <span className="font-mono">{colorSettings.magenta}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.magenta}
              onChange={(e) => onUpdateColorSetting('magenta', Number(e.target.value))}
              className="w-full accent-fuchsia-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1 text-amber-600">
              <span>Yellow:</span>
              <span className="font-mono">{colorSettings.yellow}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.yellow}
              onChange={(e) => onUpdateColorSetting('yellow', Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
              <span>Black (K):</span>
              <span className="font-mono">{colorSettings.black}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.black}
              onChange={(e) => onUpdateColorSetting('black', Number(e.target.value))}
              className="w-full accent-slate-700 dark:accent-slate-300 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
