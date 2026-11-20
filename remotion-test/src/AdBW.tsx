// Black-and-white version of the 3D-Animation ad, in the visual language of the
// minimalistic-graphics skill: pure black, hairline white strokes, one solid white dot,
// one quiet lowercase line of text, soft eased motion. Timed to the same narration.
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";

export const BW_FPS = 30;
export const BW_DURATION = 1012; // 33.7 s

const FG = "#f4f4f4";
const SOFT = "#bdbdbd";
const FONT = "Poppins, sans-serif";
const SW = 2.6;

// scene boundaries (frames) — same as the colour version
const S = {
  hook: [0, 99],
  intro: [99, 219],
  demo: [219, 361],
  how: [361, 612],
  no: [612, 721],
  price: [721, 877],
  cta: [877, 1012],
} as const;

/* ---------------------------------------------------------------- helpers */

const eo3 = Easing.bezier(0.215, 0.61, 0.355, 1); // ease-out cubic
const eio3 = Easing.inOut(Easing.cubic);
const ramp = (f: number, a: number, b: number, easing?: (t: number) => number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Scene: React.FC<{ len: number; fadeIn?: boolean; fadeOut?: number; children: React.ReactNode }> = ({
  len,
  fadeIn = true,
  fadeOut = 6,
  children,
}) => {
  const f = useCurrentFrame();
  const a = (fadeIn ? ramp(f, 0, 6) : 1) * (1 - ramp(f, len - fadeOut, len));
  return <AbsoluteFill style={{ opacity: a }}>{children}</AbsoluteFill>;
};

type Line = { t: string; from: number; to?: number };

// one quiet lowercase line at a time, 236 px from the top like the skill
const Cap: React.FC<{ lines: Line[] }> = ({ lines }) => {
  const f = useCurrentFrame();
  return (
    <>
      {lines.map((l, i) => {
        const to = l.to ?? 1e9;
        const a = ramp(f, l.from, l.from + 6) * (1 - ramp(f, to - 5, to));
        if (a <= 0) return null;
        const y = (1 - ramp(f, l.from, l.from + 12, eo3)) * 16;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 100,
              width: 880,
              top: 236,
              textAlign: "center",
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: 56,
              lineHeight: 1.2,
              letterSpacing: "-0.005em",
              color: FG,
              opacity: a,
              transform: `translateY(${y}px)`,
            }}
          >
            {l.t}
          </div>
        );
      })}
    </>
  );
};

const Fade: React.FC<{ at: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  y = 18,
  children,
  style,
}) => {
  const f = useCurrentFrame();
  const k = ramp(f, at, at + 14, eo3);
  return (
    <div style={{ opacity: k, transform: `translateY(${(1 - k) * y}px)`, ...style }}>{children}</div>
  );
};

/* ------------------------------------------------- steps + dot (the motif) */

type Geo = { xs: number[]; tops: number[]; bw: number; R: number };
const mkGeo = (n: number, LX: number, RX: number, yBase: number, yTop: number): Geo => {
  const bw = Math.min(116, ((RX - LX) / n) * 0.77);
  const pitch = (RX - LX - bw) / (n - 1);
  return {
    xs: [...Array(n)].map((_, k) => LX + bw / 2 + k * pitch),
    tops: [...Array(n)].map((_, k) => yBase - (k * (yBase - yTop)) / (n - 1)),
    bw,
    R: 31,
  };
};

const Steps: React.FC<{ g: Geo; rise: number[]; opacity?: number }> = ({ g, rise, opacity = 1 }) => {
  const f = useCurrentFrame();
  return (
    <g fill="none" stroke={FG} strokeWidth={SW} opacity={opacity}>
      {g.xs.map((x, k) => (
        <rect
          key={k}
          x={x - g.bw / 2}
          y={lerp(1960, g.tops[k], ramp(f, rise[k], rise[k] + 9, eo3))}
          width={g.bw}
          height={1700}
        />
      ))}
    </g>
  );
};

const HOP = 9; // frames in the air
// dot pops in on step 0, then hops onto each next step at hop[k]
const Dot: React.FC<{ g: Geo; appear: number; hop: number[] }> = ({ g, appear, hop }) => {
  const f = useCurrentFrame();
  const { R } = g;
  if (f < appear) return null;
  let x = g.xs[0];
  let y = g.tops[0] - R;
  let sx = 1;
  let sy = 1;
  const ta = f - appear;
  const pop = ta < 5 ? lerp(0, 2.1, ta / 5) : ta < 13 ? lerp(2.1, 1, eio3((ta - 5) / 8)) : 1;
  sx = sy = pop;
  for (let k = 1; k < g.xs.length; k++) {
    const th = hop[k];
    if (f < th) break;
    const t = (f - th) / HOP;
    const y0 = g.tops[k - 1] - R;
    const y1 = g.tops[k] - R;
    if (t < 1) {
      const peak = Math.min(y0, y1) - 120;
      x = lerp(g.xs[k - 1], g.xs[k], t);
      y = t < 0.5 ? lerp(y0, peak, 1 - (1 - t * 2) ** 2) : lerp(peak, y1, ((t - 0.5) * 2) ** 2);
      sx = 0.9;
      sy = 1.12;
      break;
    }
    x = g.xs[k];
    y = y1;
    const tl = f - (th + HOP);
    const wob = Math.exp(-tl / 3.2) * Math.cos(tl * 0.75);
    sy = 1 - 0.26 * wob;
    sx = 1 + 0.22 * wob;
  }
  return <circle cx={x} cy={y} r={R} fill={FG} transform={`translate(${x} ${y}) scale(${sx} ${sy}) translate(${-x} ${-y})`} />;
};

// pulse ring + dashed orbit + ellipse ring + sparks, ported from the skill's payoff
const Payoff: React.FC<{ id: string; cx: number; cy: number; at: number; k?: number }> = ({ id, cx, cy, at, k = 1 }) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0) return null;
  const pulse = ramp(f, at, at + 18, Easing.out(Easing.quad));
  const orbit = ramp(f, at + 1.5, at + 18, Easing.inOut(Easing.quad));
  const ring = ramp(f, at + 5, at + 23, Easing.inOut(Easing.quad));
  const rot = (f - at) * (40 / 48);
  return (
    <g>
      <defs>
        <mask id={`${id}-o`} maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920">
          <circle cx={cx} cy={cy} r={140 * k} fill="none" stroke="#fff" strokeWidth={14}
            strokeDasharray={880 * k} strokeDashoffset={880 * k * (1 - orbit)} transform={`rotate(-90 ${cx} ${cy})`} />
        </mask>
        <mask id={`${id}-e`} maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920">
          <ellipse cx={cx} cy={cy} rx={220 * k} ry={46 * k} fill="none" stroke="#fff" strokeWidth={14}
            strokeDasharray={1000 * k} strokeDashoffset={1000 * k * (1 - ring)} />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={34 * (1 + 3.2 * pulse)} fill="none" stroke={FG} strokeWidth={3} opacity={0.9 * (1 - pulse)} />
      <circle cx={cx} cy={cy} r={140 * k} fill="none" stroke={FG} strokeWidth={2} strokeDasharray="5 9"
        mask={`url(#${id}-o)`} transform={`rotate(${rot} ${cx} ${cy})`} />
      <ellipse cx={cx} cy={cy} rx={220 * k} ry={46 * k} fill="none" stroke={SOFT} strokeWidth={2} mask={`url(#${id}-e)`} />
      {[...Array(22)].map((_, i) => {
        const a = (i / 22) * Math.PI * 2 + (i % 2) * 0.12;
        const d = (190 + (i % 4) * 34) * k;
        const e = ramp(f, at + 1.5, at + 16, Easing.out(Easing.cubic));
        const op = ramp(f, at + 1.5, at + 3) * (1 - 0.65 * ramp(f, at + 16, at + 30));
        return (
          <circle key={i} cx={cx + Math.cos(a) * d * e} cy={cy + Math.sin(a) * d * e} r={i % 3 ? 4 : 6} fill={FG} opacity={op} />
        );
      })}
    </g>
  );
};

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
    {children}
  </svg>
);

/* ---------------------------------------------------------------- scenes */

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const g = mkGeo(4, 137, 853, 1240, 520);
  const hop = [0, 14, 22, 30];
  const rise = [4, 8, 16, 24];
  const TP = 39;
  const last = g.tops[3] - g.R;
  return (
    <Scene len={S.hook[1]} fadeIn={false}>
      <Cap lines={[{ t: "this is your opportunity", from: 0, to: 40 }, { t: "to earn money online.", from: 40 }]} />
      <Svg>
        <Steps g={g} rise={rise} opacity={1 - 0.68 * ramp(f, TP + 3, TP + 20)} />
        <Dot g={g} appear={2} hop={hop} />
        <Payoff id="h" cx={g.xs[3]} cy={last} at={TP} />
      </Svg>
    </Scene>
  );
};

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const cols = [350, 540, 730];
  const rows = [650, 960, 1270]; // phone centres
  const W = 150, H = 266;
  const focus = ramp(f, 70, 92, eio3);
  return (
    <Scene len={S.intro[1] - S.intro[0]}>
      <Cap
        lines={[
          { t: "animated story shorts", from: 10, to: 34 },
          { t: "are everywhere.", from: 34, to: 70 },
          { t: "now you can make them.", from: 70 },
        ]}
      />
      <Svg>
        {rows.flatMap((cy, r) =>
          cols.map((cx, c) => {
            const idx = r * 3 + c;
            const center = idx === 4;
            const a = ramp(f, 14 + idx * 4, 26 + idx * 4, eo3);
            const dim = center ? 1 : 1 - 0.8 * focus;
            const s = (center ? 1 + 0.9 * focus : 1) * (0.9 + 0.1 * a);
            return (
              <g key={idx} opacity={a * dim} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
                <rect x={cx - W / 2} y={cy - H / 2} width={W} height={H} rx={26} fill="none" stroke={FG} strokeWidth={SW} />
                <path d={`M ${cx - 14} ${cy - 20} L ${cx + 18} ${cy} L ${cx - 14} ${cy + 20} Z`} fill="none" stroke={FG} strokeWidth={SW} strokeLinejoin="round" />
              </g>
            );
          })
        )}
        {f >= 78 && (
          <>
            <circle cx={540} cy={960} r={31 * ramp(f, 78, 90, Easing.out(Easing.back(2)))} fill={FG} />
            <Payoff id="i" cx={540} cy={960} at={80} k={0.8} />
          </>
        )}
      </Svg>
    </Scene>
  );
};

const Demo: React.FC = () => {
  const f = useCurrentFrame();
  const len = S.demo[1] - S.demo[0];
  const k = ramp(f, 0, 16, eo3);
  return (
    <Scene len={len}>
      <Cap lines={[{ t: "this is what it makes.", from: 0, to: 62 }, { t: "made with 3d-animation.", from: 62 }]} />
      <div
        style={{
          position: "absolute",
          left: 220,
          top: 330 + (1 - k) * 36,
          width: 640,
          height: 1138,
          opacity: k,
          borderRadius: 66,
          border: `${SW}px solid ${FG}`,
          padding: 14,
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: "#000" }}>
          <OffthreadVideo
            src={staticFile("museum10.mp4")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            volume={interpolate(f, [0, 6, len - 14, len - 4], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          />
        </div>
      </div>
    </Scene>
  );
};

const How: React.FC = () => {
  const f = useCurrentFrame();
  const text = "a guard sees a crooked painting...";
  const typed = text.slice(0, Math.max(0, Math.floor((f - 10) / 1.4)));
  const cursor = Math.floor(f / 8) % 2 === 0 ? "|" : "";
  const labels = ["script", "characters", "town", "voice", "captions", "video"];
  const g = mkGeo(6, 110, 970, 1380, 700);
  const word = [62, 100, 130, 162, 181, 226]; // frame each word is spoken
  const hop = word.map((w) => w - HOP);
  const rise = word.map((w, k) => (k === 0 ? w - 8 : w - HOP - 6));
  const boxA = ramp(f, 4, 16, eo3) * (1 - 0.7 * ramp(f, 52, 70));
  return (
    <Scene len={S.how[1] - S.how[0]}>
      <Cap lines={[{ t: "type your idea.", from: 0, to: 40 }, { t: "claude builds the rest.", from: 40 }]} />
      <Svg>
        <rect x={140} y={330} width={800} height={110} rx={22} fill="none" stroke={FG} strokeWidth={SW} opacity={boxA} />
        <Steps g={g} rise={rise} />
        <Dot g={g} appear={word[0] - 2} hop={hop} />
        {f >= word[5] && <Payoff id="w" cx={g.xs[5]} cy={g.tops[5] - g.R} at={word[5]} k={0.9} />}
      </Svg>
      <div
        style={{
          position: "absolute",
          left: 170,
          top: 330,
          width: 740,
          height: 110,
          display: "flex",
          alignItems: "center",
          fontFamily: FONT,
          fontSize: 38,
          color: FG,
          opacity: boxA,
        }}
      >
        {typed}
        <span style={{ opacity: 0.9 }}>{cursor}</span>
      </div>
      {labels.map((l, k) => {
        const a = ramp(f, word[k] + 3, word[k] + 15, eo3);
        return (
          <div
            key={l}
            style={{
              position: "absolute",
              left: g.xs[k] - 18,
              top: g.tops[k] + 34,
              width: 36,
              fontFamily: FONT,
              fontSize: 30,
              color: SOFT,
              opacity: a,
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {l}
          </div>
        );
      })}
    </Scene>
  );
};

const NoScene: React.FC = () => {
  const f = useCurrentFrame();
  const rows: [string, number, number][] = [
    ["no animation skills.", 1, 740],
    ["no studio.", 42, 940],
    ["no software.", 72, 1140],
  ];
  return (
    <Scene len={S.no[1] - S.no[0]}>
      {rows.map(([t, at, y]) => {
        const a = ramp(f, at, at + 12, eo3);
        const strike = ramp(f, at + 14, at + 26, eio3);
        return (
          <div key={t} style={{ position: "absolute", left: 0, width: 1080, top: y, opacity: a, transform: `translateY(${(1 - a) * 18}px)` }}>
            <div style={{ position: "relative", width: 760, margin: "0 auto", textAlign: "center", fontFamily: FONT, fontSize: 74, color: lerp(1, 0, 0) ? FG : FG }}>
              <span style={{ opacity: 1 - 0.55 * strike }}>{t}</span>
              <div style={{ position: "absolute", left: 0, top: "52%", height: SW + 0.6, width: `${strike * 100}%`, background: FG }} />
            </div>
          </div>
        );
      })}
    </Scene>
  );
};

const Price: React.FC = () => {
  const f = useCurrentFrame();
  const under = ramp(f, 20, 48, eio3);
  return (
    <Scene len={S.price[1] - S.price[0]}>
      <Cap lines={[{ t: "the skill.", from: 3 }]} />
      <Fade at={15} style={{ position: "absolute", left: 0, width: 1080, top: 640, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 132, color: FG, letterSpacing: "-0.02em" }}>
        3d-animation
      </Fade>
      <Svg>
        <line x1={150} y1={840} x2={150 + 780 * under} y2={840} stroke={FG} strokeWidth={SW} />
        {f >= 80 && (
          <circle cx={540} cy={1130} r={60 + 380 * ramp(f, 80, 110, Easing.out(Easing.cubic))} fill="none" stroke={FG} strokeWidth={2.4}
            opacity={0.8 * (1 - ramp(f, 80, 110))} />
        )}
      </Svg>
      <Fade at={80} y={24} style={{ position: "absolute", left: 0, width: 1080, top: 1010, textAlign: "center", fontFamily: FONT, fontWeight: 400, fontSize: 250, color: FG, letterSpacing: "-0.03em" }}>
        $2
      </Fade>
      <Fade at={106} style={{ position: "absolute", left: 0, width: 1080, top: 1340, textAlign: "center", fontFamily: FONT, fontSize: 84, color: SOFT }}>
        ₱100
      </Fade>
    </Scene>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const dot = ramp(f, 8, 20, Easing.out(Easing.back(2)));
  const loop = (f % 54) / 54;
  return (
    <Scene len={S.cta[1] - S.cta[0]} fadeOut={14}>
      <Cap lines={[{ t: "tell claude your story.", from: 3, to: 44 }, { t: "get your video.", from: 44 }]} />
      <Svg>
        {f >= 70 && (
          <circle cx={540} cy={960} r={34 + 150 * loop} fill="none" stroke={FG} strokeWidth={2} opacity={0.5 * (1 - loop)} />
        )}
        <circle cx={540} cy={960} r={31 * dot} fill={FG} />
        {f >= 46 && <Payoff id="c" cx={540} cy={960} at={46} />}
      </Svg>
      <Fade at={40} style={{ position: "absolute", left: 0, width: 1080, top: 1220, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 70, color: FG, letterSpacing: "-0.02em" }}>
        3d-animation
      </Fade>
      <Fade at={88} y={8} style={{ position: "absolute", left: 0, width: 1080, top: 1440, textAlign: "center", fontFamily: FONT, fontSize: 28, color: SOFT }}>
        results vary. no income is guaranteed.
      </Fade>
    </Scene>
  );
};

/* ----------------------------------------------------------------- audio */

// the supplied track at 25%; dips under the sample clip so its own audio stays clear
const musicVolume = (f: number) => {
  const duck = interpolate(f, [S.demo[0] - 8, S.demo[0] + 8, S.demo[1] - 10, S.demo[1] + 6], [1, 0.4, 0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(f, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [BW_DURATION - 30, BW_DURATION], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return 0.25 * duck * fadeIn * fadeOut;
};

export const AdBW: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Audio src={staticFile("music.mp3")} volume={musicVolume} />
    <Sequence from={0} durationInFrames={S.demo[0]}>
      <Audio src={staticFile("vo.mp3")} trimAfter={S.demo[0]} />
    </Sequence>
    <Sequence from={S.demo[1]}>
      <Audio src={staticFile("vo.mp3")} trimBefore={S.demo[0]} />
    </Sequence>
    {(
      [
        [S.hook, Hook],
        [S.intro, Intro],
        [S.demo, Demo],
        [S.how, How],
        [S.no, NoScene],
        [S.price, Price],
        [S.cta, Cta],
      ] as const
    ).map(([r, C], i) => (
      <Sequence key={i} from={r[0]} durationInFrames={r[1] - r[0]}>
        <C />
      </Sequence>
    ))}
  </AbsoluteFill>
);
