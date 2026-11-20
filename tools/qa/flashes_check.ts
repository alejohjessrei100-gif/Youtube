// Every-frame check for the Three Flashes film (template: tools/qa/maplefilm_check.ts). Per set: the set's boxes (world.tsx
// SET_BOXES); lens inside / grazing anything; lens near heads; actors inside furniture; overlaps; arm range; head turn;
// per-frame jumps / turns; IK reach on every committed hand (takeReachErr); props jumping between frames; faces toward
// the lens on their beats; and the FRAME CHECK (9x15 ray grid: blocked lens, big foreground, hidden focus, cropped faces).
import { hand, head, headPosed } from "../../src/crow/shots";
import { SCENES, T, takeReachErr, takeReachWho } from "../../src/flashes/shots";
import { FB, FB_BOXES, LOT, LOT_BOXES } from "../../src/flashes/world";
import { SECONDS } from "../../src/flashes/words";
const SET_BOXES = { lot: { o: LOT, b: LOT_BOXES }, fb: { o: FB, b: FB_BOXES } };
type V = [number, number, number];
type Box = { n: string; min: V; max: V };
const d3 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const d2 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const bad: Record<string, number[]> = {};
const add = (k: string, t: number) => (bad[k] ??= []).push(t);
const inBox = (p: V, b: Box, pad: number) => p[0] > b.min[0] - pad && p[0] < b.max[0] + pad && p[1] > b.min[1] - pad && p[1] < b.max[1] + pad && p[2] > b.min[2] - pad && p[2] < b.max[2] + pad;
const SETS: Record<string, Box[]> = Object.fromEntries(Object.entries(SET_BOXES).map(([k, v]) => [k, v.b.map((b) => ({ n: b.n, min: [b.min[0] + v.o[0], b.min[1] + v.o[1], b.min[2] + v.o[2]] as V, max: [b.max[0] + v.o[0], b.max[1] + v.o[1], b.max[2] + v.o[2]] as V }))]));
const prevProps: Record<string, V> = {};
const worst: Record<string, number> = {};
const prevPose: Record<string, number[]> = {};
let prevCam: { pos: V; fw: V; id: number } | null = null;
let prevBubble: { k: number; id: number } | null = null;
const segBox = (a: V, b: V, bx: Box, pad: number) => { for (let k = 0; k <= 12; k++) { const u = k / 12; if (inBox([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], bx, pad)) return true; } return false; };
// ---- ray casting
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a: V): V => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const rayBox = (o: V, d: V, b: Box) => {
  let t0 = 0, t1 = 1e9;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) { if (o[k] < b.min[k] || o[k] > b.max[k]) return Infinity; continue; }
    let a = (b.min[k] - o[k]) / d[k], c = (b.max[k] - o[k]) / d[k]; if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return Infinity;
  }
  return t0;
};
type Sph = { n: string; c: V; r: number };
const raySph = (o: V, d: V, s: Sph) => { const oc = sub(o, s.c); const b = dot(oc, d); const c = dot(oc, oc) - s.r * s.r; const h = b * b - c; if (h < 0) return Infinity; const t = -b - Math.sqrt(h); return t > 0 ? t : (c < 0 ? 0 : Infinity); };
const lerpV = (a: V, b: V, u: number): V => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const rotX = (v: V, r: number): V => [v[0], v[1] * Math.cos(r) - v[2] * Math.sin(r), v[1] * Math.sin(r) + v[2] * Math.cos(r)];
const bodySpheres = (a: { spec: { height: number }; p: number[]; yaw: number; pose: { sit?: number; lean?: number }; lying?: { p: number[]; r: number[] } }, i: number): Sph[] => {
  const h = a.spec.height;
  if (a.lying) {
    const L = (y: number): V => { const q = rotX([0, y, 0], a.lying!.r[0]); return [q[0] + a.lying!.p[0], q[1] + a.lying!.p[1], q[2] + a.lying!.p[2]]; };
    return [{ n: `actor${i} head`, c: L(head(a.spec as never, [0, 0, 0])[1]), r: 0.16 * h }, ...[0.35, 0.5, 0.62].map((y) => ({ n: `actor${i} body`, c: L(y * h), r: 0.13 * h })), ...[0.1, 0.25].map((y) => ({ n: `actor${i} legs`, c: L(y * h), r: 0.08 * h }))];
  }
  const p = a.p as V; const hd = headPosed(a as never) as V; const sit = a.pose.sit ?? 0;
  const hip: V = [p[0], p[1] + 0.42 * h * (1 - 0.45 * sit), p[2]]; const chest = lerpV(p, hd, 0.7);
  return [{ n: `actor${i} head`, c: hd, r: 0.16 * h }, ...[0, 0.5, 1].map((u) => ({ n: `actor${i} body`, c: lerpV(hip, chest, u), r: 0.12 * h })), ...[0.12, 0.28].map((y) => ({ n: `actor${i} legs`, c: [p[0], p[1] + y * h, p[2]] as V, r: 0.08 * h }))];
};
const castFirst = (o: V, d: V, boxes: Box[], sph: Sph[], floorY: number) => {
  let best = Infinity, who = "";
  for (const b of boxes) { const t = rayBox(o, d, b); if (t < best) { best = t; who = b.n; } }
  for (const s of sph) { const t = raySph(o, d, s); if (t < best) { best = t; who = s.n; } }
  if (d[1] < 0) { const t = (floorY - o[1]) / d[1]; if (t < best) { best = t; who = "floor"; } }
  return { t: best, who };
};
const prev: Record<string, { p: V; yaw: number; s: number }> = {};
for (let f = 0; f < Math.round(SECONDS * 30); f++) {
  const t = f / 30;
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  const boxes = SETS[s.set];
  takeReachErr(); takeReachWho();
  const lens = s.cam(t).pos as V; const fo = s.focus(t) as V; const actors = s.actors(t);
  const re = takeReachErr(); const rw = takeReachWho(); if (re > 0.08) { add(`a committed hand misses its target (s${s.id}) ${rw.split(" target")[0]}`, t); worst[`s${s.id}`] = Math.max(worst[`s${s.id}`] ?? 0, re); }
  // ---- added after the Midnight review: arms through furniture, props through bodies, unheld props moving, camera
  // jumps, pose pops, heads touching, bubble size pops
  { const ex = s.extra(t) as Record<string, unknown>;
    const hands: V[] = [];
    actors.forEach((a, i) => {
      const hp = headPosed(a as never) as V;
      for (const side of ["L", "R"] as const) {
        const hd = hand(a.spec, a.p as V, a.yaw, a.pose, side) as V; hands.push(hd);
        // shoulder ~0.42 m below the head centre, 0.2 m to the side; the arm is the shoulder -> hand segment
        const sx = side === "R" ? 1 : -1; const rt: V = [Math.cos(a.yaw), 0, -Math.sin(a.yaw)];
        const sh: V = [hp[0] + rt[0] * 0.2 * sx, hp[1] - 0.42, hp[2] + rt[2] * 0.2 * sx];
        const mid: V = [(sh[0] + hd[0]) / 2, (sh[1] + hd[1]) / 2, (sh[2] + hd[2]) / 2];
        for (const b of boxes) if (b.max[1] > 0.3 && (inBox(hd, b, -0.01) || segBox(mid, hd, b, -0.03))) add(`actor${i} ${side} arm through ${b.n} (s${s.id})`, t);
      }
      const key = `s${s.id}a${i}`; const v = [...(a.pose.armL ?? [0, 0]), ...(a.pose.armR ?? [0, 0]), a.pose.armLFwd ?? 0, a.pose.armRFwd ?? 0, a.pose.headYaw ?? 0, a.pose.headNod ?? 0];
      const q = prevPose[key]; if (q) { const d = Math.max(...v.map((x, k) => Math.abs(x - q[k]))); if (d > 15) add(`actor${i} pose pops ${d.toFixed(0)} deg in a frame (s${s.id})`, t); }
      prevPose[key] = v;
      actors.forEach((o, j) => { if (j > i && d3(hp, headPosed(o as never) as V) < 0.5) add(`heads ${i}/${j} touching (s${s.id})`, t); });
    });
    const sph = actors.flatMap((a, i) => bodySpheres(a as never, i));
    const items: [string, V][] = [];
    ((ex.beams as { p: V }[] | undefined) ?? []).forEach((c, i) => items.push(["beam" + i, c.p]));
    if (ex.phone) items.push(["phone", (ex.phone as { p: V }).p]);
    for (const [k, p] of items) {
      for (const q of sph) if (!q.n.endsWith("legs") && d3(p, q.c) < q.r * 0.85) add(`prop ${k} inside ${q.n} (s${s.id})`, t);
      const pp = prevProps["u" + s.id + k]; const near = Math.min(...hands.map((h) => d3(h, p)));
      if (pp && d3(pp, p) > 0.02 && near > 0.15 && p[1] > 0.2 && !(s.id === 2 && t > T.flashlight2 && t < T.flashlight2 + 0.45)) add(`prop ${k} moves with no hand on it (s${s.id})`, t);
      prevProps["u" + s.id + k] = p;
    }
    const cam = s.cam(t); const fwc = nrm(sub(cam.look as V, cam.pos as V));
    if (prevCam && prevCam.id === s.id) { const ang = Math.acos(Math.min(1, dot(fwc, prevCam.fw))) * 57.3; const mv = d3(prevCam.pos, cam.pos as V); if (ang > 12 || (mv > 0.35 && mv / Math.max(1, d3(cam.pos as V, s.focus(t) as V)) > 0.08)) add(`camera jumps (${ang.toFixed(0)} deg / ${mv.toFixed(2)} m in a frame) (s${s.id})`, t); }
    prevCam = { pos: cam.pos as V, fw: fwc, id: s.id };
    const bk = (ex.bubble as { k: number } | undefined)?.k ?? 0;
    if (prevBubble && prevBubble.id === s.id && Math.abs(bk - prevBubble.k) > 0.25) add(`bubble size pops (s${s.id})`, t);
    prevBubble = { k: bk, id: s.id }; }
  // props must not jump between frames inside a scene
  { const ex = s.extra(t) as Record<string, unknown>;
    const items: [string, V][] = [];
    ((ex.beams as { p: V }[] | undefined) ?? []).forEach((c, i) => items.push(["beam" + i, c.p]));
    if (ex.phone) items.push(["phone", (ex.phone as { p: V }).p]);
    for (const [k, p] of items) { const q = prevProps[s.id + k]; if (q && d3(q, p) > 0.15 && !(s.id === 2 && t > T.flashlight2 && t < T.flashlight2 + 0.45)) add(`prop ${k} jumps ${d3(q, p).toFixed(2)} m (s${s.id})`, t); prevProps[s.id + k] = p; } }
  for (const b of boxes) if (inBox(lens, b, 0.1)) add(`lens inside / grazing ${b.n} (s${s.id})`, t);
  if (lens[1] < 0.3) add(`lens near the floor (s${s.id})`, t);
  actors.forEach((a, i) => {
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
    actors.forEach((o, j) => { if (j > i && d2(p, o.p as V) < 0.42) add(`actors ${i}/${j} overlap (s${s.id})`, t); });
  });
  // ---- FRAME CHECK
  {
    const cam = s.cam(t); const fov = (cam.fov * Math.PI) / 180; const tv = Math.tan(fov / 2), th = tv * 9 / 16;
    const fw = nrm(sub(cam.look as V, lens)); const rt = nrm(crs(fw, [0, 1, 0])); const up = crs(rt, fw);
    const cw = s.cam(Math.max(s.t0, t - 1 / 30)); const fwW = nrm(sub(cw.look as V, cw.pos as V)); const whip = Math.acos(Math.min(1, dot(fw, fwW))) * 57.3 > 8;
    const sph = actors.flatMap((a, i) => bodySpheres(a as never, i));
    const bx = [...boxes];
    const floorY = 0.0;
    const fd = d3(lens, fo); const nearLim = Math.max(0.5, 0.3 * fd);
    let near = 0, tot = 0, fore = 0; const hits: Record<string, number> = {}; const fhits: Record<string, number> = {};
    for (let yi = 0; yi < 15; yi++) for (let xi = 0; xi < 9; xi++) {
      const x = -0.9 + (1.8 * xi) / 8, y = -0.9 + (1.8 * yi) / 14;
      const d = nrm([fw[0] + rt[0] * x * th + up[0] * y * tv, fw[1] + rt[1] * x * th + up[1] * y * tv, fw[2] + rt[2] * x * th + up[2] * y * tv]);
      const h = castFirst(lens, d, bx, sph, floorY); tot++;
      if (h.t < nearLim) { near++; hits[h.who] = (hits[h.who] ?? 0) + 1; }
      if (h.t < 0.7 * fd && !h.who.startsWith("floor")) { fore++; fhits[h.who] = (fhits[h.who] ?? 0) + 1; }
    }
    if (!whip && fore / tot > 0.4) { const w = Object.entries(fhits).sort((a, b) => b[1] - a[1])[0][0]; add(`foreground ${w} fills ${Math.round((100 * fore) / tot / 10) * 10}%+ of the frame (s${s.id})`, t); }
    if (whip && (near / tot > 0.3 || fore / tot > 0.4)) add(`INFO whip frame passes close scenery (motion-blurred, s${s.id})`, t);
    else if (near / tot > 0.3) { const w = Object.entries(hits).sort((a, b) => b[1] - a[1])[0][0]; add(`frame ${Math.round((100 * near) / tot / 10) * 10}%+ blocked near the lens by ${w} (s${s.id})`, t); }
    // the focus must be visible: nothing in front of it except the thing it is on
    const fdn = nrm(sub(fo, lens));
    const fhead = sph.find((q) => q.n.endsWith("head") && d3(q.c, fo) < 0.3);
    const own = sph.filter((q) => q !== fhead && d3(q.c, fo) > q.r);
    const hf = castFirst(lens, fdn, bx.filter((b) => !inBox(fo, b, 0.06)), own, -99);
    if (hf.t < fd - 0.3) add(`focus hidden behind ${hf.who} (s${s.id})`, t);
    // a focus face must fit the frame (not cropped at the top or wider than the frame)
    const fh = sph.find((q) => q.n.endsWith("head") && d3(q.c, fo) < 0.3);
    const c0 = s.cam(Math.max(s.t0, t - 1 / 30)); const fw0 = nrm(sub(c0.look as V, c0.pos as V));
    const turning = Math.acos(Math.min(1, dot(fw, fw0))) * 57.3 > 1.5 || Math.abs(c0.fov - cam.fov) > 0.6 || d3(c0.pos as V, lens) > 0.03;
    if (fh && !turning) {
      const v = sub(fh.c, lens); const z = dot(v, fw); const ar = Math.asin(Math.min(1, fh.r / Math.hypot(...v)));
      const ay = Math.atan2(dot(v, up), z), ax = Math.atan2(dot(v, rt), z);
      if (ay + ar > fov / 2) add(`focus face cropped at the top (s${s.id})`, t);
      else if (2 * ar > 2 * Math.atan(th)) add(`focus face wider than the frame (s${s.id})`, t);
      else if (Math.abs(ax) + ar > Math.atan(th) * 1.15) add(`focus face off the side of the frame (s${s.id})`, t);
    }
  }
  // speakers / reactors face the lens on their beats
  const facing = (a: { p: number[]; yaw: number; pose: { headYaw?: number } }, lim: number, tag: string) => {
    const hd = headPosed(a as never) as V; const fy = a.yaw + ((a.pose.headYaw ?? 0) * Math.PI) / 180; const to = Math.atan2(lens[0] - hd[0], lens[2] - hd[2]);
    const off = Math.abs(Math.atan2(Math.sin(to - fy), Math.cos(to - fy))) * 57.3; if (off > lim) add(`${tag} face ${off.toFixed(0)} deg from the lens`, t);
  };
  if (s.id === 1 && t > T.security + 0.5) facing(actors[1], 60, "guard watching");
  if (s.id === 2 && t > T.tom + 0.15 && t < T.slippers - 0.25) facing(actors[0], 50, "Tom revealed");
  if (s.id === 3 && t < T.three2 + 0.6) facing(actors[0], 65, "young Tom at the switch");
  if (s.id === 3 && t > T.love + 0.5) facing(actors[1], 50, "young Ellen at her window");
  if (s.id === 4 && t > T.window + 1.0) facing(actors[2], 45, "Ellen at the window");
  if (s.id === 5 && t < T.own + 0.3) facing(actors[1], 55, "guard with his flashlight");
}
console.log('worst hand misses:', JSON.stringify(Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(2)]))));
const ks = Object.keys(bad); for (const k of ks) console.log(`${k}: ${bad[k].length} frames [${bad[k][0].toFixed(2)}-${bad[k][bad[k].length - 1].toFixed(2)}]`);
const real = ks.filter((k) => !k.startsWith("INFO")); console.log(real.length ? `${real.length} issue kinds` : `OK: no issues (${ks.length - real.length} info)`);
