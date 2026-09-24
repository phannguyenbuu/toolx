import React, { useRef, useState, useEffect } from 'react';
import { Palette, Loader2 } from 'lucide-react';
import { ColorMode } from '../../types';
import { applyColorEffectToImageData } from '../../helpers/colorFilters';

interface ColorOptionsProps {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  colorIntensity: number;
  setColorIntensity: (val: number) => void;
  image: string | null;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  processColorConvert: () => void;
  isProcessing: boolean;
}

const COLOR_EFFECTS: { id: ColorMode; name: string; desc: string }[] = [
  { id: 'grayscale', name: 'Grayscale', desc: 'Chuyển trắng đen' },
  { id: 'sepia', name: 'Sepia', desc: 'Tông nâu cổ điển' },
  { id: 'invert', name: 'Invert', desc: 'Đảo ngược màu' },
  { id: 'brightness', name: 'Brightness', desc: 'Độ sáng' },
  { id: 'contrast', name: 'Contrast', desc: 'Độ tương phản' },
  { id: 'saturate', name: 'Saturate', desc: 'Độ bão hòa' }
];

export const ColorOptions: React.FC<ColorOptionsProps> = ({
  colorMode,
  setColorMode,
  colorIntensity,
  setColorIntensity,
  image,
  imageRef,
  processColorConvert,
  isProcessing
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Realtime preview
  useEffect(() => {
    if (!previewCanvasRef.current || !imageRef.current || !image) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setPreviewLoading(true);

    const img = imageRef.current;
    const containerWidth = canvas.parentElement?.clientWidth || 200;
    const containerHeight = canvas.parentElement?.clientHeight || 128;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (containerWidth - w) / 2;
    const y = (containerHeight - h) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, w, h);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyColorEffectToImageData(imageData.data, colorMode, colorIntensity);
    ctx.putImageData(imageData, 0, 0);

    setPreviewLoading(false);
  }, [colorMode, colorIntensity, image, imageRef]);

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <h4 className="font-bold text-orange-800 flex items-center gap-2">
          <Palette size={18} />
          Chuyển đổi màu
        </h4>
        <p className="text-sm text-orange-600 mt-1">Chuyển đổi và điều chỉnh màu sắc ảnh.</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Chọn hiệu ứng:</p>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_EFFECTS.map((effect) => (
            <button
              key={effect.id}
              onClick={() => setColorMode(effect.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                colorMode === effect.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <p className="font-medium text-sm">{effect.name}</p>
              <p className="text-xs text-gray-500">{effect.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity slider for adjustable effects */}
      {['brightness', 'contrast', 'saturate'].includes(colorMode) && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Cường độ</span>
            <span className="font-bold text-orange-600">{colorIntensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={colorIntensity}
            onChange={(e) => setColorIntensity(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>
      )}

      {/* Preview */}
      {image && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Xem trước:</p>
          <div className="h-32 rounded-lg overflow-hidden bg-white border relative">
            {previewLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <Loader2 size={24} className="animate-spin text-orange-500" />
              </div>
            )}
            <canvas ref={previewCanvasRef} className="w-full h-full" />
          </div>
        </div>
      )}

      <button
        onClick={processColorConvert}
        disabled={isProcessing || !image}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <Palette size={20} />
            Áp dụng hiệu ứng
          </>
        )}
      </button>
    </div>
  );
};
