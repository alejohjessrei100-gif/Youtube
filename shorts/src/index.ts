import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/ear/Bridge";
const Root: React.FC = () => React.createElement(React.Fragment, null,
  React.createElement(Composition, { id: "EarShort", component: BridgeShort, durationInFrames: BRIDGE_FRAMES, fps: 30, width: 1080, height: 1920 }));
registerRoot(Root);
