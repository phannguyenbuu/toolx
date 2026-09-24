import React from 'react';
import { Upload, Eye, EyeOff } from 'lucide-react';
import { PreviewMode } from '../../types';

interface SettingsTabProps {
  currentImageUrl: string | null;
  showBgImage: boolean;
  setShowBgImage: (val: boolean) => void;
  bgImageOpacity: number;
  setBgImageOpacity: (val: number) => void;
  dieLineColor: string;
  setDieLineColor: (color: string) => void;
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  imgFileInputRef: React.RefObject<HTMLInputElement | null>;
}

const DIE_LINE_COLORS = [
  { color: '#FF007F', label: 'Magenta' },
  { color: '#00FFFF', label: 'Cyan' },
  { color: '#10B981', label: 'Green' },
  { color: '#EF4444', label: 'Red' },
  { color: '#000000', label: 'Black' }
];

const PREVIEW_MODES = [
  { id: 'die_line' as PreviewMode, label: 'Chỉ đường khuôn bế' },
  {
    id: 'mask_overlay' as PreviewMode,
    label: 'Mặt nạ phủ ngoài (Dim Overlay)'
  },
  {
    id: 'cut_preview' as PreviewMode,
    label: 'Mô phỏng nhãn cắt rời'
  }
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentImageUrl,
  showBgImage,
  setShowBgImage,
  bgImageOpacity,
  setBgImageOpacity,
  dieLineColor,
  setDieLineColor,
  previewMode,
  setPreviewMode,
  showGrid,
  setShowGrid,
  imgFileInputRef
}) => {
  return (
    <div className="p-3.5 space-y-4 flex-1">
      {/* Background Image Tracing Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Ảnh nguồn tham chiếu
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => imgFileInputRef.current?.click()}
              className="text-[10px] px-2 py-0.5 rounded-md bg-violet-100 hover:bg-violet-200 text-violet-700 font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <Upload size={10} />
              <span>{currentImageUrl ? 'Đổi ảnh' : 'Tải ảnh'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBgImage(!showBgImage)}
              className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium cursor-pointer p-1 rounded hover:bg-violet-50"
              title={showBgImage ? 'Ẩn ảnh nền' : 'Hiện ảnh nền'}
            >
              {showBgImage ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        </div>

        {showBgImage && (
          <div>
            <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
              <span>Độ mờ ảnh nền:</span>
              <span className="font-bold text-violet-700">
                {Math.round(bgImageOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={bgImageOpacity}
              onChange={(e) => setBgImageOpacity(parseFloat(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Die Line Styling */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Màu đường khuôn cắt (Die Line)
        </label>
        <div className="flex gap-2">
          {DIE_LINE_COLORS.map((c) => (
            <button
              key={c.color}
              type="button"
              onClick={() => setDieLineColor(c.color)}
              className={`w-7 h-7 rounded-lg border-2 transition cursor-pointer ${
                dieLineColor === c.color
                  ? 'border-slate-800 scale-110 shadow-md'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.color }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Preview Modes */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Chế độ xem trước
        </label>
        <div className="space-y-1.5">
          {PREVIEW_MODES.map((m) => (
            <label
              key={m.id}
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                previewMode === m.id
                  ? 'bg-violet-50 border-violet-400 text-violet-900 font-semibold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="preview_mode"
                checked={previewMode === m.id}
                onChange={() => setPreviewMode(m.id)}
                className="text-violet-600 focus:ring-0"
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Grid Toggle */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-600">Lưới toạ độ (Grid):</span>
        <input
          type="checkbox"
          checked={showGrid}
          onChange={(e) => setShowGrid(e.target.checked)}
          className="rounded text-violet-600 w-4 h-4 cursor-pointer"
        />
      </div>
    </div>
  );
};
