const { test, expect } = require('@playwright/test');

// Quick scale validation test
test('Scale Sync Quick Check', async ({ page }) => {
  console.log('🔍 Quick Scale Sync Check...');
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Go to Imposition Advanced
  await page.click('text=Imposition Advanced');
  await page.waitForTimeout(1000);

  // Check for scale sync issues in code
  const scaleIssues = await page.evaluate(() => {
    const issues = [];
    
    // Check CSS transforms for duplicate scale
    const transforms = Array.from(document.querySelectorAll('*')).map(el => 
      el.style.transform || ''
    ).filter(t => t.includes('scale('));
    
    if (transforms.some(t => t.match(/scale\([^)]+\).*scale\([^)]+\)/))) {
      issues.push('Multiple scale() in single transform');
    }
    
    return issues;
  });

  if (scaleIssues.length > 0) {
    console.log('❌ Scale issues found:', scaleIssues);
    
    // Auto-fix
    await page.evaluate(() => {
      document.querySelectorAll('*').forEach(el => {
        if (el.style.transform && el.style.transform.includes('scale(')) {
          // Keep only rotation, remove scale
          el.style.transform = el.style.transform.replace(/scale\([^)]+\)\s*/g, '');
        }
      });
    });
    
    console.log('✅ Auto-fixed scale issues');
  } else {
    console.log('✅ No scale sync issues detected');
  }

  expect(scaleIssues.length).toBe(0);
});
