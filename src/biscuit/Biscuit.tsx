// The Biscuit short: one persistent View over the town; the scenes are data (shots.ts). The overhead map scene shows
// a "DAY n" counter.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { sceneAt } from "./shots";
import { Dog, HeldPoster, Mug, Phone, Satchel, Town } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);

export const BiscuitShort: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1420" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const dog = s.dog?.(t) ?? null;
  const ex = s.extra?.(t) ?? {};
  const lead = actors[0];
  const day = s.day?.(t) ?? null;
  return (
    <AbsoluteFill style={{ background: "#0e1420" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky fogK={0.35}>
        <Town s={s.town(t)} />
        {actors.map((a, k) => (
          <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
        ))}
        {dog ? <Dog d={dog} /> : null}
        {(ex.held ?? []).map((h, k) => (
          <HeldPoster key={k} p={h.p} ry={h.ry} tilt={h.tilt} />
        ))}
        {ex.phone ? <Phone p={ex.phone.p} ry={ex.phone.ry} tilt={ex.phone.tilt} /> : null}
        {ex.mug ? <Mug p={ex.mug} /> : null}
        {ex.satchel ? <Satchel p={ex.satchel.p} ry={ex.satchel.ry} /> : null}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {day !== null ? (
        <div style={{ position: "absolute", top: 210, left: 0, right: 0, textAlign: "center", fontFamily: "Poppins", fontWeight: 900, fontSize: 92, color: "#ffffff", textShadow: "0 6px 0 #1a1416, 0 0 24px rgba(0,0,0,0.5)", letterSpacing: 4 }}>DAY {day}</div>
      ) : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.35} accent={new Set(["biscuit", "three", "hundred", "loop", "blind", "home", "biscuit."])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/biscuit-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const BISCUIT_FRAMES = DURATION;
