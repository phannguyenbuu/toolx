import {
  AccountPlan,
  Transaction,
  ActivityLog,
  TeamMember,
  BusinessInfo,
  SubscriptionInfo
} from '../types';
import {
  defaultTransactions,
  defaultActivities,
  defaultTeamMembers,
  defaultBusinessInfo
} from '../constants';
import { defaultSubscription } from './types';

export interface LocalStorageAccountState {
  balance: number;
  currentPlan: AccountPlan;
  transactions: Transaction[];
  activities: ActivityLog[];
  teamMembers: TeamMember[];
  businessInfo: BusinessInfo;
  subscription: SubscriptionInfo;
}

export function loadAccountLocalStorage(): LocalStorageAccountState {
  let balance = 0;
  let currentPlan: AccountPlan = 'free';

  const savedWallet = localStorage.getItem('userWallet');
  if (savedWallet) {
    try {
      const data = JSON.parse(savedWallet);
      balance = data.balance || 0;
      currentPlan = data.plan || 'free';
    } catch (e) {
      console.error('Error loading wallet:', e);
    }
  }

  let transactions = defaultTransactions;
  const savedTransactions = localStorage.getItem('userTransactions');
  if (savedTransactions) {
    try {
      transactions = JSON.parse(savedTransactions);
    } catch (e) {
      transactions = defaultTransactions;
    }
  }

  let activities = defaultActivities;
  const savedActivities = localStorage.getItem('userActivities');
  if (savedActivities) {
    try {
      activities = JSON.parse(savedActivities);
    } catch (e) {
      activities = defaultActivities;
    }
  }

  let teamMembers = defaultTeamMembers;
  const savedTeam = localStorage.getItem('teamMembers');
  if (savedTeam) {
    try {
      teamMembers = JSON.parse(savedTeam);
    } catch (e) {
      teamMembers = defaultTeamMembers;
    }
  }

  let businessInfo = defaultBusinessInfo;
  const savedBusiness = localStorage.getItem('businessInfo');
  if (savedBusiness) {
    try {
      businessInfo = JSON.parse(savedBusiness);
    } catch (e) {
      businessInfo = defaultBusinessInfo;
    }
  }

  let subscription = defaultSubscription;
  const savedSubscription = localStorage.getItem('userSubscription');
  if (savedSubscription) {
    try {
      subscription = JSON.parse(savedSubscription);
    } catch (e) {
      subscription = defaultSubscription;
    }
  }

  return {
    balance,
    currentPlan,
    transactions,
    activities,
    teamMembers,
    businessInfo,
    subscription
  };
}

export function saveWalletToStorage(balance: number, plan: AccountPlan) {
  localStorage.setItem('userWallet', JSON.stringify({ balance, plan }));
}

export function saveTransactionsToStorage(transactions: Transaction[]) {
  localStorage.setItem('userTransactions', JSON.stringify(transactions));
}

export function saveActivitiesToStorage(activities: ActivityLog[]) {
  localStorage.setItem('userActivities', JSON.stringify(activities));
}

export function saveTeamMembersToStorage(members: TeamMember[]) {
  localStorage.setItem('teamMembers', JSON.stringify(members));
}

export function saveBusinessInfoToStorage(newInfo: BusinessInfo) {
  localStorage.setItem('businessInfo', JSON.stringify(newInfo));

  // Sync with business database config for quotes/invoices
  try {
    const businessConfig = localStorage.getItem('business_config');
    const config = businessConfig ? JSON.parse(businessConfig) : {};
    config.company = {
      name: newInfo.name,
      address: newInfo.address,
      phone: newInfo.phone,
      email: newInfo.email,
      website: newInfo.website,
      taxCode: newInfo.taxCode,
      bankAccount: newInfo.bankAccount,
      bankName: newInfo.bankName,
      bankBranch: newInfo.bankBranch,
      logo: newInfo.logo
    };
    localStorage.setItem('business_config', JSON.stringify(config));
  } catch (e) {
    console.error('Error syncing business config:', e);
  }
}
