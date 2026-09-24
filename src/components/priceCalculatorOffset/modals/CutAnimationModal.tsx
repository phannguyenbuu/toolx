import React, { useState, useEffect } from 'react';
import { Scissors, X, AlertTriangle, SkipBack, Play, Pause, SkipForward } from 'lucide-react';

interface CutAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperW: number;
  paperH: number;
  cutX: number;
  cutY: number;
  maxCutWidth: number;
  onUpdateMaxCutWidth: (v: number) => void;
}

export const CutAnimationModal: React.FC<CutAnimationModalProps> = ({
  isOpen,
  onClose,
  paperW,
  paperH,
  cutX,
  cutY,
  maxCutWidth,
  onUpdateMaxCutWidth
}) => {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setStep((prev) => (prev + 1) % 4), 1500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  if (!isOpen) return null;

  const itemW = paperW / cutX;
  const itemH = paperH / cutY;
  const isTooBig = maxCutWidth > 0 && Math.min(paperW, paperH) > maxCutWidth;

  const desc = [
    `Khổ giấy gốc: ${paperW} x ${paperH} mm`,
    `Bước 1: Cắt ${cutX - 1} đường dọc → ${cutX} dải ${Math.floor(itemW)} x ${paperH} mm`,
    `Bước 2: Cắt ${cutY - 1} đường ngang → ${cutX * cutY} tờ`,
    `Hoàn thành: ${cutX * cutY} tờ kích thước ${Math.floor(itemW)} x ${Math.floor(itemH)} mm`
  ][step];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Scissors size={16} /> Mô phỏng Cắt Giấy
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-slate-100 p-6 flex flex-col items-center min-h-[300px]">
          <div className="w-full mb-4 bg-white p-3 rounded shadow-xs border flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase">Khổ máy cắt (mm)</label>
            <input
              type="number"
              value={maxCutWidth}
              onChange={(e) => onUpdateMaxCutWidth(parseInt(e.target.value) || 0)}
              className="w-20 p-1 border rounded text-center font-bold"
            />
          </div>

          {isTooBig && (
            <div className="mb-4 bg-red-100 text-red-700 px-3 py-2 rounded text-xs flex items-center gap-2 w-full">
              <AlertTriangle size={14} /> Cảnh báo: Giấy lớn hơn khổ máy cắt!
            </div>
          )}

          <div
            className="relative bg-white shadow-xs border border-slate-300 w-full max-w-[280px]"
            style={{ aspectRatio: `${paperW}/${paperH}` }}
          >
            {step < 3 ? (
              <svg className="absolute inset-0 w-full h-full">
                {step >= 1 &&
                  Array.from({ length: cutX - 1}, (_, i) => (
                    <line
                      key={`v${i}`}
                      x1={`${((i + 1) / cutX) * 100}%`}
                      y1="0"
                      x2={`${((i + 1) / cutX) * 100}%`}
                      y2="100%"
                      stroke="red"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  ))}
                {step >= 2 &&
                  Array.from({ length: cutY - 1 }, (_, i) => (
                    <line
                      key={`h${i}`}
                      x1="0"
                      y1={`${((i + 1) / cutY) * 100}%`}
                      x2="100%"
                      y2={`${((i + 1) / cutY) * 100}%`}
                      stroke="red"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  ))}
              </svg>
            ) : (
              <div
                className="w-full h-full grid p-1"
                style={{
                  gridTemplateColumns: `repeat(${cutX}, 1fr)`,
                  gridTemplateRows: `repeat(${cutY}, 1fr)`,
                  gap: '3px'
                }}
              >
                {Array.from({ length: cutX * cutY }, (_, i) => (
                  <div
                    key={i}
                    className="border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-300"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-sm font-bold text-slate-700 text-center">{desc}</div>
        </div>

        <div className="p-4 border-t bg-white flex justify-between items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStep((s) => (s - 1 + 4) % 4);
              }}
              className="p-2 rounded hover:bg-slate-100 cursor-pointer"
            >
              <SkipBack size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 w-10 flex justify-center cursor-pointer"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStep((s) => (s + 1) % 4);
              }}
              className="p-2 rounded hover:bg-slate-100 cursor-pointer"
            >
              <SkipForward size={16} />
            </button>
          </div>
          <span className="text-xs text-slate-400">Bước {step + 1} / 4</span>
        </div>
      </div>
    </div>
  );
};
