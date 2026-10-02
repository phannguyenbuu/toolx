import React, { useState, useRef, useEffect } from 'react';
import {
  Square,
  Circle,
  Triangle,
  Hexagon,
  ImagePlus,
  PenTool,
  UploadCloud
} from 'lucide-react';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { ImpositionCloneModal } from './ImpositionCloneModal';

export interface ImpositionLayerHeaderProps {
  activeTab: ShapeTabItem;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  updateActiveTabProp: (props: Partial<ShapeTabItem>) => void;
  allPages: PageItem[];
  setAllPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  vectorMaskResult: VectorMaskResult | null;
  handleOpenSourceEditor: () => void;
  handleSourceImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sourceImageInputRef: React.RefObject<HTMLInputElement | null>;
  setIsVectorMaskEditorOpen: (open: boolean) => void;
  onAddNewJob?: () => void;
}

const SHAPES = [
  { id: 'rect',      label: 'Chữ nhật',  icon: <Square   size={22} className="shrink-0" /> },
  { id: 'circle',    label: 'Tròn',       icon: <Circle   size={22} className="shrink-0" /> },
  { id: 'oval',      label: 'Bầu dục',    icon: <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="6" /></svg> },
  { id: 'trapezoid', label: 'Hình thang', icon: <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="4,18 20,18 17,6 7,6" /></svg> },
  { id: 'triangle',  label: 'Tam giác',   icon: <Triangle size={22} className="shrink-0" /> },
  { id: 'hexagon',   label: 'Lục giác',   icon: <Hexagon  size={22} className="shrink-0" /> },
] as const;

type ShapeId = typeof SHAPES[number]['id'];

export const ImpositionLayerHeader: React.FC<ImpositionLayerHeaderProps> = ({
  activeTab,
  config,
  setConfig,
  updateActiveTabProp,
  allPages,
  setAllPages,
  vectorMaskResult,
  handleOpenSourceEditor,
  handleSourceImageSelect,
  sourceImageInputRef,
  setIsVectorMaskEditorOpen,
  onAddNewJob,
}) => {
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  const currentSourceThumb = activeTab.sourceImage?.thumb || (allPages.length > 0 && allPages[0]?.thumb);
  const activeVectorMask = activeTab.vectorMaskResult || vectorMaskResult;
  const hasVectorMask = Boolean(activeVectorMask);

  // isVectorMaskMode = source of truth cho display
  const [isVectorMaskMode, setIsVectorMaskMode] = useState(() => hasVectorMask);

  // SL: hiện số ngay, debounce 1s mới cập nhật layout
  const [displayQty, setDisplayQty] = useState(activeTab.quantity);
  const qtyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setDisplayQty(activeTab.quantity); }, [activeTab.quantity]);

  const updateQty = (val: number) => {
    const clamped = Math.max(1, Math.min(9999, val));
    setDisplayQty(clamped);
    if (qtyDebounceRef.current) clearTimeout(qtyDebounceRef.current);
    qtyDebounceRef.current = setTimeout(() => {
      updateActiveTabProp({ quantity: clamped });
    }, 1000);
  };

  // Commit ngay không debounce (Enter / blur)
  const flushQty = (val: number) => {
    const clamped = Math.max(1, Math.min(9999, val));
    setDisplayQty(clamped);
    if (qtyDebounceRef.current) clearTimeout(qtyDebounceRef.current);
    updateActiveTabProp({ quantity: clamped });
  };

  // Khi đổi tab → re-sync mode theo trạng thái tab mới
  useEffect(() => {
    setIsVectorMaskMode(Boolean(activeTab.vectorMaskResult || vectorMaskResult));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab.id]);

  const handleSelectShape = (id: ShapeId) => {
    setIsVectorMaskMode(false);
    setConfig(c => ({
      ...c,
      shape: id as any,
      ...(id === 'circle' ? { itemH: c.itemW } : {}),
    }));
    updateActiveTabProp({
      shape: id as any,
      ...(id === 'circle' ? { itemH: activeTab.itemW } : {}),
    });
  };

  const handleSelectVectorMask = () => {
    setIsVectorMaskMode(true);
    setIsVectorMaskEditorOpen(true);
  };

  return (
    <>
      <div
        className="flex gap-2 mb-2.5 items-stretch select-none"
        style={{ height: '225px', minHeight: '225px' }}
      >
        {/* Hidden file input (hỗ trợ chọn nhiều ảnh/trang vào chung job) */}
        <input
          type="file"
          ref={sourceImageInputRef as any}
          accept="image/*,.pdf,.svg"
          multiple
          onChange={handleSourceImageSelect}
          className="hidden"
        />

        {/* ── CỘT 1: Ảnh nguồn (Preview lớn + Nút Tạo job mới ở đáy) ── */}
        <div
          className="flex-1 flex flex-col h-full rounded-2xl border border-slate-200 bg-slate-50/50 p-2 shadow-xs overflow-hidden select-none"
          style={{ borderRadius: '16px' }}
        >
          {/* Vùng Preview ảnh nguồn */}
          <div
            onClick={() => {
              if (currentSourceThumb) {
                handleOpenSourceEditor();
              } else {
                sourceImageInputRef.current?.click();
              }
            }}
            className={`flex-1 min-h-0 w-full rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative select-none ${
              currentSourceThumb
                ? 'border-2 border-emerald-400 shadow-xs bg-white hover:ring-2 hover:ring-emerald-300'
                : 'bg-emerald-50/70 hover:bg-emerald-100/80 border-2 border-dashed border-emerald-300 text-emerald-700 hover:border-emerald-500'
            }`}
            style={{
              borderRadius: '12px',
              borderStyle: currentSourceThumb ? 'solid' : 'dashed',
              borderWidth: '2px',
              borderColor: currentSourceThumb ? '#34d399' : '#6ee7b7',
              ...(currentSourceThumb
                ? {
                    backgroundImage: 'conic-gradient(#cbd5e1 25%, #ffffff 0 50%, #cbd5e1 0 75%, #ffffff 0)',
                    backgroundSize: '12px 12px',
                  }
                : {}),
            }}
            title={currentSourceThumb ? 'Ảnh nguồn: Bấm để Sửa Crop/Màu hoặc Đổi ảnh' : 'Chọn ảnh hoặc file PDF để nạp vào Job'}
          >
            {currentSourceThumb ? (
              <div className="w-full h-full flex items-center justify-center p-1.5">
                <img src={currentSourceThumb} alt="Nguồn" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-2 text-center">
                <ImagePlus size={26} className="text-emerald-600 mb-1" />
                <span className="text-xs font-bold text-emerald-800 leading-tight">Chọn ảnh/PDF</span>
                <span className="text-[9px] text-emerald-600 font-medium leading-none mt-1">Mỗi trang 1 job</span>
              </div>
            )}
          </div>

          {/* Nút tím Tạo ảnh nguồn ở đáy Cột 1 (thêm ảnh nguồn/trang vào chung layer này) */}
          <button
            type="button"
            onClick={() => sourceImageInputRef.current?.click()}
            className="mt-2 w-full h-[52px] min-h-[52px] py-1 px-2.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-2xl shadow-xs transition-all cursor-pointer shrink-0 select-none flex items-center justify-center gap-2"
            style={{ borderRadius: '16px', backgroundColor: '#7c3aed', minHeight: '52px' }}
            title="Thêm ảnh nguồn / trang mới vào chung Layer này"
          >
            <UploadCloud size={20} className="shrink-0" />
            <div className="flex flex-col text-left leading-tight font-bold text-xs tracking-tight">
              <span>Tạo ảnh</span>
              <span>nguồn</span>
            </div>
          </button>
        </div>

        {/* ── CỘT 2: Danh sách Shape (Khung bo viền 2x3 Grid) ── */}
        <div
          className="flex-1 flex flex-col h-full rounded-2xl border-2 border-indigo-300 bg-white p-2.5 shadow-xs justify-center items-center select-none"
          style={{
            border: '2px solid #a5b4fc',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
          }}
        >
          <div className="grid grid-cols-2 gap-2 w-full h-full content-center items-center justify-items-center">
            {SHAPES.map((s) => {
              const isActive = config.shape === s.id && !isVectorMaskMode;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectShape(s.id)}
                  className={`w-full h-full max-w-[56px] max-h-[56px] aspect-square flex items-center justify-center rounded-xl transition-all cursor-pointer select-none ${
                    isActive
                      ? 'border-2 border-violet-600 bg-violet-600 text-white shadow-xs'
                      : 'border border-slate-300 bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 hover:border-violet-300'
                  }`}
                  style={{
                    borderRadius: '12px',
                    ...(isActive
                      ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed', color: '#ffffff' }
                      : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#334155' }),
                  }}
                  title={s.label}
                >
                  {s.icon}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CỘT 3: 3 Khối xếp dọc (Số lượng, Input Stepper, Vector) - Cùng style & chiều cao ── */}
        <div className="flex-1 flex flex-col justify-between h-full gap-2 select-none">
          {/* Hàng 1: Nút Số lượng (Style tím & bo góc chuẩn nút Tạo ảnh nguồn) */}
          <button
            type="button"
            onClick={() => setIsCloneModalOpen(true)}
            className="flex-1 w-full h-[52px] min-h-[52px] rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold text-base tracking-tight flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-[0.98] select-none"
            style={{
              borderRadius: '16px',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              minHeight: '52px',
            }}
            title="Quản lý nhân bản & số lượng chi tiết"
          >
            <span>Số lượng</span>
          </button>

          {/* Hàng 2: Input Số lượng + Nút tăng/giảm ▲▼ */}
          <div
            className="flex-1 w-full h-[52px] min-h-[52px] rounded-2xl border-2 border-violet-300 bg-white flex items-center justify-between px-3.5 py-1 shadow-xs transition-all select-none focus-within:border-violet-600 focus-within:ring-2 focus-within:ring-violet-200"
            style={{
              border: '2px solid #c4b5fd',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              minHeight: '52px',
            }}
          >
            <input
              type="number"
              min={1}
              max={9999}
              value={displayQty}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) updateQty(v);
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = parseInt((e.target as HTMLInputElement).value, 10);
                  if (!isNaN(v)) flushQty(v);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) flushQty(v);
              }}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full text-center font-bold text-2xl text-violet-950 leading-none tabular-nums bg-transparent focus:outline-none focus:text-violet-700 cursor-text py-0"
              style={{ MozAppearance: 'textfield' }}
            />
            <div className="flex flex-col items-center justify-center shrink-0 ml-1 h-full gap-1">
              <button
                type="button"
                onClick={() => updateQty(displayQty + 1)}
                className="text-violet-700 hover:text-violet-950 hover:bg-violet-100 rounded px-1 cursor-pointer text-xs font-bold leading-none transition select-none"
                title="Tăng số lượng"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => updateQty(displayQty - 1)}
                className="text-violet-700 hover:text-violet-950 hover:bg-violet-100 rounded px-1 cursor-pointer text-xs font-bold leading-none transition select-none"
                title="Giảm số lượng"
              >
                ▼
              </button>
            </div>
          </div>

          {/* Hàng 3: Nút Vector (Style tím & bo góc chuẩn nút Tạo ảnh nguồn) */}
          <button
            type="button"
            onClick={handleSelectVectorMask}
            className={`flex-1 w-full h-[52px] min-h-[52px] rounded-2xl font-bold text-base tracking-tight shadow-xs active:scale-[0.98] select-none flex items-center justify-center transition-all cursor-pointer ${
              isVectorMaskMode || hasVectorMask
                ? 'bg-violet-700 text-white ring-2 ring-violet-300 shadow-md'
                : 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white'
            }`}
            style={{
              borderRadius: '16px',
              backgroundColor: isVectorMaskMode || hasVectorMask ? '#6d28d9' : '#7c3aed',
              color: '#ffffff',
              minHeight: '52px',
            }}
            title={hasVectorMask ? `Vector Mask: ${activeVectorMask!.w_mm}×${activeVectorMask!.h_mm}mm · Bấm để sửa` : 'Knot & Shape Vector Mask'}
          >
            <span>Vector</span>
          </button>
        </div>
      </div>

      {/* Clone modal */}
      <ImpositionCloneModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        quantity={activeTab.quantity}
        allPages={allPages}
        onApplyQuantity={(qty) => flushQty(qty)}
        onApplyPages={(pages) => {
          setAllPages(pages);
        }}
      />
    </>
  );
};

export const ImpositionJobHeader = ImpositionLayerHeader;
export type ImpositionJobHeaderProps = ImpositionLayerHeaderProps;
