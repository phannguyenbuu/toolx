import React from 'react';
import { Sparkles } from 'lucide-react';
import { TopNavBarProps } from './types';
import { useTopNavBarState } from './hooks/useTopNavBarState';
import { NavBrand } from './components/NavBrand';
import { NavItemsList } from './components/NavItemsList';
import { NavNotificationPopover } from './components/NavNotificationPopover';
import { NavUserProfilePopover } from './components/NavUserProfilePopover';
import { NavFlyoutToast } from './components/NavFlyoutToast';

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onNavClick,
  activeLink = 'label-designer',
  onOpenAccountPage,
  onLoginClick,
  onTopUpClick,
  showRobot,
  onToggleRobot,
}) => {
  const {
    user,
    isAuthenticated,
    logout,
    balance,
    currentPlan,
    currentPlanInfo,
    activeMenuDefinitions,
    isItemActive,
    isProfileOpen,
    setIsProfileOpen,
    isNotificationOpen,
    setIsNotificationOpen,
    notifications,
    hoveredMenu,
    handleItemMouseEnter,
    handleItemMouseLeave,
    handleToastMouseEnter,
    handleToastMouseLeave,
    handleSubItemClick,
    handleItemDirectClick,
  } = useTopNavBarState({ activeLink, onNavClick });

  return (
    <>
      {/* 80PX FIXED WIDTH LEFT PANEL */}
      <aside className="w-[80px] min-w-[80px] max-w-[80px] h-screen bg-white border-r border-gray-200 flex flex-col justify-between select-none z-40 relative shadow-sm flex-shrink-0">
        {/* --- TOP: COMPACT ANIMATED LOGO --- */}
        <NavBrand onNavClick={onNavClick} />

        {/* --- MIDDLE: VERTICAL ICON NAVIGATION --- */}
        <NavItemsList
          activeMenuDefinitions={activeMenuDefinitions}
          isItemActive={isItemActive}
          hoveredMenu={hoveredMenu}
          onItemClick={handleItemDirectClick}
          onItemMouseEnter={handleItemMouseEnter}
          onItemMouseLeave={handleItemMouseLeave}
        />

        {/* --- BOTTOM: UTILITIES, NOTIFICATIONS & PROFILE --- */}
        <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex flex-col items-center space-y-2 relative flex-shrink-0">
          {/* AI Robot Assistant Button */}
          {onToggleRobot && (
            <button
              onClick={onToggleRobot}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                showRobot
                  ? 'bg-purple-100 text-purple-700 shadow-sm border border-purple-200'
                  : 'bg-white text-gray-500 hover:text-purple-600 hover:bg-purple-50 border border-gray-200/60'
              }`}
              title={showRobot ? 'Ẩn AI Assistant' : 'Hiện Trợ lý AI'}
            >
              <Sparkles size={18} className="text-purple-600" />
            </button>
          )}

          {/* Notification Bell & Popover */}
          <NavNotificationPopover
            isOpen={isNotificationOpen}
            onToggle={() => setIsNotificationOpen(!isNotificationOpen)}
            onClose={() => setIsNotificationOpen(false)}
            notifications={notifications}
            onOpenAccountPage={onOpenAccountPage}
          />

          {/* Profile / Login */}
          <NavUserProfilePopover
            isAuthenticated={isAuthenticated}
            user={user}
            isOpen={isProfileOpen}
            onToggle={() => setIsProfileOpen(!isProfileOpen)}
            onClose={() => setIsProfileOpen(false)}
            currentPlan={currentPlan}
            currentPlanInfo={currentPlanInfo}
            balance={balance}
            onLoginClick={onLoginClick}
            onTopUpClick={onTopUpClick}
            onOpenAccountPage={onOpenAccountPage}
            logout={logout}
          />
        </div>
      </aside>

      {/* --- FLOATING FLYOUT TOAST / TOOLTIP MODAL ON HOVER --- */}
      <NavFlyoutToast
        hoveredMenu={hoveredMenu}
        activeLink={activeLink}
        onToastMouseEnter={handleToastMouseEnter}
        onToastMouseLeave={handleToastMouseLeave}
        onSubItemClick={handleSubItemClick}
        onItemDirectClick={handleItemDirectClick}
      />
    </>
  );
};

export default TopNavBar;
