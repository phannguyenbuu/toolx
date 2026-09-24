import React from 'react';
import { Droplets, Layers, Sliders, Gauge } from 'lucide-react';
import { ColorInspectionReport } from '../../../utils/aiColorInspection';

interface PrepressMetricsTilesProps {
  report: ColorInspectionReport;
  isLightMode: boolean;
  themeCardBg: string;
  themeTextMuted: string;
}

export const PrepressMetricsTiles: React.FC<PrepressMetricsTilesProps> = ({
  report,
  isLightMode,
  themeCardBg,
  themeTextMuted,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* 1. TAC */}
      <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplets
                size={16}
                className={
                  report.tac.status === 'danger'
                    ? 'text-rose-500'
                    : report.tac.status === 'warning'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                }
              />
              <span className="font-bold text-xs">Tổng Độ Phủ Mực (TAC)</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                report.tac.status === 'danger'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                  : report.tac.status === 'warning'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              Đỉnh: {report.tac.max}%
            </span>
          </div>
          <div className="w-full bg-slate-700/30 h-2.5 rounded-full overflow-hidden flex mb-2">
            <div
              style={{ width: `${Math.min(100, (report.tac.max / 400) * 100)}%` }}
              className={`h-full transition-all ${
                report.tac.max > 320 ? 'bg-rose-500' : report.tac.max > 300 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </div>
          <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>{report.tac.message}</p>
        </div>
        <div
          className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${themeTextMuted} ${
            isLightMode ? 'border-slate-200' : 'border-slate-700/60'
          }`}
        >
          <span>
            Bình quân: <strong>{report.tac.average}%</strong>
          </span>
          <span>
            Vượt 300%:{' '}
            <strong className={report.tac.over300Percent > 0 ? 'text-amber-500' : ''}>
              {report.tac.over300Percent}%
            </strong>{' '}
            diện tích
          </span>
        </div>
      </div>

      {/* 2. GAMUT WARNING */}
      <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers
                size={16}
                className={
                  report.gamut.status === 'danger'
                    ? 'text-rose-500'
                    : report.gamut.status === 'warning'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                }
              />
              <span className="font-bold text-xs">Dải Màu In Ấn (CMYK Gamut)</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                report.gamut.status === 'danger'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                  : report.gamut.status === 'warning'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {report.gamut.outOfGamutPercent > 0
                ? `Lệch ${report.gamut.outOfGamutPercent}%`
                : 'Trong dải an toàn'}
            </span>
          </div>
          <p className={`text-[11px] leading-relaxed mb-2 ${themeTextMuted}`}>{report.gamut.message}</p>
          {report.gamut.affectedTones.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {report.gamut.affectedTones.map((tone, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[10px] font-medium"
                >
                  {tone}
                </span>
              ))}
            </div>
          )}
        </div>
        <div
          className={`mt-3 pt-2.5 border-t text-[11px] ${themeTextMuted} ${
            isLightMode ? 'border-slate-200' : 'border-slate-700/60'
          }`}
        >
          Chuẩn so sánh: <strong>ISO Coated v2 / FOGRA39</strong>
        </div>
      </div>

      {/* 3. COLOR BALANCE */}
      <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-purple-400" />
              <span className="font-bold text-xs">Cân Bằng Xám & Sắc Độ (Cast)</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
              {report.balance.detectedCast === 'neutral' ? 'Chuẩn Neutral' : 'Có độ lệch'}
            </span>
          </div>
          <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
            {report.balance.castDescription}
          </p>
        </div>
        <div
          className={`mt-3 pt-2.5 border-t text-[11px] flex justify-between ${themeTextMuted} ${
            isLightMode ? 'border-slate-200' : 'border-slate-700/60'
          }`}
        >
          <span>
            Độ lệch quang học: <strong>Δ {report.balance.deviationScore}</strong>
          </span>
          <span>
            Điểm xám:{' '}
            <strong>{report.balance.detectedCast === 'neutral' ? 'Cân bằng' : 'Cần bù trừ'}</strong>
          </span>
        </div>
      </div>

      {/* 4. DYNAMIC RANGE */}
      <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge
                size={16}
                className={
                  report.tone.dynamicRangeStatus === 'clipped' ? 'text-amber-500' : 'text-emerald-500'
                }
              />
              <span className="font-bold text-xs">Dải Sắc Độ & Clipping</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                report.tone.dynamicRangeStatus === 'clipped'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {report.tone.dynamicRangeStatus === 'clipped' ? 'Clipping' : 'Hài hòa'}
            </span>
          </div>
          <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>{report.tone.message}</p>
        </div>
        <div
          className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${themeTextMuted} ${
            isLightMode ? 'border-slate-200' : 'border-slate-700/60'
          }`}
        >
          <span>
            Bệt tối:{' '}
            <strong className={report.tone.blackCrushPercent > 5 ? 'text-amber-500' : ''}>
              {report.tone.blackCrushPercent}%
            </strong>
          </span>
          <span>
            Cháy sáng:{' '}
            <strong className={report.tone.highlightBlowoutPercent > 5 ? 'text-amber-500' : ''}>
              {report.tone.highlightBlowoutPercent}%
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
