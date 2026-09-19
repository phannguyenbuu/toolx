#!/bin/bash

echo "🔄 Restarting services with 1GB file size limit..."

# Stop all services
echo "⏹️ Stopping services..."
./manage-services.sh stop

# Wait a moment
sleep 3

# Start all services
echo "▶️ Starting services..."
./manage-services.sh start

# Restart nginx if running
if pgrep nginx > /dev/null; then
    echo "🔄 Restarting nginx..."
    sudo nginx -s reload
fi

echo "✅ All services restarted with 1GB file size limit!"
echo "📊 Current limits:"
echo "   - Nginx: 1GB"
echo "   - Backend NestJS: 1GB"
echo "   - Python Service: 1GB"
