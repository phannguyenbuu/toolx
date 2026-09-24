import React from 'react';
import {
  Upload,
  ZoomOut,
  ZoomIn,
  Maximize,
  RotateCcw,
  Download,
  RefreshCw
} from 'lucide-react';

interface CanvasToolbarProps {
  image: string | null;
  originalImage: string | null;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  fitToScreen: () => void;
  resetImage: () => void;
  downloadResult: () => void;
  fullReset: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  image,
  originalImage,
  zoom,
  setZoom,
  fitToScreen,
  resetImage,
  downloadResult,
  fullReset,
  handleFileUpload,
  fileInputRef
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-all"
      >
        <Upload size={18} />
        Tải ảnh
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        title="Thu nhỏ"
      >
        <ZoomOut size={18} />
      </button>
      <span className="text-sm text-gray-500 w-14 text-center font-mono">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        title="Phóng to"
      >
        <ZoomIn size={18} />
      </button>
      <button
        onClick={fitToScreen}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        title="Vừa màn hình"
      >
        <Maximize size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={resetImage}
        disabled={!originalImage || image === originalImage}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-50"
        title="Khôi phục ảnh gốc"
      >
        <RotateCcw size={18} />
      </button>

      <button
        onClick={downloadResult}
        disabled={!image}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-50"
        title="Tải xuống"
      >
        <Download size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={fullReset}
        disabled={!image}
        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
        title="Làm mới - Xóa tất cả"
      >
        <RefreshCw size={16} />
        Làm mới
      </button>
    </div>
  );
};
