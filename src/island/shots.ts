// The shots of "Same island" as pure DATA (no React): for every setup of the plan, the camera, the actors, the state
// of the world and the points the viewer must see. SameIsland.tsx draws it; plan/check_scene.ts verifies it.
// Camera grammar (after review): ONE intentional move per setup (a slow push, a track that follows the action, or a
// follow-cam), constant speed, always aimed at the subject; setups change on a clean cut. No whips, no shake.
import type { CharacterSpec, FaceState, Pose } from "../inkbeat/char/Character3D";
import { aim } from "../inkbeat/core/rig";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { FPS, SHOTS, WORDS } from "../plan.gen";
import { GRAFTON_CREW, INVER_CREW } from "./crew";
import { BOARD, SIGN, WRECKS, boatPose, groundAt, hutToWorld, onBoat } from "./layout";
import type { BoatPose } from "./layout";

export const PLAN = SHOTS as unknown as { id: string; t: number; end: number; mood: string }[];
type WordRow = [string, number, number];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** onset (s) of the nth occurrence of a word of the voice-over (never type a time) */
export const w = (word: string, nth = 1): number => {
  let k = 0;
  for (const [txt, t] of WORDS as unknown as WordRow[]) if (norm(txt) === norm(word) && ++k === nth) return t;
  throw new Error(`word not in the voice-over: ${word} #${nth}`);
};

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: Pose; face?: FaceState; hold?: "mug" | null; afloat?: boolean };
export type WorldState = { swell: number; hutLit: number; boat: "none" | "building" | BoatPose };
export type Setup = {
  /** what the shot is about (for the QA report) */
  about: string;
  /** u = 0..1 through the setup, t = film time, ts = time in the setup */
  cam: (u: number, t: number, ts: number) => Cam;
  actors: (t: number, ts: number) => Actor[];
  world: (t: number, ts: number) => WorldState;
  /** points that must stay inside the frame (the subject) */
  subject: (t: number, ts: number) => V3[];
  focus: (t: number, ts: number) => V3;
  /** index of the actor whose face gets the cast light */
  lead?: number;
  fogK?: number;
  blur: number;
};

const sin = Math.sin;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
const mix = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** a constant-speed move from one framing to another (both aimed at the subject) */
const move = (a: Cam, b: Cam) => (u: number): Cam => ({ pos: mix(a.pos, b.pos, u), look: mix(a.look, b.look, u), fov: a.fov + (b.fov - a.fov) * u, roll: 0 });
/** a standing spot on the ground */
const G = (x: number, z: number): V3 => [x, groundAt(x, z), z];
const head = (p: V3, h = 1.75): V3 => [p[0], p[1] + h * 0.88, p[2]];

const GLAD: FaceState = { eyes: "open", mouth: "smile", brows: "raised" };
const GRIN: FaceState = { eyes: "open", mouth: "grin", brows: "raised" };
const SAD: FaceState = { eyes: "half", mouth: "frown", brows: "worried" };
/** hammering: the right arm swings at 1.6 Hz (under the ~2 Hz strobing limit) */
const hammer = (t: number, ph = 0): Pose => ({ armL: [10, 0], armR: [96 + 26 * sin(t * 2 * Math.PI * 1.6 + ph), 66], armRFwd: 44, lean: 4 });
/** sawing / planing: both arms forward, pushing and pulling at 1.3 Hz */
const work = (t: number, ph = 0): Pose => {
  const k = sin(t * 2 * Math.PI * 1.3 + ph);
  return { armL: [42 + 7 * k, 48 - 9 * k], armLFwd: 70, armR: [42 + 7 * k, 48 - 9 * k], armRFwd: 70, lean: 10 + 2.5 * k };
};
const warm = (t: number, ph = 0): Pose => ({ armL: [48 + 3 * sin(t * 2 + ph), 40], armLFwd: 72, armR: [48 + 3 * sin(t * 2 + ph + 1), 40], armRFwd: 72, lean: 4 });
const mug: Pose = { armL: [6, 0], armR: [18, 92], armRFwd: 62 };
const cheer = (t: number, i: number): Pose => (i % 2 ? { armL: [8, 0], armR: [158 + 6 * sin(t * 6 + i), 10], armRFwd: 62 } : { armL: [156 + 6 * sin(t * 6 + i), 10], armLFwd: 62, armR: [158 + 6 * sin(t * 6 + i + 2), 10], armRFwd: 62 });

// ------------------------------------------------------------------ blocking shared by several setups
const hammerSpot = hutToWorld(-2.0, 2.75);
/** the Grafton camp at work: sawing at the crates, hammering at the hut, a mug, the cooking, warming at the fire */
const campWork = (t: number): Actor[] => [
  { spec: GRAFTON_CREW[4], p: G(-30.3, 5.2), yaw: -1.5, pose: work(t, 1.2), face: GLAD },
  { spec: GRAFTON_CREW[0], p: G(hammerSpot[0], hammerSpot[1]), yaw: 2.5, pose: hammer(t), face: GLAD },
  { spec: GRAFTON_CREW[3], p: G(-27.7, 6.5), yaw: 0.2, pose: mug, hold: "mug", face: GLAD },
  { spec: GRAFTON_CREW[1], p: G(-26.1, 6.6), yaw: 1.9, pose: { armL: [10, 0], armR: [58 + 6 * sin(t * 3.2), 78], armRFwd: 52 }, face: GRIN },
  { spec: GRAFTON_CREW[2], p: G(-23.6, 4.6), yaw: -1.1, pose: warm(t), face: GLAD },
];
/** the five around the fire, facing the sea side (the camera) */
const FIRE_RING: [number, number, number][] = [
  [-26.1, 6.0, 1.0],
  [-25.7, 4.9, 0.55],
  [-24.6, 4.3, 0],
  [-23.5, 4.9, -0.55],
  [-23.1, 6.0, -1.0],
];
/** the five standing together on the Grafton beach: three in front, two behind in the gaps */
const FIVE: [number, number][] = [
  [-25.7, 10.3],
  [-24.5, 10.5],
  [-23.3, 10.3],
  [-25.1, 9.3],
  [-23.9, 9.3],
];
const INVER_STAND: [number, number][] = [
  [29.6, 10.8],
  [31.5, 12.0],
  [33.4, 10.2],
];
const inverStill = (): Actor[] => INVER_STAND.map(([x, z], i) => ({ spec: INVER_CREW[i], p: G(x, z), yaw: Math.PI + (1 - i) * 0.25, face: SAD }));

// the boat's crossing (S06): out to sea at 2.2 m/s, bow first
const SAIL = { x: -21.0, z: 20.0, yaw: -1.0, v: 2.2, k: 1.4 };
const sailPose = (t: number, ts: number) => boatPose(SAIL.x + Math.cos(SAIL.yaw) * SAIL.v * ts, SAIL.z - Math.sin(SAIL.yaw) * SAIL.v * ts, SAIL.yaw, t, SAIL.k);

const door = hutToWorld(0.7, 2.3);
/** a point in front of the hut door */
const DOOR: V3 = [door[0], 1.3, door[1]];
const CALM: WorldState = { swell: 1.2, hutLit: 1, boat: "none" };
const still = (c: WorldState) => () => c;
const gw = WRECKS.grafton;

export const SET: Record<string, Setup> = {
  S01: {
    about: "HOOK: the 1864 board on the beach, the wrecked Grafton behind it; a slow push-in",
    cam: move(aim([-19.2, 1.3, 7.7], [-28.6, 1.7, 13.6], 50, 0.42), aim([-22.6, 1.7, 9.8], [-28.6, 1.8, 13.6], 50, 0.42)),
    actors: () => [],
    world: still({ swell: 1.6, hutLit: 1, boat: "none" }),
    subject: () => [
      [BOARD.x, 0.95, BOARD.z],
      // the mast (the hull's midsection sits behind the board by design)
      [gw.x + 0.38, 4.2, gw.z - 0.9],
    ],
    focus: () => [BOARD.x, 0.95, BOARD.z],
    blur: 0.8,
  },
  S02: {
    about: "the whole island from above the west end: the Grafton camp below, the ridge, the other wreck far away",
    cam: move({ pos: [-58, 19, 6], look: [-12, 0, 7.5], fov: 58 }, { pos: [-54.5, 18, 6.2], look: [-12, 0, 7.5], fov: 58 }),
    actors: (t) => campWork(t),
    world: still({ swell: 1.4, hutLit: 1, boat: "none" }),
    subject: () => [DOOR, [WRECKS.invercauld.x, 1, WRECKS.invercauld.z]],
    focus: () => DOOR,
    fogK: 0.12,
    blur: 0,
  },
  S03: {
    about: "the Grafton camp: a tracking shot along the five men at work (saw, hammer, the 5 MEN door, the cooking, the fire)",
    cam: move({ pos: [-30.4, 1.65, 10.6], look: [-30.5, 1.3, 4.8], fov: 56 }, { pos: [-22.9, 1.65, 10.6], look: [-23.3, 1.3, 5.0], fov: 56 }),
    actors: (t) => campWork(t),
    world: still(CALM),
    // the man the track is passing
    subject: (t, ts) => {
      const a = campWork(t);
      const x = -30.5 + (7.2 * ts) / (PLAN.find((s) => s.id === "S03")!.end - PLAN.find((s) => s.id === "S03")!.t);
      // the man closest to the middle of the frame (offset from the aim line, over his distance from the lens)
      const off = (c: Actor) => Math.abs(c.p[0] - x) / (10.6 - c.p[2]);
      const near = a.reduce((b, c) => (off(c) < off(b) ? c : b));
      return [head(near.p)];
    },
    focus: (t, ts) => SET.S03.subject(t, ts)[0],
    lead: 2,
    blur: 1.2,
  },
  S04: {
    about: "the 40 KM sign, face-on and unobstructed; a slow push-in",
    cam: move(aim([-16.3, 1.75, 13.0], [SIGN.x + 0.12, 1.95, SIGN.z], 44, 0.4), aim([-16.35, 1.8, 12.3], [SIGN.x + 0.12, 1.95, SIGN.z], 44, 0.4)),
    actors: () => [],
    world: still({ swell: 1.2, hutLit: 1, boat: "none" }),
    subject: () => [
      [SIGN.x - 0.9, 1.95, SIGN.z],
      [SIGN.x + 1.15, 1.95, SIGN.z],
    ],
    focus: () => [SIGN.x + 0.12, 1.95, SIGN.z + 0.1],
    blur: 0.6,
  },
  S04B: {
    about: "the Invercauld men come out of the surf toward us, then turn away from each other; the camera backs away with them in frame",
    cam: move(aim([31.5, 1.3, 7.4], [31.5, 1.6, 13.2], 50, 0.36), aim([31.5, 1.5, 1.0], [31.5, 1.6, 10.8], 50, 0.36)),
    actors: (t, ts) => {
      const T = PLAN.find((s) => s.id === "S04B")!;
      const tS = w("every", 2);
      const ashore = smooth(ts / (tS - T.t)) * 0.5 + clamp(ts / (tS - T.t)) * 0.5;
      const tau = Math.max(0, t - tS);
      const dist = 0.36 * tau * smooth(tau / 0.5);
      const turn = smooth(tau / 0.6);
      const dirs: [number, number][] = [
        [-0.98, -0.2],
        [0, -1],
        [0.97, -0.24],
      ];
      return [30.3, 31.5, 32.7].map((x0, i) => {
        const z0 = 13.5 - 2.4 * ashore - (i % 2) * 0.4;
        const k = i === 1 ? 0.6 : 1;
        const x = x0 + dirs[i][0] * dist * k;
        const z = z0 + dirs[i][1] * dist * k;
        const yawTo = i === 0 ? Math.PI + 1.37 : i === 2 ? Math.PI - 1.33 : Math.PI;
        return {
          spec: INVER_CREW[i],
          p: G(x, z),
          yaw: Math.PI + (yawTo - Math.PI) * turn,
          pose: { walk: ts * 4.4 + i * 2, lean: 12 - 6 * turn, armL: [16, 22], armLFwd: 30, armR: [14, 26], armRFwd: 30 },
          face: turn > 0.5 ? { eyes: "squint", mouth: "flat", brows: "angry" } : SAD,
        } as Actor;
      });
    },
    world: still({ swell: 2.0, hutLit: 1, boat: "none" }),
    subject: (t, ts) => SET.S04B.actors(t, ts).map((a) => head(a.p)),
    focus: (t, ts) => head(SET.S04B.actors(t, ts)[1].p),
    lead: 1,
    blur: 0.9,
  },
  S05: {
    about: "the Grafton crew builds the boat on the beach; a slow arc around the bow",
    // a high 3/4 view from the bow quarter: we look INTO the hull, the men stand around it in full view
    cam: move(aim([-17.6, 2.7, 14.2], [-21.9, 1.25, 9.0], 58, 0.42), aim([-18.5, 2.8, 14.7], [-21.9, 1.25, 9.0], 58, 0.42)),
    actors: (t) => [
      { spec: GRAFTON_CREW[3], p: G(-22.5, 8.5), yaw: 0.25, pose: work(t), face: GLAD },
      { spec: GRAFTON_CREW[4], p: G(-20.6, 8.1), yaw: 0.2, pose: hammer(t, 0.8), face: GLAD },
      { spec: GRAFTON_CREW[1], p: G(-23.9, 8.75), yaw: 0.3, pose: work(t, 2.1), face: GRIN },
    ],
    world: still({ swell: 1.2, hutLit: 1, boat: "building" }),
    subject: () => [head(G(-22.5, 8.5)), head(G(-20.6, 8.1)), head(G(-23.9, 8.75)), [-21.5, 1.25, 9.6]],
    focus: () => [-21.6, 1.1, 9.0],
    lead: 0,
    blur: 1.2,
  },
  S06: {
    about: "three of them sail for help: a follow-cam that keeps the boat and the three men in frame as it rides the swell",
    cam: (_u, t, ts) => {
      const b = sailPose(t, ts);
      const ax = Math.cos(b.yaw);
      const az = -Math.sin(b.yaw);
      // 3/4 front, on the seaward side, pulling back a little as the boat heads out
      const d = 1 + 0.12 * (ts / 2.9);
      const pos: V3 = [b.x + (ax * 3.3 - 0.84 * 5.0) * d, 2.5, b.z + (az * 3.3 + 0.54 * 5.0) * d];
      // the camera follows the boat's course, not every wave: aim at the mean water level
      return aim(pos, [b.x, 1.75, b.z], 56, 0.4);
    },
    actors: (t, ts) => {
      const b = sailPose(t, ts);
      const yaw = Math.atan2(Math.cos(b.yaw), -Math.sin(b.yaw));
      return [
        { spec: GRAFTON_CREW[0], p: onBoat(b, 1.15), yaw, face: { eyes: "squint", mouth: "flat", brows: "angry" }, afloat: true },
        { spec: GRAFTON_CREW[3], p: onBoat(b, 0), yaw, pose: { armL: [10, 0], armR: [96, 28], armRFwd: 80 }, face: { eyes: "wide", mouth: "open", brows: "raised" }, afloat: true },
        { spec: GRAFTON_CREW[4], p: onBoat(b, -1.15), yaw, face: { eyes: "squint", mouth: "flat", brows: "worried" }, afloat: true },
      ];
    },
    world: (t, ts) => ({ swell: SAIL.k, hutLit: 1, boat: sailPose(t, ts) }),
    subject: (t, ts) => SET.S06.actors(t, ts).map((a) => head(a.p)),
    focus: (t, ts) => head(SET.S06.actors(t, ts)[1].p),
    lead: 1,
    blur: 0.5,
  },
  S07: {
    about: "all five lived: the five together on the beach, cheering; a small push-in",
    cam: move(aim([-24.5, 1.55, 16.4], [-24.5, 1.5, 10.0], 52, 0.38), aim([-24.5, 1.55, 15.8], [-24.5, 1.5, 10.0], 52, 0.38)),
    actors: (t) => FIVE.map(([x, z], i) => ({ spec: GRAFTON_CREW[[1, 0, 2, 3, 4][i]], p: G(x, z), yaw: 0, pose: cheer(t, i), face: GRIN })),
    world: still(CALM),
    subject: (t) => SET.S07.actors(t, 0).map((a) => head(a.p)),
    focus: () => [-24.5, 1.5, 10.2],
    lead: 1,
    blur: 1.2,
  },
  S08: {
    about: "only three survived: the three Invercauld men standing apart on the dark shore; a slow pull-back",
    cam: move(aim([31.5, 2.0, 2.4], [31.5, 1.3, 11.0], 56, 0.4), aim([31.5, 2.1, 1.7], [31.5, 1.3, 11.0], 56, 0.4)),
    actors: () => inverStill(),
    world: still({ swell: 1.6, hutLit: 1, boat: "none" }),
    subject: () => inverStill().map((a) => head(a.p)),
    focus: () => [31.5, 1.3, 11.0],
    lead: 1,
    blur: 0.6,
  },
  // three matched beats: the same framing and the same cold light on both crews, then the sea that wrecked them
  S09: {
    about: "'Same island.': the Grafton five standing on their beach",
    cam: move(aim([-24.5, 1.55, 16.6], [-24.5, 1.5, 10.0], 52, 0.38), aim([-24.5, 1.55, 16.3], [-24.5, 1.5, 10.0], 52, 0.38)),
    actors: () => FIVE.map(([x, z], i) => ({ spec: GRAFTON_CREW[[1, 0, 2, 3, 4][i]], p: G(x, z), yaw: 0, face: { eyes: "open", mouth: "flat", brows: "neutral" } })),
    world: still({ swell: 2.0, hutLit: 1, boat: "none" }),
    subject: () => FIVE.map(([x, z]) => head(G(x, z))),
    focus: () => [-24.5, 1.5, 10.2],
    lead: 1,
    blur: 1.2,
  },
  S09B: {
    about: "'Same cold.': the Invercauld three on their beach, the same framing",
    cam: move(aim([31.5, 1.6, 2.2], [31.5, 1.5, 11.0], 56, 0.38), aim([31.5, 1.6, 2.5], [31.5, 1.5, 11.0], 56, 0.38)),
    actors: () => inverStill(),
    world: still({ swell: 2.0, hutLit: 1, boat: "none" }),
    subject: () => inverStill().map((a) => head(a.p)),
    focus: () => [31.5, 1.3, 11.0],
    lead: 1,
    blur: 1.2,
  },
  S09C: {
    about: "'Same storms.': a bookend of the hook, the 1864 board and the wrecked Grafton, pulling back slowly",
    cam: move(aim([-22.6, 1.7, 9.8], [-28.6, 1.8, 13.6], 50, 0.42), aim([-21.7, 1.6, 9.2], [-28.6, 1.8, 13.6], 50, 0.42)),
    actors: () => [],
    world: still({ swell: 2.6, hutLit: 1, boat: "none" }),
    subject: () => SET.S01.subject(0, 0),
    focus: () => [BOARD.x, 0.95, BOARD.z],
    blur: 0.8,
  },
  S10: {
    about: "PAYOFF: the five around their fire in front of the hut; a slow push-in",
    cam: move(aim([-24.6, 1.7, 13.6], [-24.6, 1.5, 5.0], 54, 0.38), aim([-24.6, 1.7, 12.9], [-24.6, 1.5, 5.0], 54, 0.38)),
    actors: (t) =>
      FIRE_RING.map(([x, z, yaw], i) => ({
        spec: GRAFTON_CREW[i],
        p: G(x, z),
        yaw,
        pose: i === 0 || i === 3 ? mug : i === 4 ? { armL: [10, 0], armR: [10, 0] } : warm(t, i),
        hold: i === 0 || i === 3 ? "mug" : null,
        face: i === 1 ? { eyes: "closed", mouth: "grin", brows: "raised" } : i === 4 ? GRIN : GLAD,
      })),
    world: still(CALM),
    subject: (t) => SET.S10.actors(t, 0).map((a) => head(a.p)),
    focus: (t) => head(SET.S10.actors(t, 0)[2].p),
    lead: 2,
    blur: 1.4,
  },
};

/** the setup playing at film time t */
export const shotAt = (t: number) => {
  const i = Math.max(0, PLAN.findIndex((s) => t >= s.t && t < s.end));
  const shot = t >= PLAN[PLAN.length - 1].end ? PLAN[PLAN.length - 1] : PLAN[i];
  const ts = t - shot.t;
  const u = clamp(ts / (shot.end - shot.t));
  const S = SET[shot.id];
  return { shot, S, ts, u, cam: S.cam(u, t, ts) };
};
export { FPS };
