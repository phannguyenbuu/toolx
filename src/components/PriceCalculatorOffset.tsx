import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePriceCalculator } from '../hooks/usePriceCalculator';
import {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CustomPaper,
  CalcOption,
  Suggestion,
  LayoutItem,
} from '../utils/calculatorTypes';
import { 
  Printer, Settings, Cog, FileText, LayoutList, Database, Scissors, Plus, XCircle, 
  Trash2, Save, Box, TrendingUp, Play, Pause, SkipBack, SkipForward, X, AlertTriangle,
  Zap, Copy, Check, CheckCircle, Clock, Upload, Link, RefreshCw, Table, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { usePrintConfig } from '../contexts/PrintConfigContext';
import { calcDigitalPrintCost, getClickCount as getClickCountShared } from '../utils/printCalculatorHelpers';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useBusinessDatabase } from '../hooks/useBusinessDatabaseApi';

// --- HELPERS ---
const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const formatMM = (n: number) => Math.floor(n);
const copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

// --- TYPES (re-exported from calculatorTypes.ts) ---
interface Order {
  id: number; timestamp: string; inputs: InputState;
  customPaper: CustomPaper | null; isCustomPaper: boolean;
  result: CalcOption; finishings: FinishingItem[];
  quoteText: string; status: 'quoting' | 'processing' | 'completed';
}
interface DefaultFinishing { type: string; defaultPrice: number; unit: string; }
interface ColumnMapping { type: string; size: string; gsm: string; price: string; }
interface ImportState {
  isOpen: boolean;
  step: 'input' | 'mapping' | 'preview';
  source: 'file' | 'url' | null;
  rawData: string[][];
  headers: string[];
  mapping: ColumnMapping;
  googleSheetUrl: string;
  isLoading: boolean;
  error: string;
}

interface ClickTableEntry {
  maxLength: number;
  clicks: number;
}

interface DigitalConfig {
  clickPrice: number;
  clickTable: ClickTableEntry[];
}

// --- DATABASE GIẤY ---
const DEFAULT_PAPER_DATABASE: Paper[] = [
  { type: 'Offset', gsm: 250, size: '650x860', width: 650, height: 860, price: 4610 },
  { type: 'Offset', gsm: 250, size: '790x1090', width: 790, height: 1090, price: 7100 },
  { type: 'Offset', gsm: 200, size: '650x860', width: 650, height: 860, price: 3680 },
  { type: 'Offset', gsm: 200, size: '790x1090', width: 790, height: 1090, price: 5850 },
  { type: 'Offset', gsm: 180, size: '650x860', width: 650, height: 860, price: 3320 },
  { type: 'Offset', gsm: 180, size: '790x1090', width: 790, height: 1090, price: 5110 },
  { type: 'Offset', gsm: 140, size: '650x860', width: 650, height: 860, price: 2340 },
  { type: 'Offset', gsm: 140, size: '790x1090', width: 790, height: 1090, price: 3610 },
  { type: 'Offset', gsm: 120, size: '650x860', width: 650, height: 860, price: 2010 },
  { type: 'Offset', gsm: 120, size: '790x1090', width: 790, height: 1090, price: 3090 },
  { type: 'Offset', gsm: 100, size: '650x860', width: 650, height: 860, price: 1670 },
  { type: 'Offset', gsm: 100, size: '790x1090', width: 790, height: 1090, price: 2580 },
  { type: 'Offset', gsm: 80, size: '650x860', width: 650, height: 860, price: 1340 },
  { type: 'Offset', gsm: 80, size: '790x1090', width: 790, height: 1090, price: 2060 },
  { type: 'Ivory', gsm: 210, size: '650x860', width: 650, height: 860, price: 3870 },
  { type: 'Ivory', gsm: 210, size: '790x1090', width: 790, height: 1090, price: 5960 },
  { type: 'Ivory', gsm: 250, size: '650x860', width: 650, height: 860, price: 4610 },
  { type: 'Ivory', gsm: 250, size: '790x1090', width: 790, height: 1090, price: 7100 },
  { type: 'Ivory', gsm: 300, size: '650x860', width: 650, height: 860, price: 5530 },
  { type: 'Ivory', gsm: 300, size: '790x1090', width: 790, height: 1090, price: 8520 },
  { type: 'Couche', gsm: 300, size: '650x860', width: 650, height: 860, price: 5030 },
  { type: 'Couche', gsm: 300, size: '790x1090', width: 790, height: 1090, price: 7740 },
  { type: 'Couche', gsm: 250, size: '650x860', width: 650, height: 860, price: 4190 },
  { type: 'Couche', gsm: 250, size: '790x1090', width: 790, height: 1090, price: 6450 },
  { type: 'Couche', gsm: 230, size: '650x860', width: 650, height: 860, price: 3850 },
  { type: 'Couche', gsm: 200, size: '650x860', width: 650, height: 860, price: 3350 },
  { type: 'Couche', gsm: 200, size: '790x1090', width: 790, height: 1090, price: 5160 },
  { type: 'Couche', gsm: 150, size: '650x860', width: 650, height: 860, price: 2510 },
  { type: 'Couche', gsm: 150, size: '790x1090', width: 790, height: 1090, price: 3870 },
  { type: 'Couche', gsm: 120, size: '650x860', width: 650, height: 860, price: 2010 },
  { type: 'Couche', gsm: 120, size: '790x1090', width: 790, height: 1090, price: 3090 },
  { type: 'Couche', gsm: 100, size: '650x860', width: 650, height: 860, price: 1670 },
  { type: 'Couche', gsm: 100, size: '790x1090', width: 790, height: 1090, price: 2580 },
  { type: 'Couche', gsm: 80, size: '650x860', width: 650, height: 860, price: 1430 },
  { type: 'Couche', gsm: 80, size: '790x1090', width: 790, height: 1090, price: 2200 },
  { type: 'Couche Pindo', gsm: 300, size: '650x860', width: 650, height: 860, price: 5860 },
  { type: 'Couche Pindo', gsm: 350, size: '650x860', width: 650, height: 860, price: 6840 },
];

const DEFAULT_MACHINES: Machine[] = [
  { 
    id: '1', name: 'Máy 32.5 x 43', maxWidth: 430, maxHeight: 325, baseQty: 1000, maxColors: 4,
    colorPricing: [
      { colors: 1, basePrice: 300000, excessPrice: 50 },
      { colors: 2, basePrice: 500000, excessPrice: 80 },
      { colors: 4, basePrice: 700000, excessPrice: 100 },
    ]
  },
  { 
    id: '2', name: 'Máy 43 x 65', maxWidth: 650, maxHeight: 430, baseQty: 1000, maxColors: 4,
    colorPricing: [
      { colors: 1, basePrice: 450000, excessPrice: 80 },
      { colors: 2, basePrice: 750000, excessPrice: 120 },
      { colors: 4, basePrice: 1000000, excessPrice: 200 },
    ]
  }
];

const FINISHING_TYPES = ["Bế Demi", "Cấn đường", "Cán màng", "UV Định hình", "Ép kim", "Đóng cuốn", "Dán bao thư", "Bồi carton", "Khác"];
const ALL_CUT_PATTERNS = [{x:1,y:1},{x:1,y:2},{x:2,y:1},{x:2,y:2},{x:2,y:3},{x:3,y:2},{x:2,y:4},{x:3,y:3},{x:4,y:2},{x:4,y:3}];

// --- CUT ANIMATION MODAL ---
const CutAnimationModal = ({ isOpen, onClose, paperW, paperH, cutX, cutY, maxCutWidth, onUpdateMaxCutWidth }: {
  isOpen: boolean; onClose: () => void; paperW: number; paperH: number;
  cutX: number; cutY: number; maxCutWidth: number; onUpdateMaxCutWidth: (v: number) => void;
}) => {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { if (isOpen) { setStep(0); setIsPlaying(false); } }, [isOpen]);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setStep(prev => (prev + 1) % 4), 1500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  if (!isOpen) return null;
  const itemW = paperW / cutX, itemH = paperH / cutY;
  const isTooBig = maxCutWidth > 0 && Math.min(paperW, paperH) > maxCutWidth;

  const desc = [
    `Khổ giấy gốc: ${paperW} x ${paperH} mm`,
    `Bước 1: Cắt ${cutX - 1} đường dọc → ${cutX} dải ${Math.floor(itemW)} x ${paperH} mm`,
    `Bước 2: Cắt ${cutY - 1} đường ngang → ${cutX * cutY} tờ`,
    `Hoàn thành: ${cutX * cutY} tờ kích thước ${Math.floor(itemW)} x ${Math.floor(itemH)} mm`
  ][step];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Scissors size={16}/> Mô phỏng Cắt Giấy</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
        </div>
        <div className="bg-slate-100 p-6 flex flex-col items-center min-h-[300px]">
          <div className="w-full mb-4 bg-white p-3 rounded shadow-sm border flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase">Khổ máy cắt (mm)</label>
            <input type="number" value={maxCutWidth} onChange={(e) => onUpdateMaxCutWidth(parseInt(e.target.value) || 0)} className="w-20 p-1 border rounded text-center font-bold"/>
          </div>
          {isTooBig && <div className="mb-4 bg-red-100 text-red-700 px-3 py-2 rounded text-xs flex items-center gap-2 w-full"><AlertTriangle size={14}/> Cảnh báo: Giấy lớn hơn khổ máy cắt!</div>}
          <div className="relative bg-white shadow-sm border border-slate-300 w-full max-w-[280px]" style={{ aspectRatio: `${paperW}/${paperH}` }}>
            {step < 3 ? (
              <svg className="absolute inset-0 w-full h-full">
                {step >= 1 && Array.from({length: cutX - 1}, (_, i) => <line key={`v${i}`} x1={`${((i+1)/cutX)*100}%`} y1="0" x2={`${((i+1)/cutX)*100}%`} y2="100%" stroke="red" strokeWidth="2" strokeDasharray="5,5"/>)}
                {step >= 2 && Array.from({length: cutY - 1}, (_, i) => <line key={`h${i}`} x1="0" y1={`${((i+1)/cutY)*100}%`} x2="100%" y2={`${((i+1)/cutY)*100}%`} stroke="red" strokeWidth="2" strokeDasharray="5,5"/>)}
              </svg>
            ) : (
              <div className="w-full h-full grid p-1" style={{gridTemplateColumns: `repeat(${cutX}, 1fr)`, gridTemplateRows: `repeat(${cutY}, 1fr)`, gap: '3px'}}>
                {Array.from({length: cutX * cutY}, (_, i) => <div key={i} className="border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-300">{i+1}</div>)}
              </div>
            )}
          </div>
          <div className="mt-6 text-sm font-bold text-slate-700 text-center">{desc}</div>
        </div>
        <div className="p-4 border-t bg-white flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={() => {setIsPlaying(false); setStep(s => (s - 1 + 4) % 4);}} className="p-2 rounded hover:bg-slate-100"><SkipBack size={16}/></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 w-10 flex justify-center">{isPlaying ? <Pause size={16}/> : <Play size={16}/>}</button>
            <button onClick={() => {setIsPlaying(false); setStep(s => (s + 1) % 4);}} className="p-2 rounded hover:bg-slate-100"><SkipForward size={16}/></button>
          </div>
          <span className="text-xs text-slate-400">Bước {step + 1} / 4</span>
        </div>
      </div>
    </div>
  );
};

// --- PAPER IMPORT MODAL ---
const PaperImportModal = ({ 
  importState, 
  setImportState, 
  onImport 
}: { 
  importState: ImportState; 
  setImportState: React.Dispatch<React.SetStateAction<ImportState>>; 
  onImport: (papers: Paper[]) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect column mapping based on header names
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = { type: '', size: '', gsm: '', price: '' };
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    
    lowerHeaders.forEach((h, idx) => {
      const col = headers[idx];
      if (h.includes('loại') || h.includes('type') || h.includes('giấy')) mapping.type = col;
      else if (h.includes('khổ') || h.includes('size') || h.includes('kích')) mapping.size = col;
      else if (h.includes('định lượng') || h.includes('gsm') || h.includes('gram') || h.includes('g/m')) mapping.gsm = col;
      else if (h.includes('giá') || h.includes('price') || h.includes('đơn giá')) mapping.price = col;
    });
    
    return mapping;
  };

  // Parse size string to width/height
  const parseSize = (sizeStr: string): { width: number; height: number } | null => {
    if (!sizeStr) return null;
    const cleaned = sizeStr.replace(/\s/g, '').toLowerCase();
    const match = cleaned.match(/(\d+)[x×](\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return null;
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('File không có dữ liệu hoặc chỉ có header');
      }

      const headers = jsonData[0].map(h => String(h || ''));
      const rawData = jsonData.slice(1).filter(row => row.some(cell => cell != null && cell !== ''));
      const mapping = autoDetectMapping(headers);

      setImportState(prev => ({
        ...prev,
        source: 'file',
        headers,
        rawData: rawData.map(row => row.map(cell => String(cell || ''))),
        mapping,
        step: 'mapping',
        isLoading: false
      }));
    } catch (err) {
      setImportState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Lỗi đọc file' 
      }));
    }
  };

  // Handle Google Sheet URL
  const handleGoogleSheetLoad = async () => {
    let url = importState.googleSheetUrl.trim();
    if (!url) {
      setImportState(prev => ({ ...prev, error: 'Vui lòng nhập URL Google Sheet' }));
      return;
    }

    // Convert edit URL to export CSV URL
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch) {
      url = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
    }

    setImportState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Không thể tải Google Sheet. Kiểm tra link đã được publish chưa.');
      
      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error('Sheet không có dữ liệu hoặc chỉ có header');
      }

      const headers = jsonData[0].map(h => String(h || ''));
      const rawData = jsonData.slice(1).filter(row => row.some(cell => cell != null && cell !== ''));
      const mapping = autoDetectMapping(headers);

      setImportState(prev => ({
        ...prev,
        source: 'url',
        headers,
        rawData: rawData.map(row => row.map(cell => String(cell || ''))),
        mapping,
        step: 'mapping',
        isLoading: false
      }));
    } catch (err) {
      setImportState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Lỗi tải dữ liệu' 
      }));
    }
  };

  // Get column index by header name
  const getColIndex = (colName: string): number => {
    return importState.headers.indexOf(colName);
  };

  // Convert raw data to Paper objects
  const convertToPapers = (): Paper[] => {
    const { mapping, rawData } = importState;
    const typeIdx = getColIndex(mapping.type);
    const sizeIdx = getColIndex(mapping.size);
    const gsmIdx = getColIndex(mapping.gsm);
    const priceIdx = getColIndex(mapping.price);

    const papers: Paper[] = [];
    let lastType = '';

    rawData.forEach(row => {
      const type = row[typeIdx]?.trim() || lastType;
      if (type) lastType = type;
      
      const sizeStr = row[sizeIdx]?.trim() || '';
      const sizeData = parseSize(sizeStr);
      if (!sizeData) return;

      const gsm = parseInt(row[gsmIdx]) || 0;
      const price = parseInt(String(row[priceIdx]).replace(/[^\d]/g, '')) || 0;
      
      if (gsm > 0 && price > 0) {
        papers.push({
          type,
          gsm,
          size: `${sizeData.width}x${sizeData.height}`,
          width: sizeData.width,
          height: sizeData.height,
          price
        });
      }
    });

    return papers;
  };

  // Handle import confirmation
  const handleConfirmImport = () => {
    const papers = convertToPapers();
    if (papers.length === 0) {
      setImportState(prev => ({ ...prev, error: 'Không có dữ liệu hợp lệ để import' }));
      return;
    }
    onImport(papers);
    setImportState(prev => ({ ...prev, isOpen: false, step: 'input' }));
  };

  // Preview data
  const previewPapers = useMemo(() => {
    if (importState.step !== 'mapping' && importState.step !== 'preview') return [];
    return convertToPapers().slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importState.mapping, importState.rawData, importState.step, importState.headers]);

  if (!importState.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Database size={18} className="text-blue-600"/>
            Import Bảng Giá Giấy
          </h3>
          <button 
            onClick={() => setImportState(prev => ({ ...prev, isOpen: false, step: 'input', error: '' }))} 
            className="text-slate-400 hover:text-red-500"
          >
            <X size={20}/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Input Source */}
          {importState.step === 'input' && (
            <div className="space-y-6">
              {/* File Upload */}
              <div className="bg-slate-50 rounded-xl p-6 border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors">
                <div className="text-center">
                  <Upload size={40} className="mx-auto mb-3 text-blue-500"/>
                  <h4 className="font-bold text-slate-700 mb-2">Upload File Excel</h4>
                  <p className="text-sm text-slate-500 mb-4">Hỗ trợ định dạng .xlsx, .xls</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importState.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    <Upload size={16}/> Chọn File
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-slate-200"/>
                <span className="text-sm text-slate-400 font-medium">HOẶC</span>
                <div className="flex-1 border-t border-slate-200"/>
              </div>

              {/* Google Sheet URL */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-start gap-3 mb-4">
                  <Link size={24} className="text-green-600 mt-1"/>
                  <div>
                    <h4 className="font-bold text-slate-700">Google Sheets</h4>
                    <p className="text-sm text-slate-500">Nhập link Google Sheet đã publish</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={importState.googleSheetUrl}
                    onChange={(e) => setImportState(prev => ({ ...prev, googleSheetUrl: e.target.value }))}
                    className="flex-1 p-3 border rounded-lg text-sm"
                  />
                  <button
                    onClick={handleGoogleSheetLoad}
                    disabled={importState.isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
                  >
                    {importState.isLoading ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                    Tải
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  💡 Đảm bảo sheet đã được File → Share → Publish to web
                </p>
              </div>

              {/* Error */}
              {importState.error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle size={16}/> {importState.error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {importState.step === 'mapping' && (
            <div className="space-y-6">
              {/* Mapping Controls */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Table size={16} className="text-blue-600"/>
                  Chọn cột tương ứng
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['type', 'size', 'gsm', 'price'] as const).map((field) => {
                    const labels = { type: 'Loại giấy', size: 'Khổ giấy', gsm: 'Định lượng', price: 'Đơn giá' };
                    return (
                      <div key={field}>
                        <label className="text-xs font-bold text-slate-500 block mb-1">{labels[field]} *</label>
                        <div className="relative">
                          <select
                            value={importState.mapping[field]}
                            onChange={(e) => setImportState(prev => ({
                              ...prev,
                              mapping: { ...prev.mapping, [field]: e.target.value }
                            }))}
                            className="w-full p-2 pr-8 border rounded-lg bg-white text-sm appearance-none"
                          >
                            <option value="">-- Chọn cột --</option>
                            {importState.headers.map((h, idx) => (
                              <option key={idx} value={h}>{h}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {importState.mapping.type && importState.mapping.size && importState.mapping.gsm && importState.mapping.price && (
                  <div className="mt-3 text-xs text-green-600 bg-green-100 px-3 py-2 rounded flex items-center gap-1">
                    <Check size={14}/> Đã chọn đủ các cột bắt buộc
                  </div>
                )}
              </div>

              {/* Data Preview */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Database size={16}/>
                  Xem trước dữ liệu ({previewPapers.length} dòng đầu)
                </h4>
                {previewPapers.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-slate-600">Loại giấy</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-600">Khổ giấy</th>
                          <th className="px-3 py-2 text-right font-bold text-slate-600">Định lượng</th>
                          <th className="px-3 py-2 text-right font-bold text-slate-600">Đơn giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewPapers.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium">{p.type}</td>
                            <td className="px-3 py-2">{p.size}</td>
                            <td className="px-3 py-2 text-right">{p.gsm} gsm</td>
                            <td className="px-3 py-2 text-right font-mono text-blue-600">{formatVND(p.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg text-sm flex items-center gap-2">
                    <AlertTriangle size={16}/> Vui lòng chọn đúng các cột để xem dữ liệu
                  </div>
                )}
              </div>

              {/* Error */}
              {importState.error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle size={16}/> {importState.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {importState.step === 'mapping' && importState.rawData.length > 0 && (
              <span>Tổng: <b>{importState.rawData.length}</b> dòng dữ liệu</span>
            )}
          </div>
          <div className="flex gap-2">
            {importState.step === 'mapping' && (
              <button
                onClick={() => setImportState(prev => ({ ...prev, step: 'input', error: '' }))}
                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Quay lại
              </button>
            )}
            {importState.step === 'mapping' && previewPapers.length > 0 && (
              <button
                onClick={handleConfirmImport}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow flex items-center gap-2"
              >
                <Check size={16}/> Import {convertToPapers().length} dòng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export function PriceCalculatorOffset({ onClose: _onClose, initialTab = 'calc' }: { onClose?: () => void; initialTab?: 'calc' | 'machines' }) {
  const printConfig = usePrintConfig();
  const { setCurrentPage } = useAppNavigation();
  const { customers } = useBusinessDatabase();
  const [createOrderOpt, setCreateOrderOpt] = useState<any>(null);
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [activeTab, setActiveTab] = useState<'calc'|'machines'>(initialTab);
  const machines = printConfig.offsetMachines;
  const setMachines = printConfig.setOffsetMachines;
  const paperDatabase = printConfig.paperDatabase;
  const setPaperDatabase = printConfig.setPaperDatabase;
  const config = printConfig.config;
  const setConfig = printConfig.setConfig;
  const digitalConfig = printConfig.digitalConfig;
  const [importState, setImportState] = useState<ImportState>({
    isOpen: false,
    step: 'input',
    source: null,
    rawData: [],
    headers: [],
    mapping: { type: '', size: '', gsm: '', price: '' },
    googleSheetUrl: '',
    isLoading: false,
    error: ''
  });
  // config, digitalConfig, orders come from PrintConfigContext
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [machineForm, setMachineForm] = useState({ 
    name: '', maxWidth: '', maxHeight: '', baseQty: '1000', maxColors: '4',
    colorPricing: [] as { colors: string; basePrice: string; excessPrice: string }[]
  });

  const [inputs, setInputs] = useState<InputState>({
    width: '210', height: '297', quantity: '1000', printColors: 'auto', printSides: 1,
    symmetryMode: 'auto', lamination: 'none', selectedMachine: 'auto',
    selectedPaperType: 'Couche', selectedGSM: 150, useBleed: false, bleedMargin: '2', gripperMargin: 15
  });

  // Local state for numeric inputs (debounced before sync to main state)
  const [localInputs, setLocalInputs] = useState({ width: '210', height: '297', quantity: '1000' });

  // Debounce sync local inputs to main inputs state (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setInputs(prev => {
        // Only update if values actually changed to avoid unnecessary re-renders
        if (prev.width === localInputs.width && 
            prev.height === localInputs.height && 
            prev.quantity === localInputs.quantity) {
          return prev; // Return same reference if no changes
        }
        return {
          ...prev,
          width: localInputs.width,
          height: localInputs.height,
          quantity: localInputs.quantity,
        };
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [localInputs.width, localInputs.height, localInputs.quantity]);

  const [isCustomPaper, setIsCustomPaper] = useState(false);
  const [customPaper, setCustomPaper] = useState<CustomPaper>({ name: 'Giấy riêng', width: '650', height: '860', price: '5000', gsm: '200' });
  const [extraFinishings, setExtraFinishings] = useState<FinishingItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ paperW: 0, paperH: 0, cutX: 1, cutY: 1 });

  // Use Web Worker for calculations (PA2, PA3, PA4)
  const { 
    options: topOptions, 
    suggestion, 
    isCalculating, 
    isCalculatingSuggestion 
  } = usePriceCalculator({
    width: parseFloat(inputs.width) || 0,
    height: parseFloat(inputs.height) || 0,
    quantity: parseFloat(inputs.quantity) || 0,
    inputs,
    machines,
    paperDatabase,
    config,
    extraFinishings,
    isCustomPaper,
    customPaper: isCustomPaper ? customPaper : null,
  });

  const getClickCount = (paperLength: number): number => {
    if (digitalConfig.clickTable.length === 0) return 1;
    const sortedTable = [...digitalConfig.clickTable].sort((a, b) => a.maxLength - b.maxLength);
    for (const entry of sortedTable) {
      if (paperLength <= entry.maxLength) return entry.clicks;
    }
    return sortedTable[sortedTable.length - 1].clicks;
  };

  // FIX: Use printSize (after cutting) for click lookup, and totalPrintSheets for cost
  const digitalComparison = useMemo(() => {
    if (topOptions.length === 0) return null;
    
    const bestOffset = topOptions[0];
    if (!bestOffset) return null;
    
    // Use print size (the actual sheet going through the digital printer)
    const paperLength = Math.max(bestOffset.printSize.w, bestOffset.printSize.h);
    const clicks = getClickCountShared(paperLength, digitalConfig.clickTable);
    // totalPrintSheets = big sheets × cuts per sheet
    const totalPrintSheets = bestOffset.totalBigSheets * (bestOffset.cutX * bestOffset.cutY);
    const digitalPrintCost = calcDigitalPrintCost(digitalConfig.clickPrice, clicks, inputs.printSides, totalPrintSheets);
    const digitalTotal = bestOffset.costs.paper + digitalPrintCost + bestOffset.costs.lamination + bestOffset.costs.extra;
    const offsetTotal = bestOffset.costs.total;
    
    if (digitalTotal < offsetTotal) {
      const savings = offsetTotal - digitalTotal;
      const savingsPercent = Math.round((savings / offsetTotal) * 100);
      return {
        isDigitalCheaper: true,
        offsetTotal,
        digitalTotal,
        savings,
        savingsPercent,
        clicks
      };
    }
    
    return null;
  }, [topOptions, digitalConfig.clickPrice, digitalConfig.clickTable, inputs.printSides]);

  const paperTypes = useMemo(() => Array.from(new Set(paperDatabase.map((p: Paper) => p.type))), [paperDatabase]);
  const availableGSMs = useMemo(() => {
    const papers = paperDatabase.filter((p: Paper) => p.type === inputs.selectedPaperType);
    return Array.from(new Set(papers.map((p: Paper) => p.gsm))).sort((a: number, b: number) => a - b);
  }, [inputs.selectedPaperType, paperDatabase]);

  useEffect(() => {
    if (!availableGSMs.includes(inputs.selectedGSM)) {
      setInputs(prev => ({ ...prev, selectedGSM: availableGSMs[0] || 0 }));
    }
  }, [availableGSMs, inputs.selectedGSM]);

  // Orders persisted by PrintConfigContext

  // Handlers
  const handleNumChange = (field: keyof InputState, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // For width, height, quantity - use local state (debounced)
      if (field === 'width' || field === 'height' || field === 'quantity') {
        setLocalInputs(prev => ({ ...prev, [field]: value }));
      } else {
        setInputs(prev => ({ ...prev, [field]: value }));
      }
    }
  };
  const handleAddFinishing = () => {
    const defaultType = 'Bế Demi';
    const defaultFinishing = config.defaultFinishings.find(f => f.type === defaultType);
    setExtraFinishings([...extraFinishings, { 
      id: Date.now(), 
      type: defaultType, 
      name: '', 
      unit: defaultFinishing?.unit || 'bộ', 
      overrideVal: '', 
      price: defaultFinishing?.defaultPrice?.toString() || '' 
    }]);
  };
  const updateFinishing = (id: number, field: string, value: string) => {
    setExtraFinishings(extraFinishings.map(item => {
      if (item.id !== id) return item;
      // When type changes, update unit and price from defaults
      if (field === 'type') {
        const defaultFinishing = config.defaultFinishings.find(f => f.type === value);
        return { 
          ...item, 
          type: value, 
          unit: defaultFinishing?.unit || item.unit,
          price: defaultFinishing?.defaultPrice?.toString() || item.price
        };
      }
      return { ...item, [field]: value };
    }));
  };
  const removeFinishing = (id: number) => setExtraFinishings(extraFinishings.filter(item => item.id !== id));
  // Machine form handlers
  const resetMachineForm = () => {
    setMachineForm({ name: '', maxWidth: '', maxHeight: '', baseQty: '1000', maxColors: '4', colorPricing: [] });
    setEditingMachineId(null);
  };
  const addColorPricing = () => {
    const existingColors = machineForm.colorPricing.map(p => parseInt(p.colors) || 0);
    const nextColor = existingColors.length === 0 ? 1 : Math.max(...existingColors) + 1;
    setMachineForm({...machineForm, colorPricing: [...machineForm.colorPricing, { colors: nextColor.toString(), basePrice: '', excessPrice: '' }]});
  };
  const removeColorPricing = (idx: number) => {
    setMachineForm({...machineForm, colorPricing: machineForm.colorPricing.filter((_, i) => i !== idx)});
  };
  const updateColorPricing = (idx: number, field: string, value: string) => {
    const updated = [...machineForm.colorPricing];
    updated[idx] = {...updated[idx], [field]: value};
    setMachineForm({...machineForm, colorPricing: updated});
  };
  const handleEditMachine = (m: Machine) => {
    setEditingMachineId(m.id);
    setMachineForm({
      name: m.name, maxWidth: m.maxWidth.toString(), maxHeight: m.maxHeight.toString(),
      baseQty: m.baseQty.toString(), maxColors: m.maxColors.toString(),
      colorPricing: m.colorPricing.map(p => ({ colors: p.colors.toString(), basePrice: p.basePrice.toString(), excessPrice: p.excessPrice.toString() }))
    });
  };
  const handleSaveMachine = () => {
    if (!machineForm.name || !machineForm.maxWidth) { alert("Vui lòng nhập đủ thông tin!"); return; }
    const validPricing = machineForm.colorPricing.filter(p => p.basePrice !== '' && p.colors !== '').map(p => ({
      colors: parseInt(p.colors) || 0,
      basePrice: parseInt(p.basePrice) || 0,
      excessPrice: parseInt(p.excessPrice) || 0
    })).sort((a, b) => a.colors - b.colors);
    if (validPricing.length === 0) { alert("Vui lòng nhập ít nhất 1 mức giá theo số màu!"); return; }
    const maxColorFromPricing = Math.max(...validPricing.map(p => p.colors));
    const machineData: Machine = { 
      id: editingMachineId || Date.now().toString(), 
      name: machineForm.name, 
      maxWidth: parseInt(machineForm.maxWidth) || 0, 
      maxHeight: parseInt(machineForm.maxHeight) || 0, 
      baseQty: parseInt(machineForm.baseQty) || 1000,
      maxColors: Math.max(parseInt(machineForm.maxColors) || 0, maxColorFromPricing),
      colorPricing: validPricing
    };
    if (editingMachineId) {
      setMachines(machines.map(m => m.id === editingMachineId ? machineData : m));
    } else {
      setMachines([...machines, machineData]);
    }
    resetMachineForm();
  };
  const handleDeleteMachine = (id: string) => { 
    if (window.confirm("Xóa máy này?")) {
      setMachines(machines.filter(m => m.id !== id));
      if (editingMachineId === id) resetMachineForm();
    }
  };

  // Quote text generator
  const getQuoteText = (opt: CalcOption) => {
    const qty = parseInt(inputs.quantity) || 1;
    const unitPrice = qty > 0 ? Math.round(opt.costs.total / qty) : 0;
    const laminationText = inputs.lamination === 'none' ? '' : inputs.lamination === '1side' ? 'Cán màng 1 mặt' : 'Cán màng 2 mặt';
    const extrasText = extraFinishings.map(e => e.name).filter(Boolean).join(', ');
    return `--- BÁO GIÁ IN OFFSET ---\nNgày: ${new Date().toLocaleString('vi-VN')}\nKích thước: ${inputs.width} x ${inputs.height} mm\nSố lượng: ${qty.toLocaleString('vi-VN')}\nQuy cách: In ${inputs.printSides === 1 ? "1 mặt" : "2 mặt"}\nGiấy: ${opt.paperDisplay}\nGia công: ${[laminationText, extrasText].filter(Boolean).join(', ') || 'Không có'}\n-------------------------\nĐƠN GIÁ: ${formatVND(unitPrice)}/sản phẩm\nTỔNG CỘNG: ${formatVND(opt.costs.total)}`;
  };

  // Order management
  const handleCreateOrder = (opt: CalcOption, customerName = '') => {
    const qty = parseInt(inputs.quantity) || 1;
    const unitPrice = qty > 0 ? Math.round(opt.costs.total / qty) : 0;
    const orderId = `DH-${Date.now().toString(36).toUpperCase()}`;
    const entry = { id: Date.now(), orderId, timestamp: new Date().toLocaleString('vi-VN'), type: 'offset' as const, inputs: { ...inputs }, customPaper: isCustomPaper ? { ...customPaper } : null, isCustomPaper, result: opt, finishings: [...extraFinishings], quoteText: `[${orderId}]\n${getQuoteText(opt)}`, status: 'quoting' as const, unitPrice, customerName, notes: '' };
    printConfig.addOrder(entry);
    setCurrentPage('orders');
  };

  return (
    <div className="h-full bg-slate-100 font-sans text-slate-800 flex flex-col overflow-hidden">
      <CutAnimationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} paperW={modalData.paperW} paperH={modalData.paperH} cutX={modalData.cutX} cutY={modalData.cutY} maxCutWidth={config.maxCutWidth} onUpdateMaxCutWidth={(val) => setConfig({...config, maxCutWidth: val})}/>
      {createOrderOpt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCreateOrderOpt(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-slate-800">Tạo đơn hàng</h3>
            <div className="text-sm text-slate-600">
              <div>{createOrderOpt.machineName} — {createOrderOpt.paperDisplay}</div>
              <div className="font-bold text-indigo-700 text-lg mt-1">{formatVND(createOrderOpt.costs.total)}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Khách hàng</label>
              <select value={orderCustomerName} onChange={e => setOrderCustomerName(e.target.value)} className="w-full p-2 border rounded text-sm mb-2">
                <option value="">— Khách vãng lai —</option>
                {customers.map(c => <option key={c.id} value={c.name}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
              </select>
              <input type="text" placeholder="Hoặc nhập tên khách mới..." value={orderCustomerName} onChange={e => setOrderCustomerName(e.target.value)} className="w-full p-2 border rounded text-sm" list="customer-suggestions-offset"/>
              <datalist id="customer-suggestions-offset">
                {customers.map(c => <option key={c.id} value={c.name}/>)}
              </datalist>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { handleCreateOrder(createOrderOpt, orderCustomerName || 'Khách vãng lai'); setCreateOrderOpt(null); setOrderCustomerName(''); }} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-emerald-700">✓ Xác nhận</button>
              <button onClick={() => { setCreateOrderOpt(null); setOrderCustomerName(''); }} className="px-4 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-sm hover:bg-slate-200">Hủy</button>
            </div>
          </div>
        </div>
      )}
      <PaperImportModal 
        importState={importState} 
        setImportState={setImportState} 
        onImport={(papers) => {
          setPaperDatabase(papers);
          // Reset paper selection to first type
          if (papers.length > 0) {
            const firstType = papers[0].type;
            const firstGsm = papers.find(p => p.type === firstType)?.gsm || 0;
            setInputs(prev => ({ ...prev, selectedPaperType: firstType, selectedGSM: firstGsm }));
          }
        }}
      />
      
      {/* Header */}
      <div className="bg-indigo-700 text-white p-4 shadow-md shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded"><Printer size={20}/></div>
            <div><h1 className="text-xl font-bold">Tính Giá In</h1><p className="text-[10px] opacity-80">Offset Pro</p></div>
          </div>
          <div className="flex bg-indigo-900/50 p-1 rounded-lg">
            <button onClick={() => setActiveTab('calc')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'calc' ? 'bg-white text-indigo-800 shadow' : 'text-indigo-200 hover:text-white'}`}>
              <LayoutList size={16}/> Tính Giá
            </button>
            <button onClick={() => setCurrentPage('orders')} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-indigo-200 hover:text-white">
              <FileText size={16}/> Đơn Hàng
            </button>
            <button onClick={() => setActiveTab('machines')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'machines' ? 'bg-white text-indigo-800 shadow' : 'text-indigo-200 hover:text-white'}`}>
              <Cog size={16}/> Cấu Hình
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'calc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* INPUT PANEL */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Settings size={18}/> Thông Số In</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Kích thước (mm)</label>
                      <div className="flex gap-2 mt-1">
                        <input type="number" value={localInputs.width} onChange={(e) => handleNumChange('width', e.target.value)} className="w-full border rounded p-2 font-mono" placeholder="Rộng"/>
                        <input type="number" value={localInputs.height} onChange={(e) => handleNumChange('height', e.target.value)} className="w-full border rounded p-2 font-mono" placeholder="Cao"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Số lượng</label>
                      <input type="number" value={localInputs.quantity} onChange={(e) => handleNumChange('quantity', e.target.value)} className="w-full mt-1 border rounded p-2 font-bold text-indigo-700"/>
                      {isCalculatingSuggestion ? (
                        <div className="mt-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-700 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"/>
                          <span>Đang tìm gợi ý tối ưu...</span>
                        </div>
                      ) : suggestion && (
                        <div className="mt-2 bg-green-50 border border-green-200 p-2 rounded text-xs text-green-800 flex items-start gap-2">
                          <Zap size={14} className="mt-0.5 text-green-600 shrink-0"/>
                          <div><span className="font-bold">💡 Gợi ý:</span> Giảm còn <b>{suggestion.w}x{suggestion.h}mm</b> tiết kiệm <b className="text-green-700">{formatVND(suggestion.diff)}</b></div>
                        </div>
                      )}
                    </div>
                    {/* Paper Selection */}
                    <div className="bg-slate-50 p-3 rounded border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Database size={14}/><span className="text-[10px] font-bold text-slate-500 uppercase">Giấy In</span></div>
                        <div className="flex bg-white rounded border overflow-hidden">
                          <button onClick={() => setIsCustomPaper(false)} className={`px-2 py-1 text-[10px] font-bold ${!isCustomPaper ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>Chuẩn</button>
                          <button onClick={() => setIsCustomPaper(true)} className={`px-2 py-1 text-[10px] font-bold ${isCustomPaper ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>Tùy chỉnh</button>
                        </div>
                      </div>
                      {!isCustomPaper ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Loại Giấy</label>
                            <select value={inputs.selectedPaperType} onChange={(e) => setInputs({...inputs, selectedPaperType: e.target.value})} className="w-full p-2 border rounded bg-white text-sm">
                              {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Định Lượng</label>
                            <select value={inputs.selectedGSM} onChange={(e) => setInputs({...inputs, selectedGSM: parseInt(e.target.value)})} className="w-full p-2 border rounded bg-white text-sm">
                              {availableGSMs.map(g => <option key={g} value={g}>{g} gsm</option>)}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input type="text" placeholder="Tên giấy" className="w-full p-2 border rounded bg-white text-sm" value={customPaper.name} onChange={e => setCustomPaper({...customPaper, name: e.target.value})}/>
                          <div className="grid grid-cols-3 gap-2">
                            <input type="number" placeholder="Rộng" className="w-full p-2 border rounded bg-white text-sm" value={customPaper.width} onChange={e => setCustomPaper({...customPaper, width: e.target.value})}/>
                            <input type="number" placeholder="Cao" className="w-full p-2 border rounded bg-white text-sm" value={customPaper.height} onChange={e => setCustomPaper({...customPaper, height: e.target.value})}/>
                            <input type="number" placeholder="GSM" className="w-full p-2 border rounded bg-white text-sm" value={customPaper.gsm} onChange={e => setCustomPaper({...customPaper, gsm: e.target.value})}/>
                          </div>
                          <input type="number" placeholder="Giá/tờ (VND)" className="w-full p-2 border rounded bg-white text-sm font-bold" value={customPaper.price} onChange={e => setCustomPaper({...customPaper, price: e.target.value})}/>
                        </div>
                      )}
                    </div>
                    {/* Machine & Colors */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Số màu in</label>
                        <select value={inputs.printColors} onChange={(e) => setInputs({...inputs, printColors: e.target.value})} className="w-full p-2 border rounded bg-white text-sm">
                          <option value="auto">Auto</option>
                          <option value="1">1 màu</option>
                          <option value="2">2 màu</option>
                          <option value="4">4 màu</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Chọn Máy</label>
                        <select value={inputs.selectedMachine} onChange={(e) => setInputs({...inputs, selectedMachine: e.target.value})} className="w-full p-2 border rounded bg-white text-sm">
                          <option value="auto">⚡ Auto</option>
                          {machines.filter(m => m.maxColors >= (parseInt(inputs.printColors) || 0)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Print Sides */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Chế độ in</label>
                      <div className="flex bg-slate-100 p-1 rounded">
                        <button onClick={() => setInputs({...inputs, printSides: 1})} className={`flex-1 py-2 text-xs font-bold rounded ${inputs.printSides === 1 ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>1 Mặt</button>
                        <button onClick={() => setInputs({...inputs, printSides: 2})} className={`flex-1 py-2 text-xs font-bold rounded ${inputs.printSides === 2 ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>2 Mặt</button>
                      </div>
                    </div>
                    {/* Lamination */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cán màng ({formatVND(config.laminationPrice)}/m²)</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded">
                        {(['none', '1side', '2side'] as const).map(opt => (
                          <button key={opt} onClick={() => setInputs({...inputs, lamination: opt})} className={`py-2 text-[10px] font-bold rounded ${inputs.lamination === opt ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                            {opt === 'none' ? 'Không' : opt === '1side' ? '1 Mặt' : '2 Mặt'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Bleed */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Scissors size={12}/> Bù xén</label>
                      <div className="flex items-center gap-2">
                        {inputs.useBleed && <input type="number" value={inputs.bleedMargin} onChange={(e) => handleNumChange('bleedMargin', e.target.value)} className="w-12 p-1 border rounded text-center text-sm"/>}
                        <button onClick={() => setInputs({...inputs, useBleed: !inputs.useBleed})} className={`text-xs px-2 py-1 rounded-full ${inputs.useBleed ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                          {inputs.useBleed ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                    {/* Extra Finishings */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Plus size={10}/> Gia công khác</label>
                        <button onClick={handleAddFinishing} className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded font-bold hover:bg-green-100">+ Thêm</button>
                      </div>
                      <div className="space-y-3">
                        {extraFinishings.map(item => (
                          <div key={item.id} className="bg-slate-50 p-2 rounded border relative">
                            <div className="flex gap-2 mb-2">
                              <select className="w-1/3 p-1 text-xs border rounded bg-white" value={item.type} onChange={(e) => updateFinishing(item.id, 'type', e.target.value)}>
                                {FINISHING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input type="text" placeholder="Mô tả" className="w-2/3 p-1 text-xs border rounded bg-white" value={item.name} onChange={(e) => updateFinishing(item.id, 'name', e.target.value)}/>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <input type="number" placeholder="SL" value={item.overrideVal} onChange={(e) => updateFinishing(item.id, 'overrideVal', e.target.value)} className="w-full p-1 border rounded bg-white"/>
                              <select className="w-full p-1 border rounded bg-white" value={item.unit} onChange={(e) => updateFinishing(item.id, 'unit', e.target.value)}>
                                <option value="m²">m²</option><option value="bộ">bộ</option><option value="cái">cái</option><option value="lượt">lượt</option>
                              </select>
                              <input type="number" placeholder="Đơn giá" value={item.price} onChange={(e) => updateFinishing(item.id, 'price', e.target.value)} className="w-full p-1 border rounded bg-white"/>
                            </div>
                            <button onClick={() => removeFinishing(item.id)} className="absolute top-1 right-1 text-slate-300 hover:text-red-500"><XCircle size={14}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESULTS */}
              <div className="lg:col-span-8 space-y-4">
                {isCalculating ? (
                  // Skeleton Loading UI
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`bg-white rounded-xl shadow-md border overflow-hidden animate-pulse ${i === 1 ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
                        <div className="flex flex-col md:flex-row border-b border-slate-100">
                          <div className="p-5 flex-1 bg-slate-50">
                            <div className="flex items-center gap-2 mb-2">
                              {i === 1 && <div className="h-4 w-12 bg-indigo-200 rounded"/>}
                              <div className="h-5 w-32 bg-slate-200 rounded"/>
                            </div>
                            <div className="h-4 w-48 bg-slate-200 rounded mb-3"/>
                            <div className="h-8 w-40 bg-slate-100 rounded-lg"/>
                          </div>
                          <div className="p-5 min-w-[240px] border-l border-slate-100 bg-white">
                            <div className="flex justify-between items-end mb-2">
                              <div className="h-3 w-16 bg-slate-200 rounded"/>
                              <div className="h-7 w-28 bg-slate-200 rounded"/>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="h-3 w-full bg-slate-100 rounded"/>
                              <div className="h-3 w-full bg-slate-100 rounded"/>
                              <div className="h-3 w-3/4 bg-slate-100 rounded"/>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-8">
                          <div className="flex flex-col items-center">
                            <div className="h-3 w-16 bg-slate-200 rounded mb-2"/>
                            <div className="w-full max-w-[160px] aspect-[3/4] bg-slate-100 rounded"/>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="h-3 w-20 bg-slate-200 rounded mb-2"/>
                            <div className="w-full max-w-[200px] aspect-[4/3] bg-slate-100 rounded"/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : topOptions.length === 0 ? (
                  <div className="bg-white p-12 rounded-xl text-center border-2 border-dashed border-slate-300">
                    <XCircle size={24} className="mx-auto mb-2 text-slate-300"/>
                    <h3 className="text-slate-500 font-medium">Không tìm thấy phương án tối ưu</h3>
                    <p className="text-sm text-slate-400 mt-1">Vui lòng kiểm tra lại kích thước.</p>
                  </div>
                ) : (
                  <>
                    {digitalComparison && (
                      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <TrendingUp size={20} className="text-cyan-600"/>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-cyan-800 mb-1 flex items-center gap-2">
                              Gợi ý tối ưu: In Digital rẻ hơn!
                              <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                Tiết kiệm {digitalComparison.savingsPercent}%
                              </span>
                            </h4>
                            <p className="text-sm text-cyan-700 mb-2">
                              Với số lượng này, in <b>Digital</b> chỉ tốn <b className="text-green-700">{formatVND(digitalComparison.digitalTotal)}</b> thay vì <span className="line-through text-slate-500">{formatVND(digitalComparison.offsetTotal)}</span> (Offset).
                            </p>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="bg-white px-3 py-1.5 rounded border border-cyan-100">
                                <span className="text-slate-500">Tiết kiệm:</span>
                                <span className="font-bold text-green-600 ml-1">{formatVND(digitalComparison.savings)}</span>
                              </div>
                              <a href="/price-calc-fast" className="text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1">
                                Xem chi tiết Digital <Zap size={12}/>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {topOptions.map((opt, index) => (
                    <div key={index} className={`bg-white rounded-xl shadow-md border overflow-hidden ${index === 0 ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
                      <div className="flex flex-col md:flex-row border-b border-slate-100">
                        <div className="p-5 flex-1 bg-slate-50">
                          <div className="flex items-center gap-2 mb-2">
                            {index === 0 && <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Rẻ nhất</span>}
                            <h3 className="font-bold text-lg text-slate-800">{opt.machineName} <span className="text-xs font-normal text-slate-500">({opt.machineColors} màu)</span></h3>
                          </div>
                          <div className="text-sm text-slate-600 mb-3">Giấy <b>{opt.paperDisplay}</b> | Khổ <b>{opt.paperSize}</b></div>
                          <div className="inline-flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg text-xs shadow-sm">
                            <Box size={12}/><span>In: <b>{formatMM(opt.printSize.w)} x {formatMM(opt.printSize.h)}</b></span>
                            <span className="text-slate-300 mx-1">|</span><span>Bình: <b className="text-indigo-700">{opt.ups} con</b></span>
                          </div>
                        </div>
                        <div className="p-5 min-w-[240px] border-l border-slate-100 bg-white flex flex-col justify-center">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-xs text-slate-400 font-bold uppercase">Tổng Chi Phí</span>
                            <span className="text-2xl font-bold text-indigo-700">{formatVND(opt.costs.total)}</span>
                          </div>
                          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs text-slate-500">
                            <div className="flex justify-between"><span>Giấy ({opt.totalBigSheets} tờ)</span><span className="font-medium text-slate-700">{formatVND(opt.costs.paper)}</span></div>
                            <div className="flex justify-between">
                              <span>In ({opt.totalImpressions.toLocaleString()} lượt)
                                {opt.printMethod === 'work-turn' && <span className="text-green-600 font-bold text-[10px]"> (Tự trở)</span>}
                                {opt.printMethod === 'sheet-wise' && <span className="text-red-600 font-bold text-[10px]"> (In AB)</span>}
                              </span>
                              <span className="font-medium text-slate-700">{formatVND(opt.costs.print)}</span>
                            </div>
                            {opt.costs.lamination > 0 && <div className="flex justify-between text-orange-600 bg-orange-50 px-1 rounded"><span>Cán màng</span><span className="font-bold">{formatVND(opt.costs.lamination)}</span></div>}
                            {opt.costs.extra > 0 && <div className="flex justify-between text-green-600 bg-green-50 px-1 rounded"><span>Gia công</span><span className="font-bold">{formatVND(opt.costs.extra)}</span></div>}
                          </div>
                        </div>
                      </div>
                      {/* Visuals */}
                      <div className="p-5 grid grid-cols-2 gap-8">
                        <div className="flex flex-col items-center">
                          <div className="flex justify-between w-full max-w-[160px] mb-2 items-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Cắt Giấy</span>
                            <button onClick={() => { setModalData({ paperW: opt.paperWidth, paperH: opt.paperHeight, cutX: opt.cutX, cutY: opt.cutY }); setModalOpen(true); }}
                              className="text-[10px] flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold hover:bg-indigo-100">
                              <Play size={10}/> Xem
                            </button>
                          </div>
                          <div className="relative border border-slate-800 bg-white w-full max-w-[160px]" style={{ aspectRatio: `${opt.paperWidth}/${opt.paperHeight}` }}>
                            {opt.cutItems.map((item, i) => (
                              <div key={i} className="absolute border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-300"
                                style={{ left: `${(item.x / opt.paperWidth) * 100}%`, top: `${(item.y / opt.paperHeight) * 100}%`, width: `${(item.w / opt.paperWidth) * 100}%`, height: `${(item.h / opt.paperHeight) * 100}%` }}>{i+1}</div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex justify-between w-full max-w-[200px] mb-2 items-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Sơ đồ Bình</span>
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">{formatMM(opt.printSize.w)} x {formatMM(opt.printSize.h)}</span>
                          </div>
                          <div className="relative border border-blue-300 bg-blue-50 w-full max-w-[200px] overflow-hidden" style={{ aspectRatio: `${opt.printSize.w}/${opt.printSize.h}` }}>
                            <div className="absolute border-b border-dashed border-red-300 w-full bg-red-50/30" style={{ top: 0, left: 0, height: `${(15 / opt.printSize.h) * 100}%` }}/>
                            {opt.layoutItems.map((item, i) => (
                              <div key={i} className={`absolute box-border border border-blue-600 shadow-sm ${item.rotate ? 'bg-orange-200/90' : 'bg-blue-300/90'}`}
                                style={{ left: `${(item.x / opt.printSize.w) * 100}%`, top: `${(item.y / opt.printSize.h) * 100}%`, width: `${(item.w / opt.printSize.w) * 100}%`, height: `${(item.h / opt.printSize.h) * 100}%` }}/>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="mx-5 mb-4 flex gap-2 justify-end">
                        <button onClick={() => copyToClipboard(getQuoteText(opt))} className="bg-white p-1.5 px-3 text-[10px] font-bold rounded shadow hover:bg-indigo-50 text-indigo-600 border flex items-center gap-1"><Copy size={12}/> Copy báo giá</button>
                        <button onClick={() => setCreateOrderOpt(opt)} className="bg-emerald-600 p-1.5 px-3 text-[10px] font-bold rounded shadow hover:bg-emerald-700 text-white flex items-center gap-1"><Check size={12}/> Tạo đơn</button>
                      </div>
                    </div>
                  ))}
                  </>
                )}
              </div>
            </div>
          )}
          {activeTab === 'machines' && (
            <div className="space-y-6">
              {/* Config */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Settings size={18} className="text-indigo-600"/> Cấu Hình Chung</h2>
                </div>
                
                {/* Thông số cơ bản */}
                <div className="p-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Giá Cán Màng</label>
                      <div className="flex items-center gap-1">
                        <input type="number" value={config.laminationPrice} onChange={(e) => setConfig({...config, laminationPrice: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white"/>
                        <span className="text-xs text-slate-400 whitespace-nowrap">đ/m²</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Lợi Nhuận</label>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} className="text-green-500"/>
                        <input type="number" value={config.profitMargin} onChange={(e) => setConfig({...config, profitMargin: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white" placeholder="0"/>
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Khổ Cắt Max</label>
                      <div className="flex items-center gap-1">
                        <input type="number" value={config.maxCutWidth} onChange={(e) => setConfig({...config, maxCutWidth: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white" placeholder="0"/>
                        <span className="text-xs text-slate-400">mm</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1">0 = Không giới hạn</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Khổ In Min</label>
                      <div className="flex items-center gap-1">
                        <input type="number" value={config.minPrintSize} onChange={(e) => setConfig({...config, minPrintSize: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white" placeholder="250"/>
                        <span className="text-xs text-slate-400">mm</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Waste Configuration */}
                <div className="px-5 pb-5">
                  <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
                    <h3 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                      <AlertTriangle size={14}/>
                      Cấu hình Lượt In Hỏng (Waste)
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-md border border-orange-100">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Số tờ cố định</label>
                        <div className="flex items-center gap-1">
                          <input type="number" value={config.wasteBase} onChange={(e) => setConfig({...config, wasteBase: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded font-mono font-bold text-slate-700" placeholder="50"/>
                          <span className="text-xs text-slate-400">tờ</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-md border border-orange-100">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">% Hỏng In 1 Mặt</label>
                        <div className="flex items-center gap-1">
                          <input type="number" step="0.1" value={config.wastePercent1Side} onChange={(e) => setConfig({...config, wastePercent1Side: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded font-mono font-bold text-slate-700" placeholder="2"/>
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-md border border-orange-100">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">% Hỏng In 2 Mặt</label>
                        <div className="flex items-center gap-1">
                          <input type="number" step="0.1" value={config.wastePercent2Side} onChange={(e) => setConfig({...config, wastePercent2Side: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded font-mono font-bold text-slate-700" placeholder="3"/>
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-orange-700 bg-orange-100/50 px-3 py-2 rounded">
                      <b>Công thức:</b> Waste = {config.wasteBase} + (Số tờ × {inputs.printSides === 2 ? config.wastePercent2Side : config.wastePercent1Side}%)
                    </div>
                  </div>
                </div>

                {/* Gia công khác */}
                <div className="px-5 pb-5">
                  <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                    <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                      <Scissors size={14}/>
                      Gia Công Khác (Giá Mặc Định)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {config.defaultFinishings.map((finishing, idx) => (
                        <div key={finishing.type} className="bg-white p-3 rounded-md border border-green-100">
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">{finishing.type}</label>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={finishing.defaultPrice} 
                              onChange={(e) => {
                                const updated = [...config.defaultFinishings];
                                updated[idx] = {...updated[idx], defaultPrice: parseInt(e.target.value) || 0};
                                setConfig({...config, defaultFinishings: updated});
                              }} 
                              className="w-full p-2 border rounded font-mono font-bold text-slate-700 text-sm" 
                              placeholder="0"
                            />
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">đ/{finishing.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-green-600 bg-green-100/50 px-3 py-2 rounded">
                      💡 Thiết lập giá mặc định cho các loại gia công. Giá này sẽ được áp dụng khi thêm gia công trong phần tính giá.
                    </p>
                  </div>
                </div>
              </div>
              {/* Machines */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Cog size={18}/> Danh Sách Máy In</h2>
                  <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Tổng: <b>{machines.length}</b></span>
                </div>
                <div className="divide-y divide-slate-100">
                  {machines.map(m => (
                    <div key={m.id} className={`p-4 ${editingMachineId === m.id ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'hover:bg-slate-50'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">{m.name}</h4>
                          <p className="text-xs text-slate-500">Khổ max: {m.maxWidth} x {m.maxHeight}mm | Base: {m.baseQty.toLocaleString()} lượt</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditMachine(m)} className={`p-1.5 rounded ${editingMachineId === m.id ? 'bg-indigo-600 text-white' : 'text-indigo-500 hover:bg-indigo-100'}`} title="Sửa"><Settings size={14}/></button>
                          <button onClick={() => handleDeleteMachine(m.id)} className="text-red-400 hover:text-red-600 p-1.5" title="Xóa"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {m.colorPricing.map(p => (
                          <div key={p.colors} className="bg-white p-2 rounded border text-center min-w-[100px]">
                            <div className="text-[10px] font-bold text-indigo-600 uppercase">{p.colors} màu</div>
                            <div className="text-sm font-bold text-slate-800">{formatVND(p.basePrice)}</div>
                            <div className="text-[9px] text-slate-400">+{formatVND(p.excessPrice)}/vượt</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {machines.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <Cog size={32} className="mx-auto mb-2 opacity-30"/>
                      <p>Chưa có máy in nào</p>
                    </div>
                  )}
                </div>
                {/* Machine Form - Add/Edit */}
                <div className="bg-slate-50 p-6 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      {editingMachineId ? <><Settings size={16}/> Sửa Máy In</> : <><Plus size={16}/> Thêm Máy Mới</>}
                    </h3>
                    {editingMachineId && (
                      <button onClick={resetMachineForm} className="text-xs text-slate-500 hover:text-slate-700">Hủy sửa</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end mb-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tên Máy</label>
                      <input type="text" className="w-full p-2 border rounded" placeholder="VD: Máy 4 màu 65x90" value={machineForm.name} onChange={(e) => setMachineForm({...machineForm, name: e.target.value})}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rộng max (mm)</label>
                      <input type="number" className="w-full p-2 border rounded" value={machineForm.maxWidth} onChange={(e) => setMachineForm({...machineForm, maxWidth: e.target.value})}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cao max (mm)</label>
                      <input type="number" className="w-full p-2 border rounded" value={machineForm.maxHeight} onChange={(e) => setMachineForm({...machineForm, maxHeight: e.target.value})}/>
                    </div>
                  </div>
                  {/* Dynamic Color Pricing */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Bảng giá theo số màu</label>
                      <button onClick={addColorPricing} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold hover:bg-indigo-200 flex items-center gap-1">
                        <Plus size={12}/> Thêm mức giá
                      </button>
                    </div>
                    {machineForm.colorPricing.length === 0 ? (
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded text-center text-slate-400 text-sm">
                        Chưa có mức giá nào. Nhấn "Thêm mức giá" để bắt đầu.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {machineForm.colorPricing.map((cp, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded border">
                            <div className="w-20">
                              <label className="text-[9px] text-slate-400 block">Số màu</label>
                              <input type="number" min="1" className="w-full p-1.5 border rounded text-sm font-bold text-center" value={cp.colors} 
                                onChange={(e) => updateColorPricing(idx, 'colors', e.target.value)}/>
                            </div>
                            <div className="flex-1">
                              <label className="text-[9px] text-slate-400 block">Giá base (1000 lượt đầu)</label>
                              <input type="number" placeholder="VD: 500000" className="w-full p-1.5 border rounded text-sm" value={cp.basePrice} 
                                onChange={(e) => updateColorPricing(idx, 'basePrice', e.target.value)}/>
                            </div>
                            <div className="flex-1">
                              <label className="text-[9px] text-slate-400 block">Giá vượt (mỗi lượt)</label>
                              <input type="number" placeholder="VD: 100" className="w-full p-1.5 border rounded text-sm" value={cp.excessPrice}
                                onChange={(e) => updateColorPricing(idx, 'excessPrice', e.target.value)}/>
                            </div>
                            <button onClick={() => removeColorPricing(idx)} className="text-red-400 hover:text-red-600 p-1 mt-4"><XCircle size={18}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingMachineId && <button onClick={resetMachineForm} className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100">Hủy</button>}
                    <button onClick={handleSaveMachine} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow flex items-center gap-2">
                      <Save size={16}/> {editingMachineId ? 'Cập nhật' : 'Thêm máy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PriceCalculatorOffset;
