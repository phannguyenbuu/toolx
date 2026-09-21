import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutGrid, Upload, Download, X, Check, AlertCircle, RotateCcw, Loader2, Scissors, Grid3X3, Circle, Square, Printer, Package, RectangleHorizontal, RectangleVertical, FileImage, FileText, Info, RefreshCw, Triangle, Hexagon, FolderOpen, Save, ChevronLeft, ChevronRight, Settings2, Clock, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { calculateLayout, generateCutSVG, LayoutPlan } from '../utils/layoutSolver';
import { FilePickerModal } from './FilePickerModal';
import { fileService } from '../services/fileService';
import { generatePdfAsync, downloadPdfBlob } from '../utils/pdfAsync';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Uses proxy - relative URLs
const API_BASE = '/api';

interface ImpositionConfig {
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon';
  itemW: number; itemH: number; padding: number; cornerRadius: number;
  pageW: number; pageH: number; printW: number; printH: number; totalOrder: number;
  useCrop: boolean; cropLen: number; cropDist: number; cropThick: number; cropColor: string;
  fitMode: 'stretch' | 'fill' | 'fit' | 'actual';
  colorMode: 'original' | 'cmyk' | 'rgb' | 'konica';
  dpi: number; autoRotate: boolean; processMode: 'vector' | 'raster';
  cutBleed: number; // Bù cắt (mm)
  
  // Advanced Color Management (3-layer ICC conversion)
  useAdvancedColor: boolean;
  sourceIcc: string; // 'original' or ICC filename
  icc1: string; // First ICC conversion
  iccOutput: string; // Final ICC conversion
}

interface IccProfile {
  filename: string;
  name: string;
  path: string;
}

interface ImpositionPageProps { onClose?: () => void; }

const PAPER_PRESETS = [
  { label: '330x480 Fuji', value: '330x480' },
  { label: '320x470 Konica', value: '320x470' },
  { label: 'A4', value: '210x297' },
  { label: 'A3', value: '297x420' },
];

// Debounced number input component for performance
// Uses smart debounce: longer delay for small numbers (likely still typing)
const DebouncedNumberInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  shortDebounceMs?: number;
  longDebounceMs?: number;
}> = ({ value, onChange, step = 1, min, max, className = '', shortDebounceMs = 300, longDebounceMs = 1000 }) => {
  const [localValue, setLocalValue] = useState(String(value));
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const numericPart = newValue.replace(/[^0-9]/g, '');
    const debounceTime = numericPart.length <= 1 ? longDebounceMs : shortDebounceMs;
    
    timeoutRef.current = setTimeout(() => {
      const parsed = parseFloat(newValue) || 0;
      const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
      const final = min !== undefined ? Math.max(clamped, min) : clamped;
      onChange(final);
    }, debounceTime);
  };
  
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);
  
  return (
    <input type="number" step={step} min={min} max={max} value={localValue} onChange={handleChange} className={className} />
  );
};

export const ImpositionPage: React.FC<ImpositionPageProps> = ({ onClose }) => {
  const [config, setConfig] = useState<ImpositionConfig>({
    shape: 'rect', itemW: 100, itemH: 120, padding: 0, cornerRadius: 0,
    pageW: 330, pageH: 480, printW: 310, printH: 450, totalOrder: 1000,
    useCrop: false, cropLen: 10, cropDist: 10, cropThick: 0.5, cropColor: '#000000',
    fitMode: 'stretch', colorMode: 'original', dpi: 300, autoRotate: true, processMode: 'vector',
    cutBleed: 0,
    // Advanced Color Management
    useAdvancedColor: false,
    sourceIcc: 'original',
    icc1: '',
    iccOutput: ''
  });

  const [plans, setPlans] = useState<LayoutPlan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewImages, setPreviewImages] = useState<{ portrait: string; landscape: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [manualRotate, setManualRotate] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [unitPrice, setUnitPrice] = useState(10000); // Đơn giá/tờ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 500 });
  const containerRef = useRef<HTMLElement>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Advanced Color Management states
  const [iccProfiles, setIccProfiles] = useState<IccProfile[]>([]);
  const [isLoadingIccProfiles, setIsLoadingIccProfiles] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Right Sidebar click toggle state
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("toolx_imposition_panel_collapsed") === "true";
    }
    return false; // Mặc định mở, người dùng click thô để đóng/mở
  });

  const toggleRightSidebar = useCallback(() => {
    setIsRightSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("toolx_imposition_panel_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  }, []);
  
  // Section collapse states (expand/collapse buttons use ONLY arrow icons)
  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState(true);

  // Imposition history
  interface ImpositionHistoryItem {
    id: string;
    timestamp: number;
    date: string;
    title: string;
    paperW: number;
    pageH: number;
    itemW: number;
    itemH: number;
    layoutCount: number;
    totalSheets?: number;
    processMode: string;
    colorMode: string;
    status: 'completed' | 'failed' | 'generating';
    thumbnail?: string;
    configSnapshot?: Partial<ImpositionConfig>;
  }

  const [impositionHistory, setImpositionHistory] = useState<ImpositionHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('toolx_imposition_history');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  });

  const removeHistoryItem = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImpositionHistory((prev) => {
      const next = prev.filter(x => x.id !== id);
      try {
        localStorage.setItem('toolx_imposition_history', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm('Bạn có chắc muốn xoá toàn bộ lịch sử bình trang?')) {
      setImpositionHistory([]);
      try {
        localStorage.removeItem('toolx_imposition_history');
      } catch (e) {}
    }
  }, []);

  const restoreHistoryConfig = useCallback((item: ImpositionHistoryItem) => {
    if (item.configSnapshot) {
      setConfig(prev => ({
        ...prev,
        ...item.configSnapshot
      }));
    }
  }, []);
  // Debounced config for inputs
  const [pendingConfig, setPendingConfig] = useState<Partial<ImpositionConfig>>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateConfigDebounced = useCallback((updates: Partial<ImpositionConfig>) => {
    setPendingConfig(prev => ({ ...prev, ...updates }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setConfig(prev => ({ ...prev, ...updates }));
      setPendingConfig({});
    }, 500);
  }, []);

  // Reset function - reset all states to initial values
  const handleReset = useCallback(() => {
    if (uploadedFile && !window.confirm('Bạn có chắc muốn làm mới? Tất cả dữ liệu hiện tại sẽ bị xóa.')) return;
    setConfig({
      shape: 'rect', itemW: 100, itemH: 120, padding: 0, cornerRadius: 0,
      pageW: 330, pageH: 480, printW: 310, printH: 450, totalOrder: 1000,
      useCrop: false, cropLen: 10, cropDist: 10, cropThick: 0.5, cropColor: '#000000',
      fitMode: 'stretch', colorMode: 'original', dpi: 300, autoRotate: true, processMode: 'vector',
      cutBleed: 0,
      // Reset Advanced Color Management
      useAdvancedColor: false,
      sourceIcc: 'original',
      icc1: '',
      iccOutput: ''
    });
    setPlans([]);
    setCurrentPlanIndex(0);
    setUploadedFile(null);
    setPreviewImages(null);
    setManualRotate('auto');
    setUnitPrice(10000);
    setIsModalOpen(false);
    setIsGenerating(false);
    setProgress(0);
    setPendingConfig({});
  }, [uploadedFile]);

  const currentPlan = plans[currentPlanIndex] || null;

  useEffect(() => {
    const check = async () => {
      try { 
        // Check Python service health specifically
        const r = await fetch(API_BASE + '/api/python-health'); 
        setApiStatus(r.ok ? 'online' : 'offline'); 
      }
      catch { setApiStatus('offline'); }
    };
    check(); const iv = setInterval(check, 30000); return () => clearInterval(iv);
  }, []);

  // Load ICC profiles on component mount
  useEffect(() => {
    const loadIccProfiles = async () => {
      if (apiStatus !== 'online') return;
      
      setIsLoadingIccProfiles(true);
      try {
        const response = await fetch(API_BASE + '/api/icc-profiles');
        if (response.ok) {
          const data = await response.json();
          setIccProfiles(data.profiles || []);
        } else {
          console.warn('Failed to load ICC profiles');
          setIccProfiles([]);
        }
      } catch (error) {
        console.error('Error loading ICC profiles:', error);
        setIccProfiles([]);
      } finally {
        setIsLoadingIccProfiles(false);
      }
    };

    loadIccProfiles();
  }, [apiStatus]);

  const runCalc = useCallback(() => {
    if (config.itemW <= 0 || config.itemH <= 0) { setPlans([]); return; }
    const r = calculateLayout({ shape: config.shape, itemW: config.itemW,
      itemH: config.shape === 'circle' ? config.itemW : config.itemH,
      padding: config.padding, printW: config.printW, printH: config.printH,
      pageW: config.pageW, pageH: config.pageH });
    setPlans(r); if (currentPlanIndex >= r.length) setCurrentPlanIndex(0);
  }, [config, currentPlanIndex]);

  useEffect(() => { const t = setTimeout(runCalc, 500); return () => clearTimeout(t); }, [runCalc]);

  // Fetch preview from server when file or config changes
  const fetchPreview = useCallback(async () => {
    if (!uploadedFile || apiStatus !== 'online') return;
    
    setIsLoadingPreview(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadedFile);
      // For circle, use itemW for both dimensions
      const effectiveItemH = config.shape === 'circle' ? config.itemW : config.itemH;
      fd.append('itemW', String(config.itemW));
      fd.append('itemH', String(effectiveItemH));
      fd.append('fitMode', config.fitMode);
      fd.append('shape', config.shape);
      fd.append('manualRotate', manualRotate); // auto/portrait/landscape
      
      // Advanced Color Management parameters for preview
      fd.append('useAdvancedColor', config.useAdvancedColor ? '1' : '0');
      if (config.useAdvancedColor) {
        fd.append('sourceIcc', config.sourceIcc);
        fd.append('icc1', config.icc1);
        fd.append('iccOutput', config.iccOutput);
      }
      
      const res = await fetch(API_BASE + '/api/render-preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setPreviewImages({ portrait: data.portrait, landscape: data.landscape });
      } else {
        alert(data.error || 'Lỗi tải preview');
        setUploadedFile(null);
      }
    } catch (err) {
      console.warn('Preview fetch failed:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [uploadedFile, config.itemW, config.itemH, config.fitMode, config.shape, config.useAdvancedColor, config.sourceIcc, config.icc1, config.iccOutput, manualRotate, apiStatus]);

  // Re-fetch preview when relevant config changes
  useEffect(() => {
    if (uploadedFile) {
      const t = setTimeout(fetchPreview, 300);
      return () => clearTimeout(t);
    }
  }, [fetchPreview, uploadedFile]);

  const updatePrint = useCallback((w: number, h: number) => {
    setConfig(p => ({ ...p, pageW: w, pageH: h, printW: Math.max(0, w - 20), printH: Math.max(0, h - 30) }));
  }, []);

  const handlePreset = (v: string) => { const [w, h] = v.split('x').map(Number); updatePrint(w, h); };
  const swapDims = () => updatePrint(config.pageH, config.pageW);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    
    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const ext = f.name.toLowerCase().split('.').pop();
    if (!validTypes.includes(f.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('Loại file không hợp lệ! Chấp nhận: PDF, JPG, PNG');
      e.target.value = '';
      return;
    }
    
    // Check file size (max 200MB)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (f.size > maxSize) {
      alert(`File quá lớn! Kích thước tối đa: 200MB (file hiện tại: ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
      e.target.value = '';
      return;
    }
    
    // Validate PDF page count (client-side)
    if (ext === 'pdf') {
      setIsLoadingPreview(true);
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;
        
        if (pageCount > 1) {
          alert(`PDF phải có 1 trang duy nhất!\n(File hiện có ${pageCount} trang)`);
          e.target.value = '';
          setUploadedFile(null);
          setPreviewImages(null);
          setIsLoadingPreview(false);
          return;
        }
      } catch (err: any) {
        alert('Không đọc được file PDF. Vui lòng thử file khác.');
        e.target.value = '';
        setUploadedFile(null);
        setPreviewImages(null);
        setIsLoadingPreview(false);
        return;
      }
      setIsLoadingPreview(false);
    }
    
    setUploadedFile(f);
    setPreviewImages(null);
  };

  // Handle file import from File Manager
  const handleFileFromManager = (file: File) => {
    setUploadedFile(file);
    setPreviewImages(null);
  };

  // Save output PDF to File Manager
  const saveToFileManager = async () => {
    if (!currentPlan || !uploadedFile || apiStatus !== 'online') return;
    
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadedFile);
      fd.append('planData', JSON.stringify(currentPlan.items));
      // Fix: Send proper page metadata instead of empty object
      fd.append('pagesData', JSON.stringify([{ rotation: 0, w: 0, h: 0 }]));
      fd.append('pageW', String(config.pageW)); fd.append('pageH', String(config.pageH));
      fd.append('itemW', String(config.itemW)); fd.append('itemH', String(config.itemH));
      fd.append('dpi', String(config.dpi)); fd.append('fitMode', config.fitMode);
      fd.append('colorMode', config.colorMode); fd.append('useCrop', config.useCrop ? '1' : '0');
      fd.append('cropLen', String(config.cropLen)); fd.append('cropDist', String(config.cropDist));
      fd.append('cropThick', String(config.cropThick)); fd.append('cropColor', config.cropColor);
      fd.append('totalOrder', String(config.totalOrder));
      fd.append('processMode', config.processMode); fd.append('autoRotate', config.autoRotate ? '1' : '0');
      fd.append('shape', config.shape);
      fd.append('totalSheets', String(sheets));
      
      // Advanced Color Management parameters
      fd.append('useAdvancedColor', config.useAdvancedColor ? '1' : '0');
      if (config.useAdvancedColor) {
        fd.append('sourceIcc', config.sourceIcc);
        fd.append('icc1', config.icc1);
        fd.append('iccOutput', config.iccOutput);
      }
      
      const blob = await generatePdfAsync(fd, {
        onProgress: (p, msg) => setProgress(p)
      });
      
      const pdfFile = new File([blob], `imposition_${Date.now()}.pdf`, { type: 'application/pdf' });
      await fileService.uploadFile(pdfFile, 'PDF');
      alert('Đã lưu PDF vào Quản lý tệp!');
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const dlSVG = () => {
    if (!currentPlan) return;
    const effectiveItemH = config.shape === 'circle' ? config.itemW : config.itemH;
    const svg = generateCutSVG(currentPlan.items, config.pageW, config.pageH, config.itemW,
      effectiveItemH, config.shape, config.cutBleed, config.cornerRadius);
    const b = new Blob([svg], { type: 'image/svg+xml' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = 'cut.svg'; a.click();
    URL.revokeObjectURL(u);
  };

  const dlPDF = async () => {
    if (!uploadedFile || !currentPlan) { alert('Vui lòng tải file lên trước!'); return; }
    setIsGenerating(true); setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', uploadedFile);
      fd.append('planData', JSON.stringify(currentPlan.items));
      // Fix: Send proper page metadata instead of empty object
      fd.append('pagesData', JSON.stringify([{ rotation: 0, w: 0, h: 0 }]));
      fd.append('pageW', String(config.pageW)); fd.append('pageH', String(config.pageH));
      fd.append('itemW', String(config.itemW)); fd.append('itemH', String(config.itemH));
      fd.append('dpi', String(config.dpi)); fd.append('fitMode', config.fitMode);
      fd.append('colorMode', config.colorMode); fd.append('useCrop', config.useCrop ? '1' : '0');
      fd.append('cropLen', String(config.cropLen)); fd.append('cropDist', String(config.cropDist));
      fd.append('cropThick', String(config.cropThick)); fd.append('cropColor', config.cropColor);
      fd.append('totalOrder', String(config.totalOrder));
      fd.append('processMode', config.processMode); fd.append('autoRotate', config.autoRotate ? '1' : '0');
      fd.append('shape', config.shape);
      fd.append('totalSheets', String(sheets));
      
      // Advanced Color Management parameters
      fd.append('useAdvancedColor', config.useAdvancedColor ? '1' : '0');
      if (config.useAdvancedColor) {
        fd.append('sourceIcc', config.sourceIcc);
        fd.append('icc1', config.icc1);
        fd.append('iccOutput', config.iccOutput);
      }
      
      const blob = await generatePdfAsync(fd, {
        onProgress: (p, msg) => setProgress(p),
        onStatusChange: (status) => console.log('PDF status:', status)
      });
      
      await downloadPdfBlob(blob, 'print.pdf');
      setProgress(100);
    } catch (e: any) { alert(e.message); }
    finally { setTimeout(() => { setIsGenerating(false); setProgress(0); }, 500); }
  };

  // Measure container size
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width - 48, h: rect.height - 48 }); // padding
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const scale = useMemo(() => {
    const scaleW = containerSize.w / config.pageW;
    const scaleH = containerSize.h / config.pageH;
    return Math.min(scaleW, scaleH, 3) * 0.95; // 95% of available space
  }, [config.pageW, config.pageH, containerSize]);

  const sheets = currentPlan && currentPlan.qty > 0 ? Math.ceil(config.totalOrder / currentPlan.qty) : 0;
  const totalCost = sheets * unitPrice;
  const pricePerItem = currentPlan && currentPlan.qty > 0 && sheets > 0 ? totalCost / (sheets * currentPlan.qty) : 0;
  const getBR = () => {
    if (config.shape === 'circle' || config.shape === 'oval') return '50%';
    // For special shapes, show corner radius when set
    if (config.cornerRadius > 0) return Math.max(2, config.cornerRadius * scale) + 'px';
    // Default rounded look for hexagon
    if (config.shape === 'hexagon') return '15%';
    return '2px';
  };
  
  // Get clip path for special shapes (isFlipped for alternating triangles)
  // When cornerRadius > 0, don't use clipPath - show rounded corners instead
  const getClipPath = (isFlipped: boolean = false) => {
    // If corner radius is set, skip clipPath to show rounded corners
    if (config.cornerRadius > 0) return 'none';
    
    if (config.shape === 'trapezoid') {
      return isFlipped 
        ? 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' // Flipped trapezoid
        : 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)'; // Normal trapezoid
    }
    if (config.shape === 'triangle') {
      return isFlipped 
        ? 'polygon(0% 0%, 100% 0%, 50% 100%)' // Point down
        : 'polygon(50% 0%, 100% 100%, 0% 100%)'; // Point up
    }
    if (config.shape === 'hexagon') return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    return 'none';
  };

  // Crop marks: L-shaped at 4 corners of PAGE (like decal cutting marks)
  const cropPath = () => {
    if (!config.useCrop) return '';
    const { cropLen: l, cropDist: d, pageW: pw, pageH: ph } = config;
    const p: string[] = [];
    // Top-left
    p.push(`M ${d},${d} L ${d+l},${d}`, `M ${d},${d} L ${d},${d+l}`);
    // Top-right
    p.push(`M ${pw-d-l},${d} L ${pw-d},${d}`, `M ${pw-d},${d} L ${pw-d},${d+l}`);
    // Bottom-left
    p.push(`M ${d},${ph-d} L ${d+l},${ph-d}`, `M ${d},${ph-d-l} L ${d},${ph-d}`);
    // Bottom-right
    p.push(`M ${pw-d-l},${ph-d} L ${pw-d},${ph-d}`, `M ${pw-d},${ph-d-l} L ${pw-d},${ph-d}`);
    return p.join(' ');
  };

  return (
    <div className="h-full bg-gray-100 flex flex-col overflow-hidden">
      <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg"><LayoutGrid size={22} /></div>
          <div><h1 className="text-lg font-medium">Bình trang đơn</h1><p className="text-violet-200 text-xs">Công cụ xếp hình in ấn</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium" title="Làm mới - Reset tất cả về mặc định">
            <RefreshCw size={14} /> Làm mới
          </button>
          
          {/* Upload button */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium cursor-pointer" title="Tải file lên">
            <Upload size={14} /> {uploadedFile ? uploadedFile.name.slice(0, 15) + (uploadedFile.name.length > 15 ? '...' : '') : 'Upload'}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
          </label>
          
          {/* Import from File Manager */}
          <button onClick={() => setIsFilePickerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium" title="Import từ Quản lý tệp">
            <FolderOpen size={14} /> Import
          </button>
          
          {/* Download SVG */}
          <button onClick={dlSVG} disabled={!currentPlan} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg text-xs font-medium disabled:opacity-40" title="Tải SVG cắt">
            <Scissors size={14} /> SVG
          </button>
          
          {/* Download PDF */}
          <button onClick={dlPDF} disabled={!currentPlan || !uploadedFile || apiStatus !== 'online' || isGenerating} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-xs font-medium disabled:opacity-40" title="Tải PDF in">
            {isGenerating ? <><Loader2 size={14} className="animate-spin" /> {progress}%</> : <><Download size={14} /> PDF</>}
          </button>
          
          {/* Save to File Manager */}
          <button onClick={saveToFileManager} disabled={!currentPlan || !uploadedFile || apiStatus !== 'online' || isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-xs font-medium disabled:opacity-40" title="Lưu vào Quản lý tệp">
            {isSaving ? <><Loader2 size={14} className="animate-spin" /></> : <><Save size={14} /> Lưu tệp</>}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white border-r flex flex-col overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2"><Package size={14} className="text-violet-500" /> Kích thước sản phẩm</h3>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {([
                { v: 'rect', i: Square, l: 'Chữ nhật' },
                { v: 'circle', i: Circle, l: 'Tròn' },
                { v: 'oval', i: RectangleHorizontal, l: 'Oval' },
                { v: 'trapezoid', i: () => <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L4 6h16l-2 12H6z"/></svg>, l: 'Thang' },
                { v: 'triangle', i: Triangle, l: 'Tam giác' },
                { v: 'hexagon', i: Hexagon, l: 'Lục giác' },
              ] as const).map(({ v, i: I, l }) => (
                <button key={v} onClick={() => setConfig({ ...config, shape: v as any })} className={'p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 ' + (config.shape === v ? 'bg-violet-100 border-violet-300 text-violet-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100')}>
                  {typeof I === 'function' && I.length === 0 ? <I /> : <I size={16} />}
                  {l}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Rộng (mm)</label><DebouncedNumberInput step={0.1} value={config.itemW} onChange={v => setConfig(c => ({ ...c, itemW: v }))} className="w-full border rounded-lg px-3 py-2 text-sm font-medium" /></div>
              {config.shape !== 'circle' && <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Cao (mm)</label><DebouncedNumberInput step={0.1} value={config.itemH} onChange={v => setConfig(c => ({ ...c, itemH: v }))} className="w-full border rounded-lg px-3 py-2 text-sm font-medium" /></div>}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Khoảng cách</label><DebouncedNumberInput step={0.1} min={0} value={config.padding} onChange={v => setConfig(c => ({ ...c, padding: v }))} className="w-full border rounded-lg px-3 py-2 text-sm text-center" /></div>
              <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Bù cắt</label><DebouncedNumberInput step={0.1} min={0} value={config.cutBleed} onChange={v => setConfig(c => ({ ...c, cutBleed: v }))} className="w-full border rounded-lg px-3 py-2 text-sm text-center" /></div>
              {['rect', 'trapezoid', 'triangle', 'hexagon'].includes(config.shape) && <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Bo góc</label><DebouncedNumberInput step={0.5} min={0} value={config.cornerRadius} onChange={v => setConfig(c => ({ ...c, cornerRadius: v }))} className="w-full border rounded-lg px-3 py-2 text-sm text-center" /></div>}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-gray-50 rounded-lg border border-gray-200 mb-3"><input type="checkbox" checked={config.useCrop} onChange={e => setConfig({ ...config, useCrop: e.target.checked })} className="rounded" />Dấu cắt (Crop marks)</label>
            {config.useCrop && <div className="grid grid-cols-4 gap-2 text-xs mb-3"><div><label className="block text-gray-500 mb-1">Dài</label><input type="number" step="0.5" value={config.cropLen} onChange={e => setConfig({ ...config, cropLen: parseFloat(e.target.value) || 0 })} className="w-full border rounded-lg px-2 py-1.5 text-center" /></div><div><label className="block text-gray-500 mb-1">Cách</label><input type="number" step="0.5" value={config.cropDist} onChange={e => setConfig({ ...config, cropDist: parseFloat(e.target.value) || 0 })} className="w-full border rounded-lg px-2 py-1.5 text-center" /></div><div><label className="block text-gray-500 mb-1">Dày</label><input type="number" step="0.1" value={config.cropThick} onChange={e => setConfig({ ...config, cropThick: parseFloat(e.target.value) || 0 })} className="w-full border rounded-lg px-2 py-1.5 text-center" /></div><div><label className="block text-gray-500 mb-1">Màu</label><input type="color" value={config.cropColor} onChange={e => setConfig({ ...config, cropColor: e.target.value })} className="w-full h-[30px] border rounded-lg cursor-pointer" /></div></div>}
            <div className="mb-3">
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">Chế độ fit</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { v: 'stretch', label: 'Kéo giãn', icon: <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                    <rect x="1" y="1" width="30" height="22" fill="#8b5cf6" opacity="0.25"/>
                    <path d="M6 12h20M16 5v14" stroke="#8b5cf6" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrow)"/>
                    <defs><marker id="arrow" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#8b5cf6"/></marker></defs>
                  </svg> },
                  { v: 'fill', label: 'Lấp đầy', icon: <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                    <rect x="-2" y="5" width="36" height="14" fill="#8b5cf6" opacity="0.25"/>
                    <rect x="-2" y="5" width="4" height="14" fill="#ef4444" opacity="0.4"/><rect x="30" y="5" width="4" height="14" fill="#ef4444" opacity="0.4"/>
                    <line x1="-1" y1="5" x2="-1" y2="19" stroke="#ef4444" strokeWidth="2"/>
                    <line x1="33" y1="5" x2="33" y2="19" stroke="#ef4444" strokeWidth="2"/>
                  </svg> },
                  { v: 'fit', label: 'Vừa khít', icon: <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                    <rect x="6" y="1" width="20" height="22" fill="#8b5cf6" opacity="0.25"/>
                    <rect x="1" y="1" width="5" height="22" fill="#f3f4f6"/>
                    <rect x="26" y="1" width="5" height="22" fill="#f3f4f6"/>
                  </svg> },
                  { v: 'actual', label: '100%', icon: <svg viewBox="0 0 32 24" className="w-10 h-8">
                    <rect x="1" y="1" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                    <rect x="10" y="7" width="12" height="10" fill="#8b5cf6" opacity="0.4" stroke="#8b5cf6" strokeWidth="1"/>
                  </svg> }
                ].map(m => (
                  <button key={m.v} onClick={() => setConfig({ ...config, fitMode: m.v as any })} className={`p-1.5 rounded-lg border-2 flex flex-col items-center gap-0.5 transition ${config.fitMode === m.v ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`} title={m.label}>
                    <span className={config.fitMode === m.v ? 'text-violet-600' : 'text-gray-400'}>{m.icon}</span>
                    <span className={`text-[8px] font-medium ${config.fitMode === m.v ? 'text-violet-700' : 'text-gray-500'}`}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Số lượng đơn hàng</label><input type="number" value={config.totalOrder} onChange={e => setConfig({ ...config, totalOrder: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>

          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              {/* Dual Orientation Buttons (Portrait & Landscape icons) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (config.pageW > config.pageH) {
                      updatePrint(Math.min(config.pageW, config.pageH), Math.max(config.pageW, config.pageH));
                    }
                  }}
                  className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    config.pageW <= config.pageH
                      ? 'bg-blue-600 text-white shadow-xs font-medium'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-white/60'
                  }`}
                  title="Khổ dọc (Portrait)"
                >
                  <RectangleVertical size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (config.pageW < config.pageH) {
                      updatePrint(Math.max(config.pageW, config.pageH), Math.min(config.pageW, config.pageH));
                    }
                  }}
                  className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    config.pageW > config.pageH
                      ? 'bg-blue-600 text-white shadow-xs font-medium'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-white/60'
                  }`}
                  title="Khổ ngang (Landscape)"
                >
                  <RectangleHorizontal size={13} />
                </button>
              </div>
              <h3 className="text-xs font-medium text-gray-500 uppercase">Khổ giấy in</h3>
            </div>
            <select onChange={e => e.target.value && handlePreset(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-3 bg-white" defaultValue="330x480"><option value="">-- Chọn --</option>{PAPER_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
            <div className="flex items-center gap-2 mb-3">
              <DebouncedNumberInput value={config.pageW} onChange={v => updatePrint(v, config.pageH)} className="flex-1 border rounded-lg px-3 py-2 text-sm font-medium text-center min-w-0" />
              <button onClick={swapDims} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"><RotateCcw size={16} /></button>
              <DebouncedNumberInput value={config.pageH} onChange={v => updatePrint(config.pageW, v)} className="flex-1 border rounded-lg px-3 py-2 text-sm font-medium text-center min-w-0" />
            </div>
            <div className="bg-rose-50 rounded-lg p-3">
              <label className="block text-[10px] font-medium text-rose-600 uppercase mb-2">Vùng in thực tế</label>
              <div className="flex items-center gap-2">
                <DebouncedNumberInput value={config.printW} onChange={v => setConfig(c => ({ ...c, printW: v }))} className="flex-1 border border-rose-200 rounded-lg px-3 py-2 text-sm text-center bg-white min-w-0" />
                <span className="text-gray-400">x</span>
                <DebouncedNumberInput value={config.printH} onChange={v => setConfig(c => ({ ...c, printH: v }))} className="flex-1 border border-rose-200 rounded-lg px-3 py-2 text-sm text-center bg-white min-w-0" />
              </div>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2"><Printer size={14} className="text-emerald-500" /> Thiết lập in</h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-amber-50 rounded-lg border border-amber-200"><input type="checkbox" checked={config.autoRotate} onChange={e => setConfig({ ...config, autoRotate: e.target.checked })} className="rounded text-amber-600" />Tự động xoay ảnh</label>
          </div>
        </aside>

        {/* Center: Preview only */}
        <main ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden min-w-0 bg-gray-100">
          {currentPlan ? (
            <div className="bg-white shadow-2xl rounded-lg relative" style={{ width: config.pageW * scale, height: config.pageH * scale }}>
              {/* Print area border - thinner, with 30% corners removed */}
              <svg className="absolute pointer-events-none" style={{ left: (config.pageW - config.printW) / 2 * scale, top: (config.pageH - config.printH) / 2 * scale, width: config.printW * scale, height: config.printH * scale }}>
                {(() => {
                  const w = config.printW * scale, h = config.printH * scale;
                  const gap = 0.3;
                  const startPct = gap, endPct = 1 - gap;
                  return (
                    <>
                      <line x1={w * startPct} y1={0} x2={w * endPct} y2={0} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                      <line x1={w * startPct} y1={h} x2={w * endPct} y2={h} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                      <line x1={0} y1={h * startPct} x2={0} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                      <line x1={w} y1={h * startPct} x2={w} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                    </>
                  );
                })()}
              </svg>
              {currentPlan.items.map((it, i) => {
                const effectiveItemH = config.shape === 'circle' ? config.itemW : config.itemH;
                // Special shapes keep their dimensions, rect/oval swap when rotated
                const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(config.shape);
                const actualW = (it.rot && !isSpecialShape) ? effectiveItemH : config.itemW;
                const actualH = (it.rot && !isSpecialShape) ? config.itemW : effectiveItemH;
                // Use landscape thumbnail for rotated items (rect/oval), portrait for others
                // For special shapes, rot means flipped 180 degrees (upside down)
                const previewSrc = previewImages ? 
                  `data:image/png;base64,${(it.rot && !isSpecialShape) ? previewImages.landscape : previewImages.portrait}` : null;
                
                // CSS transform for rotation
                const imgTransform = (isSpecialShape && it.rot) ? 'rotate(180deg)' : 'none';
                
                // Calculate preserveAspectRatio based on fitMode
                const getPreserveAspectRatio = () => {
                  switch (config.fitMode) {
                    case 'stretch': return 'none';
                    case 'fill': return 'xMidYMid slice'; // Cover - crop to fill
                    case 'fit': return 'xMidYMid meet'; // Contain - fit inside
                    case 'actual': return 'xMidYMid meet'; // 100% size, centered
                    default: return 'xMidYMid slice';
                  }
                };
                
                // For special shapes, use SVG for proper outline with corner radius
                if (isSpecialShape) {
                  const w = actualW * scale;
                  const h = actualH * scale;
                  const r = config.cornerRadius > 0 ? Math.min(config.cornerRadius * scale, w/4, h/4) : 0;
                  
                  // Helper function to create rounded path
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
                      const len1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1]);
                      const len2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1]);
                      const actualR = Math.min(r, len1/2, len2/2);
                      
                      const start = [p1[0] + (v1[0]/len1)*actualR, p1[1] + (v1[1]/len1)*actualR];
                      const end = [p1[0] + (v2[0]/len2)*actualR, p1[1] + (v2[1]/len2)*actualR];
                      
                      if (j === 0) d = `M ${start[0].toFixed(1)},${start[1].toFixed(1)}`;
                      else d += ` L ${start[0].toFixed(1)},${start[1].toFixed(1)}`;
                      d += ` Q ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${end[0].toFixed(1)},${end[1].toFixed(1)}`;
                    }
                    return d + ' Z';
                  };
                  
                  let points: [number, number][] = [];
                  // Always calculate Normal shape points. Rotation is handled by container transform.
                  if (config.shape === 'trapezoid') {
                    const offset = w * 0.15;
                    points = [[offset, 0], [w - offset, 0], [w, h], [0, h]];
                  } else if (config.shape === 'triangle') {
                    points = [[w/2, 0], [w, h], [0, h]];
                  } else if (config.shape === 'hexagon') {
                    const y25 = h * 0.25, y75 = h * 0.75;
                    points = [[w/2, 0], [w, y25], [w, y75], [w/2, h], [0, y75], [0, y25]];
                  }
                  
                  const pathD = roundedPath(points);
                  const clipId = `cp-${i}-${Date.now()}`; 
                  
                  return (
                    <svg key={i} className="absolute" style={{ 
                      left: it.x * scale, 
                      top: it.y * scale, 
                      width: w, 
                      height: h, 
                      overflow: 'visible',
                      transform: (it.rot) ? 'rotate(180deg)' : 'none' 
                    }}>
                      <defs>
                        <clipPath id={clipId}><path d={pathD} /></clipPath>
                      </defs>
                      {previewSrc ? (
                        <image 
                          href={previewSrc} 
                          width={w} 
                          height={h} 
                          clipPath={`url(#${clipId})`} 
                          preserveAspectRatio={getPreserveAspectRatio()} 
                        />
                      ) : (
                        <path d={pathD} fill="rgba(139,92,246,0.15)" />
                      )}
                      <path d={pathD} fill="none" stroke="#a78bfa" strokeWidth="1" shapeRendering="geometricPrecision" />
                      {!previewSrc && <text x={w/2} y={h/2 + 2} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="500" fill="#7c3aed" transform={it.rot ? `rotate(180 ${w/2} ${h/2})` : undefined}>{i + 1}</text>}
                    </svg>
                  );
                }
                
                // For rect/oval/circle or when preview image is available
                const clipPath = getClipPath(it.rot && isSpecialShape);
                const borderRadius = getBR();
                const containerW = actualW * scale;
                const containerH = actualH * scale;
                const objectFitValue = config.fitMode === 'stretch' ? 'fill' : 
                                       config.fitMode === 'fill' ? 'cover' : 
                                       config.fitMode === 'fit' ? 'contain' : 'none';
                return (
                  <div key={i} className="absolute" style={{ 
                    left: it.x * scale, 
                    top: it.y * scale, 
                    width: containerW, 
                    height: containerH, 
                    borderRadius: borderRadius,
                    border: '1px solid #a78bfa',
                    clipPath: clipPath !== 'none' ? clipPath : undefined, 
                    backgroundColor: previewSrc ? 'transparent' : 'rgba(139,92,246,0.15)', 
                    overflow: 'hidden' 
                  }}>
                    {previewSrc ? (
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
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        {isLoadingPreview ? <Loader2 size={12} className="animate-spin text-violet-400" /> : <span className="text-[9px] text-violet-500 font-medium">{i + 1}</span>}
                      </span>
                    )}
                  </div>
                );
              })}
              {config.useCrop && <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${config.pageW} ${config.pageH}`} preserveAspectRatio="none"><path fill="none" stroke={config.cropColor} strokeWidth={config.cropThick} d={cropPath()} /></svg>}
            </div>
          ) : <div className="text-gray-400 text-center"><LayoutGrid size={48} className="mx-auto mb-3 opacity-40" /><p className="text-base">Không có phương án phù hợp</p></div>}
        </main>

        {/* Floating Arrow Toggle Button on the Right Edge (Click to expand/collapse) */}
        <button
          type="button"
          onClick={toggleRightSidebar}
          className={`fixed z-50 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out w-5 hover:w-6.5 h-14 bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-slate-300 border-r-0 rounded-l-xl shadow-xs hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer group select-none ${
            isRightSidebarCollapsed ? "right-0" : "right-[700px] -mr-px"
          }`}
          title={isRightSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
        >
          {isRightSidebarCollapsed ? (
            <ChevronLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          ) : (
            <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          )}
        </button>

        {/* Right sidebar: Stats & Actions (w-[700px] matching /render) */}
        <aside
          className={`flex-shrink-0 h-full flex flex-col z-40 shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden bg-white border-slate-200 ${
            isRightSidebarCollapsed
              ? "w-0 min-w-0 border-l-0 opacity-0 pointer-events-none"
              : "w-[700px] max-w-[95vw] border-l opacity-100"
          }`}
        >
          <div className="w-[700px] max-w-[95vw] h-full flex flex-col overflow-y-auto flex-shrink-0">
            {/* Header with Title & Arrow-only Close/Collapse button */}
            <div className="p-3.5 border-b flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Settings2 size={18} className="text-violet-600 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-800 truncate">Thiết lập in & Khổ giấy</span>
                <span className="text-xs text-slate-500 font-medium ml-1">
                  ({config.pageW} × {config.pageH} mm)
                </span>
              </div>
              <button
                type="button"
                onClick={toggleRightSidebar}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
                title="Thu gọn"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          {/* Plan selector */}
          <div className="p-4 border-b">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
              <LayoutGrid size={14} className="text-violet-500" /> Các phương án xếp hình
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg flex-1 truncate font-medium">{currentPlan?.name || 'Chưa có'}</span>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full text-sm text-violet-600 font-medium border border-violet-200 bg-violet-50 px-3 py-2 rounded-lg hover:bg-violet-100 flex items-center justify-center gap-2">
              <Grid3X3 size={14} /> Xem các phương án ({plans.length})
            </button>
          </div>

          {/* Manual rotation */}
          <div className="p-4 border-b">
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">Xoay ảnh trong ô</label>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setManualRotate('auto')} className={'flex-1 px-2 py-2 rounded-md text-xs font-medium transition ' + (manualRotate === 'auto' ? 'bg-white shadow text-violet-700' : 'text-gray-600')}>Tự động</button>
              <button onClick={() => setManualRotate('portrait')} className={'flex-1 px-2 py-2 rounded-md text-xs font-medium transition ' + (manualRotate === 'portrait' ? 'bg-white shadow text-blue-700' : 'text-gray-600')}>Dọc</button>
              <button onClick={() => setManualRotate('landscape')} className={'flex-1 px-2 py-2 rounded-md text-xs font-medium transition ' + (manualRotate === 'landscape' ? 'bg-white shadow text-green-700' : 'text-gray-600')}>Ngang</button>
            </div>
          </div>

          {/* Stats & Price combined */}
          <div className="p-4 border-b bg-gradient-to-b from-violet-50 to-white">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
                <div className="text-2xl font-medium text-violet-600">{currentPlan?.qty || 0}</div>
                <div className="text-[10px] text-gray-500 uppercase">tem/tờ</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
                <div className="text-2xl font-medium text-gray-700">{sheets > 0 ? sheets.toLocaleString() : '-'}</div>
                <div className="text-[10px] text-gray-500 uppercase">tờ cần in</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input type="text" value={unitPrice.toLocaleString('vi-VN')} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setUnitPrice(parseInt(v) || 0); }} className="flex-1 border rounded-lg px-3 py-2 text-right text-sm bg-white font-medium" />
              <span className="text-xs text-gray-500 w-12">đ/tờ</span>
            </div>
            {sheets > 0 && (
              <div className="bg-emerald-100 rounded-lg p-3 text-center">
                <div className="text-xl font-medium text-emerald-700">{totalCost.toLocaleString()}đ</div>
                <div className="text-xs text-emerald-600">{Math.round(pricePerItem).toLocaleString()}đ/tem</div>
              </div>
            )}
          </div>

          {/* Export settings */}
          <div className="p-4 border-b space-y-3">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">Chế độ xuất</label>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setConfig({ ...config, processMode: 'vector' })} className={'flex-1 px-2 py-2 rounded-md text-xs font-medium transition ' + (config.processMode === 'vector' ? 'bg-white shadow text-blue-700' : 'text-gray-600')}>Vector</button>
                <button onClick={() => setConfig({ ...config, processMode: 'raster' })} className={'flex-1 px-2 py-2 rounded-md text-xs font-medium transition ' + (config.processMode === 'raster' ? 'bg-white shadow text-orange-700' : 'text-gray-600')}>Convert</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Hệ màu</label>
                <select value={config.colorMode} onChange={e => setConfig({ ...config, colorMode: e.target.value as any })} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
                  <option value="original">Giữ nguyên</option><option value="cmyk">CMYK</option><option value="cmyk_k100">CMYK + K100</option><option value="rgb">RGB</option><option value="konica">Konica</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">DPI</label>
                <select value={config.dpi} onChange={e => setConfig({ ...config, dpi: parseInt(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
                  <option value={150}>150</option><option value={300}>300</option><option value={600}>600</option><option value={1200}>1200</option>
                </select>
              </div>
            </div>
            
            {/* Advanced Color Management Toggle */}
            <div className="mt-3">
              <button 
                onClick={() => setConfig({ ...config, useAdvancedColor: !config.useAdvancedColor })}
                className={`w-full text-xs font-medium px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                  config.useAdvancedColor 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Circle size={12} className={config.useAdvancedColor ? 'text-blue-500' : 'text-gray-400'} />
                Hệ màu nâng cao (3 lớp ICC)
              </button>
            </div>

            {/* Advanced Color Management Panel */}
            {config.useAdvancedColor && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="text-xs font-medium text-blue-700 uppercase mb-2 flex items-center gap-1">
                  <Circle size={10} className="text-blue-500" />
                  Chuyển đổi ICC 3 lớp
                </div>
                
                {isLoadingIccProfiles ? (
                  <div className="text-center py-2">
                    <Loader2 size={16} className="animate-spin mx-auto text-blue-500" />
                    <div className="text-xs text-blue-600 mt-1">Đang tải ICC profiles...</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Source ICC */}
                    <div>
                      <label className="block text-[9px] font-medium text-blue-600 uppercase mb-1">1. Nguồn ICC</label>
                      <select 
                        value={config.sourceIcc} 
                        onChange={e => setConfig({ ...config, sourceIcc: e.target.value })}
                        className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="original">Ảnh gốc (không chuyển đổi)</option>
                        {iccProfiles.map(profile => (
                          <option key={profile.filename} value={profile.filename}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ICC 1 */}
                    <div>
                      <label className="block text-[9px] font-medium text-blue-600 uppercase mb-1">2. ICC lần 1</label>
                      <select 
                        value={config.icc1} 
                        onChange={e => setConfig({ ...config, icc1: e.target.value })}
                        className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="">Bỏ qua lớp này</option>
                        {iccProfiles.map(profile => (
                          <option key={profile.filename} value={profile.filename}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ICC Output */}
                    <div>
                      <label className="block text-[9px] font-medium text-blue-600 uppercase mb-1">3. ICC xuất (chốt)</label>
                      <select 
                        value={config.iccOutput} 
                        onChange={e => setConfig({ ...config, iccOutput: e.target.value })}
                        className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="">Bỏ qua lớp này</option>
                        {iccProfiles.map(profile => (
                          <option key={profile.filename} value={profile.filename}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ICC Info */}
                    <div className="text-[9px] text-blue-600 bg-blue-100 p-2 rounded border">
                      <div className="font-medium mb-1">Quy trình chuyển đổi:</div>
                      <div className="space-y-0.5">
                        <div>• Nguồn: {config.sourceIcc === 'original' ? 'Ảnh gốc' : config.sourceIcc || 'Chưa chọn'}</div>
                        <div>• Lớp 1: {config.icc1 || 'Bỏ qua'}</div>
                        <div>• Xuất: {config.iccOutput || 'Bỏ qua'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LOWER SECTION: LỊCH SỬ BÌNH TRANG (bên dưới Thiết lập in & Khổ giấy) */}
            <div className="border-t border-slate-200">
              <div 
                className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/70 transition"
                onClick={() => setIsHistorySectionOpen(v => !v)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock size={16} className="text-indigo-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-800 uppercase tracking-wider">Lịch sử bình trang</span>
                  {impositionHistory.length > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                      {impositionHistory.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {impositionHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Xoá tất cả lịch sử"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsHistorySectionOpen(v => !v)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
                    title={isHistorySectionOpen ? "Thu gọn" : "Mở rộng"}
                  >
                    {isHistorySectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isHistorySectionOpen && (
                <div className="p-4">
                  {impositionHistory.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <Clock size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-xs font-medium text-slate-600">Chưa có lịch sử bình trang</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                        Mỗi lần bạn bấm xuất file PDF hoặc lưu vào Quản lý tệp, tác vụ và thông số bình trang sẽ tự động được lưu trữ tại đây để bạn có thể xem lại hoặc nạp lại thông số chỉ với 1 click.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {impositionHistory.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => item.configSnapshot && restoreHistoryConfig(item)}
                          className="p-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl shadow-xs transition group cursor-pointer"
                          title="Nhấn để nạp lại thông số bình trang này"
                        >
                          {/* Main Row: Thumbnail + Info (mỗi item 1 hàng) */}
                          <div className="flex items-start gap-3">
                            {/* Thumbnail */}
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt="Thumbnail"
                                className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-xs flex-shrink-0 bg-slate-100 mt-0.5"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                                <LayoutGrid size={18} />
                              </div>
                            )}

                            {/* Info: Mỗi item nằm trên 1 hàng */}
                            <div className="min-w-0 flex-1 text-[11px] text-slate-600 space-y-0.5">
                              <div className="truncate">
                                <span className="text-slate-400">Khổ:</span> <strong className="text-slate-700 font-semibold">{item.paperW}×{item.pageH}mm</strong>
                              </div>
                              <div className="truncate">
                                <span className="text-slate-400">Tem:</span> <strong className="text-slate-700 font-semibold">{item.itemW}×{item.itemH}mm</strong>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <span><span className="text-slate-400">Số lượng:</span> <strong className="text-slate-700 font-semibold">{item.layoutCount} tem</strong></span>
                                {item.processMode && (
                                  <span className="capitalize px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 text-[10px] flex-shrink-0">
                                    {item.processMode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Nút ngày tháng năm + nút xóa nằm bên dưới */}
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-400" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Clock size={12} className="flex-shrink-0" />
                              <span>{item.date}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => removeHistoryItem(item.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="Xóa mục này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-medium text-lg text-gray-900">Chọn phương án xếp</h3><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X size={20} /></button></div>
            <div className="p-5 overflow-auto max-h-[70vh]">
              {plans.length === 0 ? <div className="text-center py-12 text-gray-400"><AlertCircle size={48} className="mx-auto mb-3 opacity-50" /><p className="text-base">Không tìm thấy phương án</p></div> : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {plans.map((pl, i) => { const sc = 130 / config.pageW; return (
                    <div key={i} className={'border-2 p-4 rounded-xl cursor-pointer transition hover:shadow-xl ' + (i === currentPlanIndex ? 'border-violet-500 bg-violet-50 shadow-lg' : 'border-gray-200 hover:border-violet-300')} onClick={() => { setCurrentPlanIndex(i); setIsModalOpen(false); }}>
                      <div className="flex justify-between items-center mb-3"><span className="font-medium text-sm text-gray-800">{pl.name}</span><span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-1 rounded-full">{pl.qty} tem</span></div>
                      <div className="flex justify-center bg-gray-100 p-3 rounded-lg"><div className="bg-white shadow border relative rounded" style={{ width: config.pageW * sc, height: config.pageH * sc }}>{pl.items.map((it, j) => { const aw = (it.rot ? config.itemH : config.itemW) * sc; const ah = (it.rot ? config.itemW : config.itemH) * sc; return <div key={j} className="absolute bg-violet-200 border border-violet-300" style={{ left: it.x * sc, top: it.y * sc, width: aw, height: ah, borderRadius: config.shape === 'circle' ? '50%' : config.cornerRadius > 0 ? config.cornerRadius * sc + 'px' : '2px' }} />; })}</div></div>
                      {i === currentPlanIndex && <div className="mt-3 text-center"><span className="text-xs font-medium text-violet-600 flex items-center justify-center gap-1"><Check size={14} /> Đang chọn</span></div>}
                    </div>
                  ); })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Picker Modal */}
      <FilePickerModal
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelect={handleFileFromManager}
        accept={['PDF', 'IMAGE']}
        title="Chọn tệp từ Quản lý tệp"
      />
    </div>
  );
};

export default ImpositionPage;
