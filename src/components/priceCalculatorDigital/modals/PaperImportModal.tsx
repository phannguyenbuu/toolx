import React, { useRef, useMemo } from 'react';
import { Database, X, Upload, Link, RefreshCw, AlertTriangle, Table, ChevronDown, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Paper } from '../../../utils/calculatorTypes';
import { ImportState, ColumnMapping } from '../types';
import { formatVND } from '../helpers';

interface PaperImportModalProps {
  importState: ImportState;
  setImportState: React.Dispatch<React.SetStateAction<ImportState>>;
  onImport: (papers: Paper[]) => void;
}

export const PaperImportModal: React.FC<PaperImportModalProps> = ({
  importState,
  setImportState,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect column mapping based on header names
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = { type: '', size: '', gsm: '', price: '' };
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

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

    setImportState((prev) => ({ ...prev, isLoading: true, error: '' }));

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error('File không có dữ liệu hoặc chỉ có header');
      }

      const headers = jsonData[0].map((h) => String(h || ''));
      const rawData = jsonData.slice(1).filter((row) => row.some((cell) => cell != null && cell !== ''));
      const mapping = autoDetectMapping(headers);

      setImportState((prev) => ({
        ...prev,
        source: 'file',
        headers,
        rawData: rawData.map((row) => row.map((cell) => String(cell || ''))),
        mapping,
        step: 'mapping',
        isLoading: false
      }));
    } catch (err) {
      setImportState((prev) => ({
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
      setImportState((prev) => ({ ...prev, error: 'Vui lòng nhập URL Google Sheet' }));
      return;
    }

    // Convert edit URL to export CSV URL
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch) {
      url = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
    }

    setImportState((prev) => ({ ...prev, isLoading: true, error: '' }));

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

      const headers = jsonData[0].map((h) => String(h || ''));
      const rawData = jsonData.slice(1).filter((row) => row.some((cell) => cell != null && cell !== ''));
      const mapping = autoDetectMapping(headers);

      setImportState((prev) => ({
        ...prev,
        source: 'url',
        headers,
        rawData: rawData.map((row) => row.map((cell) => String(cell || ''))),
        mapping,
        step: 'mapping',
        isLoading: false
      }));
    } catch (err) {
      setImportState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Lỗi tải dữ liệu'
      }));
    }
  };

  const getColIndex = (colName: string): number => {
    return importState.headers.indexOf(colName);
  };

  const convertToPapers = (): Paper[] => {
    const { mapping, rawData } = importState;
    const typeIdx = getColIndex(mapping.type);
    const sizeIdx = getColIndex(mapping.size);
    const gsmIdx = getColIndex(mapping.gsm);
    const priceIdx = getColIndex(mapping.price);

    const papers: Paper[] = [];
    let lastType = '';

    rawData.forEach((row) => {
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

  const handleConfirmImport = () => {
    const papers = convertToPapers();
    if (papers.length === 0) {
      setImportState((prev) => ({ ...prev, error: 'Không có dữ liệu hợp lệ để import' }));
      return;
    }
    onImport(papers);
    setImportState((prev) => ({ ...prev, isOpen: false, step: 'input' }));
  };

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
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-teal-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Database size={18} className="text-blue-600" />
            Import Bảng Giá Giấy
          </h3>
          <button
            onClick={() => setImportState((prev) => ({ ...prev, isOpen: false, step: 'input', error: '' }))}
            className="text-slate-400 hover:text-red-500 cursor-pointer"
          >
            <X size={20} />
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
                  <Upload size={40} className="mx-auto mb-3 text-blue-500" />
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
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow flex items-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
                  >
                    <Upload size={16} /> Chọn File
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-sm text-slate-400 font-medium">HOẶC</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Google Sheet URL */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-start gap-3 mb-4">
                  <Link size={24} className="text-green-600 mt-1" />
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
                    onChange={(e) => setImportState((prev) => ({ ...prev, googleSheetUrl: e.target.value }))}
                    className="flex-1 p-3 border rounded-lg text-sm bg-white"
                  />
                  <button
                    onClick={handleGoogleSheetLoad}
                    disabled={importState.isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {importState.isLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
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
                  <AlertTriangle size={16} /> {importState.error}
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
                  <Table size={16} className="text-blue-600" />
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
                            onChange={(e) =>
                              setImportState((prev) => ({
                                ...prev,
                                mapping: { ...prev.mapping, [field]: e.target.value }
                              }))
                            }
                            className="w-full p-2 pr-8 border rounded-lg bg-white text-sm appearance-none cursor-pointer"
                          >
                            <option value="">-- Chọn cột --</option>
                            {importState.headers.map((h, idx) => (
                              <option key={idx} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {importState.mapping.type &&
                  importState.mapping.size &&
                  importState.mapping.gsm &&
                  importState.mapping.price && (
                    <div className="mt-3 text-xs text-green-600 bg-green-100 px-3 py-2 rounded flex items-center gap-1">
                      <Check size={14} /> Đã chọn đủ các cột bắt buộc
                    </div>
                  )}
              </div>

              {/* Data Preview */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Database size={16} />
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
                    <AlertTriangle size={16} /> Vui lòng chọn đúng các cột để xem dữ liệu
                  </div>
                )}
              </div>

              {/* Error */}
              {importState.error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle size={16} /> {importState.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {importState.step === 'mapping' && importState.rawData.length > 0 && (
              <span>
                Tổng: <b>{importState.rawData.length}</b> dòng dữ liệu
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {importState.step === 'mapping' && (
              <button
                onClick={() => setImportState((prev) => ({ ...prev, step: 'input', error: '' }))}
                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Quay lại
              </button>
            )}
            {importState.step === 'mapping' && previewPapers.length > 0 && (
              <button
                onClick={handleConfirmImport}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow flex items-center gap-2 cursor-pointer"
              >
                <Check size={16} /> Import {convertToPapers().length} dòng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
