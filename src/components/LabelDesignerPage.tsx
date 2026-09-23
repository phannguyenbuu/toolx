import React, { useState, useMemo } from 'react';
import {
  LabelDesignerPageProps,
  PageConfig,
  SheetConfig,
  useLabelDesignerHistory,
  useLabelDesignerWorkflows,
  useLabelDesignerData,
  useLabelDesignerMedia,
  useLabelDesignerCanvas,
  useLabelDesignerExport,
  useQrBarcodeImages,
  LabelDesignerNavbar,
  LabelDesignerContextToolbar,
  LabelDesignerLeftToolbar,
  LabelDesignerCanvas,
  LabelDesignerRightSidebar,
  SheetConfigModal,
  PageConfigModal,
  DataTableModal,
  MediaManagerModal,
  WorkflowModal,
  NumberingModal,
  SavedNumberingSet,
  ElementData
} from './labelDesigner';

export const LabelDesignerPage: React.FC<LabelDesignerPageProps> = ({ onClose }) => {
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    format: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297
  });

  const [sheetConfig, setSheetConfig] = useState<SheetConfig>({
    format: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    shape: 'rect',
    layoutMode: 'grid',
    marginTop: 5,
    marginLeft: 5,
    gapH: 3,
    gapV: 3,
    useCropMark: false,
    cropLen: 5,
    cropDist: 3,
    cropThick: 0.25,
    cropColor: '#000000',
    useSafeZone: false,
    safeZone: 3,
    pageNumber: 'none'
  });

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isPageConfigModalOpen, setIsPageConfigModalOpen] = useState(false);
  const [isSheetConfigModalOpen, setIsSheetConfigModalOpen] = useState(false);
  const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);
  const [savedNumberingSets, setSavedNumberingSets] = useState<SavedNumberingSet[]>([]);

  // 1. Data management (CSV, Excel, Google Sheets, variables)
  const data = useLabelDesignerData();

  // 2. Media management (Uploaded images, drag-and-drop, Supabase)
  const media = useLabelDesignerMedia();

  // 3. Canvas history (Undo/Redo)
  const [elements, setElements] = useState<ElementData[]>([]);
  const history = useLabelDesignerHistory(elements, setElements);

  // 4. Canvas interactions & element operations
  const canvas = useLabelDesignerCanvas(
    elements,
    setElements,
    pageConfig,
    setPageConfig,
    history.saveToHistory,
    media.uploadedImages,
    data.dataRows,
    data.currentRowIndex,
    history.handleUndo,
    history.handleRedo
  );

  // Sync canvas elements with history
  const selectedElement = useMemo(
    () =>
      canvas.selectedIds.length === 1
        ? canvas.elements.find(el => el.id === canvas.selectedIds[0]) || null
        : null,
    [canvas.elements, canvas.selectedIds]
  );

  // 5. Workflows (Supabase CRUD)
  const workflows = useLabelDesignerWorkflows(
    canvas.elements,
    canvas.setElements,
    pageConfig,
    setPageConfig
  );

  // 6. QR & Barcode images caching
  const { qrImages } = useQrBarcodeImages(
    canvas.elements,
    data.currentRow,
    data.replaceVariables,
    data.currentRowIndex
  );

  // 7. Export & storage
  const exporter = useLabelDesignerExport(
    canvas.stageRef,
    canvas.elements,
    canvas.setElements,
    canvas.setSelectedIds,
    pageConfig,
    setPageConfig,
    sheetConfig,
    setSheetConfig,
    data.dataHeaders,
    data.setDataHeaders,
    data.dataRows,
    data.setDataRows,
    data.setCurrentRowIndex,
    media.uploadedImages,
    media.setUploadedImages,
    history.saveToHistory
  );

  return (
    <div className="flex flex-col h-full" style={{ background: '#f0f0f0' }}>
      {/* ROW 1: Brand + File actions + Export */}
      <LabelDesignerNavbar
        historyStep={history.historyStep}
        historyLength={history.history.length}
        handleUndo={history.handleUndo}
        handleRedo={history.handleRedo}
        handleReset={exporter.handleReset}
        setIsWorkflowModalOpen={workflows.setIsWorkflowModalOpen}
        setIsPageConfigModalOpen={setIsPageConfigModalOpen}
        setIsSheetConfigModalOpen={setIsSheetConfigModalOpen}
        pageConfig={pageConfig}
        dataRowsCount={data.dataRows.length}
        currentRowIndex={data.currentRowIndex}
        setCurrentRowIndex={data.setCurrentRowIndex}
        isRightPanelOpen={isRightPanelOpen}
        setIsRightPanelOpen={setIsRightPanelOpen}
        handleExportPDF={exporter.handleExportPDF}
        handleSaveToFileManager={exporter.handleSaveToFileManager}
        isLoading={exporter.isLoading}
        onClose={onClose}
      />

      {/* ROW 2: Context-sensitive tools */}
      <LabelDesignerContextToolbar
        selectionMode={canvas.selectionMode}
        setSelectionMode={canvas.setSelectionMode}
        zoom={canvas.zoom}
        setZoom={canvas.setZoom}
        handleZoomFit={canvas.handleZoomFit}
        showGrid={canvas.showGrid}
        setShowGrid={canvas.setShowGrid}
        snapToGrid={canvas.snapToGrid}
        setSnapToGrid={canvas.setSnapToGrid}
        gridSize={canvas.gridSize}
        setGridSize={canvas.setGridSize}
        selectedIds={canvas.selectedIds}
        alignElements={canvas.alignElements}
        distributeElements={canvas.distributeElements}
        duplicateSelected={canvas.duplicateSelected}
        deleteSelected={canvas.deleteSelected}
      />

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* LEFT TOOLBAR */}
        <LabelDesignerLeftToolbar
          addElement={canvas.addElement}
          setIsDataModalOpen={data.setIsDataModalOpen}
          setIsMediaModalOpen={media.setIsMediaModalOpen}
          setIsNumberingModalOpen={setIsNumberingModalOpen}
        />

        {/* CANVAS AREA */}
        <LabelDesignerCanvas
          containerRef={canvas.containerRef}
          stageRef={canvas.stageRef}
          transformerRef={canvas.transformerRef}
          containerSize={canvas.containerSize}
          zoom={canvas.zoom}
          stagePos={canvas.stagePos}
          handleWheel={canvas.handleWheel}
          handleStageClick={canvas.handleStageClick}
          handleMouseDown={canvas.handleMouseDown}
          handleMouseMove={canvas.handleMouseMove}
          handleMouseUp={canvas.handleMouseUp}
          pageConfig={pageConfig}
          backgroundImage={canvas.backgroundImage}
          getBackgroundImageProps={canvas.getBackgroundImageProps}
          showGrid={canvas.showGrid}
          gridSize={canvas.gridSize}
          elements={canvas.elements}
          selectedIds={canvas.selectedIds}
          replaceVariables={data.replaceVariables}
          uploadedImages={media.uploadedImages}
          loadedImages={canvas.loadedImages}
          qrImages={qrImages}
          onSelectElement={(id, shiftKey) => {
            if (shiftKey) {
              canvas.setSelectedIds(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              );
            } else {
              canvas.setSelectedIds([id]);
            }
          }}
          handleDragEnd={canvas.handleDragEnd}
          handleTransformEnd={canvas.handleTransformEnd}
          selectionRect={canvas.selectionRect}
        />

        {/* RIGHT SIDEBAR */}
        <LabelDesignerRightSidebar
          isOpen={isRightPanelOpen}
          selectedElement={selectedElement}
          selectedIds={canvas.selectedIds}
          setSelectedIds={canvas.setSelectedIds}
          elements={canvas.elements}
          setElements={canvas.setElements}
          availableFonts={canvas.availableFonts}
          dataHeaders={data.dataHeaders}
          updateElement={canvas.updateElement}
          deleteSelected={canvas.deleteSelected}
          moveZIndex={canvas.moveZIndex}
          saveToHistory={history.saveToHistory}
        />
      </div>

      {/* MODALS */}
      <MediaManagerModal
        isOpen={media.isMediaModalOpen}
        onClose={() => media.setIsMediaModalOpen(false)}
        uploadedImages={media.uploadedImages}
        filteredImages={media.filteredImages}
        mediaSearch={media.mediaSearch}
        setMediaSearch={media.setMediaSearch}
        selectedMediaIds={media.selectedMediaIds}
        setSelectedMediaIds={media.setSelectedMediaIds}
        isDraggingMedia={media.isDraggingMedia}
        setIsDraggingMedia={media.setIsDraggingMedia}
        draggedImageId={media.draggedImageId}
        dragOverImageId={media.dragOverImageId}
        previewImageId={media.previewImageId}
        setPreviewImageId={media.setPreviewImageId}
        editingMediaId={media.editingMediaId}
        setEditingMediaId={media.setEditingMediaId}
        editingMediaName={media.editingMediaName}
        setEditingMediaName={media.setEditingMediaName}
        imageInputRef={media.imageInputRef}
        deleteMedia={media.deleteMedia}
        deleteSelectedMedia={media.deleteSelectedMedia}
        moveMediaUp={media.moveMediaUp}
        moveMediaDown={media.moveMediaDown}
        renameMedia={media.renameMedia}
        handleImageDragStart={media.handleImageDragStart}
        handleImageDragOver={media.handleImageDragOver}
        handleImageDrop={media.handleImageDrop}
        handleImageDragEnd={media.handleImageDragEnd}
        handleMediaDrop={media.handleMediaDrop}
        handleImageUpload={media.handleImageUpload}
      />

      <WorkflowModal
        isOpen={workflows.isWorkflowModalOpen}
        onClose={() => workflows.setIsWorkflowModalOpen(false)}
        workflowName={workflows.workflowName}
        setWorkflowName={workflows.setWorkflowName}
        currentWorkflowId={workflows.currentWorkflowId}
        workflows={workflows.workflows}
        saveWorkflow={workflows.saveWorkflow}
        loadWorkflow={workflows.loadWorkflow}
        deleteWorkflow={workflows.deleteWorkflow}
      />

      <DataTableModal
        isOpen={data.isDataModalOpen}
        onClose={() => data.setIsDataModalOpen(false)}
        dataHeaders={data.dataHeaders}
        dataRows={data.dataRows}
        currentRowIndex={data.currentRowIndex}
        googleSheetUrl={data.googleSheetUrl}
        setGoogleSheetUrl={data.setGoogleSheetUrl}
        isLoadingSheet={data.isLoadingSheet}
        handleDataFileUpload={data.handleDataFileUpload}
        handleGoogleSheetImport={data.handleGoogleSheetImport}
        handleExportCSV={data.handleExportCSV}
        updateDataCell={data.updateDataCell}
        addDataRow={data.addDataRow}
        deleteDataRow={data.deleteDataRow}
        addDataColumn={data.addDataColumn}
      />

      <NumberingModal
        isOpen={isNumberingModalOpen}
        onClose={() => setIsNumberingModalOpen(false)}
        savedNumberingSets={savedNumberingSets}
        setSavedNumberingSets={setSavedNumberingSets}
        dataHeaders={data.dataHeaders}
        setDataHeaders={data.setDataHeaders}
        dataRows={data.dataRows}
        setDataRows={data.setDataRows}
      />

      {isSheetConfigModalOpen && (
        <SheetConfigModal
          sheetConfig={sheetConfig}
          setSheetConfig={setSheetConfig}
          pageConfig={pageConfig}
          onClose={() => setIsSheetConfigModalOpen(false)}
        />
      )}

      <PageConfigModal
        isOpen={isPageConfigModalOpen}
        onClose={() => setIsPageConfigModalOpen(false)}
        pageConfig={pageConfig}
        setPageConfig={setPageConfig}
        backgroundInputRef={canvas.backgroundInputRef}
        handleBackgroundUpload={canvas.handleBackgroundUpload}
      />
    </div>
  );
};

export default LabelDesignerPage;
