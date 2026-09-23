import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def setup_service():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect("157.66.80.125", port=22, username="root", password=r"5$j!uOj8!Opf", timeout=15)

    service_content = """[Unit]
Description=Toolx AI Outpainter Service (LaMa CPU)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/toolx-ai
ExecStart=/opt/toolx-ai/venv/bin/python3 server.py
Restart=always
RestartSec=3
Environment=PYTHONUNBUFFERED=1
Environment=PORT=3005

[Install]
WantedBy=multi-user.target
"""
    sftp = client.open_sftp()
    with sftp.open("/etc/systemd/system/toolx-ai.service", "w") as f:
        f.write(service_content)
    sftp.close()

    cmd = "systemctl daemon-reload && systemctl enable toolx-ai.service && systemctl restart toolx-ai.service && sleep 2 && systemctl status toolx-ai.service"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()

    print("[OUT]:\n", out)
    if err:
        print("[ERR]:\n", err)

if __name__ == "__main__":
    setup_service()
