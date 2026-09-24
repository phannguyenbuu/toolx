import { UtiCommandItem, ExecResult } from './types';
import { execScriptViaGoAgent, GOAGENT_DEFAULT_PORT } from '../goAgentService';
import { AgentNode, AgentNodeRole, OutputDestination } from '../agentMeshService';
import { agentJobService } from '../agentJobService';

/**
 * Thực thi code sống của một UtiCommand (Live Code Build System)
 * 
 * Hỗ trợ:
 * 1. ToolxAgent cục bộ qua endpoint /api/local/exec.
 * 2. Trình duyệt / Web evaluation (JS/Mock).
 */
export async function executeUtiCommand(
  commandOrScript: string | UtiCommandItem,
  params: Record<string, string> = {},
  engine: 'goagent' | 'server' | 'browser' = 'goagent',
  port = GOAGENT_DEFAULT_PORT,
  targetNode?: AgentNode,
  getCommandFn?: (slug: string) => UtiCommandItem | undefined
): Promise<ExecResult> {
  const startTime = performance.now();
  const timestamp = new Date().toLocaleTimeString('vi-VN');

  // Lấy nội dung script
  let scriptContent = '';
  let cmdName = 'custom_exec';

  if (typeof commandOrScript === 'string') {
    const found = getCommandFn ? getCommandFn(commandOrScript) : undefined;
    if (found) {
      scriptContent = found.command_content;
      cmdName = found.command;
    } else {
      scriptContent = commandOrScript;
    }
  } else {
    scriptContent = commandOrScript.command_content;
    cmdName = commandOrScript.command;
  }

  const nodeRole: AgentNodeRole = targetNode?.role || (engine === 'server' ? 'render_server' : 'local_agent');
  const nodeDest: OutputDestination = targetNode?.output_destination || (nodeRole === 'render_server' ? 'cloud' : 'local_path');
  const localOutputDir = targetNode?.local_output_path || params.local_output_dir || 'D:/Dropbox/_Documents/Toolx/output';

  // Thay thế các biến động (Placeholders)
  Object.entries(params).forEach(([key, val]) => {
    const placeholder = `__${key.toUpperCase()}__`;
    scriptContent = scriptContent.split(placeholder).join(val || '');
  });

  // Mặc định thay thế một số placeholder phổ biến & Agent Mesh
  scriptContent = scriptContent
    .replace(/__TARGET_IP__/g, targetNode?.ip || params.target_ip || '127.0.0.1')
    .replace(/__TARGET_PORT__/g, String(targetNode?.port || port || GOAGENT_DEFAULT_PORT))
    .replace(/__WORKSPACE__/g, params.workspace || 'D:/Dropbox/_Documents/Toolx')
    .replace(/__FILE_NAME__/g, params.file_name || 'sample.pdf')
    .replace(/__DPI__/g, params.dpi || '300')
    .replace(/__NODE_ROLE__/g, nodeRole)
    .replace(/__OUTPUT_DESTINATION__/g, nodeDest)
    .replace(/__LOCAL_OUTPUT_DIR__/g, localOutputDir);

  // LUỒNG 1: THỰC THI QUA AGENT MÁY TRẠM (GOAGENT HOẶC RENDER-SERVER)
  if (engine === 'goagent' || engine === 'server') {
    try {
      const execPort = targetNode?.port || port;
      const res = await execScriptViaGoAgent(scriptContent, execPort);
      const duration = Math.round(performance.now() - startTime);

      const stdout = res.stdout || '';
      const stderr = res.stderr || (!res.ok ? (res.error || 'Lỗi thực thi từ Agent.') : '');
      const payload = res.result_payload || null;

      // Trích xuất cloud_url hoặc local_path từ payload nếu có
      const cloudUrl = payload?.cloud_url || payload?.url || (nodeDest === 'cloud' && payload?.preview_b64 ? '(Cloud Preview Base64)' : undefined);
      const localPath = payload?.local_path || payload?.file_path || (nodeDest === 'local_path' ? `${localOutputDir}/${params.file_name || 'output'}` : undefined);

      const execResult: ExecResult = {
        ok: res.ok,
        stdout,
        stderr,
        result_payload: payload,
        duration_ms: duration,
        timestamp,
        node_id: targetNode?.id || (nodeRole === 'render_server' ? 'node-render-server-128gb' : 'node-local-pc'),
        node_name: targetNode?.name || (nodeRole === 'render_server' ? 'Trạm Render Chuyên Dụng (128GB)' : 'Máy Agent Cục Bộ'),
        node_role: nodeRole,
        output_destination: nodeDest,
        cloud_url: cloudUrl,
        local_path: localPath,
        output: stdout || (typeof payload === 'string' ? payload : (payload ? JSON.stringify(payload, null, 2) : '')),
        error: stderr || undefined
      };

      // Ghi nhận Job tự động vào Lịch sử /job
      try {
        agentJobService.recordJob({
          name: `Lệnh: ${cmdName}`,
          category: 'UtiCommand',
          status: res.ok ? 'success' : 'failed',
          node_id: execResult.node_id || 'node-local-pc',
          node_name: execResult.node_name || 'Agent',
          node_role: nodeRole,
          node_target: `${targetNode?.ip || '127.0.0.1'}:${execPort}`,
          script: scriptContent,
          script_language: 'python',
          parameters: params,
          output: {
            stdout,
            stderr,
            result_payload: payload,
            duration_ms: duration,
            cloud_url: cloudUrl,
            local_path: localPath,
            error: execResult.error
          },
          duration_ms: duration,
          triggered_by: 'UtiCommand Console'
        });
      } catch {}

      return execResult;
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      const errText = `Không thể kết nối đến Agent :${targetNode?.port || port}: ${err.message}.`;
      
      try {
        agentJobService.recordJob({
          name: `Lệnh: ${cmdName}`,
          category: 'UtiCommand',
          status: 'failed',
          node_id: targetNode?.id || 'node-local-pc',
          node_name: targetNode?.name || 'Agent',
          node_role: nodeRole,
          node_target: `${targetNode?.ip || '127.0.0.1'}:${targetNode?.port || port}`,
          script: scriptContent,
          script_language: 'python',
          parameters: params,
          output: {
            stdout: '',
            stderr: errText,
            duration_ms: duration,
            error: errText
          },
          duration_ms: duration,
          triggered_by: 'UtiCommand Console'
        });
      } catch {}

      return {
        ok: false,
        stdout: '',
        stderr: errText,
        result_payload: null,
        duration_ms: duration,
        timestamp,
        node_id: targetNode?.id,
        node_name: targetNode?.name,
        node_role: nodeRole,
        output_destination: nodeDest,
        output: '',
        error: errText
      };
    }
  }

  // LUỒNG 2: THỰC THI TRONG TRÌNH DUYỆT (SANDBOX JAVASCRIPT)
  try {
    const duration = Math.round(performance.now() - startTime);
    const stdout = `[BROWSER RUNNER]\nLệnh '${cmdName}' đã được chạy thử trong môi trường trình duyệt.\nĐộ dài mã: ${scriptContent.length} ký tự.\n(Để chạy mã Python/PowerShell hệ thống thật trên PC, vui lòng chọn Engine 'GoAgent PC').`;
    return {
      ok: true,
      stdout,
      stderr: '',
      result_payload: { mode: 'browser_sandbox', script_length: scriptContent.length },
      duration_ms: duration,
      timestamp,
      node_id: 'browser-sandbox',
      node_name: 'Trình duyệt Web (Sandbox)',
      node_role: 'local_agent',
      output_destination: 'local_path',
      output: stdout
    };
  } catch (e: any) {
    const duration = Math.round(performance.now() - startTime);
    return {
      ok: false,
      stdout: '',
      stderr: e.message,
      result_payload: null,
      duration_ms: duration,
      timestamp,
      node_id: 'browser-sandbox',
      node_name: 'Trình duyệt Web (Sandbox)',
      node_role: 'local_agent',
      output_destination: 'local_path',
      error: e.message
    };
  }
}
