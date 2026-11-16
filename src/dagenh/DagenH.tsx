// The Dagen H short: one persistent View; the setups are data (shots.ts). This file draws the set, the actors, the
// captions and the sound.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import type { Pose as BodyPose } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { subFrame, useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { withShake } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import { camAt, setupAt } from "./shots";
import { Border, ChartRoom, Country, StampRoom, Street, VoteHall } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const qt = (t: number) => Math.round(t * 10) / 10;
const alive = (p: BodyPose, t: number, k: number, ik: boolean): BodyPose => {
  const tq = qt(t);
  const arm = (a: [number, number] | undefined, ph: number): [number, number] | undefined => (ik || !a ? a : [a[0] + 3 * Math.sin(tq * 2.2 + ph), a[1] + 3 * Math.sin(tq * 1.7 + ph + 1)]);
  return {
    ...p,
    armL: arm(p.armL, k),
    armR: arm(p.armR, k + 2),
    headTilt: (p.headTilt ?? 0) + 3 * Math.sin(tq * 1.5 + k),
    headYaw: (p.headYaw ?? 0) + 4 * Math.sin(tq * 1.1 + k * 2),
    bob: (p.bob ?? 0) + 2 * Math.sin(tq * 3.0 + k),
  };
};

export const DagenH: React.FC<{ sub?: boolean; audio?: boolean }> = ({ sub = false, audio = true }) => {
  const ready = useFonts();
  const g = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#0e1020" }} />;
  const { n, fp } = sub ? subFrame(g) : { n: g, fp: g };
  const t = Math.min(fp / FPS, SECONDS - 1e-3);
  const { s } = setupAt(t);
  const p = camAt(t);
  const cam = withShake(p, p.shake);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const w = s.world(t);
  const lead = actors[0];
  const outdoor = s.set === "street" || s.set === "border" || s.set === "country";
  return (
    <AbsoluteFill style={{ background: "#0e1020" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus} blur={s.blur} sky={!!s.sky} fogK={outdoor ? 0.5 : 1}>
        {s.set === "street" ? <Street s={{ cars: w.cars ?? [], minutes: w.minutes ?? 50, lamps: w.lamps }} /> : null}
        {s.set === "vote" ? <VoteHall count={w.count ?? 0} ballot={w.ballot} /> : null}
        {s.set === "stamp" ? <StampRoom stamped={w.stamped ?? 0} stampY={w.stampY ?? 0.9} stampAt={[0.15, 0, 0.18]} /> : null}
        {s.set === "border" ? <Border cars={w.cars ?? []} /> : null}
        {s.set === "country" ? <Country cars={w.cars ?? []} /> : null}
        {s.set === "chart" ? <ChartRoom fall={w.fall ?? 0} reveal={w.reveal ?? 1} /> : null}
        {actors.map((a, k) => (
          <Character3D
            key={`${s.id}-${k}`}
            {...a.spec}
            position={a.p}
            yaw={a.yaw}
            t={t + k * 0.7}
            face={a.face}
            pose={alive(a.pose ?? {}, t, k, !!a.ik)}
            hold={a.hold ?? null}
            holdSide={a.holdSide}
            faceCamera={a.ik ? undefined : cam.pos}
            faceCameraAmount={0.25}
          />
        ))}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      <Captions chunks={CHUNKS} t={n / FPS} until={LAST + 0.35} accent={new Set(["stops", "1967", "no", "anyway", "left", "fell", "five"])} accentColor="#ffd34d" />
      {audio && !sub ? <Audio src={staticFile("audio/dagenh-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const DAGENH_FRAMES = DURATION;
