import React, { useState, useCallback } from 'react';
import { Sparkles, Scissors, RotateCw, RotateCcw, Eraser } from 'lucide-react';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { DebouncedNumberInput } from '../common/DebouncedNumberInput';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { safeToastSuccess, removeWhiteBackgroundService } from './impositionHelpers';
import { createClientThumbnail } from '../../utils/imageThumbnail';
import { ImpositionLayerHeader } from './ImpositionLayerHeader';
import { ImpositionLayerDimensions } from './ImpositionLayerDimensions';

export interface ImpositionLayerCardProps {
  activeTab: ShapeTabItem;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  updateActiveTabProp: (props: Partial<ShapeTabItem>) => void;
  allPages: PageItem[];
  setAllPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
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
  onAddNewJob?: () => void;
}

export const ImpositionLayerCard: React.FC<ImpositionLayerCardProps> = ({
  activeTab,
  config,
  setConfig,
  updateActiveTabProp,
  allPages,
  setAllPages,
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
  setIsScaleModalOpen,
  onAddNewJob,
}) => {
  const currentSourceThumb = activeTab.sourceImage?.thumb || (allPages.length > 0 && allPages[0]?.thumb);
  const activeVectorMask = activeTab.vectorMaskResult || vectorMaskResult;

  const isTabAutoRotateImage = activeTab.autoRotateImage !== undefined
    ? activeTab.autoRotateImage
    : (activeTab.autoRotate !== undefined
        ? activeTab.autoRotate
        : (config.autoRotateImage ?? true));

  const [isRemovingWhite, setIsRemovingWhite] = useState(false);

  // Khử nền trắng thông minh: bảo vệ màu sắc và gọt sạch bóng đổ trên ảnh gốc chất lượng cao
  const handleRemoveWhiteBackground = useCallback(async () => {
    const highResSrc =
      activeTab.sourceImage?.originalThumb ||
      activeTab.sourceImage?.url ||
      activeTab.sourceImage?.thumb ||
      allPages[0]?.originalThumb ||
      allPages[0]?.url ||
      allPages[0]?.thumb ||
      '';
    if (!highResSrc) return;
    setIsRemovingWhite(true);
    try {
      const resultHighRes = await removeWhiteBackgroundService(highResSrc);
      const baseItem = (activeTab.sourceImage || (allPages[0] ? { ...allPages[0] } : {})) as PageItem;
      const originalBackup = baseItem.originalThumb || baseItem.url || highResSrc;
      const previewThumb = (await createClientThumbnail(resultHighRes, 320, 0.8)) || resultHighRes;
      updateActiveTabProp({
        sourceImage: {
          ...baseItem,
          id: baseItem.id || 'source-image',
          thumb: previewThumb,
          originalThumb: resultHighRes,
          url: resultHighRes,
          baseThumb: originalBackup,
        },
      });
      safeToastSuccess('Đã khử nền trắng thành công!');
    } catch (err) {
      console.error('Lỗi khử nền trắng:', err);
    } finally {
      setIsRemovingWhite(false);
    }
  }, [activeTab, allPages, updateActiveTabProp]);

  const handleResetOriginalThumb = useCallback(() => {
    const baseItem = activeTab.sourceImage;
    if (!baseItem || !baseItem.originalThumb) return;
    updateActiveTabProp({
      sourceImage: { ...baseItem, thumb: baseItem.originalThumb },
    });
    safeToastSuccess('Đã khôi phục ảnh gốc!');
  }, [activeTab.sourceImage, updateActiveTabProp]);

  const canResetThumb = Boolean(
    activeTab.sourceImage?.originalThumb &&
    activeTab.sourceImage.originalThumb !== activeTab.sourceImage.thumb
  );

  return (
    <div
      className="rounded-2xl border p-2.5 bg-white shadow-2xs relative z-0 transition-colors"
      style={{ borderColor: activeTab.color || '#8b5cf6' }}
    >
      {/* Top Area: Source Image (Left) + 6 Shapes in 2x3 Grid (Center) + Stacked Controls (Right) */}
      <ImpositionLayerHeader
        activeTab={activeTab}
        config={config}
        setConfig={setConfig}
        updateActiveTabProp={updateActiveTabProp}
        allPages={allPages}
        setAllPages={setAllPages}
        vectorMaskResult={vectorMaskResult}
        handleOpenSourceEditor={handleOpenSourceEditor}
        handleSourceImageSelect={handleSourceImageSelect}
        sourceImageInputRef={sourceImageInputRef}
        setIsVectorMaskEditorOpen={setIsVectorMaskEditorOpen}
        onAddNewJob={onAddNewJob}
      />

      {/* Hàng 2: [Khử trắng] [Tự xoay ảnh] [Reset ảnh] — 3 nút bằng nhau */}
      <div className="flex gap-1.5 mb-2.5">
        <button
          type="button"
          onClick={handleRemoveWhiteBackground}
          disabled={isRemovingWhite || (!activeTab.sourceImage?.thumb && allPages.length === 0)}
          className={`flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl px-2 py-1.5 text-violet-700 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none ${
            isRemovingWhite ? 'animate-pulse' : ''
          }`}
          title="Khử nền trắng & gọt sạch bóng đổ"
        >
          <Sparkles size={13} className={`shrink-0 text-violet-600 ${isRemovingWhite ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-bold truncate">
            {isRemovingWhite ? 'Đang khử...' : 'Khử trắng'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            const nextVal = !isTabAutoRotateImage;
            setConfig(c => ({ ...c, autoRotateImage: nextVal }));
            updateActiveTabProp({ autoRotateImage: nextVal });
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 border transition-all shadow-2xs cursor-pointer select-none ${
            isTabAutoRotateImage
              ? 'border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white font-medium ring-2 ring-emerald-200 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
          title={isTabAutoRotateImage ? 'Tự xoay ảnh: BẬT — bấm để tắt' : 'Tự xoay ảnh: TẮT — bấm để bật'}
        >
          <RotateCw size={13} className="shrink-0" />
          <span className="text-[10px] font-bold truncate">Tự xoay ảnh</span>
        </button>

        <button
          type="button"
          onClick={handleResetOriginalThumb}
          disabled={!canResetThumb}
          className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 rounded-xl px-2 py-1.5 text-amber-800 transition-all shadow-2xs cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
          title={canResetThumb ? "Khôi phục lại ảnh ban đầu (Reset ảnh)" : "Không có thay đổi để khôi phục"}
        >
          <RotateCcw size={13} className="text-amber-700 shrink-0" />
          <span className="text-[10px] font-bold truncate">Reset ảnh</span>
        </button>
      </div>

      {/* Kích thước Layer, Số lượng, Khóa tỉ lệ & Pill chuẩn ảnh */}
      <ImpositionLayerDimensions
        activeTab={activeTab}
        config={config}
        setConfig={setConfig}
        updateActiveTabProp={updateActiveTabProp}
        isMultiShape={isMultiShape}
      />

      {/* Fit mode: Segmented radio toggle */}
      <div className="mb-2">
        <div className="flex h-7 rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
          {[
            {
              v: 'stretch',
              label: 'Kéo giãn',
              title: 'Kéo giãn',
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
              title: 'Lấp đầy',
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
              title: 'Vừa khít',
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
              title: 'Tỷ lệ 100% (Bấm để tuỳ chỉnh)',
              icon: (
                <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                  <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                  <rect x="5" y="4" width="10" height="8" fill="currentColor" opacity="0.2"/>
                  <rect x="5" y="4" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )
            },
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
                className={`flex-1 flex items-center justify-center gap-1 rounded-md text-[10px] font-medium transition-all cursor-pointer select-none whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
                title={btn.title}
              >
                {btn.icon}
                <span>{btn.v === 'actual' && customScale !== 100 ? `${customScale}%` : btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>


      {/* Hàng cuối: Gap, Bleed, Radius — kéo dãn vừa khít */}
      <div
        className={`grid gap-1.5 ${
          ['rect', 'trapezoid', 'triangle', 'hexagon'].includes(config.shape)
            ? 'grid-cols-3'
            : 'grid-cols-2'
        }`}
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

        {/* Bù cắt (Bleed) */}
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
      </div>
    </div>
  );
};

export const ImpositionJobCard = ImpositionLayerCard;
export type ImpositionJobCardProps = ImpositionLayerCardProps;
