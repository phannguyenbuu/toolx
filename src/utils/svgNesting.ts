/**
 * SVG Nesting Solver v2
 * True contour-based nesting using actual SVG paths (not convex hull)
 * Supports concave shapes, interlocking, and multiple rotation angles
 */

interface Point { x: number; y: number; }
interface Placement { x: number; y: number; rotation: number; }

export interface NestingResult {
  placements: Placement[];
  polygon: Point[];
}

/**
 * Parse SVG to polygon points following the actual path contour
 */
export function parseSvgToPolygon(svgText: string, numSamples = 256): Point[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return [];

  const vb = svgEl.getAttribute('viewBox');
  let vbW = parseFloat(svgEl.getAttribute('width') || '100');
  let vbH = parseFloat(svgEl.getAttribute('height') || '100');
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    vbW = parts[2]; vbH = parts[3];
  }

  const ns = 'http://www.w3.org/2000/svg';
  const tmpSvg = document.createElementNS(ns, 'svg');
  tmpSvg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  tmpSvg.style.position = 'absolute';
  tmpSvg.style.left = '-9999px';
  tmpSvg.innerHTML = svgEl.innerHTML;
  document.body.appendChild(tmpSvg);

  // Find the outermost/longest path
  const paths = tmpSvg.querySelectorAll('path, circle, ellipse, rect, polygon, polyline');
  let longestEl: SVGGeometryElement | null = null;
  let longestLen = 0;

  paths.forEach(el => {
    if (el instanceof SVGGeometryElement) {
      try {
        const len = el.getTotalLength();
        if (len > longestLen) { longestLen = len; longestEl = el; }
      } catch {}
    }
  });

  const points: Point[] = [];
  if (longestEl && longestLen > 0) {
    const step = longestLen / numSamples;
    for (let i = 0; i < numSamples; i++) {
      const pt = (longestEl as SVGGeometryElement).getPointAtLength(i * step);
      points.push({ x: pt.x, y: pt.y });
    }
  }

  document.body.removeChild(tmpSvg);
  
  if (points.length < 3) return points;
  
  // Remove duplicate/very close points to avoid self-intersection
  const simplified: Point[] = [points[0]];
  const minDist = 0.5; // minimum distance between consecutive points
  for (let i = 1; i < points.length; i++) {
    const prev = simplified[simplified.length - 1];
    const dx = points[i].x - prev.x, dy = points[i].y - prev.y;
    if (dx * dx + dy * dy > minDist * minDist) {
      simplified.push(points[i]);
    }
  }
  
  return simplified;
}

/** Rotate polygon around centroid */
function rotatePoly(poly: Point[], deg: number): Point[] {
  if (deg === 0) return poly;
  const rad = deg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
  return poly.map(p => ({
    x: cos * (p.x - cx) - sin * (p.y - cy) + cx,
    y: sin * (p.x - cx) + cos * (p.y - cy) + cy,
  }));
}

/** Normalize polygon so min x,y = 0 */
function normPoly(poly: Point[]): Point[] {
  const minX = Math.min(...poly.map(p => p.x));
  const minY = Math.min(...poly.map(p => p.y));
  return poly.map(p => ({ x: p.x - minX, y: p.y - minY }));
}

/** Bounding box */
function bounds(poly: Point[]) {
  const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/** Translate polygon */
function translate(poly: Point[], dx: number, dy: number): Point[] {
  return poly.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Rasterized collision detection — fast and works with concave shapes
 * Creates a bitmap of the sheet, marks occupied cells, checks new placement
 */
class CollisionGrid {
  private grid: Uint8Array;
  private cellSize: number;
  private cols: number;
  private rows: number;

  constructor(sheetW: number, sheetH: number, cellSize: number) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(sheetW / cellSize) + 1;
    this.rows = Math.ceil(sheetH / cellSize) + 1;
    this.grid = new Uint8Array(this.cols * this.rows);
  }

  /** Mark polygon cells as occupied */
  markPolygon(poly: Point[]) {
    // Scanline fill
    const minY = Math.min(...poly.map(p => p.y));
    const maxY = Math.max(...poly.map(p => p.y));
    for (let y = minY; y <= maxY; y += this.cellSize * 0.5) {
      const row = Math.floor(y / this.cellSize);
      if (row < 0 || row >= this.rows) continue;
      // Find intersections with polygon edges
      const intersections: number[] = [];
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        const y1 = poly[i].y, y2 = poly[j].y;
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          const x = poly[i].x + (y - y1) / (y2 - y1) * (poly[j].x - poly[i].x);
          intersections.push(x);
        }
      }
      intersections.sort((a, b) => a - b);
      for (let k = 0; k < intersections.length - 1; k += 2) {
        const x1 = Math.floor(intersections[k] / this.cellSize);
        const x2 = Math.ceil(intersections[k + 1] / this.cellSize);
        for (let col = Math.max(0, x1); col <= Math.min(this.cols - 1, x2); col++) {
          this.grid[row * this.cols + col] = 1;
        }
      }
    }
  }

  /** Check if polygon overlaps any occupied cell */
  overlaps(poly: Point[]): boolean {
    const minY = Math.min(...poly.map(p => p.y));
    const maxY = Math.max(...poly.map(p => p.y));
    for (let y = minY; y <= maxY; y += this.cellSize * 0.5) {
      const row = Math.floor(y / this.cellSize);
      if (row < 0 || row >= this.rows) continue;
      const intersections: number[] = [];
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        const y1 = poly[i].y, y2 = poly[j].y;
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          const x = poly[i].x + (y - y1) / (y2 - y1) * (poly[j].x - poly[i].x);
          intersections.push(x);
        }
      }
      intersections.sort((a, b) => a - b);
      for (let k = 0; k < intersections.length - 1; k += 2) {
        const x1 = Math.floor(intersections[k] / this.cellSize);
        const x2 = Math.ceil(intersections[k + 1] / this.cellSize);
        for (let col = Math.max(0, x1); col <= Math.min(this.cols - 1, x2); col++) {
          if (this.grid[row * this.cols + col]) return true;
        }
      }
    }
    return false;
  }
}

/**
 * Main nesting: place SVG shapes on sheet using actual contour
 */
export function nestSvgOnSheet(
  svgText: string,
  sheetW: number,
  sheetH: number,
  itemW: number,
  itemH: number,
  padding: number,
  rotations: number[] = [0, 45, 90, 135, 180]
): NestingResult[] {
  let rawPoly = parseSvgToPolygon(svgText);
  if (rawPoly.length < 3) {
    rawPoly = [{ x: 0, y: 0 }, { x: itemW, y: 0 }, { x: itemW, y: itemH }, { x: 0, y: itemH }];
  }

  // Scale to item dimensions
  const b = bounds(rawPoly);
  const scX = itemW / (b.w || 1), scY = itemH / (b.h || 1);
  const basePoly = normPoly(rawPoly).map(p => ({ x: p.x * scX, y: p.y * scY }));

  // Expand by padding
  const halfPad = padding / 2;
  const paddedPoly = basePoly.map(p => {
    const cx = itemW / 2, cy = itemH / 2;
    const dx = p.x - cx, dy = p.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: p.x + (dx / len) * halfPad, y: p.y + (dy / len) * halfPad };
  });

  const results: NestingResult[] = [];
  // Cell size for collision grid — smaller = more precise nesting
  const cellSize = Math.max(0.2, Math.min(itemW, itemH) * 0.03);
  const baseStep = cellSize * 2;

  // Single rotation nesting
  for (const rot of rotations) {
    const poly = normPoly(rotatePoly(paddedPoly, rot));
    const pb = bounds(poly);
    if (pb.w > sheetW || pb.h > sheetH) continue;

    const grid = new CollisionGrid(sheetW, sheetH, cellSize);
    const placements: Placement[] = [];
    const stepX = baseStep;
    const stepY = baseStep;

    for (let y = 0; y <= sheetH - pb.h + 0.01; y += stepY) {
      for (let x = 0; x <= sheetW - pb.w + 0.01; x += stepX) {
        const candidate = translate(poly, x, y);
        if (!grid.overlaps(candidate)) {
          grid.markPolygon(candidate);
          placements.push({ x, y, rotation: rot });
        }
      }
    }
    if (placements.length > 0) results.push({ placements, polygon: poly });
  }

  // Yin-yang nesting (alternating normal + 180° flip)
  for (const rot of [0, 45, 90, 135]) {
    const polyN = normPoly(rotatePoly(paddedPoly, rot));
    const polyF = normPoly(rotatePoly(paddedPoly, rot + 180));
    const pbN = bounds(polyN), pbF = bounds(polyF);
    if (pbN.w > sheetW || pbN.h > sheetH) continue;

    const grid = new CollisionGrid(sheetW, sheetH, cellSize);
    const placements: Placement[] = [];
    const stepX = baseStep;
    const stepY = baseStep;
    let flipRow = false;

    for (let y = 0; y <= sheetH - Math.min(pbN.h, pbF.h) + 0.01; y += stepY) {
      flipRow = !flipRow;
      let flipCol = flipRow;
      for (let x = 0; x <= sheetW - Math.min(pbN.w, pbF.w) + 0.01; x += stepX) {
        flipCol = !flipCol;
        const poly = flipCol ? polyF : polyN;
        const candidate = translate(poly, x, y);
        const cb = bounds(candidate);
        if (cb.w + x > sheetW + 0.01 || cb.h + y > sheetH + 0.01) continue;
        if (!grid.overlaps(candidate)) {
          grid.markPolygon(candidate);
          placements.push({ x, y, rotation: flipCol ? rot + 180 : rot });
        }
      }
    }
    if (placements.length > 0) results.push({ placements, polygon: polyN });
  }

  results.sort((a, b) => b.placements.length - a.placements.length);
  return results;
}
