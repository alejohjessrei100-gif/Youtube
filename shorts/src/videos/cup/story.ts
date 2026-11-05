// "The Cup That Changes Colour" (the Lycurgus Cup): 18 shots timed to cup/voice/words_asr.json (1057 frames).
// Places (far apart in one scene): the Roman dining room (origin), a stone vault (VX), a modern lab (LBX), the
// micro-world inside the glass (MCX, MCY), a Roman glass workshop (WSX).
// The cup's red is physical everywhere: each cup turns red when its light source lines up behind it from the lens.
export const FPS = 30;
export const TOTAL = 1057;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- places ----------------
export const TT = 0.8;                          // dining table top
export const CUP: V3 = [0, TT, 0];
export const CUP_H = 0.165, CUP_MID = TT + 0.085;
export const CANDLE: V3 = [0.15, TT, 0.3];
export const FLAME: V3 = [0.15, TT + 0.125, 0.3];
export const ROMAN: V3 = [-0.62, 0, 0.72];
// vault
export const VX = 40, PLINTH = 1.05;
export const VCUP: V3 = [VX, PLINTH, 0];
export const LINEUP: V3[] = [[VX - 1.35, 0, 0.95], [VX - 0.45, 0, 1.05], [VX + 0.45, 0, 1.0], [VX + 1.35, 0, 0.9]];
// lab
export const LBX = 80;
export const SCOPE: V3 = [LBX + 0.7, 0, 1.3];
export const SCREEN: V3 = [LBX - 0.55, 1.28, 1.18];   // monitor face (faces -z)
export const SCI: V3[] = [[LBX - 0.9, 0, 0.75], [LBX + 0.95, 0, 0.6]];
// micro-world
export const MCX = 200, MCY = 50;
// workshop
export const WSX = -40, BENCH = 0.9;
export const WCUP: V3 = [WSX + 0.55, BENCH, 0.85];
export const WCANDLE: V3 = [WSX + 0.75, BENCH, 1.2];
export const WFLAME: V3 = [WSX + 0.75, BENCH + 0.125, 1.2];
export const MAKER: V3 = [WSX - 0.45, 0, 1.3];
export const FURNACE: V3 = [WSX - 1.7, 0, 1.9];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "candle";
export type Place = "room" | "vault" | "lab" | "micro" | "shop";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; tau: (t: number) => number; sunAz?: number; sunEl?: number };
const S = (id: number, a: number, b: number, light: Light, place: Place, sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, light, place, tau: (t) => t, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 36, "candle", "room", 165, 14),       // "This Roman cup"
  S(2, 36, 68, "candle", "room", 40, 12),       // "is green, put a"
  S(3, 68, 138, "candle", "room", 15, 10),      // "candle behind it, and it turns blood red"
  S(4, 138, 150, "candle", "room", 170, 10),    // reaction, lit red
  S(5, 150, 176, "candle", "room", 150, 16),    // "No paint"            he holds it to his eye
  S(6, 176, 209, "candle", "room", 140, 16),    // "no hidden trick"     upside down, shaken
  S(7, 209, 238, "candle", "room", 60, 12),     // "just glass"          the cup spins on the table
  S(8, 238, 298, "candle", "vault"),            // "It's 1600 years old" time-lapse in a vault (sun sweeps)
  S(9, 298, 375, "candle", "vault", 160, 25),   // "for centuries nobody could explain it"  puzzled people of every era
  S(10, 375, 442, "day", "lab", 120, 65),       // "Then scientists finally looked inside it"
  S(11, 442, 500, "day", "lab", 150, 60),       // "with an electron microscope"  push into the screen
  S(12, 500, 590, "night", "micro", 140, 30),   // "You see, the glass is sprinkled with gold and silver"
  S(13, 590, 668, "night", "micro", 120, 30),   // "in specks a thousand times thinner than a hair"
  S(14, 668, 735, "night", "micro", 160, 20),   // "Light bouncing off them looks green"
  S(15, 735, 796, "night", "micro", 10, 15),    // "light shining through them looks red"
  S(16, 796, 846, "candle", "shop", 120, 14),   // "and nobody knows if the Romans"   the glassmaker at his furnace
  S(17, 846, 874, "candle", "shop", 150, 12),   // "did it on purpose"   he shrugs
  S(18, 874, TOTAL, "candle", "shop", 20, 10),  // "So 16 centuries ago ... might not have even known"
];
export const XFADE: Record<number, number> = { 8: 10, 10: 8, 16: 10 };
export const FLASH_AT = 500;                       // into the glass

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// story beats (frames, from the word timings)
export const W = { green: 36, candle: 68, behind: 76, turns: 104, blood: 113, red: 126, redEnd: 138, paint: 156, trick: 188, glass: 215,
  old: 284, nobody: 322, explain: 352, then: 377, micro: 467, see: 500, gold: 552, specks: 590, hair: 655, bounce: 679, green2: 716,
  shine: 744, red2: 782, nobody2: 805, purpose: 863, nano: 967, known: 1036 };
export const BLOW = 1030;                            // the glassmaker blows the candle out

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
const dolly = (pos: V3, look: V3, k0: number, rest: Partial<Cam> = {}, k = k0 * ZOOM): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** user: framings were too tight; every lens sits ZOOM x further from what it frames (not the micro-world / screen push) */
export const ZOOM = 1.38;

/** a lens on a circle round a cup: angle b (0 = looking along +z), radius r, height h over its middle; the look point
 *  sits lookDy under the middle, so the cup rides high in the frame (the captions live at ~70 % height) */
const orbitAt = (c: V3, mid: number, b: number, r: number, h: number, lookDy = 0): Shot =>
  ({ pos: [c[0] + ZOOM * r * Math.sin(b), mid + ZOOM * h, c[2] - ZOOM * r * Math.cos(b)], look: [c[0], mid + lookDy, c[2]] });
const orbit = (b: number, r: number, h: number, lookDy = 0) => orbitAt(CUP, CUP_MID, b, r, h, lookDy);
export const B_ALIGN = Math.atan2(-(FLAME[0] - CUP[0]), (FLAME[2] - CUP[2]));

// 1-4: the hook
const S1 = (f: number): Shot => { const u = f / 36; return dolly([0.36 - 0.04 * u, TT + 0.2, -0.47], [-0.43, TT + 0.48, 0.62], pushK(f, 0, 0.0045), { fov: 40, roll: 0.035 - 0.03 * u }); };
const S2 = (f: number): Shot => ({ ...orbit(B_ALIGN - 1.25 + 0.22 * ((f - 36) / 32), 0.5 - 0.03 * ((f - 36) / 32), 0.02, -0.06), fov: 34, roll: -0.035 });
export const ALIGN_F = 120;
const FLAME_RISE = (FLAME[1] - CUP_MID) / Math.hypot(FLAME[0] - CUP[0], FLAME[2] - CUP[2]);
const S3 = (f: number): Shot => {
  const d = 0.95 * Math.max(0, (ALIGN_F - f) / (ALIGN_F - 68)) ** 1.3, push = glide((f - W.blood + 8) / 34), r = 0.52 - 0.12 * push;
  return { ...orbit(B_ALIGN + d, r, -FLAME_RISE * r, -0.05), fov: 34 - 3 * push, roll: 0.045 * (d / 0.95) - 0.03 * push };
};
const S4 = (f: number): Shot => dolly([ROMAN[0] + 0.15, 1.38, ROMAN[2] - 1.6], [ROMAN[0], 1.32, ROMAN[2]], pushK(f, 138, 0.004), { fov: 40, roll: -0.02 });
// 5-6: medium close-ups of the Roman testing the cup (held, drawn on his card)
const S5 = (f: number): Shot => dolly([ROMAN[0] + 0.15, 1.5, ROMAN[2] - 2.0], [ROMAN[0] - 0.14, 1.42, ROMAN[2]], pushK(f, 150, 0.004), { fov: 40, roll: 0.03 });
const S6 = (f: number): Shot => dolly([ROMAN[0] - 0.45, 1.35, ROMAN[2] - 2.0], [ROMAN[0] - 0.14, 1.38, ROMAN[2]], pushK(f, 176, 0.0035), { fov: 42, roll: -0.03 });
// 7: the cup turning on the table, low macro
const S7 = (f: number): Shot => ({ ...orbit(B_ALIGN - 2.2 + 0.25 * ((f - 209) / 29), 0.5, 0.02, -0.06), fov: 34, roll: 0.03 });
// 8: the vault: a slow orbit round the plinth while the light sweeps (time-lapse)
const VMID = PLINTH + 0.085;
const S8 = (f: number): Shot => ({ ...orbitAt(VCUP, VMID, -0.5 + 0.55 * ((f - 238) / 60), 0.85 - 0.2 * ((f - 238) / 60), 0.04, -0.07), fov: 38 });
// 9: a truck along the line of puzzled people (right to left on screen)
const S9 = (f: number): Shot => { const u = glide((f - 298) / 77); return { pos: [VX + 1.45 - 2.9 * u, 1.5, -2.95], look: [VX + 1.3 - 2.6 * u, 1.25, 0.95], fov: 44 }; };
// 10-11: the lab, then a push into the monitor
// both scientists + the microscope in frame: wide lens, ~5 m back
const S10 = (f: number): Shot => dolly([LBX - 1.17, 1.7, -2.75], [LBX + 0.03, 1.15, 0.8], pushK(f, 375, 0.003), { fov: 50, roll: 0.02 });
const S11 = (f: number): Shot => { const u = (f - 442) / 58, k = 1 - easeOut(u * 0.95) ** 1.2 * 0.92; return { pos: add(SCREEN, [0.25 * k, 0.03 * k, -1.4 * k - 0.05]), look: SCREEN, fov: 40 - 8 * u, roll: 0.02 * u }; };
// 12-15: the micro-world: fly through the specks, the hair, the light
const S12 = (f: number): Shot => { const u = (f - 500) / 90; return { pos: [MCX + 0.4 * Math.sin(u * 2), MCY + 0.2 * u, -6 + 7 * u], look: [MCX + 0.2, MCY + 0.1, 2 + 7 * u], fov: 50, roll: 0.06 * Math.sin(u * 3) }; };
const S13 = (f: number): Shot => { const u = glide((f - 590) / 78); return { pos: [MCX - 1.0 - 1.2 * u, MCY + 0.2, 1.0 - 3 * u], look: [MCX + 1.5 + 2.5 * u, MCY + 0.1, 4.0], fov: 52 + 6 * u, roll: -0.04 }; };
export const CLUSTER: V3 = [MCX, MCY, 4.5];
const S14 = (f: number): Shot => { const u = (f - 668) / 67; return { pos: add(CLUSTER, [-0.6 + 0.5 * u, 0.25, -3.2 + 0.4 * u]), look: CLUSTER, fov: 46, roll: 0.03 }; };
const S15 = (f: number): Shot => { const u = (f - 735) / 61; return { pos: add(CLUSTER, [0.5 - 0.4 * u, -0.15, -3.0 + 0.5 * u]), look: CLUSTER, fov: 46, roll: -0.03 }; };
// 16-18: the workshop
const S16 = (f: number): Shot => dolly([WSX + 0.7, 1.6, -1.7], [WSX - 0.85, 1.05, 1.55], pushK(f, 796, 0.0035), { fov: 44, roll: 0.02 });
const S17 = (f: number): Shot => dolly([MAKER[0] + 0.35, 1.5, MAKER[2] - 2.1], [MAKER[0], 1.3, MAKER[2]], pushK(f, 846, 0.005), { fov: 40, roll: -0.03 });
const WMID = BENCH + 0.085;
const W_ALIGN = Math.atan2(-(WFLAME[0] - WCUP[0]), (WFLAME[2] - WCUP[2]));
const WRISE = (WFLAME[1] - WMID) / Math.hypot(WFLAME[0] - WCUP[0], WFLAME[2] - WCUP[2]);
const S18 = (f: number): Shot => {
  // arc in until the bench candle is behind the cup (red again by "nanotechnology"), then a slow push; the maker behind
  const d = 0.9 * Math.max(0, (960 - f) / 86) ** 1.3, r = 0.62 - 0.12 * glide((f - 960) / 97);
  return { ...orbitAt(WCUP, WMID, W_ALIGN + d, r, -WRISE * r + 0.02, -0.06), fov: 36, roll: 0.03 * (d / 0.9) };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: 36, s: S2 }], 3: [{ f: 68, s: S3 }], 4: [{ f: 138, s: S4 }], 5: [{ f: 150, s: S5 }], 6: [{ f: 176, s: S6 }],
  7: [{ f: 209, s: S7 }], 8: [{ f: 230, s: S8 }], 9: [{ f: 298, s: S9 }], 10: [{ f: 368, s: S10 }], 11: [{ f: 442, s: S11 }],
  12: [{ f: 500, s: S12 }], 13: [{ f: 590, s: S13 }], 14: [{ f: 668, s: S14 }], 15: [{ f: 735, s: S15 }], 16: [{ f: 788, s: S16 }],
  17: [{ f: 846, s: S17 }], 18: [{ f: 874, s: S18 }],
};

const KICKS: [number, number][] = [[T(W.blood), 0.35], [T(W.see), 0.4], [T(W.purpose), 0.3]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id] ?? CAMS[18], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const face = (p: V3): V3 => [p[0], 1.45, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 16, focus: () => face(ROMAN) },
  { f: 36, cInf: 12, focus: () => [CUP[0], CUP_MID + 0.01, CUP[2]] },
  { f: 68, cInf: 15, focus: () => [CUP[0], CUP_MID, CUP[2]] },
  { f: 138, cInf: 16, focus: () => face(ROMAN) },
  { f: 209, cInf: 14, focus: () => [CUP[0], CUP_MID, CUP[2]] },
  { f: 238, cInf: 10, focus: () => [VCUP[0], VMID, VCUP[2]] },
  { f: 298, cInf: 7 },
  { f: 375, cInf: 5 },
  { f: 442, cInf: 9, focus: () => SCREEN },
  { f: 500, cInf: 12 },
  { f: 668, cInf: 10, focus: () => CLUSTER },
  { f: 796, cInf: 9 },
  { f: 846, cInf: 14, focus: () => face(MAKER) },
  { f: 874, cInf: 15, focus: () => [WCUP[0], WMID, WCUP[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  return { cInf: DOF[i].cInf, focus: DOF[i].focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
