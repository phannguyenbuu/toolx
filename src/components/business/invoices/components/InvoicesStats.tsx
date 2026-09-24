import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { formatVND } from '../../../../types/business';
import { InvoicesStatsData } from '../types';

interface InvoicesStatsProps {
  stats: InvoicesStatsData;
}

export const InvoicesStats: React.FC<InvoicesStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Tổng số</div>
        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Doanh thu</div>
        <div className="text-lg font-bold text-emerald-600">{formatVND(stats.revenue)}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Công nợ</div>
        <div className="text-lg font-bold text-red-600">{formatVND(stats.pending)}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500 flex items-center gap-1">
          <CheckCircle size={12} className="text-green-500" /> Đã TT
        </div>
        <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500 flex items-center gap-1">
          <AlertCircle size={12} className="text-red-500" /> Chưa TT
        </div>
        <div className="text-2xl font-bold text-red-600">{stats.unpaid}</div>
      </div>
    </div>
  );
};
