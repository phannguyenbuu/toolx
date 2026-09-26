import { LayoutPlan, PlanItem } from '../../../utils/layoutSolver';
import { ShapeTabItem, DielineCalculationResult } from '../types';

interface CalculateDielineSvgParams {
  plan: LayoutPlan | null;
  selectedSheet: number | 'all';
  effectiveTotalSheets: number;
  isMultiShape?: boolean;
  shapeTabs?: ShapeTabItem[];
  defaultShape: string;
  defaultItemW: number;
  defaultItemH: number;
  cornerRadius: number;
  cutBleed: number;
  showPageBorder: boolean;
  pageW: number;
  pageH: number;
}

export const calculateDielineSvg = ({
  plan,
  selectedSheet,
  effectiveTotalSheets,
  isMultiShape = false,
  shapeTabs = [],
  defaultShape,
  defaultItemW,
  defaultItemH,
  cornerRadius,
  cutBleed,
  showPageBorder,
  pageW,
  pageH,
}: CalculateDielineSvgParams): DielineCalculationResult => {
  if (!plan || !plan.items || plan.items.length === 0) {
    return {
      svgContent: '',
      totalCutLengthMeters: 0,
      itemCount: 0,
      renderWidthMm: pageW,
      renderHeightMm: pageH,
    };
  }

  const sheetsToProcess: number[] =
    selectedSheet === 'all'
      ? Array.from({ length: effectiveTotalSheets }, (_, i) => i)
      : [typeof selectedSheet === 'number' ? selectedSheet : 0];

  const sheetSpacingMm = 25;
  const totalRenderWidth =
    selectedSheet === 'all' && effectiveTotalSheets > 1
      ? effectiveTotalSheets * pageW + (effectiveTotalSheets - 1) * sheetSpacingMm
      : pageW;
  const totalRenderHeight = pageH;

  let elementsSvg = '';
  let totalLengthMm = 0;
  let totalCount = 0;

  sheetsToProcess.forEach((sheetIdx, sheetOrder) => {
    const sheetOffsetX =
      selectedSheet === 'all' && effectiveTotalSheets > 1
        ? sheetOrder * (pageW + sheetSpacingMm)
        : 0;
    const sheetOffsetY = 0;

    // Filter items strictly for this sheet
    let sheetItems: PlanItem[] = [];
    if (isMultiShape) {
      sheetItems = plan.items.filter((it) => (it.sheetIndex ?? 0) === sheetIdx);
    } else {
      sheetItems = plan.items;
    }

    // Draw Sheet Boundary Box if enabled
    if (showPageBorder) {
      elementsSvg += `<rect x="${sheetOffsetX.toFixed(2)}" y="${sheetOffsetY.toFixed(2)}" width="${pageW}" height="${pageH}" class="sheet-boundary" />\n`;
      if (selectedSheet === 'all' && effectiveTotalSheets > 1) {
        elementsSvg += `<text x="${(sheetOffsetX + pageW / 2).toFixed(2)}" y="${(sheetOffsetY - 6).toFixed(2)}" font-size="12" font-family="sans-serif" font-weight="bold" fill="#64748B" text-anchor="middle">TỜ ${sheetIdx + 1} (${pageW}×${pageH}mm)</text>\n`;
      }
    }

    sheetItems.forEach((item) => {
      totalCount++;
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
      const x = sheetOffsetX + item.x + cutBleed;
      const y = sheetOffsetY + item.y + cutBleed;

      if (itemShape === 'circle') {
        const radius = adjW / 2;
        const cx = sheetOffsetX + item.x + w / 2;
        const cy = sheetOffsetY + item.y + h / 2;
        elementsSvg += `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${radius.toFixed(3)}" class="cut-dieline" />\n`;
        totalLengthMm += 2 * Math.PI * radius;
      } else if (itemShape === 'oval') {
        const rx = adjW / 2;
        const ry = adjH / 2;
        const cx = sheetOffsetX + item.x + w / 2;
        const cy = sheetOffsetY + item.y + h / 2;
        elementsSvg += `<ellipse cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" rx="${rx.toFixed(3)}" ry="${ry.toFixed(3)}" class="cut-dieline" />\n`;
        const hParam = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2);
        totalLengthMm +=
          Math.PI *
          (rx + ry) *
          (1 + (3 * hParam) / (10 + Math.sqrt(4 - 3 * hParam)));
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
        const ptsStr = pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
        elementsSvg += `<polygon points="${ptsStr}" class="cut-dieline" />\n`;
        for (let i = 0; i < pts.length; i++) {
          const next = pts[(i + 1) % pts.length];
          totalLengthMm += Math.hypot(next[0] - pts[i][0], next[1] - pts[i][1]);
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
        const ptsStr = pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
        elementsSvg += `<polygon points="${ptsStr}" class="cut-dieline" />\n`;
        for (let i = 0; i < pts.length; i++) {
          const next = pts[(i + 1) % pts.length];
          totalLengthMm += Math.hypot(next[0] - pts[i][0], next[1] - pts[i][1]);
        }
      } else if (itemShape === 'hexagon') {
        const cx = sheetOffsetX + item.x + w / 2;
        const cy = sheetOffsetY + item.y + h / 2;
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
        const ptsStr = pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
        elementsSvg += `<polygon points="${ptsStr}" class="cut-dieline" />\n`;
        for (let i = 0; i < pts.length; i++) {
          const next = pts[(i + 1) % pts.length];
          totalLengthMm += Math.hypot(next[0] - pts[i][0], next[1] - pts[i][1]);
        }
      } else if (itemShape === 'custom-svg') {
        const pathD =
          (item as any).vectorMaskResult?.pathData ||
          (tab as any)?.vectorMaskResult?.pathData ||
          ((item as any).customSvgData
            ? (item as any).customSvgData.match(/<path[^>]*\bd=["']([^"']+)["']/i)?.[1]
            : '') ||
          (tab?.customSvgData
            ? tab.customSvgData.match(/<path[^>]*\bd=["']([^"']+)["']/i)?.[1]
            : '');
        if (pathD) {
          elementsSvg += `<g transform="translate(${x.toFixed(3)}, ${y.toFixed(3)})"><path d="${pathD}" class="cut-dieline" /></g>\n`;
          totalLengthMm += 2 * (adjW + adjH);
        } else {
          elementsSvg += `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${adjW.toFixed(3)}" height="${adjH.toFixed(3)}" class="cut-dieline" />\n`;
          totalLengthMm += 2 * (adjW + adjH);
        }
      } else {
        // Rectangle with optional rounded corner
        const r = itemRad > 0 ? Math.min(itemRad, adjW / 2, adjH / 2) : 0;
        if (r > 0) {
          elementsSvg += `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${adjW.toFixed(3)}" height="${adjH.toFixed(3)}" rx="${r.toFixed(3)}" ry="${r.toFixed(3)}" class="cut-dieline" />\n`;
          totalLengthMm += 2 * (adjW + adjH) - 8 * r + 2 * Math.PI * r;
        } else {
          elementsSvg += `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${adjW.toFixed(3)}" height="${adjH.toFixed(3)}" class="cut-dieline" />\n`;
          totalLengthMm += 2 * (adjW + adjH);
        }
      }
    });
  });

  return {
    svgContent: elementsSvg,
    totalCutLengthMeters: Number((totalLengthMm / 1000).toFixed(2)),
    itemCount: totalCount,
    renderWidthMm: totalRenderWidth,
    renderHeightMm: totalRenderHeight,
  };
};

export const buildCompleteSvgDocument = (
  renderWidthMm: number,
  renderHeightMm: number,
  cutColor: string,
  strokeWidthMm: number,
  svgContent: string
): string => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${renderWidthMm}mm" height="${renderHeightMm}mm" viewBox="0 0 ${renderWidthMm} ${renderHeightMm}" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .cut-dieline {
        fill: none;
        stroke: ${cutColor};
        stroke-width: ${strokeWidthMm};
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }
      .sheet-boundary {
        fill: none;
        stroke: #94A3B8;
        stroke-width: 0.25;
        stroke-dasharray: 2.5 2.5;
        vector-effect: non-scaling-stroke;
      }
    </style>
  </defs>
  <!-- Generated by Toolx Prepress Imposition Engine -->
  ${svgContent}
</svg>`;
};
