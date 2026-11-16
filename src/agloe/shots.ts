// The Agloe short as DATA: 21 setups anchored to words of the voice (never typed times), each with camera keys
// (a key is a ~0.6 s eased move that starts 6 frames before its word), the actors and the set state.
import type { CharacterSpec, FaceState, HandPropKind, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { handWorld, holdInFront, solveArm } from "../inkbeat/core/ik";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { BUILDER, MAKER, PARTNER, REP } from "./cast";
import { DOT, FX, RIVAL_X, SIGN_P, STORE_P, TABLE_Y } from "./world";
import type { FieldState, OfficeState } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
/** onset of the nth occurrence of a word (1-based) */
export const W = (word: string, nth = 1) => {
  let k = 0;
  for (const [w, a] of WORDS) if (norm(w) === norm(word) && ++k === nth) return a;
  throw new Error(`word not found: ${word} #${nth}`);
};
const C = (pos: V3, look: V3, fov: number): Cam => ({ pos, look, fov, roll: 0 });
const q = (t: number, hz = 15) => Math.round(t * hz) / hz;

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose?: BodyPose; face?: FaceState; hold?: HandPropKind | null; holdSide?: "L" | "R"; ik?: boolean; face3q?: boolean };
export type Extra = { pen?: { tip: V3; top: V3 }; magnifier?: V3; hammer?: { hand: V3; swing: number }; mapInHand?: { p: V3; yaw: number } };
export type Key = { at: number; cam: Cam; dur?: number };
export type Setup = {
  id: number;
  t0: number;
  mood: string;
  set: "office" | "rival" | "field";
  keys: Key[];
  actors: (t: number) => Actor[];
  office?: (t: number) => OfficeState;
  field?: (t: number) => FieldState;
  extra?: (t: number) => Extra;
  focus: V3;
  blur: number;
  /** enter with a whip pan (a set change) */
  whip?: boolean;
  shake?: number[];
  sky?: boolean;
};

// faces
const FOCUS: FaceState = { eyes: "squint", mouth: "smirk", brows: "neutral", look: 0 };
const SLY: FaceState = { eyes: "half", mouth: "smirk", brows: "raised" };
const PROUD: FaceState = { eyes: "half", mouth: "grin", brows: "raised" };
const SHOCK: FaceState = { eyes: "wide", mouth: "o", brows: "raised" };
const ANGRY: FaceState = { eyes: "angry", mouth: "yell", brows: "angry", flush: 0.6 };
const HAPPY: FaceState = { eyes: "open", mouth: "grin", brows: "raised" };
const CURIOUS: FaceState = { eyes: "open", mouth: "smile", brows: "raised", look: -0.2 };
const STERN: FaceState = { eyes: "squint", mouth: "flat", brows: "angry" };

// ------------------------------------------------------------------ the mapmaker at the drafting table, the pen in his hand
export const MAKER_P: V3 = [-0.15, 0, -0.82];
const LEAN = 10;
const H = MAKER.height;
const penAt = (tip: V3, lift = 0) => {
  const t: V3 = [tip[0], tip[1] + lift, tip[2]];
  const grip: V3 = [t[0] - 0.01, t[1] + 0.094, t[2] - 0.05];
  const a = solveArm({ position: MAKER_P, yaw: 0, side: "R", target: grip, height: H, build: MAKER.build, base: { lean: LEAN } });
  const pose: BodyPose = { lean: LEAN, armR: a.arm, armRFwd: a.fwd };
  const hand = handWorld({ position: MAKER_P, yaw: 0, height: H, build: MAKER.build, pose, side: "R" });
  const d = [hand[0] - t[0], hand[1] - t[1], hand[2] - t[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  // the pen runs from the tip through the hand and 6 cm beyond it
  const top: V3 = [hand[0] + (d[0] / L) * 0.06, hand[1] + (d[1] / L) * 0.06, hand[2] + (d[2] / L) * 0.06];
  return { pose, pen: { tip: t, top }, err: a.err };
};
/** the left hand rests on the table edge */
const restL = (p: V3, yaw = 0, at: V3 = [p[0] - 0.3, TABLE_Y + 0.04, -0.46]) => {
  const a = solveArm({ position: p, yaw, side: "L", target: at, height: H, build: MAKER.build, base: { lean: LEAN } });
  return { armL: a.arm, armLFwd: a.fwd } as BodyPose;
};
const MAKER_LEFT = restL(MAKER_P);
const MAG = (() => {
  const a = solveArm({ position: MAKER_P, yaw: -0.15, side: "L", target: [-0.36, 1.1, -0.18], height: H, build: MAKER.build, base: { lean: LEAN } });
  const pose: BodyPose = { armL: a.arm, armLFwd: a.fwd };
  return { pose, hand: handWorld({ position: MAKER_P, yaw: -0.15, height: H, build: MAKER.build, pose: { ...pose, lean: LEAN }, side: "L" }) };
})();
const REST_R = (() => {
  const a = solveArm({ position: MAKER_P, yaw: -0.15, side: "R", target: [0.16, TABLE_Y + 0.04, -0.44], height: H, build: MAKER.build, base: { lean: LEAN } });
  return { armR: a.arm, armRFwd: a.fwd } as BodyPose;
})();
const letterTip = (n: number): V3 => [DOT[0] + 0.012 + 0.025 * n, DOT[1], DOT[2] + 0.004 * Math.sin(n * 9)];
const makerWithPen = (t: number, face: FaceState, tip: V3, lift: number) => {
  const r = penAt(tip, lift);
  return { actor: { spec: MAKER, p: MAKER_P, yaw: 0, ik: true, face, pose: { ...r.pose, ...MAKER_LEFT, headNod: 14, headTilt: -4 } } as Actor, pen: r.pen };
};

// ------------------------------------------------------------------ times
const T = {
  draws: W("draws"), dot: W("dot"), road: W("road"), he: W("He"), labels: W("labels"), agloe1: W("Agloe", 1),
  there: W("There"), no: W("no"), name: W("name"), initials: W("initials"), mixed: W("mixed"), partners: W("partner's"),
  its: W("It's"), trap: W("trap"), if: W("If"), someone1: W("someone", 1), copied: W("copied"), years: W("Years"), does: W("does"),
  on2: W("On", 3), mcnally1: W("McNally", 1), hes: W("He's"), sue: W("sue"), but: W("But"), answer: W("answer"),
  agloe3: W("Agloe", 4), real1: W("real", 1), someone2: W("someone", 2), dot2: W("dot", 2), drove: W("drove"), crossroads1: W("crossroads", 1),
  and1: W("and", 1), shop: W("shop"), the_gs: W("Agloe", 5), store1: W("Store"), fake1: W("fake", 1), made1: W("made", 1),
  and2: W("and", 2), real3: W("real", 3), town2: W("town", 2), real4: W("real", 4), today: W("Today"), gone: W("gone"), crossroads2: W("crossroads", 2), empty2: W("empty", 2),
};
const LEAD = 0.2;
const at = (w: number) => w - LEAD;

// ------------------------------------------------------------------ the setups
const OFFICE_DAY = "office";
export const SETUPS: Setup[] = [
  // 1. A mapmaker in the 1930s: push in over the drafting table; the calendar says 1930
  {
    id: 1, t0: 0, mood: OFFICE_DAY, set: "office", focus: [-0.1, 1.4, -0.7], blur: 1.2,
    keys: [{ at: 0, cam: C([1.0, 1.7, 2.9], [-0.15, 1.28, -0.7], 44) }, { at: at(W("1930s")), cam: C([0.15, 1.78, 2.2], [-0.25, 1.5, -1.4], 42), dur: 0.8 }],
    actors: (t) => [makerWithPen(t, FOCUS, DOT, 0.05 + 0.01 * Math.sin(q(t) * 3)).actor],
    extra: (t) => ({ pen: makerWithPen(t, FOCUS, DOT, 0.05 + 0.01 * Math.sin(q(t) * 3)).pen }),
    office: () => ({ map: "maker" }),
  },
  // 2. draws a dot on a quiet road ... New York State: macro on the map, then a crane up reveals the state name
  {
    id: 2, t0: T.draws, mood: OFFICE_DAY, set: "office", focus: DOT, blur: 2.2,
    keys: [
      { at: T.draws, cam: C([0.24, 1.38, 0.34], [DOT[0], DOT[1], DOT[2] - 0.02], 38) },
      { at: at(T.road), cam: C([0.2, 1.95, 0.62], [0.05, 0.9, -0.16], 46), dur: 0.9 },
    ],
    actors: (t) => {
      const lift = t < T.dot ? 0.05 * (1 - smooth((t - T.draws) / (T.dot - T.draws))) : t < T.dot + 0.35 ? 0 : 0.03 * smooth((t - T.dot - 0.35) / 0.3);
      return [makerWithPen(t, FOCUS, DOT, lift).actor];
    },
    extra: (t) => {
      const lift = t < T.dot ? 0.05 * (1 - smooth((t - T.draws) / (T.dot - T.draws))) : t < T.dot + 0.35 ? 0 : 0.03 * smooth((t - T.dot - 0.35) / 0.3);
      return { pen: makerWithPen(t, FOCUS, DOT, lift).pen };
    },
    office: (t) => ({ map: "maker", dot: clamp((t - T.dot) / 0.22) }),
  },
  // 3. He labels it Agloe: the pen writes the name; his face beyond
  {
    id: 3, t0: T.he, mood: OFFICE_DAY, set: "office", focus: [0.12, 1.0, -0.2], blur: 2.0,
    keys: [
      { at: T.he, cam: C([1.0, 1.8, 1.35], [-0.02, 1.3, -0.5], 46) },
      { at: at(T.agloe1), cam: C([0.82, 1.72, 1.08], [-0.02, 1.28, -0.5], 44), dur: 0.7 },
    ],
    actors: (t) => {
      const n = clamp((q(t) - T.labels - 0.1) / 0.16, 0, 5);
      return [makerWithPen(t, { ...FOCUS, mouth: n >= 5 ? "grin" : "smirk" }, letterTip(n), n >= 5 ? 0.03 : 0).actor];
    },
    extra: (t) => {
      const n = clamp((q(t) - T.labels - 0.1) / 0.16, 0, 5);
      return { pen: makerWithPen(t, FOCUS, letterTip(n), n >= 5 ? 0.03 : 0).pen };
    },
    office: (t) => ({ map: "maker", dot: 1, letters: clamp((t - T.labels - 0.1) / 0.16, 0, 5) }),
  },
  // 4. There is no Agloe: the real crossroads, empty
  {
    id: 4, t0: T.there, mood: "day", set: "field", focus: [FX, 0.5, 0], blur: 0.5, whip: true, sky: true,
    keys: [{ at: T.there, cam: C([FX - 15, 6.5, 15], [FX, 0.4, -1], 48) }, { at: at(T.no), cam: C([FX - 9.5, 3.4, 9.5], [FX + 1, 0.8, -1.5], 48), dur: 0.9 }],
    actors: () => [],
    field: () => ({ store: 0 }),
  },
  // 5. The name is his initials mixed with his partner's: two men, letter tiles slide into AGLOE
  {
    id: 5, t0: T.name - 0.06, mood: OFFICE_DAY, set: "office", focus: [0.05, 1.0, 0.1], blur: 1.4, whip: true,
    keys: [
      { at: T.name - 0.06, cam: C([0.05, 1.8, 2.05], [0.05, 0.98, -0.15], 48) },
      { at: at(T.initials), cam: C([0.05, 1.66, 1.6], [0.05, 0.96, -0.05], 48) },
      { at: at(T.partners), cam: C([0.3, 1.45, 1.05], [0.02, 0.92, 0.2], 44), dur: 0.7 },
    ],
    actors: (t) => [
      { spec: MAKER, p: [-0.45, 0, -0.8], yaw: 0.25, face: t < T.mixed ? CURIOUS : SLY, pose: { armL: [14, 0], armR: [38, 30], armRFwd: 50, headTilt: 5 } },
      { spec: PARTNER, p: [0.55, 0, -0.78], yaw: -0.3, face: t < T.mixed ? CURIOUS : HAPPY, pose: { armL: [40, 40], armLFwd: 60, armR: [14, 0], headTilt: -4 } },
    ],
    office: (t) => ({ map: "maker", dot: 1, letters: 5, tiles: clamp((t - T.mixed) / 1.0) }),
  },
  // 6. It's a trap: punch onto the dot, a red ring
  {
    id: 6, t0: T.its, mood: OFFICE_DAY, set: "office", focus: DOT, blur: 2.4,
    keys: [{ at: T.its, cam: C([0.34, 1.32, 0.36], [DOT[0] + 0.03, DOT[1], DOT[2]], 40) }, { at: T.trap - 0.03, cam: C([0.24, 1.16, 0.14], [DOT[0] + 0.03, DOT[1], DOT[2]], 40), dur: 0.22 }],
    actors: () => [],
    office: (t) => ({ map: "maker", dot: 1, letters: 5, ring: clamp((t - T.trap) / 0.3) }),
    shake: [T.trap],
  },
  // 7. If Agloe ever shows up on someone else's map, they copied his: a magnifier over another map
  {
    id: 7, t0: T.if, mood: OFFICE_DAY, set: "office", focus: [-0.3, 1.0, -0.1], blur: 1.4, whip: true,
    keys: [
      { at: T.if, cam: C([0.75, 1.78, 1.45], [-0.28, 1.02, -0.2], 44) },
      { at: at(T.someone1), cam: C([0.35, 1.7, 1.25], [-0.32, 1.0, -0.15], 44) },
      { at: at(T.copied), cam: C([0.45, 1.6, 0.95], [-0.25, 1.28, -0.55], 42), dur: 0.7 },
    ],
    actors: (t) => [{ spec: MAKER, p: MAKER_P, yaw: -0.15, ik: true, face: t < T.copied ? { ...CURIOUS, eyes: "squint", look: 0.3 } : STERN, pose: { ...MAG.pose, ...REST_R, lean: LEAN, headNod: 16 } }],
    extra: () => ({ magnifier: MAG.hand }),
    office: () => ({ map: "both", dot: 1, letters: 5 }),
  },
  // 8. Years later, it does: their map has Agloe on it; he is shocked
  {
    id: 8, t0: T.years, mood: OFFICE_DAY, set: "office", focus: [-0.15, 1.45, -0.7], blur: 1.8,
    keys: [{ at: T.years, cam: C([0.65, 1.52, 1.3], [-0.15, 1.3, -0.7], 42) }, { at: T.does - 0.04, cam: C([0.45, 1.5, 0.75], [-0.15, 1.38, -0.75], 42), dur: 0.25 }],
    actors: (t) => [
      {
        spec: MAKER, p: [-0.15, 0, -0.86], yaw: 0, face: t < T.does ? CURIOUS : SHOCK,
        pose: t < T.does ? { armL: [20, 10], armR: [20, 10], lean: 6, headNod: 10 } : { armL: [130, 70], armLFwd: 40, armR: [130, 70], armRFwd: 40, lean: -4, headTilt: 6 },
      },
    ],
    office: () => ({ map: "rival" }),
    shake: [T.does],
  },
  // 9. On a map by Rand McNally: macro on their copy
  {
    id: 9, t0: T.on2, mood: OFFICE_DAY, set: "office", focus: DOT, blur: 2.2,
    keys: [{ at: T.on2, cam: C([0.4, 1.4, 0.42], [DOT[0] + 0.04, DOT[1], DOT[2]], 40) }, { at: at(T.mcnally1), cam: C([0.28, 1.26, 0.22], [DOT[0] + 0.05, DOT[1], DOT[2]], 40), dur: 0.7 }],
    actors: () => [],
    office: (t) => ({ map: "rival", ring: clamp((t - T.mcnally1) / 0.35) }),
  },
  // 10. He's ready to sue: the fist comes down on the table, the lawsuit papers jump
  {
    id: 10, t0: T.hes, mood: OFFICE_DAY, set: "office", focus: [-0.15, 1.35, -0.6], blur: 1.4,
    keys: [{ at: T.hes, cam: C([0.95, 1.2, 1.55], [-0.1, 1.2, -0.6], 46) }, { at: T.sue - 0.05, cam: C([0.8, 1.2, 1.25], [-0.1, 1.18, -0.6], 46), dur: 0.25 }],
    actors: (t) => {
      const slam = solveArm({ position: MAKER_P, yaw: 0, side: "R", target: [0.16, TABLE_Y + 0.06, -0.3], height: H, build: MAKER.build, base: { lean: LEAN } });
      const u = smooth((t - T.sue + 0.12) / 0.12);
      const raised: [number, number] = [150, 100];
      const arm: [number, number] = [lerp(raised[0], slam.arm[0], u), lerp(raised[1], slam.arm[1], u)];
      return [{ spec: MAKER, p: MAKER_P, yaw: 0, ik: true, face: ANGRY, pose: { armR: arm, armRFwd: lerp(30, slam.fwd, u), ...MAKER_LEFT, lean: LEAN } }];
    },
    office: (t) => ({ map: "rival", ring: 1, lawsuit: clamp((t - T.hes - 0.1) / 0.3), jump: Math.max(0, Math.sin(clamp((t - T.sue) / 0.3) * PI)) }),
    shake: [T.sue],
  },
  // 11. But Rand McNally has an answer: their man, calm, holds up a photo
  {
    id: 11, t0: T.but, mood: "cold", set: "rival", focus: [RIVAL_X, 1.5, -0.7], blur: 1.4, whip: true,
    keys: [{ at: T.but, cam: C([RIVAL_X + 1.1, 1.55, 2.2], [RIVAL_X, 1.25, -0.7], 44) }, { at: at(T.answer), cam: C([RIVAL_X + 0.6, 1.55, 1.45], [RIVAL_X, 1.35, -0.7], 42), dur: 0.7 }],
    actors: (t) => [
      {
        spec: REP, p: [RIVAL_X, 0, -0.72], yaw: 0.1, face: SLY, hold: t > T.answer - 0.1 ? "card" : null, holdSide: "R",
        pose: t > T.answer - 0.1 ? { armR: [lerp(30, 120, smooth((t - T.answer + 0.1) / 0.3)), 70], armRFwd: 55, armL: [16, 0], headTilt: 6 } : { armL: [12, 0], armR: [12, 0], headTilt: 6 },
      },
    ],
  },
  // 12. Agloe is real: the store, across the road
  {
    id: 12, t0: T.agloe3, mood: "day", set: "field", focus: [STORE_P[0], 2.5, STORE_P[2]], blur: 0.8, whip: true, sky: true,
    keys: [{ at: T.agloe3, cam: C([FX - 1.8, 1.2, 5.4], [STORE_P[0] + 0.2, 2.9, STORE_P[2]], 50) }, { at: at(T.real1), cam: C([FX - 0.4, 1.0, 4.2], [STORE_P[0], 3.2, STORE_P[2]], 50), dur: 0.7 }],
    actors: () => [],
    field: () => ({ store: 1 }),
  },
  // 13. Someone saw the dot on a map: a man by his car, reading a road map
  {
    id: 13, t0: T.someone2, mood: "day", set: "field", focus: [FX - 30.5, 1.5, 1.7], blur: 1.4, whip: true, sky: true,
    keys: [{ at: T.someone2, cam: C([FX - 28.4, 1.65, 4.8], [FX - 30.6, 1.3, 1.6], 44) }, { at: at(T.dot2), cam: C([FX - 29.1, 1.62, 3.85], [FX - 30.5, 1.42, 1.7], 42), dur: 0.7 }],
    actors: () => {
      const p: V3 = [FX - 30.5, 0, 1.7];
      const h = holdInFront({ position: p, yaw: 0.55, height: BUILDER.height, side: "R", forward: 0.24, up: 0.5, out: 0.05, build: BUILDER.build });
      const hl = holdInFront({ position: p, yaw: 0.55, height: BUILDER.height, side: "L", forward: 0.24, up: 0.5, out: 0.05, build: BUILDER.build });
      return [{ spec: BUILDER, p, yaw: 0.55, ik: true, face: CURIOUS, pose: { ...h.pose, ...hl.pose, headNod: 16 } }];
    },
    extra: () => {
      const p: V3 = [FX - 30.5, 0, 1.7];
      const h = holdInFront({ position: p, yaw: 0.55, height: BUILDER.height, side: "R", forward: 0.24, up: 0.5, out: 0.05, build: BUILDER.build });
      const hl = holdInFront({ position: p, yaw: 0.55, height: BUILDER.height, side: "L", forward: 0.24, up: 0.5, out: 0.05, build: BUILDER.build });
      return { mapInHand: { p: [(h.hand[0] + hl.hand[0]) / 2, (h.hand[1] + hl.hand[1]) / 2 + 0.02, (h.hand[2] + hl.hand[2]) / 2], yaw: 0.55 } };
    },
    field: () => ({ store: 0, car: { p: [FX - 32.2, 0, 0.3], d: 0 } }),
  },
  // 14. drove to that empty crossroads: the car comes down the road toward us and stops
  {
    id: 14, t0: T.drove, mood: "day", set: "field", focus: [FX - 6, 1, 0.5], blur: 0.8, whip: true, sky: true,
    keys: [{ at: T.drove, cam: C([FX + 1.6, 1.25, 3.0], [FX - 8, 1.0, 0.2], 46) }, { at: at(T.crossroads1), cam: C([FX + 0.8, 1.4, 3.6], [FX - 4.5, 1.0, 0.3], 46), dur: 0.8 }],
    actors: () => [],
    field: (t) => {
      const u = clamp((t - T.drove) / (T.and1 - T.drove - 0.1));
      const x = lerp(FX - 30, FX - 5.2, 1 - Math.pow(1 - u, 2.2));
      return { store: 0, car: { p: [x, 0, 0.85], d: x } };
    },
  },
  // 15. and built a shop there: hammering, the store goes up in a time-lapse
  {
    id: 15, t0: T.and1, mood: "day", set: "field", focus: [STORE_P[0], 1.6, STORE_P[2]], blur: 0.8, sky: true,
    keys: [{ at: T.and1, cam: C([FX - 1.2, 2.0, 5.6], [STORE_P[0] - 1.6, 1.4, STORE_P[2] + 0.6], 50) }, { at: at(T.shop), cam: C([FX + 0.6, 2.3, 6.4], [STORE_P[0] - 1.2, 1.6, STORE_P[2] + 0.4], 50), dur: 0.8 }],
    actors: (t) => {
      const p: V3 = [STORE_P[0] - 3.4, 0, STORE_P[2] + 2.9];
      const sw = 0.5 + 0.5 * Math.sin(q(t) * PI * 4);
      return [{ spec: BUILDER, p, yaw: 2.3, ik: true, face: HAPPY, pose: { armR: [80 + 50 * sw, 60], armRFwd: 70, armL: [30, 20], lean: 6 } }];
    },
    extra: (t) => {
      const p: V3 = [STORE_P[0] - 3.4, 0, STORE_P[2] + 2.9];
      const sw = 0.5 + 0.5 * Math.sin(q(t) * PI * 4);
      const hand = handWorld({ position: p, yaw: 2.3, height: BUILDER.height, build: BUILDER.build, side: "R", pose: { armR: [80 + 50 * sw, 60], armRFwd: 70, lean: 6 } });
      return { hammer: { hand, swing: sw } };
    },
    field: (t) => ({ store: clamp((t - T.and1 - 0.05) / (T.the_gs - T.and1 + 0.1)) * 0.88, lumber: true, car: { p: [FX - 5.2, 0, 0.85], d: 0 } }),
  },
  // 16. The Agloe General Store: low hero shot on the sign, the builder proud on his porch
  {
    id: 16, t0: T.the_gs - 0.15, mood: "golden", set: "field", focus: [STORE_P[0] + 0.9, 1.8, -2.6], blur: 1.2, sky: true,
    keys: [{ at: T.the_gs - 0.15, cam: C([STORE_P[0] - 1.2, 0.8, 3.6], [STORE_P[0], 2.4, STORE_P[2] + 2], 54) }, { at: at(T.store1), cam: C([STORE_P[0] - 0.9, 1.1, 2.8], [STORE_P[0], 3.1, STORE_P[2] + 2], 54), dur: 0.7 }],
    actors: () => [{ spec: BUILDER, p: [STORE_P[0] + 1.1, 0.31, -2.55], yaw: -0.25, face: PROUD, pose: { armL: [45, 95], armLFwd: -25, armR: [45, 95], armRFwd: -25, headTilt: -6 } }],
    field: (t) => ({ store: lerp(0.88, 1, clamp((t - T.the_gs + 0.1) / 0.25)), car: { p: [FX - 5.2, 0, 0.85], d: 0 } }),
  },
  // 17. The fake town on the map ...: push into the inked dot
  {
    id: 17, t0: T.fake1 - 0.06, mood: OFFICE_DAY, set: "office", focus: DOT, blur: 2.6, whip: true,
    keys: [{ at: T.fake1 - 0.06, cam: C([0.3, 1.42, 0.42], [DOT[0] + 0.03, DOT[1], DOT[2]], 40) }, { at: T.fake1 + 0.2, cam: C([DOT[0] + 0.02, 1.06, DOT[2] + 0.1], [DOT[0], DOT[1], DOT[2]], 34), dur: T.made1 - T.fake1 - 0.2 }],
    actors: () => [],
    office: () => ({ map: "maker", dot: 1, letters: 5 }),
  },
  // 18. ... made the real store: straight down onto the crossroads from the sky, the store where the dot was
  {
    id: 18, t0: T.made1, mood: "day", set: "field", focus: [FX + 2, 0, -3], blur: 0.3, sky: false,
    keys: [{ at: T.made1, cam: C([FX + 2.2, 30, 5.5], [FX + 2, 0, -2.5], 46) }, { at: T.made1 + 0.05, cam: C([FX + 3.2, 15, 9], [FX + 2.5, 0, -2.8], 50), dur: T.and2 - T.made1 - 0.1 }],
    actors: () => [],
    field: () => ({ store: 1, car: { p: [FX - 5.2, 0, 0.85], d: 0 } }),
  },
  // 19. and the real store made the fake town real: a town sign goes up at the corner
  {
    id: 19, t0: T.and2, mood: "golden", set: "field", focus: [SIGN_P[0], 1.8, SIGN_P[2]], blur: 1.0, sky: true,
    keys: [
      { at: T.and2, cam: C([FX - 6.6, 2.2, 5.6], [FX - 0.2, 1.6, -3.2], 48) },
      { at: at(T.real3), cam: C([FX - 5.6, 1.6, 5.4], [FX - 0.6, 1.7, -3.2], 48) },
      { at: at(T.real4), cam: C([FX - 4.6, 1.75, 3.0], [SIGN_P[0] + 0.4, 1.85, SIGN_P[2]], 44), dur: 0.7 },
    ],
    actors: () => [{ spec: BUILDER, p: [SIGN_P[0] + 1.2, 0, SIGN_P[2] + 0.9], yaw: -0.6, face: HAPPY, pose: { armL: [16, 0], armR: [100, 30], armRFwd: 20, headTilt: -5 } }],
    field: (t) => ({ store: 1, sign: clamp((t - T.town2 + 0.05) / 0.3) }),
  },
  // 20. Today the store is gone: the same corner at dusk, only the footing left
  {
    id: 20, t0: T.today, mood: "dusk", set: "field", focus: [STORE_P[0], 0.5, STORE_P[2]], blur: 0.8, whip: true, sky: true,
    keys: [{ at: T.today, cam: C([FX - 6.4, 1.6, 6.0], [FX + 1.5, 0.9, -3.6], 48) }, { at: at(T.gone), cam: C([FX - 3.4, 1.5, 4.2], [STORE_P[0], 0.5, STORE_P[2]], 46), dur: 0.8 }],
    actors: () => [],
    field: () => ({ store: 0, gone: true }),
  },
  // 21. The crossroads is empty again: a slow crane up and away
  {
    id: 21, t0: T.crossroads2 - 0.12, mood: "dusk", set: "field", focus: [FX, 0, 0], blur: 0.4, sky: true,
    keys: [{ at: T.crossroads2 - 0.12, cam: C([FX - 5, 2.6, 7], [FX + 1, 0.8, -1.5], 50) }, { at: T.crossroads2 + 0.3, cam: C([FX - 14, 9, 16], [FX + 1, 0.4, -2], 50), dur: SECONDS - T.crossroads2 - 0.5 }],
    actors: () => [],
    field: () => ({ store: 0, gone: true }),
  },
];

// ------------------------------------------------------------------ the camera
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const mixV = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
export const setupAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < SETUPS.length; k++) if (SETUPS[k].t0 <= t) i = k;
  return { s: SETUPS[i], i, end: i + 1 < SETUPS.length ? SETUPS[i + 1].t0 : SECONDS };
};
/** keys eased one after the other, a slow drift-push (3 %/s) and arc between them, whip pans at set changes */
export const camAt = (t: number): Cam & { roll: number; shake: number } => {
  const { s, i, end } = setupAt(t);
  let c = s.keys[0].cam;
  for (let k = 1; k < s.keys.length; k++) {
    const key = s.keys[k];
    const u = clamp((t - key.at) / (key.dur ?? 0.6));
    if (u <= 0) break;
    const e = ease(u);
    c = { pos: mixV(c.pos, key.cam.pos, e), look: mixV(c.look, key.cam.look, e), fov: lerp(c.fov, key.cam.fov, e), roll: 0 };
  }
  const dt = t - s.t0;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const k = Math.min(0.12, 0.03 * dt);
  let pos: V3 = [c.pos[0] + d[0] * k, c.pos[1] + d[1] * k, c.pos[2] + d[2] * k];
  const rel: V3 = [pos[0] - c.look[0], pos[1] - c.look[1], pos[2] - c.look[2]];
  pos = [c.look[0] + rotY(rel, (1.5 * PI) / 180 * dt)[0], pos[1], c.look[2] + rotY(rel, (1.5 * PI) / 180 * dt)[2]];
  let look = c.look;
  // whip pans: out of the last 0.1 s of a setup when the next one is a set change, into the first 0.14 s of a whip setup
  const next = SETUPS[i + 1];
  const pan = (deg: number) => {
    const v: V3 = [look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]];
    const r = rotY(v, (deg * PI) / 180);
    look = [pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]];
  };
  if (next?.whip && end - t < 0.1) pan(-28 * Math.pow(1 - (end - t) / 0.1, 2));
  if (s.whip && dt < 0.14) pan(28 * Math.pow(1 - dt / 0.14, 2));
  let shake = 0;
  for (const st of s.shake ?? []) {
    const x = t - st;
    if (x >= 0 && x < 0.4) shake = Math.max(shake, (1 - x / 0.4) * Math.sin(x * 70));
  }
  return { pos, look, fov: c.fov, roll: 0, shake };
};
