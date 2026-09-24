import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth';
import { useMicroservicesState } from '../../../services/microservicesConfig';
import { accountPlans, menuDefinitions } from '../constants';
import {
  AccountPlan,
  ActivityNotification,
  HoveredMenuState,
  MenuItemDef,
} from '../types';

interface UseTopNavBarStateProps {
  activeLink?: string;
  onNavClick?: (linkId: string) => void;
}

export const useTopNavBarState = ({
  activeLink = 'label-designer',
  onNavClick,
}: UseTopNavBarStateProps) => {
  const { user, isAuthenticated, logout, wallet } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<HoveredMenuState | null>(null);

  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hook listening to microservice attach/detach
  const { isAttached } = useMicroservicesState();

  // Filter out detached microservices
  const activeMenuDefinitions = menuDefinitions
    .map((item) => {
      if (!item.subItems) {
        return isAttached(item.id) ? item : null;
      }
      const filteredSubs = item.subItems.filter((sub) => isAttached(sub.id));
      if (filteredSubs.length === 0) return null;
      return { ...item, subItems: filteredSubs };
    })
    .filter(Boolean) as MenuItemDef[];

  // Helper to check if a menu item (single or group) is active
  const isItemActive = (item: MenuItemDef) => {
    if (!item.subItems) {
      return activeLink === item.id;
    }
    return item.subItems.some((sub) => sub.id === activeLink);
  };

  // Hover handlers for menu items
  const handleItemMouseEnter = (
    item: MenuItemDef,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const approxToastHeight = item.subItems
      ? item.subItems.length * 56 + 80
      : 130;
    let targetTop = rect.top - 8;
    if (targetTop + approxToastHeight > window.innerHeight - 16) {
      targetTop = Math.max(16, window.innerHeight - approxToastHeight - 16);
    }
    setHoveredMenu({
      item,
      top: Math.max(12, targetTop),
    });
  };

  const handleItemMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 180);
  };

  const handleToastMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleToastMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 180);
  };

  const handleSubItemClick = (subId: string) => {
    setHoveredMenu(null);
    if (onNavClick) {
      onNavClick(subId);
    }
  };

  const handleItemDirectClick = (item: MenuItemDef) => {
    if (item.subItems && item.subItems.length > 0) {
      const targetSub =
        item.subItems.find((s) => s.id === activeLink) || item.subItems[0];
      setHoveredMenu(null);
      if (onNavClick) {
        onNavClick(targetSub.id);
      }
    } else {
      setHoveredMenu(null);
      if (onNavClick) {
        onNavClick(item.id);
      }
    }
  };

  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);

  // Wallet & Account State
  const balance = wallet?.balance || 0;
  const [currentPlan, setCurrentPlan] = useState<AccountPlan>('free');

  useEffect(() => {
    const savedWallet = localStorage.getItem('userWallet');
    if (savedWallet) {
      try {
        const data = JSON.parse(savedWallet);
        setCurrentPlan(data.plan || 'free');
      } catch (e) {
        console.error('Error loading wallet:', e);
      }
    }
  }, []);

  useEffect(() => {
    const loadNotifications = () => {
      const savedActivities = localStorage.getItem('userActivities');
      if (savedActivities) {
        try {
          const activities = JSON.parse(savedActivities);
          setNotifications(activities.slice(0, 10));
        } catch (e) {
          console.error('Error loading notifications:', e);
        }
      }
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentPlanInfo =
    accountPlans.find((p) => p.id === currentPlan) || accountPlans[0];

  return {
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
  };
};
