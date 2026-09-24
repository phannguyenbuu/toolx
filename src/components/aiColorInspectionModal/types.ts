import { ColorInspectionReport } from '../../utils/aiColorInspection';
import { ColorAdjustSettings } from '../../utils/colorAdjustment';

export interface AIColorInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ColorInspectionReport | null;
  isAnalyzing: boolean;
  onApplyRecommendations: (settings: Partial<ColorAdjustSettings>) => void;
  activeHeatmapMode: 'none' | 'tac' | 'gamut' | 'tone';
  onToggleHeatmap: (mode: 'none' | 'tac' | 'gamut' | 'tone') => void;
  onRecheck: () => void;
  isLightMode: boolean;
  studioCanvas?: HTMLCanvasElement | null;
  currentSettings: ColorAdjustSettings;
}

export type InspectionActiveTab = 'compare' | 'inspect';
export type HeatmapMode = 'none' | 'tac' | 'gamut' | 'tone';
