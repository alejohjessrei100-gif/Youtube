// Hull lines shared by the drawn vessels and the staging (pure math, no React).
import type { Hull } from "./world";

// ------------------------------------------------------------------ hull lines
export const sheerOf = (h: Hull, u: number) => h.D * (1 + 0.1 * Math.pow(2 * u - 1, 2) * (u > 0.5 ? 1.7 : 1));
export const beamOf = (h: Hull, u: number) => (h.B / 2) * Math.pow(Math.max(0, Math.sin(Math.PI * (0.1 + 0.9 * u))), 0.6);
/** deck height above the keel at station u (0 = stern, 1 = bow) */
export const deckY = (h: Hull, u: number) => sheerOf(h, u) - 0.16 * h.D;
/** station u → local x (bow = +x) */
export const stationX = (h: Hull, u: number) => (u - 0.5) * h.L;
