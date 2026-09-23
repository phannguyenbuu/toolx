import { useState, useRef, useEffect, useCallback } from 'react';
import Konva from 'konva';
import { PageConfig, mmToPx } from '../types';

const CONTAINER_PADDING = 100;
const ZOOM_FACTOR = 1.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export function useCanvasZoomPan(pageConfig: PageConfig) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 50, y: 50 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; stageX: number; stageY: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let isInitialLoad = true;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
        if (isInitialLoad) {
          isInitialLoad = false;
          const containerW = entry.contentRect.width;
          const containerH = entry.contentRect.height;
          const pageW = mmToPx(pageConfig.width);
          const pageH = mmToPx(pageConfig.height);
          const fitZoom = Math.min(
            (containerW - CONTAINER_PADDING) / pageW,
            (containerH - CONTAINER_PADDING) / pageH
          );
          setZoom(fitZoom);
          setStagePos({
            x: (containerW - pageW * fitZoom) / 2,
            y: (containerH - pageH * fitZoom) / 2
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pageConfig.width, pageConfig.height]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const newZoom = e.evt.deltaY < 0 ? zoom * ZOOM_FACTOR : zoom / ZOOM_FACTOR;
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom)));
    } else {
      setStagePos(prev => ({
        x: prev.x - e.evt.deltaX,
        y: prev.y - e.evt.deltaY
      }));
    }
  };

  const handleZoomFit = useCallback(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const pageW = mmToPx(pageConfig.width);
    const pageH = mmToPx(pageConfig.height);
    const fitZoom = Math.min(
      (containerW - CONTAINER_PADDING) / pageW,
      (containerH - CONTAINER_PADDING) / pageH
    );
    setZoom(fitZoom);
    setStagePos({
      x: (containerW - pageW * fitZoom) / 2,
      y: (containerH - pageH * fitZoom) / 2
    });
  }, [pageConfig.width, pageConfig.height]);

  return {
    containerRef,
    zoom,
    setZoom,
    stagePos,
    setStagePos,
    containerSize,
    isPanning,
    setIsPanning,
    panStartRef,
    handleWheel,
    handleZoomFit
  };
}
