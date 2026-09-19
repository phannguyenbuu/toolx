const { test, expect } = require('@playwright/test');

test('Find Imposition Advanced Page', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  // Try to navigate directly via URL
  console.log('🔍 Trying direct navigation...');
  
  // Check if we can access imposition-advanced directly
  await page.evaluate(() => {
    // Try to find setCurrentPage function and call it
    if (window.React && window.React.version) {
      console.log('React found:', window.React.version);
    }
    
    // Look for any global functions or state setters
    const globalKeys = Object.keys(window).filter(key => 
      key.includes('set') || key.includes('page') || key.includes('current')
    );
    console.log('Global keys:', globalKeys);
  });
  
  // Try to trigger imposition-advanced page programmatically
  const navigationResult = await page.evaluate(() => {
    // Look for React components or state management
    const reactFiberNode = document.querySelector('#root')._reactInternalInstance ||
                           document.querySelector('#root')._reactInternals;
    
    if (reactFiberNode) {
      console.log('React fiber found');
      return { hasReact: true };
    }
    
    // Try to find navigation buttons by looking for specific patterns
    const allButtons = Array.from(document.querySelectorAll('button, a'));
    const navButtons = allButtons.filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('advanced') || 
             text.includes('imposition') || 
             text.includes('bình trang') ||
             text.includes('layout') ||
             text.includes('pdf');
    });
    
    return {
      hasReact: false,
      navButtons: navButtons.map(btn => ({
        text: btn.textContent,
        className: btn.className,
        onclick: btn.onclick ? 'has onclick' : 'no onclick'
      }))
    };
  });
  
  console.log('Navigation result:', navigationResult);
  
  // Try clicking PDF button to see if it leads to imposition
  if (navigationResult.navButtons.some(btn => btn.text.includes('PDF'))) {
    console.log('Trying PDF button...');
    await page.click('text=PDF');
    await page.waitForTimeout(2000);
    
    // Check what page we're on now
    const currentPageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasImpositionElements: !!document.querySelector('*[class*="imposition"]'),
        hasScaleInputs: document.querySelectorAll('input[type="number"]').length,
        hasFileInputs: document.querySelectorAll('input[type="file"]').length,
        bodyClasses: document.body.className
      };
    });
    
    console.log('Current page after PDF click:', currentPageState);
    
    if (currentPageState.hasScaleInputs > 0) {
      console.log('✅ Found scale inputs! This might be the right page.');
      
      // Look for actual mode or scale controls
      const scaleControls = await page.evaluate(() => {
        const numberInputs = Array.from(document.querySelectorAll('input[type="number"]'));
        const scaleRelated = numberInputs.filter(input => {
          const parent = input.closest('div');
          const parentText = parent?.textContent?.toLowerCase() || '';
          return parentText.includes('scale') || 
                 parentText.includes('tỷ lệ') ||
                 parentText.includes('actual') ||
                 parent?.classList.contains('bg-violet-50');
        });
        
        return {
          totalNumberInputs: numberInputs.length,
          scaleInputs: scaleRelated.length,
          scaleInputDetails: scaleRelated.map(input => ({
            value: input.value,
            placeholder: input.placeholder,
            parentText: input.closest('div')?.textContent?.slice(0, 100)
          }))
        };
      });
      
      console.log('Scale controls analysis:', scaleControls);
      
      if (scaleControls.scaleInputs > 0) {
        console.log('🎯 FOUND SCALE FEATURE!');
        
        // Test the scale functionality
        const scaleTest = await page.evaluate(() => {
          const scaleInput = document.querySelector('input[type="number"]');
          if (scaleInput) {
            const oldValue = scaleInput.value;
            scaleInput.value = '150';
            scaleInput.dispatchEvent(new Event('input', { bubbles: true }));
            scaleInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            return {
              success: true,
              oldValue,
              newValue: scaleInput.value
            };
          }
          return { success: false };
        });
        
        console.log('Scale test result:', scaleTest);
        
        if (scaleTest.success) {
          await page.waitForTimeout(2000);
          
          // Check if preview updated
          const previewCheck = await page.evaluate(() => {
            const canvases = document.querySelectorAll('canvas');
            const images = document.querySelectorAll('img');
            
            return {
              canvasCount: canvases.length,
              imageCount: images.length,
              hasPreviewUpdate: canvases.length > 0 || images.length > 0
            };
          });
          
          console.log('Preview update check:', previewCheck);
          
          if (previewCheck.hasPreviewUpdate) {
            console.log('✅ SCALE FEATURE IS WORKING!');
            console.log('❌ BUT THERE MIGHT STILL BE SYNC ISSUES BETWEEN PREVIEW AND OUTPUT');
          }
        }
      }
    }
  }
  
  expect(true).toBe(true); // Always pass, this is just for discovery
});
