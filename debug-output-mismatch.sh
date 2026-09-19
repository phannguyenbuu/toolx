#!/bin/bash

echo "🚨 CRITICAL: OUTPUT ≠ PREVIEW"
echo "============================="

echo "❌ PROBLEM CONFIRMED:"
echo "Despite all fixes, output still completely different from preview"
echo "This indicates a fundamental mismatch in calculation logic"

echo ""
echo "🔍 DEBUGGING REAL ISSUE:"

# Check if there are other scale calculations we missed
echo "1. Searching for ALL scale-related calculations..."

echo ""
echo "📁 Frontend scale calculations:"
grep -r -n "scale\|Scale\|SCALE" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx | head -10

echo ""
echo "📁 Backend scale calculations:"
grep -r -n "scale\|Scale\|SCALE" /root/toolxprint/python-services/processor.py | head -10

echo ""
echo "🔍 Looking for DPI mismatches..."
echo "Frontend DPI usage:"
grep -r -n "300\|dpi\|DPI" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx

echo ""
echo "Backend DPI usage:"
grep -r -n "300\|dpi\|DPI" /root/toolxprint/python-services/processor.py

echo ""
echo "🎯 LIKELY ROOT CAUSES:"
echo "1. Different DPI assumptions between frontend/backend"
echo "2. Different image size calculations"
echo "3. Different coordinate systems"
echo "4. Missing scale application in one system"
echo "5. Different units (px vs mm vs inches)"

echo ""
echo "🔧 IMMEDIATE ACTION NEEDED:"
echo "1. Add debug logging to both systems"
echo "2. Compare actual calculations step by step"
echo "3. Verify DPI consistency"
echo "4. Check coordinate system differences"
