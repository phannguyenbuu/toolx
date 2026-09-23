import { LayoutCell, LayoutMode } from './types';

// Helper: simple grid layout returning cells
export function _gridCells(
  sheetW: number, sheetH: number,
  w: number, h: number,
  mT: number, mL: number,
  gH: number, gV: number,
  rot: number
): LayoutCell[] {
  // bounding box after rotation
  const bw = rot === 90 || rot === 270 ? h : w;
  const bh = rot === 90 || rot === 270 ? w : h;
  const usableW = sheetW - mL * 2;
  const usableH = sheetH - mT * 2;
  const cols = Math.max(1, Math.floor((usableW + gH) / (bw + gH)));
  const rows = Math.max(1, Math.floor((usableH + gV) / (bh + gV)));
  const gw = cols * bw + (cols - 1) * gH;
  const gh = rows * bh + (rows - 1) * gV;
  const ox = (sheetW - gw) / 2;
  const oy = (sheetH - gh) / 2;
  const cells: LayoutCell[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ x: ox + c * (bw + gH), y: oy + r * (bh + gV), w, h, rotate: rot });
  return cells;
}

// Calculate layout cells for all modes
// Cell w/h = ORIGINAL item size (before rotation). x/y = bounding box top-left.
export function computeLayoutCells(
  sheetW: number, sheetH: number,
  itemW: number, itemH: number,
  marginTop: number, marginLeft: number,
  gapH: number, gapV: number,
  mode: LayoutMode, shape: 'rect' | 'circle'
): LayoutCell[] {
  const effW = shape === 'circle' ? Math.min(itemW, itemH) : itemW;
  const effH = shape === 'circle' ? Math.min(itemW, itemH) : itemH;
  const usableW = sheetW - marginLeft * 2;
  const usableH = sheetH - marginTop * 2;
  // bounding box of 90° rotated item
  const bw90 = effH, bh90 = effW;

  // --- grid ---
  if (mode === 'grid') {
    return _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
  }

  // --- gridH: alternate rows normal / 90° ---
  if (mode === 'gridH') {
    const colsN = Math.max(1, Math.floor((usableW + gapH) / (effW + gapH)));
    const colsR = Math.max(1, Math.floor((usableW + gapH) / (bw90 + gapH)));
    const gwN = colsN * effW + (colsN - 1) * gapH;
    const gwR = colsR * bw90 + (colsR - 1) * gapH;
    // Pass 1: compute total height
    let totalH = 0;
    const rowHeights: { h: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const rh = !isRot ? effH : bh90;
      if (totalH + (rowHeights.length > 0 ? gapV : 0) + rh > usableH + 0.01) break;
      totalH += (rowHeights.length > 0 ? gapV : 0) + rh;
      rowHeights.push({ h: rh, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: LayoutCell[] = [];
    let cy = (sheetH - totalH) / 2;
    for (const row of rowHeights) {
      if (!row.rot) {
        const ox = (sheetW - gwN) / 2;
        for (let c = 0; c < colsN; c++)
          cells.push({ x: ox + c * (effW + gapH), y: cy, w: effW, h: effH, rotate: 0 });
      } else {
        const ox = (sheetW - gwR) / 2;
        for (let c = 0; c < colsR; c++)
          cells.push({ x: ox + c * (bw90 + gapH), y: cy, w: effW, h: effH, rotate: 90 });
      }
      cy += row.h + gapV;
    }
    const plain = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  // --- gridV: alternate cols normal / 90° ---
  if (mode === 'gridV') {
    const rowsN = Math.max(1, Math.floor((usableH + gapV) / (effH + gapV)));
    const rowsR = Math.max(1, Math.floor((usableH + gapV) / (bh90 + gapV)));
    const ghN = rowsN * effH + (rowsN - 1) * gapV;
    const ghR = rowsR * bh90 + (rowsR - 1) * gapV;
    // Pass 1: compute total width
    let totalW = 0;
    const colWidths: { w: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const cw = !isRot ? effW : bw90;
      if (totalW + (colWidths.length > 0 ? gapH : 0) + cw > usableW + 0.01) break;
      totalW += (colWidths.length > 0 ? gapH : 0) + cw;
      colWidths.push({ w: cw, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: LayoutCell[] = [];
    let cx = (sheetW - totalW) / 2;
    for (const col of colWidths) {
      if (!col.rot) {
        const oy = (sheetH - ghN) / 2;
        for (let r = 0; r < rowsN; r++)
          cells.push({ x: cx, y: oy + r * (effH + gapV), w: effW, h: effH, rotate: 0 });
      } else {
        const oy = (sheetH - ghR) / 2;
        for (let r = 0; r < rowsR; r++)
          cells.push({ x: cx, y: oy + r * (bh90 + gapV), w: effW, h: effH, rotate: 90 });
      }
      cx += col.w + gapH;
    }
    const plain = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  // --- brick ---
  if (mode === 'brick') {
    const cols = Math.max(1, Math.floor((usableW + gapH) / (effW + gapH)));
    const rows = Math.max(1, Math.floor((usableH + gapV) / (effH + gapV)));
    const gw = cols * effW + (cols - 1) * gapH;
    const oy = (sheetH - (rows * effH + (rows - 1) * gapV)) / 2;
    const ox = (sheetW - gw) / 2;
    const halfShift = (effW + gapH) / 2;
    const cells: LayoutCell[] = [];
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 === 1 ? halfShift : 0;
      for (let c = 0; ; c++) {
        const cx = ox + shift + c * (effW + gapH);
        if (cx + effW > sheetW - marginLeft + 0.01) break;
        if (cx < marginLeft - 0.01) continue;
        cells.push({ x: cx, y: oy + r * (effH + gapV), w: effW, h: effH, rotate: 0 });
      }
    }
    return cells;
  }

  // --- rotateAlt: checkerboard 180° ---
  if (mode === 'rotateAlt') {
    const cols = Math.max(1, Math.floor((usableW + gapH) / (effW + gapH)));
    const rows = Math.max(1, Math.floor((usableH + gapV) / (effH + gapV)));
    const gw = cols * effW + (cols - 1) * gapH;
    const gh = rows * effH + (rows - 1) * gapV;
    const ox = (sheetW - gw) / 2;
    const oy = (sheetH - gh) / 2;
    const cells: LayoutCell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells.push({ x: ox + c * (effW + gapH), y: oy + r * (effH + gapV), w: effW, h: effH, rotate: (r + c) % 2 === 1 ? 180 : 0 });
    return cells;
  }

  // --- nesting: pairs normal+90° side by side ---
  if (mode === 'nesting') {
    const pairW = effW + gapH + bw90;
    const pairCols = Math.max(1, Math.floor((usableW + gapH) / (pairW + gapH)));
    const maxBH = Math.max(effH, bh90);
    const pairRows = Math.max(1, Math.floor((usableH + gapV) / (maxBH + gapV)));
    const gwA = pairCols * pairW + (pairCols - 1) * gapH;
    const ghA = pairRows * maxBH + (pairRows - 1) * gapV;
    const oxA = (sheetW - gwA) / 2;
    const oyA = (sheetH - ghA) / 2;
    const cellsA: LayoutCell[] = [];
    for (let r = 0; r < pairRows; r++) {
      for (let pc = 0; pc < pairCols; pc++) {
        const bx = oxA + pc * (pairW + gapH);
        const cy = oyA + r * (maxBH + gapV);
        cellsA.push({ x: bx, y: cy + (maxBH - effH) / 2, w: effW, h: effH, rotate: 0 });
        cellsA.push({ x: bx + effW + gapH, y: cy + (maxBH - bh90) / 2, w: effW, h: effH, rotate: 90 });
      }
    }
    const plainN = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
    const plainR = _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 90);
    return [cellsA, plainN, plainR].reduce((a, b) => b.length > a.length ? b : a);
  }

  // --- auto ---
  if (mode === 'auto') {
    const modes: LayoutMode[] = ['grid', 'gridH', 'gridV', 'brick', 'rotateAlt', 'nesting'];
    let best: LayoutCell[] = [];
    for (const m of modes) {
      const c = computeLayoutCells(sheetW, sheetH, itemW, itemH, marginTop, marginLeft, gapH, gapV, m, shape);
      if (c.length > best.length) best = c;
    }
    return best;
  }

  // fallback
  return _gridCells(sheetW, sheetH, effW, effH, marginTop, marginLeft, gapH, gapV, 0);
}
