// 5-second Maple Street test (silent): see shots.ts.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { cam, flipU, FPS, focus, matAt, prowler, SECONDS, WORDS } from "./shots";
import { Mat, Puff, Street } from "./world";

const CHUNKS = makeChunks(WORDS, SECONDS);
export const MAPLE_FRAMES = Math.round(SECONDS * FPS);
export const MapleTest: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const c = cam(t);
  const m = moodOf("night");
  const p = prowler(t);
  const mat = matAt(t);
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={c} t={t} focus={focus(t)} blur={1.0} sky fogK={0.4}>
        <Street t={t} />
        <Mat angle={mat.angle} y={mat.y} />
        <Puff u={Math.max(0, (t - 4.3) / 0.5)} />
        <Character3D {...p.spec} position={p.p} yaw={p.yaw} t={t} face={p.face} pose={p.pose} />
        <CastLight at={[p.p[0], p.p[1] + 1.4, p.p[2]]} cam={c.pos} mood={m} k={0.6} />
      </View>
      <Captions chunks={CHUNKS} t={t} until={WORDS[WORDS.length - 1][2] + 0.3} accent={new Set(["night,", "night", "burglar", "nothing.", "nothing", "doormat."])} accentColor="#ffd34d" />
    </AbsoluteFill>
  );
};
void flipU;
