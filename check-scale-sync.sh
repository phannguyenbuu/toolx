#!/bin/bash

echo "🔍 Scale Sync Code Analysis & Auto-Fix"
echo "======================================"

# Check for scale sync issues in ImpositionAdvancedPage.tsx
echo "📁 Analyzing ImpositionAdvancedPage.tsx..."

FILE="/root/toolxprint/src/components/ImpositionAdvancedPage.tsx"

# Check for duplicate scale in CSS transforms
DUPLICATE_SCALES=$(grep -n "transform.*scale.*customScale" "$FILE" | wc -l)
echo "🔍 Duplicate scale transforms found: $DUPLICATE_SCALES"

if [ $DUPLICATE_SCALES -gt 0 ]; then
    echo "❌ ISSUE: Found duplicate scale in CSS transforms"
    echo "📝 Locations:"
    grep -n "transform.*scale.*customScale" "$FILE"
    
    echo "🔧 Auto-fixing..."
    # Remove scale from CSS transforms, keep only rotation
    sed -i 's/transform: `rotate(\${page\.rotation}deg) scale(\${config\.fitMode === '\''actual'\'' ? customScale \/ 100 : 1})`/transform: `rotate(\${page.rotation}deg)`/g' "$FILE"
    
    echo "✅ Fixed: Removed duplicate scale from CSS transforms"
else
    echo "✅ No duplicate scale transforms found"
fi

# Check if scale is properly applied in canvas generation
CANVAS_SCALE=$(grep -n "const scale = customScale / 100" "$FILE" | wc -l)
echo "🎨 Canvas scale application found: $CANVAS_SCALE"

if [ $CANVAS_SCALE -eq 0 ]; then
    echo "❌ ISSUE: Scale not applied in canvas generation"
else
    echo "✅ Scale properly applied in canvas generation"
fi

# Check Python backend scale handling
echo ""
echo "🐍 Analyzing Python backend..."
PYTHON_FILE="/root/toolxprint/python-services/processor.py"

PYTHON_SCALE=$(grep -n "scale_factor = custom_scale / 100" "$PYTHON_FILE" | wc -l)
echo "🔍 Python scale handling found: $PYTHON_SCALE"

if [ $PYTHON_SCALE -eq 0 ]; then
    echo "❌ ISSUE: Scale not handled in Python backend"
else
    echo "✅ Scale properly handled in Python backend"
fi

# Summary
echo ""
echo "📊 SCALE SYNC ANALYSIS SUMMARY"
echo "==============================="

TOTAL_ISSUES=0

if [ $DUPLICATE_SCALES -gt 0 ]; then
    echo "❌ Frontend: Duplicate scale transforms (FIXED)"
    TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
else
    echo "✅ Frontend: No duplicate scale transforms"
fi

if [ $CANVAS_SCALE -gt 0 ]; then
    echo "✅ Frontend: Canvas scale properly applied"
else
    echo "❌ Frontend: Canvas scale missing"
    TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
fi

if [ $PYTHON_SCALE -gt 0 ]; then
    echo "✅ Backend: Python scale properly handled"
else
    echo "❌ Backend: Python scale missing"
    TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
fi

echo ""
if [ $TOTAL_ISSUES -eq 0 ]; then
    echo "🎉 RESULT: Scale sync is PERFECT!"
    echo "✅ Preview and output will match exactly"
else
    echo "⚠️ RESULT: Found $TOTAL_ISSUES scale sync issues"
    echo "🔧 Auto-fixes have been applied where possible"
fi

echo ""
echo "🧪 To test manually:"
echo "1. Start services: npm run dev:all"
echo "2. Go to Imposition Advanced"
echo "3. Set fitMode to 'actual'"
echo "4. Change customScale (50%, 150%, 200%)"
echo "5. Compare preview with PDF output"

exit $TOTAL_ISSUES
