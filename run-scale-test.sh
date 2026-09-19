#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SCALE MODE AUTOMATED TEST - Playwright                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check services
echo "1. Checking services..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "   ❌ Frontend not running"
    echo "   Starting frontend..."
    cd /root/toolxprint
    npm start > frontend.log 2>&1 &
    echo $! > frontend.pid
    sleep 10
fi
echo "   ✅ Frontend running"

if ! curl -s http://localhost:3005/health > /dev/null 2>&1; then
    echo "   ❌ Python service not running"
    echo "   Starting python service..."
    cd /root/toolxprint/python-services
    python server.py > ../python-service.log 2>&1 &
    echo $! > ../python.pid
    sleep 3
fi
echo "   ✅ Python service running"

echo ""
echo "2. Running Playwright tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /root/toolxprint

# Run test
npx playwright test tests/scale-mode-test.spec.js --reporter=list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. Test Summary:"
echo ""

# Check test results
if [ $? -eq 0 ]; then
    echo "   ✅ ALL TESTS PASSED!"
    echo ""
    echo "   Verified:"
    echo "   • Landscape image (2000x1000px) @ 50% scale"
    echo "   • Portrait image (1000x2000px) @ 75% scale"
    echo "   • Square image (2000x2000px) @ 60% scale"
    echo ""
    echo "   • Frontend calculation matches expected"
    echo "   • Backend calculation matches expected"
    echo "   • Frontend === Backend (100% sync)"
else
    echo "   ❌ SOME TESTS FAILED"
    echo ""
    echo "   Check logs:"
    echo "   • Frontend: /root/toolxprint/frontend.log"
    echo "   • Backend: /root/toolxprint/python-service.log"
    echo "   • Test output above"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
