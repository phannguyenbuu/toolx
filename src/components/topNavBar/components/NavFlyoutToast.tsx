import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { HoveredMenuState, MenuItemDef } from '../types';

interface NavFlyoutToastProps {
  hoveredMenu: HoveredMenuState | null;
  activeLink: string;
  onToastMouseEnter: () => void;
  onToastMouseLeave: () => void;
  onSubItemClick: (subId: string) => void;
  onItemDirectClick: (item: MenuItemDef) => void;
}

export const NavFlyoutToast: React.FC<NavFlyoutToastProps> = ({
  hoveredMenu,
  activeLink,
  onToastMouseEnter,
  onToastMouseLeave,
  onSubItemClick,
  onItemDirectClick,
}) => {
  if (!hoveredMenu) return null;

  return (
    <div
      onMouseEnter={onToastMouseEnter}
      onMouseLeave={onToastMouseLeave}
      style={{ top: `${hoveredMenu.top}px` }}
      className="fixed left-[84px] z-[9999] w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 py-3 px-3 animate-fadeIn select-none pointer-events-auto"
    >
      {/* Invisible hover bridge connecting sidebar icon to this flyout */}
      <div className="absolute -left-3 top-0 bottom-0 w-3 pointer-events-auto" />

      {/* Toast Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100/80">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              hoveredMenu.item.id === 'ai-group'
                ? 'bg-purple-100 text-purple-600'
                : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <hoveredMenu.item.icon size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-gray-900 truncate leading-tight">
              {hoveredMenu.item.name}
            </h4>
            <span className="text-[10px] text-gray-400 font-medium">
              {hoveredMenu.item.category}
            </span>
          </div>
        </div>
      </div>

      {/* Submenu List or Direct Description */}
      {hoveredMenu.item.subItems && hoveredMenu.item.subItems.length > 0 ? (
        <div className="space-y-1">
          {hoveredMenu.item.subItems.map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = activeLink === sub.id;
            const isAIGroup = hoveredMenu.item.id === 'ai-group';

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSubItemClick(sub.id)}
                className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 group cursor-pointer ${
                  isSubActive
                    ? isAIGroup
                      ? 'bg-purple-50 text-purple-800 border border-purple-100 shadow-xs'
                      : 'bg-indigo-50 text-indigo-800 border border-indigo-100 shadow-xs'
                    : isAIGroup
                      ? 'hover:bg-purple-50/60 text-gray-700'
                      : 'hover:bg-indigo-50/60 text-gray-700'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isSubActive
                      ? isAIGroup
                        ? 'bg-purple-200/80 text-purple-700'
                        : 'bg-indigo-200/80 text-indigo-700'
                      : isAIGroup
                        ? 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                        : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                  }`}
                >
                  <SubIcon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900 truncate">
                      {sub.name}
                    </span>
                    {isSubActive && (
                      <CheckCircle2
                        size={13}
                        className={
                          isAIGroup ? 'text-purple-600' : 'text-indigo-600'
                        }
                      />
                    )}
                  </div>
                  {sub.desc && (
                    <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2">
                      {sub.desc}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          onClick={() => onItemDirectClick(hoveredMenu.item)}
          className="cursor-pointer group"
        >
          <p className="text-xs text-gray-600 leading-relaxed">
            {hoveredMenu.item.description}
          </p>
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700">
            <span>Mở công cụ ngay</span>
            <ChevronRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </div>
        </div>
      )}
    </div>
  );
};
