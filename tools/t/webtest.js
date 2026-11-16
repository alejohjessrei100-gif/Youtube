const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => !!window.__qaFrames, null, { timeout: 60000 });
  const imgs = await p.evaluate(() => window.__qaFrames('Agloe', [150, 600], 0.25));
  require('fs').writeFileSync('out/webtest.jpg', Buffer.from(imgs[0].split(',')[1], 'base64'));
  const mp4 = await p.evaluate(() => window.__qaMedia('Agloe', 590, 619, 0.25));
  require('fs').writeFileSync('out/webtest.mp4', Buffer.from(mp4.split(',')[1], 'base64'));
  console.log('ok', imgs.length);
  await b.close();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
