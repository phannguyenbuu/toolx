import { useState, useEffect, useCallback } from 'react';
import { AccountPlan, Transaction, ActivityLog, TeamMember, BusinessInfo, SubscriptionInfo, AccountPlanInfo } from './types';
import { accountPlans, defaultTransactions, defaultActivities, defaultTeamMembers, defaultBusinessInfo } from './constants';
import { formatCurrency } from './utils';
import { 
  accountOverviewApi, 
  subscriptionApi, 
  walletApi, 
  teamApi, 
  printShopApi, 
  activityApi
} from '../../services/userApi';
import { getSubscriptionPlans, SubscriptionPlan } from '../../services/subscriptionPlansApi';
import { useSupabaseAuth as useAuth } from '../auth/SupabaseAuthContext';
import { Transaction as ApiTransaction, ActivityLog as ApiActivityLog } from '../../types/api';

const defaultSubscription: SubscriptionInfo = {
  plan: 'free',
  startDate: new Date().toISOString(),
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  autoRenew: false,
  usedSessions: 2,
  usedExports: 45,
  usedStorage: '25MB',
};

export const useAccountData = () => {
  const { user, isAuthenticated, wallet, refreshWallet } = useAuth();
  const [balance, setBalance] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<AccountPlan>('free');
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(defaultBusinessInfo);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update balance from auth context
  useEffect(() => {
    if (wallet) {
      setBalance(wallet.balance);
    }
  }, [wallet]);

  // Load data from API when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Reset state when not authenticated
      setBalance(0);
      setCurrentPlan('free');
      setSubscription(defaultSubscription);
      setTransactions([]);
      setActivities([]);
      setTeamMembers([]);
      setBusinessInfo(defaultBusinessInfo);
      return;
    }

    loadAccountData();
  }, [isAuthenticated, user]);

  const loadAccountData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Load subscription plans
      const plans = await getSubscriptionPlans();
      setSubscriptionPlans(plans);

      // Load account overview
      const overview = await accountOverviewApi.getOverview();
      
      // Update current plan based on subscription
      if (overview.subscription?.plan) {
        const planSlug = overview.subscription.plan.slug as AccountPlan;
        setCurrentPlan(planSlug);
      }

      // Load transactions
      const transactionsData = await walletApi.getTransactions({ limit: 50 });
      // Map API transactions to local format
      const mappedTransactions: Transaction[] = transactionsData.data.map((apiTx: ApiTransaction) => ({
        ...apiTx,
        date: apiTx.createdAt, // Add date field from createdAt
        type: apiTx.type.toLowerCase() as Transaction['type'], // Convert to lowercase
        status: apiTx.status.toLowerCase() as Transaction['status'] // Convert to lowercase
      }));
      setTransactions(mappedTransactions);

      // Load activities
      const activitiesData = await activityApi.getActivityHistory({ limit: 50 });
      // Map API activities to local format
      const mappedActivities: ActivityLog[] = activitiesData.data.map((apiActivity: ApiActivityLog) => ({
        ...apiActivity,
        type: 'login' as ActivityLog['type'], // Default type, should be mapped based on action
        description: apiActivity.action || 'Unknown activity', // Use action as description
        date: apiActivity.createdAt // Add date field from createdAt
      }));
      setActivities(mappedActivities);

      // Load team members
      const teamData = await teamApi.getTeamMembers();
      const mappedTeamMembers: TeamMember[] = teamData.map((member: any) => ({
        id: member.id,
        name: member.user.fullName || member.user.email.split('@')[0],
        email: member.user.email,
        role: member.role as TeamMember['role'],
        joinedAt: member.createdAt,
        status: member.status as TeamMember['status']
      }));
      setTeamMembers(mappedTeamMembers);

      // Load business info
      const printShopData = await printShopApi.getPrintShopInfo();
      if (printShopData) {
        const mappedBusinessInfo: BusinessInfo = {
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
          // Add missing required fields
          province: '',
          commune: '',
          description: '',
          printingCapacity: '',
          equipment: [],
          taxPercent: 10
        };
        setBusinessInfo(mappedBusinessInfo);
      }

      // Load subscription info
      const subscriptionData = await subscriptionApi.getSubscription();
      if (subscriptionData) {
        const mappedSubscription: SubscriptionInfo = {
          plan: subscriptionData.plan?.slug as AccountPlan || 'free',
          startDate: subscriptionData.currentPeriodStart || new Date().toISOString(),
          expiryDate: subscriptionData.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: subscriptionData.status === 'ACTIVE',
          usedSessions: 0, // TODO: Get from API
          usedExports: 0, // TODO: Get from API
          usedStorage: '0MB', // TODO: Get from API
        };
        setSubscription(mappedSubscription);
      }

    } catch (err) {
      console.error('Error loading account data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account data');
      
      // Fallback to localStorage data
      loadLocalStorageData();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fallback to localStorage data
  const loadLocalStorageData = useCallback(() => {
    // Load wallet data
    const savedWallet = localStorage.getItem('userWallet');
    if (savedWallet) {
      try {
        const data = JSON.parse(savedWallet);
        setBalance(data.balance || 0);
        setCurrentPlan(data.plan || 'free');
      } catch (e) {
        console.error('Error loading wallet:', e);
      }
    }

    // Load transactions
    const savedTransactions = localStorage.getItem('userTransactions');
    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions));
      } catch (e) {
        setTransactions(defaultTransactions);
      }
    } else {
      setTransactions(defaultTransactions);
    }

    // Load activities
    const savedActivities = localStorage.getItem('userActivities');
    if (savedActivities) {
      try {
        setActivities(JSON.parse(savedActivities));
      } catch (e) {
        setActivities(defaultActivities);
      }
    } else {
      setActivities(defaultActivities);
    }

    // Load team members
    const savedTeam = localStorage.getItem('teamMembers');
    if (savedTeam) {
      try {
        setTeamMembers(JSON.parse(savedTeam));
      } catch (e) {
        setTeamMembers(defaultTeamMembers);
      }
    } else {
      setTeamMembers(defaultTeamMembers);
    }

    // Load business info
    const savedBusiness = localStorage.getItem('businessInfo');
    if (savedBusiness) {
      try {
        setBusinessInfo(JSON.parse(savedBusiness));
      } catch (e) {
        setBusinessInfo(defaultBusinessInfo);
      }
    } else {
      setBusinessInfo(defaultBusinessInfo);
    }

    // Load subscription
    const savedSubscription = localStorage.getItem('userSubscription');
    if (savedSubscription) {
      try {
        setSubscription(JSON.parse(savedSubscription));
      } catch (e) {
        setSubscription(defaultSubscription);
      }
    } else {
      setSubscription(defaultSubscription);
    }
  }, []);

  // Save functions
  const saveWalletData = useCallback((newBalance: number, newPlan: AccountPlan) => {
    localStorage.setItem('userWallet', JSON.stringify({ balance: newBalance, plan: newPlan }));
    setBalance(newBalance);
    setCurrentPlan(newPlan);
  }, []);

  const saveTransactions = useCallback((newTransactions: Transaction[]) => {
    localStorage.setItem('userTransactions', JSON.stringify(newTransactions));
    setTransactions(newTransactions);
  }, []);

  const saveActivities = useCallback((newActivities: ActivityLog[]) => {
    localStorage.setItem('userActivities', JSON.stringify(newActivities));
    setActivities(newActivities);
  }, []);

  const saveTeamMembers = useCallback((newMembers: TeamMember[]) => {
    localStorage.setItem('teamMembers', JSON.stringify(newMembers));
    setTeamMembers(newMembers);
  }, []);

  const updateBusinessInfo = useCallback((newInfo: BusinessInfo) => {
    localStorage.setItem('businessInfo', JSON.stringify(newInfo));
    setBusinessInfo(newInfo);
    
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
        logo: newInfo.logo,
      };
      localStorage.setItem('business_config', JSON.stringify(config));
    } catch (e) {
      console.error('Error syncing business config:', e);
    }
  }, []);

  // Handle top-up
  const handleTopUp = useCallback(async (amount: number, onSuccess: () => void) => {
    try {
      setLoading(true);
      
      if (isAuthenticated) {
        // Use API
        await walletApi.topupWallet(amount, 'bank_transfer');
        await refreshWallet(); // Refresh wallet from auth context
        await loadAccountData(); // Reload all data
      } else {
        // Fallback to localStorage
        const newBalance = balance + amount;
        saveWalletData(newBalance, currentPlan);
        
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          userId: 'demo-user',
          type: 'topup',
          amount: amount,
          balanceBefore: balance,
          balanceAfter: newBalance,
          description: 'Nạp tiền qua chuyển khoản',
          metadata: {},
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          status: 'completed',
          method: 'bank_transfer'
        };
        saveTransactions([newTransaction, ...transactions]);
        
        const newActivity: ActivityLog = {
          id: Date.now().toString(),
          userId: 'demo-user',
          type: 'upgrade',
          description: `Nạp ${formatCurrency(amount)} vào ví`,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          entityType: 'wallet',
          entityId: null,
          metadata: { amount },
          ipAddress: null,
          userAgent: null
        };
        saveActivities([newActivity, ...activities]);
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error topping up:', err);
      setError(err instanceof Error ? err.message : 'Failed to top up');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, balance, currentPlan, transactions, activities, refreshWallet, loadAccountData]);

  // Handle plan upgrade
  const handleUpgradePlan = useCallback(async (planId: AccountPlan, onSuccess: () => void, onInsufficientBalance: (needed: number) => void) => {
    try {
      setLoading(true);
      
      if (isAuthenticated) {
        // Find plan from subscription plans
        const plan = subscriptionPlans.find(p => p.slug === planId);
        if (!plan) {
          throw new Error('Plan not found');
        }
        
        if (plan.priceMonthly > balance) {
          onInsufficientBalance(plan.priceMonthly - balance);
          return;
        }
        
        // Use API
        await subscriptionApi.upgradeSubscription(plan.id, 'wallet');
        await refreshWallet(); // Refresh wallet from auth context
        await loadAccountData(); // Reload all data
      } else {
        // Fallback to localStorage
        const plan = accountPlans.find(p => p.id === planId);
        if (!plan) return;
        
        if (plan.price > balance) {
          onInsufficientBalance(plan.price - balance);
          return;
        }
        
        const newBalance = balance - plan.price;
        saveWalletData(newBalance, planId);
        
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          userId: 'demo-user',
          type: 'upgrade',
          amount: -plan.price,
          balanceBefore: balance,
          balanceAfter: newBalance,
          description: `Nâng cấp gói ${plan.name}`,
          metadata: { planId, planName: plan.name },
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          status: 'completed'
        };
        saveTransactions([newTransaction, ...transactions]);
        
        const newActivity: ActivityLog = {
          id: Date.now().toString(),
          userId: 'demo-user',
          type: 'upgrade',
          description: `Nâng cấp tài khoản lên gói ${plan.name}`,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          entityType: 'subscription',
          entityId: null,
          metadata: { planId, planName: plan.name },
          ipAddress: null,
          userAgent: null
        };
        saveActivities([newActivity, ...activities]);
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error upgrading plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade plan');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, balance, currentPlan, transactions, activities, subscriptionPlans, refreshWallet, loadAccountData]);

  // Handle invite team member
  const handleInviteMember = useCallback(async (email: string, role: TeamMember['role'], onSuccess: () => void, onLimitReached: (max: number | 'unlimited') => void) => {
    try {
      setLoading(true);
      
      if (isAuthenticated) {
        // Get current plan limits
        const currentPlanInfo = subscriptionPlans.find(p => p.slug === currentPlan);
        const maxMembers = currentPlanInfo?.limits.teamMembers || 1;
        
        if (maxMembers !== -1 && teamMembers.length >= maxMembers) {
          onLimitReached(maxMembers);
          return;
        }
        
        // Use API
        await teamApi.inviteTeamMember({
          email,
          role,
          permissions: [] // TODO: Define permissions based on role
        });
        
        await loadAccountData(); // Reload team data
      } else {
        // Fallback to localStorage
        const currentPlanInfo = accountPlans.find(p => p.id === currentPlan);
        const maxMembers = currentPlanInfo?.limits.teamMembers || 1;
        
        if (maxMembers !== 'unlimited' && teamMembers.length >= maxMembers) {
          onLimitReached(maxMembers);
          return;
        }
        
        const newMember: TeamMember = {
          id: Date.now().toString(),
          name: email.split('@')[0],
          email: email,
          role: role,
          joinedAt: new Date().toISOString(),
          status: 'invited'
        };
        
        saveTeamMembers([...teamMembers, newMember]);
        
        const newActivity: ActivityLog = {
          id: Date.now().toString(),
          userId: 'demo-user',
          type: 'share',
          description: `Mời ${email} tham gia team với vai trò ${role}`,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          entityType: 'team',
          entityId: null,
          metadata: { email, role },
          ipAddress: null,
          userAgent: null
        };
        saveActivities([newActivity, ...activities]);
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error inviting team member:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite team member');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentPlan, teamMembers, activities, subscriptionPlans, loadAccountData]);

  // Remove team member
  const handleRemoveMember = useCallback(async (memberId: string) => {
    try {
      setLoading(true);
      
      if (isAuthenticated) {
        const member = teamMembers.find(m => m.id === memberId);
        if (member?.role === 'owner') {
          alert('Không thể xóa chủ sở hữu');
          return;
        }
        
        if (window.confirm('Bạn có chắc muốn xóa thành viên này?')) {
          await teamApi.removeTeamMember(memberId);
          await loadAccountData(); // Reload team data
        }
      } else {
        // Fallback to localStorage
        const member = teamMembers.find(m => m.id === memberId);
        if (member?.role === 'owner') {
          alert('Không thể xóa chủ sở hữu');
          return;
        }
        
        if (window.confirm('Bạn có chắc muốn xóa thành viên này?')) {
          saveTeamMembers(teamMembers.filter(m => m.id !== memberId));
        }
      }
    } catch (err) {
      console.error('Error removing team member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove team member');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, teamMembers, loadAccountData]);

  // Save business info
  const saveBusinessInfo = useCallback(async (newInfo: BusinessInfo) => {
    try {
      setLoading(true);
      
      if (isAuthenticated) {
        // Use API
        await printShopApi.updatePrintShopInfo({
          name: newInfo.name,
          address: newInfo.address,
          phone: newInfo.phone,
          email: newInfo.email,
          website: newInfo.website,
          logo: newInfo.logo,
        });
        
        setBusinessInfo(newInfo);
      } else {
        // Fallback to localStorage
        updateBusinessInfo(newInfo);
      }
    } catch (err) {
      console.error('Error saving business info:', err);
      setError(err instanceof Error ? err.message : 'Failed to save business info');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, updateBusinessInfo]);

  // Toggle auto-renew
  const toggleAutoRenew = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isAuthenticated) {
        // TODO: Implement API call for auto-renew toggle
        const newSubscription = { ...subscription, autoRenew: !subscription.autoRenew };
        setSubscription(newSubscription);
      } else {
        // Fallback to localStorage
        const newSubscription = { ...subscription, autoRenew: !subscription.autoRenew };
        localStorage.setItem('userSubscription', JSON.stringify(newSubscription));
        setSubscription(newSubscription);
      }
    } catch (err) {
      console.error('Error toggling auto-renew:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle auto-renew');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, subscription]);

  // Get current plan info - convert SubscriptionPlan to AccountPlanInfo format
  const getAccountPlanInfo = useCallback((): AccountPlanInfo => {
    // First try to find from API subscription plans
    const apiPlan = subscriptionPlans.find(p => p.slug === currentPlan);
    if (apiPlan) {
      // Convert SubscriptionPlan to AccountPlanInfo format
      return {
        id: apiPlan.slug as AccountPlan,
        name: apiPlan.name,
        price: apiPlan.priceMonthly,
        features: apiPlan.features,
        color: 'blue', // Default color, could be mapped based on plan
        icon: accountPlans.find(p => p.id === apiPlan.slug)?.icon || accountPlans[0].icon,
        limits: {
          sessions: apiPlan.limits.designs === -1 ? 'unlimited' as const : apiPlan.limits.designs,
          exports: apiPlan.limits.exports === -1 ? 'unlimited' as const : apiPlan.limits.exports,
          storage: `${apiPlan.limits.storage}MB`,
          teamMembers: apiPlan.limits.teamMembers === -1 ? 'unlimited' as const : apiPlan.limits.teamMembers
        }
      };
    }
    
    // Fallback to local accountPlans
    return accountPlans.find(p => p.id === currentPlan) || accountPlans[0];
  }, [subscriptionPlans, currentPlan]);

  const currentPlanInfo = getAccountPlanInfo();

  // Calculate stats
  const totalTopUp = transactions.filter(t => t.type === 'topup').reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const thisMonthExports = activities.filter(a => a.type === 'export' && new Date(a.date).getMonth() === new Date().getMonth()).length;

  return {
    balance,
    currentPlan,
    currentPlanInfo,
    subscription,
    transactions,
    activities,
    teamMembers,
    businessInfo,
    totalTopUp,
    totalSpent,
    thisMonthExports,
    loading,
    error,
    handleTopUp,
    handleUpgradePlan,
    handleInviteMember,
    handleRemoveMember,
    saveBusinessInfo,
    toggleAutoRenew,
  };
};
