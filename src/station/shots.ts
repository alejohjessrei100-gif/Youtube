// "Point at One Person" as DATA. One continuous keyed lens per scene; eased moves land on the spoken nouns.
//   1 HALL   the man collapses; the crowd walks past; the clock jumps a minute, two; the girl runs in, her backpack
//            slides to the red jacket's feet (handoff); she points and shouts; he calls
//   2 HALL   the crowd frozen in a ring (high, wide); then 2D inserts: a group chat "seen by 30", the effect's name
//   3 LAB    1968: booth A (alone) — the student rushes out (run); booth B (five others) — the student waits
//   4 HALL   the paramedics run in; the girl turns to us and points at the lens
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lerp, mixArm, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { C, hand, head, headPosed, ik, keyed, lerpAng, look, smooth, yawTo } from "../crow/shots";
import { COMMUTERS, GIRL, MEDIC_A, MEDIC_B, RED, STUDENT_A, STUDENT_B, VICTIM } from "./cast";
import { BOOTH_A, BOOTH_B, CLOCK_P, HALL, LAB, LAB_DOOR, VICTIM_P } from "./world";
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
const Hh = at(HALL), Lb = at(LAB);
/** a point in a character's frame: side (+ = its right, the "R" arm side), up, forward */
const local = (p: V3, yaw: number, s: number, u: number, f: number): V3 => [p[0] + f * Math.sin(yaw) + s * Math.cos(yaw), p[1] + u, p[2] + f * Math.cos(yaw) - s * Math.sin(yaw)];
const talk = (t: number, a: number, b: number, open: FaceState["mouth"] = "open", rest: FaceState["mouth"] = "flat"): FaceState["mouth"] => (t < a || t > b ? rest : Math.floor((t - a) * 9) % 2 === 0 ? open : "o");

export const T = {
  collapsed: W("collapsed"), station: W("station"), hundreds: W("hundreds"), walked: W("walked"), nobody: W("nobody"), one: W("one"),
  two: W("two."), then: W("then"), girl: W("girl,"), dropped: W("dropped"), pointed: W("pointed"), red: W("red"), shouted: W("shouted,"),
  you: W("you!"), call: W("call"), ambulance: W("ambulance!"), he: W("he"), instantly: W("instantly."), see: W("see,"), waits: W("waits"),
  ever: W("ever"), chat: W("chat"), psych: W("psychologists"), bystander: W("bystander"), famous: W("famous"), alone: W("alone"),
  rushed: W("rushed"), while: W("while"), others: W("others"), waited: W("waited."), that: W("that"), girl2: W("girl", 2),
  finger: W("finger."), so: W("so"), crowd: W("crowd,"), dont: W("don't"), somebody: W("somebody."), point: W("point"), person: W("person."),
};

// ------------------------------------------------------------------ types and helpers
export type Lying = { p: V3; r: V3 };
export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState; lying?: Lying };
export type Prop = { p: V3; r?: V3 };
export type Extra = { backpack?: Prop; briefcase?: Prop; phone?: Prop; bags?: Prop[]; clockMin?: number; talk?: number; door?: number; overlay?: "chat" | "title" };
export type SetId = "hall" | "lab";
export type Scene = { id: number; t0: number; mood: string; blur: number; set: SetId; cam: (t: number) => Cam; actors: (t: number) => Actor[]; extra: (t: number) => Extra; focus: (t: number) => V3; dip?: boolean; sepia?: boolean };
const A = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState, lying?: Lying): Actor => ({ spec, p, yaw, pose, face, lying });
let reachErr = 0;
let reachWho = "";
export const takeReachErr = () => { const e = reachErr; reachErr = 0; return e; };
export const takeReachWho = () => { const w = reachWho; reachWho = ""; return w; };
const reach = (spec: CharacterSpec, p: V3, yaw: number, base: BodyPose, side: "L" | "R", target: V3, u: number, lean = 0, sit = 0): BodyPose => {
  if (u <= 0) return base;
  const k = ik(spec, p, yaw, side, target, lean, sit);
  if (u > 0.7 && k.err > reachErr) { reachErr = k.err; reachWho = `seed ${spec.look.seed} ${side}`; }
  return side === "R" ? { ...base, armR: mixArm(base.armR ?? REST.armR!, k.arm, u), armRFwd: lerp(base.armRFwd ?? 10, k.fwd, u) } : { ...base, armL: mixArm(base.armL ?? REST.armL!, k.arm, u), armLFwd: lerp(base.armLFwd ?? 10, k.fwd, u) };
};
export const handAt = (a: Actor, side: "L" | "R") => hand(a.spec, a.p, a.yaw, a.pose, side) as V3;
/** look(), with the target folded into the front +-50 deg arc (keeps the head from flipping when a target goes behind) */
const lookF = (spec: CharacterSpec, p: V3, yaw: number, target: V3, sit = 0) => {
  const h = head(spec, p, sit);
  const dx = target[0] - h[0], dz = target[2] - h[2];
  const dist = Math.max(0.5, Math.hypot(dx, dz));
  let rel = Math.atan2(Math.sin(Math.atan2(dx, dz) - yaw), Math.cos(Math.atan2(dx, dz) - yaw));
  rel = Math.max(-0.87, Math.min(0.87, rel));
  const a = yaw + rel;
  return look(spec, p, yaw, [h[0] + Math.sin(a) * dist, target[1], h[2] + Math.cos(a) * dist], sit);
};
/** a pointing arm: the hand `k` m from the shoulder toward `to` */
const pointAt = (spec: CharacterSpec, p: V3, yaw: number, to: V3, k: number): V3 => {
  const s = local(head(spec, p), yaw, 0.1 * spec.height, -0.22 * spec.height, 0);
  const d = [to[0] - s[0], to[1] - s[1], to[2] - s[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  return [s[0] + (d[0] / L) * k, s[1] + (d[1] / L) * k, s[2] + (d[2] / L) * k];
};
/** the lying head (for the lens and the checker): soles at `p`, tipped back by r[0] about x */
export const lyingHead = (spec: CharacterSpec, l: Lying): V3 => { const y = head(spec, [0, 0, 0])[1]; return [l.p[0], l.p[1] + y * Math.cos(l.r[0]), l.p[2] + y * Math.sin(l.r[0])]; };

// ================================================================== the hall's people (scenes 1, 2, 4 share them)
const VP = Hh(VICTIM_P[0], VICTIM_P[1], VICTIM_P[2]);
const FALL0 = T.collapsed + 0.05, FALL1 = FALL0 + 0.5;
const victimLie = (t: number): Lying => {
  const u = Math.min(1, Math.max(0, (t - FALL0) / (FALL1 - FALL0)));
  const g = u * u;
  const bounce = t > FALL1 ? 0.06 * Math.exp(-(t - FALL1) * 9) * Math.sin((t - FALL1) * 30) : 0;
  return { p: [VP[0], VP[1] + 0.17 * g, VP[2]], r: [-(PI / 2) * g + bounce * 0.3, 0, 0] };
};
const victim = (t: number): Actor => {
  const clutch = window01(t, -0.2, FALL0 + 0.35, 0.25, 0.55);
  let pv: BodyPose = { ...REST, lean: 6 * clutch };
  pv = reach(VICTIM, [0, 0, 0], 0, pv, "L", [-0.05, VICTIM.height * 0.7, 0.2], clutch, 6);
  const slump = smooth((t - FALL1) / 0.35);
  pv = { ...pv, armL: mixArm(pv.armL!, [30, 20], slump), armR: mixArm(pv.armR!, [45, 25], slump), armLFwd: lerp(pv.armLFwd!, 0, slump), armRFwd: lerp(pv.armRFwd!, -10, slump) };
  const out = t > FALL1 + 0.1;
  return A(VICTIM, VP, 0, pv, out ? F("closed", "o", "neutral") : F("squint", "grimace", "worried", { sweat: true }), victimLie(t));
};
export const victimHead = (t: number) => lyingHead(VICTIM, victimLie(t));
const STOP = (k: number) => T.you + 0.15 + 0.12 * k;
type Lane = { spec: CharacterSpec; from: V3; to: V3; stop: number; t0: number };
const SPEED = 1.25;
/** a commuter walking from `from` at t0 (at SPEED) until `to`, or until they stop when the girl shouts */
const lane = (spec: CharacterSpec, from: V3, to: V3, t0: number, stop: number): Lane => ({ spec, from, to, t0, stop: Math.min(stop, t0 + Math.hypot(to[0] - from[0], to[2] - from[2]) / SPEED) });
const LANES: Lane[] = [
  lane(COMMUTERS[0], Hh(-5.2, 0, -2.1), Hh(5.4, 0, -2.1), 0, STOP(0)),
  lane(COMMUTERS[1], Hh(11.0, 0, -4.3), Hh(-2.4, 0, -4.3), 0.5, STOP(1)),
  lane(COMMUTERS[2], Hh(11.0, 0, 1.6), Hh(4.4, 0, 1.6), 5.2, STOP(2)),
  lane(COMMUTERS[3], Hh(-12, 0, 4.7), Hh(-4.9, 0, 4.7), 6.6, STOP(3)),
  lane(COMMUTERS[4], Hh(-1.6, 0, -11.8), Hh(-1.6, 0, -2.6), 2.5, STOP(4)),
  lane(COMMUTERS[5], Hh(3.6, 0, 10.4), Hh(3.4, 0, 5.6), 4.6, STOP(5)),
  lane(COMMUTERS[6], Hh(-12, 0, -6.4), Hh(5.0, 0, -6.4), 0, STOP(6)),
  lane(COMMUTERS[7], Hh(12, 0, 7.2), Hh(0.2, 0, 7.2), 2.8, STOP(7)),
  // more people across the back and the sides
  lane(COMMUTERS[1], Hh(-11, 0, -10.0), Hh(6, 0, -10.0), 0, 99),
  lane(COMMUTERS[3], Hh(11, 0, -11.2), Hh(-4.5, 0, -11.2), 0.8, 99),
  lane(COMMUTERS[6], Hh(8.8, 0, -11), Hh(8.8, 0, 8), 0, 99),
  lane(COMMUTERS[0], Hh(-7.6, 0, 8), Hh(-7.6, 0, -5.8), 1.0, 99),
  lane(COMMUTERS[4], Hh(11, 0, 0.0), Hh(3.4, 0, 0.0), 3.0, STOP(4) + 0.3),
  lane(COMMUTERS[2], Hh(-12, 0, 8.8), Hh(10, 0, 8.8), 0, 99),
];
const laneSeg = (l: Lane): WalkSeg => {
  const L = Math.hypot(l.to[0] - l.from[0], l.to[2] - l.from[2]);
  const u = Math.min(1, ((l.stop - l.t0) * SPEED) / L);
  return { t0: l.t0, t1: l.stop, from: l.from, to: lerpV(l.from, l.to, u) };
};
const commuters = (t: number, s: Scene): Actor[] =>
  LANES.map((l, k) => {
    const seg = laneSeg(l);
    const w = walkAt([seg], seg.from, Math.max(t, seg.t0), l.spec.height);
    const yWalk = yawTo(l.from, l.to);
    const after = smooth((t - l.stop) / 0.9);
    const target = lerpV(Hh(-1.4, 1.0, 2.6), victimHead(t), smooth((t - (T.see - 0.4)) / 0.9));
    const yaw = lerpAng(yWalk, lerpAng(yWalk, yawTo(w.p, target), 0.6), after);
    let pc: BodyPose = { ...REST, walk: t < l.stop ? w.walk : undefined, lean: 2 };
    // passing the man: a glance down, then eyes front (nobody stops)
    const near = Math.hypot(w.p[0] - VP[0], w.p[2] - (VP[2] - 0.5));
    const glance = t < l.stop ? Math.max(0, 1 - Math.max(0, near - 1.6) / 2.0) : 0;
    const lk = after > 0.01 ? lerpV(local(head(l.spec, w.p), yaw, 0, -0.1, 3), target, after) : lerpV(local(head(l.spec, w.p), yaw, 0, 0, 3), victimHead(t), glance * 0.8);
    pc = { ...pc, ...lookF(l.spec, w.p, yaw, lk) };
    // a ring of shrugs and side glances once the girl has shouted
    const shrug = window01(t, T.see + 0.2 + 0.15 * k, T.waits + 1.2 + 0.1 * k, 0.4, 0.4) * (k % 3 === 0 ? 1 : 0);
    if (shrug > 0) pc = { ...pc, armL: mixArm(pc.armL!, [60, 95], shrug), armR: mixArm(pc.armR!, [60, 95], shrug), headTilt: 10 * shrug };
    void s;
    return A(l.spec, w.p, yaw, pc, after > 0.5 ? F(k % 2 ? "wide" : "half", k % 2 ? "o" : "flat", "worried") : F("half", "flat", "neutral"));
  });
// the girl
const G_IN: WalkSeg = { t0: T.then - 0.05, t1: T.dropped - 0.05, from: Hh(-4.5, 0, 6.8), to: Hh(-1.4, 0, 2.6) };
const G_P = G_IN.to;
const R_SEG: WalkSeg = { t0: T.pointed - 7.5 / SPEED, t1: T.pointed, from: Hh(-5.6, 0, 3.15), to: Hh(1.9, 0, 3.15) };
const R_P = R_SEG.to;
const R_BACK: WalkSeg = { t0: T.see + 0.3, t1: T.see + 1.1, from: R_P, to: Hh(2.6, 0, 3.6) };
const redPos = (t: number) => (t < R_BACK.t0 ? walkAt([R_SEG], R_SEG.from, Math.max(t, R_SEG.t0), RED.height) : walkAt([R_BACK], R_BACK.from, t, RED.height));
const girl = (t: number, final: boolean, camPos: V3): Actor => {
  const w = walkAt([G_IN], G_IN.from, Math.max(t, G_IN.t0), GIRL.height);
  const yIn = yawTo(G_IN.from, G_IN.to);
  const yRed = yawTo(G_P, R_P);
  const yCam = yawTo(G_P, camPos);
  let yaw = t < T.dropped ? yIn : lerpAng(yIn, yRed, smooth((t - T.dropped) / 0.5));
  if (final) yaw = lerpAng(yawTo(G_P, Hh(0.6, 0, 0.2)), yawTo(G_P, Hh(-0.4, 0, 1.6)), smooth((t - (T.so - 0.3)) / 0.8));
  const rh = head(RED, redPos(t).p);
  let pg: BodyPose = { ...REST, walk: t < G_IN.t1 ? w.walk : undefined, lean: t < G_IN.t1 ? 8 : 3 };
  const pointK = final ? window01(t, T.point - 0.35, 99, 0.3, 0.1) : window01(t, T.pointed - 0.1, T.instantly, 0.3, 0.5);
  const target = final ? local(head(GIRL, G_P), yaw, 0.45, 0.0, 1.0) : rh;
  if (pointK > 0) pg = reach(GIRL, w.p, yaw, pg, "R", pointAt(GIRL, w.p, yaw, target, final ? 0.34 : 0.36), pointK, 3);
  const finger = final ? window01(t, T.that + 0.3, T.so - 0.2, 0.3, 0.3) : 0;
  if (finger > 0) pg = reach(GIRL, w.p, yaw, pg, "R", pointAt(GIRL, w.p, yaw, local(head(GIRL, w.p), yaw, 0.1, 0.6, 1.0), 0.3), finger, 3);
  const lk = final ? lerpV(Hh(0.9, 0.5, 0.0), camPos, smooth((t - (T.so - 0.2)) / 0.5)) : lerpV(lerpV(local(head(GIRL, w.p), yaw, 0, -0.1, 3), rh, smooth((t - (T.dropped - 0.1)) / 0.4)), victimHead(t), smooth((t - (T.see - 0.2)) / 0.6));
  pg = { ...pg, ...lookF(GIRL, w.p, yaw, lk) };
  const shout = !final && t > T.you - 0.15 && t < T.ambulance + 0.55;
  const face = final
    ? t > T.point - 0.3 ? F("open", "smile", "raised") : t > T.that ? F("half", "smirk", "raised") : F("open", "flat", "worried")
    : shout ? F("wide", talk(t, T.you - 0.1, T.ambulance + 0.5, "yell", "open"), "angry") : t > T.pointed ? F("open", "frown", "angry") : F("wide", "o", "worried");
  void yCam;
  return A(GIRL, w.p, yaw, pg, face);
};
const red = (t: number): Actor => {
  const w = redPos(t);
  const yW = yawTo(R_SEG.from, R_SEG.to);
  let yaw = t < T.pointed ? yW : lerpAng(yW, yawTo(R_P, G_P), smooth((t - T.pointed) / 1.4));
  if (t > R_BACK.t0) yaw = lerpAng(yawTo(R_P, G_P), yawTo(w.p, VP), smooth((t - R_BACK.t0) / 0.6));
  const phone = window01(t, T.he - 0.25, 99, 0.35, 0.1);
  let pr: BodyPose = { ...REST, walk: w.walk, lean: 2 };
  pr = reach(RED, w.p, yaw, pr, "R", local(head(RED, w.p), yaw, 0.25, -0.03, 0.03), phone, 2);
  const lk = lerpV(lerpV(lerpV(local(head(RED, w.p), yaw, 0, -0.15, 3), local(head(RED, w.p), yaw, 0, -0.9, 1.2), smooth((t - (T.pointed - 0.2)) / 0.4)), head(GIRL, G_P), smooth((t - (T.pointed + 1.1)) / 0.4)), victimHead(t), smooth((t - (T.see + 0.3)) / 0.6));
  pr = { ...pr, ...lookF(RED, w.p, yaw, lk) };
  const face = t < T.pointed ? F("half", "flat", "neutral") : t < T.he ? F("huge", "o", "high", { sweat: true }) : F("open", talk(t, T.he + 0.1, T.see + 0.5), "worried");
  return A(RED, w.p, yaw, pr, face);
};
// the backpack: on her back, then dropped, then sliding to his feet (the handoff)
const BAG_DROP = T.dropped + 0.05;
const BAG_END: V3 = Hh(1.42, 0, 3.32);
const backpack = (t: number, g: Actor): Prop => {
  if (t < BAG_DROP) return { p: local(g.p, g.yaw, 0, 0.42, -0.2), r: [0, g.yaw, 0] };
  const p0 = local(G_P, yawTo(G_IN.from, G_IN.to), 0, 0.42, -0.2);
  const fall = Math.min(1, (t - BAG_DROP) / 0.22);
  if (fall < 1) return { p: [p0[0], p0[1] * (1 - fall * fall), p0[2]], r: [0.4 * fall, yawTo(G_IN.from, G_IN.to), 0] };
  const u = Math.min(1, (t - BAG_DROP - 0.22) / 0.75);
  const e = 1 - (1 - u) * (1 - u);
  const p1: V3 = [p0[0], 0, p0[2]];
  return { p: lerpV(p1, BAG_END, e), r: [PI / 2, yawTo(p1, BAG_END) + e * 1.2, 0] };
};
// the briefcase: in his hand, then on the floor
const briefcase = (t: number): Prop => (t < FALL0 + 0.1 ? { p: add(VP, [0.38, 0.55, 0.05]) } : { p: lerpV(add(VP, [0.38, 0.55, 0.05]), add(VP, [0.75, 0.05, 0.35]), Math.min(1, ((t - FALL0 - 0.1) / 0.3) ** 2)), r: [PI / 2 * Math.min(1, (t - FALL0 - 0.1) / 0.3), 0.4, 0] });
const clockMin = (t: number) => 41 + (t > T.one + 0.05 ? 1 : 0) + (t > T.two ? 1 : 0) + (t > T.see ? 2 : 0) + (t > T.that - 0.1 ? 6 : 0);

// ================================================================== 1. HALL: the collapse, the crowd, the girl
const s1Actors = (t: number): Actor[] => {
  const g = girl(t, false, s1.cam(t).pos);
  return [victim(t), g, red(t), ...commuters(t, s1)];
};
const s1: Scene = {
  id: 1, t0: 0, mood: "day", blur: 1.0, set: "hall",
  cam: keyed([
    [0, C(Hh(2.7, 1.5, 2.7), Hh(0.5, 1.1, 0.6), 46)],
    [T.collapsed + 0.75, C(Hh(2.75, 1.3, 0.9), Hh(0.5, 0.3, -0.25), 48), "inout"],
    // the busiest station: the lens rises and backs away; people cross below
    [T.station + 0.55, C(Hh(3.8, 3.9, 3.4), Hh(0.2, 0.8, -1.6), 60), "inout"],
    [T.nobody - 0.45, C(Hh(3.6, 3.7, 3.3), Hh(0.2, 0.8, -1.6), 58), "linear"],
    // nobody stopped: down to a passer-by's glance, and on he goes
    [T.nobody + 0.75, C(Hh(2.9, 1.55, -1.0), Hh(0.9, 1.25, -2.0), 46), "inout"],
    [T.one - 0.35, C(Hh(2.9, 1.55, -1.05), Hh(1.6, 1.3, -2.1), 46), "linear"],
    // one minute, two: a tilt up to the clock
    [T.one + 0.1, C(Hh(2.85, 1.6, -1.1), Hh(0, 6.8, -5), 20), "inout"],
    [T.two + 0.35, C(Hh(2.85, 1.6, -1.1), Hh(0, 6.8, -5), 18), "linear"],
    // then a girl: down and wide, she runs in
    [T.girl + 0.45, C(Hh(0.3, 1.0, 1.9), Hh(-2.6, 0.85, 4.4), 46), "inout"],
    [T.dropped - 0.15, C(Hh(0.25, 1.0, 2.0), Hh(-1.5, 0.8, 2.8), 48), "linear"],
    // the backpack drops and slides to his shoes
    [T.dropped + 0.35, C(Hh(-0.3, 0.6, 4.8), Hh(-0.8, 0.15, 2.8), 52), "inout"],
    [BAG_DROP + 1.05, C(Hh(0.4, 0.55, 5.1), Hh(1.35, 0.2, 3.35), 50), "inout"],
    [T.pointed + 0.75, C(Hh(-1.9, 0.95, 4.7), Hh(0.6, 1.1, 3.2), 46), "inout"],
    // up the red jacket, over her pointing arm
    [T.red + 0.1, C(Hh(0.0, 1.15, 4.4), Hh(1.85, 1.55, 3.15), 40), "inout"],
    // she shouts
    [T.you + 0.05, C(Hh(-0.25, 1.0, 3.65), Hh(-1.4, 1.1, 2.6), 44), "inout"],
    [T.ambulance + 0.3, C(Hh(-0.3, 1.0, 3.6), Hh(-1.4, 1.1, 2.6), 42), "linear"],
    // he calls
    [T.he + 0.5, C(Hh(0.2, 1.6, 3.95), Hh(1.9, 1.62, 3.15), 40), "inout"],
    [T.see, C(Hh(0.25, 1.6, 3.95), Hh(1.92, 1.62, 3.15), 39), "linear"],
  ]),
  actors: s1Actors,
  extra: (t) => {
    const a = s1Actors(t);
    return { backpack: backpack(t, a[1]), briefcase: briefcase(t), phone: t > T.he - 0.1 ? { p: handAt(a[2], "R") } : undefined, clockMin: clockMin(t) };
  },
  focus: (t) => {
    if (t < T.station) return t < FALL0 ? add(VP, [0, 1.5, 0]) : victimHead(t);
    if (t < T.hundreds) return Hh(0, 1.2, -2);
    if (t < T.nobody) return victimHead(t);
    if (t < T.one - 0.2) return headPosed(s1Actors(t)[3]);
    if (t < T.then) return CLOCK_P;
    if (t < T.dropped) return headPosed(s1Actors(t)[1]);
    if (t < T.red) return backpack(t, s1Actors(t)[1]).p;
    if (t < T.shouted) return headPosed(s1Actors(t)[2]);
    if (t < T.he) return headPosed(s1Actors(t)[1]);
    return headPosed(s1Actors(t)[2]);
  },
};

// ================================================================== 2. HALL: the ring; the chat; the name
const s2Actors = (t: number): Actor[] => [victim(t), girl(t, false, s2.cam(t).pos), red(t), ...commuters(t, s2)];
const s2: Scene = {
  id: 2, t0: T.see - 0.1, mood: "day", blur: 1.0, set: "hall",
  cam: keyed([
    [T.see - 0.1, C(Hh(-1.4, 7.6, 7.8), Hh(0.5, 0, 0.6), 62)],
    [T.ever - 0.2, C(Hh(-1.0, 7.3, 7.2), Hh(0.5, 0, 0.6), 60), "linear"],
    [T.famous - 0.15, C(Hh(-0.4, 6.8, 6.4), Hh(0.5, 0, 0.6), 50), "linear"],
  ]),
  actors: s2Actors,
  extra: (t) => {
    const a = s2Actors(t);
    return { backpack: backpack(t, a[1]), briefcase: briefcase(t), phone: { p: handAt(a[2], "R") }, clockMin: clockMin(t), overlay: t > T.ever - 0.15 ? (t < T.psych - 0.1 ? "chat" : "title") : undefined };
  },
  focus: () => add(VP, [0, 0.3, -0.2]),
};

// ================================================================== 3. LAB 1968: alone vs. "in a group"
const SA_SEAT: V3 = Lb(BOOTH_A[0], 0, BOOTH_A[2] - 0.42), SB_SEAT: V3 = Lb(BOOTH_B[0], 0, BOOTH_B[2] - 0.42);
const RUN0 = T.rushed - 0.2;
const A_RUN: WalkSeg[] = [
  { t0: RUN0 + 0.3, t1: RUN0 + 0.5, from: SA_SEAT, to: Lb(BOOTH_A[0] - 0.45, 0, BOOTH_A[2] - 0.2) },
  { t0: RUN0 + 0.5, t1: RUN0 + 0.75, from: Lb(BOOTH_A[0] - 0.45, 0, BOOTH_A[2] - 0.2), to: Lb(BOOTH_A[0] - 0.45, 0, BOOTH_A[2] + 0.8) },
  { t0: RUN0 + 0.75, t1: RUN0 + 1.55, from: Lb(BOOTH_A[0] - 0.45, 0, BOOTH_A[2] + 0.8), to: Lb(LAB_DOOR[0] - 0.1, 0, LAB_DOOR[2]) },
  { t0: RUN0 + 1.55, t1: RUN0 + 2.15, from: Lb(LAB_DOOR[0] - 0.1, 0, LAB_DOOR[2]), to: Lb(LAB_DOOR[0] - 1.6, 0, LAB_DOOR[2]) },
];
/** student A's heading: his velocity direction averaged over 0.3 s (corners turn smoothly); 0 while seated */
const headingA = (t: number): number => {
  let sx = 0, sz = 0;
  for (let k = -3; k <= 3; k++) {
    const a = walkAt(A_RUN, SA_SEAT, t + k * 0.05 - 0.03, 1).p, b = walkAt(A_RUN, SA_SEAT, t + k * 0.05 + 0.03, 1).p;
    sx += b[0] - a[0]; sz += b[2] - a[2];
  }
  const sp = Math.hypot(sx, sz);
  const moving = Math.atan2(sx, sz);
  if (t < A_RUN[0].t0 - 0.15) return 0;
  if (t > A_RUN[A_RUN.length - 1].t1 + 0.15 || sp < 1e-4) return t > A_RUN[0].t1 ? -PI / 2 : 0;
  return lerpAng(0, moving, smooth((t - (A_RUN[0].t0 - 0.15)) / 0.35));
};
const s3Actors = (t: number): Actor[] => {
  const standA = smooth((t - RUN0) / 0.3);
  const w = walkAt(A_RUN, SA_SEAT, t, STUDENT_A.height * 1.6);
  const seg = A_RUN.find((s) => t >= s.t0 && t < s.t1);
  const yawA = headingA(t);
  let pa: BodyPose = { ...REST, sit: 1 - standA, walk: seg && seg !== A_RUN[0] && seg !== A_RUN[1] ? w.walk : undefined, lean: seg ? 12 : 4 };
  const listen = window01(t, T.famous, RUN0, 0.4, 0.35);
  pa = reach(STUDENT_A, w.p, yawA, pa, "L", local(head(STUDENT_A, w.p, 1 - standA), yawA, -0.17, 0, 0.0), listen, 4, 1 - standA);
  pa = { ...pa, ...lookF(STUDENT_A, w.p, yawA, lerpV(Lb(BOOTH_A[0] + 0.3, 0.8, BOOTH_A[2] + 0.4), local(head(STUDENT_A, w.p), yawA, 0, 0, 3), smooth((t - (RUN0 - 0.2)) / 0.4)), 1 - standA) };
  const fa = t < T.alone ? F("half", "flat", "neutral") : t < RUN0 ? F("wide", "o", "worried") : F("wide", "open", "high", { sweat: true });
  // B half rises, looks at the five speakers, sits back down, bites a nail
  const rise = window01(t, T.while + 0.15, T.others + 0.4, 0.35, 0.35);
  const bite = window01(t, T.others + 0.3, 99, 0.35, 0.1);
  let pb: BodyPose = { ...REST, sit: 1 - 0.35 * rise, lean: 6 };
  pb = reach(STUDENT_B, SB_SEAT, 0, pb, "R", local(head(STUDENT_B, SB_SEAT, 1 - 0.35 * rise), 0, 0.05, -0.1, 0.12), bite, 6, 1 - 0.35 * rise);
  const scan = Math.sin((t - T.while) * 3.2);
  pb = { ...pb, ...lookF(STUDENT_B, SB_SEAT, 0, Lb(BOOTH_B[0] + 0.3 + 1.1 * scan * smooth((t - T.while) / 0.4), 0.9 + 0.5 * smooth((t - T.while) / 0.4), BOOTH_B[2] + 1.6), 1 - 0.35 * rise) };
  const fb = t < T.while ? F("half", "flat", "neutral") : F("open", "wavy", "worried", { sweat: t > T.others });
  return [A(STUDENT_A, w.p, yawA, pa, fa), A(STUDENT_B, SB_SEAT, 0, pb, fb)];
};
const s3: Scene = {
  id: 3, t0: T.famous - 0.1, mood: "lamp", blur: 1.0, set: "lab", dip: true, sepia: true,
  cam: keyed([
    [T.famous - 0.1, C(Lb(0, 1.7, 5.2), Lb(0, 1.2, -1.2), 64)],
    [T.alone - 0.5, C(Lb(-0.3, 1.6, 4.4), Lb(-0.6, 1.2, -1.2), 60), "linear"],
    // booth A: alone
    [T.alone + 0.1, C(Lb(-1.25, 1.35, 1.75), Lb(-1.5, 1.05, -1.45), 46), "inout"],
    [RUN0 + 0.2, C(Lb(-1.2, 1.35, 1.8), Lb(-1.5, 1.1, -1.45), 46), "linear"],
    // he rushes out: the lens follows him to the door
    [RUN0 + 1.3, C(Lb(-1.2, 1.45, 2.6), Lb(-3.9, 1.2, 1.3), 52), "inout"],
    [T.while - 0.05, C(Lb(-1.1, 1.45, 2.6), Lb(-3.9, 1.2, 1.3), 52), "linear"],
    // booth B: five others listening — she waits
    [T.while + 0.85, C(Lb(1.25, 1.35, 1.75), Lb(1.5, 1.1, -1.55), 46), "inout"],
    [T.that - 0.05, C(Lb(1.3, 1.3, 1.55), Lb(1.5, 1.05, -1.45), 42), "linear"],
  ]),
  actors: s3Actors,
  extra: (t) => ({ talk: t < T.waited + 0.3 ? 1 : 0, door: smooth((t - (RUN0 + 1.35)) / 0.25) }),
  focus: (t) => (t < T.while ? headPosed(s3Actors(t)[0]) : headPosed(s3Actors(t)[1])),
};

// ================================================================== 4. HALL: the medics; she points at us
const M_A: WalkSeg = { t0: T.that - 0.05, t1: T.that + 1.75, from: Hh(4.6, 0, 5.6), to: Hh(1.6, 0, -0.4) };
const M_B: WalkSeg = { t0: T.that - 0.05, t1: T.that + 1.9, from: Hh(-4.4, 0, 5.8), to: Hh(-0.7, 0, -0.5) };
const medic = (spec: CharacterSpec, seg: WalkSeg, t: number): { a: Actor; bag: Prop } => {
  const segs = [seg];
  const w = walkAt(segs, segs[0].from, Math.max(t, segs[0].t0), spec.height * 1.7);
  const cur = segs.find((x) => t < x.t1) ?? seg;
  const y0 = yawTo(cur.from, cur.to);
  const arrived = smooth((t - seg.t1) / 1.0);
  const yaw = lerpAng(y0, yawTo(w.p, add(VP, [0, 0, -0.4])), arrived);
  let pm: BodyPose = { ...REST, walk: t < seg.t1 ? w.walk : undefined, lean: 10 + 14 * arrived };
  pm = { ...pm, ...lookF(spec, w.p, yaw, victimHead(t)) };
  const a = A(spec, w.p, yaw, pm, F("open", "flat", "angry"));
  return { a, bag: { p: add(handAt(a, "L"), [0, -0.12, 0]), r: [0, yaw, 0] } };
};
const s4Cam = (t: number) => s4.cam(t).pos;
const s4Actors = (t: number): Actor[] => [victim(t), girl(t, true, s4Cam(t)), red(t), medic(MEDIC_A, M_A, t).a, medic(MEDIC_B, M_B, t).a, ...commuters(t, s4)];
const s4: Scene = {
  id: 4, t0: T.that - 0.1, mood: "day", blur: 1.0, set: "hall", dip: true,
  cam: keyed([
    [T.that - 0.1, C(Hh(0.15, 1.1, 0.95), Hh(-1.3, 1.0, 2.7), 50)],
    [T.so - 0.3, C(Hh(0.05, 1.08, 1.1), Hh(-1.35, 1.0, 2.65), 48), "linear"],
    // she turns her eyes to us; the lens eases in
    [T.crowd + 0.1, C(Hh(-0.3, 1.05, 1.45), Hh(-1.4, 1.02, 2.6), 46), "inout"],
    [T.point - 0.2, C(Hh(-0.33, 1.05, 1.5), Hh(-1.4, 1.02, 2.6), 45), "linear"],
    [T.person + 0.2, C(Hh(-0.5, 1.05, 1.68), Hh(-1.4, 1.02, 2.6), 44), "inout"],
    [SECONDS, C(Hh(-0.52, 1.05, 1.7), Hh(-1.4, 1.02, 2.6), 44), "linear"],
  ]),
  actors: s4Actors,
  extra: (t) => {
    const a = s4Actors(t);
    return { briefcase: briefcase(t), backpack: { p: BAG_END, r: [PI / 2, yawTo(G_P, BAG_END) + 1.2, 0] }, phone: { p: handAt(a[2], "R") }, bags: [medic(MEDIC_A, M_A, t).bag, medic(MEDIC_B, M_B, t).bag], clockMin: clockMin(t) };
  },
  focus: (t) => headPosed(s4Actors(t)[1]),
};

export const SCENES: Scene[] = [s1, s2, s3, s4];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const STATION_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0), fall: [FALL0, FALL1], bagDrop: BAG_DROP, run: RUN0, door: RUN0 + 1.2, medics: [M_A.t0, M_B.t0, M_A.t1, M_B.t1] });
