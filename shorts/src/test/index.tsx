import React from "react";
import { Composition, registerRoot } from "remotion";
import { T } from "./T";
import { Chars } from "./Chars";
const Root: React.FC = () => <>
  <Composition id="T0" component={T} defaultProps={{ post: false }} durationInFrames={10} fps={30} width={1080} height={1920} />
  <Composition id="T1" component={T} defaultProps={{ post: true }} durationInFrames={10} fps={30} width={1080} height={1920} />
  <Composition id="Chars" component={Chars} durationInFrames={1} fps={30} width={1800} height={2300} />
</>;
registerRoot(Root);
