import { UtiCommandItem, ExecResult } from '../../services/utiCommandService';
import { MicroserviceItem } from '../../services/microservicesConfig';
import { AgentNode } from '../../services/agentMeshService';
import { GoAgentInfo } from '../../services/goAgentService';

export type AdminView = 'commands' | 'services' | 'agents' | 'jobs';

export type TerminalStreamTab = 'all' | 'stdout' | 'stderr' | 'payload';

export type ExecutionEngine = 'goagent' | 'server' | 'browser';

export type EditorTheme = 'light' | 'dark';

export interface AdminUtiDashboardProps {
  onClose?: () => void;
  onNavigateToClient?: () => void;
}

export interface NodePingResult {
  ok: boolean;
  message: string;
  ms?: number;
}
