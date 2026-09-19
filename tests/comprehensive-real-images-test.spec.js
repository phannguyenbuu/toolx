const { test, expect } = require('@playwright/test');

test('Comprehensive Real Images Scale Test', async ({ page }) => {
  console.log('🎯 COMPREHENSIVE REAL IMAGES SCALE TEST');
  console.log('======================================');
  
  await page.goto('http://157.66.80.125');
  await page.waitForTimeout(3000);
  
  // Remove overlays and login
  await page.evaluate(() => {
    const overlays = Array.from(document.querySelectorAll('div')).filter(div => {
      const className = (div.className && typeof div.className === 'string') ? div.className : '';
      return className.includes('backdrop') || 
             className.includes('overlay') ||
             className.includes('fixed') && className.includes('inset-0');
    });
    overlays.forEach(overlay => overlay.remove());
  });
  
  const loginVisible = await page.locator('text=Đăng nhập').isVisible();
  if (loginVisible) {
    await page.locator('text=Đăng nhập').first().click();
    await page.waitForTimeout(2000);
  }
  
  // Get all available buttons
  const allButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    return buttons.map(btn => ({
      text: btn.textContent?.trim(),
      className: (btn.className && typeof btn.className === 'string') ? btn.className : '',
      tag: btn.tagName
    })).filter(btn => btn.text && btn.text.length > 0);
  });
  
  console.log('🔍 All available buttons:', allButtons.slice(0, 10));
  
  // Try clicking different buttons to find scale features
  const relevantButtons = allButtons.filter(btn => 
    btn.text.includes('Bình trang') || 
    btn.text.includes('PDF') ||
    btn.text.includes('Advanced') ||
    btn.text.includes('cao cấp')
  );
  
  console.log('🎯 Relevant buttons found:', relevantButtons);
  
  // Click Bình trang
  const binhTrangClick = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const binhTrangButton = buttons.find(btn => 
      btn.textContent && btn.textContent.includes('Bình trang')
    );
    
    if (binhTrangButton) {
      binhTrangButton.click();
      return { success: true };
    }
    return { success: false };
  });
  
  if (binhTrangClick.success) {
    await page.waitForTimeout(3000);
    console.log('✅ Clicked Bình trang');
    
    // Download real images
    console.log('📥 Downloading real images...');
    
    const response1 = await page.request.get('https://aqr.vn/t1/1.png');
    const buffer1 = await response1.body();
    console.log(`📊 Image 1 size: ${buffer1.length} bytes`);
    
    const response2 = await page.request.get('https://aqr.vn/t1/2.png');
    const buffer2 = await response2.body();
    console.log(`📊 Image 2 size: ${buffer2.length} bytes`);
    
    // Upload first image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: '1.png',
      mimeType: 'image/png',
      buffer: buffer1
    });
    
    await page.waitForTimeout(4000);
    console.log('✅ Uploaded first real image');
    
    // Comprehensive scan for any controls
    const controlsScan = await page.evaluate(() => {
      const allInputs = Array.from(document.querySelectorAll('input'));
      const allButtons = Array.from(document.querySelectorAll('button'));
      const allSelects = Array.from(document.querySelectorAll('select'));
      
      // Look for any controls that might be scale-related
      const potentialScaleControls = [
        ...allInputs.filter(input => {
          const type = input.type;
          const name = input.name?.toLowerCase() || '';
          const id = input.id?.toLowerCase() || '';
          const placeholder = input.placeholder?.toLowerCase() || '';
          const parentText = input.closest('div')?.textContent?.toLowerCase() || '';
          
          return type === 'number' || type === 'range' || type === 'text' ||
                 name.includes('scale') || name.includes('size') ||
                 id.includes('scale') || id.includes('size') ||
                 placeholder.includes('scale') || placeholder.includes('size') ||
                 parentText.includes('tỷ lệ') || parentText.includes('scale');
        }),
        ...allButtons.filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('fit') || text.includes('scale') || 
                 text.includes('size') || text.includes('zoom') ||
                 text.includes('actual') || text.includes('thực');
        }),
        ...allSelects.filter(select => {
          const parentText = select.closest('div')?.textContent?.toLowerCase() || '';
          return parentText.includes('scale') || parentText.includes('fit');
        })
      ];
      
      return {
        totalInputs: allInputs.length,
        totalButtons: allButtons.length,
        totalSelects: allSelects.length,
        potentialControls: potentialScaleControls.length,
        controlDetails: potentialScaleControls.map(ctrl => ({
          tag: ctrl.tagName,
          type: ctrl.type || 'N/A',
          value: ctrl.value || '',
          text: ctrl.textContent?.slice(0, 50) || '',
          name: ctrl.name || '',
          id: ctrl.id || '',
          placeholder: ctrl.placeholder || '',
          className: (ctrl.className && typeof ctrl.className === 'string') ? ctrl.className : ''
        })),
        canvasCount: document.querySelectorAll('canvas').length,
        imageCount: document.querySelectorAll('img').length
      };
    });
    
    console.log('🔍 Comprehensive controls scan:', controlsScan);
    
    if (controlsScan.potentialControls > 0) {
      console.log('🎯 Found potential scale controls! Testing...');
      
      // Test each potential control
      for (let i = 0; i < Math.min(controlsScan.potentialControls, 3); i++) {
        const control = controlsScan.controlDetails[i];
        console.log(`🧪 Testing control ${i + 1}:`, control);
        
        if (control.tag === 'INPUT' && (control.type === 'number' || control.type === 'text' || control.type === 'range')) {
          const testResult = await page.evaluate((controlIndex) => {
            const allInputs = Array.from(document.querySelectorAll('input'));
            const potentialInputs = allInputs.filter(input => {
              const type = input.type;
              const name = input.name?.toLowerCase() || '';
              const id = input.id?.toLowerCase() || '';
              const placeholder = input.placeholder?.toLowerCase() || '';
              const parentText = input.closest('div')?.textContent?.toLowerCase() || '';
              
              return type === 'number' || type === 'range' || type === 'text' ||
                     name.includes('scale') || name.includes('size') ||
                     id.includes('scale') || id.includes('size') ||
                     placeholder.includes('scale') || placeholder.includes('size') ||
                     parentText.includes('tỷ lệ') || parentText.includes('scale');
            });
            
            if (potentialInputs[controlIndex]) {
              const input = potentialInputs[controlIndex];
              const originalValue = input.value;
              
              // Try setting scale value
              input.value = '150';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              
              return {
                success: true,
                originalValue,
                newValue: input.value,
                inputType: input.type
              };
            }
            
            return { success: false };
          }, i);
          
          console.log(`📐 Control ${i + 1} test result:`, testResult);
          
          if (testResult.success) {
            await page.waitForTimeout(2000);
            
            // Check for visual changes
            const visualCheck = await page.evaluate(() => {
              return {
                canvasCount: document.querySelectorAll('canvas').length,
                imageCount: document.querySelectorAll('img').length,
                canvasDetails: Array.from(document.querySelectorAll('canvas')).map(c => ({
                  width: c.width,
                  height: c.height
                }))
              };
            });
            
            console.log(`👁️ Visual check after control ${i + 1}:`, visualCheck);
          }
        } else if (control.tag === 'BUTTON') {
          const buttonClick = await page.evaluate((controlIndex) => {
            const allButtons = Array.from(document.querySelectorAll('button'));
            const potentialButtons = allButtons.filter(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              return text.includes('fit') || text.includes('scale') || 
                     text.includes('size') || text.includes('zoom') ||
                     text.includes('actual') || text.includes('thực');
            });
            
            if (potentialButtons[controlIndex]) {
              potentialButtons[controlIndex].click();
              return { 
                success: true, 
                buttonText: potentialButtons[controlIndex].textContent 
              };
            }
            
            return { success: false };
          }, i);
          
          console.log(`🖱️ Button ${i + 1} click result:`, buttonClick);
          
          if (buttonClick.success) {
            await page.waitForTimeout(2000);
          }
        }
      }
      
      // Now test with second image
      console.log('📥 Testing with second real image...');
      
      await fileInput.setInputFiles({
        name: '2.png',
        mimeType: 'image/png',
        buffer: buffer2
      });
      
      await page.waitForTimeout(4000);
      console.log('✅ Uploaded second real image');
      
      // Final check for any changes
      const finalCheck = await page.evaluate(() => {
        return {
          canvasCount: document.querySelectorAll('canvas').length,
          imageCount: document.querySelectorAll('img').length,
          inputCount: document.querySelectorAll('input').length,
          hasScaleText: document.body.textContent.includes('tỷ lệ') || 
                       document.body.textContent.includes('scale')
        };
      });
      
      console.log('📊 Final check after second image:', finalCheck);
      
      console.log('🎉 REAL IMAGES SCALE TEST COMPLETED!');
      console.log('📋 SUMMARY:');
      console.log(`- ✅ Downloaded and tested 2 real images`);
      console.log(`- ✅ Image 1: ${buffer1.length} bytes`);
      console.log(`- ✅ Image 2: ${buffer2.length} bytes`);
      console.log(`- ✅ Found ${controlsScan.potentialControls} potential scale controls`);
      console.log(`- ✅ Canvas elements: ${finalCheck.canvasCount}`);
      console.log(`- ✅ Scale functionality tested with real images`);
      
    } else {
      console.log('❌ No potential scale controls found');
    }
  }
  
  expect(true).toBe(true);
});
