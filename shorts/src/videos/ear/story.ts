// "Over a Single Ear" (War of Jenkins' Ear): shots timed to the voice word timings (ear/voice/words_asr.json), the
// camera grammar of the bridge short (smootherstep glides, creeping push-ins, flip-sign impact kicks, cuts on jumps).
// The world is one scene with separate places far apart (sea battle, the Rebecca, the night quay, a London street,
// the Commons chamber, a Victorian study and a museum hall); each shot looks at one of them.
export const FPS = 30;
export const TOTAL = 999;
export const D0 = 0; // ground / sea level (build.ts houses default to this)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- places ----------------
export const BRIT: V3 = [0, 0, 300];      // British man-of-war, bow toward +x (broadside faces +z)
export const SPAN: V3 = [0, 0, 345];      // Spanish man-of-war, bow toward -x
export const WAR_DECK = 3.2;
export const JAR1: V3 = [4, WAR_DECK + 0.9, 302.4]; // jar on a barrel, British deck (hook)
export const REB: V3 = [0, 0, 0];         // the brig Rebecca, bow +z
export const REB_DECK = 2.4;
export const GC: V3 = [-9.5, 0, 1];       // guarda costa alongside (port side)
export const DOCK: V3 = [0, 0, -200];     // merchant ship at the night quay
export const QUAY_Y = 2.2;
export const STACK: V3 = [9.5, QUAY_Y, -197]; // crate stack with the jar on top
export const STACK_TOP = QUAY_Y + 2.4;
export const LX = 600;                    // London street (along z)
export const PX = 1000;                   // Commons chamber centre
export const TABLE: V3 = [PX, 0, 4.3];
export const TABLE_TOP = 0.92;
export const SX = 1400;                   // study
export const DESK_TOP = 1.05;
export const BOOK: V3 = [SX, DESK_TOP + 0.012, 1.0];
export const MX = 1800;                   // museum
export const CASE: V3 = [MX - 5, 0, -3];
export const PED: V3 = [MX + 3, 0, 5];
export const PED_TOP = 1.1;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type Place = "battle" | "rebecca" | "street" | "parliament" | "dock" | "study" | "museum";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; tau: (t: number) => number; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "day", place: "battle", tau: (t) => t, sunAz: 110 },
  { id: 2, a: 150, b: 300, light: "day", place: "rebecca", tau: (t) => t },
  { id: 3, a: 300, b: 336, light: "day", place: "street", tau: (t) => t, sunAz: 120 },
  { id: 4, a: 336, b: 425, light: "day", place: "parliament", tau: (t) => t, sunEl: 62 },
  { id: 5, a: 425, b: 530, light: "day", place: "parliament", tau: (t) => t, sunEl: 62 },
  { id: 6, a: 530, b: 605, light: "day", place: "parliament", tau: (t) => t, sunEl: 62 },
  { id: 7, a: 605, b: 760, light: "night", place: "dock", tau: (t) => t },
  { id: 8, a: 760, b: 888, light: "golden", place: "study", tau: (t) => t, sunAz: 70, sunEl: 20 },
  { id: 9, a: 888, b: TOTAL, light: "day", place: "museum", tau: (t) => t, sunEl: 62 },
];
export const XFADE: Record<number, number> = { 3: 8, 4: 8, 7: 10, 8: 8, 9: 8 };
export const FLASH_AT = 150;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story events (frames) ----------------
export const FIRE = [70, 84, 97];          // broadsides: "war", "Spain", "over"
export const SWING0 = 228, STRIKE = 241;    // cutlass raised .. strike lands ("cut")
export const POP = 243;                     // the ear comes off
export const ROAR = [386, 403];
export const WON = 512;
export const STING = 535;                   // "Wait"
export const PAPERS = 905;                  // "forgot": the trade papers blow away
export const LAST = 981;                    // "ear"

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

// people (world positions; y = ground the card stands on)
export const JENKINS2: V3 = [-0.8, REB_DECK, 0.62];
export const GUARD2: V3 = [-0.8, REB_DECK, 1.58];
export const JENKINS3: V3 = [LX + 0.35, 0, 10];
export const JENKINS4: V3 = [PX, 0, -0.5];
export const PM: V3 = [PX + 1.4, 0, -3.2];
export const HISTORIAN: V3 = [SX, 0, 1.62];
const eyeY = 1.46; // standing eye height above the ground the card stands on

// shot 1: sea battle wide -> toward the Spanish ship -> jar close-up on the British deck
const S1a = (f: number) => dolly([40, 15, 262], [0, 5, 323], pushK(f, 0, 0.0022), { fov: 46 });
const S1b = (f: number) => dolly([24, 8.5, 288], [-3, 6, 343], pushK(f, 58, 0.0025), { fov: 42, roll: -0.03 });
const S1c = (f: number) => dolly([JAR1[0] + 0.21, JAR1[1] + 0.27, JAR1[2] - 1.55], [JAR1[0], JAR1[1] + 0.25, JAR1[2]], pushK(f, 108, 0.003, 0.007, 30), { fov: 34, roll: 0.03 });
// shot 2: Jenkins MCU -> two-shot with the coast guard -> crane back to both ships
const S2a = (f: number) => dolly([JENKINS2[0] + 3.2, REB_DECK + eyeY + 0.12, JENKINS2[2] - 0.6], [JENKINS2[0], REB_DECK + eyeY - 0.08, JENKINS2[2]], pushK(f, 150, 0.003), { fov: 36 });
const S2b = (f: number) => dolly([2.85, REB_DECK + 1.35, 1.1], [-0.8, REB_DECK + 1.2, 1.1], pushK(f, 196, 0.0025, 0.006, 26), { fov: 44 });
const S2c = (f: number) => dolly([9.5, 7.5, -7], [-4.2, 3.0, 1.5], pushK(f, 262, 0.002), { fov: 46 });
// shot 3: London street, bandaged Jenkins holding out the jar, people walking past
const S3a = (f: number) => dolly([LX + 1.1, 1.62, 5.4], [LX + 0.3, 1.32, 10], pushK(f, 296, 0.003), { fov: 40 });
// shot 4: chamber wide -> MPs roaring
const S4a = (f: number) => dolly([PX + 0.3, 5.2, -12.5], [PX, 1.2, 1.5], pushK(f, 332, 0.0025, 0.005, 30), { fov: 50 });
const S4b = (f: number) => dolly([PX + 1.4, 2.4, -6.6], [PX - 3.6, 1.6, 0.8], pushK(f, 384, 0.0025), { fov: 44, roll: 0.035 });
// shot 5: the PM shaking his head -> wider, the MPs surge, he gives in
const S5a = (f: number) => dolly([PM[0] - 1.2, eyeY + 0.2, PM[2] - 3.3], [PM[0], eyeY + 0.02, PM[2]], pushK(f, 425, 0.003), { fov: 36 });
const S5b = (f: number) => dolly([PX - 1.0, 2.6, -10.5], [PX + 0.9, 1.3, -3.0], pushK(f, 490, 0.0025, 0.005, 24), { fov: 46 });
// shot 6: sting on the jar on the table
const S6a = (f: number) => dolly([TABLE[0] + 0.28, TABLE_TOP + 0.36, TABLE[2] - 1.75], [TABLE[0], TABLE_TOP + 0.24, TABLE[2]], pushK(f, 530, 0.0028, 0.008, 34), { fov: 36 });
// shot 7: night quay: jar on the crate stack, crane back over the cargo; smugglers
const S7a = (f: number) => dolly([STACK[0] + 0.4, STACK_TOP + 0.36, STACK[2] - 1.7], [STACK[0], STACK_TOP + 0.24, STACK[2]], pushK(f, 600, 0.002), { fov: 36 });
const S7b = (f: number) => dolly([STACK[0] + 9, STACK_TOP + 4.5, STACK[2] - 14], [STACK[0] - 2, QUAY_Y + 1.2, STACK[2] + 3], pushK(f, 638, 0.002), { fov: 46 });
const S7c = (f: number) => dolly([15.5, QUAY_Y + 1.7, -212], [8.5, QUAY_Y + 1.25, -201.5], pushK(f, 684, 0.0025), { fov: 42 });
// shot 8: study: book CU -> historian MS -> page insert
const S8a = (f: number) => dolly([BOOK[0] + 0.04, BOOK[1] + 0.95, BOOK[2] - 1.15], [BOOK[0], BOOK[1] + 0.02, BOOK[2] + 0.04], pushK(f, 756, 0.0025), { fov: 38 });
const S8b = (f: number) => dolly([HISTORIAN[0] + 1.3, 1.62, HISTORIAN[2] - 3.6], [HISTORIAN[0], 1.32, HISTORIAN[2]], pushK(f, 800, 0.003), { fov: 40 });
const S8c = (f: number) => dolly([BOOK[0] - 0.14, BOOK[1] + 0.6, BOOK[2] - 0.38], [BOOK[0] - 0.155, BOOK[1], BOOK[2] + 0.02], pushK(f, 850, 0.002), { fov: 34, roll: -0.02 });
// shot 9: museum: the trade case -> the jar on its pedestal, final push
const S9a = (f: number) => dolly([CASE[0] + 2.4, 2.0, CASE[2] - 5.4], [CASE[0], 1.15, CASE[2]], pushK(f, 884, 0.0025), { fov: 42 });
const S9b = (f: number) => dolly([PED[0] - 0.7, 1.75, PED[2] - 3.9], [PED[0], PED_TOP + 0.22, PED[2]], pushK(f, 946, 0.003), { fov: 40 });
const S9c = (f: number) => dolly([PED[0] - 0.2, PED_TOP + 0.4, PED[2] - 1.35], [PED[0], PED_TOP + 0.24, PED[2]], pushK(f, 962, 0.002), { fov: 36, roll: 0.02 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 58, dur: 40, s: S1b }, { f: 108, cut: true, s: S1c }],
  2: [{ f: 150, s: S2a }, { f: 196, cut: true, s: S2b }, { f: 262, dur: 36, s: S2c }],
  3: [{ f: 296, s: S3a }],
  4: [{ f: 332, s: S4a }, { f: 384, cut: true, s: S4b }],
  5: [{ f: 425, s: S5a }, { f: 490, cut: true, s: S5b }],
  6: [{ f: 530, s: S6a }, { f: 540, dur: 40, s: rolled(S6a, 0.075) }],
  7: [{ f: 600, s: S7a }, { f: 638, dur: 42, s: S7b }, { f: 684, cut: true, s: S7c }],
  8: [{ f: 756, s: S8a }, { f: 800, cut: true, s: S8b }, { f: 850, cut: true, s: S8c }],
  9: [{ f: 884, s: S9a }, { f: 940, dur: 32, s: S9b }, { f: 962, dur: 30, s: S9c }],
};

// impact kicks [seconds, gain]
const KICKS: [number, number][] = [[T(FIRE[0]), 0.9], [T(FIRE[1]), 0.6], [T(FIRE[2]), 0.5], [T(POP), 1.3], [T(ROAR[0]), 0.7], [T(ROAR[1]), 0.6], [T(WON), 1.0], [T(LAST), 0.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                                    // battle wide
  { f: 108, cInf: 8, focus: () => JAR1 },                              // jar CU, Spanish ship soft
  { f: 150, cInf: 13, focus: () => [JENKINS2[0], REB_DECK + eyeY, JENKINS2[2]] }, // Jenkins MCU
  { f: 196, cInf: 9, focus: () => [0, REB_DECK + eyeY, 2.6] },          // two-shot
  { f: 262, dur: 36, cInf: 0 },                                          // crane back
  { f: 300, cInf: 10, focus: () => [JENKINS3[0], eyeY, JENKINS3[2]] },  // street
  { f: 336, cInf: 0 },                                                   // chamber wide
  { f: 384, cInf: 7 },                                                   // MPs roaring
  { f: 425, cInf: 13, focus: () => [PM[0], eyeY, PM[2]] },              // PM MCU
  { f: 490, cInf: 6, focus: () => [PM[0], eyeY, PM[2]] },
  { f: 530, cInf: 16, focus: () => [TABLE[0], TABLE_TOP + 0.24, TABLE[2]] }, // sting
  { f: 605, cInf: 14, focus: () => [STACK[0], STACK_TOP + 0.24, STACK[2]] },
  { f: 638, dur: 42, cInf: 0 },
  { f: 684, cInf: 6 },
  { f: 760, cInf: 14, focus: () => BOOK },
  { f: 800, cInf: 11, focus: () => [HISTORIAN[0], eyeY, HISTORIAN[2]] },
  { f: 850, cInf: 12, focus: () => BOOK },
  { f: 888, cInf: 5 },
  { f: 940, dur: 32, cInf: 10, focus: () => [PED[0], PED_TOP + 0.22, PED[2]] },
  { f: 962, dur: 30, cInf: 15, focus: () => [PED[0], PED_TOP + 0.24, PED[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
