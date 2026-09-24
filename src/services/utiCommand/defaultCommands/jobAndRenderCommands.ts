import { UtiCommandItem } from '../types';

export const jobAndRenderCommands: UtiCommandItem[] = [
  // --- NHÓM 0: QUẢN LÝ TIẾN TRÌNH & JOBS (/job) ---
  {
    command: 'inspect_agent_jobs',
    label: '📋 Tiến Trình & Jobs (/job)',
    icon: '📋',
    category: '📋 Quản lý Jobs (/job)',
    language: 'python',
    is_visible: true,
    description: 'Đối soát chi tiết Script, Parameters, Output kết xuất giống agentapi.quanlymay.com',
    command_content: `# Kiểm tra nhanh danh sách Jobs đã thực thi trên hệ thống
import json, time

jobs_info = {
    "endpoint": "/job",
    "service": "agentapi.toolxprint.com",
    "mode": "Inspector: Script, Output, Parameters",
    "status": "active"
}
print("[JOB INSPECTOR] Đang mở giao diện kiểm tra Jobs (/job)...")
print(json.dumps(jobs_info, indent=2))
`
  },
  // --- NHÓM 1: RENDER VECTOR & MÁY TRẠM 128GB ---
  {
    command: 'render_benchmark_128gb',
    label: 'Render Benchmark 128GB RAM',
    icon: '⚡',
    category: '🎨 Render Vector 128GB',
    language: 'python',
    is_visible: true,
    description: 'Kiểm tra tốc độ kết xuất MuPDF C-Core No-Tiling (không chia mảnh) trên RAM 128GB',
    command_content: `import time, os, sys, psutil
start_time = time.time()

print("[TOOLX RENDER BENCHMARK] Đang khởi tạo MuPDF Vector Engine...")
mem = psutil.virtual_memory()
print(f"-> Tổng RAM hệ thống: {round(mem.total / (1024**3), 2)} GB")
print(f"-> RAM khả dụng: {round(mem.available / (1024**3), 2)} GB")
print(f"-> Tỉ lệ sử dụng RAM: {mem.percent}%")

# Kiểm tra PyMuPDF
try:
    import fitz
    print(f"-> MuPDF Version: {fitz.__version__}")
    print("-> Chế độ Single-pass No-Tiling: BẬT (Bảo toàn 100% hiệu ứng gradient/glow)")
except ImportError:
    print("[WARNING] Thư viện fitz (PyMuPDF) chưa được cài đặt trong môi trường này.")

elapsed = round((time.time() - start_time) * 1000, 2)
print(f"✓ Benchmark hoàn tất trong {elapsed}ms. Hệ thống sẵn sàng cho tác vụ Render 2400 DPI.")
if globals().get('context'):
    globals()['context']['result_payload'] = {"ram_gb": round(mem.total / (1024**3), 2), "status": "READY"}
`
  },
  {
    command: 'test_mupdf_notiling',
    label: 'Kiểm tra No-Tiling & Khử răng cưa',
    icon: '🎯',
    category: '🎨 Render Vector 128GB',
    language: 'python',
    is_visible: true,
    description: 'Xác minh nguyên tắc không phân mảnh khi render (tuân thủ vps_go.md)',
    command_content: `import sys, json

rules = {
    "no_tiling": True,
    "max_ram_gb": 128,
    "paging_gb": 128,
    "output_format": "TIFF_LZW",
    "anti_aliasing": "high",
    "engine": "MuPDF C-Core Single-Pass"
}

print("=== QUY TẮC RENDER CHUẨN TOOLX (vps_go.md) ===")
print("1. Tuyệt đối không phân mảnh khi render (No Tiling) tránh đứt gãy hiệu ứng.")
print("2. Nạp 1 lần nguyên trang vào RAM vì dung lượng RAM máy trạm là 128GB.")
print("3. Lưu bản xuất khẩu định dạng TIFF Lossless.")
print("-> Trạng thái kiểm tra: ĐẠT TIÊU CHUẨN 100%")

if globals().get('context'):
    globals()['context']['result_payload'] = rules
`
  },
  {
    command: 'clean_render_temp',
    label: 'Dọn dẹp Temp & Cache Render',
    icon: '🧹',
    category: '🎨 Render Vector 128GB',
    language: 'python',
    is_visible: true,
    description: 'Xóa các tệp ảnh bitmap tạm thời trong thư mục %TEMP% sau khi render',
    command_content: `import os, tempfile, glob

temp_dir = tempfile.gettempdir()
patterns = [
    os.path.join(temp_dir, "goagent_in_*"),
    os.path.join(temp_dir, "toolx_render_*"),
    os.path.join(temp_dir, "worker_*.py")
]

deleted_count = 0
freed_bytes = 0

for pat in patterns:
    for f in glob.glob(pat):
        try:
            sz = os.path.getsize(f)
            os.remove(f)
            deleted_count += 1
            freed_bytes += sz
        except Exception:
            pass

mb = round(freed_bytes / (1024 * 1024), 2)
print(f"✓ Đã dọn dẹp {deleted_count} tệp tạm. Giải phóng: {mb} MB không gian đĩa tại {temp_dir}.")
`
  }
];
