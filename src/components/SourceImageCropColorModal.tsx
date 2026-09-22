import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Check, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  ZoomIn, ZoomOut, Move, Eye, EyeOff, Upload, Sparkles,
  RefreshCw, Scissors, Grid, Layers, Plus, Edit3
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

// Compact Dim text input for dimensions: "100x120" or "100" (for circle)
interface ModalDimInputProps {
  shape: string;
  w: number;
  h: number;
  onChange: (newW: number, newH: number) => void;
  className?: string;
}

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

const ModalDimInput: React.FC<ModalDimInputProps> = ({ shape, w, h, onChange, className = '' }) => {
  const isCircle = shape === 'circle';
  const formatStr = useCallback((width: number, height: number, circle: boolean) => {
    return circle ? `${width}` : `${width}x${height}`;
  }, []);

  const [str, setStr] = useState<string>(() => formatStr(w, h, isCircle));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setStr(formatStr(w, h, isCircle));
    }
  }, [w, h, isCircle, formatStr]);

  const commitValue = (valToCommit: string) => {
    const parsed = parseDimValue(valToCommit, w, h, isCircle);
    if (parsed) {
      const finalW = Math.max(1, parsed.w);
      const finalH = isCircle ? finalW : Math.max(1, parsed.h);
      onChange(finalW, finalH);
      setStr(formatStr(finalW, finalH, isCircle));
    } else {
      setStr(formatStr(w, h, isCircle));
    }
  };

  return (
    <div className={`flex items-center bg-white hover:bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 shadow-2xs gap-1 focus-within:ring-2 focus-within:ring-violet-300 ${className}`}>
      <span className="text-[10px] font-semibold text-slate-600 select-none">
        {isCircle ? 'Đ.kính:' : 'KT:'}
      </span>
      <input
        type="text"
        value={str}
        onFocus={(e) => {
          isFocusedRef.current = true;
          e.target.select();
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          commitValue(str);
        }}
        onChange={(e) => {
          const val = e.target.value;
          setStr(val);
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
          }
        }}
        placeholder={isCircle ? '100' : '100x100'}
        className="w-16 bg-transparent text-center font-bold text-xs text-slate-800 focus:outline-none"
      />
      <span className="text-[10px] text-slate-400 font-medium select-none">mm</span>
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
  initialColorSettings?: ColorAdjustSettings;
  initialCropSettings?: CropTransform;
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
  initialColorSettings,
  initialCropSettings,
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
  const [colorTab, setColorTab] = useState<'balance' | 'curves' | 'brightness' | 'hsl' | 'cmyk' | 'rgb'>('balance');
  const [curveChannel, setCurveChannel] = useState<CurveChannelType>('rgb');
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

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
      }
    }
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

  // Calculate crop box pixel size in viewport
  const cropBox = useMemo(() => {
    const pad = 40;
    const maxW = Math.max(100, viewportSize.w - pad * 2);
    const maxH = Math.max(100, viewportSize.h - pad * 2);

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

  // Live Canvas Rendering (Crop + Color Balance)
  useEffect(() => {
    if (!isOpen || !imgElement || !imgLoaded || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render canvas at crop box pixel dimensions
    const cw = Math.round(cropBox.w);
    const ch = Math.round(cropBox.h);
    if (cw <= 0 || ch <= 0) return;

    canvas.width = cw;
    canvas.height = ch;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();

    // Center of crop box
    ctx.translate(cw / 2 + crop.panX, ch / 2 + crop.panY);
    ctx.rotate((crop.rotation * Math.PI) / 180);
    ctx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

    // Scale image
    const imgAspect = imgElement.width / imgElement.height;
    const baseW = cw;
    const baseH = baseW / imgAspect;

    const drawW = baseW * crop.zoom;
    const drawH = baseH * crop.zoom;

    ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Apply color adjustments if not showing original
    if (!showOriginal && !isDefaultColorSettings(colorSettings)) {
      try {
        const imageData = ctx.getImageData(0, 0, cw, ch);
        applyColorAdjustments(imageData, ctx, colorSettings);
      } catch (err) {
        console.error('Error applying color adjustment:', err);
      }
    }
  }, [isOpen, imgElement, imgLoaded, cropBox, crop, colorSettings, showOriginal]);

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

    const finalTabs = tabs.map(t => {
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
            thumb: previewThumb || currentImageSrc,
            originalThumb: fullExportDataUrl || currentImageSrc,
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

    onApply({
      dataUrl: previewThumb || currentImageSrc || '',
      originalImage: fullExportDataUrl || currentImageSrc || '',
      w_mm: localItemW,
      h_mm: currentEffH,
      colorSettings,
      cropSettings: crop,
      filename: currentFileName,
      updatedTabs: finalTabs,
      activeTabId: currentTabId,
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

              {/* Crop Box Container */}
              <div
                style={{
                  width: `${cropBox.w}px`,
                  height: `${cropBox.h}px`,
                  borderRadius: localShape === 'circle' || localShape === 'oval' ? '50%' : '6px',
                  display: !currentImageSrc ? 'none' : undefined,
                }}
                className="relative shadow-[0_0_0_9999px_rgba(2,6,23,0.78)] border-2 border-violet-400 overflow-hidden flex items-center justify-center pointer-events-none"
              >
                {/* Live Canvas with transformed image + color filter */}
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-full block bg-white"
                />

                {/* Rule of thirds grid overlay */}
                {showGrid && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div />
                  </div>
                )}

                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white pointer-events-none" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white pointer-events-none" />
              </div>

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

              {/* Số lượng */}
              <div className="flex items-center bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-300 rounded-full px-2.5 py-1 shadow-2xs gap-1">
                <span className="text-[10px] font-bold text-emerald-800 select-none">SL:</span>
                <ModalNumberInput
                  value={localQuantity}
                  onChange={handleQuantityChange}
                  step={1}
                  min={1}
                  max={99}
                  className="w-7 bg-transparent text-center font-bold text-xs text-emerald-700 focus:outline-none"
                />
                <span className="text-[10px] text-emerald-700 font-medium select-none">tem</span>
              </div>

              {/* Kích thước (KT: WxH hoặc Đ.kính) dạng dim text */}
              <ModalDimInput
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

            {/* Tabs */}
            <div className="grid grid-cols-6 border-b border-slate-200 text-[10px] font-bold text-center bg-slate-100/50">
              <button
                type="button"
                onClick={() => setColorTab('balance')}
                className={`py-2 transition border-b-2 cursor-pointer ${
                  colorTab === 'balance'
                    ? 'border-violet-600 text-violet-700 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Balance
              </button>
              <button
                type="button"
                onClick={() => setColorTab('curves')}
                className={`py-2 transition border-b-2 cursor-pointer ${
                  colorTab === 'curves'
                    ? 'border-violet-600 text-violet-700 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Curves
              </button>
              <button
                type="button"
                onClick={() => setColorTab('brightness')}
                className={`py-2 transition border-b-2 cursor-pointer ${
                  colorTab === 'brightness'
                    ? 'border-violet-600 text-violet-700 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Sáng/T.Phản
              </button>
              <button
                type="button"
                onClick={() => setColorTab('hsl')}
                className={`py-2 transition border-b-2 cursor-pointer ${
                  colorTab === 'hsl'
                    ? 'border-violet-600 text-violet-700 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                HSL
              </button>
              <button
                type="button"
                onClick={() => setColorTab('cmyk')}
                className={`py-2 transition border-b-2 cursor-pointer ${
                  colorTab === 'cmyk'
                    ? 'border-violet-600 text-violet-700 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                CMYK
              </button>
              <button
                type="button"
                onClick={() => setColorTab('rgb')}
                className={`py-2 transition border-b-2 cursor-pointer ${
                  colorTab === 'rgb'
                    ? 'border-violet-600 text-violet-700 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
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
