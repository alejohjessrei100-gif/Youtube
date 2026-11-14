// Scan every frame of the Beirut film for NaN / Infinity in cameras, actors and world state.
import { BEATS, shotAt } from "../src/beirut/shots";
import { DURATION, FPS } from "../src/beirut/timing.gen";
const bad = (v: unknown): boolean => (typeof v === "number" ? !Number.isFinite(v) : Array.isArray(v) ? v.some(bad) : v && typeof v === "object" ? Object.values(v as object).some(bad) : false);
let n = 0;
for (let f = 0; f < DURATION; f++) {
  const t = Math.min(f / FPS, DURATION / FPS - 1e-3);
  const { shot, u } = shotAt(t);
  const cam = shot.cam(u);
  const A = shot.actors(t, u);
  const W = shot.world(t, u);
  if (bad(cam) || bad(A.map((a) => [a.p, a.yaw, a.pose])) || bad(W)) {
    if (n++ < 10) console.log("NaN at frame", f, "shot", shot.id);
  }
}
console.log("frames", DURATION, "bad", n, "shots", BEATS.length);
