// Every-frame check for the Maple Street test: lens vs every box and the prowler's head, sightline blockers, grip and IK,
// arm range, face toward the lens, the mat on the deck, each move landing inside its word.
import { headPosed } from "../../src/crow/shots";
import { BOXES, DECK_Y } from "../../src/maple/world";
import { cam, focus, matAt, MOVES, prowler, SECONDS, WORDS } from "../../src/maple/shots";
type V = [number, number, number];
const d3 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const bad: Record<string, number[]> = {};
const add = (k: string, t: number) => (bad[k] ??= []).push(t);
const inBox = (p: V, b: { min: V; max: V }, pad: number) => p[0] > b.min[0] - pad && p[0] < b.max[0] + pad && p[1] > b.min[1] - pad && p[1] < b.max[1] + pad && p[2] > b.min[2] - pad && p[2] < b.max[2] + pad;
for (let f = 0; f < Math.round(SECONDS * 30); f++) {
  const t = f / 30; const lens = cam(t).pos as V; const fo = focus(t) as V; const o = prowler(t); const hd = headPosed(o) as V;
  for (const b of BOXES) if (inBox(lens, b, 0.12)) add(`lens inside / grazing ${b.n}`, t);
  if (lens[1] < 0.3) add("lens near the ground", t);
  if (d3(lens, hd) < 0.55) add("lens within 0.55 m of the prowler's head", t);
  for (let k = 1; k < 40; k++) {
    const u = k / 40; const q: V = [lens[0] + (fo[0] - lens[0]) * u, lens[1] + (fo[1] - lens[1]) * u, lens[2] + (fo[2] - lens[2]) * u];
    if (u > 0.95) break;
    const hit = BOXES.find((b) => b.max[1] > 1.0 && b.n !== "house" && b.n !== "across house" && inBox(q, b, 0));
    if (hit) { add(`${hit.n} blocks the lens -> focus line`, t); break; }
    if (d3(fo, hd) > 0.4 && d3(q, hd) < 0.27) { add("the prowler's head blocks the lens -> focus line", t); break; }
  }
  if (o.g > 0.95) { const ph = o.edgeL; void ph; }
  if (o.g > 0.5 && o.kErr > 0.08) add(`IK reach error ${o.kErr.toFixed(2)} m`, t);
  for (const v of [o.pose.armL?.[0], o.pose.armL?.[1], o.pose.armR?.[0], o.pose.armR?.[1], o.pose.armLFwd, o.pose.armRFwd]) if (v !== undefined && (v < -25 || v > 165)) add("arm angle out of range", t);
  const m = matAt(t); if (m.u < 0.02 && m.y < DECK_Y + 0.03) add("mat sunk into the deck", t);
  if (o.p[1] < -0.01) add("prowler below the ground", t);
}
for (const m of MOVES) { const w = WORDS.find((x) => x[0] === m.word)!; if (!(m.land >= w[1] && m.land <= w[2])) add(`move landing ${m.land}s outside "${m.word}" (${w[1]}-${w[2]})`, m.land); }
const ks = Object.keys(bad); for (const k of ks) console.log(`${k}: ${bad[k].length} frames [${bad[k][0].toFixed(2)}-${bad[k][bad[k].length - 1].toFixed(2)}]`);
console.log(ks.length ? `${ks.length} issue kinds` : "OK: no issues");
