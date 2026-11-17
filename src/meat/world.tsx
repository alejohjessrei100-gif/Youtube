// The Kentucky meat shower sets (one drawn at a time, each around the origin):
//   Farm   : an 1876 farmyard — log cabin with porch and chimney, a calendar, a well, clothesline, woodpile, wash bench,
//            barn, fences with a gate, hills, chickens, a soap kettle over a fire with smoke, the meat rain, vultures
//   Lab    : a scientist's room — shelves of specimen jars, a microscope, an oil lamp, books, labels
//   Museum : a glass case with the last chunk in a jar, a label, a framed newspaper, rope stanchions
import React from "react";
import * as THREE from "three";
import { boxG, coneG, coreMat, cylG, Flame, Label, M, Smoke, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ meat
export const MEAT = "#b8343c";
/** a lumpy chunk of meat: two blobs and a fatty streak; `splat` flattens it on landing */
export const Chunk: React.FC<{ p: V3; s?: number; seed?: number; splat?: number; rot?: number }> = ({ p, s = 1, seed = 0, splat = 0, rot = 0 }) => {
  const sq = 1 - 0.55 * splat;
  return (
    <group position={p} rotation={[h1(seed) * 3 + rot, h1(seed + 1) * 6 + rot * 0.7, 0]} scale={[s * (1 + 0.3 * splat), s * sq, s * (1 + 0.3 * splat)]}>
      <M g={sphG(0.08, 12)} c={MEAT} s={[1.3, 0.75, 1]} />
      <M g={sphG(0.06, 10)} c="#c8464a" p={[0.06, 0.02, 0.03]} />
      <M g={sphG(0.035, 8)} c="#f0d8c8" p={[-0.05, 0.035, 0.02]} s={[1.6, 0.5, 0.8]} cast={false} />
    </group>
  );
};

// ------------------------------------------------------------------ animals
/** a chicken: pecks (peck 0..1 lowers the head), hops when scared */
export const Chicken: React.FC<{ p: V3; yaw: number; peck: number; hop?: number; flap?: number }> = ({ p, yaw, peck, hop = 0, flap = 0 }) => (
  <group position={[p[0], p[1] + hop, p[2]]} rotation={[0, yaw, 0]}>
    <M g={sphG(0.17, 14)} c="#f4f0e4" p={[0, 0.3, 0]} s={[1, 0.85, 1.25]} />
    <M g={coneG(0.09, 0.2, 8)} c="#e8e4d8" p={[0, 0.38, -0.2]} r={[-0.9, 0, 0]} />
    {[-1, 1].map((s) => (
      <M key={s} g={boxG(0.03, 0.12, 0.22)} c="#e8e2d2" p={[s * 0.16, 0.32, -0.01]} r={[0, 0, s * (0.2 + 0.9 * flap)]} />
    ))}
    <group position={[0, 0.42, 0.15]} rotation={[0.9 * peck, 0, 0]}>
      <M g={sphG(0.08, 12)} c="#f4f0e4" p={[0, 0.06, 0.06]} />
      <M g={coneG(0.025, 0.07, 6)} c="#e8a020" p={[0, 0.05, 0.15]} r={[PI / 2, 0, 0]} />
      <M g={boxG(0.02, 0.06, 0.07)} c="#d8302a" p={[0, 0.14, 0.06]} />
      <mesh geometry={sphG(0.012, 6)} material={coreMat("#1a1414", 1)} position={[0.05, 0.08, 0.1]} />
      <mesh geometry={sphG(0.012, 6)} material={coreMat("#1a1414", 1)} position={[-0.05, 0.08, 0.1]} />
    </group>
    {[-1, 1].map((s) => (
      <M key={s} g={cylG(0.012, 0.012, 0.16, 6)} c="#e8a020" p={[s * 0.06, 0.08, 0]} />
    ))}
  </group>
);
/** a turkey vulture: dark body, wings flap (flap angle), a bald red head that lunges forward to throw up */
export const Vulture: React.FC<{ p: V3; yaw: number; flap: number; bank?: number; lunge?: number; s?: number }> = ({ p, yaw, flap, bank = 0, lunge = 0, s = 1 }) => (
  <group position={p} rotation={[0, yaw, bank]} scale={s}>
    <M g={sphG(0.35, 14)} c="#2a2226" p={[0, 0, 0]} s={[0.9, 0.75, 1.6]} />
    <M g={coneG(0.22, 0.5, 8)} c="#241e22" p={[0, 0, -0.75]} r={[-PI / 2, 0, 0]} s={[1.4, 1, 0.35]} />
    {[-1, 1].map((sd) => (
      <group key={sd} position={[sd * 0.25, 0.06, 0.05]} rotation={[0, 0, sd * flap]}>
        <M g={boxG(1.35, 0.06, 0.55)} c="#2e262a" p={[sd * 0.68, 0, 0]} />
        <M g={boxG(0.7, 0.05, 0.45)} c="#8a8088" p={[sd * 1.2, -0.01, -0.12]} />
      </group>
    ))}
    <group position={[0, 0.12 - 0.08 * lunge, 0.58 + 0.12 * lunge]} rotation={[0.5 * lunge, 0, 0]}>
      <M g={cylG(0.07, 0.09, 0.2, 8)} c="#c86a6a" r={[PI / 2.4, 0, 0]} />
      <M g={sphG(0.11, 12)} c="#c8483e" p={[0, 0.05, 0.13]} />
      <M g={coneG(0.04, 0.12, 6)} c="#f0e8d0" p={[0, 0.03, 0.27]} r={[PI / 2, 0, 0]} />
      <mesh geometry={sphG(0.018, 6)} material={coreMat("#1a1414", 1)} position={[0.07, 0.09, 0.17]} />
      <mesh geometry={sphG(0.018, 6)} material={coreMat("#1a1414", 1)} position={[-0.07, 0.09, 0.17]} />
    </group>
  </group>
);

// ------------------------------------------------------------------ the farm
export const KETTLE: V3 = [0, 0, 0.78];
export const KETTLE_RIM = 0.78;
export const BENCH: V3 = [-2.0, 0, 1.45];
export const BENCH_TOP = 0.82;
export const CALENDAR: V3 = [1.6, 1.75, -3.47];
const Tree: React.FC<{ p: V3; s?: number }> = ({ p, s = 1 }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.16, 0.24, 2.2, 10)} c="#6a4a32" tex="wood" p={[0, 1.1, 0]} />
    <M g={sphG(1.2, 16)} c="#4a8a3a" p={[0, 2.8, 0]} />
    <M g={sphG(0.85, 14)} c="#5a9a42" p={[0.7, 3.3, 0.3]} />
    <M g={sphG(0.8, 14)} c="#3f7e36" p={[-0.6, 3.1, -0.4]} />
  </group>
);
const Fence: React.FC<{ a: V3; b: V3; n: number }> = ({ a, b, n }) => {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const yaw = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
  return (
    <group position={a} rotation={[0, yaw, 0]}>
      {Array.from({ length: n + 1 }, (_, i) => (
        <M key={i} g={boxG(0.1, 1.1, 0.1)} c="#8a6a4a" tex="wood" p={[(L * i) / n, 0.55, 0]} r={[0, 0, (h1(i) - 0.5) * 0.08]} />
      ))}
      {[0.45, 0.88].map((y) => (
        <M key={y} g={boxG(L, 0.08, 0.05)} c="#a07a52" tex="wood" p={[L / 2, y, 0.07]} />
      ))}
    </group>
  );
};
export type FarmState = { t: number; stir: number; fire?: number; sheets?: number };
export const Farm: React.FC<{ s: FarmState; children?: React.ReactNode }> = ({ s, children }) => {
  const sway = Math.sin(s.t * 1.3) * 0.12 * (s.sheets ?? 1);
  return (
    <group>
      <M g={boxG(300, 0.2, 300)} c="#6a9a4a" tex="grass" ts={1.4} p={[0, -0.1, 0]} cast={false} />
      <M g={cylG(6.5, 6.5, 0.02, 40)} c="#a8865e" tex="sand" p={[0, 0.005, 0.2]} cast={false} />
      {/* rolling hills, a red barn, trees */}
      {[[-40, -70, 40], [30, -80, 46], [90, -60, 36], [-90, -40, 40]].map(([x, z, r], i) => (
        <M key={i} g={sphG(r, 28)} c={i % 2 ? "#5a8a46" : "#68984e"} p={[x, -r * 0.8, z]} s={[1.6, 1, 1]} cast={false} />
      ))}
      <group position={[-12, 0, -15]} rotation={[0, 0.35, 0]}>
        <M g={boxG(7, 4.4, 5.5)} c="#a8322a" tex="planks" p={[0, 2.2, 0]} />
        {[-1, 1].map((sd) => (
          <M key={sd} g={boxG(0.25, 4.2, 6)} c="#4a4a52" tex="shingles" p={[sd * 1.8, 5.35, 0]} r={[0, 0, -sd * 0.9]} />
        ))}
        <M g={boxG(2.2, 2.8, 0.1)} c="#f0e8d8" tex="planks" p={[0, 1.4, 2.78]} />
      </group>
      {[[-9, -8, 1.3], [8, -10, 1.5], [12, -4, 1.2], [-14, 4, 1.4], [14, 6, 1.3], [-7, 9, 1.1]].map(([x, z, sc], i) => (
        <Tree key={i} p={[x, 0, z]} s={sc} />
      ))}
      {/* the log cabin: walls, porch, chimney, a lit window, the door, the calendar */}
      <group position={[0, 0, -5.5]}>
        <M g={boxG(7, 3.0, 4)} c="#8a6038" tex="planks" ts={0.6} p={[0, 1.5, 0]} />
        {Array.from({ length: 7 }, (_, i) => (
          <M key={i} g={cylG(0.11, 0.11, 7.1, 10)} c="#9a6c40" tex="wood" p={[0, 0.2 + i * 0.42, 2.02]} r={[0, 0, PI / 2]} />
        ))}
        {[-1, 1].map((sd) => (
          <M key={sd} g={boxG(7.8, 0.14, 2.7)} c="#5a4a3a" tex="shingles" p={[0, 3.6, sd * 1.15]} r={[sd * 0.5, 0, 0]} />
        ))}
        <M g={boxG(0.8, 4.4, 0.8)} c="#8a8290" tex="stone" p={[3.0, 2.3, -0.6]} />
        <mesh geometry={boxG(0.9, 0.8, 0.02)} material={coreMat("#ffd890", 0.85)} position={[-1.8, 1.6, 2.15]} />
        <M g={boxG(1.0, 0.08, 0.08)} c="#f0e6d0" p={[-1.8, 2.04, 2.17]} />
        <M g={boxG(0.08, 0.8, 0.08)} c="#f0e6d0" p={[-1.8, 1.6, 2.18]} />
        <M g={boxG(1.0, 2.0, 0.08)} c="#5a3a22" tex="planks" p={[0.3, 1.0, 2.16]} />
        {/* porch roof on posts */}
        <M g={boxG(7.4, 0.1, 1.8)} c="#6a5440" tex="shingles" p={[0, 2.6, 2.95]} r={[-0.15, 0, 0]} />
        {[-3.4, -1.2, 1.2, 3.4].map((x) => (
          <M key={x} g={boxG(0.14, 2.5, 0.14)} c="#8a6a4a" tex="wood" p={[x, 1.25, 3.75]} />
        ))}
        <M g={boxG(7.2, 0.18, 1.8)} c="#8a6a4a" tex="planks" p={[0, 0.09, 2.95]} />
        {/* a rocking chair and a bucket on the porch */}
        <group position={[-2.5, 0.18, 3.0]} rotation={[0, 0.4, 0]}>
          <M g={boxG(0.55, 0.06, 0.5)} c="#7a5a3a" tex="wood" p={[0, 0.45, 0]} />
          <M g={boxG(0.55, 0.7, 0.06)} c="#7a5a3a" tex="wood" p={[0, 0.8, -0.25]} r={[-0.15, 0, 0]} />
          {[-1, 1].map((sd) => (
            <M key={sd} g={torG(0.35, 0.025, PI * 0.6)} c="#6a4a2a" p={[sd * 0.25, 0.25, 0]} r={[0, PI / 2, PI * 1.2]} />
          ))}
        </group>
        <M g={cylG(0.18, 0.15, 0.32, 14, true)} c="#8a8a92" tex="metal" p={[2.4, 0.34, 3.1]} side={THREE.DoubleSide} />
      </group>
      {/* the calendar nailed to the cabin wall */}
      <group position={CALENDAR}>
        <M g={boxG(0.62, 0.8, 0.02)} c="#f4ecd8" tex="paper" p={[0, 0, 0.36]} />
        <M g={boxG(0.62, 0.14, 0.024)} c="#b8342a" p={[0, 0.33, 0.362]} />
        <Label text="MARCH" p={[0, 0.17, 0.375]} w={0.5} h={0.14} fg="#2a1a12" bg="none" font={0.8} />
        <Label text="1876" p={[0, -0.04, 0.375]} w={0.54} h={0.24} fg="#2a1a12" bg="none" font={0.9} />
        {Array.from({ length: 12 }, (_, i) => (
          <M key={i} g={boxG(0.07, 0.04, 0.004)} c="#8a7a6a" p={[-0.22 + (i % 6) * 0.088, -0.24 - Math.floor(i / 6) * 0.08, 0.373]} />
        ))}
      </group>
      {/* the well */}
      <group position={[3.4, 0, -1.4]}>
        <M g={cylG(0.7, 0.75, 0.9, 20)} c="#8a8290" tex="stone" p={[0, 0.45, 0]} />
        <mesh geometry={cylG(0.55, 0.55, 0.02, 20)} material={coreMat("#0e1420", 1)} position={[0, 0.91, 0]} />
        {[-1, 1].map((sd) => (
          <M key={sd} g={boxG(0.12, 1.6, 0.12)} c="#6a4a32" tex="wood" p={[sd * 0.65, 1.6, 0]} />
        ))}
        <M g={cylG(0.06, 0.06, 1.4, 8)} c="#7a5a3a" tex="wood" p={[0, 2.0, 0]} r={[0, 0, PI / 2]} />
        {[-1, 1].map((sd) => (
          <M key={sd} g={boxG(1.7, 0.08, 0.9)} c="#5a4a3a" tex="shingles" p={[0, 2.6, sd * 0.3]} r={[sd * 0.6, 0, 0]} />
        ))}
        <M g={cylG(0.13, 0.11, 0.22, 10, true)} c="#8a6a4a" tex="wood" p={[0.25, 1.15, 0]} side={THREE.DoubleSide} />
      </group>
      {/* the clothesline with two sheets that sway */}
      {[-4.4, -1.3].map((x) => (
        <M key={x} g={cylG(0.05, 0.06, 2.2, 8)} c="#7a5a3a" tex="wood" p={[x, 1.1, -2.4]} />
      ))}
      <M g={cylG(0.008, 0.008, 3.1, 4)} c="#e8e0d0" p={[-2.85, 2.1, -2.4]} r={[0, 0, PI / 2]} />
      {[[-3.8, "#f4f0e6"], [-2.4, "#d8e4f0"]].map(([x, c], i) => (
        <group key={i} position={[x as number, 2.08, -2.4]} rotation={[sway * (i ? -1 : 1), 0, 0]}>
          <M g={boxG(1.1, 1.2, 0.02)} c={c as string} tex="fabric" p={[0, -0.6, 0]} />
        </group>
      ))}
      {/* the woodpile with an axe in the chopping block */}
      <group position={[-4.2, 0, -0.6]}>
        {Array.from({ length: 9 }, (_, i) => (
          <M key={i} g={cylG(0.12, 0.12, 1.0, 10)} c={i % 2 ? "#a07a52" : "#8a6a44"} tex="wood" p={[-0.4 + (i % 4) * 0.26 + (Math.floor(i / 4) % 2) * 0.13, 0.12 + Math.floor(i / 4) * 0.22, 0]} r={[PI / 2, 0, 0]} />
        ))}
        <M g={cylG(0.3, 0.32, 0.5, 14)} c="#8a6a44" tex="wood" p={[1.1, 0.25, 0.4]} />
        <M g={cylG(0.025, 0.025, 0.7, 6)} c="#a07a52" tex="wood" p={[1.15, 0.75, 0.4]} r={[0, 0, -0.5]} />
        <M g={boxG(0.18, 0.12, 0.03)} c="#8a8a92" tex="metal" p={[1.0, 0.52, 0.4]} />
      </group>
      {/* the wash bench with a scrub board; the washtub sits on the ground beside it */}
      <group position={[BENCH[0] + 1.25, 0, BENCH[2] + 0.1]}>
        <M g={cylG(0.34, 0.28, 0.32, 18, true)} c="#8a8a92" tex="metal" p={[0, 0.16, 0]} side={THREE.DoubleSide} />
        <mesh geometry={cylG(0.32, 0.32, 0.01, 18)} material={coreMat("#bcd4dc", 0.85)} position={[0, 0.25, 0]} />
      </group>
      <group position={BENCH}>
        <M g={boxG(1.7, 0.08, 0.55)} c="#9a7a54" tex="planks" p={[0, BENCH_TOP - 0.04, 0]} />
        {[[-0.75, -0.2], [0.75, -0.2], [-0.75, 0.2], [0.75, 0.2]].map(([x, z], i) => (
          <M key={i} g={boxG(0.07, BENCH_TOP - 0.08, 0.07)} c="#7a5a3a" tex="wood" p={[x, (BENCH_TOP - 0.08) / 2, z]} />
        ))}
        <M g={boxG(0.3, 0.45, 0.04)} c="#c8a878" tex="wood" p={[-0.55, BENCH_TOP + 0.2, -0.18]} r={[-0.3, 0, 0]} />
      </group>
      {/* the fence around the yard, with a gate gap on the west side */}
      <Fence a={[-6.8, 0, -3.2]} b={[-6.8, 0, 0.6]} n={4} />
      <Fence a={[-6.8, 0, 2.4]} b={[-6.8, 0, 5.2]} n={3} />
      <Fence a={[-6.8, 0, 5.2]} b={[6.8, 0, 5.2]} n={12} />
      <Fence a={[6.8, 0, 5.2]} b={[6.8, 0, -3.2]} n={7} />
      {/* the soap kettle on stones over the fire, with the stirring paddle */}
      <group position={KETTLE}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <M key={i} g={sphG(0.16, 8)} c="#7a7280" tex="stone" p={[Math.cos(i * 1.05) * 0.55, 0.1, Math.sin(i * 1.05) * 0.55]} s={[1.2, 0.8, 1]} />
        ))}
        {[0, 1, 2].map((i) => (
          <M key={i} g={cylG(0.04, 0.04, 0.6, 6)} c="#5a4a3a" tex="wood" p={[Math.cos(i * 2.1) * 0.18, 0.08, Math.sin(i * 2.1) * 0.18]} r={[Math.sin(i * 2.1) * 1.3, 0, -Math.cos(i * 2.1) * 1.3]} />
        ))}
        <Flame p={[0, 0.02, 0]} s={0.28 * (s.fire ?? 1)} t={s.t} seed={2} />
        <M g={cylG(0.44, 0.34, 0.5, 22, true)} c="#2a2a30" tex="metal" p={[0, KETTLE_RIM - 0.25, 0]} side={THREE.DoubleSide} />
        <M g={sphG(0.34, 16)} c="#2a2a30" tex="metal" p={[0, KETTLE_RIM - 0.5, 0]} s={[1, 0.5, 1]} />
        <M g={torG(0.44, 0.03)} c="#3a3a42" tex="metal" p={[0, KETTLE_RIM, 0]} r={[PI / 2, 0, 0]} />
        <mesh geometry={cylG(0.42, 0.42, 0.01, 22)} material={coreMat("#d8c8a0", 0.8)} position={[0, KETTLE_RIM - 0.1, 0]} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={sphG(0.05, 8)} material={coreMat("#f0e6cc", 0.9)} position={[Math.cos(s.t * 1.7 + i * 2) * 0.22, KETTLE_RIM - 0.085, Math.sin(s.t * 1.7 + i * 2) * 0.22]} scale={[1, 0.4 + 0.3 * Math.abs(Math.sin(s.t * 3 + i)), 1]} />
        ))}
        <Smoke p={[0.05, KETTLE_RIM + 0.05, -0.05]} s={0.12} t={s.t} seed={3} n={4} color="#bcb8c4" />
      </group>
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ the lab
export const LAB_DESK_Y = 0.8;
export const Jar: React.FC<{ p: V3; s?: number; meat?: boolean; label?: string; seed?: number }> = ({ p, s = 1, meat = false, label, seed = 0 }) => (
  <group position={p} scale={s}>
    <mesh geometry={cylG(0.11, 0.11, 0.3, 16)} material={coreMat("#d8ecf0", 0.92, 0.32)} position={[0, 0.15, 0]} userData={{ outline: false }} />
    <M g={cylG(0.115, 0.115, 0.05, 16)} c="#8a6a3a" tex="metal" p={[0, 0.32, 0]} />
    <mesh geometry={cylG(0.1, 0.1, 0.2, 16)} material={coreMat("#e8d890", 0.75, 0.35)} position={[0, 0.11, 0]} userData={{ outline: false }} />
    {meat ? <Chunk p={[0, 0.1, 0]} s={0.9} seed={seed} /> : null}
    {label ? <Label text={label} p={[0, 0.18, 0.112]} w={0.2} h={0.07} fg="#2a1a12" bg="#f4ead6" font={0.7} /> : null}
  </group>
);
export type LabState = { jarLung: number; jarMuscle: number; jarCart: number; lamp: number; t: number };
export const Lab: React.FC<{ s: LabState }> = ({ s }) => (
  <group>
    <M g={boxG(8, 0.1, 8)} c="#5a4030" tex="planks" p={[0, -0.05, 0]} cast={false} />
    <M g={boxG(8, 3.6, 0.2)} c="#6a7a5a" tex="plaster" p={[0, 1.8, -2.8]} cast={false} />
    <M g={boxG(8, 1.0, 0.06)} c="#4a3020" tex="planks" p={[0, 0.5, -2.67]} cast={false} />
    <M g={boxG(0.2, 3.6, 8)} c="#5f6e52" tex="plaster" p={[-3.4, 1.8, 0.6]} cast={false} />
    <M g={boxG(0.2, 3.6, 8)} c="#5f6e52" tex="plaster" p={[3.4, 1.8, 0.6]} cast={false} />
    <M g={boxG(8, 0.12, 8)} c="#e0dccf" tex="plaster" p={[0, 3.66, 0.6]} cast={false} />
    {/* shelves of specimen jars along the back wall */}
    {[1.3, 1.85, 2.4].map((y, k) => (
      <group key={y}>
        <M g={boxG(3.4, 0.05, 0.3)} c="#6a4a2e" tex="wood" p={[0.4, y, -2.5]} />
        {Array.from({ length: 7 }, (_, i) => (
          <Jar key={i} p={[-1.0 + i * 0.45, y + 0.025, -2.5]} s={0.75 + (i % 3) * 0.1} meat={(i + k) % 3 === 0} seed={i + k * 7} />
        ))}
      </group>
    ))}
    {/* a window with daylight, a chart of a lung on the wall */}
    <group position={[-2.2, 2.0, -2.68]}>
      <mesh geometry={boxG(1.0, 1.2, 0.02)} material={coreMat("#cfe8ff", 0.95)} />
      <M g={boxG(1.1, 0.07, 0.06)} c="#d8d0c0" p={[0, 0.63, 0.02]} />
      <M g={boxG(1.1, 0.07, 0.06)} c="#d8d0c0" p={[0, -0.63, 0.02]} />
      <M g={boxG(0.05, 1.2, 0.05)} c="#d8d0c0" p={[0, 0, 0.025]} />
    </group>
    <group position={[2.4, 2.1, -2.68]}>
      <M g={boxG(0.9, 1.1, 0.02)} c="#f0e6cc" tex="paper" />
      <M g={sphG(0.22, 12)} c="#d88a8a" p={[-0.14, 0.02, 0.02]} s={[0.8, 1.2, 0.15]} />
      <M g={sphG(0.22, 12)} c="#d88a8a" p={[0.14, 0.02, 0.02]} s={[0.8, 1.2, 0.15]} />
      <M g={boxG(0.04, 0.3, 0.02)} c="#a86a6a" p={[0, 0.32, 0.02]} />
    </group>
    {/* the desk: microscope, lamp, books, papers, the three named jars */}
    <M g={boxG(2.6, 0.07, 0.95)} c="#7a5032" tex="wood" p={[0, LAB_DESK_Y - 0.035, 0]} />
    {[[-1.2, -0.4], [1.2, -0.4], [-1.2, 0.4], [1.2, 0.4]].map(([x, z], i) => (
      <M key={i} g={boxG(0.08, LAB_DESK_Y - 0.07, 0.08)} c="#5a3820" tex="wood" p={[x, (LAB_DESK_Y - 0.07) / 2, z]} />
    ))}
    <group position={[-0.6, LAB_DESK_Y, -0.1]}>
      <M g={boxG(0.24, 0.04, 0.2)} c="#2a2a30" tex="metal" p={[0, 0.02, 0]} />
      <M g={boxG(0.05, 0.32, 0.05)} c="#c8a040" tex="metal" p={[0, 0.2, -0.06]} r={[0.15, 0, 0]} />
      <M g={cylG(0.035, 0.03, 0.26, 12)} c="#c8a040" tex="metal" p={[0, 0.3, 0.02]} r={[-0.35, 0, 0]} />
      <M g={boxG(0.16, 0.012, 0.12)} c="#2a2a30" tex="metal" p={[0, 0.14, 0.03]} />
      <mesh geometry={boxG(0.07, 0.004, 0.05)} material={coreMat("#e8d8d0", 0.9)} position={[0, 0.15, 0.03]} />
    </group>
    <group position={[0.95, LAB_DESK_Y, -0.25]}>
      <M g={cylG(0.08, 0.1, 0.06, 14)} c="#c8a040" tex="metal" p={[0, 0.03, 0]} />
      <mesh geometry={cylG(0.07, 0.05, 0.2, 14)} material={coreMat("#ffe0a0", 0.65 + 0.35 * s.lamp, 0.6)} position={[0, 0.17, 0]} />
      <Flame p={[0, 0.12, 0]} s={0.05} t={s.t} seed={5} />
    </group>
    {[0, 1, 2].map((i) => (
      <M key={i} g={boxG(0.2, 0.05, 0.28)} c={["#7a2a2a", "#2a3a6a", "#3a5a3a"][i]} tex="paper" p={[1.0 + 0.02 * i, LAB_DESK_Y + 0.025 + i * 0.05, 0.22]} r={[0, 0.2 * i, 0]} />
    ))}
    <M g={boxG(0.3, 0.003, 0.38)} c="#f4eedc" tex="paper" p={[-0.05, LAB_DESK_Y + 0.002, 0.2]} r={[0, -0.2, 0]} />
    {s.jarLung > 0 ? <Jar p={[0.05, LAB_DESK_Y, -0.2]} s={s.jarLung} meat label="LUNG?" seed={21} /> : null}
    {s.jarMuscle > 0 ? <Jar p={[0.4, LAB_DESK_Y, -0.05]} s={s.jarMuscle} meat label="MUSCLE" seed={22} /> : null}
    {s.jarCart > 0 ? <Jar p={[0.6, LAB_DESK_Y, -0.32]} s={s.jarCart} meat label="CARTILAGE" seed={23} /> : null}
  </group>
);

// ------------------------------------------------------------------ the museum
export type MuseumState = { t: number };
export const CASE: V3 = [0, 0, -0.6];
export const Museum: React.FC<{ s: MuseumState }> = () => (
  <group>
    <M g={boxG(9, 0.1, 9)} c="#8a5a3a" tex="planks" p={[0, -0.05, 0]} cast={false} />
    <M g={boxG(9, 3.8, 0.2)} c="#2e4a5a" tex="plaster" p={[0, 1.9, -3.0]} cast={false} />
    <M g={boxG(9, 1.1, 0.06)} c="#5a3a22" tex="planks" p={[0, 0.55, -2.87]} cast={false} />
    <M g={boxG(0.2, 3.8, 9)} c="#2a4352" tex="plaster" p={[-3.8, 1.9, 0.5]} cast={false} />
    <M g={boxG(0.2, 3.8, 9)} c="#2a4352" tex="plaster" p={[3.8, 1.9, 0.5]} cast={false} />
    <M g={boxG(9, 0.12, 9)} c="#e8e0d0" tex="plaster" p={[0, 3.86, 0.5]} cast={false} />
    {/* the framed newspaper and a portrait */}
    <group position={[-1.9, 2.1, -2.88]}>
      <M g={boxG(1.2, 1.5, 0.05)} c="#c8a040" tex="metal" />
      <M g={boxG(1.06, 1.36, 0.02)} c="#efe6cc" tex="paper" p={[0, 0, 0.03]} />
      <Label text="MEAT SHOWER" p={[0, 0.5, 0.045]} w={0.95} h={0.16} fg="#1a1414" bg="none" font={0.85} />
      {Array.from({ length: 8 }, (_, i) => (
        <M key={i} g={boxG(0.9 - (i % 3) * 0.1, 0.035, 0.005)} c="#6a6a72" p={[0, 0.26 - i * 0.11, 0.045]} />
      ))}
    </group>
    <group position={[2.0, 2.2, -2.88]}>
      <M g={boxG(0.9, 1.1, 0.05)} c="#c8a040" tex="metal" />
      <M g={boxG(0.76, 0.96, 0.02)} c="#6a7a5a" tex="paper" p={[0, 0, 0.03]} />
      <M g={sphG(0.18, 12)} c="#8a6a4a" p={[0, 0.1, 0.04]} s={[1, 1.1, 0.2]} />
    </group>
    {/* the pedestal, the glass case, the jar with the last chunk, the label */}
    <group position={CASE}>
      <M g={boxG(0.9, 1.0, 0.9)} c="#efe8dc" tex="plaster" p={[0, 0.5, 0]} />
      <M g={boxG(1.0, 0.06, 1.0)} c="#c8b8a0" p={[0, 1.03, 0]} />
      <Jar p={[0, 1.06, 0]} s={1.6} meat seed={77} />
      <mesh geometry={boxG(0.82, 0.8, 0.82)} material={coreMat("#e8f6ff", 0.95, 0.12)} position={[0, 1.46, 0]} userData={{ outline: false }} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <M key={i} g={boxG(0.03, 0.8, 0.03)} c="#c8a040" tex="metal" p={[x * 0.41, 1.46, z * 0.41]} />
      ))}
      <M g={boxG(0.85, 0.03, 0.85)} c="#c8a040" tex="metal" p={[0, 1.87, 0]} />
      <group position={[0, 0.72, 0.46]} rotation={[-0.4, 0, 0]}>
        <M g={boxG(0.62, 0.3, 0.03)} c="#2a2a30" />
        <Label text="BATH COUNTY, 1876" p={[0, 0.03, 0.02]} w={0.56} h={0.12} fg="#f4ead6" bg="none" font={0.8} />
      </group>
    </group>
    {/* rope stanchions */}
    {[-1.2, 1.2].map((x) => (
      <group key={x} position={[x, 0, 0.7]}>
        <M g={cylG(0.18, 0.2, 0.06, 14)} c="#c8a040" tex="metal" p={[0, 0.03, 0]} />
        <M g={cylG(0.03, 0.03, 0.95, 8)} c="#c8a040" tex="metal" p={[0, 0.5, 0]} />
        <M g={sphG(0.05, 10)} c="#c8a040" tex="metal" p={[0, 0.98, 0]} />
      </group>
    ))}
    <M g={torG(1.2, 0.025, PI)} c="#9a2a2a" tex="fabric" p={[0, 0.92, 0.7]} r={[PI, 0, 0]} s={[1, 0.25, 1]} />
    {/* two wall sconces */}
    {[-3.0, 3.0].map((x) => (
      <group key={x} position={[x, 2.4, -2.85]}>
        <mesh geometry={sphG(0.12, 12)} material={coreMat("#ffe2a0", 1.0)} />
        <pointLight position={[0, 0, 0.4]} color="#ffc070" intensity={3} distance={5} decay={2} />
      </group>
    ))}
  </group>
);
void clamp;
