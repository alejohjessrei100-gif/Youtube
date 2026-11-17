"""Sound for the Kentucky meat shower short: the 1.15x voice, a light plucked folk bed that stops when the store is gone, room and
country beds, and story SFX on their words (CC0 one-shots in assets/sfx plus synthesized wind, crickets, birds,
engine and pen scratches). Every cue is leveled against the voice.
    python tools/audio_agloe.py   -> out/audio/premaster.wav, then the two-pass loudnorm in tools/master.sh"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 34.3
N = int(TOTAL * SR)
WORDS = json.loads((ROOT / "out/meat/words.json").read_text())


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
x = load(ROOT / "out/meat/vo.wav")
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

E = json.loads((ROOT / "out/meat/events.json").read_text())
T = {k: W(*v) if isinstance(v, tuple) else W(v) for k, v in {
    "sky": "sky", "then": "then", "meat": ("meat", 1), "rain": "rain", "chunks": "chunks", "neighbors": "neighbors", "two": "two", "taste": "taste",
    "mutton": "mutton", "venison": "venison", "scientists": "scientists", "lung": "lung", "best": "best", "flock": "flock",
    "threw": "threw", "vultures2": ("vultures", 2), "fly": "fly", "and4": ("and", 4), "one_chunk": ("one", 4),
}.items()}

def crackle(dur, seed=1, rate=14):
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(seed)
    for _ in range(int(dur * rate)):
        i = rng.integers(0, max(1, n - 800))
        c = bp(noise(400, int(rng.integers(0, 9999))), 1500, 7000) * env(400, 0.0005, 0.006) * rng.uniform(0.3, 1)
        out[i:i + 400] += c
    return out

def bubble_bed(dur, seed=2):
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(seed)
    for _ in range(int(dur * 5)):
        i = rng.integers(0, max(1, n - 4000))
        f0 = rng.uniform(250, 600)
        m = int(0.06 * SR)
        out[i:i + m] += np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 1.8, m)) / SR) * env(m, 0.002, 0.04) * rng.uniform(0.4, 1)
    return out

def splat(seed, dur=0.14):
    n = int(dur * SR)
    return (lp(noise(n, seed), 1300) * 1.2 + bp(noise(n, seed + 7), 600, 2500) * 0.6) * np.exp(-tt(n) * 30)

def cluck(seed, f=700):
    n = int(0.09 * SR)
    t = tt(n)
    fr = f * (1 + 0.4 * np.sin(2 * np.pi * 30 * t))
    return (np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * 0.4 + bp(noise(n, seed), 800, 3000) * 0.4) * env(n, 0.003, 0.04)

def flapw(dur=0.18, seed=9):
    n = int(dur * SR)
    return lp(noise(n, seed), 900) * np.sin(np.linspace(0, np.pi, n)) ** 2

def retch(seed=5, dur=0.5):
    n = int(dur * SR)
    t = tt(n)
    g = lp(noise(n, seed), 500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t)))
    return (g + 0.4 * np.sin(2 * np.pi * np.cumsum(np.linspace(160, 90, n)) / SR)) * env(n, 0.02, 0.15)

def chew(seed):
    n = int(0.12 * SR)
    return lp(noise(n, seed), 1600) * np.sin(np.linspace(0, np.pi, n)) ** 3

# -- the yard: fire crackle and soap bubbling under the first shots, clucks, the stirring
fire = crackle(T["neighbors"], 1) + bubble_bed(T["neighbors"], 2) * 0.6
place(fx, level(fire, 20) * np.clip((T["neighbors"] - tt(len(fire))) / 0.5, 0, 1), 0.0)
for k, at in enumerate([0.6, 1.4, 2.2, 3.1]):
    place(fx, level(cluck(k, 650 + 60 * k), 18), at)
P("cloth.wav", 0.3, 22)
# -- "rain... meat": a falling whistle, the splat into the soap, her yelp, panicked clucks
place(fx, level(whoosh(0.55, 2600, 700, 4), 12), E["soap"] - 0.5)
P("splash_02.ogg", E["soap"], 6)
place(fx, level(splat(77, 0.2), 6), E["soap"])
place(fx, level(chirp(500, 900, 0.22), 13), E["soap"] + 0.1)
for k in range(6):
    place(fx, level(cluck(30 + k, 900 + 50 * k), 14), E["soap"] + 0.15 + k * 0.17)
# -- the rain: a splat for every chunk that lands (louder near the start), the palm, the fling, the calendar
for k, at in enumerate(E["drops"]):
    place(fx, level(splat(100 + k), 11 + 4 * (k % 3)), at)
place(fx, level(splat(201, 0.18), 5), E["palm"])
place(fx, level(chirp(400, 250, 0.3), 12), E["palm"] + 0.12)
place(fx, level(whoosh(0.3, 800, 2400, 6), 11), E["fling"] - 0.05)
place(fx, level(splat(202, 0.2), 5), E["calendar"])
P("pluck_001.ogg", E["calendar"] + 0.05, 12)
# -- the neighbors run in (fast footsteps), pick up and taste: two bites, chewing
for k in range(10):
    n = int(0.08 * SR)
    place(fx, level((lp(noise(n, 300 + k), 900)) * env(n, 0.002, 0.06), 12), T["neighbors"] + 0.05 + k * 0.12)
P("cloth.wav", T["two"] + 0.6, 16)
place(fx, level(splat(310, 0.1), 9), E["bite1"])
place(fx, level(splat(311, 0.1), 9), E["bite2"])
for k in range(10):
    place(fx, level(chew(320 + k), 15), E["bite1"] + 0.2 + k * 0.28)
P("pluck_001.ogg", T["mutton"] + 0.05, 9)
P("error_003.ogg", T["venison"] + 0.05, 12)
# -- the lab: a ticking clock, jar clinks on the words
for k in range(int((T["best"] - T["scientists"]) / 0.5)):
    place(fx, level(bp(noise(int(0.02 * SR), 400 + k), 2000, 6000) * env(int(0.02 * SR), 0.001, 0.015), 20), T["scientists"] + 0.1 + k * 0.5)
for key in ["jar1", "jar2", "jar3"]:
    P("glass_01.ogg", E[key], 9)
P("question_001.ogg", T["lung"] + 0.1, 12)
# -- the vultures: wingbeats, the first retch, a splat far below; the hero bird; the chain reaction
for k in range(int((T["one_chunk"] - T["best"]) / 0.45)):
    place(fx, level(flapw(0.18, 400 + k), 18), T["best"] + 0.2 + k * 0.45)
place(fx, level(retch(5), 7), E["threw"] - 0.05)
place(fx, level(retch(6, 0.6), 6), E["vomit"] - 0.05)
place(fx, level(whoosh(0.6, 400, 2600, 8), 9), E["fly"] - 0.05)
for k in range(4):
    place(fx, level(flapw(0.14, 500 + k), 12), E["fly"] + 0.05 + k * 0.17)
for k, at in enumerate(E["rest"]):
    place(fx, level(retch(10 + k, 0.4), 10), at - 0.03)
# -- the museum: a soft room tone, the kid's "ew", a final pluck
place(fx, level(chirp(700, 380, 0.35), 10), E["display"] + 0.05)
P("bell_02.ogg", E["county"] + 0.1, 9)
for w in ["two", "scientists", "best", "one_chunk"]:
    place(fx, level(whoosh(0.26, 500, 3000, hash(w) % 97), 16), T[w] - 0.12)

# ------------------------------------------------------------------ beds: country birds and breeze in the yard, a room in the lab and museum
bed = np.zeros(N)
def gate(a, b, fade=0.15):
    return np.clip((t_all - a) / fade, 0, 1) * np.clip((b - t_all) / fade, 0, 1)
wind = lp(noise(N, 4), 800) * (0.6 + 0.4 * np.sin(t_all * 0.7))
wind = wind / rms(wind) * SRMS * db(-24)
bed += wind * (gate(0, T["scientists"] - 0.06) + gate(T["best"] - 0.06, T["one_chunk"] - 0.06))
room = lp(noise(N, 2), 400)
room = room / rms(room) * SRMS * db(-28)
bed += room * (gate(T["scientists"] - 0.06, T["best"] - 0.06) + gate(T["one_chunk"] - 0.06, TOTAL))
k = 0
at = 0.2
while at < T["meat"] - 0.3:
    place(bed, chirp(3400 + 300 * (k % 3), 2600, 0.09) * SRMS * db(-13), at)
    place(bed, chirp(3600, 3000, 0.07) * SRMS * db(-15), at + 0.14)
    k += 1
    at += 0.7

# ------------------------------------------------------------------ music: a jaunty plucked loop at 112 BPM in G, a stop for the first chunk
def pluck(f, dur=0.45, bright=0.4):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 7) * env(n, 0.002, 0.05)

mus = np.zeros(N)
beat = 60 / 112
prog = [(98.0, [196.0, 246.9, 293.7]), (130.8, [261.6, 329.6, 392.0]), (146.8, [220.0, 293.7, 370.0]), (98.0, [196.0, 246.9, 293.7])]
for k in range(int(TOTAL / beat) + 1):
    root, ch = prog[(k // 4) % 4]
    at = k * beat
    place(mus, lp(pluck(root / 2, 0.7, 0.2), 500) * 0.9, at)
    place(mus, pluck(ch[(k * 2) % 3], 0.35) * 0.35, at + beat / 2)
    if k % 2:
        place(mus, pluck(ch[(k + 1) % 3] * 2, 0.25, 0.6) * 0.18, at + beat * 0.75)
mus = mus / (rms(mus) + 1e-9) * SRMS * db(-18)
mus *= db(-3) ** np.clip(duck * 1.3, 0, 1)
mus *= np.clip(t_all / 1.0, 0, 1) * (1 - 0.85 * gate(T["rain"] if "rain" in T else T["then"] + 1.0, T["meat"] + 0.25, 0.1))  # the music drops out for "rain... meat"

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
bed *= db(10)
mus *= db(5)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.6, 0, 1)
with wave.open(str(ROOT / "out/meat/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
