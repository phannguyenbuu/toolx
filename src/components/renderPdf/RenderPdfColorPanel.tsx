import React from 'react';
import { Sliders, ChevronUp, ChevronDown } from 'lucide-react';
import { RENDER_PRESETS, AdvancedRenderSettings } from '../RenderSettingsModal';

export interface RenderPdfColorPanelProps {
  isAdvancedPanelExpanded: boolean;
  toggleAdvancedPanel: () => void;
  advancedSettings: AdvancedRenderSettings;
  cloudDpi: number;
  currentActivePresetId: string;
  handleApplyPreset: (presetId: string) => void;
  isLightMode: boolean;
  themeCardInner: string;
  themeTextHead: string;
  themeTextMuted: string;
  themeInput: string;
}

export const RenderPdfColorPanel: React.FC<RenderPdfColorPanelProps> = ({
  isAdvancedPanelExpanded,
  toggleAdvancedPanel,
  advancedSettings,
  cloudDpi,
  currentActivePresetId,
  handleApplyPreset,
  isLightMode,
  themeCardInner,
  themeTextHead,
  themeTextMuted,
  themeInput,
}) => {
  return (
    <div className="space-y-4">
      {/* PROMINENT RENDER SETTINGS MODAL TRIGGER & CONFIG SUMMARY */}
      <div className={`p-3.5 rounded-xl border transition-all duration-200 ${themeCardInner} ring-1 ring-indigo-500/20 shadow-xs ${isAdvancedPanelExpanded ? 'space-y-3' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div
            onClick={toggleAdvancedPanel}
            className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
            title={isAdvancedPanelExpanded ? "Nhấp để thu gọn panel" : "Nhấp để mở rộng panel"}
          >
            <Sliders size={15} className="text-indigo-500 flex-shrink-0" />
            <span className={`text-xs font-bold truncate ${themeTextHead}`}>
              Cấu hình Render Chuyên Sâu
            </span>
            {!isAdvancedPanelExpanded && (
              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 truncate">
                {advancedSettings.isCustomDpi ? `${advancedSettings.customDpi} DPI` : `${cloudDpi} DPI`} • {advancedSettings.colorspace.toUpperCase()} • {advancedSettings.outputFormat.toUpperCase()}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={toggleAdvancedPanel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isAdvancedPanelExpanded ? "Thu gọn panel Cấu hình" : "Mở rộng panel Cấu hình"}
          >
            {isAdvancedPanelExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isAdvancedPanelExpanded && (
          <>
            {/* Active Configuration Badges */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Độ phân giải</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {advancedSettings.isCustomDpi ? `${advancedSettings.customDpi} DPI (Custom)` : `${cloudDpi} DPI`}
                </div>
                <div className="text-[10px] text-slate-500 font-normal truncate">
                  {advancedSettings.noTiling ? 'No-Tiling 128GB' : 'Auto Tiling'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Hệ màu & ICC</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 uppercase truncate mt-0.5">
                  {advancedSettings.colorspace}
                  <span className="text-[10px] font-normal text-slate-500 ml-1 lowercase">
                    {advancedSettings.useIcc ? `(${advancedSettings.renderingIntent.replace('_', ' ')})` : '(raw)'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate" title={advancedSettings.iccProfile}>
                  {advancedSettings.useIcc
                    ? `${advancedSettings.iccProfile.replace(/\.(icc|icm)$/i, '')}${advancedSettings.colorspace === 'cmyk' && advancedSettings.gcrLevel !== undefined ? ` • GCR ${advancedSettings.gcrLevel}%` : ''}`
                    : 'Gốc (Không ICC)'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Định dạng & Nén</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {advancedSettings.outputFormat.toUpperCase()}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">({advancedSettings.compression.toUpperCase()})</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {advancedSettings.transparentBg ? 'Nền trong suốt' : 'Nền solid'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Phạm vi trang</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {advancedSettings.pageRangeMode === 'all'
                    ? 'Tất cả các trang'
                    : advancedSettings.pageRangeMode === 'first'
                    ? 'Chỉ trang 1'
                    : `Trang ${advancedSettings.customPageRange || '1'}`}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Tối đa {advancedSettings.maxPages} trang
                </div>
              </div>
            </div>

            {/* Quick Presets Dropdown */}
            <div>
              <label className={`block text-[10px] uppercase font-medium tracking-wider mb-1.5 ${themeTextMuted}`}>
                Cấu hình mẫu (Presets):
              </label>
              <select
                value={currentActivePresetId}
                onChange={(e) => {
                  if (e.target.value) handleApplyPreset(e.target.value);
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer ${themeInput}`}
              >
                <option value="" disabled={!!currentActivePresetId}>
                  {currentActivePresetId ? '-- Chọn cấu hình mẫu (Preset) --' : '⚙️ Tùy chỉnh tự do (hoặc chọn Preset mẫu bên dưới)'}
                </option>
                {RENDER_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id} className={isLightMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>
                    {preset.icon} {preset.name} ({preset.settings.dpi || 300} DPI, {(preset.settings.colorspace || 'cmyk').toUpperCase()}, {(preset.settings.outputFormat || 'tiff').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
