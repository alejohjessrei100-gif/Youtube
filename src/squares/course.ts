// The maze of the World Cup square race: a 20 x 22 grid of 50 px cells. # wall, . open, o peg (a round bumper in an
// open cell), S start, G goal. A serpentine: start bottom-left, five levels joined by gaps that alternate sides, the
// goal at the top right. Pure data.
export const MAP = [
  "####################",
  "#.........o.....GG.#",
  "#.....B............#",
  "#..################",
  "#..................#",
  "#.........o........#",
  "#..................#",
  "################...#",
  "#..................#",
  "#..o...o...o...o...#",
  "#....B.............#",
  "#...################",
  "#..................#",
  "#....o.....o.....o.#",
  "#.............B....#",
  "################...#",
  "#..................#",
  "#..o....o....o.....#",
  "#...............B..#",
  "#SSSSSSSS..........#",
  "#SSSSSSSS..........#",
  "####################",
].map((r) => r.padEnd(20, "#"));
export const COLS = 20;
export const ROWS = MAP.length;
export const CELL = 50;
export const isWall = (c: number, r: number) => c < 0 || r < 0 || c >= COLS || r >= ROWS || MAP[r][c] === "#";
export const isPeg = (c: number, r: number) => MAP[r]?.[c] === "o" || MAP[r]?.[c] === "B";
export const PEG_R = 0.3; // in cells
/** big bumpers (B) are wider and kick harder */
export const pegR = (c: number, r: number) => (MAP[r]?.[c] === "B" ? 0.42 : PEG_R);
export const isBumper = (c: number, r: number) => MAP[r]?.[c] === "B";
/** spinning bars: centre (cells), length (cells), turn rate (rad/s), start angle */
export const SPINNERS = [
  { x: 11.0, y: 17.5, len: 2.3, w: 2.2, a0: 0.3 },
  { x: 8.5, y: 13.5, len: 2.3, w: -2.6, a0: 1.1 },
  { x: 9.5, y: 9.5, len: 2.3, w: 2.9, a0: 0.0 },
  { x: 5.5, y: 5.5, len: 2.3, w: -2.4, a0: 0.8 },
  { x: 14.5, y: 5.5, len: 2.3, w: 2.7, a0: 2.0 },
];
export const SPIN_HALF = 0.11;

/** BFS distance (in cells, 8-connected without corner cutting) from a set of seed cells */
const bfs = (seed: (c: number, r: number) => boolean) => {
  const D = Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(Infinity));
  const q: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (seed(c, r)) {
    D[r][c] = 0;
    q.push([c, r]);
  }
  // Dijkstra-lite on a grid with costs 1 and 1.414 (small grid: a simple repeated relaxation is enough)
  for (let head = 0; head < q.length; head++) {
    const [c, r] = q[head];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (isWall(nc, nr)) continue;
      if (dc && dr && (isWall(c + dc, r) || isWall(c, r + dr))) continue;
      const nd = D[r][c] + (dc && dr ? Math.SQRT2 : 1);
      if (nd < D[nr][nc] - 1e-9) {
        D[nr][nc] = nd;
        q.push([nc, nr]);
      }
    }
  }
  return D;
};
export const TO_GOAL = bfs((c, r) => MAP[r][c] === "G");
export const FROM_START = bfs((c, r) => MAP[r][c] === "S");
/** distance to goal at a point (cells), bilinear over cell centres */
export const goalDist = (x: number, y: number) => {
  const c = Math.floor(x);
  const r = Math.floor(y);
  const d = TO_GOAL[r]?.[c];
  return d === undefined || !isFinite(d) ? 999 : d + Math.hypot(x - (c + 0.5), y - (r + 0.5)) * 0.5;
};
export const START_CELLS: [number, number][] = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MAP[r][c] === "S") START_CELLS.push([c, r]);
