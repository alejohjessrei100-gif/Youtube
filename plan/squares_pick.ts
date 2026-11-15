// Find the most watchable race: simulate many seeds, score each (lead changes, eliminations, a close finish, ~30 s).
// npx esbuild plan/squares_pick.ts --bundle --platform=node --outfile=out/squares_pick.js && node out/squares_pick.js 3000
import { drama, simulate } from "../src/squares/sim";
import { TEAMS } from "../src/squares/teams";
const N = Number(process.argv[2] ?? 2000);
const fs = [2.45, 2.55, 2.65];
const res: { seed: number; fsp: number; d: ReturnType<typeof drama>; win: string }[] = [];
for (let s = 1; s <= N; s++) for (const f of fs) {
  const r = simulate(s, 30, f);
  const d = drama(r);
  if (d.score > -1) res.push({ seed: s, fsp: f, d, win: r.winner >= 0 ? TEAMS[r.winner].code : "-" });
}
res.sort((a, b) => b.d.score - a.d.score);
console.log("valid", res.length, "of", N * fs.length);
for (const r of res.slice(0, 12)) console.log(r.seed, r.fsp, r.win, JSON.stringify(r.d));
const wins: Record<string, number> = {};
for (const r of res) wins[r.win] = (wins[r.win] ?? 0) + 1;
console.log("wins by team across valid races", wins);
