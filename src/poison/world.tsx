// Sets of the poison short. All centred near the origin, cameras look toward +z (back walls at z ~ 3.5).
import React from "react";
import { Lobe } from "../film/models";
import { Flame, M, boxG, coneG, cylG, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

export type SetId = "hall" | "roman" | "throne" | "vault" | "dungeon";
export type HeadProp = { kind: "crown" | "wreath" | "chef"; p: V3; s?: number };
export type World = { set: SetId; heads?: HeadProp[]; tipped?: boolean; stoneOnFloor?: boolean; glow?: number };

const Room: React.FC<{ wall: string; floor: string; tex?: "stone" | "plaster" | "brick"; w?: number }> = ({ wall, floor, tex = "stone", w = 12 }) => (
  <group>
    <M g={boxG(w, 0.2, 10)} c={floor} tex={tex === "plaster" ? "plaster" : "stone"} p={[0, -0.1, 0.5]} />
    <M g={boxG(w, 6, 0.3)} c={wall} tex={tex} p={[0, 3, 3.6]} />
    <M g={boxG(0.3, 6, 10)} c={wall} tex={tex} p={[-w / 2, 3, 0.5]} />
    <M g={boxG(0.3, 6, 10)} c={wall} tex={tex} p={[w / 2, 3, 0.5]} />
  </group>
);
const Table: React.FC<{ p: V3; w: number; d?: number; h?: number; c?: string }> = ({ p, w, d = 1.0, h = 0.78, c = "#6a4428" }) => (
  <group position={p}>
    <M g={boxG(w, 0.08, d)} c={c} tex="wood" p={[0, h, 0]} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <M key={`${sx}${sz}`} g={boxG(0.08, h, 0.08)} c={c} p={[sx * (w / 2 - 0.1), h / 2, sz * (d / 2 - 0.1)]} />))}
  </group>
);
const Plate: React.FC<{ p: V3; food?: string }> = ({ p, food = "#c8622e" }) => (
  <group position={p}>
    <M g={cylG(0.16, 0.13, 0.025, 24)} c="#e8e2d2" p={[0, 0.012, 0]} />
    <M g={sphG(0.07, 14)} c={food} p={[0.02, 0.05, 0]} s={[1.3, 0.7, 1]} />
  </group>
);
const Candle: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p}>
    <M g={cylG(0.03, 0.03, 0.22, 10)} c="#efe6d2" p={[0, 0.11, 0]} />
    <Flame p={[0, 0.22, 0]} s={0.07} t={t} seed={p[0] * 7} />
  </group>
);
const Banner: React.FC<{ p: V3; c: string }> = ({ p, c }) => (
  <group position={p}>
    <M g={boxG(0.9, 2.2, 0.04)} c={c} tex="fabric" />
    <M g={boxG(0.3, 0.3, 0.05)} c="#e8c25a" p={[0, 0.3, -0.03]} r={[0, 0, Math.PI / 4]} />
  </group>
);
const Column: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.28, 0.32, 4.2, 20)} c="#efe9dc" tex="plaster" p={[0, 2.1, 0]} />
    <M g={boxG(0.8, 0.2, 0.8)} c="#e6dfd0" p={[0, 4.3, 0]} />
    <M g={boxG(0.8, 0.2, 0.8)} c="#e6dfd0" p={[0, 0.1, 0]} />
  </group>
);
const Noose: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(3, 0.25, 0.25)} c="#4a3220" tex="wood" p={[0, 3.2, 0]} />
    <M g={cylG(0.025, 0.025, 1.2, 8)} c="#b89a6a" p={[0, 2.5, 0]} />
    <M g={torG(0.16, 0.03)} c="#b89a6a" p={[0, 1.78, 0]} />
  </group>
);
const Head: React.FC<{ h: HeadProp }> = ({ h }) => {
  const s = h.s ?? 1;
  if (h.kind === "crown")
    return (
      <group position={h.p} scale={s}>
        <M g={cylG(0.17, 0.17, 0.09, 24, true)} c="#e8c25a" e="#5a3a08" ei={0.3} />
        {Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2;
          return <M key={k} g={coneG(0.04, 0.1, 6)} c="#e8c25a" p={[Math.cos(a) * 0.16, 0.09, Math.sin(a) * 0.16]} />;
        })}
        <M g={sphG(0.025, 8)} c="#d2283a" p={[0, 0.02, -0.17]} />
      </group>
    );
  if (h.kind === "wreath") return <M g={torG(0.16, 0.035)} c="#4f8a3a" p={h.p} r={[Math.PI / 2, 0, 0]} s={s} />;
  return (
    <group position={h.p} scale={s}>
      <M g={cylG(0.15, 0.13, 0.16, 20)} c="#f8f6ee" p={[0, 0.06, 0]} />
      <M g={sphG(0.17, 16)} c="#f8f6ee" p={[0, 0.2, 0]} s={[1, 0.6, 1]} />
    </group>
  );
};


// ---------------------------------------------------------------- set dressing
const Goblet: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.045, 0.03, 0.08, 14)} c="#c9a24a" p={[0, 0.11, 0]} />
    <M g={cylG(0.008, 0.008, 0.07, 6)} c="#c9a24a" p={[0, 0.04, 0]} />
    <M g={cylG(0.035, 0.035, 0.01, 12)} c="#c9a24a" p={[0, 0.005, 0]} />
  </group>
);
const Roast: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.28, 0.24, 0.03, 24)} c="#b8b2a4" p={[0, 0.015, 0]} />
    <M g={sphG(0.16, 16)} c="#a2582a" p={[0, 0.12, 0]} s={[1.3, 0.8, 1]} />
    <M g={cylG(0.025, 0.03, 0.16, 8)} c="#efe2c8" p={[0.2, 0.13, 0.05]} r={[0, 0, -1.0]} />
    <M g={cylG(0.025, 0.03, 0.16, 8)} c="#efe2c8" p={[-0.2, 0.13, 0.05]} r={[0, 0, 1.0]} />
  </group>
);
const Bread: React.FC<{ p: V3 }> = ({ p }) => <M g={sphG(0.08, 12)} c="#d49a52" p={p} s={[1.6, 0.7, 1]} />;
const FruitBowl: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.16, 0.1, 0.07, 18)} c="#c9a24a" p={[0, 0.035, 0]} />
    {[0, 1, 2, 3, 4].map((k) => (
      <M key={k} g={sphG(0.045, 10)} c={["#6a2a6a", "#c8622e", "#7a9a3a", "#d2283a", "#6a2a6a"][k]} p={[Math.cos(k * 1.3) * 0.07, 0.09 + (k % 2) * 0.04, Math.sin(k * 1.3) * 0.07]} />
    ))}
  </group>
);
const WallTorch: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p}>
    <M g={boxG(0.08, 0.35, 0.08)} c="#3a2a1a" p={[0, 0, -0.05]} r={[0.35, 0, 0]} />
    <Flame p={[0, 0.2, -0.12]} s={0.14} t={t} seed={p[0] * 3} />
  </group>
);
const Brazier: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p}>
    <M g={cylG(0.06, 0.1, 0.9, 10)} c="#3a3440" p={[0, 0.45, 0]} />
    <M g={cylG(0.3, 0.18, 0.2, 16)} c="#4a4450" p={[0, 0.98, 0]} />
    <Flame p={[0, 1.05, 0]} s={0.35} t={t} seed={p[0]} />
  </group>
);
const Rug: React.FC<{ p: V3; w: number; d: number; c: string; trim?: string }> = ({ p, w, d, c, trim = "#e8c25a" }) => (
  <group position={p}>
    <M g={boxG(w, 0.012, d)} c={trim} p={[0, 0.006, 0]} cast={false} />
    <M g={boxG(w - 0.16, 0.016, d - 0.16)} c={c} tex="fabric" p={[0, 0.01, 0]} cast={false} />
  </group>
);
const Pillar: React.FC<{ p: V3; c?: string }> = ({ p, c = "#5a5464" }) => (
  <group position={p}>
    <M g={boxG(0.6, 5.6, 0.6)} c={c} tex="stone" p={[0, 2.8, 0]} />
    <M g={boxG(0.8, 0.25, 0.8)} c={c} p={[0, 0.12, 0]} />
  </group>
);
const Chandelier: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p}>
    <M g={cylG(0.012, 0.012, 1.5, 6)} c="#2a2228" p={[0, 0.75, 0]} />
    <M g={torG(0.55, 0.035)} c="#3a2e24" r={[Math.PI / 2, 0, 0]} />
    {Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * Math.PI * 2;
      return (
        <group key={k} position={[Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55]}>
          <M g={cylG(0.025, 0.025, 0.14, 8)} c="#efe6d2" p={[0, 0.07, 0]} />
          <Flame p={[0, 0.14, 0]} s={0.05} t={t} seed={k} />
        </group>
      );
    })}
  </group>
);
const Fireplace: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p}>
    <M g={boxG(2.0, 1.8, 0.5)} c="#5a5058" tex="stone" p={[0, 0.9, 0]} />
    <M g={boxG(1.3, 1.1, 0.3)} c="#120c10" p={[0, 0.6, -0.12]} />
    <M g={boxG(2.3, 0.18, 0.6)} c="#4a4048" p={[0, 1.85, -0.02]} />
    <Flame p={[0, 0.12, -0.18]} s={0.5} t={t} seed={7} />
  </group>
);
const Amphora: React.FC<{ p: V3; c?: string }> = ({ p, c = "#b8623a" }) => (
  <group position={p}>
    <M g={sphG(0.22, 16)} c={c} p={[0, 0.35, 0]} s={[1, 1.4, 1]} />
    <M g={cylG(0.07, 0.09, 0.25, 12)} c={c} p={[0, 0.75, 0]} />
    <M g={torG(0.08, 0.02)} c={c} p={[0, 0.88, 0]} r={[Math.PI / 2, 0, 0]} />
  </group>
);
const Plant: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.25, 0.18, 0.45, 14)} c="#b8623a" p={[0, 0.22, 0]} />
    <M g={cylG(0.03, 0.04, 0.9, 6)} c="#5a3d2b" p={[0, 0.85, 0]} />
    <M g={sphG(0.42, 12)} c="#4f8a3a" tex="grass" p={[0, 1.45, 0]} />
  </group>
);
const Bust: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(0.4, 1.1, 0.4)} c="#e6dfd0" p={[0, 0.55, 0]} />
    <M g={sphG(0.16, 14)} c="#f1ece2" p={[0, 1.32, 0]} s={[0.9, 1.1, 0.95]} />
    <M g={boxG(0.34, 0.16, 0.2)} c="#f1ece2" p={[0, 1.13, 0]} />
  </group>
);
const Fresco: React.FC<{ p: V3; c: string }> = ({ p, c }) => (
  <group position={p}>
    <M g={boxG(1.6, 1.1, 0.04)} c="#a2382e" />
    <M g={boxG(1.4, 0.9, 0.05)} c={c} p={[0, 0, -0.01]} />
    <M g={sphG(0.18, 10)} c="#4f8a3a" p={[-0.35, -0.1, -0.04]} s={[1, 1, 0.2]} />
    <M g={sphG(0.12, 10)} c="#e8c25a" p={[0.4, 0.2, -0.04]} s={[1, 1, 0.2]} />
  </group>
);
const Chest: React.FC<{ p: V3; open?: boolean }> = ({ p, open }) => (
  <group position={p}>
    <M g={boxG(0.7, 0.42, 0.45)} c="#6a4428" tex="wood" p={[0, 0.21, 0]} />
    <M g={boxG(0.72, 0.05, 0.47)} c="#c9a24a" p={[0, 0.4, 0]} />
    {open ? (
      <>
        <M g={boxG(0.7, 0.04, 0.45)} c="#6a4428" p={[0, 0.62, -0.25]} r={[-1.2, 0, 0]} />
        {Array.from({ length: 10 }, (_, k) => <M key={k} g={cylG(0.045, 0.045, 0.012, 12)} c="#e8c25a" e="#5a4008" ei={0.3} p={[-0.25 + (k % 5) * 0.12, 0.44 + Math.floor(k / 5) * 0.03, -0.05 + (k % 3) * 0.06]} />)}
      </>
    ) : null}
  </group>
);
const CoinPile: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    {Array.from({ length: 14 }, (_, k) => <M key={k} g={cylG(0.045, 0.045, 0.012, 12)} c="#e8c25a" e="#5a4008" ei={0.3} p={[Math.cos(k * 2.4) * 0.12 * (k % 4) * 0.4, 0.006 + Math.floor(k / 5) * 0.013, Math.sin(k * 2.4) * 0.12 * (k % 4) * 0.4]} cast={false} />)}
  </group>
);
const Shelf: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    {[0.8, 1.5, 2.2].map((y) => <M key={y} g={boxG(1.6, 0.06, 0.35)} c="#4a3220" tex="wood" p={[0, y, 0]} />)}
    {Array.from({ length: 9 }, (_, k) => (
      <M key={k} g={cylG(0.07, 0.08, 0.2 + (k % 3) * 0.05, 10)} c={["#3a6a5a", "#8a3a2a", "#c9a24a", "#4a4a8a"][k % 4]} p={[-0.6 + (k % 3) * 0.6 + (k > 5 ? 0.15 : 0), 0.93 + Math.floor(k / 3) * 0.7, 0]} />
    ))}
  </group>
);
const Chains: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    {Array.from({ length: 7 }, (_, k) => <M key={k} g={torG(0.05, 0.012)} c="#6a6a72" p={[0, -k * 0.085, 0]} r={[0, k % 2 ? Math.PI / 2 : 0, 0]} />)}
    <M g={torG(0.12, 0.02)} c="#6a6a72" p={[0, -0.7, 0]} />
  </group>
);
const Barrel: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.32, 0.32, 0.85, 18)} c="#6a4428" tex="wood" p={[0, 0.42, 0]} s={[1, 1, 1]} />
    {[0.15, 0.7].map((y) => <M key={y} g={torG(0.325, 0.02)} c="#3a3440" p={[0, y, 0]} r={[Math.PI / 2, 0, 0]} />)}
  </group>
);
const Straw: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    {Array.from({ length: 22 }, (_, k) => <M key={k} g={boxG(0.3, 0.012, 0.02)} c="#c9a24a" p={[Math.cos(k * 2.1) * 0.5, 0.01, Math.sin(k * 1.7) * 0.4]} r={[0, k * 0.7, 0]} cast={false} />)}
  </group>
);
const BarWindow: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(0.9, 0.7, 0.05)} c="#9ab8ff" e="#4a6ab0" ei={0.9} />
    {[-0.3, -0.1, 0.1, 0.3].map((x) => <M key={x} g={boxG(0.04, 0.72, 0.08)} c="#2a2a30" p={[x, 0, -0.04]} />)}
  </group>
);
/** floating dust in the light: tiny unlit motes drifting slowly */
const Dust: React.FC<{ t: number; c?: string; n?: number }> = ({ t, c = "#ffe8c0", n = 40 }) => (
  <group>
    {Array.from({ length: n }, (_, k) => {
      const x = Math.sin(k * 12.9898) * 2.6 + Math.sin(t * 0.3 + k) * 0.15;
      const y = 0.6 + ((k * 0.37 + t * 0.06) % 2.8);
      const z = -0.4 + Math.abs(Math.sin(k * 78.233)) * 3.2;
      return <Lobe key={k} p={[x, y, z]} s={0.012 + 0.008 * (k % 3)} c={c} />;
    })}
  </group>
);

export const WorldView: React.FC<{ w: World; t: number }> = ({ w, t }) => (
  <group>
    {w.set === "hall" ? (
      <group>
        <Room wall="#6a5a5a" floor="#4a3a32" />
        <Table p={[0, 0, 0.6]} w={4.2} d={1.1} />
        <Plate p={[0, 0.82, 0.45]} />
        <Plate p={[-1.3, 0.82, 0.45]} food="#7a9a3a" />
        <Plate p={[1.3, 0.82, 0.45]} food="#b23a2a" />
        {[-1.8, -0.7, 0.7, 1.8].map((x) => <Candle key={x} p={[x, 0.82, 0.75]} t={t} />)}
        <Banner p={[-2.2, 3.2, 3.4]} c="#8e1f2e" />
        <Banner p={[2.2, 3.2, 3.4]} c="#8e1f2e" />
        <M g={boxG(1.1, 1.6, 0.6)} c="#8e1f2e" tex="fabric" p={[0, 0.8, 1.55]} />
        <M g={boxG(1.2, 2.4, 0.2)} c="#8e1f2e" tex="fabric" p={[0, 1.2, 1.9]} />
        <Roast p={[-0.7, 0.82, 0.55]} />
        <Bread p={[0.75, 0.86, 0.75]} />
        <Bread p={[-1.75, 0.86, 0.5]} />
        <FruitBowl p={[1.75, 0.82, 0.6]} />
        {[-1.0, 0.45, 1.05, -0.35].map((x) => <Goblet key={x} p={[x, 0.82, 0.3]} />)}
        <Rug p={[0, 0, 0.0]} w={5} d={3.4} c="#5a1a24" />
        <Fireplace p={[-3.6, 0, 3.3]} t={t} />
        <Pillar p={[-2.9, 0, 2.7]} c="#5a5058" />
        <Pillar p={[2.9, 0, 2.7]} c="#5a5058" />
        <WallTorch p={[-1.4, 2.3, 3.42]} t={t} />
        <WallTorch p={[1.4, 2.3, 3.42]} t={t} />
        <Chandelier p={[0, 3.3, 0.8]} t={t} />
        <Dust t={t} />
      </group>
    ) : null}
    {w.set === "roman" ? (
      <group>
        <Room wall="#e8d6b8" floor="#d8c8a8" tex="plaster" />
        {[-3, -1, 1, 3].map((x) => <Column key={x} p={[x, 0, 3.0]} />)}
        <Table p={[0, 0, 0.5]} w={2.2} d={1.0} h={0.45} c="#8a5a34" />
        {[-0.5, 0, 0.5].map((x, k) => <M key={x} g={sphG(0.08, 12)} c={["#6a2a6a", "#7a9a3a", "#c8622e"][k]} p={[x, 0.55, 0.45]} />)}
        <M g={boxG(2.2, 0.45, 0.9)} c="#8a2a3a" tex="fabric" p={[-2.4, 0.22, 0.8]} />
        <M g={boxG(2.2, 0.45, 0.9)} c="#8a2a3a" tex="fabric" p={[2.4, 0.22, 0.8]} />
        <FruitBowl p={[-0.6, 0.45, 0.6]} />
        <Goblet p={[0.75, 0.45, 0.4]} />
        <Bread p={[0.3, 0.5, 0.65]} />
        <Rug p={[0, 0, 0.4]} w={4.2} d={2.6} c="#c9a24a" trim="#2a5a8a" />
        <Amphora p={[-3.2, 0, 2.2]} />
        <Amphora p={[-2.7, 0, 2.6]} c="#9a4a2a" />
        <Plant p={[3.3, 0, 2.3]} />
        <Bust p={[2.0, 0, 3.0]} />
        <Fresco p={[-2.0, 2.4, 3.42]} c="#e8c890" />
        <Fresco p={[0.0, 2.6, 3.42]} c="#d8b880" />
        <M g={boxG(1.2, 3.6, 0.06)} c="#8a2a3a" tex="fabric" p={[-1.1, 2.2, 3.35]} />
        <M g={boxG(1.2, 3.6, 0.06)} c="#8a2a3a" tex="fabric" p={[1.1, 2.2, 3.35]} />
        <Dust t={t} c="#fff4d8" />
      </group>
    ) : null}
    {w.set === "throne" ? (
      <group>
        <Room wall="#3a3e5a" floor="#2a2c3e" />
        <M g={boxG(1.3, 0.5, 1.0)} c="#c9a24a" p={[0, 0.25, 1.6]} />
        <M g={boxG(1.3, 2.6, 0.25)} c="#1f4a7a" tex="fabric" p={[0, 1.3, 2.1]} />
        <M g={boxG(1.6, 2.4, 0.1)} c="#9ab8ff" e="#4a6ab0" ei={0.8} p={[2.8, 2.6, 3.42]} />
        <Rug p={[0, 0, 0.0]} w={1.6} d={4.0} c="#8e1f2e" />
        <M g={boxG(2.4, 0.15, 1.6)} c="#4a4e68" tex="stone" p={[0, 0.07, 1.6]} />
        <Pillar p={[-2.0, 0, 2.5]} />
        <Pillar p={[2.0, 0, 2.5]} />
        <Banner p={[-1.2, 3.4, 3.4]} c="#1f4a7a" />
        <Banner p={[1.2, 3.4, 3.4]} c="#1f4a7a" />
        <Brazier p={[-1.4, 0, 0.9]} t={t} />
        <Brazier p={[1.4, 0, 0.9]} t={t} />
        <Dust t={t} c="#c8d4ff" />
      </group>
    ) : null}
    {w.set === "vault" ? (
      <group>
        <Room wall="#2a2236" floor="#1e1828" />
        <M g={cylG(0.4, 0.5, 1.0, 24)} c="#3a2a48" p={[0, 0.5, 1.2]} />
        <M g={boxG(0.7, 0.14, 0.7)} c="#8e1f2e" tex="fabric" p={[0, 1.06, 1.2]} />
        <M g={sphG(0.12, 20)} c="#7a8a4a" e="#9ab84a" ei={0.6 + 0.4 * (w.glow ?? 0)} p={[0, 1.22, 1.2]} s={[1.2, 0.85, 1]} />
        <spotLight position={[0, 5, 0.2]} angle={0.35} penumbra={0.5} intensity={40} distance={10} decay={1.2} color="#fff0c8" />
        <Chest p={[-1.9, 0, 2.2]} open />
        <Chest p={[1.9, 0, 2.4]} />
        <CoinPile p={[-1.3, 0, 1.6]} />
        <CoinPile p={[1.4, 0, 1.7]} />
        <Shelf p={[0, 0, 3.3]} />
        {[-2.6, 2.6].map((x) => <WallTorch key={x} p={[x, 2.2, 3.42]} t={t} />)}
        {Array.from({ length: 8 }, (_, k) => <Lobe key={k} p={[Math.cos(k * 0.8 + t * 1.2) * 0.35, 1.22 + Math.sin(t * 2 + k) * 0.18, 1.2 + Math.sin(k * 0.8 + t * 1.2) * 0.35]} s={0.02} c="#d8ff9a" />)}
        <Dust t={t} c="#d8ffb0" n={30} />
      </group>
    ) : null}
    {w.set === "dungeon" ? (
      <group>
        <Room wall="#4a4048" floor="#2e2a2e" tex="brick" />
        <Noose p={[-1.6, 0, 1.6]} />
        <Table p={[1.4, 0, 1.2]} w={1.2} d={0.8} />
        {w.tipped ? (
          <group>
            <M g={cylG(0.06, 0.09, 0.14, 16)} c="#c9a24a" p={[1.25, 0.86, 1.2]} r={[0, 0, Math.PI / 2]} />
            <M g={cylG(0.18, 0.18, 0.004, 24)} c="#5fd36a" e="#1f6a26" ei={0.6} p={[1.0, 0.825, 1.2]} />
          </group>
        ) : (
          <M g={cylG(0.06, 0.09, 0.14, 16)} c="#c9a24a" p={[1.4, 0.89, 1.2]} />
        )}
        {w.stoneOnFloor ? <M g={sphG(0.07, 16)} c="#7a8a4a" e="#3a4a1a" ei={0.4} p={[0.85, 0.06, 0.75]} s={[1.2, 0.8, 1]} /> : null}
        {w.tipped ? <pointLight position={[1.0, 1.4, 0.3]} color="#ffb060" intensity={6} distance={4} decay={2} /> : null}
        <Chains p={[-0.4, 2.4, 3.42]} />
        <Chains p={[0.4, 2.4, 3.42]} />
        <Barrel p={[2.6, 0, 2.6]} />
        <Barrel p={[3.1, 0, 2.0]} />
        <Straw p={[-2.2, 0, 1.8]} />
        <BarWindow p={[-2.6, 2.8, 3.42]} />
        <M g={boxG(3, 0.1, 0.1)} c="#2a2a30" p={[0, 4.0, 3.4]} />
        <Dust t={t} c="#ffd0a0" />
        <group position={[2.8, 2.0, 3.3]}>
          <M g={cylG(0.05, 0.05, 0.4, 8)} c="#4a3220" />
          <Flame p={[0, 0.22, 0]} s={0.22} t={t} />
        </group>
      </group>
    ) : null}
    {(w.heads ?? []).map((h, i) => <Head key={i} h={h} />)}
  </group>
);
