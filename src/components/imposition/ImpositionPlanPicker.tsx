import React from 'react';
import {
  LayoutGrid,
  RotateCw,
  Loader2,
  FileJson,
  AlertCircle,
  Check
} from 'lucide-react';
import { LayoutPlan } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem } from './types';

export interface ImpositionPlanPickerProps {
  plans: LayoutPlan[];
  currentPlan: LayoutPlan | null;
  currentPlanIndex: number;
  setCurrentPlanIndex: (index: number) => void;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  layoutFingerprintRef: React.MutableRefObject<string>;
  handleExportSortJob: (source: 'current') => void;
  isExportingSortJob: boolean;
  isMultiShape: boolean;
  shapeTabs: ShapeTabItem[];
  allPages: PageItem[];
}

export const ImpositionPlanPicker: React.FC<ImpositionPlanPickerProps> = ({
  plans,
  currentPlan,
  currentPlanIndex,
  setCurrentPlanIndex,
  config,
  setConfig,
  layoutFingerprintRef,
  handleExportSortJob,
  isExportingSortJob,
  isMultiShape,
  shapeTabs,
  allPages
}) => {
  return (
    <div className="p-3 border-b flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-medium text-gray-500 uppercase flex items-center gap-1">
            <LayoutGrid size={13} className="text-violet-500" /> Sắp xếp ({plans.length})
          </h3>
          <button
            type="button"
            onClick={() => {
              layoutFingerprintRef.current = '';
              setConfig(c => ({ ...c, autoRotate: !c.autoRotate }));
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 border transition select-none cursor-pointer ${
              config.autoRotate
                ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 font-medium'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            title={
              config.autoRotate
                ? "Đang cho phép xoay tem 90° để tối ưu số lượng tem trên khổ in (Bấm để khoá chiều đứng)"
                : "Đang khoá hướng tem cố định (Bấm để cho phép xoay tem 90°)"
            }
          >
            <RotateCw size={10} className={config.autoRotate ? 'text-violet-600' : 'text-slate-400'} />
            <span>{config.autoRotate ? 'Xoay tối ưu' : 'Khoá hướng'}</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {currentPlan && (
            <span className="text-[10px] font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
              {currentPlan.qty} tem
            </span>
          )}
          <button
            type="button"
            onClick={() => handleExportSortJob('current')}
            disabled={isExportingSortJob}
            className="px-2 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Xuất thông tin tất cả layer và phương án sắp xếp thành SortJob lưu về VPS"
          >
            {isExportingSortJob ? <Loader2 size={11} className="animate-spin" /> : <FileJson size={11} />}
            <span>Xuất SortJob</span>
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-xs">
          <AlertCircle size={20} className="mx-auto mb-1 opacity-50" />
          <p>Không có phương án</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-0.5 auto-rows-max content-start flex-1">
          {plans.map((pl, i) => {
            const isSelected = i === currentPlanIndex;
            const boxMaxW = 140;
            const boxMaxH = 90;
            const pw = config.pageW || 1;
            const ph = config.pageH || 1;
            const sc = Math.min(boxMaxW / pw, boxMaxH / ph);
            const sheetPreviewW = Math.round(pw * sc);
            const sheetPreviewH = Math.round(ph * sc);

            return (
              <div
                key={i}
                onClick={() => setCurrentPlanIndex(i)}
                className={`p-2 rounded-xl border-2 cursor-pointer transition flex flex-col items-center gap-1.5 text-center select-none ${
                  isSelected
                    ? 'border-violet-600 bg-violet-50/90 shadow-sm ring-2 ring-violet-500/20'
                    : 'border-gray-200 hover:border-violet-300 bg-white hover:bg-gray-50'
                }`}
                title={`${pl.name} (${pl.qty} tem)`}
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[10px] font-medium text-gray-800 truncate leading-tight flex-1 text-left">
                    {pl.name}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-violet-100 text-violet-700">
                    {pl.qty} tem
                  </span>
                </div>

                {/* Proportional Preview Container */}
                <div className="flex justify-center items-center bg-slate-100/90 p-1.5 rounded-lg w-full h-[90px] overflow-hidden">
                  <div
                    className="bg-white shadow-xs border border-slate-300 relative rounded-2xs overflow-hidden flex-shrink-0"
                    style={{
                      width: `${sheetPreviewW}px`,
                      height: `${sheetPreviewH}px`,
                    }}
                  >
                    {pl.items.map((it, j) => {
                      const itemShape = (it.shape || config.shape) as string;
                      const itW = it.w !== undefined ? it.w : (it.rot ? config.itemH : config.itemW);
                      const itH = itemShape === 'circle' ? itW : (it.h !== undefined ? it.h : (it.rot ? config.itemW : config.itemH));
                      const aw = Math.max(2, itW * sc);
                      const ah = Math.max(2, itH * sc);
                      const itemColor = it.color || '#8b5cf6';
                      const cornerR = it.cornerRadius !== undefined ? it.cornerRadius : config.cornerRadius;
                      const thumb = it.sourceImage?.thumb || (isMultiShape ? shapeTabs.find(t => t.id === it.tabId || t.name === it.tabName)?.sourceImage?.thumb : null) || (allPages.length > 0 ? allPages[j % allPages.length]?.thumb : null);

                      let borderRadius = '0px';
                      if (itemShape === 'circle' || itemShape === 'oval') borderRadius = '50%';
                      else if (cornerR > 0) borderRadius = `${Math.max(1, cornerR * sc)}px`;

                      let clipPath = 'none';
                      if (cornerR === 0) {
                        if (itemShape === 'trapezoid') clipPath = it.rot ? 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' : 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)';
                        else if (itemShape === 'triangle') clipPath = it.rot ? 'polygon(0% 0%, 100% 0%, 50% 100%)' : 'polygon(50% 0%, 100% 100%, 0% 100%)';
                        else if (itemShape === 'hexagon') clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
                      }

                      return (
                        <div
                          key={j}
                          className="absolute overflow-hidden flex items-center justify-center text-[7px] font-bold select-none pointer-events-none"
                          style={{
                            left: it.x * sc,
                            top: it.y * sc,
                            width: aw,
                            height: ah,
                            borderRadius,
                            clipPath: clipPath !== 'none' ? clipPath : undefined,
                            backgroundColor: thumb ? 'transparent' : `${itemColor}25`,
                            border: `1px solid ${itemColor}`,
                            color: itemColor,
                          }}
                          title={it.tabName ? `Layer ${it.tabName}` : undefined}
                        >
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="leading-none opacity-90 scale-75">{it.tabName || ''}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selection Status & Efficiency */}
                <div className="w-full flex items-center justify-center min-h-[14px]">
                  {isSelected ? (
                    <span className="text-[9px] font-medium text-violet-600 flex items-center gap-0.5">
                      <Check size={10} /> Đang chọn
                    </span>
                  ) : (
                    <span className="text-[9px] text-gray-400 font-medium">
                      {(pl as any).efficiency ? `${Math.round((pl as any).efficiency)}%` : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
