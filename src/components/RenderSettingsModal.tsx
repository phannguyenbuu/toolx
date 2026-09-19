import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Palette,
  Maximize2,
  FileText,
  Cpu,
  Server,
  Zap,
  Printer,
  ShieldCheck,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

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

export interface RenderPreset {
  id: string;
  name: string;
  desc: string;
  icon: string;
  settings: Partial<AdvancedRenderSettings>;
}

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

interface RenderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdvancedRenderSettings;
  onSave: (newSettings: AdvancedRenderSettings) => void;
  isLightMode: boolean;
}

export const RenderSettingsModal: React.FC<RenderSettingsModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSave,
  isLightMode
}) => {
  const [activeTab, setActiveTab] = useState<'resolution' | 'color' | 'format' | 'engine'>('resolution');
  const [settings, setSettings] = useState<AdvancedRenderSettings>({ ...initialSettings });

  useEffect(() => {
    if (isOpen) {
      setSettings({ ...initialSettings });
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: RenderPreset) => {
    setSettings((prev) => ({ ...prev, ...preset.settings }));
  };

  const handleReset = () => {
    if (window.confirm('Đặt lại tất cả thông số cấu hình về mặc định chuẩn in Offset 300 DPI?')) {
      setSettings({ ...DEFAULT_RENDER_SETTINGS });
    }
  };

  const handleSaveAndApply = () => {
    onSave(settings);
    onClose();
  };

  // Theme classes
  const themeCard = isLightMode ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl';
  const themeHeader = isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850';
  const themeInner = isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/80 border-slate-800';
  const themeInput = isLightMode ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500' : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';
  const themeTextMuted = isLightMode ? 'text-slate-500' : 'text-slate-400';

  const currentDpi = settings.isCustomDpi ? settings.customDpi : settings.dpi;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
      <div className={`relative border rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden ${themeCard}`}>
        {/* MODAL HEADER */}
        <div className={`p-4 md:px-6 border-b flex items-center justify-between flex-shrink-0 ${themeHeader}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Cấu hình Thông số Render Vector & Prepress</h3>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                  128GB RAM Vector Core
                </span>
              </div>
              <p className={`text-xs ${themeTextMuted}`}>
                Thiết lập độ phân giải, hệ màu ICC, nén TIFF và máy render thực thi chuẩn in ấn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* PRESET QUICK SELECTOR BAR */}
        <div className={`px-4 md:px-6 py-2.5 border-b overflow-x-auto flex items-center gap-2 flex-shrink-0 text-xs ${isLightMode ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-900/90 border-slate-800'}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${themeTextMuted} flex items-center gap-1`}>
            <Sparkles size={13} className="text-amber-500" />
            <span>Mẫu cấu hình nhanh:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {RENDER_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
                  isLightMode
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 hover:border-indigo-500'
                    : 'bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-200 hover:border-indigo-400'
                }`}
                title={p.desc}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MODAL TABS NAVIGATION */}
        <div className={`px-4 md:px-6 border-b flex space-x-1 flex-shrink-0 ${themeHeader}`}>
          <button
            onClick={() => setActiveTab('resolution')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'resolution'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Maximize2 size={14} />
            <span>Độ phân giải & Kích thước</span>
          </button>

          <button
            onClick={() => setActiveTab('color')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'color'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Palette size={14} />
            <span>Hệ màu & ICC Prepress</span>
          </button>

          <button
            onClick={() => setActiveTab('format')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'format'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText size={14} />
            <span>Định dạng tệp & Nén</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'engine'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Cpu size={14} />
            <span>Trang & Máy render</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 text-xs">
          {/* ================= TAB 1: RESOLUTION & DIMENSIONS ================= */}
          {activeTab === 'resolution' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* DPI Section */}
              <div className={`p-4 rounded-2xl border space-y-4 ${themeInner}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Maximize2 size={16} className="text-indigo-500" />
                      <span>Độ phân giải kết xuất (DPI - Dots Per Inch)</span>
                    </h4>
                    <p className={`text-[11px] ${themeTextMuted}`}>
                      Quyết định độ sắc nét của chữ, đường mảnh vector và hình ảnh khi rasterize
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    {currentDpi} DPI
                  </span>
                </div>

                {/* Preset DPI buttons */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[72, 150, 200, 300, 400, 600].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        updateSetting('dpi', d);
                        updateSetting('isCustomDpi', false);
                      }}
                      className={`py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${
                        !settings.isCustomDpi && settings.dpi === d
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : `${isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-slate-850 hover:bg-slate-800 border-slate-700'} ${themeTextMuted}`
                      }`}
                    >
                      {d} DPI
                      <span className="block text-[9px] font-normal opacity-75">
                        {d === 72 ? 'Màn hình' : d === 150 ? 'Xem trước' : d === 200 ? 'In nhanh' : d === 300 ? 'In chuẩn' : d === 400 ? 'Chất lượng' : 'Siêu nét'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom DPI Input */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.isCustomDpi}
                      onChange={(e) => updateSetting('isCustomDpi', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span className="font-semibold text-xs">Nhập DPI tùy chỉnh theo yêu cầu kỹ thuật:</span>
                  </label>
                  {settings.isCustomDpi && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={50}
                        max={2400}
                        step={10}
                        value={settings.customDpi}
                        onChange={(e) => updateSetting('customDpi', Math.max(50, Math.min(2400, Number(e.target.value))))}
                        className={`w-28 p-2 rounded-xl border text-center font-bold ${themeInput}`}
                      />
                      <span className={themeTextMuted}>DPI (50 - 2400)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Anti-Aliasing & Quality */}
              <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Khử răng cưa & Làm mịn Vector (Anti-Aliasing)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Tắt (None)', desc: '1-bit, viền gai, tốc độ nhanh nhất' },
                    { id: 'low', label: 'Thấp (2x)', desc: 'Làm mịn cơ bản các nét cong' },
                    { id: 'medium', label: 'Tiêu chuẩn (4x)', desc: 'Mượt mà cho chữ và đồ họa' },
                    { id: 'high', label: 'Tối đa (8x)', desc: 'Siêu mịn, chuẩn in offset chất lượng cao' }
                  ].map((aa) => (
                    <div
                      key={aa.id}
                      onClick={() => updateSetting('antiAliasing', aa.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        settings.antiAliasing === aa.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : `${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} hover:border-indigo-300`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span>{aa.label}</span>
                        {settings.antiAliasing === aa.id && <Check size={14} />}
                      </div>
                      <p className={`text-[10px] font-normal leading-tight ${themeTextMuted}`}>{aa.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* No Tiling Mode (MuPDF Single-pass - 128GB RAM) */}
              <div className={`p-4 rounded-2xl border ${themeInner}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.noTiling}
                    onChange={(e) => updateSetting('noTiling', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck size={16} />
                      <span>Tuyệt đối không phân mảnh (Single-pass No-Tiling - Chuẩn 128GB RAM)</span>
                    </span>
                    <p className={`text-[11px] mt-1 leading-relaxed ${themeTextMuted}`}>
                      Load và kết xuất toàn bộ trang trong một lần xử lý nguyên khối trên bộ nhớ RAM lớn (128GB). Tránh hoàn toàn hiện tượng vỡ, gián đoạn các hiệu ứng phát sáng toàn màn hình (glow), đổ bóng (drop shadow) hoặc dải màu chuyển (smooth gradient) khi ghép các mảnh lại.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ================= TAB 2: COLOR & ICC PREPRESS ================= */}
          {activeTab === 'color' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Colorspace selection */}
              <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Palette size={16} className="text-indigo-500" />
                  <span>Không gian màu mục tiêu (Target Colorspace)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cmyk', label: 'CMYK (Chuẩn in ấn)', desc: 'Cyan, Magenta, Yellow, Black' },
                    { id: 'rgb', label: 'RGB (Màn hình/Web)', desc: 'Red, Green, Blue 8-bit' },
                    { id: 'gray', label: 'Grayscale (Trắng đen)', desc: '256 mức xám đơn sắc' },
                    { id: 'monochrome', label: 'Monochrome (1-bit)', desc: 'Chỉ đen và trắng thuần' }
                  ].map((cs) => (
                    <div
                      key={cs.id}
                      onClick={() => {
                        updateSetting('colorspace', cs.id as any);
                        if (cs.id === 'cmyk') updateSetting('iccProfile', 'Japan Color 2001 Coated.icc');
                        else if (cs.id === 'rgb') updateSetting('iccProfile', 'sRGB Color Space Profile.icm');
                        else if (cs.id === 'gray') updateSetting('iccProfile', 'Dot Gain 15%.icc');
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        settings.colorspace === cs.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : `${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} hover:border-indigo-300`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span>{cs.label}</span>
                        {settings.colorspace === cs.id && <Check size={14} />}
                      </div>
                      <p className={`text-[10px] font-normal leading-tight ${themeTextMuted}`}>{cs.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ICC Profile Catalog */}
              <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                    <input
                      type="checkbox"
                      checked={settings.useIcc}
                      onChange={(e) => updateSetting('useIcc', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>Áp dụng Cấu hình màu ICC Profile chuyên nghiệp</span>
                  </label>
                  <span className={`text-[10px] ${themeTextMuted}`}>Chuẩn hóa phổ màu theo nhà in</span>
                </div>

                {settings.useIcc && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${themeTextMuted}`}>
                        Chọn ICC Profile ({settings.colorspace.toUpperCase()}):
                      </label>
                      <select
                        value={settings.iccProfile}
                        onChange={(e) => updateSetting('iccProfile', e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-semibold ${themeInput}`}
                      >
                        {((ICC_PROFILE_CATALOG as any)[settings.colorspace] || ICC_PROFILE_CATALOG.cmyk).map((p: any) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rendering Intent */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${themeTextMuted}`}>
                          Phương pháp phối màu (Rendering Intent):
                        </label>
                        <select
                          value={settings.renderingIntent}
                          onChange={(e) => updateSetting('renderingIntent', e.target.value as any)}
                          className={`w-full p-2 rounded-xl border text-xs ${themeInput}`}
                        >
                          <option value="relative_colorimetric">Relative Colorimetric (Đo màu tương đối - Khuyên dùng in ấn)</option>
                          <option value="perceptual">Perceptual (Cảm quan - Giữ quan hệ màu ảnh chụp)</option>
                          <option value="saturation">Saturation (Độ bão hòa - Đồ họa biểu đồ rực rỡ)</option>
                          <option value="absolute_colorimetric">Absolute Colorimetric (Đo màu tuyệt đối - Proof giả lập giấy)</option>
                        </select>
                      </div>

                      {/* Black Point Compensation & Overprint */}
                      <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.blackPointCompensation}
                            onChange={(e) => updateSetting('blackPointCompensation', e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium">Bù điểm đen (Black Point Compensation - BPC)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.overprintSimulation}
                            onChange={(e) => updateSetting('overprintSimulation', e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 font-semibold">
                            Mô phỏng in đè (Overprint Black / Spot Colors)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GCR Slider — chỉ hiện khi CMYK */}
              {settings.colorspace === 'cmyk' && (
                <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Sliders size={16} className="text-violet-500" />
                      <span>GCR — Thay thế thành phần xám (Gray Component Replacement)</span>
                    </h4>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                      settings.gcrLevel >= 80
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                        : settings.gcrLevel >= 40
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                      {settings.gcrLevel}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={settings.gcrLevel}
                      onChange={(e) => updateSetting('gcrLevel', Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-violet-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">0% — Chỉ dùng C+M+Y</span>
                      <span className={`text-[10px] ${themeTextMuted}`}>
                        {settings.gcrLevel < 30
                          ? 'Light GCR (như SWOP v2)'
                          : settings.gcrLevel < 70
                          ? 'Medium GCR'
                          : 'Heavy GCR'}
                      </span>
                      <span className="text-violet-600 dark:text-violet-400">100% — Tối đa mực K</span>
                    </div>
                  </div>

                  {/* Bảng ví dụ pixel xám */}
                  <div className={`rounded-xl p-3 text-[10px] font-mono space-y-1 ${
                    themeTextMuted
                  } ${isLightMode ? 'bg-slate-50 border border-slate-200' : 'bg-slate-900 border border-slate-800'}`}>
                    <p className="font-semibold text-[11px] mb-1 not-italic font-sans">
                      Ví dụ pixel xám R=G=B=128 với GCR={settings.gcrLevel}%:
                    </p>
                    {(() => {
                      const gcr = settings.gcrLevel / 100;
                      const kMax = 0.498; // 1 - 128/255
                      const k = gcr * kMax;
                      const denom = 1 - k || 1;
                      const c = Math.max(0, (1 - 128/255 - k) / denom);
                      return (
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'C', val: c, color: 'text-cyan-500' },
                            { label: 'M', val: c, color: 'text-pink-500' },
                            { label: 'Y', val: c, color: 'text-yellow-500' },
                            { label: 'K', val: k, color: 'text-slate-500' },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="text-center">
                              <div className={`font-bold text-sm ${color}`}>{label}</div>
                              <div>{Math.round(val * 100)}%</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <p className={`text-[9px] mt-1 ${themeTextMuted}`}>
                      💡 GCR thấp = màu trung thực hơn · GCR cao = tiết kiệm mực C/M/Y
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: OUTPUT FORMAT & COMPRESSION ================= */}
          {activeTab === 'format' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Output Format */}
              <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <FileText size={16} className="text-indigo-500" />
                  <span>Định dạng tệp kết xuất (Output Format)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'tiff', label: 'TIFF (.tif)', desc: 'Chuẩn công nghiệp in ấn, không nén hoặc nén lossless', badge: 'Chuẩn In' },
                    { id: 'png', label: 'PNG (.png)', desc: 'Nén không mất dữ liệu, hỗ trợ nền trong suốt', badge: 'Web/App' },
                    { id: 'jpeg', label: 'JPEG (.jpg)', desc: 'Nén nhỏ gọn, phù hợp gửi khách duyệt nhanh', badge: 'Xem trước' },
                    { id: 'pdf', label: 'PDF Rasterized', desc: 'Đóng gói lại PDF phẳng hóa chống lỗi font vector', badge: 'Đóng gói' }
                  ].map((fmt) => (
                    <div
                      key={fmt.id}
                      onClick={() => updateSetting('outputFormat', fmt.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        settings.outputFormat === fmt.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : `${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} hover:border-indigo-300`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span>{fmt.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {fmt.badge}
                        </span>
                      </div>
                      <p className={`text-[10px] font-normal leading-tight ${themeTextMuted}`}>{fmt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Format-Specific Compression Options */}
              {settings.outputFormat === 'tiff' && (
                <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Sliders size={16} className="text-indigo-500" />
                    <span>Thuật toán nén ảnh TIFF (TIFF Compression)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'lzw', label: 'LZW', desc: 'Nén không mất dữ liệu, độ tương thích 100% trên mọi RIP/Photoshop' },
                      { id: 'deflate', label: 'Deflate (Zip)', desc: 'Tỷ lệ nén tốt hơn LZW cho file vector đồ họa phẳng' },
                      { id: 'packbits', label: 'PackBits', desc: 'Nén đơn giản chuẩn Macintosh' },
                      { id: 'none', label: 'None (Không nén)', desc: 'File dung lượng gốc, tốc độ ghi đĩa nhanh nhất' }
                    ].map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => updateSetting('compression', comp.id as any)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          settings.compression === comp.id
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                            : `${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} hover:border-indigo-300`
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span>{comp.label}</span>
                          {settings.compression === comp.id && <Check size={14} />}
                        </div>
                        <p className={`text-[10px] font-normal leading-tight ${themeTextMuted}`}>{comp.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settings.outputFormat === 'jpeg' && (
                <div className={`p-4 rounded-2xl border space-y-2 ${themeInner}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Chất lượng nén JPEG:</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{settings.jpegQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={settings.jpegQuality}
                    onChange={(e) => updateSetting('jpegQuality', Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className={`flex justify-between text-[10px] ${themeTextMuted}`}>
                    <span>50% (Nhỏ nhất)</span>
                    <span>95% (Chuẩn sắc nét)</span>
                    <span>100% (Tối đa)</span>
                  </div>
                </div>
              )}

              {/* Transparent Background Toggle */}
              <div className={`p-4 rounded-2xl border ${themeInner}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs">Nền trong suốt (Alpha Channel Transparency)</span>
                    <p className={`text-[11px] ${themeTextMuted}`}>
                      {settings.transparentBg
                        ? 'Đang bật nền trong suốt (không tô màu giấy trắng). Phù hợp cắt dán nhãn, decal, áo thun.'
                        : 'Đang tắt: Tự động lót nền trắng giấy (#FFFFFF) chuẩn in ấn xuất xưởng.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.transparentBg}
                    onChange={(e) => updateSetting('transparentBg', e.target.checked)}
                    className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ================= TAB 4: PAGES & ENGINE ================= */}
          {activeTab === 'engine' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Engine Selection */}
              <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Cpu size={16} className="text-indigo-500" />
                  <span>Máy render điều phối kết xuất (Render Engine)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'auto',
                      title: 'Tự động (Ưu tiên ToolxAgent)',
                      desc: 'Tự động chọn ToolxAgent nếu có, fallback Máy trạm khi dùng Mobile',
                      icon: <Zap size={18} className="text-amber-500" />
                    },
                    {
                      id: 'goagent',
                      title: 'ToolxAgent',
                      desc: 'Xử lý trực tiếp trên CPU máy tính của bạn trong 1 request duy nhất (0.5s)',
                      icon: <Cpu size={18} className="text-emerald-500" />
                    },
                    {
                      id: 'server',
                      title: 'Máy render chuyên dụng',
                      desc: 'Gửi file đến Máy render chuyên dụng kết xuất PyMuPDF công suất cao',
                      icon: <Server size={18} className="text-blue-500" />
                    }
                  ].map((eng) => (
                    <div
                      key={eng.id}
                      onClick={() => updateSetting('renderEngine', eng.id as any)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        settings.renderEngine === eng.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : `${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} hover:border-indigo-300`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {eng.icon}
                        <span className="text-xs">{eng.title}</span>
                      </div>
                      <p className={`text-[10px] font-normal leading-relaxed ${themeTextMuted}`}>{eng.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page Range Selection */}
              <div className={`p-4 rounded-2xl border space-y-3 ${themeInner}`}>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Printer size={16} className="text-indigo-500" />
                  <span>Phạm vi trang cần render (Page Range)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Tất cả các trang', desc: 'Kết xuất toàn bộ trang của tài liệu' },
                    { id: 'first', label: 'Chỉ trang đầu tiên', desc: 'Trang 1 / Trang bìa để xem trước nhanh' },
                    { id: 'custom', label: 'Phạm vi tùy chọn', desc: 'Nhập dải trang cụ thể (vd: 1-5, 8)' }
                  ].map((pr) => (
                    <div
                      key={pr.id}
                      onClick={() => updateSetting('pageRangeMode', pr.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        settings.pageRangeMode === pr.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : `${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} hover:border-indigo-300`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span>{pr.label}</span>
                        {settings.pageRangeMode === pr.id && <Check size={14} />}
                      </div>
                      <p className={`text-[10px] font-normal ${themeTextMuted}`}>{pr.desc}</p>
                    </div>
                  ))}
                </div>

                {settings.pageRangeMode === 'custom' && (
                  <div className="pt-2">
                    <label className={`block text-[11px] font-semibold mb-1 ${themeTextMuted}`}>
                      Nhập số trang (ví dụ: <code className="text-indigo-500 font-mono">1-3, 5, 8-10</code>):
                    </label>
                    <input
                      type="text"
                      placeholder="1-5, 8"
                      value={settings.customPageRange}
                      onChange={(e) => updateSetting('customPageRange', e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono ${themeInput}`}
                    />
                  </div>
                )}

                {/* Max Pages Limit */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs">Giới hạn số trang tối đa kết xuất:</span>
                    <p className={`text-[10px] ${themeTextMuted}`}>Bảo vệ hàng đợi trước các tệp PDF hàng trăm trang</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={settings.maxPages}
                      onChange={(e) => updateSetting('maxPages', Number(e.target.value))}
                      className={`p-2 rounded-xl border text-xs font-bold ${themeInput}`}
                    >
                      <option value={10}>10 trang</option>
                      <option value={20}>20 trang</option>
                      <option value={50}>50 trang (Mặc định)</option>
                      <option value={100}>100 trang</option>
                      <option value={500}>500 trang</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className={`p-4 md:px-6 border-t flex flex-wrap items-center justify-between gap-3 flex-shrink-0 ${themeHeader}`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <RotateCcw size={13} />
              <span>Đặt lại mặc định</span>
            </button>

            {/* Summary Tag */}
            <div className={`hidden sm:flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border font-mono ${themeInner}`}>
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>
                {currentDpi} DPI • {settings.colorspace.toUpperCase()} • {settings.outputFormat.toUpperCase()} {settings.outputFormat === 'tiff' ? settings.compression.toUpperCase() : ''} • {settings.noTiling ? 'No-Tiling' : 'Tiled'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition cursor-pointer active:scale-95"
            >
              <Check size={15} />
              <span>Áp dụng cấu hình</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
