# Synthesized soundtrack for the 10 s promo: beat + whooshes + impacts + crowd roar.
import numpy as np, wave, sys
SR, D = 48000, 10.0
N = int(SR * D); t = np.arange(N) / SR; mix = np.zeros(N); rng = np.random.default_rng(1)
def put(sig, at, gain=1.0):
    i = int(at * SR); n = min(len(sig), N - i); mix[i:i + n] += sig[:n] * gain
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def kick(dur=.35):
    n = int(dur * SR); x = np.arange(n) / SR; f = 45 + 120 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .12)
def noise(dur): return rng.standard_normal(int(dur * SR))
def lowpass(x, a):  # one-pole
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y
def hat(): n = int(.06 * SR); h = noise(.06); h = h - lowpass(h, .3); return h * env(n, .001, .015)
def whoosh(dur=.5):
    n = int(dur * SR); x = np.linspace(0, 1, n); w = noise(dur)
    out = np.zeros(n); acc = 0.0; a = .02 + .25 * np.sin(np.pi * x) ** 2
    for i in range(n): acc += a[i] * (w[i] - acc); out[i] = acc
    return out * np.sin(np.pi * x) ** 1.5 * 2.2
def boom(dur=1.2):
    n = int(dur * SR); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-x * 12)) / SR) * env(n, .003, .4)
    return s + lowpass(noise(dur), .08) * env(n, .001, .25) * 3
def sting(dur=2.2, root=146.83):
    n = int(dur * SR); x = np.arange(n) / SR; s = np.zeros(n)
    for m in (1, 1.26, 1.5, 2, 2.52):
        for det in (-.003, .003): s += np.sign(np.sin(2 * np.pi * root * m * (1 + det) * x)) * .5 + np.sin(2 * np.pi * root * m * x)
    return lowpass(s, .12) * env(n, .02, .9) / 10
# beat: 128 bpm from 0.3 s, drops out for the kick build, returns on the goal
beat = 60 / 128
for k in range(40):
    at = .3 + k * beat
    if at > D - .2: break
    if 4.5 < at < 5.3 or 6.2 < at < 7.0: continue
    put(kick(), at, .9)
    put(hat(), at + beat / 2, .35)
    if k % 2: put(lowpass(noise(.15), .4) * env(int(.15 * SR), .001, .04), at, .5)  # clap/snare
# bass line on the beat
bass = np.sin(2 * np.pi * 73.4 * t) * .18 * (np.sin(2 * np.pi * t / beat) > 0) * ((t > .3) & ~(((t > 4.5) & (t < 5.3)) | ((t > 6.2) & (t < 7.0))))
mix += lowpass(bass, .05) * 2
for at, d, g in [(0.0, .6, .5), (2.05, .4, .8), (4.2, .4, .8), (5.9, .4, .8), (7.7, .45, .8)]: put(whoosh(d), at, g)
put(kick(.25), 1.3, .7)                 # ball lands
put(boom(), 2.9, 1.0)                   # crests clash
r = np.arange(int(2.0 * SR)) / SR
def roar(g, dur=2.0):
    n = int(dur * SR); x = np.arange(n) / SR
    return lowpass(noise(dur), .12) * np.minimum(1, x / .2) * np.exp(-np.maximum(0, x - .9) / .6) * g
for kick_t, hit_t, g in [(4.85, 5.3, .8), (6.55, 7.0, 1.1)]:   # Westbridge goal, then PISAY goal
    put(kick(.2) * 1.2, kick_t, .9); put(boom(), hit_t, g); put(roar(1.6 * g), hit_t)
put(sting(), 7.9, 1.0)
mix /= np.max(np.abs(mix)) / .89
fade = np.minimum(1, (D - t) / .25); mix *= fade
pcm = (np.tanh(mix * 1.1) / np.tanh(1.1) * 32000).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
