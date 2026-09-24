import React from 'react';
import {
  VectorMaskEditorModalProps,
  useVectorMaskState,
  useVectorMaskCanvas,
  VectorMaskHeader,
  VectorMaskCanvasArea,
  VectorMaskSidebar,
  VectorMaskFooter
} from './vectorMask/index';

export type { VectorKnot, VectorMaskResult, VectorMaskEditorModalProps } from './vectorMask/index';

export const VectorMaskEditorModal: React.FC<VectorMaskEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'Ảnh nguồn',
  itemW,
  itemH,
  initialKnots,
  onApply
}) => {
  const state = useVectorMaskState({
    isOpen,
    onClose,
    imageUrl,
    itemW,
    itemH,
    initialKnots,
    onApply
  });

  const canvas = useVectorMaskCanvas({
    isOpen,
    maskW: state.maskW,
    maskH: state.maskH,
    knots: state.knots,
    setKnots: state.setKnots,
    selectedKnotId: state.selectedKnotId,
    setSelectedKnotId: state.setSelectedKnotId,
    candidatePoint: state.candidatePoint,
    setCandidatePoint: state.setCandidatePoint,
    activeTool: state.activeTool,
    pushHistory: state.pushHistory,
    undo: state.undo,
    redo: state.redo,
    handleDeleteSelectedKnot: state.handleDeleteSelectedKnot
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 select-none">
      {/* Hidden File Input for SVG Import */}
      <input
        type="file"
        ref={state.fileInputRef}
        accept=".svg"
        onChange={state.handleSvgImport}
        className="hidden"
      />

      {/* Hidden File Input for Reference Image */}
      <input
        type="file"
        ref={state.imgFileInputRef}
        accept="image/*"
        onChange={state.handleImageUpload}
        className="hidden"
      />

      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <VectorMaskHeader
          maskW={state.maskW}
          maskH={state.maskH}
          knotCount={state.knots.length}
          currentImageUrl={state.currentImageUrl}
          imageName={imageName}
          historyIndex={state.historyIndex}
          historyLength={state.history.length}
          undo={state.undo}
          redo={state.redo}
          setScale={canvas.setScale}
          handleFitView={canvas.handleFitView}
          onClose={onClose}
          imgFileInputRef={state.imgFileInputRef}
        />

        <div className="flex-1 flex min-h-0 relative">
          <VectorMaskCanvasArea
            viewportRef={canvas.viewportRef}
            activeTool={state.activeTool}
            candidatePoint={state.candidatePoint}
            showGrid={state.showGrid}
            scale={canvas.scale}
            pan={canvas.pan}
            maskW={state.maskW}
            maskH={state.maskH}
            currentImageUrl={state.currentImageUrl}
            showBgImage={state.showBgImage}
            bgImageOpacity={state.bgImageOpacity}
            previewMode={state.previewMode}
            pathData={state.pathData}
            dieLineColor={state.dieLineColor}
            dieLineWidth={state.dieLineWidth}
            knots={state.knots}
            selectedKnotId={state.selectedKnotId}
            hoveredKnotId={state.hoveredKnotId}
            setHoveredKnotId={state.setHoveredKnotId}
            handleWheel={canvas.handleWheel}
            handleMouseDown={canvas.handleMouseDown}
            handleMouseMove={canvas.handleMouseMove}
            handleMouseUp={canvas.handleMouseUp}
            handleKnotMouseDown={canvas.handleKnotMouseDown}
          />

          <VectorMaskSidebar
            activeTab={state.activeTab}
            setActiveTab={state.setActiveTab}
            activeTool={state.activeTool}
            setActiveTool={state.setActiveTool}
            knots={state.knots}
            setKnots={state.setKnots}
            selectedKnotId={state.selectedKnotId}
            setSelectedKnotId={state.setSelectedKnotId}
            maskW={state.maskW}
            maskH={state.maskH}
            pushHistory={state.pushHistory}
            handleFlip={state.handleFlip}
            handleRotate={state.handleRotate}
            handleCenterAlign={state.handleCenterAlign}
            handleOffsetMargin={state.handleOffsetMargin}
            handleDeleteSelectedKnot={state.handleDeleteSelectedKnot}
            handleExportSvg={state.handleExportSvg}
            currentImageUrl={state.currentImageUrl}
            showBgImage={state.showBgImage}
            setShowBgImage={state.setShowBgImage}
            bgImageOpacity={state.bgImageOpacity}
            setBgImageOpacity={state.setBgImageOpacity}
            dieLineColor={state.dieLineColor}
            setDieLineColor={state.setDieLineColor}
            previewMode={state.previewMode}
            setPreviewMode={state.setPreviewMode}
            showGrid={state.showGrid}
            setShowGrid={state.setShowGrid}
            fileInputRef={state.fileInputRef}
            imgFileInputRef={state.imgFileInputRef}
          />
        </div>

        <VectorMaskFooter
          knotCount={state.knots.length}
          onClose={onClose}
          handleApply={state.handleApply}
        />
      </div>
    </div>
  );
};

export default VectorMaskEditorModal;
