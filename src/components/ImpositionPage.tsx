import React, { useState, useCallback } from 'react';
import { FilePickerModal } from './FilePickerModal';
import {
  ImpositionPageProps,
  useImpositionConfig,
  useImpositionHistory,
  useImpositionGenerator,
  ImpositionTopBar,
  ImpositionConfigSidebar,
  ImpositionPreviewArea,
  ImpositionHistoryPanel,
  ImpositionPlanModal
} from './impositionBasic/index';

export const ImpositionPage: React.FC<ImpositionPageProps> = ({ onClose }) => {
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // History & right panel state
  const history = useImpositionHistory();

  // Layout parameters, presets, and calculation
  const layout = useImpositionConfig();

  // File loading, PDF/SVG generation, and ICC profiles
  const generator = useImpositionGenerator({
    config: layout.config,
    manualRotate: layout.manualRotate,
    currentPlan: layout.currentPlan,
    sheets: layout.sheets,
    onAddHistoryItem: history.addHistoryItem
  });

  // Reset all settings to defaults
  const handleReset = useCallback(() => {
    if (
      generator.uploadedFile &&
      !window.confirm('Bạn có chắc muốn làm mới? Tất cả dữ liệu hiện tại sẽ bị xóa.')
    ) {
      return;
    }
    layout.resetConfig();
    generator.resetGenerator();
    setIsPlanModalOpen(false);
  }, [generator, layout]);

  return (
    <div className="h-full bg-gray-100 flex flex-col overflow-hidden">
      {/* Top Header */}
      <ImpositionTopBar
        uploadedFile={generator.uploadedFile}
        apiStatus={generator.apiStatus}
        isGenerating={generator.isGenerating}
        progress={generator.progress}
        isSaving={generator.isSaving}
        hasPlan={!!layout.currentPlan}
        onReset={handleReset}
        onFileChange={generator.handleFile}
        onOpenFilePicker={() => generator.setIsFilePickerOpen(true)}
        onDownloadSvg={generator.dlSVG}
        onDownloadPdf={generator.dlPDF}
        onSaveToFileManager={generator.saveToFileManager}
        onClose={onClose}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Config Panel */}
        <ImpositionConfigSidebar
          config={layout.config}
          setConfig={layout.setConfig}
          updatePrint={layout.updatePrint}
          handlePreset={layout.handlePreset}
          swapDims={layout.swapDims}
        />

        {/* Center Canvas Preview Area */}
        <ImpositionPreviewArea
          config={layout.config}
          currentPlan={layout.currentPlan}
          previewImages={generator.previewImages}
          isLoadingPreview={generator.isLoadingPreview}
          getBR={layout.getBR}
          getClipPath={layout.getClipPath}
        />

        {/* Right Collapsible Panel: Stats, Plans & History */}
        <ImpositionHistoryPanel
          isRightSidebarCollapsed={history.isRightSidebarCollapsed}
          toggleRightSidebar={history.toggleRightSidebar}
          isHistorySectionOpen={history.isHistorySectionOpen}
          setIsHistorySectionOpen={history.setIsHistorySectionOpen}
          config={layout.config}
          setConfig={layout.setConfig}
          currentPlan={layout.currentPlan}
          plansCount={layout.plans.length}
          onOpenPlanModal={() => setIsPlanModalOpen(true)}
          manualRotate={layout.manualRotate}
          setManualRotate={layout.setManualRotate}
          sheets={layout.sheets}
          unitPrice={layout.unitPrice}
          setUnitPrice={layout.setUnitPrice}
          totalCost={layout.totalCost}
          pricePerItem={layout.pricePerItem}
          iccProfiles={generator.iccProfiles}
          isLoadingIccProfiles={generator.isLoadingIccProfiles}
          impositionHistory={history.impositionHistory}
          onRemoveHistoryItem={history.removeHistoryItem}
          onClearHistory={history.clearHistory}
          onRestoreHistoryConfig={(item) => history.restoreHistoryConfig(item, layout.setConfig)}
        />
      </div>

      {/* Alternative Plans Modal */}
      <ImpositionPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        plans={layout.plans}
        currentPlanIndex={layout.currentPlanIndex}
        onSelectPlan={(idx) => layout.setCurrentPlanIndex(idx)}
        config={layout.config}
      />

      {/* File Picker Modal */}
      <FilePickerModal
        isOpen={generator.isFilePickerOpen}
        onClose={() => generator.setIsFilePickerOpen(false)}
        onSelect={generator.handleFileFromManager}
        accept={['PDF', 'IMAGE']}
        title="Chọn tệp từ Quản lý tệp"
      />
    </div>
  );
};

export default ImpositionPage;
