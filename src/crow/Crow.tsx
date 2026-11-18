// The Chess Crow short: one persistent View over the park; the scenes are data (shots.ts). The ending shows a
// score card ("CROW 11 - 4 OKAFOR").
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { M, sphG } from "../inkbeat/core/kit";
import { SEAT_W, sitGeom, Crow, Flashlight, Park, PieceM } from "./world";
import { OKAFOR } from "./cast";
import { sceneAt } from "./shots";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const SEAT_TOP = sitGeom(OKAFOR.height, OKAFOR.build).seatTop;
void SEAT_W;

export const CrowShort: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra(t);
  const lead = actors[0];
  const score = ex.score ?? 0;
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky fogK={0.3}>
        <Park s={{ t, lampOn: ex.lamps ?? 0 }} seatTop={SEAT_TOP} />
        {ex.pieces.map((p) => (
          <PieceM key={p.id} pc={p} />
        ))}
        {ex.ghost ? (
          <group>
            <mesh position={[ex.ghost.p[0], ex.ghost.p[1] + 0.035, ex.ghost.p[2]]} scale={[1, 1.8, 1]} userData={{ outline: false }}>
              <sphereGeometry args={[0.02, 12, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={ex.ghost.op ?? 0.3} depthWrite={false} />
            </mesh>
          </group>
        ) : null}
        {actors.map((a, k) => (
          <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
        ))}
        {ex.crow ? <Crow g={ex.crow} /> : null}
        {ex.ball ? <M g={sphG(0.13, 18)} c="#e8402e" p={ex.ball} /> : null}
        {ex.torch ? (
          <Flashlight p={ex.torch.p} to={ex.torch.to} on={ex.torch.on} />
        ) : null}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.4, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {score > 0 ? (
        <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: score, transform: `scale(${0.8 + 0.2 * score})` }}>
          <div style={{ background: "#1a1416", borderRadius: 28, padding: "18px 40px", fontFamily: "Poppins", fontWeight: 900, fontSize: 76, color: "#ffffff", letterSpacing: 2, boxShadow: "0 8px 0 #000" }}>
            <span style={{ color: "#9aa4ff" }}>CROW 11</span> <span style={{ opacity: 0.6 }}>–</span> <span style={{ color: "#ffd34d" }}>4 OKAFOR</span>
          </div>
        </div>
      ) : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.35} accent={new Set(["crow", "black", "losing.", "knight", "checkmate.", "fifty.", "eleven"])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/crow-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const CROW_FRAMES = DURATION;
