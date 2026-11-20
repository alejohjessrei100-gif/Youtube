import React from "react";
import { Composition } from "remotion";
import { Short } from "./Short";
import { Ad, AD_DURATION, AD_FPS } from "./Ad";

export const FPS = 30;
export const DURATION = 5 * FPS;

export const Root: React.FC = () => (
  <>
  <Composition id="Ad" component={Ad} durationInFrames={AD_DURATION} fps={AD_FPS} width={1080} height={1920} />
  <Composition
    id="Test"
    component={Short}
    durationInFrames={DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
  </>
);
