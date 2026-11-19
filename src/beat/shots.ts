// A 5-second sample of the "beat camera" learned from watching the reference Shorts: ONE continuous lens, eased 0.4-0.5 s
// moves that LAND ON the spoken noun every ~1.1-1.9 s, a light drift in between, a face-filling close-up for the line.
// Original scene (our park set, Okafor, the crow); only the camera grammar is borrowed. Silent: captions timed at 3.6 words/s.
import type { FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lookAt, lerp, mixArm, window01 } from "../inkbeat/anim/acting";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { OKAFOR } from "../crow/cast";
import { C, clamp, head, ik, keyed, lerpAng, look, smooth, yawTo } from "../crow/shots";
import { BOARD_Y, CROW_SPOT, sqAt, TABLE_H } from "../crow/world";
import type { GullState } from "../gull/world";

export const FPS = 30;
export const SECONDS = 4.9;
export const WORDS: [string, number, number][] = [
  ["He", 0, 0.18], ["set", 0.18, 0.42], ["a", 0.42, 0.52], ["golden", 0.52, 0.88], ["ball", 0.88, 1.2], ["on", 1.2, 1.34], ["the", 1.34, 1.44],
  ["board", 1.44, 1.85], ["and", 1.85, 1.98], ["told", 1.98, 2.25], ["the", 2.25, 2.36], ["crow,", 2.36, 2.8], ["if", 3.05, 3.2], ["it", 3.2, 3.32],
  ["rolls", 3.32, 3.7], ["off,", 3.7, 4.05], ["run!", 4.1, 4.6],
];
/** the camera moves: [start, land] — each lands inside the word named */
export const MOVES: { start: number; land: number; word: string }[] = [
  { start: 0.55, land: 1.0, word: "ball" }, { start: 1.25, land: 1.65, word: "board" }, { start: 2.0, land: 2.5, word: "crow," }, { start: 3.65, land: 4.15, word: "run!" },
];
export const OK: V3 = [0.05, 0, 0.82];
export const OK_YAW = Math.PI - 0.1;
const HOLD: V3 = [0.2, 1.1, 0.42];
export const BALL_END: V3 = [-0.0325, BOARD_Y + 0.065, 0.26];
const CROW_HEAD: V3 = [CROW_SPOT[0], TABLE_H + 0.9 * 0.62, CROW_SPOT[2]];
export const ballAt = (t: number): V3 => {
  const u = smooth((t - 1.25) / 0.55);
  const p: V3 = [lerp(HOLD[0], BALL_END[0], u), lerp(HOLD[1], BALL_END[1], u) + 0.09 * Math.sin(Math.PI * u), lerp(HOLD[2], BALL_END[2], u)];
  if (t < 1.25) p[1] += 0.01 * Math.sin(t * 3);
  const wob = window01(t, 3.3, 4.6, 0.2, 0.3);
  return [p[0] + 0.02 * wob * Math.sin((t - 3.3) * 8), p[1], p[2]];
};
export const cam = keyed([
  [0, C([-0.25, 1.0, -1.45], [0.05, 1.15, 0.82], 44)],
  [0.55, C([-0.2, 1.0, -1.3], [0.05, 1.15, 0.8], 42), "linear"],
  [1.0, C([0.1, 1.25, -0.4], [0.2, 1.1, 0.42], 30), "inout"],
  [1.25, C([0.1, 1.25, -0.35], [0.2, 1.1, 0.4], 29), "linear"],
  [1.65, C([-0.4, 1.0, -0.5], [-0.03, 0.7, 0.26], 32), "inout"],
  [2.0, C([-0.38, 0.97, -0.45], [-0.03, 0.7, 0.26], 30), "linear"],
  [2.5, C([-0.15, 0.95, -0.85], [0.43, 0.9, -0.02], 30), "inout"],
  [3.65, C([-0.1, 0.95, -0.8], [0.43, 0.9, -0.02], 28), "linear"],
  [4.15, C([0.0, 1.5, -0.2], [0.05, 1.42, 0.82], 44), "inout"],
  [SECONDS, C([0.0, 1.5, -0.14], [0.05, 1.42, 0.82], 42), "linear"],
]);
const flap = (t: number, a: number, b: number, base: FaceState["mouth"]): FaceState["mouth"] => (t < a || t > b ? base : Math.floor((t - a) * 9) % 2 === 0 ? "open" : "o");
export const okafor = (t: number) => {
  const grip = window01(t, -1, 1.85, 0.01, 0.45);
  const ball = ballAt(t);
  // the hand sits just behind the ball (away from the lens), so the ball stays visible in front of it
  const k = ik(OKAFOR, OK, OK_YAW, "R", [ball[0], ball[1], ball[2] + 0.05], 6);
  const crowLook = smooth((t - 1.9) / 0.4);
  const lensLook = smooth((t - 3.5) / 0.3);
  const tgtA: V3 = [lerp(ball[0], CROW_HEAD[0], crowLook), lerp(ball[1], CROW_HEAD[1], crowLook), lerp(ball[2], CROW_HEAD[2], crowLook)];
  const c = cam(t).pos;
  const tgt: V3 = [lerp(tgtA[0], c[0], lensLook), lerp(tgtA[1], c[1], lensLook), lerp(tgtA[2], c[2], lensLook)];
  const lk = look(OKAFOR, OK, OK_YAW, tgt);
  const pose: BodyPose = { lean: 4, armL: [16, 10], armLFwd: 10, armR: mixArm([16, 10], k.arm, grip), armRFwd: lerp(10, k.fwd, grip), ...lk, headNod: lk.headNod + 6 * smooth((t - 4.1) / 0.2) };
  const face: FaceState =
    t < 1.9 ? { eyes: "half", mouth: "smirk", brows: "raised" } :
    t < 3.0 ? { eyes: "squint", mouth: flap(t, 1.98, 2.8, "smirk"), brows: "raised" } :
    t < 4.1 ? { eyes: "wide", mouth: flap(t, 3.05, 4.05, "o"), brows: "high" } :
    { eyes: "huge", mouth: "yell", brows: "high", sweat: true };
  return { spec: OKAFOR, p: OK, yaw: OK_YAW, pose, face, grip, ball };
};
export const crow = (t: number): GullState => ({
  p: CROW_SPOT, yaw: lerpAng(yawTo(CROW_SPOT, OK), yawTo(CROW_SPOT, [-0.15, 0, -0.85]), 0.85), tilt: 0.22 * window01(t, 2.3, 4.0, 0.3, 0.3) * Math.sin(t * 3), bob: 0, flap: 0, fold: 1, peck: 0, step: 0, s: 0.62,
  face: { eyes: t < 2.3 ? "normal" : t < 4.1 ? "narrow" : "big", brow: t < 2.3 ? 0 : 1, beak: 0 },
});
export const focus = (t: number): V3 => (t < 0.5 ? head(OKAFOR, OK) : t < 2.0 ? ballAt(t) : t < 3.6 ? CROW_HEAD : head(OKAFOR, OK));
export const PIECES = [
  { id: "a", kind: "p" as const, white: true, p: sqAt(1, 2) }, { id: "b", kind: "r" as const, white: true, p: sqAt(0, 0) }, { id: "c", kind: "k" as const, white: true, p: sqAt(0, 4) },
  { id: "d", kind: "p" as const, white: false, p: sqAt(6, 3) }, { id: "e", kind: "q" as const, white: false, p: sqAt(7, 3) }, { id: "f", kind: "n" as const, white: false, p: sqAt(6, 5) },
  { id: "g", kind: "b" as const, white: true, p: sqAt(2, 5) }, { id: "h", kind: "p" as const, white: false, p: sqAt(5, 1) },
];
void clamp; void lerpAng; void lookAt;
export type { Cam };
