import React from 'react';
import { Sparkles, Palette, Download, Sliders } from 'lucide-react';

export interface OfflineSettingsPanelProps {
  offlineDpi: 72 | 150 | 300 | 600;
  setOfflineDpi: (dpi: 72 | 150 | 300 | 600) => void;
  offlineColorMode: 'rgb' | 'cmyk-sim' | 'grayscale';
  setOfflineColorMode: (mode: 'rgb' | 'cmyk-sim' | 'grayscale') => void;
  offlineFormat: 'png' | 'jpeg';
  setOfflineFormat: (fmt: 'png' | 'jpeg') => void;
  offlineJpegQuality: number;
  setOfflineJpegQuality: (q: number) => void;
  offlineTransparentBg: boolean;
  setOfflineTransparentBg: (t: boolean) => void;
  offlineCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  offlineFileName: string;
  offlineCurrentPage: number;
  offlineTotalPages: number;
  isExportingAllPages: boolean;
  exportProgressText: string;
  handleExportAllPagesCalibrated: () => Promise<void>;
  handleOpenColorStudio: (url: string, title?: string) => void;
  handleOpenWithAICheck: (url: string, title?: string) => void;
  setProfileModalOpen: (open: boolean) => void;
  isLightMode: boolean;
  themeCard: string;
  themeTextMuted: string;
  themeBtnSecondary: string;
  themeInput: string;
}

export const OfflineSettingsPanel: React.FC<OfflineSettingsPanelProps> = ({
  offlineDpi,
  setOfflineDpi,
  offlineColorMode,
  setOfflineColorMode,
  offlineFormat,
  setOfflineFormat,
  offlineJpegQuality,
  setOfflineJpegQuality,
  offlineTransparentBg,
  setOfflineTransparentBg,
  offlineCanvasRef,
  offlineFileName,
  offlineCurrentPage,
  offlineTotalPages,
  isExportingAllPages,
  exportProgressText,
  handleExportAllPagesCalibrated,
  handleOpenColorStudio,
  handleOpenWithAICheck,
  setProfileModalOpen,
  isLightMode,
  themeCard,
  themeTextMuted,
  themeBtnSecondary,
  themeInput,
}) => {
  return (
    <div className={`w-56 border-l p-4 space-y-4 text-xs ${themeCard}`}>
      <div>
        <label className={`block text-[11px] font-semibold mb-1.5 ${themeTextMuted}`}>Độ phân giải (DPI):</label>
        <div className="grid grid-cols-2 gap-1">
          {([72, 150, 300, 600] as const).map((d) => (
            <button
              key={d}
              onClick={() => setOfflineDpi(d)}
              className={`py-1.5 rounded-lg text-center font-medium transition cursor-pointer ${
                offlineDpi === d ? 'bg-indigo-600 text-white' : themeBtnSecondary
              }`}
            >
              {d} DPI
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={`block text-[11px] font-semibold mb-1.5 ${themeTextMuted}`}>Màu sắc:</label>
        <select
          value={offlineColorMode}
          onChange={(e) => setOfflineColorMode(e.target.value as any)}
          className={`w-full border rounded-lg p-2 ${themeInput}`}
        >
          <option value="original">Màu gốc (RGB)</option>
          <option value="cmyk-sim">Mô phỏng CMYK</option>
          <option value="grayscale">Trắng đen</option>
        </select>
      </div>

      <div>
        <label className={`block text-[11px] font-semibold mb-1.5 ${themeTextMuted}`}>Định dạng ảnh:</label>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setOfflineFormat('png')}
            className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${offlineFormat === 'png' ? 'bg-indigo-600 text-white' : themeBtnSecondary}`}
          >
            PNG
          </button>
          <button
            onClick={() => setOfflineFormat('jpeg')}
            className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${offlineFormat === 'jpeg' ? 'bg-indigo-600 text-white' : themeBtnSecondary}`}
          >
            JPEG
          </button>
        </div>
      </div>

      {offlineFormat === 'jpeg' && (
        <div>
          <div className={`flex justify-between text-[11px] font-semibold mb-1 ${themeTextMuted}`}>
            <span>Chất lượng JPEG:</span>
            <span className={isLightMode ? 'text-slate-800' : 'text-slate-200'}>{offlineJpegQuality}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            value={offlineJpegQuality}
            onChange={(e) => setOfflineJpegQuality(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      )}

      {offlineFormat === 'png' && (
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={offlineTransparentBg}
            onChange={(e) => setOfflineTransparentBg(e.target.checked)}
            className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
          />
          <span className={`text-xs ${themeTextMuted}`}>Nền trong suốt</span>
        </label>
      )}

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          onClick={() => {
            if (offlineCanvasRef.current) {
              handleOpenWithAICheck(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
            }
          }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
          title="Kiểm tra chất lượng màu trang này bằng AI"
        >
          <Sparkles size={14} className="text-amber-300 animate-pulse" />
          <span>Kiểm tra màu bằng AI</span>
        </button>

        <button
          onClick={() => {
            if (offlineCanvasRef.current) {
              handleOpenColorStudio(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
            }
          }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow cursor-pointer"
        >
          <Palette size={14} />
          <span>Mở Studio Chỉnh màu</span>
        </button>

        <button
          onClick={handleExportAllPagesCalibrated}
          disabled={isExportingAllPages}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
        >
          <Download size={14} className={isExportingAllPages ? 'animate-spin' : ''} />
          <span>{isExportingAllPages ? (exportProgressText || 'Đang xuất...') : `Xuất PDF toàn bộ (${offlineTotalPages} trang)`}</span>
        </button>

        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          className={`w-full py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${themeBtnSecondary}`}
        >
          <Sliders size={13} className="text-purple-500" />
          <span>Cấu hình Profile & Bộ lọc</span>
        </button>
      </div>
    </div>
  );
};
