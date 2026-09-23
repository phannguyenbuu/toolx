import React from 'react';
import { TrendingUp, Printer, XCircle } from 'lucide-react';
import { CalcOption, FinishingItem, InputState } from '../../../utils/calculatorTypes';
import { OffsetComparisonResult } from '../types';
import { formatVND } from '../helpers';
import { DigitalOptionCard } from './DigitalOptionCard';

interface DigitalResultsPanelProps {
  offsetComparison: OffsetComparisonResult | null;
  isCalculating: boolean;
  finalOptions: any[];
  inputs: InputState;
  extraFinishings: FinishingItem[];
  onOpenCutModal: (data: { paperW: number; paperH: number; cutX: number; cutY: number }) => void;
  onCreateOrder: (opt: CalcOption) => void;
}

export const DigitalResultsPanel: React.FC<DigitalResultsPanelProps> = ({
  offsetComparison,
  isCalculating,
  finalOptions,
  inputs,
  extraFinishings,
  onOpenCutModal,
  onCreateOrder
}) => {
  const cheapestTotal = finalOptions[0]?.digitalTotal || 0;

  return (
    <div className="lg:col-span-8 space-y-4">
      {/* Offset Suggestion Banner */}
      {offsetComparison && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <TrendingUp size={20} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-indigo-800 mb-1 flex items-center gap-2">
                Gợi ý tối ưu: In Offset rẻ hơn!
                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Tiết kiệm {offsetComparison.savingsPercent}%
                </span>
              </h4>
              <p className="text-sm text-indigo-700 mb-2">
                Với số lượng này, in <b>Offset</b> chỉ tốn{' '}
                <b className="text-green-700">{formatVND(offsetComparison.offsetTotal)}</b> thay vì{' '}
                <span className="line-through text-slate-500">{formatVND(offsetComparison.digitalTotal)}</span> (Digital).
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="bg-white px-3 py-1.5 rounded border border-indigo-100">
                  <span className="text-slate-500">Tiết kiệm:</span>
                  <span className="font-bold text-green-600 ml-1">{formatVND(offsetComparison.savings)}</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded border border-indigo-100">
                  <span className="text-slate-500">Máy:</span>
                  <span className="font-medium text-slate-700 ml-1">{offsetComparison.offsetOption.machineName}</span>
                </div>
                <a
                  href="/price-calculator"
                  className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  Xem chi tiết Offset <Printer size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCalculating ? (
        // Skeleton Loading UI
        <>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`bg-white rounded-xl shadow-md border overflow-hidden animate-pulse ${
                i === 1 ? 'border-cyan-200 ring-4 ring-cyan-50' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row border-b border-slate-100">
                <div className="p-5 flex-1 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    {i === 1 && <div className="h-4 w-12 bg-cyan-200 rounded" />}
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
      ) : finalOptions.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center border-2 border-dashed border-slate-300">
          <XCircle size={24} className="mx-auto mb-2 text-slate-300" />
          <h3 className="text-slate-500 font-medium">Không tìm thấy phương án tối ưu</h3>
          <p className="text-sm text-slate-400 mt-1">Vui lòng kiểm tra lại kích thước.</p>
        </div>
      ) : (
        finalOptions.map((opt, index) => (
          <DigitalOptionCard
            key={opt.id || index}
            opt={opt}
            index={index}
            cheapestTotal={cheapestTotal}
            inputs={inputs}
            extraFinishings={extraFinishings}
            onOpenCutModal={onOpenCutModal}
            onCreateOrder={onCreateOrder}
          />
        ))
      )}
    </div>
  );
};
