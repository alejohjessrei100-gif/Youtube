// Automated scene QA for "Same island": runs over the whole film (15 samples per second) and reports every
// placement, collision, framing and camera problem it can prove from the data, before any frame is rendered.
//   npx esbuild plan/check_scene.ts --bundle --platform=node --outfile=out/check_scene.cjs && node out/check_scene.cjs
import { DURATION, FPS } from "../src/plan.gen";
import { BEACH_Z, BOAT, BOAT_SITE, PROPS, SHORE_Z, WRECKS, groundAt, hutDist, onRidge, propDist, seaAt, seaMask } from "../src/island/layout";
import type { Prop } from "../src/island/layout";
import { PLAN, SET, shotAt } from "../src/island/shots";

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
const ASPECT = 9 / 16;
/** project a world point: x, y in -1..1 inside the frame (y up), z > 0 in front of the lens */
const project = (cam: { pos: V3; look: V3; fov: number }, p: V3) => {
  const f = nrm(sub(cam.look, cam.pos));
  const r = nrm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const v = sub(p, cam.pos);
  const z = dot(v, f);
  const th = Math.tan((cam.fov * Math.PI) / 360);
  return { x: dot(v, r) / (z * th * ASPECT), y: dot(v, u) / (z * th), z };
};
const boatSiteProp: Prop = { kind: "log", x: BOAT_SITE.x, z: BOAT_SITE.z, r: BOAT.B, h: 1.1, len: BOAT.L * 2 - BOAT.B * 2, yaw: BOAT_SITE.yaw };
const wreckProps: Prop[] = Object.values(WRECKS).map((w) => ({ kind: "log", x: w.x, z: w.z, r: w.b, h: w.h + 1, len: w.a * 2 - w.b * 2, yaw: w.yaw }));

// ---------------------------------------------------------------- 1. static layout
for (let i = 0; i < PROPS.length; i++) {
  const a = PROPS[i];
  const name = `${a.kind}@(${a.x},${a.z})`;
  // props are placed where the ground is: land or dry beach (never in the sea), not half inside the ridge edge
  if (a.z > SHORE_Z - 0.3 - a.r && !onRidge(a.x, a.z)) flag(`layout: ${name} is in the water`, 0, `z ${a.z} beyond the waterline ${SHORE_Z}`);
  // only grass grows on the ridge slope: anything else there sits high on a steep face and reads as floating
  if (a.kind !== "tussock") {
    const ax = Math.cos(a.yaw ?? 0) * ((a.len ?? 0) / 2 + a.r);
    const az = -Math.sin(a.yaw ?? 0) * ((a.len ?? 0) / 2 + a.r);
    if ([[0, 0], [ax, az], [-ax, -az], [a.r, 0], [-a.r, 0], [0, a.r], [0, -a.r]].some(([dx, dz]) => onRidge(a.x + dx, a.z + dz))) flag(`layout: ${name} is on the ridge slope`, 0, "");
  }
  if (hutDist(a.x, a.z) < a.r + 0.15) flag(`layout: ${name} intersects the hut`, 0, `${hutDist(a.x, a.z).toFixed(2)} m from the hut`);
  for (const wr of wreckProps) if (propDist(wr, a.x, a.z) < a.r + 0.3) flag(`layout: ${name} intersects a wreck`, 0, "");
  for (let j = i + 1; j < PROPS.length; j++) {
    const b = PROPS[j];
    // sample b's footprint center (and ends, if long) against a
    const pts: [number, number][] = [[b.x, b.z]];
    if (b.len) {
      const ax = Math.cos(b.yaw ?? 0);
      const az = -Math.sin(b.yaw ?? 0);
      for (const k of [-0.5, -0.25, 0.25, 0.5]) pts.push([b.x + ax * b.len * k, b.z + az * b.len * k]);
    }
    const d = Math.min(...pts.map(([x, z]) => propDist(a, x, z))) - b.r;
    if (d < 0.05) flag(`layout: ${name} overlaps ${b.kind}@(${b.x},${b.z})`, 0, `${d.toFixed(2)} m`);
  }
  if (a.kind !== "fire" && a.kind !== "sign" && a.kind !== "board" && propDist(boatSiteProp, a.x, a.z) < a.r + 0.2) flag(`layout: ${name} overlaps the boat site`, 0, "");
}
// the sign: nothing within 2.5 m, on flat ground
{
  const s = PROPS.find((p) => p.kind === "sign")!;
  for (const p of PROPS) if (p !== s && Math.hypot(p.x - s.x, p.z - s.z) - p.r < 2.5) flag(`layout: ${p.kind}@(${p.x},${p.z}) is within 2.5 m of the 40 KM sign`, 0, "");
  if (onRidge(s.x, s.z) || s.z > BEACH_Z) flag("layout: the sign is not on flat ground", 0, "");
}
// the sea never rises onto land: sample the whole island and the beach
for (let x = -70; x <= 70; x += 1.25)
  for (let z = -62; z <= SHORE_Z; z += 0.5)
    for (const t of [0, 3.3, 7.1, 12.9, 20.2, 31.7]) {
      const h = seaAt(x, z, t, 3);
      if (h > groundAt(x, z) - 0.001 && z < SHORE_Z - 0.01) flag("sea: water above the land", t, `at (${x}, ${z}) sea ${h.toFixed(2)} ground ${groundAt(x, z).toFixed(2)}`);
    }

// ---------------------------------------------------------------- 2. every sample of the film
const dt = 1 / 15;
let prev: { id: string; pos: V3; dir: V3 } | null = null;
const stats = new Map<string, { vmax: number; wmax: number; n: number }>();
for (let t = 0; t < DURATION / FPS; t += dt) {
  const { shot, S, ts, cam } = shotAt(t);
  const id = shot.id;
  const actors = S.actors(t, ts);
  const world = S.world(t, ts);
  const props = [...PROPS, ...(world.boat === "building" ? [boatSiteProp] : [])];
  // --- actors
  actors.forEach((a, i) => {
    const [x, y, z] = a.p;
    if (!a.afloat) {
      if (Math.abs(y - groundAt(x, z)) > 0.02) flag(`${id}: actor ${i} is not on the ground`, t, `y ${y.toFixed(2)} ground ${groundAt(x, z).toFixed(2)}`);
      if (z > SHORE_Z - 0.2 && !onRidge(x, z)) flag(`${id}: actor ${i} is standing in the sea`, t, `z ${z.toFixed(2)}`);
      if (onRidge(x, z)) flag(`${id}: actor ${i} is on the ridge slope`, t, "");
      if (hutDist(x, z) < 0.45) flag(`${id}: actor ${i} intersects the hut`, t, `${hutDist(x, z).toFixed(2)} m`);
      for (const p of props) {
        const d = propDist(p, x, z);
        if (d < 0.32) flag(`${id}: actor ${i} intersects ${p.kind}@(${p.x},${p.z})`, t, `${d.toFixed(2)} m`);
      }
    } else if (typeof world.boat === "object") {
      // feet above the water around the boat, and inside the hull
      const sea = seaAt(x, z, t, world.swell);
      if (y < sea - 0.25) flag(`${id}: actor ${i} in the boat is under water`, t, `feet ${y.toFixed(2)} sea ${sea.toFixed(2)}`);
    }
    for (let j = i + 1; j < actors.length; j++) {
      const d = Math.hypot(x - actors[j].p[0], z - actors[j].p[2]);
      if (d < 0.6) flag(`${id}: actors ${i} and ${j} intersect`, t, `${d.toFixed(2)} m apart`);
    }
  });
  // --- camera position
  const [cx, cy, cz] = cam.pos;
  const floor = cz > SHORE_Z ? Math.max(0, seaAt(cx, cz, t, world.swell)) + 0.7 : groundAt(cx, cz) + 0.5;
  if (cy < floor) flag(`${id}: camera too close to the ground / water`, t, `y ${cy.toFixed(2)} needs ${floor.toFixed(2)}`);
  if (hutDist(cx, cz) < 0.6 && cy < 4) flag(`${id}: camera inside the hut`, t, "");
  for (const p of [...props, ...wreckProps]) if (propDist(p, cx, cz) < 0.5 && cy < p.h + 0.4) flag(`${id}: camera inside ${p.kind}@(${p.x},${p.z})`, t, "");
  actors.forEach((a, i) => {
    if (Math.hypot(cx - a.p[0], cz - a.p[2]) < 1.3) flag(`${id}: camera closer than 1.3 m to actor ${i}`, t, "");
  });
  // --- framing: the subject stays inside the frame, clear of the caption band when it can be
  const subj = S.subject(t, ts);
  subj.forEach((p, i) => {
    const q = project(cam, p);
    if (q.z <= 0.3 || Math.abs(q.x) > 0.92 || q.y > 0.9 || q.y < -0.75) flag(`${id}: subject point ${i} is out of frame`, t, `x ${q.x.toFixed(2)} y ${q.y.toFixed(2)}`);
  });
  // --- line of sight to the focus point and to every subject point: no prop, hut, hill or actor in the way
  const targets: V3[] = [S.focus(t, ts), ...subj];
  for (const [ti, target] of targets.entries()) {
    const d = sub(target, cam.pos);
    const L = Math.hypot(d[0], d[1], d[2]);
    for (let s = 0.35; s < L - 0.6; s += 0.15) {
      const x = cx + (d[0] * s) / L;
      const y = cy + (d[1] * s) / L;
      const z = cz + (d[2] * s) / L;
      if (y < groundAt(x, z) + 0.05) {
        flag(`${id}: the ground / ridge blocks the view of target ${ti}`, t, `at (${x.toFixed(1)}, ${z.toFixed(1)})`);
        break;
      }
      if (hutDist(x, z) < 0 && y < 3.4) {
        flag(`${id}: the hut blocks the view of target ${ti}`, t, "");
        break;
      }
      // anything standing in the way counts, the boards included (unless the target is that very object)
      const hit = [...props, ...wreckProps].find((p) => Math.hypot(target[0] - p.x, target[2] - p.z) > Math.max(2, (p.len ?? 0) / 2 + 1) && propDist(p, x, z) < 0.25 && y < p.h + 0.15);
      if (hit) {
        flag(`${id}: ${hit.kind}@(${hit.x},${hit.z}) blocks the view of target ${ti}`, t, "");
        break;
      }
      const who = actors.findIndex((a) => Math.hypot(x - a.p[0], z - a.p[2]) < 0.28 && y > a.p[1] && y < a.p[1] + 1.8 && Math.hypot(target[0] - a.p[0], target[2] - a.p[2]) > 0.5);
      if (who >= 0 && ti === 0) {
        flag(`${id}: actor ${who} stands between the lens and the focus point`, t, "");
        break;
      }
    }
  }
  // --- camera motion: smooth and slow (no jumps inside a setup)
  const dir = nrm(sub(cam.look, cam.pos));
  if (prev && prev.id === id) {
    const v = Math.hypot(...sub(cam.pos, prev.pos)) / dt;
    const wdeg = (Math.acos(Math.min(1, dot(dir, prev.dir))) * 180) / Math.PI / dt;
    const st = stats.get(id) ?? { vmax: 0, wmax: 0, n: 0 };
    st.vmax = Math.max(st.vmax, v);
    st.wmax = Math.max(st.wmax, wdeg);
    st.n++;
    stats.set(id, st);
    if (wdeg > 12) flag(`${id}: the camera turns faster than 12°/s`, t, `${wdeg.toFixed(1)}°/s`);
    if (v > 3.2) flag(`${id}: the camera travels faster than 3.2 m/s`, t, `${v.toFixed(1)} m/s`);
  }
  prev = { id, pos: cam.pos, dir };
}

console.log("setup   time          camera max speed / turn    about");
for (const s of PLAN) {
  const st = stats.get(s.id);
  console.log(`${s.id.padEnd(6)} ${s.t.toFixed(2).padStart(5)}-${s.end.toFixed(2).padStart(5)}   ${st ? `${st.vmax.toFixed(2)} m/s, ${st.wmax.toFixed(1)}°/s` : "-"}`.padEnd(48) + SET[s.id].about);
}
if (issues.size === 0) console.log("\nOK: no issues found");
else {
  console.log(`\n${issues.size} ISSUES`);
  for (const [k, v] of issues) console.log(` - ${k}  [first at ${v.first.toFixed(2)} s, ${v.n} samples] ${v.detail}`);
  process.exitCode = 1;
}
void seaMask;
