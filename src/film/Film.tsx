// "Same island": the full vertical Short. One persistent View (one WebGL canvas). The beats are data (shots.ts);
// this file only draws the frame: the world, the actors, lightning as exposure, the on-screen count, captions, sound.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D, headOf } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import type { Word } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { DURATION, FPS, WORDS } from "../plan.gen";
import "./moods";
import { World } from "./Sets";
import { shotAt } from "./shots";

const CHUNKS = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
const BG = "#0b0c16";

/** the on-screen count: one small figure per man; lit = alive. Two rows when there are many. */
const Count: React.FC<{ n: number; lit: number; gold?: boolean }> = ({ n, lit, gold }) => {
  const size = n > 8 ? 62 : 112;
  const rows = n > 8 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
  let k = 0;
  return (
    <div style={{ position: "absolute", top: 150, left: 0, width: 1080, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {rows.map((m, r) => (
        <div key={r} style={{ display: "flex", gap: n > 8 ? 22 : 40 }}>
          {Array.from({ length: m }, () => {
            const on = k++ < lit;
            const c = on ? (gold ? "#ffc94d" : "#eef2f7") : "rgba(16,18,30,0.72)";
            return (
              <div key={k} style={{ width: size, height: size * 1.55, position: "relative" }}>
                <div style={{ position: "absolute", left: size * 0.26, top: 0, width: size * 0.48, height: size * 0.48, borderRadius: size, background: c, border: "5px solid #10121c" }} />
                <div style={{ position: "absolute", left: size * 0.08, top: size * 0.52, width: size * 0.84, height: size * 0.98, borderRadius: `${size * 0.4}px ${size * 0.4}px ${size * 0.12}px ${size * 0.12}px`, background: c, border: "5px solid #10121c" }} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Film: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = f / FPS;
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const { shot, S, ts, cam } = shotAt(t);
  const m = moodOf(shot.mood);
  const actors = S.actors(t, ts);
  const world = S.world(t, ts);
  const lead = S.lead !== undefined ? actors[S.lead] : undefined;
  const ov = S.overlay ? S.overlay(t, ts) : {};
  const map = world.set === "MAP";
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={cam} t={t} focus={S.focus(t, ts)} blur={S.blur} fogK={S.fogK ?? 1} exposure={1.7 * (world.flash ?? 0)} sky={!map}>
        <World s={world} t={t} cam={cam} />
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
            faceCamera={a.prone ? undefined : cam.pos}
            faceCameraAmount={0.3}
          />
        ))}
        {lead ? <CastLight at={headOf(lead.p, lead.spec.height, lead.spec.build)} cam={cam.pos} mood={m} /> : <CastLight at={S.focus(t, ts)} cam={cam.pos} mood={m} k={0} />}
      </View>
      {ov.icons ? <Count {...ov.icons} /> : null}
      <Captions chunks={CHUNKS} t={t} accent={new Set(["five", "three", "difference"])} />
      {audio ? <Audio src={staticFile("audio/same-island-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const FILM_FRAMES = DURATION;
