// Sets of the poison short. All centred near the origin, cameras look toward +z (back walls at z ~ 3.5).
import React from "react";
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
      </group>
    ) : null}
    {w.set === "throne" ? (
      <group>
        <Room wall="#3a3e5a" floor="#2a2c3e" />
        <M g={boxG(1.3, 0.5, 1.0)} c="#c9a24a" p={[0, 0.25, 1.6]} />
        <M g={boxG(1.3, 2.6, 0.25)} c="#1f4a7a" tex="fabric" p={[0, 1.3, 2.1]} />
        <M g={boxG(1.6, 2.4, 0.1)} c="#9ab8ff" e="#4a6ab0" ei={0.8} p={[2.8, 2.6, 3.42]} />
        {[-2.4, 2.4].map((x) => <Candle key={x} p={[x, 0, 1.5]} t={t} />)}
      </group>
    ) : null}
    {w.set === "vault" ? (
      <group>
        <Room wall="#2a2236" floor="#1e1828" />
        <M g={cylG(0.4, 0.5, 1.0, 24)} c="#3a2a48" p={[0, 0.5, 1.2]} />
        <M g={boxG(0.7, 0.14, 0.7)} c="#8e1f2e" tex="fabric" p={[0, 1.06, 1.2]} />
        <M g={sphG(0.12, 20)} c="#7a8a4a" e="#9ab84a" ei={0.6 + 0.4 * (w.glow ?? 0)} p={[0, 1.22, 1.2]} s={[1.2, 0.85, 1]} />
        <spotLight position={[0, 5, 0.2]} angle={0.35} penumbra={0.5} intensity={40} distance={10} decay={1.2} color="#fff0c8" />
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
        <group position={[2.8, 2.0, 3.3]}>
          <M g={cylG(0.05, 0.05, 0.4, 8)} c="#4a3220" />
          <Flame p={[0, 0.22, 0]} s={0.22} t={t} />
        </group>
      </group>
    ) : null}
    {(w.heads ?? []).map((h, i) => <Head key={i} h={h} />)}
  </group>
);
