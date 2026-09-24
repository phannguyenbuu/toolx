import { GOAGENT_DEFAULT_PORT, GoAgentExecResult } from './types';
import { getGoAgentBaseUrl } from './probe';

/**
 * Thực thi một đoạn Python Script trực tiếp qua endpoint /api/local/exec của GoAgent
 * Chuẩn hóa phân tách 3 luồng: stdout (nhật ký), stderr (cảnh báo/lỗi), result_payload (JSON)
 */
export async function execScriptViaGoAgent(
  script: string,
  port = GOAGENT_DEFAULT_PORT
): Promise<GoAgentExecResult> {
  const baseUrl = getGoAgentBaseUrl(port);
  try {
    const res = await fetch(`${baseUrl}/api/local/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify({ script })
    });

    if (!res.ok) {
      const text = await res.text();
      const errStr = `GoAgent trả về mã HTTP ${res.status}: ${text}`;
      return {
        ok: false,
        stdout: '',
        stderr: errStr,
        error: errStr,
        output: ''
      };
    }

    const data = await res.json();
    const stdout = (data.stdout !== undefined ? data.stdout : data.output) || '';
    const stderr = (data.stderr !== undefined ? data.stderr : (data.ok ? '' : (data.error || ''))) || '';
    const output = stdout || (data.output || '');
    const error = stderr || (data.error || '');

    return {
      ok: Boolean(data.ok),
      stdout: String(stdout),
      stderr: String(stderr),
      result_payload: data.result_payload !== undefined ? data.result_payload : null,
      output: String(output),
      error: error ? String(error) : undefined
    };
  } catch (err: any) {
    const errStr = `Không thể kết nối đến GoAgent :${port}: ${err.message}`;
    return {
      ok: false,
      stdout: '',
      stderr: errStr,
      error: errStr,
      output: ''
    };
  }
}
