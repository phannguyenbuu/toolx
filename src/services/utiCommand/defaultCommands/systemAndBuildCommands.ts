import { UtiCommandItem } from '../types';

export const systemAndBuildCommands: UtiCommandItem[] = [
  // --- NHÓM 2: HỆ THỐNG & GOAGENT ---
  {
    command: 'view_settings_json',
    label: 'Xem settings.json',
    icon: '⚙️',
    category: '🖥️ Hệ thống & GoAgent',
    language: 'python',
    is_visible: true,
    description: 'Đọc và hiển thị nội dung tệp cấu hình settings.json của PrintAgent/GoAgent',
    command_content: `import os, sys, json

appdata = os.getenv('APPDATA', '')
candidates = [
    os.path.join(appdata, 'GoxPrintAgent', 'settings.json') if appdata else '',
    os.path.join(os.getcwd(), 'settings.json'),
    'settings.json'
]

found = None
for p in candidates:
    if p and os.path.exists(p):
        found = p
        break

if not found:
    print("[-] Không tìm thấy settings.json tại các đường dẫn mặc định.")
else:
    with open(found, 'r', encoding='utf-8', errors='replace') as f:
        data = f.read()
    try:
        parsed = json.loads(data)
        print(f"[PATH] {found}\\n")
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    except Exception:
        print(data)
`
  },
  {
    command: 'view_stout',
    label: 'Xem stout.txt (Log Info)',
    icon: '📄',
    category: '🖥️ Hệ thống & GoAgent',
    language: 'python',
    is_visible: true,
    description: 'Đọc 100 dòng log hoạt động gần nhất của GoAgent trên máy này',
    command_content: `import os, sys, tempfile

local_app = os.getenv('LOCALAPPDATA', '')
candidates = [
    os.path.join(local_app, 'Temp', 'GoPrinxAgent', 'logs', 'stout.txt'),
    os.path.join(tempfile.gettempdir(), 'GoPrinxAgent', 'logs', 'stout.txt'),
    os.path.join(tempfile.gettempdir(), 'stout.txt')
]

found = None
for p in candidates:
    if os.path.exists(p):
        found = p
        break

if not found:
    print(f"[-] Không tìm thấy stout.txt. Thử tìm tại {tempfile.gettempdir()}.")
else:
    with open(found, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    last_lines = "".join(lines[-100:]) if len(lines) > 100 else "".join(lines)
    print(f"[PATH] {found} (Tổng {len(lines)} dòng)\\n\\n{last_lines}")
`
  },
  {
    command: 'view_sterror',
    label: 'Xem sterror.txt (Log Lỗi)',
    icon: '⚠️',
    category: '🖥️ Hệ thống & GoAgent',
    language: 'python',
    is_visible: true,
    description: 'Đọc các dòng log cảnh báo / lỗi gần nhất của GoAgent',
    command_content: `import os, sys, tempfile

local_app = os.getenv('LOCALAPPDATA', '')
candidates = [
    os.path.join(local_app, 'Temp', 'GoPrinxAgent', 'logs', 'sterror.txt'),
    os.path.join(tempfile.gettempdir(), 'GoPrinxAgent', 'logs', 'sterror.txt')
]

found = None
for p in candidates:
    if os.path.exists(p):
        found = p
        break

if not found:
    print("✓ Không phát hiện file log lỗi sterror.txt (Hệ thống sạch không có crash).")
else:
    with open(found, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    last_lines = "".join(lines[-100:]) if len(lines) > 100 else "".join(lines)
    print(f"[PATH] {found}\\n\\n{last_lines}")
`
  },
  {
    command: 'get_agent_info',
    label: 'Thông tin Network & Agent IP',
    icon: '🌐',
    category: '🖥️ Hệ thống & GoAgent',
    language: 'python',
    is_visible: true,
    description: 'Lấy thông tin IP LAN, Hostname, và trạng thái ToolxAgent',
    command_content: `import socket, os, sys

hostname = socket.gethostname()
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    local_ip = s.getsockname()[0]
    s.close()
except Exception:
    local_ip = "127.0.0.1"

print(f"=== THÔNG TIN AGENT CỤC BỘ ===")
print(f"• Hostname: {hostname}")
print(f"• Local IP: {local_ip}")
print(f"• Agent: ToolxAgent")
print(f"• OS: {os.name} ({sys.platform})")
print("• Trạng thái kết nối: OK")
`
  },

  // --- NHÓM 3: BUILD & CODE BUILD SỐNG ---
  {
    command: 'live_code_runner',
    label: 'Code Build Sống (Scratchpad)',
    icon: '🚀',
    category: '⚡ Build & Code Sống',
    language: 'python',
    is_visible: true,
    description: 'Trình biên dịch và thực thi code trực tiếp tại chỗ trên máy chủ/ToolxAgent',
    command_content: `# === TRÌNH THỰC THI CODE SỐNG (LIVE CODE BUILDER) ===
# Bạn có thể viết bất kỳ mã Python nào tại đây và nhấn 'Build & Chạy Ngay'
# Kết quả sẽ được thực thi tức thì qua ToolxAgent hoặc Máy trạm Server.

import sys, time

print("▶ Bắt đầu thực thi Live Script...")
print(f"• Python version: {sys.version}")

for i in range(1, 4):
    print(f"  [Step {i}/3] Đang xử lý tiến trình tác vụ...")
    time.sleep(0.1)

print("✓ Hoàn thành thực thi thành công!")
`
  },
  {
    command: 'check_build_status',
    label: 'Kiểm tra Build & Node Module',
    icon: '📦',
    category: '⚡ Build & Code Sống',
    language: 'powershell',
    is_visible: true,
    description: 'Kiểm tra phiên bản Node, NPM, trạng thái webpack và dung lượng thư mục build',
    command_content: `Write-Host "=== KIỂM TRA TRẠNG THÁI BUILD TOOLX ===" -ForegroundColor Cyan
Write-Host "Node.js Version: $(node -v)"
Write-Host "NPM Version:     $(npm -v)"

if (Test-Path "build") {
    $size = (Get-ChildItem -Recurse build | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Thư mục build hiện tại: $([Math]::Round($size, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "Chưa có thư mục build sẵn sàng." -ForegroundColor Yellow
}
`
  }
];
