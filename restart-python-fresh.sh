#!/bin/bash
# Restart Python với code mới (clear cache)

echo "🔄 Restarting Python service..."

# Kill Python
if [ -f python.pid ]; then
    kill -9 $(cat python.pid) 2>/dev/null
fi
pkill -9 -f "python.*server.py"

# Clear Python cache
echo "🗑️  Clearing Python cache..."
find python-services -name "*.pyc" -delete
find python-services -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null

sleep 2

# Start fresh
echo "🐍 Starting Python service..."
cd python-services
source venv/bin/activate
nohup python -u server.py > ../python-dev.log 2>&1 &
PYTHON_PID=$!
echo $PYTHON_PID > ../python.pid
cd ..

echo "✓ Python restarted (PID: $PYTHON_PID)"
sleep 5

# Test
curl -s http://localhost:3005/api/python-health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✓ Service healthy (uptime: {d['uptime']:.1f}s)\")"
