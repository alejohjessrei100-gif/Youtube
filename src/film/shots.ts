// The beats of "Same island" as pure DATA. About one new framing a second (60 BPM), every cut on a WORD of the
// voice-over. Each beat has one purposeful move aimed at its subject, shows an event (not an object), and keeps the
// world consistent: five Grafton men, nineteen Invercauld men, the same camp, the same wrecks.
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { aim } from "../inkbeat/core/rig";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { FPS, SHOTS, WORDS } from "../plan.gen";
import { GRAFTON_CREW, INVER_CREW } from "./crew";
import { deckY, stationX } from "./hull";
import type { WorldState } from "./state";
import { BOAT_SITE, FIRE, NINETEEN, NINETEEN_SPEC, SHIPS, TALLY, WRECK_G, WRECK_I, afloat, groundAt, hutToWorld, ledgeZ, mixPose, onVessel } from "./world";
import type { Pose, SetId } from "./world";

export const PLAN = SHOTS as unknown as { id: string; t: number; end: number; mood: string }[];
type WordRow = [string, number, number];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** onset (s) of the nth occurrence of a word of the voice-over (never type a time) */
export const w = (word: string, nth = 1): number => {
  let k = 0;
  for (const [txt, t] of WORDS as unknown as WordRow[]) if (norm(txt) === norm(word) && ++k === nth) return t;
  throw new Error(`word not in the voice-over: ${word} #${nth}`);
};
const T = (id: string) => PLAN.find((s) => s.id === id)!;

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: BodyPose; face?: FaceState; hold?: "mug" | null; afloat?: boolean; prone?: boolean };
export type Overlay = { icons?: { n: number; lit: number; gold?: boolean } };
export type Beat = {
  about: string;
  cam: (u: number, t: number, ts: number) => Cam;
  actors: (t: number, ts: number) => Actor[];
  world: (t: number, ts: number) => WorldState;
  subject: (t: number, ts: number) => V3[];
  focus: (t: number, ts: number) => V3;
  lead?: number;
  fogK?: number;
  blur: number;
  overlay?: (t: number, ts: number) => Overlay;
};

const sin = Math.sin;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
const mix = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const move = (a: Cam, b: Cam, ease: (u: number) => number = (u) => u) => (u: number): Cam => {
  const e = ease(u);
  return { pos: mix(a.pos, b.pos, e), look: mix(a.look, b.look, e), fov: a.fov + (b.fov - a.fov) * e, roll: 0 };
};
/** a fast start that settles (a punch-in on the beat) */
const punch = (u: number) => 0.55 * easeOut(u * 2.2) + 0.45 * u;
const on = (set: SetId, x: number, z: number): V3 => [x, groundAt(set, x, z), z];
const head = (p: V3, h = 1.75): V3 => [p[0], p[1] + h * 0.88, p[2]];
/** lightning: a strike at t0 with a second flicker, 0..1 */
const flash = (t: number, t0: number) => Math.max(t >= t0 ? Math.max(0, 1 - (t - t0) / 0.26) : 0, t >= t0 + 0.14 ? 0.7 * Math.max(0, 1 - (t - t0 - 0.14) / 0.2) : 0);

const GLAD: FaceState = { eyes: "open", mouth: "smile", brows: "raised" };
const GRIN: FaceState = { eyes: "open", mouth: "grin", brows: "raised" };
const SAD: FaceState = { eyes: "half", mouth: "frown", brows: "worried" };
const GRIM: FaceState = { eyes: "squint", mouth: "flat", brows: "angry" };
const FEAR: FaceState = { eyes: "wide", mouth: "o", brows: "worried" };
const AWE: FaceState = { eyes: "wide", mouth: "o", brows: "raised" };
const hammer = (t: number, ph = 0): BodyPose => ({ armL: [10, 0], armR: [96 + 26 * sin(t * 2 * Math.PI * 1.6 + ph), 66], armRFwd: 44, lean: 4 });
const work = (t: number, ph = 0): BodyPose => {
  const k = sin(t * 2 * Math.PI * 1.3 + ph);
  return { armL: [42 + 7 * k, 48 - 9 * k], armLFwd: 70, armR: [42 + 7 * k, 48 - 9 * k], armRFwd: 70, lean: 10 + 2.5 * k };
};
const warm = (t: number, ph = 0): BodyPose => ({ armL: [48 + 3 * sin(t * 2 + ph), 40], armLFwd: 72, armR: [48 + 3 * sin(t * 2 + ph + 1), 40], armRFwd: 72, lean: 4 });
const mug: BodyPose = { armL: [6, 0], armR: [18, 92], armRFwd: 62 };
/** lying face down, dragging forward on the arms (the body pivots about the feet) */
const prone = (t: number, ph = 0): BodyPose => ({ headNod: -58, lean: 80, armL: [150 + 14 * sin(t * 3.2 + ph), 12], armLFwd: 86, armR: [128 - 14 * sin(t * 3.2 + ph), 30], armRFwd: 86 });
const hunched: BodyPose = { lean: 14, armL: [30, 110], armLFwd: 60, armR: [30, 110], armRFwd: 60 };
const carry: BodyPose = { armL: [10, 0], armR: [118, 58], armRFwd: 10 };

// ------------------------------------------------------------------ world states over the story
const NONE: WorldState = { set: "G", swell: 1 };
const gDay = (o: Partial<WorldState> = {}): WorldState => ({ set: "G", swell: 1, grafton: "wreck", hut: 1, hutLit: 0.4, fire: 0.5, boat: "none", ...o });
const iDay = (o: Partial<WorldState> = {}): WorldState => ({ set: "I", swell: 2.6, invercauld: "wreck", ...o });
/** surf bursting on the ledge and against the wreck (periodic) */
const SURF_I = (s = 1) => [
  { p: [-11, 0.4, 1.6] as V3, t0: 0.2, s: 1.5 * s, period: 2.3, seed: 3 },
  { p: [3, 0.4, 2.2] as V3, t0: 1.1, s: 1.8 * s, period: 2.7, seed: 11 },
  { p: [17, 0.4, 1.0] as V3, t0: 0.7, s: 1.6 * s, period: 2.5, seed: 23 },
];

// ------------------------------------------------------------------ the hook: the Grafton in the gale
const GH = SHIPS.grafton;
const HEAD = { x: Math.cos(WRECK_G.yaw), z: -Math.sin(WRECK_G.yaw) };
const galePose = (t: number): Pose => {
  const p = afloat("G", GH, 10.5 + HEAD.x * 6 * t, 44 + HEAD.z * 6 * t, WRECK_G.yaw, t, 2.8);
  return { ...p, roll: p.roll - 0.3 - 0.06 * sin(t * 2.4) };
};
const galeRig = { kind: "schooner" as const, sails: 1 };
const strikePose = (t: number, ts: number): Pose => {
  const a = afloat("G", GH, 15.6, 14.5, WRECK_G.yaw, t, 2.6);
  const u = easeOut(ts / 0.5);
  const p = mixPose({ ...a, roll: a.roll - 0.25 }, WRECK_G, u);
  // the hull shudders as it grounds
  return { ...p, roll: p.roll + 0.05 * sin(ts * 26) * Math.max(0, 1 - ts / 0.6), pitch: p.pitch + 0.03 * sin(ts * 31) * Math.max(0, 1 - ts / 0.5) };
};
const IH = SHIPS.invercauld;

// ------------------------------------------------------------------ recurring blocking
const RING: [number, number, number][] = [
  [-1.55, 0.1, 1.15],
  [-1.15, -1.15, 0.6],
  [0, -1.7, 0],
  [1.15, -1.15, -0.6],
  [1.55, 0.1, -1.15],
];
const ring = (t: number, faces: FaceState[] = []): Actor[] =>
  RING.map(([dx, dz, yaw], i) => ({
    spec: GRAFTON_CREW[i],
    p: on("G", FIRE[0] + dx, FIRE[1] + dz),
    yaw,
    pose: i === 0 || i === 3 ? mug : warm(t, i),
    hold: i === 0 || i === 3 ? "mug" : null,
    face: faces[i] ?? (i === 1 ? GRIN : GLAD),
  }));
/** the nineteen on the ledge: the six at the water's edge lie (feet to the sea, heads to the cliff), the rest stand or crouch */
const nineteen = (face: FaceState, pose: (i: number, prone: boolean) => BodyPose | undefined, yaw = 0): Actor[] =>
  NINETEEN.map(([x, z], i) => {
    const pr = NINETEEN_SPEC[i].prone;
    return { spec: INVER_CREW[i], p: on("I", x, z), yaw: pr ? Math.PI + (((i * 37) % 7) - 3) * 0.05 : yaw + (((i * 37) % 9) - 4) * 0.09, pose: pose(i, pr), face, prone: pr };
  });
/** the last beat: ring[1] holds out a mug, ring[2] reaches for it; the other three watch */
const handoff = (t: number): Actor[] => {
  const a = ring(t, [GRIN, GRIN, GLAD, GLAD, GRIN]);
  const give = smooth((t - T("B29").t - 0.2) / 0.5);
  // ring[0] hands the mug to ring[1] (1.3 m apart, west of the fire; the camera sees them in profile)
  a[0] = { ...a[0], yaw: 2.83, pose: { armL: [10, 0], armR: [40 + 12 * give, 74 - 10 * give], armRFwd: 58 }, hold: "mug", face: GRIN };
  a[1] = { ...a[1], yaw: -0.31, pose: { armL: [36 + 8 * give, 56], armLFwd: 74, armR: [36 + 8 * give, 56], armRFwd: 74 }, hold: null, face: { eyes: "closed", mouth: "grin", brows: "raised" } };
  return a;
};
const THREE_LEFT: [number, number][] = [-1.3, 0.2, 1.5].map((x, i) => [x, ledgeZ(x, [4.0, 4.5, 3.9][i])]);
const boatSpot = (lx: number, lz: number): V3 => {
  const x = BOAT_SITE.x + lx * Math.cos(BOAT_SITE.yaw) + lz * Math.sin(BOAT_SITE.yaw);
  const z = BOAT_SITE.z - lx * Math.sin(BOAT_SITE.yaw) + lz * Math.cos(BOAT_SITE.yaw);
  return on("G", x, z);
};
const BH = SHIPS.boat;
const launchPose = (t: number, ts: number) => afloat("G", BH, 6 + 1.0 * ts, 6 + 1.6 * ts, -1.0, t, 1);
const crossPose = (t: number, ts: number) => afloat("SEA", BH, 0 + 1.2 * ts, 0 + 1.6 * ts, -0.9, t, 2.8);
const aboard = (b: Pose, faces: FaceState[]): Actor[] =>
  [0.26, 0.47, 0.72].map((u, i) => ({ spec: GRAFTON_CREW[[4, 3, 0][i]], p: onVessel(b, stationX(BH, u), deckY(BH, u) + 0.02, 0), yaw: Math.atan2(Math.cos(b.yaw), -Math.sin(b.yaw)), face: faces[i], afloat: true, pose: i === 0 ? { armL: [10, 0], armR: [70, 40], armRFwd: -40 } : undefined }));

export const SET: Record<string, Beat> = {
  // ---------------------------------------------------------------- 0–5.6 s: the hook, both wrecks, the chart
  B01: {
    about: "HOOK: night, a gale. From the wave tops we look up at the schooner heeling toward the shore as lightning strikes",
    cam: (u, t) => {
      const s = galePose(t);
      const d = 17 - 6.5 * punch(u);
      return aim([s.x + HEAD.x * d + 6.5, 3.3, s.z + HEAD.z * d + 2.5], [s.x, s.y + 7.5, s.z], 58, 0.4);
    },
    actors: () => [],
    world: (t) => ({ set: "G", swell: 2.8, rain: 1, flash: Math.max(flash(t, 0.22), flash(t, 1.12)), bolt: [-40, 0, 150], grafton: { pose: galePose(t), rig: galeRig } }),
    subject: (t) => {
      const s = galePose(t);
      return [[s.x, s.y + 6, s.z]];
    },
    focus: (t) => {
      const s = galePose(t);
      return [s.x, s.y + 5, s.z];
    },
    fogK: 0.5,
    blur: 0.6,
  },
  B02: {
    about: "close-up on deck: a sailor's face in the rain as he sees the rocks",
    cam: (u, t) => {
      const s = galePose(t);
      const d = 2.6 - 0.5 * u;
      return aim(onVessel(s, stationX(GH, 0.45) + d, deckY(GH, 0.45) + 1.72, -0.75), head(onVessel(s, stationX(GH, 0.45), deckY(GH, 0.45), 0.9)), 38, 0.42);
    },
    actors: (t) => [{ spec: GRAFTON_CREW[0], p: onVessel(galePose(t), stationX(GH, 0.45), deckY(GH, 0.45), 0.9), yaw: Math.atan2(HEAD.x, HEAD.z), pose: { armL: [64, 56], armLFwd: 50, armR: [64, 56], armRFwd: 50, lean: 6 }, face: FEAR, afloat: true }],
    world: (t) => ({ set: "G", swell: 2.8, rain: 1, flash: flash(t, w("two") + 0.1), grafton: { pose: galePose(t), rig: galeRig } }),
    subject: (t) => [head(onVessel(galePose(t), stationX(GH, 0.45), deckY(GH, 0.45), 0.9))],
    focus: (t) => head(onVessel(galePose(t), stationX(GH, 0.45), deckY(GH, 0.45), 0.9)),
    lead: 0,
    fogK: 0.5,
    blur: 1.8,
  },
  B03: {
    about: "IMPACT: from the beach, the schooner grounds on the rocks, shudders, and her foremast goes over in the spray",
    cam: (u, _t, ts) => {
      const k = 0.16 * sin(ts * 62) * Math.max(0, 1 - ts / 0.45);
      const c = move(aim([26.2, 2.1, -8.2], [17.6, 4.6, 5], 56, 0.42), aim([25.0, 2.2, -6.9], [17.6, 4.8, 5], 56, 0.42), punch)(u);
      return { ...c, look: [c.look[0] + k, c.look[1] + k * 0.7, c.look[2]] };
    },
    actors: () => [],
    world: (t, ts) => ({
      set: "G", swell: 2.6, rain: 1, flash: flash(t, w("wrecked") + 0.05),
      grafton: { pose: strikePose(t, ts), rig: { kind: "schooner", sails: 1, fall: [1.25 * smooth((ts - 0.12) / 0.6), 0.12 * smooth(ts / 0.4)] } },
      spray: [
        { p: [19.4, 0.3, -0.4], t0: T("B03").t + 0.1, s: 2.6, seed: 5 },
        { p: [16.4, 0.3, 4.4], t0: T("B03").t + 0.24, s: 2.2, seed: 9 },
      ],
    }),
    subject: () => [[17.6, 4.5, 5]],
    focus: () => [17.6, 3, 5],
    fogK: 0.5,
    blur: 0.5,
  },
  B04: {
    about: "the other wreck: the big Invercauld breaking up under a wall of cliffs; the camera tilts up the cliff as a mast falls",
    cam: move({ pos: [2, 4.0, 40], look: [26, 8, 15], fov: 60 }, { pos: [4.5, 4.3, 37], look: [27, 20, 6], fov: 60 }),
    actors: () => [],
    world: (t, ts) => ({
      set: "I", swell: 3, rain: 1, flash: flash(t, w("remote") - 0.1), bolt: [70, 30, -40],
      invercauld: { pose: { ...WRECK_I, y: WRECK_I.y + 1.4, roll: WRECK_I.roll - 0.12 + 0.05 * sin(t * 2.1) }, rig: { kind: "ship", sails: 1, fall: [0, 1.15 * smooth((ts - 0.35) / 0.8), 0] } },
      spray: SURF_I(1.3),
    }),
    subject: (_t, ts) => [[26 + ts / 1.44, 8 + 12 * (ts / 1.44), 15 - 9 * (ts / 1.44)]],
    focus: () => [27, 9, 15],
    fogK: 0.35,
    blur: 0.4,
  },
  B05: {
    about: "the chart: one island, two crosses appear at opposite ends, months apart",
    cam: move({ pos: [0, -5.2, 17.6], look: [0, -0.4, 0], fov: 50 }, { pos: [0, -4.2, 15.4], look: [0, -0.2, 0], fov: 50 }),
    actors: () => [],
    world: (t) => ({ set: "MAP", swell: 0, chart: { grafton: smooth((t - w("just") + 0.05) / 0.22), invercauld: smooth((t - w("months")) / 0.22), route: 0 } }),
    subject: () => [[-0.3, -3.9, 0], [-1.75, 6.2, 0]],
    focus: () => [0, 0, 0],
    blur: 0,
  },
  // ---------------------------------------------------------------- 5.6–7.9 s: neither knew
  B06: {
    about: "grey dawn at Carnley Harbour: a Grafton man looks up at the wall of forest that cuts them off; a crane up over his shoulder",
    cam: move(aim([11.4, 1.3, 1.2], head(on("G", 9.8, -3.2)), 50, 0.62), aim([11.8, 2.5, 2.0], head(on("G", 9.8, -3.2)), 50, 0.66)),
    actors: () => [{ spec: GRAFTON_CREW[0], p: on("G", 9.8, -3.2), yaw: Math.PI + 0.2, pose: { armL: [8, 0], armR: [8, 0], headNod: -12 }, face: AWE }],
    world: () => ({ set: "G", swell: 1.2, grafton: "wreck", hut: -1, boat: "none" }),
    subject: () => [head(on("G", 9.8, -3.2))],
    focus: () => head(on("G", 9.8, -3.2)),
    lead: 0,
    blur: 1.0,
  },
  B07: {
    about: "the match: an Invercauld man under the cliffs; the camera tilts from him up 36 m of basalt",
    // a tilt driven by the elevation angle (constant turn rate): 6° → 40° up the cliff over the last 80% of the beat
    cam: (u) => {
      const el = ((6 + 34 * clamp((u - 0.2) / 0.8)) * Math.PI) / 180;
      const hd = Math.hypot(-1.1, -4.8);
      const pos: V3 = [-1.9, 2.0 + 0.2 * clamp((u - 0.2) / 0.8), 0.4];
      return { pos, look: [pos[0] + (-1.1 / hd) * Math.cos(el) * 12, pos[1] + Math.sin(el) * 12, pos[2] + (-4.8 / hd) * Math.cos(el) * 12], fov: 54, roll: 0 };
    },
    actors: () => [
      { spec: INVER_CREW[0], p: on("I", -3, -4.2), yaw: Math.PI, pose: { armL: [8, 0], armR: [8, 0], headNod: -16 }, face: SAD },
      { spec: INVER_CREW[1], p: on("I", -5.6, -5.0), yaw: 2.4, pose: hunched, face: SAD },
      { spec: INVER_CREW[2], p: on("I", -0.6, -5.4), yaw: -2.7, pose: hunched, face: SAD },
    ],
    world: () => iDay({ swell: 2.2, spray: SURF_I(0.8) }),
    subject: (_t, ts) => (ts < 0.3 ? [head(on("I", -3, -4.2))] : []),
    focus: () => head(on("I", -3, -4.2)),
    lead: 0,
    blur: 0.8,
  },
  // ---------------------------------------------------------------- 7.9–12.5 s: the Grafton five work together
  B08: {
    about: "five men, one load: they carry a spar from the wreck up the beach; the camera backs away ahead of them",
    cam: (_u, _t, ts) => {
      const x = 6.4 - 1.15 * ts;
      return aim([x - 4.6, 1.5, -2.2], [x + 2.2, 1.5, -5.2], 52, 0.4);
    },
    actors: (_t, ts) =>
      [0, 1, 2, 3, 4].map((i) => ({ spec: GRAFTON_CREW[i], p: on("G", 6.4 - 1.15 * ts + i * 1.3, -5.2), yaw: -Math.PI / 2, pose: { ...carry, walk: ts * 5.2 + i * 1.3 }, face: i % 2 ? GRIM : GLAD })),
    world: (_t, ts) => {
      const x = 6.4 - 1.15 * ts;
      const y = groundAt("G", x + 2.6, -5.2) + 1.47;
      return { set: "G", swell: 1.2, grafton: "wreck", hut: -1, boat: "none", spar: { a: [x - 0.6, y, -4.98], b: [x + 5.8, y, -4.98] } };
    },
    subject: (_t, ts) => [0, 2, 4].map((i) => head(on("G", 6.4 - 1.15 * ts + i * 1.3, -5.2))),
    focus: (_t, ts) => head(on("G", 6.4 - 1.15 * ts + 1.3, -5.2)),
    lead: 0,
    blur: 1.0,
  },
  B09: {
    about: "the hut goes up: frame, thatch walls, roof (a time-lapse inside the beat) while two men hammer and three bring thatch",
    cam: move(aim([2.6, 1.7, -6.2], [-6.6, 1.6, -14.6], 56, 0.42), aim([0.4, 2.0, -5.6], [-6.6, 1.7, -14.6], 56, 0.42), punch),
    actors: (t) => {
      const a = hutToWorld(-1.6, 2.7);
      const b = hutToWorld(3.2, 2.6);
      return [
        { spec: GRAFTON_CREW[0], p: on("G", a[0], a[1]), yaw: 2.7, pose: hammer(t), face: GLAD },
        { spec: GRAFTON_CREW[4], p: on("G", b[0], b[1]), yaw: -2.6, pose: hammer(t, 1.4), face: GLAD },
        { spec: GRAFTON_CREW[1], p: on("G", -9.8, -10.0), yaw: -2.9, pose: work(t), face: GRIN },
        { spec: GRAFTON_CREW[2], p: on("G", -0.3, -10.4), yaw: -2.0, pose: work(t, 1), face: GLAD },
        { spec: GRAFTON_CREW[3], p: on("G", -5.7, -7.0), yaw: -2.4, pose: work(t, 2), face: GLAD },
      ];
    },
    world: (_t, ts) => ({ set: "G", swell: 1, grafton: "wreck", hut: 0.08 + 0.92 * smooth(ts / 0.7), hutLit: 0, fire: 0, boat: "none" }),
    subject: () => [[-7, 2, -15]],
    focus: () => [-6.4, 1.4, -13],
    lead: 0,
    blur: 0.9,
  },
  B10: {
    about: "took turns cooking: at dusk one man stirs the pot and hands a mug across the fire",
    cam: move(aim([-2.2, 1.35, -4.6], [-2.2, 1.35, -10.6], 58, 0.42), aim([-2.2, 1.4, -5.5], [-2.2, 1.35, -10.6], 58, 0.42)),
    actors: (t) => [
      { spec: GRAFTON_CREW[1], p: on("G", -3.47, -10.6), yaw: 1.2, pose: { armL: [10, 0], armR: [58 + 7 * sin(t * 3.2), 76], armRFwd: 58 }, face: GRIN },
      { spec: GRAFTON_CREW[3], p: on("G", -0.95, -10.3), yaw: -1.2, pose: mug, hold: "mug", face: GLAD },
    ],
    world: () => gDay({ fire: 1, hutLit: 1 }),
    subject: () => [head(on("G", -3.47, -10.6)), head(on("G", -0.95, -10.3))],
    focus: () => [-2.2, 1.3, -10.6],
    lead: 0,
    blur: 1.6,
  },
  B11: {
    about: "shared every job: all five round the fire in front of the finished hut; a slow arc",
    cam: move(aim([1.6, 1.3, -4.3], [FIRE[0], 1.5, -11.0], 60, 0.4), aim([-1.2, 1.35, -4.2], [FIRE[0], 1.5, -11.0], 60, 0.4)),
    actors: (t) => ring(t),
    world: () => gDay({ fire: 1, hutLit: 1 }),
    subject: (t) => ring(t).map((a) => head(a.p)),
    focus: (t) => head(ring(t)[2].p),
    lead: 2,
    blur: 1.3,
  },
  // ---------------------------------------------------------------- 12.5–18.4 s: forty kilometres away
  B12: {
    about: "the chart again: the camera flies the 40 km north along the coast from one cross to the other",
    cam: (u) => {
      const e = smooth(u);
      const y = -3.9 + 10.1 * e;
      const x = -0.3 - 1.45 * e;
      return { pos: [x, y - 3.4, 8.2], look: [x, y + 0.6, 0], fov: 50, roll: 0 };
    },
    actors: () => [],
    world: (_t, ts) => ({ set: "MAP", swell: 0, chart: { grafton: 1, invercauld: smooth((ts - 0.95) / 0.2), route: smooth(ts / 1.05) } }),
    subject: () => [],
    focus: () => [0, 0, 0],
    blur: 0,
  },
  B13: {
    about: "nineteen men on a rock ledge under the cliffs, soaked, some lying where the sea left them; the camera drifts in from the surf",
    cam: move(aim([-14, 3.7, 5.8], head(on("I", NINETEEN[9][0], NINETEEN[9][1])), 56, 0.45), aim([-10.6, 3.7, 4.0], head(on("I", NINETEEN[9][0], NINETEEN[9][1])), 56, 0.45)),
    actors: (t) => nineteen(SAD, (i, pr) => (pr ? prone(t, i) : i % 2 ? hunched : undefined)),
    world: () => iDay({ swell: 3, rain: 0.6, spray: SURF_I(1.2) }),
    subject: () => [head(on("I", NINETEEN[9][0], NINETEEN[9][1])), head(on("I", NINETEEN[10][0], NINETEEN[10][1]))],
    focus: () => head(on("I", NINETEEN[9][0], NINETEEN[9][1])),
    blur: 1.0,
  },
  B14: {
    about: "crawled ashore: at rock level, a man drags himself out of the foam toward us",
    cam: move(aim([-1.2, 1.75, ledgeZ(-1.2, 5.7)], [-2, 1.45, ledgeZ(-2, 2.7)], 46, 0.5), aim([-1.4, 1.7, ledgeZ(-1.4, 5.2)], [-2, 1.45, ledgeZ(-2, 3.0)], 46, 0.5)),
    actors: (t, ts) => [
      { spec: INVER_CREW[3], p: on("I", -2, ledgeZ(-2, 1.9 + 0.35 * ts)), yaw: Math.PI, pose: prone(t), face: { eyes: "squint", mouth: "open", brows: "worried" }, prone: true },
      { spec: INVER_CREW[6], p: on("I", 2.4, ledgeZ(2.4, 1.9)), yaw: Math.PI - 0.3, pose: prone(t, 2), face: SAD, prone: true },
      { spec: INVER_CREW[9], p: on("I", -5.4, ledgeZ(-5.4, 2.2)), yaw: Math.PI + 0.25, pose: prone(t, 4), face: SAD, prone: true },
    ],
    world: () => iDay({ swell: 3, rain: 0.6, spray: [{ p: [-2, 0.4, 2.0], t0: 0.3, s: 1.6, period: 1.9, seed: 4 }, { p: [4, 0.4, 2.4], t0: 1.2, s: 1.5, period: 2.3, seed: 8 }] }),
    subject: (_t, ts) => [[-2, groundAt("I", -2, ledgeZ(-2, 2.8 + 0.35 * ts)) + 0.5, ledgeZ(-2, 2.8 + 0.35 * ts)]],
    focus: (_t, ts) => [-2, groundAt("I", -2, ledgeZ(-2, 2.8 + 0.35 * ts)) + 0.5, ledgeZ(-2, 2.8 + 0.35 * ts)],
    lead: 0,
    blur: 2.0,
  },
  B15: {
    about: "every man: one reaches up for help; the man above him looks down, turns his back and walks away",
    cam: move(aim([1.0, 2.7, 3.7], [0.7, 1.5, ledgeZ(0.7, 3.0)], 54, 0.45), aim([0.7, 2.6, 2.9], [0.7, 1.5, ledgeZ(0.7, 3.0)], 54, 0.45)),
    actors: (t, ts) => {
      const go = smooth((ts - 0.3) / 0.45);
      const walk = Math.max(0, ts - 0.5) * 0.55;
      return [
        { spec: INVER_CREW[5], p: on("I", -0.6 - walk, ledgeZ(-0.6 - walk, 3.8)), yaw: Math.PI / 2 - go * Math.PI, pose: { armL: [8, 0], armR: [8, 0], headNod: 18 * (1 - go), walk: walk * 5 }, face: GRIM },
        { spec: INVER_CREW[7], p: on("I", 2.4, ledgeZ(2.4, 2.3)), yaw: -Math.PI / 2, pose: { lean: 78, armL: [150, 10], armLFwd: 86, armR: [165 + 6 * sin(t * 4), 6], armRFwd: 60 }, face: { eyes: "wide", mouth: "open", brows: "worried" }, prone: true },
      ];
    },
    world: () => iDay({ swell: 2.6, rain: 0.4, spray: SURF_I(1) }),
    subject: (t, ts) => [head(SET.B15.actors(t, ts)[0].p)],
    focus: (t, ts) => head(SET.B15.actors(t, ts)[0].p),
    lead: 0,
    blur: 1.4,
  },
  B16: {
    about: "for himself: straight down from the cliff top, nineteen small figures drift apart along the ledge",
    cam: (u) => ({ pos: [0, 22 + 3 * u, 0.8], look: [0, 1.4, -3.4], fov: 56, roll: 90 }),
    actors: (_t, ts) =>
      NINETEEN.map(([x, z], i) => {
        const dir = x < 0 ? -1 : 1;
        const d = 0.55 * ts * (0.5 + 0.5 * ((i * 13) % 5) / 4);
        return { spec: INVER_CREW[i], p: on("I", x + dir * d, z), yaw: (dir * Math.PI) / 2, pose: { walk: ts * 4.6 + i, lean: 8 }, face: GRIM };
      }),
    world: () => iDay({ swell: 2.6, spray: SURF_I(1) }),
    subject: () => [[-8, 1.5, -3.5], [8, 1.5, -3.5]],
    focus: () => [0, 1.5, -3.5],
    fogK: 0.3,
    blur: 0,
  },
  // ---------------------------------------------------------------- 18.4–24.5 s: nineteen months, the boat, the crossing
  B17: {
    about: "nineteen months: a man cuts another notch into the tally post, already covered in marks; push-in on the marks",
    cam: move(aim([-7.3, 1.55, -9.0], [TALLY[0] - 0.15, 1.45, TALLY[1] + 0.5], 52, 0.42), aim([-8.1, 1.5, -9.7], [TALLY[0] - 0.15, 1.45, TALLY[1] + 0.5], 52, 0.42)),
    actors: (t) => [{ spec: GRAFTON_CREW[2], p: on("G", TALLY[0] - 0.25, TALLY[1] + 1.0), yaw: Math.PI - 0.15, pose: { armL: [10, 0], armR: [62 + 4 * sin(t * 5), 46], armRFwd: 84 }, face: GRIM }],
    world: () => gDay({ fire: 0.5 }),
    subject: () => [head(on("G", TALLY[0] - 0.25, TALLY[1] + 1.0)), [TALLY[0], 1.0, TALLY[1]]],
    focus: () => [TALLY[0] - 0.1, 1.4, TALLY[1] + 0.5],
    lead: 0,
    blur: 1.6,
  },
  B18: {
    about: "built their own boat: hammer on the gunwale, close; the hull fills the bottom of the frame",
    cam: move(aim([11.3, 1.25, -1.4], [9.3, 1.55, -5.4], 46, 0.42), aim([10.9, 1.3, -1.9], [9.3, 1.55, -5.4], 46, 0.42)),
    actors: (t) => [
      { spec: GRAFTON_CREW[4], p: boatSpot(-0.3, -1.3), yaw: 0.25, pose: hammer(t), face: GRIM },
      { spec: GRAFTON_CREW[1], p: boatSpot(1.7, -1.35), yaw: 0.1, pose: work(t, 1), face: GLAD },
    ],
    world: () => gDay({ boat: { built: 0.7 } }),
    subject: () => [head(boatSpot(-0.3, -1.3))],
    focus: () => head(boatSpot(-0.3, -1.3)),
    lead: 0,
    blur: 1.6,
  },
  B19: {
    about: "the reveal: the camera rises and the finished boat stands on the beach with all five around her",
    cam: move(aim([14.6, 1.7, 0.6], [9.5, 1.3, -4.2], 54, 0.45), aim([15.4, 3.4, 1.4], [9.5, 1.2, -4.2], 54, 0.45), smooth),
    actors: () => [
      { spec: GRAFTON_CREW[4], p: boatSpot(-1.5, -1.55), yaw: 0.3, face: GRIN },
      { spec: GRAFTON_CREW[1], p: boatSpot(0.2, -1.55), yaw: 0.2, face: GRIN },
      { spec: GRAFTON_CREW[2], p: boatSpot(1.8, -1.55), yaw: 0.1, face: GLAD },
      { spec: GRAFTON_CREW[0], p: boatSpot(-3.5, -0.6), yaw: 1.4, face: GLAD },
      { spec: GRAFTON_CREW[3], p: boatSpot(-3.5, 0.75), yaw: 1.7, face: GLAD },
    ],
    world: () => gDay({ boat: { built: 1 } }),
    subject: () => [[9.5, 1.3, -4.2]],
    focus: () => [9.5, 1.2, -4.2],
    lead: 1,
    blur: 0.8,
  },
  B20: {
    about: "three sail, two stay: over the shoulders of the two on the beach, the boat stands out into the harbour",
    cam: (u, t, ts) => {
      const b = launchPose(t, ts);
      return aim([5.9, 1.95 + 0.3 * u, -5.2 - 0.4 * u], [b.x, 1.5, b.z + 0.5], 50, 0.45);
    },
    actors: (t, ts) => [
      { spec: GRAFTON_CREW[1], p: on("G", 4.7, -1.4), yaw: 0, pose: { armL: [10, 0], armR: [156 + 8 * sin(t * 5), 12], armRFwd: 40 }, face: GLAD },
      { spec: GRAFTON_CREW[2], p: on("G", 7.3, -1.2), yaw: 0, pose: { armL: [150 + 8 * sin(t * 5 + 1), 12], armLFwd: 40, armR: [10, 0] }, face: GLAD },
      ...aboard(launchPose(t, ts), [GRIM, GLAD, GRIM]),
    ],
    world: (t, ts) => gDay({ boat: launchPose(t, ts) }),
    fogK: 0.35,
    subject: (t, ts) => {
      const b = launchPose(t, ts);
      return [[b.x, b.y + 2, b.z]];
    },
    focus: (t, ts) => {
      const b = launchPose(t, ts);
      return [b.x, b.y + 1.5, b.z];
    },
    lead: 0,
    blur: 0.8,
  },
  B21: {
    about: "the open ocean: the boat, three men, a tiny thing on a mountain of grey water; the camera comes down to her",
    cam: (u, t, ts) => {
      const b = crossPose(t, ts);
      const th = 0.35 + 0.5 * smooth(u);
      const bow: V3 = [Math.cos(b.yaw), 0, -Math.sin(b.yaw)];
      const left: V3 = [-Math.sin(b.yaw) * -1 * -1, 0, 0];
      void left;
      const lx = -bow[2];
      const lz = bow[0];
      const d = 8.2;
      return aim([b.x + (bow[0] * Math.cos(th) + lx * Math.sin(th)) * d, 3.3, b.z + (bow[2] * Math.cos(th) + lz * Math.sin(th)) * d], [b.x, b.y + 1.6, b.z], 54, 0.42);
    },
    actors: (t, ts) => aboard(crossPose(t, ts), [GRIM, FEAR, GRIM]),
    world: (t, ts) => ({ set: "SEA", swell: 2.8, rain: 0.7, flash: flash(t, w("ocean") + 0.15), bolt: [60, 0, -160], boat: crossPose(t, ts) }),
    subject: (t, ts) => {
      const b = crossPose(t, ts);
      return [[b.x, b.y + 1.6, b.z]];
    },
    focus: (t, ts) => {
      const b = crossPose(t, ts);
      return [b.x, b.y + 1.5, b.z];
    },
    lead: 1,
    fogK: 0.4,
    blur: 0.5,
  },
  // ---------------------------------------------------------------- 24.5–28.3 s: the count
  B22: {
    about: "all five lived: the sun comes under the cloud; the camera tracks close along five faces",
    cam: move(aim([-2.4, 1.62, -2.8], [-2.4, 1.6, -6], 52, 0.4), aim([1.9, 1.62, -2.8], [1.9, 1.6, -6], 52, 0.4)),
    actors: () => [0, 1, 2, 3, 4].map((i) => ({ spec: GRAFTON_CREW[i], p: on("G", -2.4 + i * 1.2, -6), yaw: 0, face: i % 2 ? GRIN : GLAD })),
    world: () => gDay(),
    subject: (_t, ts) => {
      const x = -2.4 + 4.3 * clamp(ts / (T("B22").end - T("B22").t));
      const i = Math.round((x + 2.4) / 1.2);
      return [head(on("G", -2.4 + clamp(i, 0, 4) * 1.2, -6))];
    },
    focus: (t, ts) => SET.B22.subject(t, ts)[0],
    lead: 2,
    blur: 1.8,
    overlay: (_t, ts) => ({ icons: { n: 5, lit: Math.min(5, Math.floor(ts / 0.14) + 1), gold: true } }),
  },
  B23: {
    about: "from the Invercauld: nineteen stand on the ledge under the cliffs",
    cam: move({ pos: [0, 5.2, 31], look: [0, 5.2, -4], fov: 60 }, { pos: [0, 5.0, 28.5], look: [0, 5, -4], fov: 60 }),
    actors: () => nineteen(SAD, () => undefined),
    world: () => iDay({ swell: 2.4, spray: SURF_I(1) }),
    subject: () => [[-8, 2.5, -3.5], [8, 2.5, -3.5]],
    focus: () => [0, 3.4, -3.8],
    blur: 0.3,
    overlay: () => ({ icons: { n: 19, lit: 19 } }),
  },
  B24: {
    about: "only three survived: the ledge is empty except for three men; the count drops as we push in on them",
    cam: move(aim([0.2, 2.5, 3.4], [0.2, 2.65, -3.9], 54, 0.4), aim([0.2, 2.55, 2.4], [0.2, 2.65, -3.9], 54, 0.4)),
    actors: () => THREE_LEFT.map(([x, z], i) => ({ spec: INVER_CREW[[0, 5, 11][i]], p: on("I", x, z), yaw: (1 - i) * 0.2, face: SAD })),
    world: () => iDay({ swell: 2.2, spray: SURF_I(0.8) }),
    subject: () => THREE_LEFT.map(([x, z]) => head(on("I", x, z))),
    focus: () => head(on("I", THREE_LEFT[1][0], THREE_LEFT[1][1])),
    lead: 1,
    blur: 1.2,
    overlay: (_t, ts) => ({ icons: { n: 19, lit: Math.max(3, 19 - Math.floor(ts / 0.055)) } }),
  },
  // ---------------------------------------------------------------- 28.3–31.3 s: same island, same cold, same storms
  B25: {
    about: "same island: the whole chart, both crosses and the route between them",
    cam: move({ pos: [0, -4.4, 16], look: [0, -0.2, 0], fov: 50 }, { pos: [0, -3.4, 13.4], look: [0, 0.2, 0], fov: 50 }, punch),
    actors: () => [],
    world: () => ({ set: "MAP", swell: 0, chart: { grafton: 1, invercauld: 1, route: 1 } }),
    subject: () => [[-0.3, -3.9, 0], [-1.75, 6.2, 0]],
    focus: () => [0, 0, 0],
    blur: 0,
  },
  B26: {
    about: "same cold: one Invercauld survivor alone in the dark, arms wrapped round himself, shaking",
    cam: move(aim([1.5, 2.7, 0.6], [0.2, 2.5, ledgeZ(0.2, 4.4)], 40, 0.42), aim([1.3, 2.7, 0.2], [0.2, 2.5, ledgeZ(0.2, 4.4)], 40, 0.42)),
    actors: (t) => [{ spec: INVER_CREW[5], p: on("I", 0.2, ledgeZ(0.2, 4.4)), yaw: 0.3, pose: { ...hunched, bob: 1.5 * sin(t * 11) }, face: { eyes: "squint", mouth: "frown", brows: "worried" } }],
    world: () => iDay({ swell: 2.2, spray: SURF_I(0.8) }),
    subject: () => [head(on("I", 0.2, ledgeZ(0.2, 4.4)))],
    focus: () => head(on("I", 0.2, ledgeZ(0.2, 4.4))),
    lead: 0,
    blur: 2.2,
  },
  B27: {
    about: "same storms: a sea bursts against the ledge and the cliff in a lightning flash",
    cam: move(aim([-13, 3.2, -2.6], [4, 5, 1.6], 58, 0.45), aim([-11.5, 3.4, -2.4], [4, 6, 1.6], 58, 0.45), punch),
    actors: () => [],
    world: (t) => {
      const t0 = T("B27").t;
      return iDay({ swell: 3, rain: 1, flash: flash(t, t0 + 0.28), bolt: [60, 20, 60], spray: [{ p: [-4, 0.5, 2.2], t0: t0 + 0.1, s: 3.2, seed: 2 }, { p: [3, 0.5, 2.4], t0: t0 + 0.25, s: 3.6, seed: 6 }, { p: [10, 0.5, 1.6], t0: t0 + 0.4, s: 3.0, seed: 13 }] });
    },
    subject: () => [[3, 3, 2]],
    focus: () => [3, 3, 2],
    fogK: 0.5,
    blur: 0.4,
  },
  // ---------------------------------------------------------------- 31.3–34 s: the difference
  B28: {
    about: "the biggest difference: out of the dark, the one warm place on the island: five men round a fire",
    cam: move(aim([4.4, 1.5, -2.0], [FIRE[0], 1.5, -11], 56, 0.42), aim([2.4, 1.55, -3.4], [FIRE[0], 1.5, -11], 56, 0.42)),
    actors: (t) => ring(t),
    world: () => gDay({ fire: 1.25, hutLit: 1 }),
    subject: (t) => [head(ring(t)[2].p)],
    focus: (t) => head(ring(t)[2].p),
    lead: 2,
    blur: 1.2,
  },
  B29: {
    about: "how they treated each other: close, one man hands a hot mug to another; both smile; a slow push-in to the end",
    cam: move(aim([-8.2, 1.5, -7.6], [-3.55, 1.6, -11.1], 50, 0.42), aim([-7.3, 1.5, -8.3], [-3.55, 1.6, -11.1], 50, 0.42)),
    actors: (t) => handoff(t),
    world: () => gDay({ fire: 1.25, hutLit: 1 }),
    subject: (t) => [head(handoff(t)[0].p), head(handoff(t)[1].p)],
    focus: (t) => head(handoff(t)[1].p),
    lead: 1,
    blur: 2.0,
  },
};

/** the beat playing at film time t */
export const shotAt = (t: number) => {
  const i = Math.max(0, PLAN.findIndex((s) => t >= s.t && t < s.end));
  const shot = t >= PLAN[PLAN.length - 1].end ? PLAN[PLAN.length - 1] : PLAN[i];
  const ts = t - shot.t;
  const u = clamp(ts / (shot.end - shot.t));
  const S = SET[shot.id];
  return { shot, S, ts, u, cam: S.cam(u, t, ts) };
};
export { FPS, IH, NONE };
