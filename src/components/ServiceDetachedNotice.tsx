import React from 'react';
import { Unplug, ArrowLeft, Shield, CheckCircle2, Globe } from 'lucide-react';
import { MicroserviceItem } from '../services/microservicesConfig';

interface ServiceDetachedNoticeProps {
  service: MicroserviceItem;
  onBackToHome: () => void;
  onGoToAdmin?: () => void;
  onAttach?: () => void;
}

export const ServiceDetachedNotice: React.FC<ServiceDetachedNoticeProps> = ({
  service,
  onBackToHome,
  onGoToAdmin,
  onAttach
}) => {
  return (
    <div className="flex-1 h-full w-full bg-slate-50 flex items-center justify-center p-6 select-none overflow-y-auto">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 text-center space-y-6">
        {/* Status Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
          <Unplug size={40} className="stroke-[1.75]" />
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-black">
            !
          </span>
        </div>

        {/* Header Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono font-semibold">
            <Globe size={13} className="text-slate-400" />
            <span>toolxprint.com{service.routePath}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Microservice Đang Tạm Tháo Rời
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            Dịch vụ <strong className="text-slate-800 font-bold">{service.name}</strong> đã được tháo rời (Detached) khỏi cụm hoạt động và đang tạm ngưng phục vụ.
          </p>
        </div>

        {/* Detail Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Mã định danh Service:</span>
            <span className="font-mono font-bold text-slate-800">{service.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Đường dẫn Route:</span>
            <span className="font-mono font-semibold text-indigo-600">{service.routePath}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Cổng Backend phụ trách:</span>
            <span className="font-mono text-slate-700">Port :{service.backendPort}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Lý do tháo rời:</span>
            <span className="text-amber-700 font-medium">{service.detached_reason || 'Bảo trì hệ thống'}</span>
          </div>
          {service.detached_at && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/80 text-slate-400">
              <span>Thời điểm tháo rời:</span>
              <span className="font-mono">{new Date(service.detached_at).toLocaleString('vi-VN')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Về Trang Chủ</span>
          </button>

          {onAttach && (
            <button
              type="button"
              onClick={onAttach}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Gắn Lại Dịch Vụ (Attach)</span>
            </button>
          )}

          {onGoToAdmin && (
            <button
              type="button"
              onClick={onGoToAdmin}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Mở Quản lý Services trên Admin"
            >
              <Shield size={14} className="text-indigo-600" />
              <span>Quản Trị</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceDetachedNotice;