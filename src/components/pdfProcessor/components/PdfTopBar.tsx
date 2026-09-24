import React from 'react';
import { FileText, RotateCcw, Upload, FileDown, Download } from 'lucide-react';

interface PdfTopBarProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onSavePdf: (mode: 'single' | 'all') => void;
}

export const PdfTopBar: React.FC<PdfTopBarProps> = ({
  fileInputRef,
  onFileChange,
  onReset,
  onSavePdf
}) => {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm shrink-0">
      <div className="flex items-center gap-2 font-bold text-slate-800">
        <FileText className="text-blue-600" size={20} />
        <span className="text-sm">PDF Studio</span>
      </div>
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef as any}
          accept="application/pdf"
          className="hidden"
          onChange={onFileChange}
        />
        <button
          onClick={onReset}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded font-medium text-xs flex items-center gap-1.5 border border-gray-300 transition cursor-pointer"
          title="Làm mới - Xóa tất cả và bắt đầu lại"
        >
          <RotateCcw size={14} /> Làm mới
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium text-xs flex items-center gap-1.5 border border-blue-200 transition cursor-pointer"
        >
          <Upload size={14} /> Mở PDF
        </button>
        <button
          onClick={() => onSavePdf('single')}
          className="px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded font-medium text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <FileDown size={14} /> Xuất Trang Này
        </button>
        <button
          onClick={() => onSavePdf('all')}
          className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded font-medium text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <Download size={16} /> Xuất Tất Cả
        </button>
      </div>
    </div>
  );
};
