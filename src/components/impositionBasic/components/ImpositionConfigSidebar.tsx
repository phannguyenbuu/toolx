import React from 'react';
import {
  Package,
  Square,
  Circle,
  RectangleHorizontal,
  Triangle,
  Hexagon,
  RotateCcw,
  RectangleVertical,
  Printer
} from 'lucide-react';
import { ImpositionConfig } from '../types';
import { PAPER_PRESETS } from '../constants';
import { DebouncedNumberInput } from './DebouncedNumberInput';

interface ImpositionConfigSidebarProps {
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  updatePrint: (w: number, h: number) => void;
  handlePreset: (v: string) => void;
  swapDims: () => void;
}

export const ImpositionConfigSidebar: React.FC<ImpositionConfigSidebarProps> = ({
  config,
  setConfig,
  updatePrint,
  handlePreset,
  swapDims
}) => {
  return (
    <aside className="w-72 bg-white border-r flex flex-col overflow-y-auto flex-shrink-0">
      <div className="p-4 border-b">
        <h3 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
          <Package size={14} className="text-violet-500" /> Kích thước sản phẩm
        </h3>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {(
            [
              { v: 'rect', i: Square, l: 'Chữ nhật' },
              { v: 'circle', i: Circle, l: 'Tròn' },
              { v: 'oval', i: RectangleHorizontal, l: 'Oval' },
              {
                v: 'trapezoid',
                i: () => (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L4 6h16l-2 12H6z" />
                  </svg>
                ),
                l: 'Thang'
              },
              { v: 'triangle', i: Triangle, l: 'Tam giác' },
              { v: 'hexagon', i: Hexagon, l: 'Lục giác' }
            ] as const
          ).map(({ v, i: I, l }) => (
            <button
              key={v}
              onClick={() => setConfig({ ...config, shape: v as any })}
              className={
                'p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 cursor-pointer ' +
                (config.shape === v
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100')
              }
            >
              {typeof I === 'function' && I.length === 0 ? <I /> : <I size={16} />}
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Rộng (mm)
            </label>
            <DebouncedNumberInput
              step={0.1}
              value={config.itemW}
              onChange={(v) => setConfig((c) => ({ ...c, itemW: v }))}
              className="w-full border rounded-lg px-3 py-2 text-sm font-medium"
            />
          </div>
          {config.shape !== 'circle' && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
                Cao (mm)
              </label>
              <DebouncedNumberInput
                step={0.1}
                value={config.itemH}
                onChange={(v) => setConfig((c) => ({ ...c, itemH: v }))}
                className="w-full border rounded-lg px-3 py-2 text-sm font-medium"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Khoảng cách
            </label>
            <DebouncedNumberInput
              step={0.1}
              min={0}
              value={config.padding}
              onChange={(v) => setConfig((c) => ({ ...c, padding: v }))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Bù cắt
            </label>
            <DebouncedNumberInput
              step={0.1}
              min={0}
              value={config.cutBleed}
              onChange={(v) => setConfig((c) => ({ ...c, cutBleed: v }))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-center"
            />
          </div>
          {['rect', 'trapezoid', 'triangle', 'hexagon'].includes(config.shape) && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
                Bo góc
              </label>
              <DebouncedNumberInput
                step={0.5}
                min={0}
                value={config.cornerRadius}
                onChange={(v) => setConfig((c) => ({ ...c, cornerRadius: v }))}
                className="w-full border rounded-lg px-3 py-2 text-sm text-center"
              />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-gray-50 rounded-lg border border-gray-200 mb-3">
          <input
            type="checkbox"
            checked={config.useCrop}
            onChange={(e) => setConfig({ ...config, useCrop: e.target.checked })}
            className="rounded"
          />
          Dấu cắt (Crop marks)
        </label>

        {config.useCrop && (
          <div className="grid grid-cols-4 gap-2 text-xs mb-3">
            <div>
              <label className="block text-gray-500 mb-1">Dài</label>
              <input
                type="number"
                step="0.5"
                value={config.cropLen}
                onChange={(e) => setConfig({ ...config, cropLen: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-lg px-2 py-1.5 text-center"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Cách</label>
              <input
                type="number"
                step="0.5"
                value={config.cropDist}
                onChange={(e) => setConfig({ ...config, cropDist: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-lg px-2 py-1.5 text-center"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Dày</label>
              <input
                type="number"
                step="0.1"
                value={config.cropThick}
                onChange={(e) => setConfig({ ...config, cropThick: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-lg px-2 py-1.5 text-center"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Màu</label>
              <input
                type="color"
                value={config.cropColor}
                onChange={(e) => setConfig({ ...config, cropColor: e.target.value })}
                className="w-full h-[30px] border rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">
            Chế độ fit
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              {
                v: 'stretch',
                label: 'Kéo giãn',
                icon: (
                  <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1" />
                    <rect x="1" y="1" width="30" height="22" fill="#8b5cf6" opacity="0.25" />
                    <path d="M6 12h20M16 5v14" stroke="#8b5cf6" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                    <defs>
                      <marker id="arrow" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#8b5cf6" />
                      </marker>
                    </defs>
                  </svg>
                )
              },
              {
                v: 'fill',
                label: 'Lấp đầy',
                icon: (
                  <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1" />
                    <rect x="-2" y="5" width="36" height="14" fill="#8b5cf6" opacity="0.25" />
                    <rect x="-2" y="5" width="4" height="14" fill="#ef4444" opacity="0.4" />
                    <rect x="30" y="5" width="4" height="14" fill="#ef4444" opacity="0.4" />
                    <line x1="-1" y1="5" x2="-1" y2="19" stroke="#ef4444" strokeWidth="2" />
                    <line x1="33" y1="5" x2="33" y2="19" stroke="#ef4444" strokeWidth="2" />
                  </svg>
                )
              },
              {
                v: 'fit',
                label: 'Vừa khít',
                icon: (
                  <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1" />
                    <rect x="6" y="1" width="20" height="22" fill="#8b5cf6" opacity="0.25" />
                    <rect x="1" y="1" width="5" height="22" fill="#f3f4f6" />
                    <rect x="26" y="1" width="5" height="22" fill="#f3f4f6" />
                  </svg>
                )
              },
              {
                v: 'actual',
                label: '100%',
                icon: (
                  <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1" />
                    <rect x="10" y="7" width="12" height="10" fill="#8b5cf6" opacity="0.4" stroke="#8b5cf6" strokeWidth="1" />
                  </svg>
                )
              }
            ].map((m) => (
              <button
                key={m.v}
                onClick={() => setConfig({ ...config, fitMode: m.v as any })}
                className={`p-1.5 rounded-lg border-2 flex flex-col items-center gap-0.5 transition cursor-pointer ${
                  config.fitMode === m.v ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                title={m.label}
              >
                <span className={config.fitMode === m.v ? 'text-violet-600' : 'text-gray-400'}>{m.icon}</span>
                <span className={`text-[8px] font-medium ${config.fitMode === m.v ? 'text-violet-700' : 'text-gray-500'}`}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
            Số lượng đơn hàng
          </label>
          <input
            type="number"
            value={config.totalOrder}
            onChange={(e) => setConfig({ ...config, totalOrder: parseInt(e.target.value, 10) || 0 })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                if (config.pageW > config.pageH) {
                  updatePrint(Math.min(config.pageW, config.pageH), Math.max(config.pageW, config.pageH));
                }
              }}
              className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                config.pageW <= config.pageH
                  ? 'bg-blue-600 text-white shadow-xs font-medium'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-white/60'
              }`}
              title="Khổ dọc (Portrait)"
            >
              <RectangleVertical size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (config.pageW < config.pageH) {
                  updatePrint(Math.max(config.pageW, config.pageH), Math.min(config.pageW, config.pageH));
                }
              }}
              className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                config.pageW > config.pageH
                  ? 'bg-blue-600 text-white shadow-xs font-medium'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-white/60'
              }`}
              title="Khổ ngang (Landscape)"
            >
              <RectangleHorizontal size={13} />
            </button>
          </div>
          <h3 className="text-xs font-medium text-gray-500 uppercase">Khổ giấy in</h3>
        </div>

        <select
          onChange={(e) => e.target.value && handlePreset(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 bg-white"
          defaultValue="330x480"
        >
          <option value="">-- Chọn --</option>
          {PAPER_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 mb-3">
          <DebouncedNumberInput
            value={config.pageW}
            onChange={(v) => updatePrint(v, config.pageH)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm font-medium text-center min-w-0"
          />
          <button
            onClick={swapDims}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
          >
            <RotateCcw size={16} />
          </button>
          <DebouncedNumberInput
            value={config.pageH}
            onChange={(v) => updatePrint(config.pageW, v)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm font-medium text-center min-w-0"
          />
        </div>

        <div className="bg-rose-50 rounded-lg p-3">
          <label className="block text-[10px] font-medium text-rose-600 uppercase mb-2">
            Vùng in thực tế
          </label>
          <div className="flex items-center gap-2">
            <DebouncedNumberInput
              value={config.printW}
              onChange={(v) => setConfig((c) => ({ ...c, printW: v }))}
              className="flex-1 border border-rose-200 rounded-lg px-3 py-2 text-sm text-center bg-white min-w-0"
            />
            <span className="text-gray-400">x</span>
            <DebouncedNumberInput
              value={config.printH}
              onChange={(v) => setConfig((c) => ({ ...c, printH: v }))}
              className="flex-1 border border-rose-200 rounded-lg px-3 py-2 text-sm text-center bg-white min-w-0"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
          <Printer size={14} className="text-emerald-500" /> Thiết lập in
        </h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-amber-50 rounded-lg border border-amber-200">
          <input
            type="checkbox"
            checked={config.autoRotate}
            onChange={(e) => setConfig({ ...config, autoRotate: e.target.checked })}
            className="rounded text-amber-600"
          />
          Tự động xoay ảnh
        </label>
      </div>
    </aside>
  );
};
