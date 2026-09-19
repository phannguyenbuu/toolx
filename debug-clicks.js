const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Mở trang tính giá trực tiếp
    await page.goto('http://localhost:3000/#calc', { waitUntil: 'networkidle' });
    
    // Tìm input number cụ thể
    const numberInputs = await page.locator('input[type="number"]').all();
    console.log('Số input number:', numberInputs.length);
    
    if (numberInputs.length >= 3) {
      await numberInputs[0].fill('210'); // width
      await numberInputs[1].fill('297'); // height  
      await numberInputs[2].fill('1000'); // quantity
    }
    
    // Đợi tính toán
    await page.waitForTimeout(2000);
    
    // Tìm và in thông tin về clicks
    const clicksInfo = await page.locator('text=/\\d+ click/').allTextContents();
    console.log('Thông tin clicks tìm thấy:', clicksInfo);
    
    // Tìm thông tin giấy 430x325
    const paperInfo = await page.locator('text=/430.*325|325.*430/').allTextContents();
    console.log('Thông tin giấy 430x325:', paperInfo);
    
    // Tìm tất cả text chứa "4 click"
    const fourClicks = await page.locator('text=/4 click/').allTextContents();
    console.log('Text chứa "4 click":', fourClicks);
    
    // Screenshot để debug
    await page.screenshot({ path: 'debug-clicks.png', fullPage: true });
    
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await browser.close();
  }
})();
