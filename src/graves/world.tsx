// The Graves short's world: a clifftop cemetery on a round headland over the animated sea (the gull short's Sea, its
// foam rings sit at the cliff foot). A low stone wall with a two-post iron gate on the landward side, a road beyond
// it, old mossy gravestones in uneven rows, the new row of 22 slots (white stones with names, the last two empty,
// marked by stakes), a bare tree, the stonemason's pickup truck, and a small fishing boat for the 1931 storm shot.
// Names are drawn into the stone faces (one solid per face, no decal planes: nothing coplanar to z-fight).
import React from "react";
import * as THREE from "three";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { Gull, Lighthouse, Rock, Sea, SEA_Y, Tuft, waveH } from "../gull/world";

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
    {/* the rounded top: a disc 2 cm thinner than the slab (1 cm inset front and back: no shared faces), lower half inside */}
    <M g={cylG(0.23, 0.23, 0.08, 24)} c={isNew ? "#dddad2" : "#868a80"} p={[0, 0.66, -0.015]} r={[PI / 2, 0, 0]} />
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
    <M g={boxG(1.66, 0.62, 1.3)} c="#7a3a2e" p={[0, 1.3, 0.55]} />
    <M g={boxG(1.36, 0.34, 0.04)} c="#2a3440" p={[0, 1.36, 1.21]} />
    <M g={boxG(1.6, 0.12, 0.9)} c="#6a3026" p={[0, 1.06, 1.5]} />
    <M g={boxG(0.8, 0.16, 0.04)} c="#5a5a62" p={[0, 0.74, 2.01]} />
    <M g={boxG(1.6, 0.06, 2.0)} c="#3a2a26" p={[0, 1.02, -0.9]} />
    {[-1, 1].map((sd) => (
      <M key={sd} g={boxG(0.06, 0.32, 2.0)} c="#7a3a2e" p={[sd * 0.82, 1.17, -0.9]} />
    ))}
    {stone ? <Gravestone p={[0, 1.05, -1.0]} name="" dim={dim} /> : null}
    <TruckDetail />
    {[[-0.82, 1.25], [0.82, 1.25], [-0.82, -1.3], [0.82, -1.3]].map(([x, z], i) => (
      <group key={i} position={[x, 0.38, z]} rotation={[roll, 0, 0]}>
        <M g={cylG(0.38, 0.38, 0.26, 16)} c="#1e1e22" r={[0, 0, PI / 2]} />
        <M g={boxG(0.27, 0.1, 0.5)} c="#5a5a60" />
      </group>
    ))}
    {[-0.6, 0.6].map((x) => (
      <mesh key={x} geometry={sphG(0.09, 10)} position={[x, 0.8, 2.02]} material={coreMat("#fff4d0", 0.6 + 1.0 * lights)} userData={{ outline: false }} />
    ))}
    {lights > 0.05 ? <spotLight position={[0, 0.9, 2.1]} target-position={[0, 0, 9]} color="#fff0d0" intensity={14 * lights} distance={16} angle={0.5} penumbra={0.6} decay={1.4} /> : null}
  </group>
);

// ------------------------------------------------------------------ the Margaret Ann: a small trawler that rides the swell, then founders
export const Boat: React.FC<{ p: V3; t: number; sink: number; heel: number }> = ({ p, t, sink, heel }) => {
  const y = SEA_Y + waveH(p[0], p[2], t) + 0.35 - 3.2 * sink * sink;
  const pitch = 0.12 * Math.sin(t * 1.3) + 0.5 * sink;
  return (
    <group position={[p[0], y, p[2]]} rotation={[pitch, 0.6, 0.08 * Math.sin(t * 0.9) + heel]}>
      <M g={boxG(1.7, 1.1, 5.0)} c="#8a2e2a" p={[0, 0.25, 0]} />
      <M g={boxG(1.74, 0.08, 5.04)} c="#4a1a18" p={[0, 0.83, 0]} />
      <M g={coneG(0.88, 1.5, 4)} c="#8a2e2a" p={[0, 0.25, 3.2]} r={[PI / 2, PI / 4, 0]} s={[1, 1, 0.62]} />
      <M g={boxG(1.5, 0.06, 4.8)} c="#7a5a3a" p={[0, 0.9, 0]} />
      <M g={boxG(1.1, 0.9, 1.4)} c="#e8e2d0" p={[0, 1.3, -0.9]} />
      <M g={boxG(0.8, 0.26, 0.04)} c="#ffd890" p={[0, 1.45, -0.18]} />
      <M g={boxG(1.12, 0.14, 1.5)} c="#2e4a6a" p={[0, 1.8, -0.9]} />
      <M g={cylG(0.05, 0.06, 3.0, 8)} c="#5a4a3a" p={[0, 2.1, 1.0]} />
      <M g={cylG(0.03, 0.03, 2.0, 6)} c="#5a4a3a" p={[0, 2.2, 1.0]} r={[0, 0, PI / 2 - 0.3]} />
      <BoatDetail />
    </group>
  );
};

// ================================================================== detail pass: dressing, life, weather

/** deterministic scatter inside the yard that keeps clear of the row, the path and the stones */
const clearOf = (x: number, z: number) => {
  if (Math.abs(z - ROW_Z) < 0.55) return false; // the new row
  if (Math.abs(x) < 0.9 && z > ROW_Z) return false; // the path from the gate
  for (let i = 0; i < 30; i++) {
    const r = Math.floor(i / 10), c = i % 10;
    const sx = -6.2 + c * 1.35 + (h1(i) - 0.5) * 0.4, sz = -1.2 - r * 1.5 + (h1(i + 9) - 0.5) * 0.3;
    if (Math.hypot(x - sx, z - sz) < 0.45) return false;
  }
  return true;
};
const SCATTER = (() => {
  const out: { x: number; z: number; k: number; s: number }[] = [];
  for (let i = 0; out.length < 140 && i < 2000; i++) {
    const x = WALL.x0 + 0.5 + h1(i * 7 + 1) * (WALL.x1 - WALL.x0 - 1);
    const z = WALL.z0 + 0.5 + h1(i * 7 + 2) * (WALL.z1 - WALL.z0 - 1);
    if (clearOf(x, z)) out.push({ x, z, k: Math.floor(h1(i * 7 + 3) * 10), s: 0.5 + h1(i * 7 + 4) * 0.6 });
  }
  return out;
})();
const FLOWER = ["#f4e04a", "#ffffff", "#e8789a", "#9a7ae8"];
const Flower: React.FC<{ p: V3; c: string; s: number }> = ({ p, c, s }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.006, 0.006, 0.2, 4)} c="#4a7a3a" p={[0, 0.1, 0]} cast={false} />
    <M g={sphG(0.035, 8)} c={c} p={[0, 0.21, 0]} cast={false} />
  </group>
);
const Cross: React.FC<{ p: V3; ry: number; tilt: number }> = ({ p, ry, tilt }) => (
  <group position={p} rotation={[tilt, ry, 0]}>
    <M g={boxG(0.4, 0.1, 0.26)} c="#7a7c72" p={[0, 0.05, 0]} />
    <M g={boxG(0.1, 0.9, 0.08)} c="#86887e" p={[0, 0.55, 0]} />
    <M g={boxG(0.44, 0.09, 0.08)} c="#86887e" p={[0, 0.72, 0]} />
  </group>
);
const Obelisk: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(0.5, 0.2, 0.5)} c="#7a7c72" p={[0, 0.1, 0]} />
    <M g={cylG(0.12, 0.18, 1.3, 4)} c="#8a8c82" p={[0, 0.85, 0]} r={[0, PI / 4, 0]} />
    <M g={coneG(0.13, 0.22, 4)} c="#8a8c82" p={[0, 1.61, 0]} r={[0, PI / 4, 0]} />
  </group>
);
const Vase: React.FC<{ p: V3; c: string }> = ({ p, c }) => (
  <group position={p}>
    <M g={cylG(0.05, 0.035, 0.12, 10)} c="#6a6a72" p={[0, 0.06, 0]} />
    {[0, 1, 2].map((k) => (
      <Flower key={k} p={[Math.sin(k * 2.1) * 0.025, 0.08, Math.cos(k * 2.1) * 0.025]} c={c} s={0.8} />
    ))}
  </group>
);
const Wreath: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={torG(0.11, 0.035)} c="#3e6a3a" r={[-0.25, 0, 0]} />
    {[0, 1, 2, 3, 4, 5].map((k) => (
      <M key={k} g={sphG(0.022, 6)} c={k % 2 ? "#d8303a" : "#f4e04a"} p={[Math.cos(k) * 0.11, Math.sin(k) * 0.11, 0.03]} cast={false} />
    ))}
  </group>
);
const Cypress: React.FC<{ p: V3; s?: number }> = ({ p, s = 1 }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.08, 0.12, 0.5, 8)} c="#4a3a2a" p={[0, 0.25, 0]} />
    <M g={coneG(0.55, 3.2, 10)} c="#2e5a36" p={[0, 2.0, 0]} />
    <M g={coneG(0.42, 2.0, 10)} c="#3a6a40" p={[0, 2.9, 0]} />
  </group>
);
const Bush: React.FC<{ p: V3; seed: number }> = ({ p, seed }) => (
  <group position={p}>
    {[0, 1, 2].map((k) => (
      <M key={k} g={sphG(0.45, 10)} c={k % 2 ? "#4a7a3e" : "#3e6a36"} p={[Math.sin(k * 2.2 + seed) * 0.35, 0.32 + 0.08 * k, Math.cos(k * 2.2 + seed) * 0.3]} s={0.8 + 0.3 * h1(seed + k)} />
    ))}
  </group>
);
const Chapel: React.FC<{ p: V3; ry: number; lit: number }> = ({ p, ry, lit }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <M g={boxG(3.0, 2.6, 4.2)} c="#d8d0c0" p={[0, 1.3, 0]} recv={false} />
    <M g={coneG(2.4, 1.6, 4)} c="#5a4a4a" p={[0, 3.4, 0]} r={[0, PI / 4, 0]} s={[1, 1, 1.4]} />
    <M g={boxG(1.1, 2.8, 1.1)} c="#e0d8c8" p={[0, 4.0, 2.2]} recv={false} />
    <M g={coneG(0.85, 2.0, 4)} c="#5a4a4a" p={[0, 6.4, 2.2]} r={[0, PI / 4, 0]} />
    <M g={boxG(0.06, 0.5, 0.06)} c="#c8a040" p={[0, 7.65, 2.2]} />
    <M g={boxG(0.3, 0.06, 0.06)} c="#c8a040" p={[0, 7.75, 2.2]} />
    <M g={boxG(0.9, 1.5, 0.05)} c="#5a3a2a" p={[0, 0.75, 2.76]} />
    {[-0.9, 0.9].map((x) => (
      <mesh key={x} geometry={boxG(0.5, 0.9, 0.05)} position={[x, 1.6, 2.13]} material={coreMat(lit > 0.5 ? "#ffd890" : "#3a4a6a", lit > 0.5 ? 1.6 : 0.6)} />
    ))}
  </group>
);
/** gulls circling high over the headland (day scenes only) */
const SkyGulls: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {[0, 1, 2].map((k) => {
      const a = t * (0.25 + 0.05 * k) + k * 2.1;
      const r = 6 + 2 * k;
      const p: V3 = [Math.cos(a) * r, 7 + k * 1.2 + 0.3 * Math.sin(t + k), -4 + Math.sin(a) * r];
      return <Gull key={k} g={{ p, yaw: a + PI, tilt: 0.3, bob: 0, flap: 0.5 + 0.5 * Math.sin(t * 9 + k), fold: 0, peck: 0, step: 0, face: { eyes: "normal", brow: 0, beak: 0 }, s: 1.4 }} />;
    })}
  </group>
);
/** a small grave lantern at the foot of the named stones (lit at night) */
const Lantern: React.FC<{ p: V3; on: number }> = ({ p, on }) => (
  <group position={p}>
    <M g={boxG(0.12, 0.02, 0.12)} c="#2a2a30" p={[0, 0.01, 0]} />
    <mesh geometry={boxG(0.09, 0.14, 0.09)} position={[0, 0.09, 0]} material={coreMat(on > 0.5 ? "#ffcf70" : "#e8e4d8", on > 0.5 ? 1.8 : 0.5, 0.9)} />
    <M g={coneG(0.08, 0.06, 4)} c="#2a2a30" p={[0, 0.19, 0]} r={[0, PI / 4, 0]} />
    {on > 0.5 ? <pointLight position={[0, 0.2, 0.1]} color="#ffb860" intensity={1.6} distance={2.2} decay={1.8} /> : null}
  </group>
);
export const CHAPEL: V3 = [-11.2, 0, 1.0];
export const Dressing: React.FC<{ s: YardState; day: boolean }> = ({ s, day }) => (
  <group>
    {/* the gravel path from the gate to the new row, 3 cm proud of the grass */}
    <M g={boxG(1.2, 0.03, WALL.z1 - ROW_Z - 0.4)} c="#b8ae9a" p={[0, 0.035, (WALL.z1 + ROW_Z + 0.4) / 2]} cast={false} />
    {SCATTER.map((q, i) => (q.k < 6 ? <Tuft key={i} p={[q.x, 0.02, q.z]} s={q.s * 0.7} seed={i} /> : <Flower key={i} p={[q.x, 0.02, q.z]} c={FLOWER[q.k % 4]} s={q.s} />))}
    <Cross p={[-4.3, 0, -2.4]} ry={0.1} tilt={0.05} />
    <Cross p={[3.9, 0, -5.2]} ry={-0.2} tilt={-0.08} />
    <Obelisk p={[5.3, 0, -3.45]} />
    <Obelisk p={[-2.0, 0, -5.2]} />
    {[[-3.4, -1.0], [1.7, -2.6], [4.6, -1.0], [-0.8, -4.0]].map(([x, z], k) => (
      <Vase key={k} p={[x, 0.02, z + 0.25]} c={FLOWER[k % 4]} />
    ))}
    {[9, 10, 11].map((i) => (
      <Wreath key={i} p={[slotX(i), 0.16, ROW_Z + 0.16]} />
    ))}
    <Lantern p={[slotX(10.5), 0.02, ROW_Z + 0.35]} on={s.lamp} />
    <Cypress p={[-7.7, 0, 7.2]} />
    <Cypress p={[7.7, 0, 7.2]} s={0.9} />
    <Cypress p={[7.6, 0, -5.6]} s={1.1} />
    <Bush p={[-7.6, 0, 2.6]} seed={1} />
    <Bush p={[7.5, 0, 1.0]} seed={2} />
    <Bush p={[-3.2, 0, 7.4]} seed={3} />
    {/* capstones along the wall top and ivy on the inner face (both stand proud by >= 3 cm) */}
    {[[WALL.x0, 0, WALL.z0, WALL.x1, 0, WALL.z0], [WALL.x0, 0, WALL.z0, WALL.x0, 0, WALL.z1], [WALL.x1, 0, WALL.z0, WALL.x1, 0, WALL.z1]].map(([ax, , az, bx, , bz], k) => {
      const L = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      return <M key={k} g={boxG(0.5, 0.08, L + 0.1)} c="#9a948a" p={[(ax + bx) / 2, 0.94, (az + bz) / 2]} r={[0, yaw, 0]} />;
    })}
    {[[-5.0, WALL.z0 + 0.24, 0], [2.4, WALL.z0 + 0.24, 0], [WALL.x0 + 0.24, -1.5, PI / 2], [WALL.x1 - 0.24, 3.8, PI / 2]].map(([x, z, ry], k) => (
      <M key={k} g={boxG(1.6, 0.7, 0.06)} c="#3e6a36" p={[x, 0.45, z]} r={[0, ry, 0]} />
    ))}
    {/* rocks along the cliff rim */}
    {Array.from({ length: 14 }, (_, k) => {
      const a = (k / 14) * PI * 2 + 0.2;
      return <Rock key={k} p={[Math.cos(a) * (CLIFF_R - 0.6), 0.1, Math.sin(a) * (CLIFF_R - 0.6)]} s={0.5 + 0.4 * h1(k)} seed={k} />;
    })}
    <Chapel p={CHAPEL} ry={PI / 2} lit={s.lamp} />
    {/* a far headland across the water with its own lighthouse */}
    <group position={[58, 0, -86]} scale={0.55}>
      <M g={cylG(16, 20, 14, 24)} c="#6e6a62" tex="rock" p={[0, -4, 0]} recv={false} />
      <M g={cylG(15.9, 15.9, 0.1, 24)} c="#5f8a48" p={[0, 3.05, 0]} cast={false} />
      <group position={[0, 3.1, 0]}>
        <Lighthouse s={{ on: s.lamp, beam: s.lamp, t: s.t, lever: 0 }} />
      </group>
    </group>
    {day ? <SkyGulls t={s.t} /> : null}
  </group>
);

// ------------------------------------------------------------------ the storm: rain streaks near the lens
export const Rain: React.FC<{ t: number; at: V3 }> = ({ t, at }) => (
  <group position={at}>
    {Array.from({ length: 90 }, (_, k) => {
      const x = (h1(k) - 0.5) * 14;
      const z = (h1(k + 50) - 0.5) * 14;
      const y = 6 - (((t * 9 + h1(k + 99) * 7) % 7) + 0);
      return <mesh key={k} geometry={boxG(0.012, 0.5, 0.012)} position={[x, y, z]} rotation={[0, 0, 0.18]} material={coreMat("#c8d8f0", 0.9, 0.45)} userData={{ outline: false }} />;
    })}
  </group>
);

// ------------------------------------------------------------------ boat and truck details (drawn with them)
export const BoatDetail: React.FC = () => (
  <group>
    <Label text="MARGARET ANN" p={[0.9, 0.42, 0.6]} r={[0, PI / 2, 0]} w={2.4} h={0.32} fg="#f0e8d0" bg="none" />
    <M g={torG(0.22, 0.06)} c="#f05a3a" p={[0.6, 1.3, -0.4]} r={[0, PI / 2, 0]} />
    <M g={boxG(0.5, 0.4, 0.5)} c="#8a6a3a" p={[-0.4, 1.13, 1.2]} />
    <M g={boxG(0.45, 0.35, 0.45)} c="#7a5a30" p={[0.35, 1.1, 1.7]} />
    <M g={coneG(0.4, 0.5, 8)} c="#3a4a3a" p={[0.1, 1.15, -2.1]} />
    {[-1, 1].map((sd) => (
      <M key={sd} g={boxG(0.3, 0.2, 0.04)} c="#2a3440" p={[sd * 0.3, 1.5, -1.61]} />
    ))}
    <M g={cylG(0.09, 0.11, 0.6, 10)} c="#2a2a30" p={[0.0, 2.1, -1.2]} />
  </group>
);
export const TruckDetail: React.FC = () => (
  <group>
    {[-1, 1].map((sd) => (
      <M key={sd} g={boxG(0.08, 0.16, 0.12)} c="#2a2a30" p={[sd * 0.92, 1.45, 1.1]} />
    ))}
    <M g={boxG(1.78, 0.12, 0.14)} c="#9a9aa2" p={[0, 0.55, 2.06]} />
    <M g={boxG(1.78, 0.12, 0.14)} c="#9a9aa2" p={[0, 0.55, -2.06]} />
    <Label text="HSR 931" p={[0, 0.72, -2.14]} r={[0, PI, 0]} w={0.42} h={0.14} fg="#1a1a20" bg="#f0e8c8" />
    {/* ropes over the stone in the bed, a toolbox against the cab */}
    {[-1.15, -0.85].map((z) => (
      <M key={z} g={boxG(1.62, 0.025, 0.025)} c="#c8b080" p={[0, 1.78, z]} />
    ))}
    <M g={boxG(1.4, 0.26, 0.3)} c="#c8a030" p={[0, 1.18, -0.05]} />
  </group>
);
