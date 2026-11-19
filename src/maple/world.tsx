// Maple Street at night: one house with a full porch (deck, steps, roof, posts, rails, lamp, door, windows, number,
// plants, chair and table, bicycle, mailbox), picket fence with a gate, flower beds, hedges, gravel path, a street with
// a sidewalk and a street lamp, neighbours' houses with lit windows (one across the street has a silhouette watching),
// trees, far hills, a cat on the fence, fireflies, moths round the lamp. Every flat surface is a separate solid with a
// gap of >= 2 cm: nothing coplanar. Obstacles are exported for the every-frame checker.
import React from "react";
import * as THREE from "three";
import { boxG, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { Tuft } from "../gull/world";

const PI = Math.PI;
export const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const DECK_Y = 0.3;
export const MAT_C: V3 = [0, DECK_Y, 0.65];
export const MAT_REST_Y = DECK_Y + 0.034;
export const FENCE_Z = 6.2;
export const stepY = (z: number) => (z > 2.95 ? 0 : z > 2.55 ? 0.1 : z > 2.2 ? 0.2 : DECK_Y);
export type Box = { n: string; min: V3; max: V3 };
export const BOXES: Box[] = [
  { n: "house", min: [-3.5, 0, -5], max: [3.5, 3.2, 0] },
  { n: "porch roof", min: [-2.7, 2.3, 0], max: [2.7, 2.6, 2.6] },
  { n: "post L", min: [-2.4, 0, 2.0], max: [-2.2, 2.3, 2.2] }, { n: "post R", min: [2.2, 0, 2.0], max: [2.4, 2.3, 2.2] },
  { n: "rail L", min: [-1.12, 0.3, 0.1], max: [-1.0, 1.1, 2.2] }, { n: "rail R", min: [1.0, 0.3, 0.1], max: [1.12, 1.1, 2.2] },
  { n: "chair", min: [-2.2, 0.3, 0.6], max: [-1.5, 1.0, 1.3] }, { n: "bike", min: [1.3, 0.3, 0.3], max: [2.3, 1.0, 0.6] },
  { n: "mailbox", min: [-2.3, 0, 5.1], max: [-2.1, 1.2, 5.4] },
  { n: "pot 1", min: [-1.0, 0.3, 0.2], max: [-0.6, 0.85, 0.6] }, { n: "pot 2", min: [0.65, 0.3, 0.15], max: [1.05, 0.85, 0.55] },
  { n: "pot 3", min: [1.85, 0.3, 0.85], max: [2.25, 0.85, 1.25] }, { n: "pot 4", min: [-2.2, 0.3, 1.7], max: [-1.8, 0.85, 2.1] },
  { n: "table", min: [-1.95, 0.3, 0.4], max: [-1.55, 0.9, 0.7] },
  { n: "fence L", min: [-8, 0, FENCE_Z - 0.05], max: [-0.95, 0.95, FENCE_Z + 0.05] }, { n: "fence R", min: [0.95, 0, FENCE_Z - 0.05], max: [8, 0.95, FENCE_Z + 0.05] },
  { n: "street lamp", min: [3.4, 0, 7.9], max: [3.6, 3.6, 8.1] },
  { n: "tree L", min: [-7.4, 0, 2.6], max: [-6.6, 4.5, 3.4] }, { n: "tree R", min: [6.6, 0, 3.0], max: [7.4, 4.5, 3.8] },
  { n: "across house", min: [-4, 0, 17], max: [4, 3.4, 22] },
  { n: "hedge L", min: [-3.4, 0, 3.4], max: [-1.9, 0.9, 4.6] }, { n: "hedge R", min: [1.9, 0, 3.4], max: [3.4, 0.9, 4.6] },
  { n: "left house", min: [-12.5, 0, -4], max: [-5, 3, 0.5] }, { n: "right house", min: [5, 0, -4], max: [12.5, 3, 0.5] },
];
// unfogged, untonemapped glow (the street fog at 15 m otherwise washes a lamp glow into the wall)
const glowCache = new Map<string, THREE.MeshBasicMaterial>();
const glowMat = (col: string, k: number) => {
  const key = `${col}|${k.toFixed(2)}`;
  let m = glowCache.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), toneMapped: false, fog: false }); glowCache.set(key, m); }
  return m;
};
// ------------------------------------------------------------------ small parts
const Window: React.FC<{ p: V3; w?: number; h?: number; lit?: boolean; curtain?: boolean; watcher?: boolean; dz?: number }> = ({ p, w = 0.9, h = 1.0, lit = true, curtain, watcher, dz = 1 }) => (
  <group position={p}>
    <mesh geometry={boxG(w, h, 0.04)} position={[0, 0, 0.02 * dz]} material={coreMat(lit ? "#ffcf80" : "#26324a", lit ? 1.5 : 0.6)} />
    {[[0, h / 2 + 0.05, w + 0.2, 0.1], [0, -h / 2 - 0.05, w + 0.2, 0.1], [-w / 2 - 0.05, 0, 0.1, h], [w / 2 + 0.05, 0, 0.1, h], [0, 0, 0.05, h], [0, 0, w, 0.05]].map(([x, y, ww, hh], i) => (
      <M key={i} g={boxG(ww, hh, 0.1)} c="#e8e0d0" p={[x, y, 0.07 * dz]} cast={false} />
    ))}
    {curtain ? (
      <>
        <M g={boxG(0.28, h, 0.03)} c="#a04a3a" p={[-w / 2 + 0.14, 0, 0.05 * dz]} cast={false} />
        <M g={boxG(0.28, h, 0.03)} c="#a04a3a" p={[w / 2 - 0.14, 0, 0.05 * dz]} cast={false} />
      </>
    ) : null}
    {watcher ? (
      <>
        <M g={sphG(0.13, 12)} c="#1a1010" p={[0.05, -0.05, 0.065 * dz]} s={[1, 1.1, 0.25]} cast={false} />
        <M g={boxG(0.46, 0.26, 0.03)} c="#1a1010" p={[0.05, -0.34, 0.065 * dz]} cast={false} />
      </>
    ) : null}
  </group>
);
const Tree: React.FC<{ p: V3; s?: number; seed: number }> = ({ p, s = 1, seed }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.25, 0.38, 2.8, 12)} c="#4a3a2e" tex="wood" p={[0, 1.4, 0]} />
    {[0, 1, 2, 3, 4].map((i) => (
      <M key={i} g={sphG(1, 14)} c={i % 2 ? "#2e5a3a" : "#3a6a44"} p={[Math.sin(i * 2.4 + seed) * 0.9, 3.3 + (i % 3) * 0.5, Math.cos(i * 2.4 + seed) * 0.9]} s={1.1 + 0.2 * h1(seed + i)} cast={false} />
    ))}
  </group>
);
const Pot: React.FC<{ p: V3; c?: string }> = ({ p, c = "#b0623a" }) => (
  <group position={p}>
    <M g={cylG(0.16, 0.12, 0.28, 12)} c={c} p={[0, 0.14, 0]} />
    <M g={sphG(0.2, 10)} c="#3e7a40" p={[0, 0.38, 0]} s={[1, 0.8, 1]} />
    {[0, 1, 2, 3].map((k) => (
      <M key={k} g={sphG(0.045, 6)} c={["#f06a8a", "#f4e04a", "#ffffff", "#c88af0"][k]} p={[Math.cos(k * 1.6) * 0.14, 0.5, Math.sin(k * 1.6) * 0.14]} cast={false} />
    ))}
  </group>
);
const Bike: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p} rotation={[0, -0.25, 0]}>
    {[-0.42, 0.42].map((x) => (
      <M key={x} g={torG(0.3, 0.025)} c="#2a2a30" p={[x, 0.33, 0]} r={[0, PI / 2, 0]} />
    ))}
    <M g={boxG(0.84, 0.03, 0.03)} c="#c83a3a" p={[0, 0.5, 0]} r={[0, 0, 0.15]} />
    <M g={boxG(0.03, 0.4, 0.03)} c="#c83a3a" p={[0.3, 0.55, 0]} />
    <M g={boxG(0.03, 0.3, 0.03)} c="#c83a3a" p={[-0.3, 0.6, 0]} />
    <M g={boxG(0.18, 0.04, 0.05)} c="#2a2a30" p={[-0.32, 0.78, 0]} />
    <M g={boxG(0.05, 0.04, 0.4)} c="#2a2a30" p={[0.42, 0.8, 0]} />
  </group>
);
const Cat: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p} rotation={[0, -2.4, 0]}>
    <M g={sphG(0.17, 12)} c="#3a3440" s={[0.9, 0.85, 1.5]} p={[0, 0.17, 0]} />
    <M g={sphG(0.11, 12)} c="#3a3440" p={[0, 0.3, 0.22]} />
    {[-1, 1].map((sd) => (
      <group key={sd}>
        <M g={coneG(0.04, 0.09, 4)} c="#3a3440" p={[sd * 0.07, 0.42, 0.22]} />
        <mesh geometry={sphG(0.02, 6)} position={[sd * 0.05, 0.31, 0.32]} material={coreMat("#c8f060", 1.6)} userData={{ outline: false }} />
      </group>
    ))}
    <M g={cylG(0.025, 0.02, 0.5, 6)} c="#3a3440" p={[0, 0.3 + 0.03 * Math.sin(t * 1.5), -0.3]} r={[0.8 + 0.2 * Math.sin(t * 1.5), 0, 0]} />
  </group>
);
export const Fireflies: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {Array.from({ length: 12 }, (_, i) => {
      const x = (h1(i * 3) - 0.5) * 10 + 0.5 * Math.sin(t * 0.7 + i);
      const z = 3 + h1(i * 3 + 1) * 3.2 + 0.4 * Math.cos(t * 0.6 + i);
      const y = 0.5 + h1(i * 3 + 2) * 1.1 + 0.15 * Math.sin(t * 1.3 + i * 2);
      const on = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7);
      return <mesh key={i} geometry={sphG(0.025, 6)} position={[x, y, z]} material={coreMat("#e8ff80", 0.5 + 2.2 * on, 0.9)} userData={{ outline: false }} />;
    })}
    {Array.from({ length: 5 }, (_, i) => {
      const a = t * (1.6 + 0.2 * i) + i * 1.3;
      const r = 0.25 + 0.08 * i;
      return <mesh key={`m${i}`} geometry={boxG(0.05, 0.012, 0.03)} position={[0.9 + Math.cos(a) * r, 2.0 + 0.2 * Math.sin(a * 2 + i), 0.45 + Math.sin(a) * r]} rotation={[0, a, 0.5 * Math.sin(t * 30 + i)]} material={coreMat("#f0e8d0", 1.2)} userData={{ outline: false }} />;
    })}
  </group>
);
// ------------------------------------------------------------------ the doormat (the key object): coir top with WELCOME, a dark rubber back
export const Mat: React.FC<{ angle: number; y: number }> = ({ angle, y }) => (
  <group position={[MAT_C[0], y, MAT_C[2]]} rotation={[angle, 0, 0]}>
    <M g={boxG(0.95, 0.03, 0.6)} c="#8a6a3a" tex="fabric" p={[0, 0, 0]} />
    <M g={boxG(0.97, 0.02, 0.62)} c="#2a2220" p={[0, -0.025, 0]} />
    <Label text="WELCOME" p={[0, 0.037, 0]} r={[-PI / 2, 0, 0]} w={0.8} h={0.2} fg="#f4ead0" bg="none" />
    <Label text="MAPLE MATS CO." p={[0, -0.057, 0]} r={[PI / 2, 0, 0]} w={0.6} h={0.12} fg="#8a8a90" bg="none" />
    {[-0.34, -0.17, 0, 0.17, 0.34].map((x) => (
      <M key={x} g={boxG(0.012, 0.004, 0.5)} c="#6a4a24" p={[x, 0.0185, 0]} cast={false} />
    ))}
  </group>
);
export const Puff: React.FC<{ u: number }> = ({ u }) => (
  <group position={[0, DECK_Y + 0.05, 0.65]}>
    {u > 0 && u < 1
      ? Array.from({ length: 24 }, (_, i) => {
          const a = i * 0.9;
          return <mesh key={i} geometry={sphG(0.012, 5)} position={[Math.cos(a) * (0.3 + 0.2 * (i % 3)) * u, 0.05 + 0.3 * u * (0.5 + (0.5 * (i % 4)) / 3), Math.sin(a) * 0.3 * u]} scale={0.8 + 0.6 * u} material={coreMat("#c8bfae", 0.9, 0.7 * (1 - u))} userData={{ outline: false }} />;
        })
      : null}
  </group>
);
// ------------------------------------------------------------------ the security camera the neighbours mount on the right porch post
export const SECCAM: V3 = [2.18, 2.2, 2.1];
export const SecCam: React.FC = () => (
  <group position={SECCAM} rotation={[0.5, -2.6, 0]}>
    <M g={boxG(0.06, 0.06, 0.12)} c="#d8d8dc" p={[0, 0, -0.06]} />
    <M g={boxG(0.12, 0.11, 0.2)} c="#e8e8ec" p={[0, -0.04, 0.08]} />
    <M g={cylG(0.035, 0.035, 0.03, 12)} c="#1a1a20" p={[0, -0.04, 0.19]} r={[Math.PI / 2, 0, 0]} />
    <mesh geometry={sphG(0.012, 6)} position={[0.04, 0.0, 0.19]} material={coreMat("#ff3030", 2.2)} userData={{ outline: false }} />
  </group>
);
// ------------------------------------------------------------------ the house across the street, hollow: a front wall with a real window hole, a kitchen behind it
export const ALV_WIN: V3 = [-1.8, 1.7, 17];
const AcrossHollow: React.FC<{ night: boolean }> = ({ night }) => {
  const W0 = -4, W1 = 4, Z0 = 17, D = 5, H = 3.4, hx0 = -2.35, hx1 = -1.25, hy0 = 1.05, hy1 = 2.1, T = 0.15;
  return (
    <group>
      {/* front wall around the window hole */}
      <M g={boxG(hx0 - W0, H, T)} c="#b0a090" tex="planks" p={[(W0 + hx0) / 2, H / 2, Z0 + T / 2]} />
      <M g={boxG(W1 - hx1, H, T)} c="#b0a090" tex="planks" p={[(hx1 + W1) / 2, H / 2, Z0 + T / 2]} />
      <M g={boxG(hx1 - hx0, hy0, T)} c="#b0a090" tex="planks" p={[(hx0 + hx1) / 2, hy0 / 2, Z0 + T / 2]} />
      <M g={boxG(hx1 - hx0, H - hy1, T)} c="#b0a090" tex="planks" p={[(hx0 + hx1) / 2, (hy1 + H) / 2, Z0 + T / 2]} />
      {/* window frame (outside) and sash bars; glass left open so the lens sees through */}
      {[[(hx0 + hx1) / 2, hy1 + 0.05, hx1 - hx0 + 0.2, 0.1], [(hx0 + hx1) / 2, hy0 - 0.05, hx1 - hx0 + 0.2, 0.1], [hx0 - 0.05, (hy0 + hy1) / 2, 0.1, hy1 - hy0], [hx1 + 0.05, (hy0 + hy1) / 2, 0.1, hy1 - hy0]].map(([x, y, w, h], i) => (
        <M key={i} g={boxG(w, h, 0.1)} c="#e8e0d0" p={[x, y, Z0 - 0.04]} cast={false} />
      ))}
      <M g={boxG(hx1 - hx0 + 0.3, 0.06, 0.3)} c="#e8e0d0" p={[(hx0 + hx1) / 2, hy0 - 0.03, Z0 + 0.2]} />
      {/* side walls, back wall, roof, floor */}
      <M g={boxG(T, H, D)} c="#b0a090" tex="planks" p={[W0 + T / 2, H / 2, Z0 + D / 2]} />
      <M g={boxG(T, H, D)} c="#b0a090" tex="planks" p={[W1 - T / 2, H / 2, Z0 + D / 2]} />
      <M g={boxG(W1 - W0, H, T)} c="#b0a090" tex="planks" p={[0, H / 2, Z0 + D - T / 2]} />
      <M g={coneG(6.2, 2.2, 4)} c="#4a3a3a" tex="shingles" p={[0, 4.5, 19.5]} r={[0, Math.PI / 4, 0]} s={[1.25, 1, 0.8]} />
      <M g={boxG(W1 - W0, 0.1, D)} c="#3a3a40" p={[0, H + 0.05, Z0 + D / 2]} />
      <M g={boxG(W1 - W0 - 0.3, 0.04, D - 0.3)} c="#c8a878" tex="planks" p={[0, 0.02, Z0 + D / 2]} cast={false} />
      {/* the kitchen inside: warm wallpaper strip, counter under the window, sink, plants on the sill, a fridge, a table, a door out */}
      <M g={boxG(W1 - W0 - 0.32, 1.2, 0.04)} c="#e8c890" p={[0, 2.6, Z0 + D - T - 0.03]} cast={false} />
      <M g={boxG(2.4, 0.9, 0.6)} c="#6a8a9a" tex="wood" p={[-1.8, 0.45, Z0 + T + 0.32]} />
      <M g={boxG(2.5, 0.05, 0.65)} c="#e8e4dc" p={[-1.8, 0.93, Z0 + T + 0.32]} />
      <M g={boxG(0.5, 0.06, 0.4)} c="#a8acb4" p={[-1.8, 0.94, Z0 + T + 0.32]} />
      <M g={cylG(0.02, 0.02, 0.3, 8)} c="#c8ccd4" p={[-1.8, 1.1, Z0 + T + 0.12]} />
      {[-2.25, -1.35].map((x, k) => (
        <group key={x} position={[x, hy0 + 0.02, Z0 + T + 0.1]}>
          <M g={cylG(0.07, 0.05, 0.12, 10)} c={k ? "#c8603a" : "#4a7a8a"} p={[0, 0.06, 0]} />
          <M g={sphG(0.1, 8)} c="#3e7a40" p={[0, 0.18, 0]} />
        </group>
      ))}
      <M g={boxG(0.8, 1.9, 0.7)} c="#e8e8ec" p={[2.9, 0.95, Z0 + 3.9]} />
      <M g={boxG(0.04, 0.5, 0.04)} c="#a8acb4" p={[2.48, 1.25, Z0 + 3.55]} />
      <M g={boxG(1.2, 0.06, 0.8)} c="#8a5a3a" tex="wood" p={[0.4, 0.75, Z0 + 2.6]} />
      <M g={cylG(0.05, 0.05, 0.72, 8)} c="#6a4a2a" p={[0.4, 0.36, Z0 + 2.6]} />
      <M g={boxG(1.0, 2.1, 0.06)} c="#6a3a2a" tex="wood" p={[1.5, 1.05, Z0 + 0.12]} />
      {/* curtains inside the window, a clock, a calendar, a hanging lamp */}
      <M g={boxG(0.32, 1.1, 0.03)} c="#a04a3a" p={[hx0 + 0.08, (hy0 + hy1) / 2 + 0.05, Z0 + T + 0.04]} cast={false} />
      <M g={boxG(0.32, 1.1, 0.03)} c="#a04a3a" p={[hx1 - 0.08, (hy0 + hy1) / 2 + 0.05, Z0 + T + 0.04]} cast={false} />
      <M g={cylG(0.17, 0.17, 0.03, 20)} c="#f4ead6" p={[0.5, 2.5, Z0 + D - T - 0.08]} r={[Math.PI / 2, 0, 0]} />
      <Label text="NOV" p={[-0.6, 2.2, Z0 + D - T - 0.08]} r={[0, Math.PI, 0]} w={0.34} h={0.4} fg="#c83a3a" bg="#f4ead6" />
      <mesh geometry={sphG(0.14, 10)} position={[-1.0, 2.8, Z0 + 1.5]} material={coreMat("#ffe0a0", night ? 2.2 : 1.3)} userData={{ outline: false }} />
      <pointLight position={[-1.0, 2.6, Z0 + 1.5]} color="#ffd090" intensity={night ? 5 : 3} distance={7} decay={1.6} />
      <M g={boxG(1.0, 2.1, 0.08)} c="#6a3a2a" tex="wood" p={[1.5, 1.05, 16.96]} />
      {night ? (
        <group position={[-1.8, 1.55, Z0 + 0.6]}>
          <M g={sphG(0.13, 12)} c="#1a1010" s={[1, 1.1, 0.25]} cast={false} />
          <M g={boxG(0.46, 0.26, 0.03)} c="#1a1010" p={[0, -0.29, 0]} cast={false} />
        </group>
      ) : null}
    </group>
  );
};
// ------------------------------------------------------------------ the whole street
export type StreetOpts = { night?: boolean; hollowAcross?: boolean; secCam?: boolean; lampFlare?: number; allMats?: boolean };
export const Street: React.FC<{ t: number } & StreetOpts> = ({ t, night = true, hollowAcross = false, secCam = false, lampFlare = 0, allMats = false }) => (
  <group>
    {/* ground, then the road / sidewalk / path each 1.5-3.5 cm above it (no coplanar faces) */}
    <M g={cylG(60, 60, 0.1, 40)} c="#3e6a3e" tex="grass" p={[0, -0.05, 0]} cast={false} />
    <M g={boxG(60, 0.02, 3.6)} c="#34343c" p={[0, 0.02, 11.2]} cast={false} />
    {[-6, -3, 0, 3, 6].map((x) => (
      <M key={x} g={boxG(1.2, 0.01, 0.14)} c="#e8d890" p={[x, 0.032, 11.2]} cast={false} />
    ))}
    <M g={boxG(60, 0.035, 1.1)} c="#8e8a86" tex="stone" p={[0, 0.035, 8.95]} cast={false} />
    <M g={boxG(1.1, 0.03, FENCE_Z + 0.2 - 2.9)} c="#7e7668" tex="rock" p={[0, 0.03, (FENCE_Z + 2.9) / 2]} cast={false} />
    {Array.from({ length: 26 }, (_, i) => (
      <M key={i} g={sphG(0.045 + 0.03 * h1(i), 6)} c={i % 2 ? "#9a9288" : "#6a645c"} p={[(h1(i + 4) - 0.5) * 1.0, 0.04, 3 + h1(i + 9) * 3.1]} cast={false} />
    ))}
    {/* the house: siding, roof, chimney, door, windows, number */}
    <M g={boxG(7, 3.2, 5)} c="#c8c0a8" tex="planks" p={[0, 1.6, -2.5]} />
    <M g={coneG(5.6, 2.1, 4)} c="#4a3a3a" tex="shingles" p={[0, 4.25, -2.5]} r={[0, PI / 4, 0]} s={[1.25, 1, 0.95]} />
    <M g={boxG(0.7, 1.8, 0.7)} c="#8a5a4a" tex="brick" p={[2.4, 4.6, -3.2]} />
    <M g={boxG(1.04, 2.14, 0.08)} c="#4a2e22" tex="wood" p={[0, 1.37, 0.04]} />
    <M g={boxG(1.2, 0.1, 0.16)} c="#e8e0d0" p={[0, 2.5, 0.08]} cast={false} />
    {[-0.6, 0.6].map((x) => (
      <M key={x} g={boxG(0.1, 2.3, 0.16)} c="#e8e0d0" p={[x, 1.3, 0.08]} cast={false} />
    ))}
    <M g={sphG(0.045, 8)} c="#d8b040" p={[0.38, 1.1, 0.13]} cast={false} />
    <Label text="12" p={[0, 2.25, 0.1]} w={0.32} h={0.22} fg="#f4ead0" bg="#3a2a22" />
    <Window p={[-2.3, 1.7, 0.02]} curtain lit={night} />
    <Window p={[2.3, 1.7, 0.02]} lit={false} />
    <Window p={[-2.3, 1.7, -5.05]} dz={-1} lit={night} />
    {/* porch: deck, steps, roof, posts, rails, lamp, chair + table, bike, plants */}
    <M g={boxG(5, 0.12, 2.2)} c="#9a7a56" tex="planks" p={[0, 0.24, 1.1]} />
    <M g={boxG(1.8, 0.1, 0.4)} c="#8e8070" tex="stone" p={[0, 0.15, 2.4]} />
    <M g={boxG(1.8, 0.1, 0.4)} c="#8e8070" tex="stone" p={[0, 0.05, 2.78]} />
    <M g={boxG(5.4, 0.14, 2.6)} c="#4a3a3a" tex="shingles" p={[0, 2.45, 1.3]} />
    {[-2.3, 2.3].map((x) => (
      <M key={x} g={boxG(0.16, 2.2, 0.16)} c="#e8e0d0" p={[x, 1.2, 2.1]} />
    ))}
    {[-1.06, 1.06].map((x) => (
      <group key={x}>
        <M g={boxG(0.1, 0.07, 2.0)} c="#e8e0d0" p={[x, 1.04, 1.2]} />
        {Array.from({ length: 6 }, (_, k) => (
          <M key={k} g={boxG(0.05, 0.7, 0.05)} c="#e8e0d0" p={[x, 0.68, 0.3 + k * 0.38]} />
        ))}
      </group>
    ))}
    <group position={[0.95, 1.95, 0.12]}>
      <M g={boxG(0.16, 0.26, 0.1)} c="#2a2a30" p={[0, 0, 0]} />
      <mesh geometry={boxG(0.11, 0.2, 0.06)} position={[0, 0, 0.07]} material={lampFlare > 0.01 ? glowMat("#fffbf0", 1.6 + 1.0 * lampFlare) : coreMat("#ffd890", night ? 2.4 : 1.2)} userData={{ outline: false }} />
      {night || lampFlare > 0 ? <pointLight position={[0, 0, 0.6]} color="#ffc070" intensity={(night ? 9 : 0) + 14 * lampFlare} distance={9 + 8 * lampFlare} decay={1.6} /> : null}
      {lampFlare > 0.01 ? (
        <>
          {/* an opaque toon glow (transparent meshes do not survive the ink pass): a bright halo disc and eight rays,
              9 cm off the wall, scaled in with the flare */}
          <group position={[0, 0, -0.03]} scale={[lampFlare, lampFlare, 1]}>
            <mesh geometry={cylG(0.27, 0.27, 0.01, 28)} rotation={[Math.PI / 2, 0, 0]} material={glowMat("#ff9a1a", 1.15)} userData={{ outline: false }} />
            {Array.from({ length: 8 }, (_, k) => (
              <group key={k} rotation={[0, 0, (k * Math.PI) / 4 + 0.2]}>
                <mesh geometry={boxG(0.05, 0.2, 0.01)} position={[0, 0.42, 0]} material={glowMat("#ff7a0a", 1.1)} userData={{ outline: false }} />
              </group>
            ))}
          </group>
        </>
      ) : null}
      {lampFlare > 0.01 ? <mesh geometry={coneG(1.4, 9, 20)} position={[0, 0, 4.6]} rotation={[-Math.PI / 2, 0, 0]} material={coreMat("#ffe8b0", 1.2, 0.12 * lampFlare)} userData={{ outline: false }} /> : null}
    </group>
    <group position={[-1.85, DECK_Y, 0.95]} rotation={[0, 0.5, 0]}>
      <M g={boxG(0.6, 0.06, 0.55)} c="#7a5a3a" tex="wood" p={[0, 0.42, 0]} />
      <M g={boxG(0.6, 0.55, 0.06)} c="#7a5a3a" tex="wood" p={[0, 0.72, -0.28]} />
      {[[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].map(([x, z], i) => (
        <M key={i} g={boxG(0.05, 0.4, 0.05)} c="#6a4a2a" p={[x, 0.2, z]} />
      ))}
    </group>
    <group position={[-1.75, DECK_Y, 0.55]}>
      <M g={cylG(0.18, 0.16, 0.03, 12)} c="#7a5a3a" p={[0, 0.5, 0]} />
      <M g={cylG(0.03, 0.03, 0.5, 6)} c="#6a4a2a" p={[0, 0.25, 0]} />
      <M g={cylG(0.05, 0.04, 0.07, 10)} c="#e8e0d0" p={[0, 0.56, 0]} />
    </group>
    <Bike p={[1.85, DECK_Y, 0.45]} />
    <Pot p={[-0.8, DECK_Y, 0.4]} />
    <Pot p={[0.85, DECK_Y, 0.35]} c="#4a7a8a" />
    <Pot p={[2.05, DECK_Y, 1.05]} />
    <Pot p={[-2.0, DECK_Y, 1.9]} c="#c8903a" />
    {/* yard: flower beds, hedges, tufts, flowers */}
    {[-1, 1].map((sd) => (
      <group key={sd}>
        <M g={boxG(2.2, 0.2, 0.7)} c="#5a4030" tex="rock" p={[sd * 2.4, 0.1, 3.9]} />
        {Array.from({ length: 10 }, (_, k) => (
          <group key={k} position={[sd * 2.4 + (k - 4.5) * 0.2, 0.2, 3.9 + 0.2 * Math.sin(k * 2)]}>
            <M g={cylG(0.012, 0.012, 0.3, 4)} c="#3e7a3a" p={[0, 0.15, 0]} cast={false} />
            <M g={sphG(0.06, 6)} c={["#f06a8a", "#f4e04a", "#ffffff", "#c88af0", "#f08a3a"][k % 5]} p={[0, 0.33, 0]} cast={false} />
          </group>
        ))}
        <M g={boxG(1.5, 0.9, 1.2)} c="#2e5a36" tex="grass" p={[sd * 2.65, 0.45, 4.0]} />
      </group>
    ))}
    {Array.from({ length: 70 }, (_, i) => {
      const x = (h1(i * 5) - 0.5) * 16;
      const z = 3.2 + h1(i * 5 + 1) * 3.4;
      if (Math.abs(x) < 0.7 || Math.hypot(Math.abs(x) - 2.4, z - 3.95) < 1.3) return null;
      return h1(i * 5 + 2) > 0.3 ? <Tuft key={i} p={[x, 0.02, z]} s={0.8} seed={i} /> : (
        <group key={i} position={[x, 0.02, z]}>
          <M g={cylG(0.008, 0.008, 0.22, 4)} c="#4a7a3a" p={[0, 0.11, 0]} cast={false} />
          <M g={sphG(0.04, 6)} c={["#f4e04a", "#ffffff", "#e8789a"][i % 3]} p={[0, 0.23, 0]} cast={false} />
        </group>
      );
    })}
    {Array.from({ length: 12 }, (_, i) => (
      <M key={i} g={boxG(0.07, 0.01, 0.05)} c={["#a8782e", "#8a5a2a", "#6a7a2e"][i % 3]} p={[(h1(i + 40) - 0.5) * 10, 0.025, 4 + h1(i + 50) * 4]} r={[0, h1(i) * 6, 0]} cast={false} />
    ))}
    {/* fence with a gate gap, the mailbox, the street lamp, the cat */}
    {[[-8, -0.95], [0.95, 8]].map(([a, b], s) => (
      <group key={s}>
        <M g={boxG(b - a, 0.05, 0.04)} c="#e8e0d0" p={[(a + b) / 2, 0.7, FENCE_Z]} />
        <M g={boxG(b - a, 0.05, 0.04)} c="#e8e0d0" p={[(a + b) / 2, 0.3, FENCE_Z]} />
        {Array.from({ length: Math.round((b - a) / 0.22) }, (_, k) => (
          <M key={k} g={boxG(0.08, 0.9, 0.03)} c="#f2ece0" p={[a + 0.11 + k * 0.22, 0.45, FENCE_Z + 0.04]} />
        ))}
      </group>
    ))}
    <group position={[-2.2, 0, 5.25]}>
      <M g={boxG(0.1, 1.0, 0.1)} c="#5a4a3a" tex="wood" p={[0, 0.5, 0]} />
      <M g={boxG(0.3, 0.24, 0.5)} c="#2e4a8a" p={[0, 1.1, 0]} />
      <M g={cylG(0.15, 0.15, 0.5, 10, false, 0, PI)} c="#2e4a8a" p={[0, 1.22, 0]} r={[PI / 2, 0, PI / 2]} />
      <Label text="12" p={[0.16, 1.1, 0.05]} r={[0, PI / 2, 0]} w={0.2} h={0.14} fg="#f4ead0" bg="none" />
    </group>
    <group position={[3.5, 0, 8.0]}>
      <M g={cylG(0.05, 0.07, 3.5, 8)} c="#2e3440" p={[0, 1.75, 0]} />
      <M g={boxG(0.5, 0.06, 0.06)} c="#2e3440" p={[-0.25, 3.5, 0]} />
      <mesh geometry={sphG(0.14, 10)} position={[-0.5, 3.42, 0]} material={coreMat(night ? "#ffe2a0" : "#d8d4c8", night ? 2.6 : 0.7)} userData={{ outline: false }} />
      {night ? <pointLight position={[-0.5, 3.3, 0]} color="#ffd890" intensity={7} distance={11} decay={1.5} /> : null}
    </group>
    <Cat p={[3.2, 0.92, FENCE_Z]} t={t} />
    {/* neighbours: left, right (lit windows), across the street (a silhouette watches), trees, far hills */}
    {[-1, 1].map((sd) => (
      <group key={sd} position={[sd * 8.75, 0, 0]}>
        <M g={boxG(7.5, 3, 4.5)} c={sd < 0 ? "#a8b0c0" : "#c0a898"} tex="planks" p={[0, 1.5, -1.75]} />
        <M g={coneG(5.4, 1.9, 4)} c="#3e3440" tex="shingles" p={[0, 3.9, -1.75]} r={[0, PI / 4, 0]} s={[1.2, 1, 0.8]} />
        <Window p={[-1.8 * sd, 1.6, 0.52]} lit={night} />
        <Window p={[1.6 * sd, 1.6, 0.52]} lit={night && sd < 0} />
        {allMats ? <group position={[0, 0, 1.1]}><Mat angle={-Math.PI} y={0.034} /></group> : null}
      </group>
    ))}
    {hollowAcross ? <AcrossHollow night={night} /> : (
    <group position={[0, 0, 0]}>
      <M g={boxG(8, 3.4, 5)} c="#b0a090" tex="planks" p={[0, 1.7, 19.5]} />
      <M g={coneG(6.2, 2.2, 4)} c="#4a3a3a" tex="shingles" p={[0, 4.5, 19.5]} r={[0, PI / 4, 0]} s={[1.25, 1, 0.8]} />
      <M g={boxG(1.0, 2.1, 0.08)} c="#6a3a2a" tex="wood" p={[1.5, 1.05, 16.96]} />
      <Window p={[-1.8, 1.7, 17]} dz={-1} curtain watcher={night} lit={night} />
      <Window p={[-0.3, 1.7, 17]} dz={-1} lit={false} />
    </group>
    )}
    <Tree p={[-7, 0, 3]} seed={1} s={1.1} />
    <Tree p={[7, 0, 3.4]} seed={5} />
    <Tree p={[-4.8, 0, 7.8]} seed={9} s={0.9} />
    {[[-40, -42, 14], [-12, -46, 18], [22, -44, 16], [50, -40, 12]].map(([x, z, r], i) => (
      <M key={i} g={coneG(r, r * 0.9, 12)} c="#1a2a3a" p={[x, r * 0.35, z]} cast={false} recv={false} />
    ))}
    {night ? <Fireflies t={t} /> : null}
    {secCam ? <SecCam /> : null}
  </group>
);
