import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scissors, Upload, Eye, EyeOff, X, Layers, Edit3, Plus, Check } from 'lucide-react';
import { CropModalLayerTab, LAYER_COLOR_PRESETS } from './types';

export interface CropModalLayerBarProps {
  tabs: CropModalLayerTab[];
  currentTabId: string;
  currentImageSrc: string | null;
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
  bleedStatusMsg?: string | null;
  onSwitchTab: (tabId: string) => void;
  onAddTab: () => void;
  onDeleteTab: (tabId: string) => void;
  onToggleTab: (tabId: string) => void;
  onUpdateTab: (tabId: string, updates: Partial<CropModalLayerTab>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

export const CropModalLayerBar: React.FC<CropModalLayerBarProps> = ({
  tabs,
  currentTabId,
  currentImageSrc,
  showOriginal,
  setShowOriginal,
  bleedStatusMsg,
  onSwitchTab,
  onAddTab,
  onDeleteTab,
  onToggleTab,
  onUpdateTab,
  onFileSelect,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit layer modal state
  const [editingLayerTab, setEditingLayerTab] = useState<CropModalLayerTab | null>(null);
  const [editLayerName, setEditLayerName] = useState('');
  const [editLayerColor, setEditLayerColor] = useState('#8b5cf6');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
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

  const handleContextMenu = (tabId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSwitchTab(tabId);
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setContextMenu(null);

  const handleOpenEditModal = useCallback((tab: CropModalLayerTab) => {
    setEditingLayerTab(tab);
    setEditLayerName(tab.name);
    setEditLayerColor(tab.color || '#8b5cf6');
    closeMenu();
  }, []);

  const handleToggleTab = useCallback((tabId: string) => {
    onToggleTab(tabId);
    closeMenu();
  }, [onToggleTab]);

  const handleDeleteTab = useCallback((tabId: string) => {
    onDeleteTab(tabId);
    closeMenu();
  }, [onDeleteTab]);

  const handleSaveLayerEdit = () => {
    if (!editingLayerTab) return;
    const finalName = editLayerName.trim() || editingLayerTab.name;
    onUpdateTab(editingLayerTab.id, {
      name: finalName,
      color: editLayerColor,
    });
    setEditingLayerTab(null);
  };

  const contextTab = contextMenu ? tabs.find(t => t.id === contextMenu.tabId) : null;

  return (
    <>
      {/* HEADER */}
      <div className="px-5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
            <Scissors size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Ảnh nguồn</span>
              {bleedStatusMsg && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md animate-in fade-in">
                  {bleedStatusMsg}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf"
            onChange={onFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Upload size={14} />
            <span>{currentImageSrc ? 'Đổi ảnh khác' : 'Tải ảnh lên'}</span>
          </button>

          <button
            type="button"
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showOriginal
                ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                : 'bg-white hover:bg-amber-50 border-amber-200 text-amber-800'
            }`}
            title="Nhấn giữ để so sánh với ảnh gốc chưa chỉnh màu"
          >
            {showOriginal ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showOriginal ? 'Đang xem gốc' : 'Giữ xem gốc'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* SUBHEADER: LAYER MANAGEMENT TABS */}
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-100/80 flex items-center justify-between gap-3 select-none flex-wrap flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 w-full">
          <div className="flex items-center gap-1.5 shrink-0 pr-1">
            <div className="w-5 h-5 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shadow-2xs">
              <Layers size={12} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">
              LAYER ({tabs.length})
            </span>
          </div>

          <div className="w-px h-4 bg-slate-300 shrink-0 mx-0.5" />

          {tabs.map((tab) => {
            const isActive = tab.id === currentTabId;
            const tabColor = tab.color || '#8b5cf6';
            return (
              <div
                key={tab.id}
                onClick={() => onSwitchTab(tab.id)}
                onContextMenu={(e) => handleContextMenu(tab.id, e)}
                className={`relative flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 px-2.5 py-1 rounded-xl border ${
                  isActive
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : tab.enabled
                    ? 'bg-white/60 hover:bg-white text-slate-700 border-slate-200 shadow-2xs'
                    : 'bg-slate-200/50 border-dashed border-slate-300 text-slate-400 opacity-60'
                }`}
                style={{ borderColor: isActive ? tabColor : undefined }}
                title="Click để chọn · Chuột phải để sửa/xoá/ẩn layer"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                  style={{ backgroundColor: tabColor }}
                />
                <span className="font-bold tracking-tight text-[11px] max-w-[80px] truncate">
                  {tab.name}
                </span>

                {!tab.enabled && (
                  <EyeOff size={10} className="text-slate-400 shrink-0" />
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddTab}
            className="flex items-center justify-center w-6 h-6 rounded-lg border border-dashed border-slate-300 hover:border-violet-400 text-slate-400 hover:text-violet-600 bg-white/70 hover:bg-violet-50 transition cursor-pointer shrink-0"
            title="Thêm layer mới"
          >
            <Plus size={12} />
          </button>
        </div>
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
            onClick={() => handleOpenEditModal(contextTab)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
          >
            <Edit3 size={13} />
            Đổi tên &amp; màu
          </button>

          <button
            type="button"
            onClick={() => handleToggleTab(contextTab.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
          >
            {contextTab.enabled ? <EyeOff size={13} /> : <Eye size={13} />}
            {contextTab.enabled ? 'Ẩn layer khỏi trang in' : 'Bật hiển thị layer'}
          </button>

          {tabs.length > 1 && (
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

      {/* Edit Layer Modal Toast */}
      {editingLayerTab && (
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setEditingLayerTab(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-[340px] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs font-bold text-xs"
                  style={{ backgroundColor: editLayerColor }}
                >
                  {editLayerName.slice(0, 1).toUpperCase() || 'L'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Thuộc tính Layer</h4>
                  <span className="text-[10px] text-slate-400">Đổi tên & màu nhận diện</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLayerTab(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>Tên Layer</span>
                <span className="text-[9px] text-slate-400 font-normal">Tối đa 20 ký tự</span>
              </label>
              <input
                type="text"
                value={editLayerName}
                onChange={(e) => setEditLayerName(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLayerEdit();
                  if (e.key === 'Escape') setEditingLayerTab(null);
                }}
                autoFocus
                placeholder="Ví dụ: A, Tem tròn, Nhãn chai..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-500 bg-slate-50/50 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                <span>Màu đại diện</span>
                <span className="text-[10px] font-mono text-slate-500 font-medium uppercase">{editLayerColor}</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                {LAYER_COLOR_PRESETS.map((col) => {
                  const isSelected = editLayerColor.toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditLayerColor(col)}
                      className={`w-9 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center relative shadow-2xs hover:scale-105 active:scale-95 ${
                        isSelected ? 'ring-2 ring-offset-2 ring-slate-800 shadow-sm scale-105' : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: col }}
                      title={col}
                    >
                      {isSelected && <Check size={14} className="text-white drop-shadow-sm stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingLayerTab(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveLayerEdit}
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
