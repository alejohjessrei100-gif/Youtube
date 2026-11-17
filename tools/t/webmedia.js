// usage: COMP=<id> node tools/t/webmedia.js OUT.mp4 SCALE FROM TO   render a video through the phone page (same code path)
const { chromium } = require('playwright');
const fs = require('fs');
const [out, scale, from, to] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => !!window.__qaMedia, null, { timeout: 60000 });
  const d = await p.evaluate(([id, a, z, s]) => window.__qaMedia(id, a, z, s), [process.env.COMP, Number(from), Number(to), Number(scale)]);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
  console.log('ok', out);
  await b.close();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
