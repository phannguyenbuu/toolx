import React, { useState } from 'react';
import {
  RectangleHorizontal,
  RectangleVertical,
  ChevronDown,
  ChevronUp,
  RotateCw
} from 'lucide-react';
import { ImpositionConfig, PageItem, ImpositionHistoryItem } from './types';
import { DebouncedNumberInput } from './DebouncedNumberInput';
import { ImpositionHistorySidebar } from './ImpositionHistorySidebar';
import { ImpositionAiOutpaintPanel } from './ImpositionAiOutpaintPanel';

export interface ImpositionPaperSidebarProps {
  isRightSidebarCollapsed: boolean;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  updatePrint: (w: number, h: number) => void;
  currentPresetName: string;
  setIsPaperDropdownOpen: (open: boolean) => void;
  isOutpaintPanelOpen: boolean;
  setIsOutpaintPanelOpen: (open: boolean) => void;
  outpaintConfig: { top: number; bottom: number; left: number; right: number };
  setOutpaintConfig: React.Dispatch<React.SetStateAction<{ top: number; bottom: number; left: number; right: number }>>;
  outpaintProgress: { isProcessing: boolean; current: number; total: number };
  handleOutpaint: () => void;
  allPages: PageItem[];
  impositionHistory: ImpositionHistoryItem[];
  handleRequestRestoreHistory: (item: ImpositionHistoryItem) => void;
  handleExportSortJob: (item: ImpositionHistoryItem) => void;
  isExportingSortJob: boolean;
  deleteHistoryItem: (id: string, e?: React.MouseEvent) => void;
  clearHistory: () => void;
}

export const ImpositionPaperSidebar: React.FC<ImpositionPaperSidebarProps> = ({
  isRightSidebarCollapsed,
  config,
  setConfig,
  updatePrint,
  currentPresetName,
  setIsPaperDropdownOpen,
  isOutpaintPanelOpen,
  setIsOutpaintPanelOpen,
  outpaintConfig,
  setOutpaintConfig,
  outpaintProgress,
  handleOutpaint,
  allPages,
  impositionHistory,
  handleRequestRestoreHistory,
  handleExportSortJob,
  isExportingSortJob,
  deleteHistoryItem,
  clearHistory
}) => {
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(true);

  const isPortrait = config.pageW <= config.pageH;
  const aspect = (config.pageW || 1) / (config.pageH || 1);
  let sheetW: number;
  let sheetH: number;
  if (isPortrait) {
    sheetH = 280;
    sheetW = Math.max(130, Math.min(210, Math.round(280 * aspect)));
  } else {
    sheetW = 215;
    sheetH = Math.max(110, Math.min(180, Math.round(215 / aspect)));
  }

  return (
    <aside
      className={`flex-shrink-0 h-full flex flex-col z-40 shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden bg-white border-slate-200 ${
        isRightSidebarCollapsed
          ? "w-0 min-w-0 border-l-0 opacity-0 pointer-events-none"
          : "w-[350px] max-w-[95vw] border-l opacity-100"
      }`}
    >
      <div className="w-[350px] max-w-[95vw] h-full flex flex-col overflow-y-auto flex-shrink-0">
        {/* UPPER SECTION: KHỔ GIẤY IN & THIẾT LẬP */}
        <div className="border-b border-slate-200">
          <div 
            className="px-3.5 py-2 bg-slate-50 border-b flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/70 transition"
            onClick={() => setIsPrintSettingsOpen(v => !v)}
          >
            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {/* Dual Orientation Buttons */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (config.pageW > config.pageH) {
                      updatePrint(Math.min(config.pageW, config.pageH), Math.max(config.pageW, config.pageH));
                    }
                  }}
                  className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    config.pageW <= config.pageH
                      ? 'bg-violet-600 text-white shadow-xs font-medium'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                  }`}
                  title="Khổ dọc (Portrait)"
                >
                  <RectangleVertical size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (config.pageW < config.pageH) {
                      updatePrint(Math.max(config.pageW, config.pageH), Math.min(config.pageW, config.pageH));
                    }
                  }}
                  className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    config.pageW > config.pageH
                      ? 'bg-violet-600 text-white shadow-xs font-medium'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                  }`}
                  title="Khổ ngang (Landscape)"
                >
                  <RectangleHorizontal size={13} />
                </button>
              </div>
              <h3 className="text-xs font-medium text-slate-800 uppercase tracking-wider">
                Khổ giấy in
              </h3>
            </div>

            <div className="flex items-center gap-1.5 min-w-0" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsPaperDropdownOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-300 hover:border-violet-400 rounded-xl text-[11px] font-medium text-violet-800 shadow-2xs hover:shadow-xs transition cursor-pointer group"
                title="Mở bảng chọn khổ giấy đầy đủ (3 cột)"
              >
                <span className="truncate max-w-[110px]">{currentPresetName}</span>
                <ChevronDown size={13} className="text-violet-500 group-hover:translate-y-0.5 transition-transform flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setIsPrintSettingsOpen(v => !v)}
                className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer flex-shrink-0"
                title={isPrintSettingsOpen ? "Thu gọn" : "Mở rộng"}
              >
                {isPrintSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {isPrintSettingsOpen && (
            <div className="divide-y divide-slate-100">
              <div className="p-4 border-b">
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center overflow-hidden">
                  <div className="flex items-end justify-center">
                    {/* Left Column: Top Dimension Line + Sheet Canvas */}
                    <div className="flex flex-col items-center">
                      <div 
                        className="flex items-center justify-center gap-1.5 mb-2"
                        style={{ width: `${sheetW}px` }}
                      >
                        <div className="h-px bg-slate-400 flex-1 relative">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-l border-t border-slate-600 rotate-[-45deg]" />
                        </div>
                        <div className="flex items-center gap-1 bg-white border-2 border-violet-500/80 rounded-lg px-1.5 py-0.5 shadow-2xs">
                          <DebouncedNumberInput
                            value={config.pageW}
                            onChange={(v) => updatePrint(v, config.pageH)}
                            className="w-12 text-center font-medium text-xs text-violet-800 bg-transparent focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-400 font-medium">mm</span>
                        </div>
                        <div className="h-px bg-slate-400 flex-1 relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-r border-t border-slate-600 rotate-[45deg]" />
                        </div>
                      </div>

                      {/* Visual Sheet Canvas */}
                      <div
                        className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm relative transition-all duration-300 overflow-hidden"
                        style={{
                          width: `${sheetW}px`,
                          height: `${sheetH}px`,
                          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
                          backgroundSize: '12px 12px',
                        }}
                      >
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-slate-200 border-b border-l border-slate-300 rounded-bl z-10" />

                        {/* Safe Margin Guides */}
                        {config.useMargin && (
                          <div 
                            className="absolute border border-dashed border-violet-400/70 pointer-events-none rounded-lg transition-all"
                            style={{
                              top: `${Math.max(2, Math.min(sheetH / 3, (config.marginTop / (config.pageH || 1)) * sheetH))}px`,
                              bottom: `${Math.max(2, Math.min(sheetH / 3, (config.marginBot / (config.pageH || 1)) * sheetH))}px`,
                              left: `${Math.max(2, Math.min(sheetW / 3, (config.marginLeft / (config.pageW || 1)) * sheetW))}px`,
                              right: `${Math.max(2, Math.min(sheetW / 3, (config.marginRight / (config.pageW || 1)) * sheetW))}px`,
                            }}
                          />
                        )}

                        {/* Rotate Page Button */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => updatePrint(config.pageH, config.pageW)}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all shadow-xs cursor-pointer border bg-white/95 border-slate-300 text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 active:scale-95 group/rot select-none"
                            title="Xoay hướng giấy (Lật ngang ↔ dọc)"
                          >
                            <RotateCw size={11} className="group-hover/rot:rotate-180 transition-transform duration-500 text-violet-600" />
                            <span>Xoay giấy</span>
                          </button>
                        </div>

                        {/* 9 Alignment Pins Matrix */}
                        <div className="absolute inset-2.5 pointer-events-none">
                          <div className="w-full h-full relative">
                            {[
                              { x: 'left', y: 'top', label: 'Trên - Trái', pos: 'top-0 left-0' },
                              { x: 'center', y: 'top', label: 'Trên - Giữa', pos: 'top-0 left-1/2 -translate-x-1/2' },
                              { x: 'right', y: 'top', label: 'Trên - Phải', pos: 'top-0 right-0' },
                              { x: 'left', y: 'middle', label: 'Giữa - Trái', pos: 'top-1/2 left-0 -translate-y-1/2' },
                              { x: 'center', y: 'middle', label: 'Chính Giữa', pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' },
                              { x: 'right', y: 'middle', label: 'Giữa - Phải', pos: 'top-1/2 right-0 -translate-y-1/2' },
                              { x: 'left', y: 'bottom', label: 'Dưới - Trái', pos: 'bottom-0 left-0' },
                              { x: 'center', y: 'bottom', label: 'Dưới - Giữa', pos: 'bottom-0 left-1/2 -translate-x-1/2' },
                              { x: 'right', y: 'bottom', label: 'Dưới - Phải', pos: 'bottom-0 right-0' },
                            ].map(({ x, y, label, pos }) => {
                              const isSelected = config.alignX === x && config.alignY === y;
                              return (
                                <button
                                  key={`${x}-${y}`}
                                  type="button"
                                  onClick={() => setConfig(c => ({ ...c, alignX: x as any, alignY: y as any }))}
                                  className={`absolute ${pos} pointer-events-auto w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-300 scale-110 z-30'
                                      : 'bg-white/90 hover:bg-violet-50 text-slate-400 hover:text-violet-600 border border-slate-300/90 hover:border-violet-400 hover:scale-105 z-20 shadow-2xs'
                                  }`}
                                  title={`Vị trí căn chỉnh: ${label} (X: ${x}, Y: ${y})`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white ring-1 ring-violet-400' : 'bg-slate-400'}`} />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2-Sided Toggle Button */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => setConfig(c => ({ ...c, is2Sided: !c.is2Sided }))}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all shadow-xs cursor-pointer border ${
                              config.is2Sided
                                ? 'bg-violet-600 border-violet-700 text-white shadow-inner ring-2 ring-violet-200'
                                : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300'
                            }`}
                            title={config.is2Sided ? 'Đang in 2 mặt (Click chuyển sang 1 mặt)' : 'Đang in 1 mặt (Click chuyển sang 2 mặt)'}
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="2" width="13" height="17" rx="2" />
                              <rect x="8" y="5" width="13" height="17" rx="2" fill={config.is2Sided ? 'currentColor' : 'none'} opacity={config.is2Sided ? 0.3 : 0.1} />
                            </svg>
                            <span>{config.is2Sided ? '2 Mặt' : '1 Mặt'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Dimension Line (Height) */}
                    <div 
                      className="flex flex-col items-center justify-center relative w-16 ml-2"
                      style={{ height: `${sheetH}px` }}
                    >
                      <div className="w-px bg-slate-400 h-full relative flex flex-col justify-between items-center">
                        <div className="w-1.5 h-1.5 border-t border-l border-slate-600 rotate-[45deg]" />
                        <div className="w-1.5 h-1.5 border-b border-l border-slate-600 rotate-[-45deg]" />
                      </div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-white border-2 border-violet-500/80 rounded-lg px-1.5 py-0.5 shadow-2xs whitespace-nowrap z-10">
                        <DebouncedNumberInput
                          value={config.pageH}
                          onChange={(v) => updatePrint(config.pageW, v)}
                          className="w-12 text-center font-medium text-xs text-violet-800 bg-transparent focus:outline-none"
                        />
                        <span className="text-[9px] text-slate-400 font-medium">mm</span>
                      </div>
                    </div>
                  </div>

                  {/* 2-Sided Options Panel */}
                  {config.is2Sided && (
                    <div className="mt-3 w-full max-w-[280px] p-2.5 bg-violet-50/80 border border-violet-200 rounded-xl space-y-2">
                      <div className="text-[10px] font-medium text-violet-800 uppercase flex items-center gap-1">
                        <span>Tùy chọn in 2 mặt</span>
                      </div>
                      <div className="flex gap-1.5">
                        <label className={`flex-1 flex items-center justify-center gap-1 text-[10px] cursor-pointer py-1 px-1.5 rounded-lg border transition ${
                          config.twoSideMode === 'same'
                            ? 'bg-white border-violet-400 text-violet-800 font-medium shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-white/60'
                        }`}>
                          <input
                            type="radio"
                            name="twoSideMode"
                            checked={config.twoSideMode === 'same'}
                            onChange={() => setConfig({ ...config, twoSideMode: 'same' })}
                            className="text-violet-600 w-3 h-3"
                          />
                          <span>2 mặt giống</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-1 text-[10px] cursor-pointer py-1 px-1.5 rounded-lg border transition ${
                          config.twoSideMode === 'odd-even'
                            ? 'bg-white border-violet-400 text-violet-800 font-medium shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-white/60'
                        }`}>
                          <input
                            type="radio"
                            name="twoSideMode"
                            checked={config.twoSideMode === 'odd-even'}
                            onChange={() => setConfig({ ...config, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3 })}
                            className="text-violet-600 w-3 h-3"
                          />
                          <span>Chẵn / Lẻ</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-violet-200/60">
                        <label className="flex items-center gap-1.5 text-[10px] text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.rot180Front}
                            onChange={e => setConfig({ ...config, rot180Front: e.target.checked })}
                            className="rounded text-violet-600 w-3 h-3"
                          />
                          <span>Xoay 180° Trước</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[10px] text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.rot180Back}
                            onChange={e => setConfig({ ...config, rot180Back: e.target.checked })}
                            className="rounded text-violet-600 w-3 h-3"
                          />
                          <span>Xoay 180° Sau</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Print Area */}
              {config.usePrintArea && (
                <div className="p-4 border-b">
                  <label className="flex items-center justify-between mb-2 cursor-pointer">
                    <span className="text-[10px] font-medium text-blue-600 uppercase">Vùng in an toàn (Print Area)</span>
                    <input type="checkbox" checked={config.usePrintArea} onChange={e => setConfig({ ...config, usePrintArea: e.target.checked })} className="rounded text-blue-600" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <DebouncedNumberInput value={config.printAreaW} onChange={v => setConfig(c => ({ ...c, printAreaW: v }))} className="border rounded-lg px-2 py-1.5 text-sm text-center bg-green-50 border-green-200" />
                    <DebouncedNumberInput value={config.printAreaH} onChange={v => setConfig(c => ({ ...c, printAreaH: v }))} className="border rounded-lg px-2 py-1.5 text-sm text-center bg-green-50 border-green-200" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Outpaint Panel */}
          <ImpositionAiOutpaintPanel
            isOutpaintPanelOpen={isOutpaintPanelOpen}
            setIsOutpaintPanelOpen={setIsOutpaintPanelOpen}
            outpaintConfig={outpaintConfig}
            setOutpaintConfig={setOutpaintConfig}
            outpaintProgress={outpaintProgress}
            handleOutpaint={handleOutpaint}
            allPages={allPages}
          />
        </div>

        {/* LOWER SECTION: LỊCH SỬ BÌNH TRANG */}
        <ImpositionHistorySidebar
          impositionHistory={impositionHistory}
          handleRequestRestoreHistory={handleRequestRestoreHistory}
          handleExportSortJob={handleExportSortJob}
          isExportingSortJob={isExportingSortJob}
          deleteHistoryItem={deleteHistoryItem}
          clearHistory={clearHistory}
        />
      </div>
    </aside>
  );
};
