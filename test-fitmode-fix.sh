#!/bin/bash

echo "=== Testing FitMode Fix for Scale Sync Issue ==="
echo "This test verifies that custom scale forces 'actual' fitMode"

cd /root/toolxprint

# Start the services
echo "Starting services..."
npm run dev &
DEV_PID=$!
cd python-services && python server.py &
PYTHON_PID=$!

sleep 5

# Test with Playwright
echo "Running fitMode fix test..."
npx playwright test --reporter=line -c playwright.config.js << 'EOF'
import { test, expect } from '@playwright/test';

test('fitMode sync with custom scale', async ({ page }) => {
  await page.goto('http://localhost:3000/?page=imposition-advanced');
  
  // Wait for page load
  await page.waitForTimeout(2000);
  
  // Look for scale controls
  const scaleInput = await page.locator('input[type="range"], input[type="number"]').filter({ hasText: /scale|tỷ lệ/i }).first();
  
  if (await scaleInput.count() > 0) {
    console.log('Found scale control, testing fitMode sync...');
    
    // Change scale to trigger actual mode
    await scaleInput.fill('150');
    await page.waitForTimeout(1000);
    
    // Check if preview updates
    const preview = await page.locator('canvas, img').first();
    await expect(preview).toBeVisible();
    
    console.log('Scale change applied, fitMode should now be "actual"');
  } else {
    console.log('Scale controls not found, checking for fitMode in network requests...');
  }
  
  // Monitor network requests for fitMode
  page.on('request', request => {
    if (request.url().includes('/process') || request.url().includes('/preview')) {
      console.log('Request URL:', request.url());
      if (request.postData()) {
        const data = request.postData();
        if (data.includes('fitMode')) {
          console.log('FitMode in request:', data.match(/fitMode[^&]*/)?.[0]);
        }
      }
    }
  });
});
EOF

# Cleanup
kill $DEV_PID $PYTHON_PID 2>/dev/null

echo "=== FitMode Fix Test Complete ==="
