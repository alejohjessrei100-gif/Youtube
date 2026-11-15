// Clipping check for the poison short: at 6 times in every shot, every person's footprint (a 0.3 m circle) against the
// set's solid footprints and against every other person (centres closer than 0.55 m), plus the floor (feet under a
// raised dais). npx esbuild plan/check_poison.ts --bundle --platform=node --outfile=out/check_poison.js && node out/check_poison.js
import { SHOTS, beatTime } from "../src/poison/shots";
import { EXTRAS } from "../src/poison/extras";
import { SHOT_BEATS } from "../src/poison/timing.gen";
import { OBSTACLES } from "../src/poison/world";
const R = 0.3;
let bad = 0;
SHOTS.forEach((s, k) => {
  const [a, b] = SHOT_BEATS[k];
  for (const u of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const t = beatTime(a) + u * (beatTime(b) - beatTime(a));
    const w = s.world(t, u);
    const A = [...s.actors(t, u), ...(EXTRAS[w.set] ?? [])];
    A.forEach((p, i) => {
      for (const [x0, x1, z0, z1] of OBSTACLES[w.set]) {
        const cx = Math.max(x0, Math.min(x1, p.p[0]));
        const cz = Math.max(z0, Math.min(z1, p.p[2]));
        if (Math.hypot(p.p[0] - cx, p.p[2] - cz) < R) {
          bad++;
          console.log(`shot ${s.id} u=${u}: person ${i} at (${p.p[0]}, ${p.p[2]}) clips box [${x0}, ${x1}] x [${z0}, ${z1}] in ${w.set}`);
          break;
        }
      }
      A.forEach((q, j) => {
        if (j > i && Math.hypot(p.p[0] - q.p[0], p.p[2] - q.p[2]) < 0.55) {
          bad++;
          console.log(`shot ${s.id} u=${u}: people ${i} and ${j} overlap`);
        }
      });
      if (w.set === "throne" && Math.abs(p.p[0]) < 1.2 && p.p[2] > 0.8 && p.p[2] < 2.4 && p.p[1] < 0.15) {
        bad++;
        console.log(`shot ${s.id}: person ${i} stands inside the dais`);
      }
    });
  }
});
console.log(bad ? `${bad} clipping problems` : "no clipping found");
