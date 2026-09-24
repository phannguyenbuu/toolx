import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageData, ToolType, ViewMode, ActiveTab, ContextMenuState } from '../types';
import { RENDER_SCALE } from '../constants';
import { useFabricObjects } from './useFabricObjects';

interface UseFabricEditorProps {
  scriptsLoaded: boolean;
  pdfData: ArrayBuffer | null;
  pagesData: PageData[];
  setPagesData: React.Dispatch<React.SetStateAction<PageData[]>>;
  setIsLoading: (loading: boolean) => void;
  setLoadingText: (text: string) => void;
}

export function useFabricEditor({
  scriptsLoaded,
  pdfData,
  pagesData,
  setPagesData,
  setIsLoading,
  setLoadingText
}: UseFabricEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [curPageIndex, setCurPageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(1.0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const currentToolRef = useRef<ToolType>('select');
  const addTextRef = useRef<(pos?: { x: number; y: number }) => void>(() => {});
  const addRectRef = useRef<(pos?: { x: number; y: number }) => void>(() => {});

  // Save current page state
  const saveCurrentState = useCallback(() => {
    if (curPageIndex !== null && fabricCanvasRef.current) {
      setPagesData(prev => {
        const newData = [...prev];
        if (newData[curPageIndex]) {
          newData[curPageIndex] = {
            ...newData[curPageIndex],
            json: fabricCanvasRef.current.toJSON([
              'selectable',
              'evented',
              'fontFamily',
              'fontWeight',
              'fontStyle',
              'underline'
            ])
          };
        }
        return newData;
      });
      objects.renderLayers();
    }
  }, [curPageIndex, setPagesData]);

  // Object management hook
  const objects = useFabricObjects({
    fabricCanvasRef,
    onStateChange: saveCurrentState
  });

  // Initialize Fabric canvas when entering studio mode
  useEffect(() => {
    if (viewMode === 'studio' && canvasRef.current && scriptsLoaded && window.fabric) {
      if (!fabricCanvasRef.current) {
        fabricCanvasRef.current = new window.fabric.Canvas(canvasRef.current, {
          preserveObjectStacking: true,
          selection: true,
          fireRightClick: true,
          stopContextMenu: true
        });

        const canvas = fabricCanvasRef.current;

        canvas.on('selection:created', objects.handleObjectSelect);
        canvas.on('selection:updated', objects.handleObjectSelect);
        canvas.on('selection:cleared', objects.handleObjectClear);
        canvas.on('object:modified', saveCurrentState);
        canvas.on('object:added', saveCurrentState);
        canvas.on('object:removed', saveCurrentState);

        canvas.on('mouse:down', (opt: any) => {
          setContextMenu(prev => ({ ...prev, visible: false }));

          if (opt.button === 3 && opt.target) {
            canvas.setActiveObject(opt.target);
            setContextMenu({ x: opt.e.clientX, y: opt.e.clientY, visible: true });
            return;
          }

          const tool = currentToolRef.current;
          if (tool === 'text') {
            addTextRef.current(opt.pointer);
            setCurrentTool('select');
          } else if (tool === 'rect') {
            addRectRef.current(opt.pointer);
            setCurrentTool('select');
          }
        });
      }
    }
  }, [viewMode, scriptsLoaded, objects.handleObjectSelect, objects.handleObjectClear, saveCurrentState]);

  // Tools
  const setTool = useCallback((tool: ToolType) => {
    setCurrentTool(tool);
    currentToolRef.current = tool;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (tool === 'select') {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      canvas.forEachObject((obj: any) => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else {
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.discardActiveObject();
      canvas.forEachObject((obj: any) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }
    canvas.requestRenderAll();
  }, []);

  // Keep refs in sync
  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  useEffect(() => {
    addTextRef.current = objects.addText;
  }, [objects.addText]);

  useEffect(() => {
    addRectRef.current = objects.addRect;
  }, [objects.addRect]);

  // Zoom methods
  const applyZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(0.2, Math.min(4.0, prev + delta)));
  }, []);

  const autoFitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = fabricCanvasRef.current;
    if (!viewport || !canvas) return;

    const viewportWidth = viewport.clientWidth - 100;
    const viewportHeight = viewport.clientHeight - 100;
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const scaleX = viewportWidth / canvasWidth;
    const scaleY = viewportHeight / canvasHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1.5);

    setZoom(Math.max(0.2, fitZoom));
  }, []);

  // Studio open / exit
  const exitStudio = useCallback(() => {
    saveCurrentState();
    setViewMode('dashboard');
    setActiveTab('stats');
    setCurPageIndex(null);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
    }
  }, [saveCurrentState]);

  const openStudio = useCallback(
    async (idx: number) => {
      if (!scriptsLoaded || !pdfData) return;

      if (curPageIndex !== null) {
        saveCurrentState();
      }

      setCurPageIndex(idx);
      setViewMode('studio');
      setActiveTab('layers');
      setIsLoading(true);
      setLoadingText('Đang tải trang độ phân giải cao...');

      try {
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(pdfData.slice(0)) }).promise;
        const page = await doc.getPage(pagesData[idx].num);
        const viewport = page.getViewport({ scale: RENDER_SCALE });

        const c = document.createElement('canvas');
        c.width = viewport.width;
        c.height = viewport.height;
        const ctx = c.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = fabricCanvasRef.current;
        if (canvas) {
          canvas.setDimensions({ width: viewport.width, height: viewport.height });
          canvas.clear();

          window.fabric.Image.fromURL(c.toDataURL(), (img: any) => {
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
              originX: 'left',
              originY: 'top'
            });

            if (pagesData[idx].json) {
              canvas.loadFromJSON(pagesData[idx].json, canvas.renderAll.bind(canvas));
            }

            setIsLoading(false);
            objects.renderLayers();

            setTimeout(() => {
              const vp = viewportRef.current;
              if (vp) {
                const vpWidth = vp.clientWidth - 100;
                const vpHeight = vp.clientHeight - 100;
                const scaleX = vpWidth / viewport.width;
                const scaleY = vpHeight / viewport.height;
                const fitZoom = Math.min(scaleX, scaleY, 1.5);
                setZoom(Math.max(0.3, fitZoom));
              } else {
                setZoom(1.0);
              }
            }, 150);
          });
        }
      } catch (err: any) {
        setIsLoading(false);
        alert('Lỗi khi tải trang: ' + err.message);
        exitStudio();
      }
    },
    [scriptsLoaded, pdfData, curPageIndex, saveCurrentState, setIsLoading, setLoadingText, pagesData, objects, exitStudio]
  );

  // Rotate current page in studio
  const rotateCurrentPage = useCallback(() => {
    if (curPageIndex === null) return;
    setPagesData(prev => {
      const newData = [...prev];
      newData[curPageIndex] = {
        ...newData[curPageIndex],
        rotation: (newData[curPageIndex].rotation + 90) % 360
      };
      return newData;
    });
  }, [curPageIndex, setPagesData]);

  // Wheel zoom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        applyZoom(delta);
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [applyZoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const canvas = fabricCanvasRef.current;
      const activeObj = canvas?.getActiveObject();

      if ((e.key === 'Delete' || e.key === 'Backspace') && curPageIndex !== null) {
        if (activeObj && !activeObj.isEditing && canvas) {
          const active = canvas.getActiveObjects();
          if (active.length) {
            canvas.discardActiveObject();
            active.forEach((obj: any) => canvas.remove(obj));
          }
          e.preventDefault();
        }
      }

      if (viewMode === 'studio' && (!activeObj || !activeObj.isEditing)) {
        if (e.key === 'v' || e.key === 'V') {
          setTool('select');
          e.preventDefault();
        } else if (e.key === 't' || e.key === 'T') {
          setTool('text');
          e.preventDefault();
        } else if (e.key === 'r' || e.key === 'R') {
          setTool('rect');
          e.preventDefault();
        } else if (e.key === 'Escape') {
          setTool('select');
          canvas?.discardActiveObject();
          canvas?.requestRenderAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [curPageIndex, viewMode, setTool]);

  const resetEditor = useCallback(() => {
    setCurPageIndex(null);
    setZoom(1.0);
    setCurrentTool('select');
    setActiveTab('stats');
    setViewMode('dashboard');
    setContextMenu({ x: 0, y: 0, visible: false });
    objects.resetObjectState();

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }
  }, [objects]);

  return {
    viewMode,
    setViewMode,
    curPageIndex,
    setCurPageIndex,
    activeTab,
    setActiveTab,
    currentTool,
    setTool,
    zoom,
    applyZoom,
    autoFitZoom,
    activeObject: objects.activeObject,
    layers: objects.layers,
    contextMenu,
    setContextMenu,
    objColor: objects.objColor,
    textContent: objects.textContent,
    selectedFont: objects.selectedFont,
    fontSize: objects.fontSize,
    isBold: objects.isBold,
    isItalic: objects.isItalic,
    isUnderline: objects.isUnderline,
    canvasRef,
    fabricCanvasRef,
    viewportRef,
    openStudio,
    exitStudio,
    rotateCurrentPage,
    deleteActive: objects.deleteActive,
    updateActiveObj: objects.updateActiveObj,
    toggleStyle: objects.toggleStyle,
    layerAction: objects.layerAction,
    deleteCheckedLayers: objects.deleteCheckedLayers,
    saveCurrentState,
    resetEditor
  };
}
