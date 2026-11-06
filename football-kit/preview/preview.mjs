// node preview/preview.mjs out.png   (unzips ../three.module.js.zip into preview/vendor on first run)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const kit = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const vendor = path.join(kit, 'preview/vendor');
if (!fs.existsSync(path.join(vendor, 'three.module.js'))) execSync(`unzip -o -q ${path.join(kit, '../three.module.js.zip')} -d ${vendor}`);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = http.createServer((q, s) => { const f = path.join(kit, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(kit) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); }).listen(0);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); p.on('pageerror', e => { console.error(e.message); process.exit(1); });
await p.goto(`http://localhost:${srv.address().port}/preview/index.html`); await p.waitForFunction('window.ready', null, { timeout: 120000 });
const data = await p.evaluate(() => { window.renderFrame(); return window.outCanvas.toDataURL('image/png'); });
fs.writeFileSync(process.argv[2] || 'preview.png', Buffer.from(data.split(',')[1], 'base64')); await b.close(); srv.close();
