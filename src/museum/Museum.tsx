// The museum short: one persistent View; the scenes are data (shots.ts). CAM 01 gets a CCTV overlay (green tint,
// scanlines, REC, a timestamp that races through an hour); the 1964 memory gets a warm vignette.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { boxG, M } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { sceneAt } from "./shots";
import { Flashlight, Gallery, IdCard, JUNE_MAT, Lobby, Office, PalmThings, Studio } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

export const MuseumShort: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra?.(t) ?? {};
  const lead = actors[0];
  const gal = s.gallery?.(t);
  const lights = ex.lights ?? [
    { p: [0, -5, 0], to: [0, -6, 0], on: 0 },
    { p: [0, -5, 0], to: [0, -6, 0], on: 0 },
  ];
  // CCTV clock: 02:14:07, racing through an hour during the time-lapse
  let clock = "";
  if (s.cctv && s.lapse) {
    const [a, b] = s.lapse;
    const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
    const secs = 2 * 3600 + 14 * 60 + 7 + (t - s.t0) + u * 3600;
    clock = `${pad(secs / 3600)}:${pad((secs / 60) % 60)}:${pad(secs % 60)}`;
  }
  const lapsing = s.cctv && s.lapse && t > s.lapse[0] && t < s.lapse[1];
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky={false} fogK={0.25}>
        {s.set === "gallery" && gal ? <Gallery s={gal} /> : null}
        {s.set === "office" ? <Office t={t} /> : null}
        {s.set === "studio" && s.studio ? <Studio s={s.studio(t)} /> : null}
        {s.set === "lobby" ? <Lobby t={t} /> : null}
        {/* two flashlights are always mounted (a constant light count: no shader recompiles) */}
        <Flashlight p={lights[0].p} to={lights[0].to} on={lights[0].on} />
        <Flashlight p={lights[1].p} to={lights[1].to} on={lights[1].on} />
        {actors.map((a, k) => (
          <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
        ))}
        {ex.marker ? <M g={boxG(0.025, 0.14, 0.025)} c="#1a1a24" p={ex.marker} r={[0.4, 0, 0.3]} /> : null}
        {ex.id ? <IdCard p={ex.id.p} ry={ex.id.ry} /> : null}
        {ex.palm ? <PalmThings p={ex.palm.p} ry={ex.palm.ry} /> : null}
        {ex.carried ? (
          <group position={ex.carried.p} rotation={[0, ex.carried.ry, 0]}>
            <mesh material={JUNE_MAT()} position={[0, 0, 0.02]} userData={{ outline: false }}>
              <planeGeometry args={[0.8, 1.04]} />
            </mesh>
            <M g={boxG(0.82, 1.06, 0.03)} c="#f4f0e4" tex="fabric" />
          </group>
        ) : null}
        {ex.sheet ? (
          <group position={ex.sheet.p} rotation={[0, ex.sheet.ry, 0]}>
            {[-1, 1].map((sd) => (
              <M key={sd} g={boxG(0.105, 0.28, 0.003)} c="#f4f0e4" tex="paper" p={[sd * (0.055 + 0.1 * ex.sheet!.torn), -0.04 * ex.sheet!.torn, 0]} r={[0, 0, sd * 0.25 * ex.sheet!.torn]} />
            ))}
          </group>
        ) : null}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {s.memory ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(255,214,150,0) 50%, rgba(120,70,20,0.6) 100%)", mixBlendMode: "multiply" }} /> : null}
      {s.cctv ? (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: "rgba(40,120,80,0.45)", mixBlendMode: "multiply" }} />
          <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 7px)" }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />
          <div style={{ position: "absolute", top: 150, left: 70, color: "#c8ffd8", fontFamily: "monospace", fontWeight: 700, fontSize: 56, letterSpacing: 4 }}>CAM 01</div>
          <div style={{ position: "absolute", top: 150, right: 70, display: "flex", alignItems: "center", gap: 18, color: "#ff5a5a", fontFamily: "monospace", fontWeight: 700, fontSize: 56 }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: Math.floor(t * 2) % 2 ? "#ff3a3a" : "rgba(255,58,58,0.25)" }} />
            REC
          </div>
          <div style={{ position: "absolute", top: 230, left: 70, color: "#c8ffd8", fontFamily: "monospace", fontWeight: 700, fontSize: 60, letterSpacing: 3 }}>{clock}</div>
          {lapsing ? <div style={{ position: "absolute", top: 230, right: 70, color: "#c8ffd8", fontFamily: "monospace", fontWeight: 700, fontSize: 60 }}>▶▶ x60</div> : null}
        </AbsoluteFill>
      ) : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.35} accent={new Set(["stolen", "crooked", "yellow", "eighty-one", "his", "key"])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/museum-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const MUSEUM_FRAMES = DURATION;
