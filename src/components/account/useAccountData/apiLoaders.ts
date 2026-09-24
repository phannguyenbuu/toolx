import {
  AccountPlan,
  Transaction,
  ActivityLog,
  TeamMember,
  BusinessInfo,
  SubscriptionInfo
} from '../types';
import {
  accountOverviewApi,
  subscriptionApi,
  walletApi,
  teamApi,
  printShopApi,
  activityApi
} from '../../../services/userApi';
import { getSubscriptionPlans, SubscriptionPlan } from '../../../services/subscriptionPlansApi';
import { Transaction as ApiTransaction, ActivityLog as ApiActivityLog } from '../../../types/api';

export interface LoadedAccountApiData {
  subscriptionPlans: SubscriptionPlan[];
  currentPlan?: AccountPlan;
  transactions: Transaction[];
  activities: ActivityLog[];
  teamMembers: TeamMember[];
  businessInfo?: BusinessInfo;
  subscription?: SubscriptionInfo;
}

export async function fetchAccountApiData(): Promise<LoadedAccountApiData> {
  // Load subscription plans
  const subscriptionPlans = await getSubscriptionPlans();

  // Load account overview
  const overview = await accountOverviewApi.getOverview();
  let currentPlan: AccountPlan | undefined;
  if (overview.subscription?.plan) {
    currentPlan = overview.subscription.plan.slug as AccountPlan;
  }

  // Load transactions
  const transactionsData = await walletApi.getTransactions({ limit: 50 });
  const transactions: Transaction[] = transactionsData.data.map((apiTx: ApiTransaction) => ({
    ...apiTx,
    date: apiTx.createdAt,
    type: apiTx.type.toLowerCase() as Transaction['type'],
    status: apiTx.status.toLowerCase() as Transaction['status']
  }));

  // Load activities
  const activitiesData = await activityApi.getActivityHistory({ limit: 50 });
  const activities: ActivityLog[] = activitiesData.data.map((apiActivity: ApiActivityLog) => ({
    ...apiActivity,
    type: 'login' as ActivityLog['type'],
    description: apiActivity.action || 'Unknown activity',
    date: apiActivity.createdAt
  }));

  // Load team members
  const teamData = await teamApi.getTeamMembers();
  const teamMembers: TeamMember[] = teamData.map((member: any) => ({
    id: member.id,
    name: member.user?.fullName || member.user?.email?.split('@')[0] || 'Unknown',
    email: member.user?.email || '',
    role: member.role as TeamMember['role'],
    joinedAt: member.createdAt,
    status: member.status as TeamMember['status']
  }));

  // Load business info
  let businessInfo: BusinessInfo | undefined;
  const printShopData = await printShopApi.getPrintShopInfo();
  if (printShopData) {
    businessInfo = {
      name: printShopData.name || '',
      address: printShopData.address || '',
      phone: printShopData.phone || '',
      email: printShopData.email || '',
      website: printShopData.website || '',
      taxCode: '',
      bankAccount: '',
      bankName: '',
      bankBranch: '',
      logo: printShopData.logo || '',
      province: '',
      commune: '',
      description: '',
      printingCapacity: '',
      equipment: [],
      taxPercent: 10
    };
  }

  // Load subscription info
  let subscription: SubscriptionInfo | undefined;
  const subscriptionData = await subscriptionApi.getSubscription();
  if (subscriptionData) {
    subscription = {
      plan: (subscriptionData.plan?.slug as AccountPlan) || 'free',
      startDate: subscriptionData.currentPeriodStart || new Date().toISOString(),
      expiryDate:
        subscriptionData.currentPeriodEnd ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: subscriptionData.status === 'ACTIVE',
      usedSessions: 0,
      usedExports: 0,
      usedStorage: '0MB'
    };
  }

  return {
    subscriptionPlans,
    currentPlan,
    transactions,
    activities,
    teamMembers,
    businessInfo,
    subscription
  };
}
