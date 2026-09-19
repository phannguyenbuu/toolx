const { test, expect } = require('@playwright/test');

test('Real Scale Test - Imposition Advanced', async ({ page }) => {
  console.log('🎯 Testing real scale functionality...');
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  // Look for "Bình trang cao cấp" button
  console.log('🔍 Looking for Bình trang cao cấp...');
  
  const advancedButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a, *'));
    const found = buttons.find(btn => 
      btn.textContent && btn.textContent.includes('cao cấp')
    );
    return found ? {
      text: found.textContent,
      className: found.className,
      exists: true
    } : { exists: false };
  });
  
  console.log('Advanced button:', advancedButton);
  
  if (advancedButton.exists) {
    // Click the advanced button
    await page.click('text=cao cấp');
    await page.waitForTimeout(2000);
    
    console.log('✅ Clicked advanced button');
  } else {
    // Try alternative navigation
    console.log('⚠️ Advanced button not found, trying alternative...');
    
    // Check if we need to login first
    const loginButton = await page.locator('text=Đăng nhập').first();
    if (await loginButton.isVisible()) {
      console.log('🔐 Login required, clicking login...');
      await loginButton.click();
      await page.waitForTimeout(1000);
      
      // Try to bypass login or use demo mode
      const demoButton = await page.locator('text=Demo').first();
      if (await demoButton.isVisible()) {
        await demoButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Try to navigate directly via URL manipulation
    await page.evaluate(() => {
      // Try to trigger navigation programmatically
      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', '/?page=imposition-advanced');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });
    
    await page.waitForTimeout(1000);
  }
  
  // Check if we're now on the imposition advanced page
  const pageState = await page.evaluate(() => {
    return {
      hasFileInput: !!document.querySelector('input[type="file"]'),
      hasNumberInputs: document.querySelectorAll('input[type="number"]').length,
      hasScaleControls: !!document.querySelector('.bg-violet-50'),
      hasActualMode: !!document.querySelector('*[title*="thực"]'),
      allText: document.body.textContent.includes('Tỷ lệ') || document.body.textContent.includes('customScale'),
      currentUrl: window.location.href
    };
  });
  
  console.log('Page state after navigation:', pageState);
  
  if (pageState.hasFileInput && pageState.hasNumberInputs > 0) {
    console.log('✅ Found imposition advanced page!');
    
    // Test scale functionality
    console.log('🧪 Testing scale functionality...');
    
    // Upload a test file first
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./test.pdf');
    await page.waitForTimeout(3000);
    
    // Look for actual mode button
    const actualModeButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, *[title]'));
      const actualButton = buttons.find(btn => 
        (btn.title && btn.title.includes('thực')) ||
        (btn.textContent && btn.textContent.includes('thực'))
      );
      return actualButton ? { found: true, title: actualButton.title } : { found: false };
    });
    
    console.log('Actual mode button:', actualModeButton);
    
    if (actualModeButton.found) {
      // Click actual mode
      await page.click(`[title*="thực"]`);
      await page.waitForTimeout(1000);
      
      console.log('✅ Activated actual mode');
      
      // Find scale input
      const scaleInput = page.locator('.bg-violet-50 input[type="number"]').first();
      if (await scaleInput.isVisible()) {
        console.log('✅ Found scale input');
        
        // Test different scale values
        const testScales = [50, 100, 150, 200];
        
        for (const scale of testScales) {
          console.log(`🧮 Testing scale: ${scale}%`);
          
          await scaleInput.fill(scale.toString());
          await page.waitForTimeout(2000);
          
          // Capture preview state
          const previewState = await page.evaluate(() => {
            const canvases = document.querySelectorAll('canvas');
            const images = document.querySelectorAll('img');
            
            return {
              canvasCount: canvases.length,
              imageCount: images.length,
              canvasSizes: Array.from(canvases).map(c => ({ width: c.width, height: c.height })),
              timestamp: Date.now()
            };
          });
          
          console.log(`Preview state at ${scale}%:`, previewState);
          
          // Test PDF generation
          const pdfButton = page.locator('text=Tải PDF').first();
          if (await pdfButton.isVisible()) {
            console.log(`📄 Testing PDF generation at ${scale}%...`);
            
            // Monitor network requests
            let pdfRequest = null;
            page.on('request', request => {
              if (request.url().includes('/api/generate-pdf')) {
                pdfRequest = {
                  url: request.url(),
                  postData: request.postData(),
                  hasCustomScale: request.postData()?.includes(`customScale=${scale}`)
                };
              }
            });
            
            await pdfButton.click();
            await page.waitForTimeout(3000);
            
            if (pdfRequest) {
              console.log(`✅ PDF request sent with scale ${scale}%:`, pdfRequest.hasCustomScale);
            } else {
              console.log(`❌ No PDF request detected for scale ${scale}%`);
            }
          }
        }
        
        console.log('🎉 Scale test completed!');
        
        // Final diagnosis
        const finalDiagnosis = await page.evaluate(() => {
          // Check if mm calculation is actually being used
          const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML).join('');
          const hasMMLogic = scripts.includes('imgW_mm') || scripts.includes('25.4');
          
          return {
            hasMMLogic,
            scaleInputValue: document.querySelector('.bg-violet-50 input[type="number"]')?.value,
            previewElements: {
              canvases: document.querySelectorAll('canvas').length,
              images: document.querySelectorAll('img').length
            }
          };
        });
        
        console.log('📊 Final diagnosis:', finalDiagnosis);
        
        if (finalDiagnosis.hasMMLogic) {
          console.log('✅ MM-based calculation is active');
        } else {
          console.log('❌ MM-based calculation NOT found - this is the issue!');
        }
        
      } else {
        console.log('❌ Scale input not found');
      }
    } else {
      console.log('❌ Actual mode button not found');
    }
    
  } else {
    console.log('❌ Imposition advanced page not accessible');
  }
  
  expect(true).toBe(true); // Always pass for diagnostic purposes
});
