// Hat check: every hat on the family's head, front / 3-4 / side / from above, a nod and a head stretch.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { aim } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import type { Hat } from "../inkbeat/types";
import { styleOf } from "../styles/styles";

const HATS: Hat[] = ["cap", "flat", "beanie", "sunhat"];
const HAIRS = ["crop", "curly", "bob", "swoop"] as const;
const spec = (hat: Hat, i: number): CharacterSpec => ({
  height: 1.74,
  build: { ...styleOf("toon").adult, shoulders: 1.1 },
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#3a6a9a", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.horn }, hair: HAIRS[i], hairColor: HAIR.espresso, hat, face: { blush: 0.3, brow: 1.25 }, seed: 8 + i },
});
/** frame = view: 0 front, 1 three-quarter, 2 side, 3 above, 4 nod + turn, 5 head stretch */
export const HatLab: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1220" }} />;
  const v = f % 6;
  const yaw = [0, 0.7, 1.5708, 0.4, 0.5, 0.3][v];
  const camY = v === 3 ? 4.2 : 1.6;
  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <View mood={moodOf("day")} cam={aim([0, camY, v === 3 ? 3.6 : 5.6], [0, 1.45, 0], 26, 0.5)} t={0} sky={false} blur={0} width={1600} height={900}>
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[20, 0.1, 20]} />
          <meshStandardMaterial color="#8a8a92" />
        </mesh>
        {HATS.map((h, i) => (
          <Character3D key={h} {...spec(h, i)} position={[-1.65 + i * 1.1, 0, 0]} yaw={yaw} t={0} face={{ eyes: "open", mouth: "smile" }} pose={{ headNod: v === 4 ? 22 : 0, headYaw: v === 4 ? 40 : 0, headTilt: v === 4 ? 12 : 0, headStretch: v === 5 ? 1.28 : 1 }} />
        ))}
      </View>
    </AbsoluteFill>
  );
};
