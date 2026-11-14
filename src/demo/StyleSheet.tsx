// Style sheets: the five character style directions (styles/styles.ts) in one light, so they compare like for like.
//   StyleLineup: the same man drawn in every style, left (cartoony) to right (semi-realistic).
//   Style-<id>: a man, a woman and a kid in one style.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character3D, headOf } from "../inkbeat/char/Character3D";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { M, boxG } from "../inkbeat/core/kit";
import { moodOf } from "../inkbeat/core/moods";
import { aim } from "../inkbeat/core/rig";
import { View } from "../inkbeat/core/View";
import type { V3 } from "../inkbeat/types";
import { STYLES, styleOf, trioOf } from "../styles/styles";

const BG = "#1a1220";

const Floor: React.FC<{ w: number }> = ({ w }) => (
  <>
    <M g={boxG(w, 0.1, 14)} c="#c9b89c" tex="planks" p={[0, -0.05, 1.5]} />
    <M g={boxG(w, 5, 0.2)} c="#9fb6c8" tex="plaster" p={[0, 2.5, -3.2]} />
  </>
);

const labelStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translateX(-50%)",
  textAlign: "center",
  color: "#fff",
  fontFamily: "Poppins, sans-serif",
  fontWeight: 800,
  textShadow: "0 3px 0 #1b1a2a, 0 -3px 0 #1b1a2a, 3px 0 0 #1b1a2a, -3px 0 0 #1b1a2a",
  whiteSpace: "nowrap",
};

export const StyleLineup: React.FC<{ mood?: string }> = ({ mood = "day" }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const t = 1.2 + f / 30;
  const m = moodOf(mood);
  const cam = aim([0, 1.15, 8.4], [0, 1.0, 0], 34, 0.52);
  const gap = 1.6;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={cam} t={t} focus={[0, 1.1, 0]} blur={0.3} width={1920} height={1080}>
        <Floor w={18} />
        {STYLES.map((s, i) => {
          const man = trioOf(s)[0].spec;
          const p: V3 = [(i - 2) * gap, 0, 0];
          return (
            <Character3D
              key={s.id}
              {...man}
              position={p}
              yaw={-p[0] * 0.08}
              t={t + i}
              face={{ eyes: "open", mouth: "smile", brows: "neutral", blink: false }}
              pose={{ armL: [5, 0], armR: [5, 0] }}
              faceCamera={cam.pos}
            />
          );
        })}
        <CastLight at={headOf([0, 0, 0], 1.78, STYLES[2].adult)} cam={cam.pos} mood={m} />
      </View>
      {STYLES.map((s, i) => (
        <div key={s.id} style={{ ...labelStyle, left: `${50 + (i - 2) * 17.5}%`, top: 920 }}>
          <div style={{ fontSize: 34 }}>{s.name}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{s.heads}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const StyleTrio: React.FC<{ style: string; mood?: string }> = ({ style, mood = "day" }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const s = styleOf(style);
  const t = 1.2 + f / 30;
  const m = moodOf(mood);
  const cam = aim([0.2, 1.2, 5.8], [0, 0.95, 0], 34, 0.5);
  const trio = trioOf(s);
  const ROW: { p: V3; yaw: number; mouth: "smile" | "grin"; brows: "neutral" | "raised" }[] = [
    { p: [-1.15, 0, 0], yaw: 0.3, mouth: "smile", brows: "neutral" },
    { p: [0.05, 0, 0.05], yaw: 0.05, mouth: "smile", brows: "raised" },
    { p: [1.15, 0, 0.1], yaw: -0.3, mouth: "grin", brows: "raised" },
  ];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={cam} t={t} focus={[0, 1.2, 0]} blur={0.4} width={1920} height={1080}>
        <Floor w={14} />
        {trio.map((c, i) => (
          <Character3D
            key={c.key}
            {...c.spec}
            position={ROW[i].p}
            yaw={ROW[i].yaw}
            t={t + i}
            face={{ eyes: "open", mouth: ROW[i].mouth, brows: ROW[i].brows, blink: false }}
            pose={i === 0 ? { armL: [8, 8], armR: [70, 60], armRFwd: 20 } : { armL: [5, 0], armR: [5, 0] }}
            faceCamera={cam.pos}
          />
        ))}
        <CastLight at={headOf(ROW[1].p, trio[1].spec.height, trio[1].spec.build)} cam={cam.pos} mood={m} />
      </View>
      <div style={{ ...labelStyle, left: "50%", top: 40 }}>
        <div style={{ fontSize: 56 }}>{s.name}</div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>{s.heads}</div>
      </div>
    </AbsoluteFill>
  );
};

/** a medium close-up of the man and the woman in one style: arms, hands and shoulders big enough to judge */
export const StyleCloseUp: React.FC<{ style: string; mood?: string }> = ({ style, mood = "day" }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: BG }} />;
  const s = styleOf(style);
  const t = 1.2 + f / 30;
  const m = moodOf(mood);
  const [man, woman] = trioOf(s);
  const cam = aim([0.25, 1.15, 3.1], [0, 1.05, 0], 34, 0.5);
  const pm: V3 = [-0.42, 0, 0];
  const pw: V3 = [0.42, 0, 0.05];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <View mood={m} cam={cam} t={t} focus={[0, 1.2, 0]} blur={0.6} width={1080} height={1920}>
        <Floor w={10} />
        <Character3D {...man.spec} position={pm} yaw={0.35} t={t} face={{ eyes: "open", mouth: "smile", brows: "raised", blink: false }} pose={{ armL: [5, 0], armR: [62, 70], armRFwd: 28 }} faceCamera={cam.pos} />
        <Character3D {...woman.spec} position={pw} yaw={-0.35} t={t + 1} face={{ eyes: "open", mouth: "smile", brows: "neutral", blink: false }} pose={{ armL: [5, 0], armR: [5, 0] }} faceCamera={cam.pos} />
        <CastLight at={headOf(pm, man.spec.height, man.spec.build)} cam={cam.pos} mood={m} />
      </View>
      <div style={{ ...labelStyle, left: "50%", top: 60 }}>
        <div style={{ fontSize: 64 }}>{s.name}</div>
      </div>
    </AbsoluteFill>
  );
};
