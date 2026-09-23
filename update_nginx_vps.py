import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def update_nginx():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect("157.66.80.125", port=22, username="root", password=r"5$j!uOj8!Opf", timeout=15)
    sftp = client.open_sftp()

    target_files = [
        "/etc/nginx/sites-available/admin.toolxprint.com.conf",
        "/etc/nginx/sites-available/toolxprint.com.conf"
    ]

    ai_block = """    # Route Python AI and calculation requests to port 3005
    location ~* ^/api/(outpaint|outpaint-bleed|python-health|generate-pdf|generate-pdf-async|task|calculate) {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
"""

    for file_path in target_files:
        with sftp.open(file_path, "r") as f:
            content = f.read().decode('utf-8')

        if "3005" in content:
            print(f"Skipping {file_path} (already has 3005 proxy)")
            continue

        # Insert before `location /api/ {`
        if "location /api/ {" in content:
            new_content = content.replace("location /api/ {", ai_block + "\n    location /api/ {")
            with sftp.open(file_path, "w") as f:
                f.write(new_content.encode('utf-8'))
            print(f"✓ Updated {file_path}")
        else:
            print(f"Warning: 'location /api/ {{' not found in {file_path}")

    sftp.close()

    # Test nginx syntax and reload
    cmd = "nginx -t && systemctl reload nginx"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()

    print("[NGINX TEST & RELOAD]:")
    if out:
        print(out)
    if err:
        print(err)

if __name__ == "__main__":
    update_nginx()
