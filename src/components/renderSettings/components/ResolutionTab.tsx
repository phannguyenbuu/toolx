import React from 'react';
import { Maximize2, Sparkles, Check, ShieldCheck } from 'lucide-react';
import { TabComponentProps } from '../types';

export const ResolutionTab: React.FC<TabComponentProps> = ({
  settings,
  updateSetting,
  isLightMode,
  themeInner,
  themeInput,
  themeTextMuted,
}) => {
  const currentDpi = settings.isCustomDpi ? settings.customDpi : settings.dpi;

  return (
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
  );
};
