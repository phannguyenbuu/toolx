import React from 'react';
import { AIColorInspectionModalProps } from './types';
import { useAIColorInspectionModalState } from './hooks/useAIColorInspectionModalState';
import { InspectionHeader } from './components/InspectionHeader';
import { InspectionTabSwitcher } from './components/InspectionTabSwitcher';
import { InspectionCompareTab } from './components/InspectionCompareTab';
import { InspectionInspectTab } from './components/InspectionInspectTab';
import { InspectionFooter } from './components/InspectionFooter';
import { InspectionApiKeyModal } from './components/InspectionApiKeyModal';

export const AIColorInspectionModal: React.FC<AIColorInspectionModalProps> = ({
  isOpen,
  onClose,
  report,
  isAnalyzing,
  onApplyRecommendations,
  activeHeatmapMode,
  onToggleHeatmap,
  isLightMode,
  studioCanvas,
  currentSettings,
}) => {
  const {
    activeTab,
    setActiveTab,
    printedPhotoBase64,
    isComparing,
    comparisonReport,
    compareError,
    appliedToast,
    apiKeyModalOpen,
    setApiKeyModalOpen,
    apiKeyInput,
    setApiKeyInput,
    apiKeySavedToast,
    fileInputRef,
    handleFileUpload,
    handleClearPhoto,
    handleRunCompare,
    handleApplyComparison,
    handleSaveApiKey,
  } = useAIColorInspectionModalState({
    studioCanvas,
    currentSettings,
    onApplyRecommendations,
  });

  if (!isOpen) return null;

  const themeModalBg = isLightMode ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100';
  const themeCardBg = isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/80';
  const themeCardInner = isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-700/60';
  const themeTextMuted = isLightMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-5xl max-h-[94vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          isLightMode ? 'border-slate-200 shadow-slate-400/20' : 'border-slate-700 shadow-black/80'
        } ${themeModalBg}`}
      >
        {/* MODAL HEADER */}
        <InspectionHeader
          isComparing={isComparing}
          isAnalyzing={isAnalyzing}
          isLightMode={isLightMode}
          themeTextMuted={themeTextMuted}
          onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
          onClose={onClose}
        />

        {/* TAB SWITCHER */}
        <InspectionTabSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          themeCardInner={themeCardInner}
          themeTextMuted={themeTextMuted}
        />

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === 'compare' && (
            <InspectionCompareTab
              studioCanvas={studioCanvas}
              printedPhotoBase64={printedPhotoBase64}
              isComparing={isComparing}
              compareError={compareError}
              comparisonReport={comparisonReport}
              appliedToast={appliedToast}
              isLightMode={isLightMode}
              themeCardBg={themeCardBg}
              themeCardInner={themeCardInner}
              themeTextMuted={themeTextMuted}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
              onClearPhoto={handleClearPhoto}
              onRunCompare={handleRunCompare}
              onApplyComparison={handleApplyComparison}
            />
          )}

          {activeTab === 'inspect' && (
            <InspectionInspectTab
              isAnalyzing={isAnalyzing}
              report={report}
              activeHeatmapMode={activeHeatmapMode}
              onToggleHeatmap={onToggleHeatmap}
              onApplyRecommendations={onApplyRecommendations}
              isLightMode={isLightMode}
              themeCardBg={themeCardBg}
              themeCardInner={themeCardInner}
              themeTextMuted={themeTextMuted}
            />
          )}
        </div>

        {/* MODAL FOOTER */}
        <InspectionFooter
          activeTab={activeTab}
          comparisonReport={comparisonReport}
          report={report}
          isLightMode={isLightMode}
          themeTextMuted={themeTextMuted}
          onClose={onClose}
          onApplyComparison={handleApplyComparison}
          onApplyReportRecommendations={() => {
            if (report) onApplyRecommendations(report.aiRecommendations.actionableSettings);
          }}
        />
      </div>

      {/* OPENAI API KEY SETTINGS MODAL */}
      <InspectionApiKeyModal
        isOpen={apiKeyModalOpen}
        apiKeyInput={apiKeyInput}
        onApiKeyInputChange={setApiKeyInput}
        apiKeySavedToast={apiKeySavedToast}
        isLightMode={isLightMode}
        themeModalBg={themeModalBg}
        themeTextMuted={themeTextMuted}
        onSave={handleSaveApiKey}
        onClose={() => setApiKeyModalOpen(false)}
      />
    </div>
  );
};

export default AIColorInspectionModal;
