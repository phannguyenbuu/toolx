import React from 'react';
import {
  Terminal,
  Activity,
  Layers,
  Server,
  Search,
  ChevronDown,
  Plus,
  RotateCcw
} from 'lucide-react';
import { AdminView } from '../types';
import { UtiCommandItem } from '../../../services/utiCommandService';

interface CommandsSidebarProps {
  adminView: AdminView;
  setAdminView: (v: AdminView) => void;
  commandsCount: number;
  servicesCount: number;
  agentsCount: number;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeCategory: string;
  setActiveCategory: (v: string) => void;
  categories: string[];
  filteredCommands: UtiCommandItem[];
  selectedSlug: string;
  setSelectedSlug: (slug: string) => void;
  onToggleItemVisibility: (slug: string) => void;
  onOpenEditModal: () => void;
  onResetCommands: () => void;
}

export const CommandsSidebar: React.FC<CommandsSidebarProps> = ({
  adminView,
  setAdminView,
  commandsCount,
  servicesCount,
  agentsCount,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
  filteredCommands,
  selectedSlug,
  setSelectedSlug,
  onToggleItemVisibility,
  onOpenEditModal,
  onResetCommands
}) => {
  return (
    <div className="w-72 md:w-80 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
      {/* Primary Admin Navigation Menu */}
      <div className="p-2.5 border-b border-slate-200 bg-slate-50/80 space-y-1.5">
        <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Menu Quản Trị Hệ Thống</span>
          <span className="font-mono text-violet-600 font-semibold">/admin</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAdminView('commands')}
            className={`px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              adminView === 'commands'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            <Terminal size={14} className={adminView === 'commands' ? 'text-white' : 'text-slate-500'} />
            <span className="truncate">Lệnh ({commandsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminView('jobs');
              if (window.history && window.history.pushState) window.history.pushState(null, '', '/job');
            }}
            className={`px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              adminView === 'jobs'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
            title="Xem lịch sử Jobs (/job)"
          >
            <Activity size={14} className={adminView === 'jobs' ? 'text-white' : 'text-violet-600'} />
            <span className="truncate">Jobs (/job)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAdminView('services')}
            className={`px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              adminView === 'services'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            <Layers size={14} className={adminView === 'services' ? 'text-white' : 'text-slate-500'} />
            <span className="truncate">Services ({servicesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminView('agents')}
            className={`px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              adminView === 'agents'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            <Server size={14} className={adminView === 'agents' ? 'text-white' : 'text-slate-500'} />
            <span className="truncate">Máy Agent ({agentsCount})</span>
          </button>
        </div>
      </div>

      {/* Search and Category filters */}
      <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm Menu Item / Command..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Category Filter Dropdown List */}
        <div className="relative">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-2xs"
          >
            <option value="ALL">📋 Tất cả danh mục ({commandsCount})</option>
            {categories.map((cat) => {
              const count = filteredCommands.filter((c) => c.category === cat).length;
              return (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              );
            })}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* Menu Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin bg-slate-50/40">
        {filteredCommands.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Không tìm thấy Menu Item nào phù hợp.
          </div>
        ) : (
          filteredCommands.map((item) => {
            const isSelected = item.command === selectedSlug;
            const isEnabled = item.is_visible !== false;
            return (
              <div
                key={item.command}
                onClick={() => {
                  if (item.command === 'inspect_agent_jobs') {
                    setAdminView('jobs');
                    if (window.history && window.history.pushState) window.history.pushState(null, '', '/job');
                    return;
                  }
                  setSelectedSlug(item.command);
                }}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 group ${
                  isSelected
                    ? 'bg-indigo-50/90 border-indigo-400 shadow-xs ring-1 ring-indigo-300'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                } ${!isEnabled ? 'opacity-60 bg-slate-50/70' : ''}`}
              >
                {/* Toggle Checkbox replacing the icon */}
                <label
                  className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                  title={isEnabled ? 'Script đang BẬT (nhấp để TẮT)' : 'Script đang TẮT (nhấp để BẬT)'}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => onToggleItemVisibility(item.command)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:border-white"></div>
                </label>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : isEnabled ? 'text-slate-800' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                        isEnabled
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          : 'text-slate-400 bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {item.command}
                  </p>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer: Add New Menu Item */}
      <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
        <button
          onClick={onOpenEditModal}
          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus size={14} />
          <span>Thêm Menu Item</span>
        </button>
        <button
          onClick={onResetCommands}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition cursor-pointer"
          title="Khôi phục danh sách lệnh mặc định"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
