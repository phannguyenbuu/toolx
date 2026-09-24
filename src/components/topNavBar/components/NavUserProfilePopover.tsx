import React from 'react';
import { User, Wallet, Crown, Settings, LogOut, LogIn } from 'lucide-react';
import { formatCurrency } from '../constants';
import { AccountPlan, AccountPlanInfo } from '../types';

interface NavUserProfilePopoverProps {
  isAuthenticated: boolean;
  user: {
    fullName?: string | null;
    email?: string | null;
  } | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  currentPlan: AccountPlan;
  currentPlanInfo: AccountPlanInfo;
  balance: number;
  onLoginClick?: () => void;
  onTopUpClick?: () => void;
  onOpenAccountPage?: (tab?: string) => void;
  logout: () => void;
}

export const NavUserProfilePopover: React.FC<NavUserProfilePopoverProps> = ({
  isAuthenticated,
  user,
  isOpen,
  onToggle,
  onClose,
  currentPlan,
  currentPlanInfo,
  balance,
  onLoginClick,
  onTopUpClick,
  onOpenAccountPage,
  logout,
}) => {
  return (
    <div className="relative w-full flex justify-center">
      {isAuthenticated && user ? (
        <>
          <button
            onClick={onToggle}
            className="w-11 h-11 rounded-full p-0.5 hover:ring-2 hover:ring-indigo-400 transition-all flex items-center justify-center relative"
            title={(user.fullName || user.email) ?? undefined}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {user.fullName
                ? user.fullName.charAt(0).toUpperCase()
                : user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>

          {/* Profile Toast Popover */}
          {isOpen && (
            <div className="fixed left-[84px] bottom-3 w-64 rounded-2xl shadow-2xl py-2 bg-white border border-gray-100 z-50 animate-fadeIn">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {user.fullName || 'Người dùng'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      currentPlan === 'free'
                        ? 'bg-gray-100 text-gray-600'
                        : currentPlan === 'basic'
                          ? 'bg-blue-100 text-blue-700'
                          : currentPlan === 'pro'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {currentPlanInfo.name}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  onTopUpClick?.();
                  onClose();
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
              >
                <Wallet size={14} className="text-emerald-500" /> Nạp tiền vào ví
              </button>
              <button
                onClick={() => {
                  onOpenAccountPage?.('plans');
                  onClose();
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
              >
                <Crown size={14} className="text-purple-500" /> Nâng cấp gói Pro
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    onOpenAccountPage?.('overview');
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <User size={14} className="text-gray-400" /> Tổng quan tài khoản
                </button>
                <button
                  onClick={() => {
                    onOpenAccountPage?.('wallet');
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Wallet size={14} className="text-gray-400" /> Lịch sử giao dịch
                </button>
                <button
                  onClick={() => {
                    onOpenAccountPage?.('settings');
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings size={14} className="text-gray-400" /> Cài đặt hệ thống
                </button>
              </div>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut size={14} /> Đăng xuất
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <button
          onClick={onLoginClick}
          title="Đăng nhập tài khoản"
          className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xs hover:shadow-md"
        >
          <LogIn size={17} />
        </button>
      )}
    </div>
  );
};
