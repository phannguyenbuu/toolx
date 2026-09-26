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
  itemW: number,
  itemH: number,
  padding: number = 0
): PlanItem[] {
  const slotW = rot ? itemH : itemW;
  const slotH = rot ? itemW : itemH;

  if (slotW > w || slotH > h) {
    return [];
  }

  const stepX = slotW + padding;
  const stepY = slotH + padding;
  const cols = Math.floor((w + padding) / stepX);
  const rows = Math.floor((h + padding) / stepY);
  const items: PlanItem[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({
        x: x + c * stepX,
        y: y + r * stepY,
        w: slotW,
        h: slotH,
        rot: rot,
      });
    }
  }

  return items;
}

/**
 * Fill with staggered (honeycomb) pattern for circles
 */
export function fillStaggered(
  printW: number,
  printH: number,
  D: number,
  padding: number = 0
): PlanItem[] {
  const stepX = D + padding;
  const rowH = stepX * 0.866025; // sqrt(3)/2
  const items: PlanItem[] = [];
  let y = 0;
  let r = 0;

  while (y + D <= printH) {
    const offX = r % 2 === 0 ? 0 : stepX / 2;
    let x = offX;

    while (x + D <= printW) {
      items.push({
        x: x,
        y: y,
        w: D,
        h: D,
        rot: false,
      });
      x += stepX;
    }

    y += rowH;
    r++;
  }

  return items;
}

/**
 * Fill with honeycomb pattern for hexagons
 */
export function fillHexagonHoneycomb(
  printW: number,
  printH: number,
  itemW: number,
  itemH: number,
  padding: number = 0
): PlanItem[] {
  const items: PlanItem[] = [];
  const stepX = itemW + padding;
  const stepH = itemH + padding;
  const rowH = stepH * 0.75; 
  let y = 0;
  let r = 0;

  while (y + itemH <= printH) {
    const offX = r % 2 === 0 ? 0 : stepX * 0.5;
    let x = offX;

    while (x + itemW <= printW) {
      items.push({
        x: x,
        y: y,
        w: itemW,
        h: itemH,
        rot: false,
      });
      x += stepX;
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
  itemW: number,
  itemH: number,
  padding: number = 0
): PlanItem[] {
  const items: PlanItem[] = [];
  const stepX = (itemW + padding) * 0.5;
  const stepY = itemH + padding;
  let y = 0;

  while (y + itemH <= printH) {
    let x = 0;
    let col = 0;

    while (x + itemW <= printW) {
      items.push({
        x: x,
        y: y,
        w: itemW,
        h: itemH,
        rot: col % 2 === 1,
      });
      x += stepX;
      col++;
    }

    y += stepY;
  }

  return items;
}

/**
 * Fill with alternating trapezoids (wide/narrow)
 */
export function fillTrapezoidAlternating(
  printW: number,
  printH: number,
  itemW: number,
  itemH: number,
  padding: number = 0
): PlanItem[] {
  const items: PlanItem[] = [];
  const stepX = itemW + padding;
  const stepY = itemH + padding;
  let y = 0;
  while (y + itemH <= printH) {
    let x = 0;
    let col = 0;
    while (x + itemW <= printW) {
      items.push({
        x: x,
        y: y,
        w: itemW,
        h: itemH,
        rot: col % 2 === 1,
      });
      x += stepX;
      col++;
    }
    y += stepY;
  }
  return items;
}

/**
 * Flip alternating (180°) - generic pattern
 */
export function fillGenericFlipped(
  printW: number,
  printH: number,
  itemW: number,
  itemH: number,
  padding: number = 0
): PlanItem[] {
  const items: PlanItem[] = [];
  const stepX = itemW + padding;
  const stepY = itemH + padding;
  const cols = Math.floor((printW + padding) / stepX);
  const rows = Math.floor((printH + padding) / stepY);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({
        x: c * stepX,
        y: r * stepY,
        w: itemW,
        h: itemH,
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
export function fillGenericStaggered(
  printW: number,
  printH: number,
  itemW: number,
  itemH: number,
  padding: number = 0
): PlanItem[] {
  const items: PlanItem[] = [];
  const stepX = itemW + padding;
  const stepY = itemH + padding;
  const cols = Math.floor((printW + padding) / stepX);
  const rows = Math.floor((printH + padding) / stepY);
  for (let r = 0; r < rows; r++) {
    const offX = r % 2 === 1 ? stepX / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = offX + c * stepX;
      if (x + itemW <= printW) {
        items.push({ x, y: r * stepY, w: itemW, h: itemH, rot: false });
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
  itemW: number,
  itemH: number,
  padding: number = 0
): PlanItem[] {
  const diag = Math.sqrt(itemW * itemW + itemH * itemH);
  const step = diag + padding;
  const cols = Math.floor((printW + padding) / step);
  const rows = Math.floor((printH + padding) / step);
  if (cols <= 0 || rows <= 0) return [];

  const items: PlanItem[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * step + diag / 2;
      const cy = r * step + diag / 2;
      items.push({
        x: cx - itemW / 2,
        y: cy - itemH / 2,
        w: itemW,
        h: itemH,
        rot: false,
        rot45: true,
      });
    }
  }
  return items;
}
