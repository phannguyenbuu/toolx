import React from 'react';
import {
  Code2,
  Sliders,
  Terminal,
  FileCode
} from 'lucide-react';
import { AgentJobItem, JobDetailTab } from '../types';

interface JobDetailHeaderProps {
  selectedJob: AgentJobItem;
  detailTab: JobDetailTab;
  onTabChange: (tab: JobDetailTab) => void;
}

export const JobDetailHeader: React.FC<JobDetailHeaderProps> = ({
  selectedJob,
  detailTab,
  onTabChange
}) => {
  return (
    <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-slate-900">{selectedJob.name}</h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              selectedJob.status === 'success'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {selectedJob.status === 'success' ? 'Hoàn thành (200 OK)' : 'Lỗi thực thi (Error)'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold font-mono">
            {selectedJob.duration_ms || 0} ms
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>ID: <strong>{selectedJob.id}</strong></span>
          <span>•</span>
          <span>Node: <strong className="text-slate-700">{selectedJob.node_name}</strong></span>
          <span>•</span>
          <span>Khởi tạo: {new Date(selectedJob.created_at).toLocaleString('vi-VN')}</span>
        </div>
      </div>

      {/* Sub-tabs switchers */}
      <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => onTabChange('script')}
          className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            detailTab === 'script'
              ? 'bg-white text-violet-700 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 size={13} />
          <span>📜 Script Code</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('parameters')}
          className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            detailTab === 'parameters'
              ? 'bg-white text-violet-700 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders size={13} />
          <span>⚙️ Parameters ({Object.keys(selectedJob.parameters || {}).length})</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('output')}
          className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            detailTab === 'output'
              ? 'bg-white text-violet-700 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal size={13} />
          <span>💻 Output Response</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('raw_json')}
          className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
            detailTab === 'raw_json'
              ? 'bg-white text-violet-700 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Xem toàn bộ Job dạng JSON"
        >
          <FileCode size={13} />
          <span>JSON</span>
        </button>
      </div>
    </div>
  );
};
