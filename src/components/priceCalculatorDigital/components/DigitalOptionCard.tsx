import React from 'react';
import { Box, Play, Copy, Check } from 'lucide-react';
import { CalcOption, FinishingItem, InputState } from '../../../utils/calculatorTypes';
import { formatVND, formatMM, copyToClipboard, getQuoteText } from '../helpers';

interface DigitalOptionCardProps {
  opt: CalcOption & {
    digitalClicks?: number;
    digitalPrintCost?: number;
    digitalTotal: number;
    isPreferred?: boolean;
    priceDiff?: number;
  };
  index: number;
  cheapestTotal: number;
  inputs: InputState;
  extraFinishings: FinishingItem[];
  onOpenCutModal: (data: { paperW: number; paperH: number; cutX: number; cutY: number }) => void;
  onCreateOrder: (opt: CalcOption) => void;
}

export const DigitalOptionCard: React.FC<DigitalOptionCardProps> = ({
  opt,
  index,
  cheapestTotal,
  inputs,
  extraFinishings,
  onOpenCutModal,
  onCreateOrder
}) => {
  const diffPercent =
    cheapestTotal > 0 && opt.digitalTotal > cheapestTotal
      ? Math.round(((opt.digitalTotal - cheapestTotal) / cheapestTotal) * 100)
      : 0;
  const isPreferred = opt.isPreferred;
  const priceDiff = opt.priceDiff || 0;
  const qty = parseInt(inputs.quantity) || 1;
  const unitPrice = Math.round(opt.costs.total / qty);

  return (
    <div
      className={`bg-white rounded-xl shadow-md border overflow-hidden ${
        index === 0
          ? 'border-cyan-500 ring-4 ring-cyan-50'
          : isPreferred
          ? 'border-orange-300 ring-2 ring-orange-50'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col md:flex-row border-b border-slate-100">
        <div className="p-5 flex-1 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            {index === 0 && (
              <span className="bg-cyan-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                Rẻ nhất
              </span>
            )}
            {isPreferred && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                ✂️ Cắt sẵn
              </span>
            )}
            {diffPercent > 0 && <span className="text-[10px] font-bold text-red-500">+{diffPercent}%</span>}
            <h3 className="font-bold text-lg text-slate-800">{opt.machineName}</h3>
          </div>
          {isPreferred && priceDiff !== 0 && (
            <div
              className={`mb-2 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${
                priceDiff > 0
                  ? 'bg-red-50 border border-red-200 text-red-600'
                  : 'bg-green-50 border border-green-200 text-green-600'
              }`}
            >
              {priceDiff > 0
                ? `⚠️ Cao hơn ${formatVND(priceDiff)}`
                : `✅ Rẻ hơn ${formatVND(Math.abs(priceDiff))}`}{' '}
              so với giấy thường
            </div>
          )}
          <div className="text-sm text-slate-600 mb-3">
            Giấy <b>{opt.paperDisplay}</b> | Khổ <b>{opt.paperSize}</b>
          </div>
          <div className="inline-flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg text-xs shadow-sm">
            <Box size={12} />
            <span>
              In: <b>{formatMM(opt.printSize.w)} x {formatMM(opt.printSize.h)}</b>
            </span>
            <span className="text-slate-300 mx-1">|</span>
            <span>
              Bình: <b className="text-cyan-700">{opt.ups} con</b>
            </span>
          </div>
        </div>

        <div className="p-5 min-w-[240px] border-l border-slate-100 bg-white flex flex-col justify-center">
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-slate-400 font-bold uppercase">Tổng Chi Phí</span>
            <span className="text-2xl font-bold text-cyan-700">{formatVND(opt.costs.total)}</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] text-slate-400">Đơn giá</span>
            <span className="text-sm font-bold text-emerald-600">{formatVND(unitPrice)}/sp</span>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Giấy ({opt.totalBigSheets} tờ)</span>
              <span className="font-medium text-slate-700">{formatVND(opt.costs.paper)}</span>
            </div>
            <div className="flex justify-between bg-cyan-50 px-1 rounded">
              <span className="text-cyan-700">
                In Digital ({opt.digitalClicks} click × {inputs.printSides} mặt ×{' '}
                {opt.totalBigSheets * (opt.cutX * opt.cutY)} tờ in)
              </span>
              <span className="font-bold text-cyan-700">{formatVND(opt.costs.print)}</span>
            </div>
            {opt.costs.lamination > 0 && (
              <div className="flex justify-between text-orange-600 bg-orange-50 px-1 rounded">
                <span>Cán màng</span>
                <span className="font-bold">{formatVND(opt.costs.lamination)}</span>
              </div>
            )}
            {opt.costs.extra > 0 && (
              <div className="flex justify-between text-green-600 bg-green-50 px-1 rounded">
                <span>Gia công</span>
                <span className="font-bold">{formatVND(opt.costs.extra)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visuals */}
      <div className="p-5 grid grid-cols-2 gap-8">
        <div className="flex flex-col items-center">
          <div className="flex justify-between w-full max-w-[160px] mb-2 items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Cắt Giấy</span>
            <button
              onClick={() =>
                onOpenCutModal({
                  paperW: opt.paperWidth,
                  paperH: opt.paperHeight,
                  cutX: opt.cutX,
                  cutY: opt.cutY
                })
              }
              className="text-[10px] flex items-center gap-1 bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded font-bold hover:bg-cyan-100 cursor-pointer"
            >
              <Play size={10} /> Xem
            </button>
          </div>
          <div
            className="relative border border-slate-800 bg-white w-full max-w-[160px]"
            style={{ aspectRatio: `${opt.paperWidth}/${opt.paperHeight}` }}
          >
            {opt.cutItems.map((item, i) => (
              <div
                key={i}
                className="absolute border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-300"
                style={{
                  left: `${(item.x / opt.paperWidth) * 100}%`,
                  top: `${(item.y / opt.paperHeight) * 100}%`,
                  width: `${(item.w / opt.paperWidth) * 100}%`,
                  height: `${(item.h / opt.paperHeight) * 100}%`
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex justify-between w-full max-w-[200px] mb-2 items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Sơ đồ Bình</span>
            <span className="text-[10px] text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded font-bold">
              {formatMM(opt.printSize.w)} x {formatMM(opt.printSize.h)}
            </span>
          </div>
          <div
            className="relative border border-blue-300 bg-blue-50 w-full max-w-[200px] overflow-hidden"
            style={{ aspectRatio: `${opt.printSize.w}/${opt.printSize.h}` }}
          >
            {opt.layoutItems.map((item, i) => (
              <div
                key={i}
                className={`absolute box-border border border-blue-600 shadow-sm ${
                  item.rotate ? 'bg-orange-200/90' : 'bg-blue-300/90'
                }`}
                style={{
                  left: `${(item.x / opt.printSize.w) * 100}%`,
                  top: `${(item.y / opt.printSize.h) * 100}%`,
                  width: `${(item.w / opt.printSize.w) * 100}%`,
                  height: `${(item.h / opt.printSize.h) * 100}%`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mx-5 mb-4 flex gap-2 justify-end">
        <button
          onClick={() => copyToClipboard(getQuoteText(opt, inputs, extraFinishings))}
          className="bg-white p-1.5 px-3 text-[10px] font-bold rounded shadow hover:bg-cyan-50 text-cyan-600 border flex items-center gap-1 cursor-pointer transition"
        >
          <Copy size={12} /> Copy báo giá
        </button>
        <button
          onClick={() => onCreateOrder(opt)}
          className="bg-emerald-600 p-1.5 px-3 text-[10px] font-bold rounded shadow hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer transition"
        >
          <Check size={12} /> Tạo đơn
        </button>
      </div>
    </div>
  );
};
