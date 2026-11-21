// "Before Alarm Clocks, People Paid Someone to Wake Them Up" - the story timeline: one entry per camera angle (Knackery
// pacing: a new angle on almost every phrase). Frame = 1/30 s of the cleaned Loyal voiceover (knock-short/voice/clean.wav,
// 48.95 s, padded to 49.2 s). The film LOOPS by its words: it ends on "...just remember:" and the restart answers it:
// "Two hundred years ago, most workers couldn't afford an alarm clock."
export const FPS = 30;
export const TOTAL = 1476;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const T = (f: number) => f / FPS;
const fr = (s: number) => Math.round(s * FPS);
/** 0 before a, 1 after b, smooth in between */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

// ---------------- sets (each its own patch of the one world, far apart) ----------------
export type SetName = "shop" | "street" | "bed" | "gate" | "london" | "attic" | "seventies" | "modern";
export const ORG: Record<SetName, V3> = {
  shop: [0, 0, 0], street: [3000, 0, 0], bed: [6000, 0, 0], gate: [9000, 0, 0], london: [12000, 0, 0], attic: [15000, 0, 0], seventies: [18000, 0, 0], modern: [21000, 0, 0],
};
export const INDOOR: Record<SetName, boolean> = { shop: false, street: false, bed: true, gate: false, london: false, attic: true, seventies: false, modern: true };
export const at = (s: SetName, x: number, y: number, z: number): V3 => [ORG[s][0] + x, ORG[s][1] + y, ORG[s][2] + z];

export type Light = "day" | "golden" | "night" | "indoor" | "dim";
export type ShotDef = { id: number; a: number; b: number; set: SetName; light: Light; name: string; sunAz?: number; sunEl?: number; fog?: [number, number] };
// [start s (a word onset), set, light, name]
const PLAN: [number, SetName, Light, string][] = [
  [0.0, "shop", "golden", "two hundred years ago: a worker at the clockmaker's window (loop frame)"],
  [2.08, "shop", "golden", "couldn't afford an alarm clock (the clock and its tag)"],
  [3.77, "bed", "night", "so how did they wake up for work? (snoring)"],
  [5.62, "street", "night", "they paid a stranger (he walks in)"],
  [6.75, "street", "night", "to hit their window (the pole taps the glass)"],
  [7.86, "street", "night", "with a stick (deadpan)"],
  [8.74, "street", "night", "this was a real job"],
  [10.31, "street", "night", "the knocker-upper (title)"],
  [11.34, "street", "night", "in Britain's mill towns (aerial)"],
  [12.69, "gate", "golden", "shifts started before sunrise (into the mill)"],
  [14.68, "gate", "golden", "and if you were late (the gates close)"],
  [15.62, "gate", "golden", "you lost pay"],
  [16.62, "street", "night", "every morning he walked the dark streets"],
  [19.72, "street", "night", "with a long pole"],
  [20.85, "bed", "night", "tapping on bedroom windows (from inside)"],
  [22.49, "street", "night", "and they didn't leave"],
  [23.38, "street", "night", "until you showed up at the glass"],
  [25.18, "london", "night", "in London (the docks)"],
  [25.89, "london", "night", "Mary Smith"],
  [26.6, "london", "night", "skipped the pole"],
  [27.5, "london", "night", "she used a pea shooter"],
  [28.9, "london", "night", "every morning she fired dried peas"],
  [31.17, "london", "night", "at her customers' windows"],
  [32.48, "london", "night", "sixpence a week"],
  [33.53, "street", "night", "but here's the question everyone asks"],
  [35.5, "street", "night", "who woke up the knocker-upper?"],
  [37.05, "street", "night", "nobody."],
  [37.61, "street", "night", "they worked all night"],
  [38.75, "attic", "indoor", "and slept during the day"],
  [40.04, "shop", "day", "cheap alarm clocks"],
  [41.5, "street", "golden", "finally put them out of work"],
  [42.52, "seventies", "day", "but in some towns they were still knocking"],
  [44.69, "seventies", "day", "in the 1970s"],
  [45.86, "modern", "indoor", "next time you hate your alarm clock"],
  [48.2, "modern", "indoor", "just remember"],
];
export const SHOTS: ShotDef[] = PLAN.map(([s, set, light, name], i) => ({
  id: i + 1, a: fr(s), b: i + 1 < PLAN.length ? fr(PLAN[i + 1][0]) : TOTAL, set, light, name,
  // golden shots: the low sun from behind the lens lights the facades warm (instead of backlighting them)
  ...(light === "golden" ? { sunAz: set === "street" ? 125 : 155, sunEl: 14 } : {}),
}));
export const FLASH_AT = -100;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// ---------------- transitions (STYLE_BIBLE: the reference almost never hard-cuts) ----------------
// 6 reference videos, 10,175 frames: ffmpeg finds 2 hard cuts in total. A new angle arrives as a camera MOVE (same
// place: the camera flies from the old framing to the new one, ~10-14 f, smootherstep so the speed peaks mid-move, with
// motion blur) or a short DISSOLVE (new place: 6-8 f crossfade). "cut" is kept for the rare deliberate smash cut.
export type Trans = "move" | "dissolve" | "cut";
export const MOVE_N = 12, DIS = 7;
/** per-shot override of how the shot is entered (id -> kind); everything else follows the default rule */
const TRANS_OVR: Record<number, Trans> = {};
export const transOf = (id: number): Trans =>
  TRANS_OVR[id] ?? (id === 1 ? "cut" : SHOTS[id - 1].set === SHOTS[id - 2].set ? "move" : "dissolve");
export type Layer = { id: number; alpha: number; v: number };
/** the old place stays underneath while the new one fades in over it for DIS frames */
export const layersAt = (f: number): Layer[] => {
  const s = shotAt(f);
  if (s.id > 1 && transOf(s.id) === "dissolve" && f < s.a + DIS)
    return [{ id: s.id - 1, alpha: 1, v: 0 }, { id: s.id, alpha: smooth((f - s.a + 1) / (DIS + 1)), v: 0 }];
  return [{ id: s.id, alpha: 1, v: 0 }];
};

// ---------------- layouts (local coords; world.ts, cast.ts and the cameras share these) ----------------
/** the terraced streets (street / london / seventies): front facades at z FZ, pavement up to the curb at z CZ (height PH),
 *  the hero house's upstairs bedroom window centred at (WX, WY) with its glass at z WZ */
export const FZ = -6.0, CZ = -4.4, PH = 0.15, WX = 1.0, WY = 4.1, WZ = -6.06, WW = 1.0, WH = 1.25;
/** where the knocker-upper stands to reach the hero window (on the pavement) */
export const KU: V3 = [2.05, PH, -4.65];
/** Mary Smith in the London street (on the road) */
export const MARY: V3 = [2.4, 0, -2.9];
/** the shop: glass at z SGZ, the hero alarm clock on its stand */
export const SGZ = -3.62, CLOCK: V3 = [0.0, 1.32, -3.9];
/** the bedrooms (bed, attic, modern): bed along x, head end at x BX0; mattress top BY */
export const BY = 0.56, BZ = -1.85, BX0 = -2.12, BX1 = 0.32;
/** the sleeper's head on the pillow (centre) */
export const HEADX = -1.45, HEADY = BY + 0.47;
export const WIN_B: V3 = [-0.55, 1.75, -2.37]; // bedroom window centre (glass) in the bed set
/** the mill gate: facade z GTZ, gate half-width GW */
export const GTZ = -8.0, GW = 2.0;

export const P = {
  worker: [0.95, PH, -2.55] as V3,
  foreman: [-1.25, 0, -7.3] as V3, late: [0.9, 0, -6.5] as V3,
};

// ---------------- the pole and the peas, as functions of narration time ----------------
/** tap: how far the pole tip is drawn back from the glass (0 = touching, 1 = 7 cm back); taps 2.6 a second */
export const tapAt = (t: number) => { const k = Math.sin(t * 2 * Math.PI * 2.6); return k > 0 ? k : 0; };
/** the knocker-upper's pole: "up" (tip on the hero window), "carry" (held upright as he walks), "lean" (against the wall) */
export const poleMode = (id: number): "up" | "carry" | "lean" | "none" =>
  [5, 6, 7, 8, 14, 15, 16, 17, 25, 26, 27, 28, 32, 33].includes(id) ? "up" : [4, 13, 31].includes(id) ? "carry" : id === 29 ? "lean" : "none";

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
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
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
type CuOpt = { fov?: number; roll?: number; rate?: number; orbit?: number };
/** orbit framing around a set-local look point: d metres away, az degrees (0 = camera on the +z side, + = to the right), dy above it.
 *  STYLE_BIBLE: the reference camera is never locked off (static <10 % of frames): every framing pushes in (rate, ~0.3 %/f)
 *  AND drifts around its subject (orbit, deg/frame; default 0.08 swinging back toward the front). orbit: 0 locks it. */
const cu = (s: SetName, look: V3, d: number, az: number, dy: number, f0: number, o: CuOpt = {}) => (f: number): Shot => {
  const orb = o.orbit ?? (az > 0 ? -0.08 : 0.08);
  const L = at(s, look[0], look[1], look[2]), a = ((az + orb * Math.max(0, f - f0)) * Math.PI) / 180;
  return dolly([L[0] + d * Math.sin(a), L[1] + dy, L[2] + d * Math.cos(a)], L, pushK(f, f0, o.rate ?? 0.003), { fov: o.fov ?? 36, roll: o.roll ?? 0 });
};
/** a straight track from pos0/look0 to pos1/look1 over n frames (smooth) */
const track = (s: SetName, p0: V3, l0: V3, p1: V3, l1: V3, f0: number, n: number, fov = 40, roll = 0) => (f: number): Shot => {
  const u = smooth((f - f0) / n), L = (a: V3, b: V3): V3 => at(s, lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));
  return { pos: L(p0, p1), look: L(l0, l1), fov, roll };
};
const loc = (s: SetName, p: V3): V3 => at(s, p[0], p[1], p[2]);
/** head centre above the feet (standing card) */
const H = 1.42;
const head = (p: V3, dy = 0): V3 => [p[0], p[1] + H + dy, p[2]];
const S0 = (id: number) => SHOTS[id - 1].a;
const N = (id: number) => SHOTS[id - 1].b - SHOTS[id - 1].a;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const WIN: V3 = [WX, WY, WZ];

/** where the walking knocker-upper is in shots 4, 13 and 31 (x along the pavement) */
export const walkX = (id: number, t: number) => id === 4 ? lerp(-3.4, KU[0], ramp(t, 5.62, 6.7)) : id === 13 ? lerp(-5.5, -1.5, (t - 16.62) / 3.1)
  : id === 31 ? lerp(KU[0], 4.6, (t - 41.5) / 1.02) : KU[0];

const CAMS: Record<number, Key[]> = {
  // 1 the loop frame: dusk, the clockmaker's bow window, the worker gazing in (slow push)
  1: [{ f: 0, s: (f) => dolly(loc("shop", [3.2, 1.75, 2.6]), loc("shop", [0.15, 1.35, -3.4]), pushK(f, 0, 0.0035), { fov: 44 }) }],
  // 2 the clock behind the glass, its huge price tag, his face beside it
  2: [{ f: S0(2), s: cu("shop", add(CLOCK, [0.32, -0.05, 0.7]), 1.6, 14, 0.1, S0(2), { fov: 36, rate: 0.004 }) }],
  // 3 the sleeper, snoring
  3: [{ f: S0(3), s: cu("bed", [-1.25, 1.12, BZ], 2.6, 8, 0.25, S0(3), { fov: 40, rate: 0.004 }) }],
  // 4 the night street: he walks in under the hero window (low, wide)
  4: [{ f: S0(4), s: (f) => dolly(loc("street", [3.4, 1.1, 0.6]), loc("street", [0.2, 2.3, -5.4]), pushK(f, S0(4), 0.002), { fov: 50, roll: -0.02 }) }],
  // 5 up at the window: the tip taps the glass
  5: [{ f: S0(5), s: cu("street", add(WIN, [0.1, -0.1, 0.1]), 2.6, 32, -1.0, S0(5), { fov: 38, rate: 0.004 }) }],
  // 6 with a stick: deadpan close-up
  6: [{ f: S0(6), s: cu("street", head(KU, -0.25), 2.4, -16, 0.1, S0(6), { fov: 36, rate: 0.005 }) }],
  // 7 this was a real job: medium, pole to window in frame
  7: [{ f: S0(7), s: cu("street", [1.6, 2.2, -5.2], 5.6, 28, 0.1, S0(7), { fov: 44, rate: 0.002 }) }],
  // 8 the knocker-upper: title punch-in
  8: [{ f: S0(8), s: cu("street", head(KU, -0.15), 3.0, 8, 0.15, S0(8), { fov: 38, rate: 0.008 }) }],
  // 9 aerial over the terraces toward the smoking mills
  9: [{ f: S0(9), s: track("street", [4, 20, 6], [-3, 11, -45], [2, 19.5, 3], [-4, 11, -49], S0(9), N(9), 46) }],
  // 10 the mill gate at dawn: workers stream in, the clock reads 5:59
  10: [{ f: S0(10), s: (f) => dolly(loc("gate", [-5.2, 1.7, 3.2]), loc("gate", [1.2, 3.2, -8.0]), pushK(f, S0(10), 0.002), { fov: 48 }) }],
  // 11 the gates swing shut, a latecomer running
  11: [{ f: S0(11), s: (f) => dolly(loc("gate", [-3.6, 1.6, 0.6]), loc("gate", [1.6, 1.6, -6.4]), pushK(f, S0(11), 0.002), { fov: 46 }) }],
  // 12 you lost pay: the foreman and the latecomer, coins flying off
  12: [{ f: S0(12), s: cu("gate", [-0.05, 1.3, -6.95], 5.2, -6, 0.15, S0(12), { fov: 40, rate: 0.004 }) }],
  // 13 walking the dark streets: track alongside him
  13: [{ f: S0(13), s: track("street", [-3.6, 1.5, -1.2], [-5.0, 1.45, -4.7], [0.4, 1.5, -1.2], [-1.0, 1.45, -4.7], S0(13), N(13), 42) }],
  // 14 with a long pole: low angle up the pole to the window
  14: [{ f: S0(14), s: track("street", [3.6, 0.55, -2.6], [2.2, 1.6, -4.7], [3.4, 0.6, -2.7], [1.3, 3.6, -5.8], S0(14), N(14), 46, 0.04) }],
  // 15 from inside the bedroom: the tip taps, the sleeper stirs
  15: [{ f: S0(15), s: (f) => dolly(loc("bed", [-0.55, 1.35, 1.0]), loc("bed", [-1.0, 1.25, -2.3]), pushK(f, S0(15), 0.003), { fov: 50 }) }],
  // 16 and they didn't leave: arms crossed, waiting
  16: [{ f: S0(16), s: cu("street", head(KU, -0.4), 2.9, 20, 0.0, S0(16), { fov: 38, rate: 0.004 }) }],
  // 17 until you showed up at the glass: the sleepy face at the window
  17: [{ f: S0(17), s: cu("street", add(WIN, [0.05, -0.1, 0]), 2.8, 20, -0.9, S0(17), { fov: 38, rate: 0.004 }) }],
  // 18 London: the docks at the end of the street, fog
  18: [{ f: S0(18), s: (f) => dolly(loc("london", [-6.5, 2.4, 3.5]), loc("london", [6.0, 3.4, -5.0]), pushK(f, S0(18), 0.002), { fov: 50 }) }],
  // 19 Mary Smith walks in
  19: [{ f: S0(19), s: cu("london", head(MARY, -0.3), 3.8, -18, 0.1, S0(19), { fov: 40, rate: 0.003 }) }],
  // 20 skipped the pole: she passes the pole leaning on the wall
  20: [{ f: S0(20), s: cu("london", [1.0, 1.35, -4.3], 4.6, 30, 0.3, S0(20), { fov: 42, rate: 0.003 }) }],
  // 21 she used a pea shooter: close-up
  21: [{ f: S0(21), s: cu("london", head(MARY, 0.0), 2.3, 18, 0.05, S0(21), { fov: 36, rate: 0.006 }) }],
  // 22 she fired dried peas: over her shoulder up to the window
  22: [{ f: S0(22), s: track("london", [3.6, 1.6, 3.2], [1.75, 2.75, -4.5], [3.5, 1.65, 2.9], [1.7, 2.9, -4.6], S0(22), N(22), 48) }],
  // 23 at her customers' windows: the glass, the peas ping, lights come on
  23: [{ f: S0(23), s: cu("london", [0.0, 5.6, WZ], 10.0, 10, -3.5, S0(23), { fov: 44, rate: 0.002 }) }],
  // 24 sixpence a week
  24: [{ f: S0(24), s: cu("london", head(MARY, -0.15), 2.5, 12, 0.05, S0(24), { fov: 36, rate: 0.005 }) }],
  // 25 here's the question: the street, neighbours at their windows
  25: [{ f: S0(25), s: (f) => dolly(loc("street", [2.6, 2.0, 5.2]), loc("street", [1.2, 2.2, -5.4]), pushK(f, S0(25), 0.003), { fov: 50 }) }],
  // 26 who woke up the knocker-upper?
  26: [{ f: S0(26), s: cu("street", head(KU, -0.3), 2.6, -22, 0.25, S0(26), { fov: 38, rate: 0.004 }) }],
  // 27 nobody. (deadpan, punch-in)
  27: [{ f: S0(27), s: cu("street", head(KU, -0.2), 1.9, 4, 0.0, S0(27), { fov: 36, rate: 0.01 }) }],
  // 28 they worked all night: wide, the moon
  28: [{ f: S0(28), s: (f) => dolly(loc("street", [-3.8, 1.2, 3.2]), loc("street", [1.6, 3.4, -5.6]), pushK(f, S0(28), 0.002), { fov: 52, roll: 0.02 }) }],
  // 29 and slept during the day: sun through the window, Zzz
  29: [{ f: S0(29), s: cu("attic", [-1.2, 1.12, BZ], 2.7, -8, 0.25, S0(29), { fov: 42, rate: 0.004 }) }],
  // 30 cheap alarm clocks: the tray in the window, ringing
  30: [{ f: S0(30), s: cu("shop", [0.0, 1.05, -4.0], 3.0, -8, 0.35, S0(30), { fov: 40, rate: 0.004 }) }],
  // 31 out of work: he walks off into the sunrise
  31: [{ f: S0(31), s: (f) => dolly(loc("street", [8.4, 1.35, -1.8]), loc("street", [2.4, 1.6, -5.0]), pushK(f, S0(31), 0.002), { fov: 46 }) }],
  // 32 the 1970s: still knocking
  32: [{ f: S0(32), s: (f) => dolly(loc("seventies", [5.4, 1.6, 2.0]), loc("seventies", [1.3, 2.7, -5.2]), pushK(f, S0(32), 0.003), { fov: 46 }) }],
  // 33 in the 1970s: the man at the window waves
  33: [{ f: S0(33), s: cu("seventies", add(WIN, [-0.05, -0.15, 0]), 3.0, 16, -0.8, S0(33), { fov: 40, rate: 0.004 }) }],
  // 34 today: the alarm clock rings, he groans
  34: [{ f: S0(34), s: cu("modern", [-1.78, 1.12, BZ + 0.05], 2.4, 6, 0.25, S0(34), { fov: 40, rate: 0.004 }) }],
  // 35 just remember: he sits up, finger raised
  35: [{ f: S0(35), s: cu("modern", [-0.65, 1.2, BZ], 2.2, -8, 0.05, S0(35), { fov: 38, rate: 0.005 }) }],
};
// impact kicks: image offset flips sign every frame and decays over 7 f
const KICKS: [number, number][] = [[10.42, 0.6], [33.65, 0.5], [37.05, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number, _v = 0): Cam => {
  let c = run(CAMS[id], f);
  // "move" transition: fly from where the previous shot's camera is now to this shot's camera (speed peaks mid-move)
  if (transOf(id) === "move") { const a0 = SHOTS[id - 1].a; if (f < a0 + MOVE_N) c = mixC(run(CAMS[id - 1], f), c, glide((f - a0 + 1) / MOVE_N)); }
  const a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- depth of field (STYLE_BIBLE: backgrounds 4-10x softer than the subject in every reference) ----------------
/** blur-disc radius (px at 1080x1920) of things at infinity, per shot id; focus = the camera's look point unless FOCUS has one */
export const DOF_DEFAULT = 12;
const DOF_OVR: Record<number, number> = {};
const FOCUS: Record<number, (f: number) => V3> = {};
export const dofAt = (id: number, _f: number) => ({ cInf: DOF_OVR[id] ?? DOF_DEFAULT, focus: FOCUS[id] as undefined | ((f: number) => V3) });
