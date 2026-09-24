import { AgentJobItem } from '../../services/agentJobService';

export type { AgentJobItem };

export type JobDetailTab = 'script' | 'parameters' | 'output' | 'raw_json';

export type StatusFilter = 'all' | 'success' | 'failed';

export interface AgentJobDashboardProps {
  onNavigateToCommand?: (slug: string) => void;
}
