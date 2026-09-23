import React from 'react';
import {
  Sparkles,
  Scissors,
  RotateCw
} from 'lucide-react';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { safeToastSuccess } from './impositionHelpers';
import { ImpositionLayerHeader } from './ImpositionLayerHeader';

export interface ImpositionLayerCardProps {
  activeTab: ShapeTabItem;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  updateActiveTabProp: (props: Partial<ShapeTabItem>) => void;
  allPages: PageItem[];
  isMultiShape: boolean;
  vectorMaskResult: VectorMaskResult | null;
  customScale: number;
  totalSheets: number;
  currentSheetIndex: number;
  setCurrentSheetIndex: (idx: number) => void;
  hasLastSheetBlanks: boolean;
  lastSheetBlankCount: number;
  handleOpenSourceEditor: () => void;
  handleSourceImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sourceImageInputRef: React.RefObject<HTMLInputElement | null>;
  soLuongInputRef: React.RefObject<HTMLInputElement | null>;
  rongInputRef: React.RefObject<HTMLInputElement | null>;
  caoInputRef: React.RefObject<HTMLInputElement | null>;
  setIsVectorMaskEditorOpen: (open: boolean) => void;
  setIsScaleModalOpen: (open: boolean) => void;
}

export const ImpositionLayerCard: React.FC<ImpositionLayerCardProps> = ({
  activeTab,
  config,
  setConfig,
  updateActiveTabProp,
  allPages,
  isMultiShape,
  vectorMaskResult,
  customScale,
  totalSheets,
  currentSheetIndex,
  setCurrentSheetIndex,
  hasLastSheetBlanks,
  lastSheetBlankCount,
  handleOpenSourceEditor,
  handleSourceImageSelect,
  sourceImageInputRef,
  soLuongInputRef,
  rongInputRef,
  caoInputRef,
  setIsVectorMaskEditorOpen,
  setIsScaleModalOpen
}) => {
  const currentSourceThumb = activeTab.sourceImage?.thumb || (allPages.length > 0 && allPages[0]?.thumb);
  const activeVectorMask = activeTab.vectorMaskResult || vectorMaskResult;

  const isTabAutoRotateImage = isMultiShape
    ? (activeTab.autoRotateImage !== undefined ? activeTab.autoRotateImage : (activeTab.autoRotate !== undefined ? activeTab.autoRotate : (config.autoRotateImage ?? true)))
    : (config.autoRotateImage ?? true);

  return (
    <div
      className="rounded-2xl border p-3 bg-white shadow-2xs relative z-0 transition-colors"
      style={{ borderColor: activeTab.color || '#8b5cf6' }}
    >
      {/* Top Area: Source Image (Left) + 6 Shapes in 2x3 Grid (Center) + Vector Mask Editor (Right) */}
      <ImpositionLayerHeader
        activeTab={activeTab}
        config={config}
        setConfig={setConfig}
        updateActiveTabProp={updateActiveTabProp}
        allPages={allPages}
        vectorMaskResult={vectorMaskResult}
        handleOpenSourceEditor={handleOpenSourceEditor}
        handleSourceImageSelect={handleSourceImageSelect}
        sourceImageInputRef={sourceImageInputRef}
        setIsVectorMaskEditorOpen={setIsVectorMaskEditorOpen}
      />

      {/* Input Row 1: Số lượng (Quantity) / Rộng (W) / Cao (H) */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {/* Cột 1: Số lượng */}
        <div
          onClick={() => soLuongInputRef.current?.focus()}
          className="flex items-center justify-between bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-300/90 rounded-xl px-2 py-1.5 transition-all focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-600 focus-within:bg-white shadow-2xs min-w-0 cursor-text"
        >
          <div className="flex items-center gap-1 shrink-0 pr-0.5" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              id="useTotalLimit"
              checked={isMultiShape ? true : !!config.useTotalLimit}
              onChange={e => {
                const checked = e.target.checked;
                const safeOrder = Math.min(99, config.totalOrder || 1);
                const safeTabQty = Math.min(99, activeTab.quantity || 1);
                setConfig(c => ({ ...c, useTotalLimit: checked, totalOrder: safeOrder }));
                updateActiveTabProp({ useTotalLimit: checked, quantity: safeTabQty });
              }}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-400 border-emerald-400 cursor-pointer shrink-0"
            />
            <span
              className="text-[10px] font-bold text-emerald-800 shrink-0 cursor-pointer select-none"
              onClick={() => {
                const checked = !config.useTotalLimit;
                const safeOrder = Math.min(99, config.totalOrder || 1);
                const safeTabQty = Math.min(99, activeTab.quantity || 1);
                setConfig(c => ({ ...c, useTotalLimit: checked, totalOrder: safeOrder }));
                updateActiveTabProp({ useTotalLimit: checked, quantity: safeTabQty });
              }}
              title="Giới hạn số lượng tem đặt in (Tối đa 99 tem/layer)"
            >
              Số lượng
            </span>
          </div>

          <div className="flex items-center gap-0.5 min-w-0 justify-end flex-1">
            <DebouncedNumberInput
              inputRef={soLuongInputRef as any}
              min={1}
              max={99}
              step={1}
              value={Math.min(99, isMultiShape ? (activeTab.quantity || 1) : (config.totalOrder || 1))}
              onChange={v => {
                const q = Math.min(99, Math.max(1, Math.round(v)));
                if (!isMultiShape) {
                  setConfig(c => ({ ...c, totalOrder: q, useTotalLimit: true }));
                }
                updateActiveTabProp({ quantity: q, useTotalLimit: true });
              }}
              className="w-full min-w-[38px] max-w-[62px] bg-transparent text-right font-bold text-xs text-emerald-700 focus:outline-none"
            />
            <span className="text-[9px] text-slate-400 font-medium shrink-0 select-none">tem</span>
          </div>
        </div>

        {/* Cột 2: Rộng / Đường kính */}
        <div
          onClick={() => rongInputRef.current?.focus()}
          className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs cursor-text"
        >
          <span className="text-[10px] font-semibold text-slate-600 truncate pr-0.5 select-none">
            {config.shape === 'circle' ? 'Đ.kính (Dia)' : 'Rộng (W)'}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <DebouncedNumberInput
              inputRef={rongInputRef as any}
              step={0.1}
              min={1}
              value={config.itemW}
              onChange={v => {
                setConfig(c => ({
                  ...c,
                  itemW: v,
                  ...(c.shape === 'circle' ? { itemH: v } : {}),
                }));
                updateActiveTabProp({
                  itemW: v,
                  ...(activeTab.shape === 'circle' ? { itemH: v } : {}),
                });
              }}
              className="w-14 sm:w-16 min-w-[44px] bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
            />
            <span className="text-[9px] text-slate-400 font-medium select-none">mm</span>
          </div>
        </div>

        {/* Cột 3: Cao */}
        {config.shape !== 'circle' ? (
          <div
            onClick={() => caoInputRef.current?.focus()}
            className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs cursor-text"
          >
            <span className="text-[10px] font-semibold text-slate-600 truncate pr-0.5 select-none">
              Cao (H)
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <DebouncedNumberInput
                inputRef={caoInputRef as any}
                step={0.1}
                min={1}
                value={config.itemH}
                onChange={v => {
                  setConfig(c => ({ ...c, itemH: v }));
                  updateActiveTabProp({ itemH: v });
                }}
                className="w-14 sm:w-16 min-w-[44px] bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 font-medium select-none">mm</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-100/60 border border-dashed border-slate-200 rounded-xl px-2 py-1.5 text-slate-400">
            <span className="text-[10px] font-medium">Tỷ lệ</span>
            <span className="text-xs font-bold font-mono">1:1</span>
          </div>
        )}
      </div>

      {/* Pill khôi phục kích thước chuẩn ảnh gốc */}
      {activeTab.sourceImage && (activeTab.sourceImage.w || 0) > 0 && (activeTab.sourceImage.h || 0) > 0 && (
        (config.itemW !== activeTab.sourceImage.w || (config.shape !== 'circle' && config.itemH !== activeTab.sourceImage.h)) ? (
          <div className="flex items-center justify-between px-2.5 py-1 mb-2 bg-amber-50/90 border border-amber-200/90 rounded-xl text-[11px] text-amber-800 animate-fadeIn">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles size={12} className="text-amber-600 shrink-0" />
              <span className="truncate">
                Chuẩn ảnh: <strong className="font-mono">{activeTab.sourceImage.w} × {config.shape === 'circle' ? activeTab.sourceImage.w : activeTab.sourceImage.h} mm</strong>
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                const targetW = activeTab.sourceImage?.w || config.itemW;
                const targetH = config.shape === 'circle' ? targetW : (activeTab.sourceImage?.h || config.itemH);
                setConfig(c => ({ ...c, itemW: targetW, itemH: targetH }));
                updateActiveTabProp({ itemW: targetW, itemH: targetH });
                safeToastSuccess(`Đã đặt lại về kích thước chuẩn ảnh: ${targetW} × ${targetH} mm`);
              }}
              className="px-2 py-0.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md cursor-pointer transition shadow-2xs shrink-0 ml-1"
              title="Bấm để khôi phục kích thước chuẩn ảnh gốc ban đầu"
            >
              Khôi phục chuẩn
            </button>
          </div>
        ) : null
      )}

      {/* Input Row 2: Khoảng cách (Gap), Bù cắt (Bleed), Bo góc (Radius), và nút Trang cuối nếu có dư */}
      <div
        className={`grid ${
          ['rect', 'trapezoid', 'triangle', 'hexagon'].includes(config.shape)
            ? hasLastSheetBlanks && totalSheets > 1 ? 'grid-cols-4' : 'grid-cols-3'
            : hasLastSheetBlanks && totalSheets > 1 ? 'grid-cols-3' : 'grid-cols-2'
        } gap-1.5 mb-2`}
      >
        {/* Khoảng cách (Gap) */}
        <div
          className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs"
          title="Khoảng cách giữa các tem (Gap)"
        >
          <div className="flex items-center text-slate-500 shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6v12M20 6v12M9 12h6M9 9l-3 3 3 3M15 9l3 3-3 3" />
            </svg>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <DebouncedNumberInput
              step={0.1}
              min={0}
              value={config.padding}
              onChange={v => setConfig(c => ({ ...c, padding: v }))}
              className="w-12 bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
            />
            <span className="text-[9px] text-slate-400 font-medium">mm</span>
          </div>
        </div>

        {/* Bù cắt (Bleed) - min/default 3mm */}
        <div
          className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs"
          title="Bù cắt / Tràn viền (Cut Bleed) - Mặc định và tối thiểu 3mm"
        >
          <div className="flex items-center text-slate-500 shrink-0">
            <Scissors size={14} />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <DebouncedNumberInput
              step={0.5}
              min={0}
              value={config.cutBleed}
              onChange={v => {
                const finalV = v > 0 && v < 3 ? 3 : v;
                setConfig(c => ({ ...c, cutBleed: finalV }));
              }}
              className="w-12 bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
            />
            <span className="text-[9px] text-slate-400 font-medium">mm</span>
          </div>
        </div>

        {/* Bo góc (Radius) */}
        {['rect', 'trapezoid', 'triangle', 'hexagon'].includes(config.shape) && (
          <div
            className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs"
            title="Bán kính bo góc (Corner Radius)"
          >
            <div className="flex items-center text-slate-500 shrink-0">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 5H10a5 5 0 0 0-5 5v9" />
              </svg>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <DebouncedNumberInput
                step={0.5}
                min={0}
                value={config.cornerRadius}
                onChange={v => setConfig(c => ({ ...c, cornerRadius: v }))}
                className="w-12 bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 font-medium">mm</span>
            </div>
          </div>
        )}

        {/* Nút Trang cuối nếu có dư trắng */}
        {hasLastSheetBlanks && totalSheets > 1 && (
          <button
            type="button"
            onClick={() => setCurrentSheetIndex(totalSheets - 1)}
            className={`px-1.5 py-1.5 rounded-xl text-[10px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer border select-none ${
              currentSheetIndex === totalSheets - 1
                ? 'bg-amber-500 border-amber-600 text-white shadow-xs font-semibold'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-2xs animate-pulse'
            }`}
            title={`Xem trang cuối (Tờ ${totalSheets}) - Có ${lastSheetBlankCount} ô dư trắng`}
          >
            <span className="truncate">Trang cuối</span>
            <span className="bg-amber-200/90 text-amber-950 font-bold px-1 rounded text-[9px] shrink-0">
              dư {lastSheetBlankCount}
            </span>
          </button>
        )}
      </div>

      {/* Unified 5-Button Row: 4 Fit Modes + Auto Rotate */}
      <div className="mb-0">
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { 
              v: 'stretch', 
              label: 'Kéo giãn', 
              icon: (
                <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                  <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                  <rect x="0.5" y="0.5" width="19" height="15" fill="currentColor" opacity="0.2"/>
                  <path d="M3 8h14M10 3v10" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )
            },
            { 
              v: 'fill', 
              label: 'Lấp đầy', 
              icon: (
                <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                  <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                  <rect x="0.5" y="0.5" width="19" height="15" fill="currentColor" opacity="0.4"/>
                  <rect x="3" y="2" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )
            },
            { 
              v: 'fit', 
              label: 'Vừa khít', 
              icon: (
                <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                  <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                  <rect x="4" y="2" width="12" height="12" fill="currentColor" opacity="0.2"/>
                  <rect x="4" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )
            },
            { 
              v: 'actual', 
              label: '100%', 
              icon: (
                <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                  <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                  <rect x="5" y="4" width="10" height="8" fill="currentColor" opacity="0.2"/>
                  <rect x="5" y="4" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )
            }
          ].map((btn) => {
            const isSelected = config.fitMode === btn.v;
            return (
              <button
                key={btn.v}
                type="button"
                onClick={() => {
                  setConfig(c => ({ ...c, fitMode: btn.v as any }));
                  if (btn.v === 'actual') {
                    setIsScaleModalOpen(true);
                  }
                }}
                className={`h-7 px-1 rounded-lg border flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap ${
                  isSelected
                    ? 'border-violet-600 bg-violet-600 text-white shadow-2xs font-medium ring-2 ring-violet-200'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs'
                }`}
                title={btn.v === 'actual' ? 'Tỷ lệ 100% (Bấm để tuỳ chỉnh)' : btn.label}
              >
                {btn.icon}
                <span className="text-[10px] font-medium whitespace-nowrap">
                  {btn.v === 'actual' && customScale !== 100 ? `${customScale}%` : btn.label}
                </span>
              </button>
            );
          })}

          {/* 5th Button: Tự xoay ảnh vừa khung */}
          <button
            type="button"
            onClick={() => {
              const nextVal = !isTabAutoRotateImage;
              setConfig(c => ({ ...c, autoRotateImage: nextVal }));
              if (isMultiShape) {
                updateActiveTabProp({ autoRotateImage: nextVal });
              }
            }}
            className={`h-7 px-1.5 rounded-lg border flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap ${
              isTabAutoRotateImage
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs font-medium ring-2 ring-emerald-200'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
            title={
              isTabAutoRotateImage
                ? "Tự xoay ảnh vừa khung: Đang BẬT (Ảnh tự xoay 90° khi tỷ lệ ngược khung - bấm để tắt)"
                : "Tự xoay ảnh vừa khung: Đang TẮT (Giữ nguyên chiều ảnh gốc - bấm để bật)"
            }
          >
            <RotateCw size={12} className={isTabAutoRotateImage ? 'text-white' : 'text-slate-500'} />
            <span className="text-[10px] font-medium whitespace-nowrap">Tự xoay ảnh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
