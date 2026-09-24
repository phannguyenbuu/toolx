import React from 'react';
import {
  ImagePlus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { AIStatus } from '../../types';

interface OutpaintOptionsProps {
  imageDimensions: { width: number; height: number } | null;
  outpaintTop: number;
  setOutpaintTop: (val: number) => void;
  outpaintBottom: number;
  setOutpaintBottom: (val: number) => void;
  outpaintLeft: number;
  setOutpaintLeft: (val: number) => void;
  outpaintRight: number;
  setOutpaintRight: (val: number) => void;
  processOutpaint: () => void;
  isProcessing: boolean;
  image: string | null;
  aiStatus: AIStatus;
}

export const OutpaintOptions: React.FC<OutpaintOptionsProps> = ({
  imageDimensions,
  outpaintTop,
  setOutpaintTop,
  outpaintBottom,
  setOutpaintBottom,
  outpaintLeft,
  setOutpaintLeft,
  outpaintRight,
  setOutpaintRight,
  processOutpaint,
  isProcessing,
  image,
  aiStatus
}) => {
  const totalExpand = outpaintTop + outpaintBottom + outpaintLeft + outpaintRight;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-bold text-blue-800 flex items-center gap-2">
          <ImagePlus size={18} />
          Mở rộng ảnh (Outpainting)
        </h4>
        <p className="text-sm text-blue-600 mt-1">
          Mở rộng ảnh ra ngoài viền gốc. AI sẽ tạo nội dung mới phù hợp với ảnh.
        </p>
      </div>

      {/* Image info */}
      {imageDimensions && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="text-gray-600">
            Kích thước hiện tại:{' '}
            <span className="font-bold">
              {imageDimensions.width} × {imageDimensions.height}px
            </span>
          </p>
        </div>
      )}

      {/* Expand controls */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Mở rộng (pixel):</p>

        {/* Top */}
        <div className="flex items-center gap-3">
          <div className="w-20 flex items-center gap-1 text-gray-500">
            <ChevronUp size={16} />
            <span className="text-sm">Trên</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={outpaintTop}
            onChange={(e) => setOutpaintTop(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <input
            type="number"
            min="0"
            max="500"
            value={outpaintTop}
            onChange={(e) =>
              setOutpaintTop(Math.max(0, Math.min(500, Number(e.target.value))))
            }
            className="w-16 px-2 py-1 border rounded text-sm text-center"
          />
        </div>

        {/* Bottom */}
        <div className="flex items-center gap-3">
          <div className="w-20 flex items-center gap-1 text-gray-500">
            <ChevronDown size={16} />
            <span className="text-sm">Dưới</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={outpaintBottom}
            onChange={(e) => setOutpaintBottom(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <input
            type="number"
            min="0"
            max="500"
            value={outpaintBottom}
            onChange={(e) =>
              setOutpaintBottom(Math.max(0, Math.min(500, Number(e.target.value))))
            }
            className="w-16 px-2 py-1 border rounded text-sm text-center"
          />
        </div>

        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-20 flex items-center gap-1 text-gray-500">
            <ChevronLeft size={16} />
            <span className="text-sm">Trái</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={outpaintLeft}
            onChange={(e) => setOutpaintLeft(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <input
            type="number"
            min="0"
            max="500"
            value={outpaintLeft}
            onChange={(e) =>
              setOutpaintLeft(Math.max(0, Math.min(500, Number(e.target.value))))
            }
            className="w-16 px-2 py-1 border rounded text-sm text-center"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="w-20 flex items-center gap-1 text-gray-500">
            <ChevronRight size={16} />
            <span className="text-sm">Phải</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={outpaintRight}
            onChange={(e) => setOutpaintRight(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <input
            type="number"
            min="0"
            max="500"
            value={outpaintRight}
            onChange={(e) =>
              setOutpaintRight(Math.max(0, Math.min(500, Number(e.target.value))))
            }
            className="w-16 px-2 py-1 border rounded text-sm text-center"
          />
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setOutpaintTop(100);
            setOutpaintBottom(100);
            setOutpaintLeft(100);
            setOutpaintRight(100);
          }}
          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
        >
          +100px tất cả
        </button>
        <button
          onClick={() => {
            setOutpaintTop(50);
            setOutpaintBottom(50);
            setOutpaintLeft(0);
            setOutpaintRight(0);
          }}
          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
        >
          +50px dọc
        </button>
        <button
          onClick={() => {
            setOutpaintTop(0);
            setOutpaintBottom(0);
            setOutpaintLeft(50);
            setOutpaintRight(50);
          }}
          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
        >
          +50px ngang
        </button>
        <button
          onClick={() => {
            setOutpaintTop(0);
            setOutpaintBottom(0);
            setOutpaintLeft(0);
            setOutpaintRight(0);
          }}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Reset
        </button>
      </div>

      {/* New dimensions preview */}
      {imageDimensions && totalExpand > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 text-sm">
          <p className="text-blue-700">
            Kích thước mới:{' '}
            <span className="font-bold">
              {imageDimensions.width + outpaintLeft + outpaintRight} ×{' '}
              {imageDimensions.height + outpaintTop + outpaintBottom}px
            </span>
          </p>
        </div>
      )}

      {/* Process button */}
      <button
        onClick={processOutpaint}
        disabled={
          isProcessing || !image || aiStatus !== 'available' || totalExpand === 0
        }
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Đang mở rộng...
          </>
        ) : (
          <>
            <ImagePlus size={20} />
            Mở rộng ảnh
          </>
        )}
      </button>
    </div>
  );
};
