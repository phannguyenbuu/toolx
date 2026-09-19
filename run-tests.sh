#!/bin/bash

echo "🧪 Running Playwright E2E Tests..."
echo ""

# Check if services are running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Frontend not running on port 3000"
    echo "   Start with: npm run start"
    exit 1
fi

if ! curl -s http://localhost:3005/health > /dev/null; then
    echo "❌ Python service not running on port 3005"
    echo "   Start with: cd python-services && python server.py"
    exit 1
fi

echo "✅ Services are running"
echo ""

# Run tests
npx playwright test --reporter=list

# Show summary
echo ""
echo "📊 Test Summary:"
echo "   - Rotation tests: 4 tests"
echo "   - Feature tests: 4 tests"
echo "   - Navigation tests: 2 tests"
echo ""
echo "📁 Results saved in: test-results/"
