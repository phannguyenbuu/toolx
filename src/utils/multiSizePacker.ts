/**
 * Multi-size / Multi-shape bin packing solver
 * Places items of different sizes and shapes on a sheet using intelligent shelf packing
 */

export interface PackItem {
  w: number;  // width in mm
  h: number;  // height in mm
  id: number; // original index
  tabId?: string;
  tabName?: string;
  shape?: string;
  cornerRadius?: number;
  sourceImage?: any;
  vectorMaskResult?: any;
  customSvgData?: string;
  color?: string;
}

export interface PackedItem {
  x: number;
  y: number;
  w: number;
  h: number;
  id: number;
  rot: boolean;
  sheetIndex?: number;
  tabId?: string;
  tabName?: string;
  shape?: string;
  cornerRadius?: number;
  sourceImage?: any;
  vectorMaskResult?: any;
  customSvgData?: string;
  color?: string;
}

export interface PackResult {
  name: string;
  items: PackedItem[];
  totalSheets?: number;
  skipped: number; // items that didn't fit
}

/**
 * Pack layer by layer, starting a clean shelf for each layer
 * and keeping uniform optimal orientation for all items in that layer
 */
function shelfPackLayerByLayer(
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
    const canRotate = allowRotation && !isSpecialShape;

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
 * Sequential Shelf packing preserving exact Layer (A -> B -> C) order
 * with Anti-Inflation protection (never let a single rotated item inflate the row height)
 */
function shelfPackSequential(
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
    const canRotate = allowRotation && !isSpecialShape;

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

/**
 * Multi-sheet Shelf-based bin packing (Bottom-Left Decreasing Height)
 */
function shelfPack(
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
function shelfPackRotated(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowMultiSheet: boolean = true
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
    const allowRot = !isSpecialShape;

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

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 2D Maximal Rectangles Bin Packer (MaxRects)
 * Tracks all available free rectangular spaces on a sheet and inserts items
 * at optimal points (top-to-bottom, left-to-right, filling every pocket)
 */
class MaxRectsSheetPacker {
  public sheetW: number;
  public sheetH: number;
  public padding: number;
  public freeRectangles: Rect[] = [];
  public placedItems: PackedItem[] = [];

  constructor(sheetW: number, sheetH: number, padding: number) {
    this.sheetW = sheetW;
    this.sheetH = sheetH;
    this.padding = padding;
    this.freeRectangles = [{ x: 0, y: 0, w: sheetW, h: sheetH }];
  }

  public findPosition(
    itemW: number,
    itemH: number,
    canRotate: boolean,
    heuristic: 'bottom-left' | 'best-short-side' | 'best-area' = 'bottom-left'
  ): { x: number; y: number; w: number; h: number; rot: boolean } | null {
    let bestScore1 = Infinity;
    let bestScore2 = Infinity;
    let bestNode: { x: number; y: number; w: number; h: number; rot: boolean } | null = null;

    for (const free of this.freeRectangles) {
      // 1. Check normal orientation
      if (free.w >= itemW && free.h >= itemH && free.x + itemW <= this.sheetW && free.y + itemH <= this.sheetH) {
        let score1 = 0;
        let score2 = 0;

        if (heuristic === 'bottom-left') {
          score1 = free.y + itemH;
          score2 = free.x;
        } else if (heuristic === 'best-short-side') {
          const leftoverW = Math.abs(free.w - itemW);
          const leftoverH = Math.abs(free.h - itemH);
          score1 = Math.min(leftoverW, leftoverH);
          score2 = Math.max(leftoverW, leftoverH);
        } else {
          score1 = free.w * free.h - itemW * itemH;
          score2 = free.y;
        }

        if (score1 < bestScore1 || (score1 === bestScore1 && score2 < bestScore2)) {
          bestScore1 = score1;
          bestScore2 = score2;
          bestNode = {
            x: free.x,
            y: free.y,
            w: itemW,
            h: itemH,
            rot: false,
          };
        }
      }

      // 2. Check rotated orientation
      if (canRotate && free.w >= itemH && free.h >= itemW && free.x + itemH <= this.sheetW && free.y + itemW <= this.sheetH) {
        let score1 = 0;
        let score2 = 0;

        if (heuristic === 'bottom-left') {
          score1 = free.y + itemW;
          score2 = free.x;
        } else if (heuristic === 'best-short-side') {
          const leftoverW = Math.abs(free.w - itemH);
          const leftoverH = Math.abs(free.h - itemW);
          score1 = Math.min(leftoverW, leftoverH);
          score2 = Math.max(leftoverW, leftoverH);
        } else {
          score1 = free.w * free.h - itemH * itemW;
          score2 = free.y;
        }

        if (score1 < bestScore1 || (score1 === bestScore1 && score2 < bestScore2)) {
          bestScore1 = score1;
          bestScore2 = score2;
          bestNode = {
            x: free.x,
            y: free.y,
            w: itemH,
            h: itemW,
            rot: true,
          };
        }
      }
    }

    return bestNode;
  }

  public placeRect(rect: { x: number; y: number; w: number; h: number; rot: boolean }, item: PackItem, sheetIndex: number): void {
    const totalW = Math.min(rect.w + this.padding, this.sheetW - rect.x);
    const totalH = Math.min(rect.h + this.padding, this.sheetH - rect.y);
    const placeBox = { x: rect.x, y: rect.y, w: totalW, h: totalH };

    const newFree: Rect[] = [];

    for (const free of this.freeRectangles) {
      if (!this.isOverlapping(free, placeBox)) {
        newFree.push(free);
        continue;
      }

      // Split into sub-rectangles
      // Top slice
      if (placeBox.y > free.y && placeBox.y < free.y + free.h) {
        newFree.push({
          x: free.x,
          y: free.y,
          w: free.w,
          h: placeBox.y - free.y,
        });
      }
      // Bottom slice
      if (placeBox.y + placeBox.h < free.y + free.h) {
        newFree.push({
          x: free.x,
          y: placeBox.y + placeBox.h,
          w: free.w,
          h: free.y + free.h - (placeBox.y + placeBox.h),
        });
      }
      // Left slice
      if (placeBox.x > free.x && placeBox.x < free.x + free.w) {
        newFree.push({
          x: free.x,
          y: free.y,
          w: placeBox.x - free.x,
          h: free.h,
        });
      }
      // Right slice
      if (placeBox.x + placeBox.w < free.x + free.w) {
        newFree.push({
          x: placeBox.x + placeBox.w,
          y: free.y,
          w: free.x + free.w - (placeBox.x + placeBox.w),
          h: free.h,
        });
      }
    }

    this.freeRectangles = this.pruneFreeList(newFree);

    this.placedItems.push({
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      id: item.id,
      rot: rect.rot,
      sheetIndex: sheetIndex,
      tabId: item.tabId,
      tabName: item.tabName,
      shape: item.shape,
      cornerRadius: item.cornerRadius,
      sourceImage: item.sourceImage,
      vectorMaskResult: item.vectorMaskResult,
      customSvgData: item.customSvgData,
      color: item.color,
    });
  }

  private isOverlapping(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private pruneFreeList(rects: Rect[]): Rect[] {
    const result: Rect[] = [];
    for (let i = 0; i < rects.length; i++) {
      const a = rects[i];
      if (a.w <= 0.5 || a.h <= 0.5) continue;
      let isContained = false;
      for (let j = 0; j < rects.length; j++) {
        if (i === j) continue;
        const b = rects[j];
        if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
          isContained = true;
          break;
        }
      }
      if (!isContained) {
        result.push(a);
      }
    }
    return result;
  }
}

/**
 * Sequential 2D MaxRects bin packing preserving Layer A -> B -> C order
 * and intelligently inserting items into any open pocket or free rectangular space
 */
function maxRectsPackSequential(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowRotation: boolean = true,
  allowMultiSheet: boolean = true,
  heuristic: 'bottom-left' | 'best-short-side' | 'best-area' = 'bottom-left'
): { items: PackedItem[]; totalSheets: number; skipped: number } {
  const sheets: MaxRectsSheetPacker[] = [new MaxRectsSheetPacker(sheetW, sheetH, padding)];
  let skipped = 0;

  for (const item of items) {
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(item.shape || '');
    const canRotate = allowRotation && !isSpecialShape;

    let placed = false;

    // Check existing sheets (from sheet 0 to current active sheet to fill all pockets)
    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      const sheet = sheets[sIdx];
      const pos = sheet.findPosition(item.w, item.h, canRotate, heuristic);
      if (pos) {
        sheet.placeRect(pos, item, sIdx);
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (allowMultiSheet) {
        const newSheet = new MaxRectsSheetPacker(sheetW, sheetH, padding);
        const sIdx = sheets.length;
        const pos = newSheet.findPosition(item.w, item.h, canRotate, heuristic);
        if (pos) {
          newSheet.placeRect(pos, item, sIdx);
          sheets.push(newSheet);
          placed = true;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
  }

  const allPlaced: PackedItem[] = [];
  sheets.forEach(s => allPlaced.push(...s.placedItems));

  return { items: allPlaced, totalSheets: sheets.length, skipped };
}

/**
 * Main entry: pack multiple items of different sizes onto sheets
 * Returns multiple plan options, with 2D Insertion-point (MaxRects) packing as top priority
 */
export function packMultiSize(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowMultiSheet: boolean = true
): PackResult[] {
  if (items.length === 0) return [];

  const results: PackResult[] = [];

  // Plan 1: Điểm chèn tối ưu 2D (A→B→C + Lấp đầy khoảng trống) (Ưu tiên số 1: Tận dụng mọi khe hở, không lãng phí giấy)
  const p1 = maxRectsPackSequential(items, sheetW, sheetH, padding, true, allowMultiSheet, 'bottom-left');
  if (p1.items.length > 0) {
    results.push({
      name: 'Điểm chèn tối ưu 2D (A→B→C + Lấp đầy khoảng trống)',
      items: p1.items,
      totalSheets: p1.totalSheets,
      skipped: p1.skipped
    });
  }

  // Plan 2: Điểm chèn khít cạnh 2D (A→B→C + Xoay tối ưu)
  const p2 = maxRectsPackSequential(items, sheetW, sheetH, padding, true, allowMultiSheet, 'best-short-side');
  if (p2.items.length > 0) {
    results.push({
      name: 'Điểm chèn khít cạnh 2D (A→B→C + Xoay tối ưu)',
      items: p2.items,
      totalSheets: p2.totalSheets,
      skipped: p2.skipped
    });
  }

  // Plan 3: Điểm chèn 2D (A→B→C) + Giữ nguyên hướng
  const p3 = maxRectsPackSequential(items, sheetW, sheetH, padding, false, allowMultiSheet, 'bottom-left');
  if (p3.items.length > 0) {
    results.push({
      name: 'Điểm chèn 2D (A→B→C) + Giữ nguyên hướng',
      items: p3.items,
      totalSheets: p3.totalSheets,
      skipped: p3.skipped
    });
  }

  // Plan 4: Hàng chuẩn theo từng Layer (A→B→C)
  const p4 = shelfPackLayerByLayer(items, sheetW, sheetH, padding, true, allowMultiSheet);
  if (p4.items.length > 0) {
    results.push({
      name: 'Hàng chuẩn theo Layer (A→B→C)',
      items: p4.items,
      totalSheets: p4.totalSheets,
      skipped: p4.skipped
    });
  }

  // Plan 5: Tự do tối đa tem (Xếp tự do 2D)
  const sortedFree = [...items].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const p5 = maxRectsPackSequential(sortedFree, sheetW, sheetH, padding, true, allowMultiSheet, 'best-short-side');
  if (p5.items.length > 0) {
    results.push({
      name: 'Tự do tối đa tem (Xếp tự do 2D)',
      items: p5.items,
      totalSheets: p5.totalSheets,
      skipped: p5.skipped
    });
  }

  // Deduplicate results
  const unique: PackResult[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const key = `${r.items.length}-${r.totalSheets}-${r.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  return unique;
}


