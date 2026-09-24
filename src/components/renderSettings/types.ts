export interface AdvancedRenderSettings {
  // 1. Resolution & Scale
  dpi: number;
  customDpi: number;
  isCustomDpi: boolean;
  scalePercent: number; // 50..400%
  antiAliasing: 'none' | 'low' | 'medium' | 'high';
  noTiling: boolean; // Single-pass render 128GB RAM (no-tiling)

  // 2. Color Management
  colorspace: 'rgb' | 'cmyk' | 'gray' | 'monochrome';
  useIcc: boolean;
  iccProfile: string;
  renderingIntent: 'relative_colorimetric' | 'perceptual' | 'saturation' | 'absolute_colorimetric';
  blackPointCompensation: boolean;
  overprintSimulation: boolean;
  gcrLevel: number; // 0..100 (%) — Gray Component Replacement: bao nhiêu % mực K thay thế CMY

  // 3. Format & Compression
  outputFormat: 'tiff' | 'png' | 'jpeg' | 'pdf';
  compression: 'lzw' | 'deflate' | 'packbits' | 'none';
  jpegQuality: number; // 50..100
  transparentBg: boolean; // Alpha channel

  // 4. Page Range & Engine
  pageRangeMode: 'all' | 'first' | 'custom';
  customPageRange: string; // e.g. "1-3, 5"
  maxPages: number;
  renderEngine: 'auto' | 'goagent' | 'server';
}

export interface RenderPreset {
  id: string;
  name: string;
  desc: string;
  icon: string;
  settings: Partial<AdvancedRenderSettings>;
}

export interface RenderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdvancedRenderSettings;
  onSave: (newSettings: AdvancedRenderSettings) => void;
  isLightMode: boolean;
}

export interface TabComponentProps {
  settings: AdvancedRenderSettings;
  updateSetting: <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => void;
  isLightMode: boolean;
  themeInner: string;
  themeInput: string;
  themeTextMuted: string;
}
