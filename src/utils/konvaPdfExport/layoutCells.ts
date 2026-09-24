import { PdfLayoutCell } from './types';

export function _pdfGrid(
  sheetW: number, sheetH: number,
  w: number, h: number,
  mT: number, mL: number,
  gH: number, gV: number,
  rot: number
): PdfLayoutCell[] {
  const bw = rot === 90 || rot === 270 ? h : w;
  const bh = rot === 90 || rot === 270 ? w : h;
  const uW = sheetW - mL * 2, uH = sheetH - mT * 2;
  const cols = Math.max(1, Math.floor((uW + gH) / (bw + gH)));
  const rows = Math.max(1, Math.floor((uH + gV) / (bh + gV)));
  const gw = cols * bw + (cols - 1) * gH;
  const gh = rows * bh + (rows - 1) * gV;
  const ox = (sheetW - gw) / 2, oy = (sheetH - gh) / 2;
  const c: PdfLayoutCell[] = [];
  for (let r = 0; r < rows; r++)
    for (let cc = 0; cc < cols; cc++)
      c.push({ x: ox + cc * (bw + gH), y: oy + r * (bh + gV), w, h, rotate: rot });
  return c;
}

export function computePdfLayoutCells(
  sheetW: number, sheetH: number,
  itemW: number, itemH: number,
  mT: number, mL: number,
  gH: number, gV: number,
  mode: string, shape: string
): PdfLayoutCell[] {
  const effW = shape === 'circle' ? Math.min(itemW, itemH) : itemW;
  const effH = shape === 'circle' ? Math.min(itemW, itemH) : itemH;
  const uW = sheetW - mL * 2, uH = sheetH - mT * 2;
  const bw90 = effH, bh90 = effW;

  if (mode === 'grid')
    return _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);

  if (mode === 'gridH') {
    const colsN = Math.max(1, Math.floor((uW + gH) / (effW + gH)));
    const colsR = Math.max(1, Math.floor((uW + gH) / (bw90 + gH)));
    const gwN = colsN * effW + (colsN - 1) * gH;
    const gwR = colsR * bw90 + (colsR - 1) * gH;
    // Pass 1: compute total height
    let totalH = 0;
    const rowInfo: { h: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const rh = !isRot ? effH : bh90;
      if (totalH + (rowInfo.length > 0 ? gV : 0) + rh > uH + 0.01) break;
      totalH += (rowInfo.length > 0 ? gV : 0) + rh;
      rowInfo.push({ h: rh, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: PdfLayoutCell[] = [];
    let cy = (sheetH - totalH) / 2;
    for (const row of rowInfo) {
      if (!row.rot) {
        const ox = (sheetW - gwN) / 2;
        for (let c = 0; c < colsN; c++)
          cells.push({ x: ox + c * (effW + gH), y: cy, w: effW, h: effH, rotate: 0 });
      } else {
        const ox = (sheetW - gwR) / 2;
        for (let c = 0; c < colsR; c++)
          cells.push({ x: ox + c * (bw90 + gH), y: cy, w: effW, h: effH, rotate: 90 });
      }
      cy += row.h + gV;
    }
    const plain = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  if (mode === 'gridV') {
    const rowsN = Math.max(1, Math.floor((uH + gV) / (effH + gV)));
    const rowsR = Math.max(1, Math.floor((uH + gV) / (bh90 + gV)));
    const ghN = rowsN * effH + (rowsN - 1) * gV;
    const ghR = rowsR * bh90 + (rowsR - 1) * gV;
    // Pass 1: compute total width
    let totalW = 0;
    const colInfo: { w: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const cw = !isRot ? effW : bw90;
      if (totalW + (colInfo.length > 0 ? gH : 0) + cw > uW + 0.01) break;
      totalW += (colInfo.length > 0 ? gH : 0) + cw;
      colInfo.push({ w: cw, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: PdfLayoutCell[] = [];
    let cx = (sheetW - totalW) / 2;
    for (const col of colInfo) {
      if (!col.rot) {
        const oy = (sheetH - ghN) / 2;
        for (let r = 0; r < rowsN; r++)
          cells.push({ x: cx, y: oy + r * (effH + gV), w: effW, h: effH, rotate: 0 });
      } else {
        const oy = (sheetH - ghR) / 2;
        for (let r = 0; r < rowsR; r++)
          cells.push({ x: cx, y: oy + r * (bh90 + gV), w: effW, h: effH, rotate: 90 });
      }
      cx += col.w + gH;
    }
    const plain = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  if (mode === 'brick') {
    const cols = Math.max(1, Math.floor((uW + gH) / (effW + gH)));
    const rows = Math.max(1, Math.floor((uH + gV) / (effH + gV)));
    const gw = cols * effW + (cols - 1) * gH;
    const oy = (sheetH - (rows * effH + (rows - 1) * gV)) / 2;
    const ox = (sheetW - gw) / 2;
    const half = (effW + gH) / 2;
    const cells: PdfLayoutCell[] = [];
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 === 1 ? half : 0;
      for (let c = 0; ; c++) {
        const cx = ox + shift + c * (effW + gH);
        if (cx + effW > sheetW - mL + 0.01) break;
        if (cx < mL - 0.01) continue;
        cells.push({ x: cx, y: oy + r * (effH + gV), w: effW, h: effH, rotate: 0 });
      }
    }
    return cells;
  }

  if (mode === 'rotateAlt') {
    const cols = Math.max(1, Math.floor((uW + gH) / (effW + gH)));
    const rows = Math.max(1, Math.floor((uH + gV) / (effH + gV)));
    const gw = cols * effW + (cols - 1) * gH;
    const gh = rows * effH + (rows - 1) * gV;
    const ox = (sheetW - gw) / 2, oy = (sheetH - gh) / 2;
    const cells: PdfLayoutCell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells.push({ x: ox + c * (effW + gH), y: oy + r * (effH + gV), w: effW, h: effH, rotate: (r + c) % 2 === 1 ? 180 : 0 });
    return cells;
  }

  if (mode === 'nesting') {
    const pairW = effW + gH + bw90;
    const maxBH = Math.max(effH, bh90);
    const pairCols = Math.max(1, Math.floor((uW + gH) / (pairW + gH)));
    const pairRows = Math.max(1, Math.floor((uH + gV) / (maxBH + gV)));
    const gwA = pairCols * pairW + (pairCols - 1) * gH;
    const ghA = pairRows * maxBH + (pairRows - 1) * gV;
    const oxA = (sheetW - gwA) / 2, oyA = (sheetH - ghA) / 2;
    const cellsA: PdfLayoutCell[] = [];
    for (let r = 0; r < pairRows; r++)
      for (let pc = 0; pc < pairCols; pc++) {
        const bx = oxA + pc * (pairW + gH);
        const cy = oyA + r * (maxBH + gV);
        cellsA.push({ x: bx, y: cy + (maxBH - effH) / 2, w: effW, h: effH, rotate: 0 });
        cellsA.push({ x: bx + effW + gH, y: cy + (maxBH - bh90) / 2, w: effW, h: effH, rotate: 90 });
      }
    const plainN = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
    const plainR = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 90);
    return [cellsA, plainN, plainR].reduce((a, b) => b.length > a.length ? b : a);
  }

  if (mode === 'auto') {
    const modes = ['grid', 'gridH', 'gridV', 'brick', 'rotateAlt', 'nesting'];
    let best: PdfLayoutCell[] = [];
    for (const m of modes) {
      const c = computePdfLayoutCells(sheetW, sheetH, itemW, itemH, mT, mL, gH, gV, m, shape);
      if (c.length > best.length) best = c;
    }
    return best;
  }

  return _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
}
