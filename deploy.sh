#!/bin/bash

PYTHON_SERVICE="/root/toolxprint/python-services/venv/bin/python /root/toolxprint/python-services/server.py"
PYTHON_PID="/root/toolxprint/python.pid"
PYTHON_LOG="/root/toolxprint/python-service.log"

start_python() {
    if [ -f "$PYTHON_PID" ] && kill -0 $(cat "$PYTHON_PID") 2>/dev/null; then
        echo "Python service already running (PID: $(cat $PYTHON_PID))"
    else
        cd /root/toolxprint/python-services
        nohup $PYTHON_SERVICE > "$PYTHON_LOG" 2>&1 & echo $! > "$PYTHON_PID"
        sleep 2
        if kill -0 $(cat "$PYTHON_PID") 2>/dev/null; then
            echo "✓ Python service started (PID: $(cat $PYTHON_PID))"
        else
            echo "✗ Failed to start Python service"
            tail -10 "$PYTHON_LOG"
        fi
    fi
}

stop_python() {
    if [ -f "$PYTHON_PID" ]; then
        kill $(cat "$PYTHON_PID") 2>/dev/null && echo "✓ Python service stopped"
        rm -f "$PYTHON_PID"
    else
        echo "Python service not running"
    fi
}

status() {
    echo "=== Service Status ==="
    
    # Python
    if [ -f "$PYTHON_PID" ] && kill -0 $(cat "$PYTHON_PID") 2>/dev/null; then
        echo "✓ Python service: Running (PID: $(cat $PYTHON_PID))"
        curl -s http://127.0.0.1:3005/api/python-health | grep -o '"status":"[^"]*"'
    else
        echo "✗ Python service: Stopped"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        echo "✓ Nginx: Running"
    else
        echo "✗ Nginx: Stopped"
    fi
    
    # Frontend
    if curl -s http://157.66.80.125 | grep -q "Phần mềm"; then
        echo "✓ Frontend: Accessible"
    else
        echo "✗ Frontend: Not accessible"
    fi
}

case "$1" in
    start)
        start_python
        ;;
    stop)
        stop_python
        ;;
    restart)
        stop_python
        sleep 1
        start_python
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
