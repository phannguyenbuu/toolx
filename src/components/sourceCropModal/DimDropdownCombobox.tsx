import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface ModalNumberInputProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

export const ModalNumberInput: React.FC<ModalNumberInputProps> = ({
  value,
  onChange,
  step = 0.1,
  min = 1,
  max,
  className
}) => {
  const [str, setStr] = useState(String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setStr(String(value));
    }
  }, [value]);

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={str}
      onFocus={(e) => {
        isFocusedRef.current = true;
        e.target.select();
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        let num = parseFloat(str.replace(',', '.'));
        if (!isNaN(num)) {
          if (min !== undefined) num = Math.max(min, num);
          if (max !== undefined) num = Math.min(max, num);
          onChange(num);
          setStr(String(num));
        } else {
          setStr(String(value));
        }
      }}
      onChange={(e) => {
        const val = e.target.value;
        setStr(val);
        let num = parseFloat(val.replace(',', '.'));
        if (!isNaN(num)) {
          if (max !== undefined && num > max) num = max;
          if (min !== undefined && num < min) return;
          onChange(num);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
};

// Storage helpers for size suggestions history
const STORAGE_KEY_SUGGESTIONS = 'toolx_crop_size_suggestions';
export const DEFAULT_RECT_SUGGESTIONS = [
  '90x54', '85x55', '100x100', '50x50', '60x40', '70x100', '148x210', '210x297'
];
export const DEFAULT_CIRCLE_SUGGESTIONS = ['50', '60', '70', '80', '100', '120'];

export const saveCropSizeSuggestion = (sizeStr: string) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUGGESTIONS);
    let list: string[] = raw ? JSON.parse(raw) : [...DEFAULT_RECT_SUGGESTIONS, ...DEFAULT_CIRCLE_SUGGESTIONS];
    const clean = sizeStr.trim().toLowerCase();
    if (!clean) return;
    list = [clean, ...list.filter(s => s !== clean)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_SUGGESTIONS, JSON.stringify(list));
  } catch {}
};

export const parseDimValue = (text: string, currentW: number, currentH: number, isCircle: boolean): { w: number; h: number } | null => {
  const clean = text.trim().toLowerCase();
  if (!clean) return null;

  if (isCircle) {
    const num = parseFloat(clean.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      const val = Math.round(num * 10) / 10;
      return { w: val, h: val };
    }
    return null;
  }

  // Matches "90x50", "90*50", "90X50", "90/50", "90;50"
  const delimMatch = clean.match(/^([\d.,]+)\s*[*xX;/]\s*([\d.,]+)$/);
  if (delimMatch) {
    const w = parseFloat(delimMatch[1].replace(',', '.'));
    const h = parseFloat(delimMatch[2].replace(',', '.'));
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 };
    }
  }

  // Matches space: "90 50"
  const spaceParts = clean.split(/\s+/);
  if (spaceParts.length === 2) {
    const w = parseFloat(spaceParts[0].replace(',', '.'));
    const h = parseFloat(spaceParts[1].replace(',', '.'));
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 };
    }
  }

  // Matches comma with space: "90, 50"
  const commaSpaceMatch = clean.match(/^([\d.]+)\s*,\s*([\d.]+)$/);
  if (commaSpaceMatch) {
    const w = parseFloat(commaSpaceMatch[1]);
    const h = parseFloat(commaSpaceMatch[2]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 };
    }
  }

  // Single number fallback
  const single = parseFloat(clean.replace(',', '.'));
  if (!isNaN(single) && single > 0) {
    return { w: Math.round(single * 10) / 10, h: currentH };
  }

  return null;
};

export interface DimDropdownComboboxProps {
  shape: string;
  w: number;
  h: number;
  onChange: (newW: number, newH: number) => void;
  className?: string;
  imageStandardDim?: { w: number; h: number } | null;
}

export const DimDropdownCombobox: React.FC<DimDropdownComboboxProps> = ({
  shape,
  w,
  h,
  onChange,
  className = '',
  imageStandardDim,
}) => {
  const isCircle = shape === 'circle';
  const formatStr = useCallback((width: number, height: number, circle: boolean) => {
    return circle ? `${width}` : `${width}x${height}`;
  }, []);

  const stdStr = useMemo(() => {
    if (!imageStandardDim || !imageStandardDim.w || !imageStandardDim.h) return null;
    return formatStr(imageStandardDim.w, isCircle ? imageStandardDim.w : imageStandardDim.h, isCircle);
  }, [imageStandardDim, isCircle, formatStr]);

  const [inputVal, setInputVal] = useState<string>(() => formatStr(w, h, isCircle));
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  // Load suggestions from localStorage & prioritize image standard size
  const loadSuggestions = useCallback(() => {
    let baseList: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUGGESTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isCircle) {
            const circleItems = parsed.filter(s => !s.includes('x') && !s.includes('*') && !s.includes(' '));
            baseList = Array.from(new Set([...circleItems, ...DEFAULT_CIRCLE_SUGGESTIONS]));
          } else {
            const rectItems = parsed.filter(s => s.includes('x') || s.includes('*') || s.includes(' '));
            baseList = Array.from(new Set([...rectItems, ...DEFAULT_RECT_SUGGESTIONS]));
          }
        }
      }
    } catch {}
    if (baseList.length === 0) {
      baseList = isCircle ? DEFAULT_CIRCLE_SUGGESTIONS : DEFAULT_RECT_SUGGESTIONS;
    }

    if (stdStr) {
      setSuggestions([stdStr, ...baseList.filter(s => s !== stdStr)]);
    } else {
      setSuggestions(baseList);
    }
  }, [isCircle, stdStr]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Sync external w, h changes
  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputVal(formatStr(w, h, isCircle));
    }
  }, [w, h, isCircle, formatStr]);

  const removeSuggestion = (e: React.MouseEvent, targetSize: string) => {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUGGESTIONS);
      let list: string[] = raw ? JSON.parse(raw) : [...DEFAULT_RECT_SUGGESTIONS, ...DEFAULT_CIRCLE_SUGGESTIONS];
      list = list.filter(s => s !== targetSize);
      localStorage.setItem(STORAGE_KEY_SUGGESTIONS, JSON.stringify(list));
      loadSuggestions();
    } catch {}
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const commitValue = (valToCommit: string) => {
    const parsed = parseDimValue(valToCommit, w, h, isCircle);
    if (parsed) {
      const finalW = Math.max(1, parsed.w);
      const finalH = isCircle ? finalW : Math.max(1, parsed.h);
      onChange(finalW, finalH);
      const formatted = formatStr(finalW, finalH, isCircle);
      setInputVal(formatted);
      saveCropSizeSuggestion(formatted);
      loadSuggestions();
    } else {
      setInputVal(formatStr(w, h, isCircle));
    }
  };

  const handleSelectSuggestion = (sizeStr: string) => {
    setInputVal(sizeStr);
    commitValue(sizeStr);
    setIsOpen(false);
  };

  const currentFormatted = formatStr(w, h, isCircle);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Combobox container */}
      <div className="flex items-center bg-white hover:bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 shadow-2xs gap-0.5 focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-violet-300">
        <input
          type="text"
          value={inputVal}
          onFocus={(e) => {
            isFocusedRef.current = true;
            e.target.select();
            setIsOpen(true);
          }}
          onBlur={() => {
            isFocusedRef.current = false;
            commitValue(inputVal);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setInputVal(val);
            const parsed = parseDimValue(val, w, h, isCircle);
            if (parsed && (val.includes('x') || val.includes('*') || val.includes(' ') || isCircle)) {
              const finalW = Math.max(1, parsed.w);
              const finalH = isCircle ? finalW : Math.max(1, parsed.h);
              onChange(finalW, finalH);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
              setIsOpen(false);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={isCircle ? '100' : '100x100'}
          className="w-16 bg-transparent text-center font-bold text-xs text-slate-800 focus:outline-none"
        />
        <span className="text-[10px] text-slate-400 font-medium select-none">mm</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          title="Chọn kích thước từ gợi ý / chuẩn ảnh"
        >
          <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-64 overflow-y-auto backdrop-blur-md">
          {/* Mục ưu tiên hàng đầu: Kích thước chuẩn của ảnh (Ảnh gốc) */}
          {stdStr && (
            <div className="px-1.5 pt-1 pb-1 border-b border-slate-100">
              <div
                onClick={() => handleSelectSuggestion(stdStr)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                  (currentFormatted === stdStr || inputVal === stdStr)
                    ? 'bg-violet-600 text-white font-bold shadow-xs'
                    : 'hover:bg-violet-50 text-slate-800 font-semibold'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono">
                  {(currentFormatted === stdStr || inputVal === stdStr) ? (
                    <Check size={12} className="text-white" />
                  ) : (
                    <span className="w-3" />
                  )}
                  <span>{isCircle ? `Ø ${stdStr} mm` : `${stdStr.replace('x', ' × ')} mm`}</span>
                </div>
                <span className={`text-[10px] font-sans ${currentFormatted === stdStr || inputVal === stdStr ? 'text-violet-100 font-medium' : 'text-violet-600 font-semibold'}`}>
                  Ảnh gốc
                </span>
              </div>
            </div>
          )}

          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Kích thước gợi ý</span>
            <span className="text-[9px] text-violet-600 font-mono">mm</span>
          </div>
          <div className="py-1">
            {suggestions.filter(s => s !== stdStr).map((s) => {
              const isSelected = s === currentFormatted || s === inputVal;
              return (
                <div
                  key={s}
                  onClick={() => handleSelectSuggestion(s)}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer select-none transition ${
                    isSelected
                      ? 'bg-violet-50 text-violet-800 font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isSelected ? <Check size={12} className="text-violet-600" /> : <span className="w-3" />}
                    <span className="font-mono">{isCircle ? `Ø ${s} mm` : `${s.replace('x', ' × ')} mm`}</span>
                  </div>
                  {!DEFAULT_RECT_SUGGESTIONS.includes(s) && !DEFAULT_CIRCLE_SUGGESTIONS.includes(s) && (
                    <button
                      type="button"
                      onClick={(e) => removeSuggestion(e, s)}
                      className="text-slate-300 hover:text-rose-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                      title="Xóa gợi ý này"
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
  );
};
