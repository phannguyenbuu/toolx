import React from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Play,
  Download,
  Trash2
} from 'lucide-react';

interface JobDashboardHeaderProps {
  totalJobs: number;
  successJobs: number;
  failedJobs: number;
  avgDuration: number;
  isRunningTest: boolean;
  onRunTestJob: () => void;
  onExportJson: () => void;
  onClearAll: () => void;
}

export const JobDashboardHeader: React.FC<JobDashboardHeaderProps> = ({
  totalJobs,
  successJobs,
  failedJobs,
  avgDuration,
  isRunningTest,
  onRunTestJob,
  onExportJson,
  onClearAll
}) => {
  return (
    <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-600/20">
            <Activity size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Quản lý Tiến Trình / Job Inspector</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-mono font-bold">
                /job
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                agentapi chuẩn
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kiểm tra chi tiết mã thực thi (Script), Tham số nạp (Parameter) và Nhật ký phản hồi (Output)
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold pl-4 border-l border-slate-200">
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-1.5">
            <Layers size={13} className="text-slate-500" />
            <span>Tổng: {totalJobs}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>Thành công: {successJobs}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1.5">
            <AlertCircle size={13} />
            <span>Lỗi: {failedJobs}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center gap-1.5 font-mono">
            <Clock size={13} />
            <span>TB: {avgDuration}ms</span>
          </div>
        </div>
      </div>

      {/* Actions Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isRunningTest}
          onClick={onRunTestJob}
          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          title="Thực thi ngay một lệnh mẫu kiểm tra qua ToolxAgent"
        >
          <Play size={13} className={isRunningTest ? 'animate-spin' : ''} />
          <span>{isRunningTest ? 'Đang chạy...' : 'Chạy Job Test'}</span>
        </button>

        <button
          type="button"
          onClick={onExportJson}
          className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          title="Xuất toàn bộ lịch sử Jobs ra tệp JSON"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Xuất JSON</span>
        </button>

        <button
          type="button"
          onClick={onClearAll}
          className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          title="Xóa sạch toàn bộ lịch sử Jobs"
        >
          <Trash2 size={13} />
          <span className="hidden sm:inline">Xóa hết</span>
        </button>
      </div>
    </div>
  );
};
