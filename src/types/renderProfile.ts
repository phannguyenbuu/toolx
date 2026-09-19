import { AdvancedRenderSettings, DEFAULT_RENDER_SETTINGS } from '../components/RenderSettingsModal';
import { ColorAdjustSettings, DEFAULT_COLOR_SETTINGS } from '../utils/colorAdjustment';

export interface RenderColorProfile {
  id: string;
  name: string;
  machineName?: string;
  description: string;
  isDefault?: boolean;
  isPreset?: boolean;
  createdAt: string;
  updatedAt: string;

  // 1. Cấu hình Render
  renderSettings: AdvancedRenderSettings;

  // 2. Cấu hình Color (Bộ lọc & Tinh chỉnh màu sắc)
  colorFilterEnabled: boolean;
  colorSettings: ColorAdjustSettings;

  // 3. AI Vision Calibration Metadata
  aiCalibration?: {
    calibratedAt?: string;
    targetMachine?: string;
    detectedCast?: 'warm_red' | 'cool_cyan' | 'green' | 'yellow' | 'magenta' | 'neutral' | string;
    castDescription?: string;
    confidenceScore?: number;
    sampleImageUrl?: string;
    summary?: string;
    curvesMidtoneLift?: number;
    appliedToAllPages?: boolean;
  };
}

export const PRESET_PROFILES: RenderColorProfile[] = [
  {
    id: 'preset_default',
    name: 'Mặc định (Chuẩn Thiết Kế - Không Lọc)',
    machineName: 'Màn hình & Máy in số chuẩn',
    description: 'Xuất file gốc 300 DPI, Japan Color 2001 Coated, không áp dụng bộ lọc màu bù trừ.',
    isDefault: true,
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    renderSettings: { ...DEFAULT_RENDER_SETTINGS },
    colorFilterEnabled: false,
    colorSettings: { ...DEFAULT_COLOR_SETTINGS }
  },
  {
    id: 'preset_gcr_22',
    name: 'GCR 22%',
    machineName: 'Máy In Offset (SWOP v2)',
    description: 'Chuyển đổi hoàn hảo file gốc RGB sang chuẩn in CMYK không lỗi (U.S. Web Coated SWOP v2, GCR 22%, BPC, Single-pass No-Tiling chống sọc ảnh).',
    isDefault: false,
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    renderSettings: {
      ...DEFAULT_RENDER_SETTINGS,
      dpi: 300,
      colorspace: 'cmyk',
      useIcc: true,
      iccProfile: 'U.S. Web Coated (SWOP) v2.icc',
      renderingIntent: 'relative_colorimetric',
      blackPointCompensation: true,
      overprintSimulation: true,
      gcrLevel: 22,
      outputFormat: 'pdf',
      compression: 'lzw',
      noTiling: true
    },
    colorFilterEnabled: false,
    colorSettings: {
      ...DEFAULT_COLOR_SETTINGS,
      gcrLevel: 22
    }
  },
  {
    id: 'preset_machine_a_ricoh',
    name: 'Máy In A - Kỹ thuật số (Khử Ám Đỏ & Bù Sáng)',
    machineName: 'Máy In A (Ricoh Pro / Laser Màu)',
    description: 'Dành cho máy in hay bị ám đỏ tím (Magenta) và tối màu. Tự động giảm Red, bù Cyan +12, giảm Magenta -6, nâng nhẹ Midtone Curves.',
    isDefault: false,
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    renderSettings: {
      ...DEFAULT_RENDER_SETTINGS,
      dpi: 300,
      colorspace: 'cmyk',
      outputFormat: 'tiff',
      compression: 'lzw'
    },
    colorFilterEnabled: true,
    colorSettings: {
      ...DEFAULT_COLOR_SETTINGS,
      brightness: 4,
      contrast: 3,
      balanceCyanRed: -12, // Giảm đỏ, kéo về Cyan
      balanceMagentaGreen: 5, // Giảm magenta, bù green
      balanceYellowBlue: -4,
      cyan: 6,
      magenta: -8,
      yellow: 2,
      black: -2,
      red: -8,
      curveRGB: [
        { x: 0, y: 0 },
        { x: 128, y: 136 }, // Nâng midtone 3% khử sạm màu
        { x: 255, y: 255 }
      ]
    },
    aiCalibration: {
      calibratedAt: '2026-09-16T10:00:00.000Z',
      targetMachine: 'Máy In Kỹ Thuật Số A',
      detectedCast: 'warm_red',
      castDescription: 'Phát hiện máy in A bị ám đỏ Magenta (+12%) và tối hơn màn hình chuẩn 4%.',
      confidenceScore: 96,
      summary: 'Đã thiết lập bộ lọc bù trừ giảm đỏ, tăng Cyan và nâng sáng midtone.'
    }
  },
  {
    id: 'preset_machine_b_konicaminolta',
    name: 'Máy In B - Kỹ thuật số (Khử Ám Vàng & Tăng Đen K)',
    machineName: 'Máy In B (Konica Minolta / Fuji)',
    description: 'Dành cho máy in ra bị ám vàng, thiếu độ sâu màu đen. Bù lạnh Blue, tăng sắc nét và chiều sâu đen K.',
    isDefault: false,
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    renderSettings: {
      ...DEFAULT_RENDER_SETTINGS,
      dpi: 300,
      colorspace: 'cmyk',
      outputFormat: 'tiff',
      compression: 'lzw'
    },
    colorFilterEnabled: true,
    colorSettings: {
      ...DEFAULT_COLOR_SETTINGS,
      brightness: 2,
      contrast: 6,
      balanceYellowBlue: 10, // Giảm vàng, bù xanh Blue
      balanceCyanRed: 2,
      yellow: -10,
      black: 12, // Tăng đen
      saturation: 5,
      curveRGB: [
        { x: 0, y: 0 },
        { x: 64, y: 58 },
        { x: 192, y: 198 },
        { x: 255, y: 255 }
      ]
    },
    aiCalibration: {
      calibratedAt: '2026-09-16T10:00:00.000Z',
      targetMachine: 'Máy In Kỹ Thuật Số B',
      detectedCast: 'yellow',
      castDescription: 'Phát hiện máy in B bị ám vàng nhạt và đen K bị nhạt màu.',
      confidenceScore: 92,
      summary: 'Đã thiết lập bộ lọc giảm vàng, tăng độ đậm mực K và tăng tương phản.'
    }
  },
  {
    id: 'preset_offset_japan_color',
    name: 'In Offset Chuẩn (Japan Color 2001 Coated)',
    machineName: 'Máy In Offset Công Nghiệp',
    description: 'Chuẩn in ấn công nghiệp cho máy Offset. Bù sắc tố Cyan +8, tăng đen K +15, tối ưu dải tông trung bình (Midtone).',
    isDefault: false,
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    renderSettings: {
      ...DEFAULT_RENDER_SETTINGS,
      dpi: 300,
      colorspace: 'cmyk',
      iccProfile: 'Japan Color 2001 Coated.icc',
      renderingIntent: 'relative_colorimetric',
      blackPointCompensation: true,
      overprintSimulation: true,
      outputFormat: 'tiff',
      compression: 'lzw'
    },
    colorFilterEnabled: true,
    colorSettings: {
      ...DEFAULT_COLOR_SETTINGS,
      contrast: 8,
      cyan: 8,
      black: 15,
      saturation: 8
    }
  },
  {
    id: 'preset_packaging_vivid',
    name: 'In Bao Bì & Decal (Nền Trong Suốt - Rực Rỡ)',
    machineName: 'Máy In Tem Nhãn / Decal / Áo Thun',
    description: 'Nền trong suốt Alpha Channel, tăng rực rỡ màu sắc (Vivid) phù hợp bao bì hộp và tem nhãn bế decal.',
    isDefault: false,
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    renderSettings: {
      ...DEFAULT_RENDER_SETTINGS,
      dpi: 300,
      colorspace: 'rgb',
      outputFormat: 'png',
      transparentBg: true
    },
    colorFilterEnabled: true,
    colorSettings: {
      ...DEFAULT_COLOR_SETTINGS,
      brightness: 4,
      contrast: 12,
      saturation: 22,
      curveRGB: [
        { x: 0, y: 0 },
        { x: 64, y: 55 },
        { x: 192, y: 205 },
        { x: 255, y: 255 }
      ]
    }
  }
];
