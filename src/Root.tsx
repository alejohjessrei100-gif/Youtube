import React from "react";
import { Composition } from "remotion";
import { Demo, DEMO_MOODS } from "./demo/Demo";
import { DemoCast } from "./demo/DemoCast";
import { DemoMove, MOVE_FRAMES } from "./demo/DemoMove";
import { SUB } from "./inkbeat/core/frame";
import { StyleCloseUp, StyleLineup, StyleTrio } from "./demo/StyleSheet";
import { STYLES } from "./styles/styles";
import { FILM_FRAMES, Film } from "./film/Film";
import { BEIRUT_FRAMES, Beirut } from "./beirut/Beirut";
import { ZIDANE_FRAMES, Zidane } from "./zidane/Zidane";
import { POISON_FRAMES, Poison } from "./poison/Poison";

// DemoHero: a low hero framing with foreground props. Demo: one still. Demo-<mood>: the same frame in each act light. DemoWide: the whole set.
// DemoCast: the three example characters in a row (a landscape family sheet).
// DemoMove: a 3 s beat-rig move (sharp). DemoMoveSub: the same at SUB × fps for motion blur (average with ffmpeg tmix).
export const Root: React.FC = () => (
  <>
    <Composition id="KingsPoison" component={Poison} durationInFrames={POISON_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ZidaneRedCard" component={Zidane} durationInFrames={ZIDANE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BeirutCamp" component={Beirut} durationInFrames={BEIRUT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SameIsland" component={Film} durationInFrames={FILM_FRAMES} fps={30} width={1080} height={1920} />
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
    <Composition id="DemoMove" component={DemoMove} durationInFrames={MOVE_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ sub: false }} />
    <Composition id="DemoMoveSub" component={DemoMove} durationInFrames={MOVE_FRAMES * SUB} fps={30 * SUB} width={1080} height={1920} defaultProps={{ sub: true }} />
  </>
);
