#!/bin/bash

# ToolXPrint Service Manager (Supabase edition)
# Services: Frontend (serve), Python, Nginx

case "$1" in
    start)
        echo "🚀 Starting ToolXPrint services..."
        cd /root/toolxprint

        # Frontend (production build)
        echo "🎨 Starting frontend (production)..."
        nohup serve -s build -l 3000 > frontend.log 2>&1 &
        echo $! > frontend.pid
        echo "Frontend PID: $(cat frontend.pid)"

        # Python services
        echo "🐍 Starting Python services..."
        cd /root/toolxprint/python-services
        nohup python server.py > /root/toolxprint/python-service.log 2>&1 &
        echo $! > /root/toolxprint/python.pid
        echo "Python PID: $(cat /root/toolxprint/python.pid)"

        # Nginx
        echo "🌐 Starting nginx..."
        systemctl start nginx

        echo "✅ All services started!"
        echo "🌍 http://157.66.80.125"
        ;;

    stop)
        echo "🛑 Stopping ToolXPrint services..."
        [ -f frontend.pid ] && kill $(cat frontend.pid) 2>/dev/null; rm -f frontend.pid
        [ -f python.pid ] && kill $(cat python.pid) 2>/dev/null; rm -f python.pid
        pkill -f "serve -s build" 2>/dev/null || true
        pkill -f "react-scripts start" 2>/dev/null || true
        pkill -f "python.*server.py" 2>/dev/null || true
        systemctl stop nginx
        echo "✅ Stopped"
        ;;

    status)
        echo "📊 ToolXPrint Status:"
        echo "🎨 Frontend:" && (pgrep -f "serve -s build" > /dev/null && echo "   ✅ Running" || echo "   ❌ Not running")
        echo "🐍 Python:" && (pgrep -f "python.*server.py" > /dev/null && echo "   ✅ Running" || echo "   ❌ Not running")
        echo "🌐 Nginx:" && systemctl is-active nginx
        echo "🗄️ Supabase:" && (docker ps | grep -q supabase-kong && echo "   ✅ Running" || echo "   ❌ Not running")
        echo ""
        echo "Ports:"
        ss -tlnp | grep -E ':(3000|3005|8000) '
        ;;

    restart)
        $0 stop
        sleep 2
        $0 start
        ;;

    logs)
        echo "Frontend:" && tail -20 /root/toolxprint/frontend.log
        echo "" && echo "Python:" && tail -20 /root/toolxprint/python-service.log
        ;;

    *)
        echo "Usage: $0 {start|stop|status|restart|logs}"
        exit 1
        ;;
esac
