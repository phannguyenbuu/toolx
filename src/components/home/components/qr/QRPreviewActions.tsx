import React from 'react';
import { Download } from 'lucide-react';
import { QRHistory } from '../../../QRHistory';

interface QRPreviewActionsProps {
  qrRef: React.RefObject<HTMLDivElement | null>;
  qrContent: string;
  handleDownload: (ext: 'png' | 'svg' | 'jpeg' | 'eps' | 'pdf') => Promise<void>;
  handleHistorySelect: (item: any) => void;
  historyRefreshTrigger: number;
}

export const QRPreviewActions: React.FC<QRPreviewActionsProps> = ({
  qrRef,
  qrContent,
  handleDownload,
  handleHistorySelect,
  historyRefreshTrigger
}) => {
  return (
    <div className="lg:col-span-3">
      <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">3) Xem trước</h3>
          <span className="text-[11px] text-slate-400">Live preview</span>
        </div>

        <div className="flex items-center justify-center">
          <div
            ref={qrRef as any}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
          />
        </div>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDownload('png')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download size={14} /> PNG
            </button>
            <button
              type="button"
              onClick={() => handleDownload('svg')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Download size={14} /> SVG
            </button>
            <button
              type="button"
              onClick={() => handleDownload('jpeg')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors cursor-pointer"
            >
              <Download size={14} /> JPG
            </button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Nội dung QR</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(qrContent)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
              >
                Sao chép
              </button>
            </div>
            <textarea
              value={qrContent}
              readOnly
              className="w-full h-20 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Lịch sử QR</span>
            </div>
            <QRHistory
              onSelectHistory={handleHistorySelect}
              refreshTrigger={historyRefreshTrigger}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
