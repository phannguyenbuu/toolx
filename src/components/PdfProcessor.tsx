import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Download, FileDown, Type, Square, MousePointer, ArrowLeft,
  RotateCw, RotateCcw, ZoomIn, ZoomOut, Trash2, ArrowUp, ArrowDown, GripVertical,
  Check, Pencil, X, Loader2, FileText, Palette, Moon, FileX, Maximize, Copy
} from 'lucide-react';

// Types
// TODO: Refactor types - Replace local interfaces with centralized API types from src/types/api.ts
interface PageData {
  idx: number;
  num: number;
  type: 'color' | 'bw' | 'blank';
  deleted: boolean;
  rotation: number;
  thumb: string;
  json: any; // TODO: Define proper type for Fabric.js canvas JSON
}

interface PdfProcessorProps {
  onClose?: () => void;
}

// Constants
const RENDER_SCALE = 1.5;
const FONTS = [
  "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", 
  "Roboto", "Open Sans", "Oswald", "Tahoma", "Courier New"
];

declare global {
  interface Window {
    pdfjsLib: any;
    PDFLib: any;
    fontkit: any;
    fabric: any;
  }
}

export const PdfProcessor: React.FC<PdfProcessorProps> = ({ onClose }) => {
  // State
  const [pagesData, setPagesData] = useState<PageData[]>([]);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // TODO: Refactor types - Use proper PDF.js types
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [curPageIndex, setCurPageIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'color' | 'bw' | 'blank'>('all');
  const [currentTool, setCurrentTool] = useState<'select' | 'text' | 'rect'>('select');
  const [activeTab, setActiveTab] = useState<'stats' | 'layers'>('stats');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'dashboard' | 'studio'>('dashboard');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [layers, setLayers] = useState<any[]>([]); // TODO: Refactor types - Define proper Fabric.js layer type
  const [activeObject, setActiveObject] = useState<any>(null); // TODO: Refactor types - Use proper Fabric.js object type
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  // Props panel state
  const [objColor, setObjColor] = useState('#000000');
  const [textContent, setTextContent] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(20);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null); // TODO: Refactor types - Use proper Fabric.js Canvas type
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const currentToolRef = useRef<'select' | 'text' | 'rect'>('select');
  const addTextRef = useRef<(pos?: { x: number; y: number }) => void>(() => {});
  const addRectRef = useRef<(pos?: { x: number; y: number }) => void>(() => {});

  // Load external scripts
  useEffect(() => {
    if (scriptsLoaded) return; // Prevent re-loading

    const loadScripts = async () => {
      const scripts = [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', id: 'pdfjs' },
        { src: 'https://unpkg.com/fabric@5.3.0/dist/fabric.min.js', id: 'fabric' },
        { src: 'https://unpkg.com/pdf-lib/dist/pdf-lib.min.js', id: 'pdflib' },
        { src: 'https://unpkg.com/@pdf-lib/fontkit/dist/fontkit.umd.min.js', id: 'fontkit' }
      ];

      for (const script of scripts) {
        if (!document.getElementById(script.id)) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = script.src;
            s.id = script.id;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error(`Failed to load ${script.src}`));
            document.head.appendChild(s);
          });
        }
      }

      // Set PDF.js worker
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      setScriptsLoaded(true);
    };

    loadScripts().catch(console.error);
  }, [scriptsLoaded]);

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

        canvas.on('selection:created', handleObjectSelect);
        canvas.on('selection:updated', handleObjectSelect);
        canvas.on('selection:cleared', handleObjectClear);
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

          // Use refs to get current tool value (avoid closure issue)
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

    return () => {
      if (fabricCanvasRef.current && viewMode !== 'studio') {
        // Don't dispose, just clear when leaving studio
      }
    };
  }, [viewMode, scriptsLoaded]); // Removed currentTool - now using refs

  // Handle wheel zoom
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
  }, [zoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const canvas = fabricCanvasRef.current;
      const activeObj = canvas?.getActiveObject();
      
      // Delete key
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
      
      // Tool shortcuts (only when in studio mode and not editing text)
      if (viewMode === 'studio' && (!activeObj || !activeObj.isEditing)) {
        if (e.key === 'v' || e.key === 'V') {
          setCurrentTool('select');
          e.preventDefault();
        } else if (e.key === 't' || e.key === 'T') {
          setCurrentTool('text');
          e.preventDefault();
        } else if (e.key === 'r' || e.key === 'R') {
          setCurrentTool('rect');
          e.preventDefault();
        } else if (e.key === 'Escape') {
          setCurrentTool('select');
          canvas?.discardActiveObject();
          canvas?.requestRenderAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [curPageIndex, viewMode]);

  // Handle file upload
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scriptsLoaded) return;

    setIsLoading(true);
    setLoadingText('Đang đọc file PDF...');
    setProgress(0);

    const reader = new FileReader();
    reader.onload = async function() {
      const buffer = this.result as ArrayBuffer;
      setPdfData(buffer.slice(0));

      try {
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setPdfDoc(doc);
        
        const newPagesData: PageData[] = [];
        setSelectedIds(new Set());

        for (let i = 1; i <= doc.numPages; i++) {
          setProgress((i / doc.numPages) * 100);
          setLoadingText(`Đang xử lý trang ${i}/${doc.numPages}...`);

          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 0.3 });
          
          const c = document.createElement('canvas');
          c.width = vp.width;
          c.height = vp.height;
          const ctx = c.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;

          // Analyze page content with improved algorithm
          const imageData = ctx.getImageData(0, 0, vp.width, vp.height);
          const d = imageData.data;
          const totalPixels = vp.width * vp.height;
          
          let inkPixels = 0;      // Pixels that are not white/near-white
          let colorPixels = 0;    // Pixels that have chromatic color (not grayscale)
          let significantColorPixels = 0; // Strong chromatic pixels
          
          // Sample every 4th pixel for performance (still very accurate)
          const sampleStep = 4;
          const sampledPixels = Math.floor(totalPixels / sampleStep);
          
          for (let px = 0; px < d.length; px += 4 * sampleStep) {
            const r = d[px];
            const g = d[px + 1];
            const b = d[px + 2];
            // const a = d[px + 3]; // Alpha not needed
            
            // Check if pixel is not white/near-white (has ink)
            // Consider white threshold as brightness > 245
            const brightness = (r + g + b) / 3;
            if (brightness < 245) {
              inkPixels++;
            }
            
            // Check if pixel is chromatic (has color, not grayscale)
            // Grayscale pixels have R ≈ G ≈ B
            // Calculate max difference between RGB channels
            const maxRGB = Math.max(r, g, b);
            const minRGB = Math.min(r, g, b);
            const chromaDiff = maxRGB - minRGB;
            
            // Saturation-based detection
            // A pixel is considered "chromatic" if the difference between max and min RGB > threshold
            const chromaThreshold = 25; // Threshold for detecting chromatic colors
            const strongChromaThreshold = 50; // Threshold for strong/vivid colors
            
            if (chromaDiff > chromaThreshold && brightness < 240) {
              colorPixels++;
              
              // Also check for strong colors (like red stamps, colored text)
              if (chromaDiff > strongChromaThreshold) {
                significantColorPixels++;
              }
            }
          }
          
          // Calculate percentages
          const inkPercentage = (inkPixels / sampledPixels) * 100;
          const colorPercentage = (colorPixels / sampledPixels) * 100;
          const significantColorPercentage = (significantColorPixels / sampledPixels) * 100;
          
          // Classification logic:
          // - Blank: Less than 1% ink coverage
          // - Color: More than 2% chromatic pixels OR more than 0.5% significant color pixels
          // - B&W: Has ink but not enough color
          
          let type: 'color' | 'bw' | 'blank';
          
          if (inkPercentage < 1) {
            type = 'blank';
          } else if (colorPercentage > 2 || significantColorPercentage > 0.5) {
            type = 'color';
          } else {
            type = 'bw';
          }
          
          // Debug logging (can be removed in production)
          console.log(`Page ${i}: ink=${inkPercentage.toFixed(2)}%, color=${colorPercentage.toFixed(2)}%, significant=${significantColorPercentage.toFixed(2)}% => ${type}`);

          newPagesData.push({
            idx: i - 1,
            num: i,
            type,
            deleted: false,
            rotation: 0,
            thumb: c.toDataURL(),
            json: null
          });
        }

        setPagesData(newPagesData);
      } catch (err: any) {
        alert('Lỗi đọc file PDF: ' + err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Object selection handlers
  const handleObjectSelect = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getActiveObject();
    setActiveObject(obj);

    if (obj) {
      if (obj.fill && typeof obj.fill === 'string') {
        try {
          const color = new window.fabric.Color(obj.fill).toHex();
          if (color.length === 6) setObjColor('#' + color);
        } catch (e) {}
      }

      if (obj.type === 'i-text') {
        setTextContent(obj.text || '');
        setSelectedFont(obj.fontFamily || 'Arial');
        setFontSize(Math.round(obj.fontSize || 20));
        setIsBold(obj.fontWeight === 'bold');
        setIsItalic(obj.fontStyle === 'italic');
        setIsUnderline(obj.underline || false);
      }
    }

    renderLayers();
  }, []);

  const handleObjectClear = useCallback(() => {
    setActiveObject(null);
    renderLayers();
  }, []);

  // Save current state
  const saveCurrentState = useCallback(() => {
    if (curPageIndex !== null && fabricCanvasRef.current) {
      setPagesData(prev => {
        const newData = [...prev];
        if (newData[curPageIndex]) {
          newData[curPageIndex] = {
            ...newData[curPageIndex],
            json: fabricCanvasRef.current.toJSON(['selectable', 'evented', 'fontFamily', 'fontWeight', 'fontStyle', 'underline'])
          };
        }
        return newData;
      });
      renderLayers();
    }
  }, [curPageIndex]);

  // Render layers
  const renderLayers = useCallback(() => {
    if (!fabricCanvasRef.current) {
      setLayers([]);
      return;
    }
    const objs = fabricCanvasRef.current.getObjects().slice().reverse();
    setLayers(objs);
  }, []);

  // Tools
  const setTool = useCallback((tool: 'select' | 'text' | 'rect') => {
    console.log('Setting tool to:', tool); // Debug
    setCurrentTool(tool);
    currentToolRef.current = tool; // Also update ref immediately
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('Canvas not ready yet');
      return;
    }

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

  const addRect = useCallback((pos?: { x: number; y: number }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const rect = new window.fabric.Rect({
      left: pos?.x || 100,
      top: pos?.y || 100,
      width: 150,
      height: 80,
      fill: objColor,
      strokeWidth: 0,
      selectable: true,
      evented: true
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  }, [objColor]);

  const addText = useCallback((pos?: { x: number; y: number }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new window.fabric.IText('Nhập nội dung...', {
      left: pos?.x || 100,
      top: pos?.y || 100,
      fontFamily: selectedFont,
      fontSize: fontSize,
      fill: objColor,
      selectable: true,
      evented: true
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
  }, [selectedFont, fontSize, objColor]);

  const deleteActive = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObjects();
    if (active.length) {
      canvas.discardActiveObject();
      active.forEach((obj: any) => canvas.remove(obj));
    }
  }, []);

  // Keep refs in sync with state/callbacks (to avoid closure issues in Fabric events)
  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  useEffect(() => {
    addTextRef.current = addText;
  }, [addText]);

  useEffect(() => {
    addRectRef.current = addRect;
  }, [addRect]);

  // Update active object properties
  const updateActiveObj = useCallback((key: string, value: any) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    switch (key) {
      case 'color':
        obj.set('fill', value);
        setObjColor(value);
        break;
      case 'font':
        if (obj.type === 'i-text') obj.set('fontFamily', value);
        setSelectedFont(value);
        break;
      case 'size':
        if (obj.type === 'i-text') obj.set('fontSize', parseInt(value));
        setFontSize(parseInt(value));
        break;
      case 'text':
        if (obj.type === 'i-text') obj.set('text', value);
        setTextContent(value);
        break;
    }

    canvas.requestRenderAll();
    saveCurrentState();
  }, [saveCurrentState]);

  const toggleStyle = useCallback((style: 'bold' | 'italic' | 'underline') => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'i-text') return;

    switch (style) {
      case 'bold':
        obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
        setIsBold(obj.fontWeight === 'bold');
        break;
      case 'italic':
        obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
        setIsItalic(obj.fontStyle === 'italic');
        break;
      case 'underline':
        obj.set('underline', !obj.underline);
        setIsUnderline(obj.underline);
        break;
    }

    canvas.requestRenderAll();
    saveCurrentState();
  }, [saveCurrentState]);

  // Studio functions
  const openStudio = useCallback(async (idx: number) => {
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

      // Wait for fabric canvas to be ready
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
          renderLayers();
          
          // Auto-fit after a small delay to ensure DOM is ready
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
  }, [scriptsLoaded, pdfData, pagesData, curPageIndex, saveCurrentState, renderLayers]);

  const exitStudio = useCallback(() => {
    saveCurrentState();
    setViewMode('dashboard');
    setActiveTab('stats');
    setCurPageIndex(null);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
    }
  }, [saveCurrentState]);

  // Zoom and rotation
  const applyZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(0.2, Math.min(4.0, prev + delta)));
  }, []);

  // Auto-fit to viewport
  const autoFitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = fabricCanvasRef.current;
    if (!viewport || !canvas) return;

    const viewportWidth = viewport.clientWidth - 100; // padding
    const viewportHeight = viewport.clientHeight - 100;
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const scaleX = viewportWidth / canvasWidth;
    const scaleY = viewportHeight / canvasHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1.5); // cap at 150%

    setZoom(Math.max(0.2, fitZoom));
  }, []);

  // Rotate individual page in thumbnail view
  const rotatePageThumb = useCallback((idx: number, direction: 'cw' | 'ccw', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening studio
    setPagesData(prev => {
      const newData = [...prev];
      const delta = direction === 'cw' ? 90 : -90;
      newData[idx] = {
        ...newData[idx],
        rotation: (newData[idx].rotation + delta + 360) % 360
      };
      return newData;
    });
  }, []);

  const rotatePage = useCallback(() => {
    if (curPageIndex === null) return;
    setPagesData(prev => {
      const newData = [...prev];
      newData[curPageIndex] = {
        ...newData[curPageIndex],
        rotation: (newData[curPageIndex].rotation + 90) % 360
      };
      return newData;
    });
  }, [curPageIndex]);

  // Filter and selection
  const toggleSelection = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} trang đã chọn không?`)) {
      setPagesData(prev => prev.map(p => selectedIds.has(p.idx) ? { ...p, deleted: true } : p));
      setSelectedIds(new Set());
    }
  }, [selectedIds]);

  // Layer actions
  const layerAction = useCallback((action: 'up' | 'down') => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    if (action === 'up') obj.bringForward();
    else obj.sendBackwards();

    canvas.requestRenderAll();
    saveCurrentState();
  }, [saveCurrentState]);

  const deleteCheckedLayers = useCallback(() => {
    const checks = document.querySelectorAll<HTMLInputElement>('.layer-chk:checked');
    if (checks.length === 0) return;
    if (!window.confirm(`Xóa ${checks.length} layer đã chọn?`)) return;

    const canvas = fabricCanvasRef.current;
    const objs = canvas.getObjects().slice().reverse();

    canvas.discardActiveObject();
    checks.forEach((chk) => {
      const idx = parseInt(chk.parentElement?.dataset.idx || '0');
      const obj = objs[idx];
      if (obj) canvas.remove(obj);
    });
  }, []);

  // Save PDF
  const savePDF = useCallback(async (mode: 'single' | 'all') => {
    if (!pdfData) {
      alert('Vui lòng tải file PDF lên trước.');
      return;
    }

    saveCurrentState();
    setIsLoading(true);
    setLoadingText('Đang chuẩn bị dữ liệu xuất file...');

    try {
      const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib;

      if (typeof window.fontkit !== 'undefined') {
        PDFDocument.prototype.registerFontkit(window.fontkit);
      }

      const srcDoc = await PDFDocument.load(pdfData.slice(0));
      const newDoc = await PDFDocument.create();

      let pagesToSave: PageData[] = [];
      if (mode === 'single') {
        if (curPageIndex === null) {
          throw new Error("Chế độ 'Xuất Trang Này' chỉ hoạt động khi bạn đang mở trình chỉnh sửa.");
        }
        if (pagesData[curPageIndex].deleted) {
          throw new Error("Trang hiện tại đã bị xóa và không thể xuất.");
        }
        pagesToSave = [pagesData[curPageIndex]];
      } else {
        pagesToSave = pagesData.filter(p => !p.deleted);
      }

      if (pagesToSave.length === 0) {
        throw new Error("Không còn trang nào để xuất file.");
      }

      const pageIndices = pagesToSave.map(p => p.num - 1);
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);

      const embeddedFonts: Record<string, any> = {};

      const getFont = async (fontName: string) => {
        const normalizedName = fontName.replace(" (Local)", "").trim();
        if (embeddedFonts[normalizedName]) return embeddedFonts[normalizedName];

        let standardFontName;
        if (normalizedName.includes("Arial") || normalizedName.includes("Helvetica")) standardFontName = StandardFonts.Helvetica;
        else if (normalizedName.includes("Times")) standardFontName = StandardFonts.TimesNewRoman;
        else if (normalizedName.includes("Courier")) standardFontName = StandardFonts.Courier;

        if (standardFontName) {
          try {
            const font = await newDoc.embedFont(standardFontName);
            embeddedFonts[normalizedName] = font;
            return font;
          } catch (e) {}
        }

        // Fallback to Helvetica
        const font = await newDoc.embedFont(StandardFonts.Helvetica);
        embeddedFonts[normalizedName] = font;
        return font;
      };

      for (let i = 0; i < copiedPages.length; i++) {
        setProgress(((i + 1) / copiedPages.length) * 100);
        setLoadingText(`Đang xử lý trang ${i + 1}/${copiedPages.length}...`);

        const page = newDoc.addPage(copiedPages[i]);
        const { width, height } = page.getSize();
        const pData = pagesToSave[i];

        if (pData.rotation) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees(currentRotation + pData.rotation));
        }

        if (pData.json?.objects?.length > 0) {
          const scale = 1 / RENDER_SCALE;

          for (const obj of pData.json.objects) {
            let r = 0, g = 0, b = 0;
            if (obj.fill && typeof obj.fill === 'string') {
              try {
                const color = new window.fabric.Color(obj.fill).getSource();
                r = color[0] / 255;
                g = color[1] / 255;
                b = color[2] / 255;
              } catch (e) {}
            }

            const objW = obj.width * obj.scaleX * scale;
            const objH = obj.height * obj.scaleY * scale;
            const x = obj.left * scale;
            let y = height - (obj.top * scale) - objH;

            if (obj.type === 'rect') {
              page.drawRectangle({
                x, y, width: objW, height: objH,
                color: rgb(r, g, b),
                borderWidth: 0
              });
            } else if (obj.type === 'i-text') {
              const font = await getFont(obj.fontFamily);
              const fSize = obj.fontSize * obj.scaleY * scale;
              const textY = y + objH - (fSize * 0.8);

              const lines = obj.text.split('\n');
              let currentY = textY;

              for (const line of lines) {
                page.drawText(line, {
                  x, y: currentY, size: fSize,
                  font, color: rgb(r, g, b)
                });
                currentY -= fSize * (obj.lineHeight || 1.16);
              }
            }
          }
        }
      }

      setLoadingText('Đang tạo file PDF hoàn chỉnh...');
      const pdfBytes = await newDoc.save();

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PDF_Studio_Export.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      alert('Lỗi khi xuất file PDF: ' + err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [pdfData, pagesData, curPageIndex, saveCurrentState]);

  // Reset/Refresh function
  const resetAll = useCallback(() => {
    if (pagesData.length > 0 && !window.confirm('Bạn có chắc muốn làm mới? Tất cả dữ liệu hiện tại sẽ bị xóa.')) {
      return;
    }
    
    // Clear all state
    setPagesData([]);
    setPdfDoc(null);
    setPdfData(null);
    setCurPageIndex(null);
    setZoom(1.0);
    setSelectedIds(new Set());
    setFilterType('all');
    setCurrentTool('select');
    setActiveTab('stats');
    setViewMode('dashboard');
    setContextMenu({ x: 0, y: 0, visible: false });
    setLayers([]);
    setActiveObject(null);
    setObjColor('#000000');
    setTextContent('');
    setSelectedFont('Arial');
    setFontSize(20);
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    
    // Clear fabric canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [pagesData.length]);

  // Statistics
  const stats = {
    color: pagesData.filter(p => !p.deleted && p.type === 'color'),
    bw: pagesData.filter(p => !p.deleted && p.type === 'bw'),
    blank: pagesData.filter(p => !p.deleted && p.type === 'blank')
  };

  const filteredPages = pagesData.filter(p => !p.deleted && (filterType === 'all' || p.type === filterType));

  return (
    <div className="h-full bg-gray-100 flex flex-col overflow-hidden">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/95 z-[9999] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <div className="text-blue-600 font-bold text-lg">{loadingText}</div>
          <div className="w-64 bg-gray-200 rounded-full h-2.5 mt-4 overflow-hidden">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-[9999] w-40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button 
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => { setContextMenu({ ...contextMenu, visible: false }); }}
          >
            <Pencil size={14} /> Sửa nội dung
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button 
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={() => { deleteActive(); setContextMenu({ ...contextMenu, visible: false }); }}
          >
            <Trash2 size={14} /> Xóa Object
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm shrink-0">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <FileText className="text-blue-600" size={20} />
          <span className="text-sm">PDF Studio</span>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            accept="application/pdf" 
            className="hidden" 
            onChange={handleFile}
          />
          <button 
            onClick={resetAll}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded font-medium text-xs flex items-center gap-1.5 border border-gray-300 transition"
            title="Làm mới - Xóa tất cả và bắt đầu lại"
          >
            <RotateCcw size={14} /> Làm mới
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium text-xs flex items-center gap-1.5 border border-blue-200 transition"
          >
            <Upload size={14} /> Mở PDF
          </button>
          <button 
            onClick={() => savePDF('single')}
            className="px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded font-medium text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <FileDown size={14} /> Xuất Trang Này
          </button>
          <button 
            onClick={() => savePDF('all')}
            className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded font-medium text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Download size={16} /> Xuất Tất Cả
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Thống Kê
            </button>
            <button 
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-3 text-sm font-bold transition ${activeTab === 'layers' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Layers
            </button>
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
              <div className="bg-gray-50 p-3 rounded border-l-4 border-red-500 shadow-sm">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><Palette size={12} /> MÀU</span>
                  <span className="bg-red-100 text-red-600 px-2 rounded">{stats.color.length}</span>
                </div>
                <div className="flex gap-1">
                  <input 
                    readOnly 
                    className="flex-1 text-xs font-mono bg-white border p-1.5 rounded"
                    value={stats.color.map(p => p.num).join(',')}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(stats.color.map(p => p.num).join(',')); }}
                    className="px-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                    title="Copy"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded border-l-4 border-slate-500 shadow-sm">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><Moon size={12} /> ĐEN TRẮNG</span>
                  <span className="bg-slate-100 text-slate-600 px-2 rounded">{stats.bw.length}</span>
                </div>
                <div className="flex gap-1">
                  <input 
                    readOnly 
                    className="flex-1 text-xs font-mono bg-white border p-1.5 rounded"
                    value={stats.bw.map(p => p.num).join(',')}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(stats.bw.map(p => p.num).join(',')); }}
                    className="px-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                    title="Copy"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded border-l-4 border-yellow-500 shadow-sm">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><FileX size={12} /> TRANG TRẮNG</span>
                  <span className="bg-yellow-100 text-yellow-600 px-2 rounded">{stats.blank.length}</span>
                </div>
                <div className="flex gap-1">
                  <input 
                    readOnly 
                    className="flex-1 text-xs font-mono bg-white border p-1.5 rounded"
                    value={stats.blank.map(p => p.num).join(',')}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(stats.blank.map(p => p.num).join(',')); }}
                    className="px-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                    title="Copy"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Layers Tab */}
          {activeTab === 'layers' && (
            <div className="flex-1 flex flex-col">
              <div className="p-2 bg-gray-50 text-xs text-gray-500 border-b flex justify-between items-center">
                <span>Kéo thả để sắp xếp</span>
                <button onClick={deleteCheckedLayers} className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                  <Trash2 size={12} /> Xóa chọn
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {layers.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 mt-4">Chưa có Layer nào</div>
                ) : (
                  layers.map((obj, index) => {
                    const isActive = activeObject && (obj === activeObject || (activeObject.type === 'activeSelection' && activeObject.contains?.(obj)));
                    const icon = obj.type === 'i-text' ? <Type size={14} /> : <Square size={14} />;
                    const name = obj.type === 'i-text' ? (obj.text?.substring(0, 20) + (obj.text?.length > 20 ? '...' : '')) : 'Khối/Tẩy';

                    return (
                      <div
                        key={index}
                        data-idx={index}
                        className={`layer-item p-2 rounded text-sm flex gap-2 items-center cursor-pointer border transition-colors ${isActive ? 'bg-blue-100 border-blue-500 text-blue-600 font-semibold' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => {
                          fabricCanvasRef.current?.setActiveObject(obj);
                          fabricCanvasRef.current?.requestRenderAll();
                        }}
                        draggable
                      >
                        <input type="checkbox" className="layer-chk w-4 h-4 accent-blue-600" onClick={e => e.stopPropagation()} />
                        {icon}
                        <span className="flex-1 select-none truncate">{name}</span>
                        <GripVertical size={14} className="text-gray-400" />
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-gray-200 grid grid-cols-3 gap-2 bg-gray-50">
                <button onClick={() => layerAction('up')} className="p-2 bg-white border rounded hover:text-blue-600 transition" title="Đưa lên trên">
                  <ArrowUp size={16} className="mx-auto" />
                </button>
                <button onClick={() => layerAction('down')} className="p-2 bg-white border rounded hover:text-blue-600 transition" title="Đưa xuống dưới">
                  <ArrowDown size={16} className="mx-auto" />
                </button>
                <button onClick={deleteActive} className="p-2 bg-white border rounded text-red-500 hover:bg-red-50 transition" title="Xóa Layer">
                  <Trash2 size={16} className="mx-auto" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 relative flex flex-col bg-slate-100 overflow-hidden">
          {/* Dashboard View */}
          {viewMode === 'dashboard' && (
            <div className="flex flex-col h-full">
              {/* Filter Bar */}
              <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  {(['all', 'color', 'bw', 'blank'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterType(f)}
                      className={`px-3 py-1 text-xs font-bold rounded transition ${filterType === f ? 'bg-white shadow-sm' : 'hover:bg-white'} ${f === 'color' ? 'text-red-500' : f === 'bw' ? 'text-slate-500' : f === 'blank' ? 'text-yellow-600' : 'text-slate-700'}`}
                    >
                      {f === 'all' ? 'Tất cả' : f === 'color' ? 'Màu' : f === 'bw' ? 'B/W' : 'Trắng'}
                    </button>
                  ))}
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">
                      Đã chọn <span className="text-blue-600">{selectedIds.size}</span>
                    </span>
                    <button onClick={deleteSelected} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold hover:bg-red-100 flex items-center gap-1">
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 content-start">
                {pagesData.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center text-gray-400 mt-20">
                    <Upload size={64} className="mb-4 opacity-50" />
                    <p>Vui lòng tải file PDF lên</p>
                  </div>
                ) : filteredPages.length === 0 ? (
                  <div className="col-span-full text-center text-gray-400 mt-10">
                    Không tìm thấy trang nào khớp với bộ lọc.
                  </div>
                ) : (
                  filteredPages.map(p => {
                    const isSel = selectedIds.has(p.idx);
                    const colClass = p.type === 'color' ? 'text-red-500' : p.type === 'blank' ? 'text-yellow-500' : 'text-slate-500';

                    return (
                      <div
                        key={p.idx}
                        className={`bg-white rounded-lg border overflow-hidden cursor-pointer relative group transition-all ${isSel ? 'ring-2 ring-blue-600 border-blue-600 shadow-md' : 'hover:shadow-lg border-gray-200'}`}
                      >
                        <div
                          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-colors ${isSel ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-transparent group-hover:border-blue-400'}`}
                          onClick={(e) => toggleSelection(p.idx, e)}
                        >
                          <Check size={14} />
                        </div>
                        <div
                          className="h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden"
                          onClick={() => openStudio(p.idx)}
                        >
                          <img
                            src={p.thumb}
                            alt={`Page ${p.num}`}
                            className="object-contain max-h-full transition-transform duration-300"
                            style={{ transform: `rotate(${p.rotation}deg)` }}
                          />
                          <div 
                            className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()} // Prevent click through overlay
                          >
                            <button 
                              onClick={() => openStudio(p.idx)}
                              className="px-4 py-1.5 bg-white text-slate-800 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-md"
                            >
                              <Pencil size={12} className="inline mr-1" /> SỬA
                            </button>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => rotatePageThumb(p.idx, 'ccw', e)}
                                className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-blue-600 transition shadow-md"
                                title="Xoay trái 90°"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button 
                                onClick={(e) => rotatePageThumb(p.idx, 'cw', e)}
                                className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-blue-600 transition shadow-md"
                                title="Xoay phải 90°"
                              >
                                <RotateCw size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-white border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-700">
                          <span>Trang {p.num}</span>
                          <span className={`${colClass} uppercase`}>{p.type}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Studio View */}
          {viewMode === 'studio' && (
            <div className="flex flex-col h-full w-full">
              {/* Studio Toolbar */}
              <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0 shadow-sm relative z-40">
                <button onClick={exitStudio} className="text-slate-500 hover:text-blue-600 transition" title="Quay lại">
                  <ArrowLeft size={20} />
                </button>
                <div className="h-6 w-px bg-gray-300 mx-2" />

                {/* Tools */}
                <div className="flex bg-gray-100 p-1 rounded-lg gap-1 relative z-50">
                  {(['select', 'text', 'rect'] as const).map(tool => (
                    <button
                      type="button"
                      key={tool}
                      onClick={(e) => { e.stopPropagation(); setTool(tool); }}
                      className={`p-2 w-9 h-9 flex items-center justify-center rounded transition cursor-pointer ${currentTool === tool ? 'bg-white text-blue-600 shadow-sm ring-2 ring-blue-200' : 'text-gray-500 hover:bg-white hover:text-blue-600'}`}
                      title={tool === 'select' ? 'Chọn (V)' : tool === 'text' ? 'Thêm Chữ (T)' : 'Vẽ Khối/Tẩy (R)'}
                    >
                      {tool === 'select' ? <MousePointer size={16} /> : tool === 'text' ? <Type size={16} /> : <Square size={16} />}
                    </button>
                  ))}
                </div>

                {/* Properties Panel */}
                {activeObject && (
                  <div className="flex items-center gap-3 ml-2 pl-3 border-l border-gray-200">
                    <input
                      type="color"
                      value={objColor}
                      onChange={(e) => updateActiveObj('color', e.target.value)}
                      className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                    />

                    {activeObject.type === 'i-text' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={textContent}
                          onChange={(e) => updateActiveObj('text', e.target.value)}
                          placeholder="Nội dung..."
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:border-blue-500"
                        />
                        <select
                          value={selectedFont}
                          onChange={(e) => updateActiveObj('font', e.target.value)}
                          className="text-xs border border-gray-300 rounded p-1 w-28 h-8 focus:border-blue-500 focus:outline-none"
                        >
                          {FONTS.map(f => (
                            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={fontSize}
                          onChange={(e) => updateActiveObj('size', e.target.value)}
                          className="w-12 border border-gray-300 rounded p-1 text-xs text-center"
                        />
                        <div className="flex bg-gray-100 p-1 rounded">
                          <button
                            onClick={() => toggleStyle('bold')}
                            className={`w-6 h-6 text-xs font-bold rounded ${isBold ? 'bg-blue-600 text-white' : 'hover:bg-white'}`}
                          >
                            B
                          </button>
                          <button
                            onClick={() => toggleStyle('italic')}
                            className={`w-6 h-6 text-xs italic rounded ${isItalic ? 'bg-blue-600 text-white' : 'hover:bg-white'}`}
                          >
                            I
                          </button>
                          <button
                            onClick={() => toggleStyle('underline')}
                            className={`w-6 h-6 text-xs underline rounded ${isUnderline ? 'bg-blue-600 text-white' : 'hover:bg-white'}`}
                          >
                            U
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button onClick={rotatePage} className="p-2 hover:bg-gray-100 rounded text-slate-600" title="Xoay trang 90°">
                    <RotateCw size={18} />
                  </button>
                  <div className="h-6 w-px bg-gray-300" />
                  <button onClick={autoFitZoom} className="p-2 hover:bg-gray-100 rounded text-slate-600" title="Vừa màn hình">
                    <Maximize size={18} />
                  </button>
                  <div className="flex items-center bg-gray-100 rounded px-2 h-9 border border-gray-200">
                    <button onClick={() => applyZoom(-0.1)} className="w-6 hover:text-blue-600">
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-xs font-mono w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => applyZoom(0.1)} className="w-6 hover:text-blue-600">
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas Viewport */}
              <div
                ref={viewportRef}
                className="flex-1 overflow-auto flex items-center justify-center p-12"
                style={{ backgroundColor: '#525659' }}
                onClick={() => setContextMenu({ ...contextMenu, visible: false })}
              >
                <div
                  className="shadow-2xl bg-white"
                  style={{
                    transform: `scale(${zoom}) rotate(${curPageIndex !== null ? pagesData[curPageIndex]?.rotation || 0 : 0}deg)`,
                    transformOrigin: 'center center',
                    margin: `${20 * zoom}px`
                  }}
                >
                  <canvas ref={canvasRef} id="fabric-canvas" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfProcessor;
