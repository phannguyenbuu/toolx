import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, Unlink, ChevronDown, Check, X } from 'lucide-react';
import { ImpositionConfig, ShapeTabItem } from './types';
import { DebouncedNumberInput } from '../common/DebouncedNumberInput';
import {
  parseDimValue, saveCropSizeSuggestion,
  DEFAULT_RECT_SUGGESTIONS, DEFAULT_CIRCLE_SUGGESTIONS,
} from '../sourceCropModal/DimDropdownCombobox';

export interface ImpositionLayerDimensionsProps {
  activeTab: ShapeTabItem;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  updateActiveTabProp: (props: Partial<ShapeTabItem>) => void;
  isMultiShape: boolean;
}

export const ImpositionLayerDimensions: React.FC<ImpositionLayerDimensionsProps> = ({
  activeTab,
  config,
  setConfig,
  updateActiveTabProp,
  isMultiShape,
}) => {
  const isCircle = (activeTab.shape || config.shape) === 'circle';
  const currentW = activeTab.itemW ?? config.itemW;
  const currentH = isCircle ? currentW : (activeTab.itemH ?? config.itemH);

  const srcW = activeTab.sourceImage?.w || 0;
  const srcH = activeTab.sourceImage?.h || 0;
  const hasSourceDims = srcW > 0 && srcH > 0;
  const sourceRatio = hasSourceDims ? srcW / srcH : 1;

  // Khóa tỉ lệ (Aspect Ratio Lock) - Mặc định BẬT khi có ảnh nguồn
  const [isRatioLocked, setIsRatioLocked] = useState<boolean>(true);

  // Xử lý thay đổi Rộng (W)
  const handleWidthChange = (v: number) => {
    const newW = Math.max(1, v);
    if (isCircle) {
      updateActiveTabProp({ itemW: newW, itemH: newW });
      setConfig(c => ({ ...c, itemW: newW, itemH: newW }));
      return;
    }

    if (isRatioLocked && hasSourceDims) {
      const newH = Math.max(1, Math.round((newW / sourceRatio) * 10) / 10);
      updateActiveTabProp({ itemW: newW, itemH: newH });
      setConfig(c => ({ ...c, itemW: newW, itemH: newH }));
    } else {
      updateActiveTabProp({ itemW: newW });
      setConfig(c => ({ ...c, itemW: newW }));
    }
  };

  // Xử lý thay đổi Cao (H)
  const handleHeightChange = (v: number) => {
    const newH = Math.max(1, v);
    if (isRatioLocked && hasSourceDims && !isCircle) {
      const newW = Math.max(1, Math.round((newH * sourceRatio) * 10) / 10);
      updateActiveTabProp({ itemW: newW, itemH: newH });
      setConfig(c => ({ ...c, itemW: newW, itemH: newH }));
    } else {
      updateActiveTabProp({ itemH: newH });
      setConfig(c => ({ ...c, itemH: newH }));
    }
  };

  // ── Size suggestions dropdown ─────────────────────────────────────────────
  const STORAGE_KEY = 'toolx_crop_size_suggestions';
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const sizeMenuRef = useRef<HTMLDivElement>(null);

  const loadSuggestions = useCallback(() => {
    const stdStr = hasSourceDims
      ? (isCircle ? `${Math.round(srcW * 10) / 10}` : `${Math.round(srcW * 10) / 10}x${Math.round(srcH * 10) / 10}`)
      : null;
    let base: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        base = isCircle
          ? Array.from(new Set([...parsed.filter(s => !s.includes('x')), ...DEFAULT_CIRCLE_SUGGESTIONS]))
          : Array.from(new Set([...parsed.filter(s => s.includes('x')), ...DEFAULT_RECT_SUGGESTIONS]));
      }
    } catch {}
    if (!base.length) base = isCircle ? DEFAULT_CIRCLE_SUGGESTIONS : DEFAULT_RECT_SUGGESTIONS;
    setSuggestions(stdStr ? [stdStr, ...base.filter(s => s !== stdStr)] : base);
  }, [isCircle, hasSourceDims, srcW, srcH]);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  useEffect(() => {
    if (!isSizeMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) setIsSizeMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isSizeMenuOpen]);

  const currentFormatted = isCircle ? `${currentW}` : `${currentW}x${currentH}`;

  const handleSelectSuggestion = (sizeStr: string) => {
    const parsed = parseDimValue(sizeStr, currentW, currentH, isCircle);
    if (parsed) {
      updateActiveTabProp({ itemW: parsed.w, itemH: parsed.h });
      setConfig(c => ({ ...c, itemW: parsed.w, itemH: parsed.h }));
      saveCropSizeSuggestion(sizeStr);
      loadSuggestions();
    }
    setIsSizeMenuOpen(false);
  };

  const removeSuggestion = (e: React.MouseEvent, s: string) => {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let list: string[] = raw ? JSON.parse(raw) : [];
      list = list.filter(x => x !== s);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      loadSuggestions();
    } catch {}
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Row 1: [W] × [H] [▾] [🔗] */}
      <div className="flex items-center gap-1 mb-2">
        {/* Input W */}
        <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-400 transition-all">
          <DebouncedNumberInput
            step={0.1}
            min={1}
            value={currentW}
            onChange={handleWidthChange}
            className="w-full bg-transparent text-center font-bold text-xs text-slate-800 focus:outline-none"
          />
          <span className="text-[9px] text-slate-400 font-medium select-none shrink-0 ml-0.5">mm</span>
        </div>

        {/* Dấu nhân */}
        <span className="text-slate-400 text-xs font-bold select-none shrink-0">×</span>

        {/* Input H (ẩn khi circle) */}
        {isCircle ? (
          <div className="flex-1 flex items-center justify-center bg-slate-100/60 border border-dashed border-slate-200 rounded-xl px-2 py-1.5 text-slate-400">
            <span className="text-xs font-bold font-mono">1:1</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-400 transition-all">
            <DebouncedNumberInput
              step={0.1}
              min={1}
              value={currentH}
              onChange={handleHeightChange}
              className="w-full bg-transparent text-center font-bold text-xs text-slate-800 focus:outline-none"
            />
            <span className="text-[9px] text-slate-400 font-medium select-none shrink-0 ml-0.5">mm</span>
          </div>
        )}

        {/* Nút ▾ mở dropdown size suggestions */}
        <div className="relative shrink-0" ref={sizeMenuRef}>
          <button
            type="button"
            onClick={() => setIsSizeMenuOpen(v => !v)}
            className={`p-1.5 rounded-lg border transition shadow-2xs cursor-pointer ${
              isSizeMenuOpen
                ? 'bg-violet-50 border-violet-400 text-violet-700'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:text-slate-600'
            }`}
            title="Chọn kích thước từ danh sách đã lưu"
          >
            <ChevronDown size={12} className={`transition-transform ${isSizeMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSizeMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-64 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                <span>Kích thước gợi ý</span>
                <span className="text-[9px] text-violet-600 font-mono">mm</span>
              </div>
              <div className="py-1">
                {suggestions.map(s => {
                  const isSelected = s === currentFormatted;
                  const isDefault = DEFAULT_RECT_SUGGESTIONS.includes(s) || DEFAULT_CIRCLE_SUGGESTIONS.includes(s);
                  return (
                    <div
                      key={s}
                      onClick={() => handleSelectSuggestion(s)}
                      className={`group flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer select-none transition ${
                        isSelected ? 'bg-violet-50 text-violet-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isSelected ? <Check size={11} className="text-violet-600 shrink-0" /> : <span className="w-3 shrink-0" />}
                        <span className="font-mono">
                          {isCircle ? `Ø ${s} mm` : `${s.replace('x', ' × ')} mm`}
                        </span>
                      </div>
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={e => removeSuggestion(e, s)}
                          className="text-slate-300 hover:text-rose-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                          title="Xóa"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Nút khóa tỉ lệ — cùng hàng */}
        {!isCircle && hasSourceDims && (
          <button
            type="button"
            onClick={() => setIsRatioLocked(!isRatioLocked)}
            className={`p-1.5 rounded-lg border transition shadow-2xs cursor-pointer shrink-0 ${
              isRatioLocked
                ? 'bg-violet-100 border-violet-300 text-violet-700 hover:bg-violet-200'
                : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-200'
            }`}
            title={isRatioLocked ? 'Tỉ lệ đang khóa. Bấm để mở khóa' : 'Tỉ lệ tự do. Bấm để khóa theo ảnh'}
          >
            {isRatioLocked ? <Link size={12} /> : <Unlink size={12} />}
          </button>
        )}
      </div>


    </>
  );
};

export const ImpositionJobDimensions = ImpositionLayerDimensions;
export type ImpositionJobDimensionsProps = ImpositionLayerDimensionsProps;
