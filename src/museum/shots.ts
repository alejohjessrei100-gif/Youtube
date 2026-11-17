// The museum short as DATA: 7 scenes, each one continuous shot (cuts only where the place or the time changes).
//   1 gallery, night, alarm: the guards burst in, mark break-in #11, sweep the walls (nothing gone), find the crooked
//     painting, straighten it; the lens pushes into the girl in the yellow dress.
//   2 security office: the guards lean into the monitors; the lens pushes into CAM 01.
//   3 CAM 01 (CCTV look): a hooded man stands before the painting; time-lapse; he touches the frame (crooked) and leaves.
//   4 gallery, the 12th night: flashlights snap on, he turns, the hood falls: he is 81; he points at the signature; his ID.
//   5 1964, the attic (golden memory): he paints June in the yellow dress; a dealer takes the canvas; rent money.
//   6 the lobby by day, rain: coins and a pressed flower in his palm; ADMISSION $32; he turns away.
//   7 gallery, warm: Dolores tears up the charge sheet, holds out a brass key; he takes it, then nudges the frame crooked.
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { headOf } from "../inkbeat/char/Character3D";
import { lerp, lookAt, mixArm, track, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import { handWorld, solveArm } from "../inkbeat/core/ik";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { DEALER, DOLORES, HENRY, HENRY_BARE, JUNE, MARCUS, YOUNG } from "./cast";
import { DOOR_Z, EASEL, GX, GZ, MON_MAIN, OFFICE, PAINT, PH, PW, SIG, STUDIO, STUDIO_DOOR, TALLY, TICKET, CAMERA_AT, LOBBY } from "./world";
import type { GalleryState, StudioState } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
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
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });

// ------------------------------------------------------------------ times (word anchors)
const T = {
  broken: W("broken"), eleven: W("eleven"), nothing: W("nothing"), stolen: W("stolen"), every: W("every"), guards: W("guards"),
  painting: W("painting"), crooked: W("crooked"), girl: W("girl"), yellow: W("yellow"), cameras: W("cameras"), man: W("man"),
  hoodie: W("hoodie"), standing: W("standing"), hour: W("hour"), then1: W("then"), leave: W("leave"), twelfth: W("twelfth"),
  caught: W("caught"), e81: W("eighty-one"), didnt: W("didn't"), run: W("run"), pointed: W("pointed"), signature: W("signature"),
  corner: W("corner"), it2: W("it", 2), his: W("his"), painted: W("painted"), wife: W("wife"), twenty: W("twenty"), sold: W("sold"),
  rent: W("rent"), money: W("money"), she: W("she"), passed: W("passed"), spring: W("spring"), couldnt: W("couldn't"),
  ticket: W("ticket"), see: W("see"), museum2: W("museum", 2), press: W("press"), charges: W("charges"), gave: W("gave"), key: W("key"),
  times: W("times"), hanging: W("hanging"), slightly: W("slightly"), dress: W("dress"),
};

// ------------------------------------------------------------------ helpers
const ik = (spec: CharacterSpec, p: V3, yaw: number, side: "L" | "R", target: V3, lean = 0) => {
  const r = (v: number) => Math.round(v * 100) / 100;
  return solveArm({ position: [0, 0, 0], yaw: r(yaw), side, target: [r(target[0] - p[0]), r(target[1] - p[1]), r(target[2] - p[2])], height: spec.height, build: spec.build, base: { lean: Math.round(lean) } });
};
const hand = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, side: "L" | "R") => handWorld({ position: p, yaw, height: spec.height, build: spec.build, pose, side });
const yawTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const head = (spec: CharacterSpec, p: V3) => headOf(p, spec.height, spec.build);
const look = (spec: CharacterSpec, p: V3, yaw: number, target: V3) => {
  const l = lookAt(head(spec, p), target, yaw);
  return { headYaw: l.yaw, headNod: l.nod };
};
const C = (pos: V3, lk: V3, fov: number): Cam => ({ pos, look: lk, fov, roll: 0 });
type Ez = "inout" | "out" | "in" | "linear";
const keyed = (keys: [number, Cam, Ez?][]) => (t: number): Cam => {
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
/** a lens that follows a keyed path but keeps its aim on a smoothed moving target */
const follow = (path: (t: number) => Cam, aim: (t: number) => V3 | null, k: (t: number) => number) => (t: number): Cam => {
  const c = path(t);
  const a = aim(t);
  const u = k(t);
  if (!a || u <= 0) return c;
  let acc: V3 = [0, 0, 0];
  let ws = 0;
  for (let i = 0; i < 9; i++) {
    const ts = t - 0.3 + (i / 8) * 0.45;
    const p = aim(ts) ?? a;
    const g = Math.exp(-((ts - t - 0.05) ** 2) / (2 * 0.12 ** 2));
    acc = add(acc, [p[0] * g, p[1] * g, p[2] * g]);
    ws += g;
  }
  return { ...c, look: mix3(c.look, [acc[0] / ws, acc[1] / ws, acc[2] / ws], u) };
};

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState };
export type Light = { p: V3; to: V3; on: number };
export type Extra = {
  lights?: [Light, Light];
  marker?: V3;
  id?: { p: V3; ry: number };
  palm?: { p: V3; ry: number };
  carried?: { p: V3; ry: number };
  sheet?: { p: V3; ry: number; torn: number };
};
export type Scene = {
  id: number;
  t0: number;
  mood: string;
  set: "gallery" | "office" | "studio" | "lobby";
  cam: (t: number) => Cam;
  actors: (t: number) => Actor[];
  gallery?: (t: number) => GalleryState;
  studio?: (t: number) => StudioState;
  extra?: (t: number) => Extra;
  focus: (t: number) => V3;
  blur: number;
  cctv?: boolean;
  memory?: boolean;
  /** CCTV time-lapse: a sped-up clock over [a, b] */
  lapse?: [number, number];
};

const ALARM = (t: number, until: number) => (t < until && Math.sin(t * PI * 2 * 2.2) > 0 ? 1 : 0) * clamp((until - t) / 0.4);
const H_P: V3 = [0.15, 0, -4.75];
const FRAME_CORNER: V3 = [PAINT[0] + PW / 2 + 0.05, PAINT[1] - PH / 2 - 0.03, PAINT[2] + 0.08];
const ROPE_Z = -GZ + 1.0;
const OFF = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });
const torchArm = (spec: CharacterSpec, p: V3, yaw: number, to: V3, lean = 0) => {
  const sh = add(p, [0, spec.height * 0.78, 0]);
  const d = [to[0] - sh[0], to[1] - sh[1], to[2] - sh[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const tgt: V3 = [sh[0] + (d[0] / L) * 0.55, sh[1] + (d[1] / L) * 0.55, sh[2] + (d[2] / L) * 0.55];
  return ik(spec, p, yaw, "R", tgt, lean);
};

// ================================================================== 1. the gallery: break-in #11, the crooked painting
// in through the doorway first (the opening is z 1.4 to 2.6 at x = GX), THEN along the wall to the tally
const D_DOOR: WalkSeg = { t0: T.broken - 0.1, t1: T.broken + 0.5, from: [6.6, 0, 2.0], to: [4.55, 0, 1.95] };
const D_IN: WalkSeg[] = [
  { t0: T.broken + 0.5, t1: T.eleven - 0.05, from: [4.55, 0, 1.95], to: [4.5, 0, 0.1] },
  { t0: T.every + 0.05, t1: T.slightly - 0.1, from: [4.5, 0, 0.05], to: [0.62, 0, -5.3] },
];
const M_IN: WalkSeg[] = [
  { t0: T.broken + 0.2, t1: T.eleven + 0.35, from: [7.4, 0, 2.0], to: [3.4, 0, 2.3] },
  { t0: T.every + 0.25, t1: T.crooked + 0.05, from: [3.4, 0, 2.35], to: [-0.75, 0, -4.6] },
  { t0: T.crooked + 0.55, t1: T.yellow + 0.1, from: [-0.75, 0, -4.6], to: [-1.05, 0, -4.2] },
];
const D_BACK: WalkSeg = { t0: T.crooked + 0.55, t1: T.yellow + 0.1, from: [0.62, 0, -5.3], to: [1.05, 0, -4.55] };
const sweep = (t: number): V3 => {
  // Marcus's beam: the left wall's paintings one by one, then the back wall
  const z = track([[T.nothing - 0.2, 2.6], [T.stolen, -0.6, "inout"], [T.stolen + 0.35, -3.6, "inout"]], t);
  const toPaint = smooth((t - T.every) / 0.6);
  return mix3([-GX + 0.1, 2.1, z], add(PAINT, [0, 0, 0.1]), toPaint);
};
const tiltAt = (t: number, base: number) => base * (1 - smooth((t - T.crooked - 0.1) / 0.35));
const dolores1 = (t: number) => {
  const w = walkAt([D_DOOR, D_IN[0], D_IN[1], D_BACK], [6.6, 0, 2.0], t, DOLORES.height);
  const p = w.p;
  let yaw = -PI / 2 - 0.15;
  if (t > D_DOOR.t1 - 0.15) yaw = lerp(-PI / 2, -PI, smooth((t - D_DOOR.t1 + 0.15) / 0.25));
  if (t > D_IN[0].t1 - 0.2) yaw = lerp(-PI, -1.5 * PI, smooth((t - D_IN[0].t1 + 0.2) / 0.3));
  if (t > T.nothing - 0.1) yaw = lerp(PI / 2, yawTo(D_IN[1].from, D_IN[1].to), smooth((t - T.nothing + 0.1) / 0.35));
  if (t > D_IN[1].t1 - 0.1) yaw = PI;
  if (t > D_BACK.t0) yaw = lerp(PI, PI - 0.3, smooth((t - D_BACK.t0) / 0.4));
  // the marker: up to the frame for the 11th mark
  const mark = window01(t, T.eleven - 0.05, T.times + 0.15, 0.2, 0.25);
  const torchTo = t < T.nothing ? add(p, [-2.5, 1.0, 0]) : t < T.every ? [GX - 2, 1.4, -2] as V3 : add(PAINT, [0, 0, 0.1]);
  const lean = 6 + 14 * window01(t, T.crooked - 0.2, T.crooked + 0.45, 0.2, 0.2);
  let pose: BodyPose = { walk: w.walk, lean, armL: [18, 10], armLFwd: 10 };
  const ta = torchArm(DOLORES, p, yaw, torchTo, lean);
  pose = { ...pose, armR: ta.arm, armRFwd: ta.fwd };
  if (mark > 0) {
    const sw = Math.sin(clamp((t - T.eleven - 0.05) / 0.35) * PI) * 0.12;
    const k = ik(DOLORES, p, yaw, "R", add(TALLY, [-0.1, 0.12 - sw, 0.25 - sw]), 4);
    void k;
    const kL = ik(DOLORES, p, yaw, "L", add(TALLY, [-0.1, 0.12 - sw, 0.25 - sw]), 4);
    pose = { ...pose, armL: mixArm([18, 10], kL.arm, mark), armLFwd: lerp(10, kL.fwd, mark) };
  }
  const fix = window01(t, T.crooked - 0.25, T.crooked + 0.5, 0.25, 0.25);
  if (fix > 0) {
    const k = ik(DOLORES, p, yaw, "L", FRAME_CORNER, lean);
    pose = { ...pose, armL: mixArm(pose.armL ?? [18, 10], k.arm, fix), armLFwd: lerp(pose.armLFwd ?? 10, k.fwd, fix) };
  }
  // the head tilt that matches the crooked frame
  const tilt = window01(t, T.hanging, T.crooked + 0.2, 0.2, 0.2);
  pose.headTilt = -16 * tilt;
  const angry = t < T.nothing;
  const face =
    t < T.eleven - 0.1 ? F("glare", "yell", "furious") :
    t < T.nothing ? F("angry", "grimace", "furious") :
    t < T.every ? F("squint", "flat", "angry") :
    t < T.crooked + 0.4 ? F("squint", "wavy", "raised", { look: 0.1 }) : F("open", "smirk", "raised");
  void angry;
  return { actor: OFF(DOLORES, p, yaw, pose, face), torch: hand(DOLORES, p, yaw, pose, "R"), torchTo, marker: mark > 0.2 ? hand(DOLORES, p, yaw, pose, "L") : undefined };
};
const marcus1 = (t: number) => {
  const w = walkAt(M_IN, [7.4, 0, 2.0], t, MARCUS.height);
  const p = w.p;
  let yaw = -PI / 2;
  if (t > M_IN[0].t1 - 0.2) yaw = lerp(-PI / 2, -PI / 2 - 0.5, smooth((t - M_IN[0].t1 + 0.2) / 0.3));
  if (t > T.every) yaw = lerp(-PI / 2 - 0.5, yawTo(M_IN[1].from, M_IN[1].to), smooth((t - T.every) / 0.35));
  if (t > M_IN[1].t1 - 0.1) yaw = PI + 0.1;
  const to = sweep(t);
  const shrug = window01(t, T.stolen - 0.4, T.every + 0.1, 0.12, 0.25);
  const crouch = window01(t, T.broken + 0.3, T.eleven + 0.3, 0.1, 0.3);
  const ta = torchArm(MARCUS, p, yaw, to, 4);
  let pose: BodyPose = { walk: w.walk, lean: 4 + 14 * crouch, armR: ta.arm, armRFwd: ta.fwd, armL: mixArm([18, 10], [60, 40], crouch), armLFwd: lerp(10, 50, crouch) };
  if (shrug > 0) pose = { ...pose, armL: mixArm(pose.armL!, [62, 95], shrug), armLFwd: lerp(pose.armLFwd!, 25, shrug), headNod: -12 * shrug, headTilt: 14 * shrug };
  const tilt = window01(t, T.hanging + 0.1, T.crooked + 0.25, 0.2, 0.2);
  pose.headTilt = (pose.headTilt ?? 0) - 18 * tilt;
  const face =
    t < T.eleven + 0.3 ? F("huge", "gasp", "high", { sweat: true }) :
    t < T.stolen - 0.05 ? F("wide", "o", "raised") :
    t < T.every + 0.1 ? F("wide", "wavy", "high") :
    t < T.crooked + 0.4 ? F("squint", "flat", "worried") : F("half", "smile", "raised");
  return { actor: OFF(MARCUS, p, yaw, pose, face), torch: hand(MARCUS, p, yaw, pose, "R"), torchTo: to };
};
const S1: Scene = {
  id: 1, t0: 0, mood: "night", set: "gallery", blur: 1.2,
  cam: follow(
    keyed([
      [0, C([3.5, 1.45, 4.1], [5.15, 1.25, 2.0], 50)],
      [T.broken + 0.5, C([2.0, 1.6, 4.9], [4.6, 1.35, 1.9], 54), "out"],
      [T.eleven + 0.1, C([3.75, 1.55, 1.75], [5.0, 1.3, 0.8], 44), "inout"],
      [T.nothing - 0.12, C([3.8, 1.55, 1.65], [5.0, 1.3, 0.8], 44)],
      [T.nothing + 0.45, C([2.6, 1.75, 3.2], [-GX, 2.0, 0.2], 58), "inout"],
      [T.stolen - 0.2, C([1.55, 1.6, 0.85], [3.0, 1.6, 2.0], 50), "inout"],
      [T.every + 0.1, C([2.4, 1.7, 2.6], [1.8, 1.5, 0.8], 54), "inout"],
      [T.slightly - 0.2, C([0.35, 1.7, -1.7], [0.1, 1.75, -5.6], 50), "inout"],
      [T.crooked + 0.5, C([0.15, 1.85, -2.6], [0.05, 1.9, -6.0], 48), "inout"],
      [T.dress + 0.4, C([0.0, 2.05, -3.55], [0.0, 2.05, -6.3], 44), "inout"],
    ]),
    // the shrug: the lens snaps to Marcus, then lets go
    (t) => (t > T.stolen - 0.6 && t < T.every + 0.3 ? add(head(MARCUS, marcus1(t).actor.p), [0, -0.25, 0]) : null),
    (t) => window01(t, T.stolen - 0.45, T.every + 0.1, 0.15, 0.2),
  ),
  actors: (t) => [dolores1(t).actor, marcus1(t).actor],
  gallery: (t) => ({ t, door: track([[0, 0.12 + 0.05 * Math.sin(t * 5)], [T.broken - 0.2, 0.2], [T.broken + 0.05, 1, "back"]], t), tally: t < T.eleven + 0.25 ? 10 : 11, tilt: tiltAt(t, 0.13), alarm: ALARM(t, T.every + 0.5), moon: 0.15, glow: smooth((t - T.yellow + 0.3) / 0.6) * 0.9 }),
  extra: (t) => {
    const d = dolores1(t);
    const m = marcus1(t);
    const on = (t0: number) => smooth((t - t0) / 0.08);
    return { lights: [{ p: d.torch, to: d.torchTo, on: on(T.broken - 0.1) * (1 - smooth((t - T.yellow) / 0.4) * 0.7) }, { p: m.torch, to: m.torchTo, on: on(T.broken) * (1 - smooth((t - T.yellow) / 0.4) * 0.7) }], marker: d.marker };
  },
  focus: (t) => (t < T.nothing ? TALLY : t < T.every ? [-GX, 2, 0] : PAINT),
};

// ================================================================== 2. the security office: CAM 01
const D_OFF: V3 = [OFFICE[0] - 0.55, 0, OFFICE[2] - 0.95];
const M_OFF: V3 = [OFFICE[0] + 0.45, 0, OFFICE[2] - 0.85];
const S2: Scene = {
  id: 2, t0: T.cameras - 0.08, mood: "lamp", set: "office", blur: 1.4,
  cam: keyed([
    [T.cameras - 0.08, C([OFFICE[0] + 1.7, 1.5, OFFICE[2] + 0.4], [OFFICE[0] - 0.1, 1.45, OFFICE[2] - 1.3], 50)],
    [T.man + 0.05, C([OFFICE[0] + 0.15, 1.65, OFFICE[2] + 0.2], [MON_MAIN[0], MON_MAIN[1], MON_MAIN[2]], 46), "inout"],
    [T.hoodie + 0.05, C([MON_MAIN[0], MON_MAIN[1] + 0.02, MON_MAIN[2] + 0.42], [MON_MAIN[0], MON_MAIN[1], MON_MAIN[2]], 42), "in"],
  ]),
  actors: (t) => {
    const lean = 26;
    const dk = ik(DOLORES, D_OFF, PI, "L", [OFFICE[0] - 0.5, 0.86, OFFICE[2] - 1.5], lean);
    const mk = ik(MARCUS, M_OFF, PI - 0.25, "R", [OFFICE[0] + 0.15, 0.86, OFFICE[2] - 1.5], lean);
    const shock = smooth((t - T.man) / 0.15);
    return [
      OFF(DOLORES, D_OFF, PI, { lean, armL: dk.arm, armLFwd: dk.fwd, armR: [20, 15], armRFwd: 20, headNod: 4 }, shock > 0.5 ? F("huge", "o", "high") : F("squint", "flat", "angry")),
      OFF(MARCUS, M_OFF, PI - 0.25, { lean, armR: mk.arm, armRFwd: mk.fwd, armL: [60, 70], armLFwd: 70, headNod: 2 }, shock > 0.5 ? F("huge", "gasp", "high") : F("open", "flat", "raised")),
    ];
  },
  focus: () => MON_MAIN,
};

// ================================================================== 3. CAM 01: the hooded man, an hour in seconds, the crooked frame
const H_LEAVE: WalkSeg = { t0: T.leave - 0.05, t1: T.twelfth - 0.05 + 0.6, from: H_P, to: [2.3, 0, -2.2] };
const henryCCTV = (t: number): Actor => {
  const w = walkAt([H_LEAVE], H_P, t, HENRY.height);
  const touch = window01(t, T.then1 - 0.2, T.leave + 0.05, 0.25, 0.2);
  let yaw = PI;
  if (t > T.leave - 0.2) yaw = lerp(PI, yawTo(H_LEAVE.from, H_LEAVE.to), smooth((t - T.leave + 0.2) / 0.3));
  // during the time-lapse he shifts a little, jumpily (12 poses per hour)
  const lap = Math.floor(clamp((t - T.standing) / (T.hour + 0.3 - T.standing)) * 12);
  const sway = Math.sin(lap * 1.7) * 6;
  let pose: BodyPose = { walk: w.walk, lean: 4 + Math.sin(lap * 2.3) * 3, armL: [8, 6], armLFwd: 18, armR: [8, 6], armRFwd: 18, headTilt: sway, headNod: -6 };
  if (touch > 0) {
    const k = ik(HENRY, w.p, yaw, "R", FRAME_CORNER, 10);
    pose = { ...pose, armR: mixArm([8, 6], k.arm, touch), armRFwd: lerp(18, k.fwd, touch), lean: 10 };
  }
  return OFF(HENRY, w.p, yaw, pose, F("half", "flat", "worried"));
};
const S3: Scene = {
  id: 3, t0: T.hoodie + 0.05, mood: "night", set: "gallery", blur: 0.6, cctv: true, lapse: [T.standing, T.hour + 0.3],
  cam: keyed([
    [T.hoodie + 0.05, C(add(CAMERA_AT, [-0.1, -0.12, -0.1]), [0.4, 1.3, -4.4], 34)],
    [T.leave + 0.6, C(add(CAMERA_AT, [-0.1, -0.12, -0.1]), [0.6, 1.25, -4.0], 28), "inout"],
  ]),
  actors: (t) => [henryCCTV(t)],
  gallery: (t) => ({ t, door: 0, tally: 11, tilt: 0.13 * smooth((t - T.leave + 0.1) / 0.3), alarm: 0, moon: smooth((t - T.standing) / (T.hour + 0.3 - T.standing)), glow: 0 }),
  extra: () => ({ lights: [{ p: [0, -5, 0], to: [0, -6, 0], on: 0 }, { p: [0, -5, 0], to: [0, -6, 0], on: 0 }] }),
  focus: () => H_P,
};

// ================================================================== 4. the twelfth time: caught; 81; the signature; his ID
const D4: WalkSeg = { t0: T.didnt - 0.1, t1: T.pointed - 0.1, from: [1.7, 0, -2.9], to: [0.95, 0, -3.85] };
const henry4 = (t: number): { a: Actor; id?: { p: V3; ry: number } } => {
  const turn = smooth((t - T.caught - 0.05) / 0.6);
  const toD = yawTo(H_P, [1.2, 0, -3.3]);
  const yaw = lerp(PI, 0.15, turn) + (t > T.pointed - 0.1 ? lerp(0, -0.55, smooth((t - T.pointed + 0.1) / 0.3)) * (1 - smooth((t - T.it2 + 0.1) / 0.3)) : 0) + (t > T.it2 - 0.1 ? lerp(0, toD - 0.15, smooth((t - T.it2 + 0.1) / 0.3)) : 0);
  const bare = t > T.e81 - 0.05;
  const spec = bare ? HENRY_BARE : HENRY;
  const point = window01(t, T.pointed - 0.1, T.it2 - 0.05, 0.3, 0.25);
  const card = smooth((t - T.it2 + 0.05) / 0.3);
  let pose: BodyPose = { lean: 6, armL: [8, 6], armLFwd: 18, armR: [8, 6], armRFwd: 18, headNod: 2 - 4 * turn };
  if (point > 0) {
    const k = ik(spec, H_P, yaw, "R", add(SIG, [0.35, 0.25, 1.0]), 6);
    pose = { ...pose, armR: mixArm([8, 6], k.arm, point), armRFwd: lerp(18, k.fwd, point) };
  }
  if (card > 0) {
    const k = ik(spec, H_P, yaw, "L", add(head(spec, H_P), [0.32, -0.28, 0.32]), 6);
    pose = { ...pose, armL: mixArm([8, 6], k.arm, card), armLFwd: lerp(18, k.fwd, card) };
  }
  // eyes: hidden in the hood's shadow, then the face: big, blinking, calm; a small sad smile at "his"
  const face =
    t < T.e81 ? F("half", "flat", "worried") :
    t < T.didnt ? F("huge", "o", "raised") :
    t < T.pointed ? F("open", "flat", "neutral") :
    t < T.it2 ? F("half", "smile", "worried", { look: 0.6 }) : F("sparkle", "smile", "worried");
  const id = card > 0.1 ? { p: add(hand(spec, H_P, yaw, pose, "L"), [0, 0.06, 0]), ry: yaw - 0.4 } : undefined;
  return { a: OFF(spec, H_P, yaw, pose, face), id };
};
const guard4 = (spec: CharacterSpec, base: V3, who: "D" | "M", t: number) => {
  const w = who === "D" ? walkAt([D4], base, t, spec.height) : { p: base, walk: undefined };
  const p = w.p;
  const hp = add(head(HENRY, H_P), [0, -0.25, 0]);
  const onAt = who === "M" ? T.twelfth + 0.25 : T.caught - 0.05;
  const toLight = t < T.pointed + 0.2 ? hp : mix3(hp, SIG, smooth((t - T.pointed - 0.2) / 0.3));
  let yaw = yawTo(p, H_P);
  if (who === "D" && t > T.it2 - 0.1) yaw = yawTo(p, H_P) - 0.2;
  const freeze = window01(t, onAt, T.e81 + 0.1, 0.1, 0.3);
  const flinch = window01(t, T.pointed - 0.1, T.pointed + 0.35, 0.08, 0.25);
  const ta = torchArm(spec, p, yaw, toLight, 8 * freeze);
  const lower = smooth((t - T.e81 - 0.1) / 0.4) * (1 - smooth((t - T.pointed) / 0.3));
  let pose: BodyPose = { walk: w.walk, lean: 8 * freeze - 10 * flinch, armR: mixArm(ta.arm, [30, 20], lower * 0.6), armRFwd: lerp(ta.fwd, 40, lower * 0.6), armL: mixArm([18, 10], [70, 60], freeze), armLFwd: lerp(10, 70, freeze) };
  pose = { ...pose, ...look(spec, p, yaw, t > T.pointed + 0.3 && t < T.it2 ? SIG : head(HENRY, H_P)), headStretch: 1 + 0.18 * window01(t, T.e81 + 0.05, T.didnt + 0.3, 0.06, 0.4) };
  if (who === "D" && t > T.it2 - 0.15) {
    const k = ik(spec, p, yaw, "L", add(head(HENRY, H_P), [0.45, -0.3, 0.45]), 4);
    const u = smooth((t - T.it2 + 0.15) / 0.3);
    pose = { ...pose, armL: mixArm(pose.armL!, k.arm, u), armLFwd: lerp(pose.armLFwd!, k.fwd, u) };
  }
  const face =
    t < onAt ? F("squint", "flat", "angry") :
    t < T.e81 + 0.05 ? F("glare", "yell", "furious") :
    t < T.pointed - 0.1 ? F("huge", "gasp", "high", { sweat: who === "M" }) :
    t < T.it2 ? F("wide", "o", "raised") :
    t < T.his + 0.15 ? F("huge", "o", "high") : F("sparkle", "wavy", "worried");
  return { a: OFF(spec, p, yaw, pose, face), torch: hand(spec, p, yaw, pose, "R"), to: toLight, on: smooth((t - onAt) / 0.06) };
};
const S4: Scene = {
  id: 4, t0: T.twelfth - 0.06, mood: "night", set: "gallery", blur: 1.3,
  cam: keyed([
    [T.twelfth - 0.06, C([0.05, 1.75, -0.6], [0.15, 1.3, -4.9], 50)],
    [T.caught + 0.1, C([0.25, 1.6, -1.9], [0.15, 1.35, -4.75], 46), "out"],
    [T.e81 + 0.25, C([0.35, 1.52, -3.45], [0.15, 1.45, -4.75], 40), "inout"],
    [T.run + 0.2, C([0.15, 1.7, -2.05], [0.2, 1.3, -4.45], 52), "inout"],
    [T.signature + 0.15, C([0.95, 1.55, -4.6], SIG, 34), "inout"],
    [T.corner + 0.35, C([0.9, 1.52, -4.75], SIG, 30)],
    [T.his + 0.2, C([-0.25, 1.6, -2.95], [0.55, 1.4, -4.35], 46), "inout"],
  ]),
  actors: (t) => [henry4(t).a, guard4(DOLORES, [1.7, 0, -2.9], "D", t).a, guard4(MARCUS, [-1.45, 0, -3.0], "M", t).a],
  gallery: (t) => ({ t, door: 0, tally: 11, tilt: 0, alarm: 0, moon: 0.4, glow: 0.4 * smooth((t - T.signature) / 0.4) }),
  extra: (t) => {
    const d = guard4(DOLORES, [1.7, 0, -2.9], "D", t);
    const m = guard4(MARCUS, [-1.45, 0, -3.0], "M", t);
    return { lights: [{ p: d.torch, to: d.to, on: d.on }, { p: m.torch, to: m.to, on: m.on }], id: henry4(t).id };
  },
  focus: (t) => (t > T.pointed + 0.2 && t < T.it2 ? SIG : head(HENRY, H_P)),
};

// ================================================================== 5. 1964: the attic; June; the dealer; rent money
const CANVAS_C: V3 = [EASEL[0], 1.36, EASEL[2] + 0.05];
const CAN_DIR: V3 = [Math.sin(-0.5), 0, Math.cos(-0.5)];
const Y_P: V3 = [EASEL[0] + 0.55, 0, EASEL[2] + 0.75];
const J_P: V3 = [EASEL[0] - 1.35, 0, EASEL[2] - 0.9];
const DLR_P: V3 = [STUDIO_DOOR[0] - 0.55, 0, STUDIO_DOOR[2]];
const youngAt = (t: number): Actor => {
  const toCanvas = yawTo(Y_P, CANVAS_C);
  const toDoor = yawTo(Y_P, DLR_P);
  const toJune = yawTo(Y_P, J_P);
  const yaw = t < T.sold - 0.2 ? toCanvas + 0.15 * Math.sin(t * 2) : t < T.money - 0.1 ? lerp(toCanvas, toDoor, smooth((t - T.sold + 0.2) / 0.3)) : lerp(toDoor, toJune, smooth((t - T.money + 0.1) / 0.35));
  const paint = t < T.sold - 0.2;
  const dab = Math.sin(t * 9) * 0.05;
  const k = ik(YOUNG, Y_P, yaw, "R", add(CANVAS_C, [0.1 + dab, 0.05 + dab, 0.25]), 8);
  const cash = smooth((t - T.rent + 0.15) / 0.3);
  const ck = ik(YOUNG, Y_P, yaw, "R", add(head(YOUNG, Y_P), [Math.sin(yaw) * 0.4, -0.45, Math.cos(yaw) * 0.4]), 2);
  const pose: BodyPose = paint
    ? { lean: 8, armR: k.arm, armRFwd: k.fwd, armL: [40, 60], armLFwd: 50, headTilt: 8 * Math.sin(t * 1.3) }
    : { lean: 2, armR: mixArm([20, 20], ck.arm, cash), armRFwd: lerp(20, ck.fwd, cash), armL: [16, 10], armLFwd: 10 };
  const face = paint ? (t < T.wife ? F("squint", "smile", "raised") : F("sparkle", "grin", "raised")) : t < T.money - 0.1 ? F("wide", "flat", "worried") : F("half", "wavy", "worried");
  return OFF(YOUNG, Y_P, yaw, pose, face);
};
const juneAt = (t: number): Actor => {
  const pose: BodyPose = t < T.sold ? { lean: -4, armR: [150, 150], armRFwd: 20, armL: [35, 70], armLFwd: -20, headTilt: 10 + 4 * Math.sin(t * 2.5), headNod: -6 } : { lean: 2, armR: [30, 50], armRFwd: 60, armL: [16, 10], armLFwd: 10, headTilt: 12 };
  const yaw = t < T.sold ? yawTo(J_P, Y_P) + 0.4 : yawTo(J_P, Y_P);
  const face = t < T.sold ? F("closed", "grin", "raised", { flush: 0.4 }) : t < T.money ? F("open", "o", "worried") : F("half", "smile", "worried", { flush: 0.3 });
  return OFF(JUNE, t < T.sold ? J_P : mix3(J_P, add(Y_P, [-0.6, 0, -0.2]), smooth((t - T.sold) / 0.7)), yaw, pose, face);
};
const dealerAt = (t: number): { a: Actor; carried?: { p: V3; ry: number } } => {
  const yaw = -PI / 2 + 0.3;
  const pose: BodyPose = { lean: 4, armL: [40, 30], armLFwd: 40, armR: [30, 40], armRFwd: 50 };
  const has = t > T.sold + 0.1;
  const face = F("half", "smirk", "neutral");
  return { a: OFF(DEALER, DLR_P, yaw, pose, face), carried: has ? { p: add(hand(DEALER, DLR_P, yaw, pose, "L"), [0, 0.25, 0]), ry: yaw - PI / 2 } : undefined };
};
const S5: Scene = {
  id: 5, t0: T.his + 0.35, mood: "golden", set: "studio", blur: 1.4, memory: true,
  cam: keyed([
    [T.his + 0.35, C(add(CANVAS_C, [CAN_DIR[0] * 1.25, 0.04, CAN_DIR[2] * 1.25]), CANVAS_C, 42)],
    [T.wife + 0.1, C(add(CANVAS_C, [CAN_DIR[0] * 2.4 + 0.9, 0.3, CAN_DIR[2] * 2.4 + 0.6]), add(CANVAS_C, [-0.5, -0.1, -0.4]), 50), "inout"],
    [T.sold + 0.1, C(add(CANVAS_C, [CAN_DIR[0] * 2.4 + 1.3, 0.3, CAN_DIR[2] * 2.4 + 0.7]), add(CANVAS_C, [-0.3, -0.1, -0.3]), 50), "inout"],
    [T.rent, C([STUDIO[0] + 1.0, 1.65, STUDIO[2] + 3.5], [STUDIO[0] + 1.7, 1.25, STUDIO[2] + 0.7], 50), "inout"],
    [T.money + 0.3, C([STUDIO[0] + 0.7, 1.6, STUDIO[2] + 3.4], [STUDIO[0] + 1.0, 1.3, STUDIO[2] + 0.4], 48), "inout"],
  ]),
  actors: (t) => [youngAt(t), juneAt(t), ...(t > T.sold - 0.4 ? [dealerAt(t).a] : [])],
  studio: (t) => ({ t, canvasOn: t < T.sold + 0.1 ? 1 : 0, door: smooth((t - T.sold + 0.5) / 0.35), cash: t > T.rent - 0.1 ? add(hand(YOUNG, Y_P, youngAt(t).yaw, youngAt(t).pose, "R"), [0, 0.03, 0]) : null }),
  extra: (t) => ({ carried: dealerAt(t).carried }),
  focus: (t) => (t < T.sold ? CANVAS_C : add(Y_P, [0, 1.4, 0])),
};

// ================================================================== 6. the lobby: coins, a pressed flower, $32
const H_L: V3 = [TICKET[0], 0, TICKET[2] + 0.8];
const henryLobby = (t: number): { a: Actor; palm: { p: V3; ry: number } } => {
  const turn = smooth((t - T.see + 0.05) / 0.5);
  const yaw = lerp(PI, 0.35, turn);
  const close = smooth((t - T.see) / 0.3);
  const palmT = add(H_L, [Math.sin(yaw) * 0.38 + 0.1, 1.08, Math.cos(yaw) * 0.38]);
  const k = ik(HENRY_BARE, H_L, yaw, "R", palmT, 6);
  const pose: BodyPose = { lean: 10, armR: mixArm(k.arm, [10, 8], close), armRFwd: lerp(k.fwd, 15, close), armL: [8, 6], armLFwd: 15, headNod: t < T.couldnt ? 16 : t < T.see ? -18 : 14 };
  const face = t < T.couldnt ? F("half", "wavy", "worried") : t < T.see ? F("open", "flat", "worried") : F("closed", "wavy", "worried");
  return { a: OFF(HENRY_BARE, H_L, yaw, pose, face), palm: { p: add(hand(HENRY_BARE, H_L, yaw, pose, "R"), [0, 0.035, 0]), ry: yaw } };
};
const S6: Scene = {
  id: 6, t0: T.she - 0.02, mood: "cold", set: "lobby", blur: 1.5,
  cam: follow(
    keyed([
      [T.she - 0.02, C([H_L[0] + 0.7, 1.22, H_L[2] - 1.25], [H_L[0] + 0.1, 1.25, H_L[2] - 0.3], 40)],
      [T.spring + 0.3, C([H_L[0] + 0.75, 1.25, H_L[2] - 1.35], [H_L[0] + 0.05, 1.35, H_L[2] - 0.25], 42)],
      [T.couldnt + 0.1, C([H_L[0] + 1.9, 2.05, H_L[2] - 0.2], [TICKET[0], 2.35, TICKET[2] - 0.9], 46), "inout"],
      [T.ticket, C([H_L[0] + 0.45, 1.75, H_L[2] + 1.15], [TICKET[0], 2.55, TICKET[2] - 0.9], 46), "inout"],
      [T.see + 0.6, C([H_L[0] + 0.55, 1.55, H_L[2] + 1.55], [H_L[0], 1.4, H_L[2]], 44), "inout"],
    ]),
    (t) => (t < T.spring + 0.4 ? henryLobby(t).palm.p : null),
    (t) => 0.55 * (1 - smooth((t - T.spring - 0.2) / 0.3)),
  ),
  actors: (t) => [henryLobby(t).a],
  extra: (t) => ({ palm: henryLobby(t).palm }),
  focus: (t) => (t < T.couldnt ? henryLobby(t).palm.p : t < T.see ? [TICKET[0], 2.6, TICKET[2] - 0.9] : head(HENRY_BARE, H_L)),
};
void LOBBY;

// ================================================================== 7. the key; the frame nudged crooked again
const D7: V3 = [1.3, 0, -4.55];
const M7: V3 = [-1.55, 0, -4.15];
const H7_GO: WalkSeg = { t0: T.key + 0.75, t1: T.key + 1.35, from: H_P, to: [0.42, 0, -5.25] };
const henry7 = (t: number): Actor => {
  const w = walkAt([H7_GO], H_P, t, HENRY.height);
  const toD = yawTo(H_P, D7) - 0.75;
  let yaw = toD;
  if (t > H7_GO.t0 - 0.2) yaw = lerp(toD, PI, smooth((t - H7_GO.t0 + 0.2) / 0.4));
  const take = smooth((t - T.key + 0.05) / 0.25);
  const kt = ik(HENRY_BARE, w.p, yaw, "R", add(D7, [-0.35, 1.05, -0.2]), 6);
  const nudge = window01(t, H7_GO.t1 + 0.1, SECONDS - 0.2, 0.3, 0.3);
  const kn = ik(HENRY_BARE, w.p, yaw, "R", FRAME_CORNER, 14);
  let pose: BodyPose = { walk: w.walk, lean: 6, armL: [8, 6], armLFwd: 18, armR: mixArm([8, 6], kt.arm, take * (1 - smooth((t - T.key - 0.35) / 0.3))), armRFwd: lerp(18, kt.fwd, take * (1 - smooth((t - T.key - 0.35) / 0.3))) };
  if (nudge > 0) pose = { ...pose, lean: 14, armR: mixArm([8, 6], kn.arm, nudge), armRFwd: lerp(18, kn.fwd, nudge) };
  // holds the key to his chest
  const chest = smooth((t - T.key - 0.25) / 0.3) * (1 - smooth((t - H7_GO.t0) / 0.3));
  if (chest > 0) pose = { ...pose, armL: mixArm([8, 6], [40, 120], chest), armLFwd: lerp(18, 80, chest) };
  const face = t < T.charges ? F("half", "flat", "worried") : t < T.gave ? F("open", "o", "raised") : t < H7_GO.t0 ? F("sparkle", "wavy", "high") : F("half", "smile", "raised");
  return OFF(HENRY_BARE, w.p, yaw, { ...pose, headStretch: 1 + 0.12 * window01(t, T.key, T.key + 0.6, 0.06, 0.3) }, face);
};
const dolores7 = (t: number): { a: Actor; key: V3 | null; sheet?: { p: V3; ry: number; torn: number } } => {
  const yaw = yawTo(D7, H_P) + 0.7;
  const sheetUp = window01(t, T.museum2 - 0.2, T.charges + 0.5, 0.25, 0.3);
  const torn = smooth((t - T.charges + 0.05) / 0.12);
  const offer = window01(t, T.gave - 0.25, T.key + 0.3, 0.25, 0.2);
  const sh = add(head(DOLORES, D7), [Math.sin(yaw) * 0.38, -0.45, Math.cos(yaw) * 0.38]);
  const kl = ik(DOLORES, D7, yaw, "L", add(sh, [Math.cos(yaw) * 0.12, 0, -Math.sin(yaw) * 0.12]), 4);
  const kr = ik(DOLORES, D7, yaw, "R", add(sh, [-Math.cos(yaw) * 0.12 * (1 + torn), 0, Math.sin(yaw) * 0.12 * (1 + torn)]), 4);
  const ko = ik(DOLORES, D7, yaw, "R", add(D7, [-0.35, 1.05, -0.2]), 8);
  let pose: BodyPose = { lean: 4, armL: mixArm([18, 10], kl.arm, sheetUp), armLFwd: lerp(10, kl.fwd, sheetUp), armR: mixArm([18, 10], kr.arm, sheetUp), armRFwd: lerp(10, kr.fwd, sheetUp) };
  if (offer > 0) pose = { ...pose, lean: 8, armR: mixArm(pose.armR!, ko.arm, offer), armRFwd: lerp(pose.armRFwd!, ko.fwd, offer) };
  const face = t < T.charges ? F("half", "flat", "worried") : t < T.gave ? F("squint", "smirk", "raised") : F("sparkle", "smile", "worried");
  const keyP = offer > 0.2 && t < T.key + 0.05 ? add(hand(DOLORES, D7, yaw, pose, "R"), [0, -0.02, 0]) : t >= T.key + 0.05 ? null : null;
  return { a: OFF(DOLORES, D7, yaw, pose, face), key: keyP, sheet: sheetUp > 0.05 ? { p: add(sh, [0, 0.04, 0]), ry: yaw, torn } : undefined };
};
const marcus7 = (t: number): Actor => {
  const yaw = yawTo(M7, H_P);
  const wipe = window01(t, T.gave, T.key + 1.2, 0.3, 0.3);
  const k = ik(MARCUS, M7, yaw, "L", add(head(MARCUS, M7), [Math.sin(yaw) * 0.12 + 0.05, -0.02, Math.cos(yaw) * 0.12]), 2);
  const pose: BodyPose = { lean: 2, armR: [18, 10], armRFwd: 10, armL: mixArm([18, 10], k.arm, wipe), armLFwd: lerp(10, k.fwd, wipe), headTilt: 10 * wipe };
  const face = t < T.gave ? F("open", "flat", "worried") : F("closed", "wavy", "worried", { flush: 0.4 });
  return OFF(MARCUS, M7, yaw, pose, face);
};
const henryHand7 = (t: number) => {
  const a = henry7(t);
  return hand(HENRY_BARE, a.p, a.yaw, a.pose, t < H7_GO.t0 ? "R" : "L");
};
const S7: Scene = {
  id: 7, t0: T.museum2 - 0.08, mood: "lamp", set: "gallery", blur: 1.4,
  cam: follow(
    keyed([
      [T.museum2 - 0.08, C([0.75, 1.65, -1.45], [0.72, 1.3, -4.65], 50)],
      [T.charges + 0.1, C([0.8, 1.6, -2.0], [0.8, 1.35, -4.6], 46), "inout"],
      [T.key + 0.05, C([0.55, 1.45, -2.75], [0.5, 1.2, -4.65], 42), "inout"],
      [T.key + 0.55, C([0.6, 1.5, -3.5], head(HENRY_BARE, H_P), 38), "inout"],
      [T.key + 0.8, C([0.6, 1.5, -3.5], head(HENRY_BARE, H_P), 38)],
      [SECONDS, C([0.1, 2.3, 1.2], [0.15, 1.6, -5.0], 50), "inout"],
    ]),
    (t) => (t > T.gave - 0.3 && t < T.key + 0.5 ? (dolores7(t).key ?? henryHand7(t)) : null),
    (t) => window01(t, T.gave - 0.2, T.key + 0.4, 0.2, 0.25),
  ),
  actors: (t) => [henry7(t), dolores7(t).a, marcus7(t)],
  gallery: (t) => {
    const k = dolores7(t).key;
    const held = t >= T.key + 0.05 && t < SECONDS ? add(henryHand7(t), [0, -0.03, 0]) : null;
    return { t, door: 0, tally: 11, tilt: 0.1 * smooth((t - H7_GO.t1 - 0.2) / 0.35), alarm: 0, moon: 0.5, glow: 0.8, key: k ?? held };
  },
  extra: (t) => ({ lights: [{ p: [0, -5, 0], to: [0, -6, 0], on: 0 }, { p: [0, -5, 0], to: [0, -6, 0], on: 0 }], sheet: dolores7(t).sheet }),
  focus: (t) => (t < T.gave ? head(DOLORES, D7) : head(HENRY_BARE, henry7(t).p)),
};

export const SCENES: Scene[] = [S1, S2, S3, S4, S5, S6, S7];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
/** sound cue times for the mix (tools/audio_museum.py) */
export const MUSEUM_EVENTS = () => ({
  ...T,
  cuts: SCENES.map((s) => s.t0),
  dSteps: [D_DOOR, D_IN[0], D_IN[1], D_BACK],
  mSteps: M_IN,
  ropeZ: ROPE_Z,
  doorZ: DOOR_Z,
});
