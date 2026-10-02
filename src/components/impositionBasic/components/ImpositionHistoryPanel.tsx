import React from 'react';
import { Settings2, X } from 'lucide-react';
import { CollapsibleSidebar } from '../../common/CollapsibleSidebar';
import { LayoutPlan } from '../../../utils/layoutSolver';
import {
  ImpositionConfig,
  ManualRotateType,
  IccProfile,
  ImpositionHistoryItem
} from '../types';
import { ImpositionPrintSettings } from './ImpositionPrintSettings';
import { ImpositionHistoryList } from '../../imposition/ImpositionHistoryList';

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
    <CollapsibleSidebar
      isCollapsed={isRightSidebarCollapsed}
      onToggle={toggleRightSidebar}
      width="700px"
      toggleSide="left"
    >
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
              <X size={18} />
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
            isOpen={isHistorySectionOpen}
            onToggleOpen={() => setIsHistorySectionOpen(v => !v)}
            impositionHistory={impositionHistory as any}
            onDeleteItem={onRemoveHistoryItem}
            onClearHistory={onClearHistory}
            onRestoreHistory={onRestoreHistoryConfig as any}
          />
    </CollapsibleSidebar>
  );
};
