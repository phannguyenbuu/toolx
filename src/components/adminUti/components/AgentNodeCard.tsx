import React from 'react';
import {
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Activity,
  Edit3,
  Trash2
} from 'lucide-react';
import { AgentNode } from '../../../services/agentMeshService';
import { NodePingResult } from '../types';

interface AgentNodeCardProps {
  node: AgentNode;
  isActive: boolean;
  pingResult?: NodePingResult;
  isPinging?: boolean;
  onSelectActiveNode: (node: AgentNode) => void;
  onPingNode: (node: AgentNode) => void;
  onEditNode: (node: AgentNode) => void;
  onDeleteNode: (node: AgentNode) => void;
}

export const AgentNodeCard: React.FC<AgentNodeCardProps> = ({
  node,
  isActive,
  pingResult,
  isPinging,
  onSelectActiveNode,
  onPingNode,
  onEditNode,
  onDeleteNode
}) => {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-xs transition flex flex-col justify-between space-y-4 ${
        isActive ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                node.role === 'render_server'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {node.role === 'render_server' ? <Cloud size={20} /> : <HardDrive size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{node.name}</h3>
                {isActive && (
                  <span className="px-2 py-0.2 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                    Đang chọn
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-slate-500">{node.ip}:{node.port}</span>
            </div>
          </div>

          {/* Role Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
              node.role === 'render_server'
                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {node.role === 'render_server' ? (
              <>
                <Cloud size={11} /> <span>Render-Server (Cloud)</span>
              </>
            ) : (
              <>
                <HardDrive size={11} /> <span>Local-Agent (Output Local)</span>
              </>
            )}
          </span>
        </div>

        {/* Specs & Output Destination Box */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600">
            <span>Đích xuất kết quả:</span>
            <span className="font-bold text-slate-800 font-mono">
              {node.role === 'render_server'
                ? `☁️ Trả về Cloud (${node.cloud_endpoint || '/render-agent'})`
                : `📁 Ổ đĩa cục bộ (${node.local_output_path || 'Mặc định'})`}
            </span>
          </div>

          {node.specs && (
            <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
              <span>Thông số: {node.specs.ram_gb ? `${node.specs.ram_gb}GB RAM` : ''} • {node.specs.cpu || 'CPU'}</span>
              <span>{node.specs.os || 'Windows/Linux'}</span>
            </div>
          )}

          {pingResult && (
            <div
              className={`text-[11px] p-1.5 rounded flex items-center gap-1.5 ${
                pingResult.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {pingResult.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              <span>{pingResult.message} ({pingResult.ms}ms)</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              type="button"
              onClick={() => onSelectActiveNode(node)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              Chọn Mượn Máy Này
            </button>
          ) : (
            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
              <CheckCircle size={14} /> Trạm đang hoạt động
            </span>
          )}

          <button
            type="button"
            onClick={() => onPingNode(node)}
            disabled={isPinging}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            {isPinging ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
            <span>Ping</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEditNode(node)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Sửa cấu hình"
          >
            <Edit3 size={14} />
          </button>
          {node.id !== 'node-render-server-128gb' && node.id !== 'node-local-pc' && (
            <button
              type="button"
              onClick={() => onDeleteNode(node)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Xóa máy này"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
