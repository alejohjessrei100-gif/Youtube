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
export const LAB_X = 40, BRAIN_X = 80, SEA_X = -40;
export const LAB_BED = { x0: LAB_X - 0.5, x1: LAB_X + 0.5, z0: -2.6, z1: -0.4, top: 0.62 };
export const SLEEPER_LIE: V3 = [LAB_X, 0.7, -0.5];
export const SLEEPER_SIT: V3 = [LAB_X, -0.3, -2.0];
export const SCIENTISTS: V3[] = [[LAB_X + 1.5, 0, -0.9], [LAB_X + 2.4, 0, -0.3]];
export const MONITOR: V3 = [LAB_X + 2.1, 1.25, -2.55];
export const BRAIN: V3 = [BRAIN_X, 1.6, 0];
export const WATCH_SCALE = 0.55;
/** the night watchman's patrol: door -> past the bed foot -> the window (night one) */
export const WATCH_PATH = (f: number): V3 => {
  const u = clamp01((f - 655) / 80);
  return [-0.6 + 2.9 * u, 0, 2.2 - 2.6 * u];
};
export const SHOTS: ShotDef[] = [
  S(1, 0, 28, "candle", "room", 120, 35),      // "Why do hotel beds"      top-down: wide awake in a perfect bed
  S(2, 28, 60, "candle", "room", 140, 25),     // "feel comfy,"            macro: the plump pillow and the mint
  S(3, 60, 100, "candle", "room", 70, 22),     // "but you still can't fall"  he sits bolt upright
  S(4, 100, 128, "candle", "room", 60, 25),    // "asleep?"                sheep jump the bed... one falls asleep
  S(5, 128, 190, "day", "lab", 60, 40),        // "You see, Brown University scientists"   the sleep lab
  S(6, 190, 250, "day", "lab", 80, 40),        // "watched people sleep in a lab"   EEG cap, wires, the monitor
  S(7, 250, 288, "day", "lab", 100, 40),       // "two nights in a row"   the window flips night, day, night
  S(8, 288, 365, "night", "brain", 40, 50),    // "On night one, something strange happened."  into the brain
  S(9, 365, 440, "night", "brain", 40, 50),    // "The right half of the brain slept deeply."
  S(10, 440, 512, "night", "brain", 40, 50),   // "The left half stayed lighter, on guard."
  S(11, 512, 582, "night", "brain", 60, 50),   // "When odd beeps reached that guarding half,"
  S(12, 582, 655, "day", "lab", 70, 40),       // "sleepers woke up more often, and faster."
  S(13, 655, 720, "candle", "room", 80, 30),   // "It's a night watchman,"
  S(14, 720, 780, "candle", "room", 100, 30),  // "listening for danger in a place it doesn't know yet."
  S(15, 780, 845, "night", "sea", 30, 35),     // "Dolphins and ducks do this every night."
  S(16, 845, 925, "candle", "room", 120, 30),  // "By your second night, the watchman clocks off."
  S(17, 925, 975, "candle", "room", 120, 35),  // "So it isn't the bed."
  S(18, 975, TOTAL, "candle", "room", 150, 30),// "It's your brain, guarding you."
];
export const XFADE: Record<number, number> = { 5: 8, 8: 10, 12: 8, 15: 8, 16: 8 };
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
export const W = { why: 0, beds: 28, comfy: 44, but: 61, cant: 88, fall: 97, asleep: 102, see: 127, rows: 251, strange: 328, right: 374, deeply: 405, left: 446, guard: 494,
  beeps: 531, woke: 597, faster: 630, watchman: 676, danger: 707, dolphins: 785, ducks: 800, second: 859, clocks: 901, bed: 958, brain: 989, you: 1020 };
export const WAKES = [600, 626];                   // the lab sleeper jolts awake ("more often, and faster")
export const BEEPS = [522, 540, 556];             // beeps fly in at the right ear -> the left half
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
// 5-7: the sleep lab
const S5 = (f: number): Shot => { const u = glide((f - 124) / 66); return { pos: [LAB_X + 3.6 - 0.5 * u, 1.75, 3.3 - 0.4 * u], look: [LAB_X + 0.7, 0.95, -1.3], fov: 56, roll: 0.02 }; };
const S6 = (f: number): Shot => { const u = (f - 190) / 60; return { pos: [LAB_X + 1.45 - 0.2 * u, 1.55, 0.9 - 0.2 * u], look: [LAB_X + 0.35, 0.85, -1.9], fov: 50, roll: -0.03 }; };
const S7 = (f: number): Shot => { const u = (f - 250) / 38; return { pos: [LAB_X + 1.0, 1.55, 1.9 - 0.3 * u], look: [LAB_X - 1.1, 1.35, -3.9], fov: 54, roll: 0.02 }; };
// 8-11: the brain
const S8 = (f: number): Shot => { const u = easeOut((f - 283) / 82); return { pos: [BRAIN_X + 0.3 - 0.3 * u, 1.7, 10 - 4.6 * u], look: [BRAIN_X, 1.55, 0], fov: 42, roll: 0.04 * (1 - u) }; };
const S9 = (f: number): Shot => { const u = (f - 365) / 75; return { pos: [BRAIN_X - 1.5 + 0.2 * u, 1.95, 4.4 - 0.3 * u], look: [BRAIN_X - 0.45, 1.55, 0], fov: 44, roll: -0.03 }; };
const S10 = (f: number): Shot => { const u = (f - 440) / 72; return { pos: [BRAIN_X + 1.5 - 0.2 * u, 1.95, 4.4 - 0.3 * u], look: [BRAIN_X + 0.45, 1.55, 0], fov: 44, roll: 0.03 }; };
const S11 = (f: number): Shot => { const u = (f - 512) / 70; return { pos: [BRAIN_X + 3.4 - 0.4 * u, 1.9, 4.6 - 0.2 * u], look: [BRAIN_X + 0.3, 1.55, 0], fov: 50, roll: 0.02 }; };
// 12: the lab: the sleeper jolts awake, twice
const S12 = (f: number): Shot => { const u = (f - 578) / 77; return { pos: [LAB_X + 1.9 - 0.2 * u, 1.45, 1.3 - 0.2 * u], look: [LAB_X + 0.1, 1.0, -1.6], fov: 52, roll: 0.02 }; };
// 13-14: the night watchman patrols the hotel room
const S13 = (f: number): Shot => { const w = WATCH_PATH(f); return { pos: [w[0] - 1.6, 0.75, w[2] + 1.9], look: [w[0] + 0.1, 0.45, w[2] - 0.3], fov: 56, roll: 0.03 }; };
const S14 = (f: number): Shot => { const u = (f - 720) / 60; return { pos: [1.15 - 0.15 * u, 0.95, 1.45 - 0.1 * u], look: [2.45, 0.75, -0.25], fov: 54, roll: -0.02 }; };
// 15: the sea at night: dolphins and a row of ducks
const S15 = (f: number): Shot => { const u = (f - 776) / 69; return { pos: [SEA_X - 0.4 + 0.8 * u, 1.3, 6.2 - 0.4 * u], look: [SEA_X, 0.6, -2], fov: 52, roll: 0.02 }; };
// 16: night two: the watchman yawns, clocks off and leaves by the door; he sleeps
const S16 = (f: number): Shot => { const u = (f - 841) / 84; return { pos: [2.5 - 0.2 * u, 1.65, -1.4 + 0.2 * u], look: [-0.3, 0.75, 1.1], fov: 56, roll: 0.02 }; };
// 17: top-down again (echo of shot 1): fast asleep, smiling
const S17 = (f: number): Shot => { const u = (f - 925) / 50; return { pos: [0.55, 2.4 - 0.05 * u, -0.95 - 0.1 * u], look: [0.4, 0.75, -2.35], fov: 58, roll: 0.02 }; };
// 18: the nightstand: the watchman, off duty, tips his cap; the lamp goes out
const S18 = (f: number): Shot => { const u = glide((f - 975) / 75); return { pos: [0.55 + 0.1 * u, 1.15 + 0.15 * u, -1.25 + 0.35 * u], look: [1.2, 0.85, -2.6], fov: 50, roll: -0.02 }; };

const CAMS: Record<number, Key[]> = { 1: [{ f: 0, s: S1 }], 2: [{ f: 28, s: S2 }], 3: [{ f: 60, s: S3 }], 4: [{ f: 100, s: S4 }], 5: [{ f: 124, s: S5 }],
  6: [{ f: 190, s: S6 }], 7: [{ f: 250, s: S7 }], 8: [{ f: 283, s: S8 }], 9: [{ f: 365, s: S9 }], 10: [{ f: 440, s: S10 }], 11: [{ f: 512, s: S11 }],
  12: [{ f: 578, s: S12 }], 13: [{ f: 655, s: S13 }], 14: [{ f: 720, s: S14 }], 15: [{ f: 776, s: S15 }], 16: [{ f: 841, s: S16 }], 17: [{ f: 925, s: S17 }],
  18: [{ f: 975, s: S18 }] };

const KICKS: [number, number][] = [[T(SIT_UP), 0.45], [T(W.cant), 0.25], [T(W.see), 0.35], [T(W.strange), 0.3], [T(BEEPS[0]), 0.3], [T(WAKES[0]), 0.4], [T(WAKES[1]), 0.4], [T(W.clocks), 0.25]];
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
export const DOF: Dof[] = [
  { f: 0, cInf: 9, focus: () => [0.4, 0.85, -2.4] },
  { f: 28, cInf: 15, focus: () => MINT },
  { f: 60, cInf: 9, focus: () => [0.4, 1.45, -2.1] },
  { f: 100, cInf: 5, focus: () => [0.0, 1.0, -0.4] },
  { f: 128, cInf: 4 },
  { f: 190, cInf: 10, focus: () => [SLEEPER_LIE[0], 0.9, -2.0] },
  { f: 250, cInf: 5 },
  { f: 288, cInf: 0 },
  { f: 582, cInf: 8, focus: () => [SLEEPER_SIT[0], 1.5, SLEEPER_SIT[2]] },
  { f: 655, cInf: 10, focus: (f) => { const w = WATCH_PATH(f); return [w[0], 0.7, w[2]]; } },
  { f: 720, cInf: 9, focus: () => [2.3, 0.75, -0.3] },
  { f: 780, cInf: 0 },
  { f: 845, cInf: 4 },
  { f: 925, cInf: 9, focus: () => [0.4, 0.85, -2.4] },
  { f: 975, cInf: 11, focus: () => [1.3, 0.95, -2.62] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  return { cInf: DOF[i].cInf, focus: DOF[i].focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
