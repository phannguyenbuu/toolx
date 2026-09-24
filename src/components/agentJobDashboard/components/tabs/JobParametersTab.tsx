import React from 'react';
import { Copy, Check } from 'lucide-react';

interface JobParametersTabProps {
  parameters?: Record<string, any>;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const JobParametersTab: React.FC<JobParametersTabProps> = ({
  parameters = {},
  copiedKey,
  onCopy
}) => {
  const jsonString = JSON.stringify(parameters, null, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">
          Danh sách tham số đầu vào (Input Parameters):
        </span>
        <button
          type="button"
          onClick={() => onCopy(jsonString, 'params')}
          className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          {copiedKey === 'params' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          <span>Sao chép JSON Params</span>
        </button>
      </div>

      {/* Formatted Parameter Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold">
              <th className="py-2.5 px-4 w-1/3">Tên tham số (Key)</th>
              <th className="py-2.5 px-4">Giá trị nạp (Value)</th>
              <th className="py-2.5 px-4 w-28">Kiểu dữ liệu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {Object.entries(parameters).map(([key, val]) => (
              <tr key={key} className="hover:bg-slate-50/80 transition">
                <td className="py-2 px-4 font-bold text-indigo-700">{key}</td>
                <td className="py-2 px-4 text-slate-800 break-all">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </td>
                <td className="py-2 px-4 text-slate-400 text-[11px]">{typeof val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* JSON Format View */}
      <div className="rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800">
        <div className="text-[10px] text-slate-400 mb-1">// Raw Parameters JSON:</div>
        <pre>{jsonString}</pre>
      </div>
    </div>
  );
};
