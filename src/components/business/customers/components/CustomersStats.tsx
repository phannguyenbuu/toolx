import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatVND } from '../../../../types/business';
import { CustomersStatsData } from '../types';

interface CustomersStatsProps {
  stats: CustomersStatsData;
}

export const CustomersStats: React.FC<CustomersStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Tổng khách hàng</div>
        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Tổng đơn hàng</div>
        <div className="text-2xl font-bold text-indigo-600">{stats.totalOrders}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Tổng doanh thu</div>
        <div className="text-lg font-bold text-green-600">{formatVND(stats.totalSpent)}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500 flex items-center gap-1">
          <TrendingUp size={12} className="text-amber-500" /> Khách VIP (≥10 đơn)
        </div>
        <div className="text-2xl font-bold text-amber-600">{stats.vip}</div>
      </div>
    </div>
  );
};
