// Every-frame geometry QA for the Chess Crow short. Prints problems grouped into time ranges.
//  bodies vs each other / table / stools / tree / lamps / benches; lens inside or too close to anything; lens -> focus
//  sightline blocked; hands on held props (pawn, flashlight, king); IK reach errors; faces toward the lens when
//  speaking; prop continuity (no piece jumps inside a scene); crow feet on the table, beak never inside the board or
//  a non-target piece, the knight only moving while the beak touches it; turn / jump rates; shadow-box coverage.
import { headOf } from "../../src/inkbeat/char/Character3D";
import { moodOf } from "../../src/inkbeat/core/moods";
import { shotLight } from "../../src/inkbeat/core/shadows";
import { SCENES, beakTip, hand, head, T } from "../../src/crow/shots";
import { BENCHES, BOARD_Y, LAMPS, SEAT_B, SEAT_W, TABLE_H, TABLE_HW, TREE, TREE_R } from "../../src/crow/world";
import { SECONDS } from "../../src/crow/words.gen";

type V = [number, number, number];
const issues: Record<string, number[]> = {};
const add = (k: string, t: number) => (issues[k] ??= []).push(t);
const d2 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const d3 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// static obstacles as vertical cylinders [center, radius, top] and boxes
const CYL: { n: string; p: V; r: number; top: number }[] = [
  { n: "tree", p: TREE as V, r: TREE_R, top: 2.6 },
  ...LAMPS.map((p, i) => ({ n: `lamp${i}`, p: p as V, r: 0.07, top: 3.4 })),
  { n: "stoolW", p: SEAT_W as V, r: 0.17, top: 0.5 },
  { n: "stoolB", p: SEAT_B as V, r: 0.17, top: 0.5 },
  { n: "pedestal", p: [0, 0, 0], r: 0.36, top: 0.06 },
];
const inTable = (p: V, pad = 0) => Math.abs(p[0]) < TABLE_HW + pad && Math.abs(p[2]) < TABLE_HW + pad && p[1] > TABLE_H - 0.08 && p[1] < TABLE_H + 0.02;
const segBlock = (a: V, b: V, c: V, r: number, top: number) => {
  // does segment a-b pass within r of the vertical line at c below height top (sampled)
  for (let i = 1; i < 40; i++) {
    const u = i / 40;
    const p: V = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    if (p[1] < top && d2(p, c) < r) return true;
  }
  return false;
};
const prev: Record<string, { yaw: number; p: V; scene: number }> = {};
const prevPieces: Record<string, V> = {};
let prevScene = -1;
const N = Math.round(SECONDS * 30);
for (let f = 0; f < N; f++) {
  const t = f / 30;
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  const cam = s.cam(t);
  const focus = s.focus(t) as V;
  const actors = s.actors(t);
  const ex = s.extra(t);
  const lens = cam.pos as V;
  // --- bodies
  actors.forEach((a, i) => {
    const p = a.p as V;
    const seated = (a.pose.sit ?? 0) > 0.5;
    for (const c of CYL) {
      if (seated && c.n === "stoolW" && d2(p, c.p) < 0.05) continue;
      if (seated && c.n === "pedestal") continue;
      if (d2(p, c.p) < c.r + 0.2) add(`actor${i} (${s.id}) body inside ${c.n} (${d2(p, c.p).toFixed(2)} m)`, t);
    }
    if (!seated && Math.abs(p[0]) < TABLE_HW + 0.2 && Math.abs(p[2]) < TABLE_HW + 0.2) add(`actor${i} (${s.id}) standing body inside the table`, t);
    for (const b of BENCHES) if (d2(p, b.p as V) < 1.0) add(`actor${i} (${s.id}) inside a bench`, t);
    actors.forEach((o, j) => {
      if (j > i && d2(p, o.p as V) < 0.42) add(`actors ${i}/${j} (${s.id}) overlap ${d2(p, o.p as V).toFixed(2)} m`, t);
    });
    // lens
    const hd = head(a.spec, p, a.pose.sit ?? 0) as V;
    if (d3(lens, hd) < 0.45) add(`lens within 0.45 m of actor${i}'s head (${s.id})`, t);
    if (d2(lens, p) < 0.28 && lens[1] < a.spec.height) add(`lens inside actor${i}'s body (${s.id})`, t);
    // sightline to focus through a body that is not the subject
    if (d3(hd, focus) > 0.4 && d3(p, focus) > 0.5 && segBlock(lens, focus, p, 0.2, hd[1] + 0.15)) add(`actor${i} blocks the lens -> focus line (${s.id})`, t);
    // limbs finite and in range
    for (const v of [a.pose.armL?.[0], a.pose.armL?.[1], a.pose.armR?.[0], a.pose.armR?.[1], a.pose.armLFwd, a.pose.armRFwd]) {
      if (v !== undefined && (!Number.isFinite(v) || v < -25 || v > 165)) add(`actor${i} (${s.id}) arm angle out of range ${v}`, t);
    }
    if (Math.abs(a.pose.headYaw ?? 0) > 75) add(`actor${i} (${s.id}) head turned ${(a.pose.headYaw ?? 0).toFixed(0)} deg`, t);
    // continuity
    const k = `actor${i}`;
    const q = prev[k];
    if (q && q.scene === s.id) {
      const dy = Math.abs(Math.atan2(Math.sin(a.yaw - q.yaw), Math.cos(a.yaw - q.yaw))) * (180 / Math.PI);
      if (dy > 6) add(`${k} (${s.id}) turns ${dy.toFixed(0)} deg in one frame`, t);
      if (d3(p, q.p) > 0.12) add(`${k} (${s.id}) jumps ${d3(p, q.p).toFixed(2)} m in one frame`, t);
    }
    prev[k] = { yaw: a.yaw, p, scene: s.id };
  });
  for (const c of CYL) if (d2(lens, c.p) < c.r + 0.12 && lens[1] < c.top) add(`lens inside ${c.n} (${s.id})`, t);
  if (inTable(lens, 0.05)) add(`lens inside the table (${s.id})`, t);
  if (lens[1] < 0.3) add(`lens near the ground (${s.id})`, t);
  for (const c of CYL) if (c.n === "tree" || c.n.startsWith("lamp")) if (segBlock(lens, focus, c.p, c.r, c.top)) add(`${c.n} blocks the lens -> focus line (${s.id})`, t);
  // the tabletop between lens and focus (a focus above the table seen from below it)
  for (let i = 1; i < 30; i++) {
    const u = i / 30;
    const p: V = [lens[0] + (focus[0] - lens[0]) * u, lens[1] + (focus[1] - lens[1]) * u, lens[2] + (focus[2] - lens[2]) * u];
    if (u < 0.97 && inTable(p)) { add(`the tabletop blocks the lens -> focus line (${s.id})`, t); break; }
  }
  // --- held props
  const ok = actors[0];
  if (s.id === 2 && ok) {
    const pawn = ex.pieces.find((p) => p.id === "wp4")!;
    const hd = hand(ok.spec, ok.p, ok.yaw, ok.pose, "R");
    const grip = d3([pawn.p[0] - 0.012, pawn.p[1] + 0.045, pawn.p[2]], hd);
    if (t > T.makes + 0.3 && t < T.walks - 0.45 && grip > 0.03) add(`s2 the pawn is ${grip.toFixed(3)} m from his hand while carried`, t);
  }
  if (s.id === 8 && ok && ex.torch) {
    const hd = hand(ok.spec, ok.p, ok.yaw, ok.pose, "R");
    if (d3(hd, ex.torch.p as V) > 0.02) add(`s8 the flashlight is off his hand`, t);
    if (t > T.so + 0.6 && d3(hd, [ok.p[0] + Math.sin(ok.yaw) * 0.3, hd[1], ok.p[2] + Math.cos(ok.yaw) * 0.3]) > 0.25) add(`s8 the flashlight hand is not out in front (IK miss)`, t);
  }
  if (s.id === 11 && ok) {
    const king = ex.pieces.find((p) => p.id === "wk4")!;
    const hd = hand(ok.spec, ok.p, ok.yaw, ok.pose, "R");
    const grip = d3([king.p[0] - 0.014, king.p[1] + 0.085, king.p[2]], hd);
    if (t < T.and3 - 0.35 && grip > 0.03) add(`s11 the king is ${grip.toFixed(3)} m from his hand`, t);
  }
  // --- pieces: inside the board? continuity within a scene
  for (const p of ex.pieces) {
    if (p.p[1] < BOARD_Y - 0.002) add(`piece ${p.id} below the board top (${s.id})`, t);
    const q = prevPieces[p.id];
    if (q && prevScene === s.id && d3(q, p.p as V) > 0.03) add(`piece ${p.id} jumps ${d3(q, p.p as V).toFixed(3)} m in one frame (${s.id})`, t);
    prevPieces[p.id] = p.p as V;
  }
  // pieces overlapping each other on the board (centres closer than one square, except the toppled king lying)
  for (let i = 0; i < ex.pieces.length; i++)
    for (let j = i + 1; j < ex.pieces.length; j++)
      if (d2(ex.pieces[i].p as V, ex.pieces[j].p as V) < 0.04) add(`pieces ${ex.pieces[i].id}/${ex.pieces[j].id} overlap (${s.id})`, t);
  // --- the crow
  const g = ex.crow;
  if (g) {
    const flying = g.fold < 0.99;
    if (!flying && Math.abs(g.p[1] - TABLE_H) > 0.001) add(`crow feet off the tabletop (${s.id})`, t);
    if (!flying && (Math.abs(g.p[0]) > TABLE_HW - 0.03 || Math.abs(g.p[2]) > TABLE_HW - 0.03)) add(`crow stands off the table edge (${s.id})`, t);
    const tip = beakTip(g) as V;
    if (tip[1] < BOARD_Y + 0.005 && Math.abs(tip[0]) < 0.27 && Math.abs(tip[2]) < 0.27) add(`beak inside the board (${s.id})`, t);
    for (const p of ex.pieces) {
      if (p.id === "bn") continue;
      if (d2(tip, p.p as V) < 0.025 && tip[1] < p.p[1] + 0.1) add(`beak inside piece ${p.id} (${s.id})`, t);
    }
    // body vs pieces: the crow body (r ~0.1 at s 0.62) must not stand on a piece
    const TOP: Record<string, number> = { p: 0.054, r: 0.06, n: 0.075, b: 0.084, q: 0.093, k: 0.1 };
    for (const p of ex.pieces) {
      const dx = p.p[0] - g.p[0], dz = p.p[2] - g.p[2];
      const lz = dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw);
      const lx = dx * Math.cos(g.yaw) - dz * Math.sin(g.yaw);
      const sc = g.s ?? 1;
      if (Math.hypot(lx, lz) < 0.03 + 0.06 * sc) add(`crow legs on piece ${p.id} (${s.id})`, t);
      else if ((lx / (0.17 * sc)) ** 2 + (lz / (0.24 * sc)) ** 2 < 1 && p.p[1] + TOP[p.kind] > g.p[1] + 0.095) add(`crow body through piece ${p.id} (${s.id})`, t);
    }
    const kn = ex.pieces.find((p) => p.id === "bn");
    if (kn && s.id === 9) {
      const q = prevPieces["bn_prev"];
      if (q && d3(q, kn.p as V) > 1e-4) {
        const contact = d2(tip, kn.p as V);
        if (contact > 0.035) add(`knight moves without the beak on it (${contact.toFixed(3)} m)`, t);
        if (tip[1] > kn.p[1] + 0.09 || tip[1] < kn.p[1] + 0.01) add(`beak contact height off the knight (${(tip[1] - kn.p[1]).toFixed(3)})`, t);
      }
      prevPieces["bn_prev"] = kn.p as V;
    }
    if (d3(lens, [g.p[0], g.p[1] + 0.18, g.p[2]]) < 0.25) add(`lens inside the crow (${s.id})`, t);
    const q = prev.crow;
    if (q && q.scene === s.id) {
      const dy = Math.abs(Math.atan2(Math.sin(g.yaw - q.yaw), Math.cos(g.yaw - q.yaw))) * (180 / Math.PI);
      if (dy > 8) add(`crow turns ${dy.toFixed(0)} deg in one frame`, t);
      if (d3(g.p as V, q.p) > (g.fold < 0.99 ? 0.3 : 0.06)) add(`crow jumps ${d3(g.p as V, q.p).toFixed(2)} m in one frame`, t);
    }
    prev.crow = { yaw: g.yaw, p: g.p as V, scene: s.id };
  }
  // --- faces toward the lens while a character speaks (s5 Okafor, s6 Okafor, s12 Okafor): within 80 deg
  if ((s.id === 5 || s.id === 6 || s.id === 12) && ok) {
    const fy = ok.yaw + ((ok.pose.headYaw ?? 0) * Math.PI) / 180;
    const hd = headOf(ok.p as V, ok.spec.height, ok.spec.build);
    const toCam = Math.atan2(lens[0] - hd[0], lens[2] - hd[2]);
    const off = Math.abs(Math.atan2(Math.sin(toCam - fy), Math.cos(toCam - fy))) * (180 / Math.PI);
    if (off > 80) add(`speaker's face turned ${off.toFixed(0)} deg from the lens (${s.id})`, t);
  }
  // --- shadow box covers every actor and the crow
  const sl = shotLight(moodOf(s.mood), cam);
  const half = sl.extent / 2;
  for (const a of actors) if (Math.abs(a.p[0] - sl.center[0]) > half || Math.abs(a.p[2] - sl.center[2]) > half) add(`actor outside the shadow box (${s.id})`, t);
  prevScene = s.id;
}
const keys = Object.keys(issues);
for (const k of keys) {
  const ts = issues[k];
  const ranges: string[] = [];
  let a = ts[0];
  let b = ts[0];
  for (const x of ts.slice(1)) {
    if (x - b > 0.05) {
      ranges.push(`${a.toFixed(2)}-${b.toFixed(2)}`);
      a = x;
    }
    b = x;
  }
  ranges.push(`${a.toFixed(2)}-${b.toFixed(2)}`);
  console.log(`${k}: ${ts.length} frames  [${ranges.slice(0, 6).join(", ")}${ranges.length > 6 ? ", ..." : ""}]`);
}
console.log(keys.length ? `${keys.length} issue kinds` : "OK: no issues");
