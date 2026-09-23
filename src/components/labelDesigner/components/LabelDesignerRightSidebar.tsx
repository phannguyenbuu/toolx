import React from 'react';
import {
  Trash2,
  MousePointer2,
  ArrowUpToLine,
  MoveUp,
  MoveDown,
  ArrowDownToLine,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { ElementData } from '../types';
import { PropertiesPanel } from '../../PropertiesPanel';
import { loadBrowserFont } from '../fontLoader';

export interface LabelDesignerRightSidebarProps {
  isOpen: boolean;
  selectedElement: ElementData | null;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  elements: ElementData[];
  setElements: React.Dispatch<React.SetStateAction<ElementData[]>>;
  availableFonts: string[];
  dataHeaders: string[];
  updateElement: (id: string, updates: Partial<ElementData>) => void;
  deleteSelected: () => void;
  moveZIndex: (direction: 'front' | 'back' | 'up' | 'down') => void;
  saveToHistory: (elements: ElementData[]) => void;
}

export const LabelDesignerRightSidebar: React.FC<LabelDesignerRightSidebarProps> = ({
  isOpen,
  selectedElement,
  selectedIds,
  setSelectedIds,
  elements,
  setElements,
  availableFonts,
  dataHeaders,
  updateElement,
  deleteSelected,
  moveZIndex,
  saveToHistory
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-gray-100 shrink-0">
        <span className="text-xs font-semibold text-gray-700">
          {selectedElement ? `${selectedElement.type.toUpperCase()}` : 'Properties'}
        </span>
        {selectedElement && (
          <button
            onClick={deleteSelected}
            className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors"
            title="Xóa"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-hidden">
        {selectedElement ? (
          <PropertiesPanel
            element={selectedElement}
            availableFonts={availableFonts}
            dataHeaders={dataHeaders}
            onUpdate={updateElement}
            onLoadFont={loadBrowserFont}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MousePointer2 size={32} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">No element selected</p>
            <p className="text-xs mt-1">Click an element to edit properties</p>
          </div>
        )}
      </div>

      {/* LAYERS PANEL */}
      <div className="border-t border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Layers ({elements.length})
          </span>
          <div className="flex gap-0.5">
            <button
              onClick={() => moveZIndex('front')}
              disabled={selectedIds.length !== 1}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
              title="Lên trên cùng"
            >
              <ArrowUpToLine size={11} />
            </button>
            <button
              onClick={() => moveZIndex('up')}
              disabled={selectedIds.length !== 1}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
              title="Lên 1 lớp"
            >
              <MoveUp size={11} />
            </button>
            <button
              onClick={() => moveZIndex('down')}
              disabled={selectedIds.length !== 1}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
              title="Xuống 1 lớp"
            >
              <MoveDown size={11} />
            </button>
            <button
              onClick={() => moveZIndex('back')}
              disabled={selectedIds.length !== 1}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
              title="Xuống dưới cùng"
            >
              <ArrowDownToLine size={11} />
            </button>
          </div>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 200 }}>
          {[...elements].reverse().map((el, idx) => {
            const actualIndex = elements.length - 1 - idx;
            return (
              <div
                key={el.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('layerIndex', actualIndex.toString());
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={e => {
                  e.preventDefault();
                  const from = parseInt(e.dataTransfer.getData('layerIndex'), 10);
                  if (from === actualIndex) return;
                  const arr = [...elements];
                  const [moved] = arr.splice(from, 1);
                  arr.splice(actualIndex, 0, moved);
                  setElements(arr);
                  saveToHistory(arr);
                }}
                onClick={() => setSelectedIds([el.id])}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-grab hover:bg-gray-50 transition-colors ${
                  selectedIds.includes(el.id)
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-600'
                }`}
              >
                <GripVertical size={11} className="text-gray-300 shrink-0" />
                <span className="flex-1 truncate">
                  {el.type}: {el.content?.slice(0, 12) || el.id.slice(0, 6)}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    updateElement(el.id, { isVisible: !el.isVisible });
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded shrink-0"
                >
                  {el.isVisible !== false ? (
                    <Eye size={11} />
                  ) : (
                    <EyeOff size={11} className="text-gray-300" />
                  )}
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    updateElement(el.id, { isLocked: !el.isLocked });
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded shrink-0"
                >
                  {el.isLocked ? <Lock size={11} className="text-amber-500" /> : <Unlock size={11} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
