"""
Toolx Micro-Frontend Module Deployer
Cho phép cập nhật từng phân hệ (route) độc lập lên VPS mà KHÔNG cần build lại toàn bộ ứng dụng
và KHÔNG làm gián đoạn người dùng đang thao tác trên các phân hệ khác.

Cách sử dụng:
    python scripts/deploy_module.py render       # Deploy riêng phân hệ Render Prepress
    python scripts/deploy_module.py calc         # Deploy riêng phân hệ Tính giá (Offset/Digital)
    python scripts/deploy_module.py crm          # Deploy riêng phân hệ CRM (Khách hàng/Báo giá/Đơn hàng)
    python scripts/deploy_module.py imposition   # Deploy riêng phân hệ Bình trang & Khuôn hộp
    python scripts/deploy_module.py designer     # Deploy riêng phân hệ Label Designer
    python scripts/deploy_module.py admin        # Deploy riêng phân hệ Admin
    python scripts/deploy_module.py ai           # Deploy riêng phân hệ AI
    python scripts/deploy_module.py all          # Deploy toàn bộ các phân hệ remote
"""

import os
import sys
import time
import stat
import paramiko

VPS_HOST = '157.66.80.125'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = '5$j!uOj8!Opf'
REMOTE_BASE_DIR = '/var/www/toolxprint.com/build/modules'

LOCAL_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../build/modules'))

VALID_MODULES = ['render', 'calc', 'crm', 'imposition', 'designer', 'admin', 'ai']

def sftp_makedirs(sftp, remote_dir):
    """Tạo thư mục đệ quy trên remote VPS nếu chưa tồn tại"""
    dirs_to_create = []
    curr = remote_dir
    while curr and curr != '/':
        try:
            sftp.stat(curr)
            break
        except FileNotFoundError:
            dirs_to_create.append(curr)
            curr = os.path.dirname(curr)
    
    for d in reversed(dirs_to_create):
        try:
            sftp.mkdir(d)
        except Exception:
            pass

def deploy_single_module(sftp, module_name):
    local_dir = os.path.join(LOCAL_BASE_DIR, module_name)
    remote_dir = f"{REMOTE_BASE_DIR}/{module_name}"
    
    if not os.path.exists(local_dir):
        print(f"\033[91m✖ Thư mục local '{local_dir}' chưa tồn tại. Hãy chạy 'npm run build:{module_name}' trước!\033[0m")
        return False

    print(f"\n\033[96m🚀 Đang tải lên phân hệ '{module_name}' -> {remote_dir}...\033[0m")
    sftp_makedirs(sftp, remote_dir)
    
    files = [f for f in os.listdir(local_dir) if os.path.isfile(os.path.join(local_dir, f))]
    total_bytes = 0
    
    for idx, f in enumerate(files, 1):
        local_file = os.path.join(local_dir, f)
        remote_file = f"{remote_dir}/{f}"
        size_kb = os.path.getsize(local_file) / 1024
        total_bytes += os.path.getsize(local_file)
        
        print(f"  [{idx}/{len(files)}] {f} ({size_kb:.1f} KB)...", end='\r')
        sftp.put(local_file, remote_file)
        print(f"  [{idx}/{len(files)}] {f} ({size_kb:.1f} KB) ✔    ")
    
    print(f"\033[92m✔ Hoàn tất phân hệ '{module_name}': {len(files)} tệp ({total_bytes / 1024:.1f} KB)\033[0m")
    return True

def main():
    if len(sys.argv) < 2:
        print("\033[93mHướng dẫn: python scripts/deploy_module.py <module_name|all>\033[0m")
        print(f"Các module hỗ trợ: {', '.join(VALID_MODULES)}, all")
        sys.exit(1)
        
    target = sys.argv[1].lower()
    
    if target == 'all':
        modules = VALID_MODULES
    elif target in VALID_MODULES:
        modules = [target]
    else:
        print(f"\033[91m✖ Module '{target}' không hợp lệ. Chọn một trong: {', '.join(VALID_MODULES)}, all\033[0m")
        sys.exit(1)
        
    start_time = time.time()
    
    print(f"\033[94m🔌 Đang kết nối SSH tới {VPS_HOST}...\033[0m")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)
    sftp = ssh.open_sftp()
    
    try:
        success_count = 0
        for mod in modules:
            if deploy_single_module(sftp, mod):
                success_count += 1
                
        elapsed = time.time() - start_time
        print(f"\n\033[92m🎉 Đã deploy thành công {success_count}/{len(modules)} phân hệ trong {elapsed:.1f}s!\033[0m")
        print("\033[90mGhi chú: Khách hàng đang dùng các phân hệ khác không bị ảnh hưởng hay reload trang.\033[0m\n")
    finally:
        sftp.close()
        ssh.close()

if __name__ == '__main__':
    main()
