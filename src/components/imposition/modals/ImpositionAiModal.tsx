import React from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { ImpositionConfig, PageItem } from '../types';

export interface ImpositionAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  aiLoading: boolean;
  handleAiArrange: () => void;
  allPages: PageItem[];
  aiPreviewPages: PageItem[];
  previewKey: number;
  config: ImpositionConfig;
  backgroundColor: string;
  aiResult: any;
  applyAiResult: () => void;
}

export const ImpositionAiModal: React.FC<ImpositionAiModalProps> = ({
  isOpen,
  onClose,
  aiPrompt,
  setAiPrompt,
  aiLoading,
  handleAiArrange,
  allPages,
  aiPreviewPages,
  previewKey,
  config,
  backgroundColor,
  aiResult,
  applyAiResult
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <h3 className="font-medium text-lg">AI Sắp xếp thông minh</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b bg-amber-50">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !aiLoading && handleAiArrange()}
              placeholder="Nhập lệnh: Mỗi ảnh in 5 lần, In 100 tem mỗi loại, Tự động xoay ảnh, Đảo ngược thứ tự..."
              className="flex-1 border-2 border-amber-300 rounded-lg px-4 py-3 text-sm focus:border-amber-500 focus:outline-none"
              disabled={aiLoading}
              autoFocus
            />
            <button 
              type="button"
              onClick={handleAiArrange}
              disabled={aiLoading || !aiPrompt.trim()}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {aiLoading ? 'Đang xử lý...' : 'Xử lý'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Before */}
          <div className="flex-1 p-4 border-r overflow-y-auto">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              Trước ({allPages.length} trang)
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {allPages.slice(0, 20).map((page, idx) => (
                <div key={`before-${idx}-${previewKey}`} className="bg-gray-100 rounded overflow-hidden border">
                  <div className="h-12 flex items-center justify-center" style={config.fitMode === 'actual' ? { backgroundColor: backgroundColor } : {}}>
                    <img 
                      src={page.thumb} 
                      alt="" 
                      className="max-w-full max-h-full object-contain" 
                      style={{ transform: `rotate(${page.rotation}deg)` }} 
                      loading="lazy" 
                    />
                  </div>
                  <div className="text-center text-[9px] py-0.5 bg-gray-200 font-medium">{idx + 1}</div>
                </div>
              ))}
              {allPages.length > 20 && <div className="col-span-4 text-center text-xs text-gray-400 py-2">+{allPages.length - 20} trang khác...</div>}
            </div>
          </div>

          {/* After */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Sau ({aiPreviewPages.length > 0 ? aiPreviewPages.length : '-'} trang)
            </h4>
            {aiResult ? (
              <>
                <div className="mb-3 p-2 bg-green-100 rounded-lg text-sm text-green-700 font-medium">
                  ✅ {aiResult.explanation}
                </div>
                
                {aiResult.action === 'layout_config' && aiResult.configChanges && (() => {
                  const changes = aiResult.configChanges as any;
                  return (
                    <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <h5 className="text-xs font-medium text-amber-700 mb-2">Thay đổi cấu hình:</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {changes._dataMode !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Chế độ:</span>
                            <span className="font-medium text-amber-700">
                              {changes._dataMode === 1 ? 'Mỗi ảnh 1 tem' : 
                               changes._dataMode === 4 ? 'X-Up' : 'Số lượng chuẩn'}
                            </span>
                          </div>
                        )}
                        {changes._xUpQty !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">X-Up:</span>
                            <span className="font-medium text-amber-700">{changes._xUpQty}</span>
                          </div>
                        )}
                        {changes._standardQty !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Số lượng chuẩn:</span>
                            <span className="font-medium text-amber-700">{changes._standardQty}</span>
                          </div>
                        )}
                        {changes.autoRotate !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tự động xoay:</span>
                            <span className="font-medium text-amber-700">{changes.autoRotate ? 'Bật' : 'Tắt'}</span>
                          </div>
                        )}
                        {changes.fitMode !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Chế độ fit:</span>
                            <span className="font-medium text-amber-700">{changes.fitMode}</span>
                          </div>
                        )}
                        {changes.totalOrder !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Số lượng đơn:</span>
                            <span className="font-medium text-amber-700">{changes.totalOrder}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                {aiResult.action !== 'layout_config' && (
                  <div className="grid grid-cols-4 gap-2">
                    {aiPreviewPages.slice(0, 20).map((page, idx) => (
                      <div key={`after-${idx}-${previewKey}`} className="bg-green-50 rounded overflow-hidden border-2 border-green-300">
                        <div className="h-12 flex items-center justify-center" style={config.fitMode === 'actual' ? { backgroundColor: backgroundColor } : {}}>
                          <img 
                            src={page.thumb} 
                            alt="" 
                            className="max-w-full max-h-full object-contain" 
                            style={{ transform: `rotate(${page.rotation}deg)` }} 
                            loading="lazy" 
                          />
                        </div>
                        <div className="text-center text-[9px] py-0.5 bg-green-200 font-medium text-green-700">{idx + 1}</div>
                      </div>
                    ))}
                    {aiPreviewPages.length > 20 && <div className="col-span-4 text-center text-xs text-gray-400 py-2">+{aiPreviewPages.length - 20} trang khác...</div>}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Sparkles size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nhập lệnh và nhấn "Xử lý" để xem kết quả</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 border rounded-lg font-medium hover:bg-gray-100 cursor-pointer">
            Hủy
          </button>
          <button 
            type="button"
            onClick={applyAiResult}
            disabled={aiPreviewPages.length === 0}
            className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <Check size={18} />
            Áp dụng thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};
