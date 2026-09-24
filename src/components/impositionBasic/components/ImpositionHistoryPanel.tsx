import React from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { LayoutPlan } from '../../../utils/layoutSolver';
import {
  ImpositionConfig,
  ManualRotateType,
  IccProfile,
  ImpositionHistoryItem
} from '../types';
import { ImpositionPrintSettings } from './ImpositionPrintSettings';
import { ImpositionHistoryList } from './ImpositionHistoryList';

interface ImpositionHistoryPanelProps {
  isRightSidebarCollapsed: boolean;
  toggleRightSidebar: () => void;
  isHistorySectionOpen: boolean;
  setIsHistorySectionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  currentPlan: LayoutPlan | null;
  plansCount: number;
  onOpenPlanModal: () => void;
  manualRotate: ManualRotateType;
  setManualRotate: (r: ManualRotateType) => void;
  sheets: number;
  unitPrice: number;
  setUnitPrice: (p: number) => void;
  totalCost: number;
  pricePerItem: number;
  iccProfiles: IccProfile[];
  isLoadingIccProfiles: boolean;
  impositionHistory: ImpositionHistoryItem[];
  onRemoveHistoryItem: (id: string, e?: React.MouseEvent) => void;
  onClearHistory: () => void;
  onRestoreHistoryConfig: (item: ImpositionHistoryItem) => void;
}

export const ImpositionHistoryPanel: React.FC<ImpositionHistoryPanelProps> = ({
  isRightSidebarCollapsed,
  toggleRightSidebar,
  isHistorySectionOpen,
  setIsHistorySectionOpen,
  config,
  setConfig,
  currentPlan,
  plansCount,
  onOpenPlanModal,
  manualRotate,
  setManualRotate,
  sheets,
  unitPrice,
  setUnitPrice,
  totalCost,
  pricePerItem,
  iccProfiles,
  isLoadingIccProfiles,
  impositionHistory,
  onRemoveHistoryItem,
  onClearHistory,
  onRestoreHistoryConfig
}) => {
  return (
    <>
      {/* Floating Arrow Toggle Button on the Right Edge */}
      <button
        type="button"
        onClick={toggleRightSidebar}
        className={`fixed z-50 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out w-5 hover:w-6.5 h-14 bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-slate-300 border-r-0 rounded-l-xl shadow-xs hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer group select-none ${
          isRightSidebarCollapsed ? 'right-0' : 'right-[700px] -mr-px'
        }`}
        title={isRightSidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
      >
        {isRightSidebarCollapsed ? (
          <ChevronLeft
            size={16}
            strokeWidth={1.75}
            className="transition-transform group-hover:scale-105"
          />
        ) : (
          <ChevronRight
            size={16}
            strokeWidth={1.75}
            className="transition-transform group-hover:scale-105"
          />
        )}
      </button>

      {/* Right sidebar: Stats & Actions (w-[700px]) */}
      <aside
        className={`flex-shrink-0 h-full flex flex-col z-40 shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden bg-white border-slate-200 ${
          isRightSidebarCollapsed
            ? 'w-0 min-w-0 border-l-0 opacity-0 pointer-events-none'
            : 'w-[700px] max-w-[95vw] border-l opacity-100'
        }`}
      >
        <div className="w-[700px] max-w-[95vw] h-full flex flex-col overflow-y-auto flex-shrink-0">
          {/* Header */}
          <div className="p-3.5 border-b flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Settings2 size={18} className="text-violet-600 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-800 truncate">
                Thiết lập in &amp; Khổ giấy
              </span>
              <span className="text-xs text-slate-500 font-medium ml-1">
                ({config.pageW} × {config.pageH} mm)
              </span>
            </div>
            <button
              type="button"
              onClick={toggleRightSidebar}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              title="Thu gọn"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Print & Color Settings */}
          <ImpositionPrintSettings
            config={config}
            setConfig={setConfig}
            currentPlan={currentPlan}
            plansCount={plansCount}
            onOpenPlanModal={onOpenPlanModal}
            manualRotate={manualRotate}
            setManualRotate={setManualRotate}
            sheets={sheets}
            unitPrice={unitPrice}
            setUnitPrice={setUnitPrice}
            totalCost={totalCost}
            pricePerItem={pricePerItem}
            iccProfiles={iccProfiles}
            isLoadingIccProfiles={isLoadingIccProfiles}
          />

          {/* Imposition History List */}
          <ImpositionHistoryList
            isHistorySectionOpen={isHistorySectionOpen}
            setIsHistorySectionOpen={setIsHistorySectionOpen}
            impositionHistory={impositionHistory}
            onRemoveHistoryItem={onRemoveHistoryItem}
            onClearHistory={onClearHistory}
            onRestoreHistoryConfig={onRestoreHistoryConfig}
          />
        </div>
      </aside>
    </>
  );
};
