// The 18 shots of the Beirut camp film as DATA, on a 55 BPM grid (see next/niche-examples/4-psychology-beirut-storyboard.md).
// Every cut is on a beat; every camera move runs the whole shot. Ground-level shots look toward +z (the cabins stand
// there); overhead shots look straight down at the field centre (0, 0, 10). Nothing here is random: jitter is hashed.
import type { CharacterSpec, FaceState, HandPropKind, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { h1 } from "../inkbeat/core/kit";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { BLUE, RED, RESEARCHER, RELIGION, STAFF, TEAM, boy } from "./cast";
import { BEAT, TOTAL_BEATS, WORDS } from "./timing.gen";
import type { World } from "./world";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
const punch = (u: number) => 0.55 * easeOut(u * 2.2) + 0.45 * u;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const mix = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const bt = (b: number) => b * BEAT;
const C = (pos: V3, look: V3, fov: number, roll = 0): Cam => ({ pos, look, fov, roll });
const move = (a: Cam, b: Cam, ease: (u: number) => number = smooth) => (u: number): Cam => {
  const e = ease(u);
  return { pos: mix(a.pos, b.pos, e), look: mix(a.look, b.look, e), fov: lerp(a.fov, b.fov, e), roll: lerp(a.roll ?? 0, b.roll ?? 0, e) };
};
const J = (i: number, k: number) => h1(i * 7.31 + k * 3.17) - 0.5;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** onset (s) of the nth occurrence of a word of the voice-over (never type a time) */
export const tw = (word: string, nth = 1): number => {
  let k = 0;
  for (const [txt, t] of WORDS as unknown as [string, number, number][]) if (norm(txt) === norm(word) && ++k === nth) return t;
  throw new Error(`word not in the voice-over: ${word} #${nth}`);
};

// ------------------------------------------------------------------ types
export type Mark = { glyph: "c" | "m" | "?"; t0: number; rise?: boolean };
export type Actor = {
  spec: CharacterSpec;
  p: V3;
  yaw: number;
  pose?: BodyPose;
  face?: FaceState;
  hold?: HandPropKind | null;
  holdSide?: "L" | "R";
  /** do not turn toward the camera */
  free?: boolean;
  mark?: Mark;
};
export type Chip = { shot: number; text: string; x: number; y: number; t0: number; t1?: number; bg: string; fg: string; size?: number; icon?: "c" | "m"; flat?: boolean };
export type Beat = {
  id: number;
  b: number;
  len: number;
  mood: "day" | "archive";
  about: string;
  cam: (u: number) => Cam;
  actors: (t: number, u: number) => Actor[];
  world: (t: number, u: number) => World;
  focus: (u: number) => V3;
  blur: number;
  /** size in px (of 1080) of the floating marks */
  markPx?: number;
};

// ------------------------------------------------------------------ people
const PLAIN = range(22).map((i) => boy(i));
const OLD = range(22).map((i) => boy(i, undefined, true));
const VEST = range(18).map((i) => boy(i, TEAM(i)));
const toned = (i: number, top: string): CharacterSpec => {
  const s = boy(i, undefined, true);
  return { ...s, look: { ...s.look, colors: { ...s.look.colors, top } } };
};
const NEUTRAL: FaceState = {};
const SMILE: FaceState = { eyes: "open", mouth: "smile", brows: "raised" };
const GRIN: FaceState = { eyes: "open", mouth: "grin", brows: "raised" };
const GRIM: FaceState = { eyes: "squint", mouth: "flat", brows: "angry" };
const YELL: FaceState = { eyes: "squint", mouth: "yell", brows: "angry" };
const BLOW: FaceState = { eyes: "open", mouth: "o", brows: "raised" };
const crossed: BodyPose = { armL: [40, 125], armLFwd: 78, armR: [40, 125], armRFwd: 78 };
const walking = (t: number, i: number): BodyPose => ({ walk: t * 7 + i * 0.9 });
const yawTo = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);

// ------------------------------------------------------------------ formations
const LINE = (i: number): V3 => [-1.2, 0, 3 + i * 0.95];
const clump = (i: number): V3 => {
  const side = i % 2 === 0 ? -1 : 1;
  const k = Math.floor(i / 2);
  return [side * 3.2 + ((k % 3) - 1) * 1.5 + J(i, 1) * 0.5, 0, 10 + (Math.floor(k / 3) - 1) * 1.7 + J(i, 2) * 0.5];
};
const GRID = (c: number): V3 => [((c % 3) - 1) * 2.2, 0, 10 + (Math.floor(c / 3) - 2.5) * 2.0];
const SHUF = (i: number) => (i * 7 + 4) % 18;
const TEAM_ROW = (k: number): V3 => (k < 5 ? [(k - 2) * 0.8, 0, 11.2] : [(k - 5 - 1.5) * 0.8, 0, 10.0]);
const scatter = (i: number): V3 => {
  const side = i < 9 ? -1 : 1;
  const k = i % 9;
  return [side * 2.9 + ((k % 3) - 1) * 1.5 + J(i, 3) * 0.6, 0, 10 + (Math.floor(k / 3) - 1) * 2.3 + J(i, 4) * 0.6];
};
/** 22 boys spread through the yard (Poisson-ish, fixed) */
const YARD: V3[] = (() => {
  const pts: V3[] = [];
  for (let n = 0; pts.length < 22 && n < 4000; n++) {
    const p: V3 = [-3.3 + 6.6 * h1(n * 1.7 + 0.3), 0, 6.5 + 9.5 * h1(n * 2.9 + 1.1)];
    if (pts.every((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) > 1.3)) pts.push(p);
  }
  return pts;
})();
const GROUP = (i: number): V3 => {
  const side = i < 11 ? -1 : 1;
  const k = i < 11 ? i : i - 11;
  return [side * 3.2 + ((k % 3) - 1) * 1.2 + J(i, 5) * 0.4, 0, 10 + (Math.floor(k / 4) - 1) * 1.9 + J(i, 6) * 0.4];
};
/** a boy walking between two spots: position, yaw (toward where he walks, then `rest`) and whether he is moving */
const travel = (a: V3, b: V3, u: number, u0: number, du: number, rest: number) => {
  const e = smooth((u - u0) / du);
  const moving = e > 0.001 && e < 0.999;
  return { p: mix(a, b, e), yaw: moving ? yawTo(a, b) : e >= 0.999 ? rest : yawTo(a, b), moving };
};

// ------------------------------------------------------------------ the shots
const FIELD_C: V3 = [0, 1.0, 10];
const man = (p: V3, yaw: number, pose: BodyPose, extra: Partial<Actor> = {}): Actor => ({ spec: RESEARCHER, p, yaw, pose, free: true, ...extra });
const mkMan = (p: V3, yaw: number, pose: BodyPose = {}) => man(p, yaw, pose, { hold: "clipboard", holdSide: "L" });

const S01: Beat = {
  id: 1, b: 0, len: 2, mood: "day", about: "hook: eighteen boys in a line, one man pointing",
  cam: move(C([2.9, 1.4, -1.2], [-0.6, 1.0, 9.5], 52), C([2.4, 1.35, 0.1], [-0.6, 1.0, 9.5], 52)),
  actors: (t) => [
    mkMan([1.3, 0, 2.4], 0, { armR: [85, 4], armRFwd: 88 }),
    ...range(18).map((i) => ({ spec: PLAIN[i], p: LINE(i), yaw: PI / 2, free: true, face: i % 4 === 0 ? SMILE : NEUTRAL, pose: {} as BodyPose })),
  ],
  world: () => ({ set: "camp" }),
  focus: () => [0, 1.1, 5], blur: 1.0,
};
const S02: Beat = {
  id: 2, b: 2, len: 2, mood: "day", about: "overhead: the chalk line, the boys split into two clumps",
  cam: move(C([0, 30, 3], [0, 0, 10], 32, 0), C([0, 36, 2], [0, 0, 10], 32, -8)),
  actors: (t, u) => [
    mkMan([0, 0, 0.7], 0, {}),
    ...range(18).map((i) => {
      const w = travel(LINE(i), clump(i), u, 0.04 + i * 0.02, 0.5, PI);
      return { spec: PLAIN[i], p: w.p, yaw: w.yaw, pose: w.moving ? walking(t, i) : {}, free: true };
    }),
  ],
  world: (_t, u) => ({ set: "camp", chalk: [{ a: [0, 0, 1.5], b: [0, 0, 19], grow: smooth(u * 1.4) }] }),
  focus: () => FIELD_C, blur: 0.4,
};
const gridActors = (t: number, cellOf: (i: number) => V3, marks: (i: number) => Mark | undefined, face: FaceState = NEUTRAL): Actor[] =>
  range(18).map((i) => ({ spec: PLAIN[i], p: cellOf(i), yaw: PI, free: true, face, mark: marks(i), pose: {} as BodyPose } as Actor));
const S03: Beat = {
  id: 3, b: 4, len: 2, mood: "day", about: "overhead grid: ten crosses on beat 4, eight crescents on beat 5",
  cam: move(C([0, 24, 4], [0, 0, 10], 30), C([0, 21, 4], [0, 0, 10], 30)),
  actors: (t) => [
    mkMan([0, 0, 1.0], 0, {}),
    ...gridActors(t, (i) => GRID(i), (i) => {
      const k = RELIGION(i);
      const n = range(18).filter((j) => RELIGION(j) === k && j <= i).length;
      return { glyph: k, t0: k === "c" ? bt(4) + 0.045 * n : bt(5) + 0.045 * n };
    }),
  ],
  world: () => ({ set: "camp" }),
  focus: () => FIELD_C, blur: 0.4, markPx: 66,
};
const S04: Beat = {
  id: 4, b: 6, len: 1, mood: "day", about: "the boys swap places, badges travel with them",
  cam: move(C([0, 21, 4], [0, 0, 10], 30), C([0, 19.5, 4], [0, 0, 10], 30)),
  actors: (t, u) => [
    mkMan([0, 0, 1.0], 0, {}),
    ...range(18).map((i) => {
      const a = GRID(i);
      const b = GRID(SHUF(i));
      const e = smooth((u - 0.04) / 0.8);
      const bump = Math.sin(PI * e) * 0.9 * (i % 2 ? 1 : -1);
      const p: V3 = [lerp(a[0], b[0], e) + bump, 0, lerp(a[2], b[2], e)];
      return { spec: PLAIN[i], p, yaw: e > 0.01 && e < 0.99 ? yawTo(a, b) : PI, pose: e > 0.01 && e < 0.99 ? walking(t, i) : {}, free: true, mark: { glyph: RELIGION(i), t0: -9 } as Mark };
    }),
  ],
  world: () => ({ set: "camp" }),
  focus: () => FIELD_C, blur: 0.4, markPx: 62,
};
const team = (which: "R" | "B", t: number): Actor[] =>
  range(9).map((k) => {
    const i = which === "R" ? k : 9 + k;
    const p = TEAM_ROW(k);
    return { spec: VEST[i], p, yaw: PI, mark: { glyph: RELIGION(i), t0: (which === "R" ? bt(7) : bt(10)) + 0.04 * k }, face: k % 3 === 0 ? SMILE : NEUTRAL, pose: {} as BodyPose } as Actor;
  });
const S05: Beat = {
  id: 5, b: 7, len: 3, mood: "day", about: "the Red Genies: five crosses, four crescents",
  cam: move(C([0, 0.85, 1.4], [0, 1.15, 10.6], 50), C([0, 0.95, 3.0], [0, 1.2, 10.6], 50)),
  actors: (t) => team("R", t),
  world: () => ({ set: "camp" }),
  focus: () => [0, 1.2, 10.6], blur: 1.1, markPx: 68,
};
const S06: Beat = {
  id: 6, b: 10, len: 2, mood: "day", about: "the Blue Ghost, same layout, mirrored move",
  cam: move(C([0.9, 0.9, 3.0], [0, 1.2, 10.6], 50), C([-0.2, 0.9, 1.6], [0, 1.2, 10.6], 50)),
  actors: (t) => team("B", t),
  world: () => ({ set: "camp" }),
  focus: () => [0, 1.2, 10.6], blur: 1.1, markPx: 68,
};
const S07: Beat = {
  id: 7, b: 12, len: 2, mood: "day", about: "the researcher at his desk with an old report and an old photo",
  cam: move(C([0.6, 1.4, 7.0], [0, 0.95, 11.4], 46), C([0.3, 1.3, 8.1], [-0.1, 0.9, 11.4], 44)),
  actors: (t) => [man([0, 0, 12.3], PI, { armR: [60 + 4 * Math.sin(t * 2), 38], armRFwd: 62, armL: [10, 0] }, { face: { eyes: "open", mouth: "flat", brows: "neutral" }, hold: null })],
  world: () => ({ set: "office" }),
  focus: () => [0, 0.9, 11.3], blur: 1.2,
};

// ---- Oklahoma 1954 (the archive grade)
const S08: Beat = {
  id: 8, b: 14, len: 2, mood: "archive", about: "three adults in matching polos; one hides a notebook behind his back",
  cam: move(C([7, 8.5, -3.5], [0, 1.4, 11], 46), C([4.4, 1.5, 5.2], [0.2, 1.2, 11], 42)),
  actors: (t) => [
    { spec: STAFF[0], p: [-1.7, 0, 11], yaw: PI, face: SMILE, pose: { armL: [150 + 8 * Math.sin(t * 5), 20], armLFwd: 10 } },
    { spec: STAFF[1], p: [0, 0, 11.3], yaw: PI, face: SMILE, pose: {} },
    { spec: STAFF[2], p: [1.7, 0, 11], yaw: PI - 0.5, face: SMILE, pose: { armR: [22, 10], armRFwd: -75 }, hold: "book", holdSide: "R" },
  ],
  world: () => ({ set: "okla" }),
  focus: () => [0.4, 1.2, 11], blur: 0.9,
};
const S09: Beat = {
  id: 9, b: 16, len: 2, mood: "archive", about: "twenty-two boys step off the bus and stand apart",
  cam: move(C([-3.5, 1.5, 1.0], [0, 1.1, 10.5], 58), C([2.5, 1.5, 1.0], [0, 1.1, 10.5], 58)),
  actors: (t, u) =>
    range(22).map((i) => {
      const w = travel([-7.2 + (i % 2) * 0.6, 0, 6.0 + Math.floor(i / 2) * 0.6], YARD[i], u, (i / 22) * 0.3, 0.55, PI + J(i, 8) * 1.6);
      return { spec: OLD[i], p: w.p, yaw: w.yaw, pose: w.moving ? walking(t, i) : {}, free: true, face: NEUTRAL, mark: i % 3 === 0 ? ({ glyph: "?", t0: bt(16.7) + 0.09 * i } as Mark) : undefined };
    }),
  world: () => ({ set: "okla", bus: true }),
  focus: () => [0, 1.1, 10.5], blur: 0.9, markPx: 64,
};
const S10: Beat = {
  id: 10, b: 18, len: 1, mood: "archive", about: "overhead: a chalk line splits the boys into two groups",
  cam: move(C([0, 30, 3], [0, 0, 10], 32), C([0, 25, 4], [0, 0, 10], 32), punch),
  actors: (t, u) =>
    range(22).map((i) => {
      const w = travel(YARD[i], GROUP(i), u, 0.05, 0.8, PI);
      return { spec: OLD[i], p: w.p, yaw: w.yaw, pose: w.moving ? walking(t, i) : {}, free: true };
    }),
  world: (_t, u) => ({ set: "okla", chalk: [{ a: [0, 0, 1.5], b: [0, 0, 19], grow: smooth(u * 3) }] }),
  focus: () => FIELD_C, blur: 0.4,
};
const S11: Beat = {
  id: 11, b: 19, len: 2, mood: "archive", about: "a scoreboard and a trophy; the score ticks up",
  cam: move(C([0, 0.9, 2.0], [0, 1.5, 9.5], 50), C([0, 1.0, 3.4], [0, 1.7, 9.5], 50)),
  actors: (t) => [
    ...range(6).map((k) => ({ spec: toned(k, "#efe6d2"), p: [-4.6 + k * 0.9, 0, 16] as V3, yaw: PI, free: true, face: GRIN, pose: { armL: [150 + 10 * Math.sin(t * 6 + k), 10], armR: [150 + 10 * Math.sin(t * 6 + k + 1), 10] } as BodyPose })),
    ...range(6).map((k) => ({ spec: toned(6 + k, "#3b3d46"), p: [0.8 + k * 0.9, 0, 16.5] as V3, yaw: PI, free: true, face: NEUTRAL, pose: {} as BodyPose })),
  ],
  world: (t) => ({ set: "okla", score: t < bt(19.4) ? "0 : 0" : t < bt(20.2) ? "1 : 0" : "3 : 1" }),
  focus: () => [0, 1.7, 9.5], blur: 1.0,
};
const S12: Beat = {
  id: 12, b: 21, len: 2, mood: "archive", about: "two groups glare across the chalk line",
  cam: move(C([0, 1.2, 0.9], [0, 1.2, 10.5], 58), C([0, 1.2, 2.5], [0, 1.2, 10.5], 58)),
  actors: () =>
    range(8).map((i) => {
      const left = i < 4;
      const k = i % 4;
      return { spec: OLD[i], p: [(left ? -1 : 1) * (1.15 + (k % 2) * 0.8), 0, 9.6 + Math.floor(k / 2) * 1.3] as V3, yaw: left ? PI / 2 : -PI / 2, free: true, face: GRIM, pose: crossed };
    }),
  world: () => ({ set: "okla", chalk: [{ a: [0, 0, 4], b: [0, 0, 16], grow: 1 }] }),
  focus: () => [0, 1.2, 10.2], blur: 1.0,
};

// ---- back in Beirut
const S13: Beat = {
  id: 13, b: 23, len: 3, mood: "day", about: "the Beirut boys, relaxed; badges float up over their heads",
  cam: move(C([-2.6, 1.2, 2.0], [-1.4, 1.25, 9.8], 56), C([2.6, 1.2, 2.0], [1.4, 1.25, 9.8], 56)),
  actors: (t) =>
    [1, 4, 6, 9, 11, 13, 15, 17].map((i, k) => ({
      spec: PLAIN[i],
      p: [-3.5 + k + J(k, 9) * 0.5, 0, 9.2 + 0.9 * Math.sin(k * 2.1) + J(k, 10) * 0.4] as V3,
      yaw: PI + (k % 2 ? 0.45 : -0.45) + J(k, 11) * 0.3,
      free: false,
      face: k % 3 === 1 ? GRIN : SMILE,
      pose: (k % 4 === 2 ? { armL: [140 + 8 * Math.sin(t * 4), 10] } : {}) as BodyPose,
      mark: { glyph: RELIGION(i), t0: tw("label") + 0.18 * k } as Mark,
    })),
  world: () => ({ set: "camp" }),
  focus: () => [0, 1.2, 9.6], blur: 1.1, markPx: 80,
};
const S14: Beat = {
  id: 14, b: 26, len: 2, mood: "day", about: "overhead, turning: a team line and a religion line",
  cam: (u) => {
    const th = (lerp(0, 38, smooth(u)) * PI) / 180;
    return C([7 * Math.sin(th), 31, 10 - 7 * Math.cos(th)], [0, 0, 10], 31);
  },
  actors: (t) => range(18).map((i) => ({ spec: VEST[i], p: scatter(i), yaw: PI, free: true, pose: { armL: [20 + 6 * Math.sin(t * 3 + i), 40] } as BodyPose, mark: { glyph: RELIGION(i), t0: bt(26) + 0.02 * i } as Mark })),
  world: (_t, u) => ({
    set: "camp",
    chalk: [
      { a: [0, 0, 3], b: [0, 0, 17], grow: smooth(u * 2.2), dash: 0.7 },
      { a: [-4.5, 0, 15.5], b: [4.5, 0, 4.5], grow: smooth((u - 0.3) * 2.2), dash: 0.7, color: "#ffd34d" },
    ],
  }),
  focus: () => FIELD_C, blur: 0.4, markPx: 62,
};
const ropeBoys = (t: number, k: number, spread: number, lean: number, face: FaceState, walk = false): Actor[] =>
  range(8).map((j) => {
    const red = j < 4;
    const n = j % 4;
    const x0 = (red ? -1 : 1) * (1.0 + n * 0.85);
    const x1 = (red ? -1 : 1) * (0.35 + n * 0.16);
    return {
      spec: VEST[red ? n : 9 + n],
      p: [lerp(x0, x1, spread), 0, 10 + J(j, 12) * 0.1] as V3,
      yaw: red ? PI / 2 : -PI / 2,
      free: true,
      face,
      pose: { armL: [75, 10], armLFwd: 88, armR: [75, 10], armRFwd: 88, lean: lean + 2 * Math.sin(t * 4 + j), ...(walk ? { walk: t * 8 + j } : {}) } as BodyPose,
    };
  });
const S15: Beat = {
  id: 15, b: 28, len: 2, mood: "day", about: "the competitions begin: a tug of war, the whistle",
  cam: move(C([0, 1.25, -3.5], [0, 1.2, 10], 55), C([0, 1.2, -2.0], [0, 1.2, 10], 55)),
  actors: (t) => [man([0.2, 0, 7.2], PI, { armR: [150, 105], armRFwd: 28 }, { face: BLOW, hold: null }), ...ropeBoys(t, 0, 0, -12, GRIM)],
  world: () => ({ set: "camp", rope: { a: [-3.7, 0.95, 10], b: [3.7, 0.95, 10] } }),
  focus: () => [0, 1.2, 10], blur: 0.8,
};
const S16: Beat = {
  id: 16, b: 30, len: 1, mood: "day", about: "the rope drops and both teams charge into a dust cloud",
  cam: move(C([0, 1.2, -2.0], [0, 1.2, 10], 55), C([0, 1.3, 2.0], [0, 1.3, 10], 50), punch),
  actors: (t, u) => ropeBoys(t, 0, smooth(u / 0.7), 16, YELL, true),
  world: (_t, u) => ({ set: "camp", dust: { p: [0, 0, 10], u: smooth((u - 0.15) / 0.7), s: 1.25 } }),
  focus: () => [0, 1.3, 10], blur: 0.8,
};
const S17: Beat = {
  id: 17, b: 31, len: 2, mood: "day", about: "overhead pull-back: badges rise out of the dust on both sides",
  cam: move(C([0, 22, 3.5], [0, 0, 10], 32), C([0, 31, 0], [0, 0, 10], 32)),
  actors: (t) =>
    range(18).map((i) => {
      const a = (i / 18) * 2 * PI + 0.2;
      const r = 3.0 + J(i, 13) * 0.6;
      const p: V3 = [Math.cos(a) * r, 0, 10 + Math.sin(a) * r];
      return { spec: VEST[i], p, yaw: yawTo(p, [0, 0, 10]), free: true, face: YELL, pose: { armL: [120 + 10 * Math.sin(t * 7 + i), 20], armR: [120 + 10 * Math.sin(t * 7 + i + 2), 20], lean: 14 } as BodyPose, mark: { glyph: RELIGION(i), t0: bt(31) + 0.1 * i, rise: true } as Mark };
    }),
  world: (_t, u) => ({ set: "camp", dust: { p: [0, 0, 10], u: 1, s: 1.3 }, chalk: [{ a: [-5.5, 0, 16], b: [5.5, 0, 4], grow: smooth(u * 3), dash: 0.7, color: "#ffd34d" }] }),
  focus: () => FIELD_C, blur: 0.4, markPx: 64,
};
const S18: Beat = {
  id: 18, b: 33, len: 2, mood: "day", about: "the last image: red against blue, nothing else",
  cam: move(C([0, 1.05, -1.6], [0, 1.2, 10], 56), C([0, 1.15, 1.6], [0, 1.2, 10], 54)),
  actors: (t) =>
    range(18).map((i) => {
      const red = i < 9;
      const k = i % 9;
      return {
        spec: VEST[i],
        p: [(red ? -1 : 1) * (1.0 + (k % 3) * 0.62), 0, 9.2 + Math.floor(k / 3) * 1.0] as V3,
        yaw: red ? PI / 2 : -PI / 2,
        free: true,
        face: YELL,
        pose: { armL: [115 + 6 * Math.sin(t * 5 + i), 15], armLFwd: 80, armR: [115 + 6 * Math.sin(t * 5 + i + 1), 15], armRFwd: 80, lean: 16 } as BodyPose,
      };
    }),
  world: () => ({ set: "camp" }),
  focus: () => [0, 1.2, 10], blur: 0.8,
};

export const BEATS: Beat[] = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18];

// ------------------------------------------------------------------ on-screen chips (2D, 1080 x 1920)
const INK = "#10121c";
const W = "#ffffff";
export const CHIPS: Chip[] = [
  { shot: 1, text: "18", x: 540, y: 300, t0: -0.4, bg: W, fg: INK, size: 190 },
  { shot: 2, text: "BEIRUT", x: 540, y: 300, t0: tw("Beirut."), bg: W, fg: INK, size: 84 },
  { shot: 3, text: "10", x: 290, y: 300, t0: bt(4), bg: W, fg: INK, size: 110, icon: "c" },
  { shot: 3, text: "8", x: 790, y: 300, t0: bt(5), bg: W, fg: INK, size: 110, icon: "m" },
  { shot: 5, text: "5 + 4", x: 540, y: 380, t0: tw("four"), bg: W, fg: INK, size: 84 },
  { shot: 5, text: "RED GENIES", x: 540, y: 270, t0: tw("Red"), bg: RED, fg: W, size: 90 },
  { shot: 6, text: "5 + 4", x: 540, y: 380, t0: tw("four", 2), bg: W, fg: INK, size: 84 },
  { shot: 6, text: "BLUE GHOST", x: 540, y: 270, t0: tw("Blue"), bg: BLUE, fg: W, size: 90 },
  { shot: 8, text: "OKLAHOMA 1954", x: 540, y: 290, t0: tw("Oklahoma,"), bg: W, fg: INK, size: 78 },
  { shot: 9, text: "22", x: 540, y: 300, t0: tw("twenty-two"), bg: W, fg: INK, size: 190 },
  { shot: 14, text: "TEAMS", x: 300, y: 270, t0: bt(26.6), bg: W, fg: INK, size: 62 },
  { shot: 14, text: "RELIGION", x: 770, y: 270, t0: bt(27.1), bg: "#ffe27a", fg: INK, size: 62 },
  { shot: 14, text: "?", x: 540, y: 900, t0: tw("which"), bg: "none", fg: W, size: 360, flat: true },
  { shot: 17, text: "✕", x: 540, y: 880, t0: tw("Not"), bg: "none", fg: "#e0402f", size: 520, flat: true },
  { shot: 18, text: "RED", x: 290, y: 300, t0: tw("Red", 2), bg: RED, fg: W, size: 120 },
  { shot: 18, text: "BLUE", x: 790, y: 300, t0: tw("Blue", 2), bg: BLUE, fg: W, size: 120 },
];

// ------------------------------------------------------------------ lookup
export const START = BEATS.map((s) => bt(s.b));
export const shotAt = (t: number) => {
  let k = BEATS.length - 1;
  for (let i = 0; i < BEATS.length; i++) if (t < bt(BEATS[i].b + BEATS[i].len)) {
    k = i;
    break;
  }
  const s = BEATS[k];
  const a = bt(s.b);
  const d = bt(s.len);
  return { shot: s, u: clamp((t - a) / d), ts: t - a, end: bt(s.b + s.len) };
};
export const SECONDS = bt(TOTAL_BEATS);
