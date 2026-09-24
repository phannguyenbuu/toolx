import React from 'react';
import { Scissors, X } from 'lucide-react';
import { CutDielineModalProps } from './types';
import { useCutDielineModalState } from './hooks/useCutDielineModalState';
import { DielineCanvasPreview } from './components/DielineCanvasPreview';
import { DielineSettingsPanel } from './components/DielineSettingsPanel';

export const CutDielineModal: React.FC<CutDielineModalProps> = ({
  isOpen,
  onClose,
  plan,
  pageW,
  pageH,
  defaultItemW,
  defaultItemH,
  defaultShape,
  defaultCutBleed = 3,
  defaultCornerRadius = 0,
  shapeTabs = [],
  currentSheetIndex = 0,
  totalSheets = 1,
  isMultiShape = false,
}) => {
  const {
    selectedSheet,
    setSelectedSheet,
    cutColor,
    setCutColor,
    strokeWidthMm,
    setStrokeWidthMm,
    cutBleed,
    setCutBleed,
    showPageBorder,
    setShowPageBorder,
    bgTheme,
    setBgTheme,
    customFilename,
    setCustomFilename,
    isCopied,
    isExporting,
    zoom,
    pan,
    isDragging,
    previewContainerRef,
    effectiveTotalSheets,
    dielineResult,
    completeSvgString,
    handleDownloadSvg,
    handleDownloadPdf,
    handleCopySvg,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  } = useCutDielineModalState({
    isOpen,
    plan,
    pageW,
    pageH,
    defaultItemW,
    defaultItemH,
    defaultShape,
    defaultCutBleed,
    defaultCornerRadius,
    shapeTabs,
    currentSheetIndex,
    totalSheets,
    isMultiShape,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-5xl w-full h-[90vh] max-h-[850px] flex flex-col overflow-hidden text-slate-800 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Scissors size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Xem trước & Tải khuôn cắt (Die-Cut Dieline)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Vector SVG & PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Khổ giấy: <strong className="text-slate-700">{pageW} × {pageH} mm</strong> • Đang xem:{' '}
                <strong className="text-violet-700">
                  {selectedSheet === 'all'
                    ? 'Tất cả các tờ'
                    : `Tờ ${(typeof selectedSheet === 'number' ? selectedSheet : 0) + 1} / ${effectiveTotalSheets}`}
                </strong>{' '}
                • Số tem: <strong className="text-slate-700">{dielineResult.itemCount}</strong> • Tổng đường dao:{' '}
                <strong className="text-rose-600">{dielineResult.totalCutLengthMeters} m</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Canvas Preview */}
          <DielineCanvasPreview
            previewContainerRef={previewContainerRef}
            zoom={zoom}
            pan={pan}
            isDragging={isDragging}
            bgTheme={bgTheme}
            completeSvgString={completeSvgString}
            renderWidthMm={dielineResult.renderWidthMm}
            renderHeightMm={dielineResult.renderHeightMm}
            totalCutLengthMeters={dielineResult.totalCutLengthMeters}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onSetBgTheme={setBgTheme}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />

          {/* Right Configuration & Export Panel */}
          <DielineSettingsPanel
            effectiveTotalSheets={effectiveTotalSheets}
            selectedSheet={selectedSheet}
            onSelectSheet={setSelectedSheet}
            cutColor={cutColor}
            onSetCutColor={setCutColor}
            strokeWidthMm={strokeWidthMm}
            onSetStrokeWidthMm={setStrokeWidthMm}
            cutBleed={cutBleed}
            onSetCutBleed={setCutBleed}
            showPageBorder={showPageBorder}
            onSetShowPageBorder={setShowPageBorder}
            pageW={pageW}
            pageH={pageH}
            customFilename={customFilename}
            onSetCustomFilename={setCustomFilename}
            isExporting={isExporting}
            isCopied={isCopied}
            onDownloadSvg={handleDownloadSvg}
            onDownloadPdf={handleDownloadPdf}
            onCopySvg={handleCopySvg}
          />
        </div>
      </div>
    </div>
  );
};

export default CutDielineModal;
