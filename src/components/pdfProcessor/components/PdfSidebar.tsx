import React from 'react';
import {
  Palette,
  Moon,
  FileX,
  Copy,
  Trash2,
  Type,
  Square,
  GripVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ActiveTab, PdfStats } from '../types';

interface PdfSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  stats: PdfStats;
  layers: any[];
  activeObject: any;
  fabricCanvasRef: React.RefObject<any>;
  onLayerAction: (action: 'up' | 'down') => void;
  onDeleteActive: () => void;
  onDeleteCheckedLayers: () => void;
}

export const PdfSidebar: React.FC<PdfSidebarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  layers,
  activeObject,
  fabricCanvasRef,
  onLayerAction,
  onDeleteActive,
  onDeleteCheckedLayers
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 text-sm font-bold transition cursor-pointer ${
            activeTab === 'stats'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Thống Kê
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-3 text-sm font-bold transition cursor-pointer ${
            activeTab === 'layers'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Layers
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* COLOR */}
          <div className="bg-gray-50 p-3 rounded border-l-4 border-red-500 shadow-sm">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
              <span className="flex items-center gap-1">
                <Palette size={12} /> MÀU
              </span>
              <span className="bg-red-100 text-red-600 px-2 rounded">
                {stats.color.length}
              </span>
            </div>
            <div className="flex gap-1">
              <input
                readOnly
                className="flex-1 text-xs font-mono bg-white border p-1.5 rounded"
                value={stats.color.map((p) => p.num).join(',')}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(stats.color.map((p) => p.num).join(','))}
                className="px-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition cursor-pointer"
                title="Copy"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>

          {/* BLACK & WHITE */}
          <div className="bg-gray-50 p-3 rounded border-l-4 border-slate-500 shadow-sm">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
              <span className="flex items-center gap-1">
                <Moon size={12} /> ĐEN TRẮNG
              </span>
              <span className="bg-slate-100 text-slate-600 px-2 rounded">
                {stats.bw.length}
              </span>
            </div>
            <div className="flex gap-1">
              <input
                readOnly
                className="flex-1 text-xs font-mono bg-white border p-1.5 rounded"
                value={stats.bw.map((p) => p.num).join(',')}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(stats.bw.map((p) => p.num).join(','))}
                className="px-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition cursor-pointer"
                title="Copy"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>

          {/* BLANK */}
          <div className="bg-gray-50 p-3 rounded border-l-4 border-yellow-500 shadow-sm">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
              <span className="flex items-center gap-1">
                <FileX size={12} /> TRANG TRẮNG
              </span>
              <span className="bg-yellow-100 text-yellow-600 px-2 rounded">
                {stats.blank.length}
              </span>
            </div>
            <div className="flex gap-1">
              <input
                readOnly
                className="flex-1 text-xs font-mono bg-white border p-1.5 rounded"
                value={stats.blank.map((p) => p.num).join(',')}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(stats.blank.map((p) => p.num).join(','))}
                className="px-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition cursor-pointer"
                title="Copy"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layers Tab */}
      {activeTab === 'layers' && (
        <div className="flex-1 flex flex-col">
          <div className="p-2 bg-gray-50 text-xs text-gray-500 border-b flex justify-between items-center">
            <span>Kéo thả để sắp xếp</span>
            <button
              onClick={onDeleteCheckedLayers}
              className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Xóa chọn
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {layers.length === 0 ? (
              <div className="text-center text-xs text-gray-400 mt-4">Chưa có Layer nào</div>
            ) : (
              layers.map((obj, index) => {
                const isActive =
                  activeObject &&
                  (obj === activeObject ||
                    (activeObject.type === 'activeSelection' &&
                      activeObject.contains?.(obj)));
                const icon =
                  obj.type === 'i-text' ? <Type size={14} /> : <Square size={14} />;
                const name =
                  obj.type === 'i-text'
                    ? obj.text?.substring(0, 20) + (obj.text?.length > 20 ? '...' : '')
                    : 'Khối/Tẩy';

                return (
                  <div
                    key={index}
                    data-idx={index}
                    className={`layer-item p-2 rounded text-sm flex gap-2 items-center cursor-pointer border transition-colors ${
                      isActive
                        ? 'bg-blue-100 border-blue-500 text-blue-600 font-semibold'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      fabricCanvasRef.current?.setActiveObject(obj);
                      fabricCanvasRef.current?.requestRenderAll();
                    }}
                    draggable
                  >
                    <input
                      type="checkbox"
                      className="layer-chk w-4 h-4 accent-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {icon}
                    <span className="flex-1 select-none truncate">{name}</span>
                    <GripVertical size={14} className="text-gray-400" />
                  </div>
                );
              })
            )}
          </div>
          <div className="p-3 border-t border-gray-200 grid grid-cols-3 gap-2 bg-gray-50">
            <button
              onClick={() => onLayerAction('up')}
              className="p-2 bg-white border rounded hover:text-blue-600 transition cursor-pointer"
              title="Đưa lên trên"
            >
              <ArrowUp size={16} className="mx-auto" />
            </button>
            <button
              onClick={() => onLayerAction('down')}
              className="p-2 bg-white border rounded hover:text-blue-600 transition cursor-pointer"
              title="Đưa xuống dưới"
            >
              <ArrowDown size={16} className="mx-auto" />
            </button>
            <button
              onClick={onDeleteActive}
              className="p-2 bg-white border rounded text-red-500 hover:bg-red-50 transition cursor-pointer"
              title="Xóa Layer"
            >
              <Trash2 size={16} className="mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
