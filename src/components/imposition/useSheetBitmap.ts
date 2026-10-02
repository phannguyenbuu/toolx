import { useState, useEffect, useRef } from 'react';
import { renderSheetBitmap, SheetBitmapParams } from './sheetBitmapRenderer';
export type { SheetBitmapParams } from './sheetBitmapRenderer';

interface UseSheetBitmapResult {
  canvas: HTMLCanvasElement | null;
  isLoading: boolean;
}

/**
 * Async hook: renders sheet content to an offscreen canvas.
 * Returns the HTMLCanvasElement directly — can be passed to Konva.Image as `image` prop.
 * Re-renders whenever key params change (debounced 200ms to avoid thrashing during config edits).
 */
export function useSheetBitmap(params: SheetBitmapParams): UseSheetBitmapResult {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const paramsRef = useRef<SheetBitmapParams>(params);
  paramsRef.current = params;

  // Build a stable dependency key so we don't re-render on every render cycle
  const depKey = JSON.stringify({
    sIdx: params.sIdx,
    scale: params.scale,
    previewSide: params.previewSide,
    fitMode: params.config.fitMode,
    shape: params.config.shape,
    pageW: params.config.pageW,
    pageH: params.config.pageH,
    is2Sided: params.config.is2Sided,
    // alignment — critical: changes must trigger re-render
    alignX: params.config.alignX,
    alignY: params.config.alignY,
    useMargin: params.config.useMargin,
    usePrintArea: params.config.usePrintArea,
    itemCount: params.sheetItems.length,
    tabsLen: params.shapeTabs.length,
    pagesLen: params.allPages.length,
    pageCopies: params.allPages.map(p => p.copies).join(','),
    tabSources: params.shapeTabs.map(t => (t.sourceImage as any)?.thumb ?? t.sourceImage ?? null),
    quantity: params.activeTab?.quantity,
    autoRotateImage: params.activeTab?.autoRotateImage,
    // Hash all item positions (rounded to 0.1mm) — detects ANY layout shift
    positions: params.sheetItems
      .map(it => `${Math.round(it.x * 10)},${Math.round(it.y * 10)}`)
      .join('|'),
  });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const timerId = setTimeout(async () => {
      if (cancelled) return;
      try {
        const result = await renderSheetBitmap(paramsRef.current);
        if (!cancelled) {
          setCanvas(result);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[useSheetBitmap] render error:', e);
        if (!cancelled) setIsLoading(false);
      }
    }, 200); // 200ms debounce

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return { canvas, isLoading };
}
