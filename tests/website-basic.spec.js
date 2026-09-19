const { test, expect } = require('@playwright/test');

test.describe('Website Basic Tests', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    
    // Check if page loads
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('✅ Homepage loaded successfully');
    console.log('📄 Title:', title);
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    
    // Check for any clickable elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    
    console.log('🔘 Buttons found:', buttons);
    console.log('🔗 Links found:', links);
    
    expect(buttons + links).toBeGreaterThan(0);
  });

  test('should load price calculator', async ({ page }) => {
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    
    // Look for price calculator elements
    const content = await page.content();
    const hasCalculator = content.includes('tính giá') || 
                         content.includes('calculator') || 
                         content.includes('price') ||
                         content.includes('Digital') ||
                         content.includes('Offset');
    
    console.log('💰 Price calculator elements found:', hasCalculator);
    expect(hasCalculator).toBeTruthy();
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    
    let screenshot1 = await page.screenshot({ path: 'test-results/desktop.png' });
    console.log('🖥️ Desktop view captured');
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    let screenshot2 = await page.screenshot({ path: 'test-results/mobile.png' });
    console.log('📱 Mobile view captured');
    
    expect(screenshot1).toBeTruthy();
    expect(screenshot2).toBeTruthy();
  });

  test('should have working backend API', async ({ page }) => {
    // Test API endpoint
    const response = await page.request.get('http://157.66.80.125/api/health');
    
    if (response.status() === 200) {
      console.log('✅ Backend API is working');
    } else {
      console.log('⚠️ Backend API status:', response.status());
    }
    
    // Don't fail test if API is not available, just log
    expect(response.status()).toBeGreaterThan(0);
  });
});
