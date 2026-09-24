import { LucideIcon } from 'lucide-react';

export type AccountPlan = 'free' | 'basic' | 'pro' | 'enterprise';

export interface AccountPlanInfo {
  id: AccountPlan;
  name: string;
  price: number;
  features: string[];
  color: string;
  icon: LucideIcon;
}

export interface TopNavBarProps {
  logoText?: string;
  onSearch?: (term: string) => void;
  onNavClick?: (linkId: string) => void;
  activeLink?: string;
  onOpenAccountPage?: (tab?: string) => void;
  onLoginClick?: () => void;
  onTopUpClick?: () => void;
  showRobot?: boolean;
  onToggleRobot?: () => void;
}

export interface SubMenuItem {
  id: string;
  name: string;
  icon: LucideIcon;
  desc?: string;
  badge?: string;
}

export interface MenuItemDef {
  id: string;
  name: string;
  icon: LucideIcon;
  category: string;
  description: string;
  color?: 'indigo' | 'purple' | 'emerald' | 'blue' | 'amber';
  subItems?: SubMenuItem[];
}

export interface ActivityNotification {
  id: string;
  type: string;
  description: string;
  date: string;
}

export interface HoveredMenuState {
  item: MenuItemDef;
  top: number;
}
