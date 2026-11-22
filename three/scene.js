// MY SHADOW QUIT AND RAN AWAY — three.js port of shadow_section.py (same shots, timing, staging, camera).
// Logic runs in the Blender section's coordinates (Z up, heading 0 = facing +Y); B() converts to three (Y up).
import * as THREE from 'three';

const W = 720, H = 1280, FPS = 30, DUR = 52.285, NF = 1568, D = Math.PI / 180;
const Q = new URLSearchParams(location.search);
// ---------------------------------------------------------------- math helpers (ported from anim_kit.py)
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const prog = (t, a, b) => b !== a ? clamp((t - a) / (b - a)) : (t >= b ? 1 : 0);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eo = x => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const noise1 = (t, s = 0) => Math.sin(t * 1.7 + s) * .5 + Math.sin(t * 2.9 + s * 1.3) * .3 + Math.sin(t * 5.3 + s * 2.1) * .2;
const jitter = (t, amp, s = 0) => amp * (Math.sin(t * 61 + s) * .6 + Math.sin(t * 43 + s * 2) * .4);
const face_to = (x0, y0, x1, y1) => Math.atan2(-(x1 - x0), y1 - y0) / D;
const tsec = f => (f - 1) / FPS;
const sin = Math.sin, cos = Math.cos, abs = Math.abs;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const B = (x, y, z) => new THREE.Vector3(x, z, -y);                       // blender -> three
const toB = v => [v.x, -v.z, v.y];                                       // three -> blender
const add = (...ps) => { const o = {}; for (const p of ps) for (const k in p) o[k] = (o[k] || 0) + p[k]; return o; };
const lerpP = (a, b, t) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * t; return o; };
function kp(lt, keys, fn = eio) {
  if (lt <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [t0, a] = keys[i], [t1, b] = keys[i + 1]; if (lt <= t1) return lerpP(a, b, (keys[i + 1][2] || fn)(prog(lt, t0, t1))); }
  return keys[keys.length - 1][1];
}
// ---------------------------------------------------------------- poses
const P = {
  scared: { uaLX: -35, laLX: -70, uaRX: -35, laRX: -70, spX: -6, hdX: -6, uaLZ: 10, uaRZ: -10 },
  cover: { uaLX: -110, laLX: -100, uaRX: -110, laRX: -100, uaLZ: -20, uaRZ: 20, spX: 22, hdX: 20 },
  laugh: { spX: -10, hdX: -18, uaLX: -40, laLX: -80, uaLZ: -10 },
  cross: { uaLX: -48, laLX: -98, uaLZ: -40, uaRX: -48, laRX: -98, uaRZ: 40, spX: -5, hdX: -5 },
  read: { uaLX: -58, laLX: -48, uaLZ: -14, uaRX: -58, laRX: -48, uaRZ: 14, hdX: 18 },
  hero: { uaLZ: 9, uaRZ: -9, spX: -4, hdX: -4, ulLX: -4, ulRX: 4 },
  flail: { uaLZ: 120, uaRZ: -120, ulLX: -40, ulRX: 20, llLX: 40, spX: -20, hdX: -20 },
};
function walk(ph, amp = 35, arm = .85, knee = 0, lean = 0) {
  const s = sin(ph), c = cos(ph);
  const o = { ulLX: -amp * s, ulRX: amp * s, uaLX: amp * arm * s, uaRX: -amp * arm * s, spX: lean, hdX: -lean * .5, bob: .06 * abs(c) - .03, spY: amp * .12 * s };
  if (knee) { o.llLX = knee * Math.max(0, sin(ph + 1.2)); o.llRX = knee * Math.max(0, -sin(ph + 1.2)); o.laLX = -knee * .9; o.laRX = -knee * .9; }
  return o;
}
const run = ph => walk(ph, 48, 1.1, 75, 14);
const walkph = (d, stride = 2.29) => d / stride * Math.PI;
function walk2(ph, amp = 30, arm = .85, knee = 26, lean = 3) { const o = walk(ph, amp, arm, knee, lean); o.spY = amp * .18 * sin(ph); o.hdY = -amp * .1 * sin(ph); o.lowZ = 3 * sin(ph); return o; }
function breathe(t, k = 1, s = 0) { const b = sin(t * 2.2 + s); return { spX: b * 1.2 * k, uaLZ: 3 + b * 1.5 * k, uaRZ: -3 - b * 1.5 * k, hdX: noise1(t * .6, s) * 3 * k, hdY: noise1(t * .35, s + 3) * 5 * k }; }
function pant(t, k = 1) { const b = sin(t * 9); return { spX: 3 + b * 3 * k, hdX: -b * 3 * k, uaLZ: 6 + b * 2 * k, uaRZ: -6 - b * 2 * k }; }
function alive(t, k = 1, s = 0) {
  const w_ = sin(t * .9 + s * 1.7);
  return add(breathe(t, k, s), { lowZ: 2.2 * w_ * k, spZ: -1.6 * w_ * k, hdZ: 1.2 * w_ * k, ulLX: -2.5 * Math.max(0, w_) * k, llLX: 5 * Math.max(0, w_) * k,
    ulRX: -2.5 * Math.max(0, -w_) * k, llRX: 5 * Math.max(0, -w_) * k, hdY: noise1(t * .45, s + 7) * 7 * k, laLX: -6 + 3 * noise1(t * .7, s + 2) * k, laRX: -6 + 3 * noise1(t * .8, s + 4) * k });
}
function dance(t, kind, s = 0) {
  const w = t * 7.5 + s, S = sin(w), C = cos(w), s2 = sin(2 * w);
  if (kind === 0) return { uaLZ: 128 + 28 * S, uaRZ: -128 + 28 * S, laLX: -30, laRX: -30, spY: 12 * S, spZ: 8 * C, hdY: 10 * S, ulLX: -18 * Math.max(0, S), ulRX: -18 * Math.max(0, -S), llLX: 30 * Math.max(0, S), llRX: 30 * Math.max(0, -S), bob: .22 * abs(s2) };
  if (kind === 1) return { uaLX: -20, uaRX: -20, laLX: -110, laRX: -110, uaLZ: 30 + 32 * abs(s2), uaRZ: -30 - 32 * abs(s2), hdX: 14 * s2, spX: 12, ulLX: -25 * Math.max(0, S), llLX: 40 * Math.max(0, S), ulRX: -25 * Math.max(0, -S), llRX: 40 * Math.max(0, -S), bob: .18 * abs(s2) };
  if (kind === 2) return { spZ: 24 * S, uaLX: -45 * S, uaRX: 45 * S, uaLZ: 20, uaRZ: -20, laLX: -40, laRX: -40, hdY: -14 * S, spY: 8 * C, bob: .12 * abs(C) };
  if (kind === 3) { const k = .5 + .5 * sin(w * 1.2); return { uaLZ: 150 * k, uaRZ: -150 * k, ulLZ: -18 * k, ulRZ: 18 * k, bob: 1.2 * k * k }; }
  return add(P.flail, { spZ: 25 * S, hdY: 20 * C, bob: .3 * abs(s2) });
}
const ST = (x, y, h, p, f, z = 0, tilt = 0) => [x, y, z, h, p, f, tilt];
const HIDE_ = [0, -900, -80, 0, {}, null, 0];
function along(t, t0, a, b, speed) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6; const d = clamp((t - t0) * speed, 0, L), u = d / L;
  return [a[0] + dx * u, a[1] + dy * u, d, (t0 <= t && d < L), face_to(a[0], a[1], b[0], b[1])];
}
function runner(t, t0, a, b, speed, seed = 0) { const [x, y, d, mv, h] = along(t, t0, a, b, speed); return [x, y, h, mv ? run(walkph(d, 3.2) + seed) : null]; }
const fwv = h => [-sin(h * D), cos(h * D)];
const sidev = h => [cos(h * D), sin(h * D)];

// ---------------------------------------------------------------- renderer + scene
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, .05, 2000);
const col = c => Array.isArray(c) ? new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace) : new THREE.Color(c);
const MC = {};
function M(c, o = {}) {
  const key = JSON.stringify([c, o.r, o.e, o.basic]); if (MC[key] && !o.fresh) return MC[key];
  const m = o.basic ? new THREE.MeshBasicMaterial({ color: col(c) }) : new THREE.MeshStandardMaterial({ color: col(c), roughness: o.r ?? .65, metalness: o.metal ?? 0 });
  if (o.e) { m.emissive = col(c); m.emissiveIntensity = o.e; }
  if (!o.fresh) MC[key] = m; return m;
}
function ctex(w, h, draw, rep) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const css = c => '#' + col(c).getHexString();
const GBOX = new THREE.BoxGeometry(1, 1, 1), GSPH = new THREE.SphereGeometry(1, 20, 14), GCYL = new THREE.CylinderGeometry(1, 1, 1, 16), GCONE = new THREE.ConeGeometry(1, 1, 16);
// box in blender terms: size (sx,sy,sz), centre (x,y,z), rotation about z (deg)
function box(sz, loc, m, o = {}) {
  const me = new THREE.Mesh(o.geo || GBOX, m); me.scale.set(sz[0], sz[2], sz[1]); me.position.copy(B(...loc)); if (o.rz) me.rotation.y = o.rz * D;
  if (o.rx) me.rotation.x = o.rx * D;
  me.castShadow = o.cast ?? true; me.receiveShadow = o.recv ?? true; (o.parent || scene).add(me); return me;
}
const sph = (sz, loc, m, o = {}) => box(sz.map(v => v * 2), loc, m, { ...o, geo: GSPH });
const cyl = (r, h, loc, m, o = {}) => box([r * 2, r * 2, h], loc, m, { ...o, geo: GCYL });
function grp(loc, rz = 0, parent = scene) { const g = new THREE.Group(); g.position.copy(B(...loc)); g.rotation.y = rz * D; parent.add(g); return g; }

// ---------------------------------------------------------------- faces
const TL = new THREE.TextureLoader(), FT = {};
function faceTex(dark, key) {
  const k = (dark ? 'dark/' : 'light/') + key; if (FT[k]) return FT[k];
  const t = TL.load('./assets/faces/' + k + '.png'); t.colorSpace = THREE.SRGBColorSpace; return FT[k] = t;
}
const MOUTH_OF = { neutral: 'flat', blink: 'flat', happy: 'smile', soft: 'smallsmile', smirk: 'smirk', smug: 'smirkgrin', squint: 'flat', sad: 'frown', cry: 'wail', surprised: 'o', shock: 'gasp', scared: 'grit', nervous: 'wavy', angry: 'grit', fierce: 'gritbig', laugh: 'laugh', happycry: 'laugh', sleep: 'tiny', tired: 'frownflat', stare: 'flat', hollow: 'frownflat', think: 'slant', love: 'smile', cringe: 'grit' };
const BLINKABLE = new Set(['neutral', 'soft', 'smirk', 'sad', 'surprised', 'scared', 'nervous', 'angry', 'fierce', 'think', 'stare', 'tired', 'smug', 'hollow']);
const TALK_V = ['v_a', 'v_b', 'v_c', 'v_o', 'v_e', 'v_b', 'v_a', 'v_s'];
const parseFace = fc => fc.startsWith('S:') ? [fc, null] : [MOUTH_OF[fc] ? fc : 'neutral', MOUTH_OF[MOUTH_OF[fc] ? fc : 'neutral']];

// ---------------------------------------------------------------- R6 character
function bandTex(stops, flip = false) {
  return ctex(4, 128, (g, w, h) => { for (let i = 0; i < stops.length; i++) { const [p, c] = stops[i], p1 = i + 1 < stops.length ? stops[i + 1][0] : 1; g.fillStyle = css(c); g.fillRect(0, h * (1 - p1), w, h * (p1 - p)); } });
}
function piece(tex, lo, hi) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1, hi - lo); t.offset.set(0, lo); return new THREE.MeshStandardMaterial({ map: t, roughness: .6 }); }
const CHARS = {};
function mkChar(nm, o) {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); body.scale.setScalar(o.scale); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 2; body.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const mesh = (m, sx, sy, sz, x, y, z, parent) => { const me = new THREE.Mesh(GBOX, m); me.scale.set(sx, sy, sz); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me; };
  mesh(piece(bandTex(o.top), 0, 1), 2, 2, 1, 0, 1, 0, torso);
  const neck = new THREE.Group(); neck.position.y = 2; torso.add(neck);
  const head = new THREE.Group(); neck.add(head);
  const skinM = M(o.skin, { r: .5 });
  const hb = mesh(skinM, 1.25, 1.25, 1.25, 0, .64, 0, head);
  const fmat = () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false });
  const eyes = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), fmat()); eyes.position.set(0, .64, -.632); eyes.rotation.y = Math.PI; head.add(eyes);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), fmat()); mouth.position.set(0, .64, -.634); mouth.rotation.y = Math.PI; head.add(mouth);
  const armT = bandTex([[0, o.skin], [.43, o.sleeve ?? o.skin]]), legT = bandTex(o.legs);
  const arms = {}, legs = {};
  for (const [S, x] of [['L', -1.5], ['R', 1.5]]) {
    const sh = new THREE.Group(); sh.position.set(x, 1.9, 0); torso.add(sh); mesh(piece(armT, .5, 1), 1, 1, 1, 0, -.45, 0, sh);
    const el = new THREE.Group(); el.position.y = -.95; sh.add(el); mesh(piece(armT, 0, .5), .98, 1.05, .98, 0, -.5, 0, el);
    const tip = new THREE.Group(); tip.position.y = -1.05; el.add(tip); arms[S] = { sh, el, tip };
    const hp = new THREE.Group(); hp.position.set(x / 3, 0, 0); hips.add(hp); mesh(piece(legT, .5, 1), 1, 1, 1, 0, -.5, 0, hp);
    const kn = new THREE.Group(); kn.position.y = -1; hp.add(kn); mesh(piece(legT, 0, .5), .98, 1, .98, 0, -.5, 0, kn); legs[S] = { hp, kn };
  }
  const hm = M(o.hairCol || [0, 0, 0], { r: .45 });
  const hs = (sx, sy, sz, x, y, z, rx = 0, rz = 0) => { const me = new THREE.Mesh(GSPH, hm); me.scale.set(sx, sy, sz); me.position.set(x, y, z); me.rotation.set(rx * D, 0, rz * D); me.castShadow = true; head.add(me); return me; };
  if (o.hair === 'spiky') {
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; hs(.27, .62, .27, sin(a) * .38, 1.45, cos(a) * .3 + .05, cos(a) * 28, -sin(a) * 30); }
    hs(.3, .7, .3, 0, 1.55, .05); for (const sx of [-1, 1]) hs(.22, .42, .42, sx * .7, .75, .1);
    if (o.headband) { const hbm = M(o.headband, { r: .5 }); const me = new THREE.Mesh(GBOX, hbm); me.scale.set(1.45, .32, 1.45); me.position.set(0, 1.12, 0); me.castShadow = true; head.add(me); }
  } else if (o.hair === 'pony') {
    hs(.72, .42, .72, 0, 1.15, .06); hs(.66, .6, .3, 0, .85, .5); hs(.26, .55, .26, 0, .95, .95, 40); if (o.hairCol2) { const t = new THREE.Mesh(GSPH, M(o.hairCol2)); t.scale.set(.14, .14, .14); t.position.set(0, 1.2, .78); head.add(t); }
  } else if (o.hair === 'dome') { hs(.7, .4, .7, 0, 1.2, .04); }
  else if (o.hair === 'cap') { const me = new THREE.Mesh(GBOX, M(o.hairCol)); me.scale.set(1.35, .45, 1.35); me.position.set(0, 1.42, 0); head.add(me); const br = new THREE.Mesh(GBOX, M(o.hairCol)); br.scale.set(1.1, .1, .7); br.position.set(0, 1.22, -.95); head.add(br); }
  const c = { nm, root, body, hips, torso, neck, head, arms, legs, eyes, mouth, scale: o.scale, fam: o.fam, dark: !!o.dark };
  CHARS[nm] = c; return c;
}
function applyPose(c, st) {
  const [x, y, z, h, p, , tilt] = st;
  if (y < -800) { c.root.visible = false; return; }
  c.root.visible = true; c.root.position.copy(B(x, y, z + (p.bob || 0))); c.root.rotation.set(tilt * D, h * D, 0, 'YXZ');
  const g = k => (p[k] || 0) * D;
  c.torso.rotation.set(-g('spX'), g('spY'), -g('spZ'), 'YXZ'); c.hips.rotation.set(0, 0, -g('lowZ') * .5);
  c.head.rotation.set(-g('hdX'), g('hdY'), -g('hdZ'), 'YXZ');
  for (const S of ['L', 'R']) {
    c.arms[S].sh.rotation.set(-g('ua' + S + 'X'), g('ua' + S + 'Y'), -g('ua' + S + 'Z'), 'YXZ'); c.arms[S].el.rotation.set(-g('la' + S + 'X'), 0, 0);
    c.legs[S].hp.rotation.set(-g('ul' + S + 'X'), 0, -g('ul' + S + 'Z'), 'YXZ'); c.legs[S].kn.rotation.set(-g('ll' + S + 'X'), 0, 0);
  }
}
function setFace(c, eyeKey, mouthKey) {
  const em = c.eyes.material, mm = c.mouth.material;
  if (eyeKey.startsWith('S:')) { em.map = faceTex(c.dark, 'S_' + eyeKey.slice(2)); mm.visible = false; }
  else { em.map = faceTex(c.dark, `E_${c.fam}_${eyeKey}`); mm.visible = true; mm.map = faceTex(c.dark, 'M_' + mouthKey); mm.needsUpdate = true; }
  em.needsUpdate = true;
}

// ---------------------------------------------------------------- SETS
const DBX = 400, DBY = 0, NBX = 400, NBY = 100;
const WHITE = M([.95, .95, .93], { r: .55 }), DARKM = M([.04, .04, .05], { r: .5 });
const woodT = ctex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#a0704a', '#986a44', '#a77650', '#93653f'][i % 4]; g.fillRect(0, i * h / 8, w, h / 8 - 2); g.fillStyle = '#6b4a30'; g.fillRect((i * 97) % w, i * h / 8, 3, h / 8); } }, [6, 6]);
const stripeT = (a, b, n, rep) => ctex(64, 64, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * w / n, 0, w / n, h); } }, rep);
function bedroom(ox, oy, night) {
  const w = 30, d = 26, h = 12;
  const floorM = new THREE.MeshStandardMaterial({ map: woodT, roughness: .35 });
  box([w, d, .2], [ox, oy, -.1], floorM, { cast: false });
  box([w, d, .3], [ox, oy, h + .15], M([.95, .94, .9], { r: .8 }), { cast: false });
  const wallM = M([.35, .55, .75], { r: .85 });
  for (const s of [-1, 1]) box([w + 1.2, .6, h], [ox, oy + s * (d / 2 + .3), h / 2], wallM, { cast: false });
  box([.6, d, h], [ox + w / 2 + .3, oy, h / 2], wallM, { cast: false });
  const xw = ox - w / 2 - .3;
  box([.6, d, 3.6], [xw, oy, 1.8], wallM, { cast: false }); box([.6, d, 2.4], [xw, oy, h - 1.2], wallM, { cast: false });
  for (const s of [-1, 1]) box([.6, (d - 8) / 2, h - 6], [xw, oy + s * (d / 4 + 2), 3.6 + (h - 6) / 2], wallM, { cast: false });
  const sky = night ? [.03, .05, .18] : [.55, .78, 1];
  box([.2, 8, h - 6], [xw - .4, oy, 3.6 + (h - 6) / 2], M(sky, { basic: true }), { cast: false });
  box([.4, .25, h - 6], [xw + .1, oy, 3.6 + (h - 6) / 2], WHITE); box([1.2, 8.6, .3], [xw + .5, oy, 3.7], WHITE);
  for (const s of [-1, 1]) for (let j = 0; j < 5; j++) box([.3, .7, h - 3.5], [xw + .9 + (j % 2 ? .2 : 0), oy + s * (4.6 + j * .6), (h - 3.5) / 2 + 2], M([.95, .75, .3], { r: .85 }), { rz: j % 2 ? 25 : -25 });
  for (const s of [-1, 1]) box([w, .25, .6], [ox, oy + s * (d / 2 - .1), .3], WHITE);
  // bed
  const bx = ox - 3, by = oy + d / 2 - 6.6, wd = M([.45, .28, .15], { r: .45 });
  box([7.6, 12.4, 1.4], [bx, by, 1.0], wd); box([8, .6, 5.5], [bx, by + 6.3, 2.75], wd); box([7.2, 12, 1.1], [bx, by, 2.25], WHITE);
  box([7.6, 8.4, .6], [bx, by - 1.9, 3.0], new THREE.MeshStandardMaterial({ map: stripeT('#f2a65a', '#fbe0b0', 8, [1, 1]), roughness: .8 }));
  box([7.6, 1.2, .7], [bx, by + 2.6, 3.05], WHITE); for (const sx of [-1.7, 1.7]) box([3, 1.9, .9], [bx + sx, by + 4.6, 3.2], WHITE, { rx: -14 });
  // nightstand + lamp
  const nx = bx + 5.6; box([2.6, 2.4, 3], [nx, by + 4.8, 1.5], wd); cyl(.45, 1, [nx, by + 4.8, 3.3], DARKM); cyl(.08, 1.2, [nx, by + 4.8, 4.0], DARKM);
  const shade = box([1.8, 1.8, 1.2], [nx, by + 4.8, 5.0], M([1, .85, .55], { e: 1.2, fresh: true }), { geo: new THREE.CylinderGeometry(.35, .5, 1, 16), cast: false });
  // desk + monitor + pc
  const dx = ox + w / 2 - 2.4, dy = oy - 2;
  box([4, 9, .3], [dx, dy, 3.2], wd); for (const sy of [-4.2, 4.2]) box([3.6, .3, 3.1], [dx, dy + sy, 1.55], wd);
  box([.3, 5.2, 3], [dx + .8, dy, 5.6], DARKM);
  const scr = ctex(128, 80, (g, W_, H_) => { const gr = g.createLinearGradient(0, 0, W_, H_); gr.addColorStop(0, '#4fb0ff'); gr.addColorStop(1, '#62e07a'); g.fillStyle = gr; g.fillRect(0, 0, W_, H_); g.fillStyle = '#ffffff88'; g.fillRect(10, 50, 50, 14); });
  const scrM = new THREE.MeshBasicMaterial({ map: scr, toneMapped: false }); const sp = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.7), scrM); sp.position.copy(B(dx + .62, dy, 5.6)); sp.rotation.y = -Math.PI / 2; scene.add(sp);
  box([1.6, 2.2, 3.4], [dx, dy - 5.6, 1.7], DARKM); box([.05, 1.8, 3], [dx - .82, dy - 5.6, 1.7], M([.6, .2, 1], { basic: true }), { cast: false });
  box([1.2, 3.4, .15], [dx - .6, dy, 3.4], DARKM);
  const ge = grp([dx - 4.2, dy, 0], 90); const red = M([.85, .12, .12], { r: .4 });
  box([2.6, 2.6, .5], [0, 0, 1.9], red, { parent: ge }); box([2.6, .5, 4.2], [0, 1.2, 4.1], red, { parent: ge }); cyl(.2, 1.6, [0, 0, 1.0], DARKM, { parent: ge });
  // shelves + books
  const BK = ['#c0392b', '#2e86de', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#16a085', '#ecf0f1'];
  for (let k = 0; k < 2; k++) {
    box([6, 1.4, .25], [ox + 8, oy + d / 2 - .8, 7 + k * 2.4], wd);
    for (let b = 0; b < 9; b++) box([.32, .9, 1.1 + (b % 3) * .15], [ox + 5.6 + b * .4, oy + d / 2 - .8, 7.15 + k * 2.4 + .6], M(new THREE.Color(BK[(b + k * 3) % 8]).toArray()), {});
  }
  // posters
  const poster = (x, y, z, pw, ph, rz, seed) => { const r = mulberry(seed); const t = ctex(96, 128, g => { g.fillStyle = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2'][seed % 4]; g.fillRect(0, 0, 96, 128); for (let i = 0; i < 4; i++) { g.fillStyle = ['#073b4c', '#ffffff', '#ef476f', '#ffd166'][i]; g.beginPath(); g.arc(r() * 96, r() * 128, 10 + r() * 22, 0, 7); g.fill(); } g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(0, 0, 96, 128); });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: t, roughness: .7 })); me.position.copy(B(x, y, z)); me.rotation.y = rz * D; scene.add(me); };
  poster(bx + 9, oy + d / 2 - .06, 4.0, 3, 4, 180, 31); poster(ox - 11, oy + d / 2 - .06, 8.5, 3.2, 2.4, 180, 32); poster(ox + w / 2 - .06, oy + 5, 8.6, 3, 4, 90, 33);
  // rug, wardrobe, clothes, ball, fairy lights
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ map: stripeT('#3a73cc', '#f2ead8', 10, [1, 1]), roughness: .95 }));
  rug.rotation.x = -Math.PI / 2; rug.scale.set(7, 5, 1); rug.position.copy(B(ox + 1, oy - 3, .02)); rug.receiveShadow = true; scene.add(rug);
  box([3.6, 6, 10], [ox - w / 2 + 2.4, oy - d / 2 + 4.2, 5], wd);
  for (let k = 0; k < 4; k++) box([1.6, 1.2, .5], [ox - 6 + k * .6, oy - d / 2 + 3.5, .3 + k * .4], M([[.2, .4, .9], [.95, .95, .95], [.9, .2, .2], [.2, .7, .3]][k]), { rz: k * 30 });
  sph([.9, .9, .9], [ox + 6, oy - d / 2 + 3, .9], M([1, .5, .1]));
  for (let k = 0; k < 30; k++) { const u = k / 29; sph([.13, .13, .13], [ox - w / 2 + 1 + u * (w - 2), oy + d / 2 - .4, h - .7 - sin(u * Math.PI) * 1.0], M([1, .85, .55], { basic: true }), { cast: false }); }
  return { shade, scrM };
}
const ROOM_D = bedroom(DBX, DBY, false), ROOM_N = bedroom(NBX, NBY, true);
// door (day room, south wall)
const DOOR_X = DBX + 9, WY = DBY - 13.0;
box([5.4, .3, 8.8], [DOOR_X, WY + .15, 4.4], M([.01, .01, .015], { basic: true }), { cast: false });
const FRM = M([.97, .96, .93], { r: .5 }); box([6.4, .4, .6], [DOOR_X, WY + .2, 8.9], FRM); box([.5, .4, 8.8], [DOOR_X - 2.95, WY + .2, 4.4], FRM); box([.5, .4, 8.8], [DOOR_X + 2.95, WY + .2, 4.4], FRM);
const DOORH = grp([DOOR_X + 2.7, WY + .55, 0]); box([5.3, .3, 8.6], [-2.65, 0, 4.3], M([.62, .38, .2], { r: .45 }), { parent: DOORH }); sph([.22, .22, .22], [-4.6, -.25, 4.2], M([.9, .75, .3], { r: .3, metal: .9 }), { parent: DOORH });
// light switch (night room, east wall)
const SW_Y = NBY - 10; box([.12, .9, 1.4], [NBX + 14.94, SW_Y, 4.5], WHITE); box([.18, .22, .4], [NBX + 14.84, SW_Y, 4.55], M([.8, .8, .78]));
const EYES = [-1, 1].map(sx => sph([.5, .12, .75], [NBX + 10.8 + sx, NBY + 12.4, 3.4], new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), { cast: false }));

// ---------------------------------------------------------------- STREET
const asph = ctex(256, 256, (g, w, h) => { g.fillStyle = '#3d4250'; g.fillRect(0, 0, w, h); const r = mulberry(4); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < .5 ? '#363a46' : '#474c5a'; g.fillRect(r() * w, r() * h, 2, 2); } }, [24, 3]);
box([180, 22, .2], [0, 0, -.1], new THREE.MeshStandardMaterial({ map: asph, roughness: .9 }), { cast: false });
for (let k = 0; k < 22; k++) box([4, .35, .03], [-90 + 4 + k * 8, 0, .02], M([.95, .8, .2]), { cast: false });
for (let k = 0; k < 9; k++) box([1.6, 20, .03], [14 + k * 3, 0, .02], WHITE, { cast: false });
const paver = ctex(128, 128, (g, w, h) => { g.fillStyle = '#b9b6ae'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9d9a92'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }, [45, 3]);
for (const s of [-1, 1]) { box([180, 11, .5], [0, s * 16.5, .25], new THREE.MeshStandardMaterial({ map: paver, roughness: .8 }), { cast: false }); box([180, .6, .55], [0, s * 11.3, .27], M([.7, .7, .68])); }
const SIGNS = ['BAKERY', 'FLOWERS', 'PIZZA', 'ICE CREAM', 'COFFEE', 'BOOKS', 'TOYS', 'DINER'];
const WALLS = [['#e8b88a', 'plaster'], ['#b5553f', 'brick'], ['#cfd8e6', 'plaster'], ['#f2d98d', 'plaster'], ['#a8463a', 'brick'], ['#d9b0c9', 'plaster'], ['#9ec7b5', 'plaster']];
const AWN = ['#e6b422', '#7a4fb5', '#d9443a', '#3a7bd5', '#2ea36b'];
function facade(wid, fl, seed) {
  const ppu = 16, fh = 4.2, Wp = wid * ppu, Hp = fl * fh * ppu, r = mulberry(seed); const [wc, kind] = WALLS[seed % WALLS.length];
  return ctex(Wp, Hp, (g) => {
    g.fillStyle = wc; g.fillRect(0, 0, Wp, Hp);
    if (kind === 'brick') { g.strokeStyle = '#00000022'; g.lineWidth = 1; for (let y = 0; y < Hp; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(Wp, y); g.stroke(); for (let x = (y / 6) % 2 * 8; x < Wp; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 6); g.stroke(); } } }
    const nw = Math.max(2, Math.round(wid / 5));
    for (let f = 1; f < fl; f++) { const y0 = Hp - (f + 1) * fh * ppu + 14;
      for (let i = 0; i < nw; i++) { const x0 = (i + .5) * Wp / nw - 18; g.fillStyle = '#f4f1ea'; g.fillRect(x0 - 4, y0 - 4, 44, 46); g.fillStyle = r() < .2 ? '#ffe9a8' : '#2c3a4f'; g.fillRect(x0, y0, 36, 38); g.fillStyle = '#f4f1ea'; g.fillRect(x0 + 16, y0, 4, 38); g.fillRect(x0, y0 + 17, 36, 4); g.fillStyle = '#6d6a64'; g.fillRect(x0 - 6, y0 + 42, 48, 5);
        if (r() < .3) { g.fillStyle = '#c25b3a'; g.fillRect(x0 - 2, y0 + 30, 40, 8); g.fillStyle = ['#e33', '#fd3', '#f6c'][i % 3]; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x0 + 4 + k * 10, y0 + 29, 4, 0, 7); g.fill(); } } } }
    const gy = Hp - fh * ppu; g.fillStyle = '#ece7dc'; g.fillRect(0, gy, Wp, fh * ppu);
    g.fillStyle = '#26323f'; g.fillRect(Wp * .08, gy + 26, Wp * .55, fh * ppu - 30); g.fillStyle = '#cfe3ee'; g.fillRect(Wp * .1, gy + 30, Wp * .51, fh * ppu - 38);
    g.fillStyle = '#2b2b30'; g.fillRect(Wp * .72, gy + 22, Wp * .14, fh * ppu - 22);
    const ac = AWN[seed % AWN.length]; for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? ac : '#ffffff'; g.beginPath(); g.moveTo(i * Wp / 16, gy + 6); g.lineTo((i + 1) * Wp / 16, gy + 6); g.lineTo((i + 1) * Wp / 16, gy + 24); g.lineTo(i * Wp / 16, gy + 24); g.fill(); }
    g.fillStyle = '#2d4a7a'; g.fillRect(Wp * .25, gy - 22, Wp * .5, 20); g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText(SIGNS[seed % SIGNS.length], Wp * .5, gy - 7);
  });
}
for (const s of [-1, 1]) {
  let x = -90, i = 0;
  while (x < 90) {
    const r = mulberry(300 + i * 7 + (s > 0 ? 3 : 0)); const wid = [16, 18, 20, 22, 24][Math.floor(r() * 5)], fl = [3, 4, 4, 5, 6][Math.floor(r() * 5)], ht = fl * 4.2, dep = 16;
    const side = M(WALLS[(i + (s > 0 ? 2 : 0)) % WALLS.length][0], { r: .9 }); const front = new THREE.MeshStandardMaterial({ map: facade(wid, fl, i * 3 + (s > 0 ? 1 : 0)), roughness: .85 });
    const mats = [side, side, M([.4, .38, .36]), side, s > 0 ? front : side, s > 0 ? side : front];
    box([wid, dep, ht], [x + wid / 2, s * (22 + dep / 2), ht / 2], mats, { cast: true });
    box([wid + .4, dep + .4, .6], [x + wid / 2, s * (22 + dep / 2), ht + .3], M([.35, .33, .32]), {});
    x += wid + .3; i++;
  }
}
const POLE = M([.15, .16, .18], { r: .4 }), LEAF = M([.18, .55, .2], { r: .8 }), TRUNK = M([.36, .24, .14], { r: .9 });
for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
  const px = -80 + k * 30;
  cyl(.18, 15, [px, s * 12.6, 7.5], POLE); box([.25, 2.2, .25], [px, s * 11.6, 14.9], POLE); box([.9, .9, .5], [px, s * 10.6, 14.7], M([1, .95, .8], { e: .4 }));
  cyl(.35, 5, [px + 15, s * 13.2, 2.5], TRUNK); for (const [ox, oz, r] of [[0, 6.2, 2.4], [-1.3, 5.2, 1.7], [1.4, 5.4, 1.8], [0, 7.6, 1.6]]) sph([r, r, r], [px + 15 + ox, s * 13.2, oz], LEAF);
  if (k % 2 === 0) { const bg = grp([px + 20, s * 18.5, 0], s > 0 ? 0 : 180); box([4, 1, .25], [0, 0, 1.6], M([.55, .35, .2]), { parent: bg }); box([4, .25, 1.4], [0, .5, 2.4], M([.55, .35, .2]), { parent: bg }); for (const sx of [-1.7, 1.7]) box([.2, .9, 1.6], [sx, 0, .8], POLE, { parent: bg }); }
  if (k % 3 === 1) { cyl(.35, 1.4, [px + 4, s * 12.4, .7], M([.85, .15, .12])); sph([.36, .36, .3], [px + 4, s * 12.4, 1.45], M([.85, .15, .12])); }
}
const BUNT = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6'];
for (let k = 0; k < 3; k++) { const bx = -30 + k * 30; for (let i = 0; i < 22; i++) { const u = i / 21; const y = lerp(-21.5, 21.5, u), x = lerp(bx, bx + 8, u), z = 15 - 2.5 * sin(u * Math.PI);
  const tri = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 3), M(new THREE.Color(BUNT[i % 5]).toArray())); tri.position.copy(B(x, y, z - .5)); tri.rotation.x = Math.PI; scene.add(tri); } }
// sky + clouds
const skyGeo = new THREE.SphereGeometry(900, 32, 16); const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color(0x2f6fe8) }, bot: { value: new THREE.Color(0xbfe0ff) } },
  vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ gl_FragColor = vec4(mix(bot, top, clamp(p.y*1.6,0.,1.)),1.); }' });
const SKY = new THREE.Mesh(skyGeo, skyM); scene.add(SKY);
const CLOUD = M([1, 1, 1], { r: 1, e: .25 }); { const r = mulberry(9); for (let i = 0; i < 14; i++) { const cx = -120 + r() * 240, cy = 60 + r() * 140, cz = 55 + r() * 50; for (let j = 0; j < 5; j++) sph([9 + r() * 6, 7 + r() * 4, 5 + r() * 3], [cx + j * 7 - 14, cy + r() * 4, cz + r() * 3], CLOUD, { cast: false }); } }

// ---------------------------------------------------------------- CAST
const BLK = [.02, .02, .03];
const HERO = { scale: 1.05, fam: 'tom', dark: true, skin: '#0a0a0d', top: [[0, '#14141a'], [.35, '#f4f4f8']], sleeve: '#f4f4f8', legs: [[0, '#f4f4f8'], [.14, '#f4f4f8'], [.3, '#0a0a0d'], [.6, '#1c1f2b']], hair: 'spiky', hairCol: '#f4f4f8', headband: '#f4f4f8' };
mkChar('hero', HERO);
mkChar('shd', { scale: 1.05, fam: 'tom', dark: true, skin: BLK, top: [[0, BLK]], sleeve: BLK, legs: [[0, BLK]], hair: 'spiky', hairCol: BLK });
mkChar('shm', { scale: 1.15, fam: 'mom', dark: true, skin: BLK, top: [[0, BLK]], sleeve: BLK, legs: [[0, BLK]], hair: 'pony', hairCol: BLK, hairCol2: BLK });
mkChar('mom', { scale: 1.15, fam: 'mom', skin: [.85, .63, .45], top: [[0, [.55, .28, .62]]], sleeve: [.55, .28, .62], legs: [[0, [.95, .95, .95]], [.17, [.22, .28, .5]]], hair: 'pony', hairCol: [.35, .2, .1], hairCol2: [.95, .4, .6] });
// extras (static crowd + passers-by)
const EXF = [['npc', 'happy', 'smile'], ['npc', 'soft', 'smallsmile'], ['mom', 'happy', 'smile'], ['tom', 'surprised', 'o'], ['pr', 'happy', 'grin'], ['mom', 'laugh', 'laugh'], ['tom', 'happy', 'smile'], ['pr', 'soft', 'smallsmile']];
const EXSK = [[.86, .68, .12], [.85, .63, .45], [.62, .42, .26], [.34, .2, .12], [.72, .68, .62]];
const EXCOL = [[.85, .2, .2], [.2, .45, .85], [.15, .6, .35], [.95, .75, .15], [.55, .3, .8], [.95, .5, .15], [.1, .6, .65], [.95, .95, .95], [.15, .15, .2], [.85, .4, .55]];
const EXH = [[.1, .07, .05], [.45, .28, .12], [.9, .75, .35], [.6, .2, .1], [.2, .2, .22], [.95, .55, .7]];
const EXTRAS = [];
function extra(x, y, rz, seed, up) {
  const r = mulberry(seed), f = EXF[seed % EXF.length]; const nm = 'ex' + seed;
  const c = mkChar(nm, { scale: .95 + r() * .15, fam: f[0], skin: EXSK[seed % 5], top: [[0, EXCOL[seed % 10]]], sleeve: EXCOL[seed % 10], legs: [[0, [.12, .12, .14]], [.15, [[.2, .25, .45], [.15, .15, .18], [.62, .55, .4], [.3, .35, .5]][seed % 4]]], hair: ['dome', 'cap', 'pony', 'dome'][seed % 4], hairCol: seed % 4 === 1 ? EXCOL[(seed + 3) % 10] : EXH[seed % 6], hairCol2: [.9, .3, .5] });
  setFace(c, f[1], f[2]); EXTRAS.push({ c, x, y, rz, seed, up });
}
const DC = [-42.5, -3];
for (let k = 0; k < 11; k++) { const a = k / 11 * 2 * Math.PI + .3, rad = 10.5 + (k % 3) * 1.6; const cx = DC[0] + cos(a) * rad, cy = DC[1] + sin(a) * rad * .75; extra(cx, cy, face_to(cx, cy, DC[0], DC[1]), 40 + k, k % 4 === 0); }
extra(2.5, -14.5, 180, 71, true); extra(31, -14.5, 180, 72, true);
// cat, note, puff
const CAT = grp([0, -300, 0]); { const cm = M([.95, .55, .2], { r: .7 }), ck = M([.03, .03, .04]);
  sph([.75, 1.3, .7], [0, 0, 1.0], cm, { parent: CAT }); sph([.65, .6, .55], [0, 1.35, 1.5], cm, { parent: CAT });
  for (const sx of [-1, 1]) { box([.5, .25, .8], [sx * .38, 1.3, 2.1], cm, { parent: CAT, geo: GCONE }); sph([.1, .06, .13], [sx * .25, 1.9, 1.6], ck, { parent: CAT }); for (const sy of [-.7, .8]) box([.28, .28, .9], [sx * .4, sy, .45], cm, { parent: CAT }); }
  sph([.08, .06, .06], [0, 1.97, 1.45], M([.9, .4, .5]), { parent: CAT }); const tl = cyl(.16, 1.5, [0, -1.5, 1.7], cm, { parent: CAT }); tl.rotation.x = 40 * D; CAT.scale.setScalar(1.4); }
const NOTE = new THREE.Group(); scene.add(NOTE); { const p = new THREE.Mesh(GBOX, M([.98, .95, .85], { r: .8 })); p.scale.set(1.9, 2.4, .05); NOTE.add(p);
  const t = ctex(190, 240, g => { g.fillStyle = '#fbf3da'; g.fillRect(0, 0, 190, 240); g.strokeStyle = '#cfd8e6'; for (let y = 40; y < 240; y += 24) { g.beginPath(); g.moveTo(10, y); g.lineTo(180, y); g.stroke(); } g.fillStyle = '#c0141a'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.save(); g.translate(95, 130); g.rotate(-.12); g.fillText('I QUIT', 0, 0); g.restore(); });
  const lb = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.4), new THREE.MeshStandardMaterial({ map: t, roughness: .8 })); lb.position.z = .03; NOTE.add(lb); }
const PUFF = new THREE.Group(); scene.add(PUFF); { const r = mulberry(5); for (let k = 0; k < 11; k++) { const a = k * 2.4, rr = .4 + r() * .9; const s = new THREE.Mesh(GSPH, M([1, 1, 1], { r: .9, e: .3 })); s.scale.setScalar(.55 + r() * .4); s.position.copy(B(cos(a) * rr, -.6 + r() * 1.2, sin(a) * rr * .8)); PUFF.add(s); } }

// ---------------------------------------------------------------- LIGHTS
const HEMI = new THREE.HemisphereLight(0xcfe6ff, 0x8a7a66, 1.2); scene.add(HEMI);
const SUN = new THREE.DirectionalLight(0xfff1dc, 2.6); SUN.castShadow = true; SUN.shadow.mapSize.set(2048, 2048);
Object.assign(SUN.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 }); SUN.shadow.bias = -.0005; SUN.shadow.normalBias = .03; scene.add(SUN, SUN.target);
const ROOMP = [new THREE.PointLight(0xffe2c0, 0, 40, 1.4), new THREE.PointLight(0xffe2c0, 0, 40, 1.4)]; ROOMP.forEach(l => scene.add(l));
const MOON = new THREE.PointLight(0x8fa8ff, 0, 40, 1.2); scene.add(MOON);

// ---------------------------------------------------------------- TIMELINE (identical to the Blender section)
const SHOTS = [['b_look', 0.00], ['b_floor', .75], ['b_note', 1.47], ['b_notecu', 2.395], ['b_read', 3.4], ['b_door', 4.525], ['b_without', 5.945],
  ['st_chase', 6.83], ['st_faster', 8.18], ['st_pant', 9.245], ['st_far', 10.3], ['st_copy1', 11.355], ['st_copy2', 12.25],
  ['st_cat1', 13.095], ['st_cat2', 14.535], ['st_worst', 15.66], ['st_join', 16.9], ['mom_join', 17.835], ['mom_two', 19.365], ['mom_mad', 21.16],
  ['win_back', 22.545], ['did_job', 23.7], ['copied', 24.84], ['jump', 25.645], ['spin', 26.775], ['dance', 28.185],
  ['street_mid', 29.715], ['watching', 31.055], ['embarrassed', 32.39], ['shd_laugh', 34.54], ['shd_laugh2', 35.805], ['sneeze', 36.89],
  ['stuck', 39.175], ['friends', 41.035], ['n_switch', 42.06], ['n_gone', 43.725], ['n_on', 44.525], ['n_there', 45.625],
  ['f_off', 46.29], ['f_gone', 46.665], ['f_on', 47.035], ['f_there', 47.445], ['n_again', 47.915], ['n_whisper', 49.11], ['n_eyes', 50.23], ['n_zoom', 51.4]];
const shots = SHOTS.map(([n, a], i) => [n, a, i + 1 < SHOTS.length ? SHOTS[i + 1][1] : DUR + .01]);
const S = Object.fromEntries(shots.map(([n, a, b]) => [n, [a, b]]));
function shot_at(t) { for (const [n, a, b] of shots) if (a <= t && t < b) return [n, t - a]; const l = shots[shots.length - 1]; return [l[0], t - l[1]]; }
const ts = n => S[n][0];
const BD = ['b_look', 'b_floor', 'b_note', 'b_notecu', 'b_read', 'b_door', 'b_without'];
const BN = SHOTS.map(s => s[0]).filter(n => n.startsWith('n_') || n.startsWith('f_'));
const lights_on = t => t < 43.35 || (44.6 <= t && t < 46.29) || (47.035 <= t && t < 48.4);
const KD = [DBX + 2, DBY - 3], SD = [DBX + 6.5, DBY - 9.5], DOORP = [DOOR_X, DBY - 12.3], NOTE_FL = [DBX + 5, DBY - 7.6, .08];
const K_SW = [NBX + 13.6, SW_Y];
const KS0 = [-22, -3], KSP = 9, SSP = 14;
const K_STOP = KS0[0] + KSP * (ts('st_pant') - ts('st_chase'));
const CATX0 = 18, MOMP = [46, -3], KW = [34, -9];
const KA = [DC[0] - 3, DC[1]], SA = [DC[0] + 3, DC[1]];
const kuro_run = t => t < ts('st_faster') ? KS0[0] + KSP * (t - ts('st_chase')) : Math.min(K_STOP, KS0[0] + KSP * (t - ts('st_chase')));
const jmp = (t, d = 0) => { const p = (((t - d) % .55) + .55) % .55 / .55; return t >= d ? 1.7 * abs(sin(Math.PI * p)) : 0; };
const jarms = (t, d = 0) => ({ uaLZ: 140 * Math.min(1, jmp(t, d)), uaRZ: -140 * Math.min(1, jmp(t, d)) });
const flick = (t, t0) => { const k = prog(t, t0 - .35, t0 - .1) * (1 - prog(t, t0 + .1, t0 + .4)); return { uaLZ: 86 * k + 10 * sin((t - t0) * 40) * k, laLX: -10 * k }; };

function st_hero(t) {
  const [n, lt] = shot_at(t), a = S[n][0];
  if (BD.includes(n)) {
    const [x, y] = KD;
    if (n === 'b_look') return ST(x, y, 180, add(P.scared, { hdX: -6 }), 'shock');
    if (n === 'b_floor') return ST(x, y, 180, add({ hdX: 38, spX: 12, uaLX: -20, uaRX: -20, uaLZ: 18, uaRZ: -18 }, breathe(t)), 'shock');
    if (n === 'b_note') return ST(x, y, face_to(x, y, SD[0], SD[1]), add({ hdX: 8 }, alive(t)), 'surprised');
    if (n === 'b_notecu') { const k = eio(prog(t, 3.0, 3.4)), nx = NOTE_FL[0], ny = NOTE_FL[1];
      return ST(lerp(x, nx - .8, k), lerp(y, ny + 1.2, k), k < .5 ? 180 : face_to(x, y, nx, ny), add({ spX: 30 * k, hdX: 20 * k, uaRX: -50 * k, laRX: -30 * k }, alive(t)), 'sad'); }
    const X2 = KD[0] + 1.6, Y2 = KD[1] - 3.2;
    if (n === 'b_read') return ST(X2, Y2, 180, add(P.read, { hdX: 22 }), 'angry');
    if (n === 'b_door') return ST(X2, Y2, face_to(X2, Y2, DOORP[0], DOORP[1]), add({ uaRX: -50, laRX: -70, uaRZ: 10, hdX: -4 }, alive(t)), 'angry');
    return ST(X2, Y2, 180, add({ uaLX: -60, laLX: -90, uaRX: -60, laRX: -90, uaLZ: -25, uaRZ: 25, hdX: -6, hdY: jitter(t, 4, 1) }, alive(t, .3)), 'angry');
  }
  if (n === 'st_chase' || n === 'st_faster') { const [x, y, h, p] = runner(t, ts('st_chase'), KS0, [60, -3], KSP); return ST(x, y, h, p || alive(t), 'angry'); }
  if (n === 'st_pant' || n === 'st_far') return ST(K_STOP, -3, -90, add({ spX: 38, hdX: 24, uaLX: -28, uaRX: -28, laLX: -20, laRX: -20, ulLX: -12, ulRX: -12 }, pant(t, 1.6)), 'tired');
  if (n === 'st_cat2') return ST(KW[0], KW[1], face_to(KW[0], KW[1], 40, -3), add(P.laugh, { spX: 6 * sin(t * 16), hdX: -18 }), 'laugh');
  if (n === 'st_worst') return ST(KW[0], KW[1], 180, add(P.scared, { hdX: -10 }), 'surprised');
  if (n === 'mom_mad') return ST(KW[0], KW[1], 180, add(P.scared, pant(t, .8)), 'scared');
  if (n === 'win_back') return ST(KA[0], KA[1], 180, add({ uaLX: -70, laLX: -95, uaLZ: -20, uaRX: -70, laRX: -95, uaRZ: 20, hdX: -4 }, alive(t, .5)), 'fierce');
  if (n === 'did_job' || n === 'copied') return ST(KA[0], KA[1], -90, add({ uaLX: -55, uaRX: -55, laLX: -30, laRX: -30, hdX: -4 }, alive(t)), 'smirk');
  if (n === 'jump') { const j = jmp(t, a + .75); return ST(KA[0], KA[1], -90, add(jarms(t, a + .75), { ulLX: j > .2 ? -20 : 0, llLX: j > .2 ? 25 : 0 }), 'smirk', j); }
  if (n === 'spin') { const hh = -90 + 720 * eio(prog(t - a, .35, 1.45)); return ST(KA[0], KA[1], hh, add({ uaLZ: 75, uaRZ: -75 }, alive(t, .4)), 'smirk'); }
  if (n === 'dance') return ST(KA[0], KA[1], -90, dance(t - .25, 4), 'neutral');
  if (n === 'street_mid' || n === 'watching') return ST(KA[0] + 1.5, KA[1], -60, n === 'street_mid' ? dance(t - .25, 1) : add(dance(t - .25, 1), { hdX: 16 }), n === 'street_mid' ? 'nervous' : 'sad');
  if (n === 'embarrassed') return ST(KA[0] + 1.5, KA[1], 180, add(P.cover, { spX: -14, hdX: -22, hdY: 8 * sin(t * 2.3) }), 'cringe');
  if (['shd_laugh', 'shd_laugh2', 'sneeze'].includes(n)) return ST(KA[0], KA[1], -90, n === 'sneeze' ? add(P.scared, { spX: -4 }) : add(alive(t), { hdX: -6 }), n !== 'sneeze' ? 'surprised' : 'smirk');
  if (n === 'stuck') return ST(KA[0], KA[1], 180, add(P.hero, alive(t, .5)), 'happy');
  if (n === 'friends') return ST(KA[0], KA[1], 180, add({ uaRZ: -150 + 18 * sin(t * 9), uaLZ: 8 }, alive(t, .5)), 'happy');
  if (BN.includes(n)) {
    let arm = {};
    if (n === 'n_switch') arm = flick(t, 43.35); if (n === 'n_on') arm = flick(t, 44.6);
    if (n === 'f_off' || n === 'f_gone') arm = flick(t, n === 'f_off' ? 46.29 : 46.7); if (n === 'f_on' || n === 'f_there') arm = flick(t, 47.035);
    if (n === 'n_again') arm = flick(t, 48.4);
    const face = { n_switch: 'neutral', n_gone: 'neutral', n_on: 'neutral', n_there: 'neutral', f_off: 'smirk', f_gone: 'smirk', f_on: 'smirk', f_there: 'smirk', n_again: 'nervous', n_whisper: 'scared', n_eyes: 'scared', n_zoom: 'shock' }[n];
    const tw = (n === 'n_eyes' || n === 'n_zoom') ? 14 * sin(t * 24) : 0;
    return ST(K_SW[0], K_SW[1], 180, add(alive(t, .6), arm, { hdY: n === 'n_gone' ? -25 * prog(t, 43.4, 43.7) : 0 }, { hdX: n === 'n_zoom' ? -6 : 0, spZ: tw * .3 }, ['n_whisper', 'n_eyes', 'n_zoom'].includes(n) ? P.scared : {}), face);
  }
  return HIDE_;
}
function st_shd(t) {
  const [n, lt] = shot_at(t), a = S[n][0];
  if (BD.includes(n)) {
    if (['b_look', 'b_floor', 'b_without'].includes(n)) return HIDE_;
    if (['b_note', 'b_notecu', 'b_read'].includes(n)) { const hold = t >= 1.47 && t < 1.9; return ST(SD[0], SD[1], 180, add(alive(t, .8), hold ? { uaRX: -120, laRX: -20, uaRZ: -20 } : { uaRX: -30, uaRZ: -6 }), 'smug'); }
    if (n === 'b_door') { if (t < 4.75) return ST(SD[0], SD[1], 180, alive(t), 'neutral'); const [x, y, d, mv, h] = along(t, 4.75, SD, DOORP, 4.4); if (t > 5.55) return HIDE_; return ST(x, y, h, mv ? walk2(walkph(d)) : alive(t), 'neutral'); }
  }
  if (n === 'st_chase' || n === 'st_faster') { const [x, y, h, p] = runner(t, ts('st_chase'), [-10, -3], [80, -3], SSP); return ST(x, y, h, p || alive(t), 'smug'); }
  if (n === 'st_pant') { const [x, y, h, p] = runner(t, ts('st_pant'), [K_STOP + 32, -3], [80, -3], SSP); return ST(x, y, h, p || alive(t), 'smug'); }
  if (n === 'st_far') { const [x, y, h, p] = runner(t, ts('st_far'), [K_STOP + 13, -3], [90, -3], 8); return ST(x, y, h, p || alive(t), 'smug'); }
  if (n === 'st_copy1') return ST(5.5, -14.5, 180, dance(t, 0), 'smug');
  if (n === 'st_copy2') return ST(34, -14.5, 180, dance(t, 3), 'smug');
  if (n === 'st_cat1') { const [x, y, h, p] = runner(t, a, [CATX0 - 7, -3], [90, -3], 22); return ST(x, y, h, p || alive(t), 'angry'); }
  if (n === 'st_cat2') { const [x, y, h, p] = runner(t, a, [52, -3], [-40, -3], 17); return ST(x, y, h, p || alive(t), 'scared'); }
  if (n === 'st_join') { const [x, y, d, mv, h] = along(t, a, [30, -3], [MOMP[0] - 2.6, MOMP[1]], 8); return ST(x, y, h, mv ? walk2(walkph(d)) : add(P.cross, alive(t, .5)), 'neutral'); }
  if (n === 'mom_join') return ST(MOMP[0] - 2.6, lerp(MOMP[1], MOMP[1] + 2, eio(prog(lt, .2, .9))), 180, add(P.cross, alive(t, .5)), 'angry');
  if (n === 'mom_two' || n === 'mom_mad') return ST(MOMP[0] - 2.6, MOMP[1] + 2, 180, add(P.cross, alive(t, .5)), 'angry');
  if (n === 'win_back') return ST(SA[0], SA[1], 90, alive(t), 'smug');
  if (n === 'did_job' || n === 'copied') return ST(SA[0], SA[1], 90, add({ uaLX: -55, uaRX: -55, laLX: -30, laRX: -30, hdX: -4 }, alive(t)), 'smug');
  if (n === 'jump') return ST(SA[0], SA[1], 90, jarms(t, a + .5), 'smug', jmp(t, a + .5));
  if (n === 'spin') return ST(SA[0], SA[1], 90 + 720 * eio(prog(t - a, .1, 1.2)), add({ uaLZ: 75, uaRZ: -75 }, alive(t, .4)), 'smug');
  if (n === 'dance') return ST(SA[0], SA[1], 90, dance(t, 4), 'laugh');
  if (n === 'street_mid' || n === 'watching') return ST(SA[0] + 4, SA[1] + .8, 120, dance(t, 1), n === 'street_mid' ? 'laugh' : 'smug');
  if (n === 'embarrassed') return ST(SA[0] + 4, SA[1] + .8, 120, add(P.laugh, { hdX: -10 }), 'smug');
  if (n === 'shd_laugh' || n === 'shd_laugh2') { const sh = sin(t * 22); return ST(SA[0], SA[1], 90, add(P.laugh, { spX: 28 + 10 * sh, hdX: 10 * sh, bob: .05 * abs(sh) }), 'laugh'); }
  if (n === 'sneeze') { const k = kp(lt, [[0, {}], [1.05, { spX: -18, hdX: -14, uaLX: -40, laLX: -90 }, eo], [1.12, { spX: 26, hdX: 14, uaLX: -80, laLX: -100 }], [2.0, { spX: 6, hdX: 4 }, eo]]);
    return ST(SA[0], SA[1], 90, add(alive(t, .5), k), lt > 1.0 && lt < 1.3 ? 'S:tiny_o' : 'happy'); }
  if (n === 'stuck') { const s0 = [SA[0] + 8, SA[1] - 1];
    if (lt < 1.05) { const [x, y, d, mv, h] = along(t, a, s0, KA, 8.5); return ST(x, y, mv ? h : 180, mv ? walk2(walkph(d)) : alive(t), 'neutral'); }
    const k = eio(prog(lt, 1.05, 1.4)); return [KA[0], KA[1], .55 * k, 180, alive(t, .2), 'happy', 90 * k]; }
  if (n === 'friends') return [KA[0], KA[1], .55, 180, {}, 'happy', 90];
  if (BN.includes(n)) { const vis = lights_on(t) && ['n_switch', 'n_on', 'n_there', 'f_on', 'f_there'].includes(n); return vis ? [K_SW[0], K_SW[1] + 1.2, .55, 180, {}, 'smug', 90] : HIDE_; }
  return HIDE_;
}
const st_mom = t => { const [n] = shot_at(t); return ['st_join', 'mom_join', 'mom_two', 'mom_mad'].includes(n) ? ST(MOMP[0], MOMP[1], 180, add(P.cross, alive(t, .5)), 'angry') : HIDE_; };
const st_shm = t => { const [n] = shot_at(t); return ['mom_two', 'mom_mad'].includes(n) ? ST(MOMP[0] + 2.6, MOMP[1] + 2, 180, add(P.cross, alive(t, .5)), 'angry') : HIDE_; };
const FN = { hero: st_hero, shd: st_shd, mom: st_mom, shm: st_shm };
const MAIN = Object.keys(FN);

// ---------------------------------------------------------------- precompute: states, head/hand tracking, faces
const STATES = {}, HEADP = {}, HANDS = {};
for (const nm of MAIN) { STATES[nm] = []; HEADP[nm] = []; HANDS[nm] = []; }
const _v = new THREE.Vector3();
for (let f = 1; f <= NF; f++) {
  const t = tsec(f);
  for (const nm of MAIN) {
    const st = FN[nm](t); STATES[nm].push(st); const c = CHARS[nm]; applyPose(c, st); c.root.updateMatrixWorld(true);
    HEADP[nm].push(toB(c.neck.getWorldPosition(_v)));
    HANDS[nm].push([toB(c.arms.L.tip.getWorldPosition(_v)), toB(c.arms.R.tip.getWorldPosition(_v))]);
  }
}
const ENV = await (await fetch('./assets/env.json')).json();
function faceTrack(nm, fam, talk, seed) {
  const rnd = mulberry(seed * 7919 + nm.length); let nb = (1 + rnd() * 2) * FPS, blinkUntil = -1, vis = 0, hold = 0; const out = [];
  STATES[nm].forEach((st, fi) => {
    let [e, mo] = parseFace(st[5] || 'neutral'); const t = fi / FPS;
    if (e.startsWith('S:')) { out.push([e, null]); return; }
    if (talk.some(([a, b]) => a <= t && t < b)) { const lv = ENV[fi] || 0;
      if (lv < .12) mo = ['happy', 'laugh', 'love'].includes(e) ? 'smallsmile' : 'v_rest';
      else { if (hold <= 0) { vis = (vis + 1 + Math.floor(rnd() * 3)) % TALK_V.length; hold = 2 + Math.floor(rnd() * 2); } hold--; mo = TALK_V[vis];
        if (lv > .7 && ['v_a', 'v_s', 'v_e'].includes(mo)) mo = 'v_c'; if (lv < .3 && ['v_c', 'v_b'].includes(mo)) mo = 'v_a'; } }
    if (fi >= nb && BLINKABLE.has(e)) { blinkUntil = fi + Math.max(2, Math.round(.12 * FPS)); nb = fi + (2.2 + rnd() * 2.3) * FPS; }
    if (fi < blinkUntil && BLINKABLE.has(e)) e = 'blink';
    out.push([e, mo]);
  });
  return out;
}
const FACES = { hero: faceTrack('hero', 'tom', [[0, DUR]], 11), shd: faceTrack('shd', 'tom', [], 23), mom: faceTrack('mom', 'mom', [], 31), shm: faceTrack('shm', 'mom', [], 41) };
// preload every face texture used
for (const nm of MAIN) for (const [e, m] of FACES[nm]) { const c = CHARS[nm]; if (e.startsWith('S:')) faceTex(c.dark, 'S_' + e.slice(2)); else { faceTex(c.dark, `E_${c.fam}_${e}`); faceTex(c.dark, 'M_' + m); } }

// ---------------------------------------------------------------- camera (identical to cam_state in the Blender section)
const L2 = (a, b, e) => [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
const mid_i = n => Math.min(NF - 1, Math.floor((S[n][0] + S[n][1]) / 2 * FPS));
function ecu(nm, n, e, dist, side = 0, up = 0, push = .12, tz = -.15) {
  const i = mid_i(n), h = STATES[nm][i][3], sc = CHARS[nm].scale, Hh = HEADP[nm][i]; const H_ = [Hh[0], Hh[1], Hh[2] + .62 * sc];
  const d_ = dist * 1.12 * (1 - push * e), fw = fwv(h), sd = sidev(h);
  return [[H_[0] + fw[0] * d_ + sd[0] * side, H_[1] + fw[1] * d_ + sd[1] * side, H_[2] + up - .28 * sc], [H_[0], H_[1], H_[2] + tz - .12 * sc]];
}
function cam_state(i) {
  const t = tsec(i + 1), [n, lt] = shot_at(t), [a, b] = S[n]; const e = eio(prog(lt, 0, b - a)), eq = eo(prog(lt, 0, (b - a) * .6));
  let pos, tgt, lens = 26, shake = 0, roll = 0; const DC0 = DC[0], DC1 = DC[1];
  const E = (...x) => { [pos, tgt] = ecu(...x); };
  switch (n) {
    case 'b_look': E('hero', n, eq, 5.4, .2, .3, .2, -.2); lens = 30; break;
    case 'b_floor': pos = L2([KD[0] + 1.8, KD[1] - 6.8, 1.6], [KD[0] + 1.2, KD[1] - 6.0, 1.9], e); tgt = [KD[0], KD[1], 1.3]; lens = 24; break;
    case 'b_note': pos = L2([DBX - 2, DBY + 5, 6.2], [DBX - 1, DBY + 4.4, 5.9], e); tgt = [SD[0] - 1, SD[1], 3.6]; lens = 24; break;
    case 'b_notecu': pos = [NOTE_FL[0] - .4, NOTE_FL[1] - 1.0, 7.8]; tgt = [NOTE_FL[0], NOTE_FL[1] + .1, .2]; lens = 28; break;
    case 'b_read': E('hero', n, e, 3.8, 3.8, .5, .12, -.3); lens = 30; break;
    case 'b_door': pos = L2([DBX + 1, DBY + 2.5, 5.6], [DBX + 2.4, DBY + 1.8, 5.2], e); tgt = [DOOR_X - 1, DBY - 9, 3.6]; lens = 24; break;
    case 'b_without': E('hero', n, eq, 3.6, -.3, .2, .2, -.3); lens = 30; shake = .03; break;
    case 'st_chase': { const kx = kuro_run(t); pos = [kx - 8, -1.5, 3.4]; tgt = [kx + 10, -3, 3.2]; lens = 24; break; }
    case 'st_faster': { const kx = kuro_run(t); pos = [kx - 9, -3.5, 2.6]; tgt = [kx + 26, -3, 3.4]; lens = 24; break; }
    case 'st_pant': E('hero', n, eq, 4.6, .3, -1.0, .2, -.9); lens = 30; break;
    case 'st_far': pos = [K_STOP - 8, -5, 2.6]; tgt = [K_STOP + 13 + 8 * lt, -3, 3.4]; lens = 24; break;
    case 'st_copy1': pos = L2([3.5, -20, 3.8], [4.5, -19, 3.8], e); tgt = [4, -14.5, 3.4]; lens = 24; break;
    case 'st_copy2': pos = L2([32, -20, 3.8], [33, -19, 3.8], e); tgt = [32.5, -14.5, 3.4]; lens = 24; break;
    case 'st_cat1': { const x = lerp(30, 44, e); pos = [x, -15, 7.2]; tgt = [x, -3, 3.0]; lens = 24; break; }
    case 'st_cat2': { const cx = 55 - 17 * lt; pos = [cx + 11, -1.5, 3.6]; tgt = [cx - 6, -3, 3.0]; lens = 24; break; }
    case 'st_worst': E('hero', n, eq, 3.6, .2, .2, .25, -.35); lens = 30; shake = .04; break;
    case 'st_join': pos = L2([34, -17, 4.6], [38, -16, 4.4], e); tgt = [40, -3, 3.2]; lens = 22; break;
    case 'mom_join': pos = L2([43.5, -12, 4.2], [44.2, -9.6, 4.0], e); tgt = [44.6, -3, 3.6]; lens = 28; break;
    case 'mom_two': pos = L2([44, -11.5, 2.6], [45, -9.5, 3.0], e); tgt = [46, -1.8, 4.0]; lens = 26; break;
    case 'mom_mad': E('hero', n, e, 3.4, .3, .1, .2, -.3); lens = 30; break;
    case 'win_back': E('hero', n, eq, 3.6, .2, .3, .2, -.3); lens = 30; break;
    case 'did_job': pos = L2([DC0 - 1, -15, 6.5], [DC0 - 1, -13, 6.0], e); tgt = [DC0, -3, 2.8]; lens = 26; break;
    case 'copied': E('hero', n, e, 3.4, .5, .3, .15, -.3); lens = 30; break;
    case 'jump': pos = [DC0, -15, 6.2]; tgt = [DC0, -3, 3.6]; lens = 26; break;
    case 'spin': pos = L2([DC0, -15, 6.0], [DC0, -13, 5.6], e); tgt = [DC0, -3, 3.0]; lens = 26; roll = 3 * sin(t * 6); break;
    case 'dance': pos = L2([DC0 - 6, -12, 3.2], [DC0 - 3, -10, 3.0], e); tgt = [DC0, -3, 3.2]; lens = 26; roll = -4 * sin(t * 7); break;
    case 'street_mid': pos = L2([DC0, -20, 14], [DC0, -18.5, 12], e); tgt = [DC0, -3, 2.0]; lens = 24; break;
    case 'watching': pos = L2([DC0 - 9, DC1 + 2.6, 4.4], [DC0 - 8, DC1 + 2.6, 4.2], e); tgt = [DC0 + 9, DC1, 3.6]; lens = 26; break;
    case 'embarrassed': E('hero', n, eq, 3.8, -.2, .5, .3, -.3); lens = 30; roll = -3; break;
    case 'shd_laugh': E('shd', n, e, 3.6, .3, .2, .1, -.3); lens = 30; shake = .02; break;
    case 'shd_laugh2': pos = L2([DC0 - .5, -13, 3.4], [DC0 + .5, -12, 3.6], e); tgt = [DC0, DC1, 3.4]; lens = 26; break;
    case 'sneeze': E('shd', n, eq, 4.2, .5, .2, .1, -.3); lens = 30; shake = .05 * prog(lt, 1.1, 1.2) * (1 - prog(lt, 1.2, 1.6)); break;
    case 'stuck': pos = L2([DC0 - 2, -16, 5.6], [DC0 - 1, -13, 5.0], e); tgt = [DC0, DC1, 2.2]; lens = 24; break;
    case 'friends': pos = L2([DC0 + 1, DC1 - 8.5, 4.4], [DC0 + .5, DC1 - 7.2, 4.2], e); tgt = [DC0, DC1 + 1.4, 2.6]; lens = 26; break;
    case 'n_switch': pos = L2([NBX + 6, NBY - 12.4, 4.6], [NBX + 8, NBY - 12.3, 4.6], e); tgt = [K_SW[0], K_SW[1], 3.6]; lens = 28; break;
    case 'n_gone': pos = [NBX + 3, NBY - 3, 5.2]; tgt = [K_SW[0] - .6, K_SW[1] + .8, 1.6]; lens = 24; break;
    case 'n_on': E('hero', n, e, 2.6, -.5, .3, .1, -.2); lens = 38; break;
    case 'n_there': pos = [NBX + 4, NBY - 4, 5.4]; tgt = [K_SW[0], K_SW[1] + .8, 1.4]; lens = 24; break;
    case 'f_off': case 'f_on': pos = [NBX + 9, NBY - 12.3, 4.4]; tgt = [K_SW[0], K_SW[1], 3.5]; lens = 28; break;
    case 'f_gone': E('hero', n, e, 2.6, .4, .2, .08, -.2); lens = 38; break;
    case 'f_there': pos = [NBX + 5, NBY - 3, 4.6]; tgt = [K_SW[0], K_SW[1] + .8, 1.2]; lens = 24; break;
    case 'n_again': E('hero', n, e, 2.6, -.4, .2, .1, -.2); lens = 38; break;
    case 'n_whisper': pos = L2([NBX + 4, NBY - 12.3, 5.0], [NBX + 5.5, NBY - 12.3, 4.8], e); tgt = [K_SW[0], K_SW[1], 3.4]; lens = 26; break;
    case 'n_eyes': pos = [NBX + 2, NBY - 8, 4.2]; tgt = [NBX + 10.8, NBY + 12.4, 3.6]; lens = 36; shake = .01; break;
    case 'n_zoom': E('hero', n, e, 2.4, 0, .1, .55, -.25); lens = 34 + 16 * e; shake = .02; break;
  }
  let dr = [noise1(t * 1.3, 2) * .03, 0, noise1(t * 1.1, 5) * .03];
  if (shake) dr = [dr[0] + noise1(t * 30, 1) * shake, noise1(t * 27, 7) * shake * .5, dr[2] + noise1(t * 30, 4) * shake];
  return [[pos[0] + dr[0], pos[1] + dr[1], pos[2] + dr[2]], [tgt[0] + dr[0] * .5, tgt[1] + dr[1] * .5, tgt[2] + dr[2] * .5], lens, roll, n];
}

// ---------------------------------------------------------------- per-frame update
const setOf = n => BD.includes(n) ? 'bedD' : BN.includes(n) ? 'bedN' : 'street';
function renderFrame(f) {
  const i = f - 1, t = tsec(f); const [pos, tgt, lens, roll, n] = cam_state(i); const set = setOf(n);
  for (const nm of MAIN) { const c = CHARS[nm]; applyPose(c, STATES[nm][i]); const [e, m] = FACES[nm][i]; setFace(c, e, m); }
  for (const x of EXTRAS) applyPose(x.c, set === 'street' ? ST(x.x, x.y, x.rz, add(alive(t, .8, x.seed), x.up ? { uaLZ: 150 + 10 * sin(t * 6 + x.seed), uaRZ: -150 - 10 * sin(t * 6 + x.seed) } : {}), null) : HIDE_);
  // props
  const [nn, lt] = shot_at(t);
  if (nn === 'st_cat1') { CAT.visible = true; CAT.position.copy(B(CATX0 + 22 * lt, -3, .3 * abs(sin(t * 15)))); CAT.rotation.y = -90 * D; }
  else if (nn === 'st_cat2') { CAT.visible = true; CAT.position.copy(B(58 - 17 * lt, -3, .3 * abs(sin(t * 15)))); CAT.rotation.y = 90 * D; } else CAT.visible = false;
  NOTE.visible = t >= 1.47 && t < 5.945;
  if (NOTE.visible) {
    let p, r;
    if (t < 1.9) { const h = HANDS.shd[i][1]; p = [h[0], h[1], h[2] + .4]; r = [0, 0]; }
    else if (t < 2.15) { const h = HANDS.shd[Math.floor(1.9 * FPS)][1], k = eo(prog(t, 1.9, 2.15)); p = L2([h[0], h[1], h[2] + .4], [NOTE_FL[0], NOTE_FL[1], NOTE_FL[2] + .1], k); r = [-90 * k, 0]; }
    else if (t < 3.4) { p = [NOTE_FL[0], NOTE_FL[1], NOTE_FL[2] + .1]; r = [-90, 12]; }
    else { const [hl, hr] = HANDS.hero[i], h_ = STATES.hero[i][3], k = eo(prog(t, 3.4, 3.75)), fw = fwv(h_);
      const held = [(hl[0] + hr[0]) / 2 + fw[0] * .35, (hl[1] + hr[1]) / 2 + fw[1] * .35, (hl[2] + hr[2]) / 2 + .15]; p = L2([NOTE_FL[0], NOTE_FL[1], NOTE_FL[2] + .1], held, k); r = [lerp(-90, -15, k), k > .5 ? h_ : 12]; }
    NOTE.position.copy(B(...p)); NOTE.rotation.set(r[0] * D, r[1] * D, 0, 'YXZ');
  }
  if (nn === 'sneeze' && lt >= 1.1) { const k = prog(lt, 1.1, 1.8), s = 1.3 * sin(Math.PI * Math.min(1, k * 1.1)) + .01, hp = HEADP.shd[i]; PUFF.visible = true; PUFF.position.copy(B(hp[0] + 1.4, hp[1], hp[2] - .3)); PUFF.scale.setScalar(s); } else PUFF.visible = false;
  DOORH.rotation.y = -95 * eio(prog(t, 4.52, 4.95)) * D;
  const ey = t >= 50.23 && !lights_on(t) ? .75 * eo(prog(t, 50.3, 50.75)) : 0; EYES.forEach(e => { e.visible = ey > .01; e.scale.y = Math.max(.001, ey) * 2; });
  // lights per set
  const on = lights_on(t);
  SKY.visible = set === 'street';
  if (set === 'street') { HEMI.intensity = 1.25; HEMI.color.set(0xcfe6ff); SUN.intensity = 2.8; ROOMP.forEach(l => l.intensity = 0); MOON.intensity = 0; scene.background = null; }
  else if (set === 'bedD') { HEMI.intensity = .9; HEMI.color.set(0xfff0dd); SUN.intensity = 1.6; ROOMP.forEach((l, k) => { l.intensity = 120; l.position.copy(B(DBX - 4 + k * 10, DBY - 2, 10.5)); }); MOON.intensity = 0; }
  else { HEMI.intensity = on ? .55 : .02; HEMI.color.set(on ? 0xffe8cc : 0x5566aa); SUN.intensity = on ? .7 : 0; ROOMP.forEach((l, k) => { l.intensity = on ? 140 : 0; l.position.copy(B(NBX - 4 + k * 10, NBY - 4, 10.5)); }); MOON.intensity = on ? 0 : 12; MOON.position.copy(B(NBX - 10, NBY - 2, 7)); }
  ROOM_N.shade.material.emissiveIntensity = on ? 1.2 : 0;
  scene.background = new THREE.Color(set === 'street' ? 0x9ccaff : 0x000000);
  // the sun follows the shot (shadows stay sharp where the camera looks)
  const T3 = B(...tgt); SUN.target.position.copy(T3); SUN.position.copy(T3).add(set === 'street' ? new THREE.Vector3(-30, 55, 22) : new THREE.Vector3(-25, 50, 10)); SUN.target.updateMatrixWorld();
  camera.position.copy(B(...pos)); camera.fov = 2 * Math.atan(18 / lens) / D; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(T3); if (roll) camera.rotateZ(roll * D);
  renderer.render(scene, camera);
}
// ---------------------------------------------------------------- API for the headless renderer
window.NF = NF; window.SHOTS_MID = shots.map(([n, a, b]) => [n, Math.floor((a + (Math.min(b, DUR) - a) * .55) * FPS) + 1]);
window.renderFrame = f => { renderFrame(f); return renderer.domElement.toDataURL('image/jpeg', .92); };
await new Promise(r => { const chk = () => (Object.values(FT).every(t => t.image) ? r() : setTimeout(chk, 50)); chk(); });
await new Promise(r => setTimeout(r, 300));
renderFrame(Number(Q.get('f') || 1)); window.READY = true;
