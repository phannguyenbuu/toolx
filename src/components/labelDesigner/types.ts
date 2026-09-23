// Conversion factor: 1mm = 3.7795px at 96 DPI (standard web resolution)
export const MM_TO_PX = 3.7795;

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const pxToMm = (px: number) => Math.round((px / MM_TO_PX) * 100) / 100;
export const mmToPx = (mm: number) => mm * MM_TO_PX;

// Element types supported by the designer
export type ElementType = 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
export type ObjectFitType = 'fill' | 'contain' | 'cover' | 'none';
export type QRTemplateType = 'custom' | 'vietqr';
export type VietQRStyleType = 'compact' | 'compact2' | 'qr_only' | 'print';
export type ImageDataType = 'filename' | 'number' | 'exact' | 'url';
export type BackgroundFitType = 'fill' | 'contain' | 'cover' | 'stretch';
export type LayoutMode = 'grid' | 'gridH' | 'gridV' | 'brick' | 'rotateAlt' | 'nesting' | 'auto';

export const VIETQR_STYLES = [
  { value: 'compact', label: 'Compact (540x540)', desc: 'QR + logo VietQR, Napas, NH' },
  { value: 'compact2', label: 'Compact2 (540x640)', desc: 'QR + logo + thông tin CK' },
  { value: 'qr_only', label: 'QR Only (480x480)', desc: 'Chỉ mã QR đơn giản' },
  { value: 'print', label: 'Print (600x776)', desc: 'QR + đầy đủ thông tin' },
];

export const VIETNAM_BANKS = [
  { code: 'VCB', name: 'Vietcombank', bin: '970436' },
  { code: 'TCB', name: 'Techcombank', bin: '970407' },
  { code: 'MB', name: 'MB Bank', bin: '970422' },
  { code: 'ACB', name: 'ACB', bin: '970416' },
  { code: 'VPB', name: 'VPBank', bin: '970432' },
  { code: 'TPB', name: 'TPBank', bin: '970423' },
  { code: 'STB', name: 'Sacombank', bin: '970403' },
  { code: 'HDB', name: 'HDBank', bin: '970437' },
  { code: 'VIB', name: 'VIB', bin: '970441' },
  { code: 'SHB', name: 'SHB', bin: '970443' },
  { code: 'EIB', name: 'Eximbank', bin: '970431' },
  { code: 'MSB', name: 'MSB', bin: '970426' },
  { code: 'BIDV', name: 'BIDV', bin: '970418' },
  { code: 'VTB', name: 'Vietinbank', bin: '970415' },
  { code: 'AGR', name: 'Agribank', bin: '970405' },
  { code: 'OCB', name: 'OCB', bin: '970448' },
  { code: 'SEAB', name: 'SeABank', bin: '970440' },
  { code: 'NAB', name: 'Nam A Bank', bin: '970428' },
  { code: 'PGB', name: 'PG Bank', bin: '970430' },
  { code: 'VAB', name: 'Viet A Bank', bin: '970427' },
  { code: 'BAB', name: 'Bac A Bank', bin: '970409' },
  { code: 'SCVN', name: 'Standard Chartered VN', bin: '970410' },
];

// Element data structure for canvas objects
export interface ElementData {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textAlignH?: 'left' | 'center' | 'right';
  textAlignV?: 'top' | 'middle' | 'bottom';
  rotate?: number;
  opacity?: number;
  isLocked?: boolean;
  isVisible?: boolean;
  src?: string;
  objectFit?: ObjectFitType;
  dataType?: ImageDataType;
  matchMode?: 'contains' | 'exact' | 'startsWith' | 'endsWith';
  ignoreExtension?: boolean;
  bidirectional?: boolean;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  qrTemplate?: QRTemplateType;
  vietqrStyle?: VietQRStyleType;
  bankCode?: string;
  accountNo?: string;
  accountName?: string;
  amount?: string;
  memo?: string;
  barcodeShowText?: boolean;
  barcodeFormat?: string;
  [key: string]: any;
}

// Page configuration for label dimensions
export interface PageConfig {
  format: 'A3' | 'A4' | 'A5' | 'Custom';
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  backgroundSrc?: string;
  backgroundFit?: BackgroundFitType;
}

// Sheet configuration for multi-label printing
export interface SheetConfig {
  format: 'A3' | 'A4' | 'A5' | 'Custom';
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  shape: 'rect' | 'circle';
  layoutMode: LayoutMode;
  marginTop: number;
  marginLeft: number;
  gapH: number;
  gapV: number;
  useCropMark: boolean;
  cropLen: number;
  cropDist: number;
  cropThick: number;
  cropColor: string;
  useSafeZone: boolean;
  safeZone: number;
  pageNumber: 'none' | 'header' | 'footer';
}

// Computed cell position for layout
export interface LayoutCell {
  x: number; // mm from left
  y: number; // mm from top
  w: number; // cell width mm
  h: number; // cell height mm
  rotate: number; // degrees
}

// Data row from CSV/Excel import
export interface SheetRow {
  [key: string]: string;
}

// Uploaded image metadata
export interface UploadedImage {
  id: string;
  name: string;
  src: string;
  size?: number;
  type?: string;
}

export interface LabelDesignerPageProps {
  onClose?: () => void;
}

export const parseCSV = (text: string) => {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const simpleValues = line.split(',');
    const finalValues = values.length >= headers.length ? values : simpleValues;
    const rowData: SheetRow = {};
    headers.forEach((h, i) => {
      rowData[h] = (finalValues[i] || '').replace(/^"|"$/g, '').trim();
    });
    return rowData;
  });
  return { headers, rows };
};
