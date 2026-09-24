export interface VectorKnot {
  id: string;
  x: number; // in mm
  y: number; // in mm
  isCurved?: boolean;
  cpIn?: { x: number; y: number };
  cpOut?: { x: number; y: number };
}

export interface VectorMaskResult {
  svgString: string;
  pathData: string;
  knots: VectorKnot[];
  w_mm: number;
  h_mm: number;
  cornerRadius?: number;
}

export interface VectorMaskEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  imageName?: string;
  itemW: number; // mm
  itemH: number; // mm
  initialKnots?: VectorKnot[];
  initialSvgPath?: string;
  onApply: (result: VectorMaskResult) => void;
}

export type PresetShapeType =
  | 'rect'
  | 'circle'
  | 'oval'
  | 'trapezoid'
  | 'triangle'
  | 'hexagon'
  | 'star'
  | 'heart'
  | 'badge'
  | 'arch';

export type ToolMode = 'select' | 'pen' | 'add_knot' | 'pan';

export type PreviewMode = 'die_line' | 'mask_overlay' | 'cut_preview';

export type ActiveSidebarTab = 'tools' | 'presets' | 'settings';
