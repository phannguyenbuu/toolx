import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { PrintMatchComparisonReport, ColorInspectionReport } from '../../../utils/aiColorInspection';
import { InspectionActiveTab } from '../types';

interface InspectionFooterProps {
  activeTab: InspectionActiveTab;
  comparisonReport: PrintMatchComparisonReport | null;
  report: ColorInspectionReport | null;
  isLightMode: boolean;
  themeTextMuted: string;
  onClose: () => void;
  onApplyComparison: () => void;
  onApplyReportRecommendations: () => void;
}

export const InspectionFooter: React.FC<InspectionFooterProps> = ({
  activeTab,
  comparisonReport,
  report,
  isLightMode,
  themeTextMuted,
  onClose,
  onApplyComparison,
  onApplyReportRecommendations,
}) => {
  return (
    <div
      className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 ${
        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[11px] flex items-center gap-1.5 ${themeTextMuted}`}>
          <Sparkles size={12} className="text-emerald-500" />
          <span>Được hỗ trợ bởi OpenAI ChatGPT Vision (gpt-4o-mini).</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
            isLightMode
              ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
        >
          Đóng
        </button>

        {activeTab === 'compare' && comparisonReport && (
          <button
            onClick={onApplyComparison}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
          >
            <Check size={14} />
            <span>Áp dụng bù trừ vào Color Studio</span>
          </button>
        )}

        {activeTab === 'inspect' && report && (
          <button
            onClick={onApplyReportRecommendations}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
          >
            <Check size={14} />
            <span>Áp dụng thông số tối ưu AI</span>
          </button>
        )}
      </div>
    </div>
  );
};
