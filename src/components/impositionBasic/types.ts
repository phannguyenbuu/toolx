import { LayoutPlan } from '../../utils/layoutSolver';

export interface ImpositionConfig {
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon';
  itemW: number;
  itemH: number;
  padding: number;
  cornerRadius: number;
  pageW: number;
  pageH: number;
  printW: number;
  printH: number;
  totalOrder: number;
  useCrop: boolean;
  cropLen: number;
  cropDist: number;
  cropThick: number;
  cropColor: string;
  fitMode: 'stretch' | 'fill' | 'fit' | 'actual';
  colorMode: 'original' | 'cmyk' | 'rgb' | 'konica';
  dpi: number;
  autoRotate: boolean;
  processMode: 'vector' | 'raster';
  cutBleed: number;

  // Advanced Color Management (3-layer ICC conversion)
  useAdvancedColor: boolean;
  sourceIcc: string;
  icc1: string;
  iccOutput: string;
}

export interface IccProfile {
  filename: string;
  name: string;
  path: string;
}

export interface ImpositionPageProps {
  onClose?: () => void;
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
}

export type ManualRotateType = 'auto' | 'portrait' | 'landscape';
export type ApiStatus = 'checking' | 'online' | 'offline';

export interface PreviewImages {
  portrait: string;
  landscape: string;
}
