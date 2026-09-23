import React from 'react';
import { Expand, X, Loader2 } from 'lucide-react';
import { PageItem } from './types';

export interface ImpositionAiOutpaintPanelProps {
  isOutpaintPanelOpen: boolean;
  setIsOutpaintPanelOpen: (open: boolean) => void;
  outpaintConfig: { top: number; bottom: number; left: number; right: number };
  setOutpaintConfig: React.Dispatch<React.SetStateAction<{ top: number; bottom: number; left: number; right: number }>>;
  outpaintProgress: { isProcessing: boolean; current: number; total: number };
  handleOutpaint: () => void;
  allPages: PageItem[];
}

export const ImpositionAiOutpaintPanel: React.FC<ImpositionAiOutpaintPanelProps> = ({
  isOutpaintPanelOpen,
  setIsOutpaintPanelOpen,
  outpaintConfig,
  setOutpaintConfig,
  outpaintProgress,
  handleOutpaint,
  allPages
}) => {
  if (!isOutpaintPanelOpen) return null;

  return (
    <div className="p-4 border-t bg-blue-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-blue-700 uppercase flex items-center gap-2">
          <Expand size={14} /> AI Mở rộng ảnh
        </h3>
        <button
          onClick={() => setIsOutpaintPanelOpen(false)}
          className="p-1 hover:bg-blue-100 rounded cursor-pointer"
        >
          <X size={14} className="text-blue-500" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-medium text-gray-500 uppercase">Preset nhanh</label>
          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">LaMa CPU Model</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: '2mm', val: 2 },
            { label: '3mm', val: 3 },
            { label: '4mm', val: 4 },
            { label: '30% (~5mm)', val: 5 },
          ].map(item => (
            <button
              key={item.val}
              type="button"
              onClick={() => setOutpaintConfig({ top: item.val, bottom: item.val, left: item.val, right: item.val })}
              className={`py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                outpaintConfig.top === item.val && outpaintConfig.bottom === item.val && outpaintConfig.left === item.val && outpaintConfig.right === item.val
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">Tuỳ chỉnh (mm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Trên</label>
            <input
              type="number"
              min="0"
              max="15"
              step="0.5"
              value={outpaintConfig.top}
              onChange={e => setOutpaintConfig(prev => ({ ...prev, top: Math.min(15, parseFloat(e.target.value) || 0) }))}
              className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
            />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Dưới</label>
            <input
              type="number"
              min="0"
              max="15"
              step="0.5"
              value={outpaintConfig.bottom}
              onChange={e => setOutpaintConfig(prev => ({ ...prev, bottom: Math.min(15, parseFloat(e.target.value) || 0) }))}
              className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
            />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Trái</label>
            <input
              type="number"
              min="0"
              max="15"
              step="0.5"
              value={outpaintConfig.left}
              onChange={e => setOutpaintConfig(prev => ({ ...prev, left: Math.min(15, parseFloat(e.target.value) || 0) }))}
              className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
            />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Phải</label>
            <input
              type="number"
              min="0"
              max="15"
              step="0.5"
              value={outpaintConfig.right}
              onChange={e => setOutpaintConfig(prev => ({ ...prev, right: Math.min(15, parseFloat(e.target.value) || 0) }))}
              className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
            />
          </div>
        </div>
      </div>

      {outpaintProgress.isProcessing && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-blue-700">Đang xử lý...</span>
            <span className="font-medium">{outpaintProgress.current}/{outpaintProgress.total}</span>
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(outpaintProgress.current / outpaintProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleOutpaint}
        disabled={outpaintProgress.isProcessing || allPages.length === 0}
        className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        {outpaintProgress.isProcessing ? (
          <><Loader2 size={16} className="animate-spin" /> Đang mở rộng...</>
        ) : (
          <><Expand size={16} /> Mở rộng {allPages.length} ảnh</>
        )}
      </button>
    </div>
  );
};
