// "The Vasa" (Stockholm, 1628): shots timed to vasa/voice/words_asr.json (38.77 s).
// One world: Stockholm harbour at golden hour. The ship sails along +x; everything on board is placed in SHIP-LOCAL
// coordinates (bow +x, up +y, port -z = the quay side) and moved to the world with shipToWorld(), so cards, cameras
// and props heel with the hull. Port (-z) faces the quay: when she heels to port, the masts lean toward the crowd.
export const FPS = 30;
export const TOTAL = 1170;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- the ship (ship-local) ----------------
export const L0 = -23, L1 = 23, KEEL = -4.8;
const st = (a: number, b: number, x: number) => smooth((x - a) / (b - a));
export const sOf = (x: number) => (x - L0) / (L1 - L0);
/** deck height at s: poop 10.8, quarterdeck 8.6, waist 5.6, forecastle 7.6 */
export const deckY = (s: number) => 5.6 + 3.0 * (1 - st(0.28, 0.31, s)) + 2.2 * (1 - st(0.09, 0.12, s)) + 2.0 * st(0.77, 0.8, s);
/** top of the bulwark (the hull's upper edge); the stern rises into the carved taffrail */
export const topY = (s: number) => deckY(s) + 1.2 + 1.8 * (1 - st(0.0, 0.06, s));
/** half beam at s (widest 5.9 m amidships, a flat transom aft, a fine bow) */
export const beam = (s: number) => s < 0.5 ? 5.9 * (0.74 + 0.26 * Math.sin((s / 0.5) * Math.PI / 2)) : 5.9 * Math.max(0, 1 - ((s - 0.5) / 0.5) ** 2.2) ** 0.75;
/** section shape: 0 at the keel, full at ~the waterline, tumblehome above */
export const prof = (yn: number) => yn < 0.48 ? Math.sin((clamp01(yn) / 0.48) * Math.PI / 2) ** 0.55 : 1 - 0.2 * ((Math.min(1, yn) - 0.48) / 0.52) ** 1.4;
/** half width of the hull at ship-local (x, y) */
export const halfAt = (x: number, y: number) => { const s = clamp01(sOf(x)); return beam(s) * prof((y - KEEL) / (topY(s) - KEEL)); };
export const PORT_LO = 1.75, PORT_HI = 3.9;         // gun-port centres, lower and upper gun deck
export const portX = (deck: number, k: number) => -13.5 + k * 2.35 + (deck ? 1.17 : 0);
export const LION: V3 = [27.7, 8.7, 0];              // the figurehead's head
export const MASTS = { fore: { x: 14, h1: 24, h2: 38 }, main: { x: 0, h1: 28, h2: 46 }, mizzen: { x: -14.5, h1: 20, h2: 30 } };

// ---------------- the ship in the world ----------------
export const SHIP_X0 = 0;
/** heel (rad, + = port side down), forward travel, bob */
export const heelAt = (f: number) => 0.16 * smooth((f - 141) / 16) - 0.05 * smooth((f - 160) / 10);
export const shipPose = (f: number) => {
  const t = f / FPS;
  return { x: SHIP_X0 + 0.8 * t, y: 0.05 * Math.sin(t * 1.3), heel: heelAt(f) + 0.008 * Math.sin(t * 0.9), pitch: 0.004 * Math.sin(t * 1.1 + 1) };
};
/** ship-local point -> world (heel about the keel line, then a tiny pitch, then the travel) */
export const shipToWorld = (p: V3, f: number): V3 => {
  const P = shipPose(f), ch = Math.cos(P.heel), sh = Math.sin(P.heel), cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
  // heel: rotation about +x by -heel (port = -z goes down)
  let [x, y, z] = p;
  [y, z] = [y * ch + z * sh, -y * sh + z * ch];
  [x, y] = [x * cp - y * sp, x * sp + y * cp];
  return [x + P.x, y + P.y, z];
};
export const shipUp = (f: number): V3 => { const a = shipToWorld([0, 1, 0], f), o = shipToWorld([0, 0, 0], f); return [a[0] - o[0], a[1] - o[1], a[2] - o[2]]; };

// ---------------- the harbour (world) ----------------
export const QUAY_Z = -43, QUAY_Y = 1.4;           // stone quay edge (crowd side)
export const SHORE_Z = 150;                         // far shore with the town and the castle

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "candle";
export type Place = "ship" | "harbour";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; tau: (t: number) => number; sunAz?: number; sunEl?: number };
const S = (id: number, a: number, b: number, light: Light, place: Place, sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, light, place, tau: (t) => t, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 22, "golden", "ship", 62, 16),        // "Sweden built"          two proud sailors on deck, sails glowing behind
  S(2, 22, 46, "golden", "ship", 125, 22),      // "a warship"             macro: the gilded lion figurehead in the spray
  S(3, 46, 96, "golden", "ship", 150, 14),     // "with sixty-four cannons"  lids flip open down the side, guns run out
  S(4, 96, 130, "golden", "harbour", 32, 11),    // "and it lost a fight"   the whole ship, the crowd cheering on the quay
  S(5, 130, 170, "golden", "ship", 70, 16),    // "to a breeze"           a little gust, the deck tips, caps fly
  S(6, 170, TOTAL, "golden", "harbour", 4, 9), // (rest of the film: not built yet)
];
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// story beats (frames, from the word timings)
export const W = { sweden: 0, warship: 24, sixty: 44, cannons: 67, and: 97, lost: 104, fight: 118, breeze: 139, see: 169 };
/** gun port k (0..11) of deck d on side s opens at this frame in shot 3 (a ripple from the bow aft on the port side) */
export const lidOpenAt = (d: number, k: number) => 50 + (11 - k) * 2.6 + d * 5;
export const BREEZE_HIT = 141;                     // the gust reaches the sails

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number; up?: V3 };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k, up: b.up ?? a.up,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** a lens riding on the ship: pos / look given ship-local, the horizon heels with her */
const onShip = (f: number, pos: V3, look: V3, rest: Partial<Cam> = {}): Shot => ({ pos: shipToWorld(pos, f), look: shipToWorld(look, f), up: shipUp(f), ...rest });

// sailors on the waist deck, by the starboard (+z) rail, the sun ahead of the lens over the far shore
export const SAILORS: V3[] = [[-1.2, 5.6, 2.4], [-2.6, 5.6, 3.6]];
// 1: fast glide in + up, settling (fastest at frame 0)
const S1 = (f: number): Shot => { const u = easeOut(f / 30); return onShip(f, lerp3([-8.4, 6.3, -3.4], [-8.5, 6.9, -2.0], u), lerp3([0.6, 7.8, 3.8], [0.3, 8.4, 4.6], u), { fov: 46, roll: 0.06 - 0.045 * u }); };
// 2: the lion: a swoop round the figurehead from below-front to the side, very close
const S2 = (f: number): Shot => {
  const u = easeOut((f - 22) / 26);
  return onShip(f, [LION[0] + 6.4 - 0.9 * u, LION[1] - 1.4 + 0.6 * u, LION[2] - 3.6 + 0.7 * u], [LION[0] - 0.4, LION[1] - 0.7, LION[2]], { fov: 40, roll: -0.06 + 0.05 * u });
};
// 3: low off the port side at the bow, looking aft down the rows of gun ports; truck aft as they open
const S3 = (f: number): Shot => { const u = glide((f - 46) / 50); return onShip(f, [17 - 7 * u, 2.6 + 0.4 * u, -12.5 + 0.6 * u], [2 - 7 * u, 3.6, -4.2], { fov: 46, roll: 0.035 }); };
// 4: the quay: behind the crowd, the ship sailing past the castle, bow-quarter view (world coordinates)
export const CROWD_CAM = (f: number): V3 => [SHIP_X0 + 46 + 0.03 * (f - 96), QUAY_Y + 2.4, -66];
const S4 = (f: number): Shot => { const P = shipPose(f), u = (f - 96) / 34; return { pos: [CROWD_CAM(f)[0] - 1.2 * u, CROWD_CAM(f)[1] + 0.3 * u, CROWD_CAM(f)[2] + 1.5 * u], look: [P.x + 4, 17, 0], fov: 46, roll: -0.03 }; };
// 5: back on deck, a wider angle on the same two sailors; the gust crosses right to left and the deck tips
// the lens keeps 70 % of its level here, so the deck (and everything on it) visibly tips on screen
const S5 = (f: number): Shot => { const u = glide((f - 130) / 40), c = onShip(f, [7.2 - 0.5 * u, 6.6, 4.0 - 0.2 * u], [-1.6, 7.2, 1.8], { fov: 54, roll: -0.02 }), su = c.up!;
  return { ...c, up: [su[0] * 0.3, 0.3 * su[1] + 0.7, su[2] * 0.3] }; };
const S6 = (f: number): Shot => S4(Math.min(f, 129));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: 22, s: S2 }], 3: [{ f: 46, s: S3 }], 4: [{ f: 96, s: S4 }], 5: [{ f: 130, s: S5 }], 6: [{ f: 170, s: S6 }],
};

const KICKS: [number, number][] = [[T(W.cannons), 0.35], [T(W.fight), 0.3], [T(BREEZE_HIT + 3), 0.45]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id] ?? CAMS[6], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const faceOf = (p: V3, f: number): V3 => shipToWorld([p[0], p[1] + 1.55, p[2]], f);
export const DOF: Dof[] = [
  { f: 0, cInf: 11, focus: (f) => faceOf(SAILORS[0], f) },
  { f: 22, cInf: 15, focus: (f) => shipToWorld([LION[0] + 0.3, LION[1] - 0.1, LION[2]], f) },
  { f: 46, cInf: 6, focus: (f) => shipToWorld([portX(0, 8), PORT_LO, -5.6], f) },
  { f: 96, cInf: 0 },
  { f: 130, cInf: 9, focus: (f) => faceOf(SAILORS[0], f) },
  { f: 170, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  return { cInf: DOF[i].cInf, focus: DOF[i].focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
