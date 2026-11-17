// The Biscuit short as DATA: 3 scenes, each one continuous camera (cuts only where the time or purpose changes).
//   A  a morning on the north street: a poster close-up, crane to a street full of posters, three neighbors puzzled
//      (bathrobe, coffee mug, newspaper man), the mug neighbor calls the number and melts at the little girl's voice.
//   B  overhead: the posters jump to a new street each morning, then the loop draws itself.
//   C  the north street, another day: the mail carrier sees an old golden retriever, who bumps the blue mailbox,
//      sits, gets a pat; close on his cloudy blind eyes and grey muzzle; he walks on, neighbors call his name, he
//      perks up and trots to Lily at her gate; the street waves "Hi, Biscuit" and the lens cranes up.
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { headOf } from "../inkbeat/char/Character3D";
import { lerp, lookAt, mixArm, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import { handWorld, solveArm } from "../inkbeat/core/ik";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { CARRIER, LILY, MUG, PAPER, ROBE } from "./cast";
import { CZ, LILY_GATE, MAILBOX } from "./world";
import type { DogState, TownState } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9':-]/g, "").replace(/[.,]$/, "");
export const W = (word: string, nth = 1) => {
  let k = 0;
  for (const [w, a] of WORDS) if (norm(w) === norm(word) && ++k === nth) return a;
  throw new Error(`word not found: ${word} #${nth}`);
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });

export const T = {
  morning: W("morning"), three: W("three"), posters: W("posters"), named: W("named"), biscuit1: W("biscuit"), nobody: W("nobody"),
  biscuit2: W("biscuit", 2), people: W("people"), called: W("called"), little: W("little"), voice: W("voice:"), please: W("please"),
  say: W("say"), him: W("him."), every: W("every"), moved: W("moved"), street: W("street"), always: W("always"), loop: W("loop"),
  then: W("then"), carrier: W("carrier"), saw: W("saw"), old: W("old"), golden: W("golden"), walking: W("walking"), bumping: W("bumping"),
  mailbox: W("mailbox"), biscuit3: W("biscuit", 3), lost: W("lost", 2), fourteen: W("fourteen"), blind: W("blind"), still: W("still"),
  walk: W("walk"), girl: W("girl"), route: W("route"), strangers: W("strangers"), say2: W("say", 2), follow: W("follow"), home: W("home"),
  now: W("now"), hi: W("hi"), biscuit4: W("biscuit", 4),
};

// ------------------------------------------------------------------ helpers
const ik = (spec: CharacterSpec, p: V3, yaw: number, side: "L" | "R", target: V3, lean = 0) => {
  const r = (v: number) => Math.round(v * 100) / 100;
  return solveArm({ position: [0, 0, 0], yaw: r(yaw), side, target: [r(target[0] - p[0]), r(target[1] - p[1]), r(target[2] - p[2])], height: spec.height, build: spec.build, base: { lean: Math.round(lean) } });
};
const hand = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, side: "L" | "R") => handWorld({ position: p, yaw, height: spec.height, build: spec.build, pose, side });
const yawTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const head = (spec: CharacterSpec, p: V3) => headOf(p, spec.height, spec.build);
const look = (spec: CharacterSpec, p: V3, yaw: number, target: V3) => {
  const l = lookAt(head(spec, p), target, yaw);
  return { headYaw: l.yaw, headNod: l.nod };
};
const C = (pos: V3, lk: V3, fov: number, roll = 0): Cam => ({ pos, look: lk, fov, roll });
type Ez = "inout" | "out" | "in" | "linear";
const keyed = (keys: [number, Cam, Ez?][]) => (t: number): Cam => {
  let c = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, ck, e] = keys[i];
    const [tp] = keys[i - 1];
    if (t <= tp) break;
    const u = clamp((t - tp) / (tk - tp));
    const x = e === "linear" ? u : e === "out" ? 1 - Math.pow(1 - u, 3) : e === "in" ? u * u * u : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    c = { pos: mix3(c.pos, ck.pos, x), look: mix3(c.look, ck.look, x), fov: lerp(c.fov, ck.fov, x), roll: lerp(c.roll ?? 0, ck.roll ?? 0, x) };
  }
  return c;
};
/** keep a keyed lens but aim at a smoothed moving subject with weight k(t) */
const follow = (path: (t: number) => Cam, aim: (t: number) => V3 | null, k: (t: number) => number) => (t: number): Cam => {
  const c = path(t);
  const u = k(t);
  const a0 = aim(t);
  if (!a0 || u <= 0) return c;
  let acc: V3 = [0, 0, 0];
  let ws = 0;
  for (let i = 0; i < 9; i++) {
    const ts = t - 0.3 + (i / 8) * 0.45;
    const p = aim(ts) ?? a0;
    const g = Math.exp(-((ts - t - 0.05) ** 2) / (2 * 0.12 ** 2));
    acc = add(acc, [p[0] * g, p[1] * g, p[2] * g]);
    ws += g;
  }
  return { ...c, look: mix3(c.look, [acc[0] / ws, acc[1] / ws, acc[2] / ws], u) };
};

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState };
export type Extra = {
  held?: { p: V3; ry: number; tilt?: number }[];
  phone?: { p: V3; ry: number; tilt?: number };
  mug?: V3;
  satchel?: { p: V3; ry: number };
};
export type Scene = {
  id: number;
  t0: number;
  mood: string;
  cam: (t: number) => Cam;
  actors: (t: number) => Actor[];
  dog?: (t: number) => DogState | null;
  town: (t: number) => TownState;
  extra?: (t: number) => Extra;
  focus: (t: number) => V3;
  blur: number;
  /** the overhead "DAY n" counter */
  day?: (t: number) => number | null;
};
const OFF = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });

// ================================================================== A. the morning: posters everywhere, nobody owns a Biscuit, the call
const POLE_POSTER: V3 = [-4.7, 1.55, 13.44];
const ROBE_P: V3 = [5.4, 0, 15.6];
const MUG_P: V3 = [6.4, 0, 15.6];
const PAPER_P: V3 = [7.4, 0, 15.6];
/** a hand holding a poster up to read: returns the arm pose and where the poster is */
const readPoster = (spec: CharacterSpec, p: V3, yaw: number, u: number, side: "L" | "R" = "R") => {
  const hp = head(spec, p);
  // held at chest height, well below the face, so the reader's face stays in view while they look down at it
  const tgt: V3 = [hp[0] + Math.sin(yaw) * 0.4 + Math.cos(yaw) * (side === "R" ? -0.06 : 0.06), hp[1] - 0.78, hp[2] + Math.cos(yaw) * 0.4];
  const k = ik(spec, p, yaw, side, tgt, 4);
  return { arm: mixArm([14, 8], k.arm, u), fwd: lerp(10, k.fwd, u) };
};
const robeA = (t: number) => {
  const yaw = PI - 0.25;
  const up = smooth((t - T.posters - 0.3) / 0.4);
  const r = readPoster(ROBE, ROBE_P, yaw, up);
  const scratch = window01(t, T.nobody - 0.1, T.biscuit2 + 0.6, 0.25, 0.3);
  const ks = ik(ROBE, ROBE_P, yaw, "L", add(head(ROBE, ROBE_P), [0.1, 0.16, -0.02]), 2);
  const pose: BodyPose = { lean: 4, armR: r.arm, armRFwd: r.fwd, armL: mixArm([14, 8], ks.arm, scratch), armLFwd: lerp(10, ks.fwd, scratch), headNod: 24 * up - 14 * scratch, headTilt: 14 * scratch };
  const face = t < T.posters + 0.3 ? F("half", "o", "neutral") : t < T.nobody ? F("squint", "flat", "raised") : F("wide", "wavy", "worried");
  const held = up > 0.2 ? { p: add(hand(ROBE, ROBE_P, yaw, pose, "R"), [0, 0.12, 0]), ry: yaw + PI, tilt: 0.05 } : undefined;
  return { a: OFF(ROBE, ROBE_P, yaw, pose, face), held };
};
const mugA = (t: number) => {
  const yaw = PI + 0.05;
  const shrug = window01(t, T.nobody + 0.2, T.people - 0.2, 0.2, 0.25);
  const call = smooth((t - T.called + 0.1) / 0.35);
  const melt = smooth((t - T.voice + 0.1) / 0.3);
  const chest = window01(t, T.please - 0.1, SECONDS, 0.3, 0.2);
  const hp = head(MUG, MUG_P);
  // the phone at her right ear (a character's right is -x when it faces +z)
  // on speaker: the phone held up in front of her face (it reads clearly; at the ear it would sink into the big toon head)
  const ear: V3 = [hp[0] + Math.sin(yaw) * 0.36 - Math.cos(yaw) * 0.05, hp[1] - 0.12, hp[2] + Math.cos(yaw) * 0.36 + Math.sin(yaw) * 0.05];
  const kp = ik(MUG, MUG_P, yaw, "R", ear, 2);
  const kc = ik(MUG, MUG_P, yaw, "L", add(MUG_P, [0.03, MUG.height * 0.68, -0.18]), 2);
  let pose: BodyPose = { lean: 2, armR: mixArm([40, 70], kp.arm, call), armRFwd: lerp(60, kp.fwd, call), armL: [40, 80], armLFwd: 70, headTilt: 12 * melt };
  if (shrug > 0) pose = { ...pose, armR: mixArm(pose.armR!, [60, 90], shrug), armRFwd: lerp(pose.armRFwd!, 20, shrug), headNod: -8 * shrug };
  if (chest > 0) pose = { ...pose, armL: mixArm([40, 80], kc.arm, chest), armLFwd: lerp(70, kc.fwd, chest) };
  const face =
    t < T.nobody ? F("open", "flat", "raised") :
    t < T.called ? F("half", "wavy", "raised") :
    t < T.voice - 0.1 ? F("open", "flat", "neutral") :
    t < T.please ? F("huge", "o", "worried") : F("sparkle", "smile", "worried", { flush: 0.4 });
  const phoneOn = call > 0.05 ? { p: add(hand(MUG, MUG_P, yaw, pose, "R"), [0, 0.08, 0]), ry: yaw, tilt: 0.1 } : undefined;
  const mug = add(hand(MUG, MUG_P, yaw, pose, "L"), [0, 0.04, 0]);
  return { a: OFF(MUG, MUG_P, yaw, pose, face), phone: phoneOn, mug: chest > 0.5 ? undefined : mug };
};
const paperA = (t: number) => {
  const yaw = PI + 0.3;
  const up = smooth((t - T.named) / 0.4);
  const r = readPoster(PAPER, PAPER_P, yaw, up, "L");
  const shake = window01(t, T.nobody + 0.3, T.people, 0.15, 0.2) * Math.sin(t * 14) * 22;
  const pose: BodyPose = { lean: 8, armL: r.arm, armLFwd: r.fwd, armR: [14, 8], armRFwd: 10, headYaw: shake, headNod: 24 };
  const face = t < T.nobody ? F("squint", "flat", "angry") : F("half", "frown", "raised");
  const held = up > 0.2 ? { p: add(hand(PAPER, PAPER_P, yaw, pose, "L"), [0, 0.12, 0]), ry: yaw + PI, tilt: -0.06 } : undefined;
  return { a: OFF(PAPER, PAPER_P, yaw, pose, face), held };
};
const SA: { id: number; t0: number } = { id: 1, t0: 0 };
const sceneA = {
  id: SA.id, t0: SA.t0, mood: "golden", blur: 1.3,
  cam: keyed([
    [0, C([-4.7, 1.52, 14.3], POLE_POSTER, 38)],
    [T.three + 0.3, C([-4.6, 1.58, 14.5], add(POLE_POSTER, [0, -0.02, 0]), 42), "inout"],
    [T.three + 1.0, C([-4.1, 2.6, 15.0], [3, 1.4, 14.2], 48), "inout"],
    [T.posters + 0.1, C([-2.6, 3.3, 11.4], [9, 1.0, 15.2], 50), "inout"],
    [T.biscuit1 + 0.25, C([ROBE_P[0] + 0.2, 1.55, 12.7], add(head(ROBE, ROBE_P), [0, -0.35, 0]), 44), "inout"],
    [T.nobody + 0.9, C([MUG_P[0] - 0.05, 1.6, 11.2], [MUG_P[0], 1.25, 15.6], 54), "inout"],
    [T.people + 0.2, C([MUG_P[0] + 0.15, 1.6, 12.7], add(head(MUG, MUG_P), [0, -0.3, 0]), 44), "inout"],
    [T.voice, C([MUG_P[0] + 0.1, 1.62, 13.85], add(head(MUG, MUG_P), [0, -0.12, 0]), 38), "inout"],
    [T.him + 0.5, C([MUG_P[0] + 0.1, 1.63, 14.0], add(head(MUG, MUG_P), [0, -0.1, 0]), 36)],
  ]),
  actors: (t: number) => [robeA(t).a, mugA(t).a, paperA(t).a],
  town: (t: number): TownState => ({ t, posters: -1 }),
  extra: (t: number): Extra => {
    const r = robeA(t);
    const m = mugA(t);
    const p = paperA(t);
    return { held: [r.held, p.held].filter(Boolean) as { p: V3; ry: number; tilt?: number }[], phone: m.phone, mug: m.mug };
  },
  focus: (t: number) => (t < T.three + 0.9 ? POLE_POSTER : t < T.nobody ? head(ROBE, ROBE_P) : head(MUG, MUG_P)),
};

// ================================================================== B. overhead: a new street every morning, the long loop
const sceneB = {
  id: 2, t0: T.every - 0.08, mood: "day", blur: 0,
  cam: keyed([
    [T.every - 0.08, C([0, 78, 26], [0, 0, 0.5], 40, 90)],
    [T.loop + 0.8, C([0, 66, 22], [0, 0, 0.5], 40, 90), "inout"],
  ]),
  actors: () => [],
  town: (t: number): TownState => {
    const day = 1 + clamp((t - T.every) / (T.always - T.every)) * 3.999;
    return { t, posters: 0, overhead: { day, route: smooth((t - T.always + 0.1) / (T.loop - T.always + 0.5)) } };
  },
  day: (t: number) => 1 + Math.floor(clamp((t - T.every) / (T.always - T.every)) * 3.999),
  focus: () => [0, 0, 0] as V3,
};

// ================================================================== C. the carrier, the mailbox, the walk home, "Hi, Biscuit"
const DOG_ROUTE: WalkSeg[] = [
  { t0: T.then - 0.1, t1: T.mailbox + 0.05, from: [MAILBOX[0] + 5.7, 0, CZ], to: [MAILBOX[0] + 0.78, 0, CZ] },
];
const BUMP = T.mailbox + 0.05;
const AROUND: WalkSeg[] = [
  // around the mailbox through the gap between it and the lamppost (z 13.8: 0.45 m from the pole, 0.3 m from the box)
  { t0: T.walk - 0.4, t1: T.walk + 0.4, from: [MAILBOX[0] + 0.78, 0, CZ], to: [MAILBOX[0] + 0.75, 0, 13.8] },
  { t0: T.walk + 0.4, t1: T.girl + 0.1, from: [MAILBOX[0] + 0.75, 0, 13.8], to: [MAILBOX[0] - 0.9, 0, 13.8] },
  // the trot home: faster once the neighbors call his name
  { t0: T.girl + 0.1, t1: T.home - 0.05, from: [MAILBOX[0] - 0.9, 0, 13.8], to: [LILY_GATE[0] + 0.85, 0, LILY_GATE[2] - 0.85] },
];
const dogStride = 0.42;
const dogWalk = (segs: WalkSeg[], rest: V3, t: number) => {
  let p = rest;
  for (const s of segs) {
    if (t < s.t0) break;
    const u = clamp((t - s.t0) / (s.t1 - s.t0));
    p = mix3(s.from, s.to, u);
    if (t < s.t1) {
      const D = Math.hypot(s.to[0] - s.from[0], s.to[2] - s.from[2]);
      return { p, walk: (PI * D * u) / dogStride, seg: s };
    }
  }
  return { p, walk: undefined as number | undefined, seg: null as WalkSeg | null };
};
const VOICES = () => [
  { who: "mug", at: T.strangers - 0.1, p: [1.2, 0, 15.72] as V3 },
  { who: "robe", at: T.say2 - 0.05, p: [0.0, 0, 15.72] as V3 },
  { who: "paper", at: T.follow - 0.1, p: [-1.5, 0, 15.72] as V3 },
];
export const dogC = (t: number): DogState => {
  const a = dogWalk(DOG_ROUTE, DOG_ROUTE[0].from, t);
  const b = dogWalk(AROUND, AROUND[0].from, t);
  const after = t >= AROUND[0].t0;
  const w = after ? b : a;
  let p = w.p;
  let yaw = -PI / 2;
  if (w.seg) yaw = yawTo(w.seg.from, w.seg.to);
  // after the bump: knocked back a step, sits, turns his face toward the road (and the lens)
  const bonk = window01(t, BUMP - 0.02, BUMP + 0.7, 0.04, 0.4);
  const back = window01(t, BUMP, T.walk - 0.4, 0.15, 0.3) * 0.12;
  if (!after && t > BUMP) p = add(p, [back, 0, 0]);
  const sit = window01(t, BUMP + 0.35, T.walk - 0.35, 0.4, 0.35);
  const turn = window01(t, T.lost - 0.2, T.walk - 0.3, 0.5, 0.4);
  // he turns toward the road (clear of the lamppost) so his face, cloudy eyes and grey muzzle read
  if (!w.seg && !after) yaw = -PI / 2 - 1.87 * turn;
  // home: he settles beside Lily facing the street (his head angled toward her), so her face stays in view in the hug
  if (after && w.seg === null) yaw = lerp(yawTo(AROUND[2].from, AROUND[2].to), PI + 0.6, smooth((t - AROUND[2].t1) / 0.5));
  // ears perk at each voice, the head turns toward it; the tail wags harder and harder
  let ears = 0;
  let headYaw = 0;
  for (const v of VOICES()) {
    const k = window01(t, v.at, v.at + 0.9, 0.08, 0.4);
    if (k > 0) {
      ears = Math.max(ears, k);
      const rel = Math.atan2(v.p[0] - p[0], v.p[2] - p[2]) - yaw;
      headYaw += clamp(Math.atan2(Math.sin(rel), Math.cos(rel)), -0.9, 0.9) * k;
    }
  }
  const home = smooth((t - T.home + 0.3) / 0.4);
  ears = Math.max(ears, 0.6 * home);
  const wag = clamp(0.25 + 0.4 * smooth((t - T.strangers) / 0.5) + 0.35 * home);
  const sniff = w.walk !== undefined && t < T.girl ? 0.08 * Math.sin(t * 7) : 0;
  return {
    p, yaw, walk: w.walk, headYaw: headYaw + (sit > 0.5 ? 0.15 * Math.sin(t * 1.1) : 0), headTilt: 0.25 * window01(t, BUMP + 0.6, BUMP + 1.6, 0.2, 0.3) * Math.sin(t * 10),
    headNod: 0.18 * sit - 0.12 * turn + sniff - 0.2 * home, ears, wag: t < BUMP + 0.6 ? 0.25 : wag, sit, bonk, mouth: Math.max(0.6 * home, 0.5 * window01(t, T.still, T.walk, 0.3, 0.3)),
    closed: home > 0.5 && t > T.now, t,
  };
};
const CAR_IN: WalkSeg = { t0: T.then - 0.1, t1: T.saw - 0.05, from: [MAILBOX[0] - 4.2, 0, 14.55], to: [MAILBOX[0] - 2.2, 0, 14.55] };
const CAR_TO: WalkSeg = { t0: BUMP + 0.5, t1: T.biscuit3 + 0.6, from: [MAILBOX[0] - 2.2, 0, 14.55], to: [MAILBOX[0] + 0.55, 0, 14.95] };
const carrierC = (t: number) => {
  const w = walkAt([CAR_IN, CAR_TO], CAR_IN.from, t, CARRIER.height);
  const p = w.p;
  const d = dogC(t);
  let yaw = PI / 2;
  if (t > T.saw - 0.1) yaw = yawTo(p, d.p);
  if (t > T.home - 0.5) yaw = yawTo(p, LILY_GATE);
  const surprised = window01(t, T.saw, BUMP + 0.4, 0.1, 0.3);
  const ouch = window01(t, BUMP, BUMP + 1.0, 0.05, 0.4);
  const pet = window01(t, T.lost - 0.1, T.walk - 0.3, 0.35, 0.35);
  const wave = window01(t, T.hi - 0.35, SECONDS, 0.25, 0.2);
  const lean = 32 * pet;
  const kp = ik(CARRIER, p, yaw, "R", add(d.p, [0, 1.0 + 0.04 * Math.sin(t * 6), 0.12]), lean);
  let pose: BodyPose = { walk: w.walk, lean, armR: mixArm([16, 10], kp.arm, pet), armRFwd: lerp(10, kp.fwd, pet), armL: [22, 14], armLFwd: 10, headNod: 20 * pet };
  if (ouch > 0) pose = { ...pose, armL: mixArm([22, 14], [60, 120], ouch), armLFwd: lerp(10, 70, ouch) };
  if (wave > 0) pose = { ...pose, armL: mixArm([22, 14], [150, 150], wave), armLFwd: lerp(10, 10, wave) };
  pose = { ...pose, ...(pet > 0.3 ? {} : look(CARRIER, p, yaw, add(d.p, [0, 0.8, 0]))) };
  const face =
    t < T.saw ? F("half", "smile", "neutral") :
    t < BUMP ? F("wide", "o", "raised") :
    t < T.biscuit3 ? F("squint", "grimace", "worried") :
    t < T.walk ? F("sparkle", "smile", "worried", { flush: 0.3 }) : F("open", "grin", "raised");
  void surprised;
  const hip = add(p, [Math.cos(yaw) * -0.32, 0.88, -Math.sin(yaw) * -0.32]);
  return { a: OFF(CARRIER, p, yaw, pose, face), satchel: { p: hip, ry: yaw } };
};
const neighborC = (spec: CharacterSpec, p: V3, at: number, t: number): Actor => {
  const d = dogC(t);
  const yaw = t < at - 1.2 ? PI : yawTo(p, d.p);
  const call = window01(t, at - 0.1, at + 0.6, 0.12, 0.3);
  const wave = window01(t, T.hi - 0.35, SECONDS, 0.2, 0.2);
  const cup = ik(spec, p, yaw, "R", add(head(spec, p), [Math.sin(yaw) * 0.14 + Math.cos(yaw) * -0.06, -0.06, Math.cos(yaw) * 0.14]), 6);
  let pose: BodyPose = { lean: 6 + 8 * call, armR: mixArm([16, 10], cup.arm, call), armRFwd: lerp(10, cup.fwd, call), armL: [16, 10], armLFwd: 10, ...look(spec, p, yaw, add(d.p, [0, 0.7, 0])) };
  if (wave > 0) pose = { ...pose, armR: mixArm(pose.armR!, [150, 150], wave), armRFwd: lerp(pose.armRFwd!, 10, wave) };
  const face = call > 0.3 ? F("wide", "yell", "high") : wave > 0.3 ? F("closed", "grin", "raised", { flush: 0.3 }) : t > at ? F("sparkle", "smile", "raised") : F("open", "smile", "neutral");
  return OFF(spec, p, yaw, pose, face);
};
const LILY_P: V3 = [LILY_GATE[0], 0, LILY_GATE[2] - 0.35];
const lilyC = (t: number): Actor => {
  const d = dogC(t);
  const yaw = yawTo(LILY_P, d.p);
  const call = window01(t, T.follow + 0.2, T.home, 0.15, 0.2);
  const hug = smooth((t - T.home + 0.15) / 0.35);
  const kL = ik(LILY, LILY_P, yaw, "L", add(d.p, [0.12, 0.85, 0.1]), 18);
  const kR = ik(LILY, LILY_P, yaw, "R", add(d.p, [-0.12, 0.85, 0.1]), 18);
  let pose: BodyPose = { lean: 4 + 10 * hug, armL: mixArm([20, 12], [70, 60], call), armLFwd: lerp(10, 60, call), armR: mixArm([20, 12], [70, 60], call), armRFwd: lerp(10, 60, call) };
  if (hug > 0) pose = { ...pose, armL: mixArm(pose.armL!, kL.arm, hug), armLFwd: lerp(pose.armLFwd!, kL.fwd, hug), armR: mixArm(pose.armR!, kR.arm, hug), armRFwd: lerp(pose.armRFwd!, kR.fwd, hug) };
  // in the hug she turns her face out toward the lens, cheek against his head
  const lk = look(LILY, LILY_P, yaw, add(d.p, [0, 0.8, 0]));
  pose = { ...pose, headYaw: lerp(lk.headYaw, -45, hug), headNod: lerp(lk.headNod, 8, hug), headTilt: 14 * hug, headStretch: 1 + 0.1 * window01(t, T.home - 0.2, T.home + 0.4, 0.08, 0.3) };
  const face = t < T.follow ? F("open", "flat", "worried") : t < T.home - 0.2 ? F("huge", "grin", "high") : F("closed", "beam", "raised", { flush: 0.5 });
  return OFF(LILY, LILY_P, yaw, pose, face);
};
const dogHead = (t: number): V3 => {
  const d = dogC(t);
  return [d.p[0] + Math.sin(d.yaw) * 0.45, 0.85 + 0.18 * d.sit, d.p[2] + Math.cos(d.yaw) * 0.45];
};
const sceneC = {
  id: 3, t0: T.then - 0.08, mood: "day", blur: 1.2,
  cam: follow(
    keyed([
      [T.then - 0.08, C([2.9, 1.6, 12.3], [0.8, 1.4, 15.0], 46)],
      [T.saw + 0.1, C([2.9, 1.55, 12.4], [2.1, 1.4, 14.9], 46), "inout"],
      [T.old, C([MAILBOX[0] + 0.5, 1.25, 12.0], [MAILBOX[0] + 3.5, 0.7, CZ], 44), "inout"],
      [T.walking + 0.2, C([MAILBOX[0] + 2.4, 1.25, 11.2], [MAILBOX[0] + 2.0, 0.65, CZ], 44), "inout"],
      [T.bumping, C([MAILBOX[0] - 0.6, 0.9, 12.6], [MAILBOX[0] + 0.6, 0.75, CZ], 42), "inout"],
      [T.biscuit3, C([MAILBOX[0] - 0.6, 0.9, 12.6], [MAILBOX[0] + 0.65, 0.8, CZ], 42)],
      [T.lost + 0.4, C([MAILBOX[0] + 0.8, 1.3, 11.6], [MAILBOX[0] + 0.7, 0.85, 14.5], 46), "inout"],
      [T.fourteen + 0.2, C([MAILBOX[0] + 1.45, 1.0, 12.45], [MAILBOX[0] + 1.0, 0.88, 13.77], 46), "inout"],
      [T.still, C([MAILBOX[0] + 1.42, 1.0, 12.45], [MAILBOX[0] + 1.0, 0.88, 13.77], 46)],
      [T.walk, C([MAILBOX[0] + 1.6, 1.3, 11.3], [MAILBOX[0] + 0.3, 0.7, 13.7], 46), "inout"],
      // a low lens on the sidewalk itself, leading him as he trots toward it (no lamppost between them)
      // a road-side track alongside him as he trots home past the neighbors
      [T.girl, C([5.4, 1.35, 11.7], [4.0, 0.75, 13.9], 52), "inout"],
      [T.strangers + 0.2, C([1.6, 1.35, 11.6], [0.9, 0.8, 14.6], 50), "inout"],
      [T.say2 + 0.4, C([0.0, 1.35, 11.7], [-0.4, 0.85, 14.8], 50), "inout"],
      [T.follow + 0.4, C([-1.8, 1.3, 11.9], [-2.0, 0.85, 15.0], 50), "inout"],
      [T.home + 0.3, C([-3.95, 1.1, 13.45], [-3.0, 0.9, 15.4], 52), "inout"],
      [T.now + 0.1, C([-3.95, 1.12, 13.4], [-3.0, 0.9, 15.4], 52)],
      [T.hi + 0.2, C([-1.4, 2.6, 10.6], [-2.4, 0.9, 15.2], 50), "inout"],
      [SECONDS, C([0.2, 4.4, 8.9], [-1.4, 1.0, 15.2], 52), "inout"],
    ]),
    (t) => (t > T.old - 0.2 && t < T.home + 0.2 ? dogHead(t) : null),
    (t) => 0.75 * window01(t, T.old - 0.1, T.home, 0.4, 0.4) * (1 - window01(t, T.fourteen, T.still + 0.1, 0.2, 0.2)),
  ),
  actors: (t: number) => [carrierC(t).a, lilyC(t), neighborC(MUG, VOICES()[0].p, VOICES()[0].at, t), neighborC(ROBE, VOICES()[1].p, VOICES()[1].at, t), neighborC(PAPER, VOICES()[2].p, VOICES()[2].at, t)],
  dog: dogC,
  town: (t: number): TownState => ({ t, posters: -1 }),
  extra: (t: number): Extra => ({ satchel: carrierC(t).satchel }),
  focus: (t: number) => (t < T.old - 0.1 ? head(CARRIER, carrierC(t).a.p) : dogHead(t)),
};

export const SCENES: Scene[] = [sceneA as Scene, sceneB as Scene, sceneC as Scene];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const BISCUIT_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0), bump: BUMP, voices: VOICES().map((v) => v.at), dogRoute: [...DOG_ROUTE, ...AROUND], carrier: [CAR_IN, CAR_TO] });
