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
// The film is not one continuous voyage: each place has its own ship pose (cuts hide the jumps).
//   hook 0-170: sailing out past the quay | moor 170-560: alongside the pier, the stability test (three runs)
//   leave 560-582 | sink 582-780 (out in the harbour, x 250) | diagram 780-912 (a cutaway, x 2000)
//   under 912-1014 (on the sea bed, x -2000) | surface 1014-1064 (1961, x -150) | museum 1064- (x -2600)
export const SHIP_X0 = 0;
export const MOOR_X = -8, SINK_X = 250, DIAG_X = 2000, UNDER_X = -2000, SEABED = -32, RAISE_X = -150, MUSEUM_X = -2600;
const bump = (f: number, a: number, b: number) => Math.sin(Math.PI * clamp01((f - a) / (b - a))) ** 1.3;
/** the three runs of the stability test: crew side (+1 starboard .. -1 port) and the roll it gives */
export const RUNS: [number, number, number][] = [[373, 399, -1], [412, 437, 1], [446, 470, -1]];  // [start, end, side they run to]
export const crewSide = (f: number) => { let z = 1; for (const [a, b, to] of RUNS) if (f >= a) z = f >= b ? to : -to + 2 * to * smooth((f - a) / (b - a)); return z; };
export const testHeel = (f: number) => 0.06 * bump(f, 380, 418) - 0.1 * bump(f, 418, 452) + 0.25 * bump(f, 452, 515);
export const sinkHeel = (f: number) => 0.17 * smooth((f - 592) / 20) - 0.11 * smooth((f - 612) / 22) + 0.3 * smooth((f - 642) / 56) + 0.24 * smooth((f - 700) / 76);
export const heelAt = (f: number) => f < 170 ? 0.16 * smooth((f - 141) / 16) - 0.05 * smooth((f - 160) / 10) : f < 560 ? testHeel(f) : f < 582 ? 0 : f < 780 ? sinkHeel(f) : 0;
export type Where = "hook" | "moor" | "leave" | "sink" | "diagram" | "under" | "surface" | "museum";
export const whereAt = (f: number): Where => f < 170 ? "hook" : f < 560 ? "moor" : f < 582 ? "leave" : f < 780 ? "sink" : f < 912 ? "diagram" : f < 1014 ? "under" : f < 1064 ? "surface" : "museum";
export const shipPose = (f: number) => {
  const t = f / FPS, w = whereAt(f), bobY = 0.05 * Math.sin(t * 1.3), pitch = 0.004 * Math.sin(t * 1.1 + 1);
  switch (w) {
    case "hook": return { x: SHIP_X0 + 0.8 * t, y: bobY, heel: heelAt(f) + 0.008 * Math.sin(t * 0.9), pitch };
    case "moor": return { x: MOOR_X, y: bobY * 0.5, heel: heelAt(f) + 0.004 * Math.sin(t * 0.9), pitch: pitch * 0.5 };
    case "leave": return { x: MOOR_X + 0.8 * (f - 560) / FPS, y: bobY, heel: 0.006 * Math.sin(t * 0.9), pitch };
    case "sink": return { x: SINK_X + 0.8 * (f - 582) / FPS, y: bobY - 3.6 * smooth((f - 700) / 80) ** 1.4, heel: heelAt(f) + 0.008 * Math.sin(t * 0.9), pitch: pitch + 0.03 * smooth((f - 700) / 80) };
    case "diagram": {
      const rock = 0.2 * Math.sin((2 * Math.PI * (f - 776)) / 38) * (1 - smooth((f - 815) / 22));
      return { x: DIAG_X, y: -1.55 * smooth((f - 850) / 40), heel: rock + 0.01 * Math.sin(t * 2), pitch: 0 };
    }
    case "under": return { x: UNDER_X, y: SEABED + 4.5 + 7 * smooth((f - 990) / 24) ** 1.5, heel: 0.04 - 0.03 * smooth((f - 990) / 24), pitch: 0.012 };
    case "surface": return { x: RAISE_X, y: -4.6 + 2.2 * smooth((f - 1014) / 46), heel: 0.015 * Math.sin(t * 0.8), pitch: 0.006 };
    default: return { x: MUSEUM_X, y: 0, heel: 0, pitch: 0 };
  }
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
export const PIER_X = -14, PIER_Y = 1.7;            // the pier the ship lies alongside (from the quay to her port side)
export const BOAT: V3 = [10, 0, 17];                // the foreign observers' rowboat (shot 8)

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "candle";
export type Place = "ship" | "harbour" | "diagram" | "under" | "museum";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; tau: (t: number) => number; sunAz?: number; sunEl?: number };
const S = (id: number, a: number, b: number, light: Light, place: Place, sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, light, place, tau: (t) => t, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 22, "golden", "ship", 62, 16),        // "Sweden built"          two proud sailors on deck, sails glowing behind
  S(2, 22, 46, "golden", "ship", 125, 22),      // "a warship"             macro: the gilded lion figurehead in the spray
  S(3, 46, 96, "golden", "ship", 150, 14),      // "with sixty-four cannons"  lids flip open down the side, guns run out
  S(4, 96, 130, "golden", "harbour", 32, 11),   // "and it lost a fight"   the whole ship, the crowd cheering on the quay
  S(5, 130, 170, "golden", "ship", 70, 16),     // "to a breeze"           a little gust, the deck tips, caps fly
  S(6, 170, 238, "golden", "harbour", 60, 18),  // "You see, in 1628, Sweden's"   the king struts down the pier
  S(7, 238, 280, "golden", "harbour", 75, 20),  // "king ordered a ship"   he points up at his giant ship
  S(8, 280, 316, "golden", "harbour", 40, 14),  // "to terrify Europe"     two foreign spies in a rowboat, shaking
  S(9, 316, 410, "golden", "ship", 70, 22),     // "Before it sailed, thirty sailors ran across the deck"
  S(10, 410, 492, "golden", "harbour", 120, 18),// "After three runs, it nearly tipped over"
  S(11, 492, 542, "golden", "ship", 60, 18),    // "So they stopped the test"   the admiral: STOP
  S(12, 542, 560, "golden", "ship", 60, 18),    // "and"                  ...he shrugs
  S(13, 560, 582, "golden", "harbour", 32, 11), // "sailed anyway"        off she goes, the crowd cheers
  S(14, 582, 636, "golden", "harbour", 40, 12), // "One gust tilted it."
  S(15, 636, 700, "golden", "harbour", 60, 14), // "A second poured the sea"
  S(16, 700, 746, "golden", "harbour", 110, 16),// "through its open gun ports"
  S(17, 746, 780, "golden", "harbour", 150, 18),// "thirteen hundred metres out"
  S(18, 780, 848, "day", "diagram", 140, 40),   // "It was top-heavy, and adding weight below"
  S(19, 848, 912, "day", "diagram", 140, 40),   // "would have dropped the gun ports to the waterline"
  S(20, 912, 988, "night", "under", 160, 70),   // "Three hundred thirty-three years later"
  S(21, 988, 1014, "night", "under", 160, 70),  // "they raised it"
  S(22, 1014, 1064, "day", "harbour", 120, 30), // "ninety-eight percent intact"   1961
  S(23, 1064, 1114, "candle", "museum", 140, 35),// "A terrible warship."
  S(24, 1114, TOTAL, "candle", "museum", 150, 30),// "A perfect time capsule."
];
export const XFADE: Record<number, number> = { 6: 8, 18: 8, 20: 10, 22: 8, 23: 10 };
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
export const W = { sweden: 0, warship: 24, sixty: 44, cannons: 67, and: 97, lost: 104, fight: 118, breeze: 139, see: 169, king: 241, terrify: 271, ran: 373,
  three: 423, tipped: 466, stopped: 511, anyway: 562, gust: 593, second: 639, ports: 698, out: 761, heavy: 788, adding: 815, dropped: 853, waterline: 892,
  later: 965, raised: 988, intact: 1043, terrible: 1075, capsule: 1140 };
/** gun port k (0..11) of deck d on side s opens at this frame in shot 3 (a ripple from the bow aft on the port side) */
export const lidOpenAt = (d: number, k: number) => 50 + (11 - k) * 2.6 + d * 5;
export const BREEZE_HIT = 141;                     // the gust reaches the sails
export const GUSTS = [593, 642];                   // the two gusts of the sinking
export const BALLAST = [814, 846];                 // stones pour into the hold (diagram)

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
/** on the ship but keeping k of the world's level, so the deck visibly tips on screen */
const onShipLevel = (f: number, pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot => {
  const c = onShip(f, pos, look, rest), su = c.up!;
  return { ...c, up: [su[0] * (1 - k), (1 - k) * su[1] + k, su[2] * (1 - k)] };
};
const off = (x: number, p: V3): V3 => [x + p[0], p[1], p[2]];

// sailors on the waist deck, by the starboard (+z) rail, the sun ahead of the lens over the far shore
export const SAILORS: V3[] = [[-1.2, 5.6, 2.4], [-2.6, 5.6, 3.6]];
// 1: fast glide in + up, settling (fastest at frame 0)
const S1 = (f: number): Shot => { const u = easeOut(f / 30); return onShip(f, lerp3([-8.4, 6.3, -3.4], [-8.5, 6.9, -2.0], u), lerp3([0.6, 7.8, 3.8], [0.3, 8.4, 4.6], u), { fov: 46, roll: 0.06 - 0.045 * u }); };
// 2: the lion: a swoop round the figurehead from below-front to the side
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
const S5 = (f: number): Shot => onShipLevel(f, [7.2 - 0.5 * glide((f - 130) / 40), 6.6, 4.0 - 0.2 * glide((f - 130) / 40)], [-1.6, 7.2, 1.8], 0.7, { fov: 54, roll: -0.02 });
// 6: the pier: the king struts toward the lens, the moored ship towering behind
export const KING_WALK = (f: number): V3 => [PIER_X + 0.2, PIER_Y, -17 - 6.5 * clamp01((f - 170) / 70)];
const S6 = (f: number): Shot => { const u = glide((f - 166) / 76); return { pos: [PIER_X + 3.2 - 0.6 * u, PIER_Y + 1.5, -35.5 + 1.0 * u], look: [PIER_X - 2.0, 8.4 + 0.6 * u, -6], fov: 50, roll: 0.025 }; };
// 7: low on the pier in front of the king, looking up past him at the stern
export const KING_STOP: V3 = [PIER_X + 0.2, PIER_Y, -23.5];
const S7 = (f: number): Shot => { const u = (f - 238) / 42; return { pos: [PIER_X + 2.6 - 0.3 * u, PIER_Y + 0.9, -31.4 + 0.5 * u], look: [PIER_X - 1.6, 7.4 + 0.5 * u, -10], fov: 48, roll: -0.03 }; };
// 8: the rowboat on the open-water side; the ship fills the frame behind them
const S8 = (f: number): Shot => { const u = (f - 280) / 36; return { pos: [BOAT[0] + 1.0 - 0.3 * u, 1.9, BOAT[2] + 6.6 - 0.5 * u], look: [BOAT[0] - 2.0, 2.5 + 0.4 * u, 0], fov: 50, roll: 0.03 }; };
// 9: from the forecastle, high, looking aft over the waist: the crew runs across (deck partly levelled)
const S9 = (f: number): Shot => { const u = glide((f - 316) / 94); return onShipLevel(f, [13.4 - 1.2 * u, 12.4 - 0.6 * u, -4.6 + 0.6 * u], [-2.6, 5.6, 0.3], 0.6, { fov: 50, roll: 0.02 }); };
// 10: from a boat on the quay side, low: she rolls toward the lens, more on every run
const S10 = (f: number): Shot => { const u = (f - 410) / 82; return { pos: [MOOR_X + 20 - 2 * u, QUAY_Y + 2.3, -49 + 1.0 * u], look: [MOOR_X + 2, 15 - 0.5 * u, 0], fov: 54, roll: -0.02 }; };
// 11-12: the admiral at the quarterdeck rail, from the waist (the crew frozen at the port rail)
export const ADMIRAL: V3 = [-10.0, 8.6, 1.2];
const S11 = (f: number): Shot => { const u = (f - 492) / 50; return onShipLevel(f, [-4.6 - 0.4 * u, 7.6, 3.6 - 0.2 * u], [-10.0, 9.7, 0.9], 0.5, { fov: 50, roll: 0.02 }); };
const S12 = (f: number): Shot => { const u = (f - 542) / 18; return onShip(f, [-5.6 - 0.2 * u, 8.9, -1.6], [-10.0, 9.8, 1.0], { fov: 46, roll: -0.03 }); };
// 13: the quay again: she leaves, the crowd cheers
const S13 = (f: number): Shot => { const P = shipPose(f), u = (f - 560) / 22; return { pos: [MOOR_X + 40 - 1.0 * u, QUAY_Y + 2.6, -64 + 0.8 * u], look: [P.x + 4, 16, 0], fov: 46, roll: 0.03 }; };
// 14: low on the water, port bow: the first gust
const S14 = (f: number): Shot => { const P = shipPose(f), u = (f - 582) / 54; return { pos: [P.x + 12 - 1.5 * u, 2.0, -27 + u], look: [P.x + 1, 12.5, 0], fov: 54, roll: 0.02 }; };
// 15: high bow-quarter: the second gust, she goes over
const S15 = (f: number): Shot => { const P = shipPose(f), u = glide((f - 636) / 64); return { pos: [P.x + 40 - 6 * u, 20 - 4 * u, -40 + 6 * u], look: [P.x + 1, 6, -1], fov: 50, roll: -0.04 }; };
// 16: down at the lower gun ports as the sea pours in (port side, amidships)
const S16 = (f: number): Shot => { const P = shipPose(f), u = (f - 700) / 46; return { pos: [P.x + 3.5 - 2.5 * u, 1.3, -12.5 + 0.5 * u], look: [P.x - 3 - 2 * u, 0.4, -4.5], fov: 50, roll: 0.05 }; };
// 17: aerial from the open water, looking back at the town far away: she is going down out here
const S17 = (f: number): Shot => { const P = shipPose(f), u = (f - 746) / 34; return { pos: [P.x + 70 - 6 * u, 46 - 4 * u, 62 - 4 * u], look: [P.x - 30, 0, -10], fov: 52, roll: 0.0 }; };
// 18-19: the cutaway: a long lens straight down the ship's length at a cross-section (cut amidships)
export const CUT_X = 1.2;                          // ship-local x of the section plane (the bow half is clipped away)
const S18 = (f: number): Shot => { const u = (f - 776) / 72; return { pos: [DIAG_X + 92 - 4 * u, 3.4, 0], look: [DIAG_X, 3.4 + 0.2 * u, 0], fov: 23, roll: 0 }; };
const S19 = (f: number): Shot => { const u = glide((f - 848) / 64); return { pos: [DIAG_X + 78 - 14 * u, 1.6, 0], look: [DIAG_X, 1.0 - 0.6 * u, 0], fov: 20 - 3 * u, roll: 0 }; };
// 20-21: under the sea: drifting down past the wreck on the sea bed, then the lift
const S20 = (f: number): Shot => { const u = glide((f - 908) / 80); return { pos: [UNDER_X + 34 - 8 * u, SEABED + 20 - 12 * u, -26 + 6 * u], look: [UNDER_X + 2, SEABED + 7, 0], fov: 50, roll: 0.03 }; };
const S21 = (f: number): Shot => { const u = (f - 988) / 26; return { pos: [UNDER_X + 26, SEABED + 3.5 + 1.5 * u, -24], look: [UNDER_X, SEABED + 9 + 4 * u, 0], fov: 52, roll: -0.03 }; };
// 22: 1961: the hull breaks the surface between the pontoons; the quay crowd and their flashbulbs
export const CROWD61_CAM: V3 = [RAISE_X + 30, QUAY_Y + 2.4, -64];
const S22 = (f: number): Shot => { const u = (f - 1010) / 54; return { pos: [CROWD61_CAM[0] - 2 * u, CROWD61_CAM[1] + 0.3 * u, CROWD61_CAM[2] + 1.6 * u], look: [RAISE_X + 2, 9, 0], fov: 50, roll: -0.02 }; };
// 23-24: the museum hall
const S23 = (f: number): Shot => { const u = glide((f - 1060) / 54); return { pos: [MUSEUM_X + 33 - 3 * u, 4.4 + 1.2 * u, -31 + 2 * u], look: [MUSEUM_X + 3, 12, 0], fov: 54, roll: 0.02 }; };
const S24 = (f: number): Shot => { const u = glide((f - 1114) / 56); return { pos: [MUSEUM_X + 37.8 - 0.6 * u, 6.4, -9.0 + 0.4 * u], look: [MUSEUM_X + 29.6, 7.4, -2.6], fov: 46, roll: -0.03 + 0.02 * u }; };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: 22, s: S2 }], 3: [{ f: 46, s: S3 }], 4: [{ f: 96, s: S4 }], 5: [{ f: 130, s: S5 }], 6: [{ f: 166, s: S6 }],
  7: [{ f: 238, s: S7 }], 8: [{ f: 280, s: S8 }], 9: [{ f: 316, s: S9 }], 10: [{ f: 410, s: S10 }], 11: [{ f: 492, s: S11 }], 12: [{ f: 542, s: S12 }],
  13: [{ f: 560, s: S13 }], 14: [{ f: 582, s: S14 }], 15: [{ f: 636, s: S15 }], 16: [{ f: 700, s: S16 }], 17: [{ f: 746, s: S17 }], 18: [{ f: 776, s: S18 }],
  19: [{ f: 848, s: S19 }], 20: [{ f: 908, s: S20 }], 21: [{ f: 988, s: S21 }], 22: [{ f: 1010, s: S22 }], 23: [{ f: 1060, s: S23 }], 24: [{ f: 1114, s: S24 }],
};

const KICKS: [number, number][] = [[T(W.cannons), 0.35], [T(W.fight), 0.3], [T(BREEZE_HIT + 3), 0.45], [T(W.see), 0.4], [T(W.tipped + 8), 0.35], [T(W.stopped), 0.4],
  [T(GUSTS[0] + 8), 0.3], [T(GUSTS[1] + 10), 0.45], [T(W.ports), 0.35], [T(W.waterline), 0.3], [T(W.raised + 2), 0.35], [T(W.capsule), 0.3]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id] ?? CAMS[24], f), a = kickAt(T(f));
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
  { f: 170, cInf: 8, focus: (f) => { const k = KING_WALK(f); return [k[0], k[1] + 1.6, k[2]]; } },
  { f: 238, cInf: 10, focus: () => [KING_STOP[0], KING_STOP[1] + 1.6, KING_STOP[2]] },
  { f: 280, cInf: 10, focus: () => [BOAT[0], 1.6, BOAT[2]] },
  { f: 316, cInf: 4 },
  { f: 410, cInf: 0 },
  { f: 492, cInf: 7, focus: (f) => faceOf(ADMIRAL, f) },
  { f: 542, cInf: 11, focus: (f) => faceOf(ADMIRAL, f) },
  { f: 560, cInf: 0 },
  { f: 700, cInf: 7, focus: (f) => shipToWorld([-4, PORT_LO, -5.6], f) },
  { f: 746, cInf: 0 },
  { f: 1114, cInf: 8, focus: () => [MUSEUM_X + 32.6, 6.4, -5.9] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  return { cInf: DOF[i].cInf, focus: DOF[i].focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
void off;
