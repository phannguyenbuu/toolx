import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Scissors,
  Download,
  Copy,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  FileCode,
  Layers,
  Palette,
  Ruler
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PlanItem, LayoutPlan } from '../utils/layoutSolver';

export interface CutDielineModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: LayoutPlan | null;
  pageW: number;
  pageH: number;
  defaultItemW: number;
  defaultItemH: number;
  defaultShape: string;
  defaultCutBleed?: number;
  defaultCornerRadius?: number;
  shapeTabs?: Array<{
    id: string;
    name: string;
    shape: string;
    itemW: number;
    itemH: number;
    cornerRadius?: number;
    customSvgData?: string;
    color?: string;
  }>;
  currentSheetIndex?: number;
  totalSheets?: number;
  isMultiShape?: boolean;
}

// Preset cut colors commonly used in CAD / Cutting plotters
const CUT_COLOR_PRESETS = [
  { label: 'Đỏ Die-Cut (Chuẩn)', value: '#FF0000', ring: 'ring-red-400' },
  { label: 'Hồng Magenta (ThruCut)', value: '#EC4899', ring: 'ring-pink-400' },
  { label: 'Xanh Cyan (Crease)', value: '#06B6D4', ring: 'ring-cyan-400' },
  { label: 'Xanh Lá (KissCut)', value: '#10B981', ring: 'ring-emerald-400' },
  { label: 'Đen Vector (CAD)', value: '#000000', ring: 'ring-slate-400' },
];

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
  // Modal customization states - default to Light theme
  const [selectedSheet, setSelectedSheet] = useState<number | 'all'>(currentSheetIndex);
  const [cutColor, setCutColor] = useState<string>('#FF0000');
  const [strokeWidthMm, setStrokeWidthMm] = useState<number>(0.1);
  const [cutBleed, setCutBleed] = useState<number>(defaultCutBleed);
  const [cornerRadius, setCornerRadius] = useState<number>(defaultCornerRadius);
  const [showPageBorder, setShowPageBorder] = useState<boolean>(true);
  const [bgTheme, setBgTheme] = useState<'light' | 'dark' | 'grid'>('light');
  const [customFilename, setCustomFilename] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Canvas zoom & pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Calculate actual total sheets from plan if available
  const effectiveTotalSheets = useMemo(() => {
    if (!plan || !plan.items || plan.items.length === 0) return Math.max(1, totalSheets);
    if (isMultiShape) {
      const maxIdx = plan.items.reduce((max, it) => Math.max(max, (it.sheetIndex ?? 0) + 1), 1);
      return Math.max(maxIdx, totalSheets);
    }
    return Math.max(1, totalSheets);
  }, [plan, isMultiShape, totalSheets]);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedSheet(Math.min(currentSheetIndex, effectiveTotalSheets - 1));
      setCutBleed(defaultCutBleed);
      setCornerRadius(defaultCornerRadius);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setCustomFilename(`Khuon_Cat_${pageW}x${pageH}mm`);
    }
  }, [isOpen, currentSheetIndex, effectiveTotalSheets, defaultCutBleed, defaultCornerRadius, pageW, pageH]);

  // Mouse wheel zoom and trackpad pan event listener
  useEffect(() => {
    if (!isOpen) return;
    const container = previewContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey || (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX))) {
        // Zoom with wheel
        const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
        setZoom(z => Math.min(8, Math.max(0.15, Number((z * zoomDelta).toFixed(3)))));
      } else {
        // Pan with trackpad
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Helper to generate SVG elements and calculate total cutting perimeter length
  const { svgContent, totalCutLengthMeters, itemCount, renderWidthMm, renderHeightMm } = useMemo(() => {
    if (!plan || !plan.items || plan.items.length === 0) {
      return { svgContent: '', totalCutLengthMeters: 0, itemCount: 0, renderWidthMm: pageW, renderHeightMm: pageH };
    }

    const sheetsToProcess: number[] = selectedSheet === 'all'
      ? Array.from({ length: effectiveTotalSheets }, (_, i) => i)
      : [typeof selectedSheet === 'number' ? selectedSheet : 0];

    const sheetSpacingMm = 25;
    const totalRenderWidth = selectedSheet === 'all' && effectiveTotalSheets > 1
      ? effectiveTotalSheets * pageW + (effectiveTotalSheets - 1) * sheetSpacingMm
      : pageW;
    const totalRenderHeight = pageH;

    let elementsSvg = '';
    let totalLengthMm = 0;
    let totalCount = 0;

    sheetsToProcess.forEach((sheetIdx, sheetOrder) => {
      const sheetOffsetX = selectedSheet === 'all' && effectiveTotalSheets > 1
        ? sheetOrder * (pageW + sheetSpacingMm)
        : 0;
      const sheetOffsetY = 0;

      // Filter items strictly for this sheet
      let sheetItems: PlanItem[] = [];
      if (isMultiShape) {
        sheetItems = plan.items.filter(it => (it.sheetIndex ?? 0) === sheetIdx);
      } else {
        sheetItems = plan.items;
      }

      // Draw Sheet Boundary Box if enabled
      if (showPageBorder) {
        elementsSvg += `<rect x="${sheetOffsetX.toFixed(2)}" y="${sheetOffsetY.toFixed(2)}" width="${pageW}" height="${pageH}" class="sheet-boundary" />\n`;
        if (selectedSheet === 'all' && effectiveTotalSheets > 1) {
          elementsSvg += `<text x="${(sheetOffsetX + pageW / 2).toFixed(2)}" y="${(sheetOffsetY - 6).toFixed(2)}" font-size="12" font-family="sans-serif" font-weight="bold" fill="#64748B" text-anchor="middle">TỜ ${sheetIdx + 1} (${pageW}×${pageH}mm)</text>\n`;
        }
      }

      sheetItems.forEach(item => {
        totalCount++;
        const tab = isMultiShape
          ? shapeTabs.find(t => t.id === item.tabId || t.name === item.tabName)
          : null;

        const itemShape = (item.shape || tab?.shape || defaultShape) as string;
        const rawW = item.w ?? tab?.itemW ?? (item.rot ? defaultItemH : defaultItemW);
        const rawH = item.h ?? tab?.itemH ?? (item.rot ? defaultItemW : defaultItemH);
        const itemRad = item.cornerRadius ?? tab?.cornerRadius ?? cornerRadius;

        const w = item.rot ? rawH : rawW;
        const h = item.rot ? rawW : rawH;

        const adjW = Math.max(0.1, w - cutBleed * 2);
        const adjH = Math.max(0.1, h - cutBleed * 2);
        const x = sheetOffsetX + item.x + cutBleed;
        const y = sheetOffsetY + item.y + cutBleed;

        if (itemShape === 'circle') {
          const radius = adjW / 2;
          const cx = sheetOffsetX + item.x + w / 2;
          const cy = sheetOffsetY + item.y + h / 2;
          elementsSvg += `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${radius.toFixed(3)}" class="cut-dieline" />\n`;
          totalLengthMm += 2 * Math.PI * radius;
        } else if (itemShape === 'oval') {
          const rx = adjW / 2;
          const ry = adjH / 2;
          const cx = sheetOffsetX + item.x + w / 2;
          const cy = sheetOffsetY + item.y + h / 2;
          elementsSvg += `<ellipse cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" rx="${rx.toFixed(3)}" ry="${ry.toFixed(3)}" class="cut-dieline" />\n`;
          const hParam = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2);
          totalLengthMm += Math.PI * (rx + ry) * (1 + (3 * hParam) / (10 + Math.sqrt(4 - 3 * hParam)));
        } else if (itemShape === 'trapezoid') {
          const topRatio = 0.7;
          const narrowW = adjW * topRatio;
          const offset = (adjW - narrowW) / 2;
          let pts: [number, number][];
          if (item.rot) {
            pts = [
              [x, y],
              [x + adjW, y],
              [x + offset + narrowW, y + adjH],
              [x + offset, y + adjH]
            ];
          } else {
            pts = [
              [x + offset, y],
              [x + offset + narrowW, y],
              [x + adjW, y + adjH],
              [x, y + adjH]
            ];
          }
          const ptsStr = pts.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
          elementsSvg += `<polygon points="${ptsStr}" class="cut-dieline" />\n`;
          for (let i = 0; i < pts.length; i++) {
            const next = pts[(i + 1) % pts.length];
            totalLengthMm += Math.hypot(next[0] - pts[i][0], next[1] - pts[i][1]);
          }
        } else if (itemShape === 'triangle') {
          let pts: [number, number][];
          if (item.rot) {
            pts = [
              [x, y],
              [x + adjW, y],
              [x + adjW / 2, y + adjH]
            ];
          } else {
            pts = [
              [x + adjW / 2, y],
              [x + adjW, y + adjH],
              [x, y + adjH]
            ];
          }
          const ptsStr = pts.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
          elementsSvg += `<polygon points="${ptsStr}" class="cut-dieline" />\n`;
          for (let i = 0; i < pts.length; i++) {
            const next = pts[(i + 1) % pts.length];
            totalLengthMm += Math.hypot(next[0] - pts[i][0], next[1] - pts[i][1]);
          }
        } else if (itemShape === 'hexagon') {
          const cx = sheetOffsetX + item.x + w / 2;
          const cy = sheetOffsetY + item.y + h / 2;
          const rx = adjW / 2;
          const ry = adjH / 2;
          const pts: [number, number][] = [
            [cx, cy - ry],
            [cx + rx, cy - ry / 2],
            [cx + rx, cy + ry / 2],
            [cx, cy + ry],
            [cx - rx, cy + ry / 2],
            [cx - rx, cy - ry / 2]
          ];
          const ptsStr = pts.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
          elementsSvg += `<polygon points="${ptsStr}" class="cut-dieline" />\n`;
          for (let i = 0; i < pts.length; i++) {
            const next = pts[(i + 1) % pts.length];
            totalLengthMm += Math.hypot(next[0] - pts[i][0], next[1] - pts[i][1]);
          }
        } else if (itemShape === 'custom-svg') {
          const pathD = (item as any).vectorMaskResult?.pathData || (tab as any)?.vectorMaskResult?.pathData || ((item as any).customSvgData ? (item as any).customSvgData.match(/<path[^>]*\bd=["']([^"']+)["']/i)?.[1] : '') || (tab?.customSvgData ? tab.customSvgData.match(/<path[^>]*\bd=["']([^"']+)["']/i)?.[1] : '');
          if (pathD) {
            elementsSvg += `<g transform="translate(${x.toFixed(3)}, ${y.toFixed(3)})"><path d="${pathD}" class="cut-dieline" /></g>\n`;
            totalLengthMm += 2 * (adjW + adjH);
          } else {
            elementsSvg += `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${adjW.toFixed(3)}" height="${adjH.toFixed(3)}" class="cut-dieline" />\n`;
            totalLengthMm += 2 * (adjW + adjH);
          }
        } else {
          // Rectangle with optional rounded corner
          const r = itemRad > 0 ? Math.min(itemRad, adjW / 2, adjH / 2) : 0;
          if (r > 0) {
            elementsSvg += `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${adjW.toFixed(3)}" height="${adjH.toFixed(3)}" rx="${r.toFixed(3)}" ry="${r.toFixed(3)}" class="cut-dieline" />\n`;
            totalLengthMm += 2 * (adjW + adjH) - 8 * r + 2 * Math.PI * r;
          } else {
            elementsSvg += `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${adjW.toFixed(3)}" height="${adjH.toFixed(3)}" class="cut-dieline" />\n`;
            totalLengthMm += 2 * (adjW + adjH);
          }
        }
      });
    });

    return {
      svgContent: elementsSvg,
      totalCutLengthMeters: Number((totalLengthMm / 1000).toFixed(2)),
      itemCount: totalCount,
      renderWidthMm: totalRenderWidth,
      renderHeightMm: totalRenderHeight
    };
  }, [plan, selectedSheet, effectiveTotalSheets, isMultiShape, shapeTabs, defaultShape, defaultItemW, defaultItemH, cornerRadius, cutBleed, showPageBorder, pageW, pageH]);

  // Complete SVG Document String
  const completeSvgString = useMemo(() => {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${renderWidthMm}mm" height="${renderHeightMm}mm" viewBox="0 0 ${renderWidthMm} ${renderHeightMm}" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .cut-dieline {
        fill: none;
        stroke: ${cutColor};
        stroke-width: ${strokeWidthMm};
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }
      .sheet-boundary {
        fill: none;
        stroke: #94A3B8;
        stroke-width: 0.25;
        stroke-dasharray: 2.5 2.5;
        vector-effect: non-scaling-stroke;
      }
    </style>
  </defs>
  <!-- Generated by Toolx Prepress Imposition Engine -->
  ${svgContent}
</svg>`;
  }, [renderWidthMm, renderHeightMm, cutColor, strokeWidthMm, svgContent]);

  // Download SVG file
  const handleDownloadSvg = useCallback(() => {
    if (!completeSvgString) return;
    try {
      const blob = new Blob([completeSvgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const sheetLabel = selectedSheet === 'all' ? 'AllSheets' : `To_${(typeof selectedSheet === 'number' ? selectedSheet : 0) + 1}`;
      const filename = `${customFilename.trim() || `Khuon_Cat_${pageW}x${pageH}mm`}_${sheetLabel}.svg`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download SVG error:', err);
    }
  }, [completeSvgString, customFilename, pageW, pageH, selectedSheet]);

  // Download Vector PDF file via jsPDF
  const handleDownloadPdf = useCallback(async () => {
    if (!plan || !plan.items) return;
    setIsExporting(true);

    try {
      const orientation = pageW > pageH ? 'landscape' : 'portrait';
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [pageW, pageH],
        compress: true
      });

      // Parse hex color to RGB
      const hex = cutColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 255;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;

      const sheetsToRender: number[] = selectedSheet === 'all'
        ? Array.from({ length: effectiveTotalSheets }, (_, i) => i)
        : [typeof selectedSheet === 'number' ? selectedSheet : 0];

      sheetsToRender.forEach((sheetIdx, pageIndex) => {
        if (pageIndex > 0) {
          doc.addPage([pageW, pageH], orientation);
        }

        const sheetItems = isMultiShape
          ? plan.items.filter(it => (it.sheetIndex ?? 0) === sheetIdx)
          : plan.items;

        // Draw Sheet Boundary if enabled
        if (showPageBorder) {
          doc.setDrawColor(180, 190, 205);
          doc.setLineWidth(0.15);
          doc.setLineDashPattern([2, 2], 0);
          doc.rect(0, 0, pageW, pageH, 'S');
          doc.setLineDashPattern([], 0); // reset dash
        }

        // Draw cut lines
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(strokeWidthMm);

        sheetItems.forEach(item => {
          const tab = isMultiShape
            ? shapeTabs.find(t => t.id === item.tabId || t.name === item.tabName)
            : null;

          const itemShape = (item.shape || tab?.shape || defaultShape) as string;
          const rawW = item.w ?? tab?.itemW ?? (item.rot ? defaultItemH : defaultItemW);
          const rawH = item.h ?? tab?.itemH ?? (item.rot ? defaultItemW : defaultItemH);
          const itemRad = item.cornerRadius ?? tab?.cornerRadius ?? cornerRadius;

          const w = item.rot ? rawH : rawW;
          const h = item.rot ? rawW : rawH;
          const adjW = Math.max(0.1, w - cutBleed * 2);
          const adjH = Math.max(0.1, h - cutBleed * 2);
          const x = item.x + cutBleed;
          const y = item.y + cutBleed;

          if (itemShape === 'circle') {
            const radius = adjW / 2;
            const cx = item.x + w / 2;
            const cy = item.y + h / 2;
            doc.circle(cx, cy, radius, 'S');
          } else if (itemShape === 'oval') {
            const rx = adjW / 2;
            const ry = adjH / 2;
            const cx = item.x + w / 2;
            const cy = item.y + h / 2;
            doc.ellipse(cx, cy, rx, ry, 'S');
          } else if (itemShape === 'trapezoid') {
            const topRatio = 0.7;
            const narrowW = adjW * topRatio;
            const offset = (adjW - narrowW) / 2;
            let pts: [number, number][];
            if (item.rot) {
              pts = [[x, y], [x + adjW, y], [x + offset + narrowW, y + adjH], [x + offset, y + adjH]];
            } else {
              pts = [[x + offset, y], [x + offset + narrowW, y], [x + adjW, y + adjH], [x, y + adjH]];
            }
            for (let i = 0; i < pts.length; i++) {
              const next = pts[(i + 1) % pts.length];
              doc.line(pts[i][0], pts[i][1], next[0], next[1]);
            }
          } else if (itemShape === 'triangle') {
            let pts: [number, number][];
            if (item.rot) {
              pts = [[x, y], [x + adjW, y], [x + adjW / 2, y + adjH]];
            } else {
              pts = [[x + adjW / 2, y], [x + adjW, y + adjH], [x, y + adjH]];
            }
            for (let i = 0; i < pts.length; i++) {
              const next = pts[(i + 1) % pts.length];
              doc.line(pts[i][0], pts[i][1], next[0], next[1]);
            }
          } else if (itemShape === 'hexagon') {
            const cx = item.x + w / 2;
            const cy = item.y + h / 2;
            const rx = adjW / 2;
            const ry = adjH / 2;
            const pts: [number, number][] = [
              [cx, cy - ry],
              [cx + rx, cy - ry / 2],
              [cx + rx, cy + ry / 2],
              [cx, cy + ry],
              [cx - rx, cy + ry / 2],
              [cx - rx, cy - ry / 2]
            ];
            for (let i = 0; i < pts.length; i++) {
              const next = pts[(i + 1) % pts.length];
              doc.line(pts[i][0], pts[i][1], next[0], next[1]);
            }
          } else if (itemShape === 'custom-svg') {
            const knots = (item as any).vectorMaskResult?.knots || (tab as any)?.vectorMaskResult?.knots;
            if (Array.isArray(knots) && knots.length >= 3) {
              for (let i = 0; i < knots.length; i++) {
                const k1 = knots[i];
                const k2 = knots[(i + 1) % knots.length];
                doc.line(x + k1.x, y + k1.y, x + k2.x, y + k2.y);
              }
            } else {
              doc.rect(x, y, adjW, adjH, 'S');
            }
          } else {
            // Rect
            const r = itemRad > 0 ? Math.min(itemRad, adjW / 2, adjH / 2) : 0;
            if (r > 0) {
              doc.roundedRect(x, y, adjW, adjH, r, r, 'S');
            } else {
              doc.rect(x, y, adjW, adjH, 'S');
            }
          }
        });
      });

      const sheetLabel = selectedSheet === 'all' ? 'AllSheets' : `To_${(typeof selectedSheet === 'number' ? selectedSheet : 0) + 1}`;
      const filename = `${customFilename.trim() || `Khuon_Cat_${pageW}x${pageH}mm`}_${sheetLabel}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [plan, pageW, pageH, cutColor, selectedSheet, effectiveTotalSheets, showPageBorder, strokeWidthMm, isMultiShape, shapeTabs, defaultShape, defaultItemH, defaultItemW, cornerRadius, cutBleed, customFilename]);

  // Copy SVG XML code
  const handleCopySvg = useCallback(() => {
    if (!completeSvgString) return;
    navigator.clipboard.writeText(completeSvgString).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [completeSvgString]);

  // Pan and drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

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
                <h3 className="text-base font-bold text-slate-900">Xem trước & Tải khuôn cắt (Die-Cut Dieline)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Vector SVG & PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Khổ giấy: <strong className="text-slate-700">{pageW} × {pageH} mm</strong> • Đang xem: <strong className="text-violet-700">{selectedSheet === 'all' ? 'Tất cả các tờ' : `Tờ ${(typeof selectedSheet === 'number' ? selectedSheet : 0) + 1} / ${effectiveTotalSheets}`}</strong> • Số tem: <strong className="text-slate-700">{itemCount}</strong> • Tổng đường dao: <strong className="text-rose-600">{totalCutLengthMeters} m</strong>
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
          <div className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-slate-200">
            {/* Canvas Toolbar overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-lg pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(8, z + 0.25))}
                  className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  title="Phóng to (+ hoặc cuộn chuột)"
                >
                  <ZoomIn size={15} />
                </button>
                <span className="text-[11px] font-semibold text-slate-700 min-w-[42px] text-center font-mono">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.2, z - 0.25))}
                  className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  title="Thu nhỏ (- hoặc cuộn chuột)"
                >
                  <ZoomOut size={15} />
                </button>
                <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                  title="Tỷ lệ chuẩn 100%"
                >
                  <RotateCcw size={12} />
                  <span>1:1</span>
                </button>
              </div>

              {/* Background Theme Toggle */}
              <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-lg pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setBgTheme('light')}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${bgTheme === 'light' ? 'bg-violet-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Sáng
                </button>
                <button
                  type="button"
                  onClick={() => setBgTheme('dark')}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${bgTheme === 'dark' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Tối
                </button>
                <button
                  type="button"
                  onClick={() => setBgTheme('grid')}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition cursor-pointer ${bgTheme === 'grid' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Ca-rô
                </button>
              </div>
            </div>

            {/* Interactive Preview Canvas Area (Zoom with mouse wheel & drag pan) */}
            <div
              ref={previewContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`w-full h-full flex items-center justify-center p-8 overflow-hidden cursor-grab active:cursor-grabbing ${
                bgTheme === 'light'
                  ? 'bg-slate-100/90'
                  : bgTheme === 'dark'
                  ? 'bg-slate-950'
                  : 'bg-[radial-gradient(#94A3B8_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100'
              }`}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.08s ease-out'
                }}
                className={`relative rounded-md transition-shadow ${
                  bgTheme === 'dark'
                    ? 'bg-slate-900 shadow-2xl shadow-black border border-slate-700'
                    : 'bg-white shadow-2xl shadow-slate-300/80 border border-slate-300/90 ring-1 ring-slate-200'
                }`}
              >
                {/* Embedded SVG preview */}
                <div
                  className="max-h-[520px] max-w-[560px] w-auto h-auto flex items-center justify-center p-3 select-none"
                  dangerouslySetInnerHTML={{
                    __html: completeSvgString
                  }}
                />
              </div>
            </div>

            {/* Bottom badges on canvas */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/95 backdrop-blur text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-md">
                <Ruler size={13} className="text-amber-500" />
                {renderWidthMm} × {renderHeightMm} mm
              </span>
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/95 backdrop-blur text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-md">
                <Scissors size={13} className="text-rose-500" />
                {totalCutLengthMeters}m dao cắt
              </span>
            </div>
          </div>

          {/* Right Configuration & Export Panel */}
          <div className="w-full lg:w-80 xl:w-88 flex flex-col justify-between bg-slate-50/70 p-5 overflow-y-auto space-y-5">
            <div className="space-y-4">
              {/* Sheet selection (if multiple sheets) */}
              {effectiveTotalSheets > 1 && (
                <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                    <Layers size={13} className="text-violet-600" />
                    <span>Chọn tờ cần xuất ({effectiveTotalSheets} tờ)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {Array.from({ length: effectiveTotalSheets }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedSheet(i)}
                        className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          selectedSheet === i
                            ? 'bg-violet-600 border-violet-700 text-white shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        Tờ {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedSheet('all')}
                      className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        selectedSheet === 'all'
                          ? 'bg-violet-600 border-violet-700 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      Tất cả
                    </button>
                  </div>
                </div>
              )}

              {/* Stroke & Cut Parameters */}
              <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette size={13} className="text-amber-500" />
                    <span>Màu & nét dao cắt</span>
                  </span>
                </div>

                {/* Color Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Màu đường cắt</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CUT_COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setCutColor(preset.value)}
                        className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          cutColor.toUpperCase() === preset.value.toUpperCase()
                            ? `ring-2 ring-offset-1 ${preset.ring} border-slate-800 scale-105`
                            : 'border-slate-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.label}
                      >
                        {cutColor.toUpperCase() === preset.value.toUpperCase() && (
                          <Check size={14} className={preset.value === '#000000' || preset.value === '#FF0000' ? 'text-white' : 'text-slate-900'} />
                        )}
                      </button>
                    ))}
                    {/* Custom Color Input */}
                    <div className="relative w-7 h-7 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center cursor-pointer hover:scale-105 transition" title="Chọn màu tùy chỉnh">
                      <input
                        type="color"
                        value={cutColor}
                        onChange={e => setCutColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full h-full" style={{ backgroundColor: cutColor }} />
                    </div>
                  </div>
                </div>

                {/* Stroke Width & Bleed */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Độ dày nét (mm)</span>
                    <select
                      value={strokeWidthMm}
                      onChange={e => setStrokeWidthMm(parseFloat(e.target.value) || 0.1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-400"
                    >
                      <option value={0.05}>0.05 mm (Siêu mảnh)</option>
                      <option value={0.1}>0.10 mm (Chuẩn plotter)</option>
                      <option value={0.25}>0.25 mm (CAD / In)</option>
                      <option value={0.5}>0.50 mm (Dày)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Bù xén (Bleed mm)</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={cutBleed}
                      onChange={e => setCutBleed(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Show sheet boundary toggle */}
                <label className="flex items-center justify-between text-xs text-slate-700 pt-1 border-t border-slate-100 cursor-pointer select-none">
                  <span className="text-[11px] font-medium">Hiện khung trang ({pageW}×{pageH}mm)</span>
                  <input
                    type="checkbox"
                    checked={showPageBorder}
                    onChange={e => setShowPageBorder(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Filename Input */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tên file xuất</label>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <input
                    type="text"
                    value={customFilename}
                    onChange={e => setCustomFilename(e.target.value)}
                    placeholder="Ten_File"
                    className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">.svg / .pdf</span>
                </div>
              </div>
            </div>

            {/* Export Actions Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {/* SVG Download Button */}
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <FileCode size={16} />
                <span>Tải file SVG (.svg)</span>
              </button>

              {/* PDF Download Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-rose-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <Download size={16} />
                <span>{isExporting ? 'Đang tạo PDF...' : 'Tải file PDF (.pdf)'}</span>
              </button>

              {/* Copy SVG Code */}
              <button
                type="button"
                onClick={handleCopySvg}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
                <span>{isCopied ? 'Đã sao chép mã SVG!' : 'Sao chép mã SVG'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CutDielineModal;
