// "The Midnight School": lights at 2 AM in a school closed for nine years; the police find a night class. Data in
// shots.ts; places in world.tsx.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { Flashlight } from "../museum/world";
import { PoliceCar } from "../maplefilm/world";
import { LIGHTS_AT, sceneAt, CAR } from "./shots";
import { Chalk, Exterior, HandBell, Interior } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const ACCENT = new Set(["2", "closed", "break-in", "kicked", "twelve", "truck", "baker,", "janitor.", "bell", "read,", "dark,", "sergeant", "waiting"]);
export const MidnightFilm: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
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
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky fogK={s.set === "ext" ? (s.night ? 0.3 : 0.2) : 0}>
        {s.set === "ext" ? <Exterior t={t} lightsAt={LIGHTS_AT} night={s.night} open={ex.open ?? 0} banner={!!ex.banner} /> : <Interior t={t} doorOpen={ex.doorOpen ?? 0} bell={ex.bell ?? 0} />}
        {s.id === 2 ? <PoliceCar p={CAR.p} yaw={CAR.yaw} t={t} /> : null}
        {(ex.chalks ?? []).map((c, i) => <Chalk key={i} p={c.p} r={c.r} />)}
        {(ex.flashes ?? []).map((fl, i) => <Flashlight key={i} p={fl.p} to={fl.to} on={1} />)}
        {s.id === 2 ? <Flashlight p={[actors[2].p[0] - 0.3, 1.2, actors[2].p[2] - 0.5]} to={[0, 3, 0]} on={1} /> : null}
        {actors.map((a, k) => (
          <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
        ))}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {dip > 0 ? <AbsoluteFill style={{ background: "#000", opacity: dip }} /> : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.3} accent={ACCENT} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/midnight-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const MIDNIGHT_FRAMES = DURATION;
export { HandBell };
