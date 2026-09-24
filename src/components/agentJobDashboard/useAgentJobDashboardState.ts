import { useState, useEffect, useMemo } from 'react';
import {
  agentJobService,
  AgentJobItem
} from '../../services/agentJobService';
import { GOAGENT_DEFAULT_PORT, execScriptViaGoAgent } from '../../services/goAgentService';
import { JobDetailTab, StatusFilter } from './types';

export function useAgentJobDashboardState() {
  const [jobs, setJobs] = useState<AgentJobItem[]>(() => agentJobService.getAll());
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    const list = agentJobService.getAll();
    return list[0]?.id || '';
  });

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [nodeFilter, setNodeFilter] = useState<string>('all');

  // Detail view sub-tab
  const [detailTab, setDetailTab] = useState<JobDetailTab>('script');

  // Copy feedbacks & actions
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
          stderr: err?.message || 'Không thể kết nối đến ToolxAgent',
          duration_ms: duration
        },
        duration_ms: duration,
        triggered_by: 'Nút Kiểm tra /job Admin'
      });
      showToast(`⚠️ Lỗi chạy test: ${err?.message || 'Không xác định'}`);
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

  return {
    jobs,
    selectedJobId,
    setSelectedJobId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    nodeFilter,
    setNodeFilter,
    detailTab,
    setDetailTab,
    copiedKey,
    isRunningTest,
    actionToast,
    showToast,
    handleCopy,
    totalJobs,
    successJobs,
    failedJobs,
    avgDuration,
    filteredJobs,
    selectedJob,
    handleRunTestJob,
    handleExportJson,
    handleClearAll,
    handleDeleteCurrent
  };
}
