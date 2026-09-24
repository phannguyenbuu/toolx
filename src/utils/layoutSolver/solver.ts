import {
  PlanItem,
  LayoutPlan,
  SolverConfig,
  P_STRAIGHT,
  P_ROTATED,
  P_MIXED,
  P_STAGGERED,
  P_FLIPPED,
  P_ROT45
} from './types';
import {
  fillGrid,
  fillStaggered,
  fillHexagonHoneycomb,
  fillTriangleAlternating,
  fillTrapezoidAlternating,
  fillGenericFlipped,
  fillGenericStaggered,
  fillRotated45
} from './patternGenerators';

/**
 * Center items on the page
 */
export function centerItems(items: PlanItem[], pageW: number, pageH: number): PlanItem[] {
  if (items.length === 0) return items;

  const minX = Math.min(...items.map((it) => it.x));
  const minY = Math.min(...items.map((it) => it.y));
  const maxX = Math.max(...items.map((it) => it.x + it.w));
  const maxY = Math.max(...items.map((it) => it.y + it.h));

  const tX = (pageW - (maxX - minX)) / 2;
  const tY = (pageH - (maxY - minY)) / 2;

  return items.map((it) => ({
    ...it,
    x: it.x - minX + tX,
    y: it.y - minY + tY,
  }));
}

/**
 * Generate hash for deduplication
 */
export function hashPlan(items: PlanItem[]): string {
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

export class LayoutSolver {
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

  solve(): LayoutPlan[] {
    let plans: LayoutPlan[] = [];
    const isSquare = Math.abs(this.iW - this.iH) < 0.01;

    // Plan 1: Straight grid
    plans.push({
      name: 'Thẳng (Grid)',
      priority: P_STRAIGHT,
      qty: 0,
      items: fillGrid(0, 0, this.printW, this.printH, false, this.iW, this.iH),
    });

    // Plan 2: Rotated
    const isSpecialShape = ['circle', 'trapezoid', 'triangle', 'hexagon'].includes(this.shape);
    if (!isSpecialShape && !isSquare) {
      plans.push({
        name: 'Xoay Ngang',
        priority: P_ROTATED,
        qty: 0,
        items: fillGrid(0, 0, this.printW, this.printH, true, this.iW, this.iH),
      });
    }

    // Mixed plans
    if (!isSpecialShape && !isSquare) {
      // Vertical cuts
      const maxCols = Math.floor(this.printW / this.iW);
      for (let i = 1; i <= maxCols; i++) {
        const w1 = i * this.iW;
        const w2 = this.printW - w1;
        if (w2 < this.iH) continue;

        const items = [
          ...fillGrid(0, 0, w1, this.printH, false, this.iW, this.iH),
          ...fillGrid(w1, 0, w2, this.printH, true, this.iW, this.iH),
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
          ...fillGrid(0, 0, this.printW, h1, false, this.iW, this.iH),
          ...fillGrid(0, h1, this.printW, h2, true, this.iW, this.iH),
        ];

        plans.push({
          name: `Cắt Ngang (${i} dòng thẳng)`,
          priority: P_MIXED,
          qty: 0,
          items: items,
        });
      }
    }

    // Shape-specific plans
    if (this.shape === 'circle') {
      plans.push({
        name: 'Tổ ong (So le)',
        priority: P_STAGGERED,
        qty: 0,
        items: fillStaggered(this.printW, this.printH, this.iW),
      });
    }

    if (this.shape === 'hexagon') {
      plans.push({
        name: 'Tổ ong (Lục giác)',
        priority: P_STAGGERED,
        qty: 0,
        items: fillHexagonHoneycomb(this.printW, this.printH, this.iW, this.iH),
      });
    }

    if (this.shape === 'triangle') {
      plans.push({
        name: 'Xen kẽ (Đảo chiều)',
        priority: P_STAGGERED,
        qty: 0,
        items: fillTriangleAlternating(this.printW, this.printH, this.iW, this.iH, this.padding),
      });
    }

    if (this.shape === 'trapezoid') {
      plans.push({
        name: 'Xen kẽ (Đảo chiều)',
        priority: P_STAGGERED,
        qty: 0,
        items: fillTrapezoidAlternating(this.printW, this.printH, this.iW, this.iH),
      });
    }

    // Generic plans for other shapes
    if (!isSpecialShape && this.shape !== 'circle') {
      const items = fillGenericFlipped(this.printW, this.printH, this.iW, this.iH);
      if (items.length > 0) {
        plans.push({ name: 'Xen kẽ đảo chiều', priority: P_FLIPPED, qty: 0, items });
      }
    }

    if (!isSpecialShape && this.shape !== 'circle') {
      const items = fillGenericStaggered(this.printW, this.printH, this.iW, this.iH);
      if (items.length > 0) {
        plans.push({ name: 'So le (Staggered)', priority: P_STAGGERED, qty: 0, items });
      }
    }

    // Rotated 45°
    {
      const origW = this.iW - this.padding;
      const origH = this.iH - this.padding;
      const items = fillRotated45(this.printW, this.printH, origW, origH, this.padding);
      if (items.length > 0) {
        plans.push({ name: 'Xoay 45°', priority: P_ROT45, qty: 0, items });
      }
    }

    // Calculate quantities and center items
    for (const p of plans) {
      p.qty = p.items.length;
      p.items = centerItems(p.items, this.pageW, this.pageH);
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
      const h = hashPlan(p.items);
      if (!seenHashes.has(h)) {
        seenHashes.add(h);
        unique.push(p);
      }
    }

    return unique.slice(0, 10);
  }
}

/**
 * Main function to calculate layout plans
 */
export function calculateLayout(config: SolverConfig): LayoutPlan[] {
  const adjustedConfig = { ...config };
  if (config.shape === 'circle') {
    adjustedConfig.itemH = config.itemW;
  }

  if (adjustedConfig.itemW <= 0 || adjustedConfig.itemH <= 0) {
    return [];
  }
  if (adjustedConfig.printW <= 0 || adjustedConfig.printH <= 0) {
    return [];
  }

  const solver = new LayoutSolver(adjustedConfig);
  return solver.solve();
}
