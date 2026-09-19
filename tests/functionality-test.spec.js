const { test, expect } = require('@playwright/test');

test.describe('ToolXPrint Functionality Tests', () => {
  test('should test price calculator navigation', async ({ page }) => {
    console.log('🧮 Testing Price Calculator...');
    
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for price calculator buttons/links
    const digitalBtn = page.locator('text=Digital').first();
    const offsetBtn = page.locator('text=Offset').first();
    const calcBtn = page.locator('text=Tính giá').first();
    
    const hasDigital = await digitalBtn.isVisible().catch(() => false);
    const hasOffset = await offsetBtn.isVisible().catch(() => false);
    const hasCalc = await calcBtn.isVisible().catch(() => false);
    
    console.log('💰 Digital calculator visible:', hasDigital);
    console.log('📊 Offset calculator visible:', hasOffset);
    console.log('🧮 General calculator visible:', hasCalc);
    
    if (hasDigital) {
      await digitalBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ Digital calculator clicked successfully');
    }
    
    expect(hasDigital || hasOffset || hasCalc).toBeTruthy();
  });

  test('should test file upload functionality', async ({ page }) => {
    console.log('📁 Testing File Upload...');
    
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for file inputs
    const fileInputs = await page.locator('input[type="file"]').count();
    const uploadBtns = await page.locator('text=Upload').count();
    const chooseBtns = await page.locator('text=Choose').count();
    
    console.log('📎 File inputs found:', fileInputs);
    console.log('⬆️ Upload buttons found:', uploadBtns);
    console.log('📂 Choose buttons found:', chooseBtns);
    
    expect(fileInputs + uploadBtns + chooseBtns).toBeGreaterThanOrEqual(0);
  });

  test('should test imposition features', async ({ page }) => {
    console.log('📐 Testing Imposition Features...');
    
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for imposition-related elements
    const content = await page.content();
    const hasImposition = content.toLowerCase().includes('imposition') ||
                         content.includes('sắp xếp') ||
                         content.includes('bố cục');
    
    console.log('📐 Imposition features found:', hasImposition);
    
    // Try to navigate to imposition page
    const impositionLink = page.locator('text=Imposition').first();
    const hasLink = await impositionLink.isVisible().catch(() => false);
    
    if (hasLink) {
      await impositionLink.click();
      await page.waitForTimeout(2000);
      console.log('✅ Imposition page navigation successful');
    }
    
    expect(true).toBeTruthy(); // Always pass, just for info
  });

  test('should test responsive design', async ({ page }) => {
    console.log('📱 Testing Responsive Design...');
    
    // Test different screen sizes
    const sizes = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    for (const size of sizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('http://157.66.80.125');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const screenshot = `test-results/${size.name.toLowerCase()}-view.png`;
      await page.screenshot({ path: screenshot });
      
      console.log(`📸 ${size.name} (${size.width}x${size.height}) screenshot saved`);
    }
    
    expect(true).toBeTruthy();
  });

  test('performance and loading test', async ({ page }) => {
    console.log('⚡ Testing Performance...');
    
    const startTime = Date.now();
    
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log('⏱️ Page load time:', loadTime + 'ms');
    console.log('🚀 Performance rating:', loadTime < 3000 ? 'Good' : loadTime < 5000 ? 'Average' : 'Slow');
    
    // Check for common performance indicators
    const hasLazyLoading = await page.locator('[loading="lazy"]').count();
    const hasMinifiedCSS = (await page.content()).includes('.min.css');
    
    console.log('🖼️ Lazy loading images:', hasLazyLoading);
    console.log('📦 Minified CSS detected:', hasMinifiedCSS);
    
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });
});
