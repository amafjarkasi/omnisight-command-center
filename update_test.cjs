const fs = require('fs');
let code = fs.readFileSync('test_script.cjs', 'utf8');

const searchLaunch = `const browser = await puppeteer.launch({ headless: 'new' });`;
const replaceLaunch = `const browser = await puppeteer.launch({ headless: 'new', args: ['--enable-unsafe-swiftshader'] });`;

const searchPort = `await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });`;
const replacePort = `await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });`;

if (code.includes(searchLaunch) && code.includes(searchPort)) {
  code = code.replace(searchLaunch, replaceLaunch).replace(searchPort, replacePort);
  fs.writeFileSync('test_script.cjs', code);
  console.log('Success: Replaced test_script.cjs');
} else {
  console.log('Error: Could not find code to replace in test_script.cjs');
}
