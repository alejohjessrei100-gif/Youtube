"""Soundtrack for "Can Haaland score using only his hair?" -> work/mix.wav (48 kHz stereo).

Every sound is a repo resource (SKILL.md Rule 1):
  football-kit/sfx/football_sfx.py           whistle, ball_kick, net_swish, stadium_chant
  cartoon-short-kit.zip templates/audio/       sfx_gen.py (whoosh, clink, creak, hurrah, applause, oof),
                                               sfx.py (_groans, _whoas, _cheer, _murmur),
                                               instruments.py (snare, snare_roll, brush, pluck, pad, cymbal, timpani),
                                               dsp.py (place, pan, st, integrated, dbg), mix.py (limiter, speech ducking rules)
  cartoon-short-kit.zip example/soldier/audio.py   drum("kick"), ting, sting
Levels follow the kit rules: music bed ~10 LU under the voice and ducked 3 dB under speech, SFX ~11 LU under the voice,
one master gain to -14 LUFS, look-ahead limiter at -1.2 dBTP. The voice itself is untouched (gain only).
"""
import ast, json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, 'work/kit/cartoon-short-kit')
sys.path[:0] = [os.path.join(KIT, 'templates/audio'), os.path.join(HERE, '../../football-kit/sfx')]
import dsp, sfx_gen as G, sfx as SX, instruments as I, football_sfx as FS   # noqa: E402
from dsp import SR, place, pan, st, integrated, dbg                          # noqa: E402
import mix as MX                                                             # noqa: E402  (limiter)

# soldier audio.py is a script: pull out only its function definitions (drum, ting, sting and their helpers)
_src = open(os.path.join(KIT, 'example/soldier/audio.py')).read()
_ns = {'np': np, 'SR': SR, 'rng': np.random.default_rng(7), 'subprocess': subprocess}
_keep = lambda n: isinstance(n, ast.FunctionDef) or (isinstance(n, ast.Assign) and isinstance(n.value, ast.Lambda))   # defs + helper lambdas (midi)
exec(compile(ast.Module([n for n in ast.parse(_src).body if _keep(n)], []), 'soldier_audio', 'exec'), _ns)
drum, ting, sting = _ns['drum'], _ns['ting'], _ns['sting']

DUR = 61.0
N = int(DUR * SR)
r = np.random.default_rng(21)
S2 = lambda x: st(np.asarray(x, dtype=np.float64)) if np.ndim(x) == 1 else np.asarray(x, dtype=np.float64)
norm = lambda x, p=1.0: x / (np.abs(x).max() + 1e-9) * p

# ------------------------------------------------------------------ voice
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'voice/voice.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
v = np.zeros(N); vv = np.frombuffer(raw, np.float32).astype(np.float64); v[:min(N, len(vv))] = vv[:N]
voice = st(v)
words = json.load(open(os.path.join(HERE, 'voice/words.json')))

# ------------------------------------------------------------------ SFX stem
fx = np.zeros((2, N))
def P(x, t, g=1.0, p=0.0): place(fx, pan(norm(np.asarray(x, float)), p) if np.ndim(x) == 1 else norm(np.asarray(x, float)), t, g)

for t, d, g in [(0.0, .6, .6), (3.1, .4, .5), (5.25, .5, .8), (22.0, .5, .7), (24.4, .45, .6), (25.1, .5, .9), (28.5, .5, .6),
                (45.1, .45, .8), (49.55, .4, .7), (51.2, .4, .7), (56.4, .4, .5)]:
    P(G.whoosh(d, r), t, g)                                                   # sfx_gen.whoosh
P(FS.ball_kick(1.0), 19.6, .9); P(FS.ball_kick(.5), 25.75, .7); P(FS.ball_kick(.6), 45.75, .8)
P(FS.ball_kick(.8), 49.95, .8); P(FS.ball_kick(.8), 51.6, .8)               # football_sfx.ball_kick
for t in (20.1, 46.35, 50.25, 51.9): P(FS.net_swish(), t, .8)               # football_sfx.net_swish
P(FS.whistle('pip'), 16.5, .7); P(FS.whistle('long'), 21.3, .8); P(FS.whistle('full_time'), 59.3, .8)
for f0, g in ((1400, 1.0), (2100, .7), (900, .8)): P(G.clink(r, f0=f0, dur=.5), 27.4, g * .9)   # sfx_gen.clink = crossbar
P(SX._groans(r, [(0, 'oof', 1), (.08, 'ugh', .8), (.15, 'oh', .7), (.2, 'oof', .6)]), 21.4, .7)  # sfx._groans
P(G.oof(r, 'oof'), 20.15, .5)                                                 # keeper dive
P(SX._whoas(r), 27.55, .8)                                                    # sfx._whoas
P(G.creak(.5, r), 40.1, .7)                                                   # sfx_gen.creak (door)
P(SX._murmur(2.3, r, 6), 37.7, .35)                                           # dressing room
for t, d, g in ((46.35, 3.0, 1.0), (50.25, 1.5, .8), (51.9, 1.4, .8), (52.45, 2.6, 1.0)): P(SX._cheer(d, r), t, g)
for k in range(5): P(G.hurrah(r, r.uniform(110, 160), r.uniform(.95, 1.1)), 46.45 + k * .12, .5, r.uniform(-.7, .7))
P(G.applause(2.6, r), 54.6, .8)                                               # sfx_gen.applause (POTM)
for t in (7.2, 47.8, 54.9): P(ting(), t, .6)                                  # soldier ting
P(sting(), 56.5, .9)                                                          # soldier sting (subbed off)
for t in (29.1, 30.1, 31.1): P(drum('kick'), t, .9)                           # soldier drum("kick") on the xG beats

# crowd bed: stadium_chant on the pitch shots only (no crowd in studio / dressing room)
crowd = np.zeros((2, N))
for a, b, g in ((0, 6.0, .55), (12.3, 28.5, .45), (41.7, DUR, .5)):
    t = a
    while t < b:
        seg = S2(FS.stadium_chant(d=min(4.0, b - t + .3)))
        place(crowd, seg * g, t); t += 3.7
for a, b, g in ((46.35, 49.3, 1.8), (52.45, 53.4, 1.8)):                     # roar swells
    i, j = int(a * SR), int(b * SR); crowd[:, i:j] *= np.linspace(g, 1, j - i)[None, :]

# ------------------------------------------------------------------ music (instruments.py + soldier drum)
BPM = 100; beat = 60 / BPM; bar = 4 * beat
CH = [(110.0, [220, 261.6, 329.6]), (87.31, [174.6, 220, 261.6]), (130.8, [261.6, 329.6, 392]), (98.0, [196, 246.9, 293.7])]  # Am F C G
mus = np.zeros((2, N))
def M(x, t, g=1.0, p=0.0): place(mus, pan(np.asarray(x, float), p) if np.ndim(x) == 1 else np.asarray(x, float), t, g)
def groove(a, b, full=True, vel=1.0):
    k = 0; t = a
    while t < b - .05:
        root, chord = CH[(k // 4) % 4]
        if k % 4 == 0: M(I.pad(chord, min(bar, b - t), vel=.35 * vel, r=r), t, .5)
        if full:
            if k % 2 == 0: M(drum('kick'), t, .9 * vel)
            else: M(I.snare(vel=.45 * vel, r=r), t, .7)
            for h in (0, .5): M(I.brush(vel=.25 * vel, r=r), t + h * beat, .5, .3)
            for h in (0, .5): M(I.pluck(root, vel=.6 * vel, r=r, dur=.4), t + h * beat, .8)
        else:
            M(I.pluck(root * 2, vel=.4 * vel, r=r, dur=.6), t, .6)
        k += 1; t = a + k * beat
groove(0.0, 21.25); groove(22.0, 27.4); groove(31.7, 37.6, full=False); groove(37.6, 41.7, full=False, vel=.8)
groove(41.7, 45.0)
for k in range(int(1.3 / .07)): M(I.snare(vel=.2 + .7 * k / 18, r=r), 45.0 + k * .07, .6)          # build roll
M(I.cymbal(vel=.8, r=r), 46.35, .7); groove(46.35, 56.4); M(I.cymbal(vel=.8, r=r), 52.45, .7)
M(I.timpani(73.4, vel=.8, r=r), 21.3, .8); M(I.timpani(65.4, vel=.8, r=r), 27.4, .8)               # stop hits
groove(57.4, 59.3, full=False, vel=.8)
M(I.pad([220, 277.2, 329.6, 440], 1.7, vel=.5, r=r), 59.3, .6); M(I.cymbal(vel=.6, r=r), 59.3, .5)

# ------------------------------------------------------------------ levels (kit rules) + master
v_ref = integrated(voice)
def to(x, rel):
    li = integrated(x); return x * dbg(v_ref + rel - li) if np.isfinite(li) else x
spans = [(w['t0'] - .05, w['t1'] + .1) for w in words]
duck = np.ones(N)
for a, b in spans: duck[max(0, int(a * SR)):min(N, int(b * SR))] = dbg(-3.0)
duck = np.convolve(duck, np.ones(int(.08 * SR)) / int(.08 * SR), mode='same')
mus = to(mus, -10.0) * duck[None, :]
crowd = to(crowd, -13.0) * (.6 + .4 * duck[None, :])
fx = to(fx, -11.0)
pk = np.abs(voice).max() * 0.9; fx = np.clip(fx, -pk, pk)                    # no hit pokes over the narration
out = voice + mus + crowd + fx
out *= dbg(-14.0 - integrated(out))
out, _ = MX.limiter(out, ceil_db=-1.2)
fade = np.minimum(1, (DUR - np.arange(N) / SR) / .4); out *= fade[None, :]
os.makedirs(os.path.join(HERE, 'work'), exist_ok=True)
dsp.write_wav(os.path.join(HERE, 'work/mix.wav'), out) if hasattr(dsp, 'write_wav') else None
print(f'voice {v_ref:.1f} LUFS | mix {integrated(out):.1f} LUFS | peak {20 * np.log10(np.abs(out).max()):.2f} dBFS')
