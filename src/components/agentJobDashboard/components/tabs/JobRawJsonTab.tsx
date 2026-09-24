import React from 'react';
import { Copy, Check } from 'lucide-react';
import { AgentJobItem } from '../../types';

interface JobRawJsonTabProps {
  selectedJob: AgentJobItem;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const JobRawJsonTab: React.FC<JobRawJsonTabProps> = ({
  selectedJob,
  copiedKey,
  onCopy
}) => {
  const jsonString = JSON.stringify(selectedJob, null, 2);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onCopy(jsonString, 'raw_job')}
          className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          {copiedKey === 'raw_job' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          <span>Sao chép toàn bộ Job</span>
        </button>
      </div>
      <div className="rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800">
        <pre>{jsonString}</pre>
      </div>
    </div>
  );
};
