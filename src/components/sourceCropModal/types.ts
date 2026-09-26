import { ColorAdjustSettings } from '../../utils/colorAdjustment';

export interface CropTransform {
  zoom: number; // 0.2 .. 5.0
  panX: number; // px offset
  panY: number; // px offset
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  aspectMode: 'item' | '1:1' | '4:3' | '16:9' | 'free';
}

export const DEFAULT_CROP_TRANSFORM: CropTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  aspectMode: 'item',
};

export interface CropModalLayerTab {
  id: string;
  name: string;
  enabled: boolean;
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon' | 'custom-svg' | 'svg-image' | 'pdf-source';
  itemW: number;
  itemH: number;
  quantity: number;
  useTotalLimit?: boolean;
  cornerRadius?: number;
  sourceImage?: any;
  vectorMaskResult?: any;
  customSvgData?: string;
  color?: string;
  autoRotateImage?: boolean;
  canRotate?: boolean;
}

export const TAB_COLORS = [
  '#8b5cf6', '#10b981', '#f59e0b', '#ec4899',
  '#06b6d4', '#3b82f6', '#84cc16', '#6366f1'
];

export const LAYER_COLOR_PRESETS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#64748b'
];

export interface BleedBounds {
  leftRatio: number;
  rightRatio: number;
  topRatio: number;
  bottomRatio: number;
}

export type BleedMode = 'off' | 'offset' | 'ai';
export type BleedGapMode = 'expand_gap' | 'shrink_item';
export type ColorTabType = 'balance' | 'curves' | 'brightness' | 'hsl' | 'cmyk' | 'rgb' | 'bleed' | 'removeBg';

export interface RemoveBgSettings {
  whiteThreshold: number; // 180 .. 255 (default 230)
  shadowTolerance: number; // 0 .. 60 (default 25)
  shadowBrightness: number; // 80 .. 240 (default 135)
  featherRadius: number; // 0 .. 5 (default 1.5)
  protectSaturation: number; // 5 .. 50 (default 18)
  floodFillFromBorder: boolean; // default true (từ 4 mép ngoài vào)
  useAiModel: boolean; // default false
}

export const DEFAULT_REMOVE_BG_SETTINGS: RemoveBgSettings = {
  whiteThreshold: 230,
  shadowTolerance: 25,
  shadowBrightness: 135,
  featherRadius: 1.5,
  protectSaturation: 18,
  floodFillFromBorder: true,
  useAiModel: false,
};

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ViewportSize {
  w: number;
  h: number;
}

export interface SourceImageCropColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  imageName?: string;
  itemW?: number; // mm
  itemH?: number; // mm
  shape?: string;
  quantity?: number;
  cutBleed?: number; // mm (bù tràn lề outpaint)
  gap?: number; // mm (khoảng cách giữa các tem)
  initialColorSettings?: ColorAdjustSettings;
  initialCropSettings?: CropTransform;
  initialBleedBounds?: BleedBounds | null;
  initialBleedPercent?: number;
  shapeTabs?: CropModalLayerTab[];
  activeTabId?: string;
  // Aliases for compatibility
  imageSrc?: string | null;
  fileName?: string;
  layerTabs?: CropModalLayerTab[];
  initialBleedMm?: number;
  originalImageBleedBounds?: BleedBounds | null;
  onApply: (result: {
    dataUrl: string;
    originalImage: string;
    w_mm: number;
    h_mm: number;
    colorSettings: ColorAdjustSettings;
    cropSettings: CropTransform;
    filename?: string;
    updatedTabs?: CropModalLayerTab[];
    activeTabId?: string;
    bleedBounds?: BleedBounds | null;
    bleedPercent?: number;
    bleedMm?: number;
    addedGapMm?: number;
  }) => void;
}
