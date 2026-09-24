import { PlanItem } from './types';

export interface SimpleLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Helper function to create rounded polygon path
 */
export function roundedPolygonPath(points: [number, number][], radius: number): string {
  if (points.length < 3 || radius <= 0) {
    return 'M ' + points.map(p => `${p[0]},${p[1]}`).join(' L ') + ' Z';
  }
  
  const r = Math.min(radius, 5);
  let path = '';
  
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    const v1x = p0[0] - p1[0], v1y = p0[1] - p1[1];
    const v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    const maxR = Math.min(len1, len2) / 2;
    const actualR = Math.min(r, maxR);
    
    const start: [number, number] = [p1[0] + (v1x / len1) * actualR, p1[1] + (v1y / len1) * actualR];
    const end: [number, number] = [p1[0] + (v2x / len2) * actualR, p1[1] + (v2y / len2) * actualR];
    
    if (i === 0) {
      path = `M ${start[0].toFixed(2)},${start[1].toFixed(2)}`;
    } else {
      path += ` L ${start[0].toFixed(2)},${start[1].toFixed(2)}`;
    }
    path += ` Q ${p1[0].toFixed(2)},${p1[1].toFixed(2)} ${end[0].toFixed(2)},${end[1].toFixed(2)}`;
  }
  
  path += ' Z';
  return path;
}

export function deduplicateLines(lines: SimpleLine[]): SimpleLine[] {
  const unique: SimpleLine[] = [];
  const EPSILON = 0.1;

  for (const l of lines) {
    let p1 = { x: l.x1, y: l.y1 };
    let p2 = { x: l.x2, y: l.y2 };
    
    if (p1.x > p2.x || (Math.abs(p1.x - p2.x) < EPSILON && p1.y > p2.y)) {
      [p1, p2] = [p2, p1];
    }
    
    let isDuplicate = false;
    for (const u of unique) {
      if (
        Math.abs(p1.x - u.x1) < EPSILON &&
        Math.abs(p1.y - u.y1) < EPSILON &&
        Math.abs(p2.x - u.x2) < EPSILON &&
        Math.abs(p2.y - u.y2) < EPSILON
      ) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      unique.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
  }
  
  return unique;
}

/**
 * Generate SVG cut file content (client-side)
 */
export function generateCutSVG(
  items: PlanItem[],
  pageW: number,
  pageH: number,
  itemW: number,
  itemH: number,
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon',
  cutBleed: number = 0,
  cornerRadius: number = 0
): string {
  let content = '';
  const polyLines: SimpleLine[] = [];

  if (shape === 'circle' || shape === 'oval') {
    for (const item of items) {
      const w = item.rot ? itemH : itemW;
      const h = item.rot ? itemW : itemH;
      const adjW = w - cutBleed * 2;
      const adjH = h - cutBleed * 2;
      const rx = adjW / 2;
      const ry = adjH / 2;
      const cx = item.x + w / 2;
      const cy = item.y + h / 2;

      if (shape === 'circle') {
        content += `<circle cx="${cx}" cy="${cy}" r="${rx}" class="cut-line" />`;
      } else {
        content += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="cut-line" />`;
      }
    }
  } else if (shape === 'trapezoid') {
    const topRatio = 0.7;
    for (const item of items) {
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = itemW - cutBleed * 2;
      const adjH = itemH - cutBleed * 2;
      const narrowW = adjW * topRatio;
      const offset = (adjW - narrowW) / 2;
      
      let pts: [number, number][];
      if (item.rot) {
        pts = [[x, y], [x + adjW, y], [x + offset + narrowW, y + adjH], [x + offset, y + adjH]];
      } else {
        pts = [[x + offset, y], [x + offset + narrowW, y], [x + adjW, y + adjH], [x, y + adjH]];
      }
      
      if (cornerRadius > 0) {
        content += `<path d="${roundedPolygonPath(pts, cornerRadius)}" class="cut-line" />`;
      } else {
        for (let i = 0; i < pts.length; i++) {
          polyLines.push({ x1: pts[i][0], y1: pts[i][1], x2: pts[(i+1)%pts.length][0], y2: pts[(i+1)%pts.length][1] });
        }
      }
    }
  } else if (shape === 'triangle') {
    for (const item of items) {
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = itemW - cutBleed * 2;
      const adjH = itemH - cutBleed * 2;
      
      let pts: [number, number][];
      if (item.rot) {
        pts = [[x, y], [x + adjW, y], [x + adjW/2, y + adjH]];
      } else {
        pts = [[x + adjW/2, y], [x + adjW, y + adjH], [x, y + adjH]];
      }
      
      if (cornerRadius > 0) {
        content += `<path d="${roundedPolygonPath(pts, cornerRadius)}" class="cut-line" />`;
      } else {
        for (let i = 0; i < pts.length; i++) {
          polyLines.push({ x1: pts[i][0], y1: pts[i][1], x2: pts[(i+1)%pts.length][0], y2: pts[(i+1)%pts.length][1] });
        }
      }
    }
  } else if (shape === 'hexagon') {
    for (const item of items) {
      const cx = item.x + itemW / 2;
      const cy = item.y + itemH / 2;
      const adjW = itemW - cutBleed * 2;
      const adjH = itemH - cutBleed * 2;
      const rx = adjW / 2;
      const ry = adjH / 2;
      
      const pts: [number, number][] = [
        [cx, cy - ry],
        [cx + rx, cy - ry/2],
        [cx + rx, cy + ry/2],
        [cx, cy + ry],
        [cx - rx, cy + ry/2],
        [cx - rx, cy - ry/2]
      ];
      
      if (cornerRadius > 0) {
        content += `<path d="${roundedPolygonPath(pts, cornerRadius)}" class="cut-line" />`;
      } else {
        for (let i = 0; i < pts.length; i++) {
          polyLines.push({ x1: pts[i][0], y1: pts[i][1], x2: pts[(i+1)%pts.length][0], y2: pts[(i+1)%pts.length][1] });
        }
      }
    }
  } else if (cornerRadius > 0) {
    for (const item of items) {
      const w = item.rot ? itemH : itemW;
      const h = item.rot ? itemW : itemH;
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = w - cutBleed * 2;
      const adjH = h - cutBleed * 2;
      const r = Math.min(cornerRadius, adjW / 2, adjH / 2);
      content += `<rect x="${x}" y="${y}" width="${adjW}" height="${adjH}" rx="${r}" ry="${r}" class="cut-line" />`;
    }
  } else {
    interface Line { x1: number; y1: number; x2: number; y2: number; type: 'H' | 'V'; }
    const lines: Line[] = [];

    for (const item of items) {
      const w = item.rot ? itemH : itemW;
      const h = item.rot ? itemW : itemH;
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = w - cutBleed * 2;
      const adjH = h - cutBleed * 2;

      lines.push({ x1: x, y1: y, x2: x + adjW, y2: y, type: 'H' });
      lines.push({ x1: x, y1: y + adjH, x2: x + adjW, y2: y + adjH, type: 'H' });
      lines.push({ x1: x, y1: y, x2: x, y2: y + adjH, type: 'V' });
      lines.push({ x1: x + adjW, y1: y, x2: x + adjW, y2: y + adjH, type: 'V' });
    }

    const hGroups: Record<string, Line[]> = {};
    for (const l of lines) {
      if (l.type === 'H') {
        const key = l.y1.toFixed(4);
        if (!hGroups[key]) hGroups[key] = [];
        hGroups[key].push(l);
      }
    }

    const mergedLines: Line[] = [];
    for (const group of Object.values(hGroups)) {
      group.sort((a, b) => a.x1 - b.x1);
      let curr = { ...group[0] };
      for (let i = 1; i < group.length; i++) {
        const next = group[i];
        if (next.x1 <= curr.x2 + 0.1) {
          curr.x2 = Math.max(curr.x2, next.x2);
        } else {
          mergedLines.push(curr);
          curr = { ...next };
        }
      }
      mergedLines.push(curr);
    }

    const vGroups: Record<string, Line[]> = {};
    for (const l of lines) {
      if (l.type === 'V') {
        const key = l.x1.toFixed(4);
        if (!vGroups[key]) vGroups[key] = [];
        vGroups[key].push(l);
      }
    }

    for (const group of Object.values(vGroups)) {
      group.sort((a, b) => a.y1 - b.y1);
      let curr = { ...group[0] };
      for (let i = 1; i < group.length; i++) {
        const next = group[i];
        if (next.y1 <= curr.y2 + 0.1) {
          curr.y2 = Math.max(curr.y2, next.y2);
        } else {
          mergedLines.push(curr);
          curr = { ...next };
        }
      }
      mergedLines.push(curr);
    }

    const EXT = 2;
    for (const l of mergedLines) {
      if (l.type === 'H') {
        content += `<line x1="${l.x1 - EXT}" y1="${l.y1}" x2="${l.x2 + EXT}" y2="${l.y2}" class="cut-line" />`;
      } else {
        content += `<line x1="${l.x1}" y1="${l.y1 - EXT}" x2="${l.x2}" y2="${l.y2 + EXT}" class="cut-line" />`;
      }
    }
  }

  if (polyLines.length > 0) {
    const deduped = deduplicateLines(polyLines);
    for (const l of deduped) {
      content += `<line x1="${l.x1.toFixed(3)}" y1="${l.y1.toFixed(3)}" x2="${l.x2.toFixed(3)}" y2="${l.y2.toFixed(3)}" class="cut-line" />`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}" version="1.1" xmlns="http://www.w3.org/2000/svg">
<style>.cut-line { fill: none; stroke: #FF0000; stroke-width: 0.1; vector-effect: non-scaling-stroke; }</style>
${content}
</svg>`;
}
