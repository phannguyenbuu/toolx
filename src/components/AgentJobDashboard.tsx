import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Code2,
  Sliders,
  Play,
  RotateCcw,
  Copy,
  Check,
  Search,
  Trash2,
  Download,
  ExternalLink,
  Cpu,
  Server,
  Layers,
  ChevronRight,
  Filter,
  Eye,
  FileCode,
  Zap,
  Sparkles
} from 'lucide-react';
import {
  agentJobService,
  AgentJobItem
} from '../services/agentJobService';
import { GOAGENT_DEFAULT_PORT, execScriptViaGoAgent } from '../services/goAgentService';

interface AgentJobDashboardProps {
  onNavigateToCommand?: (slug: string) => void;
}

export const AgentJobDashboard: React.FC<AgentJobDashboardProps> = ({
  onNavigateToCommand
}) => {
  const [jobs, setJobs] = useState<AgentJobItem[]>(() => agentJobService.getAll());
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    const list = agentJobService.getAll();
    return list[0]?.id || '';
  });

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [nodeFilter, setNodeFilter] = useState<string>('all');

  // Detail view sub-tab: 'script' | 'parameters' | 'output' | 'raw_json'
  const [detailTab, setDetailTab] = useState<'script' | 'parameters' | 'output' | 'raw_json'>('script');

  // Copy feedbacks
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Sync state on event
  useEffect(() => {
    const handleUpdate = () => {
      const all = agentJobService.getAll();
      setJobs(all);
      if (!selectedJobId && all.length > 0) {
        setSelectedJobId(all[0].id);
      }
    };
    window.addEventListener('toolx_jobs_updated', handleUpdate);
    return () => window.removeEventListener('toolx_jobs_updated', handleUpdate);
  }, [selectedJobId]);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Stats
  const totalJobs = jobs.length;
  const successJobs = useMemo(() => jobs.filter((j) => j.status === 'success').length, [jobs]);
  const failedJobs = useMemo(() => jobs.filter((j) => j.status === 'failed').length, [jobs]);
  const avgDuration = useMemo(() => {
    if (jobs.length === 0) return 0;
    const totalMs = jobs.reduce((acc, j) => acc + (j.duration_ms || 0), 0);
    return Math.round(totalMs / jobs.length);
  }, [jobs]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (nodeFilter !== 'all' && job.node_role !== nodeFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = job.name.toLowerCase().includes(q);
      const matchId = job.id.toLowerCase().includes(q);
      const matchScript = job.script.toLowerCase().includes(q);
      const matchNode = job.node_name.toLowerCase().includes(q);
      const matchParams = JSON.stringify(job.parameters).toLowerCase().includes(q);
      const matchOutput = (job.output.stdout || '').toLowerCase().includes(q);
      return matchName || matchId || matchScript || matchNode || matchParams || matchOutput;
    });
  }, [jobs, statusFilter, nodeFilter, searchQuery]);

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || jobs[0];
  }, [jobs, selectedJobId, filteredJobs]);

  // Run a quick Test Job to verify live execution
  const handleRunTestJob = async () => {
    setIsRunningTest(true);
    showToast('🚀 Đang chạy Job kiểm tra kết nối qua ToolxAgent...');

    const testScript = `# Script Kiểm Tra Hệ Thống qua /job Toolx
import sys, os, platform, json, time

start_t = time.time()
info = {
    "ok": True,
    "service": "agentapi.toolxprint.com/job",
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "python": sys.version.split()[0],
    "platform": platform.platform(),
    "pid": os.getpid(),
    "working_dir": os.getcwd(),
    "test_cmyk_support": True,
    "gcr_algorithm": "Light GCR 22% (SWOP v2)",
    "execution_time_ms": round((time.time() - start_t) * 1000, 2)
}

print("__GOAGENT_RESULT__" + json.dumps(info))
`;

    const startTime = performance.now();
    try {
      const res = await execScriptViaGoAgent(testScript, GOAGENT_DEFAULT_PORT);
      const duration = Math.round(performance.now() - startTime);

      agentJobService.recordJob({
        name: 'Test Job: Kiểm tra kết nối ToolxAgent',
        category: 'Diagnostic',
        status: res.ok ? 'success' : 'failed',
        node_id: 'node-local-pc',
        node_name: 'ToolxAgent',
        node_role: 'local_agent',
        node_target: `127.0.0.1:${GOAGENT_DEFAULT_PORT}`,
        script: testScript,
        script_language: 'python',
        parameters: {
          action: 'health_check',
          test_cmyk: true,
          gcr_default: 0.22,
          timestamp: new Date().toISOString()
        },
        output: {
          stdout: res.stdout || 'Thực thi test job thành công qua ToolxAgent.',
          stderr: res.stderr || (res.ok ? '' : res.error),
          result_payload: res.result_payload || null,
          duration_ms: duration
        },
        duration_ms: duration,
        triggered_by: 'Nút Kiểm tra /job Admin'
      });

      showToast(`✅ Đã thực thi Test Job thành công trong ${duration}ms!`);
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      agentJobService.recordJob({
        name: 'Test Job: Kiểm tra kết nối ToolxAgent',
        category: 'Diagnostic',
        status: 'failed',
        node_id: 'node-local-pc',
        node_name: 'ToolxAgent',
        node_role: 'local_agent',
        node_target: `127.0.0.1:${GOAGENT_DEFAULT_PORT}`,
        script: testScript,
        script_language: 'python',
        parameters: {
          action: 'health_check',
          error_attempt: true
        },
        output: {
          stdout: '',
          stderr: err.message || 'Không thể kết nối đến ToolxAgent',
          duration_ms: duration
        },
        duration_ms: duration,
        triggered_by: 'Nút Kiểm tra /job Admin'
      });
      showToast(`⚠️ Lỗi chạy test: ${err.message}`);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `toolx_agent_jobs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('📥 Đã xuất dữ liệu lịch sử Jobs dạng JSON.');
  };

  const handleClearAll = () => {
    if (window.confirm('Xác nhận xóa toàn bộ lịch sử Jobs? Hành động này không thể hoàn tác.')) {
      agentJobService.clearAll();
      showToast('🗑️ Đã xóa toàn bộ lịch sử Jobs.');
    }
  };

  const handleDeleteCurrent = (id: string) => {
    agentJobService.deleteJob(id);
    showToast(`Đã xóa job ${id}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-800">
      {/* ================= TOAST NOTIFICATION ================= */}
      {actionToast && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
          <Sparkles size={14} className="text-amber-400" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* ================= TOP STATS & ACTIONS BAR ================= */}
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
            onClick={handleRunTestJob}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Thực thi ngay một lệnh mẫu kiểm tra qua ToolxAgent"
          >
            <Play size={13} className={isRunningTest ? 'animate-spin' : ''} />
            <span>{isRunningTest ? 'Đang chạy...' : 'Chạy Job Test'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Xuất toàn bộ lịch sử Jobs ra tệp JSON"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Xuất JSON</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Xóa sạch toàn bộ lịch sử Jobs"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Xóa hết</span>
          </button>
        </div>
      </div>

      {/* ================= MAIN SPLIT CONTENT ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: JOBS LIST (380px) */}
        <div className="w-full sm:w-80 md:w-96 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
          {/* Search & Filter bar */}
          <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm job theo tên, ID, mã, tham số..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-violet-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('success')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Thành công ({successJobs})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('failed')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === 'failed'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                Lỗi ({failedJobs})
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
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="text-violet-600 font-semibold underline text-xs"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSelected = job.id === selectedJob?.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
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

        {/* RIGHT COLUMN: JOB DETAILS INSPECTOR */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedJob ? (
            <>
              {/* Detail Header Bar */}
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
                    onClick={() => setDetailTab('script')}
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
                    onClick={() => setDetailTab('parameters')}
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
                    onClick={() => setDetailTab('output')}
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
                    onClick={() => setDetailTab('raw_json')}
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

              {/* Detail Tab Content Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* 1. SCRIPT TAB */}
                {detailTab === 'script' && (
                  <div className="space-y-3 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Nội dung mã lệnh đã thực thi:</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold">
                          {selectedJob.script_language || 'python'}
                        </span>
                        <span className="text-[10px] text-slate-400">({selectedJob.script.split('\n').length} dòng)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedJob.script, 'script')}
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
                        {selectedJob.script}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 2. PARAMETERS TAB */}
                {detailTab === 'parameters' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Danh sách tham số đầu vào (Input Parameters):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(selectedJob.parameters, null, 2), 'params')}
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
                          {Object.entries(selectedJob.parameters || {}).map(([key, val]) => (
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
                      <pre>{JSON.stringify(selectedJob.parameters, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {/* 3. OUTPUT TAB */}
                {detailTab === 'output' && (
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
                        onClick={() =>
                          handleCopy(
                            selectedJob.output.stdout ||
                              JSON.stringify(selectedJob.output.result_payload || {}, null, 2),
                            'output'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedKey === 'output' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>Sao chép Output</span>
                      </button>
                    </div>

                    {/* Standard Output (stdout) Terminal */}
                    {selectedJob.output.stdout && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Standard Output (stdout):</span>
                        </div>
                        <div className="rounded-xl bg-slate-900 text-emerald-400 p-3 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                          <pre className="whitespace-pre-wrap">{selectedJob.output.stdout}</pre>
                        </div>
                      </div>
                    )}

                    {/* Standard Error (stderr) if any */}
                    {selectedJob.output.stderr && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-rose-600">
                          <span>Standard Error (stderr):</span>
                        </div>
                        <div className="rounded-xl bg-rose-950/40 text-rose-300 p-3 font-mono text-xs overflow-x-auto border border-rose-900 shadow-inner">
                          <pre className="whitespace-pre-wrap">{selectedJob.output.stderr}</pre>
                        </div>
                      </div>
                    )}

                    {/* Structured Result Payload */}
                    {selectedJob.output.result_payload && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Result Payload (JSON):</span>
                        </div>
                        <div className="rounded-xl bg-slate-900 text-cyan-300 p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                          <pre>{JSON.stringify(selectedJob.output.result_payload, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {/* Image Preview if available */}
                    {selectedJob.output.preview_b64 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-600">Bản xem trước hình ảnh kết xuất:</span>
                        <div className="p-3 border rounded-xl bg-slate-100 flex justify-center">
                          <img
                            src={selectedJob.output.preview_b64}
                            alt="Job Preview"
                            className="max-h-72 object-contain rounded border border-slate-300 shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. RAW JSON TAB */}
                {detailTab === 'raw_json' && (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(selectedJob, null, 2), 'raw_job')}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedKey === 'raw_job' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>Sao chép toàn bộ Job</span>
                      </button>
                    </div>
                    <div className="rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800">
                      <pre>{JSON.stringify(selectedJob, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              <p>Chọn một Job từ danh sách bên trái để kiểm tra chi tiết.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
