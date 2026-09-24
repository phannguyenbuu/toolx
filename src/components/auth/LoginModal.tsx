import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useSupabaseAuth as useAuth } from './SupabaseAuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: 'test@test.com',
    password: '12345678',
    fullName: '',
    confirmPassword: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isLoginMode && formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setIsLoading(false);
      return;
    }

    try {
      const result = isLoginMode
        ? await login(formData.email, formData.password)
        : await register(formData.email, formData.password, formData.fullName);

      if (result.success) {
        onClose();
        setFormData({ email: '', password: '', fullName: '', confirmPassword: '' });
      } else {
        setError(result.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      if (typeof loginWithGoogle === 'function') {
        const emailToUse = formData.email.includes('@gmail') ? formData.email : 'user.google@gmail.com';
        const result = await loginWithGoogle({
          email: emailToUse,
          fullName: 'Tài khoản Google',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
        });
        if (result.success) {
          onClose();
        } else {
          setError(result.error || 'Đăng nhập Google thất bại');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi kết nối Google');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setFormData({ email: '', password: '', fullName: '', confirmPassword: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">
            {isLoginMode ? 'Đăng nhập Toolx' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-violet-100 text-xs mt-1">
            {isLoginMode
              ? 'Đăng nhập để đồng bộ và lưu trữ tệp in bền vững'
              : 'Tạo tài khoản để lưu trữ không giới hạn trên đám mây'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Nút Đăng nhập bằng Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Đăng nhập bằng Google</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded-full">
              JWT 30 ngày
            </span>
          </button>

          {/* Phân cách */}
          <div className="flex items-center gap-2 my-2">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[11px] text-slate-400 uppercase font-medium">hoặc dùng Email</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
              {error}
            </div>
          )}

          {/* Form Email/Password */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLoginMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>{isLoginMode ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
              )}
            </button>
          </form>

          {/* Ghi chú bảo mật & thời hạn JWT 30 ngày */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>Phiên đăng nhập tự động lưu bằng JWT trong <b>30 ngày</b>.</span>
          </div>

          {/* Switch Mode Footer */}
          <div className="text-center pt-1 text-xs text-slate-600">
            {isLoginMode ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
            <button
              type="button"
              onClick={switchMode}
              className="ml-1 text-violet-600 hover:text-violet-700 font-bold cursor-pointer"
            >
              {isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
