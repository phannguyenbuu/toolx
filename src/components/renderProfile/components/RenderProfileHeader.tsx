import React from 'react';
import { Sliders, Copy, Trash2, X, Sparkles } from 'lucide-react';
import { RenderColorProfile, ThemeClasses } from '../types';

interface RenderProfileHeaderProps {
  isLightMode: boolean;
  theme: ThemeClasses;
  editingProfile: RenderColorProfile;
  profilesList: RenderColorProfile[];
  toastMessage: string | null;
  onSwitchProfile: (id: string) => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const RenderProfileHeader: React.FC<RenderProfileHeaderProps> = ({
  isLightMode,
  theme,
  editingProfile,
  profilesList,
  toastMessage,
  onSwitchProfile,
  onDuplicate,
  onSetDefault,
  onDelete,
  onClose
}) => {
  return (
    <>
      <div
        className={`p-3.5 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3 flex-shrink-0 ${
          isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/90 border-slate-800'
        }`}
      >
        {/* Title & Icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#999] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Sliders size={15} />
          </div>
          <h2 className="text-sm font-semibold tracking-tight whitespace-nowrap">Cấu hình Profile Render & Màu Sắc</h2>
        </div>

        {/* Profile Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
            <span className={`${theme.textMuted} whitespace-nowrap`}>Profile:</span>
            <select
              value={editingProfile.id}
              onChange={(e) => onSwitchProfile(e.target.value)}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium ${theme.input}`}
            >
              {profilesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isDefault ? '⭐ [Mặc định]' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onDuplicate}
            className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
              isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Nhân bản profile này để tạo cấu hình mới"
          >
            <Copy size={13} className="text-slate-400" />
            <span className="hidden sm:inline whitespace-nowrap">Nhân bản</span>
          </button>

          {!editingProfile.isDefault && (
            <button
              onClick={onSetDefault}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Đặt làm profile mặc định"
            >
              <span className="text-amber-500">⭐</span>
              <span className="hidden sm:inline whitespace-nowrap">Đặt mặc định</span>
            </button>
          )}

          {!editingProfile.isPreset && (
            <button
              onClick={onDelete}
              className="p-1.5 px-2 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium transition cursor-pointer"
              title="Xóa profile tùy chỉnh này"
            >
              <Trash2 size={13} />
            </button>
          )}

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isLightMode ? 'hover:bg-slate-200 border-slate-200 text-slate-600' : 'hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="bg-[#999] text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-xs animate-in fade-in">
          <Sparkles size={13} className="text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
