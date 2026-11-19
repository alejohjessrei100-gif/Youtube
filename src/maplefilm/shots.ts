// The Maple Street film as DATA. One continuous keyed lens per scene; eased moves land on the spoken nouns (the
// reference-channel beat). Cuts only for a change of place or time (time cuts dip to black).
//   1 night   porch, lens on the porch looking out: the hooded figure comes up the path, shrugs "nothing", crouches, flips the mat
//   2 day     porch: the patrol car, the officer's shrug and line; Walt's smile, "Leave it."
//   3 day     porch: the neighbours mount a camera on the post
//   4 night   CCTV: the hood comes down — Walt — he flips his own mat
//   5 morning the lens flies across the street to Mrs. Alvarez at her window; POV to the upside-down mat; the lamp flares
//   6 morning (later) POV: the mat is right side up; shock; the mug falls (the lens follows it); she runs
//   7 day     Walt's kitchen: Walt on the floor; she bursts in; a weak wave
//   8 golden  the street: every porch's mat upside down; everyone waves; the crane rises
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lerp, mixArm, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { C, hand, head, headPosed, ik, keyed, lerpAng, look, smooth, yawTo } from "../crow/shots";
import { DECK_Y, MAT_C, SECCAM, stepY } from "../maple/world";
import type { StreetOpts } from "../maple/world";
import { ALVAREZ, NEIGH_A, NEIGH_B, OFFICER, WALT, WALT_HOOD, WALT_HOOD_DOWN } from "./cast";
import { KITCHEN, STOOL_H } from "./world";
import { SECONDS, WORDS } from "./words";

const PI = Math.PI;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9':-]/g, "");
export const W = (word: string, nth = 1) => {
  let k = 0;
  for (const [w, a] of WORDS) if (norm(w) === norm(word) && ++k === nth) return a;
  throw new Error(`word not found: ${word} #${nth}`);
};
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });
const flap = (t: number, a: number, b: number, base: FaceState["mouth"]): FaceState["mouth"] => (t < a || t > b ? base : Math.floor((t - a) * 9) % 2 === 0 ? "open" : "o");
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const REST: BodyPose = { armL: [14, 10], armLFwd: 10, armR: [14, 10], armRFwd: 10 };
const SHRUG = (u: number, base: BodyPose = REST): BodyPose => ({ ...base, armL: mixArm(base.armL!, [60, 95], u), armLFwd: lerp(base.armLFwd!, 25, u), armR: mixArm(base.armR!, [60, 95], u), armRFwd: lerp(base.armRFwd!, 25, u) });
const WAVE = (t: number, u: number, base: BodyPose = REST, side: "L" | "R" = "R"): BodyPose => {
  const a: [number, number] = [150, 140 + 20 * Math.sin(t * 9)];
  return side === "R" ? { ...base, armR: mixArm(base.armR!, a, u), armRFwd: lerp(base.armRFwd!, 15, u) } : { ...base, armL: mixArm(base.armL!, a, u), armLFwd: lerp(base.armLFwd!, 15, u) };
};

export const T = {
  burglar: W("burglar"), house: W("house"), nothing: W("nothing."), he: W("he"), flipped: W("flipped"), doormat: W("doormat"), upside: W("upside"),
  police: W("police"), shrugged: W("shrugged."), sir: W("sir,"), crime: W("crime.\""), but: W("but"), walt: W("walt,"), eighty: W("eighty,"),
  smiled: W("smiled"), leave: W("leave"), so: W("so"), camera: W("camera"), porch: W("porch,"), walt2: W("walt", 2), himself: W("himself,"),
  every2: W("every", 2), flipping: W("flipping"), mat1: W("mat."), you: W("you"), across: W("across"), alvarez: W("alvarez,"),
  window: W("window."), upside2: W("upside", 2), fine: W("fine."), lighthouse: W("lighthouse"), person: W("person."), then: W("then"),
  mat2: W("mat", 2), up: W("up."), dropped: W("dropped"), ran: W("ran."), walt3: W("walt", 3), fallen: W("fallen"), kitchen: W("kitchen,"),
  waited: W("waited"), now: W("now"), house3: W("house", 2), street2: W("street", 2), flips: W("flips"),
};

// ------------------------------------------------------------------ types
export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState; lying?: { p: V3; r: V3 } };
export type Extra = { mat?: { angle: number; y: number; puff: number }; car?: { p: V3; yaw: number }; heldCam?: V3; mug?: V3; shards?: number; kdoor?: number; stool?: V3 };
export type Scene = {
  id: number; t0: number; mood: string; blur: number; set: "street" | "kitchen"; opts: (t: number) => StreetOpts;
  cam: (t: number) => Cam; actors: (t: number) => Actor[]; extra: (t: number) => Extra; focus: (t: number) => V3; cctv?: boolean; dip?: boolean;
};
const A = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });

// ------------------------------------------------------------------ the mat flip, shared by scene 1 (the "burglar") and scene 4 (CCTV)
const UPRIGHT_Y = DECK_Y + 0.034;
export const matFlip = (t: number, t0: number) => {
  const u = smooth((t - t0) / 0.5);
  const after = t - t0 - 0.5;
  const bounce = after > 0 ? 0.035 * Math.exp(-after * 7) * Math.abs(Math.sin(after * 16)) : 0;
  return { angle: -PI * u, y: UPRIGHT_Y - 0.004 * u + 0.45 * Math.sin(PI * u) + bounce, u, puff: after > 0 ? Math.min(1, after / 0.5) : 0 };
};
const matUpside = { angle: -PI, y: UPRIGHT_Y - 0.004, puff: 0 };
const matUpright = { angle: 0, y: UPRIGHT_Y, puff: 0 };
/** the crouch-and-flip performer (Walt in his hood). Facing -z (the door), his right hand is on the -x side. */
const STAND_Z = 1.9;
const flipper = (spec: CharacterSpec, t: number, o: { walk: WalkSeg; crouch: number; flip: number }) => {
  const w = walkAt([o.walk], o.walk.from, t, spec.height);
  const p: V3 = [w.p[0], stepY(w.p[2]), w.p[2]];
  const yaw = PI;
  const c = smooth((t - o.crouch) / 0.3) * (1 - smooth((t - (o.flip + 1.2)) / 0.4));
  const sit = 0.85 * c;
  const lean = 6 + 44 * c;
  const m = matFlip(t, o.flip);
  const edge = (x: number): V3 => [x, m.y + 0.3 * Math.sin(PI * m.u) + 0.02, MAT_C[2] + 0.3 * Math.cos(PI * m.u)];
  const g = smooth((t - (o.flip - 0.3)) / 0.15) * (1 - smooth((t - (o.flip + 0.12)) / 0.12));
  const kL = ik(spec, p, yaw, "L", edge(0.28), lean, sit);
  const kR = ik(spec, p, yaw, "R", edge(-0.28), lean, sit);
  const pose: BodyPose = { walk: w.walk, sit, lean, armL: mixArm([18, 12], kL.arm, g), armLFwd: lerp(10, kL.fwd, g), armR: mixArm([18, 12], kR.arm, g), armRFwd: lerp(10, kR.fwd, g) };
  return { p, yaw, pose, g, m, kErr: g > 0.5 ? Math.max(kL.err, kR.err) : 0, edgeL: edge(0.28), edgeR: edge(-0.28) };
};

// ================================================================== 1. night: the "burglar"
const S1_WALK: WalkSeg = { t0: 0, t1: 2.75, from: [0, 0, 5.6], to: [0, 0, STAND_Z] };
const S1F = { walk: S1_WALK, crouch: T.he - 0.2, flip: 4.05 };
const s1Actor = (t: number) => {
  const f = flipper(WALT_HOOD, t, S1F);
  const lens = s1.cam(t).pos;
  const shrug = window01(t, T.nothing - 0.15, T.he - 0.05, 0.2, 0.25);
  const looking = t > 1.2 && t < 2.6 ? 32 * Math.sin((t - 1.2) * 3.4) : 0;
  let pose: BodyPose = { ...f.pose, lean: (f.pose.lean ?? 0) + 6 * Math.abs(Math.sin(t * 6)) * (t < 2.75 ? 1 : 0) };
  if (shrug > 0) pose = { ...SHRUG(shrug, pose), headTilt: 12 * shrug };
  const lk = look(WALT_HOOD, f.p, f.yaw, lens, pose.sit ?? 0);
  pose = { ...pose, headYaw: t < 2.6 ? looking : lk.headYaw * smooth((t - 2.6) / 0.3), headNod: t > 4.4 ? lk.headNod : pose.headNod };
  const face =
    t < 2.6 ? F(Math.floor(t * 2.5) % 3 === 0 ? "squint" : "half", "smirk", "angry") :
    t < T.he ? F("half", "smirk", "raised") :
    t < 4.45 ? F("squint", "grin", "angry") : F("closed", "beam", "raised", { flush: 0.2 });
  return { a: A(WALT_HOOD, f.p, f.yaw, pose, face), f };
};
const s1: Scene = {
  id: 1, t0: 0, mood: "night", blur: 0.9, set: "street", opts: () => ({ night: true, hollowAcross: true }),
  cam: keyed([
    [0, C([0.3, 2.0, 0.45], [0, 1.0, 6.0], 50)],
    [0.55, C([0.3, 1.95, 0.5], [0, 1.1, 5.2], 48), "linear"],
    [1.05, C([0.25, 1.75, 0.6], [0, 1.45, 4.4], 38), "inout"],
    [1.5, C([0.25, 1.75, 0.62], [0, 1.45, 3.5], 40), "linear"],
    [2.05, C([0.4, 2.05, 0.35], [0, 1.0, 3.2], 52), "inout"],
    [2.5, C([0.4, 2.0, 0.38], [0, 1.1, 2.6], 50), "linear"],
    [3.05, C([0.25, 1.7, 0.55], [0, 1.52, 1.95], 52), "inout"],
    [3.25, C([0.26, 1.7, 0.56], [0, 1.5, 1.95], 52), "linear"],
    [3.75, C([0.75, 1.2, 0.3], [-0.05, 0.45, 0.98], 58), "inout"],
    [4.75, C([0.76, 1.22, 0.32], [-0.05, 0.47, 1.0], 57), "linear"],
    [5.1, C([1.55, 1.75, 1.7], [0, 0.85, 1.4], 50), "inout"],
    [T.police, C([1.56, 1.76, 1.72], [0, 0.85, 1.4], 49), "linear"],
  ]),
  actors: (t) => [s1Actor(t).a],
  extra: (t) => {
    const m = matFlip(t, S1F.flip);
    return { mat: { angle: m.angle, y: m.y, puff: m.puff } };
  },
  focus: (t) => (t < 3.3 ? headPosed(s1Actor(t).a) : [0, 0.5, 0.75]),
};

// ================================================================== 2. day: the police, "Leave it."
const WALT_P: V3 = [-0.35, DECK_Y, 1.25];
const OFF_P: V3 = [0.6, 0, 3.4];
const CAR: { p: V3; yaw: number } = { p: [2.6, 0, 11.2], yaw: PI / 2 };
const WALT_H = head(WALT, WALT_P);
const s2Actors = (t: number): Actor[] => {
  const lens = s2.cam(t).pos;
  const yW = lerpAng(yawTo(WALT_P, OFF_P), yawTo(WALT_P, [0.6, 0, 2.5]), 0.3);
  const yO = lerpAng(yawTo(OFF_P, WALT_P), yawTo(OFF_P, [-1.3, 0, 0.5]), 0.3);
  const shrug = window01(t, T.shrugged - 0.05, T.sir - 0.1, 0.2, 0.25);
  const belt = window01(t, T.crime + 0.5, 99, 0.3, 0.1);
  let po: BodyPose = SHRUG(shrug, { ...REST, lean: 2 });
  if (belt > 0) po = { ...po, armL: mixArm(po.armL!, [35, 95], belt), armLFwd: lerp(po.armLFwd!, -10, belt), armR: mixArm(po.armR!, [35, 95], belt), armRFwd: lerp(po.armRFwd!, -10, belt) };
  po = { ...po, headTilt: 10 * shrug, ...(shrug < 0.2 ? look(OFFICER, OFF_P, yO, head(WALT, WALT_P)) : {}) };
  const fo = shrug > 0.3 ? F("half", "flat", "raised") : F("open", flap(t, T.sir, T.crime + 0.45, "flat"), t > T.sir ? "neutral" : "raised");
  const wave = window01(t, T.leave - 0.1, T.leave + 0.75, 0.2, 0.3);
  const pw: BodyPose = { ...WAVE(t, 0.5 * wave, { ...REST, lean: 2 }), ...look(WALT, WALT_P, yW, t < T.walt ? head(OFFICER, OFF_P) : lens) };
  const fw = t < T.smiled ? F("half", "flat", "neutral") : F(t > T.leave ? "closed" : "half", flap(t, T.leave, T.leave + 0.45, "smile"), "raised", { flush: 0.2 });
  return [A(WALT, WALT_P, yW, pw, fw), A(OFFICER, OFF_P, yO, po, fo)];
};
const s2: Scene = {
  id: 2, t0: T.police - 0.08, mood: "day", blur: 1.0, set: "street", opts: () => ({ night: false, hollowAcross: true }),
  cam: keyed([
    [T.police - 0.08, C([-1.3, 1.75, 0.5], [0.5, 1.5, 3.4], 40)],
    [T.police + 0.26, C([-1.3, 1.7, 0.55], [0.55, 1.55, 3.4], 30), "inout"],
    [T.sir, C([-1.3, 1.7, 0.57], [0.55, 1.55, 3.4], 29), "linear"],
    [T.crime + 0.2, C([-1.25, 1.68, 0.6], [0.55, 1.55, 3.4], 24), "inout"],
    [T.but - 0.15, C([-1.25, 1.68, 0.6], [0.55, 1.55, 3.4], 24), "linear"],
    [T.walt - 0.05, C([-1.2, 1.7, 1.95], WALT_H, 52), "in"],
    [T.walt + 0.3, C([0.6, 1.6, 2.6], WALT_H, 52), "out"],
    [T.smiled, C([0.58, 1.6, 2.55], WALT_H, 50), "linear"],
    [T.smiled + 0.35, C([0.4, 1.62, 2.4], WALT_H, 50), "inout"],
    [T.leave + 0.15, C([0.33, 1.62, 2.32], WALT_H, 50), "inout"],
    [T.so, C([0.32, 1.62, 2.3], WALT_H, 49), "linear"],
  ]),
  actors: s2Actors,
  extra: () => ({ mat: matUpside, car: CAR }),
  focus: (t) => (t < T.but - 0.05 ? head(OFFICER, OFF_P) : head(WALT, WALT_P)),
};

// ================================================================== 3. day: the neighbours mount the camera
const STOOL_P: V3 = [1.9, DECK_Y, 1.85];
const NA_P: V3 = [1.9, DECK_Y + STOOL_H, 1.85];
const NB_P: V3 = [1.0, 0, 3.0];
const MOUNT = T.porch - 0.25;
const s3Actors = (t: number) => {
  const yA = yawTo(NA_P, SECCAM);
  const reach = window01(t, T.so, MOUNT + 0.4, 0.3, 0.3);
  const k = ik(NEIGH_A, NA_P, yA, "R", SECCAM, 4);
  const lens = s3.cam(t).pos;
  const after = smooth((t - (MOUNT + 0.3)) / 0.35);
  const lkA = look(NEIGH_A, NA_P, yA, lens);
  const pa: BodyPose = { ...REST, lean: 4, armR: mixArm([14, 10], k.arm, reach), armRFwd: lerp(10, k.fwd, reach), headNod: lerp(-18, lkA.headNod, after), headYaw: lkA.headYaw * after };
  const yB = lerpAng(yawTo(NB_P, SECCAM), yawTo(NB_P, [1.4, 0, 5.7]), 0.6);
  void lens;
  const kb = ik(NEIGH_B, NB_P, yB, "L", add(head(NEIGH_B, NB_P), [0.5, 0.5, -0.4]), 2);
  const point = window01(t, T.so, 99, 0.3, 0.1);
  const pb: BodyPose = { ...REST, armL: mixArm([14, 10], kb.arm, point), armLFwd: lerp(10, kb.fwd, point), ...look(NEIGH_B, NB_P, yB, SECCAM) };
  return { list: [A(NEIGH_A, NA_P, yA, pa, after > 0.4 ? F("half", "grin", "raised") : F("squint", "flat", "neutral")), A(NEIGH_B, NB_P, yB, pb, F("open", flap(t, T.so, T.camera, "smile"), "raised"))], hand: hand(NEIGH_A, NA_P, yA, pa, "R"), reach };
};
const s3: Scene = {
  id: 3, t0: T.so - 0.06, mood: "day", blur: 1.0, set: "street", opts: (t) => ({ night: false, hollowAcross: true, secCam: t >= MOUNT }),
  cam: keyed([
    [T.so - 0.06, C([1.4, 1.75, 5.8], [1.45, 1.45, 2.4], 56)],
    [T.camera - 0.35, C([1.42, 1.76, 5.65], [1.45, 1.5, 2.4], 54), "linear"],
    [T.camera + 0.12, C([1.9, 2.3, 3.5], [2.0, 2.1, 1.95], 46), "inout"],
    [T.porch - 0.3, C([1.92, 2.3, 3.45], [2.02, 2.1, 1.97], 45), "linear"],
    [T.porch + 0.2, C([2.0, 2.35, 4.2], [1.45, 1.55, 1.9], 50), "inout"],
    [T.porch + 0.45, C([2.0, 2.35, 4.22], [1.45, 1.55, 1.9], 50), "linear"],
  ]),
  actors: (t) => s3Actors(t).list,
  extra: (t) => ({ mat: matUpside, car: CAR, stool: STOOL_P, heldCam: t < MOUNT ? s3Actors(t).hand : undefined }),
  focus: (t) => (t < T.camera ? [1.45, 1.45, 2.4] : t < T.porch ? SECCAM : [1.45, 1.55, 1.9]),
};

// ================================================================== 4. night, CCTV: it's Walt
const S4_WALK: WalkSeg = { t0: T.porch + 0.4, t1: T.walt2 - 0.1, from: [0, 0, 2.9], to: [0, 0, STAND_Z] };
const HOOD_OFF = T.walt2 + 0.12;
const S4F = { walk: S4_WALK, crouch: T.every2 + 0.25, flip: T.flipping + 0.2 };
const s4Actor = (t: number) => {
  const spec = t < HOOD_OFF ? WALT_HOOD : WALT_HOOD_DOWN;
  const f = flipper(spec, t, S4F);
  const turn = window01(t, HOOD_OFF - 0.1, S4F.crouch - 0.05, 0.45, 0.45);
  const yaw = lerpAng(PI, yawTo(f.p, SECCAM), 0.6 * turn);
  const hands = window01(t, HOOD_OFF - 0.2, HOOD_OFF + 0.25, 0.12, 0.15);
  const hp = head(spec, f.p, f.pose.sit ?? 0);
  const fwd: V3 = [Math.sin(yaw) * 0.05, 0, Math.cos(yaw) * 0.05];
  const kL = ik(spec, f.p, yaw, "L", add(hp, [0.2 * Math.cos(yaw) * -1 + fwd[0], 0.2, fwd[2] + 0.2 * Math.sin(yaw)]), f.pose.lean ?? 0);
  const kR = ik(spec, f.p, yaw, "R", add(hp, [0.2 * Math.cos(yaw) + fwd[0], 0.2, fwd[2] - 0.2 * Math.sin(yaw)]), f.pose.lean ?? 0);
  let pose: BodyPose = f.pose;
  if (hands > 0) pose = { ...pose, armL: mixArm(pose.armL!, kL.arm, hands), armLFwd: lerp(pose.armLFwd!, kL.fwd, hands), armR: mixArm(pose.armR!, kR.arm, hands), armRFwd: lerp(pose.armRFwd!, kR.fwd, hands) };
  const up = window01(t, HOOD_OFF + 0.3, S4F.crouch, 0.25, 0.2);
  const lk = look(spec, f.p, yaw, SECCAM, pose.sit ?? 0);
  pose = { ...pose, headYaw: lk.headYaw * up, headNod: lk.headNod * up };
  const face = t < HOOD_OFF ? F("half", "flat", "neutral") : up > 0.4 ? F("squint", "grin", "raised") : F("closed", "smile", "raised");
  return { a: A(spec, f.p, yaw, pose, face), f };
};
const CCTV_LENS: V3 = [2.08, 2.12, 2.02];
const s4: Scene = {
  id: 4, t0: T.porch + 0.36, mood: "night", blur: 0.4, set: "street", cctv: true, dip: true, opts: () => ({ night: true, hollowAcross: true, secCam: false }),
  cam: keyed([
    [T.porch + 0.36, C(CCTV_LENS, [0, 0.7, 1.4], 62)],
    [T.walt2 - 0.25, C(CCTV_LENS, [0, 0.8, 1.6], 62), "linear"],
    [T.walt2 + 0.2, C(CCTV_LENS, [0, 1.5, 1.9], 40), "inout"],
    [T.every2 - 0.1, C(CCTV_LENS, [0, 1.5, 1.9], 40), "linear"],
    [T.every2 + 0.35, C(CCTV_LENS, [0, 0.7, 1.4], 60), "inout"],
    [T.you, C(CCTV_LENS, [0, 0.65, 1.35], 60), "linear"],
  ]),
  actors: (t) => [s4Actor(t).a],
  extra: (t) => {
    const m = matFlip(t, S4F.flip);
    return { mat: { angle: m.angle, y: m.y, puff: m.puff } };
  },
  focus: () => [0, 1.0, 1.6] as V3,
};

// ================================================================== 5. morning: across the street, Mrs. Alvarez
const ALV_P: V3 = [-2.05, 0.04, 18.3];
const ALV_YAW = PI;
const RUN_TO: V3 = [0.5, 0.04, 18.8];
/** the whips between her face (+z) and her view of the mat (-z) pan through this side look (keyed lerps look POINTS, so a
 * straight 180-degree swap would swing the view down through the ground) */
const SIDE_LOOK: V3 = [1.15, 1.65, 15.4];
const LAMP_LOOK: V3 = [0.5, 1.2, 0.4];
// both just outside her window: the lens whips in place between her face and her view of Walt's mat
const POV_LENS: V3 = [-1.85, 1.75, 15.6];
const FRONT_LENS: V3 = [-1.95, 1.55, 15.6];
const MAT_LOOK: V3 = [0, 0.4, 0.65];
const alvHead = () => head(ALVAREZ, ALV_P);
const alvActor = (t: number, shock: number, run: number, smileK: number): Actor => {
  const runW: WalkSeg = { t0: T.ran - 0.05, t1: T.ran + 0.75, from: ALV_P, to: RUN_TO };
  const w = run > 0 ? walkAt([runW], ALV_P, t, ALVAREZ.height * 1.6) : { p: ALV_P, walk: undefined as number | undefined };
  const yaw = lerpAng(ALV_YAW, yawTo(ALV_P, runW.to), smooth((t - T.ran + 0.45) / 0.8));
  const mugHand = shock < 0.5 && t < T.dropped + 0.05;
  const k = ik(ALVAREZ, ALV_P, ALV_YAW, "L", [ALV_P[0] + 0.1, 1.05, ALV_P[2] - 0.3], 2);
  let pose: BodyPose = { ...REST, walk: w.walk, lean: run > 0 ? 14 : 2, armL: mugHand ? k.arm : [14, 10], armLFwd: mugHand ? k.fwd : 10, headTilt: 8 * smileK, headNod: 6 };
  if (shock > 0) pose = { ...pose, armR: mixArm(pose.armR!, [70, 120], shock), armRFwd: lerp(10, 70, shock), headStretch: 1 + 0.12 * window01(t, T.up - 0.1, T.up + 0.5, 0.06, 0.3) };
  const face = shock > 0.3 ? F("huge", "gasp", "high", { sweat: true }) : smileK > 0.3 ? F("closed", "smile", "raised", { flush: 0.35 }) : F("half", "smile", "neutral");
  return A(ALVAREZ, w.p, yaw, pose, face);
};
const s5: Scene = {
  id: 5, t0: T.you - 0.06, mood: "golden", blur: 1.0, set: "street", opts: (t) => ({ night: false, hollowAcross: true, secCam: true, lampFlare: window01(t, T.lighthouse - 0.1, T.person + 0.2, 0.25, 0.4) }),
  cam: keyed([
    [T.you - 0.06, C([0.4, 1.6, 1.6], [-1.8, 1.7, 17], 40)],
    [T.across, C([0.35, 1.6, 1.8], [-1.8, 1.7, 17], 40), "linear"],
    [T.alvarez + 0.1, C([-1.8, 1.62, 15.9], [-2.05, 1.45, 18.3], 30), "inout"],
    [T.window - 0.35, C([-1.8, 1.6, 15.95], [-2.05, 1.45, 18.3], 28), "linear"],
    [T.window - 0.07, C([-1.83, 1.68, 15.75], SIDE_LOOK, 22), "in"],
    [T.window + 0.2, C(POV_LENS, MAT_LOOK, 16), "out"],
    [T.upside2 - 0.1, C(POV_LENS, MAT_LOOK, 15), "linear"],
    [T.upside2 + 0.3, C(POV_LENS, MAT_LOOK, 8), "inout"],
    [T.lighthouse - 0.3, C(POV_LENS, MAT_LOOK, 8), "linear"],
    [T.lighthouse + 0.2, C(POV_LENS, LAMP_LOOK, 12), "inout"],
    [T.person - 0.2, C(POV_LENS, LAMP_LOOK, 11.5), "linear"],
    [T.person + 0.03, C(POV_LENS, SIDE_LOOK, 22), "in"],
    [T.person + 0.3, C(FRONT_LENS, [-2.05, 1.42, 18.3], 30), "out"],
    [T.then, C(FRONT_LENS, [-2.05, 1.42, 18.3], 29), "linear"],
  ]),
  actors: (t) => [alvActor(t, 0, 0, window01(t, T.fine - 0.2, 99, 0.3, 0.1))],
  // (her smile starts on "fine" while the lens holds on the mat; it is held when the lens whips back on "person")
  extra: () => ({ mat: matUpside, mug: undefined, car: undefined }),
  focus: (t) => (t > T.window && t < T.lighthouse ? MAT_LOOK : t >= T.lighthouse && t < T.person + 0.1 ? LAMP_LOOK : alvHead()),
};
// ================================================================== 6. a later morning: the mat is right side up
const lerpV = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const S6_KEYS = keyed([
  [T.then - 0.06, C(POV_LENS, MAT_LOOK, 12)],
  [T.mat2 - 0.1, C(POV_LENS, MAT_LOOK, 11), "linear"],
  [T.mat2 + 0.25, C(POV_LENS, MAT_LOOK, 7), "inout"],
  [T.up - 0.45, C(POV_LENS, MAT_LOOK, 7), "linear"],
  [T.up - 0.2, C(POV_LENS, SIDE_LOOK, 18), "in"],
  [T.up + 0.05, C(FRONT_LENS, [-2.05, 1.42, 18.3], 30), "out"],
  [T.dropped - 0.05, C(FRONT_LENS, [-2.05, 1.42, 18.3], 32), "linear"],
  // through the open window, down with the falling cup
  [T.dropped + 0.15, C([-1.85, 1.5, 17.45], [-1.95, 1.0, 18.0], 46), "in"],
  [T.dropped + 0.45, C([-2.8, 1.3, 17.95], [-1.95, 0.35, 18.0], 50), "out"],
  [T.ran - 0.05, C([-2.8, 1.32, 17.96], [-1.95, 0.4, 18.0], 50), "linear"],
  [T.ran + 0.45, C([-2.6, 1.6, 18.1], RUN_TO, 52), "inout"],
  [T.walt3, C([-2.6, 1.61, 18.12], RUN_TO, 52), "linear"],
]);
const s6: Scene = {
  id: 6, t0: T.then - 0.06, mood: "golden", blur: 1.0, set: "street", dip: true, opts: () => ({ night: false, hollowAcross: true, secCam: true }),
  cam: (t) => {
    const k = S6_KEYS(t);
    const b = smooth((t - (T.ran - 0.3)) / 0.5);
    return b > 0 ? C(k.pos, lerpV(k.look, headPosed(alvActor(t, 1, 1, 0)), b), k.fov) : k;
  },
  actors: (t) => [alvActor(t, window01(t, T.up - 0.15, 99, 0.12, 0.1), t > T.ran - 0.05 ? 1 : 0, 0)],
  extra: (t) => {
    const fall = Math.max(0, t - (T.dropped + 0.05));
    const mug: V3 = fall > 0 ? [ALV_P[0] + 0.1, Math.max(0.08, 1.05 - 4.9 * fall * fall), ALV_P[2] - 0.3] : [ALV_P[0] + 0.1, 1.05, ALV_P[2] - 0.3];
    const broke = fall > 0.44;
    return { mat: matUpright, mug: broke ? undefined : mug, shards: broke ? Math.min(1, (fall - 0.44) / 0.4) : 0 };
  },
  focus: (t) => (t < T.up - 0.3 ? MAT_LOOK : t < T.dropped + 0.3 ? alvHead() : t < T.ran - 0.05 ? [-1.95, 0.4, 18.0] : headPosed(alvActor(t, 1, 1, 0))),
};

// ================================================================== 7. Walt's kitchen
const K = (x: number, y: number, z: number): V3 => [KITCHEN[0] + x, KITCHEN[1] + y, KITCHEN[2] + z];
const WALT_LIE: { p: V3; r: V3 } = { p: K(-0.5, 0.12, 0.2), r: [-PI / 2 + 0.28, 0, 0] };
const IN0 = T.fallen + 0.35;
const ALV_IN: WalkSeg[] = [
  { t0: IN0, t1: IN0 + 0.35, from: K(3.7, 0, 1.2), to: K(2.6, 0, 1.2) },
  { t0: IN0 + 0.35, t1: IN0 + 0.75, from: K(2.6, 0, 1.2), to: K(2.25, 0, -0.55) },
  { t0: IN0 + 0.75, t1: IN0 + 1.3, from: K(2.25, 0, -0.55), to: K(0.15, 0, -0.75) },
];
const WALT_LIE_HEAD = (): V3 => { const y = head(WALT, [0, 0, 0])[1]; return [WALT_LIE.p[0], WALT_LIE.p[1] + y * Math.cos(WALT_LIE.r[0]), WALT_LIE.p[2] + y * Math.sin(WALT_LIE.r[0])]; };
const s7Actors = (t: number): Actor[] => {
  const w = walkAt(ALV_IN, ALV_IN[0].from, t, ALVAREZ.height * 1.5);
  const seg = ALV_IN.find((s) => t >= s.t0 && t < s.t1);
  // heading follows the actual travel (a short look-behind / ahead), so the corners turn smoothly
  // heading from a time-averaged path (mean of positions over +-0.35 s), so corners turn smoothly
  const avg = (u: number): V3 => { let x = 0, z = 0; for (let k = -7; k <= 7; k++) { const q = walkAt(ALV_IN, ALV_IN[0].from, u + k * 0.05).p; x += q[0]; z += q[2]; } return [x / 15, 0, z / 15]; };
  const qa = avg(t - 0.06);
  const qb = avg(t + 0.06);
  const moving = Math.hypot(qb[0] - qa[0], qb[2] - qa[2]) > 0.004;
  const yaw = t < IN0 - 0.4 ? -PI / 2 : t < ALV_IN[2].t1 && moving ? Math.atan2(qb[0] - qa[0], qb[2] - qa[2]) : lerpAng(Math.atan2(-2.1, -0.2), -PI / 2, smooth((t - ALV_IN[2].t1) / 0.3));
  const crouch = smooth((t - (ALV_IN[2].t1 + 0.05)) / 0.3);
  const hp = head(WALT, [0, 0, 0]);
  void hp;
  const reachW = ik(ALVAREZ, w.p, yaw, "R", K(-0.45, 0.5, -0.75), 25, 0.85 * crouch);
  const pa: BodyPose = { ...REST, walk: w.walk, lean: seg ? 12 : 6 + 22 * crouch, sit: 0.85 * crouch, armR: mixArm([14, 10], reachW.arm, crouch), armRFwd: lerp(10, reachW.fwd, crouch) };
  const fa = t < T.waited ? F("huge", "gasp", "high", { sweat: true }) : F("wide", "frown", "worried");
  const wave = window01(t, T.waited + 0.1, 99, 0.3, 0.1);
  const pw: BodyPose = { ...REST, armR: [60 + 30 * wave + 12 * Math.sin(t * 5) * wave, 50], armRFwd: 40, armL: [20, 30], armLFwd: 30, headNod: -20, headYaw: 40 * wave };
  const fw = t < T.kitchen ? F("closed", "grimace", "worried") : F("half", "smile", "worried", { sweat: t < T.waited });
  return [{ ...A(WALT, [0, 0, 0], 0, pw, fw), lying: WALT_LIE }, A(ALVAREZ, w.p, yaw, pa, fa)];
};
const s7: Scene = {
  id: 7, t0: T.walt3 - 0.06, mood: "day", blur: 1.1, set: "kitchen", opts: () => ({}),
  cam: keyed([
    [T.walt3 - 0.06, C(K(-0.2, 2.0, 0.6), WALT_LIE_HEAD(), 40)],
    [T.kitchen - 0.25, C(K(-0.25, 1.9, 0.3), WALT_LIE_HEAD(), 36), "linear"],
    [T.kitchen + 0.2, C(K(-1.7, 1.75, -1.2), K(2.6, 1.3, 1.0), 52), "inout"],
    [T.waited - 0.05, C(K(-1.7, 1.75, -1.15), K(1.3, 1.1, -0.3), 52), "linear"],
    // low, from the left wall side: her face and Walt's profile in one portrait frame
    [T.waited + 0.75, C(K(-2.0, 0.9, -0.9), K(-0.4, 0.68, -0.95), 60), "inout"],
    [T.now, C(K(-1.97, 0.9, -0.9), K(-0.4, 0.69, -0.95), 58), "linear"],
  ]),
  actors: s7Actors,
  extra: (t) => ({ kdoor: smooth((t - (IN0 + 0.05)) / 0.3) }),
  focus: (t) => (t < T.kitchen + 0.1 ? WALT_LIE_HEAD() : headPosed(s7Actors(t)[1])),
};

// ================================================================== 8. the street: every house flips its mat
const s8Actors = (t: number): Actor[] => {
  const lens = s8.cam(t).pos;
  const wave = (k: number) => window01(t, T.now + 0.1 * k, 99, 0.3, 0.1);
  const mk = (spec: CharacterSpec, p: V3, k: number, side: "L" | "R" = "R"): Actor => {
    const end: V3 = [0.5, 6.5, 15.5];
    const yaw = lerpAng(0, yawTo(p, end), 0.4);
    void lens;
    return A(spec, p, yaw, { ...WAVE(t + k, wave(k), REST, side), ...look(spec, p, yaw, end) }, F("closed", "grin", "raised", { flush: 0.25 }));
  };
  return [mk(WALT, [-0.65, DECK_Y, 1.25], 0), mk(ALVAREZ, [0.65, DECK_Y, 1.3], 1, "L"), mk(NEIGH_A, [-8.75, 0, 1.8], 2), mk(NEIGH_B, [8.75, 0, 1.8], 3), mk(OFFICER, [1.6, 0, 9.6], 4)];
};
const s8: Scene = {
  id: 8, t0: T.now - 0.06, mood: "golden", blur: 0.8, set: "street", opts: () => ({ night: false, hollowAcross: true, secCam: true, allMats: true }),
  cam: keyed([
    [T.now - 0.06, C([0, 1.35, 2.75], [0, 0.35, 0.7], 46)],
    [T.house3 - 0.3, C([0, 1.4, 2.8], [0, 0.4, 0.7], 46), "linear"],
    [T.house3 + 0.15, C([0.2, 1.9, 5.8], [0, 1.3, 1.0], 44), "inout"],
    [T.street2 - 0.15, C([0.2, 1.95, 6.0], [0, 1.3, 1.0], 44), "linear"],
    [T.flips + 0.15, C([0.5, 6.5, 15.5], [0, 0.6, 1.0], 46), "inout"],
    [SECONDS, C([0.5, 6.9, 16.0], [0, 0.6, 1.0], 46), "linear"],
  ]),
  actors: s8Actors,
  extra: () => ({ mat: matUpside, car: CAR }),
  focus: (t) => (t < T.house3 ? [0, 0.4, 0.7] : [0, 1.2, 1.2]),
};

export const SCENES: Scene[] = [s1, s2, s3, s4, s5, s6, s7, s8];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const flipDebug = { s1: (t: number) => s1Actor(t).f, s4: (t: number) => s4Actor(t).f };
export const MAPLE_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0), flip1: S1F.flip, flip2: S4F.flip, mount: MOUNT, hoodOff: HOOD_OFF });
