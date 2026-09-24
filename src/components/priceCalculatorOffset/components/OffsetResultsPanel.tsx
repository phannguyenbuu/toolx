import React from 'react';
import { TrendingUp, Zap, XCircle } from 'lucide-react';
import {
  CalcOption,
  InputState,
  FinishingItem,
  DigitalComparisonResult
} from '../types';
import { formatVND } from '../helpers';
import { OffsetOptionCard } from './OffsetOptionCard';

interface OffsetResultsPanelProps {
  isCalculating: boolean;
  topOptions: CalcOption[];
  digitalComparison: DigitalComparisonResult | null;
  inputs: InputState;
  extraFinishings: FinishingItem[];
  onOpenCutAnimation: (data: { paperW: number; paperH: number; cutX: number; cutY: number }) => void;
  onOpenCreateOrder: (opt: CalcOption) => void;
}

export const OffsetResultsPanel: React.FC<OffsetResultsPanelProps> = ({
  isCalculating,
  topOptions,
  digitalComparison,
  inputs,
  extraFinishings,
  onOpenCutAnimation,
  onOpenCreateOrder
}) => {
  return (
    <div className="lg:col-span-8 space-y-4">
      {isCalculating ? (
        // Skeleton Loading UI
        <>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`bg-white rounded-xl shadow-md border overflow-hidden animate-pulse ${
                i === 1 ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row border-b border-slate-100">
                <div className="p-5 flex-1 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    {i === 1 && <div className="h-4 w-12 bg-indigo-200 rounded" />}
                    <div className="h-5 w-32 bg-slate-200 rounded" />
                  </div>
                  <div className="h-4 w-48 bg-slate-200 rounded mb-3" />
                  <div className="h-8 w-40 bg-slate-100 rounded-lg" />
                </div>
                <div className="p-5 min-w-[240px] border-l border-slate-100 bg-white">
                  <div className="flex justify-between items-end mb-2">
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                    <div className="h-7 w-28 bg-slate-200 rounded" />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-8">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                  <div className="w-full max-w-[160px] aspect-[3/4] bg-slate-100 rounded" />
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
                  <div className="w-full max-w-[200px] aspect-[4/3] bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : topOptions.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center border-2 border-dashed border-slate-300">
          <XCircle size={24} className="mx-auto mb-2 text-slate-300" />
          <h3 className="text-slate-500 font-medium">Không tìm thấy phương án tối ưu</h3>
          <p className="text-sm text-slate-400 mt-1">Vui lòng kiểm tra lại kích thước.</p>
        </div>
      ) : (
        <>
          {digitalComparison && (
            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <TrendingUp size={20} className="text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-cyan-800 mb-1 flex items-center gap-2">
                    Gợi ý tối ưu: In Digital rẻ hơn!
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Tiết kiệm {digitalComparison.savingsPercent}%
                    </span>
                  </h4>
                  <p className="text-sm text-cyan-700 mb-2">
                    Với số lượng này, in <b>Digital</b> chỉ tốn{' '}
                    <b className="text-green-700">{formatVND(digitalComparison.digitalTotal)}</b> thay
                    vì{' '}
                    <span className="line-through text-slate-500">
                      {formatVND(digitalComparison.offsetTotal)}
                    </span>{' '}
                    (Offset).
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="bg-white px-3 py-1.5 rounded border border-cyan-100">
                      <span className="text-slate-500">Tiết kiệm:</span>
                      <span className="font-bold text-green-600 ml-1">
                        {formatVND(digitalComparison.savings)}
                      </span>
                    </div>
                    <a
                      href="/price-calc-fast"
                      className="text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1"
                    >
                      Xem chi tiết Digital <Zap size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {topOptions.map((opt, index) => (
            <OffsetOptionCard
              key={index}
              opt={opt}
              index={index}
              inputs={inputs}
              extraFinishings={extraFinishings}
              onOpenCutAnimation={onOpenCutAnimation}
              onOpenCreateOrder={onOpenCreateOrder}
            />
          ))}
        </>
      )}
    </div>
  );
};
