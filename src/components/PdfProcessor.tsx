import React, { useState, useEffect, useCallback } from 'react';
import { PdfProcessorProps } from './pdfProcessor/types';
import {
  loadPdfProcessorScripts,
  exportPdfWithModifications,
  usePdfDocument,
  useFabricEditor,
  PdfTopBar,
  PdfSidebar,
  PdfDashboardGrid,
  PdfStudioEditor,
  PdfModals
} from './pdfProcessor/index';

export const PdfProcessor: React.FC<PdfProcessorProps> = () => {
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Load external scripts once
  useEffect(() => {
    if (scriptsLoaded) return;
    loadPdfProcessorScripts()
      .then(() => setScriptsLoaded(true))
      .catch(console.error);
  }, [scriptsLoaded]);

  // Document state and page operations
  const doc = usePdfDocument({ scriptsLoaded });

  // Fabric studio editor and layer operations
  const editor = useFabricEditor({
    scriptsLoaded,
    pdfData: doc.pdfData,
    pagesData: doc.pagesData,
    setPagesData: doc.setPagesData,
    setIsLoading: doc.setIsLoading,
    setLoadingText: doc.setLoadingText
  });

  // Save PDF (single page or all pages)
  const handleSavePdf = useCallback(
    async (mode: 'single' | 'all') => {
      if (!doc.pdfData) {
        alert('Vui lòng tải file PDF lên trước.');
        return;
      }

      editor.saveCurrentState();
      doc.setIsLoading(true);
      doc.setLoadingText('Đang chuẩn bị dữ liệu xuất file...');
      doc.setProgress(0);

      try {
        await exportPdfWithModifications({
          pdfData: doc.pdfData,
          pagesData: doc.pagesData,
          mode,
          curPageIndex: editor.curPageIndex,
          onProgress: (pct, text) => {
            doc.setProgress(pct);
            doc.setLoadingText(text);
          }
        });
      } catch (err: any) {
        alert('Lỗi khi xuất file PDF: ' + err.message);
        console.error(err);
      } finally {
        doc.setIsLoading(false);
      }
    },
    [doc, editor]
  );

  // Reset all state and start over
  const handleResetAll = useCallback(() => {
    if (
      doc.pagesData.length > 0 &&
      !window.confirm('Bạn có chắc muốn làm mới? Tất cả dữ liệu hiện tại sẽ bị xóa.')
    ) {
      return;
    }

    doc.resetDocument();
    editor.resetEditor();
  }, [doc, editor]);

  return (
    <div className="h-full bg-gray-100 flex flex-col overflow-hidden">
      {/* Loading Overlay & Context Menu */}
      <PdfModals
        isLoading={doc.isLoading}
        loadingText={doc.loadingText}
        progress={doc.progress}
        contextMenu={editor.contextMenu}
        setContextMenu={editor.setContextMenu}
        onDeleteActive={editor.deleteActive}
      />

      {/* Top Toolbar */}
      <PdfTopBar
        fileInputRef={doc.fileInputRef}
        onFileChange={doc.handleFile}
        onReset={handleResetAll}
        onSavePdf={handleSavePdf}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <PdfSidebar
          activeTab={editor.activeTab}
          setActiveTab={editor.setActiveTab}
          stats={doc.stats}
          layers={editor.layers}
          activeObject={editor.activeObject}
          fabricCanvasRef={editor.fabricCanvasRef}
          onLayerAction={editor.layerAction}
          onDeleteActive={editor.deleteActive}
          onDeleteCheckedLayers={editor.deleteCheckedLayers}
        />

        {/* Center Canvas / Dashboard */}
        <div className="flex-1 relative flex flex-col bg-slate-100 overflow-hidden">
          {editor.viewMode === 'dashboard' ? (
            <PdfDashboardGrid
              pagesData={doc.pagesData}
              filteredPages={doc.filteredPages}
              filterType={doc.filterType}
              setFilterType={doc.setFilterType}
              selectedIds={doc.selectedIds}
              onToggleSelection={doc.toggleSelection}
              onDeleteSelected={doc.deleteSelected}
              onOpenStudio={editor.openStudio}
              onRotateThumb={doc.rotatePageThumb}
            />
          ) : (
            <PdfStudioEditor
              curPageIndex={editor.curPageIndex}
              pagesData={doc.pagesData}
              currentTool={editor.currentTool}
              onSetTool={editor.setTool}
              onExitStudio={editor.exitStudio}
              activeObject={editor.activeObject}
              objColor={editor.objColor}
              textContent={editor.textContent}
              selectedFont={editor.selectedFont}
              fontSize={editor.fontSize}
              isBold={editor.isBold}
              isItalic={editor.isItalic}
              isUnderline={editor.isUnderline}
              onUpdateActiveObj={editor.updateActiveObj}
              onToggleStyle={editor.toggleStyle}
              onRotateCurrentPage={editor.rotateCurrentPage}
              onAutoFitZoom={editor.autoFitZoom}
              onApplyZoom={editor.applyZoom}
              zoom={editor.zoom}
              viewportRef={editor.viewportRef}
              canvasRef={editor.canvasRef}
              onCloseContextMenu={() =>
                editor.setContextMenu((prev) => ({ ...prev, visible: false }))
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfProcessor;
