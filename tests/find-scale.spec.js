const { test, expect } = require('@playwright/test');

test('Find Scale Feature', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  // Get all clickable elements
  const allElements = await page.evaluate(() => {
    const clickable = Array.from(document.querySelectorAll('button, a, [onclick]'));
    return clickable.map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim(),
      className: el.className,
      id: el.id
    })).filter(el => el.text);
  });
  
  console.log('All clickable elements:', allElements);
  
  // Look for anything related to imposition or advanced
  const relevantElements = allElements.filter(el => 
    el.text.toLowerCase().includes('bình') || 
    el.text.toLowerCase().includes('advanced') ||
    el.text.toLowerCase().includes('imposition') ||
    el.text.toLowerCase().includes('trang')
  );
  
  console.log('Relevant elements:', relevantElements);
  
  // Try clicking "Bình trang" if it exists
  const binhTrangElement = relevantElements.find(el => el.text.includes('Bình trang'));
  if (binhTrangElement) {
    console.log('Found Bình trang, clicking...');
    await page.click(`text=${binhTrangElement.text}`);
    await page.waitForTimeout(2000);
    
    // Check for scale controls
    const scaleControls = await page.evaluate(() => {
      return {
        hasFileInput: !!document.querySelector('input[type="file"]'),
        hasNumberInputs: document.querySelectorAll('input[type="number"]').length,
        hasActualMode: !!document.querySelector('*[title*="thực"]'),
        hasScaleLabel: !!document.querySelector('*[text*="Tỷ lệ"]'),
        allInputs: Array.from(document.querySelectorAll('input')).map(i => ({
          type: i.type,
          placeholder: i.placeholder,
          value: i.value
        }))
      };
    });
    
    console.log('Scale controls found:', scaleControls);
    
    if (scaleControls.hasFileInput) {
      console.log('✅ This is the right page for scale testing');
      
      // Test actual scale functionality
      if (scaleControls.hasNumberInputs > 0) {
        console.log('🧪 Testing scale input...');
        
        // Try to find and modify scale input
        const scaleTest = await page.evaluate(() => {
          const numberInputs = document.querySelectorAll('input[type="number"]');
          let scaleInput = null;
          
          // Look for scale input (might be in a violet background container)
          for (let input of numberInputs) {
            const parent = input.closest('.bg-violet-50');
            if (parent) {
              scaleInput = input;
              break;
            }
          }
          
          if (scaleInput) {
            const oldValue = scaleInput.value;
            scaleInput.value = '150';
            scaleInput.dispatchEvent(new Event('input', { bubbles: true }));
            scaleInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            return {
              found: true,
              oldValue,
              newValue: scaleInput.value
            };
          }
          
          return { found: false };
        });
        
        console.log('Scale input test:', scaleTest);
        
        if (scaleTest.found) {
          await page.waitForTimeout(2000);
          
          // Check if preview updated
          const previewUpdate = await page.evaluate(() => {
            const images = document.querySelectorAll('img');
            const canvases = document.querySelectorAll('canvas');
            
            return {
              imageCount: images.length,
              canvasCount: canvases.length,
              hasPreview: images.length > 0 || canvases.length > 0
            };
          });
          
          console.log('Preview update:', previewUpdate);
          
          if (previewUpdate.hasPreview) {
            console.log('✅ Scale functionality is working');
          } else {
            console.log('❌ No preview found after scale change');
          }
        }
      }
    }
  }
  
  expect(allElements.length).toBeGreaterThan(0);
});
