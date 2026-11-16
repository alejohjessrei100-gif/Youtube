// render frames through the phone page (same code path as the phone) and save them as JPEGs
const { chromium } = require('playwright');
const fs = require('fs');
const [out, scale, ...frames] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => !!window.__qaFrames, null, { timeout: 60000 });
  fs.mkdirSync(out, { recursive: true });
  for (let i = 0; i < frames.length; i += 6) {
    const chunk = frames.slice(i, i + 6).map(Number);
    const imgs = await p.evaluate(([c, s]) => window.__qaFrames('Agloe', c, s), [chunk, Number(scale)]);
    imgs.forEach((d, k) => fs.writeFileSync(`${out}/f${String(chunk[k]).padStart(4, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
    console.log('done', chunk.join(','));
  }
  await b.close();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
