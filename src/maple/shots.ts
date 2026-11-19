// 5-second test: "Every night, a burglar visited this house and stole nothing. He just flipped the doormat."
// One continuous lens; eased moves land on the spoken nouns: night, burglar, house, nothing, doormat.
// The doormat flip is the object handoff: the lens drops to it and follows it through the air.
import type { FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lerp, mixArm, walkAt } from "../inkbeat/anim/acting";
import type { V3 } from "../inkbeat/types";
import { C, head, ik, keyed, smooth } from "../crow/shots";
import { PROWLER } from "./cast";
import { DECK_Y, MAT_C, stepY } from "./world";

export const FPS = 30;
export const SECONDS = 4.9;
export const WORDS: [string, number, number][] = [
  ["Every", 0, 0.28], ["night,", 0.28, 0.7], ["a", 0.7, 0.8], ["burglar", 0.8, 1.25], ["visited", 1.25, 1.6], ["this", 1.6, 1.75], ["house", 1.75, 2.1],
  ["and", 2.1, 2.2], ["stole", 2.2, 2.55], ["nothing.", 2.55, 3.05], ["He", 3.35, 3.5], ["just", 3.5, 3.72], ["flipped", 3.72, 4.1], ["the", 4.1, 4.2], ["doormat.", 4.2, 4.8],
];
export const MOVES = [
  { start: 0.55, land: 1.0, word: "burglar" }, { start: 1.45, land: 2.0, word: "house" }, { start: 2.35, land: 2.85, word: "nothing." }, { start: 3.5, land: 4.05, word: "flipped" }, { start: 4.15, land: 4.5, word: "doormat." },
];
const STAND = 2.0;
const seg = [{ t0: 0, t1: 3.4, from: [0, 0, 6.0] as V3, to: [0, 0, STAND] as V3 }];
export const pathAt = (t: number) => {
  const w = walkAt(seg, seg[0].from, t, PROWLER.height);
  return { p: [w.p[0], stepY(w.p[2]), w.p[2]] as V3, walk: w.walk };
};
/** the flip: u 0..1 over 3.75-4.35; the mat rotates about its width axis, rising 0.5 m at the top */
export const flipU = (t: number) => smooth((t - 3.75) / 0.6);
export const matAt = (t: number) => {
  const u = flipU(t);
  return { angle: -Math.PI * u, y: MAT_C[1] + 0.034 - 0.004 * u + 0.5 * Math.sin(Math.PI * u), u };
};
const edge = (t: number, x: number): V3 => {
  const m = matAt(t);
  const u = m.u;
  return [x, m.y + 0.3 * Math.sin(Math.PI * u) + 0.02, MAT_C[2] + 0.3 * Math.cos(Math.PI * u)];
};
export const cam = keyed([
  [0, C([-1.6, 1.5, 10.6], [0.2, 1.7, 1.0], 52)],
  [0.55, C([-1.3, 1.45, 10.2], [0.2, 1.65, 1.2], 50), "linear"],
  [1.0, C([1.6, 1.3, 7.4], [0.0, 1.5, 4.6], 38), "inout"],
  [1.45, C([1.5, 1.3, 7.2], [0.0, 1.5, 4.0], 37), "linear"],
  [2.0, C([2.9, 1.6, 4.9], [0.3, 1.75, 0.3], 44), "inout"],
  [2.35, C([2.8, 1.6, 4.7], [0.3, 1.7, 0.4], 42), "linear"],
  [2.85, C([1.5, 1.2, 3.4], [0.0, 1.1, 0.4], 34), "inout"],
  [3.5, C([0.9, 1.6, 3.6], [0.0, 0.9, 1.0], 38), "linear"],
  [4.05, C([0.9, 2.0, 3.4], [0.0, 0.6, 0.8], 44), "inout"],
  [4.15, C([0.9, 2.0, 3.35], [0.0, 0.6, 0.8], 44), "linear"],
  [4.5, C([0.5, 1.6, 2.45], [0.0, 0.4, 0.65], 46), "inout"],
  [SECONDS, C([0.45, 1.65, 2.55], [0.0, 0.4, 0.65], 44), "linear"],
]);
export const prowler = (t: number) => {
  const { p, walk } = pathAt(t);
  const yaw = Math.PI;
  const bend = smooth((t - 3.4) / 0.3) - smooth((t - 4.5) / 0.35);
  const lean = 10 + 60 * bend;
  const looking = t > 1.2 && t < 3.3 ? 35 * Math.sin((t - 1.2) * 3.2) : 0;
  const g = smooth((t - 3.6) / 0.15) * (1 - smooth((t - 3.82) / 0.15));
  // facing -z, his right hand is on the -x side
  const kL = ik(PROWLER, p, yaw, "L", edge(t, 0.3), lean);
  const kR = ik(PROWLER, p, yaw, "R", edge(t, -0.3), lean);
  const pose: BodyPose = {
    walk, lean, headYaw: looking, headNod: -10 * bend,
    armL: mixArm([20, 12], kL.arm, g), armLFwd: lerp(10, kL.fwd, g), armR: mixArm([20, 12], kR.arm, g), armRFwd: lerp(10, kR.fwd, g),
  };
  const face: FaceState = t < 2.5 ? { eyes: "squint", mouth: "smirk", brows: "angry" } : t < 3.45 ? { eyes: "half", mouth: "flat", brows: "raised" } : t < 4.5 ? { eyes: "squint", mouth: "grin", brows: "angry" } : { eyes: "closed", mouth: "beam", brows: "raised" };
  return { spec: PROWLER, p, yaw, pose, face, g, kErr: Math.max(kL.err, kR.err), edgeL: edge(t, 0.3), edgeR: edge(t, -0.3) };
};
export const focus = (t: number): V3 => (t < 0.5 ? [0, 1.7, 1.0] : t < 2.0 ? head(PROWLER, pathAt(t).p) : t < 3.4 ? [0, 1.2, 0.5] : matAt(t).u < 1 ? [0, matAt(t).y, 0.65] : [0, 0.4, 0.65]);
export const DECKY = DECK_Y;
