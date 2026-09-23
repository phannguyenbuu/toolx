import React from 'react';
import { Cpu, Zap, Server } from 'lucide-react';
import { AdvancedRenderSettings, ThemeClasses } from '../types';

interface RenderEngineCardProps {
  theme: ThemeClasses;
  renderSettings: AdvancedRenderSettings;
  onUpdateRenderSetting: <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => void;
}

export const RenderEngineCard: React.FC<RenderEngineCardProps> = ({
  theme,
  renderSettings,
  onUpdateRenderSetting
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${theme.cardBg}`}>
      <div className="space-y-3">
        <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
          <Cpu size={15} className="text-slate-500" />
          <span className="whitespace-nowrap">Máy render kết xuất</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            {
              id: 'auto',
              title: 'Tự động (Ưu tiên ToolxAgent)',
              icon: <Zap size={14} className="text-amber-500 shrink-0" />
            },
            {
              id: 'goagent',
              title: 'ToolxAgent',
              icon: <Cpu size={14} className="text-emerald-500 shrink-0" />
            },
            {
              id: 'server',
              title: 'Máy render chuyên dụng',
              icon: <Server size={14} className="text-blue-500 shrink-0" />
            }
          ].map((eng) => (
            <div
              key={eng.id}
              onClick={() => onUpdateRenderSetting('renderEngine', eng.id as any)}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 whitespace-nowrap overflow-hidden ${
                renderSettings.renderEngine === eng.id
                  ? 'border-[#999] bg-[#999]/10 font-medium shadow-2xs'
                  : `${theme.cardInner} hover:border-slate-300 dark:hover:border-slate-700`
              }`}
              title={eng.title}
            >
              {eng.icon}
              <span className="text-xs font-medium whitespace-nowrap truncate">{eng.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
