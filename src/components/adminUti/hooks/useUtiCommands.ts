import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  utiCommandService,
  UtiCommandItem,
  ExecResult
} from '../../../services/utiCommandService';
import { probeGoAgent, GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../../../services/goAgentService';
import { AgentNode } from '../../../services/agentMeshService';
import { ExecutionEngine, EditorTheme, TerminalStreamTab } from '../types';

export const useUtiCommands = (activeNode: AgentNode) => {
  // Commands State
  const [commands, setCommands] = useState<UtiCommandItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Live Editor State
  const [liveCode, setLiveCode] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [editorTheme, setEditorTheme] = useState<EditorTheme>('light');

  // Execution Engine & Terminal State
  const [engine, setEngine] = useState<ExecutionEngine>('goagent');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<ExecResult[]>([]);
  const [copiedTerminal, setCopiedTerminal] = useState<boolean>(false);
  const [terminalStreamTab, setTerminalStreamTab] = useState<TerminalStreamTab>('all');

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
  const handleSaveLiveCode = useCallback(() => {
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
  }, [currentItem, liveCode, refreshCommands]);

  // Run live execution
  const handleExecuteLive = useCallback(async () => {
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
  }, [currentItem, liveCode, activeNode, targetIp, workspacePath, engine, goAgentInfo]);

  // Shortcut Ctrl + Enter to run
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteLive();
    }
  }, [handleExecuteLive]);

  // Insert placeholder text at cursor
  const handleInsertPlaceholder = useCallback((placeholder: string) => {
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
  }, []);

  // Handle Edit Item Modal
  const handleOpenEditModal = useCallback((item?: UtiCommandItem) => {
    setEditingItem(item || currentItem);
    setEditModalOpen(true);
  }, [currentItem]);

  const handleSaveModal = useCallback((savedItem: UtiCommandItem) => {
    utiCommandService.upsertCommand(savedItem);
    refreshCommands();
    setSelectedSlug(savedItem.command);
  }, [refreshCommands]);

  // Handle Delete Item
  const handleDeleteItem = useCallback((slug: string) => {
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
  }, []);

  // Toggle script enabled/visible state
  const handleToggleItemVisibility = useCallback((commandSlug: string) => {
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
  }, [commands, refreshCommands]);

  // Copy Terminal Logs
  const handleCopyTerminal = useCallback(() => {
    const text = terminalLogs
      .map((log) => `[${log.timestamp}] (${log.ok ? 'SUCCESS' : 'FAILED'} - ${log.duration_ms || 0}ms)\n${log.output || log.error}`)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  }, [terminalLogs]);

  const clearTerminalLogs = useCallback(() => {
    setTerminalLogs([]);
  }, []);

  const resetCommandsToDefaults = useCallback(() => {
    if (window.confirm('Khôi phục danh sách UtiCommand về mặc định của ToolxPrint?')) {
      const def = utiCommandService.resetToDefaults();
      setCommands(def);
      if (def.length > 0) setSelectedSlug(def[0].command);
    }
  }, []);

  return {
    commands,
    selectedSlug,
    setSelectedSlug,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    liveCode,
    setLiveCode,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    saveToast,
    editorTheme,
    setEditorTheme,
    engine,
    setEngine,
    isRunning,
    terminalLogs,
    copiedTerminal,
    terminalStreamTab,
    setTerminalStreamTab,
    targetIp,
    setTargetIp,
    workspacePath,
    setWorkspacePath,
    goAgentInfo,
    isProbingAgent,
    checkAgent,
    editModalOpen,
    setEditModalOpen,
    editingItem,
    terminalEndRef,
    textareaRef,
    currentItem,
    categories,
    filteredCommands,
    refreshCommands,
    handleSaveLiveCode,
    handleExecuteLive,
    handleKeyDown,
    handleInsertPlaceholder,
    handleOpenEditModal,
    handleSaveModal,
    handleDeleteItem,
    handleToggleItemVisibility,
    handleCopyTerminal,
    clearTerminalLogs,
    resetCommandsToDefaults
  };
};
