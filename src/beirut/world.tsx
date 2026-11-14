// The sets of the Beirut camp film: the camp (grass, a dirt field, cabins, trees, hills), the Oklahoma park (red dirt,
// rocks, a weathered cabin), and the researcher's office. Pure functions of the shot's world state; nothing random.
// All ground-level shots look toward +z, so the backdrop (cabins, trees, hills) sits at z > 24.
import React from "react";
import * as THREE from "three";
import { Lobe, Rock } from "../film/models";
import { Label, M, boxG, coneG, cylG, h1, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

export type SetId = "camp" | "okla" | "office";
export type World = {
  set: SetId;
  /** chalk lines on the ground: a to b, grown 0..1 from a, optionally dashed */
  chalk?: { a: V3; b: V3; grow: number; dash?: number }[];
  /** the tug-of-war rope between two points (hand height) */
  rope?: { a: V3; b: V3 } | null;
  /** the dust cloud of the fight: centre, growth 0..1, scale */
  dust?: { p: V3; u: number; s: number } | null;
  /** the wooden scoreboard text */
  score?: string | null;
  bus?: boolean;
};

export const FIELD: V3 = [0, 0, 10];

// ------------------------------------------------------------------ pieces
const Cabin: React.FC<{ p: V3; yaw?: number; w?: number; d?: number; h?: number; wall?: string; roof?: string; worn?: boolean }> = ({ p, yaw = 0, w = 7, d = 5, h = 2.6, wall = "#b98a58", roof = "#8f4a3a", worn }) => {
  const rise = 1.5;
  const half = w / 2 + 0.45;
  const len = Math.hypot(half, rise);
  const a = Math.atan2(rise, half);
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <M g={boxG(w, h, d)} c={wall} tex="planks" p={[0, h / 2, 0]} />
      <M g={boxG(len, 0.2, d + 0.9)} c={roof} tex="shingles" p={[-half / 2, h + rise / 2, 0]} r={[0, 0, a]} />
      <M g={boxG(len, 0.2, d + 0.9)} c={roof} tex="shingles" p={[half / 2, h + rise / 2, 0]} r={[0, 0, -a]} />
      <M g={boxG(1.15, 1.95, 0.12)} c={worn ? "#4a3a2c" : "#5a3a2b"} tex="wood" p={[w * 0.18, 0.98, -d / 2 - 0.03]} />
      <M g={boxG(1.3, 0.95, 0.1)} c="#9dc6d8" p={[-w * 0.22, 1.5, -d / 2 - 0.03]} />
      <M g={boxG(0.12, 1.05, 0.14)} c="#5a3a2b" p={[-w * 0.22 - 0.7, 1.5, -d / 2 - 0.04]} />
      <M g={boxG(0.12, 1.05, 0.14)} c="#5a3a2b" p={[-w * 0.22 + 0.7, 1.5, -d / 2 - 0.04]} />
    </group>
  );
};
const Pine: React.FC<{ p: V3; s?: number }> = ({ p, s = 1 }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.2, 0.3, 2.6, 8)} c="#5a3d2b" tex="wood" p={[0, 1.3, 0]} />
    <M g={coneG(1.9, 3.0, 10)} c="#2f6b3c" tex="grass" ts={1.6} p={[0, 3.2, 0]} />
    <M g={coneG(1.5, 2.6, 10)} c="#38794a" tex="grass" ts={1.6} p={[0, 4.6, 0]} />
    <M g={coneG(1.0, 2.1, 10)} c="#438a56" tex="grass" ts={1.6} p={[0, 5.9, 0]} />
  </group>
);
const Oak: React.FC<{ p: V3; s?: number; c?: string }> = ({ p, s = 1, c = "#4f8a46" }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.25, 0.4, 2.8, 8)} c="#5a3d2b" tex="wood" p={[0, 1.4, 0]} />
    <M g={sphG(1, 12)} c={c} tex="grass" ts={1.6} p={[0, 4.0, 0]} s={[2.3, 1.7, 2.2]} />
    <M g={sphG(1, 12)} c={c} tex="grass" ts={1.6} p={[1.2, 3.5, 0.5]} s={[1.5, 1.2, 1.4]} />
  </group>
);
const Hill: React.FC<{ p: V3; s: V3; c: string }> = ({ p, s, c }) => <M g={sphG(1, 14)} c={c} p={p} s={s} cast={false} recv={false} />;

/** a chalk line: unlit white boxes lying on the ground, optionally dashed */
export const Chalk: React.FC<{ a: V3; b: V3; grow: number; dash?: number }> = ({ a, b, grow, dash }) => {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]) * Math.max(0, Math.min(1, grow));
  if (L < 0.05) return null;
  const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  const dx = Math.sin(yaw);
  const dz = Math.cos(yaw);
  const segs: [number, number][] = [];
  if (dash) for (let s = 0; s < L; s += dash * 2) segs.push([s, Math.min(L, s + dash)]);
  else segs.push([0, L]);
  return (
    <group>
      {segs.map(([s0, s1], i) => {
        const m = (s0 + s1) / 2;
        return (
          <mesh key={i} position={[a[0] + dx * m, 0.045, a[2] + dz * m]} rotation={[0, yaw, 0]} userData={{ outline: false }}>
            <boxGeometry args={[0.16, 0.02, s1 - s0]} />
            <meshBasicMaterial color="#fbfbf6" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** a rope between two points */
const Rope: React.FC<{ a: V3; b: V3 }> = ({ a, b }) => {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  return <M g={boxG(0.07, 0.07, L)} c="#cdb58a" tex="fabric" p={[(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2]} r={[0, yaw, 0]} cast={false} />;
};

/** the dust cloud of a scuffle: white lobes that swell, a few yellow sparks. u 0..1 */
export const Dust: React.FC<{ p: V3; u: number; s: number }> = ({ p, u, s }) => {
  if (u <= 0.01) return null;
  const k = Math.min(1, u * 1.6);
  return (
    <group position={p}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = i * 2.399;
        const r = (0.35 + 1.1 * h1(i * 3.7)) * s * k;
        const R = (0.5 + 1.3 * h1(i * 1.9 + 4)) * s * k;
        return <Lobe key={i} p={[Math.cos(a) * R, 0.5 + 1.1 * h1(i * 5.3) * k * s, Math.sin(a) * R]} s={[r, r * 0.8, r]} c={i % 3 === 0 ? "#d9ceb8" : "#f1eadb"} />;
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const a = i * 0.9 + 0.4;
        const R = (1.4 + 0.5 * (i % 3)) * s * Math.min(1, u * 2);
        return <Lobe key={`s${i}`} p={[Math.cos(a) * R, 1.4 + 0.5 * (i % 2), Math.sin(a) * R]} s={0.13 * s} c="#ffd34d" />;
      })}
    </group>
  );
};

const Scoreboard: React.FC<{ p: V3; text: string }> = ({ p, text }) => (
  <group position={p}>
    <M g={cylG(0.09, 0.09, 2.7, 8)} c="#6a4a30" tex="wood" p={[-1.5, 1.35, 0]} />
    <M g={cylG(0.09, 0.09, 2.7, 8)} c="#6a4a30" tex="wood" p={[1.5, 1.35, 0]} />
    <M g={boxG(3.3, 1.5, 0.14)} c="#6a4a30" tex="planks" p={[0, 2.0, 0]} />
    <Label text={text} p={[0, 2.0, -0.09]} r={[0, Math.PI, 0]} w={2.9} h={1.15} fg="#f6f0dc" bg="#2e4a38" font={0.7} />
  </group>
);
const Trophy: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(1.5, 0.08, 0.8)} c="#7a5a3c" tex="planks" p={[0, 0.8, 0]} />
    <M g={boxG(0.08, 0.8, 0.08)} c="#7a5a3c" p={[-0.68, 0.4, -0.32]} />
    <M g={boxG(0.08, 0.8, 0.08)} c="#7a5a3c" p={[0.68, 0.4, -0.32]} />
    <M g={boxG(0.08, 0.8, 0.08)} c="#7a5a3c" p={[-0.68, 0.4, 0.32]} />
    <M g={boxG(0.08, 0.8, 0.08)} c="#7a5a3c" p={[0.68, 0.4, 0.32]} />
    <M g={cylG(0.16, 0.1, 0.1, 14)} c="#d7b34a" p={[0, 0.89, 0]} />
    <M g={cylG(0.03, 0.03, 0.16, 8)} c="#d7b34a" p={[0, 0.98, 0]} />
    <M g={cylG(0.22, 0.05, 0.22, 16)} c="#d7b34a" p={[0, 1.17, 0]} />
  </group>
);
const Bus: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(2.5, 2.2, 7.5)} c="#d2ad45" p={[0, 1.75, 0]} />
    <M g={boxG(2.52, 0.85, 6.6)} c="#8fb4c4" p={[0, 2.2, -0.15]} />
    <M g={boxG(2.3, 1.2, 1.8)} c="#d2ad45" p={[0, 1.2, 4.6]} />
    <M g={boxG(2.52, 0.14, 7.6)} c="#2d2a2c" p={[0, 1.0, 0]} />
    {[-2.6, 2.6].map((z) => (
      <React.Fragment key={z}>
        <M g={cylG(0.6, 0.6, 0.35, 16)} c="#25232a" p={[-1.28, 0.6, z]} r={[0, 0, Math.PI / 2]} />
        <M g={cylG(0.6, 0.6, 0.35, 16)} c="#25232a" p={[1.28, 0.6, z]} r={[0, 0, Math.PI / 2]} />
      </React.Fragment>
    ))}
  </group>
);

// ------------------------------------------------------------------ the three sets
const Camp: React.FC = () => (
  <group>
    <M g={cylG(300, 300, 0.4, 40)} c="#86a85c" tex="grass" ts={4} p={[0, -0.2, 0]} />
    <M g={cylG(17, 17, 0.06, 56)} c="#d2bb8a" tex="sand" ts={2} p={[FIELD[0], 0.025, FIELD[2]]} />
    <Cabin p={[-13, 0, 31]} w={8} d={5.5} />
    <Cabin p={[1.5, 0, 36]} w={9} d={5.5} wall="#c79a68" roof="#7f4a3e" />
    <Cabin p={[15, 0, 30]} w={7} d={5} wall="#a9805a" />
    {[-34, -27, 25, 31, -22, 22, -30, 30].map((x, i) => (
      <Pine key={i} p={[x, 0, 8 + (i % 4) * 7 + (i > 3 ? 12 : 0)]} s={0.9 + 0.2 * h1(i)} />
    ))}
    {[-18, -6, 8, 22, 36, -40, 44].map((x, i) => (
      <Pine key={`b${i}`} p={[x, 0, 44 + (i % 3) * 5]} s={1.1 + 0.3 * h1(i + 9)} />
    ))}
    <Oak p={[-20, 0, 18]} s={1.1} />
    <Oak p={[20, 0, 6]} s={1.0} />
    <Hill p={[-70, -4, 130]} s={[80, 26, 40]} c="#79987a" />
    <Hill p={[30, -4, 150]} s={[110, 34, 40]} c="#8aa686" />
    <Hill p={[110, -4, 110]} s={[60, 22, 36]} c="#7a9778" />
  </group>
);
const Okla: React.FC<{ bus?: boolean }> = ({ bus }) => (
  <group>
    <M g={cylG(300, 300, 0.4, 40)} c="#b07a50" tex="sand" ts={3} p={[0, -0.2, 0]} />
    <M g={cylG(15, 15, 0.06, 56)} c="#c49a66" tex="sand" ts={2} p={[FIELD[0], 0.025, FIELD[2]]} />
    <Cabin p={[0, 0, 24]} w={8} d={5} wall="#9a7a54" roof="#6a4a3a" worn />
    <Cabin p={[-13, 0, 28]} w={6} d={4.5} wall="#8c6e4c" roof="#5d4638" worn />
    <Rock p={[-12, 0, 40]} r={9} h={6} c="#8d7660" />
    <Rock p={[6, 0, 46]} r={12} h={9} yaw={0.4} c="#957d66" />
    <Rock p={[24, 0, 36]} r={8} h={5} yaw={1.1} c="#8a735e" />
    <Rock p={[-28, 0, 30]} r={7} h={4.5} yaw={0.2} c="#927b65" />
    <Oak p={[-20, 0, 16]} s={1.2} c="#6f8a3e" />
    <Oak p={[19, 0, 20]} s={1.1} c="#6f8a3e" />
    <Oak p={[30, 0, 10]} s={1.0} c="#667f3a" />
    <Oak p={[-32, 0, 8]} s={1.0} c="#667f3a" />
    <Hill p={[0, -3, 140]} s={[140, 24, 40]} c="#95866a" />
    {bus ? <Bus p={[-9, 0, 9.5]} yaw={0} /> : null}
  </group>
);
const Office: React.FC = () => (
  <group>
    <M g={boxG(7, 0.2, 7)} c="#a9845a" tex="planks" p={[0, -0.1, 10]} />
    <M g={boxG(7, 3.2, 0.2)} c="#d9cdb2" tex="plaster" p={[0, 1.6, 13.5]} />
    <M g={boxG(0.2, 3.2, 7)} c="#cfc3a8" tex="plaster" p={[-3.5, 1.6, 10]} />
    <M g={boxG(0.2, 3.2, 7)} c="#cfc3a8" tex="plaster" p={[3.5, 1.6, 10]} />
    <M g={boxG(7, 0.2, 7)} c="#e4dcc6" p={[0, 3.3, 10]} />
    {/* a bright window in the left wall and a shelf on the back wall */}
    <mesh position={[-3.38, 1.8, 10.4]} rotation={[0, Math.PI / 2, 0]} userData={{ outline: false }}>
      <planeGeometry args={[1.8, 1.4]} />
      <meshBasicMaterial color={new THREE.Color("#d8ecff").multiplyScalar(1.3)} toneMapped={false} />
    </mesh>
    <M g={boxG(2.4, 0.08, 0.4)} c="#7a5a3c" tex="wood" p={[1.6, 1.9, 13.25]} />
    {[0, 1, 2, 3].map((i) => (
      <M key={i} g={boxG(0.22, 0.34, 0.26)} c={["#b0503c", "#3d5fbf", "#d6a137", "#2e8a86"][i]} p={[0.9 + i * 0.28, 2.12, 13.25]} />
    ))}
    {/* the desk, a chair, a lamp, an old report beside an old group photo */}
    <M g={boxG(2.6, 0.1, 1.2)} c="#7a5a3c" tex="wood" p={[0, 0.78, 11.3]} />
    <M g={boxG(0.1, 0.78, 1.0)} c="#6a4a30" p={[-1.2, 0.39, 11.3]} />
    <M g={boxG(0.1, 0.78, 1.0)} c="#6a4a30" p={[1.2, 0.39, 11.3]} />
    <M g={boxG(0.62, 0.025, 0.86)} c="#efe9d6" tex="paper" p={[-0.5, 0.855, 11.2]} r={[0, 0.12, 0]} />
    <M g={boxG(0.58, 0.02, 0.8)} c="#e4dcc2" tex="paper" p={[-0.46, 0.88, 11.22]} r={[0, 0.06, 0]} />
    <M g={boxG(0.5, 0.04, 0.38)} c="#3b2f28" p={[0.62, 0.87, 11.2]} r={[0, -0.18, 0]} />
    <M g={boxG(0.44, 0.02, 0.32)} c="#cfc7b0" p={[0.62, 0.9, 11.2]} r={[0, -0.18, 0]} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Lobe key={i} p={[0.5 + (i % 3) * 0.1, 0.92, 11.1 + Math.floor(i / 3) * 0.1]} s={0.025} c={["#b0503c", "#d6a137", "#3d5fbf", "#2e8a86", "#c46a78", "#7c9868"][i]} />
    ))}
    <M g={cylG(0.05, 0.12, 0.05, 12)} c="#2b2d35" p={[1.0, 0.86, 11.6]} />
    <M g={cylG(0.015, 0.015, 0.4, 8)} c="#2b2d35" p={[1.0, 1.06, 11.6]} />
    <M g={sphG(0.12, 10)} c="#ffe9b0" e="#ffcf70" ei={0.9} p={[1.0, 1.34, 11.6]} s={[1.2, 0.8, 1.2]} />
  </group>
);

export const WorldView: React.FC<{ w: World }> = ({ w }) => (
  <group>
    {w.set === "camp" ? <Camp /> : w.set === "okla" ? <Okla bus={w.bus} /> : <Office />}
    {w.score ? <Scoreboard p={[0, 0, 9.5]} text={w.score} /> : null}
    {w.score ? <Trophy p={[3.0, 0, 8]} /> : null}
    {(w.chalk ?? []).map((c, i) => (
      <Chalk key={i} {...c} />
    ))}
    {w.rope ? <Rope {...w.rope} /> : null}
    {w.dust ? <Dust {...w.dust} /> : null}
  </group>
);
