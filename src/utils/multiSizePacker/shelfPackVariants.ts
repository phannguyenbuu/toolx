import { PackItem, PackedItem } from './types';

/**
 * Pack layer by layer, starting a clean shelf for each layer
 * and keeping uniform optimal orientation for all items in that layer
 */
export function shelfPackLayerByLayer(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowRotation: boolean = true,
  allowMultiSheet: boolean = true
): { items: PackedItem[]; totalSheets: number; skipped: number } {
  const tabGroups: { tabId: string; items: PackItem[] }[] = [];
  for (const item of items) {
    const key = item.tabId || item.tabName || 'default';
    let group = tabGroups.find(g => g.tabId === key);
    if (!group) {
      group = { tabId: key, items: [] };
      tabGroups.push(group);
    }
    group.items.push(item);
  }

  const placed: PackedItem[] = [];
  let curSheet = 0;
  let shelfY = 0;
  let shelfH = 0;
  let curX = 0;
  let skipped = 0;

  for (const group of tabGroups) {
    if (group.items.length === 0) continue;
    const first = group.items[0];
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(first.shape || '');
    const canRotate = allowRotation && !isSpecialShape && (first.canRotate !== false);

    // Determine optimal orientation for this entire layer
    const w1 = first.w + padding, h1 = first.h + padding;
    const w2 = canRotate ? first.h + padding : w1, h2 = canRotate ? first.w + padding : h1;

    let useRot = false;
    if (canRotate) {
      const cols1 = Math.floor(sheetW / w1);
      const cols2 = Math.floor(sheetW / w2);
      if (cols2 > cols1) {
        useRot = true;
      } else if (cols2 === cols1) {
        useRot = h2 < h1;
      }
    }

    const itemW = useRot ? first.h : first.w;
    const itemH = useRot ? first.w : first.h;
    const w = itemW + padding;
    const h = itemH + padding;

    // Start a clean new shelf for a new layer
    if (curX > 0 && shelfH > 0) {
      shelfY += shelfH;
      curX = 0;
      shelfH = 0;
    }

    for (const item of group.items) {
      // 1. Try placing on current shelf
      if (curX + w <= sheetW && shelfY + Math.max(shelfH, h) <= sheetH) {
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
      } else {
        // 2. Start new shelf
        const nextShelfY = shelfY + (shelfH > 0 ? shelfH : h);
        if (w <= sheetW && nextShelfY + h <= sheetH) {
          shelfY = nextShelfY;
          curX = 0;
          shelfH = 0;

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
        } else if (allowMultiSheet) {
          // 3. Move to next sheet
          curSheet++;
          shelfY = 0;
          shelfH = 0;
          curX = 0;

          if (w <= sheetW && h <= sheetH) {
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
    }
  }

  return { items: placed, totalSheets: curSheet + 1, skipped };
}

/**
 * Multi-sheet Shelf-based bin packing (Bottom-Left Decreasing Height)
 */
export function shelfPack(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowMultiSheet: boolean = true
): { items: PackedItem[]; totalSheets: number; skipped: number } {
  const sorted = [...items].sort((a, b) => b.h - a.h || b.w - a.w);
  const placed: PackedItem[] = [];
  let curSheet = 0;
  let shelfY = 0;
  let shelfH = 0;
  let curX = 0;
  let skipped = 0;

  for (const item of sorted) {
    const w = item.w + padding;
    const h = item.h + padding;

    if (curX + w <= sheetW && shelfY + h <= sheetH) {
      placed.push({
        x: curX, y: shelfY, w: item.w, h: item.h, id: item.id, rot: false, sheetIndex: curSheet,
        tabId: item.tabId, tabName: item.tabName, shape: item.shape, cornerRadius: item.cornerRadius,
        sourceImage: item.sourceImage, vectorMaskResult: item.vectorMaskResult, customSvgData: item.customSvgData, color: item.color
      });
      curX += w;
      shelfH = Math.max(shelfH, h);
    } else {
      shelfY += (shelfH > 0 ? shelfH : h);
      curX = 0;
      shelfH = 0;

      if (curX + w <= sheetW && shelfY + h <= sheetH) {
        placed.push({
          x: curX, y: shelfY, w: item.w, h: item.h, id: item.id, rot: false, sheetIndex: curSheet,
          tabId: item.tabId, tabName: item.tabName, shape: item.shape, cornerRadius: item.cornerRadius,
          sourceImage: item.sourceImage, vectorMaskResult: item.vectorMaskResult, customSvgData: item.customSvgData, color: item.color
        });
        curX += w;
        shelfH = Math.max(shelfH, h);
      } else if (allowMultiSheet) {
        curSheet++;
        shelfY = 0;
        curX = 0;
        shelfH = 0;

        if (curX + w <= sheetW && shelfY + h <= sheetH) {
          placed.push({
            x: curX, y: shelfY, w: item.w, h: item.h, id: item.id, rot: false, sheetIndex: curSheet,
            tabId: item.tabId, tabName: item.tabName, shape: item.shape, cornerRadius: item.cornerRadius,
            sourceImage: item.sourceImage, vectorMaskResult: item.vectorMaskResult, customSvgData: item.customSvgData, color: item.color
          });
          curX += w;
          shelfH = Math.max(shelfH, h);
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
  }

  return { items: placed, totalSheets: curSheet + 1, skipped };
}

/**
 * Multi-sheet Shelf pack with auto-rotation (size-based sorting)
 */
export function shelfPackRotated(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowMultiSheet: boolean = true,
  allowRotation: boolean = true
): { items: PackedItem[]; totalSheets: number; skipped: number } {
  const sorted = [...items].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const placed: PackedItem[] = [];
  let curSheet = 0;
  let shelfY = 0;
  let shelfH = 0;
  let curX = 0;
  let skipped = 0;

  for (const item of sorted) {
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(item.shape || '');
    const allowRot = allowRotation && !isSpecialShape && (item.canRotate !== false);

    const w1 = item.w + padding, h1 = item.h + padding;
    const w2 = allowRot ? item.h + padding : w1, h2 = allowRot ? item.w + padding : h1;

    let useRot = false;
    let w = w1, h = h1;

    const fitsNormal = curX + w1 <= sheetW && shelfY + h1 <= sheetH;
    const fitsRotated = allowRot && curX + w2 <= sheetW && shelfY + h2 <= sheetH;

    if (fitsNormal && fitsRotated) {
      useRot = h2 < h1;
    } else if (fitsRotated && !fitsNormal) {
      useRot = true;
    }

    if (useRot) { w = w2; h = h2; }

    if (curX + w <= sheetW && shelfY + h <= sheetH) {
      placed.push({
        x: curX, y: shelfY,
        w: useRot ? item.h : item.w,
        h: useRot ? item.w : item.h,
        id: item.id, rot: useRot, sheetIndex: curSheet,
        tabId: item.tabId, tabName: item.tabName, shape: item.shape, cornerRadius: item.cornerRadius,
        sourceImage: item.sourceImage, vectorMaskResult: item.vectorMaskResult, customSvgData: item.customSvgData, color: item.color
      });
      curX += w;
      shelfH = Math.max(shelfH, h);
    } else {
      shelfY += (shelfH > 0 ? shelfH : h);
      curX = 0;
      shelfH = 0;

      const f1 = curX + w1 <= sheetW && shelfY + h1 <= sheetH;
      const f2 = allowRot && curX + w2 <= sheetW && shelfY + h2 <= sheetH;
      useRot = false;
      if (f1 && f2) useRot = h2 < h1;
      else if (f2) useRot = true;

      w = useRot ? w2 : w1;
      h = useRot ? h2 : h1;

      if (curX + w <= sheetW && shelfY + h <= sheetH) {
        placed.push({
          x: curX, y: shelfY,
          w: useRot ? item.h : item.w,
          h: useRot ? item.w : item.h,
          id: item.id, rot: useRot, sheetIndex: curSheet,
          tabId: item.tabId, tabName: item.tabName, shape: item.shape, cornerRadius: item.cornerRadius,
          sourceImage: item.sourceImage, vectorMaskResult: item.vectorMaskResult, customSvgData: item.customSvgData, color: item.color
        });
        curX += w;
        shelfH = Math.max(shelfH, h);
      } else if (allowMultiSheet) {
        curSheet++;
        shelfY = 0;
        curX = 0;
        shelfH = 0;

        const sf1 = curX + w1 <= sheetW && shelfY + h1 <= sheetH;
        const sf2 = allowRot && curX + w2 <= sheetW && shelfY + h2 <= sheetH;
        useRot = false;
        if (sf1 && sf2) useRot = h2 < h1;
        else if (sf2) useRot = true;

        w = useRot ? w2 : w1;
        h = useRot ? h2 : h1;

        if (curX + w <= sheetW && shelfY + h <= sheetH) {
          placed.push({
            x: curX, y: shelfY,
            w: useRot ? item.h : item.w,
            h: useRot ? item.w : item.h,
            id: item.id, rot: useRot, sheetIndex: curSheet,
            tabId: item.tabId, tabName: item.tabName, shape: item.shape, cornerRadius: item.cornerRadius,
            sourceImage: item.sourceImage, vectorMaskResult: item.vectorMaskResult, customSvgData: item.customSvgData, color: item.color
          });
          curX += w;
          shelfH = Math.max(shelfH, h);
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
  }

  return { items: placed, totalSheets: curSheet + 1, skipped };
}
