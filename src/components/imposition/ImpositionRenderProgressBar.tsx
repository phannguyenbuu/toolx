import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ImpositionRenderProgressBarProps {
  isGenerating: boolean;
  progress: number;
  statusText?: string;
}

export const ImpositionRenderProgressBar: React.FC<ImpositionRenderProgressBarProps> = ({
  isGenerating,
  progress,
  statusText = 'Đang render PDF...'
}) => {
  if (!isGenerating) return null;

  const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  return (
    <div className="fixed bottom-6 right-6 z-[9998] pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-indigo-100 p-4 w-80 sm:w-96 text-slate-800 shadow-indigo-500/15">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Loader2 size={18} className="animate-spin text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {statusText || 'Đang render PDF...'}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                Tiến trình chạy ngầm, bạn có thể tiếp tục thao tác
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 flex-shrink-0">
            {clampedProgress}%
          </span>
        </div>

        {/* Progress bar track & fill */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200/60">
          <div
            className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
