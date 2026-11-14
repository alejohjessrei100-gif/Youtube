// "Same island": the full vertical Short. One persistent View (one WebGL canvas for the whole film); the setup comes
// from plan.gen (word-anchored); inside each setup the beat rig moves the camera on WORDS (never typed times); every
// setup change is a whip (out of the old framing, into the new one), never a static cut. Characters act from t.
// Everything is a pure function of the frame.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D, headOf } from "../inkbeat/char/Character3D";
import type { CharacterSpec, FaceState, Pose } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import type { Word } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { aim, poseAt, withShake } from "../inkbeat/core/rig";
import type { Beat, BeatPrm, Cam } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { DURATION, FPS, SHOTS, WORDS } from "../plan.gen";
import { GRAFTON_CREW, INVER_CREW } from "./crew";
import { GRAFTON, World, groundAt } from "./Island";

const CHUNKS = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
const BG = "#1a1220";
const PLAN = SHOTS as unknown as { id: string; t: number; end: number; mood: string }[];

// ------------------------------------------------------------------ word anchors (never type a time)
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** onset (s) of the nth occurrence of a word of the voice-over */
export const w = (word: string, nth = 1): number => {
  let k = 0;
  for (const [txt, t] of WORDS as unknown as Word[]) {
    if (norm(txt) === norm(word) && ++k === nth) return t;
  }
  throw new Error(`word not in the voice-over: ${word} #${nth}`);
};
/** a beat that starts 6 frames before its word (moves lead the word) */
const B = (move: string, word: string, nth = 1, prm: BeatPrm = {}): [Beat, BeatPrm] => [{ t: w(word, nth) - 6 / FPS, move, dur: prm.dur ?? 19 / FPS, word }, prm];

// ------------------------------------------------------------------ actors
type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: Pose; face?: FaceState; hold?: "mug" | null; faceCam?: number };
const W = (x: number, z: number, y?: number): V3 => [x, y ?? groundAt(x, z), z];
const g = GRAFTON;
const sin = Math.sin;
const GLAD: FaceState = { eyes: "open", mouth: "smile", brows: "raised" };
const SAD: FaceState = { eyes: "half", mouth: "frown", brows: "worried" };
/** hammering: the right arm swings 1.6 Hz (under the ~2 Hz strobing limit) */
const hammer = (t: number, ph = 0): Pose => ({ armL: [12, 0], armR: [100 + 28 * sin(t * 2 * Math.PI * 1.6 + ph), 70], armRFwd: 40, lean: 5 });
/** sawing / planing: both arms forward, pushing and pulling 1.3 Hz */
const work = (t: number, ph = 0): Pose => {
  const k = sin(t * 2 * Math.PI * 1.3 + ph);
  return { armL: [42 + 8 * k, 50 - 10 * k], armLFwd: 70, armR: [42 + 8 * k, 50 - 10 * k], armRFwd: 70, lean: 12 + 3 * k };
};
const holdPose: Pose = { armL: [6, 0], armR: [18, 92], armRFwd: 62 };

type Setup = {
  base: Cam;
  beats: [Beat, BeatPrm][];
  actors: (t: number, ts: number) => Actor[];
  world?: (t: number, ts: number) => Partial<React.ComponentProps<typeof World>>;
  lead?: number;
  fogK?: number;
  blur?: number;
  focus?: V3;
};

const boatAt = (ts: number) => ({ x: -24 + ts * 0.9, z: 24 + ts * 1.4 });

const SET: Record<string, Setup> = {
  // HOOK: the 1864 board and the Grafton wreck; push, slide along the hull, rise to show the island
  S01: {
    base: aim([-18.4, 1.8, 18.6], [-29.0, 1.4, 15.0], 50, 0.42),
    beats: [B("PUSH", "two", 1, { frac: 0.1 }), B("ORBIT_R", "wrecked", 1, { deg: 9 }), B("PUSH", "island", 1, { frac: 0.08 }), B("CRANE_UP", "apart", 1, { up: 2.2, tilt: 0.25, dur: 0.9 })],
    actors: () => [],
    world: () => ({ swell: 2 }),
    focus: [-27.6, 0.9, 14.2],
    blur: 0.9,
  },
  // the aerial: neither crew can see the other
  S02: {
    base: { pos: [0, 90, 32], look: [0, 0, 4], fov: 52, roll: 90 },
    beats: [B("PUSH", "knew", 1, { frac: 0.08 }), B("ORBIT_L", "there", 1, { deg: 8, dur: 0.8 })],
    actors: () => [],
    world: () => ({ swell: 1.6 }),
    fogK: 0.15,
    blur: 0,
    focus: [0, 0, 4],
  },
  // the Grafton camp: five men, a hut, the cooking, the shared work
  S03: {
    base: aim([g[0] + 3.4, 1.5, g[2] + 12.4], [g[0] + 0.9, 1.35, g[2] + 4.2], 54, 0.4),
    beats: [B("PUSH", "five", 1, { frac: 0.1 }), B("ORBIT_R", "hut", 1, { deg: 10 }), B("DOLLY_R", "cooking", 1, { side: 1.4 }), B("PUSH", "shared", 1, { frac: 0.12 })],
    actors: (t) => [
      { spec: GRAFTON_CREW[0], p: W(g[0] - 1.9, g[2] + 3.4), yaw: 0.5, pose: hammer(t), face: GLAD },
      { spec: GRAFTON_CREW[1], p: W(g[0] + 3.4, g[2] + 6.2), yaw: -0.4, pose: { armL: [10, 0], armR: [60, 80], armRFwd: 50 }, face: { eyes: "open", mouth: "grin", brows: "raised" } },
      { spec: GRAFTON_CREW[2], p: W(g[0] + 4.9, g[2] + 3.0), yaw: -1.6, pose: work(t), face: GLAD },
      { spec: GRAFTON_CREW[3], p: W(g[0] + 1.6, g[2] + 6.9), yaw: 2.4, pose: holdPose, hold: "mug", face: GLAD },
      { spec: GRAFTON_CREW[4], p: W(g[0] - 3.6, g[2] + 5.2), yaw: 0.9, pose: work(t, 1.2), face: GLAD },
    ],
    lead: 1,
    blur: 1.4,
    focus: [g[0] + 1.6, 1.5, g[2] + 4.6],
  },
  // 40 KM away: the signpost, then down to the Invercauld surf; the men stagger ashore, then scatter
  S04: {
    base: aim([7.0, groundAt(7.0, 13.4) + 2.0, 13.4], [7.3, groundAt(7, 9) + 2.0, 9.0], 44, 0.45),
    beats: [
      B("PUSH", "kilometres", 1, { frac: 0.12 }),
      B("TO", "nineteen", 1, { to: aim([39.5, 1.8, 7.0], [31.6, 0.8, 11.6], 56, 0.42), dur: 0.9 }),
      B("PUSH", "crawled", 1, { frac: 0.08 }),
      B("PULL", "every", 2, { frac: -0.14, dur: 0.8 }),
    ],
    actors: (t, ts) => {
      const scatter = Math.max(0, t - w("every", 2));
      const ashore = Math.min(1, Math.max(0, (t - w("nineteen")) / 2.6));
      const man = (i: number, x: number, out: number): Actor => {
        const z = 12.0 - ashore * 2.2 - (i % 2) * 0.5;
        const away = scatter > 0;
        const yaw = away ? out : 3.1 + (i - 1) * 0.15;
        const dx = away ? sin(out) * scatter * 0.9 : 0;
        const dz = away ? Math.cos(out) * scatter * 0.9 : 0;
        return {
          spec: INVER_CREW[i],
          p: W(x + dx, z + dz),
          yaw,
          pose: { walk: (ts + i) * 4.2, lean: away ? 6 : 16, armL: [24, 30], armLFwd: 60, armR: [20, 34], armRFwd: 60 },
          face: away ? { eyes: "squint", mouth: "flat", brows: "angry" } : SAD,
          faceCam: away ? 0 : 0.35,
        };
      };
      return [man(0, 29.4, 1.9), man(1, 31.5, 3.6), man(2, 33.8, 5.0)];
    },
    world: () => ({ swell: 2.4, hutLit: 0 }),
    lead: 1,
    blur: 1.0,
    focus: [31.6, 0.8, 11.6],
  },
  // the Grafton crew builds a boat
  S05: {
    base: aim([g[0] + 10.5, 1.5, g[2] + 12.6], [g[0] + 6.5, 0.9, g[2] + 7], 48, 0.42),
    beats: [B("PUSH", "nineteen", 2, { frac: 0.1 }), B("ORBIT_L", "built", 2, { deg: 12 }), B("PUSH", "boat", 1, { frac: 0.12 })],
    actors: (t) => [
      { spec: GRAFTON_CREW[3], p: W(g[0] + 5.6, g[2] + 8.6), yaw: 2.6, pose: work(t), face: GLAD },
      { spec: GRAFTON_CREW[4], p: W(g[0] + 7.9, g[2] + 6.2), yaw: -0.2, pose: hammer(t, 0.8), face: GLAD },
      { spec: GRAFTON_CREW[1], p: W(g[0] + 4.6, g[2] + 6.4), yaw: 0.9, pose: work(t, 2.1), face: GLAD },
    ],
    world: (_t, ts) => ({ boat: "building", boatBuilt: 0.35 + Math.min(0.6, ts * 0.22) }),
    lead: 0,
    blur: 1.4,
    focus: [g[0] + 6.5, 0.9, g[2] + 7],
  },
  // three of them sail for help
  S06: {
    base: aim([-16.5, 2.4, 33.5], [-24, 1.1, 24], 46, 0.45),
    beats: [B("PUSH", "sailed", 1, { frac: 0.1 }), B("PULL", "ocean", 1, { frac: -0.3, dur: 1.0 }), B("SHAKE", "ocean", 1)],
    actors: (t, ts) => {
      const b = boatAt(ts);
      const bob = 0.12 * sin(t * 1.3);
      return [
        { spec: GRAFTON_CREW[0], p: [b.x - 0.9, 0.32 + bob, b.z], yaw: 0.9, face: { eyes: "squint", mouth: "flat", brows: "angry" } },
        { spec: GRAFTON_CREW[3], p: [b.x, 0.32 + bob, b.z + 0.15], yaw: 1.2, pose: { armL: [10, 0], armR: [100, 30], armRFwd: 80 }, face: { eyes: "wide", mouth: "open", brows: "raised" } },
        { spec: GRAFTON_CREW[4], p: [b.x + 0.9, 0.32 + bob, b.z - 0.05], yaw: 1.5, face: { eyes: "squint", mouth: "flat", brows: "worried" } },
      ];
    },
    world: (_t, ts) => ({ swell: 2.8, boat: "afloat", boatAt: boatAt(ts), hutLit: 0 }),
    lead: 1,
    blur: 0.6,
    focus: [-24, 1.1, 24],
  },
  // all five lived
  S07: {
    base: aim([-20.4, 1.6, 7.6], [-26.4, 1.2, 11.8], 50, 0.4),
    beats: [B("PUNCH", "lived", 1, { frac: 0.1 })],
    actors: (t) =>
      GRAFTON_CREW.map((spec, i) => ({
        spec,
        p: W(-28.4 + i * 1.2, 11.2 + Math.abs(i - 2) * 0.35),
        yaw: 2.0 + (2 - i) * 0.1,
        pose: i % 2 ? { armL: [10, 0], armR: [150 + 10 * sin(t * 6 + i), 20], armRFwd: 20 } : { armL: [10, 0], armR: [10, 0], bob: 2 * sin(t * 5 + i) },
        face: { eyes: "open", mouth: "grin", brows: "raised" },
      })),
    world: () => ({ boat: "none" }), // the boat has sailed
    lead: 2,
    blur: 1.6,
    focus: [-26, 1.4, 11.6],
  },
  // only three survived: far apart, still
  S08: {
    base: aim([31, 2.4, -2.5], [31, 0.7, 11], 60, 0.42),
    beats: [B("PULL", "only", 1, { frac: -0.1, dur: 1.4 })],
    actors: () => [
      { spec: INVER_CREW[0], p: W(28.2, 10.4), yaw: 2.7, face: SAD },
      { spec: INVER_CREW[1], p: W(31.3, 12.0), yaw: 3.25, face: SAD },
      { spec: INVER_CREW[2], p: W(34.2, 9.6), yaw: 3.6, face: SAD },
    ],
    world: () => ({ hutLit: 0 }),
    lead: 1,
    blur: 0.6,
    focus: [31, 0.8, 11],
  },
  // same island, same cold, same storms: three cranes up
  S09: {
    base: { pos: [0, 70, 26], look: [0, 0, 5], fov: 50, roll: 90 },
    beats: [B("CRANE_UP", "cold", 2, { up: 14, tilt: 0 }), B("CRANE_UP", "storms", 1, { up: 14, tilt: 0 }), B("SHAKE", "storms", 1)],
    actors: () => [],
    world: () => ({ swell: 2.6 }),
    fogK: 0.15,
    blur: 0,
    focus: [0, 0, 5],
  },
  // PAYOFF: the Grafton fire, the five together, the lit hut window
  S10: {
    base: aim([g[0] + 3.8, 1.75, g[2] + 14.0], [g[0] + 2.6, 1.3, g[2] + 4.6], 54, 0.4),
    beats: [B("PUSH", "difference", 1, { frac: 0.12, dur: 1.0 }), B("PUSH", "treated", 1, { frac: 0.1, dur: 1.2 })],
    actors: (t) => [
      { spec: GRAFTON_CREW[0], p: W(g[0] + 1.2, g[2] + 5.4), yaw: 1.2, pose: holdPose, hold: "mug", face: GLAD },
      { spec: GRAFTON_CREW[1], p: W(g[0] + 5.6, g[2] + 5.6), yaw: -1.3, pose: holdPose, hold: "mug", face: { eyes: "closed", mouth: "grin", brows: "raised" } },
      { spec: GRAFTON_CREW[2], p: W(g[0] + 2.4, g[2] + 2.2), yaw: 0.6, pose: { armL: [10, 0], armR: [55 + 10 * sin(t * 3), 70], armRFwd: 50 }, face: GLAD },
      { spec: GRAFTON_CREW[3], p: W(g[0] + 4.6, g[2] + 2.4), yaw: -0.5, pose: holdPose, hold: "mug", face: GLAD },
      { spec: GRAFTON_CREW[4], p: W(g[0] + 6.4, g[2] + 3.8), yaw: -1.0, face: { eyes: "open", mouth: "grin", brows: "neutral" } },
    ],
    lead: 2,
    blur: 1.8,
    focus: [g[0] + 3.4, 1.3, g[2] + 4.2],
  },
};

// ------------------------------------------------------------------ camera: beats, plus a whip between setups
const WHIP = 8 / FPS; // the whip-out at a setup's end and the whip-in at the next start
const camAt = (sid: string, t0: number, t1: number, t: number): Cam => {
  const S = SET[sid];
  const beats = S.beats.map(([b]) => (b.move === "TO" ? { ...b, move: "PUSH" } : b));
  const prms = S.beats.map(([, p]) => p);
  const p = poseAt(S.base, beats, t0, t, prms);
  let c: Cam = withShake(p, p.shake);
  // whip-out over the last WHIP seconds, whip-in over the first WHIP seconds (opposite direction)
  const out = Math.max(0, (t - (t1 - WHIP)) / WHIP);
  const inn = Math.max(0, 1 - (t - t0) / WHIP);
  const pan = 22 * (out * out) - 22 * (inn * inn);
  if (pan !== 0) {
    const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
    const a = (-pan * Math.PI) / 180;
    const rd: V3 = [d[0] * Math.cos(a) + d[2] * Math.sin(a), d[1], -d[0] * Math.sin(a) + d[2] * Math.cos(a)];
    c = { ...c, look: [c.pos[0] + rd[0], c.pos[1] + rd[1], c.pos[2] + rd[2]] };
  }
  return c;
};

export const SameIsland: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = f / FPS;
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const i = Math.max(0, PLAN.findIndex((s) => t >= s.t && t < s.end));
  const shot = PLAN[i] ?? PLAN[PLAN.length - 1];
  const S = SET[shot.id];
  const ts = t - shot.t;
  const cam = camAt(shot.id, shot.t, shot.end, t);
  const m = moodOf(shot.mood);
  const actors = S.actors(t, ts);
  const lead = actors[S.lead ?? 0];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={cam} t={t} focus={S.focus ?? cam.look} blur={S.blur ?? 1.2} fogK={S.fogK ?? 1}>
        <World t={t} {...(S.world ? S.world(t, ts) : {})} />
        {actors.map((a, k) => (
          <Character3D
            key={`${shot.id}-${k}`}
            {...a.spec}
            position={a.p}
            yaw={a.yaw}
            t={t + k * 0.7}
            face={a.face}
            pose={a.pose}
            hold={a.hold ?? null}
            faceCamera={a.faceCam === 0 ? undefined : cam.pos}
            faceCameraAmount={a.faceCam ?? 0.35}
          />
        ))}
        {lead ? <CastLight at={headOf(lead.p, lead.spec.height, lead.spec.build)} cam={cam.pos} mood={m} /> : null}
      </View>
      <Captions chunks={CHUNKS} t={t} accent={new Set(["five", "three", "difference"])} />
      <Audio src={staticFile("audio/same-island-mix.mp3")} />
    </AbsoluteFill>
  );
};

export const SAME_ISLAND_FRAMES = DURATION;
