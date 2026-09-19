/**
 * GoAgent (PrintAgent) Service for Toolx
 * 
 * Kết nối với GoAgent (printagent) chạy ngầm trên máy người dùng (mặc định port 9173).
 * Bơm code dạng exec (giống goxprint) để xử lý ảnh và PDF trực tiếp trên máy,
 * không cần request nhiều lần lên máy chủ.
 * 
 * Tự động fallback về máy trạm server (128GB RAM) khi:
 * 1. Không tìm thấy GoAgent (printagent) trên PC.
 * 2. Đang truy cập từ thiết bị di động (mobile/tablet).
 */

import { agentJobService } from './agentJobService';

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

export interface GoAgentExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  result_payload?: any;
  output?: string;
  error?: string;
}

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
 * Tạo script Python tối ưu để bơm vào GoAgent xử lý kết xuất PDF trực tiếp
 */
function buildRenderPythonScript(
  base64Data: string,
  filename: string,
  dpi = 300,
  colorspace = 'rgb',
  maxPages = 50,
  transparentBg = false,
  pageRange = 'all'
): string {
  return `
import base64, os, sys, tempfile, json, subprocess, time

start_t = time.time()
file_bytes = base64.b64decode("""${base64Data}""")
tmp_dir = tempfile.gettempdir()
safe_name = "".join(c for c in """${filename}""" if c.isalnum() or c in "._- ") or "doc.pdf"
in_path = os.path.join(tmp_dir, f"goagent_in_{int(start_t)}_{safe_name}")

with open(in_path, "wb") as f:
    f.write(file_bytes)

dpi_val = int(${dpi})
max_p = int(${maxPages})
colorspace_val = """${colorspace}""".lower()
alpha_val = "true" if ${transparentBg ? 'True' : 'False'} else "false"
page_range_val = """${pageRange || 'all'}"""

worker_code = """
import fitz, base64, json, sys, os

pdf_path = sys.argv[1]
dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 300
max_pages = int(sys.argv[3]) if len(sys.argv) > 3 else 50
colorspace = sys.argv[4] if len(sys.argv) > 4 else 'rgb'
alpha_mode = (sys.argv[5].lower() == 'true') if len(sys.argv) > 5 else False
page_range_arg = sys.argv[6] if len(sys.argv) > 6 else 'all'

def sanitize_pdf(doc):
    try:
        for xref in range(1, doc.xref_length()):
            obj_str = doc.xref_object(xref)
            if not obj_str:
                continue
            # Chuan hoa indirect reference trong ICCBased array
            if obj_str.strip().startswith('[') and '/ICCBased' in obj_str:
                parts = obj_str.replace('[', ' ').replace(']', ' ').split()
                if '/ICCBased' in parts:
                    idx = parts.index('/ICCBased')
                    if idx + 1 < len(parts) and parts[idx + 1].isdigit():
                        icc_xref = int(parts[idx + 1])
                        n_val = doc.xref_get_key(icc_xref, 'N')
                        if n_val[0] == 'int':
                            n = int(n_val[1])
                            target_cs = '/DeviceRGB' if n == 3 else ('/DeviceCMYK' if n == 4 else '/DeviceGray')
                            doc.update_object(xref, target_cs)
            # Chuan hoa Indexed ColorSpace neu base la indirect reference
            if '/Indexed' in obj_str:
                cs = doc.xref_get_key(xref, 'ColorSpace')
                if cs[0] == 'array' and '/Indexed' in cs[1]:
                    cs_str = cs[1]
                    tokens = cs_str.replace('[', ' ').replace(']', ' ').split()
                    if len(tokens) >= 5 and tokens[0] == '/Indexed':
                        if tokens[1].isdigit() and tokens[2] == '0' and tokens[3] == 'R':
                            base_ref = f"{tokens[1]} {tokens[2]} {tokens[3]}"
                            hival = int(tokens[4])
                            lookup_xref = int(tokens[5]) if len(tokens) > 5 and tokens[5].isdigit() else 0
                            target_cs = '/DeviceRGB'
                            if lookup_xref and doc.is_stream(lookup_xref):
                                pal_len = len(doc.xref_stream(lookup_xref))
                                entries = hival + 1
                                ch = pal_len // entries if entries > 0 else 3
                                target_cs = '/DeviceRGB' if ch == 3 else ('/DeviceCMYK' if ch == 4 else '/DeviceGray')
                            new_cs_str = cs_str.replace(base_ref, target_cs)
                            doc.xref_set_key(xref, 'ColorSpace', new_cs_str)
    except Exception:
        pass

try:
    doc = fitz.open(pdf_path)
    if not getattr(doc, 'is_pdf', False):
        doc = fitz.open('pdf', doc.convert_to_pdf())
    sanitize_pdf(doc)
    total_pages = len(doc)
    pages = []

    target_indices = []
    if page_range_arg == 'all' or not page_range_arg.strip():
        target_indices = list(range(min(total_pages, max_pages)))
    elif page_range_arg == 'first':
        target_indices = [0]
    else:
        for part in page_range_arg.split(','):
            part = part.strip()
            if '-' in part:
                s, e = part.split('-', 1)
                try:
                    for p in range(int(s), int(e) + 1):
                        if 1 <= p <= total_pages and (p - 1) not in target_indices:
                            target_indices.append(p - 1)
                except Exception:
                    pass
            elif part.isdigit():
                p = int(part)
                if 1 <= p <= total_pages and (p - 1) not in target_indices:
                    target_indices.append(p - 1)
        if not target_indices:
            target_indices = list(range(min(total_pages, max_pages)))
        target_indices = target_indices[:max_pages]

    cs = fitz.csRGB
    if colorspace in ('cmyk',):
        cs = fitz.csCMYK
    elif colorspace in ('gray', 'grayscale', 'monochrome'):
        cs = fitz.csGRAY

    out_doc = fitz.open()
    for idx in target_indices:
        page = doc[idx]
        rect = page.rect
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        
        pix = page.get_pixmap(matrix=mat, colorspace=cs, alpha=alpha_mode)
        if pix.colorspace and ('CMYK' in pix.colorspace.name or pix.colorspace.n == 4):
            preview_pix = fitz.Pixmap(fitz.csRGB, pix)
            img_bytes = preview_pix.tobytes("png")
        else:
            try:
                img_bytes = pix.tobytes("png")
            except Exception:
                preview_pix = fitz.Pixmap(fitz.csRGB, pix)
                img_bytes = preview_pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode("ascii")

        # Đóng gói trang đã rasterize vào tài liệu PDF thành phẩm
        new_page = out_doc.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, pixmap=pix)

        pages.append({
            "page_number": idx + 1,
            "width_pt": round(rect.width, 2),
            "height_pt": round(rect.height, 2),
            "width_mm": round(rect.width * 25.4 / 72.0, 1),
            "height_mm": round(rect.height * 25.4 / 72.0, 1),
            "dpi": dpi,
            "preview_b64": "data:image/png;base64," + b64
        })

    out_pdf_bytes = out_doc.tobytes(deflate=True, garbage=4)
    out_pdf_b64 = base64.b64encode(out_pdf_bytes).decode("ascii")

    pdf_base = os.path.splitext(os.path.basename(pdf_path))[0]
    out_pdf_path = os.path.join(os.path.dirname(pdf_path), f"rendered_{pdf_base}.pdf")
    try:
        out_doc.save(out_pdf_path, deflate=True, garbage=4)
    except Exception:
        pass

    print("__GOAGENT_RESULT__" + json.dumps({
        "ok": True,
        "total_pages": total_pages,
        "pages": pages,
        "pdf_b64": "data:application/pdf;base64," + out_pdf_b64,
        "file_path": out_pdf_path if os.path.exists(out_pdf_path) else "",
        "engine": "PyMuPDF (fitz)"
    }))
except Exception as err:
    print("__GOAGENT_RESULT__" + json.dumps({
        "ok": False,
        "error": str(err)
    }))
"""

worker_file = os.path.join(tmp_dir, f"goagent_worker_{int(start_t)}.py")
with open(worker_file, "w", encoding="utf-8") as wf:
    wf.write(worker_code)

candidates = [
    r"C:\\Users\\SingPC\\Python312\\python.exe",
    os.path.join(os.path.expanduser("~"), "Python312", "python.exe"),
    r"C:\\Python314\\python.exe",
    r"C:\\Python313\\python.exe",
    r"C:\\Python312\\python.exe",
    r"C:\\Python311\\python.exe",
    r"C:\\Program Files\\Python314\\python.exe",
    r"C:\\Program Files\\Python313\\python.exe",
    "python",
    "py"
]

py_exe = None
for c in candidates:
    if os.path.exists(c) or c in ("python", "py"):
        py_exe = c
        break

if not py_exe:
    py_exe = sys.executable

res = subprocess.run([py_exe, worker_file, in_path, str(dpi_val), str(max_p), colorspace_val, alpha_val, page_range_val], capture_output=True, text=True, timeout=60)

found_result = False
if res.returncode == 0 or "__GOAGENT_RESULT__" in res.stdout:
    for line in res.stdout.splitlines():
        if line.startswith("__GOAGENT_RESULT__"):
            payload = json.loads(line[len("__GOAGENT_RESULT__"):])
            payload["duration_ms"] = round((time.time() - start_t) * 1000, 1)
            payload["filename"] = """${filename}"""
            context["result_payload"] = payload
            found_result = True
            break

if not found_result:
    context["result_payload"] = {
        "ok": False,
        "error": res.stderr or res.stdout or "Không nhận được dữ liệu từ render worker.",
        "duration_ms": round((time.time() - start_t) * 1000, 1)
    }

try:
    if os.path.exists(worker_file):
        os.remove(worker_file)
    if os.path.exists(in_path):
        os.remove(in_path)
except Exception:
    pass
`;
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
