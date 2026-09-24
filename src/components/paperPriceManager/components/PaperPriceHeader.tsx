import React from 'react';
import { Database, Building2, Settings } from 'lucide-react';
import { PaperActiveTab, Supplier } from '../types';

interface PaperPriceHeaderProps {
  activeTab: PaperActiveTab;
  setActiveTab: (tab: PaperActiveTab) => void;
  suppliers: Supplier[];
}

export const PaperPriceHeader: React.FC<PaperPriceHeaderProps> = ({
  activeTab,
  setActiveTab,
  suppliers
}) => {
  return (
    <div className="bg-indigo-700 text-white p-4 shadow-md shrink-0">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-2 rounded">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Quản Lý Giá Giấy</h1>
            <p className="text-[10px] opacity-80">Sàn giá giấy & Nhà cung cấp</p>
          </div>
        </div>
        <div className="flex bg-indigo-900/50 p-1 rounded-lg">
          {(['prices', 'suppliers', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 cursor-pointer transition ${
                activeTab === tab
                  ? 'bg-white text-indigo-800 shadow'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              {tab === 'prices' && (
                <>
                  <Database size={14} /> Bảng Giá
                </>
              )}
              {tab === 'suppliers' && (
                <>
                  <Building2 size={14} /> NCC{' '}
                  {suppliers.length > 0 && (
                    <span className="bg-indigo-200 text-indigo-700 text-[10px] px-1.5 rounded-full">
                      {suppliers.length}
                    </span>
                  )}
                </>
              )}
              {tab === 'config' && (
                <>
                  <Settings size={14} /> Cấu Hình
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
