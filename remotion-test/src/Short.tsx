import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import "@fontsource/poppins/latin-800.css";
import { World } from "./World";
import { WORDS } from "./captions";

const fontFamily = "Poppins";

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const w = WORDS.find((x) => t >= x.start && t < x.end);
  if (!w) return null;
  // tiny pop-in on each new word
  const k = Math.min(1, (t - w.start) * 12);
  const scale = 0.9 + 0.1 * k;
  return (
    <div
      style={{
        position: "absolute",
        top: 1222 - 112,
        width: "100%",
        textAlign: "center",
        fontFamily,
        fontWeight: 800,
        fontSize: 112,
        color: "white",
        WebkitTextStroke: "26px black",
        paintOrder: "stroke fill",
        textShadow: "0 6px 14px rgba(0,0,0,.55)",
        transform: `scale(${scale})`,
        letterSpacing: -1,
      }}
    >
      {w.text}
    </div>
  );
};

export const Short: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#141a3a" }}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true }}
        shadows
      >
        <World />
      </ThreeCanvas>
      {/* soft vignette: corners ~20% darker, like the measured 0.79 ratio */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(5,8,25,.45) 100%)",
        }}
      />
      <Caption />
    </AbsoluteFill>
  );
};
