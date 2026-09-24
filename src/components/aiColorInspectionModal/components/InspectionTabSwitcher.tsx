import React from 'react';
import { Camera, Sliders } from 'lucide-react';
import { InspectionActiveTab } from '../types';

interface InspectionTabSwitcherProps {
  activeTab: InspectionActiveTab;
  onTabChange: (tab: InspectionActiveTab) => void;
  themeCardInner: string;
  themeTextMuted: string;
}

export const InspectionTabSwitcher: React.FC<InspectionTabSwitcherProps> = ({
  activeTab,
  onTabChange,
  themeCardInner,
  themeTextMuted,
}) => {
  return (
    <div className={`px-5 pt-2 border-b flex items-center gap-3 ${themeCardInner}`}>
      <button
        onClick={() => onTabChange('compare')}
        className={`pb-2.5 px-2 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
          activeTab === 'compare'
            ? 'border-emerald-500 text-emerald-500'
            : `border-transparent ${themeTextMuted} hover:text-emerald-500`
        }`}
      >
        <Camera size={14} />
        <span>So sánh Bản PC & Bản in thực tế (Print Match)</span>
        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          Khuyên dùng
        </span>
      </button>

      <button
        onClick={() => onTabChange('inspect')}
        className={`pb-2.5 px-2 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
          activeTab === 'inspect'
            ? 'border-indigo-600 text-indigo-500'
            : `border-transparent ${themeTextMuted} hover:text-indigo-500`
        }`}
      >
        <Sliders size={14} />
        <span>Kiểm tra lỗi kỹ thuật Prepress (TAC & Gamut)</span>
      </button>
    </div>
  );
};
