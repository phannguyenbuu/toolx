import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ImpositionConfig } from './types';

export interface UseCanvasContainerReturn {
  containerRef: React.RefObject<HTMLElement | null>;
  scale: number;
  containerSize: { w: number; h: number };
}

/**
 * Hook to manage canvas container measurement, dynamic responsive scale, and wheel zoom
 */
export function useCanvasContainer(
  config: ImpositionConfig,
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>
): UseCanvasContainerReturn {
  const containerRef = useRef<HTMLElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({
          w: Math.max(100, rect.width - 48),
          h: Math.max(100, rect.height - 48),
        });
      }
    };

    measure();
    const t = setTimeout(measure, 60);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', measure);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setCanvasZoom(prev => Math.min(Math.max(Math.round(prev * factor * 100) / 100, 0.2), 10));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      clearTimeout(t);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [setCanvasZoom]);

  const scale = useMemo(() => {
    const scaleW = containerSize.w / (config.pageW || 1);
    const scaleH = containerSize.h / (config.pageH || 1);
    return Math.min(scaleW, scaleH, 3) * 0.95; // 95% of available space
  }, [config.pageW, config.pageH, containerSize]);

  return { containerRef, scale, containerSize };
}
