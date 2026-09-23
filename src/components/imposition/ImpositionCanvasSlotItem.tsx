import React from 'react';
import { PlanItem } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';

export interface ImpositionCanvasSlotItemProps {
  it: PlanItem;
  i: number;
  sIdx: number;
  sheetItemsLength: number;
  allPlanItems: PlanItem[];
  isMultiShape: boolean;
  shapeTabs: ShapeTabItem[];
  activeTab: ShapeTabItem;
  allPages: PageItem[];
  config: ImpositionConfig;
  scale: number;
  customSvgData: string;
  vectorMaskResult: VectorMaskResult | null;
  previewSide: 'front' | 'back';
  draggedSlotIdx: number | null;
  dragOverSlotIdx: number | null;
  setDraggedSlotIdx: (idx: number | null) => void;
  setDragOverSlotIdx: (idx: number | null) => void;
  setDragOverSheetIdx: (idx: number | null) => void;
  setDraggedItemData: (data: any) => void;
  handleSwapSlots: (src: number, dst: number) => void;
  handleSwapDataPages: (srcSheet: number, srcSlot: number, dstSheet: number, dstSlot: number) => void;
  getPageForSlot: (slotIdx: number, sheetIdx: number) => number;
  calculateSlotTotalRotation: (it: PlanItem, page: PageItem | null | undefined, isBack: boolean) => number;
}

export const ImpositionCanvasSlotItem: React.FC<ImpositionCanvasSlotItemProps> = ({
  it,
  i,
  sIdx,
  sheetItemsLength,
  allPlanItems,
  isMultiShape,
  shapeTabs,
  activeTab,
  allPages,
  config,
  scale,
  customSvgData,
  vectorMaskResult,
  previewSide,
  draggedSlotIdx,
  dragOverSlotIdx,
  setDraggedSlotIdx,
  setDragOverSlotIdx,
  setDragOverSheetIdx,
  setDraggedItemData,
  handleSwapSlots,
  handleSwapDataPages,
  getPageForSlot,
  calculateSlotTotalRotation
}) => {
  const itemGlobalIdx = isMultiShape ? allPlanItems.indexOf(it) : (sIdx * sheetItemsLength + i);
  const itemShape = (it.shape || config.shape) as string;
  const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
  const itemCornerRadius = it.cornerRadius !== undefined ? it.cornerRadius : config.cornerRadius;
  const itemColor = it.color || '#8b5cf6';
  const itemCustomSvg = it.customSvgData || (itemShape === 'custom-svg' ? customSvgData : '');
  const itW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
  const itH = itemShape === 'circle' ? itW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));
  const actualW = itW;
  const actualH = itH;

  const isBackSide = config.is2Sided && previewSide === 'back';
  const itemX = isBackSide ? (config.pageW - it.x - actualW) : it.x;

  const pageIdx = getPageForSlot(i, sIdx);
  const page = pageIdx >= 0 ? allPages[pageIdx] : null;
  const correspondingTab = isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName) : null;
  const previewSrc = (it.sourceImage as any)?.thumb ||
    (typeof it.sourceImage === 'string' ? it.sourceImage : null) ||
    (correspondingTab?.sourceImage as any)?.thumb ||
    (typeof correspondingTab?.sourceImage === 'string' ? correspondingTab?.sourceImage : null) ||
    (activeTab?.sourceImage as any)?.thumb ||
    (page ? page.thumb : (allPages.length > 0 ? allPages[i % allPages.length]?.thumb : null));

  const totalRotation = calculateSlotTotalRotation(it, page, isBackSide);
  const imgTransform = totalRotation !== 0 ? `rotate(${totalRotation}deg)` : 'none';

  const getPreserveAspectRatio = () => {
    switch (config.fitMode) {
      case 'stretch': return 'none';
      case 'fill': return 'xMidYMid slice';
      case 'fit': return 'xMidYMid meet';
      case 'actual': return 'xMidYMid';
      default: return 'xMidYMid slice';
    }
  };

  const isDragged = draggedSlotIdx === itemGlobalIdx;
  const isDragOver = dragOverSlotIdx === itemGlobalIdx;

  const globalSlotIdx = isMultiShape ? itemGlobalIdx : (sIdx * sheetItemsLength + i);
  const isBlankSlot = !isMultiShape && config.useTotalLimit && config.totalOrder > 0 && globalSlotIdx >= config.totalOrder;
  if (isBlankSlot) return null;

  const layerName = it.tabName || correspondingTab?.name || activeTab?.name || 'A';
  const numberHandle = (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          const data = {
            sourceSheetIdx: sIdx,
            sourceSlotIdx: i,
            sourceGlobalIdx: itemGlobalIdx,
            isMultiShape,
          };
          e.dataTransfer.setData('application/json', JSON.stringify(data));
          e.dataTransfer.setData('text/plain', String(itemGlobalIdx));
          e.dataTransfer.effectAllowed = 'move';
          setDraggedSlotIdx(itemGlobalIdx);
          setDraggedItemData(data);
        }}
        onDragEnd={(e) => {
          e.stopPropagation();
          setDraggedSlotIdx(null);
          setDragOverSlotIdx(null);
          setDragOverSheetIdx(null);
          setDraggedItemData(null);
        }}
        className="pointer-events-auto min-w-6 h-6 px-2 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150 select-none cursor-grab active:cursor-grabbing bg-white/95 shadow-sm border hover:shadow-md hover:scale-125 active:scale-105 whitespace-nowrap gap-1"
        style={{ color: itemColor, borderColor: itemColor }}
        title={`Layer ${layerName} - Tờ ${sIdx + 1} - Vị trí ${globalSlotIdx + 1}`}
      >
        <span>{layerName}</span>
        <span className="opacity-80 font-mono text-[9px]">#{globalSlotIdx + 1}</span>
      </div>
    </div>
  );

  const displayPageIndex = (!isMultiShape && (config.shape === 'pdf-source' || allPages.length > 1))
    ? (page && typeof page.pageIndex === 'number' ? page.pageIndex + 1 : ((allPages.length > 0) ? (i % allPages.length) + 1 : null))
    : null;
  const pageOverlay = displayPageIndex !== null ? (
    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded backdrop-blur-xs font-mono pointer-events-none">
      P{displayPageIndex}
    </div>
  ) : null;

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      const data = { sourceSheetIdx: sIdx, sourceSlotIdx: i, sourceGlobalIdx: itemGlobalIdx, isMultiShape };
      e.dataTransfer.setData('application/json', JSON.stringify(data));
      e.dataTransfer.setData('text/plain', String(itemGlobalIdx));
      e.dataTransfer.effectAllowed = 'move';
      setDraggedSlotIdx(itemGlobalIdx);
      setDraggedItemData(data);
    },
    onDragEnd: (e: React.DragEvent) => {
      e.stopPropagation();
      setDraggedSlotIdx(null);
      setDragOverSlotIdx(null);
      setDragOverSheetIdx(null);
      setDraggedItemData(null);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverSlotIdx !== itemGlobalIdx) setDragOverSlotIdx(itemGlobalIdx);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverSlotIdx === itemGlobalIdx) setDragOverSlotIdx(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverSlotIdx(null);
      setDragOverSheetIdx(null);
      setDraggedSlotIdx(null);
      setDraggedItemData(null);

      let dragData: any = null;
      try {
        const json = e.dataTransfer.getData('application/json');
        if (json) dragData = JSON.parse(json);
      } catch (_) {}

      const sourceGlobalIdx = dragData ? dragData.sourceGlobalIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
      const sourceSheetIdx = dragData ? dragData.sourceSheetIdx : sIdx;
      const sourceSlotIdx = dragData ? dragData.sourceSlotIdx : 0;

      if (!isNaN(sourceGlobalIdx) && sourceGlobalIdx !== itemGlobalIdx) {
        if (isMultiShape) {
          handleSwapSlots(sourceGlobalIdx, itemGlobalIdx);
        } else {
          handleSwapDataPages(sourceSheetIdx, sourceSlotIdx, sIdx, i);
        }
      }
    },
  };

  // Custom SVG / Vector mask
  if (itemShape === 'custom-svg' && itemCustomSvg) {
    const w = actualW * scale;
    const h = actualH * scale;
    const svgMatch = itemCustomSvg.match(/viewBox=["']([^"']+)["']/);
    const vb = svgMatch ? svgMatch[1] : `0 0 ${itW} ${itH}`;
    const vbParts = vb.trim().split(/[\s,]+/).map(Number);
    const vbMinX = isNaN(vbParts[0]) ? 0 : vbParts[0];
    const vbMinY = isNaN(vbParts[1]) ? 0 : vbParts[1];
    const vbW = isNaN(vbParts[2]) || vbParts[2] <= 0 ? itW : vbParts[2];
    const vbH = isNaN(vbParts[3]) || vbParts[3] <= 0 ? itH : vbParts[3];

    const innerMatch = itemCustomSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    const innerSvg = innerMatch ? innerMatch[1] : '';
    const pathMatch = itemCustomSvg.match(/<path[^>]*\bd=["']([^"']+)["']/i);
    const pathD = it.vectorMaskResult?.pathData || correspondingTab?.vectorMaskResult?.pathData || vectorMaskResult?.pathData || (pathMatch ? pathMatch[1] : '');
    const clipId = `svg-shape-${sIdx}-${i}-${itemGlobalIdx}`;

    return (
      <div
        key={`slot-${sIdx}-${i}`}
        className="absolute group/slot"
        style={{
          left: itemX * scale,
          top: it.y * scale,
          width: w,
          height: h,
          zIndex: isDragged ? 40 : (isDragOver ? 30 : 10),
          opacity: isDragged ? 0.4 : 1,
          transition: 'opacity 0.15s ease',
        }}
        {...dragProps}
      >
        <div
          className="w-full h-full relative pointer-events-none"
          style={{
            transform: isDragOver ? 'translate(8px, -8px) scale(0.93)' : 'none',
            opacity: isDragOver ? 0.75 : 1,
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
          }}
        >
          <svg viewBox={vb} width="100%" height="100%" className="absolute inset-0 w-full h-full overflow-visible" style={{ transform: totalRotation !== 0 ? `rotate(${totalRotation}deg)` : undefined, transformOrigin: 'center center' }}>
            <defs>
              {previewSrc && (
                <pattern id={`pat-${clipId}`} patternUnits="userSpaceOnUse" x={vbMinX} y={vbMinY} width={vbW} height={vbH}>
                  <image href={previewSrc} xlinkHref={previewSrc} x={vbMinX} y={vbMinY} width={vbW} height={vbH} preserveAspectRatio={getPreserveAspectRatio()} />
                </pattern>
              )}
              <clipPath id={clipId}>
                {pathD ? <path d={pathD} fill="#000000" /> : <g dangerouslySetInnerHTML={{ __html: innerSvg.replace(/fill=["']none["']/gi, 'fill="#000000"') }} />}
              </clipPath>
            </defs>

            {previewSrc ? (
              pathD ? <path d={pathD} fill={`url(#pat-${clipId})`} /> : <g fill={`url(#pat-${clipId})`} dangerouslySetInnerHTML={{ __html: innerSvg.replace(/fill=["']none["']/gi, `fill="url(#pat-${clipId})"`) }} />
            ) : (
              pathD ? <path d={pathD} fill={`${itemColor}25`} /> : <g fill={`${itemColor}25`} dangerouslySetInnerHTML={{ __html: innerSvg.replace(/fill=["']none["']/gi, `fill="${itemColor}25"`) }} />
            )}

            {pathD ? (
              <path d={pathD} fill="none" stroke={itemColor} strokeWidth={Math.max(0.4, Math.min(vbW, vbH) * 0.008)} />
            ) : (
              <g fill="none" stroke={itemColor} strokeWidth="0.8" dangerouslySetInnerHTML={{ __html: innerSvg }} />
            )}
          </svg>
          {numberHandle}
          {pageOverlay}
        </div>
      </div>
    );
  }

  // Special shapes: trapezoid, triangle, hexagon
  if (isSpecialShape) {
    const w = actualW * scale;
    const h = actualH * scale;
    const r = itemCornerRadius > 0 ? Math.min(itemCornerRadius * scale, w / 4, h / 4) : 0;

    const roundedPath = (points: [number, number][]) => {
      if (r <= 0 || points.length < 3) {
        return 'M ' + points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ') + ' Z';
      }
      let d = '';
      for (let j = 0; j < points.length; j++) {
        const p0 = points[(j - 1 + points.length) % points.length];
        const p1 = points[j];
        const p2 = points[(j + 1) % points.length];
        const v1 = [p0[0] - p1[0], p0[1] - p1[1]];
        const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
        const len1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
        const len2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
        const actualR = Math.min(r, len1 / 2, len2 / 2);
        const start = [p1[0] + (v1[0] / len1) * actualR, p1[1] + (v1[1] / len1) * actualR];
        const end = [p1[0] + (v2[0] / len2) * actualR, p1[1] + (v2[1] / len2) * actualR];
        if (j === 0) d = `M ${start[0].toFixed(1)},${start[1].toFixed(1)}`;
        else d += ` L ${start[0].toFixed(1)},${start[1].toFixed(1)}`;
        d += ` Q ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${end[0].toFixed(1)},${end[1].toFixed(1)}`;
      }
      return d + ' Z';
    };

    let points: [number, number][] = [];
    if (itemShape === 'trapezoid') {
      const offset = w * 0.15;
      points = [[offset, 0], [w - offset, 0], [w, h], [0, h]];
    } else if (itemShape === 'triangle') {
      points = [[w / 2, 0], [w, h], [0, h]];
    } else if (itemShape === 'hexagon') {
      const y25 = h * 0.25, y75 = h * 0.75;
      points = [[w / 2, 0], [w, y25], [w, y75], [w / 2, h], [0, y75], [0, y25]];
    }

    const pathD = roundedPath(points);
    const clipId = `cp-${sIdx}-${i}`;

    return (
      <div
        key={`slot-${sIdx}-${i}`}
        className="absolute group/slot"
        style={{
          left: itemX * scale,
          top: it.y * scale,
          width: w,
          height: h,
          zIndex: isDragged ? 40 : (isDragOver ? 30 : 10),
          opacity: isDragged ? 0.4 : 1,
          transition: 'opacity 0.15s ease',
        }}
        {...dragProps}
      >
        <div
          className="w-full h-full relative pointer-events-none"
          style={{
            transform: isDragOver ? 'translate(8px, -8px) scale(0.93)' : 'none',
            opacity: isDragOver ? 0.75 : 1,
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
          }}
        >
          <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible', transform: (it.rot) ? 'rotate(180deg)' : 'none' }}>
            <defs>
              <clipPath id={clipId}><path d={pathD} /></clipPath>
            </defs>
            {previewSrc ? (
              <image href={previewSrc} width={w} height={h} clipPath={`url(#${clipId})`} preserveAspectRatio={getPreserveAspectRatio()} />
            ) : (
              <path d={pathD} fill={`${itemColor}25`} />
            )}
            <path d={pathD} fill="none" stroke={itemColor} strokeWidth="1" shapeRendering="geometricPrecision" />
          </svg>
          {numberHandle}
          {pageOverlay}
        </div>
      </div>
    );
  }

  // Standard item: rect, circle, oval
  const clipPath = itemCornerRadius > 0 ? 'none' : 'none';
  const borderRadius = itemShape === 'circle' || itemShape === 'oval' ? '50%' : (itemCornerRadius > 0 ? Math.max(2, itemCornerRadius * scale) + 'px' : '2px');

  return (
    <div
      key={`slot-${sIdx}-${i}-${totalRotation}`}
      className="absolute group/slot"
      style={{
        left: itemX * scale,
        top: it.y * scale,
        width: actualW * scale,
        height: actualH * scale,
        zIndex: isDragged ? 40 : (isDragOver ? 30 : 10),
        opacity: isDragged ? 0.4 : 1,
        transition: 'opacity 0.15s ease',
      }}
      {...dragProps}
    >
      <div
        className="w-full h-full relative pointer-events-none"
        style={{
          transform: isDragOver ? 'translate(8px, -8px) scale(0.93)' : 'none',
          opacity: isDragOver ? 0.75 : 1,
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
        }}
      >
        <div className="absolute inset-0 w-full h-full" style={{
          borderRadius,
          border: `1px solid ${itemColor}`,
          clipPath: clipPath !== 'none' ? clipPath : undefined,
          backgroundColor: previewSrc ? 'transparent' : `${itemColor}25`,
          overflow: 'hidden'
        }}>
          {previewSrc && (() => {
            const isRotated90 = (totalRotation % 180) !== 0;
            const containerW = actualW * scale;
            const containerH = actualH * scale;

            if (config.fitMode === 'actual') {
              return (
                <img
                  src={previewSrc}
                  alt=""
                  className="object-none"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) ${imgTransform !== 'none' ? imgTransform : ''}`.trim(),
                    borderRadius,
                  }}
                />
              );
            }

            if (isRotated90) {
              const imgStyle: React.CSSProperties = {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) ${imgTransform}`,
                transformOrigin: 'center center',
                borderRadius,
                width: `${containerH}px`,
                height: `${containerW}px`,
                minWidth: `${containerH}px`,
                minHeight: `${containerW}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: config.fitMode === 'stretch' ? 'fill' : config.fitMode === 'fill' ? 'cover' : 'contain',
              };
              return <img src={previewSrc} alt="" style={imgStyle} />;
            }

            const objectFitValue = config.fitMode === 'stretch' ? 'fill' : config.fitMode === 'fill' ? 'cover' : config.fitMode === 'fit' ? 'contain' : 'none';
            return (
              <img
                src={previewSrc}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${containerW}px`,
                  height: `${containerH}px`,
                  minWidth: `${containerW}px`,
                  minHeight: `${containerH}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: objectFitValue,
                  borderRadius,
                  transform: imgTransform,
                  transformOrigin: 'center center'
                }}
              />
            );
          })()}
        </div>
        {numberHandle}
        {pageOverlay}
      </div>

      {isDragOver && (
        <div
          className="absolute inset-0 pointer-events-none z-30 animate-pulse"
          style={{
            borderRadius,
            border: '2.5px solid #ef4444',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.7), inset 0 0 10px rgba(239, 68, 68, 0.3)',
          }}
        />
      )}
    </div>
  );
};
