import React from 'react';
import { Sparkles, Zap, Flame, Wand2 } from 'lucide-react';
import { ColorInspectionReport } from '../../../utils/aiColorInspection';
import { ColorAdjustSettings } from '../../../utils/colorAdjustment';
import { HeatmapMode } from '../types';
import { PrepressMetricsTiles } from './PrepressMetricsTiles';

interface InspectionInspectTabProps {
  isAnalyzing: boolean;
  report: ColorInspectionReport | null;
  activeHeatmapMode: HeatmapMode;
  onToggleHeatmap: (mode: HeatmapMode) => void;
  onApplyRecommendations: (settings: Partial<ColorAdjustSettings>) => void;
  isLightMode: boolean;
  themeCardBg: string;
  themeCardInner: string;
  themeTextMuted: string;
}

export const InspectionInspectTab: React.FC<InspectionInspectTabProps> = ({
  isAnalyzing,
  report,
  activeHeatmapMode,
  onToggleHeatmap,
  onApplyRecommendations,
  isLightMode,
  themeCardBg,
  themeCardInner,
  themeTextMuted,
}) => {
  return (
    <div className="space-y-4">
      {isAnalyzing ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full border-4 border-t-indigo-600 border-r-purple-600 border-b-pink-500 border-l-transparent animate-spin" />
            <Sparkles size={24} className="absolute inset-0 m-auto text-indigo-500 animate-pulse" />
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-sm">ChatGPT Vision đang quét phổ màu bản in...</h4>
            <p className={`text-xs mt-1 ${themeTextMuted}`}>
              Đang đo đạc tổng lượng mực TAC, kiểm tra gamut FOGRA39 và phân tích dải tương phản
            </p>
          </div>
        </div>
      ) : report ? (
        <>
          {/* TOP BANNER: SCORE & AI SUMMARY */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border relative overflow-hidden ${
              report.score >= 90
                ? isLightMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
                : report.score >= 75
                  ? isLightMode ? 'bg-blue-50/70 border-blue-200' : 'bg-blue-950/20 border-blue-500/30'
                  : isLightMode ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg">
                  <div className="text-center leading-none">
                    <span className="text-2xl font-black">{report.score}</span>
                    <span className="text-[10px] block opacity-80 font-semibold">/100</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${report.ratingColor}`}>
                      {report.rating}
                    </span>
                    <span className={`text-[11px] ${themeTextMuted}`}>Đo lúc {report.timestamp}</span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base mt-1">Đánh giá Tiêu chuẩn Kỹ thuật In ấn</h4>
                </div>
              </div>

              <button
                onClick={() => onApplyRecommendations(report.aiRecommendations.actionableSettings)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition active:scale-95 cursor-pointer shrink-0"
              >
                <Zap size={15} className="text-amber-300 animate-bounce" />
                <span>Tự động Áp dụng Cân chỉnh AI</span>
              </button>
            </div>

            <div className={`mt-3.5 pt-3.5 border-t ${isLightMode ? 'border-slate-200/80' : 'border-slate-700/50'}`}>
              <p className="leading-relaxed italic text-xs font-medium">"{report.aiSummaryText}"</p>
            </div>
          </div>

          {/* HEATMAP QUICK TOGGLE BAR */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 ${themeCardBg}`}>
            <div className="flex items-center gap-2">
              <Flame size={15} className="text-amber-500" />
              <span className="font-semibold text-xs">Chế độ Xem Bản đồ Nhiệt Lỗi (Heatmap Overlay):</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onToggleHeatmap('none')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  activeHeatmapMode === 'none'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : isLightMode ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                Tắt Heatmap
              </button>
              <button
                onClick={() => onToggleHeatmap('tac')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                  activeHeatmapMode === 'tac'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : isLightMode ? 'bg-white border-slate-300 text-rose-600' : 'bg-slate-900 border-slate-700 text-rose-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Vùng quá mực TAC (&gt;300%)
              </button>
              <button
                onClick={() => onToggleHeatmap('gamut')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                  activeHeatmapMode === 'gamut'
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : isLightMode ? 'bg-white border-slate-300 text-cyan-600' : 'bg-slate-900 border-slate-700 text-cyan-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                Vùng lệch dải CMYK
              </button>
              <button
                onClick={() => onToggleHeatmap('tone')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                  activeHeatmapMode === 'tone'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : isLightMode ? 'bg-white border-slate-300 text-amber-600' : 'bg-slate-900 border-slate-700 text-amber-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Cháy sáng / Bệt tối
              </button>
            </div>
          </div>

          {/* 4 CORE PREPRESS METRICS TILES */}
          <PrepressMetricsTiles
            report={report}
            isLightMode={isLightMode}
            themeCardBg={themeCardBg}
            themeTextMuted={themeTextMuted}
          />

          {/* AI RECOMMENDATIONS LIST */}
          <div className={`p-4 rounded-xl border ${themeCardInner}`}>
            <div className="flex items-center gap-2 mb-2.5">
              <Wand2 size={16} className="text-indigo-500" />
              <h5 className="font-bold text-xs">{report.aiRecommendations.title}</h5>
            </div>
            <ul className="space-y-1.5">
              {report.aiRecommendations.details.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px]">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span className={themeTextMuted}>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-slate-500">
          Chưa có dữ liệu kiểm tra. Nhấn "Quét lại" để bắt đầu.
        </div>
      )}
    </div>
  );
};
