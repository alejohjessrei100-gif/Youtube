// Every-frame check for the Maple Street film. Street boxes (with the hollow house across the street) or kitchen boxes
// by scene; lens inside / grazing anything; lens near heads; sightline blockers; actors inside furniture; IK reach on the
// mat flips and the hood; arm range; head turn; speakers' faces toward the lens; per-frame jumps / turns; the mug.
// FRAME CHECK (added after stills showed curtain / wall / leg / belly frames the old checks passed): every frame casts a
// 9x15 ray grid through the lens against the real boxes + body spheres; flags a view blocked near the lens, a hidden
// focus, and a cropped focus face.
import { head, headPosed } from "../../src/crow/shots";
import { BOXES, SECCAM } from "../../src/maple/world";
import { flipDebug, MAPLE_EVENTS, SCENES, T } from "../../src/maplefilm/shots";
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
  { n: "across below window", min: [-2.35, 0, 17], max: [-1.25, 1.05, 17.15] }, { n: "across above window", min: [-2.35, 2.1, 17], max: [-1.25, 3.4, 17.15] },
  { n: "across counter", min: [-3.0, 0, 17.15], max: [-0.6, 0.96, 17.8] }, { n: "across fridge", min: [2.5, 0, 20.55], max: [3.3, 1.9, 21.25] },
  { n: "across table", min: [-0.2, 0, 19.2], max: [1.0, 0.8, 20.0] }, { n: "across back", min: [-4, 0, 21.85], max: [4, 3.4, 22] },
  { n: "across curtain L", min: [-2.43, 1.08, 17.175], max: [-2.11, 2.18, 17.205] }, { n: "across curtain R", min: [-1.49, 1.08, 17.175], max: [-1.17, 2.18, 17.205] },
  { n: "across sill", min: [-2.5, 0.99, 17.05], max: [-1.1, 1.05, 17.35] }, { n: "across door", min: [1.0, 0, 16.9], max: [2.0, 2.1, 17.16] },
  { n: "across side L", min: [-4, 0, 17], max: [-3.85, 3.4, 22] }, { n: "across side R", min: [3.85, 0, 17], max: [4, 3.4, 22] },
  { n: "across ceiling", min: [-4, 3.4, 17], max: [4, 3.5, 22] }, { n: "across plant L", min: [-2.35, 1.07, 17.15], max: [-2.15, 1.37, 17.4] }, { n: "across plant R", min: [-1.45, 1.07, 17.15], max: [-1.25, 1.37, 17.4] },
];
const STREET: Box[] = [...BOXES.filter((b) => b.n !== "across house") as Box[], ...ACROSS, { n: "police car", min: [0.4, 0, 10.3], max: [4.8, 1.7, 12.1] }, { n: "porch deck", min: [-2.7, 0, 0], max: [2.7, 0.29, 2.6] }];
const KCEIL: Box = { n: "kitchen ceiling", min: [KITCHEN[0] - 3.2, 3.0, KITCHEN[2] - 2.7], max: [KITCHEN[0] + 3.2, 3.12, KITCHEN[2] + 2.7] };
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
  // ---- FRAME CHECK
  {
    const cam = s.cam(t); const fov = (cam.fov * Math.PI) / 180; const tv = Math.tan(fov / 2), th = tv * 9 / 16;
    const fw = nrm(sub(cam.look as V, lens)); const rt = nrm(crs(fw, [0, 1, 0])); const up = crs(rt, fw);
    const cw = s.cam(Math.max(s.t0, t - 1 / 30)); const fwW = nrm(sub(cw.look as V, cw.pos as V)); const whip = Math.acos(Math.min(1, dot(fw, fwW))) * 57.3 > 8;
    const sph = actors.flatMap((a, i) => bodySpheres(a as never, i));
    const ex = s.extra(t);
    const bx = [...boxes, ...(ex.stool ? [{ n: "step stool", min: [ex.stool[0] - 0.24, ex.stool[1], ex.stool[2] - 0.24] as V, max: [ex.stool[0] + 0.24, ex.stool[1] + 0.45, ex.stool[2] + 0.36] as V }] : []), ...(s.set === "kitchen" ? [KCEIL] : []), ...(ex.heldCam ? [{ n: "held camera", min: sub(ex.heldCam as V, [0.1, 0.1, 0.1]), max: [ex.heldCam[0] + 0.1, ex.heldCam[1] + 0.1, ex.heldCam[2] + 0.1] as V }] : [])];
    const floorY = s.set === "kitchen" ? 0.04 : 0.0;
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
  // both neighbours inside the frame in the opening two-shot of scene 3
  if (s.id === 3 && t < T.camera - 0.35) {
    const cam = s.cam(t); const fov = (cam.fov * Math.PI) / 180; const th = Math.tan(fov / 2) * 9 / 16;
    const fw = nrm(sub(cam.look as V, lens)); const rt = nrm(crs(fw, [0, 1, 0])); const up = crs(rt, fw);
    actors.forEach((a, i) => { const v = sub(headPosed(a as never) as V, lens); const z = dot(v, fw); const r = 0.14 * a.spec.height;
      if (Math.abs(dot(v, rt)) + r > z * th || Math.abs(dot(v, up)) + r > z * Math.tan(fov / 2)) add(`s3 two-shot: actor${i} not fully in frame`, t); });
  }
  // speakers face the lens: the officer on his line, Walt on "Leave it", Alvarez in the front shots
  const facing = (a: { p: number[]; yaw: number; pose: { headYaw?: number } }, lim: number, tag: string) => {
    const hd = headPosed(a as never) as V; const fy = a.yaw + ((a.pose.headYaw ?? 0) * Math.PI) / 180; const to = Math.atan2(lens[0] - hd[0], lens[2] - hd[2]);
    const off = Math.abs(Math.atan2(Math.sin(to - fy), Math.cos(to - fy))) * 57.3; if (off > lim) add(`${tag} face ${off.toFixed(0)} deg from the lens`, t);
  };
  if (s.id === 2 && t > T.sir && t < T.crime + 0.4) facing(actors[1], 60, "officer");
  if (s.id === 2 && t > T.smiled + 0.4) facing(actors[0], 55, "Walt");
  if (s.id === 1 && t > 0.7 && t < 3.4) facing(actors[0], 60, "hooded figure");
  if (s.id === 4 && t > T.walt2 + 0.45 && t < T.every2 - 0.2) facing(actors[0], 45, "Walt grinning at the porch cam");
  if (s.id === 7 && t > T.waited + 0.5) {
    facing(actors[1], 55, "Alvarez kneeling");
    // Walt's face (lying, face up) must be in view too: nothing between the lens and his head
    const wh = bodySpheres(actors[0] as never, 0)[0];
    const sph = actors.flatMap((a, i) => bodySpheres(a as never, i)).filter((q) => q !== wh && q.n !== "actor0 head");
    const h = castFirst(lens, nrm(sub(wh.c, lens)), boxes, sph.filter((q) => !q.n.startsWith("actor0")), -99);
    if (h.t < d3(lens, wh.c) - 0.3) add(`Walt's face hidden behind ${h.who} (s7)`, t);
  }
  // the mounting hand must reach the camera's mount point before it is let go
  if (s.id === 3) { const ex3 = s.extra(t); if (ex3.heldCam && t > MAPLE_EVENTS().mount - 0.2) { const d = d3(ex3.heldCam as V, SECCAM as V); if (d > 0.06) add(`s3 hand ${d.toFixed(2)} m from the camera mount`, t); } }
  // IK reach on the flips
  if (s.id === 1) { const fl = flipDebug.s1(t); if (fl.kErr > 0.08) add(`s1 flip IK reach ${fl.kErr.toFixed(2)} m`, t); }
  if (s.id === 4) { const fl = flipDebug.s4(t); if (fl.kErr > 0.08) add(`s4 flip IK reach ${fl.kErr.toFixed(2)} m`, t); }
}
const ks = Object.keys(bad); for (const k of ks) console.log(`${k}: ${bad[k].length} frames [${bad[k][0].toFixed(2)}-${bad[k][bad[k].length - 1].toFixed(2)}]`);
const real = ks.filter((k) => !k.startsWith("INFO")); console.log(real.length ? `${real.length} issue kinds` : `OK: no issues (${ks.length - real.length} info)`);
