// "Three Flashes": a man flashes a light at a hospital's 6th floor every night; the guard finds out why. Data in
// shots.ts; places in world.tsx.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { boxG, coreMat, M } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { sceneAt } from "./shots";
import { Lot, Phone, Porch, Torch } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const ACCENT = new Set(["nine,", "flashlight", "three", "security", "planning", "grabbed", "tom,", "slippers.", "ellen", "612,", "eight.", "fifty", "love", "blinked", "nurses.", "whole"]);
const NO_SIX = Array.from({ length: 15 }, () => 0);
export const FlashesFilm: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0a0e18" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra(t);
  const lead = actors[0];
  const dip = s.dip ? Math.max(0, 1 - (t - s.t0) / 0.25) : 0;
  return (
    <AbsoluteFill style={{ background: "#0a0e18" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky fogK={0.25}>
        {s.set === "lot" ? <Lot t={t} sixth={ex.sixth ?? NO_SIX} lamp612={ex.lamp612 ?? 0.7} next={!!ex.next} /> : <Porch t={t} porch={ex.porch ?? 0} />}
        {(ex.beams ?? []).map((b, i) => <Torch key={i} p={b.p} to={b.to} on={b.on} />)}
        {ex.phone ? <Phone p={ex.phone.p} yaw={0} on={ex.phone.on} /> : null}
        {ex.radio ? <M g={boxG(0.07, 0.17, 0.05)} c="#5a606c" tex="metal" p={ex.radio} /> : null}
        {ex.radio ? <mesh geometry={boxG(0.02, 0.02, 0.02)} position={[ex.radio[0], ex.radio[1] + 0.12, ex.radio[2]]} material={coreMat("#ff3030", 2.0)} /> : null}
        {actors.map((a, k) => (
          <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
        ))}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {s.sepia ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(255,200,120,0.10) 40%, rgba(60,30,10,0.55) 100%)", mixBlendMode: "multiply" }} /> : null}
      {dip > 0 ? <AbsoluteFill style={{ background: "#000", opacity: dip }} /> : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.3} accent={ACCENT} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/flashes-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const FLASHES_FRAMES = DURATION;
