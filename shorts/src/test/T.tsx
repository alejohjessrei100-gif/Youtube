import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect } from "postprocessing";
import { useMemo } from "react";
const Post = () => { const t = useMemo(() => new ToneMappingEffect(), []); return <EffectComposer multisampling={4}><primitive object={t} /></EffectComposer>; };
export const T: React.FC<{ post: boolean }> = ({ post }) => (
  <AbsoluteFill style={{ background: "#cfe3f2" }}>
    <ThreeCanvas width={1080} height={1920} camera={{ fov: 40, position: [0, 0, 5] }}>
      <mesh rotation={[0.5, 0.6, 0]}><boxGeometry args={[1.5, 1.5, 1.5]} /><meshBasicMaterial color="red" /></mesh>
      {post ? <Post /> : null}
    </ThreeCanvas>
  </AbsoluteFill>
);
