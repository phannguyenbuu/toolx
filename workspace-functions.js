// Workspace API functions - replace the existing functions in ImpositionAdvancedPage.tsx

// Load saved workspaces from API
useEffect(() => {
  const loadWorkspaces = async () => {
    const workspaces = await workspaceService.getWorkspaces();
    setSavedWorkspaces(workspaces);
  };
  loadWorkspaces();
}, []);

// Save workspace function
const saveWorkspace = async () => {
  if (!localWorkspaceName.trim()) {
    alert('Vui lòng nhập tên workspace!');
    return;
  }
  
  const workspace = {
    name: localWorkspaceName.trim(),
    config: { ...config },
    dataMode,
    xUpQty,
    standardQty,
    unitPrice
  };
  
  const saved = await workspaceService.saveWorkspace(workspace);
  if (saved) {
    const workspaces = await workspaceService.getWorkspaces();
    setSavedWorkspaces(workspaces);
    setWorkspaceName('');
    setLocalWorkspaceName('');
    setIsWorkspaceModalOpen(false);
    alert('Đã lưu workspace thành công!');
  } else {
    alert('Lỗi khi lưu workspace!');
  }
};

// Delete workspace function
const deleteWorkspace = async (workspace: typeof savedWorkspaces[0]) => {
  if (!window.confirm(`Xóa workspace "${workspace.name}"?`)) return;
  
  if (workspace.id) {
    const deleted = await workspaceService.deleteWorkspace(workspace.id);
    if (deleted) {
      const workspaces = await workspaceService.getWorkspaces();
      setSavedWorkspaces(workspaces);
    } else {
      alert('Lỗi khi xóa workspace!');
    }
  }
};
