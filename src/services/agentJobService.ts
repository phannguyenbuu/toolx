/**
 * Agent Job Service for ToolxPrint (admin.toolxprint.com/job)
 * 
 * Quản lý nhật ký Jobs thực thi trên cụm Agent (GoAgent PC, Trạm Render Server, Sandbox)
 * Mô hình tương đồng agentapi.quanlymay.com:
 * - Lưu vết đầy đủ: script, parameter, output (stdout/stderr/payload), thời gian, node thực thi.
 * - Hỗ trợ lọc, tìm kiếm, xem chi tiết, chạy lại (rerun), xuất JSON.
 */

export interface AgentJobParameter {
  [key: string]: any;
}

export interface AgentJobOutput {
  stdout?: string;
  stderr?: string;
  result_payload?: any;
  duration_ms?: number;
  error?: string;
  cloud_url?: string;
  local_path?: string;
  preview_b64?: string;
}

export interface AgentJobItem {
  id: string;
  name: string;
  category?: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  node_id: string;
  node_name: string;
  node_role?: 'render_server' | 'local_agent' | 'browser';
  node_target?: string; // vd: 127.0.0.1:9173
  script: string;
  script_language?: 'python' | 'shell' | 'javascript' | 'json';
  parameters: AgentJobParameter;
  output: AgentJobOutput;
  created_at: string;
  completed_at?: string;
  duration_ms?: number;
  triggered_by?: string; // vd: 'UtiCommand Runner', 'PrintAgent Render PDF', 'Manual Test'
}

const STORAGE_KEY = 'toolx_agent_jobs_history_v1';
const MAX_JOBS = 100;

// Các Jobs mẫu ban đầu để giao diện có dữ liệu đối chiếu ngay khi mở tab /job
const SEED_JOBS: AgentJobItem[] = [
  {
    id: 'job_gcr22_cmyk_render',
    name: 'Render PDF: DeXuatDA (CMYK + GCR 22% SWOP v2)',
    category: 'Prepress Render',
    status: 'success',
    node_id: 'node-local-pc',
    node_name: 'PrintAgent (Local)',
    node_role: 'local_agent',
    node_target: '127.0.0.1:9173',
    script_language: 'python',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 12 + 850).toISOString(),
    duration_ms: 850,
    triggered_by: 'PrintAgent Render Prepress',
    parameters: {
      file_name: 'DeXuatDA_GuiInTruoc.pdf',
      dpi: 300,
      colorspace: 'cmyk',
      icc_profile: 'U.S. Web Coated (SWOP) v2.icc',
      gcr_level: 0.22,
      gcr_percent: '22%',
      black_point_compensation: true,
      overprint_simulation: true,
      no_tiling: true,
      page_range: 'all',
      output_format: 'tiff'
    },
    script: `# PyMuPDF Worker Exec Script - CMYK GCR 22% Prepress
import fitz, base64, json, sys, os

doc = fitz.open(in_path)
total_pages = len(doc)
pages = []

for idx in range(total_pages):
    page = doc[idx]
    zoom = 300.0 / 72.0
    mat = fitz.Matrix(zoom, zoom)
    
    # Render trang ở không gian màu CMYK
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csCMYK, alpha=False)
    
    # Đóng gói kết quả xem trước sang RGB PNG
    preview_pix = fitz.Pixmap(fitz.csRGB, pix)
    img_bytes = preview_pix.tobytes("png")
    b64 = base64.b64encode(img_bytes).decode("ascii")
    
    pages.append({
        "page_number": idx + 1,
        "width_px": pix.width,
        "height_px": pix.height,
        "dpi": 300,
        "preview_b64": "data:image/png;base64," + b64[:60] + "..."
    })

print("__GOAGENT_RESULT__" + json.dumps({
    "ok": True,
    "total_pages": total_pages,
    "pages": pages,
    "colorspace": "CMYK",
    "icc": "U.S. Web Coated (SWOP) v2",
    "gcr_level": 0.22,
    "engine": "PyMuPDF (fitz)"
}))`,
    output: {
      duration_ms: 850,
      stdout: `[INFO] Nạp file PDF: DeXuatDA_GuiInTruoc.pdf (3 trang)
[INFO] Render trang 1: 2480x3508 CMYK (zoom 4.1667x)
[INFO] Áp dụng Light GCR 22%: K_target = 0.22 * K_max (Khử bết đen)
[INFO] Render trang 2: 2480x3508 CMYK
[INFO] Render trang 3: 2480x3508 CMYK
[SUCCESS] Đã kết xuất 3 trang CMYK 300 DPI qua GoAgent cục bộ trong 0.85s`,
      stderr: '',
      result_payload: {
        ok: true,
        total_pages: 3,
        colorspace: 'CMYK',
        icc: 'U.S. Web Coated (SWOP) v2',
        gcr_level: 0.22,
        tac_limit: '300%',
        output_format: 'TIFF (LZW)',
        engine: 'PyMuPDF (fitz)'
      }
    }
  },
  {
    id: 'job_probe_agent_health',
    name: 'Probe Health: Kiểm tra ToolxAgent',
    category: 'System Health',
    status: 'success',
    node_id: 'node-local-pc',
    node_name: 'ToolxAgent',
    node_role: 'local_agent',
    node_target: '127.0.0.1:9173',
    script_language: 'python',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 35 + 45).toISOString(),
    duration_ms: 45,
    triggered_by: 'UtiCommand Runner',
    parameters: {
      target_ip: '127.0.0.1',
      target_port: 9173
    },
    script: `# Probe Agent Check
import os, sys, json, platform
info = {
    "hostname": platform.node(),
    "python": sys.version.split()[0],
    "platform": platform.platform(),
    "cwd": os.getcwd(),
    "status": "online"
}

print("__GOAGENT_RESULT__" + json.dumps(info))`,
    output: {
      duration_ms: 45,
      stdout: `[PROBE] ToolxAgent online\nWindows 11 AMD64 - Python 3.14.3`,
      stderr: '',
      result_payload: {
        status: 'online',
        port: 9173,
        platform: 'Windows-11-AMD64',
        python: '3.14.3'
      }
    }
  }
];

class AgentJobService {
  private jobs: AgentJobItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.jobs = parsed;
          return;
        }
      }
      this.jobs = [...SEED_JOBS];
      this.saveToStorage();
    } catch (e) {
      console.warn('Lỗi đọc danh sách Jobs từ storage:', e);
      this.jobs = [...SEED_JOBS];
    }
  }

  private sanitizeJobForStorage(job: AgentJobItem): AgentJobItem {
    let script = job.script || '';
    if (script.length > 3000) {
      // Cắt bớt phần dữ liệu base64 hoặc script quá dài để không làm tràn localStorage
      script = script.substring(0, 2000) + '\n# ... [Script payload dài đã được rút gọn để lưu trữ an toàn] ...';
    }

    let output = { ...job.output };
    if (output.preview_b64 && output.preview_b64.length > 40000) {
      output = { ...output, preview_b64: undefined };
    }
    if (output.result_payload && typeof output.result_payload === 'object') {
      const p = { ...output.result_payload };
      if (p.pdf_b64) delete p.pdf_b64;
      if (Array.isArray(p.pages)) {
        p.pages = p.pages.map((page: any) => {
          if (!page || typeof page !== 'object') return page;
          const { preview_b64, ...rest } = page;
          return rest;
        });
      }
      output.result_payload = p;
    }

    return {
      ...job,
      script,
      output
    };
  }

  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      const sanitized = this.jobs.slice(0, MAX_JOBS).map((j) => this.sanitizeJobForStorage(j));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch (quotaErr) {
        console.warn('QuotaExceeded khi lưu jobs, tự động dọn bớt jobs cũ...');
        for (const limit of [30, 15, 8, 3]) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized.slice(0, limit)));
            break;
          } catch {}
        }
      }
      window.dispatchEvent(new CustomEvent('toolx_jobs_updated', { detail: this.jobs }));
    } catch (e) {
      console.warn('Lỗi lưu danh sách Jobs:', e);
    }
  }

  public getAll(): AgentJobItem[] {
    return [...this.jobs];
  }

  public getById(id: string): AgentJobItem | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  public recordJob(job: Omit<AgentJobItem, 'id' | 'created_at'> & { id?: string; created_at?: string }): AgentJobItem {
    const newJob: AgentJobItem = {
      id: job.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: job.created_at || new Date().toISOString(),
      ...job
    };

    // Đẩy job mới lên đầu danh sách
    this.jobs = [newJob, ...this.jobs.filter((j) => j.id !== newJob.id)].slice(0, MAX_JOBS);
    this.saveToStorage();
    return newJob;
  }

  public updateJob(id: string, updates: Partial<AgentJobItem>): AgentJobItem | undefined {
    const idx = this.jobs.findIndex((j) => j.id === id);
    if (idx === -1) return undefined;
    this.jobs[idx] = {
      ...this.jobs[idx],
      ...updates
    };
    this.saveToStorage();
    return this.jobs[idx];
  }

  public deleteJob(id: string): boolean {
    const initialLen = this.jobs.length;
    this.jobs = this.jobs.filter((j) => j.id !== id);
    if (this.jobs.length !== initialLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public clearAll(): void {
    this.jobs = [];
    this.saveToStorage();
  }

  public resetToSeeds(): void {
    this.jobs = [...SEED_JOBS];
    this.saveToStorage();
  }
}

export const agentJobService = new AgentJobService();
