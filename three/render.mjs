// Headless render of index.html.  node render.mjs sheet   -> out/sheet/NN_shot.jpg (one still per shot)
//                                  node render.mjs video   -> out/frames/f_00001.jpg ... then out/video.mp4 (no audio)
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.dirname(new URL(import.meta.url).pathname), MODE = process.argv[2] || 'sheet';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(8123);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('console', m => { if (m.type() === 'error') console.log('PAGE', m.text()); }); page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto('http://localhost:8123/index.html'); await page.waitForFunction('window.READY === true', null, { timeout: 300000 });
const save = (url, f) => fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const t0 = Date.now();
if (MODE === 'sheet') {
  const dir = path.join(ROOT, 'out/sheet'); fs.mkdirSync(dir, { recursive: true });
  const mids = await page.evaluate('window.SHOTS_MID'); const only = process.argv[3] ? process.argv[3].split(',') : null;
  for (let k = 0; k < mids.length; k++) { const [n, f] = mids[k]; if (only && !only.includes(n)) continue; save(await page.evaluate(f => window.renderFrame(f), f), path.join(dir, String(k + 1).padStart(2, '0') + '_' + n + '.jpg')); }
} else {
  const dir = path.join(ROOT, 'out/frames'); fs.mkdirSync(dir, { recursive: true }); const NF = await page.evaluate('window.NF');
  for (let f = 1; f <= NF; f++) { save(await page.evaluate(f => window.renderFrame(f), f), path.join(dir, 'f_' + String(f).padStart(5, '0') + '.jpg')); if (f % 100 === 0) console.log('frame', f, 'of', NF, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f_%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', path.join(ROOT, 'out/video.mp4')]);
}
console.log('done', ((Date.now() - t0) / 1000).toFixed(1) + 's'); await browser.close(); srv.close();
