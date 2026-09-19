export type ElementType = 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
export type ObjectFitType = 'fill' | 'contain' | 'cover' | 'none';
export type ImgDataType = 'filename' | 'number';
export type TextFitMode = 'actual' | 'fit' | 'stretch' | 'fill';
export type AlignMode = 'content' | 'page'; 
export type QrCodeType = 'default' | 'micro' | 'iqr' | 'rmqr';

export interface ElementData {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: React.CSSProperties;
  src?: string;
  isLocked?: boolean;
  isPrintVisible?: boolean;
  borderRadius?: string;
  objectFit?: ObjectFitType;
  objectPosition?: string;
  dataType?: ImgDataType;
  textFitMode?: TextFitMode;
  textAlignH?: 'flex-start' | 'center' | 'flex-end';
  textAlignV?: 'flex-start' | 'center' | 'flex-end';
  textWrap?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  isCurved?: boolean;
  qrType?: QrCodeType;
}

export interface SheetRow {
  [key: string]: string;
}

export interface UploadedImage {
  id: string;
  name: string;
  src: string;
}

export interface PageConfig {
  format: 'A3' | 'A4' | 'A5' | 'Custom';
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
}

export type InteractionMode = 'IDLE' | 'DRAGGING' | 'RESIZING' | 'PANNING';
export type SidebarTab = 'properties' | 'layers';
export type DataTab = 'table' | 'google' | 'upload';
