/**
 * Multi-size / Multi-shape bin packing solver types
 */

export interface PackItem {
  w: number;  // width in mm
  h: number;  // height in mm
  id: number; // original index
  tabId?: string;
  tabName?: string;
  shape?: string;
  cornerRadius?: number;
  sourceImage?: any;
  vectorMaskResult?: any;
  customSvgData?: string;
  color?: string;
  canRotate?: boolean;
}

export interface PackedItem {
  x: number;
  y: number;
  w: number;
  h: number;
  id: number;
  rot: boolean;
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

export interface PackResult {
  name: string;
  items: PackedItem[];
  totalSheets?: number;
  skipped: number; // items that didn't fit
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
