// Priority constants
export const P_STRAIGHT = 1;
export const P_ROTATED = 2;
export const P_MIXED = 3;
export const P_STAGGERED = 4;
export const P_FLIPPED = 5;
export const P_ROT45 = 6;

// Layout-specific interfaces
export interface PlanItem {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: boolean;
  rot45?: boolean;
  flipped?: boolean;
  sheetIndex?: number;
  tabId?: string;
  tabName?: string;
  shape?: string;
  cornerRadius?: number;
  sourceImage?: any;
  vectorMaskResult?: any;
  customSvgData?: string;
  color?: string;
}

export interface LayoutPlan {
  name: string;
  qty: number;
  items: PlanItem[];
  priority: number;
}

export interface SolverConfig {
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon';
  itemW: number;
  itemH: number;
  padding: number;
  printW: number;
  printH: number;
  pageW: number;
  pageH: number;
  autoRotate?: boolean;
}
