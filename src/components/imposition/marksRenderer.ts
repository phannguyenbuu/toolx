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
 * Dải màu CMYK nguyên bản của ToolX (10 ô màu: CMYK, RGB, 2 mức xám, trắng)
 */
export const CMYK_COLOR_BAR_COLORS = [
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#FFFF00', // Yellow
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#777777', // Xám đậm
  '#BBBBBB', // Xám nhạt
  '#FFFFFF', // Trắng
];

/**
 * Sinh chuỗi SVG Path biểu diễn ốc bo góc tờ in (Page Crop Marks)
 * Vẽ dạng góc L tại 4 góc tờ in với khoảng cách d (pageCropDist) và chiều dài l (pageCropLen)
 * Hoàn toàn đồng bộ với engine xuất file PDF ReportLab bên Python
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

  // Top-left corner (inset by d, arms of length l)
  p.push(`M ${d},${d} L ${d + l},${d}`);
  p.push(`M ${d},${d} L ${d},${d + l}`);

  // Top-right corner
  p.push(`M ${pageW - d},${d} L ${pageW - d - l},${d}`);
  p.push(`M ${pageW - d},${d} L ${pageW - d},${d + l}`);

  // Bottom-left corner
  p.push(`M ${d},${pageH - d} L ${d + l},${pageH - d}`);
  p.push(`M ${d},${pageH - d} L ${d},${pageH - d - l}`);

  // Bottom-right corner
  p.push(`M ${pageW - d},${pageH - d} L ${pageW - d - l},${pageH - d}`);
  p.push(`M ${pageW - d},${pageH - d} L ${pageW - d},${pageH - d - l}`);

  return p.join(' ');
}
