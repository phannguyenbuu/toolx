import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { VectorMaskResult } from './VectorMaskEditorModal';
import { probeGoAgent, GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../services/goAgentService';

import {
  DEFAULT_CONFIG,
  ImpositionConfig,
  ShapeTabItem,
  PageItem,
  DataMode,
  ImpositionStyle,
  calculateSlotTotalRotation,
  getPageForSlot,
  calculatePlans,
  useCanvasContainer,
  useImpositionWorkspace,
  useImpositionHistory,
  useImpositionAutoSave,
  useImpositionActions,
  generateImpositionPdfBlob,
  ImpositionHeader,
  ImpositionLayerBar,
  ImpositionLayerCard,
  ImpositionPlanPicker,
  ImpositionCanvasView,
  ImpositionPaperSidebar,
  ImpositionPageModals,
  RenderSuccessInfo,
  SortJobModalData
} from './imposition';

export interface ImpositionAdvancedPageProps {
  onClose?: () => void;
}

export const ImpositionAdvancedPage: React.FC<ImpositionAdvancedPageProps> = ({ onClose }) => {
  const [config, setConfig] = useState<ImpositionConfig>(DEFAULT_CONFIG);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [allPages, setAllPages] = useState<PageItem[]>([]);
  const [dataMode, setDataMode] = useState<DataMode>(1);
  const [dataModeEnabled, setDataModeEnabled] = useState(true);
  const [standardQty, setStandardQty] = useState(1);
  const [xUpQty, setXUpQty] = useState(1);
  const [impositionStyle, setImpositionStyle] = useState<ImpositionStyle>('sheetwise');
  const [impositionStyleEnabled, setImpositionStyleEnabled] = useState(false);
  const [customScale, setCustomScale] = useState(100);
  const [customSvgData, setCustomSvgData] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [vectorMaskResult, setVectorMaskResult] = useState<VectorMaskResult | null>(null);

  const [shapeTabs, setShapeTabs] = useState<ShapeTabItem[]>([
    {
      id: 'tab-a', name: 'A', enabled: true, shape: 'rect', itemW: 90, itemH: 54,
      quantity: 10, useTotalLimit: false, cornerRadius: 0, sourceImage: null,
      vectorMaskResult: null, customSvgData: '', color: '#8b5cf6',
      autoRotateImage: true, canRotate: true
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-a');
  const activeTab = useMemo(() => shapeTabs.find(t => t.id === activeTabId) || shapeTabs[0], [shapeTabs, activeTabId]);
  const isMultiShape = shapeTabs.length > 1;

  // Zoom / Pan
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const layoutFingerprintRef = useRef('');
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const { containerRef, scale } = useCanvasContainer(config, setCanvasZoom);

  // Modals & UI States
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isCropColorModalOpen, setIsCropColorModalOpen] = useState(false);
  const [isVectorMaskEditorOpen, setIsVectorMaskEditorOpen] = useState(false);
  const [isCutSvgModalOpen, setIsCutSvgModalOpen] = useState(false);
  const [isPaperDropdownOpen, setIsPaperDropdownOpen] = useState(false);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [editingLayerModalTab, setEditingLayerModalTab] = useState<ShapeTabItem | null>(null);
  const [layerModalName, setLayerModalName] = useState('');
  const [layerModalColor, setLayerModalColor] = useState('');
  const [renderSuccessModal, setRenderSuccessModal] = useState<RenderSuccessInfo | null>(null);
  const [sortJobModalData, setSortJobModalData] = useState<SortJobModalData | null>(null);
  const [isExportingSortJob, setIsExportingSortJob] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);

  // Outpaint states
  const [isOutpaintPanelOpen, setIsOutpaintPanelOpen] = useState(false);
  const [outpaintConfig, setOutpaintConfig] = useState({ top: 3, bottom: 3, left: 3, right: 3 });
  const [outpaintProgress, setOutpaintProgress] = useState({ isProcessing: false, current: 0, total: 0 });

  // Render Engine Selection
  const [selectedRenderEngine, setSelectedRenderEngine] = useState<'auto' | 'goagent' | 'server'>('auto');
  const [selectedPresetId, setSelectedPresetId] = useState('gcr_22_swop');
  const [goAgentInfo, setGoAgentInfo] = useState<GoAgentInfo | null>(null);
  const [isProbingAgent, setIsProbingAgent] = useState(false);
  const [isSubmittingRender, setIsSubmittingRender] = useState(false);
  const [renderProgressText, setRenderProgressText] = useState('');

  // Refs for layer card inputs
  const sourceImageInputRef = useRef<HTMLInputElement>(null);
  const soLuongInputRef = useRef<HTMLInputElement>(null);
  const rongInputRef = useRef<HTMLInputElement>(null);
  const caoInputRef = useRef<HTMLInputElement>(null);

  // Probe GoAgent
  useEffect(() => {
    probeGoAgent(GOAGENT_DEFAULT_PORT)
      .then(info => setGoAgentInfo(info.detected ? info : null))
      .catch(() => setGoAgentInfo(null));
  }, []);

  // Layout calculation
  const plans = useMemo(() => {
    return calculatePlans(config, shapeTabs, isMultiShape, allPages);
  }, [config, shapeTabs, isMultiShape, allPages]);

  const currentPlan = useMemo(() => {
    if (plans.length === 0) return null;
    return plans[Math.min(currentPlanIndex, plans.length - 1)];
  }, [plans, currentPlanIndex]);

  // Sheets and blank slots
  const totalSheets = useMemo(() => {
    if (!currentPlan) return 1;
    if (isMultiShape) {
      const maxIdx = Math.max(...currentPlan.items.map(it => it.sheetIndex ?? 0), 0);
      return maxIdx + 1;
    }
    if (allPages.length > 0) {
      return Math.ceil(allPages.length / Math.max(1, currentPlan.items.length));
    }
    return 1;
  }, [currentPlan, isMultiShape, allPages.length]);

  const { hasLastSheetBlanks, lastSheetBlankCount } = useMemo(() => {
    if (!currentPlan || allPages.length === 0 || isMultiShape || totalSheets <= 1) {
      return { hasLastSheetBlanks: false, lastSheetBlankCount: 0 };
    }
    const rem = allPages.length % currentPlan.items.length;
    return {
      hasLastSheetBlanks: rem > 0,
      lastSheetBlankCount: rem > 0 ? currentPlan.items.length - rem : 0
    };
  }, [currentPlan, allPages.length, isMultiShape, totalSheets]);

  // Layer update helper
  const updateActiveTabProp = useCallback((props: Partial<ShapeTabItem>) => {
    setShapeTabs(tabs => tabs.map(t => t.id === activeTabId ? { ...t, ...props } : t));
  }, [activeTabId]);

  // History & Workspace hooks
  const sharedState = {
    config, setConfig, currentPlanIndex, setCurrentPlanIndex,
    shapeTabs, setShapeTabs, setActiveTabId, allPages, setAllPages,
    dataMode, setDataMode, dataModeEnabled, setDataModeEnabled,
    impositionStyle, setImpositionStyle, impositionStyleEnabled, setImpositionStyleEnabled,
    xUpQty, setXUpQty, standardQty, setStandardQty, customScale, setCustomScale,
    customSvgData, setCustomSvgData, backgroundColor, setBackgroundColor,
    vectorMaskResult, setVectorMaskResult
  };
  const historyHook = useImpositionHistory(sharedState);
  const workspaceHook = useImpositionWorkspace(sharedState);

  const autoSaveHook = useImpositionAutoSave({
    config, currentPlanIndex, shapeTabs, activeTabId, allPages,
    dataMode, dataModeEnabled, impositionStyle, impositionStyleEnabled,
    xUpQty, standardQty, customScale, customSvgData, backgroundColor, vectorMaskResult
  });

  const actionsHook = useImpositionActions({
    config,
    setConfig,
    activeTab,
    updateActiveTabProp,
    allPages,
    setAllPages,
    currentPlan,
    shapeTabs,
    isMultiShape,
    totalSheets,
    dataMode,
    standardQty,
    xUpQty,
    customSvgData,
    vectorMaskResult,
    backgroundColor,
    selectedRenderEngine,
    selectedPresetId,
    goAgentInfo,
    setShowDownloadModal,
    setRenderSuccessModal,
    setIsAiModalOpen,
    setIsFilePickerOpen
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 text-slate-800">
      {/* 1. Header */}
      <ImpositionHeader
        savedWorkspaces={workspaceHook.savedWorkspaces}
        isWorkspaceModalOpen={workspaceHook.isWorkspaceModalOpen}
        setIsWorkspaceModalOpen={workspaceHook.setIsWorkspaceModalOpen}
        localWorkspaceName={workspaceHook.localWorkspaceName}
        setLocalWorkspaceName={workspaceHook.setLocalWorkspaceName}
        saveWorkspace={workspaceHook.saveWorkspace}
        presetWorkspaces={workspaceHook.presetWorkspaces}
        loadWorkspace={workspaceHook.loadWorkspace}
        deleteWorkspace={workspaceHook.deleteWorkspace}
        allPages={allPages}
        setIsDataModalOpen={setIsDataModalOpen}
        setIsAiModalOpen={setIsAiModalOpen}
        setAiPreviewPages={() => {}}
        setAiResult={() => {}}
        setIsOutpaintPanelOpen={setIsOutpaintPanelOpen}
        setIsRightSidebarCollapsed={setIsRightSidebarCollapsed}
        dlSVG={() => setIsCutSvgModalOpen(true)}
        currentPlan={currentPlan}
        setIsRenderModalOpen={setIsRenderModalOpen}
        saveToFileManager={autoSaveHook.saveToFileManager}
        isSaving={autoSaveHook.isSaving}
        lastImpositionRender={null}
        setLastImpositionRender={() => {}}
        generateImpositionPdfBlob={() => generateImpositionPdfBlob({
          allPages, apiStatus: 'offline', currentPlan, config, customScale: 100,
          backgroundColor, dataMode, impositionStyle: 'sheetwise', impositionStyleEnabled: false,
          xUpQty, standardQty, totalSheets, shapeTabs, isMultiShape, previewSide: 'front'
        })}
        handleReset={() => {
          setConfig(DEFAULT_CONFIG);
          setAllPages([]);
        }}
        onClose={onClose}
      />

      {/* 2. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Layers, Controls, Plans */}
        <aside className="w-[576px] max-w-[45vw] bg-white border-r border-slate-200 flex flex-col overflow-y-auto flex-shrink-0 select-none z-10 shadow-xs">
          <ImpositionLayerBar
            shapeTabs={shapeTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            setShapeTabs={setShapeTabs}
            setEditingLayerModalTab={setEditingLayerModalTab}
            setLayerModalName={setLayerModalName}
            setLayerModalColor={setLayerModalColor}
          />
          <div className="p-3 border-b flex-shrink-0">
            <ImpositionLayerCard
              activeTab={activeTab}
              config={config}
              setConfig={setConfig}
              updateActiveTabProp={updateActiveTabProp}
              allPages={allPages}
              isMultiShape={isMultiShape}
              vectorMaskResult={vectorMaskResult}
              customScale={customScale}
              totalSheets={totalSheets}
              currentSheetIndex={currentSheetIndex}
              setCurrentSheetIndex={setCurrentSheetIndex}
              hasLastSheetBlanks={hasLastSheetBlanks}
              lastSheetBlankCount={lastSheetBlankCount}
              handleOpenSourceEditor={() => setIsCropColorModalOpen(true)}
              handleSourceImageSelect={actionsHook.handleSourceImageSelect}
              sourceImageInputRef={sourceImageInputRef}
              soLuongInputRef={soLuongInputRef}
              rongInputRef={rongInputRef}
              caoInputRef={caoInputRef}
              setIsVectorMaskEditorOpen={setIsVectorMaskEditorOpen}
              setIsScaleModalOpen={setIsScaleModalOpen}
            />
          </div>
          <ImpositionPlanPicker
            plans={plans}
            currentPlan={currentPlan}
            currentPlanIndex={currentPlanIndex}
            setCurrentPlanIndex={setCurrentPlanIndex}
            config={config}
            setConfig={setConfig}
            layoutFingerprintRef={layoutFingerprintRef}
            handleExportSortJob={() => {}}
            isExportingSortJob={isExportingSortJob}
            isMultiShape={isMultiShape}
            shapeTabs={shapeTabs}
            allPages={allPages}
          />
        </aside>

        {/* Center: Canvas View */}
        <ImpositionCanvasView
          containerRef={containerRef}
          canvasPan={canvasPan}
          setCanvasPan={setCanvasPan}
          canvasZoom={canvasZoom}
          setCanvasZoom={setCanvasZoom}
          isPanning={isPanning}
          setIsPanning={setIsPanning}
          panStartRef={panStartRef}
          panOffsetRef={panOffsetRef}
          currentPlan={currentPlan}
          styledPlan={null}
          impositionStyleEnabled={impositionStyleEnabled}
          totalSheets={totalSheets}
          currentSheetIndex={currentSheetIndex}
          setCurrentSheetIndex={setCurrentSheetIndex}
          config={config}
          setConfig={setConfig}
          scale={scale}
          isMultiShape={isMultiShape}
          shapeTabs={shapeTabs}
          activeTab={activeTab}
          allPages={allPages}
          customSvgData={customSvgData}
          vectorMaskResult={vectorMaskResult}
          previewSide={previewSide}
          setPreviewSide={setPreviewSide}
          serverPreviewUrl=""
          isLoadingServerPreview={false}
          dragOverSheetIdx={null}
          setDragOverSheetIdx={() => {}}
          draggedSlotIdx={null}
          setDraggedSlotIdx={() => {}}
          dragOverSlotIdx={null}
          setDragOverSlotIdx={() => {}}
          setDraggedItemData={() => {}}
          handleMoveItemToSheet={() => {}}
          handleMovePageToSheet={() => {}}
          handleSwapSlots={() => {}}
          handleSwapDataPages={() => {}}
          getPageForSlot={(slotIdx, sIdx) => getPageForSlot({
            slotIndex: slotIdx, sheetIdx: sIdx, allPagesLength: allPages.length,
            itemsPerSheet: currentPlan?.items?.length || 1, isMultiShape,
            useTotalLimit: config.useTotalLimit, totalOrder: config.totalOrder,
            is2Sided: config.is2Sided, twoSideMode: config.twoSideMode,
            previewSide, effectiveDataMode: dataMode, standardQty, xUpQty
          })}
          calculateSlotTotalRotation={(it, page, isBack) => calculateSlotTotalRotation(it, page, config, isMultiShape, shapeTabs, isBack)}
          hasLastSheetBlanks={hasLastSheetBlanks}
          lastSheetBlankCount={lastSheetBlankCount}
          isRightSidebarCollapsed={isRightSidebarCollapsed}
          toggleRightSidebar={() => setIsRightSidebarCollapsed(c => !c)}
        />

        {/* Right Side: Paper Settings & History Sidebar */}
        <ImpositionPaperSidebar
          isRightSidebarCollapsed={isRightSidebarCollapsed}
          config={config}
          setConfig={setConfig}
          updatePrint={(w, h) => setConfig(c => ({ ...c, pageW: w, pageH: h }))}
          currentPresetName={`${config.pageW}x${config.pageH}mm`}
          setIsPaperDropdownOpen={setIsPaperDropdownOpen}
          isOutpaintPanelOpen={isOutpaintPanelOpen}
          setIsOutpaintPanelOpen={setIsOutpaintPanelOpen}
          outpaintConfig={outpaintConfig}
          setOutpaintConfig={setOutpaintConfig}
          outpaintProgress={outpaintProgress}
          handleOutpaint={() => {}}
          allPages={allPages}
          impositionHistory={historyHook.impositionHistory}
          handleRequestRestoreHistory={historyHook.handleRequestRestoreHistory}
          handleExportSortJob={() => {}}
          isExportingSortJob={isExportingSortJob}
          deleteHistoryItem={historyHook.deleteHistoryItem}
          clearHistory={historyHook.clearHistory}
        />
      </div>

      {/* 3. Modal Dialogs */}
      <ImpositionPageModals
        isPaperDropdownOpen={isPaperDropdownOpen}
        setIsPaperDropdownOpen={setIsPaperDropdownOpen}
        config={config}
        setConfig={setConfig}
        editingLayerModalTab={editingLayerModalTab}
        setEditingLayerModalTab={setEditingLayerModalTab}
        layerModalName={layerModalName}
        setLayerModalName={setLayerModalName}
        layerModalColor={layerModalColor}
        setLayerModalColor={setLayerModalColor}
        shapeTabs={shapeTabs}
        setShapeTabs={setShapeTabs}
        isScaleModalOpen={isScaleModalOpen}
        setIsScaleModalOpen={setIsScaleModalOpen}
        customScale={customScale}
        setCustomScale={setCustomScale}
        backgroundColor={backgroundColor}
        setBackgroundColor={setBackgroundColor}
        isUnsavedWarningModalOpen={historyHook.isUnsavedWarningModalOpen}
        setIsUnsavedWarningModalOpen={historyHook.setIsUnsavedWarningModalOpen}
        pendingHistoryToLoad={historyHook.pendingHistoryToLoad}
        setPendingHistoryToLoad={historyHook.setPendingHistoryToLoad}
        applyHistoryItem={historyHook.applyHistoryItem}
        saveToFileManager={autoSaveHook.saveToFileManager}
        isDataModalOpen={isDataModalOpen}
        setIsDataModalOpen={setIsDataModalOpen}
        dataModeEnabled={dataModeEnabled}
        setDataModeEnabled={setDataModeEnabled}
        dataMode={dataMode}
        setDataMode={setDataMode}
        standardQty={standardQty}
        setStandardQty={setStandardQty}
        xUpQty={xUpQty}
        setXUpQty={setXUpQty}
        impositionStyleEnabled={impositionStyleEnabled}
        setImpositionStyleEnabled={setImpositionStyleEnabled}
        impositionStyle={impositionStyle}
        setImpositionStyle={setImpositionStyle}
        skipThumbnails={actionsHook.skipThumbnails}
        setSkipThumbnails={actionsHook.setSkipThumbnails}
        handleMultiFileUpload={actionsHook.handleMultiFileUpload}
        uploadProgress={actionsHook.uploadProgress}
        allPages={allPages}
        setAllPages={setAllPages}
        isAiModalOpen={isAiModalOpen}
        setIsAiModalOpen={setIsAiModalOpen}
        aiPrompt={actionsHook.aiPrompt}
        setAiPrompt={actionsHook.setAiPrompt}
        aiLoading={actionsHook.aiLoading}
        handleAiArrange={actionsHook.handleAiArrange}
        aiPreviewPages={actionsHook.aiPreviewPages}
        aiResult={actionsHook.aiResult}
        applyAiResult={actionsHook.applyAiResult}
        showDownloadModal={showDownloadModal}
        setShowDownloadModal={setShowDownloadModal}
        confirmDownloadPDF={actionsHook.confirmDownloadPDF}
        isRenderModalOpen={isRenderModalOpen}
        setIsRenderModalOpen={setIsRenderModalOpen}
        isSubmittingRender={isSubmittingRender}
        isProbingAgent={isProbingAgent}
        selectedRenderEngine={selectedRenderEngine}
        setSelectedRenderEngine={setSelectedRenderEngine}
        goAgentInfo={goAgentInfo}
        selectedPresetId={selectedPresetId}
        setSelectedPresetId={setSelectedPresetId}
        currentPlan={currentPlan}
        renderProgressText={renderProgressText}
        renderSuccessModal={renderSuccessModal}
        setRenderSuccessModal={setRenderSuccessModal}
        sortJobModalData={sortJobModalData}
        setSortJobModalData={setSortJobModalData}
        copiedJobId={copiedJobId}
        setCopiedJobId={setCopiedJobId}
        isCropColorModalOpen={isCropColorModalOpen}
        setIsCropColorModalOpen={setIsCropColorModalOpen}
        activeTab={activeTab}
        activeTabId={activeTabId}
        updateActiveTabProp={updateActiveTabProp}
        isVectorMaskEditorOpen={isVectorMaskEditorOpen}
        setIsVectorMaskEditorOpen={setIsVectorMaskEditorOpen}
        vectorMaskResult={vectorMaskResult}
        setVectorMaskResult={setVectorMaskResult}
        isCutSvgModalOpen={isCutSvgModalOpen}
        setIsCutSvgModalOpen={setIsCutSvgModalOpen}
        plans={plans}
        currentPlanIndex={currentPlanIndex}
        currentSheetIndex={currentSheetIndex}
        totalSheets={totalSheets}
        isMultiShape={isMultiShape}
        isFilePickerOpen={isFilePickerOpen}
        setIsFilePickerOpen={setIsFilePickerOpen}
        handleFileFromManager={actionsHook.handleFileFromManager}
      />
    </div>
  );
};

export default ImpositionAdvancedPage;
