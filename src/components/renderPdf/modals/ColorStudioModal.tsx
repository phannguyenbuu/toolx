import React from 'react';
import {
  Palette,
  Sparkles,
  RotateCcw,
  Download,
  Copy,
  Check,
  X,
  Flame,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2
} from 'lucide-react';
import {
  ColorAdjustSettings,
  isDefaultColorSettings
} from '../../../utils/colorAdjustment';
import { CurveChannelType } from '../../ColorCurveEditor';
import { ColorStudioPanels } from '../ColorStudioPanels';

export interface ColorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewDocTitle: string;
  colorSettings: ColorAdjustSettings;
  setColorSettings: React.Dispatch<React.SetStateAction<ColorAdjustSettings>>;
  colorTab: 'curves' | 'brightness' | 'balance' | 'hsl' | 'cmyk' | 'rgb';
  setColorTab: (tab: 'curves' | 'brightness' | 'balance' | 'hsl' | 'cmyk' | 'rgb') => void;
  curveChannel: CurveChannelType;
  setCurveChannel: (channel: CurveChannelType) => void;
  showCompareOriginal: boolean;
  setShowCompareOriginal: (show: boolean) => void;
  previewZoom: number;
  setPreviewZoom: React.Dispatch<React.SetStateAction<number>>;
  handleFitStudioZoom: (w?: number, h?: number) => void;
  isStudioLoading: boolean;
  studioLoadingText: string;
  canvasDims: { width: number; height: number };
  activeHeatmapMode: 'none' | 'tac' | 'gamut' | 'tone';
  studioScrollAreaRef: React.RefObject<HTMLDivElement | null>;
  studioCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  heatmapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleRunAIColorCheck: () => Promise<void>;
  isAIAnalyzing: boolean;
  handleResetColorSettings: () => void;
  handleDownloadAdjustedImage: () => void;
  handleCopyAdjustedImageToClipboard: () => void;
  copiedPreviewToast: boolean;
  isLightMode: boolean;
}

export const ColorStudioModal: React.FC<ColorStudioModalProps> = ({
  isOpen,
  onClose,
  previewDocTitle,
  colorSettings,
  setColorSettings,
  colorTab,
  setColorTab,
  curveChannel,
  setCurveChannel,
  showCompareOriginal,
  setShowCompareOriginal,
  previewZoom,
  setPreviewZoom,
  handleFitStudioZoom,
  isStudioLoading,
  studioLoadingText,
  canvasDims,
  activeHeatmapMode,
  studioScrollAreaRef,
  studioCanvasRef,
  heatmapCanvasRef,
  handleRunAIColorCheck,
  isAIAnalyzing,
  handleResetColorSettings,
  handleDownloadAdjustedImage,
  handleCopyAdjustedImageToClipboard,
  copiedPreviewToast,
  isLightMode
}) => {
  if (!isOpen) return null;

  const themeHeader = isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const themeCard = isLightMode ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800 shadow-lg';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
      <div className={`relative border rounded-2xl overflow-hidden max-w-7xl w-full h-[92vh] flex flex-col shadow-2xl ${themeCard}`}>
        {/* Modal Header */}
        <div className={`flex flex-wrap items-center justify-between p-3.5 border-b gap-3 ${themeHeader}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Palette size={18} />
            </div>
            <div>
              <h4 className={`text-sm font-bold truncate max-w-md ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                {previewDocTitle} - Studio Chỉnh màu & Xem trước
              </h4>
              <p className={`text-[11px] ${themeTextMuted}`}>Hệ màu CMYK, RGB, Brightness/Contrast, Color Balance, HSL, Photoshop Curves</p>
            </div>
          </div>

          {/* Action Buttons in Modal Header */}
          <div className="flex items-center gap-2">
            <button
              onMouseDown={() => setShowCompareOriginal(true)}
              onMouseUp={() => setShowCompareOriginal(false)}
              onTouchStart={() => setShowCompareOriginal(true)}
              onTouchEnd={() => setShowCompareOriginal(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition select-none cursor-pointer ${
                showCompareOriginal
                  ? 'bg-amber-500 text-white border-amber-500 shadow'
                  : themeBtnSecondary
              }`}
              title="Nhấn và giữ chuột để xem ảnh gốc trước khi chỉnh màu"
            >
              <span>{showCompareOriginal ? 'Đang hiện ảnh gốc' : 'Giữ xem ảnh gốc'}</span>
            </button>

            <button
              onClick={handleRunAIColorCheck}
              disabled={isAIAnalyzing}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition active:scale-95 cursor-pointer"
              title="Kiểm tra chất lượng màu sắc, dải màu CMYK Offset, độ phủ mực TAC & cháy sáng bằng AI"
            >
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>Kiểm tra màu bằng AI</span>
            </button>

            <button
              onClick={handleResetColorSettings}
              disabled={isDefaultColorSettings(colorSettings)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer ${themeBtnSecondary}`}
              title="Khôi phục toàn bộ thanh trượt và Curves về mặc định"
            >
              <RotateCcw size={13} />
              <span>Đặt lại (Reset)</span>
            </button>

            <button
              onClick={handleDownloadAdjustedImage}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
              title="Tải ảnh PNG thành phẩm đã áp dụng màu mới"
            >
              <Download size={13} />
              <span>Tải ảnh đã chỉnh màu</span>
            </button>

            <button
              onClick={handleCopyAdjustedImageToClipboard}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
              title="Sao chép ảnh đã chỉnh màu vào Clipboard"
            >
              {copiedPreviewToast ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-rose-500/20 rounded-xl text-slate-400 hover:text-rose-500 transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Workspace (Split: Left Viewport, Right Sliders & Curves) */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT VIEWPORT: LIVE ADJUSTED CANVAS */}
          <div className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative ${isLightMode ? 'bg-slate-200/50' : 'bg-slate-950'}`}>
            {/* Viewport Zoom Toolbar */}
            <div className={`h-9 border-b px-4 flex items-center justify-between text-xs ${themeHeader}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold ${themeTextMuted}`}>
                  {showCompareOriginal ? 'Đang so sánh: ẢNH GỐC' : 'Đang hiển thị: ẢNH ĐÃ CHỈNH MÀU'}
                </span>
                {activeHeatmapMode !== 'none' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                    <Flame size={11} />
                    <span>Heatmap: {activeHeatmapMode === 'tac' ? 'Quá mực TAC (>300%)' : activeHeatmapMode === 'gamut' ? 'Lệch dải CMYK' : 'Tone Clipping'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(0.05, Math.round((z - 0.1) * 100) / 100))}
                  className="p-1 rounded hover:bg-slate-500/20 cursor-pointer"
                  title="Thu nhỏ (-10%)"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="font-mono text-[11px] min-w-[38px] text-center font-bold text-indigo-500">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(3.0, Math.round((z + 0.1) * 100) / 100))}
                  className="p-1 rounded hover:bg-slate-500/20 cursor-pointer"
                  title="Phóng to (+10%)"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => handleFitStudioZoom()}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer hover:border-indigo-500 transition ${themeBtnSecondary}`}
                  title="Thu phóng vừa vặn khung hình xem trước"
                >
                  Vừa khung
                </button>
                <button
                  onClick={() => setPreviewZoom(1.0)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer hover:border-indigo-500 transition ${themeBtnSecondary}`}
                  title="Hiển thị tỉ lệ pixel gốc 100%"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Main Canvas Scroll Area */}
            <div
              ref={studioScrollAreaRef}
              className="flex-1 min-w-0 min-h-0 overflow-auto p-6 flex relative bg-dot-pattern"
            >
              {isStudioLoading && (
                <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
                  <div className="relative mb-4">
                    <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Maximize2 size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-400" />
                    <span>{studioLoadingText}</span>
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Đang giải nén ma trận điểm ảnh gốc độ phân giải cao và kết xuất không gian màu trung thực...
                  </p>
                </div>
              )}

              <div
                style={{
                  width: canvasDims.width ? `${Math.round(canvasDims.width * previewZoom)}px` : 'auto',
                  height: canvasDims.height ? `${Math.round(canvasDims.height * previewZoom)}px` : 'auto',
                }}
                className="relative m-auto flex items-center justify-center flex-shrink-0 transition-[width,height] duration-75"
              >
                <canvas
                  ref={studioCanvasRef}
                  className="w-full h-full rounded shadow-2xl bg-white border border-slate-800 block"
                />
                <canvas
                  ref={heatmapCanvasRef}
                  className={`absolute inset-0 w-full h-full rounded pointer-events-none transition-opacity duration-200 block ${
                    activeHeatmapMode !== 'none' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: COLOR ADJUSTMENT SUITE (SLIDERS & CURVES) */}
          <ColorStudioPanels
            colorSettings={colorSettings}
            setColorSettings={setColorSettings}
            colorTab={colorTab}
            setColorTab={setColorTab}
            curveChannel={curveChannel}
            setCurveChannel={setCurveChannel}
            handleRunAIColorCheck={handleRunAIColorCheck}
            isAIAnalyzing={isAIAnalyzing}
            handleResetColorSettings={handleResetColorSettings}
            handleDownloadAdjustedImage={handleDownloadAdjustedImage}
            isLightMode={isLightMode}
          />
        </div>
      </div>
    </div>
  );
};
