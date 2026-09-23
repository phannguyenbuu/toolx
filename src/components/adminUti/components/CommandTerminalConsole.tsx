import React from 'react';
import {
  Terminal,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  HardDrive
} from 'lucide-react';
import { ExecResult } from '../../../services/utiCommandService';
import { TerminalStreamTab } from '../types';

interface CommandTerminalConsoleProps {
  terminalLogs: ExecResult[];
  terminalStreamTab: TerminalStreamTab;
  setTerminalStreamTab: (tab: TerminalStreamTab) => void;
  copiedTerminal: boolean;
  onCopyTerminal: () => void;
  onClearTerminal: () => void;
  showToast: (msg: string) => void;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
}

export const CommandTerminalConsole: React.FC<CommandTerminalConsoleProps> = ({
  terminalLogs,
  terminalStreamTab,
  setTerminalStreamTab,
  copiedTerminal,
  onCopyTerminal,
  onClearTerminal,
  showToast,
  terminalEndRef
}) => {
  return (
    <div className="h-64 md:h-72 flex flex-col bg-slate-950 flex-shrink-0 border-t border-slate-800">
      {/* Terminal Header */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-xs flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-100">
            <Terminal size={14} className="text-emerald-400" />
            <span>Terminal Output</span>
          </div>

          {/* Stream Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setTerminalStreamTab('all')}
              className={`px-2.5 py-0.5 rounded font-semibold transition cursor-pointer ${
                terminalStreamTab === 'all'
                  ? 'bg-slate-800 text-slate-100 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setTerminalStreamTab('stdout')}
              className={`px-2.5 py-0.5 rounded font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                terminalStreamTab === 'stdout'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-2xs'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>STDOUT</span>
            </button>
            <button
              type="button"
              onClick={() => setTerminalStreamTab('stderr')}
              className={`px-2.5 py-0.5 rounded font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                terminalStreamTab === 'stderr'
                  ? 'bg-rose-950 text-rose-300 border border-rose-700/60 shadow-2xs'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>STDERR</span>
            </button>
            <button
              type="button"
              onClick={() => setTerminalStreamTab('payload')}
              className={`px-2.5 py-0.5 rounded font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                terminalStreamTab === 'payload'
                  ? 'bg-purple-950 text-purple-300 border border-purple-700/60 shadow-2xs'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              <span className="font-mono text-[10px]">{`{ }`}</span>
              <span>PAYLOAD (JSON)</span>
            </button>
          </div>

          {terminalLogs.length > 0 && terminalLogs[0].duration_ms && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono hidden md:inline">
              ⚡ {terminalLogs[0].duration_ms}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopyTerminal}
            disabled={terminalLogs.length === 0}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-medium transition flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <Copy size={12} />
            <span>{copiedTerminal ? 'Đã chép!' : 'Sao chép'}</span>
          </button>
          <button
            onClick={onClearTerminal}
            disabled={terminalLogs.length === 0}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-rose-400 text-[11px] font-medium transition disabled:opacity-40 cursor-pointer"
          >
            Xóa màn hình
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-3 select-text scrollbar-thin bg-slate-950">
        {terminalLogs.length === 0 ? (
          <div className="text-slate-500 italic py-6 text-center">
            (Chưa có lệnh nào được chạy. Nhấn 'Build & Chạy Ngay' hoặc Ctrl+Enter để thực thi mã lệnh sống).
          </div>
        ) : (
          terminalLogs.map((log, idx) => {
            const hasStdout = Boolean(log.stdout || (!log.stderr && log.output));
            const hasStderr = Boolean(log.stderr || (!log.ok && (log.error || log.output)));
            const hasPayload = Boolean(
              log.result_payload &&
              (typeof log.result_payload === 'object' ? Object.keys(log.result_payload).length > 0 : true)
            );

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border leading-relaxed ${
                  log.ok
                    ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                    : 'bg-rose-950/30 border-rose-900 text-rose-200'
                }`}
              >
                {/* Log Meta Header */}
                <div className="flex flex-wrap items-center justify-between text-[11px] gap-2 mb-2.5 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-bold">
                      {log.ok ? <CheckCircle2 size={12} className="text-emerald-400" /> : <AlertTriangle size={12} className="text-rose-400" />}
                      <span className={log.ok ? 'text-emerald-400' : 'text-rose-400'}>
                        {log.ok ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </span>

                    {log.node_name && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center gap-1 border border-slate-700">
                        <span>{log.node_role === 'render_server' ? '🚀' : '💻'}</span>
                        <span>{log.node_name}</span>
                      </span>
                    )}

                    {log.node_role && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                          log.node_role === 'render_server'
                            ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                            : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                        }`}
                      >
                        {log.node_role === 'render_server' ? 'Cloud Server' : 'Local Agent'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    {log.cloud_url && (
                      <span className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60 flex items-center gap-1 font-mono">
                        <Cloud size={10} /> <span>Cloud: {log.cloud_url}</span>
                      </span>
                    )}
                    {log.local_path && (
                      <span className="text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1 font-mono">
                        <HardDrive size={10} /> <span>Local: {log.local_path}</span>
                      </span>
                    )}
                    <span className="font-mono text-slate-400">{log.timestamp} • {log.duration_ms ? `${log.duration_ms}ms` : ''}</span>
                  </div>
                </div>

                {/* Content Rendering By Stream Tab */}
                {(terminalStreamTab === 'all' || terminalStreamTab === 'stdout') && hasStdout && (
                  <div className="mb-2">
                    {terminalStreamTab === 'all' && (
                      <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> STDOUT (Nhật ký tiến trình)
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap font-mono text-[11px] overflow-x-auto text-emerald-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                      {log.stdout || log.output}
                    </pre>
                  </div>
                )}

                {(terminalStreamTab === 'all' || terminalStreamTab === 'stderr') && hasStderr && (
                  <div className="mb-2">
                    {terminalStreamTab === 'all' && (
                      <div className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> STDERR (Cảnh báo & Lỗi)
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap font-mono text-[11px] overflow-x-auto text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60 leading-relaxed">
                      {log.stderr || log.error}
                    </pre>
                  </div>
                )}

                {(terminalStreamTab === 'all' || terminalStreamTab === 'payload') && hasPayload && (
                  <div className="mb-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> RESULT_PAYLOAD (Dữ liệu JSON)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(log.result_payload, null, 2));
                          showToast('Đã sao chép Result Payload JSON!');
                        }}
                        className="text-[10px] text-purple-300 hover:text-purple-100 flex items-center gap-1 font-normal cursor-pointer"
                      >
                        <Copy size={10} /> Chép JSON
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] overflow-x-auto text-purple-200 bg-purple-950/30 p-2.5 rounded-lg border border-purple-900/50 leading-relaxed">
                      {typeof log.result_payload === 'string' ? log.result_payload : JSON.stringify(log.result_payload, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Empty Fallbacks when Tab Selected */}
                {terminalStreamTab === 'stdout' && !hasStdout && (
                  <div className="text-slate-500 italic text-xs py-1">(Không có dữ liệu STDOUT từ lệnh này)</div>
                )}
                {terminalStreamTab === 'stderr' && !hasStderr && (
                  <div className="text-emerald-500/80 italic text-xs py-1">✓ Không có lỗi hoặc cảnh báo (STDERR trống)</div>
                )}
                {terminalStreamTab === 'payload' && !hasPayload && (
                  <div className="text-slate-500 italic text-xs py-1">(Lệnh này không trả về Result Payload JSON)</div>
                )}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
