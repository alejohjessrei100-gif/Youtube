// Extra sets for the Maple Street film: the patrol car (light bar flashing), and Walt's kitchen (an interior set
// placed away from the street at KITCHEN). Every flat surface is a separate solid with a >= 2 cm gap.
import React from "react";
import { boxG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

const PI = Math.PI;
export const PoliceCar: React.FC<{ p: V3; yaw: number; t: number }> = ({ p, yaw, t }) => {
  const blink = Math.floor(t * 4) % 2;
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <M g={boxG(1.8, 0.6, 4.4)} c="#f2f2f4" p={[0, 0.65, 0]} />
      <M g={boxG(1.82, 0.22, 4.42)} c="#1e2a4a" p={[0, 0.62, 0]} />
      <M g={boxG(1.6, 0.55, 2.2)} c="#f2f2f4" p={[0, 1.2, -0.2]} />
      <M g={boxG(1.5, 0.42, 0.04)} c="#2a3440" p={[0, 1.22, 0.92]} />
      <M g={boxG(1.5, 0.42, 0.04)} c="#2a3440" p={[0, 1.22, -1.32]} />
      {[-1, 1].map((sd) => (
        <M key={sd} g={boxG(0.04, 0.4, 1.9)} c="#2a3440" p={[sd * 0.81, 1.22, -0.2]} />
      ))}
      <Label text="POLICE" p={[0.92, 0.66, 0]} r={[0, PI / 2, 0]} w={1.4} h={0.22} fg="#ffffff" bg="none" />
      <Label text="POLICE" p={[-0.92, 0.66, 0]} r={[0, -PI / 2, 0]} w={1.4} h={0.22} fg="#ffffff" bg="none" />
      <M g={boxG(1.1, 0.06, 0.3)} c="#2a2a30" p={[0, 1.51, -0.2]} />
      <mesh geometry={boxG(0.5, 0.12, 0.26)} position={[-0.27, 1.6, -0.2]} material={coreMat("#ff2a2a", blink ? 3 : 0.5)} userData={{ outline: false }} />
      <mesh geometry={boxG(0.5, 0.12, 0.26)} position={[0.27, 1.6, -0.2]} material={coreMat("#2a6aff", blink ? 0.5 : 3)} userData={{ outline: false }} />
      <pointLight position={[0, 1.9, -0.2]} color={blink ? "#ff4040" : "#4070ff"} intensity={3} distance={6} decay={1.6} />
      {[[-0.82, 1.4], [0.82, 1.4], [-0.82, -1.4], [0.82, -1.4]].map(([x, z], i) => (
        <group key={i} position={[x, 0.36, z]}>
          <M g={cylG(0.36, 0.36, 0.24, 16)} c="#1e1e22" r={[0, 0, PI / 2]} />
          <M g={cylG(0.2, 0.2, 0.26, 12)} c="#a8acb4" r={[0, 0, PI / 2]} />
        </group>
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} geometry={sphG(0.08, 8)} position={[x, 0.75, 2.21]} material={coreMat("#fff4d0", 1.2)} userData={{ outline: false }} />
      ))}
    </group>
  );
};
// ------------------------------------------------------------------ Walt's kitchen (interior), origin at KITCHEN; room x -3..3, z -2.5..2.5, door on the +x wall
export const KITCHEN: V3 = [60, 0, 0];
export const KDOOR: V3 = [3, 0, 1.2];
export const KITCHEN_BOXES = [
  { n: "counter", min: [-3, 0, -2.5], max: [1.2, 1.0, -1.85] }, { n: "fridge", min: [-3, 0, -1.6], max: [-2.25, 1.9, -0.8] },
  { n: "table", min: [0.6, 0, -0.1], max: [1.9, 0.8, 0.8] }, { n: "chair", min: [0.05, 0, 0.8], max: [0.55, 0.6, 1.3] },
  { n: "left wall", min: [-3.2, 0, -2.6], max: [-3.0, 3, 2.6] }, { n: "back wall", min: [-3.2, 0, -2.7], max: [3.2, 3, -2.5] },
  { n: "right wall", min: [3.0, 0, -2.6], max: [3.2, 3, 0.4] }, { n: "right wall 2", min: [3.0, 0, 1.78], max: [3.2, 3, 2.6] },
];
const Tile: React.FC<{ x: number; z: number; dark: boolean }> = ({ x, z, dark }) => <M g={boxG(0.5, 0.04, 0.5)} c={dark ? "#3a5a7a" : "#e8e2d4"} p={[x, 0.02, z]} cast={false} />;
export const Kitchen: React.FC<{ doorOpen: number; t: number }> = ({ doorOpen, t }) => (
  <group position={KITCHEN}>
    {Array.from({ length: 12 * 10 }, (_, i) => {
      const cx = i % 12, cz = Math.floor(i / 12);
      return <Tile key={i} x={-2.75 + cx * 0.5} z={-2.25 + cz * 0.5} dark={(cx + cz) % 2 === 0} />;
    })}
    {/* walls: back (with a window full of morning light), left, right (with the door), a ceiling */}
    <M g={boxG(6.4, 3, 0.2)} c="#e8d8b0" tex="plaster" p={[0, 1.5, -2.6]} />
    <M g={boxG(0.2, 3, 5.2)} c="#e8d8b0" tex="plaster" p={[-3.1, 1.5, 0]} />
    <M g={boxG(0.2, 3, 3.0)} c="#e8d8b0" tex="plaster" p={[3.1, 1.5, -1.1]} />
    <M g={boxG(0.2, 0.9, 1.1)} c="#e8d8b0" tex="plaster" p={[3.1, 2.55, 1.2]} />
    <M g={boxG(0.2, 3, 0.85)} c="#e8d8b0" tex="plaster" p={[3.1, 1.5, 2.2]} />
    <M g={boxG(6.4, 0.12, 5.4)} c="#d8d0c0" p={[0, 3.06, 0]} recv={false} />
    <M g={boxG(6.2, 0.14, 0.04)} c="#8a6a4a" p={[0, 0.07, -2.48]} cast={false} />
    <mesh geometry={boxG(1.4, 1.0, 0.04)} position={[-0.6, 1.9, -2.47]} material={coreMat("#ffe8b8", 1.6)} />
    {[[-0.6, 2.45, 1.6, 0.1], [-0.6, 1.35, 1.6, 0.1], [-1.35, 1.9, 0.1, 1.0], [0.15, 1.9, 0.1, 1.0], [-0.6, 1.9, 0.05, 1.0]].map(([x, y, w, h], i) => (
      <M key={i} g={boxG(w, h, 0.08)} c="#f4ece0" p={[x, y, -2.43]} cast={false} />
    ))}
    <pointLight position={[-0.6, 2.0, -1.6]} color="#ffe0b0" intensity={6} distance={8} decay={1.4} />
    {/* the door: it swings open into the room */}
    <group position={[3.0, 0, 0.65]} rotation={[0, -doorOpen * 1.6, 0]}>
      <M g={boxG(0.06, 2.1, 1.1)} c="#6a4a32" tex="wood" p={[0, 1.05, 0.55]} />
      <M g={sphG(0.04, 8)} c="#d8b040" p={[-0.06, 1.0, 0.95]} />
    </group>
    {/* counter run, sink, stove, upper cabinets, fridge */}
    <M g={boxG(4.2, 0.9, 0.6)} c="#4a7a8a" tex="wood" p={[-0.9, 0.45, -2.18]} />
    <M g={boxG(4.3, 0.06, 0.66)} c="#e8e4dc" p={[-0.9, 0.93, -2.18]} />
    {Array.from({ length: 6 }, (_, k) => (
      <M key={k} g={boxG(0.04, 0.12, 0.02)} c="#d8d0c0" p={[-2.6 + k * 0.7, 0.75, -1.86]} cast={false} />
    ))}
    <M g={boxG(0.6, 0.05, 0.45)} c="#a8acb4" p={[-0.6, 0.95, -2.2]} />
    <M g={torG(0.08, 0.015, PI)} c="#c8ccd4" p={[-0.6, 1.08, -2.38]} />
    <M g={boxG(0.7, 0.04, 0.55)} c="#2a2a30" p={[0.6, 0.97, -2.18]} />
    {[-0.15, 0.15].map((dx) => (
      <M key={dx} g={torG(0.08, 0.012)} c="#4a4a50" p={[0.6 + dx, 1.0, -2.18]} r={[PI / 2, 0, 0]} />
    ))}
    <group position={[0.75, 1.03, -2.1]}>
      <M g={cylG(0.09, 0.11, 0.18, 12)} c="#c83a3a" p={[0, 0.09, 0]} />
      <M g={torG(0.05, 0.012, PI)} c="#2a2a30" p={[0, 0.22, 0]} />
    </group>
    <M g={boxG(4.2, 0.7, 0.35)} c="#5a8a9a" tex="wood" p={[-0.9, 2.3, -2.32]} />
    <M g={boxG(0.75, 1.9, 0.75)} c="#e8e8ec" p={[-2.62, 0.95, -1.2]} />
    <M g={boxG(0.04, 0.5, 0.04)} c="#a8acb4" p={[-2.22, 1.3, -0.9]} />
    <Label text="MILK" p={[-2.23, 1.6, -1.25]} r={[0, PI / 2, 0]} w={0.22} h={0.1} fg="#2a2a30" bg="#f4e04a" />
    {/* table with fruit bowl, a chair tipped over (he fell), a dropped mug and a spill, a rug */}
    <M g={boxG(1.3, 0.06, 0.9)} c="#8a5a3a" tex="wood" p={[1.25, 0.76, 0.35]} />
    {[[0.7, -0.05], [1.8, -0.05], [0.7, 0.75], [1.8, 0.75]].map(([x, z], i) => (
      <M key={i} g={boxG(0.06, 0.73, 0.06)} c="#6a4a2a" p={[x, 0.37, z]} />
    ))}
    <M g={cylG(0.18, 0.12, 0.08, 14)} c="#e8e0d0" p={[1.25, 0.83, 0.35]} />
    {[0, 1, 2].map((k) => (
      <M key={k} g={sphG(0.06, 8)} c={["#d83a2a", "#f4b43a", "#7ab83a"][k]} p={[1.2 + k * 0.06, 0.9, 0.33 + (k % 2) * 0.05]} />
    ))}
    <group position={[0.3, 0.25, 1.05]} rotation={[0, 0.4, PI / 2.2]}>
      <M g={boxG(0.45, 0.05, 0.45)} c="#7a5a3a" tex="wood" p={[0, 0, 0]} />
      <M g={boxG(0.45, 0.5, 0.05)} c="#7a5a3a" tex="wood" p={[0, 0.25, -0.2]} />
    </group>
    <group position={[-0.1, 0.06, 0.6]} rotation={[PI / 2, 0, 0.7]}>
      <M g={cylG(0.05, 0.04, 0.1, 10)} c="#e8e0d0" />
    </group>
    <M g={cylG(0.25, 0.25, 0.005, 20)} c="#6a4a2a" p={[0.1, 0.045, 0.75]} cast={false} />
    <M g={boxG(2.0, 0.02, 1.2)} c="#a04a3a" tex="fabric" p={[-0.8, 0.05, 1.3]} cast={false} />
    {/* a clock, a calendar, a framed photo, a ceiling lamp, a plant on the sill */}
    <M g={cylG(0.2, 0.2, 0.04, 20)} c="#f4ead6" p={[1.6, 2.4, -2.47]} r={[PI / 2, 0, 0]} />
    <M g={boxG(0.015, 0.14, 0.01)} c="#2a2a30" p={[1.6, 2.44, -2.44]} r={[0, 0, (t * 0.2) % (2 * PI)]} />
    <Label text="NOV" p={[2.3, 1.8, -2.47]} w={0.34} h={0.4} fg="#c83a3a" bg="#f4ead6" />
    <group position={[-3.0, 1.8, 0.6]} rotation={[0, PI / 2, 0]}>
      <M g={boxG(0.6, 0.45, 0.04)} c="#8a6a3a" />
      <mesh geometry={boxG(0.5, 0.35, 0.02)} position={[0, 0, 0.025]} material={coreMat("#a8c8d8", 0.9)} />
    </group>
    <mesh geometry={sphG(0.16, 12)} position={[0, 2.7, 0.2]} material={coreMat("#ffe0a0", 1.4)} userData={{ outline: false }} />
    <M g={cylG(0.01, 0.01, 0.3, 4)} c="#2a2a30" p={[0, 2.88, 0.2]} />
    <group position={[-1.1, 1.38, -2.35]}>
      <M g={cylG(0.08, 0.06, 0.12, 10)} c="#c8603a" p={[0, 0.06, 0]} />
      <M g={sphG(0.11, 8)} c="#3e7a40" p={[0, 0.18, 0]} />
    </group>
  </group>
);
