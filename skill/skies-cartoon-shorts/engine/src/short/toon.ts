// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build; glasses?: string; tie?: string;
  /** pizza short: goatee + jaw stubble colours, gaming headset, cap worn backwards, plain tee (no buttons), hoodie drawstrings */
  goatee?: string; stubble?: string; headset?: string; capBack?: boolean; plain?: boolean; hoodie?: string;
  /** vending short: full beard colour; drape = himation band across the chest */
  beard?: string; drape?: string;
  /** roman short: a Roman tunic (bare forearms + short sleeves, a waist cord, optional clavi stripes and hem trim), a toga
   *  (big diagonal fold with a coloured edge), an archaeologist's field shirt (collar + flap pockets), jacket lapels */
  tunic?: { clavi?: string; trim?: string; cord?: string }; toga?: string; safari?: boolean; lapels?: boolean; palla?: string;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "sad" | "holdlaugh" | "smug" | "starry";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral" | "star";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  sad: { eye: ["lid", "lid"], brow: [-6, 4], mouth: "frown" },
  holdlaugh: { eye: ["squeeze", "squeeze"], brow: [-5, -3], mouth: "wave" },
  smug: { eye: ["lid", "lid"], brow: [3, -3], mouth: "smirk" },
  starry: { eye: ["star", "star"], brow: [-5, -5], mouth: "grin" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  k === "star" ? "star" : lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    case "star": { // gold five-point star eyes (the "I'm brilliant" beat)
      const pts: P2[] = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? 5.2 : 12.5) * u; pts.push([x + Math.cos(a) * r, ey + Math.sin(a) * r]); }
      p.poly(pts, "#ffd23a", 2.4 * u); break;
    }
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

let FACE_X: { goatee?: string; stubble?: string; beard?: string } = {};
/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false, glasses?: string) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  if (FACE_X.beard) { // full beard: a wavy bib from cheek to cheek hanging below the chin, the mouth left open on it
    const B: P2[] = [];
    for (let i = 0; i <= 16; i++) { const a = rad(-12 + (i * 204) / 16), wv = 1 + 0.06 * Math.sin(i * 2.1);
      B.push([cx + 4 * u * facing + Math.cos(a) * 41 * u * wv, cy + 6 * u + Math.sin(a) * 46 * u * wv]); }
    for (let i = 0; i <= 8; i++) { const a = rad(192 - (i * 180) / 8); B.push([mx + Math.cos(a) * 19 * u, my - 3 * u + Math.sin(a) * 6 * u]); }
    p.poly(B, FACE_X.beard, 3 * u);
    for (const [dx, dy] of [[-16, 30], [0, 38], [16, 30], [-24, 18], [24, 18]]) p.arc(cx + dx * u, cy + dy * u, 6 * u, 4 * u, 20, 160, 1.4 * u, mix(FACE_X.beard, "#7a7a84", 0.5));
  }
  mouth(p, F.mouth, mx, my, u);
  if (FACE_X.stubble) for (let k = 0; k < 16; k++) { const a = rad(28 + k * 7.8), r0 = 39 * u; p.ell(cx + Math.cos(a) * r0 * (k % 2 ? 0.93 : 1), cy + 6 * u + Math.sin(a) * r0 * 0.8, 1.1 * u, 1.1 * u, FACE_X.stubble, 0); }
  if (FACE_X.goatee) {
    const gx = mx, gy = my + 7 * u;
    p.poly([[gx - 8 * u, gy - 1 * u], [gx + 8 * u, gy - 1 * u], [gx + 6 * u, gy + 10 * u], [gx, gy + 13 * u], [gx - 6 * u, gy + 10 * u]], FACE_X.goatee, 0);
    p.ell(gx, gy + 8 * u, 3.5 * u, 3 * u, mix(FACE_X.goatee, "#b8b8b8", 0.55), 0); // the grey patch on the chin
    for (const s of [-1, 1]) taper(p, [mx + s * 1.5 * u, cy + 13 * u], [mx + s * 12 * u, cy + 16 * u], 3.2 * u, 1.4 * u, FACE_X.goatee);
  }
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (glasses) {
    for (const side of [-1, 1]) p.ell(fx + side * ex, ey, 10.5 * u, 9.5 * u, null, 2.8 * u);
    p.stroke([[fx - ex + 10.5 * u, ey - u], [fx + ex - 10.5 * u, ey - u]], 2.6 * u, glasses);
  }
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false, glasses?: string) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (glasses) { p.ell(ex, ey, 10 * u, 9 * u, null, 2.8 * u); p.stroke([[ex - 10 * u, ey - u], [ex - 22 * u, ey - 3 * u]], 2.4 * u, glasses); }
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hair!;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else if (o.capBack) { // worn backwards: the strap gap + button at the front, brim hidden behind
        const [px, py] = R([[cx, cut - 3 * u]])[0];
        p.arc(px, py, 10 * u, 7 * u, 180, 360, 2.4 * u, shade(col, 0.6));
        const [bx2, by2] = R([[cx, crown + 4 * u]])[0]; p.ell(bx2, by2, 3 * u, 2.4 * u, shade(col, 0.75), 1.2 * u);
      } else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "peaked") {
    const yb = crown + 0.26 * HH, ht = 0.3 * HH, wb = 0.42 * W, wt = 0.5 * W, col = o.cap ?? "#1f2a44";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx - wt * 0.8, yb - ht - 0.05 * HH], [cx + wt * 0.8, yb - ht - 0.05 * HH], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.07 * HH], [cx + wt + 4 * u, yb - 0.07 * HH]]), o.belt ?? "#151a2b", 0.11 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) p.poly(R([[cx + 30 * u, yb - 1 * u], [cx + 60 * u, yb + 9 * u], [cx + 28 * u, yb + 6 * u]]), "#121521", 2.5 * u);
    else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 2 * u]])[0];
      p.ell(px, py, 36 * u, 0.05 * HH, "#121521", 2.5 * u, 0, 180, deg);
      const [bx, by] = R([[cx + 2 * u * facing, yb - 0.55 * ht]])[0];
      p.ell(bx, by, 9 * u, 5.5 * u, "#e8c45a", 1.8 * u, 0, 360, deg);
      p.dot(bx, by, 2.2 * u, "#c0353a");
    }
  } else if (o.hat === "beanie") {
    const cut = crown + 0.36 * HH, col = o.cap ?? "#2f3b5c";
    const pts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const t2 = Math.PI + (i / 20) * Math.PI; pts.push([cx + 1.04 * H.a * Math.cos(t2), cut + (cut - crown + 0.04 * HH) * Math.sin(t2)]); }
    const body = R(pts);
    p.shadedFill(body, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.clip(body, () => { for (let k = -8; k <= 8; k++) p.stroke(R([[cx + k * 11 * u, cut - 0.02 * HH], [cx + k * 12 * u, crown - 0.02 * HH]]), 1.2 * u, mul(col, [0.8, 0.8, 0.85])); });
    p.poly(body, null, ow);
    p.poly(R([[cx - 1.06 * H.a, cut - 0.09 * HH], [cx + 1.06 * H.a, cut - 0.09 * HH], [cx + 1.06 * H.a, cut + 0.02 * HH], [cx - 1.06 * H.a, cut + 0.02 * HH]]), shade(col, 0.85), ow * 0.8);
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | ["hammer", number] | "key" | "binos" | "card" | "teacup" | "paddle" | "binosEyes" | "rope"
  | "envelope" | "dvd" | "vhs" | "cash" | "remote" | "pizzabox" | "slice" | "phone" | "coin" | "playmoney"
  | "cup" | "cupFull" | "bucket" | "drachma" | "scroll" | "chips" | "sponge" | "shard" | "brush" | "roll"
  | "peashooter" | "sixpence" | "ledger" | "alarm" | "lantern";
/** knocker-upper short: canvas points of the last drawn front card (hands after the torso rotation, mouth, head centre,
 *  chin, pea-shooter muzzle) so world.ts can attach 3D props (the long pole, the flying peas) to the drawing */
export const ANCHOR = { l: [0, 0] as P2, r: [0, 0] as P2, mouth: [0, 0] as P2, head: [0, 0] as P2, chin: [0, 0] as P2, tip: [0, 0] as P2, hb: 0 };

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

/** one posable arm, front view. a = upper-arm angle in degrees from hanging straight down (90 = straight out to that side,
 *  180 = straight up, negative = across the body); b = elbow bend added on top (the forearm angle is a + b, same convention).
 *  pt = pointing finger, open = open palm, front = force drawing in front of the torso (auto when the hand is over it) */
export type ArmPose = { a?: number; b?: number; h?: [number, number]; front?: boolean; pt?: boolean; open?: boolean };
/* h = hand target instead of angles: [x, y] in head-heights, x from the body midline (positive = this arm's own side,
   negative = across the body), y from the chin (positive = down: chest .3, belly .65, hip .9; face -.5, crown -1).
   The elbow is solved by 2-bone IK and always bends outward / down, like a person's. */
/** canvas-left arm (l) and canvas-right arm (r); a held prop goes in the right hand, lprop in the left */
export type Pose = { l?: ArmPose; r?: ArmPose; lprop?: Prop };

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number; pose?: Pose;
  /** sit on a seat this many design units above the soles (bench / toilet): shins straight down to the floor */
  seatH?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, facing = 0, seed = 1, pose, seatH } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - (seatH ?? 0.2 * HH) : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = o.tunic || o.toga ? mix(skin, INK, 0.18) : mix(o.jacket, INK, 0.5), footCol = o.boots;
  const sleeveCol = mix(o.jacket, INK, 0.22);
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      // on a bench: thighs run out to bent knees (spread, seen from the front), shins straight down to the floor
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = seatH ? [300 + side * 46 * u, hipY + 0.05 * HH] : [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * (seatH ? 50 : 44) * u, sole - 8 * u];
      if (seatH) { p.stroke([h, k], legW, legCol); p.stroke([k, f], legW, legCol); p.ell(k[0], k[1], legW * 0.75, legW * 0.75, legCol, 0); }
      else p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
    // the tunic hem draped over the lap (sells the seated pose head-on)
    if (seatH) p.poly([[300 - 34 * u, torsoBot - 0.06 * HH], [300 + 34 * u, torsoBot - 0.06 * HH], [300 + 50 * u, hipY + 0.02 * HH], [300 + 42 * u, hipY + 0.1 * HH], [300 - 42 * u, hipY + 0.1 * HH], [300 - 50 * u, hipY + 0.02 * HH]], o.hoodie ? o.pants : o.jacket, ow * 0.8);
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  type Arm = { pts: [P2, P2, P2]; front: boolean; ap?: ArmPose; hold?: Prop };
  const arms: Arm[] = [];
  const posed = !!pose && (!!pose.l || !!pose.r) && mode !== "fall";
  const armFrom = (side: number, ap: ArmPose, hold: Prop): Arm => {
    const S = sh(side), L1 = 0.47 * HH, L2 = 0.45 * HH;
    let E: P2, Hd: P2;
    if (ap.h) {
      // local frame: x outward from this shoulder, y down
      let tx = ap.h[0] * HH - (S[0] - tcx) * side, ty = ap.h[1] * HH - (S[1] - chin);
      let d = Math.hypot(tx, ty);
      const dMax = (L1 + L2) * 0.995, dMin = Math.abs(L1 - L2) + 0.05 * HH;
      if (d > dMax) { tx *= dMax / d; ty *= dMax / d; d = dMax; } else if (d < dMin) { const k = dMin / (d || 1); tx *= k; ty *= k; d = dMin; }
      const th = Math.atan2(ty, tx), al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const c1: P2 = [L1 * Math.cos(th + al), L1 * Math.sin(th + al)], c2: P2 = [L1 * Math.cos(th - al), L1 * Math.sin(th - al)];
      const e = c1[0] + 0.6 * c1[1] > c2[0] + 0.6 * c2[1] ? c1 : c2; // elbow out and down
      E = [S[0] + side * e[0], S[1] + e[1]]; Hd = [S[0] + side * tx, S[1] + ty];
    } else {
      const a1 = rad(ap.a ?? 0), a2 = rad((ap.a ?? 0) + (ap.b ?? 0));
      E = [S[0] + side * Math.sin(a1) * L1, S[1] + Math.cos(a1) * L1];
      Hd = [E[0] + side * Math.sin(a2) * L2, E[1] + Math.cos(a2) * L2];
    }
    const over = Math.abs(Hd[0] - tcx) < 0.98 * T.a && Hd[1] > chin - 0.15 * HH && Hd[1] < torsoBot + 0.05 * HH;
    return { pts: [S, E, Hd], front: ap.front ?? (over || !!hold), ap, hold };
  };
  if (posed) {
    // sitting: legs stay seated, arms follow the pose
    arms.push(pose!.l ? armFrom(-1, pose!.l, pose!.lprop ?? null) : { pts: mode === "sit" ? [sh(-1), [tcx - (1.1 * T.a + 6 * u), sh(-1)[1] + 0.4 * HH], [tcx - (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]] : hang(-1, -sw), front: false });
    arms.push(pose!.r ? armFrom(1, pose!.r, prop) : { pts: mode === "sit" ? [sh(1), [tcx + 1.1 * T.a + 6 * u, sh(1)[1] + 0.4 * HH], [tcx + 1.2 * T.a + 10 * u, torsoBot + 0.04 * HH]] : hang(1, sw), front: false });
  } else if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "paddle" || prop === "rope") {
      const S = sh(1), up = prop === "rope" ? 1.0 : 0.85;
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 8 * u, S[1] - 0.3 * HH * up], [tcx + 1.0 * T.a + 6 * u, S[1] - 0.78 * HH * up]], front: false });
    } else if (prop === "binosEyes") {
      for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.05 * T.a + 8 * u), sh(side)[1] + 0.25 * HH], [300 + side * 0.36 * W, chin - 0.62 * HH]], front: true });
    } else if (prop === "icecream" || prop === "key" || prop === "binos" || prop === "card" || prop === "teacup" || prop === "envelope" || prop === "dvd" || prop === "vhs" || prop === "cash" || prop === "remote" || prop === "pizzabox" || prop === "slice" || prop === "phone" || prop === "coin" || prop === "playmoney" || prop === "cup" || prop === "cupFull" || prop === "bucket" || prop === "drachma" || prop === "scroll" || prop === "chips" || prop === "sponge" || prop === "shard" || prop === "brush" || prop === "roll" || prop === "sixpence" || prop === "ledger" || prop === "alarm" || prop === "lantern") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  ANCHOR.l = p.P(arms[0].pts[2][0], arms[0].pts[2][1]); ANCHOR.r = p.P(arms[arms.length - 1].pts[2][0], arms[arms.length - 1].pts[2][1]);
  ANCHOR.chin = [300, chin]; ANCHOR.hb = H.b;
  const drawArm = (a: Arm, mitt = false) => {
    const [S, E, Hd] = a.pts, ap = a.ap;
    const v1x = E[0] - S[0], v1y = E[1] - S[1], v2x = Hd[0] - E[0], v2y = Hd[1] - E[1];
    const bend = Math.acos(clamp((v1x * v2x + v1y * v2y) / ((Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)) || 1), -1, 1));
    if (ap && bend > rad(35)) { // a real elbow: straight bones with a small round fillet
      const e0 = lerp2(S, E, 0.8), e1 = lerp2(E, Hd, 0.2);
      p.stroke([S, ...curve(e0, E, e1, 6), Hd], 5.2 * u, armCol);
    } else p.stroke(curve(S, E, Hd), 5.2 * u, armCol);
    if (o.tunic || o.toga) { const sl = lerp2(S, E, o.toga ? 0.75 : 0.5); p.stroke([S, sl], 8.6 * u, INK); p.stroke([S, sl], 6.4 * u, sleeveCol); } // short sleeve over the bare arm
    if (ap?.pt) { const dx = Hd[0] - E[0], dy = Hd[1] - E[1], l = Math.hypot(dx, dy) || 1; p.stroke([Hd, [Hd[0] + (dx / l) * 9 * u, Hd[1] + (dy / l) * 9 * u]], 2.8 * u, skin === SKIN ? "#f4cfa8" : mul(skin, [0.95, 0.95, 0.95])); }
    if (mitt) { // a hand on the face reads as a hand: skin mitten with an ink ring, not a dot
      const rx = (ap?.open ? 10.5 : 8.5) * u, ry = (ap?.open ? 12 : 8.5) * u;
      p.ell(Hd[0], Hd[1], rx, ry, skin, 2.4 * u);
      if (ap?.open) for (const k of [-1, 0, 1]) p.stroke([[Hd[0] + k * 3.6 * u, Hd[1] - ry + 3 * u], [Hd[0] + k * 3.6 * u, Hd[1] - ry * 0.25]], 1.3 * u);
    } else p.dot(Hd[0], Hd[1], (ap?.open ? 6.6 : 5.5) * u);
    if (a.hold && drawPropRef.f) drawPropRef.f(a.hold, Hd[0], Hd[1]);
  };
  const drawPropRef: { f: ((pr: Prop, hx: number, hy: number) => void) | null } = { f: null };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  if (prop === "paddle") { const [hx, hy] = arms[arms.length - 1].pts[2]; p.band([[hx, hy + 4 * u], [hx, hy - 26 * u]], "#8a5a34", 3.4 * u, 1.3 * u); p.ell(hx, hy - 40 * u, 15 * u, 15 * u, "#f4f1ea", 2.2 * u); p.stroke([[hx - 5 * u, hy - 44 * u], [hx + 5 * u, hy - 44 * u]], 2 * u); p.stroke([[hx - 5 * u, hy - 37 * u], [hx + 5 * u, hy - 37 * u]], 2 * u); p.dot(hx, hy, 5.5 * u); }
  if (prop === "rope") { const [hx, hy] = arms[arms.length - 1].pts[2]; p.dot(hx, hy, 5.5 * u); }
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress && !o.drape && !o.sash) {
    // a real dress: fitted bodice, belt at the waist, A-line skirt to mid-shin with a soft hem and two fold lines
    const waist = chin + 0.62 * HH, hemY = sole - 0.38 * HH, scx = 300 + 1.5 * u * facing;
    const ww = 0.6 * T.a, hw = 1.38 * T.a, N = 14, sk: P2[] = [];
    const side = (sg: number, k: number): P2 => { const x0 = scx + sg * ww, x1 = scx + sg * hw, bx = scx + sg * (0.5 * (ww + hw) + 0.1 * T.a); // bowed outward a touch
      return [(1 - k) * (1 - k) * x0 + 2 * k * (1 - k) * bx + k * k * x1, waist + k * (hemY - waist)]; };
    for (let i = 0; i <= N; i++) sk.push(side(-1, i / N));
    for (let i = 1; i < N; i++) { const q = i / N, x = scx - hw + 2 * hw * q; sk.push([x, hemY + 0.04 * HH * Math.sin(Math.PI * q) + 0.012 * HH * Math.sin(Math.PI * 3 * q)]); }
    for (let i = N; i >= 0; i--) sk.push(side(1, i / N));
    p.gradFill(sk, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.clip(sk, () => { for (const f of [-1, 1]) p.stroke([[scx + f * 0.28 * ww, waist + 0.12 * HH], [scx + f * 0.5 * hw, hemY + 0.03 * HH]], 1.5 * u, shade(o.dress!, 0.78)); });
    p.inkRing(sk, ow, thick);
    const Bo: Blob = { a: 0.74 * T.a, b: 0.5 * (waist + 0.04 * HH - (chin - 0.2 * HH)), nTop: 2.3, nBot: 3.2, egg: 0.06, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const bp = blobPts(tcx, waist + 0.04 * HH - Bo.b, Bo);
    p.gradFill(bp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.clip(bp, () => {
      p.ell(tcx, chin - 0.1 * HH, 0.5 * Bo.a, 0.2 * HH, o.jacket, 1.4 * u); // round white collar of the blouse underneath
      p.band([[tcx - 1.2 * Bo.a, waist - 0.04 * HH], [tcx + 1.2 * Bo.a, waist - 0.04 * HH]], shade(o.dress!, 0.62), 0.1 * HH, 1.4 * u);
    });
    p.inkRing(bp, ow, thick);
    if (o.palla) { // a Roman woman's palla: a shawl over one shoulder, across the bodice, its end hanging down the skirt
      const sh2: P2[] = [[tcx - 0.9 * Bo.a, chin - 0.08 * HH], [tcx - 0.25 * Bo.a, chin - 0.12 * HH], [tcx + 1.05 * Bo.a, waist - 0.02 * HH], [tcx + 1.2 * Bo.a, waist + 0.55 * HH], [tcx + 0.72 * Bo.a, waist + 0.6 * HH], [tcx + 0.62 * Bo.a, waist + 0.16 * HH], [tcx - 0.95 * Bo.a, chin + 0.2 * HH]];
      p.gradFill(sh2, o.palla, mul(o.palla, SH_CLOTH), light); p.inkRing(sh2, ow * 0.8, thick);
      for (const k of [0, 1]) p.stroke([[tcx - 0.5 * Bo.a + k * 0.5 * Bo.a, chin + 0.02 * HH + k * 0.06 * HH], [tcx + 0.5 * Bo.a + k * 0.4 * Bo.a, waist - 0.05 * HH + k * 0.1 * HH]], 1.4 * u, mul(o.palla, [0.78, 0.78, 0.8]));
    }
  } else if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    if (o.drape) p.clip(dp, () => p.band([[300 - 0.62 * W, chin - 0.05 * HH], [300 + 0.5 * W, sole - 0.62 * HH]], o.drape!, 0.2 * HH, 1.6 * u));
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      if (o.drape) p.band([[tcx - 1.1 * T.a, chin - 0.08 * HH], [tcx + 1.1 * T.a, torsoBot + 0.02 * HH]], o.drape, 0.2 * HH, 1.6 * u);
      const waist = chin + 0.62 * HH;
      if (o.tunic) {
        const tu = o.tunic, dk = mul(o.jacket, [0.82, 0.82, 0.82]);
        if (tu.clavi) for (const s3 of [-1, 1]) p.band([[tcx + s3 * 0.36 * T.a, chin - 0.2 * HH], [tcx + s3 * 0.4 * T.a, torsoBot + 0.05 * HH]], tu.clavi, 0.1 * T.a, 0.6 * u);
        // soft folds bloused under the cord and falling to the hem
        for (const s3 of [-1, 0, 1]) p.stroke([[tcx + s3 * 0.34 * T.a, waist + 0.06 * HH], [tcx + s3 * 0.42 * T.a + 2 * u, torsoBot - 0.04 * HH]], 1.6 * u, dk);
        for (const s3 of [-1, 1]) p.stroke([[tcx + s3 * 0.2 * T.a, chin + 0.12 * HH], [tcx + s3 * 0.3 * T.a, waist - 0.04 * HH]], 1.3 * u, dk);
        if (tu.trim) p.band([[tcx - 1.4 * T.a, torsoBot - 0.07 * HH], [tcx + 1.4 * T.a, torsoBot - 0.07 * HH]], tu.trim, 0.06 * HH, 0.8 * u);
        // the neckline: a little V of skin under the chin
        p.poly([[tcx - 0.24 * T.a, chin - 0.08 * HH], [tcx + 0.24 * T.a, chin - 0.08 * HH], [tcx + 2 * u * facing, chin + 0.17 * HH]], skin, 1.4 * u);
        // the waist cord with a knot and two dangling ends
        const cord = tu.cord ?? "#5a3b2a";
        p.band([[tcx - 1.4 * T.a, waist], [tcx + 1.4 * T.a, waist + 0.01 * HH]], cord, 0.05 * HH, 0.9 * u);
        const kx = tcx + 0.3 * T.a; p.ell(kx, waist + 0.005 * HH, 3 * u, 2.6 * u, cord, 1 * u);
        p.stroke([[kx, waist + 0.02 * HH], [kx - 3 * u, waist + 0.2 * HH]], 2 * u, cord); p.stroke([[kx, waist + 0.02 * HH], [kx + 4 * u, waist + 0.17 * HH]], 2 * u, cord);
      }
      if (o.toga) { // the big diagonal fold from the left shoulder to the right hip, coloured edge along its lower side, fold lines
        const fold = mul(o.jacket, [0.9, 0.9, 0.92]);
        p.band([[tcx - 1.0 * T.a, chin - 0.2 * HH], [tcx + 1.1 * T.a, torsoBot - 0.18 * HH]], fold, 0.42 * HH, 1.4 * u);
        p.band([[tcx - 1.2 * T.a, chin + 0.16 * HH], [tcx + 0.95 * T.a, torsoBot + 0.18 * HH]], o.toga, 0.07 * HH, 0.8 * u);
        for (const k of [0, 1, 2]) p.stroke([[tcx - 0.8 * T.a + k * 0.35 * T.a, chin + 0.02 * HH + k * 0.12 * HH], [tcx - 0.15 * T.a + k * 0.38 * T.a, chin + 0.42 * HH + k * 0.15 * HH]], 1.4 * u, mul(o.jacket, [0.74, 0.74, 0.78]));
        p.poly([[tcx - 0.22 * T.a, chin - 0.08 * HH], [tcx + 0.22 * T.a, chin - 0.08 * HH], [tcx + 2 * u * facing, chin + 0.13 * HH]], skin, 1.4 * u);
      }
      if (o.safari) { // field shirt: collar points, placket, two flap pockets, rolled sleeves read via the arms
        const dk = mul(o.jacket, [0.78, 0.78, 0.78]);
        for (const s3 of [-1, 1]) p.poly([[tcx, chin + 0.02 * HH], [tcx + s3 * 0.42 * T.a, chin - 0.1 * HH], [tcx + s3 * 0.3 * T.a, chin + 0.18 * HH]], mul(o.jacket, [1.08, 1.08, 1.04]), 1.3 * u);
        p.stroke([[tcx, chin + 0.05 * HH], [tcx, torsoBot - 0.05 * HH]], 1.6 * u, dk);
        for (const s3 of [-1, 1]) { const px = tcx + s3 * 0.5 * T.a, py = chin + 0.3 * HH;
          p.poly(rrect(px - 0.2 * T.a, py, px + 0.2 * T.a, py + 0.26 * HH, 1.5 * u), o.jacket, 1.3 * u);
          p.poly([[px - 0.22 * T.a, py], [px + 0.22 * T.a, py], [px + 0.2 * T.a, py + 0.08 * HH], [px - 0.2 * T.a, py + 0.08 * HH]], dk, 1.2 * u); }
        p.band([[tcx - 1.4 * T.a, waist + 0.18 * HH], [tcx + 1.4 * T.a, waist + 0.18 * HH]], "#5a3b2a", 0.06 * HH, 0.8 * u);
      }
      if (o.lapels) for (const s3 of [-1, 1]) p.poly([[tcx + s3 * 0.44 * T.a, chin - 0.08 * HH], [tcx + s3 * 0.16 * T.a, chin + 0.5 * HH], [tcx + s3 * 0.6 * T.a, chin + 0.22 * HH]], mul(o.jacket, [0.8, 0.8, 0.8]), 1.3 * u);
      if (o.tie) { // suit: white shirt V + tie, no buttons
        const tx = tcx + 2 * u * facing, y0 = chin - 0.06 * HH;
        p.poly([[tx - 0.42 * T.a, y0], [tx + 0.42 * T.a, y0], [tx, y0 + 0.62 * HH]], "#f4f1ea", 1.4 * u);
        p.poly([[tx - 5 * u, y0 + 2 * u], [tx + 5 * u, y0 + 2 * u], [tx + 3.5 * u, y0 + 8 * u], [tx - 3.5 * u, y0 + 8 * u]], o.tie, 1.2 * u);
        p.poly([[tx - 3.5 * u, y0 + 8 * u], [tx + 3.5 * u, y0 + 8 * u], [tx + 7 * u, y0 + 0.5 * HH], [tx, y0 + 0.58 * HH], [tx - 7 * u, y0 + 0.5 * HH]], o.tie, 1.4 * u);
      }
      if (o.hoodie) for (const s3 of [-1, 1]) p.stroke([[tcx + s3 * 6 * u, chin + 0.08 * HH], [tcx + s3 * 7 * u, chin + 0.42 * HH]], 1.8 * u, o.hoodie);
      if (!o.tie && !o.plain && !o.hoodie) for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  const drawProp = (pr: Prop, hx: number, hy: number) => {
    if (pr === "key") {
      p.ell(hx, hy - 16 * u, 6.5 * u, 6.5 * u, "#f2c14e", 2 * u); p.ell(hx, hy - 16 * u, 2.6 * u, 2.6 * u, "#8a6a2a", 0);
      p.band([[hx, hy - 9 * u], [hx, hy + 14 * u]], "#f2c14e", 3.4 * u, 1.3 * u);
      p.band([[hx, hy + 9 * u], [hx + 6 * u, hy + 9 * u]], "#f2c14e", 2.6 * u, 1.1 * u); p.band([[hx, hy + 13 * u], [hx + 5 * u, hy + 13 * u]], "#f2c14e", 2.6 * u, 1.1 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "binos") {
      for (const s2 of [-1, 1]) { p.poly(rrect(hx + s2 * 7 * u - 6 * u, hy - 14 * u, hx + s2 * 7 * u + 6 * u, hy + 6 * u, 3 * u), "#2b2f3a", 2 * u); p.ell(hx + s2 * 7 * u, hy - 14 * u, 6 * u, 2.2 * u, "#8fa6c4", 1.4 * u); }
      p.band([[hx - 2 * u, hy - 6 * u], [hx + 2 * u, hy - 6 * u]], "#2b2f3a", 4 * u, 1.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "card") {
      p.poly([[hx - 16 * u, hy - 22 * u], [hx + 12 * u, hy - 26 * u], [hx + 15 * u, hy - 4 * u], [hx - 13 * u, hy]], "#fbf3de", 1.8 * u);
      p.stroke([[hx - 9 * u, hy - 16 * u], [hx + 6 * u, hy - 18 * u]], 1.3 * u, "#6a7aa0"); p.stroke([[hx - 9 * u, hy - 10 * u], [hx + 8 * u, hy - 12 * u]], 1.3 * u, "#6a7aa0");
      p.poly([[hx + 5 * u, hy - 24 * u], [hx + 10 * u, hy - 24.6 * u], [hx + 10.6 * u, hy - 19 * u], [hx + 5.6 * u, hy - 18.4 * u]], "#c0353a", 1 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "teacup") {
      p.poly([[hx - 11 * u, hy - 14 * u], [hx + 11 * u, hy - 14 * u], [hx + 8 * u, hy - 2 * u], [hx - 8 * u, hy - 2 * u]], "#f4f1ea", 1.8 * u);
      p.arc(hx + 12 * u, hy - 9 * u, 4 * u, 4 * u, -90, 90, 2 * u); p.ell(hx, hy - 1 * u, 14 * u, 2.5 * u, "#f4f1ea", 1.6 * u);
      p.ell(hx, hy - 14 * u, 10 * u, 2 * u, "#a8683a", 1.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "envelope") {
      p.poly([[hx - 20 * u, hy - 26 * u], [hx + 18 * u, hy - 29 * u], [hx + 20 * u, hy - 3 * u], [hx - 18 * u, hy]], "#d7262e", 2 * u);
      p.stroke([[hx - 19 * u, hy - 25 * u], [hx, hy - 12 * u], [hx + 19 * u, hy - 28 * u]], 1.6 * u, "#ffffff");
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "dvd") {
      p.poly([[hx - 13 * u, hy - 34 * u], [hx + 13 * u, hy - 35 * u], [hx + 14 * u, hy + 2 * u], [hx - 12 * u, hy + 3 * u]], "#2c58b8", 2 * u);
      p.ell(hx + 0.5 * u, hy - 17 * u, 8 * u, 8 * u, "#dfe6f2", 1.4 * u); p.ell(hx + 0.5 * u, hy - 17 * u, 2.4 * u, 2.4 * u, "#2c58b8", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "vhs") {
      p.poly([[hx - 22 * u, hy - 22 * u], [hx + 22 * u, hy - 23 * u], [hx + 22 * u, hy + 2 * u], [hx - 22 * u, hy + 3 * u]], "#26262e", 2 * u);
      p.poly([[hx - 15 * u, hy - 20 * u], [hx + 15 * u, hy - 20.5 * u], [hx + 15 * u, hy - 14 * u], [hx - 15 * u, hy - 13.5 * u]], "#f2efe6", 1 * u);
      p.poly([[hx - 8 * u, hy - 19 * u], [hx - 2 * u, hy - 19 * u], [hx - 5 * u, hy - 15 * u]], "#e05a3a", 0.8 * u);
      for (const s2 of [-1, 1]) p.ell(hx + s2 * 9 * u, hy - 5 * u, 5 * u, 5 * u, "#e8e8ee", 1.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "cash") {
      for (const [a2, dx2] of [[-22, -7], [0, 0], [22, 7]] as const) {
        const Rq = (pts: P2[]) => rotPts(pts, rad(a2), hx, hy);
        p.poly(Rq([[hx - 9 * u + dx2 * u, hy - 30 * u], [hx + 9 * u + dx2 * u, hy - 30 * u], [hx + 9 * u + dx2 * u, hy - 2 * u], [hx - 9 * u + dx2 * u, hy - 2 * u]]), "#7cc576", 1.6 * u);
        const [cx2, cy2] = Rq([[hx + dx2 * u, hy - 16 * u]])[0]; p.ell(cx2, cy2, 3.5 * u, 3.5 * u, "#3f8a3e", 1 * u);
      }
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "remote") {
      p.poly([[hx - 5 * u, hy - 30 * u], [hx + 5 * u, hy - 30 * u], [hx + 6 * u, hy + 4 * u], [hx - 6 * u, hy + 4 * u]], "#2b2b33", 1.8 * u);
      p.ell(hx, hy - 24 * u, 2.6 * u, 2.6 * u, "#e23a3a", 0.8 * u);
      for (let k2 = 0; k2 < 3; k2++) p.ell(hx, hy - 15 * u + k2 * 5 * u, 1.6 * u, 1.6 * u, "#9a9aa6", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "pizzabox") { // two stacked boxes, held flat at the chest
      for (const k of [0, 1]) { const y = hy - 6 * u - k * 15 * u;
        p.poly([[hx - 56 * u, y], [hx + 44 * u, y], [hx + 52 * u, y - 12 * u], [hx - 48 * u, y - 12 * u]], "#f4efe4", 2.2 * u);
        p.poly([[hx - 56 * u, y], [hx + 44 * u, y], [hx + 44 * u, y + 4 * u], [hx - 56 * u, y + 4 * u]], "#d7c7a6", 1.6 * u);
        p.stroke([[hx - 22 * u, y - 6 * u], [hx + 18 * u, y - 6 * u]], 3.4 * u, "#d7262e"); }
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "slice") {
      p.poly([[hx - 4 * u, hy - 4 * u], [hx + 26 * u, hy - 22 * u], [hx + 30 * u, hy - 10 * u]], "#ffcb2b", 1.8 * u);
      p.stroke([[hx + 26 * u, hy - 22 * u], [hx + 30 * u, hy - 10 * u]], 4 * u, "#c98a3a");
      for (const [a, b] of [[12, -12], [20, -14], [17, -8]]) p.ell(hx + a * u, hy + b * u, 2.4 * u, 2.4 * u, "#d7262e", 0.6 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "phone") { // 2010 flip / candybar phone
      p.poly([[hx - 5 * u, hy - 22 * u], [hx + 5 * u, hy - 22 * u], [hx + 5.5 * u, hy + 2 * u], [hx - 5.5 * u, hy + 2 * u]], "#3a3d46", 1.6 * u);
      p.poly([[hx - 3.5 * u, hy - 19 * u], [hx + 3.5 * u, hy - 19 * u], [hx + 3.5 * u, hy - 10 * u], [hx - 3.5 * u, hy - 10 * u]], "#8fd0ff", 0.8 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "coin") {
      p.ell(hx, hy - 12 * u, 12 * u, 12 * u, "#f7931a", 2 * u); p.ell(hx, hy - 12 * u, 8 * u, 8 * u, null, 1.2 * u);
      p.stroke([[hx - 2 * u, hy - 18 * u], [hx - 2 * u, hy - 6 * u]], 1.6 * u, "#ffffff"); p.stroke([[hx - 2 * u, hy - 17 * u], [hx + 3 * u, hy - 15 * u], [hx - 2 * u, hy - 12 * u], [hx + 3.5 * u, hy - 9.5 * u], [hx - 2 * u, hy - 7 * u]], 1.4 * u, "#ffffff");
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "playmoney") {
      for (const [a2, c2] of [[-25, "#f7a8c8"], [0, "#a8e0f7"], [25, "#f7e08a"]] as const) {
        const Rq = (pts: P2[]) => rotPts(pts, rad(a2), hx, hy);
        p.poly(Rq([[hx - 9 * u, hy - 30 * u], [hx + 9 * u, hy - 30 * u], [hx + 9 * u, hy - 2 * u], [hx - 9 * u, hy - 2 * u]]), c2, 1.6 * u);
      }
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "cup" || pr === "cupFull") { // terracotta drinking cup with a black band
      p.poly([[hx - 15 * u, hy - 20 * u], [hx + 15 * u, hy - 20 * u], [hx + 9 * u, hy - 1 * u], [hx - 9 * u, hy - 1 * u]], "#c8643a", 2 * u);
      p.band([[hx - 13.5 * u, hy - 14 * u], [hx + 13.5 * u, hy - 14 * u]], "#2b2018", 2.6 * u, 0.6 * u);
      p.ell(hx, hy - 20 * u, 15 * u, 3.2 * u, pr === "cupFull" ? "#8fd0ff" : "#7a3a22", 1.6 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "bucket") { // a big wooden bucket brimming with holy water (two hands' worth)
      p.poly([[hx - 30 * u, hy - 40 * u], [hx + 30 * u, hy - 40 * u], [hx + 24 * u, hy + 4 * u], [hx - 24 * u, hy + 4 * u]], "#9a6a3a", 2.4 * u);
      for (const yy of [-30, -8]) p.band([[hx - 29 * u, hy + yy * u], [hx + 29 * u, hy + yy * u]], "#5a5f6e", 3 * u, 1 * u);
      p.ell(hx, hy - 40 * u, 30 * u, 6 * u, "#7cc8ff", 2 * u);
      p.ell(hx - 8 * u, hy - 41 * u, 8 * u, 1.8 * u, "#d8f0ff", 0);
      p.arc(hx, hy - 40 * u, 30 * u, 26 * u, 180, 360, 2.2 * u, "#5a5f6e");
      for (const [dx, dy] of [[-34, -44], [32, -50], [-20, -52]]) p.ell(hx + dx * u, hy + dy * u, 2.6 * u, 3.6 * u, "#7cc8ff", 1 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "drachma") { // a bronze drachma: owl dots on the face
      p.ell(hx, hy - 12 * u, 12 * u, 12 * u, "#c9933f", 2 * u); p.arc(hx, hy - 12 * u, 8.5 * u, 8.5 * u, 0, 360, 1.1 * u, "#8a5a24");
      p.ell(hx - 3 * u, hy - 14 * u, 2 * u, 2 * u, "#6a4214", 0); p.ell(hx + 3 * u, hy - 14 * u, 2 * u, 2 * u, "#6a4214", 0); p.stroke([[hx - 2 * u, hy - 9 * u], [hx + 2 * u, hy - 9 * u]], 1.2 * u, "#6a4214");
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "scroll") {
      p.poly([[hx - 22 * u, hy - 26 * u], [hx + 22 * u, hy - 26 * u], [hx + 22 * u, hy - 4 * u], [hx - 22 * u, hy - 4 * u]], "#f1e3c0", 1.6 * u);
      for (const x2 of [-24, 24]) p.poly(rrect(hx + (x2 - 3) * u, hy - 30 * u, hx + (x2 + 3) * u, hy, 2.5 * u), "#b07a42", 1.6 * u);
      p.stroke([[hx - 15 * u, hy - 19 * u], [hx + 12 * u, hy - 19 * u]], 1.2 * u, "#6a5a4a"); p.stroke([[hx - 15 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u]], 1.2 * u, "#6a5a4a");
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "sponge") { // the Roman sponge on a stick (tersorium): held like a torch, sponge on top
      p.band([[hx, hy + 10 * u], [hx + 5 * u, hy - 66 * u]], "#9a6a3a", 4.6 * u, 1.4 * u, "round");
      const sp: P2[] = []; for (let k2 = 0; k2 < 14; k2++) { const a = (k2 / 14) * Math.PI * 2, r = (k2 % 2 ? 15 : 17.5) * u; sp.push([hx + 6 * u + Math.cos(a) * r, hy - 80 * u + Math.sin(a) * r * 0.82]); }
      p.poly(sp, "#e8c870", 2 * u);
      for (const [dx, dy, r] of [[-5, -4, 2.4], [5, 2, 2], [9, -8, 1.8], [-1, 6, 1.6], [2, -10, 1.6]]) p.ell(hx + 6 * u + dx * u, hy - 80 * u + dy * u, r * u, r * 0.8 * u, "#b8923e", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "shard") { // a curved piece of a broken pot, black band and all
      p.poly([[hx - 16 * u, hy - 4 * u], [hx - 10 * u, hy - 30 * u], [hx + 4 * u, hy - 38 * u], [hx + 9 * u, hy - 24 * u], [hx + 18 * u, hy - 16 * u], [hx + 12 * u, hy - 2 * u]], "#c8643a", 2 * u);
      p.stroke([[hx - 12 * u, hy - 20 * u], [hx + 14 * u, hy - 12 * u]], 3 * u, "#2b2018");
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "brush") { // the archaeologist's soft brush
      p.band([[hx, hy + 6 * u], [hx + 3 * u, hy - 26 * u]], "#9a6a3a", 4 * u, 1.2 * u, "round");
      p.poly([[hx - 4 * u, hy - 26 * u], [hx + 9 * u, hy - 27 * u], [hx + 10 * u, hy - 44 * u], [hx - 4 * u, hy - 43 * u]], "#d8c08a", 1.6 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "sixpence") { // a silver sixpence held up between the fingers
      p.ell(hx, hy - 16 * u, 13 * u, 13 * u, "#dfe3ea", 2.2 * u); p.ell(hx, hy - 16 * u, 9 * u, 9 * u, null, 1.2 * u);
      p.stroke([[hx + 2 * u, hy - 22 * u], [hx - 3 * u, hy - 16 * u], [hx - 3 * u, hy - 11 * u], [hx + 3 * u, hy - 11 * u], [hx + 3 * u, hy - 15 * u], [hx - 3 * u, hy - 15 * u]], 1.8 * u, "#6a7080");
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "ledger") { // the foreman's pay book
      p.poly([[hx - 20 * u, hy - 34 * u], [hx + 18 * u, hy - 30 * u], [hx + 18 * u, hy + 2 * u], [hx - 20 * u, hy - 2 * u]], "#1f6a4a", 2 * u);
      p.stroke([[hx - 16 * u, hy - 30 * u], [hx - 16 * u, hy - 4 * u]], 2.4 * u, "#e8c45a");
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "alarm") { // a twin-bell alarm clock
      const cy = hy - 20 * u;
      for (const s3 of [-1, 1]) p.ell(hx + s3 * 10 * u, cy - 15 * u, 6 * u, 5 * u, "#e8c45a", 1.6 * u);
      p.ell(hx, cy, 14 * u, 14 * u, "#d7262e", 2.2 * u); p.ell(hx, cy, 10 * u, 10 * u, "#fbf6e8", 1.4 * u);
      p.stroke([[hx, cy], [hx, cy - 7 * u]], 1.6 * u); p.stroke([[hx, cy], [hx + 5 * u, cy + 2 * u]], 1.6 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "lantern") { // a small oil lantern with a warm glow
      p.stroke([[hx, hy], [hx, hy + 8 * u]], 1.6 * u);
      p.poly(rrect(hx - 9 * u, hy + 8 * u, hx + 9 * u, hy + 34 * u, 3 * u), "#ffd27a", 2 * u);
      p.ell(hx, hy + 22 * u, 4 * u, 6 * u, "#fff3c4", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "roll") { // the empty cardboard toilet-roll tube
      p.poly(rrect(hx - 9 * u, hy - 30 * u, hx + 9 * u, hy, 2 * u), "#c9a06a", 1.8 * u);
      p.ell(hx, hy - 30 * u, 9 * u, 3.4 * u, "#7a5a3a", 1.4 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "chips") { // a crinkly snack bag
      p.poly([[hx - 15 * u, hy - 36 * u], [hx + 15 * u, hy - 36 * u], [hx + 17 * u, hy + 2 * u], [hx - 17 * u, hy + 2 * u]], "#d7262e", 2 * u);
      for (const yy of [-36, 2]) for (let k2 = -3; k2 <= 3; k2++) p.stroke([[hx + k2 * 5 * u, hy + yy * u], [hx + k2 * 5 * u, hy + (yy + (yy < 0 ? 3 : -3)) * u]], 1 * u, "#8a1218");
      p.ell(hx, hy - 17 * u, 10 * u, 7 * u, "#ffcb2b", 1.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (pr === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(pr)) {
      const ang = rad(-70 + 105 * clamp(pr[1], 0, 1));
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  };  drawPropRef.f = drawProp;

  // posed hands on / in front of the face are drawn after the head (facepalm, stifled laugh, chin, tear)
  const overHead = (a: Arm) => posed && !!a.ap && a.front && a.pts[2][1] < chin + 0.02 * HH && a.pts[2][1] > crown - 0.1 * HH && Math.abs(a.pts[2][0] - 300) < 1.02 * H.a;
  for (const a of arms) if (a.front && !overHead(a)) {
    drawArm(a);
    if (posed) continue; // posed arms draw their own props
    const [hx, hy] = a.pts[2];
    if (prop === "binosEyes") continue; // drawn over the face below
    drawProp(prop, hx, hy);
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "beanie";
  FACE_X = { goatee: o.goatee, stubble: o.stubble, beard: o.beard };
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout", o.glasses);
  FACE_X = {};
  { const mx = 300 + 8 * u * facing, my = hc + 20 * u; ANCHOR.mouth = p.P(mx, my); ANCHOR.head = p.P(300, hc);
    if (prop === "peashooter") { // a tin pea-shooter tube from the lips, angled up and out
      const sd = facing < 0 ? -1 : 1, a: P2 = [mx + sd * 3 * u, my - 1 * u], b: P2 = [mx + sd * 58 * u, my - 16 * u];
      p.band([a, b], "#9aa3ad", 7 * u, 2 * u, "round"); p.stroke([[mx + sd * 10 * u, my - 4 * u], [mx + sd * 52 * u, my - 16 * u]], 1.4 * u, "#e6ecf2");
      ANCHOR.tip = p.P(b[0], b[1]);
    } }
  if (o.headset) { // band over the crown + ear cups + a mic boom
    const hs = o.headset;
    p.arc(300, hc - 2 * u, H.a * 1.02, H.b * 1.04, 196, 344, 5.5 * u, hs);
    for (const s3 of [-1, 1]) p.ell(300 + s3 * H.a * 0.98, hc + 4 * u, 9 * u, 13 * u, hs, 2.2 * u);
    p.stroke([[300 - H.a * 0.98, hc + 12 * u], [300 - 30 * u, hc + 30 * u], [300 - 14 * u, hc + 31 * u]], 2.4 * u, hs);
    p.ell(300 - 13 * u, hc + 31 * u, 3.2 * u, 3.2 * u, "#3a3d46", 1 * u);
  }
  if (posed && arms.some(overHead)) { p.rot = A ? [rad(A), 300, hipY] : null; for (const a of arms) if (overHead(a)) drawArm(a, true); }
  // a sponge on a stick rises above the hand: when it reaches the face it must stay in front of the head
  if (prop === "sponge") { const ah = arms.find((a) => a.hold === "sponge") ?? arms.filter((a) => a.front).pop();
    if (ah) { p.rot = A ? [rad(A), 300, hipY] : null; drawProp("sponge", ah.pts[2][0], ah.pts[2][1]); } }
  if (prop === "binosEyes") {
    for (const s2 of [-1, 1]) { p.poly(rrect(300 + s2 * 13 * u - 9 * u, hc - 10 * u, 300 + s2 * 13 * u + 9 * u, hc + 14 * u, 4 * u), "#2b2f3a", 2.4 * u); p.ell(300 + s2 * 13 * u, hc - 10 * u, 9 * u, 3 * u, "#8fa6c4", 1.6 * u); }
    p.band([[300 - 5 * u, hc + 2 * u], [300 + 5 * u, hc + 2 * u]], "#2b2f3a", 6 * u, 1.4 * u);
    p.rot = null;
    for (const a of arms) if (a.front) { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); }
  }
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    // shuffling push: the feet keep stepping with phase (no skating while the load moves)
    const ph2 = two * phase, sl = 0.16 * legLen;
    legs.push({ ank: [300 - 0.45 * legLen + sl * Math.sin(ph2), ankY - Math.max(0, Math.cos(ph2)) * 0.09 * legLen], pitch: rad(-8), near: false },
      { ank: [300 + 0.22 * legLen - sl * Math.sin(ph2), ankY - Math.max(0, -Math.cos(ph2)) * 0.09 * legLen], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "beanie";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout", o.glasses);
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
