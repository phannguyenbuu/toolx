import React from 'react';
import { Printer, Palette, Check } from 'lucide-react';
import { RenderColorProfile, ThemeClasses } from '../types';

interface ProfileInfoStripProps {
  isLightMode: boolean;
  theme: ThemeClasses;
  activeTab: 'render' | 'color';
  onTabChange: (tab: 'render' | 'color') => void;
  editingProfile: RenderColorProfile;
  onChangeName: (name: string) => void;
  onChangeMachineName: (machineName: string) => void;
}

export const ProfileInfoStrip: React.FC<ProfileInfoStripProps> = ({
  isLightMode,
  theme,
  activeTab,
  onTabChange,
  editingProfile,
  onChangeName,
  onChangeMachineName
}) => {
  return (
    <div
      className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 ${
        isLightMode ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
      }`}
    >
      {/* Tab Navigation: Render vs Color */}
      <div className="flex items-center gap-1 p-0.5 rounded-xl border bg-slate-200/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 whitespace-nowrap">
        <button
          onClick={() => onTabChange('render')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'render'
              ? 'bg-[#999] text-white shadow-xs'
              : `${theme.textMuted} hover:text-slate-900 dark:hover:text-white`
          }`}
        >
          <Printer size={13} />
          <span className="whitespace-nowrap">Thông số Render</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono whitespace-nowrap ${
              activeTab === 'render'
                ? 'bg-white/25'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {editingProfile.renderSettings.isCustomDpi
              ? editingProfile.renderSettings.customDpi
              : editingProfile.renderSettings.dpi}{' '}
            DPI
          </span>
        </button>

        <button
          onClick={() => onTabChange('color')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'color'
              ? 'bg-[#999] text-white shadow-xs'
              : `${theme.textMuted} hover:text-slate-900 dark:hover:text-white`
          }`}
        >
          <Palette size={13} />
          <span className="whitespace-nowrap">Cân màu & AI Vision</span>
          {editingProfile.colorFilterEnabled ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-medium flex items-center gap-0.5 whitespace-nowrap">
              <Check size={9} /> Bật lọc
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-500/15 text-slate-400 whitespace-nowrap">
              Tắt lọc
            </span>
          )}
        </button>
      </div>

      {/* Profile Name & Machine Input with subtle labels */}
      <div className="flex items-center gap-3 text-xs whitespace-nowrap">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className={`text-[11px] font-medium whitespace-nowrap ${theme.textMuted}`}>Tên:</span>
          <input
            type="text"
            value={editingProfile.name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Tên Profile..."
            className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium w-52 ${theme.input}`}
          />
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className={`text-[11px] font-medium whitespace-nowrap ${theme.textMuted}`}>Máy in:</span>
          <input
            type="text"
            value={editingProfile.machineName || ''}
            onChange={(e) => onChangeMachineName(e.target.value)}
            placeholder="vd: Ricoh C7200x..."
            className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium w-40 ${theme.input}`}
          />
        </div>
      </div>
    </div>
  );
};
