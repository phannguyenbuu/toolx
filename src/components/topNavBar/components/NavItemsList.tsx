import React from 'react';
import { MenuItemDef, HoveredMenuState } from '../types';

interface NavItemsListProps {
  activeMenuDefinitions: MenuItemDef[];
  isItemActive: (item: MenuItemDef) => boolean;
  hoveredMenu: HoveredMenuState | null;
  onItemClick: (item: MenuItemDef) => void;
  onItemMouseEnter: (item: MenuItemDef, e: React.MouseEvent<HTMLButtonElement>) => void;
  onItemMouseLeave: () => void;
}

export const NavItemsList: React.FC<NavItemsListProps> = ({
  activeMenuDefinitions,
  isItemActive,
  hoveredMenu,
  onItemClick,
  onItemMouseEnter,
  onItemMouseLeave,
}) => {
  return (
    <div className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden space-y-2 flex flex-col items-center custom-scrollbar">
      {activeMenuDefinitions.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item);
        const isHovered = hoveredMenu?.item.id === item.id;
        const isAITool = item.id === 'ai-group';

        return (
          <div key={item.id} className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => onItemClick(item)}
              onMouseEnter={(e) => onItemMouseEnter(item, e)}
              onMouseLeave={onItemMouseLeave}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative ${
                active
                  ? isAITool
                    ? 'bg-purple-100/80 text-purple-700 shadow-sm border border-purple-200/80 font-bold'
                    : 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80 font-bold'
                  : isHovered
                    ? 'bg-gray-100 text-indigo-600 scale-105'
                    : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100/80'
              }`}
              aria-label={item.name}
            >
              {/* Left active vertical indicator bar */}
              {active && (
                <span
                  className={`absolute -left-2 top-2.5 bottom-2.5 w-1 rounded-r-full ${
                    isAITool
                      ? 'bg-gradient-to-b from-purple-500 to-pink-500'
                      : 'bg-indigo-600'
                  }`}
                />
              )}

              <Icon
                size={21}
                strokeWidth={active ? 2.2 : 1.9}
                className={`transition-transform duration-200 ${
                  active ? 'scale-105' : 'group-hover:scale-110'
                } ${
                  isAITool && active
                    ? 'text-purple-600'
                    : active
                      ? 'text-indigo-600'
                      : 'text-gray-500 group-hover:text-indigo-600'
                }`}
              />

              {/* Tiny dot indicator for groups with multiple submenus */}
              {item.subItems && item.subItems.length > 0 && (
                <span
                  className={`absolute right-1.5 bottom-1.5 w-1.5 h-1.5 rounded-full ${
                    active
                      ? isAITool
                        ? 'bg-purple-500'
                        : 'bg-indigo-500'
                      : 'bg-gray-300 group-hover:bg-indigo-400'
                  }`}
                />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
