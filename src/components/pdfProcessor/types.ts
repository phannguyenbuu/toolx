export interface PageData {
  idx: number;
  num: number;
  type: 'color' | 'bw' | 'blank';
  deleted: boolean;
  rotation: number;
  thumb: string;
  json: any;
}

export interface PdfProcessorProps {
  onClose?: () => void;
}

export type ToolType = 'select' | 'text' | 'rect';
export type FilterType = 'all' | 'color' | 'bw' | 'blank';
export type ViewMode = 'dashboard' | 'studio';
export type ActiveTab = 'stats' | 'layers';

export interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

export interface PdfStats {
  color: PageData[];
  bw: PageData[];
  blank: PageData[];
}

declare global {
  interface Window {
    pdfjsLib: any;
    PDFLib: any;
    fontkit: any;
    fabric: any;
  }
}
