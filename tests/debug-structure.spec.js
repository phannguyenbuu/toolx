const { test } = require('@playwright/test');

test('Debug - Capture Page Structure', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Get all links
  const links = await page.locator('a').all();
  console.log('\n📋 Available links:');
  for (const link of links) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    if (text && text.trim()) {
      console.log(`  - "${text.trim()}" → ${href}`);
    }
  }
  
  // Try direct URL
  console.log('\n🔗 Trying direct URL: /#/imposition-advanced');
  await page.goto('http://localhost:3000/#/imposition-advanced');
  await page.waitForTimeout(3000);
  
  // Get page title
  const title = await page.title();
  console.log(`\n📄 Page title: ${title}`);
  
  // Check if file input exists
  const fileInputs = await page.locator('input[type="file"]').count();
  console.log(`\n📁 File inputs found: ${fileInputs}`);
  
  if (fileInputs > 0) {
    console.log('✅ Found file input - page loaded correctly');
    
    // Upload test image
    console.log('\n📤 Uploading test image...');
    await page.locator('input[type="file"]').first().setInputFiles('/root/toolxprint/test-landscape-2000x1000.png');
    await page.waitForTimeout(5000);
    
    // Get all inputs
    const allInputs = await page.locator('input').all();
    console.log(`\n🔢 Total inputs: ${allInputs.length}`);
    
    for (let i = 0; i < Math.min(allInputs.length, 20); i++) {
      const input = allInputs[i];
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const value = await input.inputValue().catch(() => '');
      console.log(`  [${i}] type="${type}" placeholder="${placeholder}" value="${value}"`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-page-structure.png', fullPage: true });
    console.log('\n📸 Screenshot: debug-page-structure.png');
  } else {
    console.log('❌ No file input found - wrong page?');
  }
});
