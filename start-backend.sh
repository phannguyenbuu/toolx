#!/bin/bash

echo "🚀 Starting Backend Services..."

# Navigate to project directory
cd /root/toolxprint

# Start database services
echo "🗄️ Starting database services..."
docker-compose -f docker-compose.production.yml up -d postgres redis

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 10

# Navigate to backend directory
cd backend-nestjs

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start NestJS backend in background
echo "🚀 Starting NestJS backend..."
nohup npm run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend started with PID: $BACKEND_PID"
echo "📋 Log file: /root/toolxprint/backend.log"
echo "🛑 To stop: kill $BACKEND_PID"

# Show status
echo ""
echo "📊 Backend Services Status:"
echo "=========================="
echo "🗄️ PostgreSQL: localhost:5432"
echo "📦 Redis: localhost:6379"
echo "🚀 NestJS API: http://localhost:3000"
echo "📋 Logs: tail -f /root/toolxprint/backend.log"
