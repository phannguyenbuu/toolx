const { test, expect } = require('@playwright/test');

test.describe('Imposition Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/imposition-advanced');
    await page.waitForLoadState('networkidle');
  });

  test('should load page successfully', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Phần mềm quản lý hệ thống in ấn');
    console.log('✓ Page loaded with correct title');
  });

  test('should have file upload input', async ({ page }) => {
    await page.waitForTimeout(2000);
    const fileInputs = await page.locator('input[type="file"]').count();
    expect(fileInputs).toBeGreaterThan(0);
    console.log('✓ File upload input is available');
  });

  test('should have paper size options', async ({ page }) => {
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    const hasPaperSize = pageContent.includes('A4') || pageContent.includes('A3') || pageContent.includes('210') || pageContent.includes('297');
    expect(hasPaperSize).toBeTruthy();
    console.log('✓ Paper size options available');
  });

  test('should have output format options', async ({ page }) => {
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    const hasFormat = pageContent.toLowerCase().includes('pdf') || pageContent.includes('generate');
    expect(hasFormat).toBeTruthy();
    console.log('✓ Output format options available');
  });
});

test.describe('Navigation', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('✓ Home page accessible');
  });

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = await page.locator('nav, header').first();
    expect(await nav.isVisible()).toBeTruthy();
    console.log('✓ Navigation menu visible');
  });
});
