#!/bin/bash
# View debug results

DEBUG_DIR="/root/toolxprint/debug_rotation"

echo "=== ROTATION DEBUG RESULTS ==="
echo ""

if [ -f "$DEBUG_DIR/python_rotation.log" ]; then
    echo "📊 Python Output Rotation:"
    echo "─────────────────────────────"
    cat "$DEBUG_DIR/python_rotation.log"
    echo ""
else
    echo "⚠️  No Python log yet. Please test first!"
    echo ""
fi

echo "📋 Instructions to get Frontend log:"
echo "─────────────────────────────────────"
echo "1. In browser Console, you should see:"
echo "   === PREVIEW ROTATION CALCULATION ==="
echo "   Page 0: rotation=XX°, w=YY, h=ZZ"
echo "   === END PREVIEW CALCULATION ==="
echo ""
echo "2. Copy that output and paste here, or tell me:"
echo "   - Preview rotation: XX°"
echo "   - Python rotation: (from above)"
echo ""
echo "Then I can analyze the difference!"
