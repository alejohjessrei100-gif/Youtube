// The sets of "Same island", drawn from world.ts: heightfield terrain with baked color and occlusion, a sea that only
// has waves in deep water (it is flat at every shore, so water can never show on land), the vessels, the camp, the
// forest, the storm, and a period chart of the island.
import React from "react";
import * as THREE from "three";
import { M, canvasTex, cylG, sphG } from "../inkbeat/core/kit";
import { toonMaterial } from "../inkbeat/mat/materials";
import type { V3 } from "../inkbeat/types";
import { Blob, Bolt, Campfire, Cask, Chest, Hut, Lobe, Rain, Rata, Rock, Spars, Spray, TallyPost, Vessel, Woodpile, geo } from "./models";
import type { Rig } from "./state";
import { BOAT_SITE, PROPS, SHIPS, TREES, WRECK_G, WRECK_I, groundAt, hash, hG, hI, inland, seaMask, ss, swell } from "./world";
import type { SetId } from "./world";

import type { WorldState } from "./state";
export type { WorldState };
const lerpC = (a: THREE.Color, b: THREE.Color, u: number) => a.clone().lerp(b, Math.min(1, Math.max(0, u)));
const C = (s: string) => new THREE.Color(s);

// ------------------------------------------------------------------ terrain: one heightfield per place, colors baked per vertex
const terrainG = (set: "G" | "I") =>
  geo(`terrain${set}`, () => {
    const [x0, x1, z0, z1, nx, nz] = set === "G" ? [-96, 96, -92, 46, 192, 138] : [-78, 78, -52, 30, 222, 117];
    const h = set === "G" ? hG : hI;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = x0 + ((x1 - x0) * i) / nx;
        const z = z0 + ((z1 - z0) * j) / nz;
        const y = h(x, z);
        pos.push(x, y, z);
        const d = inland(set, x, z);
        const slope = Math.hypot(h(x + 0.5, z) - h(x - 0.5, z), h(x, z + 0.5) - h(x, z - 0.5));
        const n = hash(i * 13.1 + j * 7.7);
        let c: THREE.Color;
        if (set === "G") {
          const gravel = lerpC(C("#8f887e"), C("#a69d90"), n);
          const turf = lerpC(C("#7d7f47"), C("#959050"), n);
          const floor = lerpC(C("#3f5634"), C("#52683c"), n);
          c = d < 0 ? C("#4b5552") : d < 1.3 ? lerpC(C("#55524f"), gravel, d / 1.3) : d < 9.5 ? gravel : d < 12 ? lerpC(gravel, turf, (d - 9.5) / 2.5) : d < 21 ? turf : lerpC(turf, floor, (d - 21) / 6);
          const rocky = ss(24, 34, Math.abs(x)) * ss(0.5, 4, d) * (1 - ss(14, 26, d));
          c = lerpC(c, lerpC(C("#55545c"), C("#6a6870"), n), Math.max(rocky, ss(0.9, 1.6, slope)));
          c.multiplyScalar(1 - 0.22 * ss(0.5, 1.4, slope));
        } else {
          const band = 0.5 + 0.5 * Math.sin(y * 0.9 + Math.sin(x * 2.3) * 1.5);
          const face = lerpC(C("#2b2c35"), C("#474955"), band).multiplyScalar(0.86 + 0.14 * Math.sign(Math.sin(x * 2.6)));
          const ledge = lerpC(C("#3e414c"), C("#525563"), n);
          const top = lerpC(C("#5f6a40"), C("#77804a"), n);
          c = d < 0 ? C("#22262e") : d < 1.4 ? lerpC(C("#262830"), ledge, d / 1.4) : d < 6.8 ? ledge : d < 10.6 ? face : lerpC(face, top, ss(10.6, 12.5, d));
          // baked occlusion: the foot of the cliff is the darkest place on the ledge
          c.multiplyScalar(1 - 0.42 * ss(4.6, 7, d) * (1 - ss(7, 9.5, d)));
        }
        col.push(c.r, c.g, c.b);
      }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i;
        idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
const Terrain: React.FC<{ set: "G" | "I" }> = ({ set }) => (
  <mesh geometry={terrainG(set)} material={toonMaterial({ color: "#ffffff", tex: "rock", texScale: 0.6, vertexColors: true })} receiveShadow castShadow={set === "I"} />
);

// ------------------------------------------------------------------ sea: depth-colored, foam on the crests, flat at the shore
const SEA_N = 280;
const SEA_W = 360;
const seaG = (set: SetId) =>
  geo(`sea${set}`, () => {
    const g = new THREE.PlaneGeometry(SEA_W, SEA_W, SEA_N, SEA_N).rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const shallow = new Float32Array(p.count);
    const mask = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      shallow[i] = 1 - ss(0.2, 5, -groundAt(set, p.getX(i), p.getZ(i)));
      mask[i] = seaMask(set, p.getX(i), p.getZ(i));
    }
    g.userData.shallow = shallow;
    g.userData.mask = mask;
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(p.count * 3), 3));
    return g;
  });
const Sea: React.FC<{ set: SetId; t: number; k: number }> = ({ set, t, k }) => {
  const g = seaG(set);
  const p = g.attributes.position as THREE.BufferAttribute;
  const c = g.attributes.color as THREE.BufferAttribute;
  const sh = g.userData.shallow as Float32Array;
  const mk = g.userData.mask as Float32Array;
  const deep = set === "G" ? C("#244a66") : C("#143a52");
  const lite = set === "G" ? C("#5b86a8") : C("#285a6e");
  const foam = C("#d7ebec");
  for (let i = 0; i < p.count; i++) {
    const y = mk[i] === 0 ? 0 : mk[i] * swell(p.getX(i), p.getZ(i), t, k);
    p.setY(i, y);
    const crest = ss(0.7, 0.8, y / Math.max(0.6, k)) * 0.5;
    c.setXYZ(i, deep.r + (lite.r - deep.r) * sh[i] + (foam.r - deep.r) * crest, deep.g + (lite.g - deep.g) * sh[i] + (foam.g - deep.g) * crest, deep.b + (lite.b - deep.b) * sh[i] + (foam.b - deep.b) * crest);
  }
  p.needsUpdate = true;
  c.needsUpdate = true;
  g.computeVertexNormals();
  return <mesh geometry={g} material={toonMaterial({ color: "#ffffff", vertexColors: true })} receiveShadow />;
};
/** the surf line: thin white lobes on the waterline, sliding a little with t */
const Surf: React.FC<{ set: "G" | "I"; t: number; k: number }> = ({ set, t, k }) => {
  const [x0, x1] = set === "G" ? [-23, 23] : [-34, 34];
  const n = Math.round((x1 - x0) / 1.4);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + ((i + 0.5) / n) * (x1 - x0);
        const shore = set === "G" ? 0 : 1.5 * Math.sin(x * 0.18);
        const z = shore + 0.3 + (0.12 + 0.05 * k) * Math.sin(t * 0.9 + i * 1.7);
        return <Lobe key={i} p={[x, 0.02, z]} s={[0.66 + 0.16 * Math.sin(i * 2.1), 0.024, 0.14 + 0.05 * k]} c="#dfe9ee" />;
      })}
    </>
  );
};

// ------------------------------------------------------------------ the chart: a period survey sheet of Auckland Island (stylized)
export const CHART = { w: 9, h: 16, grafton: [0.475, 0.7] as [number, number], invercauld: [0.305, 0.115] as [number, number] };
export const chartXY = (u: number, v: number): V3 => [(u - 0.5) * CHART.w, (0.5 - v) * CHART.h, 0];
const MAIN: [number, number][] = [
  [0.3, 0.1], [0.38, 0.085], [0.47, 0.095], [0.53, 0.12], [0.5, 0.15], [0.55, 0.18], [0.62, 0.17], [0.66, 0.2], [0.62, 0.24], [0.68, 0.27], [0.72, 0.32], [0.68, 0.37], [0.73, 0.42], [0.7, 0.48],
  [0.74, 0.54], [0.7, 0.6], [0.73, 0.66], [0.68, 0.71], [0.7, 0.75], [0.62, 0.77], [0.55, 0.76], [0.5, 0.725], [0.46, 0.715], [0.43, 0.755], [0.36, 0.79], [0.3, 0.8], [0.25, 0.79],
  [0.24, 0.65], [0.25, 0.5], [0.26, 0.35], [0.27, 0.22],
];
const ADAMS: [number, number][] = [[0.24, 0.83], [0.34, 0.825], [0.46, 0.815], [0.58, 0.82], [0.68, 0.825], [0.7, 0.86], [0.6, 0.9], [0.45, 0.91], [0.3, 0.89], [0.23, 0.86]];
/** a closed smooth path through the points (quadratic curves through the midpoints) */
const smoothPath = (g: CanvasRenderingContext2D, pts: [number, number][], W: number, H: number) => {
  const n = pts.length;
  const P = (i: number) => pts[(i + n) % n];
  g.beginPath();
  g.moveTo(((P(0)[0] + P(1)[0]) / 2) * W, ((P(0)[1] + P(1)[1]) / 2) * H);
  for (let i = 1; i <= n; i++) g.quadraticCurveTo(P(i)[0] * W, P(i)[1] * H, ((P(i)[0] + P(i + 1)[0]) / 2) * W, ((P(i)[1] + P(i + 1)[1]) / 2) * H);
  g.closePath();
};
const chartTex = () =>
  canvasTex("chart2", 1152, 2048, (g, W, H) => {
    const bg = g.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, H * 0.62);
    bg.addColorStop(0, "#e8dcba");
    bg.addColorStop(1, "#bfa879");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // a sea wash: the water around the land is a cooler, greyer paper tone
    g.strokeStyle = "rgba(80,100,110,0.10)";
    g.lineWidth = 2;
    for (let i = 1; i < 9; i++) {
      g.beginPath();
      g.moveTo((i * W) / 9, 0);
      g.lineTo((i * W) / 9, H);
      g.stroke();
    }
    for (let i = 1; i < 16; i++) {
      g.beginPath();
      g.moveTo(0, (i * H) / 16);
      g.lineTo(W, (i * H) / 16);
      g.stroke();
    }
    const land = (pts: [number, number][]) => {
      // coast ripples (three offset strokes), then the land and its inked outline
      for (const [w, a] of [[78, 0.07], [46, 0.1], [22, 0.14]] as [number, number][]) {
        smoothPath(g, pts, W, H);
        g.strokeStyle = `rgba(70,95,105,${a})`;
        g.lineWidth = w;
        g.lineJoin = "round";
        g.stroke();
      }
      smoothPath(g, pts, W, H);
      g.fillStyle = "#c2ae78";
      g.fill();
      g.strokeStyle = "#35281a";
      g.lineWidth = 8;
      g.stroke();
    };
    land(MAIN);
    land(ADAMS);
    g.beginPath();
    g.ellipse(0.665 * W, 0.075 * H, 0.035 * W, 0.012 * H, 0.3, 0, Math.PI * 2);
    g.fillStyle = "#c2ae78";
    g.fill();
    g.stroke();
    // hill hachures down the spine and short strokes along the cliff coast
    g.strokeStyle = "rgba(53,40,26,0.55)";
    g.lineWidth = 5;
    for (let i = 0; i < 26; i++) {
      const v = 0.17 + i * 0.022;
      const u = 0.46 + 0.04 * Math.sin(i * 1.3);
      g.beginPath();
      g.moveTo(u * W - 26, v * H + 12);
      g.lineTo(u * W, v * H - 14);
      g.lineTo(u * W + 26, v * H + 12);
      g.stroke();
    }
    g.lineWidth = 4;
    for (let i = 0; i < 44; i++) {
      const v = 0.12 + i * 0.0145;
      g.beginPath();
      g.moveTo(0.262 * W, v * H);
      g.lineTo(0.262 * W + 22, v * H + 4);
      g.stroke();
    }
    g.fillStyle = "#35281a";
    g.textAlign = "center";
    g.font = "800 62px Poppins";
    g.fillText("AUCKLAND ISLAND", W * 0.5, H * 0.045);
    g.font = "700 30px Poppins";
    g.fillText("CARNLEY HARBOUR", W * 0.5, H * 0.815);
    g.fillText("SOUTHERN OCEAN", W * 0.13, H * 0.45);
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(W * 0.88, H * 0.95);
    g.lineTo(W * 0.88, H * 0.9);
    g.lineTo(W * 0.865, H * 0.915);
    g.moveTo(W * 0.88, H * 0.9);
    g.lineTo(W * 0.895, H * 0.915);
    g.stroke();
    g.font = "800 34px Poppins";
    g.fillText("N", W * 0.88, H * 0.89);
  });
const Mark: React.FC<{ uv: [number, number]; a: number; t: number }> = ({ uv, a, t }) => {
  if (a <= 0.01) return null;
  const p = chartXY(uv[0], uv[1]);
  const s = (0.9 + 0.25 * Math.max(0, 1 - a) + 0.05 * Math.sin(t * 6)) * Math.min(1, a * 1.4);
  return (
    <group position={[p[0], p[1], 0.03]} scale={s}>
      {[0.785, -0.785].map((r) => (
        <mesh key={r} rotation={[0, 0, r]} userData={{ outline: false }}>
          <planeGeometry args={[0.9, 0.2]} />
          <meshBasicMaterial color="#b3261e" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};
const Chart: React.FC<{ s: NonNullable<WorldState["chart"]>; t: number }> = ({ s, t }) => {
  const a = chartXY(...CHART.grafton);
  const b = chartXY(...CHART.invercauld);
  const n = 22;
  return (
    <group>
      <mesh userData={{ outline: false }}>
        <planeGeometry args={[CHART.w, CHART.h]} />
        <meshBasicMaterial map={chartTex()} toneMapped={false} />
      </mesh>
      {/* the route, dash by dash from the Grafton to the Invercauld */}
      {Array.from({ length: n }, (_, i) => {
        const u = (i + 0.5) / n;
        if (u > s.route || u < 0.06 || u > 0.94) return null;
        return (
          <mesh key={i} position={[a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0.02]} rotation={[0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])]} userData={{ outline: false }}>
            <planeGeometry args={[0.3, 0.09]} />
            <meshBasicMaterial color="#7a1a14" toneMapped={false} />
          </mesh>
        );
      })}
      <Mark uv={CHART.grafton} a={s.grafton} t={t} />
      <Mark uv={CHART.invercauld} a={s.invercauld} t={t + 1} />
    </group>
  );
};

// ------------------------------------------------------------------ the worlds
const WRECK_G_RIG: Rig = { kind: "schooner", sails: 0, fall: [1.25, 0.12], stump: [1, 1] };
const WRECK_I_RIG: Rig = { kind: "ship", sails: 0, fall: [0.9, 1.3, 0.4], stump: [0.34, 0.2, 0.42] };
const SetG: React.FC<{ s: WorldState; t: number }> = ({ s, t }) => {
  const G = (x: number, z: number): V3 => [x, hG(x, z), z];
  const boat = s.boat ?? "none";
  return (
    <>
      <Terrain set="G" />
      <Surf set="G" t={t} k={s.swell} />
      {/* across the harbour: the far shore and Adams Island (background depth) */}
      <M g={sphG(1, 24)} c="#3f5246" tex="grass" p={[-60, -8, 215]} s={[150, 46, 40]} cast={false} />
      <M g={sphG(1, 24)} c="#4a5c50" tex="grass" p={[120, -6, 190]} s={[110, 34, 36]} cast={false} />
      {TREES.map((tr, i) => (
        <Rata key={i} p={G(tr.x, tr.z)} s={tr.s} yaw={tr.yaw} bloom={tr.bloom} />
      ))}
      {s.grafton === "wreck" ? <Vessel hull={SHIPS.grafton} pose={WRECK_G} rig={WRECK_G_RIG} /> : s.grafton && s.grafton !== "none" ? <Vessel hull={SHIPS.grafton} pose={s.grafton.pose} rig={s.grafton.rig} /> : null}
      {(s.hut ?? -1) >= 0 ? <Hut y={hG(-7, -15)} build={s.hut} lit={s.hutLit ?? 0} /> : null}
      {PROPS.filter((p) => p.set === "G").map((p, i) => {
        const at = G(p.x, p.z);
        const camp = (s.hut ?? -1) >= 0;
        switch (p.kind) {
          case "fire":
            return (s.fire ?? 0) > 0 ? <Campfire key={i} p={at} t={t} k={s.fire} /> : null;
          case "rock":
            return <Rock key={i} p={at} r={p.r} h={p.h} yaw={p.yaw} />;
          case "spars":
            return camp && (s.hut ?? 0) < 0.3 ? <Spars key={i} p={at} len={p.len ?? 4} yaw={p.yaw} /> : null;
          case "cask":
            return camp ? <React.Fragment key={i}><Blob p={at} r={0.7} /><Cask p={at} /></React.Fragment> : null;
          case "chest":
            return camp ? <React.Fragment key={i}><Blob p={at} r={0.8} /><Chest p={at} yaw={p.yaw} /></React.Fragment> : null;
          case "woodpile":
            return camp && (s.hut ?? 0) >= 1 ? <React.Fragment key={i}><Blob p={at} r={1.1} /><Woodpile p={at} yaw={p.yaw} /></React.Fragment> : null;
          case "tally":
            return camp && (s.hut ?? 0) >= 1 ? <TallyPost key={i} p={at} /> : null;
        }
      })}
      {typeof boat === "object" && "built" in boat ? (
        <group position={G(BOAT_SITE.x, BOAT_SITE.z)} rotation={[0, BOAT_SITE.yaw, 0]}>
          <Blob p={[0, 0, 0]} r={2.6} />
          {[-1.3, 1.3].map((x) => (
            <group key={x} position={[x, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <M g={cylG(0.18, 0.18, 1.3, 10)} c="#7a6248" tex="wood" />
            </group>
          ))}
          <Vessel hull={SHIPS.boat} pose={{ x: 0, y: 0.3, z: 0, yaw: 0, pitch: 0, roll: 0 }} rig={{ kind: "boat", stump: [boat.built >= 1 ? 1 : 0.001] }} color="#86613f" />
        </group>
      ) : typeof boat === "object" ? (
        <Vessel hull={SHIPS.boat} pose={boat} rig={{ kind: "boat" }} color="#86613f" />
      ) : null}
    </>
  );
};
const SetI: React.FC<{ s: WorldState; t: number }> = ({ s, t }) => {
  const G = (x: number, z: number): V3 => [x, hI(x, z), z];
  return (
    <>
      <Terrain set="I" />
      <Surf set="I" t={t} k={s.swell} />
      {/* sea stacks off the cliffs */}
      <M g={cylG(2.2, 3.6, 17, 7)} c="#30313a" tex="rock" p={[-27, 6.5, 17]} />
      <M g={cylG(1.5, 2.8, 11, 7)} c="#363742" tex="rock" p={[31, 4, 24]} />
      {s.invercauld === "wreck" ? <Vessel hull={SHIPS.invercauld} pose={WRECK_I} rig={WRECK_I_RIG} /> : s.invercauld && s.invercauld !== "none" ? <Vessel hull={SHIPS.invercauld} pose={s.invercauld.pose} rig={s.invercauld.rig} /> : null}
      {PROPS.filter((p) => p.set === "I").map((p, i) => {
        const at = G(p.x, p.z);
        return p.kind === "rock" ? <Rock key={i} p={at} r={p.r} h={p.h} yaw={p.yaw} c="#3c3e48" /> : p.kind === "spars" ? <Spars key={i} p={at} len={p.len ?? 4} yaw={p.yaw} /> : p.kind === "cask" ? <group key={i} position={[at[0], at[1] + 0.34, at[2]]} rotation={[0, 0.6, Math.PI / 2]}><Cask p={[0, -0.45, 0]} /></group> : null;
      })}
    </>
  );
};

/** the world of one frame */
export const World: React.FC<{ s: WorldState; t: number; cam: { pos: V3; look: V3 } }> = ({ s, t, cam }) => (
  <>
    {s.set === "MAP" ? (
      <Chart s={s.chart ?? { grafton: 1, invercauld: 1, route: 0 }} t={t} />
    ) : (
      <>
        <Sea set={s.set} t={t} k={s.swell} />
        {s.set === "G" ? <SetG s={s} t={t} /> : s.set === "I" ? <SetI s={s} t={t} /> : typeof s.boat === "object" && !("built" in s.boat) ? <Vessel hull={SHIPS.boat} pose={s.boat} rig={{ kind: "boat" }} color="#86613f" /> : null}
        {(s.rain ?? 0) > 0 ? <Rain cam={cam} t={t} n={Math.round(260 * (s.rain ?? 0))} /> : null}
        {s.bolt ? <Bolt p={s.bolt} h={70} a={s.flash ?? 0} /> : null}
        {(s.spray ?? []).map((sp, i) => (
          <Spray key={i} p={sp.p} t={t} t0={sp.t0} s={sp.s} period={sp.period} seed={sp.seed ?? i * 17} n={Math.round(30 + 12 * sp.s)} />
        ))}
        {s.spar ? (
          <group position={[(s.spar.a[0] + s.spar.b[0]) / 2, (s.spar.a[1] + s.spar.b[1]) / 2, (s.spar.a[2] + s.spar.b[2]) / 2]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(s.spar.b[0] - s.spar.a[0], s.spar.b[1] - s.spar.a[1], s.spar.b[2] - s.spar.a[2]).normalize())}>
            <M g={cylG(0.09, 0.11, Math.hypot(s.spar.b[0] - s.spar.a[0], s.spar.b[1] - s.spar.a[1], s.spar.b[2] - s.spar.a[2]), 8)} c="#7a5a3c" tex="wood" />
          </group>
        ) : null}
      </>
    )}
  </>
);
