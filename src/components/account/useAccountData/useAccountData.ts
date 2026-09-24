import { useState, useEffect, useCallback } from 'react';
import {
  AccountPlan,
  Transaction,
  ActivityLog,
  TeamMember,
  BusinessInfo,
  SubscriptionInfo
} from '../types';
import { defaultBusinessInfo } from '../constants';
import { printShopApi } from '../../../services/userApi';
import { SubscriptionPlan } from '../../../services/subscriptionPlansApi';
import { useSupabaseAuth as useAuth } from '../../auth/SupabaseAuthContext';
import { defaultSubscription } from './types';
import {
  loadAccountLocalStorage,
  saveWalletToStorage,
  saveTransactionsToStorage,
  saveActivitiesToStorage,
  saveTeamMembersToStorage,
  saveBusinessInfoToStorage
} from './localStorage';
import { fetchAccountApiData } from './apiLoaders';
import { resolveAccountPlanInfo } from './planHelpers';
import { executeTopUp, executeUpgradePlan } from './walletActions';
import { executeInviteMember, executeRemoveMember } from './teamActions';

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

  // Fallback to localStorage data
  const loadLocalStorageData = useCallback(() => {
    const storageState = loadAccountLocalStorage();
    setBalance(storageState.balance);
    setCurrentPlan(storageState.currentPlan);
    setTransactions(storageState.transactions);
    setActivities(storageState.activities);
    setTeamMembers(storageState.teamMembers);
    setBusinessInfo(storageState.businessInfo);
    setSubscription(storageState.subscription);
  }, []);

  const loadAccountData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      const apiData = await fetchAccountApiData();
      setSubscriptionPlans(apiData.subscriptionPlans);

      if (apiData.currentPlan) {
        setCurrentPlan(apiData.currentPlan);
      }
      setTransactions(apiData.transactions);
      setActivities(apiData.activities);
      setTeamMembers(apiData.teamMembers);

      if (apiData.businessInfo) {
        setBusinessInfo(apiData.businessInfo);
      }
      if (apiData.subscription) {
        setSubscription(apiData.subscription);
      }
    } catch (err) {
      console.error('Error loading account data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account data');
      loadLocalStorageData();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, loadLocalStorageData]);

  // Load data from API when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
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
  }, [isAuthenticated, user, loadAccountData]);

  // Storage save wrappers
  const saveWalletData = useCallback((newBalance: number, newPlan: AccountPlan) => {
    saveWalletToStorage(newBalance, newPlan);
    setBalance(newBalance);
    setCurrentPlan(newPlan);
  }, []);

  const saveTransactions = useCallback((newTransactions: Transaction[]) => {
    saveTransactionsToStorage(newTransactions);
    setTransactions(newTransactions);
  }, []);

  const saveActivities = useCallback((newActivities: ActivityLog[]) => {
    saveActivitiesToStorage(newActivities);
    setActivities(newActivities);
  }, []);

  const saveTeamMembers = useCallback((newMembers: TeamMember[]) => {
    saveTeamMembersToStorage(newMembers);
    setTeamMembers(newMembers);
  }, []);

  const updateBusinessInfo = useCallback((newInfo: BusinessInfo) => {
    saveBusinessInfoToStorage(newInfo);
    setBusinessInfo(newInfo);
  }, []);

  // Handle top-up
  const handleTopUp = useCallback(
    async (amount: number, onSuccess: () => void) => {
      await executeTopUp(amount, onSuccess, {
        isAuthenticated,
        balance,
        currentPlan,
        transactions,
        activities,
        subscriptionPlans,
        refreshWallet,
        loadAccountData,
        saveWalletData,
        saveTransactions,
        saveActivities,
        setLoading,
        setError
      });
    },
    [
      isAuthenticated,
      balance,
      currentPlan,
      transactions,
      activities,
      subscriptionPlans,
      refreshWallet,
      loadAccountData,
      saveWalletData,
      saveTransactions,
      saveActivities
    ]
  );

  // Handle plan upgrade
  const handleUpgradePlan = useCallback(
    async (
      planId: AccountPlan,
      onSuccess: () => void,
      onInsufficientBalance: (needed: number) => void
    ) => {
      await executeUpgradePlan(planId, onSuccess, onInsufficientBalance, {
        isAuthenticated,
        balance,
        currentPlan,
        transactions,
        activities,
        subscriptionPlans,
        refreshWallet,
        loadAccountData,
        saveWalletData,
        saveTransactions,
        saveActivities,
        setLoading,
        setError
      });
    },
    [
      isAuthenticated,
      balance,
      currentPlan,
      transactions,
      activities,
      subscriptionPlans,
      refreshWallet,
      loadAccountData,
      saveWalletData,
      saveTransactions,
      saveActivities
    ]
  );

  // Handle invite team member
  const handleInviteMember = useCallback(
    async (
      email: string,
      role: TeamMember['role'],
      onSuccess: () => void,
      onLimitReached: (max: number | 'unlimited') => void
    ) => {
      await executeInviteMember(email, role, onSuccess, onLimitReached, {
        isAuthenticated,
        currentPlan,
        teamMembers,
        activities,
        subscriptionPlans,
        loadAccountData,
        saveTeamMembers,
        saveActivities,
        setLoading,
        setError
      });
    },
    [
      isAuthenticated,
      currentPlan,
      teamMembers,
      activities,
      subscriptionPlans,
      loadAccountData,
      saveTeamMembers,
      saveActivities
    ]
  );

  // Remove team member
  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      await executeRemoveMember(memberId, {
        isAuthenticated,
        teamMembers,
        loadAccountData,
        saveTeamMembers,
        setLoading,
        setError
      });
    },
    [isAuthenticated, teamMembers, loadAccountData, saveTeamMembers]
  );

  // Save business info
  const saveBusinessInfo = useCallback(
    async (newInfo: BusinessInfo) => {
      try {
        setLoading(true);

        if (isAuthenticated) {
          await printShopApi.updatePrintShopInfo({
            name: newInfo.name,
            address: newInfo.address,
            phone: newInfo.phone,
            email: newInfo.email,
            website: newInfo.website,
            logo: newInfo.logo
          });
          setBusinessInfo(newInfo);
        } else {
          updateBusinessInfo(newInfo);
        }
      } catch (err) {
        console.error('Error saving business info:', err);
        setError(err instanceof Error ? err.message : 'Failed to save business info');
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, updateBusinessInfo]
  );

  // Toggle auto-renew
  const toggleAutoRenew = useCallback(async () => {
    try {
      setLoading(true);

      const newSubscription = { ...subscription, autoRenew: !subscription.autoRenew };
      if (isAuthenticated) {
        // TODO: Implement API call for auto-renew toggle
        setSubscription(newSubscription);
      } else {
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

  const currentPlanInfo = resolveAccountPlanInfo(subscriptionPlans, currentPlan);

  // Calculate stats
  const totalTopUp = transactions
    .filter((t) => t.type === 'topup')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const thisMonthExports = activities.filter(
    (a) => a.type === 'export' && new Date(a.date).getMonth() === new Date().getMonth()
  ).length;

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
    toggleAutoRenew
  };
};
