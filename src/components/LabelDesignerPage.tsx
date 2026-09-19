import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import { PropertiesPanel } from './PropertiesPanel';
import {
  Type, Square, QrCode, ScanLine, Image as ImageIcon, Download,
  Trash2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RefreshCw, Upload,
  Bold, Italic, Underline, GripVertical,
  Undo, Redo, PanelRightClose, PanelRightOpen,
  Eye, EyeOff, Lock, Unlock,
  Database, Images, Hash, Edit3, X, Table, FileSpreadsheet,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Copy, MoveUp, MoveDown, ArrowUpToLine, ArrowDownToLine,
  LayoutGrid, MousePointer2, Link, FileDown, Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AutoNumberingModule } from './AutoNumberingModule';
import fontService from '../services/fontService';
import { generateQRCodeDataUrl, generateBarcodeDataUrl } from '../utils/qrBarcodeGenerator';
import { exportKonvaToPdfMultiPage, exportKonvaToSheetPdf, KonvaElement } from '../utils/konvaPdfExport';
import * as pdfjsLib from 'pdfjs-dist';
import { storageApi, filesApi } from '../services/supabaseApi';
import { supabase } from '../services/supabase';
import { fileService } from '../services/fileService';

// Load a font into the browser so Konva canvas can render it
const browserFontCache = new Set<string>();
async function loadBrowserFont(fontFamily: string): Promise<void> {
  if (!fontFamily || browserFontCache.has(fontFamily)) return;
  try {
    const res = await fetch('/fonts/fonts.json');
    if (!res.ok) return;
    const data: Array<{name: string; file: string}> = await res.json();
    const entry = data.find(f => f.name === fontFamily);
    if (!entry) return;
    const font = new FontFace(fontFamily, `url('/fonts/${encodeURIComponent(entry.file)}')`);
    const loaded = await font.load();
    document.fonts.add(loaded);
    browserFontCache.add(fontFamily);
  } catch (e) {
    console.warn('[loadBrowserFont] failed:', fontFamily, e);
  }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Conversion factor: 1mm = 3.7795px at 96 DPI (standard web resolution)
const MM_TO_PX = 3.7795;

// Element types supported by the designer
type ElementType = 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
type ObjectFitType = 'fill' | 'contain' | 'cover' | 'none';
type QRTemplateType = 'custom' | 'vietqr';
type VietQRStyleType = 'compact' | 'compact2' | 'qr_only' | 'print';
type ImageDataType = 'filename' | 'number' | 'exact' | 'url';

const VIETQR_STYLES = [
  { value: 'compact', label: 'Compact (540x540)', desc: 'QR + logo VietQR, Napas, NH' },
  { value: 'compact2', label: 'Compact2 (540x640)', desc: 'QR + logo + thông tin CK' },
  { value: 'qr_only', label: 'QR Only (480x480)', desc: 'Chỉ mã QR đơn giản' },
  { value: 'print', label: 'Print (600x776)', desc: 'QR + đầy đủ thông tin' },
];

const VIETNAM_BANKS = [
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
interface ElementData {
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
}

type BackgroundFitType = 'fill' | 'contain' | 'cover' | 'stretch';

// Page configuration for label dimensions
interface PageConfig {
  format: 'A3' | 'A4' | 'A5' | 'Custom';
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  backgroundSrc?: string;
  backgroundFit?: BackgroundFitType;
}

// Layout mode for arranging labels on sheet
type LayoutMode = 'grid' | 'gridH' | 'gridV' | 'brick' | 'rotateAlt' | 'nesting' | 'auto';

// Sheet configuration for multi-label printing
interface SheetConfig {
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
interface LayoutCell {
  x: number; // mm from left
  y: number; // mm from top
  w: number; // cell width mm
  h: number; // cell height mm
  rotate: number; // degrees
}

// Helper: simple grid layout returning cells
function _gridCells(
  sheetW: number, sheetH: number,
  w: number, h: number,
  mT: number, mL: number,
  gH: number, gV: number,
  rot: number
): LayoutCell[] {
  // bounding box after rotation
  const bw = rot === 90 || rot === 270 ? h : w;
  const bh = rot === 90 || rot === 270 ? w : h;
  const usableW = sheetW - mL * 2;
  const usableH = sheetH - mT * 2;
  const cols = Math.max(1, Math.floor((usableW + gH) / (bw + gH)));
  const rows = Math.max(1, Math.floor((usableH + gV) / (bh + gV)));
  const gw = cols * bw + (cols - 1) * gH;
  const gh = rows * bh + (rows - 1) * gV;
  const ox = (sheetW - gw) / 2;
  const oy = (sheetH - gh) / 2;
  const cells: LayoutCell[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ x: ox + c * (bw + gH), y: oy + r * (bh + gV), w, h, rotate: rot });
  return cells;
}

// Calculate layout cells for all modes
// Cell w/h = ORIGINAL item size (before rotation). x/y = bounding box top-left.
function computeLayoutCells(
  sheetW: number, sheetH: number,
  itemW: number, itemH: number,
  marginTop: number, marginLeft: number,
  gapH: number, gapV: number,
  mode: LayoutMode, shape: 'rect' | 'circle'
): LayoutCell[] {
  const effW = shape === 'circle' ? Math.min(itemW, itemH) : itemW;
  const effH = shape === 'circle' ? Math.min(itemW, itemH) : itemH;
  const usableW = sheetW - marginLeft * 2;
  const usableH = sheetH - marginTop * 2;
  // bounding box of 90° rotated item
  const bw90 = effH, bh90 = effW;

  // --- grid ---
  if (mode === 'grid') {
    return _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
  }

  // --- gridH: alternate rows normal / 90° ---
  if (mode === 'gridH') {
    const colsN = Math.max(1, Math.floor((usableW + gapH) / (effW + gapH)));
    const colsR = Math.max(1, Math.floor((usableW + gapH) / (bw90 + gapH)));
    const gwN = colsN * effW + (colsN - 1) * gapH;
    const gwR = colsR * bw90 + (colsR - 1) * gapH;
    // Pass 1: compute total height
    let totalH = 0;
    const rowHeights: { h: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const rh = !isRot ? effH : bh90;
      if (totalH + (rowHeights.length > 0 ? gapV : 0) + rh > usableH + 0.01) break;
      totalH += (rowHeights.length > 0 ? gapV : 0) + rh;
      rowHeights.push({ h: rh, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: LayoutCell[] = [];
    let cy = (sheetH - totalH) / 2;
    for (const row of rowHeights) {
      if (!row.rot) {
        const ox = (sheetW - gwN) / 2;
        for (let c = 0; c < colsN; c++)
          cells.push({ x: ox + c * (effW + gapH), y: cy, w: effW, h: effH, rotate: 0 });
      } else {
        const ox = (sheetW - gwR) / 2;
        for (let c = 0; c < colsR; c++)
          cells.push({ x: ox + c * (bw90 + gapH), y: cy, w: effW, h: effH, rotate: 90 });
      }
      cy += row.h + gapV;
    }
    const plain = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  // --- gridV: alternate cols normal / 90° ---
  if (mode === 'gridV') {
    const rowsN = Math.max(1, Math.floor((usableH + gapV) / (effH + gapV)));
    const rowsR = Math.max(1, Math.floor((usableH + gapV) / (bh90 + gapV)));
    const ghN = rowsN * effH + (rowsN - 1) * gapV;
    const ghR = rowsR * bh90 + (rowsR - 1) * gapV;
    // Pass 1: compute total width
    let totalW = 0;
    const colWidths: { w: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const cw = !isRot ? effW : bw90;
      if (totalW + (colWidths.length > 0 ? gapH : 0) + cw > usableW + 0.01) break;
      totalW += (colWidths.length > 0 ? gapH : 0) + cw;
      colWidths.push({ w: cw, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: LayoutCell[] = [];
    let cx = (sheetW - totalW) / 2;
    for (const col of colWidths) {
      if (!col.rot) {
        const oy = (sheetH - ghN) / 2;
        for (let r = 0; r < rowsN; r++)
          cells.push({ x: cx, y: oy + r * (effH + gapV), w: effW, h: effH, rotate: 0 });
      } else {
        const oy = (sheetH - ghR) / 2;
        for (let r = 0; r < rowsR; r++)
          cells.push({ x: cx, y: oy + r * (bh90 + gapV), w: effW, h: effH, rotate: 90 });
      }
      cx += col.w + gapH;
    }
    const plain = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  // --- brick ---
  if (mode === 'brick') {
    const cols = Math.max(1, Math.floor((usableW + gapH) / (effW + gapH)));
    const rows = Math.max(1, Math.floor((usableH + gapV) / (effH + gapV)));
    const gw = cols * effW + (cols - 1) * gapH;
    const oy = (sheetH - (rows * effH + (rows - 1) * gapV)) / 2;
    const ox = (sheetW - gw) / 2;
    const halfShift = (effW + gapH) / 2;
    const cells: LayoutCell[] = [];
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 === 1 ? halfShift : 0;
      for (let c = 0; ; c++) {
        const cx = ox + shift + c * (effW + gapH);
        if (cx + effW > sheetW - marginLeft + 0.01) break;
        if (cx < marginLeft - 0.01) continue;
        cells.push({ x: cx, y: oy + r * (effH + gapV), w: effW, h: effH, rotate: 0 });
      }
    }
    return cells;
  }

  // --- rotateAlt: checkerboard 180° ---
  if (mode === 'rotateAlt') {
    const cols = Math.max(1, Math.floor((usableW + gapH) / (effW + gapH)));
    const rows = Math.max(1, Math.floor((usableH + gapV) / (effH + gapV)));
    const gw = cols * effW + (cols - 1) * gapH;
    const gh = rows * effH + (rows - 1) * gapV;
    const ox = (sheetW - gw) / 2;
    const oy = (sheetH - gh) / 2;
    const cells: LayoutCell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells.push({ x: ox + c * (effW + gapH), y: oy + r * (effH + gapV), w: effW, h: effH, rotate: (r + c) % 2 === 1 ? 180 : 0 });
    return cells;
  }

  // --- nesting: pairs normal+90° side by side ---
  if (mode === 'nesting') {
    const pairW = effW + gapH + bw90;
    const pairCols = Math.max(1, Math.floor((usableW + gapH) / (pairW + gapH)));
    const maxBH = Math.max(effH, bh90);
    const pairRows = Math.max(1, Math.floor((usableH + gapV) / (maxBH + gapV)));
    const gwA = pairCols * pairW + (pairCols - 1) * gapH;
    const ghA = pairRows * maxBH + (pairRows - 1) * gapV;
    const oxA = (sheetW - gwA) / 2;
    const oyA = (sheetH - ghA) / 2;
    const cellsA: LayoutCell[] = [];
    for (let r = 0; r < pairRows; r++) {
      for (let pc = 0; pc < pairCols; pc++) {
        const bx = oxA + pc * (pairW + gapH);
        const cy = oyA + r * (maxBH + gapV);
        cellsA.push({ x: bx, y: cy + (maxBH - effH) / 2, w: effW, h: effH, rotate: 0 });
        cellsA.push({ x: bx + effW + gapH, y: cy + (maxBH - bh90) / 2, w: effW, h: effH, rotate: 90 });
      }
    }
    const plainN = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
    const plainR = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 90);
    return [cellsA, plainN, plainR].reduce((a, b) => b.length > a.length ? b : a);
  }

  // --- auto ---
  if (mode === 'auto') {
    const modes: LayoutMode[] = ['grid', 'gridH', 'gridV', 'brick', 'rotateAlt', 'nesting'];
    let best: LayoutCell[] = [];
    for (const m of modes) {
      const c = computeLayoutCells(sheetW, sheetH, itemW, itemH, marginTop, marginLeft, gapH, gapV, m, shape);
      if (c.length > best.length) best = c;
    }
    return best;
  }

  // fallback
  return _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
}

// Data row from CSV/Excel import
interface SheetRow {
  [key: string]: string;
}

// Uploaded image metadata
interface UploadedImage {
  id: string;
  name: string;
  src: string;
  size?: number;
  type?: string;
}

interface LabelDesignerPageProps {
  onClose?: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const pxToMm = (px: number) => Math.round((px / MM_TO_PX) * 100) / 100;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const parseCSV = (text: string) => {
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


const SheetConfigModal: React.FC<{
  sheetConfig: SheetConfig;
  setSheetConfig: React.Dispatch<React.SetStateAction<SheetConfig>>;
  pageConfig: PageConfig;
  onClose: () => void;
}> = ({ sheetConfig, setSheetConfig, pageConfig, onClose }) => {
  const set = (updates: Partial<SheetConfig>) => setSheetConfig(p => ({ ...p, ...updates }));

  const cells = computeLayoutCells(
    sheetConfig.width, sheetConfig.height,
    pageConfig.width, pageConfig.height,
    sheetConfig.marginTop, sheetConfig.marginLeft,
    sheetConfig.gapH, sheetConfig.gapV,
    sheetConfig.layoutMode || 'grid', sheetConfig.shape
  );
  const total = cells.length;

  // Preview scale
  const PREVIEW_W = 260;
  const scale = PREVIEW_W / sheetConfig.width;
  const previewH = sheetConfig.height * scale;

  const formatOptions: Array<{ label: string; w: number; h: number; fmt: SheetConfig['format'] }> = [
    { label: 'A5', w: 148, h: 210, fmt: 'A5' },
    { label: 'A4', w: 210, h: 297, fmt: 'A4' },
    { label: 'A3', w: 297, h: 420, fmt: 'A3' },
    { label: 'Custom', w: sheetConfig.width, h: sheetConfig.height, fmt: 'Custom' },
  ];

  const applyFormat = (fmt: SheetConfig['format'], orient: SheetConfig['orientation']) => {
    const f = formatOptions.find(x => x.fmt === fmt);
    if (!f || fmt === 'Custom') { set({ format: fmt, orientation: orient }); return; }
    let w = f.w, h = f.h;
    if (orient === 'landscape') [w, h] = [h, w];
    set({ format: fmt, orientation: orient, width: w, height: h });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[640px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold">Cấu hình khổ giấy</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex gap-4">
          {/* Left: settings */}
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Khổ giấy in</label>
              <div className="flex gap-2">
                <select value={sheetConfig.format} onChange={e => applyFormat(e.target.value as SheetConfig['format'], sheetConfig.orientation)} className="flex-1 text-sm border rounded px-2 py-1.5">
                  <option value="A5">A5</option>
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Custom">Tùy chỉnh</option>
                </select>
                <button onClick={() => applyFormat(sheetConfig.format, 'portrait')} className={`px-2 py-1 text-xs rounded border ${sheetConfig.orientation === 'portrait' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>Dọc</button>
                <button onClick={() => applyFormat(sheetConfig.format, 'landscape')} className={`px-2 py-1 text-xs rounded border ${sheetConfig.orientation === 'landscape' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>Ngang</button>
              </div>
            </div>
            {sheetConfig.format === 'Custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500 block mb-1">Rộng (mm)</label><input type="number" value={sheetConfig.width} onChange={e => set({ width: +e.target.value })} className="w-full border rounded px-2 py-1 text-sm"/></div>
                <div><label className="text-xs text-gray-500 block mb-1">Cao (mm)</label><input type="number" value={sheetConfig.height} onChange={e => set({ height: +e.target.value })} className="w-full border rounded px-2 py-1 text-sm"/></div>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Hình dạng trang</label>
              <div className="flex gap-2">
                <button onClick={() => set({ shape: 'rect' })} className={`flex-1 py-2 text-sm rounded border flex items-center justify-center gap-1.5 ${sheetConfig.shape === 'rect' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                  Chữ nhật
                </button>
                <button onClick={() => set({ shape: 'circle' })} className={`flex-1 py-2 text-sm rounded border flex items-center justify-center gap-1.5 ${sheetConfig.shape === 'circle' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                  Hình tròn
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Chế độ xếp hình</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { v: 'auto', label: '⚡ Tự động', desc: 'Chọn cách tối ưu nhất' },
                  { v: 'grid', label: 'Lưới đều', desc: 'Hàng cột đều nhau' },
                  { v: 'gridH', label: 'Cụm ngang', desc: 'Xen kẽ hàng đứng/ngang' },
                  { v: 'gridV', label: 'Cụm dọc', desc: 'Xen kẽ cột đứng/ngang' },
                  { v: 'brick', label: 'So le', desc: 'Hàng lẻ dịch nửa bước' },
                  { v: 'nesting', label: 'Lồng ghép', desc: 'Ghép cặp đứng+ngang' },
                  { v: 'rotateAlt', label: 'Xoay 180°', desc: 'Xen kẽ xoay ngược' },
                ] as const).map(m => (
                  <button key={m.v} onClick={() => set({ layoutMode: m.v })}
                    className={`text-left px-2 py-1.5 text-xs rounded border ${(sheetConfig.layoutMode || 'grid') === m.v ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[10px] opacity-60">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500 block mb-1">Lề trên/dưới (mm)</label><input type="number" value={sheetConfig.marginTop} onChange={e => set({ marginTop: +e.target.value })} className="w-full border rounded px-2 py-1 text-sm"/></div>
              <div><label className="text-xs text-gray-500 block mb-1">Lề trái/phải (mm)</label><input type="number" value={sheetConfig.marginLeft} onChange={e => set({ marginLeft: +e.target.value })} className="w-full border rounded px-2 py-1 text-sm"/></div>
              <div><label className="text-xs text-gray-500 block mb-1">Khoảng cách ngang (mm)</label><input type="number" value={sheetConfig.gapH} onChange={e => set({ gapH: +e.target.value })} className="w-full border rounded px-2 py-1 text-sm"/></div>
              <div><label className="text-xs text-gray-500 block mb-1">Khoảng cách dọc (mm)</label><input type="number" value={sheetConfig.gapV} onChange={e => set({ gapV: +e.target.value })} className="w-full border rounded px-2 py-1 text-sm"/></div>
            </div>
            <div className="bg-blue-50 rounded p-3 text-sm text-blue-800">
              Xếp được <strong>{total} trang</strong> trên mỗi tờ khổ {sheetConfig.width}×{sheetConfig.height}mm
              <span className="text-[10px] ml-1 opacity-60">({
                { grid: 'lưới đều', gridH: 'cụm ngang', gridV: 'cụm dọc', brick: 'so le', rotateAlt: 'xoay 180°', nesting: 'lồng ghép', auto: 'tự động' }[sheetConfig.layoutMode || 'grid']
              })</span>
            </div>
            <div className="border-t pt-3">
              <label className="flex items-center justify-between mb-2 cursor-pointer">
                <span className="text-xs font-bold text-blue-600">Đánh dấu cắt (góc trang)</span>
                <input type="checkbox" checked={sheetConfig.useCropMark} onChange={e => set({ useCropMark: e.target.checked })} className="rounded text-blue-600" />
              </label>
              {sheetConfig.useCropMark && (
                <div className="grid grid-cols-4 gap-1">
                  <div><label className="text-[10px] text-gray-400 block text-center">Dải (mm)</label><input type="number" step="0.1" value={sheetConfig.cropLen} onChange={e => set({ cropLen: +e.target.value })} className="w-full border rounded px-1 py-1 text-xs text-center" /></div>
                  <div><label className="text-[10px] text-gray-400 block text-center">Cách (mm)</label><input type="number" step="0.1" value={sheetConfig.cropDist} onChange={e => set({ cropDist: +e.target.value })} className="w-full border rounded px-1 py-1 text-xs text-center" /></div>
                  <div><label className="text-[10px] text-gray-400 block text-center">Dầy (pt)</label><input type="number" step="0.05" value={sheetConfig.cropThick} onChange={e => set({ cropThick: +e.target.value })} className="w-full border rounded px-1 py-1 text-xs text-center" /></div>
                  <div><label className="text-[10px] text-gray-400 block text-center">Mậu</label><input type="color" value={sheetConfig.cropColor} onChange={e => set({ cropColor: e.target.value })} className="w-full h-8 border rounded cursor-pointer" /></div>
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <label className="text-xs font-bold text-gray-500 block mb-1">Số trang</label>
              <div className="flex gap-1.5">
                {([
                  { v: 'none', label: 'Tắt' },
                  { v: 'header', label: 'Trên (Header)' },
                  { v: 'footer', label: 'Dưới (Footer)' },
                ] as const).map(o => (
                  <button key={o.v} onClick={() => set({ pageNumber: o.v })}
                    className={`flex-1 px-2 py-1.5 text-xs rounded border ${(sheetConfig.pageNumber || 'none') === o.v ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Right: preview */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Preview</span>
            <div style={{ width: PREVIEW_W, height: previewH, background: '#f3f4f6', border: '1px solid #d1d5db', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              {cells.map((cell, i) => {
                const isRot90 = cell.rotate === 90 || cell.rotate === 270;
                const bw = isRot90 ? cell.h : cell.w;
                const bh = isRot90 ? cell.w : cell.h;
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: cell.x * scale,
                    top: cell.y * scale,
                    width: bw * scale,
                    height: bh * scale,
                    borderRadius: sheetConfig.shape === 'circle' ? '50%' : 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: cell.w * scale,
                      height: cell.h * scale,
                      background: '#6366f1', opacity: 0.7,
                      borderRadius: sheetConfig.shape === 'circle' ? '50%' : 2,
                      transform: `translate(${(bw - cell.w) / 2 * scale}px, ${(bh - cell.h) / 2 * scale}px) rotate(${cell.rotate}deg)`,
                      transformOrigin: 'center center',
                    }}/>
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-gray-400">{sheetConfig.width}×{sheetConfig.height}mm</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={() => {
            const EXT = 2; // mm extension beyond intersections
            const sw = sheetConfig.width, sh = sheetConfig.height;
            // Collect all unique horizontal and vertical line segments from cell bounding boxes
            const hLines = new Map<number, {min: number; max: number}[]>(); // y -> segments
            const vLines = new Map<number, {min: number; max: number}[]>(); // x -> segments
            const addH = (y: number, x1: number, x2: number) => {
              const k = Math.round(y * 100);
              if (!hLines.has(k)) hLines.set(k, []);
              hLines.get(k)!.push({ min: x1, max: x2 });
            };
            const addV = (x: number, y1: number, y2: number) => {
              const k = Math.round(x * 100);
              if (!vLines.has(k)) vLines.set(k, []);
              vLines.get(k)!.push({ min: y1, max: y2 });
            };
            for (const cell of cells) {
              const r90 = cell.rotate === 90 || cell.rotate === 270;
              const bw = r90 ? cell.h : cell.w;
              const bh = r90 ? cell.w : cell.h;
              const x1 = cell.x, x2 = cell.x + bw;
              const y1 = cell.y, y2 = cell.y + bh;
              addH(y1, x1, x2); addH(y2, x1, x2); // top & bottom
              addV(x1, y1, y2); addV(x2, y1, y2); // left & right
            }
            // Merge overlapping segments and extend by EXT at both ends (clamped to sheet)
            const mergeSegs = (segs: {min: number; max: number}[], limit: number) => {
              const sorted = segs.sort((a, b) => a.min - b.min);
              const merged: {min: number; max: number}[] = [];
              for (const s of sorted) {
                const last = merged[merged.length - 1];
                if (last && s.min <= last.max + 0.01) {
                  last.max = Math.max(last.max, s.max);
                } else {
                  merged.push({ ...s });
                }
              }
              return merged.map(s => ({
                min: Math.max(0, s.min - EXT),
                max: Math.min(limit, s.max + EXT),
              }));
            };
            let paths = '';
            hLines.forEach((segs, k) => {
              const y = k / 100;
              for (const s of mergeSegs(segs, sw))
                paths += `<line x1="${s.min}" y1="${y}" x2="${s.max}" y2="${y}"/>`;
            });
            vLines.forEach((segs, k) => {
              const x = k / 100;
              for (const s of mergeSegs(segs, sh))
                paths += `<line x1="${x}" y1="${s.min}" x2="${x}" y2="${s.max}"/>`;
            });
            const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sw}mm" height="${sh}mm" viewBox="0 0 ${sw} ${sh}">
<g fill="none" stroke="#FF0000" stroke-width="0.1">${paths}</g>
</svg>`;
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `die-cut-${sw}x${sh}mm.svg`;
            a.click();
            URL.revokeObjectURL(a.href);
          }} className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50">
            Tải SVG khuôn
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded text-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
};

const TB: React.FC<{ onClick?: () => void; active?: boolean; disabled?: boolean; title?: string; children: React.ReactNode }> = ({ onClick, active, disabled, title, children }) => (
  <button onClick={onClick} disabled={disabled} title={title}
    className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${active ? 'bg-violet-100 text-violet-700' : 'hover:bg-gray-100 text-gray-600'}`}>
    {children}
  </button>
);

export const LabelDesignerPage: React.FC<LabelDesignerPageProps> = ({ onClose }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [elements, setElements] = useState<ElementData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 50, y: 50 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  const [pageConfig, setPageConfig] = useState<PageConfig>({
    format: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
  });

  const [dataHeaders, setDataHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<SheetRow[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);

  const [history, setHistory] = useState<ElementData[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [leftTab, setLeftTab] = useState<'tools' | 'data' | 'media' | 'numbering'>('tools');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);
  const [savedNumberingSets, setSavedNumberingSets] = useState<Array<{id: string; name: string; data: any[]; formula: string; createdAt: number}>>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isPageConfigModalOpen, setIsPageConfigModalOpen] = useState(false);
  const [isSheetConfigModalOpen, setIsSheetConfigModalOpen] = useState(false);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>({
    format: 'A4', orientation: 'portrait', width: 210, height: 297,
    shape: 'rect', layoutMode: 'grid', marginTop: 5, marginLeft: 5, gapH: 3, gapV: 3,
    useCropMark: false, cropLen: 5, cropDist: 3, cropThick: 0.25, cropColor: '#000000',
    useSafeZone: false, safeZone: 3, pageNumber: 'none',
  });
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editingMediaName, setEditingMediaName] = useState('');

  // Workflow & Cloud Storage states
  const [workflows, setWorkflows] = useState<Array<{id: string; name: string; elements: ElementData[]; config: PageConfig; createdAt: number}>>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  const [availableFonts, setAvailableFonts] = useState<string[]>(['UTM Avo', 'UTM Agin', 'Tahoma', 'Arial']);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [qrImages, setQrImages] = useState<Map<string, HTMLImageElement>>(new Map());

  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(5);

  const [selectionMode, setSelectionMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const selectionStartRef = useRef<{x: number; y: number} | null>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{x: number; y: number; stageX: number; stageY: number} | null>(null);

  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [gotoRowInput, setGotoRowInput] = useState('');

  const currentRow = useMemo(() => dataRows[currentRowIndex] || {}, [dataRows, currentRowIndex]);

  useEffect(() => {
    const systemFonts = [
      'Tahoma', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New',
      'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald'
    ];
    fetch('/fonts/fonts.json')
      .then(r => r.json())
      .then((data: Array<{name: string; file: string}>) => {
        const fontNames = data.map(f => f.name).filter(Boolean);
        setAvailableFonts(Array.from(new Set([...systemFonts, ...fontNames])));
      })
      .catch(() => {
        fontService.getAvailableFonts().then(fonts => {
          if (fonts && fonts.length > 0) {
            const fontNames = fonts.map((f: any) => typeof f === 'string' ? f : f.name).filter(Boolean);
            setAvailableFonts(Array.from(new Set([...systemFonts, ...fontNames])));
          }
        });
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let isInitialLoad = true;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
        // Auto fit and center on initial load
        if (isInitialLoad) {
          isInitialLoad = false;
          const containerW = entry.contentRect.width;
          const containerH = entry.contentRect.height;
          const pageW = mmToPx(pageConfig.width);
          const pageH = mmToPx(pageConfig.height);
          const fitZoom = Math.min((containerW - CONTAINER_PADDING) / pageW, (containerH - CONTAINER_PADDING) / pageH);
          setZoom(fitZoom);
          // Center the page
          const centeredX = (containerW - pageW * fitZoom) / 2;
          const centeredY = (containerH - pageH * fitZoom) / 2;
          setStagePos({ x: centeredX, y: centeredY });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pageConfig.width, pageConfig.height]);

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    const selectedNodes = selectedIds
      .map(id => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    transformerRef.current.nodes(selectedNodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  useEffect(() => {
    let isMounted = true;
    
    // Load images from elements (fallback images)
    elements.forEach(el => {
      if ((el.type === 'image' || el.type === 'img-data') && el.src && !loadedImages.has(el.src)) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (isMounted) {
            setLoadedImages(prev => new Map(prev).set(el.src!, img));
          }
        };
        img.onerror = () => {
          console.error('Failed to load image:', el.src);
        };
        img.src = el.src;
      }
    });
    
    // Load images from uploadedImages (for img-data matching)
    uploadedImages.forEach(uploaded => {
      if (uploaded.src && !loadedImages.has(uploaded.src)) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (isMounted) {
            setLoadedImages(prev => new Map(prev).set(uploaded.src, img));
          }
        };
        img.onerror = () => {
          console.error('Failed to load uploaded image:', uploaded.name);
        };
        img.src = uploaded.src;
      }
    });
    
    // Load URL images from img-data elements with dataType='url'
    elements.forEach(el => {
      if (el.type === 'img-data' && el.dataType === 'url' && el.content) {
        const value = el.content.replace(/\{([^}]+)\}/g, (_, key) => {
          const row = dataRows[currentRowIndex];
          return row ? (row[key] || '') : '';
        });
        if (value && !value.includes('{') && value.startsWith('http') && !loadedImages.has(value)) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { if (isMounted) setLoadedImages(prev => new Map(prev).set(value, img)); };
          img.src = value;
        }
      }
    });
    
    return () => { isMounted = false; };
  }, [elements, uploadedImages, loadedImages, dataRows, currentRowIndex]);

  useEffect(() => {
    if (pageConfig.backgroundSrc) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setBackgroundImage(img);
      img.src = pageConfig.backgroundSrc;
    } else {
      setBackgroundImage(null);
    }
  }, [pageConfig.backgroundSrc]);

  const replaceVariables = useCallback((text: string): string => {
    if (!text) return '';
    return text.replace(/\{([^}]+)\}/g, (_, key) => currentRow[key] || `{${key}}`);
  }, [currentRow]);

  const generateVietQRContent = useCallback((el: ElementData): string => {
    if (el.qrTemplate !== 'vietqr' || !el.bankCode) return el.content;
    const bank = VIETNAM_BANKS.find(b => b.code === el.bankCode);
    if (!bank) return el.content;
    const accountNo = replaceVariables(el.accountNo || '');
    const amount = replaceVariables(el.amount || '');
    const memo = replaceVariables(el.memo || '');
    const style = el.vietqrStyle || 'compact';
    const amountStr = amount ? `&amount=${amount}` : '';
    const memoStr = memo ? `&addInfo=${encodeURIComponent(memo)}` : '';
    return `https://img.vietqr.io/image/${bank.bin}-${accountNo}-${style}.png?accountName=${encodeURIComponent(el.accountName || '')}${amountStr}${memoStr}`;
  }, [replaceVariables]);

  // Clear QR cache when data row changes so QR re-generates with new variables
  const qrCacheVersion = useRef(0);
  useEffect(() => {
    qrCacheVersion.current += 1;
    setQrImages(new Map());
  }, [currentRowIndex, dataRows]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    elements.forEach(async el => {
      if (el.type === 'qr' && !qrImages.has(el.id)) {
        try {
          if (el.qrTemplate === 'vietqr' && el.bankCode && el.accountNo) {
            const vietQRUrl = generateVietQRContent(el);
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (isMounted && !abortController.signal.aborted) {
                setQrImages(prev => new Map(prev).set(el.id, img));
              }
            };
            img.onerror = async () => {
              if (!isMounted || abortController.signal.aborted) return;
              try {
                const content = replaceVariables(el.content || 'VietQR');
                const dataUrl = await generateQRCodeDataUrl(content);
                const fallbackImg = new window.Image();
                fallbackImg.onload = () => {
                  if (isMounted && !abortController.signal.aborted) {
                    setQrImages(prev => new Map(prev).set(el.id, fallbackImg));
                  }
                };
                fallbackImg.src = dataUrl;
              } catch (err) {
                console.error('QR fallback generation error:', err);
              }
            };
            img.src = vietQRUrl;
          } else {
            const content = replaceVariables(el.content);
            const dataUrl = await generateQRCodeDataUrl(content);
            if (!isMounted || abortController.signal.aborted) return;
            const img = new window.Image();
            img.onload = () => {
              if (isMounted && !abortController.signal.aborted) {
                setQrImages(prev => new Map(prev).set(el.id, img));
              }
            };
            img.src = dataUrl;
          }
        } catch (err) {
          console.error('QR generation error:', err);
        }
      }
      if (el.type === 'barcode' && !qrImages.has(el.id)) {
        const content = replaceVariables(el.content);
        const showText = el.barcodeShowText !== false;
        const format = el.barcodeFormat || 'CODE128';
        try {
          const dataUrl = generateBarcodeDataUrl(content, 150, 50, showText, format);
          if (!isMounted || abortController.signal.aborted) return;
          const img = new window.Image();
          img.onload = () => {
            if (isMounted && !abortController.signal.aborted) {
              setQrImages(prev => new Map(prev).set(el.id, img));
            }
          };
          img.onerror = () => {
            console.error('Barcode image load error for:', el.id);
            // Try fallback with CODE128
            try {
              const fallbackUrl = generateBarcodeDataUrl(content || '123456', 150, 50, showText, 'CODE128');
              const fallbackImg = new window.Image();
              fallbackImg.onload = () => {
                if (isMounted && !abortController.signal.aborted) {
                  setQrImages(prev => new Map(prev).set(el.id, fallbackImg));
                }
              };
              fallbackImg.src = fallbackUrl;
            } catch (e) {
              console.error('Barcode fallback error:', e);
            }
          };
          img.src = dataUrl;
        } catch (err) {
          console.error('Barcode generation error:', err);
        }
      }
    });
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [elements, currentRow, generateVietQRContent, replaceVariables]);

  const saveToHistory = useCallback((newElements: ElementData[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setElements(history[historyStep - 1]);
    }
  }, [history, historyStep]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setElements(history[historyStep + 1]);
    }
  }, [history, historyStep]);

  // Workflow Management Functions
  const saveWorkflow = useCallback(async () => {
    if (!(workflowName || '').trim()) return;
    
    const workflow = {
      id: currentWorkflowId || `wf_${Date.now()}`,
      name: workflowName,
      elements,
      config: pageConfig,
      createdAt: Date.now()
    };

    try {
      // Save to cloud storage
      const blob = new Blob([JSON.stringify(workflow)], { type: 'application/json' });
      const file = new File([blob], `${workflow.name}.json`, { type: 'application/json' });
      const path = `label-designer/${workflow.id}.json`;
      
      await storageApi.upload('files', path, file);
      const url = storageApi.getPublicUrl('files', path);
      
      // Upsert: update existing record or create new
      const { data: existing } = await filesApi.getAll();
      const existingFile = existing?.find((f: any) => f.metadata?.workflowId === workflow.id);
      if (existingFile) {
        await supabase.from('files').update({ name: workflow.name, url, size: blob.size, metadata: { category: 'label-designer', workflowId: workflow.id } }).eq('id', existingFile.id);
      } else {
        await filesApi.create({
          name: workflow.name,
          type: 'workflow',
          url,
          size: blob.size,
          metadata: { category: 'label-designer', workflowId: workflow.id }
        });
      }

      setWorkflows(prev => {
        const existing = prev.findIndex(w => w.id === workflow.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = workflow;
          return updated;
        }
        return [...prev, workflow];
      });
      
      setCurrentWorkflowId(workflow.id);
      setIsWorkflowModalOpen(false);
      setWorkflowName('');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Lỗi khi lưu workflow');
    }
  }, [workflowName, elements, pageConfig, currentWorkflowId]);

  const loadWorkflow = useCallback(async (workflowId: string) => {
    try {
      const { data } = await filesApi.getAll();
      const file = data?.find((f: any) => f.metadata?.workflowId === workflowId);
      if (!file) return;

      const response = await fetch(file.url);
      const workflow = await response.json();
      
      setElements(workflow.elements || []);
      setPageConfig(workflow.config || pageConfig);
      setCurrentWorkflowId(workflow.id);
      setWorkflowName(workflow.name || '');
    } catch (error) {
      console.error('Failed to load workflow:', error);
      alert('Lỗi khi tải workflow');
    }
  }, [pageConfig]);

  const deleteWorkflow = useCallback(async (workflowId: string) => {
    if (!window.confirm('Xóa workflow này?')) return;
    
    try {
      const { data } = await filesApi.getAll();
      const file = data?.find((f: any) => f.metadata?.workflowId === workflowId);
      if (file) {
        await filesApi.delete(file.id);
        await storageApi.delete('files', `label-designer/${workflowId}.json`);
      }
      
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      if (currentWorkflowId === workflowId) {
        setCurrentWorkflowId(null);
        setWorkflowName('');
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      alert('Lỗi khi xóa workflow');
    }
  }, [currentWorkflowId]);

  const loadWorkflowsList = useCallback(async () => {
    try {
      const { data } = await filesApi.getAll();
      const workflowFiles = data?.filter((f: any) => f.metadata?.category === 'label-designer') || [];
      
      const loadedWorkflows = await Promise.all(
        workflowFiles.map(async (file: any) => {
          try {
            const response = await fetch(file.url);
            if (!response.ok) return null;
            return await response.json();
          } catch {
            return null;
          }
        })
      );
      
      setWorkflows(loadedWorkflows.filter(w => w && w.id && w.name));
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  }, []);

  useEffect(() => {
    loadWorkflowsList();
  }, [loadWorkflowsList]);

  const addElement = useCallback((type: ElementType) => {
    const newElement: ElementData = {
      id: generateId(),
      type,
      x: 20,
      y: 20,
      width: type === 'text' ? 80 : 50,
      height: type === 'text' ? 20 : 50,
      content: type === 'text' ? 'Text mới' : type === 'qr' ? 'QR Code' : type === 'barcode' ? '123456789' : '',
      fontFamily: 'UTM Avo',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      backgroundColor: type === 'box' ? '#e5e7eb' : 'transparent',
      borderColor: '#000000',
      borderWidth: type === 'box' ? 1 : 0,
      textAlignH: 'left',
      textAlignV: 'top',
      rotate: 0,
      opacity: 1,
      isLocked: false,
      isVisible: true,
      ...(type === 'img-data' && {
        dataType: 'filename',
        matchMode: 'contains',
        ignoreExtension: false,
        bidirectional: false
      })
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedIds([newElement.id]);
  }, [elements, saveToHistory]);

  const HISTORY_DEBOUNCE_MS = 300;
  const CONTAINER_PADDING = 100;
  const ZOOM_FACTOR = 1.1;
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const MIN_ELEMENT_SIZE = 5;

  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<ElementData>) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
    setElements(newElements);
    // Debounced history save to avoid flooding history on every keystroke
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      saveToHistory(newElements);
    }, HISTORY_DEBOUNCE_MS);
  }, [elements, saveToHistory]);

  const deleteSelected = useCallback(() => {
    const newElements = elements.filter(el => !selectedIds.includes(el.id));
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedIds([]);
  }, [elements, selectedIds, saveToHistory]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deselect when clicking on stage background or page background
    const isPageBg = e.target.getClassName() === 'Rect' && e.target.fill() === 'white';
    if (e.target === e.target.getStage() || isPageBg) {
      setSelectedIds([]);
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    
    // Check if clicking on page background (white Rect) or stage itself
    const target = e.target;
    const isPageBackground = target.getClassName() === 'Rect' && target.fill() === 'white';
    const isStageBackground = target === stage;
    
    // Only start if clicking on empty area (stage or page background)
    if (!isStageBackground && !isPageBackground) return;
    
    if (selectionMode) {
      // Selection mode: draw selection rectangle
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      setIsSelecting(true);
      selectionStartRef.current = { x: pos.x, y: pos.y };
      setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    } else {
      // Normal mode: pan the canvas
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setIsPanning(true);
      panStartRef.current = { x: pointer.x, y: pointer.y, stageX: stagePos.x, stageY: stagePos.y };
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    
    // Handle selection rectangle
    if (isSelecting && selectionStartRef.current) {
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      
      const start = selectionStartRef.current;
      const x = Math.min(start.x, pos.x);
      const y = Math.min(start.y, pos.y);
      const width = Math.abs(pos.x - start.x);
      const height = Math.abs(pos.y - start.y);
      
      setSelectionRect({ x, y, width, height });
      return;
    }
    
    // Handle panning
    if (isPanning && panStartRef.current) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      const dx = pointer.x - panStartRef.current.x;
      const dy = pointer.y - panStartRef.current.y;
      
      setStagePos({
        x: panStartRef.current.stageX + dx,
        y: panStartRef.current.stageY + dy
      });
    }
  };

  const handleMouseUp = () => {
    // Handle selection end
    if (isSelecting && selectionRect) {
      const rectX1 = pxToMm(selectionRect.x);
      const rectY1 = pxToMm(selectionRect.y);
      const rectX2 = pxToMm(selectionRect.x + selectionRect.width);
      const rectY2 = pxToMm(selectionRect.y + selectionRect.height);
      
      const intersecting = elements.filter(el => {
        // For rotated elements, check center point intersection as approximation
        if (el.rotate && el.rotate !== 0) {
          const centerX = el.x + el.width / 2;
          const centerY = el.y + el.height / 2;
          return centerX >= rectX1 && centerX <= rectX2 && centerY >= rectY1 && centerY <= rectY2;
        }
        
        // Standard AABB intersection for non-rotated elements
        const elX1 = el.x;
        const elY1 = el.y;
        const elX2 = el.x + el.width;
        const elY2 = el.y + el.height;
        
        return !(elX2 < rectX1 || elX1 > rectX2 || elY2 < rectY1 || elY1 > rectY2);
      });
      
      setSelectedIds(intersecting.map(el => el.id));
    }
    
    // Reset all states
    setIsSelecting(false);
    selectionStartRef.current = null;
    setSelectionRect(null);
    setIsPanning(false);
    panStartRef.current = null;
  };

  const snapValue = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    const x = snapValue(pxToMm(node.x()));
    const y = snapValue(pxToMm(node.y()));
    node.x(mmToPx(x));
    node.y(mmToPx(y));
    const newEls = elements.map(el => el.id === id ? { ...el, x, y } : el);
    setElements(newEls);
    saveToHistory(newEls);
  }, [elements, saveToHistory, snapValue]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    const x = snapValue(pxToMm(node.x()));
    const y = snapValue(pxToMm(node.y()));
    const width = snapValue(pxToMm(node.width() * scaleX));
    const height = snapValue(pxToMm(node.height() * scaleY));
    
    const newEls = elements.map(el => el.id === id ? { ...el, x, y, width, height, rotate: node.rotation() } : el);
    setElements(newEls);
    saveToHistory(newEls);
    
    // Force node update after state change
    requestAnimationFrame(() => {
      node.scaleX(1);
      node.scaleY(1);
      node.x(mmToPx(x));
      node.y(mmToPx(y));
      node.width(mmToPx(width));
      node.height(mmToPx(height));
      node.getLayer()?.batchDraw();
    });
  }, [elements, saveToHistory, snapValue]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    // Hold Ctrl/Cmd to zoom, otherwise pan
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const newZoom = e.evt.deltaY < 0 ? zoom * ZOOM_FACTOR : zoom / ZOOM_FACTOR;
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom)));
    } else {
      // Pan with scroll wheel
      setStagePos(prev => ({
        x: prev.x - e.evt.deltaX,
        y: prev.y - e.evt.deltaY
      }));
    }
  };

  const handleDataFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      setDataHeaders(headers);
      setDataRows(rows);
      setCurrentRowIndex(0);
    } else {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: '' });
      if (json.length > 0) {
        setDataHeaders(Object.keys(json[0]));
        setDataRows(json.map(row => {
          const newRow: SheetRow = {};
          Object.entries(row).forEach(([k, v]) => {
            newRow[k] = String(v);
          });
          return newRow;
        }));
        setCurrentRowIndex(0);
      }
    }
  };

  const updateDataCell = (rowIdx: number, header: string, value: string) => {
    setDataRows(prev => prev.map((row, i) => 
      i === rowIdx ? { ...row, [header]: value } : row
    ));
  };

  const addDataRow = () => {
    const newRow: SheetRow = {};
    dataHeaders.forEach(h => newRow[h] = '');
    setDataRows(prev => [...prev, newRow]);
  };

  const deleteDataRow = (idx: number) => {
    setDataRows(prev => prev.filter((_, i) => i !== idx));
    if (currentRowIndex >= dataRows.length - 1) {
      setCurrentRowIndex(Math.max(0, dataRows.length - 2));
    }
  };

  const addDataColumn = () => {
    const newCol = `Col_${dataHeaders.length + 1}`;
    setDataHeaders(prev => [...prev, newCol]);
    setDataRows(prev => prev.map(row => ({ ...row, [newCol]: '' })));
  };

  const handleGoogleSheetImport = async () => {
    if (!(googleSheetUrl || '').trim()) return;
    setIsLoadingSheet(true);
    try {
      let sheetId = '';
      const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        sheetId = match[1];
      } else {
        throw new Error('URL Google Sheets không hợp lệ');
      }
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Không thể tải Google Sheet. Kiểm tra quyền chia sẻ công khai.');
      }
      const text = await response.text();
      const { headers, rows } = parseCSV(text);
      if (headers.length > 0) {
        setDataHeaders(headers);
        setDataRows(rows);
        setCurrentRowIndex(0);
        setGoogleSheetUrl('');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Google Sheets import error:', errorMessage);
      alert('Lỗi: ' + errorMessage);
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleExportCSV = () => {
    if (dataHeaders.length === 0 || dataRows.length === 0) return;
    const csvContent = [
      dataHeaders.join(','),
      ...dataRows.map(row => dataHeaders.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGotoRow = () => {
    const rowNum = parseInt(gotoRowInput);
    if (!isNaN(rowNum) && rowNum >= 1 && rowNum <= dataRows.length) {
      setCurrentRowIndex(rowNum - 1);
      setGotoRowInput('');
    }
  };

  const deleteMedia = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
    setSelectedMediaIds(prev => prev.filter(sid => sid !== id));
  };

  const deleteSelectedMedia = () => {
    if (selectedMediaIds.length === 0) return;
    if (!window.confirm(`Xóa ${selectedMediaIds.length} ảnh đã chọn?`)) return;
    setUploadedImages(prev => prev.filter(img => !selectedMediaIds.includes(img.id)));
    setSelectedMediaIds([]);
  };

  const moveMediaUp = (id: string) => {
    setUploadedImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx <= 0) return prev;
      const newArr = [...prev];
      [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
      return newArr;
    });
  };

  const moveMediaDown = (id: string) => {
    setUploadedImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const newArr = [...prev];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      return newArr;
    });
  };

  const handleImageDragStart = (e: React.DragEvent, imgId: string) => {
    setDraggedImageId(imgId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleImageDragOver = (e: React.DragEvent, imgId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedImageId && draggedImageId !== imgId) {
      setDragOverImageId(imgId);
    }
  };

  const handleImageDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedImageId || draggedImageId === targetId) return;
    
    setUploadedImages(prev => {
      const draggedIdx = prev.findIndex(img => img.id === draggedImageId);
      const targetIdx = prev.findIndex(img => img.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      const newArr = [...prev];
      const [draggedItem] = newArr.splice(draggedIdx, 1);
      newArr.splice(targetIdx, 0, draggedItem);
      return newArr;
    });
    
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    
    // Simulate file input change
    const input = imageInputRef.current;
    if (!input) return;
    
    const dataTransfer = new DataTransfer();
    files.forEach(f => dataTransfer.items.add(f));
    input.files = dataTransfer.files;
    
    handleImageUpload({ target: input } as any);
  };

  const filteredImages = uploadedImages.filter(img => 
    mediaSearch ? img.name.toLowerCase().includes(mediaSearch.toLowerCase()) : true
  );

  const renameMedia = (id: string, newName: string) => {
    setUploadedImages(prev => prev.map(img => 
      img.id === id ? { ...img, name: newName } : img
    ));
    setEditingMediaId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        console.warn(`Skipped ${file.name}: Invalid type ${file.type}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`Skipped ${file.name}: Too large (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) {
      alert('Không có file hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, GIF, WebP, SVG dưới 10MB.');
      return;
    }
    
    try {
      const loadPromises = validFiles.map(file => {
        return new Promise<UploadedImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target?.result as string;
            resolve({ 
              id: generateId(), 
              name: file.name, 
              src,
              size: file.size,
              type: file.type
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });
      });
      
      const newImages = await Promise.all(loadPromises);
      setUploadedImages(prev => [...prev, ...newImages]);
      
      if (validFiles.length < fileArray.length) {
        alert(`Đã tải ${validFiles.length}/${fileArray.length} ảnh. Một số file bị bỏ qua (xem console).`);
      }
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Lỗi khi tải ảnh: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      // Reset input để có thể upload lại cùng file
      if (e.target) e.target.value = '';
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const src = canvas.toDataURL('image/png');
          setPageConfig(prev => ({ ...prev, backgroundSrc: src, backgroundFit: prev.backgroundFit || 'cover' }));
        }
      } catch (err) {
        console.error('PDF load error:', err);
        alert('Không thể đọc file PDF');
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setPageConfig(prev => ({ ...prev, backgroundSrc: src, backgroundFit: prev.backgroundFit || 'cover' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getBackgroundImageProps = useCallback(() => {
    if (!backgroundImage) return null;
    const pageW = mmToPx(pageConfig.width);
    const pageH = mmToPx(pageConfig.height);
    const imgW = backgroundImage.width;
    const imgH = backgroundImage.height;
    const fit = pageConfig.backgroundFit || 'cover';

    let width = pageW, height = pageH, x = 0, y = 0;

    if (fit === 'stretch') {
      width = pageW;
      height = pageH;
    } else if (fit === 'fill') {
      width = pageW;
      height = pageH;
    } else if (fit === 'contain') {
      const scale = Math.min(pageW / imgW, pageH / imgH);
      width = imgW * scale;
      height = imgH * scale;
      x = (pageW - width) / 2;
      y = (pageH - height) / 2;
    } else if (fit === 'cover') {
      const scale = Math.max(pageW / imgW, pageH / imgH);
      width = imgW * scale;
      height = imgH * scale;
      x = (pageW - width) / 2;
      y = (pageH - height) / 2;
    }

    return { x, y, width, height };
  }, [backgroundImage, pageConfig.width, pageConfig.height, pageConfig.backgroundFit]);

  const handleExportPDF = async () => {
    if (!stageRef.current) return;
    setIsLoading(true);
    try {
      const rowsToExport = dataRows.length > 0 ? dataRows : [{}];
      
      const pages: KonvaElement[][] = rowsToExport.map((row) => {
        const replaceVarsForRow = (text: string): string => {
          if (!text) return '';
          return text.replace(/\{([^}]+)\}/g, (_, key) => row[key] || `{${key}}`);
        };
        
        return elements.map(el => {
          let imgSrc = el.src;
          if (el.type === 'img-data' && el.content) {
            const value = replaceVarsForRow(el.content);
            let found: UploadedImage | undefined;
            
            const dataType = el.dataType || 'filename';
            
            if (dataType === 'number') {
              const idx = parseInt(value) - 1;
              if (!isNaN(idx) && idx >= 0 && idx < uploadedImages.length) {
                found = uploadedImages[idx];
              }
            } else {
              const matchMode = el.matchMode || 'contains';
              const ignoreExt = el.ignoreExtension || false;
              const isBidirectional = el.bidirectional || false;
              
              found = uploadedImages.find(img => {
                let imgName = img.name;
                let searchValue = value;
                
                if (ignoreExt) {
                  imgName = imgName.replace(/\.[^.]+$/, '');
                  searchValue = searchValue.replace(/\.[^.]+$/, '');
                }
                
                const nameLower = imgName.toLowerCase();
                const valueLower = searchValue.toLowerCase();
                
                if (matchMode === 'exact') return imgName === searchValue;
                if (matchMode === 'startsWith') {
                  if (isBidirectional) {
                    return nameLower.startsWith(valueLower) || valueLower.startsWith(nameLower);
                  }
                  return nameLower.startsWith(valueLower);
                }
                if (matchMode === 'endsWith') {
                  if (isBidirectional) {
                    return nameLower.endsWith(valueLower) || valueLower.endsWith(nameLower);
                  }
                  return nameLower.endsWith(valueLower);
                }
                return nameLower.includes(valueLower);
              });
            }
            
            if (found) imgSrc = found.src;
          }
          
          // URL mode: use data value directly as image URL
          if ((el.dataType || 'filename') === 'url') {
            const urlValue = replaceVarsForRow(el.content);
            if (urlValue && !urlValue.includes('{')) imgSrc = urlValue;
          }
          
          let vietQRImageUrl: string | undefined;
          if (el.type === 'qr' && el.qrTemplate === 'vietqr' && el.bankCode && el.accountNo) {
            const bank = VIETNAM_BANKS.find(b => b.code === el.bankCode);
            if (bank) {
              const accountNo = replaceVarsForRow(el.accountNo || '');
              const amount = replaceVarsForRow(el.amount || '');
              const memo = replaceVarsForRow(el.memo || '');
              const amountStr = amount ? `&amount=${encodeURIComponent(amount)}` : '';
              const memoStr = memo ? `&addInfo=${encodeURIComponent(memo)}` : '';
              const style = el.vietqrStyle || 'compact';
              vietQRImageUrl = `https://img.vietqr.io/image/${bank.bin}-${accountNo}-${style}.png?accountName=${encodeURIComponent(el.accountName || '')}${amountStr}${memoStr}`;
            }
          }
          
          return {
            id: el.id,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            content: replaceVarsForRow(el.content),
            src: imgSrc,
            fontFamily: el.fontFamily,
            fontSize: el.fontSize,
            fontWeight: el.fontWeight,
            fontStyle: el.fontStyle,
            color: el.color,
            backgroundColor: el.backgroundColor,
            borderColor: el.borderColor,
            borderWidth: el.borderWidth,
            rotate: el.rotate,
            textAlignH: el.textAlignH,
            textAlignV: el.textAlignV,
            qrTemplate: el.qrTemplate,
            vietQRImageUrl,
          };
        });
      });
      
      // Preload all fonts into browser before PDF export
      const usedFonts = Array.from(new Set(elements.filter(e => e.type === 'text' && e.fontFamily).map(e => e.fontFamily!)));
      await Promise.allSettled(usedFonts.map(f => loadBrowserFont(f)));

      const useSheet = sheetConfig.width > 0 && sheetConfig.height > 0;
      const pdfBytes = useSheet
        ? await exportKonvaToSheetPdf({
            pageWidthMm: pageConfig.width,
            pageHeightMm: pageConfig.height,
            sheetWidthMm: sheetConfig.width,
            sheetHeightMm: sheetConfig.height,
            shape: sheetConfig.shape,
            layoutMode: sheetConfig.layoutMode || 'grid',
            marginTopMm: sheetConfig.marginTop,
            marginLeftMm: sheetConfig.marginLeft,
            gapHMm: sheetConfig.gapH,
            gapVMm: sheetConfig.gapV,
            useCropMark: sheetConfig.useCropMark,
            cropLenMm: sheetConfig.cropLen,
            cropDistMm: sheetConfig.cropDist,
            cropThickPt: sheetConfig.cropThick,
            cropColor: sheetConfig.cropColor,
            pageNumber: sheetConfig.pageNumber || 'none',
            pages,
            background: pageConfig.backgroundSrc ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' } : undefined,
          })
        : await exportKonvaToPdfMultiPage({
            pageWidthMm: pageConfig.width,
            pageHeightMm: pageConfig.height,
            pages,
            background: pageConfig.backgroundSrc ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' } : undefined,
          });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = useSheet ? `sheet_${sheetConfig.width}x${sheetConfig.height}mm.pdf` : `labels_${dataRows.length || 1}_pages.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Lỗi xuất PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFileManager = async () => {
    if (!stageRef.current) return;
    setIsLoading(true);
    try {
      const rowsToExport = dataRows.length > 0 ? dataRows : [{}];
      const pages: KonvaElement[][] = rowsToExport.map((row) => {
        const replaceVarsForRow = (text: string): string => {
          if (!text) return '';
          return text.replace(/\{([^}]+)\}/g, (_, key) => row[key] || `{${key}}`);
        };
        return elements.filter(el => el.isVisible !== false).map(el => ({
          id: el.id, type: el.type, x: el.x, y: el.y, width: el.width, height: el.height,
          content: replaceVarsForRow(el.content || ''), fontFamily: el.fontFamily, fontSize: el.fontSize,
          fontWeight: el.fontWeight, fontStyle: el.fontStyle, textDecoration: el.textDecoration,
          color: el.color, backgroundColor: el.backgroundColor, borderColor: el.borderColor,
          borderWidth: el.borderWidth, borderRadius: el.borderRadius, textAlignH: el.textAlignH,
          textAlignV: el.textAlignV, rotate: el.rotate, opacity: el.opacity, src: el.src,
          objectFit: el.objectFit, stroke: el.stroke, strokeWidth: el.strokeWidth,
        }));
      });

      const usedFonts = Array.from(new Set(elements.filter(e => e.type === 'text' && e.fontFamily).map(e => e.fontFamily!)));
      await Promise.allSettled(usedFonts.map(f => loadBrowserFont(f)));

      const useSheet = sheetConfig.width > 0 && sheetConfig.height > 0;
      const pdfBytes = useSheet
        ? await exportKonvaToSheetPdf({
            pageWidthMm: pageConfig.width, pageHeightMm: pageConfig.height,
            sheetWidthMm: sheetConfig.width, sheetHeightMm: sheetConfig.height,
            shape: sheetConfig.shape, layoutMode: sheetConfig.layoutMode || 'grid',
            marginTopMm: sheetConfig.marginTop, marginLeftMm: sheetConfig.marginLeft,
            gapHMm: sheetConfig.gapH, gapVMm: sheetConfig.gapV,
            useCropMark: sheetConfig.useCropMark, cropLenMm: sheetConfig.cropLen,
            cropDistMm: sheetConfig.cropDist, cropThickPt: sheetConfig.cropThick,
            cropColor: sheetConfig.cropColor, pageNumber: sheetConfig.pageNumber || 'none',
            pages,
            background: pageConfig.backgroundSrc ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' } : undefined,
          })
        : await exportKonvaToPdfMultiPage({
            pageWidthMm: pageConfig.width, pageHeightMm: pageConfig.height, pages,
            background: pageConfig.backgroundSrc ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' } : undefined,
          });

      const fileName = `label_${Date.now()}.pdf`;
      const pdfFile = new File([pdfBytes], fileName, { type: 'application/pdf' });
      await fileService.uploadFile(pdfFile, 'PDF');
      alert('Đã lưu PDF vào Quản lý tệp!');
    } catch (err) {
      console.error('Save to file manager error:', err);
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setElements([]);
    setSelectedIds([]);
    saveToHistory([]);
  };

  const handleSaveProject = () => {
    const project = {
      elements, pageConfig, sheetConfig,
      dataHeaders, dataRows, uploadedImages,
    };
    localStorage.setItem('labelDesigner_project', JSON.stringify(project));
    alert('Dự án đã được lưu!');
  };

  const handleLoadProject = () => {
    const raw = localStorage.getItem('labelDesigner_project');
    if (!raw) { alert('Không tìm thấy dự án đã lưu.'); return; }
    try {
      const p = JSON.parse(raw);
      if (p.elements) { 
        // Migrate old img-data elements to have default values
        const migratedElements = p.elements.map((el: ElementData) => {
          if (el.type === 'img-data' && !el.dataType) {
            return {
              ...el,
              dataType: 'filename',
              matchMode: el.matchMode || 'contains',
              ignoreExtension: el.ignoreExtension || false,
              bidirectional: el.bidirectional || false
            };
          }
          return el;
        });
        setElements(migratedElements); 
        saveToHistory(migratedElements); 
      }
      if (p.pageConfig) setPageConfig(p.pageConfig);
      if (p.sheetConfig) setSheetConfig(p.sheetConfig);
      if (p.dataHeaders) setDataHeaders(p.dataHeaders);
      if (p.dataRows) { setDataRows(p.dataRows); setCurrentRowIndex(0); }
      if (p.uploadedImages) setUploadedImages(p.uploadedImages);
      setSelectedIds([]);
    } catch { alert('File lưu bị lỗi.'); }
  };

  const handleZoomFit = () => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const pageW = mmToPx(pageConfig.width);
    const pageH = mmToPx(pageConfig.height);
    const fitZoom = Math.min((containerW - CONTAINER_PADDING) / pageW, (containerH - CONTAINER_PADDING) / pageH);
    setZoom(fitZoom);
    // Center the page in the canvas
    const centeredX = (containerW - pageW * fitZoom) / 2;
    const centeredY = (containerH - pageH * fitZoom) / 2;
    setStagePos({ x: centeredX, y: centeredY });
  };

  const alignElements = useCallback((direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.length === 0) return;
    const selectedEls = elements.filter(el => selectedIds.includes(el.id));
    if (selectedEls.length === 0) return;
    
    let newElements = [...elements];
    
    // Single element: align to page
    if (selectedIds.length === 1) {
      const el = selectedEls[0];
      if (direction === 'left') {
        newElements = newElements.map(e => e.id === el.id ? { ...e, x: 0 } : e);
      } else if (direction === 'center') {
        newElements = newElements.map(e => e.id === el.id ? { ...e, x: (pageConfig.width - el.width) / 2 } : e);
      } else if (direction === 'right') {
        newElements = newElements.map(e => e.id === el.id ? { ...e, x: pageConfig.width - el.width } : e);
      } else if (direction === 'top') {
        newElements = newElements.map(e => e.id === el.id ? { ...e, y: 0 } : e);
      } else if (direction === 'middle') {
        newElements = newElements.map(e => e.id === el.id ? { ...e, y: (pageConfig.height - el.height) / 2 } : e);
      } else if (direction === 'bottom') {
        newElements = newElements.map(e => e.id === el.id ? { ...e, y: pageConfig.height - el.height } : e);
      }
    } else {
      // Multiple elements: align to each other
      if (direction === 'left') {
        const minX = Math.min(...selectedEls.map(el => el.x));
        newElements = newElements.map(el => 
          selectedIds.includes(el.id) ? { ...el, x: minX } : el
        );
      } else if (direction === 'center') {
        const minX = Math.min(...selectedEls.map(el => el.x));
        const maxX = Math.max(...selectedEls.map(el => el.x + el.width));
        const centerX = (minX + maxX) / 2;
        newElements = newElements.map(el => 
          selectedIds.includes(el.id) ? { ...el, x: centerX - el.width / 2 } : el
        );
      } else if (direction === 'right') {
        const maxX = Math.max(...selectedEls.map(el => el.x + el.width));
        newElements = newElements.map(el => 
          selectedIds.includes(el.id) ? { ...el, x: maxX - el.width } : el
        );
      } else if (direction === 'top') {
        const minY = Math.min(...selectedEls.map(el => el.y));
        newElements = newElements.map(el => 
          selectedIds.includes(el.id) ? { ...el, y: minY } : el
        );
      } else if (direction === 'middle') {
        const minY = Math.min(...selectedEls.map(el => el.y));
        const maxY = Math.max(...selectedEls.map(el => el.y + el.height));
        const centerY = (minY + maxY) / 2;
        newElements = newElements.map(el => 
          selectedIds.includes(el.id) ? { ...el, y: centerY - el.height / 2 } : el
        );
      } else if (direction === 'bottom') {
        const maxY = Math.max(...selectedEls.map(el => el.y + el.height));
        newElements = newElements.map(el => 
          selectedIds.includes(el.id) ? { ...el, y: maxY - el.height } : el
        );
      }
    }
    
    setElements(newElements);
    saveToHistory(newElements);
  }, [elements, selectedIds, saveToHistory, pageConfig.width, pageConfig.height]);

  const distributeElements = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedIds.length < 3) return;
    const selectedEls = elements.filter(el => selectedIds.includes(el.id));
    if (selectedEls.length < 3) return;
    
    let newElements = [...elements];
    
    if (direction === 'horizontal') {
      const sorted = [...selectedEls].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = (last.x + last.width) - first.x;
      const totalElementWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const totalGap = totalSpan - totalElementWidth;
      const gapBetween = totalGap / (sorted.length - 1);
      
      let currentX = first.x;
      sorted.forEach((el, i) => {
        if (i === 0) {
          currentX += el.width + gapBetween;
        } else if (i < sorted.length - 1) {
          newElements = newElements.map(e => e.id === el.id ? { ...e, x: currentX } : e);
          currentX += el.width + gapBetween;
        }
      });
    } else {
      const sorted = [...selectedEls].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = (last.y + last.height) - first.y;
      const totalElementHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const totalGap = totalSpan - totalElementHeight;
      const gapBetween = totalGap / (sorted.length - 1);
      
      let currentY = first.y;
      sorted.forEach((el, i) => {
        if (i === 0) {
          currentY += el.height + gapBetween;
        } else if (i < sorted.length - 1) {
          newElements = newElements.map(e => e.id === el.id ? { ...e, y: currentY } : e);
          currentY += el.height + gapBetween;
        }
      });
    }
    
    setElements(newElements);
    saveToHistory(newElements);
  }, [elements, selectedIds, saveToHistory]);

  const moveZIndex = useCallback((direction: 'front' | 'back' | 'up' | 'down') => {
    if (selectedIds.length !== 1) return;
    const idx = elements.findIndex(el => el.id === selectedIds[0]);
    if (idx === -1) return;
    
    let newElements = [...elements];
    const [el] = newElements.splice(idx, 1);
    
    if (direction === 'front') {
      newElements.push(el);
    } else if (direction === 'back') {
      newElements.unshift(el);
    } else if (direction === 'up' && idx < elements.length - 1) {
      newElements.splice(idx + 1, 0, el);
    } else if (direction === 'down' && idx > 0) {
      newElements.splice(idx - 1, 0, el);
    } else {
      newElements.splice(idx, 0, el);
    }
    
    setElements(newElements);
    saveToHistory(newElements);
  }, [elements, selectedIds, saveToHistory]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const newElements: ElementData[] = [];
    selectedIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el) {
        newElements.push({
          ...el,
          id: generateId(),
          x: el.x + 5,
          y: el.y + 5,
        });
      }
    });
    const updated = [...elements, ...newElements];
    setElements(updated);
    saveToHistory(updated);
    setSelectedIds(newElements.map(e => e.id));
  }, [elements, selectedIds, saveToHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      // T: Add text element
      if (e.key === 't' || e.key === 'T') {
        addElement('text');
      }
      // Ctrl/Cmd + D: Duplicate
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
      // Delete/Backspace: Delete selected
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
      // V: Toggle selection mode
      else if (e.key === 'v' || e.key === 'V') {
        setSelectionMode(prev => !prev);
      }
      // G: Toggle grid
      else if (e.key === 'g' || e.key === 'G') {
        if (e.shiftKey) {
          setSnapToGrid(prev => !prev);
        } else {
          setShowGrid(prev => !prev);
        }
      }
      // F: Fit to screen
      else if (e.key === 'f' || e.key === 'F') {
        handleZoomFit();
      }
      // Ctrl/Cmd + Z: Undo
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      else if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duplicateSelected, deleteSelected, handleUndo, handleRedo, handleZoomFit, addElement]);

  const selectedElement = selectedIds.length === 1 
    ? elements.find(el => el.id === selectedIds[0]) 
    : null;

  const renderElement = useCallback((el: ElementData) => {
    const x = mmToPx(el.x);
    const y = mmToPx(el.y);
    const width = mmToPx(el.width);
    const height = mmToPx(el.height);
    const isSelected = selectedIds.includes(el.id);

    if (!el.isVisible) return null;

    const commonProps = {
      id: el.id,
      x,
      y,
      width,
      height,
      rotation: el.rotate || 0,
      draggable: !el.isLocked,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, el.id),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, el.id),
      opacity: el.opacity ?? 1,
      perfectDrawEnabled: false,
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        if (e.evt.shiftKey) {
          setSelectedIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
        } else {
          setSelectedIds([el.id]);
        }
      },
    };

    switch (el.type) {
      case 'text': {
        const displayText = replaceVariables(el.content);
        return (
          <Text
            key={el.id}
            {...commonProps}
            text={displayText}
            fontSize={el.fontSize || 16}
            fontFamily={el.fontFamily || 'Arial'}
            fontStyle={`${el.fontWeight === 'bold' ? 'bold' : ''} ${el.fontStyle === 'italic' ? 'italic' : ''}`.trim() || 'normal'}
            textDecoration={el.textDecoration}
            fill={el.color || '#000000'}
            align={el.textAlignH || 'left'}
            verticalAlign={el.textAlignV || 'top'}
            stroke={el.stroke || undefined}
            strokeWidth={el.strokeWidth || 0}
            shadowColor={el.shadowColor || undefined}
            shadowBlur={el.shadowBlur || 0}
            shadowOffsetX={el.shadowOffsetX || 0}
            shadowOffsetY={el.shadowOffsetY || 0}
            shadowEnabled={!!(el.shadowColor && (el.shadowBlur || el.shadowOffsetX || el.shadowOffsetY))}
          />
        );
      }
      case 'box':
        return (
          <Rect
            key={el.id}
            {...commonProps}
            fill={el.backgroundColor || '#e5e7eb'}
            stroke={el.borderColor || '#000000'}
            strokeWidth={el.borderWidth || 0}
            cornerRadius={el.borderRadius || 0}
          />
        );
      case 'image':
      case 'img-data': {
        let imgSrc = el.src; // Fallback image
        if (el.type === 'img-data' && el.content) {
          const value = replaceVariables(el.content);
          
          // Only search if variable is replaced (has actual data)
          if (value && !value.includes('{') && !value.includes('}')) {
            let found: UploadedImage | undefined;
            
            const dataType = el.dataType || 'filename';
            
            if (dataType === 'number') {
              // Index-based: 1-indexed for user friendliness
              const idx = parseInt(value) - 1;
              if (!isNaN(idx) && idx >= 0 && idx < uploadedImages.length) {
                found = uploadedImages[idx];
              }
            } else {
              // Filename matching with different modes
              const matchMode = el.matchMode || 'contains';
              const ignoreExt = el.ignoreExtension || false;
              const isBidirectional = el.bidirectional || false;
              
              found = uploadedImages.find(img => {
                let imgName = img.name;
                let searchValue = value;
                
                if (ignoreExt) {
                  imgName = imgName.replace(/\.[^.]+$/, '');
                  searchValue = searchValue.replace(/\.[^.]+$/, '');
                }
                
                const nameLower = imgName.toLowerCase();
                const valueLower = searchValue.toLowerCase();
                
                if (matchMode === 'exact') return imgName === searchValue;
                if (matchMode === 'startsWith') {
                  if (isBidirectional) {
                    return nameLower.startsWith(valueLower) || valueLower.startsWith(nameLower);
                  }
                  return nameLower.startsWith(valueLower);
                }
                if (matchMode === 'endsWith') {
                  if (isBidirectional) {
                    return nameLower.endsWith(valueLower) || valueLower.endsWith(nameLower);
                  }
                  return nameLower.endsWith(valueLower);
                }
                return nameLower.includes(valueLower); // contains (default)
              });
            }
            
            if (found) imgSrc = found.src;
          }
          
          // URL mode: use data value directly as image URL
          if ((el.dataType || 'filename') === 'url') {
            const urlVal = replaceVariables(el.content);
            if (urlVal && !urlVal.includes('{')) imgSrc = urlVal;
          }
        }
        const img = imgSrc ? loadedImages.get(imgSrc) : null;
        if (!img) return <Rect key={el.id} {...commonProps} fill="#f3f4f6" stroke="#d1d5db" />;
        // Calculate crop for objectFit
        const fit = el.objectFit || 'fill';
        let cropX = 0, cropY = 0, cropW = img.width, cropH = img.height;
        if (fit === 'contain') {
          const s = Math.min(width / img.width, height / img.height);
          const sw = img.width * s, sh = img.height * s;
          return (
            <Group key={el.id} {...commonProps}>
              <KonvaImage image={img} x={(width - sw) / 2} y={(height - sh) / 2} width={sw} height={sh}/>
            </Group>
          );
        }
        if (fit === 'cover') {
          const s = Math.max(width / img.width, height / img.height);
          cropW = width / s; cropH = height / s;
          cropX = (img.width - cropW) / 2; cropY = (img.height - cropH) / 2;
        }
        return (
          <KonvaImage key={el.id} {...commonProps} image={img}
            crop={fit === 'cover' ? { x: cropX, y: cropY, width: cropW, height: cropH } : undefined}
          />
        );
      }
      case 'qr':
      case 'barcode': {
        const codeImg = qrImages.get(el.id);
        if (!codeImg) return <Rect key={el.id} {...commonProps} fill="#f3f4f6" stroke="#d1d5db" />;
        return (
          <KonvaImage
            key={el.id}
            {...commonProps}
            image={codeImg}
          />
        );
      }
      default:
        return null;
    }
  }, [selectedIds, replaceVariables, uploadedImages, loadedImages, qrImages, handleDragEnd, handleTransformEnd]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#f0f0f0' }}>

      {/* ROW 1: Brand + File actions + Export */}
      <div className="h-11 bg-gray-900 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tracking-tight mr-1">Label Designer</span>
          <div className="w-px h-4 bg-gray-600"/>
          <button onClick={handleUndo} disabled={historyStep <= 0} title="Undo (Ctrl+Z)" aria-label="Undo"
            className="p-1.5 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors">
            <Undo size={15}/>
          </button>
          <button onClick={handleRedo} disabled={historyStep >= history.length - 1} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"
            className="p-1.5 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors">
            <Redo size={15}/>
          </button>
          <div className="w-px h-4 bg-gray-600"/>
          <button onClick={handleReset} title="Đặt lại canvas" aria-label="Reset canvas"
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <RefreshCw size={15}/>
          </button>
          <div className="w-px h-4 bg-gray-600"/>
          <button onClick={() => setIsWorkflowModalOpen(true)} title="Quản lý Workflow" aria-label="Workflow"
            className="p-1.5 rounded text-blue-400 hover:text-white hover:bg-blue-600 transition-colors">
            <Database size={15}/>
          </button>
          <div className="w-px h-4 bg-gray-600"/>
          <button onClick={() => setIsPageConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors">
            <Settings size={13}/>
            {pageConfig.width}x{pageConfig.height}mm
          </button>
          <button onClick={() => setIsSheetConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors">
            <LayoutGrid size={13}/>
            Khổ giấy
          </button>
        </div>
        <div className="flex items-center gap-2">
          {dataRows.length > 0 && (
            <div className="flex items-center bg-gray-800 rounded-md border border-gray-700">
              <button disabled={currentRowIndex === 0} onClick={() => setCurrentRowIndex(p => p - 1)}
                className="px-2 py-1 text-gray-300 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronLeft size={14}/>
              </button>
              <span className="px-2 text-xs font-mono text-gray-200 border-x border-gray-700">
                {currentRowIndex + 1} / {dataRows.length}
              </span>
              <button disabled={currentRowIndex === dataRows.length - 1} onClick={() => setCurrentRowIndex(p => p + 1)}
                className="px-2 py-1 text-gray-300 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronRight size={14}/>
              </button>
            </div>
          )}
          <button onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            {isRightPanelOpen ? <PanelRightClose size={15}/> : <PanelRightOpen size={15}/>}
          </button>
          <button onClick={handleExportPDF} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-colors">
            <Download size={14}/>{isLoading ? 'Đang xuất...' : 'Xuất PDF'}
          </button>
          <button onClick={handleSaveToFileManager} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-colors">
            <Upload size={14}/>{isLoading ? 'Đang lưu...' : 'Lưu vào Tệp'}
          </button>
        </div>
      </div>

      {/* ROW 2: Context-sensitive tools */}
      <div className="h-9 bg-white border-b border-gray-200 flex items-center px-2 gap-0.5 shrink-0 shadow-sm">
        <TB onClick={() => setSelectionMode(!selectionMode)} active={selectionMode} title="Chọn vùng (V)"><MousePointer2 size={15}/></TB>
        <div className="w-px h-5 bg-gray-200 mx-1"/>
        <TB onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.1))} title="Thu nhỏ (Ctrl + Scroll)"><ZoomOut size={15}/></TB>
        <button onClick={() => setZoom(1)} className="px-1.5 text-xs font-mono text-gray-600 hover:bg-gray-100 rounded-md min-w-[44px] text-center">
          {Math.round(zoom * 100)}%
        </button>
        <TB onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.1))} title="Phóng to (Ctrl + Scroll)"><ZoomIn size={15}/></TB>
        <button onClick={handleZoomFit} className="px-2 py-0.5 text-[10px] font-bold text-violet-600 hover:bg-violet-50 rounded border border-violet-200 ml-0.5" title="Fit to screen (F)">FIT</button>
        <div className="w-px h-5 bg-gray-200 mx-1"/>
        <TB onClick={() => setShowGrid(!showGrid)} active={showGrid} title="Lưới (G)"><LayoutGrid size={15}/></TB>
        <TB onClick={() => setSnapToGrid(!snapToGrid)} active={snapToGrid} title="Bám lưới (Shift + G)">
          <span className="text-[10px] font-bold px-0.5">SNAP</span>
        </TB>
        <select value={gridSize} onChange={e => setGridSize(Number(e.target.value))}
          className="text-[11px] border border-gray-200 rounded px-1 py-0.5 ml-0.5 text-gray-600 bg-white">
          <option value={1}>1mm</option><option value={2}>2mm</option>
          <option value={5}>5mm</option><option value={10}>10mm</option>
        </select>
        {selectedIds.length >= 1 && (<>
          <div className="w-px h-5 bg-gray-200 mx-1"/>
          <TB onClick={() => alignElements('left')} title="Căn trái"><AlignLeft size={15}/></TB>
          <TB onClick={() => alignElements('center')} title="Căn giữa ngang"><AlignCenter size={15}/></TB>
          <TB onClick={() => alignElements('right')} title="Căn phải"><AlignRight size={15}/></TB>
          <div className="w-px h-4 bg-gray-200 mx-0.5"/>
          <TB onClick={() => alignElements('top')} title="Căn trên">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="6" width="6" height="16" rx="2"/><rect x="14" y="6" width="6" height="9" rx="2"/><path d="M2 2h20"/></svg>
          </TB>
          <TB onClick={() => alignElements('middle')} title="Căn giữa dọc">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="6" height="16" rx="2"/><rect x="14" y="7" width="6" height="10" rx="2"/><path d="M2 12h20"/></svg>
          </TB>
          <TB onClick={() => alignElements('bottom')} title="Căn dưới">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="6" height="16" rx="2"/><rect x="14" y="9" width="6" height="9" rx="2"/><path d="M2 22h20"/></svg>
          </TB>
        </>)}
        {selectedIds.length >= 3 && (<>
          <div className="w-px h-5 bg-gray-200 mx-1"/>
          <TB onClick={() => distributeElements('horizontal')} title="Phân bố ngang">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="4" y2="20"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="20" y1="4" x2="20" y2="20"/></svg>
          </TB>
          <TB onClick={() => distributeElements('vertical')} title="Phân bố dọc">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="20" y2="4"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="20" x2="20" y2="20"/></svg>
          </TB>
        </>)}
        {selectedIds.length >= 1 && (<>
          <div className="w-px h-5 bg-gray-200 mx-1"/>
          <TB onClick={duplicateSelected} title="Nhân bản (Ctrl+D)"><Copy size={15}/></TB>
          <TB onClick={deleteSelected} title="Xóa"><Trash2 size={15}/></TB>
        </>)}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* LEFT TOOLBAR - Floating buttons */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
          {/* Add Elements */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex flex-col gap-1">
            <button
              onClick={() => addElement('text')}
              title="Thêm Text (T)"
              className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors">
              <Type size={18}/>
            </button>
            <button
              onClick={() => addElement('box')}
              title="Thêm Box"
              className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors">
              <Square size={18}/>
            </button>
            <button
              onClick={() => addElement('image')}
              title="Thêm Hình ảnh"
              className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors">
              <ImageIcon size={18}/>
            </button>
            <button
              onClick={() => addElement('qr')}
              title="Thêm QR Code"
              className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors">
              <QrCode size={18}/>
            </button>
            <button
              onClick={() => addElement('barcode')}
              title="Thêm Barcode"
              className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors">
              <ScanLine size={18}/>
            </button>
            <button
              onClick={() => addElement('img-data')}
              title="Thêm Ảnh từ Data"
              className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors">
              <Images size={18}/>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-300 mx-2"></div>

          {/* Tools */}
          <button
            onClick={() => setIsDataModalOpen(true)}
            title="Quản lý Data"
            className="w-11 h-11 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 border border-gray-200 transition-colors">
            <Database size={20}/>
          </button>
          <button
            onClick={() => setIsMediaModalOpen(true)}
            title="Quản lý Media"
            className="w-11 h-11 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 border border-gray-200 transition-colors">
            <Images size={20}/>
          </button>
          <button
            onClick={() => setIsNumberingModalOpen(true)}
            title="Số nhảy"
            className="w-11 h-11 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 border border-gray-200 transition-colors">
            <Hash size={20}/>
          </button>
        </div>

        {/* CANVAS AREA */}
        <div ref={containerRef} className="flex-1 overflow-hidden relative flex items-center justify-center" style={{ background: '#e8e8e8', backgroundImage: 'radial-gradient(circle, #c8c8c8 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {/* @ts-ignore - react-konva types issue with children prop */}
          <Stage
            ref={stageRef}
            width={containerSize.width}
            height={containerSize.height}
            scaleX={zoom}
            scaleY={zoom}
            x={stagePos.x}
            y={stagePos.y}
            draggable={false}
            onWheel={handleWheel}
            onClick={handleStageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: 'default' }}
          >
            <Layer>
              {/* Rulers */}
              <Group listening={false}>
                {/* Top Ruler */}
                <Rect x={-30} y={-30} width={mmToPx(pageConfig.width) + 30} height={30} fill="#f8f9fa" />
                {Array.from({ length: Math.ceil(pageConfig.width / 10) + 1 }).map((_, i) => (
                  <React.Fragment key={`ruler-h-${i}`}>
                    <Rect x={mmToPx(i * 10)} y={-30} width={1} height={i % 5 === 0 ? 15 : 10} fill="#666" />
                    {i % 5 === 0 && (
                      <Text x={mmToPx(i * 10) - 10} y={-28} text={`${i * 10}`} fontSize={9} fill="#333" />
                    )}
                  </React.Fragment>
                ))}
                {/* Left Ruler */}
                <Rect x={-30} y={-30} width={30} height={mmToPx(pageConfig.height) + 30} fill="#f8f9fa" />
                {Array.from({ length: Math.ceil(pageConfig.height / 10) + 1 }).map((_, i) => (
                  <React.Fragment key={`ruler-v-${i}`}>
                    <Rect x={-30} y={mmToPx(i * 10)} width={i % 5 === 0 ? 15 : 10} height={1} fill="#666" />
                    {i % 5 === 0 && (
                      <Text x={-28} y={mmToPx(i * 10) - 5} text={`${i * 10}`} fontSize={9} fill="#333" rotation={0} />
                    )}
                  </React.Fragment>
                ))}
              </Group>
              
              {/* Page Background */}
              <Group listening={false}>
                <Rect
                  x={0}
                  y={0}
                  width={mmToPx(pageConfig.width)}
                  height={mmToPx(pageConfig.height)}
                  fill="white"
                  shadowColor="black"
                  shadowBlur={10}
                  shadowOpacity={0.2}
                  shadowOffsetX={5}
                  shadowOffsetY={5}
                  draggable={false}
                  perfectDrawEnabled={false}
                />
                {backgroundImage && getBackgroundImageProps() && (
                  <Group clipFunc={(ctx: any) => {
                    ctx.rect(0, 0, mmToPx(pageConfig.width), mmToPx(pageConfig.height));
                  }}>
                    <KonvaImage
                      image={backgroundImage}
                      x={getBackgroundImageProps()!.x}
                      y={getBackgroundImageProps()!.y}
                      width={getBackgroundImageProps()!.width}
                      height={getBackgroundImageProps()!.height}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  </Group>
                )}
              </Group>
              
              {/* Grid Lines */}
              {showGrid && (
                <Group listening={false}>
                  {Array.from({ length: Math.ceil(pageConfig.width / gridSize) + 1 }).map((_, i) => (
                    <Rect
                      key={`v-${i}`}
                      x={mmToPx(i * gridSize)}
                      y={0}
                      width={0.5}
                      height={mmToPx(pageConfig.height)}
                      fill={i % 5 === 0 ? '#94a3b8' : '#cbd5e1'}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  ))}
                  {Array.from({ length: Math.ceil(pageConfig.height / gridSize) + 1 }).map((_, i) => (
                    <Rect
                      key={`h-${i}`}
                      x={0}
                      y={mmToPx(i * gridSize)}
                      width={mmToPx(pageConfig.width)}
                      height={0.5}
                      fill={i % 5 === 0 ? '#94a3b8' : '#cbd5e1'}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  ))}
                </Group>
              )}
              
              {/* Elements */}
              {elements.map(renderElement)}

              {/* Transformer */}
              <Transformer
                ref={transformerRef}
                anchorSize={8}
                anchorStroke="#7c3aed"
                anchorFill="#fff"
                anchorCornerRadius={2}
                borderStroke="#7c3aed"
                borderStrokeWidth={1.5}
                rotateEnabled={true}
                rotateAnchorOffset={25}
                enabledAnchors={['top-left','top-right','bottom-left','bottom-right','middle-left','middle-right','top-center','bottom-center']}
                keepRatio={false}
                boundBoxFunc={(oldBox: Konva.Box, newBox: Konva.Box) => {
                  if (newBox.width < MIN_ELEMENT_SIZE || newBox.height < MIN_ELEMENT_SIZE) return oldBox;
                  return newBox;
                }}
                ignoreStroke={true}
              />

              {/* Selection Rectangle */}
              {selectionRect && (
                <Rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="rgba(99, 102, 241, 0.1)"
                  stroke="#6366f1"
                  strokeWidth={1}
                  dash={[4, 4]}
                />
              )}
            </Layer>
          </Stage>
        </div>

        {/* RIGHT SIDEBAR - Properties */}
        {isRightPanelOpen && (
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">

            {/* Header */}
            <div className="h-9 flex items-center justify-between px-3 border-b border-gray-100 shrink-0">
              <span className="text-xs font-semibold text-gray-700">
                {selectedElement ? `${selectedElement.type.toUpperCase()}` : 'Properties'}
              </span>
              {selectedElement && (
                <button onClick={deleteSelected} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors" title="Xóa">
                  <Trash2 size={13}/>
                </button>
              )}
            </div>

            {/* Properties */}
            <div className="flex-1 overflow-hidden">
              {selectedElement ? (
                <PropertiesPanel
                  element={selectedElement}
                  availableFonts={availableFonts}
                  dataHeaders={dataHeaders}
                  onUpdate={updateElement}
                  onLoadFont={loadBrowserFont}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MousePointer2 size={32} className="mb-3 opacity-50"/>
                  <p className="text-sm font-medium">No element selected</p>
                  <p className="text-xs mt-1">Click an element to edit properties</p>
                </div>
              )}
            </div>

            {/* LAYERS PANEL */}
            <div className="border-t border-gray-200 shrink-0">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Layers ({elements.length})</span>
                <div className="flex gap-0.5">
                  <button onClick={() => moveZIndex('front')} disabled={selectedIds.length !== 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Lên trên cùng"><ArrowUpToLine size={11}/></button>
                  <button onClick={() => moveZIndex('up')} disabled={selectedIds.length !== 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Lên 1 lớp"><MoveUp size={11}/></button>
                  <button onClick={() => moveZIndex('down')} disabled={selectedIds.length !== 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Xuống 1 lớp"><MoveDown size={11}/></button>
                  <button onClick={() => moveZIndex('back')} disabled={selectedIds.length !== 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Xuống dưới cùng"><ArrowDownToLine size={11}/></button>
                </div>
              </div>
              <div className="overflow-auto" style={{ maxHeight: 200 }}>
                {[...elements].reverse().map((el, idx) => {
                  const actualIndex = elements.length - 1 - idx;
                  return (
                    <div key={el.id} draggable
                      onDragStart={e => { e.dataTransfer.setData('layerIndex', actualIndex.toString()); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={e => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('layerIndex'));
                        if (from === actualIndex) return;
                        const arr = [...elements];
                        const [moved] = arr.splice(from, 1);
                        arr.splice(actualIndex, 0, moved);
                        setElements(arr); saveToHistory(arr);
                      }}
                      onClick={() => setSelectedIds([el.id])}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-grab hover:bg-gray-50 transition-colors ${selectedIds.includes(el.id) ? 'bg-violet-50 text-violet-700' : 'text-gray-600'}`}>
                      <GripVertical size={11} className="text-gray-300 shrink-0"/>
                      <span className="flex-1 truncate">{el.type}: {el.content?.slice(0, 12) || el.id.slice(0,6)}</span>
                      <button onClick={e => { e.stopPropagation(); updateElement(el.id, { isVisible: !el.isVisible }); }} className="p-0.5 hover:bg-gray-200 rounded shrink-0">
                        {el.isVisible !== false ? <Eye size={11}/> : <EyeOff size={11} className="text-gray-300"/>}
                      </button>
                      <button onClick={e => { e.stopPropagation(); updateElement(el.id, { isLocked: !el.isLocked }); }} className="p-0.5 hover:bg-gray-200 rounded shrink-0">
                        {el.isLocked ? <Lock size={11} className="text-amber-500"/> : <Unlock size={11}/>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MEDIA MODAL */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Quản lý Media</h3>
                <p className="text-xs text-gray-500 mt-0.5">{uploadedImages.length} ảnh</p>
              </div>
              <button onClick={() => setIsMediaModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col p-5">
              <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden"/>
              
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingMedia(true); }}
                onDragLeave={() => setIsDraggingMedia(false)}
                onDrop={handleMediaDrop}
                onClick={() => imageInputRef.current?.click()}
                className={`w-full flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors mb-4 ${
                  isDraggingMedia 
                    ? 'border-violet-500 bg-violet-100' 
                    : 'border-gray-200 hover:border-violet-400 hover:bg-violet-50'
                }`}>
                <Upload size={32} className={isDraggingMedia ? 'text-violet-600' : 'text-gray-400'}/>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Kéo thả ảnh vào đây hoặc click để chọn</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP, SVG • Max 10MB mỗi file</p>
                </div>
              </div>

              {/* Search & Actions */}
              {uploadedImages.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="text"
                      value={mediaSearch}
                      onChange={e => setMediaSearch(e.target.value)}
                      placeholder="Tìm kiếm ảnh..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <span className="text-sm text-gray-500">
                      {filteredImages.length} / {uploadedImages.length}
                    </span>
                    {selectedMediaIds.length > 0 && (
                      <button
                        onClick={deleteSelectedMedia}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5">
                        <Trash2 size={14}/> Xóa {selectedMediaIds.length}
                      </button>
                    )}
                  </div>
                  
                  {/* AI Tools */}
                  <div className="flex items-center gap-2 mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">🤖 AI Tools:</span>
                    <button
                      onClick={() => alert('Tính năng Làm nét ảnh AI đang phát triển')}
                      className="px-3 py-1.5 bg-white text-purple-600 rounded-md text-xs font-medium hover:bg-purple-50 transition-colors border border-purple-200 flex items-center gap-1.5">
                      ✨ Làm nét ảnh
                    </button>
                    <button
                      onClick={() => alert('Tính năng Tạo ảnh thẻ AI đang phát triển\n\nCác loại thẻ:\n- Đi làm\n- Sinh viên\n- Học sinh')}
                      className="px-3 py-1.5 bg-white text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors border border-blue-200 flex items-center gap-1.5">
                      🎴 Tạo ảnh thẻ
                    </button>
                    {selectedMediaIds.length > 0 && (
                      <span className="text-xs text-purple-600 ml-auto">
                        ({selectedMediaIds.length} ảnh được chọn)
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Image Grid */}
              <div className="flex-1 overflow-auto">
                {filteredImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredImages.map((img) => {
                      const actualIdx = uploadedImages.findIndex(i => i.id === img.id);
                      const isSelected = selectedMediaIds.includes(img.id);
                      const isDragging = draggedImageId === img.id;
                      const isDragOver = dragOverImageId === img.id;
                      return (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={(e) => handleImageDragStart(e, img.id)}
                          onDragOver={(e) => handleImageDragOver(e, img.id)}
                          onDrop={(e) => handleImageDrop(e, img.id)}
                          onDragEnd={handleImageDragEnd}
                          className={`relative group border-2 rounded-lg overflow-hidden transition-all cursor-move ${
                            isDragging ? 'opacity-50 scale-95' : ''
                          } ${
                            isDragOver ? 'border-violet-500 ring-4 ring-violet-200 scale-105' : ''
                          } ${
                            isSelected ? 'border-violet-400 ring-2 ring-violet-200' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedMediaIds(prev => [...prev, img.id]);
                              } else {
                                setSelectedMediaIds(prev => prev.filter(id => id !== img.id));
                              }
                            }}
                            className="absolute top-2 left-2 z-10 w-4 h-4"
                          />
                          
                          {/* Drag Handle */}
                          <div className="absolute top-2 left-8 z-10 p-1 bg-white/80 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                            <GripVertical size={14} className="text-gray-600"/>
                          </div>
                          
                          {/* Image */}
                          <div
                            onClick={() => setPreviewImageId(img.id)}
                            className="aspect-square bg-gray-100 cursor-pointer">
                            <img
                              src={img.src}
                              alt={img.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Info & Actions */}
                          <div className="p-2 bg-white">
                            {editingMediaId === img.id ? (
                              <input
                                type="text"
                                value={editingMediaName}
                                onChange={e => setEditingMediaName(e.target.value)}
                                onBlur={() => renameMedia(img.id, editingMediaName)}
                                onKeyDown={e => e.key === 'Enter' && renameMedia(img.id, editingMediaName)}
                                className="w-full border rounded px-2 py-1 text-xs"
                                autoFocus
                              />
                            ) : (
                              <>
                                <p className="text-xs font-medium truncate text-gray-700" title={img.name}>
                                  {img.name}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] text-gray-400">#{actualIdx + 1}</span>
                                  {img.size && <span className="text-[10px] text-gray-400">{(img.size / 1024).toFixed(0)} KB</span>}
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Hover Actions */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveMediaUp(img.id)}
                              disabled={actualIdx === 0}
                              className="p-1.5 bg-white rounded shadow hover:bg-gray-100 disabled:opacity-30"
                              title="Di chuyển lên">
                              <ChevronLeft size={14} className="rotate-90"/>
                            </button>
                            <button
                              onClick={() => moveMediaDown(img.id)}
                              disabled={actualIdx === uploadedImages.length - 1}
                              className="p-1.5 bg-white rounded shadow hover:bg-gray-100 disabled:opacity-30"
                              title="Di chuyển xuống">
                              <ChevronRight size={14} className="rotate-90"/>
                            </button>
                            <button
                              onClick={() => { setEditingMediaId(img.id); setEditingMediaName(img.name); }}
                              className="p-1.5 bg-white rounded shadow hover:bg-gray-100"
                              title="Đổi tên">
                              <Edit3 size={14}/>
                            </button>
                            <button
                              onClick={() => deleteMedia(img.id)}
                              className="p-1.5 bg-white rounded shadow hover:bg-red-100 text-red-500"
                              title="Xóa">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                          
                          {/* AI Actions (bottom) */}
                          <div className="absolute bottom-12 left-0 right-0 flex gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                            <button
                              onClick={(e) => { e.stopPropagation(); alert(`Làm nét ảnh AI cho:\n${img.name}`); }}
                              className="flex-1 px-2 py-1 bg-purple-500 text-white rounded text-[10px] font-medium hover:bg-purple-600 transition-colors"
                              title="Làm nét ảnh AI">
                              ✨ Làm nét
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); alert(`Tạo ảnh thẻ AI cho:\n${img.name}\n\nChọn loại thẻ:\n- Đi làm\n- Sinh viên\n- Học sinh`); }}
                              className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-medium hover:bg-blue-600 transition-colors"
                              title="Tạo ảnh thẻ AI">
                              🎴 Ảnh thẻ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : uploadedImages.length > 0 ? (
                  <p className="text-sm text-gray-400 text-center py-12">Không tìm thấy "{mediaSearch}"</p>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-12">Chưa có ảnh nào. Hãy tải ảnh lên.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {previewImageId && (() => {
        const img = uploadedImages.find(i => i.id === previewImageId);
        if (!img) return null;
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImageId(null)}>
            <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setPreviewImageId(null)}
                className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-lg">
                <X size={24}/>
              </button>
              <img src={img.src} alt={img.name} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"/>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 rounded-b-lg">
                <p className="text-sm font-medium truncate">{img.name}</p>
                <div className="flex gap-3 text-xs text-gray-300 mt-1">
                  <span>#{uploadedImages.findIndex(i => i.id === img.id) + 1}</span>
                  {img.size && <span>{(img.size / 1024).toFixed(1)} KB</span>}
                  {img.type && <span>{img.type.split('/')[1].toUpperCase()}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* WORKFLOW MODAL */}
      {isWorkflowModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Quản lý Workflow</h3>
              <button onClick={() => setIsWorkflowModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            
            <div className="p-5 border-b bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={workflowName}
                  onChange={e => setWorkflowName(e.target.value)}
                  placeholder="Tên workflow..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={saveWorkflow}
                  disabled={!(workflowName || '').trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {currentWorkflowId ? 'Cập nhật' : 'Lưu mới'}
                </button>
              </div>
              {currentWorkflowId && (
                <p className="text-xs text-gray-500 mt-2">Đang chỉnh sửa: {workflows.find(w => w.id === currentWorkflowId)?.name}</p>
              )}
            </div>

            <div className="flex-1 overflow-auto p-5">
              <div className="space-y-2">
                {workflows.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Database size={32} className="mx-auto mb-2 opacity-50"/>
                    <p className="text-sm">Chưa có workflow nào</p>
                  </div>
                ) : (
                  workflows.map(wf => (
                    <div key={wf.id} className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${currentWorkflowId === wf.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{wf.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {wf.elements?.length || 0} phần tử · {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString('vi-VN') : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => loadWorkflow(wf.id)}
                          className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                          Tải
                        </button>
                        <button
                          onClick={() => deleteWorkflow(wf.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t bg-gray-50 text-xs text-gray-500">
              <p>💾 Workflow được lưu tự động vào Cloud Storage</p>
              <p className="mt-1">📁 Thư mục: <span className="font-mono text-blue-600">label-designer/</span></p>
            </div>
          </div>
        </div>
      )}

      {/* DATA TABLE MODAL */}
      {isDataModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Quản lý Data</h3>
                <p className="text-xs text-gray-500 mt-0.5">{dataRows.length} bản ghi · {dataHeaders.length} cột</p>
              </div>
              <button onClick={() => setIsDataModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            
            {/* Upload Section */}
            <div className="p-5 border-b bg-gray-50">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleDataFileUpload} className="hidden"/>
              <div className="grid grid-cols-2 gap-4">
                {/* Excel/CSV Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 px-6 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-violet-400 hover:bg-white text-gray-600 hover:text-violet-600 transition-colors">
                  <FileSpreadsheet size={28}/>
                  <div className="text-center">
                    <p className="text-sm font-medium">Tải Excel / CSV</p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
                  </div>
                </button>
                
                {/* Google Sheets */}
                <div className="flex flex-col gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Link size={18} className="text-gray-400"/>
                    <span className="text-sm font-medium text-gray-700">Google Sheets</span>
                  </div>
                  <input
                    type="text"
                    value={googleSheetUrl}
                    onChange={e => setGoogleSheetUrl(e.target.value)}
                    placeholder="Dán link..."
                    disabled={isLoadingSheet}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-100"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleGoogleSheetImport}
                      disabled={isLoadingSheet || !(googleSheetUrl || '').trim()}
                      className="px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                      {isLoadingSheet ? (
                        <>
                          <RefreshCw size={12} className="animate-spin"/>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <Download size={12}/>
                          Import
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleGoogleSheetImport}
                      disabled={isLoadingSheet || !(googleSheetUrl || '').trim() || dataHeaders.length === 0}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                      title="Cập nhật dữ liệu từ Google Sheets">
                      <RefreshCw size={12}/>
                      Cập nhật
                    </button>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    disabled={dataHeaders.length === 0}
                    className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                    <FileDown size={12}/>
                    Xuất CSV (dữ liệu đã sửa)
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {dataHeaders.length > 0 ? (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="border border-gray-200 px-2 py-1.5 text-left text-gray-500 font-medium w-10">#</th>
                      {dataHeaders.map(h => (
                        <th key={h} className="border border-gray-200 px-2 py-1.5 text-left text-gray-700 font-semibold">{h}</th>
                      ))}
                      <th className="border border-gray-200 px-2 py-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row, idx) => (
                      <tr key={idx} className={idx === currentRowIndex ? 'bg-violet-50' : 'hover:bg-gray-50'}>
                        <td className="border border-gray-200 px-2 py-1 text-gray-400 text-center">{idx + 1}</td>
                        {dataHeaders.map(h => (
                          <td key={h} className="border border-gray-200 px-1 py-0.5">
                            <input type="text" value={row[h] || ''} onChange={e => updateDataCell(idx, h, e.target.value)}
                              className="w-full px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-400 bg-transparent"/>
                          </td>
                        ))}
                        <td className="border border-gray-200 px-1 py-1 text-center">
                          <button onClick={() => deleteDataRow(idx)} className="p-0.5 hover:bg-red-100 text-red-400 rounded"><Trash2 size={12}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <FileSpreadsheet size={40} className="mb-3"/>
                  <p className="text-sm">Chưa có dữ liệu. Hãy tải file Excel/CSV.</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <button onClick={addDataRow} className="px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 transition-colors">+ Thêm dòng</button>
                <button onClick={addDataColumn} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">+ Thêm cột</button>
              </div>
              <button onClick={() => setIsDataModalOpen(false)} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">Xong</button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO NUMBERING MODAL */}
      {isNumberingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-6xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">Số nhảy tự động</h3>
              <button onClick={() => setIsNumberingModalOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex">
              {/* Left: Saved Sets */}
              <div className="w-64 border-r flex flex-col">
                <div className="p-3 border-b bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700">Đã lưu ({savedNumberingSets.length})</h4>
                </div>
                <div className="flex-1 overflow-auto">
                  {savedNumberingSets.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Chưa có số nhảy nào</p>
                  ) : (
                    <div className="p-2 space-y-2">
                      {savedNumberingSets.map(set => (
                        <div key={set.id} className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer group">
                          <div className="flex items-start justify-between gap-2">
                            <div 
                              className="flex-1 min-w-0"
                              onClick={() => {
                                const newRows = set.data.map((row, index) => ({
                                  ...dataRows[index] || {},
                                  [set.name]: row.value,
                                }));
                                if (!dataHeaders.includes(set.name)) {
                                  setDataHeaders([...dataHeaders, set.name]);
                                }
                                if (dataRows.length === 0) {
                                  setDataRows(newRows);
                                } else {
                                  const mergedRows = dataRows.map((row, index) => ({
                                    ...row,
                                    [set.name]: set.data[index]?.value || row[set.name] || '',
                                  }));
                                  for (let i = dataRows.length; i < set.data.length; i++) {
                                    mergedRows.push({ [set.name]: set.data[i].value });
                                  }
                                  setDataRows(mergedRows);
                                }
                                alert(`Đã áp dụng "${set.name}" với ${set.data.length} bản ghi`);
                              }}>
                              <p className="text-xs font-medium text-gray-900 truncate">{set.name}</p>
                              <p className="text-[10px] text-gray-500">{set.data.length} bản ghi</p>
                              <p className="text-[10px] text-gray-400 truncate">{new Date(set.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Xóa "${set.name}"?`)) {
                                  setSavedNumberingSets(prev => prev.filter(s => s.id !== set.id));
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500">
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right: Generator */}
              <div className="flex-1 overflow-auto">
                <AutoNumberingModule
                  onApply={(data: any[], formula: string) => {
                    const name = prompt('Đặt tên cho số nhảy này:', `AUTO_${savedNumberingSets.length + 1}`);
                    if (!name) return;
                    
                    // Save to list
                    const newSet = {
                      id: generateId(),
                      name,
                      data,
                      formula,
                      createdAt: Date.now()
                    };
                    setSavedNumberingSets(prev => [...prev, newSet]);
                    
                    // Apply to data
                    const newRows = data.map((row, index) => ({
                      ...dataRows[index] || {},
                      [name]: row.value,
                    }));
                    if (!dataHeaders.includes(name)) {
                      setDataHeaders([...dataHeaders, name]);
                    }
                    if (dataRows.length === 0) {
                      setDataRows(newRows);
                    } else {
                      const mergedRows = dataRows.map((row, index) => ({
                        ...row,
                        [name]: data[index]?.value || row[name] || '',
                      }));
                      for (let i = dataRows.length; i < data.length; i++) {
                        mergedRows.push({ [name]: data[i].value });
                      }
                      setDataRows(mergedRows);
                    }
                    alert(`Đã lưu và áp dụng "${name}" với ${data.length} bản ghi`);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE CONFIG MODAL */}
      {isSheetConfigModalOpen && (
        <SheetConfigModal
          sheetConfig={sheetConfig}
          setSheetConfig={setSheetConfig}
          pageConfig={pageConfig}
          onClose={() => setIsSheetConfigModalOpen(false)}
        />
      )}

      {isPageConfigModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Cấu hình trang</h3>
                <p className="text-xs text-gray-500 mt-0.5">Kích thước nhãn / label</p>
              </div>
              <button onClick={() => setIsPageConfigModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Khổ giấy</label>
                <div className="flex gap-2">
                  {(['A5','A4','A3','Custom'] as PageConfig['format'][]).map(f => (
                    <button key={f} onClick={() => {
                      const map: Record<string, [number,number]> = { A5:[148,210], A4:[210,297], A3:[297,420] };
                      if (!map[f]) { setPageConfig(p => ({...p, format: f})); return; }
                      let [w,h] = map[f];
                      if (pageConfig.orientation === 'portrait' && w > h) [w,h] = [h,w];
                      if (pageConfig.orientation === 'landscape' && h > w) [w,h] = [h,w];
                      setPageConfig(p => ({...p, format: f, width: w, height: h}));
                    }}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${pageConfig.format === f ? 'bg-violet-600 text-white border-violet-600' : 'hover:bg-gray-50 border-gray-200'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rộng (mm)</label>
                  <input type="number" value={pageConfig.width}
                    onChange={e => setPageConfig(p => ({...p, format: 'Custom', width: Number(e.target.value)}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cao (mm)</label>
                  <input type="number" value={pageConfig.height}
                    onChange={e => setPageConfig(p => ({...p, format: 'Custom', height: Number(e.target.value)}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hướng giấy</label>
                <div className="flex gap-2">
                  {[{v:'landscape',l:'Ngang'},{v:'portrait',l:'Doc'}].map(o => (
                    <button key={o.v} onClick={() => {
                      if (pageConfig.orientation !== o.v) {
                        setPageConfig(p => ({...p, orientation: o.v as any, width: o.v==='landscape' ? Math.max(p.width,p.height) : Math.min(p.width,p.height), height: o.v==='landscape' ? Math.min(p.width,p.height) : Math.max(p.width,p.height)}));
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${pageConfig.orientation === o.v ? 'bg-gray-800 text-white border-gray-800' : 'hover:bg-gray-50 border-gray-200'}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hình nền</label>
                <input ref={backgroundInputRef} type="file" accept="image/*,.pdf,application/pdf" onChange={handleBackgroundUpload} className="hidden"/>
                {pageConfig.backgroundSrc ? (
                  <div className="border border-gray-200 rounded-lg p-2 space-y-2">
                    <img src={pageConfig.backgroundSrc} alt="bg" className="w-full h-20 object-contain rounded-md"/>
                    <div className="flex gap-2">
                      <button onClick={() => backgroundInputRef.current?.click()} className="flex-1 text-xs py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Đổi ảnh</button>
                      <button onClick={() => setPageConfig(p => ({...p, backgroundSrc: undefined}))} className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">Xoa</button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(['fill','contain','cover','stretch'] as BackgroundFitType[]).map(fit => (
                        <button key={fit} onClick={() => setPageConfig(p => ({...p, backgroundFit: fit}))}
                          className={`py-1 text-[10px] rounded border font-medium transition-colors ${pageConfig.backgroundFit === fit ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                          {fit==='fill'?'Fill':fit==='contain'?'Fit':fit==='cover'?'Cover':'Stretch'}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => backgroundInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 text-sm text-gray-400 hover:text-violet-600 transition-colors flex items-center justify-center gap-2">
                    <Upload size={16}/> Tải ảnh nen
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end px-5 py-4 border-t">
              <button onClick={() => setIsPageConfigModalOpen(false)} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">Xong</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelDesignerPage;
