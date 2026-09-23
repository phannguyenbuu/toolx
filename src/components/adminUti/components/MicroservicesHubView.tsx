import React from 'react';
import {
  Layers,
  PlusCircle,
  Activity,
  RotateCcw,
  Plug,
  Unplug,
  Search
} from 'lucide-react';
import { MicroserviceItem } from '../../../services/microservicesConfig';
import { NodePingResult } from '../types';
import { MicroserviceCard } from './MicroserviceCard';

interface MicroservicesHubViewProps {
  servicesList: MicroserviceItem[];
  filteredServices: MicroserviceItem[];
  attachedCount: number;
  detachedCount: number;
  serviceSearch: string;
  setServiceSearch: (v: string) => void;
  attachFilter: 'all' | 'attached' | 'detached';
  setAttachFilter: (v: 'all' | 'attached' | 'detached') => void;
  servicePings: Record<string, NodePingResult>;
  isPinging: Record<string, boolean>;
  onOpenRegisterModal: () => void;
  onPingAllServices: () => void;
  onResetToDefaults: () => void;
  onToggleAttachService: (service: MicroserviceItem) => void;
  onPingService: (service: MicroserviceItem) => void;
  onOpenFrontend: (service: MicroserviceItem) => void;
  onJumpToCommands: (service: MicroserviceItem) => void;
}

export const MicroservicesHubView: React.FC<MicroservicesHubViewProps> = ({
  servicesList,
  filteredServices,
  attachedCount,
  detachedCount,
  serviceSearch,
  setServiceSearch,
  attachFilter,
  setAttachFilter,
  servicePings,
  isPinging,
  onOpenRegisterModal,
  onPingAllServices,
  onResetToDefaults,
  onToggleAttachService,
  onPingService,
  onOpenFrontend,
  onJumpToCommands
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 md:p-6 space-y-6 scrollbar-thin">
      {/* Top Architecture Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 text-indigo-700 text-[11px] font-bold flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-600" />
              <span>Kiến Trúc Microservices (Nhiều Frontend, 1 Backend Chung)</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
              Cluster: ToolxPrint Production
            </span>
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-900">
            Trung Tâm Quản Lý & Điều Phối Microservices ToolxPrint
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống được module hóa thành các Services chuyên biệt (Render 128GB, Bình trang, Thiết kế khuôn hộp, Dữ liệu biến đổi VDP, Tính giá in, Tiền kiểm PDF). Mỗi service là một Frontend độc lập kết nối chung về 1 Unified Backend API (Port 3002) và GoAgent PC cục bộ (Port 9173).
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <PlusCircle size={14} />
            <span>Đăng ký Microservice Mới</span>
          </button>
          <button
            type="button"
            onClick={onPingAllServices}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Activity size={14} />
            <span>Kiểm tra Kết nối Tất cả (Ping)</span>
          </button>
          <button
            type="button"
            onClick={onResetToDefaults}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Khôi phục danh sách dịch vụ mặc định"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Infrastructure Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tổng Microservices</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{servicesList.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">Hệ thống</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Đang Gắn (Attached)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{attachedCount}</span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <Plug size={12} /> Sẵn sàng
            </span>
          </div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Đã Tháo Rời (Detached)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-700">{detachedCount}</span>
            <span className="text-[11px] text-amber-600 font-bold flex items-center gap-0.5">
              <Unplug size={12} /> Tạm dừng
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Backend API & ToolxAgent</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-bold text-slate-900 font-mono">ToolxAgent</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-mono border border-emerald-200">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Search & Attach/Detach Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Tìm kiếm Service theo tên, route, công nghệ..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs transition"
          />
        </div>

        {/* Attach/Detach Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs">
          <button
            type="button"
            onClick={() => setAttachFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              attachFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Tất cả ({servicesList.length})
          </button>
          <button
            type="button"
            onClick={() => setAttachFilter('attached')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              attachFilter === 'attached'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Plug size={12} />
            <span>Đang gắn ({attachedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setAttachFilter('detached')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              attachFilter === 'detached'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Unplug size={12} />
            <span>Đã tháo rời ({detachedCount})</span>
          </button>
        </div>
      </div>

      {/* Microservices Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <MicroserviceCard
            key={service.id}
            service={service}
            pingResult={servicePings[service.id]}
            isPinging={isPinging[service.id]}
            onToggleAttach={onToggleAttachService}
            onPing={onPingService}
            onOpenFrontend={onOpenFrontend}
            onJumpToCommands={onJumpToCommands}
          />
        ))}
      </div>
    </div>
  );
};
