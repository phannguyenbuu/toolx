import { useState, useEffect, useCallback, useMemo } from 'react';
import { RenderNode } from './types';
import {
  probeGoAgent,
  isMobileDevice,
  GoAgentInfo,
  GOAGENT_DEFAULT_PORT
} from '../../services/goAgentService';

export interface UseRenderEngineProps {
  apiBase?: string;
}

export function useRenderEngine({ apiBase = '/render-agent' }: UseRenderEngineProps = {}) {
  const [goAgentInfo, setGoAgentInfo] = useState<GoAgentInfo | null>(null);
  const [isProbingAgent, setIsProbingAgent] = useState<boolean>(true);
  const [renderEngine, setRenderEngine] = useState<'auto' | 'goagent' | 'server'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred_render_engine');
      if (saved === 'server' || saved === 'goagent' || saved === 'auto') return saved;
    }
    return 'auto';
  });

  const [renderNodes, setRenderNodes] = useState<RenderNode[]>([]);
  const [selectedRenderNodeUid, setSelectedRenderNodeUid] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferred_render_node_uid') || 'auto';
    }
    return 'auto';
  });
  const [isFetchingNodes, setIsFetchingNodes] = useState<boolean>(false);
  const [localRenderingProgress, setLocalRenderingProgress] = useState<string | null>(null);

  const handleSelectRenderOption = (engine: 'auto' | 'goagent' | 'server', nodeUid: string = 'auto') => {
    setRenderEngine(engine);
    setSelectedRenderNodeUid(nodeUid);
    try {
      localStorage.setItem('preferred_render_engine', engine);
      localStorage.setItem('preferred_render_node_uid', nodeUid);
    } catch (err) {
      console.warn('Lỗi ghi nhớ cài đặt máy render vào localStorage:', err);
    }
  };

  const changeRenderEngine = (engine: 'auto' | 'goagent' | 'server') => {
    setRenderEngine(engine);
    try {
      localStorage.setItem('preferred_render_engine', engine);
    } catch {}
    if (engine === 'auto' || engine === 'goagent') {
      setSelectedRenderNodeUid('auto');
      try {
        localStorage.setItem('preferred_render_node_uid', 'auto');
      } catch {}
    }
  };

  const selectRenderNode = (uid: string) => {
    setSelectedRenderNodeUid(uid);
    try {
      localStorage.setItem('preferred_render_node_uid', uid);
    } catch {}
    if (uid !== 'auto') {
      setRenderEngine('server');
      try {
        localStorage.setItem('preferred_render_engine', 'server');
      } catch {}
    }
  };

  const selectedNode = useMemo(() => {
    if (selectedRenderNodeUid === 'auto') return null;
    return renderNodes.find((n) => n.agent_uid === selectedRenderNodeUid) || null;
  }, [renderNodes, selectedRenderNodeUid]);

  const isMobile = isMobileDevice();
  const effectiveEngine = useMemo<'goagent' | 'server'>(() => {
    if (renderEngine === 'goagent') return 'goagent';
    if (renderEngine === 'server') return 'server';
    if (isMobile) return 'server';
    if (goAgentInfo?.detected) return 'goagent';
    return 'server';
  }, [renderEngine, goAgentInfo, isMobile]);

  const checkGoAgent = useCallback(async (isSilent?: boolean | React.MouseEvent) => {
    const silent = isSilent === true;
    if (!silent) setIsProbingAgent(true);
    try {
      const info = await probeGoAgent(GOAGENT_DEFAULT_PORT);
      setGoAgentInfo(info.detected ? info : null);
    } catch {
      setGoAgentInfo(null);
    } finally {
      if (!silent) setIsProbingAgent(false);
    }
  }, []);

  const fetchRenderNodes = useCallback(async (isSilent?: boolean | React.MouseEvent) => {
    const silent = isSilent === true;
    if (!silent) setIsFetchingNodes(true);
    try {
      const res = await fetch(`${apiBase}/api/render-nodes`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.nodes)) {
          setRenderNodes((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(data.nodes)) {
              return prev;
            }
            return data.nodes;
          });
        }
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách máy trạm render:', err);
    } finally {
      if (!silent) setIsFetchingNodes(false);
    }
  }, [apiBase]);

  useEffect(() => {
    checkGoAgent(false);
    fetchRenderNodes(false);

    const timer = setInterval(() => {
      fetchRenderNodes(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [checkGoAgent, fetchRenderNodes]);

  return {
    goAgentInfo,
    isProbingAgent,
    checkGoAgent,
    renderEngine,
    setRenderEngine,
    renderNodes,
    setRenderNodes,
    selectedRenderNodeUid,
    setSelectedRenderNodeUid,
    selectedNode,
    isFetchingNodes,
    fetchRenderNodes,
    effectiveEngine,
    handleSelectRenderOption,
    changeRenderEngine,
    selectRenderNode,
    localRenderingProgress,
    setLocalRenderingProgress,
    isMobile
  };
}
