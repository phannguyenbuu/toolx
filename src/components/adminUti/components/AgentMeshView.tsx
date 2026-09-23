import React from 'react';
import {
  Server,
  Plus,
  Zap,
  RotateCcw,
  Cloud,
  HardDrive
} from 'lucide-react';
import { AgentNode } from '../../../services/agentMeshService';
import { NodePingResult } from '../types';
import { AgentNodeCard } from './AgentNodeCard';

interface AgentMeshViewProps {
  agentNodes: AgentNode[];
  activeNode: AgentNode;
  nodePings: Record<string, NodePingResult>;
  isPingingNodes: Record<string, boolean>;
  onOpenNodeModal: (node?: AgentNode) => void;
  onPingAllNodes: () => void;
  onResetToDefaults: () => void;
  onSelectActiveNode: (node: AgentNode) => void;
  onPingSingleNode: (node: AgentNode) => void;
  onDeleteNode: (node: AgentNode) => void;
}

export const AgentMeshView: React.FC<AgentMeshViewProps> = ({
  agentNodes,
  activeNode,
  nodePings,
  isPingingNodes,
  onOpenNodeModal,
  onPingAllNodes,
  onResetToDefaults,
  onSelectActiveNode,
  onPingSingleNode,
  onDeleteNode
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 md:p-6 space-y-6 scrollbar-thin">
      {/* Top Architecture Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 border border-purple-200 text-purple-700 text-[11px] font-bold flex items-center gap-1.5">
              <Server size={13} className="text-purple-600" />
              <span>Kiến Trúc Cụm Mượn Máy Agent (Distributed Worker Mesh)</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
              Mô Hình: 2 Vai Trò Chuyên Biệt
            </span>
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-900">
            Điều Phối & Mượn Máy Agent Xử Lý File (Render-Server vs Local-Agent)
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Toàn bộ tác vụ nặng hoặc thao tác tệp được phân phối đến các máy trạm Agent (cổng 9173 / 8006).
            <strong className="text-purple-700 font-bold ml-1">Máy Render-Server chuyên:</strong> Trạm 128GB RAM nhận lệnh render nặng và <u>tự động trả kết quả về Cloud</u>.
            <strong className="text-emerald-700 font-bold ml-1">Máy Agent thường:</strong> Nhận lệnh, xử lý trực tiếp tại máy tính người dùng và <u>output file ra ổ đĩa cục bộ (Local Path)</u>.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenNodeModal()}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Thêm Máy Agent Mới</span>
          </button>
          <button
            type="button"
            onClick={onPingAllNodes}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Zap size={14} />
            <span>Ping Toàn Bộ Cụm</span>
          </button>
          <button
            type="button"
            onClick={onResetToDefaults}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Khôi phục danh sách mặc định"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tổng Số Máy Agent</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{agentNodes.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">Node</span>
          </div>
        </div>

        <div className="bg-white border border-purple-200 bg-purple-50/20 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">Render-Server (Cloud)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-700">
              {agentNodes.filter((n) => n.role === 'render_server').length}
            </span>
            <span className="text-[11px] text-purple-600 font-bold flex items-center gap-0.5">
              <Cloud size={12} /> Trả về Cloud
            </span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Local-Agent (Output Local)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">
              {agentNodes.filter((n) => n.role === 'local_agent').length}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <HardDrive size={12} /> Output Đĩa Local
            </span>
          </div>
        </div>

        <div className="bg-white border border-indigo-200 bg-indigo-50/20 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">Máy Đang Mượn Hiện Tại</span>
          <div className="flex items-baseline gap-2 mt-1 truncate">
            <span className="text-sm font-black text-indigo-700 truncate">{activeNode.name}</span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agentNodes.map((node) => (
          <AgentNodeCard
            key={node.id}
            node={node}
            isActive={activeNode.id === node.id}
            pingResult={nodePings[node.id]}
            isPinging={isPingingNodes[node.id]}
            onSelectActiveNode={onSelectActiveNode}
            onPingNode={onPingSingleNode}
            onEditNode={onOpenNodeModal}
            onDeleteNode={onDeleteNode}
          />
        ))}
      </div>
    </div>
  );
};
