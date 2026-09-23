import React, { useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Link,
  RefreshCw,
  Download,
  FileDown,
  Trash2
} from 'lucide-react';
import { SheetRow } from '../types';

export interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataHeaders: string[];
  dataRows: SheetRow[];
  currentRowIndex: number;
  googleSheetUrl: string;
  setGoogleSheetUrl: (url: string) => void;
  isLoadingSheet: boolean;
  handleDataFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleGoogleSheetImport: () => Promise<void>;
  handleExportCSV: () => void;
  updateDataCell: (rowIdx: number, header: string, value: string) => void;
  addDataRow: () => void;
  deleteDataRow: (idx: number) => void;
  addDataColumn: () => void;
}

export const DataTableModal: React.FC<DataTableModalProps> = ({
  isOpen,
  onClose,
  dataHeaders,
  dataRows,
  currentRowIndex,
  googleSheetUrl,
  setGoogleSheetUrl,
  isLoadingSheet,
  handleDataFileUpload,
  handleGoogleSheetImport,
  handleExportCSV,
  updateDataCell,
  addDataRow,
  deleteDataRow,
  addDataColumn
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Quản lý Data</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {dataRows.length} bản ghi · {dataHeaders.length} cột
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-5 border-b bg-gray-50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleDataFileUpload}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-4">
            {/* Excel/CSV Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 px-6 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-violet-400 hover:bg-white text-gray-600 hover:text-violet-600 transition-colors"
            >
              <FileSpreadsheet size={28} />
              <div className="text-center">
                <p className="text-sm font-medium">Tải Excel / CSV</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
              </div>
            </button>

            {/* Google Sheets */}
            <div className="flex flex-col gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Link size={18} className="text-gray-400" />
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
                  className="px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {isLoadingSheet ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <Download size={12} />
                      Import
                    </>
                  )}
                </button>
                <button
                  onClick={handleGoogleSheetImport}
                  disabled={
                    isLoadingSheet || !(googleSheetUrl || '').trim() || dataHeaders.length === 0
                  }
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  title="Cập nhật dữ liệu từ Google Sheets"
                >
                  <RefreshCw size={12} />
                  Cập nhật
                </button>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={dataHeaders.length === 0}
                className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <FileDown size={12} />
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
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-gray-500 font-medium w-10">
                    #
                  </th>
                  {dataHeaders.map(h => (
                    <th
                      key={h}
                      className="border border-gray-200 px-2 py-1.5 text-left text-gray-700 font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="border border-gray-200 px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={idx === currentRowIndex ? 'bg-violet-50' : 'hover:bg-gray-50'}
                  >
                    <td className="border border-gray-200 px-2 py-1 text-gray-400 text-center">
                      {idx + 1}
                    </td>
                    {dataHeaders.map(h => (
                      <td key={h} className="border border-gray-200 px-1 py-0.5">
                        <input
                          type="text"
                          value={row[h] || ''}
                          onChange={e => updateDataCell(idx, h, e.target.value)}
                          className="w-full px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-400 bg-transparent"
                        />
                      </td>
                    ))}
                    <td className="border border-gray-200 px-1 py-1 text-center">
                      <button
                        onClick={() => deleteDataRow(idx)}
                        className="p-0.5 hover:bg-red-100 text-red-400 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <FileSpreadsheet size={40} className="mb-3" />
              <p className="text-sm">Chưa có dữ liệu. Hãy tải file Excel/CSV.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={addDataRow}
              className="px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 transition-colors"
            >
              + Thêm dòng
            </button>
            <button
              onClick={addDataColumn}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              + Thêm cột
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
