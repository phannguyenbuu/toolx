import React, { useState } from 'react';
import {
  LayoutGrid,
  Save,
  Trash2,
  FolderOpen,
  Sparkles,
  ChevronDown,
  Expand,
  Scissors,
  Play,
  Loader2,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';
import { LayoutPlan } from '../../utils/layoutSolver';
import { PageItem, WorkspaceItem, ShapeTabItem, ImpositionConfig } from './types';
import { safeToastInfo, safeToastSuccess, safeToastError } from './impositionHelpers';
import { ImpositionFileDropdown } from './ImpositionFileDropdown';

export interface ImpositionHeaderProps {
  savedWorkspaces: WorkspaceItem[];
  isWorkspaceModalOpen: boolean;
  setIsWorkspaceModalOpen: (open: boolean) => void;
  localWorkspaceName: string;
  setLocalWorkspaceName: (name: string) => void;
  saveWorkspace: () => void;
  presetWorkspaces: any[];
  loadWorkspace: (ws: any) => void;
  deleteWorkspace: (name: string) => void;
  allPages: PageItem[];
  setAllPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  shapeTabs: ShapeTabItem[];
  setShapeTabs: React.Dispatch<React.SetStateAction<ShapeTabItem[]>>;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  setIsDataModalOpen: (open: boolean) => void;
  setIsAiModalOpen: (open: boolean) => void;
  setAiPreviewPages: (pages: PageItem[]) => void;
  setAiResult: (res: any) => void;
  setIsOutpaintPanelOpen: (open: boolean) => void;
  setIsRightSidebarCollapsed: (collapsed: boolean) => void;
  dlSVG: () => void;
  currentPlan: LayoutPlan | null;
  setIsRenderModalOpen: (open: boolean) => void;
  saveToFileManager: () => void;
  isSaving: boolean;
  lastImpositionRender: any;
  setLastImpositionRender: (r: any) => void;
  generateImpositionPdfBlob: () => Promise<Blob>;
  handleReset: () => void;
  onClose?: () => void;
}

export const ImpositionHeader: React.FC<ImpositionHeaderProps> = ({
  savedWorkspaces,
  isWorkspaceModalOpen,
  setIsWorkspaceModalOpen,
  localWorkspaceName,
  setLocalWorkspaceName,
  saveWorkspace,
  presetWorkspaces,
  loadWorkspace,
  deleteWorkspace,
  allPages,
  setAllPages,
  shapeTabs,
  setShapeTabs,
  activeTabId,
  setActiveTabId,
  config,
  setConfig,
  setIsDataModalOpen,
  setIsAiModalOpen,
  setAiPreviewPages,
  setAiResult,
  setIsOutpaintPanelOpen,
  setIsRightSidebarCollapsed,
  dlSVG,
  currentPlan,
  setIsRenderModalOpen,
  saveToFileManager,
  isSaving,
  lastImpositionRender,
  setLastImpositionRender,
  generateImpositionPdfBlob,
  handleReset,
  onClose
}) => {
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg"><LayoutGrid size={22} /></div>
        <div>
          <h1 className="text-lg font-medium">Bình tem</h1>
          <p className="text-violet-200 text-xs">Công cụ xếp hình in ấn</p>
        </div>

        {/* Danh mục file Dropdown */}
        <ImpositionFileDropdown
          shapeTabs={shapeTabs}
          setShapeTabs={setShapeTabs}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          config={config}
          setConfig={setConfig}
          allPages={allPages}
          setAllPages={setAllPages}
        />
      </div>
      <div className="flex items-center gap-3">
        {/* Workspace Management */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setIsWorkspaceModalOpen(!isWorkspaceModalOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Save size={18} /> Workspace {savedWorkspaces.length > 0 && <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{savedWorkspaces.length}</span>}
          </button>
          {isWorkspaceModalOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[100] w-[480px] max-h-96">
              {/* Header with input */}
              <div className="p-4 border-b bg-purple-50">
                <input
                  type="text"
                  placeholder="Tên workspace..."
                  value={localWorkspaceName}
                  onChange={(e) => setLocalWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.key === 'Enter' && saveWorkspace()}
                />
                <button
                  onClick={saveWorkspace}
                  disabled={!localWorkspaceName.trim()}
                  className="w-full mt-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Lưu workspace hiện tại
                </button>
              </div>

              {/* Two columns layout */}
              <div className="flex h-64">
                {/* Left column - Preset workspaces */}
                <div className="flex-1 border-r border-gray-200">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Workspace Mẫu</h3>
                  </div>
                  <div className="overflow-y-auto h-full">
                    {presetWorkspaces.map((ws) => (
                      <div key={ws.name} className="group hover:bg-blue-50 border-b border-gray-100">
                        <button
                          onClick={() => { loadWorkspace(ws); setIsWorkspaceModalOpen(false); }}
                          className="w-full px-3 py-3 text-left text-sm font-medium text-gray-700 hover:text-blue-600 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="font-medium">{ws.name}</div>
                            <div className="text-xs text-gray-500">
                              {ws.config.shape === 'circle' ? 'Tròn' : ws.config.shape === 'rect' ? 'Chữ nhật' : ws.config.shape === 'oval' ? 'Bầu dục' : ws.config.shape === 'trapezoid' ? 'Hình thang' : ws.config.shape === 'triangle' ? 'Tam giác' : ws.config.shape === 'hexagon' ? 'Lục giác' : ws.config.shape} • 
                              {ws.config.itemW}x{ws.config.itemH}mm • 
                              {ws.dataMode === 1 ? 'Chuẩn' : ws.dataMode === 4 ? 'X-Up' : ws.dataMode === 5 ? '2 Mặt Giống' : ws.dataMode === 6 ? 'Đối xứng' : 'Khác'}
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right column - User saved workspaces */}
                <div className="flex-1">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Workspace Đã Lưu</h3>
                  </div>
                  <div className="overflow-y-auto h-full">
                    {savedWorkspaces.length > 0 ? (
                      savedWorkspaces.map((ws) => (
                        <div key={ws.name} className="group hover:bg-purple-50 border-b border-gray-100">
                          <div className="flex items-center justify-between px-3 py-2">
                            <button
                              onClick={() => { loadWorkspace(ws); setIsWorkspaceModalOpen(false); }}
                              className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-purple-600 cursor-pointer"
                            >
                              {ws.name}
                            </button>
                            <button
                              onClick={() => deleteWorkspace(ws.name)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-8 text-center text-gray-500 text-sm">
                        <div className="mb-2">Chưa có workspace</div>
                        <div className="text-xs">Lưu workspace hiện tại để sử dụng sau</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quản lý Dữ liệu */}
        <button
          onClick={() => setIsDataModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-500 hover:bg-pink-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          <FolderOpen size={18} /> Quản lý Dữ liệu {allPages.length > 0 && <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{allPages.length}</span>}
        </button>

        {/* AI Menu Dropdown */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
            disabled={allPages.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:shadow-none cursor-pointer"
          >
            <Sparkles size={18} /> AI <ChevronDown size={14} />
          </button>
          {isAiMenuOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 min-w-[180px]">
              <button
                onClick={() => { setIsAiModalOpen(true); setAiPreviewPages([]); setAiResult(null); setIsAiMenuOpen(false); }}
                className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} className="text-amber-500" /> AI Sắp xếp
              </button>
              <button
                onClick={() => { setIsOutpaintPanelOpen(true); setIsRightSidebarCollapsed(false); setIsAiMenuOpen(false); }}
                className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-t cursor-pointer"
              >
                <Expand size={16} className="text-blue-500" /> Mở rộng ảnh (AI Bleed)
              </button>
            </div>
          )}
        </div>

        {/* Tải SVG */}
        <button
          onClick={dlSVG}
          disabled={!currentPlan}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:shadow-none cursor-pointer"
        >
          <Scissors size={18} /> Tải SVG Cắt
        </button>

        {/* Nút Render */}
        <button
          onClick={() => setIsRenderModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-95 cursor-pointer"
          title="Mở bảng điều khiển Render Prepress (chọn Agent & Preset)"
        >
          <Play size={17} className="fill-current text-white" />
          <span>Render</span>
        </button>

        {/* Lưu vào Quản lý tệp */}
        <button
          onClick={saveToFileManager}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer"
          title="Lưu file bình trang hiện tại vào Quản lý tệp"
        >
          {isSaving ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</> : <><Save size={18} /> Lưu tệp</>}
        </button>

        {/* Tải Render gần nhất nếu có */}
        {lastImpositionRender?.downloadUrl && (
          <a
            href={lastImpositionRender.downloadUrl}
            download={lastImpositionRender.filename || 'BinhTrang_Render.pdf'}
            onClick={async (e) => {
              if (lastImpositionRender.downloadUrl.startsWith('blob:')) {
                try {
                  const check = await fetch(lastImpositionRender.downloadUrl, { method: 'HEAD' });
                  if (check.ok) return;
                } catch {}
                e.preventDefault();
                try {
                  safeToastInfo('Đang tạo lại tệp PDF cho phiên làm việc hiện tại...');
                  const freshBlob = await generateImpositionPdfBlob();
                  const freshUrl = URL.createObjectURL(freshBlob);
                  const updated = { ...lastImpositionRender, downloadUrl: freshUrl };
                  setLastImpositionRender(updated);
                  try { localStorage.setItem('toolx_last_imposition_render', JSON.stringify(updated)); } catch {}
                  const a = document.createElement('a');
                  a.href = freshUrl;
                  a.download = lastImpositionRender.filename || 'BinhTrang_Render.pdf';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  safeToastSuccess('Đã tải xuống thành công bản render!');
                } catch (err: any) {
                  safeToastError('Không thể tạo lại file tải: ' + (err.message || err));
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition-all"
            title="Tải bản Render gần nhất"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Tải Render ({lastImpositionRender.filename?.slice(0, 16) || 'PDF'}...)</span>
          </a>
        )}

        {/* Làm mới */}
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all cursor-pointer"
          title="Làm mới - Reset tất cả về mặc định"
        >
          <RefreshCw size={18} /> Làm mới
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            title="Đóng trang Bình tem"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </header>
  );
};
