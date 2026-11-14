// Automated scene QA for "Same island": samples the whole film 15 times a second and reports every placement,
// collision, framing and camera problem it can prove from the data, before any frame is rendered.
//   npx esbuild plan/check_scene.ts --bundle --platform=node --outfile=out/check_scene.cjs && node out/check_scene.cjs
import { DURATION, FPS } from "../src/plan.gen";
import { PLAN, SET, shotAt } from "../src/film/shots";
import { BOAT_SITE, NINETEEN, PROPS, SHIPS, TREES, WRECK_G, WRECK_I, groundAt, hutDist, inland, propDist, seaAt } from "../src/film/world";
import type { Prop, SetId } from "../src/film/world";
import type { WorldState } from "../src/film/state";

type V3 = [number, number, number];
const issues = new Map<string, { n: number; first: number; detail: string }>();
const flag = (key: string, t: number, detail: string) => {
  const e = issues.get(key);
  if (e) e.n++;
  else issues.set(key, { n: 1, first: t, detail });
};
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const project = (cam: { pos: V3; look: V3; fov: number; roll?: number }, p: V3) => {
  const f = nrm(sub(cam.look, cam.pos));
  let r = nrm(cross(f, [0, 1, 0]));
  let u = cross(r, f);
  const th0 = ((cam.roll ?? 0) * Math.PI) / 180;
  if (th0) {
    const fu = cross(f, u);
    const fr = cross(f, r);
    u = [u[0] * Math.cos(th0) + fu[0] * Math.sin(th0), u[1] * Math.cos(th0) + fu[1] * Math.sin(th0), u[2] * Math.cos(th0) + fu[2] * Math.sin(th0)];
    r = [r[0] * Math.cos(th0) + fr[0] * Math.sin(th0), r[1] * Math.cos(th0) + fr[1] * Math.sin(th0), r[2] * Math.cos(th0) + fr[2] * Math.sin(th0)];
  }
  const v = sub(p, cam.pos);
  const z = dot(v, f);
  const th = Math.tan((cam.fov * Math.PI) / 360);
  return { x: dot(v, r) / (z * th * (9 / 16)), y: dot(v, u) / (z * th), z };
};
const hullProp = (set: SetId, p: { x: number; z: number; yaw: number }, h: { L: number; B: number; D: number }): Prop => ({ kind: "rock", set, x: p.x, z: p.z, r: h.B / 2, h: h.D + 1.5, len: h.L - h.B, yaw: p.yaw });
const WRECKS: Prop[] = [hullProp("G", WRECK_G, SHIPS.grafton), hullProp("I", WRECK_I, SHIPS.invercauld)];
const BOAT_PROP: Prop = hullProp("G", BOAT_SITE, SHIPS.boat);
/** the props that exist in this frame */
const active = (s: WorldState): Prop[] => {
  const hut = s.hut ?? -1;
  const out = PROPS.filter((p) => p.set === s.set).filter((p) => (p.set === "I" || p.kind === "rock" ? true : p.kind === "fire" ? (s.fire ?? 0) > 0 : p.kind === "spars" ? hut >= 0 && hut < 0.3 : p.kind === "woodpile" || p.kind === "tally" ? hut >= 1 : hut >= 0));
  if (s.set === "G" && typeof s.boat === "object" && "built" in s.boat) out.push(BOAT_PROP);
  if (s.set === "G" && s.grafton === "wreck") out.push(WRECKS[0]);
  if (s.set === "I" && s.invercauld === "wreck") out.push(WRECKS[1]);
  return out;
};

// ---------------------------------------------------------------- 1. static layout
for (const set of ["G", "I"] as SetId[]) {
  const ps = PROPS.filter((p) => p.set === set);
  ps.forEach((a, i) => {
    const name = `${set}:${a.kind}@(${a.x},${a.z})`;
    if (groundAt(set, a.x, a.z) < 0.03) flag(`layout: ${name} is in the sea`, 0, "");
    if (set === "G" && hutDist(a.x, a.z) < a.r + 0.15) flag(`layout: ${name} intersects the hut`, 0, "");
    for (const wr of WRECKS) if (wr.set === set && propDist(wr, a.x, a.z) < a.r + 0.25) flag(`layout: ${name} intersects a wreck`, 0, "");
    if (set === "G" && a.kind !== "fire" && propDist(BOAT_PROP, a.x, a.z) < a.r + 0.25) flag(`layout: ${name} overlaps the boat site`, 0, "");
    ps.slice(i + 1).forEach((b) => {
      const pts: [number, number][] = [[b.x, b.z]];
      if (b.len) for (const k of [-0.5, -0.25, 0.25, 0.5]) pts.push([b.x + Math.cos(b.yaw ?? 0) * b.len * k, b.z - Math.sin(b.yaw ?? 0) * b.len * k]);
      const d = Math.min(...pts.map(([x, z]) => propDist(a, x, z))) - b.r;
      if (d < 0.05) flag(`layout: ${name} overlaps ${b.kind}@(${b.x},${b.z})`, 0, `${d.toFixed(2)} m`);
    });
    if (set === "G") for (const tr of TREES) if (Math.hypot(tr.x - a.x, tr.z - a.z) < a.r + 1.2) flag(`layout: ${name} is inside a tree`, 0, "");
  });
  // water never shows on land: wherever the ground is within 0.35 m of sea level or above it, the sea is exactly flat
  for (let x = -70; x <= 70; x += 1.3)
    for (let z = -60; z <= 30; z += 0.45) {
      const g = groundAt(set, x, z);
      if (g < -0.35) continue;
      for (const t of [0, 3.3, 7.1, 12.9, 20.2, 31.7]) if (seaAt(set, x, z, t, 3.4) !== 0) flag(`sea: waves reach the shore in set ${set}`, t, `at (${x.toFixed(1)}, ${z.toFixed(1)}) ground ${g.toFixed(2)}`);
    }
}
if (NINETEEN.length !== 19) flag(`layout: ${NINETEEN.length} places for the nineteen`, 0, "");
if (TREES.some((tr) => hutDist(tr.x, tr.z) < 3)) flag("layout: a tree stands in the hut", 0, "");

// ---------------------------------------------------------------- 2. every sample of the film
const dt = 1 / 15;
let prev: { id: string; pos: V3; dir: V3 } | null = null;
const stats = new Map<string, { vmax: number; wmax: number }>();
for (let t = 0; t < DURATION / FPS; t += dt) {
  const { shot, S, ts, cam } = shotAt(t);
  const id = shot.id;
  const actors = S.actors(t, ts);
  const world = S.world(t, ts);
  const set = world.set;
  const props = active(world);
  const map = set === "MAP";
  if (!map) {
    // --- actors (a prone man is a body 1.7 m long ahead of his feet)
    const bodies = actors.map((a) => {
      const pts: [number, number][] = [[a.p[0], a.p[2]]];
      if (a.prone) for (const k of [0.6, 1.2, 1.7]) pts.push([a.p[0] + Math.sin(a.yaw) * k, a.p[2] + Math.cos(a.yaw) * k]);
      return pts;
    });
    actors.forEach((a, i) => {
      const [x, y, z] = a.p;
      if (!a.afloat) {
        const g = groundAt(set, x, z);
        if (Math.abs(y - g) > 0.02) flag(`${id}: actor ${i} is not on the ground`, t, `y ${y.toFixed(2)} ground ${g.toFixed(2)}`);
        for (const [bx, bz] of bodies[i]) {
          if (groundAt(set, bx, bz) < 0.04) flag(`${id}: actor ${i} is in the sea`, t, `at (${bx.toFixed(1)}, ${bz.toFixed(1)})`);
          if (set === "I" && inland("I", bx, bz) > 6.6) flag(`${id}: actor ${i} is inside the cliff`, t, "");
          if (set === "G" && (world.hut ?? -1) >= 0 && hutDist(bx, bz) < 0.45) flag(`${id}: actor ${i} intersects the hut`, t, `${hutDist(bx, bz).toFixed(2)} m`);
          if (set === "G") for (const tr of TREES) if (Math.hypot(tr.x - bx, tr.z - bz) < 1.2) flag(`${id}: actor ${i} is inside a tree`, t, "");
          for (const p of props) if (propDist(p, bx, bz) < 0.3) flag(`${id}: actor ${i} intersects ${p.kind}@(${p.x},${p.z})`, t, `${propDist(p, bx, bz).toFixed(2)} m`);
        }
      } else if (y < seaAt(set, x, z, t, world.swell) - 0.6) flag(`${id}: actor ${i} aboard is under water`, t, "");
      for (let j = i + 1; j < actors.length; j++) {
        let d = Infinity;
        for (const p of bodies[i]) for (const q of bodies[j]) d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1]));
        if (d < 0.6) flag(`${id}: actors ${i} and ${j} intersect`, t, `${d.toFixed(2)} m apart`);
      }
    });
    // --- camera position
    const [cx, cy, cz] = cam.pos;
    const g = groundAt(set, cx, cz);
    const floor = g > -0.2 ? g + 0.4 : seaAt(set, cx, cz, t, world.swell) + 0.7;
    if (cy < floor) flag(`${id}: camera too close to the ground / water`, t, `y ${cy.toFixed(2)} needs ${floor.toFixed(2)}`);
    if (set === "G" && (world.hut ?? -1) >= 0 && hutDist(cx, cz) < 0.6 && cy < 4) flag(`${id}: camera inside the hut`, t, "");
    if (set === "G") for (const tr of TREES) if (Math.hypot(tr.x - cx, tr.z - cz) < 2.6 * tr.s && cy < groundAt("G", tr.x, tr.z) + 5.5 * tr.s) flag(`${id}: camera inside a tree`, t, "");
    for (const p of props) if (propDist(p, cx, cz) < 0.5 && cy < groundAt(set, p.x, p.z) + p.h + 0.4) flag(`${id}: camera inside ${p.kind}@(${p.x},${p.z})`, t, "");
    actors.forEach((a, i) => {
      if (Math.hypot(cx - a.p[0], cy - a.p[1] - 1.4, cz - a.p[2]) < 1.2) flag(`${id}: camera closer than 1.2 m to actor ${i}`, t, "");
    });
  }
  // --- framing: the subject stays inside the frame
  const subj = S.subject(t, ts);
  subj.forEach((p, i) => {
    const q = project(cam, p);
    if (q.z <= 0.3 || Math.abs(q.x) > 0.9 || q.y > 0.92 || q.y < -0.8) flag(`${id}: subject point ${i} is out of frame`, t, `x ${q.x.toFixed(2)} y ${q.y.toFixed(2)}`);
  });
  // --- line of sight to the focus and the subject: no terrain, hut, prop, wreck, tree or actor in the way
  if (!map) {
    const targets: V3[] = [S.focus(t, ts), ...subj];
    for (const [ti, target] of targets.entries()) {
      const d = sub(target, cam.pos);
      const L = Math.hypot(d[0], d[1], d[2]);
      for (let s = 0.4; s < L - 0.7; s += 0.2) {
        const x = cam.pos[0] + (d[0] * s) / L;
        const y = cam.pos[1] + (d[1] * s) / L;
        const z = cam.pos[2] + (d[2] * s) / L;
        if (y < groundAt(set, x, z) + 0.05) {
          flag(`${id}: the terrain blocks the view of target ${ti}`, t, `at (${x.toFixed(1)}, ${z.toFixed(1)})`);
          break;
        }
        if (set === "G" && (world.hut ?? -1) > 0.3 && hutDist(x, z) < 0 && y < groundAt("G", -7, -15) + 3.4 && hutDist(target[0], target[2]) > 0.5) {
          flag(`${id}: the hut blocks the view of target ${ti}`, t, "");
          break;
        }
        const hit = props.find((p) => Math.hypot(target[0] - p.x, target[2] - p.z) > Math.max(2, (p.len ?? 0) / 2 + 2.5) && propDist(p, x, z) < 0.2 && y < groundAt(set, p.x, p.z) + p.h + 0.1);
        if (hit) {
          flag(`${id}: ${hit.kind}@(${hit.x},${hit.z}) blocks the view of target ${ti}`, t, "");
          break;
        }
        if (set === "G" && TREES.some((tr) => Math.hypot(tr.x - x, tr.z - z) < 2.2 * tr.s && y < groundAt("G", tr.x, tr.z) + 5 * tr.s && Math.hypot(tr.x - target[0], tr.z - target[2]) > 6)) {
          flag(`${id}: a tree blocks the view of target ${ti}`, t, "");
          break;
        }
        const who = actors.findIndex((a) => !a.prone && Math.hypot(x - a.p[0], z - a.p[2]) < 0.3 && y > a.p[1] && y < a.p[1] + 1.8 && Math.hypot(target[0] - a.p[0], target[2] - a.p[2]) > 0.6);
        if (who >= 0 && ti === 0) {
          flag(`${id}: actor ${who} stands between the lens and the focus point`, t, "");
          break;
        }
      }
    }
  }
  const dir = nrm(sub(cam.look, cam.pos));
  if (prev && prev.id === id) {
    const v = Math.hypot(...sub(cam.pos, prev.pos)) / dt;
    const wdeg = (Math.acos(Math.min(1, dot(dir, prev.dir))) * 180) / Math.PI / dt;
    const st = stats.get(id) ?? { vmax: 0, wmax: 0 };
    st.vmax = Math.max(st.vmax, v);
    st.wmax = Math.max(st.wmax, wdeg);
    stats.set(id, st);
    if (wdeg > 45) flag(`${id}: the camera turns faster than 45°/s`, t, `${wdeg.toFixed(0)}°/s`);
  }
  prev = { id, pos: cam.pos, dir };
}
const dur = PLAN.map((s) => s.end - s.t);
console.log(`${PLAN.length} beats, ${((60 * PLAN.length) / (DURATION / FPS)).toFixed(0)} per minute, mean ${(dur.reduce((a, b) => a + b) / dur.length).toFixed(2)} s`);
for (const s of PLAN) {
  const st = stats.get(s.id);
  console.log(`${s.id} ${s.t.toFixed(2).padStart(5)}-${s.end.toFixed(2).padStart(5)} ${(st ? `${st.vmax.toFixed(1)} m/s ${st.wmax.toFixed(0)}°/s` : "-").padEnd(16)} ${SET[s.id].about.slice(0, 96)}`);
}
if (issues.size === 0) console.log("\nOK: no issues found");
else {
  console.log(`\n${issues.size} ISSUES`);
  for (const [k, v] of issues) console.log(` - ${k}  [first at ${v.first.toFixed(2)} s, ${v.n} samples] ${v.detail}`);
  process.exitCode = 1;
}
