import React from 'react';
import { 
  Crown, Calendar, Clock, Zap, HardDrive, FileOutput, 
  CheckCircle2, AlertTriangle, RefreshCw, ArrowUpCircle, Shield
} from 'lucide-react';
import { AccountPlanInfo, SubscriptionInfo } from './types';
import { formatCurrency } from './utils';

interface SubscriptionTabProps {
  subscription: SubscriptionInfo;
  currentPlanInfo: AccountPlanInfo;
  allPlans: AccountPlanInfo[];
  onUpgrade: () => void;
  onToggleAutoRenew: () => void;
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({
  subscription,
  currentPlanInfo,
  allPlans,
  onUpgrade,
  onToggleAutoRenew,
}) => {
  const PlanIcon = currentPlanInfo.icon;
  
  // Calculate days remaining
  const expiryDate = new Date(subscription.expiryDate);
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining === 0;

  // Calculate usage percentages
  const getUsagePercent = (used: number, limit: number | 'unlimited') => {
    if (limit === 'unlimited') return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const sessionPercent = getUsagePercent(subscription.usedSessions, currentPlanInfo.limits.sessions);
  const exportPercent = getUsagePercent(subscription.usedExports, currentPlanInfo.limits.exports);

  // Parse storage
  const parseStorage = (str: string) => {
    const match = str.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    return match[2].toUpperCase() === 'GB' ? value * 1024 : value;
  };
  const usedStorageMB = parseStorage(subscription.usedStorage);
  const limitStorageMB = parseStorage(currentPlanInfo.limits.storage);
  const storagePercent = limitStorageMB > 0 ? Math.min(100, Math.round((usedStorageMB / limitStorageMB) * 100)) : 0;

  const colorMap: Record<string, string> = {
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  };

  const bgColorMap: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
  };

  const textColorMap: Record<string, string> = {
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className={`rounded-2xl border-2 p-6 ${bgColorMap[currentPlanInfo.color]}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${colorMap[currentPlanInfo.color]} flex items-center justify-center`}>
              <PlanIcon className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{currentPlanInfo.name}</h2>
              <p className={`text-lg font-semibold ${textColorMap[currentPlanInfo.color]}`}>
                {currentPlanInfo.price === 0 ? 'Miễn phí' : `${formatCurrency(currentPlanInfo.price)}/tháng`}
              </p>
            </div>
          </div>
          {currentPlanInfo.id !== 'enterprise' && (
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition-all flex items-center gap-2"
            >
              <ArrowUpCircle size={18} />
              Nâng cấp
            </button>
          )}
        </div>

        {/* Subscription Period */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Calendar size={16} />
              <span className="text-sm">Ngày bắt đầu</span>
            </div>
            <p className="font-semibold text-gray-800">
              {new Date(subscription.startDate).toLocaleDateString('vi-VN', { 
                day: '2-digit', month: '2-digit', year: 'numeric' 
              })}
            </p>
          </div>
          
          <div className={`rounded-xl p-4 ${isExpired ? 'bg-red-100' : isExpiringSoon ? 'bg-amber-100' : 'bg-white/70'}`}>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock size={16} />
              <span className="text-sm">Ngày hết hạn</span>
            </div>
            <p className={`font-semibold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-800'}`}>
              {new Date(subscription.expiryDate).toLocaleDateString('vi-VN', { 
                day: '2-digit', month: '2-digit', year: 'numeric' 
              })}
            </p>
            {isExpired && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Đã hết hạn
              </p>
            )}
            {isExpiringSoon && !isExpired && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Còn {daysRemaining} ngày
              </p>
            )}
          </div>

          <div className="bg-white/70 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <RefreshCw size={16} />
              <span className="text-sm">Tự động gia hạn</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleAutoRenew}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  subscription.autoRenew ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    subscription.autoRenew ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${subscription.autoRenew ? 'text-green-600' : 'text-gray-500'}`}>
                {subscription.autoRenew ? 'Bật' : 'Tắt'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Zap size={20} className="text-amber-500" />
          Mức sử dụng tháng này
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Shield size={14} /> Phiên làm việc
              </span>
              <span className="text-sm font-medium">
                {subscription.usedSessions} / {currentPlanInfo.limits.sessions === 'unlimited' ? '∞' : currentPlanInfo.limits.sessions}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  sessionPercent > 90 ? 'bg-red-500' : sessionPercent > 70 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: currentPlanInfo.limits.sessions === 'unlimited' ? '10%' : `${sessionPercent}%` }}
              />
            </div>
          </div>

          {/* Exports */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <FileOutput size={14} /> Lượt xuất PDF
              </span>
              <span className="text-sm font-medium">
                {subscription.usedExports} / {currentPlanInfo.limits.exports === 'unlimited' ? '∞' : currentPlanInfo.limits.exports}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  exportPercent > 90 ? 'bg-red-500' : exportPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: currentPlanInfo.limits.exports === 'unlimited' ? '10%' : `${exportPercent}%` }}
              />
            </div>
          </div>

          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <HardDrive size={14} /> Lưu trữ
              </span>
              <span className="text-sm font-medium">
                {subscription.usedStorage} / {currentPlanInfo.limits.storage}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-purple-500'
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Features */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Crown size={20} className="text-purple-500" />
          Tính năng gói {currentPlanInfo.name}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentPlanInfo.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-gray-700">
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available Plans */}
      {currentPlanInfo.id !== 'enterprise' && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">So sánh các gói</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {allPlans.map(plan => {
              const Icon = plan.icon;
              const isCurrent = plan.id === currentPlanInfo.id;
              
              return (
                <div 
                  key={plan.id}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isCurrent 
                      ? `${bgColorMap[plan.color]} border-current` 
                      : 'bg-white hover:shadow-md cursor-pointer'
                  }`}
                  onClick={() => !isCurrent && onUpgrade()}
                >
                  <div className={`w-10 h-10 rounded-lg ${colorMap[plan.color]} flex items-center justify-center mb-3`}>
                    <Icon className="text-white" size={20} />
                  </div>
                  <h4 className="font-bold text-gray-800">{plan.name}</h4>
                  <p className={`text-sm font-semibold ${textColorMap[plan.color]}`}>
                    {plan.price === 0 ? 'Miễn phí' : formatCurrency(plan.price)}
                  </p>
                  {isCurrent && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Đang sử dụng
                    </span>
                  )}
                  <ul className="mt-3 space-y-1">
                    {plan.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                        <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-xs text-gray-400">+{plan.features.length - 3} tính năng khác</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
