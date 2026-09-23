import React from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { SlicingWarningInfo } from './types';

export interface RenderPdfUploadZoneProps {
  cloudFileInputRef: React.RefObject<HTMLInputElement | null>;
  clientPreviewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  cloudFile: File | null;
  cloudFileName: string;
  pdfPageDimensions: string;
  slicingWarning: SlicingWarningInfo | null;
  isDraggingOver: boolean;
  isUploading: boolean;
  effectiveEngine: 'goagent' | 'server';
  localRenderingProgress: string;
  uploadError: string;
  isLightMode: boolean;
  themeCardInner: string;
  themeTextMuted: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RenderPdfUploadZone: React.FC<RenderPdfUploadZoneProps> = ({
  cloudFileInputRef,
  clientPreviewCanvasRef,
  cloudFile,
  cloudFileName,
  pdfPageDimensions,
  slicingWarning,
  isDraggingOver,
  isUploading,
  effectiveEngine,
  localRenderingProgress,
  uploadError,
  isLightMode,
  themeCardInner,
  themeTextMuted,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}) => {
  return (
    <div className="space-y-4">
      {/* Custom Drag & Drop Area */}
      <div
        onClick={() => cloudFileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 relative group ${
          isDraggingOver
            ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/20 scale-[1.01]'
            : isLightMode
            ? 'border-slate-300 bg-slate-50 hover:bg-white hover:border-indigo-400'
            : 'border-slate-700 bg-slate-950/50 hover:bg-slate-950 hover:border-indigo-500'
        }`}
      >
        <input
          ref={cloudFileInputRef}
          type="file"
          accept=".pdf,.dxf,.dwg,.png,.jpg,.jpeg,.tiff,.tif,.webp,.bmp,image/*"
          className="hidden"
          onChange={onFileSelect}
        />
        <div className="space-y-2 pointer-events-none">
          {isDraggingOver ? (
            <div className="py-2">
              <Upload className="w-9 h-9 text-indigo-500 mx-auto animate-bounce" />
              <p className="text-xs font-bold text-indigo-500 mt-1">
                Thả tệp vào đây để tải lên ngay...
              </p>
              <p className={`text-[11px] ${themeTextMuted}`}>Tự động phân tích kích thước và áp dụng cấu hình tối ưu</p>
            </div>
          ) : (
            <>
              <FileText className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mx-auto transition-colors" />
              <p className={`text-xs font-semibold truncate ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                {cloudFileName || 'Kéo thả hoặc nhấn để chọn tệp PDF, CAD hoặc Hình ảnh (Raster)'}
              </p>
              <p className={`text-[11px] ${themeTextMuted}`}>
                Kéo thả trực tiếp từ Explorer (.pdf, .dxf, .dwg, .png, .jpg, .tiff, .webp tối đa 500MB)
              </p>
              {pdfPageDimensions && (
                <p className="text-xs font-semibold text-emerald-500 mt-1">{pdfPageDimensions}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Client-side PDF Preview Canvas */}
      <div className={`p-3 border rounded-xl flex flex-col items-center justify-center ${cloudFileName ? 'block' : 'hidden'} ${themeCardInner}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Xem trước tệp tải lên (Trang 1)</p>
        <canvas ref={clientPreviewCanvasRef} className="max-h-40 rounded shadow border border-slate-700 object-contain"></canvas>

        {/* Cảnh báo cắt dải ảnh (Banding/Slicing Detection) */}
        {slicingWarning && (
          <div className="w-full mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-left space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 flex-wrap">
                  <span>Phát hiện File bị cắt lát ảnh (Banding Slicing)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-normal">
                    {slicingWarning.stripCount} dải / trang
                  </span>
                </p>
                <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  File xuất từ <b className={isLightMode ? 'text-slate-900' : 'text-white'}>{slicingWarning.producer}</b> nên trang in bị băm thành <b>{slicingWarning.stripCount} dải ảnh ngang</b>
                  {slicingWarning.hasIndexed && ' (chứa dải tiêu đề chỉ mục Indexed ColorSpace)'}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <b>Đã Tự Động Kích Hoạt Profile GCR 22% (SWOP v2):</b> Hệ thống tự động thiết lập hệ màu CMYK, GCR 22%, BPC và Single-pass No-Tiling để khử triệt để dải đen đè chữ, hàn gắn {slicingWarning.stripCount} dải ảnh thành 1 bản in liền mạch hoàn hảo khi bạn bấm Render.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Submit Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isUploading || !cloudFile}
          className={`w-full py-3 px-4 font-medium text-xs rounded-xl shadow-xs transition transform active:scale-[0.99] duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40 text-white ${
            effectiveEngine === 'goagent'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/15'
              : 'bg-[#999] hover:bg-[#888]'
          }`}
        >
          {isUploading ? (
            <>
              <RefreshCw size={15} className="animate-spin text-slate-300" />
              <span>{localRenderingProgress || 'Đang kết xuất...'}</span>
            </>
          ) : (
            <>
              {effectiveEngine === 'goagent' ? <Zap size={15} className="text-amber-300" /> : <Upload size={15} />}
              <span>Render</span>
            </>
          )}
        </button>
        {uploadError && (
          <p className="text-xs text-rose-500 font-medium text-center mt-2">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
};
