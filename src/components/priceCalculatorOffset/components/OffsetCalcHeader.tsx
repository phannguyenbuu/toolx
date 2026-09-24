import React from 'react';
import { Printer, FileText, Settings, LayoutList } from 'lucide-react';

interface OffsetCalcHeaderProps {
  activeTab: 'calc' | 'machines';
  setActiveTab: (tab: 'calc' | 'machines') => void;
  ordersCount: number;
  onNavigateOrders: () => void;
}

export const OffsetCalcHeader: React.FC<OffsetCalcHeaderProps> = ({
  activeTab,
  setActiveTab,
  ordersCount,
  onNavigateOrders
}) => {
  return (
    <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg text-white">
          <Printer size={20} />
        </div>
        <div>
          <h1 className="font-bold text-base text-slate-800 leading-tight">Tính Giá In Offset</h1>
          <p className="text-xs text-slate-400">Hệ thống tối ưu bình trang & chi phí tự động</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('calc')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'calc'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} /> Tính Giá
          </button>
          <button
            onClick={() => setActiveTab('machines')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'machines'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings size={14} /> Cấu Hình & Máy In Offset
          </button>
        </div>
        <button
          onClick={onNavigateOrders}
          className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 flex items-center gap-1.5 transition ml-2"
        >
          <LayoutList size={14} /> Quản lý đơn hàng
          {ordersCount > 0 && (
            <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {ordersCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
