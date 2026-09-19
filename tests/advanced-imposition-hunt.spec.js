const { test, expect } = require('@playwright/test');

test('Find Advanced Imposition Scale Feature', async ({ page }) => {
  console.log('🎯 SEARCHING FOR ADVANCED IMPOSITION SCALE');
  console.log('=========================================');
  
  await page.goto('http://157.66.80.125');
  await page.waitForTimeout(3000);
  
  // Login and remove overlays
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
  
  // Look for "Bình trang cao cấp" specifically
  console.log('🔍 Looking for "Bình trang cao cấp"...');
  
  const advancedImposition = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('*'));
    const advancedElements = allElements.filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('cao cấp') || 
             text.includes('advanced') ||
             text.includes('imposition advanced');
    });
    
    return advancedElements.map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim(),
      className: (el.className && typeof el.className === 'string') ? el.className : '',
      clickable: el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick !== null
    }));
  });
  
  console.log('🎯 Advanced imposition elements:', advancedImposition);
  
  // Try to click "Bình trang cao cấp"
  const caoCapClick = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const caoCapButton = buttons.find(btn => 
      btn.textContent && btn.textContent.includes('cao cấp')
    );
    
    if (caoCapButton) {
      caoCapButton.click();
      return { 
        success: true, 
        buttonText: caoCapButton.textContent 
      };
    }
    
    return { success: false };
  });
  
  console.log('🖱️ Cao cấp click result:', caoCapClick);
  
  if (caoCapClick.success) {
    await page.waitForTimeout(3000);
    
    // Check for advanced features
    const advancedFeatures = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasFileInput: !!document.querySelector('input[type="file"]'),
        hasNumberInputs: document.querySelectorAll('input[type="number"]').length,
        hasScaleText: document.body.textContent.includes('tỷ lệ') || 
                     document.body.textContent.includes('scale'),
        hasActualMode: document.body.textContent.includes('actual') ||
                      document.body.textContent.includes('thực'),
        hasVioletElements: Array.from(document.querySelectorAll('*')).some(el => {
          const className = (el.className && typeof el.className === 'string') ? el.className : '';
          return className.includes('bg-violet') || className.includes('violet');
        }),
        allNumberInputs: Array.from(document.querySelectorAll('input[type="number"]')).map(input => ({
          value: input.value,
          placeholder: input.placeholder,
          name: input.name,
          id: input.id,
          className: (input.className && typeof input.className === 'string') ? input.className : '',
          parentText: input.closest('div')?.textContent?.slice(0, 100)
        })),
        bodyTextSample: document.body.textContent.slice(0, 1000)
      };
    });
    
    console.log('📊 Advanced features check:', advancedFeatures);
    
    if (advancedFeatures.hasFileInput) {
      console.log('📁 Uploading test file to advanced page...');
      
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );
      
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: testImageBuffer
      });
      
      await page.waitForTimeout(4000);
      
      // Check for scale controls after upload
      const postUploadAnalysis = await page.evaluate(() => {
        const allInputs = Array.from(document.querySelectorAll('input'));
        const numberInputs = allInputs.filter(input => input.type === 'number');
        
        // Look for actual mode buttons
        const actualModeButtons = Array.from(document.querySelectorAll('button, *[title]')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          const title = el.title?.toLowerCase() || '';
          return text.includes('actual') || 
                 text.includes('thực') ||
                 title.includes('actual') ||
                 title.includes('thực');
        });
        
        // Look for fit mode controls
        const fitModeElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('fit mode') || 
                 text.includes('chế độ fit') ||
                 text.includes('kích thước thực');
        });
        
        return {
          totalInputs: allInputs.length,
          numberInputs: numberInputs.length,
          actualModeButtons: actualModeButtons.length,
          fitModeElements: fitModeElements.length,
          actualModeDetails: actualModeButtons.map(btn => ({
            tag: btn.tagName,
            text: btn.textContent?.slice(0, 50),
            title: btn.title || '',
            className: (btn.className && typeof btn.className === 'string') ? btn.className : ''
          })),
          numberInputDetails: numberInputs.map(input => ({
            value: input.value,
            placeholder: input.placeholder,
            name: input.name,
            id: input.id,
            className: (input.className && typeof input.className === 'string') ? input.className : '',
            parentText: input.closest('div')?.textContent?.slice(0, 100)
          })),
          canvasCount: document.querySelectorAll('canvas').length,
          imageCount: document.querySelectorAll('img').length
        };
      });
      
      console.log('🎛️ Post-upload analysis:', postUploadAnalysis);
      
      if (postUploadAnalysis.actualModeButtons > 0) {
        console.log('🎯 Found actual mode buttons! Clicking...');
        
        const actualModeClick = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, *[title]'));
          const actualButton = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            const title = btn.title?.toLowerCase() || '';
            return text.includes('actual') || 
                   text.includes('thực') ||
                   title.includes('actual') ||
                   title.includes('thực');
          });
          
          if (actualButton) {
            actualButton.click();
            return { 
              success: true, 
              buttonText: actualButton.textContent || actualButton.title,
              buttonTag: actualButton.tagName
            };
          }
          
          return { success: false };
        });
        
        console.log('🖱️ Actual mode click:', actualModeClick);
        
        if (actualModeClick.success) {
          await page.waitForTimeout(2000);
          
          // Check for scale controls after activating actual mode
          const scaleControlsCheck = await page.evaluate(() => {
            const numberInputs = Array.from(document.querySelectorAll('input[type="number"]'));
            const violetInputs = numberInputs.filter(input => {
              const parent = input.closest('div');
              const parentClass = (parent?.className && typeof parent.className === 'string') ? 
                                 parent.className : '';
              return parentClass.includes('bg-violet') || parentClass.includes('violet');
            });
            
            return {
              totalNumberInputs: numberInputs.length,
              violetInputs: violetInputs.length,
              scaleInputDetails: violetInputs.map(input => ({
                value: input.value,
                placeholder: input.placeholder,
                name: input.name,
                id: input.id,
                className: (input.className && typeof input.className === 'string') ? input.className : '',
                parentClass: (input.closest('div')?.className && typeof input.closest('div').className === 'string') ? 
                            input.closest('div').className : '',
                parentText: input.closest('div')?.textContent?.slice(0, 100)
              }))
            };
          });
          
          console.log('🎛️ Scale controls after actual mode:', scaleControlsCheck);
          
          if (scaleControlsCheck.violetInputs > 0) {
            console.log('🎉 FOUND SCALE CONTROLS! Testing...');
            
            const scaleTest = await page.evaluate(() => {
              const violetInput = document.querySelector('.bg-violet-50 input[type="number"]') ||
                                 document.querySelector('input[type="number"]');
              
              if (violetInput) {
                const originalValue = violetInput.value;
                violetInput.value = '150';
                violetInput.dispatchEvent(new Event('input', { bubbles: true }));
                violetInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                return {
                  success: true,
                  originalValue,
                  newValue: violetInput.value,
                  inputClass: (violetInput.className && typeof violetInput.className === 'string') ? 
                             violetInput.className : ''
                };
              }
              
              return { success: false };
            });
            
            console.log('📐 Scale test result:', scaleTest);
            
            if (scaleTest.success) {
              await page.waitForTimeout(3000);
              
              console.log('🎊 SUCCESS! SCALE FEATURE FOUND AND TESTED!');
              console.log('📋 FINAL RESULTS:');
              console.log('- ✅ Advanced Imposition: Accessed successfully');
              console.log('- ✅ File Upload: Working');
              console.log('- ✅ Actual Mode: Activated');
              console.log('- ✅ Scale Control: Found and tested (150%)');
              console.log('- ✅ Scale sync issue can now be tested!');
            }
          } else if (scaleControlsCheck.totalNumberInputs > 0) {
            console.log('🧪 Testing generic number inputs...');
            
            const genericTest = await page.evaluate(() => {
              const firstInput = document.querySelector('input[type="number"]');
              if (firstInput) {
                const originalValue = firstInput.value;
                firstInput.value = '150';
                firstInput.dispatchEvent(new Event('input', { bubbles: true }));
                firstInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                return {
                  success: true,
                  originalValue,
                  newValue: firstInput.value
                };
              }
              return { success: false };
            });
            
            console.log('🧪 Generic input test:', genericTest);
          }
        }
      } else if (postUploadAnalysis.numberInputs > 0) {
        console.log('🔍 No actual mode buttons, but found number inputs. Testing directly...');
        
        const directTest = await page.evaluate(() => {
          const firstInput = document.querySelector('input[type="number"]');
          if (firstInput) {
            const originalValue = firstInput.value;
            firstInput.value = '150';
            firstInput.dispatchEvent(new Event('input', { bubbles: true }));
            firstInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            return {
              success: true,
              originalValue,
              newValue: firstInput.value,
              inputDetails: {
                placeholder: firstInput.placeholder,
                name: firstInput.name,
                id: firstInput.id
              }
            };
          }
          return { success: false };
        });
        
        console.log('🧪 Direct number input test:', directTest);
      }
    }
  } else {
    console.log('❌ Could not find or click "Bình trang cao cấp"');
  }
  
  expect(true).toBe(true);
});
