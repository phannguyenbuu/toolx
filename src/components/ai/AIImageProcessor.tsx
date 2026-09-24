import React, { useState } from 'react';
import {
  AITool,
  AIImageProcessorProps,
  useAIStatus,
  useImageCanvas,
  useAIOperations,
  ProcessorHeader,
  ToolSelectorSidebar,
  CanvasToolbar,
  ImageCanvasWorkspace,
  ToolOptionsPanel
} from './imageProcessor/index';

export const AIImageProcessor: React.FC<AIImageProcessorProps> = ({ initialTool = 'inpaint' }) => {
  const [activeTool, setActiveTool] = useState<AITool>(initialTool);
  const { aiStatus } = useAIStatus();
  const canvas = useImageCanvas();
  const operations = useAIOperations({
    image: canvas.image,
    setImage: canvas.setImage,
    imageFile: canvas.imageFile,
    setImageFile: canvas.setImageFile,
    imageRef: canvas.imageRef,
    imageDimensions: canvas.imageDimensions,
    setImageDimensions: canvas.setImageDimensions,
    boxes: canvas.boxes,
    setBoxes: canvas.setBoxes,
    fitToScreen: canvas.fitToScreen,
    setZoom: canvas.setZoom,
    fileInputRef: canvas.fileInputRef,
    error: canvas.error,
    setError: canvas.setError,
    success: canvas.success,
    setSuccess: canvas.setSuccess,
    showResultActions: canvas.showResultActions,
    setShowResultActions: canvas.setShowResultActions
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <ProcessorHeader aiStatus={aiStatus} />

      <div className="flex-1 flex overflow-hidden">
        <ToolSelectorSidebar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
        />

        <div className="flex-1 min-w-0 flex flex-col relative">
          <CanvasToolbar
            image={canvas.image}
            originalImage={canvas.originalImage}
            zoom={canvas.zoom}
            setZoom={canvas.setZoom}
            fitToScreen={canvas.fitToScreen}
            resetImage={canvas.resetToOriginal}
            downloadResult={operations.downloadResult}
            fullReset={operations.fullReset}
            handleFileUpload={canvas.handleFileUpload}
            fileInputRef={canvas.fileInputRef}
          />

          <ImageCanvasWorkspace
            image={canvas.image}
            zoom={canvas.zoom}
            activeTool={activeTool}
            drawMode={canvas.drawMode}
            containerRef={canvas.containerRef}
            canvasRef={canvas.canvasRef}
            fileInputRef={canvas.fileInputRef}
            handleDrop={canvas.handleDrop}
            handleMouseDown={canvas.handleMouseDown}
            handleMouseMove={canvas.handleMouseMove}
            handleMouseUp={canvas.handleMouseUp}
            error={canvas.error}
            setError={canvas.setError}
            success={canvas.success}
            setSuccess={canvas.setSuccess}
            showResultActions={canvas.showResultActions}
            setShowResultActions={canvas.setShowResultActions}
            downloadResult={operations.downloadResult}
            isProcessing={operations.isProcessing}
          />
        </div>

        <ToolOptionsPanel
          activeTool={activeTool}
          image={canvas.image}
          imageRef={canvas.imageRef}
          imageDimensions={canvas.imageDimensions}
          isProcessing={operations.isProcessing}
          aiStatus={aiStatus}
          drawMode={canvas.drawMode}
          setDrawMode={canvas.setDrawMode}
          boxes={canvas.boxes}
          selectedBoxId={canvas.selectedBoxId}
          setSelectedBoxId={canvas.setSelectedBoxId}
          removeBox={canvas.removeBox}
          clearAllBoxes={canvas.clearAllBoxes}
          processInpaint={operations.processInpaint}
          outpaintTop={operations.outpaintTop}
          setOutpaintTop={operations.setOutpaintTop}
          outpaintBottom={operations.outpaintBottom}
          setOutpaintBottom={operations.setOutpaintBottom}
          outpaintLeft={operations.outpaintLeft}
          setOutpaintLeft={operations.setOutpaintLeft}
          outpaintRight={operations.outpaintRight}
          setOutpaintRight={operations.setOutpaintRight}
          processOutpaint={operations.processOutpaint}
          processRemoveBg={operations.processRemoveBg}
          upscaleFactor={operations.upscaleFactor}
          setUpscaleFactor={operations.setUpscaleFactor}
          processUpscale={operations.processUpscale}
          colorMode={operations.colorMode}
          setColorMode={operations.setColorMode}
          colorIntensity={operations.colorIntensity}
          setColorIntensity={operations.setColorIntensity}
          processColorConvert={operations.processColorConvert}
        />
      </div>
    </div>
  );
};

export default AIImageProcessor;
