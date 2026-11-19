import { MAPLE_EVENTS, SCENES } from "../../src/maplefilm/shots";
import { SECONDS } from "../../src/maplefilm/words";
// footfalls: each time an actor's walk phase passes a multiple of pi (scene, actor index, time)
const steps: { s: number; i: number; t: number; run: boolean }[] = [];
const dt = 1 / 240;
SCENES.forEach((sc, k) => {
  const t1 = k + 1 < SCENES.length ? SCENES[k + 1].t0 : SECONDS;
  let prev: (number | undefined)[] = [];
  for (let t = sc.t0; t < t1; t += dt) {
    sc.actors(t).forEach((a, i) => {
      const w = a.pose.walk;
      if (w !== undefined && prev[i] !== undefined && Math.floor(w / Math.PI) > Math.floor(prev[i]! / Math.PI)) steps.push({ s: sc.id, i, t: +t.toFixed(3), run: sc.id === 6 || sc.id === 7 });
      prev[i] = w;
    });
  }
});
// mug lands, door opens (from the scene extras)
let mugLand = 0, door = 0;
for (let t = SCENES[5].t0; t < SCENES[6].t0; t += dt) if (!mugLand && (SCENES[5].extra(t).shards ?? 0) > 0) mugLand = +t.toFixed(3);
for (let t = SCENES[6].t0; t < SCENES[7].t0; t += dt) if (!door && (SCENES[6].extra(t).kdoor ?? 0) > 0.02) door = +t.toFixed(3);
console.log(JSON.stringify({ ...MAPLE_EVENTS(), steps, mugLand, door, total: SECONDS }));
