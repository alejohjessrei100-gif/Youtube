// The Franklin film as DATA. One continuous keyed lens per scene; eased moves land on the spoken nouns. Cuts only for a
// change of place or time (the week-later cut dips to black).
//   1 HALL   the rival glares and points; Franklin smiles, dips his quill, writes the letter, hands it to the messenger,
//            who runs out (follow)
//   2 LIB    the messenger bursts in (entrance); hands over the letter; the rival slides the rare book across (handoff)
//   3 LIB    a week later: Franklin walks in with the book and a note; polite → friendly (handshake) → friends (teacups);
//            the note's signature "B. Franklin"; his wink; the rival's thought bubble: "?" → "I must like him."
//   4 LAB    1969: the chalkboard, the student hands the coins back, the check mark
//   5 OFFICE today: the coworker glares; the gift slides over and comes back; "can I borrow a pen?"; she smiles
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lerp, mixArm, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { C, hand, head, headPosed, ik, keyed, lerpAng, look, smooth, yawTo } from "../crow/shots";
import { FRANKLIN, GRUMP, MESSENGER, PSYCH, RIVAL, STUDENT, YOU } from "./cast";
import { FR_DESK, HALL, HALL_DOOR, LAB, LAB_DESK, LIB, LIB_DESK, LIB_DOOR, OFFICE } from "./world";
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
const Hh = at(HALL), Lb = at(LIB), Bb = at(LAB), Oo = at(OFFICE);

export const T = {
  rival: W("rival"), hated: W("hated"), so: W("so"), strange: W("strange."), asked: W("asked"), favor: W("favor."), specifically: W("specifically,"),
  wrote: W("wrote"), letter: W("letter"), borrow: W("borrow"), rare: W("rare"), book: W("book."), lent: W("lent"), returned: W("returned"),
  week: W("week"), note: W("note."), day: W("day"), polite2: W("polite", 2), friendly: W("friendly,"), finally: W("finally"), friend: W("friend"),
  life: W("life."), you2: W("you", 2), benjamin: W("benjamin"), franklin: W("franklin"), figured: W("figured"), when: W("when"), favor2: W("favor", 2),
  brain: W("brain"), why: W("why."), easiest: W("easiest"), must: W("must"), psychologists: W("psychologists"), tested: W("tested"), y1969: W("1969"),
  held: W("held"), next: W("next"), stand: W("stand"), dont: W("don't"), gift: W("gift,"), ask: W("ask"), borrow2: W("borrow", 2), pen: W("pen."),
};

// ------------------------------------------------------------------ types
export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState };
export type Prop = { p: V3; r?: V3 };
export type Extra = {
  letter?: Prop; note?: Prop; book?: Prop; cups?: Prop[]; coins?: V3[]; gift?: Prop; pen?: Prop;
  bubble?: { p: V3; text: string; k: number }; check?: number;
};
export type SetId = "hall" | "lib" | "lab" | "office";
export type Scene = { id: number; t0: number; mood: string; blur: number; set: SetId; cam: (t: number) => Cam; actors: (t: number) => Actor[]; extra: (t: number) => Extra; focus: (t: number) => V3; dip?: boolean };
const A = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });

/** the worst IK miss (metres) among arms more than 70% committed since the last read — for the checker */
let reachErr = 0;
let reachWho = "";
export const takeReachErr = () => { const e = reachErr; reachErr = 0; return e; };
export const takeReachWho = () => { const w = reachWho; reachWho = ""; return w; };
/** blend one arm toward an IK solve onto `target` by u (0 = rest) */
const reach = (spec: CharacterSpec, p: V3, yaw: number, base: BodyPose, side: "L" | "R", target: V3, u: number, lean = 0): BodyPose => {
  if (u <= 0) return base;
  const k = ik(spec, p, yaw, side, target, lean);
  if (u > 0.7 && k.err > reachErr) { reachErr = k.err; reachWho = `seed ${spec.look.seed} ${side} target [${target.map((v) => v.toFixed(2))}] dist ${Math.hypot(target[0] - p[0], target[2] - p[2]).toFixed(2)} h ${target[1].toFixed(2)}`; }
  return side === "R"
    ? { ...base, armR: mixArm(base.armR ?? REST.armR!, k.arm, u), armRFwd: lerp(base.armRFwd ?? 10, k.fwd, u) }
    : { ...base, armL: mixArm(base.armL ?? REST.armL!, k.arm, u), armLFwd: lerp(base.armLFwd ?? 10, k.fwd, u) };
};
const handAt = (a: Actor, side: "L" | "R") => hand(a.spec, a.p, a.yaw, a.pose, side) as V3;
const talk = (t: number, a: number, b: number, base: FaceState["mouth"]): FaceState["mouth"] => (t < a || t > b ? base : Math.floor((t - a) * 9) % 2 === 0 ? "open" : "o");

// ================================================================== 1. HALL
const FR_P: V3 = Hh(-2.25, 0, 0.4);
const RV_P: V3 = Hh(2.35, 0, -0.3);
const FR_YAW = lerpAng(PI / 2, yawTo(FR_P, Hh(-0.6, 0, 2.2)), 0.35);
const RV_YAW = lerpAng(-PI / 2, yawTo(RV_P, Hh(0.4, 0, 1.8)), 0.35);
const PAGE_DESK: V3 = Hh(-1.72, 1.06, 0.25); // the letter on Franklin's desk (slanted top)
const INKPOT: V3 = Hh(-1.82, 1.16, 0.02); // the quill pot, on the near-right corner of his desk
const MS_WAIT: V3 = Hh(-2.0, 0, 1.15);
const LETTER_MEET: V3 = Hh(-2.12, 1.05, 0.8);
/** a reachable point ~0.55 m from the shoulder toward a far target (pointing, not reaching) */
const pointDir = (spec: CharacterSpec, p: V3, target: V3): V3 => { const sh = add(head(spec, p), [0, -0.42, 0]); const d = [target[0] - sh[0], target[1] - sh[1], target[2] - sh[2]]; const L = Math.hypot(d[0], d[1], d[2]) || 1; return [sh[0] + (d[0] / L) * 0.55, sh[1] + (d[1] / L) * 0.55, sh[2] + (d[2] / L) * 0.55]; };
const MS_RUN: WalkSeg = { t0: T.borrow + 0.35, t1: T.rare + 0.4, from: MS_WAIT, to: Hh(-4.2, 0, 2.6) };
const HAND_OFF = T.letter + 0.45; // the letter leaves the desk for Franklin's hand, then the messenger's
const s1Actors = (t: number): Actor[] => {
  // the rival: glares and jabs a finger across the aisle on "hated him"
  const jab = window01(t, T.rival + 0.2, T.so + 0.3, 0.2, 0.3);
  let pr = reach(RIVAL, RV_P, RV_YAW, REST, "R", pointDir(RIVAL, RV_P, head(FRANKLIN, FR_P)), jab, 6);
  pr = { ...pr, lean: 6 + 6 * jab, ...look(RIVAL, RV_P, RV_YAW, head(FRANKLIN, FR_P)) };
  const fr = F("glare", t < T.hated ? "frown" : "yell", "furious");
  // Franklin: the smile, the quill dip, writing, the handoff
  const dip = window01(t, T.asked + 0.1, T.favor + 0.5, 0.25, 0.25);
  const write = window01(t, T.specifically - 0.1, HAND_OFF, 0.25, 0.15);
  const give = window01(t, HAND_OFF - 0.05, T.borrow + 0.4, 0.15, 0.25);
  let pf: BodyPose = { ...REST, lean: 4 + 8 * write };
  pf = reach(FRANKLIN, FR_P, FR_YAW, pf, "R", INKPOT, dip, 4);
  const pen: V3 = add(PAGE_DESK, [0.06 * Math.sin(t * 11), 0.03, 0.05 * Math.sin(t * 7)]);
  pf = reach(FRANKLIN, FR_P, FR_YAW, pf, "R", pen, write, 12);
  pf = reach(FRANKLIN, FR_P, FR_YAW, pf, "L", LETTER_MEET, give, 6);
  const lookAt = write > 0.5 ? PAGE_DESK : t > HAND_OFF ? head(MESSENGER, MS_WAIT) : t > T.so - 0.1 ? Hh(-0.4, 1.6, 2.4) : head(RIVAL, RV_P);
  pf = { ...pf, ...look(FRANKLIN, FR_P, FR_YAW, lookAt) };
  const ff = t < T.so ? F("half", "flat", "neutral") : t < T.strange + 0.4 ? F("squint", "smirk", "raised") : write > 0.3 ? F("half", "smile", "neutral") : F("open", "smile", "raised");
  // the messenger: waits at the desk, takes the letter, runs for the door
  const w = walkAt([MS_RUN], MS_WAIT, t, MESSENGER.height * 1.7);
  const running = t > MS_RUN.t0;
  const myaw = running ? lerpAng(yawTo(MS_WAIT, FR_P), yawTo(MS_RUN.from, MS_RUN.to), smooth((t - MS_RUN.t0) / 0.25)) : yawTo(MS_WAIT, FR_P);
  const take = window01(t, HAND_OFF + 0.15, 99, 0.2, 0.1);
  let pm: BodyPose = { ...REST, walk: w.walk, lean: running ? 16 : 2 };
  pm = reach(MESSENGER, w.p, myaw, pm, "R", LETTER_MEET, take * (running ? 0 : 1), 4);
  return [A(RIVAL, RV_P, RV_YAW, pr, fr), A(FRANKLIN, FR_P, FR_YAW, pf, ff), A(MESSENGER, w.p, myaw, pm, F(running ? "wide" : "open", running ? "o" : "smile", "raised"))];
};
const s1: Scene = {
  id: 1, t0: 0, mood: "lamp", blur: 1.0, set: "hall",
  cam: keyed([
    [0, C(Hh(0.7, 1.6, 1.5), Hh(2.3, 1.55, -0.3), 44)],
    [T.hated - 0.35, C(Hh(0.8, 1.6, 1.3), Hh(2.3, 1.58, -0.3), 40), "linear"],
    [T.hated + 0.1, C(Hh(1.0, 1.62, 1.0), Hh(2.3, 1.6, -0.3), 46), "inout"],
    [T.so - 0.1, C(Hh(1.02, 1.62, 1.02), Hh(2.3, 1.6, -0.3), 46), "linear"],
    [T.so + 0.4, C(Hh(-0.6, 1.62, 1.75), Hh(-2.2, 1.55, 0.4), 40), "inout"],
    [T.asked - 0.2, C(Hh(-0.65, 1.62, 1.8), Hh(-2.15, 1.5, 0.45), 40), "linear"],
    [T.asked + 0.3, C(Hh(-0.9, 1.7, 1.9), Hh(-1.8, 1.25, 0.55), 46), "inout"],
    [T.specifically - 0.15, C(Hh(-0.92, 1.7, 1.92), Hh(-1.8, 1.22, 0.55), 46), "linear"],
    [T.specifically + 0.35, C(Hh(-1.95, 2.15, 1.05), PAGE_DESK, 40), "inout"],
    [T.letter + 0.1, C(Hh(-1.94, 2.12, 1.02), PAGE_DESK, 36), "linear"],
    [T.borrow - 0.1, C(Hh(-0.9, 1.55, 2.6), Hh(-2.0, 1.2, 1.2), 50), "inout"],
    [T.borrow + 0.35, C(Hh(-0.95, 1.55, 2.65), Hh(-2.2, 1.15, 1.4), 50), "linear"],
    [T.rare, C(Hh(-1.6, 1.5, 3.4), Hh(-3.9, 1.0, 2.5), 52), "inout"],
  ]),
  actors: s1Actors,
  extra: (t) => {
    // the letter: on the desk while written, in Franklin's left hand, then the messenger's right hand
    const a = s1Actors(t);
    if (t < HAND_OFF) return { letter: { p: PAGE_DESK, r: [0.14, PI / 2 + 0.1, 0] } };
    if (t < HAND_OFF + 0.3) return { letter: { p: lerpV(PAGE_DESK, add(handAt(a[1], "L"), [0, 0.02, 0]), smooth((t - HAND_OFF) / 0.3)), r: [0.6, PI / 2, 0] } };
    if (t < T.borrow + 0.1) return { letter: { p: add(handAt(a[1], "L"), [0, 0.02, 0]), r: [0.9, PI / 2, 0] } };
    // the messenger tucks it against his chest as he runs
    const chest = add(a[2].p, [0.18 * Math.sin(a[2].yaw), a[2].spec.height * 0.62, 0.18 * Math.cos(a[2].yaw)]);
    return { letter: { p: lerpV(add(handAt(a[2], "R"), [0, 0.02, 0]), chest, smooth((t - (T.borrow + 0.1)) / 0.35)), r: [1.3, a[2].yaw, 0] } };
  },
  focus: (t) => (t < T.so ? headPosed(s1Actors(t)[0]) : t < T.specifically ? headPosed(s1Actors(t)[1]) : t < T.borrow - 0.1 ? PAGE_DESK : headPosed(s1Actors(t)[2])),
};

// ================================================================== 2. LIB: the rare book is lent
const RV_L: V3 = Lb(0.8, 0, -1.0);
const RV_LYAW = lerpAng(0, yawTo(RV_L, Lb(2.0, 0, 1.6)), 0.3);
const MS_IN: WalkSeg = { t0: T.rare - 0.08, t1: T.lent - 0.38, from: Lb(-3.3, 0, 1.5), to: Lb(0.55, 0, 0.24) };
const BOOK_DESK: V3 = Lb(0.85, 0.82, -0.45);
const BOOK_SLIDE = { t0: T.lent - 0.08, t1: T.lent + 0.22 };
const BOOK_EDGE: V3 = Lb(0.66, 0.82, -0.18);
const LETTER_L: V3 = Lb(0.7, 1.08, -0.42);
const s2Actors = (t: number): Actor[] => {
  const w = walkAt([MS_IN], MS_IN.from, t, MESSENGER.height * 1.7);
  const arrived = t > MS_IN.t1;
  const myaw = lerpAng(yawTo(MS_IN.from, MS_IN.to), yawTo(MS_IN.to, RV_L), smooth((t - (MS_IN.t1 - 0.3)) / 0.6));
  const give = window01(t, MS_IN.t1 - 0.12, BOOK_SLIDE.t0 + 0.05, 0.12, 0.12);
  const grab = window01(t, BOOK_SLIDE.t1 - 0.05, 99, 0.15, 0.1);
  let pm: BodyPose = { ...REST, walk: w.walk, lean: arrived ? 6 : 16 };
  pm = reach(MESSENGER, w.p, myaw, pm, "R", LETTER_L, give, 14);
  pm = reach(MESSENGER, w.p, myaw, pm, "R", add(BOOK_EDGE, [0.06, 0.03, 0.05]), grab, 10);
  pm = reach(MESSENGER, w.p, myaw, pm, "L", add(BOOK_EDGE, [-0.12, 0.03, 0.05]), grab, 10);
  // the rival: takes the letter, glances at it, grumbles, pushes the book across with his right hand
  const take = window01(t, MS_IN.t1 - 0.05, BOOK_SLIDE.t0 + 0.1, 0.12, 0.12);
  const push = window01(t, BOOK_SLIDE.t0 - 0.1, BOOK_SLIDE.t1 + 0.15, 0.12, 0.2);
  const bookAt = lerpV(BOOK_DESK, BOOK_EDGE, smooth((t - BOOK_SLIDE.t0) / (BOOK_SLIDE.t1 - BOOK_SLIDE.t0)));
  let pr: BodyPose = { ...REST, lean: 6 + 10 * push };
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "L", LETTER_L, take, 14);
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "R", add(bookAt, [0.05, 0.05, -0.06]), push, 16);
  pr = { ...pr, ...look(RIVAL, RV_L, RV_LYAW, take > 0.5 ? LETTER_L : head(MESSENGER, w.p)) };
  return [A(RIVAL, RV_L, RV_LYAW, pr, take > 0.5 ? F("squint", "frown", "angry") : F("half", "grimace", "angry")), A(MESSENGER, w.p, myaw, pm, F("open", arrived ? "smile" : "o", "raised"))];
};
const s2: Scene = {
  id: 2, t0: T.rare - 0.05, mood: "lamp", blur: 1.0, set: "lib",
  cam: keyed([
    [T.rare - 0.05, C(Lb(2.4, 1.7, 3.4), Lb(-2.6, 1.2, 1.4), 54)],
    [T.rare + 0.45, C(Lb(2.5, 1.75, 3.5), Lb(-0.6, 1.1, 0.6), 56), "inout"],
    [T.book + 0.35, C(Lb(2.1, 1.5, 1.6), Lb(0.8, 1.1, -0.6), 48), "inout"],
    [BOOK_SLIDE.t0, C(Lb(2.05, 1.48, 1.55), Lb(0.8, 1.05, -0.5), 48), "linear"],
    [BOOK_SLIDE.t1 + 0.1, C(Lb(1.8, 1.5, 1.3), Lb(0.68, 1.15, -0.35), 48), "inout"],
    [T.returned - 0.1, C(Lb(1.78, 1.5, 1.28), Lb(0.68, 1.18, -0.36), 47), "linear"],
  ]),
  actors: s2Actors,
  extra: (t) => {
    const a = s2Actors(t);
    const u = smooth((t - BOOK_SLIDE.t0) / (BOOK_SLIDE.t1 - BOOK_SLIDE.t0));
    const held = t > BOOK_SLIDE.t1 + 0.12;
    const book: Prop = held ? { p: lerpV(handAt(a[1], "R"), handAt(a[1], "L"), 0.5), r: [0, a[1].yaw, 0] } : { p: lerpV(BOOK_DESK, BOOK_EDGE, u), r: [0, 0.2, 0] };
    const swap = MS_IN.t1 + 0.02;
    const letter: Prop = t < swap ? { p: add(handAt(a[1], "R"), [0, 0.02, 0]), r: [0.9, a[1].yaw, 0] } : t < BOOK_SLIDE.t0 ? { p: add(handAt(a[0], "L"), [0, 0.03, 0]), r: [-0.9, a[0].yaw, 0] } : { p: lerpV(add(handAt(a[0], "L"), [0, 0.03, 0]), Lb(0.4, 0.83, -0.55), smooth((t - BOOK_SLIDE.t0) / 0.3)), r: [0, 0.4, 0] };
    return { book, letter };
  },
  focus: (t) => (t < T.book ? headPosed(s2Actors(t)[1]) : t < BOOK_SLIDE.t0 ? BOOK_DESK : t < BOOK_SLIDE.t1 + 0.1 ? BOOK_EDGE : headPosed(s2Actors(t)[0])),
};

// ================================================================== 3. LIB a week later: the book comes back, a friend for life
const FR_IN: WalkSeg = { t0: T.returned - 0.15, t1: T.week + 0.55, from: Lb(-3.3, 0, 1.5), to: Lb(0.6, 0, 0.22) };
const FR_LYAW = lerpAng(PI, yawTo(Lb(0.6, 0, 0.22), Lb(2.0, 0, -0.9)), 0.3);
const NOTE_GIVE = T.note - 0.1;
const NOTE_DESK: V3 = Lb(1.05, 0.83, -0.55);
const CUP_F0: V3 = Lb(0.42, 0.85, -0.25), CUP_R0: V3 = Lb(1.25, 0.85, -0.6);
const SHAKE = { t0: T.friendly - 0.2, t1: T.finally - 0.05 };
const CLINK: V3 = Lb(0.72, 1.3, -0.38);
const MEET: V3 = Lb(0.74, 1.1, -0.38);
const s3Actors = (t: number): Actor[] => {
  const w = walkAt([FR_IN], FR_IN.from, t, FRANKLIN.height);
  const there = t > FR_IN.t1;
  const fyaw = lerpAng(yawTo(FR_IN.from, FR_IN.to), FR_LYAW, smooth((t - (FR_IN.t1 - 0.3)) / 0.9));
  const fp = w.p;
  // Franklin: carries the book in both hands, sets it down, holds out the note, shakes hands, lifts a cup, winks
  const carry = 1 - smooth((t - (FR_IN.t1 - 0.05)) / 0.3);
  const offer = window01(t, FR_IN.t1 + 0.05, T.day, 0.2, 0.25);
  const shake = window01(t, SHAKE.t0, SHAKE.t1, 0.2, 0.2);
  const cup = window01(t, T.finally - 0.1, T.you2 - 0.1, 0.25, 0.25);
  const tap = window01(t, T.figured - 0.15, T.when - 0.05, 0.2, 0.2);
  const lean = 4 + 16 * offer + 18 * shake + 16 * cup;
  let pf: BodyPose = { ...REST, walk: w.walk, lean };
  pf = reach(FRANKLIN, fp, fyaw, pf, "R", add(fp, [0.2 * Math.sin(fyaw) + 0.18 * Math.cos(fyaw), 1.05, 0.2 * Math.cos(fyaw) - 0.18 * Math.sin(fyaw)]), carry, 2);
  pf = reach(FRANKLIN, fp, fyaw, pf, "L", add(fp, [0.2 * Math.sin(fyaw) - 0.18 * Math.cos(fyaw), 1.05, 0.2 * Math.cos(fyaw) + 0.18 * Math.sin(fyaw)]), carry, 2);
  pf = reach(FRANKLIN, fp, fyaw, pf, "R", MEET, offer, lean);
  pf = reach(FRANKLIN, fp, fyaw, pf, "R", MEET, shake, lean);
  pf = reach(FRANKLIN, fp, fyaw, pf, "R", add(CLINK, [-0.07, 0, 0.03]), cup, lean);
  pf = reach(FRANKLIN, fp, fyaw, pf, "L", add(head(FRANKLIN, fp), [-0.3 * Math.cos(fyaw) + 0.22 * Math.sin(fyaw), 0.05, 0.3 * Math.sin(fyaw) + 0.22 * Math.cos(fyaw)]), tap, 4);
  const winkAt = s3.cam(t).pos;
  pf = { ...pf, ...look(FRANKLIN, fp, fyaw, tap > 0.2 ? winkAt : head(RIVAL, RV_L)) };
  const ff = tap > 0.3 ? F("squint", "smirk", "raised") : cup > 0.3 ? F("closed", "beam", "raised", { flush: 0.2 }) : there ? F("open", "smile", "raised") : F("half", "smile", "neutral");
  // the rival: reads the note, a stiff polite nod, the handshake, the cup, the thought bubble
  const read = window01(t, T.note, T.polite2 + 0.2, 0.2, 0.25);
  const nod = window01(t, T.polite2 - 0.05, T.friendly - 0.15, 0.15, 0.15);
  const scratch = window01(t, T.brain - 0.1, T.easiest, 0.2, 0.25);
  const glee = window01(t, T.must - 0.15, 99, 0.2, 0.1);
  let pr: BodyPose = { ...REST, lean: 4 + 16 * shake + 14 * cup + 12 * nod };
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "L", Lb(0.8, 1.2, -0.75), read, 4);
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "R", Lb(0.8, 1.2, -0.75), read, 4);
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "R", MEET, shake, 20);
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "R", add(CLINK, [0.07, 0, -0.03]), cup, 18);
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "R", add(head(RIVAL, RV_L), [0.3, 0.08, 0.06]), scratch, 4);
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "L", add(head(RIVAL, RV_L), [-0.12, -0.25, 0.25]), glee, 4);
  pr = reach(RIVAL, RV_L, RV_LYAW, pr, "R", add(head(RIVAL, RV_L), [0.12, -0.25, 0.25]), glee, 4);
  const rlook = read > 0.5 ? Lb(0.8, 1.2, -0.7) : t > T.when - 0.1 ? s3.cam(t).pos : head(FRANKLIN, fp);
  pr = { ...pr, ...look(RIVAL, RV_L, RV_LYAW, rlook), headNod: (look(RIVAL, RV_L, RV_LYAW, rlook).headNod ?? 0) + 18 * nod, headTilt: 10 * scratch };
  const rf =
    t < T.note + 0.2 ? F("half", "flat", "neutral") :
    read > 0.5 ? F("open", "o", "raised") :
    nod > 0.3 ? F("half", "flat", "neutral") :
    shake > 0.3 ? F("open", "smile", "raised") :
    cup > 0.3 ? F("closed", "beam", "raised", { flush: 0.25 }) :
    glee > 0.2 ? F("sparkle", "beam", "high", { flush: 0.55 }) :
    scratch > 0.3 ? F("open", "wavy", "worried") :
    t > T.when - 0.1 ? F("open", talk(t, T.easiest, T.must + 0.4, "flat"), "raised") : F("open", "smile", "raised");
  return [A(RIVAL, RV_L, RV_LYAW, pr, rf), A(FRANKLIN, fp, fyaw, pf, ff)];
};
const s3: Scene = {
  id: 3, t0: T.returned - 0.12, mood: "lamp", blur: 1.0, set: "lib", dip: true,
  cam: keyed([
    [T.returned - 0.12, C(Lb(1.9, 1.62, 2.4), Lb(-3.2, 1.35, 1.6), 50)],
    [T.week - 0.15, C(Lb(1.95, 1.62, 2.45), Lb(-1.6, 1.35, 1.1), 52), "inout"],
    [FR_IN.t1 + 0.2, C(Lb(1.75, 1.58, 1.55), Lb(0.75, 1.3, -0.45), 48), "inout"],
    [T.day, C(Lb(1.72, 1.58, 1.5), Lb(0.78, 1.35, -0.7), 46), "linear"],
    [T.polite2 - 0.1, C(Lb(1.55, 1.6, 1.25), Lb(0.8, 1.45, -0.9), 40), "inout"],
    [SHAKE.t0 + 0.2, C(Lb(1.85, 1.5, 1.35), Lb(0.72, 1.2, -0.45), 48), "inout"],
    [T.friend - 0.05, C(Lb(1.8, 1.45, 1.3), CLINK, 46), "inout"],
    [T.life + 0.3, C(Lb(1.82, 1.46, 1.32), CLINK, 46), "linear"],
    [T.benjamin - 0.15, C(Lb(1.25, 1.5, -0.1), NOTE_DESK, 36), "inout"],
    [T.franklin + 0.35, C(Lb(1.23, 1.48, -0.13), NOTE_DESK, 32), "linear"],
    [T.figured, C(Lb(1.65, 1.68, -0.55), Lb(0.6, 1.5, 0.2), 48), "inout"],
    [T.when - 0.15, C(Lb(1.64, 1.68, -0.53), Lb(0.6, 1.5, 0.2), 47), "linear"],
    [T.when + 0.35, C(Lb(1.5, 1.7, 0.35), Lb(0.82, 1.85, -1.0), 54), "inout"],
    [T.why, C(Lb(1.5, 1.7, 0.32), Lb(0.82, 1.88, -1.0), 52), "linear"],
    [T.must - 0.2, C(Lb(1.42, 1.7, 0.22), Lb(0.82, 1.88, -1.0), 50), "inout"],
    [T.psychologists, C(Lb(1.41, 1.7, 0.2), Lb(0.82, 1.9, -1.0), 49), "linear"],
  ]),
  actors: s3Actors,
  extra: (t) => {
    const a = s3Actors(t);
    const rv = a[0], fr = a[1];
    // the book: carried in, set on the desk
    const inHands = add(lerpV(handAt(fr, "R"), handAt(fr, "L"), 0.5), [0, 0.04, 0]);
    const book: Prop = { p: lerpV(inHands, Lb(0.45, 0.83, -0.18), smooth((t - (FR_IN.t1 - 0.15)) / 0.3)), r: [0, lerpAng(fr.yaw, 0.3, smooth((t - (FR_IN.t1 - 0.15)) / 0.3)), 0] };
    // the note: in Franklin's right hand, to the rival's hands, then on the desk
    const inF = add(handAt(fr, "R"), [0, 0.03, 0]), inR = add(lerpV(handAt(rv, "L"), handAt(rv, "R"), 0.5), [0, 0.05, 0]);
    const note: Prop = t < NOTE_GIVE ? { p: inF, r: [0.9, fr.yaw, 0] } : t < T.polite2 + 0.25 ? { p: lerpV(inF, inR, smooth((t - NOTE_GIVE) / 0.3)), r: [-1.1, 0, 0] } : { p: lerpV(inR, NOTE_DESK, smooth((t - (T.polite2 + 0.25)) / 0.35)), r: [0, 0.25, 0] };
    const held = smooth((t - (T.finally - 0.05)) / 0.25) * (1 - smooth((t - (T.you2 - 0.35)) / 0.3));
    const cupF: V3 = lerpV(CUP_F0, add(handAt(fr, "R"), [0, 0.02, 0]), held);
    const cupR: V3 = lerpV(CUP_R0, add(handAt(rv, "R"), [0, 0.02, 0]), held);
    const q = window01(t, T.why - 0.25, T.easiest + 0.1, 0.15, 0.15);
    const heart = window01(t, T.must - 0.15, 99, 0.15, 0.1);
    const bubble = q > 0 ? { p: add(head(RIVAL, RV_L), [0.0, 0.62, 0.05]), text: "?", k: q } : heart > 0 ? { p: add(head(RIVAL, RV_L), [0.0, 0.62, 0.05]), text: "I MUST LIKE HIM.", k: heart } : undefined;
    return { book, note, cups: [{ p: cupF }, { p: cupR }], bubble };
  },
  focus: (t) => {
    const a = s3Actors(t);
    return t < FR_IN.t1 ? headPosed(a[1]) : t < T.you2 ? headPosed(a[0]) : t < T.figured ? NOTE_DESK : t < T.when ? headPosed(a[1]) : headPosed(a[0]);
  },
};

// ================================================================== 4. LAB, 1969
const PS_P: V3 = Bb(0.2, 0, -1.5);
const ST_P: V3 = Bb(-0.05, 0, -0.3);
const PS_YAW = lerpAng(0, yawTo(PS_P, Bb(2.4, 0, 0.6)), 0.3);
const ST_YAW = lerpAng(PI, yawTo(ST_P, Bb(2.4, 0, 0.6)), 0.4);
const COINS_T = { t0: T.tested + 0.15, t1: T.y1969 + 0.3 };
const s4Actors = (t: number): Actor[] => {
  const give = window01(t, COINS_T.t0, COINS_T.t1 + 0.2, 0.2, 0.25);
  const mid: V3 = Bb(0.05, 1.0, -0.85);
  let ps: BodyPose = reach(STUDENT, ST_P, ST_YAW, { ...REST, lean: 4 + 14 * give }, "R", mid, give, 16);
  const take = window01(t, COINS_T.t0 + 0.25, COINS_T.t1 + 0.5, 0.2, 0.25);
  let pp: BodyPose = reach(PSYCH, PS_P, PS_YAW, { ...REST, lean: 4 + 14 * take }, "L", add(mid, [0.02, -0.03, 0.02]), take, 16);
  const tick = window01(t, T.held - 0.1, 99, 0.2, 0.1);
  pp = reach(PSYCH, PS_P, PS_YAW, pp, "R", Bb(0.55, 1.1, -1.2), tick, 4);
  ps = { ...ps, ...look(STUDENT, ST_P, ST_YAW, head(PSYCH, PS_P)) };
  pp = { ...pp, ...look(PSYCH, PS_P, PS_YAW, t > T.held ? s4.cam(t).pos : head(STUDENT, ST_P)) };
  return [A(PSYCH, PS_P, PS_YAW, pp, tick > 0.3 ? F("open", "grin", "raised") : F("half", "flat", "neutral")), A(STUDENT, ST_P, ST_YAW, ps, t > COINS_T.t1 ? F("closed", "beam", "raised", { flush: 0.3 }) : F("open", "smile", "neutral"))];
};
const s4: Scene = {
  id: 4, t0: T.psychologists - 0.06, mood: "day", blur: 1.0, set: "lab",
  cam: keyed([
    [T.psychologists - 0.06, C(Bb(-0.3, 1.6, -1.2), Bb(-0.6, 1.55, -2.82), 34)],
    [T.tested - 0.05, C(Bb(-0.25, 1.6, -1.1), Bb(-0.6, 1.55, -2.82), 36), "linear"],
    [T.tested + 0.45, C(Bb(2.2, 1.65, 0.6), Bb(0.1, 1.15, -0.8), 50), "inout"],
    [T.held - 0.1, C(Bb(2.15, 1.63, 0.55), Bb(0.1, 1.2, -0.85), 48), "linear"],
    [T.held + 0.35, C(Bb(1.6, 1.62, 0.1), Bb(-0.2, 1.5, -1.6), 46), "inout"],
    [T.next - 0.06, C(Bb(1.58, 1.62, 0.08), Bb(-0.2, 1.5, -1.6), 45), "linear"],
  ]),
  actors: s4Actors,
  extra: (t) => {
    const a = s4Actors(t);
    const u = smooth((t - (COINS_T.t0 + 0.25)) / 0.35);
    const base = lerpV(lerpV(handAt(a[1], "R"), handAt(a[0], "L"), u), Bb(0.0, 0.62, -0.95), smooth((t - (COINS_T.t1 + 0.35)) / 0.35));
    const coins: V3[] = [0, 1, 2].map((i) => add(base, [0.025 * (i - 1), 0.02 + 0.012 * i, 0.01 * i]));
    return { coins, check: window01(t, T.held + 0.05, 99, 0.12, 0.1) };
  },
  focus: (t) => (t < T.tested ? Bb(-0.6, 1.55, -2.82) : t < T.held ? Bb(0.05, 1.0, -0.85) : headPosed(s4Actors(t)[0])),
};

// ================================================================== 5. OFFICE, today
const YOU_P: V3 = Oo(0.1, 0, 1.45);
const GR_P: V3 = Oo(-0.05, 0, -1.45);
const YOU_YAW = lerpAng(PI, yawTo(YOU_P, Oo(1.6, 0, 0.2)), 0.25);
const GR_YAW = lerpAng(0, yawTo(GR_P, Oo(0.8, 0, 1.8)), 0.3);
const GIFT_GO = { t0: T.dont - 0.15, t1: T.gift - 0.05 };
const GIFT_BACK = { t0: T.gift + 0.12, t1: T.ask - 0.05 };
const GIFT_YOU: V3 = Oo(0.25, 0.6, 0.6), GIFT_HER: V3 = Oo(0.25, 0.6, -0.55);
const PEN_DESK: V3 = Oo(-0.35, 0.6, -0.6);
const PEN_T = { pick: T.borrow2 - 0.1, give: T.pen - 0.05, done: T.pen + 0.3 };
const HANDS_MEET: V3 = Oo(0.0, 1.12, 0.1);
const s5Actors = (t: number): Actor[] => {
  // you: push the gift across, then hold out a hand
  const push = window01(t, GIFT_GO.t0 - 0.1, GIFT_GO.t1 + 0.1, 0.15, 0.2);
  const ask = window01(t, T.ask - 0.1, 99, 0.2, 0.1);
  const giftAt = s5Gift(t);
  let py: BodyPose = { ...REST, lean: 4 + 10 * push + 6 * ask };
  py = reach(YOU, YOU_P, YOU_YAW, py, "R", add(giftAt, [0.05, 0.12, 0.12]), push, 10);
  py = reach(YOU, YOU_P, YOU_YAW, py, "R", add(HANDS_MEET, [0.04, -0.02, 0.1]), ask, 8);
  py = { ...py, ...look(YOU, YOU_P, YOU_YAW, head(GRUMP, GR_P)) };
  // the grump: hands flat on the desk, glaring; flicks the gift back; picks up her pen, hands it over, softens
  const flick = window01(t, GIFT_BACK.t0 - 0.1, GIFT_BACK.t0 + 0.25, 0.1, 0.2);
  const pick = window01(t, PEN_T.pick - 0.1, PEN_T.give, 0.15, 0.1);
  const give = window01(t, PEN_T.give - 0.05, PEN_T.done + 0.6, 0.15, 0.3);
  let pg: BodyPose = { ...REST, lean: 10 };
  pg = reach(GRUMP, GR_P, GR_YAW, pg, "L", Oo(-0.35, 0.62, -0.95), 1 - give, 10);
  pg = reach(GRUMP, GR_P, GR_YAW, pg, "R", Oo(0.3, 0.62, -0.95), 1 - Math.max(flick, pick, give), 10);
  pg = reach(GRUMP, GR_P, GR_YAW, pg, "R", add(GIFT_HER, [-0.05, 0.12, -0.12]), flick, 12);
  pg = reach(GRUMP, GR_P, GR_YAW, pg, "R", add(PEN_DESK, [0, 0.03, 0]), pick, 12);
  pg = reach(GRUMP, GR_P, GR_YAW, pg, "R", add(HANDS_MEET, [-0.04, 0.02, -0.1]), give, 10);
  const soft = window01(t, PEN_T.done, 99, 0.35, 0.1);
  pg = { ...pg, ...look(GRUMP, GR_P, GR_YAW, t > PEN_T.done + 0.2 ? s5.cam(t).pos : head(YOU, YOU_P)) };
  const gf = soft > 0.4 ? F("half", "smile", "raised", { flush: 0.4 }) : t > T.ask + 0.1 ? F("wide", "o", "raised") : F("glare", "frown", "furious");
  const yf = t > T.ask - 0.1 ? F("open", t < T.pen + 0.3 ? "open" : "grin", "raised") : t > GIFT_GO.t0 ? F("open", "smile", "raised") : F("half", "grimace", "worried", { sweat: true });
  return [A(GRUMP, GR_P, GR_YAW, pg, gf), A(YOU, YOU_P, YOU_YAW, py, yf)];
};
const s5Gift = (t: number): V3 => {
  if (t < GIFT_BACK.t0) return lerpV(GIFT_YOU, GIFT_HER, smooth((t - GIFT_GO.t0) / (GIFT_GO.t1 - GIFT_GO.t0)));
  return lerpV(GIFT_HER, GIFT_YOU, smooth((t - GIFT_BACK.t0) / (GIFT_BACK.t1 - GIFT_BACK.t0)));
};
const s5: Scene = {
  id: 5, t0: T.next - 0.06, mood: "day", blur: 1.0, set: "office",
  cam: keyed([
    [T.next - 0.06, C(Oo(0.55, 1.65, 2.25), Oo(-0.05, 1.45, -1.45), 44)],
    [T.stand + 0.1, C(Oo(0.5, 1.62, 1.95), Oo(-0.05, 1.48, -1.45), 36), "inout"],
    [GIFT_GO.t0, C(Oo(0.5, 1.62, 1.93), Oo(-0.05, 1.48, -1.45), 36), "linear"],
    [GIFT_GO.t1, C(Oo(1.6, 1.5, 0.5), Oo(0.2, 0.8, -0.2), 48), "inout"],
    [GIFT_BACK.t1, C(Oo(1.65, 1.5, 0.6), Oo(0.2, 0.85, 0.3), 48), "inout"],
    [T.borrow2, C(Oo(1.75, 1.42, 0.2), Oo(0.0, 1.15, 0.0), 46), "inout"],
    [PEN_T.done + 0.1, C(Oo(1.7, 1.42, 0.2), HANDS_MEET, 44), "linear"],
    [PEN_T.done + 0.55, C(Oo(0.55, 1.58, 0.85), Oo(-0.05, 1.5, -1.45), 40), "inout"],
    [SECONDS, C(Oo(0.5, 1.58, 0.75), Oo(-0.05, 1.5, -1.45), 38), "linear"],
  ]),
  actors: s5Actors,
  extra: (t) => {
    const a = s5Actors(t);
    const pen: Prop = t < PEN_T.pick + 0.15 ? { p: PEN_DESK, r: [0, 0, PI / 2] } : t < PEN_T.done ? { p: add(handAt(a[0], "R"), [0, 0.01, 0]), r: [0, 0, PI / 2] } : { p: add(handAt(a[1], "R"), [0, 0.01, 0]), r: [0, 0, PI / 2] };
    return { gift: { p: s5Gift(t), r: [0, 0.4, 0] }, pen };
  },
  focus: (t) => (t < GIFT_GO.t0 ? headPosed(s5Actors(t)[0]) : t < T.ask ? s5Gift(t) : t < PEN_T.done + 0.3 ? HANDS_MEET : headPosed(s5Actors(t)[0])),
};

export const SCENES: Scene[] = [s1, s2, s3, s4, s5];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const FRANKLIN_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0), handOff: HAND_OFF, bookSlide: BOOK_SLIDE.t0, noteGive: NOTE_GIVE, shake: SHAKE.t0, clink: T.friend, coins: COINS_T.t0, giftGo: GIFT_GO.t0, giftBack: GIFT_BACK.t0, pen: PEN_T.give, msRun: MS_RUN.t0, msIn: MS_IN.t0, frIn: FR_IN.t0 });
export { FR_DESK, HALL_DOOR, LAB_DESK, LIB_DESK, LIB_DOOR };
