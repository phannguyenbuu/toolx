import React, { useState, useRef, useEffect, useCallback } from 'react';
import Konva from 'konva';
import { ElementData, ElementType, PageConfig, UploadedImage, SheetRow, generateId, pxToMm, mmToPx } from './types';
import fontService from '../../services/fontService';
import { useCanvasAlignment } from './hooks/useCanvasAlignment';
import { useCanvasBackground } from './hooks/useCanvasBackground';
import { useCanvasZoomPan } from './hooks/useCanvasZoomPan';

const HISTORY_DEBOUNCE_MS = 300;

export function useLabelDesignerCanvas(
  elements: ElementData[],
  setElements: React.Dispatch<React.SetStateAction<ElementData[]>>,
  pageConfig: PageConfig,
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>,
  saveToHistory: (elements: ElementData[]) => void,
  uploadedImages: UploadedImage[],
  dataRows: SheetRow[],
  currentRowIndex: number,
  handleUndo: () => void,
  handleRedo: () => void
) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sub-hook 1: Zoom and pan
  const zoomPan = useCanvasZoomPan(pageConfig);

  // Sub-hook 2: Background image
  const background = useCanvasBackground(pageConfig, setPageConfig);

  // Sub-hook 3: Alignment, distribute, z-index
  const alignment = useCanvasAlignment(
    elements,
    setElements,
    selectedIds,
    saveToHistory,
    pageConfig
  );

  const [availableFonts, setAvailableFonts] = useState<string[]>([
    'UTM Avo',
    'UTM Agin',
    'Tahoma',
    'Arial'
  ]);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());

  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(5);

  const [selectionMode, setSelectionMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load font list
  useEffect(() => {
    const systemFonts = [
      'Tahoma',
      'Arial',
      'Verdana',
      'Georgia',
      'Times New Roman',
      'Courier New',
      'Roboto',
      'Open Sans',
      'Lato',
      'Montserrat',
      'Oswald'
    ];
    fetch('/fonts/fonts.json')
      .then(r => r.json())
      .then((data: Array<{ name: string; file: string }>) => {
        const fontNames = data.map(f => f.name).filter(Boolean);
        setAvailableFonts(Array.from(new Set([...systemFonts, ...fontNames])));
      })
      .catch(() => {
        fontService.getAvailableFonts().then(fonts => {
          if (fonts && fonts.length > 0) {
            const fontNames = fonts
              .map((f: any) => (typeof f === 'string' ? f : f.name))
              .filter(Boolean);
            setAvailableFonts(Array.from(new Set([...systemFonts, ...fontNames])));
          }
        });
      });
  }, []);

  // Bind transformer nodes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    const selectedNodes = selectedIds
      .map(id => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    transformerRef.current.nodes(selectedNodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  // Image caching for canvas rendering
  useEffect(() => {
    let isMounted = true;
    elements.forEach(el => {
      if ((el.type === 'image' || el.type === 'img-data') && el.src && !loadedImages.has(el.src)) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (isMounted) setLoadedImages(prev => new Map(prev).set(el.src!, img));
        };
        img.src = el.src;
      }
    });

    uploadedImages.forEach(uploaded => {
      if (uploaded.src && !loadedImages.has(uploaded.src)) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (isMounted) setLoadedImages(prev => new Map(prev).set(uploaded.src, img));
        };
        img.src = uploaded.src;
      }
    });

    elements.forEach(el => {
      if (el.type === 'img-data' && el.dataType === 'url' && el.content) {
        const value = el.content.replace(/\{([^}]+)\}/g, (_, key) => {
          const row = dataRows[currentRowIndex];
          return row ? row[key] || '' : '';
        });
        if (value && !value.includes('{') && value.startsWith('http') && !loadedImages.has(value)) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (isMounted) setLoadedImages(prev => new Map(prev).set(value, img));
          };
          img.src = value;
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [elements, uploadedImages, loadedImages, dataRows, currentRowIndex]);

  const snapValue = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  const addElement = useCallback(
    (type: ElementType) => {
      const newElement: ElementData = {
        id: generateId(),
        type,
        x: 20,
        y: 20,
        width: type === 'text' ? 80 : 50,
        height: type === 'text' ? 20 : 50,
        content:
          type === 'text'
            ? 'Text mới'
            : type === 'qr'
            ? 'QR Code'
            : type === 'barcode'
            ? '123456789'
            : '',
        fontFamily: 'UTM Avo',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#000000',
        backgroundColor: type === 'box' ? '#e5e7eb' : 'transparent',
        borderColor: '#000000',
        borderWidth: type === 'box' ? 1 : 0,
        textAlignH: 'left',
        textAlignV: 'top',
        rotate: 0,
        opacity: 1,
        isLocked: false,
        isVisible: true,
        ...(type === 'img-data' && {
          dataType: 'filename',
          matchMode: 'contains',
          ignoreExtension: false,
          bidirectional: false
        })
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      saveToHistory(newElements);
      setSelectedIds([newElement.id]);
    },
    [elements, saveToHistory, setElements]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<ElementData>) => {
      const newElements = elements.map(el => (el.id === id ? { ...el, ...updates } : el));
      setElements(newElements);
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
      historyTimerRef.current = setTimeout(() => {
        saveToHistory(newElements);
      }, HISTORY_DEBOUNCE_MS);
    },
    [elements, saveToHistory, setElements]
  );

  const deleteSelected = useCallback(() => {
    const newElements = elements.filter(el => !selectedIds.includes(el.id));
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedIds([]);
  }, [elements, selectedIds, saveToHistory, setElements]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const newElements: ElementData[] = [];
    selectedIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el) {
        newElements.push({
          ...el,
          id: generateId(),
          x: el.x + 5,
          y: el.y + 5
        });
      }
    });
    const updated = [...elements, ...newElements];
    setElements(updated);
    saveToHistory(updated);
    setSelectedIds(newElements.map(e => e.id));
  }, [elements, selectedIds, saveToHistory, setElements]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isPageBg = e.target.getClassName() === 'Rect' && e.target.fill() === 'white';
    if (e.target === e.target.getStage() || isPageBg) {
      setSelectedIds([]);
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const target = e.target;
    const isPageBackground = target.getClassName() === 'Rect' && target.fill() === 'white';
    const isStageBackground = target === stage;
    if (!isStageBackground && !isPageBackground) return;

    if (selectionMode) {
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      setIsSelecting(true);
      selectionStartRef.current = { x: pos.x, y: pos.y };
      setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    } else {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      zoomPan.setIsPanning(true);
      zoomPan.panStartRef.current = {
        x: pointer.x,
        y: pointer.y,
        stageX: zoomPan.stagePos.x,
        stageY: zoomPan.stagePos.y
      };
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (isSelecting && selectionStartRef.current) {
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      const start = selectionStartRef.current;
      const x = Math.min(start.x, pos.x);
      const y = Math.min(start.y, pos.y);
      const width = Math.abs(pos.x - start.x);
      const height = Math.abs(pos.y - start.y);
      setSelectionRect({ x, y, width, height });
      return;
    }

    if (zoomPan.isPanning && zoomPan.panStartRef.current) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const dx = pointer.x - zoomPan.panStartRef.current.x;
      const dy = pointer.y - zoomPan.panStartRef.current.y;
      zoomPan.setStagePos({
        x: zoomPan.panStartRef.current.stageX + dx,
        y: zoomPan.panStartRef.current.stageY + dy
      });
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionRect) {
      const rectX1 = pxToMm(selectionRect.x);
      const rectY1 = pxToMm(selectionRect.y);
      const rectX2 = pxToMm(selectionRect.x + selectionRect.width);
      const rectY2 = pxToMm(selectionRect.y + selectionRect.height);

      const intersecting = elements.filter(el => {
        if (el.rotate && el.rotate !== 0) {
          const centerX = el.x + el.width / 2;
          const centerY = el.y + el.height / 2;
          return centerX >= rectX1 && centerX <= rectX2 && centerY >= rectY1 && centerY <= rectY2;
        }
        const elX1 = el.x;
        const elY1 = el.y;
        const elX2 = el.x + el.width;
        const elY2 = el.y + el.height;
        return !(elX2 < rectX1 || elX1 > rectX2 || elY2 < rectY1 || elY1 > rectY2);
      });

      setSelectedIds(intersecting.map(el => el.id));
    }

    setIsSelecting(false);
    selectionStartRef.current = null;
    setSelectionRect(null);
    zoomPan.setIsPanning(false);
    zoomPan.panStartRef.current = null;
  };

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
      const node = e.target;
      const x = snapValue(pxToMm(node.x()));
      const y = snapValue(pxToMm(node.y()));
      node.x(mmToPx(x));
      node.y(mmToPx(y));
      const newEls = elements.map(el => (el.id === id ? { ...el, x, y } : el));
      setElements(newEls);
      saveToHistory(newEls);
    },
    [elements, saveToHistory, snapValue, setElements]
  );

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, id: string) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      const x = snapValue(pxToMm(node.x()));
      const y = snapValue(pxToMm(node.y()));
      const width = snapValue(pxToMm(node.width() * scaleX));
      const height = snapValue(pxToMm(node.height() * scaleY));

      const newEls = elements.map(el =>
        el.id === id ? { ...el, x, y, width, height, rotate: node.rotation() } : el
      );
      setElements(newEls);
      saveToHistory(newEls);

      requestAnimationFrame(() => {
        node.scaleX(1);
        node.scaleY(1);
        node.x(mmToPx(x));
        node.y(mmToPx(y));
        node.width(mmToPx(width));
        node.height(mmToPx(height));
        node.getLayer()?.batchDraw();
      });
    },
    [elements, saveToHistory, snapValue, setElements]
  );

  const { handleZoomFit } = zoomPan;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        addElement('text');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'v' || e.key === 'V') {
        setSelectionMode(prev => !prev);
      } else if (e.key === 'g' || e.key === 'G') {
        if (e.shiftKey) setSnapToGrid(prev => !prev);
        else setShowGrid(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        handleZoomFit();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duplicateSelected, deleteSelected, handleUndo, handleRedo, handleZoomFit, addElement]);

  return {
    stageRef,
    transformerRef,
    containerRef: zoomPan.containerRef,
    zoom: zoomPan.zoom,
    setZoom: zoomPan.setZoom,
    stagePos: zoomPan.stagePos,
    setStagePos: zoomPan.setStagePos,
    containerSize: zoomPan.containerSize,
    handleWheel: zoomPan.handleWheel,
    handleZoomFit: zoomPan.handleZoomFit,
    backgroundInputRef: background.backgroundInputRef,
    backgroundImage: background.backgroundImage,
    handleBackgroundUpload: background.handleBackgroundUpload,
    getBackgroundImageProps: background.getBackgroundImageProps,
    alignElements: alignment.alignElements,
    distributeElements: alignment.distributeElements,
    moveZIndex: alignment.moveZIndex,
    elements,
    setElements,
    selectedIds,
    setSelectedIds,
    availableFonts,
    loadedImages,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,
    selectionMode,
    setSelectionMode,
    selectionRect,
    snapValue,
    addElement,
    updateElement,
    deleteSelected,
    duplicateSelected,
    handleStageClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDragEnd,
    handleTransformEnd
  };
}
