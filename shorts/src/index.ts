import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort as EarShort, BRIDGE_FRAMES as EAR_FRAMES } from "./videos/ear/Bridge";
import { BridgeShort as CupShort, BRIDGE_FRAMES as CUP_FRAMES } from "./videos/cup/Bridge";
const Root: React.FC = () => React.createElement(React.Fragment, null,
  React.createElement(Composition, { id: "EarShort", component: EarShort, durationInFrames: EAR_FRAMES, fps: 30, width: 1080, height: 1920 }),
  React.createElement(Composition, { id: "CupShort", component: CupShort, durationInFrames: CUP_FRAMES, fps: 30, width: 1080, height: 1920 }));
registerRoot(Root);
