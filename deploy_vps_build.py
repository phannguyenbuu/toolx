import os
import sys
import zipfile
import paramiko
import time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def zip_directory(folder_path, output_zip):
    print(f"📦 Đang nén thư mục {folder_path}...")
    start = time.time()
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
    size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"✓ Đã tạo {output_zip} ({size_mb:.2f} MB) trong {time.time() - start:.1f}s")

def deploy_to_vps():
    build_dir = r"d:\Dropbox\_Documents\Toolx\build"
    zip_path = r"d:\Dropbox\_Documents\Toolx\build_deploy.zip"
    
    if not os.path.exists(build_dir):
        print(f"❌ Không tìm thấy thư mục build tại {build_dir}")
        sys.exit(1)
        
    zip_directory(build_dir, zip_path)
    
    hostname = "157.66.80.125"
    username = "root"
    password = r"5$j!uOj8!Opf"
    port = 22
    
    print(f"🔌 Đang kết nối SSH đến {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print("✓ Kết nối SSH thành công!")
        
        # Upload via SFTP
        print("⬆️ Đang tải tệp build_deploy.zip lên VPS...")
        sftp = client.open_sftp()
        remote_zip = "/var/www/toolxprint.com/build_deploy.zip"
        
        def progress_callback(transferred, total):
            pct = (transferred / total) * 100
            sys.stdout.write(f"\r  Tiến độ: {pct:.1f}% ({transferred / (1024*1024):.1f}/{total / (1024*1024):.1f} MB)")
            sys.stdout.flush()
            
        sftp.put(zip_path, remote_zip, callback=progress_callback)
        sftp.close()
        print("\n✓ Tải lên hoàn tất!")
        
        # Execute unpack on remote
        print("🚀 Đang giải nén và cập nhật /var/www/toolxprint.com/build...")
        cmd = """
        set -e
        cd /var/www/toolxprint.com
        rm -rf build_new
        mkdir -p build_new
        unzip -q -o build_deploy.zip -d build_new
        rm -rf build_backup
        if [ -d build ]; then
            mv build build_backup
        fi
        mv build_new build
        rm -f build_deploy.zip
        chmod -R 755 build
        systemctl reload nginx
        echo "DEPLOY_SUCCESS"
        """
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        
        if "DEPLOY_SUCCESS" in out:
            print("🎉 TRIỂN KHAI THÀNH CÔNG LÊN https://admin.toolxprint.com/!")
        else:
            print("--- STDOUT ---", out)
            print("--- STDERR ---", err)
            
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        client.close()
        if os.path.exists(zip_path):
            try:
                os.remove(zip_path)
            except:
                pass

if __name__ == "__main__":
    deploy_to_vps()
