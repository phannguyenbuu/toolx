import { PlanItem } from '../../utils/layoutSolver';
import { ImpositionConfig } from './types';

/**
 * Tính toán đường cắt góc (border-radius) hoặc clip-path cho từng hình dáng tem
 */
export const getShapeBorderRadius = (
  shape: string,
  cornerRadius: number,
  scale: number = 1
): string => {
  if (shape === 'circle' || shape === 'oval') return '50%';
  if (shape === 'custom-svg') return '0px';
  if (cornerRadius > 0) return Math.max(2, cornerRadius * scale) + 'px';
  if (shape === 'hexagon') return '15%';
  return '2px';
};

export const getShapeClipPath = (
  shape: string,
  cornerRadius: number,
  isFlipped: boolean = false
): string => {
  if (cornerRadius > 0) return 'none';

  if (shape === 'trapezoid') {
    return isFlipped
      ? 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)'
      : 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)';
  }
  if (shape === 'triangle') {
    return isFlipped
      ? 'polygon(0% 0%, 100% 0%, 50% 100%)'
      : 'polygon(50% 0%, 100% 100%, 0% 100%)';
  }
  if (shape === 'hexagon') {
    return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
  }
  return 'none';
};

/**
 * Sinh chuỗi SVG Path biểu diễn ốc xén (Crop Marks) dạng chữ L tại 4 góc của mỗi con tem
 */
export function generateItemCropMarksPath(
  items: PlanItem[],
  config: ImpositionConfig,
  isBackSide: boolean = false
): string {
  if (!config.useCrop || !items.length) return '';
  const { cropLen: l, cropDist: d } = config;
  const p: string[] = [];

  items.forEach(item => {
    const itemShape = (item.shape || config.shape) as string;
    const isItemSpecial = ['trapezoid', 'triangle', 'hexagon'].includes(itemShape);
    let w: number, h: number;
    if (itemShape === 'circle') {
      w = h = item.w !== undefined ? item.w : config.itemW;
    } else if (isItemSpecial) {
      w = item.w !== undefined ? item.w : config.itemW;
      h = item.h !== undefined ? item.h : config.itemH;
    } else {
      w = item.w !== undefined ? item.w : (item.rot ? config.itemH : config.itemW);
      h = item.h !== undefined ? item.h : (item.rot ? config.itemW : config.itemH);
    }

    // Mirror X for back side
    const x = isBackSide ? (config.pageW - item.x - w) : item.x;
    const y = item.y;

    // Top-left corner
    p.push(`M ${x - d - l},${y} L ${x - d},${y}`);
    p.push(`M ${x},${y - d - l} L ${x},${y - d}`);

    // Top-right corner
    p.push(`M ${x + w + d},${y} L ${x + w + d + l},${y}`);
    p.push(`M ${x + w},${y - d - l} L ${x + w},${y - d}`);

    // Bottom-left corner
    p.push(`M ${x - d - l},${y + h} L ${x - d},${y + h}`);
    p.push(`M ${x},${y + h + d} L ${x},${y + h + d + l}`);

    // Bottom-right corner
    p.push(`M ${x + w + d},${y + h} L ${x + w + d + l},${y + h}`);
    p.push(`M ${x + w},${y + h + d} L ${x + w},${y + h + d + l}`);
  });

  return p.join(' ');
}

/**
 * Sinh chuỗi SVG Path biểu diễn ốc bo góc tờ in (Page Crop Marks)
 */
export function generatePageCropMarksPath(
  pageW: number,
  pageH: number,
  cropLen: number = 10,
  cropDist: number = 5
): string {
  const p: string[] = [];
  const l = cropLen;
  const d = cropDist;

  // Top-left
  p.push(`M ${-d - l},0 L ${-d},0`);
  p.push(`M 0,${-d - l} L 0,${-d}`);

  // Top-right
  p.push(`M ${pageW + d},0 L ${pageW + d + l},0`);
  p.push(`M ${pageW},${-d - l} L ${pageW},${-d}`);

  // Bottom-left
  p.push(`M ${-d - l},${pageH} L ${-d},${pageH}`);
  p.push(`M 0,${pageH + d} L 0,${pageH + d + l}`);

  // Bottom-right
  p.push(`M ${pageW + d},${pageH} L ${pageW + d + l},${pageH}`);
  p.push(`M ${pageW},${pageH + d} L ${pageW},${pageH + d + l}`);

  return p.join(' ');
}
