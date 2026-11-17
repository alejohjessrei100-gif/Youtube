import React from "react";
import { Composition } from "remotion";
import { Demo, DEMO_MOODS } from "./demo/Demo";
import { DemoCast } from "./demo/DemoCast";
import { DemoMove, MOVE_FRAMES } from "./demo/DemoMove";
import { SUB } from "./inkbeat/core/frame";
import { StyleCloseUp, StyleLineup, StyleTrio } from "./demo/StyleSheet";
import { STYLES } from "./styles/styles";
import { Agloe, AGLOE_FRAMES } from "./agloe/Agloe";
import { DagenH, DAGENH_FRAMES } from "./dagenh/DagenH";
import { Peigneur, PEIGNEUR_FRAMES } from "./peigneur/Peigneur";
import { ActLab, ACT_FRAMES } from "./actlab/ActLab";
import { MeatShower, MEAT_FRAMES } from "./meat/MeatShower";
import { DirectorLab, DIR_FRAMES } from "./directorlab/DirectorLab";

// DemoHero: a low hero framing with foreground props. Demo: one still. Demo-<mood>: the same frame in each act light. DemoWide: the whole set.
// DemoCast: the three example characters in a row (a landscape family sheet).
// DemoMove: a 3 s beat-rig move (sharp). DemoMoveSub: the same at SUB × fps for motion blur (average with ffmpeg tmix).
export const Root: React.FC = () => (
  <>
    <Composition id="DirectorLab" component={DirectorLab} durationInFrames={DIR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MeatShower" component={MeatShower} durationInFrames={MEAT_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ audio: true }} />
    <Composition id="ActLab" component={ActLab} durationInFrames={ACT_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ audio: true }} />
    <Composition id="Peigneur" component={Peigneur} durationInFrames={PEIGNEUR_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ sub: false, audio: true }} />
    <Composition id="DagenH" component={DagenH} durationInFrames={DAGENH_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ sub: false, audio: true }} />
    <Composition id="Agloe" component={Agloe} durationInFrames={AGLOE_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ sub: false, audio: true }} />
    <Composition id="AgloeSub" component={Agloe} durationInFrames={AGLOE_FRAMES * SUB} fps={30 * SUB} width={1080} height={1920} defaultProps={{ sub: true, audio: false }} />
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
