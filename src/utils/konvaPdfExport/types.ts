export const MM_TO_PT = 2.83465;

// Konva-specific element interface (not related to API data)
export interface KonvaElement {
  id: string;
  type: 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  rotate?: number;
  textAlignH?: string;
  textAlignV?: string;
  zIndex?: number;
  qrTemplate?: 'custom' | 'vietqr';
  vietQRImageUrl?: string;
}

// PDF export-specific interfaces (not related to API data)
export interface BackgroundConfig {
  src: string;
  fit: 'fill' | 'contain' | 'cover' | 'stretch';
}

export interface ExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  elements: KonvaElement[];
  fontBytes?: Map<string, ArrayBuffer>;
  background?: BackgroundConfig;
}

export interface MultiPageExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  pages: KonvaElement[][];
  fontBytes?: Map<string, ArrayBuffer>;
  background?: BackgroundConfig;
}

export interface SheetExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  shape: 'rect' | 'circle';
  layoutMode?: string;
  marginTopMm: number;
  marginLeftMm: number;
  gapHMm: number;
  gapVMm: number;
  useCropMark: boolean;
  cropLenMm: number;
  cropDistMm: number;
  cropThickPt: number;
  cropColor: string;
  pageNumber?: 'none' | 'header' | 'footer';
  pages: KonvaElement[][];
  background?: BackgroundConfig;
}

export interface PdfLayoutCell {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    };
  }
  return { r: 0, g: 0, b: 0 };
}
