// Character animation trial: one character acting a 12.5 s scene on the demo street, to lock the animation style.
//   walk in, look around → stop and settle → wave → a ball drops: startled hop back (squash and stretch) → lunge and
//   catch it on the bounce → admire it → toss it up and catch it → wind up, throw it off-screen → crash: flinch →
//   awkward thumbs-up → walk off. The head follows the ball; hands land on the ball with arm IK.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { lerp, lookAt, mixArm, squash, step, track, trackV, walkAt, window01 } from "../inkbeat/anim/acting";
import type { K, WalkSeg } from "../inkbeat/anim/acting";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { solveArm } from "../inkbeat/core/ik";
import { M, sphG } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import type { Cam } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { Street } from "../demo/Street";
import { styleOf } from "../styles/styles";

export const ACT_SECONDS = 12.5;
const FPS = 30;
export const ACT_FRAMES = Math.round(ACT_SECONDS * FPS);
const PI = Math.PI;
const G = 9.8;
const R = 0.13; // ball radius

export const HERO: CharacterSpec = {
  height: 1.74,
  build: { ...styleOf("toon").adult, shoulders: 1.1 },
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#d8572a", inner: CLOTH.cream, bottom: "#3a4a6a", shoes: CLOTH.oxblood, accent: CLOTH.horn }, hair: "swoop", hairColor: HAIR.espresso, face: { blush: 0.3, brow: 1.25 }, seed: 8 },
};
const H = HERO.height;

// ------------------------------------------------------------------ the ball's physics (everything else is timed to it)
const DROP = { t: 3.67, y: 3.5 };
const T_LAND = DROP.t + Math.sqrt((2 * (DROP.y - R)) / G); // ≈ 4.50
const V_BOUNCE = 0.6 * G * (T_LAND - DROP.t);
const CATCH_Y = 0.98;
const T_C = T_LAND + (V_BOUNCE + Math.sqrt(V_BOUNCE * V_BOUNCE - 2 * G * (CATCH_Y - R))) / G; // ≈ 5.20
const BALL_Z = 0.82;
const HOLD: V3 = [0, 0.92, 0.72];
const T_TOSS = 7.25;
const TOSS_Y = 1.25;
const V_TOSS = Math.sqrt(2 * G * (2.95 - TOSS_Y));
const T_C2 = T_TOSS + (V_TOSS + Math.sqrt(V_TOSS * V_TOSS + 2 * G * (TOSS_Y - 1.1))) / G; // ≈ 8.37
const T_THROW = 9.85;
const THROW_FROM: V3 = [0.4, 1.58, 0.5];
const THROW_V: V3 = [8.5, 3.4, 1.4];
export const T_CRASH = 10.35;
const ballAt = (t: number): V3 | null => {
  if (t < DROP.t) return null;
  if (t < T_LAND) return [0, DROP.y - 0.5 * G * (t - DROP.t) ** 2, BALL_Z];
  if (t < T_C) {
    const u = t - T_LAND;
    return [0, R + V_BOUNCE * u - 0.5 * G * u * u, BALL_Z];
  }
  if (t < T_TOSS) {
    // carried: from the catch point to the hold, lifted to admire it, then the dip before the toss
    const z = track([[T_C, BALL_Z], [T_C + 0.4, HOLD[2], "out"]], t);
    const y = track([[T_C, CATCH_Y], [T_C + 0.25, 0.86, "out"], [T_C + 0.6, HOLD[1], "inout"], [6.2, HOLD[1]], [6.55, 1.1, "inout"], [6.85, 0.98, "inout"], [7.05, 0.8, "inout"], [T_TOSS, TOSS_Y, "in"]], t);
    return [0, y, z];
  }
  if (t < T_C2) {
    const u = t - T_TOSS;
    return [0, TOSS_Y + V_TOSS * u - 0.5 * G * u * u, HOLD[2]];
  }
  if (t < 9.5) return [0, track([[T_C2, 1.1], [T_C2 + 0.15, 0.9, "out"], [T_C2 + 0.45, 0.96, "back"]], t), HOLD[2]];
  if (t < T_THROW) {
    const u = (t - 9.5) / (T_THROW - 9.5);
    const e = u * u * (3 - 2 * u);
    return [lerp(0, THROW_FROM[0], e), lerp(0.96, THROW_FROM[1], e), lerp(HOLD[2], THROW_FROM[2], e)];
  }
  const u = t - T_THROW;
  if (u > 1.2) return null;
  return [THROW_FROM[0] + THROW_V[0] * u, THROW_FROM[1] + THROW_V[1] * u - 0.5 * G * u * u, THROW_FROM[2] + THROW_V[2] * u];
};

// ------------------------------------------------------------------ the root: walks, the hop, the yaw
export const WALKS: WalkSeg[] = [
  { t0: 0, t1: 1.9, from: [-2.9, 0, 0], to: [-0.55, 0, 0], ease: "linear" },
  { t0: 1.9, t1: 2.45, from: [-0.55, 0, 0], to: [0, 0, 0], ease: "out" },
  { t0: 4.92, t1: T_C - 0.02, from: [0, 0, -0.38], to: [0, 0, 0.4], ease: "out" },
  { t0: 10.95, t1: 12.5, from: [0, 0, 0.4], to: [2.3, 0, 0.6], ease: "linear" },
];
const rootAt = (t: number): { p: V3; walk?: number } => {
  // the startled hop back happens between the first two walks
  if (t >= 4.48 && t < 4.92) {
    const z = track([[4.48, 0], [4.86, -0.38, "out"]], t);
    const y = track([[4.48, 0], [4.66, 0.3, "out"], [4.86, 0, "in"]], t);
    return { p: [0, y, z] };
  }
  const r = walkAt(WALKS, t < 4.48 ? [0, 0, 0] : t < 11 ? [0, 0, 0.4] : [0, 0, 0.4], t, H);
  if (t >= 4.86 && t < 4.92) return { p: [0, 0, -0.38] };
  return r;
};
const YAW: K<number>[] = [[0, PI / 2], [2.25, PI / 2], [2.8, 0.22, "back"], [4.4, 0.22], [4.6, 0.05, "out"], [10.75, 0.05], [11.15, 1.4, "inout"], [12.5, 1.45]];
const SQUASH: K<number>[] = [
  [0, 1], [2.4, 1], [2.52, 0.96, "out"], [2.7, 1.0, "back"],
  [4.36, 1], [4.46, 0.88, "inout"], [4.55, 1.08, "out"], [4.78, 1.0], [4.86, 0.9, "out"], [5.0, 1.0, "back"],
  [T_C - 0.02, 1], [T_C + 0.08, 0.95, "out"], [T_C + 0.25, 1, "back"],
  [7.05, 1], [7.15, 0.95, "inout"], [7.27, 1.04, "out"], [7.45, 1, "inout"],
  [T_C2 - 0.02, 1], [T_C2 + 0.08, 0.95, "out"], [T_C2 + 0.25, 1, "back"],
  [T_CRASH + 0.02, 1], [T_CRASH + 0.12, 0.93, "out"], [T_CRASH + 0.5, 1, "inout"],
];
const LEAN: K<number>[] = [
  [0, 5], [2.3, 5], [2.5, -6, "out"], [2.75, 3, "inout"], [2.95, 0, "inout"],
  [4.35, 0], [4.46, 7, "inout"], [4.6, -14, "out"], [4.9, -6], [5.0, 8, "out"], [T_C, 12], [T_C + 0.3, 2, "back"],
  [6.2, 2], [6.55, 6, "inout"], [7.0, 6], [7.12, 11, "inout"], [7.3, -7, "out"], [7.7, -3],
  [T_C2 - 0.15, -2], [T_C2 + 0.08, 8, "out"], [T_C2 + 0.4, 2, "back"],
  [9.5, 0], [9.78, -11, "inout"], [T_THROW + 0.08, 15, "out"], [10.25, 4, "back"],
  [T_CRASH, 3], [T_CRASH + 0.15, -4, "out"], [10.8, 0, "inout"], [11.1, 5, "inout"],
];
const BOB: K<number>[] = [[0, 0], [8.6, 0], [8.75, 6, "out"], [8.9, 0, "inout"], [9.05, 5, "out"], [9.2, 0, "inout"], [T_CRASH, 0], [T_CRASH + 0.12, -9, "out"], [10.8, 0, "inout"]];

// ------------------------------------------------------------------ arms (keyed) and when the hands go to the ball
type A2 = [number, number];
const ARM_L: K<A2>[] = [
  [0, [8, 0]], [2.4, [10, 0]], [4.4, [10, 0]], [4.56, [150, 25], "back"], [4.9, [125, 40]], [5.0, [60, 40]],
  [7.25, [140, 15], "out"], [7.6, [115, 25]], [8.1, [70, 55]],
  [9.5, [40, 70]], [9.75, [70, 20], "inout"], [10.2, [25, 10]], [T_CRASH + 0.05, [25, 10]], [T_CRASH + 0.18, [55, 120], "out"], [10.85, [14, 0]], [12.5, [10, 0]],
];
const ARM_LF: K<number>[] = [[0, 0], [4.4, 0], [4.56, 25], [5.0, 50], [7.25, 40], [8.1, 55], [9.5, 40], [9.75, -10], [10.2, 0], [T_CRASH + 0.18, 70, "out"], [10.85, 0]];
const ARM_R: K<A2>[] = [
  [0, [8, 0]], [2.55, [12, 0]], [2.78, [148, 45], "back"], [4.0, [148, 45]], [4.22, [20, 10], "inout"],
  [4.4, [20, 10]], [4.56, [150, 25], "back"], [4.9, [125, 40]], [5.0, [60, 40]],
  [7.25, [140, 15], "out"], [7.6, [115, 25]], [8.1, [70, 55]],
  [T_THROW, [120, 30]], [T_THROW + 0.18, [62, 10], "out"], [10.25, [30, 20]], [T_CRASH + 0.05, [30, 20]], [T_CRASH + 0.18, [55, 120], "out"],
  [10.6, [72, 105], "back"], [10.85, [72, 105]], [11.05, [12, 0], "inout"],
];
const ARM_RF: K<number>[] = [[0, 0], [2.55, 0], [2.78, 12], [4.0, 12], [4.22, 0], [4.56, 25], [5.0, 50], [7.25, 40], [8.1, 55], [T_THROW, 30], [T_THROW + 0.18, 80, "out"], [10.25, 30], [T_CRASH + 0.18, 70, "out"], [10.6, 78], [10.85, 78], [11.05, 0]];
/** how much each hand is solved onto the ball (0 = keyed arm, 1 = hand on the ball) */
const ikL = (t: number) => Math.max(window01(t, T_C - 0.22, T_TOSS + 0.08, 0.2, 0.1), window01(t, T_C2 - 0.2, 9.55, 0.2, 0.1));
const ikR = (t: number) => Math.max(window01(t, T_C - 0.22, T_TOSS + 0.08, 0.2, 0.1), window01(t, T_C2 - 0.2, T_THROW + 0.04, 0.2, 0.06));

// ------------------------------------------------------------------ faces
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });
const FACES: [number, FaceState][] = [
  [0, F("open", "smile", "neutral")], [0.9, F("half", "o", "raised")], [1.7, F("open", "smile", "neutral")],
  [2.6, F("open", "grin", "raised")], [4.2, F("open", "smile", "raised")],
  [4.42, F("wide", "o", "raised")], [4.95, F("squint", "flat", "angry")], [T_C + 0.1, F("wide", "grin", "raised")],
  [6.3, F("open", "grin", "raised")], [7.0, F("squint", "smirk", "raised")], [7.3, F("wide", "smile", "raised")],
  [T_C2 + 0.1, F("half", "grin", "raised")], [9.45, F("squint", "flat", "angry")], [T_THROW + 0.1, F("open", "o", "raised")],
  [T_CRASH + 0.04, F("closed", "frown", "worried", { flush: 0.4 })], [10.55, F("open", "grin", "worried", { sweat: true })], [11.2, F("open", "smile", "neutral")],
];

// ------------------------------------------------------------------ the camera: follows the hero with a lag, pushes in for the catch
const CAM_D: K<number>[] = [[0, 5.8], [2.6, 5.1, "inout"], [4.3, 5.6, "inout"], [5.3, 4.3, "inout"], [8.6, 4.1], [9.6, 5.3, "inout"], [12.5, 6.6, "inout"]];
const CAM_Y: K<number>[] = [[0, 1.08], [6.9, 1.12], [7.5, 1.75, "inout"], [8.2, 1.2, "inout"], [12.5, 1.1]];
const CAM_X: K<number>[] = [[0, 0], [9.8, 0], [10.3, 0.55, "out"], [10.8, 0.15, "inout"], [12.5, 0]];
const camAt = (t: number): Cam => {
  const lagX = (rootAt(Math.max(0, t - 0.35)).p[0] + rootAt(Math.max(0, t - 0.15)).p[0]) / 2;
  const look: V3 = [lagX + track(CAM_X, t), track(CAM_Y, t), 0.2];
  const d = track(CAM_D, t);
  const a = 0.22 + 0.01 * t;
  return { pos: [look[0] + Math.sin(a) * d, 1.55, look[2] + Math.cos(a) * d], look, fov: 42, roll: 0 };
};

// ------------------------------------------------------------------ the hero at t
const heroAt = (t: number) => {
  const root = rootAt(t);
  const yaw = track(YAW, t);
  const sc = squash(track(SQUASH, t));
  const lean = track(LEAN, t);
  const ball = ballAt(t);
  // the head: a slow look around while walking in, to camera, then follows the ball; a lag on body turns
  const head: V3 = [root.p[0], root.p[1] + H * 0.86, root.p[2]];
  let hy = t < 2.3 ? 26 * Math.sin(t * 1.9) : 0;
  let hn = t < 2.3 ? -4 : 0;
  const follow = window01(t, 3.75, 10.55, 0.25, 0.3);
  if (ball && follow > 0) {
    const l = lookAt(head, ball, yaw);
    hy = lerp(hy, l.yaw, follow);
    hn = lerp(hn, l.nod, follow);
  }
  hy += -18 * (track(YAW, t) - track(YAW, Math.max(0, t - 0.15))); // overlap: the head lags a turn
  // arms: keyed, then solved onto the ball where the hands hold it
  let armL = trackV(ARM_L, t);
  let armR = trackV(ARM_R, t);
  let fwdL = track(ARM_LF, t);
  let fwdR = track(ARM_RF, t);
  if (t >= 2.78 && t < 4.0) armR = [armR[0], 45 + 32 * Math.sin(2 * PI * 1.7 * (t - 2.78))]; // the wave
  const wl = ikL(t);
  const wr = ikR(t);
  if (ball && (wl > 0 || wr > 0)) {
    const right: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const toLocal = (p: V3): V3 => [Math.round(((p[0] - root.p[0]) / sc[0]) * 100) / 100, Math.round(((p[1] - root.p[1]) / sc[1]) * 100) / 100, Math.round(((p[2] - root.p[2]) / sc[2]) * 100) / 100];
    const oneHand = t > 9.5;
    if (wl > 0 && !oneHand) {
      const a = solveArm({ position: [0, 0, 0], yaw, side: "L", target: toLocal([ball[0] - right[0] * 0.15, ball[1], ball[2] - right[2] * 0.15 - 0.03]), height: H, build: HERO.build, base: { lean: Math.round(lean) } });
      armL = mixArm(armL, a.arm, wl);
      fwdL = lerp(fwdL, a.fwd, wl);
    }
    if (wr > 0) {
      const off = oneHand ? 0.02 : 0.15;
      const a = solveArm({ position: [0, 0, 0], yaw, side: "R", target: toLocal([ball[0] + right[0] * off, ball[1] - (oneHand ? 0.08 : 0), ball[2] + right[2] * off - 0.03]), height: H, build: HERO.build, base: { lean: Math.round(lean) } });
      armR = mixArm(armR, a.arm, wr);
      fwdR = lerp(fwdR, a.fwd, wr);
    }
  }
  const pose: BodyPose = { walk: root.walk, lean, bob: track(BOB, t), armL, armR, armLFwd: fwdL, armRFwd: fwdR, headYaw: hy, headNod: hn, headTilt: t >= 8.5 && t < 9.4 ? 8 : 0 };
  return { root, yaw, sc, pose, face: step(FACES, t), ball };
};

export const ActLab: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1220" }} />;
  const t = Math.min(f / FPS, ACT_SECONDS - 1e-3);
  const h = heroAt(t);
  const cam = camAt(t);
  const m = moodOf("day");
  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <View mood={m} cam={cam} t={t} focus={[h.root.p[0], 1.3, h.root.p[2]]} blur={1.2}>
        <Street shopSign="BAKERY" />
        <group position={h.root.p} scale={h.sc}>
          <Character3D {...HERO} position={[0, 0, 0]} yaw={h.yaw} t={t} face={h.face} pose={h.pose} />
        </group>
        {h.ball ? (
          <group position={h.ball}>
            <M g={sphG(R, 20)} c="#e83a3a" />
            <M g={sphG(R * 1.005, 20)} c="#f4ead6" s={[1, 0.22, 1]} cast={false} />
          </group>
        ) : null}
        <CastLight at={[h.root.p[0], 1.5, h.root.p[2]]} cam={cam.pos} mood={m} k={0.6} />
      </View>
      {audio ? <Audio src={staticFile("audio/actlab-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
/** sound cue times for tools/audio_actlab.py */
export const ACT_EVENTS = { land: T_LAND, catch1: T_C, toss: T_TOSS, catch2: T_C2, throw: T_THROW, crash: T_CRASH, hopUp: 4.48, hopDown: 4.86, wave: 2.78 };
