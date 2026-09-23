import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Check, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  ZoomIn, ZoomOut, Move, Eye, EyeOff, Upload, Sparkles,
  RefreshCw, Scissors, Grid, Layers, Plus, Edit3,
  ChevronDown, Zap, Loader2, Trash2
} from 'lucide-react';
import {
  ColorAdjustSettings,
  DEFAULT_COLOR_SETTINGS,
  COLOR_PRESETS,
  CurvePoint,
  applyColorAdjustments,
  isDefaultColorSettings
} from '../utils/colorAdjustment';
import { ColorCurveEditor, CurveChannelType } from './ColorCurveEditor';

export interface CropTransform {
  zoom: number; // 0.2 .. 5.0
  panX: number; // px offset
  panY: number; // px offset
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  aspectMode: 'item' | '1:1' | '4:3' | '16:9' | 'free';
}

export const DEFAULT_CROP_TRANSFORM: CropTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  aspectMode: 'item',
};

export interface CropModalLayerTab {
  id: string;
  name: string;
  enabled: boolean;
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon' | 'custom-svg' | 'svg-image' | 'pdf-source';
  itemW: number;
  itemH: number;
  quantity: number;
  useTotalLimit?: boolean;
  cornerRadius?: number;
  sourceImage?: any;
  vectorMaskResult?: any;
  customSvgData?: string;
  color?: string;
  autoRotateImage?: boolean;
  canRotate?: boolean;
}

const TAB_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#3b82f6', '#84cc16', '#6366f1'];
const LAYER_COLOR_PRESETS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#64748b'
];

interface ModalNumberInputProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

const ModalNumberInput: React.FC<ModalNumberInputProps> = ({
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
          if (min !== undefined && num < min) return; // allow user to delete and retype
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
const DEFAULT_RECT_SUGGESTIONS = [
  '90x54', '85x55', '100x100', '50x50', '60x40', '70x100', '148x210', '210x297'
];
const DEFAULT_CIRCLE_SUGGESTIONS = ['50', '60', '70', '80', '100', '120'];

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

const parseDimValue = (text: string, currentW: number, currentH: number, isCircle: boolean): { w: number; h: number } | null => {
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

// Dropdownlist with history suggestions and freeform input for dimensions
interface DimDropdownComboboxProps {
  shape: string;
  w: number;
  h: number;
  onChange: (newW: number, newH: number) => void;
  className?: string;
}

const DimDropdownCombobox: React.FC<DimDropdownComboboxProps> = ({
  shape,
  w,
  h,
  onChange,
  className = '',
}) => {
  const isCircle = shape === 'circle';
  const formatStr = useCallback((width: number, height: number, circle: boolean) => {
    return circle ? `${width}` : `${width}x${height}`;
  }, []);

  const [inputVal, setInputVal] = useState<string>(() => formatStr(w, h, isCircle));
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  // Load suggestions from localStorage
  const loadSuggestions = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUGGESTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isCircle) {
            const circleItems = parsed.filter(s => !s.includes('x') && !s.includes('*') && !s.includes(' '));
            setSuggestions(Array.from(new Set([...circleItems, ...DEFAULT_CIRCLE_SUGGESTIONS])));
            return;
          } else {
            const rectItems = parsed.filter(s => s.includes('x') || s.includes('*') || s.includes(' '));
            setSuggestions(Array.from(new Set([...rectItems, ...DEFAULT_RECT_SUGGESTIONS])));
            return;
          }
        }
      }
    } catch {}
    setSuggestions(isCircle ? DEFAULT_CIRCLE_SUGGESTIONS : DEFAULT_RECT_SUGGESTIONS);
  }, [isCircle]);

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
          title="Chọn kích thước từ gợi ý / lịch sử"
        >
          <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-56 overflow-y-auto backdrop-blur-md">
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Kích thước gợi ý</span>
            <span className="text-[9px] text-violet-600 font-mono">mm</span>
          </div>
          <div className="py-1">
            {suggestions.map((s) => {
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
                    {isSelected ? (
                      <Check size={12} className="text-violet-600" />
                    ) : (
                      <span className="w-3" />
                    )}
                    <span className="font-mono">
                      {isCircle ? `Ø ${s} mm` : `${s.replace('x', ' × ')} mm`}
                    </span>
                  </div>
                  {!DEFAULT_RECT_SUGGESTIONS.includes(s) && !DEFAULT_CIRCLE_SUGGESTIONS.includes(s) && (
                    <button
                      type="button"
                      onClick={(e) => removeSuggestion(e, s)}
                      className="p-0.5 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"
                      title="Xóa gợi ý này"
                    >
                      <Trash2 size={11} />
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

// Interactive Edge Dimension Badge Input directly on the crop box edges (compact & no text labels)
interface CropEdgeDimInputProps {
  label?: string;
  value: number;
  suffix?: string;
  arrows: { start: string; end: string };
  isCircle?: boolean;
  onChangeValue: (val: number) => void;
  onDimensionChange?: (w: number, h: number) => void;
  className?: string;
}

const CropEdgeDimInput: React.FC<CropEdgeDimInputProps> = ({
  label,
  value,
  suffix,
  arrows,
  isCircle = false,
  onChangeValue,
  onDimensionChange,
  className = '',
}) => {
  const [strVal, setStrVal] = useState<string>(() => String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setStrVal(String(value));
    }
  }, [value]);

  const commitValue = (text: string) => {
    if (onDimensionChange) {
      const parsed = parseDimValue(text, value, value, !!isCircle);
      if (parsed && (text.includes('x') || text.includes('X') || text.includes('*') || text.includes(' ') || text.includes(','))) {
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
      className={`pointer-events-auto flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/95 text-violet-200 border border-violet-400/80 shadow-2xl text-xs font-bold font-mono backdrop-blur-md transition-all hover:border-violet-300 hover:shadow-violet-500/25 focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-violet-300 cursor-default select-none ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="text-violet-400 text-[10px] select-none">{arrows.start}</span>
      {label && <span className="text-violet-300 text-[10px] font-semibold select-none">{label}</span>}
      <input
        type="text"
        value={strVal}
        onFocus={(e) => {
          isFocusedRef.current = true;
          e.target.select();
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          commitValue(strVal);
        }}
        onChange={(e) => {
          const val = e.target.value;
          setStrVal(val);
          if (onDimensionChange) {
            const parsed = parseDimValue(val, value, value, !!isCircle);
            if (parsed && (val.includes('x') || val.includes('X') || val.includes('*') || val.includes(' '))) {
              onDimensionChange(parsed.w, parsed.h);
              return;
            }
          }
          const num = parseFloat(val.replace(',', '.'));
          if (!isNaN(num) && num >= 5) {
            const rounded = Math.round(num * 10) / 10;
            onChangeValue(rounded);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setStrVal(String(value));
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const currentNum = parseFloat(strVal.replace(',', '.')) || value;
            const next = Math.max(1, Math.round((currentNum + step) * 10) / 10);
            onChangeValue(next);
            setStrVal(String(next));
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const currentNum = parseFloat(strVal.replace(',', '.')) || value;
            const next = Math.max(1, Math.round((currentNum - step) * 10) / 10);
            onChangeValue(next);
            setStrVal(String(next));
          }
        }}
        title="Nhập kích thước trực tiếp (hỗ trợ phím ↑/↓ để tăng/giảm 1mm)"
        className="w-10 px-1 py-0.5 text-center font-bold font-mono text-xs text-white bg-slate-800/90 hover:bg-slate-700/80 focus:bg-violet-950 focus:text-violet-100 rounded border border-violet-500/50 focus:border-violet-400 focus:outline-none shadow-inner cursor-text transition-colors"
      />
      <span className="text-violet-300 text-[10px] font-mono select-none">
        {suffix || 'mm'}
      </span>
      <span className="text-violet-400 text-[10px] select-none">{arrows.end}</span>
    </div>
  );
};


interface SourceImageCropColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  imageName?: string;
  itemW: number; // mm
  itemH: number; // mm
  shape?: string; // 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon' | ...
  cutBleed?: number; // mm (bù tràn lề outpaint)
  gap?: number; // mm (khoảng cách giữa các tem)
  initialColorSettings?: ColorAdjustSettings;
  initialCropSettings?: CropTransform;
  initialBleedBounds?: { leftRatio: number; rightRatio: number; topRatio: number; bottomRatio: number } | null;
  initialBleedPercent?: number;
  shapeTabs?: CropModalLayerTab[];
  activeTabId?: string;
  onApply: (result: {
    dataUrl: string;
    originalImage: string;
    w_mm: number;
    h_mm: number;
    colorSettings: ColorAdjustSettings;
    cropSettings: CropTransform;
    filename?: string;
    updatedTabs?: CropModalLayerTab[];
    activeTabId?: string;
    bleedBounds?: { leftRatio: number; rightRatio: number; topRatio: number; bottomRatio: number } | null;
    bleedPercent?: number;
    bleedMm?: number;
    addedGapMm?: number;
  }) => void;
}

export const SourceImageCropColorModal: React.FC<SourceImageCropColorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'Ảnh nguồn',
  itemW,
  itemH,
  shape = 'rect',
  cutBleed = 2,
  gap = 0,
  initialColorSettings,
  initialCropSettings,
  initialBleedBounds,
  initialBleedPercent,
  shapeTabs,
  activeTabId,
  onApply,
}) => {
  // Layer Tabs State (cloned from outside canvas)
  const [tabs, setTabs] = useState<CropModalLayerTab[]>([]);
  const [currentTabId, setCurrentTabId] = useState<string>('tab-a');

  // Layer editing modal toast state
  const [editingLayerTab, setEditingLayerTab] = useState<CropModalLayerTab | null>(null);
  const [editLayerName, setEditLayerName] = useState('');
  const [editLayerColor, setEditLayerColor] = useState('#8b5cf6');

  // Active layer dimensions, shape, quantity state
  const [localItemW, setLocalItemW] = useState<number>(itemW || 100);
  const [localItemH, setLocalItemH] = useState<number>(shape === 'circle' ? (itemW || 100) : (itemH || 100));
  const [localShape, setLocalShape] = useState<string>(shape || 'rect');
  const [localQuantity, setLocalQuantity] = useState<number>(10);

  // Source image state
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(imageUrl);
  const [currentFileName, setCurrentFileName] = useState<string>(imageName);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Crop & Transform state
  const [crop, setCrop] = useState<CropTransform>(() => ({
    ...DEFAULT_CROP_TRANSFORM,
    ...(initialCropSettings || {})
  }));

  // Color adjustment state
  const [colorSettings, setColorSettings] = useState<ColorAdjustSettings>(() => ({
    ...DEFAULT_COLOR_SETTINGS,
    ...(initialColorSettings || {})
  }));
  const [colorTab, setColorTab] = useState<'balance' | 'curves' | 'brightness' | 'hsl' | 'cmyk' | 'rgb' | 'bleed'>('bleed');
  const [curveChannel, setCurveChannel] = useState<CurveChannelType>('rgb');
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Bleed Studio state (Off / Offset / AI)
  const [bleedMode, setBleedMode] = useState<'off' | 'offset' | 'ai'>('ai');
  const [bleedPercent, setBleedPercent] = useState<number>(10);
  const [isProcessingBleed, setIsProcessingBleed] = useState(false);
  const [originalBackupSrc, setOriginalBackupSrc] = useState<string | null>(null);
  const [originalBleedBounds, setOriginalBleedBounds] = useState<{
    leftRatio: number;
    rightRatio: number;
    topRatio: number;
    bottomRatio: number;
  } | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number } | null>(null);
  const [bleedStatusMsg, setBleedStatusMsg] = useState<string | null>(null);
  const [bleedGapMode, setBleedGapMode] = useState<'expand_gap' | 'shrink_item'>('expand_gap');

  // Dragging state for Pan
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  // DOM Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync props on open
  useEffect(() => {
    if (isOpen) {
      setColorTab('bleed');
      setOriginalBackupSrc(null);
      setOriginalDimensions(null);
      if (shapeTabs && shapeTabs.length > 0) {
        const clonedTabs: CropModalLayerTab[] = JSON.parse(JSON.stringify(shapeTabs));
        setTabs(clonedTabs);
        const initId = activeTabId && clonedTabs.some(t => t.id === activeTabId)
          ? activeTabId
          : clonedTabs[0].id;
        setCurrentTabId(initId);
        const curTab = clonedTabs.find(t => t.id === initId) || clonedTabs[0];
        const curW = curTab.itemW || itemW || 100;
        const curH = curTab.shape === 'circle' ? curW : (curTab.itemH || itemH || 100);
        setLocalItemW(curW);
        setLocalItemH(curH);
        setLocalShape(curTab.shape || shape || 'rect');
        setLocalQuantity(curTab.quantity || 10);

        const srcImg = curTab.sourceImage;
        const srcUrl = srcImg?.originalThumb || srcImg?.thumb || imageUrl || null;
        setCurrentImageSrc(srcUrl);
        setCurrentFileName(srcImg?.name || imageName || `Layer ${curTab.name}`);
        setCrop(srcImg?.cropSettings || initialCropSettings || { ...DEFAULT_CROP_TRANSFORM });
        setColorSettings(srcImg?.colorSettings || initialColorSettings || { ...DEFAULT_COLOR_SETTINGS });
        const existingBounds = srcImg?.bleedBounds || initialBleedBounds || null;
        setOriginalBleedBounds(existingBounds);
        if (srcImg?.bleedPercent || initialBleedPercent) {
          setBleedPercent(srcImg?.bleedPercent || initialBleedPercent || 5);
        }
      } else {
        const fallbackTab: CropModalLayerTab = {
          id: 'tab-a',
          name: 'A',
          enabled: true,
          shape: (shape as any) || 'rect',
          itemW: itemW || 100,
          itemH: shape === 'circle' ? (itemW || 100) : (itemH || 100),
          quantity: 10,
          useTotalLimit: false,
          cornerRadius: 0,
          sourceImage: imageUrl ? {
            fileIndex: 0,
            pageIndex: 1,
            thumb: imageUrl,
            originalThumb: imageUrl,
            name: imageName,
            w: itemW,
            h: shape === 'circle' ? itemW : itemH,
            rotation: 0,
            cropSettings: initialCropSettings,
            colorSettings: initialColorSettings,
            bleedBounds: initialBleedBounds || undefined,
            bleedPercent: initialBleedPercent || undefined,
          } : null,
          color: '#8b5cf6',
          autoRotateImage: true,
          canRotate: true,
        };
        setTabs([fallbackTab]);
        setCurrentTabId('tab-a');
        setLocalItemW(fallbackTab.itemW);
        setLocalItemH(fallbackTab.itemH);
        setLocalShape(fallbackTab.shape);
        setLocalQuantity(fallbackTab.quantity);
        setCurrentImageSrc(imageUrl);
        setCurrentFileName(imageName);
        if (initialColorSettings) setColorSettings({ ...initialColorSettings });
        if (initialCropSettings) setCrop({ ...initialCropSettings });
        setOriginalBleedBounds(initialBleedBounds || null);
        if (initialBleedPercent) {
          setBleedPercent(initialBleedPercent);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load image element when source changes
  useEffect(() => {
    if (!currentImageSrc) {
      setImgElement(null);
      setImgLoaded(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgElement(img);
      setImgLoaded(true);
    };
    img.onerror = () => {
      setImgLoaded(false);
    };
    img.src = currentImageSrc;
  }, [currentImageSrc]);

  // Target aspect ratio for crop frame
  const targetRatio = useMemo(() => {
    if (crop.aspectMode === '1:1') return 1;
    if (crop.aspectMode === '4:3') return 4 / 3;
    if (crop.aspectMode === '16:9') return 16 / 9;
    if (crop.aspectMode === 'free') return localItemW / (localItemH || localItemW);
    // 'item' mode
    const effH = localShape === 'circle' ? localItemW : (localItemH || localItemW);
    return localItemW / (effH || 1);
  }, [crop.aspectMode, localItemW, localItemH, localShape]);

  // Viewport & Crop box calculations
  const [viewportSize, setViewportSize] = useState({ w: 500, h: 420 });
  useEffect(() => {
    const updateSize = () => {
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          setViewportSize({ w: rect.width, h: rect.height });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  // Calculate crop box pixel size in viewport (leaving room for dim badges)
  const cropBox = useMemo(() => {
    const padX = 95; // Leave room for right dim height badge
    const padY = 55; // Leave room for top dim width badge
    const maxW = Math.max(100, viewportSize.w - padX * 2);
    const maxH = Math.max(100, viewportSize.h - padY * 2);

    let w = maxW;
    let h = w / targetRatio;
    if (h > maxH) {
      h = maxH;
      w = h * targetRatio;
    }
    const x = (viewportSize.w - w) / 2;
    const y = (viewportSize.h - h) / 2;
    return { x, y, w, h };
  }, [viewportSize, targetRatio]);

  // Bleed / Outpaint pixel size calculation
  const effectiveBleedMm = useMemo(() => {
    if (bleedMode === 'off') return 0;
    const percentMm = Math.round((localItemW * (bleedPercent / 100) / 2) * 10) / 10;
    return Math.max(1, percentMm);
  }, [bleedMode, localItemW, bleedPercent]);

  const pxPerMm = useMemo(() => {
    return (cropBox.w && localItemW) ? (cropBox.w / localItemW) : 1;
  }, [cropBox.w, localItemW]);

  const bleedPx = useMemo(() => {
    if (bleedMode === 'off') return 0;
    return Math.round(effectiveBleedMm * pxPerMm);
  }, [bleedMode, effectiveBleedMm, pxPerMm]);

  // Create continuous pixel offset outward (Replicate border clamp in 2D canvas)
  const applyOffsetBleed = () => {
    if (!imgElement || !imgLoaded || !currentImageSrc) return;
    if (!originalBackupSrc) {
      setOriginalBackupSrc(currentImageSrc);
    }
    const origW = originalDimensions?.w || imgElement.naturalWidth || imgElement.width;
    const origH = originalDimensions?.h || imgElement.naturalHeight || imgElement.height;
    if (!originalDimensions) {
      setOriginalDimensions({ w: origW, h: origH });
    }
    setIsProcessingBleed(true);

    try {
      const halfRatio = (bleedPercent / 100) / 2.0;
      const padW = Math.max(2, Math.round(origW * halfRatio));
      const padH = Math.max(2, Math.round(origH * halfRatio));
      const newW = origW + padW * 2;
      const newH = origH + padH * 2;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = newW;
      offCanvas.height = newH;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      // 1. Draw central original image
      offCtx.drawImage(imgElement, padW, padH, origW, origH);

      // 2. Continuous offset: Stretch top edge outward (1px slice stretched to padH)
      offCtx.drawImage(imgElement, 0, 0, origW, 1, padW, 0, origW, padH);

      // 3. Stretch bottom edge outward (1px slice)
      offCtx.drawImage(imgElement, 0, origH - 1, origW, 1, padW, padH + origH, origW, padH);

      // 4. Stretch left edge outward (1px slice)
      offCtx.drawImage(imgElement, 0, 0, 1, origH, 0, padH, padW, origH);

      // 5. Stretch right edge outward (1px slice)
      offCtx.drawImage(imgElement, origW - 1, 0, 1, origH, padW + origW, padH, padW, origH);

      // 6. 4 Corners (1x1 pixel stretched into corner rects)
      offCtx.drawImage(imgElement, 0, 0, 1, 1, 0, 0, padW, padH);
      offCtx.drawImage(imgElement, origW - 1, 0, 1, 1, padW + origW, 0, padW, padH);
      offCtx.drawImage(imgElement, 0, origH - 1, 1, 1, 0, padH + origH, padW, padH);
      offCtx.drawImage(imgElement, origW - 1, origH - 1, 1, 1, padW + origW, padH + origH, padW, padH);

      const resultDataUrl = offCanvas.toDataURL('image/jpeg', 0.95);
      setOriginalBleedBounds({
        leftRatio: padW / newW,
        rightRatio: padW / newW,
        topRatio: padH / newH,
        bottomRatio: padH / newH,
      });
      setCurrentImageSrc(resultDataUrl);
    } catch (err: any) {
      console.error('Lỗi khi tạo Offset:', err);
    } finally {
      setIsProcessingBleed(false);
    }
  };

  // Run AI Outpainting using backend LaMa model
  const applyAIBleed = async () => {
    if (!imgElement || !currentImageSrc) return;
    const srcToUse = originalBackupSrc || currentImageSrc;
    if (!originalBackupSrc) {
      setOriginalBackupSrc(currentImageSrc);
    }
    const origW = originalDimensions?.w || imgElement.naturalWidth || imgElement.width;
    const origH = originalDimensions?.h || imgElement.naturalHeight || imgElement.height;
    if (!originalDimensions) {
      setOriginalDimensions({ w: origW, h: origH });
    }
    setIsProcessingBleed(true);

    const half = (bleedPercent / 100) / 2.0;
    const padW = Math.round(origW * half);
    const padH = Math.round(origH * half);
    const newW = origW + padW * 2;
    const newH = origH + padH * 2;
    const bounds = {
      leftRatio: padW / newW,
      rightRatio: padW / newW,
      topRatio: padH / newH,
      bottomRatio: padH / newH,
    };

    try {
      const res = await fetch(srcToUse);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('file', blob, 'source.jpg');
      formData.append('percent', (bleedPercent / 100).toFixed(2));
      formData.append('mode', 'smart_portrait');
      formData.append('format', 'image');

      const apiRes = await fetch('/api/outpaint-bleed', {
        method: 'POST',
        body: formData,
      });

      if (!apiRes.ok) {
        throw new Error(`AI Outpaint thất bại (HTTP ${apiRes.status})`);
      }

      const outBlob = await apiRes.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setOriginalBleedBounds(bounds);
          setCurrentImageSrc(e.target.result as string);
        }
      };
      reader.readAsDataURL(outBlob);
    } catch (err: any) {
      console.warn('AI Outpaint failed, falling back to local offset:', err);
      applyOffsetBleed();
    } finally {
      setIsProcessingBleed(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (originalBackupSrc) {
      setCurrentImageSrc(originalBackupSrc);
      setOriginalBackupSrc(null);
      setOriginalBleedBounds(null);
      setOriginalDimensions(null);
    }
  };

  // Original Image Rectangle in local centered coordinates (for drawing red boundary line)
  const originalImageRect = useMemo(() => {
    if (!imgElement || !cropBox.w) return null;
    const naturalW = imgElement.naturalWidth || imgElement.width;
    const naturalH = imgElement.naturalHeight || imgElement.height;
    if (!naturalW || !naturalH) return null;

    const imgAspect = naturalW / naturalH;
    const baseW = cropBox.w;
    const baseH = baseW / imgAspect;
    const drawW = baseW * crop.zoom;
    const drawH = baseH * crop.zoom;

    if (originalBleedBounds) {
      const x = -drawW / 2 + drawW * originalBleedBounds.leftRatio;
      const y = -drawH / 2 + drawH * originalBleedBounds.topRatio;
      const w = drawW * (1 - originalBleedBounds.leftRatio - originalBleedBounds.rightRatio);
      const h = drawH * (1 - originalBleedBounds.topRatio - originalBleedBounds.bottomRatio);
      return { x, y, w, h };
    }

    if (bleedMode !== 'off') {
      return {
        x: -drawW / 2,
        y: -drawH / 2,
        w: drawW,
        h: drawH,
      };
    }

    return null;
  }, [imgElement, cropBox.w, crop.zoom, originalBleedBounds, bleedMode]);

  // Color adjustment helper
  const updateSetting = <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => {
    setColorSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setColorSettings(prev => ({ ...prev, ...preset.settings }));
  };

  const handleResetColor = () => {
    setColorSettings({ ...DEFAULT_COLOR_SETTINGS });
  };

  const handleResetCrop = () => {
    setCrop({ ...DEFAULT_CROP_TRANSFORM });
  };

  // Upload new image from local
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      if (result) {
        setCurrentImageSrc(result);
        setCurrentFileName(file.name);
        setOriginalBackupSrc(null);
        setOriginalBleedBounds(null);
        setOriginalDimensions(null);
        handleResetCrop();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Mouse pan event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only main left click
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: crop.panX,
      panY: crop.panY,
    };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCrop(c => ({
      ...c,
      panX: dragStartRef.current.panX + dx,
      panY: dragStartRef.current.panY + dy,
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setCrop(c => ({
      ...c,
      zoom: Math.min(5, Math.max(0.2, Math.round(c.zoom * zoomFactor * 100) / 100))
    }));
  };

  // Live Canvas Rendering (Crop + Color Balance + Outpaint / Bleed Visibility across full viewport)
  useEffect(() => {
    if (!isOpen || !imgElement || !imgLoaded || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport dimensions (full extent to reveal outpaint / bleed outside crop box)
    const vw = Math.max(100, Math.round(viewportSize.w));
    const vh = Math.max(100, Math.round(viewportSize.h));

    canvas.width = vw;
    canvas.height = vh;

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();

    // Center of crop box in the viewport
    const centerX = cropBox.x + cropBox.w / 2;
    const centerY = cropBox.y + cropBox.h / 2;

    ctx.translate(centerX + crop.panX, centerY + crop.panY);
    ctx.rotate((crop.rotation * Math.PI) / 180);
    ctx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

    // Scale image relative to crop box
    const imgAspect = imgElement.width / imgElement.height;
    const baseW = cropBox.w;
    const baseH = baseW / imgAspect;

    const drawW = baseW * crop.zoom;
    const drawH = baseH * crop.zoom;

    ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Apply color adjustments if not showing original
    if (!showOriginal && !isDefaultColorSettings(colorSettings)) {
      try {
        const imageData = ctx.getImageData(0, 0, vw, vh);
        applyColorAdjustments(imageData, ctx, colorSettings);
      } catch (err) {
        console.error('Error applying color adjustment:', err);
      }
    }
  }, [isOpen, imgElement, imgLoaded, cropBox, crop, colorSettings, showOriginal, viewportSize]);

  // Export high-resolution canvas dataUrl
  const renderCurrentExportDataUrl = useCallback((): string | null => {
    if (!imgElement || !imgLoaded || !previewCanvasRef.current) return currentImageSrc;
    const exportScale = 3;
    const exportW = Math.max(1, Math.round(cropBox.w * exportScale));
    const exportH = Math.max(1, Math.round(cropBox.h * exportScale));

    const offCanvas = document.createElement('canvas');
    offCanvas.width = exportW;
    offCanvas.height = exportH;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return currentImageSrc;

    offCtx.save();
    offCtx.translate(exportW / 2 + crop.panX * exportScale, exportH / 2 + crop.panY * exportScale);
    offCtx.rotate((crop.rotation * Math.PI) / 180);
    offCtx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

    const imgAspect = imgElement.width / imgElement.height;
    const baseW = exportW;
    const baseH = baseW / imgAspect;
    const drawW = baseW * crop.zoom;
    const drawH = baseH * crop.zoom;
    offCtx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    offCtx.restore();

    if (!isDefaultColorSettings(colorSettings)) {
      try {
        const imgData = offCtx.getImageData(0, 0, exportW, exportH);
        applyColorAdjustments(imgData, offCtx, colorSettings);
      } catch (e) {
        console.error('Export color error:', e);
      }
    }
    return offCanvas.toDataURL('image/png', 0.95);
  }, [imgElement, imgLoaded, cropBox.w, cropBox.h, crop, colorSettings, currentImageSrc]);

  // Generate lightweight thumbnail (max 320px, JPEG 0.8, ~20KB) for fast UI/DOM rendering
  const renderPreviewThumbnail = useCallback((maxDim: number = 320): string | null => {
    if (!imgElement || !imgLoaded || !previewCanvasRef.current) return currentImageSrc;
    const boxW = Math.max(1, cropBox.w);
    const boxH = Math.max(1, cropBox.h);
    const scale = Math.min(1, maxDim / Math.max(boxW, boxH));
    const exportW = Math.max(1, Math.round(boxW * scale));
    const exportH = Math.max(1, Math.round(boxH * scale));

    const offCanvas = document.createElement('canvas');
    offCanvas.width = exportW;
    offCanvas.height = exportH;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return currentImageSrc;

    offCtx.save();
    offCtx.translate(exportW / 2 + crop.panX * scale, exportH / 2 + crop.panY * scale);
    offCtx.rotate((crop.rotation * Math.PI) / 180);
    offCtx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

    const imgAspect = imgElement.width / imgElement.height;
    const baseW = exportW;
    const baseH = baseW / imgAspect;
    const drawW = baseW * crop.zoom;
    const drawH = baseH * crop.zoom;
    offCtx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    offCtx.restore();

    if (!isDefaultColorSettings(colorSettings)) {
      try {
        const imgData = offCtx.getImageData(0, 0, exportW, exportH);
        applyColorAdjustments(imgData, offCtx, colorSettings);
      } catch (e) {
        console.error('Thumbnail color error:', e);
      }
    }
    return offCanvas.toDataURL('image/jpeg', 0.8);
  }, [imgElement, imgLoaded, cropBox.w, cropBox.h, crop, colorSettings, currentImageSrc]);

  // --- LAYER MANAGEMENT HANDLERS (CLONED FROM CANVAS) ---
  const handleSwitchTab = (targetTabId: string) => {
    if (targetTabId === currentTabId) return;

    // 1. Commit current active tab state into tabs array with lightweight preview thumbnail
    const croppedThumb = currentImageSrc ? (renderPreviewThumbnail(320) || currentImageSrc) : null;
    const currentEffH = localShape === 'circle' ? localItemW : localItemH;

    const committedTabs = tabs.map(t => {
      if (t.id === currentTabId) {
        return {
          ...t,
          itemW: localItemW,
          itemH: currentEffH,
          shape: localShape as any,
          quantity: localQuantity,
          sourceImage: currentImageSrc ? {
            fileIndex: 0,
            pageIndex: 1,
            thumb: croppedThumb || currentImageSrc,
            originalThumb: currentImageSrc,
            name: currentFileName,
            w: localItemW,
            h: currentEffH,
            rotation: 0,
            cropSettings: crop,
            colorSettings: colorSettings,
          } : t.sourceImage,
        };
      }
      return t;
    });
    setTabs(committedTabs);

    // 2. Switch to target tab
    const targetTab = committedTabs.find(t => t.id === targetTabId);
    if (!targetTab) return;

    setCurrentTabId(targetTabId);
    const targetW = targetTab.itemW || 100;
    const targetH = targetTab.shape === 'circle' ? targetW : (targetTab.itemH || 100);
    setLocalItemW(targetW);
    setLocalItemH(targetH);
    setLocalShape(targetTab.shape || 'rect');
    setLocalQuantity(targetTab.quantity || 10);

    const srcImg = targetTab.sourceImage;
    const nextSrc = srcImg?.originalThumb || srcImg?.thumb || null;
    setCurrentImageSrc(nextSrc);
    setOriginalBackupSrc(null);
    setOriginalBleedBounds(srcImg?.bleedBounds || null);
    if (srcImg?.bleedPercent) {
      setBleedPercent(srcImg.bleedPercent);
    }
    setOriginalDimensions(null);
    setCurrentFileName(srcImg?.name || `Layer ${targetTab.name}`);
    setCrop(srcImg?.cropSettings || { ...DEFAULT_CROP_TRANSFORM });
    setColorSettings(srcImg?.colorSettings || { ...DEFAULT_COLOR_SETTINGS });
  };

  const handleAddTabInModal = () => {
    // 1. Commit current active tab with lightweight thumbnail
    const croppedThumb = currentImageSrc ? (renderPreviewThumbnail(320) || currentImageSrc) : null;
    const currentEffH = localShape === 'circle' ? localItemW : localItemH;

    const committedTabs = tabs.map(t => {
      if (t.id === currentTabId) {
        return {
          ...t,
          itemW: localItemW,
          itemH: currentEffH,
          shape: localShape as any,
          quantity: localQuantity,
          sourceImage: currentImageSrc ? {
            fileIndex: 0,
            pageIndex: 1,
            thumb: croppedThumb || currentImageSrc,
            originalThumb: currentImageSrc,
            name: currentFileName,
            w: localItemW,
            h: currentEffH,
            rotation: 0,
            cropSettings: crop,
            colorSettings: colorSettings,
            bleedBounds: originalBleedBounds,
            bleedPercent: bleedMode !== 'off' ? bleedPercent : 0,
          } : t.sourceImage,
        };
      }
      return t;
    });

    // 2. Create new tab
    const nextIndex = committedTabs.length;
    const letter = String.fromCharCode(65 + (nextIndex % 26)) + (nextIndex >= 26 ? Math.floor(nextIndex / 26) : '');
    const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newColor = TAB_COLORS[nextIndex % TAB_COLORS.length];
    const newTab: CropModalLayerTab = {
      id: newId,
      name: letter,
      enabled: true,
      shape: (localShape as any) || 'rect',
      itemW: localItemW || 100,
      itemH: localShape === 'circle' ? localItemW : (localItemH || 100),
      quantity: 10,
      useTotalLimit: true,
      cornerRadius: 0,
      sourceImage: null,
      color: newColor,
      autoRotateImage: true,
      canRotate: true,
    };

    const newTabs = [...committedTabs.map(t => ({ ...t, useTotalLimit: true })), newTab];
    setTabs(newTabs);

    // 3. Switch to new tab
    setCurrentTabId(newId);
    setLocalItemW(newTab.itemW);
    setLocalItemH(newTab.itemH);
    setLocalShape(newTab.shape);
    setLocalQuantity(newTab.quantity);
    setCurrentImageSrc(null);
    setCurrentFileName(`Layer ${newTab.name}`);
    setCrop({ ...DEFAULT_CROP_TRANSFORM });
    setColorSettings({ ...DEFAULT_COLOR_SETTINGS });
  };

  const handleDeleteTabInModal = (tabId: string) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (currentTabId === tabId) {
      const nextTab = remaining[0];
      setCurrentTabId(nextTab.id);
      const nw = nextTab.itemW || 100;
      const nh = nextTab.shape === 'circle' ? nw : (nextTab.itemH || 100);
      setLocalItemW(nw);
      setLocalItemH(nh);
      setLocalShape(nextTab.shape || 'rect');
      setLocalQuantity(nextTab.quantity || 10);
      const srcImg = nextTab.sourceImage;
      setCurrentImageSrc(srcImg?.originalThumb || srcImg?.thumb || null);
      setCurrentFileName(srcImg?.name || `Layer ${nextTab.name}`);
      setCrop(srcImg?.cropSettings || { ...DEFAULT_CROP_TRANSFORM });
      setColorSettings(srcImg?.colorSettings || { ...DEFAULT_COLOR_SETTINGS });
    }
  };

  const handleToggleTab = (tabId: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, enabled: !t.enabled } : t));
  };

  const handleDimChange = (newW: number, newH: number) => {
    const w = Math.max(1, Math.round(newW * 10) / 10);
    const h = localShape === 'circle' ? w : Math.max(1, Math.round(newH * 10) / 10);
    setLocalItemW(w);
    setLocalItemH(h);
    setTabs(prev => prev.map(t => t.id === currentTabId ? {
      ...t,
      itemW: w,
      itemH: h
    } : t));
  };

  const handleWidthChange = (val: number) => {
    const v = Math.max(1, Math.round(val * 10) / 10);
    setLocalItemW(v);
    if (localShape === 'circle') {
      setLocalItemH(v);
    }
    setTabs(prev => prev.map(t => t.id === currentTabId ? {
      ...t,
      itemW: v,
      itemH: localShape === 'circle' ? v : t.itemH
    } : t));
  };

  const handleHeightChange = (val: number) => {
    const v = Math.max(1, Math.round(val * 10) / 10);
    setLocalItemH(v);
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, itemH: v } : t));
  };

  const handleQuantityChange = (val: number) => {
    const q = Math.min(99, Math.max(1, Math.round(val)));
    setLocalQuantity(q);
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, quantity: q } : t));
  };

  const handleShapeChange = (newShape: string) => {
    setLocalShape(newShape);
    let newH = localItemH;
    if (newShape === 'circle') {
      newH = localItemW;
      setLocalItemH(localItemW);
    }
    setTabs(prev => prev.map(t => t.id === currentTabId ? {
      ...t,
      shape: newShape as any,
      itemH: newH
    } : t));
  };

  const handleSaveLayerEdit = () => {
    if (!editingLayerTab) return;
    const trimmed = editLayerName.trim() || 'Mẫu';
    const chosenColor = editLayerColor || editingLayerTab.color || '#8b5cf6';
    setTabs(prev => prev.map(t => t.id === editingLayerTab.id ? { ...t, name: trimmed, color: chosenColor } : t));
    setEditingLayerTab(null);
  };

  // Apply Action: commit all changes and return to Imposition canvas
  const handleApply = () => {
    const previewThumb = currentImageSrc ? (renderPreviewThumbnail(320) || currentImageSrc) : '';
    const fullExportDataUrl = currentImageSrc ? (renderCurrentExportDataUrl() || currentImageSrc) : '';
    const currentEffH = localShape === 'circle' ? localItemW : localItemH;

    const isBleedActive = bleedMode !== 'off' && !!originalBleedBounds;
    const bleedMm = isBleedActive ? effectiveBleedMm : 0;
    const addedGap = (isBleedActive && bleedGapMode === 'expand_gap')
      ? Math.round(effectiveBleedMm * 2 * 10) / 10
      : 0;
    const finalItemW = (isBleedActive && bleedGapMode === 'shrink_item')
      ? Math.max(1, Math.round((localItemW - effectiveBleedMm * 2) * 10) / 10)
      : localItemW;
    const finalItemH = localShape === 'circle'
      ? finalItemW
      : ((isBleedActive && bleedGapMode === 'shrink_item')
          ? Math.max(1, Math.round((localItemH - effectiveBleedMm * 2) * 10) / 10)
          : currentEffH);

    const finalTabs = tabs.map(t => {
      if (t.id === currentTabId) {
        return {
          ...t,
          itemW: finalItemW,
          itemH: finalItemH,
          shape: localShape as any,
          quantity: localQuantity,
          sourceImage: currentImageSrc ? {
            fileIndex: 0,
            pageIndex: 1,
            thumb: previewThumb || currentImageSrc,
            originalThumb: fullExportDataUrl || currentImageSrc,
            name: currentFileName,
            w: finalItemW,
            h: finalItemH,
            rotation: 0,
            cropSettings: crop,
            colorSettings: colorSettings,
            bleedBounds: originalBleedBounds,
            bleedPercent: bleedMode !== 'off' ? bleedPercent : 0,
          } : t.sourceImage,
        };
      }
      return t;
    });

    onApply({
      dataUrl: previewThumb || currentImageSrc || '',
      originalImage: fullExportDataUrl || currentImageSrc || '',
      w_mm: finalItemW,
      h_mm: finalItemH,
      colorSettings,
      cropSettings: crop,
      filename: currentFileName,
      updatedTabs: finalTabs,
      activeTabId: currentTabId,
      bleedBounds: originalBleedBounds,
      bleedPercent: bleedMode !== 'off' ? bleedPercent : 0,
      bleedMm,
      addedGapMm: addedGap,
    });
    onClose();
  };

  if (!isOpen) return null;

  const currentTab = tabs.find(t => t.id === currentTabId) || tabs[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col w-[1180px] max-w-[98vw] h-[92vh] max-h-[840px] overflow-hidden relative">
        {/* HEADER */}
        <div className="px-5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <Scissors size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Ảnh nguồn</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Upload size={14} />
              <span>{currentImageSrc ? 'Đổi ảnh khác' : 'Tải ảnh lên'}</span>
            </button>

            <button
              type="button"
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                showOriginal
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                  : 'bg-white hover:bg-amber-50 border-amber-200 text-amber-800'
              }`}
              title="Nhấn giữ để so sánh với ảnh gốc chưa chỉnh màu"
            >
              {showOriginal ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showOriginal ? 'Đang xem gốc' : 'Giữ xem gốc'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SUBHEADER: LAYER MANAGEMENT (CLONED FROM CANVAS) */}
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-100/80 flex items-center justify-between gap-3 select-none flex-wrap flex-shrink-0">
          {/* Layer Management Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 w-full">
            <div className="flex items-center gap-1.5 shrink-0 pr-1">
              <div className="w-5 h-5 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                <Layers size={12} />
              </div>
              <span className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">
                LAYER ({tabs.length})
              </span>
            </div>

            <div className="w-px h-4 bg-slate-300 shrink-0 mx-0.5" />

            {tabs.map((tab) => {
              const isActive = tab.id === currentTabId;
              const tabColor = tab.color || '#8b5cf6';
              return (
                <div
                  key={tab.id}
                  onClick={() => handleSwitchTab(tab.id)}
                  className={`group/tab relative flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 px-2.5 py-1 rounded-xl border ${
                    isActive
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : tab.enabled
                      ? 'bg-white/60 hover:bg-white text-slate-700 border-slate-200 shadow-2xs'
                      : 'bg-slate-200/50 border-dashed border-slate-300 text-slate-400 opacity-60'
                  }`}
                  style={{ borderColor: isActive ? tabColor : undefined }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: tabColor }}
                  />
                  <span className="font-bold tracking-tight text-[11px] max-w-[80px] truncate">
                    {tab.name}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLayerTab(tab);
                      setEditLayerName(tab.name);
                      setEditLayerColor(tab.color || '#8b5cf6');
                    }}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition"
                    title="Đổi tên & màu layer"
                  >
                    <Edit3 size={11} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTab(tab.id);
                    }}
                    className={`p-0.5 rounded transition ${
                      tab.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={tab.enabled ? 'Đang hiện' : 'Đang ẩn'}
                  >
                    {tab.enabled ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>

                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTabInModal(tab.id);
                      }}
                      className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-rose-100 text-rose-500 transition"
                      title="Xóa layer này"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddTabInModal}
              className="flex items-center justify-center w-6 h-6 rounded-lg border border-dashed border-slate-300 hover:border-violet-400 text-slate-400 hover:text-violet-600 bg-white/70 hover:bg-violet-50 transition cursor-pointer shrink-0"
              title="Thêm layer mới"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* LEFT: CROP & PAN VIEWPORT */}
          <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-900/95 relative overflow-hidden">
            {/* Top Toolbar for Crop & Transform */}
            <div className="p-2 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2 z-10 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mr-1">Tỷ lệ:</span>
                {(['item', '1:1', '4:3', '16:9', 'free'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCrop(c => ({ ...c, aspectMode: mode }))}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer border ${
                      crop.aspectMode === mode
                        ? 'bg-violet-600 border-violet-500 text-white shadow-xs font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    {mode === 'item' ? 'Theo tem' : mode === '1:1' ? '1:1 Vuông' : mode}
                  </button>
                ))}
              </div>

              {/* Transform controls: Rotate, Flip, Reset */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCrop(c => ({ ...c, rotation: (c.rotation - 90 + 360) % 360 }))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  title="Xoay trái 90°"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setCrop(c => ({ ...c, rotation: (c.rotation + 90) % 360 }))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  title="Xoay phải 90°"
                >
                  <RotateCw size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setCrop(c => ({ ...c, flipH: !c.flipH }))}
                  className={`p-1.5 rounded-lg border cursor-pointer ${
                    crop.flipH ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title="Lật ngang"
                >
                  <FlipHorizontal size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setCrop(c => ({ ...c, flipV: !c.flipV }))}
                  className={`p-1.5 rounded-lg border cursor-pointer ${
                    crop.flipV ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title="Lật dọc"
                >
                  <FlipVertical size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowGrid(g => !g)}
                  className={`p-1.5 rounded-lg border cursor-pointer ${
                    showGrid ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title="Lưới bố cục 1/3"
                >
                  <Grid size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleResetCrop}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  title="Đặt lại vị trí & zoom"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Interactive Viewport Area */}
            <div
              ref={viewportRef}
              onMouseDown={handleMouseDown}
              onWheel={handleWheel}
              className={`flex-1 relative flex items-center justify-center overflow-hidden select-none bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {!currentImageSrc ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 text-center cursor-pointer border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-2xl bg-slate-900/80 hover:bg-slate-900 transition-all max-w-sm group shadow-xl z-20 pointer-events-auto"
                >
                  <div className="w-14 h-14 rounded-2xl bg-violet-600/20 group-hover:bg-violet-600/30 text-violet-400 flex items-center justify-center mb-3 transition">
                    <Upload size={26} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 mb-1">
                    Chọn ảnh nguồn cho Layer {currentTab?.name || 'này'}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Bấm để chọn tệp hình ảnh hoặc PDF từ máy tính
                  </p>
                  <span className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition">
                    Tải ảnh lên
                  </span>
                </div>
              ) : null}

              {/* 1. Live Full-Viewport Canvas: Renders full image, revealing both crop area AND outpaint (tràn lề) */}
              {currentImageSrc && (
                <canvas
                  ref={previewCanvasRef}
                  className="absolute inset-0 w-full h-full block pointer-events-none z-0"
                />
              )}

              {/* 2. SVG Dark Mask: Dims the area outside cropBox (62% dark), allowing outpainted image to be clearly seen */}
              {currentImageSrc && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  width={viewportSize.w}
                  height={viewportSize.h}
                >
                  <defs>
                    <mask id="sourceCropMask">
                      {/* White reveals the dark tint */}
                      <rect x="0" y="0" width={viewportSize.w} height={viewportSize.h} fill="white" />
                      {/* Black cuts out the hole, keeping the crop box 100% bright and clear */}
                      {localShape === 'circle' || localShape === 'oval' ? (
                        <ellipse
                          cx={cropBox.x + cropBox.w / 2}
                          cy={cropBox.y + cropBox.h / 2}
                          rx={cropBox.w / 2}
                          ry={cropBox.h / 2}
                          fill="black"
                        />
                      ) : (
                        <rect
                          x={cropBox.x}
                          y={cropBox.y}
                          width={cropBox.w}
                          height={cropBox.h}
                          rx={6}
                          ry={6}
                          fill="black"
                        />
                      )}
                    </mask>
                  </defs>
                  {/* Semi-transparent dark overlay */}
                  <rect
                    x="0"
                    y="0"
                    width={viewportSize.w}
                    height={viewportSize.h}
                    fill="rgba(10, 15, 30, 0.62)"
                    mask="url(#sourceCropMask)"
                  />
                </svg>
              )}

              {/* 2.5 Red Line: Original image border (Đường line đỏ viền ảnh gốc siêu mảnh vừa đủ nhìn) */}
              {currentImageSrc && (bleedMode !== 'off' || !!originalBleedBounds) && originalImageRect && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                  style={{ zIndex: 45 }}
                  width={viewportSize.w}
                  height={viewportSize.h}
                >
                  <g
                    transform={`translate(${cropBox.x + cropBox.w / 2 + crop.panX}, ${cropBox.y + cropBox.h / 2 + crop.panY}) rotate(${crop.rotation}) scale(${crop.flipH ? -1 : 1}, ${crop.flipV ? -1 : 1})`}
                  >
                    {/* Red dashed line siêu mảnh 1px */}
                    <rect
                      x={originalImageRect.x}
                      y={originalImageRect.y}
                      width={originalImageRect.w}
                      height={originalImageRect.h}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={1}
                      strokeDasharray="5 3"
                      style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }}
                    />
                  </g>
                </svg>
              )}

              {/* 3. Bleed Guideline (Đường bù cắt tràn lề outpaint) */}
              {currentImageSrc && bleedMode !== 'off' && bleedPx > 0 && (
                <div
                  style={{
                    left: `${cropBox.x - bleedPx}px`,
                    top: `${cropBox.y - bleedPx}px`,
                    width: `${cropBox.w + bleedPx * 2}px`,
                    height: `${cropBox.h + bleedPx * 2}px`,
                    borderRadius: localShape === 'circle' || localShape === 'oval' ? '50%' : '8px',
                  }}
                  className="absolute pointer-events-none border border-dashed border-emerald-400/80 z-20"
                >
                  {/* Bleed Badge */}
                  <div className="absolute -top-5 right-2 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-[9px] font-mono text-emerald-300 font-bold tracking-tight shadow-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      Outpaint ({bleedMode === 'offset' ? 'Offset' : 'AI'}) +{effectiveBleedMm}mm ({bleedPercent}%)
                    </span>
                  </div>
                </div>
              )}

              {/* 4. Crop Box Frame (Đường cắt thành phẩm + Dim width + Dim height) */}
              {currentImageSrc && (
                <div
                  style={{
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.w}px`,
                    height: `${cropBox.h}px`,
                    borderRadius: localShape === 'circle' || localShape === 'oval' ? '50%' : '6px',
                  }}
                  className="absolute border-2 border-violet-400 pointer-events-none z-30 shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                >
                  {/* Rule of thirds grid overlay */}
                  {showGrid && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div />
                    </div>
                  )}

                  {/* Corner markers */}
                  <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-2 border-l-2 border-white pointer-events-none" />
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-2 border-r-2 border-white pointer-events-none" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-2 border-l-2 border-white pointer-events-none" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-2 border-r-2 border-white pointer-events-none" />

                  {/* Top Edge Dimension Guide Line */}
                  <div className="absolute -top-3.5 left-0 right-0 flex items-center justify-between px-1 pointer-events-none">
                    <div className="w-1.5 h-2 border-l border-violet-400/80" />
                    <div className="flex-1 h-px bg-violet-400/50 mx-1" />
                    <div className="w-1.5 h-2 border-r border-violet-400/80" />
                  </div>

                  {/* DIM WIDTH INPUT BADGE (Cạnh trên - Nhập trực tiếp, không chữ 'Rộng') */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-40">
                    <CropEdgeDimInput
                      label={localShape === 'circle' ? 'Ø' : ''}
                      value={localItemW}
                      suffix="mm"
                      arrows={{ start: '⟵', end: '⟶' }}
                      isCircle={localShape === 'circle'}
                      onChangeValue={handleWidthChange}
                      onDimensionChange={handleDimChange}
                    />
                  </div>

                  {/* Right Edge Dimension Guide Line (Non-circle) */}
                  {localShape !== 'circle' && (
                    <div className="absolute top-0 bottom-0 -right-3.5 flex flex-col items-center justify-between py-1 pointer-events-none">
                      <div className="h-1.5 w-2 border-t border-violet-400/80" />
                      <div className="flex-1 w-px bg-violet-400/50 my-1" />
                      <div className="h-1.5 w-2 border-b border-violet-400/80" />
                    </div>
                  )}

                  {/* DIM HEIGHT INPUT BADGE (Cạnh phải - Nhập trực tiếp, không chữ 'Cao') */}
                  {localShape !== 'circle' && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 translate-x-full z-40">
                      <CropEdgeDimInput
                        label=""
                        value={localShape === 'circle' ? localItemW : localItemH}
                        suffix="mm"
                        arrows={{ start: '↑', end: '↓' }}
                        onChangeValue={handleHeightChange}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Drag Hint Overlay */}
              {currentImageSrc && (
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs border border-slate-700/80 px-2.5 py-1 rounded-lg text-[10px] text-slate-300 flex items-center gap-1.5 pointer-events-none shadow-md">
                  <Move size={12} className="text-violet-400" />
                  <span>Kéo rê chuột để di chuyển ảnh • Cuộn chuột để phóng to/thu nhỏ</span>
                </div>
              )}
            </div>

            {/* Bottom Zoom Slider Bar */}
            <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <ZoomOut size={14} className="text-slate-400 cursor-pointer" onClick={() => setCrop(c => ({ ...c, zoom: Math.max(0.2, c.zoom - 0.1) }))} />
                <input
                  type="range"
                  min={0.2}
                  max={4.0}
                  step={0.05}
                  value={crop.zoom}
                  onChange={e => setCrop(c => ({ ...c, zoom: parseFloat(e.target.value) }))}
                  className="w-full accent-violet-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
                <ZoomIn size={14} className="text-slate-400 cursor-pointer" onClick={() => setCrop(c => ({ ...c, zoom: Math.min(5, c.zoom + 0.1) }))} />
                <span className="font-mono text-xs text-violet-400 font-bold w-12 text-right">
                  {Math.round(crop.zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Pan: X={Math.round(crop.panX)}px, Y={Math.round(crop.panY)}px</span>
                <span>•</span>
                <span>Xoay: {crop.rotation}°</span>
              </div>
            </div>
          </div>

          {/* RIGHT: COLOR STUDIO & ADJUSTMENTS */}
          <div className="w-[415px] shrink-0 bg-white flex flex-col overflow-hidden text-xs">
            {/* PANEL THÔNG SỐ ĐỐI TƯỢNG (HÌNH, SL, RỘNG, CAO) NẰM TRÊN PANEL MẪU MÀU */}
            <div className="p-2 border-b border-slate-200 bg-slate-50/90 flex items-center gap-1.5 flex-wrap">
              {/* Shape selector */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium">Hình:</span>
                <select
                  value={localShape}
                  onChange={(e) => handleShapeChange(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
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

              {/* Số lượng (đã bỏ nhãn SL và tem) */}
              <div
                className="flex items-center bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-300 rounded-full px-2 py-0.5 shadow-2xs"
                title="Số lượng tem (1 - 99)"
              >
                <ModalNumberInput
                  value={localQuantity}
                  onChange={handleQuantityChange}
                  step={1}
                  min={1}
                  max={99}
                  className="w-6 bg-transparent text-center font-bold text-xs text-emerald-700 focus:outline-none"
                />
              </div>

              {/* Kích thước dạng Dropdownlist Combobox lưu gợi ý & lịch sử */}
              <DimDropdownCombobox
                shape={localShape}
                w={localItemW}
                h={localShape === 'circle' ? localItemW : localItemH}
                onChange={handleDimChange}
              />
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

            {/* Navtabs Row 1: Hàng riêng biệt Outpainting đưa lên đầu tiên (mở default) */}
            <div className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-center">
              <button
                type="button"
                onClick={() => setColorTab('bleed')}
                className={`w-full py-1.5 px-3 transition border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                  colorTab === 'bleed'
                    ? 'border-violet-600 text-violet-700 bg-white font-bold shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-violet-700 hover:bg-slate-50'
                }`}
              >
                <Sparkles size={13} className={colorTab === 'bleed' ? 'text-violet-600' : 'text-violet-500'} />
                <span className="text-[11px] font-bold">Outpainting</span>
              </button>
            </div>

            {/* Navtabs Row 2: Nhóm Cân bằng, Curves, Sáng / Tương phản */}
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

            {/* Navtabs Row 3: Nhóm HSL, CMYK, RGB */}
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

            {/* Sliders Container Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB: COLOR BALANCE */}
              {colorTab === 'balance' && (
                <div className="space-y-4">
                  <div className="p-2.5 rounded-xl bg-violet-50/60 border border-violet-100 text-[11px] text-violet-800">
                    Cân bằng màu (Color Balance) bù trừ quang sai màu sắc cho ấn phẩm in offset & kỹ thuật số.
                  </div>

                  {/* Cyan <-> Red */}
                  <div>
                    <div className="flex justify-between items-center mb-1 text-[11px]">
                      <span className="text-cyan-600 font-bold">Cyan (-100)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.balanceCyanRed}</span>
                      <span className="text-rose-600 font-bold">Red (+100)</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={colorSettings.balanceCyanRed}
                      onChange={e => updateSetting('balanceCyanRed', Number(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer"
                    />
                  </div>

                  {/* Magenta <-> Green */}
                  <div>
                    <div className="flex justify-between items-center mb-1 text-[11px]">
                      <span className="text-fuchsia-600 font-bold">Magenta (-100)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.balanceMagentaGreen}</span>
                      <span className="text-emerald-600 font-bold">Green (+100)</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={colorSettings.balanceMagentaGreen}
                      onChange={e => updateSetting('balanceMagentaGreen', Number(e.target.value))}
                      className="w-full accent-fuchsia-600 cursor-pointer"
                    />
                  </div>

                  {/* Yellow <-> Blue */}
                  <div>
                    <div className="flex justify-between items-center mb-1 text-[11px]">
                      <span className="text-amber-600 font-bold">Yellow (-100)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.balanceYellowBlue}</span>
                      <span className="text-blue-600 font-bold">Blue (+100)</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={colorSettings.balanceYellowBlue}
                      onChange={e => updateSetting('balanceYellowBlue', Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB: PHOTOSHOP CURVES */}
              {colorTab === 'curves' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">Đường cong sắc độ (Curves)</span>
                    <span className="text-[10px] text-slate-400">Kiểu Photoshop</span>
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
                    onChannelChange={ch => setCurveChannel(ch)}
                    isLightMode={true}
                  />
                </div>
              )}

              {/* TAB: BRIGHTNESS & CONTRAST */}
              {colorTab === 'brightness' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-slate-600">Độ sáng (Brightness)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={colorSettings.brightness}
                      onChange={e => updateSetting('brightness', Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-slate-600">Độ tương phản (Contrast)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={colorSettings.contrast}
                      onChange={e => updateSetting('contrast', Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB: HSL */}
              {colorTab === 'hsl' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-slate-600">Sắc độ (Hue)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.hue}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={colorSettings.hue}
                      onChange={e => updateSetting('hue', Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-slate-600">Độ bão hòa (Saturation)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={colorSettings.saturation}
                      onChange={e => updateSetting('saturation', Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-slate-600">Độ sáng (Lightness)</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.lightness}</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={colorSettings.lightness}
                      onChange={e => updateSetting('lightness', Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB: CMYK */}
              {colorTab === 'cmyk' && (
                <div className="space-y-3">
                  {(['cyan', 'magenta', 'yellow', 'black'] as const).map(ch => (
                    <div key={ch}>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-medium text-slate-600 uppercase">
                          {ch === 'cyan' ? 'Cyan (Xanh Lơ)' : ch === 'magenta' ? 'Magenta (Đỏ Sen)' : ch === 'yellow' ? 'Yellow (Vàng)' : 'Black (Đen K)'}
                        </span>
                        <span className="font-mono font-bold text-violet-700">{colorSettings[ch]}</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={colorSettings[ch]}
                        onChange={e => updateSetting(ch, Number(e.target.value))}
                        className={`w-full cursor-pointer ${
                          ch === 'cyan' ? 'accent-cyan-500' : ch === 'magenta' ? 'accent-fuchsia-500' : ch === 'yellow' ? 'accent-amber-400' : 'accent-slate-900'
                        }`}
                      />
                    </div>
                  ))}

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-slate-600">Bù xám GCR Level</span>
                      <span className="font-mono font-bold text-violet-700">{colorSettings.gcrLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={colorSettings.gcrLevel}
                      onChange={e => updateSetting('gcrLevel', Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB: RGB */}
              {colorTab === 'rgb' && (
                <div className="space-y-3">
                  {(['red', 'green', 'blue'] as const).map(ch => (
                    <div key={ch}>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-medium text-slate-600 uppercase">
                          {ch === 'red' ? 'Đỏ (Red)' : ch === 'green' ? 'Lục (Green)' : 'Lam (Blue)'}
                        </span>
                        <span className="font-mono font-bold text-violet-700">{colorSettings[ch]}</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={colorSettings[ch]}
                        onChange={e => updateSetting(ch, Number(e.target.value))}
                        className={`w-full cursor-pointer ${
                          ch === 'red' ? 'accent-rose-500' : ch === 'green' ? 'accent-emerald-500' : 'accent-blue-500'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: BLEED STUDIO */}
              {colorTab === 'bleed' && (
                <div className="space-y-3">
                  {/* Mode Radio Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Mode OFF */}
                    <label
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border cursor-pointer transition select-none ${
                        bleedMode === 'off'
                          ? 'bg-violet-50/80 border-violet-500 text-violet-900 shadow-xs font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bleedMode"
                        checked={bleedMode === 'off'}
                        onChange={() => setBleedMode('off')}
                        className="text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs">Off</span>
                    </label>

                    {/* Mode OFFSET */}
                    <label
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border cursor-pointer transition select-none ${
                        bleedMode === 'offset'
                          ? 'bg-violet-50/80 border-violet-500 text-violet-900 shadow-xs font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bleedMode"
                        checked={bleedMode === 'offset'}
                        onChange={() => setBleedMode('offset')}
                        className="text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs">Offset</span>
                    </label>

                    {/* Mode AI */}
                    <label
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border cursor-pointer transition select-none ${
                        bleedMode === 'ai'
                          ? 'bg-violet-50/80 border-violet-500 text-violet-900 shadow-xs font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bleedMode"
                        checked={bleedMode === 'ai'}
                        onChange={() => setBleedMode('ai')}
                        className="text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs">AI</span>
                    </label>
                  </div>

                  {/* Slider: Tỉ lệ % từ 1 đến 30% */}
                  {bleedMode !== 'off' && (
                    <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-end text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-mono font-bold text-xs">
                          {bleedPercent}% (~{Math.round((localItemW * (bleedPercent / 100) / 2) * 10) / 10} mm mỗi cạnh)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={bleedPercent}
                        onChange={(e) => setBleedPercent(Number(e.target.value))}
                        className="w-full accent-violet-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>1% (Mỏng)</span>
                        <span>15%</span>
                        <span>30% (Rộng)</span>
                      </div>

                      {/* Tùy chọn xử lý khoảng cách Gap & Kích thước tem khi bình trang */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
                        <div className="text-[11px] font-semibold text-slate-700">Khi bình trang:</div>
                        <div className="space-y-1.5">
                          {/* Option 1: Tự động cộng bleed size vào Gap (Mặc định) */}
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

                          {/* Option 2: Giữ nguyên Gap (Kích thước tem nhỏ lại) */}
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

                  {/* Action buttons */}
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
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            {bleedMode === 'offset' ? <Zap size={14} /> : <Sparkles size={14} />}
                            <span>Outpainting</span>
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

            {/* Bottom Reset Color Button */}
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
        </div>


        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="font-medium">Tem đích:</span>
            <span className="font-bold text-slate-700">
              {localItemW} × {localShape === 'circle' ? localItemW : localItemH} mm
            </span>
            <span>•</span>
            <span>Layer: <strong className="text-violet-700 font-bold">{currentTab?.name || 'A'}</strong></span>
            <span>•</span>
            <span>Hình dạng: {localShape}</span>
            {localQuantity > 0 && (
              <>
                <span>•</span>
                <span>Số lượng: <strong className="text-emerald-700 font-bold">{localQuantity}</strong> tem</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-98"
            >
              <Check size={16} />
              <span>Áp dụng vào bình trang</span>
            </button>
          </div>
        </div>

        {/* Edit Layer Modal Toast (Tên & Màu sắc của Layer) */}
        {editingLayerTab && (
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
            onClick={() => setEditingLayerTab(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-[340px] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs font-bold text-xs"
                    style={{ backgroundColor: editLayerColor }}
                  >
                    {editLayerName.slice(0, 1).toUpperCase() || 'L'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Thuộc tính Layer</h4>
                    <span className="text-[10px] text-slate-400">Đổi tên & màu nhận diện</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingLayerTab(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Tên Layer */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span>Tên Layer</span>
                  <span className="text-[9px] text-slate-400 font-normal">Tối đa 20 ký tự</span>
                </label>
                <input
                  type="text"
                  value={editLayerName}
                  onChange={(e) => setEditLayerName(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLayerEdit();
                    if (e.key === 'Escape') setEditingLayerTab(null);
                  }}
                  autoFocus
                  placeholder="Ví dụ: A, Tem tròn, Nhãn chai..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-500 bg-slate-50/50 focus:bg-white transition"
                />
              </div>

              {/* Bảng màu */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span>Màu đại diện</span>
                  <span className="text-[10px] font-mono text-slate-500 font-medium uppercase">{editLayerColor}</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {LAYER_COLOR_PRESETS.map((col) => {
                    const isSelected = editLayerColor.toLowerCase() === col.toLowerCase();
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setEditLayerColor(col)}
                        className={`w-9 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center relative shadow-2xs hover:scale-105 active:scale-95 ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-800 shadow-sm scale-105' : 'hover:opacity-90'
                        }`}
                        style={{ backgroundColor: col }}
                        title={col}
                      >
                        {isSelected && <Check size={14} className="text-white drop-shadow-sm stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nút lưu */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLayerTab(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveLayerEdit}
                  className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
