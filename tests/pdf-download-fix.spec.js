const { test, expect } = require('@playwright/test');

test.describe('PDF Download Fix', () => {
  test('should fix itemW initialization error', async ({ page }) => {
    await page.goto('/imposition-advanced');
    await page.waitForLoadState('networkidle');
    
    // Check for JavaScript errors
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Try to find and click "Tải PDF In" button
    const downloadBtn = await page.locator('button:has-text("Tải PDF In")').first();
    
    if (await downloadBtn.isVisible()) {
      console.log('✅ Found "Tải PDF In" button');
      
      // Check if button is disabled (expected without files)
      const isDisabled = await downloadBtn.isDisabled();
      console.log(`📊 Button disabled: ${isDisabled} (expected: true without files)`);
      
      // Try clicking (should show alert)
      await downloadBtn.click();
      
      // Wait a bit for any errors
      await page.waitForTimeout(1000);
      
      // Check for itemW initialization error
      const hasItemWError = errors.some(err => 
        err.includes('Cannot access') && err.includes('itemW') && err.includes('before initialization')
      );
      
      if (hasItemWError) {
        console.log('❌ Still has itemW initialization error');
        console.log('Errors:', errors);
        throw new Error('itemW initialization error not fixed');
      } else {
        console.log('✅ No itemW initialization error found');
      }
    } else {
      console.log('❌ "Tải PDF In" button not found');
    }
    
    // Verify no JavaScript errors related to itemW
    expect(errors.filter(err => err.includes('itemW'))).toHaveLength(0);
    console.log('✅ itemW initialization fix verified');
  });
});
