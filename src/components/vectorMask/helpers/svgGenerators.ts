import { VectorKnot } from '../types';
import { uid, generatePresetKnots } from './shapePresets';

export const generatePathData = (knots: VectorKnot[]): string => {
  if (knots.length < 2) return '';
  let d = `M ${knots[0].x.toFixed(2)} ${knots[0].y.toFixed(2)}`;
  for (let i = 1; i < knots.length; i++) {
    const k = knots[i];
    d += ` L ${k.x.toFixed(2)} ${k.y.toFixed(2)}`;
  }
  d += ' Z';
  return d;
};

export const generateExportSvg = (
  maskW: number,
  maskH: number,
  pathData: string,
  dieLineColor: string
): string => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${maskW}mm" height="${maskH}mm" viewBox="0 0 ${maskW} ${maskH}" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" fill="none" stroke="${dieLineColor}" stroke-width="0.2" vector-effect="non-scaling-stroke" />
</svg>`;
};

export const parseSvgToKnots = (
  svgText: string,
  maskW: number,
  maskH: number
): VectorKnot[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const polygonEl = doc.querySelector('polygon');
  const rectEl = doc.querySelector('rect');
  const circleEl = doc.querySelector('circle');

  if (polygonEl) {
    const pointsAttr = polygonEl.getAttribute('points') || '';
    const pairs = pointsAttr.trim().split(/[\s,]+/);
    const newKnots: VectorKnot[] = [];
    for (let i = 0; i < pairs.length; i += 2) {
      const x = parseFloat(pairs[i]);
      const y = parseFloat(pairs[i + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        newKnots.push({ id: uid(), x, y });
      }
    }
    if (newKnots.length >= 3) {
      return newKnots;
    }
  } else if (rectEl) {
    const w = parseFloat(rectEl.getAttribute('width') || '100');
    const h = parseFloat(rectEl.getAttribute('height') || '100');
    const x = parseFloat(rectEl.getAttribute('x') || '0');
    const y = parseFloat(rectEl.getAttribute('y') || '0');
    return [
      { id: uid(), x, y },
      { id: uid(), x: x + w, y },
      { id: uid(), x: x + w, y: y + h },
      { id: uid(), x: 0, y: y + h }
    ];
  } else if (circleEl) {
    const cx = parseFloat(circleEl.getAttribute('cx') || '50');
    const cy = parseFloat(circleEl.getAttribute('cy') || '50');
    const r = parseFloat(circleEl.getAttribute('r') || '50');
    return generatePresetKnots('circle', r * 2, r * 2).map((k) => ({
      ...k,
      x: k.x + (cx - r),
      y: k.y + (cy - r)
    }));
  }

  return generatePresetKnots('rect', maskW, maskH);
};
