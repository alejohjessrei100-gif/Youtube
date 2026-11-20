// The Midnight School's places:
//   EXT  Oakwood School from the street: brick facade with 12 windows that light up one by one, a chained front gate, a
//        side door, a bell tower, a playground, a street lamp with moths, a hedge, a fence. Night or morning.
//   INT  one connected interior at INT: a hallway (lockers, notice board, trophy case, stopped clock, mop bucket) and the
//        classroom beside it (13 tiny desks, the board, Mrs. Bell's desk, coat rack, shelves, a globe, paper chains).
// Imported assets (Poly Haven CC0 / Sketchfab CC-BY, public/assets/midnight/CREDITS.md) go through <Asset>.
// Every solid that can meet the lens or a body is listed in EXT_BOXES / INT_BOXES (local coordinates) for the checker.
import React from "react";
import * as THREE from "three";
import { sitGeom } from "../crow/world";
import { Asset } from "../inkbeat/core/asset";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { Tuft } from "../gull/world";
import { FIT } from "./assets";
import { SEATING, SERGEANT } from "./cast";

export const EXT: V3 = [0, 0, 0];
export const INT: V3 = [40, 0, 0];
export type Box = { n: string; min: V3; max: V3 };
const h1 = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const A: React.FC<{ name: string; p: V3; r?: V3; tint?: string }> = ({ name, p, r, tint }) => <Asset film="midnight" name={name} p={p} r={r} {...FIT[name]} tint={tint ?? FIT[name].tint} />;

// ------------------------------------------------------------------ small parts
const Glow: React.FC<{ p: V3; w: number; h: number; k?: number; col?: string; r?: V3 }> = ({ p, w, h, k = 1.5, col = "#ffe2a0", r }) => (
  <mesh geometry={boxG(w, h, 0.02)} position={p} rotation={r} material={coreMat(col, k)} userData={{ outline: false }} />
);
/** a school window: a lit/dark pane, a frame with muntins, a sill; lit 0..1 */
const SchoolWin: React.FC<{ p: V3; lit: number; w?: number; h?: number; sil?: boolean; r?: V3 }> = ({ p, lit, w = 0.95, h = 1.5, sil = true, r }) => (
  <group position={p} rotation={r}>
    <Glow p={[0, 0, 0.0]} w={w} h={h} k={lit > 0.5 ? 1.6 : 0.5} col={lit > 0.5 ? "#ffe0a0" : "#1c2a44"} />
    {[[0, h / 2 + 0.05, w + 0.2, 0.1], [0, -h / 2 - 0.05, w + 0.2, 0.1], [-w / 2 - 0.05, 0, 0.1, h], [w / 2 + 0.05, 0, 0.1, h], [0, 0, 0.05, h], [0, h / 5, w, 0.04], [0, -h / 5, w, 0.04]].map(([x, y, ww, hh], i) => (
      <M key={i} g={boxG(ww, hh, 0.1)} c="#e8e0d0" p={[x, y, 0.06]} cast={false} />
    ))}
    {sil ? <M g={boxG(w + 0.3, 0.07, 0.24)} c="#d8d0be" p={[0, -h / 2 - 0.14, 0.12]} /> : null}
  </group>
);
const Tree: React.FC<{ p: V3; s?: number; seed: number }> = ({ p, s = 1, seed }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.22, 0.34, 2.6, 12)} c="#4a3a2e" tex="wood" p={[0, 1.3, 0]} />
    {[[0, 3.1, 0, 1.25], [0.7, 2.7, 0.3, 0.9], [-0.7, 2.8, -0.2, 0.95], [0.1, 3.7, 0.2, 0.8]].map(([x, y, z, r], i) => <M key={i} g={sphG(r, 14)} c={i % 2 ? "#3e7a40" : "#4a8a4a"} p={[x, y + 0.05 * (h1(seed + i) - 0.5), z]} />)}
  </group>
);
/** a street lamp with a glowing head and moths circling it */
const Lamp: React.FC<{ p: V3; t: number; on: number }> = ({ p, t, on }) => (
  <group position={p}>
    <M g={cylG(0.07, 0.1, 4.2, 10)} c="#2a2e34" tex="metal" p={[0, 2.1, 0]} />
    <M g={boxG(0.7, 0.07, 0.07)} c="#2a2e34" p={[0.3, 4.2, 0]} />
    <M g={boxG(0.34, 0.16, 0.34)} c="#2a2e34" p={[0.62, 4.16, 0]} />
    <mesh geometry={boxG(0.28, 0.06, 0.28)} position={[0.62, 4.06, 0]} material={coreMat("#ffe0a0", 0.6 + 2.0 * on)} userData={{ outline: false }} />
    {on > 0.5 ? <pointLight position={[0.62, 3.9, 0]} color="#ffd890" intensity={6} distance={9} decay={1.6} /> : null}
    {on > 0.5 ? Array.from({ length: 5 }, (_, i) => <mesh key={i} geometry={sphG(0.018, 5)} position={[0.62 + 0.3 * Math.cos(t * 3 + i * 1.3), 3.95 + 0.14 * Math.sin(t * 4.1 + i), 0.3 * Math.sin(t * 3 + i * 1.3)]} material={coreMat("#fff2c8", 1.4)} userData={{ outline: false }} />) : null}
  </group>
);
const Hydrant: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.13, 0.15, 0.6, 12)} c="#c8402e" p={[0, 0.3, 0]} />
    <M g={sphG(0.14, 10)} c="#c8402e" p={[0, 0.64, 0]} />
    <M g={cylG(0.05, 0.05, 0.36, 8)} c="#a8321e" p={[0, 0.4, 0]} r={[0, 0, Math.PI / 2]} />
  </group>
);
const Swings: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p}>
    {[[-1.1, 0.0], [1.1, 0.0]].map(([x, z], i) => <M key={i} g={cylG(0.045, 0.045, 2.3, 8)} c="#4a6a8a" tex="metal" p={[x, 1.15, z]} r={[0.3 * (i ? 1 : -1) * 0, 0, 0]} />)}
    <M g={cylG(0.04, 0.04, 2.4, 8)} c="#4a6a8a" tex="metal" p={[0, 2.3, 0]} r={[0, 0, Math.PI / 2]} />
    {[-0.45, 0.45].map((x, i) => {
      const a = 0.12 * Math.sin(t * 1.1 + i * 2);
      return (
        <group key={i} position={[x, 2.3, 0]} rotation={[a, 0, 0]}>
          {[-0.17, 0.17].map((dx) => <M key={dx} g={cylG(0.01, 0.01, 1.7, 5)} c="#8a8a90" p={[dx, -0.85, 0]} cast={false} />)}
          <M g={boxG(0.4, 0.04, 0.2)} c="#a0703e" tex="wood" p={[0, -1.7, 0]} />
        </group>
      );
    })}
  </group>
);
const Hopscotch: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <group key={i}>
        <M g={boxG(i === 3 ? 0.9 : 0.42, 0.012, 0.42)} c="#f4ead0" p={[i === 3 ? 0 : (i % 2 ? 0.25 : -0.25) * (i > 3 ? 1 : 1), 0.03, i * 0.46]} cast={false} />
        <M g={boxG(i === 3 ? 0.78 : 0.3, 0.014, 0.3)} c="#c8c0b0" p={[i === 3 ? 0 : (i % 2 ? 0.25 : -0.25), 0.034, i * 0.46]} cast={false} />
      </group>
    ))}
  </group>
);
/** a checkered floor as ONE textured slab (a mesh per tile is far too heavy for a phone) */
const Floor: React.FC<{ p: V3; w: number; d: number; a: string; b: string; n: number; k: string }> = ({ p, w, d, a, b, n, k }) => {
  const tex = canvasTex(`floor|${k}`, 512, 512, (g, W, H) => {
    const cw = W / n, ch = H / Math.max(1, Math.round(n * d / w));
    for (let y = 0; y * ch < H; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * cw, y * ch, cw + 1, ch + 1); }
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(60,40,20,${0.03 + h1(i) * 0.05})`; g.fillRect(h1(i + 3) * W, h1(i + 9) * H, 4 + h1(i + 5) * 14, 2 + h1(i + 7) * 5); }
  });
  return <mesh geometry={boxG(w, 0.03, d)} position={p} material={new THREE.MeshToonMaterial({ map: tex, color: "#ffffff" })} receiveShadow />;
};
/** a hand-painted banner as a canvas texture */
const bannerTex = (text: string, sub: string) =>
  canvasTex(`banner|${text}`, 1024, 256, (g, w, h) => {
    g.fillStyle = "#f4ead0"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#7a2430"; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#7a2430"; g.textAlign = "center"; g.font = "800 92px Poppins, sans-serif"; g.fillText(text, w / 2, 118);
    g.fillStyle = "#3a2a1e"; g.font = "700 50px Poppins, sans-serif"; g.fillText(sub, w / 2, 200);
  });

// ================================================================== EXT: Oakwood School
export const WINDOW_X = [-5.6, -4.0, -2.4, 2.4, 4.0, 5.6];
export const WIN_ORDER = [0, 6, 1, 7, 2, 8, 3, 9, 4, 10, 5, 11];
export const SIDE_DOOR: V3 = [7.05, 0.45, -1.7];
export const FRONT_DOOR: V3 = [0, 0.45, 0.02];
export const Exterior: React.FC<{ t: number; lightsAt: number; night: boolean; open: number; banner: boolean }> = ({ t, lightsAt, night, open, banner }) => {
  const litOf = (i: number) => (t >= lightsAt + 0.2 * WIN_ORDER.indexOf(i) ? 1 : 0);
  return (
    <group position={EXT}>
      {/* ground: lawn, school yard, the walk, the sidewalk and street */}
      <M g={boxG(60, 0.1, 22)} c="#3e6a38" tex="grass" p={[0, -0.05, -2]} />
      <M g={boxG(2.0, 0.04, 3.4)} c="#8a8478" tex="stone" p={[0, 0.02, 1.7]} cast={false} />
      <M g={boxG(26, 0.06, 1.6)} c="#9a9488" tex="stone" p={[0, 0.03, 4.6]} cast={false} />
      <M g={boxG(60, 0.05, 5.0)} c="#34363c" p={[0, 0.0, 8.6]} cast={false} />
      {[-9, -5, -1, 3, 7, 11].map((x) => <M key={x} g={boxG(1.6, 0.012, 0.14)} c="#e8dca0" p={[x, 0.032, 8.6]} cast={false} />)}
      <M g={boxG(28, 0.07, 0.2)} c="#b8b0a0" p={[0, 0.04, 5.45]} cast={false} />
      {Array.from({ length: 60 }, (_, i) => <Tuft key={i} p={[-16 + h1(i) * 32, 0, -6 + h1(i + 40) * 8.4]} s={0.7 + h1(i + 80) * 0.5} seed={i + 5} />)}
      {Array.from({ length: 14 }, (_, i) => <M key={i} g={boxG(0.07, 0.07, 0.07)} c={["#c8402e", "#e8c040", "#e8e0d0"][i % 3]} p={[-12 + h1(i + 7) * 24, 0.06, -2 + h1(i + 17) * 6]} r={[0, h1(i) * 6, 0]} cast={false} />)}
      {/* the school: brick walls, two floors of windows, a cornice, a hip roof, a bell tower */}
      <M g={boxG(14, 5.2, 6)} c="#a8503a" tex="brick" p={[0, 2.6, -3]} />
      <M g={boxG(14.4, 0.25, 6.4)} c="#d8d0be" p={[0, 5.3, -3]} />
      <M g={coneG(11.5, 2.4, 4)} c="#4a3a3a" tex="shingles" p={[0, 6.7, -3]} r={[0, Math.PI / 4, 0]} s={[1.1, 1, 0.55]} />
      <M g={boxG(14.2, 0.3, 0.3)} c="#d8d0be" p={[0, 0.15, 0.1]} />
      <M g={boxG(14.2, 0.18, 0.2)} c="#d8d0be" p={[0, 3.0, 0.06]} />
      {WINDOW_X.map((x, i) => <SchoolWin key={i} p={[x, 1.9 + 0.45, 0.06]} lit={litOf(i)} />)}
      {WINDOW_X.map((x, i) => <SchoolWin key={i + 6} p={[x, 4.1, 0.06]} lit={litOf(i + 6)} h={1.3} />)}
      {[-6.8, 6.8].map((x) => <M key={x} g={boxG(0.5, 5.3, 0.4)} c="#c8c0ae" p={[x, 2.65, 0.1]} />)}
      {/* bell tower with a bell */}
      <M g={boxG(2.0, 2.6, 2.0)} c="#a8503a" tex="brick" p={[0, 7.4, -2]} />
      <M g={coneG(1.8, 1.8, 4)} c="#4a3a3a" tex="shingles" p={[0, 9.9, -2]} r={[0, Math.PI / 4, 0]} />
      <M g={boxG(0.9, 1.1, 0.05)} c="#1a1218" p={[0, 7.6, -0.98]} />
      <M g={coneG(0.34, 0.5, 14)} c="#c8a040" tex="metal" p={[0, 7.55, -1.1]} r={[Math.PI, 0, 0]} />
      <M g={sphG(0.06, 8)} c="#c8a040" p={[0, 7.28, -1.1]} />
      <Label text="OAKWOOD SCHOOL" p={[0, 3.55, 0.12]} w={3.6} h={0.5} fg="#f4e2b0" bg="#3a2418" />
      <Label text="EST. 1952" p={[0, 3.14, 0.12]} w={1.2} h={0.2} fg="#3a2418" bg="#d8cfb4" />
      {/* the front: steps, the chained double doors (open in the morning), the side door */}
      {[0, 1, 2].map((i) => <M key={i} g={boxG(2.8 - i * 0.2, 0.15, 0.8 - i * 0.1)} c="#9a948a" tex="stone" p={[0, 0.075 + i * 0.15 - 0.0, 1.1 - i * 0.28]} />)}
      <M g={boxG(2.4, 2.9, 0.3)} c="#d8d0be" p={[0, 1.9, 0.05]} />
      <group position={[-1.0, 0.45, 0.2]} rotation={[0, -open * 1.55, 0]}>
        <M g={boxG(1.0, 2.5, 0.07)} c="#5a2e22" tex="wood" p={[0.5, 1.25, 0]} />
        <Glow p={[0.5, 1.6, 0.04]} w={0.6} h={0.9} k={night ? 0.5 : 1.0} col={night ? "#26324a" : "#fff0c0"} />
        <M g={sphG(0.05, 8)} c="#d8b040" p={[0.9, 1.1, 0.07]} />
      </group>
      <group position={[1.0, 0.45, 0.2]} rotation={[0, open * 1.55, 0]}>
        <M g={boxG(1.0, 2.5, 0.07)} c="#5a2e22" tex="wood" p={[-0.5, 1.25, 0]} />
        <Glow p={[-0.5, 1.6, 0.04]} w={0.6} h={0.9} k={night ? 0.5 : 1.0} col={night ? "#26324a" : "#fff0c0"} />
        <M g={sphG(0.05, 8)} c="#d8b040" p={[-0.9, 1.1, 0.07]} />
      </group>
      {open < 0.1 ? (
        <>
          {/* the chain and padlock on the door handles, and a notice */}
          <M g={torG(0.16, 0.025)} c="#8a8a90" tex="metal" p={[-0.1, 1.55, 0.3]} />
          <M g={torG(0.16, 0.025)} c="#8a8a90" tex="metal" p={[0.1, 1.55, 0.3]} r={[0, 0, 0.6]} />
          <M g={boxG(0.16, 0.2, 0.08)} c="#c8a040" tex="metal" p={[0, 1.38, 0.34]} />
          <Label text="CLOSED" p={[-1.5, 1.7, 0.4]} w={0.6} h={0.28} fg="#ffffff" bg="#c83030" />
        </>
      ) : null}
      {banner ? <mesh geometry={boxG(3.4, 0.85, 0.03)} position={[0, 2.35, 3.5]} material={new THREE.MeshToonMaterial({ map: bannerTex("NOW ENROLLING", "EVENING READING CLASS  ·  WAITING LIST"), color: "#ffffff" })} castShadow /> : null}
      {banner ? [-1.6, 1.6].map((x) => <M key={x} g={cylG(0.03, 0.03, 1.5, 8)} c="#5a3a22" tex="wood" p={[x, 1.7, 3.5]} />) : null}
      {/* the chained front gate + fence + hedge */}
      {[[-14, -1.0], [1.0, 14]].map(([a, b], s) => (
        <group key={s}>
          <M g={boxG(b - a, 0.06, 0.05)} c="#2a2e34" tex="metal" p={[(a + b) / 2, 1.2, 3.3]} />
          <M g={boxG(b - a, 0.06, 0.05)} c="#2a2e34" tex="metal" p={[(a + b) / 2, 0.3, 3.3]} />
          {Array.from({ length: Math.round((b - a) / 0.2) }, (_, k) => <M key={k} g={boxG(0.04, 1.3, 0.04)} c="#2a2e34" tex="metal" p={[a + 0.1 + k * 0.2, 0.65, 3.3]} />)}
        </group>
      ))}
      <M g={boxG(2.0, 0.05, 0.05)} c="#2a2e34" p={[0, 1.2, 3.3]} />
      <M g={boxG(0.08, 1.4, 0.08)} c="#2a2e34" p={[-1, 0.7, 3.3]} />
      <M g={boxG(0.08, 1.4, 0.08)} c="#2a2e34" p={[1, 0.7, 3.3]} />
      {/* the gate leaves: shut and chained at night, swung open in the morning */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.98, 0, 3.3]} rotation={[0, -sd * open * 1.4, 0]}>
          {Array.from({ length: 5 }, (_, k) => <M key={k} g={boxG(0.04, 1.2, 0.04)} c="#2a2e34" tex="metal" p={[-sd * (0.1 + k * 0.18), 0.65, 0]} />)}
          <M g={boxG(0.96, 0.05, 0.05)} c="#2a2e34" p={[-sd * 0.48, 1.15, 0]} />
        </group>
      ))}
      {open < 0.1 ? <M g={boxG(0.2, 0.26, 0.08)} c="#c8a040" tex="metal" p={[0, 0.9, 3.36]} /> : null}
      {[-12, -9, -6, 6, 9, 12].map((x) => <M key={x} g={boxG(1.4, 0.8, 0.8)} c="#3a6a34" tex="grass" p={[x, 0.4, 2.4]} />)}
      {/* the side door on the right wall + a lamp over it */}
      <group position={[7.05, 0, -1.7]}>
        <M g={boxG(0.3, 0.2, 1.4)} c="#9a948a" tex="stone" p={[0.5, 0.1, 0]} />
        <M g={boxG(0.14, 2.3, 1.1)} c="#4a2e22" tex="wood" p={[0.04, 1.45, 0]} />
        <M g={boxG(0.1, 0.3, 0.3)} c="#2a2e34" p={[0.15, 2.9, 0]} />
        <mesh geometry={boxG(0.08, 0.2, 0.2)} position={[0.22, 2.9, 0]} material={coreMat("#ffe0a0", night ? 1.6 : 0.5)} userData={{ outline: false }} />
        <Label text="STAFF ONLY" p={[0.12, 2.2, 0]} r={[0, Math.PI / 2, 0]} w={0.6} h={0.2} fg="#ffffff" bg="#2a3a5a" />
      </group>
      {/* the playground, hopscotch, a bench, a bike, the lamp, a hydrant, trees, the neighbour's house */}
      <Swings p={[-9.2, 0, 0.6]} t={t} />
      <Hopscotch p={[-3.2, 0, 4.0]} />
      <M g={boxG(1.6, 0.06, 0.45)} c="#8a5a3a" tex="wood" p={[4.4, 0.5, 2.2]} />
      <M g={boxG(1.6, 0.4, 0.06)} c="#8a5a3a" tex="wood" p={[4.4, 0.8, 2.0]} />
      {[-0.7, 0.7].map((x) => <M key={x} g={boxG(0.06, 0.5, 0.4)} c="#2a2e34" p={[4.4 + x, 0.25, 2.2]} />)}
      <Lamp p={[2.6, 0, 5.1]} t={t} on={night ? 1 : 0} />
      <Lamp p={[-11, 0, 5.1]} t={t + 2} on={night ? 1 : 0} />
      <Hydrant p={[6.4, 0, 5.15]} />
      <Tree p={[-13, 0, 1.5]} seed={3} s={1.2} />
      <Tree p={[12.5, 0, 0.5]} seed={9} s={1.1} />
      <Tree p={[-9, 0, 4.2]} seed={5} s={0.9} />
      <M g={boxG(3.6, 2.6, 3.2)} c="#c8b898" tex="plaster" p={[-6.5, 1.3, 10.4]} />
      <M g={coneG(3.0, 1.2, 4)} c="#4a3a3a" tex="shingles" p={[-6.5, 3.2, 10.4]} r={[0, Math.PI / 4, 0]} />
      <Glow p={[-6.5, 1.5, 8.77]} w={0.7} h={0.9} k={night ? 1.4 : 0.8} col={night ? "#ffcf80" : "#a8c0d8"} />
      <M g={boxG(3.6, 0.2, 1.2)} c="#9a7a56" tex="planks" p={[-6.5, 0.1, 8.5]} />
      <Label text="12 ELM ST." p={[-6.5, 2.4, 8.78]} w={0.8} h={0.2} fg="#f4ead0" bg="#3a2a22" />
    </group>
  );
};
export const EXT_BOXES: Box[] = [
  { n: "school body", min: [-7.2, 0, -9], max: [7.2, 5.4, -0.1] },
  { n: "front doors", min: [-1.25, 0, -0.15], max: [1.25, 3.3, 0.35] },
  { n: "tower", min: [-1.1, 5.3, -3.1], max: [1.1, 9.9, -0.9] },
  { n: "front steps", min: [-1.4, 0, 0.5], max: [1.4, 0.45, 1.5] },
  { n: "fence L", min: [-14, 0, 3.25], max: [-0.95, 1.3, 3.36] },
  { n: "fence R", min: [0.95, 0, 3.25], max: [14, 1.3, 3.36] },
  { n: "lamp A", min: [2.5, 0, 5.0], max: [3.4, 4.3, 5.2] },
  { n: "lamp B", min: [-11.1, 0, 5.0], max: [-10.2, 4.3, 5.2] },
  { n: "hydrant", min: [6.2, 0, 4.95], max: [6.6, 0.8, 5.35] },
  { n: "tree L", min: [-13.4, 0, 1.1], max: [-12.6, 4.5, 1.9] },
  { n: "tree R", min: [12.1, 0, 0.1], max: [12.9, 4.5, 0.9] },
  { n: "tree M", min: [-9.3, 0, 3.9], max: [-8.7, 3.5, 4.5] },
  { n: "neighbour house", min: [-8.4, 0, 8.7], max: [-4.6, 3.4, 12.1] },
  { n: "swing frame", min: [-10.4, 0, 0.5], max: [-8.0, 2.4, 0.7] },
  { n: "bench", min: [3.6, 0, 1.95], max: [5.2, 1.0, 2.5] },
  { n: "side door steps", min: [7.05, 0, -2.5], max: [7.5, 0.3, -0.9] },
];

// ================================================================== INT: hallway + classroom
// hallway: x -4.4..4.4, z -1.4..1.4, height 3.2; entrance door at the right end (x = 4.4). The classroom is behind the
// back wall (z < -1.4): x -0.8..8.2, z -1.4..-8.4; the door at x 0.2..1.2 is near the board (left wall x = -0.8).
export const CLASS_DOOR: V3 = [0.7, 0, -1.4];
export const BOARD_X = -0.74;
export const DESK_COLS = [2.2, 3.8, 5.4, 7.0];
export const DESK_ROWS = [-3.5, -4.9, -6.3];
export const SGT_DESK: V3 = [1.15, 0, -2.55];
export const DESK_SPOTS: V3[] = [...DESK_ROWS.flatMap((z) => DESK_COLS.map((x) => [x, 0, z] as V3)), SGT_DESK];
export const Chalk: React.FC<{ p: V3; r?: V3 }> = ({ p, r }) => (
  <group position={p} rotation={r}>
    <M g={cylG(0.011, 0.011, 0.07, 10)} c="#f8f6ee" r={[0, 0, Math.PI / 2]} cast={false} />
  </group>
);
/** a small handbell */
export const HandBell: React.FC<{ p: V3; swing?: number }> = ({ p, swing = 0 }) => (
  <group position={p} rotation={[0, 0, swing]}>
    <M g={coneG(0.07, 0.11, 14)} c="#c8a040" tex="metal" p={[0, 0.06, 0]} r={[Math.PI, 0, 0]} />
    <M g={cylG(0.016, 0.016, 0.09, 8)} c="#5a3a22" tex="wood" p={[0, 0.14, 0]} />
    <M g={sphG(0.014, 6)} c="#2a2420" p={[0, 0.0, 0]} />
  </group>
);
const BookRow: React.FC<{ x0: number; x1: number; y: number; z: number; seed: number; ax?: "x" | "z" }> = ({ x0, x1, y, z, seed }) => {
  const out: React.ReactNode[] = [];
  let x = x0, i = 0;
  const cols = ["#7a2430", "#2e4a6a", "#3e5a32", "#8a6a2a", "#5a3a5a", "#6a4a2e", "#a04a3a", "#2a6a6a"];
  while (x < x1 - 0.05) {
    const w = 0.03 + h1(seed + i) * 0.03, hh = 0.18 + h1(seed + i + 50) * 0.08;
    out.push(<M key={i} g={boxG(w, hh, 0.16)} c={cols[Math.floor(h1(seed + i + 7) * cols.length)]} p={[x + w / 2, y + hh / 2, z]} />);
    x += w + 0.004; i++;
  }
  return <>{out}</>;
};
/** one tiny school desk + chair for a man whose seat height is `seat` (he sits facing -x) */
const TinyDesk: React.FC<{ p: V3; seat: number; seed: number }> = ({ p, seat, seed }) => (
  <group position={p}>
    {/* chair: seat + back + legs (behind him, +x) */}
    <M g={boxG(0.4, 0.04, 0.4)} c="#b8884a" tex="wood" p={[0, seat - 0.02, 0]} />
    <M g={boxG(0.04, 0.34, 0.4)} c="#b8884a" tex="wood" p={[0.2, seat + 0.19, 0]} />
    {[[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].map(([x, z], i) => <M key={i} g={boxG(0.035, seat - 0.04, 0.035)} c="#8a6030" tex="wood" p={[x, (seat - 0.04) / 2, z]} />)}
    {/* desk top (in front, -x), a shelf under it, four legs */}
    <M g={boxG(0.46, 0.035, 0.62)} c="#d8b878" tex="wood" p={[-0.58, 0.62, 0]} />
    <M g={boxG(0.4, 0.025, 0.56)} c="#a8804a" tex="wood" p={[-0.58, 0.3, 0]} />
    {[[-0.38, -0.27], [-0.78, -0.27], [-0.38, 0.27], [-0.78, 0.27]].map(([x, z], i) => <M key={i} g={boxG(0.03, 0.6, 0.03)} c="#7a5a30" tex="wood" p={[x, 0.3, z]} />)}
    {/* a workbook and a stub of pencil on the desk, a name card */}
    <M g={boxG(0.22, 0.012, 0.3)} c={["#f4ead0", "#e8d8a0", "#d8e8f0"][seed % 3]} p={[-0.58, 0.646, -0.08]} r={[0, 0.1 * (seed % 5) - 0.2, 0]} cast={false} />
    <M g={cylG(0.007, 0.007, 0.16, 6)} c="#e0b020" p={[-0.62, 0.653, 0.18]} r={[Math.PI / 2, 0, 0.5]} cast={false} />
  </group>
);
export const Interior: React.FC<{ t: number; doorOpen: number; bell: number }> = ({ t, doorOpen, bell }) => (
  <group position={INT}>
    {/* ---------------------------------------------------------------- hallway: floor, walls, ceiling */}
    <Floor p={[0, 0.015, 0]} w={9.0} d={3.0} a="#cfc6ae" b="#7a8a6a" n={18} k="hall" />
    <M g={boxG(9.2, 0.1, 3.2)} c="#6a6a5a" p={[0, -0.05, 0]} />
    <M g={boxG(9.2, 3.2, 0.2)} c="#9ab0a4" tex="plaster" p={[0, 1.6, 1.5]} />
    <M g={boxG(9.2, 3.2, 0.2)} c="#9ab0a4" tex="plaster" p={[0, 1.6, -1.5]} />
    <M g={boxG(9.2, 1.1, 0.06)} c="#6a8a7a" p={[0, 0.55, -1.38]} cast={false} />
    <M g={boxG(9.2, 1.1, 0.06)} c="#6a8a7a" p={[0, 0.55, 1.38]} cast={false} />
    <M g={boxG(0.2, 3.2, 3.2)} c="#9ab0a4" tex="plaster" p={[-4.5, 1.6, 0]} />
    <M g={boxG(9.2, 0.2, 3.2)} c="#d8d4c4" p={[0, 3.3, 0]} recv={false} />
    {/* the entrance door at the right end (open a crack: a moonlit gap) */}
    <M g={boxG(0.2, 3.2, 1.0)} c="#9ab0a4" tex="plaster" p={[4.5, 1.6, 0.95]} />
    <M g={boxG(0.2, 3.2, 1.0)} c="#9ab0a4" tex="plaster" p={[4.5, 1.6, -0.95]} />
    <M g={boxG(0.2, 0.8, 0.9)} c="#9ab0a4" tex="plaster" p={[4.5, 2.8, 0]} />
    <Glow p={[4.42, 1.2, 0]} w={0.02} h={2.0} k={0.8} col="#8aa8d8" r={[0, 0, 0]} />
    {/* lockers: a long bank on the back wall, doors with vents and handles, a few left ajar; names on some */}
    {Array.from({ length: 8 }, (_, i) => {
      const x = -4.0 + i * 0.5; if (x > -0.3 && x < 1.5) return null;
      return (
        <group key={i} position={[x + 0.25, 0, -1.28]}>
          <M g={boxG(0.46, 2.1, 0.32)} c={["#4a6a8a", "#5a7a6a", "#8a5a4a"][i % 3]} tex="metal" p={[0, 1.15, 0]} />
          {[0.18, 0.28, 0.38].map((dy) => <M key={dy} g={boxG(0.3, 0.012, 0.01)} c="#1a1e24" p={[0, 1.95 + dy * 0.2 - 0.1, 0.165]} cast={false} />)}
          <M g={boxG(0.04, 0.1, 0.03)} c="#c8c8d0" tex="metal" p={[0.15, 1.1, 0.18]} />
          {i % 3 === 0 ? <M g={boxG(0.16, 0.08, 0.01)} c="#f4ead0" p={[0, 1.55, 0.165]} cast={false} /> : null}
        </group>
      );
    })}
    {/* the front wall of the hallway: notice board with flyers, a trophy case, a fire extinguisher, the stopped clock, exit sign */}
    <M g={boxG(1.6, 1.0, 0.04)} c="#8a6a4a" tex="wood" p={[-2.5, 1.7, 1.38]} />
    <M g={boxG(1.5, 0.9, 0.02)} c="#a8845a" p={[-2.5, 1.7, 1.36]} cast={false} />
    {[[-2.95, 1.9, "#f4ead0"], [-2.5, 1.85, "#e8d8a0"], [-2.05, 1.9, "#d8e8f0"], [-2.8, 1.5, "#f0c0c0"], [-2.2, 1.55, "#f4ead0"]].map(([x, y, c], i) => <M key={i} g={boxG(0.3, 0.38, 0.01)} c={c as string} p={[x as number, y as number, 1.34]} r={[0, 0, 0.06 * (i - 2)]} cast={false} />)}
    <Label text="NIGHT SCHOOL?" p={[-2.5, 2.0, 1.33]} w={0.9} h={0.14} fg="#ffffff" bg="#c83030" />
    <M g={boxG(1.3, 1.1, 0.4)} c="#6a4a2e" tex="wood" p={[-0.4, 1.3, 1.2]} />
    <M g={boxG(1.1, 0.9, 0.02)} c="#bcd0d8" p={[-0.4, 1.3, 0.99]} cast={false} />
    {[-0.7, -0.4, -0.1].map((x, i) => <M key={x} g={cylG(0.06, 0.09, 0.2 + 0.05 * i, 10)} c="#d8b040" tex="metal" p={[x, 1.1 + 0.1 * i, 1.0]} />)}
    <A name="wallclock" p={[2.4, 2.5, 1.38]} r={[Math.PI / 2, 0, 0]} />
    <M g={cylG(0.5, 0.5, 0.01, 8)} c="#000000" p={[2.4, 0.0, 1.39]} cast={false} />
    <M g={cylG(0.09, 0.09, 0.36, 10)} c="#c83030" p={[3.4, 0.8, 1.3]} />
    <M g={boxG(0.4, 0.2, 0.06)} c="#1a8a3a" p={[4.0, 2.9, 1.37]} cast={false} />
    <mesh geometry={boxG(0.34, 0.14, 0.02)} position={[4.0, 2.9, 1.34]} material={coreMat("#60ff90", 1.2)} userData={{ outline: false }} />
    {/* a mop bucket + mop + the janitor's cart, a dim ceiling lamp, a moon-blue window at the end */}
    <A name="bucket" p={[-3.7, 0, 0.8]} />
    <M g={cylG(0.02, 0.02, 1.3, 6)} c="#a0703e" tex="wood" p={[-3.55, 0.8, 0.9]} r={[0.3, 0, 0.1]} />
    <M g={boxG(0.8, 0.7, 0.45)} c="#5a6a8a" tex="metal" p={[-2.9, 0.45, 0.85]} />
    <M g={boxG(0.84, 0.05, 0.5)} c="#8a8a90" tex="metal" p={[-2.9, 0.82, 0.85]} />
    {[-1.5, 1.5].map((x) => <mesh key={x} geometry={boxG(0.9, 0.04, 0.2)} position={[x, 3.17, 0]} material={coreMat("#5a6a7a", 0.5)} userData={{ outline: false }} />)}
    <Glow p={[-4.38, 1.9, 0]} w={0.9} h={1.3} k={0.9} col="#7a9ad0" r={[0, Math.PI / 2, 0]} />
    <A name="clock2" p={[-4.34, 2.55, 0.9]} r={[0, 0, 0]} />
    {/* the classroom door: a frame in the back wall at x 0.2..1.2, a leaf that swings into the room, light spilling out */}
    <M g={boxG(0.2, 3.2, 0.2)} c="#9ab0a4" tex="plaster" p={[1.3, 1.6, -1.5]} />
    <M g={boxG(0.2, 3.2, 0.2)} c="#9ab0a4" tex="plaster" p={[0.1, 1.6, -1.5]} />
    <M g={boxG(1.4, 0.9, 0.2)} c="#9ab0a4" tex="plaster" p={[0.7, 2.75, -1.5]} />
    <Label text="ROOM 4" p={[0.7, 2.5, -1.38]} w={0.6} h={0.2} fg="#f4ead0" bg="#3a2a22" />
    <group position={[1.2, 0, -1.5]} rotation={[0, doorOpen * 1.7, 0]}>
      <M g={boxG(1.0, 2.3, 0.06)} c="#6a4a2e" tex="wood" p={[-0.5, 1.15, 0]} />
      <Glow p={[-0.5, 1.5, 0.035]} w={0.4} h={0.7} k={1.4} col="#ffe0a0" />
      <M g={sphG(0.045, 8)} c="#d8b040" p={[-0.88, 1.05, 0.05]} />
    </group>
    <mesh geometry={boxG(1.0, 0.012, 0.9)} position={[0.7, 0.03, -0.95]} material={coreMat("#ffd890", 0.35 + 0.5 * doorOpen)} userData={{ outline: false }} />
    {/* ---------------------------------------------------------------- classroom */}
    <Floor p={[3.7, 0.015, -4.9]} w={9.0} d={7.0} a="#d8c9a0" b="#b89a6a" n={18} k="room" />
    <M g={boxG(9.4, 0.1, 7.2)} c="#6a5a42" p={[3.7, -0.05, -4.9]} />
    <M g={boxG(0.2, 3.2, 7.0)} c="#e8dcb8" tex="plaster" p={[-0.9, 1.6, -4.9]} />
    <M g={boxG(0.2, 3.2, 7.0)} c="#e8dcb8" tex="plaster" p={[8.3, 1.6, -4.9]} />
    <M g={boxG(9.4, 3.2, 0.2)} c="#e8dcb8" tex="plaster" p={[3.7, 1.6, -8.5]} />
    <M g={boxG(9.4, 0.2, 7.2)} c="#d8d4c4" p={[3.7, 3.3, -4.9]} recv={false} />
    <M g={boxG(9.4, 1.0, 0.06)} c="#8a6a4a" tex="wood" p={[3.7, 0.5, -8.38]} cast={false} />
    <M g={boxG(0.06, 1.0, 7.0)} c="#8a6a4a" tex="wood" p={[8.18, 0.5, -4.9]} cast={false} />
    {/* the board on the left wall, with the lesson, the tray, the alphabet strip, the clock */}
    <M g={boxG(0.08, 1.5, 3.2)} c="#5a3a22" tex="wood" p={[-0.78, 1.6, -4.7]} />
    <M g={boxG(0.04, 1.36, 3.06)} c="#2e4a3a" p={[-0.72, 1.6, -4.7]} cast={false} />
    <M g={boxG(0.12, 0.05, 3.2)} c="#5a3a22" tex="wood" p={[-0.72, 0.86, -4.7]} />
    <M g={cylG(0.009, 0.009, 0.06, 6)} c="#f4f2ea" p={[-0.68, 0.9, -5.6]} r={[Math.PI / 2, 0, 0]} cast={false} />
    <Label text="THE CAT SAT." p={[-0.69, 2.05, -4.7]} r={[0, -Math.PI / 2, 0]} w={2.2} h={0.4} fg="#f4f2ea" bg="#2e4a3a" />
    <Label text="A  B  C  D  E  F  G" p={[-0.69, 1.55, -4.7]} r={[0, -Math.PI / 2, 0]} w={2.2} h={0.26} fg="#d8e8d0" bg="#2e4a3a" />
    <Label text="I CAN READ!" p={[-0.69, 1.2, -4.0]} r={[0, -Math.PI / 2, 0]} w={1.2} h={0.26} fg="#ffe9a0" bg="#2e4a3a" />
    <Label text="A B C   a b c   1 2 3   READING IS POWER" p={[-0.8, 2.95, -4.7]} r={[0, -Math.PI / 2, 0]} w={3.8} h={0.18} fg="#7a2430" bg="#f4ead0" />
    <A name="wallclock" p={[-0.8, 2.6, -2.5]} r={[Math.PI / 2, 0, -Math.PI / 2]} />
    {/* windows on the back wall: moon-blue, curtains; the shelf of workbooks + lunch boxes; coat rack */}
    {[2.4, 5.6].map((x) => (
      <group key={x}>
        <SchoolWin p={[x, 1.9, -8.38]} lit={0} r={[0, Math.PI, 0]} w={1.2} h={1.4} />
        <Glow p={[x, 1.9, -8.37]} w={1.2} h={1.4} k={0.9} col="#6a86c0" />
        <M g={boxG(0.3, 1.5, 0.04)} c="#a0402e" tex="fabric" p={[x - 0.75, 1.95, -8.3]} cast={false} />
        <M g={boxG(0.3, 1.5, 0.04)} c="#a0402e" tex="fabric" p={[x + 0.75, 1.95, -8.3]} cast={false} />
      </group>
    ))}
    <M g={boxG(2.6, 0.05, 0.4)} c="#8a6a4a" tex="wood" p={[4.0, 1.2, -8.2]} />
    <BookRow x0={2.8} x1={5.2} y={1.225} z={-8.2} seed={61} />
    {[3.0, 3.35, 3.7, 4.05, 4.4].map((x, i) => <M key={x} g={boxG(0.26, 0.18, 0.12)} c={["#c8402e", "#2e6aa8", "#e8b030", "#3a8a4a", "#8a3a8a"][i]} p={[x + 1.0, 1.31, -8.12]} />)}
    <M g={boxG(2.2, 0.05, 0.3)} c="#8a6a4a" tex="wood" p={[7.1, 1.7, -8.25]} />
    {[6.3, 6.6, 6.9, 7.2, 7.5].map((x, i) => <M key={x} g={cylG(0.07, 0.06, 0.2, 10)} c={["#c8402e", "#e8b030", "#3a8a4a", "#2e6aa8", "#8a3a8a"][i]} p={[x, 1.8, -8.2]} />)}
    <group position={[7.9, 0, -2.4]}>
      <M g={boxG(0.05, 1.7, 0.7)} c="#6a4a2e" tex="wood" p={[0.2, 0.85, 0]} />
      {[-0.25, 0, 0.25].map((z, i) => <M key={z} g={cylG(0.02, 0.02, 0.1, 6)} c="#c8a040" p={[0.1, 1.55, z]} r={[0, 0, Math.PI / 2]} />)}
      <M g={boxG(0.12, 0.7, 0.28)} c="#3a4a6a" tex="fabric" p={[0.05, 1.15, -0.25]} />
      <M g={boxG(0.12, 0.7, 0.28)} c="#8a6a3a" tex="fabric" p={[0.05, 1.15, 0.0]} />
      <M g={cylG(0.17, 0.17, 0.1, 14, true)} c="#e8c030" p={[0.08, 1.56, 0.25]} r={[0, 0, Math.PI / 2]} />
    </group>
    <M g={boxG(0.3, 0.5, 0.9)} c="#6a4a2e" tex="wood" p={[8.0, 0.25, -7.4]} />
    {/* Mrs. Bell's desk by the board with the little handbell, a thermos, mugs, a stack of workbooks, an apple, a lamp */}
    <group position={[0.5, 0, -7.3]}>
      <M g={boxG(1.4, 0.05, 0.7)} c="#8a5a32" tex="wood" p={[0, 0.74, 0]} />
      {[[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].map(([x, z], i) => <M key={i} g={boxG(0.06, 0.72, 0.06)} c="#6a4a2e" tex="wood" p={[x, 0.36, z]} />)}
      <HandBell p={[-0.45, 0.77, 0.05]} swing={bell} />
      <M g={cylG(0.05, 0.05, 0.28, 10)} c="#8a2e3a" tex="metal" p={[0.1, 0.92, -0.1]} />
      <M g={cylG(0.04, 0.035, 0.08, 10)} c="#f4ead6" p={[0.35, 0.81, 0.1]} />
      <M g={boxG(0.3, 0.12, 0.22)} c="#f4ead0" p={[0.5, 0.83, -0.18]} r={[0, 0.2, 0]} />
      <M g={sphG(0.045, 8)} c="#c83030" p={[0.62, 0.84, 0.15]} />
    </group>
    <A name="oillamp" p={[1.1, 0.78, -7.35]} />
    {/* hand-painted paper chain + posters + a globe on a stand + a plant */}
    {Array.from({ length: 12 }, (_, i) => <M key={i} g={boxG(0.16, 0.08, 0.04)} c={["#c8402e", "#e8b030", "#3a8a4a", "#2e6aa8"][i % 4]} p={[1.0 + i * 0.55, 3.0 - 0.12 * Math.sin(i * 0.55) - 0.05 * (i % 2), -2.0]} r={[0, 0, 0.2 * ((i % 2) - 0.5)]} cast={false} />)}
    <Label text="ALPHABET" p={[4.0, 2.4, -8.4]} r={[0, Math.PI, 0]} w={1.6} h={0.3} fg="#ffffff" bg="#3a6aa8" />
    <Label text="WELCOME, NEW READERS" p={[7.0, 2.6, -8.4]} r={[0, Math.PI, 0]} w={1.7} h={0.26} fg="#ffffff" bg="#a0402e" />
    <group position={[7.4, 0, -7.3]}>
      <M g={cylG(0.18, 0.2, 0.05, 12)} c="#6a4a2e" tex="wood" p={[0, 0.05, 0]} />
      <M g={cylG(0.03, 0.03, 0.8, 8)} c="#a8804a" p={[0, 0.45, 0]} />
      <M g={sphG(0.22, 16)} c="#4a7ac8" p={[0, 1.05, 0]} />
      <M g={boxG(0.2, 0.01, 0.3)} c="#3e7a40" p={[0.1, 1.08, 0.1]} r={[0.3, 0.5, 0]} cast={false} />
    </group>
    {/* the tiny desks: thirteen, each with a chair at the seat height of the man who will sit */}
    {DESK_SPOTS.map((p, i) => {
      const spec = i === DESK_SPOTS.length - 1 ? SERGEANT : SEATING[i];
      const seat = sitGeom(spec.height, spec.build).seatTop;
      return <TinyDesk key={i} p={p} seat={seat} seed={i} />;
    })}
    <pointLight position={[3.7, 2.8, -4.5]} color="#ffd890" intensity={9} distance={11} decay={1.4} />
    <pointLight position={[0.2, 2.6, 0]} color="#a0b4e0" intensity={2.5} distance={6} decay={1.6} />
    {[2.4, 5.6].flatMap((x) => [-3.4, -6.0].map((z) => <mesh key={`${x}${z}`} geometry={boxG(1.2, 0.04, 0.3)} position={[x, 3.17, z]} material={coreMat("#fff0c8", 1.4)} userData={{ outline: false }} />))}
    {Array.from({ length: 16 }, (_, i) => <mesh key={i} geometry={sphG(0.008, 5)} position={[2 + h1(i) * 5, 1.2 + ((h1(i + 30) + t * 0.03) % 1) * 1.6, -2.5 - h1(i + 60) * 5]} material={coreMat("#fff2c8", 1.2)} userData={{ outline: false }} />)}
  </group>
);
export const INT_BOXES: Box[] = [
  { n: "hall front wall", min: [-4.6, 0, 1.3], max: [4.6, 3.2, 1.6] },
  { n: "hall back wall L", min: [-4.6, 0, -1.6], max: [0.0, 3.2, -1.3] },
  { n: "hall back wall R", min: [1.4, 0, -1.6], max: [4.6, 3.2, -1.3] },
  { n: "hall door head", min: [0.0, 2.3, -1.6], max: [1.4, 3.2, -1.3] },
  { n: "hall left wall", min: [-4.6, 0, -1.6], max: [-4.4, 3.2, 1.6] },
  { n: "hall ceiling", min: [-4.6, 3.2, -1.6], max: [4.6, 3.45, 1.6] },
  { n: "hall right wall", min: [4.4, 0, -1.6], max: [4.6, 3.2, 1.6] },
  { n: "lockers", min: [-4.0, 0, -1.45], max: [-0.3, 2.2, -1.1] },
  { n: "trophy case", min: [-1.05, 0, 0.99], max: [0.25, 2.0, 1.4] },
  { n: "mop cart", min: [-3.3, 0, 0.6], max: [-2.5, 0.85, 1.1] },
  { n: "room left wall", min: [-1.0, 0, -8.6], max: [-0.78, 3.2, -1.5] },
  { n: "room right wall", min: [8.2, 0, -8.6], max: [8.4, 3.2, -1.5] },
  { n: "room back wall", min: [-1.0, 0, -8.6], max: [8.4, 3.2, -8.4] },
  { n: "room ceiling", min: [-1.0, 3.2, -8.6], max: [8.4, 3.45, -1.4] },
  { n: "teacher desk", min: [-0.2, 0, -7.7], max: [1.2, 0.8, -6.9] },
  { n: "coat rack", min: [7.8, 0, -2.8], max: [8.3, 1.9, -2.0] },
  { n: "globe", min: [7.2, 0, -7.5], max: [7.6, 1.3, -7.1] },
  ...DESK_SPOTS.map((p, i) => ({ n: `desk ${i}`, min: [p[0] - 0.83, 0, p[2] - 0.33] as V3, max: [p[0] - 0.33, 0.66, p[2] + 0.33] as V3 })),
];
export const SET_BOXES = { ext: { o: EXT, b: EXT_BOXES }, int: { o: INT, b: INT_BOXES } };
