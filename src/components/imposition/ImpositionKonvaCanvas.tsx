import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Group, Image as KonvaImage, Rect, Text, Path } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { LayoutPlan, PlanItem } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { useSheetBitmap, SheetBitmapParams } from './useSheetBitmap';
import { generateItemCropMarksPath, generatePageCropMarksPath, CMYK_COLOR_BAR_COLORS } from './marksRenderer';
import { getSlotPageIndex } from './impositionGeometry';
import { DebouncedNumberInput } from '../common/DebouncedNumberInput';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImpositionCanvasDock } from './ImpositionCanvasDock';

// react-konva v19 + React 19: Stage ref typing incompatible — use any alias
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KonvaStage = Stage as React.ComponentType<any>;

// ─── KonvaColorBar (CMYK Color Bar nguyên bản ToolX) ──────────────────────────
interface KonvaColorBarProps {
  pageW: number;
  pageH: number;
  position: 'top' | 'bottom' | 'left' | 'right' | 'all';
  padding: number;
  scale: number;
}

const KonvaColorBar: React.FC<KonvaColorBarProps> = ({ pageW, pageH, position, padding, scale }) => {
  const positions = useMemo(() => {
    return position === 'all'
      ? (['top', 'bottom', 'left', 'right'] as const)
      : [position];
  }, [position]);

  const pW = pageW;
  const pH = pageH;
  const pad = padding;
  const thick = 3;

  return (
    <Group listening={false}>
      {positions.map(pos => {
        const isH = pos === 'top' || pos === 'bottom';
        const barLen = isH ? pW * 0.6 : pH * 0.6;
        const segW = barLen / CMYK_COLOR_BAR_COLORS.length;
        let sx: number, sy: number;
        if (pos === 'bottom') { sx = (pW - barLen) / 2; sy = pH - pad - thick; }
        else if (pos === 'top') { sx = (pW - barLen) / 2; sy = pad; }
        else if (pos === 'left') { sx = pad; sy = (pH - barLen) / 2; }
        else { sx = pW - pad - thick; sy = (pH - barLen) / 2; }

        return (
          <Group key={pos}>
            {CMYK_COLOR_BAR_COLORS.map((c, i) => {
              const rx = (isH ? sx + i * segW : sx) * scale;
              const ry = (isH ? sy : sy + i * segW) * scale;
              const rw = (isH ? segW : thick) * scale;
              const rh = (isH ? thick : segW) * scale;
              return (
                <Rect
                  key={`${pos}-${i}`}
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={c}
                  stroke="#999999"
                  strokeWidth={Math.max(0.5, 0.15 * scale)}
                  listening={false}
                />
              );
            })}
          </Group>
        );
      })}
    </Group>
  );
};

// ─── KonvaSheetGroup ──────────────────────────────────────────────────────────
interface KonvaSheetGroupProps {
  sIdx: number;
  sheetItems: PlanItem[];
  allPlanItems: PlanItem[];
  config: ImpositionConfig;
  shapeTabs: ShapeTabItem[];
  activeTab: ShapeTabItem;
  allPages: PageItem[];
  scale: number;
  previewSide: 'front' | 'back';
  isMultiShape: boolean;
  customSvgData: string;
  vectorMaskResult: VectorMaskResult | null;
  isActive: boolean;
  onClick: () => void;
  x: number; // position in stage coords
  y: number;
  serverPreviewUrl?: string | null;
}

const KonvaSheetGroup = React.memo<KonvaSheetGroupProps>(({
  sIdx, sheetItems, allPlanItems, config, shapeTabs, activeTab,
  allPages, scale, previewSide, isMultiShape, customSvgData,
  vectorMaskResult, isActive, onClick, x, y, serverPreviewUrl,
}) => {
  const bitmapParams: SheetBitmapParams = {
    sIdx, sheetItems, config, shapeTabs, activeTab,
    allPages, scale, previewSide, isMultiShape,
    customSvgData, vectorMaskResult,
  };

  const { canvas, isLoading } = useSheetBitmap(bitmapParams);

  const W = config.pageW * scale;
  const H = config.pageH * scale;

  // Server preview image (optional overlay)
  const [serverImg, setServerImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!serverPreviewUrl || !isActive) { setServerImg(null); return; }
    const img = new Image();
    img.onload = () => setServerImg(img);
    img.onerror = () => setServerImg(null);
    img.src = serverPreviewUrl;
  }, [serverPreviewUrl, isActive]);

  // Crop marks SVG path → Konva Path
  const cropPath = config.useCrop
    ? generateItemCropMarksPath(sheetItems, config, previewSide === 'back')
    : '';
  const pageCropPath = config.usePageCrop
    ? generatePageCropMarksPath(config.pageW, config.pageH, config.pageCropLen, config.pageCropDist)
    : '';

  // Print area indicator
  let areaX = 0, areaY = 0, areaW = W, areaH = H;
  if (config.usePrintArea) {
    areaW = config.printAreaW * scale;
    areaH = config.printAreaH * scale;
    areaX = (W - areaW) / 2;
    areaY = (H - areaH) / 2;
  } else if (config.useMargin) {
    areaX = config.marginLeft * scale;
    areaY = config.marginTop * scale;
    areaW = (config.pageW - config.marginLeft - config.marginRight) * scale;
    areaH = (config.pageH - config.marginTop - config.marginBot) * scale;
  }
  const showPrintArea = config.usePrintArea || config.useMargin;

  return (
    <Group x={x} y={y} onClick={onClick}>
      {/* White sheet background */}
      <Rect
        width={W}
        height={H}
        fill="white"
        shadowColor="rgba(0,0,0,0.18)"
        shadowBlur={isActive ? 20 : 10}
        shadowOffsetY={isActive ? 4 : 2}
        cornerRadius={4}
      />

      {/* Bitmap layer — all slots rendered as one image */}
      {canvas && (
        <KonvaImage
          image={canvas}
          width={W}
          height={H}
          cornerRadius={4}
        />
      )}

      {/* Loading indicator */}
      {isLoading && !canvas && (
        <>
          <Rect width={W} height={H} fill="#f8f8f8" cornerRadius={4} />
          <Text
            text="Đang render..."
            x={0} y={H / 2 - 8}
            width={W}
            align="center"
            fontSize={12}
            fill="#aaa"
          />
        </>
      )}

      {/* Server preview overlay (high-res) */}
      {serverImg && (
        <KonvaImage image={serverImg} width={W} height={H} opacity={0.9} cornerRadius={4} />
      )}

      {/* Print area dashed border */}
      {showPrintArea && (
        <Rect
          x={areaX} y={areaY}
          width={areaW} height={areaH}
          stroke="#fda4af"
          strokeWidth={1}
          dash={[4, 2]}
          fill="transparent"
          listening={false}
        />
      )}

      {/* Crop marks (vector) */}
      {cropPath && (
        <Path
          data={cropPath}
          stroke={config.cropColor}
          strokeWidth={Math.max(1.2 / scale, config.cropThick)}
          fill="transparent"
          scaleX={scale}
          scaleY={scale}
          listening={false}
        />
      )}

      {/* Page crop marks (vector) */}
      {pageCropPath && (
        <Path
          data={pageCropPath}
          stroke={config.pageCropColor}
          strokeWidth={Math.max(1.5 / scale, config.pageCropThick)}
          fill="transparent"
          scaleX={scale}
          scaleY={scale}
          listening={false}
        />
      )}

      {/* CMYK Prepress Color Bar (Dải màu) */}
      {config.useColorBar && (
        <KonvaColorBar
          pageW={config.pageW}
          pageH={config.pageH}
          position={config.colorBarPosition || 'bottom'}
          padding={config.colorBarPadding ?? 3}
          scale={scale}
        />
      )}

      {/* Selection border */}
      <Rect
        width={W}
        height={H}
        stroke={isActive ? '#7c3aed' : '#e2e8f0'}
        strokeWidth={isActive ? 2.5 : 1}
        fill="transparent"
        cornerRadius={4}
        listening={false}
      />
    </Group>
  );
}, (prev: KonvaSheetGroupProps, next: KonvaSheetGroupProps) => (
  // Return true = "same" = skip re-render.
  // activeTab deliberately omitted: switching selected tab doesn't change bitmap content.
  prev.sIdx === next.sIdx &&
  prev.isActive === next.isActive &&
  prev.x === next.x &&
  prev.y === next.y &&
  prev.scale === next.scale &&
  prev.previewSide === next.previewSide &&
  prev.serverPreviewUrl === next.serverPreviewUrl &&
  prev.sheetItems === next.sheetItems &&
  prev.allPlanItems === next.allPlanItems &&
  prev.config === next.config &&
  prev.shapeTabs === next.shapeTabs &&
  prev.allPages === next.allPages &&
  prev.isMultiShape === next.isMultiShape &&
  prev.customSvgData === next.customSvgData &&
  prev.vectorMaskResult === next.vectorMaskResult &&
  prev.onClick === next.onClick
));

export interface ImpositionKonvaCanvasProps {
  containerRef: React.RefObject<HTMLElement | null>;
  currentPlan: LayoutPlan | null;
  styledPlan?: LayoutPlan | null;
  impositionStyleEnabled: boolean;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  scale: number;
  shapeTabs: ShapeTabItem[];
  activeTab: ShapeTabItem;
  allPages: PageItem[];
  previewSide: 'front' | 'back';
  setPreviewSide?: (side: 'front' | 'back') => void;
  isMultiShape: boolean;
  customSvgData: string;
  vectorMaskResult: VectorMaskResult | null;
  currentSheetIndex: number;
  setCurrentSheetIndex: React.Dispatch<React.SetStateAction<number>> | ((i: number | ((prev: number) => number)) => void);
  totalSheets: number;
  hasLastSheetBlanks: boolean;
  lastSheetBlankCount: number;
  serverPreviewUrl?: string | null;
  isLoadingServerPreview?: boolean;
  isRecalculating?: boolean;
  isRightSidebarCollapsed: boolean;
  toggleRightSidebar: () => void;
  onOpenCutDieline?: () => void;
}

const SHEET_GAP = 48; // px between sheets

export const ImpositionKonvaCanvas: React.FC<ImpositionKonvaCanvasProps> = ({
  containerRef, currentPlan, styledPlan, impositionStyleEnabled,
  config, setConfig, scale, shapeTabs, activeTab, allPages,
  previewSide, setPreviewSide = () => {}, isMultiShape, customSvgData, vectorMaskResult,
  currentSheetIndex, setCurrentSheetIndex, totalSheets,
  serverPreviewUrl, isLoadingServerPreview, isRecalculating = false,
  isRightSidebarCollapsed, toggleRightSidebar, onOpenCutDieline,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageRef = useRef<any>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ w: rect.width, h: rect.height });
      }
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [containerRef]);

  const allPlanItems = useMemo(() => {
    return (impositionStyleEnabled && styledPlan)
      ? styledPlan.items
      : (currentPlan?.items || []);
  }, [impositionStyleEnabled, styledPlan, currentPlan]);

  // ── Sheet deduplication ─────────────────────────────────────────────────────
  // Group sheets whose page content is completely identical.
  // Each entry = { sIdx: firstRealIndex, count: howManyRealSheetsItRepresents }
  const dedupedSheets = useMemo(() => {
    if (totalSheets <= 1) return [{ sIdx: 0, count: 1 }];

    if (isMultiShape) {
      // Multi-shape: hash by item layout per sheet (tabId + rounded position + size)
      // Source images are fixed per tab, so position equality = content equality
      const sigMap = new Map<string, { sIdx: number; count: number }>();
      const order: string[] = [];
      for (let si = 0; si < totalSheets; si++) {
        const items = allPlanItems.filter(it => (it.sheetIndex ?? 0) === si);
        const sig = items
          .map(it => `${it.tabId ?? ''}:${Math.round((it.x ?? 0) * 10)}:${Math.round((it.y ?? 0) * 10)}:${Math.round((it.w ?? 0) * 10)}:${Math.round((it.h ?? 0) * 10)}`)
          .sort()
          .join('|');
        if (!sigMap.has(sig)) {
          sigMap.set(sig, { sIdx: si, count: 0 });
          order.push(sig);
        }
        sigMap.get(sig)!.count++;
      }
      return order.map(sig => sigMap.get(sig)!);
    }

    // Single-shape: 0 or 1 page → ALL sheets show the same content
    if (allPages.length <= 1) {
      return [{ sIdx: 0, count: totalSheets }];
    }

    // Single-shape, multiple pages: hash each sheet by ordered page thumbs in its slots
    // pageIdx = floor(globalSlot / quantity) — Q copies of each page before moving to next
    const N = Math.max(1, allPlanItems.length);
    const qty = activeTab?.quantity || 1;
    const sigMap = new Map<string, { sIdx: number; count: number }>();
    const order: string[] = [];
    for (let si = 0; si < totalSheets; si++) {
      const keys: string[] = [];
      for (let i = 0; i < N; i++) {
        const { page: pg, isBlank } = getSlotPageIndex(si * N + i, allPages, qty);
        keys.push(pg && !isBlank ? (pg.originalThumb || pg.thumb) : '\0');
      }
      const sig = keys.join('\x01');
      if (!sigMap.has(sig)) {
        sigMap.set(sig, { sIdx: si, count: 0 });
        order.push(sig);
      }
      sigMap.get(sig)!.count++;
    }
    return order.map(sig => sigMap.get(sig)!);
  }, [isMultiShape, totalSheets, allPages, allPlanItems, activeTab?.quantity]);

  const sheetW = config.pageW * scale;
  const sheetH = config.pageH * scale;

  // Layout sheets in grid, wrapping at max 20 columns
  const COLS = Math.min(dedupedSheets.length, 20);
  const totalW = COLS * sheetW + (COLS - 1) * SHEET_GAP + SHEET_GAP * 2;
  const ROWS = Math.ceil(dedupedSheets.length / COLS);
  const totalH = ROWS * sheetH + (ROWS - 1) * SHEET_GAP + SHEET_GAP * 2;

  // ── Stage transform tracking (for HTML overlay sync) ──
  const [stageTransform, setStageTransform] = useState({ x: 0, y: 0, scale: 1 });
  const syncTransform = useCallback(() => {
    const s = stageRef.current;
    if (!s) return;
    setStageTransform({ x: s.x(), y: s.y(), scale: s.scaleX() });
  }, []);

  // Center on first render
  const initialStageX = useRef<number | null>(null);
  const initialStageY = useRef<number | null>(null);
  useEffect(() => {
    if (!stageRef.current || initialStageX.current !== null) return;
    const cx = (stageSize.w - totalW) / 2;
    const cy = (stageSize.h - totalH) / 2;
    stageRef.current.position({ x: cx, y: cy });
    initialStageX.current = cx;
    initialStageY.current = cy;
    syncTransform();
  }, [stageSize, totalW, totalH, syncTransform]);

  // ── Zoom toward cursor ──
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition()!;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const factor = e.evt.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(Math.max(oldScale * factor, 0.1), 10);

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    syncTransform();
  }, [syncTransform]);

  // ── Pan: middle mouse / Alt+drag on empty stage ──
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const isMiddle = e.evt.button === 1;
    const isAlt = e.evt.altKey && e.evt.button === 0;
    const isEmptyStage = e.target === stageRef.current;
    if (isMiddle || isAlt || isEmptyStage) {
      isPanningRef.current = true;
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      e.evt.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current || !stageRef.current) return;
    const dx = e.evt.clientX - lastPosRef.current.x;
    const dy = e.evt.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    stageRef.current.position({
      x: stageRef.current.x() + dx,
      y: stageRef.current.y() + dy,
    });
    syncTransform();
  }, [syncTransform]);

  const handleMouseUp = useCallback((_e: KonvaEventObject<MouseEvent>) => { isPanningRef.current = false; }, []);

  const handleDblClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current || !stageRef.current) return;
    // Reset zoom + pan to initial center
    stageRef.current.scale({ x: 1, y: 1 });
    const cx = (stageSize.w - totalW) / 2;
    const cy = (stageSize.h - totalH) / 2;
    stageRef.current.position({ x: cx, y: cy });
    syncTransform();
  }, [stageSize, totalW, totalH, syncTransform]);

  // Current zoom for toolbar display
  const [displayZoom, setDisplayZoom] = useState(100);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setDisplayZoom(Math.round(stage.scaleX() * 100));
    stage.on('scaleChange', update);
    return () => { stage.off('scaleChange', update); };
  }, []);

  // Active sheet position on stage & in screen space for margin badges
  const activeDisplayIdx = dedupedSheets.findIndex(e => e.sIdx === currentSheetIndex);
  const targetDisplayIdx = activeDisplayIdx >= 0 ? activeDisplayIdx : 0;
  const activeCol = targetDisplayIdx % COLS;
  const activeRow = Math.floor(targetDisplayIdx / COLS);
  const activeGx = SHEET_GAP + activeCol * (sheetW + SHEET_GAP);
  const activeGy = SHEET_GAP + activeRow * (sheetH + SHEET_GAP);

  const activeScreenX = stageTransform.x + activeGx * stageTransform.scale;
  const activeScreenY = stageTransform.y + activeGy * stageTransform.scale;
  const activeScreenW = sheetW * stageTransform.scale;
  const activeScreenH = sheetH * stageTransform.scale;

  return (
    <main
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="flex-1 relative overflow-hidden bg-gray-100 select-none"
      style={{ cursor: isPanningRef.current ? 'grabbing' : 'default' }}
    >
      {/* Zoom toolbar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-lg border border-slate-200/90 text-xs text-slate-700 select-none">
        <button
          type="button"
          onClick={() => {
            const s = stageRef.current;
            if (!s) return;
            const ns = Math.max(0.1, Math.round(s.scaleX() * 0.85 * 100) / 100);
            s.scale({ x: ns, y: ns });
            setDisplayZoom(Math.round(ns * 100));
          }}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 font-medium transition cursor-pointer"
          title="Thu nhỏ"
        >−</button>
        <button
          type="button"
          onClick={() => {
            const s = stageRef.current;
            if (!s) return;
            s.scale({ x: 1, y: 1 });
            const cx = (stageSize.w - totalW) / 2;
            const cy = (stageSize.h - totalH) / 2;
            s.position({ x: cx, y: cy });
            setDisplayZoom(100);
          }}
          className="px-2 py-0.5 rounded-lg hover:bg-violet-50 hover:text-violet-700 text-violet-800 font-medium text-xs transition cursor-pointer"
          title="Click đặt lại 100%"
        >{displayZoom}%</button>
        <button
          type="button"
          onClick={() => {
            const s = stageRef.current;
            if (!s) return;
            const ns = Math.min(10, Math.round(s.scaleX() * 1.15 * 100) / 100);
            s.scale({ x: ns, y: ns });
            setDisplayZoom(Math.round(ns * 100));
          }}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 font-medium transition cursor-pointer"
          title="Phóng to"
        >+</button>
        <div className="w-px h-4 bg-slate-300 mx-0.5" />
        <button
          type="button"
          onClick={() => {
            const s = stageRef.current;
            if (!s) return;
            s.scale({ x: 1, y: 1 });
            const cx = (stageSize.w - totalW) / 2;
            const cy = (stageSize.h - totalH) / 2;
            s.position({ x: cx, y: cy });
            setDisplayZoom(100);
          }}
          className="px-1.5 py-0.5 rounded-lg hover:bg-slate-100 text-slate-600 text-[10px] font-medium transition cursor-pointer"
        >Reset</button>
      </div>

      {/* Hint: double-click to reset */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-[10px] text-slate-400 pointer-events-none select-none">
        Scroll để zoom · Alt+kéo hoặc giữa chuột để pan · Đúp-click nền để reset
      </div>

      {/* Loading overlay khi đang tính toán lại */}
      {isRecalculating && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Dim layer */}
          <div className="absolute inset-0 bg-gray-100/60 backdrop-blur-[1px]" />
          {/* Spinner badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/95 border border-slate-200 shadow-lg rounded-xl px-4 py-2.5 text-sm text-slate-700 font-medium">
            <svg className="animate-spin w-4 h-4 text-violet-600 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Đang xử lý...
          </div>
        </div>
      )}

      {currentPlan ? (
        <KonvaStage
          ref={stageRef}
          width={stageSize.w}
          height={stageSize.h}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDblClick={handleDblClick}
        >
          <Layer>
            {dedupedSheets.map((entry: { sIdx: number; count: number }, displayIdx: number) => {
              const { sIdx } = entry;
              const col = displayIdx % COLS;
              const row = Math.floor(displayIdx / COLS);
              const gx = SHEET_GAP + col * (sheetW + SHEET_GAP);
              const gy = SHEET_GAP + row * (sheetH + SHEET_GAP);

              const sheetItems = isMultiShape
                ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === sIdx)
                : allPlanItems;

              return (
                <KonvaSheetGroup
                  key={`sheet-${sIdx}`}
                  sIdx={sIdx}
                  sheetItems={sheetItems}
                  allPlanItems={allPlanItems}
                  config={config}
                  shapeTabs={shapeTabs}
                  activeTab={activeTab}
                  allPages={allPages}
                  scale={scale}
                  previewSide={previewSide}
                  isMultiShape={isMultiShape}
                  customSvgData={customSvgData}
                  vectorMaskResult={vectorMaskResult}
                  isActive={currentSheetIndex === sIdx}
                  onClick={() => setCurrentSheetIndex(sIdx)}
                  x={gx}
                  y={gy}
                  serverPreviewUrl={sIdx === currentSheetIndex ? serverPreviewUrl : null}
                />
              );
            })}

            {/* Sheet labels + nhân bản badges */}
            {dedupedSheets.map((entry: { sIdx: number; count: number }, displayIdx: number) => {
              const { sIdx, count } = entry;
              const col = displayIdx % COLS;
              const row = Math.floor(displayIdx / COLS);
              const gx = SHEET_GAP + col * (sheetW + SHEET_GAP);
              const gy = SHEET_GAP + row * (sheetH + SHEET_GAP);
              const labelY = gy - 22;

              // All sheets collapsed into 1 group → "Tờ mẫu"
              const isAllIdentical = dedupedSheets.length === 1 && count > 1;
              const labelText = isAllIdentical
                ? 'Tờ mẫu'
                : `Tờ ${sIdx + 1}${totalSheets > 1 ? ` / ${totalSheets}` : ''}`;

              return (
                <React.Fragment key={`label-${sIdx}`}>
                  {/* Left: sheet number */}
                  <Text
                    x={gx}
                    y={labelY}
                    width={sheetW}
                    text={labelText}
                    fontSize={11}
                    fontStyle="bold"
                    fill={currentSheetIndex === sIdx ? '#7c3aed' : '#64748b'}
                    align="left"
                    listening={false}
                  />
                  {/* Right: nhân bản badge */}
                  {count > 1 && (
                    <Text
                      x={gx}
                      y={labelY}
                      width={sheetW}
                      text={`${count} copiers`}
                      fontSize={11}
                      fontStyle="bold"
                      fill="#059669"
                      align="right"
                      listening={false}
                    />
                  )}
                  {/* Below: descriptive note */}
                  {count > 1 && (
                    <Text
                      x={gx}
                      y={gy + sheetH + 8}
                      width={sheetW}
                      text={isAllIdentical
                        ? `${totalSheets} copiers — all sheets are identical`
                        : `${count} copiers out of ${totalSheets} total sheets`}
                      fontSize={10}
                      fill="#059669"
                      align="center"
                      listening={false}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Layer>
        </KonvaStage>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-center h-full">
          <div>
            <div className="text-5xl mb-3 opacity-30">⊞</div>
            <p className="text-base">Không có phương án phù hợp</p>
          </div>
        </div>
      )}

      {/* ── HTML overlay: slot page-number labels (vector text, crisp at any zoom) ── */}
      {currentPlan && config.padding > 0 && (
        <div
          style={{
            position: 'absolute', left: 0, top: 0,
            width: stageSize.w, height: stageSize.h,
            overflow: 'hidden', pointerEvents: 'none', zIndex: 5,
          }}
        >
          <div
            style={{
              position: 'absolute', left: 0, top: 0,
              transformOrigin: '0 0',
              transform: `translate(${stageTransform.x}px,${stageTransform.y}px) scale(${stageTransform.scale})`,
            }}
          >
            {dedupedSheets.map(({ sIdx }: { sIdx: number }, displayIdx: number) => {
              const col = displayIdx % COLS;
              const row = Math.floor(displayIdx / COLS);
              const gx = SHEET_GAP + col * (sheetW + SHEET_GAP);
              const gy = SHEET_GAP + row * (sheetH + SHEET_GAP);
              const shItems = isMultiShape
                ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === sIdx)
                : allPlanItems;
              const N = Math.max(1, shItems.length);
              const qty = activeTab?.quantity || 1;
              const isBackSide = config.is2Sided && previewSide === 'back';
              const gapPx = config.padding * scale;

              return shItems.map((it, i) => {
                const itW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
                const itH = it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH);
                const itemX = isBackSide ? config.pageW - it.x - itW : it.x;

                const slotInfo = isMultiShape
                  ? { pageIdx: -1, page: null, isBlank: false }
                  : getSlotPageIndex(sIdx * N + i, allPages, qty);
                if (slotInfo.isBlank && allPages.length > 1 && !isMultiShape) return null;
                const pageNum = slotInfo.pageIdx >= 0
                  ? slotInfo.pageIdx + 1
                  : sIdx * N + i + 1;

                const cx = gx + (itemX + itW / 2) * scale;
                const cy = gy + (it.y + itH) * scale + gapPx / 2;

                return (
                  <div
                    key={`pgnum-${sIdx}-${i}`}
                    style={{
                      position: 'absolute',
                      left: cx,
                      top: cy,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${Math.max(3, Math.min(gapPx * 0.21, 4))}px`,
                      fontWeight: 700,
                      fontFamily: 'system-ui, sans-serif',
                      color: 'rgba(71,85,105,0.8)',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                    }}
                  >
                    {pageNum}
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* ── 4 Interactive Margin Input Badges (Lề trên, Lề dưới, Lề trái, Lề phải) ── */}
      {currentPlan && (
        <div
          className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
          style={{ width: stageSize.w, height: stageSize.h }}
        >
          {/* Lề trên */}
          <div
            className="absolute flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap pointer-events-auto"
            style={{
              left: activeScreenX + activeScreenW / 2,
              top: activeScreenY - 12,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span className="text-[11px] font-medium text-slate-600">Lề trên:</span>
            <DebouncedNumberInput
              min={0}
              value={config.marginTop}
              onChange={v => setConfig(c => ({ ...c, marginTop: v, useMargin: true }))}
              className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
            />
            <span className="text-[10px] text-slate-400 font-normal">mm</span>
          </div>

          {/* Lề dưới */}
          <div
            className="absolute flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap pointer-events-auto"
            style={{
              left: activeScreenX + activeScreenW / 2,
              top: activeScreenY + activeScreenH + 12,
              transform: 'translate(-50%, 0)',
            }}
          >
            <span className="text-[11px] font-medium text-slate-600">Lề dưới:</span>
            <DebouncedNumberInput
              min={0}
              value={config.marginBot}
              onChange={v => setConfig(c => ({ ...c, marginBot: v, useMargin: true }))}
              className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
            />
            <span className="text-[10px] text-slate-400 font-normal">mm</span>
          </div>

          {/* Lề trái */}
          <div
            className="absolute flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap pointer-events-auto"
            style={{
              left: activeScreenX - 12,
              top: activeScreenY + activeScreenH / 2,
              transform: 'translate(-100%, -50%)',
            }}
          >
            <span className="text-[11px] font-medium text-slate-600">Lề trái:</span>
            <DebouncedNumberInput
              min={0}
              value={config.marginLeft}
              onChange={v => setConfig(c => ({ ...c, marginLeft: v, useMargin: true }))}
              className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
            />
            <span className="text-[10px] text-slate-400 font-normal">mm</span>
          </div>

          {/* Lề phải */}
          <div
            className="absolute flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap pointer-events-auto"
            style={{
              left: activeScreenX + activeScreenW + 12,
              top: activeScreenY + activeScreenH / 2,
              transform: 'translate(0, -50%)',
            }}
          >
            <span className="text-[11px] font-medium text-slate-600">Lề phải:</span>
            <DebouncedNumberInput
              min={0}
              value={config.marginRight}
              onChange={v => setConfig(c => ({ ...c, marginRight: v, useMargin: true }))}
              className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
            />
            <span className="text-[10px] text-slate-400 font-normal">mm</span>
          </div>
        </div>
      )}

      {/* ── Bottom Floating Control Dock (Đánh dấu cắt, Dấu xén, Dải màu, Khuôn cắt, Chuyển tờ) ── */}
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
        onOpenCutDieline={onOpenCutDieline}
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
