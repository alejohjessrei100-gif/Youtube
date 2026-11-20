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

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
    {children}
  </svg>
);

/* ---------------------------------------------------------------- scenes */

// Hook: a hairline coin draws itself, spins, and ripples out
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 540, cy = 900, R = 230;
  const draw1 = ramp(f, 0, 22, eio3);
  const draw2 = ramp(f, 8, 28, eio3);
  const glyph = ramp(f, 22, 38, eo3);
  const spinT = Math.max(0, f - 36);
  const sx = Math.max(0.06, Math.abs(Math.cos(spinT * 0.13)));
  const spinIn = ramp(f, 36, 50);
  const scaleX = lerp(1, sx, spinIn);
  return (
    <Scene len={S.hook[1]} fadeIn={false}>
      <Cap lines={[{ t: "this is your opportunity", from: 0, to: 40 }, { t: "to earn money online.", from: 40 }]} />
      <Svg>
        {[40, 56, 72].map((at, i) => {
          const k = ramp(f, at, at + 34, Easing.out(Easing.cubic));
          return f >= at ? (
            <circle key={i} cx={cx} cy={cy} r={R + 20 + 330 * k} fill="none" stroke={FG} strokeWidth={2} opacity={0.7 * (1 - k)} />
          ) : null;
        })}
        <g transform={`translate(${cx} ${cy}) scale(${scaleX} 1) translate(${-cx} ${-cy})`}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={FG} strokeWidth={SW + 1.2} pathLength={1}
            strokeDasharray={1} strokeDashoffset={1 - draw1} transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={R - 38} fill="none" stroke={SOFT} strokeWidth={SW} pathLength={1}
            strokeDasharray={1} strokeDashoffset={1 - draw2} transform={`rotate(-90 ${cx} ${cy})`} />
          <text x={cx} y={cy + 92} textAnchor="middle" fontFamily={FONT} fontWeight={400} fontSize={270} fill={FG} opacity={glyph}>
            $
          </text>
        </g>
      </Svg>
    </Scene>
  );
};

// Intro: a grid of phones appears, one steps forward and its play triangle fills
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const cols = [350, 540, 730];
  const rows = [650, 960, 1270];
  const W = 150, H = 266;
  const focus = ramp(f, 70, 92, eio3);
  const fill = ramp(f, 86, 100, eo3);
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
                <path d={`M ${cx - 14} ${cy - 20} L ${cx + 18} ${cy} L ${cx - 14} ${cy + 20} Z`}
                  fill={center ? FG : "none"} fillOpacity={center ? fill : 0} stroke={FG} strokeWidth={SW} strokeLinejoin="round" />
              </g>
            );
          })
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

// How: six cards draw in one by one, joined by a hairline line; the last card fills
const How: React.FC = () => {
  const f = useCurrentFrame();
  const text = "a guard sees a crooked painting...";
  const typed = text.slice(0, Math.max(0, Math.floor((f - 10) / 1.4)));
  const cursor = Math.floor(f / 8) % 2 === 0 ? "|" : "";
  const labels = ["script", "characters", "town", "voice", "captions", "video"];
  const word = [68, 100, 130, 162, 181, 226]; // frame each word is spoken
  const CX = 240, CW = 600, CH = 104, Y0 = 600, GAP = 148;
  const boxA = ramp(f, 4, 16, eo3) * (1 - 0.7 * ramp(f, 52, 70));
  return (
    <Scene len={S.how[1] - S.how[0]}>
      <Cap lines={[{ t: "type your idea.", from: 0, to: 40 }, { t: "claude builds the rest.", from: 40 }]} />
      <Svg>
        <rect x={140} y={330} width={800} height={110} rx={22} fill="none" stroke={FG} strokeWidth={SW} opacity={boxA} />
        {labels.map((l, k) => {
          const y = Y0 + k * GAP;
          const draw = ramp(f, word[k] - 10, word[k] + 8, eio3);
          const link = k > 0 ? ramp(f, word[k] - 16, word[k] - 4, eio3) : 0;
          const last = k === 5;
          const fill = last ? ramp(f, word[k] + 6, word[k] + 20, eo3) : 0;
          return (
            <g key={l}>
              {k > 0 && (
                <line x1={540} y1={y - (GAP - CH)} x2={540} y2={y - (GAP - CH) + (GAP - CH) * link} stroke={FG} strokeWidth={SW} />
              )}
              <rect x={CX} y={y} width={CW} height={CH} rx={26} fill="none" stroke={FG} strokeWidth={SW + (last ? 0.6 : 0)}
                pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
              {last && <rect x={CX} y={y} width={CW * fill} height={CH} rx={26} fill={FG} style={{ clipPath: "inset(0 0 0 0 round 26px)" }} />}
            </g>
          );
        })}
      </Svg>
      <div
        style={{
          position: "absolute", left: 170, top: 330, width: 740, height: 110, display: "flex", alignItems: "center",
          fontFamily: FONT, fontSize: 38, color: FG, opacity: boxA,
        }}
      >
        {typed}
        <span style={{ opacity: 0.9 }}>{cursor}</span>
      </div>
      {labels.map((l, k) => {
        const a = ramp(f, word[k], word[k] + 12, eo3);
        const last = k === 5;
        const fillK = last ? ramp(f, word[k] + 10, word[k] + 20) : 0;
        return (
          <div
            key={l}
            style={{
              position: "absolute", left: CX + 40, top: Y0 + k * GAP, height: CH, display: "flex", alignItems: "center",
              fontFamily: FONT, fontSize: 42, fontWeight: 400, letterSpacing: "0.01em", opacity: a,
              color: last && fillK > 0.5 ? "#000" : FG,
            }}
          >
            {l}
          </div>
        );
      })}
      {labels.map((l, k) => {
        const a = ramp(f, word[k], word[k] + 12, eo3);
        const last = k === 5;
        const fillK = last ? ramp(f, word[k] + 10, word[k] + 20) : 0;
        return (
          <div
            key={l + "n"}
            style={{
              position: "absolute", left: CX + CW - 90, top: Y0 + k * GAP, width: 50, height: CH, display: "flex",
              alignItems: "center", justifyContent: "flex-end", fontFamily: FONT, fontSize: 28, opacity: a * 0.9,
              color: last && fillK > 0.5 ? "#000" : SOFT,
            }}
          >
            0{k + 1}
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

// CTA: an outlined button draws itself, then fills to white
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const draw = ramp(f, 36, 64, eio3);
  const fill = ramp(f, 62, 82, eio3);
  const W = 700, H = 150, X = 190, Y = 900;
  return (
    <Scene len={S.cta[1] - S.cta[0]} fadeOut={14}>
      <Cap lines={[{ t: "tell claude your story.", from: 3, to: 44 }, { t: "get your video.", from: 44 }]} />
      <Svg>
        <defs>
          <clipPath id="btnfill">
            <rect x={X} y={Y} width={W * fill} height={H} />
          </clipPath>
        </defs>
        <rect x={X} y={Y} width={W} height={H} rx={75} fill="none" stroke={FG} strokeWidth={SW + 0.6}
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        <rect x={X} y={Y} width={W} height={H} rx={75} fill={FG} clipPath="url(#btnfill)" />
        <text x={540} y={Y + 100} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={66} fill={FG} opacity={ramp(f, 50, 64)}>
          3d-animation
        </text>
        <text x={540} y={Y + 100} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={66} fill="#000" clipPath="url(#btnfill)">
          3d-animation
        </text>
      </Svg>
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
