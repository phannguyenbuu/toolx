import React from 'react';
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import { ElementData, PageConfig, UploadedImage, mmToPx } from '../types';
import { KonvaElementRenderer } from '../renderers/KonvaElementRenderer';

const MIN_ELEMENT_SIZE = 5;

export interface LabelDesignerCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
  transformerRef: React.RefObject<Konva.Transformer | null>;
  containerSize: { width: number; height: number };
  zoom: number;
  stagePos: { x: number; y: number };
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  handleStageClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseUp: () => void;
  pageConfig: PageConfig;
  backgroundImage: HTMLImageElement | null;
  getBackgroundImageProps: () => { x: number; y: number; width: number; height: number } | null;
  showGrid: boolean;
  gridSize: number;
  elements: ElementData[];
  selectedIds: string[];
  replaceVariables: (text: string) => string;
  uploadedImages: UploadedImage[];
  loadedImages: Map<string, HTMLImageElement>;
  qrImages: Map<string, HTMLImageElement>;
  onSelectElement: (id: string, shiftKey: boolean) => void;
  handleDragEnd: (e: Konva.KonvaEventObject<DragEvent>, id: string) => void;
  handleTransformEnd: (e: Konva.KonvaEventObject<Event>, id: string) => void;
  selectionRect: { x: number; y: number; width: number; height: number } | null;
}

export const LabelDesignerCanvas: React.FC<LabelDesignerCanvasProps> = ({
  containerRef,
  stageRef,
  transformerRef,
  containerSize,
  zoom,
  stagePos,
  handleWheel,
  handleStageClick,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  pageConfig,
  backgroundImage,
  getBackgroundImageProps,
  showGrid,
  gridSize,
  elements,
  selectedIds,
  replaceVariables,
  uploadedImages,
  loadedImages,
  qrImages,
  onSelectElement,
  handleDragEnd,
  handleTransformEnd,
  selectionRect
}) => {
  const bgProps = getBackgroundImageProps();

  return (
    <div
      ref={containerRef as any}
      className="flex-1 overflow-hidden relative flex items-center justify-center"
      style={{
        background: '#e8e8e8',
        backgroundImage: 'radial-gradient(circle, #c8c8c8 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      {/* @ts-ignore - react-konva types issue with children prop */}
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePos.x}
        y={stagePos.y}
        draggable={false}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: 'default' }}
      >
        <Layer>
          {/* Rulers */}
          <Group listening={false}>
            {/* Top Ruler */}
            <Rect
              x={-30}
              y={-30}
              width={mmToPx(pageConfig.width) + 30}
              height={30}
              fill="#f8f9fa"
            />
            {Array.from({ length: Math.ceil(pageConfig.width / 10) + 1 }).map((_, i) => (
              <React.Fragment key={`ruler-h-${i}`}>
                <Rect
                  x={mmToPx(i * 10)}
                  y={-30}
                  width={1}
                  height={i % 5 === 0 ? 15 : 10}
                  fill="#666"
                />
                {i % 5 === 0 && (
                  <Text
                    x={mmToPx(i * 10) - 10}
                    y={-28}
                    text={`${i * 10}`}
                    fontSize={9}
                    fill="#333"
                  />
                )}
              </React.Fragment>
            ))}
            {/* Left Ruler */}
            <Rect
              x={-30}
              y={-30}
              width={30}
              height={mmToPx(pageConfig.height) + 30}
              fill="#f8f9fa"
            />
            {Array.from({ length: Math.ceil(pageConfig.height / 10) + 1 }).map((_, i) => (
              <React.Fragment key={`ruler-v-${i}`}>
                <Rect
                  x={-30}
                  y={mmToPx(i * 10)}
                  width={i % 5 === 0 ? 15 : 10}
                  height={1}
                  fill="#666"
                />
                {i % 5 === 0 && (
                  <Text
                    x={-28}
                    y={mmToPx(i * 10) - 5}
                    text={`${i * 10}`}
                    fontSize={9}
                    fill="#333"
                    rotation={0}
                  />
                )}
              </React.Fragment>
            ))}
          </Group>

          {/* Page Background */}
          <Group listening={false}>
            <Rect
              x={0}
              y={0}
              width={mmToPx(pageConfig.width)}
              height={mmToPx(pageConfig.height)}
              fill="white"
              shadowColor="black"
              shadowBlur={10}
              shadowOpacity={0.2}
              shadowOffsetX={5}
              shadowOffsetY={5}
              draggable={false}
              perfectDrawEnabled={false}
            />
            {backgroundImage && bgProps && (
              <Group
                clipFunc={(ctx: any) => {
                  ctx.rect(0, 0, mmToPx(pageConfig.width), mmToPx(pageConfig.height));
                }}
              >
                <KonvaImage
                  image={backgroundImage}
                  x={bgProps.x}
                  y={bgProps.y}
                  width={bgProps.width}
                  height={bgProps.height}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              </Group>
            )}
          </Group>

          {/* Grid Lines */}
          {showGrid && (
            <Group listening={false}>
              {Array.from({ length: Math.ceil(pageConfig.width / gridSize) + 1 }).map((_, i) => (
                <Rect
                  key={`v-${i}`}
                  x={mmToPx(i * gridSize)}
                  y={0}
                  width={0.5}
                  height={mmToPx(pageConfig.height)}
                  fill={i % 5 === 0 ? '#94a3b8' : '#cbd5e1'}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              ))}
              {Array.from({ length: Math.ceil(pageConfig.height / gridSize) + 1 }).map((_, i) => (
                <Rect
                  key={`h-${i}`}
                  x={0}
                  y={mmToPx(i * gridSize)}
                  width={mmToPx(pageConfig.width)}
                  height={0.5}
                  fill={i % 5 === 0 ? '#94a3b8' : '#cbd5e1'}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              ))}
            </Group>
          )}

          {/* Elements */}
          {elements.map(el => (
            <KonvaElementRenderer
              key={el.id}
              element={el}
              isSelected={selectedIds.includes(el.id)}
              replaceVariables={replaceVariables}
              uploadedImages={uploadedImages}
              loadedImages={loadedImages}
              qrImages={qrImages}
              onSelect={onSelectElement}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
            />
          ))}

          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            anchorSize={8}
            anchorStroke="#7c3aed"
            anchorFill="#fff"
            anchorCornerRadius={2}
            borderStroke="#7c3aed"
            borderStrokeWidth={1.5}
            rotateEnabled={true}
            rotateAnchorOffset={25}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center'
            ]}
            keepRatio={false}
            boundBoxFunc={(oldBox: Konva.Box, newBox: Konva.Box) => {
              if (newBox.width < MIN_ELEMENT_SIZE || newBox.height < MIN_ELEMENT_SIZE) return oldBox;
              return newBox;
            }}
            ignoreStroke={true}
          />

          {/* Selection Rectangle */}
          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(99, 102, 241, 0.1)"
              stroke="#6366f1"
              strokeWidth={1}
              dash={[4, 4]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};
