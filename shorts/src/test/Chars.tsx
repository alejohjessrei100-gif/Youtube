import React, { useEffect, useRef } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { Pen, bodyFront, bodySide, Outfit, FrontOpts, fxJar, fxEar, fxPaper, fxSmoke } from "../videos/ear/toon";
import { CAST } from "../videos/ear/cast";
const items: [Outfit, FrontOpts, boolean?][] = [
  [CAST.jenkins, { mode: "stand", expr: "grin" }],
  [CAST.jenkinsB, { mode: "stand", expr: "stern", pose: "jar" }],
  [CAST.guard, { mode: "stand", expr: "stern", pose: "sword", k: 0 }],
  [CAST.guard, { mode: "stand", expr: "grin", pose: "sword", k: 1 }],
  [CAST.pm, { mode: "stand", expr: "nervous", pose: "shrug", k: 1 }],
  [CAST.mp(0), { mode: "stand", expr: "laugh", pose: "up", k: 0.3 }],
  [CAST.mp(1), { mode: "sit", expr: "neutral" }],
  [CAST.smuggler(0), { mode: "stroll", expr: "nervous", pose: "crate", phase: 0.2 }],
  [CAST.guardNight, { mode: "stand", expr: "stern", pose: "lantern" }],
  [CAST.historian, { mode: "stand", expr: "grin", pose: "quill", k: 0.3 }],
  [CAST.visitor(0), { mode: "stand", expr: "smile", pose: "point" }],
  [CAST.visitor(3), { mode: "stand", expr: "smile_closed" }],
  [CAST.jenkinsB, { mode: "stand", expr: "pained", pose: "cover" }],
  [CAST.gunner(0), { mode: "stand", expr: "grin" }],
  [CAST.citizen(1), { mode: "stroll", expr: "neutral", phase: 0.4 }],
];
export const Chars: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = React.useState(() => delayRender("chars"));
  useEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#cfe3f2"; g.fillRect(0, 0, 1800, 2000);
    items.forEach(([o, f, side], i) => {
      g.setTransform(0.6, 0, 0, 0.6, (i % 5) * 360, Math.floor(i / 5) * 620);
      if (side) bodySide(new Pen(g), o, {}); else bodyFront(new Pen(g), o, { seed: i + 1, ...f });
    });
    g.setTransform(1, 0, 0, 1, 0, 1860); fxJar(new Pen(g), 0);
    g.setTransform(0.6, 0, 0, 0.6, 320, 1860); fxEar(new Pen(g));
    g.setTransform(0.5, 0, 0, 0.5, 480, 1860); fxPaper(new Pen(g), 1);
    g.setTransform(0.5, 0, 0, 0.5, 620, 1860); fxSmoke(new Pen(g), 0.4);
    continueRender(h);
  }, [h]);
  return <AbsoluteFill style={{ background: "#fff" }}><canvas ref={ref} width={1800} height={2300} /></AbsoluteFill>;
};
