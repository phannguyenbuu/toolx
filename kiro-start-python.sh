#!/bin/bash

# Kiro CLI Python Service Starter
# This script starts the Python AI service for use with Kiro CLI

echo "🤖 Starting Python AI Service for Kiro CLI..."
echo "=============================================="

# Set directories
PROJECT_DIR="/root/toolxprint"
PYTHON_DIR="$PROJECT_DIR/python-services"

# Check if we're in the right directory
if [ ! -d "$PYTHON_DIR" ]; then
    echo "❌ Python services directory not found: $PYTHON_DIR"
    exit 1
fi

# Navigate to python services directory
cd "$PYTHON_DIR"

# Check if virtual environment exists
if [ ! -f "venv/bin/activate" ]; then
    echo "❌ Virtual environment not found. Creating..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    echo "✅ Virtual environment found"
fi

# Activate virtual environment
source venv/bin/activate

# Check if server.py exists
if [ ! -f "server.py" ]; then
    echo "❌ server.py not found in $PYTHON_DIR"
    exit 1
fi

# Kill any existing Python processes on port 3005
echo "🔄 Checking for existing Python processes on port 3005..."
lsof -ti:3005 | xargs -r kill -9

# Start the Python server
echo "🚀 Starting Python AI Service..."
echo "📍 Directory: $(pwd)"
echo "🐍 Python: $(which python)"
echo "🌐 URL: http://157.66.80.125:3005"
echo "=============================================="

# Start server in background
nohup python server.py > python-service.log 2>&1 &
PYTHON_PID=$!

echo "✅ Python AI Service started with PID: $PYTHON_PID"
echo "📋 Log file: $PYTHON_DIR/python-service.log"
echo "🛑 To stop: kill $PYTHON_PID"

# Wait a moment and check if it's running
sleep 3
if ps -p $PYTHON_PID > /dev/null; then
    echo "✅ Python AI Service is running successfully!"
    echo "🌐 Service available at: http://157.66.80.125:3005"
else
    echo "❌ Python AI Service failed to start. Check log:"
    tail -n 20 python-service.log
fi