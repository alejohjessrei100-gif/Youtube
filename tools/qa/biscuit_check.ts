// Every-frame geometry QA for the Biscuit short: blocked sightlines (lens -> focus subject) by lampposts, the blue
// mailbox and other characters; the lens inside anything; characters / the dog overlapping each other, the mailbox or
// the fences. Prints problems grouped into time ranges.
import { headOf } from "../../src/inkbeat/char/Character3D";
import { SCENES } from "../../src/biscuit/shots";
import { MAILBOX, POLES as POLES_W, SZ } from "../../src/biscuit/world";
import { SECONDS } from "../../src/biscuit/words.gen";

type V = [number, number, number];
const POLES: V[] = POLES_W.map((p) => p.p as V);
const segPointDist2D = (a: V, b: V, p: V) => {
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const L = dx * dx + dz * dz || 1e-9;
  const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[2] - a[2]) * dz) / L));
  return { d: Math.hypot(a[0] + dx * u - p[0], a[2] + dz * u - p[2]), u, y: a[1] + (b[1] - a[1]) * u };
};
const issues: Record<string, number[]> = {};
const add = (k: string, t: number) => (issues[k] ??= []).push(t);
for (let f = 0; f < Math.round(SECONDS * 30); f++) {
  const t = f / 30;
  let s = SCENES[0];
  for (const x of SCENES) if (t >= x.t0) s = x;
  if (s.id === 2) continue; // the overhead map
  const cam = s.cam(t);
  const focus = s.focus(t) as V;
  const actors = s.actors(t);
  const dog = s.dog?.(t) ?? null;
  // bodies: characters as vertical capsules (r 0.22, up to their height), the dog as a box-ish blob
  const bodies: { name: string; p: V; r: number; h: number }[] = actors.map((a, i) => ({ name: `actor${i}`, p: a.p as V, r: 0.22, h: a.spec.height }));
  if (dog) bodies.push({ name: "dog", p: [dog.p[0] + Math.sin(dog.yaw) * 0.1, 0, dog.p[2] + Math.cos(dog.yaw) * 0.1], r: 0.33, h: 1.0 });
  // 1. sightline lens -> focus
  for (const p of POLES) {
    const r = segPointDist2D(cam.pos as V, focus, p);
    if (r.d < 0.14 && r.u > 0.02 && r.u < 0.98 && r.y < 4.2) add(`lens->subject blocked by the lamppost at ${p[0]},${p[2]}`, t);
  }
  {
    const r = segPointDist2D(cam.pos as V, focus, MAILBOX as V);
    if (r.d < 0.3 && r.u < 0.95 && r.y < 1.35) add("lens->subject blocked by the mailbox", t);
  }
  for (const b of bodies) {
    const r = segPointDist2D(cam.pos as V, focus, b.p);
    const focusIsThis = Math.hypot(focus[0] - b.p[0], focus[2] - b.p[2]) < b.r + 0.35;
    if (!focusIsThis && r.d < b.r * 0.8 && r.u > 0.05 && r.u < 0.9 && r.y < b.h) add(`lens->subject blocked by ${b.name}`, t);
  }
  // 2. the lens inside something
  for (const p of POLES) if (Math.hypot(cam.pos[0] - p[0], cam.pos[2] - p[2]) < 0.3 && cam.pos[1] < 4.3) add("lens inside a lamppost", t);
  for (const b of bodies) if (Math.hypot(cam.pos[0] - b.p[0], cam.pos[2] - b.p[2]) < b.r + 0.12 && cam.pos[1] < b.h + 0.1) add(`lens inside ${b.name}`, t);
  for (const b of bodies) {
    const cy = b.name === "dog" ? 0.65 : b.h * 0.6;
    const d3 = Math.hypot(cam.pos[0] - b.p[0], cam.pos[1] - cy, cam.pos[2] - b.p[2]);
    if (d3 < 1.1) add(`lens very close (${d3.toFixed(2)} m) to ${b.name}`, t);
  }
  if (Math.abs(cam.pos[0] - MAILBOX[0]) < 0.4 && Math.abs(cam.pos[2] - MAILBOX[2]) < 0.38 && cam.pos[1] < 1.4) add("lens inside the mailbox", t);
  if (cam.pos[2] > SZ + 0.55 && cam.pos[1] < 1.0) add("lens behind the fence line, low", t);
  // 3. overlaps
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      if (Math.hypot(a.p[0] - b.p[0], a.p[2] - b.p[2]) < (a.r + b.r) * 1.05) add(`${a.name} overlaps ${b.name}`, t);
    }
  for (const b of bodies) {
    if (Math.abs(b.p[0] - MAILBOX[0]) < 0.27 + b.r * 0.8 && Math.abs(b.p[2] - MAILBOX[2]) < 0.25 + b.r * 0.8) add(`${b.name} inside the mailbox`, t);
    if (b.p[2] > SZ + 0.6 - b.r * 0.5 && b.p[2] < SZ + 0.6 + b.r * 0.5) add(`${b.name} in the fence line`, t);
    for (const p of POLES) if (Math.hypot(b.p[0] - p[0], b.p[2] - p[2]) < b.r + 0.08) add(`${b.name} inside a lamppost`, t);
  }
}
const ranges = (ts: number[]) => {
  const out: string[] = [];
  let a = ts[0], b = ts[0];
  for (const t of ts.slice(1)) {
    if (t - b > 0.05) {
      out.push(`${a.toFixed(2)}-${b.toFixed(2)}`);
      a = t;
    }
    b = t;
  }
  out.push(`${a.toFixed(2)}-${b.toFixed(2)}`);
  return out.join(", ");
};
const keys = Object.keys(issues);
console.log(keys.length ? keys.map((k) => `${k}: ${ranges(issues[k])}`).join("\n") : "OK: no blocked sightlines, no lens inside geometry, no overlaps");
void headOf;
