// The Graves short's world: a clifftop cemetery on a round headland over the animated sea (the gull short's Sea, its
// foam rings sit at the cliff foot). A low stone wall with a two-post iron gate on the landward side, a road beyond
// it, old mossy gravestones in uneven rows, the new row of 22 slots (white stones with names, the last two empty,
// marked by stakes), a bare tree, the stonemason's pickup truck, and a small fishing boat for the 1931 storm shot.
// Names are drawn into the stone faces (one solid per face, no decal planes: nothing coplanar to z-fight).
import React from "react";
import * as THREE from "three";
import { boxG, canvasTex, coneG, coreMat, cylG, M, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { Sea, SEA_Y, waveH } from "../gull/world";

const PI = Math.PI;
export const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ layout
export const CLIFF_R = 14.6;
export const WALL = { x0: -8.5, x1: 8.5, z0: -6.5, z1: 8 };
export const GATE: V3 = [0, 0, WALL.z1];
export const GATE_HW = 1.0; // gate half width (posts at +-1)
export const ROAD_Z = 10.6;
/** the new row: 22 slots along x at z 1.8; 20 are filled */
export const ROW_Z = 1.8;
export const SLOT_DX = 0.62;
export const slotX = (i: number) => (i - 10.5) * SLOT_DX;
export const FILLED = 20;
const FIRST = ["Thomas", "Ellis Mae", "Jonah", "Walter", "Amos", "Henry", "Silas", "Owen", "Peter", "Calvin", "Josiah", "Eli", "Frank", "Gideon", "Lyle", "Martin", "Ned", "Abel", "Ruben", "Isaac", "Cyrus", "Dale"];
const LAST = ["Reed", "Carter", "Hale", "Brandt", "Doyle", "Finch", "Marsh", "Pike", "Lowell", "Stone", "Wade", "Crane", "Holt", "Penn", "Ash", "Burke", "Shaw", "Nash", "Cole", "Frost", "Lund", "Rowe"];
/** the three named in the voiceover sit in the middle of the row (slots 9, 10, 11) */
export const NAMES: string[] = Array.from({ length: 22 }, (_, i) => {
  const k = i === 9 ? 0 : i === 10 ? 1 : i === 11 ? 2 : i < 9 ? i + 3 : i;
  return `${FIRST[k % 22]} ${LAST[k % 22]}`.toUpperCase();
});
export const stoneTop = 0.72;
export const stoneAt = (i: number): V3 => [slotX(i), 0, ROW_Z];

// ------------------------------------------------------------------ a gravestone: a base, a slab whose front face carries the name
const faceMat = (name: string, newStone: boolean, dim: number) => {
  const key = `gs|${name}|${newStone ? 1 : 0}|${dim.toFixed(2)}`;
  const tex = canvasTex(key, 256, 384, (g, w, h) => {
    g.fillStyle = newStone ? "#e8e6df" : "#8e9086";
    g.fillRect(0, 0, w, h);
    if (!newStone) {
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(80,110,60,${0.15 + 0.2 * h1(i)})`;
        g.beginPath();
        g.arc(h1(i * 3) * w, h * (0.55 + 0.45 * h1(i * 5)), 6 + 18 * h1(i * 7), 0, PI * 2);
        g.fill();
      }
    }
    if (name) {
      g.fillStyle = newStone ? "#4a4a50" : "#5a5c54";
      g.textAlign = "center";
      g.font = "800 30px Poppins";
      const parts = name.split(" ");
      const lines = parts.length > 2 ? [parts.slice(0, 2).join(" "), parts[2]] : parts;
      lines.forEach((ln, k) => {
        let fs = 34;
        g.font = `800 ${fs}px Poppins`;
        while (g.measureText(ln).width > w * 0.84 && fs > 12) g.font = `800 ${(fs -= 2)}px Poppins`;
        g.fillText(ln, w / 2, h * 0.36 + k * 42);
      });
      g.font = "700 26px Poppins";
      g.fillText(newStone ? "1931" : "", w / 2, h * 0.36 + lines.length * 42 + 18);
      g.strokeStyle = "rgba(60,60,66,0.5)";
      g.lineWidth = 4;
      g.strokeRect(14, 14, w - 28, h - 28);
    }
  });
  const m = new THREE.MeshBasicMaterial({ map: tex });
  m.color.setScalar(dim);
  return m;
};
const matCache = new Map<string, THREE.MeshBasicMaterial>();
const faceMatC = (name: string, newStone: boolean, dim: number) => {
  const k = `${name}|${newStone}|${dim.toFixed(2)}`;
  let m = matCache.get(k);
  if (!m) {
    m = faceMat(name, newStone, dim);
    matCache.set(k, m);
  }
  return m;
};
export const Gravestone: React.FC<{ p: V3; name: string; isNew?: boolean; ry?: number; tilt?: number; dim: number; s?: number }> = ({ p, name, isNew = true, ry = 0, tilt = 0, dim, s = 1 }) => (
  <group position={p} rotation={[tilt, ry, 0]} scale={s}>
    <M g={boxG(0.56, 0.08, 0.26)} c={isNew ? "#cfccc4" : "#7a7c72"} p={[0, 0.04, 0]} />
    {/* the slab: the back body in stone, the front 2 cm a separate solid that carries the name texture */}
    <M g={boxG(0.46, 0.6, 0.1)} c={isNew ? "#dddad2" : "#868a80"} p={[0, 0.38, -0.015]} />
    <mesh geometry={boxG(0.44, 0.58, 0.02)} material={faceMatC(name, isNew, dim)} position={[0, 0.38, 0.045]} castShadow />
    <M g={cylG(0.23, 0.23, 0.12, 18, false, 0, PI)} c={isNew ? "#dddad2" : "#868a80"} p={[0, 0.68, 0]} r={[PI / 2, 0, PI / 2]} />
  </group>
);
const Stake: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(0.04, 0.5, 0.04)} c="#8a6a44" p={[0, 0.25, 0]} />
    <M g={boxG(0.16, 0.05, 0.02)} c="#e8d8a0" p={[0, 0.42, 0.03]} />
  </group>
);

// ------------------------------------------------------------------ wall, gate, tree, road
const WallRun: React.FC<{ a: V3; b: V3 }> = ({ a, b }) => {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  return <M g={boxG(0.4, 0.9, L)} c="#8a8478" tex="rock" p={[(a[0] + b[0]) / 2, 0.45, (a[2] + b[2]) / 2]} r={[0, yaw, 0]} />;
};
const Gate: React.FC = () => (
  <group position={GATE}>
    {[-1, 1].map((sd) => (
      <group key={sd}>
        <M g={boxG(0.45, 1.5, 0.45)} c="#8a8478" tex="rock" p={[sd * (GATE_HW + 0.22), 0.75, 0]} />
        <M g={sphG(0.2, 12)} c="#9a9488" p={[sd * (GATE_HW + 0.22), 1.6, 0]} />
      </group>
    ))}
    {/* the closed iron gate: bars and two rails (the sheriff waits inside it; nobody walks through) */}
    {Array.from({ length: 11 }, (_, i) => (
      <M key={i} g={cylG(0.015, 0.015, 1.2, 6)} c="#2a2a30" p={[-GATE_HW + 0.09 + i * 0.182, 0.65, 0]} />
    ))}
    {[0.2, 1.15].map((y) => (
      <M key={y} g={boxG(GATE_HW * 2, 0.04, 0.03)} c="#2a2a30" p={[0, y, 0]} />
    ))}
  </group>
);
const BareTree: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.14, 0.3, 3.4, 10)} c="#4a3c34" p={[0, 1.7, 0]} />
    {[0, 1, 2, 3, 4].map((i) => (
      <M key={i} g={cylG(0.03, 0.08, 1.6, 6)} c="#4a3c34" p={[Math.sin(i * 1.3) * 0.5, 3.0 + i * 0.12, Math.cos(i * 1.3) * 0.5]} r={[Math.cos(i * 1.3) * 0.7, 0, -Math.sin(i * 1.3) * 0.7]} />
    ))}
  </group>
);

export type YardState = { t: number; filled: number; dim: number; stakes: boolean; lamp: number };
/** the headland: a round cliff (top at y 0), the grass 2 cm above the cliff top, the yard on it */
export const Yard: React.FC<{ s: YardState }> = ({ s }) => (
  <group>
    <Sea t={s.t} color="#2a5a78" />
    <M g={cylG(CLIFF_R, CLIFF_R + 1.2, -SEA_Y + 0.5, 40)} c="#6e6a62" tex="rock" p={[0, (SEA_Y - 0.5) / 2 - 0.02, 0]} recv={false} />
    <M g={cylG(CLIFF_R - 0.05, CLIFF_R - 0.05, 0.04, 40)} c="#5f8a48" p={[0, 0.0, 0]} cast={false} />
    {/* the road, outside the wall, 3 cm proud of the grass */}
    <M g={boxG(26, 0.03, 2.6)} c="#6a6460" p={[0, 0.05, ROAD_Z]} cast={false} />
    <WallRun a={[WALL.x0, 0, WALL.z0]} b={[WALL.x1, 0, WALL.z0]} />
    <WallRun a={[WALL.x0, 0, WALL.z0]} b={[WALL.x0, 0, WALL.z1]} />
    <WallRun a={[WALL.x1, 0, WALL.z0]} b={[WALL.x1, 0, WALL.z1]} />
    <WallRun a={[WALL.x0, 0, WALL.z1]} b={[-GATE_HW - 0.45, 0, WALL.z1]} />
    <WallRun a={[GATE_HW + 0.45, 0, WALL.z1]} b={[WALL.x1, 0, WALL.z1]} />
    <Gate />
    <BareTree p={[-6.2, 0, -4.3]} />
    {/* the old yard: weathered stones in uneven rows behind the new row */}
    {Array.from({ length: 30 }, (_, i) => {
      const r = Math.floor(i / 10);
      const c = i % 10;
      const x = -6.2 + c * 1.35 + (h1(i) - 0.5) * 0.4;
      const z = -1.2 - r * 1.5 + (h1(i + 9) - 0.5) * 0.3;
      return <Gravestone key={i} p={[x, 0, z]} name={h1(i + 3) > 0.4 ? " " : ""} isNew={false} ry={(h1(i + 5) - 0.5) * 0.25} tilt={(h1(i + 7) - 0.5) * 0.12} dim={s.dim} s={0.9 + 0.2 * h1(i + 11)} />;
    })}
    {/* the new row */}
    {Array.from({ length: Math.min(22, s.filled) }, (_, i) => (
      <Gravestone key={`n${i}`} p={stoneAt(i)} name={NAMES[i]} dim={s.dim} />
    ))}
    {s.stakes ? [20, 21].map((i) => <Stake key={i} p={stoneAt(i)} />) : null}
    {/* a lamppost by the gate (lit at night) */}
    <group position={[2.4, 0, WALL.z1 + 0.6]}>
      <M g={cylG(0.05, 0.07, 3.0, 10)} c="#2e3440" p={[0, 1.5, 0]} />
      <mesh geometry={sphG(0.12, 12)} position={[0, 3.05, 0]} material={coreMat(s.lamp > 0.5 ? "#ffd890" : "#d8d4c8", s.lamp > 0.5 ? 2.2 : 0.6)} />
      {s.lamp > 0.5 ? <pointLight position={[0, 2.9, 0]} color="#ffcf80" intensity={6} distance={9} decay={1.6} /> : null}
    </group>
  </group>
);

// ------------------------------------------------------------------ the pickup truck (drives along the road, wheels roll with distance)
export const Truck: React.FC<{ p: V3; yaw: number; roll: number; lights: number; stone?: boolean; dim: number }> = ({ p, yaw, roll, lights, stone = true, dim }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(1.7, 0.5, 4.0)} c="#7a3a2e" p={[0, 0.75, 0]} />
    <M g={boxG(1.66, 0.62, 1.5)} c="#7a3a2e" p={[0, 1.3, 0.9]} />
    <M g={boxG(1.5, 0.42, 0.04)} c="#9ac0d8" p={[0, 1.36, 1.66]} />
    <M g={boxG(1.6, 0.06, 2.0)} c="#3a2a26" p={[0, 1.02, -0.9]} />
    {[-1, 1].map((sd) => (
      <M key={sd} g={boxG(0.06, 0.32, 2.0)} c="#7a3a2e" p={[sd * 0.82, 1.17, -0.9]} />
    ))}
    {stone ? <Gravestone p={[0, 1.05, -1.0]} name="" dim={dim} /> : null}
    {[[-0.82, 1.25], [0.82, 1.25], [-0.82, -1.3], [0.82, -1.3]].map(([x, z], i) => (
      <group key={i} position={[x, 0.38, z]} rotation={[roll, 0, 0]}>
        <M g={cylG(0.38, 0.38, 0.26, 16)} c="#1e1e22" r={[0, 0, PI / 2]} />
        <M g={boxG(0.27, 0.1, 0.5)} c="#5a5a60" />
      </group>
    ))}
    {[-0.6, 0.6].map((x) => (
      <mesh key={x} geometry={sphG(0.09, 10)} position={[x, 0.85, 2.0]} material={coreMat("#fff4d0", 0.5 + 2 * lights)} />
    ))}
    {lights > 0.05 ? <spotLight position={[0, 0.9, 2.1]} target-position={[0, 0, 9]} color="#fff0d0" intensity={14 * lights} distance={16} angle={0.5} penumbra={0.6} decay={1.4} /> : null}
  </group>
);

// ------------------------------------------------------------------ the Margaret Ann: a small trawler that rides the swell, then founders
export const Boat: React.FC<{ p: V3; t: number; sink: number; heel: number }> = ({ p, t, sink, heel }) => {
  const y = SEA_Y + waveH(p[0], p[2], t) - 0.15 - 2.6 * sink * sink;
  const pitch = 0.12 * Math.sin(t * 1.3) + 0.5 * sink;
  return (
    <group position={[p[0], y, p[2]]} rotation={[pitch, 0.6, 0.08 * Math.sin(t * 0.9) + heel]}>
      <M g={boxG(1.6, 0.8, 5.0)} c="#2e4a6a" p={[0, 0.2, 0]} />
      <M g={coneG(0.82, 1.4, 4)} c="#2e4a6a" p={[0, 0.2, 3.1]} r={[PI / 2, PI / 4, 0]} s={[1, 1, 0.55]} />
      <M g={boxG(1.62, 0.12, 5.0)} c="#c8c2b0" p={[0, 0.62, 0]} />
      <M g={boxG(1.1, 0.9, 1.3)} c="#e8e2d0" p={[0, 1.1, -0.6]} />
      <M g={boxG(0.9, 0.3, 0.04)} c="#ffd890" p={[0, 1.25, 0.06]} />
      <M g={cylG(0.05, 0.06, 3.0, 8)} c="#5a4a3a" p={[0, 2.1, 1.0]} />
      <M g={cylG(0.03, 0.03, 2.0, 6)} c="#5a4a3a" p={[0, 2.2, 1.0]} r={[0, 0, PI / 2 - 0.3]} />
    </group>
  );
};
