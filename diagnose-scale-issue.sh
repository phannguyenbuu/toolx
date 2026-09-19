#!/bin/bash

echo "🔍 REAL SCALE ISSUE DIAGNOSIS"
echo "============================"

echo "📁 Checking if ImpositionAdvancedPage is actually being used..."

# Check if the component is imported and used
IMPORT_COUNT=$(grep -r "ImpositionAdvancedPage" /root/toolxprint/src --include="*.tsx" --include="*.ts" | wc -l)
echo "ImpositionAdvancedPage imports/usage: $IMPORT_COUNT"

if [ $IMPORT_COUNT -gt 0 ]; then
    echo "📋 Usage locations:"
    grep -r "ImpositionAdvancedPage" /root/toolxprint/src --include="*.tsx" --include="*.ts"
    echo ""
fi

# Check if the scale logic is actually in the built code
echo "🔧 Checking if scale logic exists in the component..."

SCALE_LOGIC=$(grep -c "customScale" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx)
MM_LOGIC=$(grep -c "imgW_mm" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx)

echo "customScale references: $SCALE_LOGIC"
echo "MM calculation logic: $MM_LOGIC"

if [ $SCALE_LOGIC -gt 0 ] && [ $MM_LOGIC -gt 0 ]; then
    echo "✅ Scale logic exists in component"
else
    echo "❌ Scale logic missing or incomplete"
fi

# Check if there's a navigation path to the component
echo ""
echo "🧭 Checking navigation paths..."

NAV_PATHS=$(grep -r "imposition-advanced" /root/toolxprint/src --include="*.tsx" --include="*.ts")
if [ -n "$NAV_PATHS" ]; then
    echo "Navigation paths found:"
    echo "$NAV_PATHS"
else
    echo "❌ No navigation paths to imposition-advanced found"
fi

# Check if there are any buttons that set currentPage to imposition-advanced
BUTTON_PATHS=$(grep -r "setCurrentPage.*imposition" /root/toolxprint/src --include="*.tsx" --include="*.ts")
if [ -n "$BUTTON_PATHS" ]; then
    echo "Button navigation found:"
    echo "$BUTTON_PATHS"
else
    echo "❌ No buttons navigate to imposition-advanced"
fi

echo ""
echo "🎯 DIAGNOSIS RESULT:"

if [ $SCALE_LOGIC -gt 0 ] && [ $MM_LOGIC -gt 0 ]; then
    if [ -n "$NAV_PATHS" ]; then
        echo "✅ Scale logic exists but may need authentication or specific navigation"
        echo "🔧 SOLUTION: Need to find correct navigation path or bypass auth"
    else
        echo "❌ Scale logic exists but NO NAVIGATION PATH"
        echo "🔧 SOLUTION: Component exists but is not accessible via UI"
    fi
else
    echo "❌ Scale logic is missing or broken"
    echo "🔧 SOLUTION: Need to fix the scale implementation"
fi

echo ""
echo "🧪 NEXT STEPS:"
echo "1. Check if authentication is required"
echo "2. Find correct navigation path"
echo "3. Test scale logic directly in component"
echo "4. Verify mm-based calculations are working"
