/**
 * Layout Solver - Tính toán các phương án xếp hình (Bin Packing)
 * Ported from Python SolverV10 to TypeScript
 */

// Priority constants
const P_STRAIGHT = 1;
const P_ROTATED = 2;
const P_MIXED = 3;
const P_STAGGERED = 4;
const P_FLIPPED = 5;
const P_ROT45 = 6;

// Layout-specific interfaces (not related to API data)
export interface PlanItem {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: boolean;
  rot45?: boolean;
  flipped?: boolean;
  sheetIndex?: number;
  tabId?: string;
  tabName?: string;
  shape?: string;
  cornerRadius?: number;
  sourceImage?: any;
  vectorMaskResult?: any;
  customSvgData?: string;
  color?: string;
}

export interface LayoutPlan {
  name: string;
  qty: number;
  items: PlanItem[];
  priority: number;
}

export interface SolverConfig {
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon';
  itemW: number;
  itemH: number;
  padding: number;
  printW: number;
  printH: number;
  pageW: number;
  pageH: number;
  autoRotate?: boolean;
}

class LayoutSolver {
  private iW: number;
  private iH: number;
  private padding: number;
  private printW: number;
  private printH: number;
  private pageW: number;
  private pageH: number;
  private shape: string;
  private autoRotate: boolean;

  constructor(config: SolverConfig) {
    this.iW = config.itemW + config.padding;
    this.iH = config.itemH + config.padding;
    this.padding = config.padding;
    this.printW = config.printW;
    this.printH = config.printH;
    this.pageW = config.pageW;
    this.pageH = config.pageH;
    this.shape = config.shape;
    this.autoRotate = config.autoRotate !== false;
  }

  /**
   * Fill a rectangular area with items
   */
  private fill(x: number, y: number, w: number, h: number, rot: boolean): PlanItem[] {
    const iW = rot ? this.iH : this.iW;
    const iH = rot ? this.iW : this.iH;

    if (iW > w || iH > h) {
      return [];
    }

    const cols = Math.floor(w / iW);
    const rows = Math.floor(h / iH);
    const items: PlanItem[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push({
          x: x + c * iW,
          y: y + r * iH,
          w: iW,
          h: iH,
          rot: rot,
        });
      }
    }

    return items;
  }

  /**
   * Fill with staggered (honeycomb) pattern for circles
   */
  private fillStaggered(): PlanItem[] {
    const D = this.iW;
    const rowH = D * 0.866025; // sqrt(3)/2
    const items: PlanItem[] = [];
    let y = 0;
    let r = 0;

    while (y + D <= this.printH) {
      const offX = r % 2 === 0 ? 0 : D / 2;
      let x = offX;

      while (x + D <= this.printW) {
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
   * Fill with honeycomb pattern for hexagons (proper spacing)
   * Vertical spacing is 75% of height (due to interlocking)
   * Horizontal offset is 50% of width
   */
  private fillHexagonHoneycomb(): PlanItem[] {
    const items: PlanItem[] = [];
    const iW = this.iW;
    const iH = this.iH;
    
    // Vertical distance between row centers = H * 0.75 (Pointy Top)
    // Using iH * 0.75 distributes padding proportionally
    const rowH = iH * 0.75; 
    let y = 0;
    let r = 0;

    while (y + iH <= this.printH) {
      const offX = r % 2 === 0 ? 0 : iW * 0.5;
      let x = offX;

      while (x + iW <= this.printW) {
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
   * Overlap bounding boxes by 50% width
   */
  private fillTriangleAlternating(): PlanItem[] {
    const items: PlanItem[] = [];
    const iW = this.iW;
    const iH = this.iH;
    
    // Effective width for each added triangle is 50% of full width (plus padding)
    const effectiveW = (iW - this.padding) * 0.5 + this.padding;
    let y = 0;

    while (y + iH <= this.printH) {
      let x = 0;
      let col = 0;

      while (x + iW <= this.printW) {
        items.push({
          x: x,
          y: y,
          w: iW,
          h: iH,
          rot: col % 2 === 1, // Odd columns are flipped (point down)
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
   * Top ratio is 0.7, so overlap is possible
   * For simplicity, we assume we can flip them to fit the narrow part into the gap
   * But trapezoids are harder to interlock perfectly in simple grid without complex offset.
   * A simple optimization is flipping every other one to match side angles if they were isosceles triangles, 
   * but for trapezoids with 70% top, the gain is small unless we shift vertically.
   * We will implement a simple alternating flip which might help with some shapes.
   */
  private fillTrapezoidAlternating(): PlanItem[] {
    // Similar logic to triangles but with less overlap potential
    // If we flip, we can maybe save space if the sides are slanted enough.
    // For 70% top width, the "gap" is 15% on each side.
    // If we flip the next one, its 100% bottom needs to fit.
    // Let's stick to standard grid for trapezoid for now, or just alternating rotation without overlap
    // to match the visual style requested.
    
    const items: PlanItem[] = [];
    const iW = this.iW;
    const iH = this.iH;
    // We don't overlap trapezoids horizontally significantly without vertical shift
    // So this is just straight grid but with alternating rotation
    
    let y = 0;
    while (y + iH <= this.printH) {
      let x = 0;
      let col = 0;
      while (x + iW <= this.printW) {
        items.push({
          x: x,
          y: y,
          w: iW,
          h: iH,
          rot: col % 2 === 1, // Alternate flip
        });
        x += iW; // No overlap for trapezoid yet
        col++;
      }
      y += iH;
    }
    return items;
  }

  /**
   * Center items on the page
   */
  private center(items: PlanItem[]): PlanItem[] {
    if (items.length === 0) return items;

    const minX = Math.min(...items.map((it) => it.x));
    const minY = Math.min(...items.map((it) => it.y));
    const maxX = Math.max(...items.map((it) => it.x + it.w));
    const maxY = Math.max(...items.map((it) => it.y + it.h));

    const tX = (this.pageW - (maxX - minX)) / 2;
    const tY = (this.pageH - (maxY - minY)) / 2;

    return items.map((it) => ({
      ...it,
      x: it.x - minX + tX,
      y: it.y - minY + tY,
    }));
  }

  /**
   * Generate hash for deduplication
   */
  private hashPlan(items: PlanItem[]): string {
    const sorted = [...items].sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      if (a.y !== b.y) return a.y - b.y;
      return 0;
    });
    return JSON.stringify(sorted.map((it) => [
      Math.round(it.x * 100) / 100,
      Math.round(it.y * 100) / 100,
      it.rot,
    ]));
  }

  /**
   * Calculate all layout plans
   */
  solve(): LayoutPlan[] {
    let plans: LayoutPlan[] = [];
    const isSquare = Math.abs(this.iW - this.iH) < 0.01;

    // Plan 1: Straight grid
    plans.push({
      name: 'Thẳng (Grid)',
      priority: P_STRAIGHT,
      qty: 0,
      items: this.fill(0, 0, this.printW, this.printH, false),
    });

    // Plan 2: Rotated (only for rect/oval, not circle or special shapes)
    const isSpecialShape = ['circle', 'trapezoid', 'triangle', 'hexagon'].includes(this.shape);
    if (!isSpecialShape && !isSquare) {
      plans.push({
        name: 'Xoay Ngang',
        priority: P_ROTATED,
        qty: 0,
        items: this.fill(0, 0, this.printW, this.printH, true),
      });
    }

    // Mixed plans (only for rect and oval, not special shapes)
    if (!isSpecialShape && !isSquare) {
      // Vertical cuts
      const maxCols = Math.floor(this.printW / this.iW);
      for (let i = 1; i <= maxCols; i++) {
        const w1 = i * this.iW;
        const w2 = this.printW - w1;
        if (w2 < this.iH) continue;

        const items = [
          ...this.fill(0, 0, w1, this.printH, false),
          ...this.fill(w1, 0, w2, this.printH, true),
        ];

        plans.push({
          name: `Cắt Dọc (${i} cột thẳng)`,
          priority: P_MIXED,
          qty: 0,
          items: items,
        });
      }

      // Horizontal cuts
      const maxRows = Math.floor(this.printH / this.iH);
      for (let i = 1; i <= maxRows; i++) {
        const h1 = i * this.iH;
        const h2 = this.printH - h1;
        if (h2 < this.iW) continue;

        const items = [
          ...this.fill(0, 0, this.printW, h1, false),
          ...this.fill(0, h1, this.printW, h2, true),
        ];

        plans.push({
          name: `Cắt Ngang (${i} dòng thẳng)`,
          priority: P_MIXED,
          qty: 0,
          items: items,
        });
      }
    }

    // Staggered pattern for circles
    if (this.shape === 'circle') {
      plans.push({
        name: 'Tổ ong (So le)',
        priority: P_STAGGERED,
        qty: 0,
        items: this.fillStaggered(),
      });
    }

    // Honeycomb pattern for Hexagon (bounding box overlaps vertically)
    if (this.shape === 'hexagon') {
      plans.push({
        name: 'Tổ ong (Lục giác)',
        priority: P_STAGGERED,
        qty: 0,
        items: this.fillHexagonHoneycomb(),
      });
    }

    // Alternating pattern for Triangle (flip every other)
    if (this.shape === 'triangle') {
      plans.push({
        name: 'Xen kẽ (Đảo chiều)',
        priority: P_STAGGERED,
        qty: 0,
        items: this.fillTriangleAlternating(),
      });
    }

    // Alternating pattern for Trapezoid
    if (this.shape === 'trapezoid') {
      plans.push({
        name: 'Xen kẽ (Đảo chiều)',
        priority: P_STAGGERED,
        qty: 0,
        items: this.fillTrapezoidAlternating(),
      });
    }

    // === Generic plans for all shapes (especially custom-svg) ===

    // Flip alternating (xen kẽ đảo chiều 180°) - generic for any shape
    if (!isSpecialShape && this.shape !== 'circle') {
      const items: PlanItem[] = [];
      const iW = this.iW, iH = this.iH;
      const cols = Math.floor(this.printW / iW);
      const rows = Math.floor(this.printH / iH);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          items.push({
            x: c * iW, y: r * iH, w: iW, h: iH,
            rot: false, flipped: r % 2 === 1,
          });
        }
      }
      if (items.length > 0) {
        plans.push({ name: 'Xen kẽ đảo chiều', priority: P_FLIPPED, qty: 0, items });
      }
    }

    // Staggered (so le) - generic offset rows
    if (!isSpecialShape && this.shape !== 'circle') {
      const items: PlanItem[] = [];
      const iW = this.iW, iH = this.iH;
      const cols = Math.floor(this.printW / iW);
      const rows = Math.floor(this.printH / iH);
      for (let r = 0; r < rows; r++) {
        const offX = r % 2 === 1 ? iW / 2 : 0;
        for (let c = 0; c < cols; c++) {
          const x = offX + c * iW;
          if (x + iW <= this.printW) {
            items.push({ x, y: r * iH, w: iW, h: iH, rot: false });
          }
        }
      }
      if (items.length > 0) {
        plans.push({ name: 'So le (Staggered)', priority: P_STAGGERED, qty: 0, items });
      }
    }

    // Rotated 45° - diamond pattern
    {
      const origW = this.iW - this.padding;
      const origH = this.iH - this.padding;
      // Bounding box of item rotated 45°: diagonal becomes width/height
      const diag = Math.sqrt(origW * origW + origH * origH);
      const bbW = diag + this.padding;
      const bbH = diag + this.padding;
      const cols = Math.floor(this.printW / bbW);
      const rows = Math.floor(this.printH / bbH);
      if (cols > 0 && rows > 0) {
        const items: PlanItem[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            items.push({
              x: c * bbW, y: r * bbH, w: bbW, h: bbH,
              rot: false, rot45: true,
            });
          }
        }
        if (items.length > 0) {
          plans.push({ name: 'Xoay 45°', priority: P_ROT45, qty: 0, items });
        }
      }
    }

    // Calculate quantities and center items
    for (const p of plans) {
      p.qty = p.items.length;
      p.items = this.center(p.items);
    }

    if (!this.autoRotate) {
      plans = plans.filter(p => !p.items.some(it => it.rot || it.rot45));
    }

    // Sort by quantity (desc), then priority (asc)
    plans.sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty;
      return a.priority - b.priority;
    });

    // Remove duplicates
    const unique: LayoutPlan[] = [];
    const seenHashes = new Set<string>();

    for (const p of plans) {
      const h = this.hashPlan(p.items);
      if (!seenHashes.has(h)) {
        seenHashes.add(h);
        unique.push(p);
      }
    }

    return unique.slice(0, 10); // Return top 10 plans
  }
}

/**
 * Main function to calculate layout plans
 */
export function calculateLayout(config: SolverConfig): LayoutPlan[] {
  // Circle has equal dimensions
  const adjustedConfig = { ...config };
  if (config.shape === 'circle') {
    adjustedConfig.itemH = config.itemW;
  }

  // Validate input
  if (adjustedConfig.itemW <= 0 || adjustedConfig.itemH <= 0) {
    return [];
  }
  if (adjustedConfig.printW <= 0 || adjustedConfig.printH <= 0) {
    return [];
  }

  const solver = new LayoutSolver(adjustedConfig);
  return solver.solve();
}

/**
 * Helper function to create rounded polygon path
 * @param points Array of [x, y] coordinates
 * @param radius Corner radius
 */
function roundedPolygonPath(points: [number, number][], radius: number): string {
  if (points.length < 3 || radius <= 0) {
    return 'M ' + points.map(p => `${p[0]},${p[1]}`).join(' L ') + ' Z';
  }
  
  const r = Math.min(radius, 5); // Limit radius
  let path = '';
  
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    // Calculate vectors
    const v1x = p0[0] - p1[0], v1y = p0[1] - p1[1];
    const v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    // Limit radius to half of shortest edge
    const maxR = Math.min(len1, len2) / 2;
    const actualR = Math.min(r, maxR);
    
    // Points along edges at radius distance from corner
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

interface SimpleLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function deduplicateLines(lines: SimpleLine[]): SimpleLine[] {
  const unique: SimpleLine[] = [];
  const EPSILON = 0.1; // Increased tolerance to 0.1mm to catch more overlaps

  for (const l of lines) {
    // Normalize line direction (sort points)
    let p1 = { x: l.x1, y: l.y1 };
    let p2 = { x: l.x2, y: l.y2 };
    
    // Sort by X, then Y
    if (p1.x > p2.x || (Math.abs(p1.x - p2.x) < EPSILON && p1.y > p2.y)) {
      [p1, p2] = [p2, p1];
    }
    
    // Check if duplicate exists
    let isDuplicate = false;
    for (const u of unique) {
      // u is already normalized
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
 * Ported from Python processor.py with line merging optimization
 */
export function generateCutSVG(
  items: PlanItem[],
  pageW: number,
  pageH: number,
  itemW: number,
  itemH: number,
  shape: 'rect' | 'circle' | 'oval' | 'trapezoid' | 'triangle' | 'hexagon',
  cutBleed: number = 0,  // Bù cắt - đường cắt nhỏ hơn item
  cornerRadius: number = 0  // Bo góc cho rect
): string {
  let content = '';
  const polyLines: SimpleLine[] = []; // Store lines for deduplication if cornerRadius == 0

  if (shape === 'circle' || shape === 'oval') {
    // Circle/Oval - use circle/ellipse elements
    for (const item of items) {
      const w = item.rot ? itemH : itemW;
      const h = item.rot ? itemW : itemH;
      // Apply cut bleed (shrink)
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
    // Trapezoid (hình thang cân) - for special shapes, rot means flipped, not dimension swap
    const topRatio = 0.7; // Top edge is 70% of bottom edge
    for (const item of items) {
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = itemW - cutBleed * 2;
      const adjH = itemH - cutBleed * 2;
      const narrowW = adjW * topRatio;
      const offset = (adjW - narrowW) / 2;
      
      let pts: [number, number][];
      if (item.rot) {
        // Flipped: narrow edge at bottom
        pts = [[x, y], [x + adjW, y], [x + offset + narrowW, y + adjH], [x + offset, y + adjH]];
      } else {
        // Normal: narrow edge at top
        pts = [[x + offset, y], [x + offset + narrowW, y], [x + adjW, y + adjH], [x, y + adjH]];
      }
      
      if (cornerRadius > 0) {
        content += `<path d="${roundedPolygonPath(pts, cornerRadius)}" class="cut-line" />`;
      } else {
        // Add segments to polyLines
        for (let i = 0; i < pts.length; i++) {
          polyLines.push({ x1: pts[i][0], y1: pts[i][1], x2: pts[(i+1)%pts.length][0], y2: pts[(i+1)%pts.length][1] });
        }
      }
    }
  } else if (shape === 'triangle') {
    // Triangle (tam giác cân) - rot means point down
    for (const item of items) {
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = itemW - cutBleed * 2;
      const adjH = itemH - cutBleed * 2;
      
      let pts: [number, number][];
      if (item.rot) {
        // Flipped: point down
        pts = [[x, y], [x + adjW, y], [x + adjW/2, y + adjH]];
      } else {
        // Normal: point up
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
    // Hexagon (lục giác đều) - special shape, no dimension swap
    for (const item of items) {
      const cx = item.x + itemW / 2;
      const cy = item.y + itemH / 2;
      const adjW = itemW - cutBleed * 2;
      const adjH = itemH - cutBleed * 2;
      const rx = adjW / 2;
      const ry = adjH / 2;
      
      // Pointy Top Hexagon fitted to Bounding Box
      // Vertices: Top, TopRight, BottomRight, Bottom, BottomLeft, TopLeft
      // x coords: cx, cx+rx, cx+rx, cx, cx-rx, cx-rx
      // y coords: cy-ry, cy-ry/2, cy+ry/2, cy+ry, cy+ry/2, cy-ry/2
      const pts: [number, number][] = [
        [cx, cy - ry],          // Top
        [cx + rx, cy - ry/2],   // TopRight
        [cx + rx, cy + ry/2],   // BottomRight
        [cx, cy + ry],          // Bottom
        [cx - rx, cy + ry/2],   // BottomLeft
        [cx - rx, cy - ry/2]    // TopLeft
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
    // Rectangle with rounded corners - use rect elements with rx/ry
    for (const item of items) {
      const w = item.rot ? itemH : itemW;
      const h = item.rot ? itemW : itemH;
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = w - cutBleed * 2;
      const adjH = h - cutBleed * 2;
      const r = Math.min(cornerRadius, adjW / 2, adjH / 2); // Limit radius to half of smallest dimension
      content += `<rect x="${x}" y="${y}" width="${adjW}" height="${adjH}" rx="${r}" ry="${r}" class="cut-line" />`;
    }
  } else {
    // Rectangle without corners - optimize by merging adjacent lines
    interface Line { x1: number; y1: number; x2: number; y2: number; type: 'H' | 'V'; }
    const lines: Line[] = [];

    for (const item of items) {
      const w = item.rot ? itemH : itemW;
      const h = item.rot ? itemW : itemH;
      // Apply cut bleed (shrink inward)
      const x = item.x + cutBleed;
      const y = item.y + cutBleed;
      const adjW = w - cutBleed * 2;
      const adjH = h - cutBleed * 2;

      // Add all edges
      lines.push({ x1: x, y1: y, x2: x + adjW, y2: y, type: 'H' });
      lines.push({ x1: x, y1: y + adjH, x2: x + adjW, y2: y + adjH, type: 'H' });
      lines.push({ x1: x, y1: y, x2: x, y2: y + adjH, type: 'V' });
      lines.push({ x1: x + adjW, y1: y, x2: x + adjW, y2: y + adjH, type: 'V' });
    }

    // Merge horizontal lines
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

    // Merge vertical lines
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

    // Generate line elements with 2mm extension for better cutting precision
    const EXT = 2; // mm extension on each side
    for (const l of mergedLines) {
      if (l.type === 'H') {
        // Horizontal line - extend left and right
        content += `<line x1="${l.x1 - EXT}" y1="${l.y1}" x2="${l.x2 + EXT}" y2="${l.y2}" class="cut-line" />`;
      } else {
        // Vertical line - extend top and bottom
        content += `<line x1="${l.x1}" y1="${l.y1 - EXT}" x2="${l.x2}" y2="${l.y2 + EXT}" class="cut-line" />`;
      }
    }
  }

  // Process deduplicated poly lines
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

export default calculateLayout;
