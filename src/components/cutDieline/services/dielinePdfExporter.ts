import { jsPDF } from 'jspdf';
import { LayoutPlan } from '../../../utils/layoutSolver';
import { ShapeTabItem } from '../types';

interface ExportDielinePdfParams {
  plan: LayoutPlan | null;
  pageW: number;
  pageH: number;
  cutColor: string;
  selectedSheet: number | 'all';
  effectiveTotalSheets: number;
  showPageBorder: boolean;
  strokeWidthMm: number;
  isMultiShape?: boolean;
  shapeTabs?: ShapeTabItem[];
  defaultShape: string;
  defaultItemH: number;
  defaultItemW: number;
  cornerRadius: number;
  cutBleed: number;
  customFilename: string;
}

export const exportDielinePdf = async ({
  plan,
  pageW,
  pageH,
  cutColor,
  selectedSheet,
  effectiveTotalSheets,
  showPageBorder,
  strokeWidthMm,
  isMultiShape = false,
  shapeTabs = [],
  defaultShape,
  defaultItemH,
  defaultItemW,
  cornerRadius,
  cutBleed,
  customFilename,
}: ExportDielinePdfParams): Promise<void> => {
  if (!plan || !plan.items) return;

  const orientation = pageW > pageH ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageW, pageH],
    compress: true,
  });

  // Parse hex color to RGB
  const hex = cutColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 255;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  const sheetsToRender: number[] =
    selectedSheet === 'all'
      ? Array.from({ length: effectiveTotalSheets }, (_, i) => i)
      : [typeof selectedSheet === 'number' ? selectedSheet : 0];

  sheetsToRender.forEach((sheetIdx, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage([pageW, pageH], orientation);
    }

    const sheetItems = isMultiShape
      ? plan.items.filter((it) => (it.sheetIndex ?? 0) === sheetIdx)
      : plan.items;

    // Draw Sheet Boundary if enabled
    if (showPageBorder) {
      doc.setDrawColor(180, 190, 205);
      doc.setLineWidth(0.15);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(0, 0, pageW, pageH, 'S');
      doc.setLineDashPattern([], 0); // reset dash
    }

    // Draw cut lines
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(strokeWidthMm);

    sheetItems.forEach((item) => {
      const tab = isMultiShape
        ? shapeTabs.find((t) => t.id === item.tabId || t.name === item.tabName)
        : null;

      const itemShape = (item.shape || tab?.shape || defaultShape) as string;
      const itW = item.w !== undefined ? item.w : (item.rot ? (tab?.itemH ?? defaultItemH) : (tab?.itemW ?? defaultItemW));
      const itH = itemShape === 'circle' ? itW : (item.h !== undefined ? item.h : (item.rot ? (tab?.itemW ?? defaultItemW) : (tab?.itemH ?? defaultItemH)));
      const itemRad = item.cornerRadius ?? tab?.cornerRadius ?? cornerRadius;

      const w = itW;
      const h = itH;
      const adjW = Math.max(0.1, w - cutBleed * 2);
      const adjH = Math.max(0.1, h - cutBleed * 2);
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;

      if (itemShape === 'circle') {
        const radius = adjW / 2;
        const cx = item.x + w / 2;
        const cy = item.y + h / 2;
        doc.circle(cx, cy, radius, 'S');
      } else if (itemShape === 'oval') {
        const rx = adjW / 2;
        const ry = adjH / 2;
        const cx = item.x + w / 2;
        const cy = item.y + h / 2;
        doc.ellipse(cx, cy, rx, ry, 'S');
      } else if (itemShape === 'trapezoid') {
        const topRatio = 0.7;
        const narrowW = adjW * topRatio;
        const offset = (adjW - narrowW) / 2;
        let pts: [number, number][];
        if (item.rot) {
          pts = [
            [x, y],
            [x + adjW, y],
            [x + offset + narrowW, y + adjH],
            [x + offset, y + adjH],
          ];
        } else {
          pts = [
            [x + offset, y],
            [x + offset + narrowW, y],
            [x + adjW, y + adjH],
            [x, y + adjH],
          ];
        }
        for (let i = 0; i < pts.length; i++) {
          const next = pts[(i + 1) % pts.length];
          doc.line(pts[i][0], pts[i][1], next[0], next[1]);
        }
      } else if (itemShape === 'triangle') {
        let pts: [number, number][];
        if (item.rot) {
          pts = [
            [x, y],
            [x + adjW, y],
            [x + adjW / 2, y + adjH],
          ];
        } else {
          pts = [
            [x + adjW / 2, y],
            [x + adjW, y + adjH],
            [x, y + adjH],
          ];
        }
        for (let i = 0; i < pts.length; i++) {
          const next = pts[(i + 1) % pts.length];
          doc.line(pts[i][0], pts[i][1], next[0], next[1]);
        }
      } else if (itemShape === 'hexagon') {
        const cx = item.x + w / 2;
        const cy = item.y + h / 2;
        const rx = adjW / 2;
        const ry = adjH / 2;
        const pts: [number, number][] = [
          [cx, cy - ry],
          [cx + rx, cy - ry / 2],
          [cx + rx, cy + ry / 2],
          [cx, cy + ry],
          [cx - rx, cy + ry / 2],
          [cx - rx, cy - ry / 2],
        ];
        for (let i = 0; i < pts.length; i++) {
          const next = pts[(i + 1) % pts.length];
          doc.line(pts[i][0], pts[i][1], next[0], next[1]);
        }
      } else if (itemShape === 'custom-svg') {
        const knots =
          (item as any).vectorMaskResult?.knots ||
          (tab as any)?.vectorMaskResult?.knots;
        if (Array.isArray(knots) && knots.length >= 3) {
          for (let i = 0; i < knots.length; i++) {
            const k1 = knots[i];
            const k2 = knots[(i + 1) % knots.length];
            doc.line(x + k1.x, y + k1.y, x + k2.x, y + k2.y);
          }
        } else {
          doc.rect(x, y, adjW, adjH, 'S');
        }
      } else {
        // Rect
        const r = itemRad > 0 ? Math.min(itemRad, adjW / 2, adjH / 2) : 0;
        if (r > 0) {
          doc.roundedRect(x, y, adjW, adjH, r, r, 'S');
        } else {
          doc.rect(x, y, adjW, adjH, 'S');
        }
      }
    });
  });

  const sheetLabel =
    selectedSheet === 'all'
      ? 'AllSheets'
      : `To_${(typeof selectedSheet === 'number' ? selectedSheet : 0) + 1}`;
  const filename = `${customFilename.trim() || `Khuon_Cat_${pageW}x${pageH}mm`}_${sheetLabel}.pdf`;
  doc.save(filename);
};
