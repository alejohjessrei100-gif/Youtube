// The Kentucky meat shower short: one persistent View; the setups are data (shots.ts).
import { Audio } from "@remotion/media";
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { boxG, cylG, M } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { withShake } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { camAt, flockAt, hensAt, heroVultureAt, setupAt } from "./shots";
import type { Prop } from "./shots";
import { Chicken, Chunk, Farm, Jar, Lab, Museum, Vulture } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words.gen";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const Paddle: React.FC<{ a: V3; b: V3 }> = ({ a, b }) => {
  const A = new THREE.Vector3(...a);
  const Bv = new THREE.Vector3(...b);
  const mid = A.clone().add(Bv).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
  const L = A.distanceTo(Bv);
  return (
    <group position={mid.toArray() as V3} quaternion={q}>
      <M g={cylG(0.022, 0.022, L, 8)} c="#a07a52" tex="wood" />
      <M g={boxG(0.16, 0.24, 0.03)} c="#8a6a44" tex="wood" p={[0, -L / 2 + 0.1, 0]} />
    </group>
  );
};
const PropView: React.FC<{ p: Prop }> = ({ p }) => {
  if (p.kind === "chunk") return <Chunk p={p.p} s={p.s} seed={p.seed} splat={p.splat} rot={p.rot} />;
  if (p.kind === "paddle" && p.q) return <Paddle a={p.p} b={p.q} />;
  if (p.kind === "jar") return <Jar p={p.p} s={p.s} meat seed={p.seed} />;
  return null;
};

export const MeatShower: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1220" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const { s } = setupAt(t);
  const p = camAt(t);
  const cam = withShake(p, p.shake);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const props = s.props?.(t) ?? [];
  const lead = actors[0];
  const flock = s.id >= 14 && s.id <= 16 ? flockAt(t) : null;
  const hero = s.id === 15 ? heroVultureAt(t) : null;
  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus} blur={s.blur} sky={!!s.sky} fogK={s.set === "farm" ? 0.45 : 1}>
        {s.set === "farm" ? (
          <Farm s={{ t, stir: t, fire: 1 }}>
            {hensAt(t).map((h, i) => (
              <Chicken key={i} {...h} />
            ))}
            {flock?.birds.map((b, i) => (s.id === 15 && i === 0 ? null : <Vulture key={i} {...b} />))}
            {flock?.vomit.map((c, i) => <PropView key={`v${i}`} p={c} />)}
            {hero ? <Vulture {...hero.bird} /> : null}
            {hero?.vomit.map((c, i) => <PropView key={`h${i}`} p={c} />)}
          </Farm>
        ) : null}
        {s.set === "lab" ? <Lab s={{ ...(s.lab?.(t) ?? { jarLung: 0, jarMuscle: 0, jarCart: 0 }), lamp: 1, t }} /> : null}
        {s.set === "museum" ? <Museum s={{ t }} /> : null}
        {actors.map((a, k) => (
          <group key={`${s.id}-${k}`} position={a.p} scale={a.sc ?? [1, 1, 1]}>
            <Character3D {...a.spec} position={[0, 0, 0]} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
          </group>
        ))}
        {props.map((pr, i) => (
          <PropView key={i} p={pr} />
        ))}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.5, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.35} accent={new Set(["meat", "palm", "1876", "taste", "mutton", "venison", "vultures", "up"])} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/meat-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const MEAT_FRAMES = DURATION;
