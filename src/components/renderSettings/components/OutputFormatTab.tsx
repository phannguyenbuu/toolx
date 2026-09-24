import React from 'react';
import { FileText, Sliders, Check } from 'lucide-react';
import { TabComponentProps } from '../types';

export const OutputFormatTab: React.FC<TabComponentProps> = ({
  settings,
  updateSetting,
  isLightMode,
  themeInner,
  themeTextMuted,
}) => {
  return (
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
  );
};
