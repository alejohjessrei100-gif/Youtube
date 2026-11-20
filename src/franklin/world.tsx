// The Franklin film's four places, each at its own origin (one place per cut):
//   HALL   the Pennsylvania Assembly, 1737: panelled hall, tall windows, standing desks, the speaker's chair
//   LIB    the rival's library: bookshelves, a fireplace with a mantel clock, a reading desk, the rare book
//   LAB    a 1969 psychology lab: chalkboard, metal desk, tape reel and radio set, venetian blinds
//   OFFICE today: two facing desks over a low partition, monitors, a city window
// Imported assets (Poly Haven CC0 / Sketchfab CC-BY, see public/assets/franklin/CREDITS.md) are toon re-skinned by <Asset>.
// Every solid that can meet the lens or a body is listed in the set's BOXES (local coordinates) for the checker.
import React from "react";
import * as THREE from "three";
import { Asset } from "../inkbeat/core/asset";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, M, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { FIT } from "./assets";

export const HALL: V3 = [0, 0, 0];
export const LIB: V3 = [40, 0, 0];
export const LAB: V3 = [80, 0, 0];
export const OFFICE: V3 = [120, 0, 0];
export type Box = { n: string; min: V3; max: V3 };
const A: React.FC<{ name: string; p: V3; r?: V3; tint?: string }> = ({ name, p, r, tint }) => <Asset film="franklin" name={name} p={p} r={r} {...FIT[name]} tint={tint ?? FIT[name].tint} />;
const h1 = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ shared pieces
/** a hand-written page (letter / note) as a canvas texture: ink lines and an optional signature */
const pageTex = (key: string, title: string, sign: string | null) =>
  canvasTex("page|" + key, 512, 640, (g, w, h) => {
    g.fillStyle = "#f3e8cc"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(150,110,60,${0.04 + h1(i) * 0.05})`; g.fillRect(h1(i + 9) * w, h1(i + 21) * h, 2 + h1(i + 3) * 6, 2 + h1(i + 5) * 6); }
    g.fillStyle = "#2a1c12"; g.font = "italic 700 44px serif"; g.textAlign = "left"; g.fillText(title, 46, 90);
    g.strokeStyle = "#3a2818"; g.lineWidth = 3;
    for (let l = 0; l < 7; l++) {
      g.beginPath(); const y = 150 + l * 48; g.moveTo(46, y);
      for (let x = 46; x < w - 60 - (l === 6 ? 180 : 0); x += 8) g.lineTo(x, y + Math.sin(x * 0.21 + l) * 4 + (h1(x + l) - 0.5) * 3);
      g.stroke();
    }
    if (sign) { let fs = 62; g.font = `italic 800 ${fs}px serif`; while (g.measureText(sign).width > w - 80 && fs > 20) { fs -= 2; g.font = `italic 800 ${fs}px serif`; } g.fillStyle = "#1a120c"; g.fillText(sign, 40, 560); g.beginPath(); g.moveTo(120, 580); g.bezierCurveTo(250, 610, 380, 560, 470, 590); g.stroke(); }
  });
export const Page: React.FC<{ p: V3; r?: V3; s?: number; tex: "letter" | "note"; fold?: number }> = ({ p, r, s = 1, tex }) => {
  const t = tex === "letter" ? pageTex("letter", "Dear Sir,", "Your humble servant") : pageTex("note", "With thanks,", "B. Franklin");
  return (
    <group position={p} rotation={r} scale={s}>
      <mesh geometry={boxG(0.21, 0.004, 0.27)} material={new THREE.MeshToonMaterial({ map: t, color: "#ffffff" })} castShadow receiveShadow />
    </group>
  );
};
/** a candle with a flame core (opaque, unfogged look via coreMat) */
const Candle: React.FC<{ p: V3; t: number; seed?: number }> = ({ p, t, seed = 0 }) => (
  <group position={p}>
    <M g={cylG(0.05, 0.06, 0.02, 12)} c="#b08a3a" tex="metal" />
    <M g={cylG(0.022, 0.022, 0.16, 10)} c="#f2ead2" p={[0, 0.09, 0]} />
    <mesh geometry={sphG(0.018, 8)} position={[0, 0.19 + 0.004 * Math.sin(t * 13 + seed), 0]} scale={[1, 1.8 + 0.2 * Math.sin(t * 9 + seed), 1]} material={coreMat("#ffcf6a", 2.4)} userData={{ outline: false }} />
  </group>
);
/** a window: bright pane core + frame bars + sill; dz = which way it faces */
const Win: React.FC<{ p: V3; w: number; h: number; r?: V3; col?: string; k?: number }> = ({ p, w, h, r, col = "#fff3d0", k = 1.5 }) => (
  <group position={p} rotation={r}>
    <mesh geometry={boxG(w, h, 0.02)} material={coreMat(col, k)} userData={{ outline: false }} />
    {[[0, h / 2 + 0.05, w + 0.16, 0.1], [0, -h / 2 - 0.05, w + 0.16, 0.1], [-w / 2 - 0.05, 0, 0.1, h], [w / 2 + 0.05, 0, 0.1, h], [0, 0, 0.05, h], [0, h / 6, w, 0.04], [0, -h / 6, w, 0.04]].map(([x, y, ww, hh], i) => (
      <M key={i} g={boxG(ww, hh, 0.08)} c="#efe6d2" p={[x, y, 0.05]} cast={false} />
    ))}
    <M g={boxG(w + 0.3, 0.06, 0.2)} c="#e4dac4" p={[0, -h / 2 - 0.12, 0.1]} />
  </group>
);
/** a row of code-built books (cheap, varied spines) on a shelf: x0..x1 at height y, depth z */
const BookRow: React.FC<{ x0: number; x1: number; y: number; z: number; seed: number }> = ({ x0, x1, y, z, seed }) => {
  const out: React.ReactNode[] = [];
  let x = x0, i = 0;
  const cols = ["#7a2430", "#2e4a6a", "#3e5a32", "#8a6a2a", "#5a3a5a", "#6a4a2e", "#2a2a3a", "#a04a3a"];
  while (x < x1 - 0.05) {
    const w = 0.035 + h1(seed + i) * 0.035, hh = 0.2 + h1(seed + i + 50) * 0.08, lean = h1(seed + i + 90) > 0.9 ? 0.18 : 0;
    out.push(<M key={i} g={boxG(w, hh, 0.17)} c={cols[Math.floor(h1(seed + i + 7) * cols.length)]} p={[x + w / 2, y + hh / 2, z]} r={[0, 0, lean]} />);
    x += w + 0.004; i++;
  }
  return <>{out}</>;
};
/** dust motes drifting in a window's light (small opaque cores) */
const Dust: React.FC<{ c: V3; t: number; n?: number; spread?: V3 }> = ({ c, t, n = 18, spread = [1.2, 1.6, 1.2] }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const x = c[0] + (h1(i) - 0.5) * spread[0] + 0.08 * Math.sin(t * 0.4 + i);
      const y = c[1] + ((h1(i + 30) + t * 0.02 * (0.5 + h1(i + 60))) % 1 - 0.5) * spread[1];
      const z = c[2] + (h1(i + 90) - 0.5) * spread[2];
      return <mesh key={i} geometry={sphG(0.008, 5)} position={[x, y, z]} material={coreMat("#fff2c8", 1.3)} userData={{ outline: false }} />;
    })}
  </>
);
/** a potted plant built in code (the Poly Haven one is too heavy for the phone) */
const Plant: React.FC<{ p: V3; s?: number; t: number }> = ({ p, s = 1, t }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.16, 0.12, 0.3, 14)} c="#b0603a" tex="stone" p={[0, 0.15, 0]} />
    <M g={cylG(0.15, 0.15, 0.02, 14)} c="#4a3426" p={[0, 0.29, 0]} cast={false} />
    {Array.from({ length: 9 }, (_, i) => {
      const a = i * 0.7, tilt = 0.4 + h1(i) * 0.5, sway = 0.04 * Math.sin(t * 1.3 + i);
      return <M key={i} g={coneG(0.07, 0.5, 6)} c={i % 2 ? "#3e7a40" : "#4e8a4a"} p={[Math.cos(a) * 0.06, 0.52, Math.sin(a) * 0.06]} r={[Math.sin(a) * tilt + sway, 0, Math.cos(a) * tilt]} s={[1, 1, 0.35]} />;
    })}
  </group>
);

// ================================================================== HALL: the Pennsylvania Assembly, 1737
// room x -4.5..4.5, z -3.5..4.5, height 4.2. Franklin stands left of his desk facing +x; the rival right of his, facing -x.
// A StandDesk's writer side is its local +z: yaw -PI/2 puts the writer on the -x side.
export const FR_DESK: V3 = [-1.7, 0, 0.4];
export const RV_DESK: V3 = [1.8, 0, -0.3];
export const HALL_DOOR: V3 = [-4.5, 0, 2.4];
/** a slanted standing desk (top at ~1.05 m), with a quill inkpot, papers and a candle */
const StandDesk: React.FC<{ p: V3; yaw: number; t: number; letter?: boolean }> = ({ p, yaw, t, letter }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    {[[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]].map(([x, z], i) => <M key={i} g={boxG(0.06, 1.0, 0.06)} c="#5a3a22" tex="wood" p={[x, 0.5, z]} />)}
    <M g={boxG(1.0, 0.05, 0.56)} c="#6a4426" tex="wood" p={[0, 1.02, 0]} r={[0.14, 0, 0]} />
    <M g={boxG(1.0, 0.04, 0.12)} c="#5a3a22" tex="wood" p={[0, 1.08, -0.3]} />
    <M g={boxG(0.92, 0.03, 0.48)} c="#5a3a22" tex="wood" p={[0, 0.3, 0]} />
    <A name="quill" p={[-0.38, 1.1, 0.12]} />
    {letter ? null : <Page p={[-0.15, 1.055, 0.02]} r={[0.14, 0.1, 0]} s={1} tex="letter" />}
    <Candle p={[-0.38, 1.1, -0.3]} t={t} seed={p[0]} />
  </group>
);
export const Hall: React.FC<{ t: number }> = ({ t }) => (
  <group position={HALL}>
    <M g={boxG(9.2, 0.1, 8.4)} c="#9a7448" tex="planks" p={[0, -0.05, 0.5]} />
    <M g={boxG(1.6, 0.012, 6.2)} c="#7a2430" tex="fabric" p={[0, 0.006, 0.6]} cast={false} />
    {/* back wall: wainscot + plaster, two tall windows, the speaker's dais and chair, the sign */}
    <M g={boxG(9.2, 1.2, 0.2)} c="#6a4426" tex="wood" p={[0, 0.6, -3.6]} />
    <M g={boxG(9.2, 3.0, 0.2)} c="#e8dcc0" tex="plaster" p={[0, 2.7, -3.62]} />
    <Win p={[-2.7, 2.4, -3.49]} w={1.1} h={2.0} />
    <Win p={[2.7, 2.4, -3.49]} w={1.1} h={2.0} />
    <M g={boxG(2.4, 0.3, 1.2)} c="#5a3a22" tex="wood" p={[0, 0.15, -2.9]} />
    <A name="chair" p={[0, 0.3, -3.05]} tint="#c89a6a" />
    <Label text="PENNSYLVANIA ASSEMBLY · 1737" p={[0, 3.55, -3.48]} w={3.2} h={0.36} fg="#f4e2b0" bg="#3a2418" />
    <A name="frame" p={[-4.42, 1.9, 0.6]} r={[0, Math.PI / 2, 0]} />
    <A name="frame" p={[4.42, 1.9, 1.4]} r={[0, -Math.PI / 2, 0]} />
    {/* side walls with a door on the left */}
    <M g={boxG(0.2, 4.2, 6.0)} c="#e8dcc0" tex="plaster" p={[-4.6, 2.1, -0.6]} />
    <M g={boxG(0.2, 4.2, 1.2)} c="#e8dcc0" tex="plaster" p={[-4.6, 2.1, 4.0]} />
    <M g={boxG(0.2, 1.8, 1.0)} c="#e8dcc0" tex="plaster" p={[-4.6, 3.3, 2.9]} />
    <M g={boxG(0.12, 2.4, 1.0)} c="#4a2e1a" tex="wood" p={[-4.52, 1.2, 2.9]} r={[0, 0.0, 0]} />
    <M g={boxG(0.2, 4.2, 8.2)} c="#e8dcc0" tex="plaster" p={[4.6, 2.1, 0.5]} />
    <M g={boxG(9.2, 0.25, 8.4)} c="#d8ccb0" p={[0, 4.32, 0.5]} recv={false} />
    {[-3, -1, 1, 3].map((x) => <M key={x} g={boxG(0.25, 0.3, 8.4)} c="#5a3a22" tex="wood" p={[x, 4.05, 0.5]} />)}
    {/* the two desks, plus back-row desks and chairs */}
    <StandDesk p={FR_DESK} yaw={-Math.PI / 2} t={t} letter />
    <StandDesk p={RV_DESK} yaw={Math.PI / 2} t={t} />
    <StandDesk p={[-2.9, 0, -1.8]} yaw={-Math.PI / 2} t={t} />
    <StandDesk p={[2.9, 0, -1.9]} yaw={Math.PI / 2} t={t} />
    <A name="chair" p={[-3.5, 0, -0.6]} r={[0, Math.PI / 2, 0]} />
    <A name="chair" p={[2.6, 0, 1.4]} r={[0, -Math.PI / 2, 0]} />
    <Dust c={[-2.7, 1.8, -2.6]} t={t} />
    <Dust c={[2.7, 1.8, -2.6]} t={t + 3} />
  </group>
);
export const HALL_BOXES: Box[] = [
  { n: "hall back wall", min: [-4.6, 0, -3.75], max: [4.6, 4.2, -3.5] },
  { n: "hall left wall", min: [-4.7, 0, -3.6], max: [-4.5, 4.2, 4.6] },
  { n: "hall right wall", min: [4.5, 0, -3.6], max: [4.7, 4.2, 4.6] },
  { n: "hall ceiling", min: [-4.6, 3.9, -3.6], max: [4.6, 4.45, 4.7] },
  { n: "dais", min: [-1.2, 0, -3.5], max: [1.2, 0.3, -2.3] },
  { n: "speaker chair", min: [-0.35, 0.3, -3.4], max: [0.35, 1.3, -2.7] },
  ...[FR_DESK, RV_DESK, [-2.9, 0, -1.8] as V3, [2.9, 0, -1.9] as V3].map((p, i) => ({ n: `stand desk ${i}`, min: [p[0] - 0.3, 0, p[2] - 0.52] as V3, max: [p[0] + 0.3, 1.15, p[2] + 0.52] as V3 })),
  { n: "chair L", min: [-3.7, 0, -0.9], max: [-3.3, 1.0, -0.3] },
  { n: "chair R", min: [2.4, 0, 1.1], max: [2.8, 1.0, 1.7] },
];

// ================================================================== LIB: the rival's library
// room x -4..4, z -3..4.5, height 3.4. Reading desk centre-right, bookshelves on the back wall, fireplace right.
export const LIB_DESK: V3 = [0.9, 0, -0.4];
export const LIB_DOOR: V3 = [-4, 0, 1.6];
export const Library: React.FC<{ t: number }> = ({ t }) => (
  <group position={LIB}>
    <M g={boxG(8.2, 0.1, 8.0)} c="#7a5434" tex="planks" p={[0, -0.05, 0.75]} />
    <M g={boxG(3.4, 0.012, 2.6)} c="#6a2a3a" tex="fabric" p={[0.6, 0.006, 0.2]} cast={false} />
    <M g={boxG(3.0, 0.014, 2.2)} c="#c8a050" tex="fabric" p={[0.6, 0.008, 0.2]} cast={false} />
    <M g={boxG(8.2, 3.4, 0.2)} c="#5a3a2a" tex="wood" p={[0, 1.7, -3.1]} />
    <M g={boxG(0.2, 3.4, 4.6)} c="#8a5a3a" tex="wood" p={[-4.1, 1.7, -0.9]} />
    <M g={boxG(0.2, 3.4, 1.9)} c="#8a5a3a" tex="wood" p={[-4.1, 1.7, 3.6]} />
    <M g={boxG(0.2, 1.0, 1.0)} c="#8a5a3a" tex="wood" p={[-4.1, 2.9, 2.0]} />
    <M g={boxG(0.12, 2.4, 1.0)} c="#3a2418" tex="wood" p={[-4.02, 1.2, 2.0]} />
    <M g={boxG(0.2, 3.4, 8.0)} c="#8a5a3a" tex="wood" p={[4.1, 1.7, 0.75]} />
    <M g={boxG(8.2, 0.2, 8.0)} c="#4a3020" tex="wood" p={[0, 3.5, 0.75]} recv={false} />
    {/* three bookshelves on the back wall, filled */}
    {[-2.9, -1.5, -0.1].map((x, k) => (
      <group key={x}>
        <A name="bookshelf" p={[x, 0, -2.7]} />
        {[0.1, 0.5, 0.9, 1.3, 1.7].map((y, j) => <BookRow key={y} x0={x - 0.6} x1={x + 0.6} y={y + 0.03} z={-2.72} seed={k * 40 + j * 7} />)}
      </group>
    ))}
    {/* the fireplace: stone surround, flames, mantel with the clock and an oil lamp */}
    <group position={[2.6, 0, -2.75]}>
      <M g={boxG(1.8, 1.3, 0.5)} c="#9a9088" tex="stone" p={[0, 0.65, 0]} />
      <M g={boxG(1.0, 0.8, 0.52)} c="#1a1010" p={[0, 0.4, 0.02]} />
      <M g={boxG(2.1, 0.1, 0.62)} c="#5a3a22" tex="wood" p={[0, 1.36, 0.04]} />
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} geometry={coneG(0.12 - i * 0.012, 0.35 + 0.08 * Math.sin(t * 7 + i * 1.7), 6)} position={[-0.3 + i * 0.15, 0.24, 0.12]} material={coreMat(i % 2 ? "#ffb040" : "#ff7a20", 2.2)} userData={{ outline: false }} />)}
      <M g={boxG(0.7, 0.08, 0.15)} c="#4a2e1a" tex="wood" p={[0, 0.06, 0.12]} />
      <A name="mantelclock" p={[-0.3, 1.41, 0.04]} />
      <A name="oillamp" p={[0.65, 1.41, 0.04]} />
    </group>
    <pointLight position={[2.6, 0.6, -2.2]} color="#ff9a40" intensity={6 + 1.2 * Math.sin(t * 9)} distance={6} decay={1.6} />
    {/* the reading desk, the armchair, the window on the left wall, a portrait */}
    <group position={LIB_DESK}>
      {[[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].map(([x, z], i) => <M key={i} g={boxG(0.07, 0.76, 0.07)} c="#4a2e1a" tex="wood" p={[x, 0.38, z]} />)}
      <M g={boxG(1.4, 0.05, 0.76)} c="#5a3a22" tex="wood" p={[0, 0.785, 0]} />
      <M g={boxG(1.1, 0.012, 0.5)} c="#2e5a3a" tex="fabric" p={[0, 0.815, 0]} cast={false} />
      <A name="oillamp" p={[-0.55, 0.81, -0.22]} />
      <BookRow x0={0.15} x1={0.55} y={0.81} z={-0.28} seed={91} />
    </group>
    <A name="armchair" p={[2.3, 0, 0.6]} r={[0, -2.2, 0]} />
    <Win p={[-3.99, 1.8, -1.2]} w={1.0} h={1.5} r={[0, Math.PI / 2, 0]} />
    <M g={boxG(0.06, 1.9, 0.45)} c="#6a2a3a" tex="fabric" p={[-3.92, 1.85, -1.95]} />
    <M g={boxG(0.06, 1.9, 0.45)} c="#6a2a3a" tex="fabric" p={[-3.92, 1.85, -0.45]} />
    <A name="frame" p={[3.98, 1.9, 0.6]} r={[0, -Math.PI / 2, 0]} />
    <Plant p={[-3.4, 0, -2.4]} t={t} />
    <Dust c={[-3.2, 1.6, -1.2]} t={t} spread={[1.4, 1.4, 1.2]} />
  </group>
);
export const LIB_BOXES: Box[] = [
  { n: "lib back wall + shelves", min: [-4.1, 0, -3.3], max: [4.1, 3.4, -2.4] },
  { n: "lib left wall", min: [-4.25, 0, -3.3], max: [-3.85, 3.4, 4.75] },
  { n: "lib right wall", min: [4.0, 0, -3.3], max: [4.25, 3.4, 4.75] },
  { n: "lib ceiling", min: [-4.1, 3.38, -3.3], max: [4.1, 3.6, 4.75] },
  { n: "fireplace", min: [1.5, 0, -3.1], max: [3.7, 1.42, -2.35] },
  { n: "reading desk", min: [LIB_DESK[0] - 0.72, 0, LIB_DESK[2] - 0.4], max: [LIB_DESK[0] + 0.72, 0.84, LIB_DESK[2] + 0.4] },
  { n: "armchair", min: [1.9, 0, 0.2], max: [2.7, 1.0, 1.0] },
  { n: "plant", min: [-3.6, 0, -2.6], max: [-3.2, 0.9, -2.2] },
];

// ================================================================== LAB: a 1969 psychology lab
// room x -3.5..3.5, z -3..3.5, height 3.0. Desk centre; the psychologist behind it, the student in front.
export const LAB_DESK: V3 = [0.2, 0, -0.9];
const Tiles: React.FC = () => (
  <>
    {Array.from({ length: 14 * 13 }, (_, i) => {
      const cx = i % 14, cz = Math.floor(i / 14);
      return <M key={i} g={boxG(0.5, 0.03, 0.5)} c={(cx + cz) % 2 ? "#d8d0b8" : "#8a9a7a"} p={[-3.25 + cx * 0.5, 0.015, -2.75 + cz * 0.5]} cast={false} />;
    })}
  </>
);
export const Lab: React.FC<{ t: number }> = ({ t }) => (
  <group position={LAB}>
    <M g={boxG(7.2, 0.1, 6.8)} c="#6a6a5a" p={[0, -0.05, 0.25]} />
    <Tiles />
    <M g={boxG(7.2, 3.0, 0.2)} c="#c8d8c0" tex="plaster" p={[0, 1.5, -3.1]} />
    <M g={boxG(7.2, 1.0, 0.04)} c="#8aa08a" p={[0, 0.5, -2.98]} />
    <M g={boxG(0.2, 3.0, 6.8)} c="#c8d8c0" tex="plaster" p={[-3.6, 1.5, 0.25]} />
    <M g={boxG(0.2, 3.0, 6.8)} c="#c8d8c0" tex="plaster" p={[3.6, 1.5, 0.25]} />
    <M g={boxG(7.2, 0.2, 6.8)} c="#e8e8e0" p={[0, 3.1, 0.25]} recv={false} />
    {[-1.5, 1.5].map((x) => <mesh key={x} geometry={boxG(1.2, 0.04, 0.3)} position={[x, 2.97, 0]} material={coreMat("#f8fbff", 1.6)} userData={{ outline: false }} />)}
    <A name="chalkboard" p={[-0.6, 0.9, -2.9]} />
    <Label text="DO A FAVOR = LIKE MORE?" p={[-0.6, 1.75, -2.82]} w={1.15} h={0.2} fg="#f2f2ea" bg="#2e5a3e" />
    <Label text="1969" p={[-0.6, 1.45, -2.82]} w={0.6} h={0.24} fg="#f2f2ea" bg="#2e5a3e" />
    <Label text="PSYCHOLOGY DEPT. · STUDY 3" p={[2.3, 2.3, -2.97]} w={1.5} h={0.24} fg="#f2f2ea" bg="#2a3a5a" />
    <group position={LAB_DESK}>
      <A name="officedesk" p={[0, 0, 0]} tint="#a8b4a0" />
      <A name="reel" p={[-0.45, 0.6, -0.12]} />
      {/* a 1960s tape deck / radio set built in code (the scanned one was too heavy for phones) */}
      <M g={boxG(0.42, 0.22, 0.26)} c="#6a5a48" tex="wood" p={[0.35, 0.71, -0.12]} />
      <M g={boxG(0.3, 0.12, 0.01)} c="#d8d0b8" p={[0.33, 0.73, 0.016]} cast={false} />
      {[0.22, 0.44].map((x) => <M key={x} g={cylG(0.025, 0.025, 0.03, 12)} c="#2a2420" p={[x, 0.66, 0.02]} r={[Math.PI / 2, 0, 0]} />)}
      <A name="desklamp" p={[0.65, 0.6, 0.1]} />
      <M g={boxG(0.22, 0.012, 0.3)} c="#c8a050" p={[-0.1, 0.606, 0.15]} />
    </group>
    {/* venetian blinds window on the right wall */}
    <group position={[3.49, 1.7, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={boxG(1.4, 1.2, 0.02)} material={coreMat("#fff6dc", 1.5)} userData={{ outline: false }} />
      {Array.from({ length: 12 }, (_, i) => <M key={i} g={boxG(1.44, 0.03, 0.08)} c="#e8e4d8" p={[0, -0.55 + i * 0.1, 0.06]} r={[0.6, 0, 0]} cast={false} />)}
    </group>
    <A name="mantelclock" p={[2.6, 1.7, -2.85]} />
    <M g={boxG(0.5, 0.04, 0.25)} c="#8a8a80" tex="metal" p={[2.6, 1.68, -2.85]} />
    <Plant p={[-3.0, 0, -2.5]} t={t} s={0.9} />
    <M g={boxG(0.5, 1.3, 0.45)} c="#7a8a8a" tex="metal" p={[3.1, 0.65, -2.6]} />
  </group>
);
export const LAB_BOXES: Box[] = [
  { n: "lab back wall", min: [-3.6, 0, -3.25], max: [3.6, 3.0, -2.8] },
  { n: "lab left wall", min: [-3.75, 0, -3.25], max: [-3.45, 3.0, 3.7] },
  { n: "lab right wall", min: [3.45, 0, -3.25], max: [3.75, 3.0, 3.7] },
  { n: "lab ceiling", min: [-3.6, 2.95, -3.25], max: [3.6, 3.25, 3.7] },
  { n: "lab desk", min: [LAB_DESK[0] - 0.78, 0, LAB_DESK[2] - 0.38], max: [LAB_DESK[0] + 0.78, 0.62, LAB_DESK[2] + 0.38] },
  { n: "cabinet", min: [2.8, 0, -2.85], max: [3.4, 1.3, -2.35] },
  { n: "lab plant", min: [-3.2, 0, -2.7], max: [-2.8, 0.85, -2.3] },
];

// ================================================================== OFFICE: today
// room x -3.5..3.5, z -3..4, height 2.9. Two desks face each other across a low partition (z = 0).
export const YOU_DESK: V3 = [0, 0, 0.75];
export const GRUMP_DESK: V3 = [0, 0, -0.75];
const Monitor: React.FC<{ p: V3; yaw: number }> = ({ p, yaw }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(0.56, 0.34, 0.03)} c="#1e2228" tex="metal" p={[0, 0.33, 0]} />
    <mesh geometry={boxG(0.5, 0.28, 0.005)} position={[0, 0.33, 0.017]} material={coreMat("#8ab8e8", 0.9)} userData={{ outline: false }} />
    <M g={boxG(0.05, 0.16, 0.05)} c="#2a2e34" p={[0, 0.08, -0.02]} />
    <M g={boxG(0.2, 0.012, 0.14)} c="#2a2e34" p={[0, 0.006, -0.02]} />
  </group>
);
export const Office: React.FC<{ t: number }> = ({ t }) => (
  <group position={OFFICE}>
    <M g={boxG(7.2, 0.1, 7.2)} c="#5a6070" tex="fabric" p={[0, -0.05, 0.5]} />
    {/* the window wall behind the grump: a city skyline, frames */}
    <mesh geometry={boxG(7.0, 2.2, 0.02)} position={[0, 1.55, -3.0]} material={coreMat("#bcd8f0", 1.2)} userData={{ outline: false }} />
    {Array.from({ length: 12 }, (_, i) => {
      const w = 0.4 + h1(i) * 0.5, h = 0.5 + h1(i + 20) * 1.5;
      return <mesh key={i} geometry={boxG(w, h, 0.05)} position={[-3.2 + i * 0.58, 0.45 + h / 2, -3.05]} material={coreMat(i % 2 ? "#7a90a8" : "#8aa0b8", 0.9)} userData={{ outline: false }} />;
    })}
    {[-3.5, -1.75, 0, 1.75, 3.5].map((x) => <M key={x} g={boxG(0.08, 2.4, 0.12)} c="#3a3e48" tex="metal" p={[x, 1.5, -2.95]} />)}
    <M g={boxG(7.2, 0.5, 0.2)} c="#d8d8d0" tex="plaster" p={[0, 0.25, -3.0]} />
    <M g={boxG(7.2, 0.3, 0.2)} c="#d8d8d0" tex="plaster" p={[0, 2.8, -3.0]} />
    <M g={boxG(0.2, 2.9, 7.2)} c="#d8d4c8" tex="plaster" p={[-3.6, 1.45, 0.5]} />
    <M g={boxG(0.2, 2.9, 7.2)} c="#d8d4c8" tex="plaster" p={[3.6, 1.45, 0.5]} />
    <M g={boxG(7.2, 0.2, 7.2)} c="#eceae4" p={[0, 3.0, 0.5]} recv={false} />
    {[-1.6, 1.6].map((x) => <mesh key={x} geometry={boxG(1.2, 0.04, 0.6)} position={[x, 2.88, 0.5]} material={coreMat("#f8fbff", 1.5)} userData={{ outline: false }} />)}
    <Label text="TEAMWORK" p={[-3.49, 1.9, 1.2]} r={[0, Math.PI / 2, 0]} w={1.1} h={0.34} fg="#ffffff" bg="#c84a3a" />
    {/* the two desks and the partition */}
    <A name="officedesk" p={YOU_DESK} r={[0, Math.PI, 0]} tint="#e8e4dc" />
    <A name="officedesk" p={GRUMP_DESK} tint="#e8e4dc" />
    <M g={boxG(1.6, 0.42, 0.05)} c="#4a6a8a" tex="fabric" p={[0, 0.8, 0]} />
    <Monitor p={[0.35, 0.59, 1.05]} yaw={Math.PI} />
    <Monitor p={[-0.35, 0.59, -1.05]} yaw={0} />
    <A name="desklamp" p={[-0.6, 0.59, 1.0]} r={[0, Math.PI, 0]} />
    <M g={cylG(0.045, 0.04, 0.1, 12)} c="#f4ead6" p={[0.62, 0.64, -0.95]} />
    <M g={boxG(0.08, 0.002, 0.08)} c="#ffe04a" p={[-0.62, 0.592, -0.95]} cast={false} />
    <M g={boxG(0.08, 0.002, 0.08)} c="#8ae0a0" p={[-0.5, 0.592, -0.98]} r={[0, 0.3, 0]} cast={false} />
    <Plant p={[-2.9, 0, -2.4]} t={t} s={1.3} />
    <Plant p={[2.9, 0, 2.8]} t={t + 2} s={1.1} />
  </group>
);
export const OFFICE_BOXES: Box[] = [
  { n: "office window wall", min: [-3.6, 0, -3.15], max: [3.6, 2.9, -2.9] },
  { n: "office left wall", min: [-3.75, 0, -3.15], max: [-3.45, 2.9, 4.2] },
  { n: "office right wall", min: [3.45, 0, -3.15], max: [3.75, 2.9, 4.2] },
  { n: "office ceiling", min: [-3.6, 2.85, -3.15], max: [3.6, 3.15, 4.2] },
  { n: "your desk", min: [-0.78, 0, 0.38], max: [0.78, 0.62, 1.12] },
  { n: "grump desk", min: [-0.78, 0, -1.12], max: [0.78, 0.62, -0.38] },
  { n: "partition", min: [-0.8, 0.59, -0.04], max: [0.8, 1.01, 0.04] },
  { n: "office plant L", min: [-3.15, 0, -2.65], max: [-2.65, 1.1, -2.15] },
  { n: "office plant R", min: [2.65, 0, 2.55], max: [3.15, 1.0, 3.05] },
];
export const SET_BOXES = { hall: { o: HALL, b: HALL_BOXES }, lib: { o: LIB, b: LIB_BOXES }, lab: { o: LAB, b: LAB_BOXES }, office: { o: OFFICE, b: OFFICE_BOXES } };
