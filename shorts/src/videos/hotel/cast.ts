// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxGlow, fxShadow, fxContact, fxBurst, fxPuff, fxSplash, INK, Outfit, Expr, FrontOpts, SideOpts, townsfolk, SKIN } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, W, GUEST_LIE, GUEST_SIT, SIT_UP, PILLOWS, STANDS, BED } from "./story";
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
  if (s.place === "room") {
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
  void W; void smooth; void PILLOWS; void fxBurst; void townsfolk; void clamp01;
  return out;
};
export { FPS, townsfolk };
