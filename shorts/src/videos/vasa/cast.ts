// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxGlow, fxShadow, fxContact, fxBurst, fxPuff, fxSplash, INK, Outfit, Expr, FrontOpts, SideOpts, townsfolk, SKIN } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, W, SAILORS, shipToWorld, shipUp, shipPose, LION, portX, PORT_LO, PORT_HI, halfAt, lidOpenAt, BREEZE_HIT, QUAY_Y, CROWD_CAM, MOOR_X, KING_WALK, KING_STOP, BOAT, crewSide, RUNS, ADMIRAL, GUSTS, CUT_X, BALLAST, UNDER_X, SEABED, CROWD61_CAM, RAISE_X, MUSEUM_X } from "./story";
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
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

// ---------------- the cast of the Vasa short ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const CAST = {
  sailorA: { jacket: "#d9c8a0", pants: "#5a4a3a", boots: INK, hat: "knit", cap: "#b8443a", noButtons: true, skin: SKIN, belt: "#6b4a2e" } as Outfit,
  sailorB: { jacket: "#6f86a8", pants: "#4a3a2e", boots: INK, hat: "knit", cap: "#2f5a8a", moustache: "#4a3020", noButtons: true, skin: "#f5c9a0" } as Outfit,
  crowd: (v: number): Outfit => {
    const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#a8823a"];
    const skins = [SKIN, "#f5c9a0", "#ecd0b6", "#e8b48c"];
    const o: Outfit = { jacket: coats[v % 7], pants: "#3b3f52", boots: "#4a3426", skin: skins[v % 4], noButtons: v % 3 !== 0 };
    if (v % 5 === 4) return { ...o, hat: "cap", cap: ["#e2453c", "#3f6fb5"][v % 2], build: "kid" };
    if (v % 2) return { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2", "#7a9a5a"][v % 4] };
    return { ...o, hat: "brim", cap: ["#2a2630", "#4a3a2e", "#3a3a4a"][v % 3], trim: v % 4 === 0 ? "#f4f0e6" : undefined, sash: v % 4 === 2 ? "#c0353a" : undefined };
  },
};
type Who2 = { i: number; o: Outfit; okey: string };

/** "never stationary": breathing bob, weight-shift sway, head tilt + bob, all seeded per character, plus line boil
 *  every 3 frames (user reference: heads tilt 10-15 deg on talkers; the character moves more than the frame). */
export const alive = (t: number, i: number, energy = 1) => {
  const ph = hh(i, 21) * 6.283, ph2 = hh(i, 22) * 6.283;
  return {
    bob: 0.012 * energy * Math.sin(t * 2 * Math.PI * 0.9 + ph),
    tilt: 2.2 * energy * Math.sin(t * 2 * Math.PI * 0.45 + ph2),
    head: 6 * energy * Math.sin(t * 2 * Math.PI * 0.6 + ph) + 3 * energy * Math.sin(t * 2 * Math.PI * 1.3 + ph2),
    boil: Math.floor(t * FPS / 3),
  };
};
/** card roll that keeps a card upright on a heeled deck (up = the deck's up, world) */
const rollFor = (cam: CamInfo, x: number, z: number, up: V3) => {
  const yaw = Math.atan2(cam.pos.x - x, cam.pos.z - z), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  return Math.atan2(-(up[0] * rx + up[2] * rz), up[1]);
};
const put = (cam: CamInfo, out: Stage, who: Who2, x: number, y: number, z: number, fo: FrontOpts, t: number, energy = 1, opts: { blob?: boolean; scale?: number; up?: V3 } = {}) => {
  const a = alive(t, who.i, energy);
  const fo2: FrontOpts = { blink: lidAt(t, who.i), ...fo, tilt: (fo.tilt ?? 0) + a.tilt, headTilt: (fo.headTilt ?? 0) + a.head, boil: a.boil };
  const pl = person(cam, who, x, y + a.bob, z, { side: false, mirror: false }, fo2, {}, opts.scale ?? 1);
  if (opts.up) pl.roll = rollFor(cam, x, z, opts.up);
  out.places.push(pl);
  if (opts.blob !== false) blob(out, x, y + (opts.up ? 0.03 : 0), z, opts.scale ?? 1);
};
const glow = (out: Stage, x: number, y: number, z: number, r: number, col = "255,190,110", key = "") =>
  out.fx.push({ key: `glow${col}${key}`, cw: 256, ch: 256, draw: (p) => fxGlow(p, col), x, y, z, w: r, h: r, soft: true });

// ---------------- our own effect drawings ----------------
/** a cartoon gust: a curl with three trailing speed lines, white with plum ink (600 x 300), ph = curl turn 0..1 */
const fxWind = (p: Pen, ph: number) => {
  const g = p.g, cx = 430, cy = 140;
  g.lineCap = "round"; g.lineJoin = "round";
  const spiral = (w: number, col: string) => {
    g.beginPath();
    for (let k = 0; k <= 60; k++) { const u = k / 60, a = ph * 6.283 + u * 9.5, r = 92 * (1 - u) + 10; const x = cx + r * Math.cos(a), y = cy + 0.8 * r * Math.sin(a); k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = col; g.lineWidth = w; g.stroke();
  };
  const lines = (w: number, col: string) => {
    for (const [y, x0, x1] of [[cy - 72, 60, cx - 30], [cy + 6, 20, cx - 92], [cy + 70, 90, cx - 40]]) { g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y - 14, x1, y + 4); g.strokeStyle = col; g.lineWidth = w; g.stroke(); }
  };
  spiral(30, INK); lines(26, INK); spiral(17, "#ffffff"); lines(14, "#ffffff");
};
/** a gull: two flapping wings (300 x 150), k = flap 0..1 */
const fxGull = (p: Pen, k: number) => {
  const g = p.g, y = 75, d = 40 * Math.sin(k * 6.283);
  g.lineCap = "round"; g.lineJoin = "round";
  for (const [w, col] of [[16, INK], [9, "#f6f2ea"]] as [number, string][]) {
    g.beginPath(); g.moveTo(30, y - d); g.quadraticCurveTo(90, y - 40 - d * 0.5, 150, y); g.quadraticCurveTo(210, y - 40 - d * 0.5, 270, y - d);
    g.strokeStyle = col; g.lineWidth = w; g.stroke();
  }
};
/** a knit cap tumbling away (200 x 200) */
const fxCap = (p: Pen, col: string) => {
  p.ell(100, 110, 60, 46, col, 9, 180, 360);
  p.poly([[40, 110], [160, 110], [160, 128], [40, 128]], "#8a2e26", 8);
};

/** the sea pouring in at a port: a curling foam crest over blue water (400 x 260), ph animates the curl */
const fxGush = (p: Pen, ph: number) => {
  const g = p.g, w = 14 * Math.sin(ph * 6.283);
  g.lineJoin = "round";
  g.fillStyle = "#3f8fd6"; g.strokeStyle = INK; g.lineWidth = 9;
  g.beginPath(); g.moveTo(20, 250); g.quadraticCurveTo(60, 120 + w, 170, 70); g.quadraticCurveTo(300, 30, 360, 120 - w); g.quadraticCurveTo(300, 110, 270, 160); g.lineTo(380, 250); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#f4fbff";
  g.beginPath(); g.moveTo(120, 110 + w * 0.5); g.quadraticCurveTo(220, 40, 350, 112 - w); g.quadraticCurveTo(290, 92, 262, 140); g.quadraticCurveTo(200, 90, 120, 110 + w * 0.5); g.fill(); g.stroke();
  for (let k = 0; k < 6; k++) { const a = ph * 6.283 + k; g.beginPath(); g.arc(150 + 40 * k + 8 * Math.sin(a), 60 - 18 * Math.cos(a) - (k % 2) * 14, 9 + (k % 3) * 3, 0, 7); g.fill(); g.stroke(); }
};
/** centre-of-gravity symbol: quartered black / yellow disc with a white rim (256) */
const fxCG = (p: Pen) => {
  const g = p.g, c = 128, r = 96;
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(c, c, r + 16, 0, 7); g.fill();
  for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? "#f3c22c" : "#1b1520"; g.beginPath(); g.moveTo(c, c); g.arc(c, c, r, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2); g.closePath(); g.fill(); }
  g.strokeStyle = "#1b1520"; g.lineWidth = 10; g.beginPath(); g.arc(c, c, r + 16, 0, 7); g.stroke();
};
const fxRedRing = (p: Pen) => { const g = p.g; g.strokeStyle = "#ff3b2f"; g.lineWidth = 22; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke(); g.strokeStyle = "#1b1520"; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke(); };
const fxFish = (p: Pen, kind: number, fk: number) => {
  const g = p.g, col = ["#f0a23a", "#6fb8d8", "#d8d0b8"][kind], w = 8 * Math.sin(fk * 6.283);
  g.lineJoin = "round";
  g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 8;
  g.beginPath(); g.ellipse(130, 80, 90, 44, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(215, 80); g.lineTo(285, 40 + w); g.lineTo(285, 120 + w); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(80, 70, 9, 0, 7); g.fill();
};
const fxRay = (p: Pen) => { const g = p.g, gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(220,255,250,0.55)"); gr.addColorStop(1, "rgba(220,255,250,0)"); g.fillStyle = gr; g.fillRect(24, 0, 80, 512); };
const fxBubble = (p: Pen) => { const g = p.g; g.strokeStyle = "rgba(230,255,255,0.9)"; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.stroke(); g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(24, 24, 5, 0, 7); g.fill(); };
/** 1961 / today: everyday clothes */
const modern = (v: number): Outfit => {
  const coats = ["#d8d2c4", "#3a4a6a", "#8a3a3a", "#2f6a5a", "#b8863a", "#5a5a66", "#7b5ac9"], hair = ["#2a1d18", "#7a4a26", "#b9b2a8", "#d9a441", "#4a3020"];
  const skins = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067", "#e8b48c"];
  const o: Outfit = { jacket: coats[v % 7], pants: "#3a3f52", boots: "#2a2626", skin: skins[v % 5], hat: "hair", hair: hair[v % 5], glasses: v % 3 === 0, noButtons: v % 2 === 0 };
  if (v % 5 === 3) return { ...o, dress: ["#c25a7a", "#5a8fc2", "#d9a441"][v % 3] };
  if (v % 7 === 5) return { ...o, hat: "cap", cap: "#4a4a52" };
  return o;
};
const gulls = (out: Stage, t: number, c: V3, n = 4, spread = 30) => {
  for (let k = 0; k < n; k++) {
    const ph = hh(k, 41), x = c[0] + spread * (hh(k, 42) - 0.5) + 3 * Math.sin(t * 0.4 + ph * 6), y = c[1] + 6 * hh(k, 43) + Math.sin(t * 0.7 + k), z = c[2] + spread * 0.4 * (hh(k, 44) - 0.5);
    const fk = Math.round(((t * 1.6 + ph) % 1) * 6) / 6;
    out.fx.push({ key: `gull${fk}`, cw: 300, ch: 150, draw: (p) => fxGull(p, fk), x, y, z, w: 1.4, h: 0.7 });
  }
};
/** bow wave + spray at the stem (ship-local stem at x 23, both sides) */
const bowWave = (out: Stage, t: number, f: number, big = 1) => {
  for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
    const u = ((t * 0.9 + k * 0.5 + (side > 0 ? 0.25 : 0)) % 1), q = Math.round(u * 12) / 12;
    const P = shipToWorld([21.5 - 2.2 * k, 0.2, side * (1.6 + 1.2 * k)], f);
    out.fx.push({ key: `splash${q}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q), x: P[0], y: P[1] + 0.6 * big, z: P[2], w: 2.6 * big, h: 2.6 * big });
  }
};
const spray = (out: Stage, t: number, c: V3, n: number, w: number, h: number) => {
  for (let k = 0; k < n; k++) {
    const u = (t * 0.6 + hh(k, 51)) % 1;
    out.fx.push({ key: "spray", cw: 64, ch: 64, draw: (p) => fxGlow(p, "255,246,230"), x: c[0] + w * (hh(k, 52) - 0.5) - 1.5 * u, y: c[1] + h * hh(k, 53) + 0.8 * Math.sin(u * 3.1), z: c[2] + w * 0.6 * (hh(k, 54) - 0.5), w: 0.07 + 0.06 * hh(k, 55), h: 0.07 + 0.06 * hh(k, 55), soft: true });
  }
};

/** everything with a face (and the effects) in shot id at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = Math.round(t * FPS);
  LNAME = s.light;
  findSun(cam, SUN);
  const up = shipUp(f), P = shipPose(f);
  const fwd = new THREE.Vector3(cam.right.z, 0, -cam.right.x).normalize();
  if (s.place === "ship" && (id === 1 || id === 5)) {
    const A: Who2 = { i: 11, o: CAST.sailorA, okey: "sA" }, B: Who2 = { i: 12, o: CAST.sailorB, okey: "sB" };
    const hit = id === 5 && f >= BREEZE_HIT;
    // shot 1: A points up at the sails, proud; B cheers. Shot 5: grins, then the gust: A's cap flies, both stagger
    const stag = id === 5 ? smooth((f - BREEZE_HIT) / 10) : 0;
    const exA: Expr = id === 1 ? (f < 8 ? "grin" : "laugh") : f < BREEZE_HIT - 2 ? "smile" : "shock";
    const exB: Expr = id === 1 ? "grin" : f < BREEZE_HIT ? "grin" : "nervous";
    const oA = hit ? { ...CAST.sailorA, hat: "hair", hair: "#5a3b2a" } : CAST.sailorA;
    const pa = shipToWorld([SAILORS[0][0], SAILORS[0][1], SAILORS[0][2] - 0.45 * stag], f), pb = shipToWorld([SAILORS[1][0], SAILORS[1][1], SAILORS[1][2] - 0.35 * stag], f);
    put(cam, out, { ...A, o: oA, okey: hit ? "sA_nocap" : "sA" }, pa[0], pa[1], pa[2], { mode: "stand", expr: exA, pose: id === 1 || f < BREEZE_HIT ? "point" : "up", k: id === 5 ? (f - BREEZE_HIT) / 20 : 0, look: 1, tilt: -9 * stag, headTilt: id === 1 ? -8 : -10 * stag }, t, hit ? 1.6 : 1.2, { up });
    put(cam, out, B, pb[0], pb[1], pb[2], { mode: "stand", expr: exB, pose: id === 1 ? "up" : f < BREEZE_HIT ? "up" : "cover", k: t * 1.4, facing: -1, look: -1, tilt: -7 * stag }, t, 1.3, { up });
    if (hit) {
      const u = (f - BREEZE_HIT) / 22, cp = shipToWorld([SAILORS[0][0] + 0.5 - 2.5 * u, 7.4 + 2.2 * u - 1.2 * u * u, SAILORS[0][2] - 3.2 * u], f);
      if (u < 1.2) out.fx.push({ key: `cap${Math.round(u * 8)}`, cw: 200, ch: 200, draw: (p) => fxCap(p, "#b8443a"), x: cp[0], y: cp[1], z: cp[2], w: 0.42, h: 0.42, rot: u * 7 });
    }
    if (id === 5) {
      // the gust: crosses the frame right to left at chest height, curling
      const u = (f - 128) / 22;
      if (u > 0 && u < 1.25) {
        const D = 4.5, ph = Math.round(((f * 0.07) % 1) * 8) / 8;
        const x = cam.pos.x + fwd.x * D + cam.right.x * (2.6 - 5.8 * u), z = cam.pos.z + fwd.z * D + cam.right.z * (2.6 - 5.8 * u);
        out.fx.push({ key: `wind${ph}`, cw: 600, ch: 300, draw: (p) => fxWind(p, ph), x, y: cam.pos.y + 0.6 - 0.4 * u, z, w: 2.2, h: 1.1 });
      }
    }
    gulls(out, t, shipToWorld([-6, 34, 30], f), 3, 24);
  } else if (s.place === "ship" && id === 2) {
    bowWave(out, t, f, 1.2);
    spray(out, t, shipToWorld([LION[0] - 0.5, LION[1] - 2.6, LION[2]], f), 22, 4, 3.5);
  } else if (s.place === "ship" && id === 3) {
    bowWave(out, t, f, 1.4);
    // a puff of dust at each port as its gun runs out
    for (const d of [0, 1]) for (let k = 0; k < 12; k++) {
      const u = (f - lidOpenAt(d, k) - 4) / 10;
      if (u < 0 || u > 1) continue;
      const x = portX(d, k), y = d ? PORT_HI : PORT_LO, q = Math.round(u * 10) / 10;
      const pp = shipToWorld([x, y, -halfAt(x, y) - 1.2], f);
      out.fx.push({ key: `puff${q}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q), x: pp[0], y: pp[1], z: pp[2], w: 1.3, h: 1.3, soft: true });
    }
  } else if (id === 4 || id === 13) {
    // the crowd on the quay, cheering and waving hats between the lens and the ship
    // laid out across the view from the lens (fixed in the world), 11-17 m out, three loose rows
    const c0: V3 = id === 4 ? CROWD_CAM(96) : [MOOR_X + 40, QUAY_Y + 2.6, -64], P0 = shipPose(id === 4 ? 96 : 560), dx = P0.x + 4 - c0[0], dz = -c0[2], dl = Math.hypot(dx, dz), fx2 = dx / dl, fz2 = dz / dl;
    for (let k = 0; k < 16; k++) {
      const row = k % 3, across = -4.6 + (k * 0.62) + 0.3 * hh(k, 61), d = 12 + row * 1.7 + 0.6 * hh(k, 62);
      const x = c0[0] + fx2 * d + fz2 * across, z = Math.min(-45.5, c0[2] + fz2 * d - fx2 * across);
      const o = CAST.crowd(k), wave = t * (1.2 + 0.5 * hh(k, 63)) + hh(k, 64);
      const ex: Expr = (["grin", "laugh", "smile_closed", "relief_open"] as Expr[])[k % 4];
      put(cam, out, { i: 30 + k, o, okey: `crowd${k}` }, x, QUAY_Y, z, { mode: "stand", expr: ex, pose: k % 3 === 1 ? "point" : "up", k: wave, facing: k % 2 ? 1 : -1, look: k % 2 ? 1 : -1 }, t, 1.5);
    }
    gulls(out, t, [P.x + 6, 30, -10], 5, 40);
    bowWave(out, t, f, 2.6);
    // the gust sets off across the water toward the sails
    const u = (f - 108) / 30;
    if (id === 4 && u > 0 && u < 1.1) {
      const ph = Math.round(((f * 0.07) % 1) * 8) / 8;
      out.fx.push({ key: `wind${ph}`, cw: 600, ch: 300, draw: (p) => fxWind(p, ph), x: P.x + 34 - 26 * u, y: 3 + 12 * u, z: -26 + 22 * u, w: 6 + 4 * u, h: 3 + 2 * u });
    }
  } else if (id >= 6 && id <= 7) {
    // the king and two courtiers on the pier
    const kingO: Outfit = { jacket: "#2f4f9a", pants: "#d9c48a", boots: "#3a2a20", hat: "crown", hair: "#7a4a26", beard: "#7a4a26", moustache: "#7a4a26", sash: "#e2ae45", buttons: "#e2ae45", build: "stout", skin: "#f2c9a6" };
    const court = (v: number): Outfit => ({ jacket: v ? "#5a2a4a" : "#2f5a4a", pants: "#2a2a30", boots: INK, hat: "brim", cap: v ? "#1d1b22" : "#3a2a20", trim: v ? "#f4f0e6" : undefined, moustache: "#4a3020", buttons: "#d9dde0", skin: v ? "#ecd0b6" : "#f5c9a0" });
    const k = id === 6 ? KING_WALK(f) : KING_STOP, walking = id === 6 && f < 240;
    const kex: Expr = id === 6 ? "smile_closed" : f < W.terrify ? "grin" : "laugh";
    put(cam, out, { i: 70, o: kingO, okey: "king" }, k[0], k[1], k[2], walking ? { mode: "stroll", phase: t * 1.0, expr: kex } : { mode: "stand", expr: kex, pose: "point", look: 1, headTilt: -10 }, t, 1.3);
    for (const [j, dx] of [[0, -1.25], [1, 1.25]] as [number, number][]) {
      const c = id === 6 ? KING_WALK(f - 16) : KING_STOP;
      put(cam, out, { i: 71 + j, o: court(j), okey: `court${j}` }, c[0] + dx, c[1], c[2] + 1.7, walking ? { mode: "stroll", phase: t * 1.0 + 0.3 * j, expr: "smile" } : { mode: "stand", expr: j ? "grin" : "smile", look: j ? -1 : 1, pose: j ? "up" : undefined, k: t }, t, 1.1);
    }
    gulls(out, t, [MOOR_X - 6, 30, -4], 4, 30);
  } else if (id === 8) {
    // two foreign observers in a rowboat: one gasps behind his hand, one trembles
    const spy = (v: number): Outfit => ({ jacket: v ? "#3f6f4a" : "#8c3b4a", pants: "#3a3240", boots: INK, hat: "brim", cap: v ? "#4a3a2e" : "#2a2630", trim: v ? undefined : "#c0353a", moustache: v ? undefined : "#3a2a20", skin: v ? "#f5c9a0" : "#ecd0b6", noButtons: true });
    const sh = 3.5 * Math.sin(t * 38) * smooth((f - 286) / 6);
    put(cam, out, { i: 80, o: spy(0), okey: "spy0" }, BOAT[0] - 0.9, -0.12, BOAT[2] + 0.1, { mode: "sit", expr: f < 288 ? "nervous" : "shock", pose: "cover", look: -1, tilt: sh, headTilt: -6 }, t, 1.4, { blob: false });
    put(cam, out, { i: 81, o: spy(1), okey: "spy1" }, BOAT[0] + 0.8, -0.12, BOAT[2] - 0.1, { mode: "sit", expr: "nervous", look: -1, facing: -1, tilt: -sh, headTilt: 8 }, t, 1.6, { blob: false });
    gulls(out, t, [MOOR_X + 4, 32, 0], 4, 30);
  } else if (id === 9 || id === 11 || id === 12) {
    // the thirty: a pack of six columns x five rows that runs across the waist and back (crewSide), seen side-on
    const COLS = [-4.2, -2.8, 1.5, 2.7, 4.0, 5.2], side = crewSide(f), runIdx = RUNS.findIndex(([a, b]) => f >= a && f < b);
    for (let c = 0; c < 6; c++) for (let r = 0; r < 5; r++) {
      const n = c * 5 + r, lag = (hh(n, 71) - 0.5) * 4, sd = crewSide(f - lag);
      const x = COLS[c] + 0.25 * (hh(n, 72) - 0.5), z = sd * 2.3 + (r - 2) * 0.8 + 0.2 * (hh(n, 73) - 0.5);
      const w = shipToWorld([x, 5.6, z], f), running = runIdx >= 0 && Math.abs(sd) < 0.98;
      const o: Outfit = { jacket: ["#d9c8a0", "#6f86a8", "#a8825a", "#c9b48a", "#7a8a6a"][n % 5], pants: ["#5a4a3a", "#4a3a2e", "#3b3f52"][n % 3], boots: INK, hat: "knit", cap: ["#b8443a", "#2f5a8a", "#6b4a2e", "#3f6a3a", "#c98a2a"][(n * 3) % 5], noButtons: true, skin: ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#e8b48c"][n % 4], moustache: n % 4 === 1 ? "#4a3020" : undefined };
      const who: Who2 = { i: 100 + n, o, okey: `crew${n}` };
      if (running && id === 9) {
        const toPort = RUNS[runIdx][2] < 0, mirror = (toPort ? -1 : 1) * cam.right.z < 0;
        const pl = person(cam, who, w[0], w[1], w[2], { side: true, mirror }, {}, { mode: "march", phase: t * 2.6 + hh(n, 74), expr: n % 3 ? "stern" : "grin", stride: 1.4 }, 1);
        pl.roll = rollFor(cam, w[0], w[2], up); out.places.push(pl); blob(out, w[0], w[1] + 0.03, w[2], 1);
      } else {
        const ex: Expr = id === 9 ? (n % 2 ? "grin" : "smile") : f < W.stopped ? "nervous" : n % 3 ? "shock" : "dazed";
        put(cam, out, who, w[0], w[1], w[2], { mode: "stand", expr: ex, facing: (n % 2 ? 1 : -1) as -1 | 1, look: n % 2 ? 1 : -1, pose: id >= 11 && n % 4 === 0 ? "cover" : undefined }, t, id === 9 ? 1.2 : 1.5, { up });
      }
    }
    if (id >= 11) {
      const adm: Outfit = { jacket: "#2a2a3a", pants: "#2a2a3a", boots: INK, hat: "brim", cap: "#1d1b22", trim: "#f4f0e6", sash: "#c0353a", moustache: "#5a3a22", buttons: "#e2ae45", build: "stout", skin: "#f2c9a6" };
      const a = shipToWorld(ADMIRAL, f);
      if (id === 11) put(cam, out, { i: 90, o: adm, okey: "adm" }, a[0], a[1], a[2], { mode: "stand", expr: f < W.stopped - 2 ? "nervous" : "shock", pose: "up", k: f < W.stopped ? t * 0.8 : 0.25 }, t, f < W.stopped ? 1.2 : 1.8, { up });
      else { const sh2 = smooth((f - 545) / 7); put(cam, out, { i: 90, o: adm, okey: "adm" }, a[0], a[1], a[2], { mode: "stand", expr: "smile_closed", pose: "shrug", k: sh2, headTilt: 12 * sh2 }, t, 1.4, { up }); }
    }
  } else if (id >= 14 && id <= 17) {
    // the sinking: the gusts, spray along the port side, the sea pouring through the lower gun ports, men in the water
    for (const [k, g0] of GUSTS.entries()) {
      const u = (f - g0 + 14) / 22;
      if (u > 0 && u < 1.1 && (id === 14 || id === 15)) {
        const ph = Math.round(((f * 0.07) % 1) * 8) / 8, sz = k ? 1.6 : 1;
        out.fx.push({ key: `wind${ph}`, cw: 600, ch: 300, draw: (p) => fxWind(p, ph), x: P.x + 26 - 24 * u, y: 4 + 14 * u, z: -22 + 20 * u, w: 7 * sz, h: 3.5 * sz });
      }
    }
    const heel = P.heel;
    if (heel > 0.18) for (let k = 2; k < 11; k++) {
      // lower port k on the port side: where it meets the sea, a white gush pours in
      const x = portX(0, k), pw = shipToWorld([x, PORT_LO, -halfAt(x, PORT_LO) - 0.2], f);
      if (pw[1] > 1.6) continue;
      // a foaming gush where the sea climbs over the sill and pours in (at the waterline against the hull)
      const ph = Math.round(((t * 2.2 + k * 0.31) % 1) * 6) / 6, hw = shipToWorld([x, 0, -halfAt(x, 0.6) - 0.15], f);
      out.fx.push({ key: `gush${ph}`, cw: 400, ch: 260, draw: (p) => fxGush(p, ph), x: hw[0], y: 0.45, z: Math.min(hw[2], pw[2]) - 0.25, w: 2.6, h: 1.7 });
    }
    if (id >= 15) spray(out, t, shipToWorld([2, 0.5, -6.5], f), 26, 30, 2.5);
    if (id === 17) for (let k = 0; k < 6; k++) {
      // sailors in the water (heads and shoulders above the surface), waving
      const x = P.x - 14 + 5.4 * k, z = -11 - 2.2 * (k % 3), o: Outfit = { jacket: ["#d9c8a0", "#6f86a8", "#a8825a"][k % 3], pants: "#4a3a2e", boots: INK, hat: "knit", cap: ["#b8443a", "#2f5a8a", "#c98a2a"][k % 3], noButtons: true };
      put(cam, out, { i: 140 + k, o, okey: `swim${k}` }, x, -1.25 + 0.06 * Math.sin(t * 3 + k), z, { mode: "stand", expr: k % 2 ? "shock" : "nervous", pose: "up", k: t * 1.5 + k }, t, 1.6, { blob: false });
    }
    gulls(out, t, [P.x - 10, 34, -6], 5, 40);
  } else if (id === 18 || id === 19) {
    // the cutaway: a centre-of-gravity marker that sits high, then drops as the ballast pours in; the ports flash red
    const cg = 6.4 - 5.0 * smooth((f - BALLAST[0]) / (BALLAST[1] - BALLAST[0] + 6)), c = shipToWorld([CUT_X + 1.2, cg, 0], f);
    out.fx.push({ key: "cgmark", cw: 256, ch: 256, draw: (p) => fxCG(p), x: c[0], y: c[1], z: c[2], w: 1.5, h: 1.5 });
    if (id === 19 && f >= W.waterline - 6) for (const sd of [-1, 1]) {
      const pw = shipToWorld([CUT_X + 0.6, PORT_LO, sd * (halfAt(0.6, PORT_LO) + 0.3)], f), on = Math.floor((f - W.waterline) / 5) % 2 === 0;
      if (on) out.fx.push({ key: "redring", cw: 256, ch: 256, draw: (p) => fxRedRing(p), x: pw[0] + 0.8, y: pw[1], z: pw[2], w: 2.2, h: 2.2 });
    }
  } else if (id === 20 || id === 21) {
    // the sea bed: fish, shafts of light, drifting silt; on the lift, a mud cloud and bubbles
    for (let k = 0; k < 9; k++) {
      const u = (t * 0.08 + hh(k, 81)) % 1, x = UNDER_X - 30 + 60 * u, y = SEABED + 6 + 14 * hh(k, 82) + Math.sin(t + k), z = -18 + 30 * hh(k, 83);
      const fk = Math.round(((t * 2 + hh(k, 84)) % 1) * 4) / 4;
      out.fx.push({ key: `fish${k % 3}_${fk}`, cw: 300, ch: 160, draw: (p) => fxFish(p, k % 3, fk), x, y, z, w: 1.2 + 0.6 * hh(k, 85), h: 0.65 + 0.3 * hh(k, 85) });
    }
    for (let k = 0; k < 6; k++) out.fx.push({ key: "ray", cw: 128, ch: 512, draw: (p) => fxRay(p), x: UNDER_X - 20 + 9 * k + 3 * Math.sin(t * 0.3 + k), y: SEABED + 18, z: -6 + 4 * hh(k, 86), w: 4, h: 36, soft: true, rot: 0.25 });
    spray(out, t, [UNDER_X, SEABED + 5, -8], 30, 50, 18);
    if (id === 21) {
      const u = clamp01((f - 990) / 24);
      for (let k = 0; k < 14; k++) out.fx.push({ key: "mud", cw: 256, ch: 256, draw: (p) => fxGlow(p, "120,112,84"), x: UNDER_X - 22 + 44 * hh(k, 87), y: SEABED + 1 + 4 * u * hh(k, 88), z: -6 + 12 * hh(k, 89), w: 5 + 6 * u, h: 4 + 5 * u, soft: true });
      for (let k = 0; k < 24; k++) { const b2 = (t * 0.7 + hh(k, 90)) % 1; out.fx.push({ key: "bubble", cw: 64, ch: 64, draw: (p) => fxBubble(p), x: UNDER_X - 15 + 30 * hh(k, 91), y: SEABED + 8 + 20 * b2, z: -8 + 4 * hh(k, 92), w: 0.3, h: 0.3, soft: true }); }
    }
  } else if (id === 22) {
    // 1961: the crowd on the quay, flashbulbs; water streaming off the hull
    const c0 = CROWD61_CAM, dx = RAISE_X + 2 - c0[0], dz = -c0[2], dl = Math.hypot(dx, dz), fx2 = dx / dl, fz2 = dz / dl;
    for (let k = 0; k < 14; k++) {
      const row = k % 3, across = -4.2 + k * 0.64 + 0.3 * hh(k, 93), d = 12 + row * 1.7 + 0.6 * hh(k, 94);
      const x = c0[0] + fx2 * d + fz2 * across, z = Math.min(-45.5, c0[2] + fz2 * d - fx2 * across);
      const o = modern(k), photo = k % 4 === 1;
      put(cam, out, { i: 160 + k, o, okey: `m61_${k}` }, x, QUAY_Y, z, { mode: "stand", expr: (["grin", "shock", "laugh", "relief_open"] as Expr[])[k % 4], pose: photo ? "cover" : k % 3 === 0 ? "point" : "up", k: t * 1.3 + hh(k, 95), facing: k % 2 ? 1 : -1, look: k % 2 ? 1 : -1 }, t, 1.4);
      if (photo && Math.floor((t * 3 + hh(k, 96) * 3) % 3) === 0 && ((f + k * 7) % 23) < 3) out.fx.push({ key: "flash", cw: 500, ch: 500, draw: (p) => fxBurst(p, 0.25, "#ffffff", 10, 40, 200), x, y: QUAY_Y + 1.75, z: z + 0.3, w: 0.9, h: 0.9 });
    }
    for (let k = 0; k < 10; k++) { const pw = shipToWorld([-16 + 3.4 * k, 0.3, -(halfAt(-16 + 3.4 * k, 1) + 0.2)], f), q = Math.round(((t + k * 0.13) % 1) * 10) / 10; out.fx.push({ key: `splash${q}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q), x: pw[0], y: 0.4, z: pw[2], w: 1.6, h: 1.6 }); }
    gulls(out, t, [RAISE_X, 30, -6], 6, 40);
  } else if (id === 23 || id === 24) {
    // the museum: visitors on the galleries, spotlight glows, a flash on "capsule"
    if (id === 23) for (let k = 0; k < 10; k++) {
      const x = MUSEUM_X + 17 + 1.25 * k + 0.4 * hh(k, 97), z = -17.6 - 1.1 * (k % 2);
      put(cam, out, { i: 180 + k, o: modern(k + 20), okey: `mus${k}` }, x, 2.0, z, { mode: "stand", expr: (["grin", "shock", "smile", "relief_open"] as Expr[])[k % 4], pose: k % 3 === 0 ? "point" : undefined, look: 1, facing: k % 2 ? 1 : -1 }, t, 1.1);
    } else {
      const kid: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
      put(cam, out, { i: 190, o: kid, okey: "kid" }, MUSEUM_X + 32.58, 5.0, -5.94, { mode: "stand", expr: f < W.capsule ? "grin" : "laugh", pose: "point", look: -1, facing: -1, headTilt: -8 }, t, 1.5);
      put(cam, out, { i: 191, o: modern(3), okey: "parent" }, MUSEUM_X + 31.67, 5.0, -5.8, { mode: "stand", expr: f < W.capsule ? "shock" : "relief_open", pose: "cover", look: -1 }, t, 1.2);
      if (f >= W.capsule && f < W.capsule + 6) out.fx.push({ key: `flash${f - W.capsule}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, (f - W.capsule) / 6, "#ffffff", 12, 40, 230), x: MUSEUM_X + 31.9, y: 6.7, z: -5.6, w: 1.6, h: 1.6 });
    }
    for (let k = 0; k < 6; k++) glow(out, MUSEUM_X - 20 + 11 * k, 25, -10 + 6 * (k % 2), 7, "255,214,150", "spot");
  }
  void W; void townsfolk; void fxBurst; void glow; void clamp01;
  return out;
};
export { FPS, townsfolk };
