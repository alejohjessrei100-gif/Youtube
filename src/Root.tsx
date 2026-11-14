import React from "react";
import { Composition } from "remotion";
import { Demo, DEMO_MOODS } from "./demo/Demo";
import { DemoCast } from "./demo/DemoCast";
import { DemoMove, MOVE_FRAMES } from "./demo/DemoMove";
import { SUB } from "./inkbeat/core/frame";
import { StyleCloseUp, StyleLineup, StyleTrio } from "./demo/StyleSheet";
import { STYLES } from "./styles/styles";
import { CrewSheet, LOOK_IDS, LookDevFrame } from "./island/LookDev";
import { SAME_ISLAND_FRAMES, SameIsland } from "./island/SameIsland";

// DemoHero: a low hero framing with foreground props. Demo: one still. Demo-<mood>: the same frame in each act light. DemoWide: the whole set.
// DemoCast: the three example characters in a row (a landscape family sheet).
// DemoMove: a 3 s beat-rig move (sharp). DemoMoveSub: the same at SUB × fps for motion blur (average with ffmpeg tmix).
export const Root: React.FC = () => (
  <>
    <Composition id="SameIsland" component={SameIsland} durationInFrames={SAME_ISLAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Demo" component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: "day", wide: false }} />
    <Composition id="DemoHero" component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: "dusk", wide: false, hero: true }} />
    <Composition id="DemoWide" component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: "day", wide: true }} />
    {DEMO_MOODS.map((m) => (
      <Composition key={m} id={`Demo-${m}`} component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: m, wide: false }} />
    ))}
    <Composition id="DemoCast" component={DemoCast} durationInFrames={30} fps={30} width={1920} height={1080} defaultProps={{ mood: "day" }} />
    <Composition id="StyleLineup" component={StyleLineup} durationInFrames={30} fps={30} width={1920} height={1080} defaultProps={{ mood: "day" }} />
    {STYLES.map((s) => (
      <Composition key={s.id} id={`Style-${s.id}`} component={StyleTrio} durationInFrames={30} fps={30} width={1920} height={1080} defaultProps={{ style: s.id, mood: "day" }} />
    ))}
    {STYLES.map((s) => (
      <Composition key={s.id} id={`Close-${s.id}`} component={StyleCloseUp} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ style: s.id, mood: "day" }} />
    ))}
    {LOOK_IDS.map((id) => (
      <Composition key={id} id={`Look-${id}`} component={LookDevFrame} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ shot: id }} />
    ))}
    <Composition id="LookCrew" component={CrewSheet} durationInFrames={30} fps={30} width={1920} height={1080} />
    <Composition id="DemoMove" component={DemoMove} durationInFrames={MOVE_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ sub: false }} />
    <Composition id="DemoMoveSub" component={DemoMove} durationInFrames={MOVE_FRAMES * SUB} fps={30 * SUB} width={1080} height={1920} defaultProps={{ sub: true }} />
  </>
);
