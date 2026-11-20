// QA sheet: every imported asset (Poly Haven / Sketchfab) on a toon floor at its fitted size, plus the cast with the
// new wig and tricorn. Not part of the film.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Asset } from "../inkbeat/core/asset";
import { Character3D } from "../inkbeat/char/Character3D";
import { useFonts } from "../inkbeat/core/frame";
import { boxG, Label, M } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { FRANKLIN, GRUMP, MESSENGER, PSYCH, RIVAL, RIVAL_HAT, STUDENT, YOU } from "./cast";
import { FIT } from "./assets";

const NAMES = Object.keys(FIT);
export const AssetSheet: React.FC = () => {
  const ready = useFonts();
  if (!ready) return <AbsoluteFill style={{ background: "#222" }} />;
  const m = moodOf("day");
  const cam = { pos: [0, 7.5, 9.5] as V3, look: [0, 0.4, 0.2] as V3, fov: 50 };
  const cast = [FRANKLIN, RIVAL, RIVAL_HAT, MESSENGER, PSYCH, STUDENT, YOU, GRUMP];
  return (
    <AbsoluteFill style={{ background: "#222" }}>
      <View mood={m} cam={cam} t={0} focus={[0, 0.5, 0]} blur={0} sky fogK={0}>
        <M g={boxG(12, 0.1, 12)} c="#c8b898" tex="planks" p={[0, -0.05, 0]} />
        {NAMES.map((n, i) => {
          const x = -3.2 + (i % 5) * 1.6, z = -2.6 + Math.floor(i / 5) * 1.6;
          return (
            <group key={n}>
              <Asset film="franklin" name={n} p={[x, 0, z]} {...FIT[n]} />
              <Label text={n} p={[x, 0.02, z + 0.62]} r={[-Math.PI / 2, 0, 0]} w={1.0} h={0.22} fg="#111" bg="#f4f0e6" />
            </group>
          );
        })}
        {cast.map((c, i) => (
          <Character3D key={i} {...c} position={[-3.5 + i * 1.0, 0, 4.0]} yaw={0} t={0} />
        ))}
      </View>
    </AbsoluteFill>
  );
};
