// The poison short: one persistent View; the shots are data (shots.ts). This file draws the world, the actors, the
// chips, the captions and the sound.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import type { Word } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { CHIPS, beatTime, shotAt } from "./shots";
import { SHOT_BEATS } from "./timing.gen";
import type { Pose as BodyPose } from "../inkbeat/char/Character3D";
import type { Chip } from "./shots";
import { DURATION, FPS, SECONDS, WORDS } from "./timing.gen";
import { WorldView } from "./world";
import { EXTRAS } from "./extras";
import type { HeadProp } from "./world";
import "./moods";

const CHUNKS = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
const INK = "#10121c";
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const back = (u: number) => {
  const x = clamp(u);
  const c1 = 1.70158;
  return x >= 1 ? 1 : 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const ChipView: React.FC<{ c: Chip; t: number }> = ({ c, t }) => {
  const e = clamp((t - c.t0) / 0.24);
  const size = c.size ?? 80;
  const base: React.CSSProperties = { position: "absolute", left: c.x, top: c.y, transform: `translate(-50%, -50%) scale(${back(e)})`, fontFamily: "Poppins", fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap", opacity: Math.min(1, e * 3) };
  const text = c.count ? `${c.text} ${Math.round(c.count[0] + (c.count[1] - c.count[0]) * Math.pow(clamp((t - c.t0) / 1.8), 2))}` : c.text;
  if (c.flat) return <div style={{ ...base, fontSize: size, color: c.fg, WebkitTextStroke: `${size * 0.09}px ${INK}`, paintOrder: "stroke fill", textShadow: "0 10px 22px rgba(0,0,0,0.45)" }}>{text}</div>;
  return <div style={{ ...base, fontSize: size, color: c.fg, background: c.bg, border: `${Math.max(5, size * 0.07)}px solid ${INK}`, borderRadius: 999, padding: `${size * 0.16}px ${size * 0.42}px`, boxShadow: "0 10px 22px rgba(0,0,0,0.3)" }}>{text}</div>;
};

const shotStart = (t: number) => {
  let a = 0;
  for (const [b] of SHOT_BEATS) if (beatTime(b) <= t) a = beatTime(b);
  return a;
};
const qt = (t: number) => Math.round(t * 12) / 12;
const ease = (u: number) => {
  const x = clamp(u);
  return 1 - Math.pow(1 - x, 3);
};
/** bring a still pose to life: ease the arms in from rest over 0.35 s at each cut, then add breathing bob, a slow
 *  sway of the head and a small rhythmic pump in raised arms. Sampled at 12 Hz so limb geometry is rebuilt sparingly. */
const alive = (p: BodyPose, t: number, since: number, k: number): BodyPose => {
  const e = ease(since / 0.35);
  const tq = qt(t);
  const arm = (a: [number, number] | undefined, ph: number): [number, number] => {
    const base = a ?? [6, 0];
    const tgt: [number, number] = [6 + (base[0] - 6) * e, base[1] * e];
    const lift = base[0] > 40 ? 5 * Math.sin(tq * 5 + ph) : 2 * Math.sin(tq * 2 + ph);
    return [tgt[0] + lift, tgt[1] + (base[0] > 40 ? 4 * Math.sin(tq * 5 + ph + 1) : 0)];
  };
  return {
    ...p,
    armL: arm(p.armL, k),
    armR: arm(p.armR, k + 2),
    headTilt: (p.headTilt ?? 0) + 4 * Math.sin(tq * 1.6 + k),
    headYaw: (p.headYaw ?? 0) + 5 * Math.sin(tq * 1.1 + k * 2),
    bob: (p.bob ?? 0) + 2 * Math.sin(tq * 3.2 + k),
    lean: (p.lean ?? 0) * e + 1.5 * Math.sin(tq * 1.3 + k),
  };
};

export const Poison: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  if (!ready) return <AbsoluteFill style={{ background: "#07080f" }} />;
  const { shot, u } = shotAt(t);
  const cam = shot.cam(u);
  const since = t - shotStart(t);
  const actors = [...shot.actors(t, u), ...(EXTRAS[shot.world(t, u).set] ?? [])].map((a, k) => ({ ...a, pose: alive(a.pose ?? {}, t, since, k) }));
  const lead = actors[0];
  const m = moodOf(shot.mood);
  return (
    <AbsoluteFill style={{ background: "#07080f" }}>
      <View mood={m} cam={cam} t={t} focus={shot.focus(u)} blur={shot.blur} sky={false}>
        <WorldView w={{ ...shot.world(t, u), heads: actors.filter((a) => a.head).map((a) => ({ kind: a.head!, p: [a.p[0], a.p[1] + a.spec.height - 0.05, a.p[2]] as HeadProp["p"] })) }} t={t} />
        {actors.map((a, k) => (
          <Character3D key={`${shot.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} hold={a.hold ?? null} holdSide={a.holdSide} faceCamera={cam.pos} faceCameraAmount={0.3} />
        ))}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.6, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {CHIPS.filter((c) => c.shot === shot.id && t >= c.t0).map((c, k) => (
        <ChipView key={k} c={c} t={t} />
      ))}
      <Captions chunks={CHUNKS} t={t} accent={new Set(["job", "anyway", "bold", "stone", "answer"])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/poison-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const POISON_FRAMES = DURATION;
