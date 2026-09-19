const { test, expect } = require('@playwright/test');

test.describe('Simple Fix Test', () => {
  test('should check page loads without itemW error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => {
      console.log('JS Error:', error.message);
      errors.push(error.message);
    });
    
    await page.goto('/imposition-advanced');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Look for any buttons with "PDF" or "Tải"
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons`);
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      if (text && (text.includes('PDF') || text.includes('Tải'))) {
        console.log(`Button ${i}: "${text}"`);
      }
    }
    
    // Check for itemW errors
    const itemWErrors = errors.filter(err => err.includes('itemW'));
    console.log('ItemW errors:', itemWErrors);
    
    expect(itemWErrors).toHaveLength(0);
    console.log('✅ No itemW errors found');
  });
});
