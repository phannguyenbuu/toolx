import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Palette,
  Maximize2,
  FileText,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import { AdvancedRenderSettings, RenderPreset, RenderSettingsModalProps } from './types';
import { DEFAULT_RENDER_SETTINGS } from './constants';
import { PresetBar } from './components/PresetBar';
import { ResolutionTab } from './components/ResolutionTab';
import { ColorManagementTab } from './components/ColorManagementTab';
import { OutputFormatTab } from './components/OutputFormatTab';
import { EngineTab } from './components/EngineTab';

export const RenderSettingsModal: React.FC<RenderSettingsModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSave,
  isLightMode,
}) => {
  const [activeTab, setActiveTab] = useState<'resolution' | 'color' | 'format' | 'engine'>('resolution');
  const [settings, setSettings] = useState<AdvancedRenderSettings>({ ...initialSettings });

  useEffect(() => {
    if (isOpen) {
      setSettings({ ...initialSettings });
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: RenderPreset) => {
    setSettings((prev) => ({ ...prev, ...preset.settings }));
  };

  const handleReset = () => {
    if (window.confirm('Đặt lại tất cả thông số cấu hình về mặc định chuẩn in Offset 300 DPI?')) {
      setSettings({ ...DEFAULT_RENDER_SETTINGS });
    }
  };

  const handleSaveAndApply = () => {
    onSave(settings);
    onClose();
  };

  // Theme classes
  const themeCard = isLightMode ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl';
  const themeHeader = isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850';
  const themeInner = isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/80 border-slate-800';
  const themeInput = isLightMode ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500' : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';
  const themeTextMuted = isLightMode ? 'text-slate-500' : 'text-slate-400';

  const currentDpi = settings.isCustomDpi ? settings.customDpi : settings.dpi;

  const tabProps = {
    settings,
    updateSetting,
    isLightMode,
    themeInner,
    themeInput,
    themeTextMuted,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
      <div className={`relative border rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden ${themeCard}`}>
        {/* MODAL HEADER */}
        <div className={`p-4 md:px-6 border-b flex items-center justify-between flex-shrink-0 ${themeHeader}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Cấu hình Thông số Render Vector & Prepress</h3>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                  128GB RAM Vector Core
                </span>
              </div>
              <p className={`text-xs ${themeTextMuted}`}>
                Thiết lập độ phân giải, hệ màu ICC, nén TIFF và máy render thực thi chuẩn in ấn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* PRESET QUICK SELECTOR BAR */}
        <PresetBar
          onApplyPreset={applyPreset}
          isLightMode={isLightMode}
          themeTextMuted={themeTextMuted}
        />

        {/* MODAL TABS NAVIGATION */}
        <div className={`px-4 md:px-6 border-b flex space-x-1 flex-shrink-0 ${themeHeader}`}>
          <button
            onClick={() => setActiveTab('resolution')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'resolution'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Maximize2 size={14} />
            <span>Độ phân giải & Kích thước</span>
          </button>

          <button
            onClick={() => setActiveTab('color')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'color'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Palette size={14} />
            <span>Hệ màu & ICC Prepress</span>
          </button>

          <button
            onClick={() => setActiveTab('format')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'format'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText size={14} />
            <span>Định dạng tệp & Nén</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'engine'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Cpu size={14} />
            <span>Trang & Máy render</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 text-xs">
          {activeTab === 'resolution' && <ResolutionTab {...tabProps} />}
          {activeTab === 'color' && <ColorManagementTab {...tabProps} />}
          {activeTab === 'format' && <OutputFormatTab {...tabProps} />}
          {activeTab === 'engine' && <EngineTab {...tabProps} />}
        </div>

        {/* MODAL FOOTER */}
        <div className={`p-4 md:px-6 border-t flex flex-wrap items-center justify-between gap-3 flex-shrink-0 ${themeHeader}`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <RotateCcw size={13} />
              <span>Đặt lại mặc định</span>
            </button>

            {/* Summary Tag */}
            <div className={`hidden sm:flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border font-mono ${themeInner}`}>
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>
                {currentDpi} DPI • {settings.colorspace.toUpperCase()} • {settings.outputFormat.toUpperCase()} {settings.outputFormat === 'tiff' ? settings.compression.toUpperCase() : ''} • {settings.noTiling ? 'No-Tiling' : 'Tiled'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition cursor-pointer active:scale-95"
            >
              <Check size={15} />
              <span>Áp dụng cấu hình</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
