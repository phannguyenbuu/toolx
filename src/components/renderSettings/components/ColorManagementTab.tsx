import React from 'react';
import { Palette, Check, Sliders } from 'lucide-react';
import { TabComponentProps } from '../types';
import { ICC_PROFILE_CATALOG } from '../constants';

export const ColorManagementTab: React.FC<TabComponentProps> = ({
  settings,
  updateSetting,
  isLightMode,
  themeInner,
  themeInput,
  themeTextMuted,
}) => {
  return (
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
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
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
              const kMax = 0.498;
              const k = gcr * kMax;
              const denom = 1 - k || 1;
              const c = Math.max(0, (1 - 128 / 255 - k) / denom);
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
  );
};
