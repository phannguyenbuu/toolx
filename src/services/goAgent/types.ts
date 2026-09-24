export const GOAGENT_DEFAULT_PORT = 9173;
export const WORKSTATION_SERVER_URL = '/render-agent'; // Proxied to 157.66.80.125:8006

export interface GoAgentInfo {
  detected: boolean;
  agent_uid?: string;
  lan_uid?: string;
  pc_name?: string;
  pc_ip?: string;
  port: number;
  url: string;
}

export interface RenderPageResult {
  page_number: number;
  width_pt: number;
  height_pt: number;
  width_mm: number;
  height_mm: number;
  dpi: number;
  preview_b64: string; // data:image/png;base64,...
  file_path?: string;
}

export interface GoAgentRenderResponse {
  ok: boolean;
  total_pages: number;
  pages: RenderPageResult[];
  filename: string;
  duration_ms?: number;
  dpi: number;
  colorspace?: string;
  error?: string;
  rendered_by: 'goagent_local' | 'workstation_server';
  pdf_b64?: string;
  file_path?: string;
}

export interface GoAgentExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  result_payload?: any;
  output?: string;
  error?: string;
}
