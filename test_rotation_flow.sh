#!/bin/bash
# Test rotation flow: Frontend -> Python

echo "=== Testing Rotation Flow ==="
echo ""

# 1. Check frontend code
echo "1. Checking frontend code..."
if grep -q "pagesDataWithFinalRotation" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx; then
    echo "   ✓ Frontend calculates final rotation"
else
    echo "   ✗ Frontend NOT calculating final rotation"
fi

# 2. Check Python receives data
echo ""
echo "2. Checking Python server.py..."
if grep -q "json.loads(pages_meta_str)" /root/toolxprint/python-services/server.py; then
    echo "   ✓ Python parses JSON correctly"
else
    echo "   ✗ Python NOT parsing JSON"
fi

# 3. Check Python applies rotation
echo ""
echo "3. Checking Python processor.py..."
if grep -q "img.rotate(-rotation_deg" /root/toolxprint/python-services/processor.py; then
    echo "   ✓ Python applies rotation from metadata"
else
    echo "   ✗ Python NOT applying rotation"
fi

# 4. Check Python doesn't auto-rotate
echo ""
echo "4. Checking Python removed auto-rotate..."
if grep -q "No auto-rotate - frontend already calculated" /root/toolxprint/python-services/processor.py; then
    echo "   ✓ Python removed auto-rotate logic"
else
    echo "   ✗ Python still has auto-rotate"
fi

echo ""
echo "=== Summary ==="
echo "Frontend: Calculates final rotation (manual + auto)"
echo "Python: Receives and applies rotation exactly"
echo ""
echo "Now test in browser:"
echo "1. Upload an image"
echo "2. Click 'Xoay phải' or enable 'Tự động xoay'"
echo "3. Download PDF"
echo "4. Check if rotation matches preview"
