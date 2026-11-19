// Every-frame check for the beat-camera sample: lens vs head / table / crow, sightline to the focus, grip, arm range,
// face toward the lens, and that every camera move LANDS inside the word it is meant for.
import { headPosed, hand } from "../../src/crow/shots";
import { TABLE_HW, TABLE_H, CROW_SPOT } from "../../src/crow/world";
import { cam, crow, focus, MOVES, okafor, SECONDS, WORDS, BALL_END } from "../../src/beat/shots";
type V = [number, number, number];
const d3 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const bad: Record<string, number[]> = {};
const add = (k: string, t: number) => (bad[k] ??= []).push(t);
let prev: V | null = null; let maxSpeed = 0;
for (let f = 0; f < Math.round(SECONDS * 30); f++) {
  const t = f / 30; const c = cam(t); const lens = c.pos as V; const fo = focus(t) as V; const o = okafor(t);
  const hd = headPosed(o) as V;
  if (d3(lens, hd) < 0.5) add("lens within 0.5 m of Okafor's head", t);
  if (Math.abs(lens[0]) < TABLE_HW + 0.05 && Math.abs(lens[2]) < TABLE_HW + 0.05 && lens[1] < TABLE_H + 0.2) add("lens inside / grazing the table", t);
  if (d3(lens, [CROW_SPOT[0], TABLE_H + 0.3, CROW_SPOT[2]]) < 0.45) add("lens too close to the crow", t);
  if (d3(lens, o.ball as V) < 0.3) add("lens too close to the ball", t);
  for (let k = 1; k < 40; k++) { const u = k / 40; const q: V = [lens[0] + (fo[0] - lens[0]) * u, lens[1] + (fo[1] - lens[1]) * u, lens[2] + (fo[2] - lens[2]) * u]; if (d3(fo, hd) > 0.35 && d3(q, hd) < 0.27) { add("Okafor's head blocks the lens -> focus line", t); break; } }
  const h = hand(o.spec, o.p, o.yaw, o.pose, "R");
  if (o.grip > 0.95 && d3(h, o.ball as V) > 0.06) add(`ball ${d3(h, o.ball as V).toFixed(3)} m from the hand while gripped`, t);
  for (const v of [o.pose.armR?.[0], o.pose.armR?.[1], o.pose.armRFwd]) if (v !== undefined && (v < -25 || v > 165)) add("arm angle out of range", t);
  if (t > 4.15) { const fy = o.yaw + ((o.pose.headYaw ?? 0) * Math.PI) / 180; const to = Math.atan2(lens[0] - hd[0], lens[2] - hd[2]); const off = Math.abs(Math.atan2(Math.sin(to - fy), Math.cos(to - fy))) * 180 / Math.PI; if (off > 50) add(`face ${off.toFixed(0)} deg from the lens`, t); }
  if (o.ball[1] < BALL_END[1] - 0.005) add("ball below the board", t);
  void crow(t);
  if (prev) { const s = d3(lens, prev) * 30; maxSpeed = Math.max(maxSpeed, s); } prev = lens;
}
for (const m of MOVES) { const w = WORDS.find((x) => x[0] === m.word)!; if (!(m.land >= w[1] && m.land <= w[2])) add(`move landing ${m.land}s is outside "${m.word}" (${w[1]}-${w[2]})`, m.land); }
const gaps = MOVES.map((m, i) => (i ? (m.land - MOVES[i - 1].land).toFixed(2) : m.land.toFixed(2)));
console.log("landing gaps (s):", gaps.join(", "), "| max lens speed", maxSpeed.toFixed(2), "m/s");
const ks = Object.keys(bad); for (const k of ks) console.log(`${k}: ${bad[k].length} frames [${bad[k][0].toFixed(2)}-${bad[k][bad[k].length - 1].toFixed(2)}]`);
console.log(ks.length ? `${ks.length} issue kinds` : "OK: no issues");
