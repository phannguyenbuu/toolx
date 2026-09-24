import { VectorKnot } from '../types';

export const findNearestSegment = (
  knots: VectorKnot[],
  pos: { x: number; y: number },
  scale: number
): { index: number; x: number; y: number } | null => {
  if (knots.length < 2) return null;
  let minDistance = Infinity;
  let bestIndex = -1;
  let projPoint = { x: 0, y: 0 };

  for (let i = 0; i < knots.length; i++) {
    const p1 = knots[i];
    const p2 = knots[(i + 1) % knots.length];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const t = Math.max(0, Math.min(1, ((pos.x - p1.x) * dx + (pos.y - p1.y) * dy) / lenSq));
    const px = p1.x + t * dx;
    const py = p1.y + t * dy;

    const dist = Math.hypot(pos.x - px, pos.y - py);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
      projPoint = { x: Math.round(px * 100) / 100, y: Math.round(py * 100) / 100 };
    }
  }

  const pixelDist = minDistance * scale;
  if (pixelDist <= 16) {
    return { index: bestIndex, ...projPoint };
  }
  return null;
};

export const flipKnots = (
  knots: VectorKnot[],
  axis: 'h' | 'v',
  maskW: number,
  maskH: number
): VectorKnot[] => {
  return knots.map((k) => ({
    ...k,
    x: axis === 'h' ? Math.round((maskW - k.x) * 100) / 100 : k.x,
    y: axis === 'v' ? Math.round((maskH - k.y) * 100) / 100 : k.y
  }));
};

export const rotateKnots = (
  knots: VectorKnot[],
  deg: number,
  maskW: number,
  maskH: number
): VectorKnot[] => {
  const rad = (deg * Math.PI) / 180;
  const cx = maskW / 2;
  const cy = maskH / 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return knots.map((k) => {
    const rx = k.x - cx;
    const ry = k.y - cy;
    return {
      ...k,
      x: Math.round((cx + rx * cos - ry * sin) * 100) / 100,
      y: Math.round((cy + rx * sin + ry * cos) * 100) / 100
    };
  });
};

export const centerAlignKnots = (
  knots: VectorKnot[],
  maskW: number,
  maskH: number
): VectorKnot[] => {
  if (knots.length === 0) return knots;
  const xs = knots.map((k) => k.x);
  const ys = knots.map((k) => k.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const currentCx = (minX + maxX) / 2;
  const currentCy = (minY + maxY) / 2;
  const targetCx = maskW / 2;
  const targetCy = maskH / 2;
  const dx = targetCx - currentCx;
  const dy = targetCy - currentCy;

  return knots.map((k) => ({
    ...k,
    x: Math.round((k.x + dx) * 100) / 100,
    y: Math.round((k.y + dy) * 100) / 100
  }));
};

export const offsetMarginKnots = (
  knots: VectorKnot[],
  offset_mm: number,
  maskW: number,
  maskH: number
): VectorKnot[] => {
  if (knots.length === 0) return knots;
  const cx = maskW / 2;
  const cy = maskH / 2;

  return knots.map((k) => {
    const dx = k.x - cx;
    const dy = k.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return k;
    const factor = (dist + offset_mm) / dist;
    return {
      ...k,
      x: Math.round((cx + dx * factor) * 100) / 100,
      y: Math.round((cy + dy * factor) * 100) / 100
    };
  });
};
