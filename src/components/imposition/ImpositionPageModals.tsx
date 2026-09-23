import React from 'react';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode, ImpositionStyle } from './types';
import { VectorMaskEditorModal, VectorMaskResult } from '../VectorMaskEditorModal';
import { CutDielineModal } from '../CutDielineModal';
import { FilePickerModal } from '../FilePickerModal';
import { SourceImageCropColorModal } from '../SourceImageCropColorModal';
import { calculateStandardImageDimensionsMm } from '../../utils/imageDimensions';
import { safeToastSuccess } from './impositionHelpers';
import { LayoutPlan } from '../../utils/layoutSolver';
import { ImpositionPaperCatalogModal } from './modals/ImpositionPaperCatalogModal';
import { ImpositionLayerEditModals } from './modals/ImpositionLayerEditModals';
import { ImpositionDataModal } from './modals/ImpositionDataModal';
import { ImpositionAiModal } from './modals/ImpositionAiModal';
import { ImpositionExportModal } from './modals/ImpositionExportModal';
import { ImpositionRenderModal } from './modals/ImpositionRenderModal';
import { ImpositionRenderSuccessModal, RenderSuccessInfo } from './modals/ImpositionRenderSuccessModal';
import { ImpositionSortJobModal, SortJobModalData } from './modals/ImpositionSortJobModal';
import { GoAgentInfo } from '../../services/goAgentService';

export interface ImpositionPageModalsProps {
  // Paper catalog modal
  isPaperDropdownOpen: boolean;
  setIsPaperDropdownOpen: (open: boolean) => void;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;

  // Layer edit modals
  editingLayerModalTab: ShapeTabItem | null;
  setEditingLayerModalTab: (tab: ShapeTabItem | null) => void;
  layerModalName: string;
  setLayerModalName: (name: string) => void;
  layerModalColor: string;
  setLayerModalColor: (color: string) => void;
  shapeTabs: ShapeTabItem[];
  setShapeTabs: React.Dispatch<React.SetStateAction<ShapeTabItem[]>>;
  isScaleModalOpen: boolean;
  setIsScaleModalOpen: (open: boolean) => void;
  customScale: number;
  setCustomScale: (scale: number) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  isUnsavedWarningModalOpen: boolean;
  setIsUnsavedWarningModalOpen: (open: boolean) => void;
  pendingHistoryToLoad: any;
  setPendingHistoryToLoad: (item: any) => void;
  applyHistoryItem: (item: any) => void;
  saveToFileManager: (silent?: boolean) => Promise<boolean>;

  // Data modal
  isDataModalOpen: boolean;
  setIsDataModalOpen: (open: boolean) => void;
  dataModeEnabled: boolean;
  setDataModeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  standardQty: number;
  setStandardQty: (qty: number) => void;
  xUpQty: number;
  setXUpQty: (qty: number) => void;
  impositionStyleEnabled: boolean;
  setImpositionStyleEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  impositionStyle: ImpositionStyle;
  setImpositionStyle: (style: ImpositionStyle) => void;
  skipThumbnails: boolean;
  setSkipThumbnails: (skip: boolean) => void;
  handleMultiFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadProgress: { show: boolean; current: number; total: number; percent: number };
  allPages: PageItem[];
  setAllPages: React.Dispatch<React.SetStateAction<PageItem[]>>;

  // AI Modal
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  aiLoading: boolean;
  handleAiArrange: () => void;
  aiPreviewPages: PageItem[];
  aiResult: any;
  applyAiResult: () => void;

  // Export Modal
  showDownloadModal: boolean;
  setShowDownloadModal: (open: boolean) => void;
  confirmDownloadPDF: () => void;

  // Render Modal
  isRenderModalOpen: boolean;
  setIsRenderModalOpen: (open: boolean) => void;
  isSubmittingRender: boolean;
  isProbingAgent: boolean;
  selectedRenderEngine: 'auto' | 'goagent' | 'server';
  setSelectedRenderEngine: (engine: 'auto' | 'goagent' | 'server') => void;
  goAgentInfo: GoAgentInfo | null;
  selectedPresetId: string;
  setSelectedPresetId: (id: string) => void;
  currentPlan: LayoutPlan | null;
  renderProgressText: string;

  // Render Result & SortJob Modals
  renderSuccessModal: RenderSuccessInfo | null;
  setRenderSuccessModal: (info: RenderSuccessInfo | null) => void;
  sortJobModalData: SortJobModalData | null;
  setSortJobModalData: (data: SortJobModalData | null) => void;
  copiedJobId: boolean;
  setCopiedJobId: (copied: boolean) => void;

  // Crop Color Studio Modal
  isCropColorModalOpen: boolean;
  setIsCropColorModalOpen: (open: boolean) => void;
  activeTab: ShapeTabItem;
  activeTabId: string;
  updateActiveTabProp: (props: Partial<ShapeTabItem>) => void;

  // Vector Mask Editor Modal
  isVectorMaskEditorOpen: boolean;
  setIsVectorMaskEditorOpen: (open: boolean) => void;
  vectorMaskResult: VectorMaskResult | null;
  setVectorMaskResult: (res: VectorMaskResult | null) => void;

  // Cut Dieline & File Picker Modals
  isCutSvgModalOpen: boolean;
  setIsCutSvgModalOpen: (open: boolean) => void;
  plans: LayoutPlan[];
  currentPlanIndex: number;
  currentSheetIndex?: number;
  totalSheets?: number;
  isMultiShape?: boolean;
  isFilePickerOpen: boolean;
  setIsFilePickerOpen: (open: boolean) => void;
  handleFileFromManager: (file: any) => void;
}

export const ImpositionPageModals: React.FC<ImpositionPageModalsProps> = ({
  isPaperDropdownOpen,
  setIsPaperDropdownOpen,
  currentSheetIndex = 0,
  totalSheets = 1,
  isMultiShape = false,
  config,
  setConfig,
  editingLayerModalTab,
  setEditingLayerModalTab,
  layerModalName,
  setLayerModalName,
  layerModalColor,
  setLayerModalColor,
  shapeTabs,
  setShapeTabs,
  isScaleModalOpen,
  setIsScaleModalOpen,
  customScale,
  setCustomScale,
  backgroundColor,
  setBackgroundColor,
  isUnsavedWarningModalOpen,
  setIsUnsavedWarningModalOpen,
  pendingHistoryToLoad,
  setPendingHistoryToLoad,
  applyHistoryItem,
  saveToFileManager,
  isDataModalOpen,
  setIsDataModalOpen,
  dataModeEnabled,
  setDataModeEnabled,
  dataMode,
  setDataMode,
  standardQty,
  setStandardQty,
  xUpQty,
  setXUpQty,
  impositionStyleEnabled,
  setImpositionStyleEnabled,
  impositionStyle,
  setImpositionStyle,
  skipThumbnails,
  setSkipThumbnails,
  handleMultiFileUpload,
  uploadProgress,
  allPages,
  setAllPages,
  isAiModalOpen,
  setIsAiModalOpen,
  aiPrompt,
  setAiPrompt,
  aiLoading,
  handleAiArrange,
  aiPreviewPages,
  aiResult,
  applyAiResult,
  showDownloadModal,
  setShowDownloadModal,
  confirmDownloadPDF,
  isRenderModalOpen,
  setIsRenderModalOpen,
  isSubmittingRender,
  isProbingAgent,
  selectedRenderEngine,
  setSelectedRenderEngine,
  goAgentInfo,
  selectedPresetId,
  setSelectedPresetId,
  currentPlan,
  renderProgressText,
  renderSuccessModal,
  setRenderSuccessModal,
  sortJobModalData,
  setSortJobModalData,
  copiedJobId,
  setCopiedJobId,
  isCropColorModalOpen,
  setIsCropColorModalOpen,
  activeTab,
  activeTabId,
  updateActiveTabProp,
  isVectorMaskEditorOpen,
  setIsVectorMaskEditorOpen,
  vectorMaskResult,
  setVectorMaskResult,
  isCutSvgModalOpen,
  setIsCutSvgModalOpen,
  plans,
  currentPlanIndex,
  isFilePickerOpen,
  setIsFilePickerOpen,
  handleFileFromManager
}) => {
  return (
    <>
      <ImpositionPaperCatalogModal
        isOpen={isPaperDropdownOpen}
        onClose={() => setIsPaperDropdownOpen(false)}
        config={config}
        updatePrint={(w, h) => {
          setConfig(c => ({ ...c, pageW: w, pageH: h }));
          setIsPaperDropdownOpen(false);
        }}
        currentPresetName={`${config.pageW}x${config.pageH}mm`}
      />

      <ImpositionLayerEditModals
        editingLayerModalTab={editingLayerModalTab}
        setEditingLayerModalTab={setEditingLayerModalTab}
        layerModalName={layerModalName}
        setLayerModalName={setLayerModalName}
        layerModalColor={layerModalColor}
        setLayerModalColor={setLayerModalColor}
        handleSaveLayerModal={() => {
          if (editingLayerModalTab) {
            setShapeTabs(tabs => tabs.map(t => t.id === editingLayerModalTab.id ? { ...t, name: layerModalName, color: layerModalColor } : t));
            setEditingLayerModalTab(null);
          }
        }}
        isScaleModalOpen={isScaleModalOpen}
        setIsScaleModalOpen={setIsScaleModalOpen}
        customScale={customScale}
        setCustomScale={setCustomScale}
        backgroundColor={backgroundColor}
        setBackgroundColor={setBackgroundColor}
        isUnsavedWarningModalOpen={isUnsavedWarningModalOpen}
        setIsUnsavedWarningModalOpen={setIsUnsavedWarningModalOpen}
        pendingHistoryToLoad={pendingHistoryToLoad}
        setPendingHistoryToLoad={setPendingHistoryToLoad}
        applyHistoryItem={applyHistoryItem}
        saveToFileManager={saveToFileManager}
      />

      <ImpositionDataModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
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
        setConfig={setConfig}
        skipThumbnails={skipThumbnails}
        setSkipThumbnails={setSkipThumbnails}
        handleMultiFileUpload={handleMultiFileUpload}
        setIsFilePickerOpen={setIsFilePickerOpen}
        uploadProgress={uploadProgress}
        allPages={allPages}
        setAllPages={setAllPages}
        rotateAllPages={(dir) => {
          setAllPages(pages => pages.map(p => ({ ...p, rotation: ((p.rotation || 0) + (dir === 'left' ? -90 : 90)) % 360 })));
        }}
        rotatePage={(idx, dir) => {
          setAllPages(pages => pages.map((p, i) => i === idx ? { ...p, rotation: ((p.rotation || 0) + (dir === 'left' ? -90 : 90)) % 360 } : p));
        }}
        removePage={(idx) => setAllPages(pages => pages.filter((_, i) => i !== idx))}
        config={config}
        backgroundColor={backgroundColor}
        previewKey={0}
        setLightboxImage={() => {}}
        setIsLightboxOpen={() => {}}
      />

      <ImpositionAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        aiLoading={aiLoading}
        handleAiArrange={handleAiArrange}
        allPages={allPages}
        aiPreviewPages={aiPreviewPages}
        previewKey={0}
        config={config}
        backgroundColor={backgroundColor}
        aiResult={aiResult}
        applyAiResult={applyAiResult}
      />

      <ImpositionExportModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        config={config}
        setConfig={setConfig}
        confirmDownloadPDF={confirmDownloadPDF}
      />

      <ImpositionRenderModal
        isOpen={isRenderModalOpen}
        onClose={() => setIsRenderModalOpen(false)}
        isSubmittingRender={isSubmittingRender}
        isProbingAgent={isProbingAgent}
        selectedRenderEngine={selectedRenderEngine}
        setSelectedRenderEngine={setSelectedRenderEngine}
        goAgentInfo={goAgentInfo}
        selectedPresetId={selectedPresetId}
        setSelectedPresetId={setSelectedPresetId}
        config={config}
        shapeTabs={shapeTabs}
        currentPlan={currentPlan}
        handleStartRender={confirmDownloadPDF}
        renderProgressText={renderProgressText}
      />

      <ImpositionRenderSuccessModal
        renderSuccessModal={renderSuccessModal}
        setRenderSuccessModal={setRenderSuccessModal}
      />

      <ImpositionSortJobModal
        sortJobModalData={sortJobModalData}
        setSortJobModalData={setSortJobModalData}
        handleCopyJobId={(id) => {
          navigator.clipboard.writeText(id);
          setCopiedJobId(true);
          safeToastSuccess('Đã sao chép ID SortJob');
          setTimeout(() => setCopiedJobId(false), 2000);
        }}
        copiedJobId={copiedJobId}
      />

      <SourceImageCropColorModal
        isOpen={isCropColorModalOpen}
        onClose={() => setIsCropColorModalOpen(false)}
        onApply={(result) => {
          const updatedPage: PageItem = {
            id: `crop-${Date.now()}`,
            name: result.filename || activeTab.name,
            url: result.dataUrl,
            thumb: result.dataUrl,
            originalThumb: result.originalImage,
            w: result.w_mm || activeTab.itemW,
            h: result.h_mm || activeTab.itemH,
            rotation: 0,
            colorSettings: result.colorSettings,
            cropSettings: result.cropSettings,
            bleedBounds: result.bleedBounds || undefined,
            bleedPercent: result.bleedPercent
          };
          if (result.updatedTabs && result.updatedTabs.length > 0) {
            setShapeTabs(result.updatedTabs as ShapeTabItem[]);
          }
          const finalW = result.w_mm || activeTab.itemW;
          const finalH = result.h_mm || activeTab.itemH;
          updateActiveTabProp({ sourceImage: updatedPage, itemW: finalW, itemH: finalH });
          setConfig(c => ({ ...c, itemW: finalW, itemH: finalH }));
          setIsCropColorModalOpen(false);
          safeToastSuccess('Đã áp dụng cắt & màu cho ảnh nguồn');
        }}
        imageUrl={activeTab.sourceImage?.thumb || (allPages.length > 0 ? allPages[0]?.thumb : '')}
        imageName={activeTab.name}
        itemW={activeTab.itemW || config.itemW}
        itemH={activeTab.itemH || config.itemH}
        shape={activeTab.shape || config.shape}
        cutBleed={config.cutBleed}
        shapeTabs={shapeTabs as any}
        activeTabId={activeTabId}
      />

      <VectorMaskEditorModal
        isOpen={isVectorMaskEditorOpen}
        onClose={() => setIsVectorMaskEditorOpen(false)}
        imageUrl={activeTab.sourceImage?.thumb || (allPages.length > 0 ? allPages[0]?.thumb : null)}
        imageName={activeTab.name}
        itemW={activeTab.itemW || config.itemW}
        itemH={activeTab.shape === 'circle' ? activeTab.itemW : (activeTab.itemH || config.itemH)}
        initialKnots={activeTab.vectorMaskResult?.knots || vectorMaskResult?.knots}
        initialSvgPath={activeTab.vectorMaskResult?.pathData || vectorMaskResult?.pathData}
        onApply={(result) => {
          setVectorMaskResult(result);
          updateActiveTabProp({ vectorMaskResult: result });
          setIsVectorMaskEditorOpen(false);
          safeToastSuccess('Đã áp dụng Vector Mask thành công');
        }}
      />

      <CutDielineModal
        isOpen={isCutSvgModalOpen}
        onClose={() => setIsCutSvgModalOpen(false)}
        plan={currentPlan}
        pageW={config.pageW}
        pageH={config.pageH}
        defaultItemW={config.itemW}
        defaultItemH={config.itemH}
        defaultShape={config.shape}
        defaultCutBleed={config.cutBleed}
        defaultCornerRadius={config.cornerRadius}
        shapeTabs={shapeTabs}
        currentSheetIndex={currentSheetIndex}
        totalSheets={totalSheets}
        isMultiShape={isMultiShape}
      />

      <FilePickerModal
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelect={handleFileFromManager}
        accept={['PDF', 'IMAGE']}
        title="Chọn tệp từ Quản lý tệp"
      />
    </>
  );
};
