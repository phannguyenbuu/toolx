import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

import {
  RenderPdfPageProps,
  RenderPdfHeader,
  RenderPdfHistorySidebar,
  RenderPdfEngineSelector,
  RenderPdfUploadZone,
  RenderPdfColorPanel,
  RenderPdfSuccessModal,
  DownloadsModal,
  DiagnoseModal,
  OfflineViewerModal,
  ColorStudioModal,
  useRenderEngine,
  useRenderProfiles,
  useRenderHistory,
  useRenderUpload,
  useColorStudio,
  useOfflinePdfRender
} from './renderPdf';

import { RenderProfileModal } from './RenderProfileModal';
import { AIColorInspectionModal } from './AIColorInspectionModal';

export const RenderPdfPage: React.FC<RenderPdfPageProps> = ({ onClose, initialFile }) => {
  // Theme state: Sáng (Light) / Tối (Dark)
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('toolx_render_theme');
      return saved !== 'dark';
    }
    return true;
  });

  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('toolx_render_theme', next ? 'light' : 'dark');
      }
      return next;
    });
  };

  const apiBase = '/render-agent';

  // Secondary views modals
  const [diagnoseModalOpen, setDiagnoseModalOpen] = useState<boolean>(false);
  const [downloadsModalOpen, setDownloadsModalOpen] = useState<boolean>(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState<boolean>(false);

  // Composed subsystem hooks
  const engine = useRenderEngine();
  const colorStudio = useColorStudio(apiBase);
  const profiles = useRenderProfiles({
    setColorSettings: colorStudio.setColorSettings,
    renderEngine: engine.renderEngine,
    setRenderEngine: engine.setRenderEngine,
    handleSelectRenderOption: engine.handleSelectRenderOption
  });
  const history = useRenderHistory(apiBase);
  const offline = useOfflinePdfRender({
    initialFile,
    activeProfile: profiles.activeProfile,
    offlineModalOpen
  });

  const upload = useRenderUpload({
    apiBase,
    effectiveEngine: engine.effectiveEngine,
    selectedRenderNodeUid: engine.selectedRenderNodeUid,
    renderNodes: engine.renderNodes,
    goAgentInfo: engine.goAgentInfo,
    advancedSettings: profiles.advancedSettings,
    setAdvancedSettings: profiles.setAdvancedSettings,
    cloudDpi: profiles.cloudDpi,
    setCloudDpi: profiles.setCloudDpi,
    colorspace: profiles.colorspace,
    setColorspace: profiles.setColorspace,
    selectedProfile: profiles.selectedProfile,
    useIcc: profiles.useIcc,
    compression: profiles.compression,
    convertToPdf: profiles.convertToPdf,
    setConvertToPdf: profiles.setConvertToPdf,
    setDpiOptions: profiles.setDpiOptions,
    activeProfile: profiles.activeProfile,
    handleSelectProfileById: profiles.handleSelectProfileById,
    fetchDocuments: history.fetchDocuments,
    setDocuments: history.setDocuments,
    setTotalCount: history.setTotalCount,
    setRenderEngine: engine.setRenderEngine,
    setSelectedRenderNodeUid: engine.setSelectedRenderNodeUid
  });

  // Ngăn chặn kéo thả tệp ngoài ý muốn ra ngoài dropzone
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => e.preventDefault();
    const handleWindowDrop = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // Theme helper classes
  const themeCard = isLightMode ? 'bg-white border-slate-200/90' : 'bg-slate-900 border-slate-800';
  const themeCardInner = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-950/70 border-slate-850';
  const themeTextHead = isLightMode ? 'text-slate-900 font-semibold tracking-tight' : 'text-white font-semibold tracking-tight';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeInput = isLightMode ? 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500';

  return (
    <div className={`flex flex-col h-full overflow-hidden select-none ${isLightMode ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <Toaster position="top-right" />

      {/* HEADER NAVIGATION */}
      <RenderPdfHeader
        diagnoseModalOpen={diagnoseModalOpen}
        setDiagnoseModalOpen={setDiagnoseModalOpen}
        activeProfile={profiles.activeProfile}
        profilesList={profiles.profilesList}
        handleSelectProfileById={profiles.handleSelectProfileById}
        slicingWarning={upload.slicingWarning}
        profileModalOpen={profiles.profileModalOpen}
        setProfileModalOpen={profiles.setProfileModalOpen}
        isLightMode={isLightMode}
        toggleTheme={toggleTheme}
        goAgentInfo={engine.goAgentInfo}
        checkGoAgent={engine.checkGoAgent}
        isProbingAgent={engine.isProbingAgent}
        isRightSidebarVisible={history.isRightSidebarVisible}
        toggleRightSidebar={history.toggleRightSidebar}
        totalCount={history.totalCount}
        onClose={onClose}
      />

      {/* BODY CONTENT: MAIN WORKSPACE + RIGHT SIDEBAR */}
      <div className="flex-1 overflow-hidden relative flex flex-row">
        {/* MAIN VIEWPORT: CLOUD RENDER DASHBOARD */}
        <div className="flex-1 h-full overflow-y-auto p-4 md:p-6 transition-all duration-300">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* UPLOAD VECTOR & RENDER CONFIGURATION PANEL */}
            <div className={`border rounded-2xl p-5 md:p-6 shadow-sm ${themeCard}`}>
              <form onSubmit={upload.handleCloudSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: Engine & Upload Area */}
                  <div className="space-y-4">
                    <RenderPdfEngineSelector
                      renderEngine={engine.renderEngine}
                      selectedRenderNodeUid={engine.selectedRenderNodeUid}
                      renderNodes={engine.renderNodes}
                      effectiveEngine={engine.effectiveEngine}
                      selectedNode={engine.selectedNode}
                      goAgentInfo={engine.goAgentInfo}
                      onSelectRenderOption={engine.handleSelectRenderOption}
                      themeCardInner={themeCardInner}
                      themeTextMuted={themeTextMuted}
                    />
                    <RenderPdfUploadZone
                      cloudFileInputRef={upload.cloudFileInputRef}
                      clientPreviewCanvasRef={upload.clientPreviewCanvasRef}
                      cloudFile={upload.cloudFile}
                      cloudFileName={upload.cloudFileName}
                      pdfPageDimensions={upload.pdfPageDimensions}
                      slicingWarning={upload.slicingWarning}
                      isDraggingOver={upload.isDraggingOver}
                      isUploading={upload.isUploading}
                      effectiveEngine={engine.effectiveEngine}
                      localRenderingProgress={upload.localRenderingProgress || ''}
                      uploadError={upload.uploadError || ''}
                      isLightMode={isLightMode}
                      themeCardInner={themeCardInner}
                      themeTextMuted={themeTextMuted}
                      onDragOver={upload.handleDragOver}
                      onDragLeave={upload.handleDragLeave}
                      onDrop={upload.handleDrop}
                      onFileSelect={upload.handleCloudFileSelect}
                    />
                  </div>

                  {/* RIGHT COLUMN: Settings, Presets & Actions */}
                  <RenderPdfColorPanel
                    isAdvancedPanelExpanded={profiles.isAdvancedPanelExpanded}
                    toggleAdvancedPanel={profiles.toggleAdvancedPanel}
                    advancedSettings={profiles.advancedSettings}
                    cloudDpi={profiles.cloudDpi}
                    currentActivePresetId={profiles.currentActivePresetId}
                    handleApplyPreset={profiles.handleApplyPreset}
                    isLightMode={isLightMode}
                    themeCardInner={themeCardInner}
                    themeTextHead={themeTextHead}
                    themeTextMuted={themeTextMuted}
                    themeInput={themeInput}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: JOBS / QUEUE PANEL */}
        <RenderPdfHistorySidebar
          isRightSidebarVisible={history.isRightSidebarVisible}
          isRightSidebarHovered={history.isRightSidebarHovered}
          handleRightSidebarHoverEnter={history.handleRightSidebarHoverEnter}
          handleRightSidebarHoverLeave={history.handleRightSidebarHoverLeave}
          toggleRightSidebar={history.toggleRightSidebar}
          totalCount={history.totalCount}
          fetchDocuments={history.fetchDocuments}
          isLoadingDocs={history.isLoadingDocs}
          diagDropdownOpen={history.diagDropdownOpen}
          setDiagDropdownOpen={history.setDiagDropdownOpen}
          handleViewAgentLog={history.handleViewAgentLog}
          documents={history.documents}
          handleClearAllDocs={history.handleClearAllDocs}
          handleDeleteDoc={history.handleDeleteDoc}
          handleDownloadRenderedDoc={history.handleDownloadRenderedDoc}
          handleOpenColorStudio={colorStudio.handleOpenColorStudio}
          perPage={history.perPage}
          setPerPage={history.setPerPage}
          currentPageNum={history.currentPageNum}
          setCurrentPageNum={history.setCurrentPageNum}
          totalPagesNum={history.totalPagesNum}
          isLightMode={isLightMode}
        />
      </div>

      {/* ================= MODALS ================= */}
      <RenderPdfSuccessModal
        isOpen={upload.renderSuccessModal.isOpen}
        onClose={() => upload.setRenderSuccessModal((prev) => ({ ...prev, isOpen: false }))}
        renderSuccessModal={upload.renderSuccessModal}
        triggerFileDownload={history.triggerFileDownload}
        onOpenColorStudio={(url, filename) => colorStudio.handleOpenColorStudio(url, filename)}
        isLightMode={isLightMode}
      />

      <DiagnoseModal
        isOpen={diagnoseModalOpen}
        onClose={() => setDiagnoseModalOpen(false)}
        diagData={history.diagData}
        handleMaximizePagefile={history.handleMaximizePagefile}
        handleRestartAgent={history.handleRestartAgent}
        handleViewAgentLog={history.handleViewAgentLog}
        logModalOpen={history.logModalOpen}
        setLogModalOpen={history.setLogModalOpen}
        logModalTitle={history.logModalTitle}
        logModalContent={history.logModalContent}
        logLoading={history.logLoading}
        copiedLog={history.copiedLog}
        handleCopyLogContent={history.handleCopyLogContent}
        isLightMode={isLightMode}
      />

      <DownloadsModal
        isOpen={downloadsModalOpen}
        onClose={() => setDownloadsModalOpen(false)}
        effectiveEngine={engine.effectiveEngine}
        selectedNode={engine.selectedNode}
        goAgentInfo={engine.goAgentInfo}
        isMobile={engine.isMobile}
        checkGoAgent={engine.checkGoAgent}
        fetchRenderNodes={engine.fetchRenderNodes}
        isProbingAgent={engine.isProbingAgent}
        isFetchingNodes={engine.isFetchingNodes}
        renderNodes={engine.renderNodes}
        selectedRenderNodeUid={engine.selectedRenderNodeUid}
        handleSelectRenderOption={engine.handleSelectRenderOption}
        isLightMode={isLightMode}
      />

      <OfflineViewerModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        offlinePdfDoc={offline.offlinePdfDoc}
        offlineFileName={offline.offlineFileName}
        offlineFileSize={offline.offlineFileSize}
        offlineTotalPages={offline.offlineTotalPages}
        offlineCurrentPage={offline.offlineCurrentPage}
        setOfflineCurrentPage={offline.setOfflineCurrentPage}
        offlinePagesMeta={offline.offlinePagesMeta}
        offlineDpi={offline.offlineDpi}
        setOfflineDpi={offline.setOfflineDpi}
        offlineZoom={offline.offlineZoom}
        setOfflineZoom={offline.setOfflineZoom}
        offlineColorMode={offline.offlineColorMode}
        setOfflineColorMode={offline.setOfflineColorMode}
        offlineFormat={offline.offlineFormat}
        setOfflineFormat={offline.setOfflineFormat}
        offlineJpegQuality={offline.offlineJpegQuality}
        setOfflineJpegQuality={offline.setOfflineJpegQuality}
        offlineTransparentBg={offline.offlineTransparentBg}
        setOfflineTransparentBg={offline.setOfflineTransparentBg}
        offlineIsRendering={offline.offlineIsRendering}
        isExportingAllPages={offline.isExportingAllPages}
        exportProgressText={offline.exportProgressText}
        offlineCanvasRef={offline.offlineCanvasRef}
        offlineFileInputRef={offline.offlineFileInputRef}
        handleOfflineFileUpload={offline.handleOfflineFileUpload}
        processOfflineFile={offline.processOfflineFile}
        handleExportAllPagesCalibrated={offline.handleExportAllPagesCalibrated}
        handleOfflineDownloadSingle={offline.handleOfflineDownloadSingle}
        handleOpenColorStudio={colorStudio.handleOpenColorStudio}
        handleOpenWithAICheck={colorStudio.handleOpenWithAICheck}
        setProfileModalOpen={profiles.setProfileModalOpen}
        activeProfile={profiles.activeProfile}
        isLightMode={isLightMode}
      />

      <ColorStudioModal
        isOpen={colorStudio.previewModalOpen}
        onClose={() => colorStudio.setPreviewModalOpen(false)}
        previewDocTitle={colorStudio.previewDocTitle}
        colorSettings={colorStudio.colorSettings}
        setColorSettings={colorStudio.setColorSettings}
        colorTab={colorStudio.colorTab}
        setColorTab={colorStudio.setColorTab}
        curveChannel={colorStudio.curveChannel}
        setCurveChannel={colorStudio.setCurveChannel}
        showCompareOriginal={colorStudio.showCompareOriginal}
        setShowCompareOriginal={colorStudio.setShowCompareOriginal}
        previewZoom={colorStudio.previewZoom}
        setPreviewZoom={colorStudio.setPreviewZoom}
        handleFitStudioZoom={colorStudio.handleFitStudioZoom}
        isStudioLoading={colorStudio.isStudioLoading}
        studioLoadingText={colorStudio.studioLoadingText}
        canvasDims={colorStudio.canvasDims}
        activeHeatmapMode={colorStudio.activeHeatmapMode}
        studioScrollAreaRef={colorStudio.studioScrollAreaRef}
        studioCanvasRef={colorStudio.studioCanvasRef}
        heatmapCanvasRef={colorStudio.heatmapCanvasRef}
        handleRunAIColorCheck={colorStudio.handleRunAIColorCheck}
        isAIAnalyzing={colorStudio.isAIAnalyzing}
        handleResetColorSettings={colorStudio.handleResetColorSettings}
        handleDownloadAdjustedImage={colorStudio.handleDownloadAdjustedImage}
        handleCopyAdjustedImageToClipboard={colorStudio.handleCopyAdjustedImageToClipboard}
        copiedPreviewToast={colorStudio.copiedPreviewToast}
        isLightMode={isLightMode}
      />

      <RenderProfileModal
        isOpen={profiles.profileModalOpen}
        onClose={() => profiles.setProfileModalOpen(false)}
        activeProfile={profiles.activeProfile}
        onSelectProfile={(p) => profiles.handleSelectProfileById(p.id)}
        onSaveProfile={(p) => {
          profiles.handleSaveAdvancedSettings(p.renderSettings);
          colorStudio.setColorSettings(p.colorSettings);
        }}
        isLightMode={isLightMode}
      />

      <AIColorInspectionModal
        isOpen={colorStudio.aiInspectionModalOpen}
        onClose={() => colorStudio.setAiInspectionModalOpen(false)}
        report={colorStudio.aiInspectionReport}
        isAnalyzing={colorStudio.isAIAnalyzing}
        onApplyRecommendations={colorStudio.handleApplyAIRecommendations}
        activeHeatmapMode={colorStudio.activeHeatmapMode}
        onToggleHeatmap={colorStudio.setActiveHeatmapMode}
        onRecheck={() => { void colorStudio.handleRunAIColorCheck(); }}
        isLightMode={isLightMode}
        studioCanvas={colorStudio.studioCanvasRef.current}
        currentSettings={colorStudio.colorSettings}
      />
    </div>
  );
};

export default RenderPdfPage;
