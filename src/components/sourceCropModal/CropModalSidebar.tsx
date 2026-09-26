import React from 'react';
import { Sparkles, RefreshCw, Zap, Loader2, RotateCcw, Eraser } from 'lucide-react';
import {
  ColorAdjustSettings,
  COLOR_PRESETS,
  isDefaultColorSettings
} from '../../utils/colorAdjustment';
import { DimDropdownCombobox, ModalNumberInput } from './DimDropdownCombobox';
import { CropModalColorAdjustPanels } from './CropModalColorAdjustPanels';
import { CropModalRemoveBgPanel } from './CropModalRemoveBgPanel';
import { BleedMode, BleedGapMode, ColorTabType, RemoveBgSettings } from './types';

export interface CropModalSidebarProps {
  localShape: string;
  handleShapeChange: (shape: string) => void;
  localQuantity: number;
  handleQuantityChange: (qty: number) => void;
  localItemW: number;
  localItemH: number;
  handleDimChange: (w: number, h: number) => void;
  imageStandardDim: { w: number; h: number } | null;

  colorSettings: ColorAdjustSettings;
  updateSetting: <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => void;
  applyPreset: (preset: typeof COLOR_PRESETS[0]) => void;
  handleResetColor: () => void;

  colorTab: ColorTabType;
  setColorTab: React.Dispatch<React.SetStateAction<ColorTabType>>;

  bleedMode: BleedMode;
  setBleedMode: React.Dispatch<React.SetStateAction<BleedMode>>;
  bleedMm: number;
  setBleedMm: React.Dispatch<React.SetStateAction<number>>;
  setBleedPercent: React.Dispatch<React.SetStateAction<number>>;
  effectiveBleedMm: number;
  bleedGapMode: BleedGapMode;
  setBleedGapMode: React.Dispatch<React.SetStateAction<BleedGapMode>>;
  gap: number;
  isProcessingBleed: boolean;
  originalBackupSrc: string | null;
  applyOffsetBleed: () => void | Promise<void>;
  applyAIBleed: () => void | Promise<void>;
  handleRestoreOriginal: () => void;

  removeBgSettings: RemoveBgSettings;
  updateRemoveBgSetting: <K extends keyof RemoveBgSettings>(key: K, value: RemoveBgSettings[K]) => void;
  resetRemoveBgSettings: () => void;
  isRemovingWhite: boolean;
  hasOriginalBackup: boolean;
  applyRemoveWhiteBg: () => void | Promise<void>;
  removeBgStatusMsg?: string | null;
}

export const CropModalSidebar: React.FC<CropModalSidebarProps> = ({
  localShape,
  handleShapeChange,
  localQuantity,
  handleQuantityChange,
  localItemW,
  localItemH,
  handleDimChange,
  imageStandardDim,
  colorSettings,
  updateSetting,
  applyPreset,
  handleResetColor,
  colorTab,
  setColorTab,
  bleedMode,
  setBleedMode,
  bleedMm,
  setBleedMm,
  setBleedPercent,
  effectiveBleedMm,
  bleedGapMode,
  setBleedGapMode,
  gap,
  isProcessingBleed,
  originalBackupSrc,
  applyOffsetBleed,
  applyAIBleed,
  handleRestoreOriginal,
  removeBgSettings,
  updateRemoveBgSetting,
  resetRemoveBgSettings,
  isRemovingWhite,
  hasOriginalBackup,
  applyRemoveWhiteBg,
  removeBgStatusMsg,
}) => {
  return (
    <div className="w-[415px] shrink-0 bg-white flex flex-col overflow-hidden text-xs">
      {/* Panel thông số đối tượng: Hình + Kích thước nằm chung 1 hàng */}
      <div className="p-2 border-b border-slate-200 bg-slate-50/90 flex items-center gap-2">
        {/* Shape selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-500 font-medium shrink-0">Hình:</span>
          <select
            value={localShape}
            onChange={(e) => handleShapeChange(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-2xs focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
          >
            <option value="rect">Chữ nhật</option>
            <option value="circle">Hình tròn</option>
            <option value="oval">Hình Oval</option>
            <option value="trapezoid">Hình thang</option>
            <option value="triangle">Tam giác</option>
            <option value="hexagon">Lục giác</option>
            <option value="custom-svg">Custom SVG</option>
          </select>
        </div>

        {/* Kích thước full width còn lại */}
        <div className="flex-1 min-w-0">
          <DimDropdownCombobox
            shape={localShape}
            w={localItemW}
            h={localShape === 'circle' ? localItemW : localItemH}
            onChange={handleDimChange}
            imageStandardDim={imageStandardDim}
            className="w-full"
          />
        </div>
      </div>

      {/* Presets Bar */}
      <div className="p-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
          <Sparkles size={13} className="text-violet-600" />
          <span>Mẫu màu:</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {COLOR_PRESETS.slice(0, 4).map(preset => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-medium border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition shrink-0 cursor-pointer shadow-2xs"
              title={preset.description}
            >
              {preset.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Navtabs Row 1: Bù xén (Bleed Outpainting) & Khử nền trắng (Remove BG) */}
      <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-center">
        <button
          type="button"
          onClick={() => setColorTab('bleed')}
          className={`py-2 px-2 transition border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
            colorTab === 'bleed'
              ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-violet-700 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={13} className={colorTab === 'bleed' ? 'text-violet-600' : 'text-slate-400'} />
          <span className="text-[11px] font-bold truncate">Bù xén (Bleed)</span>
        </button>

        <button
          type="button"
          onClick={() => setColorTab('removeBg')}
          className={`py-2 px-2 transition border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
            colorTab === 'removeBg'
              ? 'border-indigo-600 text-indigo-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-indigo-700 hover:bg-slate-50'
          }`}
        >
          <Eraser size={13} className={colorTab === 'removeBg' ? 'text-indigo-600' : 'text-slate-400'} />
          <span className="text-[11px] font-bold truncate">Khử trắng (Tách nền)</span>
        </button>
      </div>

      {/* Navtabs Row 2: Balance, Curves, Sáng / Tương phản */}
      <div className="grid grid-cols-3 border-b border-slate-200 text-[10px] font-bold text-center bg-slate-100/70">
        <button
          type="button"
          onClick={() => setColorTab('balance')}
          className={`py-1.5 transition border-b-2 cursor-pointer ${
            colorTab === 'balance'
              ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Balance
        </button>
        <button
          type="button"
          onClick={() => setColorTab('curves')}
          className={`py-1.5 transition border-b-2 cursor-pointer ${
            colorTab === 'curves'
              ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Curves
        </button>
        <button
          type="button"
          onClick={() => setColorTab('brightness')}
          className={`py-1.5 transition border-b-2 cursor-pointer ${
            colorTab === 'brightness'
              ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Sáng / Tương phản
        </button>
      </div>

      {/* Navtabs Row 3: HSL, CMYK, RGB */}
      <div className="grid grid-cols-3 border-b border-slate-200 text-[10px] font-bold text-center bg-slate-100/40">
        <button
          type="button"
          onClick={() => setColorTab('hsl')}
          className={`py-1.5 transition border-b-2 cursor-pointer ${
            colorTab === 'hsl'
              ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          HSL
        </button>
        <button
          type="button"
          onClick={() => setColorTab('cmyk')}
          className={`py-1.5 transition border-b-2 cursor-pointer ${
            colorTab === 'cmyk'
              ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          CMYK
        </button>
        <button
          type="button"
          onClick={() => setColorTab('rgb')}
          className={`py-1.5 transition border-b-2 cursor-pointer ${
            colorTab === 'rgb'
              ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          RGB
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Render color panels when not in bleed or removeBg tab */}
        {colorTab !== 'bleed' && colorTab !== 'removeBg' && (
          <CropModalColorAdjustPanels
            colorTab={colorTab}
            colorSettings={colorSettings}
            updateSetting={updateSetting}
          />
        )}

        {/* TAB: KHỬ TRẮNG (TÁCH NỀN) */}
        {colorTab === 'removeBg' && (
          <CropModalRemoveBgPanel
            settings={removeBgSettings}
            updateSetting={updateRemoveBgSetting}
            resetSettings={resetRemoveBgSettings}
            isProcessing={isRemovingWhite}
            hasOriginalBackup={hasOriginalBackup}
            onApplyRemoveBg={applyRemoveWhiteBg}
            onRestoreOriginal={handleRestoreOriginal}
            statusMsg={removeBgStatusMsg}
          />
        )}

        {/* TAB: BLEED STUDIO (BÙ XÉN) */}
        {colorTab === 'bleed' && (
          <div className="space-y-3">
            {/* Bleed Mode Selection: Off / Offset / AI */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setBleedMode('off')}
                className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer select-none ${
                  bleedMode === 'off'
                    ? 'bg-violet-50/80 border-violet-500 text-violet-900 shadow-xs font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <div className="text-xs font-bold">Tắt</div>
                <div className="text-[9px] text-slate-400">Không bù xén</div>
              </button>

              <button
                type="button"
                onClick={() => setBleedMode('offset')}
                className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer select-none ${
                  bleedMode === 'offset'
                    ? 'bg-violet-50/80 border-violet-500 text-violet-900 shadow-xs font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <div className="text-xs font-bold text-violet-700">Offset viền</div>
                <div className="text-[9px] text-slate-400">Lấy viền ảnh gốc</div>
              </button>

              <button
                type="button"
                onClick={() => setBleedMode('ai')}
                className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer select-none ${
                  bleedMode === 'ai'
                    ? 'bg-violet-50/80 border-violet-500 text-violet-900 shadow-xs font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <div className="text-xs font-bold text-indigo-700">AI</div>
                <div className="text-[9px] text-slate-400">Vẽ tràn lề AI</div>
              </button>
            </div>

            {/* Bleed settings when enabled */}
            {bleedMode !== 'off' && (
              <div className="space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-700">Độ rộng bù xén (Bleed):</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={3}
                      max={20}
                      step={0.5}
                      value={bleedMm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const clamped = Math.max(3, Math.round(val * 10) / 10);
                          setBleedMm(clamped);
                          setBleedPercent(Math.round(((clamped * 2) / localItemW) * 100 * 10) / 10);
                        }
                      }}
                      className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-white border border-slate-300 rounded-md text-violet-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-mono font-bold text-xs">
                      {effectiveBleedMm} mm mỗi cạnh
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={3}
                  max={15}
                  step={0.5}
                  value={bleedMm}
                  onChange={(e) => {
                    const val = Math.max(3, Number(e.target.value));
                    setBleedMm(val);
                    setBleedPercent(Math.round(((val * 2) / localItemW) * 100 * 10) / 10);
                  }}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span className="font-bold text-violet-700">3 mm (Mặc định chuẩn in)</span>
                  <span>6 mm</span>
                  <span>10 mm</span>
                  <span>15 mm</span>
                </div>

                {/* Bleed Gap Options */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-200/70">
                  <div className="text-[11px] font-semibold text-slate-700">Khi bình trang:</div>
                  <div className="space-y-1.5">
                    {/* Option 1: Tự động cộng bleed size vào Gap */}
                    <label
                      className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition select-none ${
                        bleedGapMode === 'expand_gap'
                          ? 'bg-violet-50/80 border-violet-400 text-violet-900 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bleedGapMode"
                        checked={bleedGapMode === 'expand_gap'}
                        onChange={() => setBleedGapMode('expand_gap')}
                        className="mt-0.5 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Tự động cộng Gap (+{Math.round(effectiveBleedMm * 2 * 10) / 10}mm)</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-200/80 text-violet-800 font-bold">Mặc định</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          Kích thước tem giữ nguyên ({localItemW} × {localShape === 'circle' ? localItemW : localItemH} mm), Gap tự cộng thêm bleed ({gap}mm ➔ {Math.round((gap + effectiveBleedMm * 2) * 10) / 10}mm) để tính lại sắp xếp tờ in.
                        </div>
                      </div>
                    </label>

                    {/* Option 2: Giữ nguyên Gap (tem nhỏ lại) */}
                    <label
                      className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition select-none ${
                        bleedGapMode === 'shrink_item'
                          ? 'bg-violet-50/80 border-violet-400 text-violet-900 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bleedGapMode"
                        checked={bleedGapMode === 'shrink_item'}
                        onChange={() => setBleedGapMode('shrink_item')}
                        className="mt-0.5 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <div className="font-bold">
                          <span>Giữ nguyên Gap (Tem nhỏ lại còn {Math.max(1, Math.round((localItemW - effectiveBleedMm * 2) * 10) / 10)} × {localShape === 'circle' ? Math.max(1, Math.round((localItemW - effectiveBleedMm * 2) * 10) / 10) : Math.max(1, Math.round((localItemH - effectiveBleedMm * 2) * 10) / 10)} mm)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          Giữ nguyên khoảng cách Gap ({gap}mm), kích thước tem thu nhỏ tương ứng vùng thực in từ bản gốc.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {bleedMode !== 'off' && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isProcessingBleed}
                  onClick={bleedMode === 'offset' ? applyOffsetBleed : applyAIBleed}
                  className={`w-full py-2.5 px-4 rounded-xl ${
                    bleedMode === 'offset'
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
                  } disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer`}
                >
                  {isProcessingBleed ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang xử lý bù xén...</span>
                    </>
                  ) : (
                    <>
                      {bleedMode === 'offset' ? <Zap size={14} /> : <Sparkles size={14} />}
                      <span>{bleedMode === 'offset' ? 'Tạo bù xén Offset' : 'Tạo bù xén AI'}</span>
                    </>
                  )}
                </button>

                {originalBackupSrc && (
                  <button
                    type="button"
                    onClick={handleRestoreOriginal}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Khôi phục ảnh gốc trước khi bù xén</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Reset Color Bar */}
      <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button
          type="button"
          onClick={handleResetColor}
          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium transition cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Khôi phục màu</span>
        </button>
        <span className="text-[10px] text-slate-400">
          {!isDefaultColorSettings(colorSettings) ? 'Đã chỉnh màu' : 'Màu nguyên bản'}
        </span>
      </div>
    </div>
  );
};
