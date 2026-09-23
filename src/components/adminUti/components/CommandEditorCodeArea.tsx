import React from 'react';
import { Code2, Moon, Sun } from 'lucide-react';
import { AgentNode } from '../../../services/agentMeshService';
import { EditorTheme } from '../types';

interface CommandEditorCodeAreaProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  liveCode: string;
  setLiveCode: (code: string) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleInsertPlaceholder: (placeholder: string) => void;
  activeNode: AgentNode;
  setActiveNode: (nodeId: string) => void;
  agentNodes: AgentNode[];
  targetIp: string;
  setTargetIp: (ip: string) => void;
  workspacePath: string;
  setWorkspacePath: (path: string) => void;
  editorTheme: EditorTheme;
  setEditorTheme: (theme: EditorTheme) => void;
  language?: string;
}

export const CommandEditorCodeArea: React.FC<CommandEditorCodeAreaProps> = ({
  textareaRef,
  liveCode,
  setLiveCode,
  setHasUnsavedChanges,
  handleKeyDown,
  handleInsertPlaceholder,
  activeNode,
  setActiveNode,
  agentNodes,
  targetIp,
  setTargetIp,
  workspacePath,
  setWorkspacePath,
  editorTheme,
  setEditorTheme,
  language
}) => {
  return (
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
            Ngôn ngữ: {language || 'Python'} • {liveCode.split('\n').length} dòng
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
  );
};
