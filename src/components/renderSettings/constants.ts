import { AdvancedRenderSettings, RenderPreset } from './types';

export const DEFAULT_RENDER_SETTINGS: AdvancedRenderSettings = {
  dpi: 300,
  customDpi: 300,
  isCustomDpi: false,
  scalePercent: 100,
  antiAliasing: 'high',
  noTiling: true,

  colorspace: 'cmyk',
  useIcc: true,
  iccProfile: 'Japan Color 2001 Coated.icc',
  renderingIntent: 'relative_colorimetric',
  blackPointCompensation: true,
  overprintSimulation: true,
  gcrLevel: 100,

  outputFormat: 'tiff',
  compression: 'lzw',
  jpegQuality: 95,
  transparentBg: false,

  pageRangeMode: 'all',
  customPageRange: '',
  maxPages: 50,
  renderEngine: 'auto'
};

export const RENDER_PRESETS: RenderPreset[] = [
  {
    id: 'gcr_22_swop',
    name: 'GCR 22%',
    desc: '300 DPI CMYK SWOP v2, GCR 22% (Light GCR), BPC, No-Tiling (Khử dải đen đè chữ & sọc ảnh)',
    icon: '✨',
    settings: {
      dpi: 300,
      isCustomDpi: false,
      colorspace: 'cmyk',
      useIcc: true,
      iccProfile: 'U.S. Web Coated (SWOP) v2.icc',
      renderingIntent: 'relative_colorimetric',
      blackPointCompensation: true,
      overprintSimulation: true,
      gcrLevel: 22,
      outputFormat: 'pdf',
      compression: 'lzw',
      transparentBg: false,
      noTiling: true
    }
  },
  {
    id: 'offset_standard',
    name: 'In Offset Chuẩn',
    desc: '300 DPI CMYK, Japan Color 2001, TIFF LZW, Relative Colorimetric',
    icon: '🖨️',
    settings: {
      dpi: 300,
      isCustomDpi: false,
      colorspace: 'cmyk',
      useIcc: true,
      iccProfile: 'Japan Color 2001 Coated.icc',
      renderingIntent: 'relative_colorimetric',
      blackPointCompensation: true,
      overprintSimulation: true,
      outputFormat: 'tiff',
      compression: 'lzw',
      transparentBg: false,
      noTiling: true
    }
  },
  {
    id: 'digital_fast',
    name: 'In Nhanh Kỹ Thuật Số',
    desc: '200 DPI CMYK, ISO Coated v2 (FOGRA39), TIFF Deflate, Nền trắng',
    icon: '⚡',
    settings: {
      dpi: 200,
      isCustomDpi: false,
      colorspace: 'cmyk',
      useIcc: true,
      iccProfile: 'ISO Coated v2 (ECI) / FOGRA39',
      renderingIntent: 'relative_colorimetric',
      blackPointCompensation: true,
      overprintSimulation: false,
      outputFormat: 'tiff',
      compression: 'deflate',
      transparentBg: false,
      noTiling: true
    }
  },
  {
    id: 'proofing_hq',
    name: 'Proofing Siêu Nét',
    desc: '600 DPI CMYK, FOGRA51, TIFF LZW, In đè Overprint, Khử răng cưa tối đa',
    icon: '🎯',
    settings: {
      dpi: 600,
      isCustomDpi: false,
      colorspace: 'cmyk',
      useIcc: true,
      iccProfile: 'PSO Coated v3 (FOGRA51).icc',
      renderingIntent: 'relative_colorimetric',
      blackPointCompensation: true,
      overprintSimulation: true,
      antiAliasing: 'high',
      outputFormat: 'tiff',
      compression: 'lzw',
      transparentBg: false,
      noTiling: true
    }
  },
  {
    id: 'web_preview',
    name: 'Xem trước Web / Màn hình',
    desc: '150 DPI RGB, sRGB, PNG trong suốt, kết xuất siêu tốc',
    icon: '🌐',
    settings: {
      dpi: 150,
      isCustomDpi: false,
      colorspace: 'rgb',
      useIcc: true,
      iccProfile: 'sRGB Color Space Profile.icm',
      renderingIntent: 'perceptual',
      blackPointCompensation: false,
      overprintSimulation: false,
      outputFormat: 'png',
      compression: 'none',
      transparentBg: true,
      noTiling: true
    }
  },
  {
    id: 'pdf_flattened',
    name: 'Đóng gói PDF Phẳng hóa',
    desc: '300 DPI CMYK, xuất file PDF Rasterized chống nhảy font khi in',
    icon: '📄',
    settings: {
      dpi: 300,
      isCustomDpi: false,
      colorspace: 'cmyk',
      useIcc: true,
      iccProfile: 'Japan Color 2001 Coated.icc',
      outputFormat: 'pdf',
      compression: 'lzw',
      transparentBg: false,
      noTiling: true
    }
  }
];

export const ICC_PROFILE_CATALOG = {
  cmyk: [
    { value: 'Japan Color 2001 Coated.icc', label: 'Japan Color 2001 Coated (Chuẩn in Offset VN / Nhật)' },
    { value: 'ISO Coated v2 (ECI) / FOGRA39', label: 'ISO Coated v2 / FOGRA39 (Chuẩn Châu Âu phổ thông)' },
    { value: 'PSO Coated v3 (FOGRA51).icc', label: 'PSO Coated v3 / FOGRA51 (Chuẩn ISO 12647-2 mới)' },
    { value: 'U.S. Web Coated (SWOP) v2.icc', label: 'U.S. Web Coated (SWOP) v2 (Chuẩn in cuộn Mỹ)' },
    { value: 'GRACoL 2006 Coated1v2.icc', label: 'GRACoL 2006 Coated (Chuẩn thương mại Bắc Mỹ)' },
    { value: 'Japan Color 2001 Uncoated.icc', label: 'Japan Color 2001 Uncoated (In giấy Fort / Không tráng phủ)' }
  ],
  rgb: [
    { value: 'sRGB Color Space Profile.icm', label: 'sRGB IEC61966-2.1 (Chuẩn màn hình phổ thông)' },
    { value: 'AdobeRGB1998.icc', label: 'Adobe RGB (1998) (Dải màu rộng chuyên nghiệp)' },
    { value: 'Display P3.icc', label: 'Display P3 (Dải màu màn hình Apple/DCI-P3)' },
    { value: 'ProPhoto RGB.icc', label: 'ProPhoto RGB (Dải màu cực rộng cho nhiếp ảnh)' }
  ],
  gray: [
    { value: 'Dot Gain 15%.icc', label: 'Dot Gain 15% (Đơn sắc giấy Couche tráng phủ)' },
    { value: 'Dot Gain 20%.icc', label: 'Dot Gain 20% (Đơn sắc giấy Fort / Báo)' },
    { value: 'Gray Gamma 2.2.icm', label: 'Gray Gamma 2.2 (Chuẩn đồ họa kỹ thuật số)' }
  ]
};
