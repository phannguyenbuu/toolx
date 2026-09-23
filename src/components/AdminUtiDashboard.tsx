import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, Code2 } from 'lucide-react';
import { MicroserviceItem } from '../services/microservicesConfig';
import { UtiCommandEditModal } from './UtiCommandEditModal';
import { AgentJobDashboard } from './AgentJobDashboard';
import {
  AdminView,
  AdminUtiDashboardProps,
  useMicroservicesHub,
  useAgentMeshHub,
  useUtiCommands,
  AdminUtiHeader,
  MicroservicesHubView,
  AgentMeshView,
  CommandsSidebar,
  CommandEditorHeader,
  CommandEditorCodeArea,
  CommandTerminalConsole,
  RegisterMicroserviceModal,
  AgentNodeEditModal
} from './adminUti';

export const AdminUtiDashboard: React.FC<AdminUtiDashboardProps> = ({
  onClose,
  onNavigateToClient
}) => {
  // Navigation / View state: 'commands' vs 'services' vs 'agents' vs 'jobs' (/job Inspector)
  const [adminView, setAdminView] = useState<AdminView>(() => {
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

  // Global action toast
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(null), 3500);
  }, []);

  // Agent Mesh State & Hub
  const agentMesh = useAgentMeshHub(showToast);

  // Microservices Hub State
  const microservices = useMicroservicesHub(showToast);

  // UtiCommands State
  const uti = useUtiCommands(agentMesh.activeNode);

  useEffect(() => {
    document.title = 'Admin ToolXPrint';
  }, []);

  // Current service associated with the active command's category
  const currentServiceForCommand = useMemo(() => {
    if (!uti.currentItem) return undefined;
    return microservices.servicesList.find((s) => s.utiCategory === uti.currentItem.category);
  }, [uti.currentItem, microservices.servicesList]);

  // Jump from Microservices view directly to command
  const handleJumpToServiceCommands = useCallback((service: MicroserviceItem) => {
    setAdminView('commands');
    uti.setActiveCategory(service.utiCategory);
    const firstInCat = uti.commands.find((c) => c.category === service.utiCategory);
    if (firstInCat) {
      uti.setSelectedSlug(firstInCat.command);
    }
  }, [uti]);

  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-800 flex flex-col overflow-hidden font-sans select-none">
      {/* ================= HEADER BAR ================= */}
      <AdminUtiHeader
        adminView={adminView}
        setAdminView={setAdminView}
        commandsCount={uti.commands.length}
        servicesCount={microservices.servicesList.length}
        agentsCount={agentMesh.agentNodes.length}
        activeNode={agentMesh.activeNode}
        goAgentInfo={uti.goAgentInfo}
        isProbingAgent={uti.isProbingAgent}
        checkAgent={uti.checkAgent}
        onNavigateToClient={onNavigateToClient}
        onClose={onClose}
      />

      {/* ================= CONDITIONAL VIEWS ================= */}
      {adminView === 'services' ? (
        /* ================= MICROSERVICES HUB VIEW ================= */
        <MicroservicesHubView
          servicesList={microservices.servicesList}
          filteredServices={microservices.filteredServices}
          attachedCount={microservices.attachedCount}
          detachedCount={microservices.detachedCount}
          serviceSearch={microservices.serviceSearch}
          setServiceSearch={microservices.setServiceSearch}
          attachFilter={microservices.attachFilter}
          setAttachFilter={microservices.setAttachFilter}
          servicePings={microservices.servicePings}
          isPinging={microservices.isPinging}
          onOpenRegisterModal={() => microservices.setRegisterModalOpen(true)}
          onPingAllServices={microservices.handlePingAllServices}
          onResetToDefaults={microservices.resetToDefaults}
          onToggleAttachService={microservices.handleToggleAttachService}
          onPingService={microservices.handlePingService}
          onOpenFrontend={microservices.handleOpenServiceFrontend}
          onJumpToCommands={handleJumpToServiceCommands}
        />
      ) : adminView === 'agents' ? (
        /* ================= AGENT MESH MANAGEMENT VIEW ================= */
        <AgentMeshView
          agentNodes={agentMesh.agentNodes}
          activeNode={agentMesh.activeNode}
          nodePings={agentMesh.nodePings}
          isPingingNodes={agentMesh.isPingingNodes}
          onOpenNodeModal={agentMesh.handleOpenNodeModal}
          onPingAllNodes={agentMesh.handlePingAllNodes}
          onResetToDefaults={agentMesh.resetToDefaults}
          onSelectActiveNode={agentMesh.handleSelectActiveNode}
          onPingSingleNode={agentMesh.handlePingSingleNode}
          onDeleteNode={agentMesh.handleDeleteNode}
        />
      ) : adminView === 'jobs' ? (
        /* ================= AGENT JOB INSPECTOR VIEW (/job) ================= */
        <AgentJobDashboard
          onNavigateToCommand={(slug) => {
            setAdminView('commands');
            uti.setSelectedSlug(slug);
          }}
        />
      ) : (
        /* ================= UTICOMMANDS DUAL PANE VIEW ================= */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Command Menu Items */}
          <CommandsSidebar
            adminView={adminView}
            setAdminView={setAdminView}
            commandsCount={uti.commands.length}
            servicesCount={microservices.servicesList.length}
            agentsCount={agentMesh.agentNodes.length}
            searchQuery={uti.searchQuery}
            setSearchQuery={uti.setSearchQuery}
            activeCategory={uti.activeCategory}
            setActiveCategory={uti.setActiveCategory}
            categories={uti.categories}
            filteredCommands={uti.filteredCommands}
            selectedSlug={uti.selectedSlug}
            setSelectedSlug={uti.setSelectedSlug}
            onToggleItemVisibility={uti.handleToggleItemVisibility}
            onOpenEditModal={() => uti.handleOpenEditModal()}
            onResetCommands={uti.resetCommandsToDefaults}
          />

          {/* Right Main Area: Code Editor & Terminal Console */}
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {uti.currentItem ? (
              <>
                {/* Header Action Toolbar */}
                <CommandEditorHeader
                  currentItem={uti.currentItem}
                  currentService={currentServiceForCommand}
                  engine={uti.engine}
                  setEngine={uti.setEngine}
                  hasUnsavedChanges={uti.hasUnsavedChanges}
                  saveToast={uti.saveToast}
                  isRunning={uti.isRunning}
                  onToggleVisibility={uti.handleToggleItemVisibility}
                  onOpenServiceFrontend={microservices.handleOpenServiceFrontend}
                  onSaveLiveCode={uti.handleSaveLiveCode}
                  onOpenEditModal={uti.handleOpenEditModal}
                  onDeleteItem={uti.handleDeleteItem}
                  onExecuteLive={uti.handleExecuteLive}
                />

                {/* Code Textarea & Variable Pills */}
                <CommandEditorCodeArea
                  textareaRef={uti.textareaRef}
                  liveCode={uti.liveCode}
                  setLiveCode={uti.setLiveCode}
                  setHasUnsavedChanges={uti.setHasUnsavedChanges}
                  handleKeyDown={uti.handleKeyDown}
                  handleInsertPlaceholder={uti.handleInsertPlaceholder}
                  activeNode={agentMesh.activeNode}
                  setActiveNode={agentMesh.setActiveNode}
                  agentNodes={agentMesh.agentNodes}
                  targetIp={uti.targetIp}
                  setTargetIp={uti.setTargetIp}
                  workspacePath={uti.workspacePath}
                  setWorkspacePath={uti.setWorkspacePath}
                  editorTheme={uti.editorTheme}
                  setEditorTheme={uti.setEditorTheme}
                  language={uti.currentItem.language}
                />

                {/* Dual-Stream Terminal Console */}
                <CommandTerminalConsole
                  terminalLogs={uti.terminalLogs}
                  terminalStreamTab={uti.terminalStreamTab}
                  setTerminalStreamTab={uti.setTerminalStreamTab}
                  copiedTerminal={uti.copiedTerminal}
                  onCopyTerminal={uti.handleCopyTerminal}
                  onClearTerminal={uti.clearTerminalLogs}
                  showToast={showToast}
                  terminalEndRef={uti.terminalEndRef}
                />
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
        isOpen={uti.editModalOpen}
        onClose={() => uti.setEditModalOpen(false)}
        onSave={uti.handleSaveModal}
        initialData={uti.editingItem}
        existingCategories={uti.categories}
      />

      {/* Register New Microservice Modal */}
      <RegisterMicroserviceModal
        isOpen={microservices.registerModalOpen}
        onClose={() => microservices.setRegisterModalOpen(false)}
        onSubmit={microservices.handleRegisterNewService}
        name={microservices.newServiceName}
        setName={microservices.setNewServiceName}
        route={microservices.newServiceRoute}
        setRoute={microservices.setNewServiceRoute}
        port={microservices.newServicePort}
        setPort={microservices.setNewServicePort}
        category={microservices.newServiceCategory}
        setCategory={microservices.setNewServiceCategory}
        tech={microservices.newServiceTech}
        setTech={microservices.setNewServiceTech}
        caps={microservices.newServiceCaps}
        setCaps={microservices.setNewServiceCaps}
        desc={microservices.newServiceDesc}
        setDesc={microservices.setNewServiceDesc}
      />

      {/* Add / Edit Agent Node Modal */}
      <AgentNodeEditModal
        isOpen={agentMesh.nodeModalOpen}
        onClose={() => agentMesh.setNodeModalOpen(false)}
        onSubmit={agentMesh.handleSaveNode}
        editingNode={agentMesh.editingNode}
        name={agentMesh.nodeName}
        setName={agentMesh.setNodeName}
        ip={agentMesh.nodeIp}
        setIp={agentMesh.setNodeIp}
        port={agentMesh.nodePort}
        setPort={agentMesh.setNodePort}
        role={agentMesh.nodeRole}
        setRole={agentMesh.setNodeRole}
        localPath={agentMesh.nodeLocalPath}
        setLocalPath={agentMesh.setNodeLocalPath}
        cloudEndpoint={agentMesh.nodeCloudEndpoint}
        setCloudEndpoint={agentMesh.setNodeCloudEndpoint}
      />

      {/* Toast Notification */}
      {globalToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{globalToast}</span>
        </div>
      )}
    </div>
  );
};

export default AdminUtiDashboard;
