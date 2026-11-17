// Acting toolkit: keyframed tracks with animation easings (anticipation and overshoot), walk segments whose stride
// lands the feet together when the walk ends, squash-and-stretch about the feet, a look-at for the head, and
// blending between keyed arms and arms solved to a target (core/ik.ts). Everything is a pure function of t.
import { WALK } from "../char/family";
import type { V3 } from "../types";

export type Ease = "linear" | "in" | "out" | "inout" | "back" | "backIn" | "hold";
/** a key: [time, value, ease used to arrive at this key from the previous one] */
export type K<T> = [number, T, Ease?];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (e: Ease | undefined, u: number) => {
  const x = clamp(u);
  switch (e) {
    case "linear":
      return x;
    case "in":
      return x * x * x;
    case "out":
      return 1 - Math.pow(1 - x, 3);
    case "back": {
      // arrives past the target and settles back (overshoot)
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    case "backIn": {
      // pulls back first, then goes (anticipation)
      const c1 = 1.70158;
      return (c1 + 1) * x * x * x - c1 * x * x;
    }
    case "hold":
      return x < 1 ? 0 : 1;
    case "inout":
    default:
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
};
/** sample a number track */
export const track = (keys: K<number>[], t: number): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t < t1) {
      const [t0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * ease(e, (t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
};
/** sample a vector track (arm angle pairs, positions) */
export const trackV = <T extends number[]>(keys: K<T>[], t: number): T => {
  if (t <= keys[0][0]) return [...keys[0][1]] as T;
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t < t1) {
      const [t0, v0] = keys[i - 1];
      const u = ease(e, (t - t0) / (t1 - t0));
      return v0.map((a, j) => a + (v1[j] - a) * u) as T;
    }
  }
  return [...keys[keys.length - 1][1]] as T;
};
/** a discrete track (faces, modes): the value of the last key at or before t */
export const step = <T,>(keys: [number, T][], t: number): T => {
  let v = keys[0][1];
  for (const [k, x] of keys) if (t >= k) v = x;
  return v;
};

// ------------------------------------------------------------------ walking
export type WalkSeg = { t0: number; t1: number; from: V3; to: V3; ease?: Ease };
/** the stride of the family's walk: one half cycle (π of phase) moves a foot 2 × stride × height (≈ 0.38 m at 1.74 m),
 * so the root must advance that far per π or the feet slide */
export const HALF_STEP = 2 * WALK.stride * 1.74;
/** where the root is at t, and the walk phase (undefined when standing). The step count of each segment is rounded so
 * the phase ends on a whole half cycle: the feet are together when the walk stops (no pop). */
export const walkAt = (segs: WalkSeg[], rest: V3, t: number, height = 1.74): { p: V3; walk?: number } => {
  let p = rest;
  for (const s of segs) {
    if (t < s.t0) break;
    const D = Math.hypot(s.to[0] - s.from[0], s.to[2] - s.from[2]);
    const u = ease(s.ease ?? "linear", (t - s.t0) / (s.t1 - s.t0));
    p = [s.from[0] + (s.to[0] - s.from[0]) * u, s.from[1] + (s.to[1] - s.from[1]) * u, s.from[2] + (s.to[2] - s.from[2]) * u];
    if (t < s.t1) {
      const n = Math.max(1, Math.round(D / (HALF_STEP * (height / 1.74))));
      return { p, walk: Math.PI * n * u };
    }
  }
  return { p };
};
/** the times the feet touch down in a set of walk segments (for footstep sounds) */
export const footfalls = (segs: WalkSeg[], height = 1.74): number[] => {
  const out: number[] = [];
  for (const s of segs) {
    const D = Math.hypot(s.to[0] - s.from[0], s.to[2] - s.from[2]);
    const n = Math.max(1, Math.round(D / (HALF_STEP * (height / 1.74))));
    // phase hits k·π at u = k / n: invert the segment's easing numerically
    for (let k = 1; k <= n; k++) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (ease(s.ease ?? "linear", mid) < k / n) lo = mid;
        else hi = mid;
      }
      out.push(s.t0 + lo * (s.t1 - s.t0));
    }
  }
  return out;
};

// ------------------------------------------------------------------ squash and stretch, look-at, blending
/** squash-and-stretch scale about the feet that keeps the volume (sy · sx · sz ≈ 1) */
export const squash = (sy: number): V3 => {
  const s = 1 / Math.sqrt(Math.max(0.5, sy));
  return [s, sy, s];
};
/** head yaw / nod (degrees) to look from a head position at a point, relative to a body yaw, clamped like a neck */
export const lookAt = (head: V3, target: V3, bodyYaw: number, maxYaw = 55, maxNod = 35) => {
  const dx = target[0] - head[0];
  const dy = target[1] - head[1];
  const dz = target[2] - head[2];
  const want = Math.atan2(dx, dz);
  let rel = want - bodyYaw;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  const yaw = clamp((rel * 180) / Math.PI, -maxYaw, maxYaw);
  const nod = clamp((-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI, -maxNod, maxNod);
  return { yaw, nod };
};
export const mixArm = (a: [number, number], b: [number, number], u: number): [number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** a 0..1 window: ramps up over [a, a + ra], holds, ramps down over [b - rb, b] */
export const window01 = (t: number, a: number, b: number, ra = 0.15, rb = 0.15) => clamp((t - a) / ra) * clamp((b - t) / rb);
