/* eslint-disable */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppNavigation } from './hooks/useAppNavigation';
import TopNavBar from './components/TopNavBar';
import { CustomerView } from './CustomerView';
import { shouldElementBeVisible } from './utils/elementRenderer';
import { TextVectorRenderer } from './components/TextVectorRenderer';
import { AutoNumberingModule } from './components/AutoNumberingModule';
import { PdfProcessor } from './components/PdfProcessor';
import { createFederatedComponent, RouteLoadingFallback } from './utils/federationLoader';
import { Toaster } from 'react-hot-toast';

// ============================================================================
// MICRO-FRONTEND MODULE FEDERATION (Option B)
// Các phân hệ được tách thành Remote Modules độc lập, có thể build và deploy
// riêng lẻ từng phân hệ mà không làm gián đoạn người dùng ở các phân hệ khác.
// Tự động dự phòng (fallback) về local component khi dev hoặc khi remote lỗi.
// ============================================================================

// 1. Phân hệ Render Prepress & Color Studio (remote_render)
const RenderPdfPage = createFederatedComponent(
  {
    scope: 'remote_render',
    url: '/modules/render/remoteEntry.js',
    module: './RenderPdfPage',
  },
  () => import('./components/RenderPdfPage')
);

// 2. Phân hệ Tính Giá Offset & Digital (remote_calc)
const PriceCalculatorOffset = createFederatedComponent(
  {
    scope: 'remote_calc',
    url: '/modules/calc/remoteEntry.js',
    module: './PriceCalculatorOffset',
  },
  () => import('./components/PriceCalculatorOffset')
);

const PriceCalculatorDigital = createFederatedComponent(
  {
    scope: 'remote_calc',
    url: '/modules/calc/remoteEntry.js',
    module: './PriceCalculatorDigital',
  },
  () => import('./components/PriceCalculatorDigital')
);

const PaperPriceManager = createFederatedComponent(
  {
    scope: 'remote_calc',
    url: '/modules/calc/remoteEntry.js',
    module: './PaperPriceManager',
  },
  () => import('./components/PaperPriceManager')
);

// 3. Phân hệ Quản trị Kinh doanh & CRM (remote_crm)
const CustomersPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './CustomersPage',
  },
  () => import('./components/business/CustomersPage')
);

const QuotesPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './QuotesPage',
  },
  () => import('./components/business/QuotesPage')
);

const InvoicesPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './InvoicesPage',
  },
  () => import('./components/business/InvoicesPage')
);

const OrdersPage = createFederatedComponent(
  {
    scope: 'remote_crm',
    url: '/modules/crm/remoteEntry.js',
    module: './OrdersPage',
  },
  () => import('./components/business/OrdersPage')
);

// 4. Phân hệ Bình Trang & Khuôn Hộp Bao Bì (remote_imposition)
const ImpositionPage = createFederatedComponent(
  {
    scope: 'remote_imposition',
    url: '/modules/imposition/remoteEntry.js',
    module: './ImpositionPage',
  },
  () => import('./components/ImpositionPage')
);

const ImpositionAdvancedPage = createFederatedComponent(
  {
    scope: 'remote_imposition',
    url: '/modules/imposition/remoteEntry.js',
    module: './ImpositionAdvancedPage',
  },
  () => import('./components/ImpositionAdvancedPage')
);

const DieCuttingPage = createFederatedComponent(
  {
    scope: 'remote_imposition',
    url: '/modules/imposition/remoteEntry.js',
    module: './DieCuttingPage',
  },
  () => import('./components/DieCuttingPage')
);

// 5. Phân hệ Label & VDP Designer (remote_designer)
const LabelDesignerPage = createFederatedComponent(
  {
    scope: 'remote_designer',
    url: '/modules/designer/remoteEntry.js',
    module: './LabelDesignerPage',
  },
  () => import('./components/LabelDesignerPage')
);

// 6. Phân hệ Quản trị Hệ thống Admin (remote_admin)
const AdminPage = createFederatedComponent(
  {
    scope: 'remote_admin',
    url: '/modules/admin/remoteEntry.js',
    module: './AdminPage',
  },
  () => import('./components/AdminPage')
);

// 7. Phân hệ AI Image Suite (remote_ai)
const AIImageProcessor = createFederatedComponent(
  {
    scope: 'remote_ai',
    url: '/modules/ai/remoteEntry.js',
    module: './AIImageProcessor',
  },
  () => import('./components/ai/AIImageProcessor')
);

import { HomePage } from './components/HomePage';
import { AccountDashboard, TopUpModal } from './components/account';
import { AuthProvider, useAuth, LoginModal, AuthGuard } from './components/auth';
import { PrintConfigProvider } from './contexts/PrintConfigContext';
import FileManagerPage from './components/FileManagerPage';
import { SupabaseFileManager } from './components/SupabaseFileManager';
import { FilePickerModal } from './components/FilePickerModal';
import { ServiceDetachedNotice } from './components/ServiceDetachedNotice';
import { microservicesManager, useMicroservicesState } from './services/microservicesConfig';
import AIRobotAssistant from './components/AIRobotAssistant';
import { MenuView } from './components/MenuView';
import { SupabaseDemo } from './components/SupabaseDemo';
import { fileService } from './services/fileService';
import { exportCanvasToPdf, replaceImagesInPdf, downloadPdf, CanvasElement } from './utils/canvasPdfExport';
import { 
  Type, Square, QrCode, ScanLine, Image as ImageIcon, Settings, Database, Download, FolderOpen, 
  Trash2, Move, ChevronLeft, ChevronRight, ChevronDown, AlignHorizontalJustifyCenter, 
  AlignVerticalJustifyCenter, ArrowUp, ArrowDown, FileType, AlignLeft, AlignRight, 
  AlignStartVertical, AlignEndVertical, WrapText, Minus, Circle, Table as TableIcon, 
  Plus, X, Edit3, RefreshCcw, Maximize, Images, CheckCircle2, AlertCircle, Layers, 
  Lock, Unlock, Eye, EyeOff, Search, ZoomIn, ZoomOut, RefreshCw, Grid3x3, Upload, 
  Link as LinkIcon, FileSpreadsheet, Printer as PrinterIcon, MousePointerClick, 
  Bold, Italic, Underline, GripVertical, Hand, Palette, TriangleAlert, Info,
  Scaling, Expand, Scan, Maximize2, Minimize2, Undo, Redo, PanelRightClose, PanelRightOpen,
  Share2, Settings2, Save, Users, File as FileIcon2
} from 'lucide-react';

// --- CONSTANTS ---
const MM_TO_PX = 3.7795; // 96 DPI

// Uses proxy - relative URLs
const API_BASE = '/api';

// --- TYPES ---
type ElementType = 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
type ObjectFitType = 'fill' | 'contain' | 'cover' | 'none';
type ImgDataType = 'filename' | 'number';
type TextFitMode = 'actual' | 'fit' | 'stretch' | 'fill';
type AlignMode = 'content' | 'page'; 
type QrCodeType = 'default' | 'micro' | 'iqr' | 'rmqr';
type QrBankTemplate = 'compact2' | 'compact' | 'qr_only' | 'print';

interface BankInfo {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

interface QrBankConfig {
  enabled: boolean;
  bankBin: string;
  accountNoField: string;
  accountNameField: string;
  addInfoField: string;
  amountField: string;
  template: QrBankTemplate;
}

export interface ElementData {
  id: string;
  type: ElementType;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  content: string;
  style: React.CSSProperties;
  src?: string; 
  // Common Props
  isLocked?: boolean;
  isPrintVisible?: boolean; 
  borderRadius?: string; 
  
  // Image/ImgData Props
  objectFit?: ObjectFitType;
  objectPosition?: string; // e.g. "50% 50%"
  dataType?: ImgDataType;

  // Text Advanced Props
  textFitMode?: TextFitMode; 
  textAlignH?: 'flex-start' | 'center' | 'flex-end'; 
  textAlignV?: 'flex-start' | 'center' | 'flex-end'; 
  textWrap?: boolean; 
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  isCurved?: boolean; 
  qrType?: QrCodeType;
  isStretched?: boolean;
  rotate?: number; // degrees
  // QR Bank Props
  qrBankConfig?: QrBankConfig;
}

interface SheetRow {
  [key: string]: string;
}

interface UploadedImage {
  id: string;
  name: string;
  src: string;
}

export interface PageConfig {
  format: 'A3' | 'A4' | 'A5' | 'Custom';
  orientation: 'portrait' | 'landscape';
  width: number; // mm
  height: number; // mm
}

type InteractionMode = 'IDLE' | 'DRAGGING' | 'RESIZING' | 'ROTATING';
type SidebarTab = 'properties' | 'layers';
type DataTab = 'table' | 'google' | 'upload';

// --- UTILS ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const pxToMm = (px: number) => Math.round((px / MM_TO_PX) * 100) / 100;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const parseCSV = (text: string) => {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []; 
    const simpleValues = line.split(',');
    const finalValues = values.length >= headers.length ? values : simpleValues;
    const rowData: SheetRow = {};
    headers.forEach((h, i) => {
      rowData[h] = (finalValues[i] || '').replace(/^"|"$/g, '').trim();
    });
    return rowData;
  });
  return { headers, rows };
};

const processGoogleSheetUrl = (url: string) => {
  try {
    if (url.includes('output=csv') || url.endsWith('.csv')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    return null;
  } catch (e) { return null; }
};

const getQrUrl = (content: string, type: string = 'default') => {
    const encoded = encodeURIComponent(content);
    switch (type) {
        case 'micro': return `https://bwipjs-api.metafloor.com/?bcid=microqrcode&text=${encoded}&scale=2`;
        case 'rmqr': return `https://bwipjs-api.metafloor.com/?bcid=rmqr&text=${encoded}&scale=2`;
        case 'iqr': return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}&color=000080`; 
        default: return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}`;
    }
};

// --- RULER COMPONENT ---
const Ruler = ({ orientation, size, zoom }: { orientation: 'horizontal' | 'vertical', size: number, zoom: number }) => {
    const ticks = [];
    const step = 10; // 10mm
    const totalTicks = Math.ceil(size / step);

    for (let i = 0; i <= totalTicks; i++) {
        const pos = i * step * MM_TO_PX * zoom;
        ticks.push(
            <div key={i} className="absolute text-[8px] text-gray-500 flex items-center justify-center pointer-events-none"
                style={{
                    left: orientation === 'horizontal' ? pos : 0,
                    top: orientation === 'vertical' ? pos : 0,
                    width: orientation === 'horizontal' ? 1 : '100%',
                    height: orientation === 'vertical' ? 1 : '100%',
                }}>
                {orientation === 'horizontal' && (
                    <>
                        <div className="h-2 w-px bg-gray-400 absolute top-0"></div>
                        <span className="mt-4">{i * step}</span>
                    </>
                )}
                {orientation === 'vertical' && (
                     <>
                        <div className="w-2 h-px bg-gray-400 absolute left-0"></div>
                        <span className="ml-4">{i * step}</span>
                    </>
                )}
            </div>
        );
    }
    return (
        <div className={`relative bg-gray-50 border-gray-300 select-none ${orientation === 'horizontal' ? 'h-5 border-b mb-0' : 'w-5 border-r mr-0'}`} 
             style={{ 
                 width: orientation === 'horizontal' ? size * MM_TO_PX * zoom : 20, 
                 height: orientation === 'vertical' ? size * MM_TO_PX * zoom : 20 
             }}>
            {ticks}
        </div>
    );
};

// --- APP COMPONENT ---

function App() {
  // Page & View State
  const [pageConfig, setPageConfig] = useState<PageConfig>({ format: 'A5', orientation: 'landscape', width: 210, height: 148 });
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCssFullScreen, setIsCssFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMarqueeMode, setIsMarqueeMode] = useState(false); // Chế độ bôi đen (marquee selection)
  const containerRef = useRef<HTMLDivElement>(null); 
  const [showRobot, setShowRobot] = useState(false);

  // App Data State
  const [elements, setElements] = useState<ElementData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Multi-select
  
  // Marquee Selection State
  const [marqueeStart, setMarqueeStart] = useState<{x: number, y: number} | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{x: number, y: number} | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  
  // History State
  const [history, setHistory] = useState<ElementData[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [dataRows, setDataRows] = useState<SheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isSavingToFileManager, setIsSavingToFileManager] = useState(false);
  const [isSaveProjectDialogOpen, setIsSaveProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [existingProjects, setExistingProjects] = useState<{id: string, name: string}[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontSearch, setFontSearch] = useState<string>('');
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('properties');
  
  // Media & Modals
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [dataModalTab, setDataModalTab] = useState<DataTab>('table'); 
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);
  // Navigation via React Router
  const { currentPage, setCurrentPage } = useAppNavigation();
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
  const [accountTab, setAccountTab] = useState<string>('overview'); // Account page tab
  
  // Bank QR State
  const [bankList, setBankList] = useState<BankInfo[]>([]);
  const [bankSearch, setBankSearch] = useState<string>('');

  // Customer Preview State
  const [showCustomerView, setShowCustomerView] = useState(false);
  const [customerSettings, setCustomerSettings] = useState({ active: true, pin: '', allowEdit: false });
  const [customerNotes, setCustomerNotes] = useState<Record<number, string>>({});
  const [isCustomerConfigOpen, setIsCustomerConfigOpen] = useState(false);

  // Menu View State
  const [menuId, setMenuId] = useState<string | null>(null);

  // Initialization State
  const [isInitialized, setIsInitialized] = useState(false);

  // Auth State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const { wallet, refreshWallet, isAuthenticated, user } = useAuth();

  // Refs to track current selection for socket handler (avoids stale closure)
  const selectedIdRef = useRef<string | null>(null);
  const selectedIdsRef = useRef<string[]>([]);
  
  // Refs for manipulation state
  const isManipulatingRef = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedIdRef.current = selectedId;
    selectedIdsRef.current = selectedIds;
  }, [selectedId, selectedIds]);

  // Initialize app
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Interaction Refs
  const [mode, setMode] = useState<InteractionMode>('IDLE');
  const [alignMode, setAlignMode] = useState<AlignMode>('page'); 
  const dragStartRef = useRef<{ x: number, y: number, initialX: number, initialY: number, initialW: number, initialH: number } | null>(null);
  const resizeDirectionRef = useRef<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Layer DND State
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  // Default System Fonts
  const defaultFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma', 
    'Trebuchet MS', 'Courier New', 'Impact', 'Comic Sans MS', 'Palatino Linotype',
    'Lucida Sans Unicode', 'Lucida Console', 'Garamond', 'Book Antiqua'
  ];

  // Load fonts from public/fonts folder
  useEffect(() => {
    const loadFontsFromFolder = async () => {
      try {
        const response = await fetch('/fonts/fonts.json');
        if (response.ok) {
          const fontList: { name: string; file: string }[] = await response.json();
          const loadedFonts: string[] = [];
          
          for (const font of fontList) {
            try {
              // Encode filename để xử lý khoảng trắng và ký tự đặc biệt
              const encodedFile = encodeURIComponent(font.file);
              const fontFace = new FontFace(font.name, `url(/fonts/${encodedFile})`, {
                display: 'swap'
              });
              document.fonts.add(fontFace);
              loadedFonts.push(font.name);
            } catch (fontError) {
              // Bỏ qua lỗi cú pháp nếu có
            }
          }
          
          setSystemFonts(loadedFonts);
          console.log(`Đã nạp ${loadedFonts.length}/${fontList.length} fonts từ thư mục /fonts`);
        }
      } catch (e) {
        console.log('Không tìm thấy fonts.json trong /fonts folder');
      }
    };
    loadFontsFromFolder();
  }, []);

  // All available fonts
  const allFonts = useMemo(() => {
    const combined = [...defaultFonts, ...systemFonts, ...customFonts];
    return Array.from(new Set(combined)).sort();
  }, [systemFonts, customFonts]);

  // Filtered fonts for search
  const filteredFonts = useMemo(() => {
    if (!(fontSearch || '').trim()) return allFonts;
    return allFonts.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));
  }, [allFonts, fontSearch]);

  // Load bank list from VietQR API
  useEffect(() => {
    const loadBanks = async () => {
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setBankList(data.data);
            console.log(`Đã load ${data.data.length} ngân hàng từ VietQR`);
          }
        }
      } catch (e) {
        console.log('Không thể load danh sách ngân hàng');
      }
    };
    loadBanks();
  }, []);

  // Check for Preview Mode URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview')) {
      setShowCustomerView(true);
      // Giả lập: Nếu vào bằng link thì mặc định enable active (trong thực tế sẽ load config từ server)
      setCustomerSettings(s => ({...s, active: true}));
    }
  }, []);

  // Check for Menu URL (handled by router now, but keep menuId extraction)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/menu/')) {
      const id = path.split('/')[2];
      if (id) {
        setMenuId(id);
      }
    }
  }, []);

  // Filtered banks for search
  const filteredBanks = useMemo(() => {
    if (!(bankSearch || '').trim()) return bankList;
    return bankList.filter(b => 
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.code.toLowerCase().includes(bankSearch.toLowerCase())
    );
  }, [bankList, bankSearch]);

  // --- HISTORY MANAGEMENT ---
  const saveHistory = useCallback((newElements: ElementData[]) => {
    if (isUndoRedoAction.current) {
        isUndoRedoAction.current = false;
        return;
    }
    setHistory(prev => {
        const newHistory = prev.slice(0, historyStep + 1);
        return [...newHistory, newElements];
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep]);

  // Initial Load
  useEffect(() => {
      if (history.length === 0) {
          const initialElements: ElementData[] = [{
              id: 'demo-text', type: 'text', x: 20, y: 20, width: 100, height: 30,
              content: '{HoTen}',
              style: { fontSize: '24px', fontWeight: 'bold', color: '#333333', backgroundColor: 'transparent', zIndex: 1, border: 'none' },
              textFitMode: 'actual', textAlignH: 'center', textAlignV: 'center', textWrap: false, borderRadius: '0%',
              isLocked: false, isPrintVisible: true, rotate: 0
          }];
          setElements(initialElements);
          setHistory([initialElements]);
          setHistoryStep(0);
          setHeaders(["HoTen", "MaSo", "ChucVu", "MaAnh"]);
          setDataRows([
            { HoTen: "Nguyễn Văn A", MaSo: "NV001", ChucVu: "Giám Đốc", MaAnh: "1" },
            { HoTen: "Trần Thị B", MaSo: "NV002", ChucVu: "Kế Toán", MaAnh: "2" },
          ]);
          setSelectedId('demo-text');
      }
  }, []); 

  const handleUndo = () => {
      if (historyStep > 0) {
          isUndoRedoAction.current = true;
          const prevStep = historyStep - 1;
          setElements(history[prevStep]);
          setHistoryStep(prevStep);
      }
  };

  const handleRedo = () => {
      if (historyStep < history.length - 1) {
          isUndoRedoAction.current = true;
          const nextStep = historyStep + 1;
          setElements(history[nextStep]);
          setHistoryStep(nextStep);
      }
  };

  // Computed
  const currentRowData = useMemo(() => dataRows.length > 0 ? dataRows[currentRowIndex] : null, [dataRows, currentRowIndex]);
  const selectedElement = useMemo(() => elements.find(e => e.id === selectedId), [elements, selectedId]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDataModalOpen || isImageManagerOpen || isNumberingModalOpen) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); return; }
      
      // Zoom Shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(z => Math.min(5, z + 0.1)); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.2, z - 0.1)); return; }

      if (!selectedId) return;
      const el = elements.find(e => e.id === selectedId);
      if (el?.isLocked) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') deleteElement(selectedId);
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
         e.preventDefault();
         const step = e.shiftKey ? 5 : 0.5; 
         const newElements = elements.map(el => {
            if (el.id !== selectedId) return el;
            let { x, y } = el;
            if (e.key === 'ArrowUp') y -= step;
            if (e.key === 'ArrowDown') y += step;
            if (e.key === 'ArrowLeft') x -= step;
            if (e.key === 'ArrowRight') x += step;
            return { ...el, x, y };
         });
         setElements(newElements);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, isDataModalOpen, isImageManagerOpen, isNumberingModalOpen, elements, history, historyStep]);

  // --- Core Actions ---
  const addElement = (type: ElementType) => {
    const newEl: ElementData = {
      id: generateId(),
      type,
      x: 5, y: 5, width: type === 'text' ? Math.min(60, pageConfig.width * 0.6) : Math.min(25, pageConfig.width * 0.3), height: type === 'text' ? Math.min(10, pageConfig.height * 0.15) : Math.min(25, pageConfig.height * 0.3),
      content: type === 'text' ? 'Text' : type === 'qr' || type === 'barcode' ? '123456' : '',
      src: type === 'image' ? 'https://via.placeholder.com/150' : undefined,
      isLocked: false, isPrintVisible: true, borderRadius: '0%', rotate: 0,
      textFitMode: 'actual', textAlignH: 'center', textAlignV: 'center', textWrap: false,
      objectFit: 'contain', objectPosition: '50% 50%', dataType: 'filename', qrType: 'default',
      style: {
        backgroundColor: type === 'box' ? '#e2e8f0' : 'transparent',
        border: type === 'box' ? '1px solid #94a3b8' : 'none', 
        fontSize: '16px', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none',
        color: '#000000', zIndex: elements.length + 1,
      }
    };
    const newElements = [...elements, newEl];
    setElements(newElements);
    saveHistory(newElements);
    setSelectedId(newEl.id);
    setActiveTab('properties');
    if(!isSidebarOpen) setIsSidebarOpen(true);
  };

  const handleReset = () => {
      if(window.confirm("Làm mới toàn bộ?")) {
          setElements([]); setDataRows([]); setHeaders([]); setUploadedImages([]); 
          setCurrentRowIndex(0); setSheetUrl('');
          saveHistory([]);
      }
  };

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement && !isCssFullScreen) {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            setIsCssFullScreen(true);
        }
      } else {
        if (document.exitFullscreen && isFullScreen) {
          await document.exitFullscreen();
          setIsFullScreen(false);
        }
        setIsCssFullScreen(false);
      }
    } catch (err) {
      setIsCssFullScreen(!isCssFullScreen);
    }
  };

  // --- Zoom & Pan ---
  const handleZoomFit = useCallback(() => {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      
      // Prevent NaN when container has no size yet
      if (containerW <= 0 || containerH <= 0) return;
      
      const pageW = mmToPx(pageConfig.width);
      const pageH = mmToPx(pageConfig.height);
      const margin = 60; 

      const scaleW = (containerW - margin) / pageW;
      const scaleH = (containerH - margin) / pageH;
      const newZoom = Math.min(scaleW, scaleH, 3); 
      
      // Ensure zoom is a valid number
      if (isNaN(newZoom) || !isFinite(newZoom) || newZoom <= 0) {
          setZoom(1);
          return;
      }

      setZoom(newZoom);
  }, [pageConfig]);

  useEffect(() => {
      handleZoomFit();
      window.addEventListener('resize', handleZoomFit);
      return () => window.removeEventListener('resize', handleZoomFit);
  }, [handleZoomFit, isFullScreen, isCssFullScreen, isSidebarOpen]);

  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const scale = e.deltaY > 0 ? 0.9 : 1.1;
          setZoom(z => Math.min(Math.max(z * scale, 0.2), 5));
      }
  };

  // --- Alignment ---
  const apply9PointAlign = (pos: string) => {
      if (!selectedId) return;
      const [h, v] = pos.split(' '); // h: 0%, 50%, 100%; v: 0%, 50%, 100%

      if (alignMode === 'page') {
          // Align element relative to page
          const el = elements.find(e => e.id === selectedId);
          if (!el) return;
          let newX = el.x;
          let newY = el.y;

          if (h === '0%') newX = 0;
          if (h === '50%') newX = (pageConfig.width - el.width) / 2;
          if (h === '100%') newX = pageConfig.width - el.width;

          if (v === '0%') newY = 0;
          if (v === '50%') newY = (pageConfig.height - el.height) / 2;
          if (v === '100%') newY = pageConfig.height - el.height;

          const newElements = elements.map(e => e.id === selectedId ? { ...e, x: newX, y: newY } : e);
          setElements(newElements);
          saveHistory(newElements);
      } else {
          // Align content inside element
          if (selectedElement?.type === 'text') {
              // Map 0%, 50%, 100% to flex alignment
              const hMap: Record<string, any> = { '0%': 'flex-start', '50%': 'center', '100%': 'flex-end' };
              const vMap: Record<string, any> = { '0%': 'flex-start', '50%': 'center', '100%': 'flex-end' };
              const newElements = elements.map(el => el.id === selectedId ? { ...el, textAlignH: hMap[h], textAlignV: vMap[v] } : el);
              setElements(newElements);
              saveHistory(newElements);
          } else if (selectedElement?.type === 'image' || selectedElement?.type === 'img-data') {
              const newElements = elements.map(el => el.id === selectedId ? { ...el, objectPosition: pos } : el);
              setElements(newElements);
              saveHistory(newElements);
          }
      }
  };

  // --- Data Logic ---
  const fetchGoogleSheetData = async () => {
    if (!sheetUrl) return;
    setIsLoading(true);
    const csvUrl = processGoogleSheetUrl(sheetUrl);
    if (!csvUrl) { alert("Link không hợp lệ."); setIsLoading(false); return; }
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error("Fetch failed");
      const text = await response.text();
      const { headers, rows } = parseCSV(text);
      setHeaders(headers); setDataRows(rows); setCurrentRowIndex(0); setDataModalTab('table');
    } catch (error) {
      try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
          const res = await fetch(proxyUrl);
          if(!res.ok) throw new Error("Proxy failed");
          const text = await res.text();
          const { headers, rows } = parseCSV(text);
          setHeaders(headers); setDataRows(rows); setCurrentRowIndex(0); setDataModalTab('table');
      } catch (err) {
          alert("Không thể tải dữ liệu (CORS). Dùng Upload File.");
      }
    } finally { setIsLoading(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const { headers, rows } = parseCSV(evt.target?.result as string);
              setHeaders(headers); setDataRows(rows); setCurrentRowIndex(0); setDataModalTab('table');
          } catch(err) { alert("Lỗi đọc CSV."); }
      };
      reader.readAsText(file); 
  };

  const addColumn = () => {
      const colName = prompt("Tên cột mới:");
      if (colName) {
          if (headers.includes(colName)) return alert("Trùng tên!");
          setHeaders([...headers, colName]);
          setDataRows(prev => prev.map(r => ({ ...r, [colName]: '' })));
      }
  };

  const renameColumn = (oldName: string) => {
      const newName = prompt("Đổi tên cột:", oldName);
      if (newName && newName !== oldName) {
          if (headers.includes(newName)) return alert("Trùng tên!");
          setHeaders(prev => prev.map(h => h === oldName ? newName : h));
          setDataRows(prev => prev.map(r => {
              const val = r[oldName];
              const newRow = { ...r, [newName]: val };
              delete newRow[oldName];
              return newRow;
          }));
      }
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === dataRows.length - 1)) return;
      const newRows = [...dataRows];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];
      setDataRows(newRows);
  };

  // --- Layer DND ---
  const handleDragLayerStart = (e: React.DragEvent, id: string) => { setDraggedLayerId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragLayerOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDropLayer = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedLayerId || draggedLayerId === targetId) return;
      const items = [...elements];
      const fromIdx = items.findIndex(i => i.id === draggedLayerId);
      const toIdx = items.findIndex(i => i.id === targetId);
      const [removed] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, removed);
      const newElements = items.map((el, idx) => ({ ...el, style: { ...el.style, zIndex: idx + 1 } }));
      setElements(newElements);
      saveHistory(newElements);
      setDraggedLayerId(null);
  };

  // --- Helpers ---
  const updateElement = (id: string, updates: Partial<ElementData>, withHistory = true) => {
      const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
      setElements(newElements);
      if (withHistory) saveHistory(newElements);
  };
  
  const updateElementStyle = (id: string, updates: React.CSSProperties, withHistory = true) => {
      const newElements = elements.map(el => el.id === id ? { ...el, style: { ...el.style, ...updates } } : el);
      setElements(newElements);
      if (withHistory) saveHistory(newElements);
  };

  const deleteElement = (id: string | null) => { 
      if(id) { 
          const newElements = elements.filter(e => e.id !== id);
          setElements(newElements); 
          saveHistory(newElements);
          setSelectedId(null); 
      }
  };
  
  const resolveContent = (content: string, specificRow?: SheetRow) => {
      const data = specificRow || currentRowData;
      if (!data) return content;
      return content.replace(/{([^{}]+)}/g, (_, key) => data[key] || _);
  };

  const resolveImageSrc = (el: ElementData, specificRow?: SheetRow) => {
      if (el.type === 'image') return el.src || '';
      const val = resolveContent(el.content || '', specificRow).trim();
      if (!val) return '';
      const target = el.dataType === 'number' ? parseInt(val, 10).toString() : val.toLowerCase();
      const img = uploadedImages.find(u => {
          const uName = el.dataType === 'number' ? parseInt(u.name, 10).toString() : u.name.toLowerCase();
          return uName === target;
      });
      return img ? img.src : (val.startsWith('http') ? val : '');
  };

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent, id?: string, action?: string) => {
      e.stopPropagation(); e.preventDefault();
      if (id) {
          // Ctrl+Click để thêm vào multi-select
          if (e.ctrlKey || e.metaKey) {
              setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
          } else {
              setSelectedId(id); 
              setSelectedIds([id]);
          }
          setActiveTab('properties');
          if(!isSidebarOpen) setIsSidebarOpen(true);
          const el = elements.find(el => el.id === id);
          if (el && !el.isLocked) {
              // Mark as manipulating to prevent socket updates and auto-save during interaction
              isManipulatingRef.current = true;
              
              if (action === 'rotate') {
                  setMode('ROTATING');
              } else if (action && action.startsWith('resize')) {
                  setMode('RESIZING');
                  resizeDirectionRef.current = action.replace('resize-', '');
                  // Fallback
                  if (resizeDirectionRef.current === 'resize') resizeDirectionRef.current = 'se';
              } else {
                  setMode('DRAGGING');
              }
              dragStartRef.current = { x: e.clientX, y: e.clientY, initialX: el.x, initialY: el.y, initialW: el.width, initialH: el.height };
          }
      } else {
          // Click on canvas - start marquee selection or deselect
          if (e.target === canvasRef.current || (e.target as HTMLElement).closest('#page-content')) {
              if (isMarqueeMode && canvasRef.current) {
                  // Start marquee selection - tính toán vị trí chính xác
                  const rect = canvasRef.current.getBoundingClientRect();
                  // Vị trí trong canvas (đã scale)
                  const x = (e.clientX - rect.left);
                  const y = (e.clientY - rect.top);
                  setMarqueeStart({ x, y });
                  setMarqueeEnd({ x, y });
                  setIsMarqueeSelecting(true);
              } else {
                  setSelectedId(null);
                  setSelectedIds([]);
              }
          }
      }
  };

  // Throttle ref for performance
  const lastMoveTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
      // Marquee selection
      if (isMarqueeSelecting && marqueeStart && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = (e.clientX - rect.left);
          const y = (e.clientY - rect.top);
          setMarqueeEnd({ x, y });
          return;
      }
      
      if (mode === 'IDLE' || !dragStartRef.current || !selectedId) return;
      
      // Throttle updates to 60fps for smoother performance
      const now = performance.now();
      if (now - lastMoveTimeRef.current < 16) return; // ~60fps
      lastMoveTimeRef.current = now;
      
      // Cancel any pending animation frame
      if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
      }
      
      // Use requestAnimationFrame for smooth updates
      rafIdRef.current = requestAnimationFrame(() => {
          // Check if drag is still active (could have been cancelled)
          if (!dragStartRef.current) return;
          
          const dxMM = pxToMm((e.clientX - dragStartRef.current.x) / zoom);
          const dyMM = pxToMm((e.clientY - dragStartRef.current.y) / zoom);
          
          // Di chuyển nhiều element nếu có multi-select
          if (mode === 'DRAGGING' && selectedIds.length > 1) {
              const newElements = elements.map(el => {
                  if (selectedIds.includes(el.id) && !el.isLocked) {
                      const origEl = elements.find(e => e.id === el.id);
                      if (origEl) {
                          return { ...el, x: origEl.x + dxMM, y: origEl.y + dyMM };
                      }
                  }
                  return el;
              });
              setElements(newElements);
          } else if (mode === 'DRAGGING') {
              updateElement(selectedId, { x: dragStartRef.current!.initialX + dxMM, y: dragStartRef.current!.initialY + dyMM }, false);
          } else if (mode === 'RESIZING') {
          const { initialX, initialY, initialW, initialH } = dragStartRef.current!;
          const dir = resizeDirectionRef.current;
          let newX = initialX;
          let newY = initialY;
          let newW = initialW;
          let newH = initialH;

          if (dir.includes('e')) newW = Math.max(5, initialW + dxMM);
          if (dir.includes('w')) {
              const w = Math.max(5, initialW - dxMM);
              newX = initialX + (initialW - w);
              newW = w;
          }
          if (dir.includes('s')) newH = Math.max(5, initialH + dyMM);
          if (dir.includes('n')) {
              const h = Math.max(5, initialH - dyMM);
              newY = initialY + (initialH - h);
              newH = h;
          }
          
          updateElement(selectedId, { x: newX, y: newY, width: newW, height: newH }, false);
      } else if (mode === 'ROTATING') {
          const el = elements.find(e => e.id === selectedId);
          if (el) {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) {
                  // Calculate center of element in screen coordinates
                  const centerX = rect.left + (mmToPx(el.x) + mmToPx(el.width) / 2) * zoom;
                  const centerY = rect.top + (mmToPx(el.y) + mmToPx(el.height) / 2) * zoom;
                  
                  // Calculate angle
                  const dx = e.clientX - centerX;
                  const dy = e.clientY - centerY;
                  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                  
                  // Snap to 45 degrees if Shift is pressed
                  if (e.shiftKey) {
                      angle = Math.round(angle / 45) * 45;
                  }
                  
                  // Offset by 90 degrees because pointer starts at top (usually -90)
                  angle += 90; 
                  
                  updateElement(selectedId, { rotate: angle }, false);
              }
          }
      }
      });
  };

  const handleMouseUp = () => { 
      // Finish marquee selection
      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
          // Chuyển từ screen pixels sang mm (có tính zoom)
          const minX = pxToMm(Math.min(marqueeStart.x, marqueeEnd.x) / zoom);
          const maxX = pxToMm(Math.max(marqueeStart.x, marqueeEnd.x) / zoom);
          const minY = pxToMm(Math.min(marqueeStart.y, marqueeEnd.y) / zoom);
          const maxY = pxToMm(Math.max(marqueeStart.y, marqueeEnd.y) / zoom);
          
          // Find elements inside marquee
          const selected = elements.filter(el => {
              const elRight = el.x + el.width;
              const elBottom = el.y + el.height;
              return el.x < maxX && elRight > minX && el.y < maxY && elBottom > minY;
          }).map(el => el.id);
          
          setSelectedIds(selected);
          if (selected.length === 1) setSelectedId(selected[0]);
          else if (selected.length > 1) setSelectedId(selected[0]);
          
          setMarqueeStart(null);
          setMarqueeEnd(null);
          setIsMarqueeSelecting(false);
          return;
      }
      
      if (mode === 'DRAGGING' || mode === 'RESIZING' || mode === 'ROTATING') {
          saveHistory(elements);
          isManipulatingRef.current = false;
      }
      setMode('IDLE'); dragStartRef.current = null; 
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');
      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
              const fontFace = new FontFace(fontName, `url(${ev.target?.result})`);
              await fontFace.load();
              document.fonts.add(fontFace);
              setCustomFonts(prev => [...prev, fontName]);
              if (selectedId) updateElementStyle(selectedId, { fontFamily: fontName });
          } catch(err) { alert("Lỗi font."); }
      };
      reader.readAsDataURL(file);
  };

  // --- Media Logic ---
  const handleManagerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setUploadedImages(prev => [...prev, {
                    id: generateId(), name: file.name.split('.')[0], src: ev.target?.result as string
                }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; 
    }
  };

  const renameMedia = (id: string, name: string) => {
      setUploadedImages(prev => prev.map(img => img.id === id ? { ...img, name } : img));
  };

  const deleteMedia = (id: string) => {
      setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSingleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file && selectedId) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const newElements = elements.map(el => el.id === selectedId ? { ...el, src: ev.target?.result as string } : el);
              setElements(newElements);
              saveHistory(newElements);
          }
          reader.readAsDataURL(file);
      }
      e.target.value = ''; 
  };

  // --- Export using Canvas2PDF (PDF-lib) + PyMuPDF for image replacement ---
  const handleExport = async () => {
      setIsLoading(true);
      try {
          const row = dataRows[0] || currentRowData || {};
          const blob = await generatePdfBlob(row);
          await downloadPdf(blob, 'labels.pdf');
      } catch (err) {
          console.error(err);
          alert("Lỗi xuất PDF. " + (err instanceof Error ? err.message : String(err)));
      } finally {
          setIsLoading(false);
      }
  };

  // Open save project dialog
  const openSaveProjectDialog = async () => {
    try {
      // Load existing projects
      const files = await fileService.getFiles('PROJECT');
      setExistingProjects(files.map(f => ({ id: f.id, name: f.originalName })));
      setProjectName('');
      setSelectedProjectId(null);
      setIsSaveProjectDialogOpen(true);
    } catch (err) {
      console.error(err);
      setExistingProjects([]);
      setIsSaveProjectDialogOpen(true);
    }
  };

  // Save project to File Manager (as JSON)
  const saveProjectToFileManager = async () => {
    if (!(projectName || '').trim() && !selectedProjectId) {
      alert('Vui lòng nhập tên dự án hoặc chọn dự án để lưu đè');
      return;
    }

    setIsSavingToFileManager(true);
    try {
      // Save project data as JSON file
      const projectData = {
        elements,
        pageConfig,
        dataRows,
        headers,
        uploadedImages: uploadedImages.map(img => ({ name: img.name, src: img.src })),
        savedAt: new Date().toISOString()
      };

      const fileName = selectedProjectId 
        ? existingProjects.find(p => p.id === selectedProjectId)?.name || `project_${Date.now()}.json`
        : (projectName.endsWith('.json') ? projectName : `${projectName}.json`);

      const jsonBlob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const projectFile = new globalThis.File([jsonBlob], fileName, { type: 'application/json' });
      
      // If overwriting, delete old file first
      if (selectedProjectId) {
        try {
          await fileService.deleteFile(selectedProjectId);
        } catch (e) {
          // Ignore delete error
        }
      }
      
      await fileService.uploadFile(projectFile, 'PROJECT');
      alert('Đã lưu dự án vào Quản lý tệp!');
      setIsSaveProjectDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Lỗi lưu dự án: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingToFileManager(false);
    }
  };

  // Helper: Convert elements to CanvasElement format
  const convertToCanvasElements = (row: Record<string, string>): CanvasElement[] => {
    return elements
      .filter(el => shouldElementBeVisible(el, 'export'))
      .map(el => {
        let resolvedSrc = el.src;
        let originalSrc = el.src;
        
        if (el.type === 'img-data' || (el.type === 'image' && !el.src)) {
          const val = (el.content || '').replace(/{([^{}]+)}/g, (_, key) => row[key] || _).trim();
          if (val) {
            const target = el.dataType === 'number' ? parseInt(val, 10).toString() : val.toLowerCase();
            const img = uploadedImages.find(u => {
              const uName = el.dataType === 'number' ? parseInt(u.name, 10).toString() : u.name.toLowerCase();
              return uName === target;
            });
            if (img) {
              resolvedSrc = img.src;
              originalSrc = img.src;
            }
          }
        }
        
        let resolvedContent = el.content || '';
        if (el.type === 'text' || el.type === 'qr' || el.type === 'barcode') {
          resolvedContent = resolvedContent.replace(/{([^{}]+)}/g, (_, key) => row[key] || _);
        }
        
        let fontSize = 12;
        if (el.style?.fontSize) {
          const match = String(el.style.fontSize).match(/(\d+)/);
          if (match) fontSize = parseInt(match[1], 10);
        }
        
        return {
          id: el.id,
          type: el.type as CanvasElement['type'],
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotate || 0,
          content: resolvedContent,
          src: resolvedSrc,
          originalSrc: originalSrc,
          fontFamily: el.style?.fontFamily as string || 'UTM Avo',
          fontSize: fontSize,
          fontWeight: el.style?.fontWeight as string,
          fontStyle: el.style?.fontStyle as string,
          color: el.style?.color as string || '#000000',
          backgroundColor: el.style?.backgroundColor as string,
          textAlignH: el.textAlignH || 'flex-start',
          textAlignV: el.textAlignV || 'flex-start',
          borderColor: el.style?.borderColor as string,
          borderWidth: el.style?.borderWidth ? parseFloat(String(el.style.borderWidth)) : undefined,
          textFitMode: el.textFitMode || 'actual',
        };
      });
  };

  // Helper: Generate PDF using pdf-lib
  const generatePdfBlob = async (row: Record<string, string>): Promise<Blob> => {
    const canvasElements = convertToCanvasElements(row);
    
    const { pdfBytes, imageMappings } = await exportCanvasToPdf({
      pageWidthMm: pageConfig.width,
      pageHeightMm: pageConfig.height,
      elements: canvasElements,
      imageMode: 'original',
    });
    
    if (imageMappings.length > 0) {
      return await replaceImagesInPdf(pdfBytes, imageMappings, 'original');
    }
    // Convert to Uint8Array for Blob compatibility (avoids SharedArrayBuffer issues)
    const uint8Array = new Uint8Array(pdfBytes);
    return new Blob([uint8Array], { type: 'application/pdf' });
  };

  // Save PDF to File Manager
  const savePdfToFileManager = async () => {
    setIsSavingToFileManager(true);
    try {
      const row = dataRows[0] || {};
      const blob = await generatePdfBlob(row);
      const pdfFile = new globalThis.File([blob], `labels_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      await fileService.uploadFile(pdfFile, 'PDF');
      alert('Đã lưu PDF vào Quản lý tệp!');
    } catch (err: any) {
      console.error(err);
      alert('Lỗi lưu PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingToFileManager(false);
    }
  };

  // Handle file import from File Manager (for project JSON)
  const handleFileFromManager = async (file: File) => {
    // If it's a project JSON file
    if (file.name.endsWith('.json')) {
      try {
        const text = await file.text();
        const projectData = JSON.parse(text);
        
        // Restore project data
        if (projectData.elements) setElements(projectData.elements);
        if (projectData.pageConfig) setPageConfig(projectData.pageConfig);
        if (projectData.dataRows) setDataRows(projectData.dataRows);
        if (projectData.headers) setHeaders(projectData.headers);
        if (projectData.uploadedImages) setUploadedImages(projectData.uploadedImages);
        
        alert('Đã mở dự án thành công!');
      } catch (err) {
        console.error(err);
        alert('Lỗi đọc file dự án');
      }
    } else {
      alert('Vui lòng chọn file dự án (.json)');
    }
  };

  // --- Render ---
  const isStandaloneMicroservice = typeof window !== 'undefined' && (
    window.location.hostname.startsWith('admin.') ||
    window.location.hostname.startsWith('render.') ||
    window.location.hostname.startsWith('layout.') ||
    window.location.hostname.startsWith('binhtrang.') ||
    window.location.hostname.startsWith('imposition.') ||
    window.location.hostname.startsWith('package.') ||
    window.location.hostname.startsWith('khuonhop.') ||
    window.location.hostname.startsWith('diecut.') ||
    window.location.hostname.startsWith('tinhgia.') ||
    window.location.hostname.startsWith('pricing.') ||
    window.location.hostname.startsWith('designer.') ||
    window.location.hostname.startsWith('variable.') ||
    window.location.hostname.startsWith('pdf.')
  );

  // Microservices attach/detach state listener
  const { isAttached } = useMicroservicesState();
  const currentMicroservice = microservicesManager.getByPageId(currentPage);
  const isCurrentServiceDetached = Boolean(currentMicroservice && !isAttached(currentMicroservice.id));

  // Dynamic Document Title
  useEffect(() => {
    if (currentPage === 'admin' || (typeof window !== 'undefined' && (window.location.hostname === 'admin.toolx' || window.location.hostname.startsWith('admin.')))) {
      document.title = 'Admin ToolXPrint';
    } else {
      document.title = 'ToolxPrint';
    }
  }, [currentPage]);

  return (
    <div className={`flex flex-row h-screen bg-gray-100 text-gray-800 font-sans select-none overflow-hidden ${isCssFullScreen ? 'fixed inset-0 z-[9999] bg-gray-100' : ''}`} 
         onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel}>
      
      {/* LEFT SIDEBAR NAV - Hide on standalone Microservice subdomains or Admin */}
      {!isCssFullScreen && currentPage !== 'admin' && !isStandaloneMicroservice && (
        <TopNavBar 
          logoText="ProEditor v5.0" 
          activeLink={currentPage}
          onNavClick={(linkId) => setCurrentPage(linkId)}
          onOpenAccountPage={(tab) => {
            setAccountTab(tab || 'overview');
            setCurrentPage('account');
          }}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onTopUpClick={() => setIsTopUpModalOpen(true)}
          showRobot={showRobot}
          onToggleRobot={() => setShowRobot(!showRobot)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        {/* DETACHED MICROSERVICE NOTICE */}
        {isCurrentServiceDetached && currentMicroservice && (
          <ServiceDetachedNotice
            service={currentMicroservice}
            onBackToHome={() => setCurrentPage('home')}
            onGoToAdmin={() => setCurrentPage('admin')}
            onAttach={() => {
              microservicesManager.attachService(currentMicroservice.id);
            }}
          />
        )}

        {/* HOME PAGE - No auth required */}
      {currentPage === 'home' && (
        <div className="flex-1 overflow-auto">
          <HomePage onNavigate={(pageId) => setCurrentPage(pageId)} />
        </div>
      )}

      {/* MENU VIEW PAGE - No auth required */}
      {currentPage === 'menu-view' && (
        <div className="flex-1 overflow-auto bg-gray-900">
          <MenuView menuId={menuId} />
        </div>
      )}

      {/* PDF PROCESSOR PAGE - No auth required */}
      {currentPage === 'pdf-processor' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <PdfProcessor onClose={() => setCurrentPage('home')} />
        </div>
      )}

      {/* RENDER PDF PAGE - No auth required */}
      {currentPage === 'render-pdf' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp phân hệ Render Prepress..." />}>
            <RenderPdfPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* PRICE CALCULATOR OFFSET PAGE - Auth required */}
      {currentPage === 'price-calc-offset' && !isCurrentServiceDetached && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp công cụ Tính giá Offset..." />}>
              <PriceCalculatorOffset onClose={() => setCurrentPage('home')} initialTab="calc" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* PAPER PRICE PAGE - Auth required */}
      {currentPage === 'paper-price' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý giá giấy..." />}>
              <PaperPriceManager />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* PRICE CALCULATOR DIGITAL/FAST PAGE - Auth required */}
      {currentPage === 'price-calc-fast' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp công cụ Tính giá Kỹ thuật số..." />}>
              <PriceCalculatorDigital onClose={() => setCurrentPage('home')} initialTab="calc" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* CUSTOMERS PAGE - Auth required */}
      {currentPage === 'customers' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Khách hàng..." />}>
              <CustomersPage onClose={() => setCurrentPage('home')} />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* QUOTES PAGE - Auth required */}
      {currentPage === 'quotes' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Báo giá..." />}>
              <QuotesPage onClose={() => setCurrentPage('home')} />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* INVOICES PAGE - Auth required */}
      {currentPage === 'invoices' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Hóa đơn..." />}>
              <InvoicesPage onClose={() => setCurrentPage('home')} />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* ORDERS PAGE */}
      {currentPage === 'orders' && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Quản lý Đơn hàng..." />}>
            <OrdersPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* ADMIN PAGE */}
      {currentPage === 'admin' && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Trung tâm Quản trị Admin..." />}>
            <AdminPage
              onClose={() => setCurrentPage('home')}
              onNavigateToClient={() => setCurrentPage('home')}
            />
          </React.Suspense>
        </div>
      )}

      {/* IMPOSITION PAGE (Bình trang cơ bản) - No auth required */}
      {(currentPage === 'imposition' || currentPage === 'imposition-basic') && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp phân hệ Bình trang cơ bản..." />}>
            <ImpositionPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* IMPOSITION ADVANCED PAGE - No auth required */}
      {currentPage === 'imposition-advanced' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp phân hệ Bình trang nâng cao..." />}>
            <ImpositionAdvancedPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* DIE CUTTING PAGE - No auth required */}
      {currentPage === 'die-cutting' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Thiết kế Khuôn hộp..." />}>
            <DieCuttingPage />
          </React.Suspense>
        </div>
      )}

      {/* FILE MANAGER PAGE - Cloud Storage with Supabase */}
      {currentPage === 'file-manager' && (
        <div className="flex-1 overflow-hidden">
          <SupabaseFileManager />
        </div>
      )}

      {/* SUPABASE DEMO PAGE - No auth required */}
      {currentPage === 'supabase-demo' && (
        <div className="flex-1 overflow-auto">
          <SupabaseDemo />
        </div>
      )}

      {/* ACCOUNT PAGE - Auth required */}
      {currentPage === 'account' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <AccountDashboard 
              onClose={() => setCurrentPage('home')} 
              initialTab={accountTab}
            />
          </div>
        </AuthGuard>
      )}

      {/* AI IMAGE PROCESSING PAGES - Auth required */}
      {currentPage === 'ai-inpaint' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Inpaint)..." />}>
              <AIImageProcessor initialTool="inpaint" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-outpaint' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Outpaint)..." />}>
              <AIImageProcessor initialTool="outpaint" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-remove-bg' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Remove BG)..." />}>
              <AIImageProcessor initialTool="remove-bg" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-upscale' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Upscale)..." />}>
              <AIImageProcessor initialTool="upscale" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}
      {currentPage === 'ai-color' && (
        <AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>
          <div className="flex-1 overflow-hidden">
            <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp AI Studio (Color)..." />}>
              <AIImageProcessor initialTool="color" />
            </React.Suspense>
          </div>
        </AuthGuard>
      )}

      {/* LABEL DESIGNER PAGE - Konva.js Canvas-based */}
      {currentPage === 'label-designer' && !isCurrentServiceDetached && (
        <div className="flex-1 overflow-hidden">
          <React.Suspense fallback={<RouteLoadingFallback title="Đang nạp Label & VDP Designer..." />}>
            <LabelDesignerPage onClose={() => setCurrentPage('home')} />
          </React.Suspense>
        </div>
      )}

      {/* Session is now auto-saved to database when authenticated */}

      {/* Customer View Overlay */}
      {showCustomerView && (
          <CustomerView
              elements={elements}
              pageConfig={pageConfig}
              dataRows={dataRows}
              headers={headers}
              settings={customerSettings}
              initialNotes={customerNotes}
              onClose={() => setShowCustomerView(false)}
              onSaveNote={(idx, note) => setCustomerNotes(p => ({...p, [idx]: note}))}
              onUpdateRow={(idx: number, key: string, val: string) => {
                  const newRows = [...dataRows];
                  if (newRows[idx]) {
                      newRows[idx] = { ...newRows[idx], [key]: val };
                      setDataRows(newRows);
                  }
              }}
              resolveContent={resolveContent}
              resolveImageSrc={resolveImageSrc}
              mmToPx={mmToPx}
          />
      )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />

      {/* TopUp Modal */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        currentBalance={wallet?.balance || 0}
        onSuccess={() => refreshWallet()}
      />

      {/* File Picker Modal */}
      <FilePickerModal
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelect={handleFileFromManager}
        accept={['PROJECT']}
        title="Mở dự án từ Quản lý tệp"
      />

      {/* Save Project Dialog */}
      {isSaveProjectDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Save size={20} className="text-indigo-600" />
              Lưu dự án
            </h3>
            
            {/* New project name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên dự án mới
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => { setProjectName(e.target.value); setSelectedProjectId(null); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nhập tên dự án..."
              />
            </div>

            {/* Or overwrite existing */}
            {existingProjects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hoặc lưu đè dự án có sẵn
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {existingProjects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => { setSelectedProjectId(project.id); setProjectName(''); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        selectedProjectId === project.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                      }`}
                    >
                      <FileIcon2 size={16} />
                      {project.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsSaveProjectDialogOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={saveProjectToFileManager}
                disabled={(!(projectName || '').trim() && !selectedProjectId) || isSavingToFileManager}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingToFileManager ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Robot Assistant */}
      {showRobot && <AIRobotAssistant currentPage={currentPage} onNavigate={(pageId) => setCurrentPage(pageId)} />}
      </div>
    </div>
  );
}

// Wrap with AuthProvider and Router
export default function AppWithAuth() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PrintConfigProvider>
          <Toaster position="top-right" />
          <App />
        </PrintConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

