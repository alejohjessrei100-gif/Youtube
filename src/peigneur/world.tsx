// The Lake Peigneur short's sets.
//   Lake   : a round Louisiana lake (radius 34) with cypress shores, an island, a canal, an oil rig on stilts, a fisherman's
//            boat, barges and a whirlpool. The water level, the funnel, the rig, the barges and the island chunk are state.
//   Section: a front-cut cross-section: water, lake bed, the drill pipe, and the salt mine room below. The cut face is open
//            toward +z so the camera can crane down through it and stand inside the mine without touching geometry.
import React from "react";
import * as THREE from "three";
import { boxG, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const LAKE_R = 34;
export const RIG_P: V3 = [8, 0, -9]; // = the lake center: the whirlpool, the rig and the lake share it
const Z0: V3 = [0, 0, 0];
export const BED_Y = -1.8;
export const WHIRL_R = 9;
export const HOLE_R = 1.3;

// ------------------------------------------------------------------ cached round geometries
const ringCache = new Map<string, THREE.BufferGeometry>();
const ringG = (a: number, b: number, n = 64) => {
  const k = `${a}|${b}|${n}`;
  let g = ringCache.get(k);
  if (!g) {
    g = new THREE.RingGeometry(a, b, n, 1);
    ringCache.set(k, g);
  }
  return g;
};
const discCache = new Map<number, THREE.BufferGeometry>();
const discG = (r: number, n = 64) => {
  let g = discCache.get(r);
  if (!g) {
    g = new THREE.CircleGeometry(r, n);
    discCache.set(r, g);
  }
  return g;
};
const FLAT: V3 = [-PI / 2, 0, 0];

// ------------------------------------------------------------------ trees
const Cypress: React.FC<{ p: V3; s?: number; seed?: number }> = ({ p, s = 1, seed = 0 }) => (
  <group position={p} scale={s} rotation={[0, h1(seed) * 6, 0]}>
    <M g={cylG(0.22, 0.45, 2.2, 10)} c="#6a5038" tex="wood" p={[0, 1.1, 0]} />
    {[0, 1, 2].map((i) => (
      <M key={i} g={cylG(0.07, 0.12, 0.55, 6)} c="#6a5038" p={[Math.cos(i * 2.1) * 0.55, 0.25, Math.sin(i * 2.1) * 0.55]} r={[Math.sin(i * 2.1) * 0.5, 0, -Math.cos(i * 2.1) * 0.5]} />
    ))}
    <M g={sphG(1.35, 14)} c="#4a7a3a" p={[0, 3.4, 0]} s={[1, 0.8, 1]} />
    <M g={sphG(0.95, 12)} c="#5a8a44" p={[0.9, 3.9, 0.3]} />
    <M g={sphG(0.85, 12)} c="#3f6e34" p={[-0.8, 3.7, -0.4]} />
    {/* hanging moss */}
    {[0, 1, 2, 3].map((i) => (
      <M key={i} g={coneG(0.16, 1.1, 6)} c="#9aa890" p={[Math.cos(i * 1.6) * 1.0, 2.4, Math.sin(i * 1.6) * 1.0]} r={[PI, 0, 0]} cast={false} />
    ))}
  </group>
);

// ------------------------------------------------------------------ the oil rig: a deck on stilts, a derrick, a shack
export type RigState = { tilt: number; sink: number } | null;
export const Rig: React.FC<{ s: RigState }> = ({ s }) => {
  if (!s) return null;
  return (
    <group position={[0, -s.sink, 0]}>
      <group rotation={[0, 0, s.tilt]} position={[0, 0, 0]}>
        {[[-3, -3], [3, -3], [-3, 3], [3, 3]].map(([x, z], i) => (
          <M key={i} g={cylG(0.22, 0.22, 5.2, 10)} c="#5a5a62" tex="metal" p={[x, 0.8, z]} />
        ))}
        <M g={boxG(8.4, 0.5, 8.4)} c="#8a8a92" tex="metal" p={[0, 3.4, 0]} />
        <M g={boxG(8.6, 0.12, 0.12)} c="#e8b820" p={[0, 3.72, 4.2]} />
        {/* the derrick */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
          <M key={i} g={boxG(0.22, 11.5, 0.22)} c="#c8402e" tex="metal" p={[x * 1.35, 9.4, z * 1.35]} r={[-z * 0.07, 0, x * 0.07]} />
        ))}
        {[0.2, 0.42, 0.62, 0.8].map((u, i) => (
          <group key={i} position={[0, 3.65 + u * 11.2, 0]} scale={1 - u * 0.62}>
            <M g={boxG(2.9, 0.12, 0.12)} c="#d88a30" p={[0, 0, 1.38]} />
            <M g={boxG(2.9, 0.12, 0.12)} c="#d88a30" p={[0, 0, -1.38]} />
            <M g={boxG(0.12, 0.12, 2.9)} c="#d88a30" p={[1.38, 0, 0]} />
            <M g={boxG(0.12, 0.12, 2.9)} c="#d88a30" p={[-1.38, 0, 0]} />
          </group>
        ))}
        <M g={boxG(1.2, 0.8, 1.2)} c="#c8c8d0" tex="metal" p={[0, 15.2, 0]} />
        <M g={cylG(0.14, 0.14, 11, 10)} c="#4a4a52" tex="metal" p={[0, 9.0, 0]} />
        {/* the crew shack with a lit window and a sign */}
        <group position={[-2.3, 3.65, 2.0]}>
          <M g={boxG(2.6, 1.9, 2.2)} c="#e8e0cc" tex="planks" p={[0, 0.95, 0]} />
          <M g={boxG(2.9, 0.12, 2.5)} c="#3a3a44" tex="shingles" p={[0, 1.98, 0]} />
          <mesh geometry={boxG(0.8, 0.6, 0.02)} material={coreMat("#ffe2a0", 0.9)} position={[0, 1.15, 1.11]} />
          <Label text="NOV 20, 1980" p={[0, 1.72, 1.12]} w={2.2} h={0.32} fg="#2a1a12" bg="#f4ead6" font={0.7} />
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ barges and a boat
export type BargeState = { p: V3; yaw: number; tilt: number };
const Barge: React.FC<{ b: BargeState; i: number }> = ({ b, i }) => (
  <group position={b.p} rotation={[b.tilt * 0.6, b.yaw, b.tilt]}>
    <M g={boxG(5.2, 1.0, 2.2)} c={i % 2 ? "#4a5a6a" : "#6a4a3a"} tex="metal" p={[0, 0.1, 0]} />
    <M g={boxG(5.0, 0.2, 2.0)} c="#2a2a32" p={[0, 0.65, 0]} />
    <M g={coneG(1.0, 1.1, 10)} c="#f0eee8" tex="rock" p={[-1.0, 1.25, 0]} />
    <M g={coneG(0.85, 0.9, 10)} c="#f4f2ec" tex="rock" p={[1.1, 1.15, 0.1]} />
    <M g={boxG(0.3, 0.3, 2.3)} c="#c8402e" p={[2.55, 0.5, 0]} />
  </group>
);
export type BoatState = { p: V3; roll: number; yaw: number };
export const BOAT_TOP = 0.62;
const Boat: React.FC<{ b: BoatState }> = ({ b }) => (
  <group position={b.p} rotation={[b.roll, b.yaw, 0]}>
    <M g={boxG(3.0, 0.62, 1.3)} c="#e8e2d0" tex="planks" p={[0, 0.31, 0]} />
    <M g={boxG(0.95, 0.62, 1.05)} c="#e8e2d0" tex="planks" p={[1.85, 0.36, 0]} r={[0, 0, -0.3]} />
    <M g={boxG(3.2, 0.1, 1.4)} c="#2a6a8a" p={[0, 0.66, 0]} />
    <M g={boxG(3.04, 0.1, 1.34)} c="#c8402e" p={[0, 0.2, 0]} />
    <M g={boxG(0.5, 0.45, 0.4)} c="#2a2a32" tex="metal" p={[-1.65, 0.6, 0]} />
    <M g={cylG(0.03, 0.03, 2.3, 6)} c="#5a3a22" tex="wood" p={[0.7, 1.4, 0.55]} r={[0.2, 0, -0.9]} />
    <M g={cylG(0.006, 0.006, 1.6, 4)} c="#d8d8d0" p={[1.55, 1.9, 0.75]} />
  </group>
);

// ------------------------------------------------------------------ the lake
export type LakeState = {
  level: number;
  /** funnel depth (m) and its dark hole scale 0..1 */
  depth: number;
  hole: number;
  rig: RigState;
  barges: BargeState[];
  chunkSink: number;
  /** canal phase (m moved) and direction sign (±1) */
  canalPhase: number;
  canalDir: number;
  boat: BoatState | null;
  t: number;
  spin: number;
};
export const ISLAND_P: V3 = [-27, 0, -6];
export const CHUNK_P: V3 = [-17.5, 0, -3];
const Whirl: React.FC<{ level: number; depth: number; hole: number; spin: number }> = ({ level, depth, hole, spin }) => {
  if (depth < 0.05) return <M g={discG(WHIRL_R)} c="#3f8fb0" p={[0, level, 0]} r={FLAT} cast={false} />;
  const rings = 7;
  return (
    <group position={Z0}>
      <M g={cylG(WHIRL_R, HOLE_R, 1, 40, true)} c="#2f7ea0" p={[0, level - depth / 2, 0]} s={[1, depth, 1]} side={THREE.DoubleSide} cast={false} />
      <M g={discG(HOLE_R * 1.02, 28)} c="#0a1a2a" p={[0, level - depth, 0]} r={FLAT} s={[hole + 0.001, hole + 0.001, 1]} cast={false} />
      {Array.from({ length: rings }, (_, i) => {
        const f = (i + 0.5) / rings;
        const r = WHIRL_R + (HOLE_R - WHIRL_R) * f;
        const rate = (1.1 + 0.5 * f) * (i % 2 ? 1 : 1) * 1.2;
        return (
          <group key={i} position={[0, level - depth * f + 0.04, 0]} rotation={[0, spin * rate + i * 1.4, 0]}>
            <M g={torG(r * 0.97, 0.1, PI * (1.0 + 0.2 * (i % 2)))} c={i % 2 ? "#e8f6ff" : "#bfe4f4"} r={FLAT} cast={false} />
          </group>
        );
      })}
    </group>
  );
};
const Chevron: React.FC<{ x: number; dir: number; fade: number }> = ({ x, dir, fade }) => (
  <group position={[x, 0.02, 0]} scale={[fade, 1, fade]}>
    {[-1, 1].map((z) => (
      <mesh key={z} geometry={boxG(2.6, 0.04, 0.34)} material={coreMat("#f2fbff", 0.95)} position={[0, 0, z * 0.95]} rotation={[0, dir * z * 0.7, 0]} userData={{ outline: false }} />
    ))}
  </group>
);
export const Lake: React.FC<{ s: LakeState }> = ({ s }) => {
  const dropped = s.level < -0.05;
  const w2l = (p: V3): V3 => [p[0] - RIG_P[0], p[1], p[2] - RIG_P[2]];
  return (
    <group position={RIG_P}>
      {/* the bank (a wall around the lake), the lake bed with the hole, the grass beyond */}
      <M g={cylG(LAKE_R + 0.2, LAKE_R + 0.2, -BED_Y, 64, true)} c="#8a6a4a" tex="sand" p={[0, BED_Y / 2, 0]} side={THREE.DoubleSide} cast={false} />
      <M g={ringG(HOLE_R, LAKE_R + 0.2)} c="#7a6a50" tex="sand" p={[0, BED_Y, 0]} r={FLAT} cast={false} />
      <M g={discG(HOLE_R + 0.01, 28)} c="#0a1a2a" p={[0, BED_Y - 6, 0]} r={FLAT} cast={false} />
      <M g={ringG(LAKE_R + 0.2, 260, 64)} c="#5f9a4a" tex="grass" ts={1.4} p={[0, 0, 0]} r={FLAT} cast={false} />
      {/* the water: a ring around the whirl, the skirt at the bank, and the funnel inside */}
      <M g={ringG(WHIRL_R, LAKE_R + 0.25)} c="#3f8fb0" p={[0, s.level, 0]} r={FLAT} cast={false} />
      <M g={cylG(LAKE_R + 0.25, LAKE_R + 0.25, 0.6, 64, true)} c="#3a86a8" p={[0, s.level - 0.3, 0]} side={THREE.DoubleSide} cast={false} />
      <Whirl level={s.level} depth={s.depth} hole={s.hole} spin={s.spin} />
      {/* ripples, drifting and slowly turning (3 Hz or less) */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = h1(i + 3) * PI * 2;
        const r = 6 + h1(i + 9) * 26;
        if (r < WHIRL_R + 1) return null;
        return (
          <group key={i} position={[Math.cos(a) * r, s.level + 0.03, Math.sin(a) * r]} rotation={[0, h1(i) * 6 + s.t * 0.15, 0]}>
            <M g={torG(0.9 + h1(i + 5) * 0.7, 0.04, PI * 0.7)} c="#d8f0fa" r={FLAT} cast={false} />
          </group>
        );
      })}
      {/* the island on the far shore and the chunk that is dragged under; cypress trees ring the lake */}
      <group position={[ISLAND_P[0], 0, ISLAND_P[2]]}>
        <M g={cylG(12, 14, 1.4, 28)} c="#5f9a4a" tex="grass" p={[0, -0.2, 0]} />
        <Cypress p={[-3, 0.5, -2]} s={1.7} seed={1} />
        <Cypress p={[3, 0.5, 3]} s={1.5} seed={2} />
        <Cypress p={[-2, 0.5, 5]} s={1.3} seed={3} />
        <M g={boxG(4.2, 2.6, 3.4)} c="#d8c8a8" tex="planks" p={[5, 1.4, -2]} />
        <M g={boxG(4.8, 0.14, 4.0)} c="#7a3a3a" tex="shingles" p={[5, 2.9, -2]} />
      </group>
      <group position={[CHUNK_P[0], -3.2 * s.chunkSink, CHUNK_P[2]]} rotation={[0.35 * s.chunkSink, 0, -0.3 * s.chunkSink]}>
        <M g={cylG(5, 6, 1.6, 20)} c="#5f9a4a" tex="grass" p={[0, -0.4, 0]} />
        <Cypress p={[-1.2, 0.4, 0.5]} s={1.3} seed={4} />
        <Cypress p={[1.6, 0.4, -1]} s={1.1} seed={5} />
      </group>
      {Array.from({ length: 26 }, (_, i) => {
        const a = (i / 26) * PI * 2 + h1(i) * 0.15;
        if (Math.cos(a) > 0.8) return null; // keep the canal side clear of trees (the camera looks along it)
        const r = LAKE_R + 3 + h1(i + 40) * 6;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (Math.hypot(x - ISLAND_P[0], z - ISLAND_P[2]) < 16) return null;
        return <Cypress key={i} p={[x, 0, z]} s={1.1 + h1(i + 7) * 0.7} seed={i + 10} />;
      })}
      <Rig s={s.rig} />
      {s.barges.map((b, i) => (
        <Barge key={i} b={{ ...b, p: w2l(b.p) }} i={i} />
      ))}
      {s.boat ? <Boat b={{ ...s.boat, p: w2l(s.boat.p) }} /> : null}
      {/* a short pier on the south shore */}
      <group position={[-8, 0, 28.6]}>
        <M g={boxG(3, 0.3, 13)} c="#9a7a54" tex="planks" p={[0, 0.25, 0]} />
        {[-1.3, 1.3].map((x) =>
          [-5.5, -2, 1.5, 5].map((z) => <M key={`${x}${z}`} g={boxG(0.18, 2.4, 0.18)} c="#6a4a32" tex="wood" p={[x, -0.6, z]} />),
        )}
      </group>
      {/* the canal: a channel east of the lake; chevrons run along it (water level follows the lake) */}
      <group position={[LAKE_R + 0.2, 0, 0]}>
        <M g={boxG(46, 0.12, 7)} c="#3a86a8" p={[23, 0.07, 0]} cast={false} />
        {[-1, 1].map((z) => (
          <M key={z} g={boxG(46, 0.5, 2.6)} c="#7a8a4a" tex="grass" p={[23, 0.25, z * 4.8]} />
        ))}
        <group position={[0, 0.14, 0]}>
          {Array.from({ length: 7 }, (_, i) => {
            const L = 42;
            const x = (((i * 6 + s.canalPhase) % L) + L) % L;
            const fade = clamp(Math.min(x, L - x) / 3);
            return <Chevron key={i} x={x + 2} dir={s.canalDir} fade={fade} />;
          })}
        </group>
      </group>
      {dropped ? null : null}
    </group>
  );
};

// ------------------------------------------------------------------ the cross-section
export type SectionState = { tip: number; gap: number; pour: number; pool: number; t: number };
export const MINE_H = 3.6;
export const SEC_WATER_TOP = 12;
const Lantern: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(0.16, 0.5, 0.12)} c="#3a3a40" tex="metal" p={[0, 0, 0]} />
    <mesh geometry={sphG(0.12, 12)} material={coreMat("#ffd890", 1.1)} position={[0, -0.1, 0.1]} />
    <pointLight position={[0, -0.1, 0.5]} color="#ffb860" intensity={3.2} distance={6} decay={2} />
  </group>
);
export const Section: React.FC<{ s: SectionState }> = ({ s }) => {
  const gx = s.gap;
  const tip = s.tip;
  const piercing = tip < MINE_H;
  const colH = Math.max(0, MINE_H - s.pool);
  return (
    <group>
      {/* walls and floor of the mine, the back wall of the section */}
      <M g={boxG(40, 18, 0.4)} c="#8a6a50" tex="rock" p={[0, 7, -3.2]} cast={false} />
      <M g={boxG(14, MINE_H, 0.12)} c="#f6f0e8" tex="rock" p={[0, MINE_H / 2, -2.94]} cast={false} />
      {Array.from({ length: 12 }, (_, i) => (
        <M key={i} g={boxG(0.5 + h1(i) * 0.5, 0.5 + h1(i + 4) * 0.5, 0.3)} c={i % 3 ? "#f2e6dc" : "#e8c8c0"} tex="rock" p={[-6.2 + i * 1.1, 0.5 + h1(i + 9) * 2.6, -2.8]} r={[0, 0, h1(i) * 0.6]} />
      ))}
      <M g={boxG(40, 2, 6)} c="#9a8a7a" tex="rock" p={[0, -1, 0]} />
      <M g={boxG(14, 0.05, 5.6)} c="#d8ccc0" tex="sand" p={[0, 0.03, 0.1]} cast={false} />
      {[-1, 1].map((x) => (
        <M key={x} g={boxG(5, MINE_H, 6)} c="#a8957f" tex="rock" p={[x * 9.5, MINE_H / 2, 0]} />
      ))}
      {[-1, 1].map((x) => (
        <M key={x} g={boxG(8, 14.5, 6)} c="#8a7a64" tex="rock" p={[x * 16, 5.25, 0]} />
      ))}
      {[-1, 1].map((x) => (
        <M key={x} g={boxG(8.02, 0.14, 6.02)} c="#5f9a4a" tex="grass" p={[x * 16, 12.6, 0]} />
      ))}
      {/* the lake bed: two blocks with the drilled hole between them (it widens as the water tears it open) */}
      {[-1, 1].map((x) => (
        <M key={x} g={boxG(11.8, 2.4, 6)} c="#8a6a4a" tex="sand" p={[x * (gx + 5.9), MINE_H + 1.2, 0]} />
      ))}
      <M g={boxG(0.01 + gx * 2, 2.4, 0.2)} c="#0a1a2a" p={[0, MINE_H + 1.2, -2.8]} cast={false} />
      {/* the lake above: a translucent slab with a bright top edge */}
      <M g={boxG(24, 6, 6)} c="#3f8fb0" p={[0, 9, 0]} op={0.62} cast={false} />
      <M g={boxG(24.02, 0.14, 6.02)} c="#bfe4f4" p={[0, SEC_WATER_TOP + 0.02, 0]} cast={false} />
      {/* the rig on a barge at the top, and the drill pipe hanging from it to the bit */}
      <M g={boxG(6, 0.6, 3.4)} c="#8a8a92" tex="metal" p={[0, SEC_WATER_TOP + 0.3, 0.2]} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <M key={i} g={boxG(0.16, 6.5, 0.16)} c="#c8402e" tex="metal" p={[x * 0.9, SEC_WATER_TOP + 3.9, z * 0.9]} r={[-z * 0.08, 0, x * 0.08]} />
      ))}
      <M g={cylG(0.14, 0.14, 20, 10)} c="#4a4a52" tex="metal" p={[0, tip + 10, 0.2]} />
      <M g={coneG(0.2, 0.34, 10)} c="#c8c8d0" tex="metal" p={[0, tip - 0.1, 0.2]} r={[PI, 0, 0]} />
      {/* the mine: lanterns, a cart on rails, a pillar of salt */}
      <Lantern p={[-6.2, 2.6, -2.7]} />
      <Lantern p={[6.2, 2.6, -2.7]} />
      <Lantern p={[0, 3.2, -2.7]} />
      <group position={[4.8, 0, -1.9]}>
        <M g={boxG(1.6, 0.7, 1.0)} c="#4a5a6a" tex="metal" p={[0, 0.7, 0]} />
        <M g={coneG(0.7, 0.5, 10)} c="#f2eee8" tex="rock" p={[0, 1.25, 0]} />
        {[-0.55, 0.55].map((x) => [-0.4, 0.4].map((z) => <M key={`${x}${z}`} g={cylG(0.16, 0.16, 0.1, 12)} c="#2a2a30" p={[x, 0.2, z]} r={[PI / 2, 0, 0]} />))}
      </group>
      <M g={boxG(14, 0.06, 0.08)} c="#4a4a52" tex="metal" p={[0, 0.06, -1.5]} />
      <M g={boxG(14, 0.06, 0.08)} c="#4a4a52" tex="metal" p={[0, 0.06, -2.3]} />
      {/* the water pouring in: a column in the hole, a splash at the floor, a pool that rises */}
      {s.pour > 0.02 && piercing ? (
        <group>
          <M g={cylG(0.16 + 0.55 * s.pour, 0.22 + 0.7 * s.pour, colH, 14)} c="#7ab8d8" p={[0, MINE_H - colH / 2, 0.2]} op={0.9} cast={false} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * PI * 2 + s.t * 2.5;
            const r = (0.5 + 0.5 * h1(i)) * (0.6 + s.pour * 1.2);
            return <mesh key={i} geometry={sphG(0.12 + 0.08 * h1(i + 2), 8)} material={coreMat("#f4fbff", 0.95)} position={[Math.cos(a) * r, s.pool + 0.1 + 0.25 * Math.abs(Math.sin(a * 2 + i)), 0.2 + Math.sin(a) * r * 0.7] as V3} />;
          })}
        </group>
      ) : null}
      {s.pool > 0.02 ? <M g={boxG(14, s.pool, 5.8)} c="#4a9ac0" p={[0, s.pool / 2, 0.1]} op={0.8} cast={false} /> : null}
    </group>
  );
};
void Label;
