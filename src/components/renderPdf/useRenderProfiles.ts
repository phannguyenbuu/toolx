import { useState, useMemo, useCallback } from 'react';
import { RenderColorProfile } from '../../types/renderProfile';
import {
  getProfiles,
  getActiveProfile,
  setActiveProfileId,
  saveProfile
} from '../../services/renderProfileService';
import {
  AdvancedRenderSettings,
  DEFAULT_RENDER_SETTINGS,
  RENDER_PRESETS
} from '../RenderSettingsModal';
import { ColorAdjustSettings } from '../../utils/colorAdjustment';
import { BASE_DPI_OPTIONS } from './types';

export interface UseRenderProfilesProps {
  setColorSettings?: (settings: ColorAdjustSettings) => void;
  renderEngine?: 'auto' | 'goagent' | 'server';
  setRenderEngine?: (eng: 'auto' | 'goagent' | 'server') => void;
  handleSelectRenderOption?: (engine: 'auto' | 'goagent' | 'server', nodeUid: string) => void;
}

export function useRenderProfiles(props: UseRenderProfilesProps = {}) {
  const {
    setColorSettings,
    renderEngine,
    setRenderEngine,
    handleSelectRenderOption
  } = props;

  const [profilesList, setProfilesList] = useState<RenderColorProfile[]>(() => getProfiles());
  const [activeProfile, setActiveProfile] = useState<RenderColorProfile>(() => getActiveProfile());
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedRenderSettings>({ ...DEFAULT_RENDER_SETTINGS });

  const [cloudDpi, setCloudDpi] = useState<number>(300);
  const [useIcc, setUseIcc] = useState<boolean>(true);
  const [colorspace, setColorspace] = useState<'rgb' | 'cmyk'>('cmyk');
  const [selectedProfile, setSelectedProfile] = useState<string>('JapanColor2001Coated.icc');
  const [compression, setCompression] = useState<'lzw' | 'deflate'>('lzw');
  const [convertToPdf, setConvertToPdf] = useState<boolean>(true);
  const [dpiOptions, setDpiOptions] = useState<Array<{ value: number; label: string }>>(BASE_DPI_OPTIONS);

  const [isAdvancedPanelExpanded, setIsAdvancedPanelExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('toolx_render_advanced_panel_expanded') === 'true';
    }
    return false;
  });

  const toggleAdvancedPanel = useCallback(() => {
    setIsAdvancedPanelExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('toolx_render_advanced_panel_expanded', String(next));
      }
      return next;
    });
  }, []);

  const handleSaveAdvancedSettings = useCallback((newSettings: AdvancedRenderSettings) => {
    setAdvancedSettings(newSettings);

    const effectiveDpi = newSettings.isCustomDpi ? newSettings.customDpi : newSettings.dpi;
    setCloudDpi(effectiveDpi);
    setUseIcc(newSettings.useIcc);
    if (newSettings.colorspace === 'cmyk') {
      setColorspace('cmyk');
    } else {
      setColorspace('rgb');
    }
    setSelectedProfile(newSettings.iccProfile);
    setCompression(newSettings.compression === 'deflate' ? 'deflate' : 'lzw');
    setConvertToPdf(newSettings.outputFormat === 'pdf');
    if (newSettings.renderEngine && renderEngine && newSettings.renderEngine !== renderEngine) {
      if (newSettings.renderEngine === 'server') {
        if (setRenderEngine) setRenderEngine('server');
        try {
          localStorage.setItem('preferred_render_engine', 'server');
        } catch {}
      } else if (handleSelectRenderOption) {
        handleSelectRenderOption(newSettings.renderEngine, 'auto');
      }
    }

    setActiveProfile((prev) => ({
      ...prev,
      renderSettings: newSettings
    }));
  }, [renderEngine, setRenderEngine, handleSelectRenderOption]);

  const handleSelectProfileById = useCallback((id: string) => {
    setActiveProfileId(id);
    const list = getProfiles();
    setProfilesList(list);
    const found = list.find((p) => p.id === id) || list[0];
    if (found) {
      setActiveProfile(found);
      handleSaveAdvancedSettings(found.renderSettings);
      if (setColorSettings) {
        setColorSettings(found.colorSettings);
      }
    }
  }, [handleSaveAdvancedSettings, setColorSettings]);

  const handleToggleColorFilter = useCallback(() => {
    const nextProfile: RenderColorProfile = {
      ...activeProfile,
      colorFilterEnabled: !activeProfile.colorFilterEnabled
    };
    const saved = saveProfile(nextProfile);
    setActiveProfile(saved);
    setProfilesList(getProfiles());
  }, [activeProfile]);

  const handleApplyPreset = useCallback((presetId: string) => {
    const preset = RENDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const updated: AdvancedRenderSettings = {
      ...advancedSettings,
      ...preset.settings,
      renderEngine: advancedSettings.renderEngine
    };
    handleSaveAdvancedSettings(updated);

    if (presetId === 'gcr_22_swop') {
      try {
        handleSelectProfileById('preset_gcr_22');
      } catch {}
    }
  }, [advancedSettings, handleSaveAdvancedSettings, handleSelectProfileById]);

  const currentActivePresetId = useMemo(() => {
    if (
      activeProfile.id === 'preset_gcr_22' ||
      advancedSettings.gcrLevel === 22 ||
      advancedSettings.iccProfile?.includes('SWOP')
    ) {
      return 'gcr_22_swop';
    }

    const exactMatched = RENDER_PRESETS.find(
      (p) =>
        advancedSettings.dpi === p.settings.dpi &&
        advancedSettings.colorspace === p.settings.colorspace &&
        (p.settings.iccProfile ? advancedSettings.iccProfile === p.settings.iccProfile : true) &&
        advancedSettings.outputFormat === p.settings.outputFormat
    );
    if (exactMatched) return exactMatched.id;

    const matched = RENDER_PRESETS.find(
      (p) =>
        advancedSettings.dpi === p.settings.dpi &&
        advancedSettings.colorspace === p.settings.colorspace &&
        advancedSettings.outputFormat === p.settings.outputFormat
    );
    return matched ? matched.id : '';
  }, [
    activeProfile.id,
    advancedSettings.dpi,
    advancedSettings.colorspace,
    advancedSettings.outputFormat,
    advancedSettings.gcrLevel,
    advancedSettings.iccProfile
  ]);

  return {
    profilesList,
    setProfilesList,
    activeProfile,
    setActiveProfile,
    profileModalOpen,
    setProfileModalOpen,
    advancedSettings,
    setAdvancedSettings,
    cloudDpi,
    setCloudDpi,
    useIcc,
    setUseIcc,
    colorspace,
    setColorspace,
    selectedProfile,
    setSelectedProfile,
    compression,
    setCompression,
    convertToPdf,
    setConvertToPdf,
    dpiOptions,
    setDpiOptions,
    isAdvancedPanelExpanded,
    toggleAdvancedPanel,
    handleSelectProfileById,
    handleToggleColorFilter,
    handleSaveAdvancedSettings,
    handleApplyPreset,
    currentActivePresetId
  };
}
