import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { ImpositionConfig, PageItem } from './types';
import { LayoutPlan } from '../../utils/layoutSolver';
import { ImpositionCropPopovers } from './ImpositionCropPopovers';

export interface ImpositionCanvasDockProps {
  currentPlan: LayoutPlan | null;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  previewSide: 'front' | 'back';
  setPreviewSide: (side: 'front' | 'back') => void;
  allPages: PageItem[];
  totalSheets: number;
  currentSheetIndex: number;
  setCurrentSheetIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const ImpositionCanvasDock: React.FC<ImpositionCanvasDockProps> = ({
  currentPlan,
  config,
  setConfig,
  previewSide,
  setPreviewSide,
  allPages,
  totalSheets,
  currentSheetIndex,
  setCurrentSheetIndex
}) => {
  const [isPageCropPopoverOpen, setIsPageCropPopoverOpen] = useState(false);
  const [isCropPopoverOpen, setIsCropPopoverOpen] = useState(false);
  const [isColorBarPopoverOpen, setIsColorBarPopoverOpen] = useState(false);

  const pageCropPopoverRef = useRef<HTMLDivElement>(null);
  const cropPopoverRef = useRef<HTMLDivElement>(null);
  const colorBarPopoverRef = useRef<HTMLDivElement>(null);

  if (!currentPlan) return null;

  return (
    <>
      {/* 2-Sided Toggle */}
      {config.is2Sided && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur shadow-lg rounded-xl p-1 border z-30">
          <button 
            type="button"
            onClick={() => setPreviewSide('front')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${previewSide === 'front' ? 'bg-violet-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Mặt Trước
          </button>
          <button 
            type="button"
            onClick={() => setPreviewSide('back')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${previewSide === 'back' ? 'bg-green-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Mặt Sau
          </button>
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-3 sm:px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-200/90 whitespace-nowrap select-none max-w-[calc(100%-1rem)]">
        {/* Popovers */}
        <ImpositionCropPopovers
          config={config}
          setConfig={setConfig}
          isPageCropPopoverOpen={isPageCropPopoverOpen}
          setIsPageCropPopoverOpen={setIsPageCropPopoverOpen}
          isCropPopoverOpen={isCropPopoverOpen}
          setIsCropPopoverOpen={setIsCropPopoverOpen}
          isColorBarPopoverOpen={isColorBarPopoverOpen}
          setIsColorBarPopoverOpen={setIsColorBarPopoverOpen}
        />

        {/* 1. Page Corner Crop Marks Toggle */}
        <div className="relative" ref={pageCropPopoverRef}>
          <button
            type="button"
            onClick={() => setIsPageCropPopoverOpen(v => !v)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
              config.usePageCrop
                ? 'bg-violet-600 border-violet-700 text-white shadow-inner font-medium ring-2 ring-violet-200'
                : 'bg-transparent hover:bg-slate-100/80 border-slate-300 text-slate-700 font-medium'
            }`}
            title="Cấu hình Đánh dấu cắt (Góc trang)"
          >
            <span className={`w-2 h-2 rounded-full ${config.usePageCrop ? 'bg-white shadow-xs' : 'bg-slate-300'}`} />
            <span className="text-xs font-medium whitespace-nowrap">Đánh dấu cắt</span>
            <span className={`text-[10px] whitespace-nowrap ${config.usePageCrop ? 'text-violet-100 font-medium bg-violet-700/80 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
              {config.usePageCrop ? `${config.pageCropLen}mm • ${config.pageCropDist}mm` : '(Góc trang)'}
            </span>
          </button>
        </div>

        {/* 2. Item Crop Marks Toggle */}
        <div className="relative" ref={cropPopoverRef}>
          <button
            type="button"
            onClick={() => setIsCropPopoverOpen(v => !v)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
              config.useCrop
                ? 'bg-violet-600 border-violet-700 text-white shadow-inner font-medium ring-2 ring-violet-200'
                : 'bg-transparent hover:bg-slate-100/80 border-slate-300 text-slate-700 font-medium'
            }`}
            title="Cấu hình Dấu xén (Tem)"
          >
            <span className={`w-2 h-2 rounded-full ${config.useCrop ? 'bg-white shadow-xs' : 'bg-slate-300'}`} />
            <span className="text-xs font-medium whitespace-nowrap">Dấu xén</span>
            <span className={`text-[10px] whitespace-nowrap ${config.useCrop ? 'text-violet-100 font-medium bg-violet-700/80 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
              {config.useCrop ? `${config.cropLen}mm • ${config.cropDist}mm` : '(Tem)'}
            </span>
          </button>
        </div>

        {/* 3. CMYK Color Bar Toggle */}
        <div className="relative" ref={colorBarPopoverRef}>
          <button
            type="button"
            onClick={() => setIsColorBarPopoverOpen(v => !v)}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
              config.useColorBar
                ? 'bg-violet-600 border-violet-700 text-white shadow-inner font-medium ring-2 ring-violet-200'
                : 'bg-transparent hover:bg-slate-100/80 border-slate-300 text-slate-700 font-medium'
            }`}
            title="Cấu hình Dải màu CMYK"
          >
            <span className={`w-2 h-2 rounded-full ${config.useColorBar ? 'bg-white shadow-xs' : 'bg-slate-300'}`} />
            <span className="text-xs font-medium whitespace-nowrap">Dải màu</span>
            <span className={`text-[10px] whitespace-nowrap ${config.useColorBar ? 'text-violet-100 font-medium bg-violet-700/80 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
              {config.useColorBar ? `${config.colorBarPosition}` : '(CMYK)'}
            </span>
          </button>
        </div>

        {/* Page Navigation */}
        {allPages.length > 0 && totalSheets > 0 && (
          <>
            <div className="w-px h-6 bg-slate-300 mx-1 shrink-0" />
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <button
                type="button"
                onClick={() => setCurrentSheetIndex(0)}
                disabled={currentSheetIndex === 0}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentSheetIndex(i => Math.max(0, i - 1))}
                disabled={currentSheetIndex === 0}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1 text-xs">
                <input
                  type="number"
                  min={1}
                  max={totalSheets}
                  value={currentSheetIndex + 1}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 1;
                    setCurrentSheetIndex(Math.max(0, Math.min(totalSheets - 1, val - 1)));
                  }}
                  className="w-10 text-center font-medium text-violet-700 border border-violet-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-violet-50 text-xs"
                />
                <span className="text-slate-400">/</span>
                <span className="font-medium text-slate-700">{totalSheets}</span>
                <span className="text-[10px] text-slate-400">tờ</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentSheetIndex(i => Math.min(totalSheets - 1, i + 1))}
                disabled={currentSheetIndex >= totalSheets - 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentSheetIndex(totalSheets - 1)}
                disabled={currentSheetIndex >= totalSheets - 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
