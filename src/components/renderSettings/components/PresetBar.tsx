import React from 'react';
import { Sparkles } from 'lucide-react';
import { RenderPreset } from '../types';
import { RENDER_PRESETS } from '../constants';

interface PresetBarProps {
  onApplyPreset: (preset: RenderPreset) => void;
  isLightMode: boolean;
  themeTextMuted: string;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  onApplyPreset,
  isLightMode,
  themeTextMuted,
}) => {
  return (
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
            onClick={() => onApplyPreset(p)}
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
  );
};
