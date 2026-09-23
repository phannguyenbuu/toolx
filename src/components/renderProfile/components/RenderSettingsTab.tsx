import React from 'react';
import { AdvancedRenderSettings, ThemeClasses } from '../types';
import { DpiResolutionCard } from './DpiResolutionCard';
import { ColorSpaceIccCard } from './ColorSpaceIccCard';
import { OutputFormatCard } from './OutputFormatCard';
import { RenderEngineCard } from './RenderEngineCard';

interface RenderSettingsTabProps {
  theme: ThemeClasses;
  renderSettings: AdvancedRenderSettings;
  onUpdateRenderSetting: <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => void;
}

export const RenderSettingsTab: React.FC<RenderSettingsTabProps> = ({
  theme,
  renderSettings,
  onUpdateRenderSetting
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 animate-in fade-in duration-150">
      {/* 1. Độ phân giải DPI & Tỉ lệ */}
      <DpiResolutionCard
        theme={theme}
        renderSettings={renderSettings}
        onUpdateRenderSetting={onUpdateRenderSetting}
      />

      {/* 2. Quản lý Hệ màu & ICC Profile */}
      <ColorSpaceIccCard
        theme={theme}
        renderSettings={renderSettings}
        onUpdateRenderSetting={onUpdateRenderSetting}
      />

      {/* 3. Định dạng xuất & Nén */}
      <OutputFormatCard
        theme={theme}
        renderSettings={renderSettings}
        onUpdateRenderSetting={onUpdateRenderSetting}
      />

      {/* 4. Máy render điều phối kết xuất */}
      <RenderEngineCard
        theme={theme}
        renderSettings={renderSettings}
        onUpdateRenderSetting={onUpdateRenderSetting}
      />
    </div>
  );
};
