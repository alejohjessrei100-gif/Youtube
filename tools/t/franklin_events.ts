import { FRANKLIN_EVENTS, SCENES } from "../../src/franklin/shots";
import { SECONDS } from "../../src/franklin/words";
// footfalls: each time an actor's walk phase passes a multiple of pi (scene, actor index, time)
const steps: { s: number; i: number; t: number; run: boolean }[] = [];
const dt = 1 / 240;
SCENES.forEach((sc, k) => {
  const t1 = k + 1 < SCENES.length ? SCENES[k + 1].t0 : SECONDS;
  let prev: (number | undefined)[] = [];
  for (let t = sc.t0; t < t1; t += dt) {
    sc.actors(t).forEach((a, i) => {
      const w = a.pose.walk;
      if (w !== undefined && prev[i] !== undefined && Math.floor(w / Math.PI) > Math.floor(prev[i]! / Math.PI)) steps.push({ s: sc.id, i, t: +t.toFixed(3), run: (sc.id === 1 && t > 8.3) || sc.id === 2 });
      prev[i] = w;
    });
  }
});
console.log(JSON.stringify({ ...FRANKLIN_EVENTS(), steps, total: SECONDS }));

