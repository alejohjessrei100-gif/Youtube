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
import { Boat, Dressing, NAMES, Rain, Truck, Yard } from "./world";
import { Dog } from "../biscuit/world";
import { T } from "./shots";
import { sceneAt } from "./shots";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const Paper: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill style={{ background: "#2a2420", opacity: k, alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "relative", width: 900, background: "linear-gradient(90deg, #e9dfc6 0%, #e9dfc6 49.6%, #d8ccb0 50%, #e9dfc6 50.4%, #e3d8bc 100%)", color: "#2a2420", padding: "48px 56px", fontFamily: "Georgia, serif", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", transform: `rotate(-2deg) scale(${0.96 + 0.04 * k})` }}>
      <div style={{ textAlign: "center", fontSize: 46, fontWeight: 900, letterSpacing: 3, borderBottom: "4px double #2a2420", paddingBottom: 10 }}>THE HARBOR GAZETTE</div>
      <div style={{ textAlign: "center", fontSize: 26, margin: "10px 0 18px" }}>NOVEMBER 1931</div>
      <div style={{ textAlign: "center", fontSize: 76, fontWeight: 900, lineHeight: 1.05 }}>MARGARET ANN LOST IN GALE</div>
      <svg viewBox="0 0 400 150" style={{ width: "100%", height: 230, margin: "8px 0", filter: "sepia(0.6)" }}>
        <rect x="0" y="0" width="400" height="150" fill="#d8ccb0" />
        <path d="M0 110 Q 50 95 100 110 T 200 110 T 300 110 T 400 110 V150 H0 Z" fill="#7a7262" />
        <path d="M0 122 Q 40 112 80 122 T 160 122 T 240 122 T 320 122 T 400 122" stroke="#4a4436" strokeWidth="2" fill="none" />
        <path d="M120 100 L 290 100 L 270 122 L 140 122 Z" fill="#3a3428" />
        <rect x="200" y="70" width="44" height="30" fill="#4a4436" />
        <rect x="170" y="25" width="5" height="75" fill="#3a3428" />
        <path d="M60 30 l 10 -6 l 10 6" stroke="#3a3428" strokeWidth="2" fill="none" />
        <path d="M330 45 l 8 -5 l 8 5" stroke="#3a3428" strokeWidth="2" fill="none" />
      </svg>
      <div style={{ textAlign: "center", fontSize: 34, margin: "8px 0 22px", fontStyle: "italic" }}>Twenty-two men aboard. Captain alone reaches shore.</div>
      <div style={{ columns: 2, fontSize: 30, lineHeight: 1.5 }}>
        {NAMES.slice(0, 20).concat(["KARL VOSS", "ELIAS DUNN"]).map((n, i) => (
          <div key={n} style={{ background: i >= 9 && i <= 11 ? "rgba(255,210,60,0.7)" : "none", fontWeight: i >= 9 && i <= 11 ? 900 : 400 }}>{n}</div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 70, bottom: 90, width: 170, height: 170, borderRadius: "50%", border: "12px solid rgba(120,80,40,0.28)" }} />
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
        <Dressing s={y} day={s.mood !== "night"} />
        {ex.dog ? <Dog d={ex.dog} /> : null}
        {ex.boat ? <Rain t={t} at={[cam.pos[0], -6, cam.pos[2] - 3]} /> : null}
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
      {ex.boat ? <AbsoluteFill style={{ background: "#e8f0ff", opacity: 0.55 * (Math.max(0, 1 - Math.abs(t - T.fishing - 0.35) * 6) + Math.max(0, 1 - Math.abs(t - T.sank - 0.85) * 5)), pointerEvents: "none" }} /> : null}
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
