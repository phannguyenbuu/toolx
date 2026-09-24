import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Ruler, Scissors } from 'lucide-react';
import { BgTheme } from '../types';

interface DielineCanvasPreviewProps {
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  bgTheme: BgTheme;
  completeSvgString: string;
  renderWidthMm: number;
  renderHeightMm: number;
  totalCutLengthMeters: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSetBgTheme: (theme: BgTheme) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

export const DielineCanvasPreview: React.FC<DielineCanvasPreviewProps> = ({
  previewContainerRef,
  zoom,
  pan,
  isDragging,
  bgTheme,
  completeSvgString,
  renderWidthMm,
  renderHeightMm,
  totalCutLengthMeters,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSetBgTheme,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  return (
    <div className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-slate-200">
      {/* Canvas Toolbar overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Phóng to (+ hoặc cuộn chuột)"
          >
            <ZoomIn size={15} />
          </button>
          <span className="text-[11px] font-semibold text-slate-700 min-w-[42px] text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Thu nhỏ (- hoặc cuộn chuột)"
          >
            <ZoomOut size={15} />
          </button>
          <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={onResetZoom}
            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
            title="Tỷ lệ chuẩn 100%"
          >
            <RotateCcw size={12} />
            <span>1:1</span>
          </button>
        </div>

        {/* Background Theme Toggle */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => onSetBgTheme('light')}
            className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
              bgTheme === 'light'
                ? 'bg-violet-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sáng
          </button>
          <button
            type="button"
            onClick={() => onSetBgTheme('dark')}
            className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
              bgTheme === 'dark'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tối
          </button>
          <button
            type="button"
            onClick={() => onSetBgTheme('grid')}
            className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
              bgTheme === 'grid'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ca-rô
          </button>
        </div>
      </div>

      {/* Interactive Preview Canvas Area */}
      <div
        ref={previewContainerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className={`w-full h-full flex items-center justify-center p-8 overflow-hidden cursor-grab active:cursor-grabbing ${
          bgTheme === 'light'
            ? 'bg-slate-100/90'
            : bgTheme === 'dark'
              ? 'bg-slate-950'
              : 'bg-[radial-gradient(#94A3B8_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100'
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
          }}
          className={`relative rounded-md transition-shadow ${
            bgTheme === 'dark'
              ? 'bg-slate-900 shadow-2xl shadow-black border border-slate-700'
              : 'bg-white shadow-2xl shadow-slate-300/80 border border-slate-300/90 ring-1 ring-slate-200'
          }`}
        >
          {/* Embedded SVG preview */}
          <div
            className="max-h-[520px] max-w-[560px] w-auto h-auto flex items-center justify-center p-3 select-none"
            dangerouslySetInnerHTML={{
              __html: completeSvgString,
            }}
          />
        </div>
      </div>

      {/* Bottom badges on canvas */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/95 backdrop-blur text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-md">
          <Ruler size={13} className="text-amber-500" />
          {renderWidthMm} × {renderHeightMm} mm
        </span>
        <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/95 backdrop-blur text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-md">
          <Scissors size={13} className="text-rose-500" />
          {totalCutLengthMeters}m dao cắt
        </span>
      </div>
    </div>
  );
};
