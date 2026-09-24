import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  VectorKnot,
  VectorMaskResult,
  ToolMode,
  PreviewMode,
  ActiveSidebarTab
} from '../types';
import { generatePresetKnots } from '../helpers/shapePresets';
import { generatePathData, generateExportSvg, parseSvgToKnots } from '../helpers/svgGenerators';
import {
  flipKnots,
  rotateKnots,
  centerAlignKnots,
  offsetMarginKnots
} from '../helpers/transformUtils';

interface UseVectorMaskStateParams {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  itemW: number;
  itemH: number;
  initialKnots?: VectorKnot[];
  onApply: (result: VectorMaskResult) => void;
}

export function useVectorMaskState({
  isOpen,
  onClose,
  imageUrl,
  itemW,
  itemH,
  initialKnots,
  onApply
}: UseVectorMaskStateParams) {
  // Shape size in mm
  const [maskW, setMaskW] = useState<number>(itemW || 100);
  const [maskH, setMaskH] = useState<number>(itemH || 120);

  // Knots state
  const [knots, setKnots] = useState<VectorKnot[]>([]);
  const [selectedKnotId, setSelectedKnotId] = useState<string | null>(null);
  const [hoveredKnotId, setHoveredKnotId] = useState<string | null>(null);
  const [candidatePoint, setCandidatePoint] = useState<{ x: number; y: number; index: number } | null>(null);

  // History for Undo / Redo
  const [history, setHistory] = useState<VectorKnot[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Tools: 'select', 'pen', 'add_knot', 'pan'
  const [activeTool, setActiveTool] = useState<ToolMode>('select');

  // Preview & Visual options
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(imageUrl || null);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(0.85);
  const [showBgImage, setShowBgImage] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [dieLineColor, setDieLineColor] = useState<string>('#FF007F');
  const [dieLineWidth, setDieLineWidth] = useState<number>(1.5);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('die_line');
  const [activeTab, setActiveTab] = useState<ActiveSidebarTab>('tools');

  // DOM Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgFileInputRef = useRef<HTMLInputElement>(null);

  // Sync image URL when prop changes
  useEffect(() => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl);
    }
  }, [imageUrl]);

  // Push history helper
  const pushHistory = useCallback((newKnots: VectorKnot[]) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, JSON.parse(JSON.stringify(newKnots))];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setKnots(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setKnots(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  // Initialize on modal open
  useEffect(() => {
    if (isOpen) {
      const initialW = itemW || 100;
      const initialH = itemH || 120;
      setMaskW(initialW);
      setMaskH(initialH);

      if (initialKnots && initialKnots.length >= 3) {
        setKnots(JSON.parse(JSON.stringify(initialKnots)));
        setHistory([JSON.parse(JSON.stringify(initialKnots))]);
        setHistoryIndex(0);
      } else {
        const defaultKnots = generatePresetKnots('rect', initialW, initialH);
        setKnots(defaultKnots);
        setHistory([defaultKnots]);
        setHistoryIndex(0);
      }
    }
  }, [isOpen, itemW, itemH, initialKnots]);

  // Generate SVG Path data `d`
  const pathData = useMemo(() => generatePathData(knots), [knots]);

  // Delete selected knot
  const handleDeleteSelectedKnot = useCallback(() => {
    if (!selectedKnotId || knots.length <= 3) return;
    const newKnots = knots.filter((k) => k.id !== selectedKnotId);
    setKnots(newKnots);
    setSelectedKnotId(null);
    pushHistory(newKnots);
  }, [selectedKnotId, knots, pushHistory]);

  // Transformations
  const handleFlip = useCallback((axis: 'h' | 'v') => {
    const newKnots = flipKnots(knots, axis, maskW, maskH);
    setKnots(newKnots);
    pushHistory(newKnots);
  }, [knots, maskW, maskH, pushHistory]);

  const handleRotate = useCallback((deg: number) => {
    const newKnots = rotateKnots(knots, deg, maskW, maskH);
    setKnots(newKnots);
    pushHistory(newKnots);
  }, [knots, maskW, maskH, pushHistory]);

  const handleCenterAlign = useCallback(() => {
    const newKnots = centerAlignKnots(knots, maskW, maskH);
    setKnots(newKnots);
    pushHistory(newKnots);
  }, [knots, maskW, maskH, pushHistory]);

  const handleOffsetMargin = useCallback((offset_mm: number) => {
    const newKnots = offsetMarginKnots(knots, offset_mm, maskW, maskH);
    setKnots(newKnots);
    pushHistory(newKnots);
  }, [knots, maskW, maskH, pushHistory]);

  // File Uploads & Svg Import
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setCurrentImageUrl(dataUrl);
        setShowBgImage(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSvgImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const svgText = ev.target?.result as string;
      const newKnots = parseSvgToKnots(svgText, maskW, maskH);
      setKnots(newKnots);
      pushHistory(newKnots);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export SVG Download
  const handleExportSvg = () => {
    const svgCode = generateExportSvg(maskW, maskH, pathData, dieLineColor);
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector_mask_${maskW}x${maskH}mm.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply Handler
  const handleApply = () => {
    const svgString = `<svg width="${maskW}mm" height="${maskH}mm" viewBox="0 0 ${maskW} ${maskH}" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" fill="none" stroke="${dieLineColor}" stroke-width="0.2" />
</svg>`;

    onApply({
      svgString,
      pathData,
      knots,
      w_mm: maskW,
      h_mm: maskH
    });
    onClose();
  };

  return {
    maskW,
    setMaskW,
    maskH,
    setMaskH,
    knots,
    setKnots,
    selectedKnotId,
    setSelectedKnotId,
    hoveredKnotId,
    setHoveredKnotId,
    candidatePoint,
    setCandidatePoint,
    history,
    historyIndex,
    pushHistory,
    undo,
    redo,
    activeTool,
    setActiveTool,
    currentImageUrl,
    setCurrentImageUrl,
    bgImageOpacity,
    setBgImageOpacity,
    showBgImage,
    setShowBgImage,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
    dieLineColor,
    setDieLineColor,
    dieLineWidth,
    setDieLineWidth,
    previewMode,
    setPreviewMode,
    activeTab,
    setActiveTab,
    pathData,
    fileInputRef,
    imgFileInputRef,
    handleDeleteSelectedKnot,
    handleFlip,
    handleRotate,
    handleCenterAlign,
    handleOffsetMargin,
    handleImageUpload,
    handleSvgImport,
    handleExportSvg,
    handleApply
  };
}
