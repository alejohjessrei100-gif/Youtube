// Three Flashes as DATA. One continuous keyed lens per scene; eased moves land on the spoken nouns.
//   1 LOT night    Tom points a flashlight at the 6th floor; three flashes; he walks off; the guard at the booth watches
//   2 LOT Friday   the guard walks up behind (entrance + walk) and grabs his arm; the flashlight falls and rolls to the
//                  guard's boots (handoff); Tom's face, his slippers; up to window 612; the VISITING HOURS sign
//   3 FB 1974      young Tom flicks his porch light three times; across the street young Ellen, hand on her heart
//   4 LOT Friday   the guard looks up; the lens climbs to window 612; Ellen's phone blinks back three times
//   5 LOT next     the guard switches on his own flashlight; the nurses arrive; the whole 6th floor blinks back
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lerp, mixArm, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { C, hand, head, headPosed, ik, keyed, lerpAng, look, smooth, yawTo } from "../crow/shots";
import { ELLEN, GUARD, NURSE_A, NURSE_B, TOM, YOUNG_ELLEN, YOUNG_TOM } from "./cast";
import { BOOTH, ELLEN_P, FB, LOT, PORCH_SWITCH, SIX_X, VISIT_SIGN, W612, YE_P, YT_P } from "./world";
import { SECONDS, WORDS } from "./words";

const PI = Math.PI;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9':-]/g, "");
export const W = (word: string, nth = 1) => {
  let k = 0;
  for (const [w, a] of WORDS) if (norm(w) === norm(word) && ++k === nth) return a;
  throw new Error(`word not found: ${word} #${nth}`);
};
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerpV = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const REST: BodyPose = { armL: [14, 10], armLFwd: 10, armR: [14, 10], armRFwd: 10 };
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Lt = at(LOT), Fb = at(FB);
/** a point in a character's frame: side (+ = its right), up, forward */
const local = (p: V3, yaw: number, s: number, u: number, f: number): V3 => [p[0] + f * Math.sin(yaw) + s * Math.cos(yaw), p[1] + u, p[2] + f * Math.cos(yaw) - s * Math.sin(yaw)];
/** on/off pulses: `starts` each lasting `len` seconds */
const pulses = (t: number, starts: number[], len = 0.2) => (starts.some((s) => t >= s && t < s + len) ? 1 : 0);

export const T = {
  nine: W("nine,"), hospital: W("hospital"), flashlight: W("flashlight"), sixth: W("sixth"), three: W("three"), flashes: W("flashes."),
  then: W("then"), security: W("security"), signaling: W("signaling"), planning: W("planning"), so: W("so"), friday: W("friday,"),
  guard: W("guard"), walked: W("walked"), grabbed: W("grabbed"), flashlight2: W("flashlight", 2), hit: W("hit"), tom: W("tom,"),
  seventy: W("seventy-six,"), slippers: W("slippers."), you: W("you"), ellen: W("ellen"), room: W("room"), visiting: W("visiting"),
  eight: W("eight."), fifty: W("fifty"), dating: W("dating,"), flashed: W("flashed"), porch: W("porch"), three2: W("three", 2),
  love: W("love"), guard2: W("guard", 2), looked: W("looked"), up: W("up", 2), window: W("window"), tiny: W("tiny"), blinked: W("blinked"),
  three3: W("three", 3), next: W("next"), guard3: W("guard", 3), own: W("own"), nurses: W("nurses."), whole: W("whole"),
  blinked2: W("blinked", 2), back2: W("back", 2),
};

// ------------------------------------------------------------------ types and helpers
export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState };
export type Beam = { p: V3; to: V3; on: number };
export type Extra = { beams?: Beam[]; porch?: number; sixth?: number[]; lamp612?: number; phone?: { p: V3; on: number }; radio?: V3; next?: boolean };
export type SetId = "lot" | "fb";
export type Scene = { id: number; t0: number; mood: string; blur: number; set: SetId; cam: (t: number) => Cam; actors: (t: number) => Actor[]; extra: (t: number) => Extra; focus: (t: number) => V3; dip?: boolean; sepia?: boolean };
const A = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });
let reachErr = 0;
let reachWho = "";
export const takeReachErr = () => { const e = reachErr; reachErr = 0; return e; };
export const takeReachWho = () => { const w = reachWho; reachWho = ""; return w; };
const reach = (spec: CharacterSpec, p: V3, yaw: number, base: BodyPose, side: "L" | "R", target: V3, u: number, lean = 0): BodyPose => {
  if (u <= 0) return base;
  const k = ik(spec, p, yaw, side, target, lean, 0);
  if (u > 0.7 && k.err > reachErr) { reachErr = k.err; reachWho = `seed ${spec.look.seed} ${side} target [${target.map((v) => v.toFixed(2))}]`; }
  return side === "R" ? { ...base, armR: mixArm(base.armR ?? REST.armR!, k.arm, u), armRFwd: lerp(base.armRFwd ?? 10, k.fwd, u) } : { ...base, armL: mixArm(base.armL ?? REST.armL!, k.arm, u), armLFwd: lerp(base.armLFwd ?? 10, k.fwd, u) };
};
export const handAt = (a: Actor, side: "L" | "R") => hand(a.spec, a.p, a.yaw, a.pose, side) as V3;
/** where an actor's held flashlight points the beam: from the hand toward `to` */
const aimFrom = (spec: CharacterSpec, p: V3, yaw: number, to: V3, reachK = spec === TOM ? 0.45 : 0.35): V3 => {
  const s = local(head(spec, p), yaw, 0.12, -0.5, 0);
  const d0 = [to[0] - s[0], to[1] - s[1], to[2] - s[2]];
  const L0 = Math.hypot(d0[0], d0[1], d0[2]);
  const d = [d0[0] / L0 + 0.8 * Math.sin(yaw), d0[1] / L0, d0[2] / L0 + 0.8 * Math.cos(yaw)];
  const L = Math.hypot(d[0], d[1], d[2]);
  return [s[0] + (d[0] / L) * reachK, s[1] + (d[1] / L) * reachK, s[2] + (d[2] / L) * reachK];
};
const W612L = Lt(W612[0], W612[1], W612[2]);

// ================================================================== 1. LOT night: the flashes, the walk-off, the booth
const TOM_P: V3 = Lt(0, 0, 14);
const TOM_OUT: WalkSeg = { t0: T.then + 0.25, t1: T.planning + 0.6, from: TOM_P, to: Lt(3.4, 0, 19.0) };
const G1: V3 = Lt(BOOTH[0] - 1.4, 0, BOOTH[2] + 0.4);
const G1Y = yawTo(G1, Lt(1.5, 0, 17.0));
const FLASH1 = [T.three + 0.02, T.three + 0.36, T.three + 0.7];
const beamOn1 = (t: number) => (t > T.flashlight - 0.3 && t < T.three - 0.25 ? 1 : pulses(t, FLASH1, 0.2));
const tomYaw1 = (t: number) => (t < T.then - 0.15 ? PI : lerpAng(PI, yawTo(TOM_OUT.from, TOM_OUT.to), smooth((t - (T.then - 0.15)) / 1.35)));
const s1Actors = (t: number): Actor[] => {
  const w = walkAt([TOM_OUT], TOM_P, t, TOM.height);
  const yaw = tomYaw1(t);
  const hold = 1 - window01(t, T.then - 0.35, 99, 0.45, 0.1);
  let pt: BodyPose = { ...REST, walk: w.walk, lean: 2, headNod: -18 * hold };
  pt = reach(TOM, w.p, yaw, pt, "R", aimFrom(TOM, w.p, yaw, W612L), hold, 2);
  const out = [A(TOM, w.p, yaw, pt, F("half", "flat", "neutral"))];
  const radio = window01(t, T.security + 0.4, 99, 0.35, 0.1);
  let pg: BodyPose = { ...REST, lean: 3 };
  pg = reach(GUARD, G1, G1Y, pg, "R", local(head(GUARD, G1), G1Y, 0.08, -0.14, 0.16), radio, 3);
  pg = { ...pg, ...look(GUARD, G1, G1Y, lerpV(head(TOM, w.p), s1.cam(t).pos, smooth((t - (T.signaling - 0.2)) / 0.6))) };
  out.push(A(GUARD, G1, G1Y, pg, t > T.planning - 0.2 ? F("squint", talk(t, T.planning, T.planning + 0.9), "angry") : F("half", "flat", "worried")));
  return out;
};
const talk = (t: number, a: number, b: number): FaceState["mouth"] => (t < a || t > b ? "flat" : Math.floor((t - a) * 9) % 2 === 0 ? "open" : "o");
const s1: Scene = {
  id: 1, t0: 0, mood: "night", blur: 1.0, set: "lot",
  cam: keyed([
    [0, C(Lt(1.4, 0.9, 18.6), Lt(0, 9.5, 2), 62)],
    [T.hospital, C(Lt(1.5, 0.95, 17.9), Lt(0, 10.5, 1), 60), "linear"],
    [T.flashlight + 0.25, C(Lt(1.35, 1.45, 15.4), Lt(-0.1, 2.4, 13.3), 46), "inout"],
    [T.three - 0.3, C(Lt(1.3, 1.4, 15.3), Lt(-0.1, 2.6, 13.3), 46), "linear"],
    [T.three + 0.1, C(Lt(-0.6, 0.7, 16.3), Lt(0, 11, 3), 56), "inout"],
    [T.three + 0.85, C(Lt(-0.6, 0.72, 16.3), Lt(0, 11.4, 3), 56), "linear"],
    // the walk-off: the lens pans with him as he passes; the guard is watching from the booth behind him
    [T.then + 0.6, C(Lt(-0.6, 0.95, 16.3), Lt(0.15, 1.45, 14.6), 50), "inout"],
    [T.security + 0.3, C(Lt(-0.6, 1.1, 16.3), Lt(1.6, 1.45, 16.4), 48), "inout"],
    [T.signaling + 0.3, C(Lt(-0.4, 1.3, 16.2), Lt(5.0, 1.6, 16.6), 36), "inout"],
    [T.planning - 0.45, C(Lt(-0.3, 1.32, 16.2), Lt(5.2, 1.62, 16.6), 35), "linear"],
    [T.planning + 0.6, C(Lt(2.2, 1.6, 15.8), Lt(BOOTH[0] - 1.4, 1.72, BOOTH[2] + 0.4), 30), "inout"],
    [T.so, C(Lt(2.3, 1.6, 15.8), Lt(BOOTH[0] - 1.4, 1.72, BOOTH[2] + 0.4), 29), "linear"],
  ]),
  actors: s1Actors,
  extra: (t) => {
    const a = s1Actors(t);
    const on = beamOn1(t);
    const beams: Beam[] = [];
    if (t < T.then + 0.2) { const h = handAt(a[0], "R"); beams.push({ p: h, to: lerpV(W612L, add(h, [0, -0.5, 1.5]), window01(t, T.then - 0.2, 99, 0.4, 0.1)), on }); }
    else { const h = handAt(a[0], "R"); beams.push({ p: h, to: add(h, [0.2, -1.1, 0.5]), on: 0 }); }
    return { beams, lamp612: 0.7, radio: t > T.security + 0.2 ? handAt(a[1], "R") : undefined };
  },
  focus: (t) => (t < T.then ? W612L : t < T.security + 0.1 ? headPosed(s1Actors(t)[0]) : headPosed(s1Actors(t)[1])),
};

// ================================================================== 2. LOT Friday: the grab, the drop, the face
const G_START: V3 = Lt(1.6, 0, 17.6), G_GRAB: V3 = Lt(0.34, 0, 14.58);
const G_IN: WalkSeg = { t0: T.so + 0.05, t1: T.grabbed - 0.05, from: G_START, to: G_GRAB };
const GY2 = yawTo(G_START, G_GRAB);
const FLASH2 = [T.so + 0.05, T.so + 0.4, T.so + 0.75];
const T_DROP = T.flashlight2 + 0.02;
const TOM_TURN = 0.25;
const tomYaw2 = (t: number) => {
  if (t < T.grabbed + 0.3) return PI;
  if (t < T.you) return lerpAng(PI, TOM_TURN, smooth((t - (T.grabbed + 0.3)) / 1.35));
  return lerpAng(TOM_TURN, PI - 0.001, smooth((t - (T.you + 0.05)) / 1.3));
};
const s2Actors = (t: number): Actor[] => {
  const yaw = tomYaw2(t);
  const grab = window01(t, T.grabbed - 0.3, T.flashlight2 + 0.3, 0.35, 0.45);
  const hold = 1 - window01(t, T_DROP, 99, 0.01, 0.4);
  const startle = window01(t, T.grabbed, T.tom - 0.2, 0.35, 0.5);
  let pt: BodyPose = { ...REST, lean: 2 - 4 * startle, headStretch: 1 + 0.1 * window01(t, T.grabbed, T.grabbed + 0.5, 0.08, 0.3) };
  pt = reach(TOM, TOM_P, yaw, pt, "R", aimFrom(TOM, TOM_P, yaw, W612L), hold * (1 - startle), 2);
  const mid = lerpV(head(GUARD, G_GRAB), [-0.55, 1.6, 15.9], 0.5);
  const ahead = local(head(TOM, TOM_P), yaw, 0, 0.1, 2.5);
  const lk = t < T.grabbed ? W612L : t < T.you ? lerpV(lerpV(W612L, ahead, smooth((t - T.grabbed) / 0.25)), mid, smooth((t - (T.grabbed + 1.2)) / 0.4)) : lerpV(lerpV(mid, ahead, smooth((t - T.you) / 0.25)), W612L, smooth((t - (T.you + 0.95)) / 0.4));
  pt = { ...pt, ...look(TOM, TOM_P, yaw, lk) };
  const ft: FaceState = t < T.grabbed ? F("half", "flat", "neutral") : t < T.tom - 0.1 ? F("huge", "gasp", "high", { sweat: true }) : t < T.you ? F("wide", "wavy", "worried", { sweat: t < T.slippers }) : F("half", "smile", "raised", { flush: 0.2 });
  const out = [A(TOM, TOM_P, yaw, pt, ft)];
  const w = walkAt([G_IN], G_START, t, GUARD.height);
  const gy = t < T.you + 0.2 ? GY2 : lerpAng(GY2, PI, smooth((t - (T.you + 0.2)) / 0.8));
  let pg: BodyPose = { ...REST, walk: w.walk, lean: 1 + 4 * grab };
  const tomShoulder = local(head(TOM, TOM_P), PI, -0.24, -0.4, -0.05);
  pg = reach(GUARD, w.p, gy, pg, "R", tomShoulder, grab, 5);
  pg = { ...pg, ...look(GUARD, w.p, gy, lerpV(head(TOM, TOM_P), W612L, smooth((t - (T.you + 0.2)) / 0.9))) };
  const fg: FaceState = t < T.grabbed + 0.2 ? F("glare", "flat", "angry") : t < T.tom ? F("wide", "o", "raised") : t < T.you ? F("open", "o", "worried") : F("half", "flat", "worried");
  out.push(A(GUARD, w.p, gy, pg, fg));
  return out;
};
const handFromS2 = (t: number) => handAt(s2Actors(t)[0], "R");
const FL_REST: V3 = Lt(-0.25, 0.035, 15.35);
/** Tom's flashlight in scene 2: held, falling, bouncing, rolling to the guard's boots */
const tomLight2 = (t: number): Beam => {
  if (t < T_DROP) {
    const h = handFromS2(t);
    const on = t < T.grabbed + 0.1 ? Math.max(pulses(t, FLASH2, 0.2), t > T.so + 1.0 ? 1 : 0) : 1;
    return { p: h, to: t < T.grabbed + 0.15 ? W612L : add(h, [0.6, 2.0, -1.2]), on };
  }
  const p0 = handFromS2(T_DROP);
  const land: V3 = [p0[0], 0.035, p0[2]];
  const fall = Math.min(1, (t - T_DROP) / 0.36);
  if (fall < 1) { const p: V3 = [p0[0], p0[1] - (p0[1] - 0.035) * fall * fall, p0[2]]; return { p, to: add(p, [Math.sin(t * 9), -1.2, Math.cos(t * 9)]), on: 1 }; }
  const tb = t - T_DROP - 0.36;
  const roll = smooth(Math.min(1, Math.max(0, (tb - 0.12) / 0.85)));
  const p = lerpV(land, FL_REST, roll);
  const hop = tb < 0.12 ? 0.08 * Math.sin((tb / 0.12) * PI) : 0;
  const dir = [FL_REST[0] - land[0], FL_REST[2] - land[2]];
  const L = Math.hypot(dir[0], dir[1]) || 1;
  const perp: V3 = [dir[1] / L, 0, -dir[0] / L];
  const toward = [G_GRAB[0] - FL_REST[0], G_GRAB[2] - FL_REST[2]];
  const sgn = perp[0] * toward[0] + perp[2] * toward[1] > 0 ? 1 : -1;
  const pp: V3 = [p[0], p[1] + hop, p[2]];
  return { p: pp, to: add(pp, [sgn * perp[0] * 2, 0.02, sgn * perp[2] * 2]), on: 1 };
};
const s2: Scene = {
  id: 2, t0: T.so - 0.1, mood: "night", blur: 1.0, set: "lot",
  cam: keyed([
    [T.so - 0.1, C(Lt(-2.6, 1.3, 16.9), Lt(0, 2.6, 13.6), 46)],
    [T.guard - 0.3, C(Lt(-2.7, 1.35, 16.6), Lt(0, 2.5, 13.7), 46), "linear"],
    // the guard's entrance: widen and pan right to find him walking in
    [T.guard + 0.35, C(Lt(-2.9, 1.5, 15.6), Lt(0.9, 1.5, 16.4), 60), "inout"],
    [T.grabbed - 0.25, C(Lt(-2.6, 1.55, 15.3), Lt(0.4, 1.5, 15.1), 54), "linear"],
    [T.grabbed + 0.15, C(Lt(-2.4, 1.6, 15.6), Lt(0.2, 1.5, 14.3), 50), "inout"],
    [T_DROP - 0.05, C(Lt(-2.35, 1.58, 15.6), Lt(0.2, 1.45, 14.3), 50), "linear"],
    // the fall and the roll to the guard's boots (handoff)
    [T_DROP + 0.4, C(Lt(-1.6, 0.95, 15.9), Lt(0.0, 0.1, 14.6), 50), "inout"],
    [T_DROP + 1.25, C(Lt(-0.9, 0.62, 16.6), Lt(-0.1, 0.2, 15.2), 50), "inout"],
    // up from his boots to Tom's face
    [T.tom + 0.1, C(Lt(-1.15, 1.6, 15.75), Lt(-0.05, 1.55, 14.05), 44), "inout"],
    [T.slippers - 0.25, C(Lt(-1.1, 1.6, 15.7), Lt(-0.05, 1.55, 14.05), 42), "linear"],
    [T.slippers + 0.2, C(Lt(-0.45, 0.8, 15.5), Lt(0.0, 0.1, 14.15), 42), "inout"],
    [T.you, C(Lt(-0.45, 0.8, 15.45), Lt(0.0, 0.12, 14.15), 41), "linear"],
    [T.you + 0.45, C(Lt(-0.9, 1.4, 16.8), Lt(0.0, 1.5, 14.0), 48), "inout"],
    // he looks up; the lens rises behind him to the 6th floor, then pushes in on window 612
    [T.ellen + 0.05, C(Lt(-0.75, 1.4, 16.9), Lt(0, 12, 2), 54), "inout"],
    [T.room + 0.35, C(Lt(-0.6, 1.55, 16.4), Lt(0, 16.35, 0), 15), "inout"],
    [T.visiting - 0.2, C(Lt(-0.6, 1.55, 16.35), Lt(0, 16.4, 0), 14), "linear"],
    // the VISITING HOURS sign
    [T.visiting + 0.4, C(Lt(-0.55, 1.6, 16.2), Lt(VISIT_SIGN[0], 1.55, VISIT_SIGN[2]), 30), "inout"],
    [T.fifty, C(Lt(-0.6, 1.6, 15.8), Lt(VISIT_SIGN[0], 1.55, VISIT_SIGN[2]), 26), "linear"],
  ]),
  actors: s2Actors,
  extra: (t) => ({ beams: [tomLight2(t)], lamp612: 0.7 }),
  focus: (t) => {
    if (t < T.guard) return headPosed(s2Actors(t)[0]);
    if (t < T.grabbed - 0.2) return headPosed(s2Actors(t)[1]);
    if (t < T_DROP + 0.45) return headPosed(s2Actors(t)[0]);
    if (t < T.tom - 0.2) return tomLight2(t).p;
    if (t < T.slippers - 0.25) return headPosed(s2Actors(t)[0]);
    if (t < T.you) return Lt(0, 0.1, 14.1);
    if (t < T.you + 0.5) return headPosed(s2Actors(t)[0]);
    if (t < T.visiting) return W612L;
    return Lt(VISIT_SIGN[0], 1.55, VISIT_SIGN[2]);
  },
};

// ================================================================== 3. FB 1974: the porch light
const YT_YAW = yawTo(YT_P, PORCH_SWITCH);
const PORCH_BLINKS = [T.three2 - 0.02, T.three2 + 0.32, T.three2 + 0.66];
const s3Actors = (t: number): Actor[] => {
  const yt = Fb(YT_P[0], YT_P[1], YT_P[2]);
  const yaw = YT_YAW;
  const flick = window01(t, T.flashed - 0.3, T.love - 0.45, 0.3, 0.3);
  const tap = PORCH_BLINKS.reduce((m, s) => Math.max(m, window01(t, s - 0.08, s + 0.08, 0.06, 0.06)), 0) + window01(t, T.flashed - 0.06, T.flashed + 0.1, 0.06, 0.06);
  let pt: BodyPose = { ...REST, lean: 4 };
  pt = reach(YOUNG_TOM, yt, yaw, pt, "R", add(Fb(PORCH_SWITCH[0], PORCH_SWITCH[1], PORCH_SWITCH[2]), [0, 0.02 - 0.05 * tap, 0.13]), flick, 4);
  pt = { ...pt, ...look(YOUNG_TOM, yt, yaw, Fb(YE_P[0], 1.55, YE_P[2])) };
  const out = [A(YOUNG_TOM, yt, yaw, pt, t > T.love - 0.4 ? F("closed", "beam", "raised", { flush: 0.4 }) : F("open", "smile", "raised"))];
  const ye = Fb(YE_P[0], YE_P[1], YE_P[2]);
  const heart = window01(t, T.love - 0.1, 99, 0.35, 0.1);
  let pe: BodyPose = { ...REST, lean: 3, headTilt: 10 * heart };
  pe = reach(YOUNG_ELLEN, ye, PI, pe, "L", local(ye, PI, -0.08, 1.08, 0.2), heart, 3);
  pe = { ...pe, ...look(YOUNG_ELLEN, ye, PI, yt) };
  out.push(A(YOUNG_ELLEN, ye, PI, pe, heart > 0.4 ? F("closed", "beam", "raised", { flush: 0.5 }) : F("open", "smile", "raised")));
  return out;
};
const s3: Scene = {
  id: 3, t0: T.fifty - 0.08, mood: "dusk", blur: 1.0, set: "fb", dip: true, sepia: true,
  cam: keyed([
    [T.fifty - 0.08, C(Fb(2.1, 1.95, 1.0), Fb(0.5, 1.9, 0.45), 54)],
    [T.flashed - 0.4, C(Fb(1.95, 1.95, 0.55), Fb(0.55, 1.75, 0.35), 54), "inout"],
    [T.three2 + 0.3, C(Fb(1.95, 1.97, 0.6), Fb(0.6, 1.75, 0.3), 54), "linear"],
    // pan out across the street, the long lens landing on her window
    [T.love + 0.6, C(Fb(1.5, 1.8, 3.4), Fb(1.2, 1.65, 14.75), 16), "inout"],
    [T.guard2, C(Fb(1.5, 1.8, 3.45), Fb(1.2, 1.65, 14.75), 15), "linear"],
  ]),
  actors: s3Actors,
  extra: (t) => ({ porch: t > T.three2 + 0.9 ? 1 : pulses(t, [T.flashed, ...PORCH_BLINKS], 0.2) }),
  focus: (t) => (t < T.love - 0.3 ? headPosed(s3Actors(t)[0]) : headPosed(s3Actors(t)[1])),
};

// ================================================================== 4. LOT Friday: the window answers
const G2: V3 = Lt(0.95, 0, 14.55);
const ELLEN_W = Lt(ELLEN_P[0], ELLEN_P[1], ELLEN_P[2]);
const PHONE3 = [T.blinked + 0.02, T.blinked + 0.38, T.blinked + 0.74];
const ellenActor = (t: number, phoneUp: number, beam: boolean): Actor => {
  let pe: BodyPose = { ...REST, lean: 2 };
  pe = reach(ELLEN, ELLEN_W, 0, pe, "R", local(head(ELLEN, ELLEN_W), 0, 0.16, -0.3, 0.36), phoneUp, 2);
  pe = reach(ELLEN, ELLEN_W, 0, pe, "L", local(ELLEN_W, 0, -0.12, 1.05, 0.22), phoneUp * 0.6, 2);
  pe = { ...pe, ...look(ELLEN, ELLEN_W, 0, Lt(0.4, 1.6, 14.3)) };
  return A(ELLEN, ELLEN_W, 0, pe, beam ? F("closed", "beam", "raised", { flush: 0.4 }) : F("open", "smile", "raised"));
};
const s4Actors = (t: number): Actor[] => {
  const up = window01(t, T.looked - 0.25, 99, 0.75, 0.1);
  let pt: BodyPose = { ...REST, lean: 1 };
  pt = { ...pt, ...look(TOM, TOM_P, PI, W612L) };
  let pg: BodyPose = { ...REST, lean: 2 };
  pg = { ...pg, ...look(GUARD, G2, PI, lerpV(Lt(0.4, 1.7, 12.5), W612L, up)) };
  const out = [
    A(TOM, TOM_P, PI, pt, t > T.blinked ? F("closed", "beam", "raised", { flush: 0.4 }) : F("half", "smile", "raised")),
    A(GUARD, G2, PI, pg, t > T.blinked ? F("sparkle", "o", "high") : up > 0.5 ? F("wide", "o", "raised") : F("half", "flat", "worried")),
  ];
  out.push(ellenActor(t, window01(t, T.tiny - 0.4, 99, 0.45, 0.1), t > T.three3 + 0.4));
  return out;
};
const s4: Scene = {
  id: 4, t0: T.guard2 - 0.12, mood: "night", blur: 1.0, set: "lot",
  cam: keyed([
    [T.guard2 - 0.12, C(Lt(2.0, 1.55, 16.3), Lt(0.85, 1.8, 14.4), 42)],
    [T.looked + 0.05, C(Lt(1.95, 1.5, 16.3), Lt(0.6, 2.6, 13.6), 44), "inout"],
    // the lens climbs toward window 612
    [T.tiny + 0.3, C(Lt(0.6, 8.3, 9.6), Lt(0.05, 16.4, 0), 22), "inout"],
    [T.next - 0.1, C(Lt(0.55, 8.5, 9.3), Lt(0.05, 16.45, 0), 20), "linear"],
  ]),
  actors: s4Actors,
  extra: (t) => {
    const a = s4Actors(t);
    const ph = handAt(a[2], "R");
    const on = pulses(t, PHONE3, 0.2);
    return { beams: [{ p: FL_REST, to: add(FL_REST, [-1.6, 0.02, -0.8]), on: 1 }, { p: add(ph, [0, 0.03, 0.06]), to: Lt(0.4, 1.6, 14.3), on }], lamp612: 0.9, phone: { p: ph, on } };
  },
  focus: (t) => (t < T.window ? headPosed(s4Actors(t)[1]) : headPosed(s4Actors(t)[2])),
};

// ================================================================== 5. LOT next night: everyone answers
const G3: V3 = Lt(1.05, 0, 14.5);
const NA_IN: WalkSeg = { t0: T.next - 0.05, t1: T.nurses + 0.45, from: Lt(-1.2, 0, 8.0), to: Lt(-1.15, 0, 14.4) };
const NB_IN: WalkSeg = { t0: T.next + 0.15, t1: T.nurses + 0.6, from: Lt(-2.6, 0, 8.6), to: Lt(-2.05, 0, 15.15) };
const blinkAll = (t: number, i: number) => pulses(t, [0, 0.36, 0.72].map((d) => T.blinked2 - 0.25 + d + 0.05 * ((i * 7) % 5)), 0.2);
const peopleBeam = (t: number) => (t < T.blinked2 - 0.35 ? 1 : pulses(t, [T.blinked2 - 0.35, T.blinked2 + 0.01, T.blinked2 + 0.37], 0.2) || (t > T.blinked2 + 0.75 ? 1 : 0));
const s5Actors = (t: number): Actor[] => {
  const out: Actor[] = [];
  const raise = window01(t, T.own - 0.3, 99, 0.6, 0.1);
  let pt: BodyPose = { ...REST, lean: 1 };
  pt = reach(TOM, TOM_P, PI, pt, "R", aimFrom(TOM, TOM_P, PI, W612L), 1, 1);
  pt = { ...pt, ...look(TOM, TOM_P, PI, W612L) };
  out.push(A(TOM, TOM_P, PI, pt, F("closed", "beam", "raised", { flush: 0.3 })));
  const gy = PI + 0.15;
  let pg: BodyPose = { ...REST, lean: 2 };
  pg = reach(GUARD, G3, gy, pg, "R", local(G3, gy, 0.1, 1.05, 0.28), 1, 2);
  pg = reach(GUARD, G3, gy, pg, "R", aimFrom(GUARD, G3, gy, W612L), raise, 2);
  pg = { ...pg, ...look(GUARD, G3, gy, lerpV(s5.cam(t).pos, W612L, smooth((t - (T.own + 0.1)) / 0.7))) };
  out.push(A(GUARD, G3, gy, pg, t < T.own + 0.4 ? F("half", "grin", "raised") : F("open", "smile", "raised")));
  for (const [spec, seg] of [[NURSE_A, NA_IN], [NURSE_B, NB_IN]] as [CharacterSpec, WalkSeg][]) {
    const w = walkAt([seg], seg.from, t, spec.height);
    const arrived = smooth((t - seg.t1 + 0.2) / 1.3);
    const up = smooth((t - seg.t1 - 1.0) / 0.6);
    const y = lerpAng(yawTo(seg.from, seg.to), PI, arrived);
    let pn: BodyPose = { ...REST, walk: w.walk, lean: 3 };
    pn = reach(spec, w.p, y, pn, "R", local(w.p, y, 0.1, 1.05, 0.28), 1, 3);
    pn = reach(spec, w.p, y, pn, "R", aimFrom(spec, w.p, y, W612L), up, 3);
    pn = { ...pn, ...look(spec, w.p, y, lerpV(lerpV(s5.cam(t).pos, local(head(spec, w.p), y, 0, 0.3, 2.5), smooth((t - (seg.t1 - 0.9)) / 0.9)), W612L, up)) };
    out.push(A(spec, w.p, y, pn, F("open", "smile", "raised")));
  }
  out.push(ellenActor(t, 1, true));
  return out;
};
const s5: Scene = {
  id: 5, t0: T.next - 0.1, mood: "night", blur: 1.0, set: "lot", dip: true,
  cam: keyed([
    [T.next - 0.1, C(Lt(1.7, 1.45, 12.7), Lt(1.05, 1.45, 14.5), 42)],
    [T.own + 0.3, C(Lt(1.6, 1.5, 12.85), Lt(1.0, 1.55, 14.5), 40), "linear"],
    // the nurses' entrance: widen and pan left
    [T.nurses - 0.05, C(Lt(1.4, 1.6, 11.7), Lt(-1.5, 1.4, 13.6), 58), "inout"],
    [T.whole - 0.8, C(Lt(1.3, 1.6, 11.6), Lt(-1.4, 1.45, 13.8), 58), "linear"],
    // up and back: the lot below, the whole 6th floor blinking
    [T.blinked2 + 0.5, C(Lt(2.2, 3.6, 19.5), Lt(0, 6.5, 5), 72), "inout"],
    [SECONDS, C(Lt(2.2, 3.7, 19.9), Lt(0, 6.6, 5), 72), "linear"],
  ]),
  actors: s5Actors,
  extra: (t) => {
    const a = s5Actors(t);
    const on = peopleBeam(t);
    const beams: Beam[] = [{ p: handAt(a[0], "R"), to: W612L, on }];
    { const h = handAt(a[1], "R"); beams.push({ p: h, to: lerpV(add(h, [0, -0.3, -1.5]), W612L, window01(t, T.own - 0.3, 99, 0.6, 0.1)), on: t < T.own ? 0 : on }); }
    for (const k of [2, 3]) { const h = handAt(a[k], "R"); const seg = [NA_IN, NB_IN][k - 2]; const up = smooth((t - seg.t1 - 1.0) / 0.6); beams.push({ p: h, to: lerpV(add(h, [0, -0.6, 1.5]), W612L, up), on: up > 0.95 ? on : 1 }); }
    const sixth = SIX_X.map((_, i) => (i === 7 ? 0 : blinkAll(t, i)));
    const ph = handAt(a[4], "R");
    const pon = t > T.blinked2 - 0.4 ? pulses(t, [T.blinked2 - 0.25, T.blinked2 + 0.11, T.blinked2 + 0.47], 0.2) || (t > T.blinked2 + 0.85 ? 1 : 0) : 1;
    beams.push({ p: add(ph, [0, 0.03, 0.06]), to: Lt(0.4, 1.6, 14.3), on: pon });
    return { beams, sixth, lamp612: 1, phone: { p: ph, on: pon }, next: true };
  },
  focus: (t) => (t < T.nurses - 0.3 ? headPosed(s5Actors(t)[1]) : t < T.whole - 0.6 ? headPosed(s5Actors(t)[2]) : Lt(0, 9, 6)),
};

export const SCENES: Scene[] = [s1, s2, s3, s4, s5];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const FLASHES_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0), drop: T_DROP, flash1: FLASH1, flash2: FLASH2, porch: [T.flashed, ...PORCH_BLINKS], phone: PHONE3, guardIn: G_IN, tomOut: TOM_OUT, nurseA: NA_IN, nurseB: NB_IN });
