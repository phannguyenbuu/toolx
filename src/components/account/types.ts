// Account Dashboard Types
import { Transaction as ApiTransaction, ActivityLog as ApiActivityLog } from '../../types/api';

export type AccountPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

// Use API Transaction type but extend for account-specific fields
export interface Transaction extends Omit<ApiTransaction, 'type' | 'status'> {
  type: 'topup' | 'upgrade' | 'purchase' | 'refund';
  status: 'completed' | 'pending' | 'failed';
  method?: string;
  date: string; // Add date field for local use
}

// Use API ActivityLog type but extend for account-specific fields  
export interface ActivityLog extends Omit<ApiActivityLog, 'action'> {
  type: 'login' | 'export' | 'create' | 'edit' | 'delete' | 'share' | 'upgrade';
  description: string;
  date: string;
  ip?: string;
  device?: string;
}

export type TransactionType = Transaction['type'];
export type ActivityType = ActivityLog['type'];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar?: string;
  joinedAt: string;
  lastActive?: string;
  status: 'active' | 'invited' | 'inactive';
}

export interface BusinessInfo {
  name: string;
  taxCode: string;
  address: string;
  province: string;
  commune: string;
  phone: string;
  email: string;
  website: string;
  logo?: string;
  description: string;
  printingCapacity: string;
  equipment: string[];
  taxPercent: number; // % thuế mặc định
  // Bank info for invoices/quotes
  bankAccount?: string;
  bankName?: string;
  bankBranch?: string;
}

export interface AccountPlanInfo {
  id: AccountPlan;
  name: string;
  price: number;
  features: string[];
  color: string;
  icon: React.ComponentType<any>;
  limits: {
    sessions: number | 'unlimited';
    exports: number | 'unlimited';
    storage: string;
    teamMembers: number | 'unlimited';
  };
}

export interface SubscriptionInfo {
  plan: AccountPlan;
  startDate: string;
  expiryDate: string;
  autoRenew: boolean;
  usedSessions: number;
  usedExports: number;
  usedStorage: string;
}

export interface AccountData {
  balance: number;
  currentPlan: AccountPlan;
  subscription: SubscriptionInfo;
  transactions: Transaction[];
  activities: ActivityLog[];
  teamMembers: TeamMember[];
  businessInfo: BusinessInfo;
}
