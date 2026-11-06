// "Why can't you sleep in a hotel?" (the first-night effect): shots timed to hotel/voice/words_asr.json (34.5 s).
// Places: the hotel room at night (origin): walls x -3.2..3.2, z -3..3, 2.8 m high, the king bed against the back
// wall (headboard at z -3, foot at z -0.6), nightstands with lamps, a window with the city at night on the right wall.
export const FPS = 30;
export const TOTAL = 1050;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- the room ----------------
export const RX0 = -3.2, RX1 = 3.2, RZ0 = -3, RZ1 = 3, RH = 2.8;
export const BED = { x0: -0.95, x1: 0.95, z0: -3, z1: -0.6, top: 0.62 };   // mattress
export const DUVET = { z0: -1.78, z1: -0.55, top: 0.75 };
export const PILLOWS: V3[] = [[0.42, 0.72, -2.55], [-0.45, 0.72, -2.55]];
export const STANDS: V3[] = [[1.35, 0.6, -2.72], [-1.35, 0.6, -2.72]];       // nightstand tops
export const MINT: V3 = [-0.42, 0.86, -2.42];
export const GUEST_LIE: V3 = [0.4, 0.66, -0.68];                            // feet of the lying card (head toward -z)
export const GUEST_SIT: V3 = [0.4, -0.3, -2.1];                             // soles of the sitting card (legs in the bed)
export const WINDOW = { x: RX1 - 0.01, z: -0.4, y: 1.45, w: 1.6, h: 1.5 };

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "candle";
export type Place = "room" | "lab" | "brain" | "sea";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; tau: (t: number) => number; sunAz?: number; sunEl?: number };
const S = (id: number, a: number, b: number, light: Light, place: Place, sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, light, place, tau: (t) => t, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 28, "candle", "room", 120, 35),      // "Why do hotel beds"      top-down: wide awake in a perfect bed
  S(2, 28, 60, "candle", "room", 140, 25),     // "feel comfy,"            macro: the plump pillow and the mint
  S(3, 60, 100, "candle", "room", 70, 22),     // "but you still can't fall"  he sits bolt upright, the clock glows 3:07
  S(4, 100, 128, "candle", "room", 60, 25),    // "asleep?"                sheep jump the bed... and fall asleep instead
  S(5, 128, TOTAL, "candle", "room", 60, 25),  // (rest of the film: built after the hook is approved)
];
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// story beats (frames, from the word timings)
export const W = { why: 0, beds: 28, comfy: 44, but: 61, cant: 88, fall: 97, asleep: 102, see: 127 };
export const SIT_UP = 64;                          // he jolts upright on "but"

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number; up?: V3 };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k, up: b.up ?? a.up,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// 1: from above the foot of the bed, a fast descending glide onto the wide-awake face (fastest at frame 0)
const S1 = (f: number): Shot => { const u = easeOut(f / 32); return { pos: lerp3([0.9, 2.55, -0.2], [0.55, 2.35, -0.95], u), look: lerp3([0.3, 0.6, -2.2], [0.4, 0.75, -2.35], u), fov: 58, roll: 0.08 - 0.06 * u }; };
// 2: low over the duvet to the plump pillow with the mint on it
const S2 = (f: number): Shot => { const u = easeOut((f - 28) / 34); return { pos: lerp3([-1.4, 1.0, -2.0], [-1.12, 0.95, -2.22], u), look: [MINT[0] + 0.05, MINT[1] - 0.04, MINT[2]], fov: 44, roll: -0.05 + 0.03 * u }; };
// 3: from the foot of the bed, right side: he sits bolt upright, the clock on the nightstand behind
const S3 = (f: number): Shot => { const u = (f - 60) / 40; return { pos: [1.75 - 0.15 * u, 1.35, 0.55 - 0.3 * u], look: [0.35, 1.05, -2.2], fov: 54, roll: 0.03 }; };
// 4: the room corner: the whole bed, the window, sheep vaulting the footboard in the foreground
const S4 = (f: number): Shot => { const u = (f - 100) / 28; return { pos: [-2.75 + 0.1 * u, 1.75, 2.55 - 0.15 * u], look: [0.3, 0.75, -1.4], fov: 60, roll: -0.02 }; };
const S5 = (f: number): Shot => S4(Math.min(f, 127));

const CAMS: Record<number, Key[]> = { 1: [{ f: 0, s: S1 }], 2: [{ f: 28, s: S2 }], 3: [{ f: 60, s: S3 }], 4: [{ f: 100, s: S4 }], 5: [{ f: 128, s: S5 }] };

const KICKS: [number, number][] = [[T(SIT_UP), 0.45], [T(W.cant), 0.25]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id] ?? CAMS[5], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 9, focus: () => [0.4, 0.85, -2.4] },
  { f: 28, cInf: 15, focus: () => MINT },
  { f: 60, cInf: 9, focus: () => [0.4, 1.45, -2.1] },
  { f: 100, cInf: 5, focus: () => [0.0, 1.0, -0.4] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  return { cInf: DOF[i].cInf, focus: DOF[i].focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
