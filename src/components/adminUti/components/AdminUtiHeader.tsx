import React from 'react';
import {
  Shield,
  Terminal,
  Layers,
  Server,
  Activity,
  Cloud,
  HardDrive,
  Zap,
  RefreshCw,
  ExternalLink,
  X
} from 'lucide-react';
import { AdminView } from '../types';
import { AgentNode } from '../../../services/agentMeshService';
import { GoAgentInfo } from '../../../services/goAgentService';

interface AdminUtiHeaderProps {
  adminView: AdminView;
  setAdminView: (v: AdminView) => void;
  commandsCount: number;
  servicesCount: number;
  agentsCount: number;
  activeNode: AgentNode;
  goAgentInfo: GoAgentInfo | null;
  isProbingAgent: boolean;
  checkAgent: () => void;
  onNavigateToClient?: () => void;
  onClose?: () => void;
}

export const AdminUtiHeader: React.FC<AdminUtiHeaderProps> = ({
  adminView,
  setAdminView,
  commandsCount,
  servicesCount,
  agentsCount,
  activeNode,
  goAgentInfo,
  isProbingAgent,
  checkAgent,
  onNavigateToClient,
  onClose
}) => {
  return (
    <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between flex-shrink-0 z-20 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-wide text-slate-900">
              Admin ToolXPrint
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono border border-indigo-200 font-semibold">
              admin.toolx
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold hidden md:inline">
              Microservices Core
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Kiến trúc Microservices (Nhiều Frontend, 1 Backend) & Thực thi UtiCommands
          </p>
        </div>
      </div>

      {/* Central View Switcher: UtiCommands vs Microservices Hub vs Agent Mesh */}
      <div className="hidden sm:flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
        <button
          type="button"
          onClick={() => setAdminView('commands')}
          className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
            adminView === 'commands'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal size={13} />
          <span>⚡ Lệnh UtiCommands ({commandsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setAdminView('services')}
          className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
            adminView === 'services'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={13} />
          <span>🌐 Quản lý Services ({servicesCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setAdminView('agents')}
          className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
            adminView === 'agents'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server size={13} />
          <span>🖥️ Cụm Máy Agent ({agentsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAdminView('jobs');
            if (window.history && window.history.pushState) {
              window.history.pushState(null, '', '/job');
            }
          }}
          className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
            adminView === 'jobs'
              ? 'bg-white text-violet-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Kiểm tra chi tiết Jobs, Script, Output, Parameter giống agentapi.quanlymay.com"
        >
          <Activity size={13} className="text-violet-600" />
          <span>📋 Tiến Trình (/job)</span>
        </button>
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center gap-2">
        {/* Target Agent Node Pill */}
        <div
          onClick={() => setAdminView('agents')}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold cursor-pointer transition ${
            activeNode.role === 'render_server'
              ? 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
          }`}
          title="Nhấp để quản lý cụm máy Agent"
        >
          {activeNode.role === 'render_server' ? <Cloud size={13} className="text-purple-600" /> : <HardDrive size={13} className="text-emerald-600" />}
          <span className="font-bold">Mượn: {activeNode.name}</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
            activeNode.role === 'render_server' ? 'bg-purple-200 text-purple-900' : 'bg-emerald-200 text-emerald-900'
          }`}>
            {activeNode.role === 'render_server' ? 'Cloud' : 'Local'}
          </span>
        </div>

        {/* Agent Engine Pill */}
        <div
          onClick={checkAgent}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold cursor-pointer transition ${
            goAgentInfo?.detected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
          title="Nhấp để quét lại ToolxAgent"
        >
          {goAgentInfo?.detected ? (
            <Zap size={13} className="text-emerald-600 animate-pulse" />
          ) : (
            <Server size={13} className="text-slate-500" />
          )}
          <span>{goAgentInfo?.detected ? 'ToolxAgent Sẵn sàng' : 'Máy trạm Server (128GB)'}</span>
          {isProbingAgent && <RefreshCw size={10} className="animate-spin ml-1 text-slate-400" />}
        </div>

        {/* Jump to Client UI */}
        {onNavigateToClient && (
          <button
            onClick={onNavigateToClient}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Về ToolxPrint</span>
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </header>
  );
};
