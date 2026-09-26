import React from 'react';
import {
  Square,
  Circle,
  Triangle,
  Hexagon,
  ImagePlus,
  Upload,
  PenTool
} from 'lucide-react';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';

export interface ImpositionLayerHeaderProps {
  activeTab: ShapeTabItem;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  updateActiveTabProp: (props: Partial<ShapeTabItem>) => void;
  allPages: PageItem[];
  vectorMaskResult: VectorMaskResult | null;
  handleOpenSourceEditor: () => void;
  handleSourceImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sourceImageInputRef: React.RefObject<HTMLInputElement | null>;
  setIsVectorMaskEditorOpen: (open: boolean) => void;
}

export const ImpositionLayerHeader: React.FC<ImpositionLayerHeaderProps> = ({
  activeTab,
  config,
  setConfig,
  updateActiveTabProp,
  allPages,
  vectorMaskResult,
  handleOpenSourceEditor,
  handleSourceImageSelect,
  sourceImageInputRef,
  setIsVectorMaskEditorOpen
}) => {
  const currentSourceThumb = activeTab.sourceImage?.thumb || (allPages.length > 0 && allPages[0]?.thumb);
  const activeVectorMask = activeTab.vectorMaskResult || vectorMaskResult;

  return (
    <div className="flex gap-2 mb-3 items-stretch">
      {/* Hidden file input for source image */}
      <input
        type="file"
        ref={sourceImageInputRef as any}
        accept="image/*,.pdf"
        onChange={handleSourceImageSelect}
        className="hidden"
      />

      {/* Nút 1: Ảnh nguồn (Bên trái, chiều cao 2 hàng) */}
      <div className="relative group/srcbtn shrink-0 w-28">
        <div
          onClick={() => {
            if (currentSourceThumb) {
              handleOpenSourceEditor();
            } else {
              sourceImageInputRef.current?.click();
            }
          }}
          className={`w-28 h-full min-h-[62px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border overflow-hidden relative select-none ${
            currentSourceThumb
              ? 'border-emerald-500 shadow-sm ring-2 ring-emerald-200 hover:ring-emerald-300'
              : 'bg-emerald-50/70 hover:bg-emerald-100/80 border-2 border-dashed border-emerald-400 text-emerald-700 hover:border-emerald-600 shadow-2xs'
          }`}
          style={
            currentSourceThumb
              ? {
                  backgroundColor: '#ffffff',
                  backgroundImage: 'conic-gradient(#cbd5e1 25%, #ffffff 0 50%, #cbd5e1 0 75%, #ffffff 0)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0',
                }
              : undefined
          }
          title={currentSourceThumb ? 'Ảnh nguồn: Bấm để Sửa Crop/Màu hoặc Đổi file/PDF' : 'Chọn ảnh hoặc file PDF để nạp vào Layer'}
        >
          {currentSourceThumb ? (
            <div className="relative w-full h-full min-h-[62px] flex items-center justify-center p-0.5">
              <img
                src={currentSourceThumb}
                alt="Nguồn"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <>
              <ImagePlus size={18} className="mb-0.5 text-emerald-600" />
              <span className="text-[11px] font-bold tracking-tight text-emerald-800">Ảnh / PDF nguồn</span>
              <span className="text-[8px] text-emerald-600/90 font-medium leading-none mt-0.5">Mỗi trang 1 layer</span>
            </>
          )}
        </div>
      </div>

      {/* Cụm 2: 6 Shapes (Hình dạng cơ bản, 2 hàng x 3 cột) */}
      <div className="flex-1 grid grid-cols-3 gap-1.5 min-h-[62px]">
        {[
          { id: 'rect', label: 'Chữ nhật', icon: <Square size={13} className="shrink-0" /> },
          { id: 'circle', label: 'Tròn', icon: <Circle size={13} className="shrink-0" /> },
          { id: 'oval', label: 'Bầu dục / Elip', icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="6" /></svg> },
          { id: 'trapezoid', label: 'Thang', icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="4,18 20,18 17,6 7,6" /></svg> },
          { id: 'triangle', label: 'Tam giác', icon: <Triangle size={13} className="shrink-0" /> },
          { id: 'hexagon', label: 'Lục giác', icon: <Hexagon size={13} className="shrink-0" /> },
        ].map((s) => {
          const isSelected = config.shape === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setConfig(c => ({
                  ...c,
                  shape: s.id as any,
                  ...(s.id === 'circle' ? { itemH: c.itemW } : {})
                }));
                updateActiveTabProp({
                  shape: s.id as any,
                  ...(s.id === 'circle' ? { itemH: activeTab.itemW } : {})
                });
              }}
              className={`h-[28px] rounded-lg border flex items-center justify-center transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-violet-600 bg-violet-600 text-white shadow-2xs font-medium ring-2 ring-violet-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs'
              }`}
              title={s.label}
            >
              {s.icon}
            </button>
          );
        })}
      </div>

      {/* Nút 3: Vector Mask Editor (Bên phải) */}
      <div className="relative group/vecbtn shrink-0 w-28">
        <button
          type="button"
          onClick={() => setIsVectorMaskEditorOpen(true)}
          className={`w-28 h-full min-h-[62px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border overflow-hidden relative select-none ${
            activeVectorMask
              ? 'bg-violet-50/90 border-violet-400 shadow-sm ring-2 ring-violet-200 text-violet-900'
              : 'bg-violet-50/70 hover:bg-violet-100/80 border-2 border-dashed border-violet-400 text-violet-700 hover:border-violet-600 shadow-2xs'
          }`}
          title={activeVectorMask ? 'Vector Mask: Bấm để mở trình vẽ vector knot & shape' : 'Vẽ Vector Mask (Knot & Shape) cho mẫu này'}
        >
          {activeVectorMask ? (
            <div className="relative w-full h-full min-h-[62px] flex flex-col items-center justify-center p-1 bg-violet-50/90 text-violet-900">
              <PenTool size={16} className="text-violet-600 mb-0.5" />
              <span className="text-[10px] font-bold text-violet-950 truncate max-w-[90px]">Vector Mask</span>
              <span className="text-[8px] text-violet-600 font-mono font-semibold">
                {activeVectorMask.w_mm}×{activeVectorMask.h_mm}mm
              </span>
              <div className="absolute inset-0 bg-violet-900/40 opacity-0 group-hover/vecbtn:opacity-100 transition flex flex-col items-center justify-center text-white backdrop-blur-[0.5px]">
                <PenTool size={16} />
                <span className="text-[9px] font-bold mt-0.5">Sửa Vector</span>
              </div>
            </div>
          ) : (
            <>
              <PenTool size={18} className="mb-0.5 text-violet-600" />
              <span className="text-[11px] font-bold tracking-tight text-violet-900">Vector Mask</span>
              <span className="text-[8px] text-violet-600/90 font-medium leading-none mt-0.5">Knot & Shape</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
