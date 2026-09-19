#!/bin/bash

# ============================================
# Start Python Service on VPS
# ============================================

echo "🐍 Starting Python AI Service..."
echo "=================================="

cd /root/toolxprint/python-services

# Activate virtual environment
source venv/bin/activate

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Virtual environment activated: $VIRTUAL_ENV"
else
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

# Show Python version
echo "🐍 Python version: $(python --version)"

# Start the server
echo "🚀 Starting Flask server on port 3005..."
echo "📁 Upload folder: $(pwd)/uploads"
echo "🌐 Server will be available at: http://157.66.80.125:3005"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

python server.py