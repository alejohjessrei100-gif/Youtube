// The Chess Crow short's world: a small park plaza (grass, a paved circle, a path), one stone chess table with two
// stools, a big tree to hide behind, hedges, benches, lampposts, a ring of background trees. The board is 64 square
// tiles of equal height (no base under them: nothing coplanar to z-fight on a phone GPU). Pieces are simple
// turned shapes. The crow is the gull rig with a crow palette.
import React from "react";
import { boxG, coneG, cylG, M, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { layoutOf } from "../inkbeat/char/skeleton";
import { ANKLE_Y } from "../inkbeat/char/family";
import type { Build } from "../inkbeat/char/Character3D";
import { Gull } from "../gull/world";
import type { BirdPal, GullState } from "../gull/world";
export { Flashlight } from "../museum/world";

const PI = Math.PI;
const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ dimensions
export const TABLE_H = 0.62; // tabletop surface
export const TABLE_HW = 0.55; // half width of the square stone top
export const SQ = 0.065; // board square
export const BOARD_Y = TABLE_H + 0.016; // top of the board tiles
/** square centre: rank r (0..7) runs along +x (white at -x, Okafor's side), file f (0..7) along +z */
export const sqAt = (r: number, f: number): V3 => [(r - 3.5) * SQ, BOARD_Y, (f - 3.5) * SQ];
/** Okafor's stool (white side) and the empty one (black side) */
export const SEAT_W: V3 = [-0.78, 0, 0];
export const SEAT_B: V3 = [0.78, 0, 0];
/** seated geometry for a character: the seat top under the hips, and how far forward the feet sit */
export const sitGeom = (height: number, build?: Partial<Build>) => {
  const l = layoutOf(build);
  const thigh = (l.hipY - ANKLE_Y) * 0.5;
  return { seatTop: (l.hipY - thigh) * height - 0.05 * height, feetFwd: thigh * 0.9 * height };
};
export const TREE: V3 = [-3.3, 0, 2.2];
export const TREE_R = 0.34;
export const STAFF_SPOT: V3 = [4.2, 0, -3.2];
export const KIDS_SPOT: V3 = [-4.6, 0, -2.8];
export const LAMPS: V3[] = [[2.6, 0, 2.8], [-2.4, 0, -3.4]];
export const BENCHES: { p: V3; yaw: number }[] = [{ p: [0.4, 0, -4.4], yaw: 0 }, { p: [4.8, 0, 2.4], yaw: -PI / 2 - 0.3 }];
/** where the crow stands: on the tabletop, black's side, facing the board (-x) */
export const CROW_SPOT: V3 = [0.43, TABLE_H, -0.02];

// ------------------------------------------------------------------ pieces
export type PieceKind = "p" | "r" | "n" | "b" | "q" | "k";
export type Piece = { id: string; kind: PieceKind; white: boolean; p: V3; tip?: number; ry?: number; op?: number };
const WHITE = "#f2ece0";
const BLACK = "#2c2834";
export const PieceM: React.FC<{ pc: Piece }> = ({ pc }) => {
  const c = pc.white ? WHITE : BLACK;
  // a toppled king pivots on the edge of its base
  const tip = pc.tip ?? 0;
  return (
    <group position={pc.p} rotation={[0, pc.ry ?? (pc.white ? PI / 2 : -PI / 2), 0]}>
      <group position={[0, 0.02 * Math.sin(tip), 0]} rotation={[tip, 0, 0]}>
        <group>
          <M g={cylG(0.019, 0.022, 0.012, 16)} c={c} p={[0, 0.006, 0]} />
          {pc.kind === "p" ? (
            <>
              <M g={cylG(0.009, 0.015, 0.026, 12)} c={c} p={[0, 0.025, 0]} />
              <M g={sphG(0.012, 12)} c={c} p={[0, 0.042, 0]} />
            </>
          ) : pc.kind === "r" ? (
            <>
              <M g={cylG(0.014, 0.016, 0.04, 12)} c={c} p={[0, 0.032, 0]} />
              <M g={cylG(0.018, 0.016, 0.012, 12)} c={c} p={[0, 0.054, 0]} />
            </>
          ) : pc.kind === "n" ? (
            <>
              <M g={cylG(0.012, 0.016, 0.03, 12)} c={c} p={[0, 0.027, 0]} />
              <M g={boxG(0.018, 0.034, 0.03)} c={c} p={[0, 0.052, 0.004]} r={[-0.35, 0, 0]} />
              <M g={boxG(0.016, 0.014, 0.026)} c={c} p={[0, 0.058, 0.02]} />
              <M g={coneG(0.006, 0.014, 4)} c={c} p={[0, 0.073, -0.002]} />
            </>
          ) : pc.kind === "b" ? (
            <>
              <M g={cylG(0.008, 0.016, 0.045, 12)} c={c} p={[0, 0.034, 0]} />
              <M g={sphG(0.013, 12)} c={c} s={[1, 1.35, 1]} p={[0, 0.062, 0]} />
              <M g={sphG(0.004, 6)} c={c} p={[0, 0.08, 0]} />
            </>
          ) : pc.kind === "q" ? (
            <>
              <M g={cylG(0.009, 0.017, 0.058, 12)} c={c} p={[0, 0.04, 0]} />
              <M g={cylG(0.016, 0.01, 0.014, 12)} c={c} p={[0, 0.075, 0]} />
              <M g={sphG(0.006, 8)} c={c} p={[0, 0.087, 0]} />
            </>
          ) : (
            <>
              <M g={cylG(0.01, 0.018, 0.064, 12)} c={c} p={[0, 0.043, 0]} />
              <M g={cylG(0.016, 0.011, 0.014, 12)} c={c} p={[0, 0.081, 0]} />
              <M g={boxG(0.005, 0.02, 0.005)} c={c} p={[0, 0.097, 0]} />
              <M g={boxG(0.014, 0.005, 0.005)} c={c} p={[0, 0.1, 0]} />
            </>
          )}
        </group>
      </group>
    </group>
  );
};
void h1;

// ------------------------------------------------------------------ the table and stools
const STONE = "#b8b0a2";
const STONE_D = "#8e8676";
const SQ_L = "#e8dcc0";
const SQ_D = "#5a7a5a";
const Board: React.FC = () => (
  <group>
    {Array.from({ length: 64 }, (_, i) => {
      const r = i % 8;
      const f = Math.floor(i / 8);
      const c = sqAt(r, f);
      return <M key={i} g={boxG(SQ, 0.014, SQ)} c={(r + f) % 2 === 0 ? SQ_D : SQ_L} p={[c[0], BOARD_Y - 0.007, c[2]]} cast={false} />;
    })}
  </group>
);
export const Stool: React.FC<{ p: V3; top: number }> = ({ p, top }) => (
  <group position={p}>
    <M g={cylG(0.11, 0.15, top - 0.06, 18)} c={STONE_D} p={[0, (top - 0.06) / 2, 0]} />
    <M g={cylG(0.17, 0.16, 0.06, 20)} c={STONE} p={[0, top - 0.03, 0]} />
  </group>
);
export const Table: React.FC<{ seatTop: number }> = ({ seatTop }) => (
  <group>
    <M g={cylG(0.32, 0.36, 0.06, 20)} c={STONE_D} p={[0, 0.03, 0]} />
    <M g={cylG(0.13, 0.17, TABLE_H - 0.12, 18)} c={STONE_D} p={[0, 0.06 + (TABLE_H - 0.12) / 2, 0]} />
    <M g={boxG(TABLE_HW * 2, 0.06, TABLE_HW * 2)} c={STONE} p={[0, TABLE_H - 0.03, 0]} />
    {/* a darker frame round the board, its top 4 mm below the tiles' top (only the tiles sit above it) */}
    <M g={boxG(SQ * 8 + 0.05, 0.012, SQ * 8 + 0.05)} c="#6e5a44" p={[0, TABLE_H + 0.006, 0]} cast={false} />
    <Board />
    <Stool p={SEAT_W} top={seatTop} />
    <Stool p={SEAT_B} top={seatTop} />
  </group>
);

// ------------------------------------------------------------------ park dressing
const Tree: React.FC<{ p: V3; s?: number; seed: number }> = ({ p, s = 1, seed }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.24, 0.36, 2.6, 14)} c="#6a4a32" p={[0, 1.3, 0]} />
    {[0, 1, 2, 3, 4].map((i) => (
      <M key={i} g={sphG(1, 16)} c={i % 2 ? "#4e8a3e" : "#5e9a46"} p={[Math.sin(i * 2.4 + seed) * 0.9, 3.1 + (i % 3) * 0.45, Math.cos(i * 2.4 + seed) * 0.9]} s={1.05 + 0.2 * h1(seed + i)} cast={false} />
    ))}
  </group>
);
const Lamp: React.FC<{ p: V3; on: number }> = ({ p, on }) => (
  <group position={p}>
    <M g={cylG(0.05, 0.07, 3.2, 10)} c="#2e3440" p={[0, 1.6, 0]} />
    <M g={cylG(0.16, 0.12, 0.3, 10)} c="#2e3440" p={[0, 3.32, 0]} />
    <mesh geometry={sphG(0.11, 12)} position={[0, 3.18, 0]}>
      <meshBasicMaterial color={on > 0.5 ? "#ffe2a0" : "#d8d4c8"} toneMapped={false} />
    </mesh>
  </group>
);
const Bench: React.FC<{ p: V3; yaw: number }> = ({ p, yaw }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    {[-0.7, 0.7].map((x) => (
      <M key={x} g={boxG(0.08, 0.45, 0.42)} c="#3a3a42" p={[x, 0.225, 0]} />
    ))}
    <M g={boxG(1.7, 0.06, 0.44)} c="#9a6a3e" p={[0, 0.48, 0]} />
    <M g={boxG(1.7, 0.3, 0.05)} c="#9a6a3e" p={[0, 0.8, -0.22]} />
  </group>
);
export type ParkState = { t: number; lampOn: number };
export const Park: React.FC<{ s: ParkState; seatTop: number }> = ({ s, seatTop }) => (
  <group>
    {/* grass, then a paved circle 3 cm above it and the path 3 cm above the grass too (no coplanar faces) */}
    <M g={cylG(60, 60, 0.1, 48)} c="#6aa04c" p={[0, -0.05, 0]} cast={false} />
    <M g={cylG(3.4, 3.4, 0.03, 48)} c="#cfc6b4" p={[0, 0.015, 0]} cast={false} />
    <M g={boxG(2.0, 0.02, 30)} c="#cfc6b4" p={[0, 0.01, -16]} cast={false} />
    <M g={boxG(30, 0.018, 1.8)} c="#cfc6b4" p={[-16, 0.009, 0.0]} cast={false} />
    <Table seatTop={seatTop} />
    <Tree p={TREE} seed={1} />
    {[[-9, -7, 3], [-12, 4, 5], [8, -9, 7], [11, 3, 9], [2, -14, 11], [-5, 12, 13], [7, 11, 15], [-15, -12, 17], [14, -2, 19]].map(([x, z, sd]) => (
      <Tree key={sd} p={[x, 0, z]} s={1.1 + 0.3 * h1(sd)} seed={sd} />
    ))}
    {[[-6.5, -5.5, 4, 0.3], [6.5, -6, 4, -0.4], [6, 6.5, 4, 0.5]].map(([x, z, w, r], i) => (
      <M key={i} g={boxG(w, 0.9, 0.8)} c="#4a7e3a" p={[x, 0.45, z]} r={[0, r, 0]} />
    ))}
    {LAMPS.map((p, i) => (
      <Lamp key={i} p={p} on={s.lampOn} />
    ))}
    {BENCHES.map((b, i) => (
      <Bench key={i} p={b.p} yaw={b.yaw} />
    ))}
  </group>
);

// ------------------------------------------------------------------ the crow
export const CROW_PAL: BirdPal = { body: "#2e3040", tail: "#262836", wing: "#3a3e52", tip: "#1c1d28", head: "#34364a", brow: "#14141c", beak: "#3c3c44", beak2: "#33333a", spot: "#33333a", leg: "#2a2a30" };
export const Crow: React.FC<{ g: GullState }> = ({ g }) => <Gull g={g} pal={CROW_PAL} />;

/** the flashlight prop held in a hand: a body along its aim, a lens at the front */
export const Torch: React.FC<{ p: V3; yaw: number; pitch?: number }> = ({ p, yaw, pitch = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <group rotation={[-pitch, 0, 0]}>
      <M g={cylG(0.022, 0.02, 0.17, 12)} c="#c83a2e" p={[0, 0, 0.03]} r={[PI / 2, 0, 0]} />
      <M g={cylG(0.032, 0.022, 0.05, 12)} c="#2a2a30" p={[0, 0, 0.13]} r={[PI / 2, 0, 0]} />
    </group>
  </group>
);
