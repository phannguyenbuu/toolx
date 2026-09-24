import React from 'react';
import { Eraser, Square, MousePointer2, Trash2, X, Wand2, Loader2 } from 'lucide-react';
import { BoundingBox, AIStatus } from '../../types';

interface InpaintOptionsProps {
  drawMode: 'select' | 'draw';
  setDrawMode: (mode: 'select' | 'draw') => void;
  boxes: BoundingBox[];
  selectedBoxId: string | null;
  setSelectedBoxId: (id: string | null) => void;
  removeBox: (id: string) => void;
  clearAllBoxes: () => void;
  processInpaint: () => void;
  isProcessing: boolean;
  image: string | null;
  aiStatus: AIStatus;
}

export const InpaintOptions: React.FC<InpaintOptionsProps> = ({
  drawMode,
  setDrawMode,
  boxes,
  selectedBoxId,
  setSelectedBoxId,
  removeBox,
  clearAllBoxes,
  processInpaint,
  isProcessing,
  image,
  aiStatus
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h4 className="font-bold text-red-800 flex items-center gap-2">
          <Eraser size={18} />
          Xóa vùng ảnh (Inpainting)
        </h4>
        <p className="text-sm text-red-600 mt-1">
          Vẽ các vùng cần xóa trên ảnh. AI sẽ tự động lấp đầy bằng nội dung phù hợp.
        </p>
      </div>

      {/* Drawing controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDrawMode('draw')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            drawMode === 'draw'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Square size={16} />
          Vẽ vùng
        </button>
        <button
          onClick={() => setDrawMode('select')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            drawMode === 'select'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <MousePointer2 size={16} />
          Chọn
        </button>
        <div className="flex-1" />
        <button
          onClick={clearAllBoxes}
          disabled={boxes.length === 0}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 size={16} />
          Xóa tất cả
        </button>
      </div>

      {/* Boxes list */}
      {boxes.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Vùng đã chọn ({boxes.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {boxes.map((box, idx) => (
              <div
                key={box.id}
                className={`flex items-center justify-between px-2 py-1 rounded text-sm cursor-pointer ${
                  selectedBoxId === box.id ? 'bg-purple-100' : 'bg-white'
                }`}
                onClick={() => setSelectedBoxId(box.id)}
              >
                <span className="text-gray-600">
                  Vùng {idx + 1}: {box.width}×{box.height}px
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBox(box.id);
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process button */}
      <button
        onClick={processInpaint}
        disabled={isProcessing || boxes.length === 0 || !image || aiStatus !== 'available'}
        className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <Wand2 size={20} />
            Xử lý AI ({boxes.length} vùng)
          </>
        )}
      </button>
    </div>
  );
};
