// Three Flashes' places:
//   LOT  Riverside General Hospital at night from its parking lot: a 7-storey facade (painted window grid), a real
//        6th-floor band of 15 windows whose panels can blink, and room 612 behind the centre window (bed, lamp, IV pole,
//        flowers, card) where Ellen stands. The lot: painted asphalt, parked cars, lamps with moths, the security
//        booth, an ambulance at the entrance canopy, trees, shrubs, bench, bins, bollards, signs, a skyline, the moon.
//   FB   1974: Tom's porch (door, sconce, switch, rocking chair, plants) across a street from Ellen's house, whose
//        ground-floor window opens onto a lit front room where young Ellen stands.
// Every solid that can meet the lens or a body is listed in LOT_BOXES / FB_BOXES (local coordinates) for the checker.
import React from "react";
import * as THREE from "three";
import { Car as OldCar } from "../agloe/world";
import { Tuft } from "../gull/world";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, M, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

export const LOT: V3 = [0, 0, 0];
export const FB: V3 = [80, 0, 0];
export type Box = { n: string; min: V3; max: V3 };
const PI = Math.PI;
const h1 = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ hospital layout
export const FLOOR_H = 3.0;
/** the 6th floor band: y 15..18; window centres */
export const SIX_Y = 16.5;
export const SIX_X = Array.from({ length: 15 }, (_, i) => -10.5 + 1.5 * i);
export const W612: V3 = [0, SIX_Y, 0];
/** where Ellen stands in room 612 (soles) */
export const ELLEN_P: V3 = [0.08, 15.42, -0.62];
export const BOOTH: V3 = [7.6, 0, 16.2];
export const VISIT_SIGN: V3 = [-3.6, 0, 10.6];

const toonMats = new Map<string, THREE.Material>();
const texMat = (key: string, tex: THREE.Texture) => {
  let m = toonMats.get(key);
  if (!m) { m = new THREE.MeshToonMaterial({ map: tex, color: "#ffffff" }); toonMats.set(key, m); }
  return m;
};
const plainMat = (col: string) => {
  let m = toonMats.get(col);
  if (!m) { m = new THREE.MeshToonMaterial({ color: col }); toonMats.set(col, m); }
  return m;
};
const Glow: React.FC<{ p: V3; w: number; h: number; k?: number; col?: string; r?: V3; d?: number }> = ({ p, w, h, k = 1.5, col = "#ffe2a0", r, d = 0.02 }) => (
  <mesh geometry={boxG(w, h, d)} position={p} rotation={r} material={coreMat(col, k)} userData={{ outline: false }} />
);

/** a facade texture: `floors` rows x 15 windows, some lit warm, some TV-blue, most dark; frames and a concrete grid */
const facadeTex = (key: string, floors: number, seed: number, lobby = false) =>
  canvasTex(`facade|${key}`, 1024, Math.round(1024 * (floors * FLOOR_H) / 24), (g, W, H) => {
    g.fillStyle = "#c8c0b0"; g.fillRect(0, 0, W, H);
    const fh = H / floors, cw = W / 16;
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(80,70,60,${0.04 + h1(i + seed) * 0.06})`; g.fillRect(h1(i * 3 + seed) * W, h1(i * 7 + seed) * H, 6 + 20 * h1(i + 2), 2 + 6 * h1(i + 5)); }
    for (let f = 0; f < floors; f++) {
      g.fillStyle = "#a8a090"; g.fillRect(0, f * fh + fh * 0.86, W, fh * 0.14);
      for (let c = 0; c < 15; c++) {
        const x = cw * (c + 0.5) + cw * 0.18, y = f * fh + fh * 0.18, ww = cw * 0.64, hh = fh * 0.55;
        const big = lobby && f === floors - 1;
        const r = h1(f * 31 + c * 7 + seed);
        g.fillStyle = "#e8e2d4"; g.fillRect(x - 5, y - 5, ww + 10, (big ? fh * 0.7 : hh) + 10);
        g.fillStyle = big ? "#f0d898" : r < 0.22 ? "#f4cc78" : r < 0.3 ? "#8ab0e0" : r < 0.36 ? "#d8b070" : "#25324a";
        g.fillRect(x, y, ww, big ? fh * 0.7 : hh);
        if (!big && r < 0.36) { g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x, y, ww * 0.3, hh); g.fillStyle = "rgba(120,60,40,0.35)"; g.fillRect(x + ww * 0.72, y, ww * 0.28, hh); }
        g.fillStyle = "#e8e2d4"; g.fillRect(x + ww / 2 - 2, y, 4, big ? fh * 0.7 : hh);
      }
    }
  });
const asphaltTex = () =>
  canvasTex("asphalt|lot", 1024, 1024, (g, W, H) => {
    g.fillStyle = "#3a3c42"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { const v = 40 + Math.floor(h1(i) * 40); g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(h1(i + 9) * W, h1(i + 17) * H, 2 + 3 * h1(i + 3), 2 + 3 * h1(i + 4)); }
    for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(20,22,26,0.35)"; g.beginPath(); g.ellipse(h1(i + 50) * W, h1(i + 60) * H, 20 + 50 * h1(i + 70), 10 + 25 * h1(i + 80), h1(i) * 3, 0, 7); g.fill(); }
    // parking bays: two rows along x (texture u = x, v = z from the front edge)
    g.strokeStyle = "#e8e4d0"; g.lineWidth = 6;
    for (const v0 of [0.42, 0.78]) for (let k = 0; k <= 12; k++) { const u = 0.1 + k * 0.067; g.beginPath(); g.moveTo(u * W, v0 * H); g.lineTo(u * W, (v0 + 0.13) * H); g.stroke(); }
    g.fillStyle = "#e8e4d0"; g.font = "bold 46px sans-serif"; g.textAlign = "center";
    g.fillText("VISITORS", 0.5 * W, 0.36 * H);
    g.fillStyle = "#e8c040"; g.fillRect(0.47 * W, 0.62 * H, 0.06 * W, 0.012 * H); g.fillRect(0.47 * W, 0.66 * H, 0.06 * W, 0.012 * H);
  });

const Lamp: React.FC<{ p: V3; t: number; light?: boolean }> = ({ p, t, light }) => (
  <group position={p}>
    <M g={cylG(0.08, 0.12, 5.0, 10)} c="#2a2e34" tex="metal" p={[0, 2.5, 0]} />
    <M g={boxG(0.9, 0.08, 0.08)} c="#2a2e34" p={[0.4, 5.0, 0]} />
    <M g={boxG(0.4, 0.18, 0.4)} c="#2a2e34" p={[0.82, 4.95, 0]} />
    <mesh geometry={boxG(0.32, 0.06, 0.32)} position={[0.82, 4.84, 0]} material={coreMat("#ffe0a0", 2.4)} userData={{ outline: false }} />
    {light ? <pointLight position={[0.82, 4.6, 0]} color="#ffd890" intensity={9} distance={12} decay={1.5} /> : null}
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} geometry={sphG(0.02, 5)} position={[0.82 + 0.32 * Math.cos(t * 3 + i * 1.3), 4.7 + 0.15 * Math.sin(t * 4.1 + i), 0.32 * Math.sin(t * 3 + i * 1.3)]} material={coreMat("#fff2c8", 1.4)} userData={{ outline: false }} />)}
  </group>
);
/** a modern compact car, nose toward +x */
const Car: React.FC<{ p: V3; yaw?: number; col: string }> = ({ p, yaw = 0, col }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(3.9, 0.7, 1.74)} c={col} tex="metal" p={[0, 0.62, 0]} />
    <M g={boxG(2.1, 0.62, 1.6)} c={col} tex="metal" p={[-0.25, 1.28, 0]} />
    {[-1, 1].map((z) => <mesh key={z} geometry={boxG(1.8, 0.44, 0.02)} material={coreMat("#1e2838", 0.9)} position={[-0.25, 1.3, z * 0.82]} />)}
    <mesh geometry={boxG(0.02, 0.48, 1.4)} material={coreMat("#24324a", 0.9)} position={[0.81, 1.28, 0]} rotation={[0, 0, -0.35]} />
    {[-1, 1].map((z) => <mesh key={z} geometry={boxG(0.04, 0.12, 0.3)} material={coreMat("#fff4d0", 1.1)} position={[1.96, 0.75, z * 0.6]} userData={{ outline: false }} />)}
    {[-1, 1].map((z) => <mesh key={z} geometry={boxG(0.04, 0.12, 0.3)} material={coreMat("#c02020", 0.9)} position={[-1.96, 0.78, z * 0.6]} userData={{ outline: false }} />)}
    {[[1.25, -0.82], [1.25, 0.82], [-1.25, -0.82], [-1.25, 0.82]].map(([x, z], i) => <M key={i} g={cylG(0.34, 0.34, 0.24, 14)} c="#18181c" p={[x, 0.34, z]} r={[PI / 2, 0, 0]} />)}
    <M g={boxG(0.06, 0.16, 1.5)} c="#9aa0a8" tex="metal" p={[1.97, 0.45, 0]} />
  </group>
);
const Shrub: React.FC<{ p: V3; s?: number; seed: number }> = ({ p, s = 1, seed }) => (
  <group position={p} scale={s}>
    {[[0, 0.35, 0, 0.45], [0.35, 0.3, 0.1, 0.35], [-0.33, 0.28, -0.05, 0.34]].map(([x, y, z, r], i) => <M key={i} g={sphG(r, 10)} c={(seed + i) % 2 ? "#2e5a36" : "#3a6a40"} p={[x, y, z]} />)}
  </group>
);
const Tree: React.FC<{ p: V3; s?: number; seed: number; t: number }> = ({ p, s = 1, seed, t }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.18, 0.28, 2.4, 10)} c="#3e3228" tex="wood" p={[0, 1.2, 0]} />
    <group rotation={[0, 0, 0.02 * Math.sin(t * 1.3 + seed)]}>
      {[[0, 3.0, 0, 1.15], [0.65, 2.6, 0.3, 0.85], [-0.65, 2.7, -0.2, 0.9], [0.1, 3.6, 0.2, 0.75]].map(([x, y, z, r], i) => <M key={i} g={sphG(r, 12)} c={i % 2 ? "#2a5236" : "#34603e"} p={[x, y, z]} />)}
    </group>
  </group>
);
const Bench: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    {[0, 1, 2].map((i) => <M key={i} g={boxG(1.6, 0.04, 0.12)} c="#8a5a30" tex="wood" p={[0, 0.45, -0.15 + i * 0.15]} />)}
    {[0, 1].map((i) => <M key={i} g={boxG(1.6, 0.12, 0.04)} c="#8a5a30" tex="wood" p={[0, 0.7 + i * 0.16, -0.24]} />)}
    {[-0.7, 0.7].map((x) => <M key={x} g={boxG(0.06, 0.45, 0.4)} c="#2a2e34" tex="metal" p={[x, 0.22, 0]} />)}
  </group>
);
/** the security booth: a small cabin with a lit window, a monitor glow, a desk lamp, a door, a SECURITY sign */
const Booth: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(2.0, 0.2, 2.0)} c="#8a8a84" tex="plaster" p={[0, 0.1, 0]} />
    <M g={boxG(1.9, 2.3, 1.9)} c="#d8d4c8" tex="plaster" p={[0, 1.35, 0]} recv={false} />
    <M g={boxG(2.4, 0.18, 2.4)} c="#3a4a5a" tex="metal" p={[0, 2.6, 0]} />
    {/* window on the lot side (-x) and the door on the street side (+z) */}
    <Glow p={[-0.975, 1.55, 0]} w={0.02} h={0.8} col="#ffe0a8" k={1.3} d={1.3} />
    {[[-0.99, 1.98, 0, 0.06, 0.08, 1.42], [-0.99, 1.12, 0, 0.06, 0.08, 1.42], [-0.99, 1.55, 0, 0.06, 0.82, 0.06]].map(([x, y, z, w, h, d], i) => <M key={i} g={boxG(w, h, d)} c="#3a4a5a" p={[x, y, z]} />)}
    <Glow p={[-1.01, 1.4, 0.35]} w={0.03} h={0.24} col="#7ad0ff" k={1.6} d={0.34} />
    <M g={boxG(0.8, 2.0, 0.06)} c="#5a6a7a" tex="metal" p={[0.4, 1.2, 0.97]} />
    <M g={sphG(0.04, 8)} c="#d8c050" p={[0.1, 1.15, 1.02]} />
    <Label text="SECURITY" p={[-1.04, 2.3, 0]} r={[0, -PI / 2, 0]} w={1.2} h={0.24} fg="#ffffff" bg="#2a4a8a" />
    <Label text="SECURITY" p={[0, 2.3, 1.0]} w={1.2} h={0.24} fg="#ffffff" bg="#2a4a8a" />
    <M g={cylG(0.12, 0.12, 0.3, 8)} c="#c83030" p={[0.75, 0.15, 1.15]} />
  </group>
);
const Ambulance: React.FC<{ p: V3; yaw: number; t: number }> = ({ p, yaw, t }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(3.0, 2.1, 2.0)} c="#f2f0ea" tex="metal" p={[-0.6, 1.4, 0]} />
    <M g={boxG(1.4, 1.3, 1.9)} c="#f2f0ea" tex="metal" p={[1.6, 1.0, 0]} />
    <mesh geometry={boxG(0.02, 0.55, 1.6)} material={coreMat("#24324a", 0.9)} position={[2.31, 1.35, 0]} />
    {[-1, 1].map((z) => <M key={z} g={boxG(3.02, 0.22, 0.02)} c="#c82828" p={[-0.6, 1.2, z * 1.01]} cast={false} />)}
    {[-1, 1].map((z) => <Label key={z} text="AMBULANCE" p={[-0.6, 1.75, z * 1.025]} r={[0, z > 0 ? 0 : PI, 0]} w={2.0} h={0.32} fg="#c82828" bg="#f2f0ea" />)}
    <mesh geometry={boxG(0.5, 0.14, 1.2)} material={coreMat(Math.floor(t * 2) % 2 ? "#ff4040" : "#a02020", Math.floor(t * 2) % 2 ? 1.6 : 0.7)} position={[1.4, 1.72, 0]} userData={{ outline: false }} />
    {[[1.6, -0.9], [1.6, 0.9], [-1.5, -0.9], [-1.5, 0.9]].map(([x, z], i) => <M key={i} g={cylG(0.38, 0.38, 0.26, 14)} c="#18181c" p={[x, 0.38, z]} r={[PI / 2, 0, 0]} />)}
  </group>
);
/** the room behind window 612: floor, walls, ceiling, bed, lamp on a side table, IV pole, flowers, a card, a TV, a photo */
const Room612: React.FC<{ lamp: number }> = ({ lamp }) => (
  <group>
    <M g={boxG(1.78, 0.1, 3.0)} c="#c8c0a8" p={[0, 15.05, -2.0]} />
    <M g={boxG(1.78, 2.85, 0.1)} c="#e8dcc0" tex="plaster" p={[0, 16.5, -3.45]} recv={false} />
    {[-1, 1].map((s) => <M key={s} g={boxG(0.06, 2.85, 3.0)} c="#e8dcc0" tex="plaster" p={[s * 0.92, 16.5, -2.0]} recv={false} />)}
    <M g={boxG(1.78, 0.1, 3.0)} c="#f0ece0" p={[0, 17.93, -2.0]} recv={false} />
    {/* bed along the right wall, head at the back */}
    <M g={boxG(0.9, 0.45, 2.0)} c="#c8ccd4" tex="metal" p={[0.4, 15.45, -2.3]} />
    <M g={boxG(0.86, 0.14, 1.96)} c="#f4f2ec" tex="fabric" p={[0.4, 15.74, -2.3]} />
    <M g={boxG(0.84, 0.1, 1.2)} c="#a8c0e0" tex="fabric" p={[0.4, 15.84, -1.95]} cast={false} />
    <M g={boxG(0.6, 0.14, 0.36)} c="#ffffff" tex="fabric" p={[0.4, 15.88, -3.05]} />
    <M g={boxG(0.9, 0.7, 0.06)} c="#b8bcc4" tex="metal" p={[0.4, 15.75, -3.32]} />
    {/* side table + lamp (left), IV pole, TV on the back wall, a framed photo, a get-well card */}
    <M g={boxG(0.45, 0.6, 0.4)} c="#a07a50" tex="wood" p={[-0.6, 15.4, -2.9]} />
    <M g={cylG(0.03, 0.07, 0.3, 10)} c="#d8c8a0" p={[-0.6, 15.85, -2.95]} />
    <mesh geometry={coneG(0.14, 0.18, 14)} position={[-0.6, 16.07, -2.95]} material={coreMat("#ffd890", 0.8 + 1.2 * lamp)} />
    {lamp > 0.1 ? <pointLight position={[-0.5, 16.3, -2.6]} color="#ffcf88" intensity={3 * lamp} distance={4} decay={1.5} /> : null}
    <M g={cylG(0.015, 0.015, 1.8, 6)} c="#c8ccd4" tex="metal" p={[0.92 - 0.12, 15.95, -1.2]} />
    <M g={boxG(0.12, 0.2, 0.04)} c="#d8f0f8" p={[0.8, 16.75, -1.2]} cast={false} />
    <M g={boxG(0.7, 0.42, 0.06)} c="#1a1c22" p={[-0.2, 17.2, -3.38]} />
    <Glow p={[-0.2, 17.2, -3.34]} w={0.62} h={0.34} col="#4a6a9a" k={0.7} />
    <M g={boxG(0.22, 0.28, 0.03)} c="#8a5a30" tex="wood" p={[-0.6, 15.84, -3.04]} r={[-0.15, 0.2, 0]} />
    <M g={boxG(0.17, 0.22, 0.01)} c="#e8d0a8" p={[-0.6, 15.85, -3.02]} r={[-0.15, 0.2, 0]} cast={false} />
    <M g={boxG(0.16, 0.22, 0.01)} c="#f8d0e0" p={[-0.68, 15.82, -2.78]} r={[0, 0.5, 0.08]} cast={false} />
    {/* flowers in a vase on the side table */}
    <M g={cylG(0.06, 0.05, 0.2, 10)} c="#6a9ac8" p={[-0.7, 15.8, -2.8]} />
    {[[-0.7, 16.0, -2.8, "#e84a6a"], [-0.65, 16.04, -2.77, "#f4d040"], [-0.75, 16.02, -2.82, "#f0f0f0"], [-0.68, 16.07, -2.84, "#e84a6a"]].map(([x, y, z, c], i) => <M key={i} g={sphG(0.045, 8)} c={c as string} p={[x as number, y as number, z as number]} />)}
  </group>
);
/** a flashlight with a beam that reads on screen: a body, a lit lens, two soft cones reaching toward `to` (up to 22 m) */
export const Torch: React.FC<{ p: V3; to: V3; on: number }> = ({ p, to, on }) => {
  const d = [to[0] - p[0], to[1] - p[1], to[2] - p[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const yaw = Math.atan2(d[0], d[2]);
  const pitch = Math.asin(-d[1] / L);
  const bl = Math.min(L, 22);
  return (
    <group position={p} rotation={[pitch, yaw, 0]} rotation-order="YXZ">
      <M g={cylG(0.03, 0.024, 0.22, 10)} c="#2a2c34" tex="metal" r={[PI / 2, 0, 0]} />
      <mesh geometry={cylG(0.034, 0.034, 0.03, 12)} position={[0, 0, 0.11]} rotation={[PI / 2, 0, 0]} material={coreMat("#fff4d0", on > 0.5 ? 3.2 : 0.4)} userData={{ outline: false }} />
      {on > 0.5 ? <mesh geometry={coneG(0.14 + bl * 0.045, bl, 20)} material={coreMat("#fff0b8", 1.0, 0.16)} position={[0, 0, 0.12 + bl / 2]} rotation={[-PI / 2, 0, 0]} userData={{ outline: false }} /> : null}
      {on > 0.5 ? <mesh geometry={coneG(0.05 + bl * 0.016, bl * 0.8, 16)} material={coreMat("#fffbe8", 1.2, 0.24)} position={[0, 0, 0.12 + bl * 0.4]} rotation={[-PI / 2, 0, 0]} userData={{ outline: false }} /> : null}
      
    </group>
  );
};
/** Ellen's phone: a slab with a light that blinks */
export const Phone: React.FC<{ p: V3; yaw: number; on: number }> = ({ p, yaw, on }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(0.075, 0.15, 0.012)} c="#1a1c22" />
    <mesh geometry={sphG(0.022, 10)} position={[0.02, 0.05, 0.012]} material={coreMat("#ffffff", on > 0.5 ? 4 : 0.4)} userData={{ outline: false }} />
    {on > 0.5 ? <mesh geometry={sphG(0.11, 12)} position={[0.02, 0.06, 0.1]} material={coreMat("#fffbe8", 3)} userData={{ outline: false }} /> : null}
    {on > 0.5 ? <pointLight position={[0, 0.05, 0.25]} color="#ffffff" intensity={5} distance={4} decay={1.4} /> : null}
  </group>
);

export const Lot: React.FC<{ t: number; sixth: number[]; lamp612: number; next: boolean }> = ({ t, sixth, lamp612, next }) => {
  const fLow = facadeTex("low", 5, 3, true), fUp = facadeTex("up", 1, 9);
  const mLow = [plainMat("#b8b0a0"), plainMat("#b8b0a0"), plainMat("#9a948a"), plainMat("#9a948a"), texMat("low", fLow), plainMat("#b8b0a0")];
  const mUp = [plainMat("#b8b0a0"), plainMat("#b8b0a0"), plainMat("#8a847a"), plainMat("#8a847a"), texMat("up", fUp), plainMat("#b8b0a0")];
  return (
    <group position={LOT}>
      {/* ---------------- ground: asphalt lot, sidewalk + curb along the facade, grass strips */}
      <mesh geometry={boxG(40, 0.1, 34)} position={[0, -0.05, 18]} material={texMat("asphalt", asphaltTex())} receiveShadow />
      <M g={boxG(30, 0.15, 3.4)} c="#a8a49a" tex="plaster" p={[0, 0.075, 1.7]} />
      <M g={boxG(30, 0.18, 0.2)} c="#c8c4b8" p={[0, 0.09, 3.5]} />
      {[-13, 13].map((x) => <M key={x} g={boxG(4, 0.12, 30)} c="#3e5a34" p={[x + Math.sign(x) * 3, 0.06, 18]} />)}
      {Array.from({ length: 40 }, (_, i) => <Tuft key={i} p={[(i % 2 ? 1 : -1) * (14.2 + 3 * h1(i)), 0.12, 4 + 28 * h1(i + 40)]} s={0.8 + 0.5 * h1(i + 7)} seed={i} />)}
      {/* ---------------- the hospital */}
      <mesh geometry={boxG(24, 14.98, 10)} position={[0, 7.49, -5]} material={mLow} castShadow receiveShadow />
      <M g={boxG(24, 0.75, 0.4)} c="#c8c0b0" tex="plaster" p={[0, 15.375, -0.2]} recv={false} />
      <M g={boxG(24, 0.75, 0.4)} c="#c8c0b0" tex="plaster" p={[0, 17.625, -0.2]} recv={false} />
      {SIX_X.slice(0, 14).map((x) => <M key={x} g={boxG(0.5, 1.5, 0.4)} c="#c8c0b0" tex="plaster" p={[x + 0.75, SIX_Y, -0.2]} recv={false} />)}
      {[-11.5, 11.5].map((x) => <M key={x} g={boxG(1.0, 1.5, 0.4)} c="#c8c0b0" tex="plaster" p={[x, SIX_Y, -0.2]} recv={false} />)}
      {/* the 6th floor's inside: two filler blocks either side of room 612, one behind it */}
      <M g={boxG(11.0, 2.96, 9.4)} c="#6a6458" p={[-6.5, 16.5, -5.3]} recv={false} />
      <M g={boxG(11.0, 2.96, 9.4)} c="#6a6458" p={[6.5, 16.5, -5.3]} recv={false} />
      <M g={boxG(2.0, 2.96, 6.4)} c="#6a6458" p={[0, 16.5, -6.8]} recv={false} />
      {SIX_X.map((x, i) => (i === 7 ? null : (
        <group key={x}>
          <Glow p={[x, SIX_Y, -0.46]} w={1.0} h={1.5} col={sixth[i] > 0.5 ? "#fff6d8" : h1(i + 3) < 0.5 ? "#e8b868" : "#2a3450"} k={sixth[i] > 0.5 ? 3.0 : h1(i + 3) < 0.5 ? 1.0 : 0.5} />
          <M g={boxG(0.06, 1.5, 0.06)} c="#e8e2d4" p={[x, SIX_Y, -0.42]} cast={false} />
          <M g={boxG(1.1, 0.07, 0.3)} c="#d8d0be" p={[x, 15.7, 0.12]} />
        </group>
      )))}
      <M g={boxG(1.1, 0.07, 0.3)} c="#d8d0be" p={[0, 15.7, 0.12]} />
      <Room612 lamp={lamp612} />
      <mesh geometry={boxG(24, 3, 10)} position={[0, 19.52, -5]} material={mUp} castShadow receiveShadow />
      <M g={boxG(24.4, 0.5, 10.4)} c="#9a948a" p={[0, 21.3, -5]} />
      {/* rooftop sign and a red cross */}
      <M g={boxG(9.0, 1.3, 0.2)} c="#1e2a3a" p={[0, 22.4, -0.6]} />
      <Label text="RIVERSIDE GENERAL" p={[0, 22.4, -0.46]} w={8.6} h={1.0} fg="#ffffff" bg="#1e5aa8" />
      <Glow p={[6.0, 22.4, -0.45]} w={0.9} h={0.3} col="#ff3030" k={2} />
      <Glow p={[6.0, 22.4, -0.43]} w={0.3} h={0.9} col="#ff3030" k={2} />
      {/* the entrance: canopy, glowing sliding doors, an EMERGENCY sign, planters */}
      <M g={boxG(5, 0.3, 3.2)} c="#e8e4dc" p={[-6, 3.4, 1.6]} />
      {[[-8.3, 3.0], [-3.7, 3.0]].map(([x, z]) => <M key={x} g={cylG(0.1, 0.1, 3.3, 8)} c="#c8ccd4" tex="metal" p={[x, 1.65, z]} />)}
      <Glow p={[-6, 1.3, 0.04]} w={2.6} h={2.4} col="#d8f0e8" k={1.4} />
      <M g={boxG(0.06, 2.4, 0.04)} c="#9aa0a8" p={[-6, 1.3, 0.07]} cast={false} />
      <Label text="EMERGENCY" p={[-6, 3.4, 3.23]} w={3.2} h={0.32} fg="#ffffff" bg="#c82828" />
      <Label text="MAIN ENTRANCE" p={[-6, 2.85, 0.06]} w={2.4} h={0.26} fg="#1e2a3a" bg="#e8e4dc" />
      {/* visiting hours sign on the walk */}
      <group position={VISIT_SIGN}>
        {[-0.55, 0.55].map((x) => <M key={x} g={cylG(0.035, 0.035, 1.4, 8)} c="#5a6068" tex="metal" p={[x, 0.7, 0]} />)}
        <M g={boxG(1.4, 0.95, 0.06)} c="#1e5aa8" p={[0, 1.55, 0]} />
        <Label text="VISITING HOURS" p={[0, 1.83, 0.04]} w={1.2} h={0.2} fg="#ffffff" bg="#1e5aa8" />
        <Label text="10 AM – 8 PM" p={[0, 1.55, 0.04]} w={1.25} h={0.28} fg="#ffe070" bg="#1e5aa8" />
        <Label text="NO VISITORS AFTER 8" p={[0, 1.27, 0.04]} w={1.2} h={0.15} fg="#ffffff" bg="#c82828" />
      </group>
      {/* shrubs + benches + bins along the facade; trees in the lot; bollards; a pay machine; a P sign */}
      {Array.from({ length: 9 }, (_, i) => <Shrub key={i} p={[-11 + i * 2.7, 0.15, 0.7]} s={0.9 + 0.3 * h1(i)} seed={i} />).filter((_, i) => i !== 2)}
      <Bench p={[2.6, 0.15, 2.2]} />
      <Bench p={[-1.2, 0.15, 2.2]} />
      <M g={cylG(0.25, 0.22, 0.85, 12)} c="#3a5a4a" tex="metal" p={[0.7, 0.57, 2.5]} />
      {[-9.5, 9.5].map((x, i) => <Tree key={x} p={[x, 0, 9]} s={1.2} seed={i} t={t} />)}
      <Tree p={[-12.5, 0, 22]} s={1.4} seed={5} t={t} />
      <Tree p={[12.5, 0, 24]} s={1.3} seed={7} t={t} />
      {[-4, -2, 2, 4].map((x) => <M key={x} g={cylG(0.1, 0.1, 0.8, 8)} c="#e8c040" p={[x, 0.4, 4.2]} />)}
      <M g={boxG(0.5, 1.5, 0.4)} c="#3a4a5a" tex="metal" p={[4.6, 0.75, 10.8]} />
      <Glow p={[4.6, 1.15, 11.01]} w={0.3} h={0.2} col="#7ad0ff" k={1.4} />
      <M g={cylG(0.05, 0.05, 2.6, 8)} c="#5a6068" p={[-5.5, 1.3, 11.5]} />
      <Label text="P" p={[-5.5, 2.75, 11.56]} w={0.5} h={0.5} fg="#ffffff" bg="#1e5aa8" font={0.8} />
      {/* cars in the bays (two rows) and the ambulance at the canopy */}
      {[[-10.5, 8.8, "#b83a2e"], [-7.8, 8.8, "#3a5a8a"], [5.4, 8.8, "#e8e4dc"], [10.8, 8.8, "#4a6a4a"], [-9.2, 21.0, "#6a6a72"], [-3.8, 21.0, "#c8a040"], [8.2, 21.0, "#2a2a30"]].map(([x, z, c], i) => <Car key={i} p={[x as number, 0, z as number]} yaw={PI / 2} col={c as string} />)}
      <Ambulance p={[-10.6, 0, 3.6]} yaw={PI} t={t} />
      {/* a cat on the white car's roof */}
      <group position={[5.6, 1.6, 8.6]}>
        <M g={sphG(0.16, 10)} c="#e08a30" p={[0, 0.14, 0]} />
        <M g={sphG(0.11, 10)} c="#e08a30" p={[0.17, 0.3, 0]} />
        {[-1, 1].map((s) => <mesh key={s} geometry={coneG(0.04, 0.08, 6)} position={[0.17, 0.42, s * 0.05]} material={coreMat("#c86a20", 0.9)} />)}
        <M g={cylG(0.025, 0.02, 0.4, 6)} c="#e08a30" p={[-0.2, 0.1, 0.1]} r={[0.4, 0, 1.2 + 0.2 * Math.sin(t * 2)]} />
      </group>
      {/* lamps, the booth */}
      <Lamp p={[-4.5, 0, 14.5]} t={t} light />
      <Lamp p={[6.0, 0, 14.5]} t={t} />
      <Lamp p={[-13, 0, 6]} t={t} />
      <Booth p={BOOTH} />
      {/* skyline behind + a moon */}
      {Array.from({ length: 9 }, (_, i) => {
        const x = -40 + i * 10 + 4 * h1(i), hh = 22 + 16 * h1(i + 3);
        return <M key={i} g={boxG(7, hh, 6)} c={i % 2 ? "#283244" : "#202a3a"} p={[x, hh / 2, -30 - 6 * h1(i + 9)]} cast={false} recv={false} />;
      })}
      {Array.from({ length: 45 }, (_, k) => {
        const i = k % 9, x = -40 + i * 10 + 4 * h1(i), hh = 22 + 16 * h1(i + 3), zf = -27 - 6 * h1(i + 9) + 0.04;
        return <mesh key={k} geometry={boxG(0.6, 0.8, 0.04)} position={[x - 2.5 + 5 * h1(k + 20), 3 + (hh - 5) * h1(k + 30), zf]} material={coreMat(h1(k) < 0.6 ? "#f4cc78" : "#8ab0e0", 1.0)} userData={{ outline: false }} />;
      })}
      <mesh geometry={sphG(3.2, 20)} position={[-26, 46, -70]} material={coreMat("#f4f0dc", 1.4)} userData={{ outline: false }} />
      {next ? <Label text="WE LOVE YOU, ELLEN" p={[-1.2, 0.12, 15.6]} r={[-PI / 2, 0, 0]} w={3.2} h={0.5} fg="#f4f0e0" bg="#3a3c42" /> : null}
    </group>
  );
};
/** the checker's solids in LOT-local coordinates */
export const LOT_BOXES: Box[] = [
  { n: "hospital low", min: [-12, 0, -10], max: [12, 15.0, 0] },
  { n: "hospital high", min: [-12, 18.0, -10], max: [12, 23.1, 0] },
  { n: "6th floor L", min: [-12, 15.0, -10], max: [-1.0, 18.0, 0] },
  { n: "6th floor R", min: [1.0, 15.0, -10], max: [12, 18.0, 0] },
  { n: "612 sill", min: [-1.0, 15.0, -0.4], max: [1.0, 15.75, 0.27] },
  { n: "612 lintel", min: [-1.0, 17.25, -0.4], max: [1.0, 18.0, 0] },
  { n: "612 pillars L", min: [-1.0, 15.0, -0.4], max: [-0.5, 18.0, 0] },
  { n: "612 pillars R", min: [0.5, 15.0, -0.4], max: [1.0, 18.0, 0] },
  { n: "612 back", min: [-1.0, 15.0, -10], max: [1.0, 18.0, -3.4] },
  { n: "612 walls L", min: [-1.0, 15.0, -3.5], max: [-0.89, 18.0, -0.4] },
  { n: "612 walls R", min: [0.89, 15.0, -3.5], max: [1.0, 18.0, -0.4] },
  { n: "sidewalk", min: [-15, 0, 0], max: [15, 0.18, 3.6] },
  { n: "canopy", min: [-8.5, 3.25, 0], max: [-3.5, 3.55, 3.2] },
  { n: "ambulance", min: [-12.9, 0, 2.6], max: [-8.3, 2.5, 4.6] },
  { n: "booth", min: [BOOTH[0] - 1.2, 0, BOOTH[2] - 1.2], max: [BOOTH[0] + 1.2, 2.7, BOOTH[2] + 1.2] },
  { n: "visit sign", min: [VISIT_SIGN[0] - 0.7, 0, VISIT_SIGN[2] - 0.06], max: [VISIT_SIGN[0] + 0.7, 2.05, VISIT_SIGN[2] + 0.06] },
  { n: "pay machine", min: [4.35, 0, 10.6], max: [4.85, 1.5, 11.0] },
  ...[[-10.5, 8.8], [-7.8, 8.8], [5.4, 8.8], [10.8, 8.8], [-9.2, 21.0], [-3.8, 21.0], [8.2, 21.0]].map(([x, z], i) => ({ n: `car ${i}`, min: [x - 0.9, 0, z - 2.0] as V3, max: [x + 0.9, 1.6, z + 2.0] as V3 })),
  ...[[-4.5, 14.5], [6.0, 14.5], [-13, 6]].map(([x, z], i) => ({ n: `lamp ${i}`, min: [x - 0.15, 0, z - 0.15] as V3, max: [x + 0.15, 5.0, z + 0.15] as V3 })),
  ...[[-9.5, 9], [9.5, 9], [-12.5, 22], [12.5, 24]].map(([x, z], i) => ({ n: `tree ${i}`, min: [x - 0.35, 0, z - 0.35] as V3, max: [x + 0.35, 2.8, z + 0.35] as V3 })),
  { n: "room612 floor", min: [-0.9, 15.0, -3.5], max: [0.9, 15.1, -0.4] },
  { n: "room612 bed", min: [-0.05, 15.0, -3.35], max: [0.85, 15.95, -1.3] },
];

// ------------------------------------------------------------------ 1974: the porch and the house across the street
export const PORCH_SWITCH: V3 = [0.75, 1.5, 0.04];
export const YT_P: V3 = [0.5, 0.42, 0.52];
export const YE_P: V3 = [1.2, 0.1, 14.75];
const sidingTex = (key: string, col: string, line: string) =>
  canvasTex(`siding|${key}`, 512, 512, (g, W, H) => {
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 22) { g.fillStyle = line; g.fillRect(0, y, W, 3); }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(60,40,20,${0.03 + 0.05 * h1(i)})`; g.fillRect(h1(i + 4) * W, h1(i + 8) * H, 10 + 30 * h1(i), 2); }
  });
const HouseWin: React.FC<{ p: V3; lit: boolean; r?: V3 }> = ({ p, lit, r }) => (
  <group position={p} rotation={r}>
    <Glow p={[0, 0, 0]} w={1.0} h={1.2} col={lit ? "#ffd890" : "#24304a"} k={lit ? 1.4 : 0.5} />
    {[[0, 0.64, 1.16, 0.08], [0, -0.64, 1.16, 0.08], [-0.54, 0, 0.08, 1.2], [0.54, 0, 0.08, 1.2], [0, 0, 0.05, 1.2], [0, 0, 1.0, 0.05]].map(([x, y, w, h], i) => <M key={i} g={boxG(w, h, 0.08)} c="#f4efe6" p={[x, y, 0.05]} cast={false} />)}
    {[-0.75, 0.75].map((x) => <M key={x} g={boxG(0.32, 1.3, 0.05)} c="#3a5a7a" p={[x, 0, 0.04]} />)}
  </group>
);
export const Porch: React.FC<{ t: number; porch: number }> = ({ t, porch }) => {
  const sA = texMat("sidingA", sidingTex("A", "#e8d8a8", "#c8b888")), sB = texMat("sidingB", sidingTex("B", "#a8c8c0", "#88a8a0"));
  return (
    <group position={FB}>
      {/* ground: lawns, the street, sidewalks */}
      <M g={boxG(30, 0.1, 6)} c="#4a6a3a" p={[0, -0.05, 2.0]} />
      <M g={boxG(30, 0.12, 1.6)} c="#a8a49a" tex="plaster" p={[0, 0.06, 5.6]} />
      <M g={boxG(30, 0.1, 5.4)} c="#3a3c42" p={[0, -0.04, 9.1]} />
      {[-12, -6, 0, 6, 12].map((x) => <M key={x} g={boxG(2.0, 0.02, 0.14)} c="#e8d050" p={[x, 0.02, 9.1]} cast={false} />)}
      <M g={boxG(30, 0.12, 1.6)} c="#a8a49a" tex="plaster" p={[0, 0.06, 12.6]} />
      <M g={boxG(30, 0.1, 6)} c="#4a6a3a" p={[0, -0.05, 16.4]} />
      {Array.from({ length: 36 }, (_, i) => <Tuft key={i} p={[-13 + 26 * h1(i), 0.02, i % 2 ? 1.2 + 3 * h1(i + 5) : 13.6 + 0.8 * h1(i + 5)]} s={0.8 + 0.4 * h1(i + 2)} seed={i} />).filter((_, i) => !(Math.abs(-13 + 26 * h1(i)) < 2.6 && i % 2 === 0) && !(i % 2 === 1 && Math.abs(-13 + 26 * h1(i)) < 2.4))}
      {/* Tom's house: siding facade, door, porch deck, posts, roof, sconce + switch, windows, rocking chair, plants */}
      <mesh geometry={boxG(8, 6, 6)} position={[0, 3, -3]} material={[sA, sA, plainMat("#8a5a4a"), sA, sA, sA]} castShadow receiveShadow />
      <M g={boxG(9, 0.3, 7)} c="#7a3a2e" p={[0, 6.15, -3]} />
      <M g={boxG(1.0, 2.1, 0.06)} c="#7a4a2a" tex="wood" p={[-0.2, 1.47, 0.05]} />
      <M g={sphG(0.04, 8)} c="#d8b040" p={[0.18, 1.45, 0.1]} />
      <M g={boxG(4.4, 0.4, 2.2)} c="#9a7a5a" tex="wood" p={[0, 0.2, 1.1]} />
      <M g={boxG(1.4, 0.2, 0.4)} c="#9a7a5a" tex="wood" p={[0, 0.1, 2.4]} />
      {[-2.0, 2.0].map((x) => <M key={x} g={boxG(0.14, 2.6, 0.14)} c="#f4efe6" p={[x, 1.7, 2.05]} />)}
      <M g={boxG(4.6, 0.16, 2.5)} c="#6a3a2e" p={[0, 3.08, 1.15]} />
      <group position={[0.75, 2.15, 0.04]}>
        <M g={boxG(0.16, 0.24, 0.04)} c="#2a2a2a" />
        <mesh geometry={sphG(0.08, 10)} position={[0, -0.02, 0.1]} material={coreMat("#ffe0a0", porch > 0.5 ? 3.0 : 0.35)} userData={{ outline: false }} />
        {porch > 0.5 ? <pointLight position={[0, -0.1, 0.4]} color="#ffd890" intensity={7} distance={6} decay={1.5} /> : null}
      </group>
      <M g={boxG(0.09, 0.14, 0.02)} c="#f4efe6" p={PORCH_SWITCH} cast={false} />
      <M g={boxG(0.02, 0.05, 0.02)} c="#c8b890" p={[PORCH_SWITCH[0], PORCH_SWITCH[1] + (porch > 0.5 ? 0.02 : -0.02), PORCH_SWITCH[2] + 0.02]} cast={false} />
      <HouseWin p={[-2.4, 1.6, 0.05]} lit />
      <HouseWin p={[2.4, 1.6, 0.05]} lit={false} />
      <HouseWin p={[-1.8, 4.4, 0.05]} lit={false} />
      <HouseWin p={[1.8, 4.4, 0.05]} lit />
      <group position={[-1.4, 0.4, 1.3]} rotation={[0, 0.3, 0]}>
        <M g={boxG(0.5, 0.05, 0.5)} c="#8a5a30" tex="wood" p={[0, 0.45, 0]} />
        <M g={boxG(0.5, 0.6, 0.05)} c="#8a5a30" tex="wood" p={[0, 0.75, -0.25]} />
        {[-0.22, 0.22].map((x) => <M key={x} g={boxG(0.04, 0.06, 0.7)} c="#6a4020" p={[x, 0.05, 0]} r={[0.1 * Math.sin(t * 1.5), 0, 0]} />)}
      </group>
      {[[-1.9, 1.9], [1.9, 1.9]].map(([x, z]) => <group key={x} position={[x, 0.4, z]}><M g={cylG(0.18, 0.14, 0.3, 10)} c="#b85a3a" p={[0, 0.15, 0]} /><M g={sphG(0.24, 10)} c="#3a7a3a" p={[0, 0.42, 0]} /></group>)}
      <M g={boxG(0.7, 0.02, 0.45)} c="#a83a2e" p={[-0.2, 0.41, 0.4]} cast={false} />
      {/* mailbox at the sidewalk, a picket fence, a street lamp, a 1970s car at the curb */}
      <M g={cylG(0.04, 0.04, 1.0, 8)} c="#5a4030" p={[2.8, 0.5, 4.6]} />
      <M g={boxG(0.25, 0.25, 0.45)} c="#2a4a8a" tex="metal" p={[2.8, 1.12, 4.6]} />
      {Array.from({ length: 16 }, (_, i) => -7.5 + i * 0.5).filter((x) => Math.abs(x) > 1.0).map((x) => <M key={x} g={boxG(0.1, 0.8, 0.04)} c="#f4efe6" p={[x, 0.4, 4.6]} />)}
      {[-1, 1].map((s) => <M key={s} g={boxG(6.5, 0.08, 0.03)} c="#f4efe6" p={[s * 4.25, 0.55, 4.58]} />)}
      <Lamp p={[-4.6, 0, 6.6]} t={t} light />
      <OldCar p={[-5.5, 0, 7.5]} yaw={0} />
      {/* Ellen's house across the street: facade pieces around the front-room window, the room behind, a lamp */}
      <mesh geometry={boxG(6.7, 6, 0.3)} position={[-2.65, 3, 14.15]} material={sB} castShadow receiveShadow />
      {/* the window opening is x 0.7..1.7, y 0.9..2.2 */}
      <mesh geometry={boxG(4.3, 6, 0.3)} position={[3.85, 3, 14.15]} material={sB} castShadow receiveShadow />
      <mesh geometry={boxG(1.0, 0.9, 0.3)} position={[1.2, 0.45, 14.15]} material={sB} />
      <mesh geometry={boxG(1.0, 3.8, 0.3)} position={[1.2, 4.1, 14.15]} material={sB} />
      <M g={boxG(8, 0.3, 6.6)} c="#4a5a6a" p={[0, 6.15, 17]} />
      <mesh geometry={boxG(12, 6, 4)} position={[0, 3, 18.45]} material={plainMat("#7a988f")} />
      {[0.0, 2.4].map((x) => <M key={x} g={boxG(0.08, 2.6, 2.1)} c="#e8c8a0" tex="plaster" p={[x, 1.4, 15.35]} recv={false} />)}
      {[[0.66, 1.55, 0.08, 1.38], [1.74, 1.55, 0.08, 1.38], [1.2, 2.24, 1.16, 0.08], [1.2, 0.86, 1.16, 0.08]].map(([x, y, w, h], i) => <M key={i} g={boxG(w, h, 0.36)} c="#f4efe6" p={[x, y, 14.15]} cast={false} />)}
      <M g={boxG(1.3, 0.07, 0.3)} c="#f4efe6" p={[1.2, 0.86, 13.9]} />
      {/* the front room: floor, back/side walls, a standing lamp, a sofa back, a framed picture */}
      <M g={boxG(2.4, 0.1, 2.0)} c="#a07a50" tex="wood" p={[1.2, 0.05, 15.3]} />
      <M g={boxG(2.4, 2.6, 0.1)} c="#e8c8a0" tex="plaster" p={[1.2, 1.4, 16.35]} recv={false} />
      <M g={cylG(0.02, 0.02, 1.5, 6)} c="#3a2a20" p={[0.35, 0.8, 15.9]} />
      <mesh geometry={coneG(0.2, 0.26, 12)} position={[0.35, 1.62, 15.9]} material={coreMat("#ffd890", 1.6)} />
      <M g={boxG(0.8, 0.5, 0.05)} c="#8a5a30" tex="wood" p={[1.7, 1.85, 16.27]} />
      <M g={boxG(0.7, 0.42, 0.02)} c="#d8b080" p={[1.7, 1.85, 16.24]} cast={false} />
      <M g={boxG(1.6, 0.7, 0.4)} c="#a04a3a" tex="fabric" p={[1.4, 0.45, 16.05]} />
      {/* the room light seen through the window */}
      <pointLight position={[1.2, 2.0, 15.4]} color="#ffd8a0" intensity={3} distance={4} decay={1.5} />
      {/* across-the-street trees and a lamp */}
      <Tree p={[-7, 0, 15.5]} s={1.2} seed={11} t={t} />
      <Tree p={[7.5, 0, 0.5]} s={1.1} seed={13} t={t} />
      <Lamp p={[6.5, 0, 11.6]} t={t} />
    </group>
  );
};
export const FB_BOXES: Box[] = [
  { n: "tom house", min: [-4, 0, -6], max: [4, 6.3, 0.02] },
  { n: "porch deck", min: [-2.2, 0, 0], max: [2.2, 0.4, 2.6] },
  { n: "porch posts L", min: [-2.07, 0, 1.98], max: [-1.93, 3.0, 2.12] },
  { n: "porch posts R", min: [1.93, 0, 1.98], max: [2.07, 3.0, 2.12] },
  { n: "porch roof", min: [-2.3, 3.0, -0.1], max: [2.3, 3.16, 2.4] },
  { n: "fence", min: [-7.6, 0, 4.55], max: [7.6, 0.8, 4.65] },
  { n: "ellen house L", min: [-6, 0, 14.0], max: [0.7, 6.3, 20.4] },
  { n: "ellen house R", min: [1.7, 0, 14.0], max: [6, 6.3, 20.4] },
  { n: "ellen sill", min: [0.6, 0, 13.7], max: [1.8, 0.92, 14.3] },
  { n: "ellen lintel", min: [0.6, 2.18, 14.0], max: [1.8, 6.3, 14.3] },
  { n: "car", min: [-7.4, 0, 6.7], max: [-3.6, 2.0, 8.3] },
  { n: "lamp", min: [-4.75, 0, 6.45], max: [-4.45, 5.0, 6.75] },
];
