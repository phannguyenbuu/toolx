#!/bin/bash
# Debug rotation issue

echo "=== ROTATION DEBUG ==="
echo ""

# Check if services are running
echo "1. Services Status:"
if pgrep -f "server.py" > /dev/null; then
    echo "   ✓ Python service running (PID: $(pgrep -f server.py))"
else
    echo "   ✗ Python service NOT running"
fi

if pgrep -f "react-scripts" > /dev/null; then
    echo "   ✓ Frontend running (PID: $(pgrep -f react-scripts))"
else
    echo "   ✗ Frontend NOT running"
fi

echo ""
echo "2. Recent rotation logs:"
echo "   Checking python-service.log for rotation debug..."
tail -100 /root/toolxprint/python-service.log | grep -E "Applying rotation|No rotation|pages_meta parsed" | tail -10

echo ""
echo "3. Code verification:"
# Check processor.py rotation logic
if grep -q "img.rotate(-rotation_deg, expand=True)" /root/toolxprint/python-services/processor.py; then
    echo "   ✓ Rotation code present in processor.py"
else
    echo "   ✗ Rotation code MISSING in processor.py"
fi

echo ""
echo "=== SOLUTION ==="
echo "If rotation still not working:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Check browser console for errors"
echo "3. Restart Python service: pkill -f server.py && cd python-services && python server.py &"
echo "4. Check that pagesData is being sent in network tab"
