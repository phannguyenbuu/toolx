import React from 'react';
import { Palette } from 'lucide-react';
import { AdvancedRenderSettings, ThemeClasses } from '../types';

interface ColorSpaceIccCardProps {
  theme: ThemeClasses;
  renderSettings: AdvancedRenderSettings;
  onUpdateRenderSetting: <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => void;
}

export const ColorSpaceIccCard: React.FC<ColorSpaceIccCardProps> = ({
  theme,
  renderSettings,
  onUpdateRenderSetting
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${theme.cardBg}`}>
      <div className="space-y-3">
        <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
          <Palette size={15} className="text-slate-500" />
          <span className="whitespace-nowrap">ICC Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Hệ màu */}
          <div>
            <label className={`block text-[11px] font-medium mb-1.5 whitespace-nowrap ${theme.textMuted}`}>Hệ màu:</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cmyk', label: 'CMYK' },
                { id: 'rgb', label: 'RGB' },
                { id: 'gray', label: 'Grayscale' }
              ].map((cs) => (
                <button
                  key={cs.id}
                  type="button"
                  onClick={() => onUpdateRenderSetting('colorspace', cs.id as any)}
                  className={`py-2 px-1 rounded-xl border text-xs font-medium transition cursor-pointer text-center whitespace-nowrap ${
                    renderSettings.colorspace === cs.id
                      ? 'bg-[#999] text-white border-[#999] shadow-xs'
                      : `${theme.cardInner} hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300`
                  }`}
                >
                  <span className="whitespace-nowrap truncate">{cs.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ICC Profile */}
          <div>
            <label className={`block text-[11px] font-medium mb-1.5 whitespace-nowrap ${theme.textMuted}`}>
              ICC Profile:
            </label>
            <select
              value={renderSettings.iccProfile}
              onChange={(e) => onUpdateRenderSetting('iccProfile', e.target.value)}
              className={`w-full p-2 rounded-xl border text-xs font-medium ${theme.input}`}
            >
              <option value="Japan Color 2001 Coated.icc">Japan Color 2001 Coated</option>
              <option value="ISOcoated_v2_300_bas.icc">ISO Coated v2 300%</option>
              <option value="U.S. Web Coated (SWOP) v2.icc">US Web Coated SWOP v2</option>
              <option value="sRGB Color Space Profile.icm">sRGB IEC61966-2.1</option>
              <option value="Display P3.icc">Display P3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overprint & BPC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={renderSettings.blackPointCompensation}
            onChange={(e) => onUpdateRenderSetting('blackPointCompensation', e.target.checked)}
            className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Bù trừ điểm đen (BPC)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={renderSettings.overprintSimulation}
            onChange={(e) => onUpdateRenderSetting('overprintSimulation', e.target.checked)}
            className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Mô phỏng In đè (Overprint)</span>
        </label>
      </div>

      {/* GCR Slider — chỉ hiện khi CMYK */}
      {renderSettings.colorspace === 'cmyk' && (
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-[11px] font-semibold whitespace-nowrap ${theme.textMuted}`}>
              GCR — Thay thế thành phần xám:
            </label>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                (renderSettings.gcrLevel ?? 100) >= 80
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                  : (renderSettings.gcrLevel ?? 100) >= 40
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              {renderSettings.gcrLevel ?? 100}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={renderSettings.gcrLevel ?? 100}
            onChange={(e) => onUpdateRenderSetting('gcrLevel', Number(e.target.value))}
            className="w-full h-2 rounded-full accent-violet-600 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400">0% — Chỉ C+M+Y</span>
            <span className={`text-[9px] ${theme.textMuted}`}>
              {(renderSettings.gcrLevel ?? 100) <= 25
                ? '← Light GCR (SWOP v2 style)'
                : (renderSettings.gcrLevel ?? 100) <= 60
                ? '← Medium GCR'
                : 'Heavy GCR →'}
            </span>
            <span className="text-violet-600 dark:text-violet-400">100% — Tối đa K</span>
          </div>
          {/* Live CMYK preview */}
          <div className={`rounded-lg px-3 py-1.5 text-[10px] flex items-center gap-2 ${theme.cardInner}`}>
            <span className={theme.textMuted}>Pixel xám R=G=B=128 →</span>
            {(() => {
              const gcr = (renderSettings.gcrLevel ?? 100) / 100;
              const kMax = 0.498;
              const k = gcr * kMax;
              const c = Math.max(0, (1 - 128 / 255 - k) / (1 - k || 1));
              return (
                <span className="font-mono font-bold">
                  <span className="text-cyan-500">C{Math.round(c * 100)}</span>{' '}
                  <span className="text-pink-500">M{Math.round(c * 100)}</span>{' '}
                  <span className="text-yellow-500">Y{Math.round(c * 100)}</span>{' '}
                  <span className="text-slate-500">K{Math.round(k * 100)}</span>
                </span>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
