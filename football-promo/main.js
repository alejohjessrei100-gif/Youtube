// 10-second match-day promo. Every frame is a pure function of time,
// so the same code drives the live preview and the frame-by-frame render.
import * as THREE from 'three';

// ---------------------------------------------------------------- config
// Swap colours / names / logos / event info here.
const HOME = {
  name: 'PISAY WVC', mono: 'WVC',
  primary: '#1546c4', dark: '#0a1f5c', secondary: '#f6c445', ink: '#ffffff',
  logo: null, // e.g. 'assets/pisay.png' (transparent PNG works best)
};
const AWAY = {
  name: 'PAREF WESTBRIDGE', mono: 'PW',
  primary: '#b5162f', dark: '#4a0712', secondary: '#ffffff', ink: '#ffffff',
  logo: null, // e.g. 'assets/westbridge.png'
};
const EVENT = {
  kicker: 'FOOTBALL  ·  MATCH DAY',
  date: 'DATE TBA',
  time: 'TIME TBA',
  venue: 'VENUE TBA',
  tagline: 'BE THERE. BRING THE NOISE.',
};

const W = 1080, H = 1920, FPS = 30, DURATION = 10;
const FONT = '"Inter Display", Inter, sans-serif';
for (const w of [700, 800, 900]) await document.fonts.load(`${w} 100px "Inter Display"`);

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOutCubic = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOutBack = (t, s = 1.9) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
const prog = (t, a, b) => clamp((t - a) / (b - a));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// decaying shake, deterministic
function shake(t, t0, amp, dur = .45) {
  if (t < t0 || t > t0 + dur) return [0, 0];
  const k = t - t0, d = Math.exp(-k * 9) * amp;
  return [Math.sin(k * 71) * d, Math.cos(k * 53) * d];
}

// ---------------------------------------------------------------- canvas helpers
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8; return tex;
}
function fitFont(ctx, text, maxW, size, weight = 900) {
  do { ctx.font = `${weight} ${size}px ${FONT}`; size -= 2; } while (ctx.measureText(text).width > maxW && size > 10);
}
function italicText(ctx, text, x, y, { fill, stroke, strokeW = 0, glow, skew = -0.16 }) {
  ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, skew, 1, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 40; }
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = strokeW; ctx.strokeStyle = stroke; ctx.strokeText(text, 0, 0); }
  ctx.shadowBlur = 0; ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore();
}
const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

// ---------------------------------------------------------------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = canvasTex(8, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#02030b'); g.addColorStop(.55, '#0b1033'); g.addColorStop(1, '#1d1240');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0x0a0d22, 70, 170);
const camera = new THREE.PerspectiveCamera(50, W / H, .1, 400);
scene.add(camera);
// HUD lives in its own scene/camera, drawn after a depth clear so the pitch never cuts into it
const hudScene = new THREE.Scene(), hudCam = new THREE.PerspectiveCamera(50, W / H, .1, 100), hudRoot = hudScene;
hudScene.add(new THREE.HemisphereLight(0xaab8ff, 0x223322, .9));
renderer.autoClear = false;
const draw = () => { renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(hudScene, hudCam); };

scene.add(new THREE.HemisphereLight(0x5a6cff, 0x0b2a12, .35));
const hudLight = new THREE.DirectionalLight(0xffffff, 0); // lights camera-space crests
hudLight.position.set(2, 3, 4); hudRoot.add(hudLight); hudRoot.add(hudLight.target);
hudLight.target.position.set(0, 0, -10);

// ---------------------------------------------------------------- world
const PW = 40, PL = 60; // pitch, x in ±20, z in ±30
const pitchTex = canvasTex(1024, 1536, (c, w, h) => {
  const sx = w / PW, sz = h / PL, X = x => (x + PW / 2) * sx, Z = z => (z + PL / 2) * sz;
  for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#2f7d32' : '#378c39'; c.fillRect(0, i * h / 14, w, h / 14 + 1); }
  c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 6; c.fillStyle = '#fff';
  const rect = (x0, z0, x1, z1) => c.strokeRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
  rect(-19, -29, 19, 29);
  c.beginPath(); c.moveTo(X(-19), Z(0)); c.lineTo(X(19), Z(0)); c.stroke();
  c.beginPath(); c.arc(X(0), Z(0), 5 * sx, 0, 7); c.stroke();
  c.beginPath(); c.arc(X(0), Z(0), 8, 0, 7); c.fill();
  for (const s of [-1, 1]) {
    const gl = 29 * s;
    rect(-11, gl, 11, gl - 9 * s); rect(-5, gl, 5, gl - 3 * s);
    c.beginPath(); c.arc(X(0), Z(gl - 6 * s), 8, 0, 7); c.fill();
    c.beginPath(); c.arc(X(0), Z(gl - 6 * s), 5 * sx, s < 0 ? .93 : Math.PI + .93, s < 0 ? Math.PI - .93 : 2 * Math.PI - .93); c.stroke();
  }
});
const GOAL_Z = -29, SPOT_Z = -23;
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: .9 }));
pitch.rotation.x = -Math.PI / 2; scene.add(pitch);
const apron = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x1f5a24, roughness: 1 }));
apron.rotation.x = -Math.PI / 2; apron.position.y = -.02; scene.add(apron);

// LED boards around the pitch (scrolling text)
const ledTex = canvasTex(2048, 128, (c, w, h) => {
  c.fillStyle = '#04060f'; c.fillRect(0, 0, w, h);
  const items = [[HOME.name, HOME.secondary], ['MATCH DAY', '#ffffff'], [`VS ${AWAY.name}`, '#ff6b7f'], ['MATCH DAY', '#ffffff']];
  c.font = `900 80px ${FONT}`; c.textBaseline = 'middle';
  let x = 30; for (const [t, col] of items) { c.fillStyle = col; c.fillText(t, x, h / 2 + 4); x += c.measureText(t).width + 90; c.fillStyle = HOME.primary; c.fillRect(x - 60, 40, 30, 48); }
});
ledTex.wrapS = THREE.RepeatWrapping;
const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false });
function ledBoard(len, x, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, .9), ledMat);
  m.position.set(x, .45, z); m.rotation.y = ry; scene.add(m);
  m.material.map.repeat.set(len / 12, 1);
}
ledBoard(64, -22.5, 0, Math.PI / 2); ledBoard(64, 22.5, 0, -Math.PI / 2);
ledBoard(44, 0, -32.5, 0); ledBoard(44, 0, 32.5, Math.PI);

// stands with crowd
function crowdTex(cols, seed) {
  const r = rng(seed);
  const t = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#080a14'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 26; row++) for (let i = 0; i < 70; i++) {
      const x = i * w / 70 + r() * 6, y = row * h / 26 + 8 + r() * 4;
      c.fillStyle = cols[Math.floor(r() * cols.length)]; c.beginPath(); c.arc(x, y + 7, 6, 0, 7); c.fill();
      c.fillStyle = r() < .5 ? '#d9a77c' : '#8a5a3c'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const homeCrowd = crowdTex([HOME.primary, HOME.primary, HOME.secondary, '#ffffff', HOME.primary], 7);
const awayCrowd = crowdTex([AWAY.primary, AWAY.primary, '#ffffff', HOME.primary, AWAY.primary], 9);
function stand(len, x, z, ry, tex) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const map = tex.clone(); map.needsUpdate = true; map.repeat.set(len / 16, 2);
  const seats = new THREE.Mesh(new THREE.PlaneGeometry(len, 18),
    new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .32, roughness: 1 }));
  seats.rotation.x = -.62; seats.position.set(0, 8.2, -5.4); g.add(seats);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(len, .6, 9), new THREE.MeshStandardMaterial({ color: 0x151826 }));
  roof.position.set(0, 18.5, -8); roof.rotation.x = .12; g.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(len, 19, 1), new THREE.MeshStandardMaterial({ color: 0x0c0e1a }));
  back.position.set(0, 9, -13); g.add(back);
}
stand(70, -29, 0, Math.PI / 2, homeCrowd); stand(70, 29, 0, -Math.PI / 2, awayCrowd);
stand(50, 0, -38, 0, homeCrowd); stand(50, 0, 38, Math.PI, awayCrowd);

// floodlight towers
const glowTex = canvasTex(256, 256, (c, w) => {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,240,210,.55)'); g.addColorStop(1, 'rgba(255,220,180,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
});
const towers = [];
for (const [x, z] of [[-27, -36], [27, -36], [-27, 36], [27, 36]]) {
  const top = v3(x, 30, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.35, .6, 30, 8), new THREE.MeshStandardMaterial({ color: 0x2a2f45 }));
  pole.position.set(x, 15, z); scene.add(pole);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, .5), panelMat);
  panel.position.copy(top); panel.lookAt(0, 0, 0); scene.add(panel);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.scale.set(22, 22, 1); glow.position.copy(top).multiplyScalar(.98); scene.add(glow);
  const spot = new THREE.SpotLight(0xfff1dc, 0, 140, .62, .55, 0);
  spot.position.copy(top); spot.target.position.set(x * .15, 0, z * .2); scene.add(spot, spot.target);
  const dir = top.clone().sub(spot.target.position); const len = dir.length();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(11, len, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cone.position.copy(top).add(spot.target.position).multiplyScalar(.5);
  cone.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.normalize()); scene.add(cone);
  towers.push({ panelMat, glow, spot, cone });
}

// goal + net
const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, emissive: 0x333333 });
const GW = 3.2, GH = 2.3, GD = 2;
for (const x of [-GW, GW]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, GH, 12), postMat); p.position.set(x, GH / 2, GOAL_Z); scene.add(p); }
const bar = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, GW * 2 + .18, 12), postMat);
bar.rotation.z = Math.PI / 2; bar.position.set(0, GH, GOAL_Z); scene.add(bar);
function netPanel(p00, p10, p01, p11, nx, ny) {
  const nodes = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx, v = j / ny;
    const a = p00.clone().lerp(p10, u), b = p01.clone().lerp(p11, u);
    nodes.push({ u, v, base: a.lerp(b, v) });
  }
  const idx = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i;
    if (i < nx) idx.push(k, k + 1); if (j < ny) idx.push(k, k + nx + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nodes.length * 3), 3)); geo.setIndex(idx);
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe8ecff, transparent: true, opacity: .55 }));
  scene.add(lines);
  return (disp) => {
    const a = geo.attributes.position;
    nodes.forEach((n, k) => { const d = disp ? disp(n) : null; a.setXYZ(k, n.base.x + (d ? d.x : 0), n.base.y + (d ? d.y : 0), n.base.z + (d ? d.z : 0)); });
    a.needsUpdate = true; geo.computeBoundingSphere();
  };
}
const Z0 = GOAL_Z, Z1 = GOAL_Z - GD;
const netBack = netPanel(v3(-GW, 0, Z1), v3(GW, 0, Z1), v3(-GW, GH, Z0 - .8), v3(GW, GH, Z0 - .8), 26, 10);
const netTop = netPanel(v3(-GW, GH, Z0), v3(GW, GH, Z0), v3(-GW, GH, Z0 - .8), v3(GW, GH, Z0 - .8), 26, 3);
const netL = netPanel(v3(-GW, 0, Z0), v3(-GW, 0, Z1), v3(-GW, GH, Z0), v3(-GW, GH, Z0 - .8), 8, 10);
const netR = netPanel(v3(GW, 0, Z0), v3(GW, 0, Z1), v3(GW, GH, Z0), v3(GW, GH, Z0 - .8), 8, 10);
netTop(); netL(); netR();

// ball
const ballTex = canvasTex(1024, 512, (c, w, h) => {
  c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, w, h);
  const p = (1 + Math.sqrt(5)) / 2, verts = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
  c.fillStyle = '#111';
  for (const [x, y, z] of verts) {
    const l = Math.hypot(x, y, z), lat = Math.asin(y / l), lon = Math.atan2(x, z);
    const cx = (lon / (2 * Math.PI) + .5) * w, cy = (.5 - lat / Math.PI) * h;
    for (const off of [-w, 0, w]) { c.beginPath(); c.ellipse(cx + off, cy, 46 / Math.max(.25, Math.cos(lat)), 46, 0, 0, 7); c.fill(); }
  }
});
const ball = new THREE.Mesh(new THREE.SphereGeometry(.42, 48, 32), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .45 }));
scene.add(ball);
const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .45, depthWrite: false }));
ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = .01; scene.add(ballShadow);

// confetti (world, at the goal)
const CONF = 420, confR = rng(42), confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(.2, .11), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CONF);
const confData = [];
const confCols = [HOME.primary, HOME.secondary, '#ffffff', '#4f7dff'].map(c => new THREE.Color(c));
for (let i = 0; i < CONF; i++) {
  const a = confR() * Math.PI * 2, up = .5 + confR() * .9, sp = 4 + confR() * 8;
  confData.push({ v: v3(Math.cos(a) * sp * .8, up * sp, Math.abs(Math.sin(a)) * sp * .9 + 2), o: v3((confR() - .5) * 5, 1 + confR(), GOAL_Z + .5), spin: v3(confR() * 9, confR() * 9, confR() * 9), ph: confR() * 6 });
  confetti.setColorAt(i, confCols[i % confCols.length]);
}
confetti.frustumCulled = false; scene.add(confetti);

// ---------------------------------------------------------------- HUD (camera space, z = -10 → frame is 5.25 x 9.33 units)
const HUD_Z = -10, HUD_H = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(25)), HUD_W = HUD_H * W / H;
function hudPlane(tex, w, h, order = 10) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = order; m.position.z = HUD_Z; hudRoot.add(m); return m;
}
const hudFlat = (color, order) => { const m = hudPlane(null, HUD_W * 1.1, HUD_H * 1.1, order); m.material.color.set(color); m.material.opacity = 0; return m; };
const dim = hudFlat(0x03040c, 5);
const vignette = hudPlane(canvasTex(540, 960, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, h * .25, w / 2, h / 2, h * .62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,8,.85)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
}), HUD_W, HUD_H, 6);
const flash = hudFlat(0xffffff, 50);
flash.material.blending = THREE.AdditiveBlending;

const matchDay = hudPlane(canvasTex(1024, 700, (c, w, h) => {
  c.font = `800 64px ${FONT}`; c.textAlign = 'center'; c.fillStyle = HOME.secondary;
  c.letterSpacing = '18px'; c.fillText('FOOTBALL', w / 2 + 9, 150); c.letterSpacing = '0px';
  c.font = `900 230px ${FONT}`;
  italicText(c, 'MATCH', w / 2, 300, { fill: '#fff', stroke: HOME.dark, strokeW: 22, glow: HOME.primary });
  italicText(c, 'DAY', w / 2, 500, { fill: '#fff', stroke: HOME.dark, strokeW: 22, glow: HOME.primary });
  c.save(); c.transform(1, 0, -.3, 1, 0, 0);
  c.fillStyle = HOME.primary; c.fillRect(380, 620, 300, 26); c.fillStyle = AWAY.primary; c.fillRect(690, 620, 300, 26); c.restore();
}), 5, 5 * 700 / 1024, 20);

const vsTex = canvasTex(512, 512, (c, w, h) => {
  c.font = `900 300px ${FONT}`;
  italicText(c, 'VS', w / 2, h / 2 + 10, { fill: HOME.secondary, stroke: '#140d00', strokeW: 26, glow: '#ffb000' });
});
const vs = hudPlane(vsTex, 2.1, 2.1, 30);

const goalTxt = hudPlane(canvasTex(1024, 640, (c, w, h) => {
  c.font = `900 300px ${FONT}`;
  italicText(c, 'GOAL!', w / 2, 260, { fill: '#fff', stroke: HOME.primary, strokeW: 30, glow: HOME.secondary });
  fitFont(c, HOME.name, 760, 110);
  italicText(c, HOME.name, w / 2, 500, { fill: HOME.secondary, stroke: HOME.dark, strokeW: 16 });
}), 5, 5 * 640 / 1024, 20);

// end card pieces
const endKicker = hudPlane(canvasTex(1024, 120, (c, w, h) => {
  c.font = `800 52px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '8px';
  c.fillStyle = HOME.secondary; c.fillText(EVENT.kicker, w / 2, h / 2);
}), 4.6, 4.6 * 120 / 1024, 20);
const endTeams = hudPlane(canvasTex(1024, 560, (c, w, h) => {
  fitFont(c, HOME.name, 940, 150);
  italicText(c, HOME.name, w / 2, 110, { fill: '#fff', stroke: HOME.primary, strokeW: 18 });
  c.font = `900 80px ${FONT}`;
  italicText(c, 'VS', w / 2, 270, { fill: HOME.secondary, stroke: '#140d00', strokeW: 12 });
  fitFont(c, AWAY.name, 940, 150);
  italicText(c, AWAY.name, w / 2, 430, { fill: '#fff', stroke: AWAY.primary, strokeW: 18 });
}), 4.9, 4.9 * 560 / 1024, 20);
const endInfo = hudPlane(canvasTex(1024, 300, (c, w, h) => {
  c.fillStyle = 'rgba(8,14,40,.85)'; c.strokeStyle = HOME.secondary; c.lineWidth = 6;
  c.beginPath(); c.roundRect(40, 20, w - 80, h - 40, 28); c.fill(); c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
  c.font = `900 84px ${FONT}`; c.fillText(`${EVENT.date}  ·  ${EVENT.time}`, w / 2, 112);
  c.font = `700 60px ${FONT}`; c.fillStyle = '#c9d4ff'; c.fillText(EVENT.venue, w / 2, 210);
}), 4.6, 4.6 * 300 / 1024, 20);
const endTag = hudPlane(canvasTex(1024, 160, (c, w, h) => {
  c.font = `900 84px ${FONT}`; fitFont(c, EVENT.tagline, 960, 84);
  italicText(c, EVENT.tagline, w / 2, h / 2, { fill: HOME.secondary, stroke: '#140d00', strokeW: 10 });
}), 4.8, 4.8 * 160 / 1024, 20);

// crests (3D, camera space)
function shieldShape(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(-1 * s, 1.15 * s); sh.lineTo(-.35 * s, 1.15 * s); sh.lineTo(0, 1.32 * s); sh.lineTo(.35 * s, 1.15 * s); sh.lineTo(1 * s, 1.15 * s);
  sh.lineTo(1 * s, .1 * s); sh.quadraticCurveTo(.95 * s, -.95 * s, 0, -1.4 * s); sh.quadraticCurveTo(-.95 * s, -.95 * s, -1 * s, .1 * s); sh.closePath();
  return sh;
}
function shieldPath(c, ox, oy, s) { // same outline on a 2D canvas (y down)
  const P = (x, y) => [ox + x * s, oy - y * s];
  c.beginPath(); c.moveTo(...P(-1, 1.15)); c.lineTo(...P(-.35, 1.15)); c.lineTo(...P(0, 1.32)); c.lineTo(...P(.35, 1.15)); c.lineTo(...P(1, 1.15));
  c.lineTo(...P(1, .1)); c.quadraticCurveTo(...P(.95, -.95), ...P(0, -1.4)); c.quadraticCurveTo(...P(-.95, -.95), ...P(-1, .1)); c.closePath();
}
function makeCrest(team, logo) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape(), { depth: .22, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: team.secondary, metalness: .55, roughness: .28 }));
  g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.8), new THREE.MeshStandardMaterial({
    map: canvasTex(512, 717, (c, w, h) => {
      const s = 512 / 2 * .86, ox = w / 2, oy = h * (1.4 / 2.8);
      shieldPath(c, ox, oy, s); c.save(); c.clip();
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, team.primary); gr.addColorStop(1, team.dark);
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      if (logo) {
        const k = Math.min((w * .78) / logo.width, (h * .62) / logo.height);
        c.drawImage(logo, ox - logo.width * k / 2, oy - logo.height * k / 2 - 20, logo.width * k, logo.height * k);
      } else {
        c.fillStyle = 'rgba(255,255,255,.12)'; c.save(); c.transform(1, 0, -.4, 1, 0, 0); c.fillRect(ox + 60, 0, 70, h); c.fillRect(ox + 160, 0, 26, h); c.restore();
        c.fillStyle = team.secondary; for (const dx of [-70, 0, 70]) star(c, ox + dx, oy - s * .95, dx ? 18 : 24);
        fitFont(c, team.mono, s * 1.5, 190);
        italicText(c, team.mono, ox, oy - 10, { fill: team.ink, stroke: 'rgba(0,0,0,.35)', strokeW: 10, skew: -.1 });
        c.strokeStyle = team.secondary; c.lineWidth = 6; c.beginPath(); c.arc(ox, oy + s * .62, 34, 0, 7); c.stroke();
        c.beginPath(); c.arc(ox, oy + s * .62, 12, 0, 7); c.fillStyle = team.secondary; c.fill();
      }
      c.restore();
    }), transparent: true, metalness: .1, roughness: .5,
  }));
  face.position.set(0, -.04, .32); g.add(face);
  const rib = new THREE.Mesh(new THREE.PlaneGeometry(2.7, .62), new THREE.MeshStandardMaterial({
    transparent: true, roughness: .6,
    map: canvasTex(870, 200, (c, w, h) => {
      c.fillStyle = team.dark; c.beginPath(); c.moveTo(0, 40); c.lineTo(110, 40); c.lineTo(110, 190); c.lineTo(0, 190); c.lineTo(40, 115); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(w, 40); c.lineTo(w - 110, 40); c.lineTo(w - 110, 190); c.lineTo(w, 190); c.lineTo(w - 40, 115); c.closePath(); c.fill();
      c.fillStyle = team.secondary; c.beginPath(); c.roundRect(70, 10, w - 140, 150, 10); c.fill();
      c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, team.name, w - 200, 92); c.fillStyle = team.dark === '#4a0712' ? team.primary : team.dark;
      c.fillText(team.name, w / 2, 90);
    }),
  }));
  rib.position.set(0, -1.32, .45); g.add(rib);
  g.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.renderOrder = 25; } });
  hudRoot.add(g); g.visible = false; return g;
}
function star(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }

// sparks (camera space, at the VS clash)
const SPK = 260, spR = rng(5), spkPos = new Float32Array(SPK * 3), spkData = [];
for (let i = 0; i < SPK; i++) { const a = spR() * Math.PI * 2, s = 2 + spR() * 6; spkData.push([Math.cos(a) * s, Math.sin(a) * s, spR()]); }
const spkGeo = new THREE.BufferGeometry(); spkGeo.setAttribute('position', new THREE.BufferAttribute(spkPos, 3));
const sparks = new THREE.Points(spkGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xffcc55, size: .28, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
sparks.renderOrder = 29; sparks.frustumCulled = false; hudRoot.add(sparks);

let crestHome, crestAway;

// ---------------------------------------------------------------- timeline
const S2 = 2.2, CLASH = 3.0, S3 = 5.0, KICK = 5.55, HIT = 6.0, S4 = 7.8;
const BALL_SPOT = v3(0, .42, SPOT_Z), BALL_HIT = v3(2.2, 1.85, GOAL_Z - 1.2);

function ballDrop(t) { // free fall onto centre spot with bounces
  const g = 60, t0 = .3, h = 30; let y;
  const tLand = t0 + Math.sqrt(2 * h / g);
  if (t < t0) y = h + 5; else if (t < tLand) y = h - .5 * g * (t - t0) ** 2;
  else { let v = g * (tLand - t0) * .32, tt = t - tLand; y = 0; while (v > .5) { const fl = 2 * v / g; if (tt < fl) { y = v * tt - .5 * g * tt * tt; break; } tt -= fl; v *= .35; } }
  return v3(0, .42 + y, 0);
}

function update(t) {
  t = clamp(t, 0, DURATION - 1e-4);
  [dim, flash, matchDay, vs, goalTxt, endKicker, endTeams, endInfo, endTag].forEach(m => { m.visible = false; m.material.opacity = 0; });
  crestHome.visible = crestAway.visible = sparks.visible = false;
  hudLight.intensity = 0;
  vignette.material.opacity = .9;
  ledTex.offset.x = -t * .12;

  // floodlights: staggered switch-on with a flicker
  towers.forEach((tw, i) => {
    const on0 = .15 + i * .14; let on = t > on0 ? 1 : 0;
    if (t > on0 + .05 && t < on0 + .1) on = .15;
    tw.panelMat.color.setScalar(.12 + on * 2.2); tw.glow.material.opacity = on * .95;
    tw.spot.intensity = on * 3.2; tw.cone.material.opacity = on * .045;
  });

  // defaults for world objects
  updateNet(t);
  confetti.visible = false;
  let flashA = 0; let pos, look, roll = 0, fov = 50;

  if (t < S2) { // ---- shot 1: aerial dive into the stadium, ball drops on the spot
    const k = easeInOut(t / S2);
    const a = lerp(.9, .15, k);
    pos = v3(Math.sin(a) * lerp(62, 15, k), lerp(42, 4.2, k), Math.cos(a) * lerp(62, 15, k));
    look = v3(0, lerp(0, 1.8, k), 0);
    const b = ballDrop(t); setBall(b, t * 4);
    const ap = prog(t, .85, 1.25), out = prog(t, 2.0, S2);
    matchDay.visible = true; matchDay.material.opacity = clamp(ap * 3) * (1 - out);
    const sc = lerp(1.7, 1, easeOutBack(ap, 1.3)); matchDay.scale.setScalar(sc);
    matchDay.position.set(-out * 4, 1.8, HUD_Z);
    const [sx, sy] = shake(t, 1.3, .25); pos.x += sx; pos.y += sy;
    flashA = (1 - prog(t, 1.3, 1.45)) * (t > 1.3 ? .25 : 0);
  } else if (t < S3) { // ---- shot 2: crests clash, VS slam
    const k = prog(t, S2, S3);
    pos = v3(lerp(-1.5, 1.5, k), 2.0, lerp(11, 8.5, k)); look = v3(0, 1.4, 0); roll = lerp(-.04, .03, k);
    setBall(v3(0, .42, 0), 0);
    dim.visible = true; dim.material.opacity = .55;
    hudLight.intensity = 3.2;
    const inP = prog(t, S2 + .08, CLASH), outP = prog(t, S3 - .3, S3);
    const e = easeOutBack(inP, 1.4), idle = Math.max(0, t - CLASH);
    for (const [cr, side, y] of [[crestHome, -1, 2.55], [crestAway, 1, -1.95]]) {
      cr.visible = true; cr.scale.setScalar(.92);
      cr.position.set(lerp(side * 6.5, 0, e) + side * outP * 7, y + Math.sin(idle * 3 + side) * .05, HUD_Z + 1.2);
      cr.rotation.set(Math.sin(idle * 2.2) * .05, lerp(side * Math.PI * 2, 0, easeOutCubic(inP)) + Math.sin(idle * 1.7 + side) * .18, side * .03);
    }
    if (t > CLASH - .02) {
      vs.visible = true; const vp = prog(t, CLASH - .02, CLASH + .16);
      vs.material.opacity = clamp(vp * 3) * (1 - outP); vs.scale.setScalar(lerp(3.2, 1, easeOutCubic(vp)) * (1 + Math.sin(idle * 9) * .025) * (1 - outP));
      vs.position.set(0, .3, HUD_Z + .5);
      sparks.visible = true; const st = t - CLASH, pa = spkGeo.attributes.position;
      spkData.forEach(([vx, vy, r], i) => { const tt = st * (.7 + r * .5); pa.setXYZ(i, vx * tt * (1 - tt * .3), .3 + vy * tt - 4 * tt * tt, -9.4); });
      pa.needsUpdate = true; sparks.material.opacity = clamp(1 - st / 1.1);
    }
    const [sx, sy] = shake(t, CLASH, .35); pos.x += sx; pos.y += sy;
    flashA = Math.max(t < S2 + .1 ? 1 - prog(t, S2, S2 + .1) : 0, t > CLASH ? .8 * (1 - prog(t, CLASH, CLASH + .2)) : 0);
  } else if (t < S4) { // ---- shot 3: penalty, top corner, net bulge, confetti
    const pre = prog(t, S3, KICK);
    if (t < HIT + .05) {
      const k = easeInOut(prog(t, S3, HIT));
      pos = v3(lerp(1.4, .7, k), lerp(2.3, 1.9, k), lerp(SPOT_Z + 6.5, SPOT_Z + 3.5, k));
      look = v3(lerp(0, 1, prog(t, KICK, HIT)), lerp(1.0, 1.3, prog(t, KICK, HIT)), GOAL_Z);
      fov = lerp(62, 54, k);
    } else { // crane round to the front-side of the goal
      const k = easeInOut(prog(t, HIT + .05, S4));
      pos = v3(lerp(.7, -3.5, k), lerp(1.9, 3.4, k), lerp(SPOT_Z + 3.5, SPOT_Z + 1.5, k));
      look = v3(lerp(1, .8, k), lerp(1.3, 1.0, k), GOAL_Z);
      fov = lerp(54, 60, k);
    }
    // ball
    if (t < KICK) setBall(BALL_SPOT, 0);
    else if (t < HIT) {
      const k = prog(t, KICK, HIT), p = BALL_SPOT.clone().lerp(BALL_HIT, k);
      p.y += Math.sin(k * Math.PI) * 1.1; p.x += Math.sin(k * Math.PI) * -.6; setBall(p, k * 14);
    } else {
      const tt = t - HIT, p = BALL_HIT.clone(); p.z -= Math.min(tt, .2) * 1.5;
      p.y = Math.max(.42, BALL_HIT.y - 5 * tt * tt); p.x -= tt * .4; setBall(p, 14 + tt * 3);
    }
    if (t > HIT) { // confetti
      confetti.visible = true; const tt = t - HIT, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = v3(1, 1, 1);
      confData.forEach((d, i) => {
        const drag = (1 - Math.exp(-tt * 1.6)) / 1.6;
        const p = d.o.clone().addScaledVector(d.v, drag); p.y -= 1.6 * tt * tt * .5 + tt * .4; p.x += Math.sin(tt * 4 + d.ph) * .25;
        e.set(d.spin.x * tt + d.ph, d.spin.y * tt, d.spin.z * tt); q.setFromEuler(e); m.compose(p, q, s); confetti.setMatrixAt(i, m);
      });
      confetti.instanceMatrix.needsUpdate = true;
      const gp = prog(t, HIT + .08, HIT + .3), go = prog(t, S4 - .35, S4);
      goalTxt.visible = true; goalTxt.material.opacity = clamp(gp * 4) * (1 - go);
      goalTxt.scale.setScalar(lerp(2.4, 1, easeOutBack(gp, 1.2)) * (1 + go * .3)); goalTxt.position.set(0, 2.4, HUD_Z);
    }
    const [sx, sy] = shake(t, HIT, .22); pos.x += sx; pos.y += sy;
    const [kx, ky] = shake(t, KICK, .06, .2); pos.x += kx; pos.y += ky;
    flashA = Math.max(t < S3 + .1 ? 1 - prog(t, S3, S3 + .1) : 0, t > HIT ? .55 * (1 - prog(t, HIT, HIT + .18)) : 0);
  } else { // ---- shot 4: end card over a slow aerial orbit
    const k = prog(t, S4, DURATION);
    const a = lerp(-.5, .1, k);
    pos = v3(Math.sin(a) * 30, lerp(20, 17, k), Math.cos(a) * 30); look = v3(0, 0, 0);
    setBall(v3(0, .42, 0), 0);
    dim.visible = true; dim.material.opacity = .62 * easeOutCubic(prog(t, S4, S4 + .4));
    hudLight.intensity = 3.2;
    const stag = (d) => prog(t, S4 + d, S4 + d + .35);
    const place = (m, d, y, from = 1) => { const p = stag(d); m.visible = true; m.material.opacity = easeOutCubic(p); m.position.set(0, y - (1 - easeOutCubic(p)) * .4 * from, HUD_Z); };
    place(endKicker, .05, 4.05);
    for (const [cr, side] of [[crestHome, -1], [crestAway, 1]]) {
      const p = easeOutBack(stag(.12), 1.6);
      cr.visible = true; cr.scale.setScalar(.62 * p + .001);
      cr.position.set(side * 1.35, 2.25, HUD_Z + 1); cr.rotation.set(0, Math.sin(t * 1.8 + side) * .22 - side * .15, 0);
    }
    vs.visible = true; vs.material.opacity = easeOutCubic(stag(.25)); vs.scale.setScalar(.55); vs.position.set(0, 2.35, HUD_Z + .5);
    place(endTeams, .35, -.15);
    place(endInfo, .55, -2.2);
    place(endTag, .75, -3.55);
    endTag.scale.setScalar(1 + Math.sin(t * 6) * .015);
    flashA = t < S4 + .12 ? 1 - prog(t, S4, S4 + .12) : 0;
  }

  if (flashA > 0) { flash.visible = true; flash.material.opacity = flashA; }
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.copy(pos); camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(look);
}

function setBall(p, spin) {
  ball.position.copy(p); ball.rotation.set(spin, spin * .3, 0);
  ballShadow.position.set(p.x, .01, p.z);
  const h = p.y - .42; ballShadow.scale.setScalar(1 + h * .08); ballShadow.material.opacity = .45 / (1 + h * .3);
}
function updateNet(t) {
  const tt = t - HIT;
  if (t < HIT || t > S4) { netBack(); return; }
  const amp = 1.1 * Math.exp(-tt * 3.5) * Math.cos(tt * 14) * clamp(tt * 25);
  const cu = (BALL_HIT.x + GW) / (2 * GW), cv = BALL_HIT.y / GH;
  netBack(n => { const d = Math.hypot((n.u - cu) * 2, n.v - cv); const w = Math.exp(-d * d * 6) * Math.sin(Math.PI * n.u) * Math.sin(Math.PI * Math.min(1, n.v * 1.1)); return v3(0, 0, -amp * w); });
}

// ---------------------------------------------------------------- boot
const [lh, la] = await Promise.all([loadImg(HOME.logo), loadImg(AWAY.logo)]);
crestHome = makeCrest(HOME, lh); crestAway = makeCrest(AWAY, la);

window.renderFrame = (f) => { update(f / FPS); draw(); };
window.FRAMES = DURATION * FPS;
window.ready = true;

if (!new URLSearchParams(location.search).has('render')) {
  const t0 = performance.now();
  renderer.setAnimationLoop(() => { update(((performance.now() - t0) / 1000) % DURATION); draw(); });
}
