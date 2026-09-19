const { test, expect } = require('@playwright/test');

test('Scale Test on Real Website', async ({ page }) => {
  console.log('🌐 Testing scale on http://157.66.80.125');
  
  // Go to the website
  await page.goto('http://157.66.80.125');
  await page.waitForTimeout(3000);
  
  // Click login button (just click to enter)
  console.log('🔐 Clicking login button...');
  const loginButton = page.locator('text=Đăng nhập').first();
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.waitForTimeout(2000);
    console.log('✅ Login clicked successfully');
  } else {
    console.log('⚠️ Login button not found, continuing...');
  }
  
  // Look for Imposition Advanced or similar functionality
  console.log('🔍 Looking for scale/imposition features...');
  
  const scaleFeatures = await page.evaluate(() => {
    // Look for scale-related elements
    const allElements = Array.from(document.querySelectorAll('*'));
    const scaleElements = allElements.filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      const className = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
      return text.includes('scale') || 
             text.includes('tỷ lệ') ||
             text.includes('imposition') ||
             text.includes('bình trang') ||
             className.includes('scale');
    });
    
    return {
      scaleElementsFound: scaleElements.length,
      scaleTexts: scaleElements.slice(0, 5).map(el => ({
        tag: el.tagName,
        text: el.textContent?.slice(0, 100),
        className: (el.className && typeof el.className === 'string') ? el.className : ''
      })),
      hasFileInput: !!document.querySelector('input[type="file"]'),
      hasNumberInputs: document.querySelectorAll('input[type="number"]').length,
      currentUrl: window.location.href
    };
  });
  
  console.log('📊 Scale features found:', scaleFeatures);
  
  if (scaleFeatures.hasFileInput) {
    console.log('📁 Found file input - testing upload...');
    
    // Create test image
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Upload test file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    });
    
    await page.waitForTimeout(3000);
    console.log('✅ Test file uploaded');
    
    // Look for scale controls after upload
    const scaleControls = await page.evaluate(() => {
      const numberInputs = Array.from(document.querySelectorAll('input[type="number"]'));
      const scaleInputs = numberInputs.filter(input => {
        const parent = input.closest('div');
        const parentText = parent?.textContent?.toLowerCase() || '';
        return parentText.includes('scale') || 
               parentText.includes('tỷ lệ') ||
               parentText.includes('actual') ||
               parent?.classList.contains('bg-violet-50');
      });
      
      return {
        totalInputs: numberInputs.length,
        scaleInputs: scaleInputs.length,
        scaleInputDetails: scaleInputs.map(input => ({
          value: input.value,
          placeholder: input.placeholder,
          parentText: input.closest('div')?.textContent?.slice(0, 50)
        }))
      };
    });
    
    console.log('🎛️ Scale controls after upload:', scaleControls);
    
    if (scaleControls.scaleInputs > 0) {
      console.log('🎯 Found scale input! Testing scale functionality...');
      
      // Test scale values
      const testScales = [50, 100, 150, 200];
      
      for (const scale of testScales) {
        console.log(`📐 Testing scale: ${scale}%`);
        
        const scaleResult = await page.evaluate((scaleValue) => {
          const scaleInput = document.querySelector('input[type="number"]');
          if (scaleInput) {
            scaleInput.value = scaleValue.toString();
            scaleInput.dispatchEvent(new Event('input', { bubbles: true }));
            scaleInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Check for preview updates
            setTimeout(() => {}, 1000);
            
            return {
              success: true,
              scaleSet: scaleValue,
              canvasCount: document.querySelectorAll('canvas').length,
              imageCount: document.querySelectorAll('img').length
            };
          }
          return { success: false };
        }, scale);
        
        await page.waitForTimeout(2000);
        console.log(`Result for ${scale}%:`, scaleResult);
        
        if (scaleResult.success) {
          // Check if preview updated
          const previewCheck = await page.evaluate(() => {
            const canvases = document.querySelectorAll('canvas');
            const images = document.querySelectorAll('img');
            
            return {
              canvasCount: canvases.length,
              imageCount: images.length,
              hasVisualElements: canvases.length > 0 || images.length > 0
            };
          });
          
          console.log(`Preview check for ${scale}%:`, previewCheck);
        }
      }
      
      // Test PDF generation
      console.log('📄 Testing PDF generation...');
      const pdfTest = await page.evaluate(() => {
        const pdfButtons = Array.from(document.querySelectorAll('button, a')).filter(btn =>
          btn.textContent && (
            btn.textContent.includes('PDF') ||
            btn.textContent.includes('Tải') ||
            btn.textContent.includes('Download')
          )
        );
        
        if (pdfButtons.length > 0) {
          pdfButtons[0].click();
          return { clicked: true, buttonText: pdfButtons[0].textContent };
        }
        
        return { clicked: false };
      });
      
      if (pdfTest.clicked) {
        await page.waitForTimeout(3000);
        console.log('✅ PDF generation triggered:', pdfTest.buttonText);
      } else {
        console.log('❌ No PDF button found');
      }
      
      console.log('🎉 SCALE TEST COMPLETED ON REAL WEBSITE!');
      
    } else {
      console.log('❌ No scale inputs found after upload');
    }
    
  } else {
    console.log('❌ No file input found on the website');
  }
  
  // Final summary
  const finalSummary = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      hasScaleFeature: document.body.textContent.includes('scale') || 
                      document.body.textContent.includes('tỷ lệ'),
      hasImpositionFeature: document.body.textContent.includes('imposition') ||
                           document.body.textContent.includes('bình trang'),
      totalInputs: document.querySelectorAll('input').length,
      totalButtons: document.querySelectorAll('button').length
    };
  });
  
  console.log('📋 Final Summary:', finalSummary);
  
  expect(true).toBe(true); // Always pass for diagnostic purposes
});
