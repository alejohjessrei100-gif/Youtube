import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer, Bloom, Vignette, HueSaturation, BrightnessContrast, N8AO, SMAA } from "@react-three/postprocessing";
import "@fontsource/poppins/latin-800.css";
import { World } from "./World";
import { WORDS } from "./captions";

// Caption spec measured from the reference: white bold rounded sans, black
// stroke + soft shadow, centered ~70% down the frame, one word at a time.
const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const w = WORDS.find((x) => t >= x.start && t < x.end);
  if (!w) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 1290,
        width: "100%",
        textAlign: "center",
        fontFamily: "Poppins",
        fontWeight: 800,
        fontSize: 82,
        color: "white",
        WebkitTextStroke: "16px #000",
        paintOrder: "stroke fill",
        textShadow: "0 4px 10px rgba(0,0,0,.6)",
        letterSpacing: -0.5,
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
      <ThreeCanvas width={width} height={height} gl={{ antialias: true }} shadows dpr={1}>
        <World />
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={0.8} intensity={2.2} distanceFalloff={0.6} quality="medium" />
          <Bloom intensity={0.6} luminanceThreshold={0.85} luminanceSmoothing={0.15} mipmapBlur />
          <HueSaturation saturation={0.06} />
          <BrightnessContrast contrast={0.08} />
          <Vignette offset={0.35} darkness={0.55} />
          <SMAA />
        </EffectComposer>
      </ThreeCanvas>
      <Caption />
    </AbsoluteFill>
  );
};
