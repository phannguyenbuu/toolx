import {
  PDFDocument,
  rgb,
  StandardFonts,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  rotateDegrees
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { MM_TO_PT, SheetExportOptions, hexToRgb } from './types';
import { computePdfLayoutCells } from './layoutCells';
import { loadDefaultVietnameseFont, loadFontBytes } from './fontManager';

export async function exportKonvaToSheetPdf(options: SheetExportOptions): Promise<Uint8Array> {
  const {
    pageWidthMm, pageHeightMm, sheetWidthMm, sheetHeightMm,
    shape, layoutMode, marginTopMm, marginLeftMm, gapHMm, gapVMm,
    useCropMark, cropLenMm, cropDistMm, cropThickPt, cropColor,
    pages, background,
  } = options;

  const itemW = shape === 'circle' ? Math.min(pageWidthMm, pageHeightMm) : pageWidthMm;
  const itemH = shape === 'circle' ? Math.min(pageWidthMm, pageHeightMm) : pageHeightMm;

  const layoutCells = computePdfLayoutCells(
    sheetWidthMm, sheetHeightMm, itemW, itemH,
    marginTopMm, marginLeftMm, gapHMm, gapVMm,
    layoutMode || 'grid', shape
  );
  const perSheet = layoutCells.length;

  const sheetWPt = sheetWidthMm * MM_TO_PT;
  const sheetHPt = sheetHeightMm * MM_TO_PT;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Pre-embed default font
  let defaultFont: any;
  const defaultFontBytes = await loadDefaultVietnameseFont();
  try {
    defaultFont = defaultFontBytes
      ? await pdfDoc.embedFont(defaultFontBytes)
      : await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch {
    defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const fontCache = new Map<string, any>();
  const imageCache = new Map<string, any>();

  // Parse crop color
  const cropRgb = hexToRgb(cropColor || '#000000');
  const cropColorRgb = rgb(cropRgb.r, cropRgb.g, cropRgb.b);
  const cropLenPt = cropLenMm * MM_TO_PT;
  const cropDistPt = cropDistMm * MM_TO_PT;

  const numSheets = Math.ceil(pages.length / perSheet);

  for (let s = 0; s < numSheets; s++) {
    const sheetPage = pdfDoc.addPage([sheetWPt, sheetHPt]);

    for (let i = 0; i < perSheet; i++) {
      const pageIdx = s * perSheet + i;
      if (pageIdx >= pages.length) break;

      const cell = layoutCells[i];
      const cellRotation = cell.rotate;
      // cell.w/h = original item size. Bounding box depends on rotation.
      const isRot90 = cellRotation === 90 || cellRotation === 270;
      const bbW = isRot90 ? cell.h : cell.w; // bounding box width
      const bbH = isRot90 ? cell.w : cell.h; // bounding box height

      // Bounding box position on sheet (mm)
      const bboxXMm = cell.x;
      const bboxYMm = cell.y;
      // Center of bounding box in PDF points (PDF y from bottom)
      const centerXPt = (bboxXMm + bbW / 2) * MM_TO_PT;
      const centerYPt = sheetHPt - (bboxYMm + bbH / 2) * MM_TO_PT;
      // Origin for drawing elements: top-left of original item relative to center
      const origWPt = cell.w * MM_TO_PT;
      const origHPt = cell.h * MM_TO_PT;

      // Use pushOperators to save state, translate to center, rotate, then draw at offset
      // Save graphics state, translate to cell center, rotate
      sheetPage.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(1, 0, 0, 1, centerXPt, centerYPt),
        rotateDegrees(-cellRotation),
      );

      // Now (0,0) is at center of cell, rotated. Draw elements relative to item origin.
      // Item origin (top-left in screen coords) = (-origW/2, -origH/2) but PDF y is up
      // so bottom-left of item = (-origW/2, -origH/2)
      const itemOx = -origWPt / 2;
      const itemOy = -origHPt / 2;

      // Clip to circle if needed
      if (shape === 'circle') {
        // Draw circle clip path via ellipse approximation (pdf-lib doesn't support clip, draw white outside)
        // Just draw content inside bounding box — circle clipping not supported in pdf-lib without operators
      }

      // Draw background for this cell
      if (background?.src) {
        try {
          let imgBytes: ArrayBuffer;
          if (background.src.startsWith('data:')) {
            const b64 = background.src.split(',')[1];
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
            imgBytes = arr.buffer;
          } else {
            imgBytes = await (await fetch(background.src)).arrayBuffer();
          }
          const cacheKey = 'bg';
          let bgImg = imageCache.get(cacheKey);
          if (!bgImg) {
            try { bgImg = await pdfDoc.embedPng(imgBytes); } catch { bgImg = await pdfDoc.embedJpg(imgBytes); }
            imageCache.set(cacheKey, bgImg);
          }
          sheetPage.drawImage(bgImg, { x: itemOx, y: itemOy, width: origWPt, height: origHPt });
        } catch { /* skip */ }
      }

      // Draw elements in original (unrotated) coordinate space
      const els = pages[pageIdx];
      for (const el of els) {
        // Element position in original item space → PDF coords relative to item origin
        const xPt = itemOx + el.x * MM_TO_PT;
        const yPt = itemOy + (cell.h - el.y - el.height) * MM_TO_PT;
        const wPt = el.width * MM_TO_PT;
        const hPt = el.height * MM_TO_PT;

        if (el.type === 'box') {
          if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            const c = hexToRgb(el.backgroundColor);
            sheetPage.drawRectangle({ x: xPt, y: yPt, width: wPt, height: hPt, color: rgb(c.r, c.g, c.b) });
          }
          if (el.borderWidth && el.borderColor) {
            const c = hexToRgb(el.borderColor);
            sheetPage.drawRectangle({ x: xPt, y: yPt, width: wPt, height: hPt, borderColor: rgb(c.r, c.g, c.b), borderWidth: el.borderWidth * MM_TO_PT });
          }
        }

        if (el.type === 'text' && el.content) {
          const isBold = el.fontWeight === 'bold';
          const isItalic = el.fontStyle === 'italic';
          let font = defaultFont;
          if (el.fontFamily) {
            const ck = `${el.fontFamily}-${isBold ? 'b' : ''}-${isItalic ? 'i' : ''}`;
            if (fontCache.has(ck)) {
              font = fontCache.get(ck);
            } else {
              const fb = await loadFontBytes(el.fontFamily, isBold, isItalic);
              if (fb) {
                try { const ef = await pdfDoc.embedFont(fb); fontCache.set(ck, ef); font = ef; } catch { /* use default */ }
              }
            }
          }
          const fsPt = (el.fontSize || 12) * 0.75;
          const tc = hexToRgb(el.color || '#000000');
          const tw = font.widthOfTextAtSize(el.content, fsPt);
          let tx = xPt;
          if (el.textAlignH === 'center') tx = xPt + wPt / 2 - tw / 2;
          else if (el.textAlignH === 'right' || el.textAlignH === 'flex-end') tx = xPt + wPt - tw;
          let ty = yPt + hPt / 2 - fsPt / 2;
          if (el.textAlignV === 'top' || el.textAlignV === 'flex-start') ty = yPt + hPt - fsPt;
          else if (el.textAlignV === 'bottom' || el.textAlignV === 'flex-end') ty = yPt;
          sheetPage.drawText(el.content, { x: tx, y: ty, size: fsPt, font, color: rgb(tc.r, tc.g, tc.b) });
        }

        if ((el.type === 'image' || el.type === 'img-data') && el.src) {
          try {
            let imgBytes: ArrayBuffer;
            if (el.src.startsWith('data:')) {
              const b64 = el.src.split(',')[1];
              const bin = atob(b64);
              const arr = new Uint8Array(bin.length);
              for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
              imgBytes = arr.buffer;
            } else {
              imgBytes = await (await fetch(el.src)).arrayBuffer();
            }
            let img = imageCache.get(el.src);
            if (!img) {
              try { img = await pdfDoc.embedPng(imgBytes); } catch { img = await pdfDoc.embedJpg(imgBytes); }
              imageCache.set(el.src, img);
            }
            sheetPage.drawImage(img, { x: xPt, y: yPt, width: wPt, height: hPt });
          } catch { /* skip */ }
        }
      }

      // Restore graphics state (undo rotation transform)
      sheetPage.pushOperators(popGraphicsState());
    }

    // Draw page crop marks at 4 corners of the SHEET (matches processor.py logic)
    // Lines start at dist from corner, extend len inward
    if (useCropMark) {
      const d = cropDistPt, l = cropLenPt, t = cropThickPt;
      const W = sheetWPt, H = sheetHPt;
      // Top-left
      sheetPage.drawLine({ start: { x: d, y: H - d }, end: { x: d + l, y: H - d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: d, y: H - d }, end: { x: d, y: H - d - l }, thickness: t, color: cropColorRgb });
      // Top-right
      sheetPage.drawLine({ start: { x: W - d - l, y: H - d }, end: { x: W - d, y: H - d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: W - d, y: H - d }, end: { x: W - d, y: H - d - l }, thickness: t, color: cropColorRgb });
      // Bottom-left
      sheetPage.drawLine({ start: { x: d, y: d }, end: { x: d + l, y: d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: d, y: d }, end: { x: d, y: d + l }, thickness: t, color: cropColorRgb });
      // Bottom-right
      sheetPage.drawLine({ start: { x: W - d - l, y: d }, end: { x: W - d, y: d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: W - d, y: d }, end: { x: W - d, y: d + l }, thickness: t, color: cropColorRgb });
    }

    // Draw page number
    const pgNum = options.pageNumber || 'none';
    if (pgNum !== 'none') {
      const label = `Trang ${s + 1} / ${numSheets}`;
      const pnFont = defaultFont;
      const pnSize = 7;
      const tw = pnFont.widthOfTextAtSize(label, pnSize);
      const tx = (sheetWPt - tw) / 2;
      const ty = pgNum === 'header' ? sheetHPt - 3 * MM_TO_PT : 2 * MM_TO_PT;
      sheetPage.drawText(label, { x: tx, y: ty, size: pnSize, font: pnFont, color: rgb(0.4, 0.4, 0.4) });
    }
  }

  return await pdfDoc.save();
}
