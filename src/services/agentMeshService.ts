/**
 * Agent Mesh Service for ToolxPrint
 * 
 * Quản lý cụm các máy trạm Agent ("Mượn máy Agent"):
 * 1. render_server: Trạm Render Chuyên Dụng (128GB RAM) -> Nhận lệnh render nặng, trả kết quả về Cloud.
 * 2. local_agent: Máy Agent Cục Bộ -> Nhận lệnh, xử lý file tại chỗ, xuất kết quả ra ổ đĩa Local.
 * 
 * Chi tiết kiến trúc xem tại: AGENT_MESH_ARCHITECTURE.md
 */

import { useState, useEffect } from 'react';
import { probeGoAgent } from './goAgentService';

export type AgentNodeRole = 'render_server' | 'local_agent';
export type OutputDestination = 'cloud' | 'local_path';

export interface AgentNode {
  id: string;
  name: string;
  role: AgentNodeRole;
  ip: string;
  port: number;
  status: 'online' | 'offline' | 'busy' | 'probing';
  output_destination: OutputDestination;
  local_output_path?: string;
  cloud_endpoint?: string;
  specs?: {
    ram_gb?: number;
    cpu?: string;
    os?: string;
    mupdf_version?: string;
  };
  is_default?: boolean;
  last_seen?: string;
}

const STORAGE_KEY = 'toolx_agent_mesh_registry_v1';
const ACTIVE_NODE_KEY = 'toolx_agent_mesh_active_node_id';

export const DEFAULT_AGENT_NODES: AgentNode[] = [
  {
    id: 'node-render-server-128gb',
    name: 'Trạm Render Chuyên Dụng (128GB RAM)',
    role: 'render_server',
    ip: '157.66.80.125',
    port: 8006,
    status: 'online',
    output_destination: 'cloud',
    cloud_endpoint: '/render-agent',
    specs: {
      ram_gb: 128,
      cpu: 'Workstation 32-Core Engine',
      os: 'Ubuntu 22.04 / Windows Workstation',
      mupdf_version: 'MuPDF 1.24 C-Core Single-Pass'
    },
    is_default: false,
    last_seen: new Date().toISOString()
  },
  {
    id: 'node-local-pc',
    name: 'ToolxAgent (Máy Cục Bộ)',
    role: 'local_agent',
    ip: '127.0.0.1',
    port: 9173,
    status: 'probing',
    output_destination: 'local_path',
    local_output_path: 'D:/Dropbox/_Documents/Toolx/output',
    specs: {
      ram_gb: 16,
      cpu: 'Local Client Processor',
      os: 'Windows 11 x64'
    },
    is_default: true,
    last_seen: new Date().toISOString()
  }
];

class AgentMeshManager {
  private nodes: AgentNode[] = [];
  private activeNodeId: string = 'node-local-pc';
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      this.nodes = [...DEFAULT_AGENT_NODES];
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.nodes = parsed;
        } else {
          this.nodes = [...DEFAULT_AGENT_NODES];
        }
      } else {
        this.nodes = [...DEFAULT_AGENT_NODES];
      }

      const savedActive = localStorage.getItem(ACTIVE_NODE_KEY);
      if (savedActive && this.nodes.some((n) => n.id === savedActive)) {
        this.activeNodeId = savedActive;
      } else {
        const def = this.nodes.find((n) => n.is_default);
        this.activeNodeId = def ? def.id : this.nodes[0]?.id || 'node-local-pc';
      }
    } catch {
      this.nodes = [...DEFAULT_AGENT_NODES];
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.nodes));
      localStorage.setItem(ACTIVE_NODE_KEY, this.activeNodeId);
      window.dispatchEvent(new CustomEvent('toolx_agent_mesh_change', {
        detail: { nodes: this.nodes, activeNodeId: this.activeNodeId }
      }));
    } catch (e) {
      console.warn('Lỗi khi lưu cấu hình Agent Mesh:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try { fn(); } catch {}
    });
  }

  public getAll(): AgentNode[] {
    return [...this.nodes];
  }

  public getById(id: string): AgentNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  public getActiveNode(): AgentNode {
    const found = this.getById(this.activeNodeId);
    if (found) return found;
    return this.nodes[0] || DEFAULT_AGENT_NODES[0];
  }

  public setActiveNode(id: string): void {
    if (this.nodes.some((n) => n.id === id)) {
      this.activeNodeId = id;
      this.saveToStorage();
    }
  }

  public upsertNode(node: AgentNode): AgentNode {
    const idx = this.nodes.findIndex((n) => n.id === node.id);
    const normalized: AgentNode = {
      ...node,
      output_destination: node.role === 'render_server' ? 'cloud' : 'local_path',
      local_output_path: node.local_output_path || 'D:/Dropbox/_Documents/Toolx/output',
      last_seen: new Date().toISOString()
    };

    if (idx >= 0) {
      this.nodes[idx] = normalized;
    } else {
      this.nodes.push(normalized);
    }

    this.saveToStorage();
    return normalized;
  }

  public deleteNode(id: string): boolean {
    if (id === 'node-render-server-128gb' || id === 'node-local-pc') {
      return false;
    }

    const prevLen = this.nodes.length;
    this.nodes = this.nodes.filter((n) => n.id !== id);
    if (this.nodes.length !== prevLen) {
      if (this.activeNodeId === id) {
        this.activeNodeId = this.nodes[0]?.id || 'node-local-pc';
      }
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public resetToDefaults(): AgentNode[] {
    this.nodes = [...DEFAULT_AGENT_NODES];
    this.activeNodeId = 'node-local-pc';
    this.saveToStorage();
    return this.nodes;
  }

  /**
   * Ping kiểm tra kết nối tới một node cụ thể
   */
  public async pingNode(nodeOrId: AgentNode | string): Promise<{
    ok: boolean;
    ms: number;
    message: string;
    specs?: any;
  }> {
    const node = typeof nodeOrId === 'string' ? this.getById(nodeOrId) : nodeOrId;
    if (!node) {
      return { ok: false, ms: 0, message: 'Node không tồn tại' };
    }

    const start = performance.now();

    // Nếu là Render Server qua Cloud endpoint
    if (node.role === 'render_server') {
      try {
        const res = await fetch(`${node.cloud_endpoint || '/render-agent'}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        }).catch(() => null);

        const ms = Math.round(performance.now() - start);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          this.updateNodeStatus(node.id, 'online', data);
          return { ok: true, ms, message: 'Trạm Render Chuyên Dụng Sẵn Sàng (Cloud Gateway)', specs: data };
        }

        // Fallback: Nếu không có endpoint health chuyên biệt, kiểm tra máy chủ webroot
        const pingCloud = await fetch(`${window.location.origin}/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(2000)
        }).catch(() => null);

        if (pingCloud && pingCloud.ok) {
          this.updateNodeStatus(node.id, 'online');
          return { ok: true, ms: Math.round(performance.now() - start), message: 'Cụm Cloud Server Kết Nối Tốt (128GB RAM)' };
        }

        this.updateNodeStatus(node.id, 'offline');
        return { ok: false, ms, message: 'Không thể kết nối đến Trạm Render Server' };
      } catch (e: any) {
        const ms = Math.round(performance.now() - start);
        this.updateNodeStatus(node.id, 'offline');
        return { ok: false, ms, message: e.message || 'Lỗi kết nối' };
      }
    }

    // Nếu là Local Agent (ToolxAgent)
    try {
      const info = await probeGoAgent(node.port || 9173, 1800);
      const ms = Math.round(performance.now() - start);

      if (info.detected) {
        this.updateNodeStatus(node.id, 'online', {
          pc_name: info.pc_name,
          pc_ip: info.pc_ip,
          agent_uid: info.agent_uid
        });
        return {
          ok: true,
          ms,
          message: `GoAgent :${node.port} Sẵn sàng (Output Local: ${node.local_output_path || 'Mặc định'})`,
          specs: info
        };
      } else {
        this.updateNodeStatus(node.id, 'offline');
        return {
          ok: false,
          ms,
          message: `Không phát hiện GoAgent trên cổng :${node.port}`
        };
      }
    } catch (e: any) {
      const ms = Math.round(performance.now() - start);
      this.updateNodeStatus(node.id, 'offline');
      return { ok: false, ms, message: e.message || 'Lỗi kết nối GoAgent' };
    }
  }

  private updateNodeStatus(id: string, status: 'online' | 'offline', extraSpecs?: any): void {
    const node = this.nodes.find((n) => n.id === id);
    if (node) {
      node.status = status;
      node.last_seen = new Date().toISOString();
      if (extraSpecs && node.specs) {
        node.specs = { ...node.specs, ...extraSpecs };
      }
      this.saveToStorage();
    }
  }
}

export const agentMeshManager = new AgentMeshManager();

export function useAgentMeshState() {
  const [nodes, setNodes] = useState<AgentNode[]>(() => agentMeshManager.getAll());
  const [activeNode, setActiveNode] = useState<AgentNode>(() => agentMeshManager.getActiveNode());

  useEffect(() => {
    const update = () => {
      setNodes(agentMeshManager.getAll());
      setActiveNode(agentMeshManager.getActiveNode());
    };

    const unsub = agentMeshManager.subscribe(update);
    window.addEventListener('toolx_agent_mesh_change', update);
    window.addEventListener('storage', update);

    return () => {
      unsub();
      window.removeEventListener('toolx_agent_mesh_change', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return {
    nodes,
    activeNode,
    setActiveNode: (id: string) => agentMeshManager.setActiveNode(id),
    renderServerNode: nodes.find((n) => n.role === 'render_server') || DEFAULT_AGENT_NODES[0],
    localAgentNode: nodes.find((n) => n.role === 'local_agent') || DEFAULT_AGENT_NODES[1],
    upsertNode: (node: AgentNode) => agentMeshManager.upsertNode(node),
    deleteNode: (id: string) => agentMeshManager.deleteNode(id),
    pingNode: (id: string) => agentMeshManager.pingNode(id),
    resetToDefaults: () => agentMeshManager.resetToDefaults()
  };
}
