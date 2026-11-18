// The Graves short as DATA. Every scene is one continuous keyed lens; scenes cut only where time or place changes.
//   1 cold     morning: a low push toward the new white row among the old mossy stones
//   2 night    the row under the lamp ("one every night")      3 cold  two townsfolk, puzzled
//   4 cold     a lateral dolly past three names (Thomas Reed, Ellis Mae Carter, Jonah Hale)
//   5 cold     the townsfolk again: no bodies, no records, "a prank" (she laughs)
//   6 day      the sheriff with his notebook at the row       7 (2D)  the 1931 newspaper page
//   8 night    the Margaret Ann founders in the swell         9 dusk  the row from above ("22 men")
//  10 night    the sheriff waits inside the gate              11 night the truck pulls up, headlights
//  12 night    the stonemason by her truck, the sheriff        13 golden dawn: the two empty slots, the row, the sea
import type { CharacterSpec, FaceState, Pose as BodyPose } from "../inkbeat/char/Character3D";
import { lerp, mixArm, window01 } from "../inkbeat/anim/acting";
import type { WalkSeg } from "../inkbeat/anim/acting";
import type { Cam } from "../inkbeat/core/rig";
import type { V3 } from "../inkbeat/types";
import { C, clamp, hand, head, ik, keyed, lerpAng, look, smooth, yawTo } from "../crow/shots";
import { MASON, SHERIFF, TOWN1, TOWN2 } from "./cast";
import { GATE, ROAD_Z, ROW_Z, slotX, stoneAt } from "./world";
import type { YardState } from "./world";
import { SECONDS, WORDS } from "./words.gen";

const PI = Math.PI;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9':-]/g, "").replace(/[.,]$/, "");
export const W = (word: string, nth = 1) => {
  let k = 0;
  for (const [w, a] of WORDS) if (norm(w) === norm(word) && ++k === nth) return a;
  throw new Error(`word not found: ${word} #${nth}`);
};
const F = (eyes: FaceState["eyes"], mouth: FaceState["mouth"], brows: FaceState["brows"], extra: Partial<FaceState> = {}): FaceState => ({ eyes, mouth, brows, ...extra });
export const T = {
  one: W("one"), night1: W("night."), for: W("for"), thomas: W("thomas"), ellis: W("ellis"), jonah: W("jonah"), no1: W("no"),
  records: W("records."), town2: W("town", 2), prank: W("prank."), then: W("then"), newspapers: W("newspapers."), every: W("every"),
  margaret: W("margaret"), fishing: W("fishing"), sank: W("sank"), y1931: W("1931."), twenty1: W("twenty-two"), never1: W("never"),
  buried: W("buried."), that: W("that", 2), waits: W("waits"), a_woman: W("woman"), truck: W("truck."), shes1: W("she's"),
  her: W("her", 2), captain: W("captain."), he: W("he"), home: W("home."), twenty2: W("twenty-two", 2), shes2: W("she's", 2),
  left: W("left."),
};

export type Actor = { spec: CharacterSpec; p: V3; yaw: number; pose: BodyPose; face: FaceState };
export type Extra = { dog?: import("../biscuit/world").DogState; truck?: { p: V3; yaw: number; roll: number; lights: number }; boat?: { p: V3; sink: number; heel: number }; notebook?: { p: V3; ry: number }; paper?: number; count?: string | null };
export type Scene = { id: number; t0: number; mood: string; blur: number; dim: number; cam: (t: number) => Cam; actors: (t: number) => Actor[]; yard: (t: number) => YardState; extra: (t: number) => Extra; focus: (t: number) => V3 };
const A = (spec: CharacterSpec, p: V3, yaw: number, pose: BodyPose, face: FaceState): Actor => ({ spec, p, yaw, pose, face });
const REST: BodyPose = { armL: [14, 10], armLFwd: 10, armR: [14, 10], armRFwd: 10 };
const ROW_C: V3 = [0, 0.45, ROW_Z];
const yard = (filled = 20, stakes = true, lamp = 0) => (t: number): YardState => ({ t, filled, dim: 1, stakes, lamp });

// 1. the hook: the new white row among the old stones, a slow low push
const s1: Scene = {
  id: 1, t0: 0, mood: "cold", blur: 1.2, dim: 0.9,
  cam: keyed([
    [0, C([0.9, 0.62, 5.6], [0.1, 0.5, ROW_Z], 40)],
    [T.one - 0.06, C([0.5, 0.7, 4.4], [0.0, 0.5, ROW_Z], 40), "linear"],
  ]),
  actors: () => [],
  yard: yard(),
  extra: () => ({}),
  focus: () => ROW_C,
};
// 2. night: the row under the gate lamp
const s2: Scene = {
  id: 2, t0: T.one - 0.06, mood: "night", blur: 0.8, dim: 0.5,
  cam: keyed([
    [T.one - 0.06, C([3.2, 2.4, 7.0], [0.0, 0.4, ROW_Z], 44)],
    [T.for - 0.06, C([2.9, 2.3, 6.6], [0.0, 0.4, ROW_Z], 44), "linear"],
  ]),
  actors: () => [],
  yard: yard(20, true, 1),
  extra: () => ({ count: "20 NIGHTS" }),
  focus: () => ROW_C,
};
// 3 / 5. two townsfolk at the row: puzzled, then "a prank" (she laughs, he shrugs)
const T1P: V3 = [-0.55, 0, ROW_Z + 1.05];
const T2P: V3 = [0.5, 0, ROW_Z + 1.15];
const TOWN_LENS: V3 = [0.05, 1.32, -0.35];
const townA = (t: number): Actor[] => {
  const shrug = window01(t, T.no1, T.records + 0.6, 0.3, 0.3);
  const laugh = window01(t, T.prank - 0.1, SECONDS, 0.2, 0.1);
  const point = window01(t, T.for, T.thomas - 0.2, 0.3, 0.3);
  // each faces the row, cheated 35% toward the lens
  const y1 = lerpAng(yawTo(T1P, stoneAt(9)), yawTo(T1P, TOWN_LENS), 0.35);
  const y2 = lerpAng(yawTo(T2P, stoneAt(11)), yawTo(T2P, TOWN_LENS), 0.35);
  const kp = ik(TOWN1, T1P, y1, "R", add(head(TOWN1, T1P), [Math.sin(y1) * 0.5 - 0.1, -0.55, Math.cos(y1) * 0.5]), 4);
  let p1: BodyPose = { ...REST, lean: 4, armR: mixArm([14, 10], kp.arm, point), armRFwd: lerp(10, kp.fwd, point) };
  if (shrug > 0) p1 = { ...p1, armL: mixArm([14, 10], [60, 95], shrug), armLFwd: lerp(10, 25, shrug), armR: mixArm(p1.armR!, [60, 95], shrug), armRFwd: lerp(p1.armRFwd!, 25, shrug) };
  const p2: BodyPose = { ...REST, lean: 2 - 6 * laugh, headTilt: 10 * laugh, headNod: -8 * laugh };
  return [
    A(TOWN1, T1P, y1, p1, t < T.no1 ? F("open", "flat", "raised") : F("half", "wavy", "worried")),
    A(TOWN2, T2P, y2, p2, laugh > 0.3 ? F("closed", "grin", "raised") : t < T.no1 ? F("squint", "o", "raised") : F("open", "flat", "worried")),
  ];
};
/** a golden dog sits beside him, looking at the lens, tail going */
const DOG_P: V3 = [T1P[0] - 0.62, 0, T1P[2] + 0.3];
const townDog = (t: number) => ({ p: DOG_P, yaw: yawTo(DOG_P, TOWN_LENS) - 0.5, headYaw: 0.25 * Math.sin(t * 0.8), headTilt: 0.15 * Math.sin(t * 1.3), headNod: 0, ears: 0.3, wag: 0.6, sit: 1, bonk: 0, mouth: 0.5, t });
const s3: Scene = {
  id: 3, t0: T.for - 0.06, mood: "cold", blur: 1.0, dim: 0.9,
  cam: keyed([
    [T.for - 0.06, C(TOWN_LENS, [0.0, 1.15, ROW_Z + 1.1], 46)],
    [T.thomas - 0.06, C([0.05, 1.3, -0.15], [0.0, 1.15, ROW_Z + 1.1], 45), "linear"],
  ]),
  actors: townA,
  yard: yard(),
  extra: (t) => ({ dog: townDog(t) }),
  focus: () => head(TOWN1, T1P),
};
// 4. the names: a lateral dolly at stone height, each name centered on its word
const nameCam = (i: number): Cam => C([slotX(i) + 0.12, 0.62, ROW_Z + 1.45], [slotX(i), 0.42, ROW_Z], 34);
const s4: Scene = {
  id: 4, t0: T.thomas - 0.06, mood: "cold", blur: 1.4, dim: 0.9,
  cam: keyed([
    [T.thomas - 0.06, nameCam(8.6)],
    [T.thomas + 0.35, nameCam(9)],
    [T.ellis + 0.3, nameCam(10), "inout"],
    [T.jonah + 0.25, nameCam(11), "inout"],
    [T.no1 - 0.06, nameCam(11.2), "linear"],
  ]),
  actors: () => [],
  yard: yard(),
  extra: () => ({}),
  focus: (t) => [t < T.ellis ? slotX(9) : t < T.jonah ? slotX(10) : slotX(11), 0.42, ROW_Z],
};
const s5: Scene = { ...s3, id: 5, t0: T.no1 - 0.06, cam: keyed([[T.no1 - 0.06, C([0.2, 1.35, -0.4], [0.0, 1.15, ROW_Z + 1.1], 46)], [T.then - 0.06, C([0.15, 1.32, -0.15], [0.0, 1.15, ROW_Z + 1.1], 44), "linear"]]) };

// 6. the sheriff at the row, notebook in hand, reading the names
const SH_ROW: V3 = [0.9, 0, ROW_Z + 1.0];
const sheriffRow = (t: number) => {
  const yaw = lerpAng(yawTo(SH_ROW, stoneAt(11)), yawTo(SH_ROW, [1.3, 0, -0.4]), 0.3);
  const hp = head(SHERIFF, SH_ROW);
  const nb: V3 = [hp[0] + Math.sin(yaw) * 0.42 - Math.cos(yaw) * 0.05, hp[1] - 0.62, hp[2] + Math.cos(yaw) * 0.42 + Math.sin(yaw) * 0.05];
  const k = ik(SHERIFF, SH_ROW, yaw, "L", nb, 4);
  const pose: BodyPose = { ...REST, lean: 4, armL: k.arm, armLFwd: k.fwd, ...look(SHERIFF, SH_ROW, yaw, nb), headNod: 10 + 4 * Math.sin(t * 2) };
  return { a: A(SHERIFF, SH_ROW, yaw, pose, F("squint", "flat", "angry")), pose, yaw };
};
const s6: Scene = {
  id: 6, t0: T.then - 0.06, mood: "day", blur: 1.0, dim: 0.95,
  cam: keyed([
    [T.then - 0.06, C([1.3, 1.4, -0.45], [0.9, 1.2, ROW_Z + 1.0], 42)],
    [T.newspapers - 0.06, C([1.28, 1.4, -0.2], [0.9, 1.22, ROW_Z + 1.0], 40), "linear"],
  ]),
  actors: (t) => [sheriffRow(t).a],
  yard: yard(),
  extra: (t) => {
    const s = sheriffRow(t);
    return { notebook: { p: hand(SHERIFF, SH_ROW, s.yaw, s.pose, "L"), ry: s.yaw } };
  },
  focus: () => head(SHERIFF, SH_ROW),
};
// 7. the newspaper page (a 2D overlay; the yard sits behind it)
const s7: Scene = {
  id: 7, t0: T.newspapers - 0.06, mood: "day", blur: 0, dim: 0.95,
  cam: () => C([0, 3, 6], ROW_C, 44),
  actors: () => [],
  yard: yard(),
  extra: (t) => ({ paper: smooth((t - T.newspapers + 0.06) / 0.25) }),
  focus: () => ROW_C,
};
// 8. the Margaret Ann in the storm, 1931: rides the swell, then founders
const BOAT: V3 = [6, 0, -52];
const s8: Scene = {
  id: 8, t0: T.fishing - 0.06, mood: "night", blur: 0.6, dim: 0.5,
  cam: keyed([
    [T.fishing - 0.06, C([-3.5, -3.9, -40.5], [6, -5.0, -52], 40)],
    [T.twenty1 - 0.06, C([-3.2, -4.1, -41.5], [6, -5.6, -52], 40), "linear"],
  ]),
  actors: () => [],
  yard: yard(),
  extra: (t) => ({ boat: { p: BOAT, sink: smooth((t - T.sank) / (T.twenty1 - T.sank - 0.1)), heel: 0.5 * smooth((t - T.sank + 0.3) / 1.2) }, count: t > T.y1931 - 0.1 ? "1931" : null }),
  focus: () => [6, -5.6, -52],
};
// 9. dusk: the row from above, the lens rising ("twenty-two men")
const s9: Scene = {
  id: 9, t0: T.twenty1 - 0.06, mood: "cold", blur: 0.6, dim: 0.85,
  cam: keyed([
    [T.twenty1 - 0.06, C([0.0, 3.0, 7.6], [0.0, 0.3, ROW_Z], 46)],
    [T.that - 0.06, C([0.0, 4.4, 8.4], [0.0, 0.2, ROW_Z - 0.4], 48), "linear"],
  ]),
  actors: () => [],
  yard: yard(),
  extra: () => ({ count: "22 MEN" }),
  focus: () => ROW_C,
};
// 10. night: the sheriff waits inside the gate, facing the road
const SH_GATE: V3 = [-1.8, 0, GATE[2] + 0.75];
const s10: Scene = {
  id: 10, t0: T.that - 0.06, mood: "night", blur: 1.0, dim: 0.5,
  cam: keyed([
    [T.that - 0.06, C([-0.2, 1.5, 11.6], [-1.8, 1.35, SH_GATE[2]], 42)],
    [T.a_woman - 0.06, C([-0.3, 1.5, 11.4], [-1.8, 1.36, SH_GATE[2]], 40), "linear"],
  ]),
  actors: (t) => [A(SHERIFF, SH_GATE, 0.55, { ...REST, lean: 2, headYaw: 8 * Math.sin(t * 0.7) }, F("half", "flat", "neutral"))],
  yard: yard(20, true, 1),
  extra: () => ({}),
  focus: () => head(SHERIFF, SH_GATE),
};
// 11. the truck pulls up along the road, headlights on; the sheriff turns to it
const TRUCK_STOP: V3 = [1.0, 0, ROAD_Z];
const DRIVE: WalkSeg = { t0: T.a_woman - 0.3, t1: T.truck + 0.1, from: [14, 0, ROAD_Z], to: TRUCK_STOP };
const truckAt = (t: number) => {
  const u = clamp((t - DRIVE.t0) / (DRIVE.t1 - DRIVE.t0));
  const e = 1 - Math.pow(1 - u, 2.2);
  const x = lerp(DRIVE.from[0], DRIVE.to[0], e);
  const dist = DRIVE.from[0] - x;
  return { p: [x, 0, ROAD_Z] as V3, yaw: -PI / 2, roll: -dist / 0.38, lights: 1 };
};
const s11: Scene = {
  id: 11, t0: T.a_woman - 0.06, mood: "night", blur: 0.8, dim: 0.5,
  cam: keyed([
    [T.a_woman - 0.06, C([-4.6, 1.55, 12.3], [2.5, 1.0, ROAD_Z], 46)],
    [T.shes1 - 0.06, C([-4.4, 1.55, 12.2], [1.4, 1.0, ROAD_Z], 46), "inout"],
  ]),
  actors: (t) => {
    const tr = truckAt(t);
    const y = lerpAng(0.55, yawTo(SH_GATE, tr.p), smooth((t - T.a_woman) / 0.8));
    return [A(SHERIFF, SH_GATE, y, { ...REST, lean: 2 }, F("open", "o", "raised"))];
  },
  yard: yard(20, true, 1),
  extra: (t) => ({ truck: truckAt(t) }),
  focus: (t) => add(truckAt(t).p, [0, 1.2, 0]),
};
// 12. the stonemason beside her truck bed and the sheriff, outside the gate: "the captain", "made it home"
const MA_P: V3 = [2.25, 0, ROAD_Z - 1.35];
const SH_OUT: V3 = [0.15, 0, ROAD_Z - 1.45];
const LENS12: V3 = [1.25, 1.5, 6.9];
const s12: Scene = {
  id: 12, t0: T.shes1 - 0.06, mood: "night", blur: 1.1, dim: 0.5,
  cam: keyed([
    [T.shes1 - 0.06, C(LENS12, [1.2, 1.3, ROAD_Z - 1.4], 46)],
    [T.captain + 0.3, C([1.45, 1.5, 7.1], [1.95, 1.4, ROAD_Z - 1.35], 42), "inout"],
    [T.twenty2 - 0.06, C([1.5, 1.5, 7.25], [2.05, 1.42, ROAD_Z - 1.35], 40), "linear"],
  ]),
  actors: (t) => {
    const ym = lerpAng(yawTo(MA_P, SH_OUT), yawTo(MA_P, LENS12), 0.45);
    const ys = lerpAng(yawTo(SH_OUT, MA_P), yawTo(SH_OUT, LENS12), 0.4);
    const down = window01(t, T.shes1 + 0.3, T.her, 0.3, 0.3);
    const sad = window01(t, T.he - 0.2, SECONDS, 0.4, 0.1);
    const pm: BodyPose = { ...REST, lean: 3, headNod: 14 * down + 10 * sad, headTilt: 8 * sad };
    const ps: BodyPose = { ...REST, lean: 2, ...look(SHERIFF, SH_OUT, ys, head(MASON, MA_P)) };
    return [
      A(MASON, MA_P, ym, pm, sad > 0.3 ? F("closed", "flat", "worried", { flush: 0.3 }) : t < T.her ? F("half", "flat", "neutral") : F("open", "smile", "worried")),
      A(SHERIFF, SH_OUT, ys, ps, t < T.captain ? F("open", "flat", "raised") : F("wide", "o", "worried")),
    ];
  },
  yard: yard(20, true, 1),
  extra: () => ({ truck: { p: TRUCK_STOP, yaw: -PI / 2, roll: 0, lights: 0.6 } }),
  focus: () => head(MASON, MA_P),
};
// 13. dawn: the two empty slots, the mason and the sheriff beside them; the lens rises over the row to the sea
const MA_ROW: V3 = [slotX(20) + 0.15, 0, ROW_Z + 0.95];
const SH_ROW2: V3 = [slotX(18.6), 0, ROW_Z + 1.05];
const s13: Scene = {
  id: 13, t0: T.twenty2 - 0.06, mood: "golden", blur: 0.8, dim: 0.9,
  cam: keyed([
    [T.twenty2 - 0.06, C([slotX(19.2), 1.4, -0.85], [slotX(19.1), 1.15, ROW_Z + 1.0], 48)],
    [SECONDS, C([slotX(18.6), 4.2, -3.4], [slotX(19.3), 0.6, ROW_Z + 0.5], 48), "inout"],
  ]),
  actors: () => {
    const ym = lerpAng(yawTo(MA_ROW, stoneAt(20)), yawTo(MA_ROW, [slotX(19.5), 0, -0.35]), 0.4);
    const ys = lerpAng(yawTo(SH_ROW2, stoneAt(19)), yawTo(SH_ROW2, [slotX(19.5), 0, -0.35]), 0.4);
    return [A(MASON, MA_ROW, ym, { ...REST, lean: 4, headNod: 12 }, F("half", "smile", "worried")), A(SHERIFF, SH_ROW2, ys, { ...REST, lean: 2, headNod: 6 }, F("half", "smile", "raised"))];
  },
  yard: yard(),
  extra: () => ({ count: "20 / 22" }),
  focus: () => [slotX(20), 0.5, ROW_Z],
};

function add(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export const SCENES: Scene[] = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13];
export const sceneAt = (t: number) => {
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  return s;
};
export const GRAVES_EVENTS = () => ({ ...T, cuts: SCENES.map((s) => s.t0), drive: [DRIVE.t0, DRIVE.t1] });
