// The gull short as DATA: 8 scenes, each one continuous shot (cuts only where the place or the time changes).
// Exterior and porch shots use keyed crane moves; the lantern-room and stair scenes use the director
// (core/director.ts): every subject — Walt, the officers, a watch, the gull, the switch, a crust — carries an importance
// weight over time and the camera frames whatever matters, handing off from one to the next.
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { headOf } from "../inkbeat/char/Character3D";
import { lerp, mixArm, squash, track, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import { direct } from "../inkbeat/core/director";
import { handWorld, solveArm } from "../inkbeat/core/ik";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { OFF1, OFF2, WALT } from "./cast";
import { COTTAGE, DECK_Y, LR, RAIL_R, RAIL_Y, stairAt, SWITCH } from "./world";
import type { GullFace, GullState, LampState } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
const G = 9.8;
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
const q = (t: number, hz = 15) => Math.round(t * hz) / hz;
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });
const GF = (eyes: GullFace["eyes"], brow: number, beak: number): GullFace => ({ eyes, brow, beak });

// ------------------------------------------------------------------ times
const T = {
  exactly: W("exactly"), on914: W("9:14", 1), hasnt: W("hasn't"), keeper: W("keeper", 1), old: W("old"), walt1: W("walt", 1), town: W("town"),
  coast: W("coast") - 0.06, checks: W("checks"), fine: W("fine"), change: W("change"), lock: W("lock"), it2: W("it", 2), on2: W("on", 2), w914b: W("9:14", 2),
  there: W("there"), feathers: W("feathers"), so: W("so"), climbs: W("climbs"), last: W("last"), watch: W("watch"), big: W("big"), at913: W("at", 2), t913: W("9:13"), hears: W("hears"),
  flapping: W("flapping"), gull1: W("gull", 1), lands: W("lands"), railing: W("railing"), waddles: W("waddles"), inside: W("inside"), pecks: W("pecks"),
  brass: W("brass"), switch2: W("switch", 2), light: W("light"), comes: W("comes"), on3: W("on", 3), for: W("for"), flipped: W("flipped"),
  w914c: W("9:14", 3), then: W("then"), fed: W("fed"), crust: W("crust"), the_gull3: W("gull", 3) - 0.07, never: W("never"), showing: W("showing"),
  it4: W("it", 3), paid: W("paid"), walt4: W("walt", 4), reaches: W("reaches"), pocket: W("pocket"), brought: W("brought"), bread: W("bread"),
};

// ------------------------------------------------------------------ helpers
const ik = (spec: CharacterSpec, p: V3, yaw: number, side: "L" | "R", target: V3, lean = 0) => {
  const r = (v: number) => Math.round(v * 100) / 100;
  return solveArm({ position: [0, 0, 0], yaw: r(yaw), side, target: [r(target[0] - p[0]), r(target[1] - p[1]), r(target[2] - p[2])], height: spec.height, build: spec.build, base: { lean: Math.round(lean) } });
};
const hand = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, side: "L" | "R") => handWorld({ position: p, yaw, height: spec.height, build: spec.build, pose, side });
const yawTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const ballistic = (from: V3, to: V3, t0: number, t1: number, t: number): V3 => {
  const T_ = t1 - t0;
  const u = clamp(t - t0, 0, T_);
  const v: V3 = [(to[0] - from[0]) / T_, (to[1] - from[1] + 0.5 * G * T_ * T_) / T_, (to[2] - from[2]) / T_];
  return [from[0] + v[0] * u, from[1] + v[1] * u - 0.5 * G * u * u, from[2] + v[2] * u];
};

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState; sc?: V3 };
export type Extra = { watch?: { p: V3; minutes: number; s?: number }; bread?: { p: V3; s?: number; rot?: number }; lantern?: V3; feather?: V3; torch?: V3 };
export type Scene = {
  id: number;
  t0: number;
  mood: string;
  set: "point" | "porch" | "stairs";
  cam: (t: number) => Cam;
  actors: (t: number) => Actor[];
  gull?: (t: number) => GullState | null;
  lamp?: (t: number) => LampState;
  extra?: (t: number) => Extra;
  focus: (t: number) => V3;
  blur: number;
  sky?: boolean;
  memory?: boolean;
};
const keyed = (keys: [number, Cam, ("inout" | "out" | "in" | "linear")?][]) => (t: number): Cam => {
  let c = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, ck, e] = keys[i];
    const [tp] = keys[i - 1];
    if (t <= tp) break;
    const u = clamp((t - tp) / (tk - tp));
    const x = e === "linear" ? u : e === "out" ? 1 - Math.pow(1 - u, 3) : e === "in" ? u * u * u : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    c = { pos: mix3(c.pos, ck.pos, x), look: mix3(c.look, ck.look, x), fov: lerp(c.fov, ck.fov, x), roll: 0 };
  }
  return c;
};
const C = (pos: V3, look: V3, fov: number): Cam => ({ pos, look, fov, roll: 0 });
const beamOn = (t: number, at: number) => smooth((t - at) / 0.35);
const lampState = (t: number, onAt: number | null, extra: Partial<LampState> = {}): LampState => {
  const on = onAt === null ? 0 : beamOn(t, onAt);
  return { on, beam: on, t, lever: onAt === null ? 0 : smooth((t - onAt + 0.4) / 0.2), ...extra };
};
const blendCam = (a: Cam, b: Cam, u: number): Cam => ({ pos: mix3(a.pos, b.pos, u), look: mix3(a.look, b.look, u), fov: lerp(a.fov, b.fov, u), roll: 0 });
/** a hand-placed lens path (keyed positions) that keeps looking at a smoothed point: the subject tracking of the
 *  director without letting it choose the lens position */
const aimFrom = (pos: (t: number) => V3, look: (t: number) => V3, fov: number) => (t: number): Cam => {
  const N = 9;
  const acc: V3 = [0, 0, 0];
  let ws = 0;
  for (let i = 0; i < N; i++) {
    const ts = Math.max(0, t - 0.35 + (i / (N - 1)) * 0.5);
    const g = Math.exp(-((ts - t - 0.05) ** 2) / (2 * 0.14 ** 2));
    const l = look(ts);
    acc[0] += l[0] * g;
    acc[1] += l[1] * g;
    acc[2] += l[2] * g;
    ws += g;
  }
  return { pos: pos(t), look: [acc[0] / ws, acc[1] / ws, acc[2] / ws], fov, roll: 0 };
};
const keyV = (keys: [number, V3][]) => (t: number): V3 => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      return mix3(keys[i - 1][1], keys[i][1], e);
    }
  }
  return keys[keys.length - 1][1];
};
export const BEAM_SPEED = 0.85;
const ROOM = { x: 0, z: 0, r: LR - 0.3 };

// ================================================================== 1. the lighthouse at dusk: it turns itself on
const S1: Scene = {
  id: 1, t0: 0, mood: "dusk", set: "point", sky: true, blur: 0.5,
  cam: keyed([
    [0, C([9, -3.6, 25], [0, 1.0, 0], 46)],
    [T.exactly - 0.3, C([10, 9.0, 22], [0, 14.5, 0], 44), "inout"],
    [T.on914 + 0.4, C([9.5, 15.5, 16], [0, 17.6, 0], 42), "inout"],
    [T.keeper - 0.1, C([14.5, 6.0, 15.5], [5.0, 4.0, 1.5], 46), "inout"],
    [T.old, C([12.8, 2.0, 10.2], [COTTAGE[0] - 0.8, 1.5, COTTAGE[2] + 0.6], 44), "inout"],
  ]),
  actors: () => [],
  lamp: (t) => lampState(t, T.on914),
  focus: (t) => (t < T.hasnt ? [0, 17.5, 0] : [COTTAGE[0], 1.4, COTTAGE[2] + 1]),
};

// ================================================================== 2. Walt on his porch in town, watching the beam
const W_PORCH: V3 = [-2.6, 0.29, 0.3];
const S2: Scene = {
  id: 2, t0: T.old - 0.12, mood: "night", set: "porch", sky: true, blur: 1.4,
  cam: keyed([[T.old - 0.12, C([1.9, 1.55, 3.8], [-2.6, 1.15, 0.2], 40)], [T.coast, C([1.0, 1.45, 2.9], [-2.6, 1.2, 0.2], 38), "inout"]]),
  actors: (t) => [{ spec: WALT, p: W_PORCH, yaw: -0.75, face: t < T.town - 0.2 ? F("half", "smile", "worried") : F("half", "wavy", "worried"), pose: { lean: -12 + 4 * Math.sin(q(t) * 2.2), armL: [30, 80], armLFwd: 60, armR: [40, 95], armRFwd: 70, headYaw: -22, headNod: -6 } }],
  focus: () => [-2.6, 1.2, 0.3],
};

// ================================================================== 3. the coast guard, by day: wiring, "fine", a new lock
const OFF1_P: V3 = [2.4, DECK_Y, 0.85];
const OFF2_DOOR: V3 = [1.05, DECK_Y, 4.45];
const LOCK_P: V3 = [0.3, DECK_Y + 0.92, LR + 0.99];
const off1Day = (t: number): Actor => {
  const yaw = yawTo(OFF1_P, SWITCH);
  const lean = track([[0, 22], [T.fine - 0.15, 22], [T.fine + 0.1, 0, "out"]], t);
  const torch = ik(OFF1, OFF1_P, yaw, "R", add(SWITCH, [0.05, 0.4, 0.05]), lean);
  const up = smooth((t - T.fine + 0.1) / 0.25);
  return {
    spec: OFF1, p: OFF1_P, yaw: lerp(yaw, yaw - 0.9, up), face: up > 0.5 ? F("half", "smirk", "raised") : F("squint", "flat", "angry"),
    pose: { lean, armR: mixArm(torch.arm, [72, 95], up), armRFwd: lerp(torch.fwd, -20, up), armL: mixArm([40, 60], [72, 95], up), armLFwd: lerp(40, -20, up), headNod: lerp(25, -4, up), headTilt: 10 * up },
  };
};
const off2Lock = (t: number): Actor => {
  const yaw = yawTo(OFF2_DOOR, LOCK_P);
  const l = ik(OFF2, OFF2_DOOR, yaw, "L", add(LOCK_P, [0.02, 0, 0.05]), 6);
  const r = ik(OFF2, OFF2_DOOR, yaw, "R", add(LOCK_P, [-0.05, -0.08, 0.06]), 6);
  const twist = 4 * Math.sin(q(t) * 2 * PI * 1.8) * window01(t, T.change, T.it2, 0.1, 0.1);
  return { spec: OFF2, p: OFF2_DOOR, yaw, face: t < T.lock ? F("squint", "flat", "neutral") : F("open", "smile", "raised"), pose: { lean: 6, armL: l.arm, armLFwd: l.fwd, armR: [r.arm[0] + twist, r.arm[1]], armRFwd: r.fwd, headNod: 14 } };
};
const S3: Scene = {
  id: 3, t0: T.coast, mood: "day", set: "point", sky: true, blur: 1.2,
  cam: (t) => {
    const d = (tt: number) =>
    direct(
      [
        { p: (tt) => add(off1Day(tt).p, [0, 1.15, 0]), r: 0.75, w: (tt) => track([[0, 1], [T.fine + 0.2, 1], [T.change, 0.2, "inout"]], tt) },
        { p: () => add(SWITCH, [0, 0.3, 0]), r: 0.35, w: (tt) => track([[0, 0], [T.checks - 0.2, 0], [T.checks + 0.1, 0.7, "inout"], [T.fine - 0.1, 0.2, "inout"]], tt) },
        
      ],
      { az: (tt) => track([[0, -0.72], [T.fine, -0.8, "inout"], [T.change, -0.8]], tt), el: () => 0.12, fov: 50, minR: 0.95, inside: ROOM },
      t,
    )
    const lockCam = aimFrom(keyV([[T.change - 0.1, [-0.9, DECK_Y + 2.1, 7.2]], [T.it2, [-0.6, DECK_Y + 1.95, 6.8]]]), () => [0.6, DECK_Y + 1.25, 4.6], 40);
    // a cut out to the gallery (a new place: the door, outside), then a slow push on the new lock
    return t < T.change - 0.05 ? d(t) : lockCam(t);
  },
  actors: (t) => [off1Day(t), off2Lock(t)],
  lamp: (t) => lampState(t, null, { lockNew: smooth((t - T.lock) / 0.2) }),
  extra: (t) => {
    const a = off1Day(t);
    return { torch: hand(OFF1, a.p, a.yaw, a.pose, "R") };
  },
  focus: (t) => (t < T.change ? add(SWITCH, [0, 0.6, 0]) : LOCK_P),
};

// ================================================================== 4. that night: it still turns on, 9:14, feathers
const OFF1_N: V3 = [1.5, DECK_Y, 4.35];
const OFF2_N: V3 = [-0.9, DECK_Y, 4.45];
const scareAt = T.on2 - 0.05;
const offNight = (spec: CharacterSpec, p: V3, k: 0 | 1, t: number): { actor: Actor; watch?: V3 } => {
  const scared = smooth((t - scareAt) / 0.12);
  const calm = smooth((t - scareAt - 0.9) / 0.3);
  const yaw = lerp(k === 0 ? 0.35 : -0.25, k === 0 ? PI - 0.4 : PI + 0.35, smooth((t - scareAt - 0.1) / 0.35)) * (calm > 0.5 && k === 1 ? 1 : 1);
  const hop = track([[0, 0], [scareAt, 0], [scareAt + 0.15, 0.25, "out"], [scareAt + 0.32, 0, "in"]], t);
  let armL: [number, number] = mixArm([20, 15], [155, 30], scared * (1 - calm));
  let armR: [number, number] = mixArm([20, 15], [155, 30], scared * (1 - calm));
  let fwdL = 20;
  let fwdR = 20;
  let watch: V3 | undefined;
  if (k === 0 && t > T.w914b - 0.35) {
    // he lifts his wrist to read his watch
    const u = smooth((t - T.w914b + 0.35) / 0.3);
    armL = mixArm(armL, [80, 120], u);
    fwdL = lerp(20, 85, u);
    const pose: BodyPose = { armL, armLFwd: fwdL };
    watch = add(hand(spec, [p[0], p[1] + hop, p[2]], yaw, pose, "L"), [0, 0.05, 0]);
  }
  if (k === 1 && t > T.there - 0.2) {
    // she points in through the door at the switch
    const u = smooth((t - T.there + 0.2) / 0.3);
    const r = ik(spec, p, yaw, "R", add(SWITCH, [0, 0.5, 0.6]), 4);
    armR = mixArm(armR, r.arm, u);
    fwdR = lerp(20, r.fwd, u);
  }
  const face = t < scareAt ? F("half", "flat", "neutral") : t < scareAt + 0.95 ? F("huge", "scream", "high", { sweat: true }) : k === 0 ? F("wide", "gasp", "raised") : F("glare", "frown", "furious");
  return {
    actor: { spec, p: [p[0], p[1] + hop, p[2]], yaw, face, pose: { armL, armR, armLFwd: fwdL, armRFwd: fwdR, headStretch: track([[0, 1], [scareAt, 1], [scareAt + 0.08, 1.25, "out"], [scareAt + 0.7, 1.18], [scareAt + 0.95, 1, "back"]], t), lean: -10 * scared * (1 - calm), headNod: k === 0 && t > T.w914b ? 22 : 0 }, sc: squash(track([[0, 1], [scareAt, 0.9, "out"], [scareAt + 0.12, 1.08, "out"], [scareAt + 0.5, 1, "back"]], t)) },
    watch,
  };
};
const S4: Scene = {
  id: 4, t0: T.it2, mood: "night", set: "point", sky: true, blur: 1.4,
  cam: (t) =>
    direct(
      [
        { p: () => [0.3, DECK_Y + 1.25, 4.4], r: 1.3, w: (tt) => track([[0, 1], [T.w914b - 0.2, 1], [T.w914b + 0.1, 0.25, "inout"], [T.there, 0, "inout"]], tt) },
        { p: (tt) => offNight(OFF1, OFF1_N, 0, tt).watch ?? add(OFF1_N, [0, 1.3, 0]), r: 0.28, w: (tt) => track([[0, 0], [T.w914b - 0.15, 0], [T.w914b + 0.1, 1, "inout"], [T.there - 0.1, 1], [T.there + 0.2, 0, "inout"]], tt) },
        { p: () => add(SWITCH, [0, 0.15, 0]), r: 0.55, w: (tt) => track([[0, 0], [T.there - 0.2, 0], [T.there + 0.25, 1, "inout"]], tt) },
      ],
      { az: (tt) => track([[0, PI], [T.w914b, PI - 0.25, "inout"], [T.there, PI - 0.85, "inout"]], tt), el: (tt) => track([[0, 0.08], [T.there, 0.3, "inout"]], tt), fov: 50, minR: 0.7, lead: 0.15, inside: ROOM },
      t,
    ),
  actors: (t) => [offNight(OFF1, OFF1_N, 0, t).actor, offNight(OFF2, OFF2_N, 1, t).actor],
  lamp: (t) => lampState(t, T.on2, { feathers: true, lockNew: 1 }),
  extra: (t) => {
    const w = offNight(OFF1, OFF1_N, 0, t).watch;
    return w ? { watch: { p: w, minutes: 14, s: 1.0 } } : {};
  },
  focus: (t) => (t < T.there ? [0.3, DECK_Y + 1.3, 4.4] : SWITCH),
};

// ================================================================== 5. Walt climbs the stairs one last time
const climbA = (t: number) => lerp(1.0, 4.4, clamp((t - T.so) / (T.at913 - T.so)));
const waltStairs = (t: number): { actor: Actor; lantern: V3 } => {
  const a = climbA(t);
  const p = stairAt(a);
  const yaw = a + PI / 2;
  const pose: BodyPose = { walk: (a - 1.0) * 3.2, lean: 12, armR: [55, 70], armRFwd: 60, armL: [20, 10], headNod: t > T.watch - 0.3 ? -16 : -6 };
  const face = t < T.last ? F("squint", "flat", "angry") : F("open", "frown", "worried", { sweat: true });
  return { actor: { spec: WALT, p, yaw, pose, face }, lantern: add(hand(WALT, p, yaw, pose, "R"), [0, -0.05, 0]) };
};
const S5: Scene = {
  id: 5, t0: T.so, mood: "lamp", set: "stairs", sky: false, blur: 1.0,
  cam: (t) => {
    const a = climbA(t);
    const w = stairAt(a);
    const ca = a - 0.9;
    return { pos: [Math.sin(ca) * 0.75, w[1] + 2.1, Math.cos(ca) * 0.75], look: [w[0], w[1] + 0.8, w[2]], fov: 60, roll: 0 };
  },
  actors: (t) => [waltStairs(t).actor],
  extra: (t) => ({ lantern: waltStairs(t).lantern }),
  focus: (t) => add(stairAt(climbA(t)), [0, 1.2, 0]),
};

// ================================================================== 6. 9:13: Walt hides; the gull lands, waddles in, pecks the switch; the light comes on
const W_HIDE: V3 = [-1.55, DECK_Y, 0.95];
const RAIL_LAND: V3 = [-0.6, RAIL_Y + 0.02, RAIL_R - 0.05];
const DECK_HOP: V3 = [-0.35, DECK_Y + 0.03, LR + 0.55];
const AT_SWITCH: V3 = [SWITCH[0] - 0.36, DECK_Y + 0.03, SWITCH[2] - 0.38];
const LEVER_DOWN = T.switch2 + 0.05;
const gullTonight = (t: number): GullState | null => {
  if (t < T.flapping - 0.15) return null;
  const face0 = GF("normal", 0, 0);
  // flight in from the sea onto the railing
  if (t < T.lands) {
    const u = clamp((t - (T.flapping - 0.15)) / (T.lands - T.flapping + 0.15));
    const p = mix3([-6.5, RAIL_Y + 2.5, 10], RAIL_LAND, smooth(u));
    return { p: [p[0], p[1] + 0.6 * Math.sin(PI * u), p[2]], yaw: PI - 0.5, tilt: 0.2 * (1 - u), bob: 0, flap: 0.6 * Math.sin(q(t, 30) * 2 * PI * 2), fold: 0, peck: 0, step: 0, face: face0 };
  }
  // on the railing: folds its wings, looks around; then hops down and waddles through the door to the switch
  if (t < T.waddles) {
    const fold = smooth((t - T.lands) / 0.3);
    return { p: RAIL_LAND, yaw: PI + track([[T.lands, 0.4], [T.lands + 0.4, -0.3, "inout"], [T.waddles, 0.1, "inout"]], t), tilt: 0, bob: 0.02 * Math.sin(t * 6), flap: 0.5 * (1 - fold), fold, peck: 0, step: 0, face: GF("normal", 0, 0) };
  }
  const hopT = T.waddles + 0.2;
  if (t < hopT) return { p: ballistic(RAIL_LAND, DECK_HOP, T.waddles, hopT, t), yaw: PI, tilt: 0, bob: 0, flap: 0.3, fold: 0.6, peck: 0, step: 0, face: face0 };
  if (t < T.pecks - 0.1) {
    const u = (t - hopT) / (T.pecks - 0.1 - hopT);
    const p = mix3(DECK_HOP, AT_SWITCH, smooth(u));
    return { p, yaw: yawTo(DECK_HOP, AT_SWITCH), tilt: 0.12 * Math.sin(u * PI * 6), bob: 0.015 * Math.abs(Math.sin(u * PI * 6)), flap: 0, fold: 1, peck: 0, step: u * 6, face: GF("normal", 0.3, 0) };
  }
  // three pecks at the lever; on the third the lever goes down
  const pk = [T.pecks, T.big + 0.05, T.switch2 - 0.05].reduce((m, p0) => Math.max(m, window01(t, p0 - 0.05, p0 + 0.22, 0.07, 0.15)), 0);
  const after = t > LEVER_DOWN + 0.2;
  return { p: AT_SWITCH, yaw: yawTo(AT_SWITCH, SWITCH) + (after ? 0.25 * smooth((t - LEVER_DOWN) / 0.5) : 0), tilt: 0, bob: 0, flap: 0, fold: 1, peck: pk, step: 0, face: after ? GF("sparkle", -0.3, 0.3) : GF("narrow", 0.6, 0.2) };
};
const waltHide = (t: number): { actor: Actor; watch?: V3 } => {
  const yaw = yawTo(W_HIDE, AT_SWITCH) - 0.15;
  const startle = smooth((t - T.flapping) / 0.12);
  const awe = smooth((t - T.light + 0.05) / 0.12);
  const watchUp = window01(t, T.at913 - 0.1, T.hears + 0.1, 0.25, 0.25);
  const w = ik(WALT, W_HIDE, yaw, "R", add(headOf(W_HIDE, WALT.height, WALT.build), [Math.sin(yaw) * 0.32, -0.32, Math.cos(yaw) * 0.32]), 4);
  let armR: [number, number] = mixArm([20, 20], w.arm, watchUp);
  let fwdR = lerp(10, w.fwd, watchUp);
  let armL: [number, number] = [25, 40];
  let fwdL = 30;
  if (awe > 0) {
    armR = mixArm(armR, [120, 130], awe);
    fwdR = lerp(fwdR, 60, awe);
    armL = mixArm(armL, [120, 130], awe);
    fwdL = lerp(fwdL, 60, awe);
  }
  const pose: BodyPose = {
    lean: 10 - 16 * awe, armR, armRFwd: fwdR, armL, armLFwd: fwdL, headNod: watchUp * 20 - 6 * startle, headYaw: startle * (1 - awe) * 25,
    headStretch: track([[0, 1], [T.light - 0.05, 1], [T.light + 0.05, 1.3, "out"], [T.light + 0.6, 1.24], [T.for, 1.05, "inout"]], t),
  };
  const face = t < T.hears ? F("squint", "flat", "angry") : t < T.lands ? F("huge", "o", "high") : t < T.light - 0.05 ? F("wide", "wavy", "raised", { sweat: true }) : F("huge", "scream", "high");
  return { actor: { spec: WALT, p: W_HIDE, yaw, pose, face }, watch: watchUp > 0.05 ? add(hand(WALT, W_HIDE, yaw, pose, "R"), [0, 0.05, 0]) : undefined };
};
const S6: Scene = {
  id: 6, t0: T.at913, mood: "night", set: "point", sky: true, blur: 1.6,
  cam: (t) => {
    const d = (tt: number) =>
    direct(
      [
        { p: (tt) => waltHide(tt).watch ?? add(W_HIDE, [0, 1.25, 0]), r: 0.3, w: (tt) => track([[0, 1], [T.hears - 0.1, 1], [T.hears + 0.1, 0, "inout"]], tt) },
        { p: () => add(W_HIDE, [0, 1.25, 0]), r: 0.7, w: (tt) => track([[0, 0.3], [T.hears, 1, "inout"], [T.gull1 - 0.2, 1], [T.gull1 + 0.1, 0.2, "inout"], [T.light - 0.05, 0.2], [T.light + 0.15, 1, "out"]], tt) },
        { p: (tt) => add(gullTonight(tt)?.p ?? RAIL_LAND, [0, 0.3, 0]), r: 0.6, w: (tt) => track([[0, 0], [T.gull1 - 0.3, 0], [T.gull1, 1, "inout"], [T.light - 0.05, 1], [T.light + 0.2, 0.3, "inout"]], tt) },
        { p: () => add(SWITCH, [0, 0.3, 0]), r: 0.4, w: (tt) => track([[0, 0], [T.pecks - 0.2, 0], [T.pecks, 0.6, "inout"], [T.light, 0.3, "inout"]], tt) },
      ],
      { az: (tt) => track([[0, -1.3], [T.hears, -1.1, "inout"], [T.gull1, -1.6, "inout"], [T.lands, -2.75, "inout"], [T.inside, -0.6, "inout"], [T.pecks, -0.15, "inout"], [T.light + 0.2, -0.9, "inout"]], tt), el: (tt) => track([[0, 0.12], [T.lands, 0.08], [T.pecks, 0.25, "inout"], [T.light, 0.12, "inout"]], tt), fov: 54, minR: 0.8, lead: 0.15, inside: ROOM },
      t,
    )
    const gp = (tt: number) => add(gullTonight(tt)?.p ?? RAIL_LAND, [0, 0.3, 0]);
    const arrival = aimFrom(
      keyV([[T.flapping - 0.1, [-1.25, DECK_Y + 1.4, 1.9]], [T.gull1, [-1.15, DECK_Y + 1.4, 2.0]], [T.lands, [-0.2, DECK_Y + 1.35, 2.3]], [T.waddles, [-0.1, DECK_Y + 1.25, 2.6]], [T.inside + 0.2, [-0.5, DECK_Y + 1.1, 2.6]], [T.pecks, [0.05, DECK_Y + 0.85, 2.85]]]),
      (tt) => (tt < T.lands ? mix3(add(RAIL_LAND, [0, 0.6, 0]), gp(tt), 0.6) : gp(tt)),
      48,
    );
    // the light comes on: push in on Walt's face from the switch side (his big take, held)
    const react = aimFrom(keyV([[T.light - 0.1, [0.45, DECK_Y + 1.5, 1.55]], [T.for, [-0.35, DECK_Y + 1.5, 1.2]]]), () => add(W_HIDE, [0, 1.35, 0]), 50);
    const u = window01(t, T.flapping - 0.2, T.switch2 + 0.1, 0.3, 0.3);
    const v = smooth((t - T.switch2 - 0.05) / 0.3);
    return blendCam(blendCam(d(t), arrival(t), u), react(t), v);
  },
  actors: (t) => [waltHide(t).actor],
  gull: gullTonight,
  lamp: (t) => lampState(t, LEVER_DOWN + 0.35, { feathers: true, lockNew: 1, doorOpen: 1 }),
  extra: (t) => {
    const w = waltHide(t).watch;
    return w ? { watch: { p: w, minutes: 13, s: 1.2 } } : {};
  },
  focus: (t) => (t < T.gull1 ? add(W_HIDE, [0, 1.2, 0]) : t < T.light ? add(gullTonight(t)?.p ?? RAIL_LAND, [0, 0.3, 0]) : add(W_HIDE, [0, 1.3, 0])),
};

// ================================================================== 7. twenty years ago: he flips the switch, then feeds the gull its crust (golden)
const W_PAST: V3 = [1.05, DECK_Y, 1.0];
const W_DOOR: V3 = [0.25, DECK_Y, 2.9];
const CRUST_T0 = T.fed + 0.05;
const CRUST_T1 = T.crust + 0.1;
const pastWalk: WalkSeg[] = [{ t0: T.w914c + 0.3, t1: T.then + 0.1, from: W_PAST, to: W_DOOR, ease: "inout" }];
const waltPast = (t: number): { actor: Actor; crustHand: V3 } => {
  const w = walkAt(pastWalk, t < T.w914c ? W_PAST : W_DOOR, t, WALT.height);
  const yaw = t < T.w914c + 0.3 ? yawTo(W_PAST, SWITCH) : lerp(yawTo(W_PAST, SWITCH), 0.05, smooth((t - T.w914c - 0.3) / 0.6));
  const flip = window01(t, T.flipped - 0.35, T.w914c + 0.15, 0.25, 0.2);
  const lever = add(SWITCH, [0, 0.45 - 0.2 * smooth((t - T.flipped) / 0.2), 0.05]);
  const r = ik(WALT, w.p, yaw, "R", lever, 14);
  let armR: [number, number] = mixArm([20, 20], r.arm, flip);
  let fwdR = lerp(10, r.fwd, flip);
  // the toss: a wind-up, a flick toward the railing
  const wind = window01(t, CRUST_T0 - 0.35, CRUST_T0 + 0.25, 0.2, 0.2);
  if (wind > 0) {
    armR = mixArm(armR, t < CRUST_T0 ? [60, 100] : [110, 20], wind);
    fwdR = lerp(fwdR, t < CRUST_T0 ? 30 : 70, wind);
  }
  const pose: BodyPose = { walk: w.walk, lean: 14 * flip + 4, armR, armRFwd: fwdR, armL: [20, 30], armLFwd: 20, headNod: 10 * flip };
  const face = t < T.then ? F("half", "smile", "raised") : t < CRUST_T1 ? F("open", "grin", "raised") : F("squint", "beam", "raised");
  return { actor: { spec: WALT, p: w.p, yaw, pose, face }, crustHand: hand(WALT, w.p, yaw, pose, "R") };
};
const GULL_PAST: V3 = [-0.6, RAIL_Y + 0.02, RAIL_R - 0.05];
const crustAt = (t: number): V3 | null => {
  if (t < T.then - 0.2) return null;
  if (t < CRUST_T0) return add(waltPast(t).crustHand, [0, 0.04, 0]);
  if (t < CRUST_T1) return ballistic(add(waltPast(CRUST_T0).crustHand, [0, 0.04, 0]), add(GULL_PAST, [0, 0.47, 0.22]), CRUST_T0, CRUST_T1, t);
  return null;
};
const gullPast = (t: number): GullState => {
  const caught = t > CRUST_T1;
  const look = crustAt(t);
  return { p: GULL_PAST, yaw: PI + (look ? clamp(Math.atan2(look[0] - GULL_PAST[0], -(look[2] - GULL_PAST[2])), -0.5, 0.5) : 0), tilt: 0, bob: caught ? 0.04 * Math.abs(Math.sin(t * 9)) : 0, flap: caught ? 0.4 * Math.abs(Math.sin(t * 7)) : 0, fold: caught ? 0.4 : 1, peck: 0, step: 0, face: caught ? GF("sparkle", -0.5, 0.35) : look ? GF("big", -0.3, 0.6) : GF("normal", 0, 0) };
};
const S7: Scene = {
  id: 7, t0: T.for, mood: "golden", set: "point", sky: true, blur: 1.4, memory: true,
  cam: (t) =>
    direct(
      [
        { p: (tt) => add(waltPast(tt).actor.p, [0, 1.15, 0]), r: 0.7, w: (tt) => track([[0, 1], [T.then, 1], [CRUST_T0 + 0.1, 0.25, "inout"], [CRUST_T1 + 0.2, 0.25], [T.the_gull3, 0.5, "inout"]], tt) },
        { p: () => add(SWITCH, [0, 0.35, 0]), r: 0.4, w: (tt) => track([[0, 0], [T.flipped - 0.3, 0], [T.flipped, 0.8, "inout"], [T.w914c + 0.3, 0, "inout"]], tt) },
        { p: (tt) => crustAt(tt) ?? add(GULL_PAST, [0, 0.4, 0]), r: 0.35, w: (tt) => track([[0, 0], [CRUST_T0 - 0.1, 0], [CRUST_T0 + 0.05, 1, "inout"], [CRUST_T1, 1], [CRUST_T1 + 0.2, 0, "inout"]], tt) },
        { p: () => add(GULL_PAST, [0, 0.35, 0]), r: 0.45, w: (tt) => track([[0, 0], [T.then, 0], [T.fed + 0.2, 0.6, "inout"], [CRUST_T1, 1, "inout"]], tt) },
      ],
      { az: (tt) => track([[0, 1.1], [T.flipped, 1.3, "inout"], [T.w914c + 0.3, 1.8, "inout"], [T.fed, 2.7, "inout"], [CRUST_T1, 2.85, "inout"]], tt), el: () => 0.12, fov: 52, minR: 0.85, lead: 0.15, inside: ROOM },
      t,
    ),
  actors: (t) => [waltPast(t).actor],
  gull: gullPast,
  lamp: (t) => lampState(t, T.flipped + 0.25, { doorOpen: 1, crumbs: false }),
  extra: (t) => {
    const c = crustAt(t);
    return c ? { bread: { p: c, s: 0.8, rot: t * 9 } } : {};
  },
  focus: (t) => (t < T.then ? add(SWITCH, [0, 0.5, 0]) : add(GULL_PAST, [0, 0.4, 0])),
};

// ================================================================== 8. tonight: the gull stares; Walt reaches in his pocket; he brought bread
const G_NOW0 = AT_SWITCH;
const G_NOW1: V3 = [-0.55, DECK_Y + 0.03, 1.7];
const W_NOW: V3 = [-1.55, DECK_Y, 0.95];
const BREAD_T0 = T.bread + 0.25;
const BREAD_T1 = BREAD_T0 + 0.45;
const gullNow = (t: number): GullState => {
  const u = smooth((t - T.never) / 0.8);
  const p = mix3(G_NOW0, G_NOW1, u);
  const walking = u > 0.02 && u < 0.98;
  const toWalt = yawTo(p, add(W_NOW, [0, 0, 0]));
  const glare = window01(t, T.it4 - 0.05, T.brought, 0.12, 0.15);
  const want = t > T.brought - 0.1;
  const caught = t > BREAD_T1;
  const tap = glare * Math.max(0, Math.sin(q(t) * 2 * PI * 2.2));
  return {
    p, yaw: toWalt, tilt: walking ? 0.12 * Math.sin(u * PI * 8) : glare * 0.15, bob: walking ? 0.015 * Math.abs(Math.sin(u * PI * 8)) : caught ? 0.04 * Math.abs(Math.sin(t * 9)) : 0,
    flap: caught ? 0.45 * Math.abs(Math.sin(t * 7)) : 0, fold: caught ? 0.4 : 1, peck: tap * 0.5, step: walking ? u * 8 : 0,
    face: caught ? GF("sparkle", -0.6, 0.35) : want ? GF("big", -0.5, 0.65) : glare > 0.3 ? GF("narrow", 1, 0) : GF("big", 0, 0.1),
  };
};
const waltNow = (t: number): { actor: Actor; bread?: V3 } => {
  const yaw = yawTo(W_NOW, gullNow(t).p) - 0.1;
  const guilty = window01(t, T.it4, T.reaches, 0.15, 0.15);
  // the hand goes to the trouser pocket, comes out with bread, holds it out; then the toss
  const pocket: V3 = add(W_NOW, [Math.sin(yaw + PI / 2) * 0.24, 0.72, Math.cos(yaw + PI / 2) * 0.24]);
  const gp = gullNow(t).p;
  const offer: V3 = mix3(add(W_NOW, [0, 0.95, 0]), add(gp, [0, 0.8, 0]), 0.45);
  const reach = smooth((t - T.reaches) / 0.3);
  const out = smooth((t - T.brought + 0.1) / 0.3);
  const target = mix3(pocket, offer, out);
  const r = ik(WALT, W_NOW, yaw, "R", target, 6);
  let armR: [number, number] = mixArm([16, 10], r.arm, reach);
  let fwdR = lerp(10, r.fwd, reach);
  const toss = window01(t, BREAD_T0 - 0.25, BREAD_T0 + 0.3, 0.15, 0.2);
  if (toss > 0) {
    armR = mixArm(armR, t < BREAD_T0 ? [50, 110] : [95, 30], toss);
    fwdR = lerp(fwdR, 60, toss);
  }
  const pose: BodyPose = { lean: 8, armR, armRFwd: fwdR, armL: [20, 30], armLFwd: 20, headNod: 12, headTilt: 10 * guilty, headStretch: track([[0, 1.05], [T.the_gull3 + 0.3, 1]], t) };
  const face = t < T.it4 ? F("wide", "o", "raised") : t < T.reaches ? F("open", "wavy", "worried", { sweat: true }) : t < T.brought ? F("half", "smirk", "raised") : F("squint", "beam", "raised");
  const bread = t > T.reaches + 0.25 && t < BREAD_T0 ? add(hand(WALT, W_NOW, yaw, pose, "R"), [0, 0.05, 0]) : undefined;
  return { actor: { spec: WALT, p: W_NOW, yaw, pose, face }, bread };
};
const breadAt = (t: number): V3 | null => {
  const b = waltNow(t).bread;
  if (b) return b;
  if (t >= BREAD_T0 && t < BREAD_T1) {
    const from = waltNow(BREAD_T0 - 0.01).bread ?? add(W_NOW, [0, 1.0, 0]);
    return ballistic(from, add(gullNow(BREAD_T1).p, [Math.sin(gullNow(BREAD_T1).yaw) * 0.25, 0.47, Math.cos(gullNow(BREAD_T1).yaw) * 0.25]), BREAD_T0, BREAD_T1, t);
  }
  return null;
};
const S8: Scene = {
  id: 8, t0: T.the_gull3, mood: "night", set: "point", sky: true, blur: 1.6,
  cam: (t) =>
    direct(
      [
        { p: (tt) => add(gullNow(tt).p, [0, 0.35, 0]), r: 0.6, w: (tt) => track([[0, 1], [T.it4, 1], [T.reaches, 0.6, "inout"], [T.brought, 0.8, "inout"], [BREAD_T1, 1]], tt) },
        { p: () => add(W_NOW, [0, 1.35, 0]), r: 0.95, w: (tt) => track([[0, 0.2], [T.showing, 0.6, "inout"], [T.walt4, 1, "inout"]], tt) },
        { p: (tt) => breadAt(tt) ?? add(W_NOW, [0, 0.9, 0]), r: 0.3, w: (tt) => track([[0, 0], [T.pocket - 0.1, 0], [T.pocket + 0.1, 0.6, "inout"], [BREAD_T1 + 0.1, 0.6], [BREAD_T1 + 0.3, 0, "inout"]], tt) },
      ],
      { az: (tt) => track([[0, 0.45], [T.it4, 0.35, "inout"], [T.walt4, 0.65, "inout"], [SECONDS, 0.85, "inout"]], tt), el: (tt) => track([[0, 0.15], [BREAD_T1, 0.2], [SECONDS, 0.4, "inout"]], tt), fov: 56, minR: 1.05, lead: 0.15, face: 0.47, inside: ROOM, room: (tt) => track([[0, 1.35], [BREAD_T1 + 0.1, 1.35], [SECONDS, 1.65, "inout"]], tt) },
      t,
    ),
  actors: (t) => [waltNow(t).actor],
  gull: gullNow,
  lamp: (t) => lampState(t, 0, { feathers: true, lockNew: 1, crumbs: t > BREAD_T1 }),
  extra: (t) => {
    const b = breadAt(t);
    return b ? { bread: { p: b, s: 1.0, rot: t > BREAD_T0 ? t * 9 : 0 } } : {};
  },
  focus: (t) => add(gullNow(t).p, [0, 0.4, 0]),
};

export const SCENES: Scene[] = [S1, S2, S3, S4, S5, S6, S7, S8];
export const sceneAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < SCENES.length; k++) if (SCENES[k].t0 <= t) i = k;
  return SCENES[i];
};
export const GULL_EVENTS = () => ({
  on1: T.on914, on2: T.on2, scare: scareAt, lock: T.lock, checks: T.checks, fine: T.fine, watch: T.w914b, feathers: T.there, climb0: T.so, climb1: T.at913,
  t913: T.t913, flapping: T.flapping, lands: T.lands, hop: T.waddles, pecks: [T.pecks, T.big + 0.05, T.switch2 - 0.05], lever: LEVER_DOWN, light: LEVER_DOWN + 0.35,
  flipped: T.flipped, crust0: CRUST_T0, crust1: CRUST_T1, glare: T.it4, pocket: T.reaches, bread0: BREAD_T0, bread1: BREAD_T1, cuts: SCENES.map((s) => s.t0),
});
