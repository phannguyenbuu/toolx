import React from 'react';
import { Printer, LayoutList, FileText, Cog } from 'lucide-react';

interface DigitalCalcHeaderProps {
  activeTab: 'calc' | 'machines';
  setActiveTab: (tab: 'calc' | 'machines') => void;
  onNavigateToOrders: () => void;
}

export const DigitalCalcHeader: React.FC<DigitalCalcHeaderProps> = ({
  activeTab,
  setActiveTab,
  onNavigateToOrders
}) => {
  return (
    <div className="bg-cyan-700 text-white p-4 shadow-md shrink-0">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-2 rounded">
            <Printer size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Tính Giá In Nhanh</h1>
            <p className="text-[10px] opacity-80">Digital Pro</p>
          </div>
        </div>
        <div className="flex bg-cyan-900/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('calc')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold cursor-pointer transition ${
              activeTab === 'calc'
                ? 'bg-white text-cyan-800 shadow'
                : 'text-cyan-200 hover:text-white'
            }`}
          >
            <LayoutList size={16} /> Tính Giá
          </button>
          <button
            onClick={onNavigateToOrders}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-cyan-200 hover:text-white cursor-pointer transition"
          >
            <FileText size={16} /> Đơn Hàng
          </button>
          <button
            onClick={() => setActiveTab('machines')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold cursor-pointer transition ${
              activeTab === 'machines'
                ? 'bg-white text-cyan-800 shadow'
                : 'text-cyan-200 hover:text-white'
            }`}
          >
            <Cog size={16} /> Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};
