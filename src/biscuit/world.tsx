// The Biscuit short's world: one small town built around a loop. A park block in the middle (grass, trees, a
// gazebo, benches), a road ring, a sidewalk ring (Biscuit's walk), and houses facing the loop on all four sides, each
// with a porch, a door, windows, a picket fence and gate, a mailbox on a post, a yard tree and bushes. Lampposts along
// the sidewalk carry the "Lost Dog" posters (and fences and trees carry more). A blue collection mailbox stands on
// the north sidewalk. Biscuit: an old golden retriever built from code (grey muzzle, cloudy eyes, floppy ears, a
// feathered tail) with a walk cycle, a sit, a head bonk, ear perks and a wag. Every motion is a pure function of t.
import React from "react";
import * as THREE from "three";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

const PI = Math.PI;
export const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ the loop
/** the park block: |x| < PX, |z| < PZ; the road ring out to RX/RZ; the sidewalk (the route) out to SX/SZ */
export const PX = 14;
export const PZ = 7;
export const RX = 20;
export const RZ = 13;
export const SX = 22.4;
export const SZ = 15.4;
/** the route's centerline (the middle of the sidewalk) */
export const CX = (RX + SX) / 2;
export const CZ = (RZ + SZ) / 2;
/** Lily's house: on the north side, its gate on the sidewalk's outer edge */
export const LILY_GATE: V3 = [-3.5, 0, SZ + 0.6];
/** the blue collection mailbox, standing on the north sidewalk */
export const MAILBOX: V3 = [4.3, 0, CZ + 0.15];
/** a point on the loop (s in [0, 1), counterclockwise seen from above, starting at the NE corner, heading -x) */
export const loopAt = (s: number): V3 => {
  const L = 2 * (2 * CX) + 2 * (2 * CZ);
  let d = (((s % 1) + 1) % 1) * L;
  if (d < 2 * CX) return [CX - d, 0, CZ];
  d -= 2 * CX;
  if (d < 2 * CZ) return [-CX, 0, CZ - d];
  d -= 2 * CZ;
  if (d < 2 * CX) return [-CX + d, 0, -CZ];
  d -= 2 * CX;
  return [CX, 0, -CZ + d];
};

// ------------------------------------------------------------------ the poster
const posterMats = new Map<string, THREE.Material>();
const drawDog = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  // a golden dog photo: soft background, head and ears, cloudy eyes, a smile
  g.fillStyle = "#cfe0d0";
  g.fillRect(x - 110 * s, y - 85 * s, 220 * s, 170 * s);
  g.fillStyle = "#d8a050";
  g.beginPath();
  g.ellipse(x, y + 10 * s, 70 * s, 62 * s, 0, 0, PI * 2);
  g.fill();
  g.fillStyle = "#b8803a";
  g.beginPath();
  g.ellipse(x - 62 * s, y + 18 * s, 26 * s, 48 * s, 0.25, 0, PI * 2);
  g.ellipse(x + 62 * s, y + 18 * s, 26 * s, 48 * s, -0.25, 0, PI * 2);
  g.fill();
  g.fillStyle = "#efe2c8";
  g.beginPath();
  g.ellipse(x, y + 42 * s, 38 * s, 28 * s, 0, 0, PI * 2);
  g.fill();
  g.fillStyle = "#1a1416";
  g.beginPath();
  g.ellipse(x, y + 26 * s, 13 * s, 9 * s, 0, 0, PI * 2);
  g.fill();
  g.fillStyle = "#e8eef4";
  g.beginPath();
  g.arc(x - 24 * s, y - 8 * s, 10 * s, 0, PI * 2);
  g.arc(x + 24 * s, y - 8 * s, 10 * s, 0, PI * 2);
  g.fill();
  g.fillStyle = "#e86a7a";
  g.beginPath();
  g.ellipse(x, y + 58 * s, 10 * s, 12 * s, 0, 0, PI);
  g.fill();
};
export const posterMat = () => {
  let m = posterMats.get("p");
  if (!m) {
    const tex = canvasTex("lostdog", 512, 680, (g, w, h) => {
      g.fillStyle = "#f6f2e8";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#d8282e";
      g.font = "900 104px Poppins, Arial";
      g.textAlign = "center";
      g.fillText("LOST DOG", w / 2, 112);
      drawDog(g, w / 2, 290, 1.4);
      g.fillStyle = "#1a1416";
      g.font = "900 92px Poppins, Arial";
      g.fillText("BISCUIT", w / 2, 520);
      g.font = "700 34px Poppins, Arial";
      g.fillText("PLEASE SAY HIS NAME", w / 2, 576);
      g.font = "600 30px Poppins, Arial";
      g.fillStyle = "#4a4448";
      g.fillText("call  555-0142", w / 2, 628);
      // tear-off tabs
      for (let i = 0; i < 8; i++) {
        g.strokeStyle = "#b8b0a4";
        g.beginPath();
        g.moveTo((i * w) / 8, 650);
        g.lineTo((i * w) / 8, h);
        g.stroke();
      }
    });
    m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color("#e6e0d4"), toneMapped: false });
    posterMats.set("p", m);
  }
  return m;
};
/** a poster: 0.34 × 0.45 m, taped, slightly curled */
export const Poster: React.FC<{ p: V3; ry: number; tilt?: number; s?: number }> = ({ p, ry, tilt = 0, s = 1 }) => (
  <group position={p} rotation={[0, ry, tilt]} scale={s}>
    <mesh material={posterMat()} position={[0, 0, 0.006]}>
      <planeGeometry args={[0.34, 0.45]} />
    </mesh>
    <M g={boxG(0.34, 0.45, 0.004)} c="#ece6d8" tex="paper" p={[0, 0, 0.002]} cast={false} />
    {[-1, 1].map((k) => (
      <M key={k} g={boxG(0.07, 0.025, 0.002)} c="#e8e4d0" p={[k * 0.15, 0.215, 0.009]} r={[0, 0, k * 0.4]} cast={false} />
    ))}
  </group>
);

// ------------------------------------------------------------------ houses
const HOUSE_COLORS = ["#d8c8a8", "#a8c8d8", "#e8b8a0", "#c8d8b0", "#f0e0b0", "#c0b0d0", "#e8d0d8", "#b8d0c8"];
const ROOF_COLORS = ["#6a3a32", "#3a4a5a", "#5a4a3a", "#7a3a3a", "#4a5a4a"];
export const doorOf = (seed: number) => (h1(seed + 2) - 0.5) * 1.6;
/** a house facing +z in its local frame; its front fence line is at local z = 0 */
const House: React.FC<{ seed: number; posterOnGate?: boolean; lily?: boolean }> = ({ seed, posterOnGate, lily }) => {
  const c = HOUSE_COLORS[seed % HOUSE_COLORS.length];
  const rc = ROOF_COLORS[(seed * 3) % ROOF_COLORS.length];
  const W = 6.2 + h1(seed) * 1.4;
  const D = 5.5;
  const Hh = 3.0 + h1(seed + 1) * 0.6;
  const zc = -3.4 - D / 2;
  const door = lily ? 0 : doorOf(seed);
  return (
    <group>
      {/* the house: walls, siding, a gable roof, a chimney */}
      <M g={boxG(W, Hh, D)} c={c} tex="planks" ts={0.6} p={[0, Hh / 2 + 0.25, zc]} />
      <M g={boxG(W + 0.2, 0.25, D + 0.2)} c="#8a8278" tex="stone" p={[0, 0.125, zc]} />
      {[-1, 1].map((sd) => (
        <M key={sd} g={boxG(W + 0.5, 0.14, D / 2 + 0.9)} c={rc} tex="shingles" p={[0, Hh + 0.25 + 0.95, zc + sd * (D / 4 + 0.15)]} r={[sd * -0.62, 0, 0]} />
      ))}
      <M g={boxG(0.6, 1.6, 0.6)} c="#8a4a3a" tex="brick" p={[W / 2 - 1.0, Hh + 1.6, zc - 0.8]} />
      {/* gable ends */}
      {[-1, 1].map((sd) => (
        <mesh key={`g${sd}`} position={[sd * (W / 2 + 0.001), Hh + 0.25, zc]} rotation={[0, (sd * PI) / 2, 0]}>
          <shapeGeometry args={[(() => { const sh = new THREE.Shape(); sh.moveTo(-D / 2, 0); sh.lineTo(D / 2, 0); sh.lineTo(0, 1.9); sh.closePath(); return sh; })()]} />
          <meshToonMaterial color={c} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* the front: door, windows with shutters, porch, steps, porch light */}
      <M g={boxG(1.0, 2.1, 0.08)} c={lily ? "#d8382e" : ["#3a5a7a", "#7a3a2a", "#2a4a3a", "#f0e8d8"][seed % 4]} tex="planks" p={[door, 1.3, zc + D / 2 + 0.04]} />
      <M g={sphG(0.04, 8)} c="#c8a040" tex="metal" p={[door + 0.35, 1.3, zc + D / 2 + 0.1]} />
      {[-1, 1].map((sd) => {
        const x = door + sd * 1.9;
        if (Math.abs(x) > W / 2 - 0.6) return null;
        return (
          <group key={`w${sd}`} position={[x, 1.7, zc + D / 2 + 0.04]}>
            <mesh geometry={boxG(0.9, 1.0, 0.02)} material={coreMat("#bcd8ec", 0.95)} />
            <M g={boxG(1.0, 0.07, 0.06)} c="#f4f0e8" p={[0, 0.52, 0.02]} />
            <M g={boxG(1.0, 0.07, 0.06)} c="#f4f0e8" p={[0, -0.52, 0.02]} />
            <M g={boxG(0.05, 1.0, 0.05)} c="#f4f0e8" p={[0, 0, 0.02]} />
            {[-1, 1].map((k) => (
              <M key={k} g={boxG(0.3, 1.04, 0.04)} c={rc} tex="planks" p={[k * 0.65, 0, 0.02]} />
            ))}
            <M g={boxG(1.0, 0.18, 0.2)} c="#6a8a3a" p={[0, -0.6, 0.1]} />
            {[-0.3, 0, 0.3].map((k) => (
              <M key={k} g={sphG(0.08, 8)} c={["#e86a7a", "#f4c430", "#ffffff"][Math.abs(Math.round(k * 10)) % 3]} p={[k, -0.48, 0.14]} />
            ))}
          </group>
        );
      })}
      <M g={boxG(3.0, 0.25, 1.6)} c="#a89078" tex="planks" p={[door, 0.38, zc + D / 2 + 0.8]} />
      {[-1.4, 1.4].map((k) => (
        <M key={k} g={boxG(0.12, 2.3, 0.12)} c="#f4f0e8" tex="wood" p={[door + k, 1.6, zc + D / 2 + 1.5]} />
      ))}
      <M g={boxG(3.3, 0.12, 1.9)} c={rc} tex="shingles" p={[door, 2.78, zc + D / 2 + 0.85]} r={[0.12, 0, 0]} />
      <M g={boxG(1.2, 0.25, 0.5)} c="#a89078" tex="planks" p={[door, 0.12, zc + D / 2 + 1.85]} />
      <mesh geometry={sphG(0.08, 8)} material={coreMat("#ffe8b0", 0.9)} position={[door + 0.75, 2.2, zc + D / 2 + 0.12]} />
      {/* the front walk, the yard, a tree, bushes */}
      <M g={boxG(1.0, 0.03, 3.3)} c="#c8c0b0" tex="stone" p={[door, 0.02, -1.65]} cast={false} />
      <group position={[door > 0 ? -W / 2 + 1.0 : W / 2 - 1.0, 0, -1.6]}>
        <M g={cylG(0.14, 0.2, 2.2, 8)} c="#6a4a30" tex="wood" p={[0, 1.1, 0]} />
        {[0, 1, 2, 3].map((k) => (
          <M key={k} g={sphG(0.9 - k * 0.1, 12)} c={["#4a8a3a", "#5a9a42", "#3a7a32", "#6aa84a"][k]} p={[Math.sin(k * 1.9 + seed) * 0.45, 2.5 + k * 0.35, Math.cos(k * 1.9 + seed) * 0.4]} />
        ))}
      </group>
      {[-1, 1].map((sd) => (
        <M key={`b${sd}`} g={sphG(0.45, 10)} c="#3a7a3a" p={[door + sd * 2.2, 0.35, zc + D / 2 + 0.5]} s={[1.2, 0.8, 0.9]} />
      ))}
      {/* the picket fence along the front, a gate on the walk, a mailbox on a post */}
      {Array.from({ length: Math.floor((W + 1.4) / 0.22) }, (_, k) => {
        const x = -W / 2 - 0.7 + k * 0.22;
        if (Math.abs(x - door) < 0.55) return null;
        return <M key={`f${k}`} g={boxG(0.07, 0.85, 0.035)} c="#f4f0e8" tex="wood" p={[x, 0.43, 0]} cast={false} />;
      })}
      {[0.25, 0.65].map((y) => (
        <React.Fragment key={y}>
          <M g={boxG(door + W / 2 + 0.7 - 0.55, 0.06, 0.03)} c="#e8e4dc" tex="wood" p={[(-W / 2 - 0.7 + door - 0.55) / 2, y, -0.03]} cast={false} />
          <M g={boxG(W / 2 + 0.7 - door - 0.55, 0.06, 0.03)} c="#e8e4dc" tex="wood" p={[(W / 2 + 0.7 + door + 0.55) / 2, y, -0.03]} cast={false} />
        </React.Fragment>
      ))}
      <group position={[door + 0.85, 0, 0.25]}>
        <M g={boxG(0.08, 1.05, 0.08)} c="#6a4a30" tex="wood" p={[0, 0.52, 0]} />
        <M g={boxG(0.22, 0.24, 0.42)} c={["#3a3a40", "#2a4a7a", "#7a2a2a"][seed % 3]} tex="metal" p={[0, 1.15, 0]} />
        <M g={boxG(0.02, 0.14, 0.04)} c="#d8282e" p={[0.12, 1.2, -0.12]} />
      </group>
      {posterOnGate ? <Poster p={[door - 0.85, 0.62, 0.05]} ry={0} s={0.8} /> : null}
    </group>
  );
};
/** where the houses stand: side (n, s, e, w), offset along the side, seed */
const LOTS: { side: "n" | "s" | "e" | "w"; at: number; seed: number }[] = [
  ...[-16, -9.8, -3.5, 2.6, 9, 15.6].map((at, i) => ({ side: "n" as const, at, seed: i })),
  ...[-15, -8, -1.4, 5.2, 12, 17.6].map((at, i) => ({ side: "s" as const, at, seed: i + 7 })),
  ...[-8, -1.5, 5].map((at, i) => ({ side: "e" as const, at, seed: i + 14 })),
  ...[-7, -0.5, 6].map((at, i) => ({ side: "w" as const, at, seed: i + 18 })),
];
const lotFrame = (side: "n" | "s" | "e" | "w", at: number): { p: V3; ry: number } =>
  side === "n" ? { p: [at, 0, SZ + 0.6], ry: PI } : side === "s" ? { p: [at, 0, -SZ - 0.6], ry: 0 } : side === "e" ? { p: [SX + 0.6, 0, at], ry: -PI / 2 } : { p: [-SX - 0.6, 0, at], ry: PI / 2 };

// ------------------------------------------------------------------ lampposts and posters along the route
export const POLES: { p: V3; ry: number; side: number }[] = [];
for (let x = -18; x <= 18; x += 6) {
  // (no lamppost at x = 1.3 on the north side: that stretch is where Biscuit walks home, shot from the road)
  if (Math.abs(x + 1.3 - 1.3) > 0.01) POLES.push({ p: [x + 1.3, 0, RZ + 0.35], ry: PI, side: 0 });
  POLES.push({ p: [x - 1.1, 0, -RZ - 0.35], ry: 0, side: 2 });
}
for (let z = -9; z <= 9; z += 6) {
  POLES.push({ p: [-RX - 0.35, 0, z + 0.8], ry: PI / 2, side: 1 });
  POLES.push({ p: [RX + 0.35, 0, z - 0.8], ry: -PI / 2, side: 3 });
}
export type TownState = {
  t: number;
  /** which sides carry posters: 0 north, 1 west, 2 south, 3 east (a bitmask, or -1 for all) */
  posters: number;
  /** overhead map mode: the poster markers and the dashed route instead of the real posters */
  overhead?: { day: number; route: number };
};
const onSide = (mask: number, side: number) => mask === -1 || (mask & (1 << side)) !== 0;
export const Town: React.FC<{ s: TownState }> = ({ s }) => (
  <group>
    {/* the ground, the park block, the road ring with lane lines, the sidewalk ring with curbs */}
    <M g={boxG(140, 0.1, 120)} c="#6a9a4a" tex="grass" ts={1.6} p={[0, -0.06, 0]} cast={false} />
    <M g={boxG(RX * 2, 0.05, RZ * 2)} c="#3a3c42" tex="stone" ts={0.4} p={[0, 0.0, 0]} cast={false} />
    <M g={boxG(PX * 2, 0.12, PZ * 2)} c="#5a9a42" tex="grass" ts={1.4} p={[0, 0.04, 0]} cast={false} />
    {[
      [0, RZ - 3, RX * 2 - 6, 0.12],
      [0, -RZ + 3, RX * 2 - 6, 0.12],
    ].map(([x, z, w, d], i) => (
      <group key={i}>
        {Array.from({ length: 14 }, (_, k) => (
          <M key={k} g={boxG(1.2, 0.012, d)} c="#f0e8c0" p={[-w / 2 + 1 + k * (w / 14), 0.03, z]} cast={false} />
        ))}
      </group>
    ))}
    {[
      [0, (RZ + SZ) / 2, SX * 2, SZ - RZ],
      [0, -(RZ + SZ) / 2, SX * 2, SZ - RZ],
      [(RX + SX) / 2, 0, SX - RX, RZ * 2],
      [-(RX + SX) / 2, 0, SX - RX, RZ * 2],
    ].map(([x, z, w, d], i) => (
      <group key={`sw${i}`}>
        <M g={boxG(w, 0.14, d)} c="#c8c2b6" tex="stone" ts={0.5} p={[x, 0.07, z]} cast={false} />
      </group>
    ))}
    {/* the park: trees, a gazebo, benches, a path */}
    {Array.from({ length: 14 }, (_, k) => {
      const x = -12 + (k % 7) * 4 + h1(k) * 1.2;
      const z = k < 7 ? 4.5 : -4.5;
      return (
        <group key={`t${k}`} position={[x, 0, z + (h1(k + 4) - 0.5)]}>
          <M g={cylG(0.18, 0.26, 2.6, 8)} c="#6a4a30" tex="wood" p={[0, 1.3, 0]} />
          {[0, 1, 2].map((j) => (
            <M key={j} g={sphG(1.3 - j * 0.2, 12)} c={["#3a7a32", "#4a8a3a", "#5a9a42"][j]} p={[Math.sin(j * 2 + k) * 0.5, 3.0 + j * 0.5, Math.cos(j * 2 + k) * 0.5]} />
          ))}
        </group>
      );
    })}
    <group position={[0, 0.1, 0]}>
      <M g={cylG(2.2, 2.2, 0.2, 8)} c="#e8e0d0" tex="wood" p={[0, 0.1, 0]} />
      {Array.from({ length: 8 }, (_, k) => (
        <M key={k} g={cylG(0.07, 0.07, 2.4, 6)} c="#f4f0e8" tex="wood" p={[Math.sin((k / 8) * PI * 2) * 2, 1.3, Math.cos((k / 8) * PI * 2) * 2]} />
      ))}
      <M g={coneG(2.6, 1.4, 8)} c="#8a3a32" tex="shingles" p={[0, 3.2, 0]} />
    </group>
    {/* houses */}
    {LOTS.map((l, i) => {
      const f = lotFrame(l.side, l.at);
      const sideIdx = { n: 0, w: 1, s: 2, e: 3 }[l.side];
      const lily = l.side === "n" && Math.abs(l.at - LILY_GATE[0]) < 0.2;
      return (
        <group key={i} position={[l.side === "n" || l.side === "s" ? l.at : f.p[0], 0, l.side === "e" || l.side === "w" ? l.at : f.p[2]]} rotation={[0, f.ry, 0]}>
          <House seed={l.seed} posterOnGate={!s.overhead && onSide(s.posters, sideIdx)} lily={lily} />
        </group>
      );
    })}
    {/* lampposts, and posters on them */}
    {POLES.map((pl, i) => (
      <group key={`pl${i}`} position={pl.p} rotation={[0, pl.ry, 0]}>
        <M g={cylG(0.07, 0.09, 4.2, 10)} c="#2a2c34" tex="metal" p={[0, 2.1, 0]} />
        <M g={cylG(0.15, 0.18, 0.3, 10)} c="#2a2c34" tex="metal" p={[0, 0.15, 0]} />
        <M g={boxG(0.04, 0.04, 0.9)} c="#2a2c34" tex="metal" p={[0, 4.1, 0.4]} />
        <M g={cylG(0.08, 0.25, 0.25, 12)} c="#2a2c34" tex="metal" p={[0, 3.95, 0.85]} />
        {!s.overhead && onSide(s.posters, pl.side) ? (
          <>
            <Poster p={[0, 1.55, -0.09]} ry={PI} tilt={(h1(i) - 0.5) * 0.12} />
            <Poster p={[0, 1.55, 0.09]} ry={0} tilt={(h1(i + 5) - 0.5) * 0.12} />
          </>
        ) : null}
      </group>
    ))}
    {/* the blue collection mailbox */}
    <group position={MAILBOX} rotation={[0, PI, 0]}>
      <M g={boxG(0.55, 0.85, 0.5)} c="#2a5aa8" tex="metal" p={[0, 0.72, 0]} />
      <mesh position={[0, 1.145, 0]} rotation={[0, 0, PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.55, 20, 1, false, 0, PI]} />
        <meshToonMaterial color="#2a5aa8" />
      </mesh>
      {[-0.22, 0.22].map((x) => (
        <React.Fragment key={x}>
          <M g={boxG(0.06, 0.32, 0.06)} c="#1e3a78" tex="metal" p={[x, 0.16, -0.2]} />
          <M g={boxG(0.06, 0.32, 0.06)} c="#1e3a78" tex="metal" p={[x, 0.16, 0.2]} />
        </React.Fragment>
      ))}
      <M g={boxG(0.4, 0.08, 0.03)} c="#1a1a20" p={[0, 1.0, 0.26]} />
      <Label text="MAIL" p={[0, 0.78, 0.255]} w={0.36} h={0.1} bg="none" fg="#f4f4f0" font={0.85} />
    </group>
    {s.overhead ? <Overhead day={s.overhead.day} route={s.overhead.route} /> : null}
  </group>
);

/** the overhead map: bright poster markers on one street per "morning", and the route drawing itself as a dashed loop */
const Overhead: React.FC<{ day: number; route: number }> = ({ day, route }) => {
  const side = Math.floor(day) % 4;
  const pop = day - Math.floor(day);
  const marks: V3[] = [];
  for (let k = 0; k < 16; k++) {
    const s = side * 0.25 + (k / 16) * 0.25 + 0.006;
    marks.push(loopAt(s));
  }
  const dashes = Math.floor(route * 80);
  return (
    <group>
      {marks.map((p, k) => (
        <group key={k} position={[p[0], 0.45, p[2]]} rotation={[-PI / 2, 0, PI / 2 + (h1(k) - 0.5) * 0.5]} scale={Math.max(0, Math.min(1, pop * 4 - k * 0.05)) * 4.2}>
          <mesh material={posterMat()}>
            <planeGeometry args={[0.34, 0.45]} />
          </mesh>
          <mesh geometry={boxG(0.4, 0.51, 0.01)} material={coreMat("#d8282e", 1.0)} position={[0, 0, -0.01]} />
        </group>
      ))}
      {Array.from({ length: dashes }, (_, k) => {
        const a = loopAt(k / 80 + 0.003);
        const b = loopAt(k / 80 + 0.008);
        const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
        return <mesh key={`d${k}`} geometry={boxG(0.9, 0.06, 1.7)} material={coreMat("#ff8a1a", 1.0)} position={[a[0], 0.35, a[2]]} rotation={[0, yaw, 0]} />;
      })}
    </group>
  );
};

// ------------------------------------------------------------------ Biscuit
export type DogState = {
  p: V3;
  yaw: number;
  /** walk phase (radians; undefined: standing) */
  walk?: number;
  /** head turn / tilt / nod (rad) */
  headYaw: number;
  headTilt: number;
  headNod: number;
  /** ears: 0 relaxed (hanging), 1 perked toward a sound */
  ears: number;
  /** tail wag amplitude 0..1 (the wag itself runs from t) */
  wag: number;
  /** 0 standing, 1 sitting */
  sit: number;
  /** the head knocked back by a bump (0..1), stars circling */
  bonk: number;
  /** mouth: 0 closed, 1 open (panting / happy) */
  mouth: number;
  /** eyes closed (bliss) */
  closed?: boolean;
  t: number;
};
const GOLD = "#d89a48";
const GOLD_D = "#b87a32";
const CREAM = "#efdcb8";
const GREY = "#d8d0c4";
export const Dog: React.FC<{ d: DogState }> = ({ d }) => {
  const ph = d.walk ?? 0;
  const walking = d.walk !== undefined;
  const legSwing = (k: number) => (walking ? Math.sin(ph + (k % 2 === 0 ? 0 : PI) + (k < 2 ? 0 : PI / 2)) * 0.32 : 0);
  const bob = walking ? Math.abs(Math.sin(ph)) * 0.02 : 0;
  const breath = Math.sin(d.t * 2.2) * 0.008;
  const wag = Math.sin(d.t * 9) * 0.55 * d.wag;
  const sit = d.sit;
  const bodyPitch = -0.55 * sit;
  return (
    <group position={d.p} rotation={[0, d.yaw, 0]}>
      {/* a soft contact shadow */}
      <mesh rotation={[-PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group position={[0, bob + 0.0, 0]}>
        {/* hind legs fold forward when sitting; the body pitches up about the hips */}
        <group position={[0, 0.5, -0.3]} rotation={[bodyPitch, 0, 0]}>
          <group position={[0, -0.5, 0.3]}>
            {/* body */}
            <M g={sphG(1, 20)} c={GOLD} p={[0, 0.58 + breath, 0.02]} s={[0.25, 0.25 + breath, 0.48]} />
            <M g={sphG(1, 16)} c={CREAM} p={[0, 0.52, 0.32]} s={[0.2, 0.22, 0.2]} />
            {/* the red collar and its tag */}
            <M g={torG(0.15, 0.025)} c="#c8282e" p={[0, 0.78, 0.46]} r={[PI / 2 - 0.5, 0, 0]} />
            <M g={cylG(0.035, 0.035, 0.01, 12)} c="#e8c040" tex="metal" p={[0, 0.66, 0.6]} r={[PI / 2 - 0.3, 0, 0]} />
            {/* front legs */}
            {[-1, 1].map((sd, k) => (
              <group key={`f${sd}`} position={[sd * 0.13, 0.52, 0.32]} rotation={[legSwing(k), 0, 0]}>
                <M g={cylG(0.055, 0.045, 0.48, 10)} c={GOLD} p={[0, -0.24, 0]} />
                <M g={sphG(0.065, 10)} c={GOLD_D} p={[0, -0.49, 0.04]} s={[1, 0.6, 1.3]} />
              </group>
            ))}
            {/* tail: three feathered segments, wagging */}
            <group position={[0, 0.7, -0.44]} rotation={[0.7 - 0.4 * sit, wag, 0]}>
              <M g={cylG(0.04, 0.05, 0.22, 8)} c={GOLD} p={[0, 0, -0.1]} r={[PI / 2, 0, 0]} />
              <group position={[0, 0, -0.2]} rotation={[-0.4, wag * 0.6, 0]}>
                <M g={sphG(1, 10)} c={GOLD_D} p={[0, -0.02, -0.12]} s={[0.06, 0.08, 0.16]} />
              </group>
            </group>
          </group>
          {/* hind legs (attached at the hips) */}
          {[-1, 1].map((sd, k) => (
            <group key={`h${sd}`} position={[sd * 0.15, 0.0, 0.0]} rotation={[legSwing(k + 2) - 1.2 * sit, 0, 0]}>
              <M g={sphG(1, 12)} c={GOLD} p={[0, -0.1, 0.02]} s={[0.1, 0.17, 0.14]} />
              <M g={cylG(0.05, 0.045, 0.42, 10)} c={GOLD} p={[0, -0.26, 0.02]} />
              <M g={sphG(0.065, 10)} c={GOLD_D} p={[0, -0.47, 0.06]} s={[1, 0.6, 1.3]} />
            </group>
          ))}
        </group>
        {/* the head: skull, a grey muzzle, black nose, cloudy blind eyes, floppy ears */}
        <group position={[0, 0.86 + 0.18 * sit, 0.5 - 0.08 * sit]} rotation={[d.headNod - 0.35 * d.bonk, d.headYaw, d.headTilt]}>
          <M g={sphG(1, 18)} c={GOLD} p={[0, 0.03, 0]} s={[0.17, 0.16, 0.18]} />
          <M g={sphG(1, 14)} c={GREY} p={[0, -0.04, 0.17]} s={[0.1, 0.085, 0.13]} />
          <M g={sphG(0.04, 10)} c="#141014" p={[0, -0.01, 0.3]} s={[1.2, 0.8, 0.8]} />
          {d.mouth > 0.05 ? (
            <>
              <M g={sphG(1, 10)} c="#5a2028" p={[0, -0.1, 0.2]} s={[0.06, 0.03 * d.mouth, 0.06]} />
              <M g={sphG(1, 10)} c="#e86a7a" p={[0, -0.12 - 0.03 * d.mouth, 0.22]} s={[0.04, 0.015, 0.06 + 0.03 * d.mouth]} />
            </>
          ) : (
            <M g={boxG(0.1, 0.008, 0.01)} c="#3a2a24" p={[0, -0.085, 0.24]} />
          )}
          {[-1, 1].map((sd) => (
            <group key={`e${sd}`} position={[sd * 0.075, 0.07, 0.14]}>
              {d.closed ? (
                <M g={boxG(0.05, 0.008, 0.01)} c="#2a1a14" p={[0, 0, 0.02]} r={[0, 0, sd * 0.2]} />
              ) : (
                <>
                  {/* warm brown eyes under a milky film: old, kind and blind */}
                  <M g={sphG(0.034, 12)} c="#2a1a14" s={[1, 1, 0.55]} />
                  <M g={sphG(0.026, 12)} c="#6a4430" p={[0, 0, 0.012]} s={[1, 1, 0.45]} />
                  <mesh geometry={sphG(0.027, 12)} material={coreMat("#e4ecf4", 1.0, 0.5)} position={[0, 0, 0.018]} scale={[1, 1, 0.35]} />
                  <mesh geometry={sphG(0.008, 6)} material={coreMat("#ffffff", 1)} position={[sd * -0.009, 0.011, 0.027]} />
                </>
              )}
              <M g={boxG(0.045, 0.01, 0.01)} c={GOLD_D} p={[0, 0.042, 0.015]} r={[0, 0, sd * -0.3]} />
            </group>
          ))}
          {[-1, 1].map((sd) => (
            <group key={`ear${sd}`} position={[sd * 0.15, 0.1, 0.0]} rotation={[0.15 * Math.sin(d.t * 3 + sd), 0, sd * (0.25 + 0.75 * d.ears + (walking ? 0.12 * Math.sin(ph * 2) : 0))]}>
              <M g={sphG(1, 12)} c={GOLD_D} p={[sd * 0.02, -0.12, 0]} s={[0.04, 0.13, 0.09]} />
            </group>
          ))}
          {d.bonk > 0.05
            ? [0, 1, 2].map((k) => {
                const a = d.t * 6 + (k * PI * 2) / 3;
                return <mesh key={`s${k}`} geometry={sphG(0.03, 6)} material={coreMat("#ffd34d", 1.2)} position={[Math.sin(a) * 0.22, 0.28, Math.cos(a) * 0.22]} scale={d.bonk} />;
              })
            : null}
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ props
export const Phone: React.FC<{ p: V3; ry: number; tilt?: number }> = ({ p, ry, tilt = 0 }) => (
  <group position={p} rotation={[0, ry, tilt]}>
    <M g={boxG(0.075, 0.15, 0.012)} c="#1a1a20" tex="metal" />
    <mesh geometry={boxG(0.065, 0.135, 0.002)} material={coreMat("#6ab0e8", 0.9)} position={[0, 0, 0.007]} />
  </group>
);
export const Satchel: React.FC<{ p: V3; ry: number }> = ({ p, ry }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <M g={boxG(0.12, 0.3, 0.38)} c="#5a4030" tex="fabric" />
    <M g={boxG(0.13, 0.12, 0.39)} c="#4a3426" tex="fabric" p={[0, 0.1, 0]} />
    {[0, 1, 2].map((k) => (
      <M key={k} g={boxG(0.005, 0.12, 0.22)} c="#f4f0e4" tex="paper" p={[0, 0.17, -0.1 + k * 0.08]} />
    ))}
  </group>
);
export const HeldPoster: React.FC<{ p: V3; ry: number; tilt?: number }> = ({ p, ry, tilt = 0 }) => <Poster p={p} ry={ry} tilt={tilt} s={0.95} />;
export const Mug: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.045, 0.04, 0.1, 12)} c="#e8e0d4" />
    <M g={torG(0.03, 0.009)} c="#e8e0d4" p={[0.05, 0, 0]} />
  </group>
);
export const Newspaper: React.FC<{ p: V3; ry: number }> = ({ p, ry }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <M g={boxG(0.3, 0.38, 0.01)} c="#ece8de" tex="paper" />
  </group>
);
