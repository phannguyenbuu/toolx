import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { User } from '../../types/api';

export interface SupabaseAuthContextType {
  user: User | null;
  token: string | null;
  wallet: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleData?: { email?: string; name?: string; fullName?: string; picture?: string; credential?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshWallet: () => Promise<void>;
  updateWalletBalance: (balance: number) => void;
}

const SupabaseAuthContext: React.Context<SupabaseAuthContextType | undefined> = typeof window !== 'undefined'
  ? ((window as any).__TOOLX_SUPABASE_AUTH_CTX__ = (window as any).__TOOLX_SUPABASE_AUTH_CTX__ || createContext<SupabaseAuthContextType | undefined>(undefined))
  : createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWallet = useCallback(async () => {
    setWallet({ balance: 0 });
  }, []);

  const updateWalletBalance = useCallback((balance: number) => {
    setWallet((prev: any) => prev ? { ...prev, balance } : { balance });
  }, []);

  useEffect(() => {
    // 1. Kiểm tra JWT lưu bền 30 ngày trong localStorage
    const savedToken = localStorage.getItem('auth_token');
    const savedUserStr = localStorage.getItem('auth_user');
    const savedExpiresAt = localStorage.getItem('auth_token_expires_at');

    if (savedToken && savedUserStr && savedExpiresAt) {
      const expiresAt = Number(savedExpiresAt);
      if (Date.now() < expiresAt) {
        try {
          const parsedUser = JSON.parse(savedUserStr);
          setUser(parsedUser);
          setToken(savedToken);
          setIsLoading(false);
          return;
        } catch (_) {}
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token_expires_at');
      }
    }

    // 2. Kiểm tra session Supabase (nếu có)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error?.message?.includes('future') || error?.message?.includes('JWT')) {
        supabase.auth.refreshSession().then(({ data: { session: refreshed } }) => {
          if (refreshed?.user) {
            setUser({ id: refreshed.user.id, email: refreshed.user.email || '', fullName: refreshed.user.user_metadata?.full_name || refreshed.user.email || '' } as User);
            setToken(refreshed.access_token || null);
          }
          setIsLoading(false);
        }).catch(() => { supabase.auth.signOut(); setIsLoading(false); });
        return;
      }
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email || '',
        } as User);
        setToken(session.access_token || null);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email || '',
        } as User);
        setToken(session.access_token || null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        const u = {
          id: data.user.id,
          email: data.user.email || '',
          fullName: data.user.user_metadata?.full_name || data.user.email || '',
        } as User;
        setUser(u);
        setToken(data.session?.access_token || null);
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('auth_token', data.session?.access_token || '');
        localStorage.setItem('auth_user', JSON.stringify(u));
        localStorage.setItem('auth_token_expires_at', String(expiresAt));
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Đăng nhập thất bại' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || email } },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        const u = {
          id: data.user.id,
          email: data.user.email || '',
          fullName: fullName || data.user.email || '',
        } as User;
        setUser(u);
        setToken(data.session?.access_token || null);
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('auth_token', data.session?.access_token || '');
        localStorage.setItem('auth_user', JSON.stringify(u));
        localStorage.setItem('auth_token_expires_at', String(expiresAt));
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Đăng ký thất bại' };
    }
  }, []);

  // Đăng nhập Google & lưu JWT 30 ngày
  const loginWithGoogle = useCallback(async (googleData?: { email?: string; name?: string; fullName?: string; picture?: string; credential?: string }) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleData || {}),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Đăng nhập Google thất bại');
      }

      const data = await res.json();
      const accessToken = data.access_token || data.token;
      const userProfile: User = {
        id: data.user?.id || `usr_google_${Date.now()}`,
        email: data.user?.email || '',
        fullName: data.user?.fullName || data.user?.name || data.user?.email || 'Người dùng Google',
        avatarUrl: data.user?.avatarUrl || data.user?.picture || '',
        provider: 'google',
      } as any;

      setUser(userProfile);
      setToken(accessToken);

      // Lưu JWT 30 ngày (30 * 24 * 3600 * 1000 ms)
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('auth_user', JSON.stringify(userProfile));
      localStorage.setItem('auth_token_expires_at', String(expiresAt));

      return { success: true };
    } catch (err: any) {
      console.error('Google login error:', err);
      return { success: false, error: err.message || 'Lỗi khi đăng nhập bằng Google' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch (_) {}
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token_expires_at');
    localStorage.removeItem('auth_wallet');
  }, []);

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        token,
        wallet,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshWallet,
        updateWalletBalance,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
