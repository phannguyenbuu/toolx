import React from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Transaction, TransactionType } from './types';
import { formatCurrency, formatDate } from './utils';

interface WalletTabProps {
  balance: number;
  transactions: Transaction[];
  transactionFilter: 'all' | TransactionType;
  onFilterChange: (filter: 'all' | TransactionType) => void;
  onTopUp: () => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  balance, transactions, transactionFilter, onFilterChange, onTopUp
}) => {
  const filteredTransactions = transactionFilter === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === transactionFilter);

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Số dư hiện tại</p>
            <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
          </div>
          <button 
            onClick={onTopUp}
            className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Nạp tiền
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Lịch sử giao dịch</h3>
          <div className="flex items-center gap-2">
            <select 
              value={transactionFilter}
              onChange={e => onFilterChange(e.target.value as 'all' | TransactionType)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả</option>
              <option value="topup">Nạp tiền</option>
              <option value="upgrade">Nâng cấp</option>
              <option value="purchase">Mua hàng</option>
              <option value="refund">Hoàn tiền</option>
            </select>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Wallet size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Chưa có giao dịch nào</p>
            </div>
          ) : (
            filteredTransactions.map(transaction => (
              <div key={transaction.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className={`p-3 rounded-xl ${
                  transaction.amount > 0 ? 'bg-emerald-100' : 'bg-orange-100'
                }`}>
                  {transaction.amount > 0 ? (
                    <ArrowUpRight size={20} className="text-emerald-600" />
                  ) : (
                    <ArrowDownLeft size={20} className="text-orange-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${transaction.amount > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    transaction.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {transaction.status === 'completed' ? 'Hoàn thành' :
                     transaction.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
