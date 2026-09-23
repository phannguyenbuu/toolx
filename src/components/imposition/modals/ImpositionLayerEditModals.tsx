import React from 'react';
import { X, Check, AlertTriangle, Save } from 'lucide-react';
import { ShapeTabItem, LAYER_COLOR_PRESETS, ImpositionHistoryItem } from '../types';

export interface ImpositionLayerEditModalsProps {
  editingLayerModalTab: ShapeTabItem | null;
  setEditingLayerModalTab: (tab: ShapeTabItem | null) => void;
  layerModalName: string;
  setLayerModalName: (name: string) => void;
  layerModalColor: string;
  setLayerModalColor: (color: string) => void;
  handleSaveLayerModal: () => void;
  isScaleModalOpen: boolean;
  setIsScaleModalOpen: (open: boolean) => void;
  customScale: number;
  setCustomScale: (scale: number) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  isUnsavedWarningModalOpen: boolean;
  setIsUnsavedWarningModalOpen: (open: boolean) => void;
  pendingHistoryToLoad: ImpositionHistoryItem | null;
  setPendingHistoryToLoad: (item: ImpositionHistoryItem | null) => void;
  applyHistoryItem: (item: ImpositionHistoryItem) => void;
  saveToFileManager: (silent?: boolean) => Promise<boolean>;
}

export const ImpositionLayerEditModals: React.FC<ImpositionLayerEditModalsProps> = ({
  editingLayerModalTab,
  setEditingLayerModalTab,
  layerModalName,
  setLayerModalName,
  layerModalColor,
  setLayerModalColor,
  handleSaveLayerModal,
  isScaleModalOpen,
  setIsScaleModalOpen,
  customScale,
  setCustomScale,
  backgroundColor,
  setBackgroundColor,
  isUnsavedWarningModalOpen,
  setIsUnsavedWarningModalOpen,
  pendingHistoryToLoad,
  setPendingHistoryToLoad,
  applyHistoryItem,
  saveToFileManager
}) => {
  return (
    <>
      {/* Edit Layer Modal Toast (Tên & Màu sắc của Layer) */}
      {editingLayerModalTab && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setEditingLayerModalTab(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-[340px] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs font-bold text-xs"
                  style={{ backgroundColor: layerModalColor }}
                >
                  {layerModalName.slice(0, 1).toUpperCase() || 'L'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Thuộc tính Layer</h4>
                  <span className="text-[10px] text-slate-400">Đổi tên & màu nhận diện</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLayerModalTab(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Input: Tên Layer */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>Tên Layer</span>
                <span className="text-[9px] text-slate-400 font-normal">Tối đa 20 ký tự</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={layerModalName}
                  onChange={(e) => setLayerModalName(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLayerModal();
                    if (e.key === 'Escape') setEditingLayerModalTab(null);
                  }}
                  autoFocus
                  placeholder="Ví dụ: A, Tem tròn, Nhãn chai..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-500 bg-slate-50/50 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Color Swatches Palette */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>Màu đại diện</span>
                <span className="text-[10px] font-mono text-slate-500 font-medium uppercase">{layerModalColor}</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                {LAYER_COLOR_PRESETS.map((col) => {
                  const isSelected = layerModalColor.toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setLayerModalColor(col)}
                      className={`w-9 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center relative shadow-2xs hover:scale-105 active:scale-95 ${
                        isSelected ? 'ring-2 ring-offset-2 ring-slate-800 shadow-sm scale-105' : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: col }}
                      title={col}
                    >
                      {isSelected && <Check size={14} className="text-white drop-shadow-sm stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium">Màu tùy chỉnh:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex-1">
                  <input
                    type="color"
                    value={layerModalColor}
                    onChange={(e) => setLayerModalColor(e.target.value)}
                    className="w-5 h-5 rounded-md border-0 p-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={layerModalColor}
                    onChange={(e) => setLayerModalColor(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-mono font-medium text-slate-700 uppercase focus:outline-none"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingLayerModalTab(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleSaveLayerModal}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow transition cursor-pointer"
                style={{ backgroundColor: layerModalColor || '#8b5cf6' }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 100% Scale & Background Color Modal Toast */}
      {isScaleModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setIsScaleModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-[340px] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-2xs font-bold text-xs">
                  %
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tỷ lệ 100% & Màu nền</h4>
                  <span className="text-[10px] text-slate-400">Kích thước thực tế và nền ô in</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scale Control */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">Tỷ lệ thu phóng</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={5}
                    value={customScale}
                    onChange={(e) => setCustomScale(Math.max(1, Math.min(1000, parseFloat(e.target.value) || 100)))}
                    className="w-16 px-1.5 py-0.5 text-center text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={10}
                max={300}
                step={5}
                value={customScale}
                onChange={(e) => setCustomScale(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[50, 75, 100, 150, 200].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setCustomScale(sc)}
                    className={`py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      customScale === sc
                        ? 'bg-violet-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                    }`}
                  >
                    {sc}%
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color Control */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">Màu nền ô in</label>
                <span className="text-[10px] font-mono text-slate-500 font-medium uppercase">{backgroundColor}</span>
              </div>

              {/* Preset Swatches */}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { col: '#ffffff', name: 'Trắng' },
                  { col: '#f8fafc', name: 'Xám sáng' },
                  { col: '#000000', name: 'Đen' },
                  { col: '#fef08a', name: 'Vàng nhạt' },
                  { col: '#dbeafe', name: 'Xanh nhạt' },
                  { col: '#fee2e2', name: 'Hồng nhạt' },
                ].map(({ col, name }) => {
                  const isSelected = backgroundColor.toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setBackgroundColor(col)}
                      className={`w-9 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center relative shadow-2xs border ${
                        col === '#ffffff' ? 'border-slate-300' : 'border-transparent'
                      } ${isSelected ? 'ring-2 ring-offset-2 ring-slate-800 shadow-sm scale-105' : 'hover:scale-105'}`}
                      style={{ backgroundColor: col }}
                      title={name}
                    >
                      {isSelected && (
                        <Check 
                          size={14} 
                          className={col === '#ffffff' || col === '#f8fafc' || col === '#fef08a' || col === '#dbeafe' || col === '#fee2e2' ? 'text-slate-800 stroke-[3]' : 'text-white stroke-[3]'} 
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium">Màu tuỳ chọn:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex-1">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-5 h-5 rounded-md border-0 p-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-mono font-medium text-slate-700 uppercase focus:outline-none"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCustomScale(100);
                  setBackgroundColor('#ffffff');
                }}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Đặt lại 100%
              </button>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-sm hover:shadow transition cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal when Loading History */}
      {isUnsavedWarningModalOpen && pendingHistoryToLoad && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsUnsavedWarningModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Dự án hiện tại chưa được lưu!
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Bản bình trang hiện tại có các thay đổi chưa được lưu. Nếu bạn nạp lịch sử <strong className="text-slate-800 font-semibold">"{pendingHistoryToLoad.title}"</strong>, toàn bộ thông số và layer hiện tại trên canvas sẽ bị thay thế.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsUnsavedWarningModalOpen(false);
                  setPendingHistoryToLoad(null);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingHistoryToLoad;
                  setIsUnsavedWarningModalOpen(false);
                  setPendingHistoryToLoad(null);
                  applyHistoryItem(target);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
              >
                Bỏ qua & Nạp ngay
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pendingHistoryToLoad;
                  const savedOk = await saveToFileManager(true);
                  if (savedOk) {
                    setIsUnsavedWarningModalOpen(false);
                    setPendingHistoryToLoad(null);
                    applyHistoryItem(target);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-indigo-200 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save size={14} />
                <span>Lưu & Nạp lịch sử</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
