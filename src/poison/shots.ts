// The 17 shots of the poison short as DATA on a 55 BPM grid (cuts from timing.gen.ts). Ground shots look toward +z.
import type { CharacterSpec, FaceState, HandPropKind, Pose as BodyPose } from "../inkbeat/char/Character3D";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { CLAUDIUS, COOK, GUARD, KING, KINGS3, MITHRIDATES, ROMAN_TASTER, SURGEON, TASTER } from "./cast";
import { BEAT, PHASE, SECONDS, SHOT_BEATS } from "./timing.gen";
import type { HeadProp, World } from "./world";

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
const q = (t: number) => Math.round(t * 10) / 10;
export const beatTime = (k: number) => (k === 0 ? 0 : PHASE + k * BEAT);

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: BodyPose; face?: FaceState; hold?: HandPropKind | null; holdSide?: "L" | "R"; head?: HeadProp["kind"] };
export type Chip = { shot: number; text: string; x: number; y: number; t0: number; bg: string; fg: string; size?: number; flat?: boolean; count?: [number, number] };
export type Beat = { id: number; mood: string; cam: (u: number) => Cam; actors: (t: number, u: number) => Actor[]; world: (t: number, u: number) => World; focus: (u: number) => V3; blur: number };

// faces
const SMUG: FaceState = { eyes: "half", mouth: "smirk", brows: "raised" };
const HAPPY: FaceState = { eyes: "open", mouth: "grin", brows: "raised" };
const SHOCK: FaceState = { eyes: "wide", mouth: "o", brows: "raised" };
const DEAD: FaceState = { eyes: "half", mouth: "flat", brows: "neutral" };
const WORRY: FaceState = { eyes: "wide", mouth: "frown", brows: "worried", sweat: true };
const SICK: FaceState = { eyes: "wide", mouth: "o", brows: "worried", sweat: true, flush: 0.5 };
const AWK: FaceState = { eyes: "open", mouth: "grin", brows: "worried", sweat: true };
const GRIMACE: FaceState = { eyes: "closed", mouth: "frown", brows: "worried", flush: 0.35 };
const PROUD: FaceState = { eyes: "half", mouth: "grin", brows: "raised" };
const AWE: FaceState = { eyes: "wide", mouth: "smile", brows: "raised" };
const DOUBT: FaceState = { eyes: "squint", mouth: "smirk", brows: "angry" };
const STERN: FaceState = { eyes: "squint", mouth: "flat", brows: "angry" };

const S: Beat[] = [
  { id: 1, mood: "candle", cam: move(C([0.4, 1.55, -3.4], [0, 1.2, 1.0], 44), C([0.25, 1.5, -2.5], [0.05, 1.25, 1.0], 44)),
    actors: (t) => [
      { spec: KING, p: [0, 0, 1.25], yaw: PI, face: { eyes: "open", mouth: "smile", brows: "raised" }, pose: { armL: [40, 70], armLFwd: 60, armR: [40, 70], armRFwd: 60 }, head: "crown" },
      { spec: TASTER, p: [1.1, 0, 1.0], yaw: PI - 0.5, face: DEAD, pose: { armL: [8, 0], armR: [8, 0], headNod: 8 * Math.sin(q(t) * 2) } },
    ],
    world: () => ({ set: "hall" }), focus: () => [0, 1.3, 1.2], blur: 1.2 },
  { id: 2, mood: "candle", cam: move(C([1.9, 1.45, -0.7], [0.1, 1.15, 1.05], 40), C([1.6, 1.42, -0.45], [0.1, 1.15, 1.05], 40), punch),
    actors: (t) => [
      { spec: KING, p: [-0.15, 0, 1.25], yaw: PI + 0.35, face: SHOCK, pose: { armL: [30, 40], armR: [30, 40] }, head: "crown" },
      { spec: TASTER, p: [0.5, 0, 1.15], yaw: -PI / 2 - 0.3, face: { eyes: "closed", mouth: "o", brows: "neutral" }, pose: { lean: 18, armR: [95 + 10 * Math.sin(q(t) * 12), 120], armRFwd: 70 } },
    ],
    world: () => ({ set: "hall" }), focus: () => [0.2, 1.3, 1.1], blur: 1.8 },
  { id: 3, mood: "candle", cam: move(C([1.35, 1.42, -1.3], [1.25, 1.32, 1.0], 38), C([1.3, 1.4, -1.0], [1.25, 1.32, 1.0], 36)),
    actors: (t) => [{ spec: TASTER, p: [1.25, 0, 1.0], yaw: PI, face: { ...DEAD, mouth: Math.sin(q(t) * 14) > 0 ? "flat" : "o" }, pose: { armL: [35, 80], armLFwd: 70, armR: [8, 0] } }],
    world: () => ({ set: "hall" }), focus: () => [1.25, 1.35, 1.0], blur: 1.8 },
  { id: 4, mood: "roman", cam: move(C([0.3, 3.2, -4.5], [0, 1.1, 1.0], 44), C([0.3, 1.6, -3.2], [0, 1.2, 1.0], 44)),
    actors: () => [
      { spec: ROMAN_TASTER, p: [0.6, 0, 0.9], yaw: PI, face: HAPPY, pose: { armR: [70, 60], armRFwd: 40 } },
      { spec: CLAUDIUS, p: [-0.8, 0, 1.3], yaw: PI + 0.3, face: { eyes: "open", mouth: "smile", brows: "neutral" }, head: "wreath" },
    ],
    world: () => ({ set: "roman" }), focus: () => [0, 1.2, 1.0], blur: 1.0 },
  { id: 5, mood: "roman", cam: move(C([0.75, 1.42, -0.9], [0.6, 1.35, 0.9], 36), C([0.7, 1.4, -0.65], [0.6, 1.36, 0.9], 34), punch),
    actors: () => [{ spec: ROMAN_TASTER, p: [0.6, 0, 0.9], yaw: PI, face: PROUD, pose: { armR: [80, 130], armRFwd: 80 } }],
    world: () => ({ set: "roman" }), focus: () => [0.6, 1.4, 0.9], blur: 2.0 },
  { id: 6, mood: "roman", cam: move(C([-0.1, 1.45, -2.2], [-0.1, 1.25, 1.1], 40), C([-0.1, 1.42, -1.8], [-0.1, 1.25, 1.1], 40)),
    actors: () => [
      { spec: CLAUDIUS, p: [-0.55, 0, 1.15], yaw: PI - 0.3, face: HAPPY, pose: { armL: [120, 20], armLFwd: 10 }, head: "wreath" },
      { spec: ROMAN_TASTER, p: [0.45, 0, 1.0], yaw: PI + 0.3, face: PROUD, pose: { armL: [140, 10] } },
    ],
    world: () => ({ set: "roman" }), focus: () => [0, 1.3, 1.1], blur: 1.4 },
  { id: 7, mood: "roman", cam: move(C([-0.4, 1.35, -1.2], [-0.5, 1.2, 1.1], 38), C([-0.45, 1.3, -0.85], [-0.5, 1.15, 1.1], 38)),
    actors: (_t, u) => [
      { spec: CLAUDIUS, p: [-0.5, 0, 1.1], yaw: PI, face: SICK, pose: { lean: 8 + 14 * smooth(u), armL: [40, 105], armLFwd: 80, armR: [40, 105], armRFwd: 80 }, head: "wreath" },
      { spec: ROMAN_TASTER, p: [0.7, 0, 1.6], yaw: PI - 0.3, face: SHOCK, pose: { armL: [60, 90], armLFwd: 60, armR: [60, 90], armRFwd: 60 } },
    ],
    world: () => ({ set: "roman" }), focus: () => [-0.5, 1.2, 1.1], blur: 1.6 },
  { id: 8, mood: "roman", cam: move(C([0.7, 1.42, -0.8], [0.7, 1.35, 1.6], 34), C([0.7, 1.4, -0.55], [0.7, 1.36, 1.6], 32), punch),
    actors: () => [{ spec: ROMAN_TASTER, p: [0.7, 0, 1.6], yaw: PI, face: AWK, pose: { armL: [35, 115], armLFwd: 25, armR: [35, 115], armRFwd: 25, headTilt: 14 } }],
    world: () => ({ set: "roman" }), focus: () => [0.7, 1.4, 1.6], blur: 2.0 },
  { id: 9, mood: "moon", cam: move(C([0, 1.5, -3.0], [0, 1.25, 1.0], 44), C([0, 1.48, -2.4], [0, 1.25, 1.0], 44)),
    actors: () => KINGS3.map((k, i) => ({ spec: k, p: [-1.0 + i, 0.15, 1.0 + (i === 1 ? 0.2 : 0)] as V3, yaw: PI + (i - 1) * 0.25, face: WORRY, pose: { armL: [30, 100], armLFwd: 70, armR: [30, 100], armRFwd: 70 }, head: "crown" as const })),
    world: () => ({ set: "throne" }), focus: () => [0, 1.3, 1.0], blur: 1.2 },
  { id: 10, mood: "moon", cam: move(C([0.9, 1.4, -2.0], [0, 1.3, 1.2], 40), C([0.6, 1.38, -1.5], [0, 1.32, 1.2], 40)),
    actors: () => [{ spec: MITHRIDATES, p: [0, 0.15, 1.2], yaw: PI - 0.25, face: SMUG, pose: { armR: [60, 100], armRFwd: 70 }, hold: "vial", holdSide: "R", head: "crown" }],
    world: () => ({ set: "throne" }), focus: () => [0, 1.4, 1.2], blur: 1.6 },
  { id: 11, mood: "moon", cam: move(C([0.25, 1.5, -0.9], [0, 1.45, 1.2], 34), C([0.2, 1.5, -0.7], [0, 1.46, 1.2], 32)),
    actors: (_t, u) => [{ spec: MITHRIDATES, p: [0, 0.15, 1.2], yaw: PI, face: u < 0.35 ? SMUG : GRIMACE, pose: { armR: [lerp(70, 135, smooth(u / 0.35)), lerp(90, 125, smooth(u / 0.35))], armRFwd: 40 }, hold: "vial", holdSide: "R", head: "crown" }],
    world: () => ({ set: "throne" }), focus: () => [0, 1.5, 1.2], blur: 2.0 },
  { id: 12, mood: "moon", cam: move(C([0.3, 1.45, -1.1], [0, 1.4, 1.2], 36), C([0.25, 1.44, -0.8], [0, 1.4, 1.2], 34), punch),
    actors: () => [{ spec: MITHRIDATES, p: [0, 0.15, 1.2], yaw: PI, face: PROUD, pose: { armL: [150, 40], armLFwd: 20, armR: [20, 0] }, head: "crown" }],
    world: () => ({ set: "throne" }), focus: () => [0, 1.45, 1.2], blur: 2.0 },
  { id: 13, mood: "candle", cam: move(C([0.6, 1.6, -2.0], [-0.25, 1.2, 1.0], 44), C([0.45, 1.5, -1.5], [-0.25, 1.22, 1.0], 42)),
    actors: () => [{ spec: KINGS3[1], p: [-0.6, 0, 0.75], yaw: PI - 0.8, face: AWE, pose: { armL: [45, 100], armLFwd: 85, armR: [45, 100], armRFwd: 85 }, head: "crown" }],
    world: (_t, u) => ({ set: "vault", glow: 0.5 + 0.5 * Math.sin(u * 8) }), focus: () => [0, 1.2, 1.2], blur: 1.6 },
  { id: 14, mood: "candle", cam: move(C([1.1, 1.5, -1.5], [0.95, 1.38, 0.6], 38), C([1.05, 1.48, -1.15], [0.95, 1.4, 0.6], 36)),
    actors: () => [{ spec: SURGEON, p: [0.95, 0, 0.6], yaw: PI, face: DOUBT, pose: { armR: [75, 95], armRFwd: 70 }, hold: "stone", holdSide: "R" }],
    world: () => ({ set: "vault" }), focus: () => [0.95, 1.45, 0.6], blur: 1.8 },
  { id: 15, mood: "torch", cam: move(C([-0.3, 1.7, -3.9], [-0.25, 1.35, 1.4], 56), C([-0.25, 1.66, -3.4], [-0.25, 1.35, 1.4], 56)),
    actors: (_t, u) => [
      { spec: COOK, p: [0, 0, 1.1], yaw: PI + (u < 0.45 ? 0.6 : -0.6), face: u < 0.45 ? WORRY : { eyes: "open", mouth: "smile", brows: "raised" }, pose: u < 0.45 ? { armL: [25, 80], armLFwd: 70, armR: [25, 80], armRFwd: 70 } : { armR: [80, 10], armRFwd: -20 }, head: "chef" },
      { spec: GUARD, p: [0.2, 0, 2.6], yaw: PI, face: STERN },
    ],
    world: () => ({ set: "dungeon" }), focus: () => [0, 1.3, 1.1], blur: 1.4 },
  { id: 16, mood: "torch", cam: move(C([0.2, 1.42, -1.1], [0, 1.35, 1.1], 36), C([0.15, 1.4, -0.85], [0, 1.36, 1.1], 34), punch),
    actors: () => [{ spec: COOK, p: [0, 0, 1.1], yaw: PI, face: HAPPY, pose: { armR: [150, 20], armRFwd: 10, armL: [150, 20], armLFwd: 10 }, hold: "stone", holdSide: "R", head: "chef" }],
    world: () => ({ set: "dungeon" }), focus: () => [0, 1.4, 1.1], blur: 2.0 },
  { id: 17, mood: "torch", cam: move(C([0.7, 1.55, -1.2], [1.0, 0.55, 1.0], 42), C([0.75, 1.0, -0.4], [0.95, 0.35, 0.85], 40)),
    actors: () => [],
    world: () => ({ set: "dungeon", tipped: true, stoneOnFloor: true }), focus: () => [0.95, 0.35, 0.85], blur: 1.6 },
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
const st = (i: number) => beatTime(SHOT_BEATS[i - 1][0]);
export const CHIPS: Chip[] = [
  { shot: 3, text: "FOOD TASTER", x: 540, y: 300, t0: st(3) + 0.1, bg: W, fg: INK, size: 84 },
  { shot: 4, text: "PRAEGUSTATOR", x: 540, y: 300, t0: st(4) + 1.2, bg: "#e8c25a", fg: INK, size: 84 },
  { shot: 5, text: "“GUY WHO GOES FIRST”", x: 540, y: 300, t0: st(5) + 0.4, bg: W, fg: INK, size: 64 },
  { shot: 6, text: "CLAUDIUS", x: 330, y: 300, t0: st(6) + 0.1, bg: "#6a2a8a", fg: W, size: 64 },
  { shot: 6, text: "HALOTUS", x: 760, y: 300, t0: st(6) + 1.0, bg: W, fg: INK, size: 64 },
  { shot: 7, text: "ALLEGEDLY", x: 540, y: 300, t0: st(7) + 0.7, bg: "#d2283a", fg: W, size: 80 },
  { shot: 9, text: "?", x: 540, y: 470, t0: st(9) + 0.3, bg: "none", fg: W, size: 320, flat: true },
  { shot: 10, text: "MITHRIDATES", x: 540, y: 300, t0: st(10) + 0.1, bg: "#1f4a7a", fg: W, size: 80 },
  { shot: 11, text: "DAY", x: 540, y: 300, t0: st(11) + 0.1, bg: "#5fd36a", fg: INK, size: 84, count: [1, 365] },
  { shot: 13, text: "BEZOAR", x: 540, y: 300, t0: st(13) + 0.9, bg: "#7a8a4a", fg: W, size: 84 },
  { shot: 14, text: "AMBROISE PARÉ", x: 540, y: 300, t0: st(14) + 0.3, bg: W, fg: INK, size: 76 },
  { shot: 17, text: "7 HOURS LATER", x: 540, y: 300, t0: st(17) + 0.05, bg: INK, fg: W, size: 80 },
];
export { SECONDS };
