// The cup short's world: a candle-lit Roman dining room at night (fresco walls, columns, mosaic floor, couch, fruit,
// amphora, hanging lamps, a night doorway), a table with the glass cage cup and a candle.
// The cup is a lathe-turned glass body plus an open-work cage shell (vines, a trapped king) with a dichroic shader:
// jade green by reflected light, glowing blood red when the candle lines up behind it from the lens (uRed, computed
// here from real positions every frame), so the colour change is physical, not keyed.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, quad } from "./build";
import { rep, ctex, planksHD, stoneHD, rng, brick } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, setCupRed, setCandle } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, TT, CUP, CUP_H, CUP_MID, CANDLE, FLAME, ROMAN, clamp01, smooth, VX, PLINTH, VCUP, LBX, SCOPE, SCREEN, MCX, MCY, CLUSTER, WSX, BENCH, WCUP, WCANDLE, WFLAME, FURNACE, BLOW, MAKER } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures ----------------
const frescoTex = () => ctex("fresco", 1024, 1024, (g, r) => {
  g.fillStyle = "#7e1d19"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${40 + r() * 60},10,10,${0.05 + 0.08 * r()})`; g.beginPath(); g.arc(r() * 1024, r() * 1024, 10 + r() * 60, 0, 7); g.fill(); }
  // black dado + frieze, ochre frames, a small painted vignette per panel
  g.fillStyle = "#1c1214"; g.fillRect(0, 760, 1024, 264); g.fillRect(0, 0, 1024, 110);
  g.strokeStyle = "#d9a441"; g.lineWidth = 10;
  for (const x of [40, 552]) {
    g.strokeRect(x, 150, 432, 570);
    g.lineWidth = 3; g.strokeRect(x + 18, 168, 396, 534); g.lineWidth = 10;
    // a garland and a little bird
    g.strokeStyle = "#3f6b34"; g.lineWidth = 7; g.beginPath(); g.moveTo(x + 60, 260); g.quadraticCurveTo(x + 216, 340, x + 372, 260); g.stroke();
    g.fillStyle = "#e7c47a"; g.beginPath(); g.ellipse(x + 216, 470, 26, 16, -0.3, 0, 7); g.fill();
    g.fillStyle = "#d8d2c0"; g.beginPath(); g.moveTo(x + 236, 462); g.lineTo(x + 258, 456); g.lineTo(x + 240, 474); g.fill();
    g.strokeStyle = "#d9a441"; g.lineWidth = 10;
  }
  g.fillStyle = "#d9a441"; for (let x = 0; x < 1024; x += 64) g.fillRect(x + 20, 46, 24, 18); // frieze pattern
  g.fillStyle = "#c9b98f"; for (let x = 0; x < 1024; x += 128) { g.fillRect(x + 30, 830, 68, 6); g.fillRect(x + 60, 800, 8, 66); }
});
const mosaicTex = () => ctex("mosaic", 1024, 1024, (g, r) => {
  const s = 16;
  for (let y = 0; y < 1024; y += s) for (let x = 0; x < 1024; x += s) {
    const border = (x / s) % 32 < 2 || (y / s) % 32 < 2;
    const v = 0.9 + 0.12 * r();
    const [R, G, B] = border ? [40, 30, 32] : ((x / s + y / s) % 9 === 0 ? [160, 70, 50] : [214, 196, 160]);
    g.fillStyle = `rgb(${R * v | 0},${G * v | 0},${B * v | 0})`; g.fillRect(x + 1, y + 1, s - 2, s - 2);
  }
});
const woodTex = () => ctex("tableWood", 512, 512, (g, r) => {
  g.fillStyle = "#6b3a22"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(30,12,6,${0.15 + 0.2 * r()})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + 20 * r() - 10, 340, y + 20 * r() - 10, 512, y + r() * 10); g.stroke(); }
});
/** the cage: open-work vines with a trapped king (alpha mask). u wraps round the cup, v is height (top row = rim). */
const cageTex = () => ctex("cage", 1024, 512, (g, r) => {
  g.clearRect(0, 0, 1024, 512);
  g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round";
  // rim and foot bands
  g.fillRect(0, 18, 1024, 26); g.fillRect(0, 452, 1024, 30);
  // vine stems winding round
  for (let k = 0; k < 3; k++) {
    g.lineWidth = 20 - k * 4; g.beginPath();
    for (let x = 0; x <= 1024; x += 8) { const y = 250 + (110 - k * 25) * Math.sin((x / 1024) * Math.PI * (4 + k) + k * 1.7); x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  // leaves and grapes
  for (let i = 0; i < 46; i++) {
    const x = r() * 1024, y = 70 + r() * 370, a = r() * 6.3;
    g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 26, 12, 0, 0, 7); g.fill(); g.restore();
    if (i % 3 === 0) for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x + (j % 3) * 10 - 10, y + 20 + Math.floor(j / 3) * 10, 6, 0, 7); g.fill(); }
  }
  // the king caught in the vines (front), a dancing satyr and a maenad: chunky carved shapes, rounded limbs
  const limb = (pts: [number, number][], w: number) => { g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const fig = (cx: number, s: number, pose: number) => {
    g.beginPath(); g.ellipse(cx, 150, 30 * s, 34 * s, 0, 0, 7); g.fill();                                     // head
    g.beginPath(); g.ellipse(cx, 255, 42 * s, 78 * s, pose * 0.15, 0, 7); g.fill();                             // torso
    g.beginPath(); g.moveTo(cx - 40 * s, 230); g.quadraticCurveTo(cx - 90 * s, 330, cx - 60 * s, 420); g.lineTo(cx + 55 * s, 410); g.quadraticCurveTo(cx + 80 * s, 320, cx + 40 * s, 230); g.fill(); // cloak
    limb([[cx - 20 * s, 330], [cx - 45 * s, 390], [cx - 38 * s, 445]], 26 * s);                                  // legs
    limb([[cx + 18 * s, 330], [cx + 30 * s + pose * 30, 385], [cx + 55 * s + pose * 25, 430]], 26 * s);
    limb([[cx - 30 * s, 205], [cx - 75 * s, 180 - pose * 40], [cx - 95 * s, 120 - pose * 40]], 22 * s);          // arms flung up
    limb([[cx + 30 * s, 205], [cx + 80 * s, 175], [cx + 105 * s, 125 + pose * 30]], 22 * s);
    g.beginPath(); g.moveTo(cx - 26 * s, 124); g.lineTo(cx - 20 * s, 96); g.lineTo(cx - 6 * s, 116); g.lineTo(cx, 92); g.lineTo(cx + 6 * s, 116); g.lineTo(cx + 20 * s, 96); g.lineTo(cx + 26 * s, 124); g.fill(); // crown
  };
  fig(512, 1, 1); fig(110, 0.8, -0.4); fig(910, 0.8, 0.6);
});

const discTex = () => ctex("moonDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 52, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ---------------- the dichroic glass ----------------
const GLASS_V = `
varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz; vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const GLASS_F = `
uniform float uRed; uniform vec3 uLight; uniform float uCage; uniform sampler2D uMask; uniform float uFlick;
float edgeK(vec2 uv) { vec2 d = vec2(1.5 / 1024.0, 1.5 / 512.0) * 3.0; float a = texture2D(uMask, uv + vec2(d.x, 0.0)).a + texture2D(uMask, uv - vec2(d.x, 0.0)).a + texture2D(uMask, uv + vec2(0.0, d.y)).a + texture2D(uMask, uv - vec2(0.0, d.y)).a; return 1.0 - a * 0.25; }
varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vW;
void main() {
  float m = 1.0;
  if (uCage > 0.5) { m = texture2D(uMask, vUv).a; if (m < 0.5) discard; }
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float ndl = dot(n, normalize(uLight)) * 0.5 + 0.5;
  float lit = smoothstep(0.42, 0.62, ndl);
  float fres = pow(1.0 - abs(dot(n, normalize(vV))), 2.2);
  float core = pow(abs(dot(n, normalize(vV))), 1.3);
  // reflected light: opaque jade green, two-tone like the world, a cool fresnel sheen
  vec3 green = mix(vec3(0.015, 0.07, 0.04), vec3(0.07, 0.34, 0.17), lit) + fres * vec3(0.12, 0.38, 0.22);
  if (uCage > 0.5) green *= 1.15;
  // transmitted light: glows from the inside, thick parts (the cage figures) deeper wine red, HDR so it blooms
  vec3 red = mix(vec3(0.12, 0.0, 0.004), vec3(1.25, 0.03, 0.015), core * core) * (0.85 + 0.15 * uFlick);
  if (uCage > 0.5) red = mix(red, vec3(0.5, 0.0, 0.01), 0.6);
  red += pow(core, 16.0) * vec3(0.7, 0.16, 0.03) * uRed;                          // hot core where the flame shines through
  float k = clamp((uRed * 1.4 - (1.0 - core)) / 0.4, 0.0, 1.0);                 // red bleeds out from the middle
  vec3 col = mix(green, red, k);
  if (uCage > 0.5) { float e = edgeK(vUv); col *= 1.0 - 0.55 * e; col += (1.0 - e) * mix(vec3(0.05, 0.12, 0.07), vec3(0.25, 0.02, 0.0), uRed) * lit; }
  // a vertical glint streak (glass)
  float streak = smoothstep(0.035, 0.0, abs(fract(vUv.x * 2.0 + 0.12) - 0.5) - 0.18) * (1.0 - uCage);
  col += streak * 0.22 * (1.0 - 0.6 * uRed);
  gl_FragColor = vec4(col, 1.0);
}`;

type Flame = { m: THREE.Mesh; base: THREE.Vector3 };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#24131c", 4, 26);
  private sunCache = new Map<number, THREE.Vector3>();
  private cups: Record<string, { meshes: THREE.Mesh[]; mats: THREE.ShaderMaterial[] }> = {};
  private vCandles: THREE.Mesh[] = []; private dust!: THREE.Mesh; private web!: THREE.Mesh;
  private screenTex!: THREE.CanvasTexture; private screenMat!: THREE.MeshBasicMaterial;
  private micro = new THREE.Group(); private streaks!: THREE.InstancedMesh; private hair!: THREE.Mesh;
  private wFlame!: THREE.Mesh; private furMouth!: THREE.MeshBasicMaterial;
  private flames: Flame[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root, b = new Batch();
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.3);
    this.sun = new THREE.DirectionalLight("#ffb36b", 2.4);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    // ---- room: 12 x 12 m, 4.6 m high, walls never cast shadows (they would black out the room) ----
    const x0 = -6, x1 = 6, z0 = -6, z1 = 6, h = 4.6;
    const fresco = lam("fresco", () => ({ map: frescoTex() }));
    const wall = (c: THREE.Vector3, a: THREE.Vector3) => b.add(quad(V(a.x, 0, a.z), V(c.x, 0, c.z), V(c.x, h, c.z), V(a.x, h, a.z), a.distanceTo(c) / 3.2, h / 3.2), fresco);
    wall(V(x0, 0, z1), V(x1, 0, z1)); wall(V(x1, 0, z0), V(x0, 0, z0)); wall(V(x0, 0, z0), V(x0, 0, z1)); wall(V(x1, 0, z1), V(x1, 0, z0));
    const floor = new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2);
    floor.attributes.uv.array.forEach((_, i, a) => { (a as Float32Array)[i] *= 4; });
    b.add(floor, lam("mosaic", () => ({ map: mosaicTex() })));
    const ceil = new THREE.PlaneGeometry(12, 12).rotateX(Math.PI / 2).translate(0, h, 0);
    b.add(ceil, lam("ceilWood", () => ({ map: rep(planksHD(), 0.3, 0.3) })));
    // columns
    const marble = lam("marbleCol", () => ({ map: stoneHD("colHD", ["#ece6da", "#e2dbcd", "#f2ede3", "#d9d1c1"], "#b9ae9c") }));
    for (const [cx, cz] of [[-3.2, 3.4], [3.2, 3.4], [-3.2, -3.0], [3.2, -3.0]]) {
      b.add(new THREE.CylinderGeometry(0.22, 0.25, h - 0.5, 18).translate(cx, (h - 0.5) / 2 + 0.25, cz), marble);
      b.add(boxGeo(V(cx - 0.34, 0, cz - 0.34), V(cx + 0.34, 0.25, cz + 0.34)), marble);
      b.add(boxGeo(V(cx - 0.36, h - 0.28, cz - 0.36), V(cx + 0.36, h, cz + 0.36)), marble);
    }
    // the table: round top on a turned leg, with fruit, bread, a jug
    const wood = lam("tableWood", () => ({ map: woodTex() }));
    b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 40).translate(0, TT - 0.025, 0), wood);
    b.add(new THREE.CylinderGeometry(0.05, 0.12, TT - 0.05, 16).translate(0, (TT - 0.05) / 2, 0), wood);
    b.add(new THREE.CylinderGeometry(0.3, 0.34, 0.04, 24).translate(0, 0.02, 0), wood);
    const grape = lam("grape", () => ({ color: "#5a2a5e" })), apple = lam("apple", () => ({ color: "#c2402e" })), bread = lam("bread", () => ({ color: "#c88a44" }));
    const r = rng(4);
    b.add(new THREE.CylinderGeometry(0.15, 0.11, 0.035, 24).translate(-0.26, TT + 0.018, 0.12), lam("plate", () => ({ color: "#b08a5a" })));
    for (let i = 0; i < 14; i++) b.add(new THREE.SphereGeometry(0.018, 10, 8).translate(-0.27 + (r() - 0.5) * 0.09, TT + 0.05 + r() * 0.03, 0.12 + (r() - 0.5) * 0.08), grape);
    b.add(new THREE.SphereGeometry(0.035, 14, 10).translate(-0.2, TT + 0.06, 0.07), apple);
    b.add(new THREE.SphereGeometry(0.06, 16, 10).scale(1.3, 0.6, 1).translate(0.3, TT + 0.035, -0.12), bread);
    const jug = new THREE.LatheGeometry([[0.0, 0], [0.05, 0.005], [0.075, 0.06], [0.07, 0.13], [0.035, 0.18], [0.04, 0.22], [0.045, 0.23]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
    b.add(jug.translate(-0.3, TT, -0.18), lam("terracotta", () => ({ color: "#b5603c" })));
    // a couch behind him, an amphora in the corner
    const cloth = lam("cushion", () => ({ color: "#3b4f8a" })), couch = lam("couchWood", () => ({ color: "#5a3420" }));
    b.add(boxGeo(V(-1.6, 0, 2.0), V(1.6, 0.45, 2.9)), couch);
    b.add(boxGeo(V(-1.55, 0.45, 2.05), V(1.55, 0.62, 2.85)), cloth);
    for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(0.22, 16, 10).scale(1.4, 0.7, 1).translate(sx * 1.1, 0.72, 2.6), lam("pillow", () => ({ color: "#d9a441" })));
    const amph = new THREE.LatheGeometry([[0.0, 0], [0.04, 0.02], [0.18, 0.35], [0.22, 0.6], [0.14, 0.85], [0.07, 0.95], [0.08, 1.05]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
    b.add(amph.translate(-2.4, 0, 3.6), lam("terracotta", () => ({ color: "#b5603c" })));
    b.add(amph.clone().translate(4.4, 0, -0.2), lam("terracotta", () => ({ color: "#b5603c" })));
    b.build(R);
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material === fresco || m.material === lam("ceilWood", () => ({})) || m.material === lam("mosaic", () => ({})))) m.castShadow = false; });
    // night doorway behind him (cool blue, a moon) and hanging lamps -> bokeh in the background
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.12, 0.3) }));
    door.position.set(0.9, 1.5, 5.98); door.rotation.y = Math.PI; door.layers.set(NOINK); R.add(door);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(1.4, 1.4, 1.6), fog: false }));
    moon.position.set(1.3, 2.4, 5.95); moon.scale.setScalar(0.35); moon.layers.set(NOINK); R.add(moon);
    for (const [lx, ly, lz] of [[-2.0, 2.6, 3.0], [2.4, 2.8, 2.6], [-1.0, 3.0, 5.0], [3.6, 2.4, 4.6]] as V3[]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 4.6 - ly, 4), lam("bronze", () => ({ color: "#8a6a3a" })));
      chain.position.set(lx, (4.6 + ly) / 2, lz); R.add(chain);
      const fm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8).scale(1, 1.6, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 2.6, 1.0) }));
      fm.position.set(lx, ly, lz); fm.layers.set(NOINK); R.add(fm); this.flames.push({ m: fm, base: fm.position.clone() });
    }
    // ---- the candle on its bronze stand ----
    const bronze = twoTone(new THREE.MeshPhongMaterial({ color: "#b08840", specular: "#ffe0a0", shininess: 60 }), 0.2);
    const stand = new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.05, 0.008], [0.015, 0.02], [0.012, 0.03], [0.03, 0.035], [0.03, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
    const sm = new THREE.Mesh(stand.translate(CANDLE[0], CANDLE[1], CANDLE[2]), bronze); sm.castShadow = true; sm.receiveShadow = true; R.add(sm);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.07, 14).translate(CANDLE[0], CANDLE[1] + 0.075, CANDLE[2]), lam("wax", () => ({ color: "#f3e7cf" })));
    wax.castShadow = true; R.add(wax);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10).scale(1, 2.2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.6, 1.2) }));
    flame.position.set(...FLAME); flame.layers.set(NOINK); R.add(flame); this.flames.push({ m: flame, base: flame.position.clone() });
    this.makeCup("room", CUP);
    this.buildVault(R); this.buildLab(R); this.buildMicro(R); this.buildShop(R);
  }

  /** the glass cage cup (body + open-work cage), standing at p */
  private makeCup(key: string, p: V3) {
    const prof = (k: number) => [[0.0, 0], [0.032, 0], [0.034, 0.006], [0.028, 0.012], [0.036, 0.02], [0.05, 0.045], [0.06, 0.08], [0.066, 0.12], [0.068, 0.15], [0.069, CUP_H]]
      .map(([x, y]) => new THREE.Vector2(x * k, y));
    const mk = (cage: boolean) => new THREE.ShaderMaterial({ vertexShader: GLASS_V, fragmentShader: GLASS_F, side: THREE.DoubleSide,
      uniforms: { uRed: { value: 0 }, uLight: { value: new THREE.Vector3(0, 1, 0) }, uCage: { value: cage ? 1 : 0 }, uMask: { value: cageTex() }, uFlick: { value: 1 } } });
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof(1), 64), mk(false));
    const cage = new THREE.Mesh(new THREE.LatheGeometry(prof(1.09).slice(4), 96), mk(true));
    { const pos = cage.geometry.attributes.position, uv = cage.geometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); uv.setY(i, 1 - (CUP_H - y) / (CUP_H - 0.02) * 0.92 - 0.04); } }
    const c = { meshes: [body, cage], mats: [body.material as THREE.ShaderMaterial, cage.material as THREE.ShaderMaterial] };
    for (const m of c.meshes) { m.position.set(...p); m.rotation.y = Math.PI; m.castShadow = true; this.root.add(m); }
    this.cups[key] = c;
  }
  private noShadow(mats: THREE.Material[]) { this.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && mats.includes(m.material as THREE.Material)) m.castShadow = false; }); }
  private room(b: Batch, x0: number, x1: number, z0: number, z1: number, h: number, wall: THREE.Material, floor: THREE.Material, ceil: THREE.Material, tile = 3) {
    const w = (c: THREE.Vector3, a: THREE.Vector3) => b.add(quad(V(a.x, 0, a.z), V(c.x, 0, c.z), V(c.x, h, c.z), V(a.x, h, a.z), a.distanceTo(c) / tile, h / tile), wall);
    w(V(x0, 0, z1), V(x1, 0, z1)); w(V(x1, 0, z0), V(x0, 0, z0)); w(V(x0, 0, z0), V(x0, 0, z1)); w(V(x1, 0, z1), V(x1, 0, z0));
    const fl = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0.001, (z0 + z1) / 2);
    fl.attributes.uv.array.forEach((_, i, a) => { (a as Float32Array)[i] *= (x1 - x0) / tile; });
    b.add(fl, floor);
    b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, h, (z0 + z1) / 2), ceil);
  }

  // ---- the vault: stone, a plinth, candles that burn down while the light sweeps (time-lapse) ----
  private buildVault(R: THREE.Group) {
    const b = new Batch();
    const stone = lam("vaultStone", () => ({ map: stoneHD("vaultHD", ["#8f8574", "#857b6b", "#9a907f", "#7a7060"], "#5a5246") }));
    const flags = lam("vaultFloor", () => ({ map: stoneHD("vaultFl", ["#6e665a", "#625a50", "#776e62", "#5a5248"], "#3e3832") }));
    const ceil = lam("vaultCeil", () => ({ color: "#3a332c" }));
    this.room(b, VX - 5, VX + 5, -5, 5, 4.5, stone, flags, ceil, 2.5);
    const marble = lam("marbleCol", () => ({}));
    b.add(boxGeo(V(VX - 0.28, 0, -0.28), V(VX + 0.28, PLINTH - 0.06, 0.28)), marble);
    b.add(boxGeo(V(VX - 0.34, PLINTH - 0.06, -0.34), V(VX + 0.34, PLINTH, 0.34)), marble);
    b.add(boxGeo(V(VX - 0.36, 0, -0.36), V(VX + 0.36, 0.12, 0.36)), marble);
    b.build(R);
    this.noShadow([stone, flags, ceil]);
    this.makeCup("vault", VCUP);
    const wax = lam("wax", () => ({}));
    for (const [dx, dz] of [[-0.22, 0.16], [0.24, 0.2], [0.2, -0.22]]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 1, 12).translate(0, 0.5, 0), wax);
      c.position.set(VX + dx, PLINTH, dz); c.castShadow = true; R.add(c); this.vCandles.push(c);
    }
    this.dust = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1, 0.66), lam("dust", () => ({ color: "#b8ad98" })));
    this.dust.position.set(VX, PLINTH, 0); R.add(this.dust);
    this.web = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: ctex("web", 256, 256, (g) => {
      g.strokeStyle = "rgba(235,230,220,0.8)"; g.lineWidth = 2;
      for (let k = 0; k < 9; k++) { const a = (k / 8) * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(256 * Math.cos(a), 256 * Math.sin(a)); g.stroke(); }
      for (let r2 = 30; r2 < 256; r2 += 28) { g.beginPath(); g.arc(0, 0, r2, 0, Math.PI / 2); g.stroke(); }
    }), transparent: true, depthWrite: false }));
    this.web.position.set(VX - 4.4, 3.9, 4.95); this.web.rotation.y = Math.PI; this.web.layers.set(NOINK); R.add(this.web);
  }

  // ---- the lab: an electron microscope column, a console, a monitor showing the micrograph ----
  private buildLab(R: THREE.Group) {
    const b = new Batch();
    const wall = lam("labWall", () => ({ color: "#cfe0e2" })), floor = lam("labFloor", () => ({ map: ctex("labTiles", 256, 256, (g) => {
      for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) { g.fillStyle = (i + k) % 2 ? "#c9cdd2" : "#aeb4bb"; g.fillRect(i * 128, k * 128, 128, 128); }
    }) })), ceil = lam("labCeil", () => ({ color: "#e8eef0" }));
    this.room(b, LBX - 5, LBX + 5, -5, 5, 3.4, wall, floor, ceil, 1.2);
    const steel = twoTone(new THREE.MeshPhongMaterial({ color: "#c9d0d8", specular: "#ffffff", shininess: 70 }), 0.2);
    const dark = lam("labDark", () => ({ color: "#3a4452" })), accent = lam("labAccent", () => ({ color: "#2f7fb8" }));
    b.add(boxGeo(V(SCOPE[0] - 0.45, 0, SCOPE[2] - 0.4), V(SCOPE[0] + 0.45, 0.9, SCOPE[2] + 0.4)), dark);
    b.add(boxGeo(V(SCOPE[0] - 0.46, 0.55, SCOPE[2] - 0.41), V(SCOPE[0] + 0.46, 0.62, SCOPE[2] + 0.41)), accent);
    b.add(new THREE.CylinderGeometry(0.22, 0.26, 1.5, 24).translate(SCOPE[0], 0.9 + 0.75, SCOPE[2]), steel);
    for (const y of [1.2, 1.6, 2.0]) b.add(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 24).translate(SCOPE[0], y, SCOPE[2]), dark);
    b.add(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 24).translate(SCOPE[0], 2.45, SCOPE[2]), steel);
    // desk + monitor
    b.add(boxGeo(V(SCREEN[0] - 0.65, 0.72, SCREEN[2] + 0.02), V(SCREEN[0] + 0.65, 0.76, SCREEN[2] + 0.7)), lam("deskTop", () => ({ color: "#e7e3da" })));
    for (const dx of [-0.6, 0.6]) b.add(boxGeo(V(SCREEN[0] + dx - 0.03, 0, SCREEN[2] + 0.05), V(SCREEN[0] + dx + 0.03, 0.72, SCREEN[2] + 0.65)), dark);
    b.add(boxGeo(V(SCREEN[0] - 0.36, SCREEN[1] - 0.24, SCREEN[2] + 0.01), V(SCREEN[0] + 0.36, SCREEN[1] + 0.24, SCREEN[2] + 0.08)), dark);
    b.add(boxGeo(V(SCREEN[0] - 0.05, 0.76, SCREEN[2] + 0.05), V(SCREEN[0] + 0.05, SCREEN[1] - 0.24, SCREEN[2] + 0.1)), dark);
    b.add(boxGeo(V(SCREEN[0] - 0.25, 0.76, SCREEN[2] - 0.25), V(SCREEN[0] + 0.25, 0.79, SCREEN[2] - 0.08)), lam("keyboard", () => ({ color: "#56606c" })));
    b.build(R);
    this.noShadow([wall, floor, ceil]);
    // the micrograph: grey grain with bright specks, redrawn as the zoom lands
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 340;
    const g = cv.getContext("2d")!, r = rng(3);
    g.fillStyle = "#3d4248"; g.fillRect(0, 0, 512, 340);
    for (let i = 0; i < 4000; i++) { const v = 50 + r() * 50; g.fillStyle = `rgb(${v},${v + 4},${v + 8})`; g.fillRect(r() * 512, r() * 340, 2, 2); }
    for (let i = 0; i < 46; i++) { const x = r() * 512, y = r() * 340, rr = 3 + r() * 9; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "#fffbe6"); gr.addColorStop(1, "rgba(220,220,200,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    this.screenTex = new THREE.CanvasTexture(cv); this.screenTex.colorSpace = THREE.SRGBColorSpace;
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.screenTex, color: new THREE.Color(1.1, 1.1, 1.15) });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.44).rotateY(Math.PI), this.screenMat);
    scr.position.set(SCREEN[0], SCREEN[1], SCREEN[2]); scr.layers.set(NOINK); R.add(scr);
    for (const [px, pz] of [[-2, -1], [1.5, -1], [-2, 2.5], [1.5, 2.5]]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.7) }));
      panel.position.set(LBX + px, 3.39, pz); panel.layers.set(NOINK); R.add(panel);
    }
  }

  // ---- inside the glass: gold and silver specks, light streaks, a giant hair for scale ----
  private buildMicro(R: THREE.Group) {
    const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e0a838", specular: "#fff2b0", shininess: 80 }), 0.25);
    const silver = twoTone(new THREE.MeshPhongMaterial({ color: "#d4d9e0", specular: "#ffffff", shininess: 90 }), 0.25);
    const r = rng(17), sph = new THREE.SphereGeometry(1, 20, 14), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const N = 240, gI = new THREE.InstancedMesh(sph, gold, N), sI = new THREE.InstancedMesh(sph, silver, N);
    const lens: THREE.Vector3[] = [];
    for (const id of [12, 13, 14, 15]) { const sh = SHOTS[id - 1]; for (let f = sh.a; f < sh.b; f += 2) lens.push(V(...camAt(id, f).pos)); }
    const clear = (p: THREE.Vector3, r2: number) => lens.every((c) => c.distanceTo(p) > r2 + 0.35);
    let ng = 0, ns2 = 0;
    for (let i = 0; i < N * 2 - 20; i++) {
      const p = V(MCX + (r() - 0.5) * 9, MCY + (r() - 0.5) * 6, -9 + r() * 22), s2 = 0.05 + r() ** 2 * 0.3;
      if (!clear(p, s2)) continue; // keep the lens path clear (no flying through a speck)
      const tgt = r() < 0.6 ? gI : sI, idx = tgt === gI ? ng++ : ns2++;
      if (idx >= N) continue;
      tgt.setMatrixAt(idx, m4.compose(p, q, V(s2, s2, s2)));
    }
    // the cluster for the light shots
    const cl: [number, number, number, number][] = [[0, 0, 0, 0.6], [-0.9, 0.5, 0.6, 0.45], [0.8, -0.35, 0.4, 0.5], [-0.4, -0.7, -0.4, 0.35], [0.5, 0.75, -0.3, 0.38], [1.4, 0.3, 1.2, 0.42], [-1.5, -0.2, 1.0, 0.4]];
    cl.forEach(([dx, dy, dz, rr], k) => { const tgt = k % 3 === 2 ? sI : gI, idx = tgt === gI ? ng++ : ns2++; if (idx < N) tgt.setMatrixAt(idx, m4.compose(V(CLUSTER[0] + dx, CLUSTER[1] + dy, CLUSTER[2] + dz), q, V(rr, rr, rr))); });
    gI.count = Math.min(ng, N); sI.count = Math.min(ns2, N);
    for (const im of [gI, sI]) { im.castShadow = false; im.receiveShadow = false; this.micro.add(im); }
    // light streaks (instanced thin boxes), posed per frame
    this.streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.035, 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff }), 80);
    this.streaks.count = 0; this.streaks.frustumCulled = false; this.streaks.layers.set(NOINK); this.micro.add(this.streaks);
    // the hair: a wall-sized cylinder with cuticle scales
    const hairTex = ctex("cuticle", 512, 512, (g, rr) => {
      g.fillStyle = "#7a4e30"; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 560; y += 46) for (let x = -40; x < 560; x += 120) {
        g.fillStyle = `rgba(${150 + rr() * 30},${100 + rr() * 20},${60 + rr() * 15},0.9)`;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 60, y - 30, x + 130, y); g.lineTo(x + 130, y + 40); g.quadraticCurveTo(x + 60, y + 10, x, y + 40); g.fill();
        g.strokeStyle = "rgba(40,20,10,0.8)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 60, y - 30, x + 130, y); g.stroke();
      }
    });
    this.hair = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 140, 96, 1, true), lam("hair", () => ({ map: rep(hairTex, 40, 6) })));
    this.hair.position.set(MCX + 70, MCY, 6); this.micro.add(this.hair);
    this.micro.visible = false; R.add(this.micro);
  }

  // ---- the Roman glass workshop: furnace, bench, shelves of glass, the finished cup + a candle ----
  private buildShop(R: THREE.Group) {
    const b = new Batch();
    const wall = lam("shopWall", () => ({ map: rep(brick(), 1, 1) })), floor = lam("shopFloor", () => ({ map: stoneHD("shopFl", ["#6e5a48", "#62503e", "#776250", "#5a4a3a"], "#3e3228") })), ceil = lam("shopCeil", () => ({ map: rep(planksHD(), 0.3, 0.3) }));
    this.room(b, WSX - 5, WSX + 5, -5, 5, 4.0, wall, floor, ceil, 2);
    const fb = lam("furnaceBrick", () => ({ color: "#8a4a32" }));
    b.add(new THREE.SphereGeometry(1.05, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2).translate(FURNACE[0], 0.45, FURNACE[2]), fb);
    b.add(new THREE.CylinderGeometry(1.08, 1.12, 0.45, 28).translate(FURNACE[0], 0.225, FURNACE[2]), fb);
    const wood = lam("benchWood", () => ({ map: woodTex() }));
    b.add(boxGeo(V(WSX - 0.05, BENCH - 0.06, 0.5), V(WSX + 1.25, BENCH, 1.5)), wood);
    for (const [dx, dz] of [[0, 0.55], [1.2, 0.55], [0, 1.45], [1.2, 1.45]]) b.add(boxGeo(V(WSX + dx - 0.04, 0, dz - 0.04), V(WSX + dx + 0.04, BENCH - 0.06, dz + 0.04)), wood);
    for (const y of [1.3, 1.9]) b.add(boxGeo(V(WSX - 1.0, y, 4.6), V(WSX + 2.0, y + 0.05, 5.0)), wood);
    const vessel = (x: number, y: number, z: number, col: string, k: number) => {
      const pts = [[0, 0], [0.05, 0], [0.07, 0.06 + k * 0.03], [0.04, 0.14 + k * 0.05], [0.02, 0.2 + k * 0.06], [0.03, 0.24 + k * 0.06]].map(([a, c]) => new THREE.Vector2(a, c));
      b.add(new THREE.LatheGeometry(pts, 18).translate(x, y, z), twoTone(new THREE.MeshPhongMaterial({ color: col, specular: "#ffffff", shininess: 90 }), 0.3));
    };
    ["#3f7fd0", "#d0902f", "#3fa06a", "#7a4fb0", "#d04f4f", "#3fb0b0"].forEach((c, i) => { vessel(WSX - 0.8 + i * 0.5, 1.35, 4.8, c, i % 3); vessel(WSX - 0.6 + i * 0.45, 1.95, 4.8, c, (i + 1) % 3); });
    b.build(R);
    this.noShadow([wall, floor, ceil]);
    this.furMouth = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 1.8, 0.4) });
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24).rotateY(Math.PI), this.furMouth);
    mouth.position.set(FURNACE[0] + 0.18, 0.72, FURNACE[2] - 0.98); mouth.rotation.y = Math.PI - 0.18; mouth.layers.set(NOINK); R.add(mouth);
    this.makeCup("shop", WCUP);
    const bronze = twoTone(new THREE.MeshPhongMaterial({ color: "#b08840", specular: "#ffe0a0", shininess: 60 }), 0.2);
    const stand = new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.05, 0.008], [0.015, 0.02], [0.012, 0.03], [0.03, 0.035], [0.03, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
    R.add(new THREE.Mesh(stand.translate(WCANDLE[0], WCANDLE[1], WCANDLE[2]), bronze));
    R.add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.07, 14).translate(WCANDLE[0], WCANDLE[1] + 0.075, WCANDLE[2]), lam("wax", () => ({}))));
    this.wFlame = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10).scale(1, 2.2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.6, 1.2) }));
    this.wFlame.position.set(...WFLAME); this.wFlame.layers.set(NOINK); R.add(this.wFlame);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < Math.min(s.b, 160); f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  /** light streaks inside the glass: shot 14 bounce off the specks (green), shot 15 shine straight through (red) */
  private poseStreaks(id: number, f: number) {
    const im = this.streaks, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = V(0, 0, 1);
    let n = 0;
    const put = (p: THREE.Vector3, d: THREE.Vector3, col: THREE.Color, len = 1) => {
      if (n >= 80) return;
      q.setFromUnitVectors(Z, d.clone().normalize()); im.setMatrixAt(n, m4.compose(p, q, V(1, 1, len))); im.setColorAt(n, col); n++;
    };
    if (id === 14 || id === 15) {
      const C = V(...CLUSTER), green = new THREE.Color(0.35, 2.6, 0.8), red = new THREE.Color(2.8, 0.12, 0.06), white = new THREE.Color(1.6, 1.5, 1.3);
      const targets = [[0, 0, 0, 0.6], [-0.9, 0.5, 0.6, 0.45], [0.8, -0.35, 0.4, 0.5], [-0.4, -0.7, -0.4, 0.35], [0.5, 0.75, -0.3, 0.38]];
      for (let k = 0; k < targets.length; k++) for (let j = 0; j < 4; j++) {
        const [dx, dy, dz, rr] = targets[k], P = C.clone().add(V(dx, dy, dz)), u = ((f / 30) * 0.9 + j / 4 + k * 0.13) % 1;
        if (id === 14) {
          // in from the upper left-front, out toward the lens after the bounce
          const dIn = V(0.55, -0.35, 0.75).normalize(), hit = P.clone().addScaledVector(dIn, -rr), dOut = V(-0.3, 0.25, -1).normalize();
          if (u < 0.5) put(hit.clone().addScaledVector(dIn, -3 * (0.5 - u) * 2), dIn, white, 0.8);
          else put(hit.clone().addScaledVector(dOut, 3 * (u - 0.5) * 2), dOut, green, 1.1);
        } else {
          // from far behind, straight through the speck toward the lens, red once through
          const d = V(0.05, 0.02, -1).normalize(), start = P.clone().addScaledVector(d, -4), pos = start.clone().addScaledVector(d, 8 * u);
          put(pos, d, pos.distanceTo(start) > 4 + rr ? red : white, 1.2);
        }
      }
    }
    im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.02; cam.far = 200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- how red the cup is: the candle lined up behind the cup, seen from the lens ----
    const place = s.place;
    const candleOn = place === "shop" ? 1 - smooth((f - BLOW) / 6) : 1;
    setCandle(candleOn);
    // the vault's time-lapse light: a point sweeping round behind the plinth (passes behind the cup mid-shot)
    const vLight = V(VCUP[0] + 5 * Math.sin(-2.2 + 4.4 * clamp01((f - 238) / 60)), PLINTH + 0.085 + 0.1, VCUP[2] + 5 * Math.cos(-2.2 + 4.4 * clamp01((f - 238) / 60)));
    const cupKey = place === "room" ? "room" : place === "vault" ? "vault" : place === "shop" ? "shop" : null;
    const cupPos = cupKey === "room" ? V(CUP[0], CUP_MID, CUP[2]) : cupKey === "vault" ? V(VCUP[0], PLINTH + 0.085, VCUP[2]) : V(WCUP[0], BENCH + 0.085, WCUP[2]);
    const lightPos = cupKey === "room" ? V(...FLAME) : cupKey === "vault" ? (id === 8 ? vLight : V(VCUP[0], 3.5, VCUP[2] - 3)) : V(...WFLAME);
    const align = cupPos.clone().sub(cam.position).normalize().dot(lightPos.clone().sub(cupPos).normalize());
    let red = cupKey ? smooth((align - 0.949) / (0.9976 - 0.949)) : 0;
    if (id === 4) red = 1;
    if (place === "shop") red *= candleOn;
    if (place === "vault" && id === 8) red = smooth((align - 0.9) / 0.09);
    setCupRed(red);
    // ---- light: the candle (flickering), red spill once the cup glows ----
    const fl = 0.93 + 0.07 * Math.sin(t * 23) * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 51);
    const sunDir = place === "vault" && id === 8 ? vLight.clone().sub(cupPos).normalize() : this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI * fl * (place === "shop" ? 0.45 + 0.55 * candleOn : 1);
    const Rr = THREE.MathUtils.clamp(dist * 1.3 + 0.8, 1.2, 8);
    this.sun.position.copy(focus).addScaledVector(sunDir, 30); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 5; sc.far = 60; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 4);
    const spill = id === 4 ? 1.0 : (place === "room" || place === "shop" ? 0.55 * red : 0);
    TONE.uLitCol.value.set(L.lit[0] * fl * (1 + 0.15 * spill), L.lit[1] * fl * (1 - 0.45 * spill), L.lit[2] * fl * (1 - 0.5 * spill));
    TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(L.charTint[0], L.charTint[1] * (1 - 0.72 * spill), L.charTint[2] * (1 - 0.75 * spill));
    CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = untone("#140b12");
    // ---- place-specific ----
    this.micro.visible = place === "micro";
    if (place === "micro") {
      const k = id === 15 ? smooth((f - 735) / 14) : 0;
      const fogC = new THREE.Color("#0d4a2c").lerp(new THREE.Color("#4a0c0a"), k);
      this.fog.color.copy(untone(fogC)); this.fog.near = 1.5; this.fog.far = 16; scene.background = untone(fogC.clone().multiplyScalar(0.7));
      TONE.uLitCol.value.set(1.45, 1.38, 1.22); TONE.uShadeCol.value.set(0.22, 0.26, 0.3);
      // the hair slides in on "thinner than a hair"
      this.hair.visible = id === 13; this.hair.position.x = MCX + 70 - 26 * smooth((f - 612) / 40);
      this.poseStreaks(id, f);
    }
    if (place === "lab") { const z = clamp01((f - 488) / 12) ** 2; this.screenMat.color.setRGB(1.1 + 2.5 * z, 1.1 + 2.5 * z, 1.15 + 2.5 * z); }
    if (place === "vault") {
      const u = id === 8 ? clamp01((f - 238) / 60) : 1;
      this.vCandles.forEach((c, i) => { c.scale.y = 0.16 - 0.13 * u - 0.01 * i; });
      this.dust.scale.y = 0.002 + 0.012 * u; this.dust.position.y = PLINTH + this.dust.scale.y / 2;
      this.web.scale.setScalar(0.2 + 0.8 * u);
    }
    if (place === "shop") {
      this.wFlame.scale.setScalar(Math.max(0.001, candleOn));
      const fur = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.1); this.furMouth.color.setRGB(4.5 * fur, 1.8 * fur, 0.4 * fur);
    }
    // cups: the room cup is in his hand in shots 5-6 (drawn on his card), and turns on the table in shot 7
    const rc = this.cups.room;
    for (const m of rc.meshes) { m.visible = !(id === 5 || id === 6); m.rotation.y = Math.PI + (id === 7 ? (f - 209) * 0.045 : 0); }
    // glass uniforms (light direction in world space = toward the candle)
    for (const [key, c] of Object.entries(this.cups)) for (const m of c.mats) { m.uniforms.uRed.value = key === cupKey ? red : 0; m.uniforms.uLight.value.copy(sunDir); m.uniforms.uFlick.value = fl; }
    // flames flicker
    for (const fm of this.flames) { fm.m.scale.set(1, 0.85 + 0.25 * fl, 1); fm.m.position.copy(fm.base).add(V(0.002 * Math.sin(t * 17 + fm.base.x), 0, 0)); }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h2, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h2, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const ef = this.fx(fi++);
      ef.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      ef.use(!!p.soft);
      ef.mesh.visible = true;
      ef.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { ef.mesh.quaternion.copy(cam.quaternion); ef.mesh.rotateZ(p.rot ?? 0); }
      ef.mesh.scale.set(p.w, p.h, 1);
      fused.push(ef);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
export { Pen, ROMAN, clamp01 };
