import React from 'react';
import { ImpositionConfig } from '../types';

export interface ImpositionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  confirmDownloadPDF: () => void;
}

export const ImpositionExportModal: React.FC<ImpositionExportModalProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
  confirmDownloadPDF
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-medium mb-4">Tùy chọn xuất PDF</h3>
        
        {/* Page Crop Marks */}
        <div className="border rounded-xl p-4 mb-4">
          <label className="flex items-center justify-between mb-3 cursor-pointer">
            <span className="text-sm font-medium text-blue-600">Đánh dấu góc trang</span>
            <input 
              type="checkbox" 
              checked={config.usePageCrop} 
              onChange={e => setConfig({ ...config, usePageCrop: e.target.checked })} 
              className="rounded text-blue-600 w-5 h-5 cursor-pointer" 
            />
          </label>
          {config.usePageCrop && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Độ dài (mm)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={config.pageCropLen} 
                  onChange={e => setConfig({ ...config, pageCropLen: parseFloat(e.target.value) || 0 })} 
                  className="border rounded px-3 py-2 text-sm w-full" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Khoảng cách (mm)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={config.pageCropDist} 
                  onChange={e => setConfig({ ...config, pageCropDist: parseFloat(e.target.value) || 0 })} 
                  className="border rounded px-3 py-2 text-sm w-full" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Độ dày (mm)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={config.pageCropThick} 
                  onChange={e => setConfig({ ...config, pageCropThick: parseFloat(e.target.value) || 0 })} 
                  className="border rounded px-3 py-2 text-sm w-full" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Màu sắc</label>
                <input 
                  type="color" 
                  value={config.pageCropColor} 
                  onChange={e => setConfig({ ...config, pageCropColor: e.target.value })} 
                  className="border rounded px-1 py-1 w-full h-10 cursor-pointer" 
                />
              </div>
            </div>
          )}
        </div>

        {/* CMYK Color Bar */}
        <div className="border rounded-xl p-4 mb-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-emerald-600">Dải màu CMYK</span>
            <input
              type="checkbox"
              checked={config.useColorBar}
              onChange={e => setConfig({ ...config, useColorBar: e.target.checked })}
              className="rounded text-emerald-600 w-5 h-5 cursor-pointer"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium cursor-pointer"
          >
            Hủy
          </button>
          <button 
            type="button"
            onClick={confirmDownloadPDF} 
            className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium cursor-pointer"
          >
            Tải PDF
          </button>
        </div>
      </div>
    </div>
  );
};
