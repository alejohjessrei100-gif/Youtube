// The gull short's world. One lighthouse big enough to walk inside: a rocky point over an animated sea, a striped
// tower, a gallery with a railing, a lantern room (knee wall, glass with mullions, a door to the gallery, the Fresnel
// lens on its pedestal, the brass switch, the keeper's things), a rotating beam, the abandoned keeper's cottage.
// Separate sets: the spiral stairwell inside the tower, Walt's porch in town (the lighthouse far off on the horizon).
import React from "react";
import * as THREE from "three";
import { boxG, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// ------------------------------------------------------------------ dimensions
export const DECK_Y = 16; // the lantern-room floor and the gallery deck
export const LR = 3.8; // lantern-room radius (generous: two people, a gull and a camera fit inside)
export const RAIL_R = 4.9;
export const RAIL_Y = DECK_Y + 1.1;
const TOWER_R0 = 4.6;
const TOWER_R1 = 3.9;
const SEA_Y = -6;
/** the brass switch on its box beside the lens; the lever pivots on the front face */
export const SWITCH: V3 = [1.6, DECK_Y, 1.75];
export const LENS_C: V3 = [0, DECK_Y, 0];
export const DOOR_TH = 0; // the gallery door faces +z
export const lampAt = (on: number): V3 => [0, DECK_Y + 1.65 + 0 * on, 0];

// ------------------------------------------------------------------ the sea: one mutable grid, rewritten from t every frame
const SEA_N = 72;
const SEA_S = 360;
const seaGeo = (() => {
  const g = new THREE.PlaneGeometry(SEA_S, SEA_S, SEA_N, SEA_N);
  g.rotateX(-PI / 2);
  return g;
})();
const seaBase = Float32Array.from(seaGeo.attributes.position.array as Float32Array);
const waveH = (x: number, z: number, t: number) => 0.32 * Math.sin(x * 0.11 + t * 0.9) + 0.22 * Math.sin(z * 0.13 - t * 0.7 + 1.3) + 0.1 * Math.sin((x + z) * 0.31 + t * 1.6);
export const Sea: React.FC<{ t: number; color?: string }> = ({ t, color = "#2a6a8c" }) => {
  const p = seaGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = seaBase[i * 3];
    const z = seaBase[i * 3 + 2];
    p.setY(i, waveH(x, z, t));
  }
  p.needsUpdate = true;
  seaGeo.computeVertexNormals();
  return (
    <group position={[0, SEA_Y, 0]}>
      <M g={seaGeo} c={color} recv cast={false} />
      {/* foam where the sea meets the rocks, breathing with the swell */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={torG(15.4 + i * 1.1 + 0.35 * Math.sin(t * 1.2 + i), 0.16 - i * 0.04, PI * 2)} material={coreMat("#eef8ff", 0.9, 0.85 - i * 0.22)} rotation={[PI / 2, 0, t * 0.03 * (i + 1)]} position={[0, 0.3 + 0.1 * Math.sin(t * 1.2 + i), 0]} userData={{ outline: false }} />
      ))}
      {/* glints that drift on the water */}
      {Array.from({ length: 26 }, (_, i) => {
        const a = h1(i) * PI * 2;
        const r = 22 + h1(i + 7) * 90;
        const x = Math.cos(a) * r + Math.sin(t * 0.2 + i) * 1.5;
        const z = Math.sin(a) * r;
        const on = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
        return <mesh key={`g${i}`} geometry={boxG(1.2, 0.02, 0.12)} material={coreMat("#ffffff", 0.75 * on + 0.2, 0.6)} position={[x, waveH(x, z, t) + 0.05, z]} rotation={[0, a, 0]} userData={{ outline: false }} />;
      })}
    </group>
  );
};

// ------------------------------------------------------------------ rocks, grass, the point
const Rock: React.FC<{ p: V3; s: number; seed: number; c?: string }> = ({ p, s, seed, c = "#6a6670" }) => (
  <M g={sphG(1, 10)} c={c} tex="rock" p={p} s={[s * (0.9 + h1(seed) * 0.6), s * (0.55 + h1(seed + 1) * 0.4), s * (0.9 + h1(seed + 2) * 0.5)]} r={[h1(seed + 3) * 0.6, h1(seed + 4) * 6, 0]} />
);
const Tuft: React.FC<{ p: V3; s?: number; seed: number }> = ({ p, s = 1, seed }) => (
  <group position={p} scale={s} rotation={[0, h1(seed) * 6, 0]}>
    {[0, 1, 2, 3, 4].map((i) => (
      <M key={i} g={coneG(0.05, 0.45 + h1(seed + i) * 0.3, 4)} c={i % 2 ? "#6a9a4a" : "#88aa58"} p={[Math.cos(i * 1.3) * 0.08, 0.2, Math.sin(i * 1.3) * 0.08]} r={[Math.cos(i * 1.3) * 0.35, 0, Math.sin(i * 1.3) * 0.35]} cast={false} />
    ))}
  </group>
);
export const Point: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <Sea t={t} />
    {/* the plateau and its cliff */}
    <M g={cylG(14, 15.6, 6.4, 40)} c="#5a5660" tex="rock" ts={1.2} p={[0, -3.2, 0]} />
    <M g={cylG(13.9, 14, 0.4, 40)} c="#6a9a4a" tex="grass" ts={1.4} p={[0, -0.2, 0]} />
    {Array.from({ length: 34 }, (_, i) => {
      const a = (i / 34) * PI * 2 + h1(i) * 0.1;
      const r = 14.6 + h1(i + 3) * 1.6;
      return <Rock key={i} p={[Math.cos(a) * r, -4.6 + h1(i + 9) * 3.4, Math.sin(a) * r]} s={1.6 + h1(i + 5) * 1.8} seed={i} />;
    })}
    {Array.from({ length: 14 }, (_, i) => {
      const a = h1(i + 40) * PI * 2;
      const r = 17 + h1(i + 41) * 8;
      return <Rock key={`s${i}`} p={[Math.cos(a) * r, SEA_Y + 0.2, Math.sin(a) * r]} s={0.9 + h1(i + 42) * 1.6} seed={i + 50} c="#4e4a54" />;
    })}
    {Array.from({ length: 60 }, (_, i) => {
      const a = h1(i + 100) * PI * 2;
      const r = 4.4 + h1(i + 101) * 9;
      return <Tuft key={i} p={[Math.cos(a) * r, 0, Math.sin(a) * r]} s={0.7 + h1(i + 102) * 0.7} seed={i} />;
    })}
    {/* a gravel path from the cottage to the tower door, a picket fence, a bench, a crab pot, a rowboat pulled up */}
    {Array.from({ length: 12 }, (_, i) => (
      <M key={i} g={cylG(0.32, 0.36, 0.06, 8)} c="#9a948e" tex="stone" p={[1.0 + i * 0.55, 0.02, 3.9 + Math.sin(i * 0.6) * 0.3]} r={[0, h1(i) * 3, 0]} cast={false} />
    ))}
    {Array.from({ length: 16 }, (_, i) => (
      <M key={i} g={boxG(0.08, 0.9 - (i % 2) * 0.06, 0.05)} c="#f0ece4" tex="wood" p={[5.0 + i * 0.4, 0.45, 7.4]} r={[0, 0, (h1(i) - 0.5) * 0.12]} />
    ))}
    <M g={boxG(6.4, 0.06, 0.04)} c="#e8e4dc" tex="wood" p={[8.0, 0.6, 7.43]} />
    <group position={[-6.5, 0, 5.5]} rotation={[0, 0.6, 0]}>
      <M g={boxG(1.6, 0.06, 0.4)} c="#8a6a4a" tex="wood" p={[0, 0.45, 0]} />
      <M g={boxG(1.6, 0.35, 0.05)} c="#8a6a4a" tex="wood" p={[0, 0.7, -0.18]} />
      {[-0.7, 0.7].map((x) => (
        <M key={x} g={boxG(0.06, 0.45, 0.38)} c="#5a4030" tex="wood" p={[x, 0.22, 0]} />
      ))}
    </group>
    <group position={[-8.5, 0, 1.0]} rotation={[0.08, 1.2, 0.18]}>
      <M g={cylG(0.5, 0.9, 0.55, 12, true)} c="#8a5a3a" tex="planks" p={[0, 0.3, 0]} s={[1, 1, 2.6]} side={THREE.DoubleSide} />
      <M g={boxG(0.08, 0.06, 2.6)} c="#c8402e" p={[0.85, 0.5, 0]} />
      <M g={cylG(0.03, 0.03, 2.2, 6)} c="#a07a52" tex="wood" p={[0.2, 0.6, 0.4]} r={[0.5, 0, PI / 2 - 0.1]} />
    </group>
    <group position={[-5.6, 0, -6.2]}>
      <M g={boxG(0.7, 0.45, 0.7)} c="#4a5a4a" tex="metal" p={[0, 0.22, 0]} />
      <M g={torG(0.25, 0.02)} c="#c8a040" p={[0.36, 0.3, 0]} r={[0, PI / 2, 0]} />
    </group>
    <Cottage />
  </group>
);

// ------------------------------------------------------------------ the abandoned keeper's cottage
export const COTTAGE: V3 = [8.0, 0, 3.4];
const Cottage: React.FC = () => (
  <group position={COTTAGE} rotation={[0, -0.25, 0]}>
    <M g={boxG(5.2, 3.0, 4.0)} c="#e8e2d6" tex="plaster" p={[0, 1.5, -1.0]} />
    <M g={boxG(5.25, 0.5, 4.05)} c="#8a8290" tex="stone" p={[0, 0.25, -1.0]} />
    {[-1, 1].map((sd) => (
      <M key={sd} g={boxG(5.8, 0.16, 2.6)} c="#8a3a32" tex="roofTiles" p={[0, 3.55, -1.0 + sd * 1.0]} r={[sd * 0.62, 0, 0]} />
    ))}
    <M g={boxG(0.7, 1.6, 0.7)} c="#8a8290" tex="stone" p={[1.6, 4.0, -1.4]} />
    {/* the door with a padlock and a weathered sign, windows boarded up */}
    <M g={boxG(1.0, 2.0, 0.08)} c="#4a6a7a" tex="planks" p={[-0.9, 1.0, 1.02]} />
    <M g={boxG(0.12, 0.16, 0.06)} c="#8a8a92" tex="metal" p={[-0.5, 1.0, 1.09]} />
    <M g={torG(0.05, 0.012)} c="#8a8a92" p={[-0.5, 1.12, 1.09]} />
    <M g={boxG(0.9, 0.3, 0.03)} c="#d8ccb0" tex="wood" p={[-0.9, 2.25, 1.07]} r={[0, 0, 0.06]} />
    <Label text="KEEPER" p={[-0.9, 2.25, 1.09]} r={[0, 0, 0.06]} w={0.78} h={0.2} fg="#3a2a1a" bg="none" font={0.8} />
    {[0.9, 1.9].map((x) => (
      <group key={x} position={[x, 1.6, 1.02]}>
        <mesh geometry={boxG(0.9, 0.9, 0.02)} material={coreMat("#1a1c24", 1)} />
        {[0.25, -0.05, -0.32].map((y, k) => (
          <M key={y} g={boxG(1.05, 0.16, 0.05)} c="#a08a6a" tex="planks" p={[0, y, 0.04]} r={[0, 0, (k - 1) * 0.12]} />
        ))}
      </group>
    ))}
    {/* the mailbox stuffed with a year of letters */}
    <group position={[-2.2, 0, 1.8]}>
      <M g={boxG(0.08, 1.05, 0.08)} c="#6a4a32" tex="wood" p={[0, 0.52, 0]} />
      <M g={boxG(0.32, 0.26, 0.48)} c="#3a5a7a" tex="metal" p={[0, 1.16, 0]} />
      {[0, 1, 2, 3].map((i) => (
        <M key={i} g={boxG(0.24, 0.012, 0.18)} c={i % 2 ? "#f4eedc" : "#e8dcc0"} tex="paper" p={[0.01 * i, 1.02 + 0.02 * i, 0.3 + 0.03 * i]} r={[0.2 + i * 0.1, i * 0.2, 0]} />
      ))}
    </group>
    {/* a lobster trap, a rusty bucket, weeds against the wall */}
    <M g={boxG(0.8, 0.45, 0.5)} c="#8a6a4a" tex="planks" p={[1.6, 0.22, 1.5]} r={[0, 0.3, 0]} />
    <M g={cylG(0.18, 0.15, 0.32, 12, true)} c="#8a5a3a" tex="metal" p={[0.3, 0.16, 1.5]} side={THREE.DoubleSide} />
    {Array.from({ length: 8 }, (_, i) => (
      <Tuft key={i} p={[-2.3 + i * 0.6, 0, 1.15]} s={1.2} seed={i + 300} />
    ))}
  </group>
);

// ------------------------------------------------------------------ the lighthouse
const Band: React.FC<{ y0: number; y1: number; c: string }> = ({ y0, y1, c }) => {
  const r0 = TOWER_R0 + (TOWER_R1 - TOWER_R0) * (y0 / DECK_Y);
  const r1 = TOWER_R0 + (TOWER_R1 - TOWER_R0) * (y1 / DECK_Y);
  return <M g={cylG(r1, r0, y1 - y0, 40)} c={c} tex="plaster" p={[0, (y0 + y1) / 2, 0]} />;
};
export type LampState = { on: number; beam: number; t: number; lever: number; feathers?: boolean; lockNew?: number; doorOpen?: number; crumbs?: boolean };
export const Lighthouse: React.FC<{ s: LampState }> = ({ s }) => {
  const doorA = 1.2 * (s.doorOpen ?? 1);
  return (
    <group>
      {/* the tower: red and white bands, a door, slit windows, a stone footing */}
      <M g={cylG(TOWER_R0 + 0.4, TOWER_R0 + 0.6, 0.9, 40)} c="#8a8290" tex="stone" p={[0, 0.45, 0]} />
      {[0, 1, 2, 3].map((i) => (
        <Band key={i} y0={0.9 + i * 3.775} y1={0.9 + (i + 1) * 3.775} c={i % 2 ? "#e8e0d4" : "#c8342a"} />
      ))}
      <M g={boxG(1.4, 2.4, 0.3)} c="#e8e0d4" tex="plaster" p={[0, 1.6, TOWER_R0 - 0.02]} />
      <M g={boxG(1.0, 2.0, 0.08)} c="#2a4a5a" tex="planks" p={[0, 1.9, TOWER_R0 + 0.15]} />
      {[3.5, 7.5, 11.5].map((y, i) => (
        <group key={y} position={[Math.sin(0.4 + i) * (TOWER_R0 - (y / DECK_Y) * 0.6 + 0.02), y + 1.6, Math.cos(0.4 + i) * (TOWER_R0 - (y / DECK_Y) * 0.6 + 0.02)]} rotation={[0, 0.4 + i, 0]}>
          <mesh geometry={boxG(0.45, 0.8, 0.04)} material={coreMat(s.on > 0.5 ? "#ffd890" : "#2a3442", 0.8)} />
          <M g={boxG(0.6, 0.1, 0.12)} c="#e8e0d4" p={[0, -0.45, 0.04]} />
        </group>
      ))}
      {/* the gallery: deck, corbels, railing */}
      <M g={cylG(RAIL_R + 0.15, RAIL_R - 0.6, 0.3, 44)} c="#2a2c34" tex="metal" p={[0, DECK_Y - 0.15, 0]} />
      {Array.from({ length: 16 }, (_, i) => (
        <M key={i} g={boxG(0.18, 0.7, 0.5)} c="#2a2c34" tex="metal" p={[Math.sin((i / 16) * PI * 2) * (TOWER_R1 + 0.3), DECK_Y - 0.55, Math.cos((i / 16) * PI * 2) * (TOWER_R1 + 0.3)]} r={[0, (i / 16) * PI * 2, 0]} />
      ))}
      {Array.from({ length: 28 }, (_, i) => (
        <M key={i} g={cylG(0.03, 0.03, 1.1, 6)} c="#1e2028" tex="metal" p={[Math.sin((i / 28) * PI * 2) * RAIL_R, DECK_Y + 0.55, Math.cos((i / 28) * PI * 2) * RAIL_R]} />
      ))}
      {[0.55, 1.1].map((y) => (
        <M key={y} g={torG(RAIL_R, 0.035)} c="#1e2028" tex="metal" p={[0, DECK_Y + y, 0]} r={[PI / 2, 0, 0]} />
      ))}
      {/* the lantern room: knee wall with the door gap, glass between mullions, a lintel over the door, the roof */}
      <M g={cylG(LR, LR, 1.0, 48, true, 0.2, PI * 2 - 0.4)} c="#e8e0d4" tex="plaster" p={[0, DECK_Y + 0.5, 0]} side={THREE.DoubleSide} />
      <mesh geometry={cylG(LR - 0.02, LR - 0.02, 2.4, 48, true, 0.2, PI * 2 - 0.4)} material={coreMat("#bfe0f4", 0.9, 0.16)} position={[0, DECK_Y + 2.2, 0]} userData={{ outline: false }} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * PI * 2 + PI / 12;
        return <M key={i} g={boxG(0.07, 2.4, 0.07)} c="#1e2028" tex="metal" p={[Math.sin(a) * LR, DECK_Y + 2.2, Math.cos(a) * LR]} />;
      })}
      {[1.0, 3.4].map((y) => (
        <M key={y} g={torG(LR, 0.05)} c="#1e2028" tex="metal" p={[0, DECK_Y + y, 0]} r={[PI / 2, 0, 0]} />
      ))}
      <M g={boxG(1.25, 0.5, 0.12)} c="#e8e0d4" tex="plaster" p={[0, DECK_Y + 2.25, LR - 0.02]} />
      {/* the door, hinged on its right jamb, swung out onto the gallery */}
      <group position={[0.58, DECK_Y, LR + 0.04]} rotation={[0, doorA, 0]}>
        <M g={boxG(1.12, 2.0, 0.07)} c="#2a4a5a" tex="planks" p={[-0.56, 1.0, 0]} />
        <mesh geometry={boxG(0.6, 0.6, 0.02)} material={coreMat("#bfe0f4", 0.85, 0.4)} position={[-0.56, 1.5, 0.04]} userData={{ outline: false }} />
        <M g={sphG(0.04, 8)} c="#c8a040" tex="metal" p={[-1.0, 1.0, 0.07]} />
        {(s.lockNew ?? 0) > 0 ? (
          <group position={[-1.02, 0.92, 0.1]} scale={s.lockNew}>
            <M g={boxG(0.14, 0.12, 0.06)} c="#d8b040" tex="metal" />
            <M g={torG(0.045, 0.012, PI)} c="#c8c8d0" tex="metal" p={[0, 0.06, 0]} />
          </group>
        ) : null}
      </group>
      <M g={coneG(LR + 0.35, 1.6, 48)} c="#c8342a" tex="metal" p={[0, DECK_Y + 4.2, 0]} />
      <M g={cylG(0.12, 0.16, 0.5, 10)} c="#1e2028" tex="metal" p={[0, DECK_Y + 5.15, 0]} />
      <M g={sphG(0.32, 14)} c="#1e2028" tex="metal" p={[0, DECK_Y + 5.6, 0]} />
      <M g={cylG(0.02, 0.02, 1.2, 4)} c="#1e2028" p={[0, DECK_Y + 6.4, 0]} />
      {/* inside: the floor, the lens on its pedestal, the lamp, the switch, the keeper's things */}
      <M g={cylG(LR - 0.03, LR - 0.03, 0.06, 40)} c="#7a5a3a" tex="planks" p={[0, DECK_Y + 0.03, 0]} cast={false} />
      <M g={cylG(0.62, 0.78, 0.92, 20)} c="#2a2c34" tex="metal" p={[0, DECK_Y + 0.46, 0]} />
      <M g={torG(0.7, 0.04)} c="#c8a040" tex="metal" p={[0, DECK_Y + 0.92, 0]} r={[PI / 2, 0, 0]} />
      <mesh geometry={cylG(0.82, 0.82, 1.45, 28, true)} material={coreMat(s.on > 0.5 ? "#fff2cc" : "#cfe6f0", 0.7 + 0.45 * s.on, 0.42)} position={[0, DECK_Y + 1.65, 0]} userData={{ outline: false }} />
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} geometry={torG(0.83 - Math.abs(i - 4) * 0.012, 0.012)} material={coreMat("#ffffff", 0.75 + 0.3 * s.on, 0.65)} position={[0, DECK_Y + 1.02 + i * 0.158, 0]} rotation={[PI / 2, 0, 0]} userData={{ outline: false }} />
      ))}
      {[0.95, 2.36].map((y) => (
        <M key={y} g={torG(0.84, 0.035)} c="#c8a040" tex="metal" p={[0, DECK_Y + y, 0]} r={[PI / 2, 0, 0]} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <M key={`v${i}`} g={boxG(0.03, 1.42, 0.03)} c="#c8a040" tex="metal" p={[Math.sin((i / 8) * PI * 2) * 0.84, DECK_Y + 1.65, Math.cos((i / 8) * PI * 2) * 0.84]} />
      ))}
      <M g={cylG(0.06, 0.06, 1.5, 8)} c="#c8a040" tex="metal" p={[0, DECK_Y + 1.6, 0]} />
      <mesh geometry={sphG(0.28, 16)} material={coreMat("#fff2c0", 0.4 + 0.8 * s.on)} position={lampAt(s.on)} />
      {s.on > 0.02 ? <pointLight position={[0, DECK_Y + 1.7, 0]} color="#ffd890" intensity={60 * s.on} distance={14} decay={2} /> : null}
      {/* the switch box and its lever (lever 0 = up/off, 1 = down/on) */}
      <group position={SWITCH} rotation={[0, -2.4, 0]}>
        <M g={boxG(0.38, 0.42, 0.26)} c="#3a3a42" tex="metal" p={[0, 0.21, 0]} />
        <M g={boxG(0.3, 0.3, 0.02)} c="#c8a040" tex="metal" p={[0, 0.24, 0.135]} />
        <group position={[0, 0.27, 0.16]} rotation={[-0.9 + 1.8 * s.lever, 0, 0]}>
          <M g={cylG(0.025, 0.025, 0.26, 8)} c="#c8a040" tex="metal" p={[0, 0.13, 0]} />
          <M g={sphG(0.05, 10)} c="#1a1a1e" p={[0, 0.27, 0]} />
        </group>
        <mesh geometry={sphG(0.025, 8)} material={coreMat(s.on > 0.5 ? "#7aff7a" : "#ff4a3a", 0.9)} position={[0.11, 0.38, 0.14]} />
        {s.feathers
          ? [0, 1, 2, 3].map((i) => (
              <group key={i} position={[-0.25 + i * 0.16, 0.012, 0.28 + (i % 2) * 0.1]} rotation={[0, i * 1.3, 0]}>
                <M g={boxG(0.035, 0.008, 0.16)} c="#f4f4f0" p={[0, 0, 0]} r={[0, 0, 0.1]} cast={false} />
                <M g={boxG(0.005, 0.01, 0.16)} c="#b8b8c0" p={[0, 0.005, 0]} cast={false} />
              </group>
            ))
          : null}
        {s.crumbs ? [0, 1, 2, 3, 4].map((i) => <M key={i} g={sphG(0.015, 6)} c="#c8945a" p={[-0.1 + i * 0.05, 0.012, 0.42]} cast={false} />) : null}
      </group>
      {/* the keeper's things: a chair, a logbook on a shelf, a thermos, an oilcan, a brass clock */}
      <group position={[-2.3, DECK_Y, -2.4]} rotation={[0, 0.8, 0]}>
        <M g={boxG(0.5, 0.06, 0.5)} c="#7a5a3a" tex="wood" p={[0, 0.48, 0]} />
        <M g={boxG(0.5, 0.6, 0.06)} c="#7a5a3a" tex="wood" p={[0, 0.8, -0.24]} />
        {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z], i) => (
          <M key={i} g={boxG(0.05, 0.48, 0.05)} c="#5a4030" tex="wood" p={[x, 0.24, z]} />
        ))}
      </group>
      <group position={[-3.3, DECK_Y, 1.0]} rotation={[0, 1.85, 0]}>
        <M g={boxG(0.8, 0.05, 0.3)} c="#7a5a3a" tex="wood" p={[0, 0.95, 0]} />
        <M g={boxG(0.32, 0.06, 0.24)} c="#5a2a2a" tex="paper" p={[-0.15, 1.0, 0]} />
        <M g={cylG(0.06, 0.06, 0.28, 12)} c="#2a5a4a" tex="metal" p={[0.2, 1.11, 0]} />
        <M g={cylG(0.05, 0.08, 0.16, 10)} c="#c8a040" tex="metal" p={[0.05, 0.06, 0.1]} />
      </group>
      <group position={[-0.2, DECK_Y + 0.75, -LR + 0.12]}>
        <M g={cylG(0.18, 0.18, 0.06, 24)} c="#c8a040" tex="metal" r={[PI / 2, 0, 0]} />
        <mesh geometry={cylG(0.15, 0.15, 0.02, 24)} material={coreMat("#f4ecd8", 0.95)} position={[0, 0, 0.035]} rotation={[PI / 2, 0, 0]} />
      </group>
    </group>
  );
};
/** the beam: two long soft cones turning with the lens */
export const Beam: React.FC<{ on: number; angle: number }> = ({ on, angle }) =>
  on > 0.02 ? (
    <group position={lampAt(on)} rotation={[0, angle, 0]}>
      {[0, PI].map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh geometry={coneG(5.5, 60, 24)} material={coreMat("#fff0c0", 0.9, 0.12 * on)} position={[0, 0, 30.5]} rotation={[-PI / 2, 0, 0]} userData={{ outline: false }} />
          <mesh geometry={coneG(2.2, 40, 18)} material={coreMat("#fff8e0", 1.0, 0.16 * on)} position={[0, 0, 20.5]} rotation={[-PI / 2, 0, 0]} userData={{ outline: false }} />
        </group>
      ))}
    </group>
  ) : null;

// ------------------------------------------------------------------ the stairwell (its own set at the origin)
export const STAIR_R = 2.5;
/** the spiral: a step every 18° rising 0.19 m; the point on the walking line at turn angle a (rad) */
export const stairAt = (a: number): V3 => [Math.sin(a) * 1.35, (a / (PI / 10)) * 0.19, Math.cos(a) * 1.35];
export const Stairwell: React.FC<{ t: number; lantern?: V3 | null }> = ({ lantern }) => (
  <group>
    <M g={cylG(STAIR_R + 0.3, STAIR_R + 0.3, 16, 36, true)} c="#d8d0c0" tex="stone" ts={0.8} p={[0, 7.5, 0]} side={THREE.BackSide} cast={false} />
    <M g={cylG(STAIR_R + 0.3, STAIR_R + 0.3, 0.2, 36)} c="#6a6670" tex="stone" p={[0, -0.1, 0]} cast={false} />
    <M g={cylG(0.32, 0.32, 16, 16)} c="#e8e0d4" tex="plaster" p={[0, 7.5, 0]} />
    {Array.from({ length: 60 }, (_, i) => {
      const a = (i * PI) / 10;
      const y = i * 0.19;
      return (
        <group key={i} position={[0, y, 0]} rotation={[0, a, 0]}>
          <M g={boxG(0.5, 0.07, 2.25)} c="#4a4c56" tex="metal" p={[0.12, 0, 1.4]} r={[0, -0.16, 0]} />
          <M g={cylG(0.016, 0.016, 0.9, 6)} c="#1e2028" tex="metal" p={[0.12, 0.45, 2.48]} />
        </group>
      );
    })}
    {/* the handrail: a helix of short segments along the outer edge */}
    {Array.from({ length: 120 }, (_, i) => {
      const a = (i * PI) / 20;
      const y = (i / 2) * 0.19 + 0.92;
      return <M key={i} g={boxG(0.04, 0.04, 0.42)} c="#1e2028" tex="metal" p={[Math.sin(a) * 2.48, y, Math.cos(a) * 2.48]} r={[0, a + PI / 2, 0.15]} />;
    })}
    {/* slit windows with moonlight, a fire bucket, a coiled rope */}
    {[2.2, 5.6, 9.0].map((y, i) => (
      <group key={y} position={[Math.sin(1.2 + i * 2.1) * (STAIR_R + 0.28), y, Math.cos(1.2 + i * 2.1) * (STAIR_R + 0.28)]} rotation={[0, 1.2 + i * 2.1 + PI, 0]}>
        <mesh geometry={boxG(0.3, 0.9, 0.02)} material={coreMat("#6a7ad8", 0.85)} />
      </group>
    ))}
    <M g={cylG(0.16, 0.13, 0.3, 12, true)} c="#c8342a" tex="metal" p={[1.9, 0.15, -0.9]} side={THREE.DoubleSide} />
    <M g={torG(0.25, 0.06)} c="#c8a878" tex="fabric" p={[-1.7, 0.06, -1.2]} r={[PI / 2, 0, 0]} />
    {lantern ? (
      <group position={lantern}>
        <M g={cylG(0.07, 0.08, 0.04, 10)} c="#2a2c34" tex="metal" p={[0, -0.12, 0]} />
        <mesh geometry={cylG(0.06, 0.06, 0.18, 10)} material={coreMat("#ffd890", 1.0, 0.8)} />
        <M g={torG(0.07, 0.008, PI)} c="#2a2c34" p={[0, 0.14, 0]} />
        <pointLight position={[0, 0, 0]} color="#ffb860" intensity={9} distance={7} decay={2} />
      </group>
    ) : null}
  </group>
);

// ------------------------------------------------------------------ Walt's porch in town (its own set)
export const Porch: React.FC<{ t: number; beamAngle: number }> = ({ t, beamAngle }) => (
  <group>
    <M g={boxG(200, 0.2, 200)} c="#3a4a3a" tex="grass" p={[0, -0.1, 0]} cast={false} />
    {/* his house: siding, a window glowing, the porch deck, posts, roof, a hanging lamp */}
    <M g={boxG(7, 3.4, 0.3)} c="#5a7a8a" tex="planks" ts={0.7} p={[0, 1.9, -1.8]} />
    <group position={[-1.8, 1.8, -1.62]}>
      <mesh geometry={boxG(1.0, 1.1, 0.02)} material={coreMat("#ffd890", 0.85)} />
      <M g={boxG(1.12, 0.07, 0.06)} c="#f0ece4" p={[0, 0.58, 0.02]} />
      <M g={boxG(1.12, 0.07, 0.06)} c="#f0ece4" p={[0, -0.58, 0.02]} />
      <M g={boxG(0.05, 1.1, 0.05)} c="#f0ece4" p={[0, 0, 0.025]} />
      <M g={boxG(0.5, 1.05, 0.02)} c="#c8a878" tex="fabric" p={[-0.3, 0.02, 0.03]} />
    </group>
    <M g={boxG(1.0, 2.1, 0.08)} c="#7a3a2a" tex="planks" p={[1.2, 1.25, -1.62]} />
    <M g={boxG(7.2, 0.18, 3.0)} c="#8a6a4a" tex="planks" p={[0, 0.2, -0.2]} />
    {[-3.4, 3.4].map((x) => (
      <M key={x} g={boxG(0.14, 2.8, 0.14)} c="#f0ece4" tex="wood" p={[x, 1.6, 1.2]} />
    ))}
    <M g={boxG(7.6, 0.12, 3.4)} c="#4a4a52" tex="shingles" p={[0, 3.1, -0.2]} r={[0.12, 0, 0]} />
    <group position={[0.3, 2.85, 0.4]}>
      <M g={cylG(0.01, 0.01, 0.3, 4)} c="#1e2028" p={[0, 0, 0]} />
      <mesh geometry={sphG(0.11, 12)} material={coreMat("#ffd890", 1.0)} position={[0, -0.22, 0]} />
      <pointLight position={[0, -0.3, 0.2]} color="#ffb860" intensity={6} distance={6} decay={2} />
    </group>
    {/* the railing, a sleeping cat on the step, potted plants, a crate of empty bottles */}
    {Array.from({ length: 12 }, (_, i) => (
      <M key={i} g={boxG(0.06, 0.8, 0.06)} c="#f0ece4" tex="wood" p={[-3.3 + i * 0.25, 0.7, 1.22]} />
    ))}
    <M g={boxG(3.1, 0.08, 0.08)} c="#f0ece4" tex="wood" p={[-1.95, 1.1, 1.22]} />
    <group position={[1.6, 0.35, 1.3]}>
      <M g={sphG(0.2, 12)} c="#e8a050" p={[0, 0.1, 0]} s={[1.5, 0.7, 1]} />
      <M g={sphG(0.12, 12)} c="#e8a050" p={[0.26, 0.12, 0.04]} />
      {[-1, 1].map((sd) => (
        <M key={sd} g={coneG(0.04, 0.08, 6)} c="#e8a050" p={[0.28, 0.24, sd * 0.06]} />
      ))}
      <M g={cylG(0.03, 0.03, 0.4, 6)} c="#e8a050" p={[-0.32, 0.06, 0.12]} r={[0, 0.5, PI / 2 - 0.2]} />
      <M g={sphG(0.2, 12)} c="#e8a050" p={[0, 0.1, 0]} s={[1.5, 0.7 + 0.03 * Math.sin(t * 1.8), 1]} />
    </group>
    {[-3.0, 3.0].map((x) => (
      <group key={x} position={[x, 0.3, 0.9]}>
        <M g={cylG(0.22, 0.17, 0.36, 14)} c="#a85a3a" tex="brick" p={[0, 0.18, 0]} />
        <M g={sphG(0.3, 12)} c="#3a6a3a" p={[0, 0.5, 0]} />
      </group>
    ))}
    {/* the street below, a picket fence, and far away on the horizon: the lighthouse, its beam sweeping */}
    <M g={boxG(200, 0.03, 6)} c="#3a3c44" tex="stone" p={[0, 0.0, 6]} cast={false} />
    {Array.from({ length: 30 }, (_, i) => (
      <M key={i} g={boxG(0.08, 0.8, 0.05)} c="#e8e4dc" tex="wood" p={[-7.5 + i * 0.5, 0.4, 2.6]} />
    ))}
    <group position={[22, -6, -120]} scale={1.0}>
      <M g={sphG(40, 24)} c="#2a3448" p={[0, -32, 0]} s={[2, 1, 1]} cast={false} />
      <group position={[0, 6, 0]}>
        <M g={cylG(2.6, 3.4, 16, 20)} c="#d8d0c8" tex="plaster" p={[0, 8, 0]} cast={false} />
        <M g={coneG(3.0, 1.6, 20)} c="#8a2a24" p={[0, 20.6, 0]} cast={false} />
        <mesh geometry={sphG(1.4, 14)} material={coreMat("#fff2c0", 1.2)} position={[0, 18, 0]} />
        <group position={[0, 18, 0]} rotation={[0, beamAngle, 0]}>
          {[0, PI].map((a) => (
            <mesh key={a} geometry={coneG(9, 110, 20)} material={coreMat("#fff0c0", 0.9, 0.1)} position={[0, 0, 55]} rotation={[-PI / 2 - 0.0, a, 0]} userData={{ outline: false }} />
          ))}
        </group>
      </group>
    </group>
  </group>
);

// ------------------------------------------------------------------ the gull: an expressive cartoon herring gull
export type GullFace = { eyes: "normal" | "big" | "narrow" | "sparkle" | "closed"; brow: number; beak: number };
export type GullState = { p: V3; yaw: number; tilt: number; bob: number; flap: number; fold: number; peck: number; step: number; face: GullFace; s?: number };
export const Gull: React.FC<{ g: GullState }> = ({ g }) => {
  const eye = g.face.eyes;
  const eyeS = eye === "big" ? 1.45 : eye === "sparkle" ? 1.3 : eye === "narrow" ? 0.95 : 1;
  const pupil = eye === "big" ? 0.38 : eye === "sparkle" ? 0.8 : 0.6;
  return (
    <group position={[g.p[0], g.p[1] + g.bob, g.p[2]]} rotation={[0, g.yaw, g.tilt]} scale={g.s ?? 1}>
      {/* body, tail, wings */}
      <M g={sphG(0.17, 16)} c="#f6f6f2" p={[0, 0.3, 0]} s={[0.95, 0.9, 1.35]} />
      <M g={coneG(0.1, 0.24, 8)} c="#f0f0ea" p={[0, 0.33, -0.27]} r={[-PI / 2 - 0.3, 0, 0]} s={[1.3, 1, 0.5]} />
      <M g={coneG(0.07, 0.1, 6)} c="#2a2a30" p={[0, 0.36, -0.36]} r={[-PI / 2 - 0.4, 0, 0]} s={[1.4, 1, 0.5]} />
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.12, 0.38, -0.02]} rotation={[0, 0, sd * (0.1 + g.flap * 1.4)]}>
          <group rotation={[0, sd * -0.25 * g.fold, 0]}>
            <M g={sphG(1, 14)} c="#a8b0bc" p={[sd * (0.07 + 0.2 * (1 - g.fold)), 0, -0.05]} s={[0.1 + 0.22 * (1 - g.fold), 0.028, 0.16]} />
            <M g={sphG(1, 10)} c="#2a2a30" p={[sd * (0.13 + 0.38 * (1 - g.fold)), -0.005, -0.15 + 0.06 * (1 - g.fold)]} s={[0.06 + 0.06 * (1 - g.fold), 0.02, 0.08]} />
          </group>
        </group>
      ))}
      {/* the head on its neck: it lunges for the peck */}
      <group position={[0, 0.46 - 0.12 * g.peck, 0.16 + 0.12 * g.peck]} rotation={[0.9 * g.peck, 0, 0]}>
        <M g={sphG(0.1, 16)} c="#f8f8f4" p={[0, 0, 0]} />
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.055, 0.03, 0.07]} scale={eyeS}>
            {eye === "closed" ? (
              <mesh geometry={boxG(0.04, 0.008, 0.01)} material={coreMat("#1a1414", 1)} />
            ) : (
              <>
                <mesh geometry={sphG(0.026, 10)} material={coreMat("#fbfbf6", 1)} />
                <mesh geometry={sphG(0.026 * pupil, 8)} material={coreMat("#1a1414", 1)} position={[sd * 0.004, eye === "narrow" ? -0.004 : 0, 0.018]} />
                {eye === "sparkle" ? <mesh geometry={sphG(0.007, 6)} material={coreMat("#ffffff", 1)} position={[0.008, 0.01, 0.03]} /> : null}
                {eye === "narrow" ? <mesh geometry={boxG(0.06, 0.02, 0.02)} material={coreMat("#f8f8f4", 1)} position={[0, 0.02, 0.012]} /> : null}
              </>
            )}
            <mesh geometry={boxG(0.05, 0.01, 0.01)} material={coreMat("#6a6a72", 1)} position={[0, 0.038 - 0.006 * g.face.brow, 0.012]} rotation={[0, 0, sd * 0.45 * g.face.brow]} />
          </group>
        ))}
        {/* the beak: upper and lower, the red spot; it opens */}
        <M g={coneG(0.032, 0.15, 8)} c="#f0c030" p={[0, -0.005, 0.15]} r={[PI / 2 - 0.08, 0, 0]} s={[1, 1, 0.7]} />
        <group rotation={[0.45 * g.face.beak, 0, 0]} position={[0, -0.02, 0.08]}>
          <M g={coneG(0.026, 0.12, 8)} c="#e8b028" p={[0, -0.005, 0.06]} r={[PI / 2 + 0.12, 0, 0]} s={[1, 1, 0.6]} />
          <M g={sphG(0.011, 6)} c="#d8302a" p={[0, -0.006, 0.09]} />
        </group>
      </group>
      {/* legs: they step in turn while waddling */}
      {[-1, 1].map((sd) => {
        const lift = Math.max(0, Math.sin(g.step * PI + (sd > 0 ? 0 : PI))) * 0.05;
        return (
          <group key={sd} position={[sd * 0.06, lift, 0.02]}>
            <M g={cylG(0.012, 0.012, 0.17, 6)} c="#e8a8a0" p={[0, 0.1, 0]} />
            <M g={coneG(0.045, 0.06, 3)} c="#e8a8a0" p={[0, 0.01, 0.03]} r={[PI / 2, 0, 0]} s={[1, 1, 0.25]} />
          </group>
        );
      })}
    </group>
  );
};

// ------------------------------------------------------------------ small props
export const PocketWatch: React.FC<{ p: V3; minutes: number; open?: number; s?: number }> = ({ p, minutes, s = 1 }) => (
  <group position={p} scale={s} rotation={[-0.4, 0, 0]}>
    <M g={cylG(0.06, 0.06, 0.018, 24)} c="#c8a040" tex="metal" r={[PI / 2, 0, 0]} />
    <mesh geometry={cylG(0.052, 0.052, 0.004, 24)} material={coreMat("#f8f2e0", 1)} position={[0, 0, 0.011]} rotation={[PI / 2, 0, 0]} />
    <group position={[0, 0, 0.014]} rotation={[0, 0, -((9 + minutes / 60) / 12) * PI * 2]}>
      <mesh geometry={boxG(0.006, 0.026, 0.002)} material={coreMat("#1a1420", 1)} position={[0, 0.012, 0]} />
    </group>
    <group position={[0, 0, 0.016]} rotation={[0, 0, -(minutes / 60) * PI * 2]}>
      <mesh geometry={boxG(0.004, 0.04, 0.002)} material={coreMat("#c8281e", 1)} position={[0, 0.019, 0]} />
    </group>
    <M g={torG(0.012, 0.004)} c="#c8a040" p={[0, 0.068, 0]} />
  </group>
);
export const Bread: React.FC<{ p: V3; s?: number; rot?: number }> = ({ p, s = 1, rot = 0 }) => (
  <group position={p} scale={s} rotation={[rot, rot * 0.6, 0]}>
    <M g={boxG(0.09, 0.05, 0.07)} c="#d89a52" tex="wood" />
    <M g={boxG(0.075, 0.051, 0.055)} c="#f4e2b8" p={[0, 0.002, 0]} />
  </group>
);
void clamp;
