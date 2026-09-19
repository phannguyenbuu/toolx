import React from "react";
import { Stage, Layer, Image, Transformer, Rect, Group, Path, Circle, Line, Text, Arrow } from "react-konva";
import { normalizeStroke, computeGroupBounds, buildUnionOutlinePath } from "./svgPathUtils";

const OUTLINE_OFFSET_BASE = 3.5;

export const StageView = ({
  inline,
  stageSize,
  stageRef,
  stageScale,
  stagePos,
  handleWheel,
  lastPanRef,
  handlePanStart,
  handlePanMove,
  handlePanEnd,
  svgFit,
  svgBounds,
  gridCells,
  editorImage,
  imageRef,
  handleTransformEnd,
  handleTransformLive,
  transformedGroups,
  debugMarkers = [],
  trRef,
  boxWidth,
  boxLength,
  boxHeight,
  scaleHeight,
  scaleLength,
}) => {
  const renderDimLine = ({
    start,
    end,
    label,
    rotation = 0,
    fontSize = 12,
    strokeWidth = 1,
  }) => {
    const textLabel = `${label} mm`;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const textWidth = textLabel.length * (fontSize * 0.6);
    const textHeight = fontSize * 1.2;
    const textX = midX;
    const textY = midY;
    const arrowSize = strokeWidth * 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const gap = textWidth / 2 + 6;
    const midLeft = { x: midX - ux * gap, y: midY - uy * gap };
    const midRight = { x: midX + ux * gap, y: midY + uy * gap };
    const arrowInset = arrowSize * 1.2;
    const startTip = { x: start.x, y: start.y };
    const startBase = { x: start.x + ux * arrowInset, y: start.y + uy * arrowInset };
    const endTip = { x: end.x, y: end.y };
    const endBase = { x: end.x - ux * arrowInset, y: end.y - uy * arrowInset };

    return (
      <>
        <Line
          points={[startTip.x, startTip.y, midLeft.x, midLeft.y]}
          stroke="#777777"
          strokeWidth={strokeWidth}
          lineCap="round"
          listening={false}
        />
        <Line
          points={[midRight.x, midRight.y, endTip.x, endTip.y]}
          stroke="#777777"
          strokeWidth={strokeWidth}
          lineCap="round"
          listening={false}
        />
        <Arrow
          points={[startBase.x, startBase.y, startTip.x, startTip.y]}
          stroke="#777777"
          fill="#777777"
          strokeWidth={strokeWidth}
          pointerLength={arrowSize}
          pointerWidth={arrowSize}
          listening={false}
        />
        <Arrow
          points={[endBase.x, endBase.y, endTip.x, endTip.y]}
          stroke="#777777"
          fill="#777777"
          strokeWidth={strokeWidth}
          pointerLength={arrowSize}
          pointerWidth={arrowSize}
          listening={false}
        />
        <Text
          x={textX}
          y={textY}
          width={textWidth}
          height={textHeight}
          text={textLabel}
          fontSize={fontSize}
          fill="#ff0000"
          align="center"
          verticalAlign="middle"
          rotation={rotation}
          offsetX={textWidth / 2}
          offsetY={textHeight / 2}
          fontStyle="italic"
          listening={false}
        />
      </>
    );
  };
  return (
    <Stage
      width={stageSize.width}
      height={stageSize.height}
      ref={stageRef}
      scaleX={stageScale}
      scaleY={stageScale}
      x={stagePos.x}
      y={stagePos.y}
      onWheel={handleWheel}
      style={{ background: "#fff" }}
      onContextMenu={(e) => e.evt.preventDefault()}
      onMouseDown={(e) => {
        // Pan with middle or right mouse button (browser often blocks middle).
        if (e.evt.button !== 1 && e.evt.button !== 2) return;
        e.evt.preventDefault();
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) handlePanStart(pos.x, pos.y);
      }}
      onMouseMove={(e) => {
        if (!lastPanRef.current.active) return;
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;
        const dx = e.evt.movementX || pos.x - lastPanRef.current.x;
        const dy = e.evt.movementY || pos.y - lastPanRef.current.y;
        handlePanMove(pos.x, pos.y, dx, dy);
      }}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
      onTouchStart={(e) => {
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) handlePanStart(pos.x, pos.y);
      }}
      onTouchMove={(e) => {
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;
        const dx = pos.x - lastPanRef.current.x;
        const dy = pos.y - lastPanRef.current.y;
        handlePanMove(pos.x, pos.y, dx, dy);
      }}
      onTouchEnd={handlePanEnd}
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={stageSize.width}
          height={stageSize.height}
          fill="#ffffff"
          listening={false}
        />
        {/* Grid/cell background removed per request */}

        {editorImage && (
          <Image
            ref={imageRef}
            image={editorImage}
            draggable
            dragButtons={[0]}
            rotation={0}
            scaleX={1}
            scaleY={1}
            dragBoundFunc={(pos) => pos}
            onWheel={(e) => {
              // Force wheel to control the canvas only.
              e.cancelBubble = true;
              handleWheel(e);
            }}
            onDragMove={handleTransformLive}
            onDragEnd={handleTransformEnd}
            onTransform={handleTransformLive}
            onTransformEnd={handleTransformEnd}
          />
        )}

        {transformedGroups.length > 0 && (
          <Group
            x={svgFit.offsetX - svgBounds.minX * svgFit.scale}
            y={svgFit.offsetY - svgBounds.minY * svgFit.scale}
            scaleX={svgFit.scale}
            scaleY={svgFit.scale}
            listening={false}
          >
            {transformedGroups.map((group, groupIdx) => (
              <Group key={`${group.id || "group"}-${groupIdx}`} listening={false}>
                {group.paths.map((p, idx) => (
                  <React.Fragment key={`${group.id || "path"}-${idx}`}>
                    <Path
                      data={p.d}
                      stroke={normalizeStroke(p.stroke) || undefined}
                      strokeWidth={0.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeMiterLimit={1}
                      opacity={p.opacity}
                      fill="transparent"
                      fillEnabled={false}
                      listening={false}
                    />
                  </React.Fragment>
                ))}
              </Group>
            ))}
            {(() => {
              const outlineOnly = new Set([
                "A1",
                "A2",
                "A3",
                "B1",
                "B3",
                "C1",
                "C3",
                "D1",
                "D2",
                "E1",
                "E2",
                "F1",
                "F2",
                "F3",
              ]);
              const outlineGroups = transformedGroups.filter((g) => outlineOnly.has(g.id || ""));
              const outlineOffset = OUTLINE_OFFSET_BASE * (Number.isFinite(scaleLength) ? scaleLength : 1);
              const unionPath = buildUnionOutlinePath(outlineGroups, outlineOffset);
              if (!unionPath) return null;
              return (
                <Path
                  data={unionPath}
                  stroke="#ff0000"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeMiterLimit={1}
                  fill="none"
                  fillEnabled={false}
                  listening={false}
                />
              );
            })()}
            {(() => {
              const boundsById = new Map();
              transformedGroups.forEach((g) => {
                if (!g.id) return;
                boundsById.set(g.id, computeGroupBounds(g.paths));
              });
              const c2 = boundsById.get("C2");
              const o = boundsById.get("O");
              if (!c2 && !o) return null;
              const elems = [];
              if (c2 && Number.isFinite(boxHeight)) {
                const cx = (c2.minX + c2.maxX) / 2;
                const label = `${Math.round(boxHeight * 100)} mm`;
                elems.push(
                  <React.Fragment key="dim-c2">
                    {renderDimLine({
                      start: { x: cx, y: c2.minY },
                      end: { x: cx, y: c2.maxY },
                      label,
                      rotation: -90,
                      fontSize: 12,
                      strokeWidth: 1,
                    })}
                  </React.Fragment>
                );
              }
              if (o && Number.isFinite(boxLength)) {
                const cx = (o.minX + o.maxX) / 2;
                const label = `${Math.round(boxLength * 100)} mm`;
                elems.push(
                  <React.Fragment key="dim-o-length">
                    {renderDimLine({
                      start: { x: cx, y: o.minY },
                      end: { x: cx, y: o.maxY },
                      label,
                      rotation: -90,
                      fontSize: 12,
                      strokeWidth: 1,
                    })}
                  </React.Fragment>
                );
              }
              if (o && Number.isFinite(boxWidth)) {
                const cy = o.minY + (o.maxY - o.minY) * (2 / 3);
                const label = `${Math.round(boxWidth * 100)} mm`;
                elems.push(
                  <React.Fragment key="dim-o-width">
                    {renderDimLine({
                      start: { x: o.minX, y: cy },
                      end: { x: o.maxX, y: cy },
                      label,
                      rotation: 0,
                      fontSize: 12,
                      strokeWidth: 1,
                    })}
                  </React.Fragment>
                );
              }
              return elems;
            })()}
          </Group>
        )}

        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => newBox}
          flipEnabled={true}
          rotateEnabled={true}
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
        />
      </Layer>
    </Stage>
  );
};
