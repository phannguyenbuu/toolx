import React from 'react';
import {
  Type,
  Square,
  Image as ImageIcon,
  QrCode,
  ScanLine,
  Images,
  Database,
  Hash
} from 'lucide-react';
import { ElementType } from '../types';

export interface LabelDesignerLeftToolbarProps {
  addElement: (type: ElementType) => void;
  setIsDataModalOpen: (open: boolean) => void;
  setIsMediaModalOpen: (open: boolean) => void;
  setIsNumberingModalOpen: (open: boolean) => void;
}

export const LabelDesignerLeftToolbar: React.FC<LabelDesignerLeftToolbarProps> = ({
  addElement,
  setIsDataModalOpen,
  setIsMediaModalOpen,
  setIsNumberingModalOpen
}) => {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
      {/* Add Elements */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex flex-col gap-1">
        <button
          onClick={() => addElement('text')}
          title="Thêm Text (T)"
          className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors"
        >
          <Type size={18} />
        </button>
        <button
          onClick={() => addElement('box')}
          title="Thêm Box"
          className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors"
        >
          <Square size={18} />
        </button>
        <button
          onClick={() => addElement('image')}
          title="Thêm Hình ảnh"
          className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors"
        >
          <ImageIcon size={18} />
        </button>
        <button
          onClick={() => addElement('qr')}
          title="Thêm QR Code"
          className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors"
        >
          <QrCode size={18} />
        </button>
        <button
          onClick={() => addElement('barcode')}
          title="Thêm Barcode"
          className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors"
        >
          <ScanLine size={18} />
        </button>
        <button
          onClick={() => addElement('img-data')}
          title="Thêm Ảnh từ Data"
          className="w-10 h-10 rounded flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition-colors"
        >
          <Images size={18} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-300 mx-2" />

      {/* Tools */}
      <button
        onClick={() => setIsDataModalOpen(true)}
        title="Quản lý Data"
        className="w-11 h-11 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 border border-gray-200 transition-colors"
      >
        <Database size={20} />
      </button>
      <button
        onClick={() => setIsMediaModalOpen(true)}
        title="Quản lý Media"
        className="w-11 h-11 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 border border-gray-200 transition-colors"
      >
        <Images size={20} />
      </button>
      <button
        onClick={() => setIsNumberingModalOpen(true)}
        title="Số nhảy"
        className="w-11 h-11 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-violet-50 hover:text-violet-600 border border-gray-200 transition-colors"
      >
        <Hash size={20} />
      </button>
    </div>
  );
};
