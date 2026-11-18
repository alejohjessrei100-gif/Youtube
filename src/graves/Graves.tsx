// The Graves short: one persistent View over the headland; scenes are data (shots.ts). 2D overlays: the 1931
// newspaper page, and a small counter card ("20 NIGHTS", "1931", "22 MEN", "20 / 22").
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { boxG, M } from "../inkbeat/core/kit";
import { Boat, NAMES, Truck, Yard } from "./world";
import { sceneAt } from "./shots";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const Paper: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill style={{ background: "#2a2420", opacity: k, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 900, background: "#e9dfc6", color: "#2a2420", padding: "48px 56px", fontFamily: "Georgia, serif", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", transform: `rotate(-2deg) scale(${0.96 + 0.04 * k})` }}>
      <div style={{ textAlign: "center", fontSize: 46, fontWeight: 900, letterSpacing: 3, borderBottom: "4px double #2a2420", paddingBottom: 10 }}>THE HARBOR GAZETTE</div>
      <div style={{ textAlign: "center", fontSize: 26, margin: "10px 0 18px" }}>NOVEMBER 1931</div>
      <div style={{ textAlign: "center", fontSize: 76, fontWeight: 900, lineHeight: 1.05 }}>MARGARET ANN LOST IN GALE</div>
      <div style={{ textAlign: "center", fontSize: 34, margin: "16px 0 22px", fontStyle: "italic" }}>Twenty-two men aboard. Captain alone reaches shore.</div>
      <div style={{ columns: 2, fontSize: 30, lineHeight: 1.5 }}>
        {NAMES.slice(0, 20).concat(["KARL VOSS", "ELIAS DUNN"]).map((n, i) => (
          <div key={n} style={{ background: i >= 9 && i <= 11 ? "rgba(255,210,60,0.7)" : "none", fontWeight: i >= 9 && i <= 11 ? 900 : 400 }}>{n}</div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

export const GravesShort: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra(t);
  const y = { ...s.yard(t), dim: s.dim };
  const lead = actors[0];
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky fogK={0.3}>
        <Yard s={y} />
        {actors.map((a, k) => (
          <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
        ))}
        {ex.truck ? <Truck p={ex.truck.p} yaw={ex.truck.yaw} roll={ex.truck.roll} lights={ex.truck.lights} dim={s.dim} /> : null}
        {ex.boat ? <Boat p={ex.boat.p} t={t} sink={ex.boat.sink} heel={ex.boat.heel} /> : null}
        {ex.notebook ? (
          <group position={ex.notebook.p} rotation={[0.9, ex.notebook.ry, 0]}>
            <M g={boxG(0.16, 0.02, 0.22)} c="#3a3a5a" />
            <M g={boxG(0.15, 0.024, 0.2)} c="#f0ead8" p={[0, 0.0, 0]} />
          </group>
        ) : null}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {ex.paper ? <Paper k={ex.paper} /> : null}
      {ex.count ? (
        <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ background: "#1a1416", borderRadius: 26, padding: "16px 40px", fontFamily: "Poppins", fontWeight: 900, fontSize: 74, color: "#ffffff", letterSpacing: 3, boxShadow: "0 8px 0 #000" }}>{ex.count}</div>
        </div>
      ) : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.35} accent={new Set(["nobody's", "prank.", "margaret", "ann,", "1931.", "twenty-two", "buried.", "stonemason.", "captain.", "home.", "left."])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/graves-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const GRAVES_FRAMES = DURATION;
