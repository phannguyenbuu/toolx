import React from 'react';
import { BoundingBox } from '../types';

export const getCanvasCoordinates = (
  e: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = img.width / rect.width;
  const scaleY = img.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
};

export const applySharpening = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const output = ctx.createImageData(width, height);
  const dst = output.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sy = y;
      const sx = x;
      const dstOff = (y * width + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = sy + cy - halfSide;
          const scx = sx + cx - halfSide;
          if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
            const srcOff = (scy * width + scx) * 4;
            const wt = weights[cy * side + cx];
            r += d[srcOff] * wt;
            g += d[srcOff + 1] * wt;
            b += d[srcOff + 2] * wt;
          }
        }
      }
      dst[dstOff] = Math.min(255, Math.max(0, r));
      dst[dstOff + 1] = Math.min(255, Math.max(0, g));
      dst[dstOff + 2] = Math.min(255, Math.max(0, b));
      dst[dstOff + 3] = d[dstOff + 3];
    }
  }
  ctx.putImageData(output, 0, 0);
};

export const redrawCanvas = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  boxes: BoundingBox[],
  currentBox: BoundingBox | null,
  selectedBoxId: string | null
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  // Draw saved boxes
  boxes.forEach((box) => {
    const isSelected = box.id === selectedBoxId;
    ctx.strokeStyle = isSelected ? '#ef4444' : '#3b82f6';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  });

  // Draw current box being drawn
  if (currentBox) {
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.fillRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
  }
};
