import React, { useState, useRef, useEffect, useCallback } from 'react';
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

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

export const ImpositionLayerBar: React.FC<ImpositionLayerBarProps> = ({
  shapeTabs,
  activeTabId,
  setActiveTabId,
  setShapeTabs,
  setEditingLayerModalTab,
  setLayerModalName,
  setLayerModalColor,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleSelectTab = (tabId: string) => setActiveTabId(tabId);

  const handleContextMenu = (tabId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTabId(tabId);
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setContextMenu(null);

  const handleOpenLayerModal = useCallback((tab: ShapeTabItem) => {
    setEditingLayerModalTab(tab);
    setLayerModalName(tab.name);
    setLayerModalColor(tab.color || '#8b5cf6');
    closeMenu();
  }, [setEditingLayerModalTab, setLayerModalName, setLayerModalColor]);

  const handleToggleTabEnabled = useCallback((tabId: string) => {
    setShapeTabs(prev => prev.map(t => t.id === tabId ? { ...t, enabled: !t.enabled } : t));
    closeMenu();
  }, [setShapeTabs]);

  const handleDeleteTab = useCallback((tabId: string) => {
    setShapeTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && next.length > 0) setActiveTabId(next[0].id);
      return next;
    });
    closeMenu();
  }, [setShapeTabs, activeTabId, setActiveTabId]);

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
      autoRotateImage: false,
    };
    setShapeTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const contextTab = contextMenu ? shapeTabs.find(t => t.id === contextMenu.tabId) : null;

  return (
    <>
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
              onContextMenu={(e) => handleContextMenu(tab.id, e)}
              className={`relative flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
                isActive
                  ? 'px-3 py-1.5 rounded-t-xl border-t border-x border-b-0 -mb-[1px] bg-white text-slate-900 font-bold z-20'
                  : tab.enabled
                  ? 'px-2.5 py-1 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white text-slate-700 shadow-2xs mb-1'
                  : 'px-2.5 py-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-slate-400 opacity-60 mb-1'
              }`}
              style={isActive ? { borderColor: tabColor } : undefined}
              title="Click để chọn · Chuột phải để sửa/xoá/ẩn layer"
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

              {/* Eye indicator (small dot) if disabled */}
              {!tab.enabled && (
                <EyeOff size={10} className="text-slate-400 shrink-0" />
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

      {/* Right-click Context Menu */}
      {contextMenu && contextTab && (
        <div
          ref={menuRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 shrink-0"
              style={{ backgroundColor: contextTab.color || '#8b5cf6' }}
            />
            <span className="text-[11px] font-bold text-slate-700 truncate">{contextTab.name}</span>
          </div>

          {/* Menu Items */}
          <button
            type="button"
            onClick={() => handleOpenLayerModal(contextTab)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
          >
            <Edit3 size={13} />
            Đổi tên &amp; màu
          </button>

          <button
            type="button"
            onClick={() => handleToggleTabEnabled(contextTab.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
          >
            {contextTab.enabled ? <EyeOff size={13} /> : <Eye size={13} />}
            {contextTab.enabled ? 'Ẩn layer khỏi trang in' : 'Bật hiển thị layer'}
          </button>

          {shapeTabs.length > 1 && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <button
                type="button"
                onClick={() => handleDeleteTab(contextTab.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <X size={13} />
                Xoá layer này
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};
