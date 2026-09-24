import { VectorKnot, PresetShapeType } from '../types';

export const uid = (): string => Math.random().toString(36).substring(2, 9);

export const generatePresetKnots = (
  type: PresetShapeType,
  w: number,
  h: number
): VectorKnot[] => {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;

  switch (type) {
    case 'rect':
      return [
        { id: uid(), x: 0, y: 0 },
        { id: uid(), x: w, y: 0 },
        { id: uid(), x: w, y: h },
        { id: uid(), x: 0, y: h }
      ];

    case 'circle':
    case 'oval': {
      const numPoints = 16;
      const result: VectorKnot[] = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
        result.push({
          id: uid(),
          x: Math.round((cx + rx * Math.cos(angle)) * 100) / 100,
          y: Math.round((cy + ry * Math.sin(angle)) * 100) / 100,
          isCurved: true
        });
      }
      return result;
    }

    case 'triangle':
      return [
        { id: uid(), x: cx, y: 0 },
        { id: uid(), x: w, y: h },
        { id: uid(), x: 0, y: h }
      ];

    case 'trapezoid':
      return [
        { id: uid(), x: w * 0.2, y: 0 },
        { id: uid(), x: w * 0.8, y: 0 },
        { id: uid(), x: w, y: h },
        { id: uid(), x: 0, y: h }
      ];

    case 'hexagon': {
      const result: VectorKnot[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        result.push({
          id: uid(),
          x: Math.round((cx + rx * Math.cos(angle)) * 100) / 100,
          y: Math.round((cy + ry * Math.sin(angle)) * 100) / 100
        });
      }
      return result;
    }

    case 'star': {
      const result: VectorKnot[] = [];
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? rx : rx * 0.45;
        const angle = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        result.push({
          id: uid(),
          x: Math.round((cx + r * Math.cos(angle)) * 100) / 100,
          y: Math.round((cy + (r * (ry / rx)) * Math.sin(angle)) * 100) / 100
        });
      }
      return result;
    }

    case 'heart': {
      const result: VectorKnot[] = [];
      const numPoints = 20;
      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        );
        const nx = cx + (hx / 17) * rx;
        const ny = cy + ((hy + 2) / 18) * ry;
        result.push({
          id: uid(),
          x: Math.round(nx * 100) / 100,
          y: Math.round(ny * 100) / 100,
          isCurved: true
        });
      }
      return result;
    }

    case 'badge': {
      const result: VectorKnot[] = [];
      const waves = 12;
      for (let i = 0; i < waves * 2; i++) {
        const r = i % 2 === 0 ? rx : rx * 0.88;
        const angle = (i / (waves * 2)) * Math.PI * 2;
        result.push({
          id: uid(),
          x: Math.round((cx + r * Math.cos(angle)) * 100) / 100,
          y: Math.round((cy + r * (ry / rx) * Math.sin(angle)) * 100) / 100
        });
      }
      return result;
    }

    case 'arch':
      return [
        { id: uid(), x: 0, y: h },
        { id: uid(), x: 0, y: h * 0.4 },
        { id: uid(), x: w * 0.2, y: h * 0.1 },
        { id: uid(), x: cx, y: 0 },
        { id: uid(), x: w * 0.8, y: h * 0.1 },
        { id: uid(), x: w, y: h * 0.4 },
        { id: uid(), x: w, y: h }
      ];

    default:
      return [
        { id: uid(), x: 0, y: 0 },
        { id: uid(), x: w, y: 0 },
        { id: uid(), x: w, y: h },
        { id: uid(), x: 0, y: h }
      ];
  }
};
