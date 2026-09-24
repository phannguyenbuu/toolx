import React from 'react';
import { Options, DotType, CornerSquareType } from 'qr-code-styling';

interface QRStylePanelProps {
  design: Options;
  setDesign: React.Dispatch<React.SetStateAction<Options>>;
  useGradient: boolean;
  setUseGradient: (val: boolean) => void;
  gradientColors: { start: string; end: string };
  setGradientColors: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  separateEyeColor: boolean;
  setSeparateEyeColor: (val: boolean) => void;
  logoFile: string;
  setLogoFile: (file: string) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DOT_TYPES: DotType[] = [
  'square',
  'dots',
  'rounded',
  'extra-rounded',
  'classy',
  'classy-rounded'
];

const CORNER_SQUARE_TYPES: CornerSquareType[] = [
  'square',
  'dot',
  'extra-rounded'
];

export const QRStylePanel: React.FC<QRStylePanelProps> = ({
  design,
  setDesign,
  useGradient,
  setUseGradient,
  gradientColors,
  setGradientColors,
  separateEyeColor,
  setSeparateEyeColor,
  logoFile,
  setLogoFile,
  handleLogoUpload
}) => {
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">2) Thiết kế</h3>
        <span className="text-[11px] text-slate-400">Trực quan & nhanh</span>
      </div>

      <div className="space-y-4">
        {/* Dot Types */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">
            Kiểu điểm
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DOT_TYPES.map((type) => {
              const isActive = design.dotsOptions?.type === type;
              const previewClass =
                type === 'square'
                  ? 'rounded-none'
                  : type === 'dots'
                  ? 'rounded-full'
                  : type === 'rounded'
                  ? 'rounded-md'
                  : type === 'extra-rounded'
                  ? 'rounded-xl'
                  : type === 'classy'
                  ? 'rounded-md rotate-45'
                  : 'rounded-xl rotate-45';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setDesign({
                      ...design,
                      dotsOptions: { ...design.dotsOptions, type }
                    })
                  }
                  className={`rounded-xl border p-2 text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={type}
                >
                  <span className={`w-5 h-5 bg-slate-900 ${previewClass}`} />
                  <span className="leading-none">{type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Corner Square Types */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">
            Kiểu góc
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CORNER_SQUARE_TYPES.map((type) => {
              const isActive = design.cornersSquareOptions?.type === type;
              const previewClass =
                type === 'square'
                  ? 'rounded-none'
                  : type === 'dot'
                  ? 'rounded-full'
                  : 'rounded-xl';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setDesign({
                      ...design,
                      cornersSquareOptions: {
                        ...design.cornersSquareOptions,
                        type
                      }
                    })
                  }
                  className={`rounded-xl border p-2 text-[11px] font-semibold transition-all flex items-center justify-start gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={type}
                >
                  <span
                    className={`w-5 h-5 border-2 border-slate-900 ${previewClass}`}
                  />
                  <span className="leading-none">{type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Màu QR
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.dotsOptions?.color || '#000000'}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    dotsOptions: {
                      ...design.dotsOptions,
                      color: e.target.value
                    }
                  })
                }
                className="w-9 h-9 rounded-xl cursor-pointer border-0 shadow-sm"
              />
              <span className="text-[11px] text-slate-400 font-mono truncate">
                {design.dotsOptions?.color}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Màu nền
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.backgroundOptions?.color || '#ffffff'}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    backgroundOptions: {
                      ...design.backgroundOptions,
                      color: e.target.value
                    }
                  })
                }
                className="w-9 h-9 rounded-xl cursor-pointer border-0 shadow-sm"
              />
              <span className="text-[11px] text-slate-400 font-mono truncate">
                {design.backgroundOptions?.color}
              </span>
            </div>
          </div>
        </div>

        {/* Gradient */}
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useGradient}
              onChange={(e) => setUseGradient(e.target.checked)}
              className="rounded text-indigo-500 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-700 font-medium">Gradient</span>
          </label>
          {useGradient && (
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={gradientColors.start}
                onChange={(e) =>
                  setGradientColors({ ...gradientColors, start: e.target.value })
                }
                className="w-7 h-7 rounded-lg cursor-pointer border-0"
              />
              <span className="text-slate-300 text-xs">→</span>
              <input
                type="color"
                value={gradientColors.end}
                onChange={(e) =>
                  setGradientColors({ ...gradientColors, end: e.target.value })
                }
                className="w-7 h-7 rounded-lg cursor-pointer border-0"
              />
            </div>
          )}
        </div>

        {/* Separate Eye Color */}
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={separateEyeColor}
              onChange={(e) => setSeparateEyeColor(e.target.checked)}
              className="rounded text-indigo-500 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-700 font-medium">Tách màu mắt</span>
          </label>
          {separateEyeColor && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(design.cornersSquareOptions?.color as string) || '#000000'}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    cornersSquareOptions: {
                      ...design.cornersSquareOptions,
                      color: e.target.value as any
                    }
                  })
                }
                className="w-7 h-7 rounded-lg cursor-pointer border-0"
                title="Màu góc"
              />
              <input
                type="color"
                value={(design.cornersDotOptions?.color as string) || '#000000'}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    cornersDotOptions: {
                      ...design.cornersDotOptions,
                      color: e.target.value as any
                    }
                  })
                }
                className="w-7 h-7 rounded-lg cursor-pointer border-0"
                title="Màu chấm góc"
              />
            </div>
          )}
        </div>

        {/* Center Logo */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Logo giữa
          </label>
          <div className="flex items-center gap-2">
            <label className="px-3 py-2 bg-white rounded-xl text-xs text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors shadow-sm border border-slate-200">
              Chọn file
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            {logoFile && (
              <>
                <span className="text-[11px] text-emerald-600 font-medium">
                  Đã chọn
                </span>
                <button
                  type="button"
                  onClick={() => setLogoFile('')}
                  className="text-[11px] text-red-500 hover:text-red-600 font-medium cursor-pointer"
                >
                  Xóa
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
