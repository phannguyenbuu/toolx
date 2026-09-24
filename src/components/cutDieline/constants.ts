import { CutColorPreset } from './types';

// Preset cut colors commonly used in CAD / Cutting plotters
export const CUT_COLOR_PRESETS: CutColorPreset[] = [
  { label: 'Đỏ Die-Cut (Chuẩn)', value: '#FF0000', ring: 'ring-red-400' },
  { label: 'Hồng Magenta (ThruCut)', value: '#EC4899', ring: 'ring-pink-400' },
  { label: 'Xanh Cyan (Crease)', value: '#06B6D4', ring: 'ring-cyan-400' },
  { label: 'Xanh Lá (KissCut)', value: '#10B981', ring: 'ring-emerald-400' },
  { label: 'Đen Vector (CAD)', value: '#000000', ring: 'ring-slate-400' },
];
