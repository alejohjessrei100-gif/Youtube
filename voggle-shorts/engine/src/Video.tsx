import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Nunito';
import {Timeline} from './types';
import {Shot} from './Shot';

const {fontFamily} = loadFont('normal', {weights: ['900'], subsets: ['latin']});

// One word at a time, instant swap, MASTER_BLUEPRINT §6.4.
const Captions: React.FC<{tl: Timeline}> = ({tl}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = tl.captions.find((x) => t >= x.start - 1e-6 && t < x.end - 1e-6);
  if (!c) return null;
  const size = 88;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1025 - size * 0.76, textAlign: 'center', whiteSpace: 'nowrap',
        fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color: '#FFFFFF',
        WebkitTextStroke: '14px #000', paintOrder: 'stroke fill', textShadow: '5px 5px 6px rgba(0,0,0,0.85)'}}>
        {c.text}
      </div>
    </AbsoluteFill>
  );
};

export const Video: React.FC<{tl: Timeline}> = ({tl}) => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {tl.shots.map((s, i) => {
        const from = Math.round(s.start * fps);
        const dur = Math.max(1, Math.round(s.end * fps) - from);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} layout="none">
            <Shot shot={s} next={tl.shots[i + 1]} tl={tl} />
          </Sequence>
        );
      })}
      <Captions tl={tl} />
      <Audio src={staticFile(`p/${tl.slug}/${tl.audio}`)} />
      {(tl.sfx ?? []).map((x, i) => {
        // SFX: sparse, literal, 5-12 dB under the voice, cut hard at its end with a 15 ms anti-click ramp
        const from = Math.round(x.t * fps);
        const n = Math.max(2, Math.round(x.dur * fps));
        const ramp = Math.max(1, Math.round(0.015 * fps));
        return (
          <Sequence key={`sfx${i}`} from={from} durationInFrames={n} layout="none">
            <Audio src={staticFile(`p/${tl.slug}/${x.src}`)}
              volume={(f) => x.vol * Math.min(1, (f + 1) / ramp, (n - f) / ramp)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
