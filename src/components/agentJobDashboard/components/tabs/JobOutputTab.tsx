import React from 'react';
import { Copy, Check } from 'lucide-react';
import { AgentJobItem } from '../../types';

interface JobOutputTabProps {
  output: AgentJobItem['output'];
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const JobOutputTab: React.FC<JobOutputTabProps> = ({
  output,
  copiedKey,
  onCopy
}) => {
  const copyContent =
    output.stdout || JSON.stringify(output.result_payload || {}, null, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Nhật ký phản hồi (Output Logs & Payload):</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
            HTTP 200 / Exec Complete
          </span>
        </div>
        <button
          type="button"
          onClick={() => onCopy(copyContent, 'output')}
          className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          {copiedKey === 'output' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          <span>Sao chép Output</span>
        </button>
      </div>

      {/* Standard Output (stdout) Terminal */}
      {output.stdout && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Standard Output (stdout):</span>
          </div>
          <div className="rounded-xl bg-slate-900 text-emerald-400 p-3 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
            <pre className="whitespace-pre-wrap">{output.stdout}</pre>
          </div>
        </div>
      )}

      {/* Standard Error (stderr) if any */}
      {output.stderr && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-600">
            <span>Standard Error (stderr):</span>
          </div>
          <div className="rounded-xl bg-rose-950/40 text-rose-300 p-3 font-mono text-xs overflow-x-auto border border-rose-900 shadow-inner">
            <pre className="whitespace-pre-wrap">{output.stderr}</pre>
          </div>
        </div>
      )}

      {/* Structured Result Payload */}
      {output.result_payload && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Result Payload (JSON):</span>
          </div>
          <div className="rounded-xl bg-slate-900 text-cyan-300 p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
            <pre>{JSON.stringify(output.result_payload, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Image Preview if available */}
      {output.preview_b64 && (
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-600">Bản xem trước hình ảnh kết xuất:</span>
          <div className="p-3 border rounded-xl bg-slate-100 flex justify-center">
            <img
              src={output.preview_b64}
              alt="Job Preview"
              className="max-h-72 object-contain rounded border border-slate-300 shadow-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};
