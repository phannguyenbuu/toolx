import React from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { ContextMenuState } from '../types';

interface PdfModalsProps {
  isLoading: boolean;
  loadingText: string;
  progress: number;
  contextMenu: ContextMenuState;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState>>;
  onDeleteActive: () => void;
}

export const PdfModals: React.FC<PdfModalsProps> = ({
  isLoading,
  loadingText,
  progress,
  contextMenu,
  setContextMenu,
  onDeleteActive
}) => {
  return (
    <>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/95 z-[9999] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <div className="text-blue-600 font-bold text-lg">{loadingText}</div>
          <div className="w-64 bg-gray-200 rounded-full h-2.5 mt-4 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-[9999] w-40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
          >
            <Pencil size={14} /> Sửa nội dung
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
            onClick={() => {
              onDeleteActive();
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <Trash2 size={14} /> Xóa Object
          </button>
        </div>
      )}
    </>
  );
};
