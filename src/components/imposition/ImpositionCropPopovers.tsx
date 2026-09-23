import React from 'react';
import { X, Power } from 'lucide-react';
import { ImpositionConfig } from './types';

export interface ImpositionCropPopoversProps {
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  isPageCropPopoverOpen: boolean;
  setIsPageCropPopoverOpen: (open: boolean) => void;
  isCropPopoverOpen: boolean;
  setIsCropPopoverOpen: (open: boolean) => void;
  isColorBarPopoverOpen: boolean;
  setIsColorBarPopoverOpen: (open: boolean) => void;
}

export const ImpositionCropPopovers: React.FC<ImpositionCropPopoversProps> = ({
  config,
  setConfig,
  isPageCropPopoverOpen,
  setIsPageCropPopoverOpen,
  isCropPopoverOpen,
  setIsCropPopoverOpen,
  isColorBarPopoverOpen,
  setIsColorBarPopoverOpen
}) => {
  return (
    <>
      {/* 1. Page Corner Crop Marks Settings Popover */}
      {isPageCropPopoverOpen && (
        <div className="absolute bottom-full mb-3 left-0 z-50 bg-white/95 backdrop-blur-md border border-violet-200/90 rounded-2xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              <span className="text-xs font-bold text-slate-800">Đánh dấu cắt (Góc trang)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPageCropPopoverOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600 uppercase">Độ dài</span>
                <span className="text-slate-400 font-medium">mm</span>
              </div>
              <input
                type="number"
                step="0.5"
                min={0}
                value={config.pageCropLen}
                onChange={e => setConfig(c => ({ ...c, pageCropLen: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-violet-800 text-center focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600 uppercase">Khoảng cách</span>
                <span className="text-slate-400 font-medium">mm</span>
              </div>
              <input
                type="number"
                step="0.5"
                min={0}
                value={config.pageCropDist}
                onChange={e => setConfig(c => ({ ...c, pageCropDist: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-violet-800 text-center focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600 uppercase">Độ dày</span>
                <span className="text-slate-400 font-medium">mm</span>
              </div>
              <input
                type="number"
                step="0.05"
                min={0.01}
                value={config.pageCropThick}
                onChange={e => setConfig(c => ({ ...c, pageCropThick: Math.max(0.01, parseFloat(e.target.value) || 0.1) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-violet-800 text-center focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600 uppercase">Màu sắc</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 h-[34px]">
                <input
                  type="color"
                  value={config.pageCropColor}
                  onChange={e => setConfig(c => ({ ...c, pageCropColor: e.target.value }))}
                  className="w-full h-full bg-transparent border-0 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfig(c => ({ ...c, usePageCrop: !c.usePageCrop }))}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                config.usePageCrop
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
              }`}
            >
              <Power size={13} />
              <span>{config.usePageCrop ? 'Tắt dấu cắt' : 'Bật dấu cắt'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPageCropPopoverOpen(false)}
              className="text-xs font-semibold px-3.5 py-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-2xs"
            >
              Xong
            </button>
          </div>
        </div>
      )}

      {/* 2. Item Crop Marks Settings Popover */}
      {isCropPopoverOpen && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md border border-violet-200/90 rounded-2xl shadow-2xl p-3.5 w-64 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              <span className="text-xs font-medium text-slate-800">Dấu xén (Tem)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCropPopoverOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-slate-500 uppercase">Độ dài</span>
                <span className="text-slate-400 font-medium">mm</span>
              </div>
              <input
                type="number"
                step="0.5"
                min={0}
                value={config.cropLen}
                onChange={e => setConfig(c => ({ ...c, cropLen: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-violet-800 text-center focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-slate-500 uppercase">Khoảng cách</span>
                <span className="text-slate-400 font-medium">mm</span>
              </div>
              <input
                type="number"
                step="0.5"
                min={0}
                value={config.cropDist}
                onChange={e => setConfig(c => ({ ...c, cropDist: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-violet-800 text-center focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-slate-500 uppercase">Độ dày</span>
                <span className="text-slate-400 font-medium">mm</span>
              </div>
              <input
                type="number"
                step="0.05"
                min={0.01}
                value={config.cropThick}
                onChange={e => setConfig(c => ({ ...c, cropThick: Math.max(0.01, parseFloat(e.target.value) || 0.1) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-violet-800 text-center focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-slate-500 uppercase">Màu sắc</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 h-[34px]">
                <input
                  type="color"
                  value={config.cropColor}
                  onChange={e => setConfig(c => ({ ...c, cropColor: e.target.value }))}
                  className="w-full h-full bg-transparent border-0 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfig(c => ({ ...c, useCrop: !c.useCrop }))}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                config.useCrop
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
              }`}
            >
              <Power size={13} />
              <span>{config.useCrop ? 'Tắt dấu xén' : 'Bật dấu xén'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCropPopoverOpen(false)}
              className="text-xs font-semibold px-3.5 py-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-2xs"
            >
              Xong
            </button>
          </div>
        </div>
      )}

      {/* 3. CMYK Color Bar Settings Popover */}
      {isColorBarPopoverOpen && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md border border-violet-200/90 rounded-2xl shadow-2xl p-3.5 w-64 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              <span className="text-xs font-medium text-slate-800">Dải màu CMYK</span>
            </div>
            <button
              type="button"
              onClick={() => setIsColorBarPopoverOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1.5 mb-3">
            <label className="text-[10px] font-medium text-slate-500 uppercase flex items-center justify-between">
              <span>Vị trí đặt dải màu</span>
              <span className="text-[9px] font-normal text-violet-600">
                {config.colorBarPosition === 'top' ? 'Trên' : config.colorBarPosition === 'bottom' ? 'Dưới' : config.colorBarPosition === 'left' ? 'Trái' : config.colorBarPosition === 'right' ? 'Phải' : 'Cả 4 cạnh'}
              </span>
            </label>
            <div className="grid grid-cols-5 gap-1">
              {([
                { id: 'top', label: 'Trên' },
                { id: 'bottom', label: 'Dưới' },
                { id: 'left', label: 'Trái' },
                { id: 'right', label: 'Phải' },
                { id: 'all', label: 'Cả 4' },
              ] as const).map(({ id, label }) => {
                const isSelected = config.useColorBar && config.colorBarPosition === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setConfig(c => ({ ...c, useColorBar: true, colorBarPosition: id }));
                    }}
                    className={`py-1.5 text-[10px] font-medium rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-violet-600 border-violet-700 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-violet-50 border-slate-200 hover:border-violet-300 text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 mb-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-slate-500 uppercase">Padding lề mép</span>
              <span className="text-slate-400 font-medium">(mm)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <input
                type="number"
                step="0.5"
                min={0}
                value={config.colorBarPadding}
                onChange={e => setConfig(c => ({ ...c, colorBarPadding: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="w-full bg-transparent text-xs font-medium text-violet-800 text-center focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 font-medium shrink-0">mm</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfig(c => ({ ...c, useColorBar: !c.useColorBar }))}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                config.useColorBar
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
              }`}
            >
              <Power size={13} />
              <span>{config.useColorBar ? 'Tắt dải màu' : 'Bật dải màu'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsColorBarPopoverOpen(false)}
              className="text-xs font-semibold px-3.5 py-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-2xs"
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </>
  );
};
