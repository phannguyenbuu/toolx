#!/usr/bin/env node

const fs = require('fs');
const { createCanvas } = require('canvas');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  SCALE MODE CALCULATION TEST                               ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// Test function
function testScaleCalculation(imgW, imgH, itemW_mm, itemH_mm, scale_percent, testName) {
  console.log(`\n📊 Test: ${testName}`);
  console.log(`   Image: ${imgW}x${imgH}px`);
  console.log(`   Item: ${itemW_mm}x${itemH_mm}mm`);
  console.log(`   Scale: ${scale_percent}%`);
  console.log('');
  
  const DPI = 300;
  const scale = scale_percent / 100;
  
  // Step 1: mm → px
  const target_w_px = Math.round((itemW_mm / 25.4) * DPI);
  const target_h_px = Math.round((itemH_mm / 25.4) * DPI);
  console.log(`   Step 1 (mm→px): target = ${target_w_px}x${target_h_px}px`);
  
  // Step 2: Fit (contain)
  const imgAspect = imgW / imgH;
  const targetAspect = target_w_px / target_h_px;
  
  let fitted_w_px, fitted_h_px;
  if (imgAspect > targetAspect) {
    fitted_w_px = target_w_px;
    fitted_h_px = Math.round(target_w_px / imgAspect);
  } else {
    fitted_h_px = target_h_px;
    fitted_w_px = Math.round(target_h_px * imgAspect);
  }
  console.log(`   Step 2 (fit): fitted = ${fitted_w_px}x${fitted_h_px}px`);
  console.log(`      imgAspect=${imgAspect.toFixed(3)}, targetAspect=${targetAspect.toFixed(3)}`);
  
  // Step 3: Scale
  const scaled_w_px = Math.round(fitted_w_px * scale);
  const scaled_h_px = Math.round(fitted_h_px * scale);
  console.log(`   Step 3 (scale): scaled = ${scaled_w_px}x${scaled_h_px}px`);
  
  // Step 4: px → mm
  const scaled_w_mm = (scaled_w_px / DPI) * 25.4;
  const scaled_h_mm = (scaled_h_px / DPI) * 25.4;
  console.log(`   Step 4 (px→mm): ${scaled_w_mm.toFixed(2)}x${scaled_h_mm.toFixed(2)}mm`);
  
  console.log('');
  console.log(`   ✅ Expected output: ${scaled_w_px}x${scaled_h_px}px (${scaled_w_mm.toFixed(2)}x${scaled_h_mm.toFixed(2)}mm)`);
  
  return {
    scaledPx: { w: scaled_w_px, h: scaled_h_px },
    scaledMm: { w: scaled_w_mm, h: scaled_h_mm }
  };
}

// Run tests
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  TEST CASES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const test1 = testScaleCalculation(2000, 1000, 100, 100, 50, 'Landscape @ 50%');
const test2 = testScaleCalculation(1000, 2000, 100, 50, 75, 'Portrait @ 75%');
const test3 = testScaleCalculation(2000, 2000, 100, 100, 60, 'Square @ 60%');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Test 1 (Landscape 2000x1000px @ 50%):');
console.log(`  Expected: ${test1.scaledPx.w}x${test1.scaledPx.h}px = ${test1.scaledMm.w.toFixed(2)}x${test1.scaledMm.h.toFixed(2)}mm`);
console.log('');
console.log('Test 2 (Portrait 1000x2000px @ 75%):');
console.log(`  Expected: ${test2.scaledPx.w}x${test2.scaledPx.h}px = ${test2.scaledMm.w.toFixed(2)}x${test2.scaledMm.h.toFixed(2)}mm`);
console.log('');
console.log('Test 3 (Square 2000x2000px @ 60%):');
console.log(`  Expected: ${test3.scaledPx.w}x${test3.scaledPx.h}px = ${test3.scaledMm.w.toFixed(2)}x${test3.scaledMm.h.toFixed(2)}mm`);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('✅ Calculation test complete!');
console.log('');
console.log('To verify:');
console.log('  1. Upload these images to ImpositionAdvancedPage');
console.log('  2. Set item size and scale as shown above');
console.log('  3. Check console log "🔍 FRONTEND SCALE DEBUG"');
console.log('  4. Verify scaledPx matches expected values');
console.log('  5. Generate PDF and check backend log');
console.log('  6. Verify backend scaledPx matches expected values');
console.log('');

// Create test images
console.log('Creating test images...');
console.log('');

function createTestImage(width, height, filename, label) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#4CAF50');
  gradient.addColorStop(1, '#2196F3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, width/2, height/2 - 40);
  ctx.font = '60px Arial';
  ctx.fillText(`${width}x${height}px`, width/2, height/2 + 40);
  
  // Border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, width-20, height-20);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`  ✅ ${filename} (${width}x${height}px)`);
}

createTestImage(2000, 1000, 'test-landscape-2000x1000.png', 'LANDSCAPE');
createTestImage(1000, 2000, 'test-portrait-1000x2000.png', 'PORTRAIT');
createTestImage(2000, 2000, 'test-square-2000x2000.png', 'SQUARE');

console.log('');
console.log('✅ Test images created!');
console.log('');
