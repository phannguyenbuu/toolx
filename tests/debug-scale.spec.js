const { test, expect } = require('@playwright/test');

test('Debug Scale Issue', async ({ page }) => {
  console.log('🔍 Starting scale debug test...');
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  // Check what's on the page
  const pageContent = await page.evaluate(() => {
    return {
      title: document.title,
      hasImpositionButton: !!document.querySelector('*[text*="Imposition"]'),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent).slice(0, 5),
      links: Array.from(document.querySelectorAll('a')).map(a => a.textContent).slice(0, 5)
    };
  });
  
  console.log('Page content:', pageContent);
  
  // Try to find navigation elements
  const navElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent && el.textContent.toLowerCase().includes('imposition')
    );
    return elements.map(el => ({
      tag: el.tagName,
      text: el.textContent,
      className: el.className
    }));
  });
  
  console.log('Navigation elements:', navElements);
  
  if (navElements.length > 0) {
    // Try to click the first imposition element
    await page.click(`text=${navElements[0].text}`);
    await page.waitForTimeout(2000);
    
    // Check if we're in the right page
    const currentPage = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasFileInput: !!document.querySelector('input[type="file"]'),
        hasScaleInput: !!document.querySelector('input[type="number"]'),
        actualModeButton: !!document.querySelector('[title*="thực"]')
      };
    });
    
    console.log('Current page state:', currentPage);
    
    if (currentPage.hasFileInput) {
      console.log('✅ Found file input - can proceed with scale test');
      
      // Check current scale implementation
      const scaleImplementation = await page.evaluate(() => {
        // Look for scale-related code in the page
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML);
        const hasCustomScale = scripts.some(s => s.includes('customScale'));
        const hasMmCalculation = scripts.some(s => s.includes('imgW_mm') || s.includes('img_w_mm'));
        
        return {
          hasCustomScale,
          hasMmCalculation,
          scriptCount: scripts.length
        };
      });
      
      console.log('Scale implementation:', scaleImplementation);
      
      if (!scaleImplementation.hasMmCalculation) {
        console.log('❌ MM calculation not found in frontend');
      } else {
        console.log('✅ MM calculation found in frontend');
      }
    }
  } else {
    console.log('❌ No imposition elements found');
  }
  
  expect(pageContent.title).toBeTruthy();
});
