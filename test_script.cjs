const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  console.log('Page loaded');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'test_shot.png' });
  
  const nodes = await page.$$('circle[cursor="pointer"]');
  console.log('Found nodes:', nodes.length);
  if (nodes.length > 0) {
    await nodes[0].click();
    console.log('Clicked node 0');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'test_shot_node_clicked.png' });
  }

  // Find any elements tracking something
  const textMatches = await page.evaluate(() => {
    return document.body.innerText;
  });
  console.log('Body text length:', textMatches.length);
  
  await browser.close();
})();
