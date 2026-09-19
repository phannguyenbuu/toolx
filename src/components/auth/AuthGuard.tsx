import React from 'react';
import { useSupabaseAuth as useAuth } from './SupabaseAuthContext';
import { Lock, LogIn } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  onLoginClick: () => void;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, onLoginClick, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Yêu cầu đăng nhập
          </h2>
          <p className="text-gray-600 mb-6">
            Vui lòng đăng nhập để sử dụng tính năng này. Dữ liệu của bạn sẽ được tự động lưu vào tài khoản.
          </p>
          <button
            onClick={onLoginClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <LogIn className="w-5 h-5" />
            Đăng nhập ngay
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Chưa có tài khoản? <button onClick={onLoginClick} className="text-blue-600 hover:underline">Đăng ký miễn phí</button>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
