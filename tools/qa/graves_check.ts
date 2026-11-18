// Every-frame geometry QA for the Graves short. Prints problems grouped into time ranges.
//  bodies vs each other / gravestones / wall / gate posts / tree / lamppost / truck; the lens inside or too close to
//  anything; the lens -> focus line blocked (posed heads, posts, tree, lamppost, truck); arm angles in range; IK reach
//  (the notebook hand); faces toward the lens in their beats; turn / jump rates; shadow-box coverage.
import { moodOf } from "../../src/inkbeat/core/moods";
import { shotLight } from "../../src/inkbeat/core/shadows";
import { headPosed } from "../../src/crow/shots";
import { SCENES, T } from "../../src/graves/shots";
import { GATE, GATE_HW, h1, stoneAt, WALL } from "../../src/graves/world";
import { SECONDS } from "../../src/graves/words.gen";

type V = [number, number, number];
const issues: Record<string, number[]> = {};
const add = (k: string, t: number) => (issues[k] ??= []).push(t);
const d2 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const d3 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const stones: V[] = [];
for (let i = 0; i < 20; i++) stones.push(stoneAt(i) as V);
for (let i = 0; i < 30; i++) {
  const r = Math.floor(i / 10), c = i % 10;
  stones.push([-6.2 + c * 1.35 + (h1(i) - 0.5) * 0.4, 0, -1.2 - r * 1.5 + (h1(i + 9) - 0.5) * 0.3]);
}
const CYL: { n: string; p: V; r: number; top: number }[] = [
  { n: "postL", p: [GATE[0] - GATE_HW - 0.22, 0, GATE[2]], r: 0.32, top: 1.8 },
  { n: "postR", p: [GATE[0] + GATE_HW + 0.22, 0, GATE[2]], r: 0.32, top: 1.8 },
  { n: "tree", p: [-6.2, 0, -4.3], r: 0.3, top: 3.4 },
  { n: "lamp", p: [2.4, 0, WALL.z1 + 0.6], r: 0.08, top: 3.1 },
];
const insideWall = (p: V, pad: number) => {
  const nearX = (x: number) => Math.abs(p[0] - x) < 0.2 + pad && p[2] > WALL.z0 - pad && p[2] < WALL.z1 + pad;
  const nearZ = (z: number, gap: boolean) => Math.abs(p[2] - z) < 0.2 + pad && p[0] > WALL.x0 - pad && p[0] < WALL.x1 + pad && !(gap && Math.abs(p[0]) < GATE_HW + 0.45);
  return (nearX(WALL.x0) || nearX(WALL.x1) || nearZ(WALL.z0, false) || nearZ(WALL.z1, false)) && p[1] < 0.9;
};
const truckBox = (tp: V, p: V, pad: number) => Math.abs(p[0] - tp[0]) < 2.0 + pad && Math.abs(p[2] - tp[2]) < 0.85 + pad && p[1] < 1.7;
const prev: Record<string, { yaw: number; p: V; scene: number }> = {};
for (let f = 0; f < Math.round(SECONDS * 30); f++) {
  const t = f / 30;
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  if (s.id === 7) continue; // the 2D newspaper page
  const cam = s.cam(t);
  const lens = cam.pos as V;
  const focus = s.focus(t) as V;
  const actors = s.actors(t);
  const ex = s.extra(t);
  for (const c of CYL) if (d2(lens, c.p) < c.r + 0.1 && lens[1] < c.top) add(`lens inside ${c.n} (${s.id})`, t);
  if (insideWall(lens, 0.08)) add(`lens inside the wall (${s.id})`, t);
  for (const st of stones) if (d2(lens, st) < 0.4 && lens[1] < 0.85) add(`lens inside a gravestone (${s.id})`, t);
  if (s.id !== 8 && lens[1] < 0.3) add(`lens near the ground (${s.id})`, t);
  if (ex.truck && truckBox(ex.truck.p as V, lens, 0.2)) add(`lens inside the truck (${s.id})`, t);
  // sightline: posts, tree, lamppost, the truck, the wall (low lens)
  for (let k = 1; k < 40; k++) {
    const u = k / 40;
    const q: V = [lens[0] + (focus[0] - lens[0]) * u, lens[1] + (focus[1] - lens[1]) * u, lens[2] + (focus[2] - lens[2]) * u];
    if (u > 0.95) break;
    for (const c of CYL) if (d2(q, c.p) < c.r && q[1] < c.top) { add(`${c.n} blocks the lens -> focus line (${s.id})`, t); k = 99; break; }
    if (k < 99 && insideWall(q, 0)) { add(`the wall blocks the lens -> focus line (${s.id})`, t); break; }
    if (k < 99 && ex.truck && truckBox(ex.truck.p as V, q, 0) && d3(focus, [ex.truck.p[0], 1.2, ex.truck.p[2]]) > 1.0) { add(`the truck blocks the lens -> focus line (${s.id})`, t); break; }
  }
  actors.forEach((a, i) => {
    const p = a.p as V;
    const hd = headPosed(a) as V;
    for (const c of CYL) if (d2(p, c.p) < c.r + 0.2) add(`actor${i} (${s.id}) inside ${c.n}`, t);
    if (insideWall(p, 0.2)) add(`actor${i} (${s.id}) inside the wall`, t);
    for (const st of stones) if (d2(p, st) < 0.42) add(`actor${i} (${s.id}) inside a gravestone`, t);
    if (ex.truck && truckBox(ex.truck.p as V, p, 0.22)) add(`actor${i} (${s.id}) inside the truck`, t);
    actors.forEach((o, j) => {
      if (j > i && d2(p, o.p as V) < 0.45) add(`actors ${i}/${j} (${s.id}) overlap`, t);
    });
    if (d3(lens, hd) < 0.6) add(`lens within 0.6 m of actor${i}'s head (${s.id})`, t);
    if (d3(hd, focus) > 0.35) {
      for (let k = 1; k < 40; k++) {
        const u = k / 40;
        const q: V = [lens[0] + (focus[0] - lens[0]) * u, lens[1] + (focus[1] - lens[1]) * u, lens[2] + (focus[2] - lens[2]) * u];
        if (d3(q, hd) < 0.27) { add(`actor${i}'s head blocks the lens -> focus line (${s.id})`, t); break; }
      }
    }
    for (const v of [a.pose.armL?.[0], a.pose.armL?.[1], a.pose.armR?.[0], a.pose.armR?.[1], a.pose.armLFwd, a.pose.armRFwd]) {
      if (v !== undefined && (!Number.isFinite(v) || v < -25 || v > 165)) add(`actor${i} (${s.id}) arm angle out of range ${v}`, t);
    }
    if (Math.abs(a.pose.headYaw ?? 0) > 75) add(`actor${i} (${s.id}) head turned too far`, t);
    // faces in their beats: within 60 deg of the lens
    if ([3, 5, 6, 10, 12, 13].includes(s.id) && !(s.id === 12 && i === 1)) {
      const fy = a.yaw + ((a.pose.headYaw ?? 0) * Math.PI) / 180;
      const toCam = Math.atan2(lens[0] - hd[0], lens[2] - hd[2]);
      const off = Math.abs(Math.atan2(Math.sin(toCam - fy), Math.cos(toCam - fy))) * (180 / Math.PI);
      if (off > 60) add(`actor${i}'s face turned ${off.toFixed(0)} deg from the lens (${s.id})`, t);
    }
    const key = `actor${i}`;
    const q = prev[key];
    if (q && q.scene === s.id) {
      const dy = Math.abs(Math.atan2(Math.sin(a.yaw - q.yaw), Math.cos(a.yaw - q.yaw))) * (180 / Math.PI);
      if (dy > 6) add(`${key} (${s.id}) turns ${dy.toFixed(0)} deg in one frame`, t);
      if (d3(p, q.p) > 0.12) add(`${key} (${s.id}) jumps in one frame`, t);
    }
    prev[key] = { yaw: a.yaw, p, scene: s.id };
  });
  if (s.id === 6 && ex.notebook) {
    // the notebook hand must reach its target (IK error)
    const a = actors[0];
    const hp = a ? headPosed(a) : [0, 0, 0];
    if (d3(ex.notebook.p as V, [hp[0], hp[1] - 0.62, hp[2]]) > 0.6) add(`s6 notebook hand far from its hold point`, t);
  }
  if (ex.truck) {
    const q = prev.truck;
    if (q && q.scene === s.id && d3(q.p, ex.truck.p as V) > 0.6) add(`truck jumps in one frame (${s.id})`, t);
    prev.truck = { yaw: 0, p: ex.truck.p as V, scene: s.id };
  }
  const sl = shotLight(moodOf(s.mood), cam);
  for (const a of actors) if (Math.abs(a.p[0] - sl.center[0]) > sl.extent / 2 || Math.abs(a.p[2] - sl.center[2]) > sl.extent / 2) add(`actor outside the shadow box (${s.id})`, t);
}
void T;
const keys = Object.keys(issues);
for (const k of keys) {
  const ts = issues[k];
  const ranges: string[] = [];
  let a = ts[0], b = ts[0];
  for (const x of ts.slice(1)) {
    if (x - b > 0.05) { ranges.push(`${a.toFixed(2)}-${b.toFixed(2)}`); a = x; }
    b = x;
  }
  ranges.push(`${a.toFixed(2)}-${b.toFixed(2)}`);
  console.log(`${k}: ${ts.length} frames  [${ranges.slice(0, 5).join(", ")}${ranges.length > 5 ? ", ..." : ""}]`);
}
console.log(keys.length ? `${keys.length} issue kinds` : "OK: no issues");
