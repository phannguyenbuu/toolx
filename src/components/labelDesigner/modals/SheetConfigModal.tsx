import React from 'react';
import { X } from 'lucide-react';
import { SheetConfig, PageConfig } from '../types';
import { computeLayoutCells } from '../sheetLayoutSolver';

export interface SheetConfigModalProps {
  sheetConfig: SheetConfig;
  setSheetConfig: React.Dispatch<React.SetStateAction<SheetConfig>>;
  pageConfig: PageConfig;
  onClose: () => void;
}

export const SheetConfigModal: React.FC<SheetConfigModalProps> = ({
  sheetConfig,
  setSheetConfig,
  pageConfig,
  onClose
}) => {
  const set = (updates: Partial<SheetConfig>) => setSheetConfig(p => ({ ...p, ...updates }));

  const cells = computeLayoutCells(
    sheetConfig.width,
    sheetConfig.height,
    pageConfig.width,
    pageConfig.height,
    sheetConfig.marginTop,
    sheetConfig.marginLeft,
    sheetConfig.gapH,
    sheetConfig.gapV,
    sheetConfig.layoutMode || 'grid',
    sheetConfig.shape
  );
  const total = cells.length;

  // Preview scale
  const PREVIEW_W = 260;
  const scale = PREVIEW_W / sheetConfig.width;
  const previewH = sheetConfig.height * scale;

  const formatOptions: Array<{
    label: string;
    w: number;
    h: number;
    fmt: SheetConfig['format'];
  }> = [
    { label: 'A5', w: 148, h: 210, fmt: 'A5' },
    { label: 'A4', w: 210, h: 297, fmt: 'A4' },
    { label: 'A3', w: 297, h: 420, fmt: 'A3' },
    { label: 'Custom', w: sheetConfig.width, h: sheetConfig.height, fmt: 'Custom' }
  ];

  const applyFormat = (fmt: SheetConfig['format'], orient: SheetConfig['orientation']) => {
    const f = formatOptions.find(x => x.fmt === fmt);
    if (!f || fmt === 'Custom') {
      set({ format: fmt, orientation: orient });
      return;
    }
    let w = f.w,
      h = f.h;
    if (orient === 'landscape') [w, h] = [h, w];
    set({ format: fmt, orientation: orient, width: w, height: h });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[640px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold">Cấu hình khổ giấy</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex gap-4">
          {/* Left: settings */}
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Khổ giấy in</label>
              <div className="flex gap-2">
                <select
                  value={sheetConfig.format}
                  onChange={e =>
                    applyFormat(e.target.value as SheetConfig['format'], sheetConfig.orientation)
                  }
                  className="flex-1 text-sm border rounded px-2 py-1.5"
                >
                  <option value="A5">A5</option>
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Custom">Tùy chỉnh</option>
                </select>
                <button
                  onClick={() => applyFormat(sheetConfig.format, 'portrait')}
                  className={`px-2 py-1 text-xs rounded border ${
                    sheetConfig.orientation === 'portrait'
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  Dọc
                </button>
                <button
                  onClick={() => applyFormat(sheetConfig.format, 'landscape')}
                  className={`px-2 py-1 text-xs rounded border ${
                    sheetConfig.orientation === 'landscape'
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  Ngang
                </button>
              </div>
            </div>
            {sheetConfig.format === 'Custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Rộng (mm)</label>
                  <input
                    type="number"
                    value={sheetConfig.width}
                    onChange={e => set({ width: +e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Cao (mm)</label>
                  <input
                    type="number"
                    value={sheetConfig.height}
                    onChange={e => set({ height: +e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Hình dạng trang</label>
              <div className="flex gap-2">
                <button
                  onClick={() => set({ shape: 'rect' })}
                  className={`flex-1 py-2 text-sm rounded border flex items-center justify-center gap-1.5 ${
                    sheetConfig.shape === 'rect'
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <rect
                      x="1"
                      y="1"
                      width="12"
                      height="12"
                      rx="1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  Chữ nhật
                </button>
                <button
                  onClick={() => set({ shape: 'circle' })}
                  className={`flex-1 py-2 text-sm rounded border flex items-center justify-center gap-1.5 ${
                    sheetConfig.shape === 'circle'
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Hình tròn
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Chế độ xếp hình</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { v: 'auto', label: '⚡ Tự động', desc: 'Chọn cách tối ưu nhất' },
                    { v: 'grid', label: 'Lưới đều', desc: 'Hàng cột đều nhau' },
                    { v: 'gridH', label: 'Cụm ngang', desc: 'Xen kẽ hàng đứng/ngang' },
                    { v: 'gridV', label: 'Cụm dọc', desc: 'Xen kẽ cột đứng/ngang' },
                    { v: 'brick', label: 'So le', desc: 'Hàng lẻ dịch nửa bước' },
                    { v: 'nesting', label: 'Lồng ghép', desc: 'Ghép cặp đứng+ngang' },
                    { v: 'rotateAlt', label: 'Xoay 180°', desc: 'Xen kẽ xoay ngược' }
                  ] as const
                ).map(m => (
                  <button
                    key={m.v}
                    onClick={() => set({ layoutMode: m.v })}
                    className={`text-left px-2 py-1.5 text-xs rounded border ${
                      (sheetConfig.layoutMode || 'grid') === m.v
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[10px] opacity-60">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Lề trên/dưới (mm)</label>
                <input
                  type="number"
                  value={sheetConfig.marginTop}
                  onChange={e => set({ marginTop: +e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Lề trái/phải (mm)</label>
                <input
                  type="number"
                  value={sheetConfig.marginLeft}
                  onChange={e => set({ marginLeft: +e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Khoảng cách ngang (mm)</label>
                <input
                  type="number"
                  value={sheetConfig.gapH}
                  onChange={e => set({ gapH: +e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Khoảng cách dọc (mm)</label>
                <input
                  type="number"
                  value={sheetConfig.gapV}
                  onChange={e => set({ gapV: +e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="bg-blue-50 rounded p-3 text-sm text-blue-800">
              Xếp được <strong>{total} trang</strong> trên mỗi tờ khổ {sheetConfig.width}×
              {sheetConfig.height}mm
              <span className="text-[10px] ml-1 opacity-60">
                (
                {
                  {
                    grid: 'lưới đều',
                    gridH: 'cụm ngang',
                    gridV: 'cụm dọc',
                    brick: 'so le',
                    rotateAlt: 'xoay 180°',
                    nesting: 'lồng ghép',
                    auto: 'tự động'
                  }[sheetConfig.layoutMode || 'grid']
                }
                )
              </span>
            </div>
            <div className="border-t pt-3">
              <label className="flex items-center justify-between mb-2 cursor-pointer">
                <span className="text-xs font-bold text-blue-600">Đánh dấu cắt (góc trang)</span>
                <input
                  type="checkbox"
                  checked={sheetConfig.useCropMark}
                  onChange={e => set({ useCropMark: e.target.checked })}
                  className="rounded text-blue-600"
                />
              </label>
              {sheetConfig.useCropMark && (
                <div className="grid grid-cols-4 gap-1">
                  <div>
                    <label className="text-[10px] text-gray-400 block text-center">Dải (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sheetConfig.cropLen}
                      onChange={e => set({ cropLen: +e.target.value })}
                      className="w-full border rounded px-1 py-1 text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block text-center">Cách (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sheetConfig.cropDist}
                      onChange={e => set({ cropDist: +e.target.value })}
                      className="w-full border rounded px-1 py-1 text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block text-center">Dầy (pt)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={sheetConfig.cropThick}
                      onChange={e => set({ cropThick: +e.target.value })}
                      className="w-full border rounded px-1 py-1 text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block text-center">Màu</label>
                    <input
                      type="color"
                      value={sheetConfig.cropColor}
                      onChange={e => set({ cropColor: e.target.value })}
                      className="w-full h-8 border rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <label className="text-xs font-bold text-gray-500 block mb-1">Số trang</label>
              <div className="flex gap-1.5">
                {(
                  [
                    { v: 'none', label: 'Tắt' },
                    { v: 'header', label: 'Trên (Header)' },
                    { v: 'footer', label: 'Dưới (Footer)' }
                  ] as const
                ).map(o => (
                  <button
                    key={o.v}
                    onClick={() => set({ pageNumber: o.v })}
                    className={`flex-1 px-2 py-1.5 text-xs rounded border ${
                      (sheetConfig.pageNumber || 'none') === o.v
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Right: preview */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Preview</span>
            <div
              style={{
                width: PREVIEW_W,
                height: previewH,
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              {cells.map((cell, i) => {
                const isRot90 = cell.rotate === 90 || cell.rotate === 270;
                const bw = isRot90 ? cell.h : cell.w;
                const bh = isRot90 ? cell.w : cell.h;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: cell.x * scale,
                      top: cell.y * scale,
                      width: bw * scale,
                      height: bh * scale,
                      borderRadius: sheetConfig.shape === 'circle' ? '50%' : 2,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: cell.w * scale,
                        height: cell.h * scale,
                        background: '#6366f1',
                        opacity: 0.7,
                        borderRadius: sheetConfig.shape === 'circle' ? '50%' : 2,
                        transform: `translate(${((bw - cell.w) / 2) * scale}px, ${
                          ((bh - cell.h) / 2) * scale
                        }px) rotate(${cell.rotate}deg)`,
                        transformOrigin: 'center center'
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-gray-400">
              {sheetConfig.width}×{sheetConfig.height}mm
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={() => {
              const EXT = 2; // mm extension beyond intersections
              const sw = sheetConfig.width,
                sh = sheetConfig.height;
              const hLines = new Map<number, { min: number; max: number }[]>();
              const vLines = new Map<number, { min: number; max: number }[]>();
              const addH = (y: number, x1: number, x2: number) => {
                const k = Math.round(y * 100);
                if (!hLines.has(k)) hLines.set(k, []);
                hLines.get(k)!.push({ min: x1, max: x2 });
              };
              const addV = (x: number, y1: number, y2: number) => {
                const k = Math.round(x * 100);
                if (!vLines.has(k)) vLines.set(k, []);
                vLines.get(k)!.push({ min: y1, max: y2 });
              };
              for (const cell of cells) {
                const r90 = cell.rotate === 90 || cell.rotate === 270;
                const bw = r90 ? cell.h : cell.w;
                const bh = r90 ? cell.w : cell.h;
                const x1 = cell.x,
                  x2 = cell.x + bw;
                const y1 = cell.y,
                  y2 = cell.y + bh;
                addH(y1, x1, x2);
                addH(y2, x1, x2);
                addV(x1, y1, y2);
                addV(x2, y1, y2);
              }
              const mergeSegs = (segs: { min: number; max: number }[], limit: number) => {
                const sorted = segs.sort((a, b) => a.min - b.min);
                const merged: { min: number; max: number }[] = [];
                for (const s of sorted) {
                  const last = merged[merged.length - 1];
                  if (last && s.min <= last.max + 0.01) {
                    last.max = Math.max(last.max, s.max);
                  } else {
                    merged.push({ ...s });
                  }
                }
                return merged.map(s => ({
                  min: Math.max(0, s.min - EXT),
                  max: Math.min(limit, s.max + EXT)
                }));
              };
              let paths = '';
              hLines.forEach((segs, k) => {
                const y = k / 100;
                for (const s of mergeSegs(segs, sw))
                  paths += `<line x1="${s.min}" y1="${y}" x2="${s.max}" y2="${y}"/>`;
              });
              vLines.forEach((segs, k) => {
                const x = k / 100;
                for (const s of mergeSegs(segs, sh))
                  paths += `<line x1="${x}" y1="${s.min}" x2="${x}" y2="${s.max}"/>`;
              });
              const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sw}mm" height="${sh}mm" viewBox="0 0 ${sw} ${sh}">
<g fill="none" stroke="#FF0000" stroke-width="0.1">${paths}</g>
</svg>`;
              const blob = new Blob([svg], { type: 'image/svg+xml' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `die-cut-${sw}x${sh}mm.svg`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
          >
            Tải SVG khuôn
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded text-sm">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
