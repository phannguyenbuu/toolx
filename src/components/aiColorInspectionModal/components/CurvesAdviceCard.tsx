import React from 'react';
import { TrendingUp, Gauge } from 'lucide-react';
import { PrintMatchComparisonReport } from '../../../utils/aiColorInspection';

interface CurvesAdviceCardProps {
  comparisonReport: PrintMatchComparisonReport;
  themeCardBg: string;
  themeTextMuted: string;
}

export const CurvesAdviceCard: React.FC<CurvesAdviceCardProps> = ({
  comparisonReport,
  themeCardBg,
  themeTextMuted,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* Curves Advice */}
      <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp size={16} className="text-purple-400" />
            <span className="font-bold text-xs">Đường cong Sắc độ (Curves)</span>
          </div>
          <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
            {comparisonReport.curvesRecommendation || 'Không cần can thiệp Curves nếu độ sáng đã cân đối.'}
          </p>
        </div>
        {comparisonReport.curvesMidtoneLift > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-purple-400">Nâng Midtone:</span>
            <span className="font-mono font-bold text-purple-400">+{comparisonReport.curvesMidtoneLift}%</span>
          </div>
        )}
      </div>

      {/* Brightness & Contrast Advice */}
      <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Gauge size={16} className="text-amber-400" />
            <span className="font-bold text-xs">Độ sáng & Độ tương phản</span>
          </div>
          <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
            Bù trừ quang độ cho máy in: Sáng (Brightness) và Tương phản (Contrast)
          </p>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
          <span>
            Brightness:{' '}
            <strong className="text-amber-400 font-mono">
              {comparisonReport.brightness > 0 ? `+${comparisonReport.brightness}` : comparisonReport.brightness}
            </strong>
          </span>
          <span>
            Contrast:{' '}
            <strong className="text-amber-400 font-mono">
              {comparisonReport.contrast > 0 ? `+${comparisonReport.contrast}` : comparisonReport.contrast}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
