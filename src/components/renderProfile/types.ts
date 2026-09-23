import { RenderColorProfile } from '../../types/renderProfile';
import { AdvancedRenderSettings } from '../RenderSettingsModal';
import { ColorAdjustSettings } from '../../utils/colorAdjustment';
import { CurveChannelType } from '../ColorCurveEditor';
import { PrintMatchComparisonReport } from '../../utils/aiColorInspection';

export interface RenderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: RenderColorProfile;
  onSelectProfile: (profile: RenderColorProfile) => void;
  onSaveProfile: (profile: RenderColorProfile) => void;
  isLightMode: boolean;
  sampleCanvas?: HTMLCanvasElement | null;
  onApplyToAllPages?: (profile: RenderColorProfile) => void;
}

export interface ThemeClasses {
  modalBg: string;
  cardBg: string;
  cardInner: string;
  input: string;
  textMuted: string;
  textHead: string;
}

export function getThemeClasses(isLightMode: boolean): ThemeClasses {
  return {
    modalBg: isLightMode ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100',
    cardBg: isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-900/60 border-slate-800',
    cardInner: isLightMode ? 'bg-white border-slate-200/80' : 'bg-slate-950/60 border-slate-800/80',
    input: isLightMode
      ? 'bg-white border-slate-200 text-slate-800 focus:border-slate-400 focus:ring-1 focus:ring-slate-300'
      : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-600 focus:ring-1 focus:ring-slate-600',
    textMuted: isLightMode ? 'text-slate-500' : 'text-slate-400',
    textHead: isLightMode ? 'text-slate-900' : 'text-white'
  };
}

export type {
  RenderColorProfile,
  AdvancedRenderSettings,
  ColorAdjustSettings,
  CurveChannelType,
  PrintMatchComparisonReport
};
