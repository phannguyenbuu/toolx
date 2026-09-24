import React from 'react';
import {
  PenTool,
  Check,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react';

interface VectorMaskHeaderProps {
  maskW: number;
  maskH: number;
  knotCount: number;
  currentImageUrl: string | null;
  imageName?: string;
  historyIndex: number;
  historyLength: number;
  undo: () => void;
  redo: () => void;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  handleFitView: () => void;
  onClose: () => void;
  imgFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const VectorMaskHeader: React.FC<VectorMaskHeaderProps> = ({
  maskW,
  maskH,
  knotCount,
  currentImageUrl,
  imageName = 'Ảnh nguồn',
  historyIndex,
  historyLength,
  undo,
  redo,
  setScale,
  handleFitView,
  onClose,
  imgFileInputRef
}) => {
  return (
    <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/90 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 shadow-2xs">
          <PenTool size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">
              Vector Mask Editor
            </h3>
            <span className="text-[10px] bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full border border-violet-200">
              Khuôn Bế & Điểm Neo Vector
            </span>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span>
              Kích thước:{' '}
              <span className="text-violet-700 font-bold">
                {maskW} × {maskH} mm
              </span>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Điểm neo:{' '}
              <span className="text-emerald-700 font-bold">{knotCount}</span>
            </span>
            <span className="text-slate-300">•</span>
            {currentImageUrl ? (
              <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                <Check size={11} /> {imageName}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => imgFileInputRef.current?.click()}
                className="text-violet-600 hover:text-violet-800 font-semibold underline decoration-violet-300 cursor-pointer text-[10px]"
              >
                + Tải ảnh nguồn
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Top Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200 shadow-2xs cursor-pointer"
          title="Hoàn tác (Ctrl+Z)"
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={historyIndex >= historyLength - 1}
          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200 shadow-2xs cursor-pointer"
          title="Làm lại (Ctrl+Shift+Z)"
        >
          <RotateCw size={15} />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Zoom Controls */}
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(25, s * 1.2))}
          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition border border-slate-200 shadow-2xs cursor-pointer"
          title="Phóng to (Zoom In)"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.3, s / 1.2))}
          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition border border-slate-200 shadow-2xs cursor-pointer"
          title="Thu nhỏ (Zoom Out)"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={handleFitView}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition border border-slate-200 shadow-2xs cursor-pointer"
          title="Căn vừa màn hình (Fit View)"
        >
          Fit
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer border border-slate-200 shadow-2xs"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
