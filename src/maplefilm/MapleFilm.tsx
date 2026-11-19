// The Maple Street film: one View; the scenes are data (shots.ts). Overlays: CCTV (scene 4) and a dip to black at
// time cuts. The kitchen is its own set, drawn instead of the street.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { cylG, M, sphG, torG } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { Mat, Puff, SecCam, Street } from "../maple/world";
import { sceneAt } from "./shots";
import { Kitchen, PoliceCar } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const Mug: React.FC<{ p: [number, number, number] }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.045, 0.04, 0.1, 12)} c="#f4ead6" />
    <M g={torG(0.03, 0.01)} c="#f4ead6" p={[0.05, 0, 0]} r={[0, 0, 0]} />
    <M g={cylG(0.04, 0.04, 0.005, 12)} c="#5a3a20" p={[0, 0.048, 0]} cast={false} />
  </group>
);
const Shards: React.FC<{ u: number; at: [number, number, number] }> = ({ u, at }) => (
  <group position={at}>
    <M g={cylG(0.06 + 0.25 * u, 0.06 + 0.25 * u, 0.006, 20)} c="#5a3a20" p={[0, 0.045, 0]} cast={false} />
    {Array.from({ length: 7 }, (_, i) => {
      const a = i * 0.9;
      const r = 0.05 + 0.22 * Math.min(1, u * 2) * (0.5 + 0.5 * ((i * 37) % 7) / 7);
      return <M key={i} g={sphG(0.025, 5)} c="#f4ead6" p={[Math.cos(a) * r, 0.06, Math.sin(a) * r]} s={[1, 0.4, 0.7]} r={[0, a, 0]} />;
    })}
  </group>
);
export const MapleFilm: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra(t);
  const o = s.opts(t);
  const lead = actors.find((a) => !a.lying) ?? actors[0];
  const dip = s.dip ? Math.max(0, 1 - (t - s.t0) / 0.22) : 0;
  const clock = `0${2 + Math.floor((t - s.t0) / 60)}:14:${String(7 + Math.floor((t - s.t0) * 1)).padStart(2, "0")}`;
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky fogK={s.set === "kitchen" ? 0 : 0.35}>
        {s.set === "street" ? <Street t={t} {...o} /> : <Kitchen doorOpen={ex.kdoor ?? 0} t={t} />}
        {s.set === "street" && ex.mat ? (
          <>
            <Mat angle={ex.mat.angle} y={ex.mat.y} />
            <Puff u={ex.mat.puff} />
          </>
        ) : null}
        {ex.car ? <PoliceCar p={ex.car.p} yaw={ex.car.yaw} t={t} /> : null}
        {ex.heldCam ? (
          <group position={[ex.heldCam[0] - 2.18, ex.heldCam[1] - 2.0, ex.heldCam[2] - 2.1]}>
            <SecCam />
          </group>
        ) : null}
        {ex.mug ? <Mug p={ex.mug} /> : null}
        {ex.shards ? <Shards u={ex.shards} at={[-1.95, 0.0, 18.0]} /> : null}
        {actors.map((a, k) =>
          a.lying ? (
            <group key={`${s.id}-${k}`} position={a.lying.p} rotation={a.lying.r}>
              <Character3D {...a.spec} position={[0, 0, 0]} yaw={0} t={t + k * 0.7} face={a.face} pose={a.pose} />
            </group>
          ) : (
            <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
          ),
        )}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {s.cctv ? (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: "rgba(40,120,80,0.45)", mixBlendMode: "multiply" }} />
          <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 7px)" }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />
          <div style={{ position: "absolute", top: 150, left: 70, color: "#c8ffd8", fontFamily: "monospace", fontWeight: 700, fontSize: 56, letterSpacing: 4 }}>PORCH CAM</div>
          <div style={{ position: "absolute", top: 150, right: 70, display: "flex", alignItems: "center", gap: 18, color: "#ff5a5a", fontFamily: "monospace", fontWeight: 700, fontSize: 56 }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: Math.floor(t * 2) % 2 ? "#ff3a3a" : "rgba(255,58,58,0.25)" }} />
            REC
          </div>
          <div style={{ position: "absolute", top: 230, left: 70, color: "#c8ffd8", fontFamily: "monospace", fontWeight: 700, fontSize: 60, letterSpacing: 3 }}>{clock}</div>
        </AbsoluteFill>
      ) : null}
      {dip > 0 ? <AbsoluteFill style={{ background: "#000", opacity: dip }} /> : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.3} accent={new Set(["burglar", "nothing.", "doormat", "crime.\"", "eighty,", "camera", "himself,", "alvarez,", "fine.", "lighthouse", "up.", "ran.", "kitchen,", "mat."])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/maple-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const MAPLE_FILM_FRAMES = DURATION;
