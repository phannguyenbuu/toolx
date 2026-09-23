export interface RenderPdfPageProps {
  onClose?: () => void;
  initialFile?: File | null;
}

// Model tác vụ Render
export interface RenderDocItem {
  id: string;
  filename: string;
  dpi: number;
  colorspace: string;
  compression: string;
  created_at: string;
  duration: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  error_message?: string;
  thumbnail_url?: string;
  preview_url?: string;
  download_url?: string;
  convert_to_pdf?: boolean;
  profile_name?: string;
  worker_name?: string;
}

export interface RenderNode {
  agent_uid: string;
  hostname: string;
  is_online: boolean;
  last_seen_at?: string;
  local_ip?: string;
  public_ip?: string;
}

// Thông số chẩn đoán
export interface DiagData {
  is_online: boolean;
  hostname: string;
  os: string;
  cpu_usage: number;
  ram_used_gb: number;
  ram_total_gb: number;
  last_heartbeat?: string;
}

// Offline Page Metadata
export interface OfflinePageMeta {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  widthMm: number;
  heightMm: number;
  thumbnailUrl?: string;
}

export interface RenderSuccessModalState {
  isOpen: boolean;
  filename: string;
  totalPages: number;
  durationSec: string;
  dpi: number;
  colorspace: string;
  downloadUrl: string;
  previewUrl: string;
  isPdf: boolean;
  engineName: string;
}

export interface SlicingWarningInfo {
  hasSlicing: boolean;
  stripCount: number;
  producer?: string;
  hasIndexed?: boolean;
  autoSelectedProfile?: string;
}

export const ICC_PROFILES = {
  cmyk: [
    { value: 'JapanColor2001Coated.icc', label: 'Japan Color 2001 Coated (Mặc định)' },
    { value: 'JapanColor2001Uncoated.icc', label: 'Japan Color 2001 Uncoated' },
    { value: 'USWebCoatedSWOP.icc', label: 'U.S. Web Coated (SWOP) v2' },
    { value: 'USWebUncoated.icc', label: 'U.S. Web Uncoated v2' },
    { value: 'CoatedFOGRA39.icc', label: 'Coated FOGRA39 (ISO 12647-2:2004)' },
    { value: 'UncoatedFOGRA29.icc', label: 'Uncoated FOGRA29 (ISO 12647-2:2004)' },
    { value: 'WebCoatedFOGRA28.icc', label: 'Web Coated FOGRA28' },
    { value: 'ISOcoV2.icc', label: 'ISO Coated v2 (ECI)' }
  ],
  rgb: [
    { value: 'sRGB Color Space Profile.icm', label: 'sRGB Color Space Profile (Mặc định)' },
    { value: 'AdobeRGB1998.icc', label: 'Adobe RGB (1998)' },
    { value: 'AppleRGB.icc', label: 'Apple RGB' },
    { value: 'ColorMatchRGB.icc', label: 'ColorMatch RGB' },
    { value: 'ProPhoto.icc', label: 'ProPhoto RGB' }
  ]
};

export const BASE_DPI_OPTIONS = [
  { value: 72, label: '72 DPI' },
  { value: 150, label: '150 DPI' },
  { value: 300, label: '300 DPI' },
  { value: 450, label: '450 DPI' },
  { value: 600, label: '600 DPI' },
  { value: 1200, label: '1200 DPI' }
];
