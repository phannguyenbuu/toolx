import React from 'react';
import { Upload, AlertCircle, Check, X, Wand2, Download } from 'lucide-react';
import { AITool } from '../types';

interface ImageCanvasWorkspaceProps {
  image: string | null;
  zoom: number;
  activeTool: AITool;
  drawMode: 'select' | 'draw';
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrop: (e: React.DragEvent) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  error: string | null;
  setError: (err: string | null) => void;
  success: string | null;
  setSuccess: (msg: string | null) => void;
  showResultActions: boolean;
  setShowResultActions: (show: boolean) => void;
  downloadResult: () => void;
  isProcessing: boolean;
}

export const ImageCanvasWorkspace: React.FC<ImageCanvasWorkspaceProps> = ({
  image,
  zoom,
  activeTool,
  drawMode,
  containerRef,
  canvasRef,
  fileInputRef,
  handleDrop,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  error,
  setError,
  success,
  setSuccess,
  showResultActions,
  setShowResultActions,
  downloadResult,
  isProcessing
}) => {
  return (
    <div className="flex-1 min-w-0 flex flex-col relative">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 50% / 20px 20px'
        }}
      >
        {image ? (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              transition: 'transform 0.1s ease-out'
            }}
          >
            <canvas
              ref={canvasRef}
              className="shadow-xl bg-white"
              style={{
                cursor:
                  activeTool === 'inpaint' && drawMode === 'draw'
                    ? 'crosshair'
                    : 'default'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        ) : (
          <div
            className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">Kéo thả ảnh vào đây</p>
              <p className="text-sm text-gray-400 mt-1">hoặc click để chọn file</p>
              <p className="text-xs text-gray-400 mt-2">Hỗ trợ: JPG, PNG</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success with Download Button */}
      {success && (
        <div className="mx-4 mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <Check size={18} />
            <span className="text-sm font-medium">{success}</span>
            <button
              onClick={() => {
                setSuccess(null);
                setShowResultActions(false);
              }}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <X size={16} />
            </button>
          </div>
          {showResultActions && (
            <button
              onClick={downloadResult}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={22} />
              Tải ảnh kết quả
            </button>
          )}
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 rounded-full" />
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
              <Wand2
                size={24}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-500"
              />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 text-lg">Đang xử lý AI...</p>
              <p className="text-sm text-gray-500 mt-1">Vui lòng chờ trong giây lát</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full animate-pulse"
                style={{ width: '70%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
