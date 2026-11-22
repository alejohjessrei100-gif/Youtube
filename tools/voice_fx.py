"""Speed up + pitch up a voice recording (default: 1.35x speed, +6 semitones pitch), no extra tools needed beyond ffmpeg.

    python tools/voice_fx.py my_voice.mp3 my_voice_fx.wav [speed=1.35] [semitones=6]

Pitch and speed are set independently: the file ends up `speed` times faster, and `semitones` higher in pitch.
Do this BEFORE the video pipeline (tools/vo_clean.py); the pipeline itself never stretches or pitches a voice.
"""
import subprocess, sys
src, dst = sys.argv[1], sys.argv[2]
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.35
st = float(sys.argv[4]) if len(sys.argv) > 4 else 6.0
f = 2 ** (st / 12.0)                         # pitch factor
ar = 44100
# raise pitch (and speed) by f via sample-rate trick, then fix the speed with atempo so the net speed is `speed`
tempo = speed / f
chain, t = [], tempo
while t < 0.5: chain.append('atempo=0.5'); t /= 0.5
while t > 2.0: chain.append('atempo=2.0'); t /= 2.0
chain.append('atempo=%.5f' % t)
flt = 'aresample=%d,asetrate=%d,aresample=%d,%s' % (ar, int(ar * f), ar, ','.join(chain))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vn', '-af', flt, dst], check=True)
print('wrote', dst, 'speed x%.2f, pitch %+g semitones' % (speed, st))
