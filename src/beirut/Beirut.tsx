// "Beirut camp": the full vertical Short for script 4. One persistent View (one WebGL canvas). The shots are data
// (shots.ts); this file only draws the frame: the world, the actors, the floating badges and chips, captions, sound.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import type { Word } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import type { Cam } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { CHIPS, SECONDS, shotAt } from "./shots";
import type { Chip, Mark } from "./shots";
import { DURATION, FPS, WORDS } from "./timing.gen";
import { WorldView } from "./world";
import "./moods";

const CHUNKS = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
const BG = "#0b0c16";
const INK = "#10121c";
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** a world point to 1080 x 1920 px through the same lens View uses (roll included) */
const project = (cam: Cam, p: V3) => {
  const c = new THREE.PerspectiveCamera(cam.fov, 1080 / 1920, 0.02, 600);
  c.position.set(...cam.pos);
  const dir = new THREE.Vector3(...cam.look).sub(c.position).normalize();
  c.up.copy(new THREE.Vector3(0, 1, 0).applyAxisAngle(dir, ((cam.roll ?? 0) * Math.PI) / 180));
  c.lookAt(...cam.look);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return { x: (v.x * 0.5 + 0.5) * 1080, y: (0.5 - v.y * 0.5) * 1920, z: v.z };
};
const back = (u: number) => {
  const x = clamp(u);
  const c1 = 1.70158;
  return x >= 1 ? 1 : 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** the badge: a white disc, an ink ring, a cross, a crescent or a question mark */
const Disc: React.FC<{ glyph: Mark["glyph"]; px: number }> = ({ glyph, px }) => (
  <svg width={px} height={px} viewBox="-12 -12 24 24" style={{ display: "block" }}>
    <circle r="10.4" fill="#fff" stroke={INK} strokeWidth="1.8" />
    {glyph === "c" ? (
      <>
        <rect x="-1.5" y="-6.4" width="3" height="12.8" fill={INK} />
        <rect x="-4.8" y="-3.2" width="9.6" height="3" fill={INK} />
      </>
    ) : glyph === "m" ? (
      <path d="M1.6 -6.6 A6.6 6.6 0 1 0 1.6 6.6 A5.2 5.2 0 1 1 1.6 -6.6Z" fill={INK} />
    ) : (
      <text x="0" y="5.6" textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize="16" fill={INK}>
        ?
      </text>
    )}
  </svg>
);

const ChipView: React.FC<{ c: Chip; t: number }> = ({ c, t }) => {
  const e = clamp((t - c.t0) / 0.24);
  if (t < c.t0) return null;
  const size = c.size ?? 80;
  const s = back(e);
  const base: React.CSSProperties = { position: "absolute", left: c.x, top: c.y, transform: `translate(-50%, -50%) scale(${s})`, fontFamily: "Poppins", fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap", opacity: Math.min(1, e * 3) };
  if (c.flat) return <div style={{ ...base, fontSize: size, color: c.fg, WebkitTextStroke: `${size * 0.09}px ${INK}`, paintOrder: "stroke fill", textShadow: "0 10px 22px rgba(0,0,0,0.45)" }}>{c.text}</div>;
  return (
    <div style={{ ...base, display: "flex", alignItems: "center", gap: size * 0.22, fontSize: size, color: c.fg, background: c.bg, border: `${Math.max(5, size * 0.07)}px solid ${INK}`, borderRadius: 999, padding: `${size * 0.16}px ${size * 0.42}px`, boxShadow: "0 10px 22px rgba(0,0,0,0.3)" }}>
      {c.icon ? <Disc glyph={c.icon} px={size * 0.95} /> : null}
      {c.text}
    </div>
  );
};

export const Beirut: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const { shot, u } = shotAt(t);
  const cam = shot.cam(u);
  const actors = shot.actors(t, u);
  const world = shot.world(t, u);
  const lead = actors[0];
  // the colour-to-sepia wipe into the flashback (the last half beat of shot 7)
  const wipe = shot.id === 7 ? clamp((u - 0.74) / 0.26) : 0;
  const px = shot.markPx ?? 70;
  const marks = actors
    .filter((a) => a.mark && t >= a.mark.t0)
    .map((a, k) => {
      const m = a.mark!;
      const rise = m.rise ? Math.min(1.5, (t - m.t0) * 0.8) : 0;
      const q = project(cam, [a.p[0], a.p[1] + a.spec.height + 0.42 + rise, a.p[2]]);
      return { k, m, q, s: back((t - m.t0) / 0.2) };
    });
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={wipe > 0 ? { filter: `sepia(${wipe}) saturate(${1 - 0.7 * wipe}) brightness(${1 - 0.08 * wipe})` } : undefined}>
        <View mood={moodOf(shot.mood)} cam={cam} t={t} focus={shot.focus(u)} blur={shot.blur} sky>
          <WorldView w={world} />
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
              holdSide={a.holdSide}
              faceCamera={a.free ? undefined : cam.pos}
              faceCameraAmount={0.3}
            />
          ))}
          {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.4, lead.p[2]]} cam={cam.pos} mood={moodOf(shot.mood)} k={0.6} /> : null}
        </View>
      </AbsoluteFill>
      {marks.map(({ k, m, q, s }) =>
        q.z < 1 ? (
          <div key={k} style={{ position: "absolute", left: q.x - px / 2, top: q.y - px / 2, width: px, height: px, transform: `scale(${s})`, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }}>
            <Disc glyph={m.glyph} px={px} />
          </div>
        ) : null,
      )}
      {CHIPS.filter((c) => c.shot === shot.id && t >= c.t0).map((c, k) => (
        <ChipView key={k} c={c} t={t} />
      ))}
      <Captions chunks={CHUNKS} t={t} accent={new Set(["red", "blue", "not", "enemies", "fighting"])} accentColor="#ffd34d" until={DURATION / FPS} />
      {audio ? <Audio src={staticFile("audio/beirut-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const BEIRUT_FRAMES = DURATION;
