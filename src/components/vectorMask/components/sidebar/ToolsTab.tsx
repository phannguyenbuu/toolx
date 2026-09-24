import React from 'react';
import {
  MousePointer,
  PenTool,
  Hand,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Maximize2,
  Plus,
  Trash2,
  Sparkles,
  Upload,
  Download
} from 'lucide-react';
import { VectorKnot, ToolMode } from '../../types';

interface ToolsTabProps {
  activeTool: ToolMode;
  setActiveTool: (tool: ToolMode) => void;
  knots: VectorKnot[];
  selectedKnotId: string | null;
  handleFlip: (axis: 'h' | 'v') => void;
  handleRotate: (deg: number) => void;
  handleCenterAlign: () => void;
  handleOffsetMargin: (offset_mm: number) => void;
  handleDeleteSelectedKnot: () => void;
  handleExportSvg: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  activeTool,
  setActiveTool,
  knots,
  selectedKnotId,
  handleFlip,
  handleRotate,
  handleCenterAlign,
  handleOffsetMargin,
  handleDeleteSelectedKnot,
  handleExportSvg,
  fileInputRef
}) => {
  const selectedKnot = knots.find((k) => k.id === selectedKnotId);

  return (
    <div className="p-3.5 space-y-4 flex-1">
      {/* Tool Mode Select */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Chế độ thao tác
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition cursor-pointer ${
              activeTool === 'select'
                ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-xs font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MousePointer size={15} />
            <span className="text-[10px]">Chọn & Kéo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-xs font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <PenTool size={15} />
            <span className="text-[10px]">Vẽ tự do</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('pan')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-xs font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Hand size={15} />
            <span className="text-[10px]">Di chuyển</span>
          </button>
        </div>
      </div>

      {/* Transform Actions */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Biến đổi hình dạng
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => handleFlip('h')}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
            title="Lật ngang (Flip Horizontal)"
          >
            <FlipHorizontal size={14} />
            <span className="text-[9px]">Lật ngang</span>
          </button>
          <button
            type="button"
            onClick={() => handleFlip('v')}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
            title="Lật dọc (Flip Vertical)"
          >
            <FlipVertical size={14} />
            <span className="text-[9px]">Lật dọc</span>
          </button>
          <button
            type="button"
            onClick={() => handleRotate(90)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
            title="Xoay 90 độ"
          >
            <RotateCw size={14} />
            <span className="text-[9px]">Xoay 90°</span>
          </button>
          <button
            type="button"
            onClick={handleCenterAlign}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
            title="Căn giữa khung tem"
          >
            <Maximize2 size={14} />
            <span className="text-[9px]">Căn giữa</span>
          </button>
        </div>
      </div>

      {/* Offset / Bleed Expand & Contract */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Bù viền / Co giãn khuôn (Offset)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleOffsetMargin(1)}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 text-xs font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
          >
            <Plus size={13} />
            <span>Nở ra (+1mm)</span>
          </button>
          <button
            type="button"
            onClick={() => handleOffsetMargin(-1)}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 text-xs font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
          >
            <span>-</span>
            <span>Co lại (-1mm)</span>
          </button>
        </div>
      </div>

      {/* Selected Knot Coordinates & Delete Button */}
      {selectedKnotId && selectedKnot ? (
        <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-800 flex items-center gap-1">
              <Sparkles size={12} />
              Điểm neo đang chọn
            </span>
            <button
              type="button"
              onClick={handleDeleteSelectedKnot}
              disabled={knots.length <= 3}
              className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
              title="Xóa điểm neo này (Delete/Backspace)"
            >
              <Trash2 size={11} />
              <span>Xóa điểm</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-1.5 rounded-lg border border-violet-100 flex justify-between items-center shadow-2xs">
              <span className="text-slate-500 text-[10px]">X:</span>
              <span className="font-mono font-bold text-violet-900">
                {selectedKnot.x.toFixed(1)} mm
              </span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-violet-100 flex justify-between items-center shadow-2xs">
              <span className="text-slate-500 text-[10px]">Y:</span>
              <span className="font-mono font-bold text-violet-900">
                {selectedKnot.y.toFixed(1)} mm
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
          Bấm vào một điểm neo trên khung vẽ để chỉnh toạ độ hoặc xóa
        </div>
      )}

      {/* SVG Import & Export Options */}
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Nhập & Xuất File Vector (SVG)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition shadow-2xs cursor-pointer"
          >
            <Upload size={13} />
            <span>Nhập SVG</span>
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition shadow-2xs cursor-pointer"
          >
            <Download size={13} />
            <span>Tải SVG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
