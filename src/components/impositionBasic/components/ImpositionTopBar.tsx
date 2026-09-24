import React from 'react';
import {
  LayoutGrid,
  RefreshCw,
  Upload,
  FolderOpen,
  Scissors,
  Download,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { ApiStatus } from '../types';

interface ImpositionTopBarProps {
  uploadedFile: File | null;
  apiStatus: ApiStatus;
  isGenerating: boolean;
  progress: number;
  isSaving: boolean;
  hasPlan: boolean;
  onReset: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenFilePicker: () => void;
  onDownloadSvg: () => void;
  onDownloadPdf: () => void;
  onSaveToFileManager: () => void;
  onClose?: () => void;
}

export const ImpositionTopBar: React.FC<ImpositionTopBarProps> = ({
  uploadedFile,
  apiStatus,
  isGenerating,
  progress,
  isSaving,
  hasPlan,
  onReset,
  onFileChange,
  onOpenFilePicker,
  onDownloadSvg,
  onDownloadPdf,
  onSaveToFileManager,
  onClose
}) => {
  return (
    <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <LayoutGrid size={22} />
        </div>
        <div>
          <h1 className="text-lg font-medium">Bình trang đơn</h1>
          <p className="text-violet-200 text-xs">Công cụ xếp hình in ấn</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium cursor-pointer"
          title="Làm mới - Reset tất cả về mặc định"
        >
          <RefreshCw size={14} /> Làm mới
        </button>

        {/* Upload button */}
        <label
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium cursor-pointer"
          title="Tải file lên"
        >
          <Upload size={14} />{' '}
          {uploadedFile
            ? uploadedFile.name.slice(0, 15) + (uploadedFile.name.length > 15 ? '...' : '')
            : 'Upload'}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={onFileChange}
            className="hidden"
          />
        </label>

        {/* Import from File Manager */}
        <button
          onClick={onOpenFilePicker}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium cursor-pointer"
          title="Import từ Quản lý tệp"
        >
          <FolderOpen size={14} /> Import
        </button>

        {/* Download SVG */}
        <button
          onClick={onDownloadSvg}
          disabled={!hasPlan}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer"
          title="Tải SVG cắt"
        >
          <Scissors size={14} /> SVG
        </button>

        {/* Download PDF */}
        <button
          onClick={onDownloadPdf}
          disabled={!hasPlan || !uploadedFile || apiStatus !== 'online' || isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer"
          title="Tải PDF in"
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" /> {progress}%
            </>
          ) : (
            <>
              <Download size={14} /> PDF
            </>
          )}
        </button>

        {/* Save to File Manager */}
        <button
          onClick={onSaveToFileManager}
          disabled={!hasPlan || !uploadedFile || apiStatus !== 'online' || isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer"
          title="Lưu vào Quản lý tệp"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
            </>
          ) : (
            <>
              <Save size={14} /> Lưu tệp
            </>
          )}
        </button>

        {/* Server status indicator */}
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            apiStatus === 'online'
              ? 'bg-emerald-500/20 text-emerald-200'
              : 'bg-red-500/20 text-red-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              apiStatus === 'online' ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          {apiStatus === 'online' ? 'Online' : 'Offline'}
        </span>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </header>
  );
};
