import sys
import paramiko

def run_ssh_command(cmd):
    hostname = "157.66.80.125"
    username = "root"
    password = r"5$j!uOj8!Opf"
    port = 22

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    try:
        client.connect(hostname, port=port, username=username, password=password, timeout=10)
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        
        if out:
            print("--- STDOUT ---")
            print(out)
        if err:
            print("--- STDERR ---")
            print(err)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vps_ssh.py <command>")
        sys.exit(1)
    
    command = " ".join(sys.argv[1:])
    run_ssh_command(command)
