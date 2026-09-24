import React from 'react';
import { Sparkles } from 'lucide-react';
import { AgentJobDashboardProps } from './types';
import { useAgentJobDashboardState } from './useAgentJobDashboardState';
import { JobDashboardHeader } from './components/JobDashboardHeader';
import { JobListPanel } from './components/JobListPanel';
import { JobDetailHeader } from './components/JobDetailHeader';
import { JobScriptTab } from './components/tabs/JobScriptTab';
import { JobParametersTab } from './components/tabs/JobParametersTab';
import { JobOutputTab } from './components/tabs/JobOutputTab';
import { JobRawJsonTab } from './components/tabs/JobRawJsonTab';

export const AgentJobDashboard: React.FC<AgentJobDashboardProps> = () => {
  const {
    jobs,
    selectedJobId,
    setSelectedJobId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    detailTab,
    setDetailTab,
    copiedKey,
    isRunningTest,
    actionToast,
    handleCopy,
    totalJobs,
    successJobs,
    failedJobs,
    avgDuration,
    filteredJobs,
    selectedJob,
    handleRunTestJob,
    handleExportJson,
    handleClearAll
  } = useAgentJobDashboardState();

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
      <JobDashboardHeader
        totalJobs={totalJobs}
        successJobs={successJobs}
        failedJobs={failedJobs}
        avgDuration={avgDuration}
        isRunningTest={isRunningTest}
        onRunTestJob={handleRunTestJob}
        onExportJson={handleExportJson}
        onClearAll={handleClearAll}
      />

      {/* ================= MAIN SPLIT CONTENT ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: JOBS LIST (380px) */}
        <JobListPanel
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          totalCount={totalJobs}
          successCount={successJobs}
          failedCount={failedJobs}
          filteredJobs={filteredJobs}
          selectedJobId={selectedJob?.id || selectedJobId}
          onSelectJob={setSelectedJobId}
        />

        {/* RIGHT COLUMN: JOB DETAILS INSPECTOR */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedJob ? (
            <>
              {/* Detail Header Bar */}
              <JobDetailHeader
                selectedJob={selectedJob}
                detailTab={detailTab}
                onTabChange={setDetailTab}
              />

              {/* Detail Tab Content Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {detailTab === 'script' && (
                  <JobScriptTab
                    script={selectedJob.script}
                    scriptLanguage={selectedJob.script_language}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
                )}

                {detailTab === 'parameters' && (
                  <JobParametersTab
                    parameters={selectedJob.parameters}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
                )}

                {detailTab === 'output' && (
                  <JobOutputTab
                    output={selectedJob.output}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
                )}

                {detailTab === 'raw_json' && (
                  <JobRawJsonTab
                    selectedJob={selectedJob}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
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
