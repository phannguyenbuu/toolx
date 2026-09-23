import React from 'react';
import {
  MousePointer2,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2
} from 'lucide-react';

export const TB: React.FC<{
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, active, disabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${
      active ? 'bg-violet-100 text-violet-700' : 'hover:bg-gray-100 text-gray-600'
    }`}
  >
    {children}
  </button>
);

export interface LabelDesignerContextToolbarProps {
  selectionMode: boolean;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  handleZoomFit: () => void;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  gridSize: number;
  setGridSize: (size: number) => void;
  selectedIds: string[];
  alignElements: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeElements: (direction: 'horizontal' | 'vertical') => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
}

export const LabelDesignerContextToolbar: React.FC<LabelDesignerContextToolbarProps> = ({
  selectionMode,
  setSelectionMode,
  zoom,
  setZoom,
  handleZoomFit,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  gridSize,
  setGridSize,
  selectedIds,
  alignElements,
  distributeElements,
  duplicateSelected,
  deleteSelected
}) => {
  return (
    <div className="h-9 bg-white border-b border-gray-200 flex items-center px-2 gap-0.5 shrink-0 shadow-sm">
      <TB
        onClick={() => setSelectionMode(prev => !prev)}
        active={selectionMode}
        title="Chọn vùng (V)"
      >
        <MousePointer2 size={15} />
      </TB>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <TB
        onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
        title="Thu nhỏ (Ctrl + Scroll)"
      >
        <ZoomOut size={15} />
      </TB>
      <button
        onClick={() => setZoom(1)}
        className="px-1.5 text-xs font-mono text-gray-600 hover:bg-gray-100 rounded-md min-w-[44px] text-center"
      >
        {Math.round(zoom * 100)}%
      </button>
      <TB
        onClick={() => setZoom(z => Math.min(5, z + 0.1))}
        title="Phóng to (Ctrl + Scroll)"
      >
        <ZoomIn size={15} />
      </TB>
      <button
        onClick={handleZoomFit}
        className="px-2 py-0.5 text-[10px] font-bold text-violet-600 hover:bg-violet-50 rounded border border-violet-200 ml-0.5"
        title="Fit to screen (F)"
      >
        FIT
      </button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <TB onClick={() => setShowGrid(prev => !prev)} active={showGrid} title="Lưới (G)">
        <LayoutGrid size={15} />
      </TB>
      <TB
        onClick={() => setSnapToGrid(prev => !prev)}
        active={snapToGrid}
        title="Bám lưới (Shift + G)"
      >
        <span className="text-[10px] font-bold px-0.5">SNAP</span>
      </TB>
      <select
        value={gridSize}
        onChange={e => setGridSize(Number(e.target.value))}
        className="text-[11px] border border-gray-200 rounded px-1 py-0.5 ml-0.5 text-gray-600 bg-white"
      >
        <option value={1}>1mm</option>
        <option value={2}>2mm</option>
        <option value={5}>5mm</option>
        <option value={10}>10mm</option>
      </select>

      {selectedIds.length >= 1 && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <TB onClick={() => alignElements('left')} title="Căn trái">
            <AlignLeft size={15} />
          </TB>
          <TB onClick={() => alignElements('center')} title="Căn giữa ngang">
            <AlignCenter size={15} />
          </TB>
          <TB onClick={() => alignElements('right')} title="Căn phải">
            <AlignRight size={15} />
          </TB>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <TB onClick={() => alignElements('top')} title="Căn trên">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="4" y="6" width="6" height="16" rx="2" />
              <rect x="14" y="6" width="6" height="9" rx="2" />
              <path d="M2 2h20" />
            </svg>
          </TB>
          <TB onClick={() => alignElements('middle')} title="Căn giữa dọc">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="4" y="4" width="6" height="16" rx="2" />
              <rect x="14" y="7" width="6" height="10" rx="2" />
              <path d="M2 12h20" />
            </svg>
          </TB>
          <TB onClick={() => alignElements('bottom')} title="Căn dưới">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="4" y="2" width="6" height="16" rx="2" />
              <rect x="14" y="9" width="6" height="9" rx="2" />
              <path d="M2 22h20" />
            </svg>
          </TB>
        </>
      )}

      {selectedIds.length >= 3 && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <TB onClick={() => distributeElements('horizontal')} title="Phân bố ngang">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="4" x2="4" y2="20" />
              <line x1="12" y1="6" x2="12" y2="18" />
              <line x1="20" y1="4" x2="20" y2="20" />
            </svg>
          </TB>
          <TB onClick={() => distributeElements('vertical')} title="Phân bố dọc">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="4" x2="20" y2="4" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="4" y1="20" x2="20" y2="20" />
            </svg>
          </TB>
        </>
      )}

      {selectedIds.length >= 1 && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <TB onClick={duplicateSelected} title="Nhân bản (Ctrl+D)">
            <Copy size={15} />
          </TB>
          <TB onClick={deleteSelected} title="Xóa">
            <Trash2 size={15} />
          </TB>
        </>
      )}
    </div>
  );
};
