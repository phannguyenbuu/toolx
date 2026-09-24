import React from 'react';
import { formatVND } from '../../../../types/business';
import { QuotesStatsData } from '../types';

interface QuotesStatsProps {
  stats: QuotesStatsData;
}

export const QuotesStats: React.FC<QuotesStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Tổng số</div>
        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Nháp</div>
        <div className="text-2xl font-bold text-slate-600">{stats.draft}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Đã gửi</div>
        <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Chấp nhận</div>
        <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="text-sm text-slate-500">Giá trị đã chấp nhận</div>
        <div className="text-lg font-bold text-amber-600">{formatVND(stats.totalValue)}</div>
      </div>
    </div>
  );
};
