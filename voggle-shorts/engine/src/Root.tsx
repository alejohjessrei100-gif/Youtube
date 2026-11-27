import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {Timeline} from './types';

const EMPTY: Timeline = {slug: '', fps: 24, width: 1080, height: 1920, duration: 1, audio: '', shots: [], captions: [], faces: {}};

export const Root: React.FC = () => (
  <Composition
    id="Voggle"
    component={({tl}: {tl: Timeline}) => <Video tl={tl} />}
    defaultProps={{tl: EMPTY}}
    width={1080}
    height={1920}
    fps={24}
    durationInFrames={24}
    calculateMetadata={({props}) => ({
      durationInFrames: Math.max(1, Math.round(props.tl.duration * props.tl.fps)),
      fps: props.tl.fps,
    })}
  />
);
