// Re-export from Supabase-based api.ts
import { userApi, subscriptionApi as subApi, walletApi as wApi, teamApi as tApi, activityApi as aApi } from './api';
import { supabase } from './supabase';

export const accountOverviewApi = { getOverview: userApi.getOverview };
export const subscriptionApi = subApi;
export const walletApi = wApi;
export const teamApi = tApi;
export const activityApi = aApi;

export const printShopApi = {
  getPrintShopInfo: async () => { return printShopApi.get(); },
  updatePrintShopInfo: async (data: any) => { return printShopApi.update(data); },
  get: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('print_shops').select('*').eq('user_id', user.id).maybeSingle();
    return data;
  },
  update: async (updates: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('print_shops').upsert({ ...updates, user_id: user.id }, { onConflict: 'user_id' }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};
