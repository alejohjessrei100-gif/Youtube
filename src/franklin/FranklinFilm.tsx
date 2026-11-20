// "He Made His Enemy Like Him With One Favor": the Benjamin Franklin effect. Data in shots.ts; places in world.tsx.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Asset } from "../inkbeat/core/asset";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { boxG, cylG, Label, M } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { FIT } from "./assets";
import { sceneAt } from "./shots";
import { Hall, LAB, Lab, Library, Office, Page } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const ACCENT = new Set(["rival", "favor.", "letter", "book.", "note.", "friend", "franklin", "brain", "him.\"", "1969", "gift,", "pen."]);
const P: React.FC<{ name: string; p: V3; r?: V3 }> = ({ name, p, r }) => (
  <group position={p} rotation={r}>
    <Asset film="franklin" name={name} {...FIT[name]} />
  </group>
);
/** the thought bubble: a white cloud facing the lens, two trailing puffs, the text */
const Bubble: React.FC<{ p: V3; text: string; k: number; cam: V3 }> = ({ p, text, k, cam }) => {
  const yaw = Math.atan2(cam[0] - p[0], cam[2] - p[2]);
  const s = 0.4 + 0.6 * k;
  const wide = text.length > 3;
  return (
    <group position={p} rotation={[0, yaw, 0]} scale={s}>
      <M g={cylG(wide ? 0.5 : 0.2, wide ? 0.5 : 0.2, 0.03, 28)} c="#ffffff" r={[Math.PI / 2, 0, 0]} s={wide ? [1, 1, 0.42] : [1, 1, 1]} cast={false} />
      <M g={cylG(0.06, 0.06, 0.03, 16)} c="#ffffff" p={[-0.12, -0.3, 0]} r={[Math.PI / 2, 0, 0]} cast={false} />
      <M g={cylG(0.035, 0.035, 0.03, 12)} c="#ffffff" p={[-0.18, -0.42, 0]} r={[Math.PI / 2, 0, 0]} cast={false} />
      <Label text={text} p={[0, 0, 0.03]} w={wide ? 0.88 : 0.3} h={wide ? 0.16 : 0.3} fg={wide ? "#c8304a" : "#1a1416"} bg="#ffffff" />
    </group>
  );
};
export const FranklinFilm: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#120e0a" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra(t);
  const lead = actors[0];
  const dip = s.dip ? Math.max(0, 1 - (t - s.t0) / 0.25) : 0;
  return (
    <AbsoluteFill style={{ background: "#120e0a" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} sky fogK={0}>
        {s.set === "hall" ? <Hall t={t} /> : s.set === "lib" ? <Library t={t} /> : s.set === "lab" ? <Lab t={t} /> : <Office t={t} />}
        {ex.letter ? <Page p={ex.letter.p} r={ex.letter.r} tex="letter" s={0.8} /> : null}
        {ex.note ? <Page p={ex.note.p} r={ex.note.r} tex="note" s={0.8} /> : null}
        {ex.book ? <P name="rarebook" p={ex.book.p} r={ex.book.r} /> : null}
        {(ex.cups ?? []).map((c, i) => <P key={i} name="teacup" p={c.p} r={c.r} />)}
        {(ex.coins ?? []).map((c, i) => <M key={i} g={cylG(0.022, 0.022, 0.006, 14)} c="#e0b84a" tex="metal" p={c} />)}
        {ex.gift ? <P name="gift" p={ex.gift.p} r={ex.gift.r} /> : null}
        {ex.pen ? <P name="pen" p={ex.pen.p} r={ex.pen.r} /> : null}
        {ex.bubble ? <Bubble p={ex.bubble.p} text={ex.bubble.text} k={ex.bubble.k} cam={cam.pos} /> : null}
        {ex.check ? (
          <group position={[LAB[0] + 0.25, 1.62, LAB[2] - 2.8]} scale={0.4 + 0.6 * ex.check}>
            <M g={boxG(0.08, 0.2, 0.03)} c="#3ac85a" p={[-0.06, -0.04, 0]} r={[0, 0, 0.7]} cast={false} />
            <M g={boxG(0.08, 0.42, 0.03)} c="#3ac85a" p={[0.1, 0.06, 0]} r={[0, 0, -0.55]} cast={false} />
          </group>
        ) : null}
        {actors.map((a, k) => (
          <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
        ))}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {dip > 0 ? <AbsoluteFill style={{ background: "#000", opacity: dip }} /> : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.3} accent={ACCENT} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/franklin-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const FRANKLIN_FRAMES = DURATION;
