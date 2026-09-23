import React from 'react';
import { Server, X, CheckCircle2 } from 'lucide-react';
import { AgentNode } from '../../../services/agentMeshService';

interface AgentNodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingNode: AgentNode | null;
  name: string;
  setName: (v: string) => void;
  ip: string;
  setIp: (v: string) => void;
  port: number;
  setPort: (v: number) => void;
  role: 'render_server' | 'local_agent';
  setRole: (v: 'render_server' | 'local_agent') => void;
  localPath: string;
  setLocalPath: (v: string) => void;
  cloudEndpoint: string;
  setCloudEndpoint: (v: string) => void;
}

export const AgentNodeEditModal: React.FC<AgentNodeEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingNode,
  name,
  setName,
  ip,
  setIp,
  port,
  setPort,
  role,
  setRole,
  localPath,
  setLocalPath,
  cloudEndpoint,
  setCloudEndpoint
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-bold">
              <Server size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingNode ? 'Chỉnh Sửa Máy Agent Mượn' : 'Thêm Máy Agent Mới'}
              </h3>
              <p className="text-[11px] text-slate-500">Mượn máy trạm xử lý tác vụ trong cụm Worker Mesh</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Tên Máy Agent</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Máy In Xưởng 1 - Workstation A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Vai Trò Máy (Agent Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold"
            >
              <option value="local_agent">💻 local_agent - Máy Agent Thường (Nhận lệnh & Output file local)</option>
              <option value="render_server">🚀 render_server - Máy Render-Server Chuyên Dụng (Xử lý nặng & Trả về Cloud)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {role === 'render_server'
                ? '⚡ Tự động đóng gói và trả kết quả về Cloud URL, phục vụ client từ xa.'
                : '⚡ Lưu file trực tiếp vào thư mục đĩa cục bộ trên máy agent, không tốn băng thông upload.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Địa chỉ IP / Host</label>
              <input
                type="text"
                required
                placeholder="127.0.0.1 hoặc 192.168.1.50"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Cổng Port GoAgent</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-mono"
              />
            </div>
          </div>

          {role === 'local_agent' ? (
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Thư mục xuất file cục bộ (Local Output Path)</label>
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="D:/Dropbox/_Documents/Toolx/output"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono"
              />
              <span className="text-[10px] text-slate-400">File sau khi xử lý sẽ được ghi trực tiếp vào đường dẫn này trên máy agent.</span>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Cloud Upload Endpoint</label>
              <input
                type="text"
                value={cloudEndpoint}
                onChange={(e) => setCloudEndpoint(e.target.value)}
                placeholder="/render-agent"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Endpoint trên Cloud tiếp nhận và lưu trữ file từ trạm render.</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer transition"
            >
              <CheckCircle2 size={14} />
              <span>Xác Nhận & Lưu Máy Agent</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
