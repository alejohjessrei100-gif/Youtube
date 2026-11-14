// The island's layout as DATA (no React): terrain heights, the sea, every prop with a footprint, the hut, the boat.
// Island.tsx draws from this and plan/check_scene.ts verifies it (no overlaps, nothing floating, nothing in the sea
// that belongs on land), so placement bugs are caught before any frame is rendered.
import type { V3 } from "../inkbeat/types";

/** the land top (sea level is y = 0) */
export const LAND = 0.3;
/** the beach starts at z = BEACH_Z and drops BEACH_SLOPE per meter; it meets the sea at SHORE_Z */
export const BEACH_Z = 8;
export const BEACH_SLOPE = 0.05;
export const SHORE_Z = BEACH_Z + LAND / BEACH_SLOPE; // 14
/** the land slab: x in [-LAND_X, LAND_X], z in [LAND_Z0, BEACH_Z] */
export const LAND_X = 70;
export const LAND_Z0 = -62;
export const RIDGE = { c: [0, LAND, -4] as V3, r: [16, 9, 22] as V3 };

const sstep = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** ground height: the ridge (an ellipsoid hill), the flat land, or the beach sloping into the sea */
export const groundAt = (x: number, z: number) => {
  const dx = (x - RIDGE.c[0]) / RIDGE.r[0];
  const dz = (z - RIDGE.c[2]) / RIDGE.r[2];
  const k = 1 - dx * dx - dz * dz;
  const base = z > BEACH_Z ? LAND - (z - BEACH_Z) * BEACH_SLOPE : LAND;
  return k > 0 ? Math.max(base, LAND + RIDGE.r[1] * Math.sqrt(k)) : base;
};
export const onRidge = (x: number, z: number) => {
  const dx = (x - RIDGE.c[0]) / RIDGE.r[0];
  const dz = (z - RIDGE.c[2]) / RIDGE.r[2];
  return dx * dx + dz * dz < 1;
};

// ------------------------------------------------------------------ the sea
/** 0 at the shore and under the island (the water is FLAT there and can never rise onto land), 1 in open water */
export const seaMask = (x: number, z: number) => {
  const ox = Math.max(0, Math.abs(x) - LAND_X);
  const oz = Math.max(0, z - SHORE_Z, LAND_Z0 - z);
  return sstep(0, 18, Math.hypot(ox, oz));
};
/** sea surface height at a point; k = swell (1 calm, 2 rough). Waves only exist away from the shore. */
export const seaAt = (x: number, z: number, t: number, k: number) => {
  const m = seaMask(x, z);
  if (m === 0) return 0;
  return m * k * (0.3 * Math.sin(x * 0.21 + t * 0.9) + 0.24 * Math.sin(z * 0.33 - t * 1.1 + x * 0.05) + 0.08 * Math.sin((x + z) * 0.45 + t * 1.5));
};

// ------------------------------------------------------------------ the hut (Grafton camp)
export const HUT = { x: -28, z: 2, yaw: 0.15, hw: 2.2, hd: 1.7, wallH: 2.3 };
export const GRAFTON: V3 = [HUT.x, LAND, HUT.z];
/** hut-local (lx along the front wall, lz out of the door) → world x, z */
export const hutToWorld = (lx: number, lz: number): [number, number] => [
  HUT.x + lx * Math.cos(HUT.yaw) + lz * Math.sin(HUT.yaw),
  HUT.z - lx * Math.sin(HUT.yaw) + lz * Math.cos(HUT.yaw),
];
export const worldToHut = (x: number, z: number): [number, number] => {
  const dx = x - HUT.x;
  const dz = z - HUT.z;
  return [dx * Math.cos(HUT.yaw) - dz * Math.sin(HUT.yaw), dx * Math.sin(HUT.yaw) + dz * Math.cos(HUT.yaw)];
};
/** distance outside the hut's footprint (walls + chimney + firewood + water barrel); <= 0 inside */
export const hutDist = (x: number, z: number) => {
  const [lx, lz] = worldToHut(x, z);
  const ox = Math.max(0, Math.abs(lx + 0.15) - 3.25);
  const oz = Math.max(0, Math.abs(lz) - 1.95);
  return ox === 0 && oz === 0 ? -1 : Math.hypot(ox, oz);
};
export const FIRE: [number, number] = [-24.6, 6.0];

// ------------------------------------------------------------------ props (every loose object in the world)
export type PropKind = "crate" | "barrel" | "barrelTip" | "log" | "net" | "rock" | "tussock" | "plank" | "pot" | "dryline" | "board" | "sign" | "fire" | "planks";
export type Prop = {
  kind: PropKind;
  x: number;
  z: number;
  /** footprint radius (for a long prop: its half-thickness; `len` is its length along `yaw`) */
  r: number;
  /** height (camera and line-of-sight checks) */
  h: number;
  len?: number;
  yaw?: number;
  /** size multiplier */
  s?: number;
  text?: string;
};
const P = (kind: PropKind, x: number, z: number, r: number, h: number, o: Partial<Prop> = {}): Prop => ({ kind, x, z, r, h, ...o });

/** the 1864 board (Grafton beach) and the 40 KM sign (flat ground at the foot of the ridge, nothing within 3 m) */
export const BOARD = P("board", -27.5, 12.9, 0.12, 1.4, { len: 2.6, yaw: 2.14, text: "1864" });
export const SIGN = P("sign", -16.6, 6.6, 0.16, 2.6, { len: 2.3, yaw: 0, text: "40 KM" });
/** where the boat is built (on the beach east of the camp) */
export const BOAT_SITE = { x: -21.5, z: 9.6, yaw: 0.2 };
export const BOAT = { L: 2.3, B: 0.85, D: 0.75, floor: 0.2 };

export const PROPS: Prop[] = [
  P("fire", FIRE[0], FIRE[1], 0.9, 1.55),
  BOARD,
  SIGN,
  // the Grafton camp
  P("crate", -31.6, 5.0, 0.48, 0.65, { yaw: 0.3 }),
  P("crate", -32.5, 6.1, 0.38, 0.5, { yaw: -0.4, s: 0.5 }),
  P("barrel", -23.3, 2.9, 0.4, 0.95),
  P("barrelTip", -30.6, 8.6, 0.42, 0.75, { len: 0.95, yaw: 0.8 }),
  P("log", -25.0, 8.2, 0.16, 0.3, { len: 2.2, yaw: 0.05 }),
  P("log", -21.2, 5.4, 0.16, 0.3, { len: 1.8, yaw: 1.3 }),
  P("dryline", -34.6, 3.6, 0.1, 2.1, { len: 3.4, yaw: 1.2 }),
  P("net", -31.8, 11.0, 0.7, 0.3),
  P("pot", -21.6, 3.6, 0.24, 0.32),
  P("rock", -34.0, 9.4, 0.6, 0.5),
  P("rock", -19.6, 3.2, 0.75, 0.6, { yaw: 1 }),
  P("planks", -18.4, 10.6, 0.8, 0.25, { yaw: 0.5 }),
  P("tussock", -36.2, 1.0, 0.6, 0.9),
  P("tussock", -30.2, -3.2, 0.6, 0.9),
  P("tussock", -24.6, -4.0, 0.7, 1.0, { s: 1.2 }),
  P("tussock", -19.4, -0.6, 0.6, 0.9),
  P("tussock", -34.4, -2.4, 0.7, 1.0, { s: 1.2 }),
  // the foot of the ridge (clear of the sign)
  P("rock", -13.2, 11.4, 0.9, 0.7, { s: 1.3, yaw: 2 }),
  // the Invercauld shore: debris at the edges, the middle stays clear for the men
  P("barrelTip", 25.6, 12.0, 0.42, 0.75, { len: 0.95, yaw: 0.4 }),
  P("crate", 24.8, 9.2, 0.42, 0.55, { yaw: 0.7, s: 0.55 }),
  P("log", 38.2, 10.6, 0.14, 0.26, { len: 2.6, yaw: 0.5 }),
  P("plank", 22.2, 12.9, 0.14, 0.08, { len: 2.0, yaw: 0.9 }),
  P("plank", 36.8, 13.1, 0.13, 0.08, { len: 1.6, yaw: -0.3 }),
  P("rock", 22.8, 10.8, 0.75, 0.6),
  P("rock", 39.6, 12.4, 0.95, 0.75, { yaw: 2, s: 1.2 }),
  P("barrelTip", 37.8, 8.0, 0.42, 0.75, { len: 0.95, yaw: -0.9 }),
  P("tussock", 26.6, 4.4, 0.6, 0.9),
  P("tussock", 36.6, 4.8, 0.7, 1.0, { s: 1.2 }),
  P("tussock", 23.6, 6.4, 0.5, 0.8, { s: 0.8 }),
  P("tussock", 40.2, 6.0, 0.6, 0.9),
  P("rock", 21.0, 3.0, 0.9, 0.7, { yaw: 1.3 }),
  P("rock", 41.0, 2.0, 1.0, 0.8, { s: 1.3 }),
  // the ridge: tussocks only (rocks on the steep slope read as floating balls from below)
  P("tussock", 3, 6, 0.6, 0.9),
  P("tussock", -4, 9, 0.7, 1.0, { s: 1.2 }),
  P("tussock", 11, -4, 0.6, 0.9),
  P("tussock", -11, 1, 0.5, 0.8, { s: 0.8 }),
];

/** the two wrecks (in the shallows, aground): hull half-length a, depth h, half-beam b */
export const WRECKS = {
  // driven ashore bow-first: the bow on the waterline, the stern in the water, seen 3/4 from the beach
  grafton: { x: -35.2, z: 19.6, yaw: 1.17, heel: 0.22, pitch: 0.09, sink: 0.6, a: 6.5, h: 2.0, b: 1.6, mast: 4.6 },
  invercauld: { x: 33.5, z: 20.5, yaw: 0.5, heel: 0.6, pitch: -0.2, sink: 1.0, a: 7.5, h: 2.1, b: 1.7, mast: 2.2 },
};

/** distance from a point to a prop's footprint edge (<= 0 = inside) */
export const propDist = (p: Prop, x: number, z: number) => {
  if (!p.len) return Math.hypot(x - p.x, z - p.z) - p.r;
  const yaw = p.yaw ?? 0;
  const ax = Math.cos(yaw);
  const az = -Math.sin(yaw);
  const u = Math.max(-p.len / 2, Math.min(p.len / 2, (x - p.x) * ax + (z - p.z) * az));
  return Math.hypot(x - (p.x + ax * u), z - (p.z + az * u)) - p.r;
};

// ------------------------------------------------------------------ the boat afloat: it rides the sea surface
/** position and tilt of the boat on the waves (hull bottom 0.3 m under the surface, pitched and rolled to the swell) */
export const boatPose = (x: number, z: number, yaw: number, t: number, k: number) => {
  const ax = Math.cos(yaw);
  const az = -Math.sin(yaw);
  const sx = Math.sin(yaw);
  const sz = Math.cos(yaw);
  const L = 1.8;
  const B = 0.6;
  const hb = seaAt(x + ax * L, z + az * L, t, k);
  const hs = seaAt(x - ax * L, z - az * L, t, k);
  const hp = seaAt(x + sx * B, z + sz * B, t, k);
  const hq = seaAt(x - sx * B, z - sz * B, t, k);
  return { x, z, yaw, y: (hb + hs + hp + hq) / 4 - 0.3, pitch: Math.atan2(hb - hs, 2 * L), roll: -Math.atan2(hp - hq, 2 * B) };
};
export type BoatPose = ReturnType<typeof boatPose>;
/** a point on the boat's floor, lx meters toward the bow → world */
export const onBoat = (b: BoatPose, lx: number): V3 => [
  b.x + lx * Math.cos(b.pitch) * Math.cos(b.yaw),
  b.y + BOAT.floor + 0.025 + lx * Math.sin(b.pitch),
  b.z - lx * Math.cos(b.pitch) * Math.sin(b.yaw),
];
