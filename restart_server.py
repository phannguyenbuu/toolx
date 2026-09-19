#!/usr/bin/env python3
import os
import signal
import subprocess
import sys
import time

def kill_python_servers():
    """Kill all python server.py processes"""
    try:
        # Find processes
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        
        pids_to_kill = []
        for line in lines:
            if 'python' in line and 'server.py' in line and 'grep' not in line:
                parts = line.split()
                if len(parts) > 1:
                    pid = parts[1]
                    pids_to_kill.append(pid)
        
        # Kill processes
        for pid in pids_to_kill:
            try:
                os.kill(int(pid), signal.SIGTERM)
                print(f"Killed process {pid}")
            except:
                try:
                    os.kill(int(pid), signal.SIGKILL)
                    print(f"Force killed process {pid}")
                except:
                    pass
                    
        if pids_to_kill:
            time.sleep(2)  # Wait for processes to terminate
            
    except Exception as e:
        print(f"Error killing processes: {e}")

def main():
    print("Step 1: Stopping all python server.py processes...")
    kill_python_servers()
    
    print("Step 2: Changing to /root/toolxprint/python-services...")
    os.chdir('/root/toolxprint/python-services')
    print(f"Current directory: {os.getcwd()}")
    
    print("Step 3: Activating virtual environment and starting server...")
    # Start server with nohup equivalent
    cmd = [
        'bash', '-c', 
        'source venv/bin/activate && nohup python server.py > service.log 2>&1 &'
    ]
    
    try:
        subprocess.Popen(cmd, cwd='/root/toolxprint/python-services')
        print("Server started successfully!")
        
        # Wait a moment then check if it's running
        time.sleep(3)
        
        print("Step 4: Checking if service is running...")
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        
        server_running = False
        for line in result.stdout.split('\n'):
            if 'python' in line and 'server.py' in line and 'grep' not in line:
                print(f"✓ Server is running: {line.strip()}")
                server_running = True
                break
        
        if not server_running:
            print("✗ Server doesn't appear to be running")
            
        # Check log file
        if os.path.exists('service.log'):
            print("\nLast few lines of service.log:")
            with open('service.log', 'r') as f:
                lines = f.readlines()
                for line in lines[-5:]:
                    print(f"  {line.strip()}")
                    
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    main()