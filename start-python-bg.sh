#!/bin/bash
cd /root/toolxprint/python-services
# Kill any existing Python server processes
pkill -9 -f "python.*server.py" 2>/dev/null || true
sleep 2
# Ensure only one process starts
source venv/bin/activate
export FLASK_ENV=production
python server.py &
PYTHON_PID=$!
echo $PYTHON_PID > ../python.pid
echo "Python service started with PID: $PYTHON_PID"
