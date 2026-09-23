import os
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def upload_service_files():
    hostname = "157.66.80.125"
    username = "root"
    password = r"5$j!uOj8!Opf"
    port = 22

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, port=port, username=username, password=password, timeout=15)
    sftp = client.open_sftp()

    local_dir = r"d:\Dropbox\_Documents\Toolx\python-services"
    remote_dir = "/opt/toolx-ai"

    files_to_upload = [
        "bleed_outpainter.py",
        "server.py",
        "solver.py",
        "processor.py",
        "task_manager.py",
        "image_patcher.py",
        "nesting.py",
        "pdf_tasks.py"
    ]

    for fname in files_to_upload:
        lpath = os.path.join(local_dir, fname)
        rpath = f"{remote_dir}/{fname}"
        if os.path.exists(lpath):
            print(f"Uploading {fname} ({os.path.getsize(lpath)} bytes)...")
            sftp.put(lpath, rpath)
            print(f"✓ Uploaded {fname}")
        else:
            print(f"Skipping {fname} (not found locally)")

    sftp.close()
    client.close()
    print("All python service files uploaded successfully!")

if __name__ == "__main__":
    upload_service_files()
