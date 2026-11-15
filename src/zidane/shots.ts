// The 15 shots of the Zidane short as DATA on a 55 BPM grid (next/football-scripts/6-zidane-storyboard.md). The voice
// is the 1.15x take, not retimed: cuts sit on beats (phase 0.79 s) within 0.37 s of each line.
import type { CharacterSpec, FaceState, HandPropKind, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { h1 } from "../inkbeat/core/kit";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { ASSIST, BIG, FOURTH, REF, TEN, player } from "./cast";
import { BEAT, PHASE, SECONDS, SHOT_BEATS } from "./timing.gen";
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
const C = (pos: V3, look: V3, fov: number): Cam => ({ pos, look, fov, roll: 0 });
const move = (a: Cam, b: Cam, ease: (u: number) => number = smooth) => (u: number): Cam => {
  const e = ease(u);
  return { pos: mix(a.pos, b.pos, e), look: mix(a.look, b.look, e), fov: lerp(a.fov, b.fov, e), roll: 0 };
};
/** pose time on threes (10 Hz): limb geometry is rebuilt only when a pose changes */
const q = (t: number) => Math.round(t * 10) / 10;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
export const beatTime = (k: number) => (k === 0 ? 0 : PHASE + k * BEAT);

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: BodyPose; face?: FaceState; hold?: HandPropKind | null; holdSide?: "L" | "R"; free?: boolean };
export type Chip = { shot: number; text: string; x: number; y: number; t0: number; bg: string; fg: string; size?: number; flat?: boolean };
export type Beat = { id: number; mood: "floodlit" | "room"; cam: (u: number) => Cam; actors: (t: number, u: number) => Actor[]; world: (t: number, u: number) => World; focus: (u: number) => V3; blur: number };

const GRIM: FaceState = { eyes: "squint", mouth: "flat", brows: "angry" };
const HURT: FaceState = { eyes: "closed", mouth: "o", brows: "worried" };
const FLAT: FaceState = { eyes: "open", mouth: "flat", brows: "neutral" };
const DOWN: FaceState = { eyes: "half", mouth: "flat", brows: "worried" };
const YELL: FaceState = { eyes: "squint", mouth: "yell", brows: "raised" };
const run = (t: number, k = 0): BodyPose => ({ walk: q(t) * 9 + k });

/** squad players scattered around midfield (fixed) */
const SPOT = (i: number): V3 => [-14 + 30 * h1(i * 3.1 + 0.4), 0, -16 + 30 * h1(i * 1.7 + 2.2)];
const crowdOfPlayers = (t: number, n = 9): Actor[] =>
  range(n * 2).map((i) => ({ spec: player(i % 2 ? "IT" : "FR", i >> 1), p: SPOT(i), yaw: h1(i * 9.1) * 2 * PI, pose: run(t, i), free: true }));

const INC: V3 = [1.3, 0, 0]; // where it happens
const BIG_AT: V3 = [1.3, 0, 0.9];
const lying = (u: number): BodyPose => ({ lean: -82 * smooth(u), armL: [60, 20], armR: [60, 20] });

const S: Beat[] = [
  { id: 1, mood: "floodlit", cam: move(C([0.4, 1.55, 1.4], [0, 1.5, 8], 42), C([0.3, 1.5, 2.6], [0, 1.5, 8], 42)),
    actors: (t, u) => [
      { spec: TEN, p: [0, 0, lerp(8.2, 7.0, u)], yaw: PI, pose: { walk: q(t) * 6 }, face: GRIM, free: true },
      ...range(6).map((i) => ({ spec: player(i % 2 ? "IT" : "FR", i), p: [-9 + 3.6 * i, 0, 24 + 6 * h1(i)] as V3, yaw: PI + h1(i * 2) - 0.5, pose: run(t, i), free: true })),
    ],
    world: () => ({ set: "stadium" }), focus: () => [0, 1.6, 7.5], blur: 1.6 },
  { id: 2, mood: "floodlit", cam: move(C([0.35, 1.4, -2.3], [0.05, 1.15, 0], 34), C([0.3, 1.35, -1.8], [0.05, 1.12, 0], 34), punch),
    actors: () => [{ spec: REF, p: [0, 0, 0], yaw: PI, pose: { armR: [38, 96], armRFwd: 82 }, hold: "card", holdSide: "R", face: FLAT, free: true }],
    world: () => ({ set: "stadium" }), focus: () => [0, 1.1, 0], blur: 2.2 },
  { id: 3, mood: "floodlit", cam: move(C([0, 30, -50], [2, 0, 2], 40), C([5, 5, -21], [2, 1, 2], 40)),
    actors: (t) => [{ spec: TEN, p: INC, yaw: PI / 2, pose: run(t), free: true }, { spec: BIG, p: BIG_AT, yaw: PI / 2, pose: run(t, 1), free: true }, ...crowdOfPlayers(t)],
    world: () => ({ set: "stadium" }), focus: () => [2, 1, 2], blur: 0.5 },
  { id: 4, mood: "floodlit", cam: (u) => C([lerp(2.6, 4.2, u), 1.4, -3.4], [lerp(-1.2, 1.0, u), 1.3, 0.4], 44),
    actors: (t, u) => [
      { spec: TEN, p: [lerp(-1.4, 1.3, u), 0, 0], yaw: PI / 2, pose: run(t), face: GRIM, free: true },
      { spec: BIG, p: [lerp(-1.8, 0.9, u), 0, 0.9], yaw: PI / 2, pose: { ...run(t, 1.5), armL: [70, 18], armLFwd: 30 }, face: FLAT, free: true },
    ],
    world: () => ({ set: "stadium" }), focus: () => [0.5, 1.4, 0.4], blur: 1.4 },
  { id: 5, mood: "floodlit", cam: move(C([-3.6, 1.45, 0.45], [1.3, 1.45, 0.45], 40), C([-2.4, 1.45, 0.45], [1.3, 1.5, 0.45], 40)),
    actors: (_t, u) => {
      const turn = smooth(u / 0.3);
      const hit = smooth((u - 0.3) / 0.15) * (1 - smooth((u - 0.6) / 0.3));
      return [
        { spec: TEN, p: INC, yaw: lerp(PI / 2, 0, turn), pose: { lean: 24 * hit, headNod: 28 * hit }, face: GRIM, free: true },
        { spec: BIG, p: BIG_AT, yaw: PI, pose: { lean: -14 * smooth((u - 0.42) / 0.2), armL: [30, 40], armR: [30, 40] }, face: u > 0.45 ? HURT : FLAT, free: true },
      ];
    },
    world: (_t, u) => ({ set: "stadium", ring: { p: [1.3, 1.5, 0.72], u: (u - 0.42) / 0.3 } }), focus: () => [1.3, 1.5, 0.45], blur: 1.6 },
  { id: 6, mood: "floodlit", cam: move(C([-4.5, 0.55, -2.4], [1.3, 0.6, 1.2], 44), C([-4.2, 0.5, -2.1], [1.3, 0.5, 1.4], 44)),
    actors: (_t, u) => [
      { spec: TEN, p: INC, yaw: 0, pose: {}, face: GRIM, free: true },
      { spec: BIG, p: BIG_AT, yaw: PI, pose: lying(u / 0.6), face: HURT, free: true },
      { spec: player("IT", 2), p: [3.6, 0, 3.0], yaw: -2.4, pose: {}, face: YELL, free: true },
      { spec: player("FR", 3), p: [-1.4, 0, 3.6], yaw: 2.6, pose: {}, face: FLAT, free: true },
    ],
    world: () => ({ set: "stadium" }), focus: () => [1.3, 0.5, 1], blur: 1.4 },
  { id: 7, mood: "floodlit", cam: move(C([-9, 1.6, -6.2], [-1.5, 1.2, -1.2], 44), C([-8.2, 1.6, -5.6], [-1.5, 1.2, -1.2], 44)),
    actors: () => [
      { spec: REF, p: [-5.2, 0, -3.6], yaw: -PI / 2 - 0.3, pose: {}, face: FLAT, free: true },
      { spec: BIG, p: BIG_AT, yaw: PI, pose: lying(1), face: HURT, free: true },
      { spec: TEN, p: INC, yaw: 0.6, pose: {}, face: GRIM, free: true },
      { spec: player("IT", 1), p: [2.6, 0, 2.0], yaw: -2.2, pose: { armL: [120, 20], armR: [120, 20] }, face: YELL, free: true },
    ],
    world: () => ({ set: "stadium" }), focus: () => [-5.2, 1.6, -3.6], blur: 1.2 },
  { id: 8, mood: "floodlit", cam: move(C([11.5, 1.5, -36.8], [8.2, 1.3, -34.4], 38), C([11.0, 1.5, -36.5], [8.2, 1.3, -34.4], 36), punch),
    actors: () => [{ spec: ASSIST, p: [8.2, 0, -34.4], yaw: PI / 2 + 0.15, pose: { armR: [12, 0] }, face: FLAT, free: true }],
    world: () => ({ set: "stadium" }), focus: () => [8.2, 1.5, -34.4], blur: 1.8 },
  { id: 9, mood: "floodlit", cam: (u) => {
      const a = lerp(0, 0.6, smooth(u));
      return C([1.3 + 4 * Math.sin(a), 18, 0.5 - 4 * Math.cos(a)], [1.3, 0, 0.5], 34);
    },
    actors: (t, u) => [
      { spec: REF, p: [lerp(-4.2, -1.4, smooth(u)), 0, lerp(-2.8, -1.0, smooth(u))], yaw: 0.9, pose: u < 0.8 ? run(t) : {}, free: true },
      { spec: BIG, p: BIG_AT, yaw: PI, pose: lying(1), free: true },
      ...range(7).map((i) => {
        const a = (i / 7) * 2 * PI;
        return { spec: player(i % 2 ? "IT" : "FR", i + 2), p: [1.3 + 2.6 * Math.cos(a), 0, 0.5 + 2.6 * Math.sin(a)] as V3, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), pose: { armL: [40, 60] } as BodyPose, free: true };
      }),
    ],
    world: () => ({ set: "stadium" }), focus: () => [1.3, 0, 0.5], blur: 0.5 },
  { id: 10, mood: "floodlit", cam: (u) => C([lerp(-2.6, 1.6, smooth(u)), 1.6, -31.6], [lerp(-0.6, 0.4, smooth(u)), 1.5, -36.2], 40),
    actors: () => [{ spec: FOURTH, p: [0, 0, -36.2], yaw: 0, pose: { armR: [150, 140], armRFwd: 20 }, face: FLAT, free: true }],
    world: () => ({ set: "stadium", bits: [{ p: [0.13, 1.68, -36.2], s: 0.05 }, { p: [-0.13, 1.68, -36.2], s: 0.05 }, { p: [0.08, 1.5, -36.07], s: 0.02 }] }),
    focus: () => [0, 1.6, -36.2], blur: 1.6 },
  { id: 11, mood: "floodlit", cam: move(C([-1.0, 1.72, -3.0], [-1.4, 1.62, -1.0], 30), C([-1.1, 1.7, -2.5], [-1.4, 1.62, -1.0], 28)),
    actors: (t) => [{ spec: REF, p: [-1.4, 0, -1.0], yaw: PI - 0.7, pose: { headNod: 14 * Math.max(0, Math.sin(q(t) * 9)) }, face: FLAT, free: true }],
    world: () => ({ set: "stadium", bits: [] }), focus: () => [-1.4, 1.65, -1], blur: 2.2 },
  { id: 12, mood: "floodlit", cam: move(C([0.4, 0.55, -4.8], [-1.4, 2.0, -1.0], 44), C([0.1, 0.6, -3.9], [-1.4, 2.1, -1.0], 44), punch),
    actors: (_t, u) => [
      { spec: REF, p: [-1.4, 0, -1.0], yaw: -0.6, pose: { armR: [lerp(40, 168, easeOut(u * 3)), 0] }, hold: "card", holdSide: "R", face: FLAT, free: true },
      { spec: TEN, p: INC, yaw: -2.4, pose: {}, face: GRIM, free: true },
    ],
    world: () => ({ set: "stadium" }), focus: () => [-1.4, 2.2, -1], blur: 1.2 },
  { id: 13, mood: "floodlit", cam: move(C([0.6, 1.5, -25], [0, 1.3, -15], 40), C([0.5, 1.5, -24], [0, 1.3, -15], 40)),
    actors: (t, u) => [
      { spec: TEN, p: [0, 0, lerp(-16.5, -19.5, u)], yaw: PI, pose: { walk: q(t) * 5, headNod: 16 }, face: DOWN, free: true },
      ...range(8).map((i) => ({ spec: player("IT", i), p: [-3 + 0.9 * i + h1(i) * 0.4, 0, 2 + 1.2 * h1(i * 3)] as V3, yaw: h1(i * 5) * 2 * PI, pose: { armL: [150 + 10 * Math.sin(q(t) * 8 + i), 10], armR: [150 + 10 * Math.sin(q(t) * 8 + i + 1), 10], bob: 6 * Math.abs(Math.sin(q(t) * 8 + i)) } as BodyPose, face: YELL, free: true })),
    ],
    world: () => ({ set: "stadium" }), focus: () => [0, 1.4, -18], blur: 1.4 },
  { id: 14, mood: "room", cam: move(C([0, 1.65, -4.6], [0, 1.3, 0], 36), C([0, 1.55, -3.6], [0, 1.3, 0], 36)),
    actors: () => [], world: () => ({ set: "room", cloth: 0 }), focus: () => [0, 1.4, 0], blur: 1.4 },
  { id: 15, mood: "room", cam: move(C([0, 1.55, -3.3], [0.05, 1.35, 0], 36), C([0, 1.45, -2.2], [0.08, 1.35, 0], 34)),
    actors: () => [], world: (_t, u) => ({ set: "room", cloth: smooth(u / 0.4) }), focus: () => [0.05, 1.4, 0], blur: 1.6 },
];
export const SHOTS = S;

export const shotAt = (t: number) => {
  let k = S.length - 1;
  for (let i = 0; i < S.length; i++) if (t < beatTime(SHOT_BEATS[i][1])) { k = i; break; }
  const a = beatTime(SHOT_BEATS[k][0]);
  const b = beatTime(SHOT_BEATS[k][1]);
  return { shot: S[k], u: clamp((t - a) / (b - a)) };
};

const INK = "#10121c";
const W = "#ffffff";
export const CHIPS: Chip[] = [
  { shot: 1, text: "LAST MATCH", x: 540, y: 300, t0: -0.4, bg: W, fg: INK, size: 92 },
  { shot: 3, text: "108'", x: 540, y: 290, t0: beatTime(3) + 0.15, bg: W, fg: INK, size: 120 },
  { shot: 3, text: "1 – 1", x: 540, y: 430, t0: beatTime(3) + 0.5, bg: "#1d1f2c", fg: W, size: 80 },
  { shot: 9, text: "?", x: 540, y: 880, t0: beatTime(13) + 0.1, bg: "none", fg: W, size: 360, flat: true },
  { shot: 12, text: "110'", x: 540, y: 300, t0: beatTime(18) + 0.12, bg: "#e0241c", fg: W, size: 120 },
  { shot: 14, text: "NEXT DAY", x: 540, y: 300, t0: beatTime(22) + 0.1, bg: W, fg: INK, size: 92 },
];
export { SECONDS };
