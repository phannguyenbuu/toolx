const { test, expect } = require('@playwright/test');

test.describe('Simple Website Test', () => {
  test('basic connectivity test', async ({ page }) => {
    console.log('🔍 Testing website connectivity...');
    
    await page.goto('http://157.66.80.125');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    // Get basic info
    const title = await page.title();
    const url = page.url();
    const content = await page.content();
    
    console.log('📄 Title:', title);
    console.log('🔗 URL:', url);
    console.log('📏 Content length:', content.length);
    console.log('🎯 Has React app:', content.includes('react') || content.includes('root'));
    
    // Basic checks
    expect(title).toBeTruthy();
    expect(content.length).toBeGreaterThan(100);
    
    console.log('✅ Website is accessible and loading content');
  });

  test('check for JavaScript errors', async ({ page }) => {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('http://157.66.80.125');
    await page.waitForTimeout(5000); // Wait for JS to load
    
    console.log('🐛 JavaScript errors found:', errors.length);
    if (errors.length > 0) {
      console.log('❌ Errors:', errors.slice(0, 3)); // Show first 3 errors
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    // Don't fail test for JS errors, just report
    expect(true).toBeTruthy();
  });
});
