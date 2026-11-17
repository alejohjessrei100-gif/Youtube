import { SETUPS } from "../../src/peigneur/shots";
import { SECONDS } from "../../src/peigneur/words.gen";
const out: number[] = [];
SETUPS.forEach((s, i) => {
  const end = i + 1 < SETUPS.length ? SETUPS[i + 1].t0 : SECONDS;
  out.push(Math.round(((s.t0 + end) / 2) * 30));
  console.error(s.id, s.t0.toFixed(2), end.toFixed(2), (end - s.t0).toFixed(2));
});
console.log(out.join(" "));
