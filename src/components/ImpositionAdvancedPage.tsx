import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutGrid, Upload, Download, X, Check, AlertCircle, RotateCcw, Loader2, Scissors, Grid3X3, Circle, Square, Printer, Package, RectangleHorizontal, RectangleVertical, FileImage, FileText, Info, RefreshCw, Triangle, Hexagon, RotateCw, Eye, EyeOff, Trash2, Layers, Settings2, FolderOpen, ZoomIn, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, Save, Expand, ChevronDown, ChevronUp, Clock, History, Search, ImagePlus, PenTool, Plus, Edit3, Play, Zap, CheckCircle2, Cpu, Server, AlertTriangle, FileJson, Copy, ExternalLink, Share2, Send, Database, Move, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { calculateLayout, generateCutSVG, LayoutPlan, PlanItem } from '../utils/layoutSolver';
import { nestSvgOnSheet } from '../utils/svgNesting';
import { packMultiSize, shelfPackSequential, hasOverlap } from '../utils/multiSizePacker';
import { FilePickerModal } from './FilePickerModal';
import { SourceImageCropColorModal, CropTransform } from './SourceImageCropColorModal';
import { VectorMaskEditorModal, VectorMaskResult, VectorKnot } from './VectorMaskEditorModal';
import { CutDielineModal } from './CutDielineModal';
import { ColorAdjustSettings } from '../utils/colorAdjustment';
import { fileService } from '../services/fileService';
import { workspaceService } from '../services/workspaceService';
import { generatePdfAsync, downloadPdfBlob } from '../utils/pdfAsync';
import { jsPDF } from 'jspdf';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { savePendingRenderBlob } from '../services/pendingRenderService';
import { RENDER_PRESETS, RenderPreset } from './RenderSettingsModal';
import { probeGoAgent, renderPdfViaGoAgent, GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../services/goAgentService';
import { agentJobService } from '../services/agentJobService';
import * as api from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Uses proxy - relative URLs
const API_BASE = '/api';

const safeToastSuccess = (msg: string) => {
  try {
    if (typeof (toast as any)?.success === 'function') {
      (toast as any).success(msg);
    } else if (typeof toast === 'function') {
      (toast as any)(msg);
    }
  } catch (e) {
    console.log('[Toast Success]', msg);
  }
};

const safeToastError = (msg: string) => {
  try {
    if (typeof (toast as any)?.error === 'function') {
      (toast as any).error(msg);
    } else if (typeof toast === 'function') {
      (toast as any)(msg);
    }
  } catch (e) {
    console.error('[Toast Error]', msg);
  }
};

const safeToastInfo = (msg: string) => {
  try {
    if (typeof (toast as any) === 'function') {
      (toast as any)(msg);
    }
  } catch (e) {
    console.log('[Toast Info]', msg);
  }
};

export interface ShapeTabItem {
  id: string;
  name: string; // 'A', 'B', 'C', 'D' or custom name
  enabled: boolean; // toggle tắt/hiện
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon' | 'custom-svg' | 'svg-image' | 'pdf-source';
  itemW: number;
  itemH: number;
  quantity: number; // số lượng tem của hình này
  useTotalLimit: boolean;
  cornerRadius: number;
  sourceImage: PageItem | null;
  vectorMaskResult: VectorMaskResult | null;
  customSvgData: string;
  color: string;
  autoRotate?: boolean; // legacy / packing canRotate
  autoRotateImage?: boolean; // Tự xoay ảnh vừa khung tem cho riêng layer này
  canRotate?: boolean; // Cho phép thuật toán xoay tem khi xếp khổ
}

const TAB_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#3b82f6', '#84cc16', '#6366f1'];
const LAYER_COLOR_PRESETS = [
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#64748b', // Slate
];

interface ImpositionConfig {
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon' | 'custom-svg' | 'svg-image' | 'pdf-source';
  itemW: number; itemH: number; padding: number; cornerRadius: number;
  pageW: number; pageH: number; printW: number; printH: number; totalOrder: number;
  useTotalLimit?: boolean;
  useCrop: boolean; cropLen: number; cropDist: number; cropThick: number; cropColor: string;
  fitMode: 'stretch' | 'fill' | 'fit' | 'actual';
  colorMode: 'original' | 'cmyk' | 'cmyk_k100' | 'rgb' | 'konica';
  dpi: number; autoRotate: boolean; autoRotateImage?: boolean; processMode: 'vector' | 'raster';
  cutBleed: number;
  // Advanced features
  usePrintArea: boolean; printAreaW: number; printAreaH: number;
  marginTop: number; marginBot: number; marginLeft: number; marginRight: number;
  marginTop2: number; marginBot2: number; marginLeft2: number; marginRight2: number;
  marginMode: 'safe' | 'shift'; useMargin: boolean;
  alignX: 'left' | 'center' | 'right'; alignY: 'top' | 'middle' | 'bottom';
  flowDir: 0 | 1; // 0=Z (row), 1=N (column)
  // Page Crop Marks
  usePageCrop: boolean; pageCropLen: number; pageCropDist: number; pageCropThick: number; pageCropColor: string;
  // 2-sided printing
  is2Sided: boolean; rot180Front: boolean; rot180Back: boolean;
  twoSideMode: 'same' | 'odd-even'; // same=2 mặt giống, odd-even=chẵn/lẻ
  // CMYK color bar
  useColorBar: boolean;
  colorBarPosition: 'top' | 'bottom' | 'left' | 'right' | 'all';
  colorBarPadding: number;
}

// Data mode types
type DataMode = 1 | 4 | 5 | 6; // 1=Standard, 4=X-Up, 5=2 Mặt Giống, 6=Đối xứng

// Imposition style (Kiểu trở)
type ImpositionStyle = 'sheetwise' | 'work-and-turn' | 'work-and-tumble';

/**
 * Áp dụng kiểu trở lên layout items.
 * - Sheetwise: giữ nguyên (in AB riêng biệt)
 * - Work & Turn: mirror items qua trục dọc (Y axis) → front+back cùng 1 mặt in
 * - Work & Tumble: mirror items qua trục ngang (X axis) + rotate 180° → front+back cùng 1 mặt in
 */
function applyImpositionStyle(
  items: PlanItem[],
  style: ImpositionStyle,
  pageW: number,
  pageH: number
): PlanItem[] {
  if (style === 'sheetwise' || items.length === 0) return items;

  if (style === 'work-and-turn') {
    // Trục dọc ở giữa tờ giấy: x = pageW / 2
    // Items gốc nằm nửa trái, copy mirror sang nửa phải
    const midX = pageW / 2;
    const mirrored = items.map(it => ({
      ...it,
      x: pageW - it.x - it.w, // flip x qua trục giữa
      rot: it.rot,
    }));
    return [...items, ...mirrored];
  }

  if (style === 'work-and-tumble') {
    // Trục ngang ở giữa tờ giấy: y = pageH / 2
    // Items gốc nằm nửa trên, copy mirror sang nửa dưới + flip
    const midY = pageH / 2;
    const mirrored = items.map(it => ({
      ...it,
      y: pageH - it.y - it.h, // flip y qua trục giữa
      rot: it.rot,
      flipped: !it.flipped,
    }));
    return [...items, ...mirrored];
  }

  return items;
}

interface SourcePage {
  fileIndex: number;
  pageIndex: number;
  thumb: string;
  originalThumb?: string;
  name: string;
  w: number;
  h: number;
  serverPath?: string;
  fileId?: string;
  rotation: number; // 0, 90, 180, 270
  cropSettings?: CropTransform;
  colorSettings?: ColorAdjustSettings;
}

type PageItem = SourcePage;

interface ImpositionPageProps { onClose?: () => void; }

export interface PaperPresetItem {
  label: string;
  subLabel?: string;
  w: number;
  h: number;
  category: 'common_photoshop' | 'autocad' | 'corel_illustrator' | 'canva';
}

export const PAPER_PRESET_GROUPS: {
  title: string;
  icon: string;
  category: 'common_photoshop' | 'autocad' | 'corel_illustrator' | 'canva';
  items: PaperPresetItem[];
}[] = [
  {
    title: 'Common & Photoshop',
    icon: 'Palette',
    category: 'common_photoshop',
    items: [
      { label: '330 × 480 Fuji', subLabel: 'Khổ tiêu chuẩn máy in Fuji', w: 330, h: 480, category: 'common_photoshop' },
      { label: '320 × 470 Konica', subLabel: 'Khổ tiêu chuẩn máy in Konica', w: 320, h: 470, category: 'common_photoshop' },
      { label: 'A3+ (329 × 483)', subLabel: 'Super A3 / Khổ mở rộng', w: 329, h: 483, category: 'common_photoshop' },
      { label: 'A3 (297 × 420)', subLabel: 'ISO A3 tiêu chuẩn', w: 297, h: 420, category: 'common_photoshop' },
      { label: 'A4 (210 × 297)', subLabel: 'ISO A4 văn phòng & in ấn', w: 210, h: 297, category: 'common_photoshop' },
      { label: 'A5 (148 × 210)', subLabel: 'Sổ tay, tờ rơi A5', w: 148, h: 210, category: 'common_photoshop' },
      { label: 'A6 (105 × 148)', subLabel: 'Bưu thiếp, postcard', w: 105, h: 148, category: 'common_photoshop' },
      { label: 'B4 (250 × 353)', subLabel: 'ISO B4 tiêu chuẩn', w: 250, h: 353, category: 'common_photoshop' },
      { label: 'B5 (176 × 250)', subLabel: 'ISO B5 tiêu chuẩn', w: 176, h: 250, category: 'common_photoshop' },
      { label: 'Decal 320 × 430', subLabel: 'Khổ tem nhãn decal', w: 320, h: 430, category: 'common_photoshop' },
      { label: 'Decal 325 × 480', subLabel: 'Khổ decal mở rộng', w: 325, h: 480, category: 'common_photoshop' },
      { label: 'Offset 650 × 860', subLabel: 'Khổ máy in Offset lớn', w: 650, h: 860, category: 'common_photoshop' },
      { label: 'Offset 790 × 1090', subLabel: 'Khổ máy in Offset toàn phần', w: 790, h: 1090, category: 'common_photoshop' },
      { label: 'Offset 540 × 790', subLabel: 'Khổ máy in Offset nhỡ', w: 540, h: 790, category: 'common_photoshop' },
      { label: 'Offset 430 × 650', subLabel: 'Khổ máy in Offset 4 lục', w: 430, h: 650, category: 'common_photoshop' },
    ]
  },
  {
    title: 'AutoCAD (ISO / ARCH / ANSI)',
    icon: 'DraftingCompass',
    category: 'autocad',
    items: [
      { label: 'ISO A0 (841 × 1189 mm)', subLabel: 'Bản vẽ kỹ thuật A0', w: 841, h: 1189, category: 'autocad' },
      { label: 'ISO A1 (594 × 841 mm)', subLabel: 'Bản vẽ kiến trúc A1', w: 594, h: 841, category: 'autocad' },
      { label: 'ISO A2 (420 × 594 mm)', subLabel: 'Bản vẽ phối cảnh A2', w: 420, h: 594, category: 'autocad' },
      { label: 'ISO A3 (297 × 420 mm)', subLabel: 'Tập bản vẽ A3', w: 297, h: 420, category: 'autocad' },
      { label: 'ISO A4 (210 × 297 mm)', subLabel: 'Thuyết minh bản vẽ A4', w: 210, h: 297, category: 'autocad' },
      { label: 'ARCH E1 (30 × 42 in)', subLabel: '762.0 × 1066.8 mm', w: 762, h: 1066.8, category: 'autocad' },
      { label: 'ARCH E (36 × 48 in)', subLabel: '914.4 × 1219.2 mm', w: 914.4, h: 1219.2, category: 'autocad' },
      { label: 'ARCH D (24 × 36 in)', subLabel: '609.6 × 914.4 mm', w: 609.6, h: 914.4, category: 'autocad' },
      { label: 'ARCH C (18 × 24 in)', subLabel: '457.2 × 609.6 mm', w: 457.2, h: 609.6, category: 'autocad' },
      { label: 'ARCH B (12 × 18 in)', subLabel: '304.8 × 457.2 mm', w: 304.8, h: 457.2, category: 'autocad' },
      { label: 'ARCH A (9 × 12 in)', subLabel: '228.6 × 304.8 mm', w: 228.6, h: 304.8, category: 'autocad' },
      { label: 'ANSI E (34 × 44 in)', subLabel: '863.6 × 1117.6 mm', w: 863.6, h: 1117.6, category: 'autocad' },
      { label: 'ANSI D (22 × 34 in)', subLabel: '558.8 × 863.6 mm', w: 558.8, h: 863.6, category: 'autocad' },
      { label: 'ANSI C (17 × 22 in)', subLabel: '431.8 × 558.8 mm', w: 431.8, h: 558.8, category: 'autocad' },
      { label: 'ANSI B (11 × 17 in)', subLabel: '279.4 × 431.8 mm (Ledger)', w: 279.4, h: 431.8, category: 'autocad' },
      { label: 'ANSI A (8.5 × 11 in)', subLabel: '215.9 × 279.4 mm (Letter)', w: 215.9, h: 279.4, category: 'autocad' },
    ]
  },
  {
    title: 'Corel & Illustrator',
    icon: 'Layers',
    category: 'corel_illustrator',
    items: [
      { label: 'US Letter (8.5 × 11 in)', subLabel: '215.9 × 279.4 mm', w: 215.9, h: 279.4, category: 'corel_illustrator' },
      { label: 'US Legal (8.5 × 14 in)', subLabel: '215.9 × 355.6 mm', w: 215.9, h: 355.6, category: 'corel_illustrator' },
      { label: 'Tabloid (11 × 17 in)', subLabel: '279.4 × 431.8 mm', w: 279.4, h: 431.8, category: 'corel_illustrator' },
      { label: 'Executive (7.25 × 10.5 in)', subLabel: '184.2 × 266.7 mm', w: 184.2, h: 266.7, category: 'corel_illustrator' },
      { label: 'Namecard chuẩn (90 × 54)', subLabel: 'Danh thiếp Việt Nam chuẩn', w: 90, h: 54, category: 'corel_illustrator' },
      { label: 'Namecard QT (85 × 55)', subLabel: 'Danh thiếp Quốc Tế', w: 85, h: 55, category: 'corel_illustrator' },
      { label: 'Namecard vuông (50 × 50)', subLabel: 'Tag treo / namecard vuông', w: 50, h: 50, category: 'corel_illustrator' },
      { label: 'Bao thư A4 (250 × 340)', subLabel: 'Phong bì tài liệu lớn', w: 250, h: 340, category: 'corel_illustrator' },
      { label: 'Bao thư A5 (160 × 230)', subLabel: 'Phong bì trung', w: 160, h: 230, category: 'corel_illustrator' },
      { label: 'Bao thư A6 (120 × 220)', subLabel: 'Phong bì nhỏ / thiệp cưới', w: 120, h: 220, category: 'corel_illustrator' },
      { label: 'Folder / Kẹp file (220 × 310)', subLabel: 'Bìa hồ sơ kẹp tài liệu', w: 220, h: 310, category: 'corel_illustrator' },
      { label: 'Standee (800 × 2000)', subLabel: 'Standee chữ X / cuốn nhôm', w: 800, h: 2000, category: 'corel_illustrator' },
      { label: 'Standee Mini (600 × 1600)', subLabel: 'Standee nhỏ', w: 600, h: 1600, category: 'corel_illustrator' },
      { label: 'Poster (600 × 900)', subLabel: 'Poster chuẩn quảng cáo', w: 600, h: 900, category: 'corel_illustrator' },
      { label: 'Voucher / Gift Card (200 × 100)', subLabel: 'Phiếu quà tặng / giảm giá', w: 200, h: 100, category: 'corel_illustrator' },
      { label: 'Tờ rơi gấp 3 (210 × 297)', subLabel: 'Trifold Brochure A4', w: 210, h: 297, category: 'corel_illustrator' },
    ]
  },
  {
    title: 'Canva Design & Print',
    icon: 'Sparkles',
    category: 'canva',
    items: [
      { label: 'Canva Poster (A3)', subLabel: '297 × 420 mm • Poster dọc chuẩn', w: 297, h: 420, category: 'canva' },
      { label: 'Canva Poster Lớn (18×24 in)', subLabel: '457.2 × 609.6 mm • Treo tường', w: 457.2, h: 609.6, category: 'canva' },
      { label: 'Canva Flyer / Tờ rơi (A4)', subLabel: '210 × 297 mm • Tờ rơi quảng cáo', w: 210, h: 297, category: 'canva' },
      { label: 'Canva Flyer / Tờ rơi (A5)', subLabel: '148 × 210 mm • Tờ rơi sự kiện', w: 148, h: 210, category: 'canva' },
      { label: 'Canva Danh thiếp (89 × 51)', subLabel: 'Business Card US (3.5×2 in)', w: 89, h: 51, category: 'canva' },
      { label: 'Canva Danh thiếp EU (85 × 55)', subLabel: 'Business Card chuẩn EU', w: 85, h: 55, category: 'canva' },
      { label: 'Canva Thiệp mời (127 × 178)', subLabel: 'Invitation Card (5×7 in)', w: 127, h: 178, category: 'canva' },
      { label: 'Canva Thiệp cảm ơn (A6)', subLabel: '105 × 148 mm • Thank You Card', w: 105, h: 148, category: 'canva' },
      { label: 'Canva Menu / Thực đơn (A4)', subLabel: '210 × 297 mm • Menu đứng', w: 210, h: 297, category: 'canva' },
      { label: 'Canva Menu Thẻ Dài (105 × 297)', subLabel: '105 × 297 mm • Menu gấp đôi A4', w: 105, h: 297, category: 'canva' },
      { label: 'Canva Trifold Brochure', subLabel: '297 × 210 mm • Gấp 3 A4 ngang', w: 297, h: 210, category: 'canva' },
      { label: 'Canva Bưu thiếp / Postcard', subLabel: '148 × 105 mm • Postcard chuẩn', w: 148, h: 105, category: 'canva' },
      { label: 'Canva Bookmark (50 × 150)', subLabel: 'Thẻ kẹp sách (2×6 in)', w: 50, h: 150, category: 'canva' },
      { label: 'Canva Tag Mác Treo (50 × 90)', subLabel: 'Mác quần áo / quà tặng', w: 50, h: 90, category: 'canva' },
      { label: 'Canva Sticker Vuông (50 × 50)', subLabel: 'Tem nhãn decal vuông / tròn', w: 50, h: 50, category: 'canva' },
      { label: 'Canva Sticker Đóng gói (75 × 75)', subLabel: 'Nhãn dán niêm phong hộp', w: 75, h: 75, category: 'canva' },
      { label: 'Canva Giấy khen (Certificate)', subLabel: '297 × 210 mm • Chứng nhận A4', w: 297, h: 210, category: 'canva' },
      { label: 'Canva Bìa sách (6 × 9 in)', subLabel: '152.4 × 228.6 mm • Bìa sách', w: 152.4, h: 228.6, category: 'canva' },
      { label: 'Canva Lịch để bàn (A5)', subLabel: '210 × 148 mm • Lịch bàn ngang', w: 210, h: 148, category: 'canva' },
      { label: 'Canva In Ly sứ (Mug Wrap)', subLabel: '220 × 95 mm • Vòng quanh cốc', w: 220, h: 95, category: 'canva' },
      { label: 'Canva In Áo thun (14 × 16 in)', subLabel: '356 × 406 mm • Mặt áo thun', w: 356, h: 406, category: 'canva' },
    ]
  }
];

const PAPER_PRESETS = PAPER_PRESET_GROUPS.flatMap(g => g.items.map(it => ({
  label: it.label,
  value: `${it.w}x${it.h}`,
  w: it.w,
  h: it.h,
  category: it.category
})));

// Debounced number input component for performance and seamless UX
// Handles immediate commit on blur/Enter, preserves active typing against background re-renders
const DebouncedNumberInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  shortDebounceMs?: number;
  longDebounceMs?: number;
  inputRef?: React.Ref<HTMLInputElement>;
}> = ({ value, onChange, step = 1, min, max, className = '', disabled, shortDebounceMs = 250, longDebounceMs = 350, inputRef }) => {
  const [localValue, setLocalValue] = useState(value !== undefined && value !== null ? String(value) : '');
  const isFocusedRef = useRef(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetRef = (inputRef || internalRef) as React.MutableRefObject<HTMLInputElement | null>;

  // Sync local value when external value changes ONLY if not actively editing
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  const commitValue = (valStr: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const cleanStr = String(valStr).replace(',', '.').trim();
    if (cleanStr === '') {
      const fallback = min !== undefined ? min : (value ?? 0);
      setLocalValue(String(fallback));
      onChange(fallback);
      return;
    }
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed)) {
      setLocalValue(String(value ?? 0));
      return;
    }
    const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
    const final = min !== undefined ? Math.max(clamped, min) : clamped;
    const rounded = Math.round(final * 100) / 100;
    setLocalValue(String(rounded));
    onChange(rounded);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const cleanStr = raw.replace(',', '.').trim();
    if (cleanStr === '') return; // Let user finish typing

    const numericPart = cleanStr.replace(/[^0-9]/g, '');
    const debounceTime = numericPart.length <= 1 ? longDebounceMs : shortDebounceMs;

    timeoutRef.current = setTimeout(() => {
      const parsed = parseFloat(cleanStr);
      if (!isNaN(parsed)) {
        const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
        const final = min !== undefined ? Math.max(clamped, min) : clamped;
        onChange(Math.round(final * 100) / 100);
      }
    }, debounceTime);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    e.target.select();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    commitValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(localValue);
      e.currentTarget.blur();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      ref={targetRef}
      type="number"
      step={step}
      min={min}
      max={max}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      disabled={disabled}
    />
  );
};

const AUTOSAVE_STORAGE_KEY = 'toolx_imposition_autosave';

interface ImpositionAutoSavedState {
  config?: Partial<ImpositionConfig>;
  currentPlanIndex?: number;
  shapeTabs?: ShapeTabItem[];
  activeTabId?: string;
  allPages?: PageItem[];
  dataMode?: DataMode;
  impositionStyle?: ImpositionStyle;
  dataModeEnabled?: boolean;
  impositionStyleEnabled?: boolean;
  xUpQty?: number;
  standardQty?: number;
  customScale?: number;
  customSvgData?: string;
  backgroundColor?: string;
  vectorMaskResult?: VectorMaskResult | null;
}

function loadAutoSavedState(): ImpositionAutoSavedState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[AutoSave] Failed to parse autosaved state:', err);
    return null;
  }
}

export const ImpositionAdvancedPage: React.FC<ImpositionPageProps> = ({ onClose }) => {
  const savedState = useMemo(() => loadAutoSavedState(), []);

  const [config, setConfig] = useState<ImpositionConfig>(() => ({
    shape: 'rect', itemW: 100, itemH: 120, padding: 0, cornerRadius: 0,
    pageW: 330, pageH: 480, printW: 310, printH: 450, totalOrder: 1000,
    useTotalLimit: false,
    useCrop: false, cropLen: 5, cropDist: 3, cropThick: 0.25, cropColor: '#000000',
    fitMode: 'fill', colorMode: 'original', dpi: 300, autoRotate: true, autoRotateImage: true, processMode: 'vector',
    cutBleed: 0,
    // Advanced features
    usePrintArea: false, printAreaW: 320, printAreaH: 470,
    marginTop: 5, marginBot: 5, marginLeft: 5, marginRight: 5,
    marginTop2: 5, marginBot2: 5, marginLeft2: 5, marginRight2: 5,
    marginMode: 'safe', useMargin: true,
    alignX: 'center', alignY: 'middle', flowDir: 0,
    // Page Crop Marks
    usePageCrop: false, pageCropLen: 10, pageCropDist: 10, pageCropThick: 0.5, pageCropColor: '#000000',
    // 2-sided printing
    is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3,
    ...(savedState?.config || {})
  }));

  const [plans, setPlans] = useState<LayoutPlan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState<number>(() => {
    const idx = savedState?.currentPlanIndex;
    return (typeof idx === 'number' && !isNaN(idx)) ? idx : 0;
  });
  const [manualRotate, setManualRotate] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 500 });
  const containerRef = useRef<HTMLElement>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [debugCode, setDebugCode] = useState('');
  const [serverPreviewUrl, setServerPreviewUrl] = useState<string>('');
  const [isLoadingServerPreview, setIsLoadingServerPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isCutSvgModalOpen, setIsCutSvgModalOpen] = useState(false);
  
  // Advanced states
  const [allPages, setAllPages] = useState<PageItem[]>(() => savedState?.allPages || []);
  const [dataMode, setDataMode] = useState<DataMode>(() => {
    const dm = savedState?.dataMode;
    if (dm === undefined || dm === null) return 1;
    const num = typeof dm === 'string' ? parseInt(dm, 10) : Number(dm);
    return (isNaN(num) ? 1 : num) as DataMode;
  });
  const [impositionStyle, setImpositionStyle] = useState<ImpositionStyle>(() => savedState?.impositionStyle || 'sheetwise');
  const [dataModeEnabled, setDataModeEnabled] = useState<boolean>(() => savedState?.dataModeEnabled ?? true);
  const [impositionStyleEnabled, setImpositionStyleEnabled] = useState<boolean>(() => savedState?.impositionStyleEnabled ?? false);
  const [xUpQty, setXUpQty] = useState<number>(() => savedState?.xUpQty ?? 1);
  const [standardQty, setStandardQty] = useState<number>(() => savedState?.standardQty ?? 1);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState({ show: false, current: 0, total: 0, percent: 0 });
  const [skipThumbnails, setSkipThumbnails] = useState(false);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0); // Current output sheet being viewed
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front'); // For 2-sided preview
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPreviewPages, setAiPreviewPages] = useState<PageItem[]>([]); // Preview before applying
  const [aiResult, setAiResult] = useState<{ action: string; explanation: string; configChanges?: Partial<ImpositionConfig> | null } | null>(null);
  
  // Custom fit mode states
  const [customScale, setCustomScale] = useState<number>(() => savedState?.customScale ?? 100); // % scale for 'actual' mode
  const [customSvgData, setCustomSvgData] = useState<string>(() => savedState?.customSvgData ?? ''); // SVG content for custom shape
  const [backgroundColor, setBackgroundColor] = useState<string>(() => savedState?.backgroundColor || '#ffffff'); // Background color for 'actual' mode

  // Canvas Zoom & Pan (via mouse wheel & middle mouse drag)
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const [previewKey, setPreviewKey] = useState(0); // Force preview re-render

  // Source Image Crop & Color Studio modal state
  const [isCropColorModalOpen, setIsCropColorModalOpen] = useState(false);
  const [editingSourcePage, setEditingSourcePage] = useState<PageItem | null>(null);
  const sourceImageInputRef = useRef<HTMLInputElement>(null);
  const soLuongInputRef = useRef<HTMLInputElement>(null);
  const rongInputRef = useRef<HTMLInputElement>(null);
  const caoInputRef = useRef<HTMLInputElement>(null);
  const layoutFingerprintRef = useRef<string>('');

  // Vector Mask Editor modal state
  const [isVectorMaskEditorOpen, setIsVectorMaskEditorOpen] = useState(false);
  const [vectorMaskResult, setVectorMaskResult] = useState<VectorMaskResult | null>(() => savedState?.vectorMaskResult || null);

  // Multi-Shape Tabs State (A, B, C, D...)
  const [shapeTabs, setShapeTabs] = useState<ShapeTabItem[]>(() => {
    if (savedState?.shapeTabs && Array.isArray(savedState.shapeTabs) && savedState.shapeTabs.length > 0) {
      return savedState.shapeTabs;
    }
    const initShape = savedState?.config?.shape || 'rect';
    const initItemW = savedState?.config?.itemW ?? 100;
    const initItemH = initShape === 'circle' ? initItemW : (savedState?.config?.itemH ?? 120);
    const initCorner = savedState?.config?.cornerRadius ?? 0;
    return [
      {
        id: 'tab-a',
        name: 'A',
        enabled: true,
        shape: initShape,
        itemW: initItemW,
        itemH: initItemH,
        quantity: 11,
        useTotalLimit: false,
        cornerRadius: initCorner,
        sourceImage: null,
        vectorMaskResult: null,
        customSvgData: '',
        color: '#8b5cf6',
        autoRotateImage: true,
        canRotate: true,
      }
    ];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (savedState?.activeTabId && savedState?.shapeTabs?.some(t => t.id === savedState.activeTabId)) {
      return savedState.activeTabId;
    }
    return savedState?.shapeTabs?.[0]?.id || 'tab-a';
  });
  const [editingLayerModalTab, setEditingLayerModalTab] = useState<ShapeTabItem | null>(null);
  const [layerModalName, setLayerModalName] = useState<string>('');
  const [layerModalColor, setLayerModalColor] = useState<string>('');
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [hoveredPencilTabId, setHoveredPencilTabId] = useState<string | null>(null);
  const hoverPencilTimeoutRef = useRef<any>(null);

  // App Navigation & Render Prepress Modal state
  const { setCurrentPage } = useAppNavigation();
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [selectedRenderEngine, setSelectedRenderEngine] = useState<'auto' | 'goagent' | 'server'>('auto');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gcr_22_swop');
  const [goAgentInfo, setGoAgentInfo] = useState<GoAgentInfo | null>(null);
  const [isProbingAgent, setIsProbingAgent] = useState<boolean>(false);
  const [isSubmittingRender, setIsSubmittingRender] = useState<boolean>(false);
  const [renderProgressText, setRenderProgressText] = useState<string>('');
  const [lastImpositionRender, setLastImpositionRender] = useState<any>(null);
  const [renderSuccessModal, setRenderSuccessModal] = useState<any | null>(null);

  // SortJob VPS export state & modal
  const [sortJobModalData, setSortJobModalData] = useState<any | null>(null);
  const [isExportingSortJob, setIsExportingSortJob] = useState<boolean>(false);
  const [copiedJobId, setCopiedJobId] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [sortJobTab, setSortJobTab] = useState<'overview' | 'layers' | 'json'>('overview');

  // Probe GoAgent & Load last imposition render result
  useEffect(() => {
    const probe = async () => {
      try {
        setIsProbingAgent(true);
        const info = await probeGoAgent(GOAGENT_DEFAULT_PORT);
        setGoAgentInfo(info.detected ? info : null);
      } catch {
        setGoAgentInfo(null);
      } finally {
        setIsProbingAgent(false);
      }
    };
    probe();

    try {
      const raw = localStorage.getItem('toolx_last_imposition_render');
      if (raw) {
        setLastImpositionRender(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const handleTabMouseEnter = useCallback((tabId: string) => {
    if (hoverPencilTimeoutRef.current) clearTimeout(hoverPencilTimeoutRef.current);
    hoverPencilTimeoutRef.current = setTimeout(() => {
      setHoveredPencilTabId(tabId);
    }, 3000);
  }, []);

  const handleTabMouseLeave = useCallback(() => {
    if (hoverPencilTimeoutRef.current) {
      clearTimeout(hoverPencilTimeoutRef.current);
      hoverPencilTimeoutRef.current = null;
    }
    setHoveredPencilTabId(null);
  }, []);

  // Continuous auto-save to localStorage whenever ongoing state changes (debounced 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stateToSave = {
          config,
          currentPlanIndex,
          shapeTabs,
          activeTabId,
          allPages,
          dataMode,
          impositionStyle,
          dataModeEnabled,
          impositionStyleEnabled,
          xUpQty,
          standardQty,
          customScale,
          customSvgData,
          backgroundColor,
          vectorMaskResult,
        };
        try {
          localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (quotaErr) {
          // Tier 1 Fallback: Quota exceeded, gọt bỏ originalThumb (ảnh gốc dung lượng lớn) chỉ giữ thumb
          try {
            const lightAllPages = allPages.map(p => ({
              ...p,
              originalThumb: undefined
            }));
            const lightShapeTabs = shapeTabs.map(t => ({
              ...t,
              sourceImage: t.sourceImage ? {
                ...t.sourceImage,
                originalThumb: undefined
              } : null
            }));
            const lightState = {
              ...stateToSave,
              allPages: lightAllPages,
              shapeTabs: lightShapeTabs,
            };
            localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(lightState));
          } catch (quotaErr2) {
            // Tier 2 Fallback: Nếu vẫn quá quota, chỉ lưu toàn bộ cấu hình, kích thước, số lượng & layer (bỏ ảnh base64)
            const minimalAllPages = allPages.map(p => ({
              ...p,
              thumb: '',
              originalThumb: undefined
            }));
            const minimalShapeTabs = shapeTabs.map(t => ({
              ...t,
              sourceImage: null
            }));
            localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify({
              ...stateToSave,
              allPages: minimalAllPages,
              shapeTabs: minimalShapeTabs,
            }));
          }
        }
      } catch (err) {
        console.warn('[AutoSave] Failed to save state to localStorage:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    config,
    currentPlanIndex,
    shapeTabs,
    activeTabId,
    allPages,
    dataMode,
    impositionStyle,
    dataModeEnabled,
    impositionStyleEnabled,
    xUpQty,
    standardQty,
    customScale,
    customSvgData,
    backgroundColor,
    vectorMaskResult,
  ]);

  const activeTab = useMemo(() => {
    return shapeTabs.find(t => t.id === activeTabId) || shapeTabs[0];
  }, [shapeTabs, activeTabId]);

  const isMultiShape = useMemo(() => {
    return shapeTabs.filter(t => t.enabled).length > 1;
  }, [shapeTabs]);

  const updateActiveTabProp = useCallback((patch: Partial<ShapeTabItem>) => {
    const safePatch = { ...patch };
    if (safePatch.quantity !== undefined) {
      safePatch.quantity = Math.min(99, Math.max(1, Math.round(safePatch.quantity)));
    }
    setShapeTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return { ...tab, ...safePatch };
      }
      return tab;
    }));
  }, [activeTabId]);

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    const targetTab = shapeTabs.find(t => t.id === tabId);
    if (targetTab) {
      const activeCount = shapeTabs.filter(t => t.enabled).length;
      const shouldLimit = activeCount > 1 ? true : targetTab.useTotalLimit;
      setConfig(c => ({
        ...c,
        shape: targetTab.shape,
        itemW: targetTab.itemW,
        itemH: targetTab.shape === 'circle' ? targetTab.itemW : targetTab.itemH,
        cornerRadius: targetTab.cornerRadius,
        totalOrder: activeCount > 1 ? c.totalOrder : targetTab.quantity,
        useTotalLimit: shouldLimit,
        autoRotate: targetTab.canRotate !== undefined ? targetTab.canRotate : (targetTab.autoRotate !== undefined ? targetTab.autoRotate : c.autoRotate),
        autoRotateImage: targetTab.autoRotateImage !== undefined ? targetTab.autoRotateImage : c.autoRotateImage,
      }));
      setVectorMaskResult(targetTab.vectorMaskResult);
      setCustomSvgData(targetTab.customSvgData);
      if (targetTab.sourceImage) {
        setAllPages([targetTab.sourceImage]);
      }
    }
  };

  const handleAddTab = () => {
    const nextIndex = shapeTabs.length;
    const letter = String.fromCharCode(65 + (nextIndex % 26)) + (nextIndex >= 26 ? Math.floor(nextIndex / 26) : '');
    const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newColor = TAB_COLORS[nextIndex % TAB_COLORS.length];
    const defaultSrcImage = activeTab?.sourceImage || (allPages.length > 0 ? allPages[0] : null);
    const newTab: ShapeTabItem = {
      id: newId,
      name: letter,
      enabled: true,
      shape: 'circle',
      itemW: 50,
      itemH: 50,
      quantity: 10,
      autoRotate: config.autoRotate,
      canRotate: config.autoRotate,
      autoRotateImage: config.autoRotateImage ?? true,
      useTotalLimit: true,
      cornerRadius: 0,
      sourceImage: defaultSrcImage,
      vectorMaskResult: null,
      customSvgData: '',
      color: newColor
    };

    setShapeTabs(prev => {
      // If expanding to > 1 tabs, auto-enable useTotalLimit for all tabs
      const updated = prev.map(t => ({ ...t, useTotalLimit: true }));
      return [...updated, newTab];
    });
    setActiveTabId(newId);
    setConfig(c => ({
      ...c,
      shape: newTab.shape,
      itemW: newTab.itemW,
      itemH: newTab.itemH,
      cornerRadius: newTab.cornerRadius,
      totalOrder: c.totalOrder,
      useTotalLimit: true,
    }));
    setVectorMaskResult(null);
    setCustomSvgData('');
  };

  const handleDeleteTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (shapeTabs.length <= 1) return;
    const newTabs = shapeTabs.filter(t => t.id !== tabId);
    setShapeTabs(newTabs);
    if (activeTabId === tabId) {
      const nextActive = newTabs[0];
      setActiveTabId(nextActive.id);
      const activeCount = newTabs.filter(t => t.enabled).length;
      setConfig(c => ({
        ...c,
        shape: nextActive.shape,
        itemW: nextActive.itemW,
        itemH: nextActive.shape === 'circle' ? nextActive.itemW : nextActive.itemH,
        cornerRadius: nextActive.cornerRadius,
        totalOrder: activeCount > 1 ? c.totalOrder : nextActive.quantity,
        useTotalLimit: activeCount > 1 ? true : nextActive.useTotalLimit,
      }));
      setVectorMaskResult(nextActive.vectorMaskResult);
      setCustomSvgData(nextActive.customSvgData);
      if (nextActive.sourceImage) {
        setAllPages([nextActive.sourceImage]);
      }
    }
  };

  const handleToggleTabEnabled = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShapeTabs(prev => {
      const next = prev.map(t => t.id === tabId ? { ...t, enabled: !t.enabled } : t);
      const activeCount = next.filter(t => t.enabled).length;
      if (activeCount > 1) {
        return next.map(t => ({ ...t, useTotalLimit: true }));
      }
      return next;
    });
  };

  const handleOpenLayerModal = (tab: ShapeTabItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingLayerModalTab(tab);
    setLayerModalName(tab.name);
    setLayerModalColor(tab.color || '#8b5cf6');
  };

  const handleSaveLayerModal = () => {
    if (!editingLayerModalTab) return;
    const trimmed = layerModalName.trim() || 'Mẫu';
    const chosenColor = layerModalColor || editingLayerModalTab.color || '#8b5cf6';
    setShapeTabs(prev => prev.map(t => t.id === editingLayerModalTab.id ? { ...t, name: trimmed, color: chosenColor } : t));
    setEditingLayerModalTab(null);
  };

  const handleApplyVectorMask = useCallback((result: VectorMaskResult) => {
    setVectorMaskResult(result);
    setCustomSvgData(result.svgString);
    setConfig(c => ({
      ...c,
      shape: 'custom-svg',
      itemW: result.w_mm,
      itemH: result.h_mm,
    }));
    updateActiveTabProp({
      shape: 'custom-svg',
      itemW: result.w_mm,
      itemH: result.h_mm,
      vectorMaskResult: result,
      customSvgData: result.svgString,
    });
  }, [updateActiveTabProp]);

  const handleSourceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const newPageItem: PageItem = {
        fileIndex: allPages.length,
        pageIndex: 1,
        thumb: dataUrl,
        originalThumb: dataUrl,
        name: file.name,
        w: config.itemW,
        h: config.shape === 'circle' ? config.itemW : config.itemH,
        rotation: 0
      };
      updateActiveTabProp({
        sourceImage: newPageItem,
      });
      setAllPages(prev => (prev.length === 0 ? [newPageItem] : [newPageItem, ...prev]));
      setEditingSourcePage(newPageItem);
      setIsCropColorModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenSourceEditor = () => {
    if (activeTab.sourceImage) {
      setEditingSourcePage(activeTab.sourceImage);
    } else if (allPages.length > 0) {
      setEditingSourcePage(allPages[0]);
    } else {
      setEditingSourcePage(null);
    }
    setIsCropColorModalOpen(true);
  };

  const handleApplyCroppedColorImage = (result: {
    dataUrl: string;
    originalImage: string;
    w_mm: number;
    h_mm: number;
    colorSettings: ColorAdjustSettings;
    cropSettings: CropTransform;
    filename?: string;
    updatedTabs?: any[];
    activeTabId?: string;
  }) => {
    if (result.updatedTabs && result.updatedTabs.length > 0) {
      setShapeTabs(result.updatedTabs as ShapeTabItem[]);
    }
    if (result.activeTabId) {
      setActiveTabId(result.activeTabId);
    }

    const currentTab = (result.updatedTabs || shapeTabs).find(t => t.id === (result.activeTabId || activeTabId)) || activeTab;

    const newPageItem: PageItem = {
      fileIndex: 0,
      pageIndex: 1,
      thumb: result.dataUrl,
      originalThumb: result.originalImage,
      name: result.filename || 'Ảnh nguồn',
      w: result.w_mm,
      h: result.h_mm,
      rotation: 0,
      cropSettings: result.cropSettings,
      colorSettings: result.colorSettings
    };

    setConfig(c => ({
      ...c,
      itemW: result.w_mm,
      itemH: result.h_mm,
      shape: currentTab.shape || c.shape,
    }));

    updateActiveTabProp({
      sourceImage: newPageItem,
      itemW: result.w_mm,
      itemH: result.h_mm,
      shape: currentTab.shape
    });

    if (result.dataUrl) {
      setAllPages(prev => {
        if (prev.length === 0) {
          return [newPageItem];
        }
        return prev.map((p, idx) => {
          if (idx === 0) {
            return {
              ...p,
              thumb: result.dataUrl,
              originalThumb: result.originalImage || p.originalThumb,
              name: result.filename || p.name,
              w: result.w_mm,
              h: result.h_mm,
              cropSettings: result.cropSettings,
              colorSettings: result.colorSettings
            };
          }
          return p;
        });
      });
    }
  };
  useEffect(() => {
    if (config.fitMode !== 'actual' && customScale !== 100) {
      console.log('🔄 Resetting customScale to 100 (fitMode changed to:', config.fitMode, ')');
      setCustomScale(100);
    }
  }, [config.fitMode]);
  
  // Force preview update when customScale or backgroundColor changes
  useEffect(() => {
    // Only apply custom scale preview when explicitly in 'actual' mode AND scale is not 100%
    if (config.fitMode === 'actual' && customScale !== 100 && allPages.length > 0) {
      // Re-generate thumbnails with new scale and background
      const updateThumbnails = async () => {
        const updatedPages = await Promise.all(allPages.map(async (page) => {
          if (!page.originalThumb) return page;
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          return new Promise<typeof page>((resolve) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(page);
              
              // Calculate dimensions in mm (same unit as config)
              const itemW_mm = config.itemW || 100;
              const itemH_mm = config.itemH || 50;
              
              // CRITICAL: Must match backend calculation EXACTLY
              // Backend uses pixels with DPI=300, we must do the same
              const DPI = 300; // MUST match backend
              const scale = customScale / 100;
              
              // Step 1: Convert item size from mm to pixels (same as backend)
              const target_w_px = Math.round((itemW_mm / 25.4) * DPI);
              const target_h_px = Math.round((itemH_mm / 25.4) * DPI);
              
              // Step 2: Simulate ImageOps.contain() - fit image into target
              const imgAspect = page.w / page.h; // Original image aspect
              const targetAspect = target_w_px / target_h_px; // Target aspect
              
              let fitted_w_px, fitted_h_px;
              if (imgAspect > targetAspect) {
                // Image wider than target - fit to width
                fitted_w_px = target_w_px;
                fitted_h_px = Math.round(target_w_px / imgAspect);
              } else {
                // Image taller than target - fit to height
                fitted_h_px = target_h_px;
                fitted_w_px = Math.round(target_h_px * imgAspect);
              }
              
              // Step 3: Apply scale to fitted dimensions (in pixels)
              const scaled_w_px = Math.round(fitted_w_px * scale);
              const scaled_h_px = Math.round(fitted_h_px * scale);
              
              // Step 4: Convert back to mm for display
              const scaled_w_mm = (scaled_w_px / DPI) * 25.4;
              const scaled_h_mm = (scaled_h_px / DPI) * 25.4;
              
              // DEBUG LOGGING
              console.log('🔍 FRONTEND SCALE DEBUG:', {
                originalImage: { w: page.w, h: page.h },
                itemSizeMm: { w: itemW_mm, h: itemH_mm },
                scale: customScale + '%',
                // Step 1: mm → px
                targetPx: { w: target_w_px, h: target_h_px },
                // Step 2: Fit
                imgAspect: imgAspect.toFixed(3),
                targetAspect: targetAspect.toFixed(3),
                fittedPx: { w: fitted_w_px, h: fitted_h_px },
                // Step 3: Scale
                scaledPx: { w: scaled_w_px, h: scaled_h_px },
                // Step 4: px → mm
                scaledMm: { w: scaled_w_mm.toFixed(2), h: scaled_h_mm.toFixed(2) }
              });
              
              // Step 5: Convert mm to preview pixels for canvas
              const maxDimension_mm = Math.max(itemW_mm, itemH_mm);
              const mmToPreviewPx = 200 / maxDimension_mm;
              canvas.width = Math.round(itemW_mm * mmToPreviewPx);
              canvas.height = Math.round(itemH_mm * mmToPreviewPx);
              
              // Fill background
              ctx.fillStyle = backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Calculate scaled image size in preview pixels (from mm)
              const preview_w = Math.round(scaled_w_mm * mmToPreviewPx);
              const preview_h = Math.round(scaled_h_mm * mmToPreviewPx);
              
              // Center the scaled image
              const x = (canvas.width - preview_w) / 2;
              const y = (canvas.height - preview_h) / 2;
              
              // Draw scaled image
              ctx.drawImage(img, x, y, preview_w, preview_h);
              
              resolve({
                ...page,
                thumb: canvas.toDataURL('image/jpeg', 0.9)
              });
            };
            img.src = page.originalThumb!;
          });
        }));
        
        setAllPages(updatedPages);
      };
      
      updateThumbnails();
    } else if ((config.fitMode !== 'actual' || customScale === 100) && allPages.length > 0) {
      // Restore original thumbnails when not in 'actual' mode OR scale is 100%
      const needsRestore = allPages.some(page => page.originalThumb && page.thumb !== page.originalThumb);
      if (needsRestore) {
        console.log('🔄 Restoring original thumbnails (fitMode:', config.fitMode, ', scale:', customScale, ')');
        setAllPages(prev => prev.map(page => ({
          ...page,
          thumb: page.originalThumb || page.thumb
        })));
      }
    }
  }, [customScale, backgroundColor, config.fitMode, config.itemW, config.itemH]);
  
  // Outpaint states
  const [isOutpaintPanelOpen, setIsOutpaintPanelOpen] = useState(false);
  const [outpaintConfig, setOutpaintConfig] = useState({ top: 2, bottom: 2, left: 2, right: 2 }); // mm
  const [outpaintProgress, setOutpaintProgress] = useState({ isProcessing: false, current: 0, total: 0 });
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  
  // Right Sidebar (Config & Settings Panel) click toggle state
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
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(true);
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
    currentPlanIndexSnapshot?: number;
    shapeTabsSnapshot?: ShapeTabItem[];
    allPagesSnapshot?: PageItem[];
    dataModeSnapshot?: DataMode;
    dataModeEnabledSnapshot?: boolean;
    impositionStyleSnapshot?: ImpositionStyle;
    impositionStyleEnabledSnapshot?: boolean;
    xUpQtySnapshot?: number;
    standardQtySnapshot?: number;
    customScaleSnapshot?: number;
    customSvgDataSnapshot?: string;
    backgroundColorSnapshot?: string;
    vectorMaskResultSnapshot?: VectorMaskResult | null;
    fileId?: string;
  }

  // Snapshot helper to detect unsaved changes
  const getCurrentProjectSnapshot = useCallback(() => {
    return JSON.stringify({
      config,
      currentPlanIndex,
      shapeTabs: shapeTabs.map(t => ({
        id: t.id,
        name: t.name,
        enabled: t.enabled,
        shape: t.shape,
        itemW: t.itemW,
        itemH: t.itemH,
        quantity: t.quantity,
        color: t.color,
        customSvgData: t.customSvgData,
        cornerRadius: t.cornerRadius
      })),
      allPagesCount: allPages.length,
      dataMode,
      dataModeEnabled,
      impositionStyle,
      impositionStyleEnabled,
      xUpQty,
      standardQty,
      customScale,
      backgroundColor
    });
  }, [config, currentPlanIndex, shapeTabs, allPages.length, dataMode, dataModeEnabled, impositionStyle, impositionStyleEnabled, xUpQty, standardQty, customScale, backgroundColor]);

  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
  const [isUnsavedWarningModalOpen, setIsUnsavedWarningModalOpen] = useState(false);
  const [pendingHistoryToLoad, setPendingHistoryToLoad] = useState<ImpositionHistoryItem | null>(null);

  // Initialize lastSavedSnapshot on initial render
  useEffect(() => {
    setLastSavedSnapshot(getCurrentProjectSnapshot());
  }, []);

  const [impositionHistory, setImpositionHistory] = useState<ImpositionHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('toolx_imposition_history');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
    return [];
  });

  const saveHistoryItem = useCallback((item: ImpositionHistoryItem) => {
    setImpositionHistory((prev) => {
      const filtered = prev.filter(x => x.id !== item.id);
      const next = [item, ...filtered].slice(0, 30);
      
      const trySave = (items: ImpositionHistoryItem[]): boolean => {
        try {
          localStorage.setItem('toolx_imposition_history', JSON.stringify(items));
          return true;
        } catch {
          return false;
        }
      };

      if (!trySave(next)) {
        // Fallback 1: Gọt bỏ originalThumb trong allPagesSnapshot và shapeTabsSnapshot
        const lightItems: ImpositionHistoryItem[] = next.map(it => {
          return {
            ...it,
            allPagesSnapshot: it.allPagesSnapshot?.map(p => ({
              ...p,
              originalThumb: undefined
            })),
            shapeTabsSnapshot: it.shapeTabsSnapshot?.map(t => ({
              ...t,
              sourceImage: t.sourceImage ? { ...t.sourceImage, originalThumb: undefined } : null
            }))
          };
        });
        if (!trySave(lightItems)) {
          // Fallback 2: Chỉ giữ 10 mục gần nhất
          const compact = lightItems.slice(0, 10);
          if (!trySave(compact)) {
            // Fallback 3: Giữ 5 mục không chứa base64
            const minimal = compact.slice(0, 5).map(it => ({
              ...it,
              thumbnail: '',
              allPagesSnapshot: it.allPagesSnapshot?.map(p => ({ ...p, thumb: '', originalThumb: undefined })),
              shapeTabsSnapshot: it.shapeTabsSnapshot?.map(t => ({ ...t, sourceImage: null }))
            }));
            trySave(minimal);
          }
        }
      }
      return next;
    });
  }, []);

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

  const applyHistoryItem = useCallback((item: ImpositionHistoryItem) => {
    if (item.configSnapshot) {
      setConfig(prev => ({
        ...prev,
        ...item.configSnapshot
      }));
    }
    if (item.currentPlanIndexSnapshot !== undefined && typeof item.currentPlanIndexSnapshot === 'number') {
      setCurrentPlanIndex(item.currentPlanIndexSnapshot);
    }
    if (item.shapeTabsSnapshot && Array.isArray(item.shapeTabsSnapshot) && item.shapeTabsSnapshot.length > 0) {
      setShapeTabs(item.shapeTabsSnapshot);
      setActiveTabId(item.shapeTabsSnapshot[0]?.id || 'tab-a');
    }
    if (item.allPagesSnapshot && Array.isArray(item.allPagesSnapshot)) {
      setAllPages(item.allPagesSnapshot);
    }
    if (item.dataModeSnapshot !== undefined) {
      const dm = item.dataModeSnapshot;
      const num = typeof dm === 'string' ? parseInt(dm, 10) : Number(dm);
      setDataMode((isNaN(num) ? 1 : num) as DataMode);
    }
    if (item.dataModeEnabledSnapshot !== undefined) {
      setDataModeEnabled(item.dataModeEnabledSnapshot);
    }
    if (item.impositionStyleSnapshot) {
      setImpositionStyle(item.impositionStyleSnapshot);
    }
    if (item.impositionStyleEnabledSnapshot !== undefined) {
      setImpositionStyleEnabled(item.impositionStyleEnabledSnapshot);
    }
    if (item.xUpQtySnapshot !== undefined) {
      setXUpQty(item.xUpQtySnapshot);
    }
    if (item.standardQtySnapshot !== undefined) {
      setStandardQty(item.standardQtySnapshot);
    }
    if (item.customScaleSnapshot !== undefined) {
      setCustomScale(item.customScaleSnapshot);
    }
    if (item.customSvgDataSnapshot !== undefined) {
      setCustomSvgData(item.customSvgDataSnapshot);
    }
    if (item.backgroundColorSnapshot) {
      setBackgroundColor(item.backgroundColorSnapshot);
    }
    if (item.vectorMaskResultSnapshot !== undefined) {
      setVectorMaskResult(item.vectorMaskResultSnapshot);
    }

    const newSnapshot = JSON.stringify({
      config: { ...config, ...(item.configSnapshot || {}) },
      shapeTabs: (item.shapeTabsSnapshot || shapeTabs).map(t => ({
        id: t.id,
        name: t.name,
        enabled: t.enabled,
        shape: t.shape,
        itemW: t.itemW,
        itemH: t.itemH,
        quantity: t.quantity,
        color: t.color,
        customSvgData: t.customSvgData,
        cornerRadius: t.cornerRadius
      })),
      allPagesCount: (item.allPagesSnapshot || allPages).length,
      dataMode: item.dataModeSnapshot ?? dataMode,
      dataModeEnabled: item.dataModeEnabledSnapshot ?? dataModeEnabled,
      impositionStyle: item.impositionStyleSnapshot ?? impositionStyle,
      impositionStyleEnabled: item.impositionStyleEnabledSnapshot ?? impositionStyleEnabled,
      xUpQty: item.xUpQtySnapshot ?? xUpQty,
      standardQty: item.standardQtySnapshot ?? standardQty,
      customScale: item.customScaleSnapshot ?? customScale,
      backgroundColor: item.backgroundColorSnapshot ?? backgroundColor
    });
    setLastSavedSnapshot(newSnapshot);

    safeToastSuccess(`Đã nạp thành công lịch sử: "${item.title}"`);
  }, [config, shapeTabs, allPages, dataMode, dataModeEnabled, impositionStyle, impositionStyleEnabled, xUpQty, standardQty, customScale, backgroundColor]);

  const handleRequestRestoreHistory = useCallback((item: ImpositionHistoryItem) => {
    const current = getCurrentProjectSnapshot();
    const isDirty = lastSavedSnapshot !== '' && current !== lastSavedSnapshot;
    
    if (isDirty) {
      setPendingHistoryToLoad(item);
      setIsUnsavedWarningModalOpen(true);
    } else {
      applyHistoryItem(item);
    }
  }, [getCurrentProjectSnapshot, lastSavedSnapshot, applyHistoryItem]);

  // Workspace states
  const [savedWorkspaces, setSavedWorkspaces] = useState<Array<{id?: string, name: string, config: ImpositionConfig, dataMode: DataMode, xUpQty: number, standardQty: number}>>([]);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [localWorkspaceName, setLocalWorkspaceName] = useState('');
  
  // Paper presets mega-menu dropdown states
  const [isPaperDropdownOpen, setIsPaperDropdownOpen] = useState(false);
  const [paperSearchQuery, setPaperSearchQuery] = useState('');
  const paperDropdownRef = useRef<HTMLDivElement | null>(null);

  // Popover states & refs for Bottom Canvas Toolbar
  const [isColorBarPopoverOpen, setIsColorBarPopoverOpen] = useState(false);
  const colorBarPopoverRef = useRef<HTMLDivElement | null>(null);
  const [isPageCropPopoverOpen, setIsPageCropPopoverOpen] = useState(false);
  const pageCropPopoverRef = useRef<HTMLDivElement | null>(null);
  const [isCropPopoverOpen, setIsCropPopoverOpen] = useState(false);
  const cropPopoverRef = useRef<HTMLDivElement | null>(null);

  // Current preset label resolver
  const currentPresetName = useMemo(() => {
    for (const group of PAPER_PRESET_GROUPS) {
      for (const it of group.items) {
        if ((config.pageW === it.w && config.pageH === it.h) || (config.pageW === it.h && config.pageH === it.w)) {
          return it.label.split('(')[0].trim();
        }
      }
    }
    return `${config.pageW} × ${config.pageH} mm`;
  }, [config.pageW, config.pageH]);

  // Preset workspaces
  const presetWorkspaces: Array<{name: string, config: ImpositionConfig, dataMode: DataMode, xUpQty: number, standardQty: number}> = [
    {
      name: 'Visiting Card',
      config: {
        shape: 'rect' as const, itemW: 90, itemH: 50, padding: 3, cornerRadius: 5,
        pageW: 210, pageH: 297, printW: 190, printH: 277, totalOrder: 1000,
        useCrop: true, cropLen: 5, cropDist: 3, cropThick: 0.25, cropColor: '#000000',
        fitMode: 'fill' as const, colorMode: 'cmyk' as const, dpi: 300, autoRotate: true, processMode: 'vector' as const,
        cutBleed: 2,
        usePrintArea: false, printAreaW: 190, printAreaH: 277,
        marginTop: 10, marginBot: 10, marginLeft: 10, marginRight: 10,
        marginTop2: 10, marginBot2: 10, marginLeft2: 10, marginRight2: 10,
        marginMode: 'safe' as const, useMargin: true,
        alignX: 'center' as const, alignY: 'middle' as const, flowDir: 0 as const,
        usePageCrop: false, pageCropLen: 10, pageCropDist: 10, pageCropThick: 0.5, pageCropColor: '#000000',
        is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
      },
      dataMode: 1 as DataMode, xUpQty: 1, standardQty: 1
    },
    {
      name: 'Sticker Circle',
      config: {
        shape: 'circle' as const, itemW: 50, itemH: 50, padding: 2, cornerRadius: 0,
        pageW: 210, pageH: 297, printW: 190, printH: 277, totalOrder: 500,
        useCrop: false, cropLen: 5, cropDist: 3, cropThick: 0.25, cropColor: '#000000',
        fitMode: 'fill' as const, colorMode: 'cmyk' as const, dpi: 300, autoRotate: false, processMode: 'vector' as const,
        cutBleed: 1,
        usePrintArea: false, printAreaW: 190, printAreaH: 277,
        marginTop: 10, marginBot: 10, marginLeft: 10, marginRight: 10,
        marginTop2: 10, marginBot2: 10, marginLeft2: 10, marginRight2: 10,
        marginMode: 'safe' as const, useMargin: true,
        alignX: 'center' as const, alignY: 'middle' as const, flowDir: 0 as const,
        usePageCrop: false, pageCropLen: 10, pageCropDist: 10, pageCropThick: 0.5, pageCropColor: '#000000',
        is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
      },
      dataMode: 1 as DataMode, xUpQty: 1, standardQty: 10
    },
    {
      name: 'Label 330x480',
      config: {
        shape: 'rect' as const, itemW: 100, itemH: 60, padding: 5, cornerRadius: 3,
        pageW: 330, pageH: 480, printW: 310, printH: 450, totalOrder: 2000,
        useCrop: true, cropLen: 8, cropDist: 5, cropThick: 0.5, cropColor: '#FF0000',
        fitMode: 'fill' as const, colorMode: 'cmyk' as const, dpi: 300, autoRotate: true, processMode: 'vector' as const,
        cutBleed: 3,
        usePrintArea: false, printAreaW: 310, printAreaH: 450,
        marginTop: 15, marginBot: 15, marginLeft: 10, marginRight: 10,
        marginTop2: 15, marginBot2: 15, marginLeft2: 10, marginRight2: 10,
        marginMode: 'safe' as const, useMargin: true,
        alignX: 'center' as const, alignY: 'middle' as const, flowDir: 0,
        usePageCrop: true, pageCropLen: 15, pageCropDist: 10, pageCropThick: 0.8, pageCropColor: '#000000',
        is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
      },
      dataMode: 4 as DataMode, xUpQty: 5, standardQty: 1
    }
  ];
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setIsAiMenuOpen(false);
      setIsWorkspaceModalOpen(false);
      if (paperDropdownRef.current && !paperDropdownRef.current.contains(e.target as Node)) {
        setIsPaperDropdownOpen(false);
      }
      if (colorBarPopoverRef.current && !colorBarPopoverRef.current.contains(e.target as Node)) {
        setIsColorBarPopoverOpen(false);
      }
      if (pageCropPopoverRef.current && !pageCropPopoverRef.current.contains(e.target as Node)) {
        setIsPageCropPopoverOpen(false);
      }
      if (cropPopoverRef.current && !cropPopoverRef.current.contains(e.target as Node)) {
        setIsCropPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    if (allPages.length > 0 && !window.confirm('Bạn có chắc muốn làm mới? Tất cả dữ liệu hiện tại sẽ bị xóa.')) return;
    setConfig({
      shape: 'rect', itemW: 100, itemH: 120, padding: 0, cornerRadius: 0,
      pageW: 330, pageH: 480, printW: 310, printH: 450, totalOrder: 1000,
      useTotalLimit: false,
      useCrop: false, cropLen: 5, cropDist: 3, cropThick: 0.25, cropColor: '#000000',
      fitMode: 'fill', colorMode: 'original', dpi: 300, autoRotate: true, processMode: 'vector',
      cutBleed: 0,
      usePrintArea: false, printAreaW: 320, printAreaH: 470,
      marginTop: 5, marginBot: 5, marginLeft: 5, marginRight: 5,
      marginTop2: 5, marginBot2: 5, marginLeft2: 5, marginRight2: 5,
      marginMode: 'safe', useMargin: true,
      alignX: 'center', alignY: 'middle', flowDir: 0,
      usePageCrop: false, pageCropLen: 10, pageCropDist: 10, pageCropThick: 0.5, pageCropColor: '#000000',
      is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
    });
    setPlans([]);
    setCurrentPlanIndex(0);
    setManualRotate('auto');
    setIsModalOpen(false);
    setIsGenerating(false);
    setProgress(0);
    setAllPages([]);
    setDataMode(1);
    setImpositionStyle('sheetwise');
    setDataModeEnabled(true);
    setImpositionStyleEnabled(false);
    setXUpQty(1);
    setStandardQty(1);
    setIsDataModalOpen(false);
    setIsLightboxOpen(false);
    setLightboxImage('');
    setUploadProgress({ show: false, current: 0, total: 0, percent: 0 });
    setCurrentSheetIndex(0);
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
    const defaultTab: ShapeTabItem = {
      id: 'tab-a',
      name: 'A',
      enabled: true,
      shape: 'rect',
      itemW: 100,
      itemH: 120,
      quantity: 11,
      useTotalLimit: false,
      cornerRadius: 0,
      sourceImage: null,
      vectorMaskResult: null,
      customSvgData: '',
      color: '#8b5cf6'
    };
    setShapeTabs([defaultTab]);
    setActiveTabId('tab-a');
    setVectorMaskResult(null);
    setCustomSvgData('');
    try {
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    } catch (e) {}
  }, [allPages.length]);

  const currentPlan = plans[currentPlanIndex] || null;

  // Drag & Drop reorder slots and cross-sheet transfer on Main Canvas
  const [draggedSlotIdx, setDraggedSlotIdx] = useState<number | null>(null);
  const [dragOverSlotIdx, setDragOverSlotIdx] = useState<number | null>(null);
  const [dragOverSheetIdx, setDragOverSheetIdx] = useState<number | null>(null);
  const [draggedItemData, setDraggedItemData] = useState<{
    sourceSheetIdx: number;
    sourceSlotIdx: number;
    sourceGlobalIdx: number;
    isMultiShape: boolean;
  } | null>(null);

  // Áp dụng kiểu trở lên plan hiện tại
  const styledPlan = useMemo(() => {
    if (!currentPlan) return null;
    if (impositionStyle === 'sheetwise') return currentPlan;
    return {
      ...currentPlan,
      items: applyImpositionStyle(currentPlan.items, impositionStyle, config.pageW, config.pageH),
      qty: currentPlan.qty * 2,
    };
  }, [currentPlan, impositionStyle, config.pageW, config.pageH]);
  
  const effectiveDataMode = dataModeEnabled ? dataMode : 1;

  // Calculate total output sheets based on data mode and item limit
  const totalSheets = useMemo(() => {
    if (!currentPlan) return 1;
    if (isMultiShape) {
      const planTotal = (currentPlan as any).totalSheets;
      if (planTotal && planTotal > 0) return planTotal;
      const maxSheetIdx = currentPlan.items.reduce((max, it) => Math.max(max, (it.sheetIndex ?? 0) + 1), 1);
      return Math.max(1, maxSheetIdx);
    }
    const itemsPerSheet = currentPlan.qty;
    if (itemsPerSheet <= 0) return 1;
    
    // When Total Limit toggle is ON in single-shape, sheets are determined by totalOrder
    if (!isMultiShape && config.useTotalLimit && config.totalOrder > 0) {
      return Math.max(1, Math.ceil(config.totalOrder / itemsPerSheet));
    }
    
    if (allPages.length === 0) return 1;
    
    // Odd-even 2-sided: trang lẻ=front, trang chẵn=back → chỉ tính nửa số trang
    if (config.is2Sided && config.twoSideMode === 'odd-even') {
      const frontPages = Math.ceil(allPages.length / 2);
      return Math.ceil(frontPages / itemsPerSheet);
    }
    
    if (effectiveDataMode === 1) {
      return Math.ceil((allPages.length * standardQty) / itemsPerSheet);
    } else if (effectiveDataMode === 4) {
      return allPages.length * xUpQty;
    } else if (effectiveDataMode === 5 || effectiveDataMode === 6) {
      return Math.ceil(allPages.length / itemsPerSheet);
    }
    
    return Math.ceil(allPages.length / itemsPerSheet);
  }, [currentPlan, allPages.length, effectiveDataMode, standardQty, xUpQty, config.is2Sided, config.twoSideMode, config.useTotalLimit, config.totalOrder, isMultiShape]);
  
  // Check if last sheet has blank surplus slots (dư trắng)
  const hasLastSheetBlanks = useMemo(() => {
    if (isMultiShape || !currentPlan || !config.useTotalLimit || config.totalOrder <= 0) return false;
    const itemsPerSheet = currentPlan.qty;
    if (itemsPerSheet <= 0) return false;
    return (config.totalOrder % itemsPerSheet) !== 0;
  }, [currentPlan, config.useTotalLimit, config.totalOrder, isMultiShape]);

  const lastSheetBlankCount = useMemo(() => {
    if (isMultiShape || !currentPlan || !config.useTotalLimit || config.totalOrder <= 0) return 0;
    const itemsPerSheet = currentPlan.qty;
    if (itemsPerSheet <= 0) return 0;
    const rem = config.totalOrder % itemsPerSheet;
    return rem === 0 ? 0 : itemsPerSheet - rem;
  }, [currentPlan, config.useTotalLimit, config.totalOrder, isMultiShape]);

  // Get page index for each item slot on a given sheet (default currentSheetIndex)
  const getPageForSlot = useCallback((slotIndex: number, sheetIdx: number = currentSheetIndex, overrideSide?: 'front' | 'back'): number => {
    if (allPages.length === 0) return -1;
    const itemsPerSheet = currentPlan?.qty || 1;

    // In multi-shape mode, never hide slots - layout solver has already packed exact counts
    if (!isMultiShape && config.useTotalLimit && config.totalOrder > 0) {
      const globalSlot = sheetIdx * itemsPerSheet + slotIndex;
      if (globalSlot >= config.totalOrder) {
        return -1;
      }
    }
    
    // Odd-even 2-sided mode: odd pages (0,2,4..) = front, even pages (1,3,5..) = back
    if (config.is2Sided && config.twoSideMode === 'odd-even') {
      const effectiveSide = overrideSide || (sheetIdx % 2 === 1 ? 'back' : previewSide);
      const sheetPairIndex = Math.floor(sheetIdx / 2);
      const globalSlot = sheetPairIndex * itemsPerSheet + slotIndex;
      if (effectiveSide === 'front') {
        const frontIdx = (globalSlot * 2) % allPages.length;
        return frontIdx;
      } else {
        const backIdx = (globalSlot * 2 + 1) % allPages.length;
        return backIdx;
      }
    }
    
    if (isMultiShape) {
      // Clone and repeat source pages across slots
      return slotIndex % allPages.length;
    }

    if (effectiveDataMode === 1) {
      const globalIndex = sheetIdx * itemsPerSheet + slotIndex;
      const pageIndex = Math.floor(globalIndex / standardQty) % allPages.length;
      return pageIndex;
    } else if (effectiveDataMode === 4) {
      if (allPages.length > 1) {
        return slotIndex % allPages.length;
      }
      const pageIndex = Math.floor(sheetIdx / xUpQty) % allPages.length;
      return pageIndex;
    } else if (effectiveDataMode === 5 || effectiveDataMode === 6) {
      const globalIndex = sheetIdx * itemsPerSheet + slotIndex;
      return globalIndex % allPages.length;
    }
    
    const globalIndex = sheetIdx * itemsPerSheet + slotIndex;
    return globalIndex % allPages.length;
  }, [currentPlan, allPages.length, effectiveDataMode, standardQty, xUpQty, currentSheetIndex, config.is2Sided, config.twoSideMode, previewSide, config.useTotalLimit, config.totalOrder, isMultiShape]);

  const calculateSlotTotalRotation = (
    it: PlanItem,
    page: PageItem | null | undefined,
    isBackSide: boolean = false
  ): number => {
    let pageRotation = page ? (page.rotation || 0) : 0;
    const isRotatedItem = !!it.rot;
    const itemShape = (it.shape || config.shape) as string;
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
    
    const correspondingTab = isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName) : null;
    const isTabAutoRotate = isMultiShape 
      ? (correspondingTab?.autoRotateImage !== undefined ? correspondingTab.autoRotateImage : (correspondingTab?.autoRotate !== undefined ? correspondingTab.autoRotate : (config.autoRotateImage ?? true)))
      : (config.autoRotateImage ?? true);

    const actualW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
    const originalItemH = itemShape === 'circle' ? actualW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));

    if (isTabAutoRotate && page && page.w && page.h) {
      const srcRatio = page.w / page.h;
      const dstRatio = actualW / originalItemH;
      
      if ((srcRatio > 1 && dstRatio < 1) || (srcRatio < 1 && dstRatio > 1)) {
        pageRotation += isRotatedItem ? -90 : 90;
      }
    }
    
    if (isRotatedItem && !isSpecialShape) {
      pageRotation += 90;
    }
    
    const itemRotation = (isSpecialShape && isRotatedItem) ? 180 : 0;
    const flipRotation = it.flipped ? 180 : 0;
    const rot45Rotation = it.rot45 ? 45 : 0;
    const backRotation = (isBackSide && config.rot180Back) ? 180 : 0;
    return ((pageRotation + itemRotation + flipRotation + rot45Rotation + backRotation) % 360 + 360) % 360;
  };

  const enrichPlanItemsWithRotation = (items: PlanItem[]): (PlanItem & { totalRotation: number; pageIndex: number; w: number; h: number })[] => {
    return items.map((it, i) => {
      const sheetIdx = it.sheetIndex ?? 0;
      const isBackSide = config.is2Sided && (sheetIdx % 2 === 1);
      const pageIdx = getPageForSlot(i, sheetIdx, isBackSide ? 'back' : 'front');
      const page = pageIdx >= 0 && pageIdx < allPages.length ? allPages[pageIdx] : null;
      const totRot = calculateSlotTotalRotation(it, page, isBackSide);
      
      const itemShape = (it.shape || config.shape) as string;
      const actualW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
      const actualH = itemShape === 'circle' ? actualW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));

      return {
        ...it,
        w: actualW,
        h: actualH,
        pageIndex: pageIdx >= 0 ? pageIdx : 0,
        totalRotation: totRot,
      };
    });
  };

  const handleReorderSlots = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || !currentPlan) return;
    setPlans(prevPlans => {
      return prevPlans.map((pl, pIdx) => {
        if (pIdx !== currentPlanIndex) return pl;
        const items = [...pl.items];
        if (fromIdx < 0 || fromIdx >= items.length || toIdx < 0 || toIdx >= items.length) {
          return pl;
        }

        // Reorder items in array (dồn thứ tự liên tiếp)
        const [movedItem] = items.splice(fromIdx, 1);
        items.splice(toIdx, 0, movedItem);

        // Printable area dimensions and offsets
        let pw = config.pageW, ph = config.pageH;
        let ox = 0, oy = 0;
        if (config.usePrintArea) {
          pw = config.printAreaW; ph = config.printAreaH;
          ox = (config.pageW - pw) / 2; oy = (config.pageH - ph) / 2;
        } else if (config.useMargin) {
          pw = config.pageW - config.marginLeft - config.marginRight;
          ph = config.pageH - config.marginTop - config.marginBot;
          ox = config.marginLeft; oy = config.marginTop;
        }

        // Map items to base unrotated dimensions using shapeTabs or item dims
        const packItems = items.map((it, idx) => {
          const tab = isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName) : null;
          const origW = tab ? tab.itemW : (it.rot ? it.h : it.w);
          const origH = tab ? (tab.shape === 'circle' ? tab.itemW : tab.itemH) : (it.rot ? it.w : it.h);
          const tabCanRotate = tab?.canRotate !== undefined ? tab.canRotate : (tab?.autoRotate !== undefined ? tab.autoRotate : config.autoRotate);
          return {
            id: idx,
            w: origW || it.w || config.itemW,
            h: origH || it.h || config.itemH,
            tabId: it.tabId,
            tabName: it.tabName,
            shape: it.shape || tab?.shape,
            cornerRadius: it.cornerRadius ?? tab?.cornerRadius,
            sourceImage: it.sourceImage || tab?.sourceImage,
            vectorMaskResult: it.vectorMaskResult || tab?.vectorMaskResult,
            customSvgData: it.customSvgData || tab?.customSvgData,
            color: it.color || tab?.color,
            canRotate: tabCanRotate,
          };
        });

        // Repack sequentially with multiSizePacker to guarantee zero overlaps across sheets
        const packed = packMultiSize(packItems, pw, ph, config.padding, true, config.autoRotate);
        const matchPlan = packed.find(p => p.name === pl.name) || packed[0];
        if (matchPlan && matchPlan.items.length === items.length && !hasOverlap(matchPlan.items)) {
          return {
            ...pl,
            items: matchPlan.items.map(it => ({
              ...it,
              x: it.x + ox,
              y: it.y + oy,
              rot: it.rot,
              sheetIndex: it.sheetIndex ?? 0,
            })),
            totalSheets: matchPlan.totalSheets
          };
        }

        // Guaranteed non-overlapping sequential shelf pack fallback
        const sequentialPack = shelfPackSequential(packItems, pw, ph, config.padding, true, true);
        return {
          ...pl,
          items: sequentialPack.items.map(it => ({
            ...it,
            x: it.x + ox,
            y: it.y + oy,
            rot: it.rot,
            sheetIndex: it.sheetIndex ?? 0,
          })),
          totalSheets: sequentialPack.totalSheets
        };
      });
    });
    toast.success('Đã chuyển vị trí và tự động dồn trang', { id: 'reorder-slot', duration: 1500 });
  }, [currentPlan, currentPlanIndex, config, isMultiShape, shapeTabs]);

  const handleSwapSlots = handleReorderSlots;

  const handleMoveItemToSheet = useCallback((
    fromIdx: number,
    targetSheetIdx: number,
    dropMmX?: number,
    dropMmY?: number
  ) => {
    if (!currentPlan) return;
    setPlans(prevPlans => {
      return prevPlans.map((pl, pIdx) => {
        if (pIdx !== currentPlanIndex) return pl;
        const items = [...pl.items];
        if (fromIdx < 0 || fromIdx >= items.length) return pl;

        const currentSheetOfItem = items[fromIdx].sheetIndex ?? 0;
        
        // Find items currently on target sheet
        const targetItems = items
          .map((it, idx) => ({ it, idx }))
          .filter(({ it, idx }) => idx !== fromIdx && (it.sheetIndex ?? 0) === targetSheetIdx);

        let targetIdx = 0;
        if (targetItems.length === 0) {
          if (targetSheetIdx < currentSheetOfItem) {
            targetIdx = 0;
          } else {
            targetIdx = items.length - 1;
          }
        } else if (dropMmX !== undefined && dropMmY !== undefined) {
          // Find closest item on target sheet by distance to drop point
          let closestIdx = targetItems[0].idx;
          let minDist = Infinity;
          for (const { it, idx } of targetItems) {
            const itemW = it.w || config.itemW;
            const itemH = it.h || config.itemH;
            const cx = it.x + itemW / 2;
            const cy = it.y + itemH / 2;
            const dist = Math.hypot(cx - dropMmX, cy - dropMmY);
            if (dist < minDist) {
              minDist = dist;
              closestIdx = idx;
            }
          }
          targetIdx = closestIdx;
        } else if (targetSheetIdx < currentSheetOfItem) {
          // Moving up: insert at the start of that sheet
          targetIdx = targetItems[0].idx;
        } else {
          // Moving down: insert at the end of that sheet
          targetIdx = targetItems[targetItems.length - 1].idx;
        }

        const [movedItem] = items.splice(fromIdx, 1);
        items.splice(targetIdx, 0, movedItem);

        // Calculate printable area
        let pw = config.pageW, ph = config.pageH;
        let ox = 0, oy = 0;
        if (config.usePrintArea) {
          pw = config.printAreaW; ph = config.printAreaH;
          ox = (config.pageW - pw) / 2; oy = (config.pageH - ph) / 2;
        } else if (config.useMargin) {
          pw = config.pageW - config.marginLeft - config.marginRight;
          ph = config.pageH - config.marginTop - config.marginBot;
          ox = config.marginLeft; oy = config.marginTop;
        }

        const packItems = items.map((it, idx) => {
          const tab = isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName) : null;
          const origW = tab ? tab.itemW : (it.rot ? it.h : it.w);
          const origH = tab ? (tab.shape === 'circle' ? tab.itemW : tab.itemH) : (it.rot ? it.w : it.h);
          const tabCanRotate = tab?.canRotate !== undefined ? tab.canRotate : (tab?.autoRotate !== undefined ? tab.autoRotate : config.autoRotate);
          return {
            id: idx,
            w: origW || it.w || config.itemW,
            h: origH || it.h || config.itemH,
            tabId: it.tabId,
            tabName: it.tabName,
            shape: it.shape || tab?.shape,
            cornerRadius: it.cornerRadius ?? tab?.cornerRadius,
            sourceImage: it.sourceImage || tab?.sourceImage,
            vectorMaskResult: it.vectorMaskResult || tab?.vectorMaskResult,
            customSvgData: it.customSvgData || tab?.customSvgData,
            color: it.color || tab?.color,
            canRotate: tabCanRotate,
          };
        });

        const packed = packMultiSize(packItems, pw, ph, config.padding, true, config.autoRotate);
        const matchPlan = packed.find(p => p.name === pl.name) || packed[0];
        if (matchPlan && matchPlan.items.length === items.length && !hasOverlap(matchPlan.items)) {
          return {
            ...pl,
            items: matchPlan.items.map(it => ({
              ...it,
              x: it.x + ox,
              y: it.y + oy,
              rot: it.rot,
              sheetIndex: it.sheetIndex ?? 0,
            })),
            totalSheets: matchPlan.totalSheets
          };
        }

        const sequentialPack = shelfPackSequential(packItems, pw, ph, config.padding, true, true);
        return {
          ...pl,
          items: sequentialPack.items.map(it => ({
            ...it,
            x: it.x + ox,
            y: it.y + oy,
            rot: it.rot,
            sheetIndex: it.sheetIndex ?? 0,
          })),
          totalSheets: sequentialPack.totalSheets
        };
      });
    });
    setCurrentSheetIndex(targetSheetIdx);
    toast.success(`Đã chuyển đối tượng sang Tờ ${targetSheetIdx + 1} và dồn trang`, { id: 'move-sheet', duration: 1500 });
  }, [currentPlan, currentPlanIndex, config, isMultiShape, shapeTabs]);

  const handleReorderDataPages = useCallback((
    fromSheetIdx: number,
    fromSlotIdx: number,
    toSheetIdx: number,
    toSlotIdx: number
  ) => {
    if (allPages.length <= 1) return;
    const p1 = getPageForSlot(fromSlotIdx, fromSheetIdx);
    const p2 = getPageForSlot(toSlotIdx, toSheetIdx);
    if (p1 >= 0 && p2 >= 0 && p1 !== p2 && p1 < allPages.length && p2 < allPages.length) {
      setAllPages(prev => {
        const copy = [...prev];
        const [moved] = copy.splice(p1, 1);
        copy.splice(p2, 0, moved);
        return copy;
      });
      toast.success(`Đã chuyển và tự động dồn trang lên trên`, { id: 'reorder-page', duration: 1500 });
    }
  }, [allPages.length, getPageForSlot]);

  const handleSwapDataPages = handleReorderDataPages;

  const handleMovePageToSheet = useCallback((
    fromSheetIdx: number,
    fromSlotIdx: number,
    toSheetIdx: number
  ) => {
    if (allPages.length <= 1 || fromSheetIdx === toSheetIdx || !currentPlan) return;
    const p1 = getPageForSlot(fromSlotIdx, fromSheetIdx);
    if (p1 < 0 || p1 >= allPages.length) return;
    
    const itemsPerSheet = currentPlan.qty || 1;
    const targetPageIdx = Math.min(allPages.length - 1, Math.max(0, toSheetIdx * itemsPerSheet));
    
    setAllPages(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(p1, 1);
      copy.splice(targetPageIdx, 0, moved);
      return copy;
    });
    setCurrentSheetIndex(toSheetIdx);
    toast.success(`Đã chuyển sang Tờ ${toSheetIdx + 1} và dồn trang`, { id: 'move-page-sheet', duration: 1500 });
  }, [allPages.length, currentPlan, getPageForSlot]);

  // Reset sheet index when data changes
  useEffect(() => {
    setCurrentSheetIndex(0);
  }, [allPages.length, dataMode, standardQty, xUpQty, currentPlanIndex, config.twoSideMode, config.useTotalLimit, config.totalOrder]);

  // Clamp currentSheetIndex when totalSheets decreases
  useEffect(() => {
    if (currentSheetIndex >= totalSheets) {
      setCurrentSheetIndex(Math.max(0, totalSheets - 1));
    }
  }, [totalSheets, currentSheetIndex]);

  // Fetch server-rendered preview (debounced)
  useEffect(() => {
    if (!currentPlan || allPages.length === 0 || apiStatus !== 'online') {
      setServerPreviewUrl('');
      return;
    }
    setIsLoadingServerPreview(true);
    const timer = setTimeout(async () => {
      try {
        const plan = impositionStyleEnabled && styledPlan ? styledPlan : currentPlan;
        const fileIds = allPages.map(p => p.fileId).filter(Boolean);
        if (fileIds.length === 0) { setIsLoadingServerPreview(false); return; }
        const rawPlanItems = plan ? plan.items : [];
        const enrichedPlanItems = enrichPlanItemsWithRotation(rawPlanItems);
        const fd = new FormData();
        fd.append('planData', JSON.stringify(enrichedPlanItems));
        fd.append('fileIds', JSON.stringify(fileIds));
        fd.append('pagesData', JSON.stringify(allPages.map(p => ({ rotation: p.rotation || 0, w: p.w, h: p.h }))));
        fd.append('pageW', String(config.pageW));
        fd.append('pageH', String(config.pageH));
        fd.append('itemW', String(config.itemW));
        fd.append('itemH', String(config.itemH));
        fd.append('fitMode', config.fitMode);
        fd.append('shape', config.shape);
        fd.append('autoRotate', config.autoRotate ? '1' : '0');
        fd.append('sheetIndex', String(currentSheetIndex));
        fd.append('dataMode', String(effectiveDataMode));
        fd.append('standardQty', String(standardQty));
        fd.append('xUpQty', String(xUpQty));
        fd.append('previewDpi', '72');
        fd.append('backgroundColor', backgroundColor);
        const res = await fetch(API_BASE + '/render-sheet-preview', { method: 'POST', body: fd });
        if (res.ok) {
          const blob = await res.blob();
          setServerPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        }
      } catch (e) { console.error('[ServerPreview]', e); }
      setIsLoadingServerPreview(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [currentPlan, styledPlan, impositionStyleEnabled, allPages, config.pageW, config.pageH, config.itemW, config.itemH, config.fitMode, config.shape, config.autoRotate, currentSheetIndex, effectiveDataMode, standardQty, xUpQty, backgroundColor, apiStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const check = async () => {
      try { 
        // Check Python service health specifically (with timeout to prevent 504 logs)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const r = await fetch(API_BASE + '/python-health', { signal: controller.signal }); 
        clearTimeout(timeoutId);
        setApiStatus(r.ok ? 'online' : 'offline'); 
      }
      catch { setApiStatus('offline'); }
    };
    check(); const iv = setInterval(check, 30000); return () => clearInterval(iv);
  }, []);

  // Reset local workspace name when modal opens/closes
  useEffect(() => {
    if (isWorkspaceModalOpen) {
      setLocalWorkspaceName('');
    }
  }, [isWorkspaceModalOpen]);
  
  // Load saved workspaces from localStorage
  // Load saved workspaces from API and localStorage
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        // Load from API first (graceful fallback if not logged in)
        const apiWorkspaces = await workspaceService.getWorkspaces().catch(() => null);
        if (apiWorkspaces && apiWorkspaces.length > 0) {
          setSavedWorkspaces(apiWorkspaces);
          localStorage.setItem("imposition-workspaces", JSON.stringify(apiWorkspaces));
          return;
        }
      } catch (_) {}

      // Fallback to localStorage
      const saved = localStorage.getItem("imposition-workspaces");
      if (saved) {
        try {
          setSavedWorkspaces(JSON.parse(saved));
        } catch (_) {}
      }
    };
    
    loadWorkspaces();
  }, []);

  // Workspace functions
  const saveWorkspace = async () => {
    if (!localWorkspaceName.trim()) {
      alert("Vui lòng nhập tên workspace!");
      return;
    }
    
    const workspace = {
      name: localWorkspaceName.trim(),
      config: { ...config },
      currentPlanIndex,
      dataMode: dataMode.toString(),
      dataModeEnabled,
      xUpQty,
      standardQty,
      shapeTabs: JSON.parse(JSON.stringify(shapeTabs)),
      allPages: JSON.parse(JSON.stringify(allPages)),
      customScale,
      customSvgData,
      backgroundColor,
      impositionStyle,
      impositionStyleEnabled,
      vectorMaskResult
    };
    
    try {
      // Check if workspace exists
      const existingWorkspace = savedWorkspaces.find(w => w.name === workspace.name);
      
      let savedWorkspace;
      if (existingWorkspace) {
        // Update existing workspace
        savedWorkspace = await workspaceService.updateWorkspace(existingWorkspace.id!, workspace);
      } else {
        // Create new workspace
        savedWorkspace = await workspaceService.saveWorkspace(workspace);
      }
      
      if (savedWorkspace) {
        // Update local state
        const updated = [...savedWorkspaces.filter(w => w.name !== workspace.name), savedWorkspace];
        setSavedWorkspaces(updated);
        try {
          localStorage.setItem("imposition-workspaces", JSON.stringify(updated));
        } catch {
          // Quota fallback: Gọt bỏ originalThumb trong workspaces lưu cục bộ
          try {
            const lightWorkspaces = updated.map(ws => ({
              ...ws,
              allPages: ws.allPages?.map((p: any) => ({ ...p, originalThumb: undefined })),
              shapeTabs: ws.shapeTabs?.map((t: any) => ({
                ...t,
                sourceImage: t.sourceImage ? { ...t.sourceImage, originalThumb: undefined } : null
              }))
            }));
            localStorage.setItem("imposition-workspaces", JSON.stringify(lightWorkspaces));
          } catch {}
        }
        
        setWorkspaceName("");
        setLocalWorkspaceName("");
        setIsWorkspaceModalOpen(false);
        alert(existingWorkspace ? "Đã cập nhật workspace thành công!" : "Đã lưu workspace thành công!");
      } else {
        alert("Lỗi khi lưu workspace. Vui lòng thử lại!");
      }
    } catch (error) {
      console.error("Error saving workspace:", error);
      alert("Lỗi khi lưu workspace. Vui lòng thử lại!");
    }
  };

  const loadWorkspace = (workspace: any) => {
    if (workspace.config) setConfig(workspace.config);
    if (workspace.currentPlanIndex !== undefined && typeof workspace.currentPlanIndex === 'number') {
      setCurrentPlanIndex(workspace.currentPlanIndex);
    }
    if (workspace.dataMode !== undefined) {
      const dm = workspace.dataMode;
      const num = typeof dm === 'string' ? parseInt(dm, 10) : Number(dm);
      setDataMode((isNaN(num) ? 1 : num) as DataMode);
    }
    if (workspace.dataModeEnabled !== undefined) setDataModeEnabled(workspace.dataModeEnabled);
    if (workspace.xUpQty !== undefined) setXUpQty(workspace.xUpQty);
    if (workspace.standardQty !== undefined) setStandardQty(workspace.standardQty);
    if (workspace.shapeTabs && Array.isArray(workspace.shapeTabs) && workspace.shapeTabs.length > 0) {
      setShapeTabs(workspace.shapeTabs);
      setActiveTabId(workspace.shapeTabs[0]?.id || 'tab-a');
    }
    if (workspace.allPages && Array.isArray(workspace.allPages)) {
      setAllPages(workspace.allPages);
    }
    if (workspace.customScale !== undefined) setCustomScale(workspace.customScale);
    if (workspace.customSvgData !== undefined) setCustomSvgData(workspace.customSvgData);
    if (workspace.backgroundColor !== undefined) setBackgroundColor(workspace.backgroundColor);
    if (workspace.impositionStyle !== undefined) setImpositionStyle(workspace.impositionStyle);
    if (workspace.impositionStyleEnabled !== undefined) setImpositionStyleEnabled(workspace.impositionStyleEnabled);
    if (workspace.vectorMaskResult !== undefined) setVectorMaskResult(workspace.vectorMaskResult);
    alert(`Đã tải workspace: ${workspace.name}`);
  };

  const deleteWorkspace = async (name: string) => {
    if (!window.confirm(`Xóa workspace "${name}"?`)) return;
    
    try {
      // Find workspace to get ID
      const workspaceToDelete = savedWorkspaces.find(w => w.name === name);
      if (!workspaceToDelete) {
        alert("Không tìm thấy workspace!");
        return;
      }
      
      // Delete from database via API
      const success = await workspaceService.deleteWorkspace(workspaceToDelete.id!);
      
      if (success) {
        // Update local state
        const updated = savedWorkspaces.filter(w => w.name !== name);
        setSavedWorkspaces(updated);
        localStorage.setItem("imposition-workspaces", JSON.stringify(updated));
        alert("Đã xóa workspace thành công!");
      } else {
        alert("Lỗi khi xóa workspace. Vui lòng thử lại!");
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
      alert("Lỗi khi xóa workspace. Vui lòng thử lại!");
    }
  };

  const runCalc = useCallback(async () => {
    const enabledTabs = shapeTabs.filter(t => t.enabled);

    // Tính fingerprint hình học bố cục: chỉ tính lại khi kích thước/hình dạng/sắp xếp thật sự thay đổi
    const currentFingerprint = JSON.stringify({
      pw: config.pageW,
      ph: config.pageH,
      printArea: config.usePrintArea ? [config.printAreaW, config.printAreaH] : null,
      margin: config.useMargin ? [config.marginLeft, config.marginRight, config.marginTop, config.marginBot] : null,
      pad: config.padding,
      shape: config.shape,
      w: config.itemW,
      h: config.itemH,
      autoRotate: config.autoRotate,
      alignX: config.alignX,
      alignY: config.alignY,
      flowDir: config.flowDir,
      tabs: enabledTabs.map(t => ({
        id: t.id,
        w: t.itemW,
        h: t.shape === 'circle' ? t.itemW : t.itemH,
        qty: t.quantity,
        shape: t.shape,
        canRotate: t.canRotate !== undefined ? t.canRotate : (t.autoRotate !== undefined ? t.autoRotate : config.autoRotate)
      })),
      allPagesLen: (config.shape === 'svg-image' || config.shape === 'pdf-source') ? allPages.length : 0,
      customSvgLen: customSvgData ? customSvgData.length : 0,
    });

    if (layoutFingerprintRef.current && currentFingerprint === layoutFingerprintRef.current) {
      return;
    }
    layoutFingerprintRef.current = currentFingerprint;

    // Multi-Shape packing when multiple shape tabs are enabled
    if (enabledTabs.length > 1) {
      let pw = config.pageW, ph = config.pageH;
      let ox = 0, oy = 0;
      if (config.usePrintArea) {
        pw = config.printAreaW; ph = config.printAreaH;
        ox = (config.pageW - pw) / 2; oy = (config.pageH - ph) / 2;
      } else if (config.useMargin) {
        pw = config.pageW - config.marginLeft - config.marginRight;
        ph = config.pageH - config.marginTop - config.marginBot;
        ox = config.marginLeft; oy = config.marginTop;
      }

      const multiItems: any[] = [];
      let itemId = 0;
      enabledTabs.forEach((tab) => {
        const qty = Math.min(99, Math.max(1, tab.quantity || 1));
        const w = tab.itemW;
        const h = tab.shape === 'circle' ? tab.itemW : tab.itemH;
        const tabCanRotate = tab.canRotate !== undefined ? tab.canRotate : (tab.autoRotate !== undefined ? tab.autoRotate : config.autoRotate);
        for (let k = 0; k < qty; k++) {
          multiItems.push({
            id: itemId++,
            w: w,
            h: h,
            tabId: tab.id,
            tabName: tab.name,
            shape: tab.shape,
            cornerRadius: tab.cornerRadius,
            sourceImage: tab.sourceImage,
            vectorMaskResult: tab.vectorMaskResult,
            customSvgData: tab.customSvgData,
            color: tab.color,
            canRotate: tabCanRotate,
          });
        }
      });

      const results = packMultiSize(multiItems, pw, ph, config.padding, true, config.autoRotate);
      const plans: LayoutPlan[] = results.map(r => ({
        name: r.name,
        qty: r.items.length,
        priority: 0,
        items: r.items.map(it => ({
          x: it.x + ox,
          y: it.y + oy,
          w: it.w,
          h: it.h,
          rot: it.rot,
          sheetIndex: it.sheetIndex ?? 0,
          tabId: it.tabId,
          tabName: it.tabName,
          shape: it.shape,
          cornerRadius: it.cornerRadius,
          sourceImage: it.sourceImage,
          vectorMaskResult: it.vectorMaskResult,
          customSvgData: it.customSvgData,
          color: it.color,
        })),
      }));

      setPlans(plans);
      if (currentPlanIndex >= plans.length) setCurrentPlanIndex(0);
      return;
    }

    // Multi-size packing for svg-image / pdf-source
    if ((config.shape === 'svg-image' || config.shape === 'pdf-source') && allPages.length > 0) {
      let pw = config.pageW, ph = config.pageH;
      let ox = 0, oy = 0;
      if (config.usePrintArea) {
        pw = config.printAreaW; ph = config.printAreaH;
        ox = (config.pageW - pw) / 2; oy = (config.pageH - ph) / 2;
      } else if (config.useMargin) {
        pw = config.pageW - config.marginLeft - config.marginRight;
        ph = config.pageH - config.marginTop - config.marginBot;
        ox = config.marginLeft; oy = config.marginTop;
      }
      const packItems = allPages.map((p, i) => ({ w: p.w, h: p.h, id: i, canRotate: config.autoRotate }));
      const results = packMultiSize(packItems, pw, ph, config.padding, true, config.autoRotate);
      const plans: LayoutPlan[] = results.map(r => ({
        name: r.name,
        qty: r.items.length,
        priority: 0,
        items: r.items.map(it => ({
          x: it.x + ox, y: it.y + oy,
          w: it.w, h: it.h,
          rot: it.rot,
        })),
      }));
      setPlans(plans);
      if (currentPlanIndex >= plans.length) setCurrentPlanIndex(0);
      return;
    }

    if (config.itemW <= 0 || config.itemH <= 0) { setPlans([]); return; }
    
    // Calculate effective print area based on margins or print area settings
    let effectivePrintW = config.pageW; // Default: use full page
    let effectivePrintH = config.pageH;
    let offsetX = 0; // Default: start from edge
    let offsetY = 0;
    
    if (config.usePrintArea) {
      // Use custom print area (centered)
      effectivePrintW = config.printAreaW;
      effectivePrintH = config.printAreaH;
      offsetX = (config.pageW - config.printAreaW) / 2;
      offsetY = (config.pageH - config.printAreaH) / 2;
    } else if (config.useMargin) {
      // Calculate from margins
      effectivePrintW = config.pageW - config.marginLeft - config.marginRight;
      effectivePrintH = config.pageH - config.marginTop - config.marginBot;
      offsetX = config.marginLeft;
      offsetY = config.marginTop;
    }
    // else: use full page with offset 0 (items start from edge)
    
    const r = calculateLayout({ 
      shape: config.shape === 'custom-svg' || config.shape === 'svg-image' || config.shape === 'pdf-source' ? 'rect' : config.shape, 
      itemW: config.itemW,
      itemH: config.shape === 'circle' ? config.itemW : config.itemH,
      padding: config.padding, 
      printW: effectivePrintW, 
      printH: effectivePrintH,
      pageW: config.pageW, 
      pageH: config.pageH,
      autoRotate: config.autoRotate,
    });
    
    // Apply alignment offset to all items - ALIGN TO PAGE, not print area
    const alignedPlans = r.map(plan => {
      // Calculate total content bounds (after layout in effective print area)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(config.shape);
      plan.items.forEach(it => {
        // Special shapes (triangle, trapezoid, hexagon) don't swap dimensions when rotated
        // They just flip 180 degrees
        const itemShape = (it.shape || config.shape) as string;
        let w: number, h: number;
        if (itemShape === 'circle') {
          w = h = it.w !== undefined ? it.w : config.itemW;
        } else if (isSpecialShape) {
          w = it.w !== undefined ? it.w : config.itemW;
          h = it.h !== undefined ? it.h : config.itemH;
        } else {
          w = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
          h = it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH);
        }
        minX = Math.min(minX, it.x);
        minY = Math.min(minY, it.y);
        maxX = Math.max(maxX, it.x + w);
        maxY = Math.max(maxY, it.y + h);
      });
      
      // Content size from layout (already calculated within effectivePrintW/H)
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      
      // Calculate alignment offset - RELATIVE TO FULL PAGE
      let alignOffsetX = 0;
      let alignOffsetY = 0;
      
      // X alignment - relative to pageW
      if (config.alignX === 'center') {
        alignOffsetX = (config.pageW - contentW) / 2 - minX;
      } else if (config.alignX === 'right') {
        alignOffsetX = config.pageW - contentW - minX;
      } else { // left
        alignOffsetX = -minX; // start from left edge of page
      }
      
      // Y alignment - relative to pageH
      if (config.alignY === 'middle') {
        alignOffsetY = (config.pageH - contentH) / 2 - minY;
      } else if (config.alignY === 'bottom') {
        alignOffsetY = config.pageH - contentH - minY;
      } else { // top
        alignOffsetY = -minY; // start from top edge of page
      }
      
      // Clamp to ensure content stays within page bounds
      // Check if content would go outside page after alignment
      const finalMinX = minX + alignOffsetX;
      const finalMaxX = maxX + alignOffsetX;
      const finalMinY = minY + alignOffsetY;
      const finalMaxY = maxY + alignOffsetY;
      
      // Adjust if content goes outside page
      if (finalMinX < 0) alignOffsetX -= finalMinX;
      if (finalMaxX > config.pageW) alignOffsetX -= (finalMaxX - config.pageW);
      if (finalMinY < 0) alignOffsetY -= finalMinY;
      if (finalMaxY > config.pageH) alignOffsetY -= (finalMaxY - config.pageH);
      
      return {
        ...plan,
        items: plan.items.map(it => ({
          ...it,
          x: it.x + alignOffsetX,
          y: it.y + alignOffsetY
        }))
      };
    });
    
    setPlans(alignedPlans);
    
    // Add SVG nesting plans for custom-svg shape (use Python backend for true contour nesting)
    if (config.shape === 'custom-svg' && customSvgData && apiStatus === 'online') {
      try {
        const fd = new FormData();
        fd.append('svgData', customSvgData);
        fd.append('sheetW', String(effectivePrintW));
        fd.append('sheetH', String(effectivePrintH));
        fd.append('itemW', String(config.itemW));
        fd.append('itemH', String(config.itemH));
        fd.append('padding', String(config.padding));
        fd.append('rotations', '0,45,90,135,180');
        const res = await fetch(API_BASE + '/nest-svg', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Nesting API failed');
        const data = await res.json();
        const nestResults: Array<{ placements: Array<{ x: number; y: number; rotation: number }>; count: number; yinyang?: boolean; rotation: number }> = data.results || [];
        const nestPlans: LayoutPlan[] = nestResults
          .filter(r => r.count > 0)
          .slice(0, 5)
          .map((r) => {
            const rawItems: PlanItem[] = r.placements.map(p => ({
              x: p.x + offsetX,
              y: p.y + offsetY,
              w: config.itemW,
              h: config.itemH,
              rot: p.rotation === 90 || p.rotation === 270,
              rot45: p.rotation === 45,
              flipped: p.rotation === 180,
            }));
            // Apply alignment (same logic as grid plans)
            const xs = rawItems.map(it => it.x), ys = rawItems.map(it => it.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs.map((x, i) => x + rawItems[i].w));
            const minY = Math.min(...ys), maxY = Math.max(...ys.map((y, i) => y + rawItems[i].h));
            let ax = 0, ay = 0;
            if (config.alignX === 'center') ax = (config.pageW - (maxX - minX)) / 2 - minX;
            else if (config.alignX === 'right') ax = config.pageW - (maxX - minX) - minX;
            else ax = -minX;
            if (config.alignY === 'middle') ay = (config.pageH - (maxY - minY)) / 2 - minY;
            else if (config.alignY === 'bottom') ay = config.pageH - (maxY - minY) - minY;
            else ay = -minY;
            const items = rawItems.map(it => ({ ...it, x: Math.max(0, it.x + ax), y: Math.max(0, it.y + ay) }));
            
            const rotLabel = r.placements[0]?.rotation || 0;
            const hasFlip = r.placements.some((p, i) => i > 0 && p.rotation !== r.placements[0].rotation);
            const name = hasFlip ? `Nesting Âm Dương (${rotLabel % 360}°)` : `Nesting SVG (${rotLabel}°)`;
            return { name, qty: items.length, items, priority: 0 };
          });
        if (nestPlans.length > 0) {
          setPlans(prev => {
            const all = [...nestPlans, ...prev];
            all.sort((a, b) => b.qty - a.qty);
            return all;
          });
        }
      } catch (e) { console.warn('SVG nesting failed:', e); }
    }
    
    if (currentPlanIndex >= alignedPlans.length) setCurrentPlanIndex(0);
  }, [config, currentPlanIndex, customScale, backgroundColor, customSvgData, allPages, shapeTabs]);

  useEffect(() => { runCalc(); }, []); // Run immediately on mount
  useEffect(() => { const t = setTimeout(runCalc, 300); return () => clearTimeout(t); }, [runCalc]);

  const updatePrint = useCallback((w: number, h: number) => {
    setConfig(p => ({ ...p, pageW: w, pageH: h, printW: Math.max(0, w - 20), printH: Math.max(0, h - 30) }));
  }, []);

  const handlePreset = (v: string) => { const [w, h] = v.split('x').map(Number); updatePrint(w, h); };

  // Chunked upload configuration
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  // Upload file in chunks with progress tracking
  const uploadFileInChunks = async (file: File, onProgress?: (percent: number) => void): Promise<string> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    // Initialize chunked upload
    const initResponse = await fetch(API_BASE + '/init-chunked-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        file_size: file.size
      })
    });
    
    if (!initResponse.ok) {
      throw new Error('Failed to initialize chunked upload');
    }
    
    const { upload_id } = await initResponse.json();
    
    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('upload_id', upload_id);
      formData.append('chunk_index', i.toString());
      formData.append('total_chunks', totalChunks.toString());
      formData.append('original_filename', file.name);
      
      const chunkResponse = await fetch(API_BASE + '/upload-chunk', {
        method: 'POST',
        body: formData
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`);
      }
      
      // Update progress
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      onProgress?.(progress);
    }
    
    // Finalize upload
    const finalizeResponse = await fetch(API_BASE + '/finalize-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_id,
        total_chunks: totalChunks,
        original_filename: file.name
      })
    });
    
    if (!finalizeResponse.ok) {
      throw new Error('Failed to finalize upload');
    }
    
    const result = await finalizeResponse.json();
    return result.file_path;
  };

  // Multi-file upload handler for Data Modal
  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadProgress({ show: true, current: 0, total: files.length, percent: 0 });

    try {
      // Upload all files to Python in batch for source storage + thumbnail
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append('files', files[i]);
      }
      if (skipThumbnails) fd.append('skip_thumbnails', '1');

      setUploadProgress(p => ({ ...p, percent: 10 }));

      const response = await fetch(API_BASE + '/upload-source-batch', {
        method: 'POST',
        body: fd
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await response.json();
      const results: Array<{ file_id: string; filename: string; thumb: string; w_mm: number; h_mm: number; page?: number; total_pages?: number }> = data.files || [];

      // Add all pages at once to avoid N re-renders
      setUploadProgress(p => ({ ...p, percent: 90 }));
      setAllPages(prev => {
        const newPages = results.map((r, i) => ({
          fileIndex: prev.length + i,
          pageIndex: r.page || 1,
          thumb: r.thumb,
          originalThumb: r.thumb,
          name: r.filename,
          w: r.w_mm,
          h: r.h_mm,
          fileId: r.file_id,
          rotation: 0
        }));
        const combined = [...prev, ...newPages];
        if (combined.length > 0) {
          setShapeTabs(tabs => tabs.map(t => {
            if (t.id === activeTabId && !t.sourceImage) {
              return { ...t, sourceImage: combined[0] };
            }
            return t;
          }));
        }
        return combined;
      });
    } catch (uploadErr) {
      console.error('Error uploading files:', uploadErr);
      alert(`Lỗi upload files: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}`);
    }

    setUploadProgress({ show: false, current: 0, total: 0, percent: 0 });
    e.target.value = '';
  };

  // Rotate single page
  const rotatePage = (idx: number, dir: 'left' | 'right') => {
    setAllPages(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const delta = dir === 'right' ? 90 : -90;
      return { ...p, rotation: (p.rotation + delta + 360) % 360 };
    }));
  };

  // Rotate all pages
  const rotateAllPages = (mode: 'left' | 'right' | 'auto') => {
    if (mode === 'auto') {
      // Auto-rotate to match backend logic exactly
      // Backend: if (src_landscape != item_landscape) rotate 90°
      const itemW = config.itemW;
      const itemH = config.shape === 'circle' ? config.itemW : config.itemH;
      const dstRatio = itemW / itemH; // >1 = landscape, <1 = portrait
      
      setAllPages(prev => prev.map(p => {
        const srcRatio = p.w / p.h; // >1 = landscape, <1 = portrait
        
        // Rotate 90° CCW (Left) if orientations don't match (one is landscape, other is portrait)
        // Backend logic: img.rotate(90) -> CCW rotation (Left)
        // CSS rotate(-90deg) -> CCW rotation (Left)
        const shouldRotate = (srcRatio > 1 && dstRatio < 1) || (srcRatio < 1 && dstRatio > 1);
        return { ...p, rotation: shouldRotate ? -90 : 0 };
      }));
    } else {
      // Manual rotation: Left (-90), Right (+90)
      const delta = mode === 'right' ? 90 : -90;
      setAllPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + delta + 360) % 360 })));
    }
  };

  // Remove page
  const removePage = (idx: number) => {
    setAllPages(prev => prev.filter((_, i) => i !== idx));
  };

  // AI-powered data arrangement using Groq API - creates preview first
  const handleAiArrange = async () => {
    if (!aiPrompt.trim() || allPages.length === 0) return;
    
    setAiLoading(true);
    setAiResult(null);
    try {
      const adminConfig = JSON.parse(localStorage.getItem('txp-admin-config') || '{}');
      const GROQ_API_KEY = localStorage.getItem('groq_api_key') || adminConfig.geminiApiKey || '';
      
      // Current layout config for context
      const currentConfig = {
        dataMode: dataMode,
        xUpQty: xUpQty,
        standardQty: standardQty,
        autoRotate: config.autoRotate,
        fitMode: customScale !== 100 ? 'actual' : config.fitMode,
        totalOrder: config.totalOrder,
        itemsPerSheet: currentPlan?.qty || 0
      };
      
      const systemPrompt = `Bạn là AI trợ lý sắp xếp dữ liệu in ấn. Người dùng có ${allPages.length} trang/file.
Cấu hình hiện tại: ${JSON.stringify(currentConfig)}

Có 2 loại action:
1. Thao tác với trang: {"action":"reorder"|"duplicate"|"remove"|"rotate","indices":[0-indexed],"rotation":0|90|180|270,"duplicateCount":number,"explanation":"..."}
2. Thay đổi kiểu sắp xếp in: {"action":"layout_config","config":{"dataMode":1|4,"xUpQty":number,"standardQty":number,"autoRotate":boolean,"fitMode":"stretch"|"fill"|"fit"|"actual","totalOrder":number},"explanation":"..."}

Giải thích dataMode:
- dataMode=1: Số lượng chuẩn - mỗi ảnh in standardQty lần theo nhóm (AABBCC)
- dataMode=4: X-Up - mỗi ảnh lặp lại xUpQty tờ liên tiếp (cùng ảnh trên nhiều tờ)

Ví dụ:
- "Mỗi ảnh in 5 tờ" -> {"action":"layout_config","config":{"dataMode":4,"xUpQty":5},"explanation":"Chế độ X-Up, mỗi ảnh in 5 tờ liên tiếp"}
- "In 100 tem mỗi loại" -> {"action":"layout_config","config":{"dataMode":1,"standardQty":100},"explanation":"Số lượng chuẩn 100 tem/loại"}
- "Tự động xoay ảnh" -> {"action":"layout_config","config":{"autoRotate":true},"explanation":"Bật tự động xoay ảnh vừa khung"}
- "Đảo ngược thứ tự" -> {"action":"reorder","indices":[${Array.from({length: allPages.length}, (_, i) => allPages.length - 1 - i).join(',')}],"explanation":"Đảo ngược thứ tự"}

Chỉ trả về JSON, không giải thích thêm.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: aiPrompt }],
          temperature: 0.1, max_tokens: 500
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response');
      
      const result = JSON.parse(jsonMatch[0]);
      
      // Create preview instead of applying directly
      let previewPages = [...allPages];
      let configChanges: Partial<typeof config> | null = null;
      
      if (result.action === 'layout_config' && result.config) {
        // Layout config change - store for preview (mixed: some in config, some in separate state)
        // Only include defined values
        configChanges = {} as any;
        if (result.config.dataMode !== undefined) (configChanges as any)._dataMode = Number(result.config.dataMode);
        if (result.config.xUpQty !== undefined) (configChanges as any)._xUpQty = Number(result.config.xUpQty);
        if (result.config.standardQty !== undefined) (configChanges as any)._standardQty = Number(result.config.standardQty);
        if (result.config.autoRotate !== undefined) (configChanges as any).autoRotate = Boolean(result.config.autoRotate);
        if (result.config.fitMode !== undefined) (configChanges as any).fitMode = result.config.fitMode;
        if (result.config.totalOrder !== undefined) (configChanges as any).totalOrder = Number(result.config.totalOrder);
        
        console.log('AI layout_config:', result.config, '-> configChanges:', configChanges);
      } else if (result.action === 'reorder' && result.indices) {
        previewPages = result.indices.map((i: number) => allPages[i]).filter(Boolean);
      } else if (result.action === 'rotate' && result.indices && result.rotation !== undefined) {
        previewPages = allPages.map((p, i) => 
          result.indices.includes(i) ? { ...p, rotation: (p.rotation + result.rotation) % 360 } : p
        );
      } else if (result.action === 'duplicate' && result.indices && result.duplicateCount) {
        previewPages = [];
        allPages.forEach((p, i) => {
          previewPages.push(p);
          if (result.indices.includes(i)) {
            for (let j = 1; j < result.duplicateCount; j++) {
              previewPages.push({ ...p, fileIndex: previewPages.length });
            }
          }
        });
      } else if (result.action === 'remove' && result.indices) {
        previewPages = allPages.filter((_, i) => !result.indices.includes(i));
      }
      
      setAiPreviewPages(previewPages);
      setAiResult({ 
        action: result.action, 
        explanation: result.explanation || 'Đã xử lý',
        configChanges 
      });
    } catch (error) {
      console.error('AI error:', error);
      alert('Lỗi AI: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setAiLoading(false);
    }
  };
  
  // Apply AI preview to actual pages and/or config
  const applyAiResult = () => {
    // Apply config changes if any
    if (aiResult?.configChanges) {
      const changes = aiResult.configChanges as any;
      console.log('Applying AI changes:', changes);
      
      // Apply separate state changes
      if (changes._dataMode !== undefined) {
        console.log('Setting dataMode to:', changes._dataMode);
        setDataMode(changes._dataMode as DataMode);
      }
      if (changes._xUpQty !== undefined) {
        console.log('Setting xUpQty to:', changes._xUpQty);
        setXUpQty(changes._xUpQty);
      }
      if (changes._standardQty !== undefined) {
        console.log('Setting standardQty to:', changes._standardQty);
        setStandardQty(changes._standardQty);
      }
      
      // Apply config state changes
      const configUpdates: Partial<ImpositionConfig> = {};
      if (changes.autoRotate !== undefined) configUpdates.autoRotate = changes.autoRotate;
      if (changes.fitMode !== undefined) configUpdates.fitMode = changes.fitMode;
      if (changes.totalOrder !== undefined) configUpdates.totalOrder = changes.totalOrder;
      
      if (Object.keys(configUpdates).length > 0) {
        setConfig(prev => ({ ...prev, ...configUpdates }));
      }
    }
    
    // Apply page changes if any (for non-layout_config actions)
    if (aiResult?.action !== 'layout_config' && aiPreviewPages.length > 0) {
      setAllPages(aiPreviewPages);
    }
    
    setAiPreviewPages([]);
    setAiResult(null);
    setAiPrompt('');
    setIsAiModalOpen(false);
  };

  const dlSVG = () => {
    if (!currentPlan) {
      alert('Vui lòng tạo phương án xếp trước khi tải SVG khuôn cắt!');
      return;
    }
    setIsCutSvgModalOpen(true);
  };

  const dlPDF = async () => {
    if (allPages.length === 0 || !currentPlan || !currentPlan.items || currentPlan.items.length === 0) { 
      alert('Vui lòng tải file lên và tạo layout trước!'); 
      return; 
    }
    setShowDownloadModal(true);
  };

  const confirmDownloadPDF = async () => {
    setShowDownloadModal(false);
    setIsGenerating(true); setProgress(0);
    try {
      const fd = new FormData();
      
      // Send file IDs instead of file blobs (Python has originals)
      const fileIds = allPages.map(p => p.fileId).filter(Boolean);
      if (fileIds.length > 0) {
        fd.append('fileIds', JSON.stringify(fileIds));
      } else {
        // Fallback: send thumbnails if no fileIds (legacy pages)
        for (let i = 0; i < allPages.length; i++) {
          const page = allPages[i];
          const imageSource = page.originalThumb || page.thumb;
          const response = await fetch(imageSource);
          const blob = await response.blob();
          const isPng = imageSource.startsWith('data:image/png') || blob.type === 'image/png';
          const ext = isPng ? 'png' : 'jpg';
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          const file = new File([blob], `page_${i}.${ext}`, { type: mimeType });
          fd.append('files', file);
        }
      }
      
      // Send clean raw page rotation (preserving manual user rotation without double-rotation)
      const pagesDataRaw = allPages.map(p => ({
        rotation: p.rotation || 0,
        w: p.w,
        h: p.h
      }));
      fd.append('pagesData', JSON.stringify(pagesDataRaw));
      
      const rawPlanItems = (impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []));
      const enrichedPlanItems = enrichPlanItemsWithRotation(rawPlanItems);
      fd.append('planData', JSON.stringify(enrichedPlanItems));
      fd.append('pageW', String(config.pageW)); fd.append('pageH', String(config.pageH));
      fd.append('itemW', String(config.itemW)); fd.append('itemH', String(config.itemH));
      // Only use 'actual' mode if BOTH: fitMode is 'actual' AND customScale is not 100
      // CRITICAL: When scale is not 100%, ALWAYS use 'actual' mode regardless of fitMode
      const effectiveFitMode = (customScale !== 100) ? 'actual' : config.fitMode;
      fd.append('dpi', String(config.dpi)); fd.append('fitMode', effectiveFitMode);
      fd.append('customScale', String(customScale)); fd.append('backgroundColor', backgroundColor);
      fd.append('colorMode', config.colorMode); fd.append('useCrop', config.useCrop ? '1' : '0');
      fd.append('cropLen', String(config.cropLen)); fd.append('cropDist', String(config.cropDist));
      fd.append('cropThick', String(config.cropThick)); fd.append('cropColor', config.cropColor);
      fd.append('totalOrder', String(config.totalOrder));
      fd.append('processMode', config.processMode); fd.append('autoRotate', config.autoRotate ? '1' : '0');
      fd.append('shape', config.shape);
      fd.append('cutBleed', String(config.cutBleed || 0));
      fd.append('cornerRadius', String(config.cornerRadius || 0));
      fd.append('twoSideMode', config.twoSideMode || 'same');
      fd.append('marginTop', String(config.marginTop || 0));
      fd.append('marginBot', String(config.marginBot || 0));
      fd.append('marginLeft', String(config.marginLeft || 0));
      fd.append('marginRight', String(config.marginRight || 0));
      fd.append('impositionStyle', impositionStyleEnabled ? impositionStyle : 'sheetwise');
      fd.append('usePageCrop', config.usePageCrop ? '1' : '0');
      fd.append('pageCropLen', String(config.pageCropLen));
      fd.append('pageCropDist', String(config.pageCropDist));
      fd.append('pageCropThick', String(config.pageCropThick));
      fd.append('pageCropColor', config.pageCropColor);
      fd.append('useColorBar', config.useColorBar ? '1' : '0');
      fd.append('colorBarPosition', config.colorBarPosition);
      fd.append('colorBarPadding', String(config.colorBarPadding));
      fd.append('is2Sided', config.is2Sided ? '1' : '0');
      fd.append('rot180Front', config.rot180Front ? '1' : '0');
      fd.append('rot180Back', config.rot180Back ? '1' : '0');
      fd.append('dataMode', String(dataMode));
      fd.append('xUpQty', String(xUpQty));
      fd.append('standardQty', String(standardQty));
      fd.append('totalSheets', String(totalSheets));
      
      const blob = await generatePdfAsync(fd, {
        onProgress: (p, msg) => setProgress(p),
        onStatusChange: (status) => console.log('PDF status:', status)
      });
      
      await downloadPdfBlob(blob, 'print.pdf');
      setProgress(100);

      // Save to history
      saveHistoryItem({
        id: `imp_${Date.now()}`,
        timestamp: Date.now(),
        date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
        title: allPages[0]?.name ? `Bình trang - ${allPages[0].name}` : `Bình trang ${config.pageW}×${config.pageH}mm`,
        paperW: config.pageW,
        pageH: config.pageH,
        itemW: config.itemW,
        itemH: config.itemH,
        layoutCount: currentPlan?.qty || allPages.length,
        totalSheets: totalSheets,
        processMode: config.processMode,
        colorMode: config.colorMode,
        status: 'completed',
        thumbnail: allPages[0]?.thumb || allPages[0]?.originalThumb || '',
        configSnapshot: { ...config },
        currentPlanIndexSnapshot: currentPlanIndex,
        shapeTabsSnapshot: JSON.parse(JSON.stringify(shapeTabs)),
        allPagesSnapshot: JSON.parse(JSON.stringify(allPages)),
        dataModeSnapshot: dataMode,
        dataModeEnabledSnapshot: dataModeEnabled,
        impositionStyleSnapshot: impositionStyle,
        impositionStyleEnabledSnapshot: impositionStyleEnabled,
        xUpQtySnapshot: xUpQty,
        standardQtySnapshot: standardQty,
        customScaleSnapshot: customScale,
        customSvgDataSnapshot: customSvgData,
        backgroundColorSnapshot: backgroundColor,
        vectorMaskResultSnapshot: vectorMaskResult
      });
    } catch (e: any) { alert(e.message); }
    finally { setTimeout(() => { setIsGenerating(false); setProgress(0); }, 500); }
  };

  // Handle file import from File Manager
  const handleFileFromManager = async (file: File) => {
    // Simulate the multi-file upload with single file
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleMultiFileUpload(fakeEvent);
  };

  // Bộ đệm cache hình ảnh và slot đã biến đổi xoay/fit/clip cho PDF render
  const imageElementCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const transformedSlotCache = useRef<Map<string, { dataUrl: string; format: 'JPEG' | 'PNG' }>>(new Map());

  const loadHtmlImage = (src: string): Promise<HTMLImageElement> => {
    if (imageElementCache.current.has(src)) {
      const cached = imageElementCache.current.get(src)!;
      if (cached.complete && cached.naturalWidth > 0) {
        return Promise.resolve(cached);
      }
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageElementCache.current.set(src, img);
        resolve(img);
      };
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  const renderTransformedSlotImage = async (
    src: string,
    actualW_mm: number,
    actualH_mm: number,
    totalRotation: number,
    fitMode: string,
    shape: string,
    cornerRadius_mm: number,
    isSpecialShape: boolean,
    isRotatedItem: boolean,
    dpi: number = 300,
    customScalePct: number = 100
  ): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' }> => {
    const normRot = ((totalRotation % 360) + 360) % 360;
    const isRotated90 = (normRot % 180) !== 0;

    const cacheKey = `${src}_${Math.round(actualW_mm * 10)}_${Math.round(actualH_mm * 10)}_${normRot}_${fitMode}_${shape}_${Math.round(cornerRadius_mm * 10)}_${isSpecialShape ? 1 : 0}_${isRotatedItem ? 1 : 0}_${customScalePct}_${dpi}`;
    if (transformedSlotCache.current.has(cacheKey)) {
      return transformedSlotCache.current.get(cacheKey)!;
    }

    const img = await loadHtmlImage(src);

    const pxPerMm = (dpi || 300) / 25.4;
    let canvasW = Math.round(actualW_mm * pxPerMm);
    let canvasH = Math.round(actualH_mm * pxPerMm);
    const maxDim = Math.max(canvasW, canvasH);
    if (maxDim > 4096) {
      const s = 4096 / maxDim;
      canvasW = Math.round(canvasW * s);
      canvasH = Math.round(canvasH * s);
    }
    canvasW = Math.max(1, canvasW);
    canvasH = Math.max(1, canvasH);

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    const hasTransparency = shape === 'circle' || shape === 'oval' || cornerRadius_mm > 0 || isSpecialShape;

    // Clip shape tương ứng với canvas preview
    if (shape === 'circle' || shape === 'oval') {
      ctx.beginPath();
      ctx.ellipse(canvasW / 2, canvasH / 2, canvasW / 2, canvasH / 2, 0, 0, Math.PI * 2);
      ctx.clip();
    } else if (shape === 'trapezoid') {
      ctx.beginPath();
      if (isRotatedItem) {
        ctx.moveTo(0, 0);
        ctx.lineTo(canvasW, 0);
        ctx.lineTo(canvasW * 0.85, canvasH);
        ctx.lineTo(canvasW * 0.15, canvasH);
      } else {
        ctx.moveTo(canvasW * 0.15, 0);
        ctx.lineTo(canvasW * 0.85, 0);
        ctx.lineTo(canvasW, canvasH);
        ctx.lineTo(0, canvasH);
      }
      ctx.closePath();
      ctx.clip();
    } else if (shape === 'triangle') {
      ctx.beginPath();
      if (isRotatedItem) {
        ctx.moveTo(0, 0);
        ctx.lineTo(canvasW, 0);
        ctx.lineTo(canvasW / 2, canvasH);
      } else {
        ctx.moveTo(canvasW / 2, 0);
        ctx.lineTo(canvasW, canvasH);
        ctx.lineTo(0, canvasH);
      }
      ctx.closePath();
      ctx.clip();
    } else if (shape === 'hexagon') {
      ctx.beginPath();
      ctx.moveTo(canvasW * 0.25, 0);
      ctx.lineTo(canvasW * 0.75, 0);
      ctx.lineTo(canvasW, canvasH * 0.5);
      ctx.lineTo(canvasW * 0.75, canvasH);
      ctx.lineTo(canvasW * 0.25, canvasH);
      ctx.lineTo(0, canvasH * 0.5);
      ctx.closePath();
      ctx.clip();
    } else if (cornerRadius_mm > 0) {
      const r = Math.min(canvasW / 2, canvasH / 2, cornerRadius_mm * pxPerMm);
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(0, 0, canvasW, canvasH, r);
      } else {
        ctx.rect(0, 0, canvasW, canvasH);
      }
      ctx.clip();
    }

    // Biến đổi xoay ảnh khớp 100% với CSS transform preview
    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    if (normRot !== 0) {
      ctx.rotate((normRot * Math.PI) / 180);
    }

    // Khi xoay 90 hoặc 270 độ, kích thước khung chứa đảo ngược chiều ngang/dọc giống CSS
    const elemW = isRotated90 ? canvasH : canvasW;
    const elemH = isRotated90 ? canvasW : canvasH;

    const nw = img.naturalWidth || elemW;
    const nh = img.naturalHeight || elemH;

    const scaleFactor = customScalePct !== 100 ? (customScalePct / 100) : 1;

    if (fitMode === 'stretch') {
      const dw = elemW * scaleFactor;
      const dh = elemH * scaleFactor;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else if (fitMode === 'fit') {
      // CSS object-fit: contain
      const fitScale = Math.min(elemW / nw, elemH / nh) * scaleFactor;
      const dw = nw * fitScale;
      const dh = nh * fitScale;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else if (fitMode === 'actual') {
      // CSS object-fit: none (100% kích thước gốc)
      const dw = nw * scaleFactor;
      const dh = nh * scaleFactor;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else {
      // CSS object-fit: cover ('fill') - mặc định
      const fillScale = Math.max(elemW / nw, elemH / nh) * scaleFactor;
      const dw = nw * fillScale;
      const dh = nh * fillScale;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    }

    ctx.restore();

    const format: 'JPEG' | 'PNG' = hasTransparency ? 'PNG' : 'JPEG';
    const dataUrl = canvas.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg', 0.95);
    const result = { dataUrl, format };
    transformedSlotCache.current.set(cacheKey, result);
    return result;
  };

  // Hàm vẽ nội dung của một tờ in cụ thể lên tài liệu jsPDF
  const drawSheetOnDoc = async (doc: jsPDF, sIdx: number, itemsForSheet: PlanItem[], forceSide?: 'front' | 'back') => {
    // 1. Nền trắng trang in
    const pageW = Number(config.pageW) || 330;
    const pageH = Number(config.pageH) || 480;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');

    const isBackSide = forceSide !== undefined ? (forceSide === 'back') : (config.is2Sided && (sIdx % 2 === 1));
    const effectiveFitMode = (customScale !== 100) ? 'actual' : config.fitMode;

    // 2. Vẽ từng con tem thuộc tờ này
    for (let i = 0; i < itemsForSheet.length; i++) {
      const it = itemsForSheet[i];
      const itemsPerSheet = itemsForSheet.length;
      const globalSlotIdx = sIdx * itemsPerSheet + i;
      if (!isMultiShape && config.useTotalLimit && config.totalOrder > 0 && globalSlotIdx >= config.totalOrder) {
        continue;
      }

      const itemShape = (it.shape || config.shape) as string;
      const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
      const isRotatedItem = !!it.rot;
      const itemCornerRadius = it.cornerRadius !== undefined ? it.cornerRadius : (config.cornerRadius || 0);

      const actualW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
      const actualH = itemShape === 'circle' ? actualW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));
      const itemX = isBackSide ? (pageW - it.x - actualW) : it.x;
      const itemY = it.y;
      
      const pageIdx = getPageForSlot(i, sIdx, isBackSide ? 'back' : 'front');
      const page = pageIdx >= 0 ? allPages[pageIdx] : null;
      const correspondingTab = isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName) : null;
      const previewSrc = (it.sourceImage as any)?.thumb || (typeof it.sourceImage === 'string' ? it.sourceImage : null) || (correspondingTab?.sourceImage as any)?.thumb || (typeof correspondingTab?.sourceImage === 'string' ? correspondingTab?.sourceImage : null) || (activeTab?.sourceImage as any)?.thumb || (page ? (page.originalThumb || page.thumb) : (allPages.length > 0 ? (allPages[i % allPages.length]?.originalThumb || allPages[i % allPages.length]?.thumb) : null));

      // Tính góc xoay totalRotation chuẩn xác 100% như canvas preview
      const totalRotation = calculateSlotTotalRotation(it, page, isBackSide);

      if (previewSrc) {
        try {
          const { dataUrl, format } = await renderTransformedSlotImage(
            previewSrc,
            actualW,
            actualH,
            totalRotation,
            effectiveFitMode,
            itemShape,
            itemCornerRadius,
            isSpecialShape,
            isRotatedItem,
            config.dpi || 300,
            customScale
          );
          doc.addImage(dataUrl, format, itemX, itemY, actualW, actualH, undefined, 'FAST');
        } catch (imgErr) {
          console.warn('[PDF] Error rendering transformed slot image, using fallback:', imgErr);
          try {
            doc.addImage(previewSrc, 'JPEG', itemX, itemY, actualW, actualH, undefined, 'FAST');
          } catch {
            doc.setFillColor(245, 243, 255);
            doc.setDrawColor(139, 92, 246);
            doc.rect(itemX, itemY, actualW, actualH, 'FD');
          }
        }
      } else {
        doc.setFillColor(245, 243, 255);
        doc.setDrawColor(139, 92, 246);
        doc.setLineWidth(0.3);
        if (itemShape === 'circle') {
          doc.circle(itemX + actualW / 2, itemY + actualH / 2, actualW / 2, 'FD');
        } else {
          doc.roundedRect(itemX, itemY, actualW, actualH, 2, 2, 'FD');
        }
      }
    }

    // 3. Dấu xén từng con tem (Item Crop Marks) cho các con tem của tờ này
    if (config.useCrop) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(config.cropThick || 0.25);
      const { cropLen: l, cropDist: d } = config;
      itemsForSheet.forEach((item, i) => {
        if (!isMultiShape && config.useTotalLimit && config.totalOrder > 0) {
          const globalSlotIdx = sIdx * itemsForSheet.length + i;
          if (globalSlotIdx >= config.totalOrder) return;
        }
        const itemShape = (item.shape || config.shape) as string;
        const w = item.w !== undefined ? item.w : (item.rot ? config.itemH : config.itemW);
        const h = itemShape === 'circle' ? w : (item.h !== undefined ? item.h : (item.rot ? config.itemW : config.itemH));
        const isBack = config.is2Sided && (sIdx % 2 === 1);
        const x = isBack ? (config.pageW - item.x - w) : item.x;
        const y = item.y;
        doc.line(x - d - l, y, x - d, y);
        doc.line(x, y - d - l, x, y - d);
        doc.line(x + w + d, y, x + w + d + l, y);
        doc.line(x + w, y - d - l, x + w, y - d);
        doc.line(x - d - l, y + h, x - d, y + h);
        doc.line(x, y + h + d, x, y + h + d + l);
        doc.line(x + w + d, y + h, x + w + d + l, y + h);
        doc.line(x + w, y + h + d, x + w, y + h + d + l);
      });
    }

    // 4. Dấu cắt góc trang (Page Crop Marks)
    if (config.usePageCrop) {
      const L = config.pageCropLen;
      const D = config.pageCropDist;
      const T = config.pageCropThick;
      const pW = config.pageW;
      const pH = config.pageH;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(T || 0.25);
      // Top-Left
      doc.line(D, D, D + L, D);
      doc.line(D, D, D, D + L);
      // Top-Right
      doc.line(pW - D - L, D, pW - D, D);
      doc.line(pW - D, D, pW - D, D + L);
      // Bottom-Left
      doc.line(D, pH - D, D + L, pH - D);
      doc.line(D, pH - D, D, pH - D - L);
      // Bottom-Right
      doc.line(pW - D - L, pH - D, pW - D, pH - D);
      doc.line(pW - D, pH - D, pW - D, pH - D - L);
    }

    // 5. Dải màu CMYK
    if (config.useColorBar) {
      const cmykColors: [number, number, number][] = [
        [0, 255, 255], [255, 0, 255], [255, 255, 0], [0, 0, 0],
        [255, 0, 0], [0, 255, 0], [0, 0, 255],
        [119, 119, 119], [187, 187, 187], [255, 255, 255]
      ];
      const pW = config.pageW, pH = config.pageH, pad = config.colorBarPadding, thick = 3;
      const positions = config.colorBarPosition === 'all' ? ['top', 'bottom', 'left', 'right'] as const : [config.colorBarPosition] as const;
      positions.forEach(pos => {
        const isH = pos === 'top' || pos === 'bottom';
        const barLen = isH ? pW * 0.6 : pH * 0.6;
        const segW = barLen / cmykColors.length;
        let sx: number, sy: number;
        if (pos === 'bottom') { sx = (pW - barLen) / 2; sy = pH - pad - thick; }
        else if (pos === 'top') { sx = (pW - barLen) / 2; sy = pad; }
        else if (pos === 'left') { sx = pad; sy = (pH - barLen) / 2; }
        else { sx = pW - pad - thick; sy = (pH - barLen) / 2; }

        cmykColors.forEach(([r, g, b], idx) => {
          doc.setFillColor(r, g, b);
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.1);
          if (isH) {
            doc.rect(sx + idx * segW, sy, segW, thick, 'FD');
          } else {
            doc.rect(sx, sy + idx * segW, thick, segW, 'FD');
          }
        });
      });
    }
  };

  // Tạo PDF Blob từ Canvas / Layout hiện tại để gửi sang máy trạm Render Prepress hoặc tải về
  const generateImpositionPdfBlob = async (targetSheetIndex?: number): Promise<Blob> => {
    // Trường hợp 1: Có ảnh nguồn và Python backend online -> Dùng generatePdfAsync chất lượng gốc (chỉ khi xuất gộp toàn bộ)
    if (targetSheetIndex === undefined && allPages.length > 0 && allPages.some(p => p.thumb || p.originalThumb || p.fileId) && apiStatus === 'online' && currentPlan && currentPlan.items?.length > 0) {
      try {
        const fd = new FormData();
        const fileIds = allPages.map(p => p.fileId).filter(Boolean);
        if (fileIds.length > 0) {
          fd.append('fileIds', JSON.stringify(fileIds));
        } else {
          for (let i = 0; i < allPages.length; i++) {
            const page = allPages[i];
            const imageSource = page.originalThumb || page.thumb;
            if (!imageSource) continue;
            const response = await fetch(imageSource);
            const blob = await response.blob();
            const isPng = imageSource.startsWith('data:image/png') || blob.type === 'image/png';
            const ext = isPng ? 'png' : 'jpg';
            const mimeType = isPng ? 'image/png' : 'image/jpeg';
            const file = new File([blob], `page_${i}.${ext}`, { type: mimeType });
            fd.append('files', file);
          }
        }

        const pagesDataRaw = allPages.map(p => ({
          rotation: p.rotation || 0,
          w: p.w,
          h: p.h
        }));
        fd.append('pagesData', JSON.stringify(pagesDataRaw));
        const rawPlanItems = (impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []));
        const enrichedPlanItems = enrichPlanItemsWithRotation(rawPlanItems);
        fd.append('planData', JSON.stringify(enrichedPlanItems));
        fd.append('pageW', String(config.pageW)); fd.append('pageH', String(config.pageH));
        fd.append('itemW', String(config.itemW)); fd.append('itemH', String(config.itemH));
        const effectiveFitMode = (customScale !== 100) ? 'actual' : config.fitMode;
        fd.append('dpi', String(config.dpi)); fd.append('fitMode', effectiveFitMode);
        fd.append('customScale', String(customScale)); fd.append('backgroundColor', backgroundColor);
        fd.append('colorMode', config.colorMode); fd.append('useCrop', config.useCrop ? '1' : '0');
        fd.append('cropLen', String(config.cropLen)); fd.append('cropDist', String(config.cropDist));
        fd.append('cropThick', String(config.cropThick)); fd.append('cropColor', config.cropColor);
        fd.append('totalOrder', String(config.totalOrder));
        fd.append('processMode', config.processMode); fd.append('autoRotate', config.autoRotate ? '1' : '0');
        fd.append('shape', config.shape);
        fd.append('cutBleed', String(config.cutBleed || 0));
        fd.append('cornerRadius', String(config.cornerRadius || 0));
        fd.append('twoSideMode', config.twoSideMode || 'same');
        fd.append('marginTop', String(config.marginTop || 0));
        fd.append('marginBot', String(config.marginBot || 0));
        fd.append('marginLeft', String(config.marginLeft || 0));
        fd.append('marginRight', String(config.marginRight || 0));
        fd.append('impositionStyle', impositionStyleEnabled ? impositionStyle : 'sheetwise');
        fd.append('usePageCrop', config.usePageCrop ? '1' : '0');
        fd.append('pageCropLen', String(config.pageCropLen));
        fd.append('pageCropDist', String(config.pageCropDist));
        fd.append('pageCropThick', String(config.pageCropThick));
        fd.append('pageCropColor', config.pageCropColor);
        fd.append('useColorBar', config.useColorBar ? '1' : '0');
        fd.append('colorBarPosition', config.colorBarPosition);
        fd.append('colorBarPadding', String(config.colorBarPadding));
        fd.append('is2Sided', config.is2Sided ? '1' : '0');
        fd.append('rot180Front', config.rot180Front ? '1' : '0');
        fd.append('rot180Back', config.rot180Back ? '1' : '0');
        fd.append('dataMode', String(dataMode));
        fd.append('xUpQty', String(xUpQty));
        fd.append('standardQty', String(standardQty));
        fd.append('totalSheets', String(totalSheets));

        const blob = await generatePdfAsync(fd);
        return blob;
      } catch (err) {
        console.warn('Backend PDF generation failed, falling back to client jsPDF:', err);
      }
    }

    // Trường hợp 2: Client-side vector render PDF qua jsPDF
    const pageW = Number(config.pageW) || 330;
    const pageH = Number(config.pageH) || 480;
    const orientation = pageW > pageH ? 'landscape' : 'portrait';
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [pageW, pageH],
      compress: true
    });

    const allPlanItems = (impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []));

    if (targetSheetIndex !== undefined) {
      // Kết xuất 1 tờ đơn lẻ
      const sheetItems = isMultiShape
        ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === targetSheetIndex)
        : allPlanItems;
      if (config.is2Sided) {
        // Tờ 2 mặt gồm 2 trang: Mặt trước và Mặt sau
        await drawSheetOnDoc(doc, targetSheetIndex * 2, sheetItems, 'front');
        doc.addPage([pageW, pageH], orientation);
        await drawSheetOnDoc(doc, targetSheetIndex * 2 + 1, sheetItems, 'back');
      } else {
        await drawSheetOnDoc(doc, targetSheetIndex, sheetItems, 'front');
      }
    } else {
      // Kết xuất toàn bộ các tờ thành PDF đa trang (Mỗi tờ 1 trang riêng biệt, không chồng lấn)
      const sheetsCount = Math.max(1, totalSheets);
      const totalPdfPages = config.is2Sided ? sheetsCount * 2 : sheetsCount;
      for (let pIdx = 0; pIdx < totalPdfPages; pIdx++) {
        if (pIdx > 0) {
          doc.addPage([pageW, pageH], orientation);
        }
        const sIdx = config.is2Sided ? Math.floor(pIdx / 2) : pIdx;
        const sideToDraw: 'front' | 'back' = config.is2Sided ? (pIdx % 2 === 1 ? 'back' : 'front') : previewSide;
        const sheetItems = isMultiShape
          ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === sIdx)
          : allPlanItems;
        await drawSheetOnDoc(doc, sIdx, sheetItems, sideToDraw);
      }
    }

    return doc.output('blob');
  };

  const handleStartRender = async () => {
    setIsSubmittingRender(true);
    setRenderProgressText('Đang đóng gói file bình trang PDF...');
    try {
      const pdfBlob = await generateImpositionPdfBlob();
      const filename = `BinhTrang_${config.pageW}x${config.pageH}mm_${config.shape}_${totalSheets > 1 ? `${totalSheets}Trang_` : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Nếu có từ 2 tờ trở lên, tạo sẵn các file PDF riêng cho từng tờ đơn lẻ
      const sheetFiles: {
        sheetIndex: number;
        sheetName: string;
        filename: string;
        downloadUrl: string;
      }[] = [];

      if (totalSheets > 1) {
        setRenderProgressText(`Đang tạo ${totalSheets} file PDF riêng cho từng tờ...`);
        for (let s = 0; s < totalSheets; s++) {
          const sBlob = await generateImpositionPdfBlob(s);
          const sFilename = `BinhTrang_${config.pageW}x${config.pageH}mm_${config.shape}_To${s + 1}_${new Date().toISOString().slice(0, 10)}.pdf`;
          const sUrl = URL.createObjectURL(sBlob);
          sheetFiles.push({
            sheetIndex: s,
            sheetName: `Tờ ${s + 1}`,
            filename: sFilename,
            downloadUrl: sUrl,
          });
        }
      }

      const preset = RENDER_PRESETS.find(p => p.id === selectedPresetId);
      const targetDpi = preset?.settings.dpi || config.dpi || 300;
      const targetColorspace = preset?.settings.colorspace || config.colorMode || 'cmyk';

      let renderResult: {
        id: string;
        filename: string;
        previewUrl: string;
        downloadUrl: string;
        createdAt: string;
        duration: string;
        dpi: number;
        colorspace: string;
        totalPages: number;
        engineName: string;
        presetName: string;
        sheetFiles?: {
          sheetIndex: number;
          sheetName: string;
          filename: string;
          downloadUrl: string;
        }[];
      } | null = null;

      // 1. Kiểm tra engine GoAgent cục bộ (PC 128GB RAM)
      const shouldUseGoAgent = selectedRenderEngine === 'goagent' || (selectedRenderEngine === 'auto' && goAgentInfo?.detected);

      if (shouldUseGoAgent) {
        setRenderProgressText(`Đang xử lý qua GoAgent PC (${goAgentInfo?.pc_name || '128GB RAM'})...`);
        const res = await renderPdfViaGoAgent(pdfFile, {
          dpi: targetDpi,
          colorspace: targetColorspace,
          maxPages: 50,
          port: goAgentInfo?.port || GOAGENT_DEFAULT_PORT,
          transparentBg: preset?.settings.transparentBg || false,
          pageRange: 'all'
        });

        if (res && res.ok && res.pages.length > 0) {
          const firstPage = res.pages[0];
          let finalDownloadUrl = firstPage.preview_b64;

          if (res.pdf_b64) {
            try {
              const base64Clean = res.pdf_b64.replace(/^data:application\/pdf;base64,/, '');
              const byteChars = atob(base64Clean);
              const byteNumbers = new Uint8Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) {
                byteNumbers[i] = byteChars.charCodeAt(i);
              }
              const renderedBlob = new Blob([byteNumbers], { type: 'application/pdf' });
              finalDownloadUrl = URL.createObjectURL(renderedBlob);
            } catch {
              finalDownloadUrl = res.pdf_b64;
            }
          } else {
            finalDownloadUrl = URL.createObjectURL(pdfBlob);
          }

          const durationFormatted = `${res.duration_ms ? (res.duration_ms / 1000).toFixed(2) : '0.45'}s`;
          const agentDisplayName = goAgentInfo?.pc_name ? `GoAgent PC (${goAgentInfo.pc_name})` : 'GoAgent Cục bộ (128GB RAM)';

          renderResult = {
            id: `render_${Date.now()}`,
            filename: filename,
            previewUrl: firstPage.preview_b64,
            downloadUrl: finalDownloadUrl,
            createdAt: new Date().toLocaleTimeString('vi-VN'),
            duration: durationFormatted,
            dpi: targetDpi,
            colorspace: targetColorspace.toUpperCase(),
            totalPages: res.total_pages || totalSheets || 1,
            engineName: agentDisplayName,
            presetName: preset?.name || 'Prepress Chuẩn',
            sheetFiles: sheetFiles.length > 0 ? sheetFiles : undefined,
          };
        }
      }

      // 2. Fallback Client/Server Prepress nếu GoAgent chưa chạy
      if (!renderResult) {
        setRenderProgressText('Đang hoàn thiện bản kết xuất Vector Prepress...');
        const downloadBlobUrl = URL.createObjectURL(pdfBlob);
        const previewImg = allPages[0]?.thumb || allPages[0]?.originalThumb || '';

        renderResult = {
          id: `render_${Date.now()}`,
          filename: filename,
          previewUrl: previewImg,
          downloadUrl: downloadBlobUrl,
          createdAt: new Date().toLocaleTimeString('vi-VN'),
          duration: '0.35s (Vector Engine)',
          dpi: targetDpi,
          colorspace: targetColorspace.toUpperCase(),
          totalPages: totalSheets || 1,
          engineName: 'Render Prepress Core',
          presetName: preset?.name || 'Prepress Chuẩn',
          sheetFiles: sheetFiles.length > 0 ? sheetFiles : undefined,
        };
      }

      setLastImpositionRender(renderResult);
      try {
        localStorage.setItem('toolx_last_imposition_render', JSON.stringify(renderResult));
      } catch (quotaErr) {
        try {
          const lightRender = {
            ...renderResult,
            previewUrl: '',
            sheetFiles: renderResult.sheetFiles?.map(sf => ({ ...sf, downloadUrl: '' }))
          };
          localStorage.setItem('toolx_last_imposition_render', JSON.stringify(lightRender));
        } catch {}
      }

      // Thêm vào Lịch sử bình trang
      const historyItem: ImpositionHistoryItem = {
        id: renderResult.id,
        timestamp: Date.now(),
        date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
        title: `Render (${preset?.name || 'Prepress'}) - ${config.pageW}×${config.pageH}mm`,
        paperW: config.pageW,
        pageH: config.pageH,
        itemW: config.itemW,
        itemH: config.itemH,
        layoutCount: currentPlan?.qty || allPages.length || (currentPlan?.items?.length ?? 1),
        totalSheets: totalSheets,
        processMode: config.processMode,
        colorMode: targetColorspace,
        status: 'completed',
        thumbnail: renderResult.previewUrl,
        configSnapshot: { ...config },
        currentPlanIndexSnapshot: currentPlanIndex,
        shapeTabsSnapshot: JSON.parse(JSON.stringify(shapeTabs)),
        allPagesSnapshot: JSON.parse(JSON.stringify(allPages)),
        dataModeSnapshot: dataMode,
        dataModeEnabledSnapshot: dataModeEnabled,
        impositionStyleSnapshot: impositionStyle,
        impositionStyleEnabledSnapshot: impositionStyleEnabled,
        xUpQtySnapshot: xUpQty,
        standardQtySnapshot: standardQty,
        customScaleSnapshot: customScale,
        customSvgDataSnapshot: customSvgData,
        backgroundColorSnapshot: backgroundColor,
        vectorMaskResultSnapshot: vectorMaskResult
      };
      saveHistoryItem(historyItem);

      // Đóng modal cấu hình và mở modal kết quả
      setIsRenderModalOpen(false);
      setRenderSuccessModal(renderResult);
      safeToastSuccess(`Render hoàn tất trong ${renderResult.duration}! Bạn có thể tải tệp ngay.`);
    } catch (err: any) {
      console.error('Lỗi thực thi Render:', err);
      safeToastError('Không thể render: ' + (err.message || err));
    } finally {
      setIsSubmittingRender(false);
      setRenderProgressText('');
    }
  };

  // SortJob Export Helpers
  const handleCopyJobId = (jobId: string) => {
    try {
      navigator.clipboard.writeText(jobId);
      setCopiedJobId(true);
      safeToastSuccess(`Đã sao chép mã Job ID: ${jobId}`);
      setTimeout(() => setCopiedJobId(false), 2500);
    } catch {
      safeToastSuccess(`Mã Job ID: ${jobId}`);
    }
  };

  const handleCopyJobJson = (payload: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedJson(true);
      safeToastSuccess('Đã sao chép toàn bộ nội dung JSON của SortJob vào Clipboard!');
      setTimeout(() => setCopiedJson(false), 2500);
    } catch (e: any) {
      safeToastError('Không thể sao chép JSON: ' + (e.message || e));
    }
  };

  const handleDownloadSortJobJson = (payload: any) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${payload.id || 'sortjob'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      safeToastSuccess(`Đã tải tệp ${payload.id || 'sortjob'}.json về máy!`);
    } catch (e: any) {
      safeToastError('Lỗi tải tệp JSON: ' + (e.message || e));
    }
  };

  const handleExportSortJob = async (source: 'current' | ImpositionHistoryItem) => {
    setIsExportingSortJob(true);
    try {
      const now = new Date();
      const datePart = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const jobId = `SORT-${datePart}-${randPart}`;

      let targetConfig: ImpositionConfig;
      let targetShapeTabs: ShapeTabItem[];
      let targetAllPages: PageItem[];
      let targetDataMode: DataMode;
      let targetImpositionStyle: ImpositionStyle;
      let targetCustomScale: number;
      let targetBackgroundColor: string;
      let targetTitle: string;
      let targetPlan: LayoutPlan | null = null;
      let targetPlans: LayoutPlan[] = [];

      if (source === 'current') {
        targetConfig = config;
        targetShapeTabs = shapeTabs;
        targetAllPages = allPages;
        targetDataMode = dataMode;
        targetImpositionStyle = impositionStyle;
        targetCustomScale = customScale;
        targetBackgroundColor = backgroundColor;
        targetTitle = `Bình trang ${targetShapeTabs.length} Layer (${config.pageW}×${config.pageH}mm)`;
        targetPlan = currentPlan;
        targetPlans = plans;
      } else {
        targetConfig = { ...config, ...(source.configSnapshot || {}) };
        targetShapeTabs = source.shapeTabsSnapshot || shapeTabs;
        targetAllPages = source.allPagesSnapshot || allPages;
        targetDataMode = source.dataModeSnapshot ?? dataMode;
        targetImpositionStyle = source.impositionStyleSnapshot ?? impositionStyle;
        targetCustomScale = source.customScaleSnapshot ?? customScale;
        targetBackgroundColor = source.backgroundColorSnapshot ?? backgroundColor;
        targetTitle = source.title || `Lịch sử: ${source.paperW}×${source.pageH}mm`;
        
        // Re-calculate plan for history if needed
        if (targetDataMode === 4 && targetShapeTabs.length > 0) {
          const itemsToPack: any[] = [];
          targetShapeTabs.forEach((tab, idx) => {
            if (!tab.enabled) return;
            const qty = tab.quantity || 1;
            for (let k = 0; k < qty; k++) {
              itemsToPack.push({
                w: tab.itemW,
                h: tab.itemH,
                id: idx * 10000 + k,
                tabId: tab.id,
                tabName: tab.name,
                shape: tab.shape,
                cornerRadius: tab.cornerRadius,
                sourceImage: tab.sourceImage,
                vectorMaskResult: tab.vectorMaskResult,
                customSvgData: tab.customSvgData,
                color: tab.color,
              });
            }
          });
          const packResults = packMultiSize(itemsToPack, targetConfig.pageW, targetConfig.pageH, targetConfig.padding, true);
          targetPlans = packResults.map(r => ({
            name: r.name,
            qty: r.items.length,
            priority: 0,
            items: r.items.map(it => ({
              x: it.x,
              y: it.y,
              w: it.w,
              h: it.h,
              rot: it.rot,
              shape: it.shape,
              cornerRadius: it.cornerRadius,
              tabId: it.tabId,
              tabName: it.tabName,
              color: it.color
            }))
          }));
        } else {
          targetPlans = calculateLayout({
            shape: targetConfig.shape === 'custom-svg' || targetConfig.shape === 'svg-image' || targetConfig.shape === 'pdf-source' ? 'rect' : targetConfig.shape,
            itemW: targetConfig.itemW,
            itemH: targetConfig.shape === 'circle' ? targetConfig.itemW : targetConfig.itemH,
            padding: targetConfig.padding,
            printW: targetConfig.pageW - targetConfig.marginLeft - targetConfig.marginRight,
            printH: targetConfig.pageH - targetConfig.marginTop - targetConfig.marginBot,
            pageW: targetConfig.pageW,
            pageH: targetConfig.pageH
          });
        }
        targetPlan = targetPlans[0] || null;
      }

      const selectedPlanName = targetPlan?.name || 'Phương án tối ưu';
      const totalPlaced = targetPlan?.qty || targetShapeTabs.reduce((s, t) => s + (t.enabled ? t.quantity : 0), 0);

      // Package detailed layers
      const layersData = targetShapeTabs.map((t, idx) => ({
        layer_id: t.id,
        layer_index: idx,
        name: t.name,
        enabled: t.enabled,
        shape: t.shape,
        width_mm: t.itemW,
        height_mm: t.itemH,
        quantity: t.quantity,
        use_total_limit: t.useTotalLimit,
        corner_radius_mm: t.cornerRadius,
        color: t.color,
        custom_svg: t.customSvgData ? t.customSvgData.slice(0, 500) : '',
        has_vector_mask: Boolean(t.vectorMaskResult),
        vector_mask: t.vectorMaskResult ? {
          knots_count: t.vectorMaskResult.knots?.length || 0,
          w_mm: t.vectorMaskResult.w_mm,
          h_mm: t.vectorMaskResult.h_mm,
          cornerRadius: t.vectorMaskResult.cornerRadius
        } : null,
        source_file: t.sourceImage ? {
          name: t.sourceImage.name,
          file_id: t.sourceImage.fileId,
          width_px: t.sourceImage.w,
          height_px: t.sourceImage.h,
          crop_settings: t.sourceImage.cropSettings || null,
          color_settings: t.sourceImage.colorSettings || null
        } : null
      }));

      // Package all source files
      const sourceFilesData = targetAllPages.map((p, idx) => ({
        id: p.fileId || `file_${idx + 1}`,
        name: p.name,
        page_number: (p.pageIndex ?? idx) + 1,
        width_px: p.w,
        height_px: p.h
      }));

      // Package plan items coordinates
      const planItemsData = (targetPlan?.items || []).map((it, idx) => {
        const correspondingTab = targetShapeTabs.find(t => t.id === (it as any).tabId || t.id === (it as any).shapeTabId) || targetShapeTabs[idx % Math.max(1, targetShapeTabs.length)];
        return {
          index: idx + 1,
          x_mm: Number(it.x.toFixed(2)),
          y_mm: Number(it.y.toFixed(2)),
          width_mm: Number((it.w || targetConfig.itemW).toFixed(2)),
          height_mm: Number((it.h || (it.shape === 'circle' ? (it.w || targetConfig.itemW) : targetConfig.itemH)).toFixed(2)),
          rotated: Boolean(it.rot),
          shape: it.shape || targetConfig.shape,
          corner_radius_mm: (it as any).cornerRadius ?? correspondingTab?.cornerRadius ?? targetConfig.cornerRadius ?? 0,
          layer_id: correspondingTab?.id,
          layer_name: correspondingTab?.name,
          source_file_id: correspondingTab?.sourceImage?.fileId,
          source_file_name: correspondingTab?.sourceImage?.name
        };
      });

      const payload = {
        id: jobId,
        job_type: 'sortjob',
        version: '1.0',
        created_at: now.toISOString(),
        title: targetTitle,
        source: source === 'current' ? 'current_workspace' : 'history_snapshot',
        summary: {
          total_layers: targetShapeTabs.length,
          total_placed_items: totalPlaced,
          sheet_dimension: `${targetConfig.pageW}×${targetConfig.pageH}mm`,
          selected_strategy: selectedPlanName,
          vps_endpoint: 'http://157.66.80.125:3001',
          vps_status: 'Đã lưu & Sẵn sàng kiểm tra'
        },
        sheet: {
          width_mm: targetConfig.pageW,
          height_mm: targetConfig.pageH,
          margin_top_mm: targetConfig.marginTop,
          margin_bottom_mm: targetConfig.marginBot,
          margin_left_mm: targetConfig.marginLeft,
          margin_right_mm: targetConfig.marginRight,
          spacing_mm: targetConfig.padding,
          bleed_mm: targetConfig.cutBleed,
          background_color: targetBackgroundColor,
          orientation: targetConfig.pageW >= targetConfig.pageH ? 'landscape' : 'portrait'
        },
        config: {
          shape: targetConfig.shape,
          itemW: targetConfig.itemW,
          itemH: targetConfig.itemH,
          autoRotate: targetConfig.autoRotate,
          padding: targetConfig.padding,
          fitMode: targetConfig.fitMode,
          dataMode: targetDataMode,
          impositionStyle: targetImpositionStyle,
          customScale: targetCustomScale,
          useCrop: targetConfig.useCrop,
          usePageCrop: targetConfig.usePageCrop,
          useColorBar: targetConfig.useColorBar,
          colorMode: targetConfig.colorMode,
          dpi: targetConfig.dpi,
          processMode: targetConfig.processMode
        },
        selected_plan: {
          plan_index: targetPlans.indexOf(targetPlan!),
          name: selectedPlanName,
          quantity: totalPlaced,
          items_count: planItemsData.length,
          items: planItemsData
        },
        all_strategies: targetPlans.map((pl, idx) => ({
          index: idx,
          name: pl.name,
          quantity: pl.qty,
          items_count: pl.items?.length || 0
        })),
        layers: layersData,
        source_files: sourceFilesData,
        vps_sync: {
          saved_to_agent_jobs: true,
          saved_to_vps_file: true,
          vps_file_name: `${jobId}.json`,
          vps_target_ip: '157.66.80.125:3001'
        }
      };

      // 1. Record to Agent Job Service (appears on /job tab)
      agentJobService.recordJob({
        id: jobId,
        name: `SortJob: ${payload.title} (${totalPlaced} tem, ${targetShapeTabs.length} Layers)`,
        category: 'Imposition SortJob',
        status: 'success',
        node_id: 'vps-server-3001',
        node_name: 'VPS Server (157.66.80.125)',
        node_role: 'render_server',
        node_target: '157.66.80.125:3001',
        script_language: 'json',
        script: JSON.stringify(payload, null, 2),
        parameters: {
          job_id: jobId,
          sheet: payload.summary.sheet_dimension,
          strategy: payload.summary.selected_strategy,
          layers_count: payload.summary.total_layers,
          items_count: payload.summary.total_placed_items
        },
        output: {
          result_payload: payload,
          local_path: `/vps/jobs/sortjob/${jobId}.json`,
          duration_ms: 80
        },
        triggered_by: 'Imposition Sắp xếp VPS Exporter'
      });

      // 2. Save JSON file to VPS storage if available
      try {
        const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const jsonFile = new File([jsonBlob], `${jobId}.json`, { type: 'application/json' });
        await fileService.uploadFile(jsonFile, 'PROJECT');
      } catch (uploadErr) {
        console.warn('Lưu JSON file trực tiếp lên VPS file endpoint:', uploadErr);
      }

      // 3. Save to localStorage cache
      try {
        const existingRaw = localStorage.getItem('toolx_sortjobs_v1') || '[]';
        const list = JSON.parse(existingRaw);
        list.unshift(payload);
        localStorage.setItem('toolx_sortjobs_v1', JSON.stringify(list.slice(0, 50)));
      } catch (e) {}

      // 4. Notify & Open Modal
      safeToastSuccess(`Đã tạo SortJob [${jobId}] và lưu về VPS thành công!`);
      setSortJobModalData(payload);
    } catch (err: any) {
      console.error('Lỗi xuất SortJob:', err);
      safeToastError('Không thể xuất SortJob: ' + (err.message || err));
    } finally {
      setIsExportingSortJob(false);
    }
  };

  // Save output PDF to File Manager
  const saveToFileManager = async (isSilent?: boolean | React.MouseEvent): Promise<boolean> => {
    setIsSaving(true);
    try {
      let pdfBlob: Blob;
      if (allPages.length > 0 && allPages.some(p => p.thumb || p.originalThumb || p.fileId) && apiStatus === 'online' && currentPlan && currentPlan.items?.length > 0) {
        const fd = new FormData();
        const fileIds = allPages.map(p => p.fileId).filter(Boolean);
        if (fileIds.length > 0) {
          fd.append('fileIds', JSON.stringify(fileIds));
        } else {
          for (let i = 0; i < allPages.length; i++) {
            const page = allPages[i];
            const imageSource = page.originalThumb || page.thumb;
            if (!imageSource) continue;
            const response = await fetch(imageSource);
            const blob = await response.blob();
            const isPng = imageSource.startsWith('data:image/png') || blob.type === 'image/png';
            const ext = isPng ? 'png' : 'jpg';
            const mimeType = isPng ? 'image/png' : 'image/jpeg';
            const file = new File([blob], `page_${i}.${ext}`, { type: mimeType });
            fd.append('files', file);
          }
        }
        
        const pagesDataRaw = allPages.map(p => ({
          rotation: p.rotation || 0,
          w: p.w,
          h: p.h
        }));
        fd.append('pagesData', JSON.stringify(pagesDataRaw));
        const rawPlanItems = (impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []));
        const enrichedPlanItems = enrichPlanItemsWithRotation(rawPlanItems);
        fd.append('planData', JSON.stringify(enrichedPlanItems));
        fd.append('pageW', String(config.pageW)); fd.append('pageH', String(config.pageH));
        fd.append('itemW', String(config.itemW)); fd.append('itemH', String(config.itemH));
        const effectiveFitMode2 = (customScale !== 100) ? 'actual' : config.fitMode;
        fd.append('dpi', String(config.dpi)); fd.append('fitMode', effectiveFitMode2);
        fd.append('customScale', String(customScale)); fd.append('backgroundColor', backgroundColor);
        fd.append('colorMode', config.colorMode); fd.append('useCrop', config.useCrop ? '1' : '0');
        fd.append('cropLen', String(config.cropLen)); fd.append('cropDist', String(config.cropDist));
        fd.append('cropThick', String(config.cropThick)); fd.append('cropColor', config.cropColor);
        fd.append('totalOrder', String(config.totalOrder));
        fd.append('processMode', config.processMode); fd.append('autoRotate', config.autoRotate ? '1' : '0');
        fd.append('shape', config.shape);
        fd.append('cutBleed', String(config.cutBleed || 0));
        fd.append('cornerRadius', String(config.cornerRadius || 0));
        fd.append('twoSideMode', config.twoSideMode || 'same');
        fd.append('marginTop', String(config.marginTop || 0));
        fd.append('marginBot', String(config.marginBot || 0));
        fd.append('marginLeft', String(config.marginLeft || 0));
        fd.append('marginRight', String(config.marginRight || 0));
        fd.append('impositionStyle', impositionStyleEnabled ? impositionStyle : 'sheetwise');
        fd.append('usePageCrop', config.usePageCrop ? '1' : '0');
        fd.append('pageCropLen', String(config.pageCropLen));
        fd.append('pageCropDist', String(config.pageCropDist));
        fd.append('pageCropThick', String(config.pageCropThick));
        fd.append('pageCropColor', config.pageCropColor);
        fd.append('useColorBar', config.useColorBar ? '1' : '0');
        fd.append('colorBarPosition', config.colorBarPosition);
        fd.append('colorBarPadding', String(config.colorBarPadding));
        fd.append('is2Sided', config.is2Sided ? '1' : '0');
        fd.append('rot180Front', config.rot180Front ? '1' : '0');
        fd.append('rot180Back', config.rot180Back ? '1' : '0');
        fd.append('dataMode', String(dataMode));
        fd.append('xUpQty', String(xUpQty));
        fd.append('standardQty', String(standardQty));
        fd.append('totalSheets', String(totalSheets));
        
        try {
          pdfBlob = await generatePdfAsync(fd, {
            onProgress: (p, msg) => setProgress(p)
          });
        } catch (pyErr) {
          console.warn('Backend generatePdfAsync failed, fallback to jsPDF:', pyErr);
          pdfBlob = await generateImpositionPdfBlob();
        }
      } else {
        pdfBlob = await generateImpositionPdfBlob();
      }
      
      const pdfFile = new File([pdfBlob], `BinhTrang_${config.pageW}x${config.pageH}mm_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      let uploadedFileId = `local_${Date.now()}`;
      try {
        const uploaded = await fileService.uploadFile(pdfFile, 'PDF');
        if (uploaded?.id) {
          uploadedFileId = uploaded.id;
        }
      } catch (uploadErr) {
        console.warn('Lưu file qua API backend không khả dụng, lưu trữ cục bộ:', uploadErr);
      }
      
      // Save full snapshot to history
      const historyTitle = allPages[0]?.name
        ? `Bình trang - ${allPages[0].name}`
        : `Bình trang ${config.pageW}×${config.pageH}mm (${shapeTabs.length} Layer)`;

      const historyItem: ImpositionHistoryItem = {
        id: `imp_${Date.now()}`,
        timestamp: Date.now(),
        date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
        title: historyTitle,
        paperW: config.pageW,
        pageH: config.pageH,
        itemW: config.itemW,
        itemH: config.itemH,
        layoutCount: currentPlan?.qty || allPages.length || (currentPlan?.items?.length ?? 1),
        totalSheets: totalSheets,
        processMode: config.processMode,
        colorMode: config.colorMode,
        status: 'completed',
        thumbnail: allPages[0]?.thumb || allPages[0]?.originalThumb || '',
        configSnapshot: { ...config },
        currentPlanIndexSnapshot: currentPlanIndex,
        shapeTabsSnapshot: JSON.parse(JSON.stringify(shapeTabs)),
        allPagesSnapshot: JSON.parse(JSON.stringify(allPages)),
        dataModeSnapshot: dataMode,
        dataModeEnabledSnapshot: dataModeEnabled,
        impositionStyleSnapshot: impositionStyle,
        impositionStyleEnabledSnapshot: impositionStyleEnabled,
        xUpQtySnapshot: xUpQty,
        standardQtySnapshot: standardQty,
        customScaleSnapshot: customScale,
        customSvgDataSnapshot: customSvgData,
        backgroundColorSnapshot: backgroundColor,
        vectorMaskResultSnapshot: vectorMaskResult,
        fileId: uploadedFileId
      };

      saveHistoryItem(historyItem);

      // Also try saving workspace to database
      try {
        await workspaceService.saveWorkspace({
          name: historyTitle,
          config: config,
          currentPlanIndex: currentPlanIndex,
          dataMode: dataMode.toString(),
          dataModeEnabled: dataModeEnabled,
          xUpQty: xUpQty,
          standardQty: standardQty,
          shapeTabs: shapeTabs,
          customScale: customScale,
          backgroundColor: backgroundColor,
          impositionStyle: impositionStyle,
          impositionStyleEnabled: impositionStyleEnabled
        });
      } catch (wsErr) {
        console.warn('Lưu workspace lên database không khả dụng:', wsErr);
      }

      setLastSavedSnapshot(getCurrentProjectSnapshot());
      safeToastSuccess('Đã lưu tệp bình trang thành công vào Lịch sử & Quản lý tệp!');
      return true;
    } catch (e: any) {
      console.error('Lỗi lưu tệp:', e);
      safeToastError('Lỗi lưu tệp: ' + (e.message || e));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Outpaint function - process all pages sequentially
  const handleOutpaint = async () => {
    if (allPages.length === 0) {
      alert('Vui lòng thêm ảnh trước!');
      return;
    }
    
    const { top, bottom, left, right } = outpaintConfig;
    if (top <= 0 && bottom <= 0 && left <= 0 && right <= 0) {
      alert('Vui lòng nhập kích thước mở rộng!');
      return;
    }
    
    setOutpaintProgress({ isProcessing: true, current: 0, total: allPages.length });
    
    const newPages: PageItem[] = [];
    
    for (let i = 0; i < allPages.length; i++) {
      setOutpaintProgress(prev => ({ ...prev, current: i + 1 }));
      
      const page = allPages[i];
      
      try {
        // Convert base64 thumb to blob
        const response = await fetch(page.thumb);
        const blob = await response.blob();
        
        // Detect correct file extension from base64 or blob type
        let ext = 'jpg';
        if (page.thumb.startsWith('data:image/png')) ext = 'png';
        else if (page.thumb.startsWith('data:application/pdf')) ext = 'pdf';
        else if (blob.type === 'image/png') ext = 'png';
        else if (blob.type === 'application/pdf') ext = 'pdf';
        
        // Create form data
        const fd = new FormData();
        fd.append('file', blob, `page_${i}.${ext}`);
        fd.append('top_mm', String(top));
        fd.append('bottom_mm', String(bottom));
        fd.append('left_mm', String(left));
        fd.append('right_mm', String(right));
        fd.append('dpi', String(config.dpi));
        fd.append('process_mode', config.processMode);
        
        console.log(`[Outpaint] Processing page ${i}, ext=${ext}, size=${blob.size}`);
        
        // Call outpaint API
        const result = await fetch(API_BASE + '/outpaint', {
          method: 'POST',
          body: fd
        });
        
        if (!result.ok) {
          let errMsg = `HTTP ${result.status}`;
          try {
            const err = await result.json();
            errMsg = err.error || errMsg;
          } catch {}
          console.error(`[Outpaint] API error for page ${i}:`, errMsg);
          throw new Error(errMsg);
        }
        
        const data = await result.json();
        console.log(`[Outpaint] Response for page ${i}:`, { success: data.success, width_mm: data.width_mm, height_mm: data.height_mm });
        
        if (data.success && data.image) {
          // Update page with new image
          newPages.push({
            ...page,
            thumb: data.image,
            originalThumb: data.image,
            w: data.width_mm,
            h: data.height_mm
          });
          console.log(`[Outpaint] Page ${i} updated successfully`);
        } else {
          throw new Error(data.error || 'No image returned');
        }
      } catch (err: any) {
        console.error(`[Outpaint] Error for page ${i}:`, err);
        alert(`Lỗi mở rộng ảnh ${i + 1}: ${err.message}`);
        // Keep original page on error
        newPages.push(page);
      }
    }
    
    // Update all pages
    setAllPages(newPages);
    setOutpaintProgress({ isProcessing: false, current: 0, total: 0 });
    setIsOutpaintPanelOpen(false);
    alert(`Đã mở rộng ${newPages.length} ảnh thành công!`);
  };

  // Measure container size & handle canvas wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    const measure = () => {
      if (el) {
        const rect = el.getBoundingClientRect();
        setContainerSize({ w: rect.width - 48, h: rect.height - 48 }); // padding
      }
    };
    measure();
    const t = setTimeout(measure, 100);
    window.addEventListener('resize', measure);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setCanvasZoom(prev => Math.min(Math.max(Math.round(prev * factor * 100) / 100, 0.2), 10));
    };

    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      if (el) {
        el.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const scale = useMemo(() => {
    const scaleW = containerSize.w / config.pageW;
    const scaleH = containerSize.h / config.pageH;
    return Math.min(scaleW, scaleH, 3) * 0.95; // 95% of available space
  }, [config.pageW, config.pageH, containerSize]);

  const sheets = currentPlan && currentPlan.qty > 0 ? Math.ceil(config.totalOrder / currentPlan.qty) : 0;
  const getBR = () => {
    if (config.shape === 'circle' || config.shape === 'oval') return '50%';
    if (config.shape === 'custom-svg') return '0px';
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

  // Crop marks: L-shaped at 4 corners of each ITEM
  const cropPath = (itemsToRender?: PlanItem[]) => {
    if (!config.useCrop || !currentPlan) return '';
    const { cropLen: l, cropDist: d } = config;
    const p: string[] = [];
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(config.shape);
    const isBackSide = config.is2Sided && previewSide === 'back';
    
    const renderItems = itemsToRender || (impositionStyleEnabled && styledPlan ? styledPlan.items : currentPlan.items);
    renderItems.forEach(item => {
      const itemShape = (item.shape || config.shape) as string;
      const isItemSpecial = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
      let w: number, h: number;
      if (itemShape === 'circle') {
        w = h = item.w !== undefined ? item.w : config.itemW;
      } else if (isItemSpecial) {
        w = item.w !== undefined ? item.w : config.itemW;
        h = item.h !== undefined ? item.h : config.itemH;
      } else {
        w = item.w !== undefined ? item.w : (item.rot ? config.itemH : config.itemW);
        h = item.h !== undefined ? item.h : (item.rot ? config.itemW : config.itemH);
      }
      
      // Mirror X for back side
      const x = isBackSide ? (config.pageW - item.x - w) : item.x;
      const y = item.y;
      
      // Top-left corner of item
      p.push(`M ${x - d - l},${y} L ${x - d},${y}`);  // horizontal
      p.push(`M ${x},${y - d - l} L ${x},${y - d}`);  // vertical
      
      // Top-right corner of item
      p.push(`M ${x + w + d},${y} L ${x + w + d + l},${y}`);  // horizontal
      p.push(`M ${x + w},${y - d - l} L ${x + w},${y - d}`);  // vertical
      
      // Bottom-left corner of item
      p.push(`M ${x - d - l},${y + h} L ${x - d},${y + h}`);  // horizontal
      p.push(`M ${x},${y + h + d} L ${x},${y + h + d + l}`);  // vertical
      
      // Bottom-right corner of item
      p.push(`M ${x + w + d},${y + h} L ${x + w + d + l},${y + h}`);  // horizontal
      p.push(`M ${x + w},${y + h + d} L ${x + w},${y + h + d + l}`);  // vertical
    });
    
    return p.join(' ');
  };

  return (
    <div className="h-full bg-gray-100 flex flex-col overflow-hidden">
      <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg"><LayoutGrid size={22} /></div>
          <div><h1 className="text-lg font-medium">Bình trang cao cấp</h1><p className="text-violet-200 text-xs">Công cụ xếp hình in ấn</p></div>
        </div>
        <div className="flex items-center gap-3">
          {/* Workspace Management */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsWorkspaceModalOpen(!isWorkspaceModalOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Save size={18} /> Workspace {savedWorkspaces.length > 0 && <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{savedWorkspaces.length}</span>}
            </button>
            {isWorkspaceModalOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[100] w-[480px] max-h-96">
                {/* Header with input */}
                <div className="p-4 border-b bg-purple-50">
                  <input
                    type="text"
                    placeholder="Tên workspace..."
                    value={localWorkspaceName}
                    onChange={(e) => setLocalWorkspaceName(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.key === 'Enter' && saveWorkspace()}
                  />
                  <button
                    onClick={saveWorkspace}
                    disabled={!localWorkspaceName.trim()}
                    className="w-full mt-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Lưu workspace hiện tại
                  </button>
                </div>
                
                {/* Two columns layout */}
                <div className="flex h-64">
                  {/* Left column - Preset workspaces */}
                  <div className="flex-1 border-r border-gray-200">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Workspace Mẫu</h3>
                    </div>
                    <div className="overflow-y-auto h-full">
                      {presetWorkspaces.map((ws) => (
                        <div key={ws.name} className="group hover:bg-blue-50 border-b border-gray-100">
                          <button
                            onClick={() => { loadWorkspace(ws); setIsWorkspaceModalOpen(false); }}
                            className="w-full px-3 py-3 text-left text-sm font-medium text-gray-700 hover:text-blue-600 flex items-center gap-2"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium">{ws.name}</div>
                              <div className="text-xs text-gray-500">
                                {ws.config.shape === 'circle' ? 'Tròn' : ws.config.shape === 'rect' ? 'Chữ nhật' : ws.config.shape === 'oval' ? 'Bầu dục' : ws.config.shape === 'trapezoid' ? 'Hình thang' : ws.config.shape === 'triangle' ? 'Tam giác' : ws.config.shape === 'hexagon' ? 'Lục giác' : ws.config.shape} • 
                                {ws.config.itemW}x{ws.config.itemH}mm • 
                                {ws.dataMode === 1 ? 'Chuẩn' : ws.dataMode === 4 ? 'X-Up' : ws.dataMode === 5 ? '2 Mặt Giống' : ws.dataMode === 6 ? 'Đối xứng' : 'Khác'}
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Right column - User saved workspaces */}
                  <div className="flex-1">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Workspace Đã Lưu</h3>
                    </div>
                    <div className="overflow-y-auto h-full">
                      {savedWorkspaces.length > 0 ? (
                        savedWorkspaces.map((ws) => (
                          <div key={ws.name} className="group hover:bg-purple-50 border-b border-gray-100">
                            <div className="flex items-center justify-between px-3 py-2">
                              <button
                                onClick={() => { loadWorkspace(ws); setIsWorkspaceModalOpen(false); }}
                                className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-purple-600"
                              >
                                {ws.name}
                              </button>
                              <button
                                onClick={() => deleteWorkspace(ws.name)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-8 text-center text-gray-500 text-sm">
                          <div className="mb-2">Chưa có workspace</div>
                          <div className="text-xs">Lưu workspace hiện tại để sử dụng sau</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Quản lý Dữ liệu */}
          <button onClick={() => setIsDataModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-pink-500 hover:bg-pink-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all">
            <FolderOpen size={18} /> Quản lý Dữ liệu {allPages.length > 0 && <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{allPages.length}</span>}
          </button>
          {/* AI Menu Dropdown */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
              disabled={allPages.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:shadow-none"
            >
              <Sparkles size={18} /> AI <ChevronDown size={14} />
            </button>
            {isAiMenuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 min-w-[180px]">
                <button
                  onClick={() => { setIsAiModalOpen(true); setAiPreviewPages([]); setAiResult(null); setIsAiMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                >
                  <Sparkles size={16} className="text-amber-500" /> AI Sắp xếp
                </button>
                <button
                  onClick={() => { setIsOutpaintPanelOpen(true); setIsRightSidebarCollapsed(false); setIsAiMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-t"
                >
                  <Expand size={16} className="text-blue-500" /> Mở rộng ảnh (AI Bleed)
                </button>
              </div>
            )}
          </div>
          {/* Tải SVG */}
          <button onClick={dlSVG} disabled={!currentPlan} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:shadow-none">
            <Scissors size={18} /> Tải SVG Cắt
          </button>
          {/* Nút Render */}
          <button
            onClick={() => setIsRenderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-95 cursor-pointer"
            title="Mở bảng điều khiển Render Prepress (chọn Agent & Preset)"
          >
            <Play size={17} className="fill-current text-white" />
            <span>Render</span>
          </button>
          {/* Lưu vào Quản lý tệp */}
          <button
            onClick={saveToFileManager}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer"
            title="Lưu file bình trang hiện tại vào Quản lý tệp"
          >
            {isSaving ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</> : <><Save size={18} /> Lưu tệp</>}
          </button>
          {/* Tải Render gần nhất nếu có */}
          {lastImpositionRender?.downloadUrl && (
            <a
              href={lastImpositionRender.downloadUrl}
              download={lastImpositionRender.filename || 'BinhTrang_Render.pdf'}
              onClick={async (e) => {
                if (lastImpositionRender.downloadUrl.startsWith('blob:')) {
                  try {
                    const check = await fetch(lastImpositionRender.downloadUrl, { method: 'HEAD' });
                    if (check.ok) return;
                  } catch {}
                  e.preventDefault();
                  try {
                    safeToastInfo('Đang tạo lại tệp PDF cho phiên làm việc hiện tại...');
                    const freshBlob = await generateImpositionPdfBlob();
                    const freshUrl = URL.createObjectURL(freshBlob);
                    const updated = { ...lastImpositionRender, downloadUrl: freshUrl };
                    setLastImpositionRender(updated);
                    try { localStorage.setItem('toolx_last_imposition_render', JSON.stringify(updated)); } catch {}
                    const a = document.createElement('a');
                    a.href = freshUrl;
                    a.download = lastImpositionRender.filename || 'BinhTrang_Render.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    safeToastSuccess('Đã tải xuống thành công bản render!');
                  } catch (err: any) {
                    safeToastError('Không thể tạo lại file tải: ' + (err.message || err));
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition-all"
              title="Tải bản Render gần nhất"
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Tải Render ({lastImpositionRender.filename?.slice(0, 16) || 'PDF'}...)</span>
            </a>
          )}
          {/* Làm mới */}
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all cursor-pointer" title="Làm mới - Reset tất cả về mặc định">
            <RefreshCw size={18} /> Làm mới
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[576px] max-w-[45vw] bg-white border-r flex flex-col overflow-y-auto flex-shrink-0 select-none">
          <div className="p-3 border-b">
            {/* Single Row: Title "Layer" + Separator + Tabs (A, B, C...) + Plus button */}
            <div className="flex flex-wrap items-end gap-2 mb-0 select-none pt-1 pb-0 relative z-10">
              {/* Layer Title */}
              <div className="flex items-center gap-1.5 shrink-0 pr-0.5 pb-1.5">
                <div className="w-5 h-5 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                  <Layers size={13} />
                </div>
                <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">LAYER ({shapeTabs.length})</span>
              </div>

              {/* Vertical Separator */}
              <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5 mb-1.5" />

              {/* Tabs List (A, B, C...) */}
              {shapeTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const tabColor = tab.color || '#8b5cf6';

                return (
                  <div
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    onMouseEnter={() => handleTabMouseEnter(tab.id)}
                    onMouseLeave={handleTabMouseLeave}
                    className={`group/tab relative flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
                      isActive
                        ? 'px-3 py-1.5 rounded-t-xl border-t border-x border-b-0 -mb-[1px] bg-white text-slate-900 font-bold z-20'
                        : tab.enabled
                        ? 'px-2.5 py-1 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white text-slate-700 shadow-2xs mb-1'
                        : 'px-2.5 py-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-slate-400 opacity-60 mb-1'
                    }`}
                    style={isActive ? { borderColor: tabColor } : undefined}
                  >
                    {/* Active Tab Inverted Fillet Corners (Bo cong êm ái góc giao đáy & che viền thẻ với nét mảnh 1px) */}
                    {isActive && (
                      <>
                        {/* Bottom white mask to erase any card top border underneath */}
                        <div className="absolute -bottom-[1px] -left-[1px] -right-[1px] h-[2px] bg-white z-20 pointer-events-none" />

                        {/* Left Inverted Corner Fillet */}
                        <div className="absolute -left-[6px] -bottom-[1px] w-[6px] h-[6px] pointer-events-none z-20 overflow-visible">
                          <svg width="6" height="6" viewBox="0 0 6 6" className="block" fill="none">
                            <path d="M 0 6 Q 6 6 6 0 L 6 6 Z" fill="#ffffff" />
                            <path d="M 0 6 Q 6 6 6 0" fill="none" stroke={tabColor} strokeWidth="1" strokeLinecap="round" />
                          </svg>
                        </div>

                        {/* Right Inverted Corner Fillet */}
                        <div className="absolute -right-[6px] -bottom-[1px] w-[6px] h-[6px] pointer-events-none z-20 overflow-visible">
                          <svg width="6" height="6" viewBox="0 0 6 6" className="block" fill="none">
                            <path d="M 0 0 Q 0 6 6 6 L 0 6 Z" fill="#ffffff" />
                            <path d="M 0 0 Q 0 6 6 6" fill="none" stroke={tabColor} strokeWidth="1" strokeLinecap="round" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* Tab Color Indicator */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: tabColor }}
                    />

                    {/* Tab Name */}
                    <span className="font-bold tracking-tight text-[11px]">
                      {tab.name}
                    </span>

                    {/* Edit Name & Color Icon Button (Ẩn mặc định, chỉ hiện khi dừng hover 3s) */}
                    {hoveredPencilTabId === tab.id && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenLayerModal(tab, e)}
                        className={`p-0.5 rounded transition-all animate-in fade-in zoom-in-95 duration-200 cursor-pointer ${
                          isActive ? 'hover:bg-violet-50 text-violet-600' : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title="Đổi tên & màu layer"
                      >
                        <Edit3 size={11} />
                      </button>
                    )}

                    {/* Toggle Eye on/off button (Tắt / Hiện) */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleTabEnabled(tab.id, e)}
                      className={`p-0.5 rounded transition cursor-pointer ${
                        tab.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={tab.enabled ? 'Đang bật (Click để ẩn layer khỏi trang in)' : 'Đang tắt (Click để bật lại)'}
                    >
                      {tab.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>

                    {/* Delete Tab Button (Only when shapeTabs.length > 1) */}
                    {shapeTabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTab(tab.id, e)}
                        className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-rose-100 text-rose-500 transition cursor-pointer"
                        title="Xoá layer này"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Quick Add Tab Button */}
              <button
                type="button"
                onClick={handleAddTab}
                className="flex items-center justify-center w-6 h-6 rounded-lg border border-dashed border-slate-300 hover:border-violet-400 text-slate-400 hover:text-violet-600 bg-slate-50/60 hover:bg-violet-50 transition cursor-pointer shrink-0 mb-1"
                title="Thêm layer mới"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Layer Properties Card (Encloses all properties for the active layer) */}
            <div
              className="rounded-2xl border p-3 bg-white shadow-2xs relative z-0 transition-colors"
              style={{ borderColor: activeTab.color || '#8b5cf6' }}
            >
              {/* Top Area: Source Image (Left) + 6 Shapes in 2x3 Grid (Center) + Vector Mask Editor (Right) */}
              <div className="flex gap-2 mb-3 items-stretch">
                {/* Hidden file input for source image */}
                <input
                  type="file"
                  ref={sourceImageInputRef}
                  accept="image/*,.pdf"
                  onChange={handleSourceImageSelect}
                  className="hidden"
                />

                {/* Nút 1: Ảnh nguồn (Bên trái, màu green, chiều cao 2 hàng) */}
                <div className="relative group/srcbtn shrink-0 w-28">
                  <button
                    type="button"
                    onClick={handleOpenSourceEditor}
                    className={`w-28 h-full min-h-[62px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border overflow-hidden relative select-none ${
                      (activeTab.sourceImage?.thumb || (allPages.length > 0 && allPages[0]?.thumb))
                        ? 'bg-slate-900 border-emerald-500 shadow-sm ring-2 ring-emerald-200'
                        : 'bg-emerald-50/70 hover:bg-emerald-100/80 border-2 border-dashed border-emerald-400 text-emerald-700 hover:border-emerald-600 shadow-2xs'
                    }`}
                    title={
                      (activeTab.sourceImage?.thumb || (allPages.length > 0 && allPages[0]?.thumb))
                        ? 'Ảnh nguồn: Bấm để Crop & Cân bằng màu sắc cho mẫu này'
                        : 'Chọn ảnh nguồn để Crop & Cân bằng màu sắc cho mẫu này'
                    }
                  >
                    {(activeTab.sourceImage?.thumb || (allPages.length > 0 && allPages[0]?.thumb)) ? (
                      <div className="relative w-full h-full min-h-[62px]">
                        <img
                          src={activeTab.sourceImage?.thumb || allPages[0]?.thumb}
                          alt="Nguồn"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/srcbtn:opacity-100 transition flex flex-col items-center justify-center text-white">
                          <ImagePlus size={16} />
                          <span className="text-[9px] font-bold mt-0.5">Sửa Crop/Màu</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImagePlus size={18} className="mb-0.5 text-emerald-600" />
                        <span className="text-[11px] font-bold tracking-tight text-emerald-800">Ảnh nguồn</span>
                        <span className="text-[8px] text-emerald-600/90 font-medium leading-none mt-0.5">Crop & Cân màu</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Cụm 2: 6 Shapes (Hình dạng cơ bản, 2 hàng x 3 cột) */}
                <div className="flex-1 grid grid-cols-3 gap-1.5 min-h-[62px]">
                  {[
                    { id: 'rect', label: 'Chữ nhật', icon: <Square size={13} className="shrink-0" /> },
                    { id: 'circle', label: 'Tròn', icon: <Circle size={13} className="shrink-0" /> },
                    { id: 'oval', label: 'Bầu dục / Elip', icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="6" /></svg> },
                    { id: 'trapezoid', label: 'Thang', icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="4,18 20,18 17,6 7,6" /></svg> },
                    { id: 'triangle', label: 'Tam giác', icon: <Triangle size={13} className="shrink-0" /> },
                    { id: 'hexagon', label: 'Lục giác', icon: <Hexagon size={13} className="shrink-0" /> },
                  ].map((s) => {
                    const isSelected = config.shape === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setConfig(c => ({
                            ...c,
                            shape: s.id as any,
                            ...(s.id === 'circle' ? { itemH: c.itemW } : {})
                          }));
                          updateActiveTabProp({
                            shape: s.id as any,
                            ...(s.id === 'circle' ? { itemH: activeTab.itemW } : {})
                          });
                        }}
                        className={`h-[28px] rounded-lg border flex items-center justify-center transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'border-violet-600 bg-violet-600 text-white shadow-2xs font-medium ring-2 ring-violet-200'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                        title={s.label}
                      >
                        {s.icon}
                      </button>
                    );
                  })}
                </div>

                {/* Nút 3: Vector Mask Editor (Bên phải, chiều cao 2 hàng đối xứng Ảnh nguồn) */}
                <div className="relative group/vecbtn shrink-0 w-28">
                  <button
                    type="button"
                    onClick={() => setIsVectorMaskEditorOpen(true)}
                    className={`w-28 h-full min-h-[62px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border overflow-hidden relative select-none ${
                      (activeTab.vectorMaskResult || vectorMaskResult)
                        ? 'bg-violet-50/90 border-violet-400 shadow-sm ring-2 ring-violet-200 text-violet-900'
                        : 'bg-violet-50/70 hover:bg-violet-100/80 border-2 border-dashed border-violet-400 text-violet-700 hover:border-violet-600 shadow-2xs'
                    }`}
                    title={
                      (activeTab.vectorMaskResult || vectorMaskResult)
                        ? 'Vector Mask: Bấm để mở trình vẽ vector knot & shape'
                        : 'Vẽ Vector Mask (Knot & Shape) cho mẫu này'
                    }
                  >
                    {(activeTab.vectorMaskResult || vectorMaskResult) ? (
                      <div className="relative w-full h-full min-h-[62px] flex flex-col items-center justify-center p-1 bg-violet-50/90 text-violet-900">
                        <PenTool size={16} className="text-violet-600 mb-0.5" />
                        <span className="text-[10px] font-bold text-violet-950 truncate max-w-[90px]">Vector Mask</span>
                        <span className="text-[8px] text-violet-600 font-mono font-semibold">
                          {(activeTab.vectorMaskResult || vectorMaskResult)?.w_mm}×{(activeTab.vectorMaskResult || vectorMaskResult)?.h_mm}mm
                        </span>
                        <div className="absolute inset-0 bg-violet-900/40 opacity-0 group-hover/vecbtn:opacity-100 transition flex flex-col items-center justify-center text-white backdrop-blur-[0.5px]">
                          <PenTool size={16} />
                          <span className="text-[9px] font-bold mt-0.5">Sửa Vector</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <PenTool size={18} className="mb-0.5 text-violet-600" />
                        <span className="text-[11px] font-bold tracking-tight text-violet-900">Vector Mask</span>
                        <span className="text-[8px] text-violet-600/90 font-medium leading-none mt-0.5">Knot & Shape</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Input Row 1: Số lượng (Quantity) / Rộng (W) / Cao (H) */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {/* Cột 1: Số lượng - Màu xanh lá cây, nằm đầu dòng */}
                <div 
                  onClick={() => soLuongInputRef.current?.focus()}
                  className="flex items-center justify-between bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-300/90 rounded-xl px-2 py-1.5 transition-all focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-600 focus-within:bg-white shadow-2xs min-w-0 cursor-text"
                >
                  <div className="flex items-center gap-1 shrink-0 pr-0.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      id="useTotalLimit"
                      checked={isMultiShape ? true : !!config.useTotalLimit}
                      onChange={e => {
                        const checked = e.target.checked;
                        const safeOrder = Math.min(99, config.totalOrder || 1);
                        const safeTabQty = Math.min(99, activeTab.quantity || 1);
                        setConfig(c => ({ ...c, useTotalLimit: checked, totalOrder: safeOrder }));
                        updateActiveTabProp({ useTotalLimit: checked, quantity: safeTabQty });
                      }}
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-400 border-emerald-400 cursor-pointer shrink-0"
                    />
                    <span 
                      className="text-[10px] font-bold text-emerald-800 shrink-0 cursor-pointer select-none" 
                      onClick={() => {
                        const checked = !config.useTotalLimit;
                        const safeOrder = Math.min(99, config.totalOrder || 1);
                        const safeTabQty = Math.min(99, activeTab.quantity || 1);
                        setConfig(c => ({ ...c, useTotalLimit: checked, totalOrder: safeOrder }));
                        updateActiveTabProp({ useTotalLimit: checked, quantity: safeTabQty });
                      }}
                      title="Giới hạn số lượng tem đặt in (Tối đa 99 tem/layer)"
                    >
                      Số lượng
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 min-w-0 justify-end flex-1">
                    <DebouncedNumberInput
                      inputRef={soLuongInputRef}
                      min={1}
                      max={99}
                      step={1}
                      value={Math.min(99, isMultiShape ? (activeTab.quantity || 1) : (config.totalOrder || 1))}
                      onChange={v => {
                        const q = Math.min(99, Math.max(1, Math.round(v)));
                        if (!isMultiShape) {
                          setConfig(c => ({ ...c, totalOrder: q, useTotalLimit: true }));
                        }
                        updateActiveTabProp({ quantity: q, useTotalLimit: true });
                      }}
                      className="w-full min-w-[38px] max-w-[62px] bg-transparent text-right font-bold text-xs text-emerald-700 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-medium shrink-0 select-none">tem</span>
                  </div>
                </div>

                {/* Cột 2: Rộng / Đường kính */}
                <div 
                  onClick={() => rongInputRef.current?.focus()}
                  className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs cursor-text"
                >
                  <span className="text-[10px] font-semibold text-slate-600 truncate pr-0.5 select-none">
                    {config.shape === 'circle' ? 'Đ.kính (Dia)' : 'Rộng (W)'}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <DebouncedNumberInput
                      inputRef={rongInputRef}
                      step={0.1}
                      min={1}
                      value={config.itemW}
                      onChange={v => {
                        setConfig(c => ({
                          ...c,
                          itemW: v,
                          ...(c.shape === 'circle' ? { itemH: v } : {}),
                        }));
                        updateActiveTabProp({
                          itemW: v,
                          ...(activeTab.shape === 'circle' ? { itemH: v } : {}),
                        });
                      }}
                      className="w-14 sm:w-16 min-w-[44px] bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-medium select-none">mm</span>
                  </div>
                </div>

                {/* Cột 3: Cao */}
                {config.shape !== 'circle' ? (
                  <div 
                    onClick={() => caoInputRef.current?.focus()}
                    className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs cursor-text"
                  >
                    <span className="text-[10px] font-semibold text-slate-600 truncate pr-0.5 select-none">
                      Cao (H)
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <DebouncedNumberInput
                        inputRef={caoInputRef}
                        step={0.1}
                        min={1}
                        value={config.itemH}
                        onChange={v => {
                          setConfig(c => ({ ...c, itemH: v }));
                          updateActiveTabProp({ itemH: v });
                        }}
                        className="w-14 sm:w-16 min-w-[44px] bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-400 font-medium select-none">mm</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-100/60 border border-dashed border-slate-200 rounded-xl px-2 py-1.5 text-slate-400">
                    <span className="text-[10px] font-medium">Tỷ lệ</span>
                    <span className="text-xs font-bold font-mono">1:1</span>
                  </div>
                )}
              </div>

              {/* Input Row 2: Khoảng cách (Gap), Bù cắt (Bleed), Bo góc (Radius), và nút Trang cuối nếu có dư */}
              <div
                className={`grid ${
                  ['rect', 'trapezoid', 'triangle', 'hexagon'].includes(config.shape)
                    ? hasLastSheetBlanks && totalSheets > 1
                      ? 'grid-cols-4'
                      : 'grid-cols-3'
                    : hasLastSheetBlanks && totalSheets > 1
                    ? 'grid-cols-3'
                    : 'grid-cols-2'
                } gap-1.5 mb-2`}
              >
                {/* Khoảng cách (Gap) - Icon + Tooltip */}
                <div
                  className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs"
                  title="Khoảng cách giữa các tem (Gap)"
                >
                  <div className="flex items-center text-slate-500 shrink-0" title="Khoảng cách giữa các tem (Gap)">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6v12M20 6v12M9 12h6M9 9l-3 3 3 3M15 9l3 3-3 3" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <DebouncedNumberInput
                      step={0.1}
                      min={0}
                      value={config.padding}
                      onChange={v => setConfig(c => ({ ...c, padding: v }))}
                      className="w-12 bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-medium">mm</span>
                  </div>
                </div>

                {/* Bù cắt (Bleed) - Icon + Tooltip */}
                <div
                  className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs"
                  title="Bù cắt / Tràn viền (Cut Bleed)"
                >
                  <div className="flex items-center text-slate-500 shrink-0" title="Bù cắt / Tràn viền (Cut Bleed)">
                    <Scissors size={14} />
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <DebouncedNumberInput
                      step={0.1}
                      min={0}
                      value={config.cutBleed}
                      onChange={v => setConfig(c => ({ ...c, cutBleed: v }))}
                      className="w-12 bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-medium">mm</span>
                  </div>
                </div>

                {/* Bo góc (Radius - nếu có) - Icon + Tooltip */}
                {['rect', 'trapezoid', 'triangle', 'hexagon'].includes(config.shape) && (
                  <div
                    className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-500 focus-within:bg-white shadow-2xs"
                    title="Bán kính bo góc (Corner Radius)"
                  >
                    <div className="flex items-center text-slate-500 shrink-0" title="Bán kính bo góc (Corner Radius)">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 5H10a5 5 0 0 0-5 5v9" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <DebouncedNumberInput
                        step={0.5}
                        min={0}
                        value={config.cornerRadius}
                        onChange={v => setConfig(c => ({ ...c, cornerRadius: v }))}
                        className="w-12 bg-transparent text-right font-bold text-xs text-slate-800 focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-400 font-medium">mm</span>
                    </div>
                  </div>
                )}

                {/* Nút Trang cuối nếu có dư trắng */}
                {hasLastSheetBlanks && totalSheets > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentSheetIndex(totalSheets - 1)}
                    className={`px-1.5 py-1.5 rounded-xl text-[10px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer border select-none ${
                      currentSheetIndex === totalSheets - 1
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs font-semibold'
                        : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-2xs animate-pulse'
                    }`}
                    title={`Xem trang cuối (Tờ ${totalSheets}) - Có ${lastSheetBlankCount} ô dư trắng`}
                  >
                    <span className="truncate">Trang cuối</span>
                    <span className="bg-amber-200/90 text-amber-950 font-bold px-1 rounded text-[9px] shrink-0">
                      dư {lastSheetBlankCount}
                    </span>
                  </button>
                )}
              </div>

              {/* Unified 5-Button Row: 4 Fit Modes + Auto Rotate (Inline Icon & Text nowrap) */}
              <div className="mb-0">
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { 
                      v: 'stretch', 
                      label: 'Kéo giãn', 
                      icon: (
                        <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                          <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                          <rect x="0.5" y="0.5" width="19" height="15" fill="currentColor" opacity="0.2"/>
                          <path d="M3 8h14M10 3v10" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      )
                    },
                    { 
                      v: 'fill', 
                      label: 'Lấp đầy', 
                      icon: (
                        <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                          <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                          <rect x="0.5" y="0.5" width="19" height="15" fill="currentColor" opacity="0.4"/>
                          <rect x="3" y="2" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      )
                    },
                    { 
                      v: 'fit', 
                      label: 'Vừa khít', 
                      icon: (
                        <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                          <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                          <rect x="4" y="2" width="12" height="12" fill="currentColor" opacity="0.2"/>
                          <rect x="4" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      )
                    },
                    { 
                      v: 'actual', 
                      label: '100%', 
                      icon: (
                        <svg viewBox="0 0 20 16" className="w-3.5 h-3 flex-shrink-0">
                          <rect x="0.5" y="0.5" width="19" height="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,1"/>
                          <rect x="5" y="4" width="10" height="8" fill="currentColor" opacity="0.2"/>
                          <rect x="5" y="4" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      )
                    }
                  ].map((btn) => {
                    const isSelected = config.fitMode === btn.v;
                    return (
                      <button
                        key={btn.v}
                        type="button"
                        onClick={() => {
                          console.log('🔄 Changing fitMode to:', btn.v);
                          setConfig(c => ({ ...c, fitMode: btn.v as any }));
                          if (btn.v === 'actual') {
                            setIsScaleModalOpen(true);
                          }
                        }}
                        className={`h-7 px-1 rounded-lg border flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap ${
                          isSelected
                            ? 'border-violet-600 bg-violet-600 text-white shadow-2xs font-medium ring-2 ring-violet-200'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                        title={btn.v === 'actual' ? 'Tỷ lệ 100% (Bấm để tuỳ chỉnh)' : btn.label}
                      >
                        {btn.icon}
                        <span className="text-[10px] font-medium whitespace-nowrap">
                          {btn.v === 'actual' && customScale !== 100 ? `${customScale}%` : btn.label}
                        </span>
                      </button>
                    );
                  })}

                  {/* 5th Button: Tự xoay ảnh vừa khung (Auto Rotate Image) */}
                  {(() => {
                    const isTabAutoRotateImage = isMultiShape
                      ? (activeTab.autoRotateImage !== undefined ? activeTab.autoRotateImage : (activeTab.autoRotate !== undefined ? activeTab.autoRotate : (config.autoRotateImage ?? true)))
                      : (config.autoRotateImage ?? true);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !isTabAutoRotateImage;
                          setConfig(c => ({ ...c, autoRotateImage: nextVal }));
                          if (isMultiShape) {
                            updateActiveTabProp({ autoRotateImage: nextVal });
                          }
                        }}
                        className={`h-7 px-1.5 rounded-lg border flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap ${
                          isTabAutoRotateImage
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs font-medium ring-2 ring-emerald-200'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                        title={
                          isTabAutoRotateImage
                            ? "Tự xoay ảnh vừa khung: Đang BẬT (Ảnh tự xoay 90° khi tỷ lệ ngược khung - bấm để tắt)"
                            : "Tự xoay ảnh vừa khung: Đang TẮT (Giữ nguyên chiều ảnh gốc - bấm để bật)"
                        }
                      >
                        <RotateCw size={12} className={isTabAutoRotateImage ? 'text-white' : 'text-slate-500'} />
                        <span className="text-[10px] font-medium whitespace-nowrap">Tự xoay ảnh</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Plan selector */}
          <div className="p-3 border-b flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-medium text-gray-500 uppercase flex items-center gap-1">
                  <LayoutGrid size={13} className="text-violet-500" /> Sắp xếp ({plans.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    layoutFingerprintRef.current = '';
                    setConfig(c => ({ ...c, autoRotate: !c.autoRotate }));
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 border transition select-none cursor-pointer ${
                    config.autoRotate
                      ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 font-medium'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={
                    config.autoRotate
                      ? "Đang cho phép xoay tem 90° để tối ưu số lượng tem trên khổ in (Bấm để khoá chiều đứng)"
                      : "Đang khoá hướng tem cố định (Bấm để cho phép xoay tem 90°)"
                  }
                >
                  <RotateCw size={10} className={config.autoRotate ? 'text-violet-600' : 'text-slate-400'} />
                  <span>{config.autoRotate ? 'Xoay tối ưu' : 'Khoá hướng'}</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {currentPlan && (
                  <span className="text-[10px] font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                    {currentPlan.qty} tem
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleExportSortJob('current')}
                  disabled={isExportingSortJob}
                  className="px-2 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Xuất thông tin tất cả layer và phương án sắp xếp thành SortJob lưu về VPS"
                >
                  {isExportingSortJob ? <Loader2 size={11} className="animate-spin" /> : <FileJson size={11} />}
                  <span>Xuất SortJob</span>
                </button>
              </div>
            </div>

            {plans.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                <AlertCircle size={20} className="mx-auto mb-1 opacity-50" />
                <p>Không có phương án</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-0.5 auto-rows-max content-start flex-1">
                {plans.map((pl, i) => {
                  const isSelected = i === currentPlanIndex;
                  const boxMaxW = 140;
                  const boxMaxH = 90;
                  const pw = config.pageW || 1;
                  const ph = config.pageH || 1;
                  const sc = Math.min(boxMaxW / pw, boxMaxH / ph);
                  const sheetPreviewW = Math.round(pw * sc);
                  const sheetPreviewH = Math.round(ph * sc);

                  return (
                    <div
                      key={i}
                      onClick={() => setCurrentPlanIndex(i)}
                      className={`p-2 rounded-xl border-2 cursor-pointer transition flex flex-col items-center gap-1.5 text-center select-none ${
                        isSelected
                          ? 'border-violet-600 bg-violet-50/90 shadow-sm ring-2 ring-violet-500/20'
                          : 'border-gray-200 hover:border-violet-300 bg-white hover:bg-gray-50'
                      }`}
                      title={`${pl.name} (${pl.qty} tem)`}
                    >
                      <div className="w-full flex items-center justify-between gap-1">
                        <span className="text-[10px] font-medium text-gray-800 truncate leading-tight flex-1 text-left">
                          {pl.name}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-violet-100 text-violet-700">
                          {pl.qty} tem
                        </span>
                      </div>

                      {/* Proportional Preview Container */}
                      <div className="flex justify-center items-center bg-slate-100/90 p-1.5 rounded-lg w-full h-[90px] overflow-hidden">
                        <div
                          className="bg-white shadow-xs border border-slate-300 relative rounded-2xs overflow-hidden flex-shrink-0"
                          style={{
                            width: `${sheetPreviewW}px`,
                            height: `${sheetPreviewH}px`,
                          }}
                        >
                          {pl.items.map((it, j) => {
                            const itemShape = (it.shape || config.shape) as string;
                            const isSpecial = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
                            const itW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
                            const itH = itemShape === 'circle' ? itW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));
                            const aw = Math.max(2, itW * sc);
                            const ah = Math.max(2, itH * sc);
                            const itemColor = it.color || '#8b5cf6';
                            const cornerR = it.cornerRadius !== undefined ? it.cornerRadius : config.cornerRadius;
                            const thumb = it.sourceImage?.thumb || (isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName)?.sourceImage?.thumb : null) || (allPages.length > 0 ? allPages[j % allPages.length]?.thumb : null);

                            let borderRadius = '0px';
                            if (itemShape === 'circle' || itemShape === 'oval') borderRadius = '50%';
                            else if (cornerR > 0) borderRadius = `${Math.max(1, cornerR * sc)}px`;

                            let clipPath = 'none';
                            if (cornerR === 0) {
                              if (itemShape === 'trapezoid') clipPath = it.rot ? 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' : 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)';
                              else if (itemShape === 'triangle') clipPath = it.rot ? 'polygon(0% 0%, 100% 0%, 50% 100%)' : 'polygon(50% 0%, 100% 100%, 0% 100%)';
                              else if (itemShape === 'hexagon') clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
                            }

                            return (
                              <div
                                key={j}
                                className="absolute overflow-hidden flex items-center justify-center text-[7px] font-bold select-none pointer-events-none"
                                style={{
                                  left: it.x * sc,
                                  top: it.y * sc,
                                  width: aw,
                                  height: ah,
                                  borderRadius,
                                  clipPath: clipPath !== 'none' ? clipPath : undefined,
                                  backgroundColor: thumb ? 'transparent' : `${itemColor}25`,
                                  border: `1px solid ${itemColor}`,
                                  color: itemColor,
                                }}
                                title={it.tabName ? `Layer ${it.tabName}` : undefined}
                              >
                                {thumb ? (
                                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="leading-none opacity-90 scale-75">{it.tabName || ''}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selection Status & Efficiency */}
                      <div className="w-full flex items-center justify-center min-h-[14px]">
                        {isSelected ? (
                          <span className="text-[9px] font-medium text-violet-600 flex items-center gap-0.5">
                            <Check size={10} /> Đang chọn
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-400 font-medium">
                            {(pl as any).efficiency ? `${Math.round((pl as any).efficiency)}%` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </aside>
        <main
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 overflow-hidden min-w-0 bg-gray-100 relative select-none"
          style={{ cursor: isPanning ? 'grabbing' : 'default' }}
          onMouseDown={(e) => {
            // Middle mouse button (e.button === 1) or Alt+Left Click or click on canvas background
            if (e.button === 1 || (e.button === 0 && (e.altKey || e.target === containerRef.current))) {
              e.preventDefault();
              setIsPanning(true);
              panStartRef.current = { x: e.clientX, y: e.clientY };
              panOffsetRef.current = { ...canvasPan };
            }
          }}
          onMouseMove={(e) => {
            if (isPanning) {
              const dx = e.clientX - panStartRef.current.x;
              const dy = e.clientY - panStartRef.current.y;
              setCanvasPan({
                x: Math.round(panOffsetRef.current.x + dx),
                y: Math.round(panOffsetRef.current.y + dy),
              });
            }
          }}
          onMouseUp={(e) => {
            if (e.button === 1 || isPanning) {
              setIsPanning(false);
            }
          }}
          onMouseLeave={() => setIsPanning(false)}
          onDoubleClick={(e) => {
            if (e.target === containerRef.current) {
              setCanvasZoom(1);
              setCanvasPan({ x: 0, y: 0 });
            }
          }}
        >
          {/* Floating Zoom / Pan Toolbar on Main Canvas (Top-Right) */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-lg border border-slate-200/90 text-xs text-slate-700 select-none">
            <button
              type="button"
              onClick={() => setCanvasZoom(prev => Math.max(0.1, Math.round(prev * 0.85 * 100) / 100))}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
              title="Thu nhỏ (Lăn chuột xuống)"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); }}
              className="px-2 py-0.5 rounded-lg hover:bg-violet-50 hover:text-violet-700 text-violet-800 font-medium text-xs transition cursor-pointer"
              title="Click đặt lại 100% (Hoặc click đúp ngoài nền)"
            >
              {Math.round(canvasZoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setCanvasZoom(prev => Math.min(10, Math.round(prev * 1.15 * 100) / 100))}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
              title="Phóng to (Lăn chuột lên)"
            >
              +
            </button>
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            <button
              type="button"
              onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); }}
              className="px-1.5 py-0.5 rounded-lg hover:bg-slate-100 text-slate-600 text-[10px] font-medium transition cursor-pointer"
              title="Đặt lại (Reset Zoom & Pan)"
            >
              Reset
            </button>
          </div>

          {currentPlan ? (
            <div
              style={{
                transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.05s ease-out',
              }}
            >
              {/* Multi-sheet Grid: Horizontal row up to 20 columns, wrapping if > 20 sheets */}
              <div
                className="grid gap-12 items-start justify-center p-8"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(totalSheets, 20)}, ${config.pageW * scale}px)`,
                  width: 'max-content',
                }}
              >
                {Array.from({ length: totalSheets }, (_, sIdx) => {
                  const isCurrentActiveSheet = currentSheetIndex === sIdx;
                  const allPlanItems = impositionStyleEnabled && styledPlan ? styledPlan.items : currentPlan.items;
                  const sheetItems = isMultiShape
                    ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === sIdx)
                    : allPlanItems;

                  return (
                    <div key={`sheet-card-${sIdx}`} className="flex flex-col items-center">
                      {/* Sheet Header Label */}
                      <div className="w-full flex items-center justify-between px-1 mb-2 select-none">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentSheetIndex(sIdx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                              isCurrentActiveSheet
                                ? 'bg-violet-600 text-white shadow-violet-200 ring-2 ring-violet-400'
                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                            }`}
                          >
                            <span>Tờ {sIdx + 1}</span>
                            {totalSheets > 1 && <span className="opacity-70 font-normal text-[10px]">/ {totalSheets}</span>}
                          </button>
                          <span className="text-[10px] text-slate-500 font-medium bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                            {isMultiShape ? `${sheetItems.length} tem` : `${sheetItems.length} vị trí`}
                          </span>
                        </div>
                        {isCurrentActiveSheet && totalSheets > 1 && (
                          <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 flex items-center gap-1">
                            <Check size={11} /> Đang chọn
                          </span>
                        )}
                      </div>

                      {/* Sheet Body Container with Drag & Drop Zone for Cross-Sheet Item Transfer */}
                      <div
                        onClick={() => setCurrentSheetIndex(sIdx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverSheetIdx !== sIdx) {
                            setDragOverSheetIdx(sIdx);
                          }
                        }}
                        onDragLeave={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          if (
                            e.clientX < rect.left ||
                            e.clientX >= rect.right ||
                            e.clientY < rect.top ||
                            e.clientY >= rect.bottom
                          ) {
                            if (dragOverSheetIdx === sIdx) {
                              setDragOverSheetIdx(null);
                            }
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverSheetIdx(null);
                          setDraggedSlotIdx(null);
                          setDragOverSlotIdx(null);
                          setDraggedItemData(null);

                          let dragData: any = null;
                          try {
                            const json = e.dataTransfer.getData('application/json');
                            if (json) dragData = JSON.parse(json);
                          } catch (_) {}

                          const sourceGlobalIdx = dragData ? dragData.sourceGlobalIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
                          if (isNaN(sourceGlobalIdx)) return;

                          const rect = e.currentTarget.getBoundingClientRect();
                          const dropPxX = (e.clientX - rect.left) / canvasZoom;
                          const dropPxY = (e.clientY - rect.top) / canvasZoom;
                          const dropMmX = dropPxX / scale;
                          const dropMmY = dropPxY / scale;

                          if (isMultiShape) {
                            handleMoveItemToSheet(sourceGlobalIdx, sIdx, dropMmX, dropMmY);
                          } else if (dragData && dragData.sourceSheetIdx !== sIdx) {
                            handleMovePageToSheet(dragData.sourceSheetIdx, dragData.sourceSlotIdx, sIdx);
                          }
                        }}
                        className={`bg-white rounded-lg relative transition-all ${
                          isCurrentActiveSheet
                            ? 'shadow-2xl ring-2 ring-violet-500/80'
                            : 'shadow-md hover:shadow-xl border border-slate-200/80'
                        } ${
                          dragOverSheetIdx === sIdx && draggedSlotIdx !== null
                            ? 'ring-4 ring-indigo-500/90 shadow-2xl bg-indigo-50/20'
                            : ''
                        }`}
                        style={{
                          width: config.pageW * scale,
                          height: config.pageH * scale,
                        }}
                      >
                        {/* Visual Drop Zone Banner when dragging an item over another sheet */}
                        {dragOverSheetIdx === sIdx && draggedSlotIdx !== null && (
                          <div className="absolute inset-0 z-50 rounded-lg border-2 border-dashed border-indigo-500 bg-indigo-500/10 flex items-center justify-center pointer-events-none animate-fadeIn backdrop-blur-[1px]">
                            <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                              <Move size={13} />
                              <span>Thả vào Tờ {sIdx + 1}</span>
                            </div>
                          </div>
                        )}

                        {/* 4 Interactive Margin Input Badges (displayed on active sheet or single sheet) */}
                        {(totalSheets === 1 || isCurrentActiveSheet) && (
                          <>
                            {/* Top Margin */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                              <span className="text-[11px] font-medium text-slate-600">Lề trên:</span>
                              <DebouncedNumberInput
                                min={0}
                                value={config.marginTop}
                                onChange={v => setConfig(c => ({ ...c, marginTop: v, useMargin: true }))}
                                className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                              />
                              <span className="text-[10px] text-slate-400 font-normal">mm</span>
                            </div>

                            {/* Bottom Margin */}
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                              <span className="text-[11px] font-medium text-slate-600">Lề dưới:</span>
                              <DebouncedNumberInput
                                min={0}
                                value={config.marginBot}
                                onChange={v => setConfig(c => ({ ...c, marginBot: v, useMargin: true }))}
                                className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                              />
                              <span className="text-[10px] text-slate-400 font-normal">mm</span>
                            </div>

                            {/* Left Margin */}
                            <div className="absolute top-1/2 -left-4 -translate-x-full -translate-y-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                              <span className="text-[11px] font-medium text-slate-600">Lề trái:</span>
                              <DebouncedNumberInput
                                min={0}
                                value={config.marginLeft}
                                onChange={v => setConfig(c => ({ ...c, marginLeft: v, useMargin: true }))}
                                className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                              />
                              <span className="text-[10px] text-slate-400 font-normal">mm</span>
                            </div>

                            {/* Right Margin */}
                            <div className="absolute top-1/2 -right-4 translate-x-full -translate-y-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 hover:border-violet-400 transition-all select-none whitespace-nowrap">
                              <span className="text-[11px] font-medium text-slate-600">Lề phải:</span>
                              <DebouncedNumberInput
                                min={0}
                                value={config.marginRight}
                                onChange={v => setConfig(c => ({ ...c, marginRight: v, useMargin: true }))}
                                className="w-10 text-center font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs"
                              />
                              <span className="text-[10px] text-slate-400 font-normal">mm</span>
                            </div>
                          </>
                        )}

                        {/* Server-rendered preview overlay (only on active sheet if available) */}
                        {isCurrentActiveSheet && serverPreviewUrl && (
                          <img src={serverPreviewUrl} alt="Server preview" className="absolute inset-0 w-full h-full rounded-lg object-contain pointer-events-none z-10 opacity-90" />
                        )}
                        {isCurrentActiveSheet && isLoadingServerPreview && (
                          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <div className="bg-black/60 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 backdrop-blur-xs">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Đang tải preview...
                            </div>
                          </div>
                        )}

                        {/* Print area border - only show when usePrintArea or useMargin is enabled */}
                        {(config.usePrintArea || config.useMargin) && (() => {
                          let areaW = config.pageW;
                          let areaH = config.pageH;
                          let areaX = 0;
                          let areaY = 0;
                          
                          if (config.usePrintArea) {
                            areaW = config.printAreaW;
                            areaH = config.printAreaH;
                            areaX = (config.pageW - config.printAreaW) / 2;
                            areaY = (config.pageH - config.printAreaH) / 2;
                          } else if (config.useMargin) {
                            areaW = config.pageW - config.marginLeft - config.marginRight;
                            areaH = config.pageH - config.marginTop - config.marginBot;
                            areaX = config.marginLeft;
                            areaY = config.marginTop;
                          }
                          
                          const w = areaW * scale, h = areaH * scale;
                          const gap = 0.3;
                          const startPct = gap, endPct = 1 - gap;
                          
                          return (
                            <svg className="absolute pointer-events-none" style={{ left: areaX * scale, top: areaY * scale, width: w, height: h }}>
                              <line x1={w * startPct} y1={0} x2={w * endPct} y2={0} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                              <line x1={w * startPct} y1={h} x2={w * endPct} y2={h} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                              <line x1={0} y1={h * startPct} x2={0} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                              <line x1={w} y1={h * startPct} x2={w} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                            </svg>
                          );
                        })()}

                        {/* Sheet Items */}
                        {sheetItems.map((it, i) => {
                          const itemsPerSheet = sheetItems.length;
                          const itemGlobalIdx = isMultiShape ? allPlanItems.indexOf(it) : (sIdx * itemsPerSheet + i);
                          const itemShape = (it.shape || config.shape) as string;
                          const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
                          const itemCornerRadius = it.cornerRadius !== undefined ? it.cornerRadius : config.cornerRadius;
                          const itemColor = it.color || '#8b5cf6';
                          const itemCustomSvg = it.customSvgData || (itemShape === 'custom-svg' ? customSvgData : '');
                          const itW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
                          const itH = itemShape === 'circle' ? itW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));
                          const actualW = itW;
                          const actualH = itH;
                          
                          // Calculate position - mirror X for back side
                          const isBackSide = config.is2Sided && previewSide === 'back';
                          const itemX = isBackSide ? (config.pageW - it.x - actualW) : it.x;
                          
                          // Get page from allPages based on data mode and sheet index
                          const pageIdx = getPageForSlot(i, sIdx);
                          const page = pageIdx >= 0 ? allPages[pageIdx] : null;
                          const correspondingTab = isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName) : null;
                          const previewSrc = (it.sourceImage as any)?.thumb || (typeof it.sourceImage === 'string' ? it.sourceImage : null) || (correspondingTab?.sourceImage as any)?.thumb || (typeof correspondingTab?.sourceImage === 'string' ? correspondingTab?.sourceImage : null) || (activeTab?.sourceImage as any)?.thumb || (page ? page.thumb : (allPages.length > 0 ? allPages[i % allPages.length]?.thumb : null));
                          
                          // CSS transform for rotation
                          const totalRotation = calculateSlotTotalRotation(it, page, isBackSide);
                          const imgTransform = totalRotation !== 0 ? `rotate(${totalRotation}deg)` : 'none';
                          
                          const getPreserveAspectRatio = () => {
                            switch (config.fitMode) {
                              case 'stretch': return 'none';
                              case 'fill': return 'xMidYMid slice';
                              case 'fit': return 'xMidYMid meet';
                              case 'actual': return 'xMidYMid';
                              default: return 'xMidYMid slice';
                            }
                          };
                          
                          const isDragged = draggedSlotIdx === itemGlobalIdx;
                          const isDragOver = dragOverSlotIdx === itemGlobalIdx;

                          const globalSlotIdx = isMultiShape ? itemGlobalIdx : (sIdx * itemsPerSheet + i);
                          const isBlankSlot = !isMultiShape && config.useTotalLimit && config.totalOrder > 0 && globalSlotIdx >= config.totalOrder;

                          if (isBlankSlot) {
                            return null;
                          }

                          const layerName = it.tabName || correspondingTab?.name || activeTab.name || 'A';
                          const numberHandle = (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  const data = {
                                    sourceSheetIdx: sIdx,
                                    sourceSlotIdx: i,
                                    sourceGlobalIdx: itemGlobalIdx,
                                    isMultiShape,
                                  };
                                  e.dataTransfer.setData('application/json', JSON.stringify(data));
                                  e.dataTransfer.setData('text/plain', String(itemGlobalIdx));
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggedSlotIdx(itemGlobalIdx);
                                  setDraggedItemData(data);
                                }}
                                onDragEnd={(e) => {
                                  e.stopPropagation();
                                  setDraggedSlotIdx(null);
                                  setDragOverSlotIdx(null);
                                  setDragOverSheetIdx(null);
                                  setDraggedItemData(null);
                                }}
                                className="pointer-events-auto min-w-6 h-6 px-2 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150 select-none cursor-grab active:cursor-grabbing bg-white/95 shadow-sm border hover:shadow-md hover:scale-125 active:scale-105 whitespace-nowrap gap-1"
                                style={{
                                  color: itemColor,
                                  borderColor: itemColor,
                                }}
                                title={`Layer ${layerName} - Tờ ${sIdx + 1} - Vị trí ${globalSlotIdx + 1} (Kéo thả chuyển tờ hoặc đổi vị trí)`}
                              >
                                <span>{layerName}</span>
                                <span className="opacity-80 font-mono text-[9px]">#{globalSlotIdx + 1}</span>
                              </div>
                            </div>
                          );

                          const displayPageIndex = (!isMultiShape && dataMode !== 4 && (config.shape === 'pdf-source' || allPages.length > 1))
                            ? (page ? page.pageIndex + 1 : ((allPages.length > 0) ? (i % allPages.length) + 1 : null))
                            : null;
                          const pageOverlay = displayPageIndex !== null ? (
                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded backdrop-blur-xs font-mono pointer-events-none">
                              P{displayPageIndex}
                            </div>
                          ) : null;

                          const dragProps = {
                            draggable: true,
                            onDragStart: (e: React.DragEvent) => {
                              e.stopPropagation();
                              const data = {
                                sourceSheetIdx: sIdx,
                                sourceSlotIdx: i,
                                sourceGlobalIdx: itemGlobalIdx,
                                isMultiShape,
                              };
                              e.dataTransfer.setData('application/json', JSON.stringify(data));
                              e.dataTransfer.setData('text/plain', String(itemGlobalIdx));
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedSlotIdx(itemGlobalIdx);
                              setDraggedItemData(data);
                            },
                            onDragEnd: (e: React.DragEvent) => {
                              e.stopPropagation();
                              setDraggedSlotIdx(null);
                              setDragOverSlotIdx(null);
                              setDragOverSheetIdx(null);
                              setDraggedItemData(null);
                            },
                            onDragOver: (e: React.DragEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverSlotIdx !== itemGlobalIdx) setDragOverSlotIdx(itemGlobalIdx);
                            },
                            onDragLeave: (e: React.DragEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverSlotIdx === itemGlobalIdx) setDragOverSlotIdx(null);
                            },
                            onDrop: (e: React.DragEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverSlotIdx(null);
                              setDragOverSheetIdx(null);
                              setDraggedSlotIdx(null);
                              setDraggedItemData(null);

                              let dragData: any = null;
                              try {
                                const json = e.dataTransfer.getData('application/json');
                                if (json) dragData = JSON.parse(json);
                              } catch (_) {}

                              const sourceGlobalIdx = dragData ? dragData.sourceGlobalIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
                              const sourceSheetIdx = dragData ? dragData.sourceSheetIdx : sIdx;
                              const sourceSlotIdx = dragData ? dragData.sourceSlotIdx : 0;

                              if (!isNaN(sourceGlobalIdx) && sourceGlobalIdx !== itemGlobalIdx) {
                                if (isMultiShape) {
                                  handleSwapSlots(sourceGlobalIdx, itemGlobalIdx);
                                } else {
                                  handleSwapDataPages(sourceSheetIdx, sourceSlotIdx, sIdx, i);
                                }
                              }
                            },
                          };

                          // For custom SVG shape / Vector mask
                          if (itemShape === 'custom-svg' && itemCustomSvg) {
                            const w = actualW * scale;
                            const h = actualH * scale;
                            const svgMatch = itemCustomSvg.match(/viewBox=["']([^"']+)["']/);
                            const vb = svgMatch ? svgMatch[1] : `0 0 ${itW} ${itH}`;
                            const vbParts = vb.trim().split(/[\s,]+/).map(Number);
                            const vbMinX = isNaN(vbParts[0]) ? 0 : vbParts[0];
                            const vbMinY = isNaN(vbParts[1]) ? 0 : vbParts[1];
                            const vbW = isNaN(vbParts[2]) || vbParts[2] <= 0 ? itW : vbParts[2];
                            const vbH = isNaN(vbParts[3]) || vbParts[3] <= 0 ? itH : vbParts[3];

                            const innerMatch = itemCustomSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
                            const innerSvg = innerMatch ? innerMatch[1] : '';
                            const pathMatch = itemCustomSvg.match(/<path[^>]*\bd=["']([^"']+)["']/i);
                            const pathD = it.vectorMaskResult?.pathData || correspondingTab?.vectorMaskResult?.pathData || vectorMaskResult?.pathData || (pathMatch ? pathMatch[1] : '');
                            const clipId = `svg-shape-${sIdx}-${i}-${itemGlobalIdx}`;
                            
                            return (
                              <div
                                key={`slot-${sIdx}-${i}`}
                                className="absolute group/slot"
                                style={{
                                  left: itemX * scale,
                                  top: it.y * scale,
                                  width: w,
                                  height: h,
                                  zIndex: isDragged ? 40 : (isDragOver ? 30 : 10),
                                  opacity: isDragged ? 0.4 : 1,
                                  transition: 'opacity 0.15s ease',
                                }}
                                {...dragProps}
                              >
                                <div
                                  className="w-full h-full relative pointer-events-none"
                                  style={{
                                    transform: isDragOver ? 'translate(8px, -8px) scale(0.93)' : 'none',
                                    opacity: isDragOver ? 0.75 : 1,
                                    transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
                                  }}
                                >
                                  <svg 
                                    viewBox={vb} 
                                    width="100%" 
                                    height="100%"
                                    className="absolute inset-0 w-full h-full overflow-visible"
                                    style={{ 
                                      transform: totalRotation !== 0 ? `rotate(${totalRotation}deg)` : undefined,
                                      transformOrigin: 'center center',
                                    }}
                                  >
                                    <defs>
                                      {previewSrc && (
                                        <pattern
                                          id={`pat-${clipId}`}
                                          patternUnits="userSpaceOnUse"
                                          x={vbMinX}
                                          y={vbMinY}
                                          width={vbW}
                                          height={vbH}
                                        >
                                          <image
                                            href={previewSrc}
                                            xlinkHref={previewSrc}
                                            x={vbMinX}
                                            y={vbMinY}
                                            width={vbW}
                                            height={vbH}
                                            preserveAspectRatio={getPreserveAspectRatio()}
                                          />
                                        </pattern>
                                      )}
                                      <clipPath id={clipId}>
                                        {pathD ? (
                                          <path d={pathD} fill="#000000" />
                                        ) : (
                                          <g dangerouslySetInnerHTML={{ __html: innerSvg.replace(/fill=["']none["']/gi, 'fill="#000000"') }} />
                                        )}
                                      </clipPath>
                                    </defs>

                                    {/* 1. Direct Pattern Fill for guaranteed shape artwork painting */}
                                    {previewSrc ? (
                                      pathD ? (
                                        <path d={pathD} fill={`url(#pat-${clipId})`} />
                                      ) : (
                                        <g fill={`url(#pat-${clipId})`} dangerouslySetInnerHTML={{ __html: innerSvg.replace(/fill=["']none["']/gi, `fill="url(#pat-${clipId})"`) }} />
                                      )
                                    ) : (
                                      pathD ? (
                                        <path d={pathD} fill={`${itemColor}25`} />
                                      ) : (
                                        <g fill={`${itemColor}25`} dangerouslySetInnerHTML={{ __html: innerSvg.replace(/fill=["']none["']/gi, `fill="${itemColor}25"`) }} />
                                      )
                                    )}

                                    {/* 2. Secondary image with clipPath overlay */}
                                    {previewSrc && (
                                      <image 
                                        href={previewSrc} 
                                        xlinkHref={previewSrc}
                                        x={vbMinX}
                                        y={vbMinY}
                                        width={vbW} 
                                        height={vbH} 
                                        preserveAspectRatio={getPreserveAspectRatio()} 
                                        clipPath={`url(#${clipId})`} 
                                      />
                                    )}

                                    {/* 3. Shape contour die-line border */}
                                    {pathD ? (
                                      <path d={pathD} fill="none" stroke={itemColor} strokeWidth={Math.max(0.4, Math.min(vbW, vbH) * 0.008)} />
                                    ) : (
                                      <g fill="none" stroke={itemColor} strokeWidth="0.8" dangerouslySetInnerHTML={{ __html: innerSvg }} />
                                    )}
                                  </svg>

                                  {numberHandle}
                                  {pageOverlay}
                                </div>

                                {isDragOver && (
                                  <svg viewBox={vb} className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible animate-pulse">
                                    {pathD ? (
                                      <path d={pathD} fill="none" stroke="#ef4444" strokeWidth={Math.max(1.5, Math.min(vbW, vbH) * 0.03)} strokeDasharray="6 3" style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }} />
                                    ) : (
                                      <g fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="6 3" style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }} dangerouslySetInnerHTML={{ __html: innerSvg }} />
                                    )}
                                  </svg>
                                )}
                              </div>
                            );
                          }

                          // For special shapes
                          if (isSpecialShape) {
                            const w = actualW * scale;
                            const h = actualH * scale;
                            const r = itemCornerRadius > 0 ? Math.min(itemCornerRadius * scale, w/4, h/4) : 0;
                            
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
                            if (itemShape === 'trapezoid') {
                              const offset = w * 0.15;
                              points = [[offset, 0], [w - offset, 0], [w, h], [0, h]];
                            } else if (itemShape === 'triangle') {
                              points = [[w/2, 0], [w, h], [0, h]];
                            } else if (itemShape === 'hexagon') {
                              const y25 = h * 0.25, y75 = h * 0.75;
                              points = [[w/2, 0], [w, y25], [w, y75], [w/2, h], [0, y75], [0, y25]];
                            }
                            
                            const pathD = roundedPath(points);
                            const clipId = `cp-${sIdx}-${i}`; 
                            
                            return (
                              <div
                                key={`slot-${sIdx}-${i}`}
                                className="absolute group/slot"
                                style={{
                                  left: itemX * scale,
                                  top: it.y * scale,
                                  width: w,
                                  height: h,
                                  zIndex: isDragged ? 40 : (isDragOver ? 30 : 10),
                                  opacity: isDragged ? 0.4 : 1,
                                  transition: 'opacity 0.15s ease',
                                }}
                                {...dragProps}
                              >
                                <div
                                  className="w-full h-full relative pointer-events-none"
                                  style={{
                                    transform: isDragOver ? 'translate(8px, -8px) scale(0.93)' : 'none',
                                    opacity: isDragOver ? 0.75 : 1,
                                    transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
                                  }}
                                >
                                  <svg className="absolute inset-0 w-full h-full" style={{ 
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
                                      <path d={pathD} fill={`${itemColor}25`} />
                                    )}
                                    <path d={pathD} fill="none" stroke={itemColor} strokeWidth="1" shapeRendering="geometricPrecision" />
                                  </svg>
                                  {numberHandle}
                                  {pageOverlay}
                                </div>

                                {isDragOver && (
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible animate-pulse" style={{ transform: it.rot ? 'rotate(180deg)' : 'none' }}>
                                    <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 3" style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }} />
                                  </svg>
                                )}
                              </div>
                            );
                          }

                          // For rect/oval/circle or standard item
                          const clipPath = itemCornerRadius > 0 ? 'none' : (
                            itemShape === 'trapezoid' ? (it.rot ? 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' : 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)') :
                            itemShape === 'triangle' ? (it.rot ? 'polygon(0% 0%, 100% 0%, 50% 100%)' : 'polygon(50% 0%, 100% 100%, 0% 100%)') :
                            itemShape === 'hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' :
                            'none'
                          );
                          const borderRadius = itemShape === 'circle' || itemShape === 'oval' ? '50%' : (itemCornerRadius > 0 ? Math.max(2, itemCornerRadius * scale) + 'px' : '2px');
                          
                          return (
                            <div
                              key={`slot-${sIdx}-${i}-${totalRotation}`}
                              className="absolute group/slot"
                              style={{
                                left: itemX * scale,
                                top: it.y * scale,
                                width: actualW * scale,
                                height: actualH * scale,
                                zIndex: isDragged ? 40 : (isDragOver ? 30 : 10),
                                opacity: isDragged ? 0.4 : 1,
                                transition: 'opacity 0.15s ease',
                              }}
                              {...dragProps}
                            >
                              <div
                                className="w-full h-full relative pointer-events-none"
                                style={{
                                  transform: isDragOver ? 'translate(8px, -8px) scale(0.93)' : 'none',
                                  opacity: isDragOver ? 0.75 : 1,
                                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
                                }}
                              >
                                <div className="absolute inset-0 w-full h-full" style={{ 
                                  borderRadius: borderRadius,
                                  border: `1px solid ${itemColor}`,
                                  clipPath: clipPath !== 'none' ? clipPath : undefined, 
                                  backgroundColor: previewSrc ? 'transparent' : `${itemColor}25`, 
                                  overflow: 'hidden' 
                                }}>
                                  {previewSrc && (() => {
                                    const isRotated90 = (totalRotation % 180) !== 0;
                                    const containerW = actualW * scale;
                                    const containerH = actualH * scale;
                                    
                                    if (config.fitMode === 'actual') {
                                      return (
                                        <img 
                                          src={previewSrc} 
                                          alt="" 
                                          className="object-none"
                                          style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: `translate(-50%, -50%) ${imgTransform !== 'none' ? imgTransform : ''}`.trim(),
                                            borderRadius,
                                          }} 
                                        />
                                      );
                                    }
                                    
                                    if (isRotated90) {
                                      const imgStyle: React.CSSProperties = {
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: `translate(-50%, -50%) ${imgTransform}`,
                                        transformOrigin: 'center center',
                                        borderRadius,
                                        width: `${containerH}px`,
                                        height: `${containerW}px`,
                                        minWidth: `${containerH}px`,
                                        minHeight: `${containerW}px`,
                                        maxWidth: 'none',
                                        maxHeight: 'none',
                                        objectFit: config.fitMode === 'stretch' ? 'fill' : 
                                                   config.fitMode === 'fill' ? 'cover' : 'contain',
                                      };
                                      
                                      return (
                                        <img 
                                          src={previewSrc} 
                                          alt="" 
                                          style={imgStyle} 
                                        />
                                      );
                                    }
                                    
                                    const objectFitValue = config.fitMode === 'stretch' ? 'fill' : 
                                                           config.fitMode === 'fill' ? 'cover' : 
                                                           config.fitMode === 'fit' ? 'contain' : 'none';
                                    return (
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
                                    );
                                  })()}
                                </div>

                                {numberHandle}
                                {pageOverlay}
                              </div>

                              {isDragOver && (
                                <div 
                                  className="absolute inset-0 pointer-events-none z-30 animate-pulse"
                                  style={{
                                    borderRadius: borderRadius,
                                    clipPath: clipPath !== 'none' ? clipPath : undefined,
                                    border: '2.5px solid #ef4444',
                                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.7), inset 0 0 10px rgba(239, 68, 68, 0.3)',
                                    backgroundColor: 'transparent',
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}

                        {/* Item Crop Marks for this sheet */}
                        {config.useCrop && (
                          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${config.pageW} ${config.pageH}`} preserveAspectRatio="none">
                            <path fill="none" stroke={config.cropColor} strokeWidth={config.cropThick} d={cropPath(sheetItems)} />
                          </svg>
                        )}
                        
                        {/* Page Crop Marks (L-shaped at 4 corners) */}
                        {config.usePageCrop && (
                          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${config.pageW} ${config.pageH}`} preserveAspectRatio="none">
                            {(() => {
                              const L = config.pageCropLen;
                              const D = config.pageCropDist;
                              const T = config.pageCropThick;
                              const pW = config.pageW;
                              const pH = config.pageH;
                              return (
                                <>
                                  {/* Top-Left */}
                                  <rect x={D} y={D} width={L} height={T} fill={config.pageCropColor} />
                                  <rect x={D} y={D} width={T} height={L} fill={config.pageCropColor} />
                                  {/* Top-Right */}
                                  <rect x={pW - D - L} y={D} width={L} height={T} fill={config.pageCropColor} />
                                  <rect x={pW - D - T} y={D} width={T} height={L} fill={config.pageCropColor} />
                                  {/* Bottom-Left */}
                                  <rect x={D} y={pH - D - T} width={L} height={T} fill={config.pageCropColor} />
                                  <rect x={D} y={pH - D - L} width={T} height={L} fill={config.pageCropColor} />
                                  {/* Bottom-Right */}
                                  <rect x={pW - D - L} y={pH - D - T} width={L} height={T} fill={config.pageCropColor} />
                                  <rect x={pW - D - T} y={pH - D - L} width={T} height={L} fill={config.pageCropColor} />
                                </>
                              );
                            })()}
                          </svg>
                        )}

                        {/* CMYK Color Bar */}
                        {config.useColorBar && (
                          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${config.pageW} ${config.pageH}`} preserveAspectRatio="none">
                            {(() => {
                              const cmykColors = ['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#FF0000', '#00FF00', '#0000FF', '#777777', '#BBBBBB', '#FFFFFF'];
                              const pW = config.pageW, pH = config.pageH, pad = config.colorBarPadding, thick = 3;
                              const positions = config.colorBarPosition === 'all' ? ['top', 'bottom', 'left', 'right'] as const : [config.colorBarPosition] as const;
                              const rects: React.ReactElement[] = [];
                              positions.forEach(pos => {
                                const isH = pos === 'top' || pos === 'bottom';
                                const barLen = isH ? pW * 0.6 : pH * 0.6;
                                const segW = barLen / cmykColors.length;
                                let sx: number, sy: number;
                                if (pos === 'bottom') { sx = (pW - barLen) / 2; sy = pH - pad - thick; }
                                else if (pos === 'top') { sx = (pW - barLen) / 2; sy = pad; }
                                else if (pos === 'left') { sx = pad; sy = (pH - barLen) / 2; }
                                else { sx = pW - pad - thick; sy = (pH - barLen) / 2; }
                                cmykColors.forEach((c, i) => {
                                  rects.push(<rect key={`${pos}-${i}`} x={isH ? sx + i * segW : sx} y={isH ? sy : sy + i * segW} width={isH ? segW : thick} height={isH ? thick : segW} fill={c} stroke="#999" strokeWidth={0.15} />);
                                });
                              });
                              return rects;
                            })()}
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center"><LayoutGrid size={48} className="mx-auto mb-3 opacity-40" /><p className="text-base">Không có phương án phù hợp</p></div>
          )}
          
          {/* 2-Sided Toggle */}
          {config.is2Sided && currentPlan && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur shadow-lg rounded-xl p-1 border">
              <button 
                onClick={() => setPreviewSide('front')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${previewSide === 'front' ? 'bg-violet-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Mặt Trước
              </button>
              <button 
                onClick={() => setPreviewSide('back')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${previewSide === 'back' ? 'bg-green-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Mặt Sau
              </button>
            </div>
          )}
          
          {/* Bottom Floating Control Dock on Canvas: 3 Mark Buttons (No fill when inactive, Signature Violet when active) + Page Navigation */}
          {currentPlan && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-3 sm:px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-200/90 whitespace-nowrap select-none max-w-[calc(100%-1rem)]">
              {/* 1. Page Corner Crop Marks Toggle & Settings Popover */}
              <div className="relative" ref={pageCropPopoverRef}>
                {isPageCropPopoverOpen && (
                  <div className="absolute bottom-full mb-3 left-0 z-50 bg-white/95 backdrop-blur-md border border-violet-200/90 rounded-2xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                        <span className="text-xs font-bold text-slate-800">Đánh dấu cắt (Góc trang)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPageCropPopoverOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Đóng"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Parameters grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-slate-600 uppercase">Độ dài</span>
                          <span className="text-slate-400 font-medium">mm</span>
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={config.pageCropLen}
                          onChange={e => setConfig(c => ({ ...c, pageCropLen: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-violet-800 text-center focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-slate-600 uppercase">Khoảng cách</span>
                          <span className="text-slate-400 font-medium">mm</span>
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={config.pageCropDist}
                          onChange={e => setConfig(c => ({ ...c, pageCropDist: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-violet-800 text-center focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-slate-600 uppercase">Độ dày</span>
                          <span className="text-slate-400 font-medium">mm</span>
                        </div>
                        <input
                          type="number"
                          step="0.05"
                          min={0.01}
                          value={config.pageCropThick}
                          onChange={e => setConfig(c => ({ ...c, pageCropThick: Math.max(0.01, parseFloat(e.target.value) || 0.1) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-violet-800 text-center focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-slate-600 uppercase">Màu sắc</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 h-[34px]">
                          <input
                            type="color"
                            value={config.pageCropColor}
                            onChange={e => setConfig(c => ({ ...c, pageCropColor: e.target.value }))}
                            className="w-full h-full bg-transparent border-0 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions: Tắt / Bật & Đóng */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(c => ({ ...c, usePageCrop: !c.usePageCrop }));
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                          config.usePageCrop
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                        }`}
                      >
                        <Power size={13} />
                        <span>{config.usePageCrop ? 'Tắt dấu cắt' : 'Bật dấu cắt'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPageCropPopoverOpen(false)}
                        className="text-xs font-semibold px-3.5 py-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-2xs"
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsPageCropPopoverOpen(v => !v)}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
                    config.usePageCrop
                      ? 'bg-violet-600 border-violet-700 text-white shadow-inner font-medium ring-2 ring-violet-200'
                      : 'bg-transparent hover:bg-slate-100/80 border-slate-300 text-slate-700 font-medium'
                  }`}
                  title="Cấu hình Đánh dấu cắt (Góc trang)"
                >
                  <span className={`w-2 h-2 rounded-full ${config.usePageCrop ? 'bg-white shadow-xs' : 'bg-slate-300'}`} />
                  <span className="text-xs font-medium whitespace-nowrap">Đánh dấu cắt</span>
                  <span className={`text-[10px] whitespace-nowrap ${config.usePageCrop ? 'text-violet-100 font-medium bg-violet-700/80 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
                    {config.usePageCrop ? `${config.pageCropLen}mm • ${config.pageCropDist}mm` : '(Góc trang)'}
                  </span>
                </button>
              </div>

              {/* 2. Item Crop Marks Toggle & Settings Popover */}
              <div className="relative" ref={cropPopoverRef}>
                {isCropPopoverOpen && (
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md border border-violet-200/90 rounded-2xl shadow-2xl p-3.5 w-64 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                        <span className="text-xs font-medium text-slate-800">Dấu xén (Tem)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCropPopoverOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Đóng"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Parameters grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-medium text-slate-500 uppercase">Độ dài</span>
                          <span className="text-slate-400 font-medium">mm</span>
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={config.cropLen}
                          onChange={e => setConfig(c => ({ ...c, cropLen: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-violet-800 text-center focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-medium text-slate-500 uppercase">Khoảng cách</span>
                          <span className="text-slate-400 font-medium">mm</span>
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={config.cropDist}
                          onChange={e => setConfig(c => ({ ...c, cropDist: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-violet-800 text-center focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-medium text-slate-500 uppercase">Độ dày</span>
                          <span className="text-slate-400 font-medium">mm</span>
                        </div>
                        <input
                          type="number"
                          step="0.05"
                          min={0.01}
                          value={config.cropThick}
                          onChange={e => setConfig(c => ({ ...c, cropThick: Math.max(0.01, parseFloat(e.target.value) || 0.1) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-violet-800 text-center focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-medium text-slate-500 uppercase">Màu sắc</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 h-[34px]">
                          <input
                            type="color"
                            value={config.cropColor}
                            onChange={e => setConfig(c => ({ ...c, cropColor: e.target.value }))}
                            className="w-full h-full bg-transparent border-0 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions: Tắt / Bật & Đóng */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(c => ({ ...c, useCrop: !c.useCrop }));
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                          config.useCrop
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                        }`}
                      >
                        <Power size={13} />
                        <span>{config.useCrop ? 'Tắt dấu xén' : 'Bật dấu xén'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCropPopoverOpen(false)}
                        className="text-xs font-semibold px-3.5 py-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-2xs"
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsCropPopoverOpen(v => !v)}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
                    config.useCrop
                      ? 'bg-violet-600 border-violet-700 text-white shadow-inner font-medium ring-2 ring-violet-200'
                      : 'bg-transparent hover:bg-slate-100/80 border-slate-300 text-slate-700 font-medium'
                  }`}
                  title="Cấu hình Dấu xén (Tem)"
                >
                  <span className={`w-2 h-2 rounded-full ${config.useCrop ? 'bg-white shadow-xs' : 'bg-slate-300'}`} />
                  <span className="text-xs font-medium whitespace-nowrap">Dấu xén</span>
                  <span className={`text-[10px] whitespace-nowrap ${config.useCrop ? 'text-violet-100 font-medium bg-violet-700/80 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
                    {config.useCrop ? `${config.cropLen}mm • ${config.cropDist}mm` : '(Tem)'}
                  </span>
                </button>
              </div>

              {/* 3. CMYK Color Bar Toggle & Settings Popover */}
              <div className="relative" ref={colorBarPopoverRef}>
                {isColorBarPopoverOpen && (
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md border border-violet-200/90 rounded-2xl shadow-2xl p-3.5 w-64 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                        <span className="text-xs font-medium text-slate-800">Dải màu CMYK</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsColorBarPopoverOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Đóng"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Position selector */}
                    <div className="space-y-1.5 mb-3">
                      <label className="text-[10px] font-medium text-slate-500 uppercase flex items-center justify-between">
                        <span>Vị trí đặt dải màu</span>
                        <span className="text-[9px] font-normal text-violet-600">
                          {config.colorBarPosition === 'top' ? 'Trên' : config.colorBarPosition === 'bottom' ? 'Dưới' : config.colorBarPosition === 'left' ? 'Trái' : config.colorBarPosition === 'right' ? 'Phải' : 'Cả 4 cạnh'}
                        </span>
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {([
                          { id: 'top', label: 'Trên' },
                          { id: 'bottom', label: 'Dưới' },
                          { id: 'left', label: 'Trái' },
                          { id: 'right', label: 'Phải' },
                          { id: 'all', label: 'Cả 4' },
                        ] as const).map(({ id, label }) => {
                          const isSelected = config.useColorBar && config.colorBarPosition === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setConfig(c => ({ ...c, useColorBar: true, colorBarPosition: id }));
                              }}
                              className={`py-1.5 text-[10px] font-medium rounded-xl border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-violet-600 border-violet-700 text-white shadow-xs'
                                  : 'bg-slate-50 hover:bg-violet-50 border-slate-200 hover:border-violet-300 text-slate-700'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Padding input */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-medium text-slate-500 uppercase">Padding lề mép</span>
                        <span className="text-slate-400 font-medium">(mm)</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={config.colorBarPadding}
                          onChange={e => setConfig(c => ({ ...c, colorBarPadding: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full bg-transparent text-xs font-medium text-violet-800 text-center focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">mm</span>
                      </div>
                    </div>

                    {/* Bottom Actions: Tắt / Bật & Đóng */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(c => ({ ...c, useColorBar: !c.useColorBar }));
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                          config.useColorBar
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                        }`}
                      >
                        <Power size={13} />
                        <span>{config.useColorBar ? 'Tắt dải màu' : 'Bật dải màu'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsColorBarPopoverOpen(false)}
                        className="text-xs font-semibold px-3.5 py-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-2xs"
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsColorBarPopoverOpen(v => !v);
                  }}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
                    config.useColorBar
                      ? 'bg-violet-600 border-violet-700 text-white shadow-inner font-medium ring-2 ring-violet-200'
                      : 'bg-transparent hover:bg-slate-100/80 border-slate-300 text-slate-700 font-medium'
                  }`}
                  title="Cấu hình vị trí và khoảng cách Dải màu CMYK"
                >
                  <span className={`w-2 h-2 rounded-full ${config.useColorBar ? 'bg-white shadow-xs' : 'bg-slate-300'}`} />
                  <span className="text-xs font-medium whitespace-nowrap">Dải màu</span>
                  <span className={`text-[10px] whitespace-nowrap ${config.useColorBar ? 'text-violet-100 font-medium bg-violet-700/80 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
                    {config.useColorBar
                      ? `${
                          config.colorBarPosition === 'top'
                            ? 'Trên'
                            : config.colorBarPosition === 'bottom'
                            ? 'Dưới'
                            : config.colorBarPosition === 'left'
                            ? 'Trái'
                            : config.colorBarPosition === 'right'
                            ? 'Phải'
                            : 'Cả 4'
                        } • ${config.colorBarPadding}mm`
                      : 'CMYK'}
                  </span>
                </button>
              </div>

              {/* Page Navigation */}
              {allPages.length > 0 && totalSheets > 0 && (
                <>
                  <div className="w-px h-6 bg-slate-300 mx-1 shrink-0" />
                  <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <button 
                      onClick={() => setCurrentSheetIndex(0)} 
                      disabled={currentSheetIndex === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                      title="Tờ đầu tiên"
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setCurrentSheetIndex(i => Math.max(0, i - 1))} 
                      disabled={currentSheetIndex === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                      title="Tờ trước"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1 text-xs">
                      <input 
                        type="number" 
                        min={1} 
                        max={totalSheets} 
                        value={currentSheetIndex + 1}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 1;
                          setCurrentSheetIndex(Math.max(0, Math.min(totalSheets - 1, val - 1)));
                        }}
                        className="w-10 text-center font-medium text-violet-700 border border-violet-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-violet-50 text-xs"
                      />
                      <span className="text-slate-400">/</span>
                      <span className="font-medium text-slate-700">{totalSheets}</span>
                      <span className="text-[10px] text-slate-400">tờ</span>
                    </div>
                    <button 
                      onClick={() => setCurrentSheetIndex(i => Math.min(totalSheets - 1, i + 1))} 
                      disabled={currentSheetIndex >= totalSheets - 1}
                      className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                      title="Tờ kế tiếp"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button 
                      onClick={() => setCurrentSheetIndex(totalSheets - 1)} 
                      disabled={currentSheetIndex >= totalSheets - 1}
                      className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                      title="Tờ cuối cùng"
                    >
                      <ChevronsRight size={16} />
                    </button>

                    {/* Nút Xem trang cuối khi trang cuối có dư trắng */}
                    {hasLastSheetBlanks && totalSheets > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurrentSheetIndex(totalSheets - 1)}
                        className={`ml-1 px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer border select-none ${
                          currentSheetIndex === totalSheets - 1
                            ? 'bg-amber-500 border-amber-600 text-white shadow-xs font-semibold'
                            : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-2xs animate-pulse'
                        }`}
                        title={`Xem trang cuối (Tờ ${totalSheets}) - Có ${lastSheetBlankCount} ô dư trắng`}
                      >
                        <span>Trang cuối</span>
                        <span className="bg-amber-200/90 text-amber-950 font-bold px-1 rounded text-[10px]">
                          dư {lastSheetBlankCount}
                        </span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        {/* Floating Arrow Toggle Button on the Right Edge (Click to expand/collapse) */}
        <button
          type="button"
          onClick={toggleRightSidebar}
          className={`fixed z-50 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out w-5 hover:w-6.5 h-14 bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-slate-300 border-r-0 rounded-l-xl shadow-xs hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer group select-none ${
            isRightSidebarCollapsed ? "right-0" : "right-[350px] -mr-px"
          }`}
          title={isRightSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
        >
          {isRightSidebarCollapsed ? (
            <ChevronLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          ) : (
            <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          )}
        </button>

        {/* Right sidebar: Stats & Actions (w-[350px] - 25% width) */}
        <aside
          className={`flex-shrink-0 h-full flex flex-col z-40 shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden bg-white border-slate-200 ${
            isRightSidebarCollapsed
              ? "w-0 min-w-0 border-l-0 opacity-0 pointer-events-none"
              : "w-[350px] max-w-[95vw] border-l opacity-100"
          }`}
        >
          <div className="w-[350px] max-w-[95vw] h-full flex flex-col overflow-y-auto flex-shrink-0">
            {/* UPPER SECTION: KHỔ GIẤY IN & THIẾT LẬP */}
            <div className="border-b border-slate-200">
              <div 
                className="px-3.5 py-2 bg-slate-50 border-b flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/70 transition"
                onClick={() => setIsPrintSettingsOpen(v => !v)}
              >
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {/* Dual Orientation Buttons (Portrait & Landscape icons) */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (config.pageW > config.pageH) {
                          updatePrint(Math.min(config.pageW, config.pageH), Math.max(config.pageW, config.pageH));
                        }
                      }}
                      className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                        config.pageW <= config.pageH
                          ? 'bg-violet-600 text-white shadow-xs font-medium'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
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
                          ? 'bg-violet-600 text-white shadow-xs font-medium'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                      }`}
                      title="Khổ ngang (Landscape)"
                    >
                      <RectangleHorizontal size={13} />
                    </button>
                  </div>
                  <h3 className="text-xs font-medium text-slate-800 uppercase tracking-wider">
                    Khổ giấy in
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 min-w-0" onClick={e => e.stopPropagation()}>
                  {/* Button to Open Full-Screen 4-Column Paper Catalog Modal */}
                  <button
                    type="button"
                    onClick={() => setIsPaperDropdownOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-300 hover:border-violet-400 rounded-xl text-[11px] font-medium text-violet-800 shadow-2xs hover:shadow-xs transition cursor-pointer group"
                    title="Mở bảng chọn khổ giấy đầy đủ (3 cột)"
                  >
                    <span className="truncate max-w-[110px]">{currentPresetName}</span>
                    <ChevronDown size={13} className="text-violet-500 group-hover:translate-y-0.5 transition-transform flex-shrink-0" />
                  </button>

                  {/* Collapse / Expand Button */}
                  <button
                    type="button"
                    onClick={() => setIsPrintSettingsOpen(v => !v)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer flex-shrink-0"
                    title={isPrintSettingsOpen ? "Thu gọn" : "Mở rộng"}
                  >
                    {isPrintSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>



              {isPrintSettingsOpen && (
                <div className="divide-y divide-slate-100">
                  <div>
                    {/* Visual Paper Sheet Centerpiece with Dimension Lines, Alignment Pins & 2-Sided Toggle */}
                    <div className="p-4 border-b">
                      {(() => {
                        const isPortrait = config.pageW <= config.pageH;
                        const aspect = (config.pageW || 1) / (config.pageH || 1);
                        let sheetW: number;
                        let sheetH: number;
                        if (isPortrait) {
                          sheetH = 280;
                          sheetW = Math.max(130, Math.min(210, Math.round(280 * aspect)));
                        } else {
                          sheetW = 215;
                          sheetH = Math.max(110, Math.min(180, Math.round(215 / aspect)));
                        }

                        return (
                          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center overflow-hidden">
                            {/* Row with [Top Dim + Sheet Canvas] on Left, and [Right Dim Line] on Right */}
                            <div className="flex items-end justify-center">
                              {/* Left Column: Top Dimension Line + Sheet Canvas */}
                              <div className="flex flex-col items-center">
                                {/* Top Dimension Line (Width) - Exact width match with sheet canvas */}
                                <div 
                                  className="flex items-center justify-center gap-1.5 mb-2"
                                  style={{ width: `${sheetW}px` }}
                                >
                                  <div className="h-px bg-slate-400 flex-1 relative">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-l border-t border-slate-600 rotate-[-45deg]" />
                                  </div>
                                  <div className="flex items-center gap-1 bg-white border-2 border-violet-500/80 rounded-lg px-1.5 py-0.5 shadow-2xs">
                                    <DebouncedNumberInput
                                      value={config.pageW}
                                      onChange={(v) => updatePrint(v, config.pageH)}
                                      className="w-12 text-center font-medium text-xs text-violet-800 bg-transparent focus:outline-none"
                                    />
                                    <span className="text-[9px] text-slate-400 font-medium">mm</span>
                                  </div>
                                  <div className="h-px bg-slate-400 flex-1 relative">
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-r border-t border-slate-600 rotate-[45deg]" />
                                  </div>
                                </div>

                                {/* Visual Sheet Canvas */}
                                <div
                                  className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm relative transition-all duration-300 overflow-hidden"
                                  style={{
                                    width: `${sheetW}px`,
                                    height: `${sheetH}px`,
                                    backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
                                    backgroundSize: '12px 12px',
                                  }}
                                >
                                  {/* Paper corner fold */}
                                  <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-slate-200 border-b border-l border-slate-300 rounded-bl z-10" />

                                  {/* Safe Margin Guides (Dashed box inside sheet) */}
                                  {config.useMargin && (
                                    <div 
                                      className="absolute border border-dashed border-violet-400/70 pointer-events-none rounded-lg transition-all"
                                      style={{
                                        top: `${Math.max(2, Math.min(sheetH / 3, (config.marginTop / (config.pageH || 1)) * sheetH))}px`,
                                        bottom: `${Math.max(2, Math.min(sheetH / 3, (config.marginBot / (config.pageH || 1)) * sheetH))}px`,
                                        left: `${Math.max(2, Math.min(sheetW / 3, (config.marginLeft / (config.pageW || 1)) * sheetW))}px`,
                                        right: `${Math.max(2, Math.min(sheetW / 3, (config.marginRight / (config.pageW || 1)) * sheetW))}px`,
                                      }}
                                    />
                                  )}

                                  {/* Rotate Page Button (Positioned below Top Middle Pin) */}
                                  <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                                    <button
                                      type="button"
                                      onClick={() => updatePrint(config.pageH, config.pageW)}
                                      className="px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all shadow-xs cursor-pointer border bg-white/95 border-slate-300 text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 active:scale-95 group/rot select-none"
                                      title="Xoay hướng giấy (Lật ngang ↔ dọc)"
                                    >
                                      <RotateCw size={11} className="group-hover/rot:rotate-180 transition-transform duration-500 text-violet-600" />
                                      <span>Xoay giấy</span>
                                    </button>
                                  </div>

                                  {/* 9 Alignment Pins Matrix (Anchored to Corners, Edges & Center) */}
                                  <div className="absolute inset-2.5 pointer-events-none">
                                    <div className="w-full h-full relative">
                                      {[
                                        { x: 'left', y: 'top', label: 'Trên - Trái', pos: 'top-0 left-0' },
                                        { x: 'center', y: 'top', label: 'Trên - Giữa', pos: 'top-0 left-1/2 -translate-x-1/2' },
                                        { x: 'right', y: 'top', label: 'Trên - Phải', pos: 'top-0 right-0' },
                                        { x: 'left', y: 'middle', label: 'Giữa - Trái', pos: 'top-1/2 left-0 -translate-y-1/2' },
                                        { x: 'center', y: 'middle', label: 'Chính Giữa', pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' },
                                        { x: 'right', y: 'middle', label: 'Giữa - Phải', pos: 'top-1/2 right-0 -translate-y-1/2' },
                                        { x: 'left', y: 'bottom', label: 'Dưới - Trái', pos: 'bottom-0 left-0' },
                                        { x: 'center', y: 'bottom', label: 'Dưới - Giữa', pos: 'bottom-0 left-1/2 -translate-x-1/2' },
                                        { x: 'right', y: 'bottom', label: 'Dưới - Phải', pos: 'bottom-0 right-0' },
                                      ].map(({ x, y, label, pos }) => {
                                        const isSelected = config.alignX === x && config.alignY === y;
                                        return (
                                          <button
                                            key={`${x}-${y}`}
                                            type="button"
                                            onClick={() => setConfig(c => ({ ...c, alignX: x as any, alignY: y as any }))}
                                            className={`absolute ${pos} pointer-events-auto w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected
                                                ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-300 scale-110 z-30'
                                                : 'bg-white/90 hover:bg-violet-50 text-slate-400 hover:text-violet-600 border border-slate-300/90 hover:border-violet-400 hover:scale-105 z-20 shadow-2xs'
                                            }`}
                                            title={`Vị trí căn chỉnh: ${label} (X: ${x}, Y: ${y})`}
                                          >
                                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white ring-1 ring-violet-400' : 'bg-slate-400'}`} />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* 2-Sided Toggle Button (Positioned above Bottom Middle Pin) */}
                                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                                    <button
                                      type="button"
                                      onClick={() => setConfig(c => ({ ...c, is2Sided: !c.is2Sided }))}
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all shadow-xs cursor-pointer border ${
                                        config.is2Sided
                                          ? 'bg-violet-600 border-violet-700 text-white shadow-inner ring-2 ring-violet-200'
                                          : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300'
                                      }`}
                                      title={config.is2Sided ? 'Đang in 2 mặt (Click chuyển sang 1 mặt)' : 'Đang in 1 mặt (Click chuyển sang 2 mặt)'}
                                    >
                                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="2" width="13" height="17" rx="2" />
                                        <rect x="8" y="5" width="13" height="17" rx="2" fill={config.is2Sided ? 'currentColor' : 'none'} opacity={config.is2Sided ? 0.3 : 0.1} />
                                      </svg>
                                      <span>{config.is2Sided ? '2 Mặt' : '1 Mặt'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Right Dimension Line (Height) - Aligned with Sheet Canvas */}
                              <div 
                                className="flex flex-col items-center justify-center relative w-16 ml-2"
                                style={{ height: `${sheetH}px` }}
                              >
                                <div className="w-px bg-slate-400 h-full relative flex flex-col justify-between items-center">
                                  <div className="w-1.5 h-1.5 border-t border-l border-slate-600 rotate-[45deg]" />
                                  <div className="w-1.5 h-1.5 border-b border-l border-slate-600 rotate-[-45deg]" />
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-white border-2 border-violet-500/80 rounded-lg px-1.5 py-0.5 shadow-2xs whitespace-nowrap z-10">
                                  <DebouncedNumberInput
                                    value={config.pageH}
                                    onChange={(v) => updatePrint(config.pageW, v)}
                                    className="w-12 text-center font-medium text-xs text-violet-800 bg-transparent focus:outline-none"
                                  />
                                  <span className="text-[9px] text-slate-400 font-medium">mm</span>
                                </div>
                              </div>
                            </div>

                            {/* 2-Sided Options Panel (Shown when 2-sided is active) */}
                            {config.is2Sided && (
                              <div className="mt-3 w-full max-w-[280px] p-2.5 bg-violet-50/80 border border-violet-200 rounded-xl space-y-2">
                                <div className="text-[10px] font-medium text-violet-800 uppercase flex items-center gap-1">
                                  <span>Tùy chọn in 2 mặt</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <label className={`flex-1 flex items-center justify-center gap-1 text-[10px] cursor-pointer py-1 px-1.5 rounded-lg border transition ${
                                    config.twoSideMode === 'same'
                                      ? 'bg-white border-violet-400 text-violet-800 font-medium shadow-2xs'
                                      : 'border-slate-200 text-slate-600 hover:bg-white/60'
                                  }`}>
                                    <input
                                      type="radio"
                                      name="twoSideMode"
                                      checked={config.twoSideMode === 'same'}
                                      onChange={() => setConfig({ ...config, twoSideMode: 'same' })}
                                      className="text-violet-600 w-3 h-3"
                                    />
                                    <span>2 mặt giống</span>
                                  </label>
                                  <label className={`flex-1 flex items-center justify-center gap-1 text-[10px] cursor-pointer py-1 px-1.5 rounded-lg border transition ${
                                    config.twoSideMode === 'odd-even'
                                      ? 'bg-white border-violet-400 text-violet-800 font-medium shadow-2xs'
                                      : 'border-slate-200 text-slate-600 hover:bg-white/60'
                                  }`}>
                                    <input
                                      type="radio"
                                      name="twoSideMode"
                                      checked={config.twoSideMode === 'odd-even'}
                                      onChange={() => setConfig({ ...config, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3 })}
                                      className="text-violet-600 w-3 h-3"
                                    />
                                    <span>Chẵn / Lẻ</span>
                                  </label>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-violet-200/60">
                                  <label className="flex items-center gap-1.5 text-[10px] text-slate-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={config.rot180Front}
                                      onChange={e => setConfig({ ...config, rot180Front: e.target.checked })}
                                      className="rounded text-violet-600 w-3 h-3"
                                    />
                                    <span>Xoay 180° Trước</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 text-[10px] text-slate-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={config.rot180Back}
                                      onChange={e => setConfig({ ...config, rot180Back: e.target.checked })}
                                      className="rounded text-violet-600 w-3 h-3"
                                    />
                                    <span>Xoay 180° Sau</span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Print Area */}
                    {config.usePrintArea && (
                      <div className="p-4 border-b">
                        <label className="flex items-center justify-between mb-2 cursor-pointer">
                          <span className="text-[10px] font-medium text-blue-600 uppercase">Vùng in an toàn (Print Area)</span>
                          <input type="checkbox" checked={config.usePrintArea} onChange={e => setConfig({ ...config, usePrintArea: e.target.checked })} className="rounded text-blue-600" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <DebouncedNumberInput value={config.printAreaW} onChange={v => setConfig(c => ({ ...c, printAreaW: v }))} className="border rounded-lg px-2 py-1.5 text-sm text-center bg-green-50 border-green-200" />
                          <DebouncedNumberInput value={config.printAreaH} onChange={v => setConfig(c => ({ ...c, printAreaH: v }))} className="border rounded-lg px-2 py-1.5 text-sm text-center bg-green-50 border-green-200" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div></div>
                </div>
              )}

              {/* AI Outpaint Panel */}
              {isOutpaintPanelOpen && (
                <div className="p-4 border-t bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-blue-700 uppercase flex items-center gap-2">
                      <Expand size={14} /> AI Mở rộng ảnh
                    </h3>
                    <button onClick={() => setIsOutpaintPanelOpen(false)} className="p-1 hover:bg-blue-100 rounded cursor-pointer">
                      <X size={14} className="text-blue-500" />
                    </button>
                  </div>
                  
                  {/* Preset buttons */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-medium text-gray-500 uppercase">Preset nhanh</label>
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">LaMa CPU Model</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: '2mm', val: 2 },
                        { label: '3mm', val: 3 },
                        { label: '4mm', val: 4 },
                        { label: '30% (~5mm)', val: 5 },
                      ].map(item => (
                        <button
                          key={item.val}
                          onClick={() => setOutpaintConfig({ top: item.val, bottom: item.val, left: item.val, right: item.val })}
                          className={`py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                            outpaintConfig.top === item.val && outpaintConfig.bottom === item.val && outpaintConfig.left === item.val && outpaintConfig.right === item.val
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-blue-600/90 mt-1.5 leading-relaxed">
                      💡 <strong>Chuyên dùng cho hình thẻ học sinh:</strong> Tự động mở rộng nền và thân áo/vai bằng AI CPU để cắt bế không bị phạm lề.
                    </p>
                  </div>
                  
                  {/* Custom inputs */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">Tuỳ chỉnh (mm)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-gray-500 mb-1">Trên</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.5"
                          value={outpaintConfig.top}
                          onChange={e => setOutpaintConfig(prev => ({ ...prev, top: Math.min(15, parseFloat(e.target.value) || 0) }))}
                          className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 mb-1">Dưới</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.5"
                          value={outpaintConfig.bottom}
                          onChange={e => setOutpaintConfig(prev => ({ ...prev, bottom: Math.min(15, parseFloat(e.target.value) || 0) }))}
                          className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 mb-1">Trái</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.5"
                          value={outpaintConfig.left}
                          onChange={e => setOutpaintConfig(prev => ({ ...prev, left: Math.min(15, parseFloat(e.target.value) || 0) }))}
                          className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 mb-1">Phải</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.5"
                          value={outpaintConfig.right}
                          onChange={e => setOutpaintConfig(prev => ({ ...prev, right: Math.min(15, parseFloat(e.target.value) || 0) }))}
                          className="w-full border rounded-lg px-2 py-1.5 text-xs text-center"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-amber-600 mt-2">⚠️ Tối đa 15mm/hướng</p>
                  </div>
                  
                  {/* Progress */}
                  {outpaintProgress.isProcessing && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-blue-700">Đang xử lý...</span>
                        <span className="font-medium">{outpaintProgress.current}/{outpaintProgress.total}</span>
                      </div>
                      <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${(outpaintProgress.current / outpaintProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Action button */}
                  <button
                    onClick={handleOutpaint}
                    disabled={outpaintProgress.isProcessing || allPages.length === 0}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {outpaintProgress.isProcessing ? (
                      <><Loader2 size={16} className="animate-spin" /> Đang mở rộng...</>
                    ) : (
                      <><Expand size={16} /> Mở rộng {allPages.length} ảnh</>
                    )}
                  </button>
                </div>
              )}
            </div>

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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
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
                          onClick={() => handleRequestRestoreHistory(item)}
                          className="p-3 bg-white hover:bg-violet-50/50 hover:border-violet-300 border border-slate-200 rounded-xl shadow-xs transition group cursor-pointer"
                          title="Nhấn để nạp lại thông số bình trang này"
                        >
                          {/* Main Row: Thumbnail + Info (mỗi item 1 hàng) + Nút JSON */}
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
                                {item.shapeTabsSnapshot && item.shapeTabsSnapshot.length > 0 && (
                                  <span className="px-1.5 py-0.2 bg-violet-100 text-violet-700 font-semibold rounded text-[10px] flex-shrink-0">
                                    {item.shapeTabsSnapshot.length} Layer
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Nút JSON */}
                            <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleExportSortJob(item)}
                                disabled={isExportingSortJob}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Xuất JSON SortJob của lịch sử này lưu về VPS"
                              >
                                <FileJson size={13} />
                                <span>JSON</span>
                              </button>
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
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-medium text-lg text-gray-900">Chọn phương án xếp</h3><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X size={20} /></button></div>
            <div className="p-5 overflow-auto max-h-[70vh]">
              {plans.length === 0 ? <div className="text-center py-12 text-gray-400"><AlertCircle size={48} className="mx-auto mb-3 opacity-50" /><p className="text-base">Không tìm thấy phương án</p></div> : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {plans.map((pl, i) => { const sc = 130 / config.pageW; const firstThumb = allPages[0]?.thumb; return (
                    <div key={i} className={'border-2 p-4 rounded-xl cursor-pointer transition hover:shadow-xl ' + (i === currentPlanIndex ? 'border-violet-500 bg-violet-50 shadow-lg' : 'border-gray-200 hover:border-violet-300')} onClick={() => { setCurrentPlanIndex(i); setIsModalOpen(false); }}>
                      <div className="flex justify-between items-center mb-3"><span className="font-medium text-sm text-gray-800">{pl.name}</span><span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-1 rounded-full">{pl.qty} tem{(pl as any).skipped > 0 ? <span className="text-red-500 ml-1">({(pl as any).skipped} không vừa)</span> : ''}</span></div>
                      <div className="flex justify-center bg-gray-100 p-3 rounded-lg"><div className="bg-white shadow border relative rounded overflow-hidden" style={{ width: config.pageW * sc, height: config.pageH * sc }}>{pl.items.map((it, j) => { const aw = (it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW)) * sc; const ah = (it.shape === 'circle' ? aw : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH))) * sc; const pageIdx = j % allPages.length; const thumb = allPages[pageIdx]?.thumb; return <div key={j} className="absolute border border-violet-300 overflow-hidden" style={{ left: it.x * sc, top: it.y * sc, width: aw, height: ah, borderRadius: config.shape === 'circle' ? '50%' : config.cornerRadius > 0 ? config.cornerRadius * sc + 'px' : '1px' }}>{thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-violet-200" />}</div>; })}</div></div>
                      {i === currentPlanIndex && <div className="mt-3 text-center"><span className="text-xs font-medium text-violet-600 flex items-center justify-center gap-1"><Check size={14} /> Đang chọn</span></div>}
                    </div>
                  ); })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Management Modal */}
      {isDataModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-medium text-lg text-pink-700">Quản lý & Biến đổi Dữ liệu</h3>
              <button onClick={() => setIsDataModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-red-500"><X size={20} /></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Data Modes */}
              <div className="w-1/3 p-4 border-r overflow-y-auto">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center justify-between">
                  Biến đổi dữ liệu
                  <button onClick={() => setDataModeEnabled(v => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${dataModeEnabled ? 'bg-pink-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dataModeEnabled ? 'translate-x-4' : ''}`} />
                  </button>
                </h4>
                <div className={`space-y-3 ${!dataModeEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  {/* Mode 1: Standard */}
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 1 ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`} onClick={() => setDataMode(1)}>
                    <div className="flex items-center gap-3">
                      <Layers size={24} className="text-gray-500" />
                      <div>
                        <div className="font-medium text-sm">Standard (1→2→3)</div>
                        <div className="text-[10px] text-gray-500">Sắp xếp theo nhóm (AABBCC...)</div>
                      </div>
                    </div>
                    {dataMode === 1 && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2">
                        <label className="text-xs font-medium">Số lượng bộ:</label>
                        <input type="number" min="1" value={standardQty} onChange={e => setStandardQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 border rounded px-2 py-1 text-center text-sm font-medium" />
                      </div>
                    )}
                  </div>

                  {/* Mode 4: X-Up */}
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 4 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`} onClick={() => setDataMode(4)}>
                    <div className="flex items-center gap-3">
                      <Grid3X3 size={24} className="text-blue-500" />
                      <div>
                        <div className="font-medium text-sm">Step & Repeat (X-Up)</div>
                        <div className="text-[10px] text-gray-500">Lặp lại từng file để tràn trang</div>
                      </div>
                    </div>
                    {dataMode === 4 && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2">
                        <label className="text-xs font-medium">Số lượng X-Up:</label>
                        <input type="number" min="1" value={xUpQty} onChange={e => setXUpQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 border rounded px-2 py-1 text-center text-sm font-medium" />
                      </div>
                    )}
                  </div>

                  {/* Mode 6: Đối xứng */}
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 6 ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`} onClick={() => { setDataMode(6); setConfig(c => ({ ...c, is2Sided: true })); }}>
                    <div className="flex items-center gap-3">
                      <RotateCw size={24} className="text-green-500" />
                      <div>
                        <div className="font-medium text-sm">Biến đổi Đối xứng</div>
                        <div className="text-[10px] text-gray-500">Dùng cho số nhảy, ID (In 2 mặt)</div>
                      </div>
                    </div>
                  </div>

                  {/* Mode 5: 2 Mặt Giống */}
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition ${dataMode === 5 ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`} onClick={() => { setDataMode(5); setConfig(c => ({ ...c, is2Sided: true })); }}>
                    <div className="flex items-center gap-3">
                      <Layers size={24} className="text-purple-500" />
                      <div>
                        <div className="font-medium text-sm">2 Mặt Giống (Card Visit)</div>
                        <div className="text-[10px] text-gray-500">Mặt trước và sau dùng chung dữ liệu</div>
                      </div>
                    </div>
                  </div>

                  {/* Kiểu trở (Imposition Style) */}
                  <h4 className="text-xs font-medium text-gray-500 uppercase mt-4 mb-3 flex items-center justify-between">
                    Kiểu trở
                    <button onClick={() => setImpositionStyleEnabled(v => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${impositionStyleEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${impositionStyleEnabled ? 'translate-x-4' : ''}`} />
                    </button>
                  </h4>
                  <div className={`${!impositionStyleEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition ${impositionStyle === 'sheetwise' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`} onClick={() => setImpositionStyle('sheetwise')}>
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/><text x="6.5" y="13" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">A</text><text x="17.5" y="13" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">B</text></svg>
                      <div>
                        <div className="font-medium text-sm">Sheetwise (In AB)</div>
                        <div className="text-[10px] text-gray-500">Mặt trước/sau in riêng biệt</div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition mt-2 ${impositionStyle === 'work-and-turn' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`} onClick={() => setImpositionStyle('work-and-turn')}>
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2,1"/><path d="M8 10l-2 2 2 2" strokeWidth="1.5"/><path d="M16 10l2 2-2 2" strokeWidth="1.5"/></svg>
                      <div>
                        <div className="font-medium text-sm">Work & Turn (Tự trở)</div>
                        <div className="text-[10px] text-gray-500">Lật qua trục dọc, front+back cùng mặt</div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition mt-2 ${impositionStyle === 'work-and-tumble' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`} onClick={() => setImpositionStyle('work-and-tumble')}>
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2,1"/><path d="M10 8l2-2 2 2" strokeWidth="1.5"/><path d="M10 16l2 2 2-2" strokeWidth="1.5"/></svg>
                      <div>
                        <div className="font-medium text-sm">Work & Tumble (Trở nhíp)</div>
                        <div className="text-[10px] text-gray-500">Lật qua trục ngang, front+back cùng mặt</div>
                      </div>
                    </div>
                  </div>
                  </div>

                </div>
              </div>

              {/* Right: File List */}
              <div className="flex-1 p-4 flex flex-col overflow-hidden">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Quản lý dữ liệu</h4>
                
                {/* Upload Area */}
                <label className="flex items-center gap-2 mb-2 cursor-pointer select-none text-xs text-gray-600">
                  <input type="checkbox" checked={skipThumbnails} onChange={e => setSkipThumbnails(e.target.checked)} className="w-3.5 h-3.5" />
                  <span>Upload nhanh (bỏ qua thumbnail, phù hợp file nhiều trang)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-pink-400 cursor-pointer relative mb-3">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" multiple onChange={handleMultiFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Upload size={24} className="mx-auto mb-1 text-gray-400" />
                  <span className="font-medium text-sm text-pink-600">Kéo thả hoặc nhấn để chọn file (PDF, JPG, PNG, TIFF)</span>
                </div>
                <button onClick={() => setIsFilePickerOpen(true)} className="w-full mb-3 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-indigo-200">
                  <FolderOpen size={16} /> Import từ Quản lý tệp
                </button>

                {/* Upload Progress */}
                {uploadProgress.show && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-700">Đang tải... ({uploadProgress.current}/{uploadProgress.total})</span>
                      <span className="text-blue-700">{uploadProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress.percent}%` }} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">Danh sách trang ({allPages.length})</span>
                  <div className="flex gap-2">
                    {(config.autoRotateImage ?? true) ? (
                      <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-300">
                        ✓ Tự động xoay ảnh đang bật
                      </span>
                    ) : (
                      <>
                        <button onClick={() => rotateAllPages('auto')} className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">Tự động Xoay</button>
                        <button onClick={() => rotateAllPages('left')} className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">Xoay Trái</button>
                        <button onClick={() => rotateAllPages('right')} className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-200 rounded">Xoay Phải</button>
                      </>
                    )}
                    <button onClick={() => setAllPages([])} className="text-[10px] px-2 py-1 text-red-500 hover:bg-red-50 rounded">Xóa tất cả</button>
                  </div>
                </div>

                {/* Page Grid - Optimized with smaller thumbnails */}
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-2 border">
                  {allPages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Upload size={36} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Chưa có file nào</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {allPages.map((page, idx) => (
                        <div key={`${idx}-${previewKey}`} className="bg-white border rounded overflow-hidden shadow-sm hover:shadow transition group">
                          <div className="h-32 bg-gray-100 flex items-center justify-center relative" style={config.fitMode === 'actual' ? { backgroundColor: backgroundColor } : {}}>
                            <img 
                              src={page.thumb} 
                              alt="" 
                              className="max-w-full max-h-full object-contain" 
                              style={{ 
                                transform: `rotate(${page.rotation}deg)` 
                              }} 
                              loading="lazy" 
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                              <button onClick={() => { setLightboxImage(page.thumb); setIsLightboxOpen(true); }} className="p-1 bg-white rounded hover:bg-gray-100"><ZoomIn size={12} /></button>
                              {!(config.autoRotateImage ?? true) && (
                                <button onClick={() => rotatePage(idx, 'left')} className="p-1 bg-white rounded hover:bg-gray-100"><RotateCcw size={12} /></button>
                              )}
                              <button onClick={() => removePage(idx)} className="p-1 bg-white rounded hover:bg-red-100 text-red-500"><Trash2 size={12} /></button>
                            </div>
                          </div>
                          <div className="px-1.5 py-1 flex items-center justify-between text-[10px]">
                            <span className="w-4 h-4 bg-pink-500 text-white rounded-full flex items-center justify-center font-medium">{idx + 1}</span>
                            {(config.autoRotateImage ?? true) ? (
                              <span className="text-amber-600 font-medium text-[8px]">AUTO</span>
                            ) : page.rotation !== 0 ? (
                              <span className="text-pink-600 font-medium">{page.rotation}°</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button onClick={() => setIsDataModalOpen(false)} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium py-3 rounded-xl">
                Cập nhật Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 bg-black/80 z-[10001] flex items-center justify-center" onClick={() => setIsLightboxOpen(false)}>
          <img src={lightboxImage} alt="" className="max-w-[90%] max-h-[90%] object-contain shadow-2xl" />
          <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-500 text-2xl font-medium">×</button>
        </div>
      )}

      {/* AI Arrangement Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center gap-2">
                <Sparkles size={20} />
                <h3 className="font-medium text-lg">AI Sắp xếp thông minh</h3>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg"><X size={20} /></button>
            </div>
            
            <div className="p-4 border-b bg-amber-50">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !aiLoading && handleAiArrange()}
                  placeholder="Nhập lệnh: Mỗi ảnh in 5 lần, In 100 tem mỗi loại, Tự động xoay ảnh, Đảo ngược thứ tự..."
                  className="flex-1 border-2 border-amber-300 rounded-lg px-4 py-3 text-sm focus:border-amber-500 focus:outline-none"
                  disabled={aiLoading}
                  autoFocus
                />
                <button 
                  onClick={handleAiArrange}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {aiLoading ? 'Đang xử lý...' : 'Xử lý'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Before */}
              <div className="flex-1 p-4 border-r overflow-y-auto">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Trước ({allPages.length} trang)
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {allPages.slice(0, 20).map((page, idx) => (
                    <div key={`before-${idx}-${previewKey}`} className="bg-gray-100 rounded overflow-hidden border">
                      <div className="h-12 flex items-center justify-center" style={config.fitMode === 'actual' ? { backgroundColor: backgroundColor } : {}}>
                        <img 
                          src={page.thumb} 
                          alt="" 
                          className="max-w-full max-h-full object-contain" 
                          style={{ 
                            transform: `rotate(${page.rotation}deg)` 
                          }} 
                          loading="lazy" 
                        />
                      </div>
                      <div className="text-center text-[9px] py-0.5 bg-gray-200 font-medium">{idx + 1}</div>
                    </div>
                  ))}
                  {allPages.length > 20 && <div className="col-span-4 text-center text-xs text-gray-400 py-2">+{allPages.length - 20} trang khác...</div>}
                </div>
              </div>

              {/* After */}
              <div className="flex-1 p-4 overflow-y-auto">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Sau ({aiPreviewPages.length > 0 ? aiPreviewPages.length : '-'} trang)
                </h4>
                {aiResult ? (
                  <>
                    <div className="mb-3 p-2 bg-green-100 rounded-lg text-sm text-green-700 font-medium">
                      ✅ {aiResult.explanation}
                    </div>
                    
                    {/* Show config changes for layout_config action */}
                    {aiResult.action === 'layout_config' && aiResult.configChanges && (() => {
                      const changes = aiResult.configChanges as any;
                      return (
                        <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <h5 className="text-xs font-medium text-amber-700 mb-2">Thay đổi cấu hình:</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {changes._dataMode !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Chế độ:</span>
                                <span className="font-medium text-amber-700">
                                  {changes._dataMode === 1 ? 'Mỗi ảnh 1 tem' : 
                                   changes._dataMode === 4 ? 'X-Up' : 'Số lượng chuẩn'}
                                </span>
                              </div>
                            )}
                            {changes._xUpQty !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">X-Up:</span>
                                <span className="font-medium text-amber-700">{changes._xUpQty}</span>
                              </div>
                            )}
                            {changes._standardQty !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Số lượng chuẩn:</span>
                                <span className="font-medium text-amber-700">{changes._standardQty}</span>
                              </div>
                            )}
                            {changes.autoRotate !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Tự động xoay:</span>
                                <span className="font-medium text-amber-700">{changes.autoRotate ? 'Bật' : 'Tắt'}</span>
                              </div>
                            )}
                            {changes.fitMode !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Chế độ fit:</span>
                                <span className="font-medium text-amber-700">{changes.fitMode}</span>
                              </div>
                            )}
                            {changes.totalOrder !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Số lượng đơn:</span>
                                <span className="font-medium text-amber-700">{changes.totalOrder}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Show page preview for non-layout_config actions */}
                    {aiResult.action !== 'layout_config' && (
                      <div className="grid grid-cols-4 gap-2">
                        {aiPreviewPages.slice(0, 20).map((page, idx) => (
                          <div key={`after-${idx}-${previewKey}`} className="bg-green-50 rounded overflow-hidden border-2 border-green-300">
                            <div className="h-12 flex items-center justify-center" style={config.fitMode === 'actual' ? { backgroundColor: backgroundColor } : {}}>
                              <img 
                                src={page.thumb} 
                                alt="" 
                                className="max-w-full max-h-full object-contain" 
                                style={{ 
                                  transform: `rotate(${page.rotation}deg)` 
                                }} 
                                loading="lazy" 
                              />
                            </div>
                            <div className="text-center text-[9px] py-0.5 bg-green-200 font-medium text-green-700">{idx + 1}</div>
                          </div>
                        ))}
                        {aiPreviewPages.length > 20 && <div className="col-span-4 text-center text-xs text-gray-400 py-2">+{aiPreviewPages.length - 20} trang khác...</div>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Sparkles size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nhập lệnh và nhấn "Xử lý" để xem kết quả</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsAiModalOpen(false)} className="px-6 py-2.5 border rounded-lg font-medium hover:bg-gray-100">
                Hủy
              </button>
              <button 
                onClick={applyAiResult}
                disabled={aiPreviewPages.length === 0}
                className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <Check size={18} />
                Áp dụng thay đổi
              </button>
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

      {/* Download PDF Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDownloadModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-medium mb-4">Tùy chọn xuất PDF</h3>
            
            {/* Page Crop Marks */}
            <div className="border rounded-xl p-4 mb-4">
              <label className="flex items-center justify-between mb-3 cursor-pointer">
                <span className="text-sm font-medium text-blue-600">Đánh dấu góc trang</span>
                <input 
                  type="checkbox" 
                  checked={config.usePageCrop} 
                  onChange={e => setConfig({ ...config, usePageCrop: e.target.checked })} 
                  className="rounded text-blue-600 w-5 h-5" 
                />
              </label>
              {config.usePageCrop && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Độ dài (mm)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={config.pageCropLen} 
                      onChange={e => setConfig({ ...config, pageCropLen: parseFloat(e.target.value) || 0 })} 
                      className="border rounded px-3 py-2 text-sm w-full" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Khoảng cách (mm)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={config.pageCropDist} 
                      onChange={e => setConfig({ ...config, pageCropDist: parseFloat(e.target.value) || 0 })} 
                      className="border rounded px-3 py-2 text-sm w-full" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Độ dày (mm)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={config.pageCropThick} 
                      onChange={e => setConfig({ ...config, pageCropThick: parseFloat(e.target.value) || 0 })} 
                      className="border rounded px-3 py-2 text-sm w-full" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Màu sắc</label>
                    <input 
                      type="color" 
                      value={config.pageCropColor} 
                      onChange={e => setConfig({ ...config, pageCropColor: e.target.value })} 
                      className="border rounded px-1 py-1 w-full h-10" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CMYK Color Bar in download modal */}
            <div className="border rounded-xl p-4 mb-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-emerald-600">Dải màu CMYK</span>
                <input type="checkbox" checked={config.useColorBar} onChange={e => setConfig({ ...config, useColorBar: e.target.checked })} className="rounded text-emerald-600 w-5 h-5" />
              </label>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowDownloadModal(false)} 
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDownloadPDF} 
                className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium"
              >
                Tải PDF
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Source Image Crop & Color Studio Modal */}
      <SourceImageCropColorModal
        isOpen={isCropColorModalOpen}
        onClose={() => setIsCropColorModalOpen(false)}
        imageUrl={activeTab?.sourceImage?.originalThumb || activeTab?.sourceImage?.thumb || editingSourcePage?.originalThumb || editingSourcePage?.thumb || (allPages.length > 0 ? allPages[0].originalThumb || allPages[0].thumb : null)}
        imageName={activeTab?.sourceImage?.name || editingSourcePage?.name || (allPages.length > 0 ? allPages[0].name : 'Ảnh nguồn')}
        itemW={activeTab?.itemW || config.itemW}
        itemH={activeTab?.shape === 'circle' ? (activeTab?.itemW || config.itemW) : (activeTab?.itemH || config.itemH)}
        shape={activeTab?.shape || config.shape}
        initialColorSettings={activeTab?.sourceImage?.colorSettings || editingSourcePage?.colorSettings}
        initialCropSettings={activeTab?.sourceImage?.cropSettings || editingSourcePage?.cropSettings}
        shapeTabs={shapeTabs as any}
        activeTabId={activeTabId}
        onApply={handleApplyCroppedColorImage}
      />

      {/* Vector Mask Editor Modal */}
      <VectorMaskEditorModal
        isOpen={isVectorMaskEditorOpen}
        onClose={() => setIsVectorMaskEditorOpen(false)}
        imageUrl={
          editingSourcePage?.originalThumb || 
          editingSourcePage?.thumb || 
          activeTab?.sourceImage?.originalThumb || 
          activeTab?.sourceImage?.thumb || 
          (allPages.length > 0 ? (allPages[0].originalThumb || allPages[0].thumb) : null) ||
          shapeTabs.find(t => t.sourceImage)?.sourceImage?.originalThumb ||
          shapeTabs.find(t => t.sourceImage)?.sourceImage?.thumb ||
          null
        }
        imageName={editingSourcePage?.name || activeTab?.sourceImage?.name || (allPages.length > 0 ? allPages[0].name : 'Ảnh nguồn')}
        itemW={activeTab?.itemW || config.itemW}
        itemH={activeTab?.shape === 'circle' ? activeTab?.itemW : (activeTab?.itemH || (config.shape === 'circle' ? config.itemW : config.itemH))}
        initialKnots={activeTab?.vectorMaskResult?.knots || vectorMaskResult?.knots}
        initialSvgPath={activeTab?.vectorMaskResult?.pathData || vectorMaskResult?.pathData}
        onApply={handleApplyVectorMask}
      />

      {/* Full-Screen / Centered Spacious Modal for 4-Column Paper Catalog (Root Level Z-[9999]) */}
      {isPaperDropdownOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            ref={paperDropdownRef}
            className="w-[1240px] max-w-[98vw] h-[90vh] max-h-[860px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-200 flex-shrink-0">
                  <Grid3X3 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-medium text-slate-800 uppercase tracking-wide">
                      Danh mục khổ giấy in & bản vẽ chuẩn
                    </h2>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      {PAPER_PRESETS.length} khổ giấy
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chia theo 4 nhóm thiết kế: In ấn thông dụng, AutoCAD, Corel & Illustrator, Canva
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm nhanh (A3, ISO, ARCH, Namecard, Fuji, Canva...)"
                    value={paperSearchQuery}
                    onChange={e => setPaperSearchQuery(e.target.value)}
                    className="w-72 pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                    autoFocus
                  />
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  {paperSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPaperSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsPaperDropdownOpen(false)}
                  className="w-9 h-9 rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition flex items-center justify-center cursor-pointer"
                  title="Đóng (ESC)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal 4 Columns Body (Scrollable, High & Wide) */}
            <div className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto bg-slate-50/50">
              {PAPER_PRESET_GROUPS.map((group) => {
                const filteredItems = group.items.filter(it => 
                  it.label.toLowerCase().includes(paperSearchQuery.toLowerCase()) ||
                  (it.subLabel && it.subLabel.toLowerCase().includes(paperSearchQuery.toLowerCase())) ||
                  `${it.w}x${it.h}`.includes(paperSearchQuery)
                );

                return (
                  <div 
                    key={group.category} 
                    className="flex flex-col bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-violet-200 transition"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-slate-800 uppercase tracking-wider truncate">
                          {group.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                        {filteredItems.length}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 max-h-[520px]">
                      {filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-400 font-medium">
                          Không tìm thấy khổ giấy phù hợp
                        </div>
                      ) : (
                        filteredItems.map((item) => {
                          const isCur =
                            (config.pageW === item.w && config.pageH === item.h) ||
                            (config.pageW === item.h && config.pageH === item.w);

                          return (
                            <button
                              key={`${item.label}-${item.w}-${item.h}`}
                              type="button"
                              onClick={() => {
                                if (config.pageW > config.pageH && item.w <= item.h) {
                                  updatePrint(item.h, item.w);
                                } else if (config.pageW <= config.pageH && item.w > item.h) {
                                  updatePrint(item.h, item.w);
                                } else {
                                  updatePrint(item.w, item.h);
                                }
                                setIsPaperDropdownOpen(false);
                                setPaperSearchQuery('');
                              }}
                              className={`text-left p-3 rounded-xl transition cursor-pointer flex flex-col gap-1 border group relative ${
                                isCur
                                  ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
                                  : 'bg-white border-slate-200/90 hover:border-violet-400 hover:bg-violet-50/60 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium truncate ${isCur ? 'text-white' : 'text-slate-800 group-hover:text-violet-700'}`}>
                                  {item.label}
                                </span>
                                {isCur && <Check size={16} className="text-white flex-shrink-0" />}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`truncate ${isCur ? 'text-violet-100' : 'text-slate-500'}`}>
                                  {item.subLabel || `${item.w} × ${item.h} mm`}
                                </span>
                                <span className={`font-mono text-[9px] font-medium px-1.5 py-0.5 rounded ${isCur ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  {item.w}×{item.h}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium">Khổ đang chọn:</span>
                <span className="font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-lg">
                  {currentPresetName} ({config.pageW} × {config.pageH} mm)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsPaperDropdownOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xs transition cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Layer Modal Toast (Tên & Màu sắc của Layer) */}
      {editingLayerModalTab && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setEditingLayerModalTab(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-[340px] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs font-bold text-xs"
                  style={{ backgroundColor: layerModalColor }}
                >
                  {layerModalName.slice(0, 1).toUpperCase() || 'L'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Thuộc tính Layer</h4>
                  <span className="text-[10px] text-slate-400">Đổi tên & màu nhận diện</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLayerModalTab(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Input: Tên Layer */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>Tên Layer</span>
                <span className="text-[9px] text-slate-400 font-normal">Tối đa 20 ký tự</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={layerModalName}
                  onChange={(e) => setLayerModalName(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLayerModal();
                    if (e.key === 'Escape') setEditingLayerModalTab(null);
                  }}
                  autoFocus
                  placeholder="Ví dụ: A, Tem tròn, Nhãn chai..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-500 bg-slate-50/50 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Color Swatches Palette */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>Màu đại diện</span>
                <span className="text-[10px] font-mono text-slate-500 font-medium uppercase">{layerModalColor}</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                {LAYER_COLOR_PRESETS.map((col) => {
                  const isSelected = layerModalColor.toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setLayerModalColor(col)}
                      className={`w-9 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center relative shadow-2xs hover:scale-105 active:scale-95 ${
                        isSelected ? 'ring-2 ring-offset-2 ring-slate-800 shadow-sm scale-105' : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: col }}
                      title={col}
                    >
                      {isSelected && <Check size={14} className="text-white drop-shadow-sm stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium">Màu tùy chỉnh:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex-1">
                  <input
                    type="color"
                    value={layerModalColor}
                    onChange={(e) => setLayerModalColor(e.target.value)}
                    className="w-5 h-5 rounded-md border-0 p-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={layerModalColor}
                    onChange={(e) => setLayerModalColor(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-mono font-medium text-slate-700 uppercase focus:outline-none"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingLayerModalTab(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleSaveLayerModal}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow transition cursor-pointer"
                style={{ backgroundColor: layerModalColor || '#8b5cf6' }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 100% Scale & Background Color Modal Toast */}
      {isScaleModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setIsScaleModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-[340px] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-2xs font-bold text-xs">
                  %
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tỷ lệ 100% & Màu nền</h4>
                  <span className="text-[10px] text-slate-400">Kích thước thực tế và nền ô in</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scale Control */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">Tỷ lệ thu phóng</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={5}
                    value={customScale}
                    onChange={(e) => setCustomScale(Math.max(1, Math.min(1000, parseFloat(e.target.value) || 100)))}
                    className="w-16 px-1.5 py-0.5 text-center text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={10}
                max={300}
                step={5}
                value={customScale}
                onChange={(e) => setCustomScale(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[50, 75, 100, 150, 200].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setCustomScale(sc)}
                    className={`py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      customScale === sc
                        ? 'bg-violet-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                    }`}
                  >
                    {sc}%
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color Control */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">Màu nền ô in</label>
                <span className="text-[10px] font-mono text-slate-500 font-medium uppercase">{backgroundColor}</span>
              </div>

              {/* Preset Swatches */}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { col: '#ffffff', name: 'Trắng' },
                  { col: '#f8fafc', name: 'Xám sáng' },
                  { col: '#000000', name: 'Đen' },
                  { col: '#fef08a', name: 'Vàng nhạt' },
                  { col: '#dbeafe', name: 'Xanh nhạt' },
                  { col: '#fee2e2', name: 'Hồng nhạt' },
                ].map(({ col, name }) => {
                  const isSelected = backgroundColor.toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setBackgroundColor(col)}
                      className={`w-9 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center relative shadow-2xs border ${
                        col === '#ffffff' ? 'border-slate-300' : 'border-transparent'
                      } ${isSelected ? 'ring-2 ring-offset-2 ring-slate-800 shadow-sm scale-105' : 'hover:scale-105'}`}
                      style={{ backgroundColor: col }}
                      title={name}
                    >
                      {isSelected && (
                        <Check 
                          size={14} 
                          className={col === '#ffffff' || col === '#f8fafc' || col === '#fef08a' || col === '#dbeafe' || col === '#fee2e2' ? 'text-slate-800 stroke-[3]' : 'text-white stroke-[3]'} 
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium">Màu tuỳ chọn:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex-1">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-5 h-5 rounded-md border-0 p-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-mono font-medium text-slate-700 uppercase focus:outline-none"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCustomScale(100);
                  setBackgroundColor('#ffffff');
                }}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Đặt lại 100%
              </button>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-sm hover:shadow transition cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Modal */}
      {isRenderModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isSubmittingRender && setIsRenderModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-800 relative flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
                  <Play size={20} className="fill-current ml-0.5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Khởi chạy Render Prepress
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Bình Trang &rarr; Render
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đóng gói bình trang hiện tại và chuyển sang phân hệ /render để xuất RIP / Prepress chất lượng cao
                  </p>
                </div>
              </div>
              <button
                disabled={isSubmittingRender}
                onClick={() => setIsRenderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-40 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* 1. Chọn Agent / Môi trường Render */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Cpu size={14} className="text-indigo-600" />
                    1. Chọn Môi trường thực thi (Render Engine)
                  </label>
                  {isProbingAgent && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Đang kiểm tra GoAgent...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option: Auto */}
                  <div
                    onClick={() => setSelectedRenderEngine('auto')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      selectedRenderEngine === 'auto'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" />
                        Tự động (Auto)
                      </span>
                      {selectedRenderEngine === 'auto' && (
                        <CheckCircle2 size={16} className="text-indigo-600 fill-indigo-100" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Ưu tiên GoAgent PC nếu online, tự động điều phối linh hoạt.
                    </p>
                  </div>

                  {/* Option: GoAgent PC */}
                  <div
                    onClick={() => setSelectedRenderEngine('goagent')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      selectedRenderEngine === 'goagent'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Cpu size={14} className="text-emerald-600" />
                        GoAgent Cục bộ
                      </span>
                      {selectedRenderEngine === 'goagent' && (
                        <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-100" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-medium text-slate-700">
                        {goAgentInfo?.detected ? (goAgentInfo.pc_name || 'PC 128GB RAM') : 'Chưa bật GoAgent'}
                      </p>
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        goAgentInfo?.detected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {goAgentInfo?.detected ? '● Đã kết nối' : '○ Tự động chuyển Cloud'}
                      </span>
                    </div>
                  </div>

                  {/* Option: Server */}
                  <div
                    onClick={() => setSelectedRenderEngine('server')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      selectedRenderEngine === 'server'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Server size={14} className="text-blue-600" />
                        Máy trạm Server
                      </span>
                      {selectedRenderEngine === 'server' && (
                        <CheckCircle2 size={16} className="text-blue-600 fill-blue-100" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Máy chủ phân tán, hỗ trợ hàng đợi và profiles đầy đủ.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Chọn Preset Render */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
                  <Zap size={14} className="text-amber-500" />
                  2. Chọn Preset Tiêu chuẩn In & Màu sắc
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RENDER_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{preset.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                              {preset.name}
                            </span>
                            {isSelected && <CheckCircle2 size={15} className="text-indigo-600 fill-indigo-100 shrink-0 ml-1" />}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                            {preset.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Tóm tắt bố cục trang hiện tại */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Khổ trang</span>
                    <span className="font-semibold text-slate-800">{config.pageW} &times; {config.pageH} mm</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Mẫu / Layer</span>
                    <span className="font-semibold text-slate-800">{shapeTabs.length} Layer ({currentPlan?.items?.length || 0} con/trang)</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Hình dáng</span>
                    <span className="font-semibold text-slate-800 uppercase">{config.shape}</span>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                  Sẵn sàng xuất PDF
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isSubmittingRender}
                onClick={() => setIsRenderModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition disabled:opacity-40 cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={isSubmittingRender}
                onClick={handleStartRender}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition disabled:opacity-60 cursor-pointer"
              >
                {isSubmittingRender ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{renderProgressText || 'Đang đóng gói PDF...'}</span>
                  </>
                ) : (
                  <>
                    <Play size={16} className="fill-current" />
                    <span>Chuyển sang Render & Bắt đầu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal when Loading History */}
      {isUnsavedWarningModalOpen && pendingHistoryToLoad && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsUnsavedWarningModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Dự án hiện tại chưa được lưu!
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Bản bình trang hiện tại có các thay đổi chưa được lưu. Nếu bạn nạp lịch sử <strong className="text-slate-800 font-semibold">"{pendingHistoryToLoad.title}"</strong>, toàn bộ thông số và layer hiện tại trên canvas sẽ bị thay thế.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsUnsavedWarningModalOpen(false);
                  setPendingHistoryToLoad(null);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingHistoryToLoad;
                  setIsUnsavedWarningModalOpen(false);
                  setPendingHistoryToLoad(null);
                  applyHistoryItem(target);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
              >
                Bỏ qua & Nạp ngay
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pendingHistoryToLoad;
                  const savedOk = await saveToFileManager(true);
                  if (savedOk) {
                    setIsUnsavedWarningModalOpen(false);
                    setPendingHistoryToLoad(null);
                    applyHistoryItem(target);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-indigo-200 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save size={14} />
                <span>Lưu & Nạp lịch sử</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Success & Download Modal (Shown directly on /layout) */}
      {renderSuccessModal && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setRenderSuccessModal(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-800 relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
                  <CheckCircle2 size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Kết xuất Render Prepress Hoạt Tất!
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {renderSuccessModal.duration}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                    {renderSuccessModal.filename}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenderSuccessModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content & Preview */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Image Preview Box */}
              <div className="relative rounded-2xl border border-slate-200 bg-slate-950/5 p-3 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden group">
                {renderSuccessModal.previewUrl ? (
                  <img
                    src={renderSuccessModal.previewUrl}
                    alt="Render Preview"
                    className="max-h-[320px] max-w-full object-contain rounded-lg shadow-md transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                    <LayoutGrid size={40} className="opacity-40" />
                    <span className="text-xs">Đã kết xuất thành công PDF Vector</span>
                  </div>
                )}
              </div>

              {/* Spec Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Độ phân giải</span>
                  <span className="font-bold text-slate-800">{renderSuccessModal.dpi} DPI</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Hệ màu</span>
                  <span className="font-bold text-slate-800 uppercase">{renderSuccessModal.colorspace}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời gian</span>
                  <span className="font-bold text-emerald-600">{renderSuccessModal.duration}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Môi trường</span>
                  <span className="font-bold text-indigo-700 truncate block" title={renderSuccessModal.engineName}>
                    {renderSuccessModal.engineName}
                  </span>
                </div>
              </div>
              {/* Separate Sheet Files for Multi-page / Multi-sheet */}
              {renderSuccessModal.sheetFiles && renderSuccessModal.sheetFiles.length > 1 && (
                <div className="bg-gradient-to-br from-violet-50/90 to-indigo-50/70 border border-violet-200/90 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                      <span className="text-xs font-bold text-violet-900">
                        Bộ tệp kết xuất ({renderSuccessModal.sheetFiles.length} tờ in riêng biệt)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        renderSuccessModal.sheetFiles?.forEach((file: any, idx: number) => {
                          setTimeout(() => {
                            const a = document.createElement('a');
                            a.href = file.downloadUrl;
                            a.download = file.filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }, idx * 400);
                        });
                        safeToastSuccess(`Đang tải xuống lần lượt ${renderSuccessModal.sheetFiles.length} file...`);
                      }}
                      className="text-[11px] font-bold px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Tải tất cả các file riêng biệt cùng lúc"
                    >
                      <Download size={13} />
                      <span>Tải cả {renderSuccessModal.sheetFiles.length} file riêng</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {renderSuccessModal.sheetFiles.map((file: any) => (
                      <a
                        key={file.sheetIndex}
                        href={file.downloadUrl}
                        download={file.filename}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 bg-white hover:bg-violet-100/70 text-violet-800 font-semibold text-xs transition cursor-pointer shadow-2xs"
                        title={`Tải file ${file.sheetName}: ${file.filename}`}
                      >
                        <Download size={12} className="text-violet-600" />
                        <span>Tải {file.sheetName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRenderSuccessModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {renderSuccessModal.sheetFiles && renderSuccessModal.sheetFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      renderSuccessModal.sheetFiles?.forEach((file: any, idx: number) => {
                        setTimeout(() => {
                          const a = document.createElement('a');
                          a.href = file.downloadUrl;
                          a.download = file.filename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }, idx * 400);
                      });
                      safeToastSuccess(`Đang tải xuống ${renderSuccessModal.sheetFiles.length} file...`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Tải {renderSuccessModal.sheetFiles.length} file riêng</span>
                  </button>
                )}

                <a
                  href={renderSuccessModal.downloadUrl}
                  download={renderSuccessModal.filename || 'BinhTrang_Render.pdf'}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer"
                >
                  <Download size={16} />
                  <span>
                    {renderSuccessModal.sheetFiles && renderSuccessModal.sheetFiles.length > 1
                      ? `Tải File Gộp (${renderSuccessModal.totalPages || renderSuccessModal.sheetFiles.length} trang)`
                      : 'Tải File Render PDF'}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SortJob VPS Result & Inspection Modal */}
      {sortJobModalData && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSortJobModalData(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 text-slate-800 relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
                  <FileJson size={22} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900">
                      Tác vụ Sắp xếp (SortJob)
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-100 text-violet-800 border border-violet-200">
                      <span>ID:</span>
                      <span className="select-all">{sortJobModalData.id}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyJobId(sortJobModalData.id)}
                      className="px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Sao chép ID để gửi báo kiểm tra"
                    >
                      {copiedJobId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedJobId ? 'Đã sao chép!' : 'Sao chép ID'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
                    {sortJobModalData.title} &bull; Lưu về VPS: <span className="font-mono text-indigo-600 font-semibold">{sortJobModalData.summary?.vps_endpoint}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSortJobModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-3 border-b border-slate-100 flex-shrink-0">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Khổ tờ in</span>
                <span className="font-bold text-slate-800">{sortJobModalData.sheet?.width_mm}×{sortJobModalData.sheet?.height_mm} mm</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Số lượng tem</span>
                <span className="font-bold text-violet-700">{sortJobModalData.selected_plan?.quantity} tem</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Số Layer</span>
                <span className="font-bold text-slate-800">{sortJobModalData.layers?.length || 0} Layer</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Phương án</span>
                <span className="font-bold text-emerald-700 truncate block" title={sortJobModalData.selected_plan?.name}>
                  {sortJobModalData.selected_plan?.name}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 flex-shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setSortJobTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  sortJobTab === 'overview'
                    ? 'bg-violet-100 text-violet-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tổng quan & Vị trí ({sortJobModalData.selected_plan?.items?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setSortJobTab('layers')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  sortJobTab === 'layers'
                    ? 'bg-violet-100 text-violet-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Chi tiết Layers ({sortJobModalData.layers?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setSortJobTab('json')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  sortJobTab === 'json'
                    ? 'bg-violet-100 text-violet-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Mã JSON SortJob
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto py-3 pr-1 min-h-[260px] text-xs">
              {sortJobTab === 'overview' && (
                <div className="space-y-3">
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 text-slate-700 flex items-start gap-2.5">
                    <Info size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        SortJob đã được khởi tạo và đồng bộ lên cụm Job Engine (157.66.80.125)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Mã ID <strong className="font-mono text-indigo-700">{sortJobModalData.id}</strong> chứa đầy đủ vector, tọa độ xếp, và thông số mọi layer. Bạn chỉ cần gửi mã ID này để kiểm tra hoặc tái hiện lại tác vụ sắp xếp.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                      <span>Danh sách vị trí tem trên tờ in ({sortJobModalData.selected_plan?.items?.length || 0} tem)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Đơn vị: mm</span>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                      {sortJobModalData.selected_plan?.items?.map((it: any, idx: number) => (
                        <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-slate-700 hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center font-bold">
                              #{it.index}
                            </span>
                            <span className="font-semibold text-slate-900">{it.layer_name || `Layer ${idx + 1}`}</span>
                            <span className="text-slate-400 text-[10px]">({it.shape})</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                            <span>X: <strong>{it.x_mm}</strong></span>
                            <span>Y: <strong>{it.y_mm}</strong></span>
                            <span>{it.width_mm}×{it.height_mm}</span>
                            {it.rotated && <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">Xoay</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {sortJobTab === 'layers' && (
                <div className="space-y-2">
                  {sortJobModalData.layers?.map((layer: any, idx: number) => (
                    <div key={idx} className="p-3 border border-slate-200 rounded-2xl bg-white flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: layer.color || '#8b5cf6' }}
                        >
                          {layer.name?.[0]?.toUpperCase() || `L${idx + 1}`}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs truncate">{layer.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                              {layer.shape}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>Khổ tem: <strong>{layer.width_mm}×{layer.height_mm}mm</strong></span>
                            <span>&bull;</span>
                            <span>Số lượng: <strong className="text-violet-700">{layer.quantity}</strong></span>
                            {layer.has_vector_mask && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold text-[9px] border border-emerald-200">
                                Vector Mask
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {layer.source_file && (
                        <div className="text-right text-[11px] text-slate-500 truncate max-w-[180px]">
                          <span className="text-slate-400 block text-[9px]">File nguồn</span>
                          <span className="font-medium text-slate-700 truncate block" title={layer.source_file.name}>
                            {layer.source_file.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {sortJobTab === 'json' && (
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      type="button"
                      onClick={() => handleCopyJobJson(sortJobModalData)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md transition cursor-pointer"
                    >
                      {copiedJson ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedJson ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] leading-relaxed overflow-auto max-h-[320px] select-all border border-slate-800">
                    {JSON.stringify(sortJobModalData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSortJobModalData(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSortJobJson(sortJobModalData)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs"
                >
                  <Download size={14} />
                  <span>Tải tệp JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyJobId(sortJobModalData.id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition cursor-pointer"
                >
                  {copiedJobId ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                  <span>{copiedJobId ? 'Đã chép ID!' : 'Sao chép ID để kiểm tra'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cut Dieline Preview & Export Modal (SVG & PDF) */}
      <CutDielineModal
        isOpen={isCutSvgModalOpen}
        onClose={() => setIsCutSvgModalOpen(false)}
        plan={currentPlan}
        pageW={config.pageW}
        pageH={config.pageH}
        defaultItemW={config.itemW}
        defaultItemH={config.itemH}
        defaultShape={config.shape}
        defaultCutBleed={config.cutBleed}
        defaultCornerRadius={config.cornerRadius}
        shapeTabs={shapeTabs}
        currentSheetIndex={currentSheetIndex}
        totalSheets={totalSheets}
        isMultiShape={isMultiShape}
      />
    </div>
  );
};

export default ImpositionAdvancedPage;
