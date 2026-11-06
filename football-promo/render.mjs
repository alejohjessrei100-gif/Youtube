// Usage: node render.mjs <outDir> [frames]   e.g. "0-299" or "15,75,120"
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(process.argv[2] || 'frames'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => { console.error('[pageerror]', e.message); process.exit(1); });
await page.goto(`http://localhost:${port}/index.html?render`);
await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
const total = await page.evaluate('window.FRAMES');
const spec = process.argv[3] || `0-${total - 1}`;
const list = spec.includes('-') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(spec.split('-').map(Number)) : spec.split(',').map(Number);
const t0 = Date.now();
for (const [i, f] of list.entries()) {
  const name = path.join(out, `f${String(f).padStart(4, '0')}.png`);
  if (process.env.RESUME && fs.existsSync(name)) continue;
  const data = await page.evaluate(f => { window.renderFrame(f); return document.querySelector('canvas').toDataURL('image/png'); }, f);
  fs.writeFileSync(name, Buffer.from(data.split(',')[1], 'base64'));
  if (i % 10 === 0) console.log(`frame ${f} (${i + 1}/${list.length}) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close(); srv.close();
