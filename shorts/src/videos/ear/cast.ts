// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, townsfolk, fxBurst, fxSplash, fxStars, fxShadow, fxContact, fxJar, fxEar, fxPaper, fxGlow, fxSmoke, INK, SKIN,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, BRIT, SPAN, WAR_DECK, JAR1, REB_DECK, GC, STACK, STACK_TOP, QUAY_Y, LX, PX, TABLE, TABLE_TOP,
  SX, MX, CASE, PED, PED_TOP, JENKINS2, GUARD2, JENKINS3, JENKINS4, PM, HISTORIAN, FIRE, SWING0, STRIKE, POP, ROAR, WON, PAPERS, LAST,
} from "./story";
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
let LNAME: "day" | "golden" | "night" = "day";
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
const CONTACT: Record<"day" | "golden" | "night", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.3, 0.32, 0.45] };
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

// ---------------- the cast of the ear short ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const COATS = ["#2f4f8a", "#6b2f3a", "#3f6a4a", "#7a5a32", "#4a3f6e", "#8a4a2e", "#2f5f6a", "#5a3b52"];
const SKN = [SKIN, "#f5c9a0", "#ecd0b6", "#e2b58e"];
export const CAST = {
  jenkins: { jacket: "#2f4f8a", pants: "#ece4d2", boots: INK, hat: "tricorn", cap: "#2a2630", trim: "#e8c45a", buttons: "#e8c45a", skin: "#f3cfa8" } as Outfit,
  jenkinsB: { jacket: "#2f4f8a", pants: "#ece4d2", boots: INK, hat: "tricorn", cap: "#2a2630", trim: "#e8c45a", buttons: "#e8c45a", skin: "#f3cfa8", bandage: true } as Outfit,
  guard: { jacket: "#c9a03a", pants: "#3a3442", boots: INK, hat: "tricorn", cap: "#1f1c24", cockade: "#c0353a", sash: "#c0353a", moustache: "#2a1d18", sword: true, skin: "#e2b38a", buttons: "#f3efe2" } as Outfit,
  guardNight: { jacket: "#c9a03a", pants: "#3a3442", boots: INK, hat: "tricorn", cap: "#1f1c24", cockade: "#c0353a", moustache: "#2a1d18", skin: "#e2b38a", buttons: "#f3efe2" } as Outfit,
  pm: { jacket: "#6b2f3a", pants: "#2f2a36", boots: INK, hat: "wig", hair: "#ece8df", sash: "#3a6fc2", buttons: "#e8c45a", build: "stout", skin: "#f6cfb0" } as Outfit,
  historian: { jacket: "#2b2a33", pants: "#3b3f52", boots: INK, hat: "hair", hair: "#8d8a86", beard: "#a09a90", glasses: true, buttons: "#c9ccd2", skin: SKIN } as Outfit,
  mp: (v: number): Outfit => ({ jacket: COATS[v % 8], pants: "#2f2a36", boots: INK, hat: v % 3 === 0 ? "wig_tricorn" : "wig", cap: "#2a2630",
    hair: ["#ece8df", "#d9d4cc", "#c9c2b8"][v % 3], buttons: "#e8c45a", skin: SKN[v % 4], build: v % 4 === 1 ? "stout" : "adult", moustache: undefined }),
  smuggler: (v: number): Outfit => ({ jacket: ["#3a4a5e", "#5a4636", "#3d5242", "#4e3c58"][v % 4], pants: "#2c2a30", boots: "#3a2a20", hat: "knit",
    cap: ["#b8443a", "#33507a", "#6a6a6a", "#9a6a2a"][v % 4], skin: SKN[(v + 1) % 4], moustache: v % 2 ? "#3a2a20" : undefined }),
  gunner: (v: number): Outfit => ({ jacket: "#ece6d8", pants: "#3a4a6e", boots: INK, hat: "knit", cap: ["#b8443a", "#33507a"][v % 2], skin: SKN[v % 4] }),
  citizen: (v: number): Outfit => {
    const o = townsfolk(v);
    return o.hat === "tophat" ? { ...o, hat: "tricorn", cap: "#2e2a36" } : o;
  },
  visitor: (v: number): Outfit => townsfolk(v + 1),
};

type Who2 = { i: number; o: Outfit; okey: string };
const front0 = { side: false, mirror: false };
/** one standing / sitting front-view character with a contact blob */
const put = (cam: CamInfo, out: Stage, who: Who2, x: number, y: number, z: number, fo: FrontOpts, t: number, opts: { blob?: boolean; scale?: number } = {}) => {
  const fo2: FrontOpts = { blink: lidAt(t, who.i), ...fo };
  out.places.push(person(cam, who, x, y, z, front0, fo2, {}, opts.scale ?? 1));
  if (opts.blob !== false) blob(out, x, y, z, opts.scale ?? 1);
};
/** someone walking along +-x past the lens (side view, planted feet), speed m/s */
const walker = (cam: CamInfo, out: Stage, who: Who2, x: number, y: number, z: number, dir: number, t: number, expr: Expr, speed = 1.2) => {
  const phase = q(((t * speed) / 1.4 + hh(who.i, 5)) % 1, 120);
  const view = viewOf(cam, x, z, dir, 0);
  const fo: FrontOpts = { mode: "stroll", phase, expr, blink: lidAt(t, who.i) };
  const so: SideOpts = { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs, blink: lidAt(t, who.i) };
  out.places.push(person(cam, who, x, y, z, view, fo, so));
  blob(out, x, y, z);
};
const jarFx = (out: Stage, x: number, yBase: number, z: number, wob = 0, s = 1) =>
  out.fx.push({ key: `jar${q(wob, 20)}`, cw: 300, ch: 400, draw: (p) => fxJar(p, q(wob, 20)), x, y: yBase + 0.235 * s, z, w: 0.36 * s, h: 0.48 * s });
const glow = (out: Stage, x: number, y: number, z: number, r: number, col = "255,214,120") =>
  out.fx.push({ key: `glow${col}`, cw: 256, ch: 256, draw: (p) => fxGlow(p, col), x, y, z, w: r, h: r, soft: true });

// ---- shot 1: broadsides ----
const GUNS_B = [-9, -5, -1, 3, 7].map((x) => [BRIT[0] + x, 2.1, BRIT[2] + 4.3] as V3);
const GUNS_S = [-8, -4, 0, 4, 8].map((x) => [SPAN[0] + x, 2.1, SPAN[2] - 4.0] as V3);
const broadside = (out: Stage, f: number, f0: number, guns: V3[], dz: number, seed: number) => {
  guns.forEach(([x, y, z], i) => {
    const g = f - f0 - i * 2; // ripple along the hull
    if (g >= 0 && g < 5) {
      const u = q(g / 5, 30);
      out.fx.push({ key: `mflash${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ffd27a", 10, 40, 230), x, y, z: z + dz * 0.6, w: 2.6, h: 2.6 });
    }
    if (g >= 0 && g < 75) {
      const u = q(g / 75, 40);
      out.fx.push({ key: `smoke${u}`, cw: 300, ch: 300, draw: (p) => fxSmoke(p, u), x: x + 1.2 * u, y: y + 0.4 + 3.5 * u, z: z + dz * (1 + 3 * u), w: 3 + 6 * u, h: 3 + 6 * u, soft: true });
    }
    const sg = g - 7;
    if (sg >= 0 && sg < 28) {
      const u = q(sg / 28, 30);
      out.fx.push({ key: `splash${u}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, u), x: x + (hh(i, seed) - 0.5) * 6, y: 1.5, z: (BRIT[2] + SPAN[2]) / 2 + (hh(i, seed + 1) - 0.5) * 14, w: 4.5, h: 4.5 });
    }
  });
};
const battle = (cam: CamInfo, t: number, f: number, out: Stage) => {
  broadside(out, f, FIRE[0], GUNS_B, 1, 1);
  broadside(out, f, FIRE[1], GUNS_S, -1, 3);
  broadside(out, f, FIRE[2], GUNS_B, 1, 5);
  for (let i = 0; i < 4; i++) {
    const x = BRIT[0] - 7 + i * 4.2;
    put(cam, out, { i: 300 + i, o: CAST.gunner(i), okey: `gun${i % 2}` }, x, WAR_DECK, BRIT[2] + 2.2 + (i % 2) * 0.5,
      { mode: "stand", expr: f > FIRE[0] - 2 ? (i % 2 ? "shock" : "grin") : "stern", pose: f > FIRE[0] && i % 2 === 0 ? "up" : undefined, k: q((t * 2) % 1, 20) }, t);
  }
  for (let i = 0; i < 3; i++) put(cam, out, { i: 320 + i, o: CAST.guardNight, okey: "sg" }, SPAN[0] - 5 + i * 5, WAR_DECK, SPAN[2] - 2.2, { mode: "stand", expr: "stern" }, t);
  if (f >= 100) jarFx(out, JAR1[0], JAR1[1], JAR1[2], f >= 127 ? 0.6 * Math.sin((f - 127) * 0.8) * Math.exp(-(f - 127) / 12) : 0);
};

// ---- shot 2: the ear comes off ----
const swordK = (f: number) => (f < SWING0 ? 0 : f < STRIKE - 3 ? 0 : clamp01((f - (STRIKE - 3)) / 3));
const rebecca = (cam: CamInfo, t: number, f: number, out: Stage) => {
  const hurt = f >= POP;
  const jExpr: Expr = f < STRIKE - 2 ? (f < 196 ? "grin" : "nervous") : f < POP + 8 ? "shock" : "pained";
  put(cam, out, { i: 1, o: hurt ? CAST.jenkinsB : CAST.jenkins, okey: hurt ? "jb" : "j" }, JENKINS2[0], JENKINS2[1], JENKINS2[2],
    { mode: "stand", expr: jExpr, pose: f >= POP + 6 ? "cover" : undefined, facing: -1, look: f >= 196 && f < POP ? -1 : 0, tilt: f >= POP && f < POP + 6 ? 6 : 0 }, t);
  const gk = swordK(f);
  put(cam, out, { i: 2, o: CAST.guard, okey: "g" }, GUARD2[0], GUARD2[1], GUARD2[2],
    { mode: "stand", expr: f < POP ? "stern" : "grin", pose: "sword", k: q(gk, 20), facing: 1, look: 1, tilt: f >= SWING0 && f < STRIKE - 3 ? -4 * smooth((f - SWING0) / 8) : gk * 5 }, t);
  for (let i = 0; i < 3; i++) put(cam, out, { i: 10 + i, o: CAST.guardNight, okey: "gb" }, GC[0] + 1 - i * 1.6, 2.6, GC[2] - 2 + i * 3, { mode: "stand", expr: i ? "grin" : "stern" }, t);
  for (let i = 0; i < 2; i++) put(cam, out, { i: 20 + i, o: CAST.gunner(i), okey: `rc${i}` }, -1.9 + i * 0.5, REB_DECK, 6.5 + i * 1.8, { mode: "stand", expr: f >= POP ? "shock" : "neutral" }, t);
  if (f >= POP && f < POP + 6) {
    const u = q((f - POP) / 6, 30);
    out.fx.push({ key: `pop${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#fff3b0", 8, 30, 200), x: JENKINS2[0] + 0.2, y: REB_DECK + 1.5, z: JENKINS2[2] - 0.3, w: 0.9, h: 0.9 });
  }
  if (f >= POP) {
    const s = (f - POP) / FPS, vx = -0.45, vy = 1.6, y0 = REB_DECK + 1.48, floor = REB_DECK + 0.07;
    const tl = (vy + Math.sqrt(vy * vy + 2 * 9.8 * (y0 - floor))) / 9.8, sc = Math.min(s, tl);
    const z = JENKINS2[2] - 0.3 + vx * sc, y = y0 + vy * sc - 4.9 * sc * sc;
    out.fx.push({ key: "ear", cw: 200, ch: 220, draw: fxEar, x: JENKINS2[0] + 0.25 + 0.6 * sc, y, z, w: 0.17, h: 0.19, rot: s < tl ? s * 14 : 1.4 });
  }
  if (f >= POP + 6 && f < POP + 50) {
    const u = q(((f - POP) / 30) % 1, 30);
    out.fx.push({ key: `stars${u}`, cw: 420, ch: 210, draw: (p) => fxStars(p, u), x: JENKINS2[0], y: REB_DECK + 2.05, z: JENKINS2[2], w: 0.7, h: 0.35 });
  }
};

// ---- shot 3: nobody cared ----
const street = (cam: CamInfo, t: number, f: number, out: Stage) => {
  put(cam, out, { i: 1, o: CAST.jenkinsB, okey: "jb" }, JENKINS3[0], 0, JENKINS3[2], { mode: "stand", expr: f < 314 ? "smile" : "nervous", pose: "offer", facing: -1, look: f < 314 ? 0 : -1 }, t);
  const W: [number, number, number, Expr][] = [[8.2, 1, 1.15, "neutral"], [11.6, -1, 1.0, "smile_closed"], [13.4, 1, 1.3, "neutral"], [9.4, -1, 0.9, "stern"], [15, 1, 1.1, "neutral"]];
  W.forEach(([z, dir, sp, ex], i) => {
    const x = LX + 0.3 - dir * (1.1 + 0.5 * i) + dir * sp * (t - 300 / FPS);
    walker(cam, out, { i: 40 + i, o: CAST.citizen(i), okey: `c${i}` }, x, 0, z, dir, t, ex, sp);
  });
};

// ---- shots 4-6: the Commons ----
type Seat = { x: number; y: number; z: number; side: number; row: number; i: number };
const SEATS: Seat[] = (() => {
  const out: Seat[] = [];
  let i = 0;
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let k = 0; k < 15; k++) {
    if (hh(k + row * 20, side + 7) < 0.18) continue;
    out.push({ x: PX + side * (2.95 + row * 1.1) + (hh(k, row) - 0.5) * 0.12, y: 0.45 * (row + 1), z: -8.2 + k * 1.15 + (hh(k, row + 9) - 0.5) * 0.25, side, row, i: i++ });
  }
  return out;
})();
const mpWho = (s: Seat): Who2 => ({ i: 100 + s.i, o: CAST.mp(s.i), okey: `mp${s.i % 8}` });
const commons = (id: number, cam: CamInfo, t: number, f: number, out: Stage) => {
  const roar = f >= ROAR[0] - 2 && id === 4;
  for (const s of SEATS) {
    const stand = roar && (s.side < 0 || hh(s.i, 4) < 0.6);
    const cheer = stand || (id === 5 && f < 490 && hh(s.i, 6) < 0.25);
    const hop = stand ? Math.max(0, Math.sin(t * 9 + s.i * 1.3)) * 0.12 : 0;
    const ex: Expr = cheer ? (["laugh", "shock", "grin", "laugh"] as Expr[])[s.i % 4] : id === 6 ? "neutral" : (["neutral", "stern", "smile", "neutral"] as Expr[])[s.i % 4];
    put(cam, out, mpWho(s), s.x, s.y + hop, s.z, { mode: stand ? "stand" : "sit", expr: ex, pose: stand ? "up" : undefined, k: q((t * 1.6 + hh(s.i, 2)) % 1, 16), facing: s.side < 0 ? 1 : -1 }, t, { blob: !stand || hop < 0.02 });
  }
  if (id === 4) {
    put(cam, out, { i: 1, o: CAST.jenkinsB, okey: "jb" }, JENKINS4[0], 0, JENKINS4[2], { mode: "stand", expr: f < 361 ? "stern" : "grin", pose: f >= 350 ? "cover" : undefined }, t);
    if (roar) for (let n = 0; n < 7; n++) {
      const u = ((t - ROAR[0] / FPS) * 0.7 + n * 0.13) % 1, x = PX - 3.8 + n * 0.5, z = -3 + n * 1.3;
      out.fx.push({ key: `paper${q(Math.cos(u * 14 + n), 10)}`, cw: 240, ch: 300, draw: (p) => fxPaper(p, q(Math.cos(u * 14 + n), 10)), x, y: 1.6 + 2.2 * u, z, w: 0.25, h: 0.31, rot: u * 6 + n });
    }
  }
  if (id === 5) {
    const shake = f >= 448 && f < 490 ? 7 * Math.sin(((f - 448) / 14) * Math.PI * 2) : 0;
    const shrug = q(smooth((f - 505) / 8), 20);
    put(cam, out, { i: 3, o: CAST.pm, okey: "pm" }, PM[0], PM[1], PM[2],
      { mode: "stand", expr: f < 490 ? "nervous" : f < WON ? "shock" : "neutral", headTilt: shake + (f >= WON ? -5 : 0), pose: f >= 505 ? "shrug" : undefined, k: shrug, facing: -1, look: f >= 490 && f < WON ? -1 : 0 }, t, { scale: 1.02 });
    if (f >= 490) for (let n = 0; n < 9; n++) {
      const surge = smooth((f - 493) / 19) * 0.9, x = PX - 1.9 + (n % 3) * 0.55 + surge, z = -2.4 + Math.floor(n / 3) * 1.0 + (hh(n, 2) - 0.5) * 0.3;
      const hop = Math.max(0, Math.sin(t * 9 + n)) * 0.1;
      put(cam, out, { i: 200 + n, o: CAST.mp(n + 3), okey: `mp${(n + 3) % 8}` }, x, hop, z, { mode: "stand", expr: n % 2 ? "laugh" : "grin", pose: "up", k: q((t * 1.6 + n * 0.3) % 1, 16) }, t);
    }
  }
  if (id === 6) jarFx(out, TABLE[0], TABLE_TOP, TABLE[2], f >= 569 ? 0.8 * Math.sin((f - 569) * 0.7) * Math.exp(-(f - 569) / 14) : 0);
};

// ---- shot 7: the night quay ----
const LAMPS: V3[] = [[5.2, QUAY_Y + 2.9, -207], [5.2, QUAY_Y + 2.9, -193], [15, QUAY_Y + 2.9, -186], [21, QUAY_Y + 2.9, -205]];
const dock = (cam: CamInfo, t: number, f: number, out: Stage) => {
  jarFx(out, STACK[0], STACK_TOP, STACK[2]);
  for (const [x, y, z] of LAMPS) glow(out, x, y, z, 2.2);
  for (let n = 0; n < 5; n++) {
    const sp = 0.75 + 0.1 * (n % 2), x = 18.5 - sp * (t - 684 / FPS) - n * 2.1, z = -203.2 - (n % 2) * 1.1;
    if (x < 3.8 || x > 20) continue;
    const phase = q(((t * sp) / 1.4 + n * 0.37) % 1, 120);
    put(cam, out, { i: 60 + n, o: CAST.smuggler(n), okey: `sm${n}` }, x, QUAY_Y, z, { mode: "stroll", phase, expr: n % 2 ? "nervous" : "grin", pose: "crate", look: -1 }, t);
  }
  const gx = 5.6, gz = -193.6;
  put(cam, out, { i: 70, o: CAST.guardNight, okey: "gn" }, gx, QUAY_Y, gz, { mode: "stand", expr: "stern", pose: "lantern", look: 1, facing: 1 }, t);
  glow(out, gx + 0.38, QUAY_Y + 0.95, gz - 0.05, 1.3);
};

// ---- shot 8: the historian ----
const study = (cam: CamInfo, t: number, f: number, out: Stage) => {
  put(cam, out, { i: 80, o: CAST.historian, okey: "h" }, HISTORIAN[0], 0, HISTORIAN[2],
    { mode: "stand", expr: f < 823 ? "smile" : "grin", pose: "quill", k: q(f >= 815 ? (f / 30) % 1 : 0.1, 30), facing: -1, look: f < 815 ? 0 : 1 }, t, { blob: false });
  glow(out, SX + 0.75, 1.31, 1.25, 0.9, "255,196,110");
};

// ---- shot 9: the museum ----
const museum = (cam: CamInfo, t: number, f: number, out: Stage) => {
  const pf = Math.max(0, f - PAPERS);
  for (let n = 0; n < 6; n++) {
    const x0 = CASE[0] - 0.55 + (n % 3) * 0.55, z0 = CASE[2] - 0.2 + Math.floor(n / 3) * 0.4, delay = n * 3, u = Math.max(0, pf - delay) / 40;
    if (u <= 0) out.fx.push({ key: "paperFlat", cw: 240, ch: 300, draw: (p) => fxPaper(p, 1), x: x0, y: 0.93, z: z0, w: 0.3, h: 0.37, flat: true, rot: 0.2 * n });
    else if (u < 1.6) {
      const flip = q(Math.cos(u * 9 + n), 10);
      out.fx.push({ key: `paper${flip}`, cw: 240, ch: 300, draw: (p) => fxPaper(p, flip), x: x0 + 2.2 * u + 0.4 * Math.sin(u * 5 + n), y: 0.95 + 2.6 * u - 0.3 * u * u, z: z0 + 1.2 * u, w: 0.3, h: 0.37, rot: u * 3 + n });
    }
  }
  put(cam, out, { i: 90, o: CAST.visitor(4), okey: "v4" }, CASE[0] + 1.3, 0, CASE[2] + 1.4, { mode: "stand", expr: f < PAPERS ? "neutral" : "shock", look: -1 }, t);
  jarFx(out, PED[0], PED_TOP, PED[2], f >= LAST - 3 ? 0.7 * Math.sin((f - LAST + 3) * 0.8) * Math.exp(-(f - LAST + 3) / 12) : 0);
  glow(out, PED[0], PED_TOP + 0.3, PED[2] + 0.05, 1.4, "255,236,190");
  const V: [number, number, Expr, boolean][] = [[-1.25, 1.0, "smile", true], [1.3, 0.9, "grin", false], [-0.6, 2.2, "smile_closed", false], [0.9, 2.3, "smile", true], [-1.9, 2.6, "grin", false]];
  V.forEach(([dx, dz, ex, pt], i) => put(cam, out, { i: 91 + i, o: CAST.visitor(i), okey: `v${i}` }, PED[0] + dx, 0, PED[2] + dz,
    { mode: "stand", expr: ex, pose: pt ? "point" : undefined, facing: dx < 0 ? 1 : -1, look: dx < 0 ? 1 : -1 }, t, { scale: i === 2 ? 0.75 : 1 }));
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = Math.round(t * FPS);
  LNAME = s.light;
  findSun(cam, SUN);
  if (s.place === "battle") battle(cam, t, f, out);
  else if (s.place === "rebecca") rebecca(cam, t, f, out);
  else if (s.place === "street") street(cam, t, f, out);
  else if (s.place === "parliament") commons(id, cam, t, f, out);
  else if (s.place === "dock") dock(cam, t, f, out);
  else if (s.place === "study") study(cam, t, f, out);
  else if (s.place === "museum") museum(cam, t, f, out);
  return out;
};
export { FPS, SX, MX };
