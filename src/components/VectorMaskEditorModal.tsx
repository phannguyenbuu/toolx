import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Check, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  ZoomIn, ZoomOut, Move, Eye, EyeOff, Upload, Sparkles,
  RefreshCw, Scissors, Grid, Plus, Trash2, PenTool, MousePointer,
  Download, Copy, Maximize2, Shield, Heart, Star, Circle, Square,
  Layers, Sliders, Hand, HelpCircle
} from 'lucide-react';

export interface VectorKnot {
  id: string;
  x: number; // in mm
  y: number; // in mm
  isCurved?: boolean;
  cpIn?: { x: number; y: number };
  cpOut?: { x: number; y: number };
}

export interface VectorMaskResult {
  svgString: string;
  pathData: string;
  knots: VectorKnot[];
  w_mm: number;
  h_mm: number;
  cornerRadius?: number;
}

interface VectorMaskEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  imageName?: string;
  itemW: number; // mm
  itemH: number; // mm
  initialKnots?: VectorKnot[];
  initialSvgPath?: string;
  onApply: (result: VectorMaskResult) => void;
}

// Helper: generate unique id
const uid = () => Math.random().toString(36).substring(2, 9);

export const VectorMaskEditorModal: React.FC<VectorMaskEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'Ảnh nguồn',
  itemW,
  itemH,
  initialKnots,
  initialSvgPath,
  onApply,
}) => {
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

  // Tools: 'select' (move knots/shape), 'pen' (draw new points), 'add_knot', 'pan'
  const [activeTool, setActiveTool] = useState<'select' | 'pen' | 'add_knot' | 'pan'>('select');

  // Preview & Visual options
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(0.85);
  const [showBgImage, setShowBgImage] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [dieLineColor, setDieLineColor] = useState<string>('#FF007F'); // Magenta die line
  const [dieLineWidth, setDieLineWidth] = useState<number>(1.5);
  const [previewMode, setPreviewMode] = useState<'die_line' | 'mask_overlay' | 'cut_preview'>('die_line');
  const [activeTab, setActiveTab] = useState<'tools' | 'presets' | 'settings'>('tools');

  // Viewport Transform (Zoom & Pan)
  const [scale, setScale] = useState<number>(4); // pixels per mm (e.g. 4px = 1mm)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  // Dragging Knot or Shape
  const [isDraggingKnot, setIsDraggingKnot] = useState<boolean>(false);
  const [isDraggingShape, setIsDraggingShape] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; initialKnots: VectorKnot[] }>({ x: 0, y: 0, initialKnots: [] });

  // DOM Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Push history helper
  const pushHistory = useCallback((newKnots: VectorKnot[]) => {
    setHistory(prev => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, JSON.parse(JSON.stringify(newKnots))];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setKnots(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setKnots(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Preset Generators
  const generatePresetKnots = useCallback((type: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon' | 'star' | 'heart' | 'badge' | 'arch', w: number, h: number): VectorKnot[] => {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w / 2;
    const ry = h / 2;

    switch (type) {
      case 'rect':
        return [
          { id: uid(), x: 0, y: 0 },
          { id: uid(), x: w, y: 0 },
          { id: uid(), x: w, y: h },
          { id: uid(), x: 0, y: h },
        ];
      case 'circle':
      case 'oval': {
        const numPoints = 16;
        const result: VectorKnot[] = [];
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
          result.push({
            id: uid(),
            x: Math.round((cx + rx * Math.cos(angle)) * 100) / 100,
            y: Math.round((cy + ry * Math.sin(angle)) * 100) / 100,
            isCurved: true,
          });
        }
        return result;
      }
      case 'triangle':
        return [
          { id: uid(), x: cx, y: 0 },
          { id: uid(), x: w, y: h },
          { id: uid(), x: 0, y: h },
        ];
      case 'trapezoid':
        return [
          { id: uid(), x: w * 0.2, y: 0 },
          { id: uid(), x: w * 0.8, y: 0 },
          { id: uid(), x: w, y: h },
          { id: uid(), x: 0, y: h },
        ];
      case 'hexagon': {
        const result: VectorKnot[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          result.push({
            id: uid(),
            x: Math.round((cx + rx * Math.cos(angle)) * 100) / 100,
            y: Math.round((cy + ry * Math.sin(angle)) * 100) / 100,
          });
        }
        return result;
      }
      case 'star': {
        const result: VectorKnot[] = [];
        const pts = 5;
        for (let i = 0; i < pts * 2; i++) {
          const r = i % 2 === 0 ? rx : rx * 0.45;
          const angle = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
          result.push({
            id: uid(),
            x: Math.round((cx + r * Math.cos(angle)) * 100) / 100,
            y: Math.round((cy + (r * (ry / rx)) * Math.sin(angle)) * 100) / 100,
          });
        }
        return result;
      }
      case 'heart': {
        const result: VectorKnot[] = [];
        const numPoints = 20;
        for (let i = 0; i < numPoints; i++) {
          const t = (i / numPoints) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const nx = cx + (hx / 17) * rx;
          const ny = cy + ((hy + 2) / 18) * ry;
          result.push({
            id: uid(),
            x: Math.round(nx * 100) / 100,
            y: Math.round(ny * 100) / 100,
            isCurved: true,
          });
        }
        return result;
      }
      case 'badge': {
        const result: VectorKnot[] = [];
        const waves = 12;
        for (let i = 0; i < waves * 2; i++) {
          const r = i % 2 === 0 ? rx : rx * 0.88;
          const angle = (i / (waves * 2)) * Math.PI * 2;
          result.push({
            id: uid(),
            x: Math.round((cx + r * Math.cos(angle)) * 100) / 100,
            y: Math.round((cy + r * (ry / rx) * Math.sin(angle)) * 100) / 100,
          });
        }
        return result;
      }
      case 'arch':
        return [
          { id: uid(), x: 0, y: h },
          { id: uid(), x: 0, y: h * 0.4 },
          { id: uid(), x: w * 0.2, y: h * 0.1 },
          { id: uid(), x: cx, y: 0 },
          { id: uid(), x: w * 0.8, y: h * 0.1 },
          { id: uid(), x: w, y: h * 0.4 },
          { id: uid(), x: w, y: h },
        ];
      default:
        return [
          { id: uid(), x: 0, y: 0 },
          { id: uid(), x: w, y: 0 },
          { id: uid(), x: w, y: h },
          { id: uid(), x: 0, y: h },
        ];
    }
  }, []);

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

      // Initial auto-fit zoom
      setTimeout(() => {
        if (viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const scaleX = (rect.width * 0.75) / initialW;
          const scaleY = (rect.height * 0.75) / initialH;
          const fitScale = Math.max(1, Math.min(scaleX, scaleY, 8));
          setScale(fitScale);
          setPan({
            x: (rect.width - initialW * fitScale) / 2,
            y: (rect.height - initialH * fitScale) / 2,
          });
        }
      }, 50);
    }
  }, [isOpen, itemW, itemH, initialKnots, generatePresetKnots]);

  // Generate SVG Path data `d`
  const pathData = useMemo(() => {
    if (knots.length < 2) return '';
    let d = `M ${knots[0].x.toFixed(2)} ${knots[0].y.toFixed(2)}`;
    for (let i = 1; i < knots.length; i++) {
      const k = knots[i];
      d += ` L ${k.x.toFixed(2)} ${k.y.toFixed(2)}`;
    }
    d += ' Z';
    return d;
  }, [knots]);

  // Coordinate conversion: Screen (px) -> Canvas (mm)
  const screenToCanvas = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    if (!viewportRef.current) return { x: 0, y: 0 };
    const rect = viewportRef.current.getBoundingClientRect();
    const vx = screenX - rect.left - pan.x;
    const vy = screenY - rect.top - pan.y;
    return {
      x: Math.round((vx / scale) * 100) / 100,
      y: Math.round((vy / scale) * 100) / 100,
    };
  }, [pan, scale]);

  // Mouse Wheel Zoom centered at cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(0.3, Math.min(25, scale * zoomFactor));

    // Calculate new pan to keep mouse pointer anchored in canvas coordinates
    const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  }, [scale, pan]);

  // Center & Fit view helper
  const handleFitView = useCallback(() => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const scaleX = (rect.width * 0.75) / maskW;
    const scaleY = (rect.height * 0.75) / maskH;
    const fitScale = Math.max(0.5, Math.min(scaleX, scaleY, 15));
    setScale(fitScale);
    setPan({
      x: (rect.width - maskW * fitScale) / 2,
      y: (rect.height - maskH * fitScale) / 2,
    });
  }, [maskW, maskH]);

  // Find nearest segment line to mouse position for adding candidate knots
  const findNearestSegment = useCallback((pos: { x: number; y: number }) => {
    if (knots.length < 2) return null;
    let minDistance = Infinity;
    let bestIndex = -1;
    let projPoint = { x: 0, y: 0 };

    for (let i = 0; i < knots.length; i++) {
      const p1 = knots[i];
      const p2 = knots[(i + 1) % knots.length];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;

      const t = Math.max(0, Math.min(1, ((pos.x - p1.x) * dx + (pos.y - p1.y) * dy) / lenSq));
      const px = p1.x + t * dx;
      const py = p1.y + t * dy;

      const dist = Math.hypot(pos.x - px, pos.y - py);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
        projPoint = { x: Math.round(px * 100) / 100, y: Math.round(py * 100) / 100 };
      }
    }

    const pixelDist = minDistance * scale;
    if (pixelDist <= 16) {
      return { index: bestIndex, ...projPoint };
    }
    return null;
  }, [knots, scale]);

  const isSpacePressedRef = useRef<boolean>(false);

  // Mouse Handlers on Viewport Canvas
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || isSpacePressedRef.current || activeTool === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    if (e.button !== 0) return;
    const pos = screenToCanvas(e.clientX, e.clientY);

    if (activeTool === 'pen') {
      const newKnot: VectorKnot = { id: uid(), x: pos.x, y: pos.y };
      const newKnots = [...knots, newKnot];
      setKnots(newKnots);
      setSelectedKnotId(newKnot.id);
      pushHistory(newKnots);
      return;
    }

    if (candidatePoint) {
      const newKnot: VectorKnot = { id: uid(), x: candidatePoint.x, y: candidatePoint.y };
      const newKnots = [...knots];
      newKnots.splice(candidatePoint.index + 1, 0, newKnot);
      setKnots(newKnots);
      setSelectedKnotId(newKnot.id);
      setCandidatePoint(null);
      pushHistory(newKnots);
      setIsDraggingKnot(true);
      return;
    }

    if (e.target instanceof SVGPolygonElement || e.target instanceof SVGPathElement) {
      setIsDraggingShape(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialKnots: JSON.parse(JSON.stringify(knots)),
      };
      return;
    }

    setSelectedKnotId(null);
  }, [activeTool, pan, screenToCanvas, knots, candidatePoint, pushHistory]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      return;
    }

    if (isDraggingKnot && selectedKnotId) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setKnots(prev =>
        prev.map(k => (k.id === selectedKnotId ? { ...k, x: pos.x, y: pos.y } : k))
      );
      return;
    }

    if (isDraggingShape) {
      const dx_mm = (e.clientX - dragStartRef.current.x) / scale;
      const dy_mm = (e.clientY - dragStartRef.current.y) / scale;
      setKnots(
        dragStartRef.current.initialKnots.map(k => ({
          ...k,
          x: Math.round((k.x + dx_mm) * 100) / 100,
          y: Math.round((k.y + dy_mm) * 100) / 100,
        }))
      );
      return;
    }

    if (activeTool === 'select' || activeTool === 'add_knot') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const nearest = findNearestSegment(pos);
      setCandidatePoint(nearest);
    }
  }, [isPanning, isDraggingKnot, selectedKnotId, isDraggingShape, screenToCanvas, scale, activeTool, findNearestSegment]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
    if (isDraggingKnot || isDraggingShape) {
      setIsDraggingKnot(false);
      setIsDraggingShape(false);
      pushHistory(knots);
    }
  }, [isPanning, isDraggingKnot, isDraggingShape, knots, pushHistory]);

  // Knot interaction
  const handleKnotMouseDown = (e: React.MouseEvent, knotId: string) => {
    e.stopPropagation();
    if (activeTool === 'select' || activeTool === 'pen') {
      setSelectedKnotId(knotId);
      setIsDraggingKnot(true);
    }
  };

  // Delete selected knot
  const handleDeleteSelectedKnot = useCallback(() => {
    if (!selectedKnotId || knots.length <= 3) return;
    const newKnots = knots.filter(k => k.id !== selectedKnotId);
    setKnots(newKnots);
    setSelectedKnotId(null);
    pushHistory(newKnots);
  }, [selectedKnotId, knots, pushHistory]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedKnotId && knots.length > 3) {
          e.preventDefault();
          handleDeleteSelectedKnot();
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'Escape') {
        setSelectedKnotId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedKnotId, knots, handleDeleteSelectedKnot]);

  // Transformations
  const handleFlip = (axis: 'h' | 'v') => {
    const newKnots = knots.map(k => ({
      ...k,
      x: axis === 'h' ? Math.round((maskW - k.x) * 100) / 100 : k.x,
      y: axis === 'v' ? Math.round((maskH - k.y) * 100) / 100 : k.y,
    }));
    setKnots(newKnots);
    pushHistory(newKnots);
  };

  const handleRotate = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    const cx = maskW / 2;
    const cy = maskH / 2;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const newKnots = knots.map(k => {
      const rx = k.x - cx;
      const ry = k.y - cy;
      return {
        ...k,
        x: Math.round((cx + rx * cos - ry * sin) * 100) / 100,
        y: Math.round((cy + rx * sin + ry * cos) * 100) / 100,
      };
    });
    setKnots(newKnots);
    pushHistory(newKnots);
  };

  const handleCenterAlign = () => {
    if (knots.length === 0) return;
    const xs = knots.map(k => k.x);
    const ys = knots.map(k => k.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const currentCx = (minX + maxX) / 2;
    const currentCy = (minY + maxY) / 2;
    const targetCx = maskW / 2;
    const targetCy = maskH / 2;
    const dx = targetCx - currentCx;
    const dy = targetCy - currentCy;

    const newKnots = knots.map(k => ({
      ...k,
      x: Math.round((k.x + dx) * 100) / 100,
      y: Math.round((k.y + dy) * 100) / 100,
    }));
    setKnots(newKnots);
    pushHistory(newKnots);
  };

  const handleOffsetMargin = (offset_mm: number) => {
    if (knots.length === 0) return;
    const cx = maskW / 2;
    const cy = maskH / 2;
    const newKnots = knots.map(k => {
      const dx = k.x - cx;
      const dy = k.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return k;
      const factor = (dist + offset_mm) / dist;
      return {
        ...k,
        x: Math.round((cx + dx * factor) * 100) / 100,
        y: Math.round((cy + dy * factor) * 100) / 100,
      };
    });
    setKnots(newKnots);
    pushHistory(newKnots);
  };

  // Import SVG
  const handleSvgImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const svgText = ev.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const polygonEl = doc.querySelector('polygon');
      const rectEl = doc.querySelector('rect');
      const circleEl = doc.querySelector('circle');

      if (polygonEl) {
        const pointsAttr = polygonEl.getAttribute('points') || '';
        const pairs = pointsAttr.trim().split(/[\s,]+/);
        const newKnots: VectorKnot[] = [];
        for (let i = 0; i < pairs.length; i += 2) {
          const x = parseFloat(pairs[i]);
          const y = parseFloat(pairs[i + 1]);
          if (!isNaN(x) && !isNaN(y)) {
            newKnots.push({ id: uid(), x, y });
          }
        }
        if (newKnots.length >= 3) {
          setKnots(newKnots);
          pushHistory(newKnots);
        }
      } else if (rectEl) {
        const w = parseFloat(rectEl.getAttribute('width') || '100');
        const h = parseFloat(rectEl.getAttribute('height') || '100');
        const x = parseFloat(rectEl.getAttribute('x') || '0');
        const y = parseFloat(rectEl.getAttribute('y') || '0');
        const newKnots: VectorKnot[] = [
          { id: uid(), x, y },
          { id: uid(), x: x + w, y },
          { id: uid(), x: x + w, y: y + h },
          { id: uid(), x: 0, y: y + h },
        ];
        setKnots(newKnots);
        pushHistory(newKnots);
      } else if (circleEl) {
        const cx = parseFloat(circleEl.getAttribute('cx') || '50');
        const cy = parseFloat(circleEl.getAttribute('cy') || '50');
        const r = parseFloat(circleEl.getAttribute('r') || '50');
        const newKnots = generatePresetKnots('circle', r * 2, r * 2).map(k => ({
          ...k,
          x: k.x + (cx - r),
          y: k.y + (cy - r),
        }));
        setKnots(newKnots);
        pushHistory(newKnots);
      } else {
        const defaultKnots = generatePresetKnots('rect', maskW, maskH);
        setKnots(defaultKnots);
        pushHistory(defaultKnots);
      }
    };
    reader.readAsText(file);
  };

  // Export SVG Download
  const handleExportSvg = () => {
    const svgCode = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${maskW}mm" height="${maskH}mm" viewBox="0 0 ${maskW} ${maskH}" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" fill="none" stroke="${dieLineColor}" stroke-width="0.2" vector-effect="non-scaling-stroke" />
</svg>`;
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
      h_mm: maskH,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".svg"
        onChange={handleSvgImport}
        className="hidden"
      />

      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/90 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 shadow-2xs">
              <PenTool size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                  Vector Mask Editor
                </h3>
                <span className="text-[10px] bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full border border-violet-200">
                  Khuôn Bế & Điểm Neo Vector
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Kích thước tem: <span className="text-violet-700 font-bold">{maskW} × {maskH} mm</span> • Tổng số điểm neo (Knots): <span className="text-emerald-700 font-bold">{knots.length}</span>
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200 shadow-2xs cursor-pointer"
              title="Hoàn tác (Ctrl+Z)"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200 shadow-2xs cursor-pointer"
              title="Làm lại (Ctrl+Shift+Z)"
            >
              <RotateCw size={15} />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() => setScale(s => Math.min(25, s * 1.2))}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition border border-slate-200 shadow-2xs cursor-pointer"
              title="Phóng to (Zoom In)"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => setScale(s => Math.max(0.3, s / 1.2))}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition border border-slate-200 shadow-2xs cursor-pointer"
              title="Thu nhỏ (Zoom Out)"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={handleFitView}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition border border-slate-200 shadow-2xs cursor-pointer"
              title="Căn vừa màn hình (Fit View)"
            >
              Fit
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer border border-slate-200 shadow-2xs"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 Columns (Canvas Viewport + Tool Sidebar) */}
        <div className="flex-1 flex min-h-0 relative">
          {/* LEFT: Interactive Viewport */}
          <div
            ref={viewportRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`flex-1 relative bg-slate-100 overflow-hidden cursor-${activeTool === 'pan' ? 'grab' : candidatePoint ? 'copy' : 'default'} select-none`}
            style={{
              backgroundImage: showGrid
                ? 'radial-gradient(circle, rgba(148, 163, 184, 0.45) 1px, transparent 1px)'
                : 'none',
              backgroundSize: `${scale * 10}px ${scale * 10}px`,
            }}
          >
            {/* SVG Interactive Canvas */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                {/* Background Bounding Box */}
                <rect
                  x={0}
                  y={0}
                  width={maskW}
                  height={maskH}
                  fill="rgba(255, 255, 255, 0.95)"
                  stroke="rgba(148, 163, 184, 0.6)"
                  strokeWidth={0.6 / scale}
                  strokeDasharray={`${3 / scale}, ${3 / scale}`}
                />

                {/* Background Image Reference (if present) */}
                {imageUrl && showBgImage && (
                  <image
                    href={imageUrl}
                    x={0}
                    y={0}
                    width={maskW}
                    height={maskH}
                    preserveAspectRatio="none"
                    opacity={bgImageOpacity}
                  />
                )}

                {/* Mask Overlay Mode Backdrop */}
                {previewMode === 'mask_overlay' && (
                  <path
                    d={`M -1000 -1000 L ${maskW + 1000} -1000 L ${maskW + 1000} ${maskH + 1000} L -1000 ${maskH + 1000} Z ${pathData}`}
                    fill="rgba(15, 23, 42, 0.6)"
                    fillRule="evenodd"
                  />
                )}

                {/* The Vector Shape Fill / Stroke */}
                <path
                  d={pathData}
                  fill={previewMode === 'cut_preview' ? 'none' : 'rgba(139, 92, 246, 0.12)'}
                  stroke={dieLineColor}
                  strokeWidth={dieLineWidth / scale}
                  className="pointer-events-auto cursor-move"
                />

                {/* Segment candidate point on hover */}
                {candidatePoint && (
                  <g>
                    <circle
                      cx={candidatePoint.x}
                      cy={candidatePoint.y}
                      r={4.5 / scale}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth={1.5 / scale}
                    />
                    <text
                      x={candidatePoint.x + 6 / scale}
                      y={candidatePoint.y - 6 / scale}
                      fill="#059669"
                      fontSize={9 / scale}
                      fontWeight="bold"
                    >
                      + Thêm điểm
                    </text>
                  </g>
                )}

                {/* Interactive Knots (Points) */}
                {knots.map((k, idx) => {
                  const isSelected = k.id === selectedKnotId;
                  const isHovered = k.id === hoveredKnotId;

                  return (
                    <g
                      key={k.id}
                      className="pointer-events-auto cursor-pointer"
                      onMouseDown={e => handleKnotMouseDown(e, k.id)}
                      onMouseEnter={() => setHoveredKnotId(k.id)}
                      onMouseLeave={() => setHoveredKnotId(null)}
                    >
                      {/* Outer touch target */}
                      <circle
                        cx={k.x}
                        cy={k.y}
                        r={8 / scale}
                        fill="transparent"
                      />

                      {/* Selection Glow */}
                      {isSelected && (
                        <circle
                          cx={k.x}
                          cy={k.y}
                          r={7 / scale}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth={2 / scale}
                        />
                      )}

                      {/* Knot Point Dot */}
                      <circle
                        cx={k.x}
                        cy={k.y}
                        r={4 / scale}
                        fill={isSelected ? '#F59E0B' : isHovered ? '#10B981' : '#FFFFFF'}
                        stroke={isSelected ? '#92400E' : isHovered ? '#065F46' : '#6366F1'}
                        strokeWidth={1.2 / scale}
                      />

                      {/* Index / Label badge */}
                      {isSelected && (
                        <g>
                          <rect
                            x={k.x + 5 / scale}
                            y={k.y - 14 / scale}
                            width={32 / scale}
                            height={12 / scale}
                            rx={3 / scale}
                            fill="rgba(255, 255, 255, 0.95)"
                            stroke="#F59E0B"
                            strokeWidth={0.6 / scale}
                          />
                          <text
                            x={k.x + 8 / scale}
                            y={k.y - 5 / scale}
                            fill="#92400E"
                            fontSize={7 / scale}
                            fontWeight="bold"
                          >
                            #{idx + 1}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Bottom floating instruction bar */}
            <div className="absolute bottom-3 left-4 bg-white/95 border border-slate-200/90 backdrop-blur-md rounded-xl px-3.5 py-1.5 flex items-center gap-4 text-[11px] text-slate-600 shadow-lg">
              <span className="flex items-center gap-1.5 font-medium">
                <MousePointer size={13} className="text-violet-600" />
                Kéo điểm neo để di chuyển
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Plus size={13} className="text-emerald-600" />
                Rê vào cạnh để thêm điểm
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Trash2 size={13} className="text-rose-500" />
                Chọn điểm + bấm Delete để xóa
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">Cuộn chuột để Zoom • Giữ Space/chuột giữa để Pan</span>
            </div>
          </div>

          {/* RIGHT: Tools & Parameters Sidebar */}
          <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col overflow-y-auto flex-shrink-0">
            {/* Tabs */}
            <div className="grid grid-cols-3 p-1.5 bg-slate-100/90 border-b border-slate-200 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('tools')}
                className={`py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'tools'
                    ? 'bg-white text-violet-700 shadow-xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Sliders size={13} />
                <span>Công cụ</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'presets'
                    ? 'bg-white text-violet-700 shadow-xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Sparkles size={13} />
                <span>Mẫu khuôn</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-white text-violet-700 shadow-xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers size={13} />
                <span>Hiển thị</span>
              </button>
            </div>

            {/* TAB 1: TOOLS & KNOTS */}
            {activeTab === 'tools' && (
              <div className="p-3.5 space-y-4 flex-1">
                {/* Tool Mode Select */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Chế độ thao tác
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTool('select')}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition cursor-pointer ${
                        activeTool === 'select'
                          ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <MousePointer size={15} />
                      <span className="text-[10px]">Chọn & Kéo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTool('pen')}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition cursor-pointer ${
                        activeTool === 'pen'
                          ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <PenTool size={15} />
                      <span className="text-[10px]">Vẽ tự do</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTool('pan')}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition cursor-pointer ${
                        activeTool === 'pan'
                          ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Hand size={15} />
                      <span className="text-[10px]">Di chuyển</span>
                    </button>
                  </div>
                </div>

                {/* Transform Actions */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Biến đổi hình dạng
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFlip('h')}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Lật ngang (Flip Horizontal)"
                    >
                      <FlipHorizontal size={14} />
                      <span className="text-[9px]">Lật ngang</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFlip('v')}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Lật dọc (Flip Vertical)"
                    >
                      <FlipVertical size={14} />
                      <span className="text-[9px]">Lật dọc</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotate(90)}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Xoay 90 độ"
                    >
                      <RotateCw size={14} />
                      <span className="text-[9px]">Xoay 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCenterAlign}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Căn giữa khung tem"
                    >
                      <Maximize2 size={14} />
                      <span className="text-[9px]">Căn giữa</span>
                    </button>
                  </div>
                </div>

                {/* Offset / Bleed Expand & Contract */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Bù viền / Co giãn khuôn (Offset)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOffsetMargin(1)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 text-xs font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Nở ra (+1mm)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOffsetMargin(-1)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 text-xs font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <span>-</span>
                      <span>Co lại (-1mm)</span>
                    </button>
                  </div>
                </div>

                {/* Selected Knot Coordinates & Delete Button */}
                {selectedKnotId ? (
                  <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-violet-800 flex items-center gap-1">
                        <Sparkles size={12} />
                        Điểm neo đang chọn
                      </span>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedKnot}
                        disabled={knots.length <= 3}
                        className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
                        title="Xóa điểm neo này (Delete/Backspace)"
                      >
                        <Trash2 size={11} />
                        <span>Xóa điểm</span>
                      </button>
                    </div>

                    {(() => {
                      const sel = knots.find(k => k.id === selectedKnotId);
                      if (!sel) return null;
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-1.5 rounded-lg border border-violet-100 flex justify-between items-center shadow-2xs">
                            <span className="text-slate-500 text-[10px]">X:</span>
                            <span className="font-mono font-bold text-violet-900">{sel.x.toFixed(1)} mm</span>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-violet-100 flex justify-between items-center shadow-2xs">
                            <span className="text-slate-500 text-[10px]">Y:</span>
                            <span className="font-mono font-bold text-violet-900">{sel.y.toFixed(1)} mm</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
                    Bấm vào một điểm neo trên khung vẽ để chỉnh toạ độ hoặc xóa
                  </div>
                )}

                {/* SVG Import & Export Options */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nhập & Xuất File Vector (SVG)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition shadow-2xs cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>Nhập SVG</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSvg}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition shadow-2xs cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Tải SVG</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRESET SHAPES */}
            {activeTab === 'presets' && (
              <div className="p-3.5 space-y-3 flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Chọn mẫu khuôn bế có sẵn
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'rect', label: 'Chữ nhật', icon: Square },
                    { id: 'circle', label: 'Hình tròn', icon: Circle },
                    { id: 'oval', label: 'Hình Oval', icon: Circle },
                    { id: 'trapezoid', label: 'Hình thang', icon: () => <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L4 6h16l-2 12H6z"/></svg> },
                    { id: 'triangle', label: 'Tam giác', icon: () => <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l10 18H2L12 2z"/></svg> },
                    { id: 'hexagon', label: 'Lục giác', icon: () => <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 5v10l-8 5-8-5V7l8-5z"/></svg> },
                    { id: 'star', label: 'Ngôi sao', icon: Star },
                    { id: 'heart', label: 'Trái tim', icon: Heart },
                    { id: 'badge', label: 'Con tem / Răng cưa', icon: Shield },
                    { id: 'arch', label: 'Khung Vòm (Arch)', icon: () => <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21V10a8 8 0 0 1 16 0v11H4z"/></svg> },
                  ].map(p => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const newKnots = generatePresetKnots(p.id as any, maskW, maskH);
                          setKnots(newKnots);
                          setSelectedKnotId(null);
                          pushHistory(newKnots);
                        }}
                        className="p-2.5 rounded-xl bg-white hover:bg-violet-50/80 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-800 flex items-center gap-2 text-xs font-medium transition cursor-pointer shadow-2xs"
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-violet-600 shrink-0">
                          <Icon size={14} />
                        </div>
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: DISPLAY & PREVIEW SETTINGS */}
            {activeTab === 'settings' && (
              <div className="p-3.5 space-y-4 flex-1">
                {/* Background Image Tracing Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Ảnh nguồn tham chiếu
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBgImage(!showBgImage)}
                      className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {showBgImage ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{showBgImage ? 'Đang bật' : 'Đã ẩn'}</span>
                    </button>
                  </div>

                  {showBgImage && (
                    <div>
                      <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                        <span>Độ mờ ảnh nền:</span>
                        <span className="font-bold text-violet-700">{Math.round(bgImageOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={bgImageOpacity}
                        onChange={e => setBgImageOpacity(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Die Line Styling */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Màu đường khuôn cắt (Die Line)
                  </label>
                  <div className="flex gap-2">
                    {[
                      { color: '#FF007F', label: 'Magenta' },
                      { color: '#00FFFF', label: 'Cyan' },
                      { color: '#10B981', label: 'Green' },
                      { color: '#EF4444', label: 'Red' },
                      { color: '#000000', label: 'Black' },
                    ].map(c => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setDieLineColor(c.color)}
                        className={`w-7 h-7 rounded-lg border-2 transition cursor-pointer ${
                          dieLineColor === c.color ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview Modes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Chế độ xem trước
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'die_line', label: 'Chỉ đường khuôn bế' },
                      { id: 'mask_overlay', label: 'Mặt nạ phủ ngoài (Dim Overlay)' },
                      { id: 'cut_preview', label: 'Mô phỏng nhãn cắt rời' },
                    ].map(m => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                          previewMode === m.id
                            ? 'bg-violet-50 border-violet-400 text-violet-900 font-semibold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="preview_mode"
                          checked={previewMode === m.id}
                          onChange={() => setPreviewMode(m.id as any)}
                          className="text-violet-600 focus:ring-0"
                        />
                        <span>{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Grid & Helpers Toggle */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600">Lưới toạ độ (Grid):</span>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={e => setShowGrid(e.target.checked)}
                    className="rounded text-violet-600 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Khuôn bế Vector sẵn sàng
            </span>
            <span>•</span>
            <span>{knots.length} điểm neo khép kín</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-violet-500/20 cursor-pointer active:scale-98"
            >
              <Check size={16} />
              <span>Áp dụng Vector Mask</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
