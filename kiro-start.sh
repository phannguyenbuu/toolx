#!/bin/bash

# Complete Kiro CLI Startup Script
echo "🚀 Starting Kiro CLI Development Environment..."
echo "=============================================="

# Set PATH
export PATH="/usr/local/bin:/root/.local/bin:$PATH"

# Check if we're in the right directory
if [ ! -d "/root/toolxprint" ]; then
    echo "❌ Project directory not found!"
    exit 1
fi

cd /root/toolxprint

# Start Python AI Service if not running
if ! pgrep -f "python.*server.py" > /dev/null; then
    echo "🐍 Starting Python AI Service..."
    start-python-service
    sleep 3
else
    echo "✅ Python AI Service already running"
fi

# Check database services
echo "🔍 Checking database services..."
if ! docker ps | grep -q "toolxprint-postgres"; then
    echo "🗄️ Starting database services..."
    docker-compose -f docker-compose.production.yml up -d postgres redis
    sleep 5
else
    echo "✅ Database services already running"
fi

# Show status
echo ""
echo "📊 Service Status:"
echo "=================="
echo "🐍 Python AI Service: http://157.66.80.125:3005"
echo "🗄️ PostgreSQL: localhost:5432"
echo "📦 Redis: localhost:6379"
echo "🤖 Kiro CLI: Ready"
echo ""

# Start Kiro CLI
echo "🤖 Starting Kiro CLI Chat..."
echo "Press Ctrl+C to exit"
echo "=============================================="

# Use full path to ensure it works
/usr/local/bin/kiro-cli chat