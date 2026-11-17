// The Kentucky meat shower as DATA: 17 setups anchored to words of the voice. Every actor is acted with the toolkit in
// inkbeat/anim/acting.ts: keyed body tracks with anticipation and overshoot, walks/runs whose feet land, squash and
// stretch, hands solved onto real targets (the paddle, an open palm, a chunk to the mouth, the glass), and heads that
// follow the action. Props that are held follow the hand (handWorld). Everything is a pure function of t.
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { headOf } from "../inkbeat/char/Character3D";
import { CAST } from "../inkbeat/char/cast";
import { lerp, lookAt, mixArm, squash, step, track, trackV, walkAt, window01 } from "../inkbeat/anim/acting";
import type { K, WalkSeg } from "../inkbeat/anim/acting";
import { handWorld, solveArm } from "../inkbeat/core/ik";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { MAN1, MAN2, SCI1, SCI2, WOMAN } from "./cast";
import { BENCH, BENCH_TOP, CALENDAR, CASE, h1, KETTLE, KETTLE_RIM, LAB_DESK_Y } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
const G = 9.8;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export const W = (word: string, nth = 1) => {
  let k = 0;
  for (const [w, a] of WORDS) if (norm(w) === norm(word) && ++k === nth) return a;
  throw new Error(`word not found: ${word} #${nth}`);
};
const C = (pos: V3, look: V3, fov: number): Cam => ({ pos, look, fov, roll: 0 });
const q = (t: number, hz = 15) => Math.round(t * hz) / hz;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState; sc?: V3 };
export type Prop = { kind: "chunk" | "paddle" | "jar" | "magnifier"; p: V3; q?: V3; s?: number; seed?: number; splat?: number; rot?: number };
export type Bird = { p: V3; yaw: number; flap: number; bank?: number; lunge?: number; s?: number };
export type Hen = { p: V3; yaw: number; peck: number; hop?: number; flap?: number };
export type Key = { at: number; cam: Cam; dur?: number };
export type Setup = {
  id: number;
  t0: number;
  mood: string;
  set: "farm" | "lab" | "museum";
  keys: Key[];
  actors: (t: number) => Actor[];
  props?: (t: number) => Prop[];
  focus: V3;
  blur: number;
  whip?: boolean;
  shake?: number[];
  sky?: boolean;
  /** the camera rides along (added to pos and look) */
  follow?: (t: number) => V3;
  lab?: (t: number) => { jarLung: number; jarMuscle: number; jarCart: number };
};

// faces
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });
const HUM = F("half", "smile", "neutral");
const SHOCK = F("wide", "o", "raised");
const GROSS = F("squint", "frown", "worried", { flush: 0.5 });
const PANIC = F("wide", "yell", "worried", { sweat: true });
const SURE = F("half", "smirk", "raised");
const NOPE = F("squint", "smirk", "angry");
const CHEW1 = F("half", "flat", "neutral");
const CHEW2 = F("half", "o", "neutral");
const FOCUS = F("squint", "flat", "angry");
const EUREKA = F("wide", "grin", "raised");
const CURIOUS = F("open", "smile", "raised");

// ------------------------------------------------------------------ times
const T = {
  woman: W("woman"), sky: W("sky") - 0.07, clear: W("clear"), then: W("then"), rain: W("rain..."), meat: W("meat."), chunks: W("chunks"),
  some: W("some"), palm: W("palm,"), fall: W("fall"), several: W("several"), its: W("it's"), y1876: W("1876."), neighbors: W("neighbors"),
  two: W("two"), obvious: W("obvious"), taste: W("taste"), mutton: W("mutton,"), venison: W("venison,"), scientists: W("scientists"),
  samples: W("samples."), one2: W("one", 2), lung: W("lung"), another: W("another"), muscle: W("muscle"), cartilage: W("cartilage."),
  best: W("best") - 0.07, flock: W("flock"), threw: W("threw"), vultures2: W("vultures", 2), vomit: W("vomit"), fly: W("fly"),
  and_when: W("and", 4), one4: W("one", 3), rest: W("rest"), chunk2: W("chunk") - 0.19, display: W("display"), county: W("county."),
};
const at = (w: number) => w - 0.2;

// ------------------------------------------------------------------ IK helpers
const ik = (spec: CharacterSpec, p: V3, yaw: number, side: "L" | "R", target: V3, lean = 0) => {
  const r = (v: number) => Math.round(v * 100) / 100;
  return solveArm({ position: [0, 0, 0], yaw: r(yaw), side, target: [r(target[0] - p[0]), r(target[1] - p[1]), r(target[2] - p[2])], height: spec.height, build: spec.build, base: { lean: Math.round(lean) } });
};
const hand = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, side: "L" | "R"): V3 => handWorld({ position: p, yaw, height: spec.height, build: spec.build, pose, side });
const mouthOf = (spec: CharacterSpec, p: V3, yaw: number): V3 => {
  const h = headOf(p, spec.height, spec.build);
  return [h[0] + Math.sin(yaw) * 0.16 * spec.height, h[1] - 0.07 * spec.height, h[2] + Math.cos(yaw) * 0.16 * spec.height];
};

// ------------------------------------------------------------------ the woman across the farm setups
const W_P: V3 = [0, 0, 0];
const PORCH: V3 = [0.7, 0.18, -2.6];
const W_WALKS: WalkSeg[] = [{ t0: T.fall + 0.35, t1: T.fall + 1.9, from: W_P, to: PORCH, ease: "linear" }];
const stirAt = (t: number) => {
  const a = t * 2.3;
  const top: V3 = [KETTLE[0] + 0.07 * Math.cos(a), 1.2, KETTLE[2] - 0.38 + 0.06 * Math.sin(a)];
  const blade: V3 = [KETTLE[0] + 0.2 * Math.cos(a + 0.4), KETTLE_RIM - 0.25, KETTLE[2] + 0.2 * Math.sin(a + 0.4)];
  return { top, blade };
};
/** the paddle: in her hands while she stirs, then left leaning in the kettle */
const paddleAt = (t: number): Prop => {
  if (t < T.meat) {
    const s = stirAt(t);
    return { kind: "paddle", p: s.blade, q: add(s.top, [0, 0.12, -0.04]) };
  }
  return { kind: "paddle", p: [KETTLE[0] + 0.12, KETTLE_RIM - 0.25, KETTLE[2]], q: [KETTLE[0] + 0.32, 1.4, KETTLE[2] - 0.32] };
};
const W_LEAN: K<number>[] = [[0, 4], [T.meat - 0.05, 4], [T.meat + 0.04, -14, "out"], [T.meat + 0.5, -4, "back"], [T.some, 0], [T.palm, 4, "out"], [T.fall, 0], [T.fall + 0.25, 16, "out"], [T.fall + 1.9, 14], [T.fall + 2.2, 0, "inout"]];
const W_SQUASH: K<number>[] = [[0, 1], [T.meat - 0.06, 1], [T.meat, 0.9, "out"], [T.meat + 0.12, 1.08, "out"], [T.meat + 0.4, 1, "back"], [T.palm, 1], [T.palm + 0.06, 0.94, "out"], [T.palm + 0.3, 1, "back"], [T.fall + 0.1, 1], [T.fall + 0.3, 0.9, "out"]];
const W_HOP: K<number>[] = [[0, 0], [T.meat + 0.02, 0], [T.meat + 0.16, 0.16, "out"], [T.meat + 0.32, 0, "in"]];
const W_YAW: K<number>[] = [[0, 0.15], [T.meat, 0.15], [T.chunks + 0.2, 0.5, "inout"], [T.some - 0.2, 0.35, "inout"], [T.fall + 0.3, 0.35], [T.fall + 0.55, PI - 0.25, "inout"], [T.its, PI - 0.25], [T.its + 0.3, -0.35, "inout"]];
const W_FACE: [number, FaceState][] = [[0, HUM], [T.sky, CURIOUS], [T.then + 0.3, F("open", "flat", "raised")], [T.meat - 0.05, SHOCK], [T.chunks + 0.4, F("wide", "frown", "worried")], [T.some, F("open", "flat", "raised")], [T.palm + 0.02, GROSS], [T.fall + 0.1, PANIC], [T.its + 0.3, GROSS]];
const PALM_POSE: BodyPose = { armR: [72, 12], armRFwd: 82, lean: 4 };
const palmHand = (): V3 => hand(WOMAN, W_P, 0.35, PALM_POSE, "R");
const womanAt = (t: number): Actor => {
  const walk = walkAt(W_WALKS, t < T.fall ? W_P : PORCH, t, WOMAN.height);
  const p: V3 = [walk.p[0], walk.p[1] + track(W_HOP, t), walk.p[2]];
  const yaw = track(W_YAW, t);
  const lean = track(W_LEAN, t);
  let armL: [number, number] = [12, 0];
  let armR: [number, number] = [12, 0];
  let fwdL = 0;
  let fwdR = 0;
  let headNod = 0;
  let headYaw = 0;
  if (t < T.meat) {
    // stirring: both hands on the paddle; at "sky" the left hand comes up to shade the eyes and she looks up
    const s = stirAt(t);
    const r = ik(WOMAN, p, yaw, "R", s.top, lean);
    const l = ik(WOMAN, p, yaw, "L", mix3(s.top, s.blade, 0.32), lean);
    armR = r.arm;
    fwdR = r.fwd;
    armL = l.arm;
    fwdL = l.fwd;
    const up = window01(t, T.sky, T.then + 0.4, 0.35, 0.3);
    armL = mixArm(armL, [150, 125], up);
    fwdL = lerp(fwdL, 75, up);
    headNod = lerp(16, -28, up);
    if (t > T.then + 0.4) headNod = lerp(16, -18, smooth((t - T.then - 0.4) / 0.6)); // she hears something above
  } else if (t < T.some) {
    // startled: arms fly up, then she looks around at the falling chunks
    armL = trackV([[T.meat, [20, 20]], [T.meat + 0.12, [150, 30], "back"], [T.meat + 0.6, [110, 70]], [T.chunks + 0.4, [50, 90]]], t);
    armR = trackV([[T.meat, [20, 20]], [T.meat + 0.12, [150, 30], "back"], [T.meat + 0.6, [110, 70]], [T.chunks + 0.4, [50, 90]]], t);
    fwdL = 40;
    fwdR = 40;
    headYaw = t > T.chunks ? 30 * Math.sin((t - T.chunks) * 2.4) : 0;
    headNod = -15;
  } else if (t < T.fall + 0.1) {
    // she holds out her palm like checking for rain; a chunk lands in it
    const u = smooth((t - T.some) / 0.35);
    armR = mixArm([50, 90], PALM_POSE.armR!, u);
    fwdR = lerp(40, PALM_POSE.armRFwd!, u);
    armL = [30, 40];
    fwdL = 30;
    const hd = lookAt(headOf(p, WOMAN.height, WOMAN.build), palmHand(), yaw);
    headYaw = hd.yaw;
    headNod = hd.nod;
  } else {
    // she flings it away, covers her head and runs for the porch
    const fling = smooth((t - T.fall - 0.05) / 0.15);
    armR = mixArm(PALM_POSE.armR!, [150, 135], fling);
    fwdR = lerp(PALM_POSE.armRFwd!, 35, fling);
    armL = mixArm([30, 40], [150, 135], smooth((t - T.fall) / 0.25));
    fwdL = 35;
    headNod = 14;
    if (t > T.its + 0.3) {
      // on the porch: peeks out, hand over her mouth
      armL = [12, 0];
      fwdL = 0;
      armR = [95, 125];
      fwdR = 70;
      headNod = 4;
    }
  }
  const pose: BodyPose = { walk: walk.walk, lean, armL, armR, armLFwd: fwdL, armRFwd: fwdR, headNod, headYaw: headYaw + -14 * (yaw - track(W_YAW, Math.max(0, t - 0.15))), bob: t > T.fall && t < T.fall + 1.9 ? 0 : 2 * Math.sin(q(t) * 2.3) };
  return { spec: WOMAN, p, yaw, pose, face: step(W_FACE, t), sc: squash(track(W_SQUASH, t)) };
};

// ------------------------------------------------------------------ the meat rain
type Drop = { t0: number; land: V3; s: number; seed: number };
const inYardFree = (x: number, z: number) => {
  if (Math.hypot(x - KETTLE[0], z - KETTLE[2]) < 0.75) return false;
  if (Math.abs(x) < 1.0 && z > -3.0 && z < 0.7) return false; // the woman and her run to the porch
  if (z < -1.7 && Math.abs(x) < 3.9) return false; // the porch and the cabin
  if (x < -1.0 && z > 0.2 && z < 2.3) return false; // the men's path and the bench
  if (Math.hypot(x - 3.4, z + 1.4) < 1.0) return false; // the well
  if (x < -3.2 && z < 0.2 && z > -1.2) return false; // the woodpile
  return true;
};
const DROPS: Drop[] = (() => {
  const out: Drop[] = [];
  let i = 0;
  while (out.length < 70 && i < 600) {
    i++;
    const x = -6 + h1(i * 3.1) * 12;
    const z = -3 + h1(i * 7.7) * 8;
    if (!inYardFree(x, z)) continue;
    const t0 = T.chunks - 0.6 + h1(i * 1.3) * (T.its - T.chunks + 0.4);
    out.push({ t0, land: [x, 0.03, z], s: 0.8 + h1(i * 2.9) * 0.9, seed: i });
  }
  return out;
})();
const FALL_H = 11;
const FALL_T = Math.sqrt((2 * FALL_H) / G);
const dropAt = (d: Drop, t: number): Prop | null => {
  const u = t - d.t0;
  if (u < 0) return null;
  if (u < FALL_T) return { kind: "chunk", p: [d.land[0], d.land[1] + FALL_H - 0.5 * G * u * u, d.land[2]], s: d.s, seed: d.seed, rot: u * 6 };
  return { kind: "chunk", p: d.land, s: d.s, seed: d.seed, splat: clamp((u - FALL_T) / 0.06) };
};
/** the special chunks: one into the soap on "meat", one into her palm, one onto the calendar, two onto the bench */
const SOAP_CHUNK: V3 = [KETTLE[0] - 0.08, KETTLE_RIM - 0.07, KETTLE[2] + 0.05];
const fallTo = (target: V3, tLand: number, t: number, seed: number, s = 1.1, from = 5.0): Prop | null => {
  const t0 = tLand - Math.sqrt((2 * from) / G);
  if (t < t0) return null;
  if (t < tLand) {
    const u = t - t0;
    return { kind: "chunk", p: [target[0], target[1] + from - 0.5 * G * u * u, target[2]], s, seed, rot: u * 5 };
  }
  return null;
};
const BENCH_CHUNKS: V3[] = [[BENCH[0] - 0.35, BENCH_TOP + 0.04, BENCH[2] - 0.05], [BENCH[0] + 0.25, BENCH_TOP + 0.04, BENCH[2] - 0.08]];
const farmMeat = (t: number, opts: { taken?: boolean[] } = {}): Prop[] => {
  const out: Prop[] = [];
  for (const d of DROPS) {
    const p = dropAt(d, t);
    if (p) out.push(p);
  }
  out.push(fallTo(SOAP_CHUNK, T.meat, t, 101, 1.2, 4.5) ?? (t >= T.meat ? { kind: "chunk", p: SOAP_CHUNK, s: 1.2, seed: 101, splat: 0.5 } : ({} as Prop)));
  out.push(fallTo(add(CALENDAR, [0.2, -0.3, 0.42]), T.y1876 - 0.1, t, 102, 0.9, 3.0) ?? (t >= T.y1876 - 0.1 ? { kind: "chunk", p: add(CALENDAR, [0.2, -0.3, 0.42]), s: 0.9, seed: 102, splat: 0.7, rot: 1.4 } : ({} as Prop)));
  BENCH_CHUNKS.forEach((c, k) => {
    if (opts.taken?.[k]) return;
    out.push(fallTo(c, T.fall + 0.4 + k * 0.3, t, 110 + k, 1.0, 5) ?? (t >= T.fall + 0.4 + k * 0.3 ? { kind: "chunk", p: c, s: 1.0, seed: 110 + k, splat: 0.3 } : ({} as Prop)));
  });
  return out.filter((p) => p && p.kind);
};
/** the palm chunk: falls into her open hand on "palm", is flung away on "fall" */
const palmChunk = (t: number): Prop | null => {
  const hnd = add(palmHand(), [0.02, 0.07, 0.02]);
  const f = fallTo(hnd, T.palm, t, 120, 1.25, 3.5);
  if (f) return f;
  if (t < T.palm) return null;
  if (t < T.fall + 0.1) return { kind: "chunk", p: hnd, s: 1.25, seed: 120, splat: 0.25 };
  const u = t - T.fall - 0.1;
  const p: V3 = [hnd[0] + 3.4 * u, hnd[1] + 3.0 * u - 0.5 * G * u * u, hnd[2] + 1.2 * u];
  if (p[1] < 0.03) return { kind: "chunk", p: [p[0], 0.03, p[2]], s: 1.25, seed: 120, splat: 1 };
  return { kind: "chunk", p, s: 1.25, seed: 120, rot: u * 9 };
};

// ------------------------------------------------------------------ chickens
const HENS = [
  { p: [1.6, 0, 2.2] as V3, yaw: 0.6, run: [2.9, 0, 3.6] as V3 },
  { p: [-0.9, 0, 3.2] as V3, yaw: 2.4, run: [-0.4, 0, 4.4] as V3 },
  { p: [2.6, 0, 0.6] as V3, yaw: -1.2, run: [4.6, 0, 1.2] as V3 },
];
export const hensAt = (t: number): Hen[] =>
  HENS.map((h, i) => {
    const scared = window01(t, T.meat - 0.05, T.neighbors - 0.5, 0.1, 0.6);
    const run = smooth((t - T.meat - 0.1 * i) / 1.2);
    const p = mix3(h.p, h.run, run);
    const pk = Math.max(0, Math.sin(q(t) * 2 * PI * 0.9 + i * 2.1));
    return { p, yaw: h.yaw + run * 0.6, peck: (1 - scared) * pk * pk, hop: scared * 0.12 * Math.abs(Math.sin(q(t) * PI * 3.4 + i)), flap: scared * Math.abs(Math.sin(q(t) * PI * 3.8 + i)) };
  });

// ------------------------------------------------------------------ the neighbors
const M1_P: V3 = [BENCH[0] - 0.45, 0, BENCH[2] - 0.62];
const M2_P: V3 = [BENCH[0] + 0.45, 0, BENCH[2] - 0.62];
const RUN_FROM1: V3 = [-9.5, 0, 1.6];
const RUN_FROM2: V3 = [-10.7, 0, 1.2];
const runMen: WalkSeg[][] = [
  [{ t0: T.neighbors - 0.25, t1: T.two + 0.05, from: RUN_FROM1, to: [-4.0, 0, 1.25], ease: "linear" }],
  [{ t0: T.neighbors - 0.15, t1: T.two + 0.1, from: RUN_FROM2, to: [-5.0, 0, 0.95], ease: "linear" }],
];
/** a man at the bench: looks at his friend, picks up his chunk, takes a bite, chews; then delivers his verdict */
const tasterAt = (spec: CharacterSpec, k: 0 | 1, t: number): { actor: Actor; chunk: Prop | null } => {
  const p = k === 0 ? M1_P : M2_P;
  const yaw = k === 0 ? 0.28 : -0.28;
  const tPick = T.obvious - 0.15 + k * 0.12;
  const tMouth = T.taste - 0.15 + k * 0.08;
  const lean = track([[0, 0], [tPick - 0.3, 0], [tPick, 18, "inout"], [tPick + 0.3, 4, "inout"], [T.mutton, 0]], t);
  const chunkSrc = BENCH_CHUNKS[k];
  const mouth = mouthOf(spec, p, yaw);
  let armR: [number, number] = [14, 0];
  let fwdR = 0;
  let chunk: Prop | null = { kind: "chunk", p: chunkSrc, s: 1.0, seed: 110 + k, splat: 0.3 };
  let bite = 1;
  if (t > tPick - 0.35) {
    // reach for the chunk, then bring it to the mouth, then hold it at the chest while chewing
    const reach = smooth((t - (tPick - 0.35)) / 0.35);
    const target = t < tPick ? chunkSrc : t < tMouth ? mix3(add(chunkSrc, [0, 0.08, 0]), add(mouth, [0, -0.02, 0.0]), smooth((t - tPick) / (tMouth - tPick))) : t < tMouth + 0.45 ? add(mouth, [0, -0.02, 0]) : mix3(mouth, add(mouth, [0.05, -0.35, 0.12]), smooth((t - tMouth - 0.45) / 0.3));
    const r = ik(spec, p, yaw, "R", add(target, [0, 0.03, 0]), lean);
    armR = mixArm([14, 0], r.arm, reach);
    fwdR = lerp(0, r.fwd, reach);
    if (t > tPick) {
      const hp = hand(spec, p, yaw, { armR, armRFwd: fwdR, lean }, "R");
      bite = t > tMouth + 0.1 ? 0.65 : 1;
      chunk = { kind: "chunk", p: add(hp, [0, 0.05, 0.02]), s: bite, seed: 110 + k, splat: 0.3 };
    }
  }
  // the verdicts: man 1 raises a finger on "mutton"; man 2 wags a finger and shakes his head on "venison"
  let armL: [number, number] = [14, 0];
  let fwdL = 0;
  let headYaw = t < T.obvious ? (k === 0 ? -35 : 35) : 0; // the two look at each other first
  let headNod = t > tPick - 0.3 && t < tPick + 0.2 ? 22 : 0;
  if (k === 0 && t > T.mutton - 0.1) {
    const u = smooth((t - T.mutton + 0.1) / 0.2);
    armL = mixArm([14, 0], [150, 40], u);
    fwdL = lerp(0, 45, u);
    headNod = -8;
    if (t > T.venison + 0.2) {
      armL = [65, 120]; // arms crossed-ish: annoyed
      fwdL = 85;
      headYaw = -30;
    }
  }
  if (k === 1 && t > T.venison - 0.1) {
    const u = smooth((t - T.venison + 0.1) / 0.2);
    armL = mixArm([14, 0], [105, 75 + 28 * Math.sin(2 * PI * 1.8 * (t - T.venison))], u);
    fwdL = lerp(0, 60, u);
    headYaw = 16 * Math.sin(2 * PI * 1.6 * (t - T.venison)) * u;
  }
  const chew = t > tMouth + 0.1 && t < T.venison + (k === 1 ? 1.0 : 0) && Math.sin(q(t) * 2 * PI * 1.8) > 0;
  let face: FaceState = t < T.obvious ? F("open", "smirk", "raised") : t < tMouth ? CURIOUS : chew ? CHEW2 : CHEW1;
  if (k === 0 && t > T.mutton - 0.05) face = t > T.venison + 0.2 ? F("squint", "frown", "angry") : SURE;
  if (k === 1 && t > T.venison - 0.05) face = NOPE;
  return { actor: { spec, p, yaw, pose: { lean, armL, armR, armLFwd: fwdL, armRFwd: fwdR, headYaw, headNod, bob: 2 * Math.sin(q(t) * 3 + k) }, face }, chunk };
};
const runnerAt = (spec: CharacterSpec, k: 0 | 1, t: number): Actor => {
  const w = walkAt(runMen[k], k === 0 ? RUN_FROM1 : RUN_FROM2, t, spec.height);
  const ph = w.walk ?? 0;
  const pump = Math.sin(ph);
  return {
    spec, p: w.p, yaw: PI / 2 - 0.1, face: PANIC,
    pose: { walk: w.walk, lean: 14, armL: [45 + 25 * pump, 95], armR: [45 - 25 * pump, 95], armLFwd: 30 + 40 * pump, armRFwd: 30 - 40 * pump, headNod: -6 },
  };
};

// ------------------------------------------------------------------ the scientists
const S1_P: V3 = [-0.55, 0, -0.75];
const S2_P: V3 = [0.95, 0, -0.65];
const MICRO_EYE: V3 = [-0.6, LAB_DESK_Y + 0.42, -0.06];
const sci1At = (t: number): { actor: Actor; jar: Prop | null } => {
  const yaw = 0.05;
  if (t < T.one2) {
    // holds a jar up to the window light, squinting, turning it
    const lean = 2;
    const jarP: V3 = [S1_P[0] + 0.12 + 0.03 * Math.sin(t * 2), 1.18, S1_P[2] + 0.5];
    const r = ik(SCI1, S1_P, yaw, "R", add(jarP, [0.03, -0.12, 0]), lean);
    const pose: BodyPose = { lean, armR: r.arm, armRFwd: r.fwd, armL: [20, 60], armLFwd: 40, headNod: -6, headTilt: 8 * Math.sin(t * 1.4) };
    const hp = hand(SCI1, S1_P, yaw, pose, "R");
    return { actor: { spec: SCI1, p: S1_P, yaw, pose, face: FOCUS }, jar: { kind: "jar", p: add(hp, [0, -0.04, 0]), s: 0.9, seed: 31 } };
  }
  // at the microscope, then he looks up: "lung!"
  const up = smooth((t - T.lung + 0.15) / 0.25);
  const lean = lerp(24, 4, up);
  const l = ik(SCI1, S1_P, yaw, "L", [MICRO_EYE[0] - 0.12, LAB_DESK_Y + 0.25, MICRO_EYE[2] + 0.02], lean);
  const fingerUp = smooth((t - T.lung) / 0.2);
  const pose: BodyPose = {
    lean, armL: mixArm(l.arm, [20, 20], up), armLFwd: lerp(l.fwd, 10, up), armR: mixArm([40, 60], [150, 30], fingerUp), armRFwd: lerp(40, 40, fingerUp),
    headNod: lerp(30, -4, up), headYaw: t > T.another + 0.2 ? 35 : 0,
  };
  const face = t < T.lung - 0.1 ? FOCUS : t < T.another + 0.2 ? EUREKA : F("squint", "frown", "angry");
  return { actor: { spec: SCI1, p: S1_P, yaw, pose, face }, jar: null };
};
const sci2At = (t: number): Actor => {
  // walks in from the right and points at the new jars one after another
  const w = walkAt([{ t0: T.another - 0.35, t1: T.another + 0.35, from: [2.6, 0, -0.35], to: S2_P, ease: "out" }], [2.6, 0, -0.35], t, SCI2.height);
  const yaw = track([[0, -1.3], [T.another + 0.35, -1.3], [T.another + 0.6, -0.4, "inout"]], t);
  const target: V3 = t < T.cartilage - 0.1 ? [0.4, LAB_DESK_Y + 0.25, -0.05] : [0.6, LAB_DESK_Y + 0.25, -0.32];
  const pt = window01(t, T.muscle - 0.15, SECONDS, 0.2, 0.2);
  const r = ik(SCI2, w.p, yaw, "R", target, 6);
  return {
    spec: SCI2, p: w.p, yaw,
    pose: { walk: w.walk, lean: 6, armR: mixArm([14, 0], r.arm, pt), armRFwd: lerp(0, r.fwd, pt), armL: [30, 70], armLFwd: 40, headNod: 18 * pt },
    face: t < T.muscle ? SURE : F("open", "grin", "raised"),
  };
};

// ------------------------------------------------------------------ the vultures
const FLOCK_C: V3 = [0, 24, -4];
/** six birds circling; each throws up (lunge) at its own time and a chunk falls from its beak */
const lungeT = (i: number) => (i === 0 ? T.threw : T.one4 + 0.05 + i * 0.27);
export const flockAt = (t: number): { birds: Bird[]; vomit: Prop[] } => {
  const birds: Bird[] = [];
  const vomit: Prop[] = [];
  for (let i = 0; i < 6; i++) {
    const a = t * 0.22 + (i / 6) * PI * 2;
    const r = 7 + (i % 2) * 2.2;
    const p: V3 = [FLOCK_C[0] + Math.cos(a) * r, FLOCK_C[1] + (i % 3) * 1.4, FLOCK_C[2] + Math.sin(a) * r];
    const yaw = -a; // tangent of the circle
    const lt = lungeT(i);
    const lunge = window01(t, lt - 0.05, lt + 0.45, 0.08, 0.3);
    birds.push({ p, yaw, flap: 0.35 * Math.sin(q(t, 30) * 2 * PI * 1.1 + i) + 0.1, bank: 0.25, lunge });
    for (let k = 0; k < 3; k++) {
      const u = t - lt - k * 0.07;
      if (u > 0 && u < 2.2) {
        const beak: V3 = [p[0] + Math.sin(yaw) * 0.8, p[1] - 0.1, p[2] + Math.cos(yaw) * 0.8];
        vomit.push({ kind: "chunk", p: [beak[0] + 0.15 * k, beak[1] - 0.5 * G * u * u, beak[2]], s: 2.0 - k * 0.4, seed: 200 + i * 5 + k, rot: u * 6 });
      }
    }
  }
  return { birds, vomit };
};
/** the hero vulture for the close shot: throws up, then beats its wings and speeds off */
const HERO_V0: V3 = [-4, 20, -2];
export const heroVultureAt = (t: number): { bird: Bird; vomit: Prop[] } => {
  const u = t - T.vultures2;
  const speed = u < T.fly - T.vultures2 ? 2.2 : 2.2 + 9 * smooth((t - T.fly) / 0.5);
  const x = HERO_V0[0] + 2.2 * Math.min(u, T.fly - T.vultures2) + Math.max(0, t - T.fly) * (speed + 2.2) / 2;
  const lunge = window01(t, T.vomit - 0.05, T.vomit + 0.5, 0.08, 0.3);
  const fast = smooth((t - T.fly) / 0.3);
  const bird: Bird = { p: [x, HERO_V0[1] + 0.25 * Math.sin(u * 2), HERO_V0[2]], yaw: PI / 2, flap: (0.3 + 0.35 * fast) * Math.sin(q(t, 30) * 2 * PI * (1.1 + 0.7 * fast)) + 0.1, bank: 0.05, lunge, s: 1.3 };
  const vomit: Prop[] = [];
  for (let k = 0; k < 4; k++) {
    const v = t - T.vomit - k * 0.06;
    if (v > 0) vomit.push({ kind: "chunk", p: [HERO_V0[0] + 2.2 * (T.vomit - T.vultures2) + 1.0 + 0.6 * v + 0.12 * k, HERO_V0[1] - 0.1 - 0.5 * G * v * v, HERO_V0[2] + 0.05 * k], s: 2.2 - k * 0.3, seed: 300 + k, rot: v * 7 });
  }
  return { bird, vomit };
};

// ------------------------------------------------------------------ the setups
const farmCrowd = (t: number): Actor[] => [womanAt(t)];
export const SETUPS: Setup[] = [
  // 1. A woman is making soap in her yard in Kentucky
  {
    id: 1, t0: 0, mood: "day", set: "farm", focus: [0, 1.2, 0.4], blur: 1.2, sky: true,
    keys: [{ at: 0, cam: C([2.6, 1.6, 4.4], [0.1, 1.0, 0.4], 46) }, { at: at(W("soap")), cam: C([1.9, 1.5, 3.4], [0.05, 1.0, 0.4], 44), dur: 1.0 }, { at: at(W("kentucky.")), cam: C([3.6, 2.2, 5.6], [-0.2, 1.0, -0.4], 48), dur: 0.7 }],
    actors: farmCrowd,
    props: (t) => [paddleAt(t)],
  },
  // 2. The sky is clear: she shades her eyes and looks up
  {
    id: 2, t0: T.sky, mood: "day", set: "farm", focus: [0, 1.5, 0], blur: 1.0, sky: true,
    keys: [{ at: T.sky, cam: C([1.0, 0.7, 2.4], [-0.1, 2.6, -1.3], 58) }, { at: at(T.clear), cam: C([0.8, 0.6, 2.0], [-0.1, 3.6, -1.6], 60), dur: 0.8 }],
    actors: farmCrowd,
    props: (t) => [paddleAt(t)],
  },
  // 3. Then it starts to rain... meat: on her face, then the first chunk drops into the soap
  {
    id: 3, t0: T.then, mood: "day", set: "farm", focus: [0, 1.4, 0.3], blur: 1.6, sky: true, shake: [T.meat],
    keys: [{ at: T.then, cam: C([0.9, 1.55, 2.2], [0.0, 1.35, 0.2], 40) }, { at: at(T.meat), cam: C([1.7, 1.6, 3.2], [0.0, 1.0, 0.5], 46), dur: 0.5 }],
    actors: farmCrowd,
    props: (t) => [paddleAt(t), ...farmMeat(t)],
  },
  // 4. Chunks of red flesh, some as big as your palm: the rain, then the chunk lands in her hand
  {
    id: 4, t0: T.chunks, mood: "day", set: "farm", focus: [0.4, 1.0, 0.6], blur: 1.4, sky: true,
    keys: [
      { at: T.chunks, cam: C([3.0, 2.1, 4.6], [0.0, 1.0, 0.0], 50) },
      { at: at(T.some), cam: C([1.25, 1.25, 1.55], [0.35, 1.05, 0.45], 42), dur: 0.7 },
      { at: at(T.palm), cam: C([1.05, 1.2, 1.25], [0.35, 1.08, 0.45], 40), dur: 0.4 },
    ],
    actors: farmCrowd,
    props: (t) => [paddleAt(t), ...farmMeat(t), palmChunk(t)].filter(Boolean) as Prop[],
  },
  // 5. fall all around her for several minutes: she flings it, covers her head and runs for the porch
  {
    id: 5, t0: T.fall, mood: "day", set: "farm", focus: [0.3, 1, -1], blur: 0.7, sky: true,
    keys: [{ at: T.fall, cam: C([4.6, 3.4, 7.2], [0, 0.8, -0.8], 50) }, { at: at(T.several), cam: C([5.8, 6.5, 9.0], [0, 0.4, -0.6], 52), dur: 1.0 }],
    actors: farmCrowd,
    props: (t) => [paddleAt(t), ...farmMeat(t), palmChunk(t)].filter(Boolean) as Prop[],
  },
  // 6. It's March 1876: the calendar on the wall — a chunk splats onto it; she peeks out from the porch
  {
    id: 6, t0: T.its, mood: "day", set: "farm", focus: CALENDAR, blur: 1.6, sky: true, whip: true,
    keys: [{ at: T.its, cam: C([2.5, 1.75, -1.0], [1.5, 1.65, -3.1], 44) }, { at: at(T.y1876), cam: C([2.15, 1.72, -1.6], [1.55, 1.7, -3.1], 40), dur: 0.6 }],
    actors: farmCrowd,
    props: (t) => [paddleAt(t), ...farmMeat(t)],
  },
  // 7. Neighbors come running: two men race through the gate
  {
    id: 7, t0: T.neighbors, mood: "day", set: "farm", focus: [-5.5, 1.1, 1.3], blur: 0.9, sky: true, whip: true,
    keys: [{ at: T.neighbors, cam: C([-2.0, 1.55, 4.6], [-6.4, 1.1, 1.2], 46) }, { at: at(W("running.")), cam: C([-2.6, 1.5, 4.2], [-5.2, 1.1, 1.2], 46), dur: 0.6 }],
    actors: (t) => [runnerAt(MAN1, 0, t), runnerAt(MAN2, 1, t), womanAt(t)],
    props: (t) => farmMeat(t),
  },
  // 8. Two of them do the obvious thing: they taste it
  {
    id: 8, t0: T.two, mood: "day", set: "farm", focus: [-2.0, 1.3, 0.85], blur: 1.4, sky: true, whip: true,
    keys: [{ at: T.two, cam: C([-1.7, 1.55, 3.6], [-2.0, 1.2, 0.8], 44) }, { at: at(T.taste), cam: C([-1.85, 1.5, 2.8], [-2.0, 1.3, 0.8], 42), dur: 0.6 }],
    actors: (t) => [tasterAt(MAN1, 0, t).actor, tasterAt(MAN2, 1, t).actor, womanAt(t)],
    props: (t) => [...farmMeat(t, { taken: [true, true] }), tasterAt(MAN1, 0, t).chunk, tasterAt(MAN2, 1, t).chunk].filter(Boolean) as Prop[],
  },
  // 9. Mutton, says one
  {
    id: 9, t0: T.mutton, mood: "day", set: "farm", focus: [M1_P[0], 1.45, M1_P[2]], blur: 1.8, sky: true,
    keys: [{ at: T.mutton, cam: C([-2.75, 1.6, 2.5], [M1_P[0], 1.4, M1_P[2]], 40) }, { at: T.mutton + 0.3, cam: C([-2.7, 1.6, 2.2], [M1_P[0], 1.42, M1_P[2]], 38), dur: 0.6 }],
    actors: (t) => [tasterAt(MAN1, 0, t).actor, tasterAt(MAN2, 1, t).actor],
    props: (t) => [...farmMeat(t, { taken: [true, true] }), tasterAt(MAN1, 0, t).chunk, tasterAt(MAN2, 1, t).chunk].filter(Boolean) as Prop[],
  },
  // 10. Venison, says the other
  {
    id: 10, t0: T.venison, mood: "day", set: "farm", focus: [M2_P[0], 1.4, M2_P[2]], blur: 1.6, sky: true,
    keys: [{ at: T.venison, cam: C([-1.0, 1.55, 2.4], [M2_P[0] - 0.2, 1.35, M2_P[2]], 42) }, { at: T.venison + 0.5, cam: C([-1.15, 1.55, 2.6], [M2_P[0] - 0.4, 1.3, M2_P[2]], 46), dur: 0.7 }],
    actors: (t) => [tasterAt(MAN1, 0, t).actor, tasterAt(MAN2, 1, t).actor, womanAt(t)],
    props: (t) => [...farmMeat(t, { taken: [true, true] }), tasterAt(MAN1, 0, t).chunk, tasterAt(MAN2, 1, t).chunk].filter(Boolean) as Prop[],
  },
  // 11. Scientists get samples: a jar held up to the window light
  {
    id: 11, t0: T.scientists, mood: "lamp", set: "lab", focus: [-0.5, 1.45, -0.3], blur: 1.4, whip: true,
    keys: [{ at: T.scientists, cam: C([0.6, 1.6, 2.2], [-0.45, 1.35, -0.4], 44) }, { at: at(T.samples), cam: C([0.3, 1.55, 1.6], [-0.5, 1.4, -0.4], 42), dur: 0.7 }],
    actors: (t) => [sci1At(t).actor],
    props: (t) => [sci1At(t).jar].filter(Boolean) as Prop[],
    lab: () => ({ jarLung: 0, jarMuscle: 0, jarCart: 0 }),
  },
  // 12. One calls it lung tissue: at the microscope, then "lung!"
  {
    id: 12, t0: T.one2, mood: "lamp", set: "lab", focus: [-0.55, 1.2, -0.2], blur: 1.6,
    keys: [{ at: T.one2, cam: C([0.4, 1.35, 1.4], [-0.5, 1.15, -0.3], 44) }, { at: at(T.lung), cam: C([0.5, 1.45, 1.7], [-0.4, 1.25, -0.3], 44), dur: 0.5 }],
    actors: (t) => [sci1At(t).actor],
    lab: (t) => ({ jarLung: smooth((t - T.lung - 0.1) / 0.25), jarMuscle: 0, jarCart: 0 }),
  },
  // 13. Another finds muscle and cartilage
  {
    id: 13, t0: T.another, mood: "lamp", set: "lab", focus: [0.4, 1.1, -0.3], blur: 1.4,
    keys: [{ at: T.another, cam: C([1.4, 1.55, 2.2], [0.3, 1.1, -0.4], 46) }, { at: at(T.cartilage), cam: C([1.1, 1.4, 1.6], [0.35, 1.0, -0.3], 44), dur: 0.6 }],
    actors: (t) => [sci1At(t).actor, sci2At(t)],
    lab: (t) => ({ jarLung: 1, jarMuscle: smooth((t - T.muscle) / 0.22), jarCart: smooth((t - T.cartilage) / 0.22) }),
  },
  // 14. The best guess today? A flock of vultures flew over, and threw up: looking up from the yard
  {
    id: 14, t0: T.best, mood: "day", set: "farm", focus: FLOCK_C, blur: 0.3, sky: true, whip: true,
    keys: [{ at: T.best, cam: C([2.0, 1.3, 7.0], [0.2, 6, -2], 56) }, { at: at(T.flock), cam: C([1.6, 1.0, 6.0], [0, 18, -4], 60), dur: 0.9 }, { at: at(T.threw), cam: C([1.4, 1.0, 5.4], [0.5, 21, -4], 54), dur: 0.5 }],
    actors: (t) => [womanAt(t)],
    props: (t) => farmMeat(t),
  },
  // 15. Vultures vomit to get lighter and fly off fast: up with one bird
  {
    id: 15, t0: T.vultures2, mood: "day", set: "farm", focus: HERO_V0, blur: 0.4, sky: true, whip: true,
    follow: (t) => [2.2 * (t - T.vultures2), 0, 0],
    keys: [{ at: T.vultures2, cam: C([HERO_V0[0] + 1.6, HERO_V0[1] + 0.9, HERO_V0[2] + 5.2], [HERO_V0[0] + 0.6, HERO_V0[1] - 0.3, HERO_V0[2]], 46) }, { at: at(T.fly), cam: C([HERO_V0[0] + 0.2, HERO_V0[1] + 0.6, HERO_V0[2] + 6.4], [HERO_V0[0] + 1.6, HERO_V0[1], HERO_V0[2]], 50), dur: 0.6 }],
    actors: () => [],
    props: (t) => farmMeat(t),
  },
  // 16. and when one does it, the rest often follow: the whole flock, one after another
  {
    id: 16, t0: T.and_when, mood: "day", set: "farm", focus: FLOCK_C, blur: 0.3, sky: true,
    keys: [{ at: T.and_when, cam: C([3, 26, 16], [0, 24, -4], 50) }, { at: at(T.rest), cam: C([6, 21, 14], [0, 22, -4], 54), dur: 0.9 }],
    actors: () => [],
    props: (t) => farmMeat(t),
  },
  // 17. One chunk is still on display in Bath County: the museum case; a kid leans in, then recoils
  {
    id: 17, t0: T.chunk2, mood: "golden", set: "museum", focus: [CASE[0], 1.3, CASE[2]], blur: 1.4, whip: true,
    keys: [{ at: T.chunk2, cam: C([1.9, 1.45, 2.2], [0.0, 1.2, -0.5], 44) }, { at: at(T.display), cam: C([1.6, 1.3, 1.9], [-0.2, 1.05, -0.2], 44), dur: 0.7 }, { at: at(T.county), cam: C([0.75, 1.42, 0.9], [0.0, 1.32, -0.6], 36), dur: SECONDS - T.county }],
    actors: (t) => {
      const recoil = smooth((t - T.display) / 0.25);
      const p: V3 = [-0.38, 0, lerp(0.1, 0.28, recoil)];
      const yaw = lerp(2.75, 1.3, smooth((t - T.display - 0.15) / 0.35));
      const lean = lerp(14, -10, recoil);
      const glass: V3 = [CASE[0] - 0.12, 1.15, CASE[2] + 0.43];
      const l = ik(CAST.kid, p, yaw, "L", add(glass, [-0.1, 0, 0]), lean);
      const r = ik(CAST.kid, p, yaw, "R", add(glass, [0.12, 0.02, 0]), lean);
      return [
        {
          spec: CAST.kid, p, yaw,
          pose: { lean, armL: mixArm(l.arm, [60, 120], recoil), armLFwd: lerp(l.fwd, 70, recoil), armR: mixArm(r.arm, [40, 90], recoil), armRFwd: lerp(r.fwd, 60, recoil), headNod: lerp(-12, 4, recoil), headYaw: 0 },
          face: t < T.display ? CURIOUS : F("squint", "frown", "worried", { flush: 0.4 }),
        },
      ];
    },
  },
];

// ------------------------------------------------------------------ the camera
const easeC = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
export const setupAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < SETUPS.length; k++) if (SETUPS[k].t0 <= t) i = k;
  return { s: SETUPS[i], i, end: i + 1 < SETUPS.length ? SETUPS[i + 1].t0 : SECONDS };
};
export const camAt = (t: number): Cam & { roll: number; shake: number } => {
  const { s, i, end } = setupAt(t);
  let c = s.keys[0].cam;
  for (let k = 1; k < s.keys.length; k++) {
    const key = s.keys[k];
    const u = clamp((t - key.at) / (key.dur ?? 0.6));
    if (u <= 0) break;
    const e = easeC(u);
    c = { pos: mix3(c.pos, key.cam.pos, e), look: mix3(c.look, key.cam.look, e), fov: lerp(c.fov, key.cam.fov, e), roll: 0 };
  }
  const dt = t - s.t0;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const k = Math.min(0.1, 0.025 * dt);
  let pos: V3 = [c.pos[0] + d[0] * k, c.pos[1] + d[1] * k, c.pos[2] + d[2] * k];
  const rel = rotY([pos[0] - c.look[0], pos[1] - c.look[1], pos[2] - c.look[2]], ((1.2 * PI) / 180) * dt);
  pos = [c.look[0] + rel[0], pos[1], c.look[2] + rel[2]];
  let look = c.look;
  if (s.follow) {
    const f = s.follow(t);
    pos = add(pos, f);
    look = add(look, f);
  }
  const next = SETUPS[i + 1];
  const pan = (deg: number) => {
    const r = rotY([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]], (deg * PI) / 180);
    look = [pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]];
  };
  if (next?.whip && end - t < 0.1) pan(-26 * Math.pow(1 - (end - t) / 0.1, 2));
  if (s.whip && dt < 0.14) pan(26 * Math.pow(1 - dt / 0.14, 2));
  let shake = 0;
  for (const st of s.shake ?? []) {
    const x = t - st;
    if (x >= 0 && x < 0.35) shake = Math.max(shake, (1 - x / 0.35) * Math.sin(x * 70));
  }
  return { pos, look, fov: c.fov, roll: 0, shake };
};
/** sound cue times for tools/audio_meat.py */
export const MEAT_EVENTS = () => ({
  soap: T.meat, palm: T.palm, fling: T.fall + 0.1, calendar: T.y1876 - 0.1, drops: DROPS.map((d) => d.t0 + FALL_T).sort((a, b) => a - b),
  runSteps: [] as number[], bite1: T.taste - 0.05, bite2: T.taste + 0.03, threw: T.threw, vomit: T.vomit, fly: T.fly, rest: [1, 2, 3, 4, 5].map(lungeT),
  jar1: T.lung + 0.1, jar2: T.muscle, jar3: T.cartilage, display: T.display, county: T.county,
});
export { T };
