import React, { useRef, useState } from 'react';
import { Grid3X3, Search, X, Check } from 'lucide-react';
import { ImpositionConfig, PAPER_PRESET_GROUPS, PAPER_PRESETS } from '../types';

export interface ImpositionPaperCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ImpositionConfig;
  updatePrint: (w: number, h: number) => void;
  currentPresetName: string;
}

export const ImpositionPaperCatalogModal: React.FC<ImpositionPaperCatalogModalProps> = ({
  isOpen,
  onClose,
  config,
  updatePrint,
  currentPresetName
}) => {
  const [paperSearchQuery, setPaperSearchQuery] = useState('');
  const paperDropdownRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        ref={paperDropdownRef}
        className="w-[1240px] max-w-[98vw] h-[90vh] max-h-[860px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-200 flex-shrink-0">
              <Grid3X3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-slate-800 uppercase tracking-wide">
                  Danh mục khổ giấy in & bản vẽ chuẩn
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  {PAPER_PRESETS.length} khổ giấy
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chia theo 4 nhóm thiết kế: In ấn thông dụng, AutoCAD, Corel & Illustrator, Canva
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm nhanh (A3, ISO, ARCH, Namecard, Fuji, Canva...)"
                value={paperSearchQuery}
                onChange={e => setPaperSearchQuery(e.target.value)}
                className="w-72 pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                autoFocus
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {paperSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPaperSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition flex items-center justify-center cursor-pointer"
              title="Đóng (ESC)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal 4 Columns Body */}
        <div className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto bg-slate-50/50">
          {PAPER_PRESET_GROUPS.map((group) => {
            const filteredItems = group.items.filter(it => 
              it.label.toLowerCase().includes(paperSearchQuery.toLowerCase()) ||
              (it.subLabel && it.subLabel.toLowerCase().includes(paperSearchQuery.toLowerCase())) ||
              `${it.w}x${it.h}`.includes(paperSearchQuery)
            );

            return (
              <div 
                key={group.category} 
                className="flex flex-col bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-violet-200 transition"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-slate-800 uppercase tracking-wider truncate">
                      {group.title}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                    {filteredItems.length}
                  </span>
                </div>

                {/* Items List */}
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 max-h-[520px]">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 font-medium">
                      Không tìm thấy khổ giấy phù hợp
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isCur =
                        (config.pageW === item.w && config.pageH === item.h) ||
                        (config.pageW === item.h && config.pageH === item.w);

                      return (
                        <button
                          key={`${item.label}-${item.w}-${item.h}`}
                          type="button"
                          onClick={() => {
                            if (config.pageW > config.pageH && item.w <= item.h) {
                              updatePrint(item.h, item.w);
                            } else if (config.pageW <= config.pageH && item.w > item.h) {
                              updatePrint(item.h, item.w);
                            } else {
                              updatePrint(item.w, item.h);
                            }
                            onClose();
                            setPaperSearchQuery('');
                          }}
                          className={`text-left p-3 rounded-xl transition cursor-pointer flex flex-col gap-1 border group relative ${
                            isCur
                              ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
                              : 'bg-white border-slate-200/90 hover:border-violet-400 hover:bg-violet-50/60 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium truncate ${isCur ? 'text-white' : 'text-slate-800 group-hover:text-violet-700'}`}>
                              {item.label}
                            </span>
                            {isCur && <Check size={16} className="text-white flex-shrink-0" />}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`truncate ${isCur ? 'text-violet-100' : 'text-slate-500'}`}>
                              {item.subLabel || `${item.w} × ${item.h} mm`}
                            </span>
                            <span className={`font-mono text-[9px] font-medium px-1.5 py-0.5 rounded ${isCur ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {item.w}×{item.h}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-medium">Khổ đang chọn:</span>
            <span className="font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-lg">
              {currentPresetName} ({config.pageW} × {config.pageH} mm)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xs transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
