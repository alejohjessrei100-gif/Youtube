// The Midnight School as DATA. One continuous keyed lens per scene; eased moves land on the spoken nouns.
//   1 EXT night   the lights come on window by window; the chained gate ("closed"); the neighbour listens
//   2 EXT night   the patrol car; the sergeant: "a break-in with a very strange burglar"
//   3 INT         the officers creep down the hallway; the kick; the chalk rolls to the sergeant's boot (handoff); the
//                 lens enters; twelve frozen men; truck driver, baker, janitor; Mrs. Bell; "Sit down, officer."; the
//                 men lower their eyes; they look up; the sergeant sits
//   4 EXT morning the doors are open; a queue; the banner
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lerp, mixArm, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { C, hand, head, headPosed, ik, keyed, lerpAng, look, smooth, yawTo } from "../crow/shots";
import { BAKER, JANITOR, MRS_BELL, NEIGHBOUR, OFFICER_A, OFFICER_B, OLD_MAN, SEATING, SERGEANT, TRUCKER, YOUNG_GUY } from "./cast";
import { CLASS_DOOR, DESK_SPOTS, EXT, INT, SGT_DESK } from "./world";
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
const Ee = at(EXT), Ii = at(INT);
const talk = (t: number, a: number, b: number, base: FaceState["mouth"]): FaceState["mouth"] => (t < a || t > b ? base : Math.floor((t - a) * 9) % 2 === 0 ? "open" : "o");

export const T = {
  bell: W("bell,"), night: W("night"), lights: W("lights"), closed: W("closed"), neighbors: W("neighbors"), police: W("police"), burglar: W("burglar."),
  three: W("three"), inside: W("inside"), kicked: W("kicked"), door: W("door."), twelve: W("twelve"), truck: W("truck"), baker: W("baker,"),
  janitor: W("janitor."), board: W("board"), chalk: W("chalk"), sit: W("sit"), draft: W("draft"), read: W("read,"), proud: W("proud"),
  dark: W("dark,"), nobody: W("nobody"), sergeant: W("sergeant"), now: W("now"), waiting: W("waiting"),
};

// ------------------------------------------------------------------ types and helpers
export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState };
export type Prop = { p: V3; r?: V3 };
export type Extra = { chalks?: Prop[]; flashes?: { p: V3; to: V3 }[]; doorOpen?: number; bell?: number; open?: number; banner?: boolean };
export type SetId = "ext" | "int";
export type Scene = { id: number; t0: number; mood: string; blur: number; set: SetId; night: boolean; cam: (t: number) => Cam; actors: (t: number) => Actor[]; extra: (t: number) => Extra; focus: (t: number) => V3; dip?: boolean };
const A = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });
let reachErr = 0;
let reachWho = "";
export const takeReachErr = () => { const e = reachErr; reachErr = 0; return e; };
export const takeReachWho = () => { const w = reachWho; reachWho = ""; return w; };
/** blend one arm toward an IK solve onto `target` by u (0 = rest) */
const reach = (spec: CharacterSpec, p: V3, yaw: number, base: BodyPose, side: "L" | "R", target: V3, u: number, lean = 0, sit = 0): BodyPose => {
  if (u <= 0) return base;
  const k = ik(spec, p, yaw, side, target, lean, sit);
  if (u > 0.7 && k.err > reachErr) { reachErr = k.err; reachWho = `seed ${spec.look.seed} ${side} sit ${sit} target [${target.map((v) => v.toFixed(2))}] dist ${Math.hypot(target[0] - p[0], target[2] - p[2]).toFixed(2)} h ${target[1].toFixed(2)}`; }
  return side === "R" ? { ...base, armR: mixArm(base.armR ?? REST.armR!, k.arm, u), armRFwd: lerp(base.armRFwd ?? 10, k.fwd, u) } : { ...base, armL: mixArm(base.armL ?? REST.armL!, k.arm, u), armLFwd: lerp(base.armLFwd ?? 10, k.fwd, u) };
};
const handAt = (a: Actor, side: "L" | "R") => hand(a.spec, a.p, a.yaw, a.pose, side) as V3;
const SHRUG = (u: number, base: BodyPose = REST): BodyPose => ({ ...base, armL: mixArm(base.armL!, [60, 95], u), armLFwd: lerp(base.armLFwd!, 25, u), armR: mixArm(base.armR!, [60, 95], u), armRFwd: lerp(base.armRFwd!, 25, u) });

// ================================================================== 1. EXT night: the lights, the gate, the neighbour
const NB_P: V3 = Ee(-4.8, 0, 4.9);
const s1Actors = (t: number): Actor[] => {
  const ear = window01(t, T.neighbors + 0.1, T.police - 0.2, 0.6, 0.5);
  let p: BodyPose = { ...REST, lean: 4 + 4 * ear, headTilt: 12 * ear };
  p = reach(NEIGHBOUR, NB_P, PI, p, "R", add(head(NEIGHBOUR, NB_P), [0.3, -0.1, -0.3]), ear, 6);
  const lk = look(NEIGHBOUR, NB_P, PI, t < T.neighbors ? Ee(0, 3, 0) : s1.cam(t).pos);
  p = { ...p, ...lk };
  return [A(NEIGHBOUR, NB_P, PI, p, ear > 0.3 ? F("squint", "o", "raised") : F("half", "flat", "neutral"))];
};
const s1: Scene = {
  id: 1, t0: 0, mood: "night", blur: 1.0, set: "ext", night: true,
  cam: keyed([
    [0, C(Ee(2.6, 1.1, 10.2), Ee(0.5, 2.4, 0), 46)],
    [1.2, C(Ee(2.3, 1.15, 9.5), Ee(0.4, 2.5, 0), 46), "linear"],
    [T.lights + 0.9, C(Ee(0.5, 1.5, 8.2), Ee(0, 3.0, 0), 52), "inout"],
    [T.closed - 0.9, C(Ee(0.45, 1.5, 8.1), Ee(0, 3.0, 0), 52), "linear"],
    [T.closed + 0.2, C(Ee(0.5, 1.25, 5.1), Ee(0, 1.1, 3.3), 36), "inout"],
    [T.neighbors - 0.25, C(Ee(0.5, 1.25, 5.0), Ee(0, 1.1, 3.3), 34), "linear"],
    [T.neighbors + 0.3, C(Ee(-2.9, 1.55, 2.4), Ee(-4.8, 1.6, 4.9), 42), "inout"],
    [T.police - 0.1, C(Ee(-2.85, 1.55, 2.5), Ee(-4.75, 1.6, 4.9), 41), "linear"],
  ]),
  actors: s1Actors,
  extra: () => ({}),
  focus: (t) => (t < T.closed - 0.3 ? Ee(0, 2.8, 0) : t < T.neighbors ? Ee(0, 1.0, 3.3) : headPosed(s1Actors(t)[0])),
};

// ================================================================== 2. EXT night: the police
const CAR: { p: V3; yaw: number } = { p: Ee(8.6, 0, 7.4), yaw: PI / 2 };
const SG_P: V3 = Ee(5.2, 0, 4.2), OA_P: V3 = Ee(6.5, 0, 4.0), OB_P: V3 = Ee(4.0, 0, 4.5);
const SGY = lerpAng(PI, yawTo(SG_P, Ee(0.5, 0, 2.2)), 0.35), OAY = lerpAng(PI, yawTo(OA_P, Ee(0.5, 0, 2.2)), 0.35), OBY = lerpAng(PI, yawTo(OB_P, Ee(0.5, 0, 2.2)), 0.35);
const s2Actors = (t: number): Actor[] => {
  const point = window01(t, T.police + 0.1, T.burglar - 0.5, 0.25, 0.25);
  const shrug = window01(t, T.burglar - 0.5, T.three + 0.1, 0.25, 0.3);
  let ps: BodyPose = SHRUG(shrug, { ...REST, lean: 3 });
  ps = reach(SERGEANT, SG_P, SGY, ps, "R", add(head(SERGEANT, SG_P), [-0.35, -0.2, -0.55]), point, 6);
  ps = { ...ps, ...look(SERGEANT, SG_P, SGY, s2.cam(t).pos), headTilt: 8 * shrug };
  const fs = shrug > 0.4 ? F("half", "flat", "raised") : F("open", talk(t, T.police, T.burglar, "flat"), "neutral");
  let pa: BodyPose = { ...REST, lean: 4 };
  pa = reach(OFFICER_A, OA_P, OAY, pa, "L", add(OA_P, [0.36 * Math.sin(OAY) - 0.1 * Math.cos(OAY), 1.12, 0.36 * Math.cos(OAY) + 0.1 * Math.sin(OAY)]), 1, 6);
  pa = { ...pa, ...look(OFFICER_A, OA_P, OAY, head(SERGEANT, SG_P)) };
  const wave = Math.sin(t * 5) * 0.03;
  let pb: BodyPose = { ...REST, lean: 3 };
  pb = reach(OFFICER_B, OB_P, OBY, pb, "R", add(head(OFFICER_B, OB_P), [-0.3 + wave, -0.2, -0.6]), 1, 5);
  pb = { ...pb, ...look(OFFICER_B, OB_P, OBY, Ee(0, 3, 0)) };
  return [A(SERGEANT, SG_P, SGY, ps, fs), A(OFFICER_A, OA_P, OAY, pa, F("squint", "flat", "raised")), A(OFFICER_B, OB_P, OBY, pb, F("wide", "o", "raised"))];
};
const s2: Scene = {
  id: 2, t0: T.police - 0.06, mood: "night", blur: 1.0, set: "ext", night: true,
  cam: keyed([
    [T.police - 0.06, C(Ee(-0.4, 1.7, 1.8), Ee(5.2, 1.5, 4.2), 44)],
    [T.burglar - 1.3, C(Ee(0.0, 1.7, 1.8), Ee(5.2, 1.5, 4.2), 42), "linear"],
    [T.burglar + 0.05, C(Ee(2.8, 1.65, 1.9), Ee(5.1, 1.6, 4.2), 36), "inout"],
    [T.three - 0.06, C(Ee(2.9, 1.65, 1.95), Ee(5.1, 1.6, 4.2), 35), "linear"],
  ]),
  actors: s2Actors,
  extra: () => ({}),
  focus: (t) => headPosed(s2Actors(t)[0]),
};

// ================================================================== 3. INT: the kick, the chalk, the men
const LEAD: WalkSeg = { t0: T.three - 0.06, t1: T.inside + 0.6, from: Ii(3.2, 0, 0.1), to: Ii(1.05, 0, -0.55) };
const sgtPath = (t: number) => walkAt([LEAD], LEAD.from, t, SERGEANT.height);
const FOLLOW_A: WalkSeg = { t0: LEAD.t0 + 0.4, t1: LEAD.t1 + 0.4, from: Ii(3.6, 0, 0.35), to: Ii(2.2, 0, 0.3) };
const FOLLOW_B: WalkSeg = { t0: LEAD.t0 + 0.8, t1: LEAD.t1 + 0.8, from: Ii(3.95, 0, 0.1), to: Ii(3.0, 0, 0.0) };
const KICK = T.kicked + 0.0;
const INSIDE = T.board + 0.9; // the sergeant steps into the room only after the roll call, when Mrs. Bell speaks to him
const SGT_IN: WalkSeg[] = [
  { t0: INSIDE, t1: INSIDE + 0.4, from: Ii(1.05, 0, -0.55), to: Ii(0.7, 0, -1.15) },
  { t0: INSIDE + 0.4, t1: INSIDE + 0.9, from: Ii(0.7, 0, -1.15), to: Ii(0.75, 0, -1.95) },
  { t0: INSIDE + 0.9, t1: INSIDE + 1.5, from: Ii(0.75, 0, -1.95), to: Ii(1.95, 0, -2.1) },
  { t0: T.sit - 0.1, t1: T.sit + 1.4, from: Ii(1.95, 0, -2.1), to: Ii(1.62, 0, -2.5) },
];
const SIT_AT = T.sergeant - 0.1;
const sgtPos = (t: number): { p: V3; walk?: number } => {
  if (t <= INSIDE) return sgtPath(t);
  if (t < SIT_AT) return walkAt(SGT_IN, Ii(1.95, 0, -2.1), t, SERGEANT.height);
  return { p: lerpV(Ii(1.62, 0, -2.5), Ii(SGT_DESK[0], 0, SGT_DESK[2]), smooth((t - SIT_AT) / 0.7)) };
};
const MB_P: V3 = Ii(-0.2, 0, -4.7);
const CHALK_A = { drop: KICK + 0.25, from: Ii(-0.05, 0.012, -4.4), to: Ii(0.25, 0.012, -2.9) };
const chalkRoll = (t: number): Prop => {
  const u = Math.min(1, Math.max(0, (t - CHALK_A.drop - 0.12) / 1.2));
  const e = 1 - Math.pow(1 - u, 2);
  const p = lerpV(CHALK_A.from, CHALK_A.to, e);
  return { p: [p[0] + 0.05 * Math.sin(u * 5), p[1], p[2]], r: [0, 0.4, u * 22] };
};
const seatedMan = (t: number, i: number): Actor => {
  const spec = SEATING[i]; const sp = DESK_SPOTS[i];
  const door: V3 = Ii(CLASS_DOOR[0], 0, CLASS_DOOR[2]);
  const p: V3 = Ii(sp[0], 0, sp[2]);
  const turn = smooth((t - (KICK + 0.12 + 0.03 * (i % 4))) / 0.7);
  const yaw = lerpAng(-PI / 2, yawTo(p, door), 0.4 * turn);
  const readK = 1 - turn;
  const embarrassed = window01(t, T.read - 0.1, T.dark - 0.4, 0.5, 0.5);
  const proud = window01(t, T.dark - 0.4, 99, 0.6, 0.1);
  let pose: BodyPose = { ...REST, sit: 1, lean: 10 };
  const write = Ii(sp[0] - 0.52, 0.67, sp[2] + 0.12);
  pose = reach(spec, p, yaw, pose, "R", add(write, [0.02 * Math.sin(t * 3 + i) * readK, 0, 0]), 1, 18, 1);
  pose = reach(spec, p, yaw, pose, "L", Ii(sp[0] - 0.42, 0.66, sp[2] - 0.15), 1, 18, 1);
  const gaze = embarrassed > 0.4 ? Ii(sp[0] - 0.5, 0.7, sp[2]) : t > T.dark - 0.4 ? head(MRS_BELL, MB_P) : t > KICK ? Ii(CLASS_DOOR[0], 1.5, CLASS_DOOR[2]) : Ii(sp[0] - 0.5, 0.7, sp[2]);
  pose = { ...pose, ...look(spec, p, yaw, gaze, 1), headNod: (look(spec, p, yaw, gaze, 1).headNod ?? 0) + 6 * readK + 14 * embarrassed };
  const face =
    t < KICK ? F("half", i % 3 === 0 ? "o" : "flat", "worried") :
    proud > 0.5 ? F("closed", "smile", "raised", { flush: 0.2 }) :
    embarrassed > 0.4 ? F("half", "frown", "worried", { flush: 0.35 }) :
    F("wide", "o", "high", { sweat: i % 3 === 1 });
  return A(spec, p, yaw, pose, face);
};
const s3Actors = (t: number): Actor[] => {
  const out: Actor[] = [];
  const sp = sgtPos(t);
  const inRoom = t > INSIDE;
  const sitK = smooth((t - SIT_AT) / 0.7);
  const kickK = window01(t, KICK - 0.25, KICK + 0.4, 0.2, 0.3);
  const sy = t < INSIDE ? lerpAng(-PI / 2, PI, smooth((t - (LEAD.t1 - 0.3)) / 0.35)) : t < SIT_AT ? lerpAng(PI, -PI / 2, smooth((t - (T.sit + 0.9)) / 0.6) * 0 + 0) : -PI / 2;
  const yIn = t < INSIDE + 1.5 ? lerpAng(PI, PI * 0.55, smooth((t - (INSIDE + 0.8)) / 0.5)) : lerpAng(PI * 0.55, PI * 0.78, smooth((t - (INSIDE + 1.5)) / 0.4));
  const syaw = t <= INSIDE ? sy : t < SIT_AT ? lerpAng(yIn, -PI / 2, smooth((t - (T.sit + 1.1)) / 0.7)) : -PI / 2;
  const cap = window01(t, T.draft, T.read, 0.3, 0.3);
  let pg: BodyPose = { ...REST, walk: t < INSIDE + 1.5 || (t > T.sit - 0.1 && t < T.sit + 1.4) ? sp.walk : undefined, lean: 3 + 6 * kickK + 4 * (inRoom ? 1 : 0), sit: sitK };
  pg = { ...pg, ...(kickK > 0.5 ? { walk: 0.7 + 0.5 * kickK } : {}) };
  pg = reach(SERGEANT, sp.p, syaw, pg, "R", add(head(SERGEANT, sp.p), [0.2 * Math.cos(syaw), 0.0, -0.2 * Math.sin(syaw)]), cap, 4, sitK);
  const fSg = t < KICK ? F("glare", "flat", "angry") : t < T.sit ? F("wide", "o", "raised", { sweat: true }) : t < SIT_AT ? F("half", "grimace", "worried", { flush: 0.3 }) : F("closed", "smile", "raised", { flush: 0.25 });
  pg = { ...pg, ...(t > INSIDE ? look(SERGEANT, sp.p, syaw, head(MRS_BELL, MB_P), sitK) : {}) };
  out.push(A(SERGEANT, sp.p, syaw, pg, fSg));
  const fa = sgtPath(t).p, la = walkAt([FOLLOW_A], FOLLOW_A.from, t, OFFICER_A.height), lb = walkAt([FOLLOW_B], FOLLOW_B.from, t, OFFICER_B.height);
  void fa;
  const aYaw = lerpAng(-PI / 2, lerpAng(PI, -PI / 2, 0.55), smooth((t - FOLLOW_A.t1) / 0.4));
  const bYaw = lerpAng(-PI / 2, lerpAng(PI, -PI / 2, 0.55), smooth((t - FOLLOW_B.t1) / 0.4));
  const aP: V3 = la.p, bP: V3 = lb.p;
  const hat = window01(t, T.sit - 0.3, 99, 0.5, 0.1);
  for (const [spec, pp, yy, ww, k] of [[OFFICER_A, aP, aYaw, t < FOLLOW_A.t1 ? la.walk : undefined, 0], [OFFICER_B, bP, bYaw, t < FOLLOW_B.t1 ? lb.walk : undefined, 1]] as [CharacterSpec, V3, number, number | undefined, number][]) {
    let po: BodyPose = { ...REST, walk: ww, lean: 6 };
    const torch = (t < INSIDE + 1.0 ? 1 : 0.0);
    po = reach(spec, pp, yy, po, "R", add(pp, [0.35 * Math.sin(yy), 1.05, 0.35 * Math.cos(yy)]), torch, 4);
    po = reach(spec, pp, yy, po, "L", add(pp, [0.32 * Math.sin(yy) - 0.12 * Math.cos(yy), 1.1, 0.32 * Math.cos(yy) + 0.12 * Math.sin(yy)]), hat, 6);
    po = { ...po, ...look(spec, pp, yy, t < KICK ? Ii(0.7, 1.4, -1.5) : head(MRS_BELL, MB_P)) };
    out.push(A(spec, pp, yy, po, t < KICK ? F("squint", "flat", "angry") : F("wide", "o", "raised", { sweat: k === 1 })));
  }
  if (t > KICK - 0.45) {
    // Mrs. Bell and the twelve men
    const turnB = smooth((t - (KICK + 0.05)) / 0.4);
    const byaw = lerpAng(-PI / 2, PI / 2 - 0.45, turnB);
    const write = 1 - turnB;
    const scold = window01(t, T.sit - 0.1, T.draft + 0.7, 0.2, 0.3);
    const tray: V3 = Ii(-0.62, 0.95, -5.5);
    const chalkNew = window01(t, T.chalk - 0.4, T.chalk + 0.2, 0.3, 0.3);
    let pb: BodyPose = { ...REST, lean: 3, headTilt: 5 * (turnB > 0.5 ? 1 : 0) };
    pb = reach(MRS_BELL, MB_P, byaw, pb, "R", Ii(-0.62, 1.42 + 0.04 * Math.sin(t * 8), -4.75 + 0.12 * Math.sin(t * 5)), write, 10);
    pb = reach(MRS_BELL, MB_P, byaw, pb, "R", tray, chalkNew * (1 - scold), 4);
    pb = reach(MRS_BELL, MB_P, byaw, pb, "R", add(MB_P, [0.55 * Math.sin(byaw) + 0.1 * Math.cos(byaw), 1.15, 0.55 * Math.cos(byaw) - 0.1 * Math.sin(byaw)]), scold, 6);
    pb = reach(MRS_BELL, MB_P, byaw, pb, "L", add(MB_P, [0.25 * Math.sin(byaw) - 0.28 * Math.cos(byaw), 0.95, 0.25 * Math.cos(byaw) + 0.28 * Math.sin(byaw)]), window01(t, T.draft - 0.2, 99, 0.3, 0.1) * (1 - 0), 4);
    pb = { ...pb, ...look(MRS_BELL, MB_P, byaw, t < T.sit - 0.2 ? head(SERGEANT, sgtPos(t).p) : t < T.read ? head(SERGEANT, sgtPos(t).p) : s3.cam(t).pos) };
    const fb = t < KICK + 0.1 ? F("half", "flat", "neutral") : t < T.sit ? F("wide", "o", "raised") : t < T.draft + 0.6 ? F("open", talk(t, T.sit, T.draft + 0.5, "flat"), "angry") : t > T.dark ? F("closed", "smile", "raised", { flush: 0.3 }) : F("open", "smile", "raised");
    out.push(A(MRS_BELL, MB_P, byaw, pb, fb));
    for (let i = 0; i < 12; i++) out.push(seatedMan(t, i));
  }
  return out;
};
const handFromActors = (t: number, k: number, side: "L" | "R"): V3 => handAt(s3Actors(t)[k], side);
const s3: Scene = {
  id: 3, t0: T.three - 0.06, mood: "cold", blur: 1.0, set: "int", night: true,
  cam: keyed([
    [T.three - 0.06, C(Ii(-1.2, 1.45, 0.65), Ii(2.6, 1.3, 0.1), 50)],
    [T.inside + 0.4, C(Ii(-1.3, 1.45, 0.62), Ii(2.0, 1.3, 0.1), 48), "linear"],
    [KICK - 0.35, C(Ii(-1.7, 1.45, 0.55), Ii(1.0, 1.25, -0.5), 46), "inout"],
    [KICK + 0.05, C(Ii(-1.65, 1.45, 0.55), Ii(0.9, 1.3, -0.6), 46), "linear"],
    // through the doorway, low, on the chalk rolling toward the sergeant's boot
    [KICK + 0.8, C(Ii(0.65, 1.15, -1.0), Ii(0.4, 0.5, -3.2), 54), "inout"],
    [KICK + 1.3, C(Ii(0.25, 0.95, -1.95), Ii(0.1, 0.1, -3.9), 56), "inout"],
    [T.twelve - 0.25, C(Ii(0.0, 1.05, -1.9), Ii(0.25, 0.05, -3.05), 56), "linear"],
    // up to the frozen men: a wide look back across the room from just inside the door (the wall is behind the lens)
    [T.twelve + 0.15, C(Ii(-0.2, 1.45, -1.95), Ii(1.2, 1.4, -4.3), 60), "inout"],
    [T.twelve + 0.55, C(Ii(-0.35, 1.8, -2.0), Ii(4.5, 1.2, -5.0), 66), "inout"],
    [T.truck - 0.2, C(Ii(-0.25, 1.78, -2.15), Ii(4.4, 1.2, -5.0), 64), "linear"],
    [T.truck + 0.25, C(Ii(0.5, 1.5, -2.0), Ii(2.2, 1.3, -3.5), 34), "inout"],
    [T.baker - 0.1, C(Ii(0.5, 1.5, -2.0), Ii(2.2, 1.3, -3.5), 34), "linear"],
    [T.baker + 0.3, C(Ii(0.5, 1.5, -2.0), Ii(3.8, 1.3, -3.5), 30), "inout"],
    [T.janitor - 0.5, C(Ii(0.5, 1.5, -2.0), Ii(3.8, 1.3, -3.5), 30), "linear"],
    [T.janitor + 0.2, C(Ii(0.3, 1.5, -2.6), Ii(2.2, 1.3, -4.9), 36), "inout"],
    [T.janitor + 0.55, C(Ii(0.3, 1.5, -2.6), Ii(2.2, 1.3, -4.9), 40), "linear"],
    // pan to Mrs. Bell from the same spot (60 deg), then dolly round to her front
    [T.board + 0.1, C(Ii(0.5, 1.55, -2.5), Ii(-0.2, 1.4, -4.7), 44), "inout"],
    [T.board + 0.9, C(Ii(1.7, 1.55, -4.2), Ii(-0.2, 1.4, -4.7), 44), "inout"],
    [T.chalk + 0.1, C(Ii(1.6, 1.4, -4.1), Ii(-0.4, 1.05, -4.8), 36), "inout"],
    [T.sit - 0.1, C(Ii(1.7, 1.5, -4.2), Ii(-0.2, 1.4, -4.7), 40), "inout"],
    [T.draft + 0.3, C(Ii(1.65, 1.45, -4.1), Ii(-0.2, 1.45, -4.7), 39), "linear"],
    // "none of them had ever learned to read": round through the back corner to the men's faces
    [T.read - 1.25, C(Ii(0.8, 1.6, -7.9), Ii(0.8, 1.3, -4.6), 66), "inout"],
    [T.read - 0.2, C(Ii(0.4, 1.55, -4.3), Ii(3.4, 1.2, -3.6), 56), "inout"],
    [T.dark - 1.85, C(Ii(0.5, 1.55, -4.15), Ii(3.4, 1.2, -3.5), 52), "linear"],
    // "after dark, where nobody would know": back round to Mrs. Bell's smile
    [T.dark - 0.8, C(Ii(0.8, 1.6, -7.9), Ii(0.8, 1.3, -4.6), 66), "inout"],
    [T.dark + 0.4, C(Ii(1.7, 1.5, -4.2), Ii(-0.2, 1.4, -4.7), 40), "inout"],
    [T.sergeant - 1.05, C(Ii(1.68, 1.5, -4.15), Ii(-0.2, 1.4, -4.7), 40), "linear"],
    // "the sergeant took a seat": to the aisle, his profile at the desk
    [T.sergeant + 0.3, C(Ii(0.35, 1.5, -5.7), Ii(0.95, 1.15, -2.6), 50), "inout"],
    [T.now - 0.06, C(Ii(0.4, 1.5, -5.4), Ii(0.95, 1.15, -2.6), 48), "linear"],
  ]),
  actors: s3Actors,
  extra: (t) => {
    const a = s3Actors(t);
    const flashes = t < INSIDE + 1.6 ? [0, 1, 2].map((k) => { const h = handAt(a[k], "R"); const fwd: V3 = [Math.sin(a[k].yaw), 0, Math.cos(a[k].yaw)]; return { p: h, to: t < KICK ? add(h, [fwd[0] * 2.2, -0.5, fwd[2] * 2.2]) : Ii(3.8, 1.3, -4.0) }; }) : [];
    const chalks: Prop[] = [];
    if (t > KICK - 0.45 && t < CHALK_A.drop) chalks.push({ p: add(handAt(a[3], "R"), [0, 0.03, 0]), r: [0, 0, 0.4] });
    else if (t >= CHALK_A.drop) chalks.push(t < CHALK_A.drop + 0.12 ? { p: lerpV(add(handFromActors(CHALK_A.drop, 3, "R"), [0, 0.03, 0]), CHALK_A.from, smooth((t - CHALK_A.drop) / 0.12)), r: [0, 0, 0.4] } : chalkRoll(t));
    if (t > T.chalk - 0.1) chalks.push({ p: add(handAt(a[3], "R"), [0, 0.03, 0]), r: [0, 0, 0.5] });
    const ring = window01(t, T.neighbors, T.neighbors, 0.1, 0.1);
    return { chalks, flashes, doorOpen: smooth((t - (KICK + 0.05)) / 0.22), bell: 0.25 * ring };
  },
  focus: (t) => {
    if (t < KICK + 0.8) return head(SERGEANT, sgtPos(t).p);
    if (t < T.twelve) return chalkRoll(t).p;
    if (t < T.truck - 0.2) return head(TRUCKER, Ii(DESK_SPOTS[2][0], 0, DESK_SPOTS[2][2]), 1);
    if (t < T.baker) return head(TRUCKER, Ii(DESK_SPOTS[0][0], 0, DESK_SPOTS[0][2]), 1);
    if (t < T.janitor - 0.4) return head(BAKER, Ii(DESK_SPOTS[1][0], 0, DESK_SPOTS[1][2]), 1);
    if (t < T.board) return head(JANITOR, Ii(DESK_SPOTS[4][0], 0, DESK_SPOTS[4][2]), 1);
    if (t < T.read - 0.6) return headPosed(s3Actors(t)[3]);
    if (t < T.dark - 0.8) return head(TRUCKER, Ii(DESK_SPOTS[1][0], 0, DESK_SPOTS[1][2]), 1);
    if (t < T.sergeant - 0.2) return headPosed(s3Actors(t)[3]);
    return headPosed(s3Actors(t)[0]);
  },
};

// ================================================================== 4. EXT morning: open
const MBD_P: V3 = Ee(0.0, 0.45, 1.0);
const QUEUE: { spec: CharacterSpec; p: V3 }[] = [
  { spec: TRUCKER, p: Ee(-0.55, 0, 2.4) }, { spec: BAKER, p: Ee(0.45, 0, 2.9) }, { spec: OLD_MAN, p: Ee(-0.45, 0, 3.8) },
  { spec: YOUNG_GUY, p: Ee(0.5, 0, 4.5) }, { spec: JANITOR, p: Ee(-3.2, 0, 4.5) }, { spec: SEATING[5], p: Ee(2.6, 0, 4.4) },
];
const s4Actors = (t: number): Actor[] => {
  const wave = window01(t, T.now + 0.3, 99, 0.4, 0.1);
  let pb: BodyPose = { ...REST, lean: 2 };
  pb = { ...pb, armR: mixArm(pb.armR!, [150, 140 + 20 * Math.sin(t * 9)], wave), armRFwd: lerp(10, 15, wave) };
  pb = { ...pb, ...look(MRS_BELL, MBD_P, 0, s4.cam(t).pos) };
  const out: Actor[] = [A(MRS_BELL, MBD_P, 0, pb, F("closed", "beam", "raised", { flush: 0.3 }))];
  QUEUE.forEach((q, i) => {
    const yaw = lerpAng(0, yawTo(q.p, s4.cam(t).pos), 0.3);
    let pq: BodyPose = { ...REST, lean: 2 };
    pq = reach(q.spec, q.p, yaw, pq, "R", add(q.p, [0.2, 1.3 + 0.05 * Math.sin(t * 5 + i), 0.15]), window01(t, T.waiting - 0.1 + 0.08 * i, 99, 0.3, 0.1), 4);
    pq = { ...pq, ...look(q.spec, q.p, yaw, i < 4 ? head(MRS_BELL, MBD_P) : s4.cam(t).pos) };
    out.push(A(q.spec, q.p, yaw, pq, F("half", "smile", "raised")));
  });
  return out;
};
const s4: Scene = {
  id: 4, t0: T.now - 0.06, mood: "golden", blur: 1.0, set: "ext", night: false, dip: true,
  cam: keyed([
    [T.now - 0.06, C(Ee(-1.6, 2.5, 12.6), Ee(0, 2.5, 1.5), 56)],
    [T.waiting + 0.3, C(Ee(-0.6, 2.3, 11.6), Ee(0, 2.4, 1.5), 56), "inout"],
    [SECONDS, C(Ee(-0.5, 2.3, 11.4), Ee(0, 2.4, 1.5), 56), "linear"],
  ]),
  actors: s4Actors,
  extra: () => ({ open: 1, banner: true }),
  focus: (t) => (t < T.waiting ? headPosed(s4Actors(t)[0]) : Ee(0, 2.4, 0.5)),
};

export const SCENES: Scene[] = [s1, s2, s3, s4];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const LIGHTS_AT = T.lights;
export const MIDNIGHT_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0), kick: KICK, insideAt: INSIDE, sitAt: SIT_AT, chalkDrop: CHALK_A.drop, lights: LIGHTS_AT });
export { CAR };
