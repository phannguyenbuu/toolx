import React from 'react';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { AgentJobItem, StatusFilter } from '../types';

interface JobListPanelProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  totalCount: number;
  successCount: number;
  failedCount: number;
  filteredJobs: AgentJobItem[];
  selectedJobId: string;
  onSelectJob: (id: string) => void;
}

export const JobListPanel: React.FC<JobListPanelProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  successCount,
  failedCount,
  filteredJobs,
  selectedJobId,
  onSelectJob
}) => {
  return (
    <div className="w-full sm:w-80 md:w-96 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
      {/* Search & Filter bar */}
      <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm job theo tên, ID, mã, tham số..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => onStatusFilterChange('all')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('success')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Thành công ({successCount})
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('failed')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === 'failed'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            Lỗi ({failedCount})
          </button>
        </div>
      </div>

      {/* Jobs Scroll List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <AlertCircle size={24} className="mx-auto opacity-50" />
            <p>Không có Job nào khớp bộ lọc.</p>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('all');
              }}
              className="text-violet-600 font-semibold underline text-xs cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isSelected = job.id === selectedJobId;
            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className={`p-3 rounded-xl border transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-violet-50/80 border-violet-300 shadow-2xs'
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-xs text-slate-900 line-clamp-1">
                    {job.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1 ${
                      job.status === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {job.status === 'success' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                    <span>{job.status.toUpperCase()}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1.5 font-mono">
                  <span>{job.id}</span>
                  <span>•</span>
                  <span className="text-indigo-600 font-semibold">{job.duration_ms || 0}ms</span>
                </div>

                {/* Node & Tags */}
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 text-slate-600 font-medium truncate max-w-[200px]">
                    <Cpu size={11} className="text-slate-400" />
                    <span className="truncate">{job.node_name}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(job.created_at).toLocaleTimeString('vi-VN')}
                  </span>
                </div>

                {/* Quick Parameter Badges */}
                {job.parameters && Object.keys(job.parameters).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(job.parameters)
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono"
                        >
                          {k}: {String(v).slice(0, 15)}
                        </span>
                      ))}
                    {Object.keys(job.parameters).length > 3 && (
                      <span className="text-[9px] text-slate-400 font-mono self-center">
                        +{Object.keys(job.parameters).length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
