// Our cast as lit flat sprites in the 3D world (pool, cards, blobs and the person() drawing call come from the
// cartoon-short template); below them, who stands where in each shot of the Netflix short and what they do.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, SKIN, INK, Prop, ANCHOR } from "./toon";
import { FPS, TOTAL, V3, smooth, clamp01, SHOTS, at, P, SetName, KU, MARY, FZ, PH, WX, WY, WZ, WW, WH, BY, BZ, BX1, HEADX, HEADY, tapAt, walkX, ramp, lerp } from "./story";
import { NOINK } from "./ink";
import { TRACKS, PROPS, evalTrack } from "./acting";
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
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
export const setLight = (sun: THREE.Vector3, light: string) => { SUN.copy(sun).normalize(); LNAME = light === "golden" ? "golden" : "day"; };
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
/** a patchwork quilt drawn over a lying card's body, from just under the chin down past the feet (card space, the card
 *  is then rolled 90 degrees so this runs along the bed) */
const quiltOver = (p: Pen, cols: string[]) => {
  const top = ANCHOR.chin[1] + 14, hw = 122, y1 = 1000;
  const shape: [number, number][] = [[300 - hw, y1], [300 - hw, top + 70], [300 - hw + 14, top + 26], [300 - 70, top + 4], [300, top], [300 + 70, top + 4], [300 + hw - 14, top + 26], [300 + hw, top + 70], [300 + hw, y1]];
  p.poly(shape, cols[0], 9);
  p.clip(shape, () => { let k = 0; for (let y = top - 10; y < y1; y += 104) for (let x = 300 - hw; x < 300 + hw; x += 82) { p.g.fillStyle = cols[(k++ * 3 + Math.floor(y / 104)) % cols.length]; p.g.fillRect(x, y, 82, 104); }
    p.g.fillStyle = "#f6f3ea"; p.g.fillRect(300 - hw, top - 10, 2 * hw, 44); // the turned-down sheet
    p.g.strokeStyle = "rgba(255,255,255,0.6)"; p.g.setLineDash([12, 10]); p.g.lineWidth = 4; for (let y = top + 136; y < y1; y += 104) { p.g.beginPath(); p.g.moveTo(300 - hw, y); p.g.lineTo(300 + hw, y); p.g.stroke(); } p.g.setLineDash([]); });
  p.stroke([[300 - hw + 4, top + 34], [300 + hw - 4, top + 34]], 5);
  p.poly(shape, null, 9);
};
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1, quilt: string[] | null = null): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key: key + (quilt ? "|quilt" : ""), x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => { if (view.side) bodySide(p, who.o, s2); else { bodyFront(p, who.o, f2); if (quilt) quiltOver(p, quilt); } },
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
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


export type Line3 = { a: V3; b: V3 };
export type Stage = { places: Place[]; fx: FxPlace[]; lines: Line3[] };
// ---------------- the cast (all invented, ordinary people) ----------------
const W0 = (jacket: string, pants: string, skin: string, extra: Partial<Outfit> = {}): Outfit => ({ jacket, pants, boots: "#2b2018", hat: "cap", cap: "#5a4a3a", skin, plain: true, ...extra });
const C = {
  worker: { i: 3, o: W0("#6a5a4a", "#4a4038", "#f0c8a0", { cap: "#7a6a52", moustache: "#5a3b2a", tie: "#c0392b" }), okey: "worker" },          // at the clockmaker's window
  sleeper: { i: 7, o: { jacket: "#f4f1ea", pants: "#e8e2d6", boots: "#f0c8a0", hat: "beanie", cap: "#f4f1ea", skin: "#f5c9a0", plain: true, stubble: "#8a6a4a" }, okey: "sleeper" }, // nightshirt + nightcap
  ku: { i: 12, o: W0("#2f3f5c", "#3a3438", "#e9c39f", { cap: "#4a4038", moustache: "#3a2a20", tie: "#c0392b", build: "adult" }), okey: "ku" },  // the knocker-upper
  ku70: { i: 14, o: W0("#5a5f6e", "#3a3d46", "#e9c39f", { cap: "#7a6a52", moustache: "#c8c8cc", tie: "#2a9d8f" }), okey: "ku70" },            // still knocking in the 1970s
  mary: { i: 16, o: { jacket: "#3a3d52", pants: "#2b2b33", boots: "#2b2018", hat: "bonnet", skin: "#ecd0b6", plain: true, dress: "#3a3d52", palla: "#8a4a6a", glasses: "#2b2b33" }, okey: "mary" },
  w1: { i: 20, o: W0("#7b2d2d", "#4a4038", "#c99067", { cap: "#3a3d46" }), okey: "w1" },
  w2: { i: 23, o: { jacket: "#f6f2e6", pants: "#4a4038", boots: "#2b2018", hat: "hair", hair: "#5a3b2a", skin: "#f0c8a0", plain: true, dress: "#2457c5", palla: "#c0392b" }, okey: "w2" },
  w3: { i: 26, o: W0("#3d6a4a", "#3a3438", "#f5c9a0", { cap: "#6a5a4a", stubble: "#5a3a2a" }), okey: "w3" },
  w4: { i: 30, o: { jacket: "#f6f2e6", pants: "#4a4038", boots: "#2b2018", hat: "hair", hair: "#c2562b", skin: "#f5c9a0", plain: true, dress: "#7b5ac9", palla: "#e9c46a" }, okey: "w4" },
  late: { i: 33, o: W0("#c0663a", "#3a3438", "#e9c39f", { cap: "#2457c5", tie: "#f2c12e" }), okey: "late" },
  foreman: { i: 36, o: { jacket: "#1d1f26", pants: "#3a3d46", boots: "#1d1f26", hat: "tophat", skin: "#f0c8a0", moustache: "#5a3b2a", lapels: true, tie: "#c0392b", build: "stout" }, okey: "foreman" },
  nA: { i: 39, o: { jacket: "#f4f1ea", pants: "#e8e2d6", boots: "#f0c8a0", hat: "beanie", cap: "#c0392b", skin: "#c99067", plain: true, beard: "#2a201a" }, okey: "nA" },
  nB: { i: 42, o: { jacket: "#f6f2e6", pants: "#e8e2d6", boots: "#f0c8a0", hat: "hair", hair: "#d8d8dc", skin: "#ecd0b6", plain: true, dress: "#f4f1ea", palla: "#2a9d8f" }, okey: "nB" },
  disco: { i: 45, o: { jacket: "#e07a1f", pants: "#6a3d2a", boots: "#2b2018", hat: "hair", hair: "#2a201a", skin: "#b97d55", lapels: true, moustache: "#2a201a" }, okey: "disco" },
  guy: { i: 48, o: { jacket: "#5a5f6e", pants: "#2e3a52", boots: "#e8e8ee", hat: "hair", hair: "#3a2a20", skin: "#f5c9a0", hoodie: "#f4f1ea" }, okey: "guy" },
} satisfies Record<string, Who>;
/** one character: front card unless walking across the lens (side card); blinks; contact blob unless told not to */
type Act = {
  who: Who; p: V3; expr: Expr; t: number; mode?: FrontOpts["mode"]; prop?: Prop; wave?: number; look?: number; facing?: -1 | 0 | 1;
  tilt?: number; headTilt?: number; walk?: { dx: number; dz: number; phase: number }; blob?: boolean; blinkSeed?: number;
  seat?: number; roll?: number; quilt?: string[]; stroll?: number;
};
const END = TOTAL / FPS;
let CUR = 0; // shot being staged (acting tracks are per shot)
const put = (out: Stage, cam: CamInfo, a0: Act): Place => {
  let a = a0, pose: FrontOpts["pose"] = undefined, hop = 0, swaps: number[] = [];
  const tr = TRACKS[CUR]?.[a0.who.okey];
  const pr = PROPS[CUR], prop = pr && a0.who.okey in pr ? pr[a0.who.okey] : a0.prop;
  if (tr && !a0.walk) {
    const fade = clamp01(Math.min(a0.t, END - a0.t) / 0.4);
    const r = evalTrack(tr, a0.t, a0.who.i, fade);
    a = { ...a0, expr: r.expr ?? a0.expr, tilt: r.tilt, headTilt: r.headTilt, look: r.look ?? a0.look, wave: undefined };
    pose = r.pose; hop = r.hop; swaps = r.swaps;
  }
  const [x, y, z] = a.p;
  const blink = a.expr === "shock" || a.expr === "whistle" || a.t < 0.4 || a.t > END - 0.4 ? 0 : lidAt(a.t, a.blinkSeed ?? a.who.i, swaps);
  let view = { side: false, mirror: false, fs: 1 };
  if (a.walk) view = viewOf(cam, x, z, a.walk.dx, a.walk.dz);
  const fo: FrontOpts = { phase: a.walk?.phase ?? a.stroll ?? 0, expr: a.expr, mode: a.seat ? "sit" : a.mode ?? (a.walk || a.stroll !== undefined ? "stroll" : "stand"), look: a.look ?? 0, blink, prop: prop ?? null,
    wave: a.wave, tilt: a.tilt ?? 0, headTilt: a.headTilt ?? 0, facing: a.facing ?? 0, lift: 50, pose, seatH: a.seat ? a.seat / SU : undefined };
  const so: SideOpts = { phase: a.walk?.phase ?? 0, expr: a.expr, mode: "march", blink, stomp: 0.65, stride: view.fs * 0.8 };
  const pl = person(cam, a.who, x, y + hop, z, view, fo, so, 1, a.quilt ?? null);
  if (a.roll) { pl.roll = a.roll; pl.yaw = 0; pl.mirror = false; }
  out.places.push(pl);
  if (a.blob !== false) blob(out, x, y, z, 1, hop > 0.02 ? Math.max(0.55, 1 - hop * 2.5) : 1);
  return pl;
};
/** world position of a canvas point of a placed front card (the card faces the camera; mirror and scale applied) */
const scratch = (() => { const c = document.createElement("canvas"); c.width = 8; c.height = 8; return new Pen(c.getContext("2d")!); })();
const ANC = new Map<string, typeof ANCHOR>();
const anchorsOf = (pl: Place) => {
  let a = ANC.get(pl.key);
  if (!a) { pl.draw(scratch); a = JSON.parse(JSON.stringify(ANCHOR)) as typeof ANCHOR; ANC.set(pl.key, a); if (ANC.size > 4000) ANC.clear(); }
  return a;
};
const toWorld = (cam: CamInfo, pl: Place, c: [number, number]): V3 => {
  const yaw = pl.yaw ?? Math.atan2(cam.pos.x - pl.x, cam.pos.z - pl.z), s = pl.scale ?? 1, X = (c[0] - 300) * SU * s * (pl.mirror ? -1 : 1), Y = (975 - c[1]) * SU * s;
  return [pl.x + X * Math.cos(yaw), pl.y + Y, pl.z - X * Math.sin(yaw)];
};
const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// ---------------- effect cards ----------------
const penny = (p: Pen) => { p.ell(128, 128, 100, 100, "#c87a3a", 10); p.ell(128, 128, 70, 70, null, 6); p.ell(108, 108, 18, 12, "#e8a868", 0); };
const pea = (p: Pen) => { p.ell(64, 64, 44, 44, "#9ac44a", 7); p.ell(52, 50, 14, 10, "#d8f08a", 0); };
const zee = (k: number) => (p: Pen) => { const s = 0.8 + k * 0.2; p.stroke([[60, 60], [196, 60], [60, 196], [196, 196]].map(([x, y]) => [128 + (x - 128) * s, 128 + (y - 128) * s] as [number, number]), 22, "#f4f1ea"); };
const zeeInk = (k: number) => (p: Pen) => { const s = 0.8 + k * 0.2; const pts = [[60, 60], [196, 60], [60, 196], [196, 196]].map(([x, y]) => [128 + (x - 128) * s, 128 + (y - 128) * s] as [number, number]); p.stroke(pts, 34, INK); p.stroke(pts, 20, "#f4f1ea"); };
const ringFx = (p: Pen) => { for (const r of [70, 110]) for (const s2 of [-1, 1]) p.arc(128 + s2 * 10, 128, r, r, s2 > 0 ? -50 : 130, s2 > 0 ? 50 : 230, 10); };
const q2 = (v: number, n = 24) => Math.round(v * n) / n;
/** coins fluttering up and away from (x, y, z) (seconds since t0) */
const coins = (out: Stage, t: number, t0: number, x: number, y: number, z: number, n: number) => {
  for (let i = 0; i < n; i++) {
    const u = clamp01((t - t0 - i * 0.08) / 1.1); if (u <= 0 || u >= 1) continue;
    const a = hh(i, 2) * Math.PI * 2, r = 0.25 + u * 1.2, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r * 0.5, by = y + 0.2 + u * 1.3 - u * u * 0.6;
    out.fx.push({ key: "penny", cw: 256, ch: 256, draw: penny, x: bx, y: by, z: bz, w: 0.16, h: 0.16 * (0.4 + 0.6 * Math.abs(Math.cos((t + i) * 7))), rot: q2(Math.sin((t + i) * 6) * 0.5, 12) });
  }
};
/** Zzz rising from a sleeper's head */
const zzz = (out: Stage, t: number, h: V3) => {
  for (let k = 0; k < 3; k++) { const u = ((t * 0.55 + k / 3) % 1);
    out.fx.push({ key: "zee" + k, cw: 256, ch: 256, draw: zeeInk(k), x: h[0] + 0.15 + u * 0.35, y: h[1] + 0.25 + u * 0.55, z: h[2] + 0.05, w: 0.14 + 0.1 * u, h: 0.14 + 0.1 * u, rot: q2(0.25 * Math.sin(u * 4), 12) }); }
};
/** a tap burst where the pole tip meets the glass (3 frames from each contact) */
const tapBurst = (out: Stage, t: number, tip: V3) => {
  const ph = (t * 2.6) % 1; if (ph < 0.5 || ph > 0.64) return;
  const u = (ph - 0.5) / 0.14; out.fx.push({ key: "tap" + Math.round(u * 4), cw: 512, ch: 512, draw: (p) => fxBurst(p, Math.round(u * 4) / 4, "#fff3b0", 8, 30, 170), x: tip[0], y: tip[1], z: tip[2] + 0.04, w: 0.32, h: 0.32 });
};

// ---------------- staging per shot ----------------
const A = (s: SetName, p: V3): V3 => at(s, p[0], p[1], p[2]);
const QUILT = ["#c0392b", "#2457c5", "#e9c46a", "#1f8a70", "#f4f1ea"], QUILT_M = ["#2457c5", "#3d6ab5", "#2457c5", "#5a7ac5"], QUILT_A = ["#7b2d8e", "#e9c46a", "#f4f1ea", "#2a9d8f", "#d9822b"];
/** the hero window's pole tip on the glass (lower half), drawn back by the tap */
const tipAt = (s: SetName, t: number, tapping: boolean): V3 => A(s, [WX + 0.12, WY - 0.3, WZ + 0.03 + (tapping ? 0.07 * tapAt(t) : 0)]);
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], lines: [] };
  const S = SHOTS[id - 1];
  CUR = id;
  if (cam.sun) setLight(cam.sun, S.light === "golden" ? "golden" : "day");
  const set = S.set, Q = (p: V3) => A(set, p);
  /** the knocker-upper with his pole: "up" (tip to the hero window), "carry" (upright), "lean" (against the wall) */
  const knocker = (who: Who, p: V3, expr: Expr, mode: "up" | "carry" | "lean" | "none", tapping: boolean, extra: Partial<Act> = {}) => {
    const pl = put(out, cam, { who, p: Q(p), t, expr, facing: -1, ...extra });
    if (mode === "none") return pl;
    if (mode === "lean") { out.lines.push({ a: Q([p[0] + 0.55, PH, FZ + 0.14]), b: Q([p[0] + 0.7, 3.0, FZ + 0.03]) }); return pl; }
    const an = anchorsOf(pl), h = toWorld(cam, pl, an.l);
    if (mode === "carry") { out.lines.push({ a: [h[0], h[1] - 0.9, h[2]], b: [h[0] + 0.05, h[1] + 2.1, h[2]] }); return pl; }
    const tip = tipAt(set, t, tapping), d = norm([h[0] - tip[0], h[1] - tip[1], h[2] - tip[2]]);
    out.lines.push({ a: [h[0] + d[0] * 0.5, h[1] + d[1] * 0.5, h[2] + d[2] * 0.5], b: tip });
    if (tapping) tapBurst(out, t, tip);
    return pl;
  };
  switch (set) {
    case "shop": {
      if (id !== 30) put(out, cam, { who: C.worker, p: Q(P.worker), t, expr: "nervous", facing: -1, look: -0.6 });
      break;
    }
    case "bed": case "attic": case "modern": {
      // in bed: an upright card whose head rests on the pillow, the body hidden under the quilt hump (world.ts)
      const lying = set !== "modern" || id === 34;
      if (lying) {
        const who = set === "bed" ? C.sleeper : set === "attic" ? { ...C.ku, okey: "kuSleep", o: { ...C.ku.o, hat: "beanie", cap: "#e9c46a", jacket: "#f4f1ea", tie: undefined } } : C.guy;
        const expr: Expr = set === "modern" ? "pained" : id === 15 && t > 21.45 ? "pained" : "whistle";
        put(out, cam, { who, p: Q([HEADX, HEADY - 1.44, BZ - 0.04]), t, expr, blob: false, headTilt: set === "modern" ? 0 : 8 });
        if (set !== "modern" && (id !== 15 || t < 21.4)) zzz(out, t, Q([HEADX, HEADY, BZ]));
        if (set === "modern") { const ck = Q([-2.18, 1.38, BZ + 0.25]); if (t > 46.0) out.fx.push({ key: "ring", cw: 256, ch: 256, draw: ringFx, x: ck[0], y: ck[1], z: ck[2] + 0.05, w: 0.42 + 0.04 * Math.sin(t * 40), h: 0.42 }); }
      } else put(out, cam, { who: C.guy, p: Q([-0.75, 0.0, BZ + 0.05]), t, expr: "neutral", seat: BY + 0.05, blob: false });
      break;
    }
    case "street": {
      if (id === 4) { const x = walkX(4, t), z = lerp(-5.2, KU[2], ramp(t, 5.62, 6.7)); knocker(C.ku, [x, PH, z], "neutral", "carry", false, { stroll: x * 0.55 }); }
      else if (id === 13) { const x = walkX(13, t); knocker(C.ku, [x, PH, -5.2], "neutral", "carry", false, { stroll: x * 0.55 }); }
      else if (id === 31) { const x = walkX(31, t); knocker(C.ku, [x, PH, -5.2], "sad", "carry", false, { stroll: x * 0.55 }); }
      else if (id === 9) { /* aerial: nobody */ }
      else {
        const tapping = [5, 14, 28].includes(id) || (id === 17 && t < 23.9);
        const mode = id === 16 ? "lean" : "up";
        knocker(C.ku, KU, "neutral", mode, tapping);
        if (id === 17 && t > 23.6) { const rise = ramp(t, 23.6, 24.0); put(out, cam, { who: C.sleeper, p: Q([WX, 3.0 - 0.8 * (1 - rise), FZ - 0.5]), t, expr: "pained", blob: false }); }
        if (id === 25) { put(out, cam, { who: C.nA, p: Q([-0.85, PH + 0.16, FZ + 0.42]), t, expr: "nervous", facing: 1 }); put(out, cam, { who: C.nB, p: Q([3.25, PH + 0.16, FZ + 0.42]), t, expr: "stern", facing: -1 }); }
      }
      break;
    }
    case "seventies": {
      knocker(C.ku70, KU, "smile", "up", id === 32);
      if (id === 33 || t > 43.9) { const rise = id === 33 ? 1 : ramp(t, 43.9, 44.3); put(out, cam, { who: C.disco, p: Q([WX, 3.0 - 0.8 * (1 - rise), FZ - 0.5]), t, expr: "grin", blob: false }); }
      break;
    }
    case "london": {
      const mp: V3 = id === 18 ? [lerp(6.4, MARY[0], ramp(t, 25.18, 25.89)), 0, MARY[2]] : id === 20 ? [lerp(MARY[0] - 1.6, MARY[0] - 0.2, ramp(t, 26.6, 27.4)), 0, MARY[2] - 0.6] : MARY;
      const pl = put(out, cam, { who: C.mary, p: Q(mp), t, expr: "smile", facing: -1, prop: (id === 21 && t > 27.98) || id === 22 || id === 23 ? "peashooter" : null, stroll: id === 18 ? t * 4 : id === 20 && t < 27.4 ? t * 4 : undefined });
      // the peas: fired from the shooter's muzzle to the windows (shots 22-23)
      if (id === 22 || id === 23) {
        const an = anchorsOf(pl), m0 = toWorld(cam, pl, an.tip), tg: V3[] = [Q([WX + 0.1, WY - 0.1, WZ + 0.02]), Q([-1.0, WY, FZ + 0.02]), Q([-1.0, WY + 3, FZ + 0.02]), Q([1.0, WY + 3, FZ + 0.02])];
        const launches = id === 22 ? [29.85, 30.2, 30.55, 30.9] : [30.9, 31.25, 31.6, 31.95];
        launches.forEach((t0, i) => {
          const g = id === 22 ? tg[0] : tg[i % 4], o: V3 = id === 22 ? m0 : Q([MARY[0] + 0.3, 1.9, MARY[2]]), dt = t - t0, fl = 0.42;
          if (dt < 0) return;
          if (dt < fl) { const u = dt / fl; out.fx.push({ key: "pea", cw: 128, ch: 128, draw: pea, x: lerp(o[0], g[0], u), y: lerp(o[1], g[1], u) + Math.sin(u * Math.PI) * 0.5, z: lerp(o[2], g[2], u), w: 0.1, h: 0.1 }); }
          else if (dt < fl + 0.5) { const u = (dt - fl) / 0.5; out.fx.push({ key: "pea", cw: 128, ch: 128, draw: pea, x: g[0] + 0.25 * u, y: g[1] + 0.15 * u - 2.2 * u * u, z: g[2] + 0.3 * u, w: 0.1, h: 0.1 });
            if (u < 0.3) out.fx.push({ key: "ping" + Math.round(u * 10), cw: 512, ch: 512, draw: (p) => fxBurst(p, Math.round(u * 10) / 3, "#fff3b0", 8, 30, 150), x: g[0], y: g[1], z: g[2] + 0.05, w: 0.36, h: 0.36 }); }
        });
      }
      break;
    }
    case "gate": {
      if (id === 10) { // workers stream into the gate
        const ws = [C.w1, C.w2, C.w3, C.w4, C.late];
        ws.forEach((w, i) => { const u = (t - 12.69) / 2.0 + 0.18 * i - 0.1; if (u < 0 || u > 1.05) return;
          const a: V3 = [7.5 + (i % 2) * 1.2, 0, 2.0 + (i % 3) * 0.6], b: V3 = [-0.4 + (i % 3) * 0.4, 0, -9.0], x = lerp(a[0], b[0], u), z = lerp(a[2], b[2], u);
          put(out, cam, { who: w, p: Q([x, 0, z]), t, expr: i % 2 ? "neutral" : "nervous", walk: { dx: b[0] - a[0], dz: b[2] - a[2], phase: t * 1.9 + i * 0.3 } }); });
        put(out, cam, { who: C.foreman, p: Q(P.foreman), t, expr: "stern", prop: "ledger", facing: 1 });
      } else if (id === 11) { // the latecomer runs for it as the gates close
        const u = clamp01((t - 14.68) / 0.85), x = lerp(7.0, P.late[0] + 0.3, u), z = lerp(0.5, P.late[2] - 0.1, u);
        if (u < 1) put(out, cam, { who: C.late, p: Q([x, 0, z]), t, expr: "shock", walk: { dx: P.late[0] - 7.0, dz: P.late[2] - 0.5, phase: t * 3.2 } });
        else put(out, cam, { who: C.late, p: Q([P.late[0] + 0.3, 0, P.late[2] - 0.1]), t, expr: "shock", facing: -1 });
        put(out, cam, { who: C.foreman, p: Q(P.foreman), t, expr: "smug", prop: "ledger", facing: 1 });
      } else {
        put(out, cam, { who: C.foreman, p: Q([-0.65, 0, -7.2]), t, expr: "stern", prop: "ledger", facing: 1 });
        const lpos: V3 = [0.6, 0, -6.7]; put(out, cam, { who: C.late, p: Q(lpos), t, expr: "sad", facing: -1 });
        if (t > 15.8) coins(out, t, 15.8, Q(lpos)[0], 1.0, Q(lpos)[2] + 0.1, 7);
      }
      break;
    }
  }
  return out;
};
void bodySide; void BX1; void SKIN; void smooth; void WW; void WH; void fxBurst; void zee; void QUILT;
export { FPS };
