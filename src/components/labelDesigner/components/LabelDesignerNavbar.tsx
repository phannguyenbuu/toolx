import React from 'react';
import {
  Undo,
  Redo,
  RefreshCw,
  Database,
  Settings,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Upload,
  X
} from 'lucide-react';
import { PageConfig } from '../types';

export interface LabelDesignerNavbarProps {
  historyStep: number;
  historyLength: number;
  handleUndo: () => void;
  handleRedo: () => void;
  handleReset: () => void;
  setIsWorkflowModalOpen: (open: boolean) => void;
  setIsPageConfigModalOpen: (open: boolean) => void;
  setIsSheetConfigModalOpen: (open: boolean) => void;
  pageConfig: PageConfig;
  dataRowsCount: number;
  currentRowIndex: number;
  setCurrentRowIndex: React.Dispatch<React.SetStateAction<number>>;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (open: boolean) => void;
  handleExportPDF: () => Promise<void>;
  handleSaveToFileManager: () => Promise<void>;
  isLoading: boolean;
  onClose?: () => void;
}

export const LabelDesignerNavbar: React.FC<LabelDesignerNavbarProps> = ({
  historyStep,
  historyLength,
  handleUndo,
  handleRedo,
  handleReset,
  setIsWorkflowModalOpen,
  setIsPageConfigModalOpen,
  setIsSheetConfigModalOpen,
  pageConfig,
  dataRowsCount,
  currentRowIndex,
  setCurrentRowIndex,
  isRightPanelOpen,
  setIsRightPanelOpen,
  handleExportPDF,
  handleSaveToFileManager,
  isLoading,
  onClose
}) => {
  return (
    <div className="h-11 bg-gray-900 flex items-center justify-between px-3 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-sm tracking-tight mr-1">Label Designer</span>
        <div className="w-px h-4 bg-gray-600" />
        <button
          onClick={handleUndo}
          disabled={historyStep <= 0}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="p-1.5 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          <Undo size={15} />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyStep >= historyLength - 1}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          className="p-1.5 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          <Redo size={15} />
        </button>
        <div className="w-px h-4 bg-gray-600" />
        <button
          onClick={handleReset}
          title="Đặt lại canvas"
          aria-label="Reset canvas"
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={15} />
        </button>
        <div className="w-px h-4 bg-gray-600" />
        <button
          onClick={() => setIsWorkflowModalOpen(true)}
          title="Quản lý Workflow"
          aria-label="Workflow"
          className="p-1.5 rounded text-blue-400 hover:text-white hover:bg-blue-600 transition-colors"
        >
          <Database size={15} />
        </button>
        <div className="w-px h-4 bg-gray-600" />
        <button
          onClick={() => setIsPageConfigModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors"
        >
          <Settings size={13} />
          {pageConfig.width}x{pageConfig.height}mm
        </button>
        <button
          onClick={() => setIsSheetConfigModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors"
        >
          <LayoutGrid size={13} />
          Khổ giấy
        </button>
      </div>

      <div className="flex items-center gap-2">
        {dataRowsCount > 0 && (
          <div className="flex items-center bg-gray-800 rounded-md border border-gray-700">
            <button
              disabled={currentRowIndex === 0}
              onClick={() => setCurrentRowIndex(p => p - 1)}
              className="px-2 py-1 text-gray-300 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 text-xs font-mono text-gray-200 border-x border-gray-700">
              {currentRowIndex + 1} / {dataRowsCount}
            </span>
            <button
              disabled={currentRowIndex === dataRowsCount - 1}
              onClick={() => setCurrentRowIndex(p => p + 1)}
              className="px-2 py-1 text-gray-300 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        <button
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          {isRightPanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          <Download size={14} />
          {isLoading ? 'Đang xuất...' : 'Xuất PDF'}
        </button>
        <button
          onClick={handleSaveToFileManager}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          <Upload size={14} />
          {isLoading ? 'Đang lưu...' : 'Lưu vào Tệp'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            title="Đóng"
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ml-1"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
