import { ColorInspectionReport } from './types';

export interface PixelAnalysisResult {
  sampledCount: number;
  maxTac: number;
  avgTac: number;
  over300Ratio: number;
  over320Ratio: number;
  outOfGamutRatio: number;
  affectedTones: string[];
  blackCrushRatio: number;
  highlightBlowoutRatio: number;
  detectedCast: ColorInspectionReport['balance']['detectedCast'];
  castDescription: string;
  deviationScore: number;
}

export function analyzeCanvasPixels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): PixelAnalysisResult {
  const totalPixels = width * height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const targetSamples = 160000;
  const step = Math.max(1, Math.floor(Math.sqrt(totalPixels / targetSamples)));

  let sampledCount = 0;
  let maxTac = 0;
  let sumTac = 0;
  let tacOver300Count = 0;
  let tacOver320Count = 0;

  let outOfGamutCount = 0;
  const gamutTonesSet = new Set<string>();

  let blackCrushCount = 0;
  let highlightBlowoutCount = 0;

  let neutralCount = 0;
  let sumRedVsGreen = 0;
  let sumBlueVsGreen = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 20) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      sampledCount++;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const rN = r / 255;
      const gN = g / 255;
      const bN = b / 255;
      const maxVal = Math.max(rN, gN, bN);
      const k = 1 - maxVal;

      let c = 0, m = 0, yC = 0;
      if (k < 0.999) {
        c = (1 - rN - k) / (1 - k);
        m = (1 - gN - k) / (1 - k);
        yC = (1 - bN - k) / (1 - k);
      }
      const tacPercent = Math.round((c + m + yC + k) * 100);
      if (tacPercent > maxTac) maxTac = tacPercent;
      sumTac += tacPercent;

      if (tacPercent > 320) {
        tacOver320Count++;
        tacOver300Count++;
      } else if (tacPercent > 300) {
        tacOver300Count++;
      }

      const minVal = Math.min(rN, gN, bN);
      const chroma = maxVal - minVal;
      const saturation = maxVal > 0.001 ? chroma / maxVal : 0;

      if (saturation > 0.82 && maxVal > 0.4) {
        if (bN > 0.75 && gN < 0.35 && rN < 0.35) {
          outOfGamutCount++;
          gamutTonesSet.add('Xanh lam quang học (Electric Blue)');
        } else if (gN > 0.8 && rN < 0.35 && bN < 0.35) {
          outOfGamutCount++;
          gamutTonesSet.add('Xanh lục huỳnh quang (Neon Green)');
        } else if (rN > 0.85 && bN > 0.6 && gN < 0.2) {
          outOfGamutCount++;
          gamutTonesSet.add('Tím Magenta rực');
        } else if (rN > 0.9 && gN > 0.85 && bN < 0.15) {
          outOfGamutCount++;
          gamutTonesSet.add('Vàng tươi quang học');
        } else if (chroma > 0.85) {
          outOfGamutCount++;
          gamutTonesSet.add('Vùng bão hòa cực hạn');
        }
      }

      if (lum < 10) {
        blackCrushCount++;
      } else if (lum > 248) {
        highlightBlowoutCount++;
      }

      if (Math.abs(r - g) < 28 && Math.abs(b - g) < 28 && lum > 40 && lum < 220) {
        neutralCount++;
        sumRedVsGreen += (r - g);
        sumBlueVsGreen += (b - g);
      }
    }
  }

  if (sampledCount === 0) sampledCount = 1;

  const avgTac = Math.round(sumTac / sampledCount);
  const over300Ratio = (tacOver300Count / sampledCount) * 100;
  const over320Ratio = (tacOver320Count / sampledCount) * 100;
  const outOfGamutRatio = (outOfGamutCount / sampledCount) * 100;
  const blackCrushRatio = (blackCrushCount / sampledCount) * 100;
  const highlightBlowoutRatio = (highlightBlowoutCount / sampledCount) * 100;

  let detectedCast: ColorInspectionReport['balance']['detectedCast'] = 'neutral';
  let castDescription = 'Cân bằng xám rất chuẩn (Neutral Gray), không bị ám sắc.';
  let deviationScore = 0;

  if (neutralCount > 50) {
    const avgRG = sumRedVsGreen / neutralCount;
    const avgBG = sumBlueVsGreen / neutralCount;
    deviationScore = Math.round(Math.hypot(avgRG, avgBG));

    if (avgRG > 8 && avgBG < -4) {
      detectedCast = 'warm_red';
      castDescription = `Bản in có xu hướng hơi ám đỏ/ấm (+${Math.round(avgRG)} đơn vị).`;
    } else if (avgBG > 8 && avgRG < -4) {
      detectedCast = 'cool_cyan';
      castDescription = `Bản in có xu hướng hơi ám xanh lam/lạnh (+${Math.round(avgBG)} đơn vị).`;
    } else if (avgRG > 6 && avgBG > 6) {
      detectedCast = 'yellow';
      castDescription = `Bản in có xu hướng ám vàng nhẹ (+${Math.round((avgRG + avgBG) / 2)} đơn vị).`;
    } else if (avgRG < -7 && avgBG < -7) {
      detectedCast = 'green';
      castDescription = `Bản in có xu hướng ám xanh lục (+${Math.round(Math.abs(avgRG))} đơn vị).`;
    } else if (avgRG > 7 && avgBG > 7) {
      detectedCast = 'magenta';
      castDescription = 'Bản in có sắc tố tím/cánh sen nhẹ.';
    }
  }

  return {
    sampledCount,
    maxTac,
    avgTac,
    over300Ratio,
    over320Ratio,
    outOfGamutRatio,
    affectedTones: Array.from(gamutTonesSet),
    blackCrushRatio,
    highlightBlowoutRatio,
    detectedCast,
    castDescription,
    deviationScore
  };
}
