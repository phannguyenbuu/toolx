import { ColorAdjustSettings } from '../colorAdjustment';

export interface ToneBalanceRow {
  cyanRed: number; // -100..100
  magentaGreen: number; // -100..100
  yellowBlue: number; // -100..100
}

export interface ToneBalanceTable {
  shadows: ToneBalanceRow;
  midtones: ToneBalanceRow;
  highlights: ToneBalanceRow;
}

export interface PrintMatchComparisonReport {
  summary: string;
  colorShiftDescription: string;
  toneBalance: ToneBalanceTable;
  curvesRecommendation: string;
  curvesMidtoneLift: number; // e.g. 3..5 (%)
  brightness: number; // -100..100
  contrast: number; // -100..100
  cmyk: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
  actionableSettings: Partial<ColorAdjustSettings>;
  rawAIResponse?: string;
}

export interface ColorInspectionReport {
  timestamp: string;
  score: number; // 0..100
  rating: 'Xuất sắc' | 'Đạt chuẩn in' | 'Cần lưu ý' | 'Nguy cơ lỗi in cao';
  ratingColor: string; // Tailwind class
  
  // Total Area Coverage (TAC / Total Ink Limit)
  tac: {
    max: number; // % e.g. 325%
    average: number;
    over300Percent: number; // % diện tích vượt 300%
    over320Percent: number; // % diện tích vượt 320%
    status: 'safe' | 'warning' | 'danger';
    message: string;
  };

  // Gamut Warning (RGB to CMYK Offset)
  gamut: {
    outOfGamutPercent: number; // % diện tích ngoài dải màu CMYK FOGRA39 / Japan Color
    status: 'safe' | 'warning' | 'danger';
    affectedTones: string[];
    message: string;
  };

  // Dynamic Range & Clipping
  tone: {
    blackCrushPercent: number; // Vùng tối mất chi tiết (Shadow clipping < 5%)
    highlightBlowoutPercent: number; // Vùng sáng cháy nét (Highlight clipping > 95%)
    dynamicRangeStatus: 'good' | 'compressed' | 'clipped';
    message: string;
  };

  // Color Balance / Gray Cast
  balance: {
    detectedCast: 'neutral' | 'warm_red' | 'cool_cyan' | 'green' | 'yellow' | 'magenta';
    castDescription: string;
    deviationScore: number;
  };

  // AI Suggestions & Auto-Fix Parameters
  aiRecommendations: {
    title: string;
    details: string[];
    actionableSettings: Partial<ColorAdjustSettings>;
  };

  aiSummaryText: string;
  toneBalanceTable?: ToneBalanceTable;
  chatGptCritique?: string;
}
