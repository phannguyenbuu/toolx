import React, { useState } from 'react';
import { Box, Play, Copy, Check } from 'lucide-react';
import { CalcOption, InputState, FinishingItem } from '../types';
import { formatVND, formatMM, copyToClipboard, getQuoteText } from '../helpers';

interface OffsetOptionCardProps {
  opt: CalcOption;
  index: number;
  inputs: InputState;
  extraFinishings: FinishingItem[];
  onOpenCutAnimation: (data: { paperW: number; paperH: number; cutX: number; cutY: number }) => void;
  onOpenCreateOrder: (opt: CalcOption) => void;
}

export const OffsetOptionCard: React.FC<OffsetOptionCardProps> = ({
  opt,
  index,
  inputs,
  extraFinishings,
  onOpenCutAnimation,
  onOpenCreateOrder
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyQuote = () => {
    const text = getQuoteText(opt, inputs, extraFinishings);
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-md border overflow-hidden ${
        index === 0 ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col md:flex-row border-b border-slate-100">
        <div className="p-5 flex-1 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            {index === 0 && (
              <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                Rẻ nhất
              </span>
            )}
            <h3 className="font-bold text-lg text-slate-800">
              {opt.machineName}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({opt.machineColors} màu)
              </span>
            </h3>
          </div>
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
              Bình: <b className="text-indigo-700">{opt.ups} con</b>
            </span>
          </div>
        </div>

        <div className="p-5 min-w-[240px] border-l border-slate-100 bg-white flex flex-col justify-center">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Tổng Chi Phí</span>
            <span className="text-2xl font-bold text-indigo-700">{formatVND(opt.costs.total)}</span>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Giấy ({opt.totalBigSheets} tờ)</span>
              <span className="font-medium text-slate-700">{formatVND(opt.costs.paper)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                In ({opt.totalImpressions.toLocaleString()} lượt)
                {opt.printMethod === 'work-turn' && (
                  <span className="text-green-600 font-bold text-[10px]"> (Tự trở)</span>
                )}
                {opt.printMethod === 'sheet-wise' && (
                  <span className="text-red-600 font-bold text-[10px]"> (In AB)</span>
                )}
              </span>
              <span className="font-medium text-slate-700">{formatVND(opt.costs.print)}</span>
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
        {/* Sơ đồ cắt giấy */}
        <div className="flex flex-col items-center">
          <div className="flex justify-between w-full max-w-[160px] mb-2 items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Cắt Giấy</span>
            <button
              type="button"
              onClick={() =>
                onOpenCutAnimation({
                  paperW: opt.paperWidth,
                  paperH: opt.paperHeight,
                  cutX: opt.cutX,
                  cutY: opt.cutY
                })
              }
              className="text-[10px] flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold hover:bg-indigo-100 cursor-pointer"
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

        {/* Sơ đồ bình trang */}
        <div className="flex flex-col items-center">
          <div className="flex justify-between w-full max-w-[200px] mb-2 items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Sơ đồ Bình</span>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">
              {formatMM(opt.printSize.w)} x {formatMM(opt.printSize.h)}
            </span>
          </div>
          <div
            className="relative border border-blue-300 bg-blue-50 w-full max-w-[200px] overflow-hidden"
            style={{ aspectRatio: `${opt.printSize.w}/${opt.printSize.h}` }}
          >
            <div
              className="absolute border-b border-dashed border-red-300 w-full bg-red-50/30"
              style={{ top: 0, left: 0, height: `${(15 / opt.printSize.h) * 100}%` }}
            />
            {opt.layoutItems.map((item, i) => (
              <div
                key={i}
                className={`absolute box-border border border-blue-600 shadow-xs ${
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
          type="button"
          onClick={handleCopyQuote}
          className="bg-white p-1.5 px-3 text-[10px] font-bold rounded shadow-xs hover:bg-indigo-50 text-indigo-600 border flex items-center gap-1 cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-600" />
              <span className="text-green-600">Đã chép</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy báo giá</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => onOpenCreateOrder(opt)}
          className="bg-emerald-600 p-1.5 px-3 text-[10px] font-bold rounded shadow-xs hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer"
        >
          <Check size={12} />
          <span>Tạo đơn</span>
        </button>
      </div>
    </div>
  );
};
