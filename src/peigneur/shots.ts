// The Lake Peigneur short as DATA: 14 setups anchored to words of the voice (never typed times). Camera keys are ~0.6 s
// eased moves that start 6 frames before their word; actors and set state are pure functions of t.
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { CREW1, CREW2, FISHER, MINER1, MINER2, MINER3 } from "./cast";
import { BOAT_TOP, RIG_P } from "./world";
import type { BargeState, BoatState, LakeState, RigState, SectionState } from "./world";
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

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: BodyPose; face?: FaceState; ik?: boolean };
export type Key = { at: number; cam: Cam; dur?: number };
export type Setup = {
  id: number;
  t0: number;
  mood: string;
  set: "lake" | "section";
  keys: Key[];
  actors: (t: number) => Actor[];
  lake?: (t: number) => LakeState;
  section?: (t: number) => SectionState;
  focus: V3;
  blur: number;
  whip?: boolean;
  shake?: number[];
  sky?: boolean;
};

// faces
const CALM: FaceState = { eyes: "half", mouth: "smile", brows: "neutral" };
const WORRY: FaceState = { eyes: "wide", mouth: "frown", brows: "worried", sweat: true };
const SHOCK: FaceState = { eyes: "wide", mouth: "o", brows: "raised" };
const YELL: FaceState = { eyes: "wide", mouth: "yell", brows: "worried", sweat: true };

const HAPPY: FaceState = { eyes: "open", mouth: "grin", brows: "raised" };
const RELIEF: FaceState = { eyes: "half", mouth: "smile", brows: "worried", flush: 0.2 };
const CURIOUS: FaceState = { eyes: "open", mouth: "smile", brows: "raised", look: -0.3 };

// ------------------------------------------------------------------ times
const T = {
  fisher: W("fisherman"), small: W("small"), water: W("water"), move: W("move"), tips: W("tips"), looks: W("looks"), lean: W("lean"), go: W("go"),
  its: W("it's"), drill: W("drill"), fourteen: W("fourteen-inch"), bed: W("bed"), beneath: W("beneath"), salt: W("salt"), miners: W("miners"),
  lake_pours: W("pours") - 0.4, pours: W("pours"), hole2: W("hole", 2) - 0.05, whirl: W("whirlpool"), swallows: W("swallows") - 0.08,
  rig2: W("rig", 2), row: W("row"), barges: W("barges"), part: W("part"), island: W("island"), canal: W("canal") - 0.05, flowing: W("flowing"),
  backwards: W("backwards"), every: W("every") - 0.04, nobody: W("nobody"), then3: W("then", 3) - 0.06, fills: W("fills"), comes: W("comes"),
  deeper: W("deeper"), before: W("before"),
};
const at = (w: number) => w - 0.2;

// ------------------------------------------------------------------ the lake over time
const BOAT: V3 = [-1.5, 0, 7];
const levelAt = (t: number) => (t < 17.2 ? 0 : t < T.then3 ? -1.45 * smooth((t - 17.2) / 6.6) : lerp(-1.45, 0.4, smooth((t - T.then3) / 3.0)));
const depthAt = (t: number) => 3.6 * smooth((t - T.hole2) / 1.5) * (1 - smooth((t - (T.then3 + 0.1)) / 2.2));
const holeAt = (t: number) => (t < T.then3 ? 1 : 1 - smooth((t - T.then3 - 0.3) / 2.4));
const rigEarly = (t: number): RigState => ({ tilt: 0.45 * smooth((t - 7.3) / 0.7) + 0.5 * smooth((t - T.go) / 0.8), sink: 17 * smooth((t - T.go - 0.1) / 1.2) });
const rigWhirl = (t: number): RigState => (t < T.swallows - 0.3 ? { tilt: 0, sink: 0 } : { tilt: 0.9 * smooth((t - T.swallows) / 0.8), sink: 17 * smooth((t - T.swallows - 0.35) / 1.0) });
/** boat bobbing at the water level, drifting toward the rig as the water starts to move, rolling when it tips */
const boatAt = (t: number): BoatState => {
  const drift = smooth((t - T.water) / 1.8);
  const dx = RIG_P[0] - BOAT[0];
  const dz = RIG_P[2] - BOAT[2];
  const L = Math.hypot(dx, dz);
  const roll = 0.4 * smooth((t - T.tips) / 0.25) * (1 - smooth((t - 5.9) / 1.1)) + 0.04 * Math.sin(q(t) * 2.2);
  return { p: [BOAT[0] + (dx / L) * 0.9 * drift, levelAt(t) + 0.1 * Math.sin(q(t) * 1.8) - 0.18, BOAT[2] + (dz / L) * 0.9 * drift], roll, yaw: -0.25 };
};
/** the barges: sit around the whirl, then spiral in and go under one after another */
const BARGE_N = 5;
const bargesAt = (t: number): BargeState[] => {
  if (t < T.whirl - 0.4) return [];
  const out: BargeState[] = [];
  for (let i = 0; i < BARGE_N; i++) {
    const t0 = T.barges - 0.2 + i * 0.28;
    const th0 = 0.6 + i * 1.25;
    const r0 = 14 + (i % 3) * 2.2;
    const u = clamp((t - t0) / 1.9);
    if (u >= 1) continue;
    const r = r0 * (1 - Math.pow(u, 1.4));
    const th = th0 + 0.04 * (t - T.whirl) + 3.4 * u * u;
    const y = levelAt(t) - 0.15 - 3.2 * clamp((u - 0.75) / 0.25);
    out.push({ p: [RIG_P[0] + Math.cos(th) * r, y, RIG_P[2] + Math.sin(th) * r], yaw: Math.atan2(-Math.cos(th), -Math.sin(th)), tilt: 0.7 * u * u });
  }
  return out;
};
const lakeBase = (t: number, over: Partial<LakeState> = {}): LakeState => {
  const back = T.backwards;
  const phase = 3.2 * Math.min(t, back) - 3.2 * Math.max(0, t - back);
  return {
    level: levelAt(t), depth: depthAt(t), hole: holeAt(t), rig: null, barges: [], chunkSink: smooth((t - 20.7) / 1.3),
    canalPhase: phase, canalDir: t < back ? 1 : -1, boat: null, t, spin: t * 1.5, ...over,
  };
};

// ------------------------------------------------------------------ the section over time
const sectionAt = (t: number): SectionState => ({
  tip: lerp(9.2, 3.0, smooth((t - 9.9) / 3.0)),
  gap: 0.2 + 0.9 * smooth((t - 15.8) / 1.4),
  pour: smooth((t - T.lake_pours) / 0.45),
  pool: 1.3 * smooth((t - T.lake_pours - 0.2) / 1.6),
  t,
});
const MINE_ACTORS = (t: number, panic: boolean): Actor[] => {
  const w = (a: number) => (panic ? a : 0);
  return [
    { spec: MINER1, p: [-2.0, 0, 0.5], yaw: 0.3, face: panic ? YELL : CALM, pose: panic ? { armL: [150, 30], armR: [150, 30], lean: -6 } : { armL: [20, 10], armR: [40, 80], armRFwd: 30 } },
    { spec: MINER2, p: [2.1, 0, 0.8], yaw: -0.3, face: panic ? SHOCK : CALM, pose: panic ? { armL: [120, 90], armLFwd: 40, armR: [120, 90], armRFwd: 40 } : { armL: [30, 60], armR: [14, 0] } },
    { spec: MINER3, p: [-3.9, 0, -0.5], yaw: 0.5, face: panic ? YELL : CALM, pose: { armL: [panic ? 160 : 14, 0], armR: [14 + w(120), 0], bob: Math.sin(q(t) * 3) * (panic ? 4 : 0) } },
  ];
};

// ------------------------------------------------------------------ the setups
const fisher = (t: number, face: FaceState, pose: BodyPose, yaw: number): Actor => {
  const b = boatAt(t);
  return { spec: FISHER, p: [b.p[0], b.p[1] + 0.06, b.p[2]], yaw, face, pose };
};
export const SETUPS: Setup[] = [
  // 1. A fisherman sits in a small boat on a Louisiana lake
  {
    id: 1, t0: 0, mood: "day", set: "lake", focus: [-1.5, 1.2, 7], blur: 1.2, sky: true,
    keys: [{ at: 0, cam: C([4.2, 2.2, 14.4], [-1.4, 1.4, 7.0], 50) }, { at: at(T.small), cam: C([2.6, 1.8, 11.4], [-1.5, 1.2, 7.0], 46), dur: 1.0 }],
    actors: (t) => [fisher(t, CALM, { armL: [25, 70], armLFwd: 35, armR: [45, 80], armRFwd: 40, headNod: 8 }, 1.1)],
    lake: (t) => lakeBase(t, { boat: boatAt(t), rig: rigEarly(t) }),
  },
  // 2. The water around him starts to move
  {
    id: 2, t0: T.water, mood: "day", set: "lake", focus: [-1.5, 0.6, 7], blur: 1.6, sky: true,
    keys: [{ at: T.water, cam: C([0.8, 0.95, 10.8], [-1.5, 0.45, 7.2], 44) }, { at: at(T.move), cam: C([0.2, 0.8, 9.6], [-1.5, 0.5, 7.0], 42), dur: 0.8 }],
    actors: (t) => [fisher(t, t < T.move ? CURIOUS : WORRY, { armL: [25, 70], armLFwd: 35, armR: [45, 80], armRFwd: 40, headNod: 6 }, 1.1)],
    lake: (t) => lakeBase(t, { boat: boatAt(t), rig: rigEarly(t) }),
  },
  // 3. The boat tips
  {
    id: 3, t0: T.tips - 0.05, mood: "day", set: "lake", focus: [-0.8, 1.2, 6.6], blur: 1.4, sky: true, shake: [T.tips],
    keys: [{ at: T.tips - 0.05, cam: C([3.0, 1.5, 9.8], [-0.8, 1.15, 6.7], 42) }, { at: at(T.looks), cam: C([2.5, 1.4, 9.0], [-0.8, 1.15, 6.7], 40), dur: 0.8 }],
    actors: (t) => [fisher(t, SHOCK, { armL: [140, 30], armR: [150, 40], lean: -8 }, 1.1)],
    lake: (t) => lakeBase(t, { boat: boatAt(t), rig: rigEarly(t) }),
  },
  // 4. He looks toward the oil rig, and watches it lean, and go under
  {
    id: 4, t0: T.looks, mood: "day", set: "lake", focus: [4, 6, -4], blur: 0.8, whip: true, sky: true,
    keys: [
      { at: T.looks, cam: C([-3.6, 1.7, 11.0], [1.4, 4.6, -3.0], 56) },
      { at: at(T.lean), cam: C([-2.4, 1.6, 10.2], [3.4, 6.0, -6.0], 56), dur: 0.9 },
      { at: at(T.go), cam: C([-1.4, 1.5, 9.4], [5.4, 4.4, -8.0], 54), dur: 0.9 },
    ],
    actors: (t) => [fisher(t, t < T.lean ? SHOCK : YELL, { armL: [130, 40], armR: [14, 0], headYaw: -10 }, 2.55)],
    lake: (t) => lakeBase(t, { boat: boatAt(t), rig: rigEarly(t) }),
  },
  // 5. It's 1980: the drill crew on the deck beside the shack
  {
    id: 5, t0: T.its, mood: "day", set: "lake", focus: [RIG_P[0] + 0.4, 5.2, RIG_P[2] + 3], blur: 1.4, whip: true, sky: true,
    keys: [{ at: T.its, cam: C([RIG_P[0] + 3.6, 5.2, RIG_P[2] + 9.2], [RIG_P[0] - 0.6, 5.0, RIG_P[2] + 3.0], 48) }, { at: at(T.drill), cam: C([RIG_P[0] + 2.4, 5.1, RIG_P[2] + 8.0], [RIG_P[0] - 0.4, 5.0, RIG_P[2] + 3.0], 44), dur: 0.8 }],
    actors: () => [
      { spec: CREW1, p: [RIG_P[0] + 0.5, 3.66, RIG_P[2] + 3.4], yaw: 0.4, face: CALM, pose: { armL: [14, 0], armR: [20, 10] } },
      { spec: CREW2, p: [RIG_P[0] + 1.9, 3.66, RIG_P[2] + 3.0], yaw: -0.4, face: CURIOUS, pose: { armL: [40, 90], armLFwd: 30, armR: [14, 0] } },
    ],
    lake: (t) => lakeBase(t, { rig: { tilt: 0, sink: 0 } }),
  },
  // 6. A drill crew has just punched a fourteen-inch hole through the lake bed
  {
    id: 6, t0: T.drill, mood: "day", set: "section", focus: [0, 8, 0], blur: 0.8, whip: true, sky: true,
    keys: [{ at: T.drill, cam: C([3, 11, 19], [0, 9.2, 0], 46) }, { at: at(T.fourteen), cam: C([1.6, 8.0, 12.4], [0, 6.6, 0], 42), dur: 1.0 }, { at: at(T.bed), cam: C([1.0, 5.6, 9.2], [0, 4.6, 0], 38), dur: 0.7 }],
    actors: () => [],
    section: sectionAt,
  },
  // 7. Beneath the lake is a salt mine, with miners inside: crane down through the cut
  {
    id: 7, t0: T.beneath, mood: "lamp", set: "section", focus: [0, 1.6, 0], blur: 1.2,
    keys: [{ at: T.beneath, cam: C([0.4, 6.4, 13.8], [0, 4.4, 0], 46) }, { at: at(T.salt), cam: C([0.4, 2.4, 11.0], [0, 1.5, 0], 50), dur: 0.9 }, { at: at(T.miners), cam: C([0.2, 1.9, 8.6], [-0.2, 1.4, 0], 48), dur: 0.7 }],
    actors: (t) => MINE_ACTORS(t, false),
    section: sectionAt,
  },
  // 8. The lake pours in: inside the mine, looking up at the hole
  {
    id: 8, t0: T.lake_pours, mood: "lamp", set: "section", focus: [0, 2.0, 0.2], blur: 1.4, whip: true, shake: [T.pours],
    keys: [{ at: T.lake_pours, cam: C([0.4, 1.5, 8.0], [0, 1.9, 0.2], 54) }, { at: at(T.hole2 + 0.2), cam: C([0.3, 1.4, 6.8], [0, 2.1, 0.2], 54), dur: 0.8 }],
    actors: (t) => MINE_ACTORS(t, true),
    section: sectionAt,
  },
  // 9. The hole becomes a whirlpool: high over the lake
  {
    id: 9, t0: T.hole2, mood: "day", set: "lake", focus: [RIG_P[0], -1, RIG_P[2]], blur: 0.5, whip: true, sky: true,
    keys: [{ at: T.hole2, cam: C([-6, 17, 17], [RIG_P[0], -0.5, RIG_P[2]], 50) }, { at: at(T.whirl), cam: C([-2, 12, 12], [RIG_P[0], -1.2, RIG_P[2]], 50), dur: 0.9 }],
    actors: () => [],
    lake: (t) => lakeBase(t, { rig: rigWhirl(t), barges: bargesAt(t) }),
  },
  // 10. It swallows the rig, then a row of barges, then part of an island
  {
    id: 10, t0: T.swallows, mood: "dusk", set: "lake", focus: [RIG_P[0], 2, RIG_P[2]], blur: 0.6, sky: true, shake: [T.swallows + 0.6],
    keys: [
      { at: T.swallows, cam: C([-3, 6.5, 19], [RIG_P[0] - 1, 3.2, RIG_P[2]], 52) },
      { at: at(T.row), cam: C([6, 10, 9], [RIG_P[0] - 1.5, -0.5, RIG_P[2] + 1], 54), dur: 0.9 },
      { at: at(T.part), cam: C([8, 9, 6], [-9, 0.2, -12.5], 52), dur: 0.8 },
    ],
    actors: () => [],
    lake: (t) => lakeBase(t, { rig: rigWhirl(t), barges: bargesAt(t) }),
  },
  // 11. The canal that feeds the lake starts flowing backwards
  {
    id: 11, t0: T.canal, mood: "dusk", set: "lake", focus: [56, 0, -9], blur: 0.7, whip: true, sky: true,
    keys: [{ at: T.canal, cam: C([43.5, 4.6, -9], [64, 0.2, -9], 56) }, { at: at(T.backwards), cam: C([46, 3.4, -9], [66, 0.3, -9], 56), dur: 0.9 }],
    actors: () => [],
    lake: (t) => lakeBase(t, { rig: null }),
  },
  // 12. Every miner gets out. Nobody dies: the three on the pier
  {
    id: 12, t0: T.every, mood: "golden", set: "lake", focus: [0, 1.6, 14], blur: 1.2, whip: true, sky: true,
    keys: [{ at: T.every, cam: C([2.8, 1.7, 6.5], [0, 1.5, 14.5], 44) }, { at: at(T.nobody), cam: C([1.4, 1.6, 8.6], [0, 1.5, 14.5], 42), dur: 0.8 }],
    actors: (t) => [
      { spec: MINER1, p: [-1.2, 0.42, 14.2], yaw: PI - 0.2, face: HAPPY, pose: { armL: [150, 0], armR: [150, 0], bob: 3 * Math.sin(q(t) * 5) } },
      { spec: MINER2, p: [0.1, 0.42, 13.6], yaw: PI + 0.1, face: RELIEF, pose: { armL: [14, 0], armR: [95, 120], armRFwd: 60 } },
      { spec: MINER3, p: [1.3, 0.42, 14.4], yaw: PI + 0.3, face: HAPPY, pose: { armL: [140, 0], armR: [14, 0] } },
    ],
    lake: (t) => lakeBase(t, {}),
  },
  // 13. Then the hole fills, and the lake comes back: the water climbs the bank
  {
    id: 13, t0: T.then3, mood: "golden", set: "lake", focus: [RIG_P[0], -0.4, RIG_P[2]], blur: 0.7, whip: true, sky: true,
    keys: [{ at: T.then3, cam: C([0, 3.0, 6], [RIG_P[0], -0.8, RIG_P[2]], 52) }, { at: at(T.comes), cam: C([4, 1.7, -1], [RIG_P[0], -0.2, RIG_P[2]], 50), dur: 1.4 }],
    actors: () => [],
    lake: (t) => lakeBase(t, {}),
  },
  // 14. deeper than before: the boat floats again, a slow crane up
  {
    id: 14, t0: T.deeper - 0.3, mood: "day", set: "lake", focus: [-1.5, 0.8, 7], blur: 0.8, sky: true,
    keys: [{ at: T.deeper - 0.3, cam: C([3.2, 1.5, 11.0], [-1.5, 0.9, 7.0], 46) }, { at: T.deeper, cam: C([-10, 10, 24], [0, -0.2, 2], 52), dur: SECONDS - T.deeper - 0.3 }],
    actors: (t) => [fisher(t, HAPPY, { armL: [150, 20], armR: [25, 70], armRFwd: 30 }, 1.1)],
    lake: (t) => lakeBase(t, { boat: { p: [BOAT[0], levelAt(t) + 0.1 * Math.sin(q(t) * 1.8) - 0.18, BOAT[2]], roll: 0.03 * Math.sin(q(t) * 2.2), yaw: -0.25 } }),
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
export { BOAT_TOP };
