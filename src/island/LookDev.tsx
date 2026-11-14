// Look-dev for "Same island": one test frame per planned scene (plan.json S01–S10) in its own light, at a key word,
// with the real captions; plus a crew sheet. Cheap stills to approve the look before the full build.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character3D, headOf } from "../inkbeat/char/Character3D";
import type { CharacterSpec, FaceState, Pose } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import type { Word } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { aim } from "../inkbeat/core/rig";
import type { Cam } from "../inkbeat/core/View";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { DURATION, FPS, SHOTS, WORDS } from "../plan.gen";
import { GRAFTON_CREW, INVER_CREW } from "./crew";
import { GRAFTON, World, groundAt } from "./Island";

const CHUNKS = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
const BG = "#1a1220";

type Actor = { spec: CharacterSpec; at: [number, number]; y?: number; yaw: number; pose?: Pose; face?: FaceState; hold?: "mug" | null };
type LookShot = {
  /** the key moment, seconds into the voice-over */
  t: number;
  cam: Cam;
  focus: V3;
  blur: number;
  actors: Actor[];
  world?: Partial<React.ComponentProps<typeof World>>;
  /** fog multiplier for aerials */
  fogK?: number;
  /** the actor whose face gets the cast light */
  lead?: number;
};

const g = GRAFTON;
const W = (x: number, z: number): V3 => [x, groundAt(x, z), z];
const HAMMER: Pose = { armL: [10, 0], armR: [118, 70], armRFwd: 40, lean: 4 };
const WORK: Pose = { armL: [40, 60], armLFwd: 70, armR: [40, 60], armRFwd: 70, lean: 10 };
const CRAWL: Pose = { armL: [70, 10], armLFwd: 90, armR: [62, 14], armRFwd: 90, lean: 24 };
const SAD: FaceState = { eyes: "half", mouth: "frown", brows: "worried" };
const GLAD: FaceState = { eyes: "open", mouth: "smile", brows: "raised" };

export const LOOK: Record<string, LookShot> = {
  // the hook: the 1864 board in the sand, the Grafton wreck behind it, the island beyond
  S01: { t: 1.9, cam: aim([-20.5, 1.7, 17.2], [-29.5, 1.5, 15.4], 52, 0.42), focus: [-27.6, 0.9, 14.2], blur: 0.9, actors: [], world: { swell: 2 } },
  // aerials look straight down, rolled 90° so the island's long (east-west) axis runs up the vertical frame
  S02: { t: 6.6, cam: { pos: [0, 90, 32], look: [0, 0, 4], fov: 52, roll: 90 }, focus: [0, 0, 5], blur: 0, actors: [], world: { swell: 1.6 }, fogK: 0.15 },
  S03: {
    t: 9.6,
    cam: aim([g[0] + 3.4, 1.5, g[2] + 12.4], [g[0] + 0.9, 1.35, g[2] + 4.2], 54, 0.4),
    focus: [g[0] + 1.6, 1.5, g[2] + 4.2],
    blur: 1.4,
    lead: 1,
    actors: [
      { spec: GRAFTON_CREW[0], at: [g[0] - 1.9, g[2] + 3.4], yaw: 0.5, pose: HAMMER, face: GLAD },
      { spec: GRAFTON_CREW[1], at: [g[0] + 3.4, g[2] + 6.2], yaw: -0.4, pose: { armL: [10, 0], armR: [60, 80], armRFwd: 50 }, face: { eyes: "open", mouth: "grin", brows: "raised" } },
      { spec: GRAFTON_CREW[2], at: [g[0] + 4.9, g[2] + 3.0], yaw: -1.6, pose: WORK, face: GLAD },
    ],
  },
  S04: {
    t: 14.6,
    cam: aim([39.5, 1.7, 7.4], [31.6, 0.6, 13.6], 58, 0.42),
    focus: [31.4, 0.6, 13.6],
    blur: 1.0,
    lead: 1,
    actors: [
      { spec: INVER_CREW[0], at: [29.4, 13.6], yaw: 3.0, pose: CRAWL, face: SAD },
      { spec: INVER_CREW[1], at: [31.5, 12.6], yaw: 3.25, pose: CRAWL, face: { eyes: "squint", mouth: "open", brows: "worried" } },
      { spec: INVER_CREW[2], at: [33.8, 14.2], yaw: 2.8, pose: CRAWL, face: SAD },
    ],
    world: { swell: 2.4, hutLit: 0 },
  },
  S05: {
    t: 20.5,
    cam: aim([g[0] + 10.5, 1.5, g[2] + 12.6], [g[0] + 6.5, 0.9, g[2] + 7], 48, 0.42),
    focus: [g[0] + 6.5, 0.9, g[2] + 7],
    blur: 1.4,
    lead: 0,
    actors: [
      { spec: GRAFTON_CREW[3], at: [g[0] + 5.6, g[2] + 8.6], yaw: 2.6, pose: WORK, face: GLAD },
      { spec: GRAFTON_CREW[4], at: [g[0] + 7.9, g[2] + 6.2], yaw: -0.2, pose: HAMMER, face: GLAD },
    ],
  },
  S06: {
    t: 23.0,
    cam: aim([-16.5, 2.4, 33.5], [-24, 1.1, 24], 46, 0.45),
    focus: [-24, 1.1, 24],
    blur: 0.6,
    lead: 1,
    actors: [
      { spec: GRAFTON_CREW[0], at: [-24.9, 24.0], y: 0.32, yaw: 0.9, face: { eyes: "squint", mouth: "flat", brows: "angry" } },
      { spec: GRAFTON_CREW[3], at: [-24.0, 24.15], y: 0.32, yaw: 1.2, pose: { armL: [10, 0], armR: [100, 30], armRFwd: 80 }, face: { eyes: "wide", mouth: "open", brows: "raised" } },
      { spec: GRAFTON_CREW[4], at: [-23.1, 23.95], y: 0.32, yaw: 1.5, face: { eyes: "squint", mouth: "flat", brows: "worried" } },
    ],
    world: { swell: 2.8, boat: "afloat", boatT: 0, hutLit: 0 },
  },
  S07: {
    t: 25.1,
    cam: aim([-25.7, 1.6, 21.2], [-26, 1.25, 11.6], 50, 0.4),
    focus: [-26, 1.4, 11.6],
    blur: 1.6,
    lead: 2,
    actors: GRAFTON_CREW.map((spec, i) => ({
      spec,
      at: [-28.4 + i * 1.2, 11.2 + Math.abs(i - 2) * 0.35] as [number, number],
      yaw: (2 - i) * 0.12,
      pose: i === 1 ? { armL: [10, 0], armR: [150, 20], armRFwd: 20 } : i === 3 ? { armL: [60, 20], armLFwd: 20, armR: [10, 0] } : undefined,
      face: { eyes: "open", mouth: "grin", brows: "raised" } as FaceState,
    })),
    world: { boat: "beach" },
  },
  S08: {
    t: 27.1,
    cam: aim([31, 2.6, 0.5], [31, 0.6, 11], 58, 0.42),
    focus: [31, 0.8, 11],
    blur: 0.6,
    lead: 1,
    actors: [
      { spec: INVER_CREW[0], at: [27.2, 10.2], yaw: 2.6, face: SAD },
      { spec: INVER_CREW[1], at: [31.4, 12.4], yaw: 3.3, face: SAD },
      { spec: INVER_CREW[2], at: [35.0, 9.2], yaw: 3.7, face: SAD },
    ],
    world: { hutLit: 0 },
  },
  S09: { t: 29.6, cam: { pos: [0, 102, 36], look: [0, 0, 5], fov: 50, roll: 90 }, focus: [0, 0, 6], blur: 0, actors: [], world: { swell: 1.8 }, fogK: 0.15 },
  S10: {
    t: 32.6,
    cam: aim([g[0] + 3.6, 1.7, g[2] + 13.0], [g[0] + 2.6, 1.3, g[2] + 4.6], 54, 0.4),
    focus: [g[0] + 1.6, 1.3, g[2] + 5.2],
    blur: 1.8,
    lead: 2,
    actors: [
      { spec: GRAFTON_CREW[0], at: [g[0] + 1.6, g[2] + 5.0], yaw: 0.9, hold: "mug", face: GLAD },
      { spec: GRAFTON_CREW[1], at: [g[0] + 4.8, g[2] + 5.4], yaw: -1.2, hold: "mug", face: { eyes: "closed", mouth: "grin", brows: "raised" } },
      { spec: GRAFTON_CREW[2], at: [g[0] + 3.2, g[2] + 6.6], yaw: 3.0, face: GLAD },
      { spec: GRAFTON_CREW[3], at: [g[0] + 2.6, g[2] + 2.7], yaw: 0.2, hold: "mug", face: GLAD },
      { spec: GRAFTON_CREW[4], at: [g[0] + 5.0, g[2] + 3.4], yaw: -0.6, face: { eyes: "open", mouth: "grin", brows: "neutral" } },
    ],
  },
};

const holdPose: Pose = { armL: [6, 0], armR: [18, 92], armRFwd: 62 };

export const LookDevFrame: React.FC<{ shot: string }> = ({ shot }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const L = LOOK[shot];
  const plan = (SHOTS as unknown as { id: string; mood: string }[]).find((s) => s.id === shot)!;
  const m = moodOf(plan.mood);
  const t = L.t + f / 30;
  const lead = L.actors[L.lead ?? 0];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={L.cam} t={t} focus={L.focus} blur={L.blur} fogK={L.fogK ?? 1}>
        <World t={t} {...(L.world ?? {})} />
        {L.actors.map((a, i) => (
          <Character3D
            key={i}
            {...a.spec}
            position={a.y !== undefined ? [a.at[0], a.y, a.at[1]] : W(a.at[0], a.at[1])}
            yaw={a.yaw}
            t={t + i * 0.7}
            face={a.face}
            pose={a.hold ? holdPose : a.pose}
            hold={a.hold ?? null}
            faceCamera={L.cam.pos}
            faceCameraAmount={0.35}
          />
        ))}
        {lead ? <CastLight at={headOf(W(lead.at[0], lead.at[1]), lead.spec.height, lead.spec.build)} cam={L.cam.pos} mood={m} /> : null}
      </View>
      <Captions chunks={CHUNKS} t={t} accent={new Set(["five", "three", "difference"])} />
    </AbsoluteFill>
  );
};

/** the two crews side by side in one light: the Grafton five (left) and the Invercauld men (right) */
export const CrewSheet: React.FC = () => {
  const ready = useFonts();
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const m = moodOf("day");
  const cam = aim([0, 1.25, 9.4], [0, 1.0, 0], 34, 0.5);
  const all = [...GRAFTON_CREW, ...INVER_CREW];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={cam} t={1.2} focus={[0, 1.1, 0]} blur={0.3} width={1920} height={1080} sky={false}>
        <mesh position={[0, -0.05, -1]} receiveShadow>
          <boxGeometry args={[30, 0.1, 10]} />
          <meshToonMaterial color="#cdb88e" />
        </mesh>
        <mesh position={[0, 3, -4]}>
          <boxGeometry args={[30, 7, 0.2]} />
          <meshToonMaterial color="#9fb6c8" />
        </mesh>
        {all.map((spec, i) => (
          <Character3D key={i} {...spec} position={[(i - 3.5) * 1.15 + (i >= 5 ? 0.6 : 0), 0, 0]} yaw={0} t={1.2 + i} face={i >= 5 ? SAD : GLAD} faceCamera={cam.pos} faceCameraAmount={0.2} />
        ))}
        <CastLight at={headOf([0, 0, 0], 1.78, GRAFTON_CREW[0].build)} cam={cam.pos} mood={m} />
      </View>
    </AbsoluteFill>
  );
};

export const LOOK_IDS = Object.keys(LOOK);
