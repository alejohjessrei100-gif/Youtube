import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, Easing} from 'remotion';
import {Ease, Key, Layer, Loop, Shot as ShotT, Timeline} from './types';
import {grade} from './grades';
import {FaceOverlay, activeExpr} from './Face';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
const easeOut = Easing.bezier(0.15, 0.85, 0.3, 1);
const EASE: Record<Ease, (x: number) => number> = {
  linear: (x) => x,
  in: Easing.bezier(0.55, 0, 1, 0.45),
  out: easeOut,
  inOut: easeInOut,
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  hold: (x) => (x < 1 ? 0 : 1),
};

// ---- keyframes -------------------------------------------------------------------------------
type Off = {x: number; y: number; s: number; r: number; o: number};
const ZERO: Off = {x: 0, y: 0, s: 1, r: 0, o: 1};
const keyAt = (keys: Key[] | undefined, t: number): Off => {
  if (!keys || keys.length === 0) return ZERO;
  const v = (k: Key): Off => ({x: k.x ?? 0, y: k.y ?? 0, s: k.s ?? 1, r: k.r ?? 0, o: k.o ?? 1});
  if (t <= keys[0].t) return v(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const a = v(keys[i - 1]);
      const b = v(keys[i]);
      const span = Math.max(1e-4, keys[i].t - keys[i - 1].t);
      const e = EASE[keys[i].ease ?? 'inOut'](clamp01((t - keys[i - 1].t) / span));
      return {x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, s: a.s + (b.s - a.s) * e, r: a.r + (b.r - a.r) * e, o: a.o + (b.o - a.o) * e};
    }
  }
  return v(keys[keys.length - 1]);
};

// ---- periodic loops: mechanical keyframe wiggles (period in frames) -----------------------------
const loopAt = (loops: Loop[] | undefined, t: number, fps: number) => {
  const o = {x: 0, y: 0, r: 0, s: 0};
  for (const lp of loops ?? []) {
    if (t < lp.t0 || t >= lp.t1) continue;
    const f = (t - lp.t0) * fps;
    const per = lp.period ?? 3;
    const ph = Math.sin((f / per) * 2 * Math.PI);
    const dec = lp.decay ? 1 - clamp01((t - lp.t0) / Math.max(0.01, lp.t1 - lp.t0)) : 1;
    const a = lp.amp * dec;
    switch (lp.type) {
      case 'shake': o.x += ph * a; break;
      case 'bob': o.y += Math.abs(ph) * -a; break;
      case 'rock': o.r += ph * a; break;
      case 'pulse': o.s += Math.abs(ph) * a; break;
      case 'jitter': {
        const k = Math.floor(f / per);
        o.x += (Math.sin(k * 12.9898) * 43758.5453 % 1) * a;
        o.y += (Math.sin(k * 78.233) * 12345.6789 % 1) * a;
        break;
      }
    }
  }
  return o;
};

// ---- camera ---------------------------------------------------------------------------------
const noise = (t: number, seed: number) =>
  Math.sin(t * 0.83 + seed) * 0.5 + Math.sin(t * 1.71 + seed * 2.1) * 0.3 + Math.sin(t * 0.37 + seed * 0.7) * 0.2;
const seedOf = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return h;
};

const cameraAt = (shot: ShotT, tRel: number) => {
  const dur = Math.max(0.01, shot.end - shot.start);
  const u = clamp01(tRel / dur);
  const c = shot.camera ?? {};
  const a = c.amount;
  let s = 1, px = 0, py = 0, rot = 0;
  if (c.keys && c.keys.length) {
    const k = keyAt(c.keys, shot.start + tRel);
    s = k.s; px = k.x; py = k.y; rot = k.r;
  } else {
    switch (c.move ?? 'creep') {
      case 'static': break;
      case 'creep': s = 1 + (a ?? 0.025) * u; break;
      case 'push': s = 1 + (a ?? 0.13) * easeInOut(u); break;
      case 'punch': s = 1 + (a ?? 0.2) * easeOut(clamp01(tRel / 0.9)); break;
      case 'pull': s = 1 + (a ?? 0.08) * (1 - easeInOut(u)); break;
      case 'pan_l': s = 1.1; px = -(a ?? 0.1) * (u - 0.5); break;
      case 'pan_r': s = 1.1; px = (a ?? 0.1) * (u - 0.5); break;
    }
  }
  if (c.tilt) rot += c.tilt * (easeInOut(u) - 0.5);
  // constant slow drift (the reference camera almost always slides 1-3 % of the width per second)
  const isPan = c.move === 'pan_l' || c.move === 'pan_r' || !!(c.keys && c.keys.length);
  const E = shot.energy ?? 1;
  const dr = isPan ? 0 : (c.drift ?? 0.012) * E;
  if (dr) {
    const ang = (seedOf(shot.id + 'd') / 1000) * Math.PI * 2;
    px += Math.cos(ang) * dr * (tRel - dur / 2);
    py += Math.sin(ang) * dr * 0.5 * (tRel - dur / 2);
  }
  // handheld: slow drift + sway, as in the reference (camera is almost never locked)
  const hh = (c.handheld ?? 0.5) * E;
  const sd = seedOf(shot.id);
  const hx = noise(tRel, sd) * 0.006 * hh;
  const hy = noise(tRel, sd + 50) * 0.005 * hh;
  const hr = noise(tRel, sd + 100) * 0.8 * hh;
  return {s, px: px + hx, py: py + hy, rot: rot + hr, focus: c.focus ?? ([0.5, 0.4] as [number, number])};
};

const DEPTH_K = (d: number) => 0.78 + 0.22 * d; // far layers move less = parallax

// Undo the grade's brightness drop on the cartoon face layer only (tint and saturation still apply)
const faceLift = (shot: ShotT, t: number): string | undefined => {
  const name = shot.gradeFlip && t >= shot.gradeFlip.t ? shot.gradeFlip.to : shot.grade;
  const m = /brightness\(([\d.]+)\)/.exec(grade(name).filter);
  const b = m ? parseFloat(m[1]) : 1;
  return b < 0.99 ? `brightness(${(1 / b).toFixed(3)})` : undefined;
};

const LayerView: React.FC<{L: Layer; shot: ShotT; t: number; tl: Timeline; cam: ReturnType<typeof cameraAt>}> = ({L, shot, t, tl, cam}) => {
  const {width: W, height: H, fps} = useVideoConfig();
  const frame = useCurrentFrame();
  // which image is showing: pose swaps on words, or a flip-book cycle
  let asset = L.asset;
  let swapAge = 1e9;
  let swapBlur = false;
  let swapPop = 0;
  let activeSwap: Layer['swaps'][number] | null = null;
  for (const sw of L.swaps ?? []) if (sw.t <= t + 1e-6) { asset = sw.asset; swapAge = t - sw.t; swapBlur = !!sw.blur; swapPop = sw.pop ?? 0; activeSwap = sw; }
  if (L.flipbook && t >= L.flipbook.t0 && t < L.flipbook.t1) {
    const n = Math.floor(((t - L.flipbook.t0) * fps) / Math.max(1, L.flipbook.every));
    asset = L.flipbook.assets[n % L.flipbook.assets.length];
  }
  const geo = tl.faces[asset];
  const full = L.kind === 'bg' || L.kind === 'full' || L.kind === 'insert';
  const depth = L.depth ?? (L.kind === 'bg' ? 0 : 1);
  const k = DEPTH_K(depth);
  const camS = 1 + (cam.s - 1) * k;
  const camX = cam.px * W * k;
  const camY = cam.py * H * k;

  // entrance / action animation
  let ax = 0, ay = 0, asc = 1, aop = 1, arot = 0;
  const an = L.anim;
  if (an && an.type !== 'none') {
    const dt = t - an.t;
    const d = an.dur ?? 0.4;
    const p = clamp01(dt / d);
    const sp = spring({frame: Math.round(dt * fps), fps, config: {damping: 14, stiffness: 170, mass: 0.7}});
    if (dt < 0 && an.type !== 'walk' && an.type !== 'shake') aop = 0;
    switch (an.type) {
      case 'slide_in': ax = (an.dir === 'right' ? 1 : -1) * W * 0.7 * (1 - easeOut(p)); break;
      case 'drop': ay = dt < 0 ? -H : -H * 0.9 * (1 - Easing.in(Easing.quad)(p)); break;
      case 'pop': asc = dt < 0 ? 0 : sp; break;
      case 'rise': ay = H * 0.35 * (1 - easeOut(p)); break;
      case 'fade': aop = p; break;
      case 'shake': ax = dt >= 0 && dt < d ? Math.sin(dt * 70) * W * 0.008 : 0; break;
      case 'walk': {
        const span = Math.max(0.01, shot.end - an.t);
        ax = (an.dir === 'left' ? -1 : 1) * W * (an.dist ?? 0.25) * (clamp01((t - an.t) / span) - 0.5);
        ay = -Math.abs(Math.sin((t - an.t) * Math.PI * 3.2)) * H * 0.006;
        break;
      }
    }
  }
  if (L.idle) asc *= 1 + 0.004 * Math.sin(frame / fps * 2 * Math.PI * 0.25);
  // keyframes + loops
  const kf = keyAt(L.keys, t);
  const lp = loopAt(L.loops, t, fps);
  ax += (kf.x + lp.x) * W;
  ay += (kf.y + lp.y) * H;
  asc *= kf.s * (1 + lp.s);
  arot += kf.r + lp.r;
  aop *= kf.o;
  // zoom-blur pose swap: the new image punches in out of a blur (2-3 frames)
  let swBlur = 0;
  if (swapBlur && swapAge < 3 / fps) {
    const f = Math.round(swapAge * fps);
    swBlur = [14, 7, 2][f] ?? 0;
    asc *= [1.12, 1.05, 1.01][f] ?? 1;
  }
  if (swapPop && swapAge < 0.3) asc *= 1 + swapPop * (1 - easeOut(clamp01(swapAge / 0.3)));

  const img = staticFile(`p/${tl.slug}/${asset}.png`);
  const filters = [full && shot.dof ? `blur(${shot.dof}px)` : '', swBlur ? `blur(${swBlur}px)` : ''].filter(Boolean).join(' ');
  const copies = L.repeat ? Array.from({length: L.repeat.n}, (_, i) => i) : [0];

  const faceLayer = (iw: number, ih: number) =>
    geo && geo.faces.length > 0 ? (
      <svg viewBox={`0 0 ${iw} ${ih}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible',
        // keep the cartoon whites bright white under darkening grades
        filter: faceLift(shot, t)}}>
        {geo.faces.map((g, fi) => {
          const spec = L.faces?.find((f) => f.face === fi);
          if (spec?.hidden) return null;
          const ex = spec ? activeExpr(spec.exprs, t) : {t: 0, eyes: 'E1', mouth: 'M1', gaze: [0, 0] as [number, number]};
          if (!ex) return null;
          return <FaceOverlay key={fi} geo={g} expr={ex} seedKey={`${L.character ?? asset}-${fi}`} />;
        })}
      </svg>
    ) : null;

  const origin = `${cam.focus[0] * 100}% ${cam.focus[1] * 100}%`;
  const pv = L.pivot ?? (full ? [0.5, 0.5] : [0.5, 1]);
  if (L.kind === 'route' && L.route) {
    const R = L.route;
    const P = R.points.map(([x, y]) => [x * W, y * H]);
    const seg: number[][] = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let j = 0; j < 16; j++) {
        const u = j / 16, u2 = u * u, u3 = u2 * u;
        seg.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3)));
      }
    }
    seg.push(P[P.length - 1]);
    const lens = [0];
    for (let i = 1; i < seg.length; i++) lens.push(lens[i - 1] + Math.hypot(seg[i][0] - seg[i - 1][0], seg[i][1] - seg[i - 1][1]));
    const total = lens[lens.length - 1];
    const prog = easeInOut(clamp01((t - R.t0) / Math.max(0.05, R.t1 - R.t0)));
    const drawn = total * prog;
    let hi = seg.length - 1;
    for (let i = 1; i < seg.length; i++) if (lens[i] >= drawn) { hi = i; break; }
    const fr = (drawn - lens[hi - 1]) / Math.max(1e-6, lens[hi] - lens[hi - 1]);
    const head = [seg[hi - 1][0] + (seg[hi][0] - seg[hi - 1][0]) * fr, seg[hi - 1][1] + (seg[hi][1] - seg[hi - 1][1]) * fr];
    const dir = seg[hi][0] - seg[hi - 1][0] < 0 ? -1 : 1;
    const d = 'M' + seg.map((q) => `${q[0]},${q[1]}`).join(' L');
    const col = R.color ?? '#c0201a';
    const sw = R.width ?? 13;
    return (
      <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px) scale(${camS})`, transformOrigin: origin}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          <path d={d} fill="none" stroke="rgba(60,20,0,0.35)" strokeWidth={sw + 8} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={`${drawn} ${total + 10}`} />
          <path d={d} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${drawn} ${total + 10}`} />
          {(R.pins ?? []).map((pn, i) => {
            const age = t - pn.t;
            if (age < 0) return null;
            const sc = spring({frame: Math.round(age * fps), fps, config: {damping: 10, stiffness: 180, mass: 0.6}});
            const x = pn.at[0] * W, y = pn.at[1] * H;
            const r = pn.r ?? 26;
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}>
                <circle r={r * 1.9} fill={col} opacity={0.18 * (1 - clamp01(age / 1.2))} />
                <path d={`M0 0 C ${-r} ${-r * 1.2} ${-r} ${-r * 2.4} 0 ${-r * 2.4} C ${r} ${-r * 2.4} ${r} ${-r * 1.2} 0 0 Z`} fill={pn.color ?? col} stroke="#3a0d05" strokeWidth={3} />
                <circle cy={-r * 1.6} r={r * 0.45} fill={pn.dot ?? '#f4d27a'} />
              </g>
            );
          })}
          {R.icon && prog > 0 && prog < 0.999 && (
            <g transform={`translate(${head[0]} ${head[1] - 34}) scale(${dir} 1)`}>
              <ellipse cx={0} cy={44} rx={40} ry={8} fill="rgba(0,0,0,0.3)" />
              <path d="M-34 10 C-30 -14 -14 -22 -4 -8 C2 -26 16 -26 20 -8 L24 -14 L30 -30 L40 -32 L44 -24 L36 -22 L32 -4 C34 6 30 14 24 16 L24 40 L18 40 L18 18 L-14 18 L-16 40 L-22 40 L-22 16 C-30 16 -36 14 -34 10 Z"
                fill="#5a3418" stroke="#2a1606" strokeWidth={3} />
            </g>
          )}
        </svg>
      </AbsoluteFill>
    );
  }
  if (full && L.split) {
    // 2.5D: background moves less (parallax) and holds still; keyframes / loops / pose swaps act on the subject
    // Measured on the reference (pirates 0-36 s): background pans ~0.2-2.5 %W/s and zooms ~1-2 %/s;
    // the subject layer drifts ~2-6 %W/s, zooms ~2-5 %/s and rotates ~1-3 deg/s relative to it.
    // Reference motion = eased PULSES separated by HOLDS (measured frame by frame):
    //   settle on the cut (subject decelerates into place over ~8 frames) -> hold -> eased move on a key
    //   word (~0.5 s) -> hold. Plus a very small continuous drift so the frame is never frozen.
    const E = shot.energy ?? 1;
    const pr0 = {fgPan: 0.02, fgZoom: 0.014, fgRot: 0.9, bgPan: 0.006, bgZoom: 0.006,
      settle: 0.07, settleX: 0.035, pulse: 0.045, pulseX: 0.02, ...(shot.camera.parallax ?? {})};
    const pr = {...pr0, fgPan: pr0.fgPan * E, fgRot: pr0.fgRot * E, settle: pr0.settle * E, settleX: pr0.settleX * E,
      pulse: pr0.pulse * E, pulseX: pr0.pulseX * E};
    const dur = Math.max(0.01, shot.end - shot.start);
    const e = t - shot.start - dur / 2;
    const sd = seedOf(shot.id + 'p');
    const ang = (sd / 1000) * Math.PI * 2;
    const rs = sd % 2 ? 1 : -1;
    const sdir = (sd >> 3) % 2 ? 1 : -1;
    // settle-in on the cut
    const kSet = 1 - easeOut(clamp01((t - shot.start) / 0.45));
    // pulses on key words (camera.pulses) or one automatic pulse in longer shots
    const pulses = shot.camera.pulses?.length ? shot.camera.pulses.map((p) => p.t) : dur > 1.3 ? [shot.start + dur * 0.5] : [];
    let q = 0;
    for (const tp of pulses) q += easeInOut(clamp01((t - tp) / 0.5));
    const kb = 0.55, kfg = 1.12;
    const bS = (1 + (cam.s - 1) * kb) * (1 + pr.bgZoom * e) * (1 + pr.settle * 0.3 * kSet + pr.pulse * 0.3 * q);
    // camera part of the subject scale goes around the camera focus; the subject's own settle / pulse / drift zoom
    // and rotation go around its FEET (base), so the feet stay planted and the filled-in background never shows
    const fS = 1 + (cam.s - 1) * kfg;
    const subjS = (1 + pr.fgZoom * e) * (1 + pr.settle * kSet + pr.pulse * q);
    const bX = cam.px * W * kb - Math.cos(ang) * pr.bgPan * e * W - sdir * pr.settleX * 0.3 * kSet * W;
    const bY = cam.py * H * kb;
    const fX = cam.px * W * kfg + Math.cos(ang) * pr.fgPan * e * W + sdir * (pr.settleX * kSet - pr.pulseX * q) * W;
    // grounded: the subject never moves vertically on its own (no floating); motion is sideways
    const fY = cam.py * H * kfg;
    const fR = 0;
    const subjR = rs * (pr.fgRot * e + 1.5 * E * kSet);
    const base = L.base ?? [0.5, 0.95];
    // continuous 'alive' motion of the subject: slow sway about the feet + breathing scale.
    // Pivot = base (feet), so the character never floats; scaled by energy and L.sway (0 turns it off).
    const swE = E * (L.sway ?? 1);
    const ph = (sd % 628) / 100, ts = t - shot.start;
    const swayR = swE * 2.0 * Math.sin((2 * Math.PI * ts) / 1.5 + ph);
    const swayS = 1 + swE * 0.02 * Math.sin((2 * Math.PI * ts) / 1.2 + ph * 1.3);
    const swayX = swE * 0.006 * W * Math.sin((2 * Math.PI * ts) / 3.1 + ph * 0.7);
    // pose swap that keeps the first image's background: the new pose's cut-out is moved and scaled so its
    // face lands where the original face was (same place, new pose)
    const keep = !!activeSwap?.keepBg;
    const bg = staticFile(`p/${tl.slug}/${keep ? L.asset : asset}__bg.png`);
    const fg = staticFile(`p/${tl.slug}/${asset}__fg.png`);
    let mT = '';
    let mO = '50% 50%';
    const ga = tl.faces[L.asset]?.faces?.[0];
    const gb = geo?.faces?.[0];
    const ba = tl.boxes?.[L.asset];
    const bb = tl.boxes?.[asset];
    if (keep && activeSwap?.matchBody && ba && bb) {
      // align the new pose's feet AND height with the original subject (no floating, same size)
      const k = (ba[3] - ba[1]) / Math.max(0.01, bb[3] - bb[1]);
      const bcx = (bb[0] + bb[2]) / 2, acx = (ba[0] + ba[2]) / 2;
      mO = `${bcx * 100}% ${bb[3] * 100}%`;
      mT = `translate(${(acx - bcx) * W}px, ${(ba[3] - bb[3]) * H}px) scale(${k})`;
    } else if (keep && activeSwap?.matchFace && ga && gb && geo) {
      const iw = geo.w, ih = geo.h;
      const k = ga.faceW / Math.max(1, gb.faceW);
      mO = `${(gb.center[0] / iw) * 100}% ${(gb.center[1] / ih) * 100}%`;
      mT = `translate(${((ga.center[0] - gb.center[0]) / iw) * W}px, ${((ga.center[1] - gb.center[1]) / ih) * H}px) scale(${k})`;
    }
    const zf = activeSwap?.zoom ?? 1;
    return (
      <AbsoluteFill style={{opacity: (L.opacity ?? 1) * aop}}>
        <AbsoluteFill style={{transform: `translate(${bX}px, ${bY}px) scale(${bS * 1.06 * zf})`, transformOrigin: origin,
          filter: [shot.dof ? `blur(${shot.dof}px)` : '', swBlur ? `blur(${swBlur}px)` : ''].filter(Boolean).join(' ') || undefined}}>
          <Img src={bg} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </AbsoluteFill>
        <AbsoluteFill style={{transform: `translate(${fX}px, ${fY}px) rotate(${fR}deg) scale(${fS * zf})`, transformOrigin: origin}}>
          <AbsoluteFill style={{filter: swBlur ? `blur(${swBlur}px)` : undefined, transform: `translate(${ax}px, ${ay}px) rotate(${arot}deg) scale(${asc})`,
            transformOrigin: `${base[0] * 100}% ${base[1] * 100}%`}}>
            <AbsoluteFill style={{transform: `translate(${swayX}px, 0px) rotate(${swayR + subjR}deg) scale(${swayS * subjS})`,
              transformOrigin: `${base[0] * 100}% ${base[1] * 100}%`}}>
            <AbsoluteFill style={{transform: mT || undefined, transformOrigin: mO}}>
              <Img src={fg} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              {faceLayer(geo?.w ?? W, geo?.h ?? H)}
            </AbsoluteFill>
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (full) {
    return (
      <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px) scale(${camS})`, transformOrigin: origin, opacity: (L.opacity ?? 1) * aop}}>
        <AbsoluteFill style={{filter: filters || undefined, transform: `translate(${ax}px, ${ay}px) rotate(${arot}deg) scale(${asc})`,
          transformOrigin: `${pv[0] * 100}% ${pv[1] * 100}%`}}>
          <Img src={img} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          {faceLayer(geo?.w ?? W, geo?.h ?? H)}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // cut-out: positioned by centre x, bottom y, height h (fractions of the frame)
  const iw = geo?.w ?? 1000;
  const ih = geo?.h ?? 1000;
  const hPx = (L.h ?? 0.6) * H;
  const wPx = hPx * (iw / ih);
  return (
    <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px) scale(${camS})`, transformOrigin: origin, opacity: (L.opacity ?? 1) * aop}}>
      {copies.map((ci) => {
        const rp = L.repeat;
        const delay = rp ? ci * (rp.every ?? 0.25) : 0;
        let cy = ay, cop = 1;
        if (rp && an?.type === 'drop') {
          const dt = t - an.t - delay;
          const p = clamp01(dt / (an.dur ?? 0.35));
          cy = (dt < 0 ? -H : -H * 0.9 * (1 - Easing.in(Easing.quad)(p))) + (kf.y + lp.y) * H;
        } else if (rp && an?.type === 'pop') {
          const dt = t - an.t - delay;
          cop = dt < 0 ? 0 : 1;
        }
        const jx = rp ? (rp.dx ?? 0.1) * ci * W : 0;
        const jy = rp ? (rp.dy ?? 0) * ci * H : 0;
        const js = rp?.scaleJitter ? 1 + Math.sin(ci * 9.7) * rp.scaleJitter : 1;
        const left = (L.x ?? 0.5) * W - wPx / 2 + jx;
        const top = (L.y ?? 0.92) * H - hPx + jy;
        return (
          <div key={ci} style={{position: 'absolute', left, top, width: wPx, height: hPx, opacity: cop, filter: swBlur ? `blur(${swBlur}px)` : undefined,
            transform: `translate(${ax}px, ${cy}px) rotate(${arot}deg) scale(${asc * js}) scaleX(${L.flip ? -1 : 1})`, transformOrigin: `${pv[0] * 100}% ${pv[1] * 100}%`}}>
            {(L.shadow ?? L.kind === 'char') && (
              <div style={{position: 'absolute', left: '15%', width: '70%', bottom: -hPx * 0.015, height: hPx * 0.04, borderRadius: '50%',
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)', filter: 'blur(6px)'}} />
            )}
            <Img src={img} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.28))'}} />
            {faceLayer(iw, ih)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Shot: React.FC<{shot: ShotT; next?: ShotT; tl: Timeline}> = ({shot, next, tl}) => {
  const frame = useCurrentFrame();
  const {fps, width: W} = useVideoConfig();
  const tRel = frame / fps;
  const t = shot.start + tRel;
  const cam = cameraAt(shot, tRel);
  const gname = shot.gradeFlip && t >= shot.gradeFlip.t ? shot.gradeFlip.to : shot.grade;
  const g = grade(gname);
  const nFrames = Math.round((shot.end - shot.start) * fps);
  // blur-whip: 2 frames out (this shot's tail, if the next shot whips in) + 3 frames in
  let whip = 0, wdir = 1;
  if (shot.transition === 'whip' && frame < 3) whip = [1, 0.6, 0.25][frame];
  if (next?.transition === 'whip' && frame >= nFrames - 2) {
    whip = frame === nFrames - 1 ? 1 : 0.5;
    wdir = -1;
  }
  // zoom-blur: punch in out of a blur (into this shot) / punch through a blur (out of this shot)
  let zb = 0, zs = 1;
  if (shot.transition === 'zoomblur' && frame < 3) { zb = [16, 8, 3][frame]; zs = [1.22, 1.09, 1.03][frame]; }
  if ((shot.exit === 'zoomblur' || next?.transition === 'zoomblur') && frame >= nFrames - 2) {
    const k = frame - (nFrames - 2);
    zb = Math.max(zb, [8, 16][k]); zs *= [1.08, 1.2][k];
  }
  // rotation needs a little overscan so the frame edges never show
  const over = 1 + Math.min(0.08, Math.abs(cam.rot) * 0.025);
  const fid = `wb-${shot.id}`;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      {whip > 0 && (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={fid} x="-20%" y="0" width="140%" height="100%"><feGaussianBlur stdDeviation={`${70 * whip} 0`} /></filter>
        </svg>
      )}
      <AbsoluteFill style={{filter: whip > 0 ? `url(#${fid})` : zb > 0 ? `blur(${zb}px)` : undefined,
        transform: `${whip > 0 ? `translateX(${wdir * whip * W * 0.06}px) scale(1.04) ` : ''}scale(${zs})`}}>
        <AbsoluteFill style={{filter: g.filter, transform: `rotate(${cam.rot}deg) scale(${over})`, transformOrigin: '50% 45%'}}>
          {shot.layers.map((L, i) => <LayerView key={i} L={L} shot={shot} t={t} tl={tl} cam={cam} />)}
        </AbsoluteFill>
        <AbsoluteFill style={{backgroundColor: g.tint, opacity: g.tintOpacity, mixBlendMode: g.blend as React.CSSProperties['mixBlendMode']}} />
        <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 62% at 50% 45%, rgba(0,0,0,0) 35%, rgba(0,0,0,${shot.vignette ?? 0.75}) 100%)`}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
