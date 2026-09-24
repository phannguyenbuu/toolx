import { Rect, PackItem, PackedItem } from './types';

/**
 * 2D Maximal Rectangles Bin Packer (MaxRects)
 * Tracks all available free rectangular spaces on a sheet and inserts items
 * at optimal points (top-to-bottom, left-to-right, filling every pocket)
 */
export class MaxRectsSheetPacker {
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
      const neededWNormal = itemW + (free.x + itemW < this.sheetW ? this.padding : 0);
      const neededHNormal = itemH + (free.y + itemH < this.sheetH ? this.padding : 0);

      if (free.w >= neededWNormal && free.h >= neededHNormal && free.x + itemW <= this.sheetW && free.y + itemH <= this.sheetH) {
        let score1 = 0;
        let score2 = 0;

        if (heuristic === 'bottom-left') {
          score1 = free.y + itemH;
          score2 = free.x;
        } else if (heuristic === 'best-short-side') {
          const leftoverW = Math.abs(free.w - neededWNormal);
          const leftoverH = Math.abs(free.h - neededHNormal);
          score1 = Math.min(leftoverW, leftoverH);
          score2 = Math.max(leftoverW, leftoverH);
        } else {
          score1 = free.w * free.h - neededWNormal * neededHNormal;
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
      if (canRotate) {
        const neededWRot = itemH + (free.x + itemH < this.sheetW ? this.padding : 0);
        const neededHRot = itemW + (free.y + itemH < this.sheetH ? this.padding : 0);

        if (free.w >= neededWRot && free.h >= neededHRot && free.x + itemH <= this.sheetW && free.y + itemH <= this.sheetH) {
          let score1 = 0;
          let score2 = 0;

          if (heuristic === 'bottom-left') {
            score1 = free.y + itemW;
            score2 = free.x;
          } else if (heuristic === 'best-short-side') {
            const leftoverW = Math.abs(free.w - neededWRot);
            const leftoverH = Math.abs(free.h - neededHRot);
            score1 = Math.min(leftoverW, leftoverH);
            score2 = Math.max(leftoverW, leftoverH);
          } else {
            score1 = free.w * free.h - neededWRot * neededHRot;
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
    }

    return bestNode;
  }

  public placeRect(rect: { x: number; y: number; w: number; h: number; rot: boolean }, item: PackItem, sheetIndex: number): void {
    const totalW = Math.min(rect.w + (rect.x + rect.w < this.sheetW ? this.padding : 0), this.sheetW - rect.x);
    const totalH = Math.min(rect.h + (rect.y + rect.h < this.sheetH ? this.padding : 0), this.sheetH - rect.y);
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
      if (placeBox.y + placeBox.h < free.y + free.h && placeBox.y + placeBox.h > free.y) {
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
      if (placeBox.x + placeBox.w < free.x + free.w && placeBox.x + placeBox.w > free.x) {
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
