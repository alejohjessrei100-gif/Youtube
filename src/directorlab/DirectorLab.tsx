// Director test: one continuous shot with no cuts. The camera is driven by importance weights (core/director.ts):
//   a man flips his lucky coin (he is the subject) → he throws it: the coin becomes the subject, the camera follows its
//   arc → a woman walks in and catches it: the camera widens to hold both → his exaggerated shocked take, held →
//   he runs over and begs → she flips it back: the coin again → it bonks him on the head → she laughs.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character3D, headOf } from "../inkbeat/char/Character3D";
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { lerp, squash, step, track, trackV, walkAt, window01 } from "../inkbeat/anim/acting";
import type { K, WalkSeg } from "../inkbeat/anim/acting";
import { CastLight } from "../inkbeat/core/castLight";
import { direct } from "../inkbeat/core/director";
import type { Subject } from "../inkbeat/core/director";
import { useFonts } from "../inkbeat/core/frame";
import { handWorld } from "../inkbeat/core/ik";
import { cylG, M } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { Street } from "../demo/Street";
import { HERO } from "../actlab/ActLab";
import { styleOf } from "../styles/styles";

export const DIR_SECONDS = 10;
export const DIR_FRAMES = DIR_SECONDS * 30;
const PI = Math.PI;
const G = 9.8;
const PAL: CharacterSpec = {
  height: 1.66,
  build: { ...styleOf("toon").adult, shoulders: 1.0, torso: "barrel" },
  look: { skin: SKIN.brown, outfit: "sweater", colors: { top: "#3a8a6a", inner: CLOTH.cream, bottom: "#3a3d4a", shoes: CLOTH.oxblood, accent: CLOTH.cream }, hair: "bob", hairColor: HAIR.black, face: { blush: 0.4, brow: 1.2, lash: true }, seed: 19 },
};
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });

// ------------------------------------------------------------------ timing
const T = { throw: 2.2, catch: 3.35, take: 3.7, run0: 5.1, run1: 5.85, beg: 5.9, flip: 7.3, bonk: 8.05 };

// ------------------------------------------------------------------ the man (A)
const A0: V3 = [-0.7, 0, 0];
const A_WALK: WalkSeg[] = [{ t0: T.run0, t1: T.run1, from: A0, to: [0.3, 0, 0.32], ease: "out" }];
const aYaw: K<number>[] = [[0, 0.2], [T.throw - 0.2, 0.2], [T.throw, 0.55, "out"], [T.catch + 0.1, 0.9, "inout"], [T.run0, 1.1], [T.run0 + 0.2, 1.3, "inout"], [T.beg, 1.2], [T.bonk + 0.6, 0.6, "inout"]];
const aArmR: K<[number, number]>[] = [
  [0, [40, 85]], [T.throw - 0.35, [30, 95]], [T.throw - 0.05, [150, 20], "out"], [T.throw + 0.3, [120, 10]], [T.take, [60, 30]],
  [T.take + 0.12, [155, 25], "back"], [T.run0, [150, 30]], [T.beg, [90, 100]], [T.flip, [90, 100]], [T.bonk + 0.05, [150, 120], "out"], [T.bonk + 0.6, [100, 130]],
];
const aArmL: K<[number, number]>[] = [[0, [14, 0]], [T.take, [14, 0]], [T.take + 0.12, [155, 25], "back"], [T.run0, [150, 30]], [T.beg, [90, 100]], [T.flip, [90, 100]], [T.bonk + 0.05, [150, 120], "out"], [T.bonk + 0.6, [100, 130]]];
const aFace: [number, FaceState][] = [
  [0, F("half", "smirk", "raised")], [T.throw, F("open", "grin", "raised")], [T.catch - 0.05, F("open", "flat", "neutral")],
  [T.take, F("huge", "scream", "high", { sweat: true })], [T.run0 + 0.1, F("wide", "yell", "worried", { sweat: true })],
  [T.beg, F("wide", "wavy", "worried", { sweat: true })], [T.flip + 0.2, F("sparkle", "beam", "high")], [T.bonk, F("closed", "grimace", "furious", { flush: 0.6 })], [T.bonk + 0.7, F("squint", "wavy", "worried")],
];
const aStretch: K<number>[] = [[0, 1], [T.take - 0.02, 1], [T.take + 0.08, 1.28, "out"], [T.take + 0.7, 1.22], [T.take + 0.95, 1, "back"], [T.bonk - 0.01, 1], [T.bonk + 0.07, 0.75, "out"], [T.bonk + 0.45, 1, "back"]];
const aSquash: K<number>[] = [[0, 1], [T.take - 0.05, 1], [T.take, 0.9, "out"], [T.take + 0.12, 1.08, "out"], [T.take + 0.6, 1, "back"], [T.bonk, 1], [T.bonk + 0.06, 0.88, "out"], [T.bonk + 0.4, 1, "back"]];
const aHop: K<number>[] = [[0, 0], [T.take - 0.01, 0], [T.take + 0.15, 0.22, "out"], [T.take + 0.32, 0, "in"]];
const aLean: K<number>[] = [[0, 0], [T.throw - 0.3, 8], [T.throw, -10, "out"], [T.throw + 0.4, 0, "back"], [T.take, 0], [T.take + 0.12, -14, "out"], [T.run0, 6], [T.run1, 16], [T.beg, 12], [T.flip, 10], [T.bonk + 0.05, -6, "out"], [T.bonk + 0.5, 4, "inout"]];
const aAt = (t: number) => {
  const w = walkAt(A_WALK, t < T.run0 ? A0 : [0.3, 0, 0.32], t, HERO.height);
  const p: V3 = [w.p[0], track(aHop, t), w.p[2]];
  const yaw = track(aYaw, t);
  // the small coin flips in the first two seconds: the hand bobs
  let armR = trackV(aArmR, t);
  if (t < T.throw - 0.4) armR = [armR[0] + 12 * Math.max(0, Math.sin(t * 2 * PI * 0.9)), armR[1]];
  let armL = trackV(aArmL, t);
  if (t > T.beg && t < T.flip) {
    // begging: hands pressed together, bobbing
    const b = 6 * Math.sin((t - T.beg) * 2 * PI * 1.6);
    armR = [armR[0] + b, armR[1]];
    armL = [armL[0] + b, armL[1]];
  }
  const pose: BodyPose = {
    walk: w.walk, lean: track(aLean, t), armR, armL, armRFwd: t > T.take ? 60 : 50, armLFwd: t > T.take ? 60 : 0,
    headStretch: track(aStretch, t), headNod: t < T.throw ? 10 : t < T.catch + 0.2 ? -22 * window01(t, T.throw, T.catch + 0.2, 0.2, 0.2) : 0,
    headTilt: t > T.beg && t < T.flip ? 10 * Math.sin((t - T.beg) * 3) : 0,
  };
  return { p, yaw, pose, face: step(aFace, t), sc: squash(track(aSquash, t)) };
};

// ------------------------------------------------------------------ the woman (B)
const B1: V3 = [1.2, 0, 0.5];
const B_WALK: WalkSeg[] = [{ t0: 1.5, t1: T.catch - 0.15, from: [4.2, 0, 0.7], to: B1, ease: "out" }];
const bYaw: K<number>[] = [[0, -PI / 2], [T.catch - 0.3, -PI / 2], [T.catch, -0.9, "out"], [T.take + 0.4, -0.5, "inout"], [T.beg, -0.9, "inout"], [T.bonk + 0.3, -0.4, "inout"]];
const bArmR: K<[number, number]>[] = [[0, [14, 0]], [T.catch - 0.35, [14, 0]], [T.catch - 0.05, [80, 60], "out"], [T.catch + 0.6, [70, 95]], [T.beg, [30, 40]], [T.flip - 0.3, [40, 80]], [T.flip, [130, 30], "out"], [T.flip + 0.4, [60, 50]], [T.bonk + 0.2, [90, 110]]];
const bArmL: K<[number, number]>[] = [[0, [14, 0]], [T.beg, [14, 0]], [T.beg + 0.2, [40, 100], "inout"], [T.flip - 0.3, [40, 100]], [T.flip, [14, 0]], [T.bonk + 0.2, [90, 120], "out"]];
const bFace: [number, FaceState][] = [
  [0, F("open", "smile", "neutral")], [T.catch - 0.2, F("wide", "o", "raised")], [T.catch + 0.15, F("sparkle", "beam", "high")],
  [T.beg, F("glare", "smirk", "raised")], [T.flip - 0.3, F("half", "smirk", "raised")], [T.bonk, F("squint", "beam", "raised")],
];
const CATCH_POSE: BodyPose = { armR: [80, 60], armRFwd: 70, lean: 4 };
const bAt = (t: number) => {
  const w = walkAt(B_WALK, t < 1.5 ? [4.2, 0, 0.7] : B1, t, PAL.height);
  const laugh = window01(t, T.bonk + 0.1, DIR_SECONDS, 0.2, 0.2);
  const pose: BodyPose = {
    walk: w.walk, lean: lerp(4, 10, laugh), armR: trackV(bArmR, t), armL: trackV(bArmL, t), armRFwd: 70, armLFwd: 60,
    bob: laugh * 6 * Math.abs(Math.sin(t * 2 * PI * 1.8)), headNod: t > T.catch && t < T.catch + 0.8 ? 20 : 0,
  };
  return { p: w.p, yaw: track(bYaw, t), pose, face: step(bFace, t) };
};

// ------------------------------------------------------------------ the coin: in his hand, thrown, caught, flipped back, bonk
const handA = (t: number) => {
  const a = aAt(t);
  return handWorld({ position: a.p, yaw: a.yaw, height: HERO.height, build: HERO.build, pose: a.pose, side: "R" });
};
const catchPoint = (): V3 => {
  const p: V3 = B1;
  return handWorld({ position: p, yaw: track(bYaw, T.catch), height: PAL.height, build: PAL.build, pose: CATCH_POSE, side: "R" });
};
const ballistic = (from: V3, to: V3, t0: number, t1: number, t: number): V3 => {
  const T_ = t1 - t0;
  const u = t - t0;
  const v: V3 = [(to[0] - from[0]) / T_, (to[1] - from[1] + 0.5 * G * T_ * T_) / T_, (to[2] - from[2]) / T_];
  return [from[0] + v[0] * u, from[1] + v[1] * u - 0.5 * G * u * u, from[2] + v[2] * u];
};
const coinAt = (t: number): { p: V3; spin: number } => {
  if (t < T.throw) {
    const h = handA(t);
    const flip = t < T.throw - 0.4 ? 0.35 * Math.max(0, Math.sin(t * 2 * PI * 0.9)) : 0;
    return { p: [h[0], h[1] + 0.06 + flip, h[2]], spin: t * 14 };
  }
  if (t < T.catch) return { p: ballistic(add(handA(T.throw), [0, 0.06, 0]), catchPoint(), T.throw, T.catch, t), spin: t * 22 };
  if (t < T.flip) {
    const b = bAt(t);
    const h = handWorld({ position: b.p, yaw: b.yaw, height: PAL.height, build: PAL.build, pose: b.pose, side: "R" });
    return { p: [h[0], h[1] + 0.05, h[2]], spin: 0 };
  }
  const aHead = headOf(aAt(T.bonk).p, HERO.height, HERO.build);
  const top: V3 = [aHead[0], aHead[1] + 0.32, aHead[2]];
  const bh = (() => {
    const b = bAt(T.flip);
    return handWorld({ position: b.p, yaw: b.yaw, height: PAL.height, build: PAL.build, pose: b.pose, side: "R" });
  })();
  if (t < T.bonk) return { p: ballistic(bh, top, T.flip, T.bonk, t), spin: t * 26 };
  // the bounce off his head and onto the ground
  const u = t - T.bonk;
  const p: V3 = [top[0] - 0.9 * u, top[1] + 2.2 * u - 0.5 * G * u * u, top[2] + 0.6 * u];
  return { p: [p[0], Math.max(0.01, p[1]), p[2]], spin: p[1] > 0.02 ? t * 20 : 0 };
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------------ the camera: importance over time
const SUBJECTS: Subject[] = [
  { p: (t) => add(aAt(t).p, [0, 1.05, 0]), r: 0.8, w: (t) => track([[0, 1], [T.throw, 1], [T.throw + 0.2, 0.2, "inout"], [T.catch, 0.2], [T.take - 0.1, 1, "inout"], [T.flip, 1], [T.flip + 0.15, 0.4, "inout"], [T.bonk - 0.1, 1, "inout"]], t) },
  { p: (t) => coinAt(t).p, r: 0.4, w: (t) => track([[0, 0], [T.throw - 0.1, 0], [T.throw + 0.05, 1, "out"], [T.catch, 1], [T.catch + 0.4, 0.1, "inout"], [T.flip - 0.1, 0], [T.flip + 0.05, 1, "out"], [T.bonk, 1], [T.bonk + 0.3, 0, "inout"]], t) },
  { p: (t) => add(bAt(t).p, [0, 1.0, 0]), r: 0.75, w: (t) => track([[0, 0], [T.catch - 0.6, 0], [T.catch, 1, "inout"], [T.take - 0.1, 1], [T.take + 0.1, 0.3, "inout"], [T.run0, 0.3], [T.run1, 1, "inout"], [DIR_SECONDS, 1]], t) },
];
const STYLE = {
  az: (t: number) => track([[0, 0.2], [T.catch, -0.1, "inout"], [T.take, 0.0, "inout"], [T.beg, -0.3, "inout"], [DIR_SECONDS, -0.2, "inout"]], t),
  el: (t: number) => track([[0, 0.08], [T.throw + 0.4, 0.02, "inout"], [T.catch + 0.3, 0.1, "inout"]], t),
  fov: 42,
  minR: 0.7,
  room: (t: number) => track([[0, 1.1], [T.throw, 1.1], [T.throw + 0.3, 0.95, "inout"], [T.catch, 1.05, "inout"], [T.take, 1.05], [T.take + 0.15, 0.85, "out"], [T.take + 1.0, 1.0, "inout"]], t),
  face: 0.42,
};

export const DirectorLab: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1220" }} />;
  const t = Math.min(f / 30, DIR_SECONDS - 1e-3);
  const cam = direct(SUBJECTS, STYLE, t);
  const a = aAt(t);
  const b = bAt(t);
  const coin = coinAt(t);
  const m = moodOf("golden");
  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <View mood={m} cam={cam} t={t} focus={add(a.p, [0, 1.2, 0])} blur={1.2}>
        <Street shopSign="PAWN" lamp={0.4} />
        <group position={a.p} scale={a.sc}>
          <Character3D {...HERO} position={[0, 0, 0]} yaw={a.yaw} t={t} face={a.face} pose={a.pose} />
        </group>
        <Character3D {...PAL} position={b.p} yaw={b.yaw} t={t + 0.7} face={b.face} pose={b.pose} />
        <group position={coin.p} rotation={[coin.spin, 0, 0.3]}>
          <M g={cylG(0.07, 0.07, 0.012, 20)} c="#f0c040" tex="metal" e="#ffd860" ei={0.45} r={[PI / 2, 0, 0]} />
        </group>
        <CastLight at={add(a.p, [0, 1.5, 0])} cam={cam.pos} mood={m} k={0.6} />
      </View>
    </AbsoluteFill>
  );
};
