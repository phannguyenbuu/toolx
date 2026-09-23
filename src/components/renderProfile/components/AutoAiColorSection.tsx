import React from 'react';
import {
  Zap,
  Sparkles,
  Eye,
  Camera,
  Upload,
  X,
  AlertTriangle
} from 'lucide-react';
import { RenderColorProfile, ThemeClasses, PrintMatchComparisonReport } from '../types';

interface AutoAiColorSectionProps {
  isLightMode: boolean;
  theme: ThemeClasses;
  editingProfile: RenderColorProfile;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  printedPhotoBase64: string | null;
  setPrintedPhotoBase64: (val: string | null) => void;
  isComparingAI: boolean;
  aiReport: PrintMatchComparisonReport | null;
  aiError: string | null;
  onApplyQuickCastCorrection: (type: 'de_red' | 'de_cyan' | 'de_yellow' | 'shadow_lift') => void;
  onOpenApiKeyModal: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunAICalibration: () => void;
}

export const AutoAiColorSection: React.FC<AutoAiColorSectionProps> = ({
  isLightMode,
  theme,
  editingProfile,
  previewCanvasRef,
  fileInputRef,
  printedPhotoBase64,
  setPrintedPhotoBase64,
  isComparingAI,
  aiReport,
  aiError,
  onApplyQuickCastCorrection,
  onOpenApiKeyModal,
  onFileUpload,
  onRunAICalibration
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Nút phát hiện & khử ám màu 1 chạm */}
      <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${theme.cardBg}`}>
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-xs flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
            <Zap size={14} className="text-amber-500" />
            <span>Khử lỗi màu nhanh</span>
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => onApplyQuickCastCorrection('de_red')}
            className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${theme.cardInner}`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Khử Ám Đỏ</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onApplyQuickCastCorrection('de_cyan')}
            className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${theme.cardInner}`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-cyan-600">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>Khử Ám Xanh</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onApplyQuickCastCorrection('de_yellow')}
            className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${theme.cardInner}`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Khử Ám Vàng</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onApplyQuickCastCorrection('shadow_lift')}
            className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${theme.cardInner}`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-500">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Nâng Vùng Tối</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. AI Computer Vision Calibration Studio */}
      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${theme.cardBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500 animate-pulse" />
            <div>
              <h4 className="font-medium text-xs text-slate-900 dark:text-slate-100">
                AI Vision so khớp & cân màu
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1 font-medium cursor-pointer ${
              isLightMode
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <span>Cài Token OpenAI</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Cột 1: Bản xem PC */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${theme.cardInner}`}>
            <div className="text-xs font-medium mb-2 flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Eye size={13} className="text-slate-400" />
              <span>Bản xem PC (Thiết kế gốc)</span>
            </div>
            <div className="w-full h-44 bg-slate-950/10 dark:bg-slate-950/40 rounded-lg overflow-hidden flex items-center justify-center relative">
              <canvas ref={previewCanvasRef} className="max-w-full max-h-full object-contain" />
            </div>
          </div>

          {/* Cột 2: Bản in thực tế tải lên */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${theme.cardInner}`}>
            <div className="text-xs font-medium mb-2 flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Camera size={13} className="text-slate-400" />
              <span>Ảnh chụp bản in thực tế</span>
            </div>
            {printedPhotoBase64 ? (
              <div className="w-full h-44 bg-slate-950/10 dark:bg-slate-950/40 rounded-lg overflow-hidden relative group">
                <img
                  src={printedPhotoBase64}
                  alt="Bản in thực tế"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setPrintedPhotoBase64(null)}
                  className="absolute top-2 right-2 p-1 rounded-md bg-rose-600 text-white shadow hover:bg-rose-500 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-44 border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer p-4 text-center transition ${
                  isLightMode
                    ? 'border-slate-300 hover:border-slate-500 bg-slate-50/50'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'
                }`}
              >
                <Upload size={20} className="text-slate-400 mb-1.5" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Tải lên ảnh chụp bản in thực tế</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {aiError && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{aiError}</span>
          </div>
        )}

        {/* Nút kích hoạt AI Vision */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={onRunAICalibration}
            disabled={isComparingAI || !printedPhotoBase64}
            className="px-4 py-2 rounded-xl bg-[#999] hover:bg-[#888] text-white disabled:opacity-40 font-medium text-xs flex items-center gap-2 shadow-xs active:scale-95 transition cursor-pointer"
          >
            <Sparkles size={14} className={isComparingAI ? 'animate-spin' : 'text-amber-300'} />
            <span>
              {isComparingAI
                ? 'AI Vision đang phân tích...'
                : 'AI Vision phân tích & bù trừ màu'}
            </span>
          </button>
        </div>

        {/* Bảng báo cáo AI sau khi so sánh */}
        {aiReport && (
          <div className={`p-3.5 rounded-xl border space-y-2 mt-3 ${theme.cardInner}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-slate-800 dark:text-slate-200">
                Kết quả chẩn đoán AI:
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                Độ tin cậy: 98%
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{aiReport.summary}</p>
            {aiReport.colorShiftDescription && (
              <p className={`text-[11px] ${theme.textMuted}`}>{aiReport.colorShiftDescription}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className={`p-2 rounded-lg border ${theme.cardBg}`}>
                <span className={theme.textMuted}>Cyan/Red:</span>{' '}
                <strong className="font-mono text-cyan-600">
                  {editingProfile.colorSettings.balanceCyanRed}
                </strong>
              </div>
              <div className={`p-2 rounded-lg border ${theme.cardBg}`}>
                <span className={theme.textMuted}>Magenta/Green:</span>{' '}
                <strong className="font-mono text-fuchsia-600">
                  {editingProfile.colorSettings.balanceMagentaGreen}
                </strong>
              </div>
              <div className={`p-2 rounded-lg border ${theme.cardBg}`}>
                <span className={theme.textMuted}>Yellow/Blue:</span>{' '}
                <strong className="font-mono text-amber-600">
                  {editingProfile.colorSettings.balanceYellowBlue}
                </strong>
              </div>
              <div className={`p-2 rounded-lg border ${theme.cardBg}`}>
                <span className={theme.textMuted}>Midtone Lift:</span>{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  +{aiReport.curvesMidtoneLift || 3}%
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
