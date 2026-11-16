// The Dagen H short as DATA: 14 setups anchored to words of the voice, camera keys that start 6 frames before their
// word, the actors and each set's state. A setup may `follow` a moving car (keys are then car-relative).
import type { CharacterSpec, FaceState, HandPropKind, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { CAST } from "../inkbeat/char/cast";
import { handWorld, solveArm } from "../inkbeat/core/ik";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { CLERK, DRIVER, DRIVER2, OFFICIAL, POLICE, VOTER } from "./cast";
import { CURB, DRIVER_LOCAL, ROAD_Z, STAMP_PAPER, WHEEL_LOCAL } from "./world";
import type { CarState } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
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

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: BodyPose; face?: FaceState; hold?: HandPropKind | null; holdSide?: "L" | "R"; ik?: boolean };
export type Key = { at: number; cam: Cam; dur?: number };
export type SetName = "street" | "vote" | "stamp" | "border" | "country" | "chart";
export type World = {
  cars?: CarState[];
  minutes?: number;
  lamps?: number;
  count?: number;
  ballot?: V3 | null;
  stamped?: number;
  stampY?: number;
  fall?: number;
  reveal?: number;
};
export type Setup = {
  id: number;
  t0: number;
  mood: string;
  set: SetName;
  keys: Key[];
  actors: (t: number) => Actor[];
  world: (t: number) => World;
  focus: V3;
  blur: number;
  whip?: boolean;
  shake?: number[];
  sky?: boolean;
  /** the camera rides along: added to every key's pos and look */
  follow?: (t: number) => V3;
};

// faces
const WAIT: FaceState = { eyes: "half", mouth: "flat", brows: "neutral" };
const CURIOUS: FaceState = { eyes: "open", mouth: "smile", brows: "raised" };
const SHOCK: FaceState = { eyes: "wide", mouth: "o", brows: "raised" };
const STERN: FaceState = { eyes: "squint", mouth: "flat", brows: "angry" };
const SMUG: FaceState = { eyes: "half", mouth: "smirk", brows: "raised" };
const HAPPY: FaceState = { eyes: "open", mouth: "grin", brows: "raised" };
const TENSE: FaceState = { eyes: "squint", mouth: "frown", brows: "worried", sweat: true };
const GRUMPY: FaceState = { eyes: "squint", mouth: "frown", brows: "angry" };

// ------------------------------------------------------------------ times
const T = {
  every: W("every"), stops: W("stops"), millions: W("millions"), still: W("still"), nothing: W("nothing"), minutes: W("minutes"),
  then: W("then"), other: W("other"), its: W("it's"), switching: W("switching"), right1: W("right", 1), twelve: W("twelve"),
  voted: W("voted"), about: W("about"), no: W("no"), the_gov: W("government") - 0.07, anyway: W("anyway"), their: W("their"),
  right2: W("right", 2), and_sw: W("swedish") - 0.11, left2: W("left", 2), the_res: W("result") - 0.06, in_m: W("in", 2),
  fell: W("fell"), because: W("because"), carefully: W("carefully"), the_last: W("last") - 0.06, joins: W("joins"), five2: W("five", 2),
};
const at = (w: number) => w - 0.2;

// ------------------------------------------------------------------ the street's cars over time
const COLORS = ["#c8a040", "#3a6a9a", "#e8e0d0", "#6a8a5a", "#9a3a3a", "#4a4a5a"];
const FAR_X = [-10, 0, 10]; // facing +x, in the LEFT lane (z < 0) until the switch, then to +z
const NEAR_X = [-12, -2, 8]; // facing -x, in the +z lane until the switch, then to -z
const LAST: V3 = [-22, 0, -ROAD_Z];
const CROSS = { far: [T.then + 0.1, T.then + 1.5], near: [T.then + 1.3, T.then + 2.7] };
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
/** `post`: the cars already crossed (the later street setups) */
export const streetCars = (t: number, lastCross = 0): CarState[] => {
  const roll = 1 - smooth(clamp(t / T.stops)); // before "stops" everyone rolls to a halt
  const cars: CarState[] = [];
  FAR_X.forEach((x0, i) => {
    const u = clamp((t - CROSS.far[0]) / (CROSS.far[1] - CROSS.far[0]));
    const e = ease(u);
    const x = x0 + 3 * e - 6 * roll * roll;
    const z = lerp(-ROAD_Z, ROAD_Z, smooth(u));
    const yaw = -Math.atan2(2 * ROAD_Z * 6 * u * (1 - u), 3) * (u > 0 && u < 1 ? 1 : 0);
    cars.push({ p: [x, 0, z], yaw, color: COLORS[i], d: x, lights: 1 });
  });
  NEAR_X.forEach((x0, i) => {
    const u = clamp((t - CROSS.near[0]) / (CROSS.near[1] - CROSS.near[0]));
    const e = ease(u);
    const x = x0 - 3 * e + 6 * roll * roll;
    const z = lerp(ROAD_Z, -ROAD_Z, smooth(u));
    const yaw = PI - Math.atan2(2 * ROAD_Z * 6 * u * (1 - u), 3) * (u > 0 && u < 1 ? 1 : 0);
    cars.push({ p: [x, 0, z], yaw, color: COLORS[i + 3], d: -x, lights: 1 });
  });
  // the last car: still on the left until the very end
  const u = clamp(lastCross);
  const lx = LAST[0] - 6 * roll * roll + 3.5 * ease(u);
  cars.push({ p: [lx, 0, lerp(-ROAD_Z, ROAD_Z, smooth(u))], yaw: -Math.atan2(2 * ROAD_Z * 6 * u * (1 - u), 3.5) * (u > 0 && u < 1 ? 1 : 0), color: "#d8402e", d: lx, lights: 1 });
  return cars;
};
const minutesAt = (t: number) => (t < T.nothing ? 50 : t < T.then ? 50 + 9 * smooth((t - T.nothing) / (T.then - T.nothing)) : t < T.the_last ? 59 : 59 + smooth((t - T.joins) / 1.2));

// ------------------------------------------------------------------ the open car on the country road
const carDriver = (car: CarState, face: FaceState, lean = 0, grip = 0.12): Actor => {
  const c = Math.cos(car.yaw);
  const s = Math.sin(car.yaw);
  const w = (l: V3): V3 => [car.p[0] + l[0] * c + l[2] * s, car.p[1] + l[1], car.p[2] - l[0] * s + l[2] * c];
  const p = w(DRIVER_LOCAL);
  const yaw = car.yaw + PI / 2;
  const rimL = w([WHEEL_LOCAL[0] - 0.04, WHEEL_LOCAL[1] + 0.05, WHEEL_LOCAL[2] + grip]);
  const rimR = w([WHEEL_LOCAL[0] - 0.04, WHEEL_LOCAL[1] + 0.05, WHEEL_LOCAL[2] - grip]);
  // solve in a car-local frame so the cache stays warm while the car moves
  const local = (side: "L" | "R", target: V3) => {
    const rel: V3 = [target[0] - p[0], target[1] - p[1], target[2] - p[2]];
    return solveArm({ position: [0, 0, 0], yaw, side, target: [Math.round(rel[0] * 200) / 200, Math.round(rel[1] * 200) / 200, Math.round(rel[2] * 200) / 200], height: DRIVER.height, build: DRIVER.build, base: { lean } });
  };
  const L = local("L", rimL);
  const R = local("R", rimR);
  return { spec: DRIVER, p, yaw, ik: true, face, pose: { armL: L.arm, armLFwd: L.fwd, armR: R.arm, armRFwd: R.fwd, lean, headNod: lean ? -6 : 0 } };
};
const OPEN_COLOR = "#2a7a8a";
const openCarAt = (t: number, t0: number, x0: number, v: number, z: number): CarState => ({ p: [x0 + v * (t - t0), 0, z], yaw: 0, color: OPEN_COLOR, d: x0 + v * (t - t0), open: true });

// ------------------------------------------------------------------ the voter, the official
const VOTER_P: V3 = [-0.5, 0, -1.15];
const BALLOT: V3 = [0.12, 1.5, -0.62];
const SLOT: V3 = [0.2, 1.27, -0.6];
const voterPose = (t: number): BodyPose => {
  const u = clamp((t - T.voted + 0.1) / 0.4);
  const target: V3 = [lerp(BALLOT[0] - 0.04, SLOT[0] - 0.02, u), lerp(BALLOT[1], 1.42, u), lerp(BALLOT[2] - 0.04, SLOT[2], u)];
  const a = solveArm({ position: VOTER_P, yaw: 0.5, side: "R", target: [target[0], Math.round(target[1] * 100) / 100, target[2]], height: VOTER.height, build: VOTER.build, base: { lean: 8 } });
  return { armR: a.arm, armRFwd: a.fwd, armL: [10, 0], lean: 8, headNod: 14 };
};
/** the ballot: in her hand until she lets go over the slot, then it drops in */
const ballotAt = (t: number): V3 | null => {
  const rel = T.voted + 0.32;
  if (t < rel) {
    const h = handWorld({ position: VOTER_P, yaw: 0.5, height: VOTER.height, build: VOTER.build, pose: voterPose(t), side: "R" });
    return [h[0], h[1] + 0.08, h[2]];
  }
  const h = handWorld({ position: VOTER_P, yaw: 0.5, height: VOTER.height, build: VOTER.build, pose: voterPose(rel), side: "R" });
  const u = clamp((t - rel) / 0.25);
  if (u >= 1) return null;
  return [lerp(h[0], SLOT[0], u), lerp(h[1] + 0.08, SLOT[1] - 0.06, u * u), lerp(h[2], SLOT[2], u)];
};
const OFF_P: V3 = [0.0, 0, -0.66];
export const STAMP_AT: V3 = [STAMP_PAPER[0], 0, STAMP_PAPER[2] - 0.08];
const stampY = (t: number) => {
  const up = smooth((t - T.the_gov) / 0.3);
  const down = clamp((t - (T.anyway - 0.08)) / 0.08);
  const lift = smooth((t - T.anyway - 0.35) / 0.3);
  return lerp(lerp(0.88, 1.02, up), 0.818, down) + 0.12 * lift;
};
const officialPose = (t: number): BodyPose => {
  const target: V3 = [STAMP_AT[0], stampY(t) + 0.16, STAMP_AT[2]];
  const a = solveArm({ position: OFF_P, yaw: 0, side: "R", target: [target[0], Math.round(target[1] * 100) / 100, target[2]], height: OFFICIAL.height, build: OFFICIAL.build, base: { lean: 10 } });
  return { armR: a.arm, armRFwd: a.fwd, armL: [14, 0], lean: 10, headNod: 18 };
};

// ------------------------------------------------------------------ the setups
const CLOCK_FACE: V3 = [-6, 3.86, -(CURB + 0.9)];
export const SETUPS: Setup[] = [
  // 1. At ten to five on a Sunday morning, every car in Sweden stops: the clock, then the street
  {
    id: 1, t0: 0, mood: "night", set: "street", focus: CLOCK_FACE, blur: 1.0, sky: true,
    keys: [
      { at: 0, cam: C([-5.0, 3.4, -1.3], CLOCK_FACE, 38) },
      { at: at(T.every), cam: C([-2.5, 2.6, 9.5], [0, 0.9, -2], 50), dur: 0.9 },
      { at: at(T.stops), cam: C([-1.6, 2.3, 8.2], [0, 0.9, -2], 50) },
    ],
    actors: () => [{ spec: POLICE, p: [4.5, 0, 0], yaw: 0.3, face: STERN, pose: { armR: [160, 10], armRFwd: 10, armL: [12, 0] } }],
    world: (t) => ({ cars: streetCars(t), minutes: 50 }),
  },
  // 2. Millions of people sit still: a driver waits over his car roof, checking his watch
  {
    id: 2, t0: T.millions, mood: "night", set: "street", focus: [-2.6, 1.5, -2.95], blur: 1.6, sky: true,
    keys: [{ at: T.millions, cam: C([-0.6, 2.0, 2.6], [-2.6, 1.3, -2.95], 44) }, { at: at(T.still), cam: C([-1.2, 1.9, 1.6], [-2.6, 1.35, -2.95], 42) }],
    actors: (t) => [
      { spec: DRIVER, p: [-2.6, 0, -2.95], yaw: 0.45, face: WAIT, pose: { armL: [62, 112], armLFwd: 70, armR: [14, 0], headNod: t < T.still ? 16 : 4 } },
      { spec: DRIVER2, p: [9.7, 0, -2.95], yaw: -0.4, face: GRUMPY, pose: { armL: [40, 90], armLFwd: -20, armR: [40, 90], armRFwd: -20 } },
      { spec: POLICE, p: [4.5, 0, 0], yaw: -0.4, face: STERN, pose: { armR: [160, 10], armRFwd: 10, armL: [12, 0] } },
    ],
    world: (t) => ({ cars: streetCars(t), minutes: 50 }),
  },
  // 3. Nothing moves for ten minutes: high and wide, then onto the clock as the minutes run
  {
    id: 3, t0: T.nothing, mood: "night", set: "street", focus: [0, 0.5, -2], blur: 0.5, sky: true,
    keys: [{ at: T.nothing, cam: C([-11, 8, 13], [-1, 0.5, -2], 46) }, { at: at(T.minutes), cam: C([-6.6, 4.3, 0.6], CLOCK_FACE, 40), dur: 0.8 }],
    actors: () => [
      { spec: CAST.elder, p: [-3.4, 0.16, -4.9], yaw: 0.2, face: CURIOUS, pose: { armL: [10, 0], armR: [10, 0] } },
      { spec: CAST.kid, p: [-4.3, 0.16, -4.85], yaw: 0.35, face: HAPPY, pose: { armL: [150, 20], armR: [12, 0] } },
    ],
    world: (t) => ({ cars: streetCars(t), minutes: minutesAt(t) }),
  },
  // 4. Then everyone slowly crosses to the other side of the road
  {
    id: 4, t0: T.then, mood: "night", set: "street", focus: [0, 0.6, 0], blur: 0.6, sky: true,
    keys: [{ at: T.then, cam: C([7, 6.0, 10], [0, 0.3, -0.5], 50) }, { at: at(T.other), cam: C([2.5, 5.0, 11], [-1, 0.3, -0.5], 50), dur: 0.9 }],
    actors: () => [
      { spec: POLICE, p: [3.0, 0.16, -4.7], yaw: 0.2, face: STERN, pose: { armR: [100, 20], armRFwd: 70, armL: [12, 0] } },
      { spec: CAST.elder, p: [-3.4, 0.16, -4.9], yaw: 0.2, face: SHOCK, pose: { armL: [10, 0], armR: [10, 0] } },
      { spec: CAST.kid, p: [-4.3, 0.16, -4.85], yaw: 0.35, face: HAPPY, pose: { armL: [150, 20], armR: [150, 20] } },
    ],
    world: (t) => ({ cars: streetCars(t), minutes: 59 }),
  },
  // 5. It's 1967, and Sweden is switching from driving on the left to driving on the right: banner, H sign
  {
    id: 5, t0: T.its, mood: "night", set: "street", focus: [-1.5, 5.4, 0], blur: 0.8, sky: true,
    keys: [
      { at: T.its, cam: C([3.0, 1.5, 4.2], [-1.5, 5.2, 0], 50) },
      { at: at(T.switching), cam: C([6.4, 2.1, 1.4], [4.2, 2.9, -4.2], 44), dur: 0.8 },
      { at: at(T.right1), cam: C([5.6, 2.4, 0.2], [4.2, 2.95, -4.2], 42) },
    ],
    actors: () => [{ spec: POLICE, p: [3.0, 0.16, -4.7], yaw: 0.5, face: SMUG, pose: { armR: [100, 30], armRFwd: 20, armL: [12, 0] } }],
    world: (t) => ({ cars: streetCars(t), minutes: 59 }),
  },
  // 6. Twelve years earlier, the country voted on it: the ballot goes in
  {
    id: 6, t0: T.twelve, mood: "cold", set: "vote", focus: [0.2, 1.3, -0.9], blur: 1.4, whip: true,
    keys: [{ at: T.twelve, cam: C([1.5, 1.95, 2.0], [-0.15, 1.3, -0.9], 44) }, { at: at(T.voted), cam: C([1.1, 1.9, 1.3], [-0.1, 1.3, -0.9], 42) }],
    actors: (t) => [{ spec: VOTER, p: VOTER_P, yaw: 0.5, ik: true, face: STERN, pose: voterPose(t) }],
    world: (t) => ({ count: 0, ballot: ballotAt(t) }),
  },
  // 7. About eighty-three percent said no: the NEJ bar climbs
  {
    id: 7, t0: T.about, mood: "cold", set: "vote", focus: [1.9, 1.8, -2.4], blur: 1.4,
    keys: [{ at: T.about, cam: C([0.4, 1.9, 0.9], [1.8, 1.8, -2.3], 46) }, { at: T.no - 0.04, cam: C([0.75, 2.05, 0.15], [1.7, 2.1, -2.3], 46), dur: 0.22 }],
    actors: () => [{ spec: VOTER, p: [-0.6, 0, -0.9], yaw: 0.9, face: SMUG, pose: { armL: [40, 90], armLFwd: -20, armR: [40, 90], armRFwd: -20 } }],
    world: (t) => ({ count: smooth((t - W("eighty-three")) / 1.0) }),
    shake: [T.no],
  },
  // 8. The government did it anyway: the stamp comes down
  {
    id: 8, t0: T.the_gov, mood: "lamp", set: "stamp", focus: [0.1, 0.95, -0.1], blur: 1.6, whip: true,
    keys: [{ at: T.the_gov, cam: C([1.3, 1.75, 2.1], [0.0, 1.15, -0.4], 44) }, { at: T.anyway - 0.05, cam: C([1.0, 1.6, 1.55], [0.05, 1.05, -0.3], 44), dur: 0.22 }],
    actors: (t) => [{ spec: OFFICIAL, p: OFF_P, yaw: 0, ik: true, face: t < T.anyway ? STERN : SMUG, pose: officialPose(t) }],
    world: (t) => ({ stamped: clamp((t - T.anyway) / 0.25), stampY: stampY(t) }),
    shake: [T.anyway],
  },
  // 9. Their neighbours all drove on the right: the Norway border, Norwegian cars on the right
  {
    id: 9, t0: T.their, mood: "day", set: "border", focus: [-2, 1, 1], blur: 0.6, whip: true, sky: true,
    keys: [{ at: T.their, cam: C([-7, 6.5, 14], [-2, 0.6, 0], 48) }, { at: at(T.right2), cam: C([-5, 3.5, 9.5], [-2.5, 1.2, 1], 46), dur: 0.8 }],
    actors: () => [],
    world: (t) => {
      const u = t - T.their;
      return {
        cars: [
          { p: [-20 + 6 * u, 0, ROAD_Z], yaw: 0, color: "#3a6a9a", d: 6 * u },
          { p: [-4 - 5 * u, 0, -ROAD_Z], yaw: PI, color: "#e8e0d0", d: 5 * u },
          { p: [7, 0, -ROAD_Z], yaw: 0, color: "#d8402e", d: 0 },
        ],
      };
    },
  },
  // 10. and Swedish cars had the steering wheel on the left: ride along with an open car, driver at the left
  {
    id: 10, t0: T.and_sw, mood: "day", set: "country", focus: [-0.3, 1.4, -ROAD_Z - 0.38], blur: 1.2, whip: true, sky: true,
    follow: (t) => [9 * (t - T.and_sw), 0, 0],
    keys: [
      { at: T.and_sw, cam: C([3.6, 2.9, -ROAD_Z + 2.4], [-0.2, 1.1, -ROAD_Z - 0.3], 46) },
      { at: at(T.left2), cam: C([2.2, 2.2, -ROAD_Z + 1.4], [0.0, 1.1, -ROAD_Z - 0.38], 42), dur: 0.7 },
    ],
    actors: (t) => [carDriver(openCarAt(t, T.and_sw, 0, 9, -ROAD_Z), HAPPY)],
    world: (t) => ({ cars: [openCarAt(t, T.and_sw, 0, 9, -ROAD_Z)] }),
  },
  // 11. The result surprised everyone: the chart goes up, two men stare
  {
    id: 11, t0: T.the_res, mood: "golden", set: "chart", focus: [0.4, 1.6, -1.6], blur: 1.2, whip: true,
    keys: [{ at: T.the_res, cam: C([0.3, 1.75, 4.0], [0.45, 1.55, -1.6], 46) }, { at: at(W("surprised")), cam: C([0.4, 1.7, 3.2], [0.45, 1.55, -1.6], 46) }],
    actors: (t) => [
      { spec: OFFICIAL, p: [-0.3, 0, -0.5], yaw: 0.3, face: t < W("surprised") ? CURIOUS : SHOCK, pose: { armL: [20, 10], armR: t < W("surprised") ? [20, 10] : [120, 120], armRFwd: 40 } },
      { spec: CLERK, p: [1.25, 0, -1.25], yaw: -0.6, face: HAPPY, pose: { armR: [110, 20], armRFwd: -10, armL: [14, 0] } },
    ],
    world: (t) => ({ reveal: clamp((t - T.the_res) / 0.3), fall: 0 }),
  },
  // 12. In the months after, accidents fell
  {
    id: 12, t0: T.in_m, mood: "golden", set: "chart", focus: [0.6, 1.9, -2.4], blur: 1.6,
    keys: [{ at: T.in_m, cam: C([1.1, 1.95, 0.0], [0.6, 1.85, -2.4], 44) }, { at: at(T.fell), cam: C([0.9, 1.95, -0.6], [0.65, 1.8, -2.4], 42), dur: 0.6 }],
    actors: () => [],
    world: (t) => ({ reveal: 1, fall: clamp((t - W("accidents")) / 0.9) }),
  },
  // 13. because everyone drove carefully: the open car, slow, on the right now, driver hunched and tense
  {
    id: 13, t0: T.because, mood: "day", set: "country", focus: [-0.3, 1.4, ROAD_Z - 0.38], blur: 1.2, whip: true, sky: true,
    follow: (t) => [3.5 * (t - T.because), 0, 0],
    keys: [
      { at: T.because, cam: C([4.6, 1.8, ROAD_Z + 1.6], [-0.3, 1.3, ROAD_Z - 0.38], 44) },
      { at: at(T.carefully), cam: C([3.0, 1.6, ROAD_Z + 0.8], [-0.3, 1.35, ROAD_Z - 0.38], 40), dur: 0.7 },
    ],
    actors: (t) => [carDriver(openCarAt(t, T.because, 0, 3.5, ROAD_Z), TENSE, 12, 0.1)],
    world: (t) => ({ cars: [openCarAt(t, T.because, 0, 3.5, ROAD_Z), { p: [26 - 4 * (t - T.because), 0, -ROAD_Z], yaw: PI, color: "#c8a040", d: 4 * t }] }),
  },
  // 14. The last car joins the right-hand side at five: dawn, the clock on five, the red car crosses
  {
    id: 14, t0: T.the_last, mood: "dusk", set: "street", focus: [-20, 0.8, 0], blur: 0.6, whip: true, sky: true,
    keys: [
      { at: T.the_last, cam: C([-15, 2.2, 9.5], [-20.5, 0.8, -0.5], 48) },
      { at: at(T.five2), cam: C([-9, 7.5, 17], [-14, 0.6, -1.5], 50), dur: SECONDS - T.five2 },
    ],
    actors: () => [{ spec: POLICE, p: [-17.5, 0.16, -4.7], yaw: 0.4, face: HAPPY, pose: { armR: [120, 30], armRFwd: 40, armL: [12, 0] } }],
    world: (t) => ({ cars: streetCars(t, (t - T.joins) / 1.5), minutes: minutesAt(t), lamps: 0.6 }),
  },
];

// ------------------------------------------------------------------ the camera
const easeC = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const mixV = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
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
    c = { pos: mixV(c.pos, key.cam.pos, e), look: mixV(c.look, key.cam.look, e), fov: lerp(c.fov, key.cam.fov, e), roll: 0 };
  }
  const dt = t - s.t0;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const k = Math.min(0.12, 0.03 * dt);
  let pos: V3 = [c.pos[0] + d[0] * k, c.pos[1] + d[1] * k, c.pos[2] + d[2] * k];
  const rel = rotY([pos[0] - c.look[0], pos[1] - c.look[1], pos[2] - c.look[2]], ((1.5 * PI) / 180) * dt);
  pos = [c.look[0] + rel[0], pos[1], c.look[2] + rel[2]];
  let look = c.look;
  if (s.follow) {
    const f = s.follow(t);
    pos = [pos[0] + f[0], pos[1] + f[1], pos[2] + f[2]];
    look = [look[0] + f[0], look[1] + f[1], look[2] + f[2]];
  }
  const next = SETUPS[i + 1];
  const pan = (deg: number) => {
    const r = rotY([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]], (deg * PI) / 180);
    look = [pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]];
  };
  if (next?.whip && end - t < 0.1) pan(-28 * Math.pow(1 - (end - t) / 0.1, 2));
  if (s.whip && dt < 0.14) pan(28 * Math.pow(1 - dt / 0.14, 2));
  let shake = 0;
  for (const st of s.shake ?? []) {
    const x = t - st;
    if (x >= 0 && x < 0.4) shake = Math.max(shake, (1 - x / 0.4) * Math.sin(x * 70));
  }
  return { pos, look, fov: c.fov, roll: 0, shake };
};
export { handWorld, q };
