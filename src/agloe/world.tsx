// The Agloe short's sets, all in one world, far apart: the mapmakers' office (origin), the other company's office
// (x = 40), and the crossroads in the country (x = 100). Everything is a pure function of its props.
import React from "react";
import * as THREE from "three";
import { boxG, canvasTex, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import { toonMaterial } from "../inkbeat/mat/materials";
import type { V3 } from "../inkbeat/types";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** a small overshoot pop, 0..1 */
export const pop = (u: number) => {
  const x = clamp(u);
  const c = 1.9;
  return x >= 1 ? 1 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

// ------------------------------------------------------------------ the map on the drafting table
export const TABLE_Y = 0.9;
export const MAP_C: V3 = [0.05, TABLE_Y + 0.004, -0.02];
export const MAP_W = 1.2;
export const MAP_D = 0.84;
/** the dot: where the pen tip lands (shots.ts solves the hand to it) */
export const DOT: V3 = [0.1, TABLE_Y + 0.006, -0.12];
export const RIVAL_X = 40;
export const FX = 100;
const uvOf = (p: V3) => [(p[0] - MAP_C[0]) / MAP_W + 0.5, (p[2] - MAP_C[2]) / MAP_D + 0.5];

const TOWNS: [number, number, string][] = [
  [0.18, 0.3, "Hollow Brook"], [0.32, 0.72, "East Fenwick"], [0.8, 0.26, "Grange"], [0.84, 0.66, "Lark Valley"], [0.16, 0.56, "Pine Ridge"], [0.62, 0.84, "Coldwater"],
];
const drawMap = (g: CanvasRenderingContext2D, W: number, H: number, rival: boolean) => {
  const [du, dv] = uvOf(DOT);
  const dx = du * W;
  const dy = dv * H;
  g.fillStyle = rival ? "#e4eef0" : "#f1e6c8";
  g.fillRect(0, 0, W, H);
  // land tints
  g.fillStyle = rival ? "#d4e8d8" : "#e2e4b8";
  g.beginPath();
  g.ellipse(W * 0.3, H * 0.4, W * 0.28, H * 0.3, 0.4, 0, PI * 2);
  g.ellipse(W * 0.78, H * 0.7, W * 0.22, H * 0.22, -0.3, 0, PI * 2);
  g.fill();
  // a lake and a river
  g.fillStyle = rival ? "#8ec4e4" : "#9cc6d8";
  g.beginPath();
  g.ellipse(W * 0.7, H * 0.4, W * 0.07, H * 0.1, 0.6, 0, PI * 2);
  g.fill();
  g.strokeStyle = g.fillStyle;
  g.lineWidth = 16;
  g.beginPath();
  g.moveTo(W * 0.7, H * 0.48);
  g.bezierCurveTo(W * 0.62, H * 0.7, W * 0.48, H * 0.78, W * 0.4, H);
  g.stroke();
  // county lines
  g.setLineDash([18, 14]);
  g.strokeStyle = rival ? "#8aa0b0" : "#b0987a";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(W * 0.46, 0);
  g.lineTo(W * 0.5, H * 0.3);
  g.lineTo(W * 0.42, H);
  g.moveTo(0, H * 0.62);
  g.lineTo(W, H * 0.55);
  g.stroke();
  g.setLineDash([]);
  // highways
  const road = (pts: number[][], w: number, c: string, edge: string) => {
    for (const [lw, col] of [[w + 8, edge], [w, c]] as [number, string][]) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(pts[0][0] * W, pts[0][1] * H);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] * W, pts[i][1] * H);
      g.stroke();
    }
  };
  const hw = rival ? "#3a6ac8" : "#c8402e";
  road([[0, 0.2], [0.3, 0.3], [0.55, 0.22], [1, 0.3]], 18, hw, "#2a1a1a");
  road([[0.15, 1], [0.3, 0.72], [0.34, 0.3], [0.2, 0]], 16, hw, "#2a1a1a");
  road([[0.3, 0.72], [0.62, 0.84], [0.84, 0.66], [1, 0.72]], 12, "#e8b830", "#5a4020");
  road([[0.55, 0.22], [0.8, 0.26], [0.84, 0.66]], 12, "#e8b830", "#5a4020");
  // the quiet roads: two thin dirt roads crossing where the dot goes
  road([[0.34, 0.3 + (dv - 0.3) * 0.2], [du, dv], [0.8, 0.26 + (dv - 0.26) * 0.5]], 5, "#8a6a4a", "#f1e6c8");
  road([[du + 0.04, 0.12], [du, dv], [du - 0.05, 0.84]], 5, "#8a6a4a", "#f1e6c8");
  // towns
  g.font = "700 40px Poppins";
  g.textBaseline = "middle";
  for (const [u, v, name] of TOWNS) {
    g.fillStyle = "#2a1a1a";
    g.beginPath();
    g.arc(u * W, v * H, 12, 0, PI * 2);
    g.fill();
    g.fillStyle = rival ? "#1a3a6a" : "#3a2a1a";
    g.fillText(name, u * W + 22, v * H - 2);
  }
  // the region name
  g.fillStyle = rival ? "#2a4a8a" : "#7a3a2a";
  g.font = "800 120px Poppins";
  g.textAlign = "center";
  g.fillText("N E W   Y O R K", W * 0.5, H * 0.1);
  // title box + compass rose
  g.textAlign = "left";
  g.fillStyle = rival ? "#2a4a8a" : "#3a2a1a";
  g.fillRect(W * 0.04, H * 0.82, W * 0.26, H * 0.13);
  g.fillStyle = rival ? "#e4eef0" : "#f1e6c8";
  g.font = "800 64px Poppins";
  g.fillText(rival ? "ROAD MAP" : "COUNTY MAP", W * 0.06, H * 0.885);
  g.strokeStyle = "#3a2a1a";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(W * 0.92, H * 0.78);
  g.lineTo(W * 0.92, H * 0.94);
  g.moveTo(W * 0.86, H * 0.86);
  g.lineTo(W * 0.98, H * 0.86);
  g.stroke();
  g.fillStyle = "#3a2a1a";
  g.font = "800 48px Poppins";
  g.textAlign = "center";
  g.fillText("N", W * 0.92, H * 0.75);
  // border
  g.strokeStyle = rival ? "#2a4a8a" : "#5a3a2a";
  g.lineWidth = 14;
  g.strokeRect(10, 10, W - 20, H - 20);
  if (rival) {
    // the copy: their map prints Agloe at the same crossroads
    g.fillStyle = "#1a1a2a";
    g.beginPath();
    g.arc(dx, dy, 14, 0, PI * 2);
    g.fill();
    g.font = "800 58px Poppins";
    g.textAlign = "left";
    g.fillStyle = "#1a2a5a";
    g.fillText("Agloe", dx + 26, dy + 2);
  }
};
const mapMats = new Map<string, THREE.Material>();
const mapMat = (rival: boolean) => {
  const k = rival ? "r" : "m";
  let m = mapMats.get(k);
  if (!m) {
    const tex = canvasTex(`map-${k}`, 2048, 1434, (g, w, h) => drawMap(g, w, h, rival));
    m = new THREE.MeshToonMaterial({ map: tex });
    mapMats.set(k, m);
  }
  return m;
};
/** a map sheet lying flat; `dot` 0..1 draws the inked dot, `letters` how many letters of "Agloe" are written,
 *  `ring` 0..1 a red circle around the dot */
export const MapSheet: React.FC<{ c?: V3; rival?: boolean; dot?: number; letters?: number; ring?: number; yaw?: number }> = ({ c = MAP_C, rival = false, dot = 0, letters = 0, ring = 0, yaw = 0 }) => {
  const off: V3 = [DOT[0] - MAP_C[0], 0, DOT[2] - MAP_C[2]];
  return (
    <group position={c} rotation={[0, yaw, 0]}>
      <mesh material={mapMat(rival)} rotation={[-PI / 2, 0, 0]} receiveShadow userData={{ outline: false }}>
        <planeGeometry args={[MAP_W, MAP_D]} />
      </mesh>
      {dot > 0 ? <mesh geometry={cylG(0.0085, 0.0085, 0.002, 20)} material={coreMat("#141018", 1)} position={[off[0], 0.002, off[2]]} scale={[pop(dot), 1, pop(dot)]} userData={{ outline: false }} /> : null}
      {letters > 0 ? (
        <Label text={"Agloe".slice(0, Math.min(5, Math.floor(letters)))} p={[off[0] + 0.012 + 0.0125 * Math.min(5, Math.floor(letters)), 0.003, off[2]]} r={[-PI / 2, 0, 0]} w={0.025 * Math.min(5, Math.floor(letters))} h={0.034} fg="#1a1220" bg="none" font={0.95} />
      ) : null}
      {ring > 0 ? <mesh geometry={torG(0.05, 0.004, PI * 2 * clamp(ring))} material={coreMat("#d0281e", 1)} position={[off[0] + 0.035, 0.004, off[2]]} rotation={[-PI / 2, 0, 0.4]} userData={{ outline: false }} /> : null}
    </group>
  );
};

// ------------------------------------------------------------------ small props
export const Pen: React.FC<{ tip: V3; top: V3 }> = ({ tip, top }) => {
  const a = new THREE.Vector3(...tip);
  const b = new THREE.Vector3(...top);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const L = a.distanceTo(b);
  return (
    <group position={mid.toArray() as V3} quaternion={q}>
      <M g={cylG(0.007, 0.0045, L, 12)} c="#1a1a22" />
      <M g={cylG(0.0075, 0.0075, 0.012, 12)} c="#d8b04a" tex="metal" p={[0, L * 0.18, 0]} />
      <M g={coneG(0.0045, 0.018, 10)} c="#c8a040" tex="metal" p={[0, -L / 2 - 0.008, 0]} r={[PI, 0, 0]} />
    </group>
  );
};
export const Magnifier: React.FC<{ hand: V3; yaw?: number }> = ({ hand, yaw = 0 }) => (
  <group position={hand} rotation={[0, yaw, 0]}>
    <M g={cylG(0.013, 0.015, 0.13, 10)} c="#5a3a22" tex="wood" p={[0, -0.01, 0.05]} r={[PI / 2 - 0.25, 0, 0]} />
    <group position={[0, 0.03, 0.17]} rotation={[-1.25, 0, 0]}>
      <M g={torG(0.07, 0.011)} c="#c8a040" tex="metal" r={[PI / 2, 0, 0]} />
      <mesh geometry={cylG(0.066, 0.066, 0.004, 24)} material={coreMat("#d8f0ff", 0.95, 0.4)} userData={{ outline: false }} />
    </group>
  </group>
);
/** a road map held open in two hands */
export const HeldMap: React.FC<{ p: V3; yaw: number }> = ({ p, yaw }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <mesh material={mapMat(true)} rotation={[-0.55, 0, 0]} position={[0, 0, 0.02]} userData={{ outline: false }}>
      <planeGeometry args={[0.46, 0.32]} />
    </mesh>
    <M g={boxG(0.47, 0.33, 0.004)} c="#e4eef0" tex="paper" r={[-0.55, 0, 0]} p={[0, -0.002, 0.018]} />
  </group>
);
export const Hammer: React.FC<{ hand: V3; swing: number }> = ({ hand, swing }) => (
  <group position={hand} rotation={[0.3 - swing * 0.9, 0, 0]}>
    <M g={cylG(0.016, 0.018, 0.34, 10)} c="#a87a4a" tex="wood" p={[0, 0.12, 0]} />
    <M g={boxG(0.05, 0.05, 0.16)} c="#4a4a52" tex="metal" p={[0, 0.28, 0.02]} />
  </group>
);
/** a wooden letter tile */
export const Tile: React.FC<{ p: V3; ch: string; r?: number }> = ({ p, ch, r = 0 }) => (
  <group position={p} rotation={[0, r, 0]}>
    <M g={boxG(0.11, 0.03, 0.11)} c="#e0b878" tex="wood" p={[0, 0.015, 0]} />
    <Label text={ch} p={[0, 0.0312, 0]} r={[-PI / 2, 0, 0]} w={0.09} h={0.09} fg="#2a1a12" bg="none" font={0.95} />
  </group>
);
const Book: React.FC<{ p: V3; c: string; h?: number; r?: V3 }> = ({ p, c, h = 0.26, r }) => <M g={boxG(0.05, h, 0.2)} c={c} tex="paper" p={[p[0], p[1] + h / 2, p[2]]} r={r} />;
const Paper: React.FC<{ p: V3; r?: number; w?: number; d?: number; c?: string }> = ({ p, r = 0, w = 0.21, d = 0.28, c = "#f4eedc" }) => <M g={boxG(w, 0.003, d)} c={c} tex="paper" p={p} r={[0, r, 0]} />;

// ------------------------------------------------------------------ the mapmakers' office (origin): open toward +z
const DraftingTable: React.FC = () => (
  <group>
    <M g={boxG(1.6, 0.05, 1.0)} c="#9a6a3e" tex="wood" p={[0, TABLE_Y - 0.025, 0]} />
    {[[-0.72, -0.42], [0.72, -0.42], [-0.72, 0.42], [0.72, 0.42]].map(([x, z], i) => (
      <M key={i} g={boxG(0.07, TABLE_Y - 0.05, 0.07)} c="#7a4e2e" tex="wood" p={[x, (TABLE_Y - 0.05) / 2, z]} />
    ))}
    <M g={boxG(1.44, 0.05, 0.05)} c="#7a4e2e" tex="wood" p={[0, 0.22, 0.42]} />
    <M g={boxG(1.44, 0.05, 0.05)} c="#7a4e2e" tex="wood" p={[0, 0.22, -0.42]} />
  </group>
);
const DeskLamp: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.08, 0.09, 0.025, 16)} c="#2a4a3a" tex="metal" p={[0, 0.012, 0]} />
    <M g={cylG(0.012, 0.012, 0.36, 8)} c="#c8a040" tex="metal" p={[0, 0.19, 0]} />
    <M g={cylG(0.03, 0.12, 0.12, 18, true)} c="#2a6a4a" tex="metal" p={[0.06, 0.38, 0.04]} r={[0.5, 0, -0.5]} side={THREE.DoubleSide} />
    <mesh geometry={sphG(0.035, 12)} material={coreMat("#ffd890", 1.0)} position={[0.08, 0.34, 0.06]} />
    <pointLight position={[0.1, 0.3, 0.1]} color="#ffc070" intensity={1.6} distance={2.4} decay={2} />
  </group>
);
const Globe: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.07, 0.09, 0.03, 16)} c="#5a3a22" tex="wood" p={[0, 0.015, 0]} />
    <M g={cylG(0.012, 0.012, 0.12, 8)} c="#5a3a22" p={[0, 0.08, 0]} />
    <M g={sphG(0.14, 24)} c="#4a8ab8" tex="paper" p={[0, 0.27, 0]} />
    <M g={sphG(0.08, 12)} c="#8ab06a" p={[0.07, 0.31, 0.07]} s={[1, 0.6, 0.5]} />
    <M g={torG(0.155, 0.008, PI)} c="#c8a040" tex="metal" p={[0, 0.27, 0]} r={[0, 0, 0.4]} />
  </group>
);
const Window: React.FC<{ p: V3; w: number; h: number; sky: string; frame?: string }> = ({ p, w, h, sky, frame = "#e8dcc4" }) => (
  <group position={p}>
    <mesh geometry={boxG(w, h, 0.02)} material={coreMat(sky, 0.95)} />
    <M g={boxG(w + 0.12, 0.07, 0.06)} c={frame} p={[0, h / 2 + 0.035, 0.02]} />
    <M g={boxG(w + 0.12, 0.07, 0.06)} c={frame} p={[0, -h / 2 - 0.035, 0.02]} />
    <M g={boxG(0.07, h, 0.06)} c={frame} p={[-w / 2 - 0.025, 0, 0.02]} />
    <M g={boxG(0.07, h, 0.06)} c={frame} p={[w / 2 + 0.025, 0, 0.02]} />
    <M g={boxG(0.04, h, 0.04)} c={frame} p={[0, 0, 0.025]} />
    <M g={boxG(w, 0.04, 0.04)} c={frame} p={[0, 0, 0.03]} />
    <M g={boxG(w + 0.26, 0.06, 0.2)} c="#b89a78" tex="wood" p={[0, -h / 2 - 0.1, 0.08]} />
  </group>
);

export type OfficeState = {
  map?: "maker" | "rival" | "both";
  dot?: number;
  letters?: number;
  ring?: number;
  tiles?: number; // 0 = two groups, 1 = AGLOE in a row; undefined = no tiles
  lawsuit?: number;
  jump?: number; // papers hop on the slam
};
export const TILE_FROM: [string, V3][] = [
  ["O", [-0.5, 0, 0.16]], ["G", [-0.37, 0, 0.22]], ["L", [-0.24, 0, 0.16]],
  ["E", [0.34, 0, 0.2]], ["A", [0.48, 0, 0.15]],
];
const TILE_ORDER = "AGLOE";
export const Office: React.FC<{ s: OfficeState }> = ({ s }) => {
  const j = s.jump ?? 0;
  return (
    <group>
      {/* room shell: floor, back wall, side walls, ceiling (the side and top pieces never block the sun key) */}
      <M g={boxG(7, 0.1, 7)} c="#8a5a3a" tex="planks" ts={1.2} p={[0, -0.05, 0]} cast={false} />
      <M g={boxG(2.6, 0.012, 1.8)} c="#9a3a3a" tex="fabric" p={[0, 0.006, -0.1]} cast={false} />
      <M g={boxG(7, 3.4, 0.2)} c="#8aa894" tex="plaster" p={[0, 1.7, -2.7]} cast={false} />
      <M g={boxG(7, 0.9, 0.06)} c="#5a3a2a" tex="planks" p={[0, 0.45, -2.57]} cast={false} />
      <M g={boxG(0.2, 3.4, 7)} c="#7e9c8a" tex="plaster" p={[-3.2, 1.7, 0.6]} cast={false} />
      <M g={boxG(0.2, 3.4, 7)} c="#7e9c8a" tex="plaster" p={[3.2, 1.7, 0.6]} cast={false} />
      <M g={boxG(7, 0.12, 7)} c="#e8d8b8" tex="plaster" p={[0, 3.46, 0.6]} cast={false} />
      <Window p={[1.35, 1.75, -2.585]} w={1.2} h={1.3} sky="#bfe0ff" />
      {/* the wall calendar: the year is the tag */}
      <group position={[-0.35, 2.1, -2.585]}>
        <M g={boxG(0.56, 0.7, 0.02)} c="#f4ecd8" tex="paper" />
        <M g={boxG(0.56, 0.12, 0.024)} c="#b8342a" p={[0, 0.29, 0.002]} />
        <Label text="1930" p={[0, 0.02, 0.014]} w={0.5} h={0.26} fg="#2a1a12" bg="none" font={0.85} />
        {Array.from({ length: 12 }, (_, i) => (
          <M key={i} g={boxG(0.06, 0.04, 0.004)} c="#8a7a6a" p={[-0.2 + (i % 6) * 0.08, -0.17 - Math.floor(i / 6) * 0.08, 0.012]} />
        ))}
      </group>
      {/* a framed map on the wall, a bookshelf with map rolls, a filing cabinet, a globe, a coat rack */}
      <group position={[-1.6, 1.85, -2.585]}>
        <M g={boxG(1.0, 0.72, 0.04)} c="#5a3a22" tex="wood" />
        <M g={boxG(0.88, 0.6, 0.02)} c="#e8dcb0" tex="paper" p={[0, 0, 0.022]} />
        <M g={boxG(0.3, 0.2, 0.01)} c="#9cc6d8" p={[0.15, 0.08, 0.034]} />
        <M g={boxG(0.5, 0.025, 0.01)} c="#c8402e" p={[-0.08, -0.1, 0.034]} r={[0, 0, 0.3]} />
      </group>
      <group position={[-2.6, 0, -2.2]}>
        <M g={boxG(1.1, 2.2, 0.4)} c="#6a4430" tex="wood" p={[0, 1.1, 0]} />
        {[0.45, 1.05, 1.65].map((y) => (
          <M key={y} g={boxG(1.02, 0.04, 0.36)} c="#8a5a3a" tex="wood" p={[0, y, 0.03]} />
        ))}
        {[0.47, 1.07].map((y, k) =>
          ["#7a2a2a", "#2a4a6a", "#c8a040", "#3a6a3a", "#5a3a6a", "#a85a2a", "#2a2a3a"].map((c, i) => <Book key={`${k}${i}`} p={[-0.4 + i * 0.11, y + 0.02, 0.06]} c={c} h={0.24 + ((i * 7 + k) % 3) * 0.04} />),
        )}
        {[0, 1, 2, 3, 4].map((i) => (
          <M key={i} g={cylG(0.045, 0.045, 0.7, 14)} c={i % 2 ? "#efe2c0" : "#e2d2a8"} tex="paper" p={[-0.34 + i * 0.14, 1.72, 0.04]} r={[0, 0, PI / 2 - 0.05 * i]} />
        ))}
      </group>
      <group position={[2.4, 0, -2.2]}>
        <M g={boxG(0.6, 1.3, 0.6)} c="#5a6a5a" tex="metal" p={[0, 0.65, 0]} />
        {[0.3, 0.72, 1.1].map((y) => (
          <M key={y} g={boxG(0.16, 0.04, 0.03)} c="#c8a040" tex="metal" p={[0, y, 0.31]} />
        ))}
        <Globe p={[0, 1.3, 0]} />
      </group>
      <group position={[2.6, 0, -0.6]}>
        <M g={cylG(0.03, 0.03, 1.8, 10)} c="#5a3a22" tex="wood" p={[0, 0.9, 0]} />
        <M g={cylG(0.22, 0.24, 0.04, 14)} c="#5a3a22" tex="wood" p={[0, 0.02, 0]} />
        <M g={cylG(0.17, 0.2, 0.09, 18)} c="#4a3a2e" tex="fabric" p={[0.06, 1.74, 0]} />
        <M g={cylG(0.27, 0.27, 0.02, 20)} c="#4a3a2e" tex="fabric" p={[0.06, 1.7, 0]} />
      </group>
      <group position={[-1.9, 0, 0.6]}>
        <M g={cylG(0.18, 0.15, 0.36, 16, true)} c="#7a6a5a" tex="metal" p={[0, 0.18, 0]} side={THREE.DoubleSide} />
        {[[0.05, 0.3, 0.02], [-0.06, 0.32, -0.04]].map((q, i) => (
          <M key={i} g={sphG(0.07, 10)} c="#efe6d0" tex="paper" p={q as V3} />
        ))}
      </group>
      {/* the drafting table and what is on it */}
      <DraftingTable />
      <DeskLamp p={[-0.72, TABLE_Y, -0.4]} />
      <M g={cylG(0.03, 0.035, 0.06, 14)} c="#1a2a4a" p={[0.68, TABLE_Y + 0.03 + j * 0.02, -0.34]} />
      <M g={boxG(0.5, 0.008, 0.04)} c="#d8c08a" tex="wood" p={[-0.05, TABLE_Y + 0.004 + j * 0.03, 0.4]} r={[0, 0.06, 0]} />
      {s.map === "maker" || s.map === "both" ? <MapSheet dot={s.dot} letters={s.letters} ring={s.ring} /> : null}
      {s.map === "rival" ? <MapSheet rival ring={s.ring} /> : null}
      {s.map === "both" ? <MapSheet rival c={[-0.32, TABLE_Y + 0.012, 0.12]} yaw={0.12} /> : null}
      {s.lawsuit !== undefined ? (
        <group position={[0.55, TABLE_Y + 0.012 + j * 0.04, 0.16]} rotation={[0, -0.25, 0]} scale={pop(s.lawsuit)}>
          <Paper p={[0, 0, 0]} w={0.3} d={0.4} />
          <Label text="LAWSUIT" p={[0, 0.003, -0.11]} r={[-PI / 2, 0, 0]} w={0.26} h={0.07} fg="#b8241c" bg="none" font={0.9} />
          {[0, 1, 2, 3, 4].map((i) => (
            <M key={i} g={boxG(0.22 - (i % 2) * 0.05, 0.002, 0.012)} c="#6a6a72" p={[-0.01, 0.003, -0.03 + i * 0.04]} />
          ))}
        </group>
      ) : null}
      {s.tiles !== undefined
        ? TILE_FROM.map(([ch, p0]) => {
            const k = TILE_ORDER.indexOf(ch);
            const to: V3 = [-0.26 + k * 0.13, 0, 0.3];
            const e = THREE.MathUtils.smootherstep(clamp((s.tiles ?? 0) * 1.6 - k * 0.15), 0, 1);
            const hop = Math.sin(PI * e) * 0.06;
            return <Tile key={ch} ch={ch} p={[p0[0] + (to[0] - p0[0]) * e, TABLE_Y + hop, p0[2] + (to[2] - p0[2]) * e]} r={(1 - e) * (k % 2 ? 0.3 : -0.25)} />;
          })
        : null}
      {/* a high stool for the second man */}
      <group position={[1.15, 0, -0.95]}>
        <M g={cylG(0.18, 0.18, 0.05, 16)} c="#8a5a3a" tex="wood" p={[0, 0.72, 0]} />
        {[0, 1, 2].map((i) => (
          <M key={i} g={cylG(0.02, 0.025, 0.72, 8)} c="#6a4430" tex="wood" p={[Math.cos(i * 2.1) * 0.13, 0.36, Math.sin(i * 2.1) * 0.13]} />
        ))}
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ the other map company's office (x = 40)
export const RivalOffice: React.FC = () => (
  <group position={[RIVAL_X, 0, 0]}>
    <M g={boxG(7, 0.1, 7)} c="#4a4a5a" tex="planks" p={[0, -0.05, 0]} cast={false} />
    <M g={boxG(7, 3.4, 0.2)} c="#7a94a8" tex="plaster" p={[0, 1.7, -2.7]} cast={false} />
    <M g={boxG(7, 1.0, 0.06)} c="#3a4a5a" tex="planks" p={[0, 0.5, -2.57]} cast={false} />
    <M g={boxG(0.2, 3.4, 7)} c="#6a8498" tex="plaster" p={[-3.2, 1.7, 0.6]} cast={false} />
    <M g={boxG(0.2, 3.4, 7)} c="#6a8498" tex="plaster" p={[3.2, 1.7, 0.6]} cast={false} />
    <M g={boxG(7, 0.12, 7)} c="#d8e0e8" tex="plaster" p={[0, 3.46, 0.6]} cast={false} />
    <Window p={[-1.3, 1.8, -2.585]} w={1.1} h={1.4} sky="#cfe8ff" frame="#e0e4ea" />
    {/* a big framed road map and a wall clock */}
    <group position={[1.1, 1.9, -2.585]}>
      <M g={boxG(1.3, 0.9, 0.04)} c="#2a2e38" tex="wood" />
      <M g={boxG(1.18, 0.78, 0.02)} c="#e4eef0" tex="paper" p={[0, 0, 0.022]} />
      <M g={boxG(0.9, 0.03, 0.01)} c="#3a6ac8" p={[0, 0.1, 0.034]} r={[0, 0, -0.2]} />
      <M g={boxG(0.03, 0.6, 0.01)} c="#3a6ac8" p={[-0.2, 0, 0.034]} r={[0, 0, 0.3]} />
    </group>
    <group position={[2.4, 2.5, -2.585]}>
      <M g={cylG(0.2, 0.2, 0.05, 24)} c="#f4f0e4" r={[PI / 2, 0, 0]} p={[0, 0, 0.02]} />
      <M g={torG(0.2, 0.02)} c="#2a2e38" tex="metal" p={[0, 0, 0.04]} />
      <M g={boxG(0.015, 0.14, 0.01)} c="#1a1a22" p={[0, 0.05, 0.05]} />
      <M g={boxG(0.1, 0.015, 0.01)} c="#1a1a22" p={[0.04, 0, 0.05]} />
    </group>
    {/* the desk */}
    <M g={boxG(1.7, 0.06, 0.85)} c="#5a3424" tex="wood" p={[0, 0.76, 0]} />
    <M g={boxG(0.5, 0.7, 0.8)} c="#4a2a1c" tex="wood" p={[-0.58, 0.37, 0]} />
    <M g={boxG(0.5, 0.7, 0.8)} c="#4a2a1c" tex="wood" p={[0.58, 0.37, 0]} />
    <M g={boxG(1.2, 0.012, 0.5)} c="#2a5a3a" tex="fabric" p={[0, 0.796, 0.0]} />
    <MapSheet rival c={[0.05, 0.806, 0.05]} />
    <group position={[-0.62, 0.79, -0.22]}>
      <M g={boxG(0.16, 0.2, 0.02)} c="#c8a040" tex="metal" p={[0, 0.1, 0]} r={[-0.2, 0.3, 0]} />
      <M g={boxG(0.13, 0.16, 0.022)} c="#6a5a4a" p={[0, 0.1, 0.004]} r={[-0.2, 0.3, 0]} />
    </group>
    <M g={cylG(0.05, 0.05, 0.03, 16)} c="#1a1a22" p={[0.66, 0.805, -0.25]} />
    <M g={cylG(0.012, 0.012, 0.16, 8)} c="#c8a040" tex="metal" p={[0.66, 0.88, -0.25]} r={[0.3, 0, 0]} />
    {/* a tall bookcase, a plant, a chair */}
    <group position={[-2.5, 0, -2.25]}>
      <M g={boxG(1.0, 2.4, 0.36)} c="#3a2a22" tex="wood" p={[0, 1.2, 0]} />
      {[0.6, 1.2, 1.8].map((y, k) =>
        ["#8a2a2a", "#2a3a6a", "#d8c8a0", "#2a5a4a", "#6a4a2a", "#1a1a2a"].map((c, i) => <Book key={`${k}${i}`} p={[-0.36 + i * 0.12, y + 0.02, 0.04]} c={c} h={0.26 + ((i * 5 + k) % 3) * 0.04} />),
      )}
    </group>
    <group position={[2.5, 0, -1.6]}>
      <M g={cylG(0.22, 0.17, 0.42, 16)} c="#a85a3a" tex="brick" p={[0, 0.21, 0]} />
      <M g={sphG(0.32, 14)} c="#3a7a3a" p={[0, 0.72, 0]} />
      <M g={sphG(0.24, 12)} c="#4a9a4a" p={[0.16, 0.98, 0.06]} />
    </group>
    <group position={[0, 0, -1.15]}>
      <M g={boxG(0.56, 0.08, 0.5)} c="#7a2a2a" tex="fabric" p={[0, 0.5, 0]} />
      <M g={boxG(0.56, 0.75, 0.08)} c="#7a2a2a" tex="fabric" p={[0, 0.95, -0.25]} />
    </group>
  </group>
);

// ------------------------------------------------------------------ the crossroads (x = 100)
const Tree: React.FC<{ p: V3; s?: number; kind?: number }> = ({ p, s = 1, kind = 0 }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.14, 0.2, 1.6, 10)} c="#6a4a32" tex="wood" p={[0, 0.8, 0]} />
    {kind ? (
      <>
        <M g={coneG(1.1, 1.8, 14)} c="#2f6a3a" p={[0, 2.1, 0]} />
        <M g={coneG(0.85, 1.5, 14)} c="#3a7a42" p={[0, 2.9, 0]} />
      </>
    ) : (
      <>
        <M g={sphG(1.0, 16)} c="#4a8a3a" p={[0, 2.3, 0]} />
        <M g={sphG(0.75, 14)} c="#5a9a42" p={[0.55, 2.8, 0.2]} />
        <M g={sphG(0.7, 14)} c="#3f7e36" p={[-0.5, 2.6, -0.3]} />
      </>
    )}
  </group>
);
const FenceRun: React.FC<{ a: V3; b: V3; n: number }> = ({ a, b, n }) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const L = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);
  return (
    <group position={a} rotation={[0, yaw, 0]}>
      {Array.from({ length: n + 1 }, (_, i) => (
        <M key={i} g={boxG(0.1, 1.0, 0.1)} c="#8a6a4a" tex="wood" p={[(L * i) / n, 0.5, 0]} />
      ))}
      {[0.4, 0.78].map((y) => (
        <M key={y} g={boxG(L, 0.07, 0.04)} c="#a07a52" tex="wood" p={[L / 2, y, 0.07]} />
      ))}
    </group>
  );
};
const Bale: React.FC<{ p: V3; r?: number }> = ({ p, r = 0 }) => <M g={cylG(0.55, 0.55, 1.1, 18)} c="#d8b060" tex="sand" p={[p[0], 0.55, p[2]]} r={[0, r, PI / 2]} />;
const Barn: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(8, 5, 6)} c="#b03a2e" tex="planks" p={[0, 2.5, 0]} />
    {[-1, 1].map((s) => (
      <M key={s} g={boxG(0.3, 4.6, 6.4)} c="#4a4a52" tex="shingles" p={[s * 2.0, 6.0, 0]} r={[0, 0, -s * 0.9]} />
    ))}
    <M g={boxG(2.4, 3, 0.1)} c="#f0e8d8" tex="planks" p={[0, 1.5, 3.02]} />
  </group>
);
export const STORE_P: V3 = [FX + 4.6, 0, -5.4];
/** the general store: s 0 = nothing, then foundation and frame, walls, roof, porch, sign */
export const Store: React.FC<{ s: number }> = ({ s }) => {
  if (s <= 0) return null;
  const k = (a: number) => pop(clamp((s - a) / 0.16));
  const W = 5;
  const D = 4;
  const H = 3.0;
  return (
    <group position={STORE_P}>
      <M g={boxG(W + 0.3, 0.3, D + 0.3)} c="#8a8290" tex="stone" p={[0, 0.15, 0]} />
      {k(0.1) > 0
        ? [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]].map(([x, z], i) => (
            <M key={i} g={boxG(0.16, H * k(0.1 + i * 0.02), 0.16)} c="#c8a070" tex="wood" p={[(x * (W - 0.2)) / 2, 0.3 + (H * k(0.1 + i * 0.02)) / 2, (z * (D - 0.2)) / 2]} />
          ))
        : null}
      {k(0.35) > 0 ? (
        <group scale={[1, k(0.35), 1]} position={[0, 0.3, 0]}>
          <M g={boxG(W, H, D)} c="#e8d8b0" tex="planks" p={[0, H / 2, 0]} />
          {/* front: door, two windows with goods */}
          <M g={boxG(0.95, 2.1, 0.06)} c="#5a7a5a" tex="planks" p={[0, 1.05, D / 2 + 0.03]} />
          <M g={sphG(0.04, 8)} c="#c8a040" tex="metal" p={[0.34, 1.05, D / 2 + 0.08]} />
          {[-1.6, 1.6].map((x) => (
            <group key={x} position={[x, 1.5, D / 2 + 0.011]}>
              <mesh geometry={boxG(1.1, 1.0, 0.02)} material={coreMat("#ffd890", 0.75)} />
              <M g={boxG(1.22, 0.08, 0.06)} c="#f4ecd8" p={[0, 0.54, 0.02]} />
              <M g={boxG(1.22, 0.08, 0.06)} c="#f4ecd8" p={[0, -0.54, 0.02]} />
              <M g={boxG(0.08, 1.0, 0.06)} c="#f4ecd8" p={[-0.57, 0, 0.02]} />
              <M g={boxG(0.08, 1.0, 0.06)} c="#f4ecd8" p={[0.57, 0, 0.02]} />
              {[-0.3, 0, 0.3].map((gx, i) => (
                <M key={i} g={cylG(0.08, 0.08, 0.22, 10)} c={["#c83a2e", "#3a6ac8", "#e8b830"][i]} p={[gx, -0.36, -0.08]} />
              ))}
            </group>
          ))}
        </group>
      ) : null}
      {k(0.6) > 0 ? (
        <group position={[0, 0.3 + H, 0]} scale={[1, k(0.6), 1]}>
          {[-1, 1].map((z) => (
            <M key={z} g={boxG(W + 0.5, 0.12, D * 0.6)} c="#6a4a3a" tex="shingles" p={[0, 0.55, z * D * 0.24]} r={[z * 0.5, 0, 0]} />
          ))}
          <M g={boxG(W - 0.02, 1.0, D * 0.9)} c="#e8d8b0" tex="planks" p={[0, 0.3, 0]} s={[1, 0.6, 0.6]} />
          {/* the false front with the sign board */}
          <M g={boxG(W + 0.2, 1.8, 0.14)} c="#e0cea0" tex="planks" p={[0, 0.75, D / 2 + 0.1]} />
        </group>
      ) : null}
      {k(0.78) > 0 ? (
        <group scale={[1, k(0.78), 1]}>
          {/* the porch: deck, posts, roof */}
          <M g={boxG(W + 0.4, 0.22, 1.4)} c="#9a7048" tex="planks" p={[0, 0.2, D / 2 + 0.7]} />
          {[-2.4, -0.9, 0.9, 2.4].map((x) => (
            <M key={x} g={boxG(0.12, 2.5, 0.12)} c="#f0e6d0" tex="wood" p={[x, 1.55, D / 2 + 1.3]} />
          ))}
          <M g={boxG(W + 0.6, 0.1, 1.6)} c="#7a5a44" tex="shingles" p={[0, 2.84, D / 2 + 0.75]} r={[-0.2, 0, 0]} />
        </group>
      ) : null}
      {k(0.9) > 0 ? (
        <group position={[0, 0.3 + H + 0.95, D / 2 + 0.18]} scale={k(0.9)}>
          <M g={boxG(4.2, 0.9, 0.06)} c="#2a3a5a" tex="wood" />
          <Label text="AGLOE" p={[0, 0.15, 0.035]} w={3.8} h={0.5} fg="#f4e2a8" bg="none" font={0.95} />
          <Label text="GENERAL STORE" p={[0, -0.25, 0.035]} w={3.6} h={0.28} fg="#f4ead6" bg="none" font={0.9} />
        </group>
      ) : null}
      {k(0.95) > 0 ? (
        <group scale={k(0.95)}>
          <M g={cylG(0.32, 0.3, 0.85, 16)} c="#b8743a" tex="wood" p={[-2.0, 0.74, D / 2 + 0.85]} />
          <M g={boxG(0.5, 0.5, 0.5)} c="#c8945a" tex="planks" p={[1.9, 0.56, D / 2 + 0.8]} r={[0, 0.3, 0]} />
          <M g={boxG(0.4, 0.4, 0.4)} c="#c8945a" tex="planks" p={[1.95, 1.0, D / 2 + 0.8]} r={[0, -0.2, 0]} />
          {/* a gas pump by the road */}
          <group position={[-2.85, 0, D / 2 + 1.2]}>
            <M g={boxG(0.5, 0.2, 0.5)} c="#8a8290" tex="stone" p={[0, 0.1, 0]} />
            <M g={cylG(0.2, 0.22, 1.8, 16)} c="#c83a2e" tex="metal" p={[0, 1.1, 0]} />
            <mesh geometry={sphG(0.2, 16)} material={coreMat("#fff0c8", 0.9)} position={[0, 2.18, 0]} />
          </group>
        </group>
      ) : null}
    </group>
  );
};
/** what is left of the store: the stone footing, a broken post, weeds */
const StoreGone: React.FC = () => (
  <group position={STORE_P}>
    {Array.from({ length: 14 }, (_, i) => {
      const a = i / 14;
      const x = a < 0.5 ? -2.6 + a * 2 * 5.2 : 2.6 - (a - 0.5) * 2 * 5.2;
      const z = a < 0.5 ? -2.1 : 2.1;
      return <M key={i} g={boxG(0.5, 0.22, 0.3)} c={i % 3 ? "#8a8290" : "#7a7280"} tex="stone" p={[x, 0.08, z]} r={[0, (i % 4) * 0.2, 0.05 * (i % 3)]} />;
    })}
    <M g={boxG(0.16, 1.1, 0.16)} c="#7a6248" tex="wood" p={[-2.4, 0.55, 2.0]} r={[0, 0, 0.12]} />
    {Array.from({ length: 10 }, (_, i) => (
      <M key={i} g={coneG(0.12, 0.5 + (i % 3) * 0.2, 6)} c={i % 2 ? "#5a8a3a" : "#6a9a42"} p={[-2 + (i * 0.47) % 4.2, 0.25, -1.4 + ((i * 1.3) % 2.8)]} />
    ))}
  </group>
);
export const SIGN_P: V3 = [FX - 2.8, 0, -2.7];
const TownSign: React.FC<{ s: number }> = ({ s }) =>
  s > 0 ? (
    <group position={SIGN_P} scale={[1, pop(s), 1]}>
      <M g={boxG(0.12, 2.2, 0.12)} c="#e8e0d0" tex="wood" p={[0, 1.1, 0]} />
      <M g={boxG(1.5, 0.45, 0.06)} c="#1f4a3a" tex="wood" p={[0, 1.95, 0.08]} />
      <Label text="AGLOE" p={[0, 1.95, 0.115]} w={1.36} h={0.36} fg="#f4ead6" bg="none" font={0.9} />
    </group>
  ) : null;
/** a 1930s sedan, nose toward +x; `d` = distance driven (spins the wheels) */
export const Car: React.FC<{ p: V3; d?: number; yaw?: number }> = ({ p, d = 0, yaw = 0 }) => {
  const spin = -d / 0.36;
  const body = "#2a5a4a";
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <M g={boxG(3.2, 0.7, 1.5)} c={body} tex="metal" p={[0.1, 0.75, 0]} />
      <M g={boxG(1.9, 0.75, 1.42)} c={body} tex="metal" p={[-0.35, 1.45, 0]} />
      {/* dark side windows and a windshield */}
      {[-1, 1].map((z) => (
        <mesh key={z} geometry={boxG(1.6, 0.48, 0.02)} material={coreMat("#2a3a5a", 0.8)} position={[-0.35, 1.5, z * 0.72]} />
      ))}
      <mesh geometry={boxG(0.02, 0.5, 1.2)} material={coreMat("#3a4a6a", 0.85)} position={[0.61, 1.5, 0]} />
      <M g={boxG(1.95, 0.06, 1.46)} c="#1e3a32" p={[-0.35, 1.85, 0]} />
      {/* hood grille, round headlights, bumpers, running boards, fenders */}
      <M g={boxG(0.06, 0.62, 0.8)} c="#c8c8d0" tex="metal" p={[1.72, 0.82, 0]} />
      {[-0.55, 0.55].map((z) => (
        <group key={z} position={[1.82, 1.02, z]}>
          <M g={cylG(0.13, 0.13, 0.12, 16)} c="#c8c8d0" tex="metal" r={[0, 0, PI / 2]} />
          <mesh geometry={cylG(0.1, 0.1, 0.02, 16)} material={coreMat("#fff4d0", 0.9)} position={[0.065, 0, 0]} rotation={[0, 0, PI / 2]} />
        </group>
      ))}
      {[1.95, -1.6].map((x) => (
        <M key={x} g={boxG(0.08, 0.1, 1.7)} c="#c8c8d0" tex="metal" p={[x, 0.45, 0]} />
      ))}
      {[-1, 1].map((z) => (
        <M key={z} g={boxG(1.6, 0.06, 0.24)} c="#1a1a22" p={[-0.05, 0.42, z * 0.87]} />
      ))}
      {[
        [1.15, -1], [1.15, 1], [-1.0, -1], [-1.0, 1],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.36, z * 0.74]}>
          <M g={cylG(0.5, 0.5, 0.32, 20, false, 0, PI)} c="#1e3a32" tex="metal" r={[PI / 2, 0, PI / 2]} p={[0, 0.1, 0]} s={[1, 1, 1]} />
          <group rotation={[0, 0, spin]}>
            <M g={cylG(0.36, 0.36, 0.22, 20)} c="#1a1a1e" r={[PI / 2, 0, 0]} />
            <M g={cylG(0.2, 0.2, 0.24, 14)} c="#c8a040" tex="metal" r={[PI / 2, 0, 0]} />
            <M g={boxG(0.05, 0.36, 0.25)} c="#8a6a2a" />
          </group>
        </group>
      ))}
      <M g={cylG(0.34, 0.34, 0.14, 18)} c="#1a1a1e" p={[-1.75, 0.95, 0]} r={[0, 0, PI / 2]} />
    </group>
  );
};
export type FieldState = { store: number; gone?: boolean; sign?: number; car?: { p: V3; d: number; yaw?: number } | null; lumber?: boolean };
export const Field: React.FC<{ s: FieldState }> = ({ s }) => (
  <group>
    <M g={boxG(400, 0.2, 400)} c="#6a9a4a" tex="grass" ts={1.4} p={[FX, -0.1, 0]} cast={false} />
    <M g={boxG(300, 0.02, 3.6)} c="#b8946a" tex="sand" p={[FX, 0.01, 0]} cast={false} />
    <M g={boxG(3.2, 0.03, 300)} c="#b08c62" tex="sand" p={[FX, 0.015, 0]} cast={false} />
    {/* distant hills, a barn, a farmhouse, tree lines */}
    {[[-60, -120, 60], [30, -140, 70], [110, -110, 50], [-120, -60, 50], [160, -40, 60]].map(([x, z, r], i) => (
      <M key={i} g={sphG(r, 32)} c={i % 2 ? "#5a8a46" : "#68984e"} p={[FX + x, -r * 0.78, z]} s={[1.6, 1, 1]} cast={false} />
    ))}
    <Barn p={[FX - 26, 0, -34]} yaw={0.3} />
    <group position={[FX + 30, 0, -42]} rotation={[0, -0.3, 0]}>
      <M g={boxG(7, 4.4, 5)} c="#f0e6d0" tex="planks" p={[0, 2.2, 0]} />
      {[-1, 1].map((z) => (
        <M key={z} g={boxG(7.6, 0.2, 3.4)} c="#4a4a6a" tex="shingles" p={[0, 5.0, z * 1.35]} r={[z * 0.6, 0, 0]} />
      ))}
    </group>
    {[-40, -31, -22, -14, 18, 26, 34, 45, 55].map((x, i) => (
      <Tree key={i} p={[FX + x, 0, -14 - (i % 3) * 3]} s={1.2 + (i % 3) * 0.25} kind={i % 2} />
    ))}
    {[-36, -24, 14, 24, 38].map((x, i) => (
      <Tree key={`b${i}`} p={[FX + x, 0, 12 + (i % 2) * 4]} s={1.3 + (i % 2) * 0.3} kind={(i + 1) % 2} />
    ))}
    <Tree p={[FX + 9.5, 0, -9.5]} s={1.5} />
    <Tree p={[FX - 9, 0, 7]} s={1.4} kind={1} />
    {/* fences along the roads, telephone poles, hay bales, a mailbox */}
    <FenceRun a={[FX - 40, 0, -3.2]} b={[FX - 3.4, 0, -3.2]} n={12} />
    <FenceRun a={[FX - 40, 0, 3.2]} b={[FX - 3.4, 0, 3.2]} n={12} />
    <FenceRun a={[FX + 3.4, 0, 3.2]} b={[FX + 40, 0, 3.2]} n={12} />
    <FenceRun a={[FX + 12, 0, -3.2]} b={[FX + 40, 0, -3.2]} n={9} />
    {[-48, -34, -20, -6, 8, 22, 36].map((x) => (
      <group key={x} position={[FX + x, 0, -4.4]}>
        <M g={cylG(0.1, 0.13, 6.5, 8)} c="#6a5038" tex="wood" p={[0, 3.25, 0]} />
        <M g={boxG(0.08, 0.1, 1.4)} c="#6a5038" tex="wood" p={[0, 6.1, 0]} />
      </group>
    ))}
    {[[FX - 14, 9], [FX - 11, 11], [FX + 16, -9]].map(([x, z], i) => (
      <Bale key={i} p={[x, 0, z]} r={i * 0.6} />
    ))}
    <group position={[FX + 3.0, 0, 2.6]}>
      <M g={boxG(0.08, 1.1, 0.08)} c="#6a5038" tex="wood" p={[0, 0.55, 0]} />
      <M g={boxG(0.4, 0.22, 0.22)} c="#5a6a7a" tex="metal" p={[0, 1.2, 0]} />
    </group>
    {s.lumber ? (
      <group position={[FX + 8.2, 0, -2.6]}>
        {[0, 1, 2, 3].map((i) => (
          <M key={i} g={boxG(2.4, 0.12, 0.2)} c="#d0a870" tex="wood" p={[0, 0.06 + Math.floor(i / 2) * 0.12, (i % 2) * 0.22]} />
        ))}
      </group>
    ) : null}
    {s.gone ? <StoreGone /> : <Store s={s.store} />}
    <TownSign s={s.sign ?? 0} />
    {s.car ? <Car p={s.car.p} d={s.car.d} yaw={s.car.yaw} /> : null}
  </group>
);
void toonMaterial;
