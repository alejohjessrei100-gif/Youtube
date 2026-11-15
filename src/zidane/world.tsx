// The sets of the Zidane short: a generic night stadium (a striped pitch, white lines, four tiers of crowd, floodlight
// towers, dugouts) and a dark room with a pedestal. Not the Berlin stadium and not the FIFA trophy designs.
import React from "react";
import * as THREE from "three";
import { M, boxG, canvasTex, coreMat, cylG, h1, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

export type World = {
  set: "stadium" | "room";
  /** the cloth over the trophy: 0 covers it, 1 is gone */
  cloth?: number;
  /** a white impact ring at a point, 0..1 */
  ring?: { p: V3; u: number } | null;
  /** small dark bits: a headset, an earpiece */
  bits?: { p: V3; s: number }[];
  /** a red card standing in the world (in a pocket) */
  card?: V3 | null;
};

const HALF_L = 52.5;
const HALF_W = 34;

const Line: React.FC<{ a: [number, number]; b: [number, number]; w?: number }> = ({ a, b, w = 0.14 }) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  return (
    <mesh position={[(a[0] + b[0]) / 2, 0.035, (a[1] + b[1]) / 2]} rotation={[0, yaw, 0]} userData={{ outline: false }}>
      <boxGeometry args={[w, 0.01, L]} />
      <meshBasicMaterial color="#f4f6f2" toneMapped={false} />
    </mesh>
  );
};
const Circle: React.FC<{ r: number }> = ({ r }) => (
  <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ outline: false }}>
    <ringGeometry args={[r - 0.07, r + 0.07, 96]} />
    <meshBasicMaterial color="#f4f6f2" toneMapped={false} />
  </mesh>
);

const crowdTex = () =>
  canvasTex("crowd", 1024, 512, (g, w, h) => {
    g.fillStyle = "#1a1d2c";
    g.fillRect(0, 0, w, h);
    const cols = ["#f2f2ee", "#2f62b8", "#c9363a", "#e8d48a", "#3a3e52", "#8a6a5a", "#f2f2ee", "#2f62b8", "#d9a066", "#5a6a8a"];
    for (let y = 0; y < h; y += 8)
      for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) {
        const k = h1(x * 0.37 + y * 1.31);
        if (k < 0.12) continue;
        g.fillStyle = cols[Math.floor(h1(x * 1.7 + y * 0.9) * cols.length)];
        g.fillRect(x + 1, y + 1, 5, 6);
      }
    for (let y = 0; y < h; y += 64) {
      g.fillStyle = "#0e0f18";
      g.fillRect(0, y, w, 3);
    }
  });
let crowdMat: THREE.Material | null = null;
const Stand: React.FC<{ p: V3; yaw: number; w: number }> = ({ p, yaw, w }) => {
  if (!crowdMat) {
    const t = crowdTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w / 30, 2);
    crowdMat = new THREE.MeshToonMaterial({ map: t });
  }
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <mesh position={[0, 9, 11]} rotation={[-0.55, 0, 0]} material={crowdMat} userData={{ outline: false }}>
        <boxGeometry args={[w, 0.4, 26]} />
      </mesh>
      <M g={boxG(w, 1.4, 1.2)} c="#2b2f44" p={[0, 0.7, 0.3]} />
      <M g={boxG(w, 2.2, 2)} c="#1c1f2e" p={[0, 21, 23]} cast={false} />
    </group>
  );
};
const Tower: React.FC<{ p: V3; face: number }> = ({ p, face }) => (
  <group position={p} rotation={[0, face, 0]}>
    <M g={cylG(0.5, 0.8, 42, 10)} c="#4a4e60" p={[0, 21, 0]} cast={false} />
    <M g={boxG(7, 4, 0.8)} c="#2a2c38" p={[0, 43, 0]} cast={false} />
    <mesh position={[0, 43, 0.45]} material={coreMat("#fff8e6", 2.4)} userData={{ outline: false }}>
      <boxGeometry args={[6.4, 3.4, 0.1]} />
    </mesh>
  </group>
);
const Dugout: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 0, -HALF_W - 4.5]}>
    <M g={boxG(7, 0.15, 2.4)} c="#9fb4c8" p={[0, 2.3, 0]} op={0.55} />
    <M g={boxG(7, 2.3, 0.15)} c="#2a2e40" p={[0, 1.15, -1.2]} />
    <M g={boxG(7, 0.5, 0.7)} c="#3a4060" p={[0, 0.5, -0.7]} />
  </group>
);

const Stadium: React.FC = () => (
  <group>
    <M g={boxG(140, 0.2, 100)} c="#3b7a3a" p={[0, -0.1, 0]} />
    {Array.from({ length: 12 }, (_, i) => (
      <M key={i} g={boxG(HALF_L * 2 / 12, 0.02, HALF_W * 2)} c={i % 2 ? "#3f8a3e" : "#367a36"} p={[-HALF_L + (i + 0.5) * (HALF_L * 2 / 12), 0.01, 0]} cast={false} />
    ))}
    <Line a={[-HALF_L, -HALF_W]} b={[HALF_L, -HALF_W]} />
    <Line a={[-HALF_L, HALF_W]} b={[HALF_L, HALF_W]} />
    <Line a={[-HALF_L, -HALF_W]} b={[-HALF_L, HALF_W]} />
    <Line a={[HALF_L, -HALF_W]} b={[HALF_L, HALF_W]} />
    <Line a={[0, -HALF_W]} b={[0, HALF_W]} />
    <Circle r={9.15} />
    {[-1, 1].map((s) => (
      <React.Fragment key={s}>
        <Line a={[s * HALF_L, -20.16]} b={[s * (HALF_L - 16.5), -20.16]} />
        <Line a={[s * HALF_L, 20.16]} b={[s * (HALF_L - 16.5), 20.16]} />
        <Line a={[s * (HALF_L - 16.5), -20.16]} b={[s * (HALF_L - 16.5), 20.16]} />
        <M g={boxG(0.12, 2.44, 0.12)} c="#f6f6f2" p={[s * HALF_L, 1.22, -3.66]} />
        <M g={boxG(0.12, 2.44, 0.12)} c="#f6f6f2" p={[s * HALF_L, 1.22, 3.66]} />
        <M g={boxG(0.12, 0.12, 7.44)} c="#f6f6f2" p={[s * HALF_L, 2.44, 0]} />
      </React.Fragment>
    ))}
    <Stand p={[0, 0, HALF_W + 5]} yaw={0} w={130} />
    <Stand p={[0, 0, -HALF_W - 7]} yaw={Math.PI} w={130} />
    <Stand p={[HALF_L + 6, 0, 0]} yaw={Math.PI / 2} w={90} />
    <Stand p={[-HALF_L - 6, 0, 0]} yaw={-Math.PI / 2} w={90} />
    <Tower p={[62, 0, 46]} face={-2.3} />
    <Tower p={[-62, 0, 46]} face={2.3} />
    <Tower p={[62, 0, -46]} face={-0.8} />
    <Tower p={[-62, 0, -46]} face={0.8} />
    <Dugout x={-9} />
    <Dugout x={9} />
  </group>
);

const Room: React.FC<{ cloth: number }> = ({ cloth }) => {
  const c = Math.max(0, Math.min(1, cloth));
  const e = c * c * (3 - 2 * c);
  return (
    <group>
      <M g={boxG(12, 0.2, 12)} c="#2a2430" p={[0, -0.1, 0]} />
      <M g={boxG(12, 6, 0.2)} c="#1e1a26" p={[0, 3, 4]} />
      <M g={cylG(0.42, 0.5, 1.1, 32)} c="#e9e3d6" p={[0, 0.55, 0]} />
      <M g={cylG(0.5, 0.5, 0.06, 32)} c="#c9a24a" p={[0, 1.13, 0]} />
      {/* the golden ball: a gold sphere on a short stem */}
      <M g={cylG(0.06, 0.1, 0.12, 16)} c="#c9a24a" p={[0, 1.22, 0]} />
      <M g={sphG(0.2, 32)} c="#e8c25a" e="#7a5a10" ei={0.35} p={[0, 1.48, 0]} />
      {/* the red card, lying beside it */}
      <M g={boxG(0.17, 0.008, 0.25)} c="#e0241c" p={[0.27, 1.17, 0.12]} r={[0, 0.4, 0]} />
      {/* the cloth: lifts and slides off to the left */}
      {e < 0.999 ? <M g={sphG(0.42, 20)} c="#efeae0" tex="fabric" p={[-1.8 * e, 1.42 + 0.5 * Math.sin(Math.PI * e), 0]} s={[1, 1.15 - 0.6 * e, 1]} /> : null}
      <spotLight position={[0, 6, 1.5]} angle={0.32} penumbra={0.5} intensity={60} distance={12} decay={1.2} color="#ffe8bc" castShadow />
      <mesh position={[0, 3.6, 0.8]} rotation={[0.25, 0, 0]} userData={{ outline: false }}>
        <coneGeometry args={[1.0, 4.8, 32, 1, true]} />
        <meshBasicMaterial color="#ffe8bc" transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
};

export const WorldView: React.FC<{ w: World }> = ({ w }) => (
  <group>
    {w.set === "stadium" ? <Stadium /> : <Room cloth={w.cloth ?? 0} />}
    {(w.bits ?? []).map((b, i) => (
      <mesh key={i} position={b.p} userData={{ outline: false }}>
        <sphereGeometry args={[b.s, 12, 10]} />
        <meshBasicMaterial color="#15161c" />
      </mesh>
    ))}
    {w.card ? <M g={boxG(0.075, 0.11, 0.006)} c="#e0241c" p={w.card} r={[0.12, 0, 0.1]} cast={false} /> : null}
    {w.ring && w.ring.u > 0 && w.ring.u < 1 ? (
      <mesh position={w.ring.p} userData={{ outline: false }}>
        <torusGeometry args={[0.15 + 0.6 * w.ring.u, 0.03 * (1 - w.ring.u) + 0.005, 8, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1 - w.ring.u} toneMapped={false} />
      </mesh>
    ) : null}
  </group>
);
