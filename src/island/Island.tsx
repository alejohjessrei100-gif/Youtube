// The island set for "Same island": one cold sub-antarctic island with two camps that never meet.
//   Grafton cove (west, x < 0): a sheltered beach, the Grafton wreck in the shallows, a stone-chimneyed hut, a fire,
//   a half-built boat. Invercauld shore (east, x > 0): a rocky beach, a broken wreck in the surf.
//   A grassy ridge between them (a signpost "40 KM" on its slope). Sea level y = 0; the land top is y = LAND.
// Everything is a pure function of t (waves, fire, smoke): no state, no randomness.
import React from "react";
import * as THREE from "three";
import { Flame, Label, M, boxG, coneG, cylG, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";

export const LAND = 0.3;
export const GRAFTON: V3 = [-28, LAND, 2]; // camp center (hut front)
export const INVER: V3 = [30, LAND, 7]; // Invercauld landing
export const BEACH_SLOPE = 0.05;
export const RIDGE = { c: [0, LAND, -4] as V3, r: [16, 9, 22] as V3 };
/** ground height: the ridge (an ellipsoid hill), the flat land, or the beach sloping into the sea (z > 8) */
export const groundAt = (x: number, z: number) => {
  const dx = (x - RIDGE.c[0]) / RIDGE.r[0];
  const dz = (z - RIDGE.c[2]) / RIDGE.r[2];
  const k = 1 - dx * dx - dz * dz;
  const base = z > 8 ? LAND - (z - 8) * BEACH_SLOPE : LAND;
  return k > 0 ? Math.max(base, LAND + RIDGE.r[1] * Math.sqrt(k)) : base;
};

const D2R = Math.PI / 180;

// ------------------------------------------------------------------ sea: a toon water sheet with rolling swell and foam
const seaGeo = (() => {
  let g: THREE.PlaneGeometry | null = null;
  return () => (g ??= new THREE.PlaneGeometry(600, 600, 160, 160).rotateX(-Math.PI / 2) as THREE.PlaneGeometry);
})();
const seaH = (x: number, z: number, t: number, k: number) =>
  k * (0.16 * Math.sin(x * 0.21 + t * 0.9) + 0.12 * Math.sin(z * 0.33 - t * 1.1 + x * 0.05) + 0.06 * Math.sin((x + z) * 0.7 + t * 1.7));
/** the sea; swell k (1 calm, 2.5 stormy). The geometry is rewritten from t each frame (a pure function of t). */
export const Sea: React.FC<{ t: number; k?: number; color?: string }> = ({ t, k = 1, color = "#245a72" }) => {
  const g = seaGeo();
  const p = g.attributes.position as THREE.BufferAttribute;
  const src = (g.userData.src ??= Float32Array.from(p.array as Float32Array)) as Float32Array;
  for (let i = 0; i < p.count; i++) {
    const x = src[i * 3];
    const z = src[i * 3 + 2];
    p.setY(i, seaH(x, z, t, k));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return <M g={g} c={color} p={[0, 0, 0]} cast={false} />;
};
/** a line of foam along a shore: flattened white lobes that slide in and out with t */
export const Foam: React.FC<{ p: V3; w: number; yaw?: number; t: number; seed?: number }> = ({ p, w, yaw = 0, t, seed = 0 }) => {
  const n = Math.max(4, Math.round(w / 1.6));
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const u = i / (n - 1) - 0.5;
        const ph = t * 0.8 + i * 1.7 + seed;
        return <M key={i} g={sphG(1, 16)} c="#dfeeee" p={[u * w, 0.03 + seaH(p[0] + u * w, p[2], t, 1), Math.sin(ph) * 0.5]} s={[0.9 + 0.3 * Math.sin(i * 2.1 + seed), 0.035, 0.22]} cast={false} />;
      })}
    </group>
  );
};

// ------------------------------------------------------------------ land
const Rock: React.FC<{ p: V3; s: number; yaw?: number; c?: string }> = ({ p, s, yaw = 0, c = "#6d6a72" }) => (
  <M g={sphG(1, 9)} c={c} tex="rock" p={p} r={[0.3, yaw, 0.2]} s={[s * 1.3, s * 0.8, s]} />
);
const Tussock: React.FC<{ p: V3; s?: number }> = ({ p, s = 1 }) => (
  <group position={p} scale={s}>
    <M g={coneG(0.45, 0.9, 7)} c="#7f8f4e" tex="grass" p={[0, 0.4, 0]} />
    <M g={coneG(0.35, 0.75, 7)} c="#93a35a" tex="grass" p={[0.25, 0.33, 0.12]} r={[0, 0, -0.3]} />
    <M g={coneG(0.3, 0.7, 7)} c="#6f8045" tex="grass" p={[-0.22, 0.3, -0.05]} r={[0, 0, 0.35]} />
  </group>
);
export const Land: React.FC = () => (
  <>
    {/* the main land, a beach slope down to the sea on the south (+z) side */}
    <M g={boxG(140, 2, 70)} c="#6f7f47" tex="grass" p={[0, LAND - 1, -27]} />
    {/* beach: from the land edge (z = 8, y = LAND) down 5 cm per meter into the sea (waterline near z = 14) */}
    <M g={boxG(140, 0.6, 24)} c="#cdb88e" tex="sand" p={[0, LAND - 0.3 - 12 * BEACH_SLOPE, 8 + 12]} r={[Math.atan(BEACH_SLOPE), 0, 0]} />
    {/* the ridge between the camps, and hills behind */}
    <M g={sphG(1, 40)} c="#77884c" tex="grass" p={RIDGE.c} s={RIDGE.r} />
    <M g={sphG(1, 28)} c="#6f8048" tex="grass" p={[RIDGE.c[0] - 9, LAND, RIDGE.c[2] - 8]} s={[11, 6.5, 13]} />
    <M g={sphG(1, 28)} c="#7a8b50" tex="grass" p={[RIDGE.c[0] + 10, LAND, RIDGE.c[2] - 4]} s={[10, 5.5, 14]} />
    {([[-2, 6.5], [3, 2], [-5, -6], [6, -10], [1, -14]] as [number, number][]).map(([x, z], i) => (
      <Rock key={`c${i}`} p={[x, groundAt(x, z) - 0.3, z]} s={1.4 + (i % 3) * 0.6} yaw={i * 2.1} c="#6a666e" />
    ))}
    <M g={sphG(1, 32)} c="#6c7c46" tex="grass" p={[-38, LAND, -40]} s={[34, 16, 18]} />
    <M g={sphG(1, 32)} c="#667545" tex="grass" p={[30, LAND, -44]} s={[38, 20, 20]} />
    <M g={sphG(1, 28)} c="#5f6f43" tex="grass" p={[0, LAND, -62]} s={[60, 26, 16]} />
    {/* rock outcrops and tussocks */}
    {(
      [
        [-6, 2], [5, -9], [-3, -16], [9, 3], [-40, 9], [-17, 8], [18, 9], [41, 10], [36, 2], [22, -6], [-34, -8], [-21, -6],
      ] as [number, number][]
    ).map(([x, z], i) => (
      <Rock key={i} p={[x, groundAt(x, z), z]} s={0.9 + (i % 4) * 0.45} yaw={i * 1.3} />
    ))}
    {(
      [
        [-33, 5], [-22, 6], [-30, -3], [-19, 0], [-25, -6], [-36, 1], [25, 4], [35, 5], [27, -2], [38, -3], [3, 6], [-4, 8], [11, -4], [-12, 4],
      ] as [number, number][]
    ).map(([x, z], i) => (
      <Tussock key={i} p={[x, groundAt(x, z), z]} s={0.9 + (i % 3) * 0.3} />
    ))}
  </>
);

// ------------------------------------------------------------------ wrecks
/** a wooden hull lying in the shallows, heeled over; broken = snapped in two with ribs showing */
export const Wreck: React.FC<{ p: V3; yaw?: number; heel?: number; broken?: boolean; tag?: string; len?: number }> = ({ p, yaw = 0, heel = 22, broken = false, tag, len = 14 }) => {
  const L = broken ? len * 0.6 : len;
  return (
    <group position={p} rotation={[0, yaw, heel * D2R]}>
      {/* the hull: a half barrel along x */}
      <M g={cylG(1.9, 1.9, L, 28, false, 0, Math.PI)} c="#5a3b28" tex="planks" p={[0, 1.1, 0]} r={[0, 0, -Math.PI / 2]} s={[1, 1, 0.75]} />
      <M g={boxG(L * 0.96, 0.18, 2.8)} c="#8a6a48" tex="planks" p={[0, 1.15, 0]} />
      {/* a stub of mast and a spar */}
      <M g={cylG(0.16, 0.2, broken ? 3 : 4.6, 10)} c="#6b4a32" tex="wood" p={[L * 0.1, broken ? 2.6 : 3.4, 0]} r={[0, 0, broken ? 0.5 : 0.08]} />
      {!broken ? <M g={cylG(0.09, 0.09, 3.2, 8)} c="#6b4a32" tex="wood" p={[L * 0.1 + 0.9, 3.3, 0.6]} r={[0.5, 0, 0.35]} /> : null}
      {broken
        ? Array.from({ length: 6 }, (_, i) => (
            <M key={i} g={torG(1.8, 0.09, Math.PI)} c="#4e3424" tex="wood" p={[L / 2 + 0.5 + i * 0.7, 1.1, 0]} r={[0, Math.PI / 2, Math.PI]} />
          ))
        : null}
      {/* a few loose planks and a barrel nearby */}
      <M g={boxG(2.4, 0.08, 0.3)} c="#8a6a48" tex="planks" p={[-L * 0.35, 0.3, 2.4]} r={[0, 0.6, -heel * D2R]} />
      <M g={cylG(0.42, 0.42, 1.0, 16)} c="#7a5536" tex="wood" p={[-L * 0.42, 0.5, -2.2]} r={[0.4, 0, -heel * D2R + 1.2]} />
      {tag ? (
        // the year painted on a broken hull board: unlit stencil paint so no light washes it out
        <group position={[-L * 0.18, 1.55, 1.48]} rotation={[0, 0, -0.04]}>
          <M g={boxG(3.2, 1.1, 0.12)} c="#b49a72" tex="planks" p={[0, 0, 0]} />
          <Label text={tag} p={[0, 0, 0.07]} w={3.0} h={1.0} fg="#f6efe0" bg="none" font={0.8} />
        </group>
      ) : null}
    </group>
  );
};

/** thin translucent smoke: small grey puffs drifting up and leaning downwind (never solid balls) */
export const Wisp: React.FC<{ p: V3; t: number; s?: number; n?: number; seed?: number }> = ({ p, t, s = 1, n = 6, seed = 0 }) => (
  <group position={p} scale={s}>
    {Array.from({ length: n }, (_, i) => {
      const u = (t * 0.22 + i / n + seed * 0.13) % 1;
      return <M key={i} g={sphG(0.5, 12)} c="#b9b4b8" op={0.5 * (1 - u)} p={[u * 1.6 + Math.sin(i * 2.3 + seed) * 0.12, u * 3.2, Math.cos(i * 1.7 + seed) * 0.1]} s={0.25 + u * 0.7} cast={false} />;
    })}
  </group>
);

// ------------------------------------------------------------------ the Grafton camp
/** the castaways' hut: plank walls, a turf-and-shingle roof, a stone chimney, a door with "5 MEN", a lit window */
export const Hut: React.FC<{ p: V3; yaw?: number; lit?: number; tag?: string; t?: number }> = ({ p, yaw = 0, lit = 1, tag, t = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(4.4, 2.3, 3.4)} c="#7b5a3c" tex="planks" p={[0, 1.15, 0]} />
    {/* roof: two slopes */}
    <M g={boxG(5.0, 0.22, 2.3)} c="#5d5a3e" tex="shingles" p={[0, 2.85, 0.85]} r={[0.6, 0, 0]} />
    <M g={boxG(5.0, 0.22, 2.3)} c="#5d5a3e" tex="shingles" p={[0, 2.85, -0.85]} r={[-0.6, 0, 0]} />
    <M g={boxG(4.4, 1.0, 0.1)} c="#7b5a3c" tex="planks" p={[0, 2.6, 1.68]} />
    {/* stone chimney with smoke */}
    <M g={boxG(0.8, 3.6, 0.8)} c="#77737a" tex="stone" p={[-2.5, 1.8, -0.4]} />
    <Wisp p={[-2.5, 3.7, -0.4]} t={t} s={0.8} seed={1} />
    {/* door + tag */}
    <M g={boxG(0.95, 1.9, 0.08)} c="#5a3d29" tex="planks" p={[0.7, 0.95, 1.72]} />
    <M g={sphG(0.05, 8)} c="#c99f4b" p={[1.05, 0.95, 1.78]} />
    {tag ? <Label text={tag} p={[0.7, 1.32, 1.77]} w={0.9} h={0.42} fg="#f6efe0" bg="none" font={0.75} /> : null}
    {/* window with a warm glow behind */}
    <M g={boxG(0.9, 0.7, 0.08)} c="#4a3324" tex="wood" p={[-1.0, 1.35, 1.72]} />
    <mesh position={[-1.0, 1.35, 1.77]}>
      <planeGeometry args={[0.72, 0.52]} />
      <meshBasicMaterial color={new THREE.Color("#ffb45a").multiplyScalar(0.55 + 0.45 * lit)} toneMapped={false} />
    </mesh>
    <M g={boxG(0.06, 0.56, 0.06)} c="#4a3324" p={[-1.0, 1.35, 1.8]} />
    {lit > 0 ? <pointLight position={[-1.0, 1.35, 2.4]} color="#ffa040" intensity={2.5 * lit} distance={5} decay={2} /> : null}
    {/* stacked firewood and a water barrel */}
    {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
      <M key={`${r}${c}`} g={cylG(0.11, 0.11, 1.1, 8)} c={c % 2 ? "#8a6440" : "#7a5534"} tex="wood" p={[2.6, 0.12 + r * 0.21, -1.0 + c * 0.24 + (r % 2) * 0.1]} r={[Math.PI / 2, 0, 0]} />
    )))}
    <M g={cylG(0.38, 0.38, 0.9, 16)} c="#6f4c30" tex="wood" p={[2.5, 0.45, 1.2]} />
  </group>
);
/** a fire ring with a pot on a tripod; flame and smoke from t */
export const Campfire: React.FC<{ p: V3; t: number; s?: number }> = ({ p, t, s = 1 }) => (
  <group position={p} scale={s}>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return <Rock key={i} p={[Math.cos(a) * 0.65, 0.08, Math.sin(a) * 0.65]} s={0.17} yaw={i} />;
    })}
    <Flame p={[0, 0.02, 0]} s={0.42} t={t} seed={2} />
    {/* tripod and pot */}
    {[0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2;
      return <M key={i} g={cylG(0.03, 0.03, 1.7, 6)} c="#5a3d29" tex="wood" p={[Math.cos(a) * 0.45, 0.78, Math.sin(a) * 0.45]} r={[Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32]} />;
    })}
    <M g={cylG(0.28, 0.22, 0.32, 16)} c="#2d2c33" tex="metal" p={[0, 0.78, 0]} />
    <Wisp p={[0, 1.0, 0]} t={t} s={0.6} seed={4} n={5} />
  </group>
);
/** a small boat; built = 0..1 (ribs only → planked); in the water it bobs with t */
export const Boat: React.FC<{ p: V3; yaw?: number; built?: number; t?: number; afloat?: boolean }> = ({ p, yaw = 0, built = 1, t = 0, afloat = false }) => {
  const bob = afloat ? 0.12 * Math.sin(t * 1.3) : 0;
  const roll = afloat ? 0.08 * Math.sin(t * 1.1 + 0.6) : 0;
  return (
    <group position={[p[0], p[1] + bob, p[2]]} rotation={[roll, yaw, 0]}>
      {built > 0.3 ? <M g={cylG(0.8, 0.8, 3.6, 22, false, 0, Math.PI)} c="#86613f" tex="planks" p={[0, 0.62, 0]} r={[0, 0, -Math.PI / 2]} s={[1, 1, 0.55]} /> : null}
      {Array.from({ length: 6 }, (_, i) => (
        <M key={i} g={torG(0.78, 0.05, Math.PI)} c="#6b4a32" tex="wood" p={[-1.5 + i * 0.6, 0.62, 0]} r={[0, Math.PI / 2, Math.PI]} s={[1, 1, 0.56]} />
      ))}
      <M g={boxG(3.9, 0.12, 0.14)} c="#6b4a32" tex="wood" p={[0, 0.1, 0]} />
      {built > 0.8 ? <M g={boxG(0.3, 0.06, 1.0)} c="#9a7550" tex="planks" p={[0.3, 0.6, 0]} /> : null}
      {afloat ? <M g={cylG(0.05, 0.05, 2.4, 6)} c="#6b4a32" tex="wood" p={[0.3, 1.6, 0]} /> : null}
      {afloat ? <M g={boxG(0.04, 1.6, 1.2)} c="#d8cfb8" tex="fabric" p={[0.45, 1.9, 0]} /> : null}
    </group>
  );
};
/** a signpost on the ridge: a post and a painted board */
export const Signpost: React.FC<{ p: V3; yaw?: number; text: string }> = ({ p, yaw = 0, text }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={cylG(0.08, 0.1, 2.4, 8)} c="#6b4a32" tex="wood" p={[0, 1.2, 0]} />
    <group position={[0.35, 2.0, 0]} rotation={[0, 0, -0.06]}>
      <M g={boxG(1.6, 0.55, 0.08)} c="#b49a72" tex="planks" p={[0, 0, 0]} />
      <M g={coneG(0.3, 0.35, 3)} c="#b49a72" tex="planks" p={[0.95, 0, 0]} r={[0, 0, -Math.PI / 2]} s={[1, 1, 0.25]} />
      <Label text={text} p={[0, 0, 0.05]} w={1.5} h={0.5} fg="#24202a" bg="none" font={0.78} />
      <Label text={text} p={[0, 0, -0.05]} r={[0, Math.PI, 0]} w={1.5} h={0.5} fg="#24202a" bg="none" font={0.78} />
    </group>
  </group>
);

/** the whole world: land, sea, both wrecks and both camps. Pass which details the shot needs. */
export const World: React.FC<{ t: number; swell?: number; hutLit?: number; boat?: "none" | "building" | "beach" | "afloat"; boatT?: number }> = ({ t, swell = 1, hutLit = 1, boat = "building", boatT = 0 }) => (
  <>
    <Sea t={t} k={swell} />
    <Land />
    {/* the Grafton cove */}
    <Wreck p={[-33, -0.2, 17]} yaw={0.25} heel={24} />
    <group position={[-27.6, groundAt(-27.6, 14.2) - 0.1, 14.2]} rotation={[0.08, 1.25, 0.1]}>
      <M g={boxG(2.6, 0.95, 0.14)} c="#9c8160" tex="planks" p={[0, 0.75, 0]} />
      <M g={boxG(0.16, 1.4, 0.16)} c="#6b4a32" tex="wood" p={[-1.0, 0.45, -0.1]} />
      <M g={boxG(0.16, 1.2, 0.16)} c="#6b4a32" tex="wood" p={[1.0, 0.4, -0.1]} />
      <Label text="1864" p={[0, 0.75, 0.08]} w={2.4} h={0.85} fg="#f6efe0" bg="none" font={0.82} />
    </group>
    <Hut p={GRAFTON} yaw={0.15} lit={hutLit} tag="5 MEN" t={t} />
    <Campfire p={[GRAFTON[0] + 3.4, LAND, GRAFTON[2] + 4.0]} t={t} />
    {boat === "building" ? <Boat p={[GRAFTON[0] + 6.5, LAND, GRAFTON[2] + 7]} yaw={0.4} built={0.6} /> : null}
    {boat === "beach" ? <Boat p={[GRAFTON[0] + 5, LAND - 0.2, GRAFTON[2] + 11.5]} yaw={1.2} built={1} /> : null}
    {boat === "afloat" ? <Boat p={[GRAFTON[0] + 4 + boatT * 2, 0.1, GRAFTON[2] + 22 + boatT * 3]} yaw={1.4} built={1} afloat t={t} /> : null}
    <Foam p={[-28, 0.02, 18.2]} w={30} t={t} />
    {/* the Invercauld shore */}
    <Wreck p={[34, -0.4, 19]} yaw={-0.4} heel={-30} broken />
    <Foam p={[30, 0.02, 18.4]} w={34} t={t} seed={3} />
    <Foam p={[31, 0.02, 21]} w={26} t={t + 1.3} seed={5} />
    {/* the ridge signpost, pointing east */}
    <Signpost p={[7, groundAt(7, 9) - 0.05, 9]} yaw={-0.3} text="40 KM" />
  </>
);
