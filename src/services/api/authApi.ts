import { supabase } from '../supabase';
import { userApi } from './userApi';
import { walletApi } from './subscriptionAndWalletApi';

// ============================================
// TOKEN MANAGEMENT (kept for backward compat)
// ============================================
export const tokenManager = {
  getToken: () => null as string | null,
  setToken: (_t: string) => {},
  removeToken: () => {},
  isTokenValid: () => false,
};

// ============================================
// AUTHENTICATION API
// ============================================
export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const profile = await userApi.getProfile();
    const wallet = await walletApi.getWallet();
    return { access_token: data.session?.access_token || '', user: profile, wallet };
  },
  register: async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email, full_name: fullName || '', role: 'user', status: 'active'
      });
      await supabase.from('wallets').insert({ user_id: data.user.id, balance: 0, currency: 'VND' });
    }
    const profile = await userApi.getProfile();
    const wallet = await walletApi.getWallet();
    return { access_token: data.session?.access_token || '', user: profile, wallet };
  },
  refreshToken: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw new Error(error.message);
    return { access_token: data.session?.access_token || '' };
  },
  logout: async () => { await supabase.auth.signOut(); },
  forgotPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return { message: 'Email đặt lại mật khẩu đã được gửi' };
  },
  resetPassword: async (_token: string, password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return { message: 'Mật khẩu đã được cập nhật' };
  },
};
