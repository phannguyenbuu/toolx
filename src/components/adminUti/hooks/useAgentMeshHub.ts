import { useState, useCallback } from 'react';
import { useAgentMeshState, AgentNode } from '../../../services/agentMeshService';
import { NodePingResult } from '../types';

export const useAgentMeshHub = (showToast: (msg: string) => void) => {
  const {
    nodes: agentNodes,
    activeNode,
    setActiveNode,
    upsertNode,
    deleteNode,
    pingNode,
    resetToDefaults: resetAgentNodes
  } = useAgentMeshState();

  const [nodeModalOpen, setNodeModalOpen] = useState<boolean>(false);
  const [editingNode, setEditingNode] = useState<AgentNode | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [nodeIp, setNodeIp] = useState<string>('127.0.0.1');
  const [nodePort, setNodePort] = useState<number>(9173);
  const [nodeRole, setNodeRole] = useState<'render_server' | 'local_agent'>('local_agent');
  const [nodeLocalPath, setNodeLocalPath] = useState<string>('D:/Dropbox/_Documents/Toolx/output');
  const [nodeCloudEndpoint, setNodeCloudEndpoint] = useState<string>('/render-agent');
  const [nodePings, setNodePings] = useState<Record<string, NodePingResult>>({});
  const [isPingingNodes, setIsPingingNodes] = useState<Record<string, boolean>>({});

  const handlePingSingleNode = useCallback(async (node: AgentNode) => {
    setIsPingingNodes((prev) => ({ ...prev, [node.id]: true }));
    try {
      const res = await pingNode(node.id);
      setNodePings((prev) => ({ ...prev, [node.id]: res }));
      showToast(res.ok ? `⚡ [${node.name}] phản hồi: ${res.ms}ms` : `❌ [${node.name}]: ${res.message}`);
    } finally {
      setIsPingingNodes((prev) => ({ ...prev, [node.id]: false }));
    }
  }, [pingNode, showToast]);

  const handlePingAllNodes = useCallback(async () => {
    for (const n of agentNodes) {
      handlePingSingleNode(n);
    }
  }, [agentNodes, handlePingSingleNode]);

  const handleOpenNodeModal = useCallback((node?: AgentNode) => {
    if (node) {
      setEditingNode(node);
      setNodeName(node.name);
      setNodeIp(node.ip);
      setNodePort(node.port);
      setNodeRole(node.role);
      setNodeLocalPath(node.local_output_path || 'D:/Dropbox/_Documents/Toolx/output');
      setNodeCloudEndpoint(node.cloud_endpoint || '/render-agent');
    } else {
      setEditingNode(null);
      setNodeName('');
      setNodeIp('192.168.1.');
      setNodePort(9173);
      setNodeRole('local_agent');
      setNodeLocalPath('D:/Dropbox/_Documents/Toolx/output');
      setNodeCloudEndpoint('/render-agent');
    }
    setNodeModalOpen(true);
  }, []);

  const handleSaveNode = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeName.trim()) {
      alert('Vui lòng nhập tên máy Agent!');
      return;
    }

    const id = editingNode ? editingNode.id : `node-${Date.now()}`;
    const updated: AgentNode = {
      id,
      name: nodeName.trim(),
      ip: nodeIp.trim(),
      port: Number(nodePort) || 9173,
      role: nodeRole,
      status: 'probing',
      output_destination: nodeRole === 'render_server' ? 'cloud' : 'local_path',
      local_output_path: nodeLocalPath.trim(),
      cloud_endpoint: nodeCloudEndpoint.trim(),
      specs: editingNode?.specs || {
        ram_gb: nodeRole === 'render_server' ? 128 : 16,
        cpu: 'Worker Processor',
        os: 'Windows / Linux'
      }
    };

    upsertNode(updated);
    setNodeModalOpen(false);
    showToast(`🎉 Đã lưu cấu hình máy Agent [${nodeName.trim()}]!`);
  }, [nodeName, editingNode, nodeIp, nodePort, nodeRole, nodeLocalPath, nodeCloudEndpoint, upsertNode, showToast]);

  const handleDeleteNode = useCallback((node: AgentNode) => {
    if (window.confirm(`Xác nhận xóa máy Agent [${node.name}]?`)) {
      deleteNode(node.id);
      showToast(`Đã xóa máy Agent [${node.name}].`);
    }
  }, [deleteNode, showToast]);

  const handleSelectActiveNode = useCallback((node: AgentNode) => {
    setActiveNode(node.id);
    showToast(`Đã chọn mượn máy [${node.name}] làm trạm thực thi.`);
  }, [setActiveNode, showToast]);

  const resetToDefaults = useCallback(() => {
    if (window.confirm('Khôi phục danh sách máy Agent về mặc định?')) {
      resetAgentNodes();
      showToast('Đã khôi phục danh sách máy Agent mặc định.');
    }
  }, [resetAgentNodes, showToast]);

  return {
    agentNodes,
    activeNode,
    setActiveNode,
    nodeModalOpen,
    setNodeModalOpen,
    editingNode,
    nodeName,
    setNodeName,
    nodeIp,
    setNodeIp,
    nodePort,
    setNodePort,
    nodeRole,
    setNodeRole,
    nodeLocalPath,
    setNodeLocalPath,
    nodeCloudEndpoint,
    setNodeCloudEndpoint,
    nodePings,
    isPingingNodes,
    handlePingSingleNode,
    handlePingAllNodes,
    handleOpenNodeModal,
    handleSaveNode,
    handleDeleteNode,
    handleSelectActiveNode,
    resetToDefaults
  };
};
