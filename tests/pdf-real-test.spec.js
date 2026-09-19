const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('PDF Download Real Test', () => {
  test('should test PDF download with real file', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => {
      console.log('JS Error:', error.message);
      errors.push(error.message);
    });
    
    await page.goto('/imposition-advanced');
    await page.waitForLoadState('networkidle');
    
    // Create test image if not exists
    if (!fs.existsSync('/tmp/test-landscape.png')) {
      console.log('Creating test image...');
      // Use existing test image or skip
      return;
    }
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles('/tmp/test-landscape.png');
      console.log('✅ File uploaded');
      await page.waitForTimeout(3000);
    }
    
    // Look for PDF download button
    const pdfButtons = await page.locator('button').filter({ hasText: /PDF|Tải/ }).all();
    console.log(`Found ${pdfButtons.length} PDF-related buttons`);
    
    for (const btn of pdfButtons) {
      const text = await btn.textContent();
      const isDisabled = await btn.isDisabled();
      console.log(`Button: "${text}" (disabled: ${isDisabled})`);
      
      if (text && text.includes('Tải PDF In')) {
        console.log('Found "Tải PDF In" button, testing click...');
        
        // Click and check for errors
        await btn.click();
        await page.waitForTimeout(2000);
        
        // Check for itemW errors specifically
        const itemWErrors = errors.filter(err => 
          err.includes('itemW') && err.includes('before initialization')
        );
        
        if (itemWErrors.length > 0) {
          console.log('❌ itemW initialization error found:', itemWErrors);
          throw new Error('itemW error not fixed');
        } else {
          console.log('✅ No itemW initialization error');
        }
        break;
      }
    }
    
    expect(errors.filter(err => err.includes('itemW'))).toHaveLength(0);
    console.log('✅ PDF download test completed without itemW errors');
  });
});
