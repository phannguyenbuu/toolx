import { supabase } from '../supabase';
import { User } from '../../types/api';
import { toCamel, toSnake, getUserId } from './helpers';

export const userApi = {
  getProfile: async (): Promise<User> => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  updateProfile: async (updates: { fullName?: string; phone?: string; avatarUrl?: string }): Promise<User> => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('profiles').update(toSnake(updates)).eq('id', userId).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const userId = await getUserId();
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', userId);
    return { avatarUrl: urlData.publicUrl };
  },
  getOverview: async () => {
    const userId = await getUserId();
    const [profile, wallet, custCount, teamCount, sub] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('wallets').select('*').eq('user_id', userId).single(),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('subscriptions').select('*, subscription_plans(*)').eq('user_id', userId).maybeSingle(),
    ]);
    return {
      user: toCamel(profile.data),
      stats: {
        walletBalance: wallet.data?.balance || 0,
        customersCount: custCount.count || 0,
        teamMembersCount: teamCount.count || 0,
        recentActivityCount: 0,
        totalTransactions: 0,
        totalSpent: 0,
      },
      subscription: sub.data ? toCamel(sub.data) : null,
    };
  },
  changePassword: async (_currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  },
  deactivateAccount: async (_data: { reason?: string; feedback?: string }) => {
    const userId = await getUserId();
    await supabase.from('profiles').update({ status: 'inactive' }).eq('id', userId);
    await supabase.auth.signOut();
    return { success: true };
  },
};
