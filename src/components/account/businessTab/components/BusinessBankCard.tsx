import React from 'react';
import { CreditCard } from 'lucide-react';
import { BusinessInfo } from '../types';

interface BusinessBankCardProps {
  bankAccount?: string;
  bankName?: string;
  bankBranch?: string;
  onChange: (field: keyof BusinessInfo, value: string) => void;
}

export const BusinessBankCard: React.FC<BusinessBankCardProps> = ({
  bankAccount = '',
  bankName = '',
  bankBranch = '',
  onChange,
}) => {
  return (
    <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
      <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
        <CreditCard size={18} />
        Thông tin thanh toán
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
          <input
            type="text"
            value={bankAccount}
            onChange={e => onChange('bankAccount', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="VD: 1234567890"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
          <input
            type="text"
            value={bankName}
            onChange={e => onChange('bankName', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="VD: Vietcombank"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
          <input
            type="text"
            value={bankBranch}
            onChange={e => onChange('bankBranch', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="VD: Chi nhánh HCM"
          />
        </div>
      </div>
    </div>
  );
};
