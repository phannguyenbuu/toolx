import React, { useState, useEffect, useRef } from 'react';
import { parseDimValue, saveCropSizeSuggestion } from './DimDropdownCombobox';

export interface CropEdgeDimInputProps {
  label?: string;
  value: number;
  suffix?: string;
  arrows: { start: string; end: string };
  isCircle?: boolean;
  onChangeValue: (val: number) => void;
  onDimensionChange?: (w: number, h: number) => void;
  className?: string;
}

export const CropEdgeDimInput: React.FC<CropEdgeDimInputProps> = ({
  label, value, arrows, isCircle = false, onChangeValue, onDimensionChange, className = ''
}) => {
  const [strVal, setStrVal] = useState<string>(() => String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) setStrVal(String(value));
  }, [value]);

  const commitValue = (text: string) => {
    if (onDimensionChange) {
      const parsed = parseDimValue(text, value, value, !!isCircle);
      if (parsed && (text.includes('x') || text.includes('X') || text.includes('*') || text.includes(' '))) {
        onDimensionChange(parsed.w, parsed.h);
        setStrVal(String(parsed.w));
        saveCropSizeSuggestion(isCircle ? `${parsed.w}` : `${parsed.w}x${parsed.h}`);
        return;
      }
    }
    const num = parseFloat(text.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      const rounded = Math.round(num * 10) / 10;
      onChangeValue(rounded);
      setStrVal(String(rounded));
      saveCropSizeSuggestion(String(rounded));
    } else {
      setStrVal(String(value));
    }
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/95 text-violet-200 border border-violet-400/80 shadow-2xl text-xs font-bold font-mono backdrop-blur-md transition-all hover:border-violet-300 cursor-default select-none ${className}`}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <span className="text-violet-400 text-[10px] select-none">{arrows.start}</span>
      {label && <span className="text-violet-300 text-[10px] font-semibold select-none">{label}</span>}
      <input
        type="text"
        value={strVal}
        onFocus={e => { isFocusedRef.current = true; e.target.select(); }}
        onBlur={() => { isFocusedRef.current = false; commitValue(strVal); }}
        onChange={e => {
          setStrVal(e.target.value);
          const num = parseFloat(e.target.value.replace(',', '.'));
          if (!isNaN(num) && num >= 5) onChangeValue(Math.round(num * 10) / 10);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          else if (e.key === 'Escape') { setStrVal(String(value)); (e.target as HTMLInputElement).blur(); }
          else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.max(1, Math.round(((parseFloat(strVal.replace(',', '.')) || value) + (e.shiftKey ? 10 : 1)) * 10) / 10);
            onChangeValue(next); setStrVal(String(next));
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.max(1, Math.round(((parseFloat(strVal.replace(',', '.')) || value) - (e.shiftKey ? 10 : 1)) * 10) / 10);
            onChangeValue(next); setStrVal(String(next));
          }
        }}
        className="w-14 bg-transparent text-center text-xs font-bold text-white focus:outline-none select-text cursor-text"
      />
      <span className="text-[10px] text-slate-400 font-normal">mm</span>
      <span className="text-violet-400 text-[10px] select-none">{arrows.end}</span>
    </div>
  );
};
