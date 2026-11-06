// node render.mjs <outDir> [frames: "0-1829" | "15,300,900"]   (RESUME=1 skips existing frames)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..');
const out = path.resolve(process.argv[2] || 'frames'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, s) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); }).listen(0);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
p.on('pageerror', e => { console.error('[pageerror]', e.message); process.exit(1); }); p.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
await p.goto(`http://localhost:${srv.address().port}/videos/haaland-hair/index.html?render`); await p.waitForFunction('window.ready === true', null, { timeout: 180000 });
const total = await p.evaluate('window.FRAMES'), spec = process.argv[3] || `0-${total - 1}`;
const list = spec.includes('-') ? (([a, z]) => Array.from({ length: z - a + 1 }, (_, i) => a + i))(spec.split('-').map(Number)) : spec.split(',').map(Number);
const t0 = Date.now();
for (const [i, f] of list.entries()) {
  const name = path.join(out, `f${String(f).padStart(4, '0')}.jpg`); if (process.env.RESUME && fs.existsSync(name)) continue;
  const data = await p.evaluate(f => { window.renderFrame(f); return window.outCanvas.toDataURL('image/jpeg', .93); }, f);
  fs.writeFileSync(name, Buffer.from(data.split(',')[1], 'base64'));
  if (i % 30 === 0) console.log(`frame ${f} (${i + 1}/${list.length}) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await b.close(); srv.close();
