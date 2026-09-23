import React from 'react';
import { Sparkles, RotateCcw, Download } from 'lucide-react';
import {
  ColorAdjustSettings,
  COLOR_PRESETS,
  CurvePoint
} from '../../utils/colorAdjustment';
import { ColorCurveEditor, CurveChannelType } from '../ColorCurveEditor';

export interface ColorStudioPanelsProps {
  colorSettings: ColorAdjustSettings;
  setColorSettings: React.Dispatch<React.SetStateAction<ColorAdjustSettings>>;
  colorTab: 'curves' | 'brightness' | 'balance' | 'hsl' | 'cmyk' | 'rgb';
  setColorTab: (tab: 'curves' | 'brightness' | 'balance' | 'hsl' | 'cmyk' | 'rgb') => void;
  curveChannel: CurveChannelType;
  setCurveChannel: (channel: CurveChannelType) => void;
  handleRunAIColorCheck: () => Promise<void>;
  isAIAnalyzing: boolean;
  handleResetColorSettings: () => void;
  handleDownloadAdjustedImage: () => void;
  isLightMode: boolean;
}

export const ColorStudioPanels: React.FC<ColorStudioPanelsProps> = ({
  colorSettings,
  setColorSettings,
  colorTab,
  setColorTab,
  curveChannel,
  setCurveChannel,
  handleRunAIColorCheck,
  isAIAnalyzing,
  handleResetColorSettings,
  handleDownloadAdjustedImage,
  isLightMode
}) => {
  const themeCard = isLightMode ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800 shadow-lg';
  const themeCardInner = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-950/70 border-slate-850';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';

  const updateSetting = <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => {
    setColorSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setColorSettings((prev) => ({
      ...prev,
      ...preset.settings
    }));
  };

  return (
    <div className={`w-full lg:w-[410px] shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col overflow-hidden text-xs ${themeCard}`}>
      {/* AI Color Inspection Quick Action Banner */}
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${
        isLightMode ? 'bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border-purple-100' : 'bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-pink-950/20 border-purple-900/40'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-purple-500 animate-pulse" />
          <div>
            <div className="font-bold text-[11px] text-purple-600 dark:text-purple-400">Prepress AI</div>
            <div className={`text-[10px] ${themeTextMuted}`}>Kiểm tra lỗi mực in & dải màu</div>
          </div>
        </div>
        <button
          onClick={handleRunAIColorCheck}
          disabled={isAIAnalyzing}
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow transition active:scale-95 cursor-pointer"
        >
          Kiểm tra ngay
        </button>
      </div>

      {/* Preset Bar */}
      <div className={`p-3 border-b flex items-center justify-between gap-2 ${themeCardInner}`}>
        <span className={`text-[11px] font-semibold ${themeTextMuted}`}>Mẫu màu sẵn:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {COLOR_PRESETS.slice(0, 4).map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition shrink-0 cursor-pointer ${themeBtnSecondary}`}
              title={preset.description}
            >
              {preset.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Color Category Tabs */}
      <div className={`grid grid-cols-6 border-b text-[11px] font-semibold text-center ${themeCardInner}`}>
        <button
          onClick={() => setColorTab('curves')}
          className={`py-2.5 transition border-b-2 cursor-pointer ${
            colorTab === 'curves'
              ? 'border-indigo-600 text-indigo-500 font-bold'
              : `border-transparent ${themeTextMuted} hover:text-indigo-500`
          }`}
        >
          Curves
        </button>
        <button
          onClick={() => setColorTab('brightness')}
          className={`py-2.5 transition border-b-2 cursor-pointer ${
            colorTab === 'brightness'
              ? 'border-indigo-600 text-indigo-500 font-bold'
              : `border-transparent ${themeTextMuted} hover:text-indigo-500`
          }`}
        >
          Sáng/T.Phản
        </button>
        <button
          onClick={() => setColorTab('balance')}
          className={`py-2.5 transition border-b-2 cursor-pointer ${
            colorTab === 'balance'
              ? 'border-indigo-600 text-indigo-500 font-bold'
              : `border-transparent ${themeTextMuted} hover:text-indigo-500`
          }`}
        >
          Balance
        </button>
        <button
          onClick={() => setColorTab('hsl')}
          className={`py-2.5 transition border-b-2 cursor-pointer ${
            colorTab === 'hsl'
              ? 'border-indigo-600 text-indigo-500 font-bold'
              : `border-transparent ${themeTextMuted} hover:text-indigo-500`
          }`}
        >
          HSL
        </button>
        <button
          onClick={() => setColorTab('cmyk')}
          className={`py-2.5 transition border-b-2 cursor-pointer ${
            colorTab === 'cmyk'
              ? 'border-indigo-600 text-indigo-500 font-bold'
              : `border-transparent ${themeTextMuted} hover:text-indigo-500`
          }`}
        >
          CMYK
        </button>
        <button
          onClick={() => setColorTab('rgb')}
          className={`py-2.5 transition border-b-2 cursor-pointer ${
            colorTab === 'rgb'
              ? 'border-indigo-600 text-indigo-500 font-bold'
              : `border-transparent ${themeTextMuted} hover:text-indigo-500`
          }`}
        >
          RGB
        </button>
      </div>

      {/* Sliders Container Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {colorTab === 'curves' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`font-semibold text-xs ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                Đường cong sắc độ (Curves)
              </span>
              <span className={`text-[10px] ${themeTextMuted}`}>Kiểu Photoshop</span>
            </div>
            <ColorCurveEditor
              channel={curveChannel}
              points={
                curveChannel === 'rgb'
                  ? colorSettings.curveRGB
                  : curveChannel === 'red'
                  ? colorSettings.curveRed
                  : curveChannel === 'green'
                  ? colorSettings.curveGreen
                  : colorSettings.curveBlue
              }
              onChange={(newPoints: CurvePoint[]) => {
                if (curveChannel === 'rgb') updateSetting('curveRGB', newPoints);
                else if (curveChannel === 'red') updateSetting('curveRed', newPoints);
                else if (curveChannel === 'green') updateSetting('curveGreen', newPoints);
                else if (curveChannel === 'blue') updateSetting('curveBlue', newPoints);
              }}
              onChannelChange={(ch) => setCurveChannel(ch)}
              isLightMode={isLightMode}
            />
          </div>
        )}

        {colorTab === 'brightness' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className={`font-medium ${themeTextMuted}`}>Độ sáng (Brightness)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.brightness}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.brightness}
                onChange={(e) => updateSetting('brightness', Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className={`font-medium ${themeTextMuted}`}>Độ tương phản (Contrast)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.contrast}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.contrast}
                onChange={(e) => updateSetting('contrast', Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        {colorTab === 'balance' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-cyan-500 font-semibold">Cyan (-100)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.balanceCyanRed}</span>
                <span className="text-rose-500 font-semibold">Red (+100)</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.balanceCyanRed}
                onChange={(e) => updateSetting('balanceCyanRed', Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-fuchsia-500 font-semibold">Magenta (-100)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.balanceMagentaGreen}</span>
                <span className="text-emerald-500 font-semibold">Green (+100)</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.balanceMagentaGreen}
                onChange={(e) => updateSetting('balanceMagentaGreen', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-amber-500 font-semibold">Yellow (-100)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.balanceYellowBlue}</span>
                <span className="text-blue-500 font-semibold">Blue (+100)</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.balanceYellowBlue}
                onChange={(e) => updateSetting('balanceYellowBlue', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {colorTab === 'hsl' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className={`font-medium ${themeTextMuted}`}>Sắc thái (Hue)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.hue}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={colorSettings.hue}
                onChange={(e) => updateSetting('hue', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className={`font-medium ${themeTextMuted}`}>Độ bão hòa (Saturation)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.saturation}%</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.saturation}
                onChange={(e) => updateSetting('saturation', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className={`font-medium ${themeTextMuted}`}>Độ sáng (Lightness)</span>
                <span className="font-mono font-semibold text-indigo-500">{colorSettings.lightness}%</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.lightness}
                onChange={(e) => updateSetting('lightness', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {colorTab === 'cmyk' && (
          <div className="space-y-4">
            <p className={`text-[11px] ${themeTextMuted}`}>Mô phỏng bù trừ lượng mực CMYK cho in ấn chuyên nghiệp:</p>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-cyan-500 font-semibold">Cyan (Xanh lơ)</span>
                <span className="font-mono font-semibold text-cyan-500">{colorSettings.cyan}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.cyan}
                onChange={(e) => updateSetting('cyan', Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-fuchsia-500 font-semibold">Magenta (Đỏ cánh sen)</span>
                <span className="font-mono font-semibold text-fuchsia-500">{colorSettings.magenta}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.magenta}
                onChange={(e) => updateSetting('magenta', Number(e.target.value))}
                className="w-full accent-fuchsia-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-amber-500 font-semibold">Yellow (Vàng)</span>
                <span className="font-mono font-semibold text-amber-500">{colorSettings.yellow}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.yellow}
                onChange={(e) => updateSetting('yellow', Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className={`font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>Black (K - Mực đen)</span>
                <span className="font-mono font-semibold text-slate-500">{colorSettings.black}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.black}
                onChange={(e) => updateSetting('black', Number(e.target.value))}
                className="w-full accent-slate-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        {colorTab === 'rgb' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-rose-500 font-semibold">Kênh Đỏ (Red)</span>
                <span className="font-mono font-semibold text-rose-500">{colorSettings.red}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.red}
                onChange={(e) => updateSetting('red', Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-emerald-500 font-semibold">Kênh Lục (Green)</span>
                <span className="font-mono font-semibold text-emerald-500">{colorSettings.green}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.green}
                onChange={(e) => updateSetting('green', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-blue-500 font-semibold">Kênh Lam (Blue)</span>
                <span className="font-mono font-semibold text-blue-500">{colorSettings.blue}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings.blue}
                onChange={(e) => updateSetting('blue', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Action in Sidebar */}
      <div className={`p-3 border-t flex items-center justify-between gap-2 ${themeCardInner}`}>
        <button
          onClick={handleResetColorSettings}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${themeBtnSecondary}`}
        >
          <RotateCcw size={13} />
          <span>Đặt lại</span>
        </button>

        <button
          onClick={handleDownloadAdjustedImage}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Download size={13} />
          <span>Lưu ảnh thành phẩm</span>
        </button>
      </div>
    </div>
  );
};
