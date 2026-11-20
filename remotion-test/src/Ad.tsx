import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource/poppins/latin-800.css";
import "@fontsource/poppins/latin-600.css";

export const AD_FPS = 30;
export const AD_DURATION = 30 * AD_FPS;

const FONT = "Poppins, sans-serif";
const YELLOW = "#ffd23f";
const CYAN = "#3de8ff";
const PINK = "#ff4fa3";
const INK = "#0a0a14";

// scene boundaries (frames)
const S = {
  hook: [0, 100],
  intro: [100, 165],
  demo: [165, 465],
  how: [465, 600],
  no: [600, 705],
  price: [705, 825],
  cta: [825, 900],
} as const;

/* ------------------------------------------------------------ primitives */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const useIn = (delay = 0, damping = 12) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, stiffness: 160, mass: 0.7 } });
};

// scene wrapper: fade-out + slight push at the end
const Scene: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [len - 6, len], [1, 0], clamp);
  const sc = interpolate(f, [len - 6, len], [1, 1.04], clamp);
  return (
    <AbsoluteFill style={{ opacity: out, transform: `scale(${sc})` }}>{children}</AbsoluteFill>
  );
};

const Slam: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, size = 120, color = "#fff", style }) => {
  const k = useIn(delay);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.0,
        letterSpacing: -2,
        color,
        textTransform: "uppercase",
        textAlign: "center",
        opacity: Math.min(1, k * 1.6),
        transform: `translateY(${(1 - k) * 70}px) scale(${0.7 + 0.3 * k})`,
        textShadow: "0 8px 0 rgba(0,0,0,.35), 0 0 40px rgba(61,232,255,.25)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Chip: React.FC<{ children: React.ReactNode; delay: number; bg: string; fg?: string }> = ({
  children,
  delay,
  bg,
  fg = INK,
}) => {
  const k = useIn(delay, 9);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 54,
        padding: "18px 40px",
        borderRadius: 26,
        background: bg,
        color: fg,
        opacity: Math.min(1, k * 2),
        transform: `scale(${0.4 + 0.6 * k}) rotate(${(1 - k) * -8}deg)`,
        boxShadow: "0 10px 0 rgba(0,0,0,.35)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------ background */

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const shift = (f * 0.6) % 120;
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 90% 60% at 50% 20%, #2a1a6b 0%, #14103a 45%, #090a1c 100%)",
      }}
    >
      {/* perspective grid floor */}
      <AbsoluteFill style={{ perspective: 900, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: "-50%",
            width: "200%",
            top: "58%",
            height: "100%",
            transform: "rotateX(68deg)",
            transformOrigin: "50% 0%",
            backgroundImage:
              "linear-gradient(rgba(61,232,255,.35) 2px, transparent 2px), linear-gradient(90deg, rgba(255,79,163,.30) 2px, transparent 2px)",
            backgroundSize: "120px 120px",
            backgroundPosition: `0 ${shift}px`,
            maskImage: "linear-gradient(to bottom, black, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
      </AbsoluteFill>
      {/* drifting orbs */}
      {[0, 1, 2, 3].map((i) => {
        const x = 540 + Math.sin(f / 70 + i * 1.7) * (360 - i * 40);
        const y = 420 + i * 340 + Math.cos(f / 90 + i) * 80;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 220,
              top: y - 220,
              width: 440,
              height: 440,
              borderRadius: "50%",
              background: [PINK, CYAN, YELLOW, "#7b5cff"][i],
              opacity: 0.11,
              filter: "blur(70px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------- coins */

const Coin: React.FC<{ x: number; delay: number; speed: number; size: number; spin: number }> = ({
  x,
  delay,
  speed,
  size,
  spin,
}) => {
  const f = useCurrentFrame();
  const t = f - delay;
  if (t < 0) return null;
  const y = -size + t * speed;
  const sx = Math.cos((t / 30) * spin);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `scaleX(${sx})`,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill="#f5b400" stroke="#8a5a00" strokeWidth="6" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#ffe27a" strokeWidth="5" />
        <text x="50" y="66" textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize="46" fill="#8a5a00">
          $
        </text>
      </svg>
    </div>
  );
};

const CoinRain: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    {Array.from({ length: 22 }, (_, i) => (
      <Coin
        key={i}
        x={((i * 197) % 960) + 20}
        delay={(i * 7) % 48}
        speed={16 + ((i * 13) % 14)}
        size={70 + ((i * 29) % 70)}
        spin={5 + (i % 5)}
      />
    ))}
  </AbsoluteFill>
);

/* ---------------------------------------------------------------- scenes */

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + 0.025 * Math.sin(f / 4);
  return (
    <Scene len={S.hook[1] - S.hook[0]}>
      <CoinRain />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26, transform: `scale(${pulse})` }}>
        <Slam size={96} delay={2} color={CYAN}>
          this is your
        </Slam>
        <Slam size={188} delay={9} color={YELLOW}>
          opportunity
        </Slam>
        <Slam size={112} delay={18}>
          to earn money
        </Slam>
        <Slam size={150} delay={26} color={PINK}>
          online
        </Slam>
      </AbsoluteFill>
    </Scene>
  );
};

const Intro: React.FC = () => (
  <Scene len={S.intro[1] - S.intro[0]}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 60px" }}>
      <Slam size={92} delay={0} color={CYAN}>
        animated story shorts
      </Slam>
      <Slam size={92} delay={6}>
        are everywhere
      </Slam>
      <Slam size={118} delay={22} color={YELLOW} style={{ marginTop: 40 }}>
        now you can make them
      </Slam>
    </AbsoluteFill>
  </Scene>
);

const Demo: React.FC = () => {
  const f = useCurrentFrame();
  const len = S.demo[1] - S.demo[0];
  const k = useIn(0, 14);
  const float = Math.sin(f / 25) * 8;
  const tagK = useIn(14, 10);
  return (
    <Scene len={len}>
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div style={{ marginTop: 78 }}>
          <Slam size={66} color={CYAN} delay={0}>
            this is what it makes
          </Slam>
        </div>
        <div
          style={{
            marginTop: 40,
            width: 790,
            height: 1404,
            borderRadius: 78,
            padding: 22,
            background: "linear-gradient(145deg,#3a3a58,#15152a)",
            boxShadow: "0 40px 120px rgba(0,0,0,.65), 0 0 0 4px #6d6d99, 0 0 90px rgba(61,232,255,.30)",
            transform: `translateY(${(1 - k) * 260 + float}px) scale(${0.85 + 0.15 * k}) rotate(${(1 - k) * 5}deg)`,
            position: "relative",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: 58, overflow: "hidden", background: "#000" }}>
            <OffthreadVideo
              src={staticFile("museum10.mp4")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              volume={interpolate(f, [0, 6, len - 14, len - 4], [0, 1, 1, 0], clamp)}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 8,
              width: 210,
              height: 26,
              marginLeft: -105,
              borderRadius: 14,
              background: "#0a0a14",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 62,
            opacity: tagK,
            transform: `translateY(${(1 - tagK) * 40}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 60,
              color: INK,
              background: YELLOW,
              padding: "16px 44px",
              borderRadius: 30,
              boxShadow: "0 10px 0 rgba(0,0,0,.4)",
              textTransform: "uppercase",
            }}
          >
            made with 3D-Animation
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

const How: React.FC = () => {
  const f = useCurrentFrame();
  const text = "A guard notices one painting hanging crooked...";
  const typed = text.slice(0, Math.max(0, Math.floor((f - 6) / 1.6)));
  const cursor = Math.floor(f / 8) % 2 === 0 ? "|" : " ";
  const chips: [string, string][] = [
    ["Script", CYAN],
    ["Characters", PINK],
    ["Town", YELLOW],
    ["Voice", CYAN],
    ["Captions", PINK],
    ["Video", YELLOW],
  ];
  const bar = interpolate(f, [62, 125], [0, 100], { ...clamp, easing: Easing.out(Easing.cubic) });
  const boxK = useIn(0, 12);
  return (
    <Scene len={S.how[1] - S.how[0]}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
        <Slam size={78} color={CYAN}>
          you type the idea
        </Slam>
        <div
          style={{
            marginTop: 40,
            width: 900,
            minHeight: 190,
            borderRadius: 38,
            background: "#ffffff",
            padding: "38px 46px",
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 52,
            color: "#1b1b2e",
            lineHeight: 1.25,
            opacity: boxK,
            transform: `translateY(${(1 - boxK) * 50}px)`,
            boxShadow: "0 16px 0 rgba(0,0,0,.3), 0 0 70px rgba(61,232,255,.35)",
          }}
        >
          {typed}
          <span style={{ color: PINK }}>{cursor}</span>
        </div>
        <div style={{ marginTop: 70 }}>
          <Slam size={78} delay={34} color={YELLOW}>
            claude builds the rest
          </Slam>
        </div>
        <div style={{ marginTop: 50, display: "flex", flexWrap: "wrap", gap: 26, justifyContent: "center", width: 940 }}>
          {chips.map(([c, bg], i) => (
            <Chip key={c} delay={40 + i * 9} bg={bg}>
              {c}
            </Chip>
          ))}
        </div>
        <div
          style={{
            marginTop: 70,
            width: 860,
            height: 44,
            borderRadius: 22,
            background: "rgba(255,255,255,.15)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${bar}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${CYAN}, ${PINK}, ${YELLOW})`,
            }}
          />
        </div>
        <div style={{ marginTop: 18, fontFamily: FONT, fontWeight: 800, fontSize: 40, color: "#fff", opacity: 0.9 }}>
          RENDERING {Math.round(bar)}%
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

const Strike: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const f = useCurrentFrame();
  const k = useIn(delay);
  const w = interpolate(f, [delay + 14, delay + 22], [0, 100], clamp);
  return (
    <div style={{ position: "relative", opacity: Math.min(1, k * 2), transform: `scale(${0.75 + 0.25 * k})` }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 112,
          color: "#fff",
          textTransform: "uppercase",
          textAlign: "center",
          textShadow: "0 8px 0 rgba(0,0,0,.35)",
        }}
      >
        <span style={{ color: PINK }}>No </span>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          height: 16,
          width: `${w}%`,
          background: YELLOW,
          borderRadius: 8,
          transform: "rotate(-3deg)",
        }}
      />
    </div>
  );
};

const No: React.FC = () => (
  <Scene len={S.no[1] - S.no[0]}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56 }}>
      <Strike delay={2}>animation skills</Strike>
      <Strike delay={26}>studio</Strike>
      <Strike delay={50}>software</Strike>
    </AbsoluteFill>
  </Scene>
);

const Price: React.FC = () => {
  const f = useCurrentFrame();
  const k = useIn(0, 10);
  const badge = useIn(22, 8);
  const spin = Math.cos(f / 5);
  return (
    <Scene len={S.price[1] - S.price[0]}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36 }}>
        <Slam size={68} color={CYAN}>
          the skill
        </Slam>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 178,
            letterSpacing: -4,
            color: YELLOW,
            textAlign: "center",
            transform: `scale(${0.6 + 0.4 * k})`,
            opacity: Math.min(1, k * 2),
            textShadow: "0 10px 0 rgba(0,0,0,.4), 0 0 80px rgba(255,210,63,.5)",
          }}
        >
          3D-Animation
        </div>
        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignItems: "center",
            gap: 36,
            transform: `scale(${0.3 + 0.7 * badge}) rotate(${(1 - badge) * 12}deg)`,
            opacity: Math.min(1, badge * 2),
          }}
        >
          <svg width="190" height="190" viewBox="0 0 100 100" style={{ transform: `scaleX(${spin})` }}>
            <circle cx="50" cy="50" r="46" fill="#f5b400" stroke="#8a5a00" strokeWidth="6" />
            <circle cx="50" cy="50" r="34" fill="none" stroke="#ffe27a" strokeWidth="5" />
            <text x="50" y="66" textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize="46" fill="#8a5a00">
              $
            </text>
          </svg>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 150,
              color: INK,
              background: "#fff",
              padding: "10px 54px",
              borderRadius: 40,
              boxShadow: "0 14px 0 rgba(0,0,0,.4)",
              whiteSpace: "nowrap",
            }}
          >
            $2
          </div>
        </div>
        <Slam size={96} delay={34} color="#fff">
          just ₱100
        </Slam>
      </AbsoluteFill>
    </Scene>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + 0.03 * Math.sin(f / 3);
  const fine = useIn(30, 20);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "0 60px" }}>
        <Slam size={104} color="#fff">
          tell claude
        </Slam>
        <Slam size={104} color="#fff" delay={5}>
          your story
        </Slam>
        <div style={{ transform: `scale(${pulse})`, marginTop: 30 }}>
          <Slam size={110} delay={14} color={INK} style={{ background: YELLOW, padding: "22px 56px", borderRadius: 40, textShadow: "none", boxShadow: "0 14px 0 rgba(0,0,0,.4)" }}>
            get your video
          </Slam>
        </div>
        <div
          style={{
            marginTop: 70,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 64,
            color: CYAN,
            opacity: fine,
          }}
        >
          3D-Animation
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 70,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 30,
          color: "rgba(255,255,255,.7)",
          opacity: fine,
        }}
      >
        Results vary. No income is guaranteed.
      </div>
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------- audio */

const bedVolume = (f: number) => {
  // loud for hook/pitch, ducked under the sample clip's own audio
  const demoA = S.demo[0], demoB = S.demo[1];
  const duck = interpolate(f, [demoA - 8, demoA + 8, demoB - 10, demoB + 6], [1, 0.09, 0.09, 1], clamp);
  const fadeEnd = interpolate(f, [AD_DURATION - 30, AD_DURATION], [1, 0], clamp);
  return 0.55 * duck * fadeEnd;
};

/* ------------------------------------------------------------------ main */

const flash = (f: number) => {
  // white flash on every scene cut
  let a = 0;
  for (const b of [S.intro[0], S.demo[0], S.how[0], S.no[0], S.price[0], S.cta[0]]) {
    a = Math.max(a, interpolate(f, [b, b + 5], [0.55, 0], clamp));
  }
  return a;
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#090a1c" }}>
      <Background />
      <Audio src={staticFile("bed.wav")} volume={bedVolume} />
      <Sequence from={S.hook[0]} durationInFrames={S.hook[1] - S.hook[0]}>
        <Hook />
      </Sequence>
      <Sequence from={S.intro[0]} durationInFrames={S.intro[1] - S.intro[0]}>
        <Intro />
      </Sequence>
      <Sequence from={S.demo[0]} durationInFrames={S.demo[1] - S.demo[0]}>
        <Demo />
      </Sequence>
      <Sequence from={S.how[0]} durationInFrames={S.how[1] - S.how[0]}>
        <How />
      </Sequence>
      <Sequence from={S.no[0]} durationInFrames={S.no[1] - S.no[0]}>
        <No />
      </Sequence>
      <Sequence from={S.price[0]} durationInFrames={S.price[1] - S.price[0]}>
        <Price />
      </Sequence>
      <Sequence from={S.cta[0]} durationInFrames={S.cta[1] - S.cta[0]}>
        <Cta />
      </Sequence>
      <AbsoluteFill style={{ background: "#fff", opacity: flash(f), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
