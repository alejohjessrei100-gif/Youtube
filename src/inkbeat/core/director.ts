// The director: a camera that frames whatever matters right now. Each subject (a character, a thrown coin, a door)
// has a position and an importance weight over time. At every moment the camera frames the weighted center of
// attention and pulls back or pushes in so every subject that matters fits the frame (with a minimum size so a
// small object never fills the screen). It looks slightly ahead in time (anticipation) and its motion is a smoothed
// average over a short window, so it glides, leads action, and holds still when nothing changes. Pure function of t.
import type { V3 } from "../types";
import type { Cam } from "./rig";

export type Subject = {
  /** the point to frame at time t (a character's chest, an object's center) */
  p: (t: number) => V3;
  /** how much space it needs around that point (m): a standing person ≈ 1.0, a small prop ≈ 0.35 */
  r: number;
  /** importance 0..1 at time t: 0 = ignore, 1 = must be in frame and pull the center */
  w: (t: number) => number;
};
export type Style = {
  /** the orbit angle around the subject (rad, 0 = the camera sits on +z looking toward -z) */
  az: (t: number) => number;
  /** the elevation of the lens above the center (rad) */
  el: (t: number) => number;
  fov: number;
  /** extra breathing room (1 = tight fit) */
  room?: (t: number) => number;
  /** the smallest framed radius (m), so a coin alone never fills the frame */
  minR?: number;
  /** where the center of attention sits vertically (fraction from the top of the frame; 0.42 keeps faces above the captions) */
  face?: number;
  /** how far ahead the camera anticipates (s) and how long its smoothing window is (s) */
  lead?: number;
  window?: number;
};

const D2R = Math.PI / 180;
/** the raw framing for one instant: center, radius */
const frameAt = (subjects: Subject[], t: number, minR: number) => {
  let sw = 0;
  const c: V3 = [0, 0, 0];
  for (const s of subjects) {
    const w = Math.max(0, s.w(t));
    if (w < 1e-3) continue;
    const p = s.p(t);
    c[0] += p[0] * w;
    c[1] += p[1] * w;
    c[2] += p[2] * w;
    sw += w;
  }
  if (sw < 1e-6) return { c: subjects[0].p(t), R: minR };
  c[0] /= sw;
  c[1] /= sw;
  c[2] /= sw;
  // the radius that holds every subject that matters, each in proportion to its importance
  let R = minR;
  for (const s of subjects) {
    const w = Math.max(0, Math.min(1, s.w(t)));
    if (w < 1e-3) continue;
    const p = s.p(t);
    const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
    R = Math.max(R, (d + s.r) * (0.35 + 0.65 * w));
  }
  return { c, R };
};

export const direct = (subjects: Subject[], style: Style, t: number): Cam => {
  const minR = style.minR ?? 0.8;
  const lead = style.lead ?? 0.18;
  const win = style.window ?? 0.7;
  // a smoothed, slightly look-ahead average of the raw framing (a Gaussian over [t - win, t + lead·2])
  const N = 15;
  const acc = { c: [0, 0, 0] as V3, R: 0, ws: 0 };
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const ts = Math.max(0, t - win + u * (win + lead * 2));
    const center = t + lead;
    const g = Math.exp(-((ts - center) ** 2) / (2 * (win / 2.6) ** 2));
    const f = frameAt(subjects, ts, minR);
    acc.c[0] += f.c[0] * g;
    acc.c[1] += f.c[1] * g;
    acc.c[2] += f.c[2] * g;
    acc.R += f.R * g;
    acc.ws += g;
  }
  const c: V3 = [acc.c[0] / acc.ws, acc.c[1] / acc.ws, acc.c[2] / acc.ws];
  const R = (acc.R / acc.ws) * (style.room?.(t) ?? 1.15);
  // a vertical 9:16 frame is narrower than it is tall: fit the radius into the horizontal half-angle
  const half = Math.atan(Math.tan((style.fov * D2R) / 2) * (9 / 16));
  const dist = R / Math.tan(half);
  const az = style.az(t);
  const el = style.el(t);
  const pos: V3 = [c[0] + Math.sin(az) * Math.cos(el) * dist, c[1] + Math.sin(el) * dist, c[2] + Math.cos(az) * Math.cos(el) * dist];
  // composition: put the center of attention at `face` from the top (aim a little below it)
  const face = style.face ?? 0.42;
  const drop = Math.tan(((0.5 - face) * style.fov * D2R)) * dist;
  return { pos, look: [c[0], c[1] - drop, c[2]], fov: style.fov, roll: 0 };
};
