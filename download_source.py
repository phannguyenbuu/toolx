import os
import sys
import paramiko

def download_source_files():
    hostname = "157.66.80.125"
    username = "root"
    password = r"5$j!uOj8!Opf"
    port = 22
    
    remote_base = "/root/toolxprint"
    local_base = os.path.dirname(os.path.abspath(__file__))
    
    # Extensions we want to download
    allowed_extensions = {'.py', '.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.sh', '.yml', '.yaml', '.sql', '.md', '.patch'}
    
    # Subdirectories we want to skip entirely
    skip_dirs = {
        'node_modules', 'venv', '.git', '.cache', '__pycache__', 
        'uploads', 'output', 'source_files', 'build', 'assets'
    }

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("Connecting to VPS via SSH...")
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        sftp = client.open_sftp()
        
        print("Walking remote directory...")
        
        def walk_and_download(remote_dir, local_dir):
            if not os.path.exists(local_dir):
                os.makedirs(local_dir)
                
            try:
                for entry in sftp.listdir_attr(remote_dir):
                    name = entry.filename
                    if name in skip_dirs:
                        continue
                        
                    remote_path = f"{remote_dir}/{name}"
                    local_path = os.path.join(local_dir, name)
                    
                    # Check if it is a directory
                    import stat
                    if stat.S_ISDIR(entry.st_mode):
                        walk_and_download(remote_path, local_path)
                    else:
                        # Check file extension
                        _, ext = os.path.splitext(name)
                        if ext.lower() in allowed_extensions or name in {'.env', '.env.example', 'Dockerfile', 'package.json', 'tsconfig.json'}:
                            print(f"Downloading: {remote_path} -> {local_path}")
                            sftp.get(remote_path, local_path)
            except Exception as e:
                print(f"Error reading directory {remote_dir}: {e}")

        walk_and_download(remote_base, local_base)
        print("Download completed successfully!")
        
    except Exception as e:
        print(f"SSH/SFTP Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    download_source_files()
