import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Check, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  ZoomIn, ZoomOut, Move, Eye, EyeOff, Upload, Sparkles,
  RefreshCw, Scissors, Grid
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
  onApply: (result: {
    dataUrl: string;
    originalImage: string;
    w_mm: number;
    h_mm: number;
    colorSettings: ColorAdjustSettings;
    cropSettings: CropTransform;
    filename?: string;
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
  onApply,
}) => {
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
      setCurrentImageSrc(imageUrl);
      setCurrentFileName(imageName);
      if (initialColorSettings) setColorSettings({ ...initialColorSettings });
      if (initialCropSettings) setCrop({ ...initialCropSettings });
    }
  }, [isOpen, imageUrl, imageName, initialColorSettings, initialCropSettings]);

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
    if (crop.aspectMode === 'free') return itemW / (itemH || itemW);
    // 'item' mode
    const effH = shape === 'circle' ? itemW : (itemH || itemW);
    return itemW / (effH || 1);
  }, [crop.aspectMode, itemW, itemH, shape]);

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

    // We render canvas at crop box pixel dimensions
    const cw = Math.round(cropBox.w);
    const ch = Math.round(cropBox.h);
    if (cw <= 0 || ch <= 0) return;

    canvas.width = cw;
    canvas.height = ch;

    // Clear
    ctx.clearRect(0, 0, cw, ch);

    // Save context for transform
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

  // Apply Action: generate high-resolution export
  const handleApply = () => {
    if (!imgElement || !imgLoaded) {
      onClose();
      return;
    }

    // Determine high-res canvas size (e.g., at 300 DPI equivalent or max 2400px)
    const exportScale = 3; // 3x preview canvas for sharp print quality
    const exportW = Math.round(cropBox.w * exportScale);
    const exportH = Math.round(cropBox.h * exportScale);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = exportW;
    offCanvas.height = exportH;
    const offCtx = offCanvas.getContext('2d');

    if (!offCtx) {
      onClose();
      return;
    }

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

    // Apply Color Settings
    if (!isDefaultColorSettings(colorSettings)) {
      try {
        const imgData = offCtx.getImageData(0, 0, exportW, exportH);
        applyColorAdjustments(imgData, offCtx, colorSettings);
      } catch (e) {
        console.error('Export color error:', e);
      }
    }

    const dataUrl = offCanvas.toDataURL('image/png', 0.95);
    onApply({
      dataUrl,
      originalImage: currentImageSrc || dataUrl,
      w_mm: itemW,
      h_mm: itemH,
      colorSettings,
      cropSettings: crop,
      filename: currentFileName,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col w-[1100px] max-w-[96vw] h-[92vh] max-h-[820px] overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <Scissors size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">Chỉnh sửa Ảnh nguồn & Cân bằng màu</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold border border-violet-200">
                  {itemW} × {shape === 'circle' ? itemW : itemH} mm
                </span>
                {currentFileName && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={currentFileName}>
                    • {currentFileName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Kéo di chuyển ảnh trong vùng chọn, phóng to/xoay và cân chỉnh màu sắc chuẩn in ấn
              </p>
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
              <span>Đổi ảnh khác</span>
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
              {/* Crop Box Container */}
              <div
                style={{
                  width: `${cropBox.w}px`,
                  height: `${cropBox.h}px`,
                  borderRadius: shape === 'circle' || shape === 'oval' ? '50%' : '6px',
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
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs border border-slate-700/80 px-2.5 py-1 rounded-lg text-[10px] text-slate-300 flex items-center gap-1.5 pointer-events-none shadow-md">
                <Move size={12} className="text-violet-400" />
                <span>Kéo rê chuột để di chuyển ảnh • Cuộn chuột để phóng to/thu nhỏ</span>
              </div>
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
          <div className="w-[390px] shrink-0 bg-white flex flex-col overflow-hidden text-xs">
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
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Tem đích:</span>
            <span className="font-bold text-slate-700">{itemW} × {shape === 'circle' ? itemW : itemH} mm</span>
            <span>•</span>
            <span>Hình dạng: {shape}</span>
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
      </div>
    </div>
  );
};
