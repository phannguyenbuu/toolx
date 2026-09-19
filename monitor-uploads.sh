#!/bin/bash
# Monitor upload performance

echo "=== ToolXPrint Upload Performance Monitor ==="
echo "Time: $(date)"
echo

# Check nginx processes
echo "📊 Nginx processes:"
ps aux | grep nginx | grep -v grep

echo
echo "🐍 Python service:"
ps aux | grep "python.*server.py" | grep -v grep

echo
echo "💾 Disk usage:"
df -h /root/toolxprint/

echo
echo "🔄 Recent upload logs (last 10):"
tail -10 /root/toolxprint/python-service.log | grep -E "(POST|ERROR|CHUNK|FINALIZE)"

echo
echo "📈 Nginx error logs (last 5):"
tail -5 /var/log/nginx/error.log

echo
echo "🌐 Active connections:"
ss -tuln | grep -E ":300[0-5]"
