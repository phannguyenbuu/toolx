import React from 'react';
import { Upload, Trash2, Check, Pencil, RotateCcw, RotateCw } from 'lucide-react';
import { PageData, FilterType } from '../types';

interface PdfDashboardGridProps {
  pagesData: PageData[];
  filteredPages: PageData[];
  filterType: FilterType;
  setFilterType: (filter: FilterType) => void;
  selectedIds: Set<number>;
  onToggleSelection: (idx: number, e: React.MouseEvent) => void;
  onDeleteSelected: () => void;
  onOpenStudio: (idx: number) => void;
  onRotateThumb: (idx: number, dir: 'cw' | 'ccw', e: React.MouseEvent) => void;
}

export const PdfDashboardGrid: React.FC<PdfDashboardGridProps> = ({
  pagesData,
  filteredPages,
  filterType,
  setFilterType,
  selectedIds,
  onToggleSelection,
  onDeleteSelected,
  onOpenStudio,
  onRotateThumb
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {(['all', 'color', 'bw', 'blank'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 text-xs font-bold rounded transition cursor-pointer ${
                filterType === f ? 'bg-white shadow-sm' : 'hover:bg-white'
              } ${
                f === 'color'
                  ? 'text-red-500'
                  : f === 'bw'
                  ? 'text-slate-500'
                  : f === 'blank'
                  ? 'text-yellow-600'
                  : 'text-slate-700'
              }`}
            >
              {f === 'all' ? 'Tất cả' : f === 'color' ? 'Màu' : f === 'bw' ? 'B/W' : 'Trắng'}
            </button>
          ))}
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              Đã chọn <span className="text-blue-600">{selectedIds.size}</span>
            </span>
            <button
              onClick={onDeleteSelected}
              className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold hover:bg-red-100 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Xóa
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 content-start">
        {pagesData.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-gray-400 mt-20">
            <Upload size={64} className="mb-4 opacity-50" />
            <p>Vui lòng tải file PDF lên</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 mt-10">
            Không tìm thấy trang nào khớp với bộ lọc.
          </div>
        ) : (
          filteredPages.map((p) => {
            const isSel = selectedIds.has(p.idx);
            const colClass =
              p.type === 'color'
                ? 'text-red-500'
                : p.type === 'blank'
                ? 'text-yellow-500'
                : 'text-slate-500';

            return (
              <div
                key={p.idx}
                className={`bg-white rounded-lg border overflow-hidden cursor-pointer relative group transition-all ${
                  isSel
                    ? 'ring-2 ring-blue-600 border-blue-600 shadow-md'
                    : 'hover:shadow-lg border-gray-200'
                }`}
              >
                <div
                  className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-colors ${
                    isSel
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 text-transparent group-hover:border-blue-400'
                  }`}
                  onClick={(e) => onToggleSelection(p.idx, e)}
                >
                  <Check size={14} />
                </div>
                <div
                  className="h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden"
                  onClick={() => onOpenStudio(p.idx)}
                >
                  <img
                    src={p.thumb}
                    alt={`Page ${p.num}`}
                    className="object-contain max-h-full transition-transform duration-300"
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                  />
                  <div
                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onOpenStudio(p.idx)}
                      className="px-4 py-1.5 bg-white text-slate-800 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-md cursor-pointer"
                    >
                      <Pencil size={12} className="inline mr-1" /> SỬA
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => onRotateThumb(p.idx, 'ccw', e)}
                        className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-blue-600 transition shadow-md cursor-pointer"
                        title="Xoay trái 90°"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={(e) => onRotateThumb(p.idx, 'cw', e)}
                        className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-blue-600 transition shadow-md cursor-pointer"
                        title="Xoay phải 90°"
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-white border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-700">
                  <span>Trang {p.num}</span>
                  <span className={`${colClass} uppercase`}>{p.type}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
