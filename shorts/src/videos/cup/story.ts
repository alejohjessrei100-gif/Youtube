// "The Cup That Changes Colour" (the Lycurgus Cup): shots timed to cup/voice/words_asr.json.
// HOOK (frames 0-149, "This Roman cup is green, put a candle behind it, and it turns blood red."):
//   1 low candlelit face of a Roman, the cup glowing green and soft in the foreground   0-36   "This Roman cup"
//   2 macro of the carved glass cage, slow drift                                         36-68  "is green, put a"
//   3 the lens circles the cup until the candle sits behind it; the glass turns red     68-138 "candle behind it ... blood red"
//   4 reaction: his face lit red                                                         138-150
// The red is physical, not keyed: the cup shader turns red as the candle lines up behind the cup from the lens.
export const FPS = 30;
export const TOTAL = 1057;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- places ----------------
export const TT = 0.8;                         // table top
export const CUP: V3 = [0, TT, 0];             // cup base
export const CUP_H = 0.165, CUP_MID = TT + 0.085;
export const CANDLE: V3 = [0.15, TT, 0.3];     // candle base; flame at FLAME
export const FLAME: V3 = [0.15, TT + 0.125, 0.3];
export const ROMAN: V3 = [-0.62, 0, 0.72];         // stands behind the table, facing the lens (-z)

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "candle";
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 36, light: "candle", tau: (t) => t, sunAz: 165, sunEl: 14 },   // the candle low in front of him
  { id: 2, a: 36, b: 68, light: "candle", tau: (t) => t, sunAz: 40, sunEl: 12 },    // the candle beside / behind the cup
  { id: 3, a: 68, b: 138, light: "candle", tau: (t) => t, sunAz: 15, sunEl: 10 },   // backlit
  { id: 4, a: 138, b: TOTAL, light: "candle", tau: (t) => t, sunAz: 170, sunEl: 10 },
];
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// story beats (frames, from the word timings)
export const W = { green: 36, candle: 68, behind: 76, turns: 104, blood: 113, red: 126, redEnd: 138 };

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

/** a lens on a circle round the cup: angle b (rad, 0 = looking along +z), radius r, height above the cup middle */
const orbit = (b: number, r: number, h: number, lookDy = 0): Shot =>
  ({ pos: [CUP[0] + r * Math.sin(b), CUP_MID + h, CUP[2] - r * Math.cos(b)], look: [CUP[0], CUP_MID + lookDy, CUP[2]] });
/** the angle at which the candle sits exactly behind the cup */
export const B_ALIGN = Math.atan2(-(FLAME[0] - CUP[0]), (FLAME[2] - CUP[2]));

// 1: low lens just over the table edge, the cup soft in the foreground, his face up in the frame; creeping push + drift
const S1 = (f: number): Shot => { const u = f / 36; return dolly([0.36 - 0.04 * u, TT + 0.2, -0.47], [-0.43, TT + 0.48, 0.62], pushK(f, 0, 0.0045), { fov: 40, roll: 0.035 - 0.03 * u }); };
// 2: macro of the cage, drifting round from the left
const S2 = (f: number): Shot => ({ ...orbit(B_ALIGN - 1.25 + 0.22 * ((f - 36) / 32), 0.3 - 0.03 * ((f - 36) / 32), 0.01, 0.005), fov: 32, roll: -0.035 });
// 3: wider macro that circles until the candle is behind the cup (lined up by "turns"), then pushes in on "blood red"
// the lens sits on the line flame -> cup (slightly below the cup's middle, since the flame is a little higher), so
// the candle ends up exactly behind the glass; the offset angle eases in and closes at frame ALIGN_F
export const ALIGN_F = 120;
const FLAME_RISE = (FLAME[1] - CUP_MID) / Math.hypot(FLAME[0] - CUP[0], FLAME[2] - CUP[2]);
const S3 = (f: number): Shot => {
  const d = 0.95 * Math.max(0, (ALIGN_F - f) / (ALIGN_F - 68)) ** 1.3, push = glide((f - W.blood + 8) / 34), r = 0.5 - 0.13 * push;
  return { ...orbit(B_ALIGN + d, r, -FLAME_RISE * r, 0.0), fov: 34 - 3 * push, roll: 0.045 * (d / 0.95) - 0.03 * push };
};
// 4: his face, lit red from below by the cup
const S4 = (f: number): Shot => dolly([ROMAN[0] + 0.12, 1.4, ROMAN[2] - 1.05], [ROMAN[0], 1.43, ROMAN[2]], pushK(f, 138, 0.004), { fov: 34, roll: -0.02 });

const CAMS: Record<number, Key[]> = { 1: [{ f: 0, s: S1 }], 2: [{ f: 36, s: S2 }], 3: [{ f: 68, s: S3 }], 4: [{ f: 138, s: S4 }] };

const KICKS: [number, number][] = [[T(W.blood), 0.35]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id] ?? CAMS[4], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const face: V3 = [ROMAN[0], 1.45, ROMAN[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 16, focus: () => face },
  { f: 36, cInf: 12, focus: () => [CUP[0], CUP_MID + 0.01, CUP[2]] },
  { f: 68, cInf: 15, focus: () => [CUP[0], CUP_MID, CUP[2]] },
  { f: 138, cInf: 16, focus: () => face },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  return { cInf: DOF[i].cInf, focus: DOF[i].focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
