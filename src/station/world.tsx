// "Point at One Person" places:
//   HALL  Central Station's concourse by day: marble floor with a compass inlay, a back wall of tall arched windows,
//         the platform gates 1-4, a departures board, a hanging double clock, columns, benches, a coffee kiosk, ticket
//         machines, bins, pigeons, signs, the front wall with two entrances.
//   LAB   1968: a psychology lab with two listening booths (one with a single intercom, one with five), headphones,
//         microphones, a reel-to-reel recorder, a clipboard, a STUDY IN PROGRESS sign, a calendar, a door.
// Every solid that can meet the lens or a body is listed in HALL_BOXES / LAB_BOXES (local coordinates) for the checker.
import React from "react";
import * as THREE from "three";
import { toonMapMaterial } from "../inkbeat/mat/materials";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, LightCone, M, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

export const HALL: V3 = [0, 0, 0];
export const LAB: V3 = [60, 0, 0];
export type Box = { n: string; min: V3; max: V3 };
const PI = Math.PI;
const h1 = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mats = new Map<string, THREE.Material>();
const texMat = (key: string, tex: THREE.Texture) => { let m = mats.get(key); if (!m) { m = toonMapMaterial(tex, "#ffffff"); mats.set(key, m); } return m; };
const Glow: React.FC<{ p: V3; w: number; h: number; k?: number; col?: string; r?: V3; d?: number }> = ({ p, w, h, k = 1.4, col = "#fff0c8", r, d = 0.02 }) => (
  <mesh geometry={boxG(w, h, d)} position={p} rotation={r} material={coreMat(col, k)} userData={{ outline: false }} />
);

export const VICTIM_P: V3 = [0.5, 0, 0.6];
export const CLOCK_P: V3 = [0, 6.8, -5];
export const COLS: V3[] = [-9, -3, 3].flatMap((z) => [-6.5, 6.5].map((x) => [x, 0, z] as V3));

const floorTex = () =>
  canvasTex("hall|floor", 1024, 1024, (g, W, H) => {
    const n = 13;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? "#e4dccb" : "#c9bfae"; g.fillRect((x * W) / n, (y * H) / n, W / n + 1, H / n + 1); }
    for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(120,100,80,${0.05 + 0.08 * h1(i)})`; g.lineWidth = 1 + 2 * h1(i + 1); g.beginPath(); const x = h1(i + 2) * W, y = h1(i + 3) * H; g.moveTo(x, y); g.lineTo(x + 30 * (h1(i + 4) - 0.5), y + 30 * (h1(i + 5) - 0.5)); g.stroke(); }
    // the compass inlay in the middle of the hall (texture centre = hall x 0, z -2)
    const cx = W / 2, cy = H / 2, R = W * 0.11;
    g.fillStyle = "#3a4a6a"; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.fillStyle = "#d8b048"; g.beginPath(); g.arc(cx, cy, R * 0.9, 0, 7); g.fill();
    g.fillStyle = "#3a4a6a";
    for (let k = 0; k < 4; k++) { const a = (k * PI) / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85); g.lineTo(cx + Math.cos(a + 1.3) * R * 0.18, cy + Math.sin(a + 1.3) * R * 0.18); g.lineTo(cx + Math.cos(a - 1.3) * R * 0.18, cy + Math.sin(a - 1.3) * R * 0.18); g.fill(); }
  });
const wallTex = () =>
  canvasTex("hall|backwall", 1024, 512, (g, W, H) => {
    g.fillStyle = "#d8ccb4"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(110,90,70,${0.03 + 0.05 * h1(i)})`; g.fillRect(h1(i + 7) * W, h1(i + 8) * H, 20 * h1(i), 3); }
    for (let k = 0; k < 5; k++) {
      const x = W * (0.1 + 0.2 * k), w = W * 0.12, top = H * 0.08, bot = H * 0.62;
      g.fillStyle = "#b8a888"; g.fillRect(x - w / 2 - 10, top + w / 2, w + 20, bot - top - w / 2 + 10);
      g.beginPath(); g.arc(x, top + w / 2, w / 2 + 10, PI, 0); g.fill();
      g.fillStyle = "#cfe4ee"; g.fillRect(x - w / 2, top + w / 2, w, bot - top - w / 2); g.beginPath(); g.arc(x, top + w / 2, w / 2, PI, 0); g.fill();
      g.strokeStyle = "#6a6050"; g.lineWidth = 5;
      for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(x - w / 2, top + w / 2 + j * (bot - top) / 4.5); g.lineTo(x + w / 2, top + w / 2 + j * (bot - top) / 4.5); g.stroke(); }
      g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
    }
    g.fillStyle = "#a89878"; g.fillRect(0, H * 0.66, W, H * 0.03);
  });
const clockTex = () =>
  canvasTex("hall|clock", 256, 256, (g, W) => {
    g.fillStyle = "#f8f4e8"; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 4, 0, 7); g.fill();
    g.strokeStyle = "#2a2a2a"; g.lineWidth = 10; g.stroke();
    g.fillStyle = "#2a2a2a"; g.font = "bold 30px serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let k = 1; k <= 12; k++) { const a = (k * PI) / 6 - PI / 2; g.fillText(String(k), W / 2 + Math.cos(a) * W * 0.36, W / 2 + Math.sin(a) * W * 0.36); }
    for (let k = 0; k < 60; k++) { const a = (k * PI) / 30; g.fillRect(W / 2 + Math.cos(a) * W * 0.44 - 1, W / 2 + Math.sin(a) * W * 0.44 - 1, k % 5 ? 3 : 6, k % 5 ? 3 : 6); }
  });
/** one face of the station clock (its +z side); minutes past 9 drive both hands */
const ClockFace: React.FC<{ min: number }> = ({ min }) => {
  const ma = -(min / 60) * 2 * PI, ha = -((9 + min / 60) / 12) * 2 * PI;
  return (
    <group>
      <mesh geometry={cylG(0.82, 0.82, 0.04, 40)} position={[0, 0, 0.13]} rotation={[PI / 2, 0, 0]} material={texMat("clockface", clockTex())} />
      <group position={[0, 0, 0.17]} rotation={[0, 0, ha]}><M g={boxG(0.07, 0.42, 0.02)} c="#1a1a1a" p={[0, 0.19, 0]} cast={false} /></group>
      <group position={[0, 0, 0.2]} rotation={[0, 0, ma]}><M g={boxG(0.05, 0.66, 0.02)} c="#1a1a1a" p={[0, 0.3, 0]} cast={false} /></group>
      <M g={sphG(0.05, 8)} c="#c8a040" p={[0, 0, 0.22]} cast={false} />
    </group>
  );
};
const Bench: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(2.2, 0.08, 0.5)} c="#8a5a30" tex="wood" p={[0, 0.46, 0]} />
    <M g={boxG(2.2, 0.5, 0.07)} c="#8a5a30" tex="wood" p={[0, 0.78, -0.24]} />
    {[-0.95, 0.95].map((x) => <M key={x} g={boxG(0.08, 0.46, 0.46)} c="#2a2e34" tex="metal" p={[x, 0.23, 0]} />)}
  </group>
);
const Pigeon: React.FC<{ p: V3; t: number; seed: number }> = ({ p, t, seed }) => {
  const peck = Math.max(0, Math.sin(t * 5 + seed * 2)) ** 4;
  return (
    <group position={p} rotation={[0, seed * 1.7, 0]}>
      <M g={sphG(0.11, 10)} c="#7a7e8a" p={[0, 0.14, 0]} s={[1, 0.85, 1.35]} />
      <M g={sphG(0.065, 8)} c="#5a6070" p={[0, 0.25 - 0.1 * peck, 0.12 + 0.05 * peck]} />
      <mesh geometry={coneG(0.02, 0.05, 6)} position={[0, 0.24 - 0.1 * peck, 0.19 + 0.05 * peck]} rotation={[PI / 2, 0, 0]} material={coreMat("#d89040", 0.9)} />
      <M g={sphG(0.07, 8)} c="#4a8a7a" p={[0, 0.2, 0.07]} s={[1, 0.6, 0.8]} cast={false} />
    </group>
  );
};
/** the girl's backpack: a box with a flap, straps and a keychain */
export const Backpack: React.FC<{ p: V3; r?: V3 }> = ({ p, r }) => (
  <group position={p} rotation={r}>
    <M g={boxG(0.32, 0.38, 0.16)} c="#3a7ac8" tex="fabric" p={[0, 0.19, 0]} />
    <M g={boxG(0.33, 0.16, 0.17)} c="#2a5a98" tex="fabric" p={[0, 0.32, 0.005]} />
    <M g={boxG(0.2, 0.1, 0.03)} c="#f2c230" p={[0, 0.12, 0.09]} />
    {[-0.1, 0.1].map((x) => <M key={x} g={boxG(0.04, 0.32, 0.02)} c="#1a2a48" p={[x, 0.2, -0.09]} />)}
    <M g={sphG(0.03, 8)} c="#e84a6a" p={[0.12, 0.3, 0.1]} />
  </group>
);
export const Briefcase: React.FC<{ p: V3; r?: V3 }> = ({ p, r }) => (
  <group position={p} rotation={r}>
    <M g={boxG(0.44, 0.32, 0.1)} c="#5a3a22" tex="wood" p={[0, 0.16, 0]} />
    <M g={boxG(0.14, 0.05, 0.03)} c="#2a1a12" p={[0, 0.34, 0]} />
    {[-0.12, 0.12].map((x) => <M key={x} g={boxG(0.04, 0.03, 0.11)} c="#c8a040" p={[x, 0.28, 0]} cast={false} />)}
  </group>
);
/** a phone (screen toward +z) */
export const Phone: React.FC<{ p: V3; r?: V3; lit?: boolean }> = ({ p, r, lit = true }) => (
  <group position={p} rotation={r}>
    <M g={boxG(0.075, 0.15, 0.012)} c="#1a1c22" />
    <mesh geometry={boxG(0.065, 0.13, 0.004)} position={[0, 0, 0.008]} material={coreMat(lit ? "#8ad0ff" : "#20242c", lit ? 1.3 : 0.6)} userData={{ outline: false }} />
  </group>
);
export const MedBag: React.FC<{ p: V3; r?: V3 }> = ({ p, r }) => (
  <group position={p} rotation={r}>
    <M g={boxG(0.5, 0.3, 0.25)} c="#c83030" tex="fabric" p={[0, 0, 0]} />
    <M g={boxG(0.16, 0.05, 0.02)} c="#ffffff" p={[0, 0.02, 0.13]} cast={false} />
    <M g={boxG(0.05, 0.16, 0.02)} c="#ffffff" p={[0, 0.02, 0.13]} cast={false} />
    <M g={boxG(0.2, 0.04, 0.04)} c="#2a2a2a" p={[0, 0.17, 0]} />
  </group>
);

export const Hall: React.FC<{ t: number; clockMin: number }> = ({ t, clockMin }) => (
  <group position={HALL}>
    <mesh geometry={boxG(26, 0.1, 26)} position={[0, -0.05, -2]} material={texMat("hallfloor", floorTex())} receiveShadow />
    {/* back wall with arched windows; light from the windows */}
    <mesh geometry={boxG(26, 12, 0.4)} position={[0, 6, -14.2]} material={[texMat("hallwall", wallTex()), texMat("hallwall", wallTex()), mats.get("hallwall")!, mats.get("hallwall")!, mats.get("hallwall")!, mats.get("hallwall")!]} receiveShadow />
    {[-10.4, -5.2, 0, 5.2, 10.4].map((x) => <Glow key={x} p={[x, 7.4, -13.97]} w={2.6} h={5.6} col="#e8f4ff" k={1.15} />)}
    {/* side and front walls, ceiling with skylight strips */}
    {[-13.2, 13.2].map((x) => <M key={x} g={boxG(0.4, 12, 26)} c="#d8ccb4" tex="plaster" p={[x, 6, -2]} recv={false} cast={false} />)}
    <M g={boxG(26, 12, 0.4)} c="#d0c4ac" tex="plaster" p={[0, 6, 11.2]} recv={false} cast={false} />
    {[-5, 5].map((x) => <Glow key={x} p={[x, 1.6, 10.97]} w={2.6} h={3.2} col="#f4f8ff" k={1.3} />)}
    {[-5, 5].map((x) => <Label key={x} text="EXIT" p={[x, 3.6, 10.96]} r={[0, PI, 0]} w={1.0} h={0.32} fg="#ffffff" bg="#2a8a4a" />)}
    <M g={boxG(26.4, 0.4, 26.4)} c="#e8e0d0" p={[0, 12.2, -2]} recv={false} cast={false} />
    {[-6, 0, 6].map((z) => <Glow key={z} p={[0, 11.96, z - 2]} w={18} h={1.2} r={[PI / 2, 0, 0]} col="#f4f8ff" k={1.2} />)}
    {/* platform gates + numbers, a departures board */}
    {[-9, -3, 3, 9].map((x, i) => (
      <group key={x} position={[x, 0, -12.6]}>
        {[-1.4, 1.4].map((dx) => <M key={dx} g={boxG(0.15, 1.1, 0.15)} c="#5a6270" tex="metal" p={[dx, 0.55, 0]} />)}
        {[-0.7, 0.7].map((dx) => <M key={dx} g={boxG(1.2, 0.07, 0.07)} c="#c8ccd4" tex="metal" p={[dx, 0.9, 0]} />)}
        <M g={boxG(1.0, 1.0, 0.1)} c="#1e3a6a" p={[0, 3.4, 0]} />
        <Label text={String(i + 1)} p={[0, 3.4, 0.08]} w={0.8} h={0.8} fg="#ffffff" bg="#1e3a6a" font={0.8} />
      </group>
    ))}
    <M g={boxG(8.4, 2.8, 0.2)} c="#1a1c22" p={[0, 6.2, -13.88]} />
    <Label text="DEPARTURES" p={[0, 7.25, -13.75]} w={7.8} h={0.42} fg="#f8d040" bg="#1a1c22" />
    {["08:41  NORTHFIELD      1  ON TIME", "08:45  BAYPORT         2  DELAYED", "08:52  CEDAR HILLS     3  ON TIME", "09:03  AIRPORT EXP.   4  BOARDING"].map((s, i) => <Label key={s} text={s} p={[0, 6.65 - i * 0.48, -13.75]} w={7.8} h={0.38} fg={i === 1 ? "#ff7a5a" : "#f4f0e0"} bg="#1a1c22" />)}
    {/* the hanging clock (two faces), its rod */}
    <group position={CLOCK_P}>
      <M g={cylG(0.03, 0.03, 5.2, 8)} c="#2a2e34" p={[0, 2.85, 0]} />
      <M g={cylG(0.95, 0.95, 0.24, 40)} c="#3a3e48" tex="metal" r={[PI / 2, 0, 0]} />
      <ClockFace min={clockMin} />
      <group rotation={[0, PI, 0]}><ClockFace min={clockMin} /></group>
    </group>
    {/* columns */}
    {COLS.map((c, i) => (
      <group key={i} position={c}>
        <M g={cylG(0.45, 0.45, 12, 18)} c="#e0d6c4" tex="stone" p={[0, 6, 0]} />
        <M g={cylG(0.62, 0.62, 0.4, 18)} c="#c8bca8" tex="stone" p={[0, 0.2, 0]} />
        <M g={cylG(0.62, 0.5, 0.5, 18)} c="#c8bca8" tex="stone" p={[0, 11.7, 0]} />
      </group>
    ))}
    <Label text="PLATFORMS 1–4 ↑" p={[-6.5, 3.2, -2.52]} w={1.6} h={0.36} fg="#ffffff" bg="#1e3a6a" />
    <Label text="TICKETS →" p={[6.5, 3.2, -2.52]} w={1.4} h={0.36} fg="#ffffff" bg="#1e3a6a" />
    {/* benches, bins */}
    <Bench p={[-3.6, 0, -7.4]} />
    <Bench p={[3.6, 0, -7.4]} />
    <Bench p={[-9.8, 0, 6.5]} yaw={PI / 2} />
    {[[-6.5, -0.9], [6.5, -0.9], [-6.5, 5.0]].map(([x, z], i) => <M key={i} g={cylG(0.26, 0.22, 0.9, 12)} c="#3a5a4a" tex="metal" p={[x, 0.45, z]} />)}
    {/* the coffee kiosk (left) */}
    <group position={[-10, 0, -2]}>
      <M g={boxG(3.2, 1.1, 1.0)} c="#6a3a22" tex="wood" p={[0, 0.55, 0.9]} />
      <M g={boxG(3.3, 0.06, 1.1)} c="#e8e0d0" p={[0, 1.13, 0.9]} />
      <M g={boxG(3.4, 0.14, 2.6)} c="#2a6a4a" p={[0, 2.8, 0.3]} />
      {[-1.6, 1.6].map((x) => <M key={x} g={boxG(0.1, 2.7, 0.1)} c="#2a2e34" p={[x, 1.4, 1.5]} />)}
      <Label text="COFFEE · TEA · BUNS" p={[0, 3.05, 1.62]} w={3.0} h={0.34} fg="#ffffff" bg="#2a6a4a" />
      {[-1.0, -0.6, 0.6, 1.0].map((x, i) => <M key={x} g={cylG(0.05, 0.04, 0.12, 8)} c={i % 2 ? "#f4f0e0" : "#c8402e"} p={[x, 1.22, 0.7]} />)}
      <M g={boxG(0.6, 0.5, 0.4)} c="#c8ccd4" tex="metal" p={[0.1, 1.41, 0.6]} />
    </group>
    {/* ticket machines (right) */}
    {[-4.4, -2.6, -0.8].map((z) => (
      <group key={z} position={[12.4, 0, z]}>
        <M g={boxG(0.7, 1.8, 1.0)} c="#2a4a7a" tex="metal" p={[0, 0.9, 0]} />
        <Glow p={[-0.36, 1.3, 0]} w={0.02} h={0.4} d={0.55} col="#8ad0ff" k={1.2} />
      </group>
    ))}
    {/* pigeons */}
    {[[-2.8, 5.6], [-2.4, 5.9], [4.6, -5.4]].map(([x, z], i) => <Pigeon key={i} p={[x, 0, z]} t={t} seed={i} />)}
    <Label text="CENTRAL STATION" p={[0, 9.6, -13.95]} w={8.0} h={0.9} fg="#2a2a2a" bg="#d8ccb4" />
  </group>
);
export const HALL_BOXES: Box[] = [
  { n: "back wall", min: [-13, 0, -15], max: [13, 12, -13.95] },
  { n: "front wall", min: [-13, 0, 11.0], max: [13, 12, 12] },
  { n: "left wall", min: [-14, 0, -15], max: [-13.0, 12, 12] },
  { n: "right wall", min: [13.0, 0, -15], max: [14, 12, 12] },
  { n: "ceiling", min: [-13, 12.0, -15], max: [13, 13, 12] },
  ...COLS.map((c, i) => ({ n: `column ${i}`, min: [c[0] - 0.62, 0, c[2] - 0.62] as V3, max: [c[0] + 0.62, 12, c[2] + 0.62] as V3 })),
  { n: "clock", min: [CLOCK_P[0] - 0.95, CLOCK_P[1] - 0.95, CLOCK_P[2] - 0.25], max: [CLOCK_P[0] + 0.95, CLOCK_P[1] + 0.95, CLOCK_P[2] + 0.25] },
  { n: "bench L", min: [-4.7, 0, -7.7], max: [-2.5, 1.05, -7.1] },
  { n: "bench R", min: [2.5, 0, -7.7], max: [4.7, 1.05, -7.1] },
  { n: "bench front", min: [-10.1, 0, 5.4], max: [-9.5, 1.05, 7.6] },
  { n: "kiosk", min: [-11.7, 0, -3.0], max: [-8.3, 3.0, -0.6] },
  { n: "ticket machines", min: [12.0, 0, -5.0], max: [13.0, 1.8, -0.3] },
  ...[[-9, -12.6], [-3, -12.6], [3, -12.6], [9, -12.6]].map(([x, z], i) => ({ n: `gate ${i + 1}`, min: [x - 1.5, 0, z - 0.1] as V3, max: [x + 1.5, 1.1, z + 0.1] as V3 })),
];

// ------------------------------------------------------------------ the 1968 lab
export const BOOTH_A: V3 = [-1.5, 0, -1.2];
export const BOOTH_B: V3 = [1.5, 0, -1.2];
export const LAB_DOOR: V3 = [-3.95, 0, 1.3];
/** a listening booth (open toward +z): back + side panels, a desk, headphones, a mic, intercom speaker(s) */
const Booth: React.FC<{ p: V3; n: number; t: number; talk: number }> = ({ p, n, t, talk }) => (
  <group position={p}>
    <M g={boxG(1.8, 2.3, 0.08)} c="#8a6a48" tex="wood" p={[0, 1.15, -0.9]} />
    {[-0.9, 0.9].map((x) => <M key={x} g={boxG(0.08, 2.3, 1.6)} c="#8a6a48" tex="wood" p={[x, 1.15, -0.1]} />)}
    <M g={boxG(0.85, 0.06, 0.55)} c="#c8a878" tex="wood" p={[0.375, 0.74, 0.25]} />
    {[-0.02, 0.77].map((x) => <M key={x} g={boxG(0.05, 0.72, 0.5)} c="#6a4a30" p={[x, 0.36, 0.25]} />)}
    {/* headphones + a desk microphone on its stand */}
    <M g={torusish()} c="#2a2a30" p={[0.4, 0.8, 0.38]} r={[PI / 2, 0, 0]} />
    <M g={cylG(0.015, 0.02, 0.22, 6)} c="#9aa0a8" tex="metal" p={[0.68, 0.88, 0.32]} />
    <M g={sphG(0.05, 10)} c="#3a3e48" p={[0.68, 1.0, 0.32]} />
    {/* the intercom: one speaker, or a panel of five with a name each, their lamps blinking with the voice */}
    {Array.from({ length: n }, (_, k) => {
      const x = n === 1 ? 0 : -0.6 + 0.3 * k;
      const lit = talk > 0.5 && Math.floor(t * 6 + k * 1.7) % 3 === 0;
      return (
        <group key={k} position={[x, 1.75, -0.84]}>
          <M g={boxG(0.24, 0.24, 0.06)} c="#5a5e68" tex="metal" />
          <M g={cylG(0.08, 0.08, 0.02, 14)} c="#2a2a30" p={[0, 0, 0.035]} r={[PI / 2, 0, 0]} cast={false} />
          <mesh geometry={sphG(0.02, 8)} position={[0.08, 0.09, 0.04]} material={coreMat(lit ? "#ff4040" : "#5a1a1a", lit ? 2 : 0.6)} userData={{ outline: false }} />
        </group>
      );
    })}
    {n > 1 ? ["#2", "#3", "#4", "#5", "#6"].map((s, k) => <Label key={s} text={s} p={[-0.6 + 0.3 * k, 1.53, -0.84]} w={0.2} h={0.1} fg="#1a1a1a" bg="#f4efe0" />) : null}
    <Label text={n > 1 ? "BOOTH B · 6 LISTENERS" : "BOOTH A · 2 LISTENERS"} p={[0, 2.12, -0.84]} w={1.5} h={0.18} fg="#1a1a1a" bg="#f4efe0" />
    {/* a wooden chair */}
    <M g={boxG(0.44, 0.05, 0.4)} c="#7a5a3a" tex="wood" p={[0, 0.46, -0.42]} />
    <M g={boxG(0.44, 0.5, 0.05)} c="#7a5a3a" tex="wood" p={[0, 0.72, -0.64]} />
    {[[-0.19, -0.6], [0.19, -0.6], [-0.19, -0.25], [0.19, -0.25]].map(([x, z], i) => <M key={i} g={boxG(0.04, 0.44, 0.04)} c="#5a3a22" p={[x, 0.22, z]} />)}
  </group>
);
let torusCache: THREE.BufferGeometry | null = null;
const torusish = () => (torusCache ??= new THREE.TorusGeometry(0.09, 0.02, 6, 14, PI));
export const Lab: React.FC<{ t: number; talk: number; door: number }> = ({ t, talk, door }) => (
  <group position={LAB}>
    <M g={boxG(9, 0.1, 7)} c="#b8b098" tex="plaster" p={[0, -0.05, 0]} />
    {Array.from({ length: 6 }, (_, i) => <M key={i} g={boxG(9, 0.004, 0.04)} c="#8a8270" p={[0, 0.002, -3 + i * 1.2]} cast={false} recv={false} />)}
    <M g={boxG(9, 3.2, 0.2)} c="#c8d4c0" tex="plaster" p={[0, 1.6, -3.1]} recv={false} />
    <M g={boxG(0.2, 3.2, 1.9)} c="#c8d4c0" tex="plaster" p={[-4.1, 1.6, 2.55]} recv={false} />
    <M g={boxG(0.2, 3.2, 4.3)} c="#c8d4c0" tex="plaster" p={[-4.1, 1.6, -1.05]} recv={false} />
    <M g={boxG(0.2, 0.9, 1.0)} c="#c8d4c0" tex="plaster" p={[-4.1, 2.75, 1.3]} recv={false} />
    <M g={boxG(0.2, 3.2, 7)} c="#c8d4c0" tex="plaster" p={[4.1, 1.6, 0]} recv={false} />
    <M g={boxG(9, 0.2, 7)} c="#e8e4d8" p={[0, 3.3, 0]} recv={false} />
    <M g={boxG(9, 0.9, 0.06)} c="#7a8a6a" p={[0, 0.45, -2.97]} cast={false} />
    {/* the door (swings out into the corridor), the corridor light behind it */}
    <group position={[-4.1, 0, 0.82]} rotation={[0, -door * 1.4, 0]}>
      <M g={boxG(0.06, 2.3, 0.96)} c="#6a4a2e" tex="wood" p={[-0.02, 1.15, 0.48]} />
      <M g={sphG(0.04, 8)} c="#d8b040" p={[0.05, 1.05, 0.85]} />
    </group>
    <Glow p={[-4.3, 1.15, 1.3]} w={0.02} h={2.3} d={0.96} col="#f0f0e0" k={1.2} />
    <Booth p={BOOTH_A} n={1} t={t} talk={talk} />
    <Booth p={BOOTH_B} n={5} t={t} talk={talk} />
    {/* the experimenter's table: reel-to-reel recorder, clipboard, coffee cup; a sign, a calendar, a clock, a lamp */}
    <group position={[2.9, 0, 1.9]}>
      <M g={boxG(1.4, 0.06, 0.7)} c="#8a6a48" tex="wood" p={[0, 0.76, 0]} />
      {[[-0.62, -0.3], [0.62, -0.3], [-0.62, 0.3], [0.62, 0.3]].map(([x, z], i) => <M key={i} g={boxG(0.05, 0.74, 0.05)} c="#5a3a22" p={[x, 0.37, z]} />)}
      <M g={boxG(0.6, 0.22, 0.4)} c="#5a5e68" tex="metal" p={[-0.2, 0.9, 0]} />
      {[-0.36, -0.04].map((x) => <group key={x} position={[x, 1.02, 0]} rotation={[0, t * 3, 0]}><M g={cylG(0.12, 0.12, 0.02, 16)} c="#2a2a30" /><M g={boxG(0.2, 0.025, 0.02)} c="#9aa0a8" cast={false} /></group>)}
      <M g={boxG(0.24, 0.02, 0.32)} c="#a07a50" p={[0.35, 0.8, 0.05]} r={[0, 0.2, 0]} />
      <M g={boxG(0.2, 0.004, 0.27)} c="#f4efe0" p={[0.35, 0.813, 0.05]} r={[0, 0.2, 0]} cast={false} />
      <M g={cylG(0.04, 0.035, 0.09, 10)} c="#f4efe0" p={[0.58, 0.84, -0.2]} />
    </group>
    <Label text="QUIET — STUDY IN PROGRESS" p={[0, 2.75, -2.98]} w={2.6} h={0.3} fg="#ffffff" bg="#a82a2a" />
    <Label text="DEPT. OF PSYCHOLOGY · 1968" p={[3.98, 2.3, 0.2]} r={[0, -PI / 2, 0]} w={2.0} h={0.26} fg="#1a1a1a" bg="#f4efe0" />
    <M g={boxG(0.04, 0.6, 0.45)} c="#f4efe0" p={[3.98, 1.6, -1.3]} />
    <Label text="APRIL 1968" p={[3.95, 1.75, -1.3]} r={[0, -PI / 2, 0]} w={0.4} h={0.12} fg="#a82a2a" bg="#f4efe0" />
    <mesh geometry={coneG(0.35, 0.3, 16)} position={[0, 3.05, 0.3]} material={coreMat("#fff0c8", 1.5)} />
    <LightCone p={[0, 3.0, 0.3]} to={[0, 0, 0.3]} r={1.5} len={3.0} color="#ffe6b0" k={0.08} />
    <pointLight position={[0, 2.7, 0.5]} color="#fff0d0" intensity={6} distance={9} decay={1.4} />
    {/* a plant, coat hooks with a trench coat */}
    <group position={[3.5, 0, -2.5]}><M g={cylG(0.2, 0.16, 0.4, 10)} c="#b85a3a" p={[0, 0.2, 0]} /><M g={sphG(0.36, 10)} c="#3a7a3a" p={[0, 0.65, 0]} /></group>
    <M g={boxG(0.6, 0.05, 0.08)} c="#5a3a22" p={[-3.97, 1.8, -2.2]} r={[0, PI / 2, 0]} />
    <M g={boxG(0.1, 0.9, 0.4)} c="#a89060" tex="fabric" p={[-3.93, 1.35, -2.2]} />
  </group>
);
export const LAB_BOXES: Box[] = [
  { n: "back wall", min: [-4.5, 0, -3.2], max: [4.5, 3.2, -2.94] },
  { n: "left wall front", min: [-4.2, 0, 1.8], max: [-4.0, 3.2, 3.5] },
  { n: "left wall back", min: [-4.2, 0, -3.2], max: [-4.0, 3.2, 0.8] },
  { n: "right wall", min: [4.0, 0, -3.5], max: [4.2, 3.2, 3.5] },
  { n: "ceiling", min: [-4.5, 3.2, -3.5], max: [4.5, 3.4, 3.5] },
  ...[BOOTH_A, BOOTH_B].flatMap((b, i) => [
    { n: `booth ${i ? "B" : "A"} back`, min: [b[0] - 0.9, 0, b[2] - 0.95] as V3, max: [b[0] + 0.9, 2.3, b[2] - 0.85] as V3 },
    { n: `booth ${i ? "B" : "A"} side L`, min: [b[0] - 0.95, 0, b[2] - 0.9] as V3, max: [b[0] - 0.85, 2.3, b[2] + 0.7] as V3 },
    { n: `booth ${i ? "B" : "A"} side R`, min: [b[0] + 0.85, 0, b[2] - 0.9] as V3, max: [b[0] + 0.95, 2.3, b[2] + 0.7] as V3 },
    { n: `booth ${i ? "B" : "A"} desk`, min: [b[0] - 0.06, 0, b[2] - 0.03] as V3, max: [b[0] + 0.8, 0.78, b[2] + 0.53] as V3 },
  ]),
  { n: "table", min: [2.2, 0, 1.55], max: [3.6, 1.05, 2.25] },
];
