// "Can Haaland score using only his hair?" — 3D football comedy short.
// Resources (SKILL.md Rule 1):
//   characters  football-kit/characters/bean.js  makeBean, makeCrowd, setFace, pose (incl. ponytail tail/tailSwing)
//   overlays    football-kit/font/pixelfont.js   drawPixelText, measurePixelText
//   animation   cartoon-short-kit.zip → engine/motion.js  M.back, M.anticip, M.spring, M.smooth, M.easeOut, camFromKeys, spline, walk, idle, blinkAt
//   VFX         toon.txt.zip → toon.txt  fxBurst, fxRing, fxStars, fxPuff, fxContact
//   three.js    three.module.js.zip
// Every frame is a pure function of time, so preview and frame render match.
import * as THREE from 'three';
import { makeBean, makeCrowd, SKINS } from '../../football-kit/characters/bean.js';
import { drawPixelText, measurePixelText } from '../../football-kit/font/pixelfont.js';
import { M, camFromKeys, spline, walk, idle, clamp, lerp } from './work/vendor/motion.js';
import { Pen, fxBurst, fxRing, fxStars, fxPuff, fxContact } from './work/vendor/toon.js';

const W = 1080, H = 1920, FPS = 30, DUR = 61.0;
const SHOW_CAPTIONS = false;   // captions removed at the user's request; caption() is kept for future videos
const WORDS = await (await fetch('./voice/words.json')).json();
await document.fonts.load('900 80px "Inter Display"'); await document.fonts.load('800 80px Inter');

const prog = (t, a, b) => clamp((t - a) / (b - a));
const pop = (t, t0, d = .28) => M.back(prog(t, t0, t0 + d), 2.2);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const L = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const MCI = '#6cabdd', OPP = '#c8202f', GKC = '#2fb34a';

// ------------------------------------------------------------ renderer + compositor
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const X = out.getContext('2d');

const scene = new THREE.Scene();
scene.background = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#2f6fd6'); gr.addColorStop(.6, '#5d9cf0'); gr.addColorStop(1, '#a9cdf7');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const camera = new THREE.PerspectiveCamera(45, W / H, .1, 600);
scene.add(new THREE.HemisphereLight('#d6e6ff', '#3d6b30', 1.15));
const sun = new THREE.DirectionalLight('#fff1dd', 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); sun.shadow.bias = -.0004;
scene.add(sun, sun.target);
const aimSun = (x, z) => { sun.target.position.set(x, 0, z); sun.position.set(x + 12, 26, z + 14); };

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
const canvasTex = (w, h, draw, nearest = false) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; } t.anisotropy = 8; return t; };

// ------------------------------------------------------------ stadium (origin)
const PW = 56, PL = 80, GZ = -40, GW = 5, GH = 3.6;
const pitchTex = canvasTex(1024, 1462, (c, w, h) => {
  const sx = w / PW, sz = h / PL, Xp = x => (x + PW / 2) * sx, Zp = z => (z + PL / 2) * sz;
  for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#3d9b3f' : '#45a847'; c.fillRect(0, i * h / 16, w, h / 16 + 1); }
  c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 5;
  const rect = (a, b, d, e) => c.strokeRect(Xp(a), Zp(b), Xp(d) - Xp(a), Zp(e) - Zp(b));
  rect(-27, -39, 27, 39); c.beginPath(); c.moveTo(Xp(-27), Zp(0)); c.lineTo(Xp(27), Zp(0)); c.stroke();
  c.beginPath(); c.arc(Xp(0), Zp(0), 7 * sx, 0, 7); c.stroke();
  for (const s of [-1, 1]) { rect(-15, 39 * s, 15, (39 - 13) * s); rect(-7, 39 * s, 7, (39 - 5) * s);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(Xp(0), Zp((39 - 9) * s), 6, 0, 7); c.fill(); }
});
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: .95 }));
pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);
const apron = new THREE.Mesh(new THREE.PlaneGeometry(140, 160), mat('#2f7d33')); apron.rotation.x = -Math.PI / 2; apron.position.y = -.02; apron.receiveShadow = true; scene.add(apron);

// stands: dark tier slab + peg crowd + black angled roof (video-2 layout), four sides
function stand(len, x, z, ry, colors, seed) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(len, 1, 16), mat('#3a1d22')); slab.rotation.x = .55; slab.position.set(0, 4.6, -7.5); g.add(slab);
  const perRow = Math.floor(len / .55), crowd = makeCrowd({ rows: 14, perRow, spacing: .55, rise: .62, depth: .95, colors, seed });
  crowd.position.set(0, 1.1, -1.2); g.add(crowd);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(len + 8, .8, 14), mat('#141518')); roof.position.set(0, 17, -10); roof.rotation.x = -.18; g.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(len + 8, 18, 1), mat('#1b1c22')); back.position.set(0, 8, -16.5); g.add(back);
  return crowd;
}
const crowds = [
  stand(96, -36, 0, Math.PI / 2, [MCI, MCI, '#ffffff', MCI, '#1c2c5b'], 3),
  stand(96, 36, 0, -Math.PI / 2, [MCI, '#ffffff', MCI, OPP], 5),
  stand(64, 0, -49, 0, [MCI, MCI, '#ffffff', '#1c2c5b'], 7),
  stand(64, 0, 49, Math.PI, [OPP, OPP, '#ffffff', MCI], 9),
];
// LED boards (pixel font, invented sponsors)
const ledTex = canvasTex(2048, 96, (c, w, h) => {
  c.fillStyle = '#05070f'; c.fillRect(0, 0, w, h); let x = 20; const items = [['HAIR FORCE', '#ffd84a'], ['PONY EXPRESS', '#7cc7ff'], ['GOAL JUICE', '#ff6b6b'], ['FLICK FIT', '#9dff8a']];
  for (const [t, col] of items) { x += drawPixelText(c, t, x, 20, { px: 8, color: col }) + 90; }
}, true); ledTex.wrapS = THREE.RepeatWrapping;
const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false });
for (const [len, x, z, ry] of [[76, -30, 0, Math.PI / 2], [76, 30, 0, -Math.PI / 2], [52, 0, -43, 0], [52, 0, 43, Math.PI]]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.1), ledMat.clone()); m.material.map = ledTex.clone(); m.material.map.needsUpdate = true;
  m.material.map.repeat.set(len / 26, 1); m.position.set(x, .55, z); m.rotation.y = ry; scene.add(m);
}
// pixel clouds (sprites)
const cloudTex = canvasTex(64, 32, (c) => { c.fillStyle = '#fff';
  for (const [x, y, w, h] of [[8, 16, 48, 10], [16, 10, 30, 8], [22, 4, 14, 8], [40, 12, 12, 6]]) c.fillRect(x, y, w, h);
  c.fillStyle = '#dfe9f7'; c.fillRect(8, 24, 48, 2); }, true);
const clouds = [];
for (let i = 0; i < 14; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false })); const k = 14 + (i * 7) % 12;
  s.scale.set(k * 2, k, 1); s.userData = { a: i * 2.1, r: 150 + (i * 37) % 60, y: 55 + (i * 13) % 35 }; scene.add(s); clouds.push(s);
}
// goal + net
const postMat = mat('#ffffff', { roughness: .3, emissive: '#444' });
const goal = new THREE.Group(); goal.position.z = GZ; scene.add(goal);
for (const x of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, GH, 12), postMat); p.position.set(x, GH / 2, 0); p.castShadow = true; goal.add(p); }
const bar = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, GW * 2 + .24, 12), postMat); bar.rotation.z = Math.PI / 2; bar.position.set(0, GH, 0); bar.castShadow = true; goal.add(bar);
function netPanel(p00, p10, p01, p11, nx, ny) {
  const nodes = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const u = i / nx, v = j / ny; nodes.push({ u, v, base: p00.clone().lerp(p10, u).lerp(p01.clone().lerp(p11, u), v) }); }
  const idx = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const k = j * (nx + 1) + i; if (i < nx) idx.push(k, k + 1); if (j < ny) idx.push(k, k + nx + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nodes.length * 3), 3)); geo.setIndex(idx);
  goal.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#f2f4ff', transparent: true, opacity: .7 })));
  return (disp) => { const a = geo.attributes.position; nodes.forEach((n, k) => { const d = disp ? disp(n) : 0; a.setXYZ(k, n.base.x, n.base.y, n.base.z - d); }); a.needsUpdate = true; geo.computeBoundingSphere(); };
}
const D = 2.4;
const netBack = netPanel(v3(-GW, 0, -D), v3(GW, 0, -D), v3(-GW, GH, -1.2), v3(GW, GH, -1.2), 30, 12);
netPanel(v3(-GW, GH, 0), v3(GW, GH, 0), v3(-GW, GH, -1.2), v3(GW, GH, -1.2), 30, 3)();
netPanel(v3(-GW, 0, 0), v3(-GW, 0, -D), v3(-GW, GH, 0), v3(-GW, GH, -1.2), 8, 12)();
netPanel(v3(GW, 0, 0), v3(GW, 0, -D), v3(GW, GH, 0), v3(GW, GH, -1.2), 8, 12)();
function bulge(t, tHit, x, y) {
  const tt = t - tHit; if (tt < 0 || tt > 1.6) return netBack();
  const amp = 1.4 * Math.exp(-tt * 3.2) * Math.cos(tt * 13) * clamp(tt * 25), cu = (x + GW) / (2 * GW), cv = y / GH;
  netBack(n => { const d = Math.hypot((n.u - cu) * 2, n.v - cv); return amp * Math.exp(-d * d * 5) * Math.sin(Math.PI * n.u) * Math.sin(Math.PI * Math.min(1, n.v)); });
}
// ball
const ballTex = canvasTex(1024, 512, (c, w, h) => {
  c.fillStyle = '#f6f6f6'; c.fillRect(0, 0, w, h); const p = 1.618, V = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
  c.fillStyle = '#111'; for (const [x, y, z] of V) { const l = Math.hypot(x, y, z), la = Math.asin(y / l), lo = Math.atan2(x, z);
    for (const o of [-w, 0, w]) { c.beginPath(); c.ellipse((lo / (2 * Math.PI) + .5) * w + o, (.5 - la / Math.PI) * h, 44 / Math.max(.25, Math.cos(la)), 44, 0, 0, 7); c.fill(); } } });
const ball = new THREE.Mesh(new THREE.SphereGeometry(.36, 40, 28), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .45 }));
ball.castShadow = true; scene.add(ball);
const setBall = (p, spin = 0) => { ball.position.copy(p); ball.rotation.set(spin, spin * .4, 0); ball.visible = true; };

// ------------------------------------------------------------ studio (x = 200) and dressing room / tunnel (x = -200)
const STUDIO = v3(200, 0, 0);
{
  const g = new THREE.Group(); g.position.copy(STUDIO); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat('#1a2140')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), mat('#121834')); wall.position.set(0, 10, -6); g.add(wall);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(360, 200, (c, w, h) => {
    c.fillStyle = '#0a1028'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f2c230'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    drawPixelText(c, 'HAIR LAB', w / 2, 40, { px: 5, color: '#f2c230', align: 'center' });
    c.fillStyle = '#e2c46e'; for (let i = 0; i < 9; i++) c.fillRect(150 + (i % 3) * 10, 100 + i * 7, 22, 8);  // pixel ponytail
    drawPixelText(c, 'STUDY #1', w / 2, 168, { px: 3, color: '#cfd8ff', align: 'center' }); }, true) }));
  screen.position.set(0, 6.3, -5.9); g.add(screen);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 1.6), mat('#e8ecf5', { roughness: .4 })); desk.position.set(0, .7, 1.4); desk.castShadow = desk.receiveShadow = true; g.add(desk);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(5.02, .25, 1.62), new THREE.MeshBasicMaterial({ color: '#f2c230', toneMapped: false })); strip.position.set(0, 1.25, 1.4); g.add(strip);
  const key = new THREE.PointLight('#fff2d6', 60, 30); key.position.set(3, 7, 6); g.add(key);
}
const ROOM = v3(-200, 0, 0);
let door;
{
  const g = new THREE.Group(); g.position.copy(ROOM); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), mat('#8d8f99')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), mat('#dfe6ef')); wall.position.set(0, 7, -6); g.add(wall);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), mat('#cfd8e4')); side.rotation.y = Math.PI / 2; side.position.set(-7, 7, 4); g.add(side);
  for (let i = 0; i < 4; i++) { // shirts on pegs
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), new THREE.MeshStandardMaterial({ map: canvasTex(130, 150, (c, w, h) => {
      c.fillStyle = MCI; c.fillRect(20, 0, 90, 150); c.fillRect(0, 0, 130, 50); c.fillStyle = '#fff'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.fillText(String([9, 47, 16, 20][i]), 65, 110); }) }));
    sh.position.set(-4.5 + i * 3, 4.4, -5.9); g.add(sh);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(14, .5, 1.2), mat('#6b4a2f')); bench.position.set(0, .9, -5); bench.castShadow = true; g.add(bench);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(240, 160, (c, w, h) => {
    c.fillStyle = '#f4f6fb'; c.fillRect(0, 0, w, h); c.strokeStyle = '#333'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    drawPixelText(c, 'PLAN A:', 20, 20, { px: 3, color: '#c3121b' }); drawPixelText(c, 'HAIR', 20, 60, { px: 6, color: '#1a1a1a' });
    drawPixelText(c, 'PLAN B:', 20, 110, { px: 3, color: '#c3121b' }); drawPixelText(c, 'HAIR', 110, 110, { px: 3, color: '#1a1a1a' }); }, true) }));
  board.position.set(4.5, 3.6, -5.85); g.add(board);
  // tunnel outside the door (z = +30 from room)
  const tw = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), mat('#4a4f5c')); tw.position.set(0, 6, 24); g.add(tw);
  const tf = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), mat('#5d616b')); tf.rotation.x = -Math.PI / 2; tf.position.set(0, .01, 32); tf.receiveShadow = true; g.add(tf);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5.4, .3), mat('#2b2e36')); frame.position.set(0, 2.7, 24.05); g.add(frame);
  const hinge = new THREE.Group(); hinge.position.set(-1.4, 0, 24.3); g.add(hinge);
  door = new THREE.Mesh(new THREE.BoxGeometry(2.8, 5, .16), mat('#2f5d9a')); door.position.set(1.4, 2.5, 0); door.castShadow = true; hinge.add(door);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .7), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(220, 70, (c, w, h) => {
    c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); drawPixelText(c, 'HAIR ONLY', w / 2, 22, { px: 4, color: '#111', align: 'center' }); }, true) }));
  sign.position.set(1.4, 3.9, .1); door.add(sign);
  door = hinge;
  const lamp = new THREE.PointLight('#fff2d6', 50, 30); lamp.position.set(0, 9, 30); g.add(lamp);
  const lamp2 = new THREE.PointLight('#fff2d6', 50, 30); lamp2.position.set(2, 9, 3); g.add(lamp2);
}

// ------------------------------------------------------------ cast
const HA = makeBean({ shirt: MCI, number: 9, hair: 'ponytail', hairColor: '#e2c46e', skin: SKINS.beige, socks: MCI, face: 'determined' });
const GK = makeBean({ shirt: GKC, number: 1, skin: SKINS.tan, hairColor: '#111', face: 'neutral', socks: GKC });
const REF = makeBean({ shirt: '#161616', shorts: '#161616', number: null, skin: SKINS.brown, hairColor: '#0d0d0d', face: 'determined', socks: '#161616' });
const PUN = makeBean({ outfit: 'suit', hair: 'old', number: null, face: 'smug' });
const MAN = makeBean({ outfit: 'suit', hair: 'cap', hairColor: '#6d6d6d', number: null, skin: SKINS.beige, face: 'neutral' });
const WALL = [0, 1, 2, 3].map(i => makeBean({ shirt: OPP, number: [4, 5, 6, 15][i], skin: [SKINS.tan, SKINS.beige, SKINS.dark, SKINS.brown][i], hairColor: '#1a1a1a', face: 'angry' }));
const ALL = [HA, GK, REF, PUN, MAN, ...WALL]; ALL.forEach(b => scene.add(b.root));
const faces = new Map();
const face = (b, f) => { if (faces.get(b) !== f) { b.setFace(f); faces.set(b, f); } };
const place = (b, x, y, z, ry = 0) => { b.root.visible = true; b.root.position.set(x, y, z); b.root.rotation.set(0, ry, 0); };

// trophy for POTM
const trophy = new THREE.Group(); scene.add(trophy);
{ const gold = mat('#f2c230', { metalness: .8, roughness: .25 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.42, .2, .6, 20, 1, true), gold); cup.position.y = .7; trophy.add(cup);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .3, 10), gold); stem.position.y = .25; trophy.add(stem);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.4, .14, .4), gold); trophy.add(base); }

// substitution board (pixel)
const subBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, .9, .08), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(160, 90, (c, w, h) => {
  c.fillStyle = '#0b0b0b'; c.fillRect(0, 0, w, h); drawPixelText(c, 'OFF', 12, 18, { px: 4, color: '#ff3b3b' }); drawPixelText(c, '9', 112, 14, { px: 9, color: '#ff3b3b' }); }, true) }));
scene.add(subBoard);

// ------------------------------------------------------------ overlay toolkit (SKILL.md Rule 3)
const NAVY = 'rgba(10,16,40,.93)', GOLD = '#f2c230';
const toScreen = (p) => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, front: v.z < 1 }; };
function panel(x, y, w, h, border = GOLD, fill = NAVY) { X.fillStyle = fill; X.fillRect(x, y, w, h); X.strokeStyle = border; X.lineWidth = 6; X.strokeRect(x + 3, y + 3, w - 6, h - 6); }
function scoreBug(text) {
  const w = measurePixelText(text, 4) + 110; panel(36, 70, w, 68, '#d9dde8');
  X.fillStyle = MCI; X.fillRect(52, 86, 36, 36); drawPixelText(X, 'M', 70, 90, { px: 4, color: '#0b1a33', align: 'center' });
  drawPixelText(X, text, 104, 90, { px: 4, color: '#e9ecf5' });
}
function withPop(cx, cy, s, a, fn) { if (s <= .001) return; X.save(); X.globalAlpha = clamp(a); X.translate(cx, cy); X.scale(s, s); X.translate(-cx, -cy); fn(); X.restore(); }
function pill(text, cx, cy, t, t0, border = '#9fb4ff', color = '#fff', t1 = 1e9) {
  if (t < t0 || t > t1) return; const s = pop(t, t0), w = measurePixelText(text, 4) + 44;
  withPop(cx, cy, s, prog(t, t0, t0 + .08) * (1 - prog(t, t1 - .15, t1)), () => { panel(cx - w / 2, cy - 30, w, 60, border); drawPixelText(X, text, cx, cy - 14, { px: 4, color, align: 'center' }); });
}
function card(title, rows, cx, top, w, t, t0, t1 = 1e9) {
  if (t < t0 || t > t1) return; const s = pop(t, t0, .3), h = 90 + rows.length * 54;
  withPop(cx, top + h / 2, s, 1 - prog(t, t1 - .15, t1), () => {
    panel(cx - w / 2, top, w, h); drawPixelText(X, title, cx, top + 26, { px: 5, color: GOLD, align: 'center' });
    rows.forEach((r, i) => { if (r.at != null && t < r.at) return; const y = top + 84 + i * 54, k = r.at != null ? pop(t, r.at, .2) : 1;
      withPop(cx, y + 12, k, 1, () => {
        drawPixelText(X, r.k, cx - w / 2 + 34, y, { px: 4, color: r.kc || '#fff' });
        if (r.bar != null) { const bw = w - 330, f = r.bar * prog(t, r.at ?? t0, (r.at ?? t0) + .5); X.fillStyle = '#1f2747'; X.fillRect(cx - w / 2 + 200, y - 2, bw, 30); X.fillStyle = r.col; X.fillRect(cx - w / 2 + 200, y - 2, bw * f, 30); }
        drawPixelText(X, r.v, cx + w / 2 - 34, y, { px: 4, color: r.vc || '#fff', align: 'right' }); }); });
  });
}
function nameTag(text, b, t, t0, t1, dy = 1.15) {
  if (t < t0 || t > t1) return; const p = toScreen(b.head.getWorldPosition(new THREE.Vector3()).add(v3(0, dy, 0)));
  if (!p.front) return; const w = measurePixelText(text, 4) + 30, s = pop(t, t0, .22);
  withPop(p.x, p.y, s, 1, () => { X.fillStyle = GOLD; X.fillRect(p.x - w / 2, p.y - 48, w, 44); X.beginPath(); X.moveTo(p.x - 12, p.y - 4); X.lineTo(p.x + 12, p.y - 4); X.lineTo(p.x, p.y + 10); X.fill();
    drawPixelText(X, text, p.x, p.y - 38, { px: 4, color: '#111', align: 'center' }); });
}
function bigWord(text, t, t0, t1, { y = 640, fill = '#ffffff', box = null, tilt = -.07, size = 150 } = {}) {
  if (t < t0 || t > t1) return; const s = pop(t, t0, .3) * (1 + .03 * Math.sin((t - t0) * 9)), a = 1 - prog(t, t1 - .15, t1);
  withPop(W / 2, y, s, a, () => {
    X.save(); X.translate(W / 2, y); X.rotate(tilt); X.font = `900 ${size}px "Inter Display"`; X.textAlign = 'center'; X.textBaseline = 'middle';
    let sz = size; while (X.measureText(text).width > W - 140 && sz > 40) { sz -= 6; X.font = `900 ${sz}px "Inter Display"`; }
    if (box) { const w = X.measureText(text).width + 70; X.fillStyle = '#111'; X.fillRect(-w / 2 + 10, -sz * .62 + 10, w, sz * 1.24); X.fillStyle = box; X.fillRect(-w / 2, -sz * .62, w, sz * 1.24); }
    for (let k = 10; k > 0; k -= 2) { X.fillStyle = '#111'; X.fillText(text, k * .7, k); }           // extrusion
    X.lineJoin = 'round'; X.lineWidth = 16; X.strokeStyle = '#111'; X.strokeText(text, 0, 0); X.fillStyle = fill; X.fillText(text, 0, 0); X.restore();
  });
}
function bubble(text, x, y, t, t0, t1) {
  if (t < t0 || t > t1) return; const w = measurePixelText(text, 4) + 50, s = pop(t, t0, .25);
  withPop(x, y, s, 1 - prog(t, t1 - .12, t1), () => { X.fillStyle = '#fff'; X.strokeStyle = '#111'; X.lineWidth = 6;
    X.beginPath(); X.roundRect(x - w / 2, y - 40, w, 74, 18); X.fill(); X.stroke(); X.beginPath(); X.moveTo(x - 14, y + 32); X.lineTo(x + 6, y + 62); X.lineTo(x + 18, y + 32); X.fill();
    drawPixelText(X, text, x, y - 12, { px: 4, color: '#111', align: 'center' }); });
}
// Animated captions: every word pops in (motion.js M.back overshoot), drops in with an alternating tilt, wobbles while held
// and shrinks out just before the next word. Key words are bigger, coloured and shake.
const EMPH = {
  gold: ['hair', 'ponytail', 'haaland', 'erling', 'goal', 'hat-trick', 'top', 'corner', 'history', 'volley', 'scissor-kick', 'flicks', 'player', 'match'],
  red: ['disallowed', 'crossbar', 'impossible', 'subbed', 'off', 'not', 'invited', 'foot', 'eyes', 'no'],
  blue: ['fifty', 'zero', 'four', 'hundred', 'horsepower', 'twelve', 'one', 'expected'],
};
const emphOf = (w) => EMPH.gold.includes(w) ? '#ffd43b' : EMPH.red.includes(w) ? '#ff5252' : EMPH.blue.includes(w) ? '#6ec6ff' : null;
function caption(t) {
  const i = WORDS.findIndex((o, k) => t >= o.t0 && t < (WORDS[k + 1] ? Math.min(WORDS[k + 1].t0, o.t1 + .35) : o.t1 + .4));
  if (i < 0) return; const w = WORDS[i], word = w.w.replace(/[.,:?!…"]/g, '').toLowerCase(); if (!word) return;
  const end = WORDS[i + 1] ? Math.min(WORDS[i + 1].t0, w.t1 + .35) : w.t1 + .4;
  const col = emphOf(word), big = col ? 1.28 : 1, side = i % 2 ? 1 : -1;
  const kin = prog(t, w.t0, w.t0 + .2), k = M.back(kin, 2.6), out = prog(t, end - .07, end);
  const held = t - w.t0;
  const scale = (.35 + .65 * k) * big * (1 + .025 * Math.sin(held * 11)) * (1 - .25 * out);
  const rot = side * (.28 * (1 - M.easeOut(kin)) + .035) + (col ? Math.sin(held * 38) * .05 * Math.exp(-held * 5) : 0);
  const dy = -46 * (1 - M.easeOut(kin));
  X.save(); X.globalAlpha = clamp(kin * 4) * (1 - out);
  X.translate(W / 2, H * .585 + dy); X.rotate(rot); X.scale(scale, scale);
  let sz = 92; X.font = `900 ${sz}px "Inter Display"`; while (X.measureText(word).width > (W - 160) / big && sz > 40) { sz -= 4; X.font = `900 ${sz}px "Inter Display"`; }
  X.textAlign = 'center'; X.textBaseline = 'middle'; X.lineJoin = 'round';
  for (let e = 7; e > 0; e -= 1.5) { X.fillStyle = '#111'; X.fillText(word, e * .6, e); }           // extrusion
  X.lineWidth = 13; X.strokeStyle = '#111'; X.strokeText(word, 0, 0);
  X.fillStyle = col || '#ffffff'; X.fillText(word, 0, 0);
  if (kin < 1) { X.globalAlpha *= (1 - kin) * .8; X.fillStyle = '#ffffff'; X.fillText(word, 0, 0); }    // white flash on entry
  X.restore();
}
// toon.txt fx on an offscreen canvas, stamped at a screen point
const fxCan = {};
function fx(fn, size, k, x, y, scale = 1, ...args) {
  const key = size.join('x'); const c = fxCan[key] || (fxCan[key] = document.createElement('canvas')); c.width = size[0]; c.height = size[1];
  const g = c.getContext('2d'); fn(new Pen(g), k, ...args); X.drawImage(c, x - size[0] * scale / 2, y - size[1] * scale / 2, size[0] * scale, size[1] * scale);
}
function flash(t, t0, d = .18, a = .7) { if (t < t0 || t > t0 + d) return; X.fillStyle = `rgba(255,255,255,${a * (1 - (t - t0) / d)})`; X.fillRect(0, 0, W, H); }

// ------------------------------------------------------------ shots
const F = s => s * FPS;
const cam = (keys, t, kicks = []) => camFromKeys(keys.map(k => ({ ...k, f: F(k.t) })), F(t), { kicks: kicks.map(k => ({ f: F(k.t), a: k.a })) });
const SH = [0, 3.1, 6.0, 12.3, 17.2, 22.0, 28.5, 31.7, 37.6, 40.0, 41.7, 49.3, 53.3, DUR];
const shotAt = t => { for (let i = SH.length - 2; i >= 0; i--) if (t >= SH[i]) return i + 1; return 1; };
const score = (t) => t < 46.35 ? '0-0' : t < 50.25 ? '1-0' : t < 51.95 ? '2-0' : '3-0';
const clock = (t) => t < 17.2 ? "00'" : t < 22.2 ? "01'" : t < 37.6 ? "12'" : t < 41.7 ? 'HT' : t < 49.3 ? "46'" : t < 59.3 ? "78'" : 'FT';

function frame(t) {
  t = clamp(t, 0, DUR - 1e-3); const f = F(t), s = shotAt(t);
  ALL.forEach(b => { b.root.visible = false; b.pose(); }); ball.visible = trophy.visible = subBoard.visible = false; netBack();
  door.rotation.y = 0;
  ledTex.offset.x = -t * .05; clouds.forEach((c, i) => { const u = c.userData, a = u.a + t * .004; c.position.set(Math.cos(a) * u.r, u.y, Math.sin(a) * u.r); });
  crowds.forEach((c, i) => { c.position.y = 1.1 + (t > 46.35 && t < 49 ? Math.abs(Math.sin(t * 9 + i)) * .35 : t > 52.4 && t < 54 ? Math.abs(Math.sin(t * 9 + i)) * .35 : 0); });
  const id = (b, seed) => { const q = idle(f, seed); return { bounce: q.bob * 6, headTilt: q.headTilt * .01 }; };
  let C, post = [];

  if (s === 1) { // hook
    place(HA, 0, 0, -18); face(HA, 'determined'); HA.pose({ ...id(HA, 1), tail: .5, tailSwing: Math.sin(t * 2.2) * .25 + (t > 2.5 ? M.spring(t - 2.5) * .0 + Math.sin((t - 2.5) * 14) * Math.exp(-(t - 2.5) * 3) * .9 : 0) });
    setBall(v3(.5, .36, -16.8)); aimSun(0, -18);
    C = cam([{ t: 0, pos: [0, 16, 32], look: [0, 2, -18], fov: 48 }, { t: 2.3, pos: [0, 3.6, -9.6], look: [0, 2.5, -18], fov: 40 }, { t: 3.1, pos: [0, 3.5, -10.4], look: [0, 2.55, -18], fov: 38 }], t, [{ t: 2.5, a: .02 }]);
    post.push(() => { nameTag('HAALAND', HA, t, .6, 3.1); bigWord('ONLY HIS HAIR??', t, 2.45, 3.1, { y: 470 }); });
  } else if (s === 2) { // no feet, no head, just the ponytail
    place(HA, 0, 0, -18); face(HA, 'determined');
    const whip = t > 5.3 ? Math.sin((t - 5.3) * 12) * Math.exp(-(t - 5.3) * 2.5) * 1.4 : 0;
    HA.pose({ ...id(HA, 1), tail: .5 + (t > 5.3 ? (1 - M.spring(t - 5.3, 2, 4)) * -.6 + .6 : 0), tailSwing: Math.sin(t * 2.2) * .25 + whip });
    setBall(v3(.5, .36, -16.8)); aimSun(0, -18);
    C = cam([{ t: 3.1, pos: [3.4, 3.4, -21.5], look: [0, 2.6, -18], fov: 40 }, { t: 6.0, pos: [1.4, 3.1, -22.6], look: [0, 2.7, -18], fov: 34 }], t);
    post.push(() => {
      pill('FEET: BANNED', W / 2, 330, t, 3.2, '#ff5a5a', '#ffb3b3'); pill('HEAD: BANNED', W / 2, 410, t, 4.0, '#ff5a5a', '#ffb3b3'); pill('HAIR: ✓', W / 2, 490, t, 5.3, '#6dff8a', '#c9ffd4');
      if (t > 5.3) { const p = toScreen(HA.tail[2].getWorldPosition(new THREE.Vector3())); fx(fxRing, [600, 600], prog(t, 5.3, 6.0), p.x, p.y, .9); }
    });
  } else if (s === 3 || s === 8) { // studio: scientist (shot 3) / expert — the same guy (shot 8)
    const g = STUDIO; place(PUN, g.x, 0, g.z + .2); aimSun(g.x, g.z);
    const exp = s === 8;
    const fc = !exp ? (t > 11.7 ? 'sad' : t > 7.2 ? 'smug' : 'determined') : (t > 36.8 ? 'shocked' : 'smug');
    face(PUN, fc);
    const talk = Math.sin(t * 9) * .15;
    PUN.pose({ ...id(PUN, 3), armL: .5 + talk, armR: exp && t > 34.2 && t < 36 ? -2.2 : -.4 - talk, headTilt: !exp && t > 11.7 ? .12 : 0 });
    const t0 = exp ? 31.7 : 6.0, t1 = exp ? 37.6 : 12.3;
    C = cam([{ t: t0, pos: [g.x + (exp ? -1.2 : 1.2), 2.9, 8.6], look: [g.x, 2.0, 0], fov: 38 }, { t: t1, pos: [g.x + (exp ? -.5 : .5), 2.8, 7.2], look: [g.x, 2.0, 0], fov: 36 }], t);
    post.push(() => {
      if (!exp) {
        nameTag('SCIENTIST', PUN, t, 6.1, 12.3, .8);
        card('HAIR POWER', [{ k: 'FEET', v: '0' }, { k: 'HEAD', v: '0' }, { k: 'PONYTAIL', v: '99', vc: GOLD }, { k: 'CHANCE', v: 'IMPOSSIBLE', vc: '#ff6b6b', at: 7.2 }], W / 2, 1400, 640, t, 6.6);
        pill('LAST PREDICTION: WRONG', W / 2, 1330, t, 10.3, '#ff5a5a', '#ffb3b3');
      } else {
        nameTag('EXPERT', PUN, t, 31.8, 37.6, .8); pill('(SAME GUY)', W / 2, 1330, t, 32.4, '#9fb4ff');
        card('PONYTAIL REPORT', [{ k: 'HORSEPOWER', v: '400', vc: GOLD, at: 34.2 }, { k: 'EYES', v: '0', vc: '#ff6b6b', at: 36.8 }], W / 2, 1400, 640, t, 33.2);
        if (t > 36.8) { const p = toScreen(PUN.head.getWorldPosition(new THREE.Vector3()).add(v3(0, .75, 0))); fx(fxStars, [420, 210], (t - 36.8) * 1.4 % 1, p.x, p.y, .9); }
      }
    });
  } else if (s === 4) { // the rules
    place(REF, 0, 0, -14); place(HA, -2.6, 0, -15.5, .5); face(HA, 'neutral'); aimSun(0, -14);
    face(REF, t > 15.6 ? 'angry' : 'determined');
    REF.pose({ ...id(REF, 2), armR: t > 15.6 ? -1.5 : -.2, armRf: t > 15.6 ? -.6 : 0, armL: t > 16.4 ? 2.4 * M.back(prog(t, 16.4, 16.6)) : .2 });
    HA.pose({ ...id(HA, 1), tailSwing: Math.sin(t * 2) * .2 });
    C = cam([{ t: 12.3, pos: [1.2, 3.2, -6.4], look: [-.6, 2.4, -14.5], fov: 40 }, { t: 17.2, pos: [.6, 3.0, -7.6], look: [-.6, 2.5, -14.5], fov: 36 }], t, [{ t: 16.5, a: .015 }]);
    post.push(() => {
      nameTag('REF', REF, t, 12.4, 17.2);
      card('THE RULES', [{ k: 'HAIR TOUCHES BALL', v: 'GOAL ✓', vc: '#6dff8a', at: 13.7 }, { k: 'ANYTHING ELSE', v: '✗', vc: '#ff6b6b', at: 15.6 }], W / 2, 1240, 760, t, 12.9);
      bigWord('DISALLOWED', t, 16.5, 17.2, { y: 470, box: '#d6262f', size: 120 });
    });
  } else if (s === 5) { // minute one: foot shot, disallowed
    place(HA, 0, 0, -24, Math.PI); place(GK, 0, 0, -39); place(REF, 6, 0, -20, -.6); aimSun(0, -28);
    const kick = prog(t, 19.25, 19.6), after = t > 19.6;
    HA.pose({ ...id(HA, 1), legR: after ? -1.1 * (1 - prog(t, 19.6, 20.2)) : M.anticip(kick) * -1.1, armL: .5, armR: -.5, lean: after ? .1 : 0, tailSwing: Math.sin(t * 3) * .3 });
    HA.root.rotation.y = Math.PI * (1 - M.smooth(prog(t, 20.95, 21.35)));
    face(HA, t > 21.3 ? 'shocked' : 'determined'); face(GK, t > 20.2 ? 'sad' : 'neutral'); face(REF, 'angry');
    const dive = M.easeOut(prog(t, 19.75, 20.2)); GK.root.rotation.z = -dive * 1.2; GK.root.position.x = -dive * 1.8; GK.root.position.y = dive * .4;
    REF.pose({ armL: t > 21.3 ? 2.6 : .2 });
    if (t < 18.2) setBall(v3(-9, .36, -21), 0);
    else if (t < 18.9) setBall(v3(-9, .36, -21).lerp(v3(0, .36, -25), M.easeOut(prog(t, 18.2, 18.9))), t * 6);
    else if (t < 19.6) setBall(v3(0, .36, -25));
    else { const k = prog(t, 19.6, 20.1), p = v3(0, .36, -25).lerp(v3(1.5, 1.4, -41.6), k); p.y += Math.sin(k * Math.PI) * .6; setBall(p, k * 10); }
    bulge(t, 20.1, 1.5, 1.4);
    C = cam([{ t: 17.2, pos: [3.4, 3.8, -14], look: [0, 1.6, -34], fov: 42 }, { t: 19.5, pos: [2.2, 3.4, -17], look: [0, 1.6, -35], fov: 40 }, { t: 20.4, pos: [1.6, 2.2, -21], look: [0, .8, -24], fov: 34, ease: 'easeOut' }, { t: 20.9, pos: [1.6, 2.2, -21], look: [0, .8, -24], fov: 34 }, { t: 21.3, pos: [1.0, 3.2, -16.6], look: [0, 2.5, -24], fov: 38, ease: 'easeOut' }, { t: 22.0, pos: [.8, 3.1, -17.4], look: [0, 2.55, -24], fov: 36 }], t, [{ t: 20.1, a: .02 }]);
    post.push(() => {
      if (t > 20.3 && t < 21.2) { const p = toScreen(HA.legs[1].getWorldPosition(new THREE.Vector3()).add(v3(0, -.9, 0))); pill('FOOT DETECTED', p.x, p.y - 120, t, 20.35, '#ff5a5a', '#ffb3b3'); }
      bigWord('DISALLOWED', t, 21.3, 22.0, { y: 470, box: '#d6262f', size: 120, tilt: .06 });
      if (t > 19.6 && t < 19.9) { const p = toScreen(v3(0, .4, -25)); fx((pn) => fxContact(pn, '#fff3b0'), [300, 300], 0, p.x, p.y, .6); }
    });
  } else if (s === 6) { // minute twelve: spin, ponytail swing, crossbar
    place(HA, 0, 0, -31, Math.PI); place(GK, .8, 0, -39); aimSun(0, -33); face(GK, 'shocked');
    const spin = M.anticip(prog(t, 24.4, 25.1)) * Math.PI * 2;
    HA.root.rotation.y = Math.PI + spin;
    const sw = t < 25.1 ? 0 : t < 25.75 ? M.easeOut(prog(t, 25.1, 25.75)) * 2.4 : 2.4 * Math.exp(-(t - 25.75) * 3) * Math.cos((t - 25.75) * 10);
    HA.pose({ ...id(HA, 1), tail: .5 + Math.abs(sw) * .35, tailSwing: sw, armL: .9, armR: -.9, lean: .05 });
    face(HA, t > 27.6 ? 'shocked' : 'determined');
    const HIT = v3(.6, 3.0, -32.2);
    if (t < 23.2) setBall(v3(22, .36, -30));
    else if (t < 25.75) { const k = prog(t, 23.2, 25.75); setBall(new THREE.Vector3(...spline([[22, .36, -30], [12, 7, -31.5], [.6, 3.0, -32.2]], k)), k * 9); }
    else if (t < 27.4) { const k = prog(t, 25.75, 27.4); const p = HIT.clone().lerp(v3(1.8, GH, -40), k); p.y += Math.sin(k * Math.PI) * 1.2; setBall(p, 9 + k * 12); }
    else { const k = prog(t, 27.4, 28.5); setBall(v3(1.8, GH, -40).lerp(v3(2.6, 6.5, -36), M.easeOut(k)), 21 + k * 6); }
    C = cam([{ t: 22.0, pos: [9, 4.2, -23], look: [0, 2.4, -31], fov: 44 }, { t: 25.4, pos: [5.2, 3.4, -24.8], look: [.3, 2.6, -31.5], fov: 42 }, { t: 26.3, pos: [5.2, 3.6, -26.5], look: [.9, 3.0, -35], fov: 42 }, { t: 27.3, pos: [5, 3.8, -31], look: [1.6, 3.4, -39.5], fov: 40 }, { t: 28.5, pos: [4.6, 3.9, -32], look: [1.8, 3.6, -39.5], fov: 38 }], t, [{ t: 27.4, a: .02 }]);
    post.push(() => {
      if (t > 22.2 && t < 23.6) { const a = pop(t, 22.2, .25); withPop(W / 2, 420, a, 1 - prog(t, 23.4, 23.6), () => { drawPixelText(X, "12'", W / 2, 330, { px: 18, color: '#fff', align: 'center', shadow: '#111' }); drawPixelText(X, '>> FAST FORWARD', W / 2, 480, { px: 5, color: '#fff', align: 'center', shadow: '#111' }); }); }
      if (t > 25.7 && t < 26.1) { const p = toScreen(HIT); fx(fxBurst, [500, 500], prog(t, 25.7, 26.1), p.x, p.y, .5); }
      if (t > 27.4 && t < 27.9) { const p = toScreen(v3(1.8, GH, -40)); fx(fxBurst, [500, 500], prog(t, 27.4, 27.9), p.x, p.y, .7, '#ffffff'); }
      bigWord('CROSSBAR!', t, 27.55, 28.5, { y: 470 });
    });
  } else if (s === 7) { // xG freeze
    place(HA, 0, 0, -31, Math.PI); face(HA, 'shocked'); HA.pose({ tail: 1.1, tailSwing: .6, armL: .9, armR: -.9 }); place(GK, .8, 0, -39); face(GK, 'shocked');
    setBall(v3(2.3, 5.2, -37.5), 30); aimSun(0, -35);
    C = cam([{ t: 28.5, pos: [6.5, 4.4, -29.5], look: [2, 4.2, -38.5], fov: 42 }, { t: 31.7, pos: [4, 5.0, -30.5], look: [2, 4.4, -38.5], fov: 38, path: [[5.6, 4.8, -29.6]] }], t);
    post.push(() => {
      card('EXPECTED GOALS (xG)', [{ k: 'FEET', v: '0.89', bar: .89, col: '#4f8cff', at: 29.1 }, { k: 'HAIR', v: '0.04', bar: .04, col: '#ff3b3b', at: 30.1, vc: '#ff6b6b' }], W / 2, 1240, 800, t, 28.6);
      X.fillStyle = 'rgba(0,0,0,.12)'; X.fillRect(0, 0, W, H);
      drawPixelText(X, '|| PAUSED', W - 60, 172, { px: 4, color: '#fff', align: 'right', shadow: '#111' });
    });
  } else if (s === 9) { // half-time team talk (dressing room)
    const g = ROOM; place(MAN, g.x - 1.6, 0, g.z - 1, .7); place(HA, g.x + 1.6, 0, g.z - .6, Math.PI - .5); aimSun(g.x, g.z);
    face(MAN, 'determined'); face(HA, 'neutral');
    const talk = Math.sin(t * 8) * .25;
    MAN.pose({ ...id(MAN, 4), armL: 1.2 + talk, armR: -1.0 + talk, armLf: -.5 });
    HA.pose({ ...id(HA, 1), tail: .5 + (t > 38.7 ? M.back(prog(t, 38.7, 39.1)) * .9 : 0), tailSwing: t > 38.7 ? Math.sin(t * 6) * .25 : 0 });
    C = cam([{ t: 37.6, pos: [g.x + 4.5, 3.4, g.z + 7], look: [g.x, 2.4, g.z - 1], fov: 42 }, { t: 40.0, pos: [g.x + 3.2, 3.2, g.z + 6], look: [g.x + .4, 2.6, g.z - 1], fov: 40 }], t);
    post.push(() => { nameTag('THE HAIR', HA, t, 38.7, 40.0, .9); bigWord('TEAM TALK', t, 37.9, 38.9, { y: 470, size: 120 }); });
  } else if (s === 10) { // not invited (tunnel)
    const g = ROOM; place(HA, g.x + .2, 0, g.z + 27.5, 0); aimSun(g.x, g.z + 27); face(HA, 'sad');
    HA.pose({ ...id(HA, 1), headTilt: .1, armL: .1, armR: -.1 });
    door.rotation.y = -1.3 * (1 - M.easeOut(prog(t, 40.1, 40.45)));
    C = cam([{ t: 40.0, pos: [g.x + 1.2, 3.2, g.z + 36], look: [g.x, 2.6, g.z + 25], fov: 40 }, { t: 41.7, pos: [g.x + .8, 3.0, g.z + 34.5], look: [g.x, 2.6, g.z + 25], fov: 38 }], t, [{ t: 40.45, a: .01 }]);
    post.push(() => { bubble('NOT YOU.', W / 2 - 40, 640, t, 40.6, 41.7); pill('INVITED: ✗', W / 2, 330, t, 41.1, '#ff5a5a', '#ffb3b3'); });
  } else if (s === 11) { // second half free kick: back to goal, head flick, top corner
    place(HA, 0, 0, -22, Math.PI); place(GK, 0, 0, -39); aimSun(0, -28);
    HA.root.rotation.y = Math.PI - Math.PI * M.smooth(prog(t, 43.6, 44.4));
    WALL.forEach((b, i) => { place(b, -2.1 + i * 1.4, 0, -29.5); face(b, t > 46.3 ? 'shocked' : 'angry'); b.pose({ armL: .25, armR: -.25, bounce: t > 45.8 && t < 46.3 ? Math.sin(prog(t, 45.8, 46.3) * Math.PI) * .9 : 0, headTurn: t > 46.1 ? Math.PI * .9 * prog(t, 46.1, 46.4) : 0 }); });
    const flick = prog(t, 45.1, 45.75), whip = M.anticip(flick);
    HA.pose({ ...id(HA, 1), headTilt: 0, lean: -whip * .35, tail: .5 + whip * 1.6, tailSwing: Math.sin(t * 2) * .15 * (1 - flick), armL: t > 46.6 ? 2.6 : .3, armR: t > 46.6 ? -2.6 : -.3 });
    face(HA, t > 46.6 ? 'happy' : 'determined'); face(GK, t > 46.3 ? 'sad' : 'neutral');
    const gd = M.easeOut(prog(t, 46.0, 46.4)); GK.root.position.x = gd * 2; GK.root.rotation.z = gd * .9; GK.root.position.y = gd * .5;
    const FROM = v3(0, .36, -23), TOP = v3(3.9, 3.1, -41.4);
    if (t < 45.75) setBall(FROM);
    else if (t < 46.35) { const k = prog(t, 45.75, 46.35); setBall(new THREE.Vector3(...spline([[0, .36, -23], [1.4, 5.6, -30], [3.9, 3.1, -41.4]], k)), k * 15); }
    else { const tt = t - 46.35; setBall(v3(3.9, Math.max(.36, 3.1 - 9 * tt * tt), -41.6), 15 + tt * 2); }
    bulge(t, 46.35, 3.9, 3.1);
    C = cam([{ t: 41.7, pos: [3.6, 3.4, -11], look: [0, 2.2, -26], fov: 44 }, { t: 45.0, pos: [2.4, 3.0, -14.5], look: [0, 2.4, -24], fov: 38 }, { t: 45.8, pos: [2.0, 3.2, -15.5], look: [0, 2.5, -25], fov: 36 }, { t: 46.5, pos: [4, 4, -16], look: [2.5, 2.8, -38], fov: 40, ease: 'easeOut' }, { t: 46.9, pos: [4, 4, -16], look: [2.5, 2.8, -38], fov: 40 }, { t: 47.4, pos: [1.6, 3.2, -14.6], look: [0, 2.5, -22], fov: 40 }, { t: 49.3, pos: [1.2, 3.1, -15.4], look: [0, 2.5, -22], fov: 38 }], t, [{ t: 46.35, a: .03 }]);
    post.push(() => {
      bigWord('2ND HALF', t, 41.8, 42.9, { y: 470, size: 130 });
      if (t > 45.7 && t < 46.0) { const p = toScreen(FROM); fx((pn) => fxContact(pn, '#fff3b0'), [300, 300], 0, p.x, p.y, .7); }
      if (t > 46.35 && t < 46.9) { const p = toScreen(TOP); fx(fxBurst, [500, 500], prog(t, 46.35, 46.9), p.x, p.y, .8, '#9be7ff'); }
      bigWord('GOAL!!', t, 46.3, 47.4, { y: 470, size: 170 });
      pill('ASSIST: THE PONYTAIL', W / 2, 330, t, 47.2, '#9fb4ff');
      if (t > 47.6) card('HAIR GOALS IN HISTORY', [{ k: 'TOTAL', v: '1', vc: GOLD }], W / 2, 1250, 760, t, 47.6);
    });
    post.push(() => flash(t, 46.35, .2, .55));
  } else if (s === 12) { // volley + scissor kick → hat-trick
    place(HA, 0, 0, -31, Math.PI); place(GK, 0, 0, -39); aimSun(0, -33);
    const first = t < 50.6;
    const tC = first ? 49.95 : 51.6, k = prog(t, tC - .45, tC + .1);
    HA.pose({ ...id(HA, 1), tail: .5 + M.anticip(k) * 1.4, tailSwing: (first ? 1 : -1) * M.anticip(k) * 1.8, lean: first ? 0 : -M.anticip(k) * .8, legL: first ? 0 : -M.anticip(k) * 1.2, legR: first ? 0 : M.anticip(k) * 1.4, armL: t > 52.45 ? 2.6 : .6, armR: t > 52.45 ? -2.6 : -.6, bounce: !first && k > .2 && k < 1 ? Math.sin(k * Math.PI) * .9 : 0 });
    HA.root.rotation.y = Math.PI + (first ? .3 : -.5);
    face(HA, t > 52.45 ? 'happy' : 'determined'); face(GK, 'shocked');
    const gd = M.easeOut(prog(t, tC + .05, tC + .35)); GK.root.position.x = (first ? -1 : 1) * gd * 2; GK.root.rotation.z = (first ? 1 : -1) * gd;
    const hitP = v3(first ? -.4 : .4, 2.8, -32), goalP = v3(first ? -3 : 3.2, first ? 1.2 : 2.6, -41.4);
    if (t < tC) { const kk = prog(t, tC - .9, tC); setBall(hitP.clone().add(v3(0, (1 - kk) * 8, (1 - kk) * 2)), kk * 4); }
    else { const kk = prog(t, tC, tC + .3); setBall(hitP.clone().lerp(goalP, kk), 4 + kk * 10); }
    bulge(t, tC + .3, goalP.x, goalP.y);
    const side = first ? -1 : 1;
    C = cam([{ t: 49.3, pos: [5 * side, 3.4, -24.5], look: [0, 2.6, -35], fov: 44 }, { t: 50.6, pos: [4.2 * side, 3.4, -25.5], look: [0, 2.6, -35], fov: 42 }, { t: 50.61, pos: [-5, 3.0, -25], look: [0, 2.8, -35], fov: 42 }, { t: 53.3, pos: [-3, 3.4, -24], look: [0, 2.4, -33], fov: 40 }], t, [{ t: tC + .3, a: .025 }]);
    post.push(() => {
      if (t > tC && t < tC + .35) { const p = toScreen(hitP); fx(fxBurst, [500, 500], prog(t, tC, tC + .35), p.x, p.y, .45); }
      bigWord(first ? 'HAIR VOLLEY' : 'HAIR SCISSOR-KICK', t, tC + .3, first ? 50.75 : 52.4, { y: 470, size: 110 });
      bigWord('HAT-TRICK', t, 52.45, 53.3, { y: 470, size: 160, fill: GOLD });
      if (t > 52.45) { const p = toScreen(v3(0, 0, -31)); fx(fxPuff, [300, 300], prog(t, 52.45, 53.2), p.x, p.y - 20, 1.4); }
    });
    post.push(() => flash(t, tC + .3, .15, .4));
  } else if (s === 13) { // player of the match → the hair; Haaland subbed off; manager quote; full time
    place(HA, 0, 0, -10, 0); aimSun(0, -8);
    const off = t > 56.5; const wk = walk(F(t), F(56.6), 1.4);
    if (off) { HA.root.position.x = -wk.dist; HA.root.rotation.y = -Math.PI / 2; }
    const st = Math.sin(wk.phase * Math.PI * 2);
    HA.pose({ ...id(HA, 1), tail: t > 54.6 && !off ? .5 + M.back(prog(t, 54.6, 55)) * .8 : .5, tailSwing: t > 54.6 && !off ? Math.sin(t * 5) * .3 : 0, legL: off ? st * .5 : 0, legR: off ? -st * .5 : 0, armL: off ? -st * .3 + .15 : .2, armR: off ? st * .3 - .15 : -.2 });
    face(HA, t > 55.7 ? 'crying' : 'happy');
    trophy.visible = t > 54.6; if (trophy.visible) { const h = HA.tail[3].getWorldPosition(new THREE.Vector3()); trophy.position.copy(h).add(v3(0, -.2 + (1 - M.back(prog(t, 54.6, 55))) * 3, -.25)); trophy.rotation.y = t * 2; trophy.scale.setScalar(.8); }
    place(REF, -6, 0, -8, .5); REF.pose({ armL: 2.0, armR: -2.0 }); face(REF, 'neutral');
    subBoard.visible = t > 55.7; subBoard.position.set(-6, 3.9, -7.7); subBoard.rotation.y = .5;
    place(MAN, 6, 0, -7, -.6); face(MAN, t > 57.4 ? 'smug' : 'neutral'); MAN.pose({ armR: t > 57.4 ? -1.4 : -.2, armL: .3 });
    C = cam([{ t: 53.3, pos: [0, 3.0, -2.5], look: [0, 2.6, -10], fov: 40 }, { t: 55.6, pos: [0, 3.2, -1.5], look: [0, 2.9, -10], fov: 38 }, { t: 56.4, pos: [0, 4.4, 4.5], look: [-1, 2.4, -9], fov: 44, ease: 'easeOut' }, { t: DUR, pos: [0, 4.6, 5.5], look: [-1.5, 2.4, -9], fov: 44 }], t);
    post.push(() => {
      card('PLAYER OF THE MATCH', [{ k: 'WINNER', v: 'THE HAIR', vc: GOLD, at: 54.6 }, { k: 'RATING', v: '★★★★★', vc: GOLD, at: 54.9 }], W / 2, 1240, 760, t, 53.5, 55.7);
      if (t > 54.6 && t < 55.7) { const p = toScreen(HA.tail[2].getWorldPosition(new THREE.Vector3())); fx(fxStars, [420, 210], (t - 54.6) % 1, p.x, p.y - 60, .9); }
      pill('SUBBED OFF: HAALAND', W / 2, 330, t, 56.5, '#ff5a5a', '#ffb3b3', 59.3);
      if (t > 57.4 && t < 59.3) { const p = toScreen(MAN.head.getWorldPosition(new THREE.Vector3()).add(v3(0, 1.0, 0))); bubble('BETTER MOVEMENT.', Math.min(W - 230, p.x - 80), p.y - 30, t, 57.45, 59.3); }
      if (t > 59.3) {
        const k = pop(t, 59.3, .3);
        withPop(W / 2, 760, k, 1, () => { panel(W / 2 - 330, 660, 660, 200); drawPixelText(X, 'FULL TIME', W / 2, 690, { px: 6, color: GOLD, align: 'center' }); drawPixelText(X, 'MCI 3-0 OPP', W / 2, 770, { px: 7, color: '#fff', align: 'center' }); });
        const k2 = pop(t, 59.7, .3);
        withPop(W / 2, 1460, k2, 1, () => { X.fillStyle = '#b5121b'; X.fillRect(W / 2 - 420, 1390, 840, 140); X.strokeStyle = '#ff8a8a'; X.lineWidth = 5; X.strokeRect(W / 2 - 417, 1393, 834, 134);
          drawPixelText(X, 'MOST LIKED COMMENT', W / 2, 1418, { px: 5, color: '#fff', align: 'center' }); drawPixelText(X, 'DECIDES THE NEXT VIDEO', W / 2, 1478, { px: 5, color: '#fff', align: 'center' }); });
      }
    });
  }

  // camera
  camera.position.set(...C.pos); camera.fov = C.fov; camera.updateProjectionMatrix();
  const roll = (C.roll || 0) * Math.PI / 180; camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(...C.look);
  renderer.render(scene, camera);
  X.drawImage(renderer.domElement, 0, 0);
  // overlays: score bug, shot overlays, captions, cut flashes
  if (!(s === 3 || s === 8 || s === 9 || s === 10)) scoreBug(`MCI ${score(t)} OPP ${clock(t)}`);
  post.forEach(fn => fn());
  if (SHOW_CAPTIONS) caption(t);
  for (const c of SH.slice(1, -1)) flash(t, c, .1, .35);
}

window.renderFrame = (f) => frame(f / FPS);
window.outCanvas = out; window.FRAMES = Math.round(DUR * FPS); window.ready = true;
if (!new URLSearchParams(location.search).has('render')) { const t0 = performance.now(); const loop = () => { frame(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); }; loop(); }
