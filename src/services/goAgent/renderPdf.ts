import { GOAGENT_DEFAULT_PORT, GoAgentRenderResponse } from './types';
import { lastDetectedAgentInfo } from './probe';
import { buildRenderPythonScript } from './scriptGenerator';
import { execScriptViaGoAgent } from './executor';
import { agentJobService } from '../agentJobService';

/**
 * Chuyển đổi File sang Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Xử lý kết xuất PDF trực tiếp qua GoAgent bằng cách bơm code exec
 */
export async function renderPdfViaGoAgent(
  file: File,
  options: {
    dpi?: number;
    colorspace?: string;
    maxPages?: number;
    port?: number;
    transparentBg?: boolean;
    pageRange?: string;
  } = {}
): Promise<GoAgentRenderResponse> {
  const {
    dpi = 300,
    colorspace = 'rgb',
    maxPages = 50,
    port = GOAGENT_DEFAULT_PORT,
    transparentBg = false,
    pageRange = 'all'
  } = options;

  const base64Data = await fileToBase64(file);
  const script = buildRenderPythonScript(base64Data, file.name, dpi, colorspace, maxPages, transparentBg, pageRange);

  const res = await execScriptViaGoAgent(script, port);

  if (!res.ok || !res.result_payload) {
    throw new Error(res.error || 'GoAgent không phản hồi kết quả render.');
  }

  const payload = res.result_payload;
  const sanitizedScriptSummary = `# Python PyMuPDF Worker Exec Script
# File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)
# Thiết lập: ${dpi} DPI, ${colorspace.toUpperCase()}, Trang: ${pageRange || 'Tất cả'}
import fitz, base64, json, sys, os

# Quá trình Render Vector Single-Pass đã hoàn tất trên GoAgent PC
doc = fitz.open(in_path)
total_pages = len(doc)
`;

  if (!payload.ok) {
    try {
      const agentUid = lastDetectedAgentInfo?.agent_uid || 'administrator';
      const pcName = lastDetectedAgentInfo?.pc_name || 'Administrator';
      const nodeDisplayName = `${agentUid} (${pcName})`;

      agentJobService.recordJob({
        name: `Render PDF: ${file.name}`,
        category: 'PDF Prepress',
        status: 'failed',
        node_id: 'node-local-pc',
        node_name: nodeDisplayName,
        node_role: 'local_agent',
        node_target: `127.0.0.1:${port}`,
        script: sanitizedScriptSummary,
        script_language: 'python',
        parameters: {
          file_name: file.name,
          dpi,
          colorspace,
          max_pages: maxPages,
          transparent_bg: transparentBg,
          page_range: pageRange
        },
        output: {
          error: payload.error || res.error,
          stderr: payload.error || res.error,
          duration_ms: payload.duration_ms
        },
        duration_ms: payload.duration_ms,
        triggered_by: 'PrintAgent Render'
      });
    } catch {}
    throw new Error(payload.error || 'Quá trình render trên máy gặp sự cố.');
  }

  try {
    const agentUid = lastDetectedAgentInfo?.agent_uid || 'administrator';
    const pcName = lastDetectedAgentInfo?.pc_name || 'Administrator';
    const nodeDisplayName = `${agentUid} (${pcName})`;

    agentJobService.recordJob({
      name: `Render PDF: ${file.name}`,
      category: 'PDF Prepress',
      status: 'success',
      node_id: 'node-local-pc',
      node_name: nodeDisplayName,
      node_role: 'local_agent',
      node_target: `127.0.0.1:${port}`,
      script: sanitizedScriptSummary,
      script_language: 'python',
      parameters: {
        file_name: file.name,
        file_size_bytes: file.size,
        dpi,
        colorspace,
        max_pages: maxPages,
        transparent_bg: transparentBg,
        page_range: pageRange
      },
      output: {
        stdout: `Đã kết xuất ${payload.total_pages || 1} trang ở độ phân giải ${dpi} DPI (${colorspace.toUpperCase()}).`,
        result_payload: {
          ok: true,
          total_pages: payload.total_pages || payload.pages?.length || 1,
          duration_ms: payload.duration_ms,
          file_path: payload.file_path,
          engine: 'PyMuPDF (fitz)'
        },
        duration_ms: payload.duration_ms
      },
      duration_ms: payload.duration_ms,
      triggered_by: 'PrintAgent Render'
    });
  } catch {}

  return {
    ok: true,
    total_pages: payload.total_pages || payload.pages?.length || 1,
    pages: payload.pages || [],
    filename: file.name,
    duration_ms: payload.duration_ms,
    dpi,
    colorspace,
    pdf_b64: payload.pdf_b64,
    file_path: payload.file_path,
    rendered_by: 'goagent_local'
  };
}
