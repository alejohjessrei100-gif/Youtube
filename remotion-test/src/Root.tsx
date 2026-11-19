import React from "react";
import { Composition } from "remotion";
import { Short } from "./Short";

export const FPS = 30;
export const DURATION = 5 * FPS;

export const Root: React.FC = () => (
  <Composition
    id="Test"
    component={Short}
    durationInFrames={DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
