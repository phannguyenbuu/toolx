import React from 'react';
import {
  RenderProfileModalProps,
  getThemeClasses,
  useRenderProfileState,
  useRenderPreview,
  RenderProfileHeader,
  ProfileInfoStrip,
  RenderSettingsTab,
  ColorSettingsTab,
  RenderProfileFooter,
  OpenAiKeyModal
} from './renderProfile/index';

export type { RenderProfileModalProps };

export const RenderProfileModal: React.FC<RenderProfileModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  onSelectProfile,
  onSaveProfile,
  isLightMode,
  sampleCanvas,
  onApplyToAllPages
}) => {
  const theme = getThemeClasses(isLightMode);

  const {
    activeTab,
    setActiveTab,
    profilesList,
    editingProfile,
    setEditingProfile,
    colorSubTab,
    setColorSubTab,
    curveChannel,
    setCurveChannel,
    printedPhotoBase64,
    setPrintedPhotoBase64,
    isComparingAI,
    aiReport,
    aiError,
    apiKeyModalOpen,
    setApiKeyModalOpen,
    apiKeyInput,
    setApiKeyInput,
    showOriginal,
    setShowOriginal,
    toastMessage,
    fileInputRef,
    jsonInputRef,
    showToast,
    handleSwitchProfile,
    updateRenderSetting,
    updateColorSetting,
    toggleColorFilter,
    applyQuickCastCorrection,
    handleFileUpload,
    handleRunAICalibration,
    handleApplyToAllPages,
    handleSaveCurrentProfile,
    handleDuplicate,
    handleSetDefault,
    handleDelete,
    handleExportJson,
    handleImportJson
  } = useRenderProfileState({
    isOpen,
    activeProfile,
    onSelectProfile,
    onSaveProfile,
    onApplyToAllPages
  });

  const { previewCanvasRef } = useRenderPreview({
    sampleCanvas,
    showOriginal,
    colorFilterEnabled: editingProfile.colorFilterEnabled,
    colorSettings: editingProfile.colorSettings
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${
          isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* ================= HEADER ================= */}
        <RenderProfileHeader
          isLightMode={isLightMode}
          theme={theme}
          editingProfile={editingProfile}
          profilesList={profilesList}
          toastMessage={toastMessage}
          onSwitchProfile={handleSwitchProfile}
          onDuplicate={handleDuplicate}
          onSetDefault={handleSetDefault}
          onDelete={handleDelete}
          onClose={onClose}
        />

        {/* ================= PROFILE INFO STRIP & MAIN TABS ================= */}
        <ProfileInfoStrip
          isLightMode={isLightMode}
          theme={theme}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          editingProfile={editingProfile}
          onChangeName={(name) => setEditingProfile((prev) => ({ ...prev, name }))}
          onChangeMachineName={(machineName) =>
            setEditingProfile((prev) => ({ ...prev, machineName }))
          }
        />

        {/* ================= MODAL BODY ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: CẤU HÌNH PROFILE RENDER */}
          {activeTab === 'render' && (
            <RenderSettingsTab
              theme={theme}
              renderSettings={editingProfile.renderSettings}
              onUpdateRenderSetting={updateRenderSetting}
            />
          )}

          {/* TAB 2: CẤU HÌNH PROFILE COLOR (BỘ LỌC & CÂN MÀU AI) */}
          {activeTab === 'color' && (
            <ColorSettingsTab
              isLightMode={isLightMode}
              theme={theme}
              editingProfile={editingProfile}
              setEditingProfile={setEditingProfile}
              colorSubTab={colorSubTab}
              onSubTabChange={setColorSubTab}
              curveChannel={curveChannel}
              onCurveChannelChange={setCurveChannel}
              showOriginal={showOriginal}
              setShowOriginal={setShowOriginal}
              previewCanvasRef={previewCanvasRef}
              fileInputRef={fileInputRef}
              printedPhotoBase64={printedPhotoBase64}
              setPrintedPhotoBase64={setPrintedPhotoBase64}
              isComparingAI={isComparingAI}
              aiReport={aiReport}
              aiError={aiError}
              onToggleColorFilter={toggleColorFilter}
              onApplyQuickCastCorrection={applyQuickCastCorrection}
              onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
              onFileUpload={handleFileUpload}
              onRunAICalibration={() => handleRunAICalibration(previewCanvasRef.current)}
              onUpdateColorSetting={updateColorSetting}
              showToast={showToast}
            />
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <RenderProfileFooter
          isLightMode={isLightMode}
          jsonInputRef={jsonInputRef}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onClose={onClose}
          onApplyToAllPages={handleApplyToAllPages}
          onSaveCurrentProfile={handleSaveCurrentProfile}
        />

        {/* OPENAI KEY MODAL */}
        <OpenAiKeyModal
          isOpen={apiKeyModalOpen}
          isLightMode={isLightMode}
          theme={theme}
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          onClose={() => setApiKeyModalOpen(false)}
          showToast={showToast}
        />
      </div>
    </div>
  );
};
