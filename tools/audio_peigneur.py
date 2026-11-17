"""Sound for the Lake Peigneur short: the 1.15x voice, a light plucked folk bed that stops when the store is gone, room and
country beds, and story SFX on their words (CC0 one-shots in assets/sfx plus synthesized wind, crickets, birds,
engine and pen scratches). Every cue is leveled against the voice.
    python tools/audio_agloe.py   -> out/audio/premaster.wav, then the two-pass loudnorm in tools/master.sh"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 30.3
N = int(TOTAL * SR)
WORDS = json.loads((ROOT / "out/peig/words.json").read_text())


def W(word, nth=1):
    k = 0
    for w, a, b in WORDS:
        if w.lower().strip(".,'\"") == word.lower() and (k := k + 1) == nth:
            return a
    raise KeyError(word)


def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR * 0.45), "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)
def noise(n, seed): return np.random.default_rng(seed).standard_normal(n)
def tt(n): return np.arange(n) / SR
def db(x): return 10 ** (x / 20)
def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-12)


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def place(buf, clip, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(clip) <= 0:
        return
    a, b = max(0, i), min(len(buf), i + len(clip))
    buf[a:b] += clip[a - i: b - i] * gain


# ------------------------------------------------------------------ voice
v = np.zeros(N)
x = load(ROOT / "out/peig/vo.wav")
v[: min(N, len(x))] = x[:N]
v = v / np.abs(v).max() * 0.7
VPEAK = np.abs(v).max()
SRMS = rms(v[np.abs(v) > 0.02])
duck = lp(np.abs(v), 3, 1)
duck /= duck.max() + 1e-9
t_all = tt(N)


def level(clip, under=8.0):
    """a one-shot: peak `under` dB below the voice peak, and its loudest 100 ms at least 6 dB under the speech RMS"""
    c = clip / (np.abs(clip).max() + 1e-9) * VPEAK * db(-(under - 5))  # 5 dB hotter: phone speakers buried the quieter mix
    w = int(0.1 * SR)
    if len(c) > w:
        loud = max(rms(c[i: i + w]) for i in range(0, len(c) - w, w // 4))
        cap = SRMS * db(0)
        if loud > cap:
            c *= cap / loud
    return c


fx = np.zeros(N)
SFX = ROOT / "assets/sfx"
def P(name, at, under=8.0): place(fx, level(load(SFX / name), under), at)


# synthesized one-shots
def scratch(dur=0.13, seed=1):
    n = int(dur * SR)
    s = bp(noise(n, seed), 2500, 7000) * env(n, 0.004, 0.04)
    return s * (0.6 + 0.4 * np.sin(tt(n) * 2 * np.pi * 38))


def whoosh(dur=0.32, f0=400, f1=2600, seed=5):
    n = int(dur * SR)
    nz = noise(n, seed)
    out = np.zeros(n)
    seg = n // 8
    for k in range(8):
        f = f0 + (f1 - f0) * (k / 7)
        part = bp(nz, f * 0.6, f * 1.4)[k * seg:(k + 1) * seg]
        out[k * seg:(k + 1) * seg] = part
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.5


def chirp(f0, f1, dur, seed=0):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** 2


def squeal(dur=0.35):
    n = int(dur * SR)
    f = np.linspace(1500, 1250, n)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * bp(noise(n, 4), 1000, 3000)) * env(n, 0.02, 0.15)



def engine(dur, f0=40, f1=46, pulse=(11, 13), level=1.0, seed=21):
    n = int(dur * SR)
    t = tt(n)
    p = np.maximum(0, np.sin(2 * np.pi * np.cumsum(np.linspace(pulse[0], pulse[1], n)) / SR)) ** 3
    e = lp(noise(n, seed), 260) * p + 0.5 * np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, n)) / SR)
    return e * env(n, 0.15, 0.3) * level

def whistle(dur=0.5):
    n = int(dur * SR)
    t = tt(n)
    f = 2900 + 120 * np.sign(np.sin(2 * np.pi * 26 * t))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * bp(noise(n, 9), 2000, 5000)) * env(n, 0.01, 0.08)

def horn(dur=0.32):
    n = int(dur * SR)
    t = tt(n)
    s = np.sign(np.sin(2 * np.pi * 330 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 415 * t)) * 0.5
    return lp(s, 2200) * env(n, 0.01, 0.05)

def tick(seed):
    n = int(0.02 * SR)
    return bp(noise(n, seed), 2000, 6000) * env(n, 0.001, 0.015)

T = {k: W(*v) if isinstance(v, tuple) else W(v) for k, v in {
    "small": "small", "water": "water", "move": "move", "tips": "tips", "looks": "looks", "lean": "lean", "go": "go", "its": "it's", "drill": "drill",
    "fourteen": "fourteen-inch", "beneath": "beneath", "miners": "miners", "pours": "pours", "hole2": ("hole", 2), "whirl": "whirlpool",
    "swallows": "swallows", "row": "row", "barges": "barges", "part": "part", "island": "island", "canal": "canal", "back": "backwards",
    "every": "every", "nobody": "nobody", "then3": ("then", 3), "fills": "fills", "comes": "comes", "deeper": "deeper",
}.items()}

def rumble(dur, f=70, seed=3, rate=9):
    n = int(dur * SR)
    t = tt(n)
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t)
    return (lp(noise(n, seed), 220) * 1.3 + 0.6 * np.sin(2 * np.pi * f * t)) * (0.5 + 0.5 * mod) * env(n, 0.3, 0.5)

def rush(dur, seed=4, lo=500, hi=4500):
    n = int(dur * SR)
    return bp(noise(n, seed), lo, hi) * env(n, 0.2, 0.4)

def creak(dur=0.7, f0=320, f1=210, seed=5):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + 0.3 * bp(noise(n, seed), 400, 1200)
    return lp(s, 1800) * env(n, 0.05, 0.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * tt(n)))

# -- the lake at ease: water lapping, a gentle bubble, then the first ripples
P("splash_02.ogg", T["water"] + 0.15, 20)
for k in range(3):
    P("bubble2.wav", T["water"] + 0.25 + k * 0.38, 20)
place(fx, level(rumble(2.0, 55, 3, 5), 15), T["move"] - 0.2)
# -- the boat tips
P("splash_01.ogg", T["tips"] - 0.02, 8)
place(fx, level(creak(0.5, 300, 220, 8), 15), T["tips"] + 0.05)
# -- the rig leans, groans and goes under
place(fx, level(creak(1.1, 240, 150, 9), 11), T["lean"] - 0.05)
P("metal_05.ogg", T["go"] - 0.05, 10)
place(fx, level(rush(1.4, 5, 300, 3000), 10), T["go"] + 0.1)
P("splash_01.ogg", T["go"] + 0.75, 6)
P("explosion.ogg", T["go"] + 0.85, 11)
# -- 1980: the crew; the drill
P("metal_01.ogg", T["its"] + 0.1, 17)
place(fx, level(rumble(3.0, 90, 11, 14), 17), T["drill"] - 0.1)
P("metal_01.ogg", T["fourteen"] + 0.05, 12)
P("explosion.ogg", W("bed") - 0.05, 9)
# -- the mine: a cold drip and a lamp creak, then the water pours in
for k in range(3):
    P("bubble.wav", T["beneath"] + 0.2 + k * 0.7, 21)
place(fx, level(creak(0.6, 260, 200, 10), 18), T["miners"] + 0.1)
place(fx, level(rush(1.4, 6, 700, 6000), 8), T["pours"] - 0.35)
P("splash_01.ogg", T["pours"] - 0.1, 6)
P("explosion.ogg", T["pours"] - 0.08, 10)
# -- the whirlpool: a deep rumble that builds
place(fx, level(rumble(T["canal"] - T["hole2"], 48, 12, 6), 8), T["hole2"] - 0.05)
place(fx, level(rush(T["canal"] - T["hole2"], 7, 300, 2500), 14), T["hole2"])
P("splash_02.ogg", T["swallows"] + 0.45, 6)
P("explosion.ogg", T["swallows"] + 0.5, 9)
P("metal_05.ogg", T["row"] + 0.05, 10)
for k in range(3):
    P("splash_01.ogg", T["barges"] + 0.2 + k * 0.5, 9 + k)
P("giant1.wav", T["part"] + 0.1, 8)
place(fx, level(rush(1.4, 8, 400, 3500), 10), T["part"] + 0.05)
# -- the canal: a flow that turns around
place(fx, level(rush(1.7, 9, 500, 3000), 12), T["canal"] + 0.05)
place(fx, level(whoosh(0.7, 3000, 600, 6), 10), T["back"] - 0.1)
# -- relief on the pier, then the lake returns
place(fx, level(chirp(900, 1500, 0.3), 14), T["every"] + 0.1)
P("pluck_001.ogg", T["nobody"] + 0.1, 10)
place(fx, level(rush(2.6, 10, 300, 2000), 15), T["then3"] + 0.05)
for k in range(4):
    P("bubble2.wav", T["fills"] + 0.1 + k * 0.4, 18)
P("splash_02.ogg", T["deeper"] - 0.15, 12)
P("bell_01.ogg", T["deeper"] + 0.25, 8)
for w in ["tips", "its", "drill", "beneath", "pours", "whirl", "canal", "every", "then3"]:
    place(fx, level(whoosh(0.26, 500, 3000, hash(w) % 97), 16), T[w] - 0.12)

# ------------------------------------------------------------------ beds
bed = np.zeros(N)
def gate(a, b, fade=0.15):
    return np.clip((t_all - a) / fade, 0, 1) * np.clip((b - t_all) / fade, 0, 1)
wind = lp(noise(N, 4), 800) * (0.6 + 0.4 * np.sin(t_all * 0.7))
wind = wind / rms(wind) * SRMS * db(-26)
bed += wind * (gate(0, T["drill"] - 0.06) + gate(T["hole2"] - 0.06, TOTAL))
room = lp(noise(N, 2), 300)
room = room / rms(room) * SRMS * db(-28)
bed += room * gate(T["beneath"] - 0.06, T["hole2"] - 0.06)
for a, b in [(0, T["tips"]), (T["deeper"], TOTAL)]:  # frogs and birds at ease
    k = 0
    at = a + 0.2
    while at < b - 0.2:
        place(bed, chirp(3300 + 300 * (k % 3), 2600, 0.09) * SRMS * db(-13), at)
        place(bed, chirp(3600, 3000, 0.07) * SRMS * db(-15), at + 0.14)
        k += 1
        at += 0.75 + 0.2 * (k % 2)

# ------------------------------------------------------------------ music: a light plucked loop at 100 BPM in D, stops for the whirlpool
def pluck(f, dur=0.45, bright=0.4):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 7) * env(n, 0.002, 0.05)

mus = np.zeros(N)
beat = 60 / 100
prog = [(73.4, [146.8, 185.0, 220.0]), (98.0, [196.0, 246.9, 293.7]), (110.0, [220.0, 277.2, 329.6]), (87.3, [174.6, 220.0, 261.6])]
for k in range(int(TOTAL / beat) + 1):
    root, ch = prog[(k // 4) % 4]
    at = k * beat
    place(mus, lp(pluck(root, 0.7, 0.2), 500) * 0.9, at)
    place(mus, pluck(ch[(k * 2) % 3], 0.35) * 0.35, at + beat / 2)
    if k % 2:
        place(mus, pluck(ch[(k + 1) % 3] * 2, 0.25, 0.6) * 0.18, at + beat * 0.75)
mus = mus / (rms(mus) + 1e-9) * SRMS * db(-18)
mus *= db(-3) ** np.clip(duck * 1.3, 0, 1)
mus *= np.clip(t_all / 1.2, 0, 1) * np.clip((T["hole2"] + 0.4 - t_all) / 0.6, 0, 1)  # out as the whirlpool begins
back = np.zeros(N)  # and a warmer take of the loop when the lake returns
for k in range(int(TOTAL / beat) + 1):
    root, ch = prog[(k // 4) % 4]
    at = k * beat
    if at < T["then3"]:
        continue
    place(back, lp(pluck(root, 0.7, 0.2), 500) * 0.9, at)
    place(back, pluck(ch[(k * 2) % 3], 0.35) * 0.35, at + beat / 2)
back = back / (rms(back[back != 0]) + 1e-9) * SRMS * db(-19) * db(-3) ** np.clip(duck * 1.3, 0, 1) * np.clip((t_all - T["then3"]) / 0.6, 0, 1)
mus += back

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
bed *= db(10)  # ambience was ~24 dB under the voice: inaudible on phones
mus *= db(5)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.6, 0, 1)
with wave.open(str(ROOT / "out/peig/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
