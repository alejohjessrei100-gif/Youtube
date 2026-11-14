// "Same island": the full vertical Short. One persistent View (one WebGL canvas for the whole film). The shots are
// data (shots.ts): one intentional camera move per setup, clean cuts between setups. A pure function of the frame.
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
import { World } from "./Island";
import { shotAt } from "./shots";

const CHUNKS = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
const BG = "#1a1220";

export const SameIsland: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = f / FPS;
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const { shot, S, ts, cam } = shotAt(t);
  const m = moodOf(shot.mood);
  const actors = S.actors(t, ts);
  const lead = actors[S.lead ?? 0];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={cam} t={t} focus={S.focus(t, ts)} blur={S.blur} fogK={S.fogK ?? 1}>
        <World t={t} {...S.world(t, ts)} />
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
            faceCamera={cam.pos}
            faceCameraAmount={0.3}
          />
        ))}
        {lead ? <CastLight at={headOf(lead.p, lead.spec.height, lead.spec.build)} cam={cam.pos} mood={m} /> : null}
      </View>
      <Captions chunks={CHUNKS} t={t} accent={new Set(["five", "three", "difference"])} />
      {audio ? <Audio src={staticFile("audio/same-island-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};

export const SAME_ISLAND_FRAMES = DURATION;
