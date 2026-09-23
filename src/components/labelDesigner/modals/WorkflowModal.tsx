import React from 'react';
import { X, Database, Trash2 } from 'lucide-react';
import { WorkflowItem } from '../useLabelDesignerWorkflows';

export interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  currentWorkflowId: string | null;
  workflows: WorkflowItem[];
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
}

export const WorkflowModal: React.FC<WorkflowModalProps> = ({
  isOpen,
  onClose,
  workflowName,
  setWorkflowName,
  currentWorkflowId,
  workflows,
  saveWorkflow,
  loadWorkflow,
  deleteWorkflow
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Quản lý Workflow</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 border-b bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={e => setWorkflowName(e.target.value)}
              placeholder="Tên workflow..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={saveWorkflow}
              disabled={!(workflowName || '').trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {currentWorkflowId ? 'Cập nhật' : 'Lưu mới'}
            </button>
          </div>
          {currentWorkflowId && (
            <p className="text-xs text-gray-500 mt-2">
              Đang chỉnh sửa: {workflows.find(w => w.id === currentWorkflowId)?.name}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-2">
            {workflows.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Database size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có workflow nào</p>
              </div>
            ) : (
              workflows.map(wf => (
                <div
                  key={wf.id}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                    currentWorkflowId === wf.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{wf.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {wf.elements?.length || 0} phần tử ·{' '}
                      {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString('vi-VN') : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => loadWorkflow(wf.id)}
                      className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Tải
                    </button>
                    <button
                      onClick={() => deleteWorkflow(wf.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t bg-gray-50 text-xs text-gray-500">
          <p>💾 Workflow được lưu tự động vào Cloud Storage</p>
          <p className="mt-1">
            📁 Thư mục: <span className="font-mono text-blue-600">label-designer/</span>
          </p>
        </div>
      </div>
    </div>
  );
};
