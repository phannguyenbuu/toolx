import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Download,
  Copy,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  RefreshCw,
  X,
  Sliders,
  Server,
  Activity,
  Globe,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Settings,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Flame,
  Zap,
  Cpu,
  Printer,
  Maximize2,
  Loader2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import {
  ColorAdjustSettings,
  DEFAULT_COLOR_SETTINGS,
  COLOR_PRESETS,
  CurvePoint,
  applyColorAdjustments,
  isDefaultColorSettings
} from '../utils/colorAdjustment';
import { ColorCurveEditor, CurveChannelType } from './ColorCurveEditor';
import {
  ColorInspectionReport,
  runAIColorInspection,
  generateInspectionHeatmapOverlay
} from '../utils/aiColorInspection';
import { AIColorInspectionModal } from './AIColorInspectionModal';
import {
  probeGoAgent,
  renderPdfViaGoAgent,
  isMobileDevice,
  GoAgentInfo,
  GOAGENT_DEFAULT_PORT
} from '../services/goAgentService';
import {
  RenderSettingsModal,
  AdvancedRenderSettings,
  DEFAULT_RENDER_SETTINGS,
  RENDER_PRESETS
} from './RenderSettingsModal';
import { jsPDF } from 'jspdf';
import { RenderColorProfile } from '../types/renderProfile';
import {
  getProfiles,
  getActiveProfile,
  setActiveProfileId,
  saveProfile
} from '../services/renderProfileService';
import { RenderProfileModal } from './RenderProfileModal';
import { getPendingRenderBlob, clearPendingRenderBlob, PendingRenderJobMeta } from '../services/pendingRenderService';

// Cấu hình PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface RenderPdfPageProps {
  onClose?: () => void;
}

// Model tác vụ Render
export interface RenderDocItem {
  id: string;
  filename: string;
  dpi: number;
  colorspace: string;
  compression: string;
  created_at: string;
  duration: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  error_message?: string;
  thumbnail_url?: string;
  preview_url?: string;
  download_url?: string;
  convert_to_pdf?: boolean;
  profile_name?: string;
  worker_name?: string;
}

export interface RenderNode {
  agent_uid: string;
  hostname: string;
  is_online: boolean;
  last_seen_at?: string;
  local_ip?: string;
  public_ip?: string;
}

// Tạo thumbnail thu nhỏ an toàn cho localStorage để không bao giờ bị QuotaExceededError
const createThumbnailBase64 = (dataUrl: string, maxDim = 120): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl || '');
    }
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else {
          resolve('');
        }
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
};

// IndexedDB helper lưu trữ và giải nén ảnh gốc độ phân giải cao cho các tác vụ GoAgent cục bộ
const PREVIEWS_DB_NAME = 'toolx_previews_db';
const PREVIEWS_STORE_NAME = 'full_previews';

function openPreviewsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB không được hỗ trợ'));
    }
    const req = indexedDB.open(PREVIEWS_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(PREVIEWS_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveFullPreview(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openPreviewsDB();
    const tx = db.transaction(PREVIEWS_STORE_NAME, 'readwrite');
    tx.objectStore(PREVIEWS_STORE_NAME).put(dataUrl, id);
  } catch (e) {
    console.warn('Không thể lưu ảnh full-res vào IndexedDB:', e);
  }
}

async function getFullPreview(id: string): Promise<string | null> {
  try {
    const db = await openPreviewsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PREVIEWS_STORE_NAME, 'readonly');
      const req = tx.objectStore(PREVIEWS_STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Thông số chẩn đoán
export interface DiagData {
  is_online: boolean;
  hostname: string;
  os: string;
  cpu_usage: number;
  ram_used_gb: number;
  ram_total_gb: number;
  last_heartbeat?: string;
}

// Offline Page Metadata
interface OfflinePageMeta {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  widthMm: number;
  heightMm: number;
  thumbnailUrl?: string;
}

const ICC_PROFILES = {
  cmyk: [
    { value: 'JapanColor2001Coated.icc', label: 'Japan Color 2001 Coated (Mặc định)' },
    { value: 'JapanColor2001Uncoated.icc', label: 'Japan Color 2001 Uncoated' },
    { value: 'USWebCoatedSWOP.icc', label: 'U.S. Web Coated (SWOP) v2' },
    { value: 'USWebUncoated.icc', label: 'U.S. Web Uncoated v2' },
    { value: 'CoatedFOGRA39.icc', label: 'Coated FOGRA39 (ISO 12647-2:2004)' },
    { value: 'UncoatedFOGRA29.icc', label: 'Uncoated FOGRA29 (ISO 12647-2:2004)' },
    { value: 'WebCoatedFOGRA28.icc', label: 'Web Coated FOGRA28' },
    { value: 'ISOcoV2.icc', label: 'ISO Coated v2 (ECI)' }
  ],
  rgb: [
    { value: 'sRGB Color Space Profile.icm', label: 'sRGB Color Space Profile (Mặc định)' },
    { value: 'AdobeRGB1998.icc', label: 'Adobe RGB (1998)' },
    { value: 'AppleRGB.icc', label: 'Apple RGB' },
    { value: 'ColorMatchRGB.icc', label: 'ColorMatch RGB' },
    { value: 'ProPhoto.icc', label: 'ProPhoto RGB' }
  ]
};

const BASE_DPI_OPTIONS = [
  { value: 72, label: '72 DPI' },
  { value: 150, label: '150 DPI' },
  { value: 300, label: '300 DPI' },
  { value: 450, label: '450 DPI' },
  { value: 600, label: '600 DPI' },
  { value: 1200, label: '1200 DPI' }
];

export const RenderPdfPage: React.FC<RenderPdfPageProps> = ({ onClose }) => {
  // Modals for secondary views: Chẩn đoán từ xa, Tải phần mềm, Render trình duyệt
  const [diagnoseModalOpen, setDiagnoseModalOpen] = useState<boolean>(false);
  const [downloadsModalOpen, setDownloadsModalOpen] = useState<boolean>(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState<boolean>(false);
  const [renderSuccessModal, setRenderSuccessModal] = useState<{
    isOpen: boolean;
    filename: string;
    totalPages: number;
    durationSec: string;
    dpi: number;
    colorspace: string;
    downloadUrl: string;
    previewUrl: string;
    isPdf: boolean;
    engineName: string;
  }>({
    isOpen: false,
    filename: '',
    totalPages: 1,
    durationSec: '0.5s',
    dpi: 300,
    colorspace: 'CMYK',
    downloadUrl: '',
    previewUrl: '',
    isPdf: true,
    engineName: 'administrator (Administrator)'
  });

  // Theme state: Sáng (Light) / Tối (Dark) - Mặc định là Theme Sáng (Light)
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('toolx_render_theme');
    return saved !== 'dark'; // Mặc định là Theme Sáng (Light)
  });

  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      localStorage.setItem('toolx_render_theme', next ? 'light' : 'dark');
      return next;
    });
  };

  // Server API base URL (qua setupProxy hoặc direct)
  const apiBase = '/render-agent';

  // ================= GOAGENT (PRINTAGENT) & DUAL-MODE ENGINE =================
  const [goAgentInfo, setGoAgentInfo] = useState<GoAgentInfo | null>(null);
  const [isProbingAgent, setIsProbingAgent] = useState<boolean>(true);
  const [renderEngine, setRenderEngine] = useState<'auto' | 'goagent' | 'server'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred_render_engine');
      if (saved === 'server' || saved === 'goagent' || saved === 'auto') return saved;
    }
    return 'auto';
  });

  // Render Nodes discovered dynamically from DB/AgentNode (is_render_agent: true)
  const [renderNodes, setRenderNodes] = useState<RenderNode[]>([]);
  const [selectedRenderNodeUid, setSelectedRenderNodeUid] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferred_render_node_uid') || 'auto';
    }
    return 'auto';
  });
  const [isFetchingNodes, setIsFetchingNodes] = useState<boolean>(false);

  const handleSelectRenderOption = (engine: 'auto' | 'goagent' | 'server', nodeUid: string = 'auto') => {
    setRenderEngine(engine);
    setSelectedRenderNodeUid(nodeUid);
    try {
      localStorage.setItem('preferred_render_engine', engine);
      localStorage.setItem('preferred_render_node_uid', nodeUid);
    } catch (err) {
      console.warn('Lỗi ghi nhớ cài đặt máy render vào localStorage:', err);
    }
  };

  const changeRenderEngine = (engine: 'auto' | 'goagent' | 'server') => {
    setRenderEngine(engine);
    try {
      localStorage.setItem('preferred_render_engine', engine);
    } catch {}
    if (engine === 'auto' || engine === 'goagent') {
      setSelectedRenderNodeUid('auto');
      try {
        localStorage.setItem('preferred_render_node_uid', 'auto');
      } catch {}
    }
  };

  const selectRenderNode = (uid: string) => {
    setSelectedRenderNodeUid(uid);
    try {
      localStorage.setItem('preferred_render_node_uid', uid);
    } catch {}
    if (uid !== 'auto') {
      setRenderEngine('server');
      try {
        localStorage.setItem('preferred_render_engine', 'server');
      } catch {}
    }
  };

  const selectedNode = useMemo(() => {
    if (selectedRenderNodeUid === 'auto') return null;
    return renderNodes.find((n) => n.agent_uid === selectedRenderNodeUid) || null;
  }, [renderNodes, selectedRenderNodeUid]);

  const [localRenderingProgress, setLocalRenderingProgress] = useState<string | null>(null);
  const handleCloudSubmitRef = useRef<((e?: React.FormEvent, fileOverride?: File) => Promise<void>) | null>(null);

  const isMobile = isMobileDevice();
  const effectiveEngine = useMemo<'goagent' | 'server'>(() => {
    if (renderEngine === 'goagent') return 'goagent';
    if (renderEngine === 'server') return 'server';
    // Chế độ 'auto': ưu tiên GoAgent nếu có trên máy và không phải thiết bị di động
    if (isMobile) return 'server';
    if (goAgentInfo?.detected) return 'goagent';
    return 'server';
  }, [renderEngine, goAgentInfo, isMobile]);

  const checkGoAgent = useCallback(async (isSilent?: boolean | React.MouseEvent) => {
    const silent = isSilent === true;
    if (!silent) setIsProbingAgent(true);
    try {
      const info = await probeGoAgent(GOAGENT_DEFAULT_PORT);
      setGoAgentInfo(info.detected ? info : null);
    } catch {
      setGoAgentInfo(null);
    } finally {
      if (!silent) setIsProbingAgent(false);
    }
  }, []);

  const fetchRenderNodes = useCallback(async (isSilent?: boolean | React.MouseEvent) => {
    const silent = isSilent === true;
    if (!silent) setIsFetchingNodes(true);
    try {
      const res = await fetch(`${apiBase}/api/render-nodes`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.nodes)) {
          setRenderNodes((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(data.nodes)) {
              return prev;
            }
            return data.nodes;
          });
        }
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách máy trạm render:', err);
    } finally {
      if (!silent) setIsFetchingNodes(false);
    }
  }, [apiBase]);

  useEffect(() => {
    // Quét ban đầu khi mở trang
    checkGoAgent(false);
    fetchRenderNodes(false);

    // Quét cập nhật danh sách máy trạm định kỳ mỗi 30s hoàn toàn êm dịu (isSilent)
    const timer = setInterval(() => {
      fetchRenderNodes(true);
    }, 30000);
    return () => {
      clearInterval(timer);
    };
  }, [checkGoAgent, fetchRenderNodes]);

  // ================= CLOUD RENDER STATE =================
  const [cloudFile, setCloudFile] = useState<File | null>(null);
  const [cloudFileName, setCloudFileName] = useState<string>('');
  const [pdfPageDimensions, setPdfPageDimensions] = useState<string>('');
  const [cloudDpi, setCloudDpi] = useState<number>(300);
  const [dpiOptions, setDpiOptions] = useState(BASE_DPI_OPTIONS);
  const [useIcc, setUseIcc] = useState<boolean>(false);
  const [colorspace, setColorspace] = useState<'rgb' | 'cmyk'>('rgb');
  const [selectedProfile, setSelectedProfile] = useState<string>('sRGB Color Space Profile.icm');
  const [compression, setCompression] = useState<'lzw' | 'deflate'>('lzw');
  const [convertToPdf, setConvertToPdf] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Advanced Render Settings state
  const [renderSettingsModalOpen, setRenderSettingsModalOpen] = useState<boolean>(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedRenderSettings>({ ...DEFAULT_RENDER_SETTINGS });
  const [isAdvancedPanelExpanded, setIsAdvancedPanelExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("toolx_render_advanced_panel_expanded");
      return saved !== "false"; // Default to expanded
    }
    return true;
  });

  const toggleAdvancedPanel = () => {
    setIsAdvancedPanelExpanded((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("toolx_render_advanced_panel_expanded", String(next));
      }
      return next;
    });
  };

  // Unified Render & Color Filter Profile state
  const [profilesList, setProfilesList] = useState<RenderColorProfile[]>(() => getProfiles());
  const [activeProfile, setActiveProfile] = useState<RenderColorProfile>(() => getActiveProfile());
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [isExportingAllPages, setIsExportingAllPages] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');

  const currentActivePresetId = useMemo(() => {
    // 1. Ưu tiên cao nhất: Nếu Profile đang chọn là GCR 22% hoặc cấu hình gcrLevel=22 / SWOP v2
    if (
      activeProfile.id === 'preset_gcr_22' ||
      advancedSettings.gcrLevel === 22 ||
      advancedSettings.iccProfile?.includes('SWOP')
    ) {
      return 'gcr_22_swop';
    }

    // 2. Tìm match theo thông số chi tiết (dpi, colorspace, iccProfile, outputFormat)
    const exactMatched = RENDER_PRESETS.find(
      (p) =>
        advancedSettings.dpi === p.settings.dpi &&
        advancedSettings.colorspace === p.settings.colorspace &&
        (p.settings.iccProfile ? advancedSettings.iccProfile === p.settings.iccProfile : true) &&
        advancedSettings.outputFormat === p.settings.outputFormat
    );
    if (exactMatched) return exactMatched.id;

    const matched = RENDER_PRESETS.find(
      (p) =>
        advancedSettings.dpi === p.settings.dpi &&
        advancedSettings.colorspace === p.settings.colorspace &&
        advancedSettings.outputFormat === p.settings.outputFormat
    );
    return matched ? matched.id : '';
  }, [
    activeProfile.id,
    advancedSettings.dpi,
    advancedSettings.colorspace,
    advancedSettings.outputFormat,
    advancedSettings.gcrLevel,
    advancedSettings.iccProfile
  ]);

  // Queue state
  const [documents, setDocuments] = useState<RenderDocItem[]>([]);
  const documentsRef = useRef<RenderDocItem[]>([]);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [totalPagesNum, setTotalPagesNum] = useState<number>(1);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);

  // Right Sidebar (Task Queue & History) state
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("toolx_render_history_autohide") === "true";
    }
    return true; // Mặc định thu gọn / tự động ẩn (autohide) để rê chuột mở
  });
  const [isRightSidebarHovered, setIsRightSidebarHovered] = useState<boolean>(false);
  const rightSidebarHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isRightSidebarVisible = !isRightSidebarCollapsed || isRightSidebarHovered;

  const handleRightSidebarHoverEnter = useCallback(() => {
    if (rightSidebarHoverTimeoutRef.current) {
      clearTimeout(rightSidebarHoverTimeoutRef.current);
      rightSidebarHoverTimeoutRef.current = null;
    }
    if (isRightSidebarCollapsed) {
      setIsRightSidebarHovered(true);
    }
  }, [isRightSidebarCollapsed]);

  const handleRightSidebarHoverLeave = useCallback(() => {
    if (rightSidebarHoverTimeoutRef.current) {
      clearTimeout(rightSidebarHoverTimeoutRef.current);
    }
    if (isRightSidebarCollapsed) {
      rightSidebarHoverTimeoutRef.current = setTimeout(() => {
        setIsRightSidebarHovered(false);
      }, 350);
    }
  }, [isRightSidebarCollapsed]);

  const toggleRightSidebar = useCallback(() => {
    if (rightSidebarHoverTimeoutRef.current) {
      clearTimeout(rightSidebarHoverTimeoutRef.current);
      rightSidebarHoverTimeoutRef.current = null;
    }
    if (isRightSidebarHovered) {
      setIsRightSidebarHovered(false);
      setIsRightSidebarCollapsed(false);
      try {
        localStorage.setItem("toolx_render_history_autohide", "false");
      } catch (e) {}
      return;
    }
    setIsRightSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("toolx_render_history_autohide", String(next));
      } catch (e) {}
      return next;
    });
  }, [isRightSidebarHovered]);

  useEffect(() => {
    return () => {
      if (rightSidebarHoverTimeoutRef.current) {
        clearTimeout(rightSidebarHoverTimeoutRef.current);
      }
    };
  }, []);

  // Diagnostics & Logs state
  const [diagData, setDiagData] = useState<DiagData>({
    is_online: true,
    hostname: 'Toolx-RenderServer',
    os: 'Windows Server 2022',
    cpu_usage: 12.5,
    ram_used_gb: 24.8,
    ram_total_gb: 128.0
  });
  const [logModalOpen, setLogModalOpen] = useState<boolean>(false);
  const [logModalTitle, setLogModalTitle] = useState<string>('');
  const [logModalContent, setLogModalContent] = useState<string>('');
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [diagDropdownOpen, setDiagDropdownOpen] = useState<boolean>(false);

  // ================= COLOR STUDIO & PREVIEW MODAL STATE =================
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('Bản Render Output');

  // Color Adjustment Settings
  const [colorSettings, setColorSettings] = useState<ColorAdjustSettings>({ ...DEFAULT_COLOR_SETTINGS });
  const [colorTab, setColorTab] = useState<'curves' | 'brightness' | 'balance' | 'hsl' | 'cmyk' | 'rgb'>('curves');
  const [curveChannel, setCurveChannel] = useState<CurveChannelType>('rgb');
  const [showCompareOriginal, setShowCompareOriginal] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [copiedPreviewToast, setCopiedPreviewToast] = useState<boolean>(false);

  // Canvas ref for Color Studio preview
  const studioCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageCacheRef = useRef<HTMLImageElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const studioScrollAreaRef = useRef<HTMLDivElement>(null);
  const [isStudioLoading, setIsStudioLoading] = useState<boolean>(false);
  const [studioLoadingText, setStudioLoadingText] = useState<string>('Đang giải nén ảnh...');
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // AI Color Inspection State
  const [aiInspectionModalOpen, setAiInspectionModalOpen] = useState<boolean>(false);
  const [aiInspectionReport, setAiInspectionReport] = useState<ColorInspectionReport | null>(null);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState<boolean>(false);
  const [activeHeatmapMode, setActiveHeatmapMode] = useState<'none' | 'tac' | 'gamut' | 'tone'>('none');

  // Client preview canvas ref
  const clientPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cloudFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isDraggingOffline, setIsDraggingOffline] = useState<boolean>(false);
  const [slicingWarning, setSlicingWarning] = useState<{
    hasSlicing: boolean;
    stripCount: number;
    producer?: string;
    hasIndexed?: boolean;
    autoSelectedProfile?: string;
  } | null>(null);

  // ================= OFFLINE BROWSER RENDER STATE =================
  const [offlineFileName, setOfflineFileName] = useState<string>('');
  const [offlineFileSize, setOfflineFileSize] = useState<string>('');
  const [offlinePdfDoc, setOfflinePdfDoc] = useState<any>(null);
  const [offlineTotalPages, setOfflineTotalPages] = useState<number>(0);
  const [offlineCurrentPage, setOfflineCurrentPage] = useState<number>(1);
  const [offlinePagesMeta, setOfflinePagesMeta] = useState<OfflinePageMeta[]>([]);
  const [offlineDpi, setOfflineDpi] = useState<72 | 150 | 300 | 600>(300);
  const [offlineColorMode, setOfflineColorMode] = useState<'original' | 'cmyk-sim' | 'grayscale'>('original');
  const [offlineFormat, setOfflineFormat] = useState<'png' | 'jpeg'>('png');
  const [offlineJpegQuality, setOfflineJpegQuality] = useState<number>(92);
  const [offlineTransparentBg, setOfflineTransparentBg] = useState<boolean>(false);
  const [offlineZoom, setOfflineZoom] = useState<number>(1.0);
  const [offlineIsRendering, setOfflineIsRendering] = useState<boolean>(false);
  const [offlineCopiedToast, setOfflineCopiedToast] = useState<boolean>(false);

  const offlineFileInputRef = useRef<HTMLInputElement>(null);
  const offlineCanvasRef = useRef<HTMLCanvasElement>(null);
  const offlineRenderTaskRef = useRef<any>(null);

  // Update profile options when colorspace changes
  useEffect(() => {
    if (colorspace === 'rgb') {
      setSelectedProfile('sRGB Color Space Profile.icm');
    } else {
      setSelectedProfile('JapanColor2001Coated.icc');
    }
  }, [colorspace]);

  // Lắng nghe sự kiện thay đổi Profile từ bên ngoài hoặc modal
  useEffect(() => {
    const handleProfilesUpdated = () => {
      const list = getProfiles();
      setProfilesList(list);
      const cur = getActiveProfile();
      setActiveProfile(cur);
      handleSaveAdvancedSettings(cur.renderSettings);
      setColorSettings(cur.colorSettings);
    };
    window.addEventListener('toolx_profiles_updated', handleProfilesUpdated);
    window.addEventListener('toolx_active_profile_changed', handleProfilesUpdated);
    return () => {
      window.removeEventListener('toolx_profiles_updated', handleProfilesUpdated);
      window.removeEventListener('toolx_active_profile_changed', handleProfilesUpdated);
    };
  }, []);

  // Ngăn trình duyệt tự động mở tệp PDF / ảnh khi người dùng kéo thả trượt ra ngoài ô thả tệp
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // Chọn Profile qua Dropdown trên Header/Toolbar
  const handleSelectProfileById = (id: string) => {
    setActiveProfileId(id);
    const list = getProfiles();
    setProfilesList(list);
    const found = list.find((p) => p.id === id) || list[0];
    if (found) {
      setActiveProfile(found);
      handleSaveAdvancedSettings(found.renderSettings);
      setColorSettings(found.colorSettings);
    }
  };

  // Bật/Tắt nhanh bộ lọc màu
  const handleToggleColorFilter = () => {
    const nextProfile: RenderColorProfile = {
      ...activeProfile,
      colorFilterEnabled: !activeProfile.colorFilterEnabled
    };
    const saved = saveProfile(nextProfile);
    setActiveProfile(saved);
    setProfilesList(getProfiles());
  };

  // Handler mở hộp thoại Cài đặt Render & Profile chuyên sâu
  const handleOpenRenderSettings = () => {
    setProfileModalOpen(true);
  };

  // Handler lưu và đồng bộ cài đặt từ modal
  const handleSaveAdvancedSettings = (newSettings: AdvancedRenderSettings) => {
    setAdvancedSettings(newSettings);

    const effectiveDpi = newSettings.isCustomDpi ? newSettings.customDpi : newSettings.dpi;
    setCloudDpi(effectiveDpi);
    setUseIcc(newSettings.useIcc);
    if (newSettings.colorspace === 'cmyk') {
      setColorspace('cmyk');
    } else {
      setColorspace('rgb');
    }
    setSelectedProfile(newSettings.iccProfile);
    setCompression(newSettings.compression === 'deflate' ? 'deflate' : 'lzw');
    setConvertToPdf(newSettings.outputFormat === 'pdf');
    if (newSettings.renderEngine && newSettings.renderEngine !== renderEngine) {
      if (newSettings.renderEngine === 'server') {
        setRenderEngine('server');
        try {
          localStorage.setItem('preferred_render_engine', 'server');
        } catch {}
      } else {
        handleSelectRenderOption(newSettings.renderEngine, 'auto');
      }
    }

    setActiveProfile((prev) => ({
      ...prev,
      renderSettings: newSettings
    }));
  };

  // Handler áp dụng mẫu cấu hình nhanh (1-Click Preset)
  const handleApplyPreset = (presetId: string) => {
    const preset = RENDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const updated: AdvancedRenderSettings = {
      ...advancedSettings,
      ...preset.settings,
      renderEngine: advancedSettings.renderEngine
    };
    handleSaveAdvancedSettings(updated);

    if (presetId === 'gcr_22_swop') {
      try {
        handleSelectProfileById('preset_gcr_22');
      } catch {}
    }
  };

  // ================= FETCH DOCUMENTS FROM SERVER =================
  const fetchDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoadingDocs(true);
    }

    // 1. Luôn nạp danh sách tác vụ cục bộ đã lưu trong localStorage trước
    let localCached: RenderDocItem[] = [];
    try {
      localCached = JSON.parse(localStorage.getItem('goagent_rendered_docs') || '[]');
    } catch {}

    try {
      const res = await fetch(`${apiBase}/api/documents?page=${currentPageNum}&per_page=${perPage}`, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }

      const data = await res.json();
      if (data && data.ok && Array.isArray(data.documents)) {
        const docsList: RenderDocItem[] = data.documents;

        setDocuments((prev) => {
          const memoryItems = prev.filter((d) => d.id.startsWith('goagent_'));
          const mergedLocal = [...memoryItems];
          localCached.forEach((lc) => {
            if (!mergedLocal.some((m) => m.id === lc.id)) {
              mergedLocal.push(lc);
            }
          });
          const nextDocs = [...mergedLocal, ...docsList];

          // So sánh để chỉ setDocuments khi thực sự có thay đổi (tránh re-render toàn cây DOM)
          if (
            prev.length === nextDocs.length &&
            prev.every((d, i) => {
              const n = nextDocs[i];
              return (
                n &&
                d.id === n.id &&
                d.status === n.status &&
                d.duration === n.duration &&
                d.error_message === n.error_message &&
                d.preview_url === n.preview_url &&
                d.download_url === n.download_url
              );
            })
          ) {
            return prev;
          }
          return nextDocs;
        });

        const count = (data.total_count || 0) + localCached.length;
        setTotalCount(count);
        setTotalPagesNum(data.total_pages || Math.max(1, Math.ceil(count / perPage)));
      }
    } catch (err: any) {
      console.warn('Lỗi kết nối tới Toolx Render Backend:', err);
      // Khi server lỗi hoặc mất kết nối, giữ lại tác vụ localCached mà không làm trắng bảng
      setDocuments((prev) => {
        const memoryItems = prev.filter((d) => d.id.startsWith('goagent_'));
        const mergedLocal = [...memoryItems];
        localCached.forEach((lc) => {
          if (!mergedLocal.some((m) => m.id === lc.id)) {
            mergedLocal.push(lc);
          }
        });
        if (
          prev.length === mergedLocal.length &&
          prev.every((d, i) => d.id === mergedLocal[i]?.id)
        ) {
          return prev;
        }
        return mergedLocal;
      });
      setTotalCount((c) => Math.max(c, localCached.length));
    } finally {
      if (!isSilent) {
        setIsLoadingDocs(false);
      }
    }
  }, [apiBase, currentPageNum, perPage]);

  useEffect(() => {
    // Chỉ fetch 1 lần khi mount hoặc khi các thiết lập phân trang thay đổi
    fetchDocuments(false);

    const interval = setInterval(() => {
      // Đọc trạng thái từ documentsRef thay vì phụ thuộc documents trong dependency array
      const hasActive = documentsRef.current.some((d) => d.status === 'pending' || d.status === 'rendering');
      if (hasActive) {
        fetchDocuments(true); // Silent polling không làm chớp giật UI
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/agent/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setDiagData((prev) => ({
            ...prev,
            is_online: true
          }));
        }
      }
    } catch (e) {}
  }, [apiBase]);

  useEffect(() => {
    if (diagnoseModalOpen) {
      fetchDiagnostics();
    }
  }, [diagnoseModalOpen, fetchDiagnostics]);

  // Tiếp nhận tự động các tác vụ Render được gửi từ phân hệ Bình Trang (/layout)
  useEffect(() => {
    let isCancelled = false;
    const checkPendingRenderJob = async () => {
      try {
        const rawMeta = localStorage.getItem('toolx_pending_render_meta');
        if (!rawMeta) return;
        localStorage.removeItem('toolx_pending_render_meta');
        const meta: PendingRenderJobMeta = JSON.parse(rawMeta);
        const blob = await getPendingRenderBlob(meta.id);
        if (!blob || isCancelled) return;
        await clearPendingRenderBlob(meta.id);

        const file = new File([blob], meta.filename || `Imposition_${Date.now()}.pdf`, { type: 'application/pdf' });

        if (meta.engine) {
          setRenderEngine(meta.engine);
        }
        if (meta.selectedNodeUid) {
          setSelectedRenderNodeUid(meta.selectedNodeUid);
        }
        if (meta.presetSettings) {
          setAdvancedSettings((prev) => ({
            ...prev,
            ...meta.presetSettings
          }));
          if (meta.presetSettings.dpi) setCloudDpi(meta.presetSettings.dpi);
          if (meta.presetSettings.colorspace) setColorspace(meta.presetSettings.colorspace);
        }

        toast.success(`Đã nạp file bình trang từ Layout (${file.name}). Đang bắt đầu render...`);
        await processSelectedFile(file);

        setTimeout(async () => {
          if (!isCancelled) {
            setCloudFile(file);
            setCloudFileName(file.name);
            if (handleCloudSubmitRef.current) {
              await handleCloudSubmitRef.current(undefined, file);
            }
          }
        }, 400);
      } catch (err) {
        console.warn('Lỗi đọc pending render job:', err);
      }
    };
    checkPendingRenderJob();
    return () => {
      isCancelled = true;
    };
  }, []);

  // ================= CLOUD FILE UPLOAD & DRAG DROP HANDLING =================
  const processSelectedFile = async (file: File) => {
    if (!file) return;

    setCloudFile(file);
    setCloudFileName(file.name);
    setUploadError(null);

    const isRaster = /\.(png|jpe?g|webp|bmp|tiff?|gif|avif)$/i.test(file.name);
    if (isRaster) {
      try {
        const imgUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
          img.src = imgUrl;
        });

        const w_px = img.naturalWidth || img.width;
        const h_px = img.naturalHeight || img.height;
        const w_mm = Math.round((w_px * 25.4) / 300);
        const h_mm = Math.round((h_px * 25.4) / 300);
        setPdfPageDimensions(`Kích thước ảnh: ${w_px} × ${h_px} px (~${w_mm} × ${h_mm} mm @ 300 DPI)`);

        const MAX_DIMENSION = 65535;
        const max_dpi_w = Math.floor(MAX_DIMENSION / (w_px / 72));
        const max_dpi_h = Math.floor(MAX_DIMENSION / (h_px / 72));
        const calculatedMaxDpi = Math.min(max_dpi_w, max_dpi_h);

        const allowedOptions = BASE_DPI_OPTIONS.filter((opt) => opt.value < calculatedMaxDpi).map((opt) => ({ ...opt }));
        if (calculatedMaxDpi < 1200) {
          allowedOptions.push({ value: calculatedMaxDpi, label: `${calculatedMaxDpi} DPI (tối đa an toàn)` });
        } else {
          allowedOptions.push({ value: 1200, label: '1200 DPI (tối đa)' });
        }
        if (allowedOptions.length === 0) {
          allowedOptions.push({ value: 72, label: '72 DPI (tối đa an toàn)' });
        }
        setDpiOptions(allowedOptions);
        setCloudDpi(300);
        setConvertToPdf(true);
        setAdvancedSettings((prev) => ({ ...prev, outputFormat: 'pdf' }));
        setSlicingWarning(null);

        // Vẽ preview trên canvas
        const canvas = clientPreviewCanvasRef.current;
        if (canvas) {
          const maxPreviewH = 160;
          const scale = maxPreviewH / h_px;
          canvas.width = Math.round(w_px * scale);
          canvas.height = maxPreviewH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        }
        URL.revokeObjectURL(imgUrl);
        return;
      } catch (err) {
        console.warn('Lỗi đọc kích thước ảnh:', err);
      }
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const view = new Uint8Array(arrayBuffer.slice(0, 2 * 1024 * 1024));
      const text = decoder.decode(view);

      let match = text.match(/\/MediaBox\s*\[\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*\]/);
      if (!match) {
        match = text.match(/\/CropBox\s*\[\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*\]/);
      }

      if (match) {
        const x1 = parseFloat(match[1]);
        const y1 = parseFloat(match[2]);
        const x2 = parseFloat(match[3]);
        const y2 = parseFloat(match[4]);

        const w_pts = Math.abs(x2 - x1);
        const h_pts = Math.abs(y2 - y1);
        const w_in = w_pts / 72;
        const h_in = h_pts / 72;
        const w_mm = Math.round(w_in * 25.4);
        const h_mm = Math.round(h_in * 25.4);

        setPdfPageDimensions(`Kích thước trang: ${w_mm} × ${h_mm} mm`);

        // Safe maximum DPI for 128GB MuPDF C-Core
        const MAX_DIMENSION = 65535;
        const max_dpi_w = Math.floor(MAX_DIMENSION / w_in);
        const max_dpi_h = Math.floor(MAX_DIMENSION / h_in);
        const calculatedMaxDpi = Math.min(max_dpi_w, max_dpi_h);

        const allowedOptions = BASE_DPI_OPTIONS.filter((opt) => opt.value < calculatedMaxDpi).map((opt) => ({ ...opt }));

        if (calculatedMaxDpi < 1200) {
          allowedOptions.push({ value: calculatedMaxDpi, label: `${calculatedMaxDpi} DPI (tối đa an toàn)` });
        } else {
          allowedOptions.push({ value: 1200, label: '1200 DPI (tối đa)' });
        }

        if (allowedOptions.length === 0) {
          allowedOptions.push({ value: 72, label: '72 DPI (tối đa an toàn)' });
        }

        setDpiOptions(allowedOptions);
        const maxAllowed = allowedOptions[allowedOptions.length - 1].value;
        if (maxAllowed < 300) {
          setCloudDpi(maxAllowed);
        } else {
          setCloudDpi(300);
        }
      } else {
        setPdfPageDimensions('Kích thước: Vector CAD / Đa trang');
        setDpiOptions(BASE_DPI_OPTIONS);
      }

      if (file.name.toLowerCase().endsWith('.pdf')) {
        setConvertToPdf(true);
        setAdvancedSettings((prev) => ({ ...prev, outputFormat: 'pdf' }));

        // Phân tích sơ bộ từ chuỗi nhị phân ban đầu (loại bỏ byte rác null \0 của UTF-16)
        const cleanText = text.replace(/\0/g, '');
        const isVirtualPrinterQuick = /printer|print to pdf|foxit|bullzip|cutepdf|acrobat|primopdf|nitro|pdf24|dopdf/i.test(cleanText);
        const hasIndexedQuick = cleanText.includes('/Indexed') || text.includes('/Indexed');
        if (isVirtualPrinterQuick || hasIndexedQuick) {
          try {
            handleSelectProfileById('preset_gcr_22');
          } catch {}
        }

        renderLazyPage1(arrayBuffer, text);
      }
    } catch (err) {
      console.warn('Không thể trích xuất kích thước MediaBox:', err);
    }
  };

  const handleCloudFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processSelectedFile(file);
    }
  };

  const renderLazyPage1 = async (arrayBuffer: ArrayBuffer, rawText: string = '') => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 1.0 });
      const scale = 160 / vp.height;
      const scaledVp = page.getViewport({ scale });

      // 1. Luôn render preview canvas trước để đảm bảo hiển thị ảnh ngay lập tức
      const canvas = clientPreviewCanvasRef.current;
      if (canvas) {
        canvas.height = scaledVp.height;
        canvas.width = scaledVp.width;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;
        }
      }

      // 2. Phân tích metadata và cấu trúc dải ảnh (Banding / Slicing) an toàn
      try {
        const cleanText = rawText.replace(/\0/g, '');
        let producerName = '';
        try {
          const meta = await pdf.getMetadata();
          producerName = (meta?.info as any)?.Producer || (meta?.info as any)?.Creator || '';
        } catch {}

        if (!producerName) {
          const matchProd = cleanText.match(/\/Producer\s*\(([^)]+)\)/i) || cleanText.match(/\/Creator\s*\(([^)]+)\)/i);
          if (matchProd) producerName = matchProd[1];
        }

        let imageCount = 0;
        try {
          const opList = await page.getOperatorList();
          if (opList && opList.fnArray) {
            for (let i = 0; i < opList.fnArray.length; i++) {
              const fn = opList.fnArray[i];
              if (
                fn === pdfjsLib.OPS.paintImageXObject ||
                fn === pdfjsLib.OPS.paintInlineImageXObject ||
                fn === pdfjsLib.OPS.paintImageMaskXObject
              ) {
                imageCount++;
              }
            }
          }
        } catch {}

        const hasIndexed = cleanText.includes('/Indexed') || rawText.includes('/Indexed');
        const isVirtualPrinter =
          /printer|print to pdf|foxit|bullzip|cutepdf|acrobat|primopdf|nitro|pdf24|dopdf/i.test(producerName) ||
          /foxit|bullzip|cutepdf|pdfcreator|primopdf/i.test(cleanText);

        const shouldRecommendGcr22 = imageCount >= 2 || isVirtualPrinter || hasIndexed;

        if (shouldRecommendGcr22) {
          setSlicingWarning({
            hasSlicing: true,
            stripCount: Math.max(imageCount, 2),
            producer: producerName || 'Máy in ảo (Foxit / PDF Printer)',
            hasIndexed,
            autoSelectedProfile: 'GCR 22%'
          });
          // Tự động đề xuất & kích hoạt ngay Profile GCR 22% tối ưu nhất cho file này
          try {
            handleSelectProfileById('preset_gcr_22');
          } catch (selErr) {
            console.warn('Không thể tự động kích hoạt preset_gcr_22:', selErr);
          }
        } else {
          setSlicingWarning(null);
        }
      } catch (analysisErr) {
        console.warn('Lỗi phân tích slicing:', analysisErr);
      }
    } catch (e) {
      console.warn('Client preview render error:', e);
    }
  };

  const submitToWorkstationServer = async (fileOverride?: File) => {
    const targetFile = fileOverride || cloudFile;
    if (!targetFile) return;
    try {
      const activeDpi = advancedSettings.isCustomDpi ? advancedSettings.customDpi : cloudDpi;
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('dpi', String(activeDpi));
      if (advancedSettings.useIcc || useIcc) {
        formData.append('use_icc', 'on');
        formData.append('colorspace', advancedSettings.colorspace || colorspace);
        formData.append('profile', advancedSettings.iccProfile || selectedProfile);
        formData.append('rendering_intent', advancedSettings.renderingIntent || 'relative_colorimetric');
      }
      formData.append('compression', advancedSettings.compression || compression);
      formData.append('format', advancedSettings.outputFormat || 'tiff');
      formData.append('anti_aliasing', advancedSettings.antiAliasing || 'high');
      formData.append('no_tiling', advancedSettings.noTiling ? 'on' : 'off');
      formData.append('transparent_bg', advancedSettings.transparentBg ? 'on' : 'off');
      formData.append('jpeg_quality', String(advancedSettings.jpegQuality || 95));
      formData.append('gcr_level', String(advancedSettings.gcrLevel ?? 100));
      if (advancedSettings.pageRangeMode === 'first') {
        formData.append('page_range', '1');
      } else if (advancedSettings.pageRangeMode === 'custom' && advancedSettings.customPageRange) {
        formData.append('page_range', advancedSettings.customPageRange);
      }
      if (advancedSettings.outputFormat === 'pdf' || convertToPdf || targetFile.name.toLowerCase().endsWith('.pdf')) {
        formData.append('convert_to_pdf', 'on');
      }
      if (selectedRenderNodeUid && selectedRenderNodeUid !== 'auto') {
        formData.append('render_node_uid', selectedRenderNodeUid);
      }

      const res = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Máy trạm báo lỗi HTTP: ${res.status}`);
      }

      setCloudFile(null);
      setCloudFileName('');
      setPdfPageDimensions('');
      setSlicingWarning(null);
      if (cloudFileInputRef.current) cloudFileInputRef.current.value = '';

      await fetchDocuments();
      const targetNode = renderNodes.find((n) => n.agent_uid === selectedRenderNodeUid);
      const nodeLabel = targetNode
        ? `${targetNode.hostname} • ${targetNode.public_ip || targetNode.local_ip || targetNode.agent_uid}`
        : 'Tự động điều phối';
      toast.success(`Đã thêm tệp vào hàng đợi Máy trạm Server (${nodeLabel}) thành công!`);
    } catch (err: any) {
      console.error('Lỗi tải lên máy trạm:', err);
      setUploadError(err.message || 'Không thể kết nối đến máy trạm render.');
      toast.error(`Lỗi máy trạm server: ${err.message}`);
    }
  };

  const handleCloudSubmit = async (e?: React.FormEvent, fileOverride?: File) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const targetFile = fileOverride || cloudFile;
    if (!targetFile) {
      toast.error('Vui lòng chọn tệp (PDF, Vector hoặc Hình ảnh) trước khi tải lên.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // TRƯỜNG HỢP 1: CÓ TOOLXAGENT TRÊN PC -> BƠM CODE EXEC XỬ LÝ TRỰC TIẾP TRÊN MÁY NÀY
    if (effectiveEngine === 'goagent') {
      try {
        setLocalRenderingProgress('Đang bơm code exec vào ToolxAgent...');
        const activeDpi = advancedSettings.isCustomDpi ? advancedSettings.customDpi : cloudDpi;
        const pageRangeParam = advancedSettings.pageRangeMode === 'first'
          ? 'first'
          : (advancedSettings.pageRangeMode === 'custom' && advancedSettings.customPageRange ? advancedSettings.customPageRange : 'all');

        const res = await renderPdfViaGoAgent(targetFile, {
          dpi: activeDpi,
          colorspace: advancedSettings.colorspace || colorspace,
          maxPages: advancedSettings.maxPages || 50,
          port: goAgentInfo?.port || GOAGENT_DEFAULT_PORT,
          transparentBg: advancedSettings.transparentBg || false,
          pageRange: pageRangeParam
        });

        const docId = 'goagent_' + Date.now();
        const firstPage = res.pages[0];
        const previewUrl = firstPage?.preview_b64 || '';

        // Tạo blob URL thật cho tệp PDF kết quả nếu có pdf_b64
        let finalDownloadUrl = previewUrl;
        const isPdfResult = Boolean(res.pdf_b64 || advancedSettings.outputFormat === 'pdf' || convertToPdf || targetFile.name.toLowerCase().endsWith('.pdf'));

        if (res.pdf_b64) {
          try {
            const base64Clean = res.pdf_b64.replace(/^data:application\/pdf;base64,/, '');
            const byteChars = atob(base64Clean);
            const byteNumbers = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNumbers[i] = byteChars.charCodeAt(i);
            }
            const blob = new Blob([byteNumbers], { type: 'application/pdf' });
            finalDownloadUrl = URL.createObjectURL(blob);
          } catch (blobErr) {
            console.warn('Lỗi tạo PDF Blob:', blobErr);
            finalDownloadUrl = res.pdf_b64;
          }
        }

        const currentAgent = goAgentInfo?.agent_uid || 'administrator';
        const currentPc = goAgentInfo?.pc_name || 'Administrator';
        const agentDisplayName = `${currentAgent} (${currentPc})`;

        const newDoc: RenderDocItem = {
          id: `goagent_${Date.now()}`,
          filename: targetFile.name,
          dpi: activeDpi,
          colorspace: (advancedSettings.colorspace || colorspace).toUpperCase(),
          compression: isPdfResult
            ? 'PDF (Vector/Prepress)'
            : (advancedSettings.outputFormat === 'png'
                ? 'PNG (Lossless)'
                : `${(advancedSettings.outputFormat || 'TIFF').toUpperCase()} (${(advancedSettings.compression || 'lzw').toUpperCase()})`),
          created_at: `${new Date().toLocaleTimeString('vi-VN')} (${agentDisplayName})`,
          duration: `${res.duration_ms ? (res.duration_ms / 1000).toFixed(2) + 's' : '0.5s'} (Cục bộ)`,
          status: 'completed',
          preview_url: previewUrl,
          download_url: finalDownloadUrl,
          convert_to_pdf: isPdfResult,
          profile_name: activeProfile.name || 'Mặc định'
        };

        // Thêm vào danh sách tác vụ hiển thị ngay lập tức
        setDocuments((prev) => [newDoc, ...prev]);
        setTotalCount((c) => c + 1);

        // Lưu vào localStorage cache an toàn (tạo thumbnail nhẹ 120px và tránh lưu base64 lớn)
        try {
          if (previewUrl) {
            await saveFullPreview(newDoc.id, previewUrl);
          }
          const thumbUrl = await createThumbnailBase64(previewUrl, 120);
          const docForStorage: RenderDocItem = {
            ...newDoc,
            thumbnail_url: thumbUrl,
            preview_url: thumbUrl,
            download_url: '' // Không lưu blob URL hoặc base64 dung lượng lớn vào localStorage
          };
          const cached: RenderDocItem[] = JSON.parse(localStorage.getItem('goagent_rendered_docs') || '[]');
          const updated = [docForStorage, ...cached.filter((c) => c.id !== docForStorage.id)].slice(0, 30);
          try {
            localStorage.setItem('goagent_rendered_docs', JSON.stringify(updated));
          } catch (quotaErr) {
            console.warn('QuotaExceeded khi lưu goagent_rendered_docs, đang dọn bớt mục cũ...');
            for (const limit of [15, 8, 3, 1]) {
              try {
                localStorage.setItem('goagent_rendered_docs', JSON.stringify(updated.slice(0, limit)));
                break;
              } catch {}
            }
          }
        } catch (e) {
          console.warn('Lỗi lưu goagent_rendered_docs:', e);
        }

        try {
          localStorage.setItem('toolx_last_imposition_render', JSON.stringify({
            id: newDoc.id,
            filename: newDoc.filename,
            previewUrl: previewUrl,
            downloadUrl: finalDownloadUrl,
            createdAt: newDoc.created_at,
            duration: newDoc.duration,
            status: 'completed',
            isPdf: isPdfResult
          }));
        } catch {}

        setCloudFile(null);
        setCloudFileName('');
        setPdfPageDimensions('');
        setSlicingWarning(null);
        if (cloudFileInputRef.current) cloudFileInputRef.current.value = '';

        const durationFormatted = `${res.duration_ms ? (res.duration_ms / 1000).toFixed(1) : '0.5'}s`;

        // Mở Modal kết quả thay vì alert trình duyệt
        setRenderSuccessModal({
          isOpen: true,
          filename: targetFile.name,
          totalPages: res.total_pages || 1,
          durationSec: durationFormatted,
          dpi: activeDpi,
          colorspace: (advancedSettings.colorspace || colorspace).toUpperCase(),
          downloadUrl: finalDownloadUrl,
          previewUrl: previewUrl,
          isPdf: isPdfResult,
          engineName: agentDisplayName
        });
      } catch (err: any) {
        console.warn('Lỗi xử lý qua ToolxAgent, tự động chuyển về máy trạm server:', err);
        setLocalRenderingProgress(`ToolxAgent: ${err.message}. Tự động chuyển tiếp máy trạm server...`);
        await submitToWorkstationServer(targetFile);
      } finally {
        setIsUploading(false);
        setLocalRenderingProgress(null);
      }
      return;
    }

    // TRƯỜNG HỢP 2: KHÔNG TÌM THẤY GOAGENT HOẶC DÙNG MOBILE -> MÁY TRẠM SERVER (128GB RAM)
    try {
      await submitToWorkstationServer(targetFile);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    handleCloudSubmitRef.current = handleCloudSubmit;
  });

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tác vụ này?')) return;
    try {
      if (docId.startsWith('goagent_')) {
        const localCached: RenderDocItem[] = JSON.parse(localStorage.getItem('goagent_rendered_docs') || '[]');
        const updated = localCached.filter((d) => d.id !== docId);
        localStorage.setItem('goagent_rendered_docs', JSON.stringify(updated));
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setTotalCount((c) => Math.max(0, c - 1));
        return;
      }
      await fetch(`${apiBase}/delete/${docId}`, { method: 'POST' });
      await fetchDocuments();
      toast.success('Đã xóa tác vụ thành công!');
    } catch (err) {
      toast.error('Không thể xóa tác vụ: ' + err);
    }
  };

  const getTimestampSuffix = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  const triggerFileDownload = async (url: string, rawFilename: string, isPdf: boolean, extOverride?: string) => {
    const baseName = rawFilename.replace(/\.[^/.]+$/, '');
    const ext = extOverride || (isPdf ? 'pdf' : 'tif');
    const timestamp = getTimestampSuffix();
    const downloadFileName = `${baseName}_rendered_${timestamp}.${ext}`;

    try {
      // Luôn chuyển đổi về blob (kể cả URL nội bộ hoặc URL tương đối) để trình duyệt 100% giữ đúng tên downloadFileName có timestamp
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      }
    } catch (e) {
      console.warn('Lỗi khi fetch blob tải tệp, fallback trực tiếp:', e);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadRenderedDoc = async (doc: RenderDocItem) => {
    if (!doc.download_url) {
      toast.error('Tệp này không có liên kết tải trực tiếp hoặc phiên làm việc đã đóng. Vui lòng bấm kết xuất lại.');
      return;
    }

    const isPdf = Boolean(doc.convert_to_pdf || doc.filename.toLowerCase().endsWith('.pdf') || doc.compression?.toLowerCase().includes('pdf'));
    const ext = isPdf ? 'pdf' : (doc.compression?.toLowerCase().includes('png') ? 'png' : 'tif');
    await triggerFileDownload(doc.download_url, doc.filename, isPdf, ext);
  };

  const handleClearAllDocs = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả tác vụ trong lịch sử?')) {
      return;
    }
    try {
      localStorage.removeItem('goagent_rendered_docs');
      await fetch(`${apiBase}/clear_all`, { method: 'POST' });
      await fetchDocuments();
      toast.success('Đã xóa toàn bộ tác vụ thành công!');
    } catch (err) {
      toast.error('Không thể xóa tất cả tác vụ: ' + err);
    }
  };

  const handleViewAgentLog = async (filename: 'setting.json' | 'stdout.txt' | 'sterror.txt') => {
    setDiagDropdownOpen(false);
    setLogModalTitle(`Đang tải ${filename}...`);
    setLogModalContent('Đang tải dữ liệu từ máy chủ Toolx Render...');
    setLogLoading(true);
    setLogModalOpen(true);

    try {
      const res = await fetch(`${apiBase}/api/agent/logs`);
      const data = await res.json();
      if (!data.ok) {
        setLogModalTitle(`Lỗi tải ${filename}`);
        setLogModalContent(`Lỗi: ${data.error}`);
        return;
      }

      let title = '';
      let content = '';

      if (filename === 'setting.json') {
        title = 'Cấu hình hệ thống (setting.json)';
        try {
          const parsed = JSON.parse(data.settings_json);
          content = JSON.stringify(parsed, null, 2);
        } catch (e) {
          content = data.settings_json || '{}';
        }
      } else if (filename === 'stdout.txt') {
        title = 'Nhật ký hoạt động Agent (stdout.txt)';
        content = data.stout_logs || 'Chưa có log từ Agent.';
      } else if (filename === 'sterror.txt') {
        title = 'Nhật ký lỗi Agent (sterror.txt)';
        content = data.sterror_logs || 'Chưa có log lỗi từ Agent.';
      }

      setLogModalTitle(title);
      setLogModalContent(content);
    } catch (err) {
      setLogModalTitle(`Lỗi tải ${filename}`);
      setLogModalContent(`Không thể kết nối tới máy chủ: ${err}`);
    } finally {
      setLogLoading(false);
    }
  };

  const handleMaximizePagefile = async () => {
    if (!window.confirm('Bạn có muốn gửi lệnh Tối đa hóa Virtual Memory (Pagefile) tới máy chủ?')) return;
    try {
      const res = await fetch(`${apiBase}/api/agent/pagefile/maximize`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Đã kích hoạt lệnh tối đa hóa Pagefile thành công! Agent sẽ tự động cấu hình.', { duration: 4500 });
      } else {
        toast.error('Lỗi: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Không thể gửi lệnh: ' + e.message);
    }
  };

  const handleRestartAgent = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khởi động lại ToolxAgent trên máy chủ?')) return;
    try {
      const res = await fetch(`${apiBase}/api/agent/restart`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Đã gửi lệnh khởi động lại Agent. Vui lòng chờ 10-15 giây để Agent kết nối lại.', { duration: 5000 });
      } else {
        toast.error('Lỗi: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Không thể gửi lệnh: ' + e.message);
    }
  };

  const handleCopyLogContent = () => {
    navigator.clipboard.writeText(logModalContent).then(() => {
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    });
  };

  // ================= COLOR STUDIO ENGINE & MODAL =================
  const handleFitStudioZoom = useCallback((imgW?: number, imgH?: number) => {
    const scrollContainer = studioScrollAreaRef.current;
    const w = imgW || canvasDims.width || originalImageCacheRef.current?.naturalWidth || 0;
    const h = imgH || canvasDims.height || originalImageCacheRef.current?.naturalHeight || 0;

    if (!scrollContainer || !w || !h) {
      setPreviewZoom(1.0);
      return;
    }

    const pad = 64; // Khoảng đệm an toàn xung quanh viewport
    const availW = Math.max(100, scrollContainer.clientWidth - pad);
    const availH = Math.max(100, scrollContainer.clientHeight - pad);

    const fitScale = Math.min(availW / w, availH / h, 1.0);
    const roundedZoom = Math.max(0.05, Math.min(1.0, Math.round(fitScale * 100) / 100));
    setPreviewZoom(roundedZoom);
  }, [canvasDims.width, canvasDims.height]);

  const handleOpenColorStudio = async (url: string, title?: string, doc?: RenderDocItem) => {
    setPreviewDocTitle(title || 'Bản Render Output');
    setColorSettings({ ...DEFAULT_COLOR_SETTINGS });
    setShowCompareOriginal(false);
    setPreviewModalOpen(true);
    setIsStudioLoading(true);
    setStudioLoadingText('Đang giải nén & nạp ảnh độ phân giải cao...');
    originalImageDataRef.current = null;

    let fullResUrl = url;

    try {
      if (doc) {
        if (doc.id.startsWith('goagent_')) {
          setStudioLoadingText('Đang nạp ảnh gốc từ bộ nhớ IndexedDB...');
          const cachedFull = await getFullPreview(doc.id);
          if (cachedFull) {
            fullResUrl = cachedFull;
          }
        } else {
          // Tác vụ server: Lấy ảnh gốc full-res từ /storage/previews/{id}.jpg
          fullResUrl = `${apiBase}/storage/previews/${doc.id}.jpg`;
        }
      } else if (url && url.includes('/storage/thumbnails/')) {
        fullResUrl = url.replace('/storage/thumbnails/', '/storage/previews/');
      }
    } catch (e) {
      console.warn('Lỗi phân giải ảnh full-res:', e);
    }

    setStudioLoadingText('Đang giải mã ma trận điểm ảnh canvas...');

    // Tải ảnh gốc vào bộ đệm để vẽ canvas
    const img = new Image();
    if (fullResUrl.startsWith('http') && typeof window !== 'undefined' && !fullResUrl.includes(window.location.host)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      setStudioLoadingText('Đang kết xuất không gian màu chuẩn...');
      originalImageCacheRef.current = img;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setCanvasDims({ width: w, height: h });

      // Offscreen canvas để trích xuất ImageData gốc một lần cho bộ nhớ đệm
      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(img, 0, 0);
          originalImageDataRef.current = offCtx.getImageData(0, 0, w, h);
        }
      } catch (err) {
        console.warn('Không thể tạo ImageData bộ đệm:', err);
      }

      renderStudioCanvas(img, DEFAULT_COLOR_SETTINGS, false);

      // Tự động căn chỉnh zoom vừa vặn khung nhìn (Auto-Fit)
      setTimeout(() => {
        handleFitStudioZoom(w, h);
        setIsStudioLoading(false);
      }, 120);
    };

    img.onerror = () => {
      // Nếu tải full-res từ server bị lỗi, fallback lại URL gốc
      if (fullResUrl !== url) {
        console.warn('Không tải được ảnh full-res, thử lại với URL gốc:', url);
        setStudioLoadingText('Thử lại với URL xem trước dự phòng...');
        img.src = url;
      } else {
        setIsStudioLoading(false);
        toast.error('Không thể giải nén hoặc tải ảnh xem trước.');
      }
    };

    img.src = fullResUrl;
  };

  const renderStudioCanvas = useCallback(
    (img: HTMLImageElement | null, settings: ColorAdjustSettings, compare: boolean) => {
      const canvas = studioCanvasRef.current;
      if (!canvas || !img) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      let srcData = originalImageDataRef.current;
      if (!srcData || srcData.width !== w || srcData.height !== h) {
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;
        offCtx.drawImage(img, 0, 0);
        srcData = offCtx.getImageData(0, 0, w, h);
        originalImageDataRef.current = srcData;
      }

      if (compare) {
        ctx.putImageData(srcData, 0, 0);
      } else {
        applyColorAdjustments(srcData, ctx, settings);
      }
    },
    []
  );

  // Re-render studio canvas when colorSettings or showCompareOriginal change
  useEffect(() => {
    if (previewModalOpen && originalImageCacheRef.current) {
      renderStudioCanvas(originalImageCacheRef.current, colorSettings, showCompareOriginal);
    }
  }, [colorSettings, showCompareOriginal, previewModalOpen, renderStudioCanvas]);

  // Cập nhật cài đặt màu
  const updateSetting = <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => {
    setColorSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Áp dụng Preset
  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setColorSettings((prev) => ({
      ...prev,
      ...preset.settings
    }));
  };

  // Reset toàn bộ thông số màu về mặc định
  const handleResetColorSettings = () => {
    setColorSettings({ ...DEFAULT_COLOR_SETTINGS });
  };

  // Tải ảnh đã chỉnh màu
  const handleDownloadAdjustedImage = () => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const baseName = previewDocTitle.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = getTimestampSuffix();
    a.download = `${baseName}_color_graded_${timestamp}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Sao chép ảnh đã chỉnh màu vào Clipboard
  const handleCopyAdjustedImageToClipboard = () => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedPreviewToast(true);
        setTimeout(() => setCopiedPreviewToast(false), 2000);
      }, 'image/png');
    } catch (e) {
      toast.error('Không thể sao chép ảnh vào Clipboard: ' + e);
    }
  };

  // Cập nhật lớp phủ Heatmap overlay khi chế độ xem thay đổi hoặc canvas vẽ lại
  const updateHeatmapOverlay = useCallback(() => {
    const studioCanvas = studioCanvasRef.current;
    const heatmapCanvas = heatmapCanvasRef.current;
    if (!studioCanvas || !heatmapCanvas) return;

    if (activeHeatmapMode === 'none') {
      const hCtx = heatmapCanvas.getContext('2d');
      if (hCtx) hCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      return;
    }

    heatmapCanvas.width = studioCanvas.width;
    heatmapCanvas.height = studioCanvas.height;
    const overlay = generateInspectionHeatmapOverlay(studioCanvas, activeHeatmapMode);
    const hCtx = heatmapCanvas.getContext('2d');
    if (hCtx) {
      hCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      hCtx.drawImage(overlay, 0, 0);
    }
  }, [activeHeatmapMode]);

  useEffect(() => {
    if (previewModalOpen && studioCanvasRef.current) {
      updateHeatmapOverlay();
    }
  }, [activeHeatmapMode, colorSettings, previewModalOpen, updateHeatmapOverlay]);

  // ================= AI COLOR INSPECTION HANDLERS =================
  const handleRunAIColorCheck = async () => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;

    setAiInspectionModalOpen(true);
    setIsAIAnalyzing(true);
    try {
      const report = await runAIColorInspection(canvas, colorSettings);
      setAiInspectionReport(report);
    } catch (err) {
      console.error('Lỗi khi kiểm tra màu bằng AI:', err);
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const handleApplyAIRecommendations = (actionable: Partial<ColorAdjustSettings>) => {
    setColorSettings((prev) => ({
      ...prev,
      ...actionable
    }));
    // Tự động quét lại sau khi áp dụng để cập nhật điểm số
    setTimeout(() => {
      if (studioCanvasRef.current) {
        handleRunAIColorCheck();
      }
    }, 200);
  };

  const handleOpenWithAICheck = (url: string, title?: string, doc?: RenderDocItem) => {
    handleOpenColorStudio(url, title, doc);
    // Khi ảnh đã tải xong vào canvas, mở modal quét AI
    setTimeout(() => {
      handleRunAIColorCheck();
    }, 600);
  };

  // ================= OFFLINE CANVAS RENDER LOGIC =================
  const getOfflineScale = useCallback((targetDpi: 72 | 150 | 300 | 600) => {
    return targetDpi / 72;
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const rasterImageToPdfBytes = async (file: File): Promise<Uint8Array> => {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Không thể đọc dữ liệu hình ảnh.'));
        img.src = imgUrl;
      });

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Không thể tạo dữ liệu PNG từ ảnh');
      const pngBytes = await blob.arrayBuffer();

      const pdfDoc = await PDFDocument.create();
      const embeddedImage = await pdfDoc.embedPng(pngBytes);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height
      });

      return await pdfDoc.save();
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  const processOfflineFile = async (file: File) => {
    try {
      setOfflineIsRendering(true);
      setOfflineFileName(file.name);
      setOfflineFileSize(formatBytes(file.size));

      let dataForPdf: Uint8Array | ArrayBuffer;
      const isRaster = /\.(png|jpe?g|webp|bmp|tiff?|gif|avif)$/i.test(file.name);
      if (isRaster) {
        dataForPdf = await rasterImageToPdfBytes(file);
      } else {
        dataForPdf = await file.arrayBuffer();
      }

      const loadingTask = pdfjsLib.getDocument({ data: dataForPdf });
      const doc = await loadingTask.promise;

      setOfflinePdfDoc(doc);
      setOfflineTotalPages(doc.numPages);
      setOfflineCurrentPage(1);

      const metaList: OfflinePageMeta[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1.0 });
        const widthPt = vp.width;
        const heightPt = vp.height;
        const widthMm = Math.round(((widthPt * 25.4) / 72) * 10) / 10;
        const heightMm = Math.round(((heightPt * 25.4) / 72) * 10) / 10;

        const thumbVp = page.getViewport({ scale: 0.2 });
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbVp.width;
        thumbCanvas.height = thumbVp.height;
        const thumbCtx = thumbCanvas.getContext('2d');
        let thumbUrl = '';
        if (thumbCtx) {
          await page.render({ canvasContext: thumbCtx, viewport: thumbVp }).promise;
          if (activeProfile.colorFilterEnabled && !isDefaultColorSettings(activeProfile.colorSettings)) {
            const tData = thumbCtx.getImageData(0, 0, thumbCanvas.width, thumbCanvas.height);
            applyColorAdjustments(tData, thumbCtx, activeProfile.colorSettings);
          }
          thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);
        }

        metaList.push({
          pageNumber: i,
          widthPt,
          heightPt,
          widthMm,
          heightMm,
          thumbnailUrl: thumbUrl
        });
      }

      setOfflinePagesMeta(metaList);
    } catch (err: any) {
      toast.error('Không thể đọc file PDF: ' + err.message);
    } finally {
      setOfflineIsRendering(false);
      if (offlineFileInputRef.current) offlineFileInputRef.current.value = '';
    }
  };

  const handleOfflineFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processOfflineFile(file);
    }
  };

  const renderOfflineCurrentPage = useCallback(async () => {
    if (!offlinePdfDoc || !offlineCanvasRef.current) return;

    if (offlineRenderTaskRef.current) {
      try {
        offlineRenderTaskRef.current.cancel();
      } catch (e) {}
    }

    try {
      setOfflineIsRendering(true);
      const page = await offlinePdfDoc.getPage(offlineCurrentPage);
      const scale = getOfflineScale(offlineDpi) * offlineZoom;
      const viewport = page.getViewport({ scale });

      const canvas = offlineCanvasRef.current;
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!offlineTransparentBg) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const task = page.render({
        canvasContext: ctx,
        viewport,
        background: offlineTransparentBg ? 'transparent' : '#ffffff'
      });
      offlineRenderTaskRef.current = task;
      await task.promise;

      if (offlineColorMode === 'grayscale') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (offlineColorMode === 'cmyk-sim') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 0.96);
          data[i + 1] = Math.min(255, data[i + 1] * 0.94);
          data[i + 2] = Math.min(255, data[i + 2] * 0.92);
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Áp dụng bộ lọc màu từ Profile đang chọn
      if (activeProfile.colorFilterEnabled && !isDefaultColorSettings(activeProfile.colorSettings)) {
        const renderImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyColorAdjustments(renderImgData, ctx, activeProfile.colorSettings);
      }
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.warn('Lỗi render:', err);
      }
    } finally {
      setOfflineIsRendering(false);
    }
  }, [offlinePdfDoc, offlineCurrentPage, offlineDpi, offlineZoom, offlineColorMode, offlineTransparentBg, getOfflineScale, activeProfile]);

  useEffect(() => {
    if (offlineModalOpen) {
      renderOfflineCurrentPage();
    }
  }, [offlineModalOpen, renderOfflineCurrentPage]);

  // Kết xuất & áp dụng bộ lọc cân màu Profile cho TOÀN BỘ trang trong file PDF
  const handleExportAllPagesCalibrated = async () => {
    if (!offlinePdfDoc) {
      toast.error('Vui lòng tải lên file PDF trước khi xuất.');
      return;
    }

    setIsExportingAllPages(true);
    try {
      const numPages = offlinePdfDoc.numPages;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 1; i <= numPages; i++) {
        setExportProgressText(`Đang kết xuất & cân màu trang ${i}/${numPages}...`);
        const page = await offlinePdfDoc.getPage(i);
        const scale = getOfflineScale(offlineDpi);
        const vp = page.getViewport({ scale });

        const offCanvas = document.createElement('canvas');
        offCanvas.width = Math.round(vp.width);
        offCanvas.height = Math.round(vp.height);
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) continue;

        if (!offlineTransparentBg) {
          offCtx.fillStyle = '#ffffff';
          offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
        }

        await page.render({
          canvasContext: offCtx,
          viewport: vp,
          background: offlineTransparentBg ? 'transparent' : '#ffffff'
        }).promise;

        // Áp dụng bộ lọc màu cân chỉnh từ Profile
        if (activeProfile.colorFilterEnabled && !isDefaultColorSettings(activeProfile.colorSettings)) {
          const srcData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          applyColorAdjustments(srcData, offCtx, activeProfile.colorSettings);
        }

        const imgDataUrl = offCanvas.toDataURL('image/jpeg', 0.95);
        const pageMeta = offlinePagesMeta[i - 1];
        const widthMm = pageMeta ? pageMeta.widthMm : 210;
        const heightMm = pageMeta ? pageMeta.heightMm : 297;
        const orientation = widthMm > heightMm ? 'landscape' : 'portrait';

        if (i === 1) {
          pdf.deletePage(1);
          pdf.addPage([widthMm, heightMm], orientation);
        } else {
          pdf.addPage([widthMm, heightMm], orientation);
        }

        pdf.addImage(imgDataUrl, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
      }

      const baseName = offlineFileName.replace(/\.[^/.]+$/, '');
      const cleanProfile = activeProfile.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = getTimestampSuffix();
      pdf.save(`${baseName}_can_mau_${cleanProfile}_${timestamp}.pdf`);
      toast.success(`Đã xuất thành công toàn bộ ${numPages} trang đã cân màu theo Profile "${activeProfile.name}"!`);
    } catch (err: any) {
      console.error('Lỗi xuất PDF toàn bộ trang:', err);
      toast.error('Không thể xuất PDF: ' + err.message);
    } finally {
      setIsExportingAllPages(false);
      setExportProgressText('');
    }
  };

  const handleOfflineDownloadSingle = () => {
    if (!offlineCanvasRef.current) return;
    const canvas = offlineCanvasRef.current;
    const mimeType = offlineFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, offlineJpegQuality / 100);

    const a = document.createElement('a');
    const baseName = offlineFileName.replace(/\.[^/.]+$/, '');
    const timestamp = getTimestampSuffix();
    a.download = `${baseName}_trang_${offlineCurrentPage}_${offlineDpi}dpi_${timestamp}.${offlineFormat}`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOfflineCopyToClipboard = async () => {
    if (!offlineCanvasRef.current) return;
    try {
      offlineCanvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setOfflineCopiedToast(true);
        setTimeout(() => setOfflineCopiedToast(false), 2500);
      }, 'image/png');
    } catch (err) {
      toast.error('Không thể chép ảnh vào Clipboard.');
    }
  };

  const curOfflineMeta = offlinePagesMeta[offlineCurrentPage - 1];

  // Theme-dependent dynamic CSS classes
  const themeBg = isLightMode ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100';
  const themeHeader = isLightMode ? 'bg-white/95 border-slate-200/80 shadow-xs' : 'bg-slate-900/90 border-slate-800 backdrop-blur-md';
  const themeCard = isLightMode ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800 shadow-lg';
  const themeCardInner = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-950/70 border-slate-850';
  const themeInput = isLightMode ? 'bg-white border-slate-200 text-slate-800 focus:border-slate-400' : 'bg-slate-900 border-slate-800 text-slate-200 focus:border-slate-600';
  const themeTextMuted = isLightMode ? 'text-slate-500' : 'text-slate-400';
  const themeTextHead = isLightMode ? 'text-slate-900 font-semibold tracking-tight' : 'text-white font-semibold tracking-tight';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';

  // ================= MAIN RENDER =================
  return (
    <div className={`h-full flex flex-col overflow-hidden select-none font-sans transition-colors duration-200 ${themeBg}`}>
      {/* TOP HEADER / NAVBAR */}
      <header className={`h-14 border-b px-4 flex items-center justify-between gap-3 flex-shrink-0 z-20 ${themeHeader}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 flex items-center justify-center shadow-xs text-white font-medium">
            <span className="text-base">X</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`text-sm ${themeTextHead}`}>Render PDF</h1>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                128GB RAM Vector System
              </span>
            </div>
            <p className={`text-[11px] truncate ${themeTextMuted}`}>Hệ thống kết xuất vector & cân màu chuẩn in ấn</p>
          </div>
        </div>

        {/* QUICK MODAL LAUNCH & CONFIG TOOLBAR */}
        <div className={`hidden md:flex items-center space-x-1 p-1 rounded-xl border ${themeCardInner} whitespace-nowrap`}>
          <button
            type="button"
            onClick={() => setDiagnoseModalOpen(true)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              diagnoseModalOpen
                ? 'bg-amber-600 text-white shadow-xs'
                : `${themeTextMuted} hover:text-amber-600`
            }`}
            title="Mở bảng Chẩn đoán từ xa & Logs hệ thống"
          >
            <Activity size={13} className={diagnoseModalOpen ? 'text-white' : 'text-amber-500'} />
            <span className="whitespace-nowrap">Chẩn đoán</span>
          </button>



          {/* MỤC CẤU HÌNH & PROFILE SELECTOR */}
          <div className="flex items-center gap-1.5 pl-0.5 whitespace-nowrap">
            <Printer size={13} className="text-slate-500 flex-shrink-0" />
            <select
              value={activeProfile.id}
              onChange={(e) => handleSelectProfileById(e.target.value)}
              className={`bg-transparent border-0 text-xs font-medium focus:outline-none cursor-pointer max-w-[160px] truncate whitespace-nowrap ${
                isLightMode ? 'text-slate-800' : 'text-slate-200'
              }`}
              title="Chọn Profile Render & Cân màu cho máy in"
            >
              {profilesList.map((p) => (
                <option key={p.id} value={p.id} className={isLightMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>
                  {p.name}
                </option>
              ))}
            </select>

            {slicingWarning?.autoSelectedProfile && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0"
                title="Profile được hệ thống tự động nhận diện và kích hoạt từ file gốc"
              >
                <CheckCircle size={10} />
                Đề xuất: {slicingWarning.autoSelectedProfile}
              </span>
            )}


            {/* Nút Cấu hình chi tiết */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                profileModalOpen
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : `${themeTextMuted} hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800`
              }`}
              title="Cấu hình chi tiết Profile & Render"
            >
              <Settings size={13} className={profileModalOpen ? 'text-white' : 'text-slate-400'} />
              <span className="whitespace-nowrap">Cấu hình</span>
            </button>
          </div>
        </div>

        {/* RIGHT STATUS, THEME TOGGLE & CLOSE */}
        <div className="flex items-center gap-2">
          {/* THEME TOGGLE BUTTON */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${themeBtnSecondary}`}
            title={isLightMode ? 'Chuyển sang Theme Tối (Dark)' : 'Chuyển sang Theme Sáng (Light)'}
          >
            {isLightMode ? (
              <Moon size={15} className="text-indigo-600" />
            ) : (
              <Sun size={15} className="text-amber-400" />
            )}
          </button>

          {/* AGENT ENGINE STATUS BADGE */}
          <button
            type="button"
            onClick={checkGoAgent}
            className={`hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border cursor-pointer transition shadow-xs select-none ${
              goAgentInfo?.detected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400'
            }`}
            title={
              goAgentInfo?.detected
                ? 'ToolxAgent đang chạy trên máy. Nhấp để quét lại.'
                : 'Chưa phát hiện ToolxAgent. Nhấp để quét lại hoặc tải cài đặt.'
            }
          >
            <span className="relative flex h-2 w-2">
              {goAgentInfo?.detected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
              )}
            </span>
            <span className="font-semibold">PrintAgent:</span>
            <span className={`font-bold ${goAgentInfo?.detected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {goAgentInfo?.detected ? 'Online' : 'Offline'}
            </span>
            {isProbingAgent && (
              <RefreshCw size={11} className="animate-spin text-slate-400 ml-0.5" />
            )}
          </button>

          {/* HISTORY SIDEBAR TOGGLE BUTTON IN HEADER */}
          <button
            onClick={toggleRightSidebar}
            className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
              isRightSidebarVisible
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : themeBtnSecondary
            }`}
            title={isRightSidebarVisible ? 'Thu gọn Hàng đợi & Lịch sử' : 'Mở Hàng đợi & Lịch sử'}
          >
            <Clock size={15} className="text-indigo-500" />
            <span className="hidden sm:inline">Lịch sử</span>
            {totalCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/20 hover:bg-rose-600/80 text-slate-400 hover:text-white transition-colors ml-1"
              title="Đóng trang"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {/* BODY CONTENT: MAIN WORKSPACE + RIGHT SIDEBAR */}
      <div className="flex-1 overflow-hidden relative flex flex-row">
        {/* MAIN VIEWPORT: CLOUD RENDER DASHBOARD */}
        <div className="flex-1 h-full overflow-y-auto p-4 md:p-6 transition-all duration-300">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* UPLOAD VECTOR & RENDER CONFIGURATION PANEL */}
            <div className={`border rounded-2xl p-5 md:p-6 shadow-sm ${themeCard}`}>
              <form onSubmit={handleCloudSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: Engine & Upload Area */}
                  <div className="space-y-4">
                  {/* Engine Mode Quick Selector & Render Nodes */}
                  <div className={`px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${themeCardInner}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-medium ${themeTextMuted}`}>Máy render:</span>
                      <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleSelectRenderOption('auto', 'auto')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                            renderEngine === 'auto' && selectedRenderNodeUid === 'auto'
                              ? 'bg-[#999] text-white shadow-xs'
                              : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                          }`}
                        >
                          Tự động
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectRenderOption('goagent', 'auto')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                            renderEngine === 'goagent'
                              ? 'bg-[#999] text-white shadow-xs'
                              : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                          }`}
                        >
                          PrintAgent (Máy này)
                        </button>
                        {renderNodes.map((node) => {
                          const isSelected = renderEngine === 'server' && selectedRenderNodeUid === node.agent_uid;
                          return (
                            <button
                              key={node.agent_uid}
                              type="button"
                              onClick={() => handleSelectRenderOption('server', node.agent_uid)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#999] text-white shadow-xs'
                                  : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                              }`}
                              title={`${node.hostname} (${node.public_ip || node.local_ip || 'IP'} - ${node.is_online ? 'Online' : 'Offline'})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${node.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                              <span>{node.hostname || node.agent_uid}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      {effectiveEngine === 'server' ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          {selectedNode
                            ? `Máy trạm Server (${selectedNode.hostname} • ${selectedNode.public_ip || selectedNode.local_ip || ''})`
                            : 'Máy trạm Server (Tự động điều phối)'}
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1.5 ${goAgentInfo?.detected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} font-medium`}>
                          <span className={`w-2 h-2 rounded-full ${goAgentInfo?.detected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {goAgentInfo?.detected ? 'PrintAgent (Máy này)' : 'Chưa có PrintAgent -> Sẽ chuyển Server'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Custom Drag & Drop Area */}
                  <div
                    onClick={() => cloudFileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 relative group ${
                      isDraggingOver
                        ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/20 scale-[1.01]'
                        : isLightMode
                        ? 'border-slate-300 bg-slate-50 hover:bg-white hover:border-indigo-400'
                        : 'border-slate-700 bg-slate-950/50 hover:bg-slate-950 hover:border-indigo-500'
                    }`}
                  >
                    <input
                      ref={cloudFileInputRef}
                      type="file"
                      accept=".pdf,.dxf,.dwg,.png,.jpg,.jpeg,.tiff,.tif,.webp,.bmp,image/*"
                      className="hidden"
                      onChange={handleCloudFileSelect}
                    />
                    <div className="space-y-2 pointer-events-none">
                      {isDraggingOver ? (
                        <div className="py-2">
                          <Upload className="w-9 h-9 text-indigo-500 mx-auto animate-bounce" />
                          <p className="text-xs font-bold text-indigo-500 mt-1">
                            Thả tệp vào đây để tải lên ngay...
                          </p>
                          <p className={`text-[11px] ${themeTextMuted}`}>Tự động phân tích kích thước và áp dụng cấu hình tối ưu</p>
                        </div>
                      ) : (
                        <>
                          <FileText className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mx-auto transition-colors" />
                          <p className={`text-xs font-semibold truncate ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                            {cloudFileName || 'Kéo thả hoặc nhấn để chọn tệp PDF, CAD hoặc Hình ảnh (Raster)'}
                          </p>
                          <p className={`text-[11px] ${themeTextMuted}`}>
                            Kéo thả trực tiếp từ Explorer (.pdf, .dxf, .dwg, .png, .jpg, .tiff, .webp tối đa 500MB)
                          </p>
                          {pdfPageDimensions && (
                            <p className="text-xs font-semibold text-emerald-500 mt-1">{pdfPageDimensions}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Client-side PDF Preview Canvas */}
                  <div className={`p-3 border rounded-xl flex flex-col items-center justify-center ${cloudFileName ? 'block' : 'hidden'} ${themeCardInner}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Xem trước tệp tải lên (Trang 1)</p>
                    <canvas ref={clientPreviewCanvasRef} className="max-h-40 rounded shadow border border-slate-700 object-contain"></canvas>

                    {/* Cảnh báo cắt dải ảnh (Banding/Slicing Detection) */}
                    {slicingWarning && (
                      <div className="w-full mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-left space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 flex-wrap">
                              <span>Phát hiện File bị cắt lát ảnh (Banding Slicing)</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-normal">
                                {slicingWarning.stripCount} dải / trang
                              </span>
                            </p>
                            <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                              File xuất từ <b className={isLightMode ? 'text-slate-900' : 'text-white'}>{slicingWarning.producer}</b> nên trang in bị băm thành <b>{slicingWarning.stripCount} dải ảnh ngang</b>
                              {slicingWarning.hasIndexed && ' (chứa dải tiêu đề chỉ mục Indexed ColorSpace)'}.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            <b>Đã Tự Động Kích Hoạt Profile GCR 22% (SWOP v2):</b> Hệ thống tự động thiết lập hệ màu CMYK, GCR 22%, BPC và Single-pass No-Tiling để khử triệt để dải đen đè chữ, hàn gắn {slicingWarning.stripCount} dải ảnh thành 1 bản in liền mạch hoàn hảo khi bạn bấm Render.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Action Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUploading || !cloudFile}
                      className={`w-full py-3 px-4 font-medium text-xs rounded-xl shadow-xs transition transform active:scale-[0.99] duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40 text-white ${
                        effectiveEngine === 'goagent'
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/15'
                          : 'bg-[#999] hover:bg-[#888]'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw size={15} className="animate-spin text-slate-300" />
                          <span>{localRenderingProgress || 'Đang kết xuất...'}</span>
                        </>
                      ) : (
                        <>
                          {effectiveEngine === 'goagent' ? <Zap size={15} className="text-amber-300" /> : <Upload size={15} />}
                          <span>Render</span>
                        </>
                      )}
                    </button>
                    {uploadError && (
                      <p className="text-xs text-rose-500 font-medium text-center mt-2">
                        {uploadError}
                      </p>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Settings, Presets & Actions */}
                <div className="space-y-4">
                  {/* PROMINENT RENDER SETTINGS MODAL TRIGGER & CONFIG SUMMARY */}
                  <div className={`p-3.5 rounded-xl border transition-all duration-200 ${themeCardInner} ring-1 ring-indigo-500/20 shadow-xs ${isAdvancedPanelExpanded ? 'space-y-3' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={toggleAdvancedPanel}
                        className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
                        title={isAdvancedPanelExpanded ? "Nhấp để thu gọn panel" : "Nhấp để mở rộng panel"}
                      >
                        <Sliders size={15} className="text-indigo-500 flex-shrink-0" />
                        <span className={`text-xs font-bold truncate ${themeTextHead}`}>
                          Cấu hình Render Chuyên Sâu
                        </span>
                        {!isAdvancedPanelExpanded && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 truncate">
                            {advancedSettings.isCustomDpi ? `${advancedSettings.customDpi} DPI` : `${cloudDpi} DPI`} • {advancedSettings.colorspace.toUpperCase()} • {advancedSettings.outputFormat.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={toggleAdvancedPanel}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
                        title={isAdvancedPanelExpanded ? "Thu gọn panel Cấu hình" : "Mở rộng panel Cấu hình"}
                      >
                        {isAdvancedPanelExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {isAdvancedPanelExpanded && (
                      <>
                        {/* Active Configuration Badges */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Độ phân giải</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                              {advancedSettings.isCustomDpi ? `${advancedSettings.customDpi} DPI (Custom)` : `${cloudDpi} DPI`}
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal truncate">
                              {advancedSettings.noTiling ? 'No-Tiling 128GB' : 'Auto Tiling'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Hệ màu & ICC</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 uppercase truncate mt-0.5">
                              {advancedSettings.colorspace}
                              <span className="text-[10px] font-normal text-slate-500 ml-1 lowercase">
                                {advancedSettings.useIcc ? `(${advancedSettings.renderingIntent.replace('_', ' ')})` : '(raw)'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate" title={advancedSettings.iccProfile}>
                              {advancedSettings.useIcc
                                ? `${advancedSettings.iccProfile.replace(/\.(icc|icm)$/i, '')}${advancedSettings.colorspace === 'cmyk' && advancedSettings.gcrLevel !== undefined ? ` • GCR ${advancedSettings.gcrLevel}%` : ''}`
                                : 'Gốc (Không ICC)'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Định dạng & Nén</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                              {advancedSettings.outputFormat.toUpperCase()}
                              <span className="text-[10px] font-normal text-slate-500 ml-1">({advancedSettings.compression.toUpperCase()})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {advancedSettings.transparentBg ? 'Nền trong suốt' : 'Nền solid'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Phạm vi trang</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                              {advancedSettings.pageRangeMode === 'all'
                                ? 'Tất cả các trang'
                                : advancedSettings.pageRangeMode === 'first'
                                ? 'Chỉ trang 1'
                                : `Trang ${advancedSettings.customPageRange || '1'}`}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              Tối đa {advancedSettings.maxPages} trang
                            </div>
                          </div>
                        </div>

                        {/* Quick Presets Dropdown */}
                        <div>
                          <label className={`block text-[10px] uppercase font-medium tracking-wider mb-1.5 ${themeTextMuted}`}>
                            Cấu hình mẫu (Presets):
                          </label>
                          <select
                            value={currentActivePresetId}
                            onChange={(e) => {
                              if (e.target.value) handleApplyPreset(e.target.value);
                            }}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer ${themeInput}`}
                          >
                            <option value="" disabled={!!currentActivePresetId}>
                              {currentActivePresetId ? '-- Chọn cấu hình mẫu (Preset) --' : '⚙️ Tùy chỉnh tự do (hoặc chọn Preset mẫu bên dưới)'}
                            </option>
                            {RENDER_PRESETS.map((preset) => (
                              <option key={preset.id} value={preset.id} className={isLightMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>
                                {preset.icon} {preset.name} ({preset.settings.dpi || 300} DPI, {(preset.settings.colorspace || 'cmyk').toUpperCase()}, {(preset.settings.outputFormat || 'tiff').toUpperCase()})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </form>
              </div>
            </div>
          </div>

          {/* Floating Arrow Expand/Collapse Button on the Right Edge */}
          <button
            type="button"
            onClick={toggleRightSidebar}
            onMouseEnter={handleRightSidebarHoverEnter}
            onMouseLeave={handleRightSidebarHoverLeave}
            className={`fixed z-50 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out w-5 hover:w-6.5 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-r-0 rounded-l-xl shadow-xs hover:shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer group select-none ${
              !isRightSidebarVisible ? "right-0" : "right-[700px] -mr-px"
            }`}
            title={
              !isRightSidebarVisible
                ? "Mở rộng Hàng đợi & Lịch sử (Rê chuột để xem, click để ghim)"
                : isRightSidebarHovered
                  ? "Ghim Hàng đợi & Lịch sử (Click để ghim cố định)"
                  : "Thu gọn Hàng đợi & Lịch sử (Autohide sidebar)"
            }
          >
            {!isRightSidebarVisible ? (
              <ChevronLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
            ) : (
              <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
            )}
          </button>

          {/* Right Edge hover sensor when collapsed */}
          {!isRightSidebarVisible && (
            <div
              onMouseEnter={handleRightSidebarHoverEnter}
              className="fixed right-0 top-0 bottom-0 w-3.5 z-40 pointer-events-auto"
              aria-hidden="true"
            />
          )}

          {/* RIGHT SIDEBAR: JOBS / QUEUE PANEL */}
          <aside
            onMouseEnter={handleRightSidebarHoverEnter}
            onMouseLeave={handleRightSidebarHoverLeave}
            className={`flex-shrink-0 h-full flex flex-col justify-between z-40 select-none shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden ${
              isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            } ${
              !isRightSidebarVisible
                ? "w-0 min-w-0 border-l-0 opacity-0 pointer-events-none"
                : "w-[700px] max-w-[95vw] border-l opacity-100"
            }`}
          >
            <div className="w-[700px] max-w-[95vw] h-full flex flex-col justify-between overflow-hidden flex-shrink-0">
              {/* TOP: TITLE & BUTTONS */}
              <div className={`p-3.5 border-b flex items-center justify-between gap-2 flex-shrink-0 ${themeHeader}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Clock size={18} className="text-indigo-500 flex-shrink-0" />
                  <span className={`text-sm font-bold truncate ${themeTextHead}`}>Hàng đợi tác vụ & Lịch sử</span>
                  {totalCount > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                      {totalCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  {/* Reload Button */}
                  <button
                    onClick={() => fetchDocuments(false)}
                    disabled={isLoadingDocs}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1 cursor-pointer ${themeBtnSecondary}`}
                    title="Tải lại danh sách"
                  >
                    <RefreshCw size={12} className={isLoadingDocs ? 'animate-spin' : ''} />
                    <span>Tải lại</span>
                  </button>

                  {/* Diagnostics Quick Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setDiagDropdownOpen(!diagDropdownOpen)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1 cursor-pointer ${themeBtnSecondary}`}
                    >
                      <Terminal size={12} />
                      <span>Chẩn đoán</span>
                      <ChevronDown size={11} />
                    </button>

                    {diagDropdownOpen && (
                      <div className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-2xl z-30 overflow-hidden py-1 ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                        <button
                          onClick={() => handleViewAgentLog('setting.json')}
                          className={`w-full text-left px-4 py-2 text-xs transition flex items-center space-x-2 ${isLightMode ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800 text-slate-300'}`}
                        >
                          <Settings size={13} className="text-indigo-500" />
                          <span>Xem setting.json</span>
                        </button>
                        <button
                          onClick={() => handleViewAgentLog('stdout.txt')}
                          className={`w-full text-left px-4 py-2 text-xs transition flex items-center space-x-2 ${isLightMode ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800 text-slate-300'}`}
                        >
                          <Terminal size={13} className="text-emerald-500" />
                          <span>Xem stdout.txt</span>
                        </button>
                        <button
                          onClick={() => handleViewAgentLog('sterror.txt')}
                          className={`w-full text-left px-4 py-2 text-xs transition flex items-center space-x-2 ${isLightMode ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800 text-slate-300'}`}
                        >
                          <AlertTriangle size={13} className="text-rose-500" />
                          <span>Xem sterror.txt</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clear All Button */}
                  {documents.length > 0 && (
                    <button
                      onClick={handleClearAllDocs}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-xs font-semibold border border-rose-500/20 transition flex items-center cursor-pointer"
                      title="Xóa tất cả"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {/* Collapse Button */}
                  <button
                    onClick={toggleRightSidebar}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Thu gọn (Autohide)"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Task Table */}
              <div className="flex-1 overflow-y-auto overflow-x-auto [contain:paint]">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className={`border-b text-[11px] uppercase tracking-wider font-semibold ${isLightMode ? 'border-slate-200 text-slate-500 bg-slate-50/50' : 'border-slate-800 text-slate-400'}`}>
                      <th className="py-2.5 px-3">Tên file</th>
                      <th className="py-2.5 px-3 text-center">Profile & Thông số</th>
                      <th className="py-2.5 px-2 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isLightMode ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/50 text-slate-200'}`}>
                    {documents.length > 0 ? (
                      documents.map((doc) => {
                        const isClickable = doc.status === 'completed' && Boolean(doc.preview_url);
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => {
                              if (isClickable) {
                                handleOpenColorStudio(doc.preview_url!, doc.filename, doc);
                              }
                            }}
                            className={`transition-colors duration-75 ${
                              isClickable
                                ? 'cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30'
                                : isLightMode
                                ? 'hover:bg-slate-50'
                                : 'hover:bg-slate-950/40'
                            }`}
                            title={
                              isClickable
                                ? 'Nhấp vào bản ghi để mở Color Studio & Xem trước'
                                : undefined
                            }
                          >
                            <td className="py-2.5 px-3 font-medium">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                {doc.status === 'completed' && (doc.thumbnail_url || doc.preview_url) ? (
                                  <img
                                    src={doc.thumbnail_url || doc.preview_url}
                                    alt="Preview"
                                    width={40}
                                    height={32}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-10 h-8 object-cover rounded-md border border-slate-700 group-hover:border-indigo-500 shadow-xs flex-shrink-0"
                                    title="Nhấp để xem trước & chỉnh màu"
                                  />
                                ) : (
                                  <div className={`w-10 h-8 rounded-md border flex items-center justify-center text-[10px] font-semibold uppercase flex-shrink-0 ${themeCardInner}`}>
                                    -
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="truncate block font-semibold text-xs max-w-[160px]" title={doc.filename}>
                                    {doc.filename}
                                  </span>
                                  {doc.worker_name && (
                                    <div className="mt-0.5">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        <span className="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-400 animate-pulse"></span>
                                        🖥️ {doc.worker_name}
                                      </span>
                                    </div>
                                  )}
                                  <span className={`text-[10px] block ${themeTextMuted}`}>
                                    {doc.created_at}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Gom cột Profile (trên) và Thông số (dưới) */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span
                                  className="inline-block max-w-[170px] truncate text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                                  title={doc.profile_name || (doc.colorspace?.toLowerCase().includes('cmyk') ? 'GCR 22%' : 'Mặc định')}
                                >
                                  {doc.profile_name || (doc.colorspace?.toLowerCase().includes('cmyk') ? 'GCR 22%' : 'Mặc định')}
                                </span>
                                <div className="inline-flex items-center gap-1.5 flex-wrap justify-center text-[9px]">
                                  <span className="text-indigo-500 font-semibold bg-indigo-500/10 px-1.5 py-0.2 rounded-full">
                                    {doc.dpi} DPI
                                  </span>
                                  <span className={`uppercase ${themeTextMuted}`}>
                                    {doc.colorspace} • {doc.compression}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Gom Trạng thái (trên) và Thời gian (dưới) */}
                            <td className="py-2.5 px-2 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                {doc.status === 'pending' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    <span className="w-1.5 h-1.5 mr-1 rounded-full bg-amber-500 animate-pulse"></span>
                                    Chờ
                                  </span>
                                )}
                                {doc.status === 'rendering' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <span className="w-1.5 h-1.5 mr-1 rounded-full bg-blue-500 animate-pulse"></span>
                                    Render
                                  </span>
                                )}
                                {doc.status === 'completed' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-500"></span>
                                    Xong
                                  </span>
                                )}
                                {doc.status === 'failed' && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                    title={doc.error_message}
                                  >
                                    <span className="w-1.5 h-1.5 mr-1 rounded-full bg-rose-500"></span>
                                    Lỗi
                                  </span>
                                )}
                                <span className={`text-[10px] font-medium leading-none ${themeTextMuted}`}>
                                  {doc.status === 'rendering' ? (
                                    <span className="text-blue-500 animate-pulse text-[9px]">Đang chạy...</span>
                                  ) : (
                                    doc.duration || '-'
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* Thao tác: Gọn gàng chỉ giữ Tải xuống & Xóa */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {doc.status === 'completed' && doc.download_url && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadRenderedDoc(doc);
                                    }}
                                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center w-7 h-7"
                                    title={`Tải xuống ${doc.convert_to_pdf || doc.filename.toLowerCase().endsWith('.pdf') ? 'file PDF' : 'file TIFF'}`}
                                  >
                                    <Download size={13} />
                                  </button>
                                )}
                                {doc.status === 'failed' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.error(`Chi tiết lỗi Render:\n${doc.error_message || 'Không có thông tin lỗi.'}`, { duration: 6000 });
                                    }}
                                    className={`p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg border transition ${themeBtnSecondary} flex items-center justify-center w-7 h-7`}
                                    title="Xem chi tiết lỗi"
                                  >
                                    <AlertTriangle size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDoc(doc.id);
                                  }}
                                  className={`p-1.5 rounded-lg border transition ${themeBtnSecondary} text-rose-500 hover:text-rose-600 flex items-center justify-center w-7 h-7`}
                                  title="Xóa tác vụ"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className={`py-10 text-center text-xs ${themeTextMuted}`}>
                          {isLoadingDocs
                            ? 'Đang tải danh sách tác vụ...'
                            : 'Chưa có tác vụ nào trong hàng đợi.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Control */}
              <div className={`p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs flex-shrink-0 ${themeCardInner} ${themeTextMuted}`}>
                <div className="flex items-center space-x-1.5">
                  <span>Hiện</span>
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    className={`border rounded-lg px-2 py-1 cursor-pointer ${themeInput}`}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>/ {totalCount} tác vụ</span>
                </div>

                {totalPagesNum > 1 && (
                  <div className="flex items-center space-x-1">
                    <button
                      disabled={currentPageNum <= 1}
                      onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
                      className={`px-2.5 py-1 disabled:opacity-40 rounded-lg text-xs font-semibold border transition ${themeBtnSecondary}`}
                    >
                      Trước
                    </button>
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow shadow-indigo-500/25">
                      {currentPageNum} / {totalPagesNum}
                    </span>
                    <button
                      disabled={currentPageNum >= totalPagesNum}
                      onClick={() => setCurrentPageNum((p) => Math.min(totalPagesNum, p + 1))}
                      className={`px-2.5 py-1 disabled:opacity-40 rounded-lg text-xs font-semibold border transition ${themeBtnSecondary}`}
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* ================= MODAL: RENDER SUCCESS NOTIFICATION ================= */}
        {renderSuccessModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden p-6 ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shadow-inner flex-shrink-0">
                    <CheckCircle size={26} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${themeTextHead}`}>
                      Kết Xuất Hoàn Tất!
                    </h3>
                    <p className={`text-xs ${themeTextMuted}`}>
                      {renderSuccessModal.engineName} đã xử lý xong tệp
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRenderSuccessModal((prev) => ({ ...prev, isOpen: false }))}
                  className={`p-1.5 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Thông tin tệp & kết quả */}
              <div className={`mt-4 p-3.5 rounded-xl border space-y-2.5 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${themeTextMuted}`}>Tệp tin:</span>
                  <span className={`font-semibold max-w-[210px] truncate ${themeTextHead}`} title={renderSuccessModal.filename}>
                    {renderSuccessModal.filename}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${themeTextMuted}`}>Quy mô:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {renderSuccessModal.totalPages} trang • {renderSuccessModal.dpi} DPI
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${themeTextMuted}`}>Hệ màu & Định dạng:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {renderSuccessModal.colorspace} • {renderSuccessModal.isPdf ? 'PDF Prepress' : 'TIFF'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${themeTextMuted}`}>Thời gian xử lý:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    ⏱️ {renderSuccessModal.durationSec}
                  </span>
                </div>
              </div>

              {/* Ảnh xem trước trang đầu nếu có */}
              {renderSuccessModal.previewUrl && (
                <div className="mt-3 flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-36 overflow-hidden">
                  <img
                    src={renderSuccessModal.previewUrl}
                    alt="Preview"
                    className="max-h-32 object-contain rounded-lg shadow-xs"
                  />
                </div>
              )}

              {/* Các nút hành động */}
              <div className="mt-5 flex flex-col gap-2">
                {renderSuccessModal.downloadUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      await triggerFileDownload(
                        renderSuccessModal.downloadUrl,
                        renderSuccessModal.filename,
                        renderSuccessModal.isPdf
                      );
                      setRenderSuccessModal((prev) => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-[0.99]"
                  >
                    <Download size={15} />
                    <span>Tải Tệp {renderSuccessModal.isPdf ? 'PDF' : 'Kết Quả'} Về Máy</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {renderSuccessModal.previewUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenderSuccessModal((prev) => ({ ...prev, isOpen: false }));
                        handleOpenColorStudio(renderSuccessModal.previewUrl, renderSuccessModal.filename);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${themeBtnSecondary}`}
                    >
                      <Palette size={14} className="text-indigo-500" />
                      <span>Color Studio</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRenderSuccessModal((prev) => ({ ...prev, isOpen: false }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${themeBtnSecondary} ${!renderSuccessModal.previewUrl ? 'col-span-2' : ''}`}
                  >
                    <span>Đóng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: REMOTE DIAGNOSTICS ================= */}
        {diagnoseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className={`p-4 sm:px-6 border-b flex items-center justify-between flex-shrink-0 ${themeHeader}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-inner">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold tracking-tight ${themeTextHead}`}>Chẩn đoán & Giám sát lỗi từ xa</h2>
                    <p className={`text-xs truncate ${themeTextMuted}`}>Thông số phần cứng, dung lượng RAM 128GB và nhật ký hoạt động thời gian thực</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDiagnoseModalOpen(false)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-xl flex items-center gap-2 ${themeTextHead}`}>
                    <Activity className="text-indigo-500" size={22} />
                    <span>Chẩn đoán & Giám sát lỗi từ xa</span>
                  </h2>
                  <p className={`text-xs mt-1 ${themeTextMuted}`}>
                    Xem thông số phần cứng, dung lượng RAM 128GB và nhật ký hoạt động thời gian thực của máy chủ
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleMaximizePagefile}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${themeBtnSecondary}`}
                  >
                    <Sliders size={14} />
                    <span>Tối đa hóa Pagefile</span>
                  </button>
                  <button
                    onClick={handleRestartAgent}
                    className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-500 hover:text-white text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    <span>Khởi động lại Agent</span>
                  </button>
                </div>
              </div>

              {/* Status 4-Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Trạng thái Agent</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-400 animate-pulse"></div>
                    <span className={`text-xl font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>ONLINE</span>
                  </div>
                  <p className={`text-[11px] mt-3 ${themeTextMuted}`}>Hệ thống sẵn sàng xử lý vector</p>
                </div>

                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Tên máy chủ</p>
                  <h3 className={`text-lg font-bold mt-1 truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{diagData.hostname}</h3>
                  <p className={`text-[11px] mt-3 ${themeTextMuted}`}>{diagData.os}</p>
                </div>

                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Hiệu năng CPU</p>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className={`text-3xl font-extrabold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{diagData.cpu_usage}</span>
                    <span className={`text-base font-medium ${themeTextMuted}`}>%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${diagData.cpu_usage}%` }}></div>
                  </div>
                </div>

                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Bộ nhớ RAM vật lý</p>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className={`text-3xl font-extrabold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{diagData.ram_used_gb}</span>
                    <span className={`text-sm font-medium ${themeTextMuted}`}>/ {diagData.ram_total_gb} GB</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${(diagData.ram_used_gb / diagData.ram_total_gb) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Realtime Log Viewer Tabs */}
              <div className={`border rounded-2xl p-5 ${themeCard}`}>
                <h3 className={`text-base mb-4 flex items-center gap-2 ${themeTextHead}`}>
                  <Terminal size={18} className="text-emerald-500" />
                  <span>Tra cứu nhật ký từ xa</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleViewAgentLog('setting.json')}
                    className={`p-4 rounded-xl border hover:border-indigo-500 transition text-left group ${themeCardInner}`}
                  >
                    <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs mb-1">
                      <Settings size={15} />
                      <span>setting.json</span>
                    </div>
                    <p className={`text-[11px] ${themeTextMuted}`}>Xem cấu hình cổng, giới hạn RAM và URL máy chủ</p>
                  </button>

                  <button
                    onClick={() => handleViewAgentLog('stdout.txt')}
                    className={`p-4 rounded-xl border hover:border-emerald-500 transition text-left group ${themeCardInner}`}
                  >
                    <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs mb-1">
                      <Terminal size={15} />
                      <span>stdout.txt</span>
                    </div>
                    <p className={`text-[11px] ${themeTextMuted}`}>Xem log quá trình biên dịch và kết xuất file vector</p>
                  </button>

                  <button
                    onClick={() => handleViewAgentLog('sterror.txt')}
                    className={`p-4 rounded-xl border hover:border-rose-500 transition text-left group ${themeCardInner}`}
                  >
                    <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs mb-1">
                      <AlertTriangle size={15} />
                      <span>sterror.txt</span>
                    </div>
                    <p className={`text-[11px] ${themeTextMuted}`}>Xem log bắt lỗi C-Core, tràn bộ nhớ hoặc timeout</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

        {/* ================= MODAL: AGENT & SOFTWARE DOWNLOADS ================= */}
        {downloadsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className={`p-4 sm:px-6 border-b flex items-center justify-between flex-shrink-0 ${themeHeader}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shadow-inner">
                    <Download size={20} />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold tracking-tight ${themeTextHead}`}>Hạ tầng Render: PrintAgent PC & Máy trạm Server</h2>
                    <p className={`text-xs truncate ${themeTextMuted}`}>Tải phần mềm PrintAgent trên PC và gói công cụ máy trạm xử lý vector</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDownloadsModalOpen(false)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-5xl mx-auto space-y-6">
              <div>
                <h2 className={`text-xl flex items-center gap-2 ${themeTextHead}`}>
                  <Download className="text-indigo-500" size={22} />
                  <span>Hạ tầng Render: PrintAgent PC & Máy trạm Server</span>
                </h2>
                <p className={`text-xs mt-1 ${themeTextMuted}`}>
                  Cơ chế kết xuất kép thông minh: Bơm code thực thi (Exec) trực tiếp qua PrintAgent có sẵn trên PC, tự động fallback về Máy trạm Server 128GB RAM khi dùng Mobile hoặc không có Agent.
                </p>
              </div>

              {/* LIVE AGENT STATUS CARD */}
              <div className={`border rounded-2xl p-5 ${themeCard}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${effectiveEngine === 'goagent' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                      {effectiveEngine === 'goagent' ? <Cpu size={22} /> : <Server size={22} />}
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        Trạng thái kết nối: {effectiveEngine === 'goagent' ? 'Đã kết nối PrintAgent (Máy này)' : selectedNode ? `Máy trạm Server (${selectedNode.hostname} • ${selectedNode.public_ip || selectedNode.local_ip || ''})` : 'Máy trạm Server (Tự động điều phối)'}
                      </h3>
                      <p className={`text-[11px] ${themeTextMuted}`}>
                        {effectiveEngine === 'goagent'
                          ? `Đã tìm thấy PrintAgent (UID: ${goAgentInfo?.agent_uid || 'administrator'}, PC: ${goAgentInfo?.pc_name || 'Administrator'}). Sẵn sàng nhận lệnh Exec xử lý PDF tức thì.`
                          : isMobile
                          ? 'Đang truy cập từ thiết bị di động -> Tự động kích hoạt luồng kết xuất qua cụm Máy trạm Server.'
                          : selectedNode
                          ? `Đang điều phối xử lý qua Máy trạm ${selectedNode.hostname} (IP: ${selectedNode.public_ip || selectedNode.local_ip}) được kích hoạt làm Máy Render.`
                          : 'Đang điều phối xử lý qua cụm Máy trạm Server (Tự động chọn máy trạm render đang online).'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      checkGoAgent();
                      fetchRenderNodes();
                    }}
                    disabled={isProbingAgent || isFetchingNodes}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${themeBtnSecondary}`}
                  >
                    <RefreshCw size={13} className={isProbingAgent || isFetchingNodes ? 'animate-spin text-indigo-500' : ''} />
                    <span>Quét lại toàn bộ</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className={`p-3.5 rounded-xl border ${effectiveEngine === 'goagent' ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20' : themeCardInner}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <Zap size={14} className="text-emerald-500" />
                        PrintAgent (Máy này)
                      </span>
                      {effectiveEngine === 'goagent' && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                          ĐANG DÙNG
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                      Bơm trực tiếp mã Python vào endpoint <code className="text-indigo-500 font-mono">POST /api/local/exec</code> của PrintAgent cổng 9173 trên máy tính này. Xử lý ảnh và trang PDF ngay tại CPU máy tính mà không cần gửi dữ liệu qua Internet.
                    </p>
                  </div>

                  {renderNodes.length === 0 ? (
                    <div className={`p-3.5 rounded-xl border ${themeCardInner} text-center flex flex-col items-center justify-center`}>
                      <span className="text-xs text-slate-400">Đang tải danh sách máy trạm render...</span>
                    </div>
                  ) : (
                    renderNodes.map((node) => {
                      const isSelected = effectiveEngine === 'server' && (selectedRenderNodeUid === node.agent_uid || (selectedRenderNodeUid === 'auto' && node.is_online));
                      return (
                        <div
                          key={node.agent_uid}
                          onClick={() => {
                            handleSelectRenderOption('server', node.agent_uid);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition ${
                            isSelected
                              ? 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500/30'
                              : themeCardInner
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                              <Server size={14} className={node.is_online ? 'text-emerald-500' : 'text-slate-400'} />
                              <span>{node.hostname || node.agent_uid}</span>
                              <span className={`w-2 h-2 rounded-full ${node.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            </span>
                            {isSelected && (
                              <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                                {selectedRenderNodeUid === node.agent_uid ? 'ĐANG CHỌN' : 'TỰ ĐỘNG'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {node.public_ip || node.local_ip || 'N/A'}
                            </span>
                            <span className={`text-[10px] font-medium ${node.is_online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {node.is_online ? 'Online (Sẵn sàng)' : 'Offline'}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                            Máy trạm render được kích hoạt tại <a href="https://agentapi.quanlymay.com/agents" target="_blank" rel="noreferrer" className="text-indigo-500 underline font-mono">agentapi.quanlymay.com/agents</a>. Nhận lệnh kết xuất qua PrintAgent Exec.
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Release Table */}
              <div className={`border rounded-2xl overflow-hidden ${themeCard}`}>
                <div className={`px-5 py-3 border-b flex justify-between items-center ${themeCardInner}`}>
                  <div>
                    <h3 className={`font-bold text-sm ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Bộ cài đặt PrintAgent</h3>
                    <p className={`text-[11px] ${themeTextMuted}`}>Cài đặt trên PC để kích hoạt PrintAgent cổng 9173, phục vụ render vector & in ấn siêu tốc cục bộ</p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                    Bản mới nhất (Official)
                  </span>
                </div>
                <div className="p-5">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b pb-2 font-semibold ${themeTextMuted} ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
                        <th className="pb-3">Phần mềm</th>
                        <th className="pb-3">Phiên bản</th>
                        <th className="pb-3">Hệ điều hành</th>
                        <th className="pb-3 text-right">Tải về</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLightMode ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                      <tr className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-950/30'}>
                        <td className={`py-4 font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                          <div className="flex items-center gap-1.5">
                            <span>PrintAgent Installer</span>
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold">Khuyên dùng</span>
                          </div>
                          <div className={`text-[11px] font-normal ${themeTextMuted}`}>
                            Tự động thiết lập dịch vụ PrintAgent cổng 9173, chạy nền nhận lệnh exec kết xuất vector & in ấn
                          </div>
                        </td>
                        <td className="py-4 text-slate-500 dark:text-slate-300">Mới nhất</td>
                        <td className="py-4 text-slate-500 dark:text-slate-300">Windows 10 / 11 / Server 64-bit</td>
                        <td className="py-4 text-right">
                          <a
                            href="https://download.printagentx.com/printagentinstall.exe"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition shadow-xs"
                          >
                            <Download size={13} />
                            <span>Tải EXE</span>
                          </a>
                        </td>
                      </tr>
                      <tr className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-950/30'}>
                        <td className={`py-4 font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                          <div>Toolx Core Engine</div>
                          <div className={`text-[11px] font-normal ${themeTextMuted}`}>Gói nhân C-Core kết xuất vector độc lập bổ trợ</div>
                        </td>
                        <td className="py-4 text-slate-500 dark:text-slate-300">v1.5.2</td>
                        <td className="py-4 text-slate-500 dark:text-slate-300">Windows 64-bit</td>
                        <td className="py-4 text-right">
                          <a
                            href="https://render.toolxprint.com/static/releases/toolx_core.zip"
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold border transition ${themeBtnSecondary}`}
                          >
                            <Download size={13} />
                            <span>Tải ZIP</span>
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instructions */}
              <div className={`border rounded-2xl p-5 ${themeCard}`}>
                <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${themeTextHead}`}>
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span>Cách thức hoạt động & Tự động nhận diện</span>
                </h3>
                <ol className={`list-decimal list-inside space-y-2 text-xs leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li><strong>Chưa có ToolxAgent trên máy:</strong> Tải và cài đặt gói <a href="https://download.printagentx.com/printagentinstall.exe" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline"><code className="font-mono">printagentinstall.exe</code></a> từ <code className="text-indigo-500 font-mono">download.printagentx.com</code>. Trình cài đặt sẽ tự động kích hoạt dịch vụ chạy ngầm tại cổng <code className="text-indigo-500 font-mono">9173</code>.</li>
                  <li><strong>Máy tính đã có Goxprint / PrintAgent:</strong> Hệ thống Toolx sẽ tự động quét và nhận diện ngay lập tức mà không cần cài thêm bất kỳ phần mềm nào khác.</li>
                  <li><strong>Bơm code Exec trực tiếp:</strong> Khi kết xuất PDF, script Python tối ưu được gửi thẳng tới ToolxAgent, giải nén và trích xuất trang sang hình ảnh phân giải cao ngay trên máy trong chớp mắt (khoảng 0.5s).</li>
                  <li><strong>Tự động Fallback:</strong> Nếu chưa mở ToolxAgent hoặc truy cập từ điện thoại/máy tính bảng (Mobile), tệp tin sẽ tự động được gửi về Máy trạm Server 128GB RAM xử lý an toàn và đồng bộ kết quả lên đám mây.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ================= MODAL: OFFLINE BROWSER RENDER ================= */}
    {offlineModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className={`w-full max-w-7xl h-[94vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
          <div className={`h-12 border-b px-4 flex items-center justify-between gap-3 flex-shrink-0 text-xs ${themeHeader}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Monitor size={16} />
              </div>
              <div>
                <span className="font-bold text-xs">Render Trình Duyệt & Cân Màu Prepress</span>
                <span className={`hidden sm:inline text-[11px] ml-2 ${themeTextMuted}`}>Kết xuất trực tiếp trên máy không cần tải lên server</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOfflineModalOpen(false)}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
              title="Đóng cửa sổ"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Offline Top Action Bar */}
            <div className={`h-11 border-b px-4 flex items-center justify-between gap-2 flex-shrink-0 text-xs ${themeHeader}`}>
              <div className="flex items-center gap-2">
                <input
                  ref={offlineFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.webp,.bmp,image/*"
                  className="hidden"
                  onChange={handleOfflineFileUpload}
                />
                <button
                  onClick={() => offlineFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <Upload size={13} />
                  <span>{offlinePdfDoc ? 'Chọn tệp khác' : 'Tải lên PDF / Hình ảnh xem trực tiếp'}</span>
                </button>
                {offlineFileName && (
                  <span className={`text-xs ${themeTextMuted}`}>
                    {offlineFileName} ({offlineFileSize}) - {offlineTotalPages} trang
                  </span>
                )}
              </div>

              {offlinePdfDoc && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (offlineCanvasRef.current) {
                        handleOpenWithAICheck(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition active:scale-95"
                    title="Kiểm tra chất lượng màu sắc trang này bằng AI"
                  >
                    <Sparkles size={13} className="text-amber-300 animate-pulse" />
                    <span>Kiểm tra màu bằng AI</span>
                  </button>

                  <button
                    onClick={() => {
                      if (offlineCanvasRef.current) {
                        handleOpenColorStudio(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${themeBtnSecondary}`}
                  >
                    <Palette size={13} className="text-indigo-500" />
                    <span>Chỉnh màu trang này</span>
                  </button>

                  <button
                    onClick={handleExportAllPagesCalibrated}
                    disabled={isExportingAllPages}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                    title={`Kết xuất và áp dụng bộ lọc cân màu Profile "${activeProfile.name}" cho toàn bộ ${offlineTotalPages} trang trong file PDF`}
                  >
                    <Download size={13} className={isExportingAllPages ? 'animate-spin' : ''} />
                    <span>
                      {isExportingAllPages
                        ? (exportProgressText || 'Đang xuất...')
                        : `Xuất toàn bộ ${offlineTotalPages} trang đã cân màu (PDF)`}
                    </span>
                  </button>

                  <button
                    onClick={handleOfflineDownloadSingle}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                  >
                    <Download size={13} />
                    <span>Tải ảnh trang {offlineCurrentPage}</span>
                  </button>
                  <button
                    onClick={handleOfflineCopyToClipboard}
                    className={`p-1.5 rounded-xl border ${themeBtnSecondary}`}
                    title="Sao chép ảnh"
                  >
                    {offlineCopiedToast ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* Main Offline Viewport */}
            <div className="flex-1 flex overflow-hidden">
              {!offlinePdfDoc ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div
                    onClick={() => offlineFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOffline(true); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOffline(true); }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setIsDraggingOffline(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOffline(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        await processOfflineFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`max-w-md w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 group ${
                      isDraggingOffline
                        ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/20 scale-[1.01]'
                        : isLightMode
                        ? 'border-slate-300 bg-white hover:bg-slate-50 hover:border-indigo-400'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-indigo-500'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner pointer-events-none">
                      {isDraggingOffline ? <Upload size={28} className="animate-bounce" /> : <FileText size={28} />}
                    </div>
                    <h3 className={`text-sm font-bold mb-1 pointer-events-none ${isDraggingOffline ? 'text-indigo-500' : (isLightMode ? 'text-slate-900' : 'text-white')}`}>
                      {isDraggingOffline ? 'Thả file PDF vào đây ngay...' : 'Kéo thả file PDF để Render trên trình duyệt'}
                    </h3>
                    <p className={`text-xs mb-4 pointer-events-none ${themeTextMuted}`}>
                      {isDraggingOffline ? 'Hệ thống sẽ tải và kết xuất trang tức thì' : 'Kết xuất tức thời sang PNG/JPEG chất lượng cao mà không cần gửi dữ liệu lên máy chủ.'}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow pointer-events-none">
                      <Upload size={13} />
                      <span>{isDraggingOffline ? 'Thả tệp để tải' : 'Chọn file từ máy tính'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Left Pages Sidebar */}
                  <div className={`w-44 border-r flex flex-col overflow-hidden flex-shrink-0 ${themeCardInner}`}>
                    <div className={`p-2.5 border-b flex items-center justify-between text-xs font-semibold ${isLightMode ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-300'}`}>
                      <span>Trang PDF</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isLightMode ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'}`}>
                        {offlineTotalPages}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {offlinePagesMeta.map((meta) => {
                        const isSelected = meta.pageNumber === offlineCurrentPage;
                        return (
                          <div
                            key={meta.pageNumber}
                            onClick={() => setOfflineCurrentPage(meta.pageNumber)}
                            className={`p-1.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/50'
                                : `${themeCard} hover:border-indigo-400`
                            }`}
                          >
                            <div className="aspect-[3/4] bg-white rounded overflow-hidden flex items-center justify-center relative mb-1 shadow-xs">
                              {meta.thumbnailUrl ? (
                                <img src={meta.thumbnailUrl} alt={`Trang ${meta.pageNumber}`} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-[10px] text-slate-400">#{meta.pageNumber}</span>
                              )}
                            </div>
                            <div className={`flex items-center justify-between text-[10px] ${themeTextMuted}`}>
                              <span>Trang {meta.pageNumber}</span>
                              <span>{meta.widthMm}×{meta.heightMm}mm</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Middle Preview Canvas */}
                  <div className={`flex-1 flex flex-col overflow-hidden relative ${isLightMode ? 'bg-slate-200/50' : 'bg-slate-950'}`}>
                    <div className={`h-10 border-b px-4 flex items-center justify-between text-xs ${themeHeader}`}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setOfflineCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={offlineCurrentPage <= 1}
                          className="p-1 rounded hover:bg-slate-500/20 disabled:opacity-30"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <span className="font-semibold">Trang {offlineCurrentPage} / {offlineTotalPages}</span>
                        <button
                          onClick={() => setOfflineCurrentPage((p) => Math.min(offlineTotalPages, p + 1))}
                          disabled={offlineCurrentPage >= offlineTotalPages}
                          className="p-1 rounded hover:bg-slate-500/20 disabled:opacity-30"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>

                      {curOfflineMeta && (
                        <div className={`hidden sm:block text-[11px] ${themeTextMuted}`}>
                          {curOfflineMeta.widthMm} × {curOfflineMeta.heightMm} mm ({Math.round(curOfflineMeta.widthPt * getOfflineScale(offlineDpi))} × {Math.round(curOfflineMeta.heightPt * getOfflineScale(offlineDpi))} px)
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setOfflineZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 10) / 10))}
                          className="p-1 rounded hover:bg-slate-500/20"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span className="font-mono text-[11px] min-w-[36px] text-center">{Math.round(offlineZoom * 100)}%</span>
                        <button
                          onClick={() => setOfflineZoom((z) => Math.min(3.0, Math.round((z + 0.1) * 10) / 10))}
                          className="p-1 rounded hover:bg-slate-500/20"
                        >
                          <ZoomIn size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                      {offlineIsRendering && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs flex items-center gap-1.5 shadow-lg">
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Đang render trang {offlineCurrentPage}...</span>
                        </div>
                      )}
                      <canvas
                        ref={offlineCanvasRef}
                        className={`rounded shadow-2xl max-w-none ${offlineTransparentBg ? 'bg-transparent' : 'bg-white'}`}
                      />
                    </div>
                  </div>

                  {/* Right Settings */}
                  <div className={`w-56 border-l p-4 space-y-4 text-xs ${themeCard}`}>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1.5 ${themeTextMuted}`}>Độ phân giải (DPI):</label>
                      <div className="grid grid-cols-2 gap-1">
                        {([72, 150, 300, 600] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => setOfflineDpi(d)}
                            className={`py-1.5 rounded-lg text-center font-medium transition ${
                              offlineDpi === d ? 'bg-indigo-600 text-white' : themeBtnSecondary
                            }`}
                          >
                            {d} DPI
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-semibold mb-1.5 ${themeTextMuted}`}>Màu sắc:</label>
                      <select
                        value={offlineColorMode}
                        onChange={(e) => setOfflineColorMode(e.target.value as any)}
                        className={`w-full border rounded-lg p-2 ${themeInput}`}
                      >
                        <option value="original">Màu gốc (RGB)</option>
                        <option value="cmyk-sim">Mô phỏng CMYK</option>
                        <option value="grayscale">Trắng đen</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-semibold mb-1.5 ${themeTextMuted}`}>Định dạng ảnh:</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => setOfflineFormat('png')}
                          className={`py-1.5 rounded-lg font-medium transition ${offlineFormat === 'png' ? 'bg-indigo-600 text-white' : themeBtnSecondary}`}
                        >
                          PNG
                        </button>
                        <button
                          onClick={() => setOfflineFormat('jpeg')}
                          className={`py-1.5 rounded-lg font-medium transition ${offlineFormat === 'jpeg' ? 'bg-indigo-600 text-white' : themeBtnSecondary}`}
                        >
                          JPEG
                        </button>
                      </div>
                    </div>

                    {offlineFormat === 'jpeg' && (
                      <div>
                        <div className={`flex justify-between text-[11px] font-semibold mb-1 ${themeTextMuted}`}>
                          <span>Chất lượng JPEG:</span>
                          <span className={isLightMode ? 'text-slate-800' : 'text-slate-200'}>{offlineJpegQuality}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          value={offlineJpegQuality}
                          onChange={(e) => setOfflineJpegQuality(Number(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {offlineFormat === 'png' && (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={offlineTransparentBg}
                          onChange={(e) => setOfflineTransparentBg(e.target.checked)}
                          className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-xs ${themeTextMuted}`}>Nền trong suốt</span>
                      </label>
                    )}

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <button
                        onClick={() => {
                          if (offlineCanvasRef.current) {
                            handleOpenWithAICheck(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
                          }
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer"
                        title="Kiểm tra chất lượng màu trang này bằng AI"
                      >
                        <Sparkles size={14} className="text-amber-300 animate-pulse" />
                        <span>Kiểm tra màu bằng AI</span>
                      </button>

                      <button
                        onClick={() => {
                          if (offlineCanvasRef.current) {
                            handleOpenColorStudio(offlineCanvasRef.current.toDataURL('image/png'), `${offlineFileName}_trang_${offlineCurrentPage}`);
                          }
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow"
                      >
                        <Palette size={14} />
                        <span>Mở Studio Chỉnh màu</span>
                      </button>

                      <button
                        onClick={handleExportAllPagesCalibrated}
                        disabled={isExportingAllPages}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                      >
                        <Download size={14} className={isExportingAllPages ? 'animate-spin' : ''} />
                        <span>{isExportingAllPages ? (exportProgressText || 'Đang xuất...') : `Xuất PDF toàn bộ (${offlineTotalPages} trang)`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProfileModalOpen(true)}
                        className={`w-full py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${themeBtnSecondary}`}
                      >
                        <Sliders size={13} className="text-purple-500" />
                        <span>Cấu hình Profile & Bộ lọc</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ================= STUDIO PREVIEW & COLOR ADJUSTMENT MODAL (PHOTOSHOP-LIKE) ================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
          <div className={`relative border rounded-2xl overflow-hidden max-w-7xl w-full h-[92vh] flex flex-col shadow-2xl ${themeCard}`}>
            {/* Modal Header */}
            <div className={`flex flex-wrap items-center justify-between p-3.5 border-b gap-3 ${themeHeader}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Palette size={18} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold truncate max-w-md ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    {previewDocTitle} - Studio Chỉnh màu & Xem trước
                  </h4>
                  <p className={`text-[11px] ${themeTextMuted}`}>Hệ màu CMYK, RGB, Brightness/Contrast, Color Balance, HSL, Photoshop Curves</p>
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div className="flex items-center gap-2">
                {/* Hold to Compare Original */}
                <button
                  onMouseDown={() => setShowCompareOriginal(true)}
                  onMouseUp={() => setShowCompareOriginal(false)}
                  onTouchStart={() => setShowCompareOriginal(true)}
                  onTouchEnd={() => setShowCompareOriginal(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition select-none ${
                    showCompareOriginal
                      ? 'bg-amber-500 text-white border-amber-500 shadow'
                      : themeBtnSecondary
                  }`}
                  title="Nhấn và giữ chuột để xem ảnh gốc trước khi chỉnh màu"
                >
                  <span>{showCompareOriginal ? 'Đang hiện ảnh gốc' : 'Giữ xem ảnh gốc'}</span>
                </button>

                {/* AI Color Inspection Button */}
                <button
                  onClick={handleRunAIColorCheck}
                  disabled={isAIAnalyzing}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition active:scale-95 cursor-pointer"
                  title="Kiểm tra chất lượng màu sắc, dải màu CMYK Offset, độ phủ mực TAC & cháy sáng bằng AI"
                >
                  <Sparkles size={14} className="text-amber-300 animate-pulse" />
                  <span>Kiểm tra màu bằng AI</span>
                </button>

                {/* Reset Color Button */}
                <button
                  onClick={handleResetColorSettings}
                  disabled={isDefaultColorSettings(colorSettings)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition disabled:opacity-40 ${themeBtnSecondary}`}
                  title="Khôi phục toàn bộ thanh trượt và Curves về mặc định"
                >
                  <RotateCcw size={13} />
                  <span>Đặt lại (Reset)</span>
                </button>

                {/* Download Adjusted Image */}
                <button
                  onClick={handleDownloadAdjustedImage}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition"
                  title="Tải ảnh PNG thành phẩm đã áp dụng màu mới"
                >
                  <Download size={13} />
                  <span>Tải ảnh đã chỉnh màu</span>
                </button>

                {/* Copy to Clipboard */}
                <button
                  onClick={handleCopyAdjustedImageToClipboard}
                  className={`p-1.5 rounded-xl border transition ${themeBtnSecondary}`}
                  title="Sao chép ảnh đã chỉnh màu vào Clipboard"
                >
                  {copiedPreviewToast ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>

                {/* Close Modal */}
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 hover:bg-rose-500/20 rounded-xl text-slate-400 hover:text-rose-500 transition"
                  title="Đóng cửa sổ"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Workspace (Split: Left Viewport, Right Sliders & Curves) */}
            <div className="flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT VIEWPORT: LIVE ADJUSTED CANVAS */}
              <div className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative ${isLightMode ? 'bg-slate-200/50' : 'bg-slate-950'}`}>
                {/* Viewport Zoom Toolbar */}
                <div className={`h-9 border-b px-4 flex items-center justify-between text-xs ${themeHeader}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold ${themeTextMuted}`}>
                      {showCompareOriginal ? 'Đang so sánh: ẢNH GỐC' : 'Đang hiển thị: ẢNH ĐÃ CHỈNH MÀU'}
                    </span>
                    {activeHeatmapMode !== 'none' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                        <Flame size={11} />
                        <span>Heatmap: {activeHeatmapMode === 'tac' ? 'Quá mực TAC (>300%)' : activeHeatmapMode === 'gamut' ? 'Lệch dải CMYK' : 'Tone Clipping'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewZoom((z) => Math.max(0.05, Math.round((z - 0.1) * 100) / 100))}
                      className="p-1 rounded hover:bg-slate-500/20 cursor-pointer"
                      title="Thu nhỏ (-10%)"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="font-mono text-[11px] min-w-[38px] text-center font-bold text-indigo-500">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setPreviewZoom((z) => Math.min(3.0, Math.round((z + 0.1) * 100) / 100))}
                      className="p-1 rounded hover:bg-slate-500/20 cursor-pointer"
                      title="Phóng to (+10%)"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      onClick={() => handleFitStudioZoom()}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer hover:border-indigo-500 transition ${themeBtnSecondary}`}
                      title="Thu phóng vừa vặn khung hình xem trước"
                    >
                      Vừa khung
                    </button>
                    <button
                      onClick={() => setPreviewZoom(1.0)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer hover:border-indigo-500 transition ${themeBtnSecondary}`}
                      title="Hiển thị tỉ lệ pixel gốc 100%"
                    >
                      100%
                    </button>
                  </div>
                </div>

                {/* Main Canvas Scroll Area */}
                <div
                  ref={studioScrollAreaRef}
                  className="flex-1 min-w-0 min-h-0 overflow-auto p-6 flex relative bg-dot-pattern"
                >
                  {/* Loading Overlay khi đang giải nén hoặc nạp ảnh */}
                  {isStudioLoading && (
                    <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
                      <div className="relative mb-4">
                        <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                        <Maximize2 size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1.5 flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin text-indigo-400" />
                        <span>{studioLoadingText}</span>
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Đang giải nén ma trận điểm ảnh gốc độ phân giải cao và kết xuất không gian màu trung thực...
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      width: canvasDims.width ? `${Math.round(canvasDims.width * previewZoom)}px` : 'auto',
                      height: canvasDims.height ? `${Math.round(canvasDims.height * previewZoom)}px` : 'auto',
                    }}
                    className="relative m-auto flex items-center justify-center flex-shrink-0 transition-[width,height] duration-75"
                  >
                    <canvas
                      ref={studioCanvasRef}
                      className="w-full h-full rounded shadow-2xl bg-white border border-slate-800 block"
                    />
                    <canvas
                      ref={heatmapCanvasRef}
                      className={`absolute inset-0 w-full h-full rounded pointer-events-none transition-opacity duration-200 block ${
                        activeHeatmapMode !== 'none' ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR: COLOR ADJUSTMENT SUITE (SLIDERS & CURVES) */}
              <div className={`w-full lg:w-[410px] shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col overflow-hidden text-xs ${themeCard}`}>
                {/* AI Color Inspection Quick Action Banner */}
                <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${
                  isLightMode ? 'bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border-purple-100' : 'bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-pink-950/20 border-purple-900/40'
                }`}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-purple-500 animate-pulse" />
                    <div>
                      <div className="font-bold text-[11px] text-purple-600 dark:text-purple-400">Prepress AI</div>
                      <div className={`text-[10px] ${themeTextMuted}`}>Kiểm tra lỗi mực in & dải màu</div>
                    </div>
                  </div>
                  <button
                    onClick={handleRunAIColorCheck}
                    disabled={isAIAnalyzing}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow transition active:scale-95 cursor-pointer"
                  >
                    Kiểm tra ngay
                  </button>
                </div>

                {/* Preset Bar */}
                <div className={`p-3 border-b flex items-center justify-between gap-2 ${themeCardInner}`}>
                  <span className={`text-[11px] font-semibold ${themeTextMuted}`}>Mẫu màu sẵn:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {COLOR_PRESETS.slice(0, 4).map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition shrink-0 ${themeBtnSecondary}`}
                        title={preset.description}
                      >
                        {preset.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Category Tabs */}
                <div className={`grid grid-cols-6 border-b text-[11px] font-semibold text-center ${themeCardInner}`}>
                  <button
                    onClick={() => setColorTab('curves')}
                    className={`py-2.5 transition border-b-2 ${
                      colorTab === 'curves'
                        ? 'border-indigo-600 text-indigo-500 font-bold'
                        : `border-transparent ${themeTextMuted} hover:text-indigo-500`
                    }`}
                  >
                    Curves
                  </button>
                  <button
                    onClick={() => setColorTab('brightness')}
                    className={`py-2.5 transition border-b-2 ${
                      colorTab === 'brightness'
                        ? 'border-indigo-600 text-indigo-500 font-bold'
                        : `border-transparent ${themeTextMuted} hover:text-indigo-500`
                    }`}
                  >
                    Sáng/T.Phản
                  </button>
                  <button
                    onClick={() => setColorTab('balance')}
                    className={`py-2.5 transition border-b-2 ${
                      colorTab === 'balance'
                        ? 'border-indigo-600 text-indigo-500 font-bold'
                        : `border-transparent ${themeTextMuted} hover:text-indigo-500`
                    }`}
                  >
                    Balance
                  </button>
                  <button
                    onClick={() => setColorTab('hsl')}
                    className={`py-2.5 transition border-b-2 ${
                      colorTab === 'hsl'
                        ? 'border-indigo-600 text-indigo-500 font-bold'
                        : `border-transparent ${themeTextMuted} hover:text-indigo-500`
                    }`}
                  >
                    HSL
                  </button>
                  <button
                    onClick={() => setColorTab('cmyk')}
                    className={`py-2.5 transition border-b-2 ${
                      colorTab === 'cmyk'
                        ? 'border-indigo-600 text-indigo-500 font-bold'
                        : `border-transparent ${themeTextMuted} hover:text-indigo-500`
                    }`}
                  >
                    CMYK
                  </button>
                  <button
                    onClick={() => setColorTab('rgb')}
                    className={`py-2.5 transition border-b-2 ${
                      colorTab === 'rgb'
                        ? 'border-indigo-600 text-indigo-500 font-bold'
                        : `border-transparent ${themeTextMuted} hover:text-indigo-500`
                    }`}
                  >
                    RGB
                  </button>
                </div>

                {/* Sliders Container Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* TAB: PHOTOSHOP CURVES */}
                  {colorTab === 'curves' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-xs ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                          Đường cong sắc độ (Curves)
                        </span>
                        <span className={`text-[10px] ${themeTextMuted}`}>Kiểu Photoshop</span>
                      </div>
                      <ColorCurveEditor
                        channel={curveChannel}
                        points={
                          curveChannel === 'rgb'
                            ? colorSettings.curveRGB
                            : curveChannel === 'red'
                            ? colorSettings.curveRed
                            : curveChannel === 'green'
                            ? colorSettings.curveGreen
                            : colorSettings.curveBlue
                        }
                        onChange={(newPoints: CurvePoint[]) => {
                          if (curveChannel === 'rgb') updateSetting('curveRGB', newPoints);
                          else if (curveChannel === 'red') updateSetting('curveRed', newPoints);
                          else if (curveChannel === 'green') updateSetting('curveGreen', newPoints);
                          else if (curveChannel === 'blue') updateSetting('curveBlue', newPoints);
                        }}
                        onChannelChange={(ch) => setCurveChannel(ch)}
                        isLightMode={isLightMode}
                      />
                    </div>
                  )}

                  {/* TAB: BRIGHTNESS & CONTRAST */}
                  {colorTab === 'brightness' && (
                    <div className="space-y-4">
                      {/* Brightness */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className={`font-medium ${themeTextMuted}`}>Độ sáng (Brightness)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.brightness}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.brightness}
                          onChange={(e) => updateSetting('brightness', Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {/* Contrast */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className={`font-medium ${themeTextMuted}`}>Độ tương phản (Contrast)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.contrast}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.contrast}
                          onChange={(e) => updateSetting('contrast', Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB: COLOR BALANCE */}
                  {colorTab === 'balance' && (
                    <div className="space-y-4">
                      {/* Cyan <-> Red */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="text-cyan-500 font-semibold">Cyan (-100)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.balanceCyanRed}</span>
                          <span className="text-rose-500 font-semibold">Red (+100)</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.balanceCyanRed}
                          onChange={(e) => updateSetting('balanceCyanRed', Number(e.target.value))}
                          className="w-full accent-rose-500 cursor-pointer"
                        />
                      </div>

                      {/* Magenta <-> Green */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="text-fuchsia-500 font-semibold">Magenta (-100)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.balanceMagentaGreen}</span>
                          <span className="text-emerald-500 font-semibold">Green (+100)</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.balanceMagentaGreen}
                          onChange={(e) => updateSetting('balanceMagentaGreen', Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Yellow <-> Blue */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="text-amber-500 font-semibold">Yellow (-100)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.balanceYellowBlue}</span>
                          <span className="text-blue-500 font-semibold">Blue (+100)</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.balanceYellowBlue}
                          onChange={(e) => updateSetting('balanceYellowBlue', Number(e.target.value))}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB: HSL */}
                  {colorTab === 'hsl' && (
                    <div className="space-y-4">
                      {/* Hue */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className={`font-medium ${themeTextMuted}`}>Sắc thái (Hue)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.hue}°</span>
                        </div>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={colorSettings.hue}
                          onChange={(e) => updateSetting('hue', Number(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Saturation */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className={`font-medium ${themeTextMuted}`}>Độ bão hòa (Saturation)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.saturation}%</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.saturation}
                          onChange={(e) => updateSetting('saturation', Number(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Lightness */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className={`font-medium ${themeTextMuted}`}>Độ sáng (Lightness)</span>
                          <span className="font-mono font-semibold text-indigo-500">{colorSettings.lightness}%</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.lightness}
                          onChange={(e) => updateSetting('lightness', Number(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB: CMYK SIMULATION */}
                  {colorTab === 'cmyk' && (
                    <div className="space-y-4">
                      <p className={`text-[11px] ${themeTextMuted}`}>Mô phỏng bù trừ lượng mực CMYK cho in ấn chuyên nghiệp:</p>

                      {/* Cyan */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-cyan-500 font-semibold">Cyan (Xanh lơ)</span>
                          <span className="font-mono font-semibold text-cyan-500">{colorSettings.cyan}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.cyan}
                          onChange={(e) => updateSetting('cyan', Number(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      {/* Magenta */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-fuchsia-500 font-semibold">Magenta (Đỏ cánh sen)</span>
                          <span className="font-mono font-semibold text-fuchsia-500">{colorSettings.magenta}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.magenta}
                          onChange={(e) => updateSetting('magenta', Number(e.target.value))}
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                      </div>

                      {/* Yellow */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-amber-500 font-semibold">Yellow (Vàng)</span>
                          <span className="font-mono font-semibold text-amber-500">{colorSettings.yellow}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.yellow}
                          onChange={(e) => updateSetting('yellow', Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Black / Key */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className={`font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>Black (K - Mực đen)</span>
                          <span className="font-mono font-semibold text-slate-500">{colorSettings.black}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.black}
                          onChange={(e) => updateSetting('black', Number(e.target.value))}
                          className="w-full accent-slate-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB: RGB CHANNELS */}
                  {colorTab === 'rgb' && (
                    <div className="space-y-4">
                      {/* Red */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-rose-500 font-semibold">Kênh Đỏ (Red)</span>
                          <span className="font-mono font-semibold text-rose-500">{colorSettings.red}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.red}
                          onChange={(e) => updateSetting('red', Number(e.target.value))}
                          className="w-full accent-rose-500 cursor-pointer"
                        />
                      </div>

                      {/* Green */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-emerald-500 font-semibold">Kênh Lục (Green)</span>
                          <span className="font-mono font-semibold text-emerald-500">{colorSettings.green}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.green}
                          onChange={(e) => updateSetting('green', Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Blue */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-blue-500 font-semibold">Kênh Lam (Blue)</span>
                          <span className="font-mono font-semibold text-blue-500">{colorSettings.blue}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={colorSettings.blue}
                          onChange={(e) => updateSetting('blue', Number(e.target.value))}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Quick Action in Sidebar */}
                <div className={`p-3 border-t flex items-center justify-between gap-2 ${themeCardInner}`}>
                  <button
                    onClick={handleResetColorSettings}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${themeBtnSecondary}`}
                  >
                    <RotateCcw size={13} />
                    <span>Đặt lại</span>
                  </button>

                  <button
                    onClick={handleDownloadAdjustedImage}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition"
                  >
                    <Download size={13} />
                    <span>Lưu ảnh thành phẩm</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LOG VIEWER MODAL ================= */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`relative border rounded-2xl overflow-hidden max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl ${themeCard}`}>
            <div className={`flex justify-between items-center p-4 border-b ${themeCardInner}`}>
              <h4 className={`font-bold text-sm flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                <Terminal size={16} className="text-indigo-500" />
                <span>{logModalTitle}</span>
              </h4>
              <button
                onClick={() => setLogModalOpen(false)}
                className={`p-1 rounded-lg text-slate-400 hover:text-rose-500 transition ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className={`p-4 flex-grow overflow-auto font-mono text-xs select-text leading-relaxed whitespace-pre-wrap break-all max-h-[60vh] ${isLightMode ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-300'}`}>
              {logLoading ? (
                <div className={`flex items-center justify-center py-8 gap-2 ${themeTextMuted}`}>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Đang tải nhật ký từ máy chủ...</span>
                </div>
              ) : (
                <pre>{logModalContent}</pre>
              )}
            </div>
            <div className={`p-3 border-t flex justify-end space-x-2 text-xs ${themeCardInner}`}>
              <button
                onClick={handleCopyLogContent}
                className={`px-4 py-2 rounded-xl font-semibold transition flex items-center space-x-1.5 border ${themeBtnSecondary}`}
              >
                <Copy size={13} />
                <span>{copiedLog ? 'Đã sao chép!' : 'Sao chép nhật ký'}</span>
              </button>
              <button
                onClick={() => setLogModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED RENDER & COLOR PROFILE MODAL */}
      <RenderProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        activeProfile={activeProfile}
        onSelectProfile={(p) => {
          setActiveProfile(p);
          handleSaveAdvancedSettings(p.renderSettings);
          setColorSettings(p.colorSettings);
        }}
        onSaveProfile={(p) => {
          setActiveProfile(p);
          handleSaveAdvancedSettings(p.renderSettings);
          setColorSettings(p.colorSettings);
          setProfilesList(getProfiles());
        }}
        isLightMode={isLightMode}
        sampleCanvas={offlineCanvasRef.current || studioCanvasRef.current}
        onApplyToAllPages={(p) => {
          setActiveProfile(p);
          handleSaveAdvancedSettings(p.renderSettings);
          setColorSettings(p.colorSettings);
          setProfilesList(getProfiles());
          if (offlinePdfDoc) {
            renderOfflineCurrentPage();
          }
        }}
      />

      {/* ADVANCED RENDER SETTINGS MODAL */}
      <RenderSettingsModal
        isOpen={renderSettingsModalOpen}
        onClose={() => setRenderSettingsModalOpen(false)}
        settings={advancedSettings}
        onSave={handleSaveAdvancedSettings}
        isLightMode={isLightMode}
      />

      {/* AI COLOR INSPECTION MODAL */}
      <AIColorInspectionModal
        isOpen={aiInspectionModalOpen}
        onClose={() => setAiInspectionModalOpen(false)}
        report={aiInspectionReport}
        isAnalyzing={isAIAnalyzing}
        onApplyRecommendations={handleApplyAIRecommendations}
        activeHeatmapMode={activeHeatmapMode}
        onToggleHeatmap={(mode) => setActiveHeatmapMode(mode)}
        onRecheck={handleRunAIColorCheck}
        isLightMode={isLightMode}
        studioCanvas={studioCanvasRef.current}
        currentSettings={colorSettings}
      />

      {/* Modern Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: isLightMode ? '#ffffff' : '#1e293b',
            color: isLightMode ? '#0f172a' : '#f8fafc',
            border: isLightMode ? '1px solid #e2e8f0' : '1px solid #334155',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '13px',
            borderRadius: '10px',
            zIndex: 99999
          }
        }}
      />
    </div>
  );
};

export default RenderPdfPage;
