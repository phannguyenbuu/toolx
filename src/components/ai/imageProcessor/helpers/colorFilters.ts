import React from 'react';
import { ColorMode } from '../types';

export const getColorFilterStyle = (
  mode: ColorMode,
  intensity: number
): React.CSSProperties => {
  switch (mode) {
    case 'grayscale':
      return { filter: `grayscale(${intensity}%)` };
    case 'sepia':
      return { filter: `sepia(${intensity}%)` };
    case 'invert':
      return { filter: `invert(${intensity}%)` };
    case 'brightness':
      return { filter: `brightness(${intensity}%)` };
    case 'contrast':
      return { filter: `contrast(${intensity}%)` };
    case 'saturate':
      return { filter: `saturate(${intensity}%)` };
    default:
      return {};
  }
};

export const applyColorEffectToImageData = (
  data: Uint8ClampedArray,
  mode: ColorMode,
  intensity: number
): void => {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    switch (mode) {
      case 'grayscale': {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = gray;
        break;
      }
      case 'sepia': {
        data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
        data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
        data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
        break;
      }
      case 'invert': {
        data[i] = 255 - r;
        data[i + 1] = 255 - g;
        data[i + 2] = 255 - b;
        break;
      }
      case 'brightness': {
        const factor = intensity / 100;
        data[i] = Math.min(255, r * factor);
        data[i + 1] = Math.min(255, g * factor);
        data[i + 2] = Math.min(255, b * factor);
        break;
      }
      case 'contrast': {
        const factor = (intensity / 100 - 0.5) * 2;
        const adjust = (c: number) =>
          Math.min(255, Math.max(0, ((c / 255 - 0.5) * (1 + factor) + 0.5) * 255));
        data[i] = adjust(r);
        data[i + 1] = adjust(g);
        data[i + 2] = adjust(b);
        break;
      }
      case 'saturate': {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const factor = intensity / 100;
        data[i] = Math.min(255, Math.max(0, gray + factor * (r - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + factor * (g - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + factor * (b - gray)));
        break;
      }
    }
  }
};
