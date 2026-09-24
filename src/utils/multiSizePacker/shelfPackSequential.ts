import { PackItem, PackedItem } from './types';

/**
 * Sequential Shelf packing preserving exact Layer (A -> B -> C) order
 * with Anti-Inflation protection (never let a single rotated item inflate the row height)
 */
export function shelfPackSequential(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowRotation: boolean = true,
  allowMultiSheet: boolean = true
): { items: PackedItem[]; totalSheets: number; skipped: number } {
  const placed: PackedItem[] = [];
  let curSheet = 0;
  let shelfY = 0;
  let shelfH = 0;
  let curX = 0;
  let skipped = 0;

  for (const item of items) {
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(item.shape || '');
    const canRotate = allowRotation && !isSpecialShape && (item.canRotate !== false);

    const wNormal = item.w + padding;
    const hNormal = item.h + padding;
    const wRot = canRotate ? item.h + padding : wNormal;
    const hRot = canRotate ? item.w + padding : hNormal;

    // Anti-inflation: Never let a single item inflate shelf height by more than 15%
    const maxAllowedH = shelfH > 0 ? shelfH * 1.15 : Infinity;

    const fitsNormalCur = (curX + wNormal <= sheetW) && (shelfH === 0 || hNormal <= maxAllowedH) && (shelfY + Math.max(shelfH, hNormal) <= sheetH);
    const fitsRotCur = canRotate && (curX + wRot <= sheetW) && (shelfH === 0 || hRot <= maxAllowedH) && (shelfY + Math.max(shelfH, hRot) <= sheetH);

    let placedOnCurrent = false;
    let useRot = false;

    if (fitsNormalCur && fitsRotCur) {
      if (shelfH > 0) {
        useRot = Math.abs(hRot - shelfH) < Math.abs(hNormal - shelfH);
      } else {
        useRot = hRot < hNormal;
      }
      placedOnCurrent = true;
    } else if (fitsNormalCur) {
      useRot = false;
      placedOnCurrent = true;
    } else if (fitsRotCur) {
      useRot = true;
      placedOnCurrent = true;
    }

    if (placedOnCurrent) {
      const itemW = useRot ? item.h : item.w;
      const itemH = useRot ? item.w : item.h;
      const w = itemW + padding;
      const h = itemH + padding;

      placed.push({
        x: curX,
        y: shelfY,
        w: itemW,
        h: itemH,
        id: item.id,
        rot: useRot,
        sheetIndex: curSheet,
        tabId: item.tabId,
        tabName: item.tabName,
        shape: item.shape,
        cornerRadius: item.cornerRadius,
        sourceImage: item.sourceImage,
        vectorMaskResult: item.vectorMaskResult,
        customSvgData: item.customSvgData,
        color: item.color,
      });

      curX += w;
      shelfH = Math.max(shelfH, h);
      continue;
    }

    // 2. Try starting a new shelf on current sheet
    const nextShelfY = shelfY + (shelfH > 0 ? shelfH : hNormal);
    const fitsNormalNewShelf = (wNormal <= sheetW) && (nextShelfY + hNormal <= sheetH);
    const fitsRotNewShelf = canRotate && (wRot <= sheetW) && (nextShelfY + hRot <= sheetH);

    let placedOnNewShelf = false;
    if (fitsNormalNewShelf && fitsRotNewShelf) {
      const colsNormal = Math.floor(sheetW / wNormal);
      const colsRot = Math.floor(sheetW / wRot);
      if (colsRot > colsNormal) useRot = true;
      else if (colsRot < colsNormal) useRot = false;
      else useRot = hRot < hNormal;
      placedOnNewShelf = true;
    } else if (fitsNormalNewShelf) {
      useRot = false;
      placedOnNewShelf = true;
    } else if (fitsRotNewShelf) {
      useRot = true;
      placedOnNewShelf = true;
    }

    if (placedOnNewShelf) {
      shelfY = nextShelfY;
      curX = 0;
      shelfH = 0;

      const itemW = useRot ? item.h : item.w;
      const itemH = useRot ? item.w : item.h;
      const w = itemW + padding;
      const h = itemH + padding;

      placed.push({
        x: curX,
        y: shelfY,
        w: itemW,
        h: itemH,
        id: item.id,
        rot: useRot,
        sheetIndex: curSheet,
        tabId: item.tabId,
        tabName: item.tabName,
        shape: item.shape,
        cornerRadius: item.cornerRadius,
        sourceImage: item.sourceImage,
        vectorMaskResult: item.vectorMaskResult,
        customSvgData: item.customSvgData,
        color: item.color,
      });

      curX += w;
      shelfH = h;
      continue;
    }

    // 3. Try moving to next sheet
    if (allowMultiSheet) {
      curSheet++;
      shelfY = 0;
      shelfH = 0;
      curX = 0;

      const fitsNormalNewSheet = (wNormal <= sheetW) && (hNormal <= sheetH);
      const fitsRotNewSheet = canRotate && (wRot <= sheetW) && (hRot <= sheetH);

      let placedOnNewSheet = false;
      if (fitsNormalNewSheet && fitsRotNewSheet) {
        const colsNormal = Math.floor(sheetW / wNormal);
        const colsRot = Math.floor(sheetW / wRot);
        if (colsRot > colsNormal) useRot = true;
        else if (colsRot < colsNormal) useRot = false;
        else useRot = hRot < hNormal;
        placedOnNewSheet = true;
      } else if (fitsNormalNewSheet) {
        useRot = false;
        placedOnNewSheet = true;
      } else if (fitsRotNewSheet) {
        useRot = true;
        placedOnNewSheet = true;
      }

      if (placedOnNewSheet) {
        const itemW = useRot ? item.h : item.w;
        const itemH = useRot ? item.w : item.h;
        const w = itemW + padding;
        const h = itemH + padding;

        placed.push({
          x: curX,
          y: shelfY,
          w: itemW,
          h: itemH,
          id: item.id,
          rot: useRot,
          sheetIndex: curSheet,
          tabId: item.tabId,
          tabName: item.tabName,
          shape: item.shape,
          cornerRadius: item.cornerRadius,
          sourceImage: item.sourceImage,
          vectorMaskResult: item.vectorMaskResult,
          customSvgData: item.customSvgData,
          color: item.color,
        });

        curX += w;
        shelfH = h;
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  return { items: placed, totalSheets: curSheet + 1, skipped };
}
