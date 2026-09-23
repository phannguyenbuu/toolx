import React, { useState } from 'react';
import { Layers, Edit3, Eye, EyeOff, X, Plus } from 'lucide-react';
import { ShapeTabItem, TAB_COLORS } from './types';

export interface ImpositionLayerBarProps {
  shapeTabs: ShapeTabItem[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  setShapeTabs: React.Dispatch<React.SetStateAction<ShapeTabItem[]>>;
  setEditingLayerModalTab: (tab: ShapeTabItem | null) => void;
  setLayerModalName: (name: string) => void;
  setLayerModalColor: (color: string) => void;
}

export const ImpositionLayerBar: React.FC<ImpositionLayerBarProps> = ({
  shapeTabs,
  activeTabId,
  setActiveTabId,
  setShapeTabs,
  setEditingLayerModalTab,
  setLayerModalName,
  setLayerModalColor
}) => {
  const [hoveredPencilTabId, setHoveredPencilTabId] = useState<string | null>(null);

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleTabMouseEnter = (tabId: string) => {
    setHoveredPencilTabId(tabId);
  };

  const handleTabMouseLeave = () => {
    setHoveredPencilTabId(null);
  };

  const handleOpenLayerModal = (tab: ShapeTabItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayerModalTab(tab);
    setLayerModalName(tab.name);
    setLayerModalColor(tab.color || '#8b5cf6');
  };

  const handleToggleTabEnabled = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShapeTabs(prev => prev.map(t => t.id === tabId ? { ...t, enabled: !t.enabled } : t));
  };

  const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShapeTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && next.length > 0) {
        setActiveTabId(next[0].id);
      }
      return next;
    });
  };

  const handleAddTab = () => {
    const nextChar = String.fromCharCode(65 + (shapeTabs.length % 26));
    const nextColor = TAB_COLORS[shapeTabs.length % TAB_COLORS.length] || '#8b5cf6';
    const newId = `shape_${Date.now()}`;
    const newTab: ShapeTabItem = {
      id: newId,
      name: `Hình ${nextChar}`,
      enabled: true,
      shape: 'rect',
      itemW: 50,
      itemH: 50,
      quantity: 1,
      useTotalLimit: false,
      cornerRadius: 0,
      sourceImage: null,
      vectorMaskResult: null,
      customSvgData: '',
      color: nextColor,
      canRotate: true,
      autoRotateImage: false
    };
    setShapeTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  return (
    <div className="flex flex-wrap items-end gap-2 mb-0 select-none pt-1 pb-0 relative z-10">
      {/* Layer Title */}
      <div className="flex items-center gap-1.5 shrink-0 pr-0.5 pb-1.5">
        <div className="w-5 h-5 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shadow-2xs">
          <Layers size={13} />
        </div>
        <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
          LAYER ({shapeTabs.length})
        </span>
      </div>

      {/* Vertical Separator */}
      <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5 mb-1.5" />

      {/* Tabs List (A, B, C...) */}
      {shapeTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const tabColor = tab.color || '#8b5cf6';

        return (
          <div
            key={tab.id}
            onClick={() => handleSelectTab(tab.id)}
            onMouseEnter={() => handleTabMouseEnter(tab.id)}
            onMouseLeave={handleTabMouseLeave}
            className={`group/tab relative flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
              isActive
                ? 'px-3 py-1.5 rounded-t-xl border-t border-x border-b-0 -mb-[1px] bg-white text-slate-900 font-bold z-20'
                : tab.enabled
                ? 'px-2.5 py-1 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white text-slate-700 shadow-2xs mb-1'
                : 'px-2.5 py-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-slate-400 opacity-60 mb-1'
            }`}
            style={isActive ? { borderColor: tabColor } : undefined}
          >
            {/* Active Tab Inverted Fillet Corners */}
            {isActive && (
              <>
                <div className="absolute -bottom-[1px] -left-[1px] -right-[1px] h-[2px] bg-white z-20 pointer-events-none" />
                <div className="absolute -left-[6px] -bottom-[1px] w-[6px] h-[6px] pointer-events-none z-20 overflow-visible">
                  <svg width="6" height="6" viewBox="0 0 6 6" className="block" fill="none">
                    <path d="M 0 6 Q 6 6 6 0 L 6 6 Z" fill="#ffffff" />
                    <path d="M 0 6 Q 6 6 6 0" fill="none" stroke={tabColor} strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute -right-[6px] -bottom-[1px] w-[6px] h-[6px] pointer-events-none z-20 overflow-visible">
                  <svg width="6" height="6" viewBox="0 0 6 6" className="block" fill="none">
                    <path d="M 0 0 Q 0 6 6 6 L 0 6 Z" fill="#ffffff" />
                    <path d="M 0 0 Q 0 6 6 6" fill="none" stroke={tabColor} strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </div>
              </>
            )}

            {/* Tab Color Indicator */}
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
              style={{ backgroundColor: tabColor }}
            />

            {/* Tab Name */}
            <span className="font-bold tracking-tight text-[11px]">
              {tab.name}
            </span>

            {/* Edit Name & Color Icon Button */}
            {hoveredPencilTabId === tab.id && (
              <button
                type="button"
                onClick={(e) => handleOpenLayerModal(tab, e)}
                className={`p-0.5 rounded transition-all animate-in fade-in zoom-in-95 duration-200 cursor-pointer ${
                  isActive ? 'hover:bg-violet-50 text-violet-600' : 'hover:bg-slate-100 text-slate-400'
                }`}
                title="Đổi tên & màu layer"
              >
                <Edit3 size={11} />
              </button>
            )}

            {/* Toggle Eye on/off button */}
            <button
              type="button"
              onClick={(e) => handleToggleTabEnabled(tab.id, e)}
              className={`p-0.5 rounded transition cursor-pointer ${
                tab.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
              }`}
              title={tab.enabled ? 'Đang bật (Click để ẩn layer khỏi trang in)' : 'Đang tắt (Click để bật lại)'}
            >
              {tab.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>

            {/* Delete Tab Button */}
            {shapeTabs.length > 1 && (
              <button
                type="button"
                onClick={(e) => handleDeleteTab(tab.id, e)}
                className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-rose-100 text-rose-500 transition cursor-pointer"
                title="Xoá layer này"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      {/* Quick Add Tab Button */}
      <button
        type="button"
        onClick={handleAddTab}
        className="flex items-center justify-center w-6 h-6 rounded-lg border border-dashed border-slate-300 hover:border-violet-400 text-slate-400 hover:text-violet-600 bg-slate-50/60 hover:bg-violet-50 transition cursor-pointer shrink-0 mb-1"
        title="Thêm layer mới"
      >
        <Plus size={13} />
      </button>
    </div>
  );
};
