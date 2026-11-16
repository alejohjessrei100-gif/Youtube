// The Agloe short: one persistent View; the setups are data (shots.ts). This file draws the set, the actors, the
// held props, the captions and the sound. `sub` renders SUB sub-frames per output frame for motion blur.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import type { Pose as BodyPose } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { subFrame, useFonts } from "../inkbeat/core/frame";
import { moodOf, MOODS } from "../inkbeat/core/moods";
import { withShake } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import { camAt, setupAt } from "./shots";
import { Field, Hammer, HeldMap, Magnifier, Office, Pen, RivalOffice } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

if (!MOODS.office) MOODS.office = MOODS.golden;

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const qt = (t: number) => Math.round(t * 10) / 10;
/** small life on top of a pose: breathing bob, a slow head sway; arms that are not solved to a target sway a little */
const alive = (p: BodyPose, t: number, k: number, ik: boolean): BodyPose => {
  const tq = qt(t);
  const arm = (a: [number, number] | undefined, ph: number): [number, number] | undefined => {
    if (ik || !a) return a;
    return [a[0] + 3 * Math.sin(tq * 2.2 + ph), a[1] + 3 * Math.sin(tq * 1.7 + ph + 1)];
  };
  return {
    ...p,
    armL: arm(p.armL, k),
    armR: arm(p.armR, k + 2),
    headTilt: (p.headTilt ?? 0) + 3 * Math.sin(tq * 1.5 + k),
    headYaw: (p.headYaw ?? 0) + 4 * Math.sin(tq * 1.1 + k * 2),
    bob: (p.bob ?? 0) + 2 * Math.sin(tq * 3.0 + k),
  };
};

export const Agloe: React.FC<{ sub?: boolean; audio?: boolean }> = ({ sub = false, audio = true }) => {
  const ready = useFonts();
  const g = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#120c14" }} />;
  const { n, fp } = sub ? subFrame(g) : { n: g, fp: g };
  const t = Math.min(fp / FPS, SECONDS - 1e-3);
  const { s } = setupAt(t);
  const p = camAt(t);
  const cam = withShake(p, p.shake);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra?.(t) ?? {};
  const lead = actors[0];
  return (
    <AbsoluteFill style={{ background: "#120c14" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus} blur={s.blur} sky={!!s.sky} fogK={s.set === "field" ? 0.5 : 1}>
        {s.set === "office" ? <Office s={s.office?.(t) ?? {}} /> : null}
        {s.set === "rival" ? <RivalOffice /> : null}
        {s.set === "field" ? <Field s={s.field?.(t) ?? { store: 0 }} /> : null}
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
        {ex.pen ? <Pen tip={ex.pen.tip} top={ex.pen.top} /> : null}
        {ex.magnifier ? <Magnifier hand={ex.magnifier} yaw={-0.15} /> : null}
        {ex.hammer ? <Hammer hand={ex.hammer.hand} swing={ex.hammer.swing} /> : null}
        {ex.mapInHand ? <HeldMap p={ex.mapInHand.p} yaw={ex.mapInHand.yaw} /> : null}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      <Captions chunks={CHUNKS} t={n / FPS} until={LAST + 0.35} accent={new Set(["agloe", "trap", "copied", "sue", "real", "gone"])} accentColor="#ffd34d" />
      {audio && !sub ? <Audio src={staticFile("audio/agloe-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const AGLOE_FRAMES = DURATION;
