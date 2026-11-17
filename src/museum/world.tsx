// The museum short's world. Four places, each its own set far from the others:
//   gallery  — a tall night gallery: teal walls over oak wainscot, gilt frames, a marble checker floor, a skylight with
//              moonlight, a bench, brass stanchions and a velvet rope, a bust on a plinth, a security camera, an exit
//              sign, the side service door (with the guards' tally of break-ins on its frame) and THE painting: a girl
//              in a yellow dress, signed in the corner.
//   office   — the guards' security room: a bank of CRT monitors, a desk with coffee and a donut box, a whiteboard.
//   studio   — the young painter's attic, 1964: a slanted roof, a sunny window, the easel with the same painting, paint
//              jars, a mattress on the floor, a "RENT DUE" notice on the door.
//   lobby    — the museum lobby by day: the ticket window, the admission board, a poster of the painting, rain outside.
import React from "react";
import * as THREE from "three";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

const PI = Math.PI;
export const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ places (set origins) and key points
export const GALLERY: V3 = [0, 0, 0];
export const OFFICE: V3 = [60, 0, 0];
export const STUDIO: V3 = [-60, 0, 0];
export const LOBBY: V3 = [0, 0, 60];
/** the gallery: x in [-GX, GX], z in [-GZ, GZ], ceiling at GH */
export const GX = 5.2;
export const GZ = 6.4;
export const GH = 5.2;
/** THE painting: the center of its canvas on the back wall, its size */
export const PAINT: V3 = [0, 2.05, -GZ + 0.12];
export const PW = 1.05;
export const PH = 1.36;
/** the signature on the canvas (world), bottom right */
export const SIG: V3 = [PAINT[0] + PW * 0.33, PAINT[1] - PH * 0.42, PAINT[2] + 0.03];
/** the side service door on the right wall: hinge point, width */
export const DOOR_Z = 2.6;
export const DOOR_W = 1.2;
/** the tally of break-ins, on the wall beside the door (inside) */
export const TALLY: V3 = [GX - 0.03, 1.45, DOOR_Z - DOOR_W - 0.75];
export const BENCH: V3 = [0, 0, -2.6];
export const CAMERA_AT: V3 = [GX - 0.35, GH - 0.45, GZ - 0.45];

// ------------------------------------------------------------------ painted canvases (deterministic)
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
const strokes = (g: CanvasRenderingContext2D, seed: number, n: number, x0: number, y0: number, w: number, h: number, cols: string[], len = 26, wid = 7) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + h1(seed + i * 3.1) * w;
    const y = y0 + h1(seed + i * 5.7) * h;
    const a = (h1(seed + i * 1.3) - 0.5) * 1.2;
    g.strokeStyle = cols[Math.floor(h1(seed + i * 9.9) * cols.length)];
    g.lineWidth = wid * (0.6 + h1(seed + i * 2.2) * 0.8);
    g.lineCap = "round";
    g.globalAlpha = 0.55 + 0.4 * h1(seed + i * 4.4);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 - 4, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  g.globalAlpha = 1;
};
/** the girl in the yellow dress: a summer field, a sky, a young woman laughing, holding a straw hat; signed */
export const drawJune: Draw = (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, "#3a78b8");
  sky.addColorStop(1, "#d8c8a0");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  strokes(g, 11, 260, 0, 0, w, h * 0.5, ["#5a90c8", "#e8d8b0", "#7aa8d8", "#f4f0e0"], 40, 10);
  const field = g.createLinearGradient(0, h * 0.5, 0, h);
  field.addColorStop(0, "#7a9a40");
  field.addColorStop(1, "#2e4a20");
  g.fillStyle = field;
  g.fillRect(0, h * 0.5, w, h * 0.5);
  strokes(g, 23, 420, 0, h * 0.48, w, h * 0.52, ["#5a8a30", "#a8a840", "#3a6a2a", "#c8b050", "#2a4a1e"], 22, 7);
  // wildflowers
  for (let i = 0; i < 70; i++) {
    g.fillStyle = ["#ffffff", "#f8d040", "#e86a5a", "#c8a8f0"][i % 4];
    g.beginPath();
    g.arc(h1(i * 7.7) * w, h * (0.56 + h1(i * 3.3) * 0.42), 3 + h1(i) * 3, 0, PI * 2);
    g.fill();
  }
  const cx = w * 0.5;
  // her shadow
  g.fillStyle = "rgba(40,60,20,0.35)";
  g.beginPath();
  g.ellipse(cx + 30, h * 0.9, 120, 18, 0, 0, PI * 2);
  g.fill();
  // dress: a yellow bell with a fold or two
  g.fillStyle = "#f4c430";
  g.strokeStyle = "#6a4a10";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(cx - 52, h * 0.47);
  g.quadraticCurveTo(cx - 120, h * 0.78, cx - 150, h * 0.88);
  g.lineTo(cx + 150, h * 0.88);
  g.quadraticCurveTo(cx + 120, h * 0.78, cx + 52, h * 0.47);
  g.closePath();
  g.fill();
  g.stroke();
  strokes(g, 51, 90, cx - 120, h * 0.5, 240, h * 0.37, ["#ffd860", "#e8a820", "#fff0a0"], 30, 8);
  // bodice
  g.fillStyle = "#f8cc38";
  g.fillRect(cx - 48, h * 0.34, 96, h * 0.14);
  // legs
  g.fillStyle = "#e8b898";
  g.fillRect(cx - 36, h * 0.87, 18, h * 0.07);
  g.fillRect(cx + 16, h * 0.87, 18, h * 0.07);
  // arms: one raised holding a straw hat, one on her hip
  g.strokeStyle = "#e8b898";
  g.lineWidth = 18;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx + 44, h * 0.36);
  g.lineTo(cx + 110, h * 0.27);
  g.lineTo(cx + 140, h * 0.17);
  g.stroke();
  g.beginPath();
  g.moveTo(cx - 44, h * 0.36);
  g.lineTo(cx - 84, h * 0.44);
  g.lineTo(cx - 54, h * 0.5);
  g.stroke();
  g.fillStyle = "#e0c070";
  g.beginPath();
  g.ellipse(cx + 150, h * 0.13, 58, 20, -0.3, 0, PI * 2);
  g.fill();
  g.fillStyle = "#c8a050";
  g.beginPath();
  g.ellipse(cx + 150, h * 0.11, 30, 18, -0.3, 0, PI * 2);
  g.fill();
  g.fillStyle = "#c83a3a";
  g.fillRect(cx + 124, h * 0.12, 52, 7);
  // neck, head, hair blowing, a laughing face
  g.fillStyle = "#e8a888";
  g.fillRect(cx - 12, h * 0.29, 24, h * 0.06);
  g.beginPath();
  g.ellipse(cx, h * 0.245, 44, 52, 0, 0, PI * 2);
  g.fill();
  g.strokeStyle = "#7a4a30";
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = "#6a3a20";
  g.beginPath();
  g.ellipse(cx - 4, h * 0.205, 50, 30, -0.15, PI * 1.05, PI * 1.98);
  g.fill();
  strokes(g, 77, 40, cx - 110, h * 0.15, 90, h * 0.12, ["#6a3a20", "#8a5030", "#4a2814"], 46, 9);
  g.fillStyle = "#2a1a14";
  g.beginPath();
  g.arc(cx - 16, h * 0.235, 4, PI, 0);
  g.arc(cx + 16, h * 0.235, 4, PI, 0);
  g.fill();
  g.fillStyle = "#a8382e";
  g.beginPath();
  g.ellipse(cx, h * 0.27, 13, 9, 0, 0, PI);
  g.fill();
  g.fillStyle = "rgba(232,96,80,0.35)";
  g.beginPath();
  g.arc(cx - 26, h * 0.26, 9, 0, PI * 2);
  g.arc(cx + 26, h * 0.26, 9, 0, PI * 2);
  g.fill();
  // the signature, bottom right
  g.fillStyle = "#2a0806";
  g.font = `italic 700 ${Math.round(w * 0.1)}px Georgia, serif`;
  g.textAlign = "right";
  g.fillText("H. Abel '64", w * 0.95, h * 0.955);
  // canvas grain
  g.globalAlpha = 0.06;
  for (let y = 0; y < h; y += 3) {
    g.fillStyle = y % 6 ? "#000" : "#fff";
    g.fillRect(0, y, w, 1);
  }
  g.globalAlpha = 1;
};
const drawLandscape = (seed: number, a: string[], b: string[]): Draw => (g, w, h) => {
  g.fillStyle = a[0];
  g.fillRect(0, 0, w, h);
  strokes(g, seed, 300, 0, 0, w, h * 0.55, a, 50, 12);
  strokes(g, seed + 99, 380, 0, h * 0.45, w, h * 0.55, b, 30, 9);
};
const drawPortrait = (seed: number, bg: string, coat: string, skin: string): Draw => (g, w, h) => {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  strokes(g, seed, 200, 0, 0, w, h, [bg, "#2a2016", "#4a3a26"], 40, 12);
  g.fillStyle = coat;
  g.beginPath();
  g.ellipse(w / 2, h * 0.95, w * 0.42, h * 0.32, 0, PI, PI * 2);
  g.fill();
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(w / 2, h * 0.42, w * 0.18, h * 0.16, 0, 0, PI * 2);
  g.fill();
  g.fillStyle = "#2a1a10";
  g.beginPath();
  g.ellipse(w / 2, h * 0.32, w * 0.2, h * 0.08, 0, PI, PI * 2);
  g.fill();
};
const drawAbstract = (seed: number, cols: string[]): Draw => (g, w, h) => {
  g.fillStyle = "#f0e8d8";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = cols[i % cols.length];
    g.fillRect(h1(seed + i) * w * 0.7, h1(seed + i * 2) * h * 0.7, w * (0.15 + h1(seed + i * 3) * 0.35), h * (0.1 + h1(seed + i * 4) * 0.3));
  }
  strokes(g, seed, 40, 0, 0, w, h, ["#1a1a1a"], 120, 4);
};
const canvasMats = new Map<string, THREE.Material>();
const paintMat = (key: string, draw: Draw, w = 512, h = 664) => {
  let m = canvasMats.get(key);
  if (!m) {
    const tex = canvasTex(`P${key}`, w, h, draw);
    m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color("#c8c2b8"), toneMapped: false });
    canvasMats.set(key, m);
  }
  return m;
};
export const JUNE_MAT = () => paintMat("june", drawJune);
/** (the painting is drawn at 512 × 664: strokes and the signature are sized for it) */

/** a gilt frame around a canvas (local: canvas in the xy plane facing +z, centered) */
export const Painting: React.FC<{ p: V3; ry?: number; tilt?: number; w: number; h: number; mat: THREE.Material; gilt?: string; glow?: number }> = ({ p, ry = 0, tilt = 0, w, h, mat, gilt = "#c8a040", glow = 0 }) => {
  const fw = 0.09;
  return (
    <group position={p} rotation={[0, ry, 0]}>
      {/* the hanging wire pivots at the top center: a crooked painting turns about the nail */}
      <group position={[0, h / 2 + 0.22, 0]} rotation={[0, 0, tilt]}>
        <group position={[0, -h / 2 - 0.22, 0]}>
          <mesh position={[0, 0, 0.012]} material={mat} userData={{ outline: false }}>
            <planeGeometry args={[w, h]} />
          </mesh>
          <M g={boxG(w + 0.02, h + 0.02, 0.03)} c="#3a2a1a" p={[0, 0, -0.01]} />
          {[
            [0, h / 2 + fw / 2, w + fw * 2, fw],
            [0, -h / 2 - fw / 2, w + fw * 2, fw],
            [-w / 2 - fw / 2, 0, fw, h],
            [w / 2 + fw / 2, 0, fw, h],
          ].map(([x, y, bw, bh], i) => (
            <M key={i} g={boxG(bw, bh, 0.07)} c={gilt} tex="metal" p={[x, y, 0.025]} />
          ))}
          {[
            [0, h / 2 + fw * 0.15, w + fw * 1.4, 0.02],
            [0, -h / 2 - fw * 0.15, w + fw * 1.4, 0.02],
          ].map(([x, y, bw, bh], i) => (
            <M key={`i${i}`} g={boxG(bw, bh, 0.08)} c="#8a6a2a" tex="metal" p={[x, y, 0.03]} />
          ))}
          {glow > 0 ? <pointLight position={[0, 0, 0.9]} color="#ffd890" intensity={glow * 3} distance={2.6} decay={2} /> : null}
        </group>
        <M g={cylG(0.012, 0.012, 0.06, 6)} c="#c8a040" tex="metal" p={[0, 0, 0.02]} r={[PI / 2, 0, 0]} />
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ the gallery
const floorMat = (() => {
  let m: THREE.Material | null = null;
  return () => {
    if (m) return m;
    const tex = canvasTex("floor-checker", 512, 512, (g, w, h) => {
      const n = 8;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = (i + j) % 2 ? "#2a2a32" : "#e8e2d6";
          g.fillRect((i * w) / n, (j * h) / n, w / n, h / n);
          strokes(g, i * 13 + j * 7, 6, (i * w) / n, (j * h) / n, w / n, h / n, (i + j) % 2 ? ["#3a3a46"] : ["#cfc8b8", "#d8d0c0"], 50, 2);
        }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(GX / 2.4, GZ / 2.4);
    m = new THREE.MeshToonMaterial({ map: tex });
    return m;
  };
})();
const tallyMat = (n: number) => {
  const key = `tally${n}`;
  let m = canvasMats.get(key);
  if (!m) {
    const tex = canvasTex(key, 512, 256, (g, w, h) => {
      g.strokeStyle = "#e8302a";
      g.lineCap = "round";
      g.lineWidth = 16;
      for (let i = 0; i < n; i++) {
        const grp = Math.floor(i / 5);
        const k = i % 5;
        const x0 = 30 + grp * 170;
        if (k < 4) {
          g.beginPath();
          g.moveTo(x0 + k * 28 + (h1(i) - 0.5) * 6, 40);
          g.lineTo(x0 + k * 28 + (h1(i + 9) - 0.5) * 8, 200);
          g.stroke();
        } else {
          g.beginPath();
          g.moveTo(x0 - 14, 180);
          g.lineTo(x0 + 110, 60);
          g.stroke();
        }
      }
    });
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    canvasMats.set(key, m);
  }
  return m;
};
export type GalleryState = {
  t: number;
  /** 0..1 the side door's swing (0 shut) */
  door: number;
  /** tally marks on the door frame */
  tally: number;
  /** the painting's tilt (rad, + = counterclockwise) */
  tilt: number;
  /** red alarm strobe 0..1 */
  alarm: number;
  /** the moon shadow of the skylight sweeps across the floor (0..1 over a time-lapse) */
  moon: number;
  /** warm glow on the painting (memory/emotion beats) */
  glow?: number;
  /** a brass key on a red ribbon (world position) */
  key?: V3 | null;
};
const SIDE_ART: { z: number; side: 1 | -1; w: number; h: number; draw: Draw; key: string }[] = [
  { z: -3.6, side: -1, w: 1.5, h: 1.0, key: "l1", draw: drawLandscape(5, ["#d8a870", "#e8c890", "#b88850"], ["#5a6a3a", "#7a8a4a", "#3a4a2a"]) },
  { z: -0.6, side: -1, w: 0.9, h: 1.2, key: "p1", draw: drawPortrait(17, "#3a2a1e", "#2a3a5a", "#e0b090") },
  { z: 2.6, side: -1, w: 1.4, h: 1.0, key: "a1", draw: drawAbstract(31, ["#c83a2a", "#2a4a8a", "#f0c030"]) },
  { z: -3.6, side: 1, w: 1.2, h: 1.5, key: "p2", draw: drawPortrait(41, "#24302a", "#6a2a2a", "#d8a888") },
  { z: -0.4, side: 1, w: 1.6, h: 1.0, key: "l2", draw: drawLandscape(53, ["#8ab0d0", "#c0d8e8", "#6a90b8"], ["#3a5a8a", "#2a4a6a", "#e8e0d0"]) },
];
export const Gallery: React.FC<{ s: GalleryState }> = ({ s }) => {
  const doorA = -1.7 * s.door;
  return (
    <group position={GALLERY}>
      {/* floor, walls, wainscot, crown molding, ceiling, the skylight */}
      <mesh position={[0, 0, 0]} rotation={[-PI / 2, 0, 0]} material={floorMat()} receiveShadow>
        <planeGeometry args={[GX * 2, GZ * 2]} />
      </mesh>
      {[
        [0, GH / 2, -GZ, GX * 2, GH, 0],
        [0, GH / 2, GZ, GX * 2, GH, PI],
        [-GX, GH / 2, 0, GZ * 2, GH, PI / 2],
        [GX, GH / 2, 0, GZ * 2, GH, -PI / 2],
      ].map(([x, y, z, w, h, ry], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, ry, 0]}>
          <M g={boxG(w, h, 0.1)} c="#2f5a5a" tex="plaster" ts={0.8} p={[0, 0, -0.05]} recv />
          <M g={boxG(w, 1.05, 0.06)} c="#6a4428" tex="wood" p={[0, -h / 2 + 0.52, 0.02]} />
          <M g={boxG(w, 0.06, 0.1)} c="#8a6038" tex="wood" p={[0, -h / 2 + 1.05, 0.04]} />
          <M g={boxG(w, 0.16, 0.1)} c="#2a1a12" tex="wood" p={[0, -h / 2 + 0.08, 0.04]} />
          <M g={boxG(w, 0.22, 0.16)} c="#e8dcc0" tex="plaster" p={[0, h / 2 - 0.11, 0.06]} />
          {Array.from({ length: Math.floor(w / 1.3) }, (_, k) => (
            <M key={k} g={boxG(0.9, 0.62, 0.02)} c="#5a3a22" tex="wood" p={[-w / 2 + 0.65 + k * 1.3 + (w % 1.3) / 2, -h / 2 + 0.54, 0.055]} />
          ))}
        </group>
      ))}
      <M g={boxG(GX * 2, 0.12, GZ * 2)} c="#d8d0c0" tex="plaster" p={[0, GH + 0.06, 0]} />
      <group position={[0, GH - 0.02, -1.0]}>
        <mesh geometry={boxG(2.8, 0.04, 4.4)} material={coreMat("#2a3a6a", 0.9)} position={[0, 0.06, 0]} />
        {[-1, 0, 1].map((k) => (
          <M key={k} g={boxG(0.06, 0.1, 4.4)} c="#1e2028" tex="metal" p={[k * 0.95, 0, 0]} />
        ))}
        {[-2, -1, 0, 1, 2].map((k) => (
          <M key={`z${k}`} g={boxG(2.8, 0.1, 0.06)} c="#1e2028" tex="metal" p={[0, 0, k * 1.1]} />
        ))}
        {/* moonlight shafts falling through the skylight, slowly sweeping in a time-lapse */}
        <mesh geometry={boxG(2.4, GH * 1.05, 3.9)} material={coreMat("#b8c8ff", 1, 0.07)} position={[-0.6 + s.moon * 1.6, -GH / 2, 0.4]} rotation={[0, 0, 0.22 - s.moon * 0.3]} userData={{ outline: false }} />
      </group>
      <pointLight position={[-0.6 + s.moon * 1.6, GH - 0.6, -0.6]} color="#a8b8ff" intensity={5} distance={9} decay={1.6} />
      {/* THE painting, its placard, the rope */}
      <Painting p={[PAINT[0], PAINT[1], PAINT[2] - 0.04]} tilt={s.tilt} w={PW} h={PH} mat={JUNE_MAT()} glow={s.glow ?? 0} />
      <M g={boxG(0.42, 0.26, 0.02)} c="#f0e8d8" tex="paper" p={[PAINT[0] + 1.0, 1.42, -GZ + 0.07]} />
      <Label text="GIRL IN YELLOW" p={[PAINT[0] + 1.0, 1.47, -GZ + 0.085]} w={0.38} h={0.07} bg="none" fg="#2a2018" font={0.8} />
      <Label text="H. ABEL, 1964" p={[PAINT[0] + 1.0, 1.38, -GZ + 0.085]} w={0.3} h={0.05} bg="none" fg="#5a4a3a" font={0.8} />
      <mesh geometry={sphG(0.05, 8)} material={coreMat("#fff2d0", 1.0)} position={[PAINT[0], PAINT[1] + PH / 2 + 0.42, -GZ + 0.35]} />
      <M g={boxG(0.5, 0.05, 0.3)} c="#c8a040" tex="metal" p={[PAINT[0], PAINT[1] + PH / 2 + 0.45, -GZ + 0.2]} />
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, 0, -GZ + 1.0]}>
          <M g={cylG(0.03, 0.03, 0.95, 10)} c="#c8a040" tex="metal" p={[0, 0.48, 0]} />
          <M g={cylG(0.16, 0.18, 0.05, 16)} c="#c8a040" tex="metal" p={[0, 0.025, 0]} />
          <M g={sphG(0.055, 10)} c="#c8a040" tex="metal" p={[0, 0.98, 0]} />
        </group>
      ))}
      <mesh position={[0, 0.82, -GZ + 1.0]} rotation={[0, 0, PI]}>
        <torusGeometry args={[1.2, 0.035, 8, 30, PI]} />
        <meshToonMaterial color="#8a1a24" />
      </mesh>
      {/* the side walls' paintings */}
      {SIDE_ART.map((a) => (
        <Painting key={a.key} p={[a.side * (GX - 0.08), 2.1, a.z]} ry={-a.side * PI / 2} w={a.w} h={a.h} mat={paintMat(a.key, a.draw, 512, Math.round((512 * a.h) / a.w))} gilt={a.side < 0 ? "#b8902e" : "#a8823a"} />
      ))}
      {/* a bench facing the painting */}
      <group position={BENCH}>
        <M g={boxG(2.0, 0.12, 0.6)} c="#4a2a1a" tex="wood" p={[0, 0.46, 0]} />
        <M g={boxG(1.9, 0.06, 0.52)} c="#6a1a24" tex="fabric" p={[0, 0.54, 0]} />
        {[-0.85, 0.85].map((x) => (
          <M key={x} g={boxG(0.12, 0.42, 0.5)} c="#3a2014" tex="wood" p={[x, 0.21, 0]} />
        ))}
      </group>
      {/* a bust on a plinth, a potted palm, a fire extinguisher, the exit sign over the door */}
      <group position={[-3.5, 0, 1.6]}>
        <M g={boxG(0.6, 1.1, 0.6)} c="#e8e2d8" tex="stone" p={[0, 0.55, 0]} />
        <M g={sphG(0.2, 16)} c="#ecebe6" tex="stone" p={[0, 1.42, 0]} s={[0.85, 1.1, 0.95]} />
        <M g={sphG(0.24, 16)} c="#ecebe6" tex="stone" p={[0, 1.18, 0]} s={[1.3, 0.55, 0.8]} />
        <M g={cylG(0.08, 0.1, 0.16, 12)} c="#ecebe6" tex="stone" p={[0, 1.3, 0]} />
      </group>
      <group position={[-GX + 0.6, 0, GZ - 0.7]}>
        <M g={cylG(0.25, 0.2, 0.5, 14)} c="#8a4a2a" tex="brick" p={[0, 0.25, 0]} />
        {Array.from({ length: 7 }, (_, i) => (
          <M key={i} g={coneG(0.22, 1.1, 6)} c="#3a6a3a" p={[Math.sin(i * 0.9) * 0.25, 0.95, Math.cos(i * 0.9) * 0.25]} r={[Math.cos(i * 0.9) * 0.6, 0, -Math.sin(i * 0.9) * 0.6]} s={[1, 1, 0.25]} />
        ))}
      </group>
      <group position={[GX - 0.12, 0, DOOR_Z + 1.3]}>
        <M g={cylG(0.08, 0.08, 0.5, 12)} c="#c8202a" tex="metal" p={[0, 0.65, 0]} />
        <M g={boxG(0.05, 0.08, 0.1)} c="#1a1a1e" p={[0, 0.94, 0.02]} />
      </group>
      <group position={[GX - 0.06, 2.75, DOOR_Z - DOOR_W / 2]} rotation={[0, -PI / 2, 0]}>
        <mesh geometry={boxG(0.5, 0.18, 0.05)} material={coreMat("#2ad86a", 0.9)} />
        <Label text="EXIT" p={[0, 0, 0.03]} w={0.4} h={0.12} bg="none" fg="#f4fff4" font={0.85} />
      </group>
      {/* the side service door: a dark opening, a door hinged at its far edge, the tally of break-ins beside it */}
      <M g={boxG(0.2, 2.25, DOOR_W)} c="#0a0c14" p={[GX + 0.02, 1.12, DOOR_Z - DOOR_W / 2]} />
      <group position={[GX - 0.06, 0, DOOR_Z]} rotation={[0, doorA, 0]}>
        <M g={boxG(0.06, 2.2, DOOR_W)} c="#5a6a72" tex="metal" p={[0, 1.1, -DOOR_W / 2]} />
        <M g={boxG(0.08, 0.06, 0.3)} c="#c8c8d0" tex="metal" p={[-0.05, 1.0, -DOOR_W + 0.2]} />
        <M g={boxG(0.02, 0.24, 0.4)} c="#f0e8d8" tex="paper" p={[-0.04, 1.6, -DOOR_W / 2]} />
      </group>
      {[DOOR_Z + 0.06, DOOR_Z - DOOR_W - 0.06].map((z) => (
        <M key={z} g={boxG(0.12, 2.35, 0.1)} c="#e8dcc0" tex="wood" p={[GX - 0.04, 1.17, z]} />
      ))}
      <M g={boxG(0.12, 0.12, DOOR_W + 0.3)} c="#e8dcc0" tex="wood" p={[GX - 0.04, 2.33, DOOR_Z - DOOR_W / 2]} />
      <mesh position={TALLY} rotation={[0, -PI / 2, 0]} material={tallyMat(Math.round(s.tally))} userData={{ outline: false }}>
        <planeGeometry args={[0.8, 0.4]} />
      </mesh>
      {/* the alarm: a red beacon over the door, and its strobe */}
      <group position={[GX - 0.15, 2.6, DOOR_Z + 0.4]}>
        <M g={cylG(0.07, 0.08, 0.08, 12)} c="#2a2a30" tex="metal" />
        <mesh geometry={sphG(0.08, 12)} material={coreMat(s.alarm > 0.5 ? "#ff3a2a" : "#6a1a14", s.alarm > 0.5 ? 1.2 : 0.8)} position={[0, 0.07, 0]} />
      </group>
      <pointLight position={[GX - 1.0, 2.4, DOOR_Z]} color="#ff2a1a" intensity={s.alarm * 9} distance={10} decay={1.4} />
      {/* the security camera in the corner, a red REC light */}
      <group position={CAMERA_AT} rotation={[0.45, PI + 0.72, 0]}>
        <M g={boxG(0.16, 0.14, 0.34)} c="#e8e8ec" tex="metal" />
        <M g={cylG(0.06, 0.06, 0.06, 12)} c="#1a1a1e" p={[0, 0, 0.19]} r={[PI / 2, 0, 0]} />
        <mesh geometry={sphG(0.018, 6)} material={coreMat("#ff2a2a", 1.2)} position={[0.05, 0.05, 0.17]} />
        <M g={cylG(0.02, 0.02, 0.3, 6)} c="#c8c8d0" tex="metal" p={[0, 0.2, -0.1]} />
      </group>
      {/* an archway to the next gallery (dark) */}
      <M g={boxG(0.2, 3.0, 1.8)} c="#14161e" p={[-GX + 0.02, 1.5, 4.0]} />
      <M g={boxG(0.2, 0.3, 2.1)} c="#e8dcc0" tex="plaster" p={[-GX + 0.06, 3.1, 4.0]} />
      {s.key ? <BrassKey p={s.key} /> : null}
    </group>
  );
};
/** a brass key on a red ribbon with a little paper tag */
export const BrassKey: React.FC<{ p: V3; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <M g={torG(0.035, 0.012)} c="#d8b040" tex="metal" p={[0, 0.05, 0]} />
    <M g={boxG(0.015, 0.12, 0.012)} c="#d8b040" tex="metal" p={[0, -0.03, 0]} />
    <M g={boxG(0.03, 0.012, 0.012)} c="#d8b040" tex="metal" p={[0.015, -0.07, 0]} />
    <M g={boxG(0.025, 0.012, 0.012)} c="#d8b040" tex="metal" p={[0.012, -0.045, 0]} />
    <M g={boxG(0.01, 0.12, 0.004)} c="#c8202a" p={[0, 0.14, 0]} />
    <M g={boxG(0.07, 0.045, 0.004)} c="#f0e8d0" tex="paper" p={[0.02, 0.2, 0]} r={[0, 0, 0.2]} />
  </group>
);

// ------------------------------------------------------------------ the security office
const monitorMat = (k: number) => {
  const key = `mon${k}`;
  let m = canvasMats.get(key);
  if (!m) {
    const tex = canvasTex(key, 320, 240, (g, w, h) => {
      g.fillStyle = "#0c1a14";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#5ac890";
      g.lineWidth = 3;
      if (k === 0) {
        // the gallery: the back wall, the painting, a hooded figure in front of it
        g.strokeRect(w * 0.15, h * 0.12, w * 0.7, h * 0.6);
        g.fillStyle = "#3a8a60";
        g.fillRect(w * 0.43, h * 0.22, w * 0.14, h * 0.24);
        g.fillStyle = "#9af0c0";
        g.beginPath();
        g.ellipse(w * 0.5, h * 0.55, w * 0.05, h * 0.06, 0, 0, PI * 2);
        g.fill();
        g.fillRect(w * 0.45, h * 0.6, w * 0.1, h * 0.25);
      } else {
        g.beginPath();
        g.moveTo(0, h);
        g.lineTo(w * 0.35, h * 0.35);
        g.lineTo(w * 0.65, h * 0.35);
        g.lineTo(w, h);
        g.moveTo(w * 0.35, h * 0.35);
        g.lineTo(w * 0.35, 0);
        g.moveTo(w * 0.65, h * 0.35);
        g.lineTo(w * 0.65, 0);
        g.stroke();
      }
      g.fillStyle = "#9af0c0";
      g.font = "bold 18px monospace";
      g.fillText(`CAM 0${k + 1}`, 10, 22);
      g.fillStyle = "#ff4a4a";
      g.beginPath();
      g.arc(w - 18, 16, 6, 0, PI * 2);
      g.fill();
      g.globalAlpha = 0.25;
      g.fillStyle = "#000";
      for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
      g.globalAlpha = 1;
    });
    m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    canvasMats.set(key, m);
  }
  return m;
};
export const MON_MAIN: V3 = [OFFICE[0] - 0.45, 1.45, OFFICE[2] - 1.6];
export const Office: React.FC<{ t: number }> = ({ t }) => (
  <group position={OFFICE}>
    <M g={boxG(7, 0.1, 7)} c="#4a4a52" tex="stone" p={[0, -0.05, 0]} />
    <M g={boxG(7, 3.2, 0.1)} c="#6a7a6a" tex="plaster" p={[0, 1.6, -2.4]} />
    <M g={boxG(0.1, 3.2, 7)} c="#5a6a5a" tex="plaster" p={[-2.6, 1.6, 0]} />
    <M g={boxG(0.1, 3.2, 7)} c="#5a6a5a" tex="plaster" p={[2.6, 1.6, 0]} />
    {/* the desk and its clutter */}
    <M g={boxG(3.2, 0.08, 0.9)} c="#6a5a4a" tex="wood" p={[0, 0.78, -1.75]} />
    {[-1.5, 1.5].map((x) => (
      <M key={x} g={boxG(0.08, 0.78, 0.8)} c="#3a3a40" tex="metal" p={[x, 0.39, -1.75]} />
    ))}
    {/* a 2 × 2 bank of CRT monitors */}
    {[0, 1, 2, 3].map((k) => {
      const x = (k % 2 ? 0.45 : -0.45) + 0;
      const y = k < 2 ? 1.45 : 2.15;
      return (
        <group key={k} position={[x, y, -2.0]}>
          <M g={boxG(0.82, 0.66, 0.6)} c="#c8c4b8" tex="metal" p={[0, 0, -0.2]} />
          <mesh geometry={boxG(0.66, 0.5, 0.01)} material={monitorMat(k)} position={[0, 0, 0.105]} userData={{ outline: false }} />
          <mesh geometry={boxG(0.7, 0.54, 0.01)} material={coreMat("#9af0c0", 0.25, 0.5)} position={[0, 0, 0.115]} userData={{ outline: false }} />
        </group>
      );
    })}
    <pointLight position={[0, 1.8, -1.2]} color="#7affc0" intensity={2.5} distance={4} decay={2} />
    <group position={[0.9, 0.82, -1.6]}>
      <M g={cylG(0.06, 0.05, 0.12, 12)} c="#e8e0d4" p={[0, 0.06, 0]} />
      <M g={torG(0.035, 0.01)} c="#e8e0d4" p={[0.07, 0.06, 0]} />
    </group>
    <group position={[-1.0, 0.82, -1.55]} rotation={[0, 0.3, 0]}>
      <M g={boxG(0.4, 0.07, 0.4)} c="#f0d8b0" tex="paper" p={[0, 0.035, 0]} />
      {[[-0.08, -0.08], [0.09, 0.05]].map(([x, z], i) => (
        <M key={i} g={torG(0.06, 0.03)} c="#e88aa0" p={[x, 0.09, z]} r={[PI / 2, 0, 0]} />
      ))}
    </group>
    <M g={boxG(0.5, 0.03, 0.18)} c="#2a2a30" tex="metal" p={[0, 0.83, -1.45]} />
    {/* the whiteboard: BREAK-INS and eleven tally marks */}
    <group position={[-2.54, 1.7, -0.4]} rotation={[0, PI / 2, 0]}>
      <M g={boxG(1.6, 1.0, 0.04)} c="#f4f4f0" />
      <Label text="BREAK-INS" p={[0, 0.34, 0.03]} w={1.0} h={0.16} bg="none" fg="#c8202a" font={0.85} />
      <mesh position={[0, -0.05, 0.03]} material={tallyMat(11)} userData={{ outline: false }}>
        <planeGeometry args={[1.2, 0.6]} />
      </mesh>
    </group>
    <M g={boxG(0.05, 0.6, 0.02)} c="#1e2028" p={[1.6, 2.6, -2.34]} />
    <mesh geometry={sphG(0.12, 12)} material={coreMat("#f4f0e0", 0.9)} position={[1.6, 2.3, -2.3]} />
    <Label text={`${String(2 + Math.floor(t / 2) % 10).padStart(2, "0")}:4${Math.floor(t) % 10}`} p={[1.6, 2.3, -2.17]} w={0.18} h={0.06} bg="none" fg="#1a1a1e" font={0.9} />
  </group>
);

// ------------------------------------------------------------------ the studio, 1964
export const EASEL: V3 = [STUDIO[0] + 0.6, 0, STUDIO[2] - 0.2];
export const STUDIO_DOOR: V3 = [STUDIO[0] + 2.9, 0, STUDIO[2] + 1.2];
export type StudioState = { t: number; canvasOn: number; door: number; cash?: V3 | null };
export const Studio: React.FC<{ s: StudioState }> = ({ s }) => (
  <group position={STUDIO}>
    <M g={boxG(8, 0.1, 6)} c="#8a6a4a" tex="planks" p={[0, -0.05, 0]} />
    <M g={boxG(8, 3.4, 0.1)} c="#d8c8a8" tex="plaster" p={[0, 1.7, -2.4]} />
    <M g={boxG(0.1, 3.4, 6)} c="#d0c0a0" tex="plaster" p={[-3.2, 1.7, 0]} />
    <M g={boxG(0.1, 3.4, 6)} c="#d0c0a0" tex="plaster" p={[3.2, 1.7, 0]} />
    {/* the slanted roof with beams, a dormer window pouring sun */}
    <M g={boxG(8, 0.1, 4.2)} c="#6a4a30" tex="planks" p={[0, 3.0, -0.6]} r={[0.45, 0, 0]} />
    {[-2.4, -0.8, 0.8, 2.4].map((x) => (
      <M key={x} g={boxG(0.16, 0.16, 4.2)} c="#4a3020" tex="wood" p={[x, 2.9, -0.55]} r={[0.45, 0, 0]} />
    ))}
    <group position={[-1.6, 1.9, -2.34]}>
      <mesh geometry={boxG(1.1, 1.0, 0.02)} material={coreMat("#fff0c0", 1.15)} />
      <M g={boxG(1.2, 0.07, 0.08)} c="#f0e8d8" p={[0, 0.52, 0.03]} />
      <M g={boxG(1.2, 0.07, 0.08)} c="#f0e8d8" p={[0, -0.52, 0.03]} />
      <M g={boxG(0.05, 1.0, 0.06)} c="#f0e8d8" p={[0, 0, 0.03]} />
      <M g={boxG(1.1, 0.05, 0.06)} c="#f0e8d8" p={[0, 0, 0.03]} />
      <mesh geometry={boxG(1.1, 3.0, 2.6)} material={coreMat("#ffe0a0", 1, 0.08)} position={[0.9, -0.9, 1.4]} rotation={[0.5, 0.4, 0.3]} userData={{ outline: false }} />
    </group>
    <pointLight position={[-1.2, 2.2, -1.2]} color="#ffd890" intensity={7} distance={7} decay={1.6} />
    {/* the easel with the painting */}
    <group position={[EASEL[0] - STUDIO[0], 0, EASEL[2] - STUDIO[2]]} rotation={[0, -0.5, 0]}>
      {[-0.35, 0.35].map((x) => (
        <M key={x} g={boxG(0.05, 2.0, 0.05)} c="#8a6038" tex="wood" p={[x, 1.0, 0]} r={[0.12, 0, x > 0 ? -0.08 : 0.08]} />
      ))}
      <M g={boxG(0.05, 1.9, 0.05)} c="#8a6038" tex="wood" p={[0, 0.95, -0.35]} r={[-0.3, 0, 0]} />
      <M g={boxG(0.85, 0.05, 0.1)} c="#8a6038" tex="wood" p={[0, 0.82, 0.08]} />
      <group position={[0, 1.36, 0.05]} rotation={[-0.08, 0, 0]}>
        <mesh material={JUNE_MAT()} userData={{ outline: false }} position={[0, 0, 0.012]} scale={[s.canvasOn, 1, 1]}>
          <planeGeometry args={[0.8, 1.04]} />
        </mesh>
        <M g={boxG(0.82, 1.06, 0.03)} c="#f4f0e4" tex="fabric" p={[0, 0, -0.01]} />
      </group>
    </group>
    {/* a paint table: jars, brushes, a palette */}
    <group position={[1.6, 0, 0.6]}>
      <M g={boxG(0.8, 0.05, 0.5)} c="#6a4a30" tex="wood" p={[0, 0.72, 0]} />
      {[[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]].map(([x, z], i) => (
        <M key={i} g={boxG(0.04, 0.72, 0.04)} c="#4a3020" tex="wood" p={[x, 0.36, z]} />
      ))}
      {["#f4c430", "#3a6aa8", "#c83a2a", "#5a8a3a", "#f4f0e8"].map((c, i) => (
        <group key={i} position={[-0.3 + i * 0.13, 0.8, -0.1 + (i % 2) * 0.12]}>
          <M g={cylG(0.04, 0.04, 0.1, 10)} c="#c8d8e0" op={0.7} />
          <M g={cylG(0.035, 0.035, 0.05, 10)} c={c} p={[0, -0.02, 0]} />
        </group>
      ))}
      <M g={cylG(0.16, 0.16, 0.015, 18)} c="#c8a070" tex="wood" p={[0.15, 0.755, 0.15]} s={[1.3, 1, 1]} />
      {["#f4c430", "#c83a2a", "#3a6aa8"].map((c, i) => (
        <M key={c} g={sphG(0.025, 8)} c={c} p={[0.05 + i * 0.09, 0.77, 0.12]} s={[1, 0.4, 1]} />
      ))}
    </group>
    {/* a mattress on the floor, a blanket, a stack of books, a stool for the model */}
    <group position={[-2.2, 0, 0.9]}>
      <M g={boxG(1.0, 0.2, 1.9)} c="#e8e0d0" tex="fabric" p={[0, 0.1, 0]} />
      <M g={boxG(1.02, 0.06, 1.1)} c="#8a3a3a" tex="fabric" p={[0, 0.22, 0.3]} />
      <M g={boxG(0.5, 0.12, 0.3)} c="#f4f0e8" tex="fabric" p={[0, 0.25, -0.75]} />
    </group>
    <group position={[-0.9, 0, -1.3]}>
      <M g={cylG(0.2, 0.2, 0.05, 16)} c="#8a6038" tex="wood" p={[0, 0.62, 0]} />
      {[0, 1, 2].map((i) => (
        <M key={i} g={cylG(0.02, 0.025, 0.62, 6)} c="#6a4428" tex="wood" p={[Math.sin(i * 2.1) * 0.14, 0.31, Math.cos(i * 2.1) * 0.14]} />
      ))}
    </group>
    {/* the door, the rent notice */}
    <group position={[STUDIO_DOOR[0] - STUDIO[0], 0, STUDIO_DOOR[2] - STUDIO[2]]}>
      <M g={boxG(0.12, 2.3, 0.1)} c="#5a3a24" tex="wood" p={[0.02, 1.15, -0.55]} />
      <M g={boxG(0.12, 2.3, 0.1)} c="#5a3a24" tex="wood" p={[0.02, 1.15, 0.55]} />
      <M g={boxG(0.2, 2.2, 1.0)} c="#2a1a14" p={[0.12, 1.1, 0]} />
      <group position={[0.02, 0, -0.5]} rotation={[0, 1.4 * s.door, 0]}>
        <M g={boxG(0.06, 2.15, 1.0)} c="#7a5030" tex="planks" p={[0, 1.08, 0.5]} />
        <M g={boxG(0.02, 0.3, 0.24)} c="#f4f0e4" tex="paper" p={[-0.04, 1.5, 0.55]} />
        <Label text="RENT DUE" p={[-0.055, 1.55, 0.55]} r={[0, -PI / 2, 0]} w={0.22} h={0.06} bg="none" fg="#c8202a" font={0.8} />
      </group>
    </group>
    {s.cash ? (
      <group position={s.cash}>
        {[0, 1, 2].map((i) => (
          <M key={i} g={boxG(0.15, 0.004, 0.07)} c="#8ab88a" tex="paper" p={[i * 0.01, i * 0.004, i * 0.006]} r={[0, i * 0.15, 0]} />
        ))}
      </group>
    ) : null}
  </group>
);

// ------------------------------------------------------------------ the lobby, by day, in the rain
export const TICKET: V3 = [LOBBY[0] + 0.6, 0, LOBBY[2] - 1.4];
export const Lobby: React.FC<{ t: number }> = ({ t }) => (
  <group position={LOBBY}>
    <M g={boxG(9, 0.1, 7)} c="#d8d0c4" tex="stone" ts={0.6} p={[0, -0.05, 0]} />
    <M g={boxG(9, 4.2, 0.1)} c="#e8e2d6" tex="plaster" p={[0, 2.1, -2.6]} />
    <M g={boxG(0.1, 4.2, 7)} c="#e0d8cc" tex="plaster" p={[-3.6, 2.1, 0]} />
    {/* the ticket window: a wooden counter, glass, a CLOSED sign, the admission board above */}
    <group position={[TICKET[0] - LOBBY[0], 0, -2.3]}>
      <M g={boxG(2.0, 1.1, 0.5)} c="#6a4428" tex="wood" p={[0, 0.55, 0]} />
      <M g={boxG(2.1, 0.06, 0.6)} c="#8a6038" tex="wood" p={[0, 1.12, 0]} />
      <mesh geometry={boxG(1.8, 1.0, 0.02)} material={coreMat("#c8e0f0", 0.9, 0.25)} position={[0, 1.65, 0.1]} userData={{ outline: false }} />
      <M g={boxG(0.06, 1.1, 0.06)} c="#c8a040" tex="metal" p={[0, 1.65, 0.11]} />
      <M g={boxG(0.5, 0.04, 0.3)} c="#c8a040" tex="metal" p={[0, 1.17, 0.18]} />
      <group position={[0, 2.62, 0.08]}>
        <M g={boxG(1.6, 0.7, 0.06)} c="#1a2a3a" />
        <Label text="ADMISSION" p={[0, 0.17, 0.035]} w={1.2} h={0.18} bg="none" fg="#f0e0b0" font={0.8} />
        <Label text="$32" p={[0, -0.12, 0.035]} w={0.8} h={0.32} bg="none" fg="#ffd34d" font={0.95} />
      </group>
    </group>
    {/* a poster of the painting, a rope line, a bench, the glass front doors with rain beyond */}
    <group position={[-2.2, 2.0, -2.53]}>
      <M g={boxG(1.1, 1.6, 0.03)} c="#1a1a20" />
      <mesh material={JUNE_MAT()} position={[0, 0.12, 0.02]} userData={{ outline: false }}>
        <planeGeometry args={[0.9, 1.17]} />
      </mesh>
      <Label text="GIRL IN YELLOW" p={[0, -0.62, 0.02]} w={0.9} h={0.12} bg="none" fg="#ffd34d" font={0.8} />
    </group>
    {[-1.0, 0.2, 1.4].map((x) => (
      <group key={x} position={[x - 1.6, 0, 0.9]}>
        <M g={cylG(0.03, 0.03, 0.95, 10)} c="#c8a040" tex="metal" p={[0, 0.48, 0]} />
        <M g={cylG(0.16, 0.18, 0.05, 16)} c="#c8a040" tex="metal" p={[0, 0.025, 0]} />
      </group>
    ))}
    {[-0.4, 0.8].map((x) => (
      <mesh key={x} position={[x - 1.6, 0.82, 0.9]} rotation={[0, 0, PI]}>
        <torusGeometry args={[0.6, 0.03, 8, 20, PI]} />
        <meshToonMaterial color="#8a1a24" />
      </mesh>
    ))}
    <group position={[0, 0, 3.4]}>
      <mesh geometry={boxG(9, 4.2, 0.04)} material={coreMat("#8aa0b8", 0.9, 0.3)} position={[0, 2.1, 0]} userData={{ outline: false }} />
      {[-3, -1.5, 0, 1.5, 3].map((x) => (
        <M key={x} g={boxG(0.08, 4.2, 0.08)} c="#2a2c34" tex="metal" p={[x, 2.1, 0]} />
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} geometry={boxG(0.008, 0.35, 0.008)} material={coreMat("#c8d8f0", 0.9, 0.5)} position={[-4 + h1(i) * 8, 4 - ((t * 9 + h1(i + 3) * 4) % 4.2), 0.6 + h1(i + 7) * 2]} userData={{ outline: false }} />
      ))}
    </group>
  </group>
);

// ------------------------------------------------------------------ small props
/** an ID card, held in a hand (local +z faces out) */
export const IdCard: React.FC<{ p: V3; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <M g={boxG(0.16, 0.1, 0.006)} c="#f4f0e4" tex="paper" />
    <M g={boxG(0.05, 0.065, 0.002)} c="#8a9ab0" p={[-0.045, 0, 0.004]} />
    <Label text="HENRY ABEL" p={[0.03, 0.015, 0.005]} w={0.09} h={0.025} bg="none" fg="#1a1a24" font={0.85} />
    <Label text="H. Abel" p={[0.03, -0.022, 0.005]} w={0.07} h={0.025} bg="none" fg="#7a1e18" font={0.85} />
  </group>
);
/** a few coins and a pressed flower in an open palm */
export const PalmThings: React.FC<{ p: V3; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={p} rotation={[0, ry, 0]} scale={2.2}>
    {[[0, 0], [0.025, 0.01], [-0.02, 0.015]].map(([x, z], i) => (
      <M key={i} g={cylG(0.012, 0.012, 0.003, 12)} c={i ? "#b8b8c0" : "#c88a50"} tex="metal" p={[x, i * 0.002, z]} />
    ))}
    <M g={sphG(0.012, 8)} c="#f4c430" p={[0.01, 0.006, -0.025]} s={[1.6, 0.3, 1.6]} />
    <M g={boxG(0.004, 0.002, 0.05)} c="#5a7a3a" p={[0.01, 0.004, -0.0]} />
  </group>
);
/** a flashlight with its beam (a soft cone) and a real spot light */
export const Flashlight: React.FC<{ p: V3; to: V3; on: number }> = ({ p, to, on }) => {
  const d = [to[0] - p[0], to[1] - p[1], to[2] - p[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const yaw = Math.atan2(d[0], d[2]);
  const pitch = Math.asin(-d[1] / L);
  const ref = React.useRef<THREE.SpotLight>(null);
  const tgt = React.useMemo(() => new THREE.Object3D(), []);
  tgt.position.set(to[0], to[1], to[2]);
  tgt.updateMatrixWorld();
  React.useLayoutEffect(() => {
    if (ref.current) ref.current.target = tgt;
  });
  const bl = Math.min(L, 6);
  return (
    <group>
      <group position={p} rotation={[pitch, yaw, 0]} rotation-order="YXZ">
        <M g={cylG(0.028, 0.022, 0.2, 10)} c="#1e2028" tex="metal" r={[PI / 2, 0, 0]} />
        <mesh geometry={sphG(0.025, 8)} material={coreMat("#fff4d0", on > 0.5 ? 1.3 : 0.5)} position={[0, 0, 0.1]} />
        {on > 0.01 ? <mesh geometry={coneG(0.5, bl, 20)} material={coreMat("#fff2c8", 1, 0.035 * on)} position={[0, 0, 0.1 + bl / 2]} rotation={[-PI / 2, 0, 0]} userData={{ outline: false }} /> : null}
      </group>
      <spotLight ref={ref} position={p} color="#fff0d0" intensity={on * 11} distance={14} angle={0.32} penumbra={0.6} decay={1.5} />
    </group>
  );
};
