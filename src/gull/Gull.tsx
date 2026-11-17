// The gull short: one persistent View; the scenes are data (shots.ts). A soft warm vignette marks the memory scene.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { coreMat, cylG, M, sphG } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { BEAM_SPEED, sceneAt } from "./shots";
import { Beam, Bread, Gull as GullModel, Lighthouse, Point, PocketWatch, Porch, Stairwell } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);

export const GullShort: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const gull = s.gull?.(t) ?? null;
  const lamp = s.lamp?.(t) ?? { on: 0, beam: 0, t, lever: 0 };
  const ex = s.extra?.(t) ?? {};
  const lead = actors[0];
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky={!!s.sky} fogK={s.set === "point" ? 0.35 : 0.8}>
        {s.set === "point" ? (
          <>
            <Point t={t} />
            <Lighthouse s={lamp} />
            <Beam on={lamp.beam} angle={t * BEAM_SPEED} />
          </>
        ) : null}
        {s.set === "porch" ? <Porch t={t} beamAngle={t * BEAM_SPEED} /> : null}
        {s.set === "stairs" ? <Stairwell t={t} lantern={ex.lantern ?? null} /> : null}
        {actors.map((a, k) => (
          <group key={`${s.id}-${k}`} position={a.p} scale={a.sc ?? [1, 1, 1]}>
            <Character3D {...a.spec} position={[0, 0, 0]} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
          </group>
        ))}
        {gull ? <GullModel g={gull} /> : null}
        {ex.watch ? <PocketWatch p={ex.watch.p} minutes={ex.watch.minutes} s={ex.watch.s} /> : null}
        {ex.bread ? <Bread p={ex.bread.p} s={ex.bread.s} rot={ex.bread.rot} /> : null}
        {ex.torch ? (
          <group position={ex.torch}>
            <M g={cylG(0.03, 0.025, 0.2, 10)} c="#2a2c34" tex="metal" r={[1.2, 0, 0]} />
            <mesh geometry={sphG(0.03, 8)} material={coreMat("#fff4d0", 1.1)} position={[0, -0.04, 0.09]} />
          </group>
        ) : null}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {s.memory ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(255,214,150,0) 55%, rgba(120,70,20,0.55) 100%)", mixBlendMode: "multiply" }} /> : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.35} accent={new Set(["9:14", "9:13", "gull", "switch", "paid", "bread"])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/gull-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const GULL_FRAMES = DURATION;
