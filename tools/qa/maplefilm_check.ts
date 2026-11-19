// Every-frame check for the Maple Street film. Street boxes (with the hollow house across the street) or kitchen boxes
// by scene; lens inside / grazing anything; lens near heads; sightline blockers; actors inside furniture; IK reach on the
// mat flips and the hood; arm range; head turn; speakers' faces toward the lens; per-frame jumps / turns; the mug.
import { headPosed } from "../../src/crow/shots";
import { BOXES } from "../../src/maple/world";
import { flipDebug, SCENES, T } from "../../src/maplefilm/shots";
import { KITCHEN, KITCHEN_BOXES } from "../../src/maplefilm/world";
import { SECONDS } from "../../src/maplefilm/words";
type V = [number, number, number];
type Box = { n: string; min: V; max: V };
const d3 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const d2 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const bad: Record<string, number[]> = {};
const add = (k: string, t: number) => (bad[k] ??= []).push(t);
const inBox = (p: V, b: Box, pad: number) => p[0] > b.min[0] - pad && p[0] < b.max[0] + pad && p[1] > b.min[1] - pad && p[1] < b.max[1] + pad && p[2] > b.min[2] - pad && p[2] < b.max[2] + pad;
const ACROSS: Box[] = [
  { n: "across front L", min: [-4, 0, 17], max: [-2.35, 3.4, 17.15] }, { n: "across front R", min: [-1.25, 0, 17], max: [4, 3.4, 17.15] },
  { n: "across below window", min: [-2.35, 0, 17], max: [-1.25, 1.2, 17.15] }, { n: "across above window", min: [-2.35, 2.2, 17], max: [-1.25, 3.4, 17.15] },
  { n: "across counter", min: [-3.0, 0, 17.15], max: [-0.6, 0.96, 17.8] }, { n: "across fridge", min: [2.5, 0, 20.55], max: [3.3, 1.9, 21.25] },
  { n: "across table", min: [-0.2, 0, 19.2], max: [1.0, 0.8, 20.0] }, { n: "across back", min: [-4, 0, 21.85], max: [4, 3.4, 22] },
];
const STREET: Box[] = [...BOXES.filter((b) => b.n !== "across house") as Box[], ...ACROSS, { n: "police car", min: [0.4, 0, 10.3], max: [4.8, 1.7, 12.1] }];
const KB: Box[] = KITCHEN_BOXES.map((b) => ({ n: "kitchen " + b.n, min: [b.min[0] + KITCHEN[0], b.min[1], b.min[2] + KITCHEN[2]] as V, max: [b.max[0] + KITCHEN[0], b.max[1], b.max[2] + KITCHEN[2]] as V }));
const prev: Record<string, { p: V; yaw: number; s: number }> = {};
for (let f = 0; f < Math.round(SECONDS * 30); f++) {
  const t = f / 30;
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  const boxes = s.set === "kitchen" ? KB : STREET.filter((b) => b.n !== "police car" || s.extra(t).car);
  const lens = s.cam(t).pos as V; const fo = s.focus(t) as V; const actors = s.actors(t);
  for (const b of boxes) if (inBox(lens, b, 0.1)) add(`lens inside / grazing ${b.n} (s${s.id})`, t);
  if (lens[1] < 0.3) add(`lens near the floor (s${s.id})`, t);
  actors.forEach((a, i) => {
    if (a.lying) { if (d3(lens, a.lying.p) < 0.6) add(`lens too close to the lying actor (s${s.id})`, t); return; }
    const hd = headPosed(a) as V; const p = a.p as V;
    if (d3(lens, hd) < 0.55) add(`lens within 0.55 m of actor${i}'s head (s${s.id})`, t);
    for (const b of boxes) if (b.max[1] > 0.5 && inBox([p[0], p[1] + 0.5, p[2]], b, 0.18)) add(`actor${i} inside ${b.n} (s${s.id})`, t);
    for (let k = 1; k < 40; k++) {
      const u = k / 40; const q: V = [lens[0] + (fo[0] - lens[0]) * u, lens[1] + (fo[1] - lens[1]) * u, lens[2] + (fo[2] - lens[2]) * u];
      if (u > 0.96) break;
      if (d3(fo, hd) > 0.4 && d3(q, hd) < 0.27) { add(`actor${i}'s head blocks the lens -> focus line (s${s.id})`, t); break; }
    }
    for (const v of [a.pose.armL?.[0], a.pose.armL?.[1], a.pose.armR?.[0], a.pose.armR?.[1], a.pose.armLFwd, a.pose.armRFwd]) if (v !== undefined && (!Number.isFinite(v) || v < -25 || v > 165)) add(`actor${i} arm angle out of range (s${s.id})`, t);
    if (Math.abs(a.pose.headYaw ?? 0) > 75) add(`actor${i} head turned too far (s${s.id})`, t);
    const key = `s${s.id}a${i}`; const q = prev[key];
    if (q) { if (d3(q.p, p) > 0.15) add(`actor${i} jumps ${d3(q.p, p).toFixed(2)} m (s${s.id})`, t); const dy = Math.abs(Math.atan2(Math.sin(a.yaw - q.yaw), Math.cos(a.yaw - q.yaw))) * 57.3; if (dy > 7) add(`actor${i} turns ${dy.toFixed(0)} deg in a frame (s${s.id})`, t); }
    prev[key] = { p, yaw: a.yaw, s: s.id };
    actors.forEach((o, j) => { if (j > i && !o.lying && d2(p, o.p as V) < 0.42) add(`actors ${i}/${j} overlap (s${s.id})`, t); });
  });
  // speakers face the lens: the officer on his line, Walt on "Leave it", Alvarez in the front shots
  const facing = (a: { p: number[]; yaw: number; pose: { headYaw?: number } }, lim: number, tag: string) => {
    const hd = headPosed(a as never) as V; const fy = a.yaw + ((a.pose.headYaw ?? 0) * Math.PI) / 180; const to = Math.atan2(lens[0] - hd[0], lens[2] - hd[2]);
    const off = Math.abs(Math.atan2(Math.sin(to - fy), Math.cos(to - fy))) * 57.3; if (off > lim) add(`${tag} face ${off.toFixed(0)} deg from the lens`, t);
  };
  if (s.id === 2 && t > T.sir && t < T.crime + 0.4) facing(actors[1], 60, "officer");
  if (s.id === 2 && t > T.smiled + 0.4) facing(actors[0], 55, "Walt");
  if (s.id === 1 && t > 0.7 && t < 3.4) facing(actors[0], 60, "hooded figure");
  // IK reach on the flips
  if (s.id === 1) { const fl = flipDebug.s1(t); if (fl.kErr > 0.08) add(`s1 flip IK reach ${fl.kErr.toFixed(2)} m`, t); }
  if (s.id === 4) { const fl = flipDebug.s4(t); if (fl.kErr > 0.08) add(`s4 flip IK reach ${fl.kErr.toFixed(2)} m`, t); }
}
const ks = Object.keys(bad); for (const k of ks) console.log(`${k}: ${bad[k].length} frames [${bad[k][0].toFixed(2)}-${bad[k][bad[k].length - 1].toFixed(2)}]`);
console.log(ks.length ? `${ks.length} issue kinds` : "OK: no issues");
