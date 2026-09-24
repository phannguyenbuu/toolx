import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { LayoutPlan } from '../../../utils/layoutSolver';
import { ShapeTabItem, BgTheme } from '../types';
import { calculateDielineSvg, buildCompleteSvgDocument } from '../services/dielineSvgGenerator';
import { exportDielinePdf } from '../services/dielinePdfExporter';

interface UseCutDielineModalStateProps {
  isOpen: boolean;
  plan: LayoutPlan | null;
  pageW: number;
  pageH: number;
  defaultItemW: number;
  defaultItemH: number;
  defaultShape: string;
  defaultCutBleed?: number;
  defaultCornerRadius?: number;
  shapeTabs?: ShapeTabItem[];
  currentSheetIndex?: number;
  totalSheets?: number;
  isMultiShape?: boolean;
}

export const useCutDielineModalState = ({
  isOpen,
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
}: UseCutDielineModalStateProps) => {
  const [selectedSheet, setSelectedSheet] = useState<number | 'all'>(currentSheetIndex);
  const [cutColor, setCutColor] = useState<string>('#FF0000');
  const [strokeWidthMm, setStrokeWidthMm] = useState<number>(0.1);
  const [cutBleed, setCutBleed] = useState<number>(defaultCutBleed);
  const [cornerRadius, setCornerRadius] = useState<number>(defaultCornerRadius);
  const [showPageBorder, setShowPageBorder] = useState<boolean>(true);
  const [bgTheme, setBgTheme] = useState<BgTheme>('light');
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
        setZoom((z) => Math.min(8, Math.max(0.15, Number((z * zoomDelta).toFixed(3)))));
      } else {
        // Pan with trackpad
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Calculate SVG
  const dielineResult = useMemo(() => {
    return calculateDielineSvg({
      plan,
      selectedSheet,
      effectiveTotalSheets,
      isMultiShape,
      shapeTabs,
      defaultShape,
      defaultItemW,
      defaultItemH,
      cornerRadius,
      cutBleed,
      showPageBorder,
      pageW,
      pageH,
    });
  }, [
    plan,
    selectedSheet,
    effectiveTotalSheets,
    isMultiShape,
    shapeTabs,
    defaultShape,
    defaultItemW,
    defaultItemH,
    cornerRadius,
    cutBleed,
    showPageBorder,
    pageW,
    pageH,
  ]);

  // Complete SVG Document String
  const completeSvgString = useMemo(() => {
    return buildCompleteSvgDocument(
      dielineResult.renderWidthMm,
      dielineResult.renderHeightMm,
      cutColor,
      strokeWidthMm,
      dielineResult.svgContent
    );
  }, [dielineResult, cutColor, strokeWidthMm]);

  // Download SVG file
  const handleDownloadSvg = useCallback(() => {
    if (!completeSvgString) return;
    try {
      const blob = new Blob([completeSvgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const sheetLabel =
        selectedSheet === 'all'
          ? 'AllSheets'
          : `To_${(typeof selectedSheet === 'number' ? selectedSheet : 0) + 1}`;
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
      await exportDielinePdf({
        plan,
        pageW,
        pageH,
        cutColor,
        selectedSheet,
        effectiveTotalSheets,
        showPageBorder,
        strokeWidthMm,
        isMultiShape,
        shapeTabs,
        defaultShape,
        defaultItemH,
        defaultItemW,
        cornerRadius,
        cutBleed,
        customFilename,
      });
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [
    plan,
    pageW,
    pageH,
    cutColor,
    selectedSheet,
    effectiveTotalSheets,
    showPageBorder,
    strokeWidthMm,
    isMultiShape,
    shapeTabs,
    defaultShape,
    defaultItemH,
    defaultItemW,
    cornerRadius,
    cutBleed,
    customFilename,
  ]);

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
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setZoom((z) => Math.min(8, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z - 0.25));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return {
    selectedSheet,
    setSelectedSheet,
    cutColor,
    setCutColor,
    strokeWidthMm,
    setStrokeWidthMm,
    cutBleed,
    setCutBleed,
    cornerRadius,
    setCornerRadius,
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
  };
};
