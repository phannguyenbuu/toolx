import React from 'react';
import { Wallet, Crown, Users, User, Download, Plus, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';
import { AccountPlanInfo, Transaction, ActivityLog } from './types';
import { formatCurrency, formatRelativeTime } from './utils';

interface OverviewTabProps {
  balance: number;
  totalTopUp: number;
  totalSpent: number;
  monthExports: number;
  currentPlanInfo: AccountPlanInfo;
  currentPlan: string;
  activities: ActivityLog[];
  onTopUp: () => void;
  onUpgrade: () => void;
  onInvite: () => void;
  onViewActivity: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  balance, totalTopUp, totalSpent, monthExports,
  currentPlanInfo, currentPlan, activities,
  onTopUp, onUpgrade, onInvite, onViewActivity
}) => {
  const PlanIcon = currentPlanInfo.icon;

  const stats = [
    { icon: Wallet, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', value: formatCurrency(balance), label: 'Số dư hiện tại' },
    { icon: ArrowUpRight, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', value: formatCurrency(totalTopUp), label: 'Tổng nạp' },
    { icon: ArrowDownLeft, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', value: formatCurrency(totalSpent), label: 'Tổng chi tiêu' },
    { icon: FileText, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', value: monthExports.toString(), label: 'PDF tháng này' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <User size={16} />;
      case 'export': return <Download size={16} />;
      case 'create': return <Plus size={16} />;
      case 'share': return <Users size={16} />;
      case 'upgrade': return <Crown size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-green-100 text-green-600';
      case 'export': return 'bg-blue-100 text-blue-600';
      case 'create': return 'bg-purple-100 text-purple-600';
      case 'share': return 'bg-orange-100 text-orange-600';
      case 'upgrade': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                <stat.icon size={20} className={stat.textColor} />
              </div>
              {idx === 0 && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <ArrowUpRight size={12} /> +12%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Plan & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PlanIcon size={24} />
                <span className="text-lg font-bold">Gói {currentPlanInfo.name}</span>
              </div>
              <p className="text-indigo-200 text-sm mb-4">
                {currentPlanInfo.price === 0 ? 'Miễn phí vĩnh viễn' : `${formatCurrency(currentPlanInfo.price)}/tháng`}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-indigo-200">Phiên làm việc</p>
                  <p className="font-bold">{currentPlanInfo.limits.sessions === 'unlimited' ? 'Không giới hạn' : currentPlanInfo.limits.sessions}</p>
                </div>
                <div>
                  <p className="text-indigo-200">Xuất PDF/tháng</p>
                  <p className="font-bold">{currentPlanInfo.limits.exports === 'unlimited' ? 'Không giới hạn' : currentPlanInfo.limits.exports}</p>
                </div>
                <div>
                  <p className="text-indigo-200">Lưu trữ</p>
                  <p className="font-bold">{currentPlanInfo.limits.storage}</p>
                </div>
                <div>
                  <p className="text-indigo-200">Thành viên</p>
                  <p className="font-bold">{currentPlanInfo.limits.teamMembers === 'unlimited' ? 'Không giới hạn' : currentPlanInfo.limits.teamMembers}</p>
                </div>
              </div>
            </div>
            {currentPlan !== 'enterprise' && (
              <button 
                onClick={onUpgrade}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all"
              >
                Nâng cấp
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Thao tác nhanh</h3>
          <div className="space-y-2">
            <button 
              onClick={onTopUp}
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-700 font-medium transition-all"
            >
              <Wallet size={18} />
              Nạp tiền
            </button>
            <button 
              onClick={onUpgrade}
              className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-purple-700 font-medium transition-all"
            >
              <Crown size={18} />
              Nâng cấp gói
            </button>
            <button 
              onClick={onInvite}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 font-medium transition-all"
            >
              <Users size={18} />
              Mời thành viên
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Hoạt động gần đây</h3>
          <button 
            onClick={onViewActivity}
            className="text-sm text-indigo-600 hover:underline"
          >
            Xem tất cả
          </button>
        </div>
        <div className="space-y-3">
          {activities.slice(0, 5).map(activity => (
            <div key={activity.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                <p className="text-xs text-gray-500">{formatRelativeTime(activity.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
