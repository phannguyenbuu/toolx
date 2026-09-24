import React from 'react';
import { X, Upload, Link, RefreshCw } from 'lucide-react';

interface ImportPaperModalProps {
  show: boolean;
  onClose: () => void;
  importMode: 'file' | 'sheet';
  setImportMode: (mode: 'file' | 'sheet') => void;
  sheetUrl: string;
  setSheetUrl: (url: string) => void;
  importLoading: boolean;
  onFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSheetImport: () => void;
}

export const ImportPaperModal: React.FC<ImportPaperModalProps> = ({
  show,
  onClose,
  importMode,
  setImportMode,
  sheetUrl,
  setSheetUrl,
  importLoading,
  onFileImport,
  onSheetImport
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Import Bảng Giá Giấy</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => setImportMode('file')}
            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-1 cursor-pointer ${
              importMode === 'file' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
            }`}
          >
            <Upload size={14} /> File Excel/CSV
          </button>
          <button
            onClick={() => setImportMode('sheet')}
            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-1 cursor-pointer ${
              importMode === 'sheet' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
            }`}
          >
            <Link size={14} /> Google Sheet
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded">
          Cần 4 cột theo thứ tự: <b>Loại giấy</b>, <b>Khổ</b> (VD: 650x860), <b>GSM</b>, <b>Giá/tờ</b>. Dòng đầu là tiêu đề.
        </p>
        {importMode === 'file' ? (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <Upload size={32} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-500 mb-3">Chọn file Excel (.xlsx, .xls) hoặc CSV</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileImport} className="text-sm" />
          </div>
        ) : (
          <div className="space-y-3">
            <input
              className="w-full p-2.5 border rounded-lg text-sm"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
            <button
              onClick={onSheetImport}
              disabled={!sheetUrl || importLoading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
            >
              {importLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Đang tải...
                </>
              ) : (
                <>
                  <Upload size={14} /> Tải và Import
                </>
              )}
            </button>
          </div>
        )}
        <p className="text-[10px] text-red-400 mt-3">⚠️ Dữ liệu mới sẽ thay thế toàn bộ bảng giá hiện tại.</p>
      </div>
    </div>
  );
};
