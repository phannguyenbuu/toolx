#!/bin/bash

echo "🎬 ToolXPrint - Playwright Testing Demo"
echo "========================================"
echo ""

echo "📦 1. Checking installation..."
npx playwright --version
echo ""

echo "🔍 2. Listing test files..."
ls -lh tests/*.spec.js
echo ""

echo "⚙️  3. Checking services..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend: Running" || echo "❌ Frontend: Not running"
curl -s http://localhost:3005/health > /dev/null && echo "✅ Python API: Running" || echo "❌ Python API: Not running"
echo ""

echo "🧪 4. Running tests..."
npx playwright test --reporter=list

echo ""
echo "📊 5. Test summary..."
echo "   Total tests: 10"
echo "   Rotation: 4 tests"
echo "   Features: 4 tests"
echo "   Navigation: 2 tests"
echo ""

echo "📁 6. Test artifacts..."
if [ -d "test-results" ]; then
    echo "   Screenshots: $(find test-results -name "*.png" | wc -l)"
    echo "   Videos: $(find test-results -name "*.webm" | wc -l)"
else
    echo "   No failures - no artifacts generated ✅"
fi
echo ""

echo "✅ Demo complete!"
echo ""
echo "Commands to try:"
echo "  npm run test:e2e        - Run all tests"
echo "  npm run test:e2e:ui     - Run with UI"
echo "  ./run-tests.sh          - Quick test"
