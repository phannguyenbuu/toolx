import React from 'react';
import {
  RenderColorProfile,
  ThemeClasses,
  CurveChannelType,
  ColorAdjustSettings,
  PrintMatchComparisonReport
} from '../types';
import { ColorFilterBanner } from './ColorFilterBanner';
import { ColorSubTabsNav } from './ColorSubTabsNav';
import { AutoAiColorSection } from './AutoAiColorSection';
import { ManualColorSection } from './ManualColorSection';
import { CurvesColorSection } from './CurvesColorSection';
import { BeforeAfterPreviewBar } from './BeforeAfterPreviewBar';
import { DEFAULT_COLOR_SETTINGS } from '../../../utils/colorAdjustment';

interface ColorSettingsTabProps {
  isLightMode: boolean;
  theme: ThemeClasses;
  editingProfile: RenderColorProfile;
  setEditingProfile: React.Dispatch<React.SetStateAction<RenderColorProfile>>;
  colorSubTab: 'auto' | 'manual' | 'curves';
  onSubTabChange: (subTab: 'auto' | 'manual' | 'curves') => void;
  curveChannel: CurveChannelType;
  onCurveChannelChange: (ch: CurveChannelType) => void;
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  printedPhotoBase64: string | null;
  setPrintedPhotoBase64: (val: string | null) => void;
  isComparingAI: boolean;
  aiReport: PrintMatchComparisonReport | null;
  aiError: string | null;
  onToggleColorFilter: (enabled: boolean) => void;
  onApplyQuickCastCorrection: (type: 'de_red' | 'de_cyan' | 'de_yellow' | 'shadow_lift') => void;
  onOpenApiKeyModal: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunAICalibration: () => void;
  onUpdateColorSetting: <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => void;
  showToast: (msg: string) => void;
}

export const ColorSettingsTab: React.FC<ColorSettingsTabProps> = ({
  isLightMode,
  theme,
  editingProfile,
  setEditingProfile,
  colorSubTab,
  onSubTabChange,
  curveChannel,
  onCurveChannelChange,
  showOriginal,
  setShowOriginal,
  previewCanvasRef,
  fileInputRef,
  printedPhotoBase64,
  setPrintedPhotoBase64,
  isComparingAI,
  aiReport,
  aiError,
  onToggleColorFilter,
  onApplyQuickCastCorrection,
  onOpenApiKeyModal,
  onFileUpload,
  onRunAICalibration,
  onUpdateColorSetting,
  showToast
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Master Filter Switch Banner */}
      <ColorFilterBanner
        theme={theme}
        colorFilterEnabled={editingProfile.colorFilterEnabled}
        onToggleColorFilter={onToggleColorFilter}
      />

      {/* Sub-Tabs: Auto & AI vs Manual vs Curves */}
      <ColorSubTabsNav
        isLightMode={isLightMode}
        theme={theme}
        colorSubTab={colorSubTab}
        onSubTabChange={onSubTabChange}
        onResetColors={() => {
          setEditingProfile((prev) => ({
            ...prev,
            colorSettings: { ...DEFAULT_COLOR_SETTINGS }
          }));
          showToast('Đã khôi phục cài đặt màu về mặc định');
        }}
      />

      {/* SECTION A: TỰ ĐỘNG & AI VISION */}
      {colorSubTab === 'auto' && (
        <AutoAiColorSection
          isLightMode={isLightMode}
          theme={theme}
          editingProfile={editingProfile}
          previewCanvasRef={previewCanvasRef}
          fileInputRef={fileInputRef}
          printedPhotoBase64={printedPhotoBase64}
          setPrintedPhotoBase64={setPrintedPhotoBase64}
          isComparingAI={isComparingAI}
          aiReport={aiReport}
          aiError={aiError}
          onApplyQuickCastCorrection={onApplyQuickCastCorrection}
          onOpenApiKeyModal={onOpenApiKeyModal}
          onFileUpload={onFileUpload}
          onRunAICalibration={onRunAICalibration}
        />
      )}

      {/* SECTION B: TINH CHỈNH THỦ CÔNG (SLIDERS) */}
      {colorSubTab === 'manual' && (
        <ManualColorSection
          theme={theme}
          colorSettings={editingProfile.colorSettings}
          onUpdateColorSetting={onUpdateColorSetting}
        />
      )}

      {/* SECTION C: PHOTOSHOP CURVES (LUT) */}
      {colorSubTab === 'curves' && (
        <CurvesColorSection
          isLightMode={isLightMode}
          theme={theme}
          colorSettings={editingProfile.colorSettings}
          curveChannel={curveChannel}
          onCurveChannelChange={onCurveChannelChange}
          onUpdateColorSetting={onUpdateColorSetting}
        />
      )}

      {/* LIVE BEFORE / AFTER PREVIEW BAR */}
      <BeforeAfterPreviewBar
        isLightMode={isLightMode}
        theme={theme}
        showOriginal={showOriginal}
        setShowOriginal={setShowOriginal}
        colorFilterEnabled={editingProfile.colorFilterEnabled}
      />
    </div>
  );
};
