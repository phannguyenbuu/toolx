import React from 'react';
import { Copy, Check } from 'lucide-react';

interface JobScriptTabProps {
  script: string;
  scriptLanguage?: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const JobScriptTab: React.FC<JobScriptTabProps> = ({
  script,
  scriptLanguage = 'python',
  copiedKey,
  onCopy
}) => {
  const lineCount = script.split('\n').length;

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Nội dung mã lệnh đã thực thi:</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold">
            {scriptLanguage}
          </span>
          <span className="text-[10px] text-slate-400">({lineCount} dòng)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(script, 'script')}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedKey === 'script' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copiedKey === 'script' ? 'Đã sao chép' : 'Sao chép Script'}</span>
          </button>
        </div>
      </div>

      {/* Script Code Block with Line Numbers */}
      <div className="flex-1 rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
        <pre className="whitespace-pre leading-relaxed">
          {script}
        </pre>
      </div>
    </div>
  );
};
