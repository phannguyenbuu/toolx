import { useState, useRef, useCallback, useEffect } from 'react';
import { VectorKnot, ToolMode } from '../types';
import { uid } from '../helpers/shapePresets';
import { findNearestSegment } from '../helpers/transformUtils';

interface UseVectorMaskCanvasParams {
  isOpen: boolean;
  maskW: number;
  maskH: number;
  knots: VectorKnot[];
  setKnots: React.Dispatch<React.SetStateAction<VectorKnot[]>>;
  selectedKnotId: string | null;
  setSelectedKnotId: (id: string | null) => void;
  candidatePoint: { x: number; y: number; index: number } | null;
  setCandidatePoint: (pt: { x: number; y: number; index: number } | null) => void;
  activeTool: ToolMode;
  pushHistory: (newKnots: VectorKnot[]) => void;
  undo: () => void;
  redo: () => void;
  handleDeleteSelectedKnot: () => void;
}

export function useVectorMaskCanvas({
  isOpen,
  maskW,
  maskH,
  knots,
  setKnots,
  selectedKnotId,
  setSelectedKnotId,
  candidatePoint,
  setCandidatePoint,
  activeTool,
  pushHistory,
  undo,
  redo,
  handleDeleteSelectedKnot
}: UseVectorMaskCanvasParams) {
  // Viewport Transform (Zoom & Pan)
  const [scale, setScale] = useState<number>(4);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0
  });

  // Dragging Knot or Shape
  const [isDraggingKnot, setIsDraggingKnot] = useState<boolean>(false);
  const [isDraggingShape, setIsDraggingShape] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; initialKnots: VectorKnot[] }>({
    x: 0,
    y: 0,
    initialKnots: []
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const isSpacePressedRef = useRef<boolean>(false);

  // Auto-fit view
  const handleFitView = useCallback(() => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const scaleX = (rect.width * 0.75) / maskW;
    const scaleY = (rect.height * 0.75) / maskH;
    const fitScale = Math.max(0.5, Math.min(scaleX, scaleY, 15));
    setScale(fitScale);
    setPan({
      x: (rect.width - maskW * fitScale) / 2,
      y: (rect.height - maskH * fitScale) / 2
    });
  }, [maskW, maskH]);

  // Initial fit on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        handleFitView();
      }, 50);
    }
  }, [isOpen, handleFitView]);

  // Coordinate conversion: Screen (px) -> Canvas (mm)
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      if (!viewportRef.current) return { x: 0, y: 0 };
      const rect = viewportRef.current.getBoundingClientRect();
      const vx = screenX - rect.left - pan.x;
      const vy = screenY - rect.top - pan.y;
      return {
        x: Math.round((vx / scale) * 100) / 100,
        y: Math.round((vy / scale) * 100) / 100
      };
    },
    [pan, scale]
  );

  // Mouse Wheel Zoom centered at cursor
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newScale = Math.max(0.3, Math.min(25, scale * zoomFactor));

      const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
      const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    },
    [scale, pan]
  );

  // Space key listener for Pan
  useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = e.type === 'keydown';
      }
    };
    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, []);

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
  }, [isOpen, selectedKnotId, knots, handleDeleteSelectedKnot, undo, redo, setSelectedKnotId]);

  // Viewport Mouse Down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.button === 1 ||
        e.button === 2 ||
        isSpacePressedRef.current ||
        activeTool === 'pan'
      ) {
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

      if (
        e.target instanceof SVGPolygonElement ||
        e.target instanceof SVGPathElement
      ) {
        setIsDraggingShape(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          initialKnots: JSON.parse(JSON.stringify(knots))
        };
        return;
      }

      setSelectedKnotId(null);
    },
    [activeTool, pan, screenToCanvas, knots, candidatePoint, pushHistory, setKnots, setSelectedKnotId, setCandidatePoint]
  );

  // Viewport Mouse Move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
        return;
      }

      if (isDraggingKnot && selectedKnotId) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setKnots((prev) =>
          prev.map((k) => (k.id === selectedKnotId ? { ...k, x: pos.x, y: pos.y } : k))
        );
        return;
      }

      if (isDraggingShape) {
        const dx_mm = (e.clientX - dragStartRef.current.x) / scale;
        const dy_mm = (e.clientY - dragStartRef.current.y) / scale;
        setKnots(
          dragStartRef.current.initialKnots.map((k) => ({
            ...k,
            x: Math.round((k.x + dx_mm) * 100) / 100,
            y: Math.round((k.y + dy_mm) * 100) / 100
          }))
        );
        return;
      }

      if (activeTool === 'select' || activeTool === 'add_knot') {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const nearest = findNearestSegment(knots, pos, scale);
        setCandidatePoint(nearest);
      }
    },
    [isPanning, isDraggingKnot, selectedKnotId, isDraggingShape, screenToCanvas, scale, activeTool, knots, setKnots, setCandidatePoint]
  );

  // Viewport Mouse Up
  const handleMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
    if (isDraggingKnot || isDraggingShape) {
      setIsDraggingKnot(false);
      setIsDraggingShape(false);
      pushHistory(knots);
    }
  }, [isPanning, isDraggingKnot, isDraggingShape, knots, pushHistory]);

  // Knot Mouse Down
  const handleKnotMouseDown = useCallback(
    (e: React.MouseEvent, knotId: string) => {
      e.stopPropagation();
      if (activeTool === 'select' || activeTool === 'pen') {
        setSelectedKnotId(knotId);
        setIsDraggingKnot(true);
      }
    },
    [activeTool, setSelectedKnotId]
  );

  return {
    scale,
    setScale,
    pan,
    setPan,
    isPanning,
    viewportRef,
    handleFitView,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKnotMouseDown
  };
}
