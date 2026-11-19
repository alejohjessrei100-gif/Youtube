// 5-second beat-camera sample (silent): see shots.ts.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { M, sphG } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { OKAFOR } from "../crow/cast";
import { sitGeom } from "../crow/world";
import { Crow, Park, PieceM } from "../crow/world";
import { cam, crow, FPS, focus, okafor, PIECES, SECONDS, WORDS } from "./shots";

const CHUNKS = makeChunks(WORDS, SECONDS);
const SEAT_TOP = sitGeom(OKAFOR.height, OKAFOR.build).seatTop;
export const BEAT_FRAMES = Math.round(SECONDS * FPS);
export const BeatSample: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const c = cam(t);
  const m = moodOf("golden");
  const o = okafor(t);
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={c} t={t} focus={focus(t)} blur={1.1} sky fogK={0.3}>
        <Park s={{ t, lampOn: 0 }} seatTop={SEAT_TOP} />
        {PIECES.map((p) => (
          <PieceM key={p.id} pc={p} />
        ))}
        <Character3D {...o.spec} position={o.p} yaw={o.yaw} t={t} face={o.face} pose={o.pose} />
        <Crow g={crow(t)} />
        <M g={sphG(0.065, 20)} c="#e8a808" e="#b07800" ei={0.5} p={o.ball} />
        <CastLight at={[o.p[0], 1.5, o.p[2]]} cam={c.pos} mood={m} k={0.6} />
      </View>
      <Captions chunks={CHUNKS} t={t} until={WORDS[WORDS.length - 1][2] + 0.3} accent={new Set(["ball", "board", "crow,", "run!"])} accentColor="#ffd34d" />
    </AbsoluteFill>
  );
};
