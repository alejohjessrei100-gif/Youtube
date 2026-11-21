// one headless Chromium (software WebGL) rendering a list of frames: node run.js PORT "f1,f2,..." OUTDIR WIDTH
const { chromium } = require('playwright');
(async () => {
  const [port, list, out, w] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 400)));
  await p.goto(`http://127.0.0.1:${port}/index.html?w=${w || 1080}&ms=${process.argv[6] || 4}&sm=${process.argv[7] || 4096}&list=${list}`);
  const fs = require('fs'); const t0 = Date.now();
  while (!fs.existsSync(out + '/DONE') && Date.now() - t0 < 6 * 3600e3) await new Promise(r => setTimeout(r, 1000));
  await b.close();
})();
