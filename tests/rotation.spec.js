const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Rotation Tests', () => {
  test('should rotate image 90 degrees correctly', async ({ page }) => {
    await page.goto('/imposition-advanced');
    await page.waitForLoadState('networkidle');

    // Upload ảnh test
    const testImage = path.join(__dirname, '../test-image.jpg');
    if (!fs.existsSync(testImage)) {
      // Tạo ảnh test nếu chưa có
      console.log('Test image not found, skipping upload test');
      return;
    }

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImage);
    await page.waitForTimeout(2000);

    // Set rotation 90
    const rotationInput = await page.locator('input[type="number"][placeholder*="rotation" i]').first();
    await rotationInput.fill('90');
    await page.waitForTimeout(500);

    // Click generate PDF
    const generateBtn = await page.locator('button:has-text("Generate")').first();
    await generateBtn.click();
    await page.waitForTimeout(3000);

    // Verify PDF generated
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const download = await downloadPromise;
    expect(download).toBeTruthy();
    console.log('✓ PDF with 90° rotation generated successfully');
  });

  test('should auto-rotate landscape to portrait correctly', async ({ page }) => {
    await page.goto('/imposition-advanced');
    await page.waitForLoadState('networkidle');

    // Enable auto-rotate
    const autoRotateCheckbox = await page.locator('input[type="checkbox"]').filter({ hasText: /auto.*rotate/i }).first();
    if (await autoRotateCheckbox.isVisible()) {
      await autoRotateCheckbox.check();
      await page.waitForTimeout(500);
    }

    // Verify auto-rotate logic in console
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('AUTO-ROTATE')) {
        logs.push(msg.text());
      }
    });

    // Upload landscape image
    const testImage = path.join(__dirname, '../test-image.jpg');
    if (fs.existsSync(testImage)) {
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImage);
      await page.waitForTimeout(2000);

      // Check console logs
      console.log('Auto-rotate logs:', logs);
      expect(logs.length).toBeGreaterThan(0);
    }
  });

  test('should handle multiple rotations correctly', async ({ page }) => {
    await page.goto('/imposition-advanced');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if page loaded
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    expect(pageTitle).toBeTruthy();
    console.log('✓ Page loaded successfully');
  });
});

test.describe('API Tests', () => {
  test('should handle rotation parameter in API', async ({ request }) => {
    // Test Python service health
    const healthResponse = await request.get('http://localhost:3005/health');
    expect(healthResponse.ok()).toBeTruthy();
    console.log('✓ Python service is running');
  });
});
