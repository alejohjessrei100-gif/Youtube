// Cartoon eye (E1-E7) and mouth (M0-M11) sticker library, MASTER_BLUEPRINT §4 / reports/02.
// Flat fills only: white #FFF, black #000, tongue #EA5B4C. Drawn in unit boxes, then placed on
// the face geometry measured by scripts/faces.py (image pixel space of the layer).
import React from 'react';
import {Expr, FaceGeo} from './types';

const TONGUE = '#EA5B4C';

const rnd = (seed: number) => {
  // deterministic pseudo-random in [-1, 1]
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h) % 100000;
};

const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Rounded, slightly irregular quad (hand-drawn look) in a 100x100 box.
const blobPath = (seed: number, h = 100) => {
  const j = (k: number) => rnd(seed + k) * 4;
  const s = h / 100;
  const p = [
    [8 + j(1), (6 + j(2)) * s],
    [92 + j(3), (3 + j(4)) * s],
    [97 + j(5), (93 + j(6)) * s],
    [4 + j(7), (97 + j(8)) * s],
  ];
  const m = [mid(p[3], p[0]), mid(p[0], p[1]), mid(p[1], p[2]), mid(p[2], p[3])];
  return `M${m[0]} Q${p[0]} ${m[1]} Q${p[1]} ${m[2]} Q${p[2]} ${m[3]} Q${p[3]} ${m[0]} Z`.replace(/,/g, ' ');
};

// Lid line per eye type: [yInner, yOuter] (inner = nose side). null = no lid.
const LIDS: Record<string, [number, number] | null> = {
  E1: null, E2: null, E3: [48, 44], E4: [46, 12], E5: [12, 46], E6: [30, 18], E7: null,
};

type EyeProps = {type: string; gaze: [number, number]; side: 'L' | 'R'; seed: number; skin: string};

const Eye: React.FC<EyeProps> = ({type, gaze, side, seed, skin}) => {
  const id = `e${seed}${side}`;
  const path = blobPath(seed);
  const stroke = 6;
  if (type === 'E7') {
    return (
      <g>
        <path d={path} fill={skin} />
        <path d="M10 30 Q50 18 90 30" fill="none" stroke="#000" strokeWidth={4} strokeLinecap="round" />
        <path d="M8 60 Q50 85 92 60" fill="none" stroke="#000" strokeWidth={9} strokeLinecap="round" />
      </g>
    );
  }
  const lid = LIDS[type] ?? null;
  // inner side is toward the nose: image-left eye -> x=100, image-right eye -> x=0
  const yAt = (x: number) => {
    if (!lid) return 0;
    const [yi, yo] = lid;
    const t = side === 'L' ? x / 100 : 1 - x / 100; // 0 at outer, 1 at inner
    return yo + (yi - yo) * t;
  };
  const r = type === 'E2' ? 6 : 10;
  let px = 50 + gaze[0] * (50 - r - 8);
  let py = 50 + gaze[1] * (50 - r - 8);
  if (lid) py = Math.min(92 - r, Math.max(py, yAt(px) + r + 2));
  const clipPoly = lid ? `0,${yAt(0)} 100,${yAt(100)} 100,110 0,110` : '';
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>{lid ? <polygon points={clipPoly} /> : <rect x={-10} y={-10} width={120} height={120} />}</clipPath>
        <clipPath id={`${id}w`}><path d={path} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <path d={path} fill="#fff" stroke="#000" strokeWidth={stroke} strokeLinejoin="round" />
        <g clipPath={`url(#${id}w)`}>
          <circle cx={px} cy={py} r={r} fill="#000" />
        </g>
      </g>
      {lid && (
        <line x1={2} y1={yAt(2)} x2={98} y2={yAt(98)} stroke="#000" strokeWidth={stroke * 1.8} strokeLinecap="round" />
      )}
    </g>
  );
};

// Mouths drawn in a 100-wide box centred on (50, 50).
const Mouth: React.FC<{type: string; seed: number; sw: number}> = ({type, seed, sw}) => {
  const id = `m${seed}`;
  const line = (d: string) => <path d={d} fill="none" stroke="#000" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
  switch (type) {
    case 'M0':
      return null;
    case 'M1':
      return line('M6 50 Q50 53 94 50');
    case 'M2':
      return line('M6 54 Q56 62 94 40');
    case 'M3':
      return line('M8 60 Q50 34 92 60');
    case 'M4':
      return line('M6 50 Q17 42 28 50 T50 50 T72 50 T94 50');
    case 'M5':
    case 'M6': {
      const shape = 'M0 30 Q50 38 100 30 C100 88 0 88 0 30 Z';
      return (
        <g>
          <defs><clipPath id={id}><path d={shape} /></clipPath></defs>
          <path d={shape} fill="#000" />
          <g clipPath={`url(#${id})`}>
            <ellipse cx={55} cy={68} rx={24} ry={11} fill={TONGUE} />
            {type === 'M6' && [0, 1, 2, 3, 4, 5].map((k) => (
              <rect key={k} x={6 + k * 15} y={28} width={13} height={13} fill="#fff" stroke="#000" strokeWidth={1.5} />
            ))}
          </g>
          <path d={shape} fill="none" stroke="#000" strokeWidth={sw * 0.6} />
        </g>
      );
    }
    case 'M7':
      return (
        <g>
          <defs><clipPath id={id}><rect x={20} y={28} width={60} height={45} rx={18} /></clipPath></defs>
          <rect x={20} y={28} width={60} height={45} rx={18} fill="#000" />
          <g clipPath={`url(#${id})`}>
            <rect x={37} y={26} width={12} height={15} fill="#fff" stroke="#000" strokeWidth={1.5} />
            <rect x={51} y={26} width={12} height={15} fill="#fff" stroke="#000" strokeWidth={1.5} />
            <ellipse cx={50} cy={72} rx={18} ry={9} fill={TONGUE} />
          </g>
        </g>
      );
    case 'M8':
      return (
        <g>
          <rect x={0} y={30} width={100} height={40} rx={10} fill="#fff" stroke="#000" strokeWidth={sw * 1.1} />
          <line x1={2} y1={50} x2={98} y2={50} stroke="#000" strokeWidth={sw * 0.7} />
          {[20, 40, 60, 80].map((x) => <line key={x} x1={x} y1={31} x2={x} y2={69} stroke="#000" strokeWidth={sw * 0.6} />)}
        </g>
      );
    case 'M9':
      return (
        <g>
          <defs><clipPath id={id}><ellipse cx={50} cy={50} rx={25} ry={32} /></clipPath></defs>
          <ellipse cx={50} cy={50} rx={25} ry={32} fill="#000" />
          <ellipse cx={50} cy={80} rx={18} ry={12} fill={TONGUE} clipPath={`url(#${id})`} />
        </g>
      );
    case 'M10':
      return <ellipse cx={50} cy={50} rx={15} ry={11} fill="#000" />;
    case 'M11': {
      const j = rnd(seed) * 3;
      const shape = `M28 ${44 + j} Q50 ${34 - j} 72 ${46} Q76 ${62 + j} 50 ${64} Q24 ${62} 28 ${44 + j} Z`;
      return (
        <g>
          <defs><clipPath id={id}><path d={shape} /></clipPath></defs>
          <path d={shape} fill="#000" />
          <ellipse cx={52} cy={66} rx={14} ry={7} fill={TONGUE} clipPath={`url(#${id})`} />
        </g>
      );
    }
    default:
      return line('M6 50 Q50 53 94 50');
  }
};

const MOUTH_WIDTH: Record<string, number> = {M5: 1.5, M6: 1.85, M7: 1.25, M8: 1.35, M9: 1.0, M10: 0.7, M11: 1.25};

export const activeExpr = (exprs: Expr[], t: number): Expr | null => {
  let cur: Expr | null = null;
  for (const e of exprs) if (e.t <= t + 1e-6) cur = e;
  return cur ?? exprs[0] ?? null;
};

// One face's stickers, drawn in the layer image's pixel space.
export const FaceOverlay: React.FC<{geo: FaceGeo; expr: Expr; seedKey: string}> = ({geo, expr, seedKey}) => {
  if (Math.abs(geo.yaw) > 0.92) return null; // true profiles get no overlay
  const seed = hash(seedKey);
  const gaze = expr.gaze ?? [0, 0];
  const ay = Math.abs(geo.yaw);
  const squash = 1 - 0.22 * ay;
  // yaw > 0: nose toward image right -> image-left eye is the near eye
  const nearL = geo.yaw > 0;
  const sL = 1 + (nearL ? 0.2 : -0.2) * ay;
  const sR = 1 + (nearL ? -0.2 : 0.2) * ay;
  const eyeScale = expr.eyes === 'E2' ? 1.1 : 1;
  const eye = (c: [number, number], s: number, side: 'L' | 'R') => {
    const w = geo.eyeW * s * eyeScale;
    // keep the top of the sticker from covering the real brow too much
    const cy = Math.max(c[1], geo.browY + w * 0.45 - geo.faceH * 0.05);
    return (
      <g transform={`translate(${c[0]} ${cy}) rotate(${geo.roll}) scale(${(w / 100) * squash} ${w / 100}) translate(-50 -50)`}>
        <Eye type={expr.eyes} gaze={gaze} side={side} seed={seed + (side === 'L' ? 1 : 7)} skin={geo.skin} />
      </g>
    );
  };
  // mouths never wider than ~45 % of the face (big grins were swallowing faces)
  const mw = Math.min(geo.mouthW * (MOUTH_WIDTH[expr.mouth] ?? 1) * (expr.mouthScale ?? 1), 0.45 * Math.max(geo.faceW, geo.faceH * 0.85));
  // on dark skin black mouth lines vanish: give the mouth a thin light halo
  const sk = parseInt((geo.skin || '#c08060').slice(1), 16);
  const lum = 0.299 * ((sk >> 16) & 255) + 0.587 * ((sk >> 8) & 255) + 0.114 * (sk & 255);
  // (CSS drop-shadow doesn't work on SVG elements in Chrome, so use an SVG filter: dilate the shape, fill it white)
  const haloId = lum < 115 ? `mh${seed}` : '';
  const swPx = Math.max(2, 0.1 * geo.eyeW); // bold line mouths, readable at phone size
  const sw = (swPx * 100) / mw;
  return (
    <g>
      {haloId && (
        <defs>
          <filter id={haloId} x="-30%" y="-60%" width="160%" height="220%">
            <feMorphology in="SourceAlpha" operator="dilate" radius={2.6} result="d" />
            <feFlood floodColor="#ffffff" floodOpacity={0.92} />
            <feComposite in2="d" operator="in" result="w" />
            <feMerge><feMergeNode in="w" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      {eye(geo.eyeL, sL, 'L')}
      {eye(geo.eyeR, sR, 'R')}
      {expr.mouth !== 'M0' && (
        <g transform={`translate(${geo.mouth[0]} ${geo.mouth[1]}) rotate(${geo.roll}) scale(${(mw / 100) * squash} ${mw / 100}) translate(-50 -50)`} filter={haloId ? `url(#${haloId})` : undefined}>
          <Mouth type={expr.mouth} seed={seed + 3} sw={sw} />
        </g>
      )}
    </g>
  );
};
