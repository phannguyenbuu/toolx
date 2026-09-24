import React from 'react';
import { Sliders } from 'lucide-react';
import { PrintMatchComparisonReport } from '../../../utils/aiColorInspection';

interface ColorBalanceTableProps {
  comparisonReport: PrintMatchComparisonReport;
  isLightMode: boolean;
  themeCardBg: string;
  themeTextMuted: string;
}

export const ColorBalanceTable: React.FC<ColorBalanceTableProps> = ({
  comparisonReport,
  isLightMode,
  themeCardBg,
  themeTextMuted,
}) => {
  return (
    <div className={`p-4 rounded-2xl border overflow-hidden ${themeCardBg}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h5 className="font-bold text-xs text-indigo-500 flex items-center gap-1.5">
            <Sliders size={15} />
            <span>Bảng thông số bù trừ Color Balance (Photoshop Format)</span>
          </h5>
          <p className={`text-[11px] ${themeTextMuted}`}>
            Áp dụng cho từng vùng sắc độ Shadows (Vùng tối), Midtones (Vùng trung), Highlights (Vùng sáng)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr
              className={`border-b text-[11px] font-bold ${
                isLightMode ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-200'
              }`}
            >
              <th className="py-2.5 px-3 text-left">Tone Balance</th>
              <th className="py-2.5 px-3 text-rose-500">Cyan ↔ Red</th>
              <th className="py-2.5 px-3 text-emerald-500">Magenta ↔ Green</th>
              <th className="py-2.5 px-3 text-blue-500">Yellow ↔ Blue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30 font-mono text-xs">
            <tr>
              <td className="py-2.5 px-3 text-left font-sans font-semibold">Shadows (Vùng tối)</td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.shadows.cyanRed > 0
                    ? 'text-rose-500'
                    : comparisonReport.toneBalance.shadows.cyanRed < 0
                      ? 'text-cyan-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.shadows.cyanRed > 0
                  ? `+${comparisonReport.toneBalance.shadows.cyanRed}`
                  : comparisonReport.toneBalance.shadows.cyanRed}
              </td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.shadows.magentaGreen > 0
                    ? 'text-emerald-500'
                    : comparisonReport.toneBalance.shadows.magentaGreen < 0
                      ? 'text-fuchsia-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.shadows.magentaGreen > 0
                  ? `+${comparisonReport.toneBalance.shadows.magentaGreen}`
                  : comparisonReport.toneBalance.shadows.magentaGreen}
              </td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.shadows.yellowBlue > 0
                    ? 'text-blue-500'
                    : comparisonReport.toneBalance.shadows.yellowBlue < 0
                      ? 'text-amber-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.shadows.yellowBlue > 0
                  ? `+${comparisonReport.toneBalance.shadows.yellowBlue}`
                  : comparisonReport.toneBalance.shadows.yellowBlue}
              </td>
            </tr>
            <tr className={isLightMode ? 'bg-indigo-50/50' : 'bg-indigo-950/20'}>
              <td className="py-2.5 px-3 text-left font-sans font-bold text-indigo-500">
                Midtones (Vùng trung) ★
              </td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.midtones.cyanRed > 0
                    ? 'text-rose-500'
                    : comparisonReport.toneBalance.midtones.cyanRed < 0
                      ? 'text-cyan-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.midtones.cyanRed > 0
                  ? `+${comparisonReport.toneBalance.midtones.cyanRed}`
                  : comparisonReport.toneBalance.midtones.cyanRed}
              </td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.midtones.magentaGreen > 0
                    ? 'text-emerald-500'
                    : comparisonReport.toneBalance.midtones.magentaGreen < 0
                      ? 'text-fuchsia-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.midtones.magentaGreen > 0
                  ? `+${comparisonReport.toneBalance.midtones.magentaGreen}`
                  : comparisonReport.toneBalance.midtones.magentaGreen}
              </td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.midtones.yellowBlue > 0
                    ? 'text-blue-500'
                    : comparisonReport.toneBalance.midtones.yellowBlue < 0
                      ? 'text-amber-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.midtones.yellowBlue > 0
                  ? `+${comparisonReport.toneBalance.midtones.yellowBlue}`
                  : comparisonReport.toneBalance.midtones.yellowBlue}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-left font-sans font-semibold">Highlights (Vùng sáng)</td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.highlights.cyanRed > 0
                    ? 'text-rose-500'
                    : comparisonReport.toneBalance.highlights.cyanRed < 0
                      ? 'text-cyan-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.highlights.cyanRed > 0
                  ? `+${comparisonReport.toneBalance.highlights.cyanRed}`
                  : comparisonReport.toneBalance.highlights.cyanRed}
              </td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.highlights.magentaGreen > 0
                    ? 'text-emerald-500'
                    : comparisonReport.toneBalance.highlights.magentaGreen < 0
                      ? 'text-fuchsia-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.highlights.magentaGreen > 0
                  ? `+${comparisonReport.toneBalance.highlights.magentaGreen}`
                  : comparisonReport.toneBalance.highlights.magentaGreen}
              </td>
              <td
                className={`py-2.5 px-3 font-bold ${
                  comparisonReport.toneBalance.highlights.yellowBlue > 0
                    ? 'text-blue-500'
                    : comparisonReport.toneBalance.highlights.yellowBlue < 0
                      ? 'text-amber-400'
                      : ''
                }`}
              >
                {comparisonReport.toneBalance.highlights.yellowBlue > 0
                  ? `+${comparisonReport.toneBalance.highlights.yellowBlue}`
                  : comparisonReport.toneBalance.highlights.yellowBlue}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
