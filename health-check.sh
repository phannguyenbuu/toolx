#!/bin/bash

# ToolXPrint Health Check Script
echo "🏥 ToolXPrint Health Check"
echo "========================="

# Check services
FRONTEND_OK=false
BACKEND_OK=false
PYTHON_OK=false
NGINX_OK=false

# Check Frontend (port 3000)
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: Running (port 3000)"
    FRONTEND_OK=true
else
    echo "❌ Frontend: Not responding"
fi

# Check Backend (port 3001)
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend: Running (port 3001)"
    BACKEND_OK=true
else
    echo "❌ Backend: Not responding"
fi

# Check Python Service (port 3005)
if curl -s http://localhost:3005/api/health > /dev/null 2>&1; then
    echo "✅ Python Service: Running (port 3005)"
    PYTHON_OK=true
else
    echo "❌ Python Service: Not responding"
fi

# Check Nginx (port 80)
if curl -s http://localhost > /dev/null 2>&1; then
    echo "✅ Nginx: Running (port 80)"
    NGINX_OK=true
else
    echo "❌ Nginx: Not responding"
fi

# Overall status
echo ""
if $FRONTEND_OK && $BACKEND_OK && $PYTHON_OK && $NGINX_OK; then
    echo "🎉 All services are healthy!"
    exit 0
else
    echo "⚠️  Some services need attention"
    echo ""
    echo "🔧 To restart all services:"
    echo "   sudo systemctl restart toolxprint"
    echo "   # or"
    echo "   /root/toolxprint/manage-services.sh restart"
    exit 1
fi
