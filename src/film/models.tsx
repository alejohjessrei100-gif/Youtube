// Models for "Same island": vessels with real hull lines, the Epigwaitt hut, southern rata, camp gear, storm effects.
// Every part only touches its neighbors (no coplanar overlaps); everything is a pure function of its props.
import React from "react";
import * as THREE from "three";
import { Flame, M, boxG, canvasTex, coneG, cylG, sphG } from "../inkbeat/core/kit";
import { toonMaterial } from "../inkbeat/mat/materials";
import type { V3 } from "../inkbeat/types";
import { beamOf, deckY, sheerOf, stationX } from "./hull";
import { HUT, hash } from "./world";
import type { Rig } from "./state";
import type { Hull, Pose } from "./world";
export type { Rig };

const cache = new Map<string, THREE.BufferGeometry>();
export const geo = (k: string, make: () => THREE.BufferGeometry) => {
  let g = cache.get(k);
  if (!g) {
    g = make();
    cache.set(k, g);
  }
  return g;
};

const hullG = (h: Hull) =>
  geo(`hull${h.L}|${h.B}|${h.D}`, () => {
    const NU = 34;
    const NV = 18;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      const w = beamOf(h, u);
      const sheer = sheerOf(h, u);
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * 2 - 1;
        const th = (v * Math.PI) / 2;
        pos.push(stationX(h, u), sheer - h.D * Math.pow(Math.max(0, Math.cos(th)), 0.75), w * Math.sign(v) * Math.pow(Math.abs(Math.sin(th)), 0.6));
      }
    }
    for (let i = 0; i < NU; i++)
      for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j;
        const b = a + NV + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    // the transom: a fan closing the stern section
    const c = pos.length / 3;
    pos.push(stationX(h, 0), sheerOf(h, 0) - h.D * 0.35, 0);
    for (let j = 0; j < NV; j++) idx.push(c, j, j + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
const deckG = (h: Hull) =>
  geo(`deck${h.L}|${h.B}|${h.D}`, () => {
    const NU = 34;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      // the deck's half-width is the hull's half-width at deck height (inside the planking)
      const w = beamOf(h, u) * 0.955;
      pos.push(stationX(h, u), deckY(h, u), -w, stationX(h, u), deckY(h, u), w);
    }
    for (let i = 0; i < NU; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
const triG = (w: number, hh: number) =>
  geo(`tri${w}|${hh}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(w, 0);
    s.lineTo(0, hh);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
    g.translate(0, 0, -0.02);
    return g;
  });

const HULL_C = "#3a2a22";
const DECK_C = "#9a7a54";
const SPAR_C = "#7a5a3c";
const SAIL_C = "#d9d0b8";
/** a vessel: hull, deck, bulwarks (the hull above the deck), masts, spars and sails. Origin at the keel amidships. */
export const Vessel: React.FC<{ hull: Hull; pose: Pose; rig: Rig; color?: string }> = ({ hull, pose, rig, color = HULL_C }) => {
  const sails = rig.sails ?? 0;
  return (
    <group position={[pose.x, pose.y, pose.z]} rotation={[0, pose.yaw, 0]}>
      <group rotation={[0, 0, pose.pitch]}>
        <group rotation={[pose.roll, 0, 0]}>
          <mesh geometry={hullG(hull)} material={toonMaterial({ color, tex: "planks", texScale: hull.L > 30 ? 0.5 : 1, side: THREE.DoubleSide })} castShadow receiveShadow />
          <mesh geometry={deckG(hull)} material={toonMaterial({ color: DECK_C, tex: "planks", side: THREE.DoubleSide })} receiveShadow />
          {rig.kind !== "boat" ? (
            <>
              {/* a pale strake along the hull (ship) and a deckhouse aft */}
              <M g={boxG(hull.L * 0.13, hull.D * 0.3, hull.B * 0.34)} c="#6c5038" tex="planks" p={[stationX(hull, 0.2), deckY(hull, 0.2) + hull.D * 0.15 - 0.01, 0]} />
              {/* the bowsprit */}
              <group position={[stationX(hull, 0.97), deckY(hull, 0.97) + hull.D * 0.1, 0]} rotation={[0, 0, -Math.PI / 2 + 0.28]}>
                <M g={cylG(hull.D * 0.03, hull.D * 0.045, hull.L * 0.22, 8)} c={SPAR_C} tex="wood" p={[0, hull.L * 0.1, 0]} />
              </group>
            </>
          ) : (
            // the boat's thwarts
            [0.32, 0.5, 0.7].map((u) => <M key={u} g={boxG(0.22, 0.05, 2 * 0.955 * (hull.B / 2) * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.6) * 0.92)} c="#a8845a" tex="planks" p={[stationX(hull, u), deckY(hull, u) + 0.3, 0]} />)
          )}
          {hull.masts.map((u, i) => {
            const part = rig.stump?.[i] ?? 1;
            const H = hull.mastH * (1 - i * 0.06) * part;
            const r = Math.max(0.045, hull.D * 0.045);
            const fall = rig.fall?.[i] ?? 0;
            const yards = rig.kind === "ship" ? [0.34, 0.58, 0.8] : [];
            return (
              <group key={i} position={[stationX(hull, u), deckY(hull, u) - 0.02, 0]} rotation={[fall * 0.5, 0, fall]}>
                <M g={cylG(r * 0.6, r, H, 10)} c={SPAR_C} tex="wood" p={[0, H / 2, 0]} />
                {part > 0.9 && rig.kind === "ship"
                  ? yards.map((f, k) => {
                      const yl = hull.B * (1.9 - k * 0.38);
                      const sh = hull.mastH * 0.19;
                      return (
                        <group key={k} position={[r + 0.12, H * f, 0]}>
                          <group rotation={[Math.PI / 2, 0, 0]}>
                            <M g={cylG(r * 0.35, r * 0.35, yl, 8)} c={SPAR_C} tex="wood" />
                          </group>
                          {sails >= 2 || (sails === 1 && k === 0) ? <M g={boxG(0.1, sh, yl * 0.9)} c={SAIL_C} tex="fabric" p={[0.1, -sh / 2 - r * 0.4, 0]} /> : null}
                        </group>
                      );
                    })
                  : null}
                {part > 0.9 && rig.kind === "schooner" ? (
                  <>
                    {/* boom and gaff, aft of the mast, with the sail between them */}
                    <group position={[-hull.L * 0.115 - r, H * 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
                      <M g={cylG(r * 0.4, r * 0.4, hull.L * 0.23, 8)} c={SPAR_C} tex="wood" />
                    </group>
                    <group position={[-hull.L * 0.1 - r, H * 0.7, 0]} rotation={[0, 0, Math.PI / 2 - 0.3]}>
                      <M g={cylG(r * 0.35, r * 0.35, hull.L * 0.2, 8)} c={SPAR_C} tex="wood" />
                    </group>
                    {sails >= 1 ? <M g={boxG(hull.L * 0.2, H * (sails >= 2 ? 0.5 : 0.26), 0.06)} c={SAIL_C} tex="fabric" p={[-hull.L * 0.11 - r, H * (sails >= 2 ? 0.42 : 0.3), 0]} /> : null}
                  </>
                ) : null}
                {part > 0.9 && rig.kind === "boat" ? (
                  <>
                    <group position={[0, H * 0.93, 0]} rotation={[Math.PI / 2, 0, 0]}>
                      <M g={cylG(0.03, 0.03, 2.2, 6)} c={SPAR_C} tex="wood" />
                    </group>
                    <M g={boxG(0.04, H * 0.42, 2.0)} c={SAIL_C} tex="fabric" p={[0.07, H * 0.7, 0]} />
                  </>
                ) : null}
              </group>
            );
          })}
          {rig.kind === "schooner" && sails >= 2 ? (
            <mesh geometry={triG(hull.L * 0.26, hull.mastH * 0.5)} material={toonMaterial({ color: SAIL_C, tex: "fabric", side: THREE.DoubleSide })} position={[stationX(hull, hull.masts[0]) + 0.5, deckY(hull, 0.8) + hull.mastH * 0.12, 0]} castShadow />
          ) : null}
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ the Epigwaitt hut
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
const sm = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
/** the castaways' hut: a frame of the schooner's spars, thatch-and-canvas walls, a thatched gable roof and a stone
 * fireplace at one end. build 0..1 raises it in order: hearth and frame, walls, roof. Origin on the ground. */
export const Hut: React.FC<{ y: number; build?: number; lit?: number }> = ({ y, build = 1, lit = 1 }) => {
  const { w, d, wallH } = HUT;
  const frame = sm(0.02, 0.3, build);
  const walls = sm(0.3, 0.66, build);
  const roof = sm(0.66, 1, build);
  const post = (x: number, z: number, hh: number, k: string) => (frame > 0 ? <M key={k} g={cylG(0.09, 0.1, hh * frame, 8)} c="#7a5a3c" tex="wood" p={[x, (hh * frame) / 2, z]} /> : null);
  return (
    <group position={[HUT.x, y, HUT.z]} rotation={[0, HUT.yaw, 0]}>
      {/* the stone hearth and chimney, outside the west wall */}
      <M g={boxG(1.1, 3.6, 1.3)} c="#6f6c72" tex="stone" p={[-w / 2 - 0.57, 1.78, 0]} />
      {/* corner posts stand just outside the walls; two taller posts carry the ridge */}
      {post(-w / 2 + 0.02, -d / 2 - 0.11, wallH, "a")}
      {post(w / 2 + 0.11, -d / 2 - 0.11, wallH, "b")}
      {post(-w / 2 + 0.02, d / 2 + 0.11, wallH, "c")}
      {post(w / 2 + 0.11, d / 2 + 0.11, wallH, "e")}
      {post(w / 2 + 0.11, 0, wallH + 1.2, "f")}
      {frame > 0.9 && roof < 0.05 ? (
        <group position={[0, wallH + 1.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <M g={cylG(0.08, 0.08, w + 0.3, 8)} c="#7a5a3c" tex="wood" />
        </group>
      ) : null}
      {walls > 0 ? (
        <>
          <M g={boxG(w, wallH * walls, d)} c="#93834c" tex="grass" ts={2.2} p={[0, (wallH * walls) / 2 - 0.02, 0]} />
          {/* lashed horizontal poles on the front wall (the thatch is bound between them) */}
          {walls > 0.95 ? [0.35, 0.85, 1.35].map((y) => <M key={y} g={boxG(w + 0.08, 0.07, 0.06)} c="#6f5236" tex="wood" p={[0, y, d / 2 + 0.035]} />) : null}
          {/* a sailcloth panel and the door (a dark canvas flap) on the front wall */}
          {walls > 0.95 ? (
            <>
              <M g={boxG(1.9, 1.05, 0.05)} c="#cfc5aa" tex="fabric" p={[-1.3, 1.1, d / 2 + 0.03]} />
              <M g={boxG(0.95, 1.6, 0.05)} c="#3b3026" tex="fabric" p={[1.15, 0.8, d / 2 + 0.03]} />
              <mesh position={[1.15, 0.72, d / 2 + 0.058]} userData={{ outline: false }}>
                <planeGeometry args={[0.34, 1.3]} />
                <meshBasicMaterial color={new THREE.Color("#ffab52").multiplyScalar(0.25 + 0.75 * lit)} toneMapped={false} />
              </mesh>
            </>
          ) : null}
        </>
      ) : null}
      {roof > 0 ? (
        <group position={[0, wallH - 0.02, 0]} scale={[1, Math.max(0.02, roof), 1]}>
          <M g={roofG(w + 0.24, d + 0.9, 1.5)} c="#a79450" tex="grass" ts={2.6} />
        </group>
      ) : null}
      <pointLight position={[1.15, 0.9, d / 2 + 0.8]} color="#ffa040" intensity={2.2 * lit * (walls > 0.95 ? 1 : 0)} distance={5} decay={2} />
    </group>
  );
};

// ------------------------------------------------------------------ southern rata: low, twisted, dense; crimson bloom in summer
export const Rata: React.FC<{ p: V3; s: number; yaw: number; bloom: number }> = ({ p, s, yaw, bloom }) => (
  <group position={p} rotation={[0, yaw, 0]} scale={s}>
    <group rotation={[0, 0, 0.32]}>
      <M g={cylG(0.16, 0.26, 2.4, 7)} c="#4a3028" tex="wood" p={[0, 1.1, 0]} />
    </group>
    <group position={[-0.62, 2.0, 0]} rotation={[0.3, 0, -0.5]}>
      <M g={cylG(0.1, 0.15, 1.7, 6)} c="#4a3028" tex="wood" p={[0, 0.8, 0]} />
    </group>
    <M g={sphG(1, 10)} c="#2c4a2c" tex="grass" p={[-0.5, 3.5, 0.1]} s={[2.1, 1.05, 1.8]} />
    <M g={sphG(1, 10)} c="#355838" tex="grass" p={[0.9, 3.9, -0.4]} s={[1.6, 0.9, 1.5]} />
    <M g={sphG(1, 10)} c="#27422a" tex="grass" p={[-1.5, 3.0, -0.6]} s={[1.4, 0.8, 1.3]} />
    {bloom > 0.45
      ? [0, 1, 2, 3, 4].map((i) => (
          <M key={i} g={sphG(1, 7)} c="#b3262c" p={[-0.9 + 0.55 * i - 0.3 * (i % 2), 4.25 + 0.2 * Math.sin(i * 2.1), -0.3 + 0.35 * Math.cos(i * 1.7)]} s={[0.34, 0.16, 0.3]} cast={false} />
        ))
      : null}
  </group>
);

// ------------------------------------------------------------------ camp gear (each stands on the ground it is given)
export const Rock: React.FC<{ p: V3; r: number; h: number; yaw?: number; c?: string }> = ({ p, r, h, yaw = 0, c = "#5b5a62" }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <group rotation={[0.2, 0, 0.15]}>
      {/* half buried: the center sits at ground level */}
      <M g={sphG(1, 8)} c={c} tex="rock" p={[0, -0.05, 0]} s={[r * 1.05, h, r * 0.88]} />
    </group>
  </group>
);
export const Cask: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.36, 0.34, 0.92, 16)} c="#7a5536" tex="wood" p={[0, 0.45, 0]} />
    <M g={cylG(0.375, 0.375, 0.05, 16, true)} c="#2f2e34" tex="metal" p={[0, 0.22, 0]} />
    <M g={cylG(0.375, 0.375, 0.05, 16, true)} c="#2f2e34" tex="metal" p={[0, 0.7, 0]} />
  </group>
);
export const Chest: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(0.9, 0.42, 0.5)} c="#5d4330" tex="planks" p={[0, 0.2, 0]} />
    <M g={boxG(0.94, 0.1, 0.54)} c="#4a3526" tex="planks" p={[0, 0.455, 0]} />
  </group>
);
export const Woodpile: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    {[0, 1, 2].map((row) =>
      Array.from({ length: 4 - row }, (_, c) => (
        <group key={`${row}${c}`} position={[0, 0.1 + row * 0.19, -0.36 + c * 0.24 + row * 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <M g={cylG(0.11, 0.11, 1.2, 8)} c={(row + c) % 2 ? "#8a5a44" : "#774a3a"} tex="wood" />
        </group>
      )),
    )}
  </group>
);
/** spars lying side by side on the ground (salvage from the wreck) */
export const Spars: React.FC<{ p: V3; len: number; yaw?: number }> = ({ p, len, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    {[-0.22, 0, 0.22].map((z, i) => (
      <group key={i} position={[(i - 1) * 0.3, 0.1, z]} rotation={[0, 0, Math.PI / 2]}>
        <M g={cylG(0.09, 0.11, len - i * 0.5, 8)} c="#7a5a3c" tex="wood" />
      </group>
    ))}
  </group>
);
/** the tally post: one notch for every day, cut with a knife (how the five kept count of nineteen months) */
export const TallyPost: React.FC<{ p: V3; marks?: number }> = ({ p, marks = 1 }) => {
  const tex = canvasTex("tally", 256, 1024, (g, W, H) => {
    g.fillStyle = "#8a6a48";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "#2a1c12";
    g.lineWidth = 7;
    for (let row = 0; row < 26; row++)
      for (let k = 0; k < 5; k++) {
        const x = 40 + k * 34 + 8 * hash(row * 7 + k);
        const y = 40 + row * 36;
        g.beginPath();
        if (k < 4) {
          g.moveTo(x, y);
          g.lineTo(x + 3, y + 24);
        } else {
          g.moveTo(30, y + 20);
          g.lineTo(190, y + 4);
        }
        g.stroke();
      }
  });
  return (
    <group position={p}>
      <M g={boxG(0.24, 1.7, 0.2)} c="#7a5a3c" tex="wood" p={[0, 0.84, 0]} />
      <mesh position={[0, 0.95, 0.102]} userData={{ outline: false }} scale={[1, marks, 1]}>
        <planeGeometry args={[0.2, 1.3]} />
        <meshToonMaterial map={tex} />
      </mesh>
    </group>
  );
};
/** a fire ring with a pot on a tripod; k scales its light (the key light of the night scenes) */
export const Campfire: React.FC<{ p: V3; t: number; k?: number }> = ({ p, t, k = 1 }) => (
  <group position={p}>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return <M key={i} g={sphG(1, 7)} c="#55545c" tex="rock" p={[Math.cos(a) * 0.6, 0.04, Math.sin(a) * 0.6]} s={[0.17, 0.12, 0.15]} />;
    })}
    <Flame p={[0, 0.02, 0]} s={0.44} t={t} seed={2} />
    {[0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const foot = new THREE.Vector3(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
      const apex = new THREE.Vector3(0, 1.5, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), apex.clone().sub(foot).normalize());
      return (
        <group key={i} position={foot.clone().lerp(apex, 0.5)} quaternion={q}>
          <M g={cylG(0.03, 0.03, foot.distanceTo(apex), 6)} c="#4a3526" tex="wood" />
        </group>
      );
    })}
    <M g={cylG(0.012, 0.012, 0.55, 5)} c="#2d2c33" p={[0, 1.22, 0]} />
    <M g={cylG(0.26, 0.2, 0.3, 16)} c="#2d2c33" tex="metal" p={[0, 0.82, 0]} />
    {/* the fire as a light source: warm, flickering a little (a pure function of t) */}
    <pointLight position={[0, 0.9, 0.2]} color="#ff8a2a" intensity={34 * k * (1 + 0.08 * Math.sin(t * 11) + 0.05 * Math.sin(t * 17.3))} distance={16} decay={1.6} />
  </group>
);

// ------------------------------------------------------------------ soft contact shadow under an object (grounds it)
const blobTex = () =>
  canvasTex("blob", 128, 128, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W / 2);
    gr.addColorStop(0, "rgba(10,12,24,0.75)");
    gr.addColorStop(0.6, "rgba(10,12,24,0.35)");
    gr.addColorStop(1, "rgba(10,12,24,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  });
let blobMat: THREE.MeshBasicMaterial | null = null;
export const Blob: React.FC<{ p: V3; r: number }> = ({ p, r }) => {
  blobMat ??= new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
  return (
    <mesh position={[p[0], p[1] + 0.012, p[2]]} rotation={[-Math.PI / 2, 0, 0]} material={blobMat} userData={{ outline: false }} renderOrder={1}>
      <planeGeometry args={[r * 2, r * 2]} />
    </mesh>
  );
};

// ------------------------------------------------------------------ storm effects
/** rain: slanted streaks in a box in front of the lens; every streak's position is a pure function of t */
export const Rain: React.FC<{ cam: { pos: V3; look: V3 }; t: number; n?: number }> = ({ cam, t, n = 260 }) => {
  const mesh = React.useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.75, 0.012), new THREE.MeshBasicMaterial({ color: "#cfe0ff", transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }), 600);
    m.userData.outline = false;
    m.frustumCulled = false;
    return m;
  }, []);
  const f = new THREE.Vector3(cam.look[0] - cam.pos[0], 0, cam.look[2] - cam.pos[2]).normalize();
  const r = new THREE.Vector3(-f.z, 0, f.x);
  const o = new THREE.Object3D();
  o.rotation.set(0, 0, -0.32);
  mesh.count = Math.min(600, n);
  for (let i = 0; i < mesh.count; i++) {
    const a = hash(i * 1.37 + 3);
    const b = hash(i * 2.91 + 7);
    const c = hash(i * 5.13 + 11);
    const fall = (c + t * (1.5 + 0.5 * a)) % 1;
    const depth = 1.2 + 11 * b;
    const side = (a - 0.5) * (1.6 + depth * 1.1);
    o.position.set(cam.pos[0] + f.x * depth + r.x * side + 2.2 * fall, cam.pos[1] + 5 - 9 * fall, cam.pos[2] + f.z * depth + r.z * side);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};
/** a lightning bolt in the sky: a jagged unlit strip, visible for the frames around a flash (a = 0..1) */
export const Bolt: React.FC<{ p: V3; h: number; a: number; seed?: number }> = ({ p, h, a, seed = 1 }) => {
  if (a <= 0.02) return null;
  const n = 9;
  const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector3((hash(seed * 9 + i * 3.3) - 0.5) * h * 0.22 * (i === 0 ? 0 : 1), h * (1 - i / n), (hash(seed * 5 + i * 1.9) - 0.5) * h * 0.08));
  return (
    <group position={p}>
      {pts.slice(0, -1).map((q, i) => {
        const d = pts[i + 1].clone().sub(q);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        return (
          <mesh key={i} position={q.clone().lerp(pts[i + 1], 0.5)} quaternion={quat} userData={{ outline: false }}>
            <boxGeometry args={[h * 0.012, d.length(), h * 0.012]} />
            <meshBasicMaterial color={new THREE.Color("#eaf2ff").multiplyScalar(0.6 + 0.6 * a)} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};
/** a foam / spray lobe: lit like the rest of the world but never inked (an outline turns spray into bubbles) */
export const Lobe: React.FC<{ p: V3; s: V3 | number; c?: string }> = ({ p, s, c = "#d4e0ea" }) => (
  <mesh geometry={sphG(1, 7)} position={p} scale={s} userData={{ outline: false }}>
    <meshBasicMaterial color={c} toneMapped={false} />
  </mesh>
);
/** a burst of spray: white lobes thrown up and falling back, repeating every `period` s (0 = one burst at t0) */
export const Spray: React.FC<{ p: V3; t: number; t0?: number; period?: number; s?: number; n?: number; seed?: number }> = ({ p, t, t0 = 0, period = 0, s = 1, n = 9, seed = 0 }) => {
  const tau = period > 0 ? (((t - t0) % period) + period) % period : t - t0;
  if (tau < 0 || tau > 1.5) return null;
  return (
    <group position={p}>
      {Array.from({ length: n }, (_, i) => {
        const a = hash(seed + i * 3.1) * Math.PI * 2;
        const v = (2.6 + 3.8 * hash(seed + i * 7.7)) * Math.sqrt(s);
        const out = (0.5 + 1.2 * hash(seed + i * 1.3)) * s * 0.75;
        const y = v * tau - 4.9 * tau * tau;
        if (y < -0.1) return null;
        const k = (0.03 + 0.045 * hash(seed + i * 5.9)) * Math.pow(s, 0.6) * (1 + tau * 0.4);
        return <Lobe key={i} p={[Math.cos(a) * out * tau, y, Math.sin(a) * out * tau * 0.6]} s={[k, k * 0.8, k]} />;
      })}
    </group>
  );
};
export { coneG, deckY, stationX };
