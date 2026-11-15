// Dump the chosen race's timing and events (for the sound design): node out/squares_events.js > out/squares_events.json
import { simulate } from "../src/squares/sim";
const SEED = Number(process.argv[2] ?? 228);
const FS = Number(process.argv[3] ?? 2.55);
const r = simulate(SEED, 30, FS);
console.log(JSON.stringify({ seed: SEED, finishT: r.finishT, winner: r.winner, order: r.order, frames: r.frames.length, events: r.events.filter((e) => e.kind !== "wall" || e.v > 2.2) }));
