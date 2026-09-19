const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('Scale Mode - Capture Console Log', async ({ page }) => {
  console.log('🧪 Starting scale mode test...\n');
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('FRONTEND SCALE DEBUG')) {
      console.log('\n📊 FRONTEND LOG CAPTURED:');
      console.log(text);
    }
  });
  
  // Go to page
  console.log('1. Opening http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Find and click navigation
  console.log('2. Looking for ImpositionAdvancedPage link...');
  
  // Try different selectors
  const selectors = [
    'a:has-text("Imposition Advanced")',
    'a:has-text("Advanced")',
    'text=Imposition',
    '[href*="imposition"]',
    'nav a'
  ];
  
  let clicked = false;
  for (const selector of selectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        console.log(`   Found: ${selector}`);
        await element.click();
        clicked = true;
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  if (!clicked) {
    console.log('   ⚠️  Could not find navigation, trying direct URL...');
    await page.goto('http://localhost:3000/#/imposition-advanced');
  }
  
  await page.waitForTimeout(2000);
  
  // Upload image
  console.log('3. Uploading test image...');
  const fileInput = await page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('/root/toolxprint/test-landscape-2000x1000.png');
  await page.waitForTimeout(3000);
  
  // Set item size
  console.log('4. Setting item size to 100x100mm...');
  const inputs = await page.locator('input[type="number"]').all();
  if (inputs.length >= 2) {
    await inputs[0].fill('100'); // itemW
    await inputs[1].fill('100'); // itemH
  }
  await page.waitForTimeout(1000);
  
  // Find and set scale
  console.log('5. Setting scale to 50%...');
  
  // Try to find scale input/slider
  const scaleInput = await page.locator('input[type="range"], input[type="number"]').last();
  await scaleInput.fill('50');
  await page.waitForTimeout(2000);
  
  // Trigger update by changing scale slightly
  await scaleInput.fill('51');
  await page.waitForTimeout(500);
  await scaleInput.fill('50');
  await page.waitForTimeout(2000);
  
  // Check if we got the log
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 ANALYSIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const scaleLog = logs.find(log => log.includes('FRONTEND SCALE DEBUG'));
  
  if (scaleLog) {
    console.log('✅ Frontend log captured!\n');
    
    // Parse scaledPx
    const scaledPxMatch = scaleLog.match(/scaledPx.*?w:\s*(\d+).*?h:\s*(\d+)/);
    if (scaledPxMatch) {
      const actualW = parseInt(scaledPxMatch[1]);
      const actualH = parseInt(scaledPxMatch[2]);
      const expectedW = 591;
      const expectedH = 296;
      
      console.log(`Actual:   scaledPx: { w: ${actualW}, h: ${actualH} }`);
      console.log(`Expected: scaledPx: { w: ${expectedW}, h: ${expectedH} }`);
      console.log('');
      
      if (actualW === expectedW && actualH === expectedH) {
        console.log('✅ FRONTEND CALCULATION CORRECT!\n');
      } else {
        console.log('❌ FRONTEND CALCULATION WRONG!\n');
        console.log(`Difference: w=${actualW-expectedW}, h=${actualH-expectedH}\n`);
      }
    }
    
    // Parse scaledMm
    const scaledMmMatch = scaleLog.match(/scaledMm.*?w:\s*"([\d.]+)".*?h:\s*"([\d.]+)"/);
    if (scaledMmMatch) {
      const actualWmm = parseFloat(scaledMmMatch[1]);
      const actualHmm = parseFloat(scaledMmMatch[2]);
      console.log(`Actual mm: ${actualWmm}x${actualHmm}mm`);
      console.log(`Expected mm: 50.04x25.06mm\n`);
    }
  } else {
    console.log('❌ No frontend log found!\n');
    console.log('Possible issues:');
    console.log('  - Scale mode not activated');
    console.log('  - Frontend code not updated');
    console.log('  - Browser cache\n');
  }
  
  // Take screenshot
  await page.screenshot({ path: 'scale-test-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved: scale-test-screenshot.png\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
