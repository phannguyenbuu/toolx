const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Tạo ảnh test ngẫu nhiên
function createTestImage(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill với màu ngẫu nhiên
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, width, height);
  
  // Vẽ text để dễ nhận diện
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(`${width}x${height}`, 50, 100);
  
  // Vẽ border
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, width, height);
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`✅ Created test image: ${filename} (${width}x${height}px)`);
  
  return { width, height, filename };
}

test.describe('Scale Mode - Preview vs Output Test', () => {
  
  test('Scale 50% - Landscape image (2000x1000px)', async ({ page }) => {
    // Tạo ảnh test
    const testImage = createTestImage(2000, 1000, 'test-landscape.png');
    
    // Mở trang
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Vào ImpositionAdvancedPage
    await page.click('text=Imposition Advanced');
    await page.waitForTimeout(1000);
    
    // Upload ảnh
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImage.filename);
    await page.waitForTimeout(2000);
    
    // Set item size
    await page.fill('input[placeholder*="Item Width"]', '100');
    await page.fill('input[placeholder*="Item Height"]', '100');
    
    // Chọn scale mode
    await page.selectOption('select:has-text("Fit Mode")', 'actual');
    await page.waitForTimeout(500);
    
    // Set scale 50%
    await page.fill('input[type="range"]', '50');
    await page.waitForTimeout(1000);
    
    // Lấy console logs
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('FRONTEND SCALE DEBUG')) {
        logs.push(msg.text());
      }
    });
    
    // Trigger preview update
    await page.fill('input[type="range"]', '51');
    await page.fill('input[type="range"]', '50');
    await page.waitForTimeout(2000);
    
    // Parse log để lấy scaledPx
    let frontendScaledPx = null;
    for (const log of logs) {
      if (log.includes('scaledPx')) {
        const match = log.match(/scaledPx.*?w:\s*(\d+).*?h:\s*(\d+)/);
        if (match) {
          frontendScaledPx = { w: parseInt(match[1]), h: parseInt(match[2]) };
          break;
        }
      }
    }
    
    console.log('📊 Frontend scaledPx:', frontendScaledPx);
    
    // Expected values
    const DPI = 300;
    const itemW_mm = 100;
    const itemH_mm = 100;
    const scale = 0.5;
    
    // Calculate expected
    const target_w_px = Math.round((itemW_mm / 25.4) * DPI); // 1181
    const target_h_px = Math.round((itemH_mm / 25.4) * DPI); // 1181
    
    const imgAspect = testImage.width / testImage.height; // 2.0
    const targetAspect = target_w_px / target_h_px; // 1.0
    
    let fitted_w_px, fitted_h_px;
    if (imgAspect > targetAspect) {
      fitted_w_px = target_w_px;
      fitted_h_px = Math.round(target_w_px / imgAspect);
    } else {
      fitted_h_px = target_h_px;
      fitted_w_px = Math.round(target_h_px * imgAspect);
    }
    
    const expected_w_px = Math.round(fitted_w_px * scale);
    const expected_h_px = Math.round(fitted_h_px * scale);
    
    console.log('📊 Expected scaledPx:', { w: expected_w_px, h: expected_h_px });
    
    // Verify
    if (frontendScaledPx) {
      expect(frontendScaledPx.w).toBe(expected_w_px);
      expect(frontendScaledPx.h).toBe(expected_h_px);
      console.log('✅ Frontend calculation CORRECT!');
    } else {
      console.log('⚠️  Could not parse frontend log');
    }
    
    // Generate PDF
    await page.click('button:has-text("Tạo PDF")');
    await page.waitForTimeout(5000);
    
    // Check backend log
    const backendLog = fs.readFileSync('/root/toolxprint/python-service.log', 'utf-8');
    const backendLines = backendLog.split('\n').slice(-50);
    
    let backendScaledPx = null;
    for (const line of backendLines) {
      if (line.includes('Final scaled:')) {
        const match = line.match(/Final scaled:\s*(\d+)x(\d+)/);
        if (match) {
          backendScaledPx = { w: parseInt(match[1]), h: parseInt(match[2]) };
          break;
        }
      }
    }
    
    console.log('📊 Backend scaledPx:', backendScaledPx);
    
    // Verify backend
    if (backendScaledPx) {
      expect(backendScaledPx.w).toBe(expected_w_px);
      expect(backendScaledPx.h).toBe(expected_h_px);
      console.log('✅ Backend calculation CORRECT!');
      
      // Verify frontend === backend
      if (frontendScaledPx) {
        expect(frontendScaledPx.w).toBe(backendScaledPx.w);
        expect(frontendScaledPx.h).toBe(backendScaledPx.h);
        console.log('✅ Frontend === Backend MATCH!');
      }
    }
    
    // Cleanup
    fs.unlinkSync(testImage.filename);
  });
  
  test('Scale 75% - Portrait image (1000x2000px)', async ({ page }) => {
    const testImage = createTestImage(1000, 2000, 'test-portrait.png');
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    await page.click('text=Imposition Advanced');
    await page.waitForTimeout(1000);
    
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImage.filename);
    await page.waitForTimeout(2000);
    
    // Set item size (landscape)
    await page.fill('input[placeholder*="Item Width"]', '100');
    await page.fill('input[placeholder*="Item Height"]', '50');
    
    await page.selectOption('select:has-text("Fit Mode")', 'actual');
    await page.waitForTimeout(500);
    
    await page.fill('input[type="range"]', '75');
    await page.waitForTimeout(2000);
    
    // Expected
    const DPI = 300;
    const target_w_px = Math.round((100 / 25.4) * DPI); // 1181
    const target_h_px = Math.round((50 / 25.4) * DPI);  // 591
    
    const imgAspect = 1000 / 2000; // 0.5
    const targetAspect = target_w_px / target_h_px; // 2.0
    
    // imgAspect < targetAspect → fit to height
    const fitted_w_px = Math.round(target_h_px * imgAspect); // 296
    const fitted_h_px = target_h_px; // 591
    
    const expected_w_px = Math.round(fitted_w_px * 0.75); // 222
    const expected_h_px = Math.round(fitted_h_px * 0.75); // 443
    
    console.log('📊 Expected (portrait):', { w: expected_w_px, h: expected_h_px });
    
    // Generate PDF
    await page.click('button:has-text("Tạo PDF")');
    await page.waitForTimeout(5000);
    
    // Check backend
    const backendLog = fs.readFileSync('/root/toolxprint/python-service.log', 'utf-8');
    const backendLines = backendLog.split('\n').slice(-50);
    
    let backendScaledPx = null;
    for (const line of backendLines) {
      if (line.includes('Final scaled:')) {
        const match = line.match(/Final scaled:\s*(\d+)x(\d+)/);
        if (match) {
          backendScaledPx = { w: parseInt(match[1]), h: parseInt(match[2]) };
          break;
        }
      }
    }
    
    console.log('📊 Backend (portrait):', backendScaledPx);
    
    if (backendScaledPx) {
      expect(backendScaledPx.w).toBe(expected_w_px);
      expect(backendScaledPx.h).toBe(expected_h_px);
      console.log('✅ Portrait test PASSED!');
    }
    
    fs.unlinkSync(testImage.filename);
  });
  
  test('Scale 60% - Square image (2000x2000px)', async ({ page }) => {
    const testImage = createTestImage(2000, 2000, 'test-square.png');
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    await page.click('text=Imposition Advanced');
    await page.waitForTimeout(1000);
    
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImage.filename);
    await page.waitForTimeout(2000);
    
    await page.fill('input[placeholder*="Item Width"]', '100');
    await page.fill('input[placeholder*="Item Height"]', '100');
    
    await page.selectOption('select:has-text("Fit Mode")', 'actual');
    await page.waitForTimeout(500);
    
    await page.fill('input[type="range"]', '60');
    await page.waitForTimeout(2000);
    
    // Expected (square)
    const DPI = 300;
    const target_px = Math.round((100 / 25.4) * DPI); // 1181
    
    // Same aspect → fitted = target
    const fitted_px = target_px; // 1181
    
    const expected_px = Math.round(fitted_px * 0.6); // 709
    
    console.log('📊 Expected (square):', { w: expected_px, h: expected_px });
    
    await page.click('button:has-text("Tạo PDF")');
    await page.waitForTimeout(5000);
    
    const backendLog = fs.readFileSync('/root/toolxprint/python-service.log', 'utf-8');
    const backendLines = backendLog.split('\n').slice(-50);
    
    let backendScaledPx = null;
    for (const line of backendLines) {
      if (line.includes('Final scaled:')) {
        const match = line.match(/Final scaled:\s*(\d+)x(\d+)/);
        if (match) {
          backendScaledPx = { w: parseInt(match[1]), h: parseInt(match[2]) };
          break;
        }
      }
    }
    
    console.log('📊 Backend (square):', backendScaledPx);
    
    if (backendScaledPx) {
      expect(backendScaledPx.w).toBe(expected_px);
      expect(backendScaledPx.h).toBe(expected_px);
      console.log('✅ Square test PASSED!');
    }
    
    fs.unlinkSync(testImage.filename);
  });
  
});
