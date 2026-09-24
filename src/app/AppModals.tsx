import React from 'react';
import { Save, File as FileIcon2 } from 'lucide-react';
import { CustomerView } from '../CustomerView';
import { LoginModal } from '../components/auth';
import { TopUpModal } from '../components/account';
import { FilePickerModal } from '../components/FilePickerModal';
import AIRobotAssistant from '../components/AIRobotAssistant';
import { ElementData, PageConfig, SheetRow } from './types';

export interface AppModalsProps {
  showCustomerView: boolean;
  setShowCustomerView: (show: boolean) => void;
  elements: ElementData[];
  pageConfig: PageConfig;
  dataRows: SheetRow[];
  headers: string[];
  customerSettings: { active: boolean; pin: string; allowEdit: boolean };
  customerNotes: Record<number, string>;
  setCustomerNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setDataRows: React.Dispatch<React.SetStateAction<SheetRow[]>>;
  resolveContent: (content: string, specificRow?: SheetRow) => string;
  resolveImageSrc: (el: ElementData, specificRow?: SheetRow) => string;
  mmToPx: (mm: number) => number;

  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;

  isTopUpModalOpen: boolean;
  setIsTopUpModalOpen: (open: boolean) => void;
  walletBalance: number;
  refreshWallet: () => void;

  isFilePickerOpen: boolean;
  setIsFilePickerOpen: (open: boolean) => void;
  handleFileFromManager: (file: File) => Promise<void>;

  isSaveProjectDialogOpen: boolean;
  setIsSaveProjectDialogOpen: (open: boolean) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  existingProjects: { id: string; name: string }[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  isSavingToFileManager: boolean;
  saveProjectToFileManager: () => Promise<void>;

  showRobot: boolean;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  showCustomerView,
  setShowCustomerView,
  elements,
  pageConfig,
  dataRows,
  headers,
  customerSettings,
  customerNotes,
  setCustomerNotes,
  setDataRows,
  resolveContent,
  resolveImageSrc,
  mmToPx,

  isLoginModalOpen,
  setIsLoginModalOpen,

  isTopUpModalOpen,
  setIsTopUpModalOpen,
  walletBalance,
  refreshWallet,

  isFilePickerOpen,
  setIsFilePickerOpen,
  handleFileFromManager,

  isSaveProjectDialogOpen,
  setIsSaveProjectDialogOpen,
  projectName,
  setProjectName,
  existingProjects,
  selectedProjectId,
  setSelectedProjectId,
  isSavingToFileManager,
  saveProjectToFileManager,

  showRobot,
  currentPage,
  setCurrentPage,
}) => {
  return (
    <>
      {/* Customer View Overlay */}
      {showCustomerView && (
        <CustomerView
          elements={elements}
          pageConfig={pageConfig}
          dataRows={dataRows}
          headers={headers}
          settings={customerSettings}
          initialNotes={customerNotes}
          onClose={() => setShowCustomerView(false)}
          onSaveNote={(idx, note) => setCustomerNotes(p => ({ ...p, [idx]: note }))}
          onUpdateRow={(idx: number, key: string, val: string) => {
            const newRows = [...dataRows];
            if (newRows[idx]) {
              newRows[idx] = { ...newRows[idx], [key]: val };
              setDataRows(newRows);
            }
          }}
          resolveContent={resolveContent}
          resolveImageSrc={resolveImageSrc}
          mmToPx={mmToPx}
        />
      )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />

      {/* TopUp Modal */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        currentBalance={walletBalance}
        onSuccess={() => refreshWallet()}
      />

      {/* File Picker Modal */}
      <FilePickerModal
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelect={handleFileFromManager}
        accept={['PROJECT']}
        title="Mở dự án từ Quản lý tệp"
      />

      {/* Save Project Dialog */}
      {isSaveProjectDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Save size={20} className="text-indigo-600" />
              Lưu dự án
            </h3>
            
            {/* New project name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên dự án mới
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => { setProjectName(e.target.value); setSelectedProjectId(null); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nhập tên dự án..."
              />
            </div>

            {/* Or overwrite existing */}
            {existingProjects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hoặc lưu đè dự án có sẵn
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {existingProjects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => { setSelectedProjectId(project.id); setProjectName(''); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        selectedProjectId === project.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                      }`}
                    >
                      <FileIcon2 size={16} />
                      {project.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsSaveProjectDialogOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={saveProjectToFileManager}
                disabled={(!(projectName || '').trim() && !selectedProjectId) || isSavingToFileManager}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingToFileManager ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Robot Assistant */}
      {showRobot && (
        <AIRobotAssistant
          currentPage={currentPage}
          onNavigate={(pageId) => setCurrentPage(pageId)}
        />
      )}
    </>
  );
};
