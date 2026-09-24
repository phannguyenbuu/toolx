import {
  AccountPlan,
  Transaction,
  ActivityLog
} from '../types';
import { accountPlans } from '../constants';
import { formatCurrency } from '../utils';
import { subscriptionApi, walletApi } from '../../../services/userApi';
import { SubscriptionPlan } from '../../../services/subscriptionPlansApi';

export interface WalletActionContext {
  isAuthenticated: boolean;
  balance: number;
  currentPlan: AccountPlan;
  transactions: Transaction[];
  activities: ActivityLog[];
  subscriptionPlans: SubscriptionPlan[];
  refreshWallet: () => Promise<any>;
  loadAccountData: () => Promise<void>;
  saveWalletData: (balance: number, plan: AccountPlan) => void;
  saveTransactions: (txs: Transaction[]) => void;
  saveActivities: (acts: ActivityLog[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
}

export async function executeTopUp(
  amount: number,
  onSuccess: () => void,
  ctx: WalletActionContext
) {
  try {
    ctx.setLoading(true);

    if (ctx.isAuthenticated) {
      await walletApi.topupWallet(amount, 'bank_transfer');
      await ctx.refreshWallet();
      await ctx.loadAccountData();
    } else {
      const newBalance = ctx.balance + amount;
      ctx.saveWalletData(newBalance, ctx.currentPlan);

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        userId: 'demo-user',
        type: 'topup',
        amount: amount,
        balanceBefore: ctx.balance,
        balanceAfter: newBalance,
        description: 'Nạp tiền qua chuyển khoản',
        metadata: {},
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'completed',
        method: 'bank_transfer'
      };
      ctx.saveTransactions([newTransaction, ...ctx.transactions]);

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
      ctx.saveActivities([newActivity, ...ctx.activities]);
    }

    onSuccess();
  } catch (err) {
    console.error('Error topping up:', err);
    ctx.setError(err instanceof Error ? err.message : 'Failed to top up');
  } finally {
    ctx.setLoading(false);
  }
}

export async function executeUpgradePlan(
  planId: AccountPlan,
  onSuccess: () => void,
  onInsufficientBalance: (needed: number) => void,
  ctx: WalletActionContext
) {
  try {
    ctx.setLoading(true);

    if (ctx.isAuthenticated) {
      const plan = ctx.subscriptionPlans.find((p) => p.slug === planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      if (plan.priceMonthly > ctx.balance) {
        onInsufficientBalance(plan.priceMonthly - ctx.balance);
        return;
      }

      await subscriptionApi.upgradeSubscription(plan.id, 'wallet');
      await ctx.refreshWallet();
      await ctx.loadAccountData();
    } else {
      const plan = accountPlans.find((p) => p.id === planId);
      if (!plan) return;

      if (plan.price > ctx.balance) {
        onInsufficientBalance(plan.price - ctx.balance);
        return;
      }

      const newBalance = ctx.balance - plan.price;
      ctx.saveWalletData(newBalance, planId);

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        userId: 'demo-user',
        type: 'upgrade',
        amount: -plan.price,
        balanceBefore: ctx.balance,
        balanceAfter: newBalance,
        description: `Nâng cấp gói ${plan.name}`,
        metadata: { planId, planName: plan.name },
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'completed'
      };
      ctx.saveTransactions([newTransaction, ...ctx.transactions]);

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
      ctx.saveActivities([newActivity, ...ctx.activities]);
    }

    onSuccess();
  } catch (err) {
    console.error('Error upgrading plan:', err);
    ctx.setError(err instanceof Error ? err.message : 'Failed to upgrade plan');
  } finally {
    ctx.setLoading(false);
  }
}
