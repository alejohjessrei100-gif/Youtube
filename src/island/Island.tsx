// The island set for "Same island", drawn from layout.ts (positions, footprints, terrain and sea are data there).
//   Grafton cove (west): a beach, the Grafton wreck aground in the shallows, a hut, a fire, the boat.
//   Invercauld shore (east): a beach with washed-up debris, a wreck in the surf. A grassy ridge between them.
// Rules this file keeps: every object stands on groundAt(); the sea is flat at the shore and under the island (it can
// never show on land); parts only touch, never overlap in the same plane; everything is a pure function of t.
import React from "react";
import * as THREE from "three";
import { Flame, Label, M, boxG, coneG, cylG, sphG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { BEACH_SLOPE, BEACH_Z, BOAT, BOAT_SITE, FIRE, HUT, LAND, LAND_X, LAND_Z0, PROPS, RIDGE, SHORE_Z, WRECKS, groundAt, seaAt } from "./layout";
import type { BoatPose, Prop } from "./layout";

// ------------------------------------------------------------------ cached custom geometry
const cache = new Map<string, THREE.BufferGeometry>();
const geo = (k: string, make: () => THREE.BufferGeometry) => {
  let g = cache.get(k);
  if (!g) {
    g = make();
    cache.set(k, g);
  }
  return g;
};
/** the lower half of a unit sphere: a hull (scale it to half-length, depth, half-beam; the rim is at y = 0) */
const hullG = () => geo("hull", () => new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
/** a unit disc (a deck or a boat floor), 0.06 thick */
const discG = () => geo("disc", () => new THREE.CylinderGeometry(1, 1, 0.06, 40));
/** a gable roof: a triangular prism along x (width w along x, span d along z, height h), base at y = 0 */
const roofG = (w: number, d: number, h: number) =>
  geo(`roof${w}|${d}|${h}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    s.lineTo(d / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(Math.PI / 2);
    return g;
  });
/** an arrow-shaped sign board in the xy plane, 0.08 thick, centered on z */
const arrowG = () =>
  geo("arrow", () => {
    const s = new THREE.Shape();
    s.moveTo(-0.95, -0.3);
    s.lineTo(0.7, -0.3);
    s.lineTo(1.1, 0);
    s.lineTo(0.7, 0.3);
    s.lineTo(-0.95, 0.3);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
    g.translate(0, 0, -0.04);
    return g;
  });

// ------------------------------------------------------------------ sea: flat at the shore, swell in open water
const SEA_N = 240;
const seaGeo = () => geo("sea", () => new THREE.PlaneGeometry(600, 600, SEA_N, SEA_N).rotateX(-Math.PI / 2));
export const Sea: React.FC<{ t: number; k?: number; color?: string }> = ({ t, k = 1, color = "#245a72" }) => {
  const g = seaGeo();
  const p = g.attributes.position as THREE.BufferAttribute;
  const src = (g.userData.src ??= Float32Array.from(p.array as Float32Array)) as Float32Array;
  for (let i = 0; i < p.count; i++) p.setY(i, seaAt(src[i * 3], src[i * 3 + 2], t, k));
  p.needsUpdate = true;
  g.computeVertexNormals();
  return <M g={g} c={color} p={[0, 0, 0]} cast={false} />;
};
/** the surf line: thin white lobes exactly on the waterline (z = SHORE_Z), sliding a few cm with t */
const Surf: React.FC<{ x0: number; x1: number; t: number; seed?: number }> = ({ x0, x1, t, seed = 0 }) => {
  const n = Math.round((x1 - x0) / 1.5);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + ((i + 0.5) / n) * (x1 - x0);
        const z = SHORE_Z + 0.25 + 0.14 * Math.sin(t * 0.9 + i * 1.7 + seed);
        return <M key={i} g={sphG(1, 14)} c="#e6f1f0" p={[x, 0.02, z]} s={[0.72 + 0.14 * Math.sin(i * 2.1 + seed), 0.025, 0.16]} cast={false} />;
      })}
    </>
  );
};

// ------------------------------------------------------------------ land
export const Land: React.FC = () => (
  <>
    <M g={boxG(LAND_X * 2, 2, BEACH_Z - LAND_Z0)} c="#6f7f47" tex="grass" p={[0, LAND - 1, (BEACH_Z + LAND_Z0) / 2]} />
    {/* beach: from the land edge (y = LAND) down BEACH_SLOPE per meter; it meets the flat sea at z = SHORE_Z */}
    <M g={boxG(LAND_X * 2, 0.6, 24)} c="#cdb88e" tex="sand" p={[0, LAND - 0.3 - 12 * BEACH_SLOPE, BEACH_Z + 12]} r={[Math.atan(BEACH_SLOPE), 0, 0]} />
    <M g={sphG(1, 48)} c="#77884c" tex="grass" p={RIDGE.c} s={RIDGE.r} />
    {/* far hills */}
    <M g={sphG(1, 32)} c="#6c7c46" tex="grass" p={[-38, LAND, -40]} s={[34, 16, 18]} />
    <M g={sphG(1, 32)} c="#667545" tex="grass" p={[30, LAND, -44]} s={[38, 20, 20]} />
    <M g={sphG(1, 28)} c="#5f6f43" tex="grass" p={[0, LAND, -62]} s={[60, 26, 16]} />
  </>
);

// ------------------------------------------------------------------ props (all stand on the ground)
const Yawed: React.FC<{ p: Prop; dy?: number; children: React.ReactNode }> = ({ p, dy = 0, children }) => (
  <group position={[p.x, groundAt(p.x, p.z) + dy, p.z]} rotation={[0, p.yaw ?? 0, 0]}>
    {children}
  </group>
);
const PropView: React.FC<{ p: Prop; t: number }> = ({ p, t }) => {
  const s = p.s ?? 1;
  switch (p.kind) {
    case "crate": {
      const a = p.s ?? 0.65;
      return (
        <Yawed p={p}>
          <M g={boxG(a, a, a)} c="#8c6a45" tex="planks" p={[0, a / 2 - 0.02, 0]} />
        </Yawed>
      );
    }
    case "barrel":
      return (
        <Yawed p={p}>
          <M g={cylG(0.36, 0.36, 0.95, 18)} c="#7a5536" tex="wood" p={[0, 0.46, 0]} />
        </Yawed>
      );
    case "barrelTip":
      return (
        <Yawed p={p} dy={0.34}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <M g={cylG(0.36, 0.36, 0.95, 18)} c="#7a5536" tex="wood" />
          </group>
        </Yawed>
      );
    case "log":
      return (
        <Yawed p={p} dy={p.r - 0.03}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <M g={cylG(p.r, p.r * 1.08, p.len ?? 2, 12)} c="#8f7a62" tex="wood" />
          </group>
        </Yawed>
      );
    case "plank":
      return (
        <Yawed p={p}>
          <M g={boxG(p.len ?? 2, 0.06, 0.24)} c="#6b5844" tex="planks" p={[0, 0.02, 0]} />
        </Yawed>
      );
    case "planks":
      return (
        <Yawed p={p}>
          {[0, 1, 2].map((i) => (
            <M key={i} g={boxG(1.5, 0.07, 0.26)} c={i % 2 ? "#a58157" : "#93714b"} tex="planks" p={[0, 0.03 + i * 0.075, (i - 1) * 0.05]} r={[0, (i - 1) * 0.12, 0]} />
          ))}
        </Yawed>
      );
    case "net":
      return (
        <Yawed p={p}>
          <M g={sphG(1, 16)} c="#7d7356" tex="fabric" p={[0, 0.06, 0]} s={[0.7, 0.16, 0.55]} />
          {[-0.3, 0.05, 0.36].map((x, i) => (
            <M key={i} g={sphG(0.08, 10)} c="#b5894e" p={[x, 0.2, 0.12 - i * 0.12]} />
          ))}
        </Yawed>
      );
    case "pot":
      return (
        <Yawed p={p}>
          <M g={cylG(0.22, 0.18, 0.32, 14)} c="#5a5d63" tex="metal" p={[0, 0.15, 0]} />
        </Yawed>
      );
    case "rock":
      return (
        <Yawed p={p}>
          <group rotation={[0.25, 0, 0.18]}>
            {/* half buried: the center sits at ground level, so a rock is a dome in the ground, never a ball on it */}
            <M g={sphG(1, 9)} c="#6d6a72" tex="rock" p={[0, -0.04, 0]} s={[p.r * 1.05, p.h, p.r * 0.9]} />
          </group>
        </Yawed>
      );
    case "tussock":
      return (
        <Yawed p={p}>
          <group scale={s}>
            <M g={coneG(0.42, 0.9, 7)} c="#7f8f4e" tex="grass" p={[0, 0.4, 0]} />
            <M g={coneG(0.3, 0.7, 7)} c="#93a35a" tex="grass" p={[0.2, 0.3, 0.1]} r={[0, 0, -0.3]} />
            <M g={coneG(0.27, 0.65, 7)} c="#6f8045" tex="grass" p={[-0.18, 0.28, -0.05]} r={[0, 0, 0.35]} />
          </group>
        </Yawed>
      );
    case "dryline": {
      const sway = 0.07 * Math.sin(t * 1.4);
      return (
        <Yawed p={p}>
          <M g={cylG(0.05, 0.06, 2.1, 8)} c="#6b4a32" tex="wood" p={[-1.6, 1.03, 0]} />
          <M g={cylG(0.05, 0.06, 2.1, 8)} c="#6b4a32" tex="wood" p={[1.6, 1.03, 0]} />
          <group position={[0, 1.95, 0]} rotation={[0, 0, Math.PI / 2]}>
            <M g={cylG(0.014, 0.014, 3.2, 6)} c="#d8cdb4" />
          </group>
          <group position={[-0.6, 1.95, 0]} rotation={[sway, 0, 0]}>
            <M g={sphG(1, 14)} c="#6e5640" tex="fabric" p={[0, -0.45, 0]} s={[0.42, 0.45, 0.04]} />
          </group>
          <group position={[0.65, 1.95, 0]} rotation={[sway * 1.3, 0, 0]}>
            <M g={boxG(0.6, 0.7, 0.03)} c="#c9b98f" tex="fabric" p={[0, -0.36, 0]} />
          </group>
        </Yawed>
      );
    }
    case "board":
      // the year on a salvaged board: two stakes BEHIND it, cream stencil paint (unlit: no light washes it out)
      return (
        <Yawed p={p}>
          <M g={boxG(0.14, 1.3, 0.12)} c="#6b4a32" tex="wood" p={[-0.95, 0.6, -0.13]} />
          <M g={boxG(0.14, 1.3, 0.12)} c="#6b4a32" tex="wood" p={[0.95, 0.6, -0.13]} />
          <M g={boxG(2.6, 0.95, 0.12)} c="#5b4330" tex="planks" p={[0, 0.9, 0]} />
          <Label text={p.text ?? ""} p={[0, 0.9, 0.065]} w={2.4} h={0.85} fg="#f6efe0" bg="none" font={0.84} />
        </Yawed>
      );
    case "sign":
      // the post stands BEHIND the board, so nothing ever covers the text
      return (
        <Yawed p={p}>
          <M g={cylG(0.09, 0.1, 2.5, 10)} c="#6b4a32" tex="wood" p={[0, 1.23, -0.14]} />
          <M g={arrowG()} c="#4a3626" tex="planks" p={[0.05, 1.95, 0]} />
          <Label text={p.text ?? ""} p={[-0.07, 1.95, 0.046]} w={1.5} h={0.5} fg="#f6efe0" bg="none" font={0.86} />
        </Yawed>
      );
    case "fire":
      return <Campfire p={[p.x, groundAt(p.x, p.z), p.z]} t={t} />;
  }
};

// ------------------------------------------------------------------ wrecks: a real hull shape, aground and heeled
const Wreck: React.FC<{ w: (typeof WRECKS)["grafton"] }> = ({ w }) => (
  <group position={[w.x, -w.sink, w.z]} rotation={[0, w.yaw, 0]}>
    <group rotation={[w.heel, 0, w.pitch]}>
      <M g={hullG()} c="#5a3b28" tex="planks" p={[0, w.h, 0]} s={[w.a, w.h, w.b]} />
      <M g={discG()} c="#8a6a48" tex="planks" p={[0, w.h - 0.05, 0]} s={[w.a * 0.985, 1, w.b * 0.985]} />
      {/* the mast stump, stepped on the deck, and a fallen spar lying on the deck */}
      <group position={[w.a * 0.15, w.h - 0.03, 0]} rotation={[0.05, 0, 0.07]}>
        <M g={cylG(0.15, 0.19, w.mast, 12)} c="#6b4a32" tex="wood" p={[0, w.mast / 2, 0]} />
      </group>
      <group position={[-w.a * 0.25, w.h + 0.09, w.b * 0.3]} rotation={[0, 0.25, Math.PI / 2]}>
        <M g={cylG(0.09, 0.09, w.a * 0.7, 8)} c="#6b4a32" tex="wood" />
      </group>
      {/* a deckhouse stub */}
      <M g={boxG(1.6, 0.7, 1.2)} c="#6f5238" tex="planks" p={[-w.a * 0.45, w.h + 0.33, 0]} />
    </group>
  </group>
);

// ------------------------------------------------------------------ the Grafton camp
/** the castaways' hut: plank walls, a gable roof (one solid prism: no gaps, nothing pokes through), a stone chimney
 * outside the left wall, a door with the "5 MEN" stencil, a lit window, firewood and a water barrel by the right wall */
export const Hut: React.FC<{ lit?: number }> = ({ lit = 1 }) => {
  const { hw, hd, wallH } = HUT;
  return (
    <group position={[HUT.x, LAND, HUT.z]} rotation={[0, HUT.yaw, 0]}>
      <M g={boxG(hw * 2, wallH, hd * 2)} c="#7b5a3c" tex="planks" p={[0, wallH / 2 - 0.02, 0]} />
      <M g={roofG(hw * 2 + 0.02, hd * 2 + 0.7, 1.35)} c="#5d5a3e" tex="shingles" p={[0, wallH - 0.02, 0]} />
      <M g={boxG(0.8, 4.0, 0.8)} c="#77737a" tex="stone" p={[-hw - 0.43, 1.98, -0.4]} />
      {/* door + stencil */}
      <M g={boxG(0.95, 1.9, 0.08)} c="#5a3d29" tex="planks" p={[0.7, 0.95, hd + 0.02]} />
      <M g={sphG(0.05, 8)} c="#c99f4b" p={[1.05, 0.95, hd + 0.09]} />
      <Label text="5 MEN" p={[0.7, 1.34, hd + 0.066]} w={0.9} h={0.42} fg="#f6efe0" bg="none" font={0.78} />
      {/* window: frame, warm glass, one mullion */}
      <M g={boxG(0.9, 0.7, 0.08)} c="#4a3324" tex="wood" p={[-1.0, 1.35, hd + 0.02]} />
      <mesh position={[-1.0, 1.35, hd + 0.066]} userData={{ outline: false }}>
        <planeGeometry args={[0.72, 0.52]} />
        <meshBasicMaterial color={new THREE.Color("#ffb45a").multiplyScalar(0.5 + 0.5 * lit)} toneMapped={false} />
      </mesh>
      <M g={boxG(0.05, 0.52, 0.03)} c="#4a3324" p={[-1.0, 1.35, hd + 0.085]} />
      {/* always mounted (a constant light count: no shader recompiles between shots) */}
      <pointLight position={[-1.0, 1.35, hd + 0.7]} color="#ffa040" intensity={2.5 * lit} distance={5} decay={2} />
      {/* firewood (stacked, touching) and a water barrel */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <group key={`${r}${c}`} position={[hw + 0.4, 0.1 + r * 0.21, -1.0 + c * 0.235 + (r % 2) * 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <M g={cylG(0.11, 0.11, 1.1, 8)} c={c % 2 ? "#8a6440" : "#7a5534"} tex="wood" />
          </group>
        )),
      )}
      <M g={cylG(0.34, 0.34, 0.9, 16)} c="#6f4c30" tex="wood" p={[hw + 0.4, 0.44, 1.15]} />
    </group>
  );
};
/** a fire ring with a pot on a tripod */
export const Campfire: React.FC<{ p: V3; t: number }> = ({ p, t }) => (
  <group position={p}>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return <M key={i} g={sphG(1, 8)} c="#6d6a72" tex="rock" p={[Math.cos(a) * 0.62, 0.05, Math.sin(a) * 0.62]} s={[0.17, 0.12, 0.15]} />;
    })}
    <Flame p={[0, 0.02, 0]} s={0.42} t={t} seed={2} />
    {[0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      // each leg runs from its foot (radius 0.5 on the ground) to the apex (0, 1.5, 0)
      const foot = new THREE.Vector3(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
      const apex = new THREE.Vector3(0, 1.5, 0);
      const mid = foot.clone().lerp(apex, 0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), apex.clone().sub(foot).normalize());
      return (
        <group key={i} position={mid} quaternion={q}>
          <M g={cylG(0.03, 0.03, foot.distanceTo(apex), 6)} c="#5a3d29" tex="wood" />
        </group>
      );
    })}
    <M g={cylG(0.012, 0.012, 0.55, 5)} c="#2d2c33" p={[0, 1.22, 0]} />
    <M g={cylG(0.26, 0.2, 0.3, 16)} c="#2d2c33" tex="metal" p={[0, 0.82, 0]} />
  </group>
);

// ------------------------------------------------------------------ the boat
/** the castaways' boat (bow = local +x, keel at y = 0). On stocks while building; afloat it rides the waves (pose). */
export const Boat: React.FC<{ pose?: BoatPose }> = ({ pose }) => {
  const { L, B, D, floor } = BOAT;
  const body = (
    <>
      <M g={hullG()} c="#86613f" tex="planks" p={[0, D, 0]} s={[L, D, B]} side={THREE.DoubleSide} />
      <M g={discG()} c="#9a7550" tex="planks" p={[0, floor, 0]} s={[1.5, 1, 0.52]} />
      {pose ? (
        <>
          {/* the mast is stepped on the floor; the sail hangs above head height, across the boat */}
          <M g={cylG(0.045, 0.055, 4.3, 8)} c="#6b4a32" tex="wood" p={[0.55, floor + 2.15, 0]} />
          <group position={[0.55, floor + 4.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <M g={cylG(0.03, 0.03, 1.9, 6)} c="#6b4a32" tex="wood" />
          </group>
          <M g={boxG(0.03, 1.5, 1.7)} c="#d8cfb8" tex="fabric" p={[0.6, floor + 3.32, 0]} />
        </>
      ) : null}
    </>
  );
  if (pose)
    return (
      <group position={[pose.x, pose.y, pose.z]} rotation={[0, pose.yaw, 0]}>
        <group rotation={[pose.roll, 0, pose.pitch]}>{body}</group>
      </group>
    );
  const s = BOAT_SITE;
  return (
    <group position={[s.x, groundAt(s.x, s.z), s.z]} rotation={[0, s.yaw, 0]}>
      {/* two stocks under the keel */}
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <M g={cylG(0.19, 0.19, 1.15, 10)} c="#7a6248" tex="wood" />
        </group>
      ))}
      <group position={[0, 0.26, 0]}>{body}</group>
    </group>
  );
};

/** the whole world. boat: none, on the stocks ("building"), or afloat at a pose from layout.boatPose */
export const World: React.FC<{ t: number; swell?: number; hutLit?: number; boat?: "none" | "building" | BoatPose }> = ({ t, swell = 1, hutLit = 1, boat = "none" }) => (
  <>
    <Sea t={t} k={swell} />
    <Land />
    <Surf x0={-44} x1={-17} t={t} />
    <Surf x0={19} x1={46} t={t} seed={3} />
    <Wreck w={WRECKS.grafton} />
    <Wreck w={WRECKS.invercauld} />
    <Hut lit={hutLit} />
    {PROPS.map((p, i) => (
      <PropView key={i} p={p} t={t} />
    ))}
    {boat === "building" ? <Boat /> : boat !== "none" ? <Boat pose={boat} /> : null}
  </>
);
export { FIRE };
