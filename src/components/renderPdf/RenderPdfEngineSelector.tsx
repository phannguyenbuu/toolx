import React from 'react';
import { RenderNode } from './types';
import { GoAgentInfo } from '../../services/goAgentService';

export interface RenderPdfEngineSelectorProps {
  renderEngine: 'auto' | 'goagent' | 'server';
  selectedRenderNodeUid: string;
  renderNodes: RenderNode[];
  effectiveEngine: 'goagent' | 'server';
  selectedNode: RenderNode | null;
  goAgentInfo: GoAgentInfo | null;
  onSelectRenderOption: (engine: 'auto' | 'goagent' | 'server', nodeUid: string) => void;
  themeCardInner: string;
  themeTextMuted: string;
}

export const RenderPdfEngineSelector: React.FC<RenderPdfEngineSelectorProps> = ({
  renderEngine,
  selectedRenderNodeUid,
  renderNodes,
  effectiveEngine,
  selectedNode,
  goAgentInfo,
  onSelectRenderOption,
  themeCardInner,
  themeTextMuted,
}) => {
  return (
    <div className={`px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${themeCardInner}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[11px] font-medium ${themeTextMuted}`}>Máy render:</span>
        <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onSelectRenderOption('auto', 'auto')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
              renderEngine === 'auto' && selectedRenderNodeUid === 'auto'
                ? 'bg-[#999] text-white shadow-xs'
                : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            Tự động
          </button>
          <button
            type="button"
            onClick={() => onSelectRenderOption('goagent', 'auto')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
              renderEngine === 'goagent'
                ? 'bg-[#999] text-white shadow-xs'
                : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            PrintAgent (Máy này)
          </button>
          {renderNodes.map((node) => {
            const isSelected = renderEngine === 'server' && selectedRenderNodeUid === node.agent_uid;
            return (
              <button
                key={node.agent_uid}
                type="button"
                onClick={() => onSelectRenderOption('server', node.agent_uid)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#999] text-white shadow-xs'
                    : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                }`}
                title={`${node.hostname} (${node.public_ip || node.local_ip || 'IP'} - ${node.is_online ? 'Online' : 'Offline'})`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${node.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                <span>{node.hostname || node.agent_uid}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px]">
        {effectiveEngine === 'server' ? (
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {selectedNode
              ? `Máy trạm Server (${selectedNode.hostname} • ${selectedNode.public_ip || selectedNode.local_ip || ''})`
              : 'Máy trạm Server (Tự động điều phối)'}
          </span>
        ) : (
          <span className={`flex items-center gap-1.5 ${goAgentInfo?.detected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} font-medium`}>
            <span className={`w-2 h-2 rounded-full ${goAgentInfo?.detected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {goAgentInfo?.detected ? 'PrintAgent (Máy này)' : 'Chưa có PrintAgent -> Sẽ chuyển Server'}
          </span>
        )}
      </div>
    </div>
  );
};
