import React from 'react';
import {
  Image as ImageIcon,
  Camera,
  Trash2,
  Upload,
  Sparkles,
  Check,
  Zap,
} from 'lucide-react';
import { PrintMatchComparisonReport } from '../../../utils/aiColorInspection';
import { ColorBalanceTable } from './ColorBalanceTable';
import { CurvesAdviceCard } from './CurvesAdviceCard';

interface InspectionCompareTabProps {
  studioCanvas?: HTMLCanvasElement | null;
  printedPhotoBase64: string | null;
  isComparing: boolean;
  compareError: string | null;
  comparisonReport: PrintMatchComparisonReport | null;
  appliedToast: boolean;
  isLightMode: boolean;
  themeCardBg: string;
  themeCardInner: string;
  themeTextMuted: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearPhoto: () => void;
  onRunCompare: () => void;
  onApplyComparison: () => void;
}

export const InspectionCompareTab: React.FC<InspectionCompareTabProps> = ({
  studioCanvas,
  printedPhotoBase64,
  isComparing,
  compareError,
  comparisonReport,
  appliedToast,
  isLightMode,
  themeCardBg,
  themeCardInner,
  themeTextMuted,
  fileInputRef,
  onFileUpload,
  onClearPhoto,
  onRunCompare,
  onApplyComparison,
}) => {
  return (
    <div className="space-y-5">
      {/* DUAL IMAGE COMPARISON BOXES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Bản xem PC */}
        <div className={`p-3.5 rounded-2xl border flex flex-col ${themeCardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-500">
              <ImageIcon size={15} />
              <span>Bản xem PC (File thiết kế chuẩn)</span>
            </span>
            <span className={`text-[10px] ${themeTextMuted}`}>Lấy từ màn hình Canvas</span>
          </div>

          <div className="flex-1 min-h-[190px] max-h-[230px] rounded-xl overflow-hidden bg-black/40 border border-slate-700/50 flex items-center justify-center p-2 relative">
            {studioCanvas ? (
              <img
                src={studioCanvas.toDataURL('image/png')}
                alt="Bản xem PC"
                className="max-h-[190px] max-w-full object-contain rounded shadow"
              />
            ) : (
              <span className={themeTextMuted}>Chưa có hình ảnh bản PC</span>
            )}
          </div>
        </div>

        {/* 2. Bản in ra thực tế */}
        <div className={`p-3.5 rounded-2xl border flex flex-col ${themeCardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs flex items-center gap-1.5 text-amber-500">
              <Camera size={15} />
              <span>Bản in ra (Ảnh chụp thực tế)</span>
            </span>
            {printedPhotoBase64 && (
              <button
                onClick={onClearPhoto}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 size={12} />
                <span>Xóa ảnh</span>
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[190px] max-h-[230px] rounded-xl overflow-hidden bg-black/40 border border-dashed border-slate-700 flex items-center justify-center p-2 relative">
            {printedPhotoBase64 ? (
              <img
                src={printedPhotoBase64}
                alt="Bản in ra thực tế"
                className="max-h-[190px] max-w-full object-contain rounded shadow"
              />
            ) : (
              <div className="text-center p-4">
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-xs mb-1">Tải lên ảnh chụp tờ in thực tế</p>
                <p className={`text-[11px] mb-3 ${themeTextMuted}`}>
                  Chụp ảnh sản phẩm in bằng điện thoại và tải lên để AI so màu
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  Chọn ảnh chụp...
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* ACTION: RUN CHATGPT VISION ANALYSIS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20">
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Sparkles size={16} />
            <span>Phân tích sai lệch màu & Tính thông số bù trừ bằng ChatGPT AI</span>
          </h4>
          <p className={`text-[11px] mt-0.5 ${themeTextMuted}`}>
            AI sẽ đối chiếu sắc độ giữa 2 ảnh và xuất bảng Color Balance (Shadows, Midtones, Highlights) cùng Curves
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {printedPhotoBase64 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold ${themeCardInner}`}
            >
              Đổi ảnh chụp khác
            </button>
          )}

          <button
            onClick={onRunCompare}
            disabled={isComparing || !printedPhotoBase64}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles size={15} className={isComparing ? 'animate-spin' : 'animate-bounce text-amber-300'} />
            <span>{isComparing ? 'ChatGPT đang phân tích 2 ảnh...' : 'Phân tích màu bằng AI'}</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {compareError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
          {compareError}
        </div>
      )}

      {/* COMPARISON RESULTS */}
      {comparisonReport && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary Box */}
          <div
            className={`p-4 rounded-2xl border ${
              isLightMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check size={16} />
                <span>Kết quả nhận định từ ChatGPT Vision:</span>
              </span>

              {/* Quick Apply Button */}
              <button
                onClick={onApplyComparison}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
              >
                {appliedToast ? (
                  <Check size={14} className="text-white" />
                ) : (
                  <Zap size={14} className="text-amber-300" />
                )}
                <span>{appliedToast ? 'Đã áp dụng vào Studio!' : 'Áp dụng vào Color Studio'}</span>
              </button>
            </div>

            <p className="text-xs leading-relaxed font-medium">"{comparisonReport.summary}"</p>
            {comparisonReport.colorShiftDescription && (
              <p className={`text-[11px] mt-1.5 leading-relaxed ${themeTextMuted}`}>
                {comparisonReport.colorShiftDescription}
              </p>
            )}
          </div>

          {/* 1. COLOR BALANCE TABLE (PHOTOSHOP STYLE) */}
          <ColorBalanceTable
            comparisonReport={comparisonReport}
            isLightMode={isLightMode}
            themeCardBg={themeCardBg}
            themeTextMuted={themeTextMuted}
          />

          {/* 2. CURVES & LUMINOSITY RECOMMENDATIONS */}
          <CurvesAdviceCard
            comparisonReport={comparisonReport}
            themeCardBg={themeCardBg}
            themeTextMuted={themeTextMuted}
          />
        </div>
      )}
    </div>
  );
};
