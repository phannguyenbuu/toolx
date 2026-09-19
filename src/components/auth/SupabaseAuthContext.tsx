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
    // Placeholder - implement if needed
    setWallet({ balance: 0 });
  }, []);

  const updateWalletBalance = useCallback((balance: number) => {
    setWallet((prev: any) => prev ? { ...prev, balance } : { balance });
  }, []);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error?.message?.includes('future') || error?.message?.includes('JWT')) {
        // Clock skew - force refresh
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
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email || '',
        } as User);
        setToken(session.access_token || null);
      } else {
        setUser(null);
        setToken(null);
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
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          fullName: data.user.user_metadata?.full_name || data.user.email || '',
        } as User);
        setToken(data.session?.access_token || null);
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
        options: {
          data: {
            full_name: fullName || email,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          fullName: fullName || data.user.email || '',
        } as User);
        setToken(data.session?.access_token || null);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Đăng ký thất bại' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
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
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
};
