import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Wallet } from '../../types/api';
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshWallet: () => Promise<void>;
  updateWalletBalance: (newBalance: number) => void;
}

const AuthContext: React.Context<AuthContextType | undefined> = typeof window !== 'undefined'
  ? ((window as any).__TOOLX_AUTH_CTX__ = (window as any).__TOOLX_AUTH_CTX__ || createContext<AuthContextType | undefined>(undefined))
  : createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh wallet from API
  const refreshWallet = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.USER.WALLET}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const walletData = await response.json();
        setWallet(walletData);
        localStorage.setItem('auth_wallet', JSON.stringify(walletData));
      }
    } catch (error) {
      console.error('Error refreshing wallet:', error);
    }
  }, [token]);

  const updateWalletBalance = useCallback((newBalance: number) => {
    setWallet((prev: Wallet | null) => prev ? { ...prev, balance: newBalance } : null);
  }, []);

  // Check for saved authentication on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');
    const savedWallet = localStorage.getItem('auth_wallet');

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        if (savedWallet) {
          setWallet(JSON.parse(savedWallet));
        }
      } catch (error) {
        console.error('Error parsing saved auth data:', error);
        // Clear invalid data
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_wallet');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.message || 'Đăng nhập thất bại' 
        };
      }

      const data = await response.json();
      const accessToken = data.accessToken || data.access_token;
      
      if (!accessToken) {
        return { success: false, error: 'Không nhận được token' };
      }

      // Fetch user profile
      const profileResponse = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.USER.PROFILE}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        return { success: false, error: 'Không thể lấy thông tin người dùng' };
      }

      const userData = await profileResponse.json();
      
      setUser(userData);
      setToken(accessToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('auth_token', accessToken);
      
      await refreshWallet();
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng.' 
      };
    }
  }, [refreshWallet]);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, fullName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.message || 'Đăng ký thất bại' 
        };
      }

      const data = await response.json();
      const accessToken = data.accessToken || data.access_token;
      
      if (!accessToken) {
        return { success: false, error: 'Không nhận được token' };
      }

      // Fetch user profile
      const profileResponse = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.USER.PROFILE}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        return { success: false, error: 'Không thể lấy thông tin người dùng' };
      }

      const userData = await profileResponse.json();
      
      setUser(userData);
      setToken(accessToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('auth_token', accessToken);
      
      await refreshWallet();
      
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng.' 
      };
    }
  }, [refreshWallet]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setWallet(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_wallet');
  }, []);

  return (
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
