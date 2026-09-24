import React from 'react';
import { AITool, BoundingBox, ColorMode, AIStatus } from '../types';
import { InpaintOptions } from './toolPanels/InpaintOptions';
import { OutpaintOptions } from './toolPanels/OutpaintOptions';
import { RemoveBgOptions } from './toolPanels/RemoveBgOptions';
import { UpscaleOptions } from './toolPanels/UpscaleOptions';
import { ColorOptions } from './toolPanels/ColorOptions';

interface ToolOptionsPanelProps {
  activeTool: AITool;
  image: string | null;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  imageDimensions: { width: number; height: number } | null;
  isProcessing: boolean;
  aiStatus: AIStatus;
  // Inpaint
  drawMode: 'select' | 'draw';
  setDrawMode: (mode: 'select' | 'draw') => void;
  boxes: BoundingBox[];
  selectedBoxId: string | null;
  setSelectedBoxId: (id: string | null) => void;
  removeBox: (id: string) => void;
  clearAllBoxes: () => void;
  processInpaint: () => void;
  // Outpaint
  outpaintTop: number;
  setOutpaintTop: (val: number) => void;
  outpaintBottom: number;
  setOutpaintBottom: (val: number) => void;
  outpaintLeft: number;
  setOutpaintLeft: (val: number) => void;
  outpaintRight: number;
  setOutpaintRight: (val: number) => void;
  processOutpaint: () => void;
  // RemoveBg
  processRemoveBg: () => void;
  // Upscale
  upscaleFactor: 2 | 4;
  setUpscaleFactor: (factor: 2 | 4) => void;
  processUpscale: () => void;
  // Color
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  colorIntensity: number;
  setColorIntensity: (val: number) => void;
  processColorConvert: () => void;
}

export const ToolOptionsPanel: React.FC<ToolOptionsPanelProps> = ({
  activeTool,
  image,
  imageRef,
  imageDimensions,
  isProcessing,
  aiStatus,
  drawMode,
  setDrawMode,
  boxes,
  selectedBoxId,
  setSelectedBoxId,
  removeBox,
  clearAllBoxes,
  processInpaint,
  outpaintTop,
  setOutpaintTop,
  outpaintBottom,
  setOutpaintBottom,
  outpaintLeft,
  setOutpaintLeft,
  outpaintRight,
  setOutpaintRight,
  processOutpaint,
  processRemoveBg,
  upscaleFactor,
  setUpscaleFactor,
  processUpscale,
  colorMode,
  setColorMode,
  colorIntensity,
  setColorIntensity,
  processColorConvert
}) => {
  const renderToolContent = () => {
    switch (activeTool) {
      case 'inpaint':
        return (
          <InpaintOptions
            drawMode={drawMode}
            setDrawMode={setDrawMode}
            boxes={boxes}
            selectedBoxId={selectedBoxId}
            setSelectedBoxId={setSelectedBoxId}
            removeBox={removeBox}
            clearAllBoxes={clearAllBoxes}
            processInpaint={processInpaint}
            isProcessing={isProcessing}
            image={image}
            aiStatus={aiStatus}
          />
        );
      case 'outpaint':
        return (
          <OutpaintOptions
            imageDimensions={imageDimensions}
            outpaintTop={outpaintTop}
            setOutpaintTop={setOutpaintTop}
            outpaintBottom={outpaintBottom}
            setOutpaintBottom={setOutpaintBottom}
            outpaintLeft={outpaintLeft}
            setOutpaintLeft={setOutpaintLeft}
            outpaintRight={outpaintRight}
            setOutpaintRight={setOutpaintRight}
            processOutpaint={processOutpaint}
            isProcessing={isProcessing}
            image={image}
            aiStatus={aiStatus}
          />
        );
      case 'remove-bg':
        return (
          <RemoveBgOptions
            imageDimensions={imageDimensions}
            processRemoveBg={processRemoveBg}
            isProcessing={isProcessing}
            image={image}
          />
        );
      case 'upscale':
        return (
          <UpscaleOptions
            imageDimensions={imageDimensions}
            upscaleFactor={upscaleFactor}
            setUpscaleFactor={setUpscaleFactor}
            processUpscale={processUpscale}
            isProcessing={isProcessing}
            image={image}
          />
        );
      case 'color':
        return (
          <ColorOptions
            colorMode={colorMode}
            setColorMode={setColorMode}
            colorIntensity={colorIntensity}
            setColorIntensity={setColorIntensity}
            image={image}
            imageRef={imageRef}
            processColorConvert={processColorConvert}
            isProcessing={isProcessing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">Tùy chọn công cụ</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{renderToolContent()}</div>
    </div>
  );
};
