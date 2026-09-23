import React from 'react';
import {
  Plug,
  Unplug,
  Globe,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Terminal
} from 'lucide-react';
import { MicroserviceItem } from '../../../services/microservicesConfig';
import { NodePingResult } from '../types';

interface MicroserviceCardProps {
  service: MicroserviceItem;
  pingResult?: NodePingResult;
  isPinging?: boolean;
  onToggleAttach: (service: MicroserviceItem) => void;
  onPing: (service: MicroserviceItem) => void;
  onOpenFrontend: (service: MicroserviceItem) => void;
  onJumpToCommands: (service: MicroserviceItem) => void;
}

export const MicroserviceCard: React.FC<MicroserviceCardProps> = ({
  service,
  pingResult,
  isPinging,
  onToggleAttach,
  onPing,
  onOpenFrontend,
  onJumpToCommands
}) => {
  const isAttached = service.is_attached;

  return (
    <div
      className={`border rounded-2xl p-5 transition flex flex-col justify-between shadow-2xs ${
        isAttached
          ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
          : 'bg-amber-50/20 border-dashed border-amber-300 opacity-90'
      }`}
    >
      {/* Card Top */}
      <div className="space-y-3">
        {/* Header row: Title, Category & Toggle Switch */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {service.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                {service.category}
              </span>
              {isAttached ? (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                  <Plug size={10} className="text-emerald-600" />
                  <span>ATTACHED</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
                  <Unplug size={10} className="text-amber-600" />
                  <span>DETACHED</span>
                </span>
              )}
            </div>
          </div>

          {/* Attach/Detach Toggle Checkbox */}
          <label
            className="relative inline-flex items-center cursor-pointer flex-shrink-0"
            title={isAttached ? 'Nhấp để Tháo rời (Detach)' : 'Nhấp để Gắn vào (Attach)'}
          >
            <input
              type="checkbox"
              checked={isAttached}
              onChange={() => onToggleAttach(service)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:border-white"></div>
          </label>
        </div>

        {/* Route URL info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Globe size={13} className="text-slate-400" />
          <button
            type="button"
            onClick={() => onOpenFrontend(service)}
            className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <span>toolxprint.com{service.routePath}</span>
            <ExternalLink size={10} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed">
          {service.description}
        </p>

        {/* Detached Notice if detached */}
        {!isAttached && (
          <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Unplug size={13} className="text-amber-700 flex-shrink-0" />
              <span>Dịch vụ đang tháo rời (Detached)</span>
            </div>
            <p className="text-amber-800 text-[10px] leading-normal">
              Đường dẫn <code className="font-mono font-semibold">toolxprint.com{service.routePath}</code> đang tạm dừng và ẩn khỏi thanh menu.
            </p>
          </div>
        )}

        {/* Target Backend info */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1 text-[11px]">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-500">Backend Port:</span>
            <span className="font-mono font-bold text-slate-800">Cổng :{service.backendPort}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-500">Công nghệ:</span>
            <span className="text-slate-700 font-medium truncate max-w-[180px]">{service.techStack}</span>
          </div>
        </div>

        {/* Core capabilities pills */}
        <div className="flex flex-wrap gap-1">
          {service.coreCapabilities.map((cap) => (
            <span
              key={cap}
              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
            >
              {cap}
            </span>
          ))}
        </div>

        {/* Ping / Latency status */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Kết nối backend:</span>
            {isPinging ? (
              <span className="text-slate-400 flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin text-indigo-500" />
                <span>Đang kiểm tra...</span>
              </span>
            ) : pingResult ? (
              <span className={`font-medium flex items-center gap-1 ${pingResult.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                {pingResult.ok ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                <span>{pingResult.message}</span>
              </span>
            ) : (
              <span className="text-slate-400">Sẵn sàng</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onPing(service)}
            disabled={isPinging}
            className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            Ping
          </button>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="flex flex-col gap-2 pt-4 border-t border-slate-150 mt-4">
        {/* Primary Attach/Detach Action Button */}
        <button
          type="button"
          onClick={() => onToggleAttach(service)}
          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs ${
            isAttached
              ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
          }`}
          title={isAttached ? 'Tháo rời dịch vụ này khỏi cụm hoạt động' : 'Gắn dịch vụ này vào hệ sinh thái ToolxPrint'}
        >
          {isAttached ? (
            <>
              <Unplug size={14} className="text-slate-500 group-hover:text-rose-600" />
              <span>Tháo Rời (Detach)</span>
            </>
          ) : (
            <>
              <Plug size={14} />
              <span>Gắn Vào Hệ Thống (Attach)</span>
            </>
          )}
        </button>

        {/* Secondary Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenFrontend(service)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isAttached
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
            }`}
            title={isAttached ? `Mở frontend toolxprint.com${service.routePath}` : 'Dịch vụ đang ở trạng thái tháo rời'}
          >
            <ExternalLink size={13} />
            <span>Mở Frontend</span>
          </button>
          <button
            type="button"
            onClick={() => onJumpToCommands(service)}
            className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
            title="Chuyển đến danh sách lệnh UtiCommands của Service này"
          >
            <Terminal size={13} className="text-indigo-600" />
            <span>Chạy Lệnh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
