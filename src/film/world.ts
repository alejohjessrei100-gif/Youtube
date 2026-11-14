// The world of "Same island" as DATA (no React). Two real places on Auckland Island, about 40 km apart:
//   G  the north arm of Carnley Harbour: a sheltered cove with a gravel beach, a grassy terrace and steep slopes of
//      southern rata forest. The schooner Grafton struck this beach; her five men lived here.
//   I  the exposed north-west coast: a narrow rock ledge under a wall of basalt sea cliffs, open ocean swell.
//      The 1,100-ton Invercauld broke up here at night.
//   SEA  open ocean (the boat's crossing).   MAP  a period chart of the island (geography).
// Heights, the sea and every placement live here; Sets.tsx draws them and plan/check_scene.ts verifies them.
import type { V3 } from "../inkbeat/types";

export type SetId = "G" | "I" | "SEA" | "MAP";
export const ss = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ------------------------------------------------------------------ terrain (sea level y = 0, +z = out to sea)
/** Carnley Harbour cove: shore near z = 0, gravel beach, terrace (camp), forested slope; rocky points at the sides */
export const hG = (x: number, z: number) => {
  const ax = Math.abs(x);
  const d = 5 * ss(22, 36, ax) - z; // meters inland from the waterline
  if (d < 0) return Math.max(-7, d * 0.18);
  let h = 0.07 * Math.min(d, 10) + 0.02 * clamp(d - 10, 0, 12);
  h += 30 * Math.pow(ss(22, 80, d), 1.3);
  h += 4 * ss(24, 38, ax) * ss(0, 7, d);
  const rough = ss(21, 34, d) + 0.6 * ss(26, 38, ax) * ss(1, 6, d);
  return h + rough * (0.9 * Math.sin(x * 0.31 + 1.3) * Math.sin(z * 0.27 + 0.4) + 0.5 * Math.sin(x * 0.53 + z * 0.61));
};
/** the north-west coast: a rough rock ledge (0–7 m from the water) under 36 m basalt cliffs */
export const hI = (x: number, z: number) => {
  const d = -z + 1.5 * Math.sin(x * 0.18);
  if (d < 0) return Math.max(-9, d * 0.55);
  const ledge = 1.0 * ss(0, 2.2, d) + 0.2 * Math.sin(x * 0.9) * Math.sin(d * 1.3 + x * 0.3) * ss(1, 3, d);
  const dc = d + 0.5 * Math.sin(x * 2.4 + Math.sin(x * 0.7)) * ss(5.5, 8, d) * (1 - ss(11, 13, d));
  const cl = ss(7, 10.5, dc);
  return ledge + (36 + 3 * Math.sin(x * 0.11)) * cl + 1.4 * Math.sin(x * 1.3) * cl * (1 - ss(10.5, 14, dc)) + 2 * ss(12, 60, d);
};
export const groundAt = (set: SetId, x: number, z: number) => (set === "G" ? hG(x, z) : set === "I" ? hI(x, z) : -40);
/** inland distance (m) from the waterline; < 0 = in the sea */
export const inland = (set: SetId, x: number, z: number) => (set === "G" ? 5 * ss(22, 36, Math.abs(x)) - z : set === "I" ? -z + 1.5 * Math.sin(x * 0.18) : -100);

// ------------------------------------------------------------------ the sea: waves only where the water is deep
export const seaMask = (set: SetId, x: number, z: number) => ss(-0.4, -3.5, groundAt(set, x, z));
/** raw swell (no shore mask): three trains; k = 1 calm harbour, 3 storm ocean */
export const swell = (x: number, z: number, t: number, k: number) =>
  k * (0.34 * Math.sin(x * 0.19 + z * 0.06 + t * 0.95) + 0.26 * Math.sin(z * 0.31 - t * 1.15 + x * 0.05) + 0.19 * Math.sin((x - z) * 0.47 + t * 1.6));
export const seaAt = (set: SetId, x: number, z: number, t: number, k: number) => {
  const m = seaMask(set, x, z);
  return m === 0 ? 0 : m * swell(x, z, t, k);
};

// ------------------------------------------------------------------ vessels
export const SHIPS = {
  /** the Grafton: a 56-ton two-masted schooner */
  grafton: { L: 17, B: 5, D: 3.1, masts: [0.64, 0.36] as number[], mastH: 15 },
  /** the Invercauld: an 1,100-ton three-masted ship */
  invercauld: { L: 52, B: 10, D: 7.5, masts: [0.76, 0.5, 0.24] as number[], mastH: 38 },
  /** the castaways' boat (the schooner's dinghy, rebuilt) */
  boat: { L: 5.2, B: 1.8, D: 0.85, masts: [0.58] as number[], mastH: 4.4 },
};
export type Hull = { L: number; B: number; D: number; masts: number[]; mastH: number };
/** a vessel's pose: keel-origin position, yaw (bow = local +x → world (cos yaw, 0, -sin yaw)), pitch (bow up), roll */
export type Pose = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
/** a vessel riding the sea surface: draft below the surface, pitched and rolled to the wave slope */
export const afloat = (set: SetId, hull: Hull, x: number, z: number, yaw: number, t: number, k: number, draft = hull.D * 0.42): Pose => {
  const ax = Math.cos(yaw);
  const az = -Math.sin(yaw);
  const L = hull.L * 0.36;
  const B = hull.B * 0.4;
  const hb = seaAt(set, x + ax * L, z + az * L, t, k);
  const hs = seaAt(set, x - ax * L, z - az * L, t, k);
  const hp = seaAt(set, x - az * B, z + ax * B, t, k);
  const hq = seaAt(set, x + az * B, z - ax * B, t, k);
  return { x, z, yaw, y: (hb + hs + hp + hq) / 4 - draft, pitch: Math.atan2(hb - hs, 2 * L), roll: -Math.atan2(hp - hq, 2 * B) };
};
/** a point given in the vessel's frame (lx toward the bow, ly up from the keel, lz to starboard) → world */
export const onVessel = (p: Pose, lx: number, ly: number, lz: number): V3 => {
  // roll about x, then pitch about z, then yaw about y (the same order as the drawn groups)
  const y1 = ly * Math.cos(p.roll) - lz * Math.sin(p.roll);
  const z1 = ly * Math.sin(p.roll) + lz * Math.cos(p.roll);
  const x2 = lx * Math.cos(p.pitch) - y1 * Math.sin(p.pitch);
  const y2 = lx * Math.sin(p.pitch) + y1 * Math.cos(p.pitch);
  return [p.x + x2 * Math.cos(p.yaw) + z1 * Math.sin(p.yaw), p.y + y2, p.z - x2 * Math.sin(p.yaw) + z1 * Math.cos(p.yaw)];
};
export const mixPose = (a: Pose, b: Pose, u: number): Pose => ({
  x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u,
  yaw: a.yaw + (b.yaw - a.yaw) * u, pitch: a.pitch + (b.pitch - a.pitch) * u, roll: a.roll + (b.roll - a.roll) * u,
});

// ------------------------------------------------------------------ placements, set G (Carnley Harbour)
/** where the Grafton lies after the wreck: bow on the gravel, heeled to port, stern in the water */
export const WRECK_G: Pose = { x: 17, y: -1.15, z: 6.5, yaw: 1.25, pitch: 0.07, roll: -0.42 };
export const HUT = { x: -7, z: -15, yaw: 0.25, w: 5.2, d: 3.6, wallH: 1.9 };
export const hutToWorld = (lx: number, lz: number): [number, number] => [HUT.x + lx * Math.cos(HUT.yaw) + lz * Math.sin(HUT.yaw), HUT.z - lx * Math.sin(HUT.yaw) + lz * Math.cos(HUT.yaw)];
export const hutDist = (x: number, z: number) => {
  const dx = x - HUT.x;
  const dz = z - HUT.z;
  const lx = dx * Math.cos(HUT.yaw) - dz * Math.sin(HUT.yaw);
  const lz = dx * Math.sin(HUT.yaw) + dz * Math.cos(HUT.yaw);
  const ox = Math.max(0, Math.abs(lx + 0.35) - (HUT.w / 2 + 0.8));
  const oz = Math.max(0, Math.abs(lz) - (HUT.d / 2 + 0.2));
  return ox === 0 && oz === 0 ? -1 : Math.hypot(ox, oz);
};
export const FIRE: [number, number] = [-2.2, -10.6];
export const BOAT_SITE = { x: 9.5, z: -4.2, yaw: 0.2 };
export const TALLY: [number, number] = [-10.6, -11.4];

/** a loose object with a footprint (checked for overlaps; every one has a job in the story) */
export type Prop = { kind: "fire" | "woodpile" | "cask" | "spars" | "tally" | "rock" | "chest"; set: SetId; x: number; z: number; r: number; h: number; len?: number; yaw?: number; s?: number };
export const PROPS: Prop[] = [
  { kind: "fire", set: "G", x: FIRE[0], z: FIRE[1], r: 0.85, h: 1.5 },
  // salvage from the schooner: her spars (the hut's frame), a water cask, a sea chest; firewood for the hearth
  { kind: "spars", set: "G", x: 2.6, z: -6.2, r: 0.35, h: 0.45, len: 5.0, yaw: 0.5 },
  { kind: "cask", set: "G", x: -11.2, z: -13.4, r: 0.42, h: 0.95 },
  { kind: "chest", set: "G", x: -0.4, z: -13.6, r: 0.5, h: 0.5, yaw: 0.4 },
  { kind: "woodpile", set: "G", x: 1.5, z: -12.6, r: 0.75, h: 0.7, yaw: 0.3 },
  { kind: "tally", set: "G", x: TALLY[0], z: TALLY[1], r: 0.14, h: 1.7 },
  // beach boulders (half buried)
  { kind: "rock", set: "G", x: -15.5, z: -3.2, r: 1.0, h: 0.7, yaw: 1.1 },
  { kind: "rock", set: "G", x: -19.4, z: -6.4, r: 0.7, h: 0.5, yaw: 2.3 },
  { kind: "rock", set: "G", x: 23.2, z: -4.8, r: 1.2, h: 0.9, yaw: 0.6 },
  { kind: "rock", set: "G", x: 29.8, z: -3.0, r: 1.5, h: 1.2, yaw: 2.9 },
  { kind: "rock", set: "G", x: 14.4, z: -1.8, r: 0.9, h: 0.6, yaw: 4.1 },
  { kind: "rock", set: "G", x: -26.0, z: -4.0, r: 1.4, h: 1.1, yaw: 0.2 },
  // the ledge under the cliffs: boulders and wreckage
  { kind: "rock", set: "I", x: -17.5, z: -3.6, r: 1.3, h: 1.0, yaw: 0.7 },
  { kind: "rock", set: "I", x: 19.5, z: -4.6, r: 1.6, h: 1.3, yaw: 2.2 },
  { kind: "rock", set: "I", x: -12.5, z: -5.8, r: 0.9, h: 0.7, yaw: 3.3 },
  { kind: "rock", set: "I", x: 12.2, z: -6.0, r: 1.0, h: 0.8, yaw: 5.1 },
  { kind: "spars", set: "I", x: 14.0, z: -1.9, r: 0.3, h: 0.4, len: 4.4, yaw: 0.15 },
  { kind: "cask", set: "I", x: -14.6, z: -1.9, r: 0.42, h: 0.75 },
];
export const propDist = (p: Prop, x: number, z: number) => {
  if (!p.len) return Math.hypot(x - p.x, z - p.z) - p.r;
  const ax = Math.cos(p.yaw ?? 0);
  const az = -Math.sin(p.yaw ?? 0);
  const u = clamp((x - p.x) * ax + (z - p.z) * az, -p.len / 2, p.len / 2);
  return Math.hypot(x - (p.x + ax * u), z - (p.z + az * u)) - p.r;
};

// ------------------------------------------------------------------ rata forest (set G): deterministic scatter on the slopes
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export type Tree = { x: number; z: number; s: number; yaw: number; bloom: number };
export const TREES: Tree[] = (() => {
  const out: Tree[] = [];
  for (let i = 0; out.length < 46 && i < 400; i++) {
    const x = -62 + 124 * hash(i * 3.1);
    const z = -66 + 62 * hash(i * 7.7 + 2);
    const d = inland("G", x, z);
    const side = Math.abs(x) > 27 && d > 5 && d < 30; // the rocky points carry trees too
    if (!(d > 23 && d < 62) && !side) continue;
    if (hutDist(x, z) < 5) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 4.2)) continue;
    out.push({ x, z, s: 0.8 + 0.7 * hash(i * 1.7 + 5), yaw: hash(i * 9.1) * 6.28, bloom: hash(i * 4.3 + 1) });
  }
  return out;
})();

// ------------------------------------------------------------------ set I: the Invercauld and her people
/** what is left of the Invercauld on the rocks: the bow section jammed against the ledge, heeled hard */
export const WRECK_I: Pose = { x: 30, y: -3.4, z: 14, yaw: 0.9, pitch: 0.14, roll: 0.5 };
/** z on the Invercauld ledge at x for a given distance d (m) inland from the waterline (the shore wobbles ±1.5 m) */
export const ledgeZ = (x: number, d: number) => 1.5 * Math.sin(x * 0.18) - d;
/** nineteen men got ashore. Six lie where the sea left them (feet at the water's edge, bodies toward the cliff, 1.7 m
 *  long); thirteen stand or crouch behind them in two rows. Nobody overlaps anybody, nobody is in the sea or the cliff. */
export const NINETEEN_SPEC: { x: number; d: number; prone: boolean }[] = [
  ...[-7.6, -4.4, -1.2, 2.0, 5.2, 8.4].map((x) => ({ x, d: 1.9, prone: true })),
  ...[-8.2, -5.6, -3.0, -0.4, 2.2, 4.8, 7.4].map((x) => ({ x, d: 4.7, prone: false })),
  ...[-6.9, -4.3, -1.7, 0.9, 3.5, 6.1].map((x) => ({ x, d: 5.9, prone: false })),
];
export const NINETEEN: [number, number][] = NINETEEN_SPEC.map(({ x, d }) => [x, Math.round(ledgeZ(x, d) * 100) / 100]);
export { hash };
