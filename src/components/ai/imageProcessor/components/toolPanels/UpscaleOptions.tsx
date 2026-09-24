import React from 'react';
import { ScanLine, Loader2 } from 'lucide-react';

interface UpscaleOptionsProps {
  imageDimensions: { width: number; height: number } | null;
  upscaleFactor: 2 | 4;
  setUpscaleFactor: (factor: 2 | 4) => void;
  processUpscale: () => void;
  isProcessing: boolean;
  image: string | null;
}

export const UpscaleOptions: React.FC<UpscaleOptionsProps> = ({
  imageDimensions,
  upscaleFactor,
  setUpscaleFactor,
  processUpscale,
  isProcessing,
  image
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h4 className="font-bold text-purple-800 flex items-center gap-2">
          <ScanLine size={18} />
          Nâng cấp chất lượng
        </h4>
        <p className="text-sm text-purple-600 mt-1">
          Tăng độ phân giải ảnh lên 2x, 4x với AI Super Resolution.
        </p>
      </div>

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

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Hệ số phóng to:</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setUpscaleFactor(2)}
            className={`p-4 rounded-xl border-2 transition-all ${
              upscaleFactor === 2
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <p className="text-2xl font-bold text-purple-600">2x</p>
            <p className="text-xs text-gray-500 mt-1">
              {imageDimensions
                ? `${imageDimensions.width * 2} × ${imageDimensions.height * 2}px`
                : 'Gấp đôi'}
            </p>
          </button>
          <button
            onClick={() => setUpscaleFactor(4)}
            className={`p-4 rounded-xl border-2 transition-all ${
              upscaleFactor === 4
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <p className="text-2xl font-bold text-purple-600">4x</p>
            <p className="text-xs text-gray-500 mt-1">
              {imageDimensions
                ? `${imageDimensions.width * 4} × ${imageDimensions.height * 4}px`
                : 'Gấp 4'}
            </p>
          </button>
        </div>
      </div>

      {imageDimensions && (
        <div className="bg-purple-50 rounded-lg p-3 text-sm">
          <p className="text-purple-700">
            Kích thước mới:{' '}
            <span className="font-bold">
              {imageDimensions.width * upscaleFactor} ×{' '}
              {imageDimensions.height * upscaleFactor}px
            </span>
          </p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-700">
          <strong>Lưu ý:</strong> Upscale 4x có thể mất nhiều thời gian hơn. Ảnh lớn
          có thể tốn nhiều bộ nhớ.
        </p>
      </div>

      <button
        onClick={processUpscale}
        disabled={isProcessing || !image}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Đang nâng cấp...
          </>
        ) : (
          <>
            <ScanLine size={20} />
            Nâng cấp {upscaleFactor}x
          </>
        )}
      </button>
    </div>
  );
};
