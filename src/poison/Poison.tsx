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
import { CHIPS, shotAt } from "./shots";
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

export const Poison: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  if (!ready) return <AbsoluteFill style={{ background: "#07080f" }} />;
  const { shot, u } = shotAt(t);
  const cam = shot.cam(u);
  const actors = [...shot.actors(t, u), ...(EXTRAS[shot.world(t, u).set] ?? [])];
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
