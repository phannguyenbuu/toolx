import { supabase } from '../supabase';
import { Subscription, Wallet, Transaction } from '../../types/api';
import { toCamel, getUserId, PaginationParams, paginate } from './helpers';

// ============================================
// SUBSCRIPTION API
// ============================================
export const subscriptionApi = {
  getPlans: async () => {
    const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order');
    if (error) throw new Error(error.message);
    return toCamel(data || []);
  },
  getSubscription: async (): Promise<Subscription | null> => {
    const userId = await getUserId();
    const { data } = await supabase.from('subscriptions').select('*, subscription_plans(*)').eq('user_id', userId).maybeSingle();
    return data ? toCamel(data) : null;
  },
  upgradeSubscription: async (planId: string, _paymentMethod: string) => {
    const userId = await getUserId();
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 86400000).toISOString();
    const { data, error } = await supabase.from('subscriptions').upsert({
      user_id: userId, plan_id: planId, status: 'active', billing_cycle: 'monthly',
      current_period_start: now, current_period_end: end
    }, { onConflict: 'user_id' }).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  cancelSubscription: async () => {
    const userId = await getUserId();
    await supabase.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('user_id', userId);
    return { success: true };
  },
};

// ============================================
// WALLET & TRANSACTIONS API
// ============================================
export const walletApi = {
  getWallet: async (): Promise<Wallet> => {
    const userId = await getUserId();
    let { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    if (!data) {
      const res = await supabase.from('wallets').insert({ user_id: userId, balance: 0, currency: 'VND' }).select().single();
      data = res.data;
      error = res.error;
    }
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  getTransactions: async (params?: PaginationParams & { type?: string; status?: string }) => {
    return paginate<Transaction>('transactions', params || {});
  },
  topupWallet: async (amount: number, paymentMethod: string) => {
    const userId = await getUserId();
    const wallet = await walletApi.getWallet();
    const newBalance = (wallet.balance || 0) + amount;
    const { data, error } = await supabase.from('transactions').insert({
      user_id: userId, type: 'topup', amount, balance_before: wallet.balance,
      balance_after: newBalance, payment_method: paymentMethod, status: 'completed'
    }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', userId);
    return toCamel(data);
  },
};
