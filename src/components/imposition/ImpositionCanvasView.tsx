import React, { useRef, useState } from 'react';
import {
  LayoutGrid,
  Check,
  Move,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Power,
  X
} from 'lucide-react';
import { PlanItem, LayoutPlan } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { ImpositionCanvasSlotItem } from './ImpositionCanvasSlotItem';
import { ImpositionCanvasDock } from './ImpositionCanvasDock';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { generateItemCropMarksPath, generatePageCropMarksPath } from './marksRenderer';

export interface ImpositionCanvasViewProps {
  containerRef: React.RefObject<HTMLElement | null>;
  canvasPan: { x: number; y: number };
  setCanvasPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  panStartRef: React.MutableRefObject<{ x: number; y: number }>;
  panOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
  currentPlan: LayoutPlan | null;
  styledPlan: LayoutPlan | null;
  impositionStyleEnabled: boolean;
  totalSheets: number;
  currentSheetIndex: number;
  setCurrentSheetIndex: React.Dispatch<React.SetStateAction<number>>;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  scale: number;
  isMultiShape: boolean;
  shapeTabs: ShapeTabItem[];
  activeTab: ShapeTabItem;
  allPages: PageItem[];
  customSvgData: string;
  vectorMaskResult: VectorMaskResult | null;
  previewSide: 'front' | 'back';
  setPreviewSide: (side: 'front' | 'back') => void;
  serverPreviewUrl: string;
  isLoadingServerPreview: boolean;
  dragOverSheetIdx: number | null;
  setDragOverSheetIdx: (idx: number | null) => void;
  draggedSlotIdx: number | null;
  setDraggedSlotIdx: (idx: number | null) => void;
  dragOverSlotIdx: number | null;
  setDragOverSlotIdx: (idx: number | null) => void;
  setDraggedItemData: (data: any) => void;
  handleMoveItemToSheet: (sourceIdx: number, targetSheetIdx: number, dropMmX: number, dropMmY: number) => void;
  handleMovePageToSheet: (sourceSheetIdx: number, sourceSlotIdx: number, targetSheetIdx: number) => void;
  handleSwapSlots: (src: number, dst: number) => void;
  handleSwapDataPages: (srcSheet: number, srcSlot: number, dstSheet: number, dstSlot: number) => void;
  getPageForSlot: (slotIdx: number, sheetIdx: number) => number;
  calculateSlotTotalRotation: (it: PlanItem, page: PageItem | null | undefined, isBack: boolean) => number;
  hasLastSheetBlanks: boolean;
  lastSheetBlankCount: number;
  isRightSidebarCollapsed: boolean;
  toggleRightSidebar: () => void;
}

export const ImpositionCanvasView: React.FC<ImpositionCanvasViewProps> = ({
  containerRef,
  canvasPan,
  setCanvasPan,
  canvasZoom,
  setCanvasZoom,
  isPanning,
  setIsPanning,
  panStartRef,
  panOffsetRef,
  currentPlan,
  styledPlan,
  impositionStyleEnabled,
  totalSheets,
  currentSheetIndex,
  setCurrentSheetIndex,
  config,
  setConfig,
  scale,
  isMultiShape,
  shapeTabs,
  activeTab,
  allPages,
  customSvgData,
  vectorMaskResult,
  previewSide,
  setPreviewSide,
  serverPreviewUrl,
  isLoadingServerPreview,
  dragOverSheetIdx,
  setDragOverSheetIdx,
  draggedSlotIdx,
  setDraggedSlotIdx,
  dragOverSlotIdx,
  setDragOverSlotIdx,
  setDraggedItemData,
  handleMoveItemToSheet,
  handleMovePageToSheet,
  handleSwapSlots,
  handleSwapDataPages,
  getPageForSlot,
  calculateSlotTotalRotation,
  hasLastSheetBlanks,
  lastSheetBlankCount,
  isRightSidebarCollapsed,
  toggleRightSidebar
}) => {
  const allPlanItems = impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []);

  return (
    <main
      ref={containerRef as any}
      className="flex-1 flex items-center justify-center p-4 overflow-hidden min-w-0 bg-gray-100 relative select-none"
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={(e) => {
        if (e.button === 1 || (e.button === 0 && (e.altKey || e.target === containerRef.current))) {
          e.preventDefault();
          setIsPanning(true);
          panStartRef.current = { x: e.clientX, y: e.clientY };
          panOffsetRef.current = { ...canvasPan };
        }
      }}
      onMouseMove={(e) => {
        if (isPanning) {
          const dx = e.clientX - panStartRef.current.x;
          const dy = e.clientY - panStartRef.current.y;
          setCanvasPan({
            x: Math.round(panOffsetRef.current.x + dx),
            y: Math.round(panOffsetRef.current.y + dy),
          });
        }
      }}
      onMouseUp={(e) => {
        if (e.button === 1 || isPanning) {
          setIsPanning(false);
        }
      }}
      onMouseLeave={() => setIsPanning(false)}
      onDoubleClick={(e) => {
        if (e.target === containerRef.current) {
          setCanvasZoom(1);
          setCanvasPan({ x: 0, y: 0 });
        }
      }}
    >
      {/* Floating Zoom / Pan Toolbar on Main Canvas */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-lg border border-slate-200/90 text-xs text-slate-700 select-none">
        <button
          type="button"
          onClick={() => setCanvasZoom(prev => Math.max(0.1, Math.round(prev * 0.85 * 100) / 100))}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
          title="Thu nhỏ"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); }}
          className="px-2 py-0.5 rounded-lg hover:bg-violet-50 hover:text-violet-700 text-violet-800 font-medium text-xs transition cursor-pointer"
          title="Click đặt lại 100%"
        >
          {Math.round(canvasZoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setCanvasZoom(prev => Math.min(10, Math.round(prev * 1.15 * 100) / 100))}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
          title="Phóng to"
        >
          +
        </button>
        <div className="w-px h-4 bg-slate-300 mx-0.5" />
        <button
          type="button"
          onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); }}
          className="px-1.5 py-0.5 rounded-lg hover:bg-slate-100 text-slate-600 text-[10px] font-medium transition cursor-pointer"
          title="Đặt lại (Reset Zoom & Pan)"
        >
          Reset
        </button>
      </div>

      {currentPlan ? (
        <div
          style={{
            transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.05s ease-out',
          }}
        >
          <div
            className="grid gap-12 items-start justify-center p-8"
            style={{
              gridTemplateColumns: `repeat(${Math.min(totalSheets, 20)}, ${config.pageW * scale}px)`,
              width: 'max-content',
            }}
          >
            {Array.from({ length: totalSheets }, (_, sIdx) => {
              const isCurrentActiveSheet = currentSheetIndex === sIdx;
              const sheetItems = isMultiShape
                ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === sIdx)
                : allPlanItems;

              return (
                <div key={`sheet-card-${sIdx}`} className="flex flex-col items-center">
                  <div className="w-full flex items-center justify-between px-1 mb-2 select-none">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentSheetIndex(sIdx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          isCurrentActiveSheet
                            ? 'bg-violet-600 text-white shadow-violet-200 ring-2 ring-violet-400'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <span>Tờ {sIdx + 1}</span>
                        {totalSheets > 1 && <span className="opacity-70 font-normal text-[10px]">/ {totalSheets}</span>}
                      </button>
                      <span className="text-[10px] text-slate-500 font-medium bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {isMultiShape ? `${sheetItems.length} tem` : `${sheetItems.length} vị trí`}
                      </span>
                    </div>
                    {isCurrentActiveSheet && totalSheets > 1 && (
                      <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 flex items-center gap-1">
                        <Check size={11} /> Đang chọn
                      </span>
                    )}
                  </div>

                  {/* Sheet Body Container with Drag & Drop Zone */}
                  <div
                    onClick={() => setCurrentSheetIndex(sIdx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverSheetIdx !== sIdx) setDragOverSheetIdx(sIdx);
                    }}
                    onDragLeave={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                        if (dragOverSheetIdx === sIdx) setDragOverSheetIdx(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverSheetIdx(null);
                      setDraggedSlotIdx(null);
                      setDragOverSlotIdx(null);
                      setDraggedItemData(null);

                      let dragData: any = null;
                      try {
                        const json = e.dataTransfer.getData('application/json');
                        if (json) dragData = JSON.parse(json);
                      } catch (_) {}

                      const sourceGlobalIdx = dragData ? dragData.sourceGlobalIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (isNaN(sourceGlobalIdx)) return;

                      const rect = e.currentTarget.getBoundingClientRect();
                      const dropPxX = (e.clientX - rect.left) / canvasZoom;
                      const dropPxY = (e.clientY - rect.top) / canvasZoom;
                      const dropMmX = dropPxX / scale;
                      const dropMmY = dropPxY / scale;

                      if (isMultiShape) {
                        handleMoveItemToSheet(sourceGlobalIdx, sIdx, dropMmX, dropMmY);
                      } else if (dragData && dragData.sourceSheetIdx !== sIdx) {
                        handleMovePageToSheet(dragData.sourceSheetIdx, dragData.sourceSlotIdx, sIdx);
                      }
                    }}
                    className={`bg-white rounded-lg relative transition-all ${
                      isCurrentActiveSheet ? 'shadow-2xl ring-2 ring-violet-500/80' : 'shadow-md hover:shadow-xl border border-slate-200/80'
                    } ${dragOverSheetIdx === sIdx && draggedSlotIdx !== null ? 'ring-4 ring-indigo-500/90 shadow-2xl bg-indigo-50/20' : ''}`}
                    style={{ width: config.pageW * scale, height: config.pageH * scale }}
                  >
                    {dragOverSheetIdx === sIdx && draggedSlotIdx !== null && (
                      <div className="absolute inset-0 z-50 rounded-lg border-2 border-dashed border-indigo-500 bg-indigo-500/10 flex items-center justify-center pointer-events-none animate-fadeIn backdrop-blur-[1px]">
                        <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                          <Move size={13} />
                          <span>Thả vào Tờ {sIdx + 1}</span>
                        </div>
                      </div>
                    )}

                    {/* 4 Interactive Margin Input Badges */}
                    {(totalSheets === 1 || isCurrentActiveSheet) && (
                      <>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-600">Lề trên:</span>
                          <DebouncedNumberInput
                            min={0}
                            value={config.marginTop}
                            onChange={v => setConfig(c => ({ ...c, marginTop: v, useMargin: true }))}
                            className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-normal">mm</span>
                        </div>

                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-600">Lề dưới:</span>
                          <DebouncedNumberInput
                            min={0}
                            value={config.marginBot}
                            onChange={v => setConfig(c => ({ ...c, marginBot: v, useMargin: true }))}
                            className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-normal">mm</span>
                        </div>

                        <div className="absolute top-1/2 -left-4 -translate-x-full -translate-y-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-600">Lề trái:</span>
                          <DebouncedNumberInput
                            min={0}
                            value={config.marginLeft}
                            onChange={v => setConfig(c => ({ ...c, marginLeft: v, useMargin: true }))}
                            className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-normal">mm</span>
                        </div>

                        <div className="absolute top-1/2 -right-4 translate-x-full -translate-y-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-600">Lề phải:</span>
                          <DebouncedNumberInput
                            min={0}
                            value={config.marginRight}
                            onChange={v => setConfig(c => ({ ...c, marginRight: v, useMargin: true }))}
                            className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-normal">mm</span>
                        </div>
                      </>
                    )}

                    {isCurrentActiveSheet && serverPreviewUrl && (
                      <img src={serverPreviewUrl} alt="Server preview" className="absolute inset-0 w-full h-full rounded-lg object-contain pointer-events-none z-10 opacity-90" />
                    )}
                    {isCurrentActiveSheet && isLoadingServerPreview && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-black/60 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 backdrop-blur-xs">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang tải preview...
                        </div>
                      </div>
                    )}

                    {/* Print area border */}
                    {(config.usePrintArea || config.useMargin) && (() => {
                      let areaW = config.pageW;
                      let areaH = config.pageH;
                      let areaX = 0;
                      let areaY = 0;
                      if (config.usePrintArea) {
                        areaW = config.printAreaW;
                        areaH = config.printAreaH;
                        areaX = (config.pageW - config.printAreaW) / 2;
                        areaY = (config.pageH - config.printAreaH) / 2;
                      } else if (config.useMargin) {
                        areaW = config.pageW - config.marginLeft - config.marginRight;
                        areaH = config.pageH - config.marginTop - config.marginBot;
                        areaX = config.marginLeft;
                        areaY = config.marginTop;
                      }
                      const w = areaW * scale, h = areaH * scale;
                      const gap = 0.3;
                      const startPct = gap, endPct = 1 - gap;
                      return (
                        <svg className="absolute pointer-events-none" style={{ left: areaX * scale, top: areaY * scale, width: w, height: h }}>
                          <line x1={w * startPct} y1={0} x2={w * endPct} y2={0} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                          <line x1={w * startPct} y1={h} x2={w * endPct} y2={h} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                          <line x1={0} y1={h * startPct} x2={0} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                          <line x1={w} y1={h * startPct} x2={w} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                        </svg>
                      );
                    })()}

                    {/* Render Sheet Items */}
                    {sheetItems.map((it, i) => (
                      <ImpositionCanvasSlotItem
                        key={`slot-${sIdx}-${i}`}
                        it={it}
                        i={i}
                        sIdx={sIdx}
                        sheetItemsLength={sheetItems.length}
                        allPlanItems={allPlanItems}
                        isMultiShape={isMultiShape}
                        shapeTabs={shapeTabs}
                        activeTab={activeTab}
                        allPages={allPages}
                        config={config}
                        scale={scale}
                        customSvgData={customSvgData}
                        vectorMaskResult={vectorMaskResult}
                        previewSide={previewSide}
                        draggedSlotIdx={draggedSlotIdx}
                        dragOverSlotIdx={dragOverSlotIdx}
                        setDraggedSlotIdx={setDraggedSlotIdx}
                        setDragOverSlotIdx={setDragOverSlotIdx}
                        setDragOverSheetIdx={setDragOverSheetIdx}
                        setDraggedItemData={setDraggedItemData}
                        handleSwapSlots={handleSwapSlots}
                        handleSwapDataPages={handleSwapDataPages}
                        getPageForSlot={getPageForSlot}
                        calculateSlotTotalRotation={calculateSlotTotalRotation}
                      />
                    ))}

                    {/* Crop Marks */}
                    {config.useCrop && (
                      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${config.pageW} ${config.pageH}`} preserveAspectRatio="none">
                        <path fill="none" stroke={config.cropColor} strokeWidth={config.cropThick} d={generateItemCropMarksPath(sheetItems, config, previewSide === 'back')} />
                      </svg>
                    )}

                    {/* Page Crop Marks */}
                    {config.usePageCrop && (
                      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${config.pageW} ${config.pageH}`} preserveAspectRatio="none">
                        <path fill="none" stroke={config.pageCropColor} strokeWidth={config.pageCropThick} d={generatePageCropMarksPath(config.pageW, config.pageH, config.pageCropLen, config.pageCropDist)} />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-center"><LayoutGrid size={48} className="mx-auto mb-3 opacity-40" /><p className="text-base">Không có phương án phù hợp</p></div>
      )}

      {/* 2-Sided Toggle & Bottom Floating Control Dock */}
      <ImpositionCanvasDock
        currentPlan={currentPlan}
        config={config}
        setConfig={setConfig}
        previewSide={previewSide}
        setPreviewSide={setPreviewSide}
        allPages={allPages}
        totalSheets={totalSheets}
        currentSheetIndex={currentSheetIndex}
        setCurrentSheetIndex={setCurrentSheetIndex}
      />

      {/* Floating Arrow Toggle Button for Right Sidebar */}
      <button
        type="button"
        onClick={toggleRightSidebar}
        className={`fixed z-50 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out w-5 hover:w-6.5 h-14 bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-slate-300 border-r-0 rounded-l-xl shadow-xs hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer group select-none ${
          isRightSidebarCollapsed ? "right-0" : "right-[350px] -mr-px"
        }`}
        title={isRightSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
      >
        {isRightSidebarCollapsed ? (
          <ChevronLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
        ) : (
          <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
        )}
      </button>
    </main>
  );
};
