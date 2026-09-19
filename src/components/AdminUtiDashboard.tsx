import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Shield,
  Terminal,
  Play,
  Save,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Copy,
  Check,
  Search,
  Server,
  Code2,
  ExternalLink,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  EyeOff,
  ChevronDown,
  Sun,
  Moon,
  Layers,
  Activity,
  Globe,
  Cpu,
  Radio,
  ArrowUpRight,
  Sliders,
  CheckCircle,
  Unplug,
  Plug,
  PlusCircle,
  Filter,
  Cloud,
  HardDrive
} from 'lucide-react';
import {
  utiCommandService,
  UtiCommandItem,
  ExecResult
} from '../services/utiCommandService';
import { UtiCommandEditModal } from './UtiCommandEditModal';
import { probeGoAgent, GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../services/goAgentService';
import { microservicesManager, MicroserviceItem } from '../services/microservicesConfig';
import { useAgentMeshState, AgentNode } from '../services/agentMeshService';
import { AgentJobDashboard } from './AgentJobDashboard';

interface AdminUtiDashboardProps {
  onClose?: () => void;
  onNavigateToClient?: () => void;
}

export const AdminUtiDashboard: React.FC<AdminUtiDashboardProps> = ({
  onClose,
  onNavigateToClient
}) => {
  // Navigation / View state: 'commands' vs 'services' vs 'agents' vs 'jobs' (/job Inspector)
  const [adminView, setAdminView] = useState<'commands' | 'services' | 'agents' | 'jobs'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path.includes('/job') || search.includes('tab=job') || search.includes('tab=jobs')) {
        return 'jobs';
      }
      if (path.includes('/service') || search.includes('tab=service')) {
        return 'services';
      }
      if (path.includes('/agent') || search.includes('tab=agent')) {
        return 'agents';
      }
    }
    return 'commands';
  });

  // Agent Mesh State ("Mượn máy Agent")
  const {
    nodes: agentNodes,
    activeNode,
    setActiveNode,
    upsertNode,
    deleteNode,
    pingNode,
    resetToDefaults: resetAgentNodes
  } = useAgentMeshState();

  // Terminal Stream Filter Tab: 'all' | 'stdout' | 'stderr' | 'payload'
  const [terminalStreamTab, setTerminalStreamTab] = useState<'all' | 'stdout' | 'stderr' | 'payload'>('all');

  // Agent Node Modal State
  const [nodeModalOpen, setNodeModalOpen] = useState<boolean>(false);
  const [editingNode, setEditingNode] = useState<AgentNode | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [nodeIp, setNodeIp] = useState<string>('127.0.0.1');
  const [nodePort, setNodePort] = useState<number>(9173);
  const [nodeRole, setNodeRole] = useState<'render_server' | 'local_agent'>('local_agent');
  const [nodeLocalPath, setNodeLocalPath] = useState<string>('D:/Dropbox/_Documents/Toolx/output');
  const [nodeCloudEndpoint, setNodeCloudEndpoint] = useState<string>('/render-agent');
  const [nodePings, setNodePings] = useState<Record<string, { ok: boolean; message: string; ms?: number }>>({});
  const [isPingingNodes, setIsPingingNodes] = useState<Record<string, boolean>>({});

  // Microservices Hub State
  const [servicesList, setServicesList] = useState<MicroserviceItem[]>(() => microservicesManager.getAll());
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [servicePings, setServicePings] = useState<Record<string, { ok: boolean; message: string; ms?: number }>>({});
  const [isPinging, setIsPinging] = useState<Record<string, boolean>>({});

  // Microservices Attach/Detach Filter & Registration Modal
  const [attachFilter, setAttachFilter] = useState<'all' | 'attached' | 'detached'>('all');
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceRoute, setNewServiceRoute] = useState<string>('');
  const [newServicePort, setNewServicePort] = useState<number>(3002);
  const [newServiceCategory, setNewServiceCategory] = useState<string>('Nghiệp vụ mới');
  const [newServiceDesc, setNewServiceDesc] = useState<string>('');
  const [newServiceTech, setNewServiceTech] = useState<string>('React / REST API');
  const [newServiceCaps, setNewServiceCaps] = useState<string>('API Integration, Custom UI');

  // Commands State
  const [commands, setCommands] = useState<UtiCommandItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Live Editor State
  const [liveCode, setLiveCode] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');

  // Execution Engine & Terminal State
  const [engine, setEngine] = useState<'goagent' | 'server' | 'browser'>('goagent');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<ExecResult[]>([]);
  const [copiedTerminal, setCopiedTerminal] = useState<boolean>(false);

  // Runtime Parameters
  const [targetIp, setTargetIp] = useState<string>('127.0.0.1');
  const [workspacePath, setWorkspacePath] = useState<string>('D:/Dropbox/_Documents/Toolx');

  // Agent Connection Info
  const [goAgentInfo, setGoAgentInfo] = useState<GoAgentInfo | null>(null);
  const [isProbingAgent, setIsProbingAgent] = useState<boolean>(false);

  // Modal State
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<UtiCommandItem | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load all commands on mount
  const refreshCommands = useCallback(() => {
    const list = utiCommandService.getAllCommands();
    setCommands(list);
    if (list.length > 0 && !selectedSlug) {
      const first = list[0];
      setSelectedSlug(first.command);
      setLiveCode(first.command_content);
    }
  }, [selectedSlug]);

  useEffect(() => {
    document.title = 'Admin ToolXPrint';
    refreshCommands();
  }, [refreshCommands]);

  // Check GoAgent connection
  const checkAgent = useCallback(async () => {
    setIsProbingAgent(true);
    try {
      const info = await probeGoAgent(GOAGENT_DEFAULT_PORT, 1200);
      setGoAgentInfo(info);
      if (info.detected) {
        setEngine('goagent');
      }
    } finally {
      setIsProbingAgent(false);
    }
  }, []);

  useEffect(() => {
    checkAgent();
  }, [checkAgent]);

  // Selected item reference
  const currentItem = useMemo(() => {
    return commands.find((c) => c.command === selectedSlug) || commands[0];
  }, [commands, selectedSlug]);

  // When selected item changes, update code editor
  useEffect(() => {
    if (currentItem) {
      setLiveCode(currentItem.command_content);
      setHasUnsavedChanges(false);
    }
  }, [currentItem]);

  // Categories extraction
  const categories = useMemo(() => {
    const cats = Array.from(new Set(commands.map((c) => c.category || '📦 Tùy chỉnh')));
    return cats;
  }, [commands]);

  // Filtered commands based on search and category
  const filteredCommands = useMemo(() => {
    return commands.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = activeCategory === 'ALL' || c.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [commands, searchQuery, activeCategory]);

  // Save live code change
  const handleSaveLiveCode = () => {
    if (!currentItem) return;
    const updated: UtiCommandItem = {
      ...currentItem,
      command_content: liveCode,
      updated_at: new Date().toISOString()
    };
    utiCommandService.upsertCommand(updated);
    refreshCommands();
    setHasUnsavedChanges(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Run live execution
  const handleExecuteLive = async () => {
    if (!currentItem) return;
    setIsRunning(true);

    try {
      const res = await utiCommandService.executeCommand(
        liveCode,
        {
          target_ip: activeNode.ip || targetIp,
          workspace: workspacePath,
          local_output_dir: activeNode.local_output_path || 'D:/Dropbox/_Documents/Toolx/output'
        },
        engine,
        activeNode.port || goAgentInfo?.port || GOAGENT_DEFAULT_PORT,
        activeNode
      );

      setTerminalLogs((prev) => [res, ...prev]);
    } catch (err: any) {
      setTerminalLogs((prev) => [
        {
          ok: false,
          stdout: '',
          stderr: err.message || 'Lỗi không xác định khi chạy lệnh.',
          result_payload: null,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          node_id: activeNode.id,
          node_name: activeNode.name,
          node_role: activeNode.role,
          output_destination: activeNode.output_destination,
          error: err.message || 'Lỗi không xác định khi chạy lệnh.'
        },
        ...prev
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Agent Node Handlers
  const handlePingSingleNode = async (node: AgentNode) => {
    setIsPingingNodes((prev) => ({ ...prev, [node.id]: true }));
    try {
      const res = await pingNode(node.id);
      setNodePings((prev) => ({ ...prev, [node.id]: res }));
      showToast(res.ok ? `⚡ [${node.name}] phản hồi: ${res.ms}ms` : `❌ [${node.name}]: ${res.message}`);
    } finally {
      setIsPingingNodes((prev) => ({ ...prev, [node.id]: false }));
    }
  };

  const handlePingAllNodes = async () => {
    for (const n of agentNodes) {
      handlePingSingleNode(n);
    }
  };

  const handleOpenNodeModal = (node?: AgentNode) => {
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
  };

  const handleSaveNode = (e: React.FormEvent) => {
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
  };

  // Shortcut Ctrl + Enter to run
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteLive();
    }
  };

  // Insert placeholder text at cursor
  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end);
    setLiveCode(newVal);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 50);
  };

  // Handle Edit Item Modal
  const handleOpenEditModal = (item?: UtiCommandItem) => {
    setEditingItem(item || currentItem);
    setEditModalOpen(true);
  };

  const handleSaveModal = (savedItem: UtiCommandItem) => {
    utiCommandService.upsertCommand(savedItem);
    refreshCommands();
    setSelectedSlug(savedItem.command);
  };

  // Handle Delete Item
  const handleDeleteItem = (slug: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa Menu Item / UtiCommand [${slug}]?`)) {
      utiCommandService.deleteCommand(slug);
      const remaining = utiCommandService.getAllCommands();
      setCommands(remaining);
      if (remaining.length > 0) {
        setSelectedSlug(remaining[0].command);
      } else {
        setSelectedSlug('');
        setLiveCode('');
      }
    }
  };

  // Toggle script enabled/visible state
  const handleToggleItemVisibility = (commandSlug: string) => {
    const item = commands.find((c) => c.command === commandSlug);
    if (!item) return;
    const newVisible = item.is_visible === false ? true : false;
    const updated: UtiCommandItem = {
      ...item,
      is_visible: newVisible,
      updated_at: new Date().toISOString()
    };
    utiCommandService.upsertCommand(updated);
    refreshCommands();
  };

  // Copy Terminal Logs
  const handleCopyTerminal = () => {
    const text = terminalLogs
      .map((log) => `[${log.timestamp}] (${log.ok ? 'SUCCESS' : 'FAILED'} - ${log.duration_ms || 0}ms)\n${log.output || log.error}`)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  // Microservices Handlers
  const refreshServices = useCallback(() => {
    setServicesList(microservicesManager.getAll());
  }, []);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleToggleAttachService = (service: MicroserviceItem) => {
    const isAttaching = !service.is_attached;
    if (isAttaching) {
      microservicesManager.attachService(service.id);
      showToast(`⚡ Đã gắn dịch vụ [${service.name}] vào hệ thống!`);
    } else {
      const confirmDetach = window.confirm(
        `Xác nhận tháo rời (Detach) dịch vụ [${service.name}]?\n\n` +
        `- Đường dẫn toolxprint.com${service.routePath} sẽ tạm ngừng phục vụ.\n` +
        `- Dịch vụ sẽ tự động ẩn khỏi menu điều hướng của người dùng.`
      );
      if (!confirmDetach) return;
      microservicesManager.detachService(service.id, 'Tạm tháo rời qua Admin Console');
      showToast(`🔌 Đã tháo rời [${service.name}] khỏi hệ thống.`);
    }
    refreshServices();
  };

  const handleRegisterNewService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServiceRoute.trim()) {
      alert('Vui lòng nhập tên dịch vụ và đường dẫn route!');
      return;
    }
    const cleanRoute = newServiceRoute.startsWith('/') ? newServiceRoute : `/${newServiceRoute}`;
    microservicesManager.registerService({
      name: newServiceName.trim(),
      routePath: cleanRoute,
      category: newServiceCategory.trim(),
      description: newServiceDesc.trim() || `Dịch vụ ${newServiceName.trim()}`,
      backendPort: Number(newServicePort) || 3002,
      techStack: newServiceTech.trim() || 'React / REST API',
      coreCapabilities: newServiceCaps.split(',').map((s) => s.trim()).filter(Boolean)
    });
    setRegisterModalOpen(false);
    setNewServiceName('');
    setNewServiceRoute('');
    setNewServiceDesc('');
    refreshServices();
    showToast(`🎉 Đã đăng ký và gắn mới [${newServiceName.trim()}] vào hệ thống!`);
  };

  const handleToggleService = (serviceId: string) => {
    microservicesManager.toggleServiceActive(serviceId);
    refreshServices();
  };

  const handlePingService = async (service: MicroserviceItem) => {
    setIsPinging((prev) => ({ ...prev, [service.id]: true }));
    try {
      const res = await microservicesManager.pingBackend(service.backendEndpoint);
      setServicePings((prev) => ({ ...prev, [service.id]: res }));
    } finally {
      setIsPinging((prev) => ({ ...prev, [service.id]: false }));
    }
  };

  const handlePingAllServices = async () => {
    for (const s of servicesList) {
      handlePingService(s);
    }
  };

  const handleOpenServiceFrontend = (service: MicroserviceItem) => {
    const route = service.routePath || service.defaultPath;
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        window.open(route, '_blank');
      } else {
        window.open(`https://toolxprint.com${route}`, '_blank');
      }
    }
  };

  const handleJumpToServiceCommands = (service: MicroserviceItem) => {
    setAdminView('commands');
    setActiveCategory(service.utiCategory);
    const firstInCat = commands.find((c) => c.category === service.utiCategory);
    if (firstInCat) {
      setSelectedSlug(firstInCat.command);
    }
  };

  const attachedCount = useMemo(() => servicesList.filter((s) => s.is_attached).length, [servicesList]);
  const detachedCount = useMemo(() => servicesList.filter((s) => !s.is_attached).length, [servicesList]);

  const filteredServices = useMemo(() => {
    return servicesList.filter((s) => {
      if (attachFilter === 'attached' && !s.is_attached) return false;
      if (attachFilter === 'detached' && s.is_attached) return false;

      if (!serviceSearch.trim()) return true;
      const q = serviceSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.routeUrl && s.routeUrl.toLowerCase().includes(q)) ||
        (s.routePath && s.routePath.toLowerCase().includes(q)) ||
        (s.subdomain && s.subdomain.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [servicesList, serviceSearch, attachFilter]);

  const currentServiceForCommand = useMemo(() => {
    if (!currentItem) return undefined;
    return servicesList.find((s) => s.utiCategory === currentItem.category);
  }, [currentItem, servicesList]);


  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-800 flex flex-col overflow-hidden font-sans select-none">
      {/* ================= HEADER BAR ================= */}
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
            <span>⚡ Lệnh UtiCommands ({commands.length})</span>
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
            <span>🌐 Quản lý Services ({servicesList.length})</span>
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
            <span>🖥️ Cụm Máy Agent ({agentNodes.length})</span>
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

      {/* ================= CONDITIONAL VIEW: SERVICES HUB vs UTICOMMANDS ================= */}
      {adminView === 'services' ? (
        /* ================= MICROSERVICES HUB VIEW ================= */
        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 md:p-6 space-y-6 scrollbar-thin">
          {/* Top Architecture Overview Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 text-indigo-700 text-[11px] font-bold flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-600" />
                  <span>Kiến Trúc Microservices (Nhiều Frontend, 1 Backend Chung)</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                  Cluster: ToolxPrint Production
                </span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                Trung Tâm Quản Lý & Điều Phối Microservices ToolxPrint
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống được module hóa thành các Services chuyên biệt (Render 128GB, Bình trang, Thiết kế khuôn hộp, Dữ liệu biến đổi VDP, Tính giá in, Tiền kiểm PDF). Mỗi service là một Frontend độc lập kết nối chung về 1 Unified Backend API (Port 3002) và GoAgent PC cục bộ (Port 9173).
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>Đăng ký Microservice Mới</span>
              </button>
              <button
                type="button"
                onClick={handlePingAllServices}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Activity size={14} />
                <span>Kiểm tra Kết nối Tất cả (Ping)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Khôi phục danh sách Microservices về cấu hình chuẩn ban đầu?')) {
                    microservicesManager.resetToDefaults();
                    refreshServices();
                    showToast('Đã khôi phục cấu hình Microservices chuẩn.');
                  }
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition cursor-pointer"
                title="Khôi phục danh sách dịch vụ mặc định"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Infrastructure Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tổng Microservices</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{servicesList.length}</span>
                <span className="text-[11px] text-slate-500 font-medium">Hệ thống</span>
              </div>
            </div>

            <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Đang Gắn (Attached)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-700">{attachedCount}</span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <Plug size={12} /> Sẵn sàng
                </span>
              </div>
            </div>

            <div className="bg-white border border-amber-200 bg-amber-50/20 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Đã Tháo Rời (Detached)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-700">{detachedCount}</span>
                <span className="text-[11px] text-amber-600 font-bold flex items-center gap-0.5">
                  <Unplug size={12} /> Tạm dừng
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Backend API & ToolxAgent</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-bold text-slate-900 font-mono">ToolxAgent</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-mono border border-emerald-200">ONLINE</span>
              </div>
            </div>
          </div>

          {/* Search & Attach/Detach Filter */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Tìm kiếm Service theo tên, route, công nghệ..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs transition"
              />
            </div>

            {/* Attach/Detach Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => setAttachFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  attachFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Tất cả ({servicesList.length})
              </button>
              <button
                type="button"
                onClick={() => setAttachFilter('attached')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  attachFilter === 'attached'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Plug size={12} />
                <span>Đang gắn ({attachedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAttachFilter('detached')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  attachFilter === 'detached'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Unplug size={12} />
                <span>Đã tháo rời ({detachedCount})</span>
              </button>
            </div>
          </div>

          {/* Microservices Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServices.map((service) => {
              const pingResult = servicePings[service.id];
              const pinging = isPinging[service.id];
              const isAttached = service.is_attached;

              return (
                <div
                  key={service.id}
                  className={`border rounded-2xl p-5 transition flex flex-col justify-between shadow-2xs ${
                    isAttached
                      ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                      : 'bg-amber-50/20 border-dashed border-amber-300 opacity-90'
                  }`}
                >
                  {/* Card Top */}
                  <div className="space-y-3">
                    {/* Header row: Title, Category & Toggle Switch */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {service.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            {service.category}
                          </span>
                          {isAttached ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                              <Plug size={10} className="text-emerald-600" />
                              <span>ATTACHED</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
                              <Unplug size={10} className="text-amber-600" />
                              <span>DETACHED</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attach/Detach Toggle Checkbox */}
                      <label
                        className="relative inline-flex items-center cursor-pointer flex-shrink-0"
                        title={isAttached ? 'Nhấp để Tháo rời (Detach)' : 'Nhấp để Gắn vào (Attach)'}
                      >
                        <input
                          type="checkbox"
                          checked={isAttached}
                          onChange={() => handleToggleAttachService(service)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:border-white"></div>
                      </label>
                    </div>

                    {/* Route URL info */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                      <Globe size={13} className="text-slate-400" />
                      <button
                        type="button"
                        onClick={() => handleOpenServiceFrontend(service)}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <span>toolxprint.com{service.routePath}</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Detached Notice if detached */}
                    {!isAttached && (
                      <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Unplug size={13} className="text-amber-700 flex-shrink-0" />
                          <span>Dịch vụ đang tháo rời (Detached)</span>
                        </div>
                        <p className="text-amber-800 text-[10px] leading-normal">
                          Đường dẫn <code className="font-mono font-semibold">toolxprint.com{service.routePath}</code> đang tạm dừng và ẩn khỏi thanh menu.
                        </p>
                      </div>
                    )}

                    {/* Target Backend info */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500">Backend Port:</span>
                        <span className="font-mono font-bold text-slate-800">Cổng :{service.backendPort}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500">Công nghệ:</span>
                        <span className="text-slate-700 font-medium truncate max-w-[180px]">{service.techStack}</span>
                      </div>
                    </div>

                    {/* Core capabilities pills */}
                    <div className="flex flex-wrap gap-1">
                      {service.coreCapabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>

                    {/* Ping / Latency status */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Kết nối backend:</span>
                        {pinging ? (
                          <span className="text-slate-400 flex items-center gap-1">
                            <RefreshCw size={11} className="animate-spin text-indigo-500" />
                            <span>Đang kiểm tra...</span>
                          </span>
                        ) : pingResult ? (
                          <span className={`font-medium flex items-center gap-1 ${pingResult.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {pingResult.ok ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                            <span>{pingResult.message}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Sẵn sàng</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePingService(service)}
                        disabled={pinging}
                        className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                      >
                        Ping
                      </button>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-slate-150 mt-4">
                    {/* Primary Attach/Detach Action Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleAttachService(service)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs ${
                        isAttached
                          ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      }`}
                      title={isAttached ? 'Tháo rời dịch vụ này khỏi cụm hoạt động' : 'Gắn dịch vụ này vào hệ sinh thái ToolxPrint'}
                    >
                      {isAttached ? (
                        <>
                          <Unplug size={14} className="text-slate-500 group-hover:text-rose-600" />
                          <span>Tháo Rời (Detach)</span>
                        </>
                      ) : (
                        <>
                          <Plug size={14} />
                          <span>Gắn Vào Hệ Thống (Attach)</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Navigation buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenServiceFrontend(service)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isAttached
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
                        }`}
                        title={isAttached ? `Mở frontend toolxprint.com${service.routePath}` : 'Dịch vụ đang ở trạng thái tháo rời'}
                      >
                        <ExternalLink size={13} />
                        <span>Mở Frontend</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleJumpToServiceCommands(service)}
                        className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        title="Chuyển đến danh sách lệnh UtiCommands của Service này"
                      >
                        <Terminal size={13} className="text-indigo-600" />
                        <span>Chạy Lệnh</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : adminView === 'agents' ? (
        /* ================= AGENT MESH MANAGEMENT VIEW ================= */
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
                onClick={() => handleOpenNodeModal()}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Thêm Máy Agent Mới</span>
              </button>
              <button
                type="button"
                onClick={handlePingAllNodes}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Zap size={14} />
                <span>Ping Toàn Bộ Cụm</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Khôi phục danh sách máy Agent về mặc định?')) {
                    resetAgentNodes();
                    showToast('Đã khôi phục danh sách máy Agent mặc định.');
                  }
                }}
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
            {agentNodes.map((node) => {
              const isActive = activeNode.id === node.id;
              const pingResult = nodePings[node.id];
              const isPinging = isPingingNodes[node.id];

              return (
                <div
                  key={node.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition flex flex-col justify-between space-y-4 ${
                    isActive ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                          node.role === 'render_server'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
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
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        node.role === 'render_server'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
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
                        <div className={`text-[11px] p-1.5 rounded flex items-center gap-1.5 ${
                          pingResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
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
                          onClick={() => {
                            setActiveNode(node.id);
                            showToast(`Đã chọn mượn máy [${node.name}] làm trạm thực thi.`);
                          }}
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
                        onClick={() => handlePingSingleNode(node)}
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
                        onClick={() => handleOpenNodeModal(node)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                        title="Sửa cấu hình"
                      >
                        <Edit3 size={14} />
                      </button>
                      {node.id !== 'node-render-server-128gb' && node.id !== 'node-local-pc' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Xác nhận xóa máy Agent [${node.name}]?`)) {
                              deleteNode(node.id);
                              showToast(`Đã xóa máy Agent [${node.name}].`);
                            }
                          }}
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
            })}
          </div>
        </div>
      ) : adminView === 'jobs' ? (
        /* ================= AGENT JOB INSPECTOR VIEW (/job) ================= */
        <AgentJobDashboard
          onNavigateToCommand={(slug) => {
            setAdminView('commands');
            setSelectedSlug(slug);
          }}
        />
      ) : (
        /* ================= UTICOMMANDS DUAL PANE VIEW ================= */
        <div className="flex-1 flex overflow-hidden">
          {/* ================= LEFT SIDEBAR: UTICOMMAND MENUS ================= */}
          <div className="w-72 md:w-80 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
            {/* Primary Admin Navigation Menu */}
            <div className="p-2.5 border-b border-slate-200 bg-slate-50/80 space-y-1.5">
              <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Menu Quản Trị Hệ Thống</span>
                <span className="font-mono text-violet-600 font-semibold">/admin</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAdminView('commands')}
                  className="px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer bg-indigo-600 text-white shadow-xs"
                >
                  <Terminal size={14} className="text-white" />
                  <span className="truncate">Lệnh ({commands.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminView('jobs');
                    if (window.history && window.history.pushState) window.history.pushState(null, '', '/job');
                  }}
                  className="px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
                  title="Xem lịch sử Jobs (/job)"
                >
                  <Activity size={14} className="text-violet-600" />
                  <span className="truncate">Jobs (/job)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAdminView('services')}
                  className="px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
                >
                  <Layers size={14} className="text-slate-500" />
                  <span className="truncate">Services ({servicesList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminView('agents')}
                  className="px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
                >
                  <Server size={14} className="text-slate-500" />
                  <span className="truncate">Máy Agent ({agentNodes.length})</span>
                </button>
              </div>
            </div>

            {/* Search and Category filters */}
            <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
              <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm Menu Item / Command..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Category Filter Dropdown List (Replaced horizontal tabs & scrollbar) */}
            <div className="relative">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-2xs"
              >
                <option value="ALL">📋 Tất cả danh mục ({commands.length})</option>
                {categories.map((cat) => {
                  const count = commands.filter((c) => c.category === cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Menu Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin bg-slate-50/40">
            {filteredCommands.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Không tìm thấy Menu Item nào phù hợp.
              </div>
            ) : (
              filteredCommands.map((item) => {
                const isSelected = item.command === selectedSlug;
                const isEnabled = item.is_visible !== false;
                return (
                  <div
                    key={item.command}
                    onClick={() => {
                      if (item.command === 'inspect_agent_jobs') {
                        setAdminView('jobs');
                        if (window.history && window.history.pushState) window.history.pushState(null, '', '/job');
                        return;
                      }
                      setSelectedSlug(item.command);
                    }}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 group ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-400 shadow-xs ring-1 ring-indigo-300'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                    } ${!isEnabled ? 'opacity-60 bg-slate-50/70' : ''}`}
                  >
                    {/* Toggle Checkbox replacing the icon */}
                    <label
                      className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                      title={isEnabled ? 'Script đang BẬT (nhấp để TẮT)' : 'Script đang TẮT (nhấp để BẬT)'}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleItemVisibility(item.command)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:border-white"></div>
                    </label>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : isEnabled ? 'text-slate-800' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                            isEnabled
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : 'text-slate-400 bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {isEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        {item.command}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer: Add New Menu Item */}
          <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <button
              onClick={() => handleOpenEditModal()}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm Menu Item</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm('Khôi phục danh sách UtiCommand về mặc định của ToolxPrint?')) {
                  const def = utiCommandService.resetToDefaults();
                  setCommands(def);
                  if (def.length > 0) setSelectedSlug(def[0].command);
                }
              }}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Khôi phục danh sách lệnh mặc định"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* ================= RIGHT MAIN AREA: HỆ THỐNG CODE BUILD SỐNG ================= */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {currentItem ? (
            <>
              {/* Item Action & Title Header */}
              <div className="p-3 px-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <label
                    className="relative inline-flex items-center cursor-pointer flex-shrink-0"
                    title={currentItem.is_visible !== false ? 'Script đang BẬT' : 'Script đang TẮT'}
                  >
                    <input
                      type="checkbox"
                      checked={currentItem.is_visible !== false}
                      onChange={() => handleToggleItemVisibility(currentItem.command)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:border-white"></div>
                  </label>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm md:text-base font-bold text-slate-900 truncate">
                        {currentItem.label}
                      </h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono border border-slate-200">
                        {currentItem.command}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 hidden sm:inline">
                        {currentItem.category}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          currentItem.is_visible !== false
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : 'text-slate-500 bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {currentItem.is_visible !== false ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {currentItem.description || 'Chạy code trực tiếp trên hệ thống qua GoAgent hoặc Server'}
                      </p>
                      {currentServiceForCommand && (
                        <div className="inline-flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200/80 rounded-lg px-2 py-0.5 text-[11px] text-indigo-800">
                          <Globe size={11} className="text-indigo-600" />
                          <span className="font-medium">{currentServiceForCommand.name}</span>
                          <span className="text-indigo-300">·</span>
                          <button
                            type="button"
                            onClick={() => handleOpenServiceFrontend(currentServiceForCommand)}
                            className="font-mono text-indigo-600 hover:text-indigo-900 font-semibold underline flex items-center gap-0.5 cursor-pointer"
                            title={`Mở giao diện dịch vụ: toolxprint.com${currentServiceForCommand.routePath}`}
                          >
                            <span>toolxprint.com{currentServiceForCommand.routePath}</span>
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions: Engine Selector + Build/Run Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  {currentServiceForCommand && (
                    <button
                      type="button"
                      onClick={() => handleOpenServiceFrontend(currentServiceForCommand)}
                      className="py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title={`Mở dịch vụ ${currentServiceForCommand.name} (toolxprint.com${currentServiceForCommand.routePath})`}
                    >
                      <ExternalLink size={13} className="text-indigo-600" />
                      <span className="hidden xl:inline">{currentServiceForCommand.routePath}</span>
                      <span className="font-mono text-[10px] bg-indigo-200/70 px-1 py-0.5 rounded text-indigo-800">
                        :{currentServiceForCommand.backendPort}
                      </span>
                    </button>
                  )}
                  {/* Engine Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setEngine('goagent')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        engine === 'goagent'
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                      title="Chạy trực tiếp trên PC qua ToolxAgent"
                    >
                      ToolxAgent
                    </button>
                    <button
                      type="button"
                      onClick={() => setEngine('browser')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        engine === 'browser'
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-indigo-700'
                      }`}
                      title="Chạy thử nghiệm trong trình duyệt"
                    >
                      Web Sandbox
                    </button>
                  </div>

                  {/* Save Code Button */}
                  <button
                    onClick={handleSaveLiveCode}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      hasUnsavedChanges
                        ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                    }`}
                    title="Lưu mã lệnh sống này vào cơ sở dữ liệu UtiCommands"
                  >
                    {saveToast ? <Check size={14} className="text-emerald-600" /> : <Save size={14} />}
                    <span>{saveToast ? 'Đã lưu!' : hasUnsavedChanges ? 'Lưu Code Sống *' : 'Lưu Code'}</span>
                  </button>

                  {/* Edit Item Info */}
                  <button
                    onClick={() => handleOpenEditModal(currentItem)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                    title="Cài đặt thông tin Menu Item (Tên, Icon, Danh mục)"
                  >
                    <Edit3 size={14} />
                  </button>

                  {/* Delete Item */}
                  <button
                    onClick={() => handleDeleteItem(currentItem.command)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 border border-slate-200 shadow-2xs transition cursor-pointer"
                    title="Xóa Menu Item này"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Execute Button */}
                  <button
                    onClick={handleExecuteLive}
                    disabled={isRunning}
                    className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Đang chạy...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        <span>Build & Chạy Ngay</span>
                        <span className="text-[10px] opacity-80 font-mono hidden md:inline">(Ctrl+Enter)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Editor + Placeholders Bar */}
              <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200">
                {/* Placeholders helper pills */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap text-[11px] flex-shrink-0">
                  <span className="text-slate-500 flex items-center gap-1 font-semibold">
                    <Code2 size={13} className="text-indigo-600" />
                    <span>Biến chèn nhanh:</span>
                  </span>
                  {[
                    { label: '__TARGET_IP__', val: '__TARGET_IP__' },
                    { label: '__WORKSPACE__', val: '__WORKSPACE__' },
                    { label: '__LOCAL_OUTPUT_DIR__', val: '__LOCAL_OUTPUT_DIR__' },
                    { label: '__OUTPUT_DESTINATION__', val: '__OUTPUT_DESTINATION__' },
                    { label: '__NODE_ROLE__', val: '__NODE_ROLE__' },
                    { label: '__FILE_NAME__', val: '__FILE_NAME__' },
                    { label: '__DPI__', val: '__DPI__' }
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.val)}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 border border-slate-200 font-mono shadow-2xs transition cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}

                  {/* Target Agent Selector */}
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-2">
                    <span className="text-slate-500 font-bold">Mượn máy:</span>
                    <select
                      value={activeNode.id}
                      onChange={(e) => setActiveNode(e.target.value)}
                      className={`rounded px-2 py-0.5 text-[11px] font-bold border outline-none cursor-pointer shadow-2xs ${
                        activeNode.role === 'render_server'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                      title="Chọn máy trạm Agent trong cụm để thực thi tác vụ"
                    >
                      {agentNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.role === 'render_server' ? '🚀' : '💻'} {n.name} ({n.role === 'render_server' ? 'Cloud' : 'Local Output'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden xl:flex items-center gap-1.5 border-l border-slate-200 pl-2">
                    <span className="text-slate-500">Target IP:</span>
                    <input
                      type="text"
                      value={activeNode.ip || targetIp}
                      onChange={(e) => setTargetIp(e.target.value)}
                      className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                    />
                  </div>
                  <div className="hidden xl:flex items-center gap-1.5 border-l border-slate-200 pl-2">
                    <span className="text-slate-500">Workspace:</span>
                    <input
                      type="text"
                      value={workspacePath}
                      onChange={(e) => setWorkspacePath(e.target.value)}
                      className="w-40 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                    />
                  </div>

                  {/* Editor Theme Switcher */}
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditorTheme(editorTheme === 'light' ? 'dark' : 'light')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium shadow-2xs transition cursor-pointer"
                      title="Chuyển chế độ giao diện trình soạn thảo (Sáng/Tối)"
                    >
                      {editorTheme === 'light' ? <Moon size={11} className="text-indigo-600" /> : <Sun size={11} className="text-amber-500" />}
                      <span>{editorTheme === 'light' ? 'Editor Tối' : 'Editor Sáng'}</span>
                    </button>

                    <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">
                      Ngôn ngữ: {currentItem.language || 'Python'} • {liveCode.split('\n').length} dòng
                    </span>
                  </div>
                </div>

                {/* Code Textarea Editor */}
                <div className={`flex-1 relative min-h-0 ${editorTheme === 'light' ? 'bg-white' : 'bg-slate-950'}`}>
                  <textarea
                    ref={textareaRef}
                    value={liveCode}
                    onChange={(e) => {
                      setLiveCode(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    className={`w-full h-full p-4 font-mono text-xs resize-none focus:outline-hidden leading-relaxed tracking-wide scrollbar-thin ${
                      editorTheme === 'light'
                        ? 'text-slate-850 bg-white selection:bg-indigo-100 selection:text-indigo-900 placeholder-slate-400'
                        : 'text-emerald-300 bg-slate-950 selection:bg-indigo-500/30 selection:text-white placeholder-slate-600'
                    }`}
                    placeholder="Nhập mã lệnh thực thi sống tại đây..."
                  />
                </div>
              </div>

              {/* ================= TERMINAL OUTPUT CONSOLE (DUAL-STREAM & PAYLOAD) ================= */}
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
                      onClick={handleCopyTerminal}
                      disabled={terminalLogs.length === 0}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-medium transition flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>{copiedTerminal ? 'Đã chép!' : 'Sao chép'}</span>
                    </button>
                    <button
                      onClick={() => setTerminalLogs([])}
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
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                                  log.node_role === 'render_server'
                                    ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                                    : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                                }`}>
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50">
              <Code2 size={48} className="mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">Chưa chọn Menu Item nào</p>
              <p className="text-xs max-w-sm mt-1 text-slate-500">
                Chọn một Menu Item ở danh sách bên trái hoặc nhấn nút Thêm Menu Item để bắt đầu viết code build sống.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Edit / Create UtiCommand Modal */}
      <UtiCommandEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editingItem}
        existingCategories={categories}
      />

      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{actionToast}</span>
        </div>
      )}

      {/* Register New Microservice Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                  <PlusCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Đăng Ký Microservice Mới</h3>
                  <p className="text-[11px] text-slate-500">Thêm module độc lập vào kiến trúc ToolxPrint</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterNewService} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên Microservice</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kiểm Tra File In Thông Minh"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Route Path</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-mono">/</span>
                    <input
                      type="text"
                      required
                      placeholder="kiemtra"
                      value={newServiceRoute.startsWith('/') ? newServiceRoute.slice(1) : newServiceRoute}
                      onChange={(e) => setNewServiceRoute(`/${e.target.value.replace(/^\/+/, '')}`)}
                      className="w-full pl-6 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">toolxprint.com{newServiceRoute.startsWith('/') ? newServiceRoute : `/${newServiceRoute}`}</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Backend Port (Node/API)</label>
                  <input
                    type="number"
                    value={newServicePort}
                    onChange={(e) => setNewServicePort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Mặc định: 3002 (Unified Backend)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nhóm / Danh Mục</label>
                  <input
                    type="text"
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tech Stack</label>
                  <input
                    type="text"
                    value={newServiceTech}
                    onChange={(e) => setNewServiceTech(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Khả Năng Cốt Lõi (Phân cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={newServiceCaps}
                  onChange={(e) => setNewServiceCaps(e.target.value)}
                  placeholder="Tiền kiểm PDF, Báo cáo lỗi kỹ thuật..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô Tả Chức Năng</label>
                <textarea
                  rows={2}
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt mục đích và vai trò của microservice này..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition"
                >
                  <PlusCircle size={14} />
                  <span>Xác Nhận & Gắn Dịch Vụ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Agent Node Modal */}
      {nodeModalOpen && (
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
                onClick={() => setNodeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNode} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên Máy Agent</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy In Xưởng 1 - Workstation A"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Vai Trò Máy (Agent Role)</label>
                <select
                  value={nodeRole}
                  onChange={(e) => setNodeRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold"
                >
                  <option value="local_agent">💻 local_agent - Máy Agent Thường (Nhận lệnh & Output file local)</option>
                  <option value="render_server">🚀 render_server - Máy Render-Server Chuyên Dụng (Xử lý nặng & Trả về Cloud)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {nodeRole === 'render_server'
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
                    value={nodeIp}
                    onChange={(e) => setNodeIp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Cổng Port GoAgent</label>
                  <input
                    type="number"
                    value={nodePort}
                    onChange={(e) => setNodePort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-mono"
                  />
                </div>
              </div>

              {nodeRole === 'local_agent' ? (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thư mục xuất file cục bộ (Local Output Path)</label>
                  <input
                    type="text"
                    value={nodeLocalPath}
                    onChange={(e) => setNodeLocalPath(e.target.value)}
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
                    value={nodeCloudEndpoint}
                    onChange={(e) => setNodeCloudEndpoint(e.target.value)}
                    placeholder="/render-agent"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Endpoint trên Cloud tiếp nhận và lưu trữ file từ trạm render.</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNodeModalOpen(false)}
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
      )}
    </div>
  );
};

export default AdminUtiDashboard;
