// World Cup Square Race: eight nations race through a maze while a flood rises behind them. Flat 2D (SVG), so it renders
// fast on a phone. The race is a precomputed, seeded simulation (sim.ts), chosen for drama by plan/squares_pick.ts.
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { useFonts } from "../inkbeat/core/frame";
import { CELL, COLS, FROM_START, MAP, PEG_R, ROWS, goalDist } from "./course";
import { FLOOD_START, SIZE, simulate } from "./sim";
import type { Racer } from "./sim";
import { TEAMS } from "./teams";
import type { Team } from "./teams";

export const SEED = 1477;
export const FLOOD_SPEED = 2.65;
const RUN = simulate(SEED, 30, FLOOD_SPEED);
const FPS = 30;
const INTRO = 1.6; // 3, 2, 1, GO
const SLOW = 0.4; // photo-finish slow motion
const S0 = RUN.finishT - 1.1; // sim time where slow motion starts
const S1 = RUN.finishT + 0.5;
const OUTRO = 3.2;
/** film time -> simulation time (frozen during the intro, slowed around the finish) */
const simTime = (t: number) => {
  const a = t - INTRO;
  if (a <= 0) return 0;
  if (a < S0) return a;
  const slowLen = (S1 - S0) / SLOW;
  if (a < S0 + slowLen) return S0 + (a - S0) * SLOW;
  return S1 + (a - S0 - slowLen);
};
const FINISH_FILM = INTRO + S0 + (RUN.finishT - S0) / SLOW;
export const SQUARE_SECONDS = INTRO + S0 + (S1 - S0) / SLOW + (RUN.frames.length / FPS - S1 > 0 ? 0 : 0) + OUTRO + 0.4;
export const SQUARE_FRAMES = Math.round(SQUARE_SECONDS * FPS);
export const RACE = { run: RUN, INTRO, simTime, FINISH_FILM, SQUARE_SECONDS };

const X0 = 40;
const Y0 = 380;
const INK = "#10121c";
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const back = (u: number) => {
  const x = clamp(u);
  const c1 = 1.70158;
  return x >= 1 ? 1 : 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const h1 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const at = (s: number): Racer[] => {
  const f = clamp(s * FPS, 0, RUN.frames.length - 1);
  const a = RUN.frames[Math.floor(f)];
  const b = RUN.frames[Math.min(RUN.frames.length - 1, Math.floor(f) + 1)];
  const u = f - Math.floor(f);
  return a.map((r, i) => ({ ...r, x: r.x + (b[i].x - r.x) * u, y: r.y + (b[i].y - r.y) * u }));
};
const px = (x: number) => X0 + x * CELL;
const py = (y: number) => Y0 + y * CELL;

/** a flag inside a w x h box at the origin */
const Flag: React.FC<{ team: Team; w: number; h: number; id: string }> = ({ team, w, h, id }) => {
  const st = team.stripes;
  const n = st.colors.length;
  return (
    <g>
      <clipPath id={id}>
        <rect x={0} y={0} width={w} height={h} rx={w * 0.14} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        {st.colors.map((c, k) => (st.dir === "v" ? <rect key={k} x={(w * k) / n} y={0} width={w / n + 0.5} height={h} fill={c} /> : <rect key={k} x={0} y={(h * k) / n} width={w} height={h / n + 0.5} fill={c} />))}
        {team.extra === "brazil" ? (
          <>
            <polygon points={`${w / 2},${h * 0.12} ${w * 0.9},${h / 2} ${w / 2},${h * 0.88} ${w * 0.1},${h / 2}`} fill="#f7d417" />
            <circle cx={w / 2} cy={h / 2} r={h * 0.22} fill="#22357e" />
          </>
        ) : null}
        {team.extra === "argentina" ? <circle cx={w / 2} cy={h / 2} r={h * 0.11} fill="#f4b623" /> : null}
        {team.extra === "portugal" ? <circle cx={w * 0.4} cy={h / 2} r={h * 0.18} fill="#f4c423" /> : null}
      </g>
    </g>
  );
};

const Maze: React.FC = () => {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const ch = MAP[r][c];
      if (ch === "#") {
        cells.push(<rect key={`w${c}-${r}`} x={px(c)} y={py(r)} width={CELL + 0.6} height={CELL + 0.6} fill="#1d2b70" />);
      }
    }
  return (
    <g>
      <rect x={X0} y={Y0} width={COLS * CELL} height={ROWS * CELL} fill="#e9f5ff" />
      {/* faint floor grid */}
      {Array.from({ length: COLS + 1 }, (_, c) => <line key={`gx${c}`} x1={px(c)} y1={Y0} x2={px(c)} y2={Y0 + ROWS * CELL} stroke="#d4e8f8" strokeWidth={1.5} />)}
      {Array.from({ length: ROWS + 1 }, (_, r) => <line key={`gy${r}`} x1={X0} y1={py(r)} x2={X0 + COLS * CELL} y2={py(r)} stroke="#d4e8f8" strokeWidth={1.5} />)}
      {/* start pad */}
      <rect x={px(1)} y={py(19)} width={8 * CELL} height={2 * CELL} fill="#ffe9a8" />
      {cells}
      {/* wall top highlight */}
      {MAP.map((row, r) => row.split("").map((ch, c) => (ch === "#" && MAP[r + 1]?.[c] && MAP[r + 1][c] !== "#" ? <rect key={`h${c}-${r}`} x={px(c)} y={py(r) + CELL - 7} width={CELL + 0.6} height={7} fill="#3a4fb0" /> : null)))}
    </g>
  );
};
const Pegs: React.FC<{ t: number }> = ({ t }) => (
  <g>
    {MAP.map((row, r) =>
      row.split("").map((ch, c) =>
        ch === "o" ? (
          <g key={`p${c}-${r}`} transform={`translate(${px(c + 0.5)} ${py(r + 0.5)}) rotate(${(t * 90 + c * 40) % 360})`}>
            <circle r={PEG_R * CELL} fill="#ff7a2e" stroke={INK} strokeWidth={4} />
            <rect x={-3} y={-PEG_R * CELL + 3} width={6} height={PEG_R * CELL * 2 - 6} fill="#ffd2a8" rx={3} />
          </g>
        ) : null,
      ),
    )}
  </g>
);
const Goal: React.FC = () => {
  const x = px(16);
  const y = py(1);
  const w = 2 * CELL;
  const h = CELL;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#ffffff" />
      {Array.from({ length: 9 }, (_, k) => <line key={`n${k}`} x1={x + (k * w) / 8} y1={y} x2={x + (k * w) / 8} y2={y + h} stroke="#b9c3d3" strokeWidth={2} />)}
      {Array.from({ length: 5 }, (_, k) => <line key={`m${k}`} x1={x} y1={y + (k * h) / 4} x2={x + w} y2={y + (k * h) / 4} stroke="#b9c3d3" strokeWidth={2} />)}
      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke="#ffffff" strokeWidth={8} />
      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke={INK} strokeWidth={3} />
      <text x={x + w / 2} y={y + h + 34} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={26} fill="#1d2b70">GOAL</text>
    </g>
  );
};
const Flood: React.FC<{ front: number; t: number }> = ({ front, t }) => {
  if (front < 0) return null;
  const out: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const d = FROM_START[r][c];
      if (!isFinite(d)) continue;
      const k = clamp(front - d);
      if (k <= 0) continue;
      out.push(<rect key={`f${c}-${r}`} x={px(c)} y={py(r)} width={CELL + 0.6} height={CELL + 0.6} fill="#2563eb" opacity={0.25 + 0.65 * k} />);
      if (k < 1 && k > 0.05) out.push(<rect key={`e${c}-${r}`} x={px(c) + 6} y={py(r) + 18 + 6 * Math.sin(t * 6 + c)} width={CELL - 12} height={5} rx={2.5} fill="#bcd7ff" opacity={0.8} />);
    }
  return <g>{out}</g>;
};

const Square: React.FC<{ i: number; r: Racer; s: number; trail: Racer[] }> = ({ i, r, s, trail }) => {
  const team = TEAMS[i];
  const w = SIZE * CELL;
  let scale = 1;
  let op = 1;
  if (!r.alive && r.out !== undefined) {
    const k = clamp((s - r.out) / 0.45);
    scale = 1 - k;
    op = 1 - k;
    if (k >= 1) return null;
  }
  const sp = Math.hypot(r.vx, r.vy) || 1;
  const ex = (r.vx / sp) * 3;
  const ey = (r.vy / sp) * 3;
  const sq = r.squash * 0.22;
  return (
    <g opacity={op}>
      {r.alive && !r.done ? (
        <polyline points={trail.map((q) => `${px(q.x)},${py(q.y)}`).join(" ")} fill="none" stroke={team.main} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} />
      ) : null}
      <g transform={`translate(${px(r.x)} ${py(r.y)}) scale(${scale * (1 + sq)} ${scale * (1 - sq)}) translate(${-w / 2} ${-w / 2})`}>
        <rect x={-2} y={-2} width={w + 4} height={w + 4} rx={w * 0.18} fill={INK} />
        <Flag team={team} w={w} h={w} id={`fl${i}`} />
        <circle cx={w * 0.32} cy={w * 0.42} r={4.6} fill="#fff" stroke={INK} strokeWidth={1.4} />
        <circle cx={w * 0.68} cy={w * 0.42} r={4.6} fill="#fff" stroke={INK} strokeWidth={1.4} />
        <circle cx={w * 0.32 + ex * 0.6} cy={w * 0.42 + ey * 0.6} r={2.2} fill={INK} />
        <circle cx={w * 0.68 + ex * 0.6} cy={w * 0.42 + ey * 0.6} r={2.2} fill={INK} />
      </g>
      <text x={px(r.x)} y={py(r.y) - w / 2 - 6} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={15} fill={INK} stroke="#fff" strokeWidth={4} paintOrder="stroke">{team.code}</text>
    </g>
  );
};

const Sparks: React.FC<{ s: number; rs: Racer[] }> = ({ s, rs }) => (
  <g>
    {RUN.events
      .filter((e) => (e.kind === "peg" || e.kind === "wall" || e.kind === "hit") && s - e.t >= 0 && s - e.t < 0.32)
      .slice(-24)
      .map((e, k) => {
        const p = at(e.t)[e.i];
        const u = (s - e.t) / 0.32;
        return (
          <g key={k} opacity={1 - u}>
            {[0, 1, 2, 3].map((j) => {
              const a = h1(e.t * 31 + j) * 6.28;
              const d = 8 + 26 * u;
              return <rect key={j} x={px(p.x) + Math.cos(a) * d - 3} y={py(p.y) + Math.sin(a) * d - 3} width={6} height={6} fill={j % 2 ? TEAMS[e.i].main : "#ffffff"} stroke={INK} strokeWidth={1.2} />;
            })}
          </g>
        );
      })}
    {RUN.events
      .filter((e) => e.kind === "out" && s - e.t >= 0 && s - e.t < 0.7)
      .map((e, k) => {
        const p = rs[e.i];
        const u = (s - e.t) / 0.7;
        return <circle key={`o${k}`} cx={px(p.x)} cy={py(p.y)} r={10 + 50 * u} fill="none" stroke="#ffffff" strokeWidth={6 * (1 - u)} opacity={1 - u} />;
      })}
  </g>
);

/** current standings: finished in order, then the living by distance to goal, then the eliminated (latest first) */
const standing = (rs: Racer[]) =>
  rs
    .map((r, i) => ({ i, key: r.done ? -1000 + (r.fin ?? 0) : r.alive ? goalDist(r.x, r.y) : 1000 - (r.out ?? 0) }))
    .sort((a, b) => a.key - b.key)
    .map((o) => o.i);

const Board: React.FC<{ s: number; t: number }> = ({ s, t }) => {
  // rank smoothed over the last few frames so tiles glide instead of jumping
  const avg = TEAMS.map(() => 0);
  const K = 6;
  for (let k = 0; k < K; k++) standing(at(Math.max(0, s - k * 0.05))).forEach((i, rank) => (avg[i] += rank / K));
  const rs = at(s);
  const W = 124;
  return (
    <g>
      {TEAMS.map((team, i) => {
        const x = 540 - (W * 8) / 2 + avg[i] * W + 8;
        const out = !rs[i].alive;
        const lead = Math.round(avg[i]) === 0 && t > INTRO;
        return (
          <g key={i} transform={`translate(${x} ${235})`} opacity={out ? 0.45 : 1}>
            <rect x={-3} y={-3} width={W - 10} height={78} rx={14} fill={lead ? "#ffd34d" : INK} />
            <g transform="translate(6 6)">
              <Flag team={team} w={W - 22} h={52} id={`bf${i}`} />
            </g>
            <text x={(W - 16) / 2} y={98} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={22} fill="#ffffff" stroke={INK} strokeWidth={6} paintOrder="stroke">{team.code}</text>
            {out ? <text x={(W - 16) / 2} y={50} textAnchor="middle" fontFamily="Poppins" fontWeight={900} fontSize={54} fill="#ff3b30" stroke={INK} strokeWidth={5} paintOrder="stroke">✕</text> : null}
          </g>
        );
      })}
    </g>
  );
};

const Big: React.FC<{ text: string; y: number; size: number; t0: number; t: number; fill?: string }> = ({ text, y, size, t0, t, fill = "#ffffff" }) => {
  const e = clamp((t - t0) / 0.22);
  if (t < t0) return null;
  return (
    <text x={540} y={y} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={size} fill={fill} stroke={INK} strokeWidth={size * 0.12} paintOrder="stroke" transform={`translate(540 ${y}) scale(${back(e)}) translate(-540 ${-y})`}>
      {text}
    </text>
  );
};

const Confetti: React.FC<{ t: number; t0: number; team: Team }> = ({ t, t0, team }) => {
  if (t < t0) return null;
  const u = t - t0;
  const cols = [...team.stripes.colors, "#ffd34d", "#ffffff"];
  return (
    <g>
      {Array.from({ length: 90 }, (_, k) => {
        const x = 540 + (h1(k) - 0.5) * 300 + (h1(k + 9) - 0.5) * 900 * Math.min(1, u * 1.5);
        const y = 760 - 700 * h1(k + 3) * Math.min(1, u * 2) + 520 * u * u;
        return <rect key={k} x={x} y={y} width={14} height={9} fill={cols[k % cols.length]} transform={`rotate(${(u * 400 + k * 37) % 360} ${x + 7} ${y + 4})`} />;
      })}
    </g>
  );
};

export const SquareRace: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = f / FPS;
  if (!ready) return <AbsoluteFill style={{ background: "#0e1640" }} />;
  const s = simTime(t);
  const rs = at(s);
  // during the countdown the squares wiggle on the start pad
  const intro = t < INTRO;
  const shown = intro ? rs.map((r, i) => ({ ...r, x: r.x + Math.sin(t * 18 + i) * 0.04, squash: 0.25 + 0.25 * Math.sin(t * 9 + i) })) : rs;
  const trails = TEAMS.map((_, i) => Array.from({ length: 8 }, (_, k) => at(Math.max(0, s - k * 0.06))[i]));
  const front = s < FLOOD_START ? -1 : RUN.flood[Math.min(RUN.flood.length - 1, Math.floor(s * FPS))];
  const alive = rs.filter((r) => r.alive).length;
  const outs = RUN.events.filter((e) => e.kind === "out" && e.t <= s);
  const lastOut = outs[outs.length - 1];
  const leads = RUN.events.filter((e) => e.kind === "lead" && e.t <= s && e.t > 3);
  const lastLead = leads[leads.length - 1];
  const won = t >= FINISH_FILM;
  const winner = TEAMS[RUN.winner];
  const shake = lastOut && s - lastOut.t < 0.25 ? (1 - (s - lastOut.t) / 0.25) * 7 : 0;
  const slow = s > S0 && s < S1 && !intro;
  // ticker: the newest of an elimination or a lead change, shown for 1.4 s
  let ticker: { text: string; color: string; t0: number } | null = null;
  if (lastOut && s - lastOut.t < 1.4) ticker = { text: `${TEAMS[lastOut.i].name.toUpperCase()} IS OUT!`, color: "#ff3b30", t0: lastOut.t };
  if (lastLead && s - lastLead.t < 1.1 && (!ticker || lastLead.t > ticker.t0)) ticker = { text: `${TEAMS[lastLead.i].name.toUpperCase()} TAKES THE LEAD`, color: "#ffd34d", t0: lastLead.t };
  const check = (t * 24) % 120;
  return (
    <AbsoluteFill style={{ background: "#0e1640" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="chk" width={120} height={120} patternUnits="userSpaceOnUse" patternTransform={`translate(${check} ${check})`}>
            <rect width={120} height={120} fill="#13205a" />
            <rect width={60} height={60} fill="#182a72" />
            <rect x={60} y={60} width={60} height={60} fill="#182a72" />
          </pattern>
        </defs>
        <rect width={1080} height={1920} fill="url(#chk)" />
        <text x={540} y={150} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={84} fill="#ffffff" stroke={INK} strokeWidth={12} paintOrder="stroke">WHO WINS THE CUP?</text>
        <Board s={s} t={t} />
        <g transform={`translate(${shake * Math.sin(t * 90)} ${shake * Math.cos(t * 77)})`}>
          <rect x={X0 - 12} y={Y0 - 12} width={COLS * CELL + 24} height={ROWS * CELL + 24} rx={20} fill={INK} />
          <Maze />
          <Flood front={front} t={t} />
          <Goal />
          <Pegs t={s} />
          <Sparks s={s} rs={rs} />
          {shown.map((r, i) => (r.done && s - (r.fin ?? 0) > 0.25 ? null : <Square key={i} i={i} r={r} s={s} trail={trails[i]} />))}
        </g>
        {/* bottom strip: who is left, and the ticker */}
        <text x={540} y={1548} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={54} fill="#ffffff" stroke={INK} strokeWidth={9} paintOrder="stroke">{won ? "" : `${alive} LEFT`}</text>
        {ticker && !won ? <Big text={ticker.text} y={1630} size={52} t0={INTRO + ticker.t0} t={INTRO + s} fill={ticker.color} /> : null}
        {slow && !won ? <Big text="PHOTO FINISH" y={1160} size={88} t0={INTRO + S0} t={INTRO + s} fill="#ffd34d" /> : null}
        {intro ? (
          <>
            <Big text="PICK YOUR TEAM" y={700} size={86} t0={0} t={t + 0.3} fill="#ffd34d" />
            <Big text={t < 0.4 ? "3" : t < 0.8 ? "2" : t < 1.2 ? "1" : "GO!"} y={1020} size={240} t0={Math.floor(t / 0.4) * 0.4} t={t} />
          </>
        ) : null}
        {won ? (
          <>
            <rect x={0} y={0} width={1080} height={1920} fill="#000" opacity={Math.min(0.45, (t - FINISH_FILM) * 1.2)} />
            <Confetti t={t} t0={FINISH_FILM} team={winner} />
            <Big text="GOAL!" y={760} size={210} t0={FINISH_FILM} t={t} fill="#ffd34d" />
            <g transform={`translate(${540 - 160} ${860}) scale(${back((t - FINISH_FILM - 0.25) / 0.3)})`} style={{ transformOrigin: "160px 100px" }}>
              <rect x={-8} y={-8} width={336} height={216} rx={26} fill={INK} />
              <Flag team={winner} w={320} h={200} id="win" />
            </g>
            <Big text={`${winner.name.toUpperCase()} WINS`} y={1170} size={96} t0={FINISH_FILM + 0.45} t={t} />
            <Big text="DID YOU PICK RIGHT? 👇" y={1290} size={52} t0={FINISH_FILM + 1.0} t={t} fill="#ffd34d" />
          </>
        ) : null}
      </svg>
      {audio ? <Audio src={staticFile("audio/square-race-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
