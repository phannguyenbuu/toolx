import { GOAGENT_DEFAULT_PORT, GoAgentInfo } from './types';

/**
 * Kiểm tra xem trình duyệt hiện tại có phải thiết bị di động hay không
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
}

/**
 * Lấy Base URL của GoAgent trên localhost
 */
export function getGoAgentBaseUrl(port = GOAGENT_DEFAULT_PORT): string {
  return `http://127.0.0.1:${port}`;
}

export let lastDetectedAgentInfo: GoAgentInfo | null = null;

export function setLastDetectedAgentInfo(info: GoAgentInfo | null) {
  lastDetectedAgentInfo = info;
}

/**
 * Probe kiểm tra xem GoAgent (printagent) có đang chạy trên máy không
 */
export async function probeGoAgent(port = GOAGENT_DEFAULT_PORT, timeoutMs = 600): Promise<GoAgentInfo> {
  if (isMobileDevice()) {
    return { detected: false, port, url: getGoAgentBaseUrl(port) };
  }

  const url = `http://127.0.0.1:${port}/api/ui/config`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.agent_uid || data.lan_uid || data.env)) {
        const info: GoAgentInfo = {
          detected: true,
          agent_uid: data.agent_uid || 'administrator',
          lan_uid: data.lan_uid,
          pc_name: data.pc_name || 'Administrator',
          pc_ip: data.pc_ip || '127.0.0.1',
          port,
          url: url.replace('/api/ui/config', '')
        };
        lastDetectedAgentInfo = info;
        return info;
      }
    }
  } catch {
    // Bỏ qua lỗi kết nối đến cổng này
  }

  return { detected: false, port, url: getGoAgentBaseUrl(port) };
}
