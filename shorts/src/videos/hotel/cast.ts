// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxGlow, fxShadow, fxContact, fxBurst, fxPuff, fxSplash, INK, Outfit, Expr, FrontOpts, SideOpts, townsfolk, SKIN } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, W, GUEST_LIE, GUEST_SIT, SIT_UP, PILLOWS, STANDS, BED, SLEEPER_LIE, SLEEPER_SIT, SCIENTISTS, MONITOR, BRAIN, WAKES, BEEPS, WATCH_PATH, WATCH_SCALE, SEA_X, LAB_X } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; pitch?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" | "night" | "candle" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden" | "night" | "candle", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.3, 0.32, 0.45], candle: [0.25, 0.18, 0.3] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- the cast of the hotel short ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const CAST = {
  guest: { jacket: "#4f78b8", pants: "#4f78b8", boots: "#4f78b8", hat: "hair", hair: "#3a2a22", buttons: "#f4f0e6", skin: "#f5c9a0" } as Outfit,
};
type Who2 = { i: number; o: Outfit; okey: string };

/** "never stationary": breathing bob, weight-shift sway, head tilt + bob, all seeded per character, plus line boil */
export const alive = (t: number, i: number, energy = 1) => {
  const ph = hh(i, 21) * 6.283, ph2 = hh(i, 22) * 6.283;
  return {
    bob: 0.012 * energy * Math.sin(t * 2 * Math.PI * 0.9 + ph),
    tilt: 2.2 * energy * Math.sin(t * 2 * Math.PI * 0.45 + ph2),
    head: 6 * energy * Math.sin(t * 2 * Math.PI * 0.6 + ph) + 3 * energy * Math.sin(t * 2 * Math.PI * 1.3 + ph2),
    boil: Math.floor(t * FPS / 3),
  };
};
const put = (cam: CamInfo, out: Stage, who: Who2, x: number, y: number, z: number, fo: FrontOpts, t: number, energy = 1, opts: { blob?: boolean; scale?: number; pitch?: number; yaw?: number } = {}) => {
  const a = alive(t, who.i, energy);
  const fo2: FrontOpts = { blink: lidAt(t, who.i), ...fo, tilt: (fo.tilt ?? 0) + a.tilt, headTilt: (fo.headTilt ?? 0) + a.head, boil: a.boil };
  const pl = person(cam, who, x, y + a.bob, z, { side: false, mirror: false }, fo2, {}, opts.scale ?? 1);
  if (opts.pitch !== undefined) { pl.pitch = opts.pitch; pl.yaw = opts.yaw ?? 0; }
  out.places.push(pl);
  if (opts.blob !== false) blob(out, x, y, z, opts.scale ?? 1);
};
const glow = (out: Stage, x: number, y: number, z: number, r: number, col = "255,190,110", key = "") =>
  out.fx.push({ key: `glow${col}${key}`, cw: 256, ch: 256, draw: (p) => fxGlow(p, col), x, y, z, w: r, h: r, soft: true });

// ---------------- our own effect drawings ----------------
/** a cartoon sheep mid-jump (400 x 300): fluffy body, dark face and legs; k = leg tuck 0..1; asleep = lying, eyes shut */
const fxSheep = (p: Pen, k: number, asleep: boolean) => {
  const g = p.g, cx = 200, cy = asleep ? 200 : 140;
  g.lineJoin = "round"; g.lineCap = "round";
  if (!asleep) for (const [lx, d] of [[150, -1], [175, -1], [235, 1], [258, 1]] as [number, number][]) { g.strokeStyle = "#2a2230"; g.lineWidth = 16; g.beginPath(); g.moveTo(lx, cy + 40); g.lineTo(lx + d * 30 * k, cy + 95 - 30 * k); g.stroke(); }
  g.fillStyle = "#f6f2ea"; g.strokeStyle = "#2a2230"; g.lineWidth = 9;
  const lobes: [number, number, number][] = [[cx - 60, cy, 46], [cx - 20, cy - 30, 50], [cx + 30, cy - 28, 48], [cx + 60, cy + 4, 44], [cx, cy + 22, 52], [cx - 40, cy + 26, 40], [cx + 40, cy + 26, 40]];
  g.beginPath(); for (const [x, y, r] of lobes) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); } g.stroke();
  for (const [x, y, r] of lobes) { g.beginPath(); g.arc(x, y, r - 3, 0, 7); g.fill(); }
  const hx = asleep ? cx + 92 : cx + 100, hy = asleep ? cy + 20 : cy - 30;
  g.fillStyle = "#2a2230"; g.beginPath(); g.ellipse(hx, hy, 34, 44, asleep ? 1.2 : 0.4, 0, 7); g.fill();
  g.fillStyle = "#2a2230"; g.beginPath(); g.ellipse(hx - 26, hy - 30, 18, 8, -0.6, 0, 7); g.fill();
  g.strokeStyle = "#f6f2ea"; g.lineWidth = 6;
  if (asleep) { g.beginPath(); g.arc(hx + 6, hy - 6, 9, 0.2, Math.PI - 0.2); g.stroke(); }
  else { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(hx + 8, hy - 10, 10, 0, 7); g.fill(); g.fillStyle = "#2a2230"; g.beginPath(); g.arc(hx + 11, hy - 10, 5, 0, 7); g.fill(); }
};
/** "z z Z" floating up (256 x 256) */
const fxZzz = (p: Pen, k: number) => {
  const g = p.g; g.lineJoin = "round"; g.lineCap = "round";
  [[60, 200, 34], [130, 130, 48], [190, 50, 62]].forEach(([x, y, s2], j) => {
    if (k < j * 0.25) return;
    for (const [w, col] of [[16, "#2a2230"], [8, "#f4f0ff"]] as [number, string][]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x - s2 / 2, y - s2 / 2); g.lineTo(x + s2 / 2, y - s2 / 2); g.lineTo(x - s2 / 2, y + s2 / 2); g.lineTo(x + s2 / 2, y + s2 / 2); g.stroke(); }
  });
};

/** a face on a brain hemisphere (400): awake (blinking), sleep (shut eyes + nightcap), guard (wide eyes + guard cap), alarm */
const fxBrainFace = (p: Pen, mode: string, blinkNow: boolean) => {
  const g = p.g; g.lineCap = "round"; g.lineJoin = "round";
  const eye = (x: number, open: number, big = 1) => {
    if (open < 0.5) { g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.arc(x, 200, 30, 0.2, Math.PI - 0.2); g.stroke(); return; }
    g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.ellipse(x, 190, 34 * big, 42 * big, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(x + 4, 196, 14 * big, 0, 7); g.fill();
  };
  if (mode === "sleep") { eye(130, 0); eye(270, 0); g.fillStyle = "#3f6fb5"; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.moveTo(80, 120); g.quadraticCurveTo(200, 10, 330, 120); g.lineTo(80, 120); g.fill(); g.stroke(); g.fillStyle = "#f6f2ea"; g.beginPath(); g.arc(340, 70, 22, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(160, 290); g.quadraticCurveTo(200, 310, 240, 290); g.stroke(); return; }
  const open = blinkNow ? 0 : 1, big = mode === "alarm" ? 1.35 : mode === "guard" ? 1.15 : 1;
  eye(130, open, big); eye(270, open, big);
  if (mode === "guard" || mode === "alarm") { g.fillStyle = "#2a3a6a"; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.moveTo(80, 120); g.lineTo(320, 120); g.lineTo(300, 60); g.lineTo(100, 60); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#e2ae45"; g.beginPath(); g.arc(200, 92, 14, 0, 7); g.fill(); g.fillStyle = "#1d2440"; g.fillRect(70, 118, 260, 16); }
  g.strokeStyle = INK; g.lineWidth = 10; g.beginPath();
  if (mode === "alarm") { g.ellipse(200, 300, 30, 36, 0, 0, 7); g.stroke(); } else if (mode === "guard") { g.moveTo(160, 300); g.lineTo(240, 300); g.stroke(); } else { g.moveTo(160, 290); g.quadraticCurveTo(200, 315, 240, 290); g.stroke(); }
};
const fxBeep = (p: Pen) => { const g = p.g; g.lineCap = "round"; for (const [r, w] of [[40, 14], [80, 12], [120, 10]]) { for (const [ww, col] of [[w + 8, INK], [w, "#ffe36a"]] as [number, string][]) { g.strokeStyle = col; g.lineWidth = ww; g.beginPath(); g.arc(200, 128, r, Math.PI * 0.75, Math.PI * 1.25); g.stroke(); } } };
const fxBang = (p: Pen) => { const g = p.g; g.fillStyle = "#ff4b3a"; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.moveTo(100, 30); g.lineTo(160, 30); g.lineTo(145, 170); g.lineTo(115, 170); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(130, 215, 22, 0, 7); g.fill(); g.stroke(); };
const fxQ = (p: Pen) => { const g = p.g; g.lineCap = "round"; for (const [w, col] of [[30, INK], [18, "#ffe36a"]] as [number, string][]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(128, 90, 50, Math.PI * 1.1, Math.PI * 2.35); g.lineTo(128, 165); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(128, 210, w * 0.75, 0, 7); g.fill(); } };
const fxDolphin = (p: Pen) => {
  const g = p.g; g.lineJoin = "round"; g.fillStyle = "#7a9ec8"; g.strokeStyle = INK; g.lineWidth = 10;
  g.beginPath(); g.moveTo(40, 170); g.quadraticCurveTo(160, 60, 330, 110); g.quadraticCurveTo(420, 130, 470, 150); g.quadraticCurveTo(400, 170, 330, 180); g.quadraticCurveTo(200, 210, 40, 170); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(220, 95); g.lineTo(250, 30); g.lineTo(285, 100); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(45, 170); g.lineTo(10, 120); g.lineTo(70, 150); g.lineTo(20, 210); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(380, 130, 14, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(384, 132, 6, 0, 7); g.fill();
  g.fillStyle = "#dfe8f4"; g.beginPath(); g.moveTo(120, 185); g.quadraticCurveTo(250, 200, 400, 165); g.lineTo(330, 180); g.quadraticCurveTo(220, 205, 120, 185); g.fill();
};
/** a duck on the water (300 x 260); open = -1 left eye open, 1 right eye open, 0 asleep */
const fxDuck = (p: Pen, open: number) => {
  const g = p.g; g.lineJoin = "round"; g.strokeStyle = INK; g.lineWidth = 9;
  g.fillStyle = "#f2e6c8"; g.beginPath(); g.ellipse(150, 170, 110, 60, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#2f8a5a"; g.beginPath(); g.arc(open >= 0 ? 210 : 90, 95, 46, 0, 7); g.fill(); g.stroke();
  const hx = open >= 0 ? 210 : 90, bx = open >= 0 ? 1 : -1;
  g.fillStyle = "#f2a83a"; g.beginPath(); g.moveTo(hx + bx * 38, 92); g.lineTo(hx + bx * 82, 104); g.lineTo(hx + bx * 38, 114); g.closePath(); g.fill(); g.stroke();
  if (open) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(hx + bx * 12, 82, 13, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(hx + bx * 15, 83, 6, 0, 7); g.fill(); }
  else { g.beginPath(); g.arc(hx + bx * 12, 84, 11, 0.3, Math.PI - 0.3); g.stroke(); }
};
/** everything with a face (and the effects) in shot id at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = Math.round(t * FPS);
  LNAME = s.light;
  findSun(cam, SUN);
  const guest: Who2 = { i: 11, o: CAST.guest, okey: "guest" };
  const fl = 0.97 + 0.03 * Math.sin(t * 3.1);
  // the lamps glow
  for (const [sx, sy, sz] of STANDS) glow(out, sx + (sx > 0 ? 0.08 : -0.08), sy + 0.42, sz - 0.05, 0.9 * fl, "255,196,120", "lamp");
  if (s.place === "room" && id <= 4) {
    if (f < SIT_UP) {
      // lying on his back, eyes wide open, darting (head on the pillow, body under the duvet)
      const look = Math.sin(t * 2.2) > 0 ? 1 : -1, ex: Expr = f < 40 ? "nervous" : "stern";
      put(cam, out, guest, GUEST_LIE[0], GUEST_LIE[1], GUEST_LIE[2], { mode: "stand", expr: ex, look, blink: 0 }, t, 0.6, { blob: false, pitch: -Math.PI / 2 + 0.2, yaw: 0 });
    } else {
      // bolt upright: a squash-and-stretch jolt, wide eyes, then the slump
      const j = Math.exp(-(f - SIT_UP) / 5), ex: Expr = f < 92 ? "shock" : "dazed";
      put(cam, out, guest, GUEST_SIT[0], GUEST_SIT[1] + 0.12 * j, GUEST_SIT[2], { mode: "stand", expr: ex, pose: f < 92 ? "up" : "cover", k: 0.2, tilt: -6 * j, headTilt: 8 * Math.sin((f - SIT_UP) * 0.3) * j }, t, f < 92 ? 1.6 : 1.1, { blob: false });
    }
    if (id === 4) {
      // the sheep: four vault the footboard one after another; the fourth lands... and falls asleep
      for (let k = 0; k < 4; k++) {
        const f0 = 96 + k * 5, u = (f - f0) / 12;
        if (u < 0) continue;
        const last = k === 3, uu = last ? Math.min(u, 1) : u;
        if (!last && u > 1.2) continue;
        const x = -1.9 + 2.5 * uu, y = 0.45 + 1.0 * Math.sin(Math.PI * clamp01(uu)), z = BED.z1 + 0.55;
        const asleep = last && u >= 1;
        const kq = asleep ? 0 : Math.round(Math.sin(Math.PI * clamp01(uu)) * 4) / 4;
        out.fx.push({ key: `sheep${kq}${asleep ? "z" : ""}`, cw: 400, ch: 300, draw: (p) => fxSheep(p, kq, asleep), x, y: asleep ? 0.28 : y, z, w: 0.8, h: 0.6, rot: asleep ? 0 : 0.25 * (0.5 - uu) });
        if (asleep) { const zk = Math.round(((t * 0.8) % 1) * 4) / 4; out.fx.push({ key: `zzz${zk}`, cw: 256, ch: 256, draw: (p) => fxZzz(p, zk), x: x + 0.35, y: 0.75 + 0.2 * zk, z, w: 0.5, h: 0.5 }); }
      }
    }
  }
  const lab = (o: Partial<Outfit>, v: number): Outfit => ({ jacket: "#f6f6f2", pants: ["#3a4a5e", "#5a4a3a"][v], boots: INK, hat: "hair", hair: ["#2a1d18", "#b9b2a8"][v], glasses: true, buttons: "#c9ccd2", skin: ["#c99067", "#f5d2b2"][v], ...o });
  const sleeperO: Outfit = { jacket: "#9ac8b8", pants: "#9ac8b8", boots: "#9ac8b8", hat: "eeg", skin: "#ecd0b6", noButtons: true };
  const zz = (x: number, y: number, z: number, sz = 0.5) => { const zk = Math.round(((t * 0.8) % 1) * 4) / 4; out.fx.push({ key: `zzz${zk}`, cw: 256, ch: 256, draw: (p) => fxZzz(p, zk), x, y: y + 0.2 * zk, z, w: sz, h: sz }); };
  if (s.place === "lab") {
    // the sleeper: lying (eyes shut) in the lab bed; in shot 12 jolting awake twice
    const up = id === 12 && ((f >= WAKES[0] && f < WAKES[0] + 14) || f >= WAKES[1]);
    if (!up) { put(cam, out, { i: 20, o: sleeperO, okey: "sleeper" }, SLEEPER_LIE[0], SLEEPER_LIE[1], SLEEPER_LIE[2], { mode: "stand", expr: "smile_closed", blink: 1 }, t, 0.5, { blob: false, pitch: -Math.PI / 2 + 0.07, yaw: 0 }); if (id !== 12) zz(SLEEPER_LIE[0] + 0.3, 1.1, -2.1, 0.4); }
    else { const w0 = f >= WAKES[1] ? WAKES[1] : WAKES[0], j = Math.exp(-(f - w0) / 4); put(cam, out, { i: 20, o: sleeperO, okey: "sleeper" }, SLEEPER_SIT[0], SLEEPER_SIT[1] + 0.12 * j, SLEEPER_SIT[2], { mode: "stand", expr: f - w0 < 10 ? "shock" : "dazed", pose: "up", k: 0.2, tilt: -6 * j }, t, 1.6, { blob: false });
      if (f - w0 < 8) out.fx.push({ key: `burst${f - w0}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, (f - w0) / 8, "#ffffff", 10, 40, 220), x: SLEEPER_SIT[0] + 0.5, y: 1.75, z: SLEEPER_SIT[2] + 0.2, w: 0.9, h: 0.9 }); }
    // the scientists: one points at the monitor, one writes on a clipboard
    const sc0 = SCIENTISTS[0], sc1 = SCIENTISTS[1];
    put(cam, out, { i: 30, o: lab({}, 0), okey: "sci0" }, sc0[0], 0, sc0[2], { mode: "stand", expr: id === 12 ? "shock" : f % 90 < 45 ? "stern" : "smile", pose: "point", look: -1, facing: -1 }, t, 1.1);
    put(cam, out, { i: 31, o: lab({}, 1), okey: "sci1" }, sc1[0], 0, sc1[2], { mode: "stand", expr: id === 12 ? "grin" : "neutral", pose: "quill", k: t, look: -1 }, t, 1.0);
    glow(out, MONITOR[0], MONITOR[1], MONITOR[2] + 0.1, 1.0, "150,230,200", "mon");
    if (id === 7) {
      // through the window: the moon sets, the sun crosses, the moon again
      const ph = clamp01((f - 252) / 34), day = Math.sin(Math.PI * ph), wx = LAB_X - 1.6 - 0.45 + 0.9 * ph;
      out.fx.push({ key: day > 0.5 ? "sun" : "moon", cw: 256, ch: 256, draw: (p) => fxGlow(p, day > 0.5 ? "255,236,150" : "240,240,255"), x: wx, y: 1.65 + 0.35 * Math.sin(Math.PI * ((ph * 3) % 1)), z: -3.85, w: 0.35, h: 0.35, soft: true });
    }
  } else if (s.place === "brain") {
    // faces on the hemispheres (the brain is seen from the front: its RIGHT half is on screen LEFT)
    const sleepR = f >= W.right - 2, guardL = f >= W.left - 2;
    const beepHit = BEEPS.findIndex((b0) => f >= b0 + 8 && f < b0 + 20);
    const modeR = sleepR ? "sleep" : "awake", modeL = beepHit >= 0 ? "alarm" : guardL ? "guard" : "awake";
    const bl = lidAt(t, 5) > 0.5;
    out.fx.push({ key: `bf_${modeR}${bl && !sleepR ? "b" : ""}`, cw: 400, ch: 400, draw: (p) => fxBrainFace(p, modeR, bl && !sleepR), x: BRAIN[0] - 0.7, y: BRAIN[1] + 0.05, z: BRAIN[2] + 1.02, w: 0.95, h: 0.95 });
    out.fx.push({ key: `bf_${modeL}${bl && modeL === "awake" ? "b" : ""}`, cw: 400, ch: 400, draw: (p) => fxBrainFace(p, modeL, bl && modeL === "awake"), x: BRAIN[0] + 0.7, y: BRAIN[1] + 0.05, z: BRAIN[2] + 1.02, w: 0.95, h: 0.95 });
    if (sleepR) zz(BRAIN[0] - 1.05, BRAIN[1] + 0.9, BRAIN[2] + 0.7, 0.55);
    // beeps: sound arcs flying in from the right ear side (screen right) to the left half
    for (const b0 of BEEPS) { const u = (f - b0) / 10; if (u < 0 || u > 1) continue; out.fx.push({ key: "beep", cw: 256, ch: 256, draw: (p) => fxBeep(p), x: BRAIN[0] + 3.0 - 1.8 * u, y: BRAIN[1] + 0.1, z: BRAIN[2] + 0.6, w: 0.7, h: 0.7 }); }
    if (beepHit >= 0) out.fx.push({ key: "bang", cw: 256, ch: 256, draw: (p) => fxBang(p), x: BRAIN[0] + 1.1, y: BRAIN[1] + 1.05, z: BRAIN[2] + 0.6, w: 0.5, h: 0.5 });
    for (let k = 0; k < 22; k++) { const u = (t * 0.05 + hh(k, 31)) % 1; out.fx.push({ key: "spark", cw: 64, ch: 64, draw: (p) => fxGlow(p, "220,200,255"), x: BRAIN[0] - 4 + 8 * hh(k, 32), y: BRAIN[1] - 2 + 4.5 * hh(k, 33) + 0.3 * u, z: -2 + 3 * hh(k, 34), w: 0.06, h: 0.06, soft: true }); }
  } else if (s.place === "room" && (id === 13 || id === 14)) {
    // night one: he dozes lightly; the tiny night watchman patrols with a lantern
    put(cam, out, guest, GUEST_LIE[0], GUEST_LIE[1], GUEST_LIE[2], { mode: "stand", expr: "neutral", blink: 0.5 }, t, 0.5, { blob: false, pitch: -Math.PI / 2 + 0.2, yaw: 0 });
    const w = id === 13 ? WATCH_PATH(f) : WATCH_PATH(800), watch: Who2 = { i: 40, o: { jacket: "#2a3a6a", pants: "#2a3a6a", boots: INK, hat: "cap", cap: "#1d2440", moustache: "#5a3a22", buttons: "#e2ae45", build: "stout", skin: "#f2c9a6" }, okey: "watch" };
    const walking = id === 13 && f < 735;
    put(cam, out, watch, w[0], w[1], w[2], walking ? { mode: "stroll", phase: t * 1.4, expr: "stern", look: 1 } : { mode: "stand", expr: f > 750 ? "nervous" : "stern", pose: "lantern", look: 1, headTilt: 10 * Math.sin(t * 2) }, t, 1.2, { scale: WATCH_SCALE });
    glow(out, w[0] + 0.25 * WATCH_SCALE, w[1] + 0.95 * WATCH_SCALE, w[2] + 0.05, 1.1, "255,200,110", "lant");
    if (id === 14 && f > 745) out.fx.push({ key: "qmark", cw: 256, ch: 256, draw: (p) => fxQ(p), x: w[0] - 0.1, y: w[1] + 1.45 * WATCH_SCALE + 0.2, z: w[2], w: 0.35, h: 0.35 });
  } else if (s.place === "sea") {
    // a dolphin cruising with one eye open; a row of ducks, the end ones each with one eye open
    for (let k = 0; k < 2; k++) { const x = SEA_X - 2.6 + 2.2 * k + 0.4 * t * 0.3, y = 0.15 + 0.08 * Math.sin(t * 2 + k); out.fx.push({ key: "dolphin", cw: 500, ch: 260, draw: (p) => fxDolphin(p), x, y: y + 0.25, z: -1.5 - 1.2 * k, w: 1.8, h: 0.94 }); }
    for (let k = 0; k < 5; k++) { const end = k === 0 || k === 4, x = SEA_X - 0.95 + 0.48 * k, y = 0.18 + 0.03 * Math.sin(t * 2.4 + k); out.fx.push({ key: `duck${end ? (k ? "R" : "L") : "z"}`, cw: 300, ch: 260, draw: (p) => fxDuck(p, end ? (k ? 1 : -1) : 0), x, y: y + 0.22, z: 1.6, w: 0.55, h: 0.48 }); }
    zz(SEA_X + 0.1, 1.1, 1.6, 0.45);
    out.fx.push({ key: "moonpath", cw: 64, ch: 512, draw: (p) => fxGlow(p, "255,244,214"), x: SEA_X + 3, y: 0.05, z: -14, w: 2.2, h: 22, flat: true, soft: true });
  } else if (s.place === "room") {
    // night two (16): the watchman yawns, hangs up his lantern, heads for the door; 17: fast asleep; 18: on the nightstand
    put(cam, out, guest, GUEST_LIE[0], GUEST_LIE[1], GUEST_LIE[2], { mode: "stand", expr: "smile_closed", blink: 1 }, t, 0.5, { blob: false, pitch: -Math.PI / 2 + 0.2, yaw: 0 });
    zz(GUEST_LIE[0] + 0.35, 1.15, -2.3, 0.45);
    const watch: Who2 = { i: 40, o: { jacket: "#2a3a6a", pants: "#2a3a6a", boots: INK, hat: "cap", cap: "#1d2440", moustache: "#5a3a22", buttons: "#e2ae45", build: "stout", skin: "#f2c9a6" }, okey: "watch" };
    if (id === 16) {
      const u = clamp01((f - 880) / 40), x = 0.9 - 1.1 * u, z = 0.6 + 2.0 * u;
      put(cam, out, watch, x, 0, z, u > 0 && u < 1 ? { mode: "stroll", phase: t * 1.4, expr: "smile_closed", look: -1 } : { mode: "stand", expr: f < 870 ? "whistle" : "smile_closed", pose: f < 870 ? "up" : undefined, k: 0.25 }, t, 1.1, { scale: WATCH_SCALE });
    } else if (id === 18) {
      const [sx, sy, sz] = STANDS[0], tip = smooth((f - 990) / 8) * (1 - smooth((f - 1012) / 8));
      put(cam, out, watch, sx - 0.18, sy, sz + 0.1, { mode: "stand", expr: f < 1000 ? "smile" : "smile_closed", pose: "up", k: 0.25 * tip, headTilt: 10 * tip, look: -1 }, t, 1.0, { scale: 0.22 });
    }
  }
  void W; void smooth; void PILLOWS; void fxBurst; void townsfolk; void clamp01;
  return out;
};
export { FPS, townsfolk };
