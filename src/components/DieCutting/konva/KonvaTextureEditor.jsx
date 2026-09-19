// KonvaTextureEditor.jsx - SVG vector overlay + smooth pan/zoom
import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useUploadTextureStore } from "../stores/uploadTextureStore";
import { usePointer, useSelection } from "../stores/selectionStore";
import { getRuleForChild } from "../Experience/models/modelRules";
import { fetchSvgData } from "./svgLoader";
import { applyTemplateTransforms } from "./templateTransforms";
import { StageView } from "./StageView";
import { parsePath, getPathPoints } from "./svgPathUtils";
import { DEFAULT_TEXTURE_SIZE, TEXTURE_SCALE } from "../constants/texture";
import { apiUrl } from "../constants/api";
import "./KonvaTextureEditor.css";

const KonvaTextureEditor = ({ svgPath = "", inline = false }) => {
  const {
    editorImage,
    showEditor,
    updateTextureFromCanvas,
    initDefaultImage,
    backgroundColor,
    setBackgroundColor,
    setEditorActions,
    set3dBusy,
    setPiecesDataUrls,
  } =
    useUploadTextureStore();
  const { setMessage } = useSelection();
  const { boxWidth, boxLength, boxHeight, boxDepth, scaleHeight, scaleLength } = usePointer();
  const stageRef = useRef();
  const imageRef = useRef();
  const trRef = useRef();
  const containerRef = useRef();
  const retryCountRef = useRef(0);
  const lastPanRef = useRef({ x: 0, y: 0, active: false });
  const wheelSyncRef = useRef(0);
  const svgFitRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const svgBoundsRef = useRef({ width: 0, height: 0, minX: 0, minY: 0 });
  const transformedGroupsRef = useRef([]);
  const stageSizeRef = useRef({ width: DEFAULT_TEXTURE_SIZE, height: DEFAULT_TEXTURE_SIZE });
  const sendPiecesToBackendRef = useRef(null);
  const drawImageToCanvasRef = useRef(null);
  const updateTextureRef = useRef(null);
  const exportTimerRef = useRef(0);
  const initialImageAttrsRef = useRef(null);

  const [stageSize, setStageSize] = useState({
    width: DEFAULT_TEXTURE_SIZE,
    height: DEFAULT_TEXTURE_SIZE,
  });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [svgGroups, setSvgGroups] = useState([]);
  const [svgBounds, setSvgBounds] = useState({
    width: DEFAULT_TEXTURE_SIZE,
    height: DEFAULT_TEXTURE_SIZE,
    minX: 0,
    minY: 0,
  });

  const stagePosRef = useRef({ x: 0, y: 0 });
  const stageScaleRef = useRef(1);

  const handleTransformEnd = useCallback(() => {
    const canvas = drawImageToCanvasRef.current?.();
    if (canvas) updateTextureFromCanvas(canvas);
    sendPiecesToBackendRef.current?.();
  }, [updateTextureFromCanvas]);

  const loadSvgFromPath = useCallback(async () => {
    if (!svgPath) return;
    try {
      const { svgGroups: groups, svgBounds: bounds } = await fetchSvgData(svgPath);
      setSvgBounds(bounds);
      setSvgGroups(groups);
    } catch (error) {
      if (retryCountRef.current < 5) {
        retryCountRef.current += 1;
        setTimeout(loadSvgFromPath, 200);
        return;
      }
      console.error("SVG load error:", error);
    }
  }, [svgPath]);

  useEffect(() => {
    if (svgPath) {
      loadSvgFromPath();
    } else {
      setSvgGroups([]);
      setSvgBounds({
        width: DEFAULT_TEXTURE_SIZE,
        height: DEFAULT_TEXTURE_SIZE,
        minX: 0,
        minY: 0,
      });
    }
  }, [svgPath, loadSvgFromPath]);

  useEffect(() => {
    initDefaultImage();
  }, [initDefaultImage]);

  useEffect(() => {
    if (!editorImage || !imageRef.current) return;
    const img = editorImage;
    if (img.complete) {
      fitImageToCanvas();
    } else {
      img.onload = () => fitImageToCanvas();
    }
  }, [editorImage, stageSize, svgBounds]);

  useEffect(() => {
    // Ensure the Transformer is attached after both nodes mount.
    if (!editorImage || !imageRef.current || !trRef.current) return;
    trRef.current.nodes([imageRef.current]);
    trRef.current.getLayer()?.batchDraw();
  }, [editorImage, stageSize, svgBounds]);

  useEffect(() => {
    // Re-attach the transformer after scene/layout updates.
    if (!editorImage || !imageRef.current || !trRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (!trRef.current || !imageRef.current) return;
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    });
    return () => cancelAnimationFrame(raf);
  }, [
    editorImage,
    svgGroups.length,
    boxWidth,
    boxLength,
    boxHeight,
    boxDepth,
    stageSize,
    svgBounds,
    stageScale,
    stagePos,
  ]);

  useEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;
    const container = stage.container();
    if (!container) return;

    const setCursor = (value) => {
      container.style.cursor = value;
    };

    const anchors = [
      { name: ".top-left", cursor: "nwse-resize" },
      { name: ".bottom-right", cursor: "nwse-resize" },
      { name: ".top-right", cursor: "nesw-resize" },
      { name: ".bottom-left", cursor: "nesw-resize" },
      { name: ".rotater", cursor: "crosshair" },
    ];

    const handlers = [];
    anchors.forEach(({ name, cursor }) => {
      const node = tr.findOne(name);
      if (!node) return;
      const onEnter = () => setCursor(cursor);
      const onLeave = () => setCursor("default");
      node.on("mouseenter", onEnter);
      node.on("mouseleave", onLeave);
      handlers.push({ node, onEnter, onLeave });
    });

    const imageNode = imageRef.current;
    const onImageEnter = () => setCursor("move");
    const onImageLeave = () => setCursor("default");
    if (imageNode) {
      imageNode.on("mouseenter", onImageEnter);
      imageNode.on("mouseleave", onImageLeave);
    }

    return () => {
      handlers.forEach(({ node, onEnter, onLeave }) => {
        node.off("mouseenter", onEnter);
        node.off("mouseleave", onLeave);
      });
      if (imageNode) {
        imageNode.off("mouseenter", onImageEnter);
        imageNode.off("mouseleave", onImageLeave);
      }
    };
  }, [editorImage, stageSize]);

  const fitImageToCanvas = useCallback(() => {
    const imageNode = imageRef.current;
    if (!imageNode || !editorImage) return;

    const hasBounds = svgBounds.width > 0 && svgBounds.height > 0;
    const fitScale = hasBounds
      ? Math.min(stageSize.width / svgBounds.width, stageSize.height / svgBounds.height)
      : 1;
    const fitOffsetX = hasBounds ? (stageSize.width - svgBounds.width * fitScale) / 2 : 0;
    const fitOffsetY = hasBounds ? (stageSize.height - svgBounds.height * fitScale) / 2 : 0;
    const targetW = svgBounds.width * fitScale;
    const targetH = svgBounds.height * fitScale;
    const targetX = fitOffsetX;
    const targetY = fitOffsetY;

    const scale = Math.min(
      targetW / editorImage.naturalWidth,
      targetH / editorImage.naturalHeight
    );
    const width = editorImage.naturalWidth * scale;
    const height = editorImage.naturalHeight * scale;
    const x = targetX + (targetW - width) / 2;
    const y = targetY + (targetH - height) / 2;

    imageNode.setAttrs({
      x,
      y,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    });
    initialImageAttrsRef.current = {
      x,
      y,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };

    trRef.current?.nodes([imageNode]);
    stageRef.current?.container()?.focus();
    const canvas = drawImageToCanvasRef.current?.();
    if (canvas) updateTextureRef.current?.(canvas);
    sendPiecesToBackendRef.current?.();
  }, [editorImage, stageSize, svgBounds]);

  useEffect(() => {
    if (!inline) return;
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      };
      setStageSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [inline]);

  useEffect(() => {
    stagePosRef.current = stagePos;
  }, [stagePos]);

  useEffect(() => {
    stageScaleRef.current = stageScale;
  }, [stageScale]);

  useEffect(() => {
    stageSizeRef.current = stageSize;
  }, [stageSize]);

  const applyStageTransform = useCallback((pos, scale) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (pos) {
      stage.position(pos);
      stagePosRef.current = pos;
    }
    if (typeof scale === "number") {
      stage.scale({ x: scale, y: scale });
      stageScaleRef.current = scale;
    }
    stage.batchDraw();
  }, []);

  const syncStageState = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.position();
    const scale = stage.scaleX();
    setStagePos({ x: pos.x, y: pos.y });
    setStageScale(scale);
  }, []);

  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      // Default wheel zooms; pan with shift or trackpad horizontal scroll.
      const isPan =
        e.evt.shiftKey || Math.abs(e.evt.deltaX) > Math.abs(e.evt.deltaY);

      if (isPan) {
        const next = {
          x: stagePosRef.current.x - e.evt.deltaX,
          y: stagePosRef.current.y - e.evt.deltaY,
        };
        applyStageTransform(next, null);
      } else {
        const scaleBy = 1.05;
        const oldScale = stageScaleRef.current;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
          x: (pointer.x - stagePosRef.current.x) / oldScale,
          y: (pointer.y - stagePosRef.current.y) / oldScale,
        };

        const newScale =
          e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };

        applyStageTransform(newPos, newScale);
      }

      clearTimeout(wheelSyncRef.current);
      wheelSyncRef.current = setTimeout(syncStageState, 120);
    },
    [applyStageTransform, syncStageState]
  );

  const handlePanStart = useCallback((stageX, stageY) => {
    lastPanRef.current = { x: stageX, y: stageY, active: true };
  }, []);

  const handlePanMove = useCallback(
    (stageX, stageY, dx, dy) => {
      if (!lastPanRef.current.active) return;
      lastPanRef.current = { x: stageX, y: stageY, active: true };

      const next = {
        x: stagePosRef.current.x + dx,
        y: stagePosRef.current.y + dy,
      };
      applyStageTransform(next, null);
    },
    [applyStageTransform]
  );

  const handlePanEnd = useCallback(() => {
    lastPanRef.current = { x: 0, y: 0, active: false };
    syncStageState();
  }, [syncStageState]);

  const gridCells = useMemo(() => {
    const cell = 16;
    const cols = Math.ceil(svgBounds.width / cell);
    const rows = Math.ceil(svgBounds.height / cell);
    const cells = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        cells.push({ x, y });
      }
    }
    return { cells, cell };
  }, [svgBounds]);

  const svgFit = useMemo(() => {
    if (!svgGroups.length) return { scale: 1, offsetX: 0, offsetY: 0 };
    const scale = Math.min(
      stageSize.width / svgBounds.width,
      stageSize.height / svgBounds.height
    );
    const offsetX = (stageSize.width - svgBounds.width * scale) / 2;
    const offsetY = (stageSize.height - svgBounds.height * scale) / 2;
    return { scale, offsetX, offsetY };
  }, [svgBounds, svgGroups.length, stageSize]);

  const transformedGroups = useMemo(
    () =>
      applyTemplateTransforms({
        svgGroups,
        boxWidth,
        boxLength,
        boxHeight,
        boxDepth,
        scaleHeight,
        getRuleForChild,
        setMessage,
      }),
    [svgGroups, boxWidth, boxLength, boxHeight, boxDepth, scaleHeight, setMessage]
  );

  const debugMarkers = useMemo(() => [], []);

  useEffect(() => {
    svgFitRef.current = svgFit;
  }, [svgFit]);

  useEffect(() => {
    svgBoundsRef.current = svgBounds;
  }, [svgBounds]);

  useEffect(() => {
    transformedGroupsRef.current = transformedGroups;
  }, [transformedGroups]);

  const drawImageToCanvas = useCallback(() => {
    const imageNode = imageRef.current;
    if (!imageNode || !editorImage) return null;
    const { width, height } = stageSizeRef.current;
    const canvas = document.createElement("canvas");
    const exportWidth = Math.max(1, Math.round(width * TEXTURE_SCALE));
    const exportHeight = Math.max(1, Math.round(height * TEXTURE_SCALE));
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // White background so transparent areas export as white.
    ctx.fillStyle = backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Apply the node's absolute transform (includes stage pan/zoom + node transform)
    // and draw only the image to avoid exporting transformer outlines.
    const [a, b, c, d, e, f] = imageNode.getAbsoluteTransform().getMatrix();
    ctx.save();
    ctx.setTransform(
      a * TEXTURE_SCALE,
      b * TEXTURE_SCALE,
      c * TEXTURE_SCALE,
      d * TEXTURE_SCALE,
      e * TEXTURE_SCALE,
      f * TEXTURE_SCALE
    );
    ctx.drawImage(editorImage, 0, 0, imageNode.width(), imageNode.height());
    ctx.restore();
    return canvas;
  }, [editorImage, backgroundColor]);

  useEffect(() => {
    drawImageToCanvasRef.current = drawImageToCanvas;
  }, [drawImageToCanvas]);

  useEffect(() => {
    updateTextureRef.current = updateTextureFromCanvas;
  }, [updateTextureFromCanvas]);

  const svgToCanvasPoint = useCallback((x, y) => {
    const fit = svgFitRef.current;
    const bounds = svgBoundsRef.current;
    const stageScale = stageScaleRef.current || 1;
    const stagePos = stagePosRef.current || { x: 0, y: 0 };
    const localX = fit.offsetX + (x - bounds.minX) * fit.scale;
    const localY = fit.offsetY + (y - bounds.minY) * fit.scale;
    return {
      x: stagePos.x + localX * stageScale,
      y: stagePos.y + localY * stageScale,
    };
  }, []);

  const buildCanvasPathFromGroup = useCallback((ctx, group) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasPoints = false;

    group.paths.forEach((p) => {
      const segments = parsePath(p.d);
      const pts = getPathPoints(segments);
      if (pts.length < 2) return;
      const mapped = pts.map((pt) => svgToCanvasPoint(pt.x, pt.y));
      ctx.moveTo(mapped[0].x, mapped[0].y);
      for (let i = 1; i < mapped.length; i += 1) {
        ctx.lineTo(mapped[i].x, mapped[i].y);
      }
      ctx.closePath();
      mapped.forEach((pt) => {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      });
      hasPoints = true;
    });

    if (!hasPoints) return null;
    return { minX, minY, maxX, maxY };
  }, [svgToCanvasPoint]);

  const cropPiecesToDataUrls = useCallback(() => {
    const baseCanvas = drawImageToCanvas();
    if (!baseCanvas) return null;
    const { width, height } = stageSizeRef.current;
    const exportWidth = Math.max(1, Math.round(width * TEXTURE_SCALE));
    const exportHeight = Math.max(1, Math.round(height * TEXTURE_SCALE));
    const groups = transformedGroupsRef.current;
    const pieces = {};

    groups.forEach((group) => {
      if (!group.id) return;
      const pieceCanvas = document.createElement("canvas");
      pieceCanvas.width = exportWidth;
      pieceCanvas.height = exportHeight;
      const ctx = pieceCanvas.getContext("2d");
      if (!ctx) return;

      // White background so clipped transparency becomes white.
      ctx.fillStyle = backgroundColor || "#ffffff";
      ctx.fillRect(0, 0, exportWidth, exportHeight);
      ctx.save();
      ctx.beginPath();
      ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE);
      const bbox = buildCanvasPathFromGroup(ctx, group);
      if (!bbox) {
        ctx.restore();
        return;
      }
      ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(baseCanvas, 0, 0);
      ctx.restore();

      const cropW = Math.max(1, Math.ceil((bbox.maxX - bbox.minX) * TEXTURE_SCALE));
      const cropH = Math.max(1, Math.ceil((bbox.maxY - bbox.minY) * TEXTURE_SCALE));
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) return;
      cropCtx.drawImage(
        pieceCanvas,
        bbox.minX * TEXTURE_SCALE,
        bbox.minY * TEXTURE_SCALE,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );
      pieces[group.id] = cropCanvas.toDataURL("image/png");
    });

    return pieces;
  }, [backgroundColor, buildCanvasPathFromGroup, drawImageToCanvas]);

  const sendPiecesToBackend = useCallback(async () => {
    try {
      const pieces = cropPiecesToDataUrls();
      if (!pieces) return;
      // Backend save disabled: use in-memory piece textures instead.
      // await fetch(apiUrl("/api/pieces"), {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ pieces }),
      // });
      setPiecesDataUrls(pieces);
    } catch (err) {
      // Backend is optional during dev; avoid breaking interaction.
      console.warn("piece export failed:", err);
    }
  }, [cropPiecesToDataUrls, setPiecesDataUrls]);

  useEffect(() => {
    sendPiecesToBackendRef.current = sendPiecesToBackend;
  }, [sendPiecesToBackend]);

  const scheduleBackendExport = useCallback(() => {
    set3dBusy(true);
    clearTimeout(exportTimerRef.current);
    exportTimerRef.current = setTimeout(() => {
      const canvas = drawImageToCanvasRef.current?.();
      if (canvas) updateTextureRef.current?.(canvas);
      sendPiecesToBackendRef.current?.();
      setTimeout(() => set3dBusy(false), 180);
    }, 120);
  }, [set3dBusy]);

  useEffect(() => () => clearTimeout(exportTimerRef.current), []);

  useEffect(() => {
    // Background changes should also update exported pieces.
    if (!editorImage) return;
    const canvas = drawImageToCanvas();
    if (canvas) updateTextureFromCanvas(canvas);
    sendPiecesToBackendRef.current?.();
  }, [backgroundColor, drawImageToCanvas, editorImage, updateTextureFromCanvas]);

  useEffect(() => {
    // Resizing the box changes piece shapes; re-export textures.
    if (!editorImage) return;
    scheduleBackendExport();
  }, [boxWidth, boxLength, boxHeight, boxDepth, editorImage, scheduleBackendExport]);

  useEffect(() => {
    // On first open/load, push textures immediately so SVG meshes are textured.
    if (!editorImage || !svgGroups.length) return;
    const canvas = drawImageToCanvasRef.current?.();
    if (canvas) updateTextureRef.current?.(canvas);
    sendPiecesToBackendRef.current?.();
  }, [editorImage, svgGroups.length]);

  const resetImage = useCallback(() => {
    const imageNode = imageRef.current;
    if (!imageNode || !initialImageAttrsRef.current) return;
    imageNode.setAttrs(initialImageAttrsRef.current);
    trRef.current?.nodes([imageNode]);
    trRef.current?.getLayer()?.batchDraw();
    const canvas = drawImageToCanvas();
    if (canvas) updateTextureFromCanvas(canvas);
    sendPiecesToBackendRef.current?.();
  }, [drawImageToCanvas, updateTextureFromCanvas]);

  const exportCanvasSvg = useCallback(async () => {
    const canvas = drawImageToCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const { width, height } = canvas;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<image href="${dataUrl}" x="0" y="0" width="${width}" height="${height}" />` +
      `</svg>`;
    try {
      await fetch(apiUrl("/api/export/svg"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ svg }),
      });
    } catch (err) {
      console.warn("svg export failed:", err);
    }
  }, [drawImageToCanvas]);

  const saveTemplate = useCallback(async () => {
    const imageNode = imageRef.current;
    if (!imageNode) return;
    const template = {
      backgroundColor: backgroundColor || "#ffffff",
      stage: {
        x: stagePosRef.current.x,
        y: stagePosRef.current.y,
        scale: stageScaleRef.current,
      },
      image: {
        x: imageNode.x(),
        y: imageNode.y(),
        width: imageNode.width(),
        height: imageNode.height(),
        scaleX: imageNode.scaleX(),
        scaleY: imageNode.scaleY(),
        rotation: imageNode.rotation(),
      },
    };
    try {
      const res = await fetch(apiUrl("/api/template/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessage("Template saved");
    } catch (err) {
      console.warn("template save failed:", err);
      setMessage("Template save failed");
    }
  }, [backgroundColor, setMessage]);

  const loadTemplate = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/template/load"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.ok || !data.template) return;
      const tpl = data.template;
      if (tpl.backgroundColor) setBackgroundColor(tpl.backgroundColor);
      if (tpl.stage) {
        applyStageTransform({ x: tpl.stage.x || 0, y: tpl.stage.y || 0 }, tpl.stage.scale || 1);
        syncStageState();
      }
      if (tpl.image && imageRef.current) {
        imageRef.current.setAttrs(tpl.image);
        trRef.current?.nodes([imageRef.current]);
        trRef.current?.getLayer()?.batchDraw();
      }
      const canvas = drawImageToCanvas();
      if (canvas) updateTextureFromCanvas(canvas);
      sendPiecesToBackendRef.current?.();
      setMessage("Template loaded");
    } catch (err) {
      console.warn("template load failed:", err);
      setMessage("Template load failed");
    }
  }, [
    applyStageTransform,
    drawImageToCanvas,
    setBackgroundColor,
    setMessage,
    syncStageState,
    updateTextureFromCanvas,
  ]);



  useEffect(() => {
    setEditorActions({
      resetImage,
      exportCanvasSvg,
      saveTemplate,
      loadTemplate,
    });
    return () => setEditorActions({});
  }, [exportCanvasSvg, loadTemplate, resetImage, saveTemplate, setEditorActions]);

  if (!inline && (!showEditor || !editorImage)) return null;

  const wrapperClass = inline ? "konva-editor-inline" : "konva-editor-overlay";

  const isInteractive = true;

  return (
    <div className={wrapperClass} ref={containerRef}>
      <div className="konva-editor">
        <div className="konva-canvas">
          <StageView
            inline={inline}
            stageSize={stageSize}
            stageRef={stageRef}
            stageScale={stageScale}
            stagePos={stagePos}
            handleWheel={handleWheel}
            lastPanRef={lastPanRef}
            handlePanStart={handlePanStart}
            handlePanMove={handlePanMove}
            handlePanEnd={handlePanEnd}
            svgFit={svgFit}
            svgBounds={svgBounds}
            gridCells={gridCells}
            editorImage={editorImage}
            imageRef={imageRef}
            handleTransformEnd={handleTransformEnd}
            handleTransformLive={scheduleBackendExport}
            transformedGroups={transformedGroups}
            debugMarkers={[]}
            trRef={trRef}
            boxWidth={boxWidth}
            boxLength={boxLength}
            boxHeight={boxHeight}
            scaleHeight={scaleHeight}
            scaleLength={scaleLength}
          />
        </div>
      </div>
    </div>
  );
};

export default KonvaTextureEditor;
