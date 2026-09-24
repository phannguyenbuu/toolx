import React from 'react';
import { Cpu, Zap, Server, Printer, Check } from 'lucide-react';
import { TabComponentProps } from '../types';

export const EngineTab: React.FC<TabComponentProps> = ({
  settings,
  updateSetting,
  isLightMode,
  themeInner,
  themeInput,
  themeTextMuted,
}) => {
  return (
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
  );
};
