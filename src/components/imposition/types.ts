import { CropTransform } from '../SourceImageCropColorModal';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { ColorAdjustSettings } from '../../utils/colorAdjustment';

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

export const TAB_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#3b82f6', '#84cc16', '#6366f1'];

export const LAYER_COLOR_PRESETS = [
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

export interface ImpositionConfig {
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

export type DataMode = 1 | 4 | 5 | 6; // 1=Standard, 4=X-Up, 5=2 Mặt Giống, 6=Đối xứng

export type ImpositionStyle = 'sheetwise' | 'work-and-turn' | 'work-and-tumble';

export interface SourcePage {
  id?: string;
  url?: string;
  fileIndex?: number;
  pageIndex?: number;
  thumb: string;
  originalThumb?: string;
  baseThumb?: string;
  name: string;
  w?: number;
  h?: number;
  serverPath?: string;
  fileId?: string;
  rotation: number; // 0, 90, 180, 270
  cropSettings?: CropTransform;
  colorSettings?: ColorAdjustSettings;
  bleedPercent?: number;
  bleedBounds?: {
    leftRatio: number;
    rightRatio: number;
    topRatio: number;
    bottomRatio: number;
  };
}

export type PageItem = SourcePage;

export interface ImpositionPageProps {
  onClose?: () => void;
}

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

export const PAPER_PRESETS = PAPER_PRESET_GROUPS.flatMap(g => g.items.map(it => ({
  label: it.label,
  value: `${it.w}x${it.h}`,
  w: it.w,
  h: it.h,
  category: it.category
})));

export const AUTOSAVE_STORAGE_KEY = 'toolx_imposition_autosave';

export interface ImpositionAutoSavedState {
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

export interface WorkspaceItem {
  id?: string;
  name: string;
  config: ImpositionConfig;
  dataMode: DataMode;
  xUpQty: number;
  standardQty: number;
}

export interface ImpositionHistoryItem {
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

export { RENDER_PRESETS } from '../RenderSettingsModal';
export type { RenderPreset } from '../RenderSettingsModal';
