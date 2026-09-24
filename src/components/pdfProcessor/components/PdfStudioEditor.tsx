import React from 'react';
import {
  ArrowLeft,
  MousePointer,
  Type,
  Square,
  RotateCw,
  Maximize,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ToolType, PageData } from '../types';
import { FONTS } from '../constants';

interface PdfStudioEditorProps {
  curPageIndex: number | null;
  pagesData: PageData[];
  currentTool: ToolType;
  onSetTool: (tool: ToolType) => void;
  onExitStudio: () => void;
  activeObject: any;
  objColor: string;
  textContent: string;
  selectedFont: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  onUpdateActiveObj: (key: string, value: any) => void;
  onToggleStyle: (style: 'bold' | 'italic' | 'underline') => void;
  onRotateCurrentPage: () => void;
  onAutoFitZoom: () => void;
  onApplyZoom: (delta: number) => void;
  zoom: number;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCloseContextMenu: () => void;
}

export const PdfStudioEditor: React.FC<PdfStudioEditorProps> = ({
  curPageIndex,
  pagesData,
  currentTool,
  onSetTool,
  onExitStudio,
  activeObject,
  objColor,
  textContent,
  selectedFont,
  fontSize,
  isBold,
  isItalic,
  isUnderline,
  onUpdateActiveObj,
  onToggleStyle,
  onRotateCurrentPage,
  onAutoFitZoom,
  onApplyZoom,
  zoom,
  viewportRef,
  canvasRef,
  onCloseContextMenu
}) => {
  const currentRotation =
    curPageIndex !== null ? pagesData[curPageIndex]?.rotation || 0 : 0;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Studio Toolbar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0 shadow-sm relative z-40">
        <button
          onClick={onExitStudio}
          className="text-slate-500 hover:text-blue-600 transition cursor-pointer"
          title="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="h-6 w-px bg-gray-300 mx-2" />

        {/* Tools */}
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1 relative z-50">
          {(['select', 'text', 'rect'] as const).map((tool) => (
            <button
              type="button"
              key={tool}
              onClick={(e) => {
                e.stopPropagation();
                onSetTool(tool);
              }}
              className={`p-2 w-9 h-9 flex items-center justify-center rounded transition cursor-pointer ${
                currentTool === tool
                  ? 'bg-white text-blue-600 shadow-sm ring-2 ring-blue-200'
                  : 'text-gray-500 hover:bg-white hover:text-blue-600'
              }`}
              title={
                tool === 'select'
                  ? 'Chọn (V)'
                  : tool === 'text'
                  ? 'Thêm Chữ (T)'
                  : 'Vẽ Khối/Tẩy (R)'
              }
            >
              {tool === 'select' ? (
                <MousePointer size={16} />
              ) : tool === 'text' ? (
                <Type size={16} />
              ) : (
                <Square size={16} />
              )}
            </button>
          ))}
        </div>

        {/* Properties Panel */}
        {activeObject && (
          <div className="flex items-center gap-3 ml-2 pl-3 border-l border-gray-200">
            <input
              type="color"
              value={objColor}
              onChange={(e) => onUpdateActiveObj('color', e.target.value)}
              className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
            />

            {activeObject.type === 'i-text' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={textContent}
                  onChange={(e) => onUpdateActiveObj('text', e.target.value)}
                  placeholder="Nội dung..."
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={selectedFont}
                  onChange={(e) => onUpdateActiveObj('font', e.target.value)}
                  className="text-xs border border-gray-300 rounded p-1 w-28 h-8 focus:border-blue-500 focus:outline-none"
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => onUpdateActiveObj('size', e.target.value)}
                  className="w-12 border border-gray-300 rounded p-1 text-xs text-center"
                />
                <div className="flex bg-gray-100 p-1 rounded">
                  <button
                    onClick={() => onToggleStyle('bold')}
                    className={`w-6 h-6 text-xs font-bold rounded cursor-pointer ${
                      isBold ? 'bg-blue-600 text-white' : 'hover:bg-white'
                    }`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => onToggleStyle('italic')}
                    className={`w-6 h-6 text-xs italic rounded cursor-pointer ${
                      isItalic ? 'bg-blue-600 text-white' : 'hover:bg-white'
                    }`}
                  >
                    I
                  </button>
                  <button
                    onClick={() => onToggleStyle('underline')}
                    className={`w-6 h-6 text-xs underline rounded cursor-pointer ${
                      isUnderline ? 'bg-blue-600 text-white' : 'hover:bg-white'
                    }`}
                  >
                    U
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onRotateCurrentPage}
            className="p-2 hover:bg-gray-100 rounded text-slate-600 cursor-pointer"
            title="Xoay trang 90°"
          >
            <RotateCw size={18} />
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <button
            onClick={onAutoFitZoom}
            className="p-2 hover:bg-gray-100 rounded text-slate-600 cursor-pointer"
            title="Vừa màn hình"
          >
            <Maximize size={18} />
          </button>
          <div className="flex items-center bg-gray-100 rounded px-2 h-9 border border-gray-200">
            <button
              onClick={() => onApplyZoom(-0.1)}
              className="w-6 hover:text-blue-600 cursor-pointer"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-mono w-10 text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => onApplyZoom(0.1)}
              className="w-6 hover:text-blue-600 cursor-pointer"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={viewportRef as any}
        className="flex-1 overflow-auto flex items-center justify-center p-12"
        style={{ backgroundColor: '#525659' }}
        onClick={onCloseContextMenu}
      >
        <div
          className="shadow-2xl bg-white"
          style={{
            transform: `scale(${zoom}) rotate(${currentRotation}deg)`,
            transformOrigin: 'center center',
            margin: `${20 * zoom}px`
          }}
        >
          <canvas ref={canvasRef as any} id="fabric-canvas" />
        </div>
      </div>
    </div>
  );
};
