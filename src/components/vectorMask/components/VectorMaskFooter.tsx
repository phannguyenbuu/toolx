import React from 'react';
import { Check } from 'lucide-react';

interface VectorMaskFooterProps {
  knotCount: number;
  onClose: () => void;
  handleApply: () => void;
}

export const VectorMaskFooter: React.FC<VectorMaskFooterProps> = ({
  knotCount,
  onClose,
  handleApply
}) => {
  return (
    <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Khuôn bế Vector sẵn sàng
        </span>
        <span>•</span>
        <span>{knotCount} điểm neo khép kín</span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-violet-500/20 cursor-pointer active:scale-98"
        >
          <Check size={16} />
          <span>Áp dụng Vector Mask</span>
        </button>
      </div>
    </div>
  );
};
