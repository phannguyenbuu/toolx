import React, { useState } from 'react';
import { Wallet, BarChart3, Users, Building2, History, Settings, Crown, HelpCircle, LogOut } from 'lucide-react';
import { TransactionType, ActivityType, TeamRole } from './types';
import { accountPlans } from './constants';
import { formatCurrency } from './utils';
import { useAccountData } from './useAccountData';
import { OverviewTab } from './OverviewTab';
import { WalletTab } from './WalletTab';
import { TeamTab } from './TeamTab';
import { BusinessTab } from './BusinessTab';
import { ActivityTab } from './ActivityTab';
import { SettingsTab } from './SettingsTab';
import { SubscriptionTab } from './SubscriptionTab';
import { TopUpModal, PlanModal, InviteModal } from './modals';

type TabType = 'overview' | 'subscription' | 'wallet' | 'team' | 'business' | 'activity' | 'settings';

interface AccountDashboardProps {
  onClose: () => void;
  initialTab?: string;
}

export const AccountDashboard: React.FC<AccountDashboardProps> = ({ onClose, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Map initialTab to valid TabType, handle 'plans' -> 'wallet' with modal
    if (initialTab === 'plans') return 'wallet';
    if (['overview', 'subscription', 'wallet', 'team', 'business', 'activity', 'settings'].includes(initialTab)) {
      return initialTab as TabType;
    }
    return 'overview';
  });
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | TransactionType>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityType>('all');

  const {
    balance,
    currentPlan,
    currentPlanInfo,
    subscription,
    transactions,
    activities,
    teamMembers,
    businessInfo,
    totalTopUp,
    totalSpent,
    thisMonthExports,
    handleTopUp,
    handleUpgradePlan,
    handleInviteMember,
    handleRemoveMember,
    saveBusinessInfo,
    toggleAutoRenew,
  } = useAccountData();

  const PlanIcon = currentPlanInfo.icon;

  const menuItems = [
    { id: 'overview' as TabType, label: 'Tổng quan', icon: BarChart3 },
    { id: 'subscription' as TabType, label: 'Gói tài khoản', icon: Crown },
    { id: 'wallet' as TabType, label: 'Ví & Giao dịch', icon: Wallet },
    { id: 'team' as TabType, label: 'Quản lý Team', icon: Users },
    { id: 'business' as TabType, label: 'Thông tin xưởng in', icon: Building2 },
    { id: 'activity' as TabType, label: 'Lịch sử hoạt động', icon: History },
    { id: 'settings' as TabType, label: 'Cài đặt', icon: Settings },
  ];

  const handleInvite = (email: string, role: TeamRole) => {
    handleInviteMember(
      email,
      role,
      () => {
        setIsInviteModalOpen(false);
        alert('Đã gửi lời mời thành công!');
      },
      (max) => {
        alert(`Gói ${currentPlanInfo.name} chỉ cho phép tối đa ${max} thành viên. Vui lòng nâng cấp gói.`);
      }
    );
  };

  const handleUpgrade = (planId: typeof currentPlan) => {
    const plan = accountPlans.find(p => p.id === planId);
    handleUpgradePlan(
      planId,
      () => {
        setIsPlanModalOpen(false);
        alert(`Đã nâng cấp lên gói ${plan?.name} thành công!`);
      },
      (needed) => {
        alert(`Số dư không đủ. Vui lòng nạp thêm ${formatCurrency(needed)}`);
        setIsPlanModalOpen(false);
        setIsTopUpModalOpen(true);
      }
    );
  };

  // Open plan modal if initialTab is 'plans'
  React.useEffect(() => {
    if (initialTab === 'plans') {
      setIsPlanModalOpen(true);
    }
  }, [initialTab]);

  return (
    <div className="h-full bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Quản lý tài khoản</h1>
            <p className="text-sm text-gray-500">Quản lý thông tin, gói dịch vụ và team của bạn</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
              currentPlan === 'free' ? 'bg-gray-100 text-gray-600' :
              currentPlan === 'basic' ? 'bg-blue-100 text-blue-700' :
              currentPlan === 'pro' ? 'bg-purple-100 text-purple-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              <PlanIcon size={14} />
              {currentPlanInfo.name}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold">
              <Wallet size={14} />
              {formatCurrency(balance)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            A
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-gray-100">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              <HelpCircle size={18} className="text-gray-400" />
              Trợ giúp
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <OverviewTab
              balance={balance}
              totalTopUp={totalTopUp}
              totalSpent={totalSpent}
              monthExports={thisMonthExports}
              currentPlanInfo={currentPlanInfo}
              currentPlan={currentPlan}
              activities={activities}
              onTopUp={() => setIsTopUpModalOpen(true)}
              onUpgrade={() => setIsPlanModalOpen(true)}
              onInvite={() => setIsInviteModalOpen(true)}
              onViewActivity={() => setActiveTab('activity')}
            />
          )}

          {activeTab === 'subscription' && (
            <SubscriptionTab
              subscription={subscription}
              currentPlanInfo={currentPlanInfo}
              allPlans={accountPlans}
              onUpgrade={() => setIsPlanModalOpen(true)}
              onToggleAutoRenew={toggleAutoRenew}
            />
          )}

          {activeTab === 'wallet' && (
            <WalletTab
              balance={balance}
              transactions={transactions}
              transactionFilter={transactionFilter}
              onFilterChange={setTransactionFilter}
              onTopUp={() => setIsTopUpModalOpen(true)}
            />
          )}

          {activeTab === 'team' && (
            <TeamTab
              teamMembers={teamMembers}
              currentPlanInfo={currentPlanInfo}
              onInvite={() => setIsInviteModalOpen(true)}
              onRemoveMember={handleRemoveMember}
            />
          )}

          {activeTab === 'business' && (
            <BusinessTab
              businessInfo={businessInfo}
              onSave={saveBusinessInfo}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab
              activities={activities}
              activityFilter={activityFilter}
              onFilterChange={setActivityFilter}
            />
          )}

          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>

      {/* Modals */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        balance={balance}
        onClose={() => setIsTopUpModalOpen(false)}
        onTopUp={handleTopUp}
      />

      <PlanModal
        isOpen={isPlanModalOpen}
        currentPlan={currentPlan}
        balance={balance}
        onClose={() => setIsPlanModalOpen(false)}
        onUpgrade={handleUpgrade}
        onTopUp={() => { setIsPlanModalOpen(false); setIsTopUpModalOpen(true); }}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        teamCount={teamMembers.length}
        currentPlanInfo={currentPlanInfo}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  );
};
