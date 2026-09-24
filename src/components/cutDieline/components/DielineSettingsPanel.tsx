import React from 'react';
import {
  Layers,
  Palette,
  Check,
  FileCode,
  Download,
  Copy,
} from 'lucide-react';
import { CUT_COLOR_PRESETS } from '../constants';

interface DielineSettingsPanelProps {
  effectiveTotalSheets: number;
  selectedSheet: number | 'all';
  onSelectSheet: (sheet: number | 'all') => void;
  cutColor: string;
  onSetCutColor: (color: string) => void;
  strokeWidthMm: number;
  onSetStrokeWidthMm: (w: number) => void;
  cutBleed: number;
  onSetCutBleed: (b: number) => void;
  showPageBorder: boolean;
  onSetShowPageBorder: (show: boolean) => void;
  pageW: number;
  pageH: number;
  customFilename: string;
  onSetCustomFilename: (name: string) => void;
  isExporting: boolean;
  isCopied: boolean;
  onDownloadSvg: () => void;
  onDownloadPdf: () => void;
  onCopySvg: () => void;
}

export const DielineSettingsPanel: React.FC<DielineSettingsPanelProps> = ({
  effectiveTotalSheets,
  selectedSheet,
  onSelectSheet,
  cutColor,
  onSetCutColor,
  strokeWidthMm,
  onSetStrokeWidthMm,
  cutBleed,
  onSetCutBleed,
  showPageBorder,
  onSetShowPageBorder,
  pageW,
  pageH,
  customFilename,
  onSetCustomFilename,
  isExporting,
  isCopied,
  onDownloadSvg,
  onDownloadPdf,
  onCopySvg,
}) => {
  return (
    <div className="w-full lg:w-80 xl:w-88 flex flex-col justify-between bg-slate-50/70 p-5 overflow-y-auto space-y-5">
      <div className="space-y-4">
        {/* Sheet selection (if multiple sheets) */}
        {effectiveTotalSheets > 1 && (
          <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
              <Layers size={13} className="text-violet-600" />
              <span>Chọn tờ cần xuất ({effectiveTotalSheets} tờ)</span>
            </label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {Array.from({ length: effectiveTotalSheets }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectSheet(i)}
                  className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    selectedSheet === i
                      ? 'bg-violet-600 border-violet-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  Tờ {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSelectSheet('all')}
                className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  selectedSheet === 'all'
                    ? 'bg-violet-600 border-violet-700 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>
        )}

        {/* Stroke & Cut Parameters */}
        <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Palette size={13} className="text-amber-500" />
              <span>Màu & nét dao cắt</span>
            </span>
          </div>

          {/* Color Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-medium text-slate-400 uppercase">Màu đường cắt</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CUT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onSetCutColor(preset.value)}
                  className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    cutColor.toUpperCase() === preset.value.toUpperCase()
                      ? `ring-2 ring-offset-1 ${preset.ring} border-slate-800 scale-105`
                      : 'border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.label}
                >
                  {cutColor.toUpperCase() === preset.value.toUpperCase() && (
                    <Check
                      size={14}
                      className={
                        preset.value === '#000000' || preset.value === '#FF0000'
                          ? 'text-white'
                          : 'text-slate-900'
                      }
                    />
                  )}
                </button>
              ))}
              {/* Custom Color Input */}
              <div
                className="relative w-7 h-7 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center cursor-pointer hover:scale-105 transition"
                title="Chọn màu tùy chỉnh"
              >
                <input
                  type="color"
                  value={cutColor}
                  onChange={(e) => onSetCutColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ backgroundColor: cutColor }} />
              </div>
            </div>
          </div>

          {/* Stroke Width & Bleed */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase">Độ dày nét (mm)</span>
              <select
                value={strokeWidthMm}
                onChange={(e) => onSetStrokeWidthMm(parseFloat(e.target.value) || 0.1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-400"
              >
                <option value={0.05}>0.05 mm (Siêu mảnh)</option>
                <option value={0.1}>0.10 mm (Chuẩn plotter)</option>
                <option value={0.25}>0.25 mm (CAD / In)</option>
                <option value={0.5}>0.50 mm (Dày)</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase">Bù xén (Bleed mm)</span>
              <input
                type="number"
                step="0.5"
                min={0}
                value={cutBleed}
                onChange={(e) => onSetCutBleed(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Show sheet boundary toggle */}
          <label className="flex items-center justify-between text-xs text-slate-700 pt-1 border-t border-slate-100 cursor-pointer select-none">
            <span className="text-[11px] font-medium">Hiện khung trang ({pageW}×{pageH}mm)</span>
            <input
              type="checkbox"
              checked={showPageBorder}
              onChange={(e) => onSetShowPageBorder(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Filename Input */}
        <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Tên file xuất</label>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <input
              type="text"
              value={customFilename}
              onChange={(e) => onSetCustomFilename(e.target.value)}
              placeholder="Ten_File"
              className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">.svg / .pdf</span>
          </div>
        </div>
      </div>

      {/* Export Actions Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        {/* SVG Download Button */}
        <button
          type="button"
          onClick={onDownloadSvg}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <FileCode size={16} />
          <span>Tải file SVG (.svg)</span>
        </button>

        {/* PDF Download Button */}
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isExporting}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-rose-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <Download size={16} />
          <span>{isExporting ? 'Đang tạo PDF...' : 'Tải file PDF (.pdf)'}</span>
        </button>

        {/* Copy SVG Code */}
        <button
          type="button"
          onClick={onCopySvg}
          className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isCopied ? (
            <Check size={14} className="text-emerald-500" />
          ) : (
            <Copy size={14} className="text-slate-400" />
          )}
          <span>{isCopied ? 'Đã sao chép mã SVG!' : 'Sao chép mã SVG'}</span>
        </button>
      </div>
    </div>
  );
};
