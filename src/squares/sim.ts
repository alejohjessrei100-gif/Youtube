// The race simulation: deterministic (seeded) 2D physics at 120 steps/s. Squares steer gently along the BFS flow field
// toward the goal, bounce off walls, pegs and each other, and a flood rises from the start along the same grid,
// eliminating anyone it reaches. Positions are in cells. Everything is precomputed once per seed.
import { COLS, FROM_START, MAP, PEG_R, ROWS, START_CELLS, TO_GOAL, goalDist, isPeg, isWall } from "./course";
import { TEAMS } from "./teams";

export const STEP = 1 / 120;
export const SIZE = 0.78; // square side, cells
const H = SIZE / 2;

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Racer = { x: number; y: number; vx: number; vy: number; alive: boolean; done: boolean; squash: number; out?: number; fin?: number };
export type Ev = { t: number; kind: "wall" | "peg" | "hit" | "out" | "finish" | "lead"; i: number; v: number };
export type Run = { seed: number; frames: Racer[][]; events: Ev[]; flood: number[]; winner: number; finishT: number; order: number[] };

const flowDir = (x: number, y: number): [number, number] => {
  const c = Math.floor(x);
  const r = Math.floor(y);
  let best = TO_GOAL[r]?.[c] ?? Infinity;
  let bx = 0;
  let by = 0;
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const nc = c + dc;
    const nr = r + dr;
    if (isWall(nc, nr) || (dc && dr && (isWall(c + dc, r) || isWall(c, r + dr)))) continue;
    const d = TO_GOAL[nr][nc];
    if (d < best) {
      best = d;
      bx = nc + 0.5 - x;
      by = nr + 0.5 - y;
    }
  }
  const L = Math.hypot(bx, by) || 1;
  return [bx / L, by / L];
};
const hitsWall = (x: number, y: number) => {
  for (const [cx, cy] of [[x - H, y - H], [x + H, y - H], [x - H, y + H], [x + H, y + H]]) if (isWall(Math.floor(cx), Math.floor(cy))) return true;
  return false;
};

export const FLOOD_START = 2.4;
export const simulate = (seed: number, fps = 30, floodSpeed = 2.55): Run => {
  const R = rng(seed);
  const n = TEAMS.length;
  const speed = TEAMS.map(() => 3.15 + R() * 0.55);
  const wob = TEAMS.map(() => 0.6 + R() * 0.8);
  const spots = [...START_CELLS].sort(() => R() - 0.5);
  const rs: Racer[] = TEAMS.map((_, i) => {
    const a = R() * Math.PI * 2;
    return { x: spots[i][0] + 0.5, y: spots[i][1] + 0.5, vx: Math.cos(a), vy: Math.sin(a), alive: true, done: false, squash: 0 };
  });
  const frames: Racer[][] = [];
  const flood: number[] = [];
  const events: Ev[] = [];
  let leader = -1;
  let t = 0;
  let winner = -1;
  let finishT = 0;
  const order: number[] = [];
  const per = Math.round(1 / fps / STEP);
  for (let step = 0; step < 120 * 70; step++) {
    t = step * STEP;
    const front = t < FLOOD_START ? -1 : (t - FLOOD_START) * floodSpeed;
    if (step % per === 0) {
      frames.push(rs.map((r) => ({ ...r })));
      flood.push(front);
    }
    if (order.length + rs.filter((r) => !r.alive).length >= n && t > (finishT || 0) + 2.5) break;
    if (winner >= 0 && t > finishT + 3.0) break;
    for (let i = 0; i < n; i++) {
      const r = rs[i];
      r.squash *= 0.9;
      if (!r.alive || r.done) continue;
      // steer: flow field + a wandering wobble, keep the racer's own speed
      const [fx, fy] = flowDir(r.x, r.y);
      const w = Math.sin(t * 2.3 * wob[i] + i * 1.7) * 0.9;
      let vx = r.vx + (fx * 3.2 - fy * w) * STEP * 4;
      let vy = r.vy + (fy * 3.2 + fx * w) * STEP * 4;
      const L = Math.hypot(vx, vy) || 1;
      vx = (vx / L) * speed[i];
      vy = (vy / L) * speed[i];
      // move x then y against walls
      let nx = r.x + vx * STEP;
      if (hitsWall(nx, r.y)) {
        vx = -vx;
        nx = r.x;
        r.squash = 1;
        if (Math.abs(vx) > 1.2) events.push({ t, kind: "wall", i, v: Math.abs(vx) });
      }
      let ny = r.y + vy * STEP;
      if (hitsWall(nx, ny)) {
        vy = -vy;
        ny = r.y;
        r.squash = 1;
        if (Math.abs(vy) > 1.2) events.push({ t, kind: "wall", i, v: Math.abs(vy) });
      }
      // pegs
      const c = Math.floor(nx);
      const rr = Math.floor(ny);
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
        if (!isPeg(c + dc, rr + dr)) continue;
        const px = c + dc + 0.5;
        const py = rr + dr + 0.5;
        const dx = nx - px;
        const dy = ny - py;
        const d = Math.hypot(dx, dy);
        const lim = PEG_R + H * 1.1;
        if (d < lim && d > 1e-6) {
          const ux = dx / d;
          const uy = dy / d;
          const dot = vx * ux + vy * uy;
          if (dot < 0) {
            vx -= 2 * dot * ux;
            vy -= 2 * dot * uy;
            r.squash = 1;
            events.push({ t, kind: "peg", i, v: -dot });
          }
          nx = px + ux * lim;
          ny = py + uy * lim;
          if (hitsWall(nx, ny)) {
            nx = r.x;
            ny = r.y;
          }
        }
      }
      r.x = nx;
      r.y = ny;
      r.vx = vx;
      r.vy = vy;
      // flood
      const fc = Math.floor(r.x);
      const fr = Math.floor(r.y);
      if (front >= 0 && FROM_START[fr][fc] + 0.35 < front) {
        r.alive = false;
        r.out = t;
        events.push({ t, kind: "out", i, v: 1 });
      }
      // goal
      if (MAP[fr]?.[fc] === "G") {
        r.done = true;
        r.fin = t;
        order.push(i);
        events.push({ t, kind: "finish", i, v: order.length });
        if (winner < 0) {
          winner = i;
          finishT = t;
        }
      }
    }
    // racer vs racer: push apart, exchange the normal velocity
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = rs[i];
      const b = rs[j];
      if (!a.alive || !b.alive || a.done || b.done) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.abs(dx) < SIZE && Math.abs(dy) < SIZE) {
        const ax = Math.abs(dx) > Math.abs(dy);
        const s = (ax ? Math.sign(dx) : Math.sign(dy)) || 1;
        const pen = SIZE - (ax ? Math.abs(dx) : Math.abs(dy));
        if (ax) {
          const ax0 = a.x;
          a.x -= (s * pen) / 2;
          b.x += (s * pen) / 2;
          if (hitsWall(a.x, a.y)) a.x = ax0;
          if (s * (a.vx - b.vx) > 0) {
            [a.vx, b.vx] = [b.vx, a.vx];
            events.push({ t, kind: "hit", i, v: j });
          }
        } else {
          const ay0 = a.y;
          a.y -= (s * pen) / 2;
          b.y += (s * pen) / 2;
          if (hitsWall(a.x, a.y)) a.y = ay0;
          if (s * (a.vy - b.vy) > 0) {
            [a.vy, b.vy] = [b.vy, a.vy];
            events.push({ t, kind: "hit", i, v: j });
          }
        }
        a.squash = b.squash = 0.7;
        if (hitsWall(b.x, b.y)) {
          b.x = Math.max(1 + H, Math.min(COLS - 1 - H, b.x));
          b.y = Math.max(1 + H, Math.min(ROWS - 1 - H, b.y));
        }
      }
    }
    // leader
    if (winner < 0) {
      let li = -1;
      let ld = Infinity;
      rs.forEach((r, i) => {
        if (r.alive && !r.done) {
          const d = goalDist(r.x, r.y);
          if (d < ld - 0.4 || li < 0) {
            ld = d;
            li = i;
          }
        }
      });
      if (li >= 0 && li !== leader) {
        if (leader >= 0 && rs[leader].alive) events.push({ t, kind: "lead", i: li, v: leader });
        leader = li;
      }
    }
  }
  return { seed, frames, events, flood, winner, finishT, order };
};

/** how good a race is to watch: lead changes, eliminations spread through the race, a close finish, ~30 s */
export const drama = (run: Run) => {
  const leads = run.events.filter((e) => e.kind === "lead" && e.t > 4).length;
  if (run.winner < 0) return { score: -1, leads, outs: 0, margin: 99, spread: 0 };
  const outT = run.events.filter((e) => e.kind === "out" && e.t < run.finishT).map((e) => e.t);
  const outs = outT.length;
  const fins = run.events.filter((e) => e.kind === "finish").map((e) => e.t);
  const margin = fins.length > 1 ? fins[1] - fins[0] : 5;
  const L = run.finishT;
  // eliminations spread across the race: count distinct thirds that have one, and the largest quiet gap
  const thirds = new Set(outT.map((t) => Math.min(2, Math.floor((t / L) * 3)))).size;
  const marks = [4, ...outT, L];
  let gap = 0;
  for (let k = 1; k < marks.length; k++) gap = Math.max(gap, marks[k] - marks[k - 1]);
  let score = Math.min(leads, 12) * 0.5 + Math.min(outs, 5) * 2 + thirds * 3 - gap * 0.5 - margin * 5 - Math.abs(L - 30) * 0.6;
  if (outs < 3 || fins.length < 2) score -= 8;
  return { score, leads, outs, margin, L, thirds, gap };
};
