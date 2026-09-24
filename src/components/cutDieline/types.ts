import { LayoutPlan } from '../../utils/layoutSolver';

export interface ShapeTabItem {
  id: string;
  name: string;
  shape: string;
  itemW: number;
  itemH: number;
  cornerRadius?: number;
  customSvgData?: string;
  color?: string;
  vectorMaskResult?: {
    pathData?: string;
    knots?: Array<{ x: number; y: number }>;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export interface CutDielineModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: LayoutPlan | null;
  pageW: number;
  pageH: number;
  defaultItemW: number;
  defaultItemH: number;
  defaultShape: string;
  defaultCutBleed?: number;
  defaultCornerRadius?: number;
  shapeTabs?: ShapeTabItem[];
  currentSheetIndex?: number;
  totalSheets?: number;
  isMultiShape?: boolean;
}

export interface CutColorPreset {
  label: string;
  value: string;
  ring: string;
}

export type BgTheme = 'light' | 'dark' | 'grid';

export interface DielineCalculationResult {
  svgContent: string;
  totalCutLengthMeters: number;
  itemCount: number;
  renderWidthMm: number;
  renderHeightMm: number;
}
