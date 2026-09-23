import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Grid, RefreshCw, Maximize2, Upload, Move
} from 'lucide-react';
import { CropBox, CropTransform, ViewportSize, BleedBounds, BleedMode } from './types';
import { parseDimValue, saveCropSizeSuggestion } from './DimDropdownCombobox';
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

export interface CropModalCanvasViewportProps {
  viewportRef: React.RefObject<HTMLDivElement | null> | React.MutableRefObject<HTMLDivElement | null> | any;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null> | React.MutableRefObject<HTMLCanvasElement | null> | any;
  currentImageSrc: string | null;
  currentTabName?: string;
  cropBox: CropBox;
  crop: CropTransform;
  setCrop: React.Dispatch<React.SetStateAction<CropTransform>>;
  viewportSize: ViewportSize;
  localItemW: number;
  localItemH: number;
  localShape: string;
  imgLoaded: boolean;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  originalImageRect: { x: number; y: number; w: number; h: number } | null;
  originalBleedBounds: BleedBounds | null;
  bleedMode: BleedMode;
  effectiveBleedMm: number;
  bleedPercent: number;
  bleedPx: number;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleFitImageAspect: () => void;
  handleResetCrop: () => void;
  handleWidthChange: (val: number) => void;
  handleHeightChange: (val: number) => void;
  handleDimChange: (w: number, h: number) => void;
  onOpenUpload: () => void;
}

export const CropModalCanvasViewport: React.FC<CropModalCanvasViewportProps> = ({
  viewportRef,
  previewCanvasRef,
  currentImageSrc,
  currentTabName = 'A',
  cropBox,
  crop,
  setCrop,
  viewportSize,
  localItemW,
  localItemH,
  localShape,
  imgLoaded,
  showGrid,
  setShowGrid,
  originalImageRect,
  originalBleedBounds,
  bleedMode,
  effectiveBleedMm,
  bleedPercent,
  bleedPx,
  isDragging,
  handleMouseDown,
  handleWheel,
  handleFitImageAspect,
  handleResetCrop,
  handleWidthChange,
  handleHeightChange,
  handleDimChange,
  onOpenUpload,
}) => {
  return (
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

          <button
            type="button"
            onClick={handleFitImageAspect}
            disabled={!imgLoaded}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer border bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/80 text-indigo-200 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            title="Tự động chỉnh chiều cao tem khớp đúng tỷ lệ ảnh gốc (không bị méo hay thừa viền)"
          >
            <Maximize2 size={11} className="text-indigo-400" />
            <span>Khớp tỷ lệ ảnh</span>
          </button>
        </div>

        {/* Transform controls: Rotate, Flip, Grid, Reset */}
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
            onClick={onOpenUpload}
            className="flex flex-col items-center justify-center p-8 text-center cursor-pointer border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-2xl bg-slate-900/80 hover:bg-slate-900 transition-all max-w-sm group shadow-xl z-20 pointer-events-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 group-hover:bg-violet-600/30 text-violet-400 flex items-center justify-center mb-3 transition">
              <Upload size={26} />
            </div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">
              Chọn ảnh nguồn cho Layer {currentTabName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Bấm để chọn tệp hình ảnh hoặc PDF từ máy tính
            </p>
            <span className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition">
              Tải ảnh lên
            </span>
          </div>
        ) : null}

        {/* 1. Live Full-Viewport Canvas */}
        {currentImageSrc && (
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 w-full h-full block pointer-events-none z-0"
          />
        )}

        {/* 2. SVG Dark Mask */}
        {currentImageSrc && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            width={viewportSize.w}
            height={viewportSize.h}
          >
            <defs>
              <mask id="sourceCropMask">
                <rect x="0" y="0" width={viewportSize.w} height={viewportSize.h} fill="white" />
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

        {/* 2.5 Red Line: Original image border */}
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

            {/* DIM WIDTH INPUT BADGE */}
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

            {/* DIM HEIGHT INPUT BADGE (Non-circle) */}
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
    </div>
  );
};
