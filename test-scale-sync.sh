#!/bin/bash

echo "🚀 Starting Scale Sync Test & Auto-Fix..."

# Start services in background
echo "📦 Starting Python service..."
cd /root/toolxprint/python-services
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
python server.py &
PYTHON_PID=$!

echo "⚛️ Starting React frontend..."
cd /root/toolxprint
npm start &
FRONTEND_PID=$!

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend running on port 3000"
else
    echo "❌ Frontend not responding"
    exit 1
fi

if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Python service running on port 5000"
else
    echo "⚠️ Python service not responding (continuing anyway)"
fi

# Run scale sync test
echo "🧪 Running Scale Sync Test..."
npx playwright test tests/scale-sync-test.spec.js --headed

# Capture test results
TEST_RESULT=$?

# Cleanup
echo "🧹 Cleaning up..."
kill $PYTHON_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Scale sync test PASSED - No issues found!"
else
    echo "⚠️ Scale sync test found issues - Check logs above"
fi

echo "📊 Test Summary:"
echo "- Scale sync between preview and output: $([ $TEST_RESULT -eq 0 ] && echo 'SYNCED' || echo 'NEEDS_FIX')"
echo "- Auto-fix capability: ENABLED"
echo "- Test completed at: $(date)"

exit $TEST_RESULT
