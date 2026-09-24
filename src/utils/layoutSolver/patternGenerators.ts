import { PlanItem } from './types';

/**
 * Fill a rectangular area with items in straight grid
 */
export function fillGrid(
  x: number,
  y: number,
  w: number,
  h: number,
  rot: boolean,
  iW: number,
  iH: number
): PlanItem[] {
  const itemW = rot ? iH : iW;
  const itemH = rot ? iW : iH;

  if (itemW > w || itemH > h) {
    return [];
  }

  const cols = Math.floor(w / itemW);
  const rows = Math.floor(h / itemH);
  const items: PlanItem[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({
        x: x + c * itemW,
        y: y + r * itemH,
        w: itemW,
        h: itemH,
        rot: rot,
      });
    }
  }

  return items;
}

/**
 * Fill with staggered (honeycomb) pattern for circles
 */
export function fillStaggered(printW: number, printH: number, D: number): PlanItem[] {
  const rowH = D * 0.866025; // sqrt(3)/2
  const items: PlanItem[] = [];
  let y = 0;
  let r = 0;

  while (y + D <= printH) {
    const offX = r % 2 === 0 ? 0 : D / 2;
    let x = offX;

    while (x + D <= printW) {
      items.push({
        x: x,
        y: y,
        w: D,
        h: D,
        rot: false,
      });
      x += D;
    }

    y += rowH;
    r++;
  }

  return items;
}

/**
 * Fill with honeycomb pattern for hexagons
 */
export function fillHexagonHoneycomb(printW: number, printH: number, iW: number, iH: number): PlanItem[] {
  const items: PlanItem[] = [];
  const rowH = iH * 0.75; 
  let y = 0;
  let r = 0;

  while (y + iH <= printH) {
    const offX = r % 2 === 0 ? 0 : iW * 0.5;
    let x = offX;

    while (x + iW <= printW) {
      items.push({
        x: x,
        y: y,
        w: iW,
        h: iH,
        rot: false,
      });
      x += iW;
    }

    y += rowH;
    r++;
  }

  return items;
}

/**
 * Fill with alternating triangles (point up/down)
 */
export function fillTriangleAlternating(
  printW: number,
  printH: number,
  iW: number,
  iH: number,
  padding: number
): PlanItem[] {
  const items: PlanItem[] = [];
  const effectiveW = (iW - padding) * 0.5 + padding;
  let y = 0;

  while (y + iH <= printH) {
    let x = 0;
    let col = 0;

    while (x + iW <= printW) {
      items.push({
        x: x,
        y: y,
        w: iW,
        h: iH,
        rot: col % 2 === 1,
      });
      x += effectiveW;
      col++;
    }

    y += iH;
  }

  return items;
}

/**
 * Fill with alternating trapezoids (wide/narrow)
 */
export function fillTrapezoidAlternating(printW: number, printH: number, iW: number, iH: number): PlanItem[] {
  const items: PlanItem[] = [];
  let y = 0;
  while (y + iH <= printH) {
    let x = 0;
    let col = 0;
    while (x + iW <= printW) {
      items.push({
        x: x,
        y: y,
        w: iW,
        h: iH,
        rot: col % 2 === 1,
      });
      x += iW;
      col++;
    }
    y += iH;
  }
  return items;
}

/**
 * Flip alternating (180°) - generic pattern
 */
export function fillGenericFlipped(printW: number, printH: number, iW: number, iH: number): PlanItem[] {
  const items: PlanItem[] = [];
  const cols = Math.floor(printW / iW);
  const rows = Math.floor(printH / iH);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({
        x: c * iW,
        y: r * iH,
        w: iW,
        h: iH,
        rot: false,
        flipped: r % 2 === 1,
      });
    }
  }
  return items;
}

/**
 * Generic staggered pattern
 */
export function fillGenericStaggered(printW: number, printH: number, iW: number, iH: number): PlanItem[] {
  const items: PlanItem[] = [];
  const cols = Math.floor(printW / iW);
  const rows = Math.floor(printH / iH);
  for (let r = 0; r < rows; r++) {
    const offX = r % 2 === 1 ? iW / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = offX + c * iW;
      if (x + iW <= printW) {
        items.push({ x, y: r * iH, w: iW, h: iH, rot: false });
      }
    }
  }
  return items;
}

/**
 * Rotated 45° diamond pattern
 */
export function fillRotated45(
  printW: number,
  printH: number,
  origW: number,
  origH: number,
  padding: number
): PlanItem[] {
  const diag = Math.sqrt(origW * origW + origH * origH);
  const bbW = diag + padding;
  const bbH = diag + padding;
  const cols = Math.floor(printW / bbW);
  const rows = Math.floor(printH / bbH);
  if (cols <= 0 || rows <= 0) return [];

  const items: PlanItem[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({
        x: c * bbW,
        y: r * bbH,
        w: bbW,
        h: bbH,
        rot: false,
        rot45: true,
      });
    }
  }
  return items;
}
