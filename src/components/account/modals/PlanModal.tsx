import React from 'react';
import { Crown, X, Check } from 'lucide-react';
import { AccountPlan, AccountPlanInfo } from '../types';
import { accountPlans } from '../constants';
import { formatCurrency } from '../utils';

interface PlanModalProps {
  isOpen: boolean;
  currentPlan: AccountPlan;
  balance: number;
  onClose: () => void;
  onUpgrade: (planId: AccountPlan) => void;
  onTopUp: () => void;
}

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen, currentPlan, balance, onClose, onUpgrade, onTopUp
}) => {
  if (!isOpen) return null;

  const getPlanColorClasses = (plan: AccountPlanInfo, isCurrent: boolean) => {
    if (isCurrent) return 'border-purple-500 bg-purple-50 shadow-lg';
    return 'border-gray-200 hover:border-purple-300';
  };

  const getPlanIconBg = (color: string) => {
    switch (color) {
      case 'gray': return 'bg-gray-100 text-gray-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'amber': return 'bg-amber-100 text-amber-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPlanButtonBg = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500 hover:bg-blue-600';
      case 'purple': return 'bg-purple-500 hover:bg-purple-600';
      case 'amber': return 'bg-amber-500 hover:bg-amber-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Crown size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Gói tài khoản</h3>
                <p className="text-purple-200 text-sm">Chọn gói phù hợp với nhu cầu của bạn</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accountPlans.map(plan => {
              const PlanIcon = plan.icon;
              const isCurrent = currentPlan === plan.id;
              
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-5 transition-all ${getPlanColorClasses(plan, isCurrent)}`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Đang dùng
                    </div>
                  )}
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${getPlanIconBg(plan.color)}`}>
                    <PlanIcon size={24} />
                  </div>
                  
                  <h4 className="font-bold text-lg text-gray-800">{plan.name}</h4>
                  
                  <div className="mt-2 mb-4">
                    <span className="text-2xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Miễn phí' : formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && <span className="text-gray-500 text-sm">/tháng</span>}
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {plan.price > 0 && !isCurrent && (
                    <button
                      onClick={() => {
                        if (plan.price > balance) {
                          if (window.confirm(`Số dư không đủ. Bạn cần nạp thêm ${formatCurrency(plan.price - balance)}. Nạp tiền ngay?`)) {
                            onClose();
                            onTopUp();
                          }
                        } else if (window.confirm(`Xác nhận nâng cấp lên gói ${plan.name} với giá ${formatCurrency(plan.price)}/tháng?`)) {
                          onUpgrade(plan.id);
                        }
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all ${getPlanButtonBg(plan.color)}`}
                    >
                      {plan.price > balance ? 'Nạp tiền để nâng cấp' : 'Nâng cấp ngay'}
                    </button>
                  )}
                  
                  {isCurrent && plan.price > 0 && (
                    <div className="text-center text-sm text-purple-600 font-medium py-2.5">
                      ✓ Đã kích hoạt
                    </div>
                  )}
                  
                  {plan.price === 0 && !isCurrent && (
                    <div className="text-center text-sm text-gray-400 py-2.5">
                      Gói mặc định
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Balance info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-sm text-gray-600">
              Số dư hiện tại: <span className="font-bold text-emerald-600">{formatCurrency(balance)}</span>
              {balance < 99000 && (
                <button
                  onClick={() => { onClose(); onTopUp(); }}
                  className="ml-2 text-purple-600 hover:underline font-medium"
                >
                  Nạp thêm →
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
