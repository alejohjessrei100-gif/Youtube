// The Chess Crow short as DATA. Scenes cut only where time or place changes; each is one continuous keyed camera.
//   1 day      the board, the empty stool: a game nobody has seen the other side of
//   2 golden   Okafor makes his one move (seated)            3 golden  he walks home (wide)
//   4 golden   next morning: a black bishop has moved (a ghost where it stood), Okafor impressed
//   5 day      the groundskeeper: "not them"                  6 day     the kids: "not them"
//   7 day      he's losing (seated, head in hand)            8 night   hiding behind the tree with a flashlight
//   9 golden   sunrise: the crow lands, stares, pushes the knight, the white king topples
//  10 golden   he sits down across from it; 11 an insert: his hand sets the king on a fresh board; 12 "best of fifty",
//              the score card
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { headOf } from "../inkbeat/char/Character3D";
import { lerp, lookAt, mixArm, walkAt, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import { handWorld } from "../inkbeat/core/ik";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import type { GullState } from "../gull/world";
import { KID1, KID2, OKAFOR, STAFF } from "./cast";
import { BOARD_Y, CROW_SPOT, KIDS_SPOT, SEAT_W, sitGeom, sqAt, STAFF_SPOT, TABLE_H, TREE } from "./world";
import type { Piece, PieceKind } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9':-]/g, "").replace(/[.,]$/, "");
export const W = (word: string, nth = 1) => {
  let k = 0;
  for (const [w, a] of WORDS) if (norm(w) === norm(word) && ++k === nth) return a;
  throw new Error(`word not found: ${word} #${nth}`);
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });

export const T = {
  year: W("year,"), nobody: W("nobody's"), player: W("player."), every: W("every"), makes: W("makes"), walks: W("walks"),
  the2: W("the", 2), black: W("black"), one2: W("one", 2), always: W("always"), he1: W("he"), staff: W("staff."), not1: W("not"), he2: W("he", 2),
  not2: W("not", 2), and2: W("and", 3), losing: W("losing."), so: W("so"), flashlight: W("flashlight."), at: W("at"),
  crow: W("crow"), lands: W("lands"), board: W("board."), stares: W("stares"), then: W("then"), pushes: W("pushes"),
  knight: W("knight"), beak: W("beak."), checkmate: W("checkmate."), mr2: W("mr.", 2), sits: W("sits"), resets: W("resets"),
  and3: W("and", 4), best: W("best"), fifty: W("fifty."), the5: W("the", 7), eleven: W("eleven"), four: W("four."),
};

// ------------------------------------------------------------------ helpers
const SIT = sitGeom(OKAFOR.height, OKAFOR.build);
/** how far the seated body is lowered (Character3D drops the body by the thigh length) */
// Character3D: drop = (hipY - ANKLE_Y) * 0.5 * height = feetFwd / 0.9
const sitDrop = SIT.feetFwd / 0.9;
const DROP = (sit: number) => sitDrop * sit;
const ik = (spec: CharacterSpec, p: V3, yaw: number, side: "L" | "R", target: V3, lean = 0, sit = 0) => {
  const r = (v: number) => Math.round(v * 100) / 100;
  // a seated body is lowered: solve in the unlowered frame
  const dy = sit > 0 ? DROP(sit) : 0;
  return ikHuman(spec, r(yaw), side, [r(target[0] - p[0]), r(target[1] - p[1] + dy), r(target[2] - p[2])], Math.round(lean));
};
/** an arm solve limited to human joint ranges (shoulder 0..160, elbow bend 0..150, arm plane -20..150 forward):
 *  a coarse grid, then a shrinking local search. Cached by target. */
const ikCache = new Map<string, { arm: [number, number]; fwd: number; err: number }>();
const ikHuman = (spec: CharacterSpec, yaw: number, side: "L" | "R", target: V3, lean: number) => {
  const key = [spec.height, side, yaw, ...target, lean].join("|");
  const hit = ikCache.get(key);
  if (hit) return hit;
  const err = (a: number, b: number, w: number) => {
    const pose: BodyPose = side === "L" ? { lean, armL: [a, b], armLFwd: w } : { lean, armR: [a, b], armRFwd: w };
    const h = handWorld({ position: [0, 0, 0], yaw, height: spec.height, build: spec.build, pose, side });
    return Math.hypot(h[0] - target[0], h[1] - target[1], h[2] - target[2]);
  };
  let best = { a: 20, b: 20, w: 40, e: Infinity };
  for (let a = 0; a <= 160; a += 10) for (let b = 0; b <= 150; b += 10) for (let w = -20; w <= 150; w += 10) {
    const e = err(a, b, w);
    if (e < best.e) best = { a, b, w, e };
  }
  for (let st = 5; st >= 0.3; st /= 2) {
    let moved = true;
    while (moved) {
      moved = false;
      for (const [da, db, dw] of [[st, 0, 0], [-st, 0, 0], [0, st, 0], [0, -st, 0], [0, 0, st], [0, 0, -st]]) {
        const a = Math.min(160, Math.max(0, best.a + da));
        const b = Math.min(150, Math.max(0, best.b + db));
        const w = Math.min(150, Math.max(-20, best.w + dw));
        const e = err(a, b, w);
        if (e < best.e - 1e-6) {
          best = { a, b, w, e };
          moved = true;
        }
      }
    }
  }
  const res = { arm: [best.a, best.b] as [number, number], fwd: best.w, err: best.e };
  ikCache.set(key, res);
  return res;
};
export const hand = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, side: "L" | "R") => {
  const h = handWorld({ position: p, yaw, height: spec.height, build: spec.build, pose, side });
  return [h[0], h[1] - (pose.sit ? DROP(pose.sit) : 0), h[2]] as V3;
};
const yawTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const lerpAng = (a: number, b: number, u: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
export const head = (spec: CharacterSpec, p: V3, sit = 0): V3 => {
  const h = headOf(p, spec.height, spec.build);
  return [h[0], h[1] - (sit ? DROP(sit) : 0), h[2]];
};
/** the head where it is drawn: lowered by sitting, then tipped forward by the body lean (about the feet) */
export const headPosed = (a: { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose }): V3 => {
  const h = head(a.spec, a.p, a.pose.sit ?? 0);
  const L = ((a.pose.lean ?? 0) * PI) / 180;
  const up = h[1] - a.p[1];
  return [a.p[0] + Math.sin(a.yaw) * up * Math.sin(L), a.p[1] + up * Math.cos(L), a.p[2] + Math.cos(a.yaw) * up * Math.sin(L)];
};
const look = (spec: CharacterSpec, p: V3, yaw: number, target: V3, sit = 0) => {
  const l = lookAt(head(spec, p, sit), target, yaw, 55, 15);
  return { headYaw: l.yaw, headNod: l.nod };
};
/** lip flap while a line is spoken: alternates open / smaller shapes per syllable-ish beat */
const talk = (t: number, a: number, b: number, base: FaceState["mouth"]): FaceState["mouth"] => {
  if (t < a || t > b) return base;
  return Math.floor((t - a) * 9) % 2 === 0 ? "open" : "o";
};
const C = (pos: V3, lk: V3, fov: number, roll = 0): Cam => ({ pos, look: lk, fov, roll });
type Ez = "inout" | "out" | "in" | "linear";
const keyed = (keys: [number, Cam, Ez?][]) => (t: number): Cam => {
  let c = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, ck, e] = keys[i];
    const [tp] = keys[i - 1];
    if (t <= tp) break;
    const u = clamp((t - tp) / (tk - tp));
    const x = e === "linear" ? u : e === "out" ? 1 - Math.pow(1 - u, 3) : e === "in" ? u * u * u : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    c = { pos: mix3(c.pos, ck.pos, x), look: mix3(c.look, ck.look, x), fov: lerp(c.fov, ck.fov, x), roll: lerp(c.roll ?? 0, ck.roll ?? 0, x) };
  }
  return c;
};

// ------------------------------------------------------------------ board layouts: [kind, white, rank, file, id]
type L = [PieceKind, boolean, number, number, string][];
const MID: L = [
  ["k", true, 0, 4, "wk"], ["q", true, 0, 3, "wq"], ["r", true, 0, 0, "wr1"], ["r", true, 0, 7, "wr2"], ["b", true, 0, 2, "wb"], ["n", true, 2, 5, "wn"],
  ["p", true, 1, 0, "wp0"], ["p", true, 1, 1, "wp1"], ["p", true, 1, 4, "wp4"], ["p", true, 1, 5, "wp5"], ["p", true, 1, 6, "wp6"], ["p", true, 1, 7, "wp7"], ["p", true, 2, 2, "wp2"],
  ["k", false, 7, 4, "bk"], ["q", false, 7, 3, "bq"], ["r", false, 7, 0, "br1"], ["r", false, 7, 7, "br2"], ["b", false, 7, 5, "bb"], ["n", false, 5, 5, "bn"],
  ["p", false, 6, 0, "bp0"], ["p", false, 6, 1, "bp1"], ["p", false, 5, 3, "bp3"], ["p", false, 6, 5, "bp5"], ["p", false, 6, 6, "bp6"], ["p", false, 6, 7, "bp7"],
];
const LOSE: L = [
  ["k", true, 1, 2, "wk"], ["r", true, 0, 7, "wr2"], ["p", true, 1, 0, "wp0"], ["p", true, 2, 5, "wp5"], ["p", true, 1, 6, "wp6"],
  ["k", false, 7, 1, "bk"], ["q", false, 2, 0, "bq"], ["r", false, 4, 0, "br1"], ["r", false, 6, 7, "br2"], ["b", false, 3, 5, "bb"], ["n", false, 5, 4, "bn"],
  ["p", false, 6, 0, "bp0"], ["p", false, 5, 2, "bp2"], ["p", false, 6, 5, "bp5"], ["p", false, 6, 6, "bp6"],
];
const BACK: PieceKind[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
const START: L = [
  ...BACK.map((k, f) => [k, true, 0, f, `w${k}${f}`] as [PieceKind, boolean, number, number, string]),
  ...BACK.map((_, f) => ["p", true, 1, f, `wp${f}`] as [PieceKind, boolean, number, number, string]),
  ...BACK.map((k, f) => [k, false, 7, f, `b${k}${f}`] as [PieceKind, boolean, number, number, string]),
  ...BACK.map((_, f) => ["p", false, 6, f, `bp${f}`] as [PieceKind, boolean, number, number, string]),
];
const place = (l: L, moved: Record<string, V3> = {}): Piece[] => l.map(([kind, white, r, f, id]) => ({ id, kind, white, p: moved[id] ?? sqAt(r, f) }));

// ------------------------------------------------------------------ Okafor seated (white's stool)
const SEAT_YAW = PI / 2;
const seatedBase = (t: number): BodyPose => ({ sit: 1, lean: 4 + 1.5 * Math.sin(t * 0.8), armL: [14, 14], armLFwd: 55, armR: [14, 14], armRFwd: 55 });

// ------------------------------------------------------------------ the crow: flight in, stare, the push
const CROW_S = 0.62;
/** the beak tip in world space for a crow state (mirrors the gull rig: head lunges + nods by peck, the body pitches) */
export const beakTip = (g: GullState): V3 => {
  const pk = g.peck;
  const hy = 0.46 - 0.12 * pk;
  const hz = 0.16 + 0.12 * pk;
  const a = 0.9 * pk;
  const ty = hy + 0.001 * Math.cos(a) - 0.225 * Math.sin(a);
  const tz = hz + 0.001 * Math.sin(a) + 0.225 * Math.cos(a);
  const pt = g.pitch ?? 0;
  const y2 = ty * Math.cos(pt) - tz * Math.sin(pt);
  const z2 = ty * Math.sin(pt) + tz * Math.cos(pt);
  const s = g.s ?? 1;
  return [g.p[0] + Math.sin(g.yaw) * z2 * s, g.p[1] + g.bob + y2 * s, g.p[2] + Math.cos(g.yaw) * z2 * s];
};
const K0 = sqAt(5, 4);
const K1 = sqAt(3, 3);
const KD = (() => {
  const dx = K1[0] - K0[0];
  const dz = K1[2] - K0[2];
  const L = Math.hypot(dx, dz);
  return { x: dx / L, z: dz / L, L };
})();
const PUSH_YAW = Math.atan2(KD.x, KD.z);
const PUSH_PK = 0.85;
const PUSH_PITCH = 0.32;
const KNIGHT_R = 0.016;
/** the crow's standing spot before the push: its beak (at push height) 4 cm short of the knight's back */
const CROW_PUSH0: V3 = (() => {
  const probe = beakTip({ p: [0, 0, 0], yaw: PUSH_YAW, tilt: 0, bob: 0, flap: 0, fold: 1, peck: PUSH_PK, step: 0, face: { eyes: "normal", brow: 0, beak: 0 }, s: CROW_S, pitch: PUSH_PITCH });
  const reach = Math.hypot(probe[0], probe[2]);
  return [K0[0] - KD.x * (reach + KNIGHT_R + 0.04), TABLE_H, K0[2] - KD.z * (reach + KNIGHT_R + 0.04)];
})();
const LAND_T0 = T.crow - 0.25;
const LAND_T1 = T.lands + 0.4;
const FLY_FROM: V3 = [3.4, 3.6, -2.6];
export const crowAt = (t: number): GullState | null => {
  if (t < LAND_T0) return null;
  const face = { eyes: "normal" as const, brow: 0, beak: 0 };
  let g: GullState = { p: CROW_SPOT, yaw: -PI / 2, tilt: 0, bob: 0, flap: 0, fold: 1, peck: 0, step: 0, face, s: CROW_S };
  if (t < LAND_T1) {
    // a gliding arc that flares and drops onto the table
    const u = clamp((t - LAND_T0) / (LAND_T1 - LAND_T0));
    const e = 1 - Math.pow(1 - u, 2);
    const p = mix3(FLY_FROM, CROW_SPOT, e);
    // height reaches the tabletop a little before the end (feet down, then a short skid while the wings fold)
    const v = clamp(u / 0.9);
    p[1] = lerp(FLY_FROM[1], CROW_SPOT[1], 1 - Math.pow(1 - v, 1.6)) + 0.35 * Math.sin(PI * v) * (1 - v);
    const yaw = Math.atan2(CROW_SPOT[0] - FLY_FROM[0], CROW_SPOT[2] - FLY_FROM[2]);
    const fold = smooth((u - 0.9) / 0.1);
    const flap = (1 - fold) * (0.55 + 0.45 * Math.sin(t * 19));
    g = { ...g, p, yaw: lerpAng(yaw, -PI / 2, smooth((u - 0.7) / 0.3)), flap, fold, face: { ...face, eyes: "big" } };
    return g;
  }
  // settle hop, then the stare: slow head tilts, narrowed eyes
  const settle = window01(t, LAND_T1, LAND_T1 + 0.35, 0.05, 0.25);
  const stare = window01(t, T.stares - 0.2, T.then + 0.3, 0.3, 0.3);
  g = { ...g, bob: -0.02 * settle, tilt: 0.28 * stare * Math.sin((t - T.stares) * 1.6), face: { eyes: stare > 0.3 ? "narrow" : "normal", brow: stare, beak: 0 } };
  // the push: turn to the knight's line and walk to the push spot, lower the beak, then step through
  const turnIn = smooth((t - (T.then - 0.1)) / 0.45);
  const toSpot = smooth((t - (T.then + 0.15)) / 0.5);
  const lower = smooth((t - (T.pushes - 0.15)) / 0.3);
  const shove = smooth((t - (T.pushes + 0.15)) / (T.beak + 0.25 - T.pushes - 0.15));
  const up = smooth((t - (T.beak + 0.45)) / 0.35);
  if (turnIn > 0) {
    const reach = KD.L + 0.04 + 0.004;
    const p0 = mix3(CROW_SPOT, CROW_PUSH0, toSpot);
    const p: V3 = [p0[0] + KD.x * reach * shove, TABLE_H, p0[2] + KD.z * reach * shove];
    const walking = toSpot > 0 && toSpot < 1 ? (t - T.then) * 9 : shove > 0 && shove < 1 ? (t - T.pushes) * 9 : 0;
    g = {
      ...g, p, yaw: lerpAng(-PI / 2, PUSH_YAW, turnIn), step: walking, tilt: g.tilt * (1 - turnIn),
      peck: PUSH_PK * lower * (1 - up), pitch: PUSH_PITCH * lower * (1 - up),
      face: { eyes: up > 0.3 ? "sparkle" : "narrow", brow: 1 - up, beak: 0.15 * up },
    };
    // then it walks back to its spot at the table edge (clear of the board) and faces the board again
    const back = smooth((t - (T.checkmate + 0.55)) / 0.6);
    if (back > 0) g = { ...g, p: mix3(g.p, CROW_SPOT, back), yaw: lerpAng(g.yaw, -PI / 2, back), step: back < 1 ? (t - T.checkmate) * 9 : 0 };
  }
  // the score: puffed up, proud
  const proud = window01(t, T.eleven - 0.1, SECONDS, 0.3, 0.2);
  if (proud > 0) g = { ...g, face: { eyes: "sparkle", brow: -0.3, beak: 0.3 * proud }, bob: g.bob + 0.015 * proud * Math.abs(Math.sin(t * 7)), flap: 0.25 * proud * (0.5 + 0.5 * Math.sin(t * 12)) };
  return g;
};
/** the knight follows the beak: it moves only when the tip has reached it (contact), never ahead */
export const knightAt = (t: number): V3 => {
  const g = crowAt(t);
  if (!g) return K0;
  const tip = beakTip(g);
  const pr = (tip[0] - K0[0]) * KD.x + (tip[2] - K0[2]) * KD.z + KNIGHT_R;
  const u = clamp(pr, 0, KD.L);
  // monotone: once pushed it stays (take the max over the push so far)
  let m = u;
  for (let s = Math.max(LAND_T1, T.pushes - 0.2); s < t; s += 1 / 60) {
    const gs = crowAt(s);
    if (!gs) continue;
    const ts = beakTip(gs);
    m = Math.max(m, clamp((ts[0] - K0[0]) * KD.x + (ts[2] - K0[2]) * KD.z + KNIGHT_R, 0, KD.L));
  }
  return [K0[0] + KD.x * m, BOARD_Y, K0[2] + KD.z * m];
};

// ------------------------------------------------------------------ scenes
export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState };
export type Extra = { pieces: Piece[]; crow?: GullState | null; torch?: { p: V3; yaw: number; pitch: number; on: number; to: V3 }; ball?: V3; ghost?: Piece; score?: number; lamps?: number };
export type Scene = { id: number; t0: number; mood: string; blur: number; cam: (t: number) => Cam; actors: (t: number) => Actor[]; extra: (t: number) => Extra; focus: (t: number) => V3 };
const A = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });
const OK_HEAD = (t: number) => head(OKAFOR, SEAT_W, 1);
const BOARD_C: V3 = [0, BOARD_Y, 0];

// 1. the hook: the board, then Okafor and the empty stool
const s1: Scene = {
  id: 1, t0: 0, mood: "day", blur: 1.2,
  cam: keyed([
    [0, C([0.85, 0.98, 0.5], [-0.35, 0.84, 0.0], 44)],
    [T.year, C([1.45, 1.16, 1.6], [-0.4, 0.92, 0], 42), "inout"],
    [T.nobody, C([1.55, 1.2, 1.8], [-0.35, 0.92, 0], 42)],
    [T.player + 0.6, C([1.5, 1.32, 1.6], [0.7, 0.62, 0], 40), "inout"],
  ]),
  actors: (t) => {
    const stool = window01(t, T.nobody - 0.2, SECONDS, 0.6, 0.1);
    const lk = look(OKAFOR, SEAT_W, SEAT_YAW, add(BOARD_C, [0, 0, 0]), 1);
    const pose: BodyPose = { ...seatedBase(t), lean: 4, headYaw: lk.headYaw * (1 - stool) - 28 * stool, headNod: lk.headNod * (1 - stool) + 4 * stool };
    return [A(OKAFOR, SEAT_W, SEAT_YAW, pose, stool > 0.5 ? F("half", "flat", "raised") : F("squint", "flat", "angry"))];
  },
  extra: () => ({ pieces: place(MID) }),
  focus: (t) => (t < T.year ? BOARD_C : t < T.nobody ? OK_HEAD(t) : [0.92, 0.55, 0]),
};

// 2. every morning: his one move (the pawn rides in his hand from rank 2 to rank 4)
const PAWN_A = sqAt(1, 4);
const PAWN_B = sqAt(2, 4);
const PAWN_H = 0.045; // grip height above the square
const MOVE0 = T.makes - 0.05;
const MOVE1 = T.walks - 0.15;
const pawnPath = (t: number): V3 => {
  const u = smooth((t - (MOVE0 + 0.35)) / (MOVE1 - MOVE0 - 0.65));
  const p = mix3(PAWN_A, PAWN_B, u);
  return [p[0], p[1] + 0.05 * Math.sin(PI * u), p[2]];
};
const s2Okafor = (t: number) => {
  const reach = window01(t, MOVE0, MOVE1, 0.35, 0.3);
  const tgt = add(pawnPath(t), [-0.012, PAWN_H, 0]);
  const k = ik(OKAFOR, SEAT_W, SEAT_YAW, "R", tgt, 16, 1);
  const base = seatedBase(t);
  const pose: BodyPose = { ...base, lean: lerp(4, 16, reach), armR: mixArm(base.armR!, k.arm, reach), armRFwd: lerp(base.armRFwd!, k.fwd, reach), ...look(OKAFOR, SEAT_W, SEAT_YAW, pawnPath(t), 1) };
  const face = t < MOVE0 ? F("half", "flat", "neutral") : t < MOVE1 - 0.1 ? F("squint", "smirk", "raised") : F("half", "smirk", "raised");
  return { a: A(OKAFOR, SEAT_W, SEAT_YAW, pose, face), pose, reach };
};
const s2: Scene = {
  id: 2, t0: T.every - 0.08, mood: "golden", blur: 1.2,
  cam: keyed([
    [T.every - 0.08, C([0.95, 1.28, 1.05], [-0.4, 0.82, 0.0], 44)],
    [T.walks, C([0.9, 1.26, 1.0], [-0.35, 0.8, 0.0], 44), "inout"],
  ]),
  actors: (t) => [s2Okafor(t).a],
  extra: (t) => {
    const o = s2Okafor(t);
    // the pawn follows its path (lift, carry, set down); his hand is solved onto it (the checker verifies the grip)
    void o;
    return { pieces: place(MID, { wp4: pawnPath(t) }) };
  },
  focus: (t) => (t < MOVE0 ? OK_HEAD(t) : PAWN_B),
};

// 3. ...and walks home (wide; the table in the foreground)
const HOME: WalkSeg = { t0: T.walks - 0.05, t1: T.the2 + 0.1, from: [-1.75, 0, 0.32], to: [-4.6, 0, 0.18] };
const s3: Scene = {
  id: 3, t0: T.walks - 0.05, mood: "golden", blur: 0.8,
  cam: keyed([
    [T.walks - 0.05, C([1.35, 1.35, 1.9], [-2.4, 1.0, 0.25], 46)],
    [T.the2, C([1.2, 1.4, 1.95], [-3.2, 1.0, 0.2], 46), "linear"],
  ]),
  actors: (t) => {
    const w = walkAt([HOME], HOME.from, t, OKAFOR.height);
    return [A(OKAFOR, w.p, -PI / 2, { walk: w.walk, lean: 4, armL: [16, 10], armLFwd: 10, armR: [16, 10], armRFwd: 10 }, F("half", "smile", "neutral"))];
  },
  extra: () => ({ pieces: place(MID, { wp4: PAWN_B }) }),
  focus: (t) => head(OKAFOR, walkAt([HOME], HOME.from, t, OKAFOR.height).p),
};

// 4. the next morning: a black bishop has moved (a faint ghost where it stood), Okafor leans in, impressed
const BISHOP_B = sqAt(4, 2);
const OK_STAND: V3 = [-0.98, 0, 0.62];
const OK_STAND_YAW = yawTo(OK_STAND, [0, 0, 0]);
const s4: Scene = {
  id: 4, t0: T.the2 - 0.08, mood: "golden", blur: 1.3,
  cam: keyed([
    [T.the2 - 0.08, C([0.42, 1.26, 0.5], [0.02, 0.64, 0.0], 40)],
    [T.black + 0.3, C([0.34, 1.04, 0.32], [0.02, 0.64, -0.06], 36), "inout"],
    [T.one2 + 0.5, C([0.3, 0.96, 0.26], [0.03, 0.66, -0.08], 34), "inout"],
  ]),
  actors: (t) => {
    const lean = window01(t, T.the2, SECONDS, 0.6, 0.1);
    const pose: BodyPose = { lean: 8 * lean, armR: [16, 10], armRFwd: 10, armL: [16, 10], armLFwd: 10, ...look(OKAFOR, OK_STAND, OK_STAND_YAW, BISHOP_B) };
    const face = t < T.always ? F("huge", "o", "high") : F("squint", "smirk", "raised");
    return [A(OKAFOR, OK_STAND, OK_STAND_YAW, pose, face)];
  },
  extra: () => ({ pieces: place(MID, { wp4: PAWN_B, bb: BISHOP_B }) }),
  focus: (t) => (t < T.always ? BISHOP_B : head(OKAFOR, OK_STAND)),
};

// 4b. "always a good move": his face, impressed (a cut, not a swoop)
const s4b: Scene = {
  ...s4, id: 13, t0: T.always - 0.1, blur: 1.0,
  cam: keyed([
    [T.always - 0.1, C([0.55, 1.42, -0.55], [-0.9, 1.3, 0.55], 40)],
    [T.he1, C([0.45, 1.42, -0.47], [-0.9, 1.31, 0.55], 38), "linear"],
  ]),
  focus: () => head(OKAFOR, OK_STAND),
};

// 5. the groundskeeper   6. the kids
const OK_STAFF: V3 = [STAFF_SPOT[0] - 0.95, 0, STAFF_SPOT[2] + 0.2];
const shake = (t: number, a: number, b: number) => window01(t, a, b, 0.15, 0.2) * Math.sin((t - a) * 13) * 26;
const s5: Scene = {
  id: 5, t0: T.he1 - 0.08, mood: "day", blur: 1.0,
  cam: keyed([
    [T.he1 - 0.08, C([3.55, 1.5, -0.95], [3.75, 1.3, -3.1], 42)],
    [T.he2, C([3.65, 1.46, -1.15], [3.78, 1.32, -3.1], 40), "linear"],
  ]),
  actors: (t) => {
    const lens = s5.cam(t).pos;
    const yO = lerpAng(yawTo(OK_STAFF, STAFF_SPOT), yawTo(OK_STAFF, lens), 0.42);
    const yS = lerpAng(yawTo(STAFF_SPOT, OK_STAFF), yawTo(STAFF_SPOT, lens), 0.42);
    const point = window01(t, T.he1, T.not1 - 0.1, 0.25, 0.25);
    const kp = ik(OKAFOR, OK_STAFF, yO, "R", add(head(OKAFOR, OK_STAFF), [-0.45, -0.3, 0.5]), 4);
    const po: BodyPose = { lean: 4, armR: mixArm([16, 10], kp.arm, point), armRFwd: lerp(10, kp.fwd, point), armL: [16, 10], armLFwd: 10, headYaw: -10 * point };
    const no = window01(t, T.not1 - 0.1, SECONDS, 0.25, 0.1);
    const ps: BodyPose = { lean: 2, armL: mixArm([16, 10], [60, 95], no), armLFwd: lerp(10, 25, no), armR: mixArm([16, 10], [60, 95], no), armRFwd: lerp(10, 25, no), headYaw: shake(t, T.not1 - 0.05, T.not1 + 0.75) };
    return [
      A(OKAFOR, OK_STAFF, yO, po, F("open", talk(t, T.he1, T.staff + 0.35, "flat"), "raised")),
      A(STAFF, STAFF_SPOT, yS, ps, no > 0.3 ? F("half", "frown", "raised") : F("open", "flat", "neutral")),
    ];
  },
  extra: () => ({ pieces: place(MID, { wp4: PAWN_B, bb: BISHOP_B }) }),
  focus: () => head(STAFF, STAFF_SPOT),
};
const K1P: V3 = [KIDS_SPOT[0] - 0.3, 0, KIDS_SPOT[2] + 0.12];
const K2P: V3 = [KIDS_SPOT[0] + 0.32, 0, KIDS_SPOT[2] - 0.12];
const OK_KIDS: V3 = [KIDS_SPOT[0] + 1.25, 0, KIDS_SPOT[2] + 0.28];
const s6: Scene = {
  id: 6, t0: T.he2 - 0.08, mood: "day", blur: 1.0,
  cam: keyed([
    [T.he2 - 0.08, C([-4.1, 1.3, 0.75], [-4.1, 0.9, -2.75], 46)],
    [T.and2, C([-4.1, 1.28, 0.55], [-4.1, 0.9, -2.75], 45), "linear"],
  ]),
  actors: (t) => {
    const lens = s6.cam(t).pos;
    const yO = lerpAng(yawTo(OK_KIDS, KIDS_SPOT), yawTo(OK_KIDS, lens), 0.42);
    const bend = window01(t, T.he2, SECONDS, 0.4, 0.1);
    const no = window01(t, T.not2 - 0.1, SECONDS, 0.2, 0.1);
    const kid = (spec: CharacterSpec, p: V3, ph: number): Actor => {
      const y = lerpAng(yawTo(p, OK_KIDS), yawTo(p, lens), 0.45);
      const pose: BodyPose = { lean: 0, armL: mixArm([12, 10], [55, 95], no), armLFwd: lerp(10, 25, no), armR: mixArm([12, 10], [55, 95], no), armRFwd: lerp(10, 25, no), headYaw: shake(t + ph, T.not2 - 0.05, T.not2 + 0.7), ...(no < 0.1 ? look(spec, p, y, head(OKAFOR, OK_KIDS)) : {}) };
      return A(spec, p, y, pose, no > 0.3 ? F("closed", "grin", "raised") : F("open", "o", "raised"));
    };
    return [
      A(OKAFOR, OK_KIDS, yO, { lean: 10 * bend, armL: [20, 14], armLFwd: 30 * bend, armR: [20, 14], armRFwd: 30 * bend }, F("open", talk(t, T.he2, T.not2 - 0.2, "flat"), "raised")),
      kid(KID1, K1P, 0), kid(KID2, K2P, 0.11),
    ];
  },
  extra: () => ({ pieces: place(MID, { wp4: PAWN_B, bb: BISHOP_B }), ball: [KIDS_SPOT[0] - 0.05, 0.13, KIDS_SPOT[2] + 0.55] }),
  focus: () => head(KID1, K1P),
};

// 7. and he's losing
const s7: Scene = {
  id: 7, t0: T.and2 - 0.08, mood: "day", blur: 1.3,
  cam: keyed([
    [T.and2 - 0.08, C([1.1, 1.22, 0.5], [-0.76, 1.0, 0.0], 44)],
    [T.so, C([1.0, 1.2, 0.46], [-0.76, 1.0, 0.0], 42), "linear"],
  ]),
  actors: (t) => {
    const slump = window01(t, T.and2, SECONDS, 0.5, 0.1);
    const base = seatedBase(t);
    const pose: BodyPose = { ...base, lean: 4 + 3 * slump, headTilt: 14 * slump, headNod: 4 * slump };
    return [A(OKAFOR, SEAT_W, SEAT_YAW, pose, F("half", "wavy", "worried", { sweat: true }))];
  },
  extra: () => ({ pieces: place(LOSE) }),
  focus: (t) => OK_HEAD(t),
};

// 8. one night, behind the tree, flashlight in hand
const TD = (() => {
  const L = Math.hypot(TREE[0], TREE[2]);
  return { x: TREE[0] / L, z: TREE[2] / L };
})();
const HIDE: V3 = [TREE[0] + TD.x * 0.36 + TD.z * 0.56, 0, TREE[2] + TD.z * 0.36 - TD.x * 0.56];
const HIDE_YAW = yawTo(HIDE, [0, 0, 0]);
const s8Okafor = (t: number) => {
  const raise = window01(t, T.so, SECONDS, 0.5, 0.1);
  const tgt = add(head(OKAFOR, HIDE), [Math.sin(HIDE_YAW) * 0.32, -0.42, Math.cos(HIDE_YAW) * 0.32]);
  const k = ik(OKAFOR, HIDE, HIDE_YAW, "R", tgt, 8);
  const pose: BodyPose = { lean: 8, armR: mixArm([16, 10], k.arm, raise), armRFwd: lerp(10, k.fwd, raise), armL: [16, 10], armLFwd: 10, headNod: 4 };
  return { a: A(OKAFOR, HIDE, HIDE_YAW, pose, F("squint", "flat", "angry")), pose };
};
const s8: Scene = {
  id: 8, t0: T.so - 0.08, mood: "night", blur: 1.0,
  cam: keyed([
    [T.so - 0.08, C([HIDE[0] + TD.z * 0.8 - TD.x * 1.7, 1.4, HIDE[2] - TD.x * 0.8 - TD.z * 1.7], [HIDE[0] - TD.z * 0.15, 1.3, HIDE[2] + TD.x * 0.15], 44)],
    [T.at, C([HIDE[0] + TD.z * 0.7 - TD.x * 1.5, 1.4, HIDE[2] - TD.x * 0.7 - TD.z * 1.5], [HIDE[0] - TD.z * 0.15, 1.3, HIDE[2] + TD.x * 0.15], 42), "linear"],
  ]),
  actors: (t) => [s8Okafor(t).a],
  extra: (t) => {
    const o = s8Okafor(t);
    const hp = hand(OKAFOR, HIDE, HIDE_YAW, o.pose, "R");
    const on = smooth((t - T.flashlight - 0.1) / 0.12);
    return { pieces: place(LOSE), torch: { p: hp, yaw: HIDE_YAW, pitch: -0.12, on, to: BOARD_C }, lamps: 1 };
  },
  focus: () => head(OKAFOR, HIDE),
};

// 9. sunrise: the crow lands, stares, pushes the knight; the white king topples on "checkmate"
const kingTip = (t: number) => smooth((t - T.checkmate - 0.1) / 0.45) * (PI / 2 - 0.05);
const s9: Scene = {
  id: 9, t0: T.at - 0.08, mood: "golden", blur: 1.2,
  cam: keyed([
    [T.at - 0.08, C([-1.6, 1.14, 1.45], [0.6, 1.09, -0.6], 46)],
    [T.board + 0.2, C([-1.1, 1.02, 0.95], [0.3, 0.79, -0.05], 44), "inout"],
    [T.stares + 0.2, C([-0.42, 0.9, 0.55], [0.36, 0.82, -0.02], 38), "inout"],
    [T.then, C([-0.38, 0.89, 0.52], [0.34, 0.81, -0.02], 37)],
    [T.pushes, C([-0.3, 0.96, 0.62], [0.12, 0.7, 0.0], 40), "inout"],
    [T.beak + 0.4, C([-0.24, 0.98, 0.6], [0.05, 0.68, -0.02], 40)],
  ]),
  actors: () => [],
  extra: (t) => {
    const kn = knightAt(t);
    const ps = place(LOSE, { bn: kn }).map((p) => (p.id === "wk" ? { ...p, tip: kingTip(t) } : p));
    return { pieces: ps, crow: crowAt(t) };
  },
  focus: (t) => {
    const g = crowAt(t);
    if (t > T.checkmate) return sqAt(1, 2);
    return g ? add(g.p, [0, 0.3, 0]) : [0.4, 1.1, 0];
  },
};

// 9b. "checkmate": the white king topples (its own shot, no swing)
const s9b: Scene = {
  ...s9, id: 14, t0: T.checkmate - 0.06, blur: 1.2,
  cam: keyed([
    [T.checkmate - 0.06, C([-0.35, 0.86, 0.38], [-0.1, 0.66, -0.12], 36)],
    [T.mr2, C([-0.37, 0.84, 0.36], [-0.1, 0.66, -0.13], 35), "linear"],
  ]),
  focus: () => sqAt(1, 2),
};

// 10. he sits down across from it (already lowering as the shot opens: the seat is under him)
const s10Okafor = (t: number) => {
  const settle = smooth((t - (T.mr2 - 0.1)) / (T.resets - T.mr2 - 0.2));
  const sit = lerp(0.82, 1, settle);
  const base = seatedBase(t);
  const pose: BodyPose = { ...base, sit, lean: lerp(14, 4, settle), ...look(OKAFOR, SEAT_W, SEAT_YAW, add(CROW_SPOT, [0, 0.25, 0]), sit) };
  return A(OKAFOR, SEAT_W, SEAT_YAW, pose, F("glare", "flat", "angry"));
};
const s10: Scene = {
  id: 10, t0: T.mr2 - 0.08, mood: "golden", blur: 1.0,
  cam: keyed([
    [T.mr2 - 0.08, C([1.35, 1.3, 0.42], [-0.7, 0.95, -0.05], 40)],
    [T.resets, C([1.28, 1.28, 0.4], [-0.7, 0.96, -0.05], 39), "linear"],
  ]),
  actors: (t) => [s10Okafor(t)],
  extra: (t) => ({ pieces: place(LOSE, { bn: K1 }).map((p) => (p.id === "wk" ? { ...p, tip: PI / 2 - 0.05 } : p)), crow: crowAt(t) }),
  focus: () => add(CROW_SPOT, [0, 0.25, 0]),
};

// 11. insert: a fresh board, his hand sets the white king down
const KING_A: V3 = add(sqAt(0, 4), [-0.04, 0.06, 0.02]);
const KING_B = sqAt(0, 4);
const s11Pose = (t: number) => {
  const u = smooth((t - T.resets) / (T.and3 - T.resets - 0.35));
  const kp = mix3(KING_A, KING_B, u);
  const tgt = add(kp, [-0.014, 0.085, 0]);
  const k = ik(OKAFOR, SEAT_W, SEAT_YAW, "R", tgt, 20, 1);
  const base = seatedBase(t);
  const pose: BodyPose = { ...base, lean: 20, armR: k.arm, armRFwd: k.fwd, headNod: 20 };
  return { pose, kp };
};
const s11: Scene = {
  id: 11, t0: T.resets - 0.08, mood: "golden", blur: 1.0,
  cam: keyed([
    [T.resets - 0.08, C([0.22, 1.55, 0.2], [-0.2, 0.64, 0.02], 28)],
    [T.and3, C([0.21, 1.53, 0.19], [-0.21, 0.64, 0.02], 27), "linear"],
  ]),
  actors: (t) => [A(OKAFOR, SEAT_W, SEAT_YAW, s11Pose(t).pose, F("half", "smirk", "raised"))],
  extra: (t) => {
    const s = s11Pose(t);
    // the king follows its path; his hand is solved onto it (the checker verifies the grip)
    const kp = s.kp;
    const ps = place(START.filter((x) => x[4] !== "wk4")).concat([{ id: "wk4", kind: "k", white: true, p: kp }]);
    return { pieces: ps, crow: crowAt(t) };
  },
  focus: () => KING_B,
};

// 12. "best of fifty" and the score card
const s12: Scene = {
  id: 12, t0: T.and3 - 0.08, mood: "golden", blur: 0.9,
  cam: keyed([
    [T.and3 - 0.08, C([1.1, 1.04, 0.48], [-0.72, 1.04, -0.05], 40)],
    [T.fifty + 0.4, C([0.98, 1.05, 0.42], [-0.72, 1.06, -0.05], 38), "inout"],
    [T.the5, C([0.98, 1.05, 0.42], [-0.72, 1.06, -0.05], 38)],
  ]),
  actors: (t) => {
    const point = window01(t, T.best - 0.25, T.fifty + 0.55, 0.25, 0.3);
    const lk = look(OKAFOR, SEAT_W, SEAT_YAW, add(CROW_SPOT, [0, 0.25, 0]), 1);
    const kp = ik(OKAFOR, SEAT_W, SEAT_YAW, "R", add(OK_HEAD(t), [0.45, -0.22, -0.12]), 6, 1);
    const base = seatedBase(t);
    const groan = window01(t, T.eleven - 0.1, SECONDS, 0.3, 0.1);
    const pose: BodyPose = { ...base, lean: 6, armR: mixArm(base.armR!, kp.arm, point), armRFwd: lerp(base.armRFwd!, kp.fwd, point), ...lk, headTilt: 10 * groan };
    const face = groan > 0.3 ? F("closed", "grimace", "worried") : F("glare", talk(t, T.best, T.fifty + 0.35, "smirk"), "angry");
    return [A(OKAFOR, SEAT_W, SEAT_YAW, pose, face)];
  },
  extra: (t) => ({ pieces: place(START), crow: crowAt(t), score: smooth((t - T.eleven + 0.2) / 0.3) }),
  focus: () => [0, 1.0, 0] as V3,
};

// 12b. the score: both of them in frame, the crow proud, Okafor groaning; the lens drifts back
const s12b: Scene = {
  ...s12, id: 15, t0: T.the5 - 0.05, blur: 0.8,
  cam: keyed([
    [T.the5 - 0.05, C([0.15, 1.12, 1.75], [0.0, 0.88, 0], 44)],
    [SECONDS, C([0.45, 1.75, 3.0], [0.0, 0.85, 0], 46), "inout"],
  ]),
  focus: () => [0, 0.9, 0] as V3,
};

export const SCENES: Scene[] = [s1, s2, s3, s4, s4b, s5, s6, s7, s8, s9, s9b, s10, s11, s12, s12b];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const CROW_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0) });
